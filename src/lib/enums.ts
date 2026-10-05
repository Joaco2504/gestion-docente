/**
 * Definiciones canónicas de Dominios, Enums, Tipos y Constantes para Korum.
 * 
 * Centraliza los valores válidos para evitar strings mágicos, inconsistencias
 * entre frontend y base de datos, y garantizar coherencia con las restricciones CHECK de PostgreSQL.
 */

// ============================================================================
// 1. Asistencias
// ============================================================================
export const ESTADO_ASISTENCIA = {
  PRESENTE: 'PRESENTE',
  AUSENTE: 'AUSENTE'
} as const;

export type EstadoAsistencia = typeof ESTADO_ASISTENCIA[keyof typeof ESTADO_ASISTENCIA];

export const LABELS_ESTADO_ASISTENCIA: Record<EstadoAsistencia, string> = {
  PRESENTE: 'Presente',
  AUSENTE: 'Ausente'
};

// ============================================================================
// 2. Calificaciones y Notas
// ============================================================================
export const ESTADO_NOTA = {
  CALIFICADO: 'CALIFICADO',
  NO_ENTREGO: 'NO_ENTREGO',
  AUSENTE: 'AUSENTE'
} as const;

export type EstadoNota = typeof ESTADO_NOTA[keyof typeof ESTADO_NOTA];

export const LABELS_ESTADO_NOTA: Record<EstadoNota, string> = {
  CALIFICADO: 'Calificado',
  NO_ENTREGO: 'No Entregó',
  AUSENTE: 'Ausente'
};

// ============================================================================
// 3. Evaluaciones
// ============================================================================
export const TIPO_EVALUACION = {
  PARCIAL: 'PARCIAL',
  TP: 'TP',
  RECUPERATORIO: 'RECUPERATORIO',
  PRUEBA: 'PRUEBA',
  FINAL: 'FINAL',
  COLOQUIO: 'COLOQUIO'
} as const;

export type TipoEvaluacion = typeof TIPO_EVALUACION[keyof typeof TIPO_EVALUACION];

export const LABELS_TIPO_EVALUACION: Record<TipoEvaluacion, string> = {
  PARCIAL: 'Parcial',
  TP: 'Trabajo Práctico',
  RECUPERATORIO: 'Recuperatorio',
  PRUEBA: 'Prueba',
  FINAL: 'Examen Final',
  COLOQUIO: 'Coloquio'
};

export const FORMATO_EVALUACION = {
  ESCRITO: 'Escrito',
  ORAL: 'Oral'
} as const;

export type FormatoEvaluacion = typeof FORMATO_EVALUACION[keyof typeof FORMATO_EVALUACION];

// ============================================================================
// 4. Estado Académico / Condición Estudiantil (RAM)
// ============================================================================
export const ESTADO_ACADEMICO = {
  CURSANDO: 'CURSANDO',
  REGULAR: 'REGULAR',
  PROMOCIONAL: 'PROMOCIONAL',
  LIBRE: 'LIBRE',
  APROBADO: 'APROBADO',
  DESAPROBADO: 'DESAPROBADO'
} as const;

export type EstadoAcademico = typeof ESTADO_ACADEMICO[keyof typeof ESTADO_ACADEMICO];

export const LABELS_ESTADO_ACADEMICO: Record<EstadoAcademico, string> = {
  CURSANDO: 'Cursando',
  REGULAR: 'Regular',
  PROMOCIONAL: 'Promocional',
  LIBRE: 'Libre',
  APROBADO: 'Aprobado',
  DESAPROBADO: 'Desaprobado'
};

// ============================================================================
// 5. Nivel Educativo
// ============================================================================
export const NIVEL_EDUCATIVO = {
  SECUNDARIO: 'SECUNDARIO',
  SUPERIOR: 'SUPERIOR',
  TERCIARIO: 'TERCIARIO',
  UNIVERSITARIO: 'UNIVERSITARIO',
  PRIMARIO: 'PRIMARIO'
} as const;

export type NivelEducativo = typeof NIVEL_EDUCATIVO[keyof typeof NIVEL_EDUCATIVO];

export const LABELS_NIVEL_EDUCATIVO: Record<NivelEducativo, string> = {
  SECUNDARIO: 'Nivel Secundario',
  SUPERIOR: 'Nivel Superior',
  TERCIARIO: 'Nivel Terciario',
  UNIVERSITARIO: 'Nivel Universitario',
  PRIMARIO: 'Nivel Primario'
};

// ============================================================================
// 6. Modalidad de Cursado
// ============================================================================
export const MODALIDAD_CURSADO = {
  PRESENCIAL: 'Presencial',
  VIRTUAL: 'Virtual',
  HIBRIDA: 'Híbrida',
  SEMIPRESENCIAL: 'Semipresencial'
} as const;

export type ModalidadCursado = typeof MODALIDAD_CURSADO[keyof typeof MODALIDAD_CURSADO];

// ============================================================================
// 7. Categorías de Recursos
// ============================================================================
export const CATEGORIA_RECURSO = {
  APUNTE: 'APUNTE',
  TP: 'TP',
  PARCIAL: 'PARCIAL',
  PLANIFICACION: 'PLANIFICACION',
  BIBLIOGRAFIA: 'BIBLIOGRAFIA'
} as const;

export type CategoriaRecurso = typeof CATEGORIA_RECURSO[keyof typeof CATEGORIA_RECURSO];

export const LABELS_CATEGORIA_RECURSO: Record<CategoriaRecurso, string> = {
  APUNTE: 'Apunte / Material Teórico',
  TP: 'Trabajo Práctico / Guía',
  PARCIAL: 'Examen / Parcial',
  PLANIFICACION: 'Planificación / Programa',
  BIBLIOGRAFIA: 'Bibliografía Obligatoria'
};

export const TIPO_ORIGEN_RECURSO = {
  LOCAL: 'LOCAL',
  GOOGLE_LINK: 'GOOGLE_LINK'
} as const;

export type TipoOrigenRecurso = typeof TIPO_ORIGEN_RECURSO[keyof typeof TIPO_ORIGEN_RECURSO];

// ============================================================================
// 8. Períodos Académicos
// ============================================================================
export const TIPO_PERIODO = {
  PRIMER_CUATRIMESTRE: 'PRIMER_CUATRIMESTRE',
  RECESO_INVERNAL: 'RECESO_INVERNAL',
  SEGUNDO_CUATRIMESTRE: 'SEGUNDO_CUATRIMESTRE',
  ANUAL: 'ANUAL',
  OTRO: 'OTRO'
} as const;

export type TipoPeriodo = typeof TIPO_PERIODO[keyof typeof TIPO_PERIODO];

export const LABELS_TIPO_PERIODO: Record<TipoPeriodo, string> = {
  PRIMER_CUATRIMESTRE: '1° Cuatrimestre',
  RECESO_INVERNAL: 'Receso Invernal',
  SEGUNDO_CUATRIMESTRE: '2° Cuatrimestre',
  ANUAL: 'Período Anual',
  OTRO: 'Período Especial'
};

// ============================================================================
// 9. Roles de Usuario
// ============================================================================
export const ROL_USUARIO = {
  DOCENTE: 'docente',
  SUPERADMIN: 'superadmin'
} as const;

export type RolUsuario = typeof ROL_USUARIO[keyof typeof ROL_USUARIO];

// ============================================================================
// 10. Eventos de Calendario
// ============================================================================
export const TIPO_EVENTO = {
  CLASE: 'CLASE',
  REUNION: 'REUNION',
  TRIBUNAL_EXAMEN: 'TRIBUNAL_EXAMEN',
  PERIODO: 'PERIODO',
  OTRO: 'OTRO'
} as const;

export type TipoEvento = typeof TIPO_EVENTO[keyof typeof TIPO_EVENTO];

// ============================================================================
// 11. Funciones de Normalización Defensivas
// ============================================================================

/**
 * Normaliza cualquier variante de tipo de evaluación al valor canónico en mayúsculas.
 */
