/**
 * script.js
 *
 * Controla a página: formulário, filtros, progresso e chamadas à API.
 * config.js precisa ser carregado antes deste arquivo.
 *
 * Os textos digitados pelo usuário entram na página com textContent.
 * Assim, um título com HTML é exibido como texto e não vira código da página.
 */

const STATUS_VALIDOS = ["A estudar", "Estudando", "Concluído"];

const elementos = {
  formulario: document.querySelector("#formulario-tarefa"),
  tituloFormulario: document.querySelector("#titulo-formulario"),
  ajudaFormulario: document.querySelector("#ajuda-formulario"),
  campoTitulo: document.querySelector("#titulo"),
  campoDescricao: document.querySelector("#descricao"),
  campoMateria: document.querySelector("#materia"),
  campoData: document.querySelector("#data-prevista"),
  campoStatus: document.querySelector("#status"),
  botaoSalvar: document.querySelector("#botao-salvar"),
  textoBotaoSalvar: document.querySelector("#texto-botao-salvar"),
  iconeCriar: document.querySelector("#icone-criar"),
  iconeSalvar: document.querySelector("#icone-salvar"),
  botaoCancelar: document.querySelector("#botao-cancelar"),
  lista: document.querySelector("#lista-tarefas"),
  aviso: document.querySelector("#aviso"),
  total: document.querySelector("#total-tarefas"),
  aEstudar: document.querySelector("#tarefas-a-estudar"),
  estudando: document.querySelector("#tarefas-estudando"),
  concluidas: document.querySelector("#tarefas-concluidas"),
  progressoTexto: document.querySelector("#progresso-texto"),
  progressoDetalhe: document.querySelector("#progresso-detalhe"),
  barra: document.querySelector("#barra-progresso"),
  barraPreenchimento: document.querySelector("#barra-preenchimento"),
  modal: document.querySelector("#modal-exclusao"),
  modalTexto: document.querySelector("#modal-texto"),
  botaoConfirmarExclusao: document.querySelector("#confirmar-exclusao"),
  botaoCancelarExclusao: document.querySelector("#cancelar-exclusao"),
};

let tarefas = [];
let filtroAtual = "todas";
let erroCarregamento = "";
let idEmEdicao = null;
let idParaExcluir = null;
let elementoFocadoAntes = null;
let temporizadorAviso = null;
let salvando = false;

iniciar();

function iniciar() {
  if (!window.APP_CONFIG || typeof window.APP_CONFIG.API_URL !== "string" || !window.APP_CONFIG.API_URL.trim()) {
    mostrarErroNaLista("Não foi possível encontrar o endereço da API em config.js.");
    return;
  }

  if (apiUrl().endsWith("/api")) {
    console.warn("API_URL não deve terminar com /api. Use só a origem, por exemplo http://localhost:3000.");
  }

  elementos.formulario.addEventListener("submit", salvarTarefa);
  elementos.botaoCancelar.addEventListener("click", cancelarEdicao);
  elementos.botaoConfirmarExclusao.addEventListener("click", confirmarExclusao);
  elementos.botaoCancelarExclusao.addEventListener("click", fecharModal);

  elementos.modal.addEventListener("click", (evento) => {
    if (evento.target === elementos.modal) {
      fecharModal();
    }
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && !elementos.modal.hidden) {
      fecharModal();
    }
  });

  document.querySelectorAll(".filtro").forEach((botao) => {
    botao.addEventListener("click", () => {
      filtroAtual = botao.dataset.filtro;
      document.querySelectorAll(".filtro").forEach((item) => {
        const ativo = item === botao;
        item.classList.toggle("ativo", ativo);
        item.setAttribute("aria-pressed", ativo ? "true" : "false");
      });
      renderizarLista();
    });
  });

  carregarTarefas();
}

function apiUrl() {
  return window.APP_CONFIG.API_URL.trim().replace(/\/$/, "");
}

