(() => {
  "use strict";

  const CHAVE_UTILIZADOR = "JURISLAB_UTILIZADOR";

  function normalizar(valor) {
    return String(valor || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  const PERMISSOES = {
    administrador: ["*"],
    supervisor: [
      "visualizar",
      "historico",
      "documentos",
      "atribuir",
      "atendimento",
      "consulta",
      "prazo",
      "encaminhar",
      "encerrar"
    ],
    jurista: [
      "visualizar",
      "historico",
      "documentos",
      "atendimento",
      "consulta",
      "prazo",
      "encaminhar"
    ],
    "tutor interno": [
      "visualizar",
      "historico",
      "documentos",
      "atendimento",
      "consulta",
      "prazo",
      "encaminhar"
    ],
    "tutor externo": [
      "visualizar",
      "historico",
      "documentos",
      "atendimento",
      "consulta",
      "prazo",
      "encaminhar"
    ],
    estudante: [
      "visualizar",
      "historico",
      "documentos"
    ]
  };

  function obterUtilizador() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_UTILIZADOR) || "{}") || {};
    } catch (erro) {
      return {};
    }
  }

  function obterPerfil() {
    return normalizar(obterUtilizador().perfil);
  }

  function pode(acao) {
    const perfil = obterPerfil();
    const permissao = normalizar(acao);
    const lista = PERMISSOES[perfil] || ["visualizar"];
    return lista.includes("*") || lista.includes(permissao);
  }

  function exigir(acao, mensagem) {
    if (pode(acao)) return true;
    alert(mensagem || "O seu perfil não possui permissão para realizar esta operação.");
    return false;
  }

  window.JURISLAB_PERMISSOES = {
    pode,
    exigir,
    obterPerfil,
    obterUtilizador
  };
})();