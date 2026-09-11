(() => {
  function hojeLocalISO() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  function prepararCampo(form) {
    const input = form.querySelector('input[name="entrevistaData"]');
    if (!input || input.dataset.dataAvaliacaoPreparada === "true") return;

    input.dataset.dataAvaliacaoPreparada = "true";
    input.required = true;

    if (!input.value) {
      input.value = hojeLocalISO();
    }

    const label = input.closest("label");
    const titulo = label?.querySelector("span");
    if (titulo) {
      titulo.textContent = "Data em que esta entrevista foi realizada";
    }

    if (label && !label.querySelector(".ajuda-data-entrevista")) {
      const ajuda = document.createElement("small");
      ajuda.className = "ajuda-data-entrevista";
      ajuda.textContent = "Escolha a data real desta entrevista. Cada aluno pode ser avaliado em um dia diferente.";
      ajuda.style.display = "block";
      ajuda.style.marginTop = "6px";
      ajuda.style.color = "var(--muted)";
      ajuda.style.lineHeight = "1.4";
      label.appendChild(ajuda);
    }
  }

  function prepararTodos() {
    document.querySelectorAll(".avaliacao-form").forEach(prepararCampo);
  }

  const alvo = document.querySelector("#professor-lista") || document.body;
  const observer = new MutationObserver(prepararTodos);
  observer.observe(alvo, { childList: true, subtree: true });
  prepararTodos();
})();
