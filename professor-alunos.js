(() => {
  const api = window.FirebaseCarreiras;
  if (!api) return;

  const turmas = Array.isArray(window.CARREIRAS_TURMAS) ? window.CARREIRAS_TURMAS : [];
  const alunosBase = Array.isArray(window.ALUNOS_AUTENTICACAO) ? window.ALUNOS_AUTENTICACAO : [];
  const turmaPadrao = window.CARREIRAS_TURMA_PADRAO || null;

  const escolaSelect = document.querySelector("#alunos-escola");
  const turmaSelect = document.querySelector("#alunos-turma");
  const busca = document.querySelector("#alunos-busca");
  const resumo = document.querySelector("#alunos-resumo");
  const status = document.querySelector("#professor-alunos-status");
  const lista = document.querySelector("#professor-alunos-lista");

  if (!escolaSelect || !turmaSelect || !lista) return;

  let sessao = null;
  let usuarios = [];
  let vagasProfessor = [];
  let submissoesProfessor = [];
  let alunosRenderizados = [];

  function normalizar(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function mostrarStatus(texto, erro = false) {
    if (!status) return;
    status.textContent = texto || "";
    status.className = `professor-alunos-status${erro ? " erro" : ""}`;
    status.hidden = !texto;
  }

  function escolaDoAluno(aluno) {
    return aluno?.escolaId || turmaPadrao?.escolaId || "";
  }

  function turmaDoAluno(aluno) {
    return aluno?.turmaId || turmaPadrao?.turmaId || "";
  }

  function preencherEscolas() {
    escolaSelect.replaceChildren();
    const vistos = new Set();
    turmas.filter((item) => item.ativa !== false).forEach((item) => {
      if (vistos.has(item.escolaId)) return;
      vistos.add(item.escolaId);
      const option = document.createElement("option");
      option.value = item.escolaId;
      option.textContent = item.escolaNome;
      escolaSelect.appendChild(option);
    });
  }

  function preencherTurmas() {
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

  function perfilDoIndice(indice, nome) {
    return usuarios.find((item) => Number(item.alunoIndice) === Number(indice))
      || usuarios.find((item) => item.role === "aluno" && normalizar(item.nome) === normalizar(nome))
      || null;
  }

  function emailInterno(indice) {
    try {
      return api.emailInternoAluno(indice);
    } catch (_) {
      return `aluno${String(Number(indice) + 1).padStart(3, "0")}@alunos.meufuturoprofissional.invalid`;
    }
  }

  function formatarData(valor) {
    if (!valor) return "";
    let data = null;
    if (valor?.toDate) data = valor.toDate();
    else if (typeof valor === "string") data = new Date(valor);
    if (!data || Number.isNaN(data.getTime())) return "";
    return data.toLocaleDateString("pt-BR");
  }

  function criarCredencial(rotulo, valor, titulo = "") {
    const box = document.createElement("div");
    box.className = "professor-credencial-item";
    if (titulo) box.title = titulo;
    const label = document.createElement("span");
    label.textContent = rotulo;
    const strong = document.createElement("strong");
    strong.textContent = valor;
    box.append(label, strong);
    return box;
  }

  function aplicarBusca() {
    const termo = normalizar(busca?.value || "");
    let visiveis = 0;
    lista.querySelectorAll(".professor-aluno-card").forEach((card) => {
      const mostrar = !termo || normalizar(card.dataset.busca).includes(termo);
      card.hidden = !mostrar;
      if (mostrar) visiveis += 1;
    });
    const contas = alunosRenderizados.filter((item) => item.perfil).length;
    if (resumo) {
      resumo.textContent = `${visiveis} aluno${visiveis === 1 ? "" : "s"} na turma • ${contas} conta${contas === 1 ? "" : "s"} online criada${contas === 1 ? "" : "s"}`;
    }
  }

  function limparNomeArquivo(nome) {
    return String(nome || "curriculo")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function baixarPdfExterno(submissao, botao) {
    const ids = Array.isArray(submissao.pdfChunkIds) ? submissao.pdfChunkIds : [];
    if (!ids.length) {
      alert("O arquivo PDF desta submissão não foi encontrado.");
      return;
    }

    const anterior = botao.textContent;
    botao.disabled = true;
    botao.textContent = "Preparando PDF...";

    try {
      const armazenamento = submissao.pdfArmazenamento || "usuarios_curriculos";
      const col = armazenamento === "submissoes"
        ? api.db.collection("submissoes")
        : api.db.collection("usuarios").doc(submissao.alunoUid).collection("curriculos");
      const snaps = await Promise.all(ids.map((id) => col.doc(id).get()));
      const partes = snaps
        .filter((snap) => snap.exists)
        .map((snap) => snap.data() || {})
        .filter((dados) => dados.tipoDocumento === "pdf_chunk" && dados.conteudo)
        .sort((a, b) => Number(a.indice || 0) - Number(b.indice || 0))
        .map((dados) => dados.conteudo.toUint8Array());

      if (!partes.length || partes.length !== ids.length) throw new Error("O PDF está incompleto no armazenamento.");

      const blob = new Blob(partes, { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = limparNomeArquivo(submissao.arquivoNome || `${submissao.alunoNome || "aluno"}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (erro) {
      console.error("Falha ao baixar PDF externo:", erro);
      alert(erro.message || "Não foi possível baixar o PDF enviado pelo aluno.");
    } finally {
      botao.disabled = false;
      botao.textContent = anterior;
    }
  }

  function escapar(valor) {
    return String(valor || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function listaHtml(titulo, itens, formatar) {
    if (!Array.isArray(itens) || !itens.length) return "";
    const linhas = itens.map((item) => formatar(item)).filter(Boolean);
    if (!linhas.length) return "";
    return `<section><h2>${escapar(titulo)}</h2><ul>${linhas.map((linha) => `<li>${linha}</li>`).join("")}</ul></section>`;
  }

  function curriculoHtml(curriculo) {
    const contato = [curriculo.email, curriculo.telefone, curriculo.cidade].filter(Boolean).map(escapar).join(" • ");
    const links = [curriculo.linkedin, curriculo.github].filter(Boolean).map(escapar).join(" • ");
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapar(curriculo.tituloCurriculo || "Currículo")}</title><style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#202939;margin:0}main{max-width:185mm;margin:auto}header{border-bottom:3px solid #155eef;padding-bottom:14px;margin-bottom:18px}h1{margin:0;color:#155eef;font-size:28px}header p{margin:5px 0;color:#667085}h2{margin:18px 0 7px;color:#155eef;font-size:15px;text-transform:uppercase}p,li{font-size:12px;line-height:1.55}ul{padding-left:18px}.toolbar{position:fixed;right:12px;top:12px;background:#fff;border:1px solid #ddd;padding:10px;border-radius:8px}@media print{.toolbar{display:none}}</style></head><body><div class="toolbar">Escolha <strong>Salvar como PDF</strong>.</div><main><header><h1>${escapar(curriculo.nome || "Currículo")}</h1><p>${contato}</p><p>${links}</p></header>${curriculo.objetivo ? `<section><h2>Objetivo</h2><p>${escapar(curriculo.objetivo)}</p></section>` : ""}${curriculo.resumo ? `<section><h2>Resumo profissional</h2><p>${escapar(curriculo.resumo)}</p></section>` : ""}${listaHtml("Formação", curriculo.formacoes, (i) => escapar([i.curso, i.instituicao, i.periodo].filter(Boolean).join(" — ")))}${listaHtml("Experiências", curriculo.experiencias, (i) => escapar([i.cargo, i.empresa, i.periodo, i.descricao].filter(Boolean).join(" — ")))}${listaHtml("Cursos", curriculo.cursos, (i) => escapar([i.nome, i.instituicao, i.ano].filter(Boolean).join(" — ")))}${listaHtml("Habilidades", curriculo.habilidades, (i) => escapar(i.valor || ""))}${listaHtml("Competências", curriculo.competencias, (i) => escapar(i.valor || ""))}${listaHtml("Idiomas", curriculo.idiomas, (i) => escapar([i.idioma, i.nivel].filter(Boolean).join(" — ")))}${listaHtml("Projetos", curriculo.projetos, (i) => escapar([i.nome, i.descricao].filter(Boolean).join(" — ")))}</main><script>setTimeout(()=>window.print(),400)<\/script></body></html>`;
  }

  function gerarPdfCurriculo(curriculo) {
    const popup = window.open("", "_blank");
    if (!popup) {
      alert("O navegador bloqueou a janela do currículo. Autorize pop-ups e tente novamente.");
      return;
    }
    popup.document.open();
    popup.document.write(curriculoHtml(curriculo));
    popup.document.close();
  }

  function criarLinhaCurriculo({ tipo, titulo, detalhe, vagas, dados, submissao }) {
    const item = document.createElement("article");
    item.className = "professor-curriculo-item";

    const info = document.createElement("div");
    info.className = "professor-curriculo-info";
    const tipoEl = document.createElement("span");
    tipoEl.className = `professor-curriculo-tipo${tipo === "pdf" ? " pdf" : ""}`;
    tipoEl.textContent = tipo === "pdf" ? "PDF enviado" : "Criado na plataforma";
    const h4 = document.createElement("h4");
    h4.textContent = titulo || "Currículo";
    info.append(tipoEl, h4);

    if (detalhe) {
      const p = document.createElement("p");
      p.textContent = detalhe;
      info.appendChild(p);
    }

    const vagasUnicas = Array.from(new Set((vagas || []).filter(Boolean)));
    const pVaga = document.createElement("p");
    pVaga.className = "professor-curriculo-vaga";
    pVaga.textContent = vagasUnicas.length ? `Enviado para: ${vagasUnicas.join(" • ")}` : "Sem vínculo com uma vaga sua.";
    info.appendChild(pVaga);

    const acoes = document.createElement("div");
    acoes.className = "professor-curriculo-acoes";
    const baixar = document.createElement("button");
    baixar.type = "button";
    baixar.className = "btn btn-primary";
    baixar.textContent = tipo === "pdf" ? "Baixar PDF enviado" : "Gerar / salvar PDF";
    if (tipo === "pdf") baixar.addEventListener("click", () => baixarPdfExterno(submissao, baixar));
    else baixar.addEventListener("click", () => gerarPdfCurriculo(dados || {}));
    acoes.appendChild(baixar);

    item.append(info, acoes);
    return item;
  }

  function curriculosDoAluno(perfil) {
    if (!perfil?.uid) return [];
    const envios = submissoesProfessor.filter((item) => item.alunoUid === perfil.uid && item.tipoDocumento !== "pdf_chunk");
    const resultado = [];
    const sites = new Map();

    envios.filter((item) => item.tipoCurriculo !== "pdf_externo").forEach((envio) => {
      const chave = String(envio.curriculoId || envio.id);
      if (!sites.has(chave)) {
        sites.set(chave, {
          tipo: "site",
          titulo: envio.curriculoSnapshot?.tituloCurriculo || "Currículo criado na plataforma",
          detalhe: formatarData(envio.atualizadoEm) ? `Enviado em ${formatarData(envio.atualizadoEm)}` : "Versão enviada pela plataforma",
          vagas: [],
          dados: envio.curriculoSnapshot || {}
        });
      }
      sites.get(chave).vagas.push(envio.vagaTitulo || envio.vagaId);
    });

    sites.forEach((item) => resultado.push(item));

    envios.filter((item) => item.tipoCurriculo === "pdf_externo").forEach((envio) => {
      resultado.push({
        tipo: "pdf",
        titulo: envio.arquivoNome || "Currículo externo.pdf",
        detalhe: formatarData(envio.atualizadoEm) ? `Enviado em ${formatarData(envio.atualizadoEm)}` : "PDF enviado pelo aluno",
        vagas: [envio.vagaTitulo || envio.vagaId],
        submissao: envio
      });
    });

    return resultado;
  }

  function criarCardAluno(alunoInfo) {
    const { aluno, indice, perfil } = alunoInfo;
    const card = document.createElement("article");
    card.className = "professor-aluno-card";
    card.dataset.busca = `${aluno.nome} ${emailInterno(indice)}`;

    const head = document.createElement("div");
    head.className = "professor-aluno-head";

    const identidade = document.createElement("div");
    identidade.className = "professor-aluno-identidade";
    const label = document.createElement("p");
    label.className = "small-label";
    label.textContent = `ALUNO ${String(indice + 1).padStart(2, "0")}`;
    const nome = document.createElement("h3");
    nome.textContent = aluno.nome;
    const turma = document.createElement("p");
    const turmaConfig = turmas.find((item) => item.turmaId === turmaSelect.value);
    turma.textContent = `${turmaConfig?.escolaNome || "Escola"} • ${turmaConfig?.turmaNome || "Turma"}`;
    const conta = document.createElement("span");
    conta.className = `professor-aluno-status-conta${perfil ? "" : " offline"}`;
    conta.textContent = perfil ? "CONTA ONLINE CRIADA" : "AINDA NÃO ACESSOU";
    identidade.append(label, nome, turma, conta);

    const credenciais = document.createElement("div");
    credenciais.className = "professor-aluno-credenciais";
    credenciais.append(
      criarCredencial("Nome de acesso", aluno.nome),
      criarCredencial("Identificador interno", emailInterno(indice)),
      criarCredencial("Senha", "6 últimos do RA + dígito", "A senha real não é armazenada em texto; somente o hash de validação é guardado.")
    );

    const vinculados = curriculosDoAluno(perfil);
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "btn btn-secondary professor-aluno-toggle";
    toggle.textContent = vinculados.length ? `Currículos vinculados (${vinculados.length})` : "Sem currículos vinculados";
    toggle.disabled = vinculados.length === 0;
    toggle.setAttribute("aria-expanded", "false");

    const detalhes = document.createElement("div");
    detalhes.className = "professor-aluno-detalhes";
    detalhes.hidden = true;

    if (vinculados.length) {
      const listaCurriculos = document.createElement("div");
      listaCurriculos.className = "professor-curriculos-lista";
      vinculados.forEach((item) => listaCurriculos.appendChild(criarLinhaCurriculo(item)));
      detalhes.appendChild(listaCurriculos);

      toggle.addEventListener("click", () => {
        const abrir = detalhes.hidden;
        detalhes.hidden = !abrir;
        toggle.setAttribute("aria-expanded", String(abrir));
        toggle.textContent = abrir ? "Ocultar currículos" : `Currículos vinculados (${vinculados.length})`;
      });
    }

    head.append(identidade, credenciais, toggle);
    card.append(head, detalhes);
    return card;
  }

  function renderizar() {
    lista.replaceChildren();
    const turmaId = turmaSelect.value;
    const escolaId = escolaSelect.value;

    alunosRenderizados = alunosBase
      .map((aluno, indice) => ({ aluno, indice, perfil: perfilDoIndice(indice, aluno.nome) }))
      .filter(({ aluno }) => turmaDoAluno(aluno) === turmaId && escolaDoAluno(aluno) === escolaId);

    alunosRenderizados
      .sort((a, b) => a.aluno.nome.localeCompare(b.aluno.nome, "pt-BR"))
      .forEach((item) => lista.appendChild(criarCardAluno(item)));

    if (!alunosRenderizados.length) {
      const vazio = document.createElement("div");
      vazio.className = "panel empty-state";
      vazio.innerHTML = "<h2>Nenhum aluno cadastrado nesta turma.</h2><p>Quando os alunos forem vinculados à turma, eles aparecerão aqui.</p>";
      lista.appendChild(vazio);
    }

    aplicarBusca();
  }

  async function consultarSubmissoesDasVagas() {
    if (!vagasProfessor.length) return [];
    const resultados = [];
    for (const vaga of vagasProfessor) {
      try {
        const snap = await api.db.collection("submissoes").where("vagaId", "==", vaga.id).get();
        snap.docs.forEach((doc) => resultados.push({ id: doc.id, ...doc.data() }));
      } catch (erro) {
        console.warn(`Não foi possível consultar os envios da vaga ${vaga.id}.`, erro);
      }
    }
    return resultados;
  }

  async function carregarBase() {
    mostrarStatus("Carregando alunos e vínculos deste professor...");
    const [usuariosSnap, vagasSnap] = await Promise.all([
      api.db.collection("usuarios").get(),
      api.db.collection("vagas").where("professorUid", "==", sessao.usuario.uid).get()
    ]);

    usuarios = usuariosSnap.docs.map((doc) => ({ uid: doc.id, ...(doc.data() || {}) }));
    vagasProfessor = vagasSnap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() || {}) }))
      .filter((vaga) => vaga.ativo !== false);
    submissoesProfessor = (await consultarSubmissoesDasVagas())
      .filter((item) => item.tipoDocumento !== "pdf_chunk");

    mostrarStatus("");
    renderizar();
  }

  escolaSelect.addEventListener("change", () => {
    preencherTurmas();
    renderizar();
  });
  turmaSelect.addEventListener("change", renderizar);
  busca?.addEventListener("input", aplicarBusca);

  async function iniciar() {
    sessao = await api.exigirSessao("professor");
    if (!sessao) return;
    preencherEscolas();
    preencherTurmas();
    await carregarBase();
  }

  iniciar().catch((erro) => {
    console.error("Falha ao preparar consulta de alunos:", erro);
    mostrarStatus("Não foi possível carregar os alunos e currículos. Atualize a página e tente novamente.", true);
  });
})();
