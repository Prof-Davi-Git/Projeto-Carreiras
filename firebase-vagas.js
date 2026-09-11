(() => {
  const api = window.FirebaseCarreiras;
  if (!api) return;

  function textoMeta(card, prefixo) {
    const item = [...card.querySelectorAll(".meta-item")]
      .find((el) => el.textContent.trim().toLowerCase().startsWith(prefixo.toLowerCase()));
    return item ? item.textContent.split(":").slice(1).join(":").trim() : "";
  }

  async function iniciar() {
    const sessao = await api.exigirSessao("aluno");
    if (!sessao) return;
    api.decorarTopo(sessao);

    const submissoesSnap = await api.db.collection("submissoes")
      .where("alunoUid", "==", sessao.usuario.uid)
      .get();

    const vagasJaEnviadas = new Set(
      submissoesSnap.docs
        .map((doc) => doc.data()?.vagaId)
        .filter(Boolean)
    );

    let visiveis = 0;

    document.querySelectorAll(".vaga-card").forEach((card) => {
      const titulo = card.querySelector("h3")?.textContent.trim();
      const botao = card.querySelector('a[href^="curriculos.html"]');
      if (!titulo || !botao) return;

      const empresaTexto = card.querySelector("p")?.textContent.trim() || "";
      const empresa = empresaTexto.replace(/^Empresa fictícia:\s*/i, "");
      const area = textoMeta(card, "Área:");
      const vagaId = api.slug(titulo);

      if (vagasJaEnviadas.has(vagaId)) {
        card.remove();
        return;
      }

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
        <p>Acompanhe seus processos e resultados na área de Entrevistas.</p>
        <a class="btn btn-primary" href="entrevistas.html">Ver minhas entrevistas</a>
      `;
      grid.replaceWith(aviso);
    }
  }

  iniciar().catch((erro) => console.error("Falha ao preparar vagas:", erro));
})();
