(() => {
  const api = window.FirebaseCarreiras;
  if (!api) return;

  const vagasBase = Array.isArray(window.CARREIRAS_VAGAS_BASE) ? window.CARREIRAS_VAGAS_BASE : [];
  const turmaPadrao = window.CARREIRAS_TURMA_PADRAO || null;
  const grid = document.querySelector("#vagas-grid");
  const carregamento = document.querySelector("#vagas-status-carregamento");
  const identificacao = document.querySelector("#vagas-turma-identificacao");

  if (!grid) return;

  function hojeLocalISO() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  function formatarData(dataISO) {
    const [ano, mes, dia] = String(dataISO || "").split("-");
    return ano && mes && dia ? `${dia}/${mes}/${ano}` : dataISO;
  }

  function juntarDatas(datas) {
    const formatadas = datas.map(formatarData);
    if (formatadas.length <= 1) return formatadas.join("");
    if (formatadas.length === 2) return `${formatadas[0]} e ${formatadas[1]}`;
    return `${formatadas.slice(0, -1).join(", ")} e ${formatadas.at(-1)}`;
  }

  function textoEntrevistas(vaga) {
    const datas = Array.isArray(vaga.datasEntrevista) ? vaga.datasEntrevista : [];
    const validas = datas.filter((data) => /^\d{4}-\d{2}-\d{2}$/.test(data)).sort();
    if (!validas.length) return "Entrevista: a definir";

    const hoje = hojeLocalISO();
    const realizadas = validas.filter((data) => data <= hoje);
    const futuras = validas.filter((data) => data > hoje);

    if (realizadas.length && futuras.length) {
      return `Realizadas: ${juntarDatas(realizadas)} • ${futuras.length === 1 ? "Próxima entrevista" : "Próximas entrevistas"}: ${juntarDatas(futuras)}`;
    }
    if (realizadas.length) {
      return `Entrevistas realizadas: ${juntarDatas(realizadas)} • próximas datas: a definir`;
    }
    return `Entrevistas: ${juntarDatas(futuras)}`;
  }

  function dataOrdem(vaga) {
    if (vaga?.criadoEm?.toMillis) return vaga.criadoEm.toMillis();
    const valor = Date.parse(vaga?.criadoEmIso || "");
    return Number.isFinite(valor) ? valor : 0;
  }

  function paramsDaVaga(vaga, extras = {}) {
    const params = new URLSearchParams({
      vaga: vaga.id,
      titulo: vaga.titulo || "Vaga"
    });
    if (vaga.empresa) params.set("empresa", vaga.empresa);
    if (vaga.area) params.set("area", vaga.area);
    Object.entries(extras).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== "") params.set(chave, String(valor));
    });
    return params;
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

  function criarLink(texto, href, classe = "btn btn-secondary") {
    const link = document.createElement("a");
    link.className = classe;
    link.href = href;
    link.textContent = texto;
    return link;
  }

  function criarCard(vaga, maisRecenteId) {
    const card = document.createElement("article");
    card.className = "vaga-card";
    card.dataset.vagaId = vaga.id;
    card.dataset.statusProcesso = vaga.statusProcesso || "proxima";

    const badge = document.createElement("span");
    badge.className = "badge gray";
    if (vaga.statusProcesso === "atual") {
      badge.textContent = "VAGA ABERTA";
    } else if (vaga.baseSistema) {
      badge.textContent = "PRÓXIMA VAGA";
    } else if (vaga.id === maisRecenteId) {
      badge.textContent = "NOVA VAGA";
      badge.classList.remove("gray");
      card.classList.add("vaga-mais-recente");
    } else {
      badge.textContent = "VAGA ABERTA";
    }
    card.appendChild(badge);

    if (vaga.statusProcesso === "atual") {
      card.classList.add("vaga-em-andamento");
      const sinal = document.createElement("span");
      sinal.className = "vaga-andamento-sinal";
      sinal.textContent = "Entrevistas em andamento nesta vaga";
      card.appendChild(sinal);
    }

    const titulo = document.createElement("h3");
    titulo.textContent = vaga.titulo || "Vaga";
    card.appendChild(titulo);

    const empresa = document.createElement("p");
    empresa.textContent = vaga.empresa ? `Empresa fictícia: ${vaga.empresa}` : "Empresa a definir";
    card.appendChild(empresa);

    const meta = document.createElement("div");
    meta.className = "vaga-meta";
    [
      `Nível: ${vaga.nivel || "Iniciante"}`,
      `Área: ${vaga.area || "Geral"}`,
      textoEntrevistas(vaga)
    ].forEach((texto, indice) => {
      const item = document.createElement("span");
      item.className = "meta-item";
      item.textContent = texto;
      if (indice === 2 && vaga.statusProcesso === "atual") item.dataset.entrevistaStatus = "ativo";
      meta.appendChild(item);
    });
    card.appendChild(meta);

    const hAtividades = document.createElement("h4");
    hAtividades.textContent = "Atividades";
    card.appendChild(hAtividades);

    const ul = document.createElement("ul");
    ul.className = "list-clean";
    const atividades = Array.isArray(vaga.atividades) ? vaga.atividades : [];
    atividades.forEach((atividade) => {
      const li = document.createElement("li");
      li.textContent = atividade;
      ul.appendChild(li);
    });
    card.appendChild(ul);

    const hCompetencias = document.createElement("h4");
    hCompetencias.textContent = "Competências procuradas";
    card.appendChild(hCompetencias);

    const competencias = document.createElement("p");
    competencias.textContent = vaga.competencias || "Responsabilidade, organização e vontade de aprender.";
    card.appendChild(competencias);

    const turma = document.createElement("p");
    turma.className = "vaga-turma-destino";
    turma.textContent = `${vaga.escolaNome || "Escola"} • ${vaga.turmaNome || "Turma"}`;
    card.appendChild(turma);

    const botao = document.createElement("a");
    botao.className = "btn btn-primary";
    botao.href = "curriculos.html";
    botao.textContent = "Preparar currículo no site";
    card.appendChild(botao);

    return card;
  }

  async function excluirChunksPdf(uid, submissao) {
    const ids = Array.isArray(submissao?.pdfChunkIds) ? submissao.pdfChunkIds : [];
    if (!ids.length) return;

    const armazenamento = submissao?.pdfArmazenamento || "usuarios_curriculos";
    const col = armazenamento === "submissoes"
      ? api.db.collection("submissoes")
      : api.db.collection("usuarios").doc(uid).collection("curriculos");

    for (let inicio = 0; inicio < ids.length; inicio += 20) {
      const batch = api.db.batch();
      ids.slice(inicio, inicio + 20).forEach((id) => batch.delete(col.doc(id)));
      try {
        await batch.commit();
      } catch (erro) {
        if (armazenamento === "submissoes") throw erro;
        console.warn("Não foi possível remover partes antigas do PDF.", erro);
        break;
      }
    }
  }

  async function excluirSubmissao(uid, submissao) {
    await excluirChunksPdf(uid, submissao);
    await api.db.collection("submissoes").doc(submissao.id).delete();
  }

  function prepararAcoes(card, vaga, submissao, avaliacao, sessao) {
    const botao = card.querySelector("a.btn");
    if (!botao) return;

    let area = card.querySelector(".vaga-acoes-firebase");
    if (!area) {
      area = document.createElement("div");
      area.className = "vaga-acoes-firebase";
      botao.insertAdjacentElement("beforebegin", area);
      area.appendChild(botao);
    }

    if (avaliacao) {
      definirBadge(card, "CONCLUÍDA", true);
      botao.href = "entrevistas.html";
      botao.textContent = "Ver resultado da entrevista";
      botaoSecundario(botao);
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
        if (!confirm("Excluir o currículo já encaminhado para esta vaga? Depois você poderá enviar outro currículo.")) return;
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
      area.appendChild(excluir);
      return;
    }

    const params = paramsDaVaga(vaga);
    botao.href = `curriculos.html?${params.toString()}`;
    botao.textContent = "Criar ou escolher currículo para enviar";
    botao.classList.remove("btn-secondary");
    botao.classList.add("btn-primary");

    const pdfParams = paramsDaVaga(vaga, { modo: "pdf" });
    const pdf = criarLink("Já tenho um currículo pronto em PDF", `curriculos.html?${pdfParams.toString()}`);
    area.appendChild(pdf);
  }

  async function carregarVagasTurma(turmaId) {
    const base = vagasBase
      .filter((vaga) => vaga.ativo !== false && (!vaga.turmaId || vaga.turmaId === turmaId))
      .map((vaga) => ({ ...vaga }));

    let custom = [];
    try {
      const snap = await api.db.collection("vagas").where("turmaId", "==", turmaId).get();
      custom = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((vaga) => vaga.ativo !== false);
    } catch (erro) {
      console.warn("As vagas cadastradas online ainda não puderam ser carregadas:", erro);
    }

    const idsCustom = new Set(custom.map((vaga) => vaga.id));
    const baseSemDuplicar = base.filter((vaga) => !idsCustom.has(vaga.id));
    const customOrdenadas = custom.sort((a, b) => dataOrdem(b) - dataOrdem(a));

    return {
      vagas: [
        ...baseSemDuplicar.sort((a, b) => (a.ordemBase || 0) - (b.ordemBase || 0)),
        ...customOrdenadas
      ],
      maisRecenteId: customOrdenadas[0]?.id || ""
    };
  }

  async function iniciar() {
    const sessao = await api.exigirSessao("aluno");
    if (!sessao) return;
    api.decorarTopo(sessao);

    const turma = {
      escolaId: sessao.perfil.escolaId || turmaPadrao?.escolaId || "",
      escolaNome: sessao.perfil.escolaNome || turmaPadrao?.escolaNome || "",
      turmaId: sessao.perfil.turmaId || turmaPadrao?.turmaId || "",
      turmaNome: sessao.perfil.turmaNome || turmaPadrao?.turmaNome || ""
    };

    if (!turma.turmaId) {
      carregamento.innerHTML = "<strong>Seu perfil ainda não está vinculado a uma turma.</strong>";
      return;
    }

    if (identificacao) {
      identificacao.textContent = `Vagas destinadas a ${turma.escolaNome} • ${turma.turmaNome}. Leia as atividades e envie o currículo que deseja usar em cada processo.`;
    }

    const [{ vagas, maisRecenteId }, submissoesSnap, avaliacoesSnap] = await Promise.all([
      carregarVagasTurma(turma.turmaId),
      api.db.collection("submissoes").where("alunoUid", "==", sessao.usuario.uid).get(),
      api.db.collection("avaliacoes").where("alunoUid", "==", sessao.usuario.uid).get()
    ]);

    const submissoesPorVaga = new Map();
    submissoesSnap.docs.forEach((doc) => {
      const dados = { id: doc.id, ...doc.data() };
      if (dados.tipoDocumento === "pdf_chunk") return;
      if (dados.vagaId) submissoesPorVaga.set(dados.vagaId, dados);
    });

    const avaliacoesPorVaga = new Map();
    avaliacoesSnap.docs.forEach((doc) => {
      const dados = { id: doc.id, ...doc.data() };
      if (dados.vagaId) avaliacoesPorVaga.set(dados.vagaId, dados);
    });

    grid.replaceChildren();
    vagas.forEach((vaga) => {
      const card = criarCard(vaga, maisRecenteId);
      grid.appendChild(card);
      prepararAcoes(
        card,
        vaga,
        submissoesPorVaga.get(vaga.id),
        avaliacoesPorVaga.get(vaga.id),
        sessao
      );
    });

    if (carregamento) carregamento.hidden = true;
    if (!vagas.length && carregamento) {
      carregamento.hidden = false;
      carregamento.innerHTML = "<strong>Nenhuma vaga foi publicada para sua turma ainda.</strong>";
    }
  }

  iniciar().catch((erro) => {
    console.error("Falha ao preparar vagas:", erro);
    if (carregamento) carregamento.innerHTML = "<strong>Não foi possível carregar as vagas. Atualize a página e tente novamente.</strong>";
  });
})();
