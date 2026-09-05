(() => {
  const api = window.FirebaseCarreiras;
  if (!api) return;

  const alunos = Array.isArray(window.ALUNOS_AUTENTICACAO)
    ? window.ALUNOS_AUTENTICACAO
    : [];

  const selectAluno = document.querySelector("#login-aluno");
  const formAluno = document.querySelector("#form-login-aluno");
  const senhaAluno = document.querySelector("#login-senha");
  const erroAluno = document.querySelector("#login-erro");
  const btnAluno = document.querySelector("#btn-login-aluno");

  const formProfessor = document.querySelector("#form-login-professor");
  const emailProfessor = document.querySelector("#prof-email");
  const senhaProfessor = document.querySelector("#prof-senha");
  const erroProfessor = document.querySelector("#prof-erro");
  const btnProfessor = document.querySelector("#btn-login-professor");

  const tabAluno = document.querySelector("#tab-aluno");
  const tabProfessor = document.querySelector("#tab-professor");
  const painelAluno = document.querySelector("#painel-aluno");
  const painelProfessor = document.querySelector("#painel-professor");

  function mostrarErro(elemento, mensagem) {
    elemento.textContent = mensagem || "Não foi possível entrar.";
    elemento.classList.remove("hidden");
  }

  function limparErro(elemento) {
    elemento.textContent = "";
    elemento.classList.add("hidden");
  }

  function destinoPadrao(perfil) {
    const next = new URLSearchParams(location.search).get("next");
    if (next && !next.startsWith("http")) return next;
    return perfil?.role === "professor" ? "professor.html" : "curriculos.html";
  }

  alunos.forEach((aluno, indice) => {
    const option = document.createElement("option");
    option.value = String(indice);
    option.textContent = aluno.nome;
    selectAluno.appendChild(option);
  });

  function abrirAba(tipo) {
    const professor = tipo === "professor";
    tabAluno.classList.toggle("active", !professor);
    tabProfessor.classList.toggle("active", professor);
    painelAluno.classList.toggle("hidden", professor);
    painelProfessor.classList.toggle("hidden", !professor);
  }

  tabAluno.addEventListener("click", () => abrirAba("aluno"));
  tabProfessor.addEventListener("click", () => abrirAba("professor"));

  formAluno.addEventListener("submit", async (event) => {
    event.preventDefault();
    limparErro(erroAluno);
    btnAluno.disabled = true;
    btnAluno.textContent = "Entrando...";

    try {
      const sessao = await api.loginAluno(selectAluno.value, senhaAluno.value);
      location.replace(destinoPadrao(sessao.perfil));
    } catch (erro) {
      mostrarErro(erroAluno, erro?.message || "Não foi possível validar seu acesso.");
      senhaAluno.value = "";
      senhaAluno.focus();
    } finally {
      btnAluno.disabled = false;
      btnAluno.textContent = "Entrar";
    }
  });

  formProfessor.addEventListener("submit", async (event) => {
    event.preventDefault();
    limparErro(erroProfessor);
    btnProfessor.disabled = true;
    btnProfessor.textContent = "Entrando...";

    try {
      const sessao = await api.loginProfessor(emailProfessor.value, senhaProfessor.value);
      location.replace(destinoPadrao(sessao.perfil));
    } catch (erro) {
      mostrarErro(erroProfessor, erro?.message || "Acesso de professor não autorizado.");
      senhaProfessor.value = "";
      senhaProfessor.focus();
    } finally {
      btnProfessor.disabled = false;
      btnProfessor.textContent = "Entrar como professor";
    }
  });

  api.sessaoAtual().then((sessao) => {
    if (sessao?.perfil) {
      location.replace(destinoPadrao(sessao.perfil));
    }
  }).catch(() => {});
})();
