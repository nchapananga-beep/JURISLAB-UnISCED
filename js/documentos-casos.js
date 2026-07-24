const API_JURISLAB = "https://script.google.com/macros/s/AKfycbyFzl8x8Kazn2ek0j5N8qF0f5beYNOSrNSfxx837FEF0do_gF3lzW3Z1UCvo9eeTROB/exec";
const CHAVE_SESSAO = "JURISLAB_TOKEN";

async function chamarApi(dados) {
  const resposta = await fetch(API_JURISLAB, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(dados)
  });

  if (!resposta.ok) {
    throw new Error("Falha no servidor.");
  }

  return resposta.json();
}

async function validarSessao(token) {
  const resposta = await fetch(
    API_JURISLAB + "?acao=validarSessao&token=" + encodeURIComponent(token)
  );

  if (!resposta.ok) {
    throw new Error("Falha na validação.");
  }

  return resposta.json();
}

function esc(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatarTamanho(bytes) {
  const n = Number(bytes || 0);
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / (1024 * 1024)).toFixed(1) + " MB";
}

function lerFicheiroBase64(ficheiro) {
  return new Promise(function (resolve, reject) {
    const leitor = new FileReader();
    leitor.onload = function () {
      resolve(String(leitor.result || ""));
    };
    leitor.onerror = function () {
      reject(new Error("Não foi possível ler o ficheiro."));
    };
    leitor.readAsDataURL(ficheiro);
  });
}

function mostrarMensagem(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.className = "mensagem-formulario";
  if (tipo) elemento.classList.add(tipo);
}

