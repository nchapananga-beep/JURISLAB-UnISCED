(() => {
  "use strict";

  const API = "https://script.google.com/macros/s/AKfycbyFzl8x8Kazn2ek0j5N8qF0f5beYNOSrNSfxx837FEF0do_gF3lzW3Z1UCvo9eeTROB/exec";
  const CHAVE_TOKEN = "JURISLAB_TOKEN";

  function esc(valor) {
    return String(valor || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizar(valor) {
    return String(valor || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  async function api(dados) {
    const resposta = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(dados)
    });
    if (!resposta.ok) throw new Error("Falha no servidor");
    return resposta.json();
  }

  function hash32(texto) {
    let hash = 2166136261;
    const valor = String(texto || "");
    for (let i = 0; i < valor.length; i++) {
      hash ^= valor.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
  }

  function codigoControlo(caso) {
    const base = [
      caso.idCaso || "",
      caso.idUtente || "",
      caso.dataAbertura || "",
      "JURISLAB-ACONSELHA-V1"
    ].join("|");
    const ano = String(caso.dataAbertura || "").match(/20\d{2}/)?.[0] || new Date().getFullYear();
    const curto = String(caso.idCaso || "CASO").replace(/[^A-Za-z0-9]/g, "").slice(-8).toUpperCase();
    return `JURISLAB-${ano}-${curto}-${hash32(base).slice(0, 6)}`;
  }

  function dataParaNumero(valor) {
    const texto = String(valor || "").trim();
    if (!texto) return null;

    const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).getTime();

    const pt = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (pt) return new Date(Number(pt[3]), Number(pt[2]) - 1, Number(pt[1])).getTime();

    const data = new Date(texto);
    return Number.isNaN(data.getTime()) ? null : data.getTime();
  }

  function diasEntre(inicio, fim) {
    const a = dataParaNumero(inicio);
    const b = fim ? dataParaNumero(fim) : Date.now();
    if (a == null || b == null) return "—";
    return Math.max(0, Math.floor((b - a) / 86400000));
  }

  function estadoFechado(valor) {
    return ["concluido", "encerrado", "arquivado"].includes(normalizar(valor));
  }

  function prazoCumprido(item) {
    return ["cumprido", "concluido", "encerrado", "resolvido", "cancelado"].includes(
      normalizar(item.situacao || item.estadoPrazo || item.estado || "")
    );
  }

  function prazoVencido(item) {
    const estado = normalizar(item.situacao || item.estadoPrazo || item.estado || "");
    if (["vencido", "atrasado"].includes(estado)) return true;
    if (prazoCumprido(item)) return false;
    const limite = dataParaNumero(item.dataLimite);
    return limite != null && limite < new Date().setHours(0, 0, 0, 0);
  }

  function proximoPrazo(prazos) {
    return prazos
      .filter(i => !prazoCumprido(i) && dataParaNumero(i.dataLimite) != null)
      .sort((a, b) => dataParaNumero(a.dataLimite) - dataParaNumero(b.dataLimite))[0] || null;
  }

  function complexidade(caso, dados) {
    let pontos = 0;
    if (normalizar(caso.prioridade) === "alta") pontos += 2;
    if (dados.atendimentos.length >= 3) pontos += 1;
    if (dados.documentos.length >= 5) pontos += 1;
    if (dados.prazos.length >= 2) pontos += 1;
    if (dados.encaminhamentos.length) pontos += 1;
    if (diasEntre(caso.dataAbertura, caso.dataConclusao || caso.dataEncerramento) > 30) pontos += 1;
    if (pontos >= 5) return "Alta";
    if (pontos >= 2) return "Média";
    return "Baixa";
  }

  function urgencia(caso, prazos) {
    if (prazos.some(prazoVencido)) return "Crítica";
    const prioridade = normalizar(caso.prioridade);
    if (prioridade === "alta" || prioridade === "urgente") return "Alta";
    if (prioridade === "media") return "Média";
    return "Normal";
  }

  function recomendacao(caso, dados) {
    const vencidos = dados.prazos.filter(prazoVencido);
    if (estadoFechado(caso.estadoCaso)) {
      return "Caso encerrado. Rever o relatório, a auditoria e os documentos antes do arquivo definitivo.";
    }
    if (vencidos.length) {
      return vencidos.length === 1
        ? "Tratar imediatamente o prazo vencido registado no caso."
        : `Tratar imediatamente os ${vencidos.length} prazos vencidos registados no caso.`;
    }
    if (!dados.atendimentos.length) return "Registar o primeiro atendimento jurídico do caso.";
    if (!String(caso.responsavel || "").trim() && !dados.atribuicoes.length) return "Distribuir o caso e indicar o responsável pelo acompanhamento.";
    if (!dados.consultas.length) return "Avaliar se é necessária uma consulta de acompanhamento e, sendo o caso, agendá-la.";
    const prazo = proximoPrazo(dados.prazos);
    if (prazo) return `Acompanhar o próximo prazo: ${prazo.descricaoPrazo || "prazo registado"} (${prazo.dataLimite || "data não informada"}).`;
    const ultima = dados.atendimentos[dados.atendimentos.length - 1];
    if (ultima && ultima.proximaAccao) return `Executar a próxima acção definida no último atendimento: ${ultima.proximaAccao}`;
    return "Prosseguir com o acompanhamento do caso e actualizar os registos após cada intervenção.";
  }

  function criarIndice() {
    if (document.getElementById("indiceRelatorioV1")) return;
    const capa = document.querySelector(".capa-relatorio");
    const secoes = Array.from(document.querySelectorAll(".secao-relatorio"));
    if (!capa || !secoes.length) return;

    const indice = document.createElement("section");
    indice.id = "indiceRelatorioV1";
    indice.className = "indice-relatorio";
    indice.innerHTML = `<h2>Índice</h2><ol></ol>`;
    capa.insertAdjacentElement("afterend", indice);

    const lista = indice.querySelector("ol");
    secoes.forEach((secao, i) => {
      const h2 = secao.querySelector("h2");
      if (!h2) return;
      const id = secao.id || `secaoRelatorioV1_${i + 1}`;
      secao.id = id;
      const li = document.createElement("li");
      li.innerHTML = `<a href="#${esc(id)}">${esc(h2.textContent.replace(/^\d+\.\s*/, ""))}</a>`;
      lista.appendChild(li);
    });
  }

  function criarSelo() {
    const titulo = document.querySelector(".titulo-relatorio");
    if (!titulo || titulo.querySelector(".selo-documento-v1")) return;
    const selo = document.createElement("div");
    selo.className = "selo-documento-v1";
    selo.textContent = "Documento gerado automaticamente · Versão 1.0";
    titulo.appendChild(selo);
  }

  function preencherCapa(caso, codigo) {
    const meta = document.querySelector(".metadados-capa");
    if (!meta || document.getElementById("relCodigoControloV1")) return;
    meta.insertAdjacentHTML("beforeend", `
      <div><span>Versão do sistema</span><strong>JURISLAB Aconselha 1.0</strong></div>
      <div><span>Código de controlo</span><strong id="relCodigoControloV1">${esc(codigo)}</strong></div>
    `);
  }

  function criarQuadroExecutivo(caso, dados, codigo) {
    const situacao = document.getElementById("relSituacaoActual");
    if (!situacao || document.getElementById("quadroExecutivoV1")) return;

    const vencidos = dados.prazos.filter(prazoVencido).length;
    const proximo = proximoPrazo(dados.prazos);
    const quadro = document.createElement("div");
    quadro.id = "quadroExecutivoV1";
    quadro.className = "quadro-executivo-v1";
    quadro.innerHTML = `
      <h3>Quadro executivo</h3>
      <div class="metricas-relatorio-v1">
        <div class="metrica-relatorio-v1"><span>Atendimentos</span><strong>${dados.atendimentos.length}</strong></div>
        <div class="metrica-relatorio-v1"><span>Consultas</span><strong>${dados.consultas.length}</strong></div>
        <div class="metrica-relatorio-v1"><span>Documentos</span><strong>${dados.documentos.length}</strong></div>
        <div class="metrica-relatorio-v1"><span>Dias em acompanhamento</span><strong>${diasEntre(caso.dataAbertura, caso.dataConclusao || caso.dataEncerramento)}</strong></div>
      </div>
      <div class="analise-relatorio-v1">
        <h3>Análise automática de acompanhamento</h3>
        <div class="analise-grelha-v1">
          <div class="analise-item-v1"><span>Urgência operacional</span><strong>${esc(urgencia(caso, dados.prazos))}</strong></div>
          <div class="analise-item-v1"><span>Complexidade operacional</span><strong>${esc(complexidade(caso, dados))}</strong></div>
          <div class="analise-item-v1"><span>Prazos vencidos</span><strong>${vencidos}</strong></div>
          <div class="analise-item-v1"><span>Próximo prazo</span><strong>${esc(proximo ? (proximo.dataLimite || "Registado") : "Sem prazo aberto")}</strong></div>
          <div class="analise-item-v1" style="grid-column:1/-1"><span>Próxima acção sugerida</span><strong>${esc(recomendacao(caso, dados))}</strong></div>
        </div>
        <p class="nota-analise-v1">Esta análise é um apoio operacional baseado nos registos do JURISLAB. Não substitui a apreciação jurídica do responsável ou do supervisor.</p>
      </div>
    `;
    situacao.insertAdjacentElement("afterend", quadro);

    const fecho = document.querySelector(".assinatura-relatorio");
    if (fecho && !document.getElementById("controloRelatorioV1")) {
      const urlValidacao = new URL("validar-relatorio.html", location.href);
      urlValidacao.searchParams.set("idCaso", caso.idCaso || "");
      urlValidacao.searchParams.set("codigo", codigo);
      const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" + encodeURIComponent(urlValidacao.href);
      const controlo = document.createElement("div");
      controlo.id = "controloRelatorioV1";
      controlo.className = "controlo-relatorio-v1";
      controlo.innerHTML = `
        <div>
          <span>Verificação interna do documento</span>
          <strong>${esc(codigo)}</strong>
          <small>Leia o QR Code ou introduza o código na página de validação do JURISLAB. A verificação confirma a correspondência com o caso registado no sistema.</small>
        </div>
        <img class="qr-relatorio-v1" src="${esc(qrUrl)}" alt="QR Code para verificação interna do relatório">
      `;
      fecho.appendChild(controlo);
    }
  }

  function ajustarAssinaturas() {
    const assinaturas = document.querySelector(".assinaturas");
    if (!assinaturas || assinaturas.classList.contains("assinaturas-v1")) return;
    assinaturas.classList.add("assinaturas-v1");
    const terceiro = document.createElement("div");
    terceiro.innerHTML = `<span>Coordenação da Clínica Jurídica</span><strong>____________________________</strong>`;
    assinaturas.appendChild(terceiro);
  }

  function ajustarRodape(codigo) {
    const rodape = document.querySelector(".rodape-relatorio");
    if (!rodape || rodape.querySelector(".versao-relatorio-v1")) return;
    const extra = document.createElement("span");
    extra.className = "versao-relatorio-v1";
    extra.textContent = `Versão 1.0 · ${codigo}`;
    rodape.appendChild(extra);
  }

  async function carregar() {
    const token = localStorage.getItem(CHAVE_TOKEN);
    const idCaso = new URLSearchParams(location.search).get("idCaso") || "";
    if (!token || !idCaso) return;

    const resultados = await Promise.allSettled([
      api({ acao: "listarCasos", token, pesquisa: idCaso, estado: "Todos" }),
      api({ acao: "listarAtendimentosCaso", token, idCaso }),
      api({ acao: "listarConsultas", token, pesquisa: idCaso, estado: "Todos" }),
      api({ acao: "listarPrazos", token, pesquisa: idCaso, estado: "Todos" }),
      api({ acao: "listarDocumentosCaso", token, idCaso, pesquisa: "", estado: "Todos" }),
      api({ acao: "listarEncaminhamentos", token, pesquisa: idCaso, estado: "Todos" }),
      api({ acao: "listarAtribuicoesCasos", token, pesquisa: idCaso, estado: "Todos" })
    ]);

    const valor = indice => resultados[indice].status === "fulfilled" ? resultados[indice].value : {};
    const rc = valor(0);
    const caso = (rc.casos || []).find(i => String(i.idCaso || "") === idCaso) || (rc.casos || [])[0];
    if (!caso) return;

    const dados = {
      atendimentos: valor(1).atendimentos || [],
      consultas: (valor(2).consultas || []).filter(i => String(i.idCaso || "") === idCaso),
      prazos: (valor(3).prazos || []).filter(i => String(i.idCaso || "") === idCaso),
      documentos: valor(4).documentos || [],
      encaminhamentos: (valor(5).encaminhamentos || []).filter(i => String(i.idCaso || "") === idCaso),
      atribuicoes: (valor(6).atribuicoes || []).filter(i => String(i.idCaso || "") === idCaso)
    };

    const codigo = codigoControlo(caso);
    criarSelo();
    preencherCapa(caso, codigo);
    criarIndice();
    criarQuadroExecutivo(caso, dados, codigo);
    ajustarAssinaturas();
    ajustarRodape(codigo);
  }

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => carregar().catch(() => {}), 700);
  });
})();
