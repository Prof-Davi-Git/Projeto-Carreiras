(() => {
  const TURMAS = [
    {
      escolaId: "ee-professor-armando-gomes-de-araujo",
      escolaNome: "EE Professor Armando Gomes de Araujo",
      turmaId: "ee-professor-armando-gomes-de-araujo__3a",
      turmaNome: "3ºA",
      ativa: true
    }
  ];

  const VAGAS_BASE = [
    {
      id: "assistente-de-suporte-de-ti",
      titulo: "Assistente de Suporte de TI",
      empresa: "Conecta Tech",
      nivel: "Iniciante",
      area: "Tecnologia",
      atividades: [
        "Auxiliar usuários com dúvidas básicas de informática.",
        "Registrar e acompanhar chamados de suporte.",
        "Trabalhar em conjunto com a equipe técnica."
      ],
      competencias: "Comunicação, organização, responsabilidade e trabalho em equipe.",
      escolaId: "ee-professor-armando-gomes-de-araujo",
      escolaNome: "EE Professor Armando Gomes de Araujo",
      turmaId: "ee-professor-armando-gomes-de-araujo__3a",
      turmaNome: "3ºA",
      statusProcesso: "atual",
      datasEntrevista: [
        "2026-09-04",
        "2026-09-11",
        "2026-09-14",
        "2026-09-17",
        "2026-09-21",
        "2026-09-24"
      ],
      baseSistema: true,
      ordemBase: 0,
      ativo: true,
      criadoEmIso: "2026-09-01T09:00:00-03:00"
    },
    {
      id: "auxiliar-administrativo",
      titulo: "Auxiliar Administrativo",
      empresa: "Nova Gestão Serviços",
      nivel: "Iniciante",
      area: "Administrativo",
      atividades: [
        "Organizar documentos e arquivos da empresa.",
        "Atualizar planilhas e cadastros internos.",
        "Apoiar a equipe em rotinas administrativas."
      ],
      competencias: "Organização, atenção, responsabilidade e domínio básico de informática.",
      escolaId: "ee-professor-armando-gomes-de-araujo",
      escolaNome: "EE Professor Armando Gomes de Araujo",
      turmaId: "ee-professor-armando-gomes-de-araujo__3a",
      turmaNome: "3ºA",
      statusProcesso: "proxima",
      datasEntrevista: [],
      baseSistema: true,
      ordemBase: 1,
      ativo: true,
      criadoEmIso: "2026-09-02T09:00:00-03:00"
    }
  ];

  window.CARREIRAS_TURMAS = Object.freeze(TURMAS.map((item) => Object.freeze({ ...item })));
  window.CARREIRAS_TURMA_PADRAO = window.CARREIRAS_TURMAS[0];
  window.CARREIRAS_VAGAS_BASE = Object.freeze(VAGAS_BASE.map((item) => Object.freeze({
    ...item,
    atividades: Object.freeze([...(item.atividades || [])]),
    datasEntrevista: Object.freeze([...(item.datasEntrevista || [])])
  })));
})();
