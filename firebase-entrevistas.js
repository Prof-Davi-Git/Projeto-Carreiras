(() => {
  const api = window.FirebaseCarreiras;
  if (!api) return;

  function formatarData(valor) {
    if (!valor) return "Ainda não definida";
    const partes = String(valor).split("-");
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return String(valor);
  }

  function nota(valor) {
    return Number.isFinite(Number(valor)) ? Number(valor).toFixed(1).replace(".0", "") : "—";
  }

  async function iniciar() {
    const sessao = await api.exigirSessao("aluno");
    if (!sessao) return;
    api.decorarTopo(sessao);

    const snap = await api.db.collection("submissoes")
      .where("alunoUid", "==", sessao.usuario.uid)
      .get();

    const envios = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    if (!envios.length) return;

    const bloco = document.createElement("section");
    bloco.className = "panel";
    bloco.style.marginBottom = "20px";
    bloco.innerHTML = `
      <div class="section-head compact">
        <div>
          <p class="small-label">MEUS PROCESSOS</p>
          <h2>Candidaturas e resultados</h2>
          <p>Acompanhe os currículos enviados e as avaliações liberadas pelo professor.</p>
        </div>
      </div>
      <div id="firebase-processos-aluno" class="saved-grid"></div>
    `;

    const alvo = document.querySelector(".two-columns") || document.querySelector("main");
    alvo.parentNode.insertBefore(bloco, alvo);
    const grid = bloco.querySelector("#firebase-processos-aluno");

    for (const envio of envios) {
      const avaliacaoSnap = await api.db.collection("avaliacoes").doc(envio.id).get();
      const avaliacao = avaliacaoSnap.exists ? avaliacaoSnap.data() : null;

      const card = document.createElement("article");
      card.className = "saved-card";

      const titulo = document.createElement("h3");
      titulo.textContent = envio.vagaTitulo || "Vaga";
      const empresa = document.createElement("p");
      empresa.textContent = envio.empresa || "";

      const meta = document.createElement("div");
      meta.className = "saved-meta";
      const status = document.createElement("span");
      status.className = "badge gray";
      status.textContent = avaliacao ? "AVALIAÇÃO DISPONÍVEL" : "CURRÍCULO ENVIADO";
      meta.appendChild(status);

      const info = document.createElement("div");
      info.style.marginTop = "12px";
      info.innerHTML = `
        <p><strong>Entrevista:</strong> ${formatarData(avaliacao?.entrevistaData)}</p>
        <p><strong>Nota do currículo:</strong> ${nota(avaliacao?.notaCurriculo)}</p>
        <p><strong>Nota da entrevista:</strong> ${nota(avaliacao?.notaEntrevista)}</p>
      `;

      card.append(meta, titulo, empresa, info);

      if (avaliacao?.feedback) {
        const feedback = document.createElement("div");
        feedback.style.marginTop = "12px";
        feedback.innerHTML = `<strong>Feedback do professor</strong><p>${avaliacao.feedback}</p>`;
        card.appendChild(feedback);
      }

      grid.appendChild(card);
    }
  }

  iniciar().catch((erro) => console.error("Falha ao carregar entrevistas:", erro));
})();
