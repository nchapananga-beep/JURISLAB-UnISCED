const API_JURISLAB = "https://script.google.com/macros/s/AKfycbyFzl8x8Kazn2ek0j5N8qF0f5beYNOSrNSfxx837FEF0do_gF3lzW3Z1UCvo9eeTROB/exec";
const CHAVE_SESSAO = "JURISLAB_TOKEN";
const CHAVE_UTILIZADOR = "JURISLAB_UTILIZADOR";
const CHAVE_UTENTE_SELECCIONADO = "JURISLAB_UTENTE_SELECCIONADO";

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

  if (!resposta.ok) {
    throw new Error("Falha na validação da sessão.");
  }

  return resposta.json();
}

async function listarUtentes(token, pesquisa) {
  const url = API_JURISLAB +
    "?acao=listarUtentes&token=" + encodeURIComponent(token) +
    "&pesquisa=" + encodeURIComponent(pesquisa || "");

  const resposta = await fetch(url, { method: "GET" });

  if (!resposta.ok) {
    throw new Error("Não foi possível carregar os utentes.");
  }

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

function guardarUtenteParaTriagem(utente) {
  localStorage.setItem(CHAVE_UTENTE_SELECCIONADO, JSON.stringify({
    idUtente: utente.idUtente,
    nomeUtente: utente.nomeCompleto
  }));

  window.location.href = "triagem.html";
}

function renderizarUtentes(utentes, lista, resumo) {
  if (!Array.isArray(utentes) || utentes.length === 0) {
    lista.innerHTML = '<div class="estado-vazio">Nenhum utente encontrado.</div>';
    resumo.textContent = "0 utentes encontrados.";
    return;
  }

  resumo.textContent = utentes.length + (utentes.length === 1 ? " utente encontrado." : " utentes encontrados.");

  lista.innerHTML = utentes.map(function (utente, indice) {
    return `
      <article class="utente-cartao">
        <div>
          <div class="utente-cabecalho">
            <h2>${escaparHtml(utente.nomeCompleto)}</h2>
            <span class="utente-codigo">${escaparHtml(utente.idUtente)}</span>
          </div>
          <div class="utente-dados">
            <span><strong>Telefone:</strong> ${escaparHtml(utente.telefone || "Não informado")}</span>
            <span><strong>Email:</strong> ${escaparHtml(utente.email || "Não informado")}</span>
            <span><strong>Local:</strong> ${escaparHtml([utente.distrito, utente.provincia].filter(Boolean).join(", ") || "Não informado")}</span>
            <span><strong>Registo:</strong> ${escaparHtml(utente.dataRegisto || "")}</span>
          </div>
        </div>
        <div class="utente-acoes">
          <button class="botao botao-principal" type="button" data-indice="${indice}">Realizar triagem</button>
        </div>
      </article>`;
  }).join("");

  lista.querySelectorAll("button[data-indice]").forEach(function (botao) {
    botao.addEventListener("click", function () {
      const indice = Number(botao.dataset.indice);
      guardarUtenteParaTriagem(utentes[indice]);
    });
  });
}

document.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem(CHAVE_SESSAO);
  const ecraValidacao = document.getElementById("ecraValidacao");
  const formPesquisa = document.getElementById("formPesquisa");
  const campoPesquisa = document.getElementById("campoPesquisa");
  const btnLimparPesquisa = document.getElementById("btnLimparPesquisa");
  const lista = document.getElementById("listaUtentes");
  const resumo = document.getElementById("resumoResultados");
  const mensagem = document.getElementById("mensagemGestao");

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

  async function carregar(pesquisa) {
    resumo.textContent = "A carregar utentes...";
    mensagem.textContent = "";

    try {
      const resultado = await listarUtentes(token, pesquisa);

      if (!resultado.sucesso) {
        mensagem.textContent = resultado.mensagem || "Não foi possível carregar os utentes.";
        mensagem.className = "mensagem-formulario erro";
        lista.innerHTML = "";
        resumo.textContent = "";

        if ((resultado.mensagem || "").toLowerCase().includes("sessão")) {
          limparSessaoLocal();
          setTimeout(irParaLogin, 1000);
        }
        return;
      }

      renderizarUtentes(resultado.utentes || [], lista, resumo);
    } catch (erro) {
      mensagem.textContent = "Não foi possível contactar o servidor. Tente novamente.";
      mensagem.className = "mensagem-formulario erro";
      resumo.textContent = "";
    }
  }

  formPesquisa.addEventListener("submit", function (evento) {
    evento.preventDefault();
    carregar(campoPesquisa.value.trim());
  });

  btnLimparPesquisa.addEventListener("click", function () {
    campoPesquisa.value = "";
    carregar("");
    campoPesquisa.focus();
  });

  carregar("");
});