async function requisicao(caminho, opcoes = {}) {
  const headersInformados = opcoes.headers || {};
  const resto = Object.assign({}, opcoes);
  delete resto.headers;

  let resposta;

  try {
    resposta = await fetch(apiUrl() + caminho, Object.assign({}, resto, {
      headers: Object.assign({
        "Content-Type": "application/json",
      }, headersInformados),
    }));
  } catch (erro) {
    throw new Error("Erro de comunicação com a API. Verifique se o backend está em execução e se o endereço em config.js está correto.");
  }

  if (resposta.status === 204) {
    return null;
  }

  const texto = await resposta.text();
  let corpo = null;

  if (texto) {
    try {
      corpo = JSON.parse(texto);
    } catch (erro) {
      corpo = null;
    }
  }

  if (!resposta.ok) {
    const mensagem = corpo && typeof corpo.erro === "string"
      ? corpo.erro
      : "Não foi possível concluir a operação.";
    throw new Error(mensagem);
  }

  return corpo;
}

async function carregarTarefas() {
  try {
    const dados = await requisicao("/api/tarefas");
    if (!Array.isArray(dados)) {
      throw new Error("A API retornou um formato inesperado.");
    }
    tarefas = dados;
    erroCarregamento = "";
    atualizarProgresso();
    renderizarLista();
  } catch (erro) {
    erroCarregamento = erro.message;
    mostrarErroNaLista(erro.message);
    mostrarAviso(erro.message, "erro");
  }
}

function atualizarProgresso() {
  const total = tarefas.length;
  const aEstudar = tarefas.filter((tarefa) => tarefa.status === "A estudar").length;
  const estudando = tarefas.filter((tarefa) => tarefa.status === "Estudando").length;
  const concluidas = tarefas.filter((tarefa) => tarefa.status === "Concluído").length;
  const porcentagem = total === 0 ? 0 : Math.round((concluidas / total) * 100);

  elementos.total.textContent = String(total);
  elementos.aEstudar.textContent = String(aEstudar);
  elementos.estudando.textContent = String(estudando);
  elementos.concluidas.textContent = String(concluidas);
  elementos.progressoTexto.textContent = porcentagem + "%";
  elementos.progressoDetalhe.textContent = concluidas + " de " + total + " tarefas concluídas";
  elementos.barraPreenchimento.style.width = porcentagem + "%";
  elementos.barra.setAttribute("aria-valuenow", String(porcentagem));
}

function renderizarLista() {
  if (erroCarregamento) {
    mostrarErroNaLista(erroCarregamento);
    return;
  }

  const visiveis = tarefas.filter((tarefa) => {
    return filtroAtual === "todas" || tarefa.status === filtroAtual;
  });

  elementos.lista.replaceChildren();

  if (visiveis.length === 0) {
    const mensagem = document.createElement("p");
    mensagem.className = "vazio";
    mensagem.textContent = tarefas.length === 0
      ? "Nenhuma tarefa cadastrada."
      : "Nenhuma tarefa encontrada neste filtro.";
    elementos.lista.appendChild(mensagem);
    return;
  }

  const fragmento = document.createDocumentFragment();
  visiveis.forEach((tarefa) => {
    fragmento.appendChild(criarCartao(tarefa));
  });
  elementos.lista.appendChild(fragmento);
}

function criarCartao(tarefa) {
  const artigo = document.createElement("article");
  artigo.className = "tarefa " + classeDoStatus(tarefa.status);

  const topo = document.createElement("div");
  topo.className = "tarefa-topo";

  const materia = document.createElement("p");
  materia.className = "materia";
  materia.textContent = tarefa.materia;

  const seletor = document.createElement("select");
  seletor.className = "seletor-status " + classeDoStatus(tarefa.status);
  seletor.setAttribute("aria-label", "Status da tarefa " + tarefa.titulo);

  STATUS_VALIDOS.forEach((status) => {
    const opcao = document.createElement("option");
    opcao.value = status;
    opcao.textContent = status;
    opcao.selected = status === tarefa.status;
    seletor.appendChild(opcao);
  });

  seletor.addEventListener("change", () => {
    alterarStatus(tarefa, seletor.value);
  });

  topo.append(materia, seletor);

  const titulo = document.createElement("h3");
  titulo.textContent = tarefa.titulo;

  const descricao = document.createElement("p");
  descricao.className = "descricao";
  if (tarefa.descricao) {
    descricao.textContent = tarefa.descricao;
  } else {
    descricao.className = "descricao sem-dado";
    descricao.textContent = "Sem descrição";
  }

  const data = document.createElement("p");
  data.className = "data-prevista";
  if (tarefa.data_prevista) {
    data.textContent = "Data prevista: " + formatarData(tarefa.data_prevista);
  } else {
    data.className = "data-prevista sem-dado";
    data.textContent = "Sem data prevista";
  }

  const acoes = document.createElement("div");
  acoes.className = "tarefa-acoes";

  const botaoEditar = document.createElement("button");
  botaoEditar.type = "button";
  botaoEditar.className = "botao botao-secundario";
  botaoEditar.append(icone("editar"), "Editar");
  botaoEditar.addEventListener("click", () => {
    iniciarEdicao(tarefa);
  });

  const botaoExcluir = document.createElement("button");
  botaoExcluir.type = "button";
  botaoExcluir.className = "botao botao-perigo";
  botaoExcluir.append(icone("excluir"), "Excluir");
  botaoExcluir.addEventListener("click", () => {
    abrirModal(tarefa);
  });

  acoes.append(botaoEditar, botaoExcluir);
  artigo.append(topo, titulo, descricao, data, acoes);
  return artigo;
}

