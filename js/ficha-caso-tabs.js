(() => {
  "use strict";

  const NOMES = [
    ["resumo", "Resumo"],
    ["timeline", "Linha temporal"],
    ["atendimentos", "Atendimentos"],
    ["consultas", "Consultas"],
    ["prazos", "Prazos"],
    ["documentos", "Documentos"],
    ["encaminhamentos", "Encaminhamentos"],
    ["atribuicoes", "Atribuições"]
  ];

  function artigoPorLista(idLista) {
    return document.getElementById(idLista)?.closest("article") || null;
  }

  function prepararPainel(elemento, nome) {
    if (!elemento) return null;
    elemento.classList.add("painel-aba-caso");
    elemento.dataset.painelCaso = nome;
    return elemento;
  }

  function paineisExistentes() {
    return {
      resumo: document.getElementById("resumoCaso"),
      timeline: document.getElementById("painelTimelineCaso"),
      atendimentos: artigoPorLista("listaAtendimentos"),
      consultas: artigoPorLista("listaConsultas"),
      prazos: artigoPorLista("listaPrazos"),
      documentos: artigoPorLista("listaDocumentos"),
      encaminhamentos: artigoPorLista("listaEncaminhamentos"),
      atribuicoes: artigoPorLista("listaAtribuicoes"),
      auditoria: document.getElementById("painelAuditoriaCaso")
    };
  }

  function abrirAba(nome) {
    const alvo = document.querySelector('[data-painel-caso="' + nome + '"]');
    if (!alvo) nome = "resumo";

    document.querySelectorAll("[data-painel-caso]").forEach(function (painel) {
      painel.hidden = painel.dataset.painelCaso !== nome;
    });

    document.querySelectorAll("[data-aba-caso]").forEach(function (botao) {
      const activa = botao.dataset.abaCaso === nome;
      botao.classList.toggle("aba-caso-activa", activa);
      botao.setAttribute("aria-selected", activa ? "true" : "false");
    });

    sessionStorage.setItem("JURISLAB_ABA_FICHA_CASO", nome);
  }

  function criarEstrutura() {
    if (document.getElementById("abasCaso")) return true;

    const resumo = document.getElementById("resumoCaso");
    if (!resumo || !resumo.children.length || !resumo.parentNode) return false;

    const abas = document.createElement("nav");
    abas.id = "abasCaso";
    abas.className = "abas-caso";
    abas.setAttribute("aria-label", "Secções da ficha do caso");
    abas.setAttribute("role", "tablist");
    abas.innerHTML = NOMES.map(function ([id, titulo]) {
      return `<button type="button" role="tab" data-aba-caso="${id}">${titulo}</button>`;
    }).join("");

    const conteudo = document.createElement("div");
    conteudo.id = "conteudoAbasCaso";
    conteudo.className = "conteudo-abas-caso";

    resumo.parentNode.insertBefore(abas, resumo);
    abas.parentNode.insertBefore(conteudo, abas.nextSibling);

    const paineis = paineisExistentes();
    Object.keys(paineis).forEach(function (nome) {
      const painel = prepararPainel(paineis[nome], nome);
      if (painel) conteudo.appendChild(painel);
    });

    abas.addEventListener("click", function (evento) {
      const botao = evento.target.closest("[data-aba-caso]");
      if (!botao) return;
      abrirAba(botao.dataset.abaCaso);
    });

    const guardada = sessionStorage.getItem("JURISLAB_ABA_FICHA_CASO") || "resumo";
    abrirAba(document.querySelector('[data-painel-caso="' + guardada + '"]') ? guardada : "resumo");
    return true;
  }

  function integrarPainelNovo() {
    const conteudo = document.getElementById("conteudoAbasCaso");
    const abas = document.getElementById("abasCaso");
    if (!conteudo || !abas) return;

    const timeline = document.getElementById("painelTimelineCaso");
    if (timeline && !timeline.dataset.painelCaso) {
      prepararPainel(timeline, "timeline");
      timeline.hidden = true;
      conteudo.appendChild(timeline);
    }

    const auditoria = document.getElementById("painelAuditoriaCaso");
    if (auditoria && !auditoria.dataset.painelCaso) {
      prepararPainel(auditoria, "auditoria");
      auditoria.hidden = true;
      conteudo.appendChild(auditoria);
    }

    if (auditoria && !abas.querySelector('[data-aba-caso="auditoria"]')) {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.setAttribute("role", "tab");
      botao.dataset.abaCaso = "auditoria";
      botao.textContent = "Auditoria";
      abas.appendChild(botao);
    }
  }

  function corrigirDistribuicaoSemAtribuicao() {
    const lista = document.getElementById("listaAtribuicoes");
    if (!lista || !/sem registos/i.test(lista.textContent || "")) return;

    document.querySelectorAll("#timelineCaso .timeline-item").forEach(function (item) {
      const titulo = item.querySelector(".timeline-titulo-linha strong");
      const estado = item.querySelector(".timeline-titulo-linha span");
      const detalhe = item.querySelector(".timeline-conteudo p");
      if (!titulo || titulo.textContent.trim() !== "Distribuição do caso") return;
      if (!estado || !/conclu/i.test(estado.textContent || "")) return;

      titulo.textContent = "Responsável definido";
      if (detalhe) detalhe.textContent = "O caso possui responsável definido, mas ainda não existe um registo formal de atribuição.";
    });
  }

  function iniciar() {
    if (!criarEstrutura()) return false;
    integrarPainelNovo();
    corrigirDistribuicaoSemAtribuicao();
    return true;
  }

  document.addEventListener("DOMContentLoaded", function () {
    const observador = new MutationObserver(function () {
      if (iniciar()) {
        integrarPainelNovo();
        corrigirDistribuicaoSemAtribuicao();
      }
    });

    observador.observe(document.body, { childList: true, subtree: true });

    setTimeout(iniciar, 300);
    setTimeout(iniciar, 1000);
    setTimeout(function () {
      iniciar();
      integrarPainelNovo();
      corrigirDistribuicaoSemAtribuicao();
    }, 2200);
  });
})();