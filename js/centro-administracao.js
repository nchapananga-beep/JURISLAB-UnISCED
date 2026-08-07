(() => {
  "use strict";

  const API_JURISLAB = "https://script.google.com/macros/s/AKfycbyFzl8x8Kazn2ek0j5N8qF0f5beYNOSrNSfxx837FEF0do_gF3lzW3Z1UCvo9eeTROB/exec";
  const CHAVE_SESSAO = "JURISLAB_TOKEN";

  const $ = id => document.getElementById(id);

  function normalizar(valor) {
    return String(valor || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  async function chamarApi(dados) {
    const resposta = await fetch(API_JURISLAB, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(dados)
    });

    if (!resposta.ok) {
      throw new Error("Falha de comunicação com a API.");
    }

    return resposta.json();
  }

  async function validarSessao(token) {
    const resposta = await fetch(
      API_JURISLAB + "?acao=validarSessao&token=" + encodeURIComponent(token)
    );

    if (!resposta.ok) {
      throw new Error("Não foi possível validar a sessão.");
    }

    return resposta.json();
  }

  function definirEstado(cartaoId, textoId, detalheId, estado, texto, detalhe) {
    const cartao = $(cartaoId);
    if (cartao) {
      cartao.classList.remove("ok", "aviso", "erro");
      if (estado) cartao.classList.add(estado);
    }
    if ($(textoId)) $(textoId).textContent = texto;
    if ($(detalheId)) $(detalheId).textContent = detalhe;
  }

  async function executarDiagnostico(token, sessaoInicial) {
    const inicio = performance.now();
    $("mensagemDiagnostico").textContent = "A executar diagnóstico...";
    $("estadoGeral").textContent = "Diagnóstico em curso";

    try {
      const perfil = normalizar(sessaoInicial?.utilizador?.perfil);
      if (perfil !== "administrador") {
        throw new Error("Apenas administradores podem aceder ao Centro de Administração.");
      }

      definirEstado(
        "cartaoSessao",
        "saudeSessao",
        "detalheSessao",
        "ok",
        "Operacional",
        "Sessão administrativa válida."
      );

      const resultados = await Promise.allSettled([
        chamarApi({ acao: "obterResumoPainel", token }),
        chamarApi({ acao: "obterResumoPrazosPainel", token }),
        chamarApi({ acao: "listarAuditoria", token, pesquisa: "", modulo: "Todos", resultado: "Todos" })
      ]);

      const resumo = resultados[0].status === "fulfilled" ? resultados[0].value : null;
      const prazos = resultados[1].status === "fulfilled" ? resultados[1].value : null;
      const auditoria = resultados[2].status === "fulfilled" ? resultados[2].value : null;

      if (resumo?.sucesso) {
        definirEstado(
          "cartaoApi",
          "saudeApi",
          "detalheApi",
          "ok",
          "Online",
          "A API respondeu correctamente às leituras principais."
        );

        const r = resumo.resumo || {};
        definirEstado(
          "cartaoDados",
          "saudeDados",
          "detalheDados",
          "ok",
          "Disponíveis",
          `${Number(r.casosActivos || 0)} casos activos e ${Number(r.triagensPendentes || 0)} triagens pendentes.`
        );
      } else {
        definirEstado(
          "cartaoApi",
          "saudeApi",
          "detalheApi",
          "erro",
          "Falha",
          "A leitura principal da API não foi concluída."
        );
        definirEstado(
          "cartaoDados",
          "saudeDados",
          "detalheDados",
          "erro",
          "Indisponíveis",
          "Não foi possível ler o resumo operacional."
        );
      }

      if (prazos?.sucesso) {
        const vencidos = Number(prazos.vencidos || 0);
        const proximos = Number(prazos.proximos || 0);
        definirEstado(
          "cartaoPrazos",
          "saudePrazos",
          "detalhePrazos",
          vencidos > 0 ? "aviso" : "ok",
          vencidos > 0 ? "Requer atenção" : "Em ordem",
          vencidos > 0
            ? `${vencidos} prazo${vencidos === 1 ? " vencido" : "s vencidos"}; ${proximos} próximo${proximos === 1 ? "" : "s"}.`
            : `${proximos} prazo${proximos === 1 ? " próximo" : "s próximos"}.`
        );
      } else {
        definirEstado(
          "cartaoPrazos",
          "saudePrazos",
          "detalhePrazos",
          "erro",
          "Não verificado",
          "A leitura dos prazos não foi concluída."
        );
      }

      const auditoriaOk = Boolean(auditoria?.sucesso);
      const falhas = [resumo?.sucesso, prazos?.sucesso, auditoriaOk].filter(v => !v).length;
      const duracao = Math.round(performance.now() - inicio);

      if (falhas === 0) {
        $("estadoGeral").textContent = "Sistema operacional";
        $("mensagemDiagnostico").textContent = `Diagnóstico concluído sem falhas em ${duracao} ms.`;
        $("mensagemDiagnostico").className = "mensagem-formulario sucesso";
      } else {
        $("estadoGeral").textContent = "Atenção necessária";
        $("mensagemDiagnostico").textContent = `Diagnóstico concluído com ${falhas} verificação(ões) incompleta(s).`;
        $("mensagemDiagnostico").className = "mensagem-formulario erro";
      }
    } catch (erro) {
      $("estadoGeral").textContent = "Falha de diagnóstico";
      $("mensagemDiagnostico").textContent = erro.message || "Não foi possível executar o diagnóstico.";
      $("mensagemDiagnostico").className = "mensagem-formulario erro";
      definirEstado("cartaoApi", "saudeApi", "detalheApi", "erro", "Falha", "Não foi possível concluir as verificações.");
    }
  }

  document.addEventListener("DOMContentLoaded", async function () {
    const token = localStorage.getItem(CHAVE_SESSAO);

    if (!token) {
      location.href = "login.html";
      return;
    }

    try {
      const sessao = await validarSessao(token);
      const perfil = normalizar(sessao?.utilizador?.perfil);

      if (!sessao?.sucesso || !sessao?.valida || perfil !== "administrador") {
        location.href = "dashboard.html";
        return;
      }

      $("ecraValidacao").classList.add("oculto");
      await executarDiagnostico(token, sessao);

      $("btnActualizarSaude").addEventListener("click", function () {
        executarDiagnostico(token, sessao);
      });
    } catch (erro) {
      location.href = "login.html";
    }
  });
})();
