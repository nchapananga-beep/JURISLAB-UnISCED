const API_JURISLAB="https://script.google.com/macros/s/AKfycbyFzl8x8Kazn2ek0j5N8qF0f5beYNOSrNSfxx837FEF0do_gF3lzW3Z1UCvo9eeTROB/exec";

async function chamarApi(dados){
  const resposta=await fetch(API_JURISLAB,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(dados)});
  if(!resposta.ok)throw new Error("Falha no servidor.");
  return resposta.json();
}

function mostrarMensagem(elemento,texto,tipo){
  elemento.textContent=texto;
  elemento.className="mensagem-formulario";
  if(tipo)elemento.classList.add(tipo);
}

addEventListener("DOMContentLoaded",()=>{
  const form=document.getElementById("formPedidoPublico");
  const resumo=document.getElementById("resumoProblema");
  const contador=document.getElementById("contadorResumo");
  const mensagem=document.getElementById("mensagemPedido");
  const comprovativo=document.getElementById("comprovativoPedido");
  const botao=document.getElementById("btnEnviarPedido");
  const btnLimpar=document.getElementById("btnLimparPedido");

  resumo.addEventListener("input",()=>{contador.textContent=resumo.value.length+" caracteres"});
  btnLimpar.addEventListener("click",()=>{form.reset();contador.textContent="0 caracteres";mostrarMensagem(mensagem,"","");comprovativo.classList.add("oculto");comprovativo.innerHTML=""});

  form.addEventListener("submit",async evento=>{
    evento.preventDefault();
    if(!form.checkValidity()){form.reportValidity();return}
    const dados=new FormData(form);
    botao.disabled=true;
    botao.textContent="A enviar...";
    mostrarMensagem(mensagem,"A enviar o pedido...","");
    comprovativo.classList.add("oculto");
    try{
      const resultado=await chamarApi({acao:"registarPedidoPublico",nomeCompleto:dados.get("nomeCompleto"),telefone:dados.get("telefone"),email:dados.get("email"),provincia:dados.get("provincia"),distritoLocalidade:dados.get("distritoLocalidade"),areaJuridica:dados.get("areaJuridica"),resumoProblema:dados.get("resumoProblema"),urgencia:dados.get("urgencia"),formaContacto:dados.get("formaContacto"),horarioContacto:dados.get("horarioContacto"),consentimento:dados.get("consentimento")==="Sim"});
      mostrarMensagem(mensagem,resultado.mensagem||"",resultado.sucesso?"sucesso":"erro");
      if(resultado.sucesso){
        comprovativo.innerHTML=`<h2>Pedido recebido</h2><p>Guarde este código para referência:</p><p class="comprovativo-codigo">${String(resultado.idPedido||"").replace(/[&<>"']/g,"-")}</p><p>A equipa analisará as informações e entrará em contacto pelos dados fornecidos.</p>`;
        comprovativo.classList.remove("oculto");
        form.reset();
        contador.textContent="0 caracteres";
        comprovativo.scrollIntoView({behavior:"smooth",block:"center"});
      }
    }catch(erro){mostrarMensagem(mensagem,"Não foi possível enviar o pedido. Tente novamente.","erro")}
    finally{botao.disabled=false;botao.textContent="Enviar pedido"}
  });
});