(() => {
  "use strict";

  function textoResumo(rotulo) {
    const blocos = Array.from(document.querySelectorAll("#resumoCaso .dado-resumo"));
    const bloco = blocos.find(function (item) {
      const titulo = item.querySelector("strong");
      return titulo && titulo.textContent.trim().toLowerCase() === rotulo.toLowerCase();
    });

    if (!bloco) return "Não informado";

    const copia = bloco.cloneNode(true);
    const titulo = copia.querySelector("strong");
    if (titulo) titulo.remove();
    return copia.textContent.trim() || "Não informado";
  }

  function criarCartaoEstado() {
    if (document.getElementById("cartaoEstadoCaso")) return;

    const resumo = document.getElementById("resumoCaso");
    if (!resumo || !resumo.parentNode || !resumo.children.length) return;

    const estado = textoResumo("Estado");
    const prioridade = textoResumo("Prioridade");
    const responsavel = textoResumo("Responsável");
    const supervisor = textoResumo("Supervisor");

    const cartao = document.createElement("section");
    cartao.id = "cartaoEstadoCaso";
    cartao.className = "cartao-estado-caso";
    cartao.innerHTML = `
      <div class="estado-caso-principal">
        <span class="estado-caso-ponto" aria-hidden="true"></span>
        <div>
          <small>Estado actual</small>
          <strong>${estado}</strong>
        </div>
      </div>
      <div class="estado-caso-dado">
        <small>Responsável</small>
        <strong>${responsavel}</strong>
      </div>
      <div class="estado-caso-dado">
        <small>Supervisor</small>
        <strong>${supervisor}</strong>
      </div>
      <div class="estado-caso-dado">
        <small>Prioridade</small>
        <strong>${prioridade}</strong>
      </div>
    `;

    resumo.parentNode.insertBefore(cartao, resumo);
  }

  function criarAtalhos() {
    if (document.getElementById("atalhosCaso")) return;

    const cabecalho = document.querySelector(".ficha-cabecalho");
    if (!cabecalho || !cabecalho.parentNode) return;

    const atalhos = document.createElement("section");
    atalhos.id = "atalhosCaso";
    atalhos.className = "atalhos-caso";
    atalhos.setAttribute("aria-label", "Atalhos do caso");
    atalhos.innerHTML = `
      <button type="button" data-abrir-aba="timeline">Linha temporal</button>
      <button type="button" data-abrir-aba="atendimentos">Atendimentos</button>
      <button type="button" data-abrir-aba="consultas">Consultas</button>
      <button type="button" data-abrir-aba="documentos">Documentos</button>
      <button type="button" data-abrir-aba="prazos">Prazos</button>
      <button type="button" data-abrir-aba="encaminhamentos">Encaminhamentos</button>
    `;

    cabecalho.parentNode.insertBefore(atalhos, cabecalho.nextSibling);
  }

  function prepararPainel(elemento, nome) {
    if (!elemento) return null;
    elemento.classList.add("painel-aba-caso");
    elemento.dataset.painelCaso = nome;
    return elemento;
  }

  function criarSeparadores() {
    if (document.getElementById("abasCaso")) return true;

    const resumo = document.getElementById("resumoCaso");
    const timeline = document.getElementById("painelTimelineCaso");
    const grelha = document.querySelector(".grelha-seccoes");

    if (!resumo || !timeline || !grelha) return false;

    const artigos = {
      atendimentos: document.getElementById("listaAtendimentos")?.closest("article"),
      consultas: document.getElementById("listaConsultas")?.closest("article"),
      prazos: document.getElementById("listaPrazos")?.closest("article"),
      documentos: document.getElementById("listaDocumentos")?.closest("article"),
      encaminhamentos: document.getElementById("listaEncaminhamentos")?.closest("article"),
      atribuicoes: document.getElementById("listaAtribuicoes")?.closest("article")
    };

    prepararPainel(resumo, "resumo");
    prepararPainel(timeline, "timeline");

    Object.keys(artigos).forEach(function (chave) {
      prepararPainel(artigos[chave], chave);
    });

    const abas = document.createElement("nav");
    abas.id = "abasCaso";
    abas.className = "abas-caso";
    abas.setAttribute("aria-label", "Secções da ficha do caso");
    abas.innerHTML = `
      <button type="button" data-aba-caso="resumo">Resumo</button>
      <button type="button" data-aba-caso="timeline">Linha temporal</button>
      <button type="button" data-aba-caso="atendimentos">Atendimentos</button>
      <button type="button" data-aba-caso="consultas">Consultas</button>
      <button type="button" data-aba-caso="prazos">Prazos</button>
      <button type="button" data-aba-caso="documentos">Documentos</button>
      <button type="button" data-aba-caso="encaminhamentos">Encaminhamentos</button>
      <button type="button" data-aba-caso="atribuicoes">Atribuições</button>
    `;

    const conteudo = document.createElement("div");
    conteudo.id = "conteudoAbasCaso";
    conteudo.className = "conteudo-abas-caso";

    const cartaoEstado = document.getElementById("cartaoEstadoCaso");
    const referencia = cartaoEstado || resumo;
    referencia.parentNode.insertBefore(abas, referencia.nextSibling);
    abas.parentNode.insertBefore(conteudo, abas.nextSibling);

    conteudo.appendChild(resumo);
    conteudo.appendChild(timeline);
    Object.keys(artigos).forEach(function (chave) {
      if (artigos[chave]) conteudo.appendChild(artigos[chave]);
    });

    if (grelha && !grelha.children.length) grelha.remove();

    function abrirAba(nome) {
      document.querySelectorAll("[data-painel-caso]").forEach(function (painel) {
        painel.hidden = painel.dataset.painelCaso !== nome;
      });

      document.querySelectorAll("[data-aba-caso]").forEach(function (botao) {
        const activa = botao.dataset.abaCaso === nome;
        botao.classList.toggle("aba-caso-activa", activa);
        botao.setAttribute("aria-selected", activa ? "true" : "false");
      });

      sessionStorage.setItem("JURISLAB_ABA_FICHA_CASO", nome);
    }

    abas.addEventListener("click", function (evento) {
      const botao = evento.target.closest("[data-aba-caso]");
      if (!botao) return;
      abrirAba(botao.dataset.abaCaso);
    });

    document.querySelectorAll("[data-abrir-aba]").forEach(function (botao) {
      botao.addEventListener("click", function () {
        abrirAba(botao.dataset.abrirAba);
        abas.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    const guardada = sessionStorage.getItem("JURISLAB_ABA_FICHA_CASO");
    const inicial = document.querySelector('[data-painel-caso="' + guardada + '"]') ? guardada : "resumo";
    abrirAba(inicial);
    return true;
  }

  function iniciar() {
    criarCartaoEstado();
    criarAtalhos();

    let tentativas = 0;
    const temporizador = setInterval(function () {
      tentativas++;
      criarCartaoEstado();

      if (criarSeparadores() || tentativas >= 20) {
        clearInterval(temporizador);
      }
    }, 250);
  }

  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(iniciar, 500);
  });
})();