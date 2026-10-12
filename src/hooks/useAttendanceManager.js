import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getEstudiantesCatedra } from '../services/catedraEstudiantesService';
import { calcularPorcentajeAsistencia } from '../lib/academicLogic';
import { calculateStudentRisk } from '../lib/earlyWarningLogic';
import { getTodayYMD } from '../lib/dateUtils';
import { handleAppError } from '../utils/handleAppError';
import { ESTADO_ASISTENCIA } from '../lib/enums';
import { toast } from 'sonner';

/**
 * useAttendanceManager
 * Hook desacoplado para gestión de asistencia, cálculo de presentismo en lote,
 * cómputo de umbral laboral adaptativo (60% vs 70%) y persistencia en Supabase.
 */
export function useAttendanceManager({ catedraId, isDemo = false, user = null }) {
  const [estudiantes, setEstudiantes] = useState([]);
  const [clases, setClases] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [inasistenciasDocente, setInasistenciasDocente] = useState([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(getTodayYMD());
  const [claseActiva, setClaseActiva] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!catedraId) return;
    setLoading(true);

    try {
      if (isSupabaseConfigured && !isDemo) {
        const [estList, clasesRes, asistRes, inasDocRes] = await Promise.all([
          getEstudiantesCatedra(catedraId),
          supabase.from('clases').select('*').eq('catedra_id', catedraId).order('fecha', { ascending: false }),
          supabase.from('asistencias').select('*').eq('catedra_id', catedraId),
          supabase.from('inasistencias_docente').select('*').eq('catedra_id', catedraId).order('fecha', { ascending: false })
        ]);

        const allEst = estList || [];
        // Filtrar alumnos no dados de baja
        setEstudiantes(allEst.filter(e => e.estado !== 'BAJA'));
        setClases(clasesRes.data || []);
        setAsistencias(asistRes.data || []);
        setInasistenciasDocente(inasDocRes.data || []);
      } else {
        const storedEst = localStorage.getItem(`docentepro_demo_estudiantes_${catedraId}`);
        const storedClases = localStorage.getItem(`docentepro_demo_clases_${catedraId}`);
        const storedAsist = localStorage.getItem(`docentepro_demo_asistencias_${catedraId}`);

        setEstudiantes(storedEst ? JSON.parse(storedEst) : []);
        setClases(storedClases ? JSON.parse(storedClases) : []);
        setAsistencias(storedAsist ? JSON.parse(storedAsist) : []);
      }
    } catch (err) {
      handleAppError(err, 'useAttendanceManager / fetchData', user);
    } finally {
      setLoading(false);
    }
  }, [catedraId, isDemo, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Alumnos activos elegibles para asistencia (excluyendo equivalencias estrictas)
  const alumnosElegibles = useMemo(() => {
    return estudiantes.filter(e => !e.es_equivalencia);
  }, [estudiantes]);

  // Encontrar o crear referencia de clase para la fecha seleccionada
  useEffect(() => {
    const encontrada = clases.find(c => c.fecha === fechaSeleccionada);
    setClaseActiva(encontrada || null);
  }, [clases, fechaSeleccionada]);

  // Mapa de asistencias del día seleccionado por estudianteId
  const asistenciasDiaMap = useMemo(() => {
    const map = new Map();
    asistencias
      .filter(a => a.fecha === fechaSeleccionada || (claseActiva && a.clase_id === claseActiva.id))
      .forEach(a => {
        map.set(a.estudiante_id, a.estado);
      });
    return map;
  }, [asistencias, fechaSeleccionada, claseActiva]);

  // Cómputo global de porcentaje acumulado por estudiante
  const asistenciaPorEstudiante = useMemo(() => {
    const map = new Map();
    const totalClases = clases.length;
    const licenciasCount = inasistenciasDocente.length;

    estudiantes.forEach(st => {
      if (st.es_equivalencia) {
        map.set(st.id, 100);
        return;
      }
      const stAsist = asistencias.filter(a => a.estudiante_id === st.id);
      const pct = calcularPorcentajeAsistencia(stAsist, totalClases, licenciasCount);
      map.set(st.id, pct);
    });

    return map;
  }, [estudiantes, clases, asistencias, inasistenciasDocente]);

  // Métricas de la jornada seleccionada
  const statsHoy = useMemo(() => {
    const total = alumnosElegibles.length;
    let presentes = 0;
    let ausentes = 0;
    let justificados = 0;

    alumnosElegibles.forEach(e => {
      const st = asistenciasDiaMap.get(e.id);
      if (st === ESTADO_ASISTENCIA.PRESENTE) presentes++;
      else if (st === ESTADO_ASISTENCIA.AUSENTE) ausentes++;
      else if (st === ESTADO_ASISTENCIA.JUSTIFICADO) justificados++;
    });

    const pctDia = total > 0 ? Math.round((presentes / total) * 100) : 0;
    return { total, presentes, ausentes, justificados, pctDia };
  }, [alumnosElegibles, asistenciasDiaMap]);

  // Asegurar registro de clase en Supabase
  const asegurarClaseActiva = async (fecha) => {
    if (claseActiva && claseActiva.fecha === fecha) return claseActiva;

    const existente = clases.find(c => c.fecha === fecha);
    if (existente) {
      setClaseActiva(existente);
      return existente;
    }

    const nuevaClase = {
      id: `clase-${Date.now()}`,
      catedra_id: catedraId,
      fecha,
      tema: `Clase del ${fecha}`
    };

    if (isSupabaseConfigured && !isDemo) {
      try {
        const { data, error } = await supabase
          .from('clases')
          .insert({ catedra_id: catedraId, fecha, tema: `Clase del ${fecha}` })
          .select()
          .single();

        if (!error && data) {
          setClases(prev => [data, ...prev]);
          setClaseActiva(data);
          return data;
        }
      } catch (err) {
        console.warn('Aviso asegurando clase:', err);
      }
    }

    setClases(prev => [nuevaClase, ...prev]);
    setClaseActiva(nuevaClase);
    return nuevaClase;
  };

  // Marcar a toda la nómina como PRESENTE
  const handleMarcarTodosPresentes = useCallback(async () => {
    if (alumnosElegibles.length === 0) return;
    setSaving(true);

    try {
      const clase = await asegurarClaseActiva(fechaSeleccionada);
      const nuevasAsistencias = alumnosElegibles.map(e => ({
        id: `asist-${Date.now()}-${e.id}`,
        catedra_id: catedraId,
        clase_id: clase?.id || null,
        estudiante_id: e.id,
        fecha: fechaSeleccionada,
        estado: ESTADO_ASISTENCIA.PRESENTE
      }));

      // Actualización optimista local
      setAsistencias(prev => {
        const filtradas = prev.filter(
          a => a.fecha !== fechaSeleccionada && (!clase || a.clase_id !== clase.id)
        );
        return [...filtradas, ...nuevasAsistencias];
      });

      if (isSupabaseConfigured && !isDemo) {
        const rowsToUpsert = nuevasAsistencias.map(a => ({
          catedra_id: catedraId,
          clase_id: a.clase_id,
          estudiante_id: a.estudiante_id,
          fecha: a.fecha,
          estado: a.estado
        }));

        await supabase
          .from('asistencias')
          .upsert(rowsToUpsert, { onConflict: 'clase_id,estudiante_id' });
      }

      toast.success(`Se marcaron ${alumnosElegibles.length} estudiantes como PRESENTES.`);
    } catch (err) {
      handleAppError(err, 'useAttendanceManager / handleMarcarTodosPresentes', user);
    } finally {
      setSaving(false);
    }
  }, [alumnosElegibles, fechaSeleccionada, catedraId, isDemo, user]);

  // Marcar a toda la nómina como AUSENTE
  const handleMarcarTodosAusentes = useCallback(async () => {
    if (alumnosElegibles.length === 0) return;
    setSaving(true);

    try {
      const clase = await asegurarClaseActiva(fechaSeleccionada);
      const nuevasAsistencias = alumnosElegibles.map(e => ({
        id: `asist-${Date.now()}-${e.id}`,
        catedra_id: catedraId,
        clase_id: clase?.id || null,
        estudiante_id: e.id,
        fecha: fechaSeleccionada,
        estado: ESTADO_ASISTENCIA.AUSENTE
      }));

      setAsistencias(prev => {
        const filtradas = prev.filter(
          a => a.fecha !== fechaSeleccionada && (!clase || a.clase_id !== clase.id)
        );
        return [...filtradas, ...nuevasAsistencias];
      });

      if (isSupabaseConfigured && !isDemo) {
        const rowsToUpsert = nuevasAsistencias.map(a => ({
          catedra_id: catedraId,
          clase_id: a.clase_id,
          estudiante_id: a.estudiante_id,
          fecha: a.fecha,
          estado: a.estado
        }));

        await supabase
          .from('asistencias')
          .upsert(rowsToUpsert, { onConflict: 'clase_id,estudiante_id' });
      }

      toast.info(`Se marcaron ${alumnosElegibles.length} inasistencias generales.`);
    } catch (err) {
      handleAppError(err, 'useAttendanceManager / handleMarcarTodosAusentes', user);
    } finally {
      setSaving(false);
    }
  }, [alumnosElegibles, fechaSeleccionada, catedraId, isDemo, user]);

  // Alternar estado individual de asistencia
  const handleToggleEstado = useCallback(async (estudianteId, nuevoEstado) => {
    const clase = await asegurarClaseActiva(fechaSeleccionada);

    const nuevaAsist = {
      id: `asist-${Date.now()}-${estudianteId}`,
      catedra_id: catedraId,
      clase_id: clase?.id || null,
      estudiante_id: estudianteId,
      fecha: fechaSeleccionada,
      estado: nuevoEstado
    };

    setAsistencias(prev => {
      const idx = prev.findIndex(
        a => a.estudiante_id === estudianteId && (a.fecha === fechaSeleccionada || (clase && a.clase_id === clase.id))
      );
      if (idx >= 0) {
        const cop = [...prev];
        cop[idx] = { ...cop[idx], estado: nuevoEstado };
        return cop;
      }
      return [...prev, nuevaAsist];
    });

    if (isSupabaseConfigured && !isDemo) {
      try {
        await supabase
          .from('asistencias')
          .upsert({
            catedra_id: catedraId,
            clase_id: clase?.id || null,
            estudiante_id: estudianteId,
            fecha: fechaSeleccionada,
            estado: nuevoEstado
          }, { onConflict: 'clase_id,estudiante_id' });
      } catch (err) {
        console.warn('Aviso guardando asistencia individual:', err);
      }
    }
  }, [fechaSeleccionada, catedraId, isDemo]);

  return {
    estudiantes,
    alumnosElegibles,
    clases,
    claseActiva,
    asistencias,
    inasistenciasDocente,
    fechaSeleccionada,
    setFechaSeleccionada,
    loading,
    saving,
    asistenciasDiaMap,
    asistenciaPorEstudiante,
    statsHoy,
    handleMarcarTodosPresentes,
    handleMarcarTodosAusentes,
    handleToggleEstado,
    refetch: fetchData
  };
}
