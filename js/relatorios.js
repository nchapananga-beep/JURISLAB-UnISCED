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
  const resposta = await fetch(API_JURISLAB + "?acao=validarSessao&token=" + encodeURIComponent(token));
  if (!resposta.ok) throw new Error("Falha na sessão");
  return resposta.json();
}

const numero = valor => Number(valor || 0);
const texto = valor => String(valor || "").trim();
const elemento = id => document.getElementById(id);

function contarPor(lista, campo, alternativo) {
  return lista.reduce((resultado, item) => {
    const chave = texto(item[campo] || item[alternativo] || "Não informado");
    resultado[chave] = (resultado[chave] || 0) + 1;
    return resultado;
  }, {});
}

function renderBarras(alvo, dados) {
  const entradas = Object.entries(dados).sort((a, b) => b[1] - a[1]);
  if (!entradas.length) {
    alvo.innerHTML = '<div class="estado-vazio">Sem dados disponíveis.</div>';
    return;
  }
  const maximo = Math.max(...entradas.map(item => item[1]), 1);
  alvo.innerHTML = entradas.slice(0, 10).map(([rotulo, valor]) => {
    const largura = Math.max(6, Math.round(valor / maximo * 100));
    const seguro = rotulo.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    return `<div class="barra-item"><span class="barra-rotulo" title="${seguro}">${seguro}</span><div class="barra-faixa"><div class="barra-preenchimento" style="width:${largura}%"></div></div><strong class="barra-valor">${valor}</strong></div>`;
  }).join("");
}

function renderResumo(alvo, itens) {
  alvo.innerHTML = itens.map(item => `<div class="resumo-linha ${item.alerta ? "alerta" : ""}"><span>${item.rotulo}</span><strong>${item.valor}</strong></div>`).join("");
}

function casosActivos(casos) {
  return casos.filter(caso => !["Encerrado", "Concluído", "Arquivado"].includes(texto(caso.estadoCaso)));
}

function casoFoiReaberto(caso) {
  return texto(caso.observacoesFinais || caso.observacoes || caso.resultadoFinal).toUpperCase().includes("REABERTURA EM");
}

function converterData(valor) {
  if (!valor) return null;
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) return valor;
  const bruto = String(valor).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(bruto)) return new Date(bruto.substring(0, 10) + "T00:00:00");
  const partes = bruto.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (partes) return new Date(Number(partes[3]), Number(partes[2]) - 1, Number(partes[1]));
  const data = new Date(bruto);
  return Number.isNaN(data.getTime()) ? null : data;
}

function obterDataCaso(caso) {
  return converterData(caso.dataAbertura || caso.dataCriacao || caso.dataRegisto || caso.data);
}

function obterDataConclusao(caso) {
  return converterData(caso.dataConclusao || caso.dataEncerramento || caso.dataFecho);
}

function obterDataConsulta(consulta) {
  return converterData(consulta.dataConsulta || consulta.data || consulta.dataRegisto);
}

function obterDataEncaminhamento(item) {
  return converterData(item.dataEncaminhamento || item.data || item.dataRegisto);
}

