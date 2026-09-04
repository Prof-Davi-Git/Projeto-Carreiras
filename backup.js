document.addEventListener("DOMContentLoaded", () => {
  const layoutStylesheet = document.createElement("link");
  layoutStylesheet.rel = "stylesheet";
  layoutStylesheet.href = "layouts-distintos.css?v=20260904-4";
  document.head.appendChild(layoutStylesheet);

  const STORAGE_KEY = "curriculosProfissionais";
  const baixar = document.querySelector("#baixar-backup");
  const carregar = document.querySelector("#carregar-backup");
  const arquivo = document.querySelector("#arquivo-backup");

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

  // BACKUP TEMPORARIO
  if (baixar && carregar && arquivo) {
    baixar.addEventListener("click", () => {
      const curriculos = lerCurriculos();

      if (curriculos.length === 0) {
        alert("Você ainda não possui currículos salvos para baixar.");
        return;
      }

      const backup = {
        sistema: "Meu Futuro Profissional",
        versao: 2,
        exportadoEm: new Date().toISOString(),
        curriculos
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json"
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const data = new Date().toISOString().slice(0, 10);

      link.href = url;
      link.download = `meus-curriculos-${data}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });

    carregar.addEventListener("click", () => {
      arquivo.value = "";
      arquivo.click();
    });

    arquivo.addEventListener("change", async () => {
      const selecionado = arquivo.files[0];
      if (!selecionado) return;

      try {
        const texto = await selecionado.text();
        const dados = JSON.parse(texto);
        const importados = Array.isArray(dados) ? dados : dados.curriculos;

        if (!Array.isArray(importados)) {
          throw new Error("Formato inválido");
        }

        const atuais = lerCurriculos();
        const mapa = new Map();

        atuais.forEach((curriculo) => {
          if (curriculo && curriculo.id) mapa.set(curriculo.id, curriculo);
        });

        importados.forEach((curriculo) => {
          if (!curriculo || typeof curriculo !== "object") return;
          const id = curriculo.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
          mapa.set(id, { ...curriculo, id });
        });

        salvarCurriculos([...mapa.values()]);
        alert("Arquivo carregado com sucesso. Seus currículos foram restaurados.");
        window.location.reload();
      } catch (erro) {
        alert("Não foi possível carregar este arquivo. Selecione um backup gerado pelo site.");
      }
    });
  }

  // PALETA DE COR UNICA
  // As opções antigas continuam no HTML apenas para manter compatibilidade com
  // currículos já salvos, mas ficam invisíveis para o aluno.
  const colorOptions = document.querySelector(".color-options");
  const folha = document.querySelector("#curriculo-folha");
  const form = document.querySelector("#curriculo-form");
  const lista = document.querySelector("#lista-curriculos");

  if (!colorOptions || !form || !folha) return;

  const labelCor = colorOptions.previousElementSibling;
  if (labelCor && labelCor.classList.contains("option-label")) {
    labelCor.textContent = "Escolha a cor";
  }

  const style = document.createElement("style");
  style.textContent = `
    .color-options > .color-choice {
      display: none !important;
    }

    .color-options {
      grid-template-columns: 1fr !important;
    }

    .custom-color-area {
      grid-column: 1 / -1;
      display: block;
      width: 100%;
    }

    .custom-color-picker {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      width: 100%;
      min-height: 74px;
      padding: 12px 16px;
      border: 2px solid var(--border);
      border-radius: 14px;
      background: #fff;
      cursor: pointer;
      transition: border-color .2s ease, box-shadow .2s ease;
    }

    .custom-color-picker:hover,
    .custom-color-picker:focus-within {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(21, 94, 239, 0.08);
    }

    .custom-color-copy {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .custom-color-copy strong {
      color: var(--text);
      font-size: .95rem;
    }

    .custom-color-copy span {
      color: var(--muted);
      font-size: .82rem;
      font-weight: 600;
    }

    .custom-color-control {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    #cor-personalizada {
      width: 64px;
      height: 44px;
      padding: 2px;
      border: 1px solid var(--border);
      border-radius: 9px;
      background: #fff;
      cursor: pointer;
    }

    #cor-personalizada::-webkit-color-swatch-wrapper {
      padding: 2px;
    }

    #cor-personalizada::-webkit-color-swatch {
      border: 0;
      border-radius: 6px;
    }

    #cor-personalizada-hex {
      min-width: 72px;
      color: var(--text);
      font-size: .82rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    @media (max-width: 560px) {
      .custom-color-picker {
        align-items: flex-start;
        flex-direction: column;
      }
    }
  `;
  document.head.appendChild(style);

  const customArea = document.createElement("div");
  customArea.className = "custom-color-area";
  customArea.innerHTML = `
    <input id="tema-personalizado" type="radio" name="tema" value="personalizada" hidden>
    <label class="custom-color-picker" for="cor-personalizada">
      <span class="custom-color-copy">
        <strong>Paleta de cor</strong>
        <span>Clique na cor ao lado e escolha qualquer tonalidade.</span>
      </span>
      <span class="custom-color-control">
        <span id="cor-personalizada-hex">#10BFC9</span>
        <input id="cor-personalizada" type="color" value="#10bfc9" aria-label="Escolher cor do currículo">
      </span>
    </label>
  `;
  colorOptions.appendChild(customArea);

  const radioPersonalizado = document.querySelector("#tema-personalizado");
  const seletorCor = document.querySelector("#cor-personalizada");
  const codigoCor = document.querySelector("#cor-personalizada-hex");
  const novoCurriculo = document.querySelector("#novo-curriculo");

  const CORES_ANTIGAS = {
    azul: "#10bfc9",
    verde: "#2f8b59",
    vinho: "#a84361",
    grafite: "#64748b",
    roxo: "#7c3aed",
    marinho: "#1f4e8c",
    petroleo: "#0f766e",
    terracota: "#b85c38",
    dourado: "#a47a1f",
    "rosa-seco": "#a85576"
  };

  function normalizarHex(valor) {
    const cor = String(valor || "").trim();
    return /^#[0-9a-fA-F]{6}$/.test(cor) ? cor.toLowerCase() : "#10bfc9";
  }

  function hexParaRgb(hex) {
    const valor = normalizarHex(hex).slice(1);
    return {
      r: parseInt(valor.slice(0, 2), 16),
      g: parseInt(valor.slice(2, 4), 16),
      b: parseInt(valor.slice(4, 6), 16)
    };
  }

  function rgbParaHex({ r, g, b }) {
    const parte = (valor) => Math.max(0, Math.min(255, Math.round(valor))).toString(16).padStart(2, "0");
    return `#${parte(r)}${parte(g)}${parte(b)}`;
  }

  function misturarCor(corBase, corAlvo, proporcao) {
    const base = hexParaRgb(corBase);
    const alvo = hexParaRgb(corAlvo);
    return rgbParaHex({
      r: base.r + (alvo.r - base.r) * proporcao,
      g: base.g + (alvo.g - base.g) * proporcao,
      b: base.b + (alvo.b - base.b) * proporcao
    });
  }

  function atualizarPaleta(cor) {
    const hex = normalizarHex(cor);
    seletorCor.value = hex;
    codigoCor.textContent = hex.toUpperCase();
  }

  function ativarPaleta(cor = seletorCor.value) {
    radioPersonalizado.checked = true;
    atualizarPaleta(cor);
  }

  function aplicarCorNaFolha(curriculo) {
    folha.style.removeProperty("--resume-accent");
    folha.style.removeProperty("--resume-soft");
    folha.style.removeProperty("--resume-dark");

    if (!curriculo || folha.classList.contains("layout-classico")) return;
    if (curriculo.tema !== "personalizada" || !curriculo.corPersonalizada) return;

    const cor = normalizarHex(curriculo.corPersonalizada);
    folha.style.setProperty("--resume-accent", cor);
    folha.style.setProperty("--resume-soft", misturarCor(cor, "#ffffff", 0.88));
    folha.style.setProperty("--resume-dark", misturarCor(cor, "#000000", 0.62));
  }

  function encontrarCurriculo(id) {
    return lerCurriculos().find((curriculo) => curriculo.id === id) || null;
  }

  function salvarCorDoEditor() {
    if (!radioPersonalizado.checked) return null;

    const id = document.querySelector("#curriculo-id")?.value;
    if (!id) return null;

    const curriculos = lerCurriculos();
    const indice = curriculos.findIndex((curriculo) => curriculo.id === id);
    if (indice < 0) return null;

    curriculos[indice] = {
      ...curriculos[indice],
      tema: "personalizada",
      corPersonalizada: normalizarHex(seletorCor.value)
    };

    salvarCurriculos(curriculos);
    return curriculos[indice];
  }

  function sincronizarEditor(curriculo) {
    if (!curriculo) return;

    if (curriculo.tema === "personalizada" && curriculo.corPersonalizada) {
      ativarPaleta(curriculo.corPersonalizada);
      return;
    }

    ativarPaleta(CORES_ANTIGAS[curriculo.tema] || "#10bfc9");
  }

  function anotarCards() {
    if (!lista) return;
    const curriculos = lerCurriculos()
      .slice()
      .sort((a, b) => String(b.atualizadoEm || "").localeCompare(String(a.atualizadoEm || "")));

    [...lista.querySelectorAll(".saved-card")].forEach((card, indice) => {
      card.dataset.curriculoId = curriculos[indice]?.id || "";
    });
  }

  seletorCor.addEventListener("input", () => {
    ativarPaleta(seletorCor.value);
  });

  seletorCor.addEventListener("click", () => {
    radioPersonalizado.checked = true;
  });

  // O script principal redefine a cor padrão ao abrir um novo currículo.
  // Como este listener foi registrado depois, a paleta volta a ser a opção ativa.
  if (novoCurriculo) {
    novoCurriculo.addEventListener("click", () => {
      ativarPaleta("#10bfc9");
    });
  }

  // O script principal salva primeiro; logo depois gravamos a cor livre no
  // mesmo currículo sem alterar os demais dados.
  form.addEventListener("submit", () => {
    const curriculo = salvarCorDoEditor();
    if (curriculo) aplicarCorNaFolha(curriculo);
  });

  const salvarVisualizar = document.querySelector("#salvar-visualizar");
  if (salvarVisualizar) {
    salvarVisualizar.addEventListener("click", () => {
      const curriculo = salvarCorDoEditor();
      if (curriculo) aplicarCorNaFolha(curriculo);
      else {
        const id = document.querySelector("#curriculo-id")?.value;
        aplicarCorNaFolha(encontrarCurriculo(id));
      }
    });
  }

  // Recupera a cor ao visualizar, editar ou duplicar um currículo salvo.
  document.addEventListener("click", (event) => {
    const botao = event.target.closest("button");
    const card = botao?.closest(".saved-card");
    if (!botao || !card) return;

    const acao = botao.textContent.trim();
    const id = card.dataset.curriculoId;
    const curriculo = encontrarCurriculo(id);

    if (acao === "Visualizar") {
      aplicarCorNaFolha(curriculo);
      return;
    }

    if (acao === "Editar") {
      sincronizarEditor(curriculo);
      return;
    }

    if (acao === "Duplicar") {
      const novoId = document.querySelector("#curriculo-id")?.value;
      sincronizarEditor(encontrarCurriculo(novoId));
    }
  });

  if (lista) {
    const observer = new MutationObserver(() => anotarCards());
    observer.observe(lista, { childList: true, subtree: true });
  }

  atualizarPaleta("#10bfc9");
  anotarCards();
});