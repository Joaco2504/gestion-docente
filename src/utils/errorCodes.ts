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

  // 1. Sesión y Token JWT
  if (
    lowerText.includes('jwt') ||
    lowerText.includes('token') ||
    lowerText.includes('unauthorized') ||
    lowerText.includes('pgrst301') ||
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

  // 6. Evaluaciones
  if (
    lowerText.includes('evaluaciones') ||
    lowerText.includes('evaluacion')
  ) {
    return {
      codigo: DICCIONARIO_ERRORES["evaluaciones"].codigo,
      mensaje: DICCIONARIO_ERRORES["evaluaciones"].mensaje,
      originalError: error
    };
  }

  // 7. Calificaciones y Notas
  if (
    lowerText.includes('notas') ||
    lowerText.includes('calificacion') ||
    lowerText.includes('calificaciones')
  ) {
    return {
      codigo: DICCIONARIO_ERRORES["notas"].codigo,
      mensaje: DICCIONARIO_ERRORES["notas"].mensaje,
      originalError: error
    };
  }

  // 8. Asistencias e Inasistencias
  if (
    lowerText.includes('asistencias') ||
    lowerText.includes('asistencia') ||
    lowerText.includes('inasistencias_docente')
  ) {
    return {
      codigo: DICCIONARIO_ERRORES["asistencias"].codigo,
      mensaje: DICCIONARIO_ERRORES["asistencias"].mensaje,
      originalError: error
    };
  }

  // 9. Clases y Libro de Temas
  if (
    lowerText.includes('clases') ||
    lowerText.includes('clase') ||
    lowerText.includes('libro_temas') ||
    lowerText.includes('temas_dictados')
  ) {
    return {
      codigo: DICCIONARIO_ERRORES["clases"].codigo,
      mensaje: DICCIONARIO_ERRORES["clases"].mensaje,
      originalError: error
    };
  }

  // 10. Inscripciones y Estado Académico
  if (
    lowerText.includes('inscripciones') ||
    lowerText.includes('inscripcion') ||
    lowerText.includes('estado_academico') ||
    lowerText.includes('nota_final_acreditacion')
  ) {
    return {
      codigo: DICCIONARIO_ERRORES["inscripciones"].codigo,
      mensaje: DICCIONARIO_ERRORES["inscripciones"].mensaje,
      originalError: error
    };
  }

  // 11. Estudiantes / Nómina
  if (
    lowerText.includes('estudiantes') ||
    lowerText.includes('estudiante') ||
    lowerText.includes('matricul') ||
    lowerText.includes('alumno')
  ) {
    return {
      codigo: DICCIONARIO_ERRORES["estudiantes"].codigo,
      mensaje: DICCIONARIO_ERRORES["estudiantes"].mensaje,
      originalError: error
    };
  }

  // 11. Períodos académicos y ciclos
  if (
    lowerText.includes('periodos_academicos') ||
    lowerText.includes('ciclos_lectivos') ||
    lowerText.includes('ciclo_id') ||
    lowerText.includes('periodo')
  ) {
    return {
      codigo: DICCIONARIO_ERRORES["periodos_academicos"].codigo,
      mensaje: DICCIONARIO_ERRORES["periodos_academicos"].mensaje,
      originalError: error
    };
  }

  // 12. Cátedras
  if (
    lowerText.includes('catedras') ||
    lowerText.includes('catedra')
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
