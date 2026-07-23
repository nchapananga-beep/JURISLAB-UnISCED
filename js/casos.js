const API_JURISLAB = "https://script.google.com/macros/s/AKfycbyFzl8x8Kazn2ek0j5N8qF0f5beYNOSrNSfxx837FEF0do_gF3lzW3Z1UCvo9eeTROB/exec";
const CHAVE_SESSAO = "JURISLAB_TOKEN";
const CHAVE_UTILIZADOR = "JURISLAB_UTILIZADOR";

function limparSessaoLocal() {
  localStorage.removeItem(CHAVE_SESSAO);
  localStorage.removeItem(CHAVE_UTILIZADOR);
}

function irParaLogin() {
  window.location.href = "login.html";
}

async function validarSessao(token) {
  const url = API_JURISLAB + "?acao=validarSessao&token=" + encodeURIComponent(token);
  const resposta = await fetch(url, { method: "GET" });
  if (!resposta.ok) throw new Error("Falha na validação da sessão.");
  return resposta.json();
}

async function chamarApi(dados) {
  const resposta = await fetch(API_JURISLAB, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(dados)
  });
  if (!resposta.ok) throw new Error("Não foi possível contactar o servidor.");
  return resposta.json();
}

function escaparHtml(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function mostrarMensagem(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.className = "mensagem-formulario";
  if (tipo) elemento.classList.add(tipo);
}

function casoEncerrado(caso) {
  return ["Encerrado", "Concluído", "Arquivado"].includes(caso.estadoCaso);
}

function renderizarCasos(casos, lista, resumo, accoes) {
  if (!Array.isArray(casos) || casos.length === 0) {
    lista.innerHTML = '<div class="estado-vazio">Nenhum caso encontrado.</div>';
    resumo.textContent = "0 casos encontrados.";
    return;
  }

  resumo.textContent = casos.length + (casos.length === 1 ? " caso encontrado." : " casos encontrados.");

  lista.innerHTML = casos.map(function (caso, indice) {
    const encerrado = casoEncerrado(caso);
    return `
      <article class="caso-cartao ${encerrado ? "caso-encerrado" : ""}">
        <div class="caso-topo">
          <div><h2>${escaparHtml(caso.tituloCaso || "Caso jurídico")}</h2><span class="caso-codigo">${escaparHtml(caso.idCaso)}</span></div>
          <div class="caso-etiquetas"><span>${escaparHtml(caso.estadoCaso || "Sem estado")}</span><span>${escaparHtml(caso.prioridade || "Sem prioridade")}</span></div>
        </div>
        <p class="caso-descricao">${escaparHtml(caso.descricaoCaso || "Sem descrição informada.")}</p>
        <div class="caso-dados">
          <span><strong>Área:</strong> ${escaparHtml(caso.areaDireito || "Não informada")}</span>
          <span><strong>Utente:</strong> ${escaparHtml(caso.idUtente || "")}</span>
          <span><strong>Triagem:</strong> ${escaparHtml(caso.idTriagem || "")}</span>
          <span><strong>Responsável:</strong> ${escaparHtml(caso.responsavel || "Não atribuído")}</span>
          <span><strong>Supervisor:</strong> ${escaparHtml(caso.supervisor || "Não atribuído")}</span>
          <span><strong>Prazo:</strong> ${escaparHtml(caso.prazo || "Não definido")}</span>
          <span><strong>Abertura:</strong> ${escaparHtml(caso.dataAbertura || "")}</span>
          <span><strong>Actualização:</strong> ${escaparHtml(caso.ultimaActualizacao || "")}</span>
        </div>
        ${caso.resultado ? `<div class="resultado-caso"><strong>Resultado:</strong> ${escaparHtml(caso.resultado)}</div>` : ""}
        <div class="caso-acoes">
          <button class="botao botao-secundario" type="button" data-accao="historico" data-indice="${indice}">Ver histórico</button>
          ${encerrado ? "" : `<button class="botao botao-principal" type="button" data-accao="atendimento" data-indice="${indice}">Registar atendimento</button><button class="botao botao-perigo" type="button" data-accao="encerrar" data-indice="${indice}">Encerrar caso</button>`}
        </div>
      </article>`;
  }).join("");

  lista.querySelectorAll("button[data-accao]").forEach(function (botao) {
    botao.addEventListener("click", function () {
      const caso = casos[Number(botao.dataset.indice)];
      accoes[botao.dataset.accao](caso);
    });
  });
}

function renderizarHistorico(atendimentos, recipiente) {
  if (!Array.isArray(atendimentos) || atendimentos.length === 0) {
    recipiente.innerHTML = '<div class="estado-vazio">Este caso ainda não possui atendimentos registados.</div>';
    return;
  }

  recipiente.innerHTML = atendimentos.map(function (item) {
    return `
      <article class="historico-item">
        <div class="historico-topo"><strong>${escaparHtml(item.tipoAtendimento || "Atendimento")}</strong><span>${escaparHtml(item.dataAtendimento || "")}</span></div>
        <p><strong>Resumo:</strong> ${escaparHtml(item.resumoAtendimento || "")}</p>
        <p><strong>Orientação:</strong> ${escaparHtml(item.orientacaoPrestada || "")}</p>
        ${item.proximaAccao ? `<p><strong>Próxima acção:</strong> ${escaparHtml(item.proximaAccao)}</p>` : ""}
        <div class="historico-meta"><span>${escaparHtml(item.estado || "")}</span><span>Responsável: ${escaparHtml(item.responsavel || "Não informado")}</span>${item.dataProximoContacto ? `<span>Próximo contacto: ${escaparHtml(item.dataProximoContacto)}</span>` : ""}</div>
      </article>`;
  }).join("");
}

document.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem(CHAVE_SESSAO);
  const ecraValidacao = document.getElementById("ecraValidacao");
  const formFiltros = document.getElementById("formFiltros");
  const campoPesquisa = document.getElementById("campoPesquisa");
  const filtroEstado = document.getElementById("filtroEstado");
  const btnLimpar = document.getElementById("btnLimpar");
  const lista = document.getElementById("listaCasos");
  const resumo = document.getElementById("resumoResultados");
  const mensagem = document.getElementById("mensagemCasos");

  const modalAtendimento = document.getElementById("modalAtendimento");
  const formAtendimento = document.getElementById("formAtendimento");
  const mensagemAtendimento = document.getElementById("mensagemAtendimento");
  const btnGuardarAtendimento = document.getElementById("btnGuardarAtendimento");

  const modalHistorico = document.getElementById("modalHistorico");
  const listaHistorico = document.getElementById("listaHistorico");
  const mensagemHistorico = document.getElementById("mensagemHistorico");

  const modalEncerrar = document.getElementById("modalEncerrar");
  const formEncerrar = document.getElementById("formEncerrarCaso");
  const mensagemEncerramento = document.getElementById("mensagemEncerramento");
  const btnConfirmarEncerramento = document.getElementById("btnConfirmarEncerramento");

  if (!token) { limparSessaoLocal(); irParaLogin(); return; }

  try {
    const sessao = await validarSessao(token);
    if (!sessao.sucesso || !sessao.valida) { limparSessaoLocal(); irParaLogin(); return; }
    ecraValidacao.classList.add("oculto");
  } catch (erro) { limparSessaoLocal(); irParaLogin(); return; }

  function fecharAtendimento() { modalAtendimento.classList.add("oculto"); formAtendimento.reset(); mostrarMensagem(mensagemAtendimento, "", ""); }
  function fecharHistorico() { modalHistorico.classList.add("oculto"); listaHistorico.innerHTML = ""; mostrarMensagem(mensagemHistorico, "", ""); }
  function fecharEncerrar() { modalEncerrar.classList.add("oculto"); formEncerrar.reset(); mostrarMensagem(mensagemEncerramento, "", ""); }

  function abrirAtendimento(caso) {
    document.getElementById("idCasoAtendimento").value = caso.idCaso || "";
    document.getElementById("idUtenteAtendimento").value = caso.idUtente || "";
    document.getElementById("responsavelAtendimento").value = caso.responsavel || "";
    document.getElementById("supervisorAtendimento").value = caso.supervisor || "";
    document.getElementById("resumoCasoSeleccionado").textContent = (caso.idCaso || "") + " · " + (caso.tituloCaso || "Caso jurídico");
    modalAtendimento.classList.remove("oculto");
  }

  async function abrirHistorico(caso) {
    document.getElementById("resumoCasoHistorico").textContent = (caso.idCaso || "") + " · " + (caso.tituloCaso || "Caso jurídico");
    listaHistorico.innerHTML = '<div class="estado-vazio">A carregar histórico...</div>';
    mostrarMensagem(mensagemHistorico, "", "");
    modalHistorico.classList.remove("oculto");
    try {
      const resultado = await chamarApi({ acao: "listarAtendimentosCaso", token: token, idCaso: caso.idCaso });
      if (!resultado.sucesso) { listaHistorico.innerHTML = ""; mostrarMensagem(mensagemHistorico, resultado.mensagem || "Não foi possível carregar o histórico.", "erro"); return; }
      renderizarHistorico(resultado.atendimentos || [], listaHistorico);
    } catch (erro) { listaHistorico.innerHTML = ""; mostrarMensagem(mensagemHistorico, "Não foi possível contactar o servidor.", "erro"); }
  }

  function abrirEncerrar(caso) {
    document.getElementById("idCasoEncerrar").value = caso.idCaso || "";
    document.getElementById("resumoCasoEncerrar").textContent = (caso.idCaso || "") + " · " + (caso.tituloCaso || "Caso jurídico");
    modalEncerrar.classList.remove("oculto");
  }

  async function carregarCasos() {
    resumo.textContent = "A carregar casos...";
    mostrarMensagem(mensagem, "", "");
    try {
      const resultado = await chamarApi({ acao: "listarCasos", token: token, pesquisa: campoPesquisa.value.trim(), estado: filtroEstado.value });
      if (!resultado.sucesso) { mostrarMensagem(mensagem, resultado.mensagem || "Não foi possível carregar os casos.", "erro"); lista.innerHTML = ""; resumo.textContent = ""; return; }
      renderizarCasos(resultado.casos || [], lista, resumo, { atendimento: abrirAtendimento, historico: abrirHistorico, encerrar: abrirEncerrar });
    } catch (erro) { mostrarMensagem(mensagem, "Não foi possível contactar o servidor. Tente novamente.", "erro"); resumo.textContent = ""; }
  }

  formFiltros.addEventListener("submit", function (evento) { evento.preventDefault(); carregarCasos(); });
  filtroEstado.addEventListener("change", carregarCasos);
  btnLimpar.addEventListener("click", function () { campoPesquisa.value = ""; filtroEstado.value = "Todos"; carregarCasos(); });

  document.getElementById("btnFecharModal").addEventListener("click", fecharAtendimento);
  document.getElementById("btnCancelarAtendimento").addEventListener("click", fecharAtendimento);
  document.getElementById("btnFecharHistorico").addEventListener("click", fecharHistorico);
  document.getElementById("btnFecharEncerrar").addEventListener("click", fecharEncerrar);
  document.getElementById("btnCancelarEncerramento").addEventListener("click", fecharEncerrar);
  [modalAtendimento, modalHistorico, modalEncerrar].forEach(function (modal) { modal.addEventListener("click", function (evento) { if (evento.target === modal) modal.classList.add("oculto"); }); });

  formAtendimento.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    if (!formAtendimento.checkValidity()) { formAtendimento.reportValidity(); mostrarMensagem(mensagemAtendimento, "Preencha os campos obrigatórios.", "erro"); return; }
    const dados = new FormData(formAtendimento);
    btnGuardarAtendimento.disabled = true; btnGuardarAtendimento.textContent = "A guardar...";
    try {
      const resultado = await chamarApi({ acao: "registarAtendimento", token: token, idCaso: dados.get("idCaso"), idUtente: dados.get("idUtente"), tipoAtendimento: dados.get("tipoAtendimento"), responsavel: dados.get("responsavel"), supervisor: dados.get("supervisor"), resumoAtendimento: dados.get("resumoAtendimento"), orientacaoPrestada: dados.get("orientacaoPrestada"), proximaAccao: dados.get("proximaAccao"), dataProximoContacto: dados.get("dataProximoContacto"), estado: dados.get("estado"), observacoes: dados.get("observacoes") });
      if (!resultado.sucesso) { mostrarMensagem(mensagemAtendimento, resultado.mensagem || "Não foi possível guardar o atendimento.", "erro"); return; }
      mostrarMensagem(mensagemAtendimento, (resultado.mensagem || "Atendimento registado com sucesso.") + (resultado.idAtendimento ? " Código: " + resultado.idAtendimento : ""), "sucesso");
      setTimeout(function () { fecharAtendimento(); carregarCasos(); }, 1400);
    } catch (erro) { mostrarMensagem(mensagemAtendimento, "Não foi possível contactar o servidor.", "erro"); }
    finally { btnGuardarAtendimento.disabled = false; btnGuardarAtendimento.textContent = "Guardar atendimento"; }
  });

  formEncerrar.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    if (!formEncerrar.checkValidity()) { formEncerrar.reportValidity(); mostrarMensagem(mensagemEncerramento, "Preencha o resultado final.", "erro"); return; }
    const dados = new FormData(formEncerrar);
    btnConfirmarEncerramento.disabled = true; btnConfirmarEncerramento.textContent = "A encerrar...";
    try {
      const resultado = await chamarApi({ acao: "encerrarCaso", token: token, idCaso: dados.get("idCaso"), estadoFinal: dados.get("estadoFinal"), resultado: dados.get("resultado"), observacoes: dados.get("observacoes") });
      if (!resultado.sucesso) { mostrarMensagem(mensagemEncerramento, resultado.mensagem || "Não foi possível encerrar o caso.", "erro"); return; }
      mostrarMensagem(mensagemEncerramento, resultado.mensagem || "Caso encerrado com sucesso.", "sucesso");
      setTimeout(function () { fecharEncerrar(); carregarCasos(); }, 1400);
    } catch (erro) { mostrarMensagem(mensagemEncerramento, "Não foi possível contactar o servidor.", "erro"); }
    finally { btnConfirmarEncerramento.disabled = false; btnConfirmarEncerramento.textContent = "Confirmar encerramento"; }
  });

  carregarCasos();
});