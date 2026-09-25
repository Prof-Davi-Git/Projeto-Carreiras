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

  function opcoesEscola() {
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
  }

  function opcoesTurma() {
    turmaSelect.replaceChildren();
    turmas
      .filter((item) => item.ativa !== false && item.escolaId === escolaSelect.value)
      .forEach((item) => {
        const option = document.createElement("option");
        option.value = item.turmaId;
        option.textContent = item.turmaNome;
        turmaSelect.appendChild(option);
      });
  }

  function abrirCadastro() {
    formWrap.hidden = false;
    abrirForm?.setAttribute("aria-expanded", "true");
    document.querySelector("#vaga-titulo")?.focus();
  }

  function fecharCadastro() {
    form.reset();
    opcoesEscola();
    opcoesTurma();
    formWrap.hidden = true;
    abrirForm?.setAttribute("aria-expanded", "false");
    textoStatus("");
  }

  function criarTag(texto, classe = "") {
    const span = document.createElement("span");
    span.className = `professor-vaga-tag${classe ? ` ${classe}` : ""}`;
    span.textContent = texto;
    return span;
  }

  function renderizar() {
    lista.replaceChildren();

    const custom = vagasProfessor.slice().sort((a, b) => dataOrdem(b) - dataOrdem(a));
    const maisRecenteId = custom[0]?.id || "";
    const todas = [
      ...vagasBase.slice().sort((a, b) => (a.ordemBase || 0) - (b.ordemBase || 0)),
      ...custom
    ];

    todas.forEach((vaga) => {
      const card = document.createElement("article");
      card.className = "professor-vaga-item";

      const info = document.createElement("div");
      info.className = "professor-vaga-info";

      const tags = document.createElement("div");
      tags.className = "professor-vaga-tags";
      if (vaga.statusProcesso === "atual") tags.appendChild(criarTag("VAGA ATUAL", "atual"));
      else if (vaga.baseSistema) tags.appendChild(criarTag("PRÓXIMA VAGA", "proxima"));
      else if (vaga.id === maisRecenteId) tags.appendChild(criarTag("NOVA VAGA", "nova"));
      else tags.appendChild(criarTag("CADASTRADA", ""));

      const turma = criarTag(`${vaga.escolaNome || "Escola"} • ${vaga.turmaNome || "Turma"}`, "turma");
      tags.appendChild(turma);

      const titulo = document.createElement("h3");
      titulo.textContent = vaga.titulo || "Vaga";

      const meta = document.createElement("p");
      meta.textContent = [vaga.empresa, vaga.area, vaga.nivel].filter(Boolean).join(" • ");

      info.append(tags, titulo, meta);
      card.appendChild(info);

      if (!vaga.baseSistema) {
        const acoes = document.createElement("div");
        acoes.className = "professor-vaga-item-acoes";

        const excluir = document.createElement("button");
        excluir.type = "button";
        excluir.className = "btn btn-secondary btn-small";
        excluir.textContent = "Excluir vaga";
        excluir.addEventListener("click", async () => {
          if (!confirm(`Excluir a vaga “${vaga.titulo}”? Ela deixará de aparecer para a turma.`)) return;
          excluir.disabled = true;
          excluir.textContent = "Excluindo...";
          try {
            await api.db.collection("vagas").doc(vaga.id).delete();
            vagasProfessor = vagasProfessor.filter((item) => item.id !== vaga.id);
            renderizar();
            textoStatus("Vaga excluída.", "sucesso");
          } catch (erro) {
            console.error("Falha ao excluir vaga:", erro);
            excluir.disabled = false;
            excluir.textContent = "Tentar excluir novamente";
            textoStatus("Não foi possível excluir a vaga. Verifique as regras do Firestore.", "erro");
          }
        });
        acoes.appendChild(excluir);
        card.appendChild(acoes);
      }

      lista.appendChild(card);
    });
  }

  async function carregar() {
    if (!sessaoAtual) return;
    try {
      const snap = await api.db.collection("vagas")
        .where("professorUid", "==", sessaoAtual.usuario.uid)
        .get();
      vagasProfessor = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((vaga) => vaga.ativo !== false);
      renderizar();
    } catch (erro) {
      console.error("Falha ao carregar vagas cadastradas:", erro);
      vagasProfessor = [];
      renderizar();
      textoStatus("As vagas base estão visíveis, mas o cadastro online ainda precisa das novas regras do Firestore.", "aviso");
    }
  }

  escolaSelect?.addEventListener("change", opcoesTurma);
  abrirForm?.addEventListener("click", abrirCadastro);
  cancelarForm?.addEventListener("click", fecharCadastro);

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
      textoStatus("Preencha os campos da vaga antes de publicar.", "erro");
      return;
    }

    const baseId = api.slug(titulo) || "vaga";
    const id = `${baseId}-${Date.now().toString(36)}`;
    const criadoEmIso = new Date().toISOString();
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
      statusProcesso: "proxima",
      datasEntrevista: [],
      baseSistema: false,
      ativo: true,
      criadoEm: api.FieldValue.serverTimestamp(),
      criadoEmIso
    };

    salvar.disabled = true;
    salvar.textContent = "Publicando...";
    textoStatus("Publicando vaga para a turma selecionada...", "aviso");

    try {
      await api.db.collection("vagas").doc(id).set(dados);
      vagasProfessor.unshift({ id, ...dados });
      renderizar();
      fecharCadastro();
      textoStatus(`Vaga “${titulo}” publicada para ${turma.turmaNome}.`, "sucesso");
    } catch (erro) {
      console.error("Falha ao publicar vaga:", erro);
      textoStatus("Não foi possível publicar. As novas regras do Firestore precisam estar publicadas.", "erro");
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
    renderizar();
    await carregar();
  }

  iniciar().catch((erro) => console.error("Falha no gerenciamento de vagas:", erro));
})();
