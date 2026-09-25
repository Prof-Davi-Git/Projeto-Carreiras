(() => {
  const api = window.FirebaseCarreiras;
  const grid = document.querySelector("#vagas-grid");
  if (!api || !grid) return;

  const vagasBase = Array.isArray(window.CARREIRAS_VAGAS_BASE)
    ? window.CARREIRAS_VAGAS_BASE
    : [];
  const basePorId = new Map(vagasBase.map((vaga) => [vaga.id, vaga]));
  let vagasPorId = new Map(basePorId);
  let aplicando = false;

  function nomeProfessor(vaga) {
    return String(vaga?.professorNome || basePorId.get(vaga?.id)?.professorNome || "Professor responsável")
      .trim();
  }

  function aplicar() {
    if (aplicando) return;
    aplicando = true;

    try {
      const cards = [...grid.querySelectorAll(".vaga-card")];
      cards.forEach((card) => {
        const id = card.dataset.vagaId || "";
        const vaga = vagasPorId.get(id) || basePorId.get(id) || { id };
        const professor = nomeProfessor(vaga);

        card.dataset.professorNome = professor;
        if (vaga.professorUid) card.dataset.professorUid = vaga.professorUid;

        let box = card.querySelector(".vaga-professor-responsavel");
        if (!box) {
          box = document.createElement("div");
          box.className = "vaga-professor-responsavel";
          const rotulo = document.createElement("span");
          rotulo.textContent = "PROFESSOR RESPONSÁVEL";
          const nome = document.createElement("strong");
          box.append(rotulo, nome);

          const empresa = [...card.children].find((item) => item.tagName === "P" && !item.classList.contains("vaga-turma-destino"));
          if (empresa) empresa.insertAdjacentElement("beforebegin", box);
          else card.querySelector("h3")?.insertAdjacentElement("afterend", box);
        }

        const nome = box.querySelector("strong");
        if (nome && nome.textContent !== professor) nome.textContent = professor;

        const atual = vaga.statusProcesso === "atual";
        box.classList.toggle("vaga-professor-atual", atual);
        box.title = atual
          ? `Esta é a vaga atual publicada por ${professor}.`
          : `Vaga publicada por ${professor}.`;
      });

      const identificacao = document.querySelector("#vagas-turma-identificacao");
      if (identificacao && !identificacao.dataset.professoresInfo) {
        identificacao.dataset.professoresInfo = "true";
        identificacao.textContent = `${identificacao.textContent} Cada oportunidade mostra qual professor é responsável pela vaga.`;
      }
    } finally {
      aplicando = false;
    }
  }

  async function iniciar() {
    const sessao = await api.exigirSessao("aluno");
    if (!sessao) return;

    const turmaId = sessao.perfil.turmaId || window.CARREIRAS_TURMA_PADRAO?.turmaId || "";
    if (turmaId) {
      try {
        const snap = await api.db.collection("vagas").where("turmaId", "==", turmaId).get();
        const remotas = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));
        vagasPorId = new Map(basePorId);
        remotas.forEach((vaga) => vagasPorId.set(vaga.id, vaga));
      } catch (erro) {
        console.warn("Não foi possível carregar os responsáveis das vagas.", erro);
      }
    }

    aplicar();
    const observer = new MutationObserver(() => setTimeout(aplicar, 0));
    observer.observe(grid, { childList: true, subtree: true });
    setTimeout(aplicar, 250);
    setTimeout(aplicar, 800);
  }

  iniciar().catch((erro) => console.warn("Falha ao identificar professores das vagas.", erro));
})();
