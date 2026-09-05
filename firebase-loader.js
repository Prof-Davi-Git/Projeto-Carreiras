(() => {
  const atual = document.currentScript?.src || location.href;
  const local = (arquivo) => new URL(arquivo, atual).href;

  function carregar(src) {
    return new Promise((resolve, reject) => {
      const existente = [...document.scripts].find((s) => s.src === src);
      if (existente) {
        if (existente.dataset.loaded === "true") resolve();
        else existente.addEventListener("load", resolve, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        resolve();
      }, { once: true });
      script.addEventListener("error", () => reject(new Error(`Falha ao carregar ${src}`)), { once: true });
      document.head.appendChild(script);
    });
  }

  async function iniciar() {
    try {
      await carregar("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
      await carregar("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js");
      await carregar("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js");
      await carregar(local("firebase-config.js?v=20260905-1"));
      await carregar(local("alunos-auth.js?v=20260905-1"));
      await carregar(local("firebase-core.js?v=20260905-1"));

      const pagina = (location.pathname.split("/").pop() || "index.html").toLowerCase();
      const scripts = {
        "login.html": "firebase-login.js",
        "curriculos.html": "firebase-curriculos.js",
        "vagas.html": "firebase-vagas.js",
        "entrevistas.html": "firebase-entrevistas.js",
        "professor.html": "professor.js"
      };

      if (scripts[pagina]) {
        await carregar(local(`${scripts[pagina]}?v=20260905-1`));
      }
    } catch (erro) {
      console.error("Firebase não pôde ser iniciado:", erro);
      const aviso = document.createElement("div");
      aviso.className = "firebase-global-error";
      aviso.textContent = "Não foi possível conectar ao sistema online. Atualize a página e tente novamente.";
      document.body.prepend(aviso);
    }
  }

  iniciar();
})();
