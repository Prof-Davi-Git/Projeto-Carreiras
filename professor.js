(() => {
  const api = window.FirebaseCarreiras;
  if (!api) return;

  const lista = document.querySelector("#professor-lista");
  const vazio = document.querySelector("#professor-vazio");
  const resumo = document.querySelector("#professor-resumo");
  const busca = document.querySelector("#professor-busca");
  const status = document.querySelector("#professor-status");

  let processos = [];

  function el(tag, classe = "", texto = "") {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto !== "") elemento.textContent = texto;
    return elemento;
  }

  function numero(valor, fallback = "") {
    const n = Number(valor);
    return Number.isFinite(n) ? n : fallback;
  }

  function linhaCurriculo(titulo, texto) {
    if (!texto) return null;
    const bloco = el("div");
    bloco.append(el("h4", "", titulo), el("p", "", texto));
    return bloco;
  }

  function resumoCurriculo(curriculo = {}) {
    const box = el("div", "curriculo-preview-professor");
    box.appendChild(el("h3", "", curriculo.nome || "Currículo enviado"));
    if (curriculo.vagaAlvo) box.appendChild(el("p", "", curriculo.vagaAlvo));

    const contato = [curriculo.email, curriculo.telefone, curriculo.cidade].filter(Boolean).join(" • ");
    const partes = [
      linhaCurriculo("Contato", contato),
      linhaCurriculo("Objetivo", curriculo.objetivo),
      linhaCurriculo("Resumo profissional", curriculo.resumo)
    ].filter(Boolean);
    partes.forEach((parte) => box.appendChild(parte));

    const secoes = [
      ["Formação", curriculo.formacoes, (item) => [item.curso, item.instituicao, item.periodo].filter(Boolean).join(" — ")],
      ["Experiências", curriculo.experiencias, (item) => [item.cargo, item.empresa, item.periodo, item.descricao].filter(Boolean).join(" — ")],
      ["Cursos", curriculo.cursos, (item) => [item.nome, item.instituicao, item.ano].filter(Boolean).join(" — ")],
      ["Habilidades", curriculo.habilidades, (item) => item.valor],
      ["Competências", curriculo.competencias, (item) => item.valor],
      ["Idiomas", curriculo.idiomas, (item) => [item.idioma, item.nivel].filter(Boolean).join(" — ")],
      ["Projetos", curriculo.projetos, (item) => [item.nome, item.descricao].filter(Boolean).join(" — ")]
    ];

    secoes.forEach(([titulo, itens, formatar]) => {
      if (!Array.isArray(itens) || !itens.length) return;
      const bloco = el("div");
      bloco.appendChild(el("h4", "", titulo));
      const ul = el("ul");
      itens.forEach((item) => {
        const texto = formatar(item);
        if (texto) ul.appendChild(el("li", "", texto));
      });
      bloco.appendChild(ul);
      box.appendChild(bloco);
    });

    return box;
  }

  function inputNumero(rotulo, nome, valor, max = 2) {
    const label = el("label");
    label.appendChild(el("span", "", rotulo));
    const input = document.createElement("input");
    input.type = "number";
    input.name = nome;
    input.min = "0";
    input.max = String(max);
    input.step = "0.5";
    input.value = valor ?? "";
    label.appendChild(input);
    return label;
  }

  function totalEntrevista(form) {
    const nomes = ["comunicacao", "dominioCurriculo", "adequacaoVaga", "resolucaoProblema", "postura"];
    return nomes.reduce((total, nome) => total + (Number(form.elements[nome]?.value) || 0), 0);
  }

  function criarFormAvaliacao(processo, sessao) {
    const avaliacao = processo.avaliacao || {};
    const criterios = avaliacao.criterios || {};
    const form = el("form", "avaliacao-form");

    const topo = el("div", "avaliacao-grid");
    const dataLabel = el("label");
    dataLabel.appendChild(el("span", "", "Data da entrevista"));
    const data = document.createElement("input");
    data.type = "date";
    data.name = "entrevistaData";
    data.value = avaliacao.entrevistaData || "";
    dataLabel.appendChild(data);

    topo.append(
      dataLabel,
      inputNumero("Nota do currículo (0 a 10)", "notaCurriculo", avaliacao.notaCurriculo, 10)
    );
    form.appendChild(topo);

    const subtitulo = el("strong", "", "Entrevista — 5 critérios de 0 a 2 pontos");
    form.appendChild(subtitulo);

    const grid = el("div", "avaliacao-grid");
    grid.append(
      inputNumero("Comunicação e clareza", "comunicacao", criterios.comunicacao),
      inputNumero("Domínio do currículo", "dominioCurriculo", criterios.dominioCurriculo),
      inputNumero("Adequação à vaga", "adequacaoVaga", criterios.adequacaoVaga),
      inputNumero("Situação-problema", "resolucaoProblema", criterios.resolucaoProblema),
      inputNumero("Postura profissional", "postura", criterios.postura)
    );
    form.appendChild(grid);

    const total = el("div", "nota-entrevista-total");
    total.append(el("strong", "", "Nota da entrevista"), el("strong", "nota-total", String(numero(avaliacao.notaEntrevista, 0))));
    form.appendChild(total);

    const feedbackLabel = el("label");
    feedbackLabel.appendChild(el("span", "", "Feedback para o aluno"));
    const feedback = document.createElement("textarea");
    feedback.name = "feedback";
    feedback.placeholder = "Ex.: Boa comunicação; precisa explicar melhor as experiências do currículo.";
    feedback.value = avaliacao.feedback || "";
    feedbackLabel.appendChild(feedback);
    form.appendChild(feedbackLabel);

    const salvar = el("button", "btn btn-primary", avaliacao ? "Salvar avaliação" : "Publicar avaliação");
    salvar.type = "submit";
    form.appendChild(salvar);

    form.addEventListener("input", () => {
      total.querySelector(".nota-total").textContent = totalEntrevista(form).toFixed(1).replace(".0", "");
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      salvar.disabled = true;
      salvar.textContent = "Salvando...";

      const criteriosNovos = {
        comunicacao: Number(form.elements.comunicacao.value) || 0,
        dominioCurriculo: Number(form.elements.dominioCurriculo.value) || 0,
        adequacaoVaga: Number(form.elements.adequacaoVaga.value) || 0,
        resolucaoProblema: Number(form.elements.resolucaoProblema.value) || 0,
        postura: Number(form.elements.postura.value) || 0
      };

      const notaEntrevista = Object.values(criteriosNovos).reduce((soma, valor) => soma + valor, 0);

      try {
        await api.db.collection("avaliacoes").doc(processo.id).set({
          alunoUid: processo.alunoUid,
          alunoNome: processo.alunoNome,
          vagaId: processo.vagaId,
          vagaTitulo: processo.vagaTitulo,
          empresa: processo.empresa || "",
          entrevistaData: form.elements.entrevistaData.value || "",
          notaCurriculo: Number(form.elements.notaCurriculo.value) || 0,
          criterios: criteriosNovos,
          notaEntrevista,
          feedback: form.elements.feedback.value.trim(),
          professorUid: sessao.usuario.uid,
          professorNome: sessao.perfil.nome || "Professor",
          atualizadoEm: api.FieldValue.serverTimestamp()
        }, { merge: true });

        salvar.textContent = "Avaliação salva ✓";
        processo.avaliacao = {
          ...processo.avaliacao,
          entrevistaData: form.elements.entrevistaData.value || "",
          notaCurriculo: Number(form.elements.notaCurriculo.value) || 0,
          criterios: criteriosNovos,
          notaEntrevista,
          feedback: form.elements.feedback.value.trim()
        };
        setTimeout(() => { salvar.textContent = "Salvar avaliação"; }, 1600);
        atualizarResumo();
      } catch (erro) {
        console.error(erro);
        salvar.textContent = "Tentar novamente";
        alert("Não foi possível salvar a avaliação.");
      } finally {
        salvar.disabled = false;
      }
    });

    return form;
  }

  function criarCard(processo, sessao) {
    const card = el("article", "panel processo-card");
    card.dataset.busca = `${processo.alunoNome || ""} ${processo.vagaTitulo || ""} ${processo.empresa || ""}`.toLowerCase();
    card.dataset.status = processo.avaliacao ? "avaliado" : "pendente";

    const esquerda = el("div");
    const head = el("div", "processo-head");
    const texto = el("div");
    texto.append(el("p", "small-label", processo.alunoNome || "ALUNO"), el("h2", "", processo.vagaTitulo || "Vaga"));
    if (processo.empresa) texto.appendChild(el("p", "", processo.empresa));
    const badge = el("span", processo.avaliacao ? "badge" : "badge gray", processo.avaliacao ? "AVALIADO" : "AGUARDANDO AVALIAÇÃO");
    head.append(texto, badge);
    esquerda.append(head, resumoCurriculo(processo.curriculoSnapshot || {}));

    const direita = el("div");
    direita.appendChild(criarFormAvaliacao(processo, sessao));

    card.append(esquerda, direita);
    return card;
  }

  function atualizarResumo() {
    const avaliados = processos.filter((p) => p.avaliacao).length;
    resumo.textContent = `${processos.length} processo${processos.length === 1 ? "" : "s"} • ${avaliados} avaliado${avaliados === 1 ? "" : "s"}`;
  }

  function aplicarFiltro() {
    const termo = busca.value.trim().toLowerCase();
    const filtroStatus = status.value;
    [...lista.children].forEach((card) => {
      const bateBusca = !termo || card.dataset.busca.includes(termo);
      const bateStatus = filtroStatus === "todos" || card.dataset.status === filtroStatus;
      card.classList.toggle("hidden", !(bateBusca && bateStatus));
    });
  }

  async function carregar(sessao) {
    const snap = await api.db.collection("submissoes").get();
    processos = [];

    for (const doc of snap.docs) {
      const dados = { id: doc.id, ...doc.data() };
      const avaliacaoSnap = await api.db.collection("avaliacoes").doc(doc.id).get();
      if (avaliacaoSnap.exists) dados.avaliacao = avaliacaoSnap.data();
      processos.push(dados);
    }

    processos.sort((a, b) => String(a.alunoNome || "").localeCompare(String(b.alunoNome || ""), "pt-BR"));
    lista.innerHTML = "";
    processos.forEach((processo) => lista.appendChild(criarCard(processo, sessao)));
    vazio.classList.toggle("hidden", processos.length > 0);
    atualizarResumo();
    aplicarFiltro();
  }

  async function iniciar() {
    const sessao = await api.exigirSessao("professor");
    if (!sessao) return;
    api.decorarTopo(sessao);
    busca.addEventListener("input", aplicarFiltro);
    status.addEventListener("change", aplicarFiltro);
    await carregar(sessao);
  }

  iniciar().catch((erro) => {
    console.error("Falha no painel do professor:", erro);
    resumo.textContent = "Não foi possível carregar os processos.";
  });
})();
