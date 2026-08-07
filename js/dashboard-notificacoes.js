(() => {
  "use strict";

  function numero(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    const n = Number(String(el.textContent || "").replace(/[^0-9-]/g, ""));
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }

  function actualizar() {
    const badge = document.getElementById("notificacoesTopoBadge");
    if (!badge) return;
    const total =
      numero("indicadorCasosSemResponsavel") +
      numero("indicadorTriagensPendentes") +
      numero("indicadorPrazosProximos") +
      numero("indicadorPrazosVencidos");
    badge.textContent = total > 99 ? "99+" : String(total);
    badge.dataset.total = String(total);
    const link = document.getElementById("linkNotificacoesTopo");
    if (link) link.setAttribute("aria-label", total ? `${total} prioridade(s) no Centro de Notificações` : "Centro de Notificações");
  }

  document.addEventListener("DOMContentLoaded", () => {
    [
      "indicadorCasosSemResponsavel",
      "indicadorTriagensPendentes",
      "indicadorPrazosProximos",
      "indicadorPrazosVencidos"
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) new MutationObserver(actualizar).observe(el, { childList: true, characterData: true, subtree: true });
    });
    actualizar();
    setTimeout(actualizar, 1000);
    setTimeout(actualizar, 2500);
  });
})();
