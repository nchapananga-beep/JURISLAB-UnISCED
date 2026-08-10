const TFPA_API_URL = window.JURISLAB_CONFIG?.API_URL || "";
const TFPA_CHAVE_SESSAO = "JURISLAB_TOKEN";
const TFPA_CHAVE_UTILIZADOR = "JURISLAB_UTILIZADOR";

function tfpaEscapar(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function tfpaMensagem(elemento, texto, tipo) {
  if (!elemento) return;
  elemento.textContent = texto || "";
  elemento.classList.remove("sucesso", "erro");
  if (tipo) elemento.classList.add(tipo);
}

function tfpaFormatarDataHora(valor) {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return tfpaEscapar(valor);
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(data);
}

async function tfpaChamarApi(dados) {
  if (!TFPA_API_URL) throw new Error("A API do JURISLAB não está configurada.");
  const resposta = await fetch(TFPA_API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(dados)
  });
  if (!resposta.ok) throw new Error("Não foi possível contactar o servidor.");
  const resultado = await resposta.json();
  if (resultado?.sessaoExpirada) {
    localStorage.removeItem(TFPA_CHAVE_SESSAO);
    localStorage.removeItem(TFPA_CHAVE_UTILIZADOR);
    window.location.replace("login.html");
    throw new Error("Sessão expirada.");
  }
  return resultado;
}

function tfpaAbrirModal(modal) {
  modal.classList.remove("oculto");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("tribunal-modal-aberto");
}

function tfpaFecharModal(modal) {
  modal.classList.add("oculto");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("tribunal-modal-aberto");
}

function tfpaRenderizarResumo(processo) {
  document.getElementById("tituloProcessoPA").textContent = processo.Titulo_Processo || "Peças e Andamentos";
  document.getElementById("subtituloProcessoPA").textContent = `${processo.Numero_Processo || processo.ID_Processo || ""} · ${processo.Autor || "—"} vs. ${processo.Reu || "—"}`;
  document.getElementById("resumoProcessoPA").innerHTML = `
    <div><span>Processo</span><strong>${tfpaEscapar(processo.Numero_Processo || processo.ID_Processo || "—")}</strong></div>
    <div><span>Área</span><strong>${tfpaEscapar(processo.Area_Direito || "—")}</strong></div>
    <div><span>Estado</span><strong>${tfpaEscapar(processo.Estado || "—")}</strong></div>
    <div><span>Fase</span><strong>${tfpaEscapar(processo.Fase_Processual || "—")}</strong></div>`;
}

function tfpaRenderizarPecas(pecas) {
  const lista = document.getElementById("listaPecasTF");
  document.getElementById("totalPecasTF").textContent = `${pecas.length} ${pecas.length === 1 ? "peça" : "peças"}`;
  if (!pecas.length) {
    lista.innerHTML = `<div class="tribunal-vazio"><strong>Nenhuma peça processual encontrada.</strong><p>Registe a primeira peça deste processo.</p></div>`;
    return;
  }
  lista.innerHTML = pecas.map(function (peca) {
    const link = peca.Link_Drive ? `<a class="tribunal-documento-link" href="${tfpaEscapar(peca.Link_Drive)}" target="_blank" rel="noopener">Abrir documento</a>` : "";
    return `
      <article class="tribunal-peca-item">
        <div class="tribunal-peca-principal">
          <span class="tribunal-processo-numero">${tfpaEscapar(peca.Tipo_Peca || "Peça")}</span>
          <h3>${tfpaEscapar(peca.Titulo || "Sem título")}</h3>
          <p>${tfpaEscapar(peca.Parte || "—")} · versão ${tfpaEscapar(peca.Versao || "—")}</p>
          ${link}
        </div>
        <div class="tribunal-peca-dados">
          <div><span>Estado</span><strong>${tfpaEscapar(peca.Estado || "—")}</strong></div>
          <div><span>Submetida em</span><strong>${tfpaFormatarDataHora(peca.Data_Submissao)}</strong></div>
          <div><span>Submetida por</span><strong>${tfpaEscapar(peca.Submetido_Por || "—")}</strong></div>
          <div><span>ID</span><strong>${tfpaEscapar(peca.ID_Peca || "—")}</strong></div>
        </div>
      </article>`;
  }).join("");
}

