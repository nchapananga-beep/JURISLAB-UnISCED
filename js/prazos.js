const API_JURISLAB="https://script.google.com/macros/s/AKfycbyFzl8x8Kazn2ek0j5N8qF0f5beYNOSrNSfxx837FEF0do_gF3lzW3Z1UCvo9eeTROB/exec";
const CHAVE_SESSAO="JURISLAB_TOKEN";
const CHAVE_UTILIZADOR="JURISLAB_UTILIZADOR";
function limparSessaoLocal(){localStorage.removeItem(CHAVE_SESSAO);localStorage.removeItem(CHAVE_UTILIZADOR)}
function irParaLogin(){window.location.href="login.html"}
async function validarSessao(token){const r=await fetch(API_JURISLAB+"?acao=validarSessao&token="+encodeURIComponent(token));if(!r.ok)throw new Error();return r.json()}
async function chamarApi(dados){const r=await fetch(API_JURISLAB,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(dados)});if(!r.ok)throw new Error();return r.json()}
function escaparHtml(v){return String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
function mostrarMensagem(el,texto,tipo){el.textContent=texto;el.className="mensagem-formulario";if(tipo)el.classList.add(tipo)}
function classeSituacao(s){const n=String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");if(n==="vencido")return"situacao-vencido";if(n==="proximo")return"situacao-proximo";if(n==="cumprido")return"situacao-cumprido";return"situacao-pendente"}
function renderizarPrazos(prazos,lista,resumo,abrirCumprir){
  if(!Array.isArray(prazos)||!prazos.length){lista.innerHTML='<div class="estado-vazio">Nenhum prazo encontrado.</div>';resumo.textContent="0 prazos encontrados.";return}
  resumo.textContent=prazos.length+(prazos.length===1?" prazo encontrado.":" prazos encontrados.");
  lista.innerHTML=prazos.map((p,i)=>`<article class="prazo-cartao ${classeSituacao(p.situacao)}"><div class="prazo-topo"><div><h2>${escaparHtml(p.descricaoPrazo||"Prazo jurídico")}</h2><span class="prazo-codigo">${escaparHtml(p.idPrazo)}</span></div><span class="situacao-etiqueta">${escaparHtml(p.situacao||p.estadoPrazo||"Pendente")}</span></div><div class="prazo-dados"><span><strong>Caso:</strong> ${escaparHtml(p.idCaso||"")}</span><span><strong>Utente:</strong> ${escaparHtml(p.idUtente||"")}</span><span><strong>Data limite:</strong> ${escaparHtml(p.dataLimite||"")}</span><span><strong>Responsável:</strong> ${escaparHtml(p.responsavel||"Não atribuído")}</span><span><strong>Estado:</strong> ${escaparHtml(p.estadoPrazo||"")}</span>${p.dataCumprimento?`<span><strong>Cumprido em:</strong> ${escaparHtml(p.dataCumprimento)}</span>`:""}</div>${p.observacoes?`<p class="observacoes-prazo">${escaparHtml(p.observacoes)}</p>`:""}${p.estadoPrazo==="Cumprido"?"":`<div class="prazo-acoes"><button class="botao botao-principal" data-indice="${i}">Marcar como cumprido</button></div>`}</article>`).join("");
  lista.querySelectorAll("button[data-indice]").forEach(b=>b.addEventListener("click",()=>abrirCumprir(prazos[Number(b.dataset.indice)])))
}
addEventListener("DOMContentLoaded",async()=>{
  const token=localStorage.getItem(CHAVE_SESSAO);if(!token){limparSessaoLocal();irParaLogin();return}
  try{const s=await validarSessao(token);if(!s.sucesso||!s.valida){limparSessaoLocal();irParaLogin();return}document.getElementById("ecraValidacao").classList.add("oculto")}catch(e){limparSessaoLocal();irParaLogin();return}
  const campo=document.getElementById("campoPesquisa"),filtro=document.getElementById("filtroEstado"),lista=document.getElementById("listaPrazos"),resumo=document.getElementById("resumoResultados"),mensagem=document.getElementById("mensagemPrazos"),modal=document.getElementById("modalCumprir"),form=document.getElementById("formCumprir");
  function fechar(){modal.classList.add("oculto");form.reset();mostrarMensagem(document.getElementById("mensagemCumprimento"),"","")}
  function abrirCumprir(p){form.idPrazo.value=p.idPrazo||"";document.getElementById("resumoPrazo").textContent=(p.idPrazo||"")+" · "+(p.descricaoPrazo||"Prazo jurídico");modal.classList.remove("oculto")}
  async function carregar(){resumo.textContent="A carregar prazos...";mostrarMensagem(mensagem,"","");try{const r=await chamarApi({acao:"listarPrazos",token,pesquisa:campo.value.trim(),estado:filtro.value});if(!r.sucesso){lista.innerHTML="";resumo.textContent="";mostrarMensagem(mensagem,r.mensagem||"Não foi possível carregar os prazos.","erro");return}renderizarPrazos(r.prazos||[],lista,resumo,abrirCumprir)}catch(e){lista.innerHTML="";resumo.textContent="";mostrarMensagem(mensagem,"Não foi possível contactar o servidor.","erro")}}
  document.getElementById("formFiltros").addEventListener("submit",e=>{e.preventDefault();carregar()});
  filtro.addEventListener("change",carregar);
  document.getElementById("btnLimpar").addEventListener("click",()=>{campo.value="";filtro.value="Todos";carregar()});
  document.getElementById("btnFecharCumprir").addEventListener("click",fechar);document.getElementById("btnCancelarCumprir").addEventListener("click",fechar);modal.addEventListener("click",e=>{if(e.target===modal)fechar()});
  form.addEventListener("submit",async e=>{e.preventDefault();const d=new FormData(form),b=document.getElementById("btnConfirmarCumprimento"),m=document.getElementById("mensagemCumprimento");b.disabled=true;b.textContent="A confirmar...";try{const r=await chamarApi({acao:"cumprirPrazo",token,idPrazo:d.get("idPrazo"),observacoes:d.get("observacoes")});if(!r.sucesso){mostrarMensagem(m,r.mensagem||"Não foi possível actualizar o prazo.","erro");return}mostrarMensagem(m,r.mensagem||"Prazo marcado como cumprido.","sucesso");setTimeout(()=>{fechar();carregar()},1200)}catch(x){mostrarMensagem(m,"Não foi possível contactar o servidor.","erro")}finally{b.disabled=false;b.textContent="Confirmar cumprimento"}});
  carregar()
});