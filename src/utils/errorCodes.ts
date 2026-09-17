/**
 * Diccionario y Procesador de Errores Amigables para Docentes
 * Mapea errores técnicos de PostgreSQL, PostgREST y Supabase a códigos institucionales comprensibles,
 * garantizando que NUNCA se devuelva un mensaje SQL o técnico al usuario.
 */

export interface ErrorDocenteInfo {
  codigo: string;
  mensaje: string;
  originalError?: any;
}

export const DICCIONARIO_ERRORES: Record<string, ErrorDocenteInfo> = {
  // Calificaciones y Evaluaciones
  "notas": {
    codigo: "ERR-515",
    mensaje: "No se pudo registrar la calificación del estudiante. Reintente en unos instantes."
  },
  "evaluaciones": {
    codigo: "ERR-516",
    mensaje: "No se pudo crear o actualizar la evaluación."
  },
  // Matrícula y Alumnos
  "ON CONFLICT": {
    codigo: "ERR-763",
    mensaje: "El alumno ya se encuentra matriculado o registrado en esta lista."
  },
  "estudiantes": {
    codigo: "ERR-760",
    mensaje: "No se pudo actualizar la información del estudiante."
  },
  "inscripciones": {
    codigo: "ERR-765",
    mensaje: "No se pudo sincronizar la inscripción o condición final del estudiante."
  },
  // Asistencias y Clases
  "asistencias": {
    codigo: "ERR-310",
    mensaje: "No se pudo asentar el registro de asistencia de la clase."
  },
  "clases": {
    codigo: "ERR-311",
    mensaje: "No se pudo guardar la información de la clase o tema dictado."
  },
  // Períodos y Cátedras
  "periodos_academicos": {
    codigo: "ERR-412",
    mensaje: "No se pudieron sincronizar las fechas del ciclo lectivo."
  },
  "catedras": {
    codigo: "ERR-201",
    mensaje: "Inconveniente al actualizar la información de la cátedra."
  },
  // Mesas de Examen
  "actas_examen_detalle": {
    codigo: "ERR-521",
    mensaje: "No se pudieron asentar las notas de la mesa de examen."
  },
  "mesas_examen": {
    codigo: "ERR-520",
    mensaje: "No se pudo crear o actualizar la mesa de examen."
  },
  // Infraestructura y Sesión
  "schema cache": {
    codigo: "ERR-901",
    mensaje: "El esquema de datos fue actualizado. Por favor recargue la página."
  },
  "jwt": {
    codigo: "ERR-101",
    mensaje: "Su sesión ha expirado. Inicie sesión nuevamente."
  },
  "DEFAULT": {
    codigo: "ERR-999",
    mensaje: "Ocurrió un error inesperado al procesar la operación. El equipo técnico ha sido notificado."
  }
};

