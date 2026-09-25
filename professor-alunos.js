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
  let submissoes = [];
  let alunosRenderizados = [];

  function normalizar(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function ehVagaRemovida(item) {
    const texto = normalizar(item?.vagaTitulo || item?.vagaId || "");
    return texto.includes("desenvolvedor(a) front-end junior")
      || texto.includes("desenvolvedor front-end junior")
      || texto === "desenvolvedor-a-front-end-junior";
  }

  function mostrarStatus(texto, erro = false) {
    if (!status) return;
    status.textContent = texto || "";
    status.className = `professor-alunos-status${erro ? " erro" : ""}`;
    status.hidden = !texto;
  }

  function turmaDoAluno(aluno) {
    return aluno?.turmaId || turmaPadrao?.turmaId || "";
  }

  function escolaDoAluno(aluno) {
    return aluno?.escolaId || turmaPadrao?.escolaId || "";
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
    else if (valor instanceof Date) data = valor;
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
    if (resumo) resumo.textContent = `${visiveis} aluno${visiveis === 1 ? "" : "s"} na turma • ${contas} conta${contas === 1 ? "" : "s"} online criada${contas === 1 ? "" : "s"}`;
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

    const texto = botao.textContent;
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

      if (!partes.length || partes.length !== ids.length) {
        throw new Error("O PDF está incompleto no armazenamento.");
      }

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
      botao.textContent = texto;
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
    const layout = ["moderno", "compacto", "classico"].includes(curriculo.layout) ? curriculo.layout : "classico";
    const cores = {
      azul: "#155eef", verde: "#18794e", vinho: "#8a244b", grafite: "#344054",
      roxo: "#7c3aed", marinho: "#1f4e8c", petroleo: "#0f766e", terracota: "#b85c38",
      dourado: "#a47a1f", "rosa-seco": "#a85576"
    };
    const cor = layout === "classico" ? "#111827" : (cores[curriculo.tema] || cores.azul);
    const contato = [curriculo.email, curriculo.telefone, curriculo.cidade].filter(Boolean).map(escapar).join(" • ");
    const links = [curriculo.linkedin, curriculo.github].filter(Boolean).map(escapar).join(" • ");
    const foto = curriculo.foto ? `<img class="foto" src="${escapar(curriculo.foto)}" alt="Foto">` : "";

    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${escapar(curriculo.tituloCurriculo || "Currículo")}</title><style>
      @page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#202939;background:#eef2f6}main{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:16mm}header{display:flex;gap:18px;align-items:center;border-bottom:3px solid ${cor};padding-bottom:15px;margin-bottom:18px}.foto{width:92px;height:92px;object-fit:cover;border-radius:${layout === "classico" ? "4px" : "50%"};border:3px solid ${cor}}h1{margin:0;color:${cor};font-size:28px}header p{margin:5px 0;color:#667085}h2{margin:18px 0 7px;color:${cor};font-size:15px;text-transform:uppercase;letter-spacing:.06em}p,li{font-size:12px;line-height:1.55}ul{margin:6px 0;padding-left:18px}.objetivo{padding:10px 12px;background:#f7f9fc;border-left:4px solid ${cor}}.compacto main,main.compacto{padding:12mm}.toolbar{position:fixed;top:14px;right:14px;background:#fff;border:1px solid #d0d5dd;border-radius:10px;padding:10px 12px;font-size:12px;box-shadow:0 4px 20px #0002}@media print{body{background:#fff}.toolbar{display:none}main{margin:0;width:auto;min-height:auto;padding:0}}
    </style></head><body><div class="toolbar">Na janela de impressão, escolha <strong>Salvar como PDF</strong>.</div><main class="${layout}"><header>${foto}<div><h1>${escapar(curriculo.nome || "Currículo")}</h1><p>${contato}</p><p>${links}</p></div></header>
      ${curriculo.objetivo ? `<section><h2>Objetivo</h2><p class="objetivo">${escapar(curriculo.objetivo)}</p></section>` : ""}
      ${curriculo.resumo ? `<section><h2>Resumo profissional</h2><p>${escapar(curriculo.resumo)}</p></section>` : ""}
      ${listaHtml("Formação", curriculo.formacoes, (i) => escapar([i.curso, i.instituicao, i.periodo].filter(Boolean).join(" — ")))}
      ${listaHtml("Experiências", curriculo.experiencias, (i) => escapar([i.cargo, i.empresa, i.periodo, i.descricao].filter(Boolean).join(" — ")))}
      ${listaHtml("Cursos", curriculo.cursos, (i) => escapar([i.nome, i.instituicao, i.ano].filter(Boolean).join(" — ")))}
      ${listaHtml("Habilidades", curriculo.habilidades, (i) => escapar(i.valor || ""))}
      ${listaHtml("Competências", curriculo.competencias, (i) => escapar(i.valor || ""))}
      ${listaHtml("Idiomas", curriculo.idiomas, (i) => escapar([i.idioma, i.nivel].filter(Boolean).join(" — ")))}
      ${listaHtml("Projetos", curriculo.projetos, (i) => escapar([i.nome, i.descricao].filter(Boolean).join(" — ")))}
    </main><script>setTimeout(()=>window.print(),450)<\/script></body></html>`;
  }

  function gerarPdfCurriculo(curriculo) {
    const popup = window.open("", "_blank");
    if (!popup) {
      alert("O navegador bloqueou a janela do currículo. Autorize pop-ups para este site e tente novamente.");
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

    const vagaTexto = Array.from(new Set((vagas || []).filter(Boolean)));
    const pVaga = document.createElement("p");
    pVaga.className = "professor-curriculo-vaga";
    pVaga.textContent = vagaTexto.length
      ? `Enviado para: ${vagaTexto.join(" • ")}`
      : "Ainda não enviado para nenhuma vaga.";
    info.appendChild(pVaga);

    const acoes = document.createElement("div");
    acoes.className = "professor-curriculo-acoes";
    const baixar = document.createElement("button");
    baixar.type = "button";
    baixar.className = "btn btn-primary";
    baixar.textContent = tipo === "pdf" ? "Baixar PDF enviado" : "Gerar / salvar PDF";
    if (tipo === "pdf") baixar.addEventListener("click", () => baixarPdfExterno(submissao, baixar));
    else baixar.addEventListener("click", () => gerarPdfCurriculo(dados));
    acoes.appendChild(baixar);

    item.append(info, acoes);
    return item;
  }

  async function carregarCurriculosAluno(alunoInfo, detalhes, botao) {
    if (detalhes.dataset.carregado === "true") return;
    detalhes.innerHTML = '<p class="professor-curriculos-loading">Carregando currículos deste aluno...</p>';

    const perfil = alunoInfo.perfil;
    if (!perfil?.uid) {
      detalhes.innerHTML = '<p class="professor-curriculos-vazio">Este aluno ainda não criou a conta online; por isso não há currículos vinculados na nuvem.</p>';
      detalhes.dataset.carregado = "true";
      return;
    }

    try {
      const snap = await api.db.collection("usuarios").doc(perfil.uid).collection("curriculos").get();
      const salvos = snap.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() || {}) }))
        .filter((item) => item.tipoDocumento !== "pdf_chunk");
      const envios = submissoes.filter((item) => item.alunoUid === perfil.uid && !ehVagaRemovida(item));
      const listaCurriculos = document.createElement("div");
      listaCurriculos.className = "professor-curriculos-lista";

      const idsSalvos = new Set();
      salvos
        .sort((a, b) => String(b.atualizadoEm || "").localeCompare(String(a.atualizadoEm || "")))
        .forEach((curriculo) => {
          idsSalvos.add(String(curriculo.id || curriculo.idDocumento || curriculo.id || ""));
          const relacionados = envios.filter((envio) => String(envio.curriculoId || "") === String(curriculo.id || curriculo.idDocumento || ""));
          listaCurriculos.appendChild(criarLinhaCurriculo({
            tipo: "site",
            titulo: curriculo.tituloCurriculo || curriculo.nome || "Currículo criado no site",
            detalhe: [curriculo.vagaAlvo ? `Objetivo: ${curriculo.vagaAlvo}` : "", formatarData(curriculo.atualizadoEm) ? `Atualizado em ${formatarData(curriculo.atualizadoEm)}` : ""].filter(Boolean).join(" • "),
            vagas: relacionados.map((item) => item.vagaTitulo || item.vagaId),
            dados: curriculo
          }));
        });

      envios.filter((item) => item.tipoCurriculo === "pdf_externo").forEach((envio) => {
        listaCurriculos.appendChild(criarLinhaCurriculo({
          tipo: "pdf",
          titulo: envio.arquivoNome || "Currículo externo.pdf",
          detalhe: formatarData(envio.atualizadoEm) ? `Enviado em ${formatarData(envio.atualizadoEm)}` : "Arquivo enviado pelo aluno",
          vagas: [envio.vagaTitulo || envio.vagaId],
          submissao: envio
        }));
      });

      envios
        .filter((item) => item.tipoCurriculo !== "pdf_externo" && item.curriculoSnapshot)
        .filter((item) => !salvos.some((c) => String(c.id || "") === String(item.curriculoId || "")))
        .forEach((envio) => {
          listaCurriculos.appendChild(criarLinhaCurriculo({
            tipo: "site",
            titulo: envio.curriculoSnapshot.tituloCurriculo || "Currículo enviado pelo site",
            detalhe: "Versão preservada no envio da vaga",
            vagas: [envio.vagaTitulo || envio.vagaId],
            dados: envio.curriculoSnapshot
          }));
        });

      detalhes.replaceChildren();
      if (!listaCurriculos.children.length) {
        detalhes.innerHTML = '<p class="professor-curriculos-vazio">Nenhum currículo foi encontrado para este aluno.</p>';
      } else {
        detalhes.appendChild(listaCurriculos);
      }
      detalhes.dataset.carregado = "true";
    } catch (erro) {
      console.error("Falha ao carregar currículos do aluno:", erro);
      detalhes.innerHTML = '<p class="professor-curriculos-vazio">Não foi possível carregar os currículos deste aluno.</p>';
      detalhes.dataset.carregado = "false";
      botao.textContent = "Tentar novamente";
    }
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
      criarCredencial("Senha", "6 últimos do RA + dígito", "A senha real não é armazenada em texto no sistema; somente o hash de validação é guardado.")
    );

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "btn btn-secondary professor-aluno-toggle";
    const enviosQtd = perfil ? submissoes.filter((item) => item.alunoUid === perfil.uid && !ehVagaRemovida(item)).length : 0;
    toggle.textContent = enviosQtd ? `Currículos / envios (${enviosQtd})` : "Ver currículos";
    toggle.setAttribute("aria-expanded", "false");

    const detalhes = document.createElement("div");
    detalhes.className = "professor-aluno-detalhes";
    detalhes.hidden = true;

    toggle.addEventListener("click", async () => {
      const abrir = detalhes.hidden;
      detalhes.hidden = !abrir;
      toggle.setAttribute("aria-expanded", String(abrir));
      if (abrir) {
        toggle.textContent = "Ocultar currículos";
        await carregarCurriculosAluno(alunoInfo, detalhes, toggle);
      } else {
        toggle.textContent = enviosQtd ? `Currículos / envios (${enviosQtd})` : "Ver currículos";
      }
    });

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

  async function carregarBase() {
    mostrarStatus("Carregando alunos e vínculos de currículo...");
    const [usuariosSnap, submissoesSnap] = await Promise.all([
      api.db.collection("usuarios").get(),
      api.db.collection("submissoes").get()
    ]);
    usuarios = usuariosSnap.docs.map((doc) => ({ uid: doc.id, ...(doc.data() || {}) }));
    submissoes = submissoesSnap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() || {}) }))
      .filter((item) => item.tipoDocumento !== "pdf_chunk" && !ehVagaRemovida(item));
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
