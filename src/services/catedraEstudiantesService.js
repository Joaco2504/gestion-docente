import { supabase as defaultSupabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Helper interno para leer override manual de condición desde localStorage como respaldo resiliente.
 */
function getLocalCondicionOverride(catedraId, estudianteId) {
  if (typeof window === 'undefined' || !window.localStorage) return { condicion_manual: null, motivo_condicion_manual: null };
  try {
    const raw = localStorage.getItem(`condicion_override_${catedraId}_${estudianteId}`);
    if (!raw || raw === 'AUTO' || raw === 'null') {
      return { condicion_manual: null, motivo_condicion_manual: null };
    }
    if (raw.trim().startsWith('{')) {
      const parsed = JSON.parse(raw);
      return {
        condicion_manual: parsed?.condicion_manual || null,
        motivo_condicion_manual: parsed?.motivo_condicion_manual || null
      };
    }
    return { condicion_manual: raw, motivo_condicion_manual: null };
  } catch (_) {
    return { condicion_manual: null, motivo_condicion_manual: null };
  }
}

/**
 * Servicio resiliente para obtener la nómina de estudiantes de una cátedra.
 * 
 * Evita joins implícitos ambiguos a actas_examen_detalle o actas_examen_alumnos
 * y estructura la carga de manera segregada y tolerante a fallos:
 * 1. Consulta limpia a `inscripciones` con datos de `estudiantes!inner` y `ciclos_lectivos`.
 * 2. Consulta no bloqueante de actas de examen para complementar el historial.
 * 3. Mapeo defensivo con fallbacks seguros.
 * 
 * @param {string} catedraId - ID de la cátedra
 * @param {Object} [options] - Opciones opcionales (cliente supabase custom, modo demo)
 * @returns {Promise<Array<Object>>} Lista de estudiantes normalizada y ordenada
 */
export async function getEstudiantesCatedra(catedraId, options = {}) {
  if (!catedraId) return [];

  const client = options.supabase || defaultSupabase;
  const isDemo = Boolean(options.isDemo);

  if (isSupabaseConfigured && !isDemo && client) {
    // 1. Obtener inscripciones con datos del estudiante (consulta unificada y normalizada)
    let inscripcionesData = null;

    const { data: resData, error: resErr } = await client
      .from('inscripciones')
      .select(`
        id,
        estudiante_id,
        catedra_id,
        ciclo_id,
        estado_academico,
        condicion,
        condicion_manual,
        motivo_condicion_manual,
        nota_final,
        nota_final_acreditacion,
        fecha_acreditacion,
        es_equivalencia,
        tiene_certificado_trabajo,
        resolucion_equivalencia,
        fecha_equivalencia,
        ciclos_lectivos ( id, nombre, anio ),
        estudiantes (
          id,
          nombre,
          apellido,
          dni
        )
      `)
      .eq('catedra_id', catedraId);

    if (resErr) {
      // Fallback 1 si las columnas condicion_manual / motivo_condicion_manual aún no fueron migradas en remoto
      const { data: resData2, error: resErr2 } = await client
        .from('inscripciones')
        .select(`
          id,
          estudiante_id,
          catedra_id,
          ciclo_id,
          estado_academico,
          condicion,
          nota_final,
          nota_final_acreditacion,
          fecha_acreditacion,
          es_equivalencia,
          tiene_certificado_trabajo,
          resolucion_equivalencia,
          fecha_equivalencia,
          ciclos_lectivos ( id, nombre, anio ),
          estudiantes (
            id,
            nombre,
            apellido,
            dni
          )
        `)
        .eq('catedra_id', catedraId);

      if (resErr2) {
        // Fallback 2 de contingencia si PostgREST rechaza alguna columna opcional
        console.warn('[catedraEstudiantesService] Reintentando con consulta base de inscripciones:', resErr2);
        const { data: fallbackData, error: fallbackErr } = await client
          .from('inscripciones')
          .select(`
            id,
            estudiante_id,
            catedra_id,
            ciclo_id,
            estado_academico,
            nota_final_acreditacion,
            fecha_acreditacion,
            estudiantes (
              id,
              nombre,
              apellido,
              dni
            )
          `)
          .eq('catedra_id', catedraId);

        if (fallbackErr) throw fallbackErr;
        inscripcionesData = fallbackData || [];
      } else {
        inscripcionesData = resData2 || [];
      }
    } else {
      inscripcionesData = resData || [];
    }

    // 2. Si necesitas el historial de actas de la cátedra, consultarlo por separado sin romper el render principal:
    let actasData = [];
    try {
      // Intentar consulta a actas_examen_detalle
      const { data: actasRes, error: errActas } = await client
        .from('actas_examen_detalle')
        .select('estudiante_id, nota_definitiva, resultado, created_at')
        .eq('catedra_id', catedraId);

      if (!errActas && actasRes) {
        actasData = actasRes;
      } else {
        // Fallback a actas_examen_alumnos vinculadas a mesas de esta cátedra
        const { data: actasAlumnos } = await client
          .from('actas_examen_alumnos')
          .select(`
            estudiante_id,
            alumno_dni,
            nota_definitiva,
            dictamen,
            created_at,
            mesas_examen!inner ( catedra_id )
          `)
          .eq('mesas_examen.catedra_id', catedraId);

        if (actasAlumnos) {
          actasData = actasAlumnos.map(a => ({
            estudiante_id: a.estudiante_id,
            alumno_dni: a.alumno_dni,
            nota_definitiva: a.nota_definitiva,
            resultado: a.dictamen,
            created_at: a.created_at
          }));
        }
      }
    } catch (eActas) {
      console.warn('Aviso no bloqueante al consultar actas de examen de cátedra:', eActas);
      actasData = [];
    }

    // 3. Mapear resultados de forma segura combinando los datos en memoria con fallbacks defensivos:
    const list = (inscripcionesData || [])
      .map(ins => {
        const est = ins.estudiantes || {};
        const condicion = ins.condicion || ins.estado_academico || 'REGULAR';
        const estado = ins.estado_academico ?? ins.condicion ?? 'CURSANDO';
        const notaFinal = ins.nota_final ?? ins.nota_final_acreditacion ?? null;
        const localOverride = getLocalCondicionOverride(catedraId, est.id);
        const condicionManual = ins.condicion_manual !== undefined
          ? ins.condicion_manual
          : localOverride.condicion_manual;
        const motivoCondicionManual = ins.motivo_condicion_manual !== undefined
          ? ins.motivo_condicion_manual
          : localOverride.motivo_condicion_manual;

        // Búsqueda del acta más reciente en memoria
        const actaMatch = (actasData || []).find(a => 
          (a.estudiante_id && a.estudiante_id === est.id) ||
          (a.alumno_dni && est.dni && String(a.alumno_dni).trim() === String(est.dni).trim())
        );

        return {
          id: est.id,
          nombre: est.nombre || '',
          apellido: est.apellido || '',
          dni: est.dni || '',
          inscripcion_id: ins.id,
          condicion_inscripcion: condicion,
          condicion,
          condicion_manual: condicionManual || null,
          motivo_condicion_manual: motivoCondicionManual || null,
          estado_academico: estado,
          nota_final_acreditacion: notaFinal,
          nota_final: notaFinal,
          fecha_acreditacion: ins.fecha_acreditacion || null,
          es_equivalencia: Boolean(ins.es_equivalencia),
          tiene_certificado_trabajo: Boolean(ins.tiene_certificado_trabajo),
          resolucion_equivalencia: ins.resolucion_equivalencia || null,
          fecha_equivalencia: ins.fecha_equivalencia || null,
          ciclo_id: ins.ciclo_id || null,
          ciclo_lectivo: ins.ciclos_lectivos || null,
          acta_reciente: actaMatch || null
        };
      })
      .filter(s => s && s.id);

    // Ordenamiento alfabético por apellido de forma segura
    list.sort((a, b) => (a.apellido || '').localeCompare(b.apellido || '', 'es'));
    return list;
  }

  // Modo Demo / Fallback local desde localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem(`estudiantes_${catedraId}`) || localStorage.getItem(`docentepro_demo_estudiantes_${catedraId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.map(s => {
            const localOverride = getLocalCondicionOverride(catedraId, s.id);
            return {
              ...s,
              condicion_manual: s.condicion_manual ?? localOverride.condicion_manual ?? null,
              motivo_condicion_manual: s.motivo_condicion_manual ?? localOverride.motivo_condicion_manual ?? null,
              estado_academico: s.estado_academico ?? 'CURSANDO',
              es_equivalencia: Boolean(s.es_equivalencia),
              tiene_certificado_trabajo: Boolean(s.tiene_certificado_trabajo),
              resolucion_equivalencia: s.resolucion_equivalencia || null,
              fecha_equivalencia: s.fecha_equivalencia || null,
              nota_final_acreditacion: s.nota_final_acreditacion ?? s.nota_final ?? null,
              nota_final: s.nota_final_acreditacion ?? s.nota_final ?? null
            };
          });
        }
      }
    } catch (err) {
      console.warn('Error leyendo estudiantes de localStorage:', err);
    }
  }

  // Muestra inicial de demostración si el almacenamiento está vacío
  const sample = [
    { id: 'est-1', dni: '40111222', apellido: 'Álvarez', nombre: 'Martín', estado_academico: 'CURSANDO', condicion_manual: null, motivo_condicion_manual: null },
    { id: 'est-2', dni: '39444555', apellido: 'Benítez', nombre: 'Lucía', estado_academico: 'ACREDITADO', nota_final_acreditacion: 9, nota_final: 9, condicion_manual: null, motivo_condicion_manual: null },
    { id: 'est-3', dni: '41888999', apellido: 'Castillo', nombre: 'Ignacio', estado_academico: 'CURSANDO', condicion_manual: null, motivo_condicion_manual: null },
    { id: 'est-4', dni: '38222333', apellido: 'Domínguez', nombre: 'Valentina', estado_academico: 'REGULAR', condicion_manual: null, motivo_condicion_manual: null },
    { id: 'est-5', dni: '42333444', apellido: 'Fernández', nombre: 'Santiago', estado_academico: 'CURSANDO', condicion_manual: null, motivo_condicion_manual: null }
  ];
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(`estudiantes_${catedraId}`, JSON.stringify(sample));
    } catch (_) {}
  }

  return sample;
}