// Retrocompatibilidad con nombres anteriores
(DICCIONARIO_ERRORES as any).CONFLICTO_MATRICULA = DICCIONARIO_ERRORES["ON CONFLICT"];
(DICCIONARIO_ERRORES as any).CICLO_ACADEMICO = DICCIONARIO_ERRORES["periodos_academicos"];
(DICCIONARIO_ERRORES as any).ACTAS_EXAMEN = DICCIONARIO_ERRORES["actas_examen_detalle"];
(DICCIONARIO_ERRORES as any).SESION_EXPIRADA = DICCIONARIO_ERRORES["jwt"];

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

  const rawStr = typeof error === 'string' ? error : '';
  const messageStr = error?.message || '';
  const detailsStr = error?.details || '';
  const hintStr = error?.hint || '';
  const codeStr = error?.code || '';

  const fullText = `${rawStr} ${messageStr} ${detailsStr} ${hintStr} ${codeStr}`;
  const lowerText = fullText.toLowerCase();

  // 0. Detectar y aislar excepciones nativas de JavaScript (ReferenceError, TypeError, SyntaxError, etc.)
  // Estas NUNCA deben asociarse a errores de la base de datos (evita falsos positivos como ERR-311 por variables con 'clases')
  const isNativeJsError = 
    error instanceof ReferenceError ||
    error instanceof TypeError ||
    error instanceof RangeError ||
    error instanceof SyntaxError ||
    (error instanceof Error && ['ReferenceError', 'TypeError', 'RangeError', 'SyntaxError', 'URIError'].includes(error.name)) ||
    (error?.name && ['ReferenceError', 'TypeError', 'RangeError', 'SyntaxError', 'URIError'].includes(error.name));

  if (isNativeJsError && !error?.code && !error?.details && !error?.hint && !error?.status && !error?.statusCode) {
    return {
      codigo: DICCIONARIO_ERRORES.DEFAULT.codigo,
      mensaje: DICCIONARIO_ERRORES.DEFAULT.mensaje,
      originalError: error
    };
  }

  // Indicador de error originado en API / PostgREST / PostgreSQL
  const hasDbSignal = Boolean(codeStr) || Boolean(detailsStr) || Boolean(hintStr) || 
    lowerText.includes('postgrest') || lowerText.includes('postgres') || 
    lowerText.includes('relation') || lowerText.includes('table') || 
    lowerText.includes('column') || lowerText.includes('foreign key') || 
    lowerText.includes('violates');

  // 1. Sesión y Token JWT
  if (
    lowerText.includes('jwt') ||
    lowerText.includes('token') ||
    lowerText.includes('unauthorized') ||
    lowerText.includes('pgrst301') ||
    lowerText.includes('pgrst303') ||
    lowerText.includes('jwt expired') ||
    lowerText.includes('sesión') ||
    lowerText.includes('sesion') ||
    lowerText.includes('permission denied') ||
    lowerText.includes('row-level security')
  ) {
    return {
      codigo: DICCIONARIO_ERRORES["jwt"].codigo,
      mensaje: DICCIONARIO_ERRORES["jwt"].mensaje,
      originalError: error
    };
  }

  // 2. Schema cache / PostgREST schema reloads
  if (
    lowerText.includes('schema cache') ||
    lowerText.includes('could not find the table') ||
    lowerText.includes('pgrst200') ||
    lowerText.includes('cache lookup failed')
  ) {
    return {
      codigo: DICCIONARIO_ERRORES["schema cache"].codigo,
      mensaje: DICCIONARIO_ERRORES["schema cache"].mensaje,
      originalError: error
    };
  }

  // 3. Conflicto de unicidad / duplicado / ON CONFLICT (Postgres 23505)
  if (
    fullText.includes('ON CONFLICT') ||
    lowerText.includes('on conflict') ||
    lowerText.includes('unique constraint') ||
    lowerText.includes('23505') ||
    lowerText.includes('duplicate key') ||
    lowerText.includes('estudiantes_docente_id_dni_idx') ||
    lowerText.includes('estudiantes_pkey')
  ) {
    return {
      codigo: DICCIONARIO_ERRORES["ON CONFLICT"].codigo,
      mensaje: DICCIONARIO_ERRORES["ON CONFLICT"].mensaje,
      originalError: error
    };
  }

  // 4. Actas de examen / persistencia de mesa
  if (
    lowerText.includes('actas_examen_detalle') ||
    lowerText.includes('actas_examen_alumnos') ||
    lowerText.includes('actas_examen') ||
    lowerText.includes('guardar_acta_examen_lote') ||
    lowerText.includes('registrar_resultado_examen')
  ) {
    return {
      codigo: DICCIONARIO_ERRORES["actas_examen_detalle"].codigo,
      mensaje: DICCIONARIO_ERRORES["actas_examen_detalle"].mensaje,
      originalError: error
    };
  }

  // 5. Mesas de examen
  if (
    lowerText.includes('mesas_examen') ||
    lowerText.includes('mesa_examen') ||
    lowerText.includes('mesa_id') ||
    lowerText.includes('tribunal')
  ) {
    return {
      codigo: DICCIONARIO_ERRORES["mesas_examen"].codigo,
      mensaje: DICCIONARIO_ERRORES["mesas_examen"].mensaje,
      originalError: error
    };
  }

  // 6. Evaluaciones (requiere señal de DB o coincidencia de palabra completa)
  if (
    (hasDbSignal && /\b(evaluaciones|evaluacion)\b/i.test(fullText)) ||
    lowerText.includes('public.evaluaciones') ||
    lowerText.includes('table "evaluaciones"')
  ) {
    return {
      codigo: DICCIONARIO_ERRORES["evaluaciones"].codigo,
      mensaje: DICCIONARIO_ERRORES["evaluaciones"].mensaje,
      originalError: error
    };
  }

  // 7. Calificaciones y Notas (solo si es error genuino de DB/API o coincidencia exacta de tabla)
  if (
    (hasDbSignal && /\b(notas|nota|calificacion|calificaciones)\b/i.test(fullText)) ||
    lowerText.includes('public.notas') ||
    lowerText.includes('table "notas"') ||
    Boolean(detailsStr && /\b(notas|nota)\b/i.test(detailsStr))
  ) {
    return {
      codigo: DICCIONARIO_ERRORES["notas"].codigo,
      mensaje: DICCIONARIO_ERRORES["notas"].mensaje,
      originalError: error
    };
  }

  // 8. Asistencias e Inasistencias
  if (
    (hasDbSignal && /\b(asistencias|asistencia|inasistencias_docente)\b/i.test(fullText)) ||
    lowerText.includes('public.asistencias') ||
    lowerText.includes('table "asistencias"')
  ) {
    return {
      codigo: DICCIONARIO_ERRORES["asistencias"].codigo,
      mensaje: DICCIONARIO_ERRORES["asistencias"].mensaje,
      originalError: error
    };
  }

  // 9. Clases y Libro de Temas (solo ante errores genuinos de API/DB, jamás en ReferenceError/TypeError)
  if (
    (hasDbSignal && /\b(clases|clase|libro_temas|temas_dictados)\b/i.test(fullText)) ||
    lowerText.includes('public.clases') ||
    lowerText.includes('table "clases"') ||
    Boolean(detailsStr && /\b(clases|clase)\b/i.test(detailsStr))
  ) {
    return {
      codigo: DICCIONARIO_ERRORES["clases"].codigo,
      mensaje: DICCIONARIO_ERRORES["clases"].mensaje,
      originalError: error
    };
  }

  // 10. Inscripciones y Estado Académico
  if (
    (hasDbSignal && /\b(inscripciones|inscripcion|estado_academico|nota_final_acreditacion)\b/i.test(fullText)) ||
    lowerText.includes('public.inscripciones') ||
    lowerText.includes('table "inscripciones"')
  ) {
    return {
      codigo: DICCIONARIO_ERRORES["inscripciones"].codigo,
      mensaje: DICCIONARIO_ERRORES["inscripciones"].mensaje,
      originalError: error
    };
  }

  // 11. Estudiantes / Nómina
  if (
    (hasDbSignal && /\b(estudiantes|estudiante|matricul|alumno)\b/i.test(fullText)) ||
    lowerText.includes('public.estudiantes') ||
    lowerText.includes('table "estudiantes"')
  ) {
    return {
      codigo: DICCIONARIO_ERRORES["estudiantes"].codigo,
      mensaje: DICCIONARIO_ERRORES["estudiantes"].mensaje,
      originalError: error
    };
  }

  // 12. Períodos académicos y ciclos
  if (
    lowerText.includes('periodos_academicos') ||
    lowerText.includes('ciclos_lectivos') ||
    lowerText.includes('ciclo_id')
  ) {
    return {
      codigo: DICCIONARIO_ERRORES["periodos_academicos"].codigo,
      mensaje: DICCIONARIO_ERRORES["periodos_academicos"].mensaje,
      originalError: error
    };
  }

  // 13. Cátedras
  if (
    (hasDbSignal && /\b(catedras|catedra)\b/i.test(fullText)) ||
    lowerText.includes('public.catedras') ||
    lowerText.includes('table "catedras"')
  ) {
    return {
      codigo: DICCIONARIO_ERRORES["catedras"].codigo,
      mensaje: DICCIONARIO_ERRORES["catedras"].mensaje,
      originalError: error
    };
  }

  // Fallback por defecto
  return {
    codigo: DICCIONARIO_ERRORES.DEFAULT.codigo,
    mensaje: DICCIONARIO_ERRORES.DEFAULT.mensaje,
    originalError: error
  };
}
