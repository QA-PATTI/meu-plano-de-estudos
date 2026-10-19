/**
 * server.js
 *
 * API REST do Meu Plano de Estudos.
 *
 * Rotas:
 *   GET    /api/health
 *   GET    /api/tarefas
 *   GET    /api/tarefas/:id
 *   POST   /api/tarefas
 *   PUT    /api/tarefas/:id
 *   DELETE /api/tarefas/:id
 *
 * O navegador conversa com esta API em JSON.
 * Esta API conversa com o PostgreSQL usando SQL parametrizado.
 */

const path = require("path");
const express = require("express");
const cors = require("cors");

// backend/.env continua valendo para quem configura o arquivo na mão.
// O neon deploy grava DATABASE_URL na raiz, em .env.local.
// O dotenv não substitui variável que já existe, então o arquivo do backend tem prioridade.
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { criarPool } = require("./database");

const STATUS_PERMITIDOS = ["A estudar", "Estudando", "Concluído"];
const CAMPOS_PERMITIDOS = ["titulo", "descricao", "materia", "data_prevista", "status"];
const ID_MAXIMO = 2147483647;

const pool = criarPool();
const origensPermitidas = montarOrigensPermitidas();

const app = express();

app.disable("x-powered-by");
app.use(cors({
  origin(origem, callback) {
    if (!origem || origensPermitidas.has(origem)) {
      callback(null, true);
      return;
    }

    console.warn(`CORS recusou a origem: ${origem}`);
    callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"],
}));
app.use(express.json({ limit: "100kb" }));
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (req.path !== "/api/health") {
    console.log(`${req.method} ${req.path}`);
  }
  next();
});

app.get("/", (req, res) => {
  res.json({
    mensagem: "API do Meu Plano de Estudos.",
    saude: "/api/health",
    tarefas: "/api/tarefas",
  });
});

app.get("/api/health", async (req, res) => {
  if (!pool) {
    return res.status(503).json({
      status: "indisponivel",
      banco: "nao_configurado",
    });
  }

  try {
    await pool.query("SELECT 1");
    return res.status(200).json({
      status: "ok",
      banco: "conectado",
    });
  } catch (erro) {
    console.error("Falha na verificação de saúde:", erro.code || "sem código", "-", erro.message);
    return res.status(503).json({
      status: "indisponivel",
      banco: "desconectado",
    });
  }
});

app.get("/api/tarefas", async (req, res) => {
  try {
    const resultado = await consultar(
      `SELECT id, titulo, descricao, materia, data_prevista, status, criado_em
       FROM tarefas
       ORDER BY criado_em DESC`
    );
    return res.status(200).json(resultado.rows);
  } catch (erro) {
    return responderErro(res, erro);
  }
});

app.get("/api/tarefas/:id", async (req, res) => {
  const id = interpretarId(req.params.id);
  if (!id) {
    return res.status(400).json({ erro: "O identificador da tarefa é inválido." });
  }

  try {
    const tarefa = await buscarPorId(id);
    if (!tarefa) {
      return res.status(404).json({ erro: "Tarefa não encontrada." });
    }
    return res.status(200).json(tarefa);
  } catch (erro) {
    return responderErro(res, erro);
  }
});

app.post("/api/tarefas", async (req, res) => {
  const validacao = validarTarefa(req.body, false);
  if (validacao.erro) {
    return res.status(400).json({ erro: validacao.erro });
  }

  const dados = validacao.dados;

  try {
    const resultado = await consultar(
      `INSERT INTO tarefas (titulo, descricao, materia, data_prevista, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, titulo, descricao, materia, data_prevista, status, criado_em`,
      [dados.titulo, dados.descricao, dados.materia, dados.data_prevista, dados.status]
    );
    return res.status(201).json(resultado.rows[0]);
  } catch (erro) {
    return responderErro(res, erro);
  }
});

