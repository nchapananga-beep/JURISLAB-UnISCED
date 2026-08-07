(() => {
  "use strict";

  const API = "https://script.google.com/macros/s/AKfycbyFzl8x8Kazn2ek0j5N8qF0f5beYNOSrNSfxx837FEF0do_gF3lzW3Z1UCvo9eeTROB/exec";
  const CHAVE_TOKEN = "JURISLAB_TOKEN";
  let notificacoes = [];
  let filtroActual = "todos";

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
      .trim().toLowerCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  async function validarSessao(token) {
    const resposta = await fetch(API + "?acao=validarSessao&token=" + encodeURIComponent(token));
    if (!resposta.ok) throw new Error("Falha na validação");
    return resposta.json();
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

  function dataNumero(valor) {
    const texto = String(valor || "").trim();
    if (!texto) return null;
    const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]).getTime();
    const pt = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (pt) return new Date(+pt[3], +pt[2] - 1, +pt[1]).getTime();
    const data = new Date(texto);
    return Number.isNaN(data.getTime()) ? null : data.getTime();
  }

  function hojeInicio() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function adicionar(tipo, titulo, texto, href, referencia, data) {
    notificacoes.push({ tipo, titulo, texto, href, referencia: referencia || "", data: data || "" });
  }

  function construirPedidos(lista) {
    (lista || []).forEach(item => {
      const estado = normalizar(item.estadoPedido || "pendente");
      if (estado === "pendente") {
        adicionar("atencao", "Pedido público por analisar", `${item.nomeCompleto || "Utente"} aguarda análise do pedido.`, "pedidos-publicos.html", item.idPedido, item.dataPedido);
      } else if (estado === "em analise") {
        adicionar("informativa", "Pedido público em análise", `${item.nomeCompleto || "Utente"} possui pedido em análise.`, "pedidos-publicos.html", item.idPedido, item.dataPedido);
      } else if (estado === "aceite") {
        adicionar("atencao", "Pedido aceite por converter", `O pedido ${item.idPedido || ""} foi aceite e pode ser convertido em Utente e Triagem.`, "pedidos-publicos.html", item.idPedido, item.dataPedido);
      }
    });
  }

  function construirTriagens(lista) {
    (lista || []).forEach(item => {
      const estado = normalizar(item.estadoTriagem || item.estado || "pendente");
      if (estado === "pendente") {
        adicionar("atencao", "Triagem pendente", `${item.nomeUtente || item.nomeCompleto || "Utente"} aguarda análise/decisão da triagem.`, "triagens-pendentes.html", item.idTriagem, item.dataTriagem || item.dataRegisto);
      }
    });
  }

  function construirCasos(lista) {
    (lista || []).forEach(item => {
      const estado = normalizar(item.estadoCaso || item.estado || "");
      const fechado = ["concluido", "encerrado", "arquivado"].includes(estado);
      if (!fechado && !String(item.responsavel || "").trim()) {
        adicionar("atencao", "Caso sem responsável", `${item.tituloCaso || item.idCaso || "Caso"} precisa de distribuição.`, "distribuicao-casos.html", item.idCaso, item.dataAbertura);
      }
    });
  }

  function construirPrazos(lista) {
    const hoje = hojeInicio();
    const seteDias = hoje + 7 * 86400000;
    (lista || []).forEach(item => {
      const estado = normalizar(item.situacao || item.estadoPrazo || item.estado || "");
      if (["cumprido", "concluido", "encerrado", "resolvido", "cancelado"].includes(estado)) return;
      const limite = dataNumero(item.dataLimite);
      if (estado === "vencido" || estado === "atrasado" || (limite != null && limite < hoje)) {
        adicionar("urgente", "Prazo vencido", `${item.descricaoPrazo || "Prazo"} do caso ${item.idCaso || ""} requer atenção imediata.`, "prazos.html?estado=Vencido", item.idPrazo || item.idCaso, item.dataLimite);
      } else if (limite != null && limite <= seteDias) {
        adicionar("atencao", "Prazo próximo do vencimento", `${item.descricaoPrazo || "Prazo"} vence em ${item.dataLimite || "breve"}.`, "prazos.html?estado=Próximo", item.idPrazo || item.idCaso, item.dataLimite);
      }
    });
  }

  function construirConsultas(lista) {
    const hoje = hojeInicio();
    const tresDias = hoje + 3 * 86400000;
    (lista || []).forEach(item => {
      const estado = normalizar(item.estadoConsulta || item.estado || "");
      if (["cancelada", "cancelado", "concluida", "concluido", "realizada", "realizado"].includes(estado)) return;
      const data = dataNumero(item.dataConsulta);
      if (data != null && data >= hoje && data <= tresDias) {
        const quando = data === hoje ? "hoje" : `em ${item.dataConsulta}`;
        adicionar("informativa", "Consulta próxima", `Consulta do caso ${item.idCaso || ""} marcada ${quando}${item.horaConsulta ? " às " + item.horaConsulta : ""}.`, "consultas.html", item.idConsulta || item.idCaso, item.dataConsulta);
      }
    });
  }

  function actualizarResumo() {
    const contagem = tipo => notificacoes.filter(i => i.tipo === tipo).length;
    document.getElementById("notUrgentes").textContent = contagem("urgente");
    document.getElementById("notAtencao").textContent = contagem("atencao");
    document.getElementById("notInformativas").textContent = contagem("informativa");
    document.getElementById("notTotal").textContent = notificacoes.length;
  }

  function renderizar() {
    const lista = document.getElementById("listaNotificacoes");
    const itens = filtroActual === "todos" ? notificacoes : notificacoes.filter(i => i.tipo === filtroActual);
    if (!itens.length) {
      lista.innerHTML = '<div class="estado-vazio">Não existem notificações nesta categoria.</div>';
      return;
    }

    const peso = { urgente: 0, atencao: 1, informativa: 2 };
    const ordenados = [...itens].sort((a, b) => (peso[a.tipo] ?? 9) - (peso[b.tipo] ?? 9));
    const icones = { urgente: "!", atencao: "●", informativa: "i" };

    lista.innerHTML = ordenados.map(item => `
      <article class="notificacao-item ${esc(item.tipo)}">
        <div class="notificacao-icone" aria-hidden="true">${icones[item.tipo] || "i"}</div>
        <div class="notificacao-conteudo">
          <h2>${esc(item.titulo)}</h2>
          <p>${esc(item.texto)}</p>
          ${item.referencia || item.data ? `<small>${esc([item.referencia, item.data].filter(Boolean).join(" · "))}</small>` : ""}
        </div>
        <a class="notificacao-acao" href="${esc(item.href)}">Abrir</a>
      </article>
    `).join("");
  }

  async function carregar(token) {
    const mensagem = document.getElementById("mensagemNotificacoes");
    mensagem.textContent = "";
    document.getElementById("listaNotificacoes").innerHTML = '<div class="estado-vazio">A actualizar notificações...</div>';

    const resultados = await Promise.allSettled([
      api({ acao: "listarPedidosPublicos", token, pesquisa: "", estado: "Todos" }),
      api({ acao: "listarTriagens", token, pesquisa: "", estado: "Todos" }),
      api({ acao: "listarCasos", token, pesquisa: "", estado: "Todos" }),
      api({ acao: "listarPrazos", token, pesquisa: "", estado: "Todos" }),
      api({ acao: "listarConsultas", token, pesquisa: "", estado: "Todos" })
    ]);

    const valor = i => resultados[i].status === "fulfilled" ? resultados[i].value : {};
    notificacoes = [];
    construirPedidos(valor(0).pedidos || []);
    construirTriagens(valor(1).triagens || []);
    construirCasos(valor(2).casos || []);
    construirPrazos(valor(3).prazos || []);
    construirConsultas(valor(4).consultas || []);
    actualizarResumo();
    renderizar();

    const falhas = resultados.filter(i => i.status === "rejected").length;
    if (falhas) mensagem.textContent = `${falhas} fonte(s) não puderam ser consultadas. As restantes notificações foram carregadas.`;
  }

  document.addEventListener("DOMContentLoaded", async () => {
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
      location.href = "login.html";
      return;
    }

    ecra.classList.add("oculto");

    document.querySelectorAll("[data-filtro]").forEach(botao => {
      botao.addEventListener("click", () => {
        filtroActual = botao.dataset.filtro;
        document.querySelectorAll("[data-filtro]").forEach(i => i.classList.toggle("activo", i === botao));
        renderizar();
      });
    });

    document.getElementById("btnActualizarNotificacoes").addEventListener("click", () => carregar(token));
    carregar(token).catch(() => {
      document.getElementById("listaNotificacoes").innerHTML = '<div class="estado-vazio">Não foi possível carregar as notificações.</div>';
    });
  });
})();
