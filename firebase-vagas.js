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

    document.querySelectorAll(".vaga-card").forEach((card) => {
      const titulo = card.querySelector("h3")?.textContent.trim();
      const botao = card.querySelector('a[href="curriculos.html"]');
      if (!titulo || !botao) return;

      const empresaTexto = card.querySelector("p")?.textContent.trim() || "";
      const empresa = empresaTexto.replace(/^Empresa fictícia:\s*/i, "");
      const area = textoMeta(card, "Área:");
      const vagaId = api.slug(titulo);

      const params = new URLSearchParams({ vaga: vagaId, titulo });
      if (empresa) params.set("empresa", empresa);
      if (area) params.set("area", area);

      botao.href = `curriculos.html?${params.toString()}`;
      botao.textContent = "Preparar currículo para esta vaga";
    });
  }

  iniciar().catch((erro) => console.error("Falha ao preparar vagas:", erro));
})();