app.put("/api/tarefas/:id", async (req, res) => {
  const id = interpretarId(req.params.id);
  if (!id) {
    return res.status(400).json({ erro: "O identificador da tarefa é inválido." });
  }

  const validacao = validarTarefa(req.body, true);
  if (validacao.erro) {
    return res.status(400).json({ erro: validacao.erro });
  }

  const dados = validacao.dados;

  try {
    const resultado = await consultar(
      `UPDATE tarefas
       SET titulo = $1,
           descricao = $2,
           materia = $3,
           data_prevista = $4,
           status = $5
       WHERE id = $6
       RETURNING id, titulo, descricao, materia, data_prevista, status, criado_em`,
      [dados.titulo, dados.descricao, dados.materia, dados.data_prevista, dados.status, id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ erro: "Tarefa não encontrada." });
    }

    return res.status(200).json(resultado.rows[0]);
  } catch (erro) {
    return responderErro(res, erro);
  }
});

app.delete("/api/tarefas/:id", async (req, res) => {
  const id = interpretarId(req.params.id);
  if (!id) {
    return res.status(400).json({ erro: "O identificador da tarefa é inválido." });
  }

  try {
    const resultado = await consultar(
      "DELETE FROM tarefas WHERE id = $1 RETURNING id",
      [id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ erro: "Tarefa não encontrada." });
    }

    return res.status(204).end();
  } catch (erro) {
    return responderErro(res, erro);
  }
});

app.use((req, res) => {
  res.status(404).json({ erro: "Rota não encontrada." });
});

app.use((erro, req, res, next) => {
  if (res.headersSent) {
    return next(erro);
  }

  if (erro.type === "entity.too.large") {
    return res.status(400).json({ erro: "Os dados enviados excedem o tamanho permitido." });
  }

  if (erro instanceof SyntaxError && erro.status === 400 && Object.prototype.hasOwnProperty.call(erro, "body")) {
    return res.status(400).json({ erro: "O corpo da requisição não é um JSON válido." });
  }

  console.error("Erro inesperado:", erro.message);
  return res.status(500).json({ erro: "Erro interno ao processar a requisição." });
});

const porta = Number(process.env.PORT || 3000);

if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
  console.error("PORT inválida. Use um número inteiro entre 1 e 65535.");
  process.exit(1);
}

const servidor = app.listen(porta, "0.0.0.0", () => {
  console.log(`API do Meu Plano de Estudos ouvindo em 0.0.0.0:${porta}`);
  console.log(`Verificação de saúde: http://localhost:${porta}/api/health`);
});

servidor.on("error", (erro) => {
  if (erro.code === "EADDRINUSE") {
    console.error(`A porta ${porta} já está em uso. Feche o outro processo ou altere PORT no arquivo .env.`);
  } else {
    console.error("Não foi possível iniciar o servidor:", erro.message);
  }
  process.exit(1);
});

function montarOrigensPermitidas() {
  const origens = new Set([
    "http://localhost:5500",
    "http://127.0.0.1:5500",
  ]);

  const configurada = (process.env.FRONTEND_URL || "").trim().replace(/\/$/, "");

  if (configurada) {
    origens.add(configurada);
  } else {
    console.warn("FRONTEND_URL não definida. Em produção, use a URL pública do frontend na Vercel.");
  }

  return origens;
}

function interpretarId(valor) {
  if (!/^\d+$/.test(String(valor))) {
    return null;
  }

  const id = Number(valor);

  if (!Number.isInteger(id) || id < 1 || id > ID_MAXIMO) {
    return null;
  }

  return id;
}

