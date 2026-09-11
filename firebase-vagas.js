(() => {
  const api = window.FirebaseCarreiras;
  if (!api) return;

  function textoMeta(card, prefixo) {
    const item = [...card.querySelectorAll(".meta-item")]
      .find((el) => el.textContent.trim().toLowerCase().startsWith(prefixo.toLowerCase()));
    return item ? item.textContent.split(":").slice(1).join(":").trim() : "";
  }

  function normalizarVagaAberta(card) {
    const badge = card.querySelector(".badge");
    if (badge) {
      badge.textContent = "VAGA ABERTA";
      badge.classList.add("gray");
    }

    const entrevista = [...card.querySelectorAll(".meta-item")]
      .find((el) => el.textContent.trim().toLowerCase().startsWith("entrevista:"));
    if (entrevista) entrevista.textContent = "Entrevista: a definir";
  }

  async function iniciar() {
    const sessao = await api.exigirSessao("aluno");
    if (!sessao) return;
    api.decorarTopo(sessao);

    const [submissoesSnap, avaliacoesSnap] = await Promise.all([
      api.db.collection("submissoes")
        .where("alunoUid", "==", sessao.usuario.uid)
        .get(),
      api.db.collection("avaliacoes")
        .where("alunoUid", "==", sessao.usuario.uid)
        .get()
    ]);

    const vagasJaUtilizadas = new Set();

    submissoesSnap.docs.forEach((doc) => {
      const vagaId = doc.data()?.vagaId;
      if (vagaId) vagasJaUtilizadas.add(vagaId);
    });

    avaliacoesSnap.docs.forEach((doc) => {
      const vagaId = doc.data()?.vagaId;
      if (vagaId) vagasJaUtilizadas.add(vagaId);
    });

    let visiveis = 0;

    document.querySelectorAll(".vaga-card").forEach((card) => {
      const titulo = card.querySelector("h3")?.textContent.trim();
      const botao = card.querySelector('a[href^="curriculos.html"]');
      if (!titulo || !botao) return;

      const empresaTexto = card.querySelector("p")?.textContent.trim() || "";
      const empresa = empresaTexto.replace(/^Empresa fictícia:\s*/i, "");
      const area = textoMeta(card, "Área:");
      const vagaId = api.slug(titulo);

      if (vagasJaUtilizadas.has(vagaId)) {
        card.remove();
        return;
      }

      normalizarVagaAberta(card);
      visiveis += 1;

      const params = new URLSearchParams({ vaga: vagaId, titulo });
      if (empresa) params.set("empresa", empresa);
      if (area) params.set("area", area);

      botao.href = `curriculos.html?${params.toString()}`;
      botao.textContent = "Preparar currículo para esta vaga";
    });

    if (visiveis === 0) {
      const grid = document.querySelector(".vagas-grid");
      if (!grid) return;
      const aviso = document.createElement("section");
      aviso.className = "panel empty-state";
      aviso.innerHTML = `
        <span class="badge gray">SEM NOVAS VAGAS</span>
        <h2>Você já se candidatou às vagas disponíveis.</h2>
        <p>Acompanhe seus resultados na área de Entrevistas.</p>
        <a class="btn btn-primary" href="entrevistas.html">Ver minhas entrevistas</a>
      `;
      grid.replaceWith(aviso);
    }
  }

  iniciar().catch((erro) => console.error("Falha ao preparar vagas:", erro));
})();
