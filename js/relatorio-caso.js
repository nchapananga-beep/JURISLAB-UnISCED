const API_RELATORIO = "https://script.google.com/macros/s/AKfycbyFzl8x8Kazn2ek0j5N8qF0f5beYNOSrNSfxx837FEF0do_gF3lzW3Z1UCvo9eeTROB/exec";
const CHAVE_SESSAO_RELATORIO = "JURISLAB_TOKEN";

function escRelatorio(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizarRelatorio(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function apiRelatorio(dados) {
  const resposta = await fetch(API_RELATORIO, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(dados)
  });

  if (!resposta.ok) {
    throw new Error("Não foi possível comunicar com o servidor.");
  }

  return resposta.json();
}

async function validarSessaoRelatorio(token) {
  const resposta = await fetch(
    API_RELATORIO + "?acao=validarSessao&token=" + encodeURIComponent(token)
  );
  if (!resposta.ok) throw new Error("Não foi possível validar a sessão.");
  return resposta.json();
}

function htmlVazio(texto) {
  return `<div class="estado-vazio-relatorio">${escRelatorio(texto || "Sem registos.")}</div>`;
}

function preencherTexto(id, valor) {
  const el = document.getElementById(id);
  if (el) el.textContent = valor || "Não informado";
}

function dataEmissao() {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
}

function obterData(item, campos) {
  for (const campo of campos) {
    if (item && item[campo]) return String(item[campo]);
  }
  return "";
}

function renderizarResumo(caso) {
  const campos = [
    ["Código do caso", caso.idCaso],
    ["Código do utente", caso.idUtente],
    ["Triagem de origem", caso.idTriagem],
    ["Título", caso.tituloCaso],
    ["Área do Direito", caso.areaDireito],
    ["Prioridade", caso.prioridade],
    ["Estado", caso.estadoCaso],
    ["Responsável", caso.responsavel || "Não atribuído"],
    ["Supervisor", caso.supervisor || "Não atribuído"],
    ["Data de abertura", caso.dataAbertura],
    ["Prazo principal", caso.prazo],
    ["Data de conclusão", caso.dataConclusao || caso.dataEncerramento]
  ];

  document.getElementById("relResumoCaso").innerHTML = campos.map(([rotulo, valor]) => `
    <div><span>${escRelatorio(rotulo)}</span><strong>${escRelatorio(valor || "Não informado")}</strong></div>
  `).join("");

  document.getElementById("relSituacaoActual").textContent =
    caso.descricaoCaso || "Não existe descrição do caso registada.";
}

function renderizarAtendimentos(lista) {
  const alvo = document.getElementById("relAtendimentos");
  if (!lista.length) {
    alvo.innerHTML = htmlVazio("Ainda não existem atendimentos registados.");
    return;
  }

  alvo.innerHTML = lista.map((i, indice) => `
    <div class="item-relatorio">
      <strong>${indice + 1}. ${escRelatorio(i.tipoAtendimento || "Atendimento")}</strong>
      ${i.dataAtendimento || i.dataRegisto ? `<small>${escRelatorio(i.dataAtendimento || i.dataRegisto)}</small>` : ""}
      ${i.modalidade ? `<p><b>Modalidade:</b> ${escRelatorio(i.modalidade)}</p>` : ""}
      ${i.resumoAtendimento ? `<p><b>Resumo:</b> ${escRelatorio(i.resumoAtendimento)}</p>` : ""}
      ${i.analiseJuridica ? `<p><b>Análise jurídica:</b> ${escRelatorio(i.analiseJuridica)}</p>` : ""}
      ${i.orientacaoPrestada ? `<p><b>Orientação prestada:</b> ${escRelatorio(i.orientacaoPrestada)}</p>` : ""}
      ${i.documentosRecebidos ? `<p><b>Documentos recebidos:</b> ${escRelatorio(i.documentosRecebidos)}</p>` : ""}
      ${i.proximaAccao ? `<p><b>Próxima acção:</b> ${escRelatorio(i.proximaAccao)}</p>` : ""}
      ${i.dataProximaAccao ? `<p><b>Data prevista:</b> ${escRelatorio(i.dataProximaAccao)}</p>` : ""}
      ${i.responsavel ? `<p><b>Responsável:</b> ${escRelatorio(i.responsavel)}</p>` : ""}
    </div>
  `).join("");
}

function renderizarConsultas(lista, idCaso) {
  const itens = lista.filter(i => String(i.idCaso || "") === idCaso);
  const alvo = document.getElementById("relConsultas");
  if (!itens.length) {
    alvo.innerHTML = htmlVazio("Ainda não existem consultas registadas.");
    return;
  }

  alvo.innerHTML = itens.map((i, indice) => `
    <div class="item-relatorio">
      <strong>${indice + 1}. Consulta ${escRelatorio(i.idConsulta || "")}</strong>
      <p><b>Data:</b> ${escRelatorio(i.dataConsulta || "Não informada")} ${escRelatorio(i.horaConsulta || "")}</p>
      <p><b>Modalidade:</b> ${escRelatorio(i.modalidade || "Não informada")}</p>
      <p><b>Estado:</b> ${escRelatorio(i.estadoConsulta || i.estado || "Não informado")}</p>
      ${i.localLink ? `<p><b>Local ou link:</b> ${escRelatorio(i.localLink)}</p>` : ""}
      ${i.responsavel ? `<p><b>Responsável:</b> ${escRelatorio(i.responsavel)}</p>` : ""}
      ${i.observacoes ? `<p><b>Observações:</b> ${escRelatorio(i.observacoes)}</p>` : ""}
    </div>
  `).join("");
}

function renderizarPrazos(lista, idCaso) {
  const itens = lista.filter(i => String(i.idCaso || "") === idCaso);
  const alvo = document.getElementById("relPrazos");
  if (!itens.length) {
    alvo.innerHTML = htmlVazio("Ainda não existem prazos registados.");
    return;
  }

  alvo.innerHTML = itens.map((i, indice) => `
    <div class="item-relatorio">
      <strong>${indice + 1}. ${escRelatorio(i.descricaoPrazo || "Prazo")}</strong>
      <p><b>Data limite:</b> ${escRelatorio(i.dataLimite || "Não informada")}</p>
      <p><b>Situação:</b> ${escRelatorio(i.situacao || i.estadoPrazo || i.estado || "Não informada")}</p>
      ${i.responsavel ? `<p><b>Responsável:</b> ${escRelatorio(i.responsavel)}</p>` : ""}
      ${i.observacoes ? `<p><b>Observações:</b> ${escRelatorio(i.observacoes)}</p>` : ""}
    </div>
  `).join("");
}

function renderizarDocumentos(lista) {
  const alvo = document.getElementById("relDocumentos");
  if (!lista.length) {
    alvo.innerHTML = htmlVazio("Ainda não existem documentos associados ao caso.");
    return;
  }

  alvo.innerHTML = lista.map((i, indice) => `
    <div class="item-relatorio">
      <strong>${indice + 1}. ${escRelatorio(i.tituloDocumento || i.nomeFicheiro || "Documento")}</strong>
      <p><b>Tipo:</b> ${escRelatorio(i.tipoDocumento || "Não informado")}</p>
      <p><b>Estado:</b> ${escRelatorio(i.estadoDocumento || "Não informado")}</p>
      ${i.dataRegisto ? `<small>${escRelatorio(i.dataRegisto)}</small>` : ""}
    </div>
  `).join("");
}

function renderizarEncaminhamentos(lista, idCaso) {
  const itens = lista.filter(i => String(i.idCaso || "") === idCaso);
  const alvo = document.getElementById("relEncaminhamentos");
  if (!itens.length) {
    alvo.innerHTML = htmlVazio("Não existem encaminhamentos registados.");
    return;
  }

  alvo.innerHTML = itens.map((i, indice) => `
    <div class="item-relatorio">
      <strong>${indice + 1}. ${escRelatorio(i.instituicaoDestino || "Encaminhamento")}</strong>
      ${i.motivoEncaminhamento ? `<p><b>Motivo:</b> ${escRelatorio(i.motivoEncaminhamento)}</p>` : ""}
      <p><b>Estado:</b> ${escRelatorio(i.estadoEncaminhamento || i.estado || "Não informado")}</p>
      ${i.dataEncaminhamento || i.dataRegisto ? `<small>${escRelatorio(i.dataEncaminhamento || i.dataRegisto)}</small>` : ""}
    </div>
  `).join("");
}

function renderizarAtribuicoes(lista, idCaso, caso) {
  const itens = lista.filter(i => String(i.idCaso || "") === idCaso);
  const alvo = document.getElementById("relAtribuicoes");

  let html = `
    <div class="item-relatorio">
      <strong>Responsáveis actuais do caso</strong>
      <p><b>Responsável:</b> ${escRelatorio(caso.responsavel || "Não atribuído")}</p>
      <p><b>Supervisor:</b> ${escRelatorio(caso.supervisor || "Não atribuído")}</p>
    </div>`;

  if (!itens.length) {
    html += htmlVazio("Não existem registos formais adicionais de atribuição.");
    alvo.innerHTML = html;
    return;
  }

  html += itens.map((i, indice) => `
    <div class="item-relatorio">
      <strong>${indice + 1}. ${escRelatorio(i.tipoAtribuicao || "Atribuição")}</strong>
      <p><b>Estudante:</b> ${escRelatorio(i.estudante || "Não indicado")}</p>
      <p><b>Jurista responsável:</b> ${escRelatorio(i.juristaResponsavel || "Não indicado")}</p>
      <p><b>Estado:</b> ${escRelatorio(i.estadoAtribuicao || "Não informado")}</p>
      ${i.dataAtribuicao || i.dataRegisto ? `<small>${escRelatorio(i.dataAtribuicao || i.dataRegisto)}</small>` : ""}
    </div>
  `).join("");

  alvo.innerHTML = html;
}

function construirTimeline(caso, atendimentos, consultas, prazos, encaminhamentos, atribuicoes) {
  const eventos = [];

  eventos.push({
    data: caso.dataAbertura || "",
    titulo: "Caso aberto",
    detalhe: caso.idTriagem ? "Caso criado com base na triagem " + caso.idTriagem + "." : "Caso registado no JURISLAB."
  });

  atendimentos.forEach(i => eventos.push({
    data: obterData(i, ["dataAtendimento", "dataRegisto", "dataHora"]),
    titulo: "Atendimento jurídico",
    detalhe: i.tipoAtendimento || i.resumoAtendimento || "Atendimento registado."
  }));

  consultas.forEach(i => eventos.push({
    data: obterData(i, ["dataConsulta", "dataRegisto"]),
    titulo: "Consulta",
    detalhe: [i.modalidade, i.estadoConsulta || i.estado].filter(Boolean).join(" - ") || "Consulta registada."
  }));

  atribuicoes.forEach(i => eventos.push({
    data: obterData(i, ["dataAtribuicao", "dataRegisto"]),
    titulo: "Atribuição do caso",
    detalhe: i.estudante || i.juristaResponsavel || i.tipoAtribuicao || "Atribuição registada."
  }));

  prazos.forEach(i => eventos.push({
    data: i.dataLimite || "",
    titulo: "Prazo",
    detalhe: (i.descricaoPrazo || "Prazo") + " - " + (i.situacao || i.estadoPrazo || i.estado || "")
  }));

  encaminhamentos.forEach(i => eventos.push({
    data: obterData(i, ["dataEncaminhamento", "dataRegisto"]),
    titulo: "Encaminhamento",
    detalhe: i.instituicaoDestino || i.motivoEncaminhamento || "Encaminhamento registado."
  }));

  const estado = normalizarRelatorio(caso.estadoCaso);
  if (["concluido", "encerrado", "arquivado"].includes(estado)) {
    eventos.push({
      data: caso.dataConclusao || caso.dataEncerramento || "",
      titulo: "Caso encerrado",
      detalhe: "Estado final: " + (caso.estadoCaso || "Encerrado") + "."
    });
  }

  document.getElementById("relTimeline").innerHTML = eventos.map(i => `
    <div class="item-relatorio">
      <strong>${escRelatorio(i.titulo)}</strong>
      <p>${escRelatorio(i.detalhe)}</p>
      ${i.data ? `<small>${escRelatorio(i.data)}</small>` : ""}
    </div>
  `).join("");
}

function renderizarAuditoria(resultado) {
  const secao = document.getElementById("secaoAuditoriaRelatorio");
  const alvo = document.getElementById("relAuditoria");

  if (!resultado || !resultado.sucesso) {
    secao.style.display = "none";
    return;
  }

  const lista = resultado.registos || [];
  if (!lista.length) {
    alvo.innerHTML = htmlVazio("Não existem registos de auditoria associados ao caso.");
    return;
  }

  alvo.innerHTML = lista.map((i, indice) => `
    <div class="item-relatorio">
      <strong>${indice + 1}. ${escRelatorio(i.accao || i.acao || i.operacao || "Operação")}</strong>
      <p><b>Utilizador:</b> ${escRelatorio(i.nomeUtilizador || i.utilizador || i.email || "Não identificado")}</p>
      ${i.descricao || i.detalhe ? `<p>${escRelatorio(i.descricao || i.detalhe)}</p>` : ""}
      ${i.resultado ? `<p><b>Resultado:</b> ${escRelatorio(i.resultado)}</p>` : ""}
      ${i.dataHora || i.data || i.dataRegisto ? `<small>${escRelatorio(i.dataHora || i.data || i.dataRegisto)}</small>` : ""}
    </div>
  `).join("");
}

document.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem(CHAVE_SESSAO_RELATORIO);
  const parametros = new URLSearchParams(location.search);
  const idCaso = parametros.get("idCaso") || "";
  const imprimirAutomaticamente = parametros.get("auto") === "1";

  if (!token || !idCaso) {
    location.href = "casos.html";
    return;
  }

  try {
    const sessao = await validarSessaoRelatorio(token);
    if (!sessao.sucesso || !sessao.valida) {
      location.href = "login.html";
      return;
    }

    const pedidos = [
      apiRelatorio({ acao: "listarCasos", token, pesquisa: idCaso, estado: "Todos" }),
      apiRelatorio({ acao: "listarAtendimentosCaso", token, idCaso }),
      apiRelatorio({ acao: "listarConsultas", token, pesquisa: idCaso, estado: "Todos" }),
      apiRelatorio({ acao: "listarPrazos", token, pesquisa: idCaso, estado: "Todos" }),
      apiRelatorio({ acao: "listarDocumentosCaso", token, idCaso, pesquisa: "", estado: "Todos" }),
      apiRelatorio({ acao: "listarEncaminhamentos", token, pesquisa: idCaso, estado: "Todos" }),
      apiRelatorio({ acao: "listarAtribuicoesCasos", token, pesquisa: idCaso, estado: "Todos" }),
      apiRelatorio({ acao: "listarAuditoria", token, pesquisa: idCaso, modulo: "Todos", resultado: "Todos", dataInicial: "", dataFinal: "" })
    ];

    const resultados = await Promise.allSettled(pedidos);
    const valor = indice => resultados[indice] && resultados[indice].status === "fulfilled" ? resultados[indice].value : null;

    const rc = valor(0) || {};
    const caso = (rc.casos || []).find(c => String(c.idCaso) === idCaso) || (rc.casos || [])[0];
    if (!caso) throw new Error("Caso não encontrado.");

    const atendimentos = (valor(1) && valor(1).atendimentos) || [];
    const consultas = ((valor(2) && valor(2).consultas) || []).filter(i => String(i.idCaso || "") === idCaso);
    const prazos = ((valor(3) && valor(3).prazos) || []).filter(i => String(i.idCaso || "") === idCaso);
    const documentos = (valor(4) && valor(4).documentos) || [];
    const encaminhamentos = ((valor(5) && valor(5).encaminhamentos) || []).filter(i => String(i.idCaso || "") === idCaso);
    const atribuicoes = ((valor(6) && valor(6).atribuicoes) || []).filter(i => String(i.idCaso || "") === idCaso);

    preencherTexto("relTituloCaso", caso.tituloCaso || "Caso jurídico");
    preencherTexto("relCodigoCaso", idCaso);
    preencherTexto("relEstadoCaso", caso.estadoCaso || "Não informado");
    preencherTexto("relAreaDireito", caso.areaDireito || "Não informada");
    preencherTexto("relDataAbertura", caso.dataAbertura || "Não informada");
    preencherTexto("relDataEmissao", dataEmissao());
    preencherTexto("relResponsavelAssinatura", caso.responsavel || "____________________________");
    preencherTexto("relSupervisorAssinatura", caso.supervisor || "____________________________");
    preencherTexto("relRodapeCaso", idCaso);

    renderizarResumo(caso);
    renderizarAtendimentos(atendimentos);
    renderizarConsultas(consultas, idCaso);
    renderizarPrazos(prazos, idCaso);
    renderizarDocumentos(documentos);
    renderizarEncaminhamentos(encaminhamentos, idCaso);
    renderizarAtribuicoes(atribuicoes, idCaso, caso);
    construirTimeline(caso, atendimentos, consultas, prazos, encaminhamentos, atribuicoes);
    renderizarAuditoria(valor(7));

    document.title = "Relatório " + idCaso + " | JURISLAB";
    document.getElementById("ecraValidacao").classList.add("oculto");

    document.getElementById("btnVoltar").addEventListener("click", function () {
      location.href = "ficha-caso.html?idCaso=" + encodeURIComponent(idCaso);
    });

    document.getElementById("btnPdf").addEventListener("click", function () {
      window.print();
    });

    if (imprimirAutomaticamente) {
      setTimeout(function () {
        window.print();
      }, 700);
    }
  } catch (erro) {
    document.getElementById("ecraValidacao").classList.add("oculto");
    document.body.innerHTML = `<main class="folha-relatorio"><h1>Não foi possível gerar o relatório</h1><p>${escRelatorio(erro.message || "Erro inesperado.")}</p><p><a href="casos.html">Voltar aos casos</a></p></main>`;
  }
});