document.addEventListener("DOMContentLoaded", function () {
  const menuBotao = document.getElementById("menuBotao");
  const menuPrincipal = document.getElementById("menuPrincipal");
  const anoActual = document.getElementById("anoActual");

  if (anoActual) {
    anoActual.textContent = new Date().getFullYear();
  }

  if (menuBotao && menuPrincipal) {
    menuBotao.addEventListener("click", function () {
      const aberto = menuPrincipal.classList.toggle("aberto");

      menuBotao.setAttribute(
        "aria-expanded",
        String(aberto)
      );
    });

    const linksMenu = menuPrincipal.querySelectorAll("a");

    linksMenu.forEach(function (link) {
      link.addEventListener("click", function () {
        menuPrincipal.classList.remove("aberto");
        menuBotao.setAttribute("aria-expanded", "false");
      });
    });
  }
});
