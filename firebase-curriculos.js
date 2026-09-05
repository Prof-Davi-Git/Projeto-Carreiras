(() => {
  const api = window.FirebaseCarreiras;
  if (!api) return;

  const STORAGE_KEY = "curriculosProfissionais";
  const OWNER_KEY = "curriculosOwnerUid";

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

  async function enviarTudo(uid, curriculos) {
    const col = api.db.collection("usuarios").doc(uid).collection("curriculos");
    const atuais = await col.get();
    const batch = api.db.batch();
    const idsLocais = new Set();

    curriculos.forEach((curriculo) => {
      const id = String(curriculo.id || api.slug(curriculo.tituloCurriculo || Date.now()));
      idsLocais.add(id);
      batch.set(col.doc(id), {
        ...curriculo,
        id,
        ownerUid: uid,
        sincronizadoEm: api.FieldValue.serverTimestamp()
      });
    });

    atuais.forEach((doc) => {
      if (!idsLocais.has(doc.id)) batch.delete(doc.ref);
    });

    await batch.commit();
  }

  async function carregarNuvem(uid) {
    const snap = await api.db.collection("usuarios").doc(uid).collection("curriculos").get();
    return snap.docs.map((doc) => {
      const dados = doc.data();
      delete dados.sincronizadoEm;
      delete dados.ownerUid;
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
        if (!sessionStorage.getItem("firebaseCurriculosRecarregados")) {
          sessionStorage.setItem("firebaseCurriculosRecarregados", "1");
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

  function vigiarLocal(uid) {
    let ultimo = localStorage.getItem(STORAGE_KEY) || "[]";
    let ocupada = false;

    setInterval(async () => {
      const atual = localStorage.getItem(STORAGE_KEY) || "[]";
      if (atual === ultimo || ocupada) return;
      ultimo = atual;
      ocupada = true;
      try {
        await enviarTudo(uid, lerLocal());
      } catch (erro) {
        console.error("Falha ao sincronizar currículos:", erro);
      } finally {
        ocupada = false;
      }
    }, 1200);
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
      area: params.get("area") || ""
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
      <p>${vaga.empresa ? vaga.empresa + " • " : ""}Crie ou adapte um currículo e depois envie a versão escolhida para esta oportunidade.</p>
    `;
    hero.insertAdjacentElement("afterend", aviso);
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
            const id = `${sessao.usuario.uid}__${vaga.vagaId}`;
            await api.db.collection("submissoes").doc(id).set({
              alunoUid: sessao.usuario.uid,
              alunoNome: sessao.perfil.nome,
              vagaId: vaga.vagaId,
              vagaTitulo: vaga.titulo,
              empresa: vaga.empresa,
              area: vaga.area,
              curriculoId: curriculo.id,
              curriculoSnapshot: curriculo,
              atualizadoEm: api.FieldValue.serverTimestamp(),
              status: "enviado"
            }, { merge: true });
            botao.textContent = "Enviado ✓";
            alert("Currículo enviado para a vaga com sucesso.");
          } catch (erro) {
            console.error(erro);
            botao.textContent = "Tentar novamente";
            alert("Não foi possível enviar o currículo. Verifique sua conexão.");
          } finally {
            botao.disabled = false;
          }
        });
        acoes.appendChild(botao);
      });
    }

    atualizar();
    const observer = new MutationObserver(atualizar);
    observer.observe(lista, { childList: true, subtree: true });
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
      adicionarBotoesEnvio(sessao, vaga);
    }
  }

  iniciar().catch((erro) => console.error("Falha na área de currículos:", erro));
})();
