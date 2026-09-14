(() => {
  const lista = document.querySelector("#professor-lista");
  const busca = document.querySelector("#professor-busca");
  const status = document.querySelector("#professor-status");
  if (!lista) return;

  let agrupando = false;
  let timerAgrupamento = null;

  function textoFechado(card) {
    return card.dataset.status === "avaliado" ? "Exibir avaliação" : "Exibir para avaliar";
  }

  function prepararCard(card) {
    if (!(card instanceof HTMLElement)) return;
    if (!card.classList.contains("processo-card")) return;
    if (card.dataset.acordeaoProfessor === "true") return;

    const colunas = [...card.children];
    if (colunas.length < 2) return;

    const esquerda = colunas[0];
    const direita = colunas[1];
    const head = esquerda.querySelector(".processo-head");
    if (!head) return;

    const nomeAluno = head.querySelector(".small-label")?.textContent.trim() || "Aluno";
    const vagaTitulo = head.querySelector("h2")?.textContent.trim() || "Vaga";
    const empresa = [...head.querySelectorAll("p")]
      .find((p) => !p.classList.contains("small-label"))?.textContent.trim() || "";

    card.dataset.alunoNome = nomeAluno;
    card.dataset.vagaTitulo = vagaTitulo;
    card.dataset.empresa = empresa;
    card.dataset.acordeaoProfessor = "true";
    card.classList.add("processo-card-compacto");

    const topo = document.createElement("div");
    topo.className = "processo-card-resumo";

    const acoes = document.createElement("div");
    acoes.className = "processo-card-acoes";

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "btn btn-primary processo-card-toggle";
    botao.textContent = textoFechado(card);
    botao.setAttribute("aria-expanded", "false");

    acoes.appendChild(botao);
    topo.append(head, acoes);

    const detalhes = document.createElement("div");
    detalhes.className = "processo-card-detalhes";
    detalhes.hidden = true;
    detalhes.append(esquerda, direita);

    card.replaceChildren(topo, detalhes);

    botao.addEventListener("click", () => {
      const abrir = detalhes.hidden;
      detalhes.hidden = !abrir;
      botao.setAttribute("aria-expanded", String(abrir));
      botao.textContent = abrir ? "Ocultar avaliação" : textoFechado(card);
      card.classList.toggle("processo-card-aberto", abrir);
    });
  }

  function ajustarCabecalhoAluno(card) {
    if (card.dataset.cabecalhoAlunoAjustado === "true") return;
    const head = card.querySelector(".processo-head");
    if (!head) return;

    const rotulo = head.querySelector(".small-label");
    const titulo = head.querySelector("h2");
    const empresa = [...head.querySelectorAll("p")]
      .find((p) => !p.classList.contains("small-label"));

    if (rotulo) rotulo.textContent = "ALUNO";
    if (titulo) titulo.textContent = card.dataset.alunoNome || "Aluno";
    if (empresa) empresa.remove();

    card.dataset.cabecalhoAlunoAjustado = "true";
  }

  function marcarAvaliado(card) {
    if (!card) return;
    card.dataset.status = "avaliado";
    const badge = card.querySelector(".processo-head .badge");
    if (badge) {
      badge.textContent = "AVALIADO";
      badge.classList.remove("gray");
    }

    const toggle = card.querySelector(".processo-card-toggle");
    const detalhes = card.querySelector(".processo-card-detalhes");
    if (toggle && detalhes?.hidden) toggle.textContent = "Exibir avaliação";

    const grupo = card.closest(".vaga-grupo-professor");
    if (grupo) atualizarContadoresGrupo(grupo);
  }

  function atualizarContadoresGrupo(grupo) {
    const cards = [...grupo.querySelectorAll(".processo-card")];
    const avaliados = cards.filter((card) => card.dataset.status === "avaliado").length;
    const pendentes = cards.length - avaliados;

    grupo.dataset.busca = [
      grupo.dataset.vagaTitulo || "",
      grupo.dataset.empresa || "",
      ...cards.map((card) => card.dataset.busca || "")
    ].join(" ").toLowerCase();

    grupo.dataset.status = avaliados === cards.length
      ? "avaliado"
      : (pendentes === cards.length ? "pendente" : "misto");

    const totalEl = grupo.querySelector('[data-contador="enviados"]');
    const avaliadosEl = grupo.querySelector('[data-contador="avaliados"]');
    const pendentesEl = grupo.querySelector('[data-contador="pendentes"]');
    const botaoGrupo = grupo.querySelector(".vaga-grupo-toggle");
    const alunos = grupo.querySelector(".vaga-grupo-alunos");

    if (totalEl) totalEl.textContent = `${cards.length} enviado${cards.length === 1 ? "" : "s"}`;
    if (avaliadosEl) avaliadosEl.textContent = `${avaliados} avaliado${avaliados === 1 ? "" : "s"}`;
    if (pendentesEl) pendentesEl.textContent = `${pendentes} aguardando`;
    if (botaoGrupo && alunos?.hidden) botaoGrupo.textContent = `Exibir alunos (${cards.length})`;
  }

  function criarGrupo(vagaTitulo, cards) {
    const grupo = document.createElement("section");
    grupo.className = "vaga-grupo-professor";
    grupo.dataset.vagaTitulo = vagaTitulo;
    grupo.dataset.empresa = cards[0]?.dataset.empresa || "";

    const header = document.createElement("div");
    header.className = "vaga-grupo-header";

    const textos = document.createElement("div");
    textos.className = "vaga-grupo-textos";

    const rotulo = document.createElement("p");
    rotulo.className = "small-label";
    rotulo.textContent = "VAGA";

    const titulo = document.createElement("h2");
    titulo.textContent = vagaTitulo;

    textos.append(rotulo, titulo);

    if (grupo.dataset.empresa) {
      const empresa = document.createElement("p");
      empresa.className = "vaga-grupo-empresa";
      empresa.textContent = grupo.dataset.empresa;
      textos.appendChild(empresa);
    }

    const acoesGrupo = document.createElement("div");
    acoesGrupo.className = "vaga-grupo-acoes";

    const contadores = document.createElement("div");
    contadores.className = "vaga-grupo-contadores";

    const enviado = document.createElement("span");
    enviado.className = "vaga-contador";
    enviado.dataset.contador = "enviados";

    const avaliado = document.createElement("span");
    avaliado.className = "vaga-contador vaga-contador-ok";
    avaliado.dataset.contador = "avaliados";

    const pendente = document.createElement("span");
    pendente.className = "vaga-contador vaga-contador-pendente";
    pendente.dataset.contador = "pendentes";

    contadores.append(enviado, avaliado, pendente);

    const botaoGrupo = document.createElement("button");
    botaoGrupo.type = "button";
    botaoGrupo.className = "btn btn-secondary vaga-grupo-toggle";
    botaoGrupo.textContent = `Exibir alunos (${cards.length})`;
    botaoGrupo.setAttribute("aria-expanded", "false");

    acoesGrupo.append(contadores, botaoGrupo);
    header.append(textos, acoesGrupo);

    const alunos = document.createElement("div");
    alunos.className = "vaga-grupo-alunos";
    alunos.hidden = true;
    cards.forEach((card) => alunos.appendChild(card));

    botaoGrupo.addEventListener("click", () => {
      const abrir = alunos.hidden;
      alunos.hidden = !abrir;
      botaoGrupo.setAttribute("aria-expanded", String(abrir));
      botaoGrupo.textContent = abrir ? "Ocultar alunos" : `Exibir alunos (${cards.length})`;
      grupo.classList.toggle("vaga-grupo-aberto", abrir);
    });

    grupo.append(header, alunos);
    atualizarContadoresGrupo(grupo);
    return grupo;
  }

  function prepararTodos() {
    lista.querySelectorAll(".processo-card").forEach((card) => {
      prepararCard(card);
      if (card.dataset.acordeaoProfessor === "true") ajustarCabecalhoAluno(card);
    });
  }

  function aplicarFiltroAgrupado() {
    const termo = (busca?.value || "").trim().toLowerCase();
    const filtroStatus = status?.value || "todos";

    lista.querySelectorAll(".vaga-grupo-professor").forEach((grupo) => {
      let visiveis = 0;

      grupo.querySelectorAll(".processo-card").forEach((card) => {
        const bateBusca = !termo || (card.dataset.busca || "").includes(termo);
        const bateStatus = filtroStatus === "todos" || card.dataset.status === filtroStatus;
        const mostrar = bateBusca && bateStatus;
        card.classList.toggle("hidden", !mostrar);
        if (mostrar) visiveis += 1;
      });

      grupo.classList.toggle("hidden", visiveis === 0);
    });
  }

  function agruparPorVaga() {
    if (agrupando) return;
    agrupando = true;

    try {
      prepararTodos();

      const cardsDiretos = [...lista.children]
        .filter((item) => item.classList?.contains("processo-card"));

      if (!cardsDiretos.length) {
        lista.querySelectorAll(".vaga-grupo-professor").forEach(atualizarContadoresGrupo);
        aplicarFiltroAgrupado();
        return;
      }

      const grupos = new Map();
      cardsDiretos.forEach((card) => {
        ajustarCabecalhoAluno(card);
        const vaga = card.dataset.vagaTitulo || "Vaga";
        if (!grupos.has(vaga)) grupos.set(vaga, []);
        grupos.get(vaga).push(card);
      });

      const secoes = [...grupos.entries()]
        .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
        .map(([vaga, cardsDaVaga]) => criarGrupo(vaga, cardsDaVaga));

      lista.replaceChildren(...secoes);
      aplicarFiltroAgrupado();
    } finally {
      agrupando = false;
    }
  }

  function agendarAgrupamento() {
    clearTimeout(timerAgrupamento);
    timerAgrupamento = setTimeout(agruparPorVaga, 30);
  }

  const observer = new MutationObserver((mutations) => {
    if (agrupando) return;
    const entrouCard = mutations.some((mutation) =>
      [...mutation.addedNodes].some((node) => node instanceof Element && node.classList.contains("processo-card"))
    );
    if (entrouCard) agendarAgrupamento();
  });

  observer.observe(lista, { childList: true });

  lista.addEventListener("submit", (event) => {
    const form = event.target.closest?.(".avaliacao-form");
    if (!form) return;
    const card = form.closest(".processo-card");
    const botaoSalvar = form.querySelector('button[type="submit"]');
    if (!card || !botaoSalvar) return;

    const statusObserver = new MutationObserver(() => {
      if (/avaliação salva/i.test(botaoSalvar.textContent || "")) {
        marcarAvaliado(card);
        statusObserver.disconnect();
        setTimeout(aplicarFiltroAgrupado, 0);
      }
    });

    statusObserver.observe(botaoSalvar, { childList: true, subtree: true, characterData: true });
    setTimeout(() => statusObserver.disconnect(), 10000);
  }, true);

  busca?.addEventListener("input", () => setTimeout(aplicarFiltroAgrupado, 0));
  status?.addEventListener("change", () => setTimeout(aplicarFiltroAgrupado, 0));

  prepararTodos();
  agendarAgrupamento();
})();