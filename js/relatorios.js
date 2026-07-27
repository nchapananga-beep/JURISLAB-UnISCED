const API_JURISLAB = "https://script.google.com/macros/s/AKfycbyFzl8x8Kazn2ek0j5N8qF0f5beYNOSrNSfxx837FEF0do_gF3lzW3Z1UCvo9eeTROB/exec";
const CHAVE_SESSAO = "JURISLAB_TOKEN";

async function api(dados) {
  const resposta = await fetch(API_JURISLAB, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(dados)
  });

  if (!resposta.ok) throw new Error("Falha na API");
  return resposta.json();
}

async function validar(token) {
  const resposta = await fetch(
    API_JURISLAB + "?acao=validarSessao&token=" + encodeURIComponent(token)
  );

  if (!resposta.ok) throw new Error("Falha na sessão");
  return resposta.json();
}

function numero(valor) {
  return Number(valor || 0);
}

function texto(valor) {
  return String(valor || "").trim();
}

function contarPor(lista, campo, alternativo) {
  return lista.reduce((resultado, item) => {
    const chave = texto(
      item[campo] || item[alternativo] || "Não informado"
    );

    resultado[chave] = (resultado[chave] || 0) + 1;
    return resultado;
  }, {});
}

function renderBarras(elemento, dados) {
  const entradas = Object.entries(dados)
    .sort((a, b) => b[1] - a[1]);

  if (!entradas.length) {
    elemento.innerHTML =
      '<div class="estado-vazio">Sem dados disponíveis.</div>';
    return;
  }

  const maximo = Math.max(
    ...entradas.map(item => item[1]),
    1
  );

  elemento.innerHTML = entradas
    .slice(0, 10)
    .map(([rotulo, valor]) => {
      const largura = Math.max(
        6,
        Math.round(valor / maximo * 100)
      );

      const rotuloSeguro = rotulo.replace(/"/g, "&quot;");

      return `
        <div class="barra-item">
          <span class="barra-rotulo" title="${rotuloSeguro}">${rotulo}</span>
          <div class="barra-faixa">
            <div class="barra-preenchimento" style="width:${largura}%"></div>
          </div>
          <strong class="barra-valor">${valor}</strong>
        </div>
      `;
    })
    .join("");
}

function renderResumo(elemento, itens) {
  elemento.innerHTML = itens
    .map(item => `
      <div class="resumo-linha ${item.alerta ? "alerta" : ""}">
        <span>${item.rotulo}</span>
        <strong>${item.valor}</strong>
      </div>
    `)
    .join("");
}

function casosActivos(casos) {
  return casos.filter(caso =>
    !["Encerrado", "Concluído", "Arquivado"].includes(
      texto(caso.estadoCaso)
    )
  );
}

function casoFoiReaberto(caso) {
  const observacoes = texto(
    caso.observacoesFinais ||
    caso.observacoes ||
    caso.resultadoFinal ||
    ""
  ).toUpperCase();

  return observacoes.includes("REABERTURA EM");
}

addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem(CHAVE_SESSAO);

  if (!token) {
    location.href = "login.html";
    return;
  }

  try {
    const sessao = await validar(token);

    if (!sessao.sucesso || !sessao.valida) {
      location.href = "login.html";
      return;
    }

    document.getElementById("ecraValidacao")
      .classList.add("oculto");
  } catch (erro) {
    location.href = "login.html";
    return;
  }

  const mensagem = document.getElementById(
    "mensagemRelatorios"
  );

  document.getElementById("btnImprimir").onclick = () =>
    window.print();

  try {
    const [
      painel,
      prazos,
      casosResposta,
      consultasResposta,
      encaminhamentosResposta,
      atribuicoesResposta
    ] = await Promise.all([
      api({ acao: "obterResumoPainel", token }),
      api({ acao: "obterResumoPrazosPainel", token }),
      api({
        acao: "listarCasos",
        token,
        pesquisa: "",
        estado: "Todos"
      }),
      api({
        acao: "listarConsultas",
        token,
        pesquisa: "",
        estado: "Todos"
      }),
      api({
        acao: "listarEncaminhamentos",
        token,
        pesquisa: "",
        estado: "Todos"
      }),
      api({
        acao: "listarAtribuicoesCasos",
        token,
        pesquisa: "",
        estado: "Todos"
      })
    ]);

    const resumo = painel.resumo || {};
    const casos = casosResposta.casos || [];
    const consultas = consultasResposta.consultas || [];
    const encaminhamentos =
      encaminhamentosResposta.encaminhamentos || [];
    const atribuicoes = atribuicoesResposta.atribuicoes || [];

    const activos = casosActivos(casos);
    const concluidos = casos.filter(
      caso => texto(caso.estadoCaso) === "Concluído"
    );
    const arquivados = casos.filter(
      caso => texto(caso.estadoCaso) === "Arquivado"
    );
    const reabertos = casos.filter(casoFoiReaberto);
    const semResponsavel = activos.filter(
      caso => !texto(caso.responsavel)
    ).length;
    const atribuicoesActivas = atribuicoes.filter(
      atribuicao =>
        texto(atribuicao.estadoAtribuicao) === "Activa"
    ).length;

    document.getElementById("totalUtentes").textContent =
      numero(resumo.utentesRegistados);
    document.getElementById("totalCasos").textContent =
      casos.length;
    document.getElementById("totalCasosActivos").textContent =
      numero(resumo.casosActivos || activos.length);
    document.getElementById("totalConcluidos").textContent =
      concluidos.length;
    document.getElementById("totalArquivados").textContent =
      arquivados.length;
    document.getElementById("totalReabertos").textContent =
      reabertos.length;
    document.getElementById("totalSemResponsavel").textContent =
      semResponsavel;
    document.getElementById("totalTriagens").textContent =
      numero(resumo.triagensPendentes);
    document.getElementById("totalConsultas").textContent =
      consultas.length;
    document.getElementById("totalEncaminhamentos").textContent =
      encaminhamentos.length;
    document.getElementById("totalAtribuicoes").textContent =
      atribuicoesActivas;
    document.getElementById("totalPrazosVencidos").textContent =
      numero(prazos.vencidos);

    renderBarras(
      document.getElementById("graficoEstados"),
      contarPor(casos, "estadoCaso")
    );

    renderBarras(
      document.getElementById("graficoAreas"),
      contarPor(casos, "areaDireito")
    );

    renderBarras(
      document.getElementById("graficoResponsaveis"),
      contarPor(activos, "responsavel")
    );

    renderResumo(
      document.getElementById("resumoResultados"),
      [
        {
          rotulo: "Activos",
          valor: activos.length
        },
        {
          rotulo: "Concluídos",
          valor: concluidos.length
        },
        {
          rotulo: "Arquivados",
          valor: arquivados.length
        },
        {
          rotulo: "Reabertos",
          valor: reabertos.length
        }
      ]
    );

    renderResumo(
      document.getElementById("resumoPrazos"),
      [
        {
          rotulo: "Pendentes",
          valor: numero(prazos.pendentes)
        },
        {
          rotulo: "Próximos 7 dias",
          valor: numero(prazos.proximos)
        },
        {
          rotulo: "Vencidos",
          valor: numero(prazos.vencidos),
          alerta: numero(prazos.vencidos) > 0
        }
      ]
    );

    const estadosAtribuicoes = contarPor(
      atribuicoes,
      "estadoAtribuicao"
    );

    renderResumo(
      document.getElementById("resumoAtribuicoes"),
      [
        {
          rotulo: "Activas",
          valor: numero(estadosAtribuicoes.Activa)
        },
        {
          rotulo: "Substituídas",
          valor: numero(estadosAtribuicoes["Substituída"])
        },
        {
          rotulo: "Finalizadas",
          valor: numero(estadosAtribuicoes.Finalizada)
        }
      ]
    );

    document.getElementById("dataActualizacao").textContent =
      new Date().toLocaleString("pt-PT");

    mensagem.textContent =
      "Relatório carregado com sucesso.";
    mensagem.className =
      "mensagem-formulario sucesso";
  } catch (erro) {
    console.error(erro);
    mensagem.textContent =
      "Não foi possível carregar todos os dados do relatório.";
    mensagem.className =
      "mensagem-formulario erro";
  }
});