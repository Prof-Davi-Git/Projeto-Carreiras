(() => {
  const painel = document.querySelector("#painel-professor-avaliacoes");
  const lista = document.querySelector("#professor-lista");
  const resumo = document.querySelector("#professor-resumo");
  const vazio = document.querySelector("#professor-vazio");
  if (!painel || !lista) return;

  painel.style.visibility = "hidden";

  function normalizar(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function chave(titulo, empresa = "") {
    return `${normalizar(titulo)}::${normalizar(empresa)}`;
  }

  function dadosDoCard(card) {
    const titulo = card.dataset.vagaTitulo
      || card.querySelector(".processo-head h2")?.textContent
      || "";
    const empresa = card.dataset.empresa
      || [...card.querySelectorAll(".processo-head p")]
        .find((p) => !p.classList.contains("small-label"))?.textContent
      || "";
    return { titulo, empresa };
  }

  function dadosDoGrupo(grupo) {
    return {
      titulo: grupo.dataset.vagaTitulo || grupo.querySelector(".vaga-grupo-textos h2")?.textContent || "",
      empresa: grupo.dataset.empresa || grupo.querySelector(".vaga-grupo-empresa")?.textContent || ""
    };
  }

  function pertenceAoProfessor(titulo, empresa, permitidas, titulosPermitidos) {
    const tituloNormal = normalizar(titulo);
    if (!tituloNormal) return false;
    if (permitidas.has(chave(titulo, empresa))) return true;
    return !normalizar(empresa) && titulosPermitidos.has(tituloNormal);
  }

  function atualizarResumo() {
    const cards = [...lista.querySelectorAll(".processo-card")];
    const avaliados = cards.filter((card) => card.dataset.status === "avaliado").length;
    if (resumo) {
      resumo.textContent = `${cards.length} processo${cards.length === 1 ? "" : "s"} • ${avaliados} avaliado${avaliados === 1 ? "" : "s"}`;
    }

    const semProcessos = cards.length === 0;
    if (vazio) {
      vazio.hidden = !semProcessos;
      vazio.classList.toggle("hidden", !semProcessos);
      vazio.setAttribute("aria-hidden", String(!semProcessos));
      if (semProcessos) {
        const h2 = vazio.querySelector("h2");
        const p = vazio.querySelector("p");
        if (h2) h2.textContent = "Nenhum processo no seu perfil ainda.";
        if (p) p.textContent = "Quando alunos enviarem currículos para vagas cadastradas por você, eles aparecerão aqui.";
      }
    }
  }

  async function esperarApi() {
    for (let i = 0; i < 100; i += 1) {
      if (window.FirebaseCarreiras) return window.FirebaseCarreiras;
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    return null;
  }

  async function iniciar() {
    const api = await esperarApi();
    if (!api) {
      painel.style.visibility = "";
      return;
    }

    const sessao = await api.exigirSessao("professor");
    if (!sessao) return;

    let vagas = [];
    try {
      const snap = await api.db.collection("vagas")
        .where("professorUid", "==", sessao.usuario.uid)
        .get();
      vagas = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((vaga) => vaga.ativo !== false);
    } catch (erro) {
      console.error("Não foi possível determinar as vagas do professor:", erro);
    }

    const permitidas = new Set(vagas.map((vaga) => chave(vaga.titulo, vaga.empresa)));
    const titulosPermitidos = new Set(vagas.map((vaga) => normalizar(vaga.titulo)));

    let filtrando = false;
    let timer = null;

    const filtrar = () => {
      if (filtrando) return;
      filtrando = true;
      try {
        lista.querySelectorAll(".vaga-grupo-professor").forEach((grupo) => {
          const { titulo, empresa } = dadosDoGrupo(grupo);
          if (!pertenceAoProfessor(titulo, empresa, permitidas, titulosPermitidos)) grupo.remove();
        });

        lista.querySelectorAll(".processo-card").forEach((card) => {
          const { titulo, empresa } = dadosDoCard(card);
          if (!pertenceAoProfessor(titulo, empresa, permitidas, titulosPermitidos)) card.remove();
        });
        atualizarResumo();
      } finally {
        filtrando = false;
      }
    };

    const agendar = () => {
      clearTimeout(timer);
      timer = setTimeout(filtrar, 25);
    };

    const observer = new MutationObserver(agendar);
    observer.observe(lista, { childList: true, subtree: true });

    filtrar();
    setTimeout(filtrar, 100);
    setTimeout(filtrar, 500);
    setTimeout(filtrar, 1200);
    painel.style.visibility = "";
  }

  iniciar().catch((erro) => {
    console.error("Falha ao isolar os processos do professor:", erro);
    painel.style.visibility = "";
  });
})();