function classeDoStatus(status) {
  if (status === "Estudando") {
    return "estudando";
  }
  if (status === "Concluído") {
    return "concluido";
  }
  return "a-estudar";
}

function formatarData(valor) {
  const texto = String(valor).slice(0, 10);
  const partes = texto.split("-");
  if (partes.length !== 3) {
    return texto;
  }
  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

function icone(nome) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("icone");

  const traco = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const caminhos = {
    editar: "M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z",
    excluir: "M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13",
  };
  traco.setAttribute("d", caminhos[nome]);
  traco.setAttribute("fill", "none");
  traco.setAttribute("stroke", "currentColor");
  traco.setAttribute("stroke-width", "1.8");
  traco.setAttribute("stroke-linecap", "round");
  traco.setAttribute("stroke-linejoin", "round");
  svg.appendChild(traco);
  return svg;
}

async function salvarTarefa(evento) {
  evento.preventDefault();
  if (salvando) {
    return;
  }

  const dados = lerFormulario();
  const erroValidacao = validarFormulario(dados);
  if (erroValidacao) {
    mostrarAviso(erroValidacao, "erro");
    return;
  }

  salvando = true;
  elementos.botaoSalvar.disabled = true;

  try {
    if (idEmEdicao) {
      await requisicao("/api/tarefas/" + idEmEdicao, {
        method: "PUT",
        body: JSON.stringify(dados),
      });
      mostrarAviso("Tarefa atualizada.", "sucesso");
      cancelarEdicao();
    } else {
      await requisicao("/api/tarefas", {
        method: "POST",
        body: JSON.stringify(dados),
      });
      mostrarAviso("Tarefa cadastrada.", "sucesso");
      elementos.formulario.reset();
      elementos.campoStatus.value = "A estudar";
    }
    await carregarTarefas();
  } catch (erro) {
    mostrarAviso(erro.message, "erro");
  } finally {
    salvando = false;
    elementos.botaoSalvar.disabled = false;
  }
}

function lerFormulario() {
  return {
    titulo: elementos.campoTitulo.value.trim(),
    descricao: elementos.campoDescricao.value.trim() || null,
    materia: elementos.campoMateria.value.trim(),
    data_prevista: elementos.campoData.value || null,
    status: elementos.campoStatus.value,
  };
}

function validarFormulario(dados) {
  if (!dados.titulo) {
    return "Informe o título da tarefa.";
  }
  if (dados.titulo.length > 150) {
    return "O título deve ter no máximo 150 caracteres.";
  }
  if (dados.descricao && dados.descricao.length > 1000) {
    return "A descrição deve ter no máximo 1000 caracteres.";
  }
  if (!dados.materia) {
    return "Informe a matéria.";
  }
  if (dados.materia.length > 100) {
    return "A matéria deve ter no máximo 100 caracteres.";
  }
  if (dados.data_prevista && !/^\d{4}-\d{2}-\d{2}$/.test(dados.data_prevista)) {
    return "Informe uma data prevista válida.";
  }
  if (!STATUS_VALIDOS.includes(dados.status)) {
    return "Selecione um status válido.";
  }
  return "";
}

