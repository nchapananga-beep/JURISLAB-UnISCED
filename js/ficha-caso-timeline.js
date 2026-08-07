(() => {
  "use strict";

  const API_TIMELINE = "https://script.google.com/macros/s/AKfycbyFzl8x8Kazn2ek0j5N8qF0f5beYNOSrNSfxx837FEF0do_gF3lzW3Z1UCvo9eeTROB/exec";
  const CHAVE_TOKEN_TIMELINE = "JURISLAB_TOKEN";

  function normalizar(valor) {
    return String(valor || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function esc(valor) {
    return String(valor || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function chamarApiTimeline(dados) {
    const resposta = await fetch(API_TIMELINE, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(dados)
    });

    if (!resposta.ok) {
      throw new Error("Não foi possível carregar a linha temporal.");
    }

    return resposta.json();
  }

  function casoEncerrado(caso) {
    const estado = normalizar(caso && caso.estadoCaso);
    return ["encerrado", "concluido", "arquivado"].includes(estado);
  }

  function prazoCumprido(prazo) {
    const estado = normalizar(
      prazo.situacao || prazo.estadoPrazo || prazo.estado || ""
    );

    return ["cumprido", "concluido", "encerrado", "resolvido"].includes(estado);
  }

  function encaminhamentoConcluido(item) {
    const estado = normalizar(
      item.estadoEncaminhamento || item.estado || ""
    );

    return ["concluido", "encerrado", "finalizado", "resolvido"].includes(estado);
  }

  function atribuicaoActiva(item) {
    const estado = normalizar(item.estadoAtribuicao || item.estado || "");
    return !["cancelada", "cancelado", "inactiva", "inativo", "encerrada"].includes(estado);
  }

  function obterData(item, campos) {
    for (const campo of campos) {
      if (item && item[campo]) return String(item[campo]);
    }
    return "";
  }

  function criarEstrutura() {
    if (document.getElementById("painelTimelineCaso")) return;

    const resumo = document.getElementById("resumoCaso");
    if (!resumo || !resumo.parentNode) return;

    const painel = document.createElement("section");
    painel.id = "painelTimelineCaso";
    painel.className = "painel-timeline-caso";
    painel.innerHTML = `
      <div class="timeline-cabecalho">
        <div>
          <p class="etiqueta">Acompanhamento inteligente</p>
          <h2>Linha temporal do caso</h2>
          <p id="estadoTimelineCaso">A analisar o histórico do caso...</p>
        </div>
        <div class="timeline-progresso-numero" id="percentagemTimelineCaso">0%</div>
      </div>

      <div class="barra-caso" aria-label="Progresso de acompanhamento do caso">
        <div id="barraTimelineCaso" class="barra-caso-preenchimento"></div>
      </div>

      <div id="proximaAccaoTimeline" class="proxima-accao-caso" role="status" aria-live="polite"></div>

      <div id="timelineCaso" class="timeline-caso"></div>
    `;

    resumo.parentNode.insertBefore(painel, resumo.nextSibling);
  }

  function definirEtapa(titulo, estado, detalhe, data, opcional) {
    return {
      titulo,
      estado,
      detalhe: detalhe || "",
      data: data || "",
      opcional: Boolean(opcional)
    };
  }

  function construirEtapas(caso, atendimentos, consultas, prazos, encaminhamentos, atribuicoes) {
    const encerrado = casoEncerrado(caso);
    const temAtendimento = atendimentos.length > 0;
    const temConsulta = consultas.length > 0;
    const atribuicoesActivas = atribuicoes.filter(atribuicaoActiva);
    const temDistribuicao = atribuicoesActivas.length > 0 || Boolean(String(caso.responsavel || "").trim());

    const prazosCumpridos = prazos.filter(prazoCumprido).length;
    const todosPrazosCumpridos = prazos.length > 0 && prazosCumpridos === prazos.length;

    const encaminhamentosConcluidos = encaminhamentos.filter(encaminhamentoConcluido).length;
    const todosEncaminhamentosConcluidos = encaminhamentos.length > 0 && encaminhamentosConcluidos === encaminhamentos.length;

    const etapas = [];

    etapas.push(definirEtapa(
      "Caso aberto",
      "concluido",
      caso.idTriagem ? "Caso criado a partir da triagem " + caso.idTriagem + "." : "Caso registado no JURISLAB.",
      caso.dataAbertura || ""
    ));

    etapas.push(definirEtapa(
      "Atendimento jurídico",
      temAtendimento ? "concluido" : (encerrado ? "pendente" : "proxima"),
      temAtendimento
        ? atendimentos.length + (atendimentos.length === 1 ? " atendimento registado." : " atendimentos registados.")
        : "Ainda não existe atendimento registado neste caso.",
      temAtendimento ? obterData(atendimentos[atendimentos.length - 1], ["dataAtendimento", "dataRegisto", "dataHora"]) : ""
    ));

    etapas.push(definirEtapa(
      "Agenda de consultas",
      temConsulta ? "concluido" : "pendente",
      temConsulta
        ? consultas.length + (consultas.length === 1 ? " consulta registada." : " consultas registadas.")
        : "Nenhuma consulta registada até ao momento.",
      temConsulta ? obterData(consultas[consultas.length - 1], ["dataConsulta", "dataRegisto"]) : ""
    ));

    etapas.push(definirEtapa(
      "Distribuição do caso",
      temDistribuicao ? "concluido" : "pendente",
      temDistribuicao
        ? "O caso possui responsável ou atribuição activa."
        : "O caso ainda não tem responsável atribuído.",
      atribuicoesActivas.length ? obterData(atribuicoesActivas[atribuicoesActivas.length - 1], ["dataAtribuicao", "dataRegisto"]) : ""
    ));

    if (prazos.length > 0) {
      etapas.push(definirEtapa(
        "Controlo de prazos",
        todosPrazosCumpridos ? "concluido" : "emcurso",
        todosPrazosCumpridos
          ? "Todos os prazos registados estão cumpridos."
          : (prazos.length - prazosCumpridos) + " prazo(s) ainda requer(em) acompanhamento.",
        ""
      ));
    } else {
      etapas.push(definirEtapa(
        "Controlo de prazos",
        "neutro",
        "Ainda não existem prazos registados para este caso.",
        "",
        true
      ));
    }

    if (encaminhamentos.length > 0) {
      etapas.push(definirEtapa(
        "Encaminhamento",
        todosEncaminhamentosConcluidos ? "concluido" : "emcurso",
        todosEncaminhamentosConcluidos
          ? "Os encaminhamentos registados foram concluídos."
          : "Existe encaminhamento em acompanhamento.",
        "",
        true
      ));
    } else {
      etapas.push(definirEtapa(
        "Encaminhamento",
        "neutro",
        "Nenhum encaminhamento foi necessário ou registado.",
        "",
        true
      ));
    }

    etapas.push(definirEtapa(
      "Encerramento do caso",
      encerrado ? "concluido" : "pendente",
      encerrado
        ? "O caso encontra-se " + String(caso.estadoCaso || "encerrado").toLowerCase() + "."
        : "O caso permanece em acompanhamento.",
      caso.dataConclusao || caso.dataEncerramento || ""
    ));

    return etapas;
  }

  function calcularProgresso(etapas) {
    const avaliaveis = etapas.filter(etapa => !etapa.opcional || etapa.estado !== "neutro");
    if (!avaliaveis.length) return 0;

    const pontos = avaliaveis.reduce((total, etapa) => {
      if (etapa.estado === "concluido") return total + 1;
      if (etapa.estado === "emcurso" || etapa.estado === "proxima") return total + 0.5;
      return total;
    }, 0);

    return Math.round((pontos / avaliaveis.length) * 100);
  }

  function escolherProximaAccao(caso, atendimentos, consultas, prazos, atribuicoes) {
    if (casoEncerrado(caso)) {
      return {
        tipo: "concluido",
        titulo: "Caso encerrado",
        texto: "O acompanhamento principal deste caso está concluído. Consulte o histórico ou gere o relatório quando necessário."
      };
    }

    const prazosCriticos = prazos.filter(prazo => {
      const estado = normalizar(prazo.situacao || prazo.estadoPrazo || prazo.estado || "");
      return estado === "vencido" || estado === "atrasado";
    });

    if (prazosCriticos.length) {
      return {
        tipo: "urgente",
        titulo: "Tratar prazo vencido",
        texto: prazosCriticos.length + (prazosCriticos.length === 1 ? " prazo vencido requer atenção imediata." : " prazos vencidos requerem atenção imediata.")
      };
    }

    if (!atendimentos.length) {
      return {
        tipo: "normal",
        titulo: "Registar o primeiro atendimento",
        texto: "Ainda não existe atendimento jurídico registado para este caso."
      };
    }

    const temResponsavel = atribuicoes.some(atribuicaoActiva) || Boolean(String(caso.responsavel || "").trim());
    if (!temResponsavel) {
      return {
        tipo: "normal",
        titulo: "Distribuir o caso",
        texto: "O caso ainda não possui responsável ou atribuição activa."
      };
    }

    if (!consultas.length) {
      return {
        tipo: "normal",
        titulo: "Avaliar necessidade de consulta",
        texto: "Não existe consulta registada. Verifique se deve ser agendada uma consulta de acompanhamento."
      };
    }

    const prazosAbertos = prazos.filter(prazo => !prazoCumprido(prazo));
    if (prazosAbertos.length) {
      return {
        tipo: "atencao",
        titulo: "Acompanhar prazos",
        texto: prazosAbertos.length + (prazosAbertos.length === 1 ? " prazo permanece em acompanhamento." : " prazos permanecem em acompanhamento.")
      };
    }

    return {
      tipo: "normal",
      titulo: "Prosseguir com o acompanhamento",
      texto: "Não foram detectadas pendências críticas. Reveja a próxima acção definida no último atendimento."
    };
  }

  function renderizarTimeline(etapas, progresso, recomendacao) {
    const timeline = document.getElementById("timelineCaso");
    const percentagem = document.getElementById("percentagemTimelineCaso");
    const barra = document.getElementById("barraTimelineCaso");
    const estado = document.getElementById("estadoTimelineCaso");
    const proxima = document.getElementById("proximaAccaoTimeline");

    if (!timeline || !percentagem || !barra || !estado || !proxima) return;

    percentagem.textContent = progresso + "%";
    barra.style.width = progresso + "%";
    estado.textContent = progresso === 100
      ? "O acompanhamento registado encontra-se completo."
      : "Progresso calculado com base nos registos disponíveis neste caso.";

    proxima.className = "proxima-accao-caso proxima-accao-" + recomendacao.tipo;
    proxima.innerHTML = `
      <span>Próxima acção recomendada</span>
      <strong>${esc(recomendacao.titulo)}</strong>
      <small>${esc(recomendacao.texto)}</small>
    `;

    timeline.innerHTML = etapas.map((etapa, indice) => {
      const rotulos = {
        concluido: "Concluído",
        emcurso: "Em curso",
        proxima: "Próxima acção",
        pendente: "Pendente",
        neutro: "Sem registo"
      };

      const icones = {
        concluido: "✓",
        emcurso: "●",
        proxima: "★",
        pendente: "○",
        neutro: "·"
      };

      return `
        <div class="timeline-item timeline-${etapa.estado}">
          <div class="timeline-marcador">${icones[etapa.estado] || "○"}</div>
          <div class="timeline-conteudo">
            <div class="timeline-titulo-linha">
              <strong>${esc(etapa.titulo)}</strong>
              <span>${esc(rotulos[etapa.estado] || etapa.estado)}</span>
            </div>
            <p>${esc(etapa.detalhe)}</p>
            ${etapa.data ? `<small>${esc(etapa.data)}</small>` : ""}
          </div>
          ${indice < etapas.length - 1 ? '<div class="timeline-ligacao" aria-hidden="true"></div>' : ""}
        </div>
      `;
    }).join("");
  }

  async function carregarTimelineCaso() {
    const token = localStorage.getItem(CHAVE_TOKEN_TIMELINE);
    const idCaso = new URLSearchParams(location.search).get("idCaso") || "";
    if (!token || !idCaso) return;

    criarEstrutura();

    const resultados = await Promise.allSettled([
      chamarApiTimeline({ acao: "listarCasos", token, pesquisa: idCaso, estado: "Todos" }),
      chamarApiTimeline({ acao: "listarAtendimentosCaso", token, idCaso }),
      chamarApiTimeline({ acao: "listarConsultas", token, pesquisa: idCaso, estado: "Todos" }),
      chamarApiTimeline({ acao: "listarPrazos", token, pesquisa: idCaso, estado: "Todos" }),
      chamarApiTimeline({ acao: "listarEncaminhamentos", token, pesquisa: idCaso, estado: "Todos" }),
      chamarApiTimeline({ acao: "listarAtribuicoesCasos", token, pesquisa: idCaso, estado: "Todos" })
    ]);

    const valor = indice => resultados[indice] && resultados[indice].status === "fulfilled"
      ? resultados[indice].value
      : {};

    const rc = valor(0);
    const ra = valor(1);
    const rco = valor(2);
    const rp = valor(3);
    const re = valor(4);
    const rat = valor(5);

    const caso = (rc.casos || []).find(item => String(item.idCaso) === idCaso) || (rc.casos || [])[0];
    if (!caso) return;

    const atendimentos = Array.isArray(ra.atendimentos) ? ra.atendimentos : [];
    const consultas = (Array.isArray(rco.consultas) ? rco.consultas : []).filter(item => String(item.idCaso) === idCaso);
    const prazos = (Array.isArray(rp.prazos) ? rp.prazos : []).filter(item => String(item.idCaso) === idCaso);
    const encaminhamentos = (Array.isArray(re.encaminhamentos) ? re.encaminhamentos : []).filter(item => String(item.idCaso) === idCaso);
    const atribuicoes = (Array.isArray(rat.atribuicoes) ? rat.atribuicoes : []).filter(item => String(item.idCaso) === idCaso);

    const etapas = construirEtapas(caso, atendimentos, consultas, prazos, encaminhamentos, atribuicoes);
    const progresso = calcularProgresso(etapas);
    const recomendacao = escolherProximaAccao(caso, atendimentos, consultas, prazos, atribuicoes);

    renderizarTimeline(etapas, progresso, recomendacao);
  }

  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(function () {
      carregarTimelineCaso().catch(function (erro) {
        console.warn("Linha temporal indisponível.", erro);
      });
    }, 700);
  });

  window.addEventListener("focus", function () {
    setTimeout(function () {
      carregarTimelineCaso().catch(function () {});
    }, 250);
  });
})();