document.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem(CHAVE_SESSAO);

  const ecraValidacao = document.getElementById("ecraValidacao");
  const contextoCaso = document.getElementById("contextoCaso");
  const btnNovoDocumento = document.getElementById("btnNovoDocumento");
  const btnFecharDocumento = document.getElementById("btnFecharDocumento");
  const btnCancelarDocumento = document.getElementById("btnCancelarDocumento");
  const btnGuardarDocumento = document.getElementById("btnGuardarDocumento");
  const btnLimpar = document.getElementById("btnLimpar");
  const modalDocumento = document.getElementById("modalDocumento");
  const formDocumento = document.getElementById("formDocumento");
  const formFiltros = document.getElementById("formFiltros");
  const campoCaso = document.getElementById("campoCaso");
  const campoPesquisa = document.getElementById("campoPesquisa");
  const filtroEstado = document.getElementById("filtroEstado");
  const idCasoDocumento = document.getElementById("idCasoDocumento");
  const idUtenteDocumento = document.getElementById("idUtenteDocumento");
  const ficheiroDocumento = document.getElementById("ficheiroDocumento");
  const resumoResultados = document.getElementById("resumoResultados");
  const listaDocumentos = document.getElementById("listaDocumentos");
  const mensagemDocumentos = document.getElementById("mensagemDocumentos");
  const mensagemDocumento = document.getElementById("mensagemDocumento");

  if (!token) {
    location.href = "login.html";
    return;
  }

  try {
    const sessao = await validarSessao(token);
    if (!sessao.sucesso || !sessao.valida) {
      location.href = "login.html";
      return;
    }
    ecraValidacao.classList.add("oculto");
  } catch (erro) {
    location.href = "login.html";
    return;
  }

  const parametros = new URLSearchParams(location.search);
  const casoInicial = parametros.get("idCaso") || "";
  const utenteInicial = parametros.get("idUtente") || "";

  campoCaso.value = casoInicial;
  idCasoDocumento.value = casoInicial;
  idUtenteDocumento.value = utenteInicial;

  if (casoInicial) {
    contextoCaso.textContent = "Documentos associados ao caso " + casoInicial + ".";
  }

  function renderizar(documentos) {
    resumoResultados.textContent = documentos.length +
      (documentos.length === 1 ? " documento encontrado." : " documentos encontrados.");

    listaDocumentos.innerHTML = documentos.length
      ? documentos.map(function (doc) {
          return `<article class="documento-cartao ${doc.estadoDocumento === "Arquivado" ? "documento-arquivado" : ""}">
            <div class="documento-topo">
              <div>
                <h2>${esc(doc.tituloDocumento || "Documento")}</h2>
                <span class="documento-codigo">${esc(doc.idDocumento)} · ${esc(doc.nomeFicheiro)}</span>
              </div>
              <span class="documento-estado">${esc(doc.estadoDocumento || "Activo")}</span>
            </div>
            <div class="documento-dados">
              <span><strong>Caso:</strong> ${esc(doc.idCaso)}</span>
              <span><strong>Utente:</strong> ${esc(doc.idUtente)}</span>
              <span><strong>Tipo:</strong> ${esc(doc.tipoDocumento)}</span>
              <span><strong>Registo:</strong> ${esc(doc.dataRegisto)}</span>
              <span><strong>Tamanho:</strong> ${esc(formatarTamanho(doc.tamanhoBytes))}</span>
              <span><strong>Registado por:</strong> ${esc(doc.registadoPor || "Não indicado")}</span>
            </div>
            ${doc.descricao ? `<p class="documento-descricao">${esc(doc.descricao)}</p>` : ""}
            <div class="documento-acoes">
              <a class="botao botao-principal" href="${esc(doc.urlDrive)}" target="_blank" rel="noopener">Abrir documento</a>
              ${doc.estadoDocumento !== "Arquivado" ? `<button class="botao botao-secundario" data-arquivar="${esc(doc.idDocumento)}" type="button">Arquivar</button>` : ""}
            </div>
          </article>`;
        }).join("")
      : '<div class="estado-vazio">Nenhum documento encontrado.</div>';

    listaDocumentos.querySelectorAll("button[data-arquivar]").forEach(function (botao) {
      botao.addEventListener("click", async function () {
        if (!confirm("Arquivar este documento?")) return;

        botao.disabled = true;
        try {
          const resultado = await chamarApi({
            acao: "arquivarDocumentoCaso",
            token: token,
            idDocumento: botao.dataset.arquivar
          });

          mostrarMensagem(
            mensagemDocumentos,
            resultado.mensagem || "",
            resultado.sucesso ? "sucesso" : "erro"
          );

          if (resultado.sucesso) await carregar();
        } catch (erro) {
          mostrarMensagem(mensagemDocumentos, "Não foi possível contactar o servidor.", "erro");
        } finally {
          botao.disabled = false;
        }
      });
    });
  }

  async function carregar() {
    resumoResultados.textContent = "A carregar documentos...";
    mostrarMensagem(mensagemDocumentos, "", "");

    try {
      const resultado = await chamarApi({
        acao: "listarDocumentosCaso",
        token: token,
        idCaso: campoCaso.value.trim(),
        pesquisa: campoPesquisa.value.trim(),
        estado: filtroEstado.value
      });

      if (!resultado.sucesso) {
        mostrarMensagem(
          mensagemDocumentos,
          resultado.mensagem || "Não foi possível carregar os documentos.",
          "erro"
        );
        return;
      }

      renderizar(resultado.documentos || []);
    } catch (erro) {
      mostrarMensagem(mensagemDocumentos, "Não foi possível contactar o servidor.", "erro");
    }
  }

  function abrirModal() {
    const casoActual = campoCaso.value.trim();
    if (casoActual) idCasoDocumento.value = casoActual;
    if (!idUtenteDocumento.value) idUtenteDocumento.value = utenteInicial;
    modalDocumento.classList.remove("oculto");
    setTimeout(function () {
      idCasoDocumento.focus();
    }, 50);
  }

  function fecharModal() {
    modalDocumento.classList.add("oculto");
    formDocumento.reset();
    idCasoDocumento.value = campoCaso.value.trim() || casoInicial;
    idUtenteDocumento.value = utenteInicial;
    mostrarMensagem(mensagemDocumento, "", "");
  }

  formFiltros.addEventListener("submit", function (evento) {
    evento.preventDefault();
    carregar();
  });

  btnLimpar.addEventListener("click", function () {
    campoCaso.value = "";
    campoPesquisa.value = "";
    filtroEstado.value = "Todos";
    carregar();
  });

  btnNovoDocumento.addEventListener("click", abrirModal);
  btnFecharDocumento.addEventListener("click", fecharModal);
  btnCancelarDocumento.addEventListener("click", fecharModal);

  modalDocumento.addEventListener("click", function (evento) {
    if (evento.target === modalDocumento) fecharModal();
  });

  formDocumento.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    if (!formDocumento.checkValidity()) {
      formDocumento.reportValidity();
      return;
    }

    const ficheiro = ficheiroDocumento.files[0];

    if (!ficheiro) {
      mostrarMensagem(mensagemDocumento, "Seleccione um ficheiro.", "erro");
      return;
    }

    if (ficheiro.size > 8 * 1024 * 1024) {
      mostrarMensagem(mensagemDocumento, "O ficheiro excede o limite de 8 MB.", "erro");
      return;
    }

    btnGuardarDocumento.disabled = true;
    btnGuardarDocumento.textContent = "A anexar...";
    mostrarMensagem(mensagemDocumento, "A preparar o ficheiro...", "");

    try {
      const base64 = await lerFicheiroBase64(ficheiro);
      const dados = new FormData(formDocumento);

      const resultado = await chamarApi({
        acao: "registarDocumentoCaso",
        token: token,
        idCaso: String(dados.get("idCaso") || "").trim(),
        idUtente: String(dados.get("idUtente") || "").trim(),
        tituloDocumento: String(dados.get("tituloDocumento") || "").trim(),
        tipoDocumento: String(dados.get("tipoDocumento") || "").trim(),
        descricao: String(dados.get("descricao") || "").trim(),
        observacoes: String(dados.get("observacoes") || "").trim(),
        nomeFicheiro: ficheiro.name,
        tipoFicheiro: ficheiro.type || "application/octet-stream",
        conteudoBase64: base64
      });

      mostrarMensagem(
        mensagemDocumento,
        resultado.mensagem || "",
        resultado.sucesso ? "sucesso" : "erro"
      );

      if (resultado.sucesso) {
        campoCaso.value = String(dados.get("idCaso") || "").trim();
        setTimeout(async function () {
          fecharModal();
          await carregar();
        }, 900);
      }
    } catch (erro) {
      console.error(erro);
      mostrarMensagem(
        mensagemDocumento,
        "Não foi possível anexar o documento. Verifique a ligação e tente novamente.",
        "erro"
      );
    } finally {
      btnGuardarDocumento.disabled = false;
      btnGuardarDocumento.textContent = "Anexar documento";
    }
  });

  await carregar();
});