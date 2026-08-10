const TF_API_URL = window.JURISLAB_CONFIG?.API_URL || "";
const TF_CHAVE_SESSAO = "JURISLAB_TOKEN";
const TF_CHAVE_UTILIZADOR = "JURISLAB_UTILIZADOR";

function tfMensagem(elemento, texto, tipo) {
  if (!elemento) return;
  elemento.textContent = texto || "";
  elemento.classList.remove("sucesso", "erro");
  if (tipo) elemento.classList.add(tipo);
}

function tfEscapar(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function tfFormatarData(valor) {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return tfEscapar(valor);
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(data);
}

async function tfChamarApi(dados) {
  if (!TF_API_URL) {
    throw new Error("A API do JURISLAB não está configurada.");
  }

  const resposta = await fetch(TF_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(dados)
  });

  if (!resposta.ok) {
    throw new Error("Não foi possível contactar o servidor.");
  }

  const resultado = await resposta.json();

  if (resultado?.sessaoExpirada) {
    localStorage.removeItem(TF_CHAVE_SESSAO);
    localStorage.removeItem(TF_CHAVE_UTILIZADOR);
    window.location.replace("login.html");
    throw new Error("Sessão expirada.");
  }

  return resultado;
}

function tfObterUtilizadorLocal() {
  try {
    return JSON.parse(localStorage.getItem(TF_CHAVE_UTILIZADOR) || "null");
  } catch (erro) {
    return null;
  }
}

function tfAbrirModal(modal) {
  modal.classList.remove("oculto");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("tribunal-modal-aberto");
}

function tfFecharModal(modal) {
  modal.classList.add("oculto");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("tribunal-modal-aberto");
}

function tfRenderizarProcessos(processos) {
  const lista = document.getElementById("listaProcessosTF");
  const total = document.getElementById("totalProcessosTF");

  total.textContent = `${processos.length} ${processos.length === 1 ? "processo" : "processos"}`;

  if (!processos.length) {
    lista.innerHTML = `
      <div class="tribunal-vazio">
        <strong>Nenhum processo encontrado.</strong>
        <p>Altere os filtros ou registe um novo processo simulado.</p>
      </div>
    `;
    return;
  }

  lista.innerHTML = processos.map(function (processo) {
    return `
      <article class="tribunal-processo-item">
        <div class="tribunal-processo-identificacao">
          <span class="tribunal-processo-numero">${tfEscapar(processo.Numero_Processo || processo.ID_Processo)}</span>
          <h3>${tfEscapar(processo.Titulo_Processo || "Processo sem título")}</h3>
          <p>${tfEscapar(processo.Autor || "—")} <strong>vs.</strong> ${tfEscapar(processo.Reu || "—")}</p>
        </div>
        <div class="tribunal-processo-dados">
          <div><span>Área</span><strong>${tfEscapar(processo.Area_Direito || "—")}</strong></div>
          <div><span>Estado</span><strong class="tribunal-estado">${tfEscapar(processo.Estado || "—")}</strong></div>
          <div><span>Fase</span><strong>${tfEscapar(processo.Fase_Processual || "—")}</strong></div>
          <div><span>Registo</span><strong>${tfFormatarData(processo.Data_Registo)}</strong></div>
        </div>
      </article>
    `;
  }).join("");
}

document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem(TF_CHAVE_SESSAO);

  if (!token) {
    window.location.replace("login.html");
    return;
  }

  const utilizador = tfObterUtilizadorLocal();
  const mensagemLista = document.getElementById("mensagemProcessosTF");
  const mensagemForm = document.getElementById("mensagemNovoProcessoTF");
  const modal = document.getElementById("modalNovoProcessoTF");
  const form = document.getElementById("formNovoProcessoTF");
  const btnGuardar = document.getElementById("btnGuardarNovoProcesso");
  const btnAbrir = document.getElementById("btnAbrirNovoProcesso");
  const btnFechar = document.getElementById("btnFecharNovoProcesso");
  const btnCancelar = document.getElementById("btnCancelarNovoProcesso");
  const btnPesquisar = document.getElementById("btnPesquisarTF");
  const btnSair = document.getElementById("btnSairTF");

  async function carregarProcessos() {
    tfMensagem(mensagemLista, "A carregar processos...", "");

    try {
      const resultado = await tfChamarApi({
        acao: "tfListarProcessos",
        token: token,
        pesquisa: document.getElementById("tfPesquisa").value.trim(),
        estado: document.getElementById("tfEstado").value,
        areaDireito: document.getElementById("tfArea").value
      });

      if (!resultado.sucesso) {
        tfRenderizarProcessos([]);
        tfMensagem(mensagemLista, resultado.mensagem || "Não foi possível carregar os processos.", "erro");
        return;
      }

      tfRenderizarProcessos(Array.isArray(resultado.processos) ? resultado.processos : []);
      tfMensagem(mensagemLista, "", "");
    } catch (erro) {
      tfRenderizarProcessos([]);
      if (erro.message !== "Sessão expirada.") {
        tfMensagem(mensagemLista, "Não foi possível carregar os processos. Verifique a ligação e tente novamente.", "erro");
      }
    }
  }

  btnAbrir.addEventListener("click", function () {
    tfMensagem(mensagemForm, "", "");
    tfAbrirModal(modal);
    setTimeout(function () {
      document.getElementById("tipoProcessoTF").focus();
    }, 50);
  });

  [btnFechar, btnCancelar].forEach(function (botao) {
    botao.addEventListener("click", function () {
      tfFecharModal(modal);
    });
  });

  modal.addEventListener("click", function (evento) {
    if (evento.target.dataset.fecharModal === "true") {
      tfFecharModal(modal);
    }
  });

  document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape" && !modal.classList.contains("oculto")) {
      tfFecharModal(modal);
    }
  });

  form.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    btnGuardar.disabled = true;
    btnGuardar.textContent = "A criar...";
    tfMensagem(mensagemForm, "", "");

    try {
      const resultado = await tfChamarApi({
        acao: "tfCriarProcesso",
        token: token,
        tipoProcesso: document.getElementById("tipoProcessoTF").value,
        areaDireito: document.getElementById("areaDireitoTF").value,
        tituloProcesso: document.getElementById("tituloProcessoTF").value.trim(),
        autor: document.getElementById("autorTF").value.trim(),
        reu: document.getElementById("reuTF").value.trim(),
        responsavel: document.getElementById("responsavelTF").value.trim(),
        tutor: document.getElementById("tutorTF").value.trim(),
        juiz: document.getElementById("juizTF").value.trim(),
        observacoes: document.getElementById("observacoesTF").value.trim(),
        emailUsuario: utilizador?.email || utilizador?.Email || ""
      });

      if (!resultado.sucesso) {
        tfMensagem(mensagemForm, resultado.mensagem || "Não foi possível criar o processo.", "erro");
        return;
      }

      tfMensagem(
        mensagemForm,
        `Processo ${resultado.numeroProcesso || resultado.idProcesso} criado com sucesso.`,
        "sucesso"
      );

      form.reset();
      await carregarProcessos();

      setTimeout(function () {
        tfFecharModal(modal);
      }, 900);
    } catch (erro) {
      if (erro.message !== "Sessão expirada.") {
        tfMensagem(mensagemForm, "Não foi possível criar o processo. Tente novamente.", "erro");
      }
    } finally {
      btnGuardar.disabled = false;
      btnGuardar.textContent = "Criar processo";
    }
  });

  btnPesquisar.addEventListener("click", carregarProcessos);

  document.getElementById("tfPesquisa").addEventListener("keydown", function (evento) {
    if (evento.key === "Enter") carregarProcessos();
  });

  btnSair.addEventListener("click", function () {
    localStorage.removeItem(TF_CHAVE_SESSAO);
    localStorage.removeItem(TF_CHAVE_UTILIZADOR);
    window.location.replace("login.html");
  });

  carregarProcessos();
});