/**
 * Actualiza el override manual de condición académica para un estudiante en la cátedra.
 * Si condicionManual es null, restaura el cálculo automático.
 */
export async function actualizarCondicionManual(catedraId, estudianteId, condicionManual = null, motivoManual = '', options = {}) {
  const client = options.supabase || defaultSupabase;
  const isDemo = Boolean(options.isDemo);
  const normalizedManual = condicionManual && condicionManual !== 'AUTO' ? condicionManual : null;
  const normalizedMotivo = normalizedManual && motivoManual ? String(motivoManual).trim() : null;

  // 1. Guardar inmediatamente en localStorage como caché y respaldo
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      if (normalizedManual) {
        localStorage.setItem(
          `condicion_override_${catedraId}_${estudianteId}`,
          JSON.stringify({
            condicion_manual: normalizedManual,
            motivo_condicion_manual: normalizedMotivo
          })
        );
      } else {
        localStorage.removeItem(`condicion_override_${catedraId}_${estudianteId}`);
      }

      ['estudiantes_', 'docentepro_demo_estudiantes_'].forEach(prefix => {
        const stored = localStorage.getItem(`${prefix}${catedraId}`);
        if (stored) {
          const list = JSON.parse(stored);
          if (Array.isArray(list)) {
            const updated = list.map(st => st.id === estudianteId ? {
              ...st,
              condicion_manual: normalizedManual,
              motivo_condicion_manual: normalizedMotivo
            } : st);
            localStorage.setItem(`${prefix}${catedraId}`, JSON.stringify(updated));
          }
        }
      });
    } catch (_) {}
  }

  // 2. Persistir en public.inscripciones en Supabase
  if (isSupabaseConfigured && !isDemo && client) {
    try {
      const { error } = await client
        .from('inscripciones')
        .update({
          condicion_manual: normalizedManual,
          motivo_condicion_manual: normalizedMotivo,
          ...(normalizedManual ? { condicion: normalizedManual } : {})
        })
        .eq('catedra_id', catedraId)
        .eq('estudiante_id', estudianteId);

      if (error) {
        // Fallback si las columnas condicion_manual / motivo_condicion_manual aún no existen en remoto
        await client
          .from('inscripciones')
          .update({
            condicion: normalizedManual || 'REGULAR',
            observaciones: normalizedManual
              ? `[MANUAL:${normalizedManual}]${normalizedMotivo ? ` ${normalizedMotivo}` : ''}`
              : null
          })
          .eq('catedra_id', catedraId)
          .eq('estudiante_id', estudianteId);
      }
    } catch (e) {
      console.warn('[catedraEstudiantesService] Aviso al persistir condicion_manual en BD:', e);
    }
  }

  return {
    condicion_manual: normalizedManual,
    motivo_condicion_manual: normalizedMotivo
  };
}

