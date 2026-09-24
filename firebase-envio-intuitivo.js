(() => {
  const pagina = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const params = new URLSearchParams(location.search);
  const vagaId = params.get("vaga") || "";
  const vagaTitulo = params.get("titulo") || "";
  const modoPdf = params.get("modo") === "pdf";

  function el(tag, classe = "", texto = "") {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto) elemento.textContent = texto;
    return elemento;
  }

  function agendar(fn) {
    if (agendar.pendente) return;
    agendar.pendente = true;
    requestAnimationFrame(() => {
      agendar.pendente = false;
      fn();
    });
  }

  function montarGuiaCurriculo() {
    if (!vagaId || !vagaTitulo || document.querySelector("#guia-envio-vaga")) return;

    const ancora = document.querySelector("#vaga-selecionada-firebase");
    const painelSalvos = document.querySelector(".saved-panel");
    if (!ancora && !painelSalvos) return;

    const box = el("section", "panel envio-fluxo-box");
    box.id = "guia-envio-vaga";

    const label = el("p", "small-label", modoPdf ? "ENVIO DE PDF PARA A VAGA" : "CANDIDATURA EM ANDAMENTO");
    const titulo = el("h2", "", vagaTitulo);
    box.append(label, titulo);

    if (modoPdf) {
      box.appendChild(el("p", "envio-fluxo-intro", "Selecione o seu arquivo PDF abaixo e clique em “Enviar PDF para esta vaga”. Quando aparecer a confirmação, o currículo já estará disponível para o professor avaliar."));
    } else {
      box.appendChild(el("p", "envio-fluxo-intro", "Para o seu currículo chegar ao professor, conclua os 3 passos abaixo:"));

      const passos = el("ol", "envio-passos");
      [
        ["1", "Crie ou edite o currículo", "Preencha as informações e deixe o currículo pronto para a vaga."],
        ["2", "Salve o currículo", "Salvar guarda a sua versão, mas ainda não envia para o professor."],
        ["3", "Envie para o professor", "Na lista “Suas versões”, clique no botão verde ENVIAR ESTE CURRÍCULO PARA O PROFESSOR."]
      ].forEach(([numero, forte, texto]) => {
        const li = document.createElement("li");
        li.append(el("span", "envio-passo-numero", numero));
        const copia = el("div");
        copia.append(el("strong", "", forte), el("span", "", texto));
        li.appendChild(copia);
        passos.appendChild(li);
      });
      box.appendChild(passos);

      const aviso = el("div", "envio-alerta");
      aviso.append(el("strong", "", "IMPORTANTE: "), document.createTextNode("salvar o currículo não significa enviá-lo para a vaga."));
      box.appendChild(aviso);

      const ir = el("button", "btn btn-primary envio-ir-lista", "Ir para meus currículos e enviar");
      ir.type = "button";
      ir.addEventListener("click", () => {
        document.querySelector(".saved-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      box.appendChild(ir);
    }

    (ancora || painelSalvos).insertAdjacentElement("afterend", box);
  }

  function ajustarPdf() {
    if (!vagaId) return;
    const box = document.querySelector("#pdf-externo-firebase");
    if (!box) return;
    box.classList.toggle("envio-vaga-oculto", !modoPdf);
  }

  function ajustarCriacao() {
    if (!vagaId || !vagaTitulo || modoPdf) return;

    const novo = document.querySelector("#novo-curriculo");
    if (novo && novo.dataset.envioUx !== "ok") {
      novo.dataset.envioUx = "ok";
      novo.textContent = "+ Criar currículo para esta vaga";
      novo.addEventListener("click", () => {
        setTimeout(() => {
          const vaga = document.querySelector("#vagaAlvo");
          const nomeVersao = document.querySelector("#tituloCurriculo");
          if (vaga && !vaga.value.trim()) vaga.value = vagaTitulo;
          if (nomeVersao && !nomeVersao.value.trim()) nomeVersao.value = `Currículo - ${vagaTitulo}`;
        }, 0);
      });
    }

    const form = document.querySelector("#curriculo-form");
    if (!form) return;

    const salvar = form.querySelector('button[type="submit"]');
    if (salvar) salvar.textContent = "Salvar currículo e continuar para o envio";

    const visualizar = document.querySelector("#salvar-visualizar");
    if (visualizar) visualizar.textContent = "Salvar e visualizar antes de enviar";

    if (form.dataset.envioUx === "ok") return;
    form.dataset.envioUx = "ok";
    form.addEventListener("submit", () => {
      setTimeout(() => {
        ajustarCardsCurriculo();
        const idAtual = document.querySelector("#curriculo-id")?.value || "";
        let indice = -1;
        try {
          const curriculos = JSON.parse(localStorage.getItem("curriculosProfissionais") || "[]")
            .slice()
            .sort((a, b) => String(b.atualizadoEm || "").localeCompare(String(a.atualizadoEm || "")));
          indice = curriculos.findIndex((item) => String(item.id || "") === String(idAtual));
        } catch (_) {}

        const cards = [...document.querySelectorAll("#lista-curriculos .saved-card")];
        const card = indice >= 0 ? cards[indice] : cards[0];
        if (card) {
          card.classList.add("envio-card-destaque");
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => card.classList.remove("envio-card-destaque"), 3500);
        }

        const aviso = document.querySelector("#aviso-salvo");
        if (aviso) aviso.textContent = "Currículo salvo. Agora clique em ENVIAR ESTE CURRÍCULO PARA O PROFESSOR.";
      }, 120);
    });
  }

  function ajustarCardsCurriculo() {
    if (!vagaId || !vagaTitulo || modoPdf) return;

    const cards = [...document.querySelectorAll("#lista-curriculos .saved-card")];
    cards.forEach((card) => {
      const botao = card.querySelector(".firebase-enviar-vaga");
      if (!botao) return;

      botao.textContent = "ENVIAR ESTE CURRÍCULO PARA O PROFESSOR";
      botao.classList.add("envio-professor-btn");

      const acoes = card.querySelector(".saved-actions");
      if (acoes && acoes.firstElementChild !== botao) acoes.prepend(botao);

      if (!card.querySelector(".envio-card-status")) {
        const status = el("div", "envio-card-status");
        status.append(el("strong", "", "Ainda não enviado para esta vaga"), el("span", "", `Vaga: ${vagaTitulo}`));
        acoes?.insertAdjacentElement("beforebegin", status);
      }
    });
  }

  function ajustarPaginaCurriculos() {
    if (!vagaId || !vagaTitulo) return;
    montarGuiaCurriculo();
    ajustarPdf();
    ajustarCriacao();
    ajustarCardsCurriculo();
  }

  function ajustarCardVaga() {
    const card = document.querySelector('.vaga-card[data-vaga-id="assistente-de-suporte-de-ti"]');
    if (!card) return;

    const area = card.querySelector(".vaga-acoes-firebase");
    const links = area ? [...area.querySelectorAll("a, button")] : [...card.querySelectorAll("a, button")];
    const principal = links.find((item) => item.textContent.includes("Preparar currículo") || item.textContent.includes("Criar currículo para esta vaga"));
    const pdf = links.find((item) => item.textContent.includes("PDF"));
    const encaminhado = links.find((item) => item.textContent.includes("Currículo encaminhado"));

    if (principal) principal.textContent = "Criar ou escolher currículo para enviar";
    if (pdf) pdf.textContent = "Já tenho um currículo pronto em PDF";

    if (!card.querySelector(".vaga-envio-ajuda")) {
      const ajuda = el("div", "vaga-envio-ajuda");
      ajuda.append(
        el("strong", "", encaminhado ? "Currículo recebido pelo professor ✓" : "Como enviar para o professor"),
        el("span", "", encaminhado
          ? "Seu envio foi concluído. Agora é só aguardar a avaliação da entrevista."
          : "Crie ou escolha seu currículo e finalize no botão ENVIAR ESTE CURRÍCULO PARA O PROFESSOR.")
      );
      (area || card.lastElementChild)?.insertAdjacentElement("beforebegin", ajuda);
    } else if (encaminhado) {
      const ajuda = card.querySelector(".vaga-envio-ajuda");
      ajuda.querySelector("strong").textContent = "Currículo recebido pelo professor ✓";
      ajuda.querySelector("span").textContent = "Seu envio foi concluído. Agora é só aguardar a avaliação da entrevista.";
      ajuda.classList.add("vaga-envio-recebido");
    }
  }

  function iniciarCurriculos() {
    ajustarPaginaCurriculos();
    const alvo = document.querySelector("main") || document.body;
    const observer = new MutationObserver(() => agendar(ajustarPaginaCurriculos));
    observer.observe(alvo, { childList: true, subtree: true });
  }

  function iniciarVagas() {
    ajustarCardVaga();
    const alvo = document.querySelector(".vagas-grid") || document.body;
    const observer = new MutationObserver(() => agendar(ajustarCardVaga));
    observer.observe(alvo, { childList: true, subtree: true, characterData: true });
  }

  if (pagina === "curriculos.html") iniciarCurriculos();
  if (pagina === "vagas.html") iniciarVagas();
})();
