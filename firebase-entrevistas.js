(() => {
  const api = window.FirebaseCarreiras;
  if (!api) return;

  const CRITERIOS = [
    ["comunicacao", "Comunicação e clareza"],
    ["dominioCurriculo", "Domínio do currículo"],
    ["adequacaoVaga", "Adequação à vaga"],
    ["resolucaoProblema", "Situação-problema"],
    ["postura", "Postura profissional"]
  ];

  function formatarData(valor) {
    if (!valor) return "Ainda não definida";
    const partes = String(valor).split("-");
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return String(valor);
  }

  function numeroSeguro(valor) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : null;
  }

  function nota(valor) {
    const n = numeroSeguro(valor);
    return n === null ? "—" : n.toFixed(1).replace(".0", "");
  }

  function mediaFinal(avaliacao) {
    if (!avaliacao) return null;
    const curriculo = numeroSeguro(avaliacao.notaCurriculo);
    const entrevista = numeroSeguro(avaliacao.notaEntrevista);
    if (curriculo === null && entrevista === null) return null;
    if (curriculo === null) return entrevista;
    if (entrevista === null) return curriculo;
    return (curriculo + entrevista) / 2;
  }

  function estrelasDaNota(valor) {
    const n = numeroSeguro(valor);
    if (n === null || n <= 0) return 0;
    if (n < 2) return 1;
    if (n < 4) return 2;
    if (n < 6) return 3;
    if (n < 8) return 4;
    return 5;
  }

  function criar(tag, classe = "", texto = "") {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== "") el.textContent = texto;
    return el;
  }

  function blocoNota(rotulo, valor) {
    const box = criar("div", "avaliacao-nota-box");
    box.append(
      criar("span", "avaliacao-nota-label", rotulo),
      criar("strong", "avaliacao-nota-valor", valor)
    );
    return box;
  }

  function criarEstrelas(valor) {
    const quantidade = estrelasDaNota(valor);
    const wrap = criar("div", "avaliacao-estrelas-wrap");
    const estrelas = criar("div", "avaliacao-estrelas");
    estrelas.setAttribute("aria-label", `${quantidade} de 5 estrelas`);

    for (let i = 1; i <= 5; i += 1) {
      estrelas.appendChild(criar("span", i <= quantidade ? "estrela ativa" : "estrela", i <= quantidade ? "★" : "☆"));
    }

    wrap.append(
      criar("span", "avaliacao-estrelas-titulo", "Resultado geral"),
      estrelas,
      criar("strong", "avaliacao-estrelas-texto", `${quantidade} de 5 estrelas`)
    );
    return wrap;
  }

  function criarCriterios(avaliacao) {
    const criterios = avaliacao?.criterios || {};
    const secao = criar("div", "avaliacao-criterios");
    secao.appendChild(criar("h4", "", "Critérios da entrevista"));

    const grid = criar("div", "avaliacao-criterios-grid");
    CRITERIOS.forEach(([chave, rotulo]) => {
      const item = criar("div", "avaliacao-criterio-item");
      item.append(
        criar("span", "", rotulo),
        criar("strong", "", `${nota(criterios[chave])} / 2`)
      );
      grid.appendChild(item);
    });

    secao.appendChild(grid);
    return secao;
  }

  function criarFeedback(avaliacao) {
    const box = criar("div", "avaliacao-feedback");
    box.appendChild(criar("h4", "", "Feedback do professor"));
    box.appendChild(criar("p", "", avaliacao?.feedback || "Nenhum feedback escrito foi adicionado."));
    return box;
  }

  function criarCard(envio, avaliacao) {
    const card = criar("article", `saved-card processo-aluno-card${avaliacao ? " avaliado" : ""}`);

    const cabecalho = criar("div", "processo-aluno-head");
    const tituloWrap = criar("div");
    tituloWrap.append(
      criar("p", "small-label", envio.empresa || "PROCESSO SELETIVO"),
      criar("h3", "", envio.vagaTitulo || "Vaga")
    );

    const status = criar("span", avaliacao ? "badge" : "badge gray", avaliacao ? "AVALIAÇÃO DISPONÍVEL" : "CURRÍCULO ENVIADO");
    cabecalho.append(tituloWrap, status);
    card.appendChild(cabecalho);

    if (!avaliacao) {
      const pendente = criar("div", "avaliacao-pendente");
      pendente.append(
        criar("strong", "", "Sua avaliação ainda não foi publicada."),
        criar("p", "", "Quando o professor registrar as notas e o feedback, o resultado aparecerá aqui automaticamente.")
      );
      card.appendChild(pendente);
      return card;
    }

    const media = mediaFinal(avaliacao);
    const resumo = criar("div", "avaliacao-resumo-grid");
    resumo.append(
      blocoNota("Data da entrevista", formatarData(avaliacao.entrevistaData)),
      blocoNota("Nota do currículo", `${nota(avaliacao.notaCurriculo)} / 10`),
      blocoNota("Nota da entrevista", `${nota(avaliacao.notaEntrevista)} / 10`),
      blocoNota("Média final", `${nota(media)} / 10`)
    );

    card.append(resumo, criarEstrelas(media), criarCriterios(avaliacao), criarFeedback(avaliacao));
    return card;
  }

  async function iniciar() {
    const sessao = await api.exigirSessao("aluno");
    if (!sessao) return;
    api.decorarTopo(sessao);

    const [submissoesSnap, avaliacoesSnap] = await Promise.all([
      api.db.collection("submissoes")
        .where("alunoUid", "==", sessao.usuario.uid)
        .get(),
      api.db.collection("avaliacoes")
        .where("alunoUid", "==", sessao.usuario.uid)
        .get()
    ]);

    const envios = submissoesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    if (!envios.length) return;

    const avaliacoes = avaliacoesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const porId = new Map(avaliacoes.map((avaliacao) => [avaliacao.id, avaliacao]));

    function acharAvaliacao(envio) {
      return porId.get(envio.id)
        || avaliacoes.find((avaliacao) => avaliacao.submissaoId === envio.id)
        || avaliacoes.find((avaliacao) => avaliacao.vagaId === envio.vagaId)
        || null;
    }

    const bloco = criar("section", "panel aluno-avaliacoes-panel");
    const head = criar("div", "section-head compact");
    const headText = criar("div");
    headText.append(
      criar("p", "small-label", "MEU DESEMPENHO"),
      criar("h2", "", "Avaliações e feedbacks"),
      criar("p", "", "Veja suas notas, os critérios avaliados na entrevista, o feedback do professor e sua classificação em estrelas.")
    );
    head.appendChild(headText);
    bloco.appendChild(head);

    const grid = criar("div", "avaliacoes-aluno-lista");
    envios.forEach((envio) => grid.appendChild(criarCard(envio, acharAvaliacao(envio))));
    bloco.appendChild(grid);

    const alvo = document.querySelector(".two-columns") || document.querySelector("main");
    alvo.parentNode.insertBefore(bloco, alvo);
  }

  iniciar().catch((erro) => {
    console.error("Falha ao carregar entrevistas:", erro);
  });
})();