function obterDataReabertura(caso) {
  const conteudo = texto(caso.observacoesFinais || caso.observacoes || caso.resultadoFinal);
  const correspondencia = conteudo.match(/REABERTURA EM\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
  return correspondencia ? converterData(correspondencia[1]) : null;
}

function pertenceAoMes(data, ano, mes) {
  return data && data.getFullYear() === ano && data.getMonth() === mes;
}

function preencherSelect(select, valores, primeiroTexto) {
  const actual = select.value;
  const unicos = [...new Set(valores.map(texto).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt"));
  select.innerHTML = `<option value="">${primeiroTexto}</option>` + unicos.map(valor => `<option value="${valor.replace(/"/g, "&quot;")}">${valor}</option>`).join("");
  if (unicos.includes(actual)) select.value = actual;
}

addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem(CHAVE_SESSAO);
  if (!token) { location.href = "login.html"; return; }

  try {
    const sessao = await validar(token);
    if (!sessao.sucesso || !sessao.valida) { location.href = "login.html"; return; }
    elemento("ecraValidacao").classList.add("oculto");
  } catch (erro) {
    location.href = "login.html";
    return;
  }

  const mensagem = elemento("mensagemRelatorios");
  elemento("btnImprimir").onclick = () => window.print();
  elemento("btnExportarPdf").onclick = () => {
    document.body.classList.add("modo-pdf");
    window.print();
    setTimeout(() => document.body.classList.remove("modo-pdf"), 500);
  };

  try {
    const [painel, prazos, casosResposta, consultasResposta, encaminhamentosResposta, atribuicoesResposta] = await Promise.all([
      api({ acao: "obterResumoPainel", token }),
      api({ acao: "obterResumoPrazosPainel", token }),
      api({ acao: "listarCasos", token, pesquisa: "", estado: "Todos" }),
      api({ acao: "listarConsultas", token, pesquisa: "", estado: "Todos" }),
      api({ acao: "listarEncaminhamentos", token, pesquisa: "", estado: "Todos" }),
      api({ acao: "listarAtribuicoesCasos", token, pesquisa: "", estado: "Todos" })
    ]);

    const resumo = painel.resumo || {};
    const todosCasos = casosResposta.casos || [];
    const todasConsultas = consultasResposta.consultas || [];
    const todosEncaminhamentos = encaminhamentosResposta.encaminhamentos || [];
    const todasAtribuicoes = atribuicoesResposta.atribuicoes || [];

    preencherSelect(elemento("filtroArea"), todosCasos.map(c => c.areaDireito), "Todas as áreas");
    preencherSelect(elemento("filtroResponsavel"), todosCasos.map(c => c.responsavel), "Todos os responsáveis");

    const hoje = new Date();
    elemento("mesResumo").value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

    function actualizarResumoMensal() {
      const valor = elemento("mesResumo").value;
      if (!valor) return;
      const [ano, mesNumero] = valor.split("-").map(Number);
      const mes = mesNumero - 1;
      const nomeMes = new Date(ano, mes, 1).toLocaleDateString("pt-PT", { month: "long", year: "numeric" });

      const casosAbertos = todosCasos.filter(c => pertenceAoMes(obterDataCaso(c), ano, mes)).length;
      const casosConcluidos = todosCasos.filter(c => pertenceAoMes(obterDataConclusao(c), ano, mes)).length;
      const casosReabertos = todosCasos.filter(c => pertenceAoMes(obterDataReabertura(c), ano, mes)).length;
      const consultas = todasConsultas.filter(c => pertenceAoMes(obterDataConsulta(c), ano, mes)).length;
      const encaminhamentos = todosEncaminhamentos.filter(c => pertenceAoMes(obterDataEncaminhamento(c), ano, mes)).length;

      elemento("mesCasosAbertos").textContent = casosAbertos;
      elemento("mesCasosConcluidos").textContent = casosConcluidos;
      elemento("mesCasosReabertos").textContent = casosReabertos;
      elemento("mesConsultas").textContent = consultas;
      elemento("mesEncaminhamentos").textContent = encaminhamentos;
      elemento("descricaoMes").textContent = `Indicadores de ${nomeMes}.`;
    }

    function actualizarRelatorio() {
      const inicioTexto = elemento("dataInicial").value;
      const fimTexto = elemento("dataFinal").value;
      const area = elemento("filtroArea").value;
      const responsavel = elemento("filtroResponsavel").value;
      const inicio = inicioTexto ? new Date(inicioTexto + "T00:00:00") : null;
      const fim = fimTexto ? new Date(fimTexto + "T23:59:59") : null;

      if (inicio && fim && inicio > fim) {
        mensagem.textContent = "A data inicial não pode ser posterior à data final.";
        mensagem.className = "mensagem-formulario erro";
        return;
      }

      const casos = todosCasos.filter(caso => {
        if (area && texto(caso.areaDireito) !== area) return false;
        if (responsavel && texto(caso.responsavel) !== responsavel) return false;
        if (inicio || fim) {
          const data = obterDataCaso(caso);
          if (!data) return false;
          if (inicio && data < inicio) return false;
          if (fim && data > fim) return false;
        }
        return true;
      });

      const ids = new Set(casos.map(c => texto(c.idCaso)).filter(Boolean));
      const consultas = todasConsultas.filter(i => ids.has(texto(i.idCaso)));
      const encaminhamentos = todosEncaminhamentos.filter(i => ids.has(texto(i.idCaso)));
      const atribuicoes = todasAtribuicoes.filter(i => ids.has(texto(i.idCaso)));
      const activos = casosActivos(casos);
      const concluidos = casos.filter(c => texto(c.estadoCaso) === "Concluído");
      const arquivados = casos.filter(c => texto(c.estadoCaso) === "Arquivado");
      const reabertos = casos.filter(casoFoiReaberto);
      const semResponsavel = activos.filter(c => !texto(c.responsavel)).length;
      const atribuicoesActivas = atribuicoes.filter(a => texto(a.estadoAtribuicao) === "Activa").length;

      elemento("totalUtentes").textContent = numero(resumo.utentesRegistados);
      elemento("totalCasos").textContent = casos.length;
      elemento("totalCasosActivos").textContent = activos.length;
      elemento("totalConcluidos").textContent = concluidos.length;
      elemento("totalArquivados").textContent = arquivados.length;
      elemento("totalReabertos").textContent = reabertos.length;
      elemento("totalSemResponsavel").textContent = semResponsavel;
      elemento("totalTriagens").textContent = numero(resumo.triagensPendentes);
      elemento("totalConsultas").textContent = consultas.length;
      elemento("totalEncaminhamentos").textContent = encaminhamentos.length;
      elemento("totalAtribuicoes").textContent = atribuicoesActivas;
      elemento("totalPrazosVencidos").textContent = numero(prazos.vencidos);

      renderBarras(elemento("graficoEstados"), contarPor(casos, "estadoCaso"));
      renderBarras(elemento("graficoAreas"), contarPor(casos, "areaDireito"));
      renderBarras(elemento("graficoResponsaveis"), contarPor(activos, "responsavel"));
      renderResumo(elemento("resumoResultados"), [
        { rotulo: "Activos", valor: activos.length },
        { rotulo: "Concluídos", valor: concluidos.length },
        { rotulo: "Arquivados", valor: arquivados.length },
        { rotulo: "Reabertos", valor: reabertos.length }
      ]);
      renderResumo(elemento("resumoPrazos"), [
        { rotulo: "Pendentes", valor: numero(prazos.pendentes) },
        { rotulo: "Próximos 7 dias", valor: numero(prazos.proximos) },
        { rotulo: "Vencidos", valor: numero(prazos.vencidos), alerta: numero(prazos.vencidos) > 0 }
      ]);
      const estadosAtribuicoes = contarPor(atribuicoes, "estadoAtribuicao");
      renderResumo(elemento("resumoAtribuicoes"), [
        { rotulo: "Activas", valor: numero(estadosAtribuicoes.Activa) },
        { rotulo: "Substituídas", valor: numero(estadosAtribuicoes["Substituída"]) },
        { rotulo: "Finalizadas", valor: numero(estadosAtribuicoes.Finalizada) }
      ]);

      const filtros = [];
      if (inicioTexto) filtros.push("desde " + new Date(inicioTexto + "T00:00:00").toLocaleDateString("pt-PT"));
      if (fimTexto) filtros.push("até " + new Date(fimTexto + "T00:00:00").toLocaleDateString("pt-PT"));
      if (area) filtros.push("área: " + area);
      if (responsavel) filtros.push("responsável: " + responsavel);
      elemento("resumoFiltros").textContent = filtros.length ? `A mostrar ${casos.length} caso(s) — ${filtros.join("; ")}.` : `A mostrar todos os ${casos.length} casos.`;
      elemento("dataActualizacao").textContent = new Date().toLocaleString("pt-PT");
      mensagem.textContent = "Relatório actualizado com sucesso.";
      mensagem.className = "mensagem-formulario sucesso";
    }

    elemento("btnAplicarFiltros").onclick = actualizarRelatorio;
    elemento("btnLimparFiltros").onclick = () => {
      elemento("dataInicial").value = "";
      elemento("dataFinal").value = "";
      elemento("filtroArea").value = "";
      elemento("filtroResponsavel").value = "";
      actualizarRelatorio();
    };
    elemento("mesResumo").onchange = actualizarResumoMensal;

    actualizarResumoMensal();
    actualizarRelatorio();
  } catch (erro) {
    console.error(erro);
    mensagem.textContent = "Não foi possível carregar todos os dados do relatório.";
    mensagem.className = "mensagem-formulario erro";
  }
});