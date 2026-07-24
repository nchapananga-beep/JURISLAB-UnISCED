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

async function terminarSessao(token) {
  try {
    await chamarApi({
      acao: "terminarSessao",
      token: token
    });
  } catch (erro) {
    console.warn("Não foi possível terminar a sessão no servidor.", erro);
  }
}

function colocarIndicadores(resumo) {
  document.getElementById("indicadorCasosActivos").textContent = Number(resumo.casosActivos || 0);
  document.getElementById("indicadorTriagensPendentes").textContent = Number(resumo.triagensPendentes || 0);
  document.getElementById("indicadorEncaminhamentos").textContent = Number(resumo.encaminhamentosAbertos || 0);
  document.getElementById("indicadorUtentes").textContent = Number(resumo.utentesRegistados || 0);
}

function colocarIndicadoresIndisponiveis() {
  [
    "indicadorCasosActivos",
    "indicadorTriagensPendentes",
    "indicadorEncaminhamentos",
    "indicadorUtentes"
  ].forEach(function (id) {
    document.getElementById(id).textContent = "—";
  });
}

function colocarIndicadoresPrazos(resumo) {
  document.getElementById("indicadorPrazosPendentes").textContent = Number(resumo.pendentes || 0);
  document.getElementById("indicadorPrazosProximos").textContent = Number(resumo.proximos || 0);
  document.getElementById("indicadorPrazosVencidos").textContent = Number(resumo.vencidos || 0);
}

function colocarPrazosIndisponiveis() {
  [
    "indicadorPrazosPendentes",
    "indicadorPrazosProximos",
    "indicadorPrazosVencidos"
  ].forEach(function (id) {
    document.getElementById(id).textContent = "—";
  });
}

function casoEstaEncerrado(caso) {
  return ["Encerrado", "Concluído", "Arquivado"].includes(String(caso.estadoCaso || "").trim());
}

function casoSemResponsavel(caso) {
  const responsavel = String(caso.responsavel || "").trim().toLowerCase();
  return !responsavel || responsavel === "não atribuído" || responsavel === "nao atribuido";
}

async function carregarCasosSemResponsavel(token) {
  const indicador = document.getElementById("indicadorCasosSemResponsavel");

  try {
    const resultado = await chamarApi({
      acao: "listarCasos",
      token: token,
      pesquisa: "",
      estado: "Todos"
    });

    if (!resultado.sucesso || !Array.isArray(resultado.casos)) {
      indicador.textContent = "—";
      return;
    }

    const total = resultado.casos.filter(function (caso) {
      return !casoEstaEncerrado(caso) && casoSemResponsavel(caso);
    }).length;

    indicador.textContent = total;
  } catch (erro) {
    indicador.textContent = "—";
  }
}

async function carregarIndicadores(token) {
  const mensagem = document.getElementById("mensagemIndicadores");
  mensagem.textContent = "";
  mensagem.className = "mensagem-formulario";

  try {
    const resultado = await chamarApi({
      acao: "obterResumoPainel",
      token: token
    });

    if (!resultado.sucesso || !resultado.resumo) {
      colocarIndicadoresIndisponiveis();
      mensagem.textContent = resultado.mensagem || "Não foi possível carregar os indicadores.";
      mensagem.classList.add("erro");
      return;
    }

    colocarIndicadores(resultado.resumo);
  } catch (erro) {
    colocarIndicadoresIndisponiveis();
    mensagem.textContent = "Não foi possível carregar os indicadores do painel.";
    mensagem.classList.add("erro");
  }
}

async function carregarIndicadoresPrazos(token) {
  const mensagem = document.getElementById("mensagemPrazos");
  mensagem.textContent = "";
  mensagem.className = "mensagem-formulario";

  try {
    const resultado = await chamarApi({
      acao: "obterResumoPrazosPainel",
      token: token
    });

    if (!resultado.sucesso) {
      colocarPrazosIndisponiveis();
      mensagem.textContent = resultado.mensagem || "Não foi possível carregar os alertas de prazos.";
      mensagem.classList.add("erro");
      return;
    }

    colocarIndicadoresPrazos(resultado);

    if (Number(resultado.vencidos || 0) > 0) {
      mensagem.textContent = "Existem prazos vencidos que requerem atenção imediata.";
      mensagem.classList.add("erro");
    }
  } catch (erro) {
    colocarPrazosIndisponiveis();
    mensagem.textContent = "Não foi possível carregar os alertas de prazos.";
    mensagem.classList.add("erro");
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

    await Promise.all([
      carregarIndicadores(token),
      carregarCasosSemResponsavel(token),
      carregarIndicadoresPrazos(token)
    ]);
  } catch (erro) {
    limparSessaoLocal();
    irParaLogin();
    return;
  }

  btnSair.addEventListener("click", async function () {
    btnSair.disabled = true;
    btnSair.textContent = "A sair...";

    await terminarSessao(token);
    limparSessaoLocal();
    irParaLogin();
  });
});