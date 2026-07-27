const API_JURISLAB = "https://script.google.com/macros/s/AKfycbyFzl8x8Kazn2ek0j5N8qF0f5beYNOSrNSfxx837FEF0do_gF3lzW3Z1UCvo9eeTROB/exec";
const CHAVE_SESSAO = "JURISLAB_TOKEN";
const $ = id => document.getElementById(id);
let utilizadores = [];

async function api(dados) {
  const resposta = await fetch(API_JURISLAB, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(dados)
  });
  if (!resposta.ok) throw new Error("Falha no servidor.");
  return resposta.json();
}

async function validar(token) {
  const resposta = await fetch(API_JURISLAB + "?acao=validarSessao&token=" + encodeURIComponent(token));
  if (!resposta.ok) throw new Error("Falha na sessão.");
  return resposta.json();
}

function esc(valor) {
  return String(valor || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

function normalizarActivo(utilizador) {
  const valor = String(utilizador.activo ?? utilizador.ativo ?? utilizador.estado ?? "").trim().toLowerCase();
  return ["sim","s","y","yes","true","1","activo","ativo"].includes(valor);
}

function preencherPerfis() {
  const perfis = [...new Set(utilizadores.map(u => String(u.perfil || "").trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b,"pt"));
  $("filtroPerfil").innerHTML = '<option value="">Todos os perfis</option>' + perfis.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join("");
}

function actualizarIndicadores() {
  $("totalUtilizadores").textContent = utilizadores.length;
  $("totalActivos").textContent = utilizadores.filter(normalizarActivo).length;
  $("totalInactivos").textContent = utilizadores.filter(u => !normalizarActivo(u)).length;
  $("totalAdministradores").textContent = utilizadores.filter(u => String(u.perfil || "").trim().toLowerCase() === "administrador").length;
}

function renderizar() {
  const pesquisa = $("pesquisaUtilizador").value.trim().toLowerCase();
  const perfil = $("filtroPerfil").value;
  const estado = $("filtroEstado").value;
  const filtrados = utilizadores.filter(u => {
    const activo = normalizarActivo(u);
    const texto = [u.nome,u.email,u.perfil].join(" ").toLowerCase();
    if (pesquisa && !texto.includes(pesquisa)) return false;
    if (perfil && String(u.perfil || "") !== perfil) return false;
    if (estado === "Activo" && !activo) return false;
    if (estado === "Inactivo" && activo) return false;
    return true;
  });

  $("corpoUtilizadores").innerHTML = filtrados.length ? filtrados.map(u => {
    const activo = normalizarActivo(u);
    const email = String(u.email || "").trim();
    const perfilActual = String(u.perfil || "").trim();
    const perfis = ["administrador","supervisor","jurista","tutor interno","tutor externo","estudante","público"];
    if (perfilActual && !perfis.includes(perfilActual)) perfis.push(perfilActual);
    return `<tr>
      <td><strong>${esc(u.nome || "Não informado")}</strong></td>
      <td>${esc(email)}</td>
      <td><select class="select-perfil" data-email="${esc(email)}">${perfis.map(p => `<option value="${esc(p)}" ${p===perfilActual?"selected":""}>${esc(p)}</option>`).join("")}</select></td>
      <td><span class="estado-acesso ${activo?"activo":"inactivo"}">${activo?"Activo":"Inactivo"}</span></td>
      <td>${esc(u.ultimoAcesso || u.dataUltimoAcesso || "—")}</td>
      <td class="acoes-utilizador"><button class="botao-tabela guardar-perfil" data-email="${esc(email)}" type="button">Guardar perfil</button><button class="botao-tabela ${activo?"desactivar":"activar"}" data-email="${esc(email)}" data-activo="${activo?"false":"true"}" type="button">${activo?"Desactivar":"Activar"}</button></td>
    </tr>`;
  }).join("") : '<tr><td colspan="6" class="estado-vazio">Nenhum utilizador encontrado.</td></tr>';
}

async function carregar(token) {
  $("mensagemAdmin").textContent = "A carregar utilizadores...";
  $("mensagemAdmin").className = "mensagem-formulario";
  const resultado = await api({ acao: "listarUtilizadores", token });
  if (!resultado.sucesso) throw new Error(resultado.mensagem || "Não foi possível listar os utilizadores.");
  utilizadores = resultado.utilizadores || [];
  preencherPerfis();
  actualizarIndicadores();
  renderizar();
  $("mensagemAdmin").textContent = "Utilizadores carregados com sucesso.";
  $("mensagemAdmin").className = "mensagem-formulario sucesso";
}

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem(CHAVE_SESSAO);
  if (!token) { location.href = "login.html"; return; }

  try {
    const sessao = await validar(token);
    const perfil = String(sessao.utilizador?.perfil || "").trim().toLowerCase();
    if (!sessao.sucesso || !sessao.valida || perfil !== "administrador") {
      location.href = "dashboard.html";
      return;
    }
    $("ecraValidacao").classList.add("oculto");
    await carregar(token);
  } catch (erro) {
    $("ecraValidacao").classList.add("oculto");
    $("mensagemAdmin").textContent = erro.message || "Não foi possível carregar a administração.";
    $("mensagemAdmin").className = "mensagem-formulario erro";
  }

  ["pesquisaUtilizador","filtroPerfil","filtroEstado"].forEach(id => $(id).addEventListener("input", renderizar));
  $("btnActualizar").onclick = () => carregar(token).catch(erro => { $("mensagemAdmin").textContent = erro.message; $("mensagemAdmin").className = "mensagem-formulario erro"; });

  $("corpoUtilizadores").addEventListener("click", async evento => {
    const botao = evento.target.closest("button[data-email]");
    if (!botao) return;
    const email = botao.dataset.email;
    botao.disabled = true;
    try {
      let resultado;
      if (botao.classList.contains("guardar-perfil")) {
        const select = document.querySelector(`.select-perfil[data-email="${CSS.escape(email)}"]`);
        resultado = await api({ acao: "actualizarPerfilUtilizador", token, email, perfil: select.value });
      } else {
        resultado = await api({ acao: "alterarEstadoUtilizador", token, email, activo: botao.dataset.activo === "true" });
      }
      if (!resultado.sucesso) throw new Error(resultado.mensagem || "Não foi possível actualizar o utilizador.");
      await carregar(token);
    } catch (erro) {
      $("mensagemAdmin").textContent = erro.message;
      $("mensagemAdmin").className = "mensagem-formulario erro";
    } finally {
      botao.disabled = false;
    }
  });
});