document.addEventListener("DOMContentLoaded",function(){
  const bruto=sessionStorage.getItem("JURISLAB_TRIAGEM_ABRIR");
  if(!bruto)return;

  let dados;
  try{dados=JSON.parse(bruto)}catch{sessionStorage.removeItem("JURISLAB_TRIAGEM_ABRIR");return}

  const idTriagem=String(dados.idTriagem||"").trim();
  if(!idTriagem){sessionStorage.removeItem("JURISLAB_TRIAGEM_ABRIR");return}

  const tentarAbrir=function(tentativas){
    const campo=document.getElementById("campoPesquisa");
    const filtro=document.getElementById("filtroEstado");
    const form=document.getElementById("formFiltros");

    if(!campo||!filtro||!form){
      if(tentativas>0)setTimeout(()=>tentarAbrir(tentativas-1),300);
      return;
    }

    campo.value=idTriagem;
    filtro.value="Todos";
    form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));

    let esperas=20;
    const procurarBotao=function(){
      const cartoes=[...document.querySelectorAll(".triagem-cartao")];
      const cartao=cartoes.find(c=>c.textContent.includes(idTriagem));
      const botao=cartao?cartao.querySelector("button[data-indice]"):null;

      if(botao){
        sessionStorage.removeItem("JURISLAB_TRIAGEM_ABRIR");
        botao.click();
        return;
      }

      esperas--;
      if(esperas>0)setTimeout(procurarBotao,300);
    };

    setTimeout(procurarBotao,500);
  };

  setTimeout(()=>tentarAbrir(15),500);
});