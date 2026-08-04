(() => {
  "use strict";

  const CHAVE_UTILIZADOR = "JURISLAB_UTILIZADOR";

  function normalizar(valor) {
    return String(valor || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function obterUtilizador() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_UTILIZADOR) || "null");
    } catch (erro) {
      return null;
    }
  }

  function removerElemento(elemento) {
    if (elemento && elemento.parentNode) {
      elemento.parentNode.removeChild(elemento);
    }
  }

  function aplicarRestricoes() {
    const utilizador = obterUtilizador();
    const perfil = normalizar(utilizador && utilizador.perfil);

    if (perfil !== "estudante") return;

    removerElemento(document.querySelector(".alertas-prazos"));

    [
      "indicadorCasosSemResponsavel",
      "indicadorTriagensPendentes",
      "indicadorEncaminhamentos",
      "indicadorUtentes"
    ].forEach((id) => {
      removerElemento(document.getElementById(id)?.closest("a"));
    });

    document.querySelectorAll("[data-modulo]").forEach((cartao) => {
      const modulo = normalizar(cartao.dataset.modulo);
      if (modulo !== "jurislab aconselha") {
        removerElemento(cartao);
      }
    });

    document.querySelectorAll('[data-administracao="true"]').forEach(removerElemento);

    const proibidas = [
      "aconselha.html",
      "pedidos-publicos.html",
      "gestao-aconselha.html",
      "consultas.html",
      "prazos.html",
      "distribuicao-casos.html",
      "relatorios.html",
      "encaminhamentos.html"
    ];

    document.querySelectorAll("a[href]").forEach((ligacao) => {
      const href = normalizar(ligacao.getAttribute("href"));
      if (proibidas.some((pagina) => href.includes(pagina))) {
        removerElemento(ligacao);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", aplicarRestricoes);
  window.addEventListener("load", aplicarRestricoes);
  window.addEventListener("pageshow", aplicarRestricoes);
  window.addEventListener("storage", aplicarRestricoes);

  const observador = new MutationObserver(aplicarRestricoes);
  observador.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  setTimeout(aplicarRestricoes, 200);
  setTimeout(aplicarRestricoes, 800);
  setTimeout(aplicarRestricoes, 2000);
})();