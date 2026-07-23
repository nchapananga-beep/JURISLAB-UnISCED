const API_JURISLAB = "https://script.google.com/macros/s/AKfycbyFzl8x8Kazn2ek0j5N8qF0f5beYNOSrNSfxx837FEF0do_gF3lzW3Z1UCvo9eeTROB/exec";
const CHAVE_SESSAO = "JURISLAB_TOKEN";
const CHAVE_UTILIZADOR = "JURISLAB_UTILIZADOR";

function limparSessaoLocal() {
  localStorage.removeItem(CHAVE_SESSAO);
  localStorage.removeItem(CHAVE_UTILIZADOR);
}

function irParaLogin() {
  location.href = "login.html";
}

async function validarSessao(token) {
  const resposta = await fetch(API_JURISLAB + "?acao=validarSessao&token=" + encodeURIComponent(token));
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

function escapar(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function mostrar(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.className = "mensagem-formulario";
  if (tipo) elemento.classList.add(tipo);
}

function dataParaCampo(valor) {
  if (!valor) return "";
  const texto = String(valor).trim();
  const partes = texto.split(/[\/.-]/);
  if (partes.length === 3 && partes[0].length <= 2) {
    return partes[2] + "-" + partes[1].padStart(2, "0") + "-" + partes[0].padStart(2, "0");
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : "";
}

function renderizar(itens, lista, resumo, abrirActualizacao) {
  if (!Array.isArray(itens) || !itens.length) {
    lista.innerHTML = '<div class="estado-vazio">Nenhum encaminhamento encontrado.</div>';
    resumo.textContent = "0 encaminhamentos encontrados.";
    return;
  }

  resumo.textContent = itens.length + (itens.length === 1 ? " encaminhamento encontrado." : " encaminhamentos encontrados.");

  lista.innerHTML = itens.map(function (item, indice) {
    return `
      <article class="encaminhamento-cartao">
        <div class="encaminhamento-topo">
          <div>
            <h2>${escapar(item.instituicaoDestino || "Instituição não informada")}</h2>
            <span class="encaminhamento-codigo">${escapar(item.idEncaminhamento)}</span>
          </div>
          <span class="estado-etiqueta">${escapar(item.estadoEncaminhamento || "Sem estado")}</span>
        </div>

        <p class="encaminhamento-motivo">${escapar(item.motivoEncaminhamento || "Sem motivo informado.")}</p>

        <div class="encaminhamento-dados">
          <span><strong>Caso:</strong> ${escapar(item.idCaso || "")}</span>
          <span><strong>Utente:</strong> ${escapar(item.idUtente || "")}</span>
          <span><strong>Data:</strong> ${escapar(item.dataEncaminhamento || "")}</span>
          <span><strong>Contacto:</strong> ${escapar(item.pessoaContacto || "Não informado")}</span>
          <span><strong>Telefone:</strong> ${escapar(item.telefoneContacto || "Não informado")}</span>
          <span><strong>Documento:</strong> ${escapar(item.documentoEmitido || "Não informado")}</span>
          <span><strong>Data de retorno:</strong> ${escapar(item.dataRetorno || "Não definida")}</span>
          <span><strong>Responsável:</strong> ${escapar(item.responsavel || "Não informado")}</span>
        </div>

        ${item.resultado ? `<div class="resultado-encaminhamento"><strong>Resultado:</strong> ${escapar(item.resultado)}</div>` : ""}

        <div class="encaminhamento-acoes">
          <button class="botao botao-principal" type="button" data-indice="${indice}">Actualizar acompanhamento</button>
        </div>
      </article>`;
  }).join("");

  lista.querySelectorAll("button[data-indice]").forEach(function (botao) {
    botao.addEventListener("click", function () {
      abrirActualizacao(itens[Number(botao.dataset.indice)]);
    });
  });
}

document.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem(CHAVE_SESSAO);
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
    document.getElementById("ecraValidacao").classList.add("oculto");
  } catch (erro) {
    limparSessaoLocal();
    irParaLogin();
    return;
  }

  const campo = document.getElementById("campoPesquisa");
  const filtro = document.getElementById("filtroEstado");
  const lista = document.getElementById("listaEncaminhamentos");
  const resumo = document.getElementById("resumoResultados");
  const mensagem = document.getElementById("mensagemEncaminhamentos");
  const modal = document.getElementById("modalActualizar");
  const formActualizar = document.getElementById("formActualizarEncaminhamento");
  const mensagemActualizacao = document.getElementById("mensagemActualizacao");
  const btnGuardar = document.getElementById("btnGuardarActualizacao");

  function fecharModal() {
    modal.classList.add("oculto");
    formActualizar.reset();
    mostrar(mensagemActualizacao, "", "");
  }

  function abrirModal(item) {
    document.getElementById("idEncaminhamentoActualizar").value = item.idEncaminhamento || "";
    document.getElementById("estadoEncaminhamentoActualizar").value = item.estadoEncaminhamento || "Encaminhado";
    document.getElementById("dataRetornoActualizar").value = dataParaCampo(item.dataRetorno);
    document.getElementById("responsavelActualizar").value = item.responsavel || "";
    document.getElementById("resultadoActualizar").value = item.resultado || "";
    document.getElementById("resumoEncaminhamentoSeleccionado").textContent = (item.idEncaminhamento || "") + " · " + (item.instituicaoDestino || "Instituição");
    modal.classList.remove("oculto");
  }

  async function carregar() {
    resumo.textContent = "A carregar encaminhamentos...";
    mostrar(mensagem, "", "");

    try {
      const resultado = await chamarApi({
        acao: "listarEncaminhamentos",
        token: token,
        pesquisa: campo.value.trim(),
        estado: filtro.value
      });

      if (!resultado.sucesso) {
        mostrar(mensagem, resultado.mensagem || "Não foi possível carregar os encaminhamentos.", "erro");
        lista.innerHTML = "";
        resumo.textContent = "";
        return;
      }

      renderizar(resultado.encaminhamentos || [], lista, resumo, abrirModal);
    } catch (erro) {
      mostrar(mensagem, "Não foi possível contactar o servidor.", "erro");
      resumo.textContent = "";
    }
  }

  document.getElementById("formFiltros").addEventListener("submit", function (evento) {
    evento.preventDefault();
    carregar();
  });

  filtro.addEventListener("change", carregar);

  document.getElementById("btnLimpar").addEventListener("click", function () {
    campo.value = "";
    filtro.value = "Todos";
    carregar();
  });

  document.getElementById("btnFecharActualizar").addEventListener("click", fecharModal);
  document.getElementById("btnCancelarActualizacao").addEventListener("click", fecharModal);
  modal.addEventListener("click", function (evento) {
    if (evento.target === modal) fecharModal();
  });

  formActualizar.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    if (!formActualizar.checkValidity()) {
      formActualizar.reportValidity();
      mostrar(mensagemActualizacao, "Seleccione o estado do encaminhamento.", "erro");
      return;
    }

    const dados = new FormData(formActualizar);
    btnGuardar.disabled = true;
    btnGuardar.textContent = "A guardar...";

    try {
      const resultado = await chamarApi({
        acao: "actualizarEncaminhamento",
        token: token,
        idEncaminhamento: dados.get("idEncaminhamento"),
        estadoEncaminhamento: dados.get("estadoEncaminhamento"),
        dataRetorno: dados.get("dataRetorno"),
        resultado: dados.get("resultado"),
        responsavel: dados.get("responsavel")
      });

      if (!resultado.sucesso) {
        mostrar(mensagemActualizacao, resultado.mensagem || "Não foi possível actualizar o encaminhamento.", "erro");
        return;
      }

      mostrar(mensagemActualizacao, resultado.mensagem || "Encaminhamento actualizado com sucesso.", "sucesso");
      setTimeout(function () {
        fecharModal();
        carregar();
      }, 1200);
    } catch (erro) {
      mostrar(mensagemActualizacao, "Não foi possível contactar o servidor.", "erro");
    } finally {
      btnGuardar.disabled = false;
      btnGuardar.textContent = "Guardar actualização";
    }
  });

  carregar();
});