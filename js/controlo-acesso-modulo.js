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

  function redireccionarPainel() {
    document.documentElement.style.visibility = "hidden";
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
    document.querySelectorAll(
      "a, button, [role='button'], input[type='submit'], input[type='button']"
    ).forEach((elemento) => {
      const texto = normalizar(
        elemento.textContent || elemento.value || elemento.getAttribute("aria-label")
      );
      const ligacao = normalizar(elemento.getAttribute("href"));

      if (expressoes.some((expressao) => texto.includes(expressao) || ligacao.includes(expressao))) {
        ocultarElemento(elemento);
      }
    });
  }

  function paginaActual() {
    return normalizar(window.location.pathname.split("/").pop() || "");
  }

  function paginaBloqueadaParaPerfil(perfil) {
    const pagina = paginaActual();

    const reservadasComuns = [
      "aconselha.html",
      "triagem.html",
      "triagens-pendentes.html",
      "pedidos-publicos.html",
      "relatorios.html"
    ];

    if (
      ["estudante", "estudante conselheiro"].includes(perfil) &&
      reservadasComuns.includes(pagina)
    ) {
      return true;
    }

    const reservadasAoEstudante = [
      "consultas.html",
      "prazos.html",
      "distribuicao-casos.html",
      "encaminhamentos.html"
    ];

    return perfil === "estudante" && reservadasAoEstudante.includes(pagina);
  }

  function aplicarInterfacePorPerfil(utilizador) {
    const perfil = normalizar(utilizador.perfil);

    if (paginaBloqueadaParaPerfil(perfil)) {
      redireccionarPainel();
      return;
    }

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

  function obterUtilizadorLocal() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_UTILIZADOR) || "null");
    } catch (erro) {
      return null;
    }
  }

  function autorizarPagina(utilizador, moduloPretendido, apenasAdministrador) {
    const perfil = normalizar(utilizador.perfil);
    const modulo = normalizar(
      utilizador.moduloPrincipal || utilizador.Modulo_Principal
    );
    const pretendido = normalizar(moduloPretendido);
    const administrador = perfil === "administrador";

    if (apenasAdministrador && !administrador) return false;

    return (
      administrador ||
      modulo === "todos" ||
      !pretendido ||
      modulo === pretendido
    );
  }

  function concluirAutorizacao(utilizador, moduloPretendido) {
    aplicarInterfacePorPerfil(utilizador);

    if (document.documentElement.style.visibility === "hidden") return;

    observarInterface(utilizador);
    document.documentElement.style.visibility = "visible";
    window.dispatchEvent(new CustomEvent("jurislab:AcessoAutorizado", {
      detail: { utilizador, modulo: moduloPretendido }
    }));
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

      if (!autorizarPagina(utilizador, moduloPretendido, apenasAdministrador)) {
        redireccionarPainel();
        return;
      }

      concluirAutorizacao(utilizador, moduloPretendido);
    } catch (erro) {
      console.warn("Validação remota indisponível; será usada a sessão local.", erro);

      const utilizadorLocal = obterUtilizadorLocal();

      if (!utilizadorLocal) {
        document.documentElement.style.visibility = "visible";
        document.body.innerHTML =
          '<main style="font-family:Arial,sans-serif;padding:32px;text-align:center">' +
          '<h1>Não foi possível validar a sessão</h1>' +
          '<p>Verifique a ligação à Internet e actualize a página.</p>' +
          '<p><a href="dashboard.html">Voltar ao painel</a></p>' +
          '</main>';
        return;
      }

      if (!autorizarPagina(utilizadorLocal, moduloPretendido, apenasAdministrador)) {
        redireccionarPainel();
        return;
      }

      concluirAutorizacao(utilizadorLocal, moduloPretendido);
    }
  }

  document.documentElement.style.visibility = "hidden";
  verificarAcesso();
})();