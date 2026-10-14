import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getEstudiantesCatedra } from '../services/catedraEstudiantesService';
import { getTodayYMD, formatFechaDMY } from '../lib/dateUtils';
import { handleAppError } from '../utils/handleAppError';
import { ESTADO_ASISTENCIA } from '../lib/enums';
import { toast } from 'sonner';

/**
 * useAttendanceManager
 * Hook desacoplado para gestión de asistencia con soporte de:
 * 1. Selección y edición libre de clases anteriores y nuevas jornadas.
 * 2. Cálculo en tiempo real de porcentaje acumulado por estudiante con umbral laboral adaptativo (60% vs 70%).
 * 3. Persistencia optimista en memoria y sincronización con Supabase (upsert por clase_id, estudiante_id).
 */
export function useAttendanceManager({ catedraId, isDemo = false, user = null, catedra = null }) {
  const [estudiantes, setEstudiantes] = useState([]);
  const [clases, setClases] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [inasistenciasDocente, setInasistenciasDocente] = useState([]);
  
  // Sincronización dual: fecha e ID de clase seleccionada
  const [fechaSeleccionada, setFechaSeleccionadaState] = useState(getTodayYMD());
  const [selectedClaseId, setSelectedClaseId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Carga completa relacional de Clases e Historial de Asistencias
  const fetchData = useCallback(async () => {
    if (!catedraId) return;
    setLoading(true);

    try {
      if (isSupabaseConfigured && !isDemo) {
        // 1. Obtener nómina, clases ordenadas e inasistencias docentes en paralelo
        const [estList, clasesRes, inasDocRes] = await Promise.all([
          getEstudiantesCatedra(catedraId),
          supabase
            .from('clases')
            .select('*')
            .eq('catedra_id', catedraId)
            .order('fecha', { ascending: false }),
          supabase
            .from('inasistencias_docente')
            .select('*')
            .eq('catedra_id', catedraId)
            .order('fecha', { ascending: false })
        ]);

        const rawClases = clasesRes.data || [];
        const allEst = estList || [];
        setEstudiantes(allEst.filter(e => e.estado !== 'BAJA'));
        setClases(rawClases);
        setInasistenciasDocente(inasDocRes.data || []);

        // 2. Obtener asistencias correspondientes a las clases de esta cátedra
        const claseIds = rawClases.map(c => c.id).filter(Boolean);
        let rawAsist = [];
        if (claseIds.length > 0) {
          const { data: asistData, error: asistErr } = await supabase
            .from('asistencias')
            .select('id, clase_id, estudiante_id, estado, updated_at')
            .in('clase_id', claseIds);

          if (!asistErr && Array.isArray(asistData)) {
            rawAsist = asistData;
          }
        }

        // Mapeo defensivo de fecha a partir de clase_id para total compatibilidad
        const claseMap = new Map(rawClases.map(c => [c.id, c]));
        const enrichedAsist = rawAsist.map(a => ({
          ...a,
          fecha: a.fecha || claseMap.get(a.clase_id)?.fecha || null
        }));

        setAsistencias(enrichedAsist);
      } else {
        // Fallback para modo demo / offline
        const storedEst = localStorage.getItem(`docentepro_demo_estudiantes_${catedraId}`);
        const storedClases = localStorage.getItem(`docentepro_demo_clases_${catedraId}`);
        const storedAsist = localStorage.getItem(`docentepro_demo_asistencias_${catedraId}`);

        const parsedClases = storedClases ? JSON.parse(storedClases) : [];
        setEstudiantes(storedEst ? JSON.parse(storedEst) : []);
        setClases(parsedClases);
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

  // Selección manual de clase desde el carrusel
  const handleSelectClase = useCallback((clase) => {
    if (!clase) return;
    setSelectedClaseId(clase.id);
    if (clase.fecha) {
      setFechaSeleccionadaState(clase.fecha);
    }
  }, []);

  // Selección manual de fecha desde el selector Date
  const handleSelectFecha = useCallback((nuevaFecha) => {
    if (!nuevaFecha) return;
    setFechaSeleccionadaState(nuevaFecha);
    // Comprobar si existe una clase registrada en esa fecha
    const claseExistente = clases.find(c => c.fecha === nuevaFecha);
    if (claseExistente) {
      setSelectedClaseId(claseExistente.id);
    } else {
      setSelectedClaseId(null);
    }
  }, [clases]);

  // Resolución reactiva de la clase activa actual
  const claseActiva = useMemo(() => {
    if (selectedClaseId) {
      const encontradaPorId = clases.find(c => c.id === selectedClaseId);
      if (encontradaPorId) return encontradaPorId;
    }
    return clases.find(c => c.fecha === fechaSeleccionada) || null;
  }, [clases, selectedClaseId, fechaSeleccionada]);

  // Alumnos activos elegibles para asistencia (excluyendo equivalencias estrictas)
  const alumnosElegibles = useMemo(() => {
    return estudiantes.filter(e => !e.es_equivalencia);
  }, [estudiantes]);

  // Mapa local de asistencias de la clase / jornada activa
  const asistenciasDiaMap = useMemo(() => {
    const map = new Map();
    asistencias
      .filter(a => {
        if (claseActiva) {
          return a.clase_id === claseActiva.id || a.fecha === fechaSeleccionada;
        }
        return a.fecha === fechaSeleccionada;
      })
      .forEach(a => {
        map.set(a.estudiante_id, a.estado);
      });
    return map;
  }, [asistencias, claseActiva, fechaSeleccionada]);

  // CÁLCULO REACTIVO DEL PORCENTAJE DE ASISTENCIA ACUMULADA POR ESTUDIANTE
  const asistenciaPorEstudiante = useMemo(() => {
    // Clases válidas computables (excluir clases no computables como DOCENTE_AUSENTE o FERIADO)
    const clasesComputables = (clases || []).filter(
      c => c.estado !== 'DOCENTE_AUSENTE' && c.caracter !== 'FERIADO' && c.caracter_clase !== 'DOCENTE_AUSENTE'
    );
    const totalClases = clasesComputables.length;

    const mapa = new Map();
    (estudiantes || []).forEach(est => {
      const estId = est.estudiante_id || est.id;

      if (est.es_equivalencia) {
        mapa.set(estId, {
          presentes: totalClases,
          ausentes: 0,
          totalClases,
          porcentaje: 100,
          umbralRequerido: 60,
          enRiesgo: false,
          esEquivalencia: true
        });
        return;
      }

      let presentes = 0;
      let ausentes = 0;

      clasesComputables.forEach(clase => {
        const registro = (asistencias || []).find(
          a => (a.clase_id === clase.id || a.fecha === clase.fecha) && a.estudiante_id === estId
        );
        const estado = registro?.estado?.toUpperCase();
        if (estado === 'PRESENTE' || estado === 'P' || estado === 'JUSTIFICADO' || estado === 'J') {
          presentes += 1;
        } else if (estado === 'TARDE' || estado === 'T') {
          presentes += 0.5;
        } else if (estado === 'AUSENTE' || estado === 'A') {
          ausentes += 1;
        }
      });

      const porcentaje = totalClases > 0 ? Math.round((presentes / totalClases) * 100) : 100;
      const umbralRequerido = est.tiene_certificado_trabajo
        ? (catedra?.ram_asistencia_trabajo || 60)
        : (catedra?.ram_asistencia_regular || 70);

      mapa.set(estId, {
        presentes,
        ausentes,
        totalClases,
        porcentaje,
        umbralRequerido,
        enRiesgo: totalClases > 0 && porcentaje < umbralRequerido
      });
    });

    return mapa;
  }, [clases, asistencias, estudiantes, catedra]);

  // Métricas de la jornada seleccionada en tiempo real
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

  // Asegurar registro de clase en Supabase o memoria antes de persistir asistencias
  const asegurarClaseActiva = async (fecha) => {
    if (claseActiva && claseActiva.fecha === fecha) return claseActiva;

    const existente = clases.find(c => c.fecha === fecha);
    if (existente) {
      setSelectedClaseId(existente.id);
      return existente;
    }

    const formattedDate = formatFechaDMY(fecha).replace(/-/g, '/');
    const nuevoNumero = clases.length + 1;
    const nuevaClasePayload = {
      id: `clase-${Date.now()}`,
      catedra_id: catedraId,
      fecha,
      tema: `Clase del ${formattedDate}`,
      numero_clase: nuevoNumero
    };

    if (isSupabaseConfigured && !isDemo) {
      try {
        const { data, error } = await supabase
          .from('clases')
          .insert({
            catedra_id: catedraId,
            fecha,
            tema: nuevaClasePayload.tema,
            numero_clase: nuevoNumero
          })
          .select()
          .single();

        if (!error && data) {
          setClases(prev => [data, ...prev]);
          setSelectedClaseId(data.id);
          return data;
        }
      } catch (err) {
        console.warn('Aviso asegurando clase en Supabase:', err);
      }
    }

    // Fallback demo/offline
    setClases(prev => {
      const updated = [nuevaClasePayload, ...prev];
      if (isDemo || !isSupabaseConfigured) {
        localStorage.setItem(`docentepro_demo_clases_${catedraId}`, JSON.stringify(updated));
      }
      return updated;
    });
    setSelectedClaseId(nuevaClasePayload.id);
    return nuevaClasePayload;
  };

  // Marcar a toda la nómina como PRESENTE
  const handleMarcarTodosPresentes = useCallback(async () => {
    if (alumnosElegibles.length === 0) return;
    setSaving(true);

    try {
      const clase = await asegurarClaseActiva(fechaSeleccionada);
      const targetClaseId = clase?.id;
      if (!targetClaseId) return;

      const nuevasAsistencias = alumnosElegibles.map(e => ({
        id: `asist-${Date.now()}-${e.id}`,
        clase_id: targetClaseId,
        estudiante_id: e.id,
        fecha: fechaSeleccionada,
        estado: ESTADO_ASISTENCIA.PRESENTE
      }));

      // Actualización optimista local inmediata
      setAsistencias(prev => {
        const filtradas = prev.filter(
          a => a.clase_id !== targetClaseId && a.fecha !== fechaSeleccionada
        );
        const next = [...filtradas, ...nuevasAsistencias];
        if (isDemo || !isSupabaseConfigured) {
          localStorage.setItem(`docentepro_demo_asistencias_${catedraId}`, JSON.stringify(next));
        }
        return next;
      });

      if (isSupabaseConfigured && !isDemo) {
        const rowsToUpsert = nuevasAsistencias.map(a => ({
          clase_id: targetClaseId,
          estudiante_id: a.estudiante_id,
          estado: a.estado,
          updated_at: new Date().toISOString()
        }));

        await supabase
          .from('asistencias')
          .upsert(rowsToUpsert, { onConflict: 'clase_id, estudiante_id' });
      }

      toast.success(`Se marcaron ${alumnosElegibles.length} estudiantes como PRESENTES.`);
    } catch (err) {
      handleAppError(err, 'useAttendanceManager / handleMarcarTodosPresentes', user);
    } finally {
      setSaving(false);
    }
  }, [alumnosElegibles, fechaSeleccionada, catedraId, isDemo, user, claseActiva, clases]);

  // Marcar a toda la nómina como AUSENTE
  const handleMarcarTodosAusentes = useCallback(async () => {
    if (alumnosElegibles.length === 0) return;
    setSaving(true);

    try {
      const clase = await asegurarClaseActiva(fechaSeleccionada);
      const targetClaseId = clase?.id;
      if (!targetClaseId) return;

      const nuevasAsistencias = alumnosElegibles.map(e => ({
        id: `asist-${Date.now()}-${e.id}`,
        clase_id: targetClaseId,
        estudiante_id: e.id,
        fecha: fechaSeleccionada,
        estado: ESTADO_ASISTENCIA.AUSENTE
      }));

      setAsistencias(prev => {
        const filtradas = prev.filter(
          a => a.clase_id !== targetClaseId && a.fecha !== fechaSeleccionada
        );
        const next = [...filtradas, ...nuevasAsistencias];
        if (isDemo || !isSupabaseConfigured) {
          localStorage.setItem(`docentepro_demo_asistencias_${catedraId}`, JSON.stringify(next));
        }
        return next;
      });

      if (isSupabaseConfigured && !isDemo) {
        const rowsToUpsert = nuevasAsistencias.map(a => ({
          clase_id: targetClaseId,
          estudiante_id: a.estudiante_id,
          estado: a.estado,
          updated_at: new Date().toISOString()
        }));

        await supabase
          .from('asistencias')
          .upsert(rowsToUpsert, { onConflict: 'clase_id, estudiante_id' });
      }

      toast.info(`Se marcaron ${alumnosElegibles.length} inasistencias generales.`);
    } catch (err) {
      handleAppError(err, 'useAttendanceManager / handleMarcarTodosAusentes', user);
    } finally {
      setSaving(false);
    }
  }, [alumnosElegibles, fechaSeleccionada, catedraId, isDemo, user, claseActiva, clases]);

  // Alternar estado individual de asistencia
  const handleToggleEstado = useCallback(async (estudianteId, nuevoEstado) => {
    try {
      const clase = await asegurarClaseActiva(fechaSeleccionada);
      const targetClaseId = clase?.id;
      if (!targetClaseId) return;

      const nuevaAsist = {
        id: `asist-${Date.now()}-${estudianteId}`,
        clase_id: targetClaseId,
        estudiante_id: estudianteId,
        fecha: fechaSeleccionada,
        estado: nuevoEstado
      };

      setAsistencias(prev => {
        const idx = prev.findIndex(
          a => a.estudiante_id === estudianteId && (a.clase_id === targetClaseId || a.fecha === fechaSeleccionada)
        );
        let updated;
        if (idx >= 0) {
          updated = [...prev];
          updated[idx] = { 
            ...updated[idx], 
            estado: nuevoEstado, 
            clase_id: targetClaseId, 
            fecha: fechaSeleccionada 
          };
        } else {
          updated = [...prev, nuevaAsist];
        }

        if (isDemo || !isSupabaseConfigured) {
          localStorage.setItem(`docentepro_demo_asistencias_${catedraId}`, JSON.stringify(updated));
        }
        return updated;
      });

      if (isSupabaseConfigured && !isDemo) {
        await supabase
          .from('asistencias')
          .upsert({
            clase_id: targetClaseId,
            estudiante_id: estudianteId,
            estado: nuevoEstado,
            updated_at: new Date().toISOString()
          }, { onConflict: 'clase_id, estudiante_id' });
      }
    } catch (err) {
      handleAppError(err, 'useAttendanceManager / handleToggleEstado', user);
    }
  }, [fechaSeleccionada, catedraId, isDemo, user, claseActiva, clases]);

  return {
    estudiantes,
    alumnosElegibles,
    clases,
    claseActiva,
    selectedClaseId,
    asistencias,
    inasistenciasDocente,
    fechaSeleccionada,
    setFechaSeleccionada: handleSelectFecha,
    handleSelectClase,
    handleSelectFecha,
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