export function normalizeTipoEvaluacion(raw: unknown): TipoEvaluacion {
  const norm = String(raw || '').toUpperCase().trim();
  if (norm === 'PARCIAL' || norm.includes('PARCIAL')) return TIPO_EVALUACION.PARCIAL;
  if (norm === 'TP' || norm.includes('TRABAJO') || norm.includes('PRÁCTICO') || norm.includes('PRACTICO')) return TIPO_EVALUACION.TP;
  if (norm === 'RECUPERATORIO' || norm.includes('RECUP')) return TIPO_EVALUACION.RECUPERATORIO;
  if (norm === 'PRUEBA') return TIPO_EVALUACION.PRUEBA;
  if (norm === 'FINAL') return TIPO_EVALUACION.FINAL;
  if (norm === 'COLOQUIO') return TIPO_EVALUACION.COLOQUIO;
  return TIPO_EVALUACION.PARCIAL;
}

/**
 * Normaliza cualquier variante de estado académico al valor canónico del RAM.
 */
export function normalizeEstadoAcademico(raw: unknown): EstadoAcademico {
  const norm = String(raw || '').toUpperCase().trim();
  if (norm === 'CURSANDO') return ESTADO_ACADEMICO.CURSANDO;
  if (norm === 'REGULAR') return ESTADO_ACADEMICO.REGULAR;
  if (norm === 'PROMOCIONAL' || norm === 'PROMOCIONADO' || norm === 'PROMOCION') return ESTADO_ACADEMICO.PROMOCIONAL;
  if (norm === 'LIBRE') return ESTADO_ACADEMICO.LIBRE;
  if (norm === 'APROBADO') return ESTADO_ACADEMICO.APROBADO;
  if (norm === 'DESAPROBADO') return ESTADO_ACADEMICO.DESAPROBADO;
  return ESTADO_ACADEMICO.CURSANDO;
}

/**
 * Normaliza tipo de período académico.
 */
export function normalizeTipoPeriodo(raw: unknown): TipoPeriodo {
  const norm = String(raw || '').toUpperCase().trim();
  if (norm === 'PRIMER_CUATRIMESTRE' || norm === '1_CUATRIMESTRE' || norm === '1ER_CUATRIMESTRE') return TIPO_PERIODO.PRIMER_CUATRIMESTRE;
  if (norm === 'RECESO_INVERNAL' || norm === 'RECESO' || norm === 'INVIERNO') return TIPO_PERIODO.RECESO_INVERNAL;
  if (norm === 'SEGUNDO_CUATRIMESTRE' || norm === '2_CUATRIMESTRE' || norm === '2DO_CUATRIMESTRE') return TIPO_PERIODO.SEGUNDO_CUATRIMESTRE;
  if (norm === 'ANUAL') return TIPO_PERIODO.ANUAL;
  return TIPO_PERIODO.OTRO;
}

/**
 * Normaliza categoría de recurso para cumplir estrictamente con recursos_categoria_check.
 */
export function normalizeCategoriaRecurso(raw: unknown): CategoriaRecurso {
  const norm = String(raw || '').toUpperCase().trim();
  if (norm === 'APUNTE' || norm.includes('TEOR')) return CATEGORIA_RECURSO.APUNTE;
  if (norm === 'TP' || norm.includes('TRABAJO') || norm.includes('GUIA') || norm.includes('GUÍA')) return CATEGORIA_RECURSO.TP;
  if (norm === 'PARCIAL' || norm.includes('EVALUAC') || norm.includes('EXAM')) return CATEGORIA_RECURSO.PARCIAL;
  if (norm === 'PLANIFICACION' || norm.includes('PROGRAMA') || norm.includes('PLAN')) return CATEGORIA_RECURSO.PLANIFICACION;
  if (norm === 'BIBLIOGRAFIA' || norm.includes('LIBRO') || norm.includes('TEXTO')) return CATEGORIA_RECURSO.BIBLIOGRAFIA;
  return CATEGORIA_RECURSO.APUNTE;
}
