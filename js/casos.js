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

function renderizarCasos(casos, lista, resumo, abrirModal) {
  if (!Array.isArray(casos) || casos.length === 0) {
    lista.innerHTML = '<div class="estado-vazio">Nenhum caso encontrado.</div>';
    resumo.textContent = "0 casos encontrados.";
    return;
  }

  resumo.textContent = casos.length + (casos.length === 1 ? " caso encontrado." : " casos encontrados.");

  lista.innerHTML = casos.map(function (caso, indice) {
    return `
      <article class="caso-cartao">
        <div class="caso-topo">
          <div>
            <h2>${escaparHtml(caso.tituloCaso || "Caso jurídico")}</h2>
            <span class="caso-codigo">${escaparHtml(caso.idCaso)}</span>
          </div>
          <div class="caso-etiquetas">
            <span>${escaparHtml(caso.estadoCaso || "Sem estado")}</span>
            <span>${escaparHtml(caso.prioridade || "Sem prioridade")}</span>
          </div>
        </div>

        <p class="caso-descricao">${escaparHtml(caso.descricaoCaso || "Sem descrição informada.")}</p>

        <div class="caso-dados">
          <span><strong>Área:</strong> ${escaparHtml(caso.areaDireito || "Não informada")}</span>
          <span><strong>Utente:</strong> ${escaparHtml(caso.idUtente || "")}</span>
          <span><strong>Triagem:</strong> ${escaparHtml(caso.idTriagem || "")}</span>
          <span><strong>Responsável:</strong> ${escaparHtml(caso.responsavel || "Não atribuído")}</span>
          <span><strong>Supervisor:</strong> ${escaparHtml(caso.supervisor || "Não atribuído")}</span>
          <span><strong>Prazo:</strong> ${escaparHtml(caso.prazo || "Não definido")}</span>
          <span><strong>Abertura:</strong> ${escaparHtml(caso.dataAbertura || "")}</span>
          <span><strong>Actualização:</strong> ${escaparHtml(caso.ultimaActualizacao || "")}</span>
        </div>

        <div class="caso-acoes">
          <button class="botao botao-principal" type="button" data-indice="${indice}">Registar atendimento</button>
        </div>
      </article>`;
  }).join("");

  lista.querySelectorAll("button[data-indice]").forEach(function (botao) {
    botao.addEventListener("click", function () {
      abrirModal(casos[Number(botao.dataset.indice)]);
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
  const lista = document.getElementById("listaCasos");
  const resumo = document.getElementById("resumoResultados");
  const mensagem = document.getElementById("mensagemCasos");

  const modal = document.getElementById("modalAtendimento");
  const btnFecharModal = document.getElementById("btnFecharModal");
  const btnCancelarAtendimento = document.getElementById("btnCancelarAtendimento");
  const formAtendimento = document.getElementById("formAtendimento");
  const btnGuardarAtendimento = document.getElementById("btnGuardarAtendimento");
  const mensagemAtendimento = document.getElementById("mensagemAtendimento");
  const resumoCasoSeleccionado = document.getElementById("resumoCasoSeleccionado");

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
    formAtendimento.reset();
    mostrarMensagem(mensagemAtendimento, "", "");
  }

  function abrirModal(caso) {
    document.getElementById("idCasoAtendimento").value = caso.idCaso || "";
    document.getElementById("idUtenteAtendimento").value = caso.idUtente || "";
    document.getElementById("responsavelAtendimento").value = caso.responsavel || "";
    document.getElementById("supervisorAtendimento").value = caso.supervisor || "";
    resumoCasoSeleccionado.textContent = (caso.idCaso || "") + " · " + (caso.tituloCaso || "Caso jurídico");
    mostrarMensagem(mensagemAtendimento, "", "");
    modal.classList.remove("oculto");
    document.getElementById("tipoAtendimento").focus();
  }

  async function carregarCasos() {
    resumo.textContent = "A carregar casos...";
    mostrarMensagem(mensagem, "", "");

    try {
      const resultado = await chamarApi({
        acao: "listarCasos",
        token: token,
        pesquisa: campoPesquisa.value.trim(),
        estado: filtroEstado.value
      });

      if (!resultado.sucesso) {
        mostrarMensagem(mensagem, resultado.mensagem || "Não foi possível carregar os casos.", "erro");
        lista.innerHTML = "";
        resumo.textContent = "";
        return;
      }

      renderizarCasos(resultado.casos || [], lista, resumo, abrirModal);
    } catch (erro) {
      mostrarMensagem(mensagem, "Não foi possível contactar o servidor. Tente novamente.", "erro");
      resumo.textContent = "";
    }
  }

  formFiltros.addEventListener("submit", function (evento) {
    evento.preventDefault();
    carregarCasos();
  });

  filtroEstado.addEventListener("change", carregarCasos);

  btnLimpar.addEventListener("click", function () {
    campoPesquisa.value = "";
    filtroEstado.value = "Todos";
    carregarCasos();
  });

  btnFecharModal.addEventListener("click", fecharModal);
  btnCancelarAtendimento.addEventListener("click", fecharModal);
  modal.addEventListener("click", function (evento) {
    if (evento.target === modal) fecharModal();
  });

  formAtendimento.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    if (!formAtendimento.checkValidity()) {
      formAtendimento.reportValidity();
      mostrarMensagem(mensagemAtendimento, "Preencha os campos obrigatórios.", "erro");
      return;
    }

    const dados = new FormData(formAtendimento);
    btnGuardarAtendimento.disabled = true;
    btnGuardarAtendimento.textContent = "A guardar...";
    mostrarMensagem(mensagemAtendimento, "", "");

    try {
      const resultado = await chamarApi({
        acao: "registarAtendimento",
        token: token,
        idCaso: dados.get("idCaso"),
        idUtente: dados.get("idUtente"),
        tipoAtendimento: dados.get("tipoAtendimento"),
        responsavel: dados.get("responsavel"),
        supervisor: dados.get("supervisor"),
        resumoAtendimento: dados.get("resumoAtendimento"),
        orientacaoPrestada: dados.get("orientacaoPrestada"),
        proximaAccao: dados.get("proximaAccao"),
        dataProximoContacto: dados.get("dataProximoContacto"),
        estado: dados.get("estado"),
        observacoes: dados.get("observacoes")
      });

      if (!resultado.sucesso) {
        mostrarMensagem(mensagemAtendimento, resultado.mensagem || "Não foi possível guardar o atendimento.", "erro");
        return;
      }

      mostrarMensagem(
        mensagemAtendimento,
        (resultado.mensagem || "Atendimento registado com sucesso.") +
          (resultado.idAtendimento ? " Código: " + resultado.idAtendimento : ""),
        "sucesso"
      );

      setTimeout(function () {
        fecharModal();
        carregarCasos();
      }, 1500);
    } catch (erro) {
      mostrarMensagem(mensagemAtendimento, "Não foi possível contactar o servidor. Tente novamente.", "erro");
    } finally {
      btnGuardarAtendimento.disabled = false;
      btnGuardarAtendimento.textContent = "Guardar atendimento";
    }
  });

  carregarCasos();
});
