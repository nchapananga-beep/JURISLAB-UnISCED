const API_JURISLAB = "https://script.google.com/macros/s/AKfycbyFzl8x8Kazn2ek0j5N8qF0f5beYNOSrNSfxx837FEF0do_gF3lzW3Z1UCvo9eeTROB/exec";
const CHAVE_SESSAO = "JURISLAB_TOKEN";

async function chamarApiJurisLab(dados) {
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

function definirEstadoBotao(botao, emProcessamento, textoNormal, textoProcessamento) {
  botao.disabled = emProcessamento;
  botao.textContent = emProcessamento ? textoProcessamento : textoNormal;
}

function mostrarMensagem(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.classList.remove("sucesso", "erro");

  if (tipo) {
    elemento.classList.add(tipo);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const formEmail = document.getElementById("formEmail");
  const formCodigo = document.getElementById("formCodigo");
  const campoEmail = document.getElementById("email");
  const campoCodigo = document.getElementById("codigo");
  const mensagem = document.getElementById("mensagemLogin");
  const textoInstrucao = document.getElementById("textoInstrucao");
  const btnEnviarCodigo = document.getElementById("btnEnviarCodigo");
  const btnValidarCodigo = document.getElementById("btnValidarCodigo");
  const btnReenviar = document.getElementById("btnReenviar");

  const tokenExistente = localStorage.getItem(CHAVE_SESSAO);
  if (tokenExistente) {
    window.location.href = "dashboard.html";
    return;
  }

  async function solicitarCodigo() {
    const email = campoEmail.value.trim().toLowerCase();

    if (!email || !campoEmail.validity.valid) {
      mostrarMensagem(mensagem, "Introduza um endereço de email válido.", "erro");
      campoEmail.focus();
      return;
    }

    definirEstadoBotao(btnEnviarCodigo, true, "Enviar código", "A enviar...");
    mostrarMensagem(mensagem, "", "");

    try {
      const resultado = await chamarApiJurisLab({
        acao: "solicitarCodigo",
        email: email
      });

      mostrarMensagem(
        mensagem,
        resultado.mensagem || "Verifique o seu email.",
        resultado.sucesso ? "sucesso" : "erro"
      );

      if (resultado.sucesso) {
        campoEmail.readOnly = true;
        formEmail.classList.add("oculto");
        formCodigo.classList.remove("oculto");
        textoInstrucao.textContent = "Introduza o código de seis dígitos enviado ao seu email.";
        campoCodigo.focus();
      }
    } catch (erro) {
      mostrarMensagem(
        mensagem,
        "Não foi possível enviar o código. Tente novamente.",
        "erro"
      );
    } finally {
      definirEstadoBotao(btnEnviarCodigo, false, "Enviar código", "A enviar...");
    }
  }

  formEmail.addEventListener("submit", function (evento) {
    evento.preventDefault();
    solicitarCodigo();
  });

  formCodigo.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const email = campoEmail.value.trim().toLowerCase();
    const codigo = campoCodigo.value.replace(/\D/g, "");

    if (codigo.length !== 6) {
      mostrarMensagem(mensagem, "Introduza o código de seis dígitos.", "erro");
      campoCodigo.focus();
      return;
    }

    definirEstadoBotao(btnValidarCodigo, true, "Confirmar e entrar", "A validar...");
    mostrarMensagem(mensagem, "", "");

    try {
      const resultado = await chamarApiJurisLab({
        acao: "verificarCodigo",
        email: email,
        codigo: codigo
      });

      if (!resultado.sucesso || !resultado.token) {
        mostrarMensagem(
          mensagem,
          resultado.mensagem || "Não foi possível autorizar o acesso.",
          "erro"
        );
        return;
      }

      localStorage.setItem(CHAVE_SESSAO, resultado.token);
      localStorage.setItem("JURISLAB_UTILIZADOR", JSON.stringify(resultado.utilizador || {}));

      mostrarMensagem(mensagem, "Acesso autorizado. A entrar...", "sucesso");
      window.location.href = "dashboard.html";
    } catch (erro) {
      mostrarMensagem(
        mensagem,
        "Não foi possível validar o código. Tente novamente.",
        "erro"
      );
    } finally {
      definirEstadoBotao(btnValidarCodigo, false, "Confirmar e entrar", "A validar...");
    }
  });

  btnReenviar.addEventListener("click", async function () {
    campoEmail.readOnly = false;
    formCodigo.classList.add("oculto");
    formEmail.classList.remove("oculto");
    textoInstrucao.textContent = "Confirme o email e solicite um novo código de acesso.";
    campoCodigo.value = "";
    campoEmail.focus();
  });

  campoCodigo.addEventListener("input", function () {
    campoCodigo.value = campoCodigo.value.replace(/\D/g, "").slice(0, 6);
  });
});
