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

  async function validarSessao(token) {
    const resposta = await fetch(API + "?acao=validarSessao&token=" + encodeURIComponent(token));
    if (!resposta.ok) throw new Error("Falha na validação da sessão");
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

  function mostrar(html) {
    document.getElementById("resultadoValidacao").innerHTML = html;
  }

  async function verificar(token, idCaso, codigo) {
    const resultado = await api({ acao: "listarCasos", token, pesquisa: idCaso, estado: "Todos" });
    const caso = (resultado.casos || []).find(i => String(i.idCaso || "") === idCaso);
    if (!caso) {
      mostrar(`<div class="resultado-erro"><strong>Relatório não confirmado</strong>Não foi encontrado um caso com o código <b>${esc(idCaso)}</b>.</div>`);
      return;
    }

    const esperado = codigoControlo(caso);
    if (String(codigo || "").trim().toUpperCase() !== esperado) {
      mostrar(`<div class="resultado-erro"><strong>Código de controlo não corresponde</strong>O caso existe, mas o código informado não corresponde ao código calculado para este registo.</div>`);
      return;
    }

    mostrar(`
      <div class="resultado-ok">
        <strong>Correspondência confirmada</strong>
        O código de controlo corresponde ao caso registado no JURISLAB Aconselha.
        <dl>
          <dt>Caso</dt><dd>${esc(caso.idCaso)}</dd>
          <dt>Título</dt><dd>${esc(caso.tituloCaso || "Não informado")}</dd>
          <dt>Estado</dt><dd>${esc(caso.estadoCaso || "Não informado")}</dd>
          <dt>Utente</dt><dd>${esc(caso.idUtente || "Não informado")}</dd>
          <dt>Abertura</dt><dd>${esc(caso.dataAbertura || "Não informada")}</dd>
          <dt>Código</dt><dd>${esc(esperado)}</dd>
        </dl>
      </div>
    `);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem(CHAVE_TOKEN);
    const ecra = document.getElementById("ecraValidacao");
    const form = document.getElementById("formValidacaoRelatorio");
    const btn = document.getElementById("btnValidarRelatorio");
    const campoCaso = document.getElementById("idCasoValidacao");
    const campoCodigo = document.getElementById("codigoValidacao");
    const parametros = new URLSearchParams(location.search);

    campoCaso.value = parametros.get("idCaso") || "";
    campoCodigo.value = parametros.get("codigo") || "";

    if (!token) {
      ecra.classList.add("oculto");
      mostrar('<div class="resultado-info"><strong>Autenticação necessária</strong>Para confirmar um relatório, entre primeiro no JURISLAB e volte a abrir esta página.</div>');
      return;
    }

    try {
      const sessao = await validarSessao(token);
      if (!sessao.sucesso || !sessao.valida) {
        ecra.classList.add("oculto");
        mostrar('<div class="resultado-info"><strong>Sessão expirada</strong>Entre novamente no JURISLAB antes de validar o documento.</div>');
        return;
      }
    } catch {
      ecra.classList.add("oculto");
      mostrar('<div class="resultado-erro"><strong>Não foi possível validar a sessão</strong>Tente novamente.</div>');
      return;
    }

    ecra.classList.add("oculto");

    form.addEventListener("submit", async evento => {
      evento.preventDefault();
      const idCaso = campoCaso.value.trim();
      const codigo = campoCodigo.value.trim();
      if (!idCaso || !codigo) return;

      btn.disabled = true;
      btn.textContent = "A verificar...";
      mostrar('<div class="resultado-info"><strong>A verificar</strong>A consultar o registo do caso...</div>');
      try {
        await verificar(token, idCaso, codigo);
      } catch {
        mostrar('<div class="resultado-erro"><strong>Falha de comunicação</strong>Não foi possível consultar o servidor.</div>');
      } finally {
        btn.disabled = false;
        btn.textContent = "Verificar";
      }
    });

    if (campoCaso.value && campoCodigo.value) {
      form.requestSubmit();
    }
  });
})();
