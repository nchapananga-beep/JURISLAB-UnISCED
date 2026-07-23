const API_JURISLAB = "https://script.google.com/macros/s/AKfycbyFzl8x8Kazn2ek0j5N8qF0f5beYNOSrNSfxx837FEF0do_gF3lzW3Z1UCvo9eeTROB/exec";
const CHAVE_SESSAO = "JURISLAB_TOKEN";
const CHAVE_UTILIZADOR = "JURISLAB_UTILIZADOR";
const CHAVE_ULTIMO_UTENTE = "JURISLAB_ULTIMO_UTENTE";

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
  botao.textContent = emProcessamento ? "A guardar..." : "Guardar utente";
}

document.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem(CHAVE_SESSAO);
  const ecraValidacao = document.getElementById("ecraValidacao");
  const form = document.getElementById("formUtente");
  const btnGuardar = document.getElementById("btnGuardar");
  const mensagem = document.getElementById("mensagemUtente");

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

  form.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    mostrarMensagem(mensagem, "", "");

    if (!form.checkValidity()) {
      form.reportValidity();
      mostrarMensagem(mensagem, "Preencha os campos obrigatórios e confirme o consentimento.", "erro");
      return;
    }

    const dados = new FormData(form);
    const nomeCompleto = String(dados.get("nomeCompleto") || "").trim();

    const pedido = {
      acao: "registarUtente",
      token: token,
      nomeCompleto: nomeCompleto,
      sexo: dados.get("sexo"),
      dataNascimento: dados.get("dataNascimento"),
      documentoIdentificacao: dados.get("documentoIdentificacao"),
      numeroDocumento: dados.get("numeroDocumento"),
      telefone: dados.get("telefone"),
      email: dados.get("email"),
      provincia: dados.get("provincia"),
      distrito: dados.get("distrito"),
      endereco: dados.get("endereco"),
      ocupacao: dados.get("ocupacao"),
      consentimento: document.getElementById("consentimento").checked ? "Sim" : "Não"
    };

    definirEstadoBotao(btnGuardar, true);

    try {
      const resultado = await chamarApi(pedido);

      if (!resultado.sucesso) {
        mostrarMensagem(
          mensagem,
          resultado.mensagem || "Não foi possível guardar o utente.",
          "erro"
        );

        if ((resultado.mensagem || "").toLowerCase().includes("sessão")) {
          limparSessaoLocal();
          setTimeout(irParaLogin, 1200);
        }
        return;
      }

      localStorage.setItem(
        CHAVE_ULTIMO_UTENTE,
        JSON.stringify({
          idUtente: resultado.idUtente || "",
          nomeUtente: nomeCompleto
        })
      );

      mostrarMensagem(
        mensagem,
        (resultado.mensagem || "Utente registado com sucesso.") +
          (resultado.idUtente ? " Código: " + resultado.idUtente + ". Pode abrir a triagem." : ""),
        "sucesso"
      );

      form.reset();
      document.getElementById("provincia").value = "Sofala";
    } catch (erro) {
      mostrarMensagem(mensagem, "Não foi possível contactar o servidor. Tente novamente.", "erro");
    } finally {
      definirEstadoBotao(btnGuardar, false);
    }
  });
});
