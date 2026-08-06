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
  const resposta = await fetch(
    API_JURISLAB +
      "?acao=validarSessao&token=" +
      encodeURIComponent(token)
  );

  if (!resposta.ok) {
    throw new Error("Falha ao validar a sessão.");
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
    throw new Error(
      "Falha na comunicação com a API. Código HTTP: " +
        resposta.status
    );
  }

  const texto = await resposta.text();

  try {
    return JSON.parse(texto);
  } catch (erro) {
    throw new Error("A API devolveu uma resposta inválida.");
  }
}

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function escaparHtml(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function perfilPodeVerAuditoria(utilizador) {
  const perfil = normalizarTexto(
    utilizador.perfil || utilizador.Perfil
  );

  return [
    "administrador",
    "supervisor"
  ].includes(perfil);
}

function mostrarMensagem(elemento, texto, tipo) {
  elemento.textContent = texto || "";
  elemento.className = "mensagem-formulario";

  if (tipo) {
    elemento.classList.add(tipo);
  }
}

function numeroSeguro(valor) {
  const numero = Number(valor || 0);
  return Number.isFinite(numero) ? numero : 0;
}

function colocarTexto(id, valor) {
  const elemento = document.getElementById(id);

  if (elemento) {
    elemento.textContent = String(valor ?? 0);
  }
}

function preencherIndicadores(resumo) {
  resumo = resumo || {};

  colocarTexto("indicadorTotal", numeroSeguro(resumo.totalOperacoes));
  colocarTexto("indicadorHoje", numeroSeguro(resumo.operacoesHoje));
  colocarTexto("indicadorLogins", numeroSeguro(resumo.logins));
  colocarTexto("indicadorRecusadas", numeroSeguro(resumo.operacoesRecusadas));
  colocarTexto("indicadorUtilizadores", numeroSeguro(resumo.utilizadoresActivos));
  colocarTexto("indicadorModulos", numeroSeguro(resumo.modulosAuditados));
}

function preencherModulosNoFiltro(modulos, select) {
  const valorActual = select.value || "Todos";
  const lista = Array.from(
    new Set((modulos || []).filter(Boolean))
  ).sort(function (a, b) {
    return String(a).localeCompare(String(b), "pt");
  });

  select.innerHTML =
    '<option value="Todos">Todos os módulos</option>' +
    lista.map(function (modulo) {
      return (
        '<option value="' + escaparHtml(modulo) + '">' +
        escaparHtml(modulo) +
        "</option>"
      );
    }).join("");

  if (lista.includes(valorActual)) {
    select.value = valorActual;
  }
}

function renderizarGraficoModulos(distribuicao, elemento) {
  const itens = Array.isArray(distribuicao)
    ? distribuicao
    : [];

  if (!itens.length) {
    elemento.innerHTML =
      '<div class="estado-vazio">Ainda não existem dados suficientes para o gráfico.</div>';
    return;
  }

  const maior = Math.max.apply(
    null,
    itens.map(function (item) {
      return numeroSeguro(item.total);
    }).concat([1])
  );

  elemento.innerHTML = itens.map(function (item) {
    const total = numeroSeguro(item.total);
    const percentagem = Math.max(
      2,
      Math.round((total / maior) * 100)
    );

    return `
      <div class="grafico-linha">
        <span class="grafico-rotulo">${escaparHtml(item.modulo || "Sem módulo")}</span>
        <div class="grafico-barra" aria-hidden="true">
          <div class="grafico-preenchimento" style="width:${percentagem}%"></div>
        </div>
        <span class="grafico-valor">${total}</span>
      </div>
    `;
  }).join("");
}

function classeResultado(resultado) {
  const normalizado = normalizarTexto(resultado);

  if (normalizado === "sucesso") {
    return "resultado-sucesso";
  }

  if (normalizado === "erro") {
    return "resultado-erro";
  }

  return "resultado-recusado";
}

function renderizarAuditoria(registos, corpo, estadoVazio, resumo) {
  const lista = Array.isArray(registos) ? registos : [];

  resumo.textContent =
    lista.length +
    (lista.length === 1
      ? " registo encontrado."
      : " registos encontrados.");

  if (!lista.length) {
    corpo.innerHTML = "";
    estadoVazio.classList.remove("oculto");
    return;
  }

  estadoVazio.classList.add("oculto");

  corpo.innerHTML = lista.map(function (registo) {
    const resultado = registo.resultado || "";

    return `
      <tr>
        <td>${escaparHtml(registo.dataHora)}</td>
        <td>
          <strong>${escaparHtml(registo.nomeUtilizador || "Não identificado")}</strong>
          <br><small>${escaparHtml(registo.email || registo.idUtilizador || "")}</small>
        </td>
        <td>${escaparHtml(registo.perfil)}</td>
        <td>${escaparHtml(registo.modulo)}</td>
        <td>${escaparHtml(registo.accao)}</td>
        <td>${escaparHtml(registo.codigoRegisto)}</td>
        <td class="celula-descricao">${escaparHtml(registo.descricao)}</td>
        <td>${escaparHtml(registo.valorAnterior)}</td>
        <td>${escaparHtml(registo.valorNovo)}</td>
        <td>
          <span class="resultado-etiqueta ${classeResultado(resultado)}">
            ${escaparHtml(resultado || "Não informado")}
          </span>
        </td>
      </tr>
    `;
  }).join("");
}

function formatarCampoCsv(valor) {
  const texto = String(valor || "").replace(/"/g, '""');
  return '"' + texto + '"';
}

function exportarCsv(registos) {
  const lista = Array.isArray(registos) ? registos : [];

  if (!lista.length) {
    alert("Não existem registos para exportar.");
    return;
  }

  const cabecalhos = [
    "Data/Hora",
    "ID do Utilizador",
    "Nome do Utilizador",
    "Email",
    "Perfil",
    "Módulo",
    "Acção",
    "Código do Registo",
    "Descrição",
    "Valor Anterior",
    "Valor Novo",
    "Resultado"
  ];

  const linhas = [cabecalhos.map(formatarCampoCsv).join(";")];

  lista.forEach(function (registo) {
    linhas.push([
      registo.dataHora,
      registo.idUtilizador,
      registo.nomeUtilizador,
      registo.email,
      registo.perfil,
      registo.modulo,
      registo.accao,
      registo.codigoRegisto,
      registo.descricao,
      registo.valorAnterior,
      registo.valorNovo,
      registo.resultado
    ].map(formatarCampoCsv).join(";"));
  });

  const conteudo = "\ufeff" + linhas.join("\n");
  const blob = new Blob([conteudo], {
    type: "text/csv;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const data = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = "auditoria-jurislab-" + data + ".csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem(CHAVE_SESSAO);
  const ecraValidacao = document.getElementById("ecraValidacao");
  const formFiltros = document.getElementById("formFiltros");
  const campoPesquisa = document.getElementById("campoPesquisa");
  const filtroModulo = document.getElementById("filtroModulo");
  const filtroResultado = document.getElementById("filtroResultado");
  const dataInicial = document.getElementById("dataInicial");
  const dataFinal = document.getElementById("dataFinal");
  const btnLimpar = document.getElementById("btnLimpar");
  const btnExportar = document.getElementById("btnExportar");
  const btnImprimir = document.getElementById("btnImprimir");
  const corpo = document.getElementById("corpoAuditoria");
  const estadoVazio = document.getElementById("estadoVazio");
  const resumo = document.getElementById("resumoResultados");
  const mensagem = document.getElementById("mensagemAuditoria");
  const graficoModulos = document.getElementById("graficoModulos");

  let registosActuais = [];

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

    const utilizador = sessao.utilizador || {};

    if (!perfilPodeVerAuditoria(utilizador)) {
      alert("O seu perfil não tem permissão para consultar a auditoria.");
      window.location.href = "dashboard.html";
      return;
    }

    ecraValidacao.classList.add("oculto");
  } catch (erro) {
    limparSessaoLocal();
    irParaLogin();
    return;
  }

  async function carregarAuditoria() {
    resumo.textContent = "A carregar auditoria...";
    mostrarMensagem(mensagem, "", "");

    try {
      const resultado = await chamarApi({
        acao: "listarAuditoria",
        token: token,
        pesquisa: campoPesquisa.value.trim(),
        modulo: filtroModulo.value,
        resultado: filtroResultado.value,
        dataInicial: dataInicial.value,
        dataFinal: dataFinal.value
      });

      if (!resultado.sucesso) {
        mostrarMensagem(
          mensagem,
          resultado.mensagem || "Não foi possível carregar a auditoria.",
          "erro"
        );
        corpo.innerHTML = "";
        estadoVazio.classList.remove("oculto");
        resumo.textContent = "";

        if (normalizarTexto(resultado.mensagem).includes("sessao")) {
          limparSessaoLocal();
          setTimeout(irParaLogin, 1000);
        }
        return;
      }

      registosActuais = resultado.registos || [];
      preencherIndicadores(resultado.resumo || {});
      preencherModulosNoFiltro(resultado.modulos || [], filtroModulo);
      renderizarGraficoModulos(
        resultado.distribuicaoModulos || [],
        graficoModulos
      );
      renderizarAuditoria(
        registosActuais,
        corpo,
        estadoVazio,
        resumo
      );
    } catch (erro) {
      console.error("Erro ao carregar auditoria:", erro);
      mostrarMensagem(
        mensagem,
        "Não foi possível contactar o servidor. Tente novamente.",
        "erro"
      );
      resumo.textContent = "";
    }
  }

  formFiltros.addEventListener("submit", function (evento) {
    evento.preventDefault();
    carregarAuditoria();
  });

  btnLimpar.addEventListener("click", function () {
    campoPesquisa.value = "";
    filtroModulo.value = "Todos";
    filtroResultado.value = "Todos";
    dataInicial.value = "";
    dataFinal.value = "";
    carregarAuditoria();
  });

  btnExportar.addEventListener("click", function () {
    exportarCsv(registosActuais);
  });

  btnImprimir.addEventListener("click", function () {
    window.print();
  });

  carregarAuditoria();
});
