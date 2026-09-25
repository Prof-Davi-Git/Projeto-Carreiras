(() => {
  const api = window.FirebaseCarreiras;
  if (!api) return;

  const ESCOLA_ID = "ee-professor-armando-gomes-de-araujo";
  const TURMA_ANTIGA_ID = "ee-professor-armando-gomes-de-araujo__3a";
  const TURMA_NOVA_ID = "ee-professor-armando-gomes-de-araujo__2a";
  const TURMA_NOVA_NOME = "2ºA";

  window.CARREIRAS_MIGRACAO_TURMA_PRONTA = (async () => {
    const sessao = await api.exigirSessao("professor");
    if (!sessao) return;

    const snap = await api.db.collection("vagas")
      .where("professorUid", "==", sessao.usuario.uid)
      .get();

    const antigas = snap.docs.filter((doc) => {
      const vaga = doc.data() || {};
      return vaga.escolaId === ESCOLA_ID
        && (vaga.turmaId === TURMA_ANTIGA_ID || vaga.turmaNome === "3ºA");
    });

    if (!antigas.length) return;

    const batch = api.db.batch();
    antigas.forEach((doc) => {
      batch.set(doc.ref, {
        turmaId: TURMA_NOVA_ID,
        turmaNome: TURMA_NOVA_NOME,
        atualizadoEm: api.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    await batch.commit();
    console.info(`Migração concluída: ${antigas.length} vaga(s) movida(s) para a turma 2ºA.`);
  })().catch((erro) => {
    console.warn("A migração automática da turma 3ºA para 2ºA não pôde ser concluída.", erro);
  });
})();
