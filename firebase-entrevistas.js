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
    return Math.min(5, Math.ceil(n / 2));
  }

  function classificacao(valor) {
    const qtd = estrelasDaNota(valor);
    if (qtd === 5) return "Excelente desempenho";
    if (qtd === 4) return "Muito bom desempenho";
    if (qtd === 3) return "Bom desempenho";
    if (qtd === 2) return "Em desenvolvimento";
    if (qtd === 1) return "Precisa evoluir";
    return "Sem classificação";
  }

  function criar(tag, classe = "", texto = "") {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== "") el.textContent = texto;
    return el;
  }

  function criarIconeEntrevista() {
    const wrap = criar("div", "entrevista-icone");
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML = `
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="3" width="6" height="11" rx="3"></rect>
        <path d="M5.5 10.5a6.5 6.5 0 0 0 13 0"></path>
        <path d="M12 17v4"></path>
        <path d="M9 21h6"></path>
      </svg>
    `;
    return wrap;
  }

  function criarLinhaEstrelas(valor, classeExtra = "") {
    const quantidade = estrelasDaNota(valor);
    const estrelas = criar("div", `avaliacao-estrelas ${classeExtra}`.trim());
    estrelas.setAttribute("aria-label", `${quantidade} de 5 estrelas`);

    for (let i = 1; i <= 5; i += 1) {
      const estrela = criar("span", i <= quantidade ? "estrela ativa" : "estrela", "★");
      estrela.setAttribute("aria-hidden", "true");
      estrelas.appendChild(estrela);
    }

    return estrelas;
  }

  function blocoNota(rotulo, valor, valorNumerico = null) {
    const box = criar("div", "avaliacao-nota-box");
    box.append(
      criar("span", "avaliacao-nota-label", rotulo),
      criar("strong", "avaliacao-nota-valor", valor)
    );

    if (numeroSeguro(valorNumerico) !== null) {
      box.appendChild(criarLinhaEstrelas(valorNumerico, "avaliacao-estrelas-mini"));
    }

    return box;
  }

  function criarEstrelas(valor) {
    const quantidade = estrelasDaNota(valor);
    const wrap = criar("section", "avaliacao-estrelas-wrap");

    const texto = criar("div", "avaliacao-estrelas-copy");
    texto.append(
      criar("span", "avaliacao-estrelas-titulo", "AVALIAÇÃO GERAL"),
      criar("strong", "avaliacao-estrelas-classificacao", classificacao(valor)),
      criar("span", "avaliacao-estrelas-nota", `Média final: ${nota(valor)} / 10`)
    );

    const visual = criar("div", "avaliacao-estrelas-visual");
    visual.append(
      criarLinhaEstrelas(valor),
      criar("strong", "avaliacao-estrelas-texto", `${quantidade} de 5 estrelas`)
    );

    wrap.append(texto, visual);
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

  function criarDetalhes(avaliacao) {
    const detalhes = criar("div", "resultado-entrevista-detalhes hidden");
    const media = mediaFinal(avaliacao);
    const resumo = criar("div", "avaliacao-resumo-grid");

    resumo.append(
      blocoNota("Data da entrevista", formatarData(avaliacao.entrevistaData)),
      blocoNota("Nota do currículo", `${nota(avaliacao.notaCurriculo)} / 10`, avaliacao.notaCurriculo),
      blocoNota("Nota da entrevista", `${nota(avaliacao.notaEntrevista)} / 10`, avaliacao.notaEntrevista),
      blocoNota("Média final", `${nota(media)} / 10`, media)
    );

    detalhes.append(resumo, criarEstrelas(media), criarCriterios(avaliacao), criarFeedback(avaliacao));
    return detalhes;
  }

  function criarCard(envio, avaliacao) {
    const card = criar("article", "saved-card entrevista-card-compacto avaliado");
    const topo = criar("div", "entrevista-card-topo");
    const resumo = criar("div", "entrevista-resumo");
    const textos = criar("div", "entrevista-resumo-textos");

    textos.append(
      criar("p", "small-label", envio.empresa || "PROCESSO SELETIVO"),
      criar("h3", "", envio.vagaTitulo || "Vaga"),
      criar("p", "entrevista-resumo-meta", `Entrevista: ${formatarData(avaliacao.entrevistaData)}`)
    );

    resumo.append(criarIconeEntrevista(), textos);

    const lateral = criar("div", "entrevista-card-lateral");
    lateral.appendChild(criar("span", "badge", "RESULTADO DISPONÍVEL"));

    const botao = criar("button", "btn btn-primary btn-resultado", "Exibir resultado da entrevista");
    botao.type = "button";
    lateral.appendChild(botao);

    topo.append(resumo, lateral);
    card.appendChild(topo);

    const detalhes = criarDetalhes(avaliacao);
    botao.setAttribute("aria-expanded", "false");
    botao.addEventListener("click", () => {
      const fechado = detalhes.classList.toggle("hidden");
      botao.setAttribute("aria-expanded", String(!fechado));
      botao.textContent = fechado ? "Exibir resultado da entrevista" : "Ocultar resultado";
    });
    card.appendChild(detalhes);

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

    const alvo = document.querySelector("#entrevistas-dinamicas");
    if (!alvo) return;

    const envios = submissoesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const avaliacoes = avaliacoesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    if (!avaliacoes.length) return;

    const enviosPorId = new Map(envios.map((envio) => [envio.id, envio]));

    const resultados = avaliacoes.map((avaliacao) => {
      const envio = enviosPorId.get(avaliacao.submissaoId || avaliacao.id)
        || envios.find((item) => item.vagaId === avaliacao.vagaId)
        || {
          id: avaliacao.submissaoId || avaliacao.id,
          vagaId: avaliacao.vagaId,
          vagaTitulo: avaliacao.vagaTitulo,
          empresa: avaliacao.empresa || "",
          area: avaliacao.area || ""
        };

      return { envio, avaliacao };
    });

    resultados.sort((a, b) =>
      Number(b.avaliacao?.atualizadoEm?.seconds || b.envio?.atualizadoEm?.seconds || 0)
      - Number(a.avaliacao?.atualizadoEm?.seconds || a.envio?.atualizadoEm?.seconds || 0)
    );

    const cabecalho = criar("div", "section-head compact entrevistas-lista-head");
    const texto = criar("div");
    texto.append(
      criar("p", "small-label", "MINHAS ENTREVISTAS"),
      criar("h2", "", "Resultados das entrevistas"),
      criar("p", "", "Abra o resultado da entrevista que deseja consultar.")
    );
    cabecalho.appendChild(texto);

    const lista = criar("div", "entrevista-lista-compacta");
    resultados.forEach(({ envio, avaliacao }) => lista.appendChild(criarCard(envio, avaliacao)));

    alvo.replaceChildren(cabecalho, lista);
  }

  iniciar().catch((erro) => {
    console.error("Falha ao carregar entrevistas:", erro);
  });
})();
