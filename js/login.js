document.addEventListener("DOMContentLoaded", function () {
  const formulario = document.getElementById("formLogin");
  const email = document.getElementById("email");
  const senha = document.getElementById("senha");
  const mostrarSenha = document.getElementById("mostrarSenha");
  const mensagem = document.getElementById("mensagemLogin");

  if (mostrarSenha && senha) {
    mostrarSenha.addEventListener("click", function () {
      const estaOculta = senha.type === "password";
      senha.type = estaOculta ? "text" : "password";
      mostrarSenha.textContent = estaOculta ? "Ocultar" : "Mostrar";
      mostrarSenha.setAttribute(
        "aria-label",
        estaOculta ? "Ocultar palavra-passe" : "Mostrar palavra-passe"
      );
    });
  }

  if (formulario) {
    formulario.addEventListener("submit", function (evento) {
      evento.preventDefault();

      const emailInformado = email.value.trim();
      const senhaInformada = senha.value;

      if (!emailInformado || !senhaInformada) {
        mensagem.textContent = "Preencha o email e a palavra-passe.";
        return;
      }

      if (!email.validity.valid) {
        mensagem.textContent = "Introduza um endereço de email válido.";
        email.focus();
        return;
      }

      mensagem.textContent = "A página está pronta. A autenticação será ligada ao Google Apps Script na próxima etapa.";
    });
  }
});
