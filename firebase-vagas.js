(() => {
  const api = window.FirebaseCarreiras;
  if (!api) return;

  const AGENDA_VAGAS = {
    "assistente-de-suporte-de-ti": ["2026-09-04", "2026-09-11"]
  };

  function textoMeta(card, prefixo) {
    const item = [...card.querySelectorAll(".meta-item")]
      .find((el) => el.textContent.trim().toLowerCase().startsWith(prefixo.toLowerCase()));
    return item ? item.textContent.split(":").slice(1).join(":").trim() : "";
  }

  function hojeLocalISO() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  function formatarData(dataISO) {
    const [ano, mes, dia] = String(dataISO).split("-");
    return ano && mes && dia ? `${dia}/${mes}/${ano}` : dataISO;
  }

  function datasDaVaga(card, vagaId) {
    const doHtml = String(card.dataset.entrevistaDatas || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    return doHtml.length ? doHtml : (AGENDA_VAGAS[vagaId] || []);
  }

  function agendaEncerrada(datas) {
    if (!datas.length) return false;
    const validas = [...datas].filter((data) => /^\d{4}-\d{2}-\d{2}$/.test(data)).sort();
    if (!validas.length) return false;
    return hojeLocalISO() > validas[validas.length - 1];
  }

  function itemEntrevista(card) {
    return [...card.querySelectorAll(".meta-item")]
      .find((el) => el.textContent.trim().toLowerCase().startsWith("entrevista"));
  }

  function exibirAgenda(card, datas) {
    const item = itemEntrevista(card);
    if (!item) return;

    if (!datas.length) {
      item.textContent = "Entrevista: a definir";
      return;
    }

    const rotulo = datas.length > 1 ? "Entrevistas" : "Entrevista";
    item.textContent = `${rotulo}: ${datas.map(formatarData).join(" e ")}`;
  }

  function definirBadge(card, texto, destaque = false) {
    const badge = card.querySelector(".badge");
    if (!badge) return;
    badge.textContent = texto;
    badge.classList.toggle("gray", !destaque);
  }

  function botaoSecundario(botao) {
    botao.classList.remove("btn-primary");
    botao.classList.add("btn-secondary");
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

    const submissoesPorVaga = new Map();
    submissoesSnap.docs.forEach((doc) => {
      const dados = { id: doc.id, ...doc.data() };
      if (dados.vagaId) submissoesPorVaga.set(dados.vagaId, dados);
    });

    const avaliacoesPorVaga = new Map();
    avaliacoesSnap.docs.forEach((doc) => {
      const dados = { id: doc.id, ...doc.data() };
      if (dados.vagaId) avaliacoesPorVaga.set(dados.vagaId, dados);
    });

    let visiveis = 0;

    document.querySelectorAll(".vaga-card").forEach((card) => {
      const titulo = card.querySelector("h3")?.textContent.trim();
      const botao = card.querySelector('a[href^="curriculos.html"], a.btn');
      if (!titulo || !botao) return;

      const empresaTexto = card.querySelector("p")?.textContent.trim() || "";
      const empresa = empresaTexto.replace(/^Empresa fictícia:\s*/i, "");
      const area = textoMeta(card, "Área:");
      const vagaId = card.dataset.vagaId || api.slug(titulo);
      const datas = datasDaVaga(card, vagaId);

      if (agendaEncerrada(datas)) {
        card.remove();
        return;
      }

      exibirAgenda(card, datas);
      visiveis += 1;

      const avaliacao = avaliacoesPorVaga.get(vagaId);
      const submissao = submissoesPorVaga.get(vagaId);

      if (avaliacao) {
        definirBadge(card, "CONCLUÍDA", true);
        botao.href = "entrevistas.html";
        botao.textContent = "Ver resultado da entrevista";
        botaoSecundario(botao);
        botao.removeAttribute("aria-disabled");
        botao.style.pointerEvents = "";
        return;
      }

      if (submissao) {
        definirBadge(card, "EM PROCESSO");
        botao.removeAttribute("href");
        botao.textContent = "Currículo já enviado";
        botaoSecundario(botao);
        botao.setAttribute("aria-disabled", "true");
        botao.style.pointerEvents = "none";
        return;
      }

      definirBadge(card, "VAGA ABERTA");

      const params = new URLSearchParams({ vaga: vagaId, titulo });
      if (empresa) params.set("empresa", empresa);
      if (area) params.set("area", area);

      botao.href = `curriculos.html?${params.toString()}`;
      botao.textContent = "Preparar currículo para esta vaga";
      botao.classList.remove("btn-secondary");
      botao.classList.add("btn-primary");
      botao.removeAttribute("aria-disabled");
      botao.style.pointerEvents = "";
    });

    if (visiveis === 0) {
      const grid = document.querySelector(".vagas-grid");
      if (!grid) return;
      const aviso = document.createElement("section");
      aviso.className = "panel empty-state";
      aviso.innerHTML = `
        <span class="badge gray">SEM VAGAS DISPONÍVEIS</span>
        <h2>Não há vagas disponíveis neste momento.</h2>
        <p>Os processos concluídos continuam disponíveis na área de Entrevistas.</p>
        <a class="btn btn-primary" href="entrevistas.html">Ver minhas entrevistas</a>
      `;
      grid.replaceWith(aviso);
    }
  }

  iniciar().catch((erro) => console.error("Falha ao preparar vagas:", erro));
})();
