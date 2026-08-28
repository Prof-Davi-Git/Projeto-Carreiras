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

  const camposSimples = [
    "curriculo-id", "tituloCurriculo", "vagaAlvo", "nome", "email", "telefone",
    "cidade", "linkedin", "github", "objetivo", "resumo"
  ];

  function lerCurriculos() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
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

  function limparEditor() {
    form.reset();
    document.querySelector("#curriculo-id").value = "";
    Object.keys(repeaters).forEach((secao) => {
      document.querySelector(`#${secao}`).innerHTML = "";
    });
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

    Object.keys(repeaters).forEach((secao) => {
      const itens = curriculo[secao] || [];
      itens.forEach((item) => adicionarItem(secao, item));
    });

    tituloEditor.textContent = `Editando: ${curriculo.tituloCurriculo || "Currículo"}`;
    editor.classList.remove("hidden");
    editor.scrollIntoView({ behavior: "smooth", block: "start" });
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
        const badge = document.createElement("span");
        badge.className = "badge gray";
        badge.textContent = curriculo.vagaAlvo || "Currículo geral";
        const titulo = document.createElement("h3");
        titulo.textContent = curriculo.tituloCurriculo || "Currículo sem título";
        const nome = document.createElement("p");
        nome.textContent = curriculo.nome || "Nome ainda não preenchido";
        topo.append(badge, titulo, nome);

        const acoes = document.createElement("div");
        acoes.className = "saved-actions";

        const editar = document.createElement("button");
        editar.type = "button";
        editar.className = "btn btn-primary btn-small";
        editar.textContent = "Editar";
        editar.addEventListener("click", () => preencherEditor(curriculo));

        const duplicar = document.createElement("button");
        duplicar.type = "button";
        duplicar.className = "btn btn-secondary btn-small";
        duplicar.textContent = "Duplicar";
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

        const excluir = document.createElement("button");
        excluir.type = "button";
        excluir.className = "btn btn-danger btn-small";
        excluir.textContent = "Excluir";
        excluir.addEventListener("click", () => {
          if (!confirm(`Excluir o currículo "${curriculo.tituloCurriculo || "sem título"}"?`)) return;
          salvarCurriculos(lerCurriculos().filter((item) => item.id !== curriculo.id));
          if (document.querySelector("#curriculo-id").value === curriculo.id) {
            editor.classList.add("hidden");
            limparEditor();
          }
          renderizarLista();
        });

        acoes.append(editar, duplicar, excluir);
        card.append(topo, acoes);
        lista.appendChild(card);
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

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const idAtual = document.querySelector("#curriculo-id").value || gerarId();
    const curriculo = {
      id: idAtual,
      tituloCurriculo: document.querySelector("#tituloCurriculo").value.trim(),
      vagaAlvo: document.querySelector("#vagaAlvo").value.trim(),
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

    const curriculos = lerCurriculos();
    const indice = curriculos.findIndex((item) => item.id === idAtual);
    if (indice >= 0) curriculos[indice] = curriculo;
    else curriculos.push(curriculo);

    salvarCurriculos(curriculos);
    document.querySelector("#curriculo-id").value = idAtual;
    tituloEditor.textContent = `Editando: ${curriculo.tituloCurriculo}`;
    aviso.classList.add("show");
    setTimeout(() => aviso.classList.remove("show"), 2500);
    renderizarLista();
  });

  // Migra o antigo Perfil Profissional, caso já tenha sido preenchido antes desta atualização.
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
      // Se o dado antigo estiver inválido, apenas ignora a migração.
    }
  }

  renderizarLista();
});