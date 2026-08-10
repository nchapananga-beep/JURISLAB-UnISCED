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
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function tfFormatarData(valor) {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return tfEscapar(valor);
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(data);
}

async function tfChamarApi(dados) {
  const resposta = await fetch(TF_API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(dados)
  });
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

function tfAbrirModal(modal) {
  modal.classList.remove("oculto");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("tribunal-modal-aberto");
}

function tfFecharModal(modal) {
  modal.classList.add("oculto");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("tribunal-modal-aberto");
}

document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem(TF_CHAVE_SESSAO);
  if (!token) { window.location.replace("login.html"); return; }

  const params = new URLSearchParams(window.location.search);
  const idProcesso = (params.get("idProcesso") || "").trim();
  const mensagemPagina = document.getElementById("mensagemPaginaTF");
  if (!idProcesso) { tfMensagem(mensagemPagina, "Processo não informado.", "erro"); return; }

  const modalDecisao = document.getElementById("modalDecisaoTF");
  const modalAvaliacao = document.getElementById("modalAvaliacaoTF");
  const formDecisao = document.getElementById("formDecisaoTF");
  const formAvaliacao = document.getElementById("formAvaliacaoTF");
  let participantes = [];

  function dataHojeInput() {
    const d = new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  async function carregarProcesso() {
    try {
      const r = await tfChamarApi({ acao: "tfObterProcesso", token, idProcesso });
      if (!r.sucesso || !r.processo) { tfMensagem(mensagemPagina, r.mensagem || "Não foi possível carregar o processo.", "erro"); return; }
      const p = r.processo;
      document.getElementById("subtituloProcessoTF").textContent = `${p.Numero_Processo || p.ID_Processo} • ${p.Titulo_Processo || "Processo"}`;
      document.getElementById("resumoProcessoTF").innerHTML = `
        <div><span>Processo</span><strong>${tfEscapar(p.Numero_Processo || p.ID_Processo)}</strong></div>
        <div><span>Partes</span><strong>${tfEscapar(p.Autor || "—")} vs. ${tfEscapar(p.Reu || "—")}</strong></div>
        <div><span>Estado</span><strong>${tfEscapar(p.Estado || "—")}</strong></div>
        <div><span>Fase</span><strong>${tfEscapar(p.Fase_Processual || "—")}</strong></div>`;
    } catch (erro) {
      if (erro.message !== "Sessão expirada.") tfMensagem(mensagemPagina, "Não foi possível carregar o processo.", "erro");
    }
  }

  function renderizarDecisoes(decisoes) {
    const lista = document.getElementById("listaDecisoesTF");
    if (!decisoes.length) {
      lista.innerHTML = `<div class="tribunal-vazio"><strong>Nenhuma decisão registada.</strong><p>Registe a primeira decisão deste processo.</p></div>`;
      return;
    }
    lista.innerHTML = decisoes.map(d => `
      <article class="tribunal-processo-item tribunal-item-compacto">
        <div class="tribunal-processo-identificacao">
          <span class="tribunal-processo-numero">${tfEscapar(d.ID_Decisao)}</span>
          <h3>${tfEscapar(d.Titulo || d.Tipo_Decisao || "Decisão")}</h3>
          <p>${tfEscapar(d.Tipo_Decisao || "—")} • ${tfFormatarData(d.Data_Decisao)}</p>
          ${d.Link_Documento ? `<a class="tribunal-documento-link" href="${tfEscapar(d.Link_Documento)}" target="_blank" rel="noopener">Abrir documento</a>` : ""}
        </div>
        <div class="tribunal-processo-dados">
          <div><span>Juiz</span><strong>${tfEscapar(d.Juiz || "—")}</strong></div>
          <div><span>Resultado</span><strong>${tfEscapar(d.Resultado || "—")}</strong></div>
          <div><span>Estado</span><strong class="tribunal-estado">${tfEscapar(d.Estado || "—")}</strong></div>
          <div><span>Dispositivo</span><strong>${tfEscapar(d.Dispositivo || "—")}</strong></div>
        </div>
      </article>`).join("");
  }

  async function carregarDecisoes() {
    const msg = document.getElementById("mensagemDecisoesTF");
    tfMensagem(msg, "A carregar decisões...", "");
    try {
      const r = await tfChamarApi({ acao: "tfListarDecisoes", token, idProcesso });
      if (!r.sucesso) { renderizarDecisoes([]); tfMensagem(msg, r.mensagem || "Não foi possível carregar as decisões.", "erro"); return; }
      renderizarDecisoes(Array.isArray(r.decisoes) ? r.decisoes : []);
      tfMensagem(msg, "", "");
    } catch (erro) {
      if (erro.message !== "Sessão expirada.") tfMensagem(msg, "Não foi possível carregar as decisões.", "erro");
    }
  }

  function renderizarAvaliacoes(avaliacoes) {
    const lista = document.getElementById("listaAvaliacoesTF");
    if (!avaliacoes.length) {
      lista.innerHTML = `<div class="tribunal-vazio"><strong>Nenhuma avaliação registada.</strong><p>Avalie um participante do processo.</p></div>`;
      return;
    }
    lista.innerHTML = avaliacoes.map(a => `
      <article class="tribunal-processo-item tribunal-item-compacto">
        <div class="tribunal-processo-identificacao">
          <span class="tribunal-processo-numero">${tfEscapar(a.ID_Avaliacao)}</span>
          <h3>${tfEscapar(a.Nome_Participante || "Participante")}</h3>
          <p>${tfEscapar(a.Papel_Processual || "—")}</p>
        </div>
        <div class="tribunal-processo-dados">
          <div><span>Argumentação</span><strong>${tfEscapar(a.Argumentacao_Juridica ?? "—")}</strong></div>
          <div><span>Domínio</span><strong>${tfEscapar(a.Dominio_Processual ?? "—")}</strong></div>
          <div><span>Oralidade</span><strong>${tfEscapar(a.Oralidade ?? "—")}</strong></div>
          <div><span>Nota final</span><strong class="tribunal-estado">${tfEscapar(a.Nota_Final ?? "—")}/20</strong></div>
        </div>
      </article>`).join("");
  }

  async function carregarAvaliacoes() {
    const msg = document.getElementById("mensagemAvaliacoesTF");
    tfMensagem(msg, "A carregar avaliações...", "");
    try {
      const r = await tfChamarApi({ acao: "tfListarAvaliacoes", token, idProcesso });
      if (!r.sucesso) { renderizarAvaliacoes([]); tfMensagem(msg, r.mensagem || "Não foi possível carregar as avaliações.", "erro"); return; }
      renderizarAvaliacoes(Array.isArray(r.avaliacoes) ? r.avaliacoes : []);
      tfMensagem(msg, "", "");
    } catch (erro) {
      if (erro.message !== "Sessão expirada.") tfMensagem(msg, "Não foi possível carregar as avaliações.", "erro");
    }
  }

  async function carregarParticipantes() {
    try {
      const r = await tfChamarApi({ acao: "tfListarParticipantes", token, idProcesso, estado: "Activo" });
      participantes = r.sucesso && Array.isArray(r.participantes) ? r.participantes : [];
      const select = document.getElementById("participanteAvaliacaoTF");
      select.innerHTML = `<option value="">Seleccione</option>` + participantes.map((p, i) => `<option value="${i}">${tfEscapar(p.Nome || "Participante")} — ${tfEscapar(p.Papel_Processual || "")}</option>`).join("");
    } catch (erro) {}
  }

  document.querySelectorAll(".tribunal-aba").forEach(btn => btn.addEventListener("click", function () {
    document.querySelectorAll(".tribunal-aba").forEach(b => b.classList.remove("activa"));
    document.querySelectorAll(".tribunal-painel-aba").forEach(p => p.classList.add("oculto"));
    btn.classList.add("activa");
    document.getElementById(btn.dataset.alvo).classList.remove("oculto");
  }));

  document.getElementById("btnNovaDecisaoTF").addEventListener("click", function () {
    document.getElementById("dataDecisaoTF").value = dataHojeInput();
    tfMensagem(document.getElementById("mensagemModalDecisaoTF"), "", "");
    tfAbrirModal(modalDecisao);
  });
  document.getElementById("btnFecharDecisaoTF").addEventListener("click", () => tfFecharModal(modalDecisao));
  document.getElementById("btnCancelarDecisaoTF").addEventListener("click", () => tfFecharModal(modalDecisao));

  formDecisao.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    if (!formDecisao.checkValidity()) { formDecisao.reportValidity(); return; }
    const btn = document.getElementById("btnGuardarDecisaoTF");
    const msg = document.getElementById("mensagemModalDecisaoTF");
    btn.disabled = true; btn.textContent = "A registar...";
    try {
      const r = await tfChamarApi({
        acao: "tfRegistarDecisao", token, idProcesso,
        tipoDecisao: document.getElementById("tipoDecisaoTF").value,
        titulo: document.getElementById("tituloDecisaoTF").value.trim(),
        resumo: document.getElementById("resumoDecisaoTF").value.trim(),
        fundamentacao: document.getElementById("fundamentacaoDecisaoTF").value.trim(),
        dispositivo: document.getElementById("dispositivoDecisaoTF").value.trim(),
        resultado: document.getElementById("resultadoDecisaoTF").value.trim(),
        dataDecisao: document.getElementById("dataDecisaoTF").value,
        juiz: document.getElementById("juizDecisaoTF").value.trim(),
        linkDocumento: document.getElementById("linkDecisaoTF").value.trim(),
        observacoes: document.getElementById("observacoesDecisaoTF").value.trim()
      });
      if (!r.sucesso) { tfMensagem(msg, r.mensagem || "Não foi possível registar a decisão.", "erro"); return; }
      tfMensagem(msg, "Decisão registada com sucesso.", "sucesso");
      formDecisao.reset(); await carregarDecisoes(); setTimeout(() => tfFecharModal(modalDecisao), 700);
    } catch (erro) {
      if (erro.message !== "Sessão expirada.") tfMensagem(msg, "Não foi possível registar a decisão.", "erro");
    } finally { btn.disabled = false; btn.textContent = "Registar decisão"; }
  });

  document.getElementById("btnNovaAvaliacaoTF").addEventListener("click", function () {
    tfMensagem(document.getElementById("mensagemModalAvaliacaoTF"), "", "");
    tfAbrirModal(modalAvaliacao);
  });
  document.getElementById("btnFecharAvaliacaoTF").addEventListener("click", () => tfFecharModal(modalAvaliacao));
  document.getElementById("btnCancelarAvaliacaoTF").addEventListener("click", () => tfFecharModal(modalAvaliacao));

  formAvaliacao.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    if (!formAvaliacao.checkValidity()) { formAvaliacao.reportValidity(); return; }
    const indice = Number(document.getElementById("participanteAvaliacaoTF").value);
    const p = participantes[indice];
    if (!p) { tfMensagem(document.getElementById("mensagemModalAvaliacaoTF"), "Seleccione um participante.", "erro"); return; }
    const btn = document.getElementById("btnGuardarAvaliacaoTF");
    const msg = document.getElementById("mensagemModalAvaliacaoTF");
    btn.disabled = true; btn.textContent = "A registar...";
    try {
      const r = await tfChamarApi({
        acao: "tfRegistarAvaliacao", token, idProcesso,
        idParticipante: p.ID_Participante,
        nomeParticipante: p.Nome,
        papelProcessual: p.Papel_Processual,
        argumentacaoJuridica: Number(document.getElementById("argumentacaoTF").value),
        dominioProcessual: Number(document.getElementById("dominioTF").value),
        oralidade: Number(document.getElementById("oralidadeTF").value),
        eticaPostura: Number(document.getElementById("eticaTF").value),
        trabalhoEquipa: Number(document.getElementById("equipaTF").value),
        qualidadePecas: Number(document.getElementById("pecasTF").value),
        comentario: document.getElementById("comentarioAvaliacaoTF").value.trim()
      });
      if (!r.sucesso) { tfMensagem(msg, r.mensagem || "Não foi possível registar a avaliação.", "erro"); return; }
      tfMensagem(msg, `Avaliação registada. Nota final: ${r.avaliacao?.notaFinal ?? "—"}/20.`, "sucesso");
      formAvaliacao.reset(); await carregarAvaliacoes(); setTimeout(() => tfFecharModal(modalAvaliacao), 900);
    } catch (erro) {
      if (erro.message !== "Sessão expirada.") tfMensagem(msg, "Não foi possível registar a avaliação.", "erro");
    } finally { btn.disabled = false; btn.textContent = "Registar avaliação"; }
  });

  document.getElementById("btnSairTF").addEventListener("click", function () {
    localStorage.removeItem(TF_CHAVE_SESSAO);
    localStorage.removeItem(TF_CHAVE_UTILIZADOR);
    window.location.replace("login.html");
  });

  carregarProcesso();
  carregarParticipantes();
  carregarDecisoes();
  carregarAvaliacoes();
});