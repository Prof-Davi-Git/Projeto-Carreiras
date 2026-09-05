# Configuração Firebase — Meu Futuro Profissional

A integração foi desenvolvida na branch `firebase-integracao` para manter o `main` estável durante os testes.

## 1. Authentication

Método utilizado: **E-mail/senha**.

Os alunos não precisam informar e-mail. No primeiro acesso, o site valida a senha já usada no Projeto de Redes e cria uma conta Firebase com um e-mail interno técnico.

O professor usa e-mail e senha reais em um acesso separado.

## 2. Firestore Rules

No Firebase Console:

1. Abra **Cloud Firestore**.
2. Entre na aba **Regras**.
3. Substitua o conteúdo pelo arquivo `firestore.rules` deste repositório.
4. Clique em **Publicar**.

As regras garantem que:

- cada aluno só leia e altere os próprios currículos;
- cada aluno só veja as próprias submissões e avaliações;
- apenas o professor possa publicar notas e feedbacks;
- o professor possa visualizar os currículos enviados pelos alunos.

## 3. Primeiro acesso dos alunos

1. O aluno seleciona o próprio nome.
2. Digita a mesma senha usada no Projeto de Redes: 6 últimos dígitos do RA + dígito.
3. O site compara a senha com o hash PBKDF2 existente.
4. Se estiver correta, a conta Firebase é criada automaticamente.
5. Nos próximos acessos, a autenticação é feita diretamente pelo Firebase.

## 4. Currículos antigos

Ao entrar na área de Currículos pela primeira vez, se o navegador já possuir currículos locais, o aluno poderá escolher se deseja importá-los para a própria conta online.

O backup JSON continua disponível como segurança adicional.

## 5. Conta do professor

A conta do professor deve ser criada manualmente no Firebase Console para impedir que alguém se registre como professor.

### Authentication

Em **Authentication > Usuários**, crie o usuário com o e-mail e a senha escolhidos pelo professor.

Copie o `UID` gerado.

### Firestore

Na coleção `usuarios`, crie um documento com ID igual ao UID do professor e os campos:

- `nome`: nome que será exibido no painel;
- `role`: `professor`.

Depois disso, o professor poderá entrar pelo botão **Professor** da página `login.html`.

## 6. Avaliação

O Painel do Professor registra:

- nota do currículo: 0 a 10;
- comunicação e clareza: 0 a 2;
- domínio do currículo: 0 a 2;
- adequação à vaga: 0 a 2;
- resolução da situação-problema: 0 a 2;
- postura profissional: 0 a 2;
- nota total da entrevista: soma dos cinco critérios, totalizando 10;
- data da entrevista;
- feedback escrito.

O aluno visualiza a nota e o feedback na área **Entrevistas**.
