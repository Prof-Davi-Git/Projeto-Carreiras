(() => {
  const api = window.FirebaseCarreiras;
  if (!api) return;

  const VAGA_EM_ANDAMENTO = "assistente-de-suporte-de-ti";
  const AGENDA_VAGAS = {
    "assistente-de-suporte-de-ti": ["2026-09-04", "2026-09-11", "2026-09-14", "2026-09-17"]
  };

  function garantirEstiloVagas() {
    const href = new URL("vagas-ajustes.css?v=20260914-2", document.currentScript?.src || location.href).href;
    if ([...document.styleSheets].some((sheet) => sheet.href === href)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

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

  function juntarDatas(datas) {
    const formatadas = datas.map(formatarData);
    if (formatadas.length <= 1) return formatadas.join("");
    if (formatadas.length === 2) return `${formatadas[0]} e ${formatadas[1]}`;
    return `${formatadas.slice(0, -1).join(", ")} e ${formatadas.at(-1)}`;
  }

  function datasDaVaga(card, vagaId) {
    const configuradas = AGENDA_VAGAS[vagaId] || [];
    if (configuradas.length) return configuradas;

    return String(card.dataset.entrevistaDatas || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
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

  function exibirAgenda(card, datas, vagaId) {
    const item = itemEntrevista(card);
    if (!item) return;

    if (!datas.length) {
      item.textContent = "Entrevista: a definir";
      return;
    }

    const hoje = hojeLocalISO();
    const validas = datas.filter((data) => /^\d{4}-\d{2}-\d{2}$/.test(data)).sort();
    const realizadas = validas.filter((data) => data <= hoje);
    const futuras = validas.filter((data) => data > hoje);

    if (realizadas.length && futuras.length) {
      const rotuloFuturas = futuras.length === 1 ? "Próxima entrevista" : "Próximas entrevistas";
      item.textContent = `Realizadas: ${juntarDatas(realizadas)} • ${rotuloFuturas}: ${juntarDatas(futuras)}`;
    } else if (realizadas.length) {
      item.textContent = `Entrevistas realizadas: ${juntarDatas(realizadas)} • próximas datas: a definir`;
    } else {
      item.textContent = `Entrevistas: ${juntarDatas(futuras)}`;
    }

    if (vagaId === VAGA_EM_ANDAMENTO) {
      item.dataset.entrevistaStatus = "ativo";
    }
  }

  function destacarVagaEmAndamento(card, vagaId) {
    if (vagaId !== VAGA_EM_ANDAMENTO) return;
    card.classList.add("vaga-em-andamento");
    if (card.querySelector(".vaga-andamento-sinal")) return;

    const sinal = document.createElement("span");
    sinal.className = "vaga-andamento-sinal";
    sinal.textContent = "Entrevistas em andamento nesta vaga";
    const badge = card.querySelector(".badge");
    badge?.insertAdjacentElement("afterend", sinal);
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
    for (let inicio = 0; inicio < ids.length; inicio += 20) {
      const batch = api.db.batch();
      ids.slice(inicio, inicio + 20).forEach((id) => batch.delete(col.doc(id)));
      await batch.commit();
    }
  }

  async function excluirSubmissao(uid, submissao) {
    await excluirChunksPdf(uid, submissao);
    await api.db.collection("submissoes").doc(submissao.id).delete();
  }

  async function iniciar() {
    garantirEstiloVagas();

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

      destacarVagaEmAndamento(card, vagaId);
      exibirAgenda(card, datas, vagaId);

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