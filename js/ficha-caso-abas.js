(() => {
  "use strict";

  const ABAS = [
    { id: "resumo", titulo: "Resumo" },
    { id: "timeline", titulo: "Timeline" },
    { id: "atendimentos", titulo: "Atendimentos" },
    { id: "consultas", titulo: "Consultas" },
    { id: "prazos", titulo: "Prazos" },
    { id: "documentos", titulo: "Documentos" },
    { id: "encaminhamentos", titulo: "Encaminhamentos" },
    { id: "atribuicoes", titulo: "Atribuições" }
  ];

  function encontrarArtigoPorTitulo(titulo) {
    return [...document.querySelectorAll(".grelha-seccoes .seccao-ficha")].find(function (artigo) {
      const h2 = artigo.querySelector("h2");
      return h2 && h2.textContent.trim().toLowerCase() === titulo.toLowerCase();
    }) || null;
  }

  function mapearPaineis() {
    return {
      resumo: document.getElementById("resumoCaso"),
      timeline: document.getElementById("painelTimelineCaso"),
      atendimentos: encontrarArtigoPorTitulo("Atendimentos"),
      consultas: encontrarArtigoPorTitulo("Consultas"),
      prazos: encontrarArtigoPorTitulo("Prazos"),
      documentos: encontrarArtigoPorTitulo("Documentos"),
      encaminhamentos: encontrarArtigoPorTitulo("Encaminhamentos"),
      atribuicoes: encontrarArtigoPorTitulo("Atribuições")
    };
  }

  function corrigirCoerenciaDistribuicao() {
    const artigoAtribuicoes = encontrarArtigoPorTitulo("Atribuições");
    const semAtribuicoes = artigoAtribuicoes && /sem registos/i.test(artigoAtribuicoes.textContent || "");
    if (!semAtribuicoes) return;

    const itens = document.querySelectorAll("#timelineCaso .timeline-item");
    itens.forEach(function (item) {
      const titulo = item.querySelector(".timeline-titulo-linha strong");
      if (!titulo || titulo.textContent.trim() !== "Distribuição do caso") return;

      const estado = item.querySelector(".timeline-titulo-linha span");
      const detalhe = item.querySelector(".timeline-conteudo p");
      if (estado && /conclu/i.test(estado.textContent || "")) {
        titulo.textContent = "Responsável definido";
        if (detalhe) {
          detalhe.textContent = "O caso possui responsável definido, embora ainda não exista um registo formal de atribuição.";
        }
      }
    });
  }

  function criarNavegacao() {
    if (document.getElementById("navegacaoFichaAbas")) return;

    const cabecalho = document.querySelector(".ficha-cabecalho");
    if (!cabecalho || !cabecalho.parentNode) return;

    const nav = document.createElement("nav");
    nav.id = "navegacaoFichaAbas";
    nav.className = "navegacao-ficha-abas";
    nav.setAttribute("aria-label", "Secções da ficha do caso");

    nav.innerHTML = ABAS.map(function (aba, indice) {
      return `<button type="button" class="botao-aba-ficha${indice === 0 ? " aba-activa" : ""}" data-aba="${aba.id}">${aba.titulo}</button>`;
    }).join("");

    cabecalho.parentNode.insertBefore(nav, cabecalho.nextSibling);
  }

  function activarAba(id) {
    const paineis = mapearPaineis();
    const alvo = paineis[id] || paineis.resumo;

    Object.keys(paineis).forEach(function (chave) {
      const painel = paineis[chave];
      if (!painel) return;
      painel.classList.add("painel-aba-ficha");
      painel.classList.toggle("painel-aba-oculto", painel !== alvo);
    });

    document.querySelectorAll(".botao-aba-ficha").forEach(function (botao) {
      const activa = botao.dataset.aba === id;
      botao.classList.toggle("aba-activa", activa);
      botao.setAttribute("aria-selected", activa ? "true" : "false");
    });

    const grelha = document.querySelector(".grelha-seccoes");
    if (grelha) grelha.classList.add("abas-activas");

    if (alvo && window.innerWidth <= 620) {
      const nav = document.getElementById("navegacaoFichaAbas");
      if (nav) {
        setTimeout(function () {
          nav.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      }
    }
  }

  function iniciar() {
    criarNavegacao();

    const nav = document.getElementById("navegacaoFichaAbas");
    if (!nav) return;

    nav.addEventListener("click", function (evento) {
      const botao = evento.target.closest("button[data-aba]");
      if (!botao) return;
      activarAba(botao.dataset.aba);
    });

    activarAba("resumo");
    corrigirCoerenciaDistribuicao();

    const observador = new MutationObserver(function () {
      const timeline = document.getElementById("painelTimelineCaso");
      if (timeline) {
        timeline.classList.add("painel-aba-ficha", "painel-aba-oculto");
        corrigirCoerenciaDistribuicao();
      }
    });

    observador.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(iniciar, 1200);
  });
})();