function tfpaRenderizarAndamentos(andamentos) {
  const lista = document.getElementById("listaAndamentosTF");
  document.getElementById("totalAndamentosTF").textContent = `${andamentos.length} ${andamentos.length === 1 ? "andamento" : "andamentos"}`;
  if (!andamentos.length) {
    lista.innerHTML = `<div class="tribunal-vazio"><strong>Nenhum andamento encontrado.</strong><p>Os movimentos do processo aparecerão aqui.</p></div>`;
    return;
  }
  lista.innerHTML = andamentos.map(function (item) {
    const link = item.Documento_Link ? `<a class="tribunal-documento-link" href="${tfpaEscapar(item.Documento_Link)}" target="_blank" rel="noopener">Documento associado</a>` : "";
    return `
      <article class="tribunal-timeline-item">
        <div class="tribunal-timeline-marcador"></div>
        <div class="tribunal-timeline-conteudo">
          <div class="tribunal-timeline-topo">
            <strong>${tfpaEscapar(item.Tipo_Andamento || "Andamento")}</strong>
            <span>${tfpaFormatarDataHora(item.Data_Andamento || item.Criado_Em)}</span>
          </div>
          <p>${tfpaEscapar(item.Descricao || "")}</p>
          <small>${tfpaEscapar(item.Responsavel || "Sistema")}</small>
          ${link}
        </div>
      </article>`;
  }).join("");
}

