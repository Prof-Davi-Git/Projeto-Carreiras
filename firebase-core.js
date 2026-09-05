(() => {
  if (!window.firebase || !window.FIREBASE_CARREIRAS_CONFIG) {
    throw new Error("Firebase SDK ou configuração ausente.");
  }

  const app = firebase.apps.length
    ? firebase.app()
    : firebase.initializeApp(window.FIREBASE_CARREIRAS_CONFIG);

  const auth = firebase.auth();
  const db = firebase.firestore();
  const FieldValue = firebase.firestore.FieldValue;

  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

  const authPronto = new Promise((resolve) => {
    const cancelar = auth.onAuthStateChanged((usuario) => {
      cancelar();
      resolve(usuario || null);
    }, () => resolve(null));
  });

  function base64ParaBytes(valor) {
    const binario = atob(valor);
    return Uint8Array.from(binario, (caractere) => caractere.charCodeAt(0));
  }

  function bytesParaBase64(bytes) {
    let binario = "";
    bytes.forEach((byte) => {
      binario += String.fromCharCode(byte);
    });
    return btoa(binario);
  }

  async function calcularHashSenha(senha, aluno) {
    if (!window.crypto?.subtle) {
      throw new Error("Este navegador não possui o recurso necessário para validar a senha.");
    }

    const chaveBase = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(String(senha || "").trim().toUpperCase()),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const bits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt: base64ParaBytes(aluno.salt),
        iterations: Number(aluno.iteracoes) || 120000
      },
      chaveBase,
      256
    );

    return bytesParaBase64(new Uint8Array(bits));
  }

  function emailInternoAluno(indice) {
    const numero = String(Number(indice) + 1).padStart(3, "0");
    return `aluno${numero}@alunos.meufuturoprofissional.invalid`;
  }

  async function perfilDoUsuario(usuario = auth.currentUser) {
    if (!usuario) return null;
    const snap = await db.collection("usuarios").doc(usuario.uid).get();
    if (!snap.exists) return null;
    return { uid: usuario.uid, ...snap.data() };
  }

  async function sessaoAtual() {
    const usuario = await authPronto;
    if (!usuario) return null;
    const perfil = await perfilDoUsuario(usuario);
    return { usuario, perfil };
  }

  function codigoEhCredencialInvalida(codigo) {
    return [
      "auth/invalid-credential",
      "auth/user-not-found",
      "auth/wrong-password",
      "auth/invalid-login-credentials"
    ].includes(codigo);
  }

  async function loginAluno(indice, senha) {
    const alunos = Array.isArray(window.ALUNOS_AUTENTICACAO)
      ? window.ALUNOS_AUTENTICACAO
      : [];

    const posicao = Number(indice);
    const aluno = alunos[posicao];
    if (!aluno) throw new Error("Selecione seu nome antes de entrar.");

    const senhaLimpa = String(senha || "").trim().toUpperCase();
    if (!senhaLimpa) throw new Error("Digite sua senha.");

    const email = emailInternoAluno(posicao);
    let credencial = null;

    try {
      credencial = await auth.signInWithEmailAndPassword(email, senhaLimpa);
    } catch (erro) {
      if (!codigoEhCredencialInvalida(erro?.code)) throw erro;

      const hash = await calcularHashSenha(senhaLimpa, aluno);
      if (hash !== aluno.hash) {
        throw new Error("Senha incorreta. Confira os 6 últimos dígitos do RA + dígito.");
      }

      try {
        credencial = await auth.createUserWithEmailAndPassword(email, senhaLimpa);
      } catch (criacaoErro) {
        if (criacaoErro?.code === "auth/email-already-in-use") {
          throw new Error("Esta conta já foi criada. Digite a mesma senha utilizada no primeiro acesso.");
        }
        throw criacaoErro;
      }
    }

    const ref = db.collection("usuarios").doc(credencial.user.uid);
    const atual = await ref.get();

    if (!atual.exists) {
      await ref.set({
        nome: aluno.nome,
        role: "aluno",
        alunoIndice: posicao,
        emailInterno: email,
        criadoEm: FieldValue.serverTimestamp(),
        ultimoAcessoEm: FieldValue.serverTimestamp()
      });
    } else {
      const dados = atual.data() || {};
      if (dados.role !== "aluno") {
        await auth.signOut();
        throw new Error("Esta conta não possui perfil de aluno.");
      }
      await ref.set({ ultimoAcessoEm: FieldValue.serverTimestamp() }, { merge: true });
    }

    return { usuario: credencial.user, perfil: await perfilDoUsuario(credencial.user) };
  }

  async function loginProfessor(email, senha) {
    const credencial = await auth.signInWithEmailAndPassword(
      String(email || "").trim(),
      String(senha || "")
    );

    const perfil = await perfilDoUsuario(credencial.user);
    if (!perfil || perfil.role !== "professor") {
      await auth.signOut();
      throw new Error("Esta conta não possui acesso de professor.");
    }

    await db.collection("usuarios").doc(credencial.user.uid).set({
      ultimoAcessoEm: FieldValue.serverTimestamp()
    }, { merge: true });

    return { usuario: credencial.user, perfil };
  }

  async function sair() {
    await auth.signOut();
    localStorage.removeItem("firebaseSessaoPerfil");
    location.href = "login.html";
  }

  async function exigirSessao(role = null) {
    const usuario = await authPronto;
    if (!usuario) {
      const destino = encodeURIComponent(location.pathname.split("/").pop() + location.search);
      location.replace(`login.html?next=${destino}`);
      return null;
    }

    const perfil = await perfilDoUsuario(usuario);
    if (!perfil) {
      await auth.signOut();
      location.replace("login.html?erro=perfil");
      return null;
    }

    if (role && perfil.role !== role) {
      location.replace(perfil.role === "professor" ? "professor.html" : "curriculos.html");
      return null;
    }

    localStorage.setItem("firebaseSessaoPerfil", JSON.stringify({
      uid: usuario.uid,
      nome: perfil.nome || "",
      role: perfil.role || ""
    }));

    return { usuario, perfil };
  }

  function slug(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function decorarTopo(sessao) {
    const topo = document.querySelector(".topbar");
    if (!topo || document.querySelector("#firebase-user-tools")) return;

    const ferramentas = document.createElement("div");
    ferramentas.id = "firebase-user-tools";
    ferramentas.className = "firebase-user-tools";

    const nome = document.createElement("span");
    nome.className = "firebase-user-name";
    nome.textContent = sessao?.perfil?.nome || "Usuário";

    const sairBtn = document.createElement("button");
    sairBtn.type = "button";
    sairBtn.className = "btn btn-secondary btn-small";
    sairBtn.textContent = "Sair";
    sairBtn.addEventListener("click", sair);

    ferramentas.append(nome, sairBtn);
    topo.appendChild(ferramentas);
  }

  window.FirebaseCarreiras = Object.freeze({
    app,
    auth,
    db,
    FieldValue,
    authPronto,
    perfilDoUsuario,
    sessaoAtual,
    loginAluno,
    loginProfessor,
    sair,
    exigirSessao,
    decorarTopo,
    slug,
    emailInternoAluno
  });
})();
