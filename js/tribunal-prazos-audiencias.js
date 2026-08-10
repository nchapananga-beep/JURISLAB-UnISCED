const TF_API_URL = window.JURISLAB_CONFIG?.API_URL || "";
const TF_CHAVE_SESSAO = "JURISLAB_TOKEN";
const TF_CHAVE_UTILIZADOR = "JURISLAB_UTILIZADOR";

function tfMensagem(el, texto, tipo) {
  if (!el) return;
  el.textContent = texto || "";
  el.classList.remove("sucesso", "erro");
  if (tipo) el.classList.add(tipo);
}

function tfEscapar(valor) {
  return String(valor ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function tfFormatarData(valor) {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return tfEscapar(valor);
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(data);
}

function tfFormatarHora(valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  const texto = String(valor).trim();
  const horaSimples = texto.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (horaSimples) return `${horaSimples[1].padStart(2, "0")}:${horaSimples[2]}`;
  const data = new Date(texto);
  if (!Number.isNaN(data.getTime())) {
    return `${String(data.getUTCHours()).padStart(2, "0")}:${String(data.getUTCMinutes()).padStart(2, "0")}`;
  }
  return tfEscapar(texto);
}

async function tfChamarApi(dados) {
  const resposta = await fetch(TF_API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(dados) });
  if (!resposta.ok) throw new Error("Não foi possível contactar o servidor.");
  const resultado = await resposta.json();
  if (resultado?.sessaoExpirada) {
    localStorage.removeItem(TF_CHAVE_SESSAO);
    localStorage.removeItem(TF_CHAVE_UTILIZADOR);
    window.location.replace("login.html");
    throw new Error("Sessão expirada.");
  }
  return resultado;
}

function tfAbrirModal(modal) { modal.classList.remove("oculto"); modal.setAttribute("aria-hidden", "false"); document.body.classList.add("tribunal-modal-aberto"); }
function tfFecharModal(modal) { modal.classList.add("oculto"); modal.setAttribute("aria-hidden", "true"); document.body.classList.remove("tribunal-modal-aberto"); }

document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem(TF_CHAVE_SESSAO);
  if (!token) { window.location.replace("login.html"); return; }
  const params = new URLSearchParams(window.location.search);
  const idProcesso = (params.get("idProcesso") || "").trim();
  const mensagemPagina = document.getElementById("mensagemPaginaTF");
  if (!idProcesso) { tfMensagem(mensagemPagina, "Processo não informado.", "erro"); return; }

  const modalPrazo = document.getElementById("modalPrazoTF");
  const modalAudiencia = document.getElementById("modalAudienciaTF");
  const formPrazo = document.getElementById("formPrazoTF");
  const formAudiencia = document.getElementById("formAudienciaTF");

  function dataHojeInput() { const d = new Date(); const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 10); }

  async function carregarProcesso() {
    try {
      const resultado = await tfChamarApi({ acao: "tfObterProcesso", token, idProcesso });
      if (!resultado.sucesso || !resultado.processo) { tfMensagem(mensagemPagina, resultado.mensagem || "Não foi possível carregar o processo.", "erro"); return; }
      const p = resultado.processo;
      document.getElementById("subtituloProcessoTF").textContent = `${p.Numero_Processo || p.ID_Processo} • ${p.Titulo_Processo || "Processo"}`;
      document.getElementById("resumoProcessoTF").innerHTML = `<div><span>Processo</span><strong>${tfEscapar(p.Numero_Processo || p.ID_Processo)}</strong></div><div><span>Partes</span><strong>${tfEscapar(p.Autor || "—")} vs. ${tfEscapar(p.Reu || "—")}</strong></div><div><span>Estado</span><strong>${tfEscapar(p.Estado || "—")}</strong></div><div><span>Fase</span><strong>${tfEscapar(p.Fase_Processual || "—")}</strong></div>`;
    } catch (erro) { if (erro.message !== "Sessão expirada.") tfMensagem(mensagemPagina, "Não foi possível carregar o processo.", "erro"); }
  }

  function renderizarPrazos(prazos) {
    const lista = document.getElementById("listaPrazosTF");
    if (!prazos.length) { lista.innerHTML = `<div class="tribunal-vazio"><strong>Nenhum prazo encontrado.</strong><p>Registe um prazo para este processo.</p></div>`; return; }
    lista.innerHTML = prazos.map(p => {
      const estado = p.Estado || "—";
      const cumprir = estado === "Em curso" || estado === "Vencido";
      return `<article class="tribunal-processo-item tribunal-item-compacto"><div class="tribunal-processo-identificacao"><span class="tribunal-processo-numero">${tfEscapar(p.ID_Prazo)}</span><h3>${tfEscapar(p.Acto || "Prazo")}</h3><p>Responsável: ${tfEscapar(p.Responsavel || "—")}</p>${cumprir ? `<button class="tribunal-acao-link tribunal-botao-link" type="button" data-cumprir-prazo="${tfEscapar(p.ID_Prazo)}">Marcar cumprido</button>` : ""}</div><div class="tribunal-processo-dados"><div><span>Início</span><strong>${tfFormatarData(p.Data_Inicio)}</strong></div><div><span>Dias</span><strong>${tfEscapar(p.Dias || "—")}</strong></div><div><span>Limite</span><strong>${tfFormatarData(p.Data_Limite)}</strong></div><div><span>Estado</span><strong class="tribunal-estado">${tfEscapar(estado)}</strong></div></div></article>`;
    }).join("");
  }

  async function carregarPrazos() {
    const msg = document.getElementById("mensagemPrazosTF"); tfMensagem(msg, "A carregar prazos...", "");
    try {
      const r = await tfChamarApi({ acao: "tfListarPrazos", token, idProcesso, pesquisa: document.getElementById("pesquisaPrazoTF").value.trim(), estado: document.getElementById("estadoPrazoTF").value });
      if (!r.sucesso) { renderizarPrazos([]); tfMensagem(msg, r.mensagem || "Não foi possível carregar os prazos.", "erro"); return; }
      renderizarPrazos(Array.isArray(r.prazos) ? r.prazos : []); tfMensagem(msg, "", "");
    } catch (erro) { if (erro.message !== "Sessão expirada.") tfMensagem(msg, "Não foi possível carregar os prazos.", "erro"); }
  }

  function renderizarAudiencias(audiencias) {
    const lista = document.getElementById("listaAudienciasTF");
    if (!audiencias.length) { lista.innerHTML = `<div class="tribunal-vazio"><strong>Nenhuma audiência encontrada.</strong><p>Agende a primeira audiência deste processo.</p></div>`; return; }
    lista.innerHTML = audiencias.map(a => `<article class="tribunal-processo-item tribunal-item-compacto"><div class="tribunal-processo-identificacao"><span class="tribunal-processo-numero">${tfEscapar(a.ID_Audiencia)}</span><h3>${tfEscapar(a.Tipo_Audiencia || "Audiência")}</h3><p>${tfEscapar(a.Sala || "Sala por definir")} • ${tfFormatarHora(a.Hora)}</p><div class="tribunal-processo-acoes">${a.Estado === "Agendada" ? `<button class="tribunal-acao-link tribunal-botao-link" data-estado-audiencia="Realizada" data-id-audiencia="${tfEscapar(a.ID_Audiencia)}" type="button">Marcar realizada</button><button class="tribunal-acao-link tribunal-botao-link" data-estado-audiencia="Adiada" data-id-audiencia="${tfEscapar(a.ID_Audiencia)}" type="button">Adiar</button>` : ""}</div></div><div class="tribunal-processo-dados"><div><span>Data</span><strong>${tfFormatarData(a.Data)}</strong></div><div><span>Juiz</span><strong>${tfEscapar(a.Juiz || "—")}</strong></div><div><span>Secretário</span><strong>${tfEscapar(a.Secretario || "—")}</strong></div><div><span>Estado</span><strong class="tribunal-estado">${tfEscapar(a.Estado || "—")}</strong></div></div></article>`).join("");
  }

  async function carregarAudiencias() {
    const msg = document.getElementById("mensagemAudienciasTF"); tfMensagem(msg, "A carregar audiências...", "");
    try {
      const r = await tfChamarApi({ acao: "tfListarAudiencias", token, idProcesso, pesquisa: document.getElementById("pesquisaAudienciaTF").value.trim(), estado: document.getElementById("estadoAudienciaTF").value });
      if (!r.sucesso) { renderizarAudiencias([]); tfMensagem(msg, r.mensagem || "Não foi possível carregar as audiências.", "erro"); return; }
      renderizarAudiencias(Array.isArray(r.audiencias) ? r.audiencias : []); tfMensagem(msg, "", "");
    } catch (erro) { if (erro.message !== "Sessão expirada.") tfMensagem(msg, "Não foi possível carregar as audiências.", "erro"); }
  }

  document.querySelectorAll(".tribunal-aba").forEach(btn => btn.addEventListener("click", function () { document.querySelectorAll(".tribunal-aba").forEach(b => b.classList.remove("activa")); document.querySelectorAll(".tribunal-painel-aba").forEach(p => p.classList.add("oculto")); btn.classList.add("activa"); document.getElementById(btn.dataset.alvo).classList.remove("oculto"); }));
  document.getElementById("btnNovoPrazoTF").addEventListener("click", function () { document.getElementById("dataInicioPrazoTF").value = dataHojeInput(); tfMensagem(document.getElementById("mensagemModalPrazoTF"), "", ""); tfAbrirModal(modalPrazo); });
  document.getElementById("btnFecharPrazoTF").addEventListener("click", () => tfFecharModal(modalPrazo));
  document.getElementById("btnCancelarPrazoTF").addEventListener("click", () => tfFecharModal(modalPrazo));

  formPrazo.addEventListener("submit", async function (evento) {
    evento.preventDefault(); if (!formPrazo.checkValidity()) { formPrazo.reportValidity(); return; }
    const btn = document.getElementById("btnGuardarPrazoTF"); const msg = document.getElementById("mensagemModalPrazoTF"); btn.disabled = true; btn.textContent = "A registar...";
    try {
      const r = await tfChamarApi({ acao: "tfRegistarPrazo", token, idProcesso, acto: document.getElementById("actoPrazoTF").value.trim(), responsavel: document.getElementById("responsavelPrazoTF").value.trim(), dataInicio: document.getElementById("dataInicioPrazoTF").value, dias: Number(document.getElementById("diasPrazoTF").value), observacoes: document.getElementById("observacoesPrazoTF").value.trim() });
      if (!r.sucesso) { tfMensagem(msg, r.mensagem || "Não foi possível registar o prazo.", "erro"); return; }
      tfMensagem(msg, "Prazo registado com sucesso.", "sucesso"); formPrazo.reset(); await carregarPrazos(); setTimeout(() => tfFecharModal(modalPrazo), 700);
    } catch (erro) { if (erro.message !== "Sessão expirada.") tfMensagem(msg, "Não foi possível registar o prazo.", "erro"); } finally { btn.disabled = false; btn.textContent = "Registar prazo"; }
  });

  document.getElementById("listaPrazosTF").addEventListener("click", async function (evento) {
    const btn = evento.target.closest("[data-cumprir-prazo]"); if (!btn) return; btn.disabled = true;
    try { const r = await tfChamarApi({ acao: "tfCumprirPrazo", token, idPrazo: btn.dataset.cumprirPrazo }); if (!r.sucesso) { tfMensagem(document.getElementById("mensagemPrazosTF"), r.mensagem || "Não foi possível actualizar o prazo.", "erro"); return; } await carregarPrazos(); }
    catch (erro) { if (erro.message !== "Sessão expirada.") tfMensagem(document.getElementById("mensagemPrazosTF"), "Não foi possível actualizar o prazo.", "erro"); } finally { btn.disabled = false; }
  });

  document.getElementById("btnNovaAudienciaTF").addEventListener("click", function () { tfMensagem(document.getElementById("mensagemModalAudienciaTF"), "", ""); tfAbrirModal(modalAudiencia); });
  document.getElementById("btnFecharAudienciaTF").addEventListener("click", () => tfFecharModal(modalAudiencia));
  document.getElementById("btnCancelarAudienciaTF").addEventListener("click", () => tfFecharModal(modalAudiencia));

  formAudiencia.addEventListener("submit", async function (evento) {
    evento.preventDefault(); if (!formAudiencia.checkValidity()) { formAudiencia.reportValidity(); return; }
    const btn = document.getElementById("btnGuardarAudienciaTF"); const msg = document.getElementById("mensagemModalAudienciaTF"); btn.disabled = true; btn.textContent = "A agendar...";
    try {
      const r = await tfChamarApi({ acao: "tfAgendarAudiencia", token, idProcesso, tipoAudiencia: document.getElementById("tipoAudienciaTF").value, data: document.getElementById("dataAudienciaTF").value, hora: document.getElementById("horaAudienciaTF").value, sala: document.getElementById("salaAudienciaTF").value.trim(), linkOnline: document.getElementById("linkAudienciaTF").value.trim(), juiz: document.getElementById("juizAudienciaTF").value.trim(), secretario: document.getElementById("secretarioAudienciaTF").value.trim(), observacoes: document.getElementById("observacoesAudienciaTF").value.trim() });
      if (!r.sucesso) { tfMensagem(msg, r.mensagem || "Não foi possível agendar a audiência.", "erro"); return; }
      tfMensagem(msg, "Audiência agendada com sucesso.", "sucesso"); formAudiencia.reset(); await carregarAudiencias(); setTimeout(() => tfFecharModal(modalAudiencia), 700);
    } catch (erro) { if (erro.message !== "Sessão expirada.") tfMensagem(msg, "Não foi possível agendar a audiência.", "erro"); } finally { btn.disabled = false; btn.textContent = "Agendar audiência"; }
  });

  document.getElementById("listaAudienciasTF").addEventListener("click", async function (evento) {
    const btn = evento.target.closest("[data-estado-audiencia]"); if (!btn) return; btn.disabled = true;
    try { const r = await tfChamarApi({ acao: "tfAtualizarEstadoAudiencia", token, idAudiencia: btn.dataset.idAudiencia, estado: btn.dataset.estadoAudiencia }); if (!r.sucesso) { tfMensagem(document.getElementById("mensagemAudienciasTF"), r.mensagem || "Não foi possível actualizar a audiência.", "erro"); return; } await carregarAudiencias(); }
    catch (erro) { if (erro.message !== "Sessão expirada.") tfMensagem(document.getElementById("mensagemAudienciasTF"), "Não foi possível actualizar a audiência.", "erro"); } finally { btn.disabled = false; }
  });

  document.getElementById("btnPesquisarPrazoTF").addEventListener("click", carregarPrazos);
  document.getElementById("btnPesquisarAudienciaTF").addEventListener("click", carregarAudiencias);
  document.getElementById("btnSairTF").addEventListener("click", function () { localStorage.removeItem(TF_CHAVE_SESSAO); localStorage.removeItem(TF_CHAVE_UTILIZADOR); window.location.replace("login.html"); });
  carregarProcesso(); carregarPrazos(); carregarAudiencias();
});