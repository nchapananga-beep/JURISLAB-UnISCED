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

  if (!resposta.ok) {
    throw new Error("Falha na validação da sessão.");
  }

  return resposta.json();
}

async function terminarSessao(token) {
  try {
    await fetch(API_JURISLAB, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        acao: "terminarSessao",
        token: token
      })
    });
  } catch (erro) {
    console.warn("Não foi possível terminar a sessão no servidor.", erro);
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem(CHAVE_SESSAO);
  const ecraValidacao = document.getElementById("ecraValidacao");
  const nomeTopo = document.getElementById("nomeTopo");
  const perfilTopo = document.getElementById("perfilTopo");
  const nomeUtilizador = document.getElementById("nomeUtilizador");
  const mensagemSessao = document.getElementById("mensagemSessao");
  const btnSair = document.getElementById("btnSair");

  if (!token) {
    limparSessaoLocal();
    irParaLogin();
    return;
  }

  try {
    const resultado = await validarSessao(token);

    if (!resultado.sucesso || !resultado.valida || !resultado.utilizador) {
      limparSessaoLocal();
      irParaLogin();
      return;
    }

    const utilizador = resultado.utilizador;
    localStorage.setItem(CHAVE_UTILIZADOR, JSON.stringify(utilizador));

    nomeTopo.textContent = utilizador.nome || "Utilizador";
    perfilTopo.textContent = utilizador.perfil || "Perfil não informado";
    nomeUtilizador.textContent = utilizador.nome || "utilizador";
    mensagemSessao.textContent = "Sessão activa como " + (utilizador.perfil || "utilizador") + ".";
    ecraValidacao.classList.add("oculto");
  } catch (erro) {
    limparSessaoLocal();
    irParaLogin();
  }

  btnSair.addEventListener("click", async function () {
    btnSair.disabled = true;
    btnSair.textContent = "A sair...";

    await terminarSessao(token);
    limparSessaoLocal();
    irParaLogin();
  });
});
