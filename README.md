# Meu Futuro Profissional

Projeto da disciplina **Carreira e Competências para o Mercado de Trabalho**.

O site foi simplificado para três áreas principais:

- **Currículos** — criação de várias versões de currículo, personalização de layout e cores, foto profissional, visualização pronta e exportação para PDF.
- **Vagas** — oportunidades definidas pelo professor para que os alunos preparem currículos direcionados.
- **Entrevistas** — agenda das entrevistas e orientações de preparação.

## Currículos

Cada aluno pode criar e salvar diferentes versões do currículo para vagas diferentes. O editor permite adicionar livremente formação, experiências, cursos, habilidades, competências, idiomas e projetos.

Há três layouts prontos: **Clássico, Moderno e Compacto**. Também existem quatro temas de cor: **Azul, Verde, Vinho e Grafite**.

A foto é opcional e deve ter aparência profissional.

O botão **Visualizar** mostra o currículo no formato final de documento. A opção **Exportar / Salvar PDF** utiliza a impressão do navegador já preparada para tamanho A4.

## Armazenamento temporário

Enquanto o Firebase ainda não estiver configurado, os currículos ficam salvos no `localStorage` do navegador. Os botões **Baixar backup** e **Carregar backup** permitem transportar os dados entre computadores.

 futuramente o projeto poderá utilizar Firebase para login, armazenamento dos currículos e envio das versões escolhidas ao professor/recrutador.