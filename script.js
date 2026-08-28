document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#perfil-form");
  const aviso = document.querySelector("#aviso-salvo");

  if (!form) return;

  const campos = [
    "nome",
    "area",
    "objetivo",
    "competencias",
    "desenvolver"
  ];

  const dadosSalvos = JSON.parse(localStorage.getItem("perfilProfissional") || "{}");

  campos.forEach((campo) => {
    const elemento = document.querySelector(`#${campo}`);
    if (elemento && dadosSalvos[campo]) {
      elemento.value = dadosSalvos[campo];
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const dados = {};
    campos.forEach((campo) => {
      const elemento = document.querySelector(`#${campo}`);
      dados[campo] = elemento ? elemento.value.trim() : "";
    });

    localStorage.setItem("perfilProfissional", JSON.stringify(dados));

    if (aviso) {
      aviso.classList.add("show");
      setTimeout(() => aviso.classList.remove("show"), 3000);
    }
  });
});