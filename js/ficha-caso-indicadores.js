(() => {
  "use strict";

  const API = "https://script.google.com/macros/s/AKfycbyFzl8x8Kazn2ek0j5N8qF0f5beYNOSrNSfxx837FEF0do_gF3lzW3Z1UCvo9eeTROB/exec";
  const CHAVE_TOKEN = "JURISLAB_TOKEN";

  async function chamarApi(dados) {
    const resposta = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(dados)
    });
    if (!resposta.ok) throw new Error("Falha no servidor");
    return resposta.json();
  }

  function normalizarData(valor) {
    if (!valor) return null;
    const texto = String(valor).trim();
    const partes = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (partes) return new Date(Number(partes[3]), Number(partes[2]) - 1, Number(partes[1]));
    const data = new Date(texto);
    return Number.isNaN(data.getTime()) ? null : data;
  }

  function diasEmAcompanhamento(dataAbertura) {
    const inicio = normalizarData(dataAbertura);
    if (!inicio) return "—";
    const agora = new Date();
    const dias = Math.max(0, Math.floor((agora - inicio) / 86400000));
    return dias + (dias === 1 ? " dia" : " dias");
  }

  function criarEstrutura() {
    if (document.getElementById("indicadoresCaso")) return document.getElementById("indicadoresCaso");
    const cabecalho = document.querySelector(".ficha-cabecalho");
    if (!cabecalho || !cabecalho.parentNode) return null;
    const secao = document.createElement("section");
    secao.id = "indicadoresCaso";
    secao.className = "indicadores-caso";
    secao.setAttribute("aria-label", "Indicadores do caso");
    secao.innerHTML = '<div class="indicador-caso indicador-carregando">A carregar indicadores...</div>';
    cabecalho.parentNode.insertBefore(secao, cabecalho.nextSibling);
    return secao;
  }

  function cartao(rotulo, valor, destaque) {
    return `<div class="indicador-caso${destaque ? " indicador-destaque" : ""}"><small>${rotulo}</small><strong>${valor}</strong></div>`;
  }

  async function carregar() {
    const token = localStorage.getItem(CHAVE_TOKEN);
    const idCaso = new URLSearchParams(location.search).get("idCaso") || "";
    const secao = criarEstrutura();
    if (!secao || !token || !idCaso) return;

    try {
      const resultados = await Promise.all([
        chamarApi({ acao: "listarCasos", token, pesquisa: idCaso, estado: "Todos" }),
        chamarApi({ acao: "listarAtendimentosCaso", token, idCaso }),
        chamarApi({ acao: "listarConsultas", token, pesquisa: idCaso, estado: "Todos" }),
        chamarApi({ acao: "listarDocumentosCaso", token, idCaso, pesquisa: "", estado: "Todos" }),
        chamarApi({ acao: "listarPrazos", token, pesquisa: idCaso, estado: "Todos" })
      ]);

      const caso = (resultados[0].casos || []).find(c => String(c.idCaso) === idCaso) || (resultados[0].casos || [])[0] || {};
      const atendimentos = resultados[1].atendimentos || [];
      const consultas = (resultados[2].consultas || []).filter(i => String(i.idCaso) === idCaso);
      const documentos = resultados[3].documentos || [];
      const prazos = (resultados[4].prazos || []).filter(i => String(i.idCaso) === idCaso);

      secao.innerHTML = [
        cartao("Estado", String(caso.estadoCaso || "Não informado"), true),
        cartao("Prioridade", String(caso.prioridade || "Não informada")),
        cartao("Atendimentos", atendimentos.length),
        cartao("Consultas", consultas.length),
        cartao("Documentos", documentos.length),
        cartao("Prazos", prazos.length),
        cartao("Tempo em acompanhamento", diasEmAcompanhamento(caso.dataAbertura))
      ].join("");
    } catch (erro) {
      secao.innerHTML = '<div class="indicador-caso indicador-indisponivel"><small>Indicadores</small><strong>Não disponíveis</strong></div>';
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(carregar, 450);
  });
})();