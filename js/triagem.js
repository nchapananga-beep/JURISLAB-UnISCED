const API_JURISLAB = "https://script.google.com/macros/s/AKfycbyFzl8x8Kazn2ek0j5N8qF0f5beYNOSrNSfxx837FEF0do_gF3lzW3Z1UCvo9eeTROB/exec";
const CHAVE_SESSAO = "JURISLAB_TOKEN";
const CHAVE_UTILIZADOR = "JURISLAB_UTILIZADOR";
const CHAVE_ULTIMO_UTENTE = "JURISLAB_ULTIMO_UTENTE";
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

async function chamarApi(dados) {
  const resposta = await fetch(API_JURISLAB, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(dados)
  });

  if (!resposta.ok) {
    throw new Error("Não foi possível contactar o servidor.");
  }

  return resposta.json();
}

function mostrarMensagem(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.classList.remove("sucesso", "erro");

  if (tipo) {
    elemento.classList.add(tipo);
  }
}

function definirEstadoBotao(botao, emProcessamento) {
  botao.disabled = emProcessamento;
  botao.textContent = emProcessamento ? "A guardar..." : "Guardar triagem";
}

function obterUtenteParaTriagem() {
  const chaves = [CHAVE_UTENTE_SELECCIONADO, CHAVE_ULTIMO_UTENTE];

  for (const chave of chaves) {
    try {
      const utente = JSON.parse(localStorage.getItem(chave) || "null");
      if (utente && utente.idUtente) {
        return utente;
      }
    } catch (erro) {
      localStorage.removeItem(chave);
    }
  }

  return null;
}

document.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem(CHAVE_SESSAO);
  const ecraValidacao = document.getElementById("ecraValidacao");
  const form = document.getElementById("formTriagem");
  const btnGuardar = document.getElementById("btnGuardarTriagem");
  const mensagem = document.getElementById("mensagemTriagem");
  const campoIdUtente = document.getElementById("idUtente");
  const campoNomeUtente = document.getElementById("nomeUtente");

  if (!token) {
    limparSessaoLocal();
    irParaLogin();
    return;
  }

  try {
    const resultadoSessao = await validarSessao(token);

    if (!resultadoSessao.sucesso || !resultadoSessao.valida) {
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

  const utente = obterUtenteParaTriagem();
  if (utente) {
    campoIdUtente.value = utente.idUtente || "";
    campoNomeUtente.value = utente.nomeUtente || utente.nomeCompleto || "";
  }

  form.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    mostrarMensagem(mensagem, "", "");

    if (!form.checkValidity()) {
      form.reportValidity();
      mostrarMensagem(mensagem, "Preencha os campos obrigatórios.", "erro");
      return;
    }

    const dados = new FormData(form);
    const pedido = {
      acao: "registarTriagem",
      token: token,
      idUtente: dados.get("idUtente"),
      nomeUtente: dados.get("nomeUtente"),
      areaDireito: dados.get("areaDireito"),
      resumoProblema: dados.get("resumoProblema"),
      urgencia: dados.get("urgencia"),
      existemDocumentos: dados.get("existemDocumentos"),
      riscoImediato: dados.get("riscoImediato"),
      tipoApoio: dados.get("tipoApoio"),
      observacoes: dados.get("observacoes")
    };

    definirEstadoBotao(btnGuardar, true);

    try {
      const resultado = await chamarApi(pedido);

      if (!resultado.sucesso) {
        mostrarMensagem(
          mensagem,
          resultado.mensagem || "Não foi possível guardar a triagem.",
          "erro"
        );

        if ((resultado.mensagem || "").toLowerCase().includes("sessão")) {
          limparSessaoLocal();
          setTimeout(irParaLogin, 1200);
        }
        return;
      }

      mostrarMensagem(
        mensagem,
        (resultado.mensagem || "Triagem registada com sucesso.") +
          (resultado.idTriagem ? " Código: " + resultado.idTriagem : ""),
        "sucesso"
      );

      const idUtente = campoIdUtente.value;
      const nomeUtente = campoNomeUtente.value;
      form.reset();
      campoIdUtente.value = idUtente;
      campoNomeUtente.value = nomeUtente;
      localStorage.removeItem(CHAVE_UTENTE_SELECCIONADO);
    } catch (erro) {
      mostrarMensagem(mensagem, "Não foi possível contactar o servidor. Tente novamente.", "erro");
    } finally {
      definirEstadoBotao(btnGuardar, false);
    }
  });
});
