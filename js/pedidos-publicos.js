const API_JURISLAB="https://script.google.com/macros/s/AKfycbyFzl8x8Kazn2ek0j5N8qF0f5beYNOSrNSfxx837FEF0do_gF3lzW3Z1UCvo9eeTROB/exec";
const CHAVE_SESSAO="JURISLAB_TOKEN";

async function chamarApi(dados){const resposta=await fetch(API_JURISLAB,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(dados)});if(!resposta.ok)throw new Error("Falha no servidor.");return resposta.json()}
async function validarSessao(token){const resposta=await fetch(API_JURISLAB+"?acao=validarSessao&token="+encodeURIComponent(token));if(!resposta.ok)throw new Error("Falha na validação.");return resposta.json()}
function esc(valor){return String(valor||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
function mostrarMensagem(elemento,texto,tipo){elemento.textContent=texto;elemento.className="mensagem-formulario";if(tipo)elemento.classList.add(tipo)}

addEventListener("DOMContentLoaded",async()=>{
  const token=localStorage.getItem(CHAVE_SESSAO);
  if(!token){location.href="login.html";return}
  try{const sessao=await validarSessao(token);if(!sessao.sucesso||!sessao.valida){location.href="login.html";return}document.getElementById("ecraValidacao").classList.add("oculto")}catch{location.href="login.html";return}

  const lista=document.getElementById("listaPedidos");
  const resumo=document.getElementById("resumoResultados");
  const mensagem=document.getElementById("mensagemPedidos");
  const pesquisa=document.getElementById("campoPesquisa");
  const filtro=document.getElementById("filtroEstado");
  const modal=document.getElementById("modalAnalise");
  const form=document.getElementById("formAnalise");
  const mensagemAnalise=document.getElementById("mensagemAnalise");
  const btnGuardar=document.getElementById("btnGuardarAnalise");

  function actualizarResumo(pedidos){
    document.getElementById("totalPedidos").textContent=pedidos.length;
    document.getElementById("totalPendentes").textContent=pedidos.filter(p=>p.estadoPedido==="Pendente").length;
    document.getElementById("totalAnalise").textContent=pedidos.filter(p=>p.estadoPedido==="Em análise").length;
    document.getElementById("totalAceites").textContent=pedidos.filter(p=>p.estadoPedido==="Aceite").length;
  }

  function renderizar(pedidos){
    resumo.textContent=pedidos.length+(pedidos.length===1?" pedido encontrado.":" pedidos encontrados.");
    actualizarResumo(pedidos);
    lista.innerHTML=pedidos.length?pedidos.map((p,i)=>`<article class="pedido-cartao"><div class="pedido-topo-cartao"><div><h2>${esc(p.nomeCompleto)}</h2><span class="pedido-codigo">${esc(p.idPedido)} · ${esc(p.dataPedido)}</span></div><span class="pedido-estado">${esc(p.estadoPedido||"Pendente")}</span></div><div class="pedido-dados"><span><strong>Telefone:</strong> ${esc(p.telefone||"Não indicado")}</span><span><strong>Email:</strong> ${esc(p.email||"Não indicado")}</span><span><strong>Província:</strong> ${esc(p.provincia)}</span><span><strong>Localidade:</strong> ${esc(p.distritoLocalidade||"Não indicada")}</span><span><strong>Área:</strong> ${esc(p.areaJuridica)}</span><span><strong>Urgência:</strong> ${esc(p.urgencia||"Normal")}</span><span><strong>Contacto:</strong> ${esc(p.formaContacto||"Não indicado")}</span><span><strong>Horário:</strong> ${esc(p.horarioContacto||"Não indicado")}</span><span><strong>Analisado por:</strong> ${esc(p.responsavelAnalise||"Ainda não analisado")}</span></div><p class="pedido-resumo">${esc(p.resumoProblema)}</p>${p.observacoesInternas?`<p class="pedido-observacoes"><strong>Observações internas:</strong> ${esc(p.observacoesInternas)}</p>`:""}<div class="pedido-acoes"><button class="botao botao-principal" data-analisar="${i}" type="button">Analisar pedido</button>${p.telefone?`<a class="botao botao-secundario" href="tel:${esc(p.telefone)}">Ligar</a>`:""}${p.email?`<a class="botao botao-secundario" href="mailto:${esc(p.email)}">Enviar email</a>`:""}</div></article>`).join(""):'<div class="estado-vazio">Nenhum pedido encontrado.</div>';
    lista.querySelectorAll("button[data-analisar]").forEach(botao=>botao.onclick=()=>abrirAnalise(pedidos[Number(botao.dataset.analisar)]));
  }

  function abrirAnalise(pedido){
    form.idPedido.value=pedido.idPedido||"";
    form.estadoPedido.value=pedido.estadoPedido||"Pendente";
    form.observacoesInternas.value=pedido.observacoesInternas||"";
    document.getElementById("resumoPedidoSeleccionado").textContent=(pedido.idPedido||"")+" · "+(pedido.nomeCompleto||"");
    mostrarMensagem(mensagemAnalise,"","");
    modal.classList.remove("oculto");
  }

  function fecharAnalise(){modal.classList.add("oculto");form.reset();mostrarMensagem(mensagemAnalise,"","")}

  async function carregar(){
    resumo.textContent="A carregar pedidos...";
    mostrarMensagem(mensagem,"","");
    try{const resultado=await chamarApi({acao:"listarPedidosPublicos",token,pesquisa:pesquisa.value.trim(),estado:filtro.value});if(!resultado.sucesso){mostrarMensagem(mensagem,resultado.mensagem||"Não foi possível carregar os pedidos.","erro");return}renderizar(resultado.pedidos||[])}catch{mostrarMensagem(mensagem,"Não foi possível contactar o servidor.","erro")}
  }

  document.getElementById("formFiltros").onsubmit=e=>{e.preventDefault();carregar()};
  document.getElementById("btnLimpar").onclick=()=>{pesquisa.value="";filtro.value="Todos";carregar()};
  filtro.onchange=carregar;
  document.getElementById("btnFecharAnalise").onclick=fecharAnalise;
  document.getElementById("btnCancelarAnalise").onclick=fecharAnalise;

  form.onsubmit=async e=>{
    e.preventDefault();
    if(!form.checkValidity()){form.reportValidity();return}
    const dados=new FormData(form);
    btnGuardar.disabled=true;
    btnGuardar.textContent="A guardar...";
    try{const resultado=await chamarApi({acao:"actualizarPedidoPublico",token,idPedido:dados.get("idPedido"),estadoPedido:dados.get("estadoPedido"),observacoesInternas:dados.get("observacoesInternas")});mostrarMensagem(mensagemAnalise,resultado.mensagem||"",resultado.sucesso?"sucesso":"erro");if(resultado.sucesso)setTimeout(()=>{fecharAnalise();carregar()},900)}catch{mostrarMensagem(mensagemAnalise,"Não foi possível contactar o servidor.","erro")}finally{btnGuardar.disabled=false;btnGuardar.textContent="Guardar alteração"}
  };

  carregar();
});