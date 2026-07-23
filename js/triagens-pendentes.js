const API_JURISLAB = "https://script.google.com/macros/s/AKfycbyFzl8x8Kazn2ek0j5N8qF0f5beYNOSrNSfxx837FEF0do_gF3lzW3Z1UCvo9eeTROB/exec";
const CHAVE_SESSAO = "JURISLAB_TOKEN";
const CHAVE_UTILIZADOR = "JURISLAB_UTILIZADOR";

function limparSessaoLocal() {
  localStorage.removeItem(CHAVE_SESSAO);
  localStorage.removeItem(CHAVE_UTILIZADOR);
}

function irParaLogin() {
  window.location.href = "login.html";
}

async function validarSessao(token) {
  const url = API_JURISLAB + "?acao=validarSessao&token=" + encodeURIComponent(token);
  const resposta = await fetch(url, { method: "GET" });
  if (!resposta.ok) throw new Error("Falha na validação da sessão.");
  return resposta.json();
}

async function chamarApi(dados) {
  const resposta = await fetch(API_JURISLAB, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(dados)
  });

  if (!resposta.ok) throw new Error("Não foi possível contactar o servidor.");
  return resposta.json();
}

function escaparHtml(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function mostrarMensagem(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.className = "mensagem-formulario";
  if (tipo) elemento.classList.add(tipo);
}

function renderizarTriagens(triagens, lista, resumo, abrirModal) {
  if (!Array.isArray(triagens) || triagens.length === 0) {
    lista.innerHTML = '<div class="estado-vazio">Nenhuma triagem encontrada.</div>';
    resumo.textContent = "0 triagens encontradas.";
    return;
  }

  resumo.textContent = triagens.length + (triagens.length === 1 ? " triagem encontrada." : " triagens encontradas.");

  lista.innerHTML = triagens.map(function (triagem, indice) {
    const podeAbrirCaso = triagem.estadoTriagem === "Pendente" || triagem.estadoTriagem === "Em análise";

    return `
      <article class="triagem-cartao">
        <div class="triagem-topo">
          <div>
            <h2>${escaparHtml(triagem.nomeUtente || "Utente")}</h2>
            <span class="triagem-codigo">${escaparHtml(triagem.idTriagem)}</span>
          </div>
          <div class="triagem-metadados">
            <span class="triagem-estado">${escaparHtml(triagem.estadoTriagem || "Sem estado")}</span>
            <span class="triagem-urgencia">${escaparHtml(triagem.urgencia || "Sem prioridade")}</span>
          </div>
        </div>

        <p class="triagem-resumo">${escaparHtml(triagem.resumoProblema || "Sem resumo informado.")}</p>

        <div class="triagem-dados">
          <span><strong>Área:</strong> ${escaparHtml(triagem.areaDireito || "Não informada")}</span>
          <span><strong>Utente:</strong> ${escaparHtml(triagem.idUtente || "")}</span>
          <span><strong>Data:</strong> ${escaparHtml(triagem.dataTriagem || "")}</span>
          <span><strong>Documentos:</strong> ${escaparHtml(triagem.existemDocumentos || "Não informado")}</span>
          <span><strong>Risco imediato:</strong> ${escaparHtml(triagem.riscoImediato || "Não informado")}</span>
          <span><strong>Apoio:</strong> ${escaparHtml(triagem.tipoApoio || "Não informado")}</span>
        </div>

        ${podeAbrirCaso ? `
          <div class="triagem-acoes">
            <button class="botao botao-principal" type="button" data-indice="${indice}">Abrir caso</button>
          </div>` : ""}
      </article>`;
  }).join("");

  lista.querySelectorAll("button[data-indice]").forEach(function (botao) {
    botao.addEventListener("click", function () {
      abrirModal(triagens[Number(botao.dataset.indice)]);
    });
  });
}

document.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem(CHAVE_SESSAO);
  const ecraValidacao = document.getElementById("ecraValidacao");
  const formFiltros = document.getElementById("formFiltros");
  const campoPesquisa = document.getElementById("campoPesquisa");
  const filtroEstado = document.getElementById("filtroEstado");
  const btnLimpar = document.getElementById("btnLimpar");
  const lista = document.getElementById("listaTriagens");
  const resumo = document.getElementById("resumoResultados");
  const mensagem = document.getElementById("mensagemTriagens");

  const modal = document.getElementById("modalCaso");
  const btnFecharModal = document.getElementById("btnFecharModal");
  const btnCancelarCaso = document.getElementById("btnCancelarCaso");
  const formAbrirCaso = document.getElementById("formAbrirCaso");
  const btnConfirmarCaso = document.getElementById("btnConfirmarCaso");
  const mensagemCaso = document.getElementById("mensagemCaso");
  const resumoTriagemSeleccionada = document.getElementById("resumoTriagemSeleccionada");

  if (!token) {
    limparSessaoLocal();
    irParaLogin();
    return;
  }

  try {
    const sessao = await validarSessao(token);
    if (!sessao.sucesso || !sessao.valida) {
      limparSessaoLocal();
      irParaLogin();
      return;
    }
    ecraValidacao.classList.add("oculto");
  } catch (erro) {
    limparSessaoLocal();
    irParaLogin();
    return;
  }

  function fecharModal() {
    modal.classList.add("oculto");
    formAbrirCaso.reset();
    mostrarMensagem(mensagemCaso, "", "");
  }

  function abrirModal(triagem) {
    document.getElementById("idTriagemCaso").value = triagem.idTriagem || "";
    document.getElementById("idUtenteCaso").value = triagem.idUtente || "";
    document.getElementById("tituloCaso").value = triagem.areaDireito ? triagem.areaDireito + " - " + triagem.nomeUtente : triagem.nomeUtente;
    document.getElementById("areaDireitoCaso").value = triagem.areaDireito || "";
    document.getElementById("descricaoCaso").value = triagem.resumoProblema || "";
    document.getElementById("prioridadeCaso").value = triagem.urgencia || "Média";
    resumoTriagemSeleccionada.textContent = (triagem.idTriagem || "") + " · " + (triagem.nomeUtente || "Utente");
    mostrarMensagem(mensagemCaso, "", "");
    modal.classList.remove("oculto");
    document.getElementById("tituloCaso").focus();
  }

  async function carregarTriagens() {
    resumo.textContent = "A carregar triagens...";
    mostrarMensagem(mensagem, "", "");

    try {
      const resultado = await chamarApi({
        acao: "listarTriagens",
        token: token,
        pesquisa: campoPesquisa.value.trim(),
        estado: filtroEstado.value
      });

      if (!resultado.sucesso) {
        mostrarMensagem(mensagem, resultado.mensagem || "Não foi possível carregar as triagens.", "erro");
        lista.innerHTML = "";
        resumo.textContent = "";
        return;
      }

      renderizarTriagens(resultado.triagens || [], lista, resumo, abrirModal);
    } catch (erro) {
      mostrarMensagem(mensagem, "Não foi possível contactar o servidor. Tente novamente.", "erro");
      resumo.textContent = "";
    }
  }

  formFiltros.addEventListener("submit", function (evento) {
    evento.preventDefault();
    carregarTriagens();
  });

  filtroEstado.addEventListener("change", carregarTriagens);

  btnLimpar.addEventListener("click", function () {
    campoPesquisa.value = "";
    filtroEstado.value = "Pendente";
    carregarTriagens();
  });

  btnFecharModal.addEventListener("click", fecharModal);
  btnCancelarCaso.addEventListener("click", fecharModal);
  modal.addEventListener("click", function (evento) {
    if (evento.target === modal) fecharModal();
  });

  formAbrirCaso.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    if (!formAbrirCaso.checkValidity()) {
      formAbrirCaso.reportValidity();
      mostrarMensagem(mensagemCaso, "Preencha os campos obrigatórios.", "erro");
      return;
    }

    const dados = new FormData(formAbrirCaso);
    btnConfirmarCaso.disabled = true;
    btnConfirmarCaso.textContent = "A abrir...";
    mostrarMensagem(mensagemCaso, "", "");

    try {
      const resultado = await chamarApi({
        acao: "abrirCaso",
        token: token,
        idTriagem: dados.get("idTriagem"),
        idUtente: dados.get("idUtente"),
        tituloCaso: dados.get("tituloCaso"),
        areaDireito: dados.get("areaDireito"),
        descricaoCaso: dados.get("descricaoCaso"),
        prioridade: dados.get("prioridade"),
        responsavel: dados.get("responsavel"),
        supervisor: dados.get("supervisor"),
        prazo: dados.get("prazo")
      });

      if (!resultado.sucesso) {
        mostrarMensagem(mensagemCaso, resultado.mensagem || "Não foi possível abrir o caso.", "erro");
        return;
      }

      mostrarMensagem(
        mensagemCaso,
        (resultado.mensagem || "Caso aberto com sucesso.") + (resultado.idCaso ? " Código: " + resultado.idCaso : ""),
        "sucesso"
      );

      setTimeout(function () {
        fecharModal();
        carregarTriagens();
      }, 1500);
    } catch (erro) {
      mostrarMensagem(mensagemCaso, "Não foi possível contactar o servidor. Tente novamente.", "erro");
    } finally {
      btnConfirmarCaso.disabled = false;
      btnConfirmarCaso.textContent = "Abrir caso";
    }
  });

  carregarTriagens();
});
