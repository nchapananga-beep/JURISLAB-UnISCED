document.addEventListener("DOMContentLoaded", function () {
  const parametros = new URLSearchParams(window.location.search);
  const idTriagem = String(parametros.get("idTriagem") || "").trim();

  if (!idTriagem) return;

  const campoPesquisa = document.getElementById("campoPesquisa");
  const filtroEstado = document.getElementById("filtroEstado");
  const formFiltros = document.getElementById("formFiltros");
  const listaTriagens = document.getElementById("listaTriagens");

  if (!campoPesquisa || !filtroEstado || !formFiltros || !listaTriagens) return;

  campoPesquisa.value = idTriagem;
  filtroEstado.value = "Todos";

  let abriu = false;

  function tentarAbrirTriagem() {
    if (abriu) return;

    const cartoes = Array.from(
      listaTriagens.querySelectorAll(".triagem-cartao")
    );

    const cartao = cartoes.find(function (elemento) {
      return elemento.textContent.includes(idTriagem);
    });

    if (!cartao) return;

    const botaoAbrirCaso = cartao.querySelector(
      "button[data-indice]"
    );

    if (botaoAbrirCaso) {
      abriu = true;
      cartao.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
      botaoAbrirCaso.click();
    }
  }

  const observador = new MutationObserver(tentarAbrirTriagem);
  observador.observe(listaTriagens, {
    childList: true,
    subtree: true
  });

  formFiltros.requestSubmit();
  tentarAbrirTriagem();

  window.setTimeout(function () {
    observador.disconnect();
  }, 15000);
});