function iniciarEdicao(tarefa) {
  idEmEdicao = tarefa.id;
  elementos.tituloFormulario.textContent = "Editar tarefa";
  elementos.ajudaFormulario.textContent = "Altere os dados e salve. A mudança é gravada no banco.";
  elementos.textoBotaoSalvar.textContent = "Salvar alterações";
  elementos.iconeCriar.hidden = true;
  elementos.iconeSalvar.hidden = false;
  elementos.botaoCancelar.hidden = false;
  elementos.campoTitulo.value = tarefa.titulo;
  elementos.campoDescricao.value = tarefa.descricao || "";
  elementos.campoMateria.value = tarefa.materia;
  elementos.campoData.value = tarefa.data_prevista ? String(tarefa.data_prevista).slice(0, 10) : "";
  elementos.campoStatus.value = tarefa.status;
  elementos.formulario.scrollIntoView({ behavior: "smooth", block: "start" });
  elementos.campoTitulo.focus();
}

function cancelarEdicao() {
  idEmEdicao = null;
  elementos.formulario.reset();
  elementos.campoStatus.value = "A estudar";
  elementos.tituloFormulario.textContent = "Nova tarefa";
  elementos.ajudaFormulario.textContent = "O status inicial sugerido é “A estudar”.";
  elementos.textoBotaoSalvar.textContent = "Cadastrar tarefa";
  elementos.iconeCriar.hidden = false;
  elementos.iconeSalvar.hidden = true;
  elementos.botaoCancelar.hidden = true;
}

async function alterarStatus(tarefa, novoStatus) {
  if (tarefa.status === novoStatus) {
    return;
  }

  try {
    await requisicao("/api/tarefas/" + tarefa.id, {
      method: "PUT",
      body: JSON.stringify({
        titulo: tarefa.titulo,
        descricao: tarefa.descricao,
        materia: tarefa.materia,
        data_prevista: tarefa.data_prevista,
        status: novoStatus,
      }),
    });

    if (idEmEdicao === tarefa.id) {
      elementos.campoStatus.value = novoStatus;
    }

    mostrarAviso("Tarefa atualizada.", "sucesso");
    await carregarTarefas();
  } catch (erro) {
    mostrarAviso(erro.message, "erro");
    await carregarTarefas();
  }
}

function abrirModal(tarefa) {
  idParaExcluir = tarefa.id;
  elementoFocadoAntes = document.activeElement;
  elementos.modalTexto.textContent = "Deseja realmente excluir a tarefa \"" + tarefa.titulo + "\"?";
  elementos.modal.hidden = false;
  elementos.botaoCancelarExclusao.focus();
}

function fecharModal() {
  elementos.modal.hidden = true;
  idParaExcluir = null;
  if (elementoFocadoAntes && typeof elementoFocadoAntes.focus === "function") {
    elementoFocadoAntes.focus();
  }
}

async function confirmarExclusao() {
  if (!idParaExcluir || elementos.botaoConfirmarExclusao.disabled) {
    return;
  }

  const id = idParaExcluir;
  elementos.botaoConfirmarExclusao.disabled = true;

  try {
    await requisicao("/api/tarefas/" + id, { method: "DELETE" });
    if (idEmEdicao === id) {
      cancelarEdicao();
    }
    fecharModal();
    mostrarAviso("Tarefa excluída.", "sucesso");
    await carregarTarefas();
  } catch (erro) {
    mostrarAviso(erro.message, "erro");
  } finally {
    elementos.botaoConfirmarExclusao.disabled = false;
  }
}

function mostrarErroNaLista(mensagem) {
  elementos.lista.replaceChildren();
  const paragrafo = document.createElement("p");
  paragrafo.className = "vazio erro-lista";
  paragrafo.textContent = mensagem;
  elementos.lista.appendChild(paragrafo);
}

function mostrarAviso(mensagem, tipo) {
  elementos.aviso.hidden = false;
  elementos.aviso.className = "aviso " + tipo;
  elementos.aviso.textContent = mensagem;
  window.clearTimeout(temporizadorAviso);
  temporizadorAviso = window.setTimeout(() => {
    elementos.aviso.hidden = true;
    elementos.aviso.textContent = "";
  }, 4500);
}
