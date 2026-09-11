(() => {
  const lista = document.querySelector("#professor-lista");
  if (!lista) return;

  function prepararCard(card) {
    if (!(card instanceof HTMLElement)) return;
    if (!card.classList.contains("processo-card")) return;
    if (card.dataset.acordeaoProfessor === "true") return;

    const colunas = [...card.children];
    if (colunas.length < 2) return;

    const esquerda = colunas[0];
    const direita = colunas[1];
    const head = esquerda.querySelector(".processo-head");
    if (!head) return;

    card.dataset.acordeaoProfessor = "true";
    card.classList.add("processo-card-compacto");

    const topo = document.createElement("div");
    topo.className = "processo-card-resumo";

    const acoes = document.createElement("div");
    acoes.className = "processo-card-acoes";

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "btn btn-primary processo-card-toggle";
    const avaliado = card.dataset.status === "avaliado";
    botao.textContent = avaliado ? "Exibir avaliação" : "Exibir para avaliar";
    botao.setAttribute("aria-expanded", "false");

    acoes.appendChild(botao);
    topo.append(head, acoes);

    const detalhes = document.createElement("div");
    detalhes.className = "processo-card-detalhes";
    detalhes.hidden = true;
    detalhes.append(esquerda, direita);

    card.replaceChildren(topo, detalhes);

    botao.addEventListener("click", () => {
      const abrir = detalhes.hidden;
      detalhes.hidden = !abrir;
      botao.setAttribute("aria-expanded", String(abrir));
      botao.textContent = abrir
        ? "Ocultar avaliação"
        : (avaliado ? "Exibir avaliação" : "Exibir para avaliar");
      card.classList.toggle("processo-card-aberto", abrir);
    });
  }

  function prepararTodos() {
    lista.querySelectorAll(".processo-card").forEach(prepararCard);
  }

  const observer = new MutationObserver(prepararTodos);
  observer.observe(lista, { childList: true, subtree: true });
  prepararTodos();
})();
