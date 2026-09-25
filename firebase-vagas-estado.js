(() => {
  const api = window.FirebaseCarreiras;
  const grid = document.querySelector("#vagas-grid");
  if (!api || !grid) return;

  let aplicando = false;
  let estados = new Map();

  function aplicarEstados() {
    if (aplicando) return;
    aplicando = true;

    try {
      const cards = [...grid.querySelectorAll(".vaga-card")];
      cards.forEach((card) => {
        const id = card.dataset.vagaId || "";
        const vaga = estados.get(id);
        if (!vaga) return;

        if (vaga.ativo === false) {
          card.remove();
          return;
        }

        const atual = vaga.statusProcesso === "atual";
        card.classList.toggle("vaga-em-andamento", atual);
        card.dataset.statusProcesso = vaga.statusProcesso || "cadastrada";

        const sinalExistente = card.querySelector(".vaga-andamento-sinal");
        if (atual && !sinalExistente) {
          const sinal = document.createElement("span");
          sinal.className = "vaga-andamento-sinal";
          sinal.textContent = "Entrevistas em andamento nesta vaga";
          const badge = card.querySelector(".badge");
          badge?.insertAdjacentElement("afterend", sinal);
        } else if (!atual && sinalExistente) {
          sinalExistente.remove();
        }

        const badge = card.querySelector(".badge");
        if (badge && !card.querySelector('[aria-disabled="true"]')) {
          if (atual) {
            badge.textContent = "VAGA ABERTA";
            badge.classList.remove("gray");
          } else if (id === "auxiliar-administrativo" && vaga.statusProcesso === "proxima") {
            badge.textContent = "PRÓXIMA VAGA";
            badge.classList.add("gray");
          }
        }
      });

      const atual = [...grid.querySelectorAll(".vaga-card")]
        .find((card) => estados.get(card.dataset.vagaId || "")?.statusProcesso === "atual");
      if (atual && grid.firstElementChild !== atual) grid.prepend(atual);
    } finally {
      aplicando = false;
    }
  }

  async function iniciar() {
    const sessao = await api.exigirSessao("aluno");
    if (!sessao) return;
    const turmaId = sessao.perfil.turmaId || window.CARREIRAS_TURMA_PADRAO?.turmaId || "";
    if (!turmaId) return;

    try {
      const snap = await api.db.collection("vagas").where("turmaId", "==", turmaId).get();
      estados = new Map(snap.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() }]));
      aplicarEstados();

      const observer = new MutationObserver(() => setTimeout(aplicarEstados, 0));
      observer.observe(grid, { childList: true, subtree: true });
      setTimeout(aplicarEstados, 250);
      setTimeout(aplicarEstados, 900);
    } catch (erro) {
      console.warn("Não foi possível sincronizar o estado das vagas.", erro);
    }
  }

  iniciar().catch((erro) => console.warn("Falha ao ajustar vagas da turma.", erro));
})();