function validarTarefa(corpo, statusObrigatorio) {
  if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) {
    return { erro: "Envie um objeto JSON com os dados da tarefa." };
  }

  const desconhecidos = Object.keys(corpo).filter((campo) => !CAMPOS_PERMITIDOS.includes(campo));
  if (desconhecidos.length > 0) {
    return {
      erro: "A requisição contém campos não permitidos. Use apenas: titulo, descricao, materia, data_prevista e status.",
    };
  }

  if (typeof corpo.titulo !== "string") {
    return { erro: "O título é obrigatório e deve ser um texto." };
  }

  const titulo = corpo.titulo.trim();
  if (!titulo) {
    return { erro: "O título é obrigatório." };
  }
  if (titulo.length > 150) {
    return { erro: "O título deve ter no máximo 150 caracteres." };
  }

  let descricao = null;
  if (corpo.descricao !== undefined && corpo.descricao !== null && corpo.descricao !== "") {
    if (typeof corpo.descricao !== "string") {
      return { erro: "A descrição deve ser um texto." };
    }
    descricao = corpo.descricao.trim();
    if (descricao.length > 1000) {
      return { erro: "A descrição deve ter no máximo 1000 caracteres." };
    }
    if (!descricao) {
      descricao = null;
    }
  }

  if (typeof corpo.materia !== "string") {
    return { erro: "A matéria é obrigatória e deve ser um texto." };
  }

  const materia = corpo.materia.trim();
  if (!materia) {
    return { erro: "A matéria é obrigatória." };
  }
  if (materia.length > 100) {
    return { erro: "A matéria deve ter no máximo 100 caracteres." };
  }

  let dataPrevista = null;
  if (corpo.data_prevista !== undefined && corpo.data_prevista !== null && corpo.data_prevista !== "") {
    if (typeof corpo.data_prevista !== "string" || !dataValida(corpo.data_prevista)) {
      return { erro: "A data prevista deve estar no formato AAAA-MM-DD." };
    }
    dataPrevista = corpo.data_prevista;
  }

  let status = "A estudar";
  const statusAusente = corpo.status === undefined || corpo.status === null || corpo.status === "";

  if (statusAusente && statusObrigatorio) {
    return { erro: "O status é obrigatório na atualização." };
  }

  if (!statusAusente) {
    if (typeof corpo.status !== "string" || !STATUS_PERMITIDOS.includes(corpo.status.trim())) {
      return { erro: "O status deve ser: A estudar, Estudando ou Concluído." };
    }
    status = corpo.status.trim();
  }

  return {
    dados: {
      titulo,
      descricao,
      materia,
      data_prevista: dataPrevista,
      status,
    },
  };
}

function dataValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }

  const partes = valor.split("-").map(Number);
  const ano = partes[0];
  const mes = partes[1];
  const dia = partes[2];
  const data = new Date(Date.UTC(ano, mes - 1, dia));

  return data.getUTCFullYear() === ano
    && data.getUTCMonth() === mes - 1
    && data.getUTCDate() === dia;
}

async function buscarPorId(id) {
  const resultado = await consultar(
    `SELECT id, titulo, descricao, materia, data_prevista, status, criado_em
     FROM tarefas
     WHERE id = $1`,
    [id]
  );

  return resultado.rows[0] || null;
}

async function consultar(texto, parametros) {
  if (!pool) {
    const erro = new Error("DATABASE_URL ausente");
    erro.codigoHttp = 503;
    erro.mensagemPublica = "O banco de dados não está configurado. Defina a variável DATABASE_URL no backend.";
    throw erro;
  }

  try {
    return await pool.query(texto, parametros);
  } catch (erro) {
    console.error("Falha ao consultar o PostgreSQL:", erro.code || "sem código", "-", erro.message);
    const publico = new Error("Falha no banco");
    publico.codigoHttp = 500;
    publico.mensagemPublica = mensagemAmigavelDoBanco(erro);
    throw publico;
  }
}

function mensagemAmigavelDoBanco(erro) {
  if (erro && erro.code === "42P01") {
    return "A tabela tarefas não foi encontrada. Execute o script database/schema.sql no Neon.";
  }

  if (erro && erro.code === "23514") {
    return "O status informado não é permitido.";
  }

  return "Não foi possível acessar o banco de dados.";
}

function responderErro(res, erro) {
  if (erro && erro.codigoHttp) {
    return res.status(erro.codigoHttp).json({ erro: erro.mensagemPublica });
  }

  console.error("Erro inesperado:", erro && erro.message ? erro.message : erro);
  return res.status(500).json({ erro: "Erro interno ao processar a requisição." });
}
