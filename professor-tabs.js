(() => {
  const botoes = [...document.querySelectorAll("[data-professor-tab]")];
  const painelVagas = document.querySelector("#painel-professor-vagas");
  const painelAvaliacoes = document.querySelector("#painel-professor-avaliacoes");
  const listaAvaliacoes = document.querySelector("#professor-lista");
  const resumo = document.querySelector("#professor-resumo");

  function abrirAba(nome) {
    const vagas = nome === "vagas";
    if (painelVagas) painelVagas.hidden = !vagas;
    if (painelAvaliacoes) painelAvaliacoes.hidden = vagas;

    botoes.forEach((botao) => {
      const ativo = botao.dataset.professorTab === nome;
      botao.classList.toggle("ativa", ativo);
      botao.setAttribute("aria-selected", String(ativo));
    });

    history.replaceState(null, "", `#${nome}`);
  }

  botoes.forEach((botao) => {
    botao.addEventListener("click", () => abrirAba(botao.dataset.professorTab || "vagas"));
  });

  const inicial = location.hash === "#avaliacoes" ? "avaliacoes" : "vagas";
  abrirAba(inicial);

  function tituloRemovido(texto) {
    const normalizado = String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return normalizado.includes("desenvolvedor(a) front-end junior")
      || normalizado.includes("desenvolvedor front-end junior");
  }

  function atualizarResumoVisivel() {
    if (!resumo || !listaAvaliacoes) return;
    const cards = [...listaAvaliacoes.querySelectorAll(".processo-card")];
    if (!cards.length) return;
    const avaliados = cards.filter((card) => card.dataset.status === "avaliado").length;
    resumo.textContent = `${cards.length} processo${cards.length === 1 ? "" : "s"} • ${avaliados} avaliado${avaliados === 1 ? "" : "s"}`;
  }

  function removerVagaAntiga() {
    if (!listaAvaliacoes) return;
    let alterou = false;

    listaAvaliacoes.querySelectorAll(".vaga-grupo-professor").forEach((grupo) => {
      const titulo = grupo.dataset.vagaTitulo || grupo.querySelector(".vaga-grupo-textos h2")?.textContent || "";
      if (tituloRemovido(titulo)) {
        grupo.remove();
        alterou = true;
      }
    });

    listaAvaliacoes.querySelectorAll(".processo-card").forEach((card) => {
      const titulo = card.dataset.vagaTitulo || card.querySelector(".processo-head h2")?.textContent || "";
      if (tituloRemovido(titulo)) {
        card.remove();
        alterou = true;
      }
    });

    if (alterou) setTimeout(atualizarResumoVisivel, 0);
  }

  if (listaAvaliacoes) {
    const observer = new MutationObserver(() => setTimeout(removerVagaAntiga, 0));
    observer.observe(listaAvaliacoes, { childList: true, subtree: true });
    setTimeout(removerVagaAntiga, 0);
  }
})();
