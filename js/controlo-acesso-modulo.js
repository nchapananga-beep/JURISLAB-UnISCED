(() => {
  "use strict";

  const API_JURISLAB = "https://script.google.com/macros/s/AKfycbyFzl8x8Kazn2ek0j5N8qF0f5beYNOSrNSfxx837FEF0do_gF3lzW3Z1UCvo9eeTROB/exec";
  const CHAVE_SESSAO = "JURISLAB_TOKEN";
  const CHAVE_UTILIZADOR = "JURISLAB_UTILIZADOR";

  function normalizar(valor) {
    return String(valor || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function limparSessao() {
    localStorage.removeItem(CHAVE_SESSAO);
    localStorage.removeItem(CHAVE_UTILIZADOR);
  }

  function bloquear(mensagem) {
    document.documentElement.style.visibility = "hidden";
    alert(mensagem);
    window.location.replace("dashboard.html");
  }

  async function validarSessao(token) {
    const url = API_JURISLAB + "?acao=validarSessao&token=" + encodeURIComponent(token);
    const resposta = await fetch(url, { method: "GET", cache: "no-store" });
    if (!resposta.ok) throw new Error("Não foi possível validar a sessão.");
    return resposta.json();
  }

  function ocultarElemento(elemento) {
    if (!elemento) return;

    const alvo = elemento.closest(
      "a, button, [role='button'], input[type='submit'], input[type='button'], li"
    ) || elemento;

    alvo.hidden = true;
    alvo.setAttribute("aria-hidden", "true");
    alvo.setAttribute("tabindex", "-1");
    alvo.style.setProperty("display", "none", "important");
    alvo.style.setProperty("visibility", "hidden", "important");
    alvo.style.setProperty("pointer-events", "none", "important");
  }

  function ocultarPorTextoOuLigacao(expressoes) {
    const elementos = document.querySelectorAll(
      "a, button, [role='button'], input[type='submit'], input[type='button']"
    );

    elementos.forEach((elemento) => {
      const texto = normalizar(
        elemento.textContent || elemento.value || elemento.getAttribute("aria-label")
      );
      const ligacao = normalizar(elemento.getAttribute("href"));

      if (expressoes.some((expressao) => texto.includes(expressao) || ligacao.includes(expressao))) {
        ocultarElemento(elemento);
      }
    });
  }

  function bloquearPaginaPorPerfil(perfil) {
    const pagina = normalizar(
      window.location.pathname.split("/").pop() || ""
    );

    const estudanteOuConselheiro = [
      "estudante",
      "estudante conselheiro"
    ].includes(perfil);

    if (!estudanteOuConselheiro) return false;

    const paginasReservadas = [
      "aconselha.html",
      "triagem.html",
      "triagens-pendentes.html",
      "pedidos-publicos.html",
      "relatorios.html"
    ];

    if (paginasReservadas.includes(pagina)) {
      bloquear(
        "Esta página é reservada à equipa responsável pela triagem e gestão institucional."
      );
      return true;
    }

    return false;
  }

  function aplicarInterfacePorPerfil(utilizador) {
    const perfil = normalizar(utilizador.perfil);

    if (bloquearPaginaPorPerfil(perfil)) return;

    if (perfil === "estudante conselheiro") {
      ocultarPorTextoOuLigacao([
        "atribuir equipa",
        "atribuir novo caso",
        "registar novo utente",
        "registar utente",
        "novo utente",
        "guardar utente",
        "ver triagens",
        "nova triagem",
        "abrir triagem",
        "triagens pendentes",
        "pedidos publicos",
        "relatorios e estatisticas",
        "exportar para pdf",
        "imprimir relatorio",
        "encerrar caso",
        "arquivar caso",
        "reabrir caso",
        "finalizar atribuicao",
        "arquivar documento",
        "validar encaminhamento"
      ]);
    }

    if (perfil === "estudante") {
      ocultarPorTextoOuLigacao([
        "atribuir equipa",
        "atribuir novo caso",
        "registar novo utente",
        "registar utente",
        "novo utente",
        "guardar utente",
        "ver triagens",
        "nova triagem",
        "abrir triagem",
        "triagens pendentes",
        "pedidos publicos",
        "relatorios e estatisticas",
        "exportar para pdf",
        "imprimir relatorio",
        "registar novo prazo",
        "marcar nova consulta",
        "registar atendimento",
        "novo atendimento",
        "anexar documento",
        "registar documento",
        "encaminhar",
        "encerrar caso",
        "arquivar caso",
        "reabrir caso",
        "finalizar atribuicao",
        "arquivar documento",
        "validar encaminhamento"
      ]);
    }
  }

  function observarInterface(utilizador) {
    let agendado = false;

    const reaplicar = () => {
      if (agendado) return;
      agendado = true;

      window.requestAnimationFrame(() => {
        agendado = false;
        aplicarInterfacePorPerfil(utilizador);
      });
    };

    const observador = new MutationObserver(reaplicar);
    observador.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden"]
    });

    reaplicar();
    window.setTimeout(reaplicar, 300);
    window.setTimeout(reaplicar, 1000);
    window.setTimeout(reaplicar, 2500);
  }

  async function verificarAcesso() {
    const scriptActual = document.currentScript;
    const moduloPretendido = scriptActual?.dataset?.modulo || "";
    const apenasAdministrador = scriptActual?.dataset?.administrador === "true";
    const token = localStorage.getItem(CHAVE_SESSAO);

    if (!token) {
      limparSessao();
      window.location.replace("login.html");
      return;
    }

    try {
      const resultado = await validarSessao(token);
      if (!resultado.sucesso || !resultado.valida || !resultado.utilizador) {
        limparSessao();
        window.location.replace("login.html");
        return;
      }

      const utilizador = resultado.utilizador;
      localStorage.setItem(CHAVE_UTILIZADOR, JSON.stringify(utilizador));

      const perfil = normalizar(utilizador.perfil);
      const modulo = normalizar(
        utilizador.moduloPrincipal || utilizador.Modulo_Principal
      );
      const pretendido = normalizar(moduloPretendido);
      const administrador = perfil === "administrador";

      if (apenasAdministrador && !administrador) {
        bloquear("Esta área é reservada aos administradores.");
        return;
      }

      const autorizado =
        administrador ||
        modulo === "todos" ||
        !pretendido ||
        modulo === pretendido;

      if (!autorizado) {
        bloquear("Não tem autorização para aceder a este módulo.");
        return;
      }

      aplicarInterfacePorPerfil(utilizador);
      observarInterface(utilizador);

      document.documentElement.style.visibility = "visible";
      window.dispatchEvent(new CustomEvent("jurislab:AcessoAutorizado", {
        detail: { utilizador, modulo: moduloPretendido }
      }));
    } catch (erro) {
      console.error(erro);
      limparSessao();
      window.location.replace("login.html");
    }
  }

  document.documentElement.style.visibility = "hidden";
  verificarAcesso();
})();
