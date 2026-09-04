document.addEventListener("DOMContentLoaded", () => {
  const layoutStylesheet = document.createElement("link");
  layoutStylesheet.rel = "stylesheet";
  layoutStylesheet.href = "layouts-distintos.css";
  document.head.appendChild(layoutStylesheet);

  const STORAGE_KEY = "curriculosProfissionais";
  const baixar = document.querySelector("#baixar-backup");
  const carregar = document.querySelector("#carregar-backup");
  const arquivo = document.querySelector("#arquivo-backup");

  if (!baixar || !carregar || !arquivo) return;

  function lerCurriculos() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (erro) {
      return [];
    }
  }

  baixar.addEventListener("click", () => {
    const curriculos = lerCurriculos();

    if (curriculos.length === 0) {
      alert("Você ainda não possui currículos salvos para baixar.");
      return;
    }

    const backup = {
      sistema: "Meu Futuro Profissional",
      versao: 1,
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

      localStorage.setItem(STORAGE_KEY, JSON.stringify([...mapa.values()]));
      alert("Arquivo carregado com sucesso. Seus currículos foram restaurados.");
      window.location.reload();
    } catch (erro) {
      alert("Não foi possível carregar este arquivo. Selecione um backup gerado pelo site.");
    }
  });
});