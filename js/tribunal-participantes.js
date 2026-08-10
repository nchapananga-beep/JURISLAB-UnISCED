const TF_API_URL = window.JURISLAB_CONFIG?.API_URL || "";
const TF_CHAVE_SESSAO = "JURISLAB_TOKEN";
const TF_CHAVE_UTILIZADOR = "JURISLAB_UTILIZADOR";

function tfpMensagem(elemento, texto, tipo) {
  if (!elemento) return;
  elemento.textContent = texto || "";
  elemento.classList.remove("sucesso", "erro");
  if (tipo) elemento.classList.add(tipo);
}

function tfpEscapar(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function tfpFormatarData(valor) {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return tfpEscapar(valor);
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(data);
}

async function tfpChamarApi(dados) {
  if (!TF_API_URL) throw new Error("A API do JURISLAB não está configurada.");
  const resposta = await fetch(TF_API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(dados)
  });
  if (!resposta.ok) throw new Error("Não foi possível contactar o servidor.");
  const resultado = await resposta.json();
  if (resultado?.sessaoExpirada) {
    localStorage.removeItem(TF_CHAVE_SESSAO);
    localStorage.removeItem(TF_CHAVE_UTILIZADOR);
    window.location.replace("login.html");
    throw new Error("Sessão expirada.");
  }
  return resultado;
}

function tfpAbrirModal(modal) {
  modal.classList.remove("oculto");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("tribunal-modal-aberto");
}

function tfpFecharModal(modal) {
  modal.classList.add("oculto");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("tribunal-modal-aberto");
}

function tfpRenderizarParticipantes(participantes) {
  const lista = document.getElementById("listaParticipantesTF");
  const total = document.getElementById("totalParticipantesTF");
  total.textContent = `${participantes.length} ${participantes.length === 1 ? "participante" : "participantes"}`;

  if (!participantes.length) {
    lista.innerHTML = `<div class="tribunal-vazio"><strong>Ainda não há participantes.</strong><p>Adicione os membros da equipa deste processo.</p></div>`;
    return;
  }

  lista.innerHTML = participantes.map(function (p) {
    const ativo = String(p.Estado || "").toLowerCase() === "activo";
    return `
      <article class="tribunal-participante-item">
        <div class="tribunal-participante-principal">
          <div class="tribunal-avatar">${tfpEscapar((p.Nome || "?").charAt(0).toUpperCase())}</div>
          <div>
            <h3>${tfpEscapar(p.Nome || "Sem nome")}</h3>
            <p>${tfpEscapar(p.Email_Utilizador || "Sem email")}</p>
          </div>
        </div>
        <div class="tribunal-participante-dados">
          <div><span>Papel</span><strong>${tfpEscapar(p.Papel_Processual || "—")}</strong></div>
          <div><span>Equipa</span><strong>${tfpEscapar(p.Equipa || "—")}</strong></div>
          <div><span>Entrada</span><strong>${tfpFormatarData(p.Data_Entrada)}</strong></div>
          <div><span>Estado</span><strong class="${ativo ? "tribunal-estado-activo" : ""}">${tfpEscapar(p.Estado || "—")}</strong></div>
        </div>
      </article>`;
  }).join("");
}

document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem(TF_CHAVE_SESSAO);
  if (!token) { window.location.replace("login.html"); return; }

  const params = new URLSearchParams(window.location.search);
  const idProcesso = String(params.get("idProcesso") || "").trim();
  if (!idProcesso) {
    window.location.replace("tribunal-processos.html");
    return;
  }

  const mensagemLista = document.getElementById("mensagemParticipantesTF");
  const mensagemForm = document.getElementById("mensagemNovoParticipanteTF");
  const modal = document.getElementById("modalNovoParticipanteTF");
  const form = document.getElementById("formNovoParticipanteTF");
  const btnAbrir = document.getElementById("btnAbrirNovoParticipante");
  const btnFechar = document.getElementById("btnFecharNovoParticipante");
  const btnCancelar = document.getElementById("btnCancelarNovoParticipante");
  const btnGuardar = document.getElementById("btnGuardarNovoParticipante");
  const btnPesquisar = document.getElementById("btnPesquisarParticipante");
  const btnSair = document.getElementById("btnSairTF");

  async function carregarProcesso() {
    try {
      const resultado = await tfpChamarApi({ acao: "tfObterProcesso", token: token, idProcesso: idProcesso });
      if (!resultado.sucesso || !resultado.processo) throw new Error(resultado.mensagem || "Processo não encontrado.");
      const p = resultado.processo;
      document.getElementById("tituloProcessoParticipantes").textContent = p.Titulo_Processo || p.Numero_Processo || idProcesso;
      document.getElementById("subtituloProcessoParticipantes").textContent = `${p.Autor || "—"} vs. ${p.Reu || "—"}`;
      document.getElementById("resumoNumeroProcesso").textContent = p.Numero_Processo || idProcesso;
      document.getElementById("resumoEstadoProcesso").textContent = p.Estado || "—";
      document.getElementById("resumoFaseProcesso").textContent = p.Fase_Processual || "—";
      document.getElementById("resumoAreaProcesso").textContent = p.Area_Direito || "—";
    } catch (erro) {
      tfpMensagem(mensagemLista, erro.message || "Não foi possível carregar o processo.", "erro");
    }
  }

  async function carregarParticipantes() {
    tfpMensagem(mensagemLista, "A carregar participantes...", "");
    try {
      const resultado = await tfpChamarApi({
        acao: "tfListarParticipantes",
        token: token,
        idProcesso: idProcesso,
        pesquisa: document.getElementById("tfPesquisaParticipante").value.trim(),
        equipa: document.getElementById("tfEquipaParticipante").value,
        estado: document.getElementById("tfEstadoParticipante").value
      });
      if (!resultado.sucesso) {
        tfpRenderizarParticipantes([]);
        tfpMensagem(mensagemLista, resultado.mensagem || "Não foi possível carregar os participantes.", "erro");
        return;
      }
      tfpRenderizarParticipantes(Array.isArray(resultado.participantes) ? resultado.participantes : []);
      tfpMensagem(mensagemLista, "", "");
    } catch (erro) {
      tfpRenderizarParticipantes([]);
      if (erro.message !== "Sessão expirada.") tfpMensagem(mensagemLista, "Não foi possível carregar os participantes. Tente novamente.", "erro");
    }
  }

  btnAbrir.addEventListener("click", function () {
    tfpMensagem(mensagemForm, "", "");
    tfpAbrirModal(modal);
    setTimeout(function () { document.getElementById("nomeParticipanteTF").focus(); }, 50);
  });

  [btnFechar, btnCancelar].forEach(function (botao) {
    botao.addEventListener("click", function () { tfpFecharModal(modal); });
  });

  modal.addEventListener("click", function (evento) {
    if (evento.target.dataset.fecharModal === "true") tfpFecharModal(modal);
  });

  document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape" && !modal.classList.contains("oculto")) tfpFecharModal(modal);
  });

  form.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    btnGuardar.disabled = true;
    btnGuardar.textContent = "A adicionar...";
    tfpMensagem(mensagemForm, "", "");
    try {
      const resultado = await tfpChamarApi({
        acao: "tfAdicionarParticipante",
        token: token,
        idProcesso: idProcesso,
        nome: document.getElementById("nomeParticipanteTF").value.trim(),
        emailUtilizador: document.getElementById("emailParticipanteTF").value.trim(),
        papelProcessual: document.getElementById("papelParticipanteTF").value,
        equipa: document.getElementById("equipaParticipanteTF").value,
        observacoes: document.getElementById("observacoesParticipanteTF").value.trim()
      });
      if (!resultado.sucesso) {
        tfpMensagem(mensagemForm, resultado.mensagem || "Não foi possível adicionar o participante.", "erro");
        return;
      }
      tfpMensagem(mensagemForm, "Participante adicionado com sucesso.", "sucesso");
      form.reset();
      await carregarParticipantes();
      setTimeout(function () { tfpFecharModal(modal); }, 800);
    } catch (erro) {
      if (erro.message !== "Sessão expirada.") tfpMensagem(mensagemForm, "Não foi possível adicionar o participante. Tente novamente.", "erro");
    } finally {
      btnGuardar.disabled = false;
      btnGuardar.textContent = "Adicionar participante";
    }
  });

  btnPesquisar.addEventListener("click", carregarParticipantes);
  document.getElementById("tfPesquisaParticipante").addEventListener("keydown", function (evento) {
    if (evento.key === "Enter") carregarParticipantes();
  });

  btnSair.addEventListener("click", function () {
    localStorage.removeItem(TF_CHAVE_SESSAO);
    localStorage.removeItem(TF_CHAVE_UTILIZADOR);
    window.location.replace("login.html");
  });

  carregarProcesso();
  carregarParticipantes();
});
