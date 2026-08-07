(() => {
  "use strict";

  const API = "https://script.google.com/macros/s/AKfycbyFzl8x8Kazn2ek0j5N8qF0f5beYNOSrNSfxx837FEF0do_gF3lzW3Z1UCvo9eeTROB/exec";
  const CHAVE_TOKEN = "JURISLAB_TOKEN";

  const testes = [
    { id: "sessao", nome: "Sessão autenticada", tipo: "sessao" },
    { id: "resumo", nome: "Resumo do Dashboard", tipo: "api", dados: token => ({ acao: "obterResumoPainel", token }) },
    { id: "prazosResumo", nome: "Resumo de prazos", tipo: "api", dados: token => ({ acao: "obterResumoPrazosPainel", token }) },
    { id: "casos", nome: "Leitura de casos", tipo: "api", dados: token => ({ acao: "listarCasos", token, pesquisa: "", estado: "Todos" }) },
    { id: "pedidos", nome: "Leitura de pedidos públicos", tipo: "api", dados: token => ({ acao: "listarPedidosPublicos", token, pesquisa: "", estado: "Todos" }) },
    { id: "triagens", nome: "Leitura de triagens", tipo: "api", dados: token => ({ acao: "listarTriagens", token, pesquisa: "", estado: "Todos" }) },
    { id: "consultas", nome: "Leitura de consultas", tipo: "api", dados: token => ({ acao: "listarConsultas", token, pesquisa: "", estado: "Todos" }) },
    { id: "prazos", nome: "Leitura detalhada de prazos", tipo: "api", dados: token => ({ acao: "listarPrazos", token, pesquisa: "", estado: "Todos" }) },
    { id: "auditoria", nome: "Leitura de auditoria", tipo: "api", dados: token => ({ acao: "listarAuditoria", token, pesquisa: "", modulo: "", accao: "", resultado: "", dataInicio: "", dataFim: "", limite: 5 }) },
    { id: "paginaRelatorio", nome: "Página do relatório automático", tipo: "pagina", url: "relatorio-caso.html" },
    { id: "paginaNotificacoes", nome: "Centro de Notificações", tipo: "pagina", url: "notificacoes.html" },
    { id: "paginaValidacao", nome: "Validação interna de relatório", tipo: "pagina", url: "validar-relatorio.html" },
    { id: "paginaPesquisa", nome: "Pesquisa Global", tipo: "pagina", url: "pesquisa-global.html" },
    { id: "paginaDocumentos", nome: "Gestão documental", tipo: "pagina", url: "documentos-casos.html" }
  ];

  let estadoTestes = {};

  function esc(valor) {
    return String(valor || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  async function validarSessao(token) {
    const resposta = await fetch(API + "?acao=validarSessao&token=" + encodeURIComponent(token), { cache: "no-store" });
    if (!resposta.ok) throw new Error("HTTP " + resposta.status);
    return resposta.json();
  }

  async function api(dados) {
    const resposta = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(dados)
    });
    if (!resposta.ok) throw new Error("HTTP " + resposta.status);
    return resposta.json();
  }

  function permissaoNegada(mensagem) {
    const texto = String(mensagem || "").toLowerCase();
    return texto.includes("permiss") || texto.includes("autoriz") || texto.includes("acesso") || texto.includes("perfil");
  }

  function prepararLista() {
    const alvo = document.getElementById("listaTestesV1");
    alvo.innerHTML = testes.map(t => `
      <article id="teste_${esc(t.id)}" class="teste-v1-item pendente">
        <div class="teste-v1-estado">…</div>
        <div><h2>${esc(t.nome)}</h2><p>Aguardando execução.</p></div>
        <span class="teste-v1-detalhe">Pendente</span>
      </article>
    `).join("");
  }

  function definir(teste, estado, mensagem, detalhe) {
    estadoTestes[teste.id] = estado;
    const item = document.getElementById("teste_" + teste.id);
    if (!item) return;
    const icones = { aprovado: "✓", aviso: "!", falha: "×", pendente: "…" };
    item.className = "teste-v1-item " + estado;
    item.querySelector(".teste-v1-estado").textContent = icones[estado] || "…";
    item.querySelector("p").textContent = mensagem || "";
    item.querySelector(".teste-v1-detalhe").textContent = detalhe || estado;
    actualizarResumo();
  }

  function actualizarResumo() {
    const contar = e => Object.values(estadoTestes).filter(i => i === e).length;
    document.getElementById("testesAprovados").textContent = contar("aprovado");
    document.getElementById("testesAvisos").textContent = contar("aviso");
    document.getElementById("testesFalhas").textContent = contar("falha");
    document.getElementById("testesTotal").textContent = testes.length;
  }

  async function executarTeste(teste, token) {
    definir(teste, "pendente", "Em verificação...", "A testar");
    const inicio = performance.now();
    try {
      if (teste.tipo === "sessao") {
        const r = await validarSessao(token);
        if (r.sucesso && r.valida) definir(teste, "aprovado", "Sessão válida e reconhecida pelo servidor.", Math.round(performance.now() - inicio) + " ms");
        else definir(teste, "falha", r.mensagem || "A sessão não foi validada.", "Sessão inválida");
        return;
      }

      if (teste.tipo === "pagina") {
        const r = await fetch(teste.url + "?teste_v1=" + Date.now(), { cache: "no-store" });
        if (r.ok) definir(teste, "aprovado", "Página publicada e acessível.", "HTTP " + r.status);
        else definir(teste, "falha", "A página respondeu com erro.", "HTTP " + r.status);
        return;
      }

      const r = await api(teste.dados(token));
      if (r && r.sucesso === false) {
        if (permissaoNegada(r.mensagem)) definir(teste, "aviso", r.mensagem || "O perfil actual não possui permissão para esta leitura.", "Permissão");
        else definir(teste, "falha", r.mensagem || "A API respondeu com insucesso.", "Resposta da API");
      } else {
        definir(teste, "aprovado", "Leitura concluída sem erro.", Math.round(performance.now() - inicio) + " ms");
      }
    } catch (erro) {
      definir(teste, "falha", erro.message || "Falha de comunicação.", "Excepção");
    }
  }

  async function executarTodos(token) {
    estadoTestes = {};
    prepararLista();
    actualizarResumo();
    const btn = document.getElementById("btnExecutarTestes");
    btn.disabled = true;
    btn.textContent = "A testar...";

    for (const teste of testes) {
      await executarTeste(teste, token);
    }

    btn.disabled = false;
    btn.textContent = "Executar novamente";
  }

  document.addEventListener("DOMContentLoaded", async () => {
    prepararLista();
    actualizarResumo();
    const token = localStorage.getItem(CHAVE_TOKEN);
    const ecra = document.getElementById("ecraValidacao");
    if (!token) {
      location.href = "login.html";
      return;
    }

    try {
      const sessao = await validarSessao(token);
      if (!sessao.sucesso || !sessao.valida) {
        location.href = "login.html";
        return;
      }
    } catch {
      ecra.classList.add("oculto");
      return;
    }

    ecra.classList.add("oculto");
    document.getElementById("btnExecutarTestes").addEventListener("click", () => executarTodos(token));
    executarTodos(token);
  });
})();