document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem(TFPA_CHAVE_SESSAO);
  if (!token) { window.location.replace("login.html"); return; }

  const parametros = new URLSearchParams(window.location.search);
  const idProcesso = String(parametros.get("idProcesso") || "").trim();
  if (!idProcesso) { window.location.replace("tribunal-processos.html"); return; }

  document.getElementById("linkParticipantesTF").href = `tribunal-participantes.html?idProcesso=${encodeURIComponent(idProcesso)}`;

  const mensagemGeral = document.getElementById("mensagemGeralPA");
  const mensagemPecas = document.getElementById("mensagemPecasTF");
  const mensagemAndamentos = document.getElementById("mensagemAndamentosTF");
  const modalPeca = document.getElementById("modalNovaPecaTF");
  const modalAndamento = document.getElementById("modalNovoAndamentoTF");

  async function carregarProcesso() {
    const resultado = await tfpaChamarApi({ acao: "tfObterProcesso", token, idProcesso });
    if (!resultado.sucesso || !resultado.processo) throw new Error(resultado.mensagem || "Processo não encontrado.");
    tfpaRenderizarResumo(resultado.processo);
  }

  async function carregarPecas() {
    tfpaMensagem(mensagemPecas, "A carregar peças...", "");
    try {
      const resultado = await tfpaChamarApi({
        acao: "tfListarPecas", token, idProcesso,
        pesquisa: document.getElementById("pesquisaPecaTF").value.trim(),
        tipoPeca: document.getElementById("tipoPecaFiltroTF").value,
        estado: document.getElementById("estadoPecaFiltroTF").value
      });
      if (!resultado.sucesso) throw new Error(resultado.mensagem || "Não foi possível carregar as peças.");
      tfpaRenderizarPecas(Array.isArray(resultado.pecas) ? resultado.pecas : []);
      tfpaMensagem(mensagemPecas, "", "");
    } catch (erro) {
      tfpaRenderizarPecas([]);
      if (erro.message !== "Sessão expirada.") tfpaMensagem(mensagemPecas, erro.message, "erro");
    }
  }

  async function carregarAndamentos() {
    tfpaMensagem(mensagemAndamentos, "A carregar andamentos...", "");
    try {
      const resultado = await tfpaChamarApi({
        acao: "tfListarAndamentos", token, idProcesso,
        pesquisa: document.getElementById("pesquisaAndamentoTF").value.trim(),
        tipoAndamento: document.getElementById("tipoAndamentoFiltroTF").value
      });
      if (!resultado.sucesso) throw new Error(resultado.mensagem || "Não foi possível carregar os andamentos.");
      tfpaRenderizarAndamentos(Array.isArray(resultado.andamentos) ? resultado.andamentos : []);
      tfpaMensagem(mensagemAndamentos, "", "");
    } catch (erro) {
      tfpaRenderizarAndamentos([]);
      if (erro.message !== "Sessão expirada.") tfpaMensagem(mensagemAndamentos, erro.message, "erro");
    }
  }

  document.getElementById("abaPecas").addEventListener("click", function () {
    this.classList.add("activa"); this.setAttribute("aria-selected", "true");
    document.getElementById("abaAndamentos").classList.remove("activa");
    document.getElementById("abaAndamentos").setAttribute("aria-selected", "false");
    document.getElementById("painelPecas").classList.remove("oculto");
    document.getElementById("painelAndamentos").classList.add("oculto");
  });

  document.getElementById("abaAndamentos").addEventListener("click", function () {
    this.classList.add("activa"); this.setAttribute("aria-selected", "true");
    document.getElementById("abaPecas").classList.remove("activa");
    document.getElementById("abaPecas").setAttribute("aria-selected", "false");
    document.getElementById("painelAndamentos").classList.remove("oculto");
    document.getElementById("painelPecas").classList.add("oculto");
  });

  document.getElementById("btnNovaPecaTF").addEventListener("click", () => tfpaAbrirModal(modalPeca));
  document.getElementById("btnNovoAndamentoTF").addEventListener("click", () => tfpaAbrirModal(modalAndamento));
  document.getElementById("btnFecharPecaTF").addEventListener("click", () => tfpaFecharModal(modalPeca));
  document.getElementById("btnCancelarPecaTF").addEventListener("click", () => tfpaFecharModal(modalPeca));
  document.getElementById("btnFecharAndamentoTF").addEventListener("click", () => tfpaFecharModal(modalAndamento));
  document.getElementById("btnCancelarAndamentoTF").addEventListener("click", () => tfpaFecharModal(modalAndamento));

  [modalPeca, modalAndamento].forEach(function (modal) {
    modal.addEventListener("click", function (evento) {
      if (evento.target.dataset.fecharModal) tfpaFecharModal(modal);
    });
  });

  document.getElementById("formNovaPecaTF").addEventListener("submit", async function (evento) {
    evento.preventDefault();
    if (!this.checkValidity()) { this.reportValidity(); return; }
    const botao = document.getElementById("btnGuardarPecaTF");
    botao.disabled = true; botao.textContent = "A registar...";
    const mensagem = document.getElementById("mensagemNovaPecaTF");
    tfpaMensagem(mensagem, "", "");
    try {
      const resultado = await tfpaChamarApi({
        acao: "tfRegistarPeca", token, idProcesso,
        tipoPeca: document.getElementById("tipoPecaTF").value,
        titulo: document.getElementById("tituloPecaTF").value.trim(),
        parte: document.getElementById("partePecaTF").value,
        versao: document.getElementById("versaoPecaTF").value.trim(),
        linkDrive: document.getElementById("linkPecaTF").value.trim(),
        observacoes: document.getElementById("observacoesPecaTF").value.trim()
      });
      if (!resultado.sucesso) throw new Error(resultado.mensagem || "Não foi possível registar a peça.");
      tfpaMensagem(mensagem, resultado.mensagem || "Peça registada com sucesso.", "sucesso");
      this.reset(); document.getElementById("versaoPecaTF").value = "1.0";
      await Promise.all([carregarPecas(), carregarAndamentos()]);
      setTimeout(() => tfpaFecharModal(modalPeca), 800);
    } catch (erro) {
      if (erro.message !== "Sessão expirada.") tfpaMensagem(mensagem, erro.message, "erro");
    } finally {
      botao.disabled = false; botao.textContent = "Registar peça";
    }
  });

  document.getElementById("formNovoAndamentoTF").addEventListener("submit", async function (evento) {
    evento.preventDefault();
    if (!this.checkValidity()) { this.reportValidity(); return; }
    const botao = document.getElementById("btnGuardarAndamentoTF");
    botao.disabled = true; botao.textContent = "A registar...";
    const mensagem = document.getElementById("mensagemNovoAndamentoTF");
    tfpaMensagem(mensagem, "", "");
    try {
      const resultado = await tfpaChamarApi({
        acao: "tfRegistarAndamento", token, idProcesso,
        tipoAndamento: document.getElementById("tipoAndamentoTF").value,
        descricao: document.getElementById("descricaoAndamentoTF").value.trim(),
        documentoLink: document.getElementById("linkAndamentoTF").value.trim()
      });
      if (!resultado.sucesso) throw new Error(resultado.mensagem || "Não foi possível registar o andamento.");
      tfpaMensagem(mensagem, resultado.mensagem || "Andamento registado com sucesso.", "sucesso");
      this.reset(); await carregarAndamentos();
      setTimeout(() => tfpaFecharModal(modalAndamento), 800);
    } catch (erro) {
      if (erro.message !== "Sessão expirada.") tfpaMensagem(mensagem, erro.message, "erro");
    } finally {
      botao.disabled = false; botao.textContent = "Registar andamento";
    }
  });

  document.getElementById("btnFiltrarPecasTF").addEventListener("click", carregarPecas);
  document.getElementById("btnFiltrarAndamentosTF").addEventListener("click", carregarAndamentos);
  document.getElementById("btnSairTF").addEventListener("click", function () {
    localStorage.removeItem(TFPA_CHAVE_SESSAO);
    localStorage.removeItem(TFPA_CHAVE_UTILIZADOR);
    window.location.replace("login.html");
  });

  (async function iniciar() {
    try {
      await carregarProcesso();
      await Promise.all([carregarPecas(), carregarAndamentos()]);
      tfpaMensagem(mensagemGeral, "", "");
    } catch (erro) {
      if (erro.message !== "Sessão expirada.") tfpaMensagem(mensagemGeral, erro.message, "erro");
    }
  })();
});