/**
 * Actualiza el estado del certificado de trabajo de un estudiante en la cátedra.
 */
export async function actualizarCertificadoTrabajo(catedraId, estudianteId, tieneCertificado, options = {}) {
  const client = options.supabase || defaultSupabase;
  const isDemo = Boolean(options.isDemo);

  if (isSupabaseConfigured && !isDemo && client) {
    try {
      const { error } = await client
        .from('inscripciones')
        .update({ tiene_certificado_trabajo: Boolean(tieneCertificado) })
        .eq('catedra_id', catedraId)
        .eq('estudiante_id', estudianteId);
      if (error) {
        console.warn('[catedraEstudiantesService] Error al actualizar certificado de trabajo en BD:', error);
      }
    } catch (e) {
      console.warn('[catedraEstudiantesService] Excepción al actualizar certificado de trabajo:', e);
    }
  }

  // Actualizar localStorage / cache
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem(`estudiantes_${catedraId}`);
      if (stored) {
        const list = JSON.parse(stored);
        const updated = list.map(st => st.id === estudianteId ? { ...st, tiene_certificado_trabajo: Boolean(tieneCertificado) } : st);
        localStorage.setItem(`estudiantes_${catedraId}`, JSON.stringify(updated));
      }
    } catch (_) {}
  }
}

