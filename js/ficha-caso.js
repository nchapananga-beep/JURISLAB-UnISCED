const API_JURISLAB = "https://script.google.com/macros/s/AKfycbyFzl8x8Kazn2ek0j5N8qF0f5beYNOSrNSfxx837FEF0do_gF3lzW3Z1UCvo9eeTROB/exec";
const CHAVE_SESSAO = "JURISLAB_TOKEN";
const $ = id => document.getElementById(id);

function esc(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function api(dados) {
  const resposta = await fetch(API_JURISLAB, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(dados)
  });
  if (!resposta.ok) throw new Error("Falha no servidor");
  return resposta.json();
}

async function validar(token) {
  const resposta = await fetch(
    API_JURISLAB + "?acao=validarSessao&token=" + encodeURIComponent(token)
  );
  return resposta.json();
}

function vazio() {
  return '<div class="estado-vazio">Sem registos.</div>';
}

function itens(lista, modelo) {
  return lista.length ? lista.map(modelo).join("") : vazio();
}

function mostrarMensagem(elemento, texto, tipo) {
  elemento.textContent = texto || "";
  elemento.className = "mensagem-formulario";
  if (tipo) elemento.classList.add(tipo);
}

addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem(CHAVE_SESSAO);
  const idCaso = new URLSearchParams(location.search).get("idCaso") || "";

  if (!token || !idCaso) {
    location.href = "casos.html";
    return;
  }

  let casoActual = null;

  const modal = $("modalAtendimento");
  const form = $("formAtendimento");
  const btnGuardar = $("btnGuardarAtendimento");
  const mensagemAtendimento = $("mensagemAtendimento");

  const modalReabertura = $("modalReabertura");
  const formReabertura = $("formReabertura");
  const btnGuardarReabertura = $("btnGuardarReabertura");
  const mensagemReabertura = $("mensagemReabertura");

  function fecharModalAtendimento() {
    modal.classList.add("oculto");
    form.reset();
    mostrarMensagem(mensagemAtendimento, "", "");
  }

  function abrirModalAtendimento() {
    if (!casoActual) return;
    $("idCasoAtendimento").value = idCaso;
    $("idUtenteAtendimento").value = casoActual.idUtente || "";
    $("responsavelAtendimento").value = casoActual.responsavel || "";
    $("resumoCasoAtendimento").textContent =
      idCaso + " · " + (casoActual.tituloCaso || "Caso jurídico");
    mostrarMensagem(mensagemAtendimento, "", "");
    modal.classList.remove("oculto");
    $("tipoAtendimento").focus();
  }

  function fecharModalReabertura() {
    modalReabertura.classList.add("oculto");
    formReabertura.reset();
    mostrarMensagem(mensagemReabertura, "", "");
  }

  function abrirModalReabertura() {
    if (!casoActual) return;
    $("idCasoReabertura").value = idCaso;
    $("responsavelReabertura").value = casoActual.responsavel || "";
    $("resumoCasoReabertura").textContent =
      idCaso + " · " + (casoActual.tituloCaso || "Caso jurídico");
    mostrarMensagem(mensagemReabertura, "", "");
    modalReabertura.classList.remove("oculto");
    $("motivoReabertura").focus();
  }

  function renderizarResumo(caso) {
    $("tituloCaso").textContent = caso.tituloCaso || "Caso jurídico";
    $("codigoCaso").textContent = idCaso;
    $("resumoCaso").innerHTML = [
      ["Estado", caso.estadoCaso],
      ["Utente", caso.idUtente],
      ["Área", caso.areaDireito],
      ["Prioridade", caso.prioridade],
      ["Responsável", caso.responsavel || "Não atribuído"],
      ["Supervisor", caso.supervisor || "Não atribuído"],
      ["Abertura", caso.dataAbertura],
      ["Descrição", caso.descricaoCaso]
    ].map(([titulo, valor]) =>
      `<div class="dado-resumo"><strong>${esc(titulo)}</strong>${esc(valor || "Não informado")}</div>`
    ).join("");

    const estado = String(caso.estadoCaso || "").trim();
    const encerrado = estado === "Concluído" || estado === "Arquivado";
    $("btnReabrirCaso").classList.toggle("oculto", !encerrado);
    $("btnNovoAtendimento").classList.toggle("oculto", encerrado);
  }

  async function carregarFicha() {
    const [rc, ra, rco, rp, rd, re, rat] = await Promise.all([
      api({ acao: "listarCasos", token, pesquisa: idCaso, estado: "Todos" }),
      api({ acao: "listarAtendimentosCaso", token, idCaso }),
      api({ acao: "listarConsultas", token, pesquisa: idCaso, estado: "Todos" }),
      api({ acao: "listarPrazos", token, pesquisa: idCaso, estado: "Todos" }),
      api({ acao: "listarDocumentosCaso", token, idCaso, pesquisa: "", estado: "Todos" }),
      api({ acao: "listarEncaminhamentos", token, pesquisa: idCaso, estado: "Todos" }),
      api({ acao: "listarAtribuicoesCasos", token, pesquisa: idCaso, estado: "Todos" })
    ]);

    casoActual = (rc.casos || []).find(c => String(c.idCaso) === idCaso) || (rc.casos || [])[0];
    if (!casoActual) throw new Error("Caso não encontrado");

    renderizarResumo(casoActual);

    $("listaAtendimentos").innerHTML = itens(
      ra.atendimentos || [],
      atendimento => `
        <div class="item-ficha">
          <strong>${esc(atendimento.tipoAtendimento || "Atendimento")}</strong>
          <p>${esc(atendimento.resumoAtendimento || "")}</p>
          ${atendimento.modalidade ? `<p><b>Modalidade:</b> ${esc(atendimento.modalidade)}</p>` : ""}
          <p><b>Orientação:</b> ${esc(atendimento.orientacaoPrestada || "")}</p>
          ${atendimento.proximaAccao ? `<p><b>Próxima acção:</b> ${esc(atendimento.proximaAccao)}</p>` : ""}
          ${atendimento.dataProximaAccao ? `<p><b>Data prevista:</b> ${esc(atendimento.dataProximaAccao)}</p>` : ""}
        </div>`
    );

    $("listaConsultas").innerHTML = itens(
      (rco.consultas || []).filter(i => String(i.idCaso) === idCaso),
      i => `<div class="item-ficha"><strong>${esc(i.dataConsulta || "")} ${esc(i.horaConsulta || "")}</strong><p>${esc(i.modalidade || "")} · ${esc(i.estadoConsulta || i.estado || "")}</p></div>`
    );

    $("listaPrazos").innerHTML = itens(
      (rp.prazos || []).filter(i => String(i.idCaso) === idCaso),
      i => `<div class="item-ficha"><strong>${esc(i.descricaoPrazo || "Prazo")}</strong><p>Limite: ${esc(i.dataLimite || "")} · ${esc(i.situacao || i.estadoPrazo || "")}</p></div>`
    );

    $("listaDocumentos").innerHTML = itens(
      rd.documentos || [],
      i => `<div class="item-ficha"><strong>${esc(i.tituloDocumento || i.nomeFicheiro)}</strong><p>${esc(i.tipoDocumento || "")} · ${esc(i.estadoDocumento || "")}</p><a class="link-documento" href="${esc(i.urlDrive)}" target="_blank" rel="noopener">Abrir documento</a></div>`
    );

    $("listaEncaminhamentos").innerHTML = itens(
      (re.encaminhamentos || []).filter(i => String(i.idCaso) === idCaso),
      i => `<div class="item-ficha"><strong>${esc(i.instituicaoDestino || "Encaminhamento")}</strong><p>${esc(i.motivoEncaminhamento || "")}</p><p>${esc(i.estadoEncaminhamento || i.estado || "")}</p></div>`
    );

    $("listaAtribuicoes").innerHTML = itens(
      (rat.atribuicoes || []).filter(i => String(i.idCaso) === idCaso),
      i => `<div class="item-ficha"><strong>${esc(i.tipoAtribuicao || "Atribuição")}</strong><p>Estudante: ${esc(i.estudante || "Não indicado")}</p><p>Jurista: ${esc(i.juristaResponsavel || "Não indicado")}</p><p>Estado: ${esc(i.estadoAtribuicao || "")}</p></div>`
    );
  }

  try {
    const sessao = await validar(token);
    if (!sessao.sucesso || !sessao.valida) {
      location.href = "login.html";
      return;
    }

    $("ecraValidacao").classList.add("oculto");
    await carregarFicha();

    $("btnImprimir").onclick = () => window.print();
    $("btnNovoAtendimento").onclick = abrirModalAtendimento;
    $("btnReabrirCaso").onclick = abrirModalReabertura;
    $("btnFecharAtendimento").onclick = fecharModalAtendimento;
    $("btnCancelarAtendimento").onclick = fecharModalAtendimento;
    $("btnFecharReabertura").onclick = fecharModalReabertura;
    $("btnCancelarReabertura").onclick = fecharModalReabertura;

    modal.onclick = evento => {
      if (evento.target === modal) fecharModalAtendimento();
    };
    modalReabertura.onclick = evento => {
      if (evento.target === modalReabertura) fecharModalReabertura();
    };

    form.onsubmit = async evento => {
      evento.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        mostrarMensagem(mensagemAtendimento, "Preencha os campos obrigatórios.", "erro");
        return;
      }

      const dados = new FormData(form);
      btnGuardar.disabled = true;
      btnGuardar.textContent = "A guardar...";
      mostrarMensagem(mensagemAtendimento, "", "");

      try {
        const resultado = await api({
          acao: "registarAtendimentoCaso",
          token,
          idCaso: dados.get("idCaso"),
          idUtente: dados.get("idUtente"),
          tipoAtendimento: dados.get("tipoAtendimento"),
          modalidade: dados.get("modalidade"),
          resumoAtendimento: dados.get("resumoAtendimento"),
          analiseJuridica: dados.get("analiseJuridica"),
          orientacaoPrestada: dados.get("orientacaoPrestada"),
          documentosRecebidos: dados.get("documentosRecebidos"),
          proximaAccao: dados.get("proximaAccao"),
          dataProximaAccao: dados.get("dataProximaAccao"),
          responsavel: dados.get("responsavel"),
          estadoCaso: "Em atendimento"
        });

        mostrarMensagem(
          mensagemAtendimento,
          resultado.mensagem || (resultado.sucesso ? "Atendimento registado com sucesso." : "Não foi possível registar o atendimento."),
          resultado.sucesso ? "sucesso" : "erro"
        );

        if (resultado.sucesso) {
          setTimeout(async () => {
            fecharModalAtendimento();
            await carregarFicha();
          }, 900);
        }
      } catch (erro) {
        mostrarMensagem(mensagemAtendimento, "Não foi possível contactar o servidor. Tente novamente.", "erro");
      } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = "Guardar atendimento";
      }
    };

    formReabertura.onsubmit = async evento => {
      evento.preventDefault();
      if (!formReabertura.checkValidity()) {
        formReabertura.reportValidity();
        mostrarMensagem(mensagemReabertura, "Preencha os campos obrigatórios.", "erro");
        return;
      }

      const dados = new FormData(formReabertura);
      btnGuardarReabertura.disabled = true;
      btnGuardarReabertura.textContent = "A reabrir...";
      mostrarMensagem(mensagemReabertura, "", "");

      try {
        const resultado = await api({
          acao: "reabrirCaso",
          token,
          idCaso: dados.get("idCaso"),
          motivoReabertura: dados.get("motivoReabertura"),
          responsavel: dados.get("responsavel")
        });

        mostrarMensagem(
          mensagemReabertura,
          resultado.mensagem || (resultado.sucesso ? "Caso reaberto com sucesso." : "Não foi possível reabrir o caso."),
          resultado.sucesso ? "sucesso" : "erro"
        );

        if (resultado.sucesso) {
          setTimeout(async () => {
            fecharModalReabertura();
            await carregarFicha();
          }, 900);
        }
      } catch (erro) {
        mostrarMensagem(mensagemReabertura, "Não foi possível contactar o servidor. Tente novamente.", "erro");
      } finally {
        btnGuardarReabertura.disabled = false;
        btnGuardarReabertura.textContent = "Confirmar reabertura";
      }
    };
  } catch (erro) {
    $("ecraValidacao").classList.add("oculto");
    $("mensagemFicha").textContent = erro.message || "Não foi possível carregar a ficha do caso.";
    $("mensagemFicha").classList.add("erro");
  }
});