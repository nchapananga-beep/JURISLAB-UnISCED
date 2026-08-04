const API_JURISLAB = "https://script.google.com/macros/s/AKfycbyFzl8x8Kazn2ek0j5N8qF0f5beYNOSrNSfxx837FEF0do_gF3lzW3Z1UCvo9eeTROB/exec";
const CHAVE_SESSAO = "JURISLAB_TOKEN";
const CHAVE_UTILIZADOR = "JURISLAB_UTILIZADOR";

function limparSessaoLocal() {
  localStorage.removeItem(CHAVE_SESSAO);
  localStorage.removeItem(CHAVE_UTILIZADOR);
}

function irParaLogin() {
  window.location.replace("login.html");
}

async function validarSessao(token) {
  const url = API_JURISLAB + "?acao=validarSessao&token=" + encodeURIComponent(token);
  const resposta = await fetch(url, { method: "GET", cache: "no-store" });
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

async function terminarSessao(token) {
  try {
    await chamarApi({ acao: "terminarSessao", token: token });
  } catch (erro) {
    console.warn("Não foi possível terminar a sessão no servidor.", erro);
  }
}

function normalizarPermissao(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function obterModuloPrincipal(utilizador) {
  return String(
    utilizador.moduloPrincipal ||
    utilizador.Modulo_Principal ||
    utilizador.modulo ||
    ""
  ).trim();
}

function utilizadorEhAdministrador(utilizador) {
  const perfil = normalizarPermissao(utilizador.perfil);
  return perfil === "administrador" || perfil === "admin";
}

function utilizadorTemAcessoAoModulo(utilizador, moduloPretendido) {
  if (utilizadorEhAdministrador(utilizador)) return true;

  const modulo = normalizarPermissao(obterModuloPrincipal(utilizador));
  const solicitado = normalizarPermissao(moduloPretendido);

  if (modulo === "todos" || modulo === "todos os modulos") return true;
  if (!modulo) return solicitado === "jurislab aconselha";
  return modulo === solicitado;
}

function ocultarLigacoesPorPerfil(utilizador) {
  const perfil = normalizarPermissao(utilizador.perfil);
  const estudante = perfil === "estudante";
  const conselheiro = perfil === "estudante conselheiro";

  if (!estudante && !conselheiro) return;

  const proibidasComuns = [
    "aconselha.html",
    "pedidos-publicos.html",
    "relatorios.html",
    "triagens-pendentes.html"
  ];

  const proibidasEstudante = [
    "consultas.html",
    "prazos.html",
    "distribuicao-casos.html"
  ];

  document.querySelectorAll("a[href]").forEach(function (ligacao) {
    const href = normalizarPermissao(ligacao.getAttribute("href"));
    const bloquear = proibidasComuns.some(function (pagina) {
      return href.includes(pagina);
    }) || (
      estudante &&
      proibidasEstudante.some(function (pagina) {
        return href.includes(pagina);
      })
    );

    if (bloquear) {
      ligacao.hidden = true;
      ligacao.style.setProperty("display", "none", "important");
      ligacao.setAttribute("aria-hidden", "true");
      ligacao.setAttribute("tabindex", "-1");
    }
  });

  const cartaoSemResponsavel = document
    .getElementById("indicadorCasosSemResponsavel")
    ?.closest("a");

  const cartaoTriagens = document
    .getElementById("indicadorTriagensPendentes")
    ?.closest("a");

  [cartaoSemResponsavel, cartaoTriagens].forEach(function (elemento) {
    if (elemento) {
      elemento.hidden = true;
      elemento.style.setProperty("display", "none", "important");
    }
  });
}

function aplicarPermissoesDoPainel(utilizador) {
  document.querySelectorAll("[data-modulo]").forEach(function (cartao) {
    cartao.hidden = !utilizadorTemAcessoAoModulo(
      utilizador,
      cartao.dataset.modulo
    );
  });

  document.querySelectorAll('[data-administracao="true"]').forEach(function (cartao) {
    cartao.hidden = !utilizadorEhAdministrador(utilizador);
  });

  const areaAconselha = document.getElementById("areaAconselhaPainel");
  const acessoAconselha = utilizadorTemAcessoAoModulo(
    utilizador,
    "JURISLAB Aconselha"
  );

  if (areaAconselha) areaAconselha.hidden = !acessoAconselha;
  ocultarLigacoesPorPerfil(utilizador);
  return acessoAconselha;
}

function colocarIndicadores(resumo) {
  document.getElementById("indicadorCasosActivos").textContent = Number(resumo.casosActivos || 0);
  document.getElementById("indicadorTriagensPendentes").textContent = Number(resumo.triagensPendentes || 0);
  document.getElementById("indicadorEncaminhamentos").textContent = Number(resumo.encaminhamentosAbertos || 0);
  document.getElementById("indicadorUtentes").textContent = Number(resumo.utentesRegistados || 0);
}

function colocarIndicadoresIndisponiveis() {
  ["indicadorCasosActivos", "indicadorTriagensPendentes", "indicadorEncaminhamentos", "indicadorUtentes"].forEach(function (id) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.textContent = "—";
  });
}

function colocarIndicadoresPrazos(resumo) {
  document.getElementById("indicadorPrazosPendentes").textContent = Number(resumo.pendentes || 0);
  document.getElementById("indicadorPrazosProximos").textContent = Number(resumo.proximos || 0);
  document.getElementById("indicadorPrazosVencidos").textContent = Number(resumo.vencidos || 0);
}

function colocarPrazosIndisponiveis() {
  ["indicadorPrazosPendentes", "indicadorPrazosProximos", "indicadorPrazosVencidos"].forEach(function (id) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.textContent = "—";
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
  if (!indicador || indicador.closest("a")?.hidden) return;

  try {
    const resultado = await chamarApi({ acao: "listarCasos", token: token, pesquisa: "", estado: "Todos" });
    if (!resultado.sucesso || !Array.isArray(resultado.casos)) {
      indicador.textContent = "—";
      return;
    }
    indicador.textContent = resultado.casos.filter(function (caso) {
      return !casoEstaEncerrado(caso) && casoSemResponsavel(caso);
    }).length;
  } catch (erro) {
    indicador.textContent = "—";
  }
}

async function carregarIndicadores(token) {
  const mensagem = document.getElementById("mensagemIndicadores");
  mensagem.textContent = "";
  mensagem.className = "mensagem-formulario";
  try {
    const resultado = await chamarApi({ acao: "obterResumoPainel", token: token });
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
    const resultado = await chamarApi({ acao: "obterResumoPrazosPainel", token: token });
    if (!resultado.sucesso) {
      colocarPrazosIndisponiveis();
      mensagem.textContent = resultado.mensagem || "Não foi possível carregar os alertas de prazos.";
      mensagem.classList.add("erro");
      return;
    }
    colocarIndicadoresPrazos(resultado);
  } catch (erro) {
    colocarPrazosIndisponiveis();
    mensagem.textContent = "Não foi possível carregar os alertas de prazos.";
    mensagem.classList.add("erro");
  }
}

function apresentarPainel(utilizador, ecraValidacao) {
  const moduloPrincipal = obterModuloPrincipal(utilizador) || "JURISLAB Aconselha";
  const acessoAconselha = aplicarPermissoesDoPainel(utilizador);

  document.getElementById("nomeTopo").textContent = utilizador.nome || utilizador.nomeCompleto || "Utilizador";
  document.getElementById("perfilTopo").textContent = utilizador.perfil || "Perfil não informado";
  document.getElementById("nomeUtilizador").textContent = utilizador.nome || utilizador.nomeCompleto || "utilizador";
  document.getElementById("mensagemSessao").textContent = "Sessão activa como " + (utilizador.perfil || "utilizador") + " — acesso: " + moduloPrincipal + ".";
  ecraValidacao.classList.add("oculto");

  return acessoAconselha;
}

document.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem(CHAVE_SESSAO);
  const ecraValidacao = document.getElementById("ecraValidacao");
  const btnSair = document.getElementById("btnSair");

  if (!token) {
    irParaLogin();
    return;
  }

  let utilizador = null;
  let acessoAconselha = false;

  try {
    const resultado = await validarSessao(token);

    if (!resultado.sucesso || !resultado.valida || !resultado.utilizador) {
      limparSessaoLocal();
      irParaLogin();
      return;
    }

    utilizador = resultado.utilizador;
    localStorage.setItem(CHAVE_UTILIZADOR, JSON.stringify(utilizador));
    acessoAconselha = apresentarPainel(utilizador, ecraValidacao);
  } catch (erro) {
    console.warn("Validação remota indisponível; será usada a sessão local.", erro);

    try {
      utilizador = JSON.parse(localStorage.getItem(CHAVE_UTILIZADOR) || "null");
    } catch (erroLeitura) {
      utilizador = null;
    }

    if (!utilizador) {
      ecraValidacao.classList.add("oculto");
      document.getElementById("mensagemSessao").textContent =
        "Não foi possível validar a sessão. Verifique a ligação e actualize a página.";
      return;
    }

    acessoAconselha = apresentarPainel(utilizador, ecraValidacao);
    document.getElementById("mensagemSessao").textContent +=
      " A ligação ao servidor está temporariamente indisponível.";
  }

  if (acessoAconselha && utilizador) {
    await Promise.all([
      carregarIndicadores(token),
      carregarCasosSemResponsavel(token),
      carregarIndicadoresPrazos(token)
    ]);
  }

  btnSair.addEventListener("click", async function () {
    btnSair.disabled = true;
    btnSair.textContent = "A sair...";
    await terminarSessao(token);
    limparSessaoLocal();
    irParaLogin();
  });
});