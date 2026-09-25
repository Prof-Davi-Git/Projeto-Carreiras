(() => {
  const lista = document.querySelector("#professor-lista");
  if (!lista) return;

  function normalizar(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function tamanho(bytes) {
    const numero = Number(bytes);
    if (!Number.isFinite(numero)) return "";
    const mb = numero / (1024 * 1024);
    return `${mb.toFixed(mb >= 1 ? 1 : 2)} MB`;
  }

  async function esperarApi() {
    for (let tentativa = 0; tentativa < 100; tentativa += 1) {
      if (window.FirebaseCarreiras) return window.FirebaseCarreiras;
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    return null;
  }

  async function esperarSubmissoes() {
    if (Array.isArray(window.PROFESSOR_SUBMISSOES)) return window.PROFESSOR_SUBMISSOES;
    await new Promise((resolve) => {
      let resolvido = false;
      const concluir = () => {
        if (resolvido) return;
        resolvido = true;
        window.removeEventListener("professor-avaliacoes-pronto", concluir);
        resolve();
      };
      window.addEventListener("professor-avaliacoes-pronto", concluir, { once: true });
      setTimeout(concluir, 5000);
    });
    return Array.isArray(window.PROFESSOR_SUBMISSOES) ? window.PROFESSOR_SUBMISSOES : [];
  }

  async function abrirPdf(api, submissao, botao) {
    const ids = Array.isArray(submissao.pdfChunkIds) ? submissao.pdfChunkIds : [];
    if (!ids.length) {
      alert("O arquivo PDF desta submissão não foi encontrado.");
      return;
    }

    const popup = window.open("", "_blank");
    if (popup) popup.document.write("<p style='font-family:Arial,sans-serif;padding:24px'>Carregando currículo em PDF...</p>");

    botao.disabled = true;
    const textoAnterior = botao.textContent;
    botao.textContent = "Abrindo PDF...";

    try {
      const armazenamento = submissao.pdfArmazenamento || "usuarios_curriculos";
      const col = armazenamento === "submissoes"
        ? api.db.collection("submissoes")
        : api.db.collection("usuarios").doc(submissao.alunoUid).collection("curriculos");
      const snaps = await Promise.all(ids.map((id) => col.doc(id).get()));
      const partes = snaps
        .filter((snap) => snap.exists)
        .map((snap) => snap.data())
        .filter((dados) => dados?.tipoDocumento === "pdf_chunk" && dados.conteudo)
        .sort((a, b) => Number(a.indice || 0) - Number(b.indice || 0))
        .map((dados) => dados.conteudo.toUint8Array());

      if (!partes.length || partes.length !== ids.length) throw new Error("O PDF está incompleto no armazenamento.");

      const blob = new Blob(partes, { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      if (popup) popup.location.href = url;
      else {
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener";
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (erro) {
      console.error("Falha ao abrir currículo PDF:", erro);
      popup?.close();
      alert(erro.message || "Não foi possível abrir o PDF enviado pelo aluno.");
    } finally {
      botao.disabled = false;
      botao.textContent = textoAnterior;
    }
  }

  function corresponde(card, submissao) {
    const busca = normalizar(card.dataset.busca || "");
    const nome = normalizar(submissao.alunoNome);
    const vaga = normalizar(submissao.vagaTitulo);
    return busca.includes(nome) && busca.includes(vaga);
  }

  function aplicarNosCards(api, submissoes) {
    lista.querySelectorAll(".processo-card").forEach((card) => {
      if (card.querySelector(".pdf-externo-professor")) return;
      const submissao = submissoes.find((item) => item.tipoCurriculo === "pdf_externo" && corresponde(card, item));
      if (!submissao) return;

      const preview = card.querySelector(".curriculo-preview-professor");
      if (!preview) return;

      const box = document.createElement("div");
      box.className = "pdf-externo-professor";
      box.style.display = "grid";
      box.style.gap = "8px";
      box.style.padding = "12px";
      box.style.border = "1px solid var(--border)";
      box.style.borderRadius = "10px";
      box.style.background = "#fff";

      const titulo = document.createElement("strong");
      titulo.textContent = "Currículo externo em PDF";
      const info = document.createElement("span");
      info.style.color = "var(--muted)";
      info.style.fontSize = ".88rem";
      info.textContent = [submissao.arquivoNome || "curriculo.pdf", tamanho(submissao.arquivoTamanho)].filter(Boolean).join(" • ");

      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "btn btn-primary btn-small";
      botao.textContent = "Abrir currículo em PDF";
      botao.addEventListener("click", () => abrirPdf(api, submissao, botao));

      box.append(titulo, info, botao);
      preview.prepend(box);
    });
  }

  async function iniciar() {
    const api = await esperarApi();
    if (!api) return;
    const sessao = await api.exigirSessao("professor");
    if (!sessao) return;

    const submissoes = await esperarSubmissoes();
    const aplicar = () => aplicarNosCards(api, submissoes);
    let timer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(aplicar, 50);
    });
    observer.observe(lista, { childList: true, subtree: true });
    aplicar();
  }

  iniciar().catch((erro) => console.error("Falha ao preparar currículos PDF no painel:", erro));
})();