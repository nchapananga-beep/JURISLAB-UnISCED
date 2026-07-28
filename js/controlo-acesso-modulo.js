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
