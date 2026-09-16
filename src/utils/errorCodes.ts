/**
 * Diccionario y Procesador de Errores Amigables para Docentes
 * Mapea errores técnicos de PostgreSQL, PostgREST y Supabase a códigos institucionales comprensibles.
 */

export interface ErrorDocenteInfo {
  codigo: string;
  mensaje: string;
  originalError?: any;
}

export const DICCIONARIO_ERRORES: Record<string, { codigo: string; mensaje: string }> = {
  CONFLICTO_MATRICULA: {
    codigo: 'ERR-763',
    mensaje: 'El estudiante ya se encuentra matriculado o registrado en esta cátedra.'
  },
  CICLO_ACADEMICO: {
    codigo: 'ERR-412',
    mensaje: 'No se pudieron sincronizar las fechas del ciclo lectivo. Se ha dado aviso a soporte técnico.'
  },
  ACTAS_EXAMEN: {
    codigo: 'ERR-521',
    mensaje: 'No se pudieron registrar las notas de la mesa de examen. Se guardó copia para reintento.'
  },
  SESION_EXPIRADA: {
    codigo: 'ERR-101',
    mensaje: 'Tu sesión de usuario ha expirado. Por favor, vuelve a iniciar sesión.'
  },
  DEFAULT: {
    codigo: 'ERR-999',
    mensaje: 'Se detectó una interrupción temporal en la conexión. El equipo técnico ha sido notificado.'
  }
};

/**
 * Analiza un error arrojado por Supabase / PostgREST / red y devuelve un código institucional y mensaje amigable
 */
export function procesarErrorDocente(error: any): ErrorDocenteInfo {
  if (!error) {
    return {
      codigo: DICCIONARIO_ERRORES.DEFAULT.codigo,
      mensaje: DICCIONARIO_ERRORES.DEFAULT.mensaje
    };
  }

  const errorString = (
    (typeof error === 'string' ? error : '') +
    ' ' +
    (error?.message || '') +
    ' ' +
    (error?.details || '') +
    ' ' +
    (error?.hint || '') +
    ' ' +
    (error?.code || '')
  ).toLowerCase();

  // 1. Conflicto de unicidad / ya matriculado (PostgreSQL 23505)
  if (
    errorString.includes('on conflict') || 
    errorString.includes('unique constraint') || 
    errorString.includes('23505') ||
    errorString.includes('duplicate key') ||
    errorString.includes('estudiantes_docente_id_dni_idx')
  ) {
    return {
      codigo: DICCIONARIO_ERRORES.CONFLICTO_MATRICULA.codigo,
      mensaje: DICCIONARIO_ERRORES.CONFLICTO_MATRICULA.mensaje,
      originalError: error
    };
  }

  // 2. Problemas con ciclos / períodos lectivos
  if (
    errorString.includes('periodos_academicos') ||
    errorString.includes('ciclos_lectivos') ||
    errorString.includes('ciclo_id') ||
    errorString.includes('periodo')
  ) {
    return {
      codigo: DICCIONARIO_ERRORES.CICLO_ACADEMICO.codigo,
      mensaje: DICCIONARIO_ERRORES.CICLO_ACADEMICO.mensaje,
      originalError: error
    };
  }

  // 3. Fallo en persistencia de actas de examen
  if (
    errorString.includes('actas_examen_alumnos') ||
    errorString.includes('actas_examen_detalle') ||
    errorString.includes('actas_examen') ||
    errorString.includes('guardar_acta_examen_lote') ||
    errorString.includes('registrar_resultado_examen') ||
    errorString.includes('mesas_examen')
  ) {
    return {
      codigo: DICCIONARIO_ERRORES.ACTAS_EXAMEN.codigo,
      mensaje: DICCIONARIO_ERRORES.ACTAS_EXAMEN.mensaje,
      originalError: error
    };
  }

  // 4. Fallos de autenticación, JWT o permisos RLS
  if (
    errorString.includes('jwt') ||
    errorString.includes('token') ||
    errorString.includes('unauthorized') ||
    errorString.includes('pgrst301') ||
    errorString.includes('row-level security') ||
    errorString.includes('permission denied')
  ) {
    return {
      codigo: DICCIONARIO_ERRORES.SESION_EXPIRADA.codigo,
      mensaje: DICCIONARIO_ERRORES.SESION_EXPIRADA.mensaje,
      originalError: error
    };
  }

  // 5. Fallback por defecto
  return {
    codigo: DICCIONARIO_ERRORES.DEFAULT.codigo,
    mensaje: DICCIONARIO_ERRORES.DEFAULT.mensaje,
    originalError: error
  };
}
