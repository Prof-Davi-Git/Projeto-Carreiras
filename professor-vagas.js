(() => {
  const api = window.FirebaseCarreiras;
  if (!api) return;

  const turmas = Array.isArray(window.CARREIRAS_TURMAS) ? window.CARREIRAS_TURMAS : [];
  const vagasBase = Array.isArray(window.CARREIRAS_VAGAS_BASE) ? window.CARREIRAS_VAGAS_BASE : [];

  const painel = document.querySelector("#professor-vagas-admin");
  const abrirForm = document.querySelector("#btn-nova-vaga");
  const cancelarForm = document.querySelector("#btn-cancelar-vaga");
  const formWrap = document.querySelector("#nova-vaga-wrap");
  const form = document.querySelector("#form-nova-vaga");
  const escolaSelect = document.querySelector("#vaga-escola");
  const turmaSelect = document.querySelector("#vaga-turma");
  const lista = document.querySelector("#professor-vagas-lista");
  const status = document.querySelector("#professor-vagas-status");
  const salvar = document.querySelector("#btn-salvar-vaga");
  const edicaoId = document.querySelector("#vaga-edicao-id");

  if (!painel || !form || !lista) return;

  let sessaoAtual = null;
  let vagasProfessor = [];

  function textoStatus(texto, tipo = "") {
    if (!status) return;
    status.textContent = texto || "";
    status.className = `professor-vagas-status${tipo ? ` ${tipo}` : ""}`;
    status.hidden = !texto;
  }

  function dataOrdem(vaga) {
    if (vaga?.criadoEm?.toMillis) return vaga.criadoEm.toMillis();
    const valor = Date.parse(vaga?.criadoEmIso || "");
    return Number.isFinite(valor) ? valor : 0;
  }

  function opcoesEscola(valorSelecionado = "") {
    const escolas = [];
    const vistos = new Set();
    turmas.filter((item) => item.ativa !== false).forEach((item) => {
      if (vistos.has(item.escolaId)) return;
      vistos.add(item.escolaId);
      escolas.push(item);
    });

    escolaSelect.replaceChildren();
    escolas.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.escolaId;
      option.textContent = item.escolaNome;
      escolaSelect.appendChild(option);
    });

    if (valorSelecionado && [...escolaSelect.options].some((op) => op.value === valorSelecionado)) {
      escolaSelect.value = valorSelecionado;
    }
  }

  function opcoesTurma(valorSelecionado = "") {
    turmaSelect.replaceChildren();
    turmas
      .filter((item) => item.ativa !== false && item.escolaId === escolaSelect.value)
      .forEach((item) => {
        const option = document.createElement("option");
        option.value = item.turmaId;
        option.textContent = item.turmaNome;
        turmaSelect.appendChild(option);
      });

    if (valorSelecionado && [...turmaSelect.options].some((op) => op.value === valorSelecionado)) {
      turmaSelect.value = valorSelecionado;
    }
  }

  function abrirCadastro() {
    if (edicaoId) edicaoId.value = "";
    form.reset();
    opcoesEscola();
    opcoesTurma();
    salvar.textContent = "Publicar vaga para a turma";
    formWrap.hidden = false;
    abrirForm?.setAttribute("aria-expanded", "true");
    document.querySelector("#vaga-titulo")?.focus();
    textoStatus("");
  }

  function fecharCadastro() {
    form.reset();
    if (edicaoId) edicaoId.value = "";
    opcoesEscola();
    opcoesTurma();
    salvar.textContent = "Publicar vaga para a turma";
    formWrap.hidden = true;
    abrirForm?.setAttribute("aria-expanded", "false");
  }

  function abrirEdicao(vaga) {
    if (!vaga) return;
    if (edicaoId) edicaoId.value = vaga.id;
    opcoesEscola(vaga.escolaId || "");
    opcoesTurma(vaga.turmaId || "");
    document.querySelector("#vaga-titulo").value = vaga.titulo || "";
    document.querySelector("#vaga-empresa").value = vaga.empresa || "";
    document.querySelector("#vaga-area").value = vaga.area || "";
    document.querySelector("#vaga-nivel").value = vaga.nivel || "Iniciante";
    document.querySelector("#vaga-atividades").value = Array.isArray(vaga.atividades) ? vaga.atividades.join("\n") : "";
    document.querySelector("#vaga-competencias").value = vaga.competencias || "";
    salvar.textContent = "Salvar alterações";
    formWrap.hidden = false;
    abrirForm?.setAttribute("aria-expanded", "true");
    formWrap.scrollIntoView({ behavior: "smooth", block: "start" });
    textoStatus(`Editando “${vaga.titulo}”.`, "aviso");
  }

  function criarTag(texto, classe = "") {
    const span = document.createElement("span");
    span.className = `professor-vaga-tag${classe ? ` ${classe}` : ""}`;
    span.textContent = texto;
    return span;
  }

  function ordenarVagas(a, b) {
    if (a.statusProcesso === "atual" && b.statusProcesso !== "atual") return -1;
    if (b.statusProcesso === "atual" && a.statusProcesso !== "atual") return 1;

    const ordemA = Number.isFinite(Number(a.ordemBase)) ? Number(a.ordemBase) : 999;
    const ordemB = Number.isFinite(Number(b.ordemBase)) ? Number(b.ordemBase) : 999;
    if (ordemA !== ordemB) return ordemA - ordemB;

    return dataOrdem(b) - dataOrdem(a);
  }

  async function definirAtual(vaga) {
    if (!sessaoAtual || !vaga || vaga.statusProcesso === "atual") return;

    const mesmaTurma = vagasProfessor.filter((item) => item.ativo !== false && item.turmaId === vaga.turmaId);
    const batch = api.db.batch();

    mesmaTurma.forEach((item) => {
      if (item.id === vaga.id) {
        batch.set(api.db.collection("vagas").doc(item.id), {
          statusProcesso: "atual",
          atualizadoEm: api.FieldValue.serverTimestamp()
        }, { merge: true });
      } else if (item.statusProcesso === "atual") {
        batch.set(api.db.collection("vagas").doc(item.id), {
          statusProcesso: item.id === "auxiliar-administrativo" ? "proxima" : "cadastrada",
          atualizadoEm: api.FieldValue.serverTimestamp()
        }, { merge: true });
      }
    });

    try {
      await batch.commit();
      vagasProfessor = vagasProfessor.map((item) => {
        if (item.turmaId !== vaga.turmaId) return item;
        if (item.id === vaga.id) return { ...item, statusProcesso: "atual" };
        if (item.statusProcesso === "atual") {
          return { ...item, statusProcesso: item.id === "auxiliar-administrativo" ? "proxima" : "cadastrada" };
        }
        return item;
      });
      renderizar();
      textoStatus(`“${vaga.titulo}” agora é a vaga atual da turma ${vaga.turmaNome}.`, "sucesso");
    } catch (erro) {
      console.error("Falha ao definir vaga atual:", erro);
      textoStatus("Não foi possível alterar a vaga atual.", "erro");
    }
  }

  async function excluirVaga(vaga, botao) {
    if (!vaga || !sessaoAtual) return;
    if (!confirm(`Excluir a vaga “${vaga.titulo}”? Ela deixará de aparecer para os alunos.`)) return;

    botao.disabled = true;
    botao.textContent = "Excluindo...";

    try {
      const batch = api.db.batch();
      const ref = api.db.collection("vagas").doc(vaga.id);
      batch.set(ref, {
        ativo: false,
        statusProcesso: "arquivada",
        atualizadoEm: api.FieldValue.serverTimestamp()
      }, { merge: true });

      if (vaga.statusProcesso === "atual") {
        const substituta = vagasProfessor
          .filter((item) => item.ativo !== false && item.id !== vaga.id && item.turmaId === vaga.turmaId)
          .sort(ordenarVagas)[0];

        if (substituta) {
          batch.set(api.db.collection("vagas").doc(substituta.id), {
            statusProcesso: "atual",
            atualizadoEm: api.FieldValue.serverTimestamp()
          }, { merge: true });
        }
      }

      await batch.commit();

      let promoveu = null;
      if (vaga.statusProcesso === "atual") {
        promoveu = vagasProfessor
          .filter((item) => item.ativo !== false && item.id !== vaga.id && item.turmaId === vaga.turmaId)
          .sort(ordenarVagas)[0] || null;
      }

      vagasProfessor = vagasProfessor.map((item) => {
        if (item.id === vaga.id) return { ...item, ativo: false, statusProcesso: "arquivada" };
        if (promoveu && item.id === promoveu.id) return { ...item, statusProcesso: "atual" };
        return item;
      });

      renderizar();
      textoStatus("Vaga excluída.", "sucesso");
    } catch (erro) {
      console.error("Falha ao excluir vaga:", erro);
      botao.disabled = false;
      botao.textContent = "Excluir";
      textoStatus("Não foi possível excluir a vaga.", "erro");
    }
  }

  function renderizar() {
    lista.replaceChildren();

    const ativas = vagasProfessor.filter((vaga) => vaga.ativo !== false).sort(ordenarVagas);
    const custom = ativas.filter((vaga) => !vaga.baseSistema).sort((a, b) => dataOrdem(b) - dataOrdem(a));
    const maisRecenteId = custom[0]?.id || "";

    if (!ativas.length) {
      const vazio = document.createElement("p");
      vazio.className = "professor-vagas-status aviso";
      vazio.textContent = "Nenhuma vaga ativa. Cadastre uma nova vaga para esta turma.";
      lista.appendChild(vazio);
      return;
    }

    ativas.forEach((vaga) => {
      const card = document.createElement("article");
      card.className = `professor-vaga-item${vaga.statusProcesso === "atual" ? " vaga-atual" : ""}`;

      const info = document.createElement("div");
      info.className = "professor-vaga-info";

      const tags = document.createElement("div");
      tags.className = "professor-vaga-tags";
      if (vaga.statusProcesso === "atual") tags.appendChild(criarTag("VAGA ATUAL", "atual"));
      else if (vaga.id === "auxiliar-administrativo" && vaga.statusProcesso === "proxima") tags.appendChild(criarTag("PRÓXIMA VAGA", "proxima"));
      else if (vaga.id === maisRecenteId) tags.appendChild(criarTag("NOVA VAGA", "nova"));
      else tags.appendChild(criarTag("CADASTRADA"));

      tags.appendChild(criarTag(`${vaga.escolaNome || "Escola"} • ${vaga.turmaNome || "Turma"}`, "turma"));

      const titulo = document.createElement("h3");
      titulo.textContent = vaga.titulo || "Vaga";

      const meta = document.createElement("p");
      meta.textContent = [vaga.empresa, vaga.area, vaga.nivel].filter(Boolean).join(" • ");

      info.append(tags, titulo, meta);

      const acoes = document.createElement("div");
      acoes.className = "professor-vaga-item-acoes";

      const atual = document.createElement("button");
      atual.type = "button";
      atual.className = "btn btn-secondary btn-small professor-vaga-atual-btn";
      atual.textContent = vaga.statusProcesso === "atual" ? "Vaga atual ✓" : "Definir como atual";
      atual.disabled = vaga.statusProcesso === "atual";
      atual.addEventListener("click", () => definirAtual(vaga));

      const editar = document.createElement("button");
      editar.type = "button";
      editar.className = "btn btn-secondary btn-small";
      editar.textContent = "Editar";
      editar.addEventListener("click", () => abrirEdicao(vaga));

      const excluir = document.createElement("button");
      excluir.type = "button";
      excluir.className = "btn btn-secondary btn-small professor-vaga-excluir";
      excluir.textContent = "Excluir";
      excluir.addEventListener("click", () => excluirVaga(vaga, excluir));

      acoes.append(atual, editar, excluir);
      card.append(info, acoes);
      lista.appendChild(card);
    });
  }

  async function listarVagasDoProfessor() {
    const snap = await api.db.collection("vagas")
      .where("professorUid", "==", sessaoAtual.usuario.uid)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async function garantirVagasBase(idsExistentes) {
    if (!sessaoAtual) return false;
    let criou = false;

    for (const vaga of vagasBase) {
      if (idsExistentes.has(vaga.id)) continue;

      try {
        await api.db.collection("vagas").doc(vaga.id).set({
          ...vaga,
          professorUid: sessaoAtual.usuario.uid,
          professorNome: sessaoAtual.perfil.nome || "Professor",
          criadoEm: api.FieldValue.serverTimestamp(),
          atualizadoEm: api.FieldValue.serverTimestamp()
        });
        criou = true;
      } catch (erro) {
        console.warn(`Não foi possível inicializar a vaga base ${vaga.id}.`, erro);
      }
    }

    return criou;
  }

  async function carregar() {
    if (!sessaoAtual) return;

    try {
      let encontradas = await listarVagasDoProfessor();
      const criouBase = await garantirVagasBase(new Set(encontradas.map((vaga) => vaga.id)));
      if (criouBase) encontradas = await listarVagasDoProfessor();
      vagasProfessor = encontradas;
      renderizar();
    } catch (erro) {
      console.error("Falha ao carregar vagas cadastradas:", erro);
      vagasProfessor = vagasBase.map((vaga) => ({
        ...vaga,
        professorUid: sessaoAtual.usuario.uid,
        professorNome: sessaoAtual.perfil.nome || "Professor"
      }));
      renderizar();
      textoStatus("Não foi possível sincronizar as vagas com o Firestore. Atualize a página e tente novamente.", "erro");
    }
  }

  escolaSelect?.addEventListener("change", () => opcoesTurma());
  abrirForm?.addEventListener("click", abrirCadastro);
  cancelarForm?.addEventListener("click", () => {
    fecharCadastro();
    textoStatus("");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!sessaoAtual) return;

    const turma = turmas.find((item) => item.turmaId === turmaSelect.value);
    if (!turma) {
      textoStatus("Selecione uma turma válida.", "erro");
      return;
    }

    const titulo = document.querySelector("#vaga-titulo")?.value.trim() || "";
    const empresa = document.querySelector("#vaga-empresa")?.value.trim() || "";
    const area = document.querySelector("#vaga-area")?.value.trim() || "";
    const nivel = document.querySelector("#vaga-nivel")?.value.trim() || "Iniciante";
    const atividades = String(document.querySelector("#vaga-atividades")?.value || "")
      .split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean);
    const competencias = document.querySelector("#vaga-competencias")?.value.trim() || "";

    if (!titulo || !empresa || !area || !atividades.length || !competencias) {
      textoStatus("Preencha os campos da vaga antes de salvar.", "erro");
      return;
    }

    const idEditando = edicaoId?.value || "";
    const existente = vagasProfessor.find((item) => item.id === idEditando) || null;
    const id = existente?.id || `${api.slug(titulo) || "vaga"}-${Date.now().toString(36)}`;
    const criadoEmIso = existente?.criadoEmIso || new Date().toISOString();

    const dados = {
      titulo,
      empresa,
      area,
      nivel,
      atividades,
      competencias,
      escolaId: turma.escolaId,
      escolaNome: turma.escolaNome,
      turmaId: turma.turmaId,
      turmaNome: turma.turmaNome,
      professorUid: sessaoAtual.usuario.uid,
      professorNome: sessaoAtual.perfil.nome || "Professor",
      statusProcesso: existente?.statusProcesso || "cadastrada",
      datasEntrevista: Array.isArray(existente?.datasEntrevista) ? existente.datasEntrevista : [],
      baseSistema: Boolean(existente?.baseSistema),
      ordemBase: existente?.ordemBase ?? null,
      ativo: true,
      criadoEmIso,
      atualizadoEm: api.FieldValue.serverTimestamp()
    };

    salvar.disabled = true;
    salvar.textContent = existente ? "Salvando..." : "Publicando...";
    textoStatus(existente ? "Salvando alterações..." : "Publicando vaga para a turma selecionada...", "aviso");

    try {
      const ref = api.db.collection("vagas").doc(id);
      if (existente) {
        await ref.set(dados, { merge: true });
        vagasProfessor = vagasProfessor.map((item) => item.id === id ? { ...item, ...dados } : item);
      } else {
        await ref.set({
          ...dados,
          criadoEm: api.FieldValue.serverTimestamp()
        });
        vagasProfessor.push({ id, ...dados });
      }

      fecharCadastro();
      renderizar();
      textoStatus(existente ? `Vaga “${titulo}” atualizada.` : `Vaga “${titulo}” publicada para ${turma.turmaNome}.`, "sucesso");
    } catch (erro) {
      console.error("Falha ao salvar vaga:", erro);
      textoStatus("Não foi possível salvar a vaga.", "erro");
    } finally {
      salvar.disabled = false;
      salvar.textContent = "Publicar vaga para a turma";
    }
  });

  async function iniciar() {
    sessaoAtual = await api.exigirSessao("professor");
    if (!sessaoAtual) return;
    opcoesEscola();
    opcoesTurma();
    await carregar();
  }

  iniciar().catch((erro) => console.error("Falha no gerenciamento de vagas:", erro));
})();
