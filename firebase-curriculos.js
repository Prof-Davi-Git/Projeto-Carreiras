(() => {
  const api = window.FirebaseCarreiras;
  if (!api) return;

  const STORAGE_KEY = "curriculosProfissionais";
  const OWNER_KEY = "curriculosOwnerUid";
  const MAX_PDF_BYTES = 8 * 1024 * 1024;
  const PDF_CHUNK_BYTES = 450 * 1024;
  const PDF_CHUNKS_POR_LOTE = 8;

  function lerLocal() {
    try {
      const dados = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(dados) ? dados : [];
    } catch (_) {
      return [];
    }
  }

  function ordenar(curriculos) {
    return curriculos.slice().sort((a, b) => String(b.atualizadoEm || "").localeCompare(String(a.atualizadoEm || "")));
  }

  function idCurriculo(curriculo) {
    return String(curriculo.id || api.slug(curriculo.tituloCurriculo || Date.now()));
  }

  function assinatura(curriculo) {
    try {
      return JSON.stringify(curriculo);
    } catch (_) {
      return `${curriculo?.id || ""}_${curriculo?.atualizadoEm || ""}`;
    }
  }

  function snapshotLeve(curriculo = {}) {
    const copia = { ...curriculo };
    delete copia.foto;
    return copia;
  }

  async function docsCurriculos(uid) {
    return api.db.collection("usuarios").doc(uid).collection("curriculos")
      .where("ownerUid", "==", uid)
      .get();
  }

  async function enviarTudo(uid, curriculos) {
    const col = api.db.collection("usuarios").doc(uid).collection("curriculos");
    const atuais = await docsCurriculos(uid);
    const batch = api.db.batch();
    const idsLocais = new Set();

    curriculos.forEach((curriculo) => {
      const id = idCurriculo(curriculo);
      idsLocais.add(id);
      batch.set(col.doc(id), {
        ...curriculo,
        id,
        ownerUid: uid,
        tipoDocumento: "curriculo_site",
        sincronizadoEm: api.FieldValue.serverTimestamp()
      });
    });

    atuais.forEach((doc) => {
      if (!idsLocais.has(doc.id)) batch.delete(doc.ref);
    });

    await batch.commit();
  }

  async function carregarNuvem(uid) {
    const snap = await docsCurriculos(uid);
    return snap.docs.map((doc) => {
      const dados = { ...(doc.data() || {}) };
      delete dados.sincronizadoEm;
      delete dados.ownerUid;
      delete dados.tipoDocumento;
      return { ...dados, id: dados.id || doc.id };
    });
  }

  function inserirAvisoMigracao(qtd, importar, limpar) {
    if (document.querySelector("#firebase-migracao")) return;
    const hero = document.querySelector(".page-hero") || document.querySelector(".direct-hero");
    if (!hero) return;

    const box = document.createElement("section");
    box.id = "firebase-migracao";
    box.className = "panel";
    box.style.marginTop = "16px";
    box.innerHTML = `
      <div class="section-head compact">
        <div>
          <p class="small-label">IMPORTAÇÃO INICIAL</p>
          <h2>Encontramos ${qtd} currículo${qtd === 1 ? "" : "s"} neste computador.</h2>
          <p>Você quer vincular esse conteúdo à sua conta online?</p>
        </div>
      </div>
      <div class="form-actions">
        <button id="firebase-importar" class="btn btn-primary" type="button">Sim, importar para minha conta</button>
        <button id="firebase-nao-importar" class="btn btn-secondary" type="button">Não, começar vazio</button>
      </div>
    `;
    hero.insertAdjacentElement("afterend", box);
    box.querySelector("#firebase-importar").addEventListener("click", importar);
    box.querySelector("#firebase-nao-importar").addEventListener("click", limpar);
  }

  async function prepararSincronizacao(sessao) {
    const uid = sessao.usuario.uid;
    const remoto = await carregarNuvem(uid);
    const local = lerLocal();
    const owner = localStorage.getItem(OWNER_KEY);

    if (remoto.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remoto));
      localStorage.setItem(OWNER_KEY, uid);
      if (JSON.stringify(ordenar(local)) !== JSON.stringify(ordenar(remoto))) {
        const chaveReload = `firebaseCurriculosRecarregados_${uid}`;
        if (!sessionStorage.getItem(chaveReload)) {
          sessionStorage.setItem(chaveReload, "1");
          location.reload();
          return false;
        }
      }
      return true;
    }

    if (local.length > 0 && (!owner || owner === uid)) {
      inserirAvisoMigracao(local.length,
        async () => {
          await enviarTudo(uid, local);
          localStorage.setItem(OWNER_KEY, uid);
          document.querySelector("#firebase-migracao")?.remove();
          alert("Currículos importados para sua conta com sucesso.");
        },
        () => {
          localStorage.setItem(`curriculosLegado_${Date.now()}`, JSON.stringify(local));
          localStorage.setItem(STORAGE_KEY, "[]");
          localStorage.setItem(OWNER_KEY, uid);
          location.reload();
        }
      );
      return true;
    }

    if (owner && owner !== uid) {
      localStorage.setItem(`curriculosOutroUsuario_${Date.now()}`, JSON.stringify(local));
      localStorage.setItem(STORAGE_KEY, "[]");
    }

    localStorage.setItem(OWNER_KEY, uid);
    return true;
  }

  function mapaLocal(curriculos) {
    return new Map(curriculos.map((curriculo) => [idCurriculo(curriculo), assinatura(curriculo)]));
  }

  async function sincronizarAlteracoes(uid, anterior, curriculos) {
    const atual = mapaLocal(curriculos);
    const col = api.db.collection("usuarios").doc(uid).collection("curriculos");
    const batch = api.db.batch();
    let operacoes = 0;

    curriculos.forEach((curriculo) => {
      const id = idCurriculo(curriculo);
      if (anterior.get(id) === atual.get(id)) return;
      batch.set(col.doc(id), {
        ...curriculo,
        id,
        ownerUid: uid,
        tipoDocumento: "curriculo_site",
        sincronizadoEm: api.FieldValue.serverTimestamp()
      });
      operacoes += 1;
    });

    anterior.forEach((_, id) => {
      if (atual.has(id)) return;
      batch.delete(col.doc(id));
      operacoes += 1;
    });

    if (operacoes > 0) await batch.commit();
    return atual;
  }

  function vigiarLocal(uid) {
    let ultimoTexto = localStorage.getItem(STORAGE_KEY) || "[]";
    let anterior = mapaLocal(lerLocal());
    let fila = Promise.resolve();

    setInterval(() => {
      const atualTexto = localStorage.getItem(STORAGE_KEY) || "[]";
      if (atualTexto === ultimoTexto) return;
      ultimoTexto = atualTexto;
      const curriculos = lerLocal();

      fila = fila
        .then(async () => {
          anterior = await sincronizarAlteracoes(uid, anterior, curriculos);
        })
        .catch((erro) => {
          console.error("Falha ao sincronizar alteração do currículo:", erro);
        });
    }, 2500);
  }

  function vagaDaUrl() {
    const params = new URLSearchParams(location.search);
    const vagaId = params.get("vaga");
    const titulo = params.get("titulo");
    if (!vagaId || !titulo) return null;
    return {
      vagaId,
      titulo,
      empresa: params.get("empresa") || "",
      area: params.get("area") || "",
      modo: params.get("modo") || ""
    };
  }

  function mostrarVagaSelecionada(vaga) {
    if (!vaga || document.querySelector("#vaga-selecionada-firebase")) return;
    const hero = document.querySelector(".direct-hero") || document.querySelector(".page-hero");
    if (!hero) return;

    const aviso = document.createElement("div");
    aviso.id = "vaga-selecionada-firebase";
    aviso.className = "panel";
    aviso.style.marginTop = "16px";
    aviso.innerHTML = `
      <p class="small-label">VAGA SELECIONADA</p>
      <h3>${vaga.titulo}</h3>
      <p>${vaga.empresa ? vaga.empresa + " • " : ""}Você pode enviar um currículo criado no site ou um arquivo PDF que já possui.</p>
    `;
    hero.insertAdjacentElement("afterend", aviso);
  }

  function formatarTamanho(bytes) {
    if (!Number.isFinite(Number(bytes))) return "";
    const mb = Number(bytes) / (1024 * 1024);
    return `${mb.toFixed(mb >= 1 ? 1 : 2)} MB`;
  }

  async function submissaoExistente(uid, vagaId) {
    const id = `${uid}__${vagaId}`;
    const ref = api.db.collection("submissoes").doc(id);
    const snap = await ref.get();
    return { id, ref, snap };
  }

  async function apagarChunks(uid, ids = [], armazenamento = "submissoes") {
    if (!Array.isArray(ids) || !ids.length) return;

    if (armazenamento === "usuarios_curriculos") {
      const colLegada = api.db.collection("usuarios").doc(uid).collection("curriculos");
      for (let inicio = 0; inicio < ids.length; inicio += 20) {
        const batch = api.db.batch();
        ids.slice(inicio, inicio + 20).forEach((id) => batch.delete(colLegada.doc(id)));
        await batch.commit();
      }
      return;
    }

    const col = api.db.collection("submissoes");
    for (let inicio = 0; inicio < ids.length; inicio += 20) {
      const batch = api.db.batch();
      ids.slice(inicio, inicio + 20).forEach((id) => batch.delete(col.doc(id)));
      await batch.commit();
    }
  }

  async function salvarChunks(chunks) {
    const col = api.db.collection("submissoes");
    for (let inicio = 0; inicio < chunks.length; inicio += PDF_CHUNKS_POR_LOTE) {
      const batch = api.db.batch();
      chunks.slice(inicio, inicio + PDF_CHUNKS_POR_LOTE).forEach(({ id, dados }) => {
        batch.set(col.doc(id), dados);
      });
      await batch.commit();
    }
  }

  async function enviarPdfExterno(sessao, vaga, arquivo, atualizarStatus) {
    if (!arquivo) throw new Error("Selecione um arquivo PDF.");
    const pdfValido = arquivo.type === "application/pdf" || arquivo.name.toLowerCase().endsWith(".pdf");
    if (!pdfValido) throw new Error("Selecione um arquivo no formato PDF.");
    if (arquivo.size <= 0) throw new Error("O arquivo selecionado está vazio.");
    if (arquivo.size > MAX_PDF_BYTES) throw new Error("O PDF deve ter no máximo 8 MB.");

    const existente = await submissaoExistente(sessao.usuario.uid, vaga.vagaId);
    if (existente.snap.exists) {
      throw new Error("Você já encaminhou um currículo para esta vaga. Exclua o envio na área de Vagas antes de mandar outro.");
    }

    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    const totalPartes = Math.ceil(bytes.length / PDF_CHUNK_BYTES);
    const loteId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const ids = [];
    const chunks = [];

    for (let indice = 0; indice < totalPartes; indice += 1) {
      const inicio = indice * PDF_CHUNK_BYTES;
      const fim = Math.min(bytes.length, inicio + PDF_CHUNK_BYTES);
      const parte = bytes.slice(inicio, fim);
      const id = `pdfchunk__${sessao.usuario.uid}__${vaga.vagaId}__${loteId}__${String(indice).padStart(3, "0")}`;
      ids.push(id);
      chunks.push({
        id,
        dados: {
          tipoDocumento: "pdf_chunk",
          tipoCurriculo: "pdf_chunk",
          alunoUid: sessao.usuario.uid,
          alunoNome: sessao.perfil.nome,
          vagaId: vaga.vagaId,
          submissaoId: existente.id,
          arquivoNome: arquivo.name,
          indice,
          totalPartes,
          conteudo: firebase.firestore.Blob.fromUint8Array(parte),
          criadoEm: api.FieldValue.serverTimestamp()
        }
      });
    }

    atualizarStatus?.(`Enviando PDF (${totalPartes} parte${totalPartes === 1 ? "" : "s"})...`);

    try {
      await salvarChunks(chunks);
      await existente.ref.set({
        alunoUid: sessao.usuario.uid,
        alunoNome: sessao.perfil.nome,
        vagaId: vaga.vagaId,
        vagaTitulo: vaga.titulo,
        empresa: vaga.empresa,
        area: vaga.area,
        curriculoId: "",
        curriculoSnapshot: {
          nome: sessao.perfil.nome,
          tituloCurriculo: arquivo.name,
          vagaAlvo: vaga.titulo
        },
        tipoCurriculo: "pdf_externo",
        arquivoNome: arquivo.name,
        arquivoTamanho: arquivo.size,
        pdfChunkIds: ids,
        pdfArmazenamento: "submissoes",
        atualizadoEm: api.FieldValue.serverTimestamp(),
        status: "enviado"
      });
    } catch (erro) {
      await apagarChunks(sessao.usuario.uid, ids).catch(() => {});
      throw erro;
    }
  }

  function adicionarImportacaoPdf(sessao, vaga) {
    if (!vaga || document.querySelector("#pdf-externo-firebase")) return;
    const ancora = document.querySelector("#vaga-selecionada-firebase");
    if (!ancora) return;

    const box = document.createElement("section");
    box.id = "pdf-externo-firebase";
    box.className = "panel";
    box.style.marginTop = "12px";
    box.innerHTML = `
      <div class="section-head compact">
        <div>
          <p class="small-label">CURRÍCULO EXTERNO</p>
          <h2>Enviar um currículo em PDF</h2>
          <p>Use esta opção se você já possui um currículo pronto fora do site. O professor receberá exatamente o PDF enviado.</p>
        </div>
      </div>
      <div class="form-actions" style="align-items:center; flex-wrap:wrap;">
        <input id="pdf-externo-arquivo" type="file" accept=".pdf,application/pdf">
        <button id="pdf-externo-enviar" class="btn btn-primary" type="button">Enviar PDF para esta vaga</button>
      </div>
      <p id="pdf-externo-status" style="margin:12px 0 0; color:var(--muted);">Tamanho máximo: 8 MB.</p>
    `;
    ancora.insertAdjacentElement("afterend", box);

    const input = box.querySelector("#pdf-externo-arquivo");
    const botao = box.querySelector("#pdf-externo-enviar");
    const status = box.querySelector("#pdf-externo-status");

    botao.addEventListener("click", async () => {
      const arquivo = input.files?.[0];
      botao.disabled = true;
      botao.textContent = "Preparando envio...";

      try {
        await enviarPdfExterno(sessao, vaga, arquivo, (texto) => {
          status.textContent = texto;
        });
        status.textContent = `PDF enviado com sucesso: ${arquivo.name} (${formatarTamanho(arquivo.size)}).`;
        botao.textContent = "Enviado ✓";
        alert("Currículo em PDF encaminhado para a vaga com sucesso.");
        setTimeout(() => { location.href = "vagas.html"; }, 700);
      } catch (erro) {
        console.error("Falha ao enviar PDF:", erro);
        status.textContent = erro.message || "Não foi possível enviar o PDF.";
        botao.textContent = "Tentar novamente";
        botao.disabled = false;
      }
    });

    if (vaga.modo === "pdf") {
      setTimeout(() => box.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    }
  }

  function adicionarBotoesEnvio(sessao, vaga) {
    if (!vaga) return;
    const lista = document.querySelector("#lista-curriculos");
    if (!lista) return;

    function atualizar() {
      const curriculos = ordenar(lerLocal());
      [...lista.querySelectorAll(".saved-card")].forEach((card, indice) => {
        if (card.querySelector(".firebase-enviar-vaga")) return;
        const curriculo = curriculos[indice];
        if (!curriculo) return;

        const acoes = card.querySelector(".saved-actions") || card;
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "btn btn-primary btn-small firebase-enviar-vaga";
        botao.textContent = "Enviar para esta vaga";
        botao.addEventListener("click", async () => {
          botao.disabled = true;
          botao.textContent = "Enviando...";
          try {
            const existente = await submissaoExistente(sessao.usuario.uid, vaga.vagaId);
            if (existente.snap.exists) {
              throw new Error("Você já encaminhou um currículo para esta vaga. Exclua o envio na área de Vagas antes de mandar outro.");
            }

            await existente.ref.set({
              alunoUid: sessao.usuario.uid,
              alunoNome: sessao.perfil.nome,
              vagaId: vaga.vagaId,
              vagaTitulo: vaga.titulo,
              empresa: vaga.empresa,
              area: vaga.area,
              curriculoId: curriculo.id,
              curriculoSnapshot: snapshotLeve(curriculo),
              tipoCurriculo: "site",
              atualizadoEm: api.FieldValue.serverTimestamp(),
              status: "enviado"
            });
            botao.textContent = "Enviado ✓";
            alert("Currículo enviado para a vaga com sucesso.");
            setTimeout(() => { location.href = "vagas.html"; }, 500);
          } catch (erro) {
            console.error(erro);
            botao.textContent = "Tentar novamente";
            botao.disabled = false;
            alert(erro.message || "Não foi possível enviar o currículo. Verifique sua conexão.");
          }
        });
        acoes.appendChild(botao);
      });
    }

    atualizar();
    const observer = new MutationObserver(atualizar);
    observer.observe(lista, { childList: true });
  }

  async function iniciar() {
    const sessao = await api.exigirSessao("aluno");
    if (!sessao) return;
    api.decorarTopo(sessao);

    const pronta = await prepararSincronizacao(sessao);
    if (!pronta) return;
    vigiarLocal(sessao.usuario.uid);

    const vaga = vagaDaUrl();
    if (vaga) {
      localStorage.setItem("vagaSelecionadaFirebase", JSON.stringify(vaga));
      mostrarVagaSelecionada(vaga);
      adicionarImportacaoPdf(sessao, vaga);
      adicionarBotoesEnvio(sessao, vaga);
    }
  }

  iniciar().catch((erro) => console.error("Falha na área de currículos:", erro));
})();