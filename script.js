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
    document.querySelector('input[name="layout"][value="classico"]').checked = true;
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
      layout: valorRadio("layout", "classico"),
      tema: valorRadio("tema", "azul"),
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
    document.querySelector("#curriculo-id").value = curriculo.id;
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

    const layout = document.querySelector(`input[name="layout"][value="${curriculo.layout || "classico"}"]`);
    const tema = document.querySelector(`input[name="tema"][value="${curriculo.tema || "azul"}"]`);
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

  function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto !== undefined && texto !== null) elemento.textContent = texto;
    return elemento;
  }

  function adicionarLinhaContato(container, texto) {
    if (!texto) return;
    container.appendChild(criarElemento("span", "resume-contact-item", texto));
  }

  function criarSecaoCurriculo(titulo, conteudo, classeExtra = "") {
    if (!conteudo || (Array.isArray(conteudo) && conteudo.length === 0)) return null;
    const secao = criarElemento("section", `resume-section ${classeExtra}`.trim());
    secao.appendChild(criarElemento("h2", "resume-section-title", titulo));
    if (Array.isArray(conteudo)) conteudo.forEach((item) => secao.appendChild(item));
    else secao.appendChild(conteudo);
    return secao;
  }

  function paragrafo(texto, classe = "") {
    if (!texto) return null;
    return criarElemento("p", classe, texto);
  }

  function itemLinha(titulo, subtitulo, periodo, descricao) {
    const item = criarElemento("div", "resume-entry");
    const topo = criarElemento("div", "resume-entry-head");
    const textos = criarElemento("div");
    if (titulo) textos.appendChild(criarElemento("h3", "", titulo));
    if (subtitulo) textos.appendChild(criarElemento("p", "resume-entry-sub", subtitulo));
    topo.appendChild(textos);
    if (periodo) topo.appendChild(criarElemento("span", "resume-period", periodo));
    item.appendChild(topo);
    if (descricao) item.appendChild(criarElemento("p", "resume-description", descricao));
    return item;
  }

  function listaTags(valores) {
    const listaTagsEl = criarElemento("div", "resume-tags");
    valores.filter(Boolean).forEach((valor) => listaTagsEl.appendChild(criarElemento("span", "resume-tag", valor)));
    return listaTagsEl;
  }

  function renderizarCurriculo(curriculo) {
    folha.innerHTML = "";
    folha.className = `resume-sheet layout-${curriculo.layout || "classico"} tema-${curriculo.tema || "azul"}`;

    const header = criarElemento("header", "resume-header");
    if (curriculo.foto) {
      const foto = document.createElement("img");
      foto.className = "resume-photo";
      foto.src = curriculo.foto;
      foto.alt = `Foto profissional de ${curriculo.nome || "candidato"}`;
      header.appendChild(foto);
    }

    const identidade = criarElemento("div", "resume-identity");
    identidade.appendChild(criarElemento("h1", "", curriculo.nome || "Nome do candidato"));
    if (curriculo.vagaAlvo) identidade.appendChild(criarElemento("p", "resume-role", curriculo.vagaAlvo));
    header.appendChild(identidade);

    const contatos = criarElemento("div", "resume-contacts");
    adicionarLinhaContato(contatos, curriculo.email);
    adicionarLinhaContato(contatos, curriculo.telefone);
    adicionarLinhaContato(contatos, curriculo.cidade);
    adicionarLinhaContato(contatos, curriculo.linkedin);
    adicionarLinhaContato(contatos, curriculo.github);
    header.appendChild(contatos);
    folha.appendChild(header);

    const principal = criarElemento("div", "resume-body");
    const main = criarElemento("main", "resume-main");
    const side = criarElemento("aside", "resume-side");

    const objetivo = criarSecaoCurriculo("Objetivo profissional", paragrafo(curriculo.objetivo, "resume-text"));
    const resumo = criarSecaoCurriculo("Resumo profissional", paragrafo(curriculo.resumo, "resume-text"));
    if (objetivo) main.appendChild(objetivo);
    if (resumo) main.appendChild(resumo);

    const experiencias = (curriculo.experiencias || []).map((item) => itemLinha(item.cargo, item.empresa, item.periodo, item.descricao));
    const secExperiencias = criarSecaoCurriculo("Experiência profissional", experiencias);
    if (secExperiencias) main.appendChild(secExperiencias);

    const formacoes = (curriculo.formacoes || []).map((item) => itemLinha(item.curso, item.instituicao, item.periodo));
    const secFormacoes = criarSecaoCurriculo("Formação acadêmica", formacoes);
    if (secFormacoes) main.appendChild(secFormacoes);

    const projetos = (curriculo.projetos || []).map((item) => itemLinha(item.nome, "", "", item.descricao));
    const secProjetos = criarSecaoCurriculo("Projetos e atividades", projetos);
    if (secProjetos) main.appendChild(secProjetos);

    const habilidades = (curriculo.habilidades || []).map((item) => item.valor).filter(Boolean);
    const competencias = (curriculo.competencias || []).map((item) => item.valor).filter(Boolean);
    const cursos = (curriculo.cursos || []).map((item) => {
      const partes = [item.instituicao, item.ano].filter(Boolean).join(" • ");
      return itemLinha(item.nome, partes, "");
    });
    const idiomas = (curriculo.idiomas || []).map((item) => itemLinha(item.idioma, item.nivel, ""));

    if (habilidades.length) side.appendChild(criarSecaoCurriculo("Habilidades", listaTags(habilidades)));
    if (competencias.length) side.appendChild(criarSecaoCurriculo("Competências", listaTags(competencias)));
    if (cursos.length) side.appendChild(criarSecaoCurriculo("Cursos e certificações", cursos));
    if (idiomas.length) side.appendChild(criarSecaoCurriculo("Idiomas", idiomas));

    principal.appendChild(main);
    if (side.children.length) principal.appendChild(side);
    folha.appendChild(principal);
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
      .sort((a, b) => (b.atualizadoEm || "").localeCompare(a.atualizadoEm || ""))
      .forEach((curriculo) => {
        const card = document.createElement("article");
        card.className = "saved-card";

        const topo = document.createElement("div");
        const meta = criarElemento("div", "saved-meta");
        const badge = criarElemento("span", "badge gray", curriculo.vagaAlvo || "Currículo geral");
        const estilo = criarElemento("span", "style-label", `${curriculo.layout || "classico"} • ${curriculo.tema || "azul"}`);
        meta.append(badge, estilo);
        const titulo = criarElemento("h3", "", curriculo.tituloCurriculo || "Currículo sem título");
        const nome = criarElemento("p", "", curriculo.nome || "Nome ainda não preenchido");
        topo.append(meta, titulo, nome);

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
      // Ignora dados antigos inválidos.
    }
  }

  renderizarLista();
});