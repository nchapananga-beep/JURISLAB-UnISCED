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

  async function chamarApi(dados) {
    const resposta = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(dados)
    });
    if (!resposta.ok) throw new Error("Falha no servidor");
    return resposta.json();
  }

  function criarPainel() {
    if (document.getElementById("painelAuditoriaCaso")) return document.getElementById("painelAuditoriaCaso");

    const grelha = document.querySelector(".grelha-seccoes");
    if (!grelha) return null;

    const artigo = document.createElement("article");
    artigo.id = "painelAuditoriaCaso";
    artigo.className = "seccao-ficha painel-auditoria-caso";
    artigo.innerHTML = '<h2>Auditoria</h2><p class="texto-apoio-auditoria">Registo de operações efectuadas sobre este caso.</p><div id="listaAuditoriaCaso"><div class="estado-vazio">A carregar auditoria...</div></div>';
    grelha.appendChild(artigo);
    return artigo;
  }

  function instalarAba() {
    const painel = document.getElementById("painelAuditoriaCaso");
    const abas = document.getElementById("abasCaso");
    const conteudo = document.getElementById("conteudoAbasCaso");
    if (!painel || !abas || !conteudo) return false;

    if (!painel.dataset.painelCaso) {
      painel.classList.add("painel-aba-caso");
      painel.dataset.painelCaso = "auditoria";
      painel.hidden = true;
      conteudo.appendChild(painel);
    }

    if (!abas.querySelector('[data-aba-caso="auditoria"]')) {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.dataset.abaCaso = "auditoria";
      botao.textContent = "Auditoria";
      abas.appendChild(botao);
    }

    const atalhos = document.getElementById("atalhosCaso");
    if (atalhos && !atalhos.querySelector('[data-abrir-auditoria="1"]')) {
      const atalho = document.createElement("button");
      atalho.type = "button";
      atalho.dataset.abrirAuditoria = "1";
      atalho.textContent = "Auditoria";
      atalho.addEventListener("click", function () {
        const botao = abas.querySelector('[data-aba-caso="auditoria"]');
        if (botao) botao.click();
        abas.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      atalhos.appendChild(atalho);
    }

    return true;
  }

  function removerAuditoria() {
    document.getElementById("painelAuditoriaCaso")?.remove();
    document.querySelector('[data-aba-caso="auditoria"]')?.remove();
    document.querySelector('[data-abrir-auditoria="1"]')?.remove();
  }

  function renderizar(lista) {
    const alvo = document.getElementById("listaAuditoriaCaso");
    if (!alvo) return;

    if (!Array.isArray(lista) || !lista.length) {
      alvo.innerHTML = '<div class="estado-vazio">Ainda não existem registos de auditoria para este caso.</div>';
      return;
    }

    alvo.innerHTML = lista.map(function (item) {
      const data = item.dataHora || item.data || item.dataRegisto || "";
      const utilizador = item.nomeUtilizador || item.utilizador || item.email || "Utilizador não identificado";
      const accao = item.accao || item.acao || item.operacao || "Alteração";
      const detalhe = item.detalhe || item.descricao || item.observacao || "";
      return `<div class="item-auditoria"><div class="auditoria-cabecalho"><strong>${esc(accao)}</strong><span>${esc(data)}</span></div><p><b>Utilizador:</b> ${esc(utilizador)}</p>${detalhe ? `<p>${esc(detalhe)}</p>` : ""}</div>`;
    }).join("");
  }

  async function carregarAuditoria() {
    const token = localStorage.getItem(CHAVE_TOKEN);
    const idCaso = new URLSearchParams(location.search).get("idCaso") || "";
    if (!token || !idCaso) return;

    try {
      const resultado = await chamarApi({
        acao: "listarAuditoria",
        token,
        pesquisa: idCaso,
        modulo: "Todos",
        resultado: "Todos",
        dataInicial: "",
        dataFinal: ""
      });

      if (!resultado.sucesso) {
        const mensagem = String(resultado.mensagem || "").toLowerCase();
        if (mensagem.includes("permiss")) {
          removerAuditoria();
          return;
        }
        renderizar([]);
        return;
      }

      renderizar(resultado.registos || []);
    } catch (erro) {
      const alvo = document.getElementById("listaAuditoriaCaso");
      if (alvo) alvo.innerHTML = '<div class="estado-vazio">Não foi possível carregar a auditoria neste momento.</div>';
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    criarPainel();

    const observador = new MutationObserver(function () {
      if (instalarAba()) observador.disconnect();
    });

    observador.observe(document.body, { childList: true, subtree: true });
    instalarAba();
    setTimeout(carregarAuditoria, 1000);
  });
})();