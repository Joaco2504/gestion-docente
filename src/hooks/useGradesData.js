import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { calcularCondicionFinal, calcularPorcentajeAsistencia } from '../lib/academicLogic';
import { calculateStudentRisk } from '../lib/earlyWarningLogic';
import { getEstudiantesCatedra } from '../services/catedraEstudiantesService';
import { getEvaluacionesCatedra } from '../services/evaluacionesService';
import { handleAppError } from '../utils/handleAppError';
import { toast } from 'sonner';

/**
 * useGradesData
 * Hook desacoplado para consulta unificada de evaluaciones, notas, estudiantes,
 * métricas grupales reactivas y mutaciones optimistas con persistencia en Supabase.
 */
export function useGradesData({
  catedraId,
  academicLevel = 'TERCIARIO',
  modalidad = 'ANUAL',
  isDemo = false,
  user = null
}) {
  const [estudiantes, setEstudiantes] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [notas, setNotas] = useState([]);
  const [clases, setClases] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [inasistenciasDocente, setInasistenciasDocente] = useState([]);
  const [loading, setLoading] = useState(true);
  const [criterios, setCriterios] = useState({
    min_asist_promo: 80,
    min_asist_reg: 70,
    nota_min_promo: 7,
    nota_min_reg: 4,
    nota_min_sec: 6
  });

  const fetchData = useCallback(async () => {
    if (!catedraId) return;
    setLoading(true);

    try {
      if (isSupabaseConfigured && !isDemo) {
        // 1. Cargar estudiantes de la cátedra
        const estList = await getEstudiantesCatedra(catedraId);
        setEstudiantes(estList || []);

        // 2. Cargar evaluaciones
        const evList = await getEvaluacionesCatedra(catedraId);
        setEvaluaciones(evList || []);

        // 3. Cargar notas de las evaluaciones activas
        const evIds = (evList || [])
          .map(e => e.id)
          .filter(id => !String(id).startsWith('eval-'));

        if (evIds.length > 0) {
          const { data: notasData, error: notasError } = await supabase
            .from('notas')
            .select('*')
            .in('evaluacion_id', evIds);

          if (!notasError) {
            setNotas(notasData || []);
          }
        } else {
          setNotas([]);
        }

        // 4. Cargar clases, criterios e inasistencias docentes
        const [clasesRes, inasDocRes, critRes] = await Promise.all([
          supabase.from('clases').select('id, fecha, estado, caracter, caracter_clase').eq('catedra_id', catedraId),
          supabase.from('inasistencias_docente').select('*').eq('catedra_id', catedraId),
          supabase
            .from('criterios_evaluacion')
            .select('min_asist_promo, min_asist_reg, min_asist_trabajo, nota_min_promo, nota_min_reg, nota_min_sec')
            .eq('catedra_id', catedraId)
            .maybeSingle()
        ]);

        const rawClases = clasesRes.data || [];
        setClases(rawClases);
        setInasistenciasDocente(inasDocRes.data || []);

        if (critRes.data) {
          setCriterios({
            min_asist_promo: Number(critRes.data.min_asist_promo) || 80,
            min_asist_reg: Number(critRes.data.min_asist_reg) || 70,
            min_asist_trabajo: Number(critRes.data.min_asist_trabajo) || 60,
            nota_min_promo: Number(critRes.data.nota_min_promo) || 7,
            nota_min_reg: Number(critRes.data.nota_min_reg) || 4,
            nota_min_sec: Number(critRes.data.nota_min_sec) || 6
          });
        }

        // 5. Cargar asistencias vinculadas por clase_id (asistencias no posee columna catedra_id)
        const claseIds = rawClases.map(c => c.id).filter(Boolean);
        if (claseIds.length > 0) {
          const { data: asistData, error: asistErr } = await supabase
            .from('asistencias')
            .select('id, clase_id, estudiante_id, estado, updated_at')
            .in('clase_id', claseIds);

          if (!asistErr) {
            setAsistencias(asistData || []);
          } else {
            setAsistencias([]);
          }
        } else {
          setAsistencias([]);
        }
      } else {
        // Modo demo / sin Supabase (soporte unificado de claves con y sin prefijo)
        const storedEst = localStorage.getItem(`docentepro_demo_estudiantes_${catedraId}`) || localStorage.getItem(`estudiantes_${catedraId}`);
        const storedEv = localStorage.getItem(`docentepro_demo_evaluaciones_${catedraId}`) || localStorage.getItem(`evaluaciones_${catedraId}`);
        const storedNotas = localStorage.getItem(`docentepro_demo_notas_${catedraId}`) || localStorage.getItem(`notas_${catedraId}`);
        const storedClases = localStorage.getItem(`docentepro_demo_clases_${catedraId}`) || localStorage.getItem(`clases_${catedraId}`);
        const storedAsist = localStorage.getItem(`docentepro_demo_asistencias_${catedraId}`) || localStorage.getItem(`asistencias_${catedraId}`);
        const storedCrit = localStorage.getItem(`criterios_${catedraId}`);

        setEstudiantes(storedEst ? JSON.parse(storedEst) : []);
        setEvaluaciones(storedEv ? JSON.parse(storedEv) : []);
        setNotas(storedNotas ? JSON.parse(storedNotas) : []);
        setClases(storedClases ? JSON.parse(storedClases) : []);
        setAsistencias(storedAsist ? JSON.parse(storedAsist) : []);
        if (storedCrit) {
          try {
            setCriterios(prev => ({ ...prev, ...JSON.parse(storedCrit) }));
          } catch (_) {}
        }
      }
    } catch (err) {
      handleAppError(err, 'useGradesData / fetchData', user);
    } finally {
      setLoading(false);
    }
  }, [catedraId, isDemo, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Mapa de notas por estudiante y evaluación: `${estudianteId}_${evaluacionId}` -> nota
  const notasMap = useMemo(() => {
    const map = new Map();
    notas.forEach(n => {
      const key = `${n.estudiante_id}_${n.evaluacion_id}`;
      map.set(key, n);
    });
    return map;
  }, [notas]);

  const getNotaValue = useCallback((estId, evalId) => {
    const n = notasMap.get(`${estId}_${evalId}`);
    if (!n) return null;
    return n.valor ?? n.nota ?? null;
  }, [notasMap]);

  const getNotaEstado = useCallback((estId, evalId) => {
    const n = notasMap.get(`${estId}_${evalId}`);
    return n?.estado ?? null;
  }, [notasMap]);

  // Mapa de porcentaje de asistencia por estudiante
  const asistenciaPorEstudiante = useMemo(() => {
    const map = new Map();
    const clasesComputables = (clases || []).filter(
      c => c.estado !== 'DOCENTE_AUSENTE' && c.caracter !== 'FERIADO' && c.caracter_clase !== 'DOCENTE_AUSENTE'
    );
    const totalClases = clasesComputables.length;
    const fechasClases = new Set(clasesComputables.map(c => c.fecha).filter(Boolean));
    const licenciasEfectivas = (inasistenciasDocente || []).filter(i => !i.fecha || fechasClases.has(i.fecha)).length;

    estudiantes.forEach(st => {
      if (st.es_equivalencia) {
        map.set(st.id, 100);
        return;
      }
      const stAsistencias = asistencias.filter(a => a.estudiante_id === st.id);
      const pct = calcularPorcentajeAsistencia(stAsistencias, totalClases, licenciasEfectivas);
      map.set(st.id, pct);
    });

    return map;
  }, [estudiantes, clases, asistencias, inasistenciasDocente]);

  // Evaluaciones principales (excluyendo recuperatorios del header principal)
  const mainEvaluations = useMemo(() => {
    return evaluaciones.filter(e => !String(e.tipo || '').toUpperCase().includes('RECUP'));
  }, [evaluaciones]);

  // Métricas reactivas por columna de evaluación (Promedio y % de Aprobación)
  const evalMetricsMap = useMemo(() => {
    const map = new Map();

    evaluaciones.forEach(ev => {
      const evNotas = notas.filter(n => n.evaluacion_id === ev.id);
      const validNumbers = [];
      let aprobados = 0;
      let totalCalificados = 0;
      const minApr = Number(ev.nota_minima_aprobacion || criterios.nota_min_reg || 4);

      evNotas.forEach(n => {
        const val = n.valor ?? n.nota;
        if (val !== null && val !== undefined && val !== '' && !isNaN(Number(val))) {
          const num = Number(val);
          validNumbers.push(num);
          totalCalificados++;
          if (num >= minApr) {
            aprobados++;
          }
        } else if (n.estado === 'AUSENTE' || n.estado === 'NO_ENTREGO') {
          totalCalificados++;
        }
      });

      const avg = validNumbers.length > 0
        ? (validNumbers.reduce((a, b) => a + b, 0) / validNumbers.length).toFixed(1)
        : null;

      const pctAprobacion = totalCalificados > 0
        ? Math.round((aprobados / totalCalificados) * 100)
        : null;

      map.set(ev.id, {
        promedio: avg,
        average: avg,
        pctAprobacion,
        passRate: pctAprobacion,
        aprobados,
        approved: aprobados,
        totalCalificados,
        totalGraded: totalCalificados
      });
    });

    return map;
  }, [evaluaciones, notas, criterios]);

  // Filas completas calculadas de estudiantes
  const studentRows = useMemo(() => {
    return estudiantes.map(st => {
      const asistPct = asistenciaPorEstudiante.get(st.id) ?? 100;
      const stNotas = notas.filter(n => n.estudiante_id === st.id);

      // Calcular promedio de cursada del estudiante
      const validVals = stNotas
        .map(n => n.valor ?? n.nota)
        .filter(v => v !== null && v !== undefined && v !== '' && !isNaN(Number(v)))
        .map(Number);

      const promedio = validVals.length > 0
        ? Number((validVals.reduce((a, b) => a + b, 0) / validVals.length).toFixed(1))
        : null;

      const condicion = calcularCondicionFinal({
        nivel: academicLevel,
        modalidad,
        asistenciaPct: asistPct,
        evaluaciones,
        studentNotas: stNotas,
        criterios,
        tiene_certificado_trabajo: Boolean(st.tiene_certificado_trabajo),
        es_equivalencia: Boolean(st.es_equivalencia)
      });

      const risk = calculateStudentRisk(st.id, {
        estudiante: st,
        asistenciaPct: asistPct,
        asistencias,
        clases,
        inasistenciasDocente,
        notas: stNotas,
        evaluaciones,
        criterios,
        condicion
      });

      return {
        estudiante: st,
        asistPct,
        promedio,
        condicion,
        risk,
        notas: stNotas
      };
    });
  }, [estudiantes, asistenciaPorEstudiante, notas, academicLevel, modalidad, evaluaciones, criterios, asistencias, clases, inasistenciasDocente]);

  // Estadísticas globales superiores de la cátedra
  const overallStats = useMemo(() => {
    const totalAlumnos = estudiantes.length;
    const conNotas = studentRows.filter(r => r.promedio !== null).length;
    const regularOpromo = studentRows.filter(
      r => r.condicion?.condicion === 'PROMOCIONAL' || r.condicion?.condicion === 'REGULAR' || r.condicion?.condicion === 'ACREDITADA_EQUIVALENCIA'
    ).length;

    const validAverages = studentRows.map(r => r.promedio).filter(p => p !== null);
    const promedioGeneral = validAverages.length > 0
      ? (validAverages.reduce((a, b) => a + b, 0) / validAverages.length).toFixed(1)
      : '—';

    const tasaAprobacion = totalAlumnos > 0 ? Math.round((regularOpromo / totalAlumnos) * 100) : 0;

    return {
      totalAlumnos,
      conNotas,
      promedioGeneral,
      tasaAprobacion,
      totalEvaluaciones: mainEvaluations.length
    };
  }, [estudiantes, studentRows, mainEvaluations]);

  // Mutación optimista de calificaciones (soporta firma por objeto { estudianteId, evaluacionId, valor, estado } o posicional (est, ev, payload))
  const handleQuickSetGrade = useCallback(async (arg1, arg2, arg3) => {
    let estudianteId, evaluacionId, valor, estado;
    if (arg2 && arg3) {
      estudianteId = arg1?.id || arg1?.estudiante_id || arg1;
      evaluacionId = arg2?.id || arg2;
      valor = arg3.valor !== undefined ? arg3.valor : arg3.nota;
      estado = arg3.estado;
    } else if (arg1 && typeof arg1 === 'object') {
      estudianteId = arg1.estudianteId || arg1.estudiante_id;
      evaluacionId = arg1.evaluacionId || arg1.evaluacion_id;
      valor = arg1.valor !== undefined ? arg1.valor : arg1.nota;
      estado = arg1.estado;
    }

    if (!estudianteId || !evaluacionId) return;

    const numVal = valor !== null && valor !== undefined && valor !== '' ? Number(valor) : null;
    let existingIdToUpdate = null;

    // Actualización optimista funcional libre de cierres léxicos obsoletos
    setNotas(prev => {
      const existingIndex = prev.findIndex(
        n => n.estudiante_id === estudianteId && n.evaluacion_id === evaluacionId
      );
      let updatedNotas;
      if (existingIndex >= 0) {
        existingIdToUpdate = prev[existingIndex]?.id;
        updatedNotas = [...prev];
        updatedNotas[existingIndex] = {
          ...updatedNotas[existingIndex],
          valor: numVal,
          nota: numVal,
          estado: estado ?? null
        };
      } else {
        const newNotaObj = {
          id: `nota-temp-${Date.now()}-${estudianteId}-${evaluacionId}`,
          estudiante_id: estudianteId,
          evaluacion_id: evaluacionId,
          valor: numVal,
          nota: numVal,
          estado: estado ?? null
        };
        updatedNotas = [...prev, newNotaObj];
      }

      if (!isSupabaseConfigured || isDemo) {
        try {
          const json = JSON.stringify(updatedNotas);
          localStorage.setItem(`docentepro_demo_notas_${catedraId}`, json);
          localStorage.setItem(`notas_${catedraId}`, json);
        } catch (_) {}
      }
      return updatedNotas;
    });

    // Persistencia en Supabase
    if (isSupabaseConfigured && !isDemo) {
      try {
        const payload = {
          estudiante_id: estudianteId,
          evaluacion_id: evaluacionId,
          valor: numVal,
          nota: numVal,
          estado: estado ?? null
        };

        const { error: upsertErr } = await supabase
          .from('notas')
          .upsert(payload, { onConflict: 'estudiante_id,evaluacion_id' });

        if (upsertErr) {
          if (existingIdToUpdate && !String(existingIdToUpdate).startsWith('nota-temp-')) {
            await supabase
              .from('notas')
              .update(payload)
              .eq('id', existingIdToUpdate);
          }
        }
      } catch (err) {
        console.warn('Aviso guardando nota en Supabase:', err);
      }
    }

    if (estado === 'NO_ENTREGO') {
      toast.info('Calificación registrada: N/E (No entregó)');
    } else if (estado === 'AUSENTE') {
      toast.info('Calificación registrada: Aus. (Ausente)');
    } else if (numVal !== null) {
      toast.success(`Nota registrada: ${numVal}`);
    }
  }, [isDemo, catedraId]);

  return {
    estudiantes,
    evaluaciones,
    mainEvaluations,
    notas,
    loading,
    criterios,
    studentRows,
    evalMetricsMap,
    overallStats,
    getNotaValue,
    getNotaEstado,
    handleQuickSetGrade,
    refetch: fetchData
  };
}
