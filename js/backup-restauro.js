const API_JURISLAB = "https://script.google.com/macros/s/AKfycbyFzl8x8Kazn2ek0j5N8qF0f5beYNOSrNSfxx837FEF0do_gF3lzW3Z1UCvo9eeTROB/exec";
const CHAVE_SESSAO = "JURISLAB_TOKEN";
const CHAVE_UTILIZADOR = "JURISLAB_UTILIZADOR";

function normalizar(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapar(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function validarSessao(token) {
  const resposta = await fetch(
    API_JURISLAB + "?acao=validarSessao&token=" + encodeURIComponent(token)
  );
  if (!resposta.ok) throw new Error("Falha ao validar a sessão.");
  return resposta.json();
}

async function chamarApi(dados) {
  const resposta = await fetch(API_JURISLAB, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(dados)
  });
  if (!resposta.ok) throw new Error("Falha na comunicação com o servidor.");
  const texto = await resposta.text();
  try {
    return JSON.parse(texto);
  } catch (erro) {
    throw new Error("A API devolveu uma resposta inválida.");
  }
}

function mostrarMensagem(elemento, texto, tipo) {
  elemento.textContent = texto || "";
  elemento.className = "mensagem-formulario";
  if (tipo) elemento.classList.add(tipo);
}

function formatarTamanho(bytes) {
  const numero = Number(bytes || 0);
  if (!numero) return "Tamanho não informado";
  if (numero < 1024) return numero + " B";
  if (numero < 1024 * 1024) return (numero / 1024).toFixed(1) + " KB";
  return (numero / (1024 * 1024)).toFixed(1) + " MB";
}

document.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem(CHAVE_SESSAO);
  const ecraValidacao = document.getElementById("ecraValidacao");
  const lista = document.getElementById("listaBackups");
  const totalBackups = document.getElementById("totalBackups");
  const ultimoBackup = document.getElementById("ultimoBackup");
  const ultimoBackupDetalhe = document.getElementById("ultimoBackupDetalhe");
  const btnCriarBackup = document.getElementById("btnCriarBackup");
  const btnActualizar = document.getElementById("btnActualizar");
  const mensagemBackup = document.getElementById("mensagemBackup");

  const modal = document.getElementById("modalRestauro");
  const btnFecharRestauro = document.getElementById("btnFecharRestauro");
  const btnCancelarRestauro = document.getElementById("btnCancelarRestauro");
  const btnConfirmarRestauro = document.getElementById("btnConfirmarRestauro");
  const confirmacaoRestauro = document.getElementById("confirmacaoRestauro");
  const resumoRestauro = document.getElementById("resumoRestauro");
  const mensagemRestauro = document.getElementById("mensagemRestauro");

  let backupSeleccionado = null;

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

    const utilizador = sessao.utilizador || {};
    if (normalizar(utilizador.perfil) !== "administrador") {
      location.href = "dashboard.html";
      return;
    }

    ecraValidacao.classList.add("oculto");
  } catch (erro) {
    location.href = "login.html";
    return;
  }

  function fecharModal() {
    modal.classList.add("oculto");
    backupSeleccionado = null;
    confirmacaoRestauro.value = "";
    btnConfirmarRestauro.disabled = true;
    mostrarMensagem(mensagemRestauro, "", "");
  }

  function abrirModal(backup) {
    backupSeleccionado = backup;
    resumoRestauro.innerHTML =
      "<strong>" + escapar(backup.nome || backup.idBackup || "Backup") + "</strong><br>" +
      "Criado em: " + escapar(backup.dataHora || "Não informado") +
      (backup.criadoPor ? "<br>Criado por: " + escapar(backup.criadoPor) : "");
    confirmacaoRestauro.value = "";
    btnConfirmarRestauro.disabled = true;
    mostrarMensagem(mensagemRestauro, "", "");
    modal.classList.remove("oculto");
    setTimeout(() => confirmacaoRestauro.focus(), 50);
  }

  function renderizarBackups(backups) {
    const itens = Array.isArray(backups) ? backups : [];
    totalBackups.textContent = itens.length;

    if (!itens.length) {
      ultimoBackup.textContent = "Nenhum";
      ultimoBackupDetalhe.textContent = "Crie a primeira cópia";
      lista.innerHTML = '<div class="estado-vazio">Ainda não existem backups disponíveis.</div>';
      return;
    }

    ultimoBackup.textContent = itens[0].dataHora || "Disponível";
    ultimoBackupDetalhe.textContent = itens[0].criadoPor ? "Por " + itens[0].criadoPor : "Cópia mais recente";

    lista.innerHTML = itens.map(function (backup, indice) {
      return `
        <article class="backup-item">
          <div>
            <h3>${escapar(backup.nome || backup.idBackup || "Backup JURISLAB")}</h3>
            <div class="backup-meta">
              <span>${escapar(backup.dataHora || "Data não informada")}</span>
              <span>${escapar(backup.criadoPor || "Administrador")}</span>
              <span>${escapar(formatarTamanho(backup.tamanho))}</span>
            </div>
          </div>
          <div class="backup-acoes">
            ${backup.urlDrive ? `<a class="botao botao-secundario" href="${escapar(backup.urlDrive)}" target="_blank" rel="noopener">Abrir no Drive</a>` : ""}
            <button class="botao botao-perigo" type="button" data-restaurar="${indice}">Preparar restauro</button>
          </div>
        </article>`;
    }).join("");

    lista.querySelectorAll("button[data-restaurar]").forEach(function (botao) {
      botao.addEventListener("click", function () {
        abrirModal(itens[Number(botao.dataset.restaurar)]);
      });
    });
  }

  async function carregarBackups() {
    lista.innerHTML = '<div class="estado-vazio">A carregar backups...</div>';
    try {
      const resultado = await chamarApi({ acao: "listarBackups", token: token });
      if (!resultado.sucesso) {
        lista.innerHTML = '<div class="estado-vazio">' + escapar(resultado.mensagem || "Não foi possível carregar os backups.") + "</div>";
        totalBackups.textContent = "-";
        return;
      }
      renderizarBackups(resultado.backups || []);
    } catch (erro) {
      lista.innerHTML = '<div class="estado-vazio">Não foi possível contactar o servidor.</div>';
      totalBackups.textContent = "-";
    }
  }

  btnCriarBackup.addEventListener("click", async function () {
    btnCriarBackup.disabled = true;
    btnCriarBackup.textContent = "A criar backup...";
    mostrarMensagem(mensagemBackup, "", "");

    try {
      const resultado = await chamarApi({ acao: "criarBackup", token: token });
      mostrarMensagem(
        mensagemBackup,
        resultado.mensagem || (resultado.sucesso ? "Backup criado com sucesso." : "Não foi possível criar o backup."),
        resultado.sucesso ? "sucesso" : "erro"
      );
      if (resultado.sucesso) await carregarBackups();
    } catch (erro) {
      mostrarMensagem(mensagemBackup, "Não foi possível contactar o servidor.", "erro");
    } finally {
      btnCriarBackup.disabled = false;
      btnCriarBackup.textContent = "Criar backup agora";
    }
  });

  btnActualizar.addEventListener("click", carregarBackups);
  btnFecharRestauro.addEventListener("click", fecharModal);
  btnCancelarRestauro.addEventListener("click", fecharModal);
  modal.addEventListener("click", function (evento) {
    if (evento.target === modal) fecharModal();
  });

  confirmacaoRestauro.addEventListener("input", function () {
    btnConfirmarRestauro.disabled = confirmacaoRestauro.value.trim() !== "RESTAURAR";
  });

  btnConfirmarRestauro.addEventListener("click", async function () {
    if (!backupSeleccionado || confirmacaoRestauro.value.trim() !== "RESTAURAR") return;

    btnConfirmarRestauro.disabled = true;
    btnConfirmarRestauro.textContent = "A preparar...";
    mostrarMensagem(mensagemRestauro, "", "");

    try {
      const resultado = await chamarApi({
        acao: "restaurarBackup",
        token: token,
        idBackup: backupSeleccionado.idBackup || backupSeleccionado.idArquivo || "",
        confirmacao: "RESTAURAR"
      });

      mostrarMensagem(
        mensagemRestauro,
        resultado.mensagem || (resultado.sucesso ? "Cópia restaurada preparada com sucesso." : "Não foi possível preparar o restauro."),
        resultado.sucesso ? "sucesso" : "erro"
      );

      if (resultado.sucesso) {
        setTimeout(function () {
          fecharModal();
          carregarBackups();
        }, 1800);
      }
    } catch (erro) {
      mostrarMensagem(mensagemRestauro, "Não foi possível contactar o servidor.", "erro");
    } finally {
      btnConfirmarRestauro.disabled = confirmacaoRestauro.value.trim() !== "RESTAURAR";
      btnConfirmarRestauro.textContent = "Preparar restauro";
    }
  });

  carregarBackups();
});
