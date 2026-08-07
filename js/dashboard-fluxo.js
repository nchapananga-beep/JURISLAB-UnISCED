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

  function botaoPorEtapa(etapa) {
    return document.querySelector('.botao-fluxo[data-etapa="' + etapa + '"]');
  }

  function botaoDisponivel(etapa) {
    const botao = botaoPorEtapa(etapa);
    if (!botao) return false;
    const estilo = window.getComputedStyle(botao);
    return !botao.hidden && estilo.display !== "none" && estilo.visibility !== "hidden";
  }

  function limparEstadosFluxo() {
    document.querySelectorAll(".botao-fluxo").forEach(function (botao) {
      botao.classList.remove(
        "botao-fluxo-recomendado",
        "botao-fluxo-concluido",
        "botao-fluxo-em-curso",
        "botao-fluxo-pendente"
      );
      botao.removeAttribute("aria-current");
      botao.querySelectorAll(".estado-etapa-fluxo").forEach(function (estado) {
        estado.remove();
      });
    });
  }

  function definirEstadoEtapa(etapa, estado, texto) {
    const botao = botaoPorEtapa(etapa);
    if (!botao || !botaoDisponivel(etapa)) return;

    botao.classList.remove(
      "botao-fluxo-concluido",
      "botao-fluxo-em-curso",
      "botao-fluxo-pendente"
    );

    if (estado === "concluido") {
      botao.classList.add("botao-fluxo-concluido");
    } else if (estado === "em-curso") {
      botao.classList.add("botao-fluxo-em-curso");
    } else if (estado === "pendente") {
      botao.classList.add("botao-fluxo-pendente");
    }

    let etiqueta = botao.querySelector(".estado-etapa-fluxo");
    if (!etiqueta) {
      etiqueta = document.createElement("span");
      etiqueta.className = "estado-etapa-fluxo";
      botao.appendChild(etiqueta);
    }
    etiqueta.textContent = texto;
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

  function obterPainelInteligente() {
    let painel = document.getElementById("painelFluxoInteligente");
    if (painel) return painel;

    const grelha = document.querySelector(".acoes-modulo-fluxo");
    if (!grelha) return null;

    painel = document.createElement("section");
    painel.id = "painelFluxoInteligente";
    painel.className = "painel-fluxo-inteligente";
    painel.setAttribute("aria-label", "Resumo inteligente do fluxo de trabalho");
    painel.innerHTML =
      '<div class="cabecalho-fluxo-inteligente">' +
        '<div><span class="rotulo-assistente">Assistente do sistema</span><strong id="tituloEstadoFluxo">A analisar o trabalho...</strong></div>' +
        '<span id="percentagemFluxo" class="percentagem-fluxo">0%</span>' +
      '</div>' +
      '<div class="barra-progresso-fluxo" aria-label="Progresso operacional"><span id="barraProgressoFluxo"></span></div>' +
      '<small id="descricaoProgressoFluxo" class="descricao-progresso-fluxo">A calcular o progresso operacional.</small>' +
      '<div id="metricasFluxo" class="metricas-fluxo"></div>';

    grelha.parentNode.insertBefore(painel, grelha);
    return painel;
  }

  function destacarEtapa(etapa, titulo, motivo, nivel) {
    const caixa = obterCaixaRecomendacao();
    const botao = botaoPorEtapa(etapa);

    document.querySelectorAll(".botao-fluxo-recomendado").forEach(function (elemento) {
      elemento.classList.remove("botao-fluxo-recomendado");
      elemento.removeAttribute("aria-current");
    });

    if (!caixa || !botao || !botaoDisponivel(etapa)) {
      if (caixa) caixa.hidden = true;
      return;
    }

    botao.classList.add("botao-fluxo-recomendado");
    botao.setAttribute("aria-current", "step");

    caixa.hidden = false;
    caixa.className =
      "recomendacao-fluxo " +
      (nivel === "urgente" ? "recomendacao-fluxo-urgente" : "");

    caixa.innerHTML =
      '<span class="recomendacao-rotulo">' +
        (nivel === "urgente" ? "Urgente · Próxima ação" : "Próxima ação") +
      '</span>' +
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

  function casoEncerrado(caso) {
    const estado = normalizarFluxo(caso.estadoCaso);
    return estado === "encerrado" || estado === "concluido" || estado === "arquivado";
  }

  function contarCasosSemResponsavel(casos) {
    if (!Array.isArray(casos)) return 0;
    return casos.filter(function (caso) {
      const responsavel = normalizarFluxo(caso.responsavel);
      const semResponsavel = !responsavel || responsavel === "nao atribuido";
      return !casoEncerrado(caso) && semResponsavel;
    }).length;
  }

  function contarCasosConcluidos(casos) {
    if (!Array.isArray(casos)) return 0;
    return casos.filter(casoEncerrado).length;
  }

  function contarConsultasAgendadas(consultas) {
    if (!Array.isArray(consultas)) return 0;
    return consultas.filter(function (consulta) {
      const estado = normalizarFluxo(consulta.estadoConsulta);
      return estado === "agendada" || estado === "confirmada";
    }).length;
  }

  function criarMetrica(rotulo, valor, tipo) {
    return (
      '<div class="metrica-fluxo ' + (tipo || "") + '">' +
        '<span>' + rotulo + '</span>' +
        '<strong>' + Number(valor || 0) + '</strong>' +
      '</div>'
    );
  }

  function actualizarPainelInteligente(dados) {
    const painel = obterPainelInteligente();
    if (!painel) return;

    const checkpoints = [
      dados.pedidosPorTratar === 0,
      dados.triagensPendentes === 0,
      dados.casosSemResponsavel === 0,
      dados.prazosVencidos === 0 && dados.prazosProximos === 0
    ];

    const concluidos = checkpoints.filter(Boolean).length;
    const percentagem = Math.round((concluidos / checkpoints.length) * 100);

    const barra = document.getElementById("barraProgressoFluxo");
    const percentual = document.getElementById("percentagemFluxo");
    const titulo = document.getElementById("tituloEstadoFluxo");
    const descricao = document.getElementById("descricaoProgressoFluxo");
    const metricas = document.getElementById("metricasFluxo");

    if (barra) barra.style.width = percentagem + "%";
    if (percentual) percentual.textContent = percentagem + "%";

    if (titulo) {
      if (dados.prazosVencidos > 0) {
        titulo.textContent = "Há uma situação urgente que requer atenção.";
      } else if (
        dados.pedidosPorTratar > 0 ||
        dados.triagensPendentes > 0 ||
        dados.casosSemResponsavel > 0 ||
        dados.prazosProximos > 0
      ) {
        titulo.textContent = "Há trabalho pendente no fluxo do Aconselha.";
      } else {
        titulo.textContent = "Os principais pontos de controlo estão em dia.";
      }
    }

    if (descricao) {
      descricao.textContent =
        concluidos + " de " + checkpoints.length +
        " pontos operacionais sem pendências detectadas.";
    }

    if (metricas) {
      metricas.innerHTML =
        criarMetrica("Pedidos por tratar", dados.pedidosPorTratar, dados.pedidosPorTratar ? "metrica-alerta" : "") +
        criarMetrica("Triagens pendentes", dados.triagensPendentes, dados.triagensPendentes ? "metrica-alerta" : "") +
        criarMetrica("Casos activos", dados.casosActivos, "") +
        criarMetrica("Casos concluídos", dados.casosConcluidos, "") +
        criarMetrica("Consultas agendadas", dados.consultasAgendadas, "") +
        criarMetrica("Prazos vencidos", dados.prazosVencidos, dados.prazosVencidos ? "metrica-urgente" : "");
    }
  }

  function aplicarEstadosEtapas(dados) {
    limparEstadosFluxo();

    if (botaoDisponivel(1)) {
      definirEstadoEtapa(
        1,
        dados.pedidosPorTratar === 0 ? "concluido" : "pendente",
        dados.pedidosPorTratar === 0 ? "Sem pendências" : "A tratar"
      );
    }

    if (botaoDisponivel(2)) {
      definirEstadoEtapa(
        2,
        dados.triagensPendentes === 0 ? "concluido" : "pendente",
        dados.triagensPendentes === 0 ? "Sem pendências" : "A tratar"
      );
    }

    if (botaoDisponivel(3)) {
      definirEstadoEtapa(
        3,
        dados.casosActivos > 0 ? "em-curso" : "concluido",
        dados.casosActivos > 0 ? "Em acompanhamento" : "Sem casos activos"
      );
    }

    if (botaoDisponivel(4)) {
      definirEstadoEtapa(
        4,
        dados.consultasAgendadas > 0 ? "em-curso" : "concluido",
        dados.consultasAgendadas > 0 ? "Agenda activa" : "Sem consultas pendentes"
      );
    }

    if (botaoDisponivel(5)) {
      definirEstadoEtapa(
        5,
        dados.casosSemResponsavel === 0 ? "concluido" : "pendente",
        dados.casosSemResponsavel === 0 ? "Distribuição em dia" : "A distribuir"
      );
    }

    if (botaoDisponivel(6)) {
      let estadoPrazo = "concluido";
      let textoPrazo = "Prazos em dia";
      if (dados.prazosVencidos > 0) {
        estadoPrazo = "pendente";
        textoPrazo = "Urgente";
      } else if (dados.prazosProximos > 0 || dados.prazosPendentes > 0) {
        estadoPrazo = "em-curso";
        textoPrazo = "Em acompanhamento";
      }
      definirEstadoEtapa(6, estadoPrazo, textoPrazo);
    }

    if (botaoDisponivel(7)) {
      definirEstadoEtapa(7, "em-curso", "Ferramenta de apoio");
    }

    if (botaoDisponivel(8)) {
      definirEstadoEtapa(8, "em-curso", "Fecho e análise");
    }
  }

  function decidirProximaAcao(dados) {
    if (dados.prazosVencidos > 0 && botaoDisponivel(6)) {
      destacarEtapa(
        6,
        "Controlo de Prazos",
        dados.prazosVencidos +
          (dados.prazosVencidos === 1
            ? " prazo vencido requer atenção imediata."
            : " prazos vencidos requerem atenção imediata."),
        "urgente"
      );
      return;
    }

    if (dados.pedidosPorTratar > 0 && botaoDisponivel(1)) {
      destacarEtapa(
        1,
        "Pedidos Públicos",
        dados.pedidosPorTratar +
          (dados.pedidosPorTratar === 1
            ? " pedido aguarda tratamento."
            : " pedidos aguardam tratamento."),
        "normal"
      );
      return;
    }

    if (dados.triagensPendentes > 0 && botaoDisponivel(2)) {
      destacarEtapa(
        2,
        "Gestão de Utentes e Triagens",
        dados.triagensPendentes +
          (dados.triagensPendentes === 1
            ? " triagem está pendente."
            : " triagens estão pendentes."),
        "normal"
      );
      return;
    }

    if (dados.casosSemResponsavel > 0 && botaoDisponivel(5)) {
      destacarEtapa(
        5,
        "Distribuição de Casos",
        dados.casosSemResponsavel +
          (dados.casosSemResponsavel === 1
            ? " caso ainda não tem responsável."
            : " casos ainda não têm responsável."),
        "normal"
      );
      return;
    }

    if (dados.prazosProximos > 0 && botaoDisponivel(6)) {
      destacarEtapa(
        6,
        "Controlo de Prazos",
        dados.prazosProximos +
          (dados.prazosProximos === 1
            ? " prazo vence nos próximos 7 dias."
            : " prazos vencem nos próximos 7 dias."),
        "normal"
      );
      return;
    }

    if (dados.consultasAgendadas > 0 && botaoDisponivel(4)) {
      destacarEtapa(
        4,
        "Agenda de Consultas",
        dados.consultasAgendadas +
          (dados.consultasAgendadas === 1
            ? " consulta está agendada e deve ser acompanhada."
            : " consultas estão agendadas e devem ser acompanhadas."),
        "normal"
      );
      return;
    }

    if (dados.casosActivos > 0 && botaoDisponivel(3)) {
      destacarEtapa(
        3,
        "Novo Atendimento",
        "Existem casos activos. Verifique se algum necessita de novo atendimento ou acompanhamento.",
        "normal"
      );
      return;
    }

    if (botaoDisponivel(8)) {
      destacarEtapa(
        8,
        "Relatórios e Estatísticas",
        "Os principais pontos operacionais estão em dia. Pode rever resultados e indicadores.",
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

  async function carregarFluxoInteligente() {
    const token = localStorage.getItem(CHAVE_SESSAO_FLUXO);
    const grelha = document.querySelector(".acoes-modulo-fluxo");
    if (!token || !grelha) return;

    const utilizador = obterUtilizadorFluxo() || {};
    const perfil = normalizarFluxo(utilizador.perfil);

    const consultasApi = [
      chamarApi({ acao: "obterResumoPainel", token: token })
    ];

    if (perfil !== "estudante") {
      consultasApi.push(
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
        chamarApi({ acao: "obterResumoPrazosPainel", token: token }),
        chamarApi({
          acao: "listarConsultas",
          token: token,
          pesquisa: "",
          estado: "Todos"
        })
      );
    }

    const resultados = await Promise.allSettled(consultasApi);

    const resumoResultado =
      resultados[0] && resultados[0].status === "fulfilled"
        ? resultados[0].value
        : null;
    const resumo =
      resumoResultado && resumoResultado.sucesso
        ? resumoResultado.resumo || {}
        : {};

    const dados = {
      pedidosPorTratar: 0,
      triagensPendentes: Number(resumo.triagensPendentes || 0),
      casosActivos: Number(resumo.casosActivos || 0),
      casosSemResponsavel: 0,
      casosConcluidos: 0,
      consultasAgendadas: 0,
      prazosPendentes: 0,
      prazosProximos: 0,
      prazosVencidos: 0
    };

    if (perfil !== "estudante") {
      const pedidosResultado =
        resultados[1] && resultados[1].status === "fulfilled"
          ? resultados[1].value
          : null;
      const casosResultado =
        resultados[2] && resultados[2].status === "fulfilled"
          ? resultados[2].value
          : null;
      const prazosResultado =
        resultados[3] && resultados[3].status === "fulfilled"
          ? resultados[3].value
          : null;
      const consultasResultado =
        resultados[4] && resultados[4].status === "fulfilled"
          ? resultados[4].value
          : null;

      if (pedidosResultado && pedidosResultado.sucesso) {
        dados.pedidosPorTratar = contarPedidosPorTratar(
          pedidosResultado.pedidos || []
        );
      }

      if (casosResultado && casosResultado.sucesso) {
        const casos = casosResultado.casos || [];
        dados.casosSemResponsavel = contarCasosSemResponsavel(casos);
        dados.casosConcluidos = contarCasosConcluidos(casos);
      }

      if (prazosResultado && prazosResultado.sucesso) {
        dados.prazosPendentes = Number(prazosResultado.pendentes || 0);
        dados.prazosProximos = Number(prazosResultado.proximos || 0);
        dados.prazosVencidos = Number(prazosResultado.vencidos || 0);
      }

      if (consultasResultado && consultasResultado.sucesso) {
        dados.consultasAgendadas = contarConsultasAgendadas(
          consultasResultado.consultas || []
        );
      }
    }

    aplicarEstadosEtapas(dados);
    actualizarPainelInteligente(dados);
    decidirProximaAcao(dados);
  }

  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(function () {
      carregarFluxoInteligente().catch(function (erro) {
        console.warn("Não foi possível calcular o fluxo inteligente.", erro);
      });
    }, 900);
  });
})();
