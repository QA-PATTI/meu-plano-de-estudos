/**
 * database.js
 *
 * Cria o conjunto de conexões com o PostgreSQL.
 * Somente o backend usa este arquivo. A DATABASE_URL nunca vai para o frontend.
 */

const { Pool, types } = require("pg");

// DATE (OID 1082) deve permanecer como texto "AAAA-MM-DD".
// Sem isso, a biblioteca pg transforma a data em um objeto Date à meia-noite UTC
// e o dia exibido pode mudar conforme o fuso horário do servidor.
types.setTypeParser(1082, (valor) => valor);

/**
 * Remove sslmode da URL para que a configuração de TLS deste arquivo prevaleça.
 * Com sslmode=require, a biblioteca pg desligaria a verificação do certificado.
 * Aqui a verificação permanece ligada: rejectUnauthorized true.
 */
function prepararConnectionString(connectionString) {
  let url;

  try {
    url = new URL(connectionString);
  } catch (erro) {
    throw new Error(
      "DATABASE_URL inválida. Use a string de conexão do Neon, começando com postgresql://"
    );
  }

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("DATABASE_URL deve começar com postgresql:// ou postgres://.");
  }

  url.searchParams.delete("sslmode");
  url.searchParams.delete("ssl");
  return url.toString();
}

function criarPool() {
  const connectionString = (process.env.DATABASE_URL || "").trim();
  const placeholder = "cole_aqui_a_url_do_neon";

  if (!connectionString || connectionString === placeholder) {
    console.error("");
    console.error("Configuração incompleta: DATABASE_URL ainda não foi definida.");
    console.error("1. Copie backend/.env.example para backend/.env");
    console.error("2. Cole a string de conexão do Neon na variável DATABASE_URL.");
    console.error("3. Reinicie o backend com npm start.");
    console.error("A API continua no ar, mas as rotas das tarefas falharão até essa configuração.");
    console.error("");
    return null;
  }

  let connectionStringSegura;

  try {
    connectionStringSegura = prepararConnectionString(connectionString);
  } catch (erro) {
    console.error("");
    console.error(erro.message);
    console.error("Confira o valor de DATABASE_URL no arquivo .env ou no painel do Render.");
    console.error("Não use aspas quebradas e não publique essa URL no frontend.");
    console.error("");
    return null;
  }

  // O certificado do Neon é emitido por uma autoridade em que o Node.js confia.
  // rejectUnauthorized: true recusa certificados falsos. Não mude para false.
  const pool = new Pool({
    connectionString: connectionStringSegura,
    ssl: {
      rejectUnauthorized: true,
    },
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 15000,
  });

  pool.on("error", (erro) => {
    console.error("Erro em uma conexão ociosa do PostgreSQL:", erro.message);
  });

  return pool;
}

module.exports = {
  criarPool,
  prepararConnectionString,
};
