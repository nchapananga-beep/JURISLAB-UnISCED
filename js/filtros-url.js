document.addEventListener("DOMContentLoaded",function(){
  const params=new URLSearchParams(window.location.search);
  const campo=document.getElementById("campoPesquisa");
  const estado=document.getElementById("filtroEstado");
  const termo=params.get("idUtente")||params.get("idTriagem")||params.get("pesquisa")||"";
  const estadoUrl=params.get("estado")||"";

  if(campo&&termo){
    campo.value=termo;
  }

  if(estado&&estadoUrl){
    const existe=[...estado.options].some(opcao=>opcao.value===estadoUrl);
    if(existe)estado.value=estadoUrl;
  }

  if(!termo&&!estadoUrl)return;

  setTimeout(function(){
    const form=document.getElementById("formPesquisa")||document.getElementById("formFiltros");
    if(form){
      form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));
    }
  },700);
});