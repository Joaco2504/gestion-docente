/**
 * Fábrica canónica de claves de consulta (Query Keys) para TanStack Query.
 * Permite invalidaciones granulares y coherentes en toda la aplicación.
 */
export const queryKeys = {
  dashboard: {
    all: ['dashboard'] as const,
    data: (docenteId: string | null | undefined, activeCicloId?: string | null | undefined) =>
      ['dashboard', 'data', docenteId, activeCicloId] as const,
    resumen: (docenteId: string | null | undefined) =>
      ['dashboard', 'resumen', docenteId] as const,
    agenda: (docenteId: string | null | undefined, dias = 15) =>
      ['dashboard', 'agenda', docenteId, dias] as const,
  },
  catedras: {
    all: ['catedras'] as const,
    list: (docenteId: string | null | undefined, cicloId?: string | null | undefined) =>
      ['catedras', 'list', docenteId, cicloId] as const,
    detail: (catedraId: string | null | undefined) =>
      ['catedras', 'detail', catedraId] as const,
    fullData: (catedraId: string | null | undefined) =>
      ['catedras', 'fullData', catedraId] as const,
    estudiantes: (catedraId: string | null | undefined) =>
      ['catedras', 'estudiantes', catedraId] as const,
    clases: (catedraId: string | null | undefined) =>
      ['catedras', 'clases', catedraId] as const,
    asistencias: (catedraId: string | null | undefined) =>
      ['catedras', 'asistencias', catedraId] as const,
    evaluaciones: (catedraId: string | null | undefined) =>
      ['catedras', 'evaluaciones', catedraId] as const,
    notas: (catedraId: string | null | undefined) =>
      ['catedras', 'notas', catedraId] as const,
    libroTemas: (catedraId: string | null | undefined) =>
      ['catedras', 'libroTemas', catedraId] as const,
    recursos: (catedraId: string | null | undefined) =>
      ['catedras', 'recursos', catedraId] as const,
  },
  mesas: {
    all: ['mesas'] as const,
    list: (docenteId: string | null | undefined) =>
      ['mesas', 'list', docenteId] as const,
    detail: (mesaId: string | null | undefined) =>
      ['mesas', 'detail', mesaId] as const,
  },
  instituciones: {
    all: ['instituciones'] as const,
    list: (docenteId: string | null | undefined) =>
      ['instituciones', 'list', docenteId] as const,
  },
  perfil: (userId: string | null | undefined) =>
    ['perfil', userId] as const,
};
