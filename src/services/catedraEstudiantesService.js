import { supabase as defaultSupabase, isSupabaseConfigured } from '../lib/supabase';

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
        nota_final,
        nota_final_acreditacion,
        fecha_acreditacion,
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
      // Fallback de contingencia si PostgREST rechaza alguna columna opcional
      console.warn('[catedraEstudiantesService] Reintentando con consulta base de inscripciones:', resErr);
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
          estado_academico: estado,
          nota_final_acreditacion: notaFinal,
          nota_final: notaFinal,
          fecha_acreditacion: ins.fecha_acreditacion || null,
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
      const stored = localStorage.getItem(`estudiantes_${catedraId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.map(s => ({
            ...s,
            estado_academico: s.estado_academico ?? 'CURSANDO',
            nota_final_acreditacion: s.nota_final_acreditacion ?? s.nota_final ?? null,
            nota_final: s.nota_final_acreditacion ?? s.nota_final ?? null
          }));
        }
      }
    } catch (err) {
      console.warn('Error leyendo estudiantes de localStorage:', err);
    }
  }

  // Muestra inicial de demostración si el almacenamiento está vacío
  const sample = [
    { id: 'est-1', dni: '40111222', apellido: 'Álvarez', nombre: 'Martín', estado_academico: 'CURSANDO' },
    { id: 'est-2', dni: '39444555', apellido: 'Benítez', nombre: 'Lucía', estado_academico: 'ACREDITADO', nota_final_acreditacion: 9, nota_final: 9 },
    { id: 'est-3', dni: '41888999', apellido: 'Castillo', nombre: 'Ignacio', estado_academico: 'CURSANDO' },
    { id: 'est-4', dni: '38222333', apellido: 'Domínguez', nombre: 'Valentina', estado_academico: 'REGULAR' },
    { id: 'est-5', dni: '42333444', apellido: 'Fernández', nombre: 'Santiago', estado_academico: 'CURSANDO' }
  ];
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(`estudiantes_${catedraId}`, JSON.stringify(sample));
    } catch (_) {}
  }

  return sample;
}
