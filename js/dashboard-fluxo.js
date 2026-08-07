(() => {
  "use strict";

  const CHAVE_SESSAO_FLUXO = "JURISLAB_TOKEN";
  const CHAVE_UTILIZADOR_FLUXO = "JURISLAB_UTILIZADOR";

  function normalizarFluxo(valor) {
    return String(valor || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function obterUtilizadorFluxo() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_UTILIZADOR_FLUXO) || "null");
    } catch (erro) {
      return null;
    }
  }

  function botaoDisponivel(etapa) {
    const botao = document.querySelector('.botao-fluxo[data-etapa="' + etapa + '"]');
    if (!botao) return false;
    const estilo = window.getComputedStyle(botao);
    return !botao.hidden && estilo.display !== "none" && estilo.visibility !== "hidden";
  }

  function limparDestaqueFluxo() {
    document.querySelectorAll(".botao-fluxo-recomendado").forEach(function (botao) {
      botao.classList.remove("botao-fluxo-recomendado");
      botao.removeAttribute("aria-current");
    });
  }

  function obterCaixaRecomendacao() {
    let caixa = document.getElementById("recomendacaoFluxo");
    if (caixa) return caixa;

    const grelha = document.querySelector(".acoes-modulo-fluxo");
    if (!grelha) return null;

    caixa = document.createElement("div");
    caixa.id = "recomendacaoFluxo";
    caixa.className = "recomendacao-fluxo";
    caixa.setAttribute("role", "status");
    caixa.setAttribute("aria-live", "polite");
    grelha.parentNode.insertBefore(caixa, grelha);
    return caixa;
  }

  function destacarEtapa(etapa, titulo, motivo, nivel) {
    limparDestaqueFluxo();

    const caixa = obterCaixaRecomendacao();
    const botao = document.querySelector('.botao-fluxo[data-etapa="' + etapa + '"]');

    if (!caixa || !botao || !botaoDisponivel(etapa)) {
      if (caixa) caixa.hidden = true;
      return;
    }

    botao.classList.add("botao-fluxo-recomendado");
    botao.setAttribute("aria-current", "step");

    caixa.hidden = false;
    caixa.className = "recomendacao-fluxo " + (nivel === "urgente" ? "recomendacao-fluxo-urgente" : "");
    caixa.innerHTML =
      '<span class="recomendacao-rotulo">Próximo passo recomendado</span>' +
      '<strong>' + titulo + '</strong>' +
      '<small>' + motivo + '</small>';
  }

  function contarPedidosPorTratar(pedidos) {
    if (!Array.isArray(pedidos)) return 0;

    return pedidos.filter(function (pedido) {
      const estado = normalizarFluxo(pedido.estadoPedido);
      return estado === "pendente" || estado === "em analise" || estado === "aceite";
    }).length;
  }

  function contarCasosSemResponsavel(casos) {
    if (!Array.isArray(casos)) return 0;

    return casos.filter(function (caso) {
      const estado = normalizarFluxo(caso.estadoCaso);
      const responsavel = normalizarFluxo(caso.responsavel);
      const encerrado = estado === "encerrado" || estado === "concluido" || estado === "arquivado";
      const semResponsavel = !responsavel || responsavel === "nao atribuido";
      return !encerrado && semResponsavel;
    }).length;
  }

  async function carregarRecomendacaoFluxo() {
    const token = localStorage.getItem(CHAVE_SESSAO_FLUXO);
    const grelha = document.querySelector(".acoes-modulo-fluxo");
    if (!token || !grelha) return;

    const utilizador = obterUtilizadorFluxo() || {};
    const perfil = normalizarFluxo(utilizador.perfil);

    const consultas = [
      chamarApi({
        acao: "obterResumoPainel",
        token: token
      })
    ];

    if (perfil !== "estudante") {
      consultas.push(
        chamarApi({
          acao: "listarPedidosPublicos",
          token: token,
          pesquisa: "",
          estado: "Todos"
        }),
        chamarApi({
          acao: "listarCasos",
          token: token,
          pesquisa: "",
          estado: "Todos"
        }),
        chamarApi({
          acao: "obterResumoPrazosPainel",
          token: token
        })
      );
    }

    const resultados = await Promise.allSettled(consultas);

    const resumoResultado = resultados[0] && resultados[0].status === "fulfilled"
      ? resultados[0].value
      : null;

    const resumo = resumoResultado && resumoResultado.sucesso
      ? (resumoResultado.resumo || {})
      : {};

    let pedidosPorTratar = 0;
    let casosSemResponsavel = 0;
    let prazosVencidos = 0;
    let prazosProximos = 0;

    if (perfil !== "estudante") {
      const pedidosResultado = resultados[1] && resultados[1].status === "fulfilled"
        ? resultados[1].value
        : null;
      const casosResultado = resultados[2] && resultados[2].status === "fulfilled"
        ? resultados[2].value
        : null;
      const prazosResultado = resultados[3] && resultados[3].status === "fulfilled"
        ? resultados[3].value
        : null;

      if (pedidosResultado && pedidosResultado.sucesso) {
        pedidosPorTratar = contarPedidosPorTratar(pedidosResultado.pedidos || []);
      }

      if (casosResultado && casosResultado.sucesso) {
        casosSemResponsavel = contarCasosSemResponsavel(casosResultado.casos || []);
      }

      if (prazosResultado && prazosResultado.sucesso) {
        prazosVencidos = Number(prazosResultado.vencidos || 0);
        prazosProximos = Number(prazosResultado.proximos || 0);
      }
    }

    const triagensPendentes = Number(resumo.triagensPendentes || 0);
    const casosActivos = Number(resumo.casosActivos || 0);

    /*
     * Prioridade operacional:
     * 1. Prazos vencidos, por serem urgentes.
     * 2. Pedidos públicos ainda por tratar.
     * 3. Triagens pendentes.
     * 4. Casos sem responsável.
     * 5. Prazos próximos.
     * 6. Casos activos que podem exigir atendimento.
     * 7. Sem pendências: iniciar pelo começo do fluxo.
     */
    if (prazosVencidos > 0 && botaoDisponivel(6)) {
      destacarEtapa(
        6,
        "Controlo de Prazos",
        prazosVencidos + (prazosVencidos === 1 ? " prazo vencido requer atenção imediata." : " prazos vencidos requerem atenção imediata."),
        "urgente"
      );
      return;
    }

    if (pedidosPorTratar > 0 && botaoDisponivel(1)) {
      destacarEtapa(
        1,
        "Pedidos Públicos",
        pedidosPorTratar + (pedidosPorTratar === 1 ? " pedido aguarda tratamento." : " pedidos aguardam tratamento."),
        "normal"
      );
      return;
    }

    if (triagensPendentes > 0 && botaoDisponivel(2)) {
      destacarEtapa(
        2,
        "Gestão de Utentes e Triagens",
        triagensPendentes + (triagensPendentes === 1 ? " triagem está pendente." : " triagens estão pendentes."),
        "normal"
      );
      return;
    }

    if (casosSemResponsavel > 0 && botaoDisponivel(5)) {
      destacarEtapa(
        5,
        "Distribuição de Casos",
        casosSemResponsavel + (casosSemResponsavel === 1 ? " caso ainda não tem responsável." : " casos ainda não têm responsável."),
        "normal"
      );
      return;
    }

    if (prazosProximos > 0 && botaoDisponivel(6)) {
      destacarEtapa(
        6,
        "Controlo de Prazos",
        prazosProximos + (prazosProximos === 1 ? " prazo vence nos próximos 7 dias." : " prazos vencem nos próximos 7 dias."),
        "normal"
      );
      return;
    }

    if (casosActivos > 0 && botaoDisponivel(3)) {
      destacarEtapa(
        3,
        "Novo Atendimento",
        "Existem casos activos. Verifique se algum necessita de novo atendimento ou acompanhamento.",
        "normal"
      );
      return;
    }

    if (botaoDisponivel(1)) {
      destacarEtapa(
        1,
        "Pedidos Públicos",
        "Não foram detectadas pendências prioritárias. Pode começar pelo início do fluxo.",
        "normal"
      );
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(function () {
      carregarRecomendacaoFluxo().catch(function (erro) {
        console.warn("Não foi possível calcular o próximo passo recomendado.", erro);
      });
    }, 900);
  });
})();
