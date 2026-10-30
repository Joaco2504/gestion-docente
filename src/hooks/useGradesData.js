import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { calcularCondicionFinal, calcularPorcentajeAsistencia, calcularNotasEfectivasEstudiante } from '../lib/academicLogic';
import { calculateStudentRisk } from '../lib/earlyWarningLogic';
import { getEstudiantesCatedra, actualizarCondicionManual } from '../services/catedraEstudiantesService';
import { getEvaluacionesCatedra, saveEvaluacion } from '../services/evaluacionesService';
import { handleAppError } from '../utils/handleAppError';
import { toast } from 'sonner';

const DEFAULT_CRITERIOS = {
  min_asist_promo: 80,
  min_asist_reg: 70,
  min_asist_trabajo: 60,
  nota_min_promo: 7,
  nota_min_reg: 4,
  nota_min_sec: 6,
  nota_regularidad: 4,
  nota_promocion: 7,
  ram_asistencia_regular: 70,
  ram_asistencia_trabajo: 60,
  ram_asistencia_promocion: 80,
  porcentaje_tps_regular: 80,
  porcentaje_tps_promocion: 100,
  eval_considerar_asistencia: true,
  eval_considerar_parciales: true,
  eval_considerar_tps: true
};

const DEFAULT_VISIBILITY = {
  mostrar_parciales: true,
  mostrar_tps: true,
  mostrar_promedio: true,
  sincronizar_portal: false
};

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
  const initializedCatedraRef = useRef(null);
  const userId = user?.id;

  const [criterios, setCriterios] = useState(DEFAULT_CRITERIOS);
  const [visibilityConfig, setVisibilityConfig] = useState(DEFAULT_VISIBILITY);

  const fetchData = useCallback(async () => {
    if (!catedraId) return;
    setLoading(true);

    try {
      // Cargar configuración local previa (como base o respaldo)
      let localCrit = {};
      let localVis = {};
      try {
        const rawCrit = localStorage.getItem(`criterios_${catedraId}`);
        if (rawCrit) localCrit = JSON.parse(rawCrit);
        const rawVis = localStorage.getItem(`grades_visibility_${catedraId}`) || localStorage.getItem(`portal_config_${catedraId}`);
        if (rawVis) localVis = JSON.parse(rawVis);
      } catch (_) {}

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
            const normalizedNotas = (notasData || []).map(n => {
              let detalle = n.detalle_recuperatorio;
              if (!detalle && n.observaciones && typeof n.observaciones === 'string' && n.observaciones.trim().startsWith('[')) {
                try {
                  detalle = JSON.parse(n.observaciones);
                } catch (_) {}
              }
              const notaEfectiva = n.nota ?? n.valor ?? n.calificacion ?? null;
              return {
                ...n,
                nota: notaEfectiva,
                valor: notaEfectiva,
                detalle_recuperatorio: detalle || null
              };
            });
            setNotas(normalizedNotas);
          }
        } else {
          setNotas([]);
        }

        // 4. Cargar clases, criterios, cátedra e inasistencias docentes
        const [clasesRes, inasDocRes, critRes, catRes] = await Promise.all([
          supabase.from('clases').select('id, fecha, estado, caracter, caracter_clase').eq('catedra_id', catedraId),
          supabase.from('inasistencias_docente').select('*').eq('catedra_id', catedraId),
          supabase
            .from('criterios_evaluacion')
            .select('*')
            .eq('catedra_id', catedraId)
            .maybeSingle(),
          supabase
            .from('catedras')
            .select('*')
            .eq('id', catedraId)
            .maybeSingle()
        ]);

        const rawClases = clasesRes.data || [];
        setClases(rawClases);
        setInasistenciasDocente(inasDocRes.data || []);

        const catData = catRes.data || {};
        const critData = critRes.data || {};

        const mergedMinReg = Number(
          catData.ram_asistencia_regular ?? critData.min_asist_reg ?? localCrit.ram_asistencia_regular ?? localCrit.min_asist_reg ?? 70
        );
        const mergedMinTrabajo = Number(
          catData.ram_asistencia_trabajo ?? critData.min_asist_trabajo ?? localCrit.ram_asistencia_trabajo ?? localCrit.min_asist_trabajo ?? 60
        );
        const mergedMinPromo = Number(
          catData.ram_asistencia_promocion ?? critData.min_asist_promo ?? localCrit.ram_asistencia_promocion ?? localCrit.min_asist_promo ?? 80
        );
        const mergedNotaReg = Number(
          catData.nota_regularidad ?? critData.nota_min_reg ?? localCrit.nota_regularidad ?? localCrit.nota_min_reg ?? 4
        );
        const mergedNotaPromo = Number(
          catData.nota_promocion ?? critData.nota_min_promo ?? localCrit.nota_promocion ?? localCrit.nota_min_promo ?? 7
        );
        const mergedNotaSec = Number(
          critData.nota_min_sec ?? localCrit.nota_min_sec ?? 6
        );
        const mergedPctTpsReg = Number(
          catData.porcentaje_tps_regular ?? critData.porcentaje_tps_regular ?? localCrit.porcentaje_tps_regular ?? 80
        );
        const mergedPctTpsPromo = Number(
          catData.porcentaje_tps_promocion ?? critData.porcentaje_tps_promocion ?? localCrit.porcentaje_tps_promocion ?? 100
        );

        const evalAsist = catData.eval_considerar_asistencia ?? critData.eval_considerar_asistencia ?? localCrit.eval_considerar_asistencia ?? true;
        const evalParc = catData.eval_considerar_parciales ?? critData.eval_considerar_parciales ?? localCrit.eval_considerar_parciales ?? true;
        const evalTps = catData.eval_considerar_tps ?? critData.eval_considerar_tps ?? localCrit.eval_considerar_tps ?? true;

        setCriterios({
          min_asist_promo: mergedMinPromo,
          min_asist_reg: mergedMinReg,
          min_asist_trabajo: mergedMinTrabajo,
          nota_min_promo: mergedNotaPromo,
          nota_min_reg: mergedNotaReg,
          nota_min_sec: mergedNotaSec,
          nota_regularidad: mergedNotaReg,
          nota_promocion: mergedNotaPromo,
          ram_asistencia_regular: mergedMinReg,
          ram_asistencia_trabajo: mergedMinTrabajo,
          ram_asistencia_promocion: mergedMinPromo,
          porcentaje_tps_regular: mergedPctTpsReg,
          porcentaje_tps_promocion: mergedPctTpsPromo,
          eval_considerar_asistencia: evalAsist !== false,
          eval_considerar_parciales: evalParc !== false,
          eval_considerar_tps: evalTps !== false
        });

        setVisibilityConfig({
          mostrar_parciales: (catData.mostrar_parciales ?? localVis.mostrar_parciales ?? true) !== false,
          mostrar_tps: (catData.mostrar_tps ?? localVis.mostrar_tps ?? true) !== false,
          mostrar_promedio: (catData.mostrar_promedio ?? localVis.mostrar_promedio ?? true) !== false,
          sincronizar_portal: Boolean(localVis.sincronizar_portal ?? (catData.mostrar_parciales !== undefined))
        });

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
        const estList = await getEstudiantesCatedra(catedraId, { isDemo: true });
        const storedEv = localStorage.getItem(`docentepro_demo_evaluaciones_${catedraId}`) || localStorage.getItem(`evaluaciones_${catedraId}`);
        const storedNotas = localStorage.getItem(`docentepro_demo_notas_${catedraId}`) || localStorage.getItem(`notas_${catedraId}`);
        const storedClases = localStorage.getItem(`docentepro_demo_clases_${catedraId}`) || localStorage.getItem(`clases_${catedraId}`);
        const storedAsist = localStorage.getItem(`docentepro_demo_asistencias_${catedraId}`) || localStorage.getItem(`asistencias_${catedraId}`);

        setEstudiantes(estList || []);
        setEvaluaciones(storedEv ? JSON.parse(storedEv) : []);
        const parsedStoredNotas = storedNotas ? JSON.parse(storedNotas) : [];
        const normalizedStoredNotas = parsedStoredNotas.map(n => {
          let detalle = n.detalle_recuperatorio;
          if (!detalle && n.observaciones && typeof n.observaciones === 'string' && n.observaciones.trim().startsWith('[')) {
            try {
              detalle = JSON.parse(n.observaciones);
            } catch (_) {}
          }
          const notaEfectiva = n.nota ?? n.valor ?? n.calificacion ?? null;
          return {
            ...n,
            nota: notaEfectiva,
            valor: notaEfectiva,
            detalle_recuperatorio: detalle || null
          };
        });
        setNotas(normalizedStoredNotas);
        setClases(storedClases ? JSON.parse(storedClases) : []);
        setAsistencias(storedAsist ? JSON.parse(storedAsist) : []);

        if (Object.keys(localCrit).length > 0) {
          setCriterios(prev => ({
            ...prev,
            ...localCrit,
            min_asist_reg: Number(localCrit.ram_asistencia_regular ?? localCrit.min_asist_reg ?? 70),
            ram_asistencia_regular: Number(localCrit.ram_asistencia_regular ?? localCrit.min_asist_reg ?? 70),
            min_asist_trabajo: Number(localCrit.ram_asistencia_trabajo ?? localCrit.min_asist_trabajo ?? 60),
            ram_asistencia_trabajo: Number(localCrit.ram_asistencia_trabajo ?? localCrit.min_asist_trabajo ?? 60),
            nota_min_reg: Number(localCrit.nota_regularidad ?? localCrit.nota_min_reg ?? 4),
            nota_regularidad: Number(localCrit.nota_regularidad ?? localCrit.nota_min_reg ?? 4),
            nota_min_promo: Number(localCrit.nota_promocion ?? localCrit.nota_min_promo ?? 7),
            nota_promocion: Number(localCrit.nota_promocion ?? localCrit.nota_min_promo ?? 7)
          }));
        }

        if (Object.keys(localVis).length > 0) {
          setVisibilityConfig({
            mostrar_parciales: localVis.mostrar_parciales !== false,
            mostrar_tps: localVis.mostrar_tps !== false,
            mostrar_promedio: localVis.mostrar_promedio !== false,
            sincronizar_portal: Boolean(localVis.sincronizar_portal)
          });
        }
      }
    } catch (err) {
      handleAppError(err, 'useGradesData / fetchData', user);
    } finally {
      setLoading(false);
    }
  }, [catedraId, isDemo, userId]);

  useEffect(() => {
    if (!catedraId || initializedCatedraRef.current === catedraId) return;
    initializedCatedraRef.current = catedraId;
    fetchData();
  }, [catedraId, fetchData]);

  // Guardar parámetros de condición en cátedras, criterios_evaluacion y localStorage
  const saveCriteriosCondicion = useCallback(async (newParams, nuevoRegimen) => {
    const merged = {
      ...criterios,
      ...newParams,
      min_asist_reg: Number(newParams.ram_asistencia_regular ?? newParams.min_asist_reg ?? criterios.min_asist_reg ?? 70),
      ram_asistencia_regular: Number(newParams.ram_asistencia_regular ?? newParams.min_asist_reg ?? criterios.ram_asistencia_regular ?? 70),
      min_asist_trabajo: Number(newParams.ram_asistencia_trabajo ?? newParams.min_asist_trabajo ?? criterios.min_asist_trabajo ?? 60),
      ram_asistencia_trabajo: Number(newParams.ram_asistencia_trabajo ?? newParams.min_asist_trabajo ?? criterios.ram_asistencia_trabajo ?? 60),
      min_asist_promo: Number(newParams.ram_asistencia_promocion ?? newParams.min_asist_promo ?? criterios.min_asist_promo ?? 80),
      ram_asistencia_promocion: Number(newParams.ram_asistencia_promocion ?? newParams.min_asist_promo ?? criterios.ram_asistencia_promocion ?? 80),
      nota_min_reg: Number(newParams.nota_regularidad ?? newParams.nota_min_reg ?? criterios.nota_min_reg ?? 4),
      nota_regularidad: Number(newParams.nota_regularidad ?? newParams.nota_min_reg ?? criterios.nota_regularidad ?? 4),
      nota_min_promo: Number(newParams.nota_promocion ?? newParams.nota_min_promo ?? criterios.nota_min_promo ?? 7),
      nota_promocion: Number(newParams.nota_promocion ?? newParams.nota_min_promo ?? criterios.nota_promocion ?? 7),
      porcentaje_tps_regular: Number(newParams.porcentaje_tps_regular ?? criterios.porcentaje_tps_regular ?? 80),
      porcentaje_tps_promocion: Number(newParams.porcentaje_tps_promocion ?? criterios.porcentaje_tps_promocion ?? 100),
      eval_considerar_asistencia: (newParams.eval_considerar_asistencia ?? criterios.eval_considerar_asistencia) !== false,
      eval_considerar_parciales: (newParams.eval_considerar_parciales ?? criterios.eval_considerar_parciales) !== false,
      eval_considerar_tps: (newParams.eval_considerar_tps ?? criterios.eval_considerar_tps) !== false
    };

    // 1. Recalcular instantáneamente la planilla en memoria
    setCriterios(merged);

    // 2. Guardar en localStorage como caché inmediato y respaldo
    try {
      localStorage.setItem(`criterios_${catedraId}`, JSON.stringify({
        ...merged,
        ...(nuevoRegimen ? { modalidad: nuevoRegimen, regimen: nuevoRegimen } : {})
      }));
    } catch (_) {}

    // 3. Persistir en public.catedras y public.criterios_evaluacion en Supabase
    if (isSupabaseConfigured && !isDemo && catedraId) {
      try {
        const catUpdateFull = {
          ram_asistencia_regular: merged.ram_asistencia_regular,
          ram_asistencia_trabajo: merged.ram_asistencia_trabajo,
          ram_asistencia_promocion: merged.ram_asistencia_promocion,
          nota_regularidad: merged.nota_regularidad,
          nota_promocion: merged.nota_promocion,
          porcentaje_tps_regular: merged.porcentaje_tps_regular,
          porcentaje_tps_promocion: merged.porcentaje_tps_promocion,
          eval_considerar_asistencia: merged.eval_considerar_asistencia,
          eval_considerar_parciales: merged.eval_considerar_parciales,
          eval_considerar_tps: merged.eval_considerar_tps,
          ...(nuevoRegimen ? { modalidad: nuevoRegimen } : {})
        };

        const { error: catErr } = await supabase
          .from('catedras')
          .update(catUpdateFull)
          .eq('id', catedraId);

        if (catErr) {
          // Fallback a columnas base de catedras si aún no se corrió la migración extendida
          await supabase
            .from('catedras')
            .update({
              ram_asistencia_regular: merged.ram_asistencia_regular,
              ram_asistencia_trabajo: merged.ram_asistencia_trabajo,
              ram_asistencia_promocion: merged.ram_asistencia_promocion,
              ...(nuevoRegimen ? { modalidad: nuevoRegimen } : {})
            })
            .eq('id', catedraId);
        }

        const critPayload = {
          catedra_id: catedraId,
          min_asist_promo: merged.min_asist_promo,
          min_asist_reg: merged.min_asist_reg,
          min_asist_trabajo: merged.min_asist_trabajo,
          nota_min_promo: merged.nota_min_promo,
          nota_min_reg: merged.nota_min_reg,
          nota_min_sec: merged.nota_min_sec
        };

        await supabase
          .from('criterios_evaluacion')
          .upsert(critPayload, { onConflict: 'catedra_id' });
      } catch (e) {
        console.warn('Aviso al persistir parámetros de condición en Supabase:', e);
      }
    }

    return merged;
  }, [criterios, catedraId, isDemo]);

  // Actualizar y sincronizar visibilidad de notas (Parciales, TPs, Promedio) con el Portal del Alumno
  const updateVisibilityConfig = useCallback(async (partialVis, syncNow = false) => {
    const nextVis = {
      ...visibilityConfig,
      ...partialVis
    };
    setVisibilityConfig(nextVis);

    try {
      localStorage.setItem(`grades_visibility_${catedraId}`, JSON.stringify(nextVis));
      if (nextVis.sincronizar_portal || syncNow) {
        const prevPortal = JSON.parse(localStorage.getItem(`portal_config_${catedraId}`) || '{}');
        localStorage.setItem(`portal_config_${catedraId}`, JSON.stringify({
          ...prevPortal,
          mostrar_parciales: nextVis.mostrar_parciales,
          mostrar_tps: nextVis.mostrar_tps,
          mostrar_promedio: nextVis.mostrar_promedio
        }));
      }
    } catch (_) {}

    if ((nextVis.sincronizar_portal || syncNow) && isSupabaseConfigured && !isDemo && catedraId) {
      try {
        await supabase
          .from('catedras')
          .update({
            mostrar_parciales: nextVis.mostrar_parciales,
            mostrar_tps: nextVis.mostrar_tps,
            mostrar_promedio: nextVis.mostrar_promedio
          })
          .eq('id', catedraId);
      } catch (err) {
        console.warn('Aviso sincronizando visibilidad con public.catedras:', err);
      }
    }

    return nextVis;
  }, [visibilityConfig, catedraId, isDemo]);

  // Override manual de condición por alumno (conservando siempre el cálculo automático)
  const handleSetCondicionManual = useCallback(async (estudianteId, condicionManual = null, motivoManual = '') => {
    if (!estudianteId) return;
    const normalizedManual = condicionManual && condicionManual !== 'AUTO' ? condicionManual : null;
    const normalizedMotivo = normalizedManual && motivoManual ? String(motivoManual).trim() : null;

    // 1. Actualización optimista inmediata en memoria
    setEstudiantes(prev => prev.map(st => st.id === estudianteId ? {
      ...st,
      condicion_manual: normalizedManual,
      motivo_condicion_manual: normalizedMotivo
    } : st));

    // 2. Persistir en servicio + Supabase + localStorage
    await actualizarCondicionManual(catedraId, estudianteId, normalizedManual, normalizedMotivo, {
      supabase,
      isDemo
    });

    if (normalizedManual) {
      const labelMap = {
        PROMOCIONAL: 'Promoción Directa',
        PROMOCION_INDIRECTA: 'Promoción Indirecta',
        REGULAR: 'Regular',
        LIBRE: 'Libre'
      };
      toast.success(`Condición fijada manualmente: ${labelMap[normalizedManual] || normalizedManual}`);
    } else {
      toast.info('Condición restaurada al cálculo automático de la cátedra');
    }
  }, [catedraId, isDemo]);

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
      const minApr = Number(ev.nota_minima_aprobacion || criterios.nota_regularidad || criterios.nota_min_reg || 4);

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

      const { notasEfectivasMap, parcialesRecuperadosCount, promedioEfectivo } = calcularNotasEfectivasEstudiante({
        evaluaciones,
        studentNotas: stNotas,
        criterios
      });

      // Calcular promedio de cursada del estudiante (con notas efectivas de recuperatorio reemplazadas)
      let promedio = promedioEfectivo;
      if (promedio === null) {
        const validVals = stNotas
          .map(n => n.valor ?? n.nota)
          .filter(v => v !== null && v !== undefined && v !== '' && !isNaN(Number(v)))
          .map(Number);
        promedio = validVals.length > 0
          ? Number((validVals.reduce((a, b) => a + b, 0) / validVals.length).toFixed(1))
          : null;
      }

      const condicionAutomatica = calcularCondicionFinal({
        nivel: academicLevel,
        modalidad,
        regimen: modalidad,
        asistenciaPct: asistPct,
        evaluaciones,
        studentNotas: stNotas,
        criterios,
        tiene_certificado_trabajo: Boolean(st.tiene_certificado_trabajo),
        es_equivalencia: Boolean(st.es_equivalencia)
      });

      const manualVal = !st.es_equivalencia && st.condicion_manual && st.condicion_manual !== 'AUTO'
        ? String(st.condicion_manual).toUpperCase()
        : null;

      let condicion;
      if (manualVal) {
        const autoShort = condicionAutomatica?.condicion === 'PROMOCIONAL'
          ? 'PROM. DIR'
          : condicionAutomatica?.condicion === 'PROMOCION_INDIRECTA'
          ? 'PROM. IND'
          : condicionAutomatica?.condicion || 'EN CURSO';

        condicion = {
          condicion: manualVal,
          subcondicion: manualVal === 'PROMOCION_INDIRECTA' ? 'INDIRECTA' : manualVal === 'PROMOCIONAL' ? 'DIRECTA' : undefined,
          color: manualVal === 'PROMOCIONAL'
            ? 'text-emerald-700'
            : manualVal === 'PROMOCION_INDIRECTA'
            ? 'text-teal-700'
            : manualVal === 'REGULAR'
            ? 'text-amber-700'
            : 'text-rose-700',
          badgeVariant: manualVal === 'PROMOCIONAL'
            ? 'promo'
            : manualVal === 'PROMOCION_INDIRECTA'
            ? 'promo_ind'
            : manualVal === 'REGULAR'
            ? 'regular'
            : 'libre',
          motivo: st.motivo_condicion_manual
            ? `${st.motivo_condicion_manual} (Auto: ${autoShort})`
            : `Fijada manualmente (Auto: ${autoShort})`,
          esManual: true,
          condicionManual: manualVal,
          motivoManual: st.motivo_condicion_manual || '',
          condicionAutomatica
        };
      } else {
        condicion = {
          ...condicionAutomatica,
          esManual: false,
          condicionManual: null,
          motivoManual: '',
          condicionAutomatica
        };
      }

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
        condicionAutomatica,
        risk,
        notas: stNotas,
        notasEfectivasMap,
        parcialesRecuperadosCount
      };
    });
  }, [estudiantes, asistenciaPorEstudiante, notas, academicLevel, modalidad, evaluaciones, criterios, asistencias, clases, inasistenciasDocente]);

  // Estadísticas globales superiores de la cátedra
  const overallStats = useMemo(() => {
    const totalAlumnos = estudiantes.length;
    const conNotas = studentRows.filter(r => r.promedio !== null).length;
    const regularOpromo = studentRows.filter(
      r =>
        r.condicion?.condicion === 'PROMOCIONAL' ||
        r.condicion?.condicion === 'PROMOCION_INDIRECTA' ||
        r.condicion?.condicion === 'REGULAR' ||
        r.condicion?.condicion === 'ACREDITADA_EQUIVALENCIA'
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

  // Asegura la existencia de la evaluación de recuperatorio general
  const ensureRecuperatorioEval = useCallback(async () => {
    let recup = evaluaciones.find(e => String(e.tipo || '').toUpperCase().includes('RECUP'));
    if (recup) return recup;

    try {
      const newRecup = await saveEvaluacion({
        titulo: 'Recuperatorio',
        tipo: 'RECUPERATORIO',
        catedra_id: catedraId
      }, { catedraId, isDemo });
      setEvaluaciones(prev => [...prev, newRecup]);
      return newRecup;
    } catch (err) {
      console.warn('No se pudo crear evaluación de recuperatorio en BD, usando temporal:', err);
      const fallback = {
        id: `recup-gen-${catedraId}`,
        titulo: 'Recuperatorio',
        tipo: 'RECUPERATORIO',
        catedra_id: catedraId
      };
      setEvaluaciones(prev => [...prev, fallback]);
      return fallback;
    }
  }, [evaluaciones, catedraId, isDemo]);

  // Mutación optimista de calificaciones (soporta firma por objeto { estudianteId, evaluacionId, valor, estado, detalle_recuperatorio } o posicional)
  const handleQuickSetGrade = useCallback(async (arg1, arg2, arg3) => {
    let estudianteId, evaluacionId, valor, estado, detalle_recuperatorio, observaciones;
    if (arg2 && arg3) {
      estudianteId = arg1?.id || arg1?.estudiante_id || arg1;
      evaluacionId = arg2?.id || arg2;
      valor = arg3.valor !== undefined ? arg3.valor : arg3.nota;
      estado = arg3.estado;
      detalle_recuperatorio = arg3.detalle_recuperatorio ?? arg3.detalle;
      observaciones = arg3.observaciones;
    } else if (arg1 && typeof arg1 === 'object') {
      estudianteId = arg1.estudianteId || arg1.estudiante_id;
      evaluacionId = arg1.evaluacionId || arg1.evaluacion_id;
      valor = arg1.valor !== undefined ? arg1.valor : arg1.nota;
      estado = arg1.estado;
      detalle_recuperatorio = arg1.detalle_recuperatorio ?? arg1.detalle;
      observaciones = arg1.observaciones;
    }

    if (!estudianteId || !evaluacionId) return;

    const numVal = valor !== null && valor !== undefined && valor !== '' ? Number(valor) : null;

    // Actualización optimista funcional libre de cierres léxicos obsoletos
    setNotas(prev => {
      const existingIndex = prev.findIndex(
        n => n.estudiante_id === estudianteId && n.evaluacion_id === evaluacionId
      );
      let updatedNotas;
      if (existingIndex >= 0) {
        updatedNotas = [...prev];
        updatedNotas[existingIndex] = {
          ...updatedNotas[existingIndex],
          valor: numVal,
          nota: numVal,
          estado: estado ?? null,
          detalle_recuperatorio: detalle_recuperatorio !== undefined ? detalle_recuperatorio : prev[existingIndex]?.detalle_recuperatorio,
          observaciones: observaciones !== undefined ? observaciones : prev[existingIndex]?.observaciones
        };
      } else {
        const newNotaObj = {
          id: `nota-temp-${Date.now()}-${estudianteId}-${evaluacionId}`,
          estudiante_id: estudianteId,
          evaluacion_id: evaluacionId,
          valor: numVal,
          nota: numVal,
          estado: estado ?? null,
          detalle_recuperatorio: detalle_recuperatorio ?? null,
          observaciones: observaciones ?? null
        };
        updatedNotas = [...prev, newNotaObj];
      }

      // Cache local incondicional como red de seguridad contra pérdida de datos
      try {
        const json = JSON.stringify(updatedNotas);
        localStorage.setItem(`docentepro_demo_notas_${catedraId}`, json);
        localStorage.setItem(`notas_${catedraId}`, json);
      } catch (_) {}

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

        if (detalle_recuperatorio !== undefined) {
          payload.detalle_recuperatorio = detalle_recuperatorio;
          if (detalle_recuperatorio) {
            payload.observaciones = JSON.stringify(detalle_recuperatorio);
          } else {
            payload.observaciones = observaciones ?? null;
          }
        } else if (observaciones !== undefined) {
          payload.observaciones = observaciones;
        }

        const { error: upsertErr } = await supabase
          .from('notas')
          .upsert(payload, { onConflict: 'estudiante_id,evaluacion_id' });

        if (upsertErr) {
          // Reintento resiliente con columnas canónicas esenciales (valor, observaciones)
          const fallbackPayload = {
            estudiante_id: estudianteId,
            evaluacion_id: evaluacionId,
            valor: numVal,
            observaciones: payload.observaciones || (estado ? `[ESTADO:${estado}]` : null)
          };

          const { data: existingRow } = await supabase
            .from('notas')
            .select('id')
            .eq('estudiante_id', estudianteId)
            .eq('evaluacion_id', evaluacionId)
            .maybeSingle();

          if (existingRow?.id) {
            await supabase.from('notas').update(fallbackPayload).eq('id', existingRow.id);
          } else {
            await supabase.from('notas').insert([fallbackPayload]);
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

  const deleteEvaluacionLocal = useCallback((evaluacionId) => {
    setEvaluaciones(prev => {
      const recupIds = prev.filter(e => e.evaluacion_origen_id === evaluacionId).map(e => e.id);
      const allDeletedIds = new Set([evaluacionId, ...recupIds]);
      setNotas(prevNotas => prevNotas.filter(n => !allDeletedIds.has(n.evaluacion_id)));
      return prev.filter(e => !allDeletedIds.has(e.id));
    });
  }, []);

  return {
    estudiantes,
    evaluaciones,
    setEvaluaciones,
    mainEvaluations,
    recuperatorioEvaluation: evaluaciones.find(e => String(e.tipo || '').toUpperCase().includes('RECUP')) || null,
    notas,
    setNotas,
    loading,
    criterios,
    setCriterios,
    saveCriteriosCondicion,
    visibilityConfig,
    updateVisibilityConfig,
    handleSetCondicionManual,
    studentRows,
    evalMetricsMap,
    overallStats,
    getNotaValue,
    getNotaEstado,
    getNotaDetalleRecuperatorio: useCallback((estId, evalId) => {
      const n = notasMap.get(`${estId}_${evalId}`);
      return n?.detalle_recuperatorio ?? null;
    }, [notasMap]),
    getNotaObj: useCallback((estId, evalId) => {
      return notasMap.get(`${estId}_${evalId}`) ?? null;
    }, [notasMap]),
    ensureRecuperatorioEval,
    handleQuickSetGrade,
    deleteEvaluacionLocal,
    refetch: fetchData
  };
}
