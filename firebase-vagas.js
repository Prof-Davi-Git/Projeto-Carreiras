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

  function inscricoesEncerradas(card) {
    const limite = String(card.dataset.inscricoesAte || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(limite)) return false;
    return hojeLocalISO() > limite;
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

    const validas = datas.filter((data) => /^\d{4}-\d{2}-\d{2}$/.test(data)).sort();
    const ultima = validas[validas.length - 1] || "";
    const textoDatas = datas.map(formatarData).join(" e ");

    if (ultima && hojeLocalISO() > ultima) {
      item.textContent = `Entrevistas realizadas: ${textoDatas} • próximas datas: a definir`;
      return;
    }

    const rotulo = datas.length > 1 ? "Entrevistas" : "Entrevista";
    item.textContent = `${rotulo}: ${textoDatas}`;
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

  function paramsDaVaga(vagaId, titulo, empresa, area, extras = {}) {
    const params = new URLSearchParams({ vaga: vagaId, titulo });
    if (empresa) params.set("empresa", empresa);
    if (area) params.set("area", area);
    Object.entries(extras).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== "") params.set(chave, String(valor));
    });
    return params;
  }

  function areaAcoes(card, botaoBase) {
    let area = card.querySelector(".vaga-acoes-firebase");
    if (area) return area;

    area = document.createElement("div");
    area.className = "vaga-acoes-firebase";
    area.style.display = "flex";
    area.style.gap = "8px";
    area.style.flexWrap = "wrap";
    area.style.marginTop = "12px";

    botaoBase.insertAdjacentElement("beforebegin", area);
    area.appendChild(botaoBase);
    return area;
  }

  function limparAcoesExtras(area, botaoBase) {
    [...area.children].forEach((item) => {
      if (item !== botaoBase) item.remove();
    });
  }

  function criarLink(texto, href, classe = "btn btn-secondary") {
    const link = document.createElement("a");
    link.className = classe;
    link.href = href;
    link.textContent = texto;
    return link;
  }

  async function excluirChunksPdf(uid, submissao) {
    const ids = Array.isArray(submissao?.pdfChunkIds) ? submissao.pdfChunkIds : [];
    if (!ids.length) return;

    const col = api.db.collection("usuarios").doc(uid).collection("curriculos");
    const batch = api.db.batch();
    ids.forEach((id) => batch.delete(col.doc(id)));
    await batch.commit();
  }

  async function excluirSubmissao(uid, submissao) {
    await excluirChunksPdf(uid, submissao);
    await api.db.collection("submissoes").doc(submissao.id).delete();
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

    document.querySelectorAll(".vaga-card").forEach((card) => {
      const titulo = card.querySelector("h3")?.textContent.trim();
      const botao = card.querySelector('a[href^="curriculos.html"], a.btn');
      if (!titulo || !botao) return;

      const empresaTexto = card.querySelector("p")?.textContent.trim() || "";
      const empresa = empresaTexto.replace(/^Empresa fictícia:\s*/i, "");
      const area = textoMeta(card, "Área:");
      const vagaId = card.dataset.vagaId || api.slug(titulo);
      const datas = datasDaVaga(card, vagaId);
      const params = paramsDaVaga(vagaId, titulo, empresa, area);
      const areaBotoes = areaAcoes(card, botao);
      limparAcoesExtras(areaBotoes, botao);

      exibirAgenda(card, datas);

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
        definirBadge(card, "CURRÍCULO ENCAMINHADO", true);
        botao.removeAttribute("href");
        botao.textContent = "Currículo encaminhado ✓";
        botaoSecundario(botao);
        botao.setAttribute("aria-disabled", "true");
        botao.style.pointerEvents = "none";

        const excluir = document.createElement("button");
        excluir.type = "button";
        excluir.className = "btn btn-secondary";
        excluir.textContent = "Excluir envio e mandar novamente";
        excluir.addEventListener("click", async () => {
          const confirmar = confirm("Excluir o currículo já encaminhado para esta vaga? Depois você poderá enviar outro currículo.");
          if (!confirmar) return;

          excluir.disabled = true;
          excluir.textContent = "Excluindo...";
          try {
            await excluirSubmissao(sessao.usuario.uid, submissao);
            location.reload();
          } catch (erro) {
            console.error("Falha ao excluir envio:", erro);
            excluir.disabled = false;
            excluir.textContent = "Tentar excluir novamente";
            alert("Não foi possível excluir o envio. Atualize a página e tente novamente.");
          }
        });
        areaBotoes.appendChild(excluir);
        return;
      }

      if (inscricoesEncerradas(card)) {
        definirBadge(card, "INSCRIÇÕES ENCERRADAS");
        botao.removeAttribute("href");
        botao.textContent = "Período de envio encerrado";
        botaoSecundario(botao);
        botao.setAttribute("aria-disabled", "true");
        botao.style.pointerEvents = "none";
        return;
      }

      definirBadge(card, "VAGA ABERTA");

      botao.href = `curriculos.html?${params.toString()}`;
      botao.textContent = "Preparar currículo no site";
      botao.classList.remove("btn-secondary");
      botao.classList.add("btn-primary");
      botao.removeAttribute("aria-disabled");
      botao.style.pointerEvents = "";

      const pdfParams = paramsDaVaga(vagaId, titulo, empresa, area, { modo: "pdf" });
      const pdf = criarLink("Enviar currículo externo (PDF)", `curriculos.html?${pdfParams.toString()}`);
      areaBotoes.appendChild(pdf);
    });
  }

  iniciar().catch((erro) => console.error("Falha ao preparar vagas:", erro));
})();