/**
 * Declara la acreditación por equivalencia reglamentaria para un estudiante en la cátedra.
 */
export async function declararEquivalencia(catedraId, estudianteId, { resolucion = '', fecha = '' } = {}, options = {}) {
  const client = options.supabase || defaultSupabase;
  const isDemo = Boolean(options.isDemo);
  const fechaEquiv = fecha || new Date().toISOString().split('T')[0];

  if (isSupabaseConfigured && !isDemo && client) {
    try {
      const { error } = await client
        .from('inscripciones')
        .update({
          es_equivalencia: true,
          resolucion_equivalencia: resolucion || null,
          fecha_equivalencia: fechaEquiv,
          condicion: 'ACREDITADA_EQUIVALENCIA',
          estado_academico: 'ACREDITADO'
        })
        .eq('catedra_id', catedraId)
        .eq('estudiante_id', estudianteId);
      if (error) {
        console.warn('[catedraEstudiantesService] Error al declarar equivalencia en BD:', error);
      }
    } catch (e) {
      console.warn('[catedraEstudiantesService] Excepción al declarar equivalencia:', e);
    }
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem(`estudiantes_${catedraId}`);
      if (stored) {
        const list = JSON.parse(stored);
        const updated = list.map(st => st.id === estudianteId ? {
          ...st,
          es_equivalencia: true,
          resolucion_equivalencia: resolucion || null,
          fecha_equivalencia: fechaEquiv,
          condicion: 'ACREDITADA_EQUIVALENCIA',
          estado_academico: 'ACREDITADO'
        } : st);
        localStorage.setItem(`estudiantes_${catedraId}`, JSON.stringify(updated));
      }
    } catch (_) {}
  }
}

/**
 * Revierte la condición de equivalencia volviendo al alumno a condición regular cursante.
 */
export async function revertirEquivalencia(catedraId, estudianteId, options = {}) {
  const client = options.supabase || defaultSupabase;
  const isDemo = Boolean(options.isDemo);

  if (isSupabaseConfigured && !isDemo && client) {
    try {
      const { error } = await client
        .from('inscripciones')
        .update({
          es_equivalencia: false,
          resolucion_equivalencia: null,
          fecha_equivalencia: null,
          condicion: 'REGULAR',
          estado_academico: 'CURSANDO'
        })
        .eq('catedra_id', catedraId)
        .eq('estudiante_id', estudianteId);
      if (error) {
        console.warn('[catedraEstudiantesService] Error al revertir equivalencia en BD:', error);
      }
    } catch (e) {
      console.warn('[catedraEstudiantesService] Excepción al revertir equivalencia:', e);
    }
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem(`estudiantes_${catedraId}`);
      if (stored) {
        const list = JSON.parse(stored);
        const updated = list.map(st => st.id === estudianteId ? {
          ...st,
          es_equivalencia: false,
          resolucion_equivalencia: null,
          fecha_equivalencia: null,
          condicion: 'REGULAR',
          estado_academico: 'CURSANDO'
        } : st);
        localStorage.setItem(`estudiantes_${catedraId}`, JSON.stringify(updated));
      }
    } catch (_) {}
  }
}
