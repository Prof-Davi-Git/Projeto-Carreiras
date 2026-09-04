document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#curriculo-form");
  if (!form) return;

  const STORAGE_KEY = "curriculosProfissionais";
  const editor = document.querySelector("#editor-curriculo");
  const lista = document.querySelector("#lista-curriculos");
  const vazio = document.querySelector("#sem-curriculos");
  const contador = document.querySelector("#contador-curriculos");
  const aviso = document.querySelector("#aviso-salvo");
  const tituloEditor = document.querySelector("#titulo-editor");
  const modalPreview = document.querySelector("#curriculo-preview-modal");
  const folha = document.querySelector("#curriculo-folha");
  const fotoInput = document.querySelector("#foto-arquivo");
  const fotoPreview = document.querySelector("#foto-preview");
  const fotoPlaceholder = document.querySelector("#foto-placeholder");
  let fotoAtual = "";

  const repeaters = {
    formacoes: [
      { key: "curso", label: "Curso / formação", placeholder: "Ex.: Técnico em Desenvolvimento de Sistemas" },
      { key: "instituicao", label: "Instituição", placeholder: "Nome da instituição" },
      { key: "periodo", label: "Período", placeholder: "Ex.: 2025 - 2026" }
    ],
    experiencias: [
      { key: "cargo", label: "Cargo / função", placeholder: "Ex.: Estagiário de TI" },
      { key: "empresa", label: "Empresa / local", placeholder: "Nome da empresa" },
      { key: "periodo", label: "Período", placeholder: "Ex.: Fev/2026 - atual" },
      { key: "descricao", label: "Principais atividades", placeholder: "Descreva brevemente o que você fazia.", textarea: true, full: true }
    ],
    cursos: [
      { key: "nome", label: "Curso / certificação", placeholder: "Ex.: Excel Básico" },
      { key: "instituicao", label: "Instituição", placeholder: "Ex.: SENAI" },
      { key: "ano", label: "Ano / carga horária", placeholder: "Ex.: 2026 - 20h" }
    ],
    habilidades: [
      { key: "valor", label: "Habilidade técnica", placeholder: "Ex.: HTML, Excel, manutenção de computadores" }
    ],
    competencias: [
      { key: "valor", label: "Competência profissional", placeholder: "Ex.: comunicação, organização, trabalho em equipe" }
    ],
    idiomas: [
      { key: "idioma", label: "Idioma", placeholder: "Ex.: Inglês" },
      { key: "nivel", label: "Nível", placeholder: "Ex.: Básico, intermediário, avançado" }
    ],
    projetos: [
      { key: "nome", label: "Nome do projeto / atividade", placeholder: "Ex.: Site de vendas desenvolvido no curso" },
      { key: "descricao", label: "Descrição", placeholder: "Explique o que você fez e o que aprendeu.", textarea: true, full: true }
    ]
  };

  function lerCurriculos() {
    try {
      const dados = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(dados) ? dados : [];
    } catch (erro) {
      return [];
    }
  }

  function salvarCurriculos(curriculos) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(curriculos));
  }

  function gerarId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function normalizarLayout(valor, padrao = "classico") {
    return ["moderno", "compacto", "classico"].includes(valor) ? valor : padrao;
  }

  function normalizarTema(valor) {
    return ["azul", "verde", "vinho", "grafite"].includes(valor) ? valor : "azul";
  }

  function nomeModelo(layout) {
    const nomes = {
      moderno: "Moderno Lateral",
      compacto: "Profissional Visual",
      classico: "Clássico Executivo"
    };
    return nomes[normalizarLayout(layout)] || nomes.classico;
  }

  function definirFoto(dataUrl = "") {
    fotoAtual = dataUrl || "";
    if (fotoAtual) {
      fotoPreview.src = fotoAtual;
      fotoPreview.classList.add("show");
      fotoPlaceholder.classList.add("hidden");
    } else {
      fotoPreview.removeAttribute("src");
      fotoPreview.classList.remove("show");
      fotoPlaceholder.classList.remove("hidden");
    }
  }

  function limparEditor() {
    form.reset();
    document.querySelector("#curriculo-id").value = "";
    Object.keys(repeaters).forEach((secao) => {
      document.querySelector(`#${secao}`).innerHTML = "";
    });
    definirFoto("");
    document.querySelector('input[name="layout"][value="moderno"]').checked = true;
    document.querySelector('input[name="tema"][value="azul"]').checked = true;
    tituloEditor.textContent = "Novo currículo";
  }

  function criarCampo(campo, valor = "") {
    const grupo = document.createElement("div");
    grupo.className = `form-group${campo.full ? " full" : ""}`;

    const label = document.createElement("label");
    label.textContent = campo.label;
    grupo.appendChild(label);

    const input = campo.textarea ? document.createElement("textarea") : document.createElement("input");
    input.dataset.key = campo.key;
    input.placeholder = campo.placeholder || "";
    input.value = valor || "";
    grupo.appendChild(input);
    return grupo;
  }

  function adicionarItem(secao, dados = {}) {
    const container = document.querySelector(`#${secao}`);
    const item = document.createElement("div");
    item.className = "repeat-item";
    item.dataset.section = secao;

    const grid = document.createElement("div");
    grid.className = "form-grid repeat-grid";

    repeaters[secao].forEach((campo) => {
      grid.appendChild(criarCampo(campo, dados[campo.key] || ""));
    });

    const remover = document.createElement("button");
    remover.type = "button";
    remover.className = "remove-item";
    remover.textContent = "Remover";
    remover.addEventListener("click", () => item.remove());

    item.appendChild(grid);
    item.appendChild(remover);
    container.appendChild(item);
  }

  function coletarSecao(secao) {
    return [...document.querySelectorAll(`#${secao} .repeat-item`)]
      .map((item) => {
        const objeto = {};
        item.querySelectorAll("[data-key]").forEach((campo) => {
          objeto[campo.dataset.key] = campo.value.trim();
        });
        return objeto;
      })
      .filter((objeto) => Object.values(objeto).some(Boolean));
  }

  function valorRadio(nome, padrao) {
    return document.querySelector(`input[name="${nome}"]:checked`)?.value || padrao;
  }

  function coletarCurriculo(id = null) {
    return {
      id: id || document.querySelector("#curriculo-id").value || gerarId(),
      tituloCurriculo: document.querySelector("#tituloCurriculo").value.trim(),
      vagaAlvo: document.querySelector("#vagaAlvo").value.trim(),
      layout: normalizarLayout(valorRadio("layout", "moderno"), "moderno"),
      tema: normalizarTema(valorRadio("tema", "azul")),
      foto: fotoAtual,
      nome: document.querySelector("#nome").value.trim(),
      email: document.querySelector("#email").value.trim(),
      telefone: document.querySelector("#telefone").value.trim(),
      cidade: document.querySelector("#cidade").value.trim(),
      linkedin: document.querySelector("#linkedin").value.trim(),
      github: document.querySelector("#github").value.trim(),
      objetivo: document.querySelector("#objetivo").value.trim(),
      resumo: document.querySelector("#resumo").value.trim(),
      formacoes: coletarSecao("formacoes"),
      experiencias: coletarSecao("experiencias"),
      cursos: coletarSecao("cursos"),
      habilidades: coletarSecao("habilidades"),
      competencias: coletarSecao("competencias"),
      idiomas: coletarSecao("idiomas"),
      projetos: coletarSecao("projetos"),
      atualizadoEm: new Date().toISOString()
    };
  }

  function persistirCurriculo(curriculo) {
    const curriculos = lerCurriculos();
    const indice = curriculos.findIndex((item) => item.id === curriculo.id);
    if (indice >= 0) curriculos[indice] = curriculo;
    else curriculos.push(curriculo);
    salvarCurriculos(curriculos);
    return curriculo;
  }

  function abrirNovo() {
    limparEditor();
    editor.classList.remove("hidden");
    adicionarItem("formacoes");
    adicionarItem("habilidades");
    adicionarItem("competencias");
    editor.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function preencherEditor(curriculo) {
    limparEditor();
    document.querySelector("#curriculo-id").value = curriculo.id || gerarId();
    document.querySelector("#tituloCurriculo").value = curriculo.tituloCurriculo || "";
    document.querySelector("#vagaAlvo").value = curriculo.vagaAlvo || "";
    document.querySelector("#nome").value = curriculo.nome || "";
    document.querySelector("#email").value = curriculo.email || "";
    document.querySelector("#telefone").value = curriculo.telefone || "";
    document.querySelector("#cidade").value = curriculo.cidade || "";
    document.querySelector("#linkedin").value = curriculo.linkedin || "";
    document.querySelector("#github").value = curriculo.github || "";
    document.querySelector("#objetivo").value = curriculo.objetivo || "";
    document.querySelector("#resumo").value = curriculo.resumo || "";

    const layoutValue = normalizarLayout(curriculo.layout, "classico");
    const temaValue = normalizarTema(curriculo.tema);
    const layout = document.querySelector(`input[name="layout"][value="${layoutValue}"]`);
    const tema = document.querySelector(`input[name="tema"][value="${temaValue}"]`);
    if (layout) layout.checked = true;
    if (tema) tema.checked = true;
    definirFoto(curriculo.foto || "");

    Object.keys(repeaters).forEach((secao) => {
      const itens = Array.isArray(curriculo[secao]) ? curriculo[secao] : [];
      itens.forEach((item) => adicionarItem(secao, item));
    });

    tituloEditor.textContent = `Editando: ${curriculo.tituloCurriculo || "Currículo"}`;
    editor.classList.remove("hidden");
    editor.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function criarElemento(tag, classe = "", texto = null) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto !== null && texto !== undefined) elemento.textContent = texto;
    return elemento;
  }

  function iniciais(nome) {
    const partes = String(nome || "CV").trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return "CV";
    return partes.slice(0, 2).map((parte) => parte[0]).join("").toUpperCase();
  }

  function criarAvatar(curriculo, classe = "resume-avatar") {
    const wrap = criarElemento("div", classe);
    if (curriculo.foto) {
      const foto = document.createElement("img");
      foto.src = curriculo.foto;
      foto.alt = `Foto profissional de ${curriculo.nome || "candidato"}`;
      wrap.appendChild(foto);
    } else {
      wrap.appendChild(criarElemento("span", "resume-avatar-fallback", iniciais(curriculo.nome)));
    }
    return wrap;
  }

  function itemLinha(titulo, subtitulo, periodo, descricao, classe = "") {
    const item = criarElemento("div", `resume-entry ${classe}`.trim());
    const topo = criarElemento("div", "resume-entry-head");
    const textos = criarElemento("div", "resume-entry-copy");
    if (titulo) textos.appendChild(criarElemento("h3", "", titulo));
    if (subtitulo) textos.appendChild(criarElemento("p", "resume-entry-sub", subtitulo));
    topo.appendChild(textos);
    if (periodo) topo.appendChild(criarElemento("span", "resume-period", periodo));
    item.appendChild(topo);
    if (descricao) item.appendChild(criarElemento("p", "resume-description", descricao));
    return item;
  }

  function listaTags(valores, classe = "") {
    const listaTagsEl = criarElemento("div", `resume-tags ${classe}`.trim());
    valores.filter(Boolean).forEach((valor) => listaTagsEl.appendChild(criarElemento("span", "resume-tag", valor)));
    return listaTagsEl;
  }

  function secaoGenerica(titulo, conteudo, classe = "") {
    if (!conteudo || (Array.isArray(conteudo) && conteudo.length === 0)) return null;
    const secao = criarElemento("section", `resume-section ${classe}`.trim());
    secao.appendChild(criarElemento("h2", "resume-section-title", titulo));
    if (Array.isArray(conteudo)) conteudo.forEach((item) => secao.appendChild(item));
    else secao.appendChild(conteudo);
    return secao;
  }

  function textoParagrafo(texto, classe = "resume-text") {
    return texto ? criarElemento("p", classe, texto) : null;
  }

  function contatosDo(curriculo) {
    return [
      ["E-mail", curriculo.email],
      ["Telefone", curriculo.telefone],
      ["Local", curriculo.cidade],
      ["LinkedIn", curriculo.linkedin],
      ["GitHub / Portfólio", curriculo.github]
    ].filter(([, valor]) => valor);
  }

  function habilidadesDo(curriculo) {
    return (curriculo.habilidades || []).map((item) => item.valor).filter(Boolean);
  }

  function competenciasDo(curriculo) {
    return (curriculo.competencias || []).map((item) => item.valor).filter(Boolean);
  }

  function renderModerno(curriculo) {
    folha.className = `resume-sheet layout-moderno tema-${normalizarTema(curriculo.tema)}`;
    const shell = criarElemento("div", "modern-shell");
    const side = criarElemento("aside", "modern-sidebar");
    const main = criarElemento("main", "modern-main");

    side.appendChild(criarAvatar(curriculo, "modern-avatar"));

    const contatos = contatosDo(curriculo);
    if (contatos.length) {
      const sec = criarElemento("section", "modern-side-section");
      sec.appendChild(criarElemento("h2", "", "Contato"));
      contatos.forEach(([rotulo, valor]) => {
        const item = criarElemento("div", "modern-contact");
        item.appendChild(criarElemento("strong", "", rotulo));
        item.appendChild(criarElemento("span", "", valor));
        sec.appendChild(item);
      });
      side.appendChild(sec);
    }

    const habilidades = habilidadesDo(curriculo);
    if (habilidades.length) {
      const sec = criarElemento("section", "modern-side-section");
      sec.appendChild(criarElemento("h2", "", "Habilidades"));
      sec.appendChild(listaTags(habilidades, "modern-tags"));
      side.appendChild(sec);
    }

    const competencias = competenciasDo(curriculo);
    if (competencias.length) {
      const sec = criarElemento("section", "modern-side-section");
      sec.appendChild(criarElemento("h2", "", "Competências"));
      const ul = criarElemento("ul", "modern-list");
      competencias.forEach((valor) => ul.appendChild(criarElemento("li", "", valor)));
      sec.appendChild(ul);
      side.appendChild(sec);
    }

    const idiomas = (curriculo.idiomas || []).filter((item) => item.idioma || item.nivel);
    if (idiomas.length) {
      const sec = criarElemento("section", "modern-side-section");
      sec.appendChild(criarElemento("h2", "", "Idiomas"));
      idiomas.forEach((item) => {
        const linha = criarElemento("div", "modern-language");
        linha.appendChild(criarElemento("strong", "", item.idioma || "Idioma"));
        if (item.nivel) linha.appendChild(criarElemento("span", "", item.nivel));
        sec.appendChild(linha);
      });
      side.appendChild(sec);
    }

    const cursos = (curriculo.cursos || []).filter((item) => item.nome || item.instituicao || item.ano);
    if (cursos.length) {
      const sec = criarElemento("section", "modern-side-section");
      sec.appendChild(criarElemento("h2", "", "Cursos"));
      cursos.forEach((item) => {
        const bloco = criarElemento("div", "modern-course");
        if (item.nome) bloco.appendChild(criarElemento("strong", "", item.nome));
        const detalhe = [item.instituicao, item.ano].filter(Boolean).join(" • ");
        if (detalhe) bloco.appendChild(criarElemento("span", "", detalhe));
        sec.appendChild(bloco);
      });
      side.appendChild(sec);
    }

    const head = criarElemento("header", "modern-main-header");
    head.appendChild(criarElemento("h1", "", curriculo.nome || "Nome do candidato"));
    if (curriculo.vagaAlvo) head.appendChild(criarElemento("p", "modern-role", curriculo.vagaAlvo));
    main.appendChild(head);

    if (curriculo.resumo) main.appendChild(secaoGenerica("Sobre mim", textoParagrafo(curriculo.resumo), "modern-section"));
    if (curriculo.objetivo) main.appendChild(secaoGenerica("Objetivo profissional", textoParagrafo(curriculo.objetivo), "modern-section"));

    const experiencias = (curriculo.experiencias || [])
      .filter((item) => Object.values(item).some(Boolean))
      .map((item) => itemLinha(item.cargo, item.empresa, item.periodo, item.descricao, "modern-card-entry"));
    if (experiencias.length) main.appendChild(secaoGenerica("Experiência", experiencias, "modern-section"));

    const formacoes = (curriculo.formacoes || [])
      .filter((item) => Object.values(item).some(Boolean))
      .map((item) => itemLinha(item.curso, item.instituicao, item.periodo, "", "modern-card-entry"));
    if (formacoes.length) main.appendChild(secaoGenerica("Formação", formacoes, "modern-section"));

    const projetos = (curriculo.projetos || [])
      .filter((item) => Object.values(item).some(Boolean))
      .map((item) => itemLinha(item.nome, "", "", item.descricao, "modern-project-entry"));
    if (projetos.length) main.appendChild(secaoGenerica("Projetos", projetos, "modern-section"));

    shell.append(side, main);
    folha.appendChild(shell);
  }

  function cardSection(titulo, classe = "") {
    const sec = criarElemento("section", `visual-card ${classe}`.trim());
    sec.appendChild(criarElemento("h2", "visual-card-title", titulo));
    return sec;
  }

  function renderVisual(curriculo) {
    folha.className = `resume-sheet layout-compacto tema-${normalizarTema(curriculo.tema)}`;

    const header = criarElemento("header", "visual-header-card");
    header.appendChild(criarAvatar(curriculo, "visual-avatar"));
    const identidade = criarElemento("div", "visual-identity");
    identidade.appendChild(criarElemento("h1", "", curriculo.nome || "Nome do candidato"));
    if (curriculo.vagaAlvo) identidade.appendChild(criarElemento("p", "visual-role", curriculo.vagaAlvo));
    const contatos = criarElemento("div", "visual-contacts");
    contatosDo(curriculo).forEach(([rotulo, valor]) => {
      const item = criarElemento("span", "visual-contact-item");
      item.appendChild(criarElemento("strong", "", `${rotulo}: `));
      item.appendChild(document.createTextNode(valor));
      contatos.appendChild(item);
    });
    identidade.appendChild(contatos);
    header.appendChild(identidade);
    folha.appendChild(header);

    const top = criarElemento("div", "visual-top-grid");
    const perfil = cardSection("Perfil", "visual-profile");
    if (curriculo.resumo) perfil.appendChild(textoParagrafo(curriculo.resumo, "visual-text"));
    if (curriculo.objetivo) {
      perfil.appendChild(criarElemento("h3", "visual-mini-title", "Objetivo"));
      perfil.appendChild(textoParagrafo(curriculo.objetivo, "visual-text"));
    }
    if (perfil.children.length > 1) top.appendChild(perfil);

    const skills = cardSection("Habilidades", "visual-skills");
    const habilidades = habilidadesDo(curriculo);
    const competencias = competenciasDo(curriculo);
    if (habilidades.length) skills.appendChild(listaTags(habilidades, "visual-tag-list"));
    if (competencias.length) {
      skills.appendChild(criarElemento("h3", "visual-mini-title", "Competências"));
      skills.appendChild(listaTags(competencias, "visual-tag-list"));
    }
    if (skills.children.length > 1) top.appendChild(skills);
    if (top.children.length) folha.appendChild(top);

    const experiencias = (curriculo.experiencias || []).filter((item) => Object.values(item).some(Boolean));
    if (experiencias.length) {
      const sec = cardSection("Experiência", "visual-wide");
      const timeline = criarElemento("div", "visual-timeline");
      experiencias.forEach((item) => timeline.appendChild(itemLinha(item.cargo, item.empresa, item.periodo, item.descricao, "visual-timeline-entry")));
      sec.appendChild(timeline);
      folha.appendChild(sec);
    }

    const trio = criarElemento("div", "visual-bottom-grid");

    const formacoes = (curriculo.formacoes || []).filter((item) => Object.values(item).some(Boolean));
    if (formacoes.length) {
      const sec = cardSection("Formação");
      formacoes.forEach((item) => sec.appendChild(itemLinha(item.curso, item.instituicao, item.periodo, "", "visual-small-entry")));
      trio.appendChild(sec);
    }

    const cursos = (curriculo.cursos || []).filter((item) => Object.values(item).some(Boolean));
    if (cursos.length) {
      const sec = cardSection("Cursos");
      cursos.forEach((item) => {
        const detalhe = [item.instituicao, item.ano].filter(Boolean).join(" • ");
        sec.appendChild(itemLinha(item.nome, detalhe, "", "", "visual-small-entry"));
      });
      trio.appendChild(sec);
    }

    const idiomas = (curriculo.idiomas || []).filter((item) => item.idioma || item.nivel);
    if (idiomas.length) {
      const sec = cardSection("Idiomas");
      idiomas.forEach((item) => sec.appendChild(itemLinha(item.idioma, item.nivel, "", "", "visual-small-entry")));
      trio.appendChild(sec);
    }

    if (trio.children.length) folha.appendChild(trio);

    const projetos = (curriculo.projetos || []).filter((item) => Object.values(item).some(Boolean));
    if (projetos.length) {
      const sec = cardSection("Projetos", "visual-wide");
      const grid = criarElemento("div", "visual-project-grid");
      projetos.forEach((item) => grid.appendChild(itemLinha(item.nome, "", "", item.descricao, "visual-project-card")));
      sec.appendChild(grid);
      folha.appendChild(sec);
    }
  }

  function classicSection(titulo, classe = "") {
    const sec = criarElemento("section", `classic-section ${classe}`.trim());
    sec.appendChild(criarElemento("h2", "", titulo));
    return sec;
  }

  function renderClassico(curriculo) {
    folha.className = "resume-sheet layout-classico";

    const header = criarElemento("header", "classic-header");
    if (curriculo.foto) header.appendChild(criarAvatar(curriculo, "classic-avatar"));
    header.appendChild(criarElemento("h1", "", curriculo.nome || "Nome do candidato"));
    if (curriculo.vagaAlvo) header.appendChild(criarElemento("p", "classic-role", curriculo.vagaAlvo));

    const contatos = criarElemento("div", "classic-contacts");
    contatosDo(curriculo).forEach(([, valor]) => contatos.appendChild(criarElemento("span", "", valor)));
    if (contatos.children.length) header.appendChild(contatos);
    folha.appendChild(header);

    if (curriculo.objetivo) {
      const sec = classicSection("Objetivo profissional");
      sec.appendChild(textoParagrafo(curriculo.objetivo, "classic-text"));
      folha.appendChild(sec);
    }

    if (curriculo.resumo) {
      const sec = classicSection("Resumo profissional");
      sec.appendChild(textoParagrafo(curriculo.resumo, "classic-text"));
      folha.appendChild(sec);
    }

    const experiencias = (curriculo.experiencias || []).filter((item) => Object.values(item).some(Boolean));
    if (experiencias.length) {
      const sec = classicSection("Experiência profissional");
      experiencias.forEach((item) => sec.appendChild(itemLinha(item.cargo, item.empresa, item.periodo, item.descricao, "classic-entry")));
      folha.appendChild(sec);
    }

    const formacoes = (curriculo.formacoes || []).filter((item) => Object.values(item).some(Boolean));
    if (formacoes.length) {
      const sec = classicSection("Formação acadêmica");
      formacoes.forEach((item) => sec.appendChild(itemLinha(item.curso, item.instituicao, item.periodo, "", "classic-entry")));
      folha.appendChild(sec);
    }

    const cursos = (curriculo.cursos || []).filter((item) => Object.values(item).some(Boolean));
    if (cursos.length) {
      const sec = classicSection("Cursos e certificações");
      const ul = criarElemento("ul", "classic-list");
      cursos.forEach((item) => ul.appendChild(criarElemento("li", "", [item.nome, item.instituicao, item.ano].filter(Boolean).join(" — "))));
      sec.appendChild(ul);
      folha.appendChild(sec);
    }

    const habilidades = habilidadesDo(curriculo);
    if (habilidades.length) {
      const sec = classicSection("Habilidades");
      sec.appendChild(criarElemento("p", "classic-inline-list", habilidades.join("  |  ")));
      folha.appendChild(sec);
    }

    const competencias = competenciasDo(curriculo);
    if (competencias.length) {
      const sec = classicSection("Competências");
      sec.appendChild(criarElemento("p", "classic-inline-list", competencias.join("  |  ")));
      folha.appendChild(sec);
    }

    const idiomas = (curriculo.idiomas || []).filter((item) => item.idioma || item.nivel);
    if (idiomas.length) {
      const sec = classicSection("Idiomas");
      sec.appendChild(criarElemento("p", "classic-inline-list", idiomas.map((item) => [item.idioma, item.nivel].filter(Boolean).join(" — ")).join("  |  ")));
      folha.appendChild(sec);
    }

    const projetos = (curriculo.projetos || []).filter((item) => Object.values(item).some(Boolean));
    if (projetos.length) {
      const sec = classicSection("Projetos e atividades");
      projetos.forEach((item) => sec.appendChild(itemLinha(item.nome, "", "", item.descricao, "classic-entry")));
      folha.appendChild(sec);
    }
  }

  function renderizarCurriculo(curriculo) {
    folha.innerHTML = "";
    const layout = normalizarLayout(curriculo.layout, "classico");
    if (layout === "moderno") renderModerno(curriculo);
    else if (layout === "compacto") renderVisual(curriculo);
    else renderClassico(curriculo);
  }

  function abrirPreview(curriculo) {
    renderizarCurriculo(curriculo);
    modalPreview.classList.remove("hidden");
    document.body.classList.add("preview-open");
    modalPreview.scrollTop = 0;
  }

  function fecharPreview() {
    modalPreview.classList.add("hidden");
    document.body.classList.remove("preview-open");
  }

  function renderizarLista() {
    const curriculos = lerCurriculos();
    lista.innerHTML = "";
    contador.textContent = `${curriculos.length} ${curriculos.length === 1 ? "currículo" : "currículos"}`;
    vazio.classList.toggle("hidden", curriculos.length > 0);

    curriculos
      .slice()
      .sort((a, b) => String(b.atualizadoEm || "").localeCompare(String(a.atualizadoEm || "")))
      .forEach((curriculo) => {
        const card = criarElemento("article", "saved-card");
        const topo = criarElemento("div");
        const meta = criarElemento("div", "saved-meta");
        meta.appendChild(criarElemento("span", "badge gray", curriculo.vagaAlvo || "Currículo geral"));
        meta.appendChild(criarElemento("span", "style-label", nomeModelo(curriculo.layout)));
        topo.appendChild(meta);
        topo.appendChild(criarElemento("h3", "", curriculo.tituloCurriculo || "Currículo sem título"));
        topo.appendChild(criarElemento("p", "", curriculo.nome || "Nome ainda não preenchido"));

        const acoes = criarElemento("div", "saved-actions");

        const visualizar = criarElemento("button", "btn btn-primary btn-small", "Visualizar");
        visualizar.type = "button";
        visualizar.addEventListener("click", () => abrirPreview(curriculo));

        const editar = criarElemento("button", "btn btn-secondary btn-small", "Editar");
        editar.type = "button";
        editar.addEventListener("click", () => preencherEditor(curriculo));

        const duplicar = criarElemento("button", "btn btn-secondary btn-small", "Duplicar");
        duplicar.type = "button";
        duplicar.addEventListener("click", () => {
          const todos = lerCurriculos();
          const copia = {
            ...curriculo,
            id: gerarId(),
            tituloCurriculo: `${curriculo.tituloCurriculo || "Currículo"} - cópia`,
            vagaAlvo: "",
            atualizadoEm: new Date().toISOString()
          };
          todos.push(copia);
          salvarCurriculos(todos);
          renderizarLista();
          preencherEditor(copia);
        });

        const excluir = criarElemento("button", "btn btn-danger btn-small", "Excluir");
        excluir.type = "button";
        excluir.addEventListener("click", () => {
          if (!confirm(`Excluir o currículo "${curriculo.tituloCurriculo || "sem título"}"?`)) return;
          salvarCurriculos(lerCurriculos().filter((item) => item.id !== curriculo.id));
          if (document.querySelector("#curriculo-id").value === curriculo.id) {
            editor.classList.add("hidden");
            limparEditor();
          }
          renderizarLista();
        });

        acoes.append(visualizar, editar, duplicar, excluir);
        card.append(topo, acoes);
        lista.appendChild(card);
      });
  }

  function redimensionarFoto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const limite = 600;
          const proporcao = Math.min(1, limite / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * proporcao);
          canvas.height = Math.round(img.height * proporcao);
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  document.querySelectorAll(".add-item").forEach((botao) => {
    botao.addEventListener("click", () => adicionarItem(botao.dataset.section));
  });

  document.querySelector("#novo-curriculo").addEventListener("click", abrirNovo);
  document.querySelector("#cancelar-edicao").addEventListener("click", () => {
    editor.classList.add("hidden");
    limparEditor();
  });

  fotoInput.addEventListener("change", async () => {
    const file = fotoInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Selecione um arquivo de imagem.");
      return;
    }
    try {
      definirFoto(await redimensionarFoto(file));
    } catch (erro) {
      alert("Não foi possível carregar esta foto. Tente outra imagem.");
    }
  });

  document.querySelector("#remover-foto").addEventListener("click", () => {
    fotoInput.value = "";
    definirFoto("");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const curriculo = persistirCurriculo(coletarCurriculo());
    document.querySelector("#curriculo-id").value = curriculo.id;
    tituloEditor.textContent = `Editando: ${curriculo.tituloCurriculo}`;
    aviso.classList.add("show");
    setTimeout(() => aviso.classList.remove("show"), 2500);
    renderizarLista();
  });

  document.querySelector("#salvar-visualizar").addEventListener("click", () => {
    if (!form.reportValidity()) return;
    const curriculo = persistirCurriculo(coletarCurriculo());
    document.querySelector("#curriculo-id").value = curriculo.id;
    tituloEditor.textContent = `Editando: ${curriculo.tituloCurriculo}`;
    renderizarLista();
    abrirPreview(curriculo);
  });

  document.querySelector("#fechar-preview").addEventListener("click", fecharPreview);
  document.querySelector("#imprimir-curriculo").addEventListener("click", () => window.print());

  modalPreview.addEventListener("click", (event) => {
    if (event.target === modalPreview) fecharPreview();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modalPreview.classList.contains("hidden")) fecharPreview();
  });

  const antigoPerfil = localStorage.getItem("perfilProfissional");
  if (antigoPerfil && lerCurriculos().length === 0) {
    try {
      const perfil = JSON.parse(antigoPerfil);
      const competencias = String(perfil.competencias || "")
        .split(/,|\n/)
        .map((valor) => valor.trim())
        .filter(Boolean)
        .map((valor) => ({ valor }));

      salvarCurriculos([{
        id: gerarId(),
        tituloCurriculo: "Meu primeiro currículo",
        vagaAlvo: perfil.area || "",
        layout: "classico",
        tema: "azul",
        foto: "",
        nome: perfil.nome || "",
        email: "",
        telefone: "",
        cidade: "",
        linkedin: "",
        github: "",
        objetivo: perfil.objetivo || "",
        resumo: "",
        formacoes: [],
        experiencias: [],
        cursos: [],
        habilidades: [],
        competencias,
        idiomas: [],
        projetos: [],
        atualizadoEm: new Date().toISOString()
      }]);
    } catch (erro) {
      // Dado antigo inválido: mantém o site funcionando sem migrar.
    }
  }

  renderizarLista();
});