import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getEstudiantesCatedra } from '../services/catedraEstudiantesService';
import { getTodayYMD, formatFechaDMY } from '../lib/dateUtils';
import { handleAppError } from '../utils/handleAppError';
import { ESTADO_ASISTENCIA } from '../lib/enums';
import { enqueueOfflineMutation } from '../services/offlineSyncService';
import { ensureScheduledClassesToDate } from '../utils/scheduledClassesHelper';
import { getLocalLicencias, isFechaCubiertaPorLicencias } from '../services/licenciasService';
import { toast } from 'sonner';

/**
 * useAttendanceManager
 * Hook desacoplado para gestión de asistencia con soporte de:
 * 1. Selección y edición libre de clases anteriores y nuevas jornadas.
 * 2. Autogeneración de clases según cronograma semanal y feriados.
 * 3. Cálculo en tiempo real de porcentaje acumulado por estudiante con umbral laboral adaptativo (60% vs 70%).
 * 4. Exclusión estricta de días con licencia docente (Decreto 1092) para no penalizar a los estudiantes.
 * 5. Persistencia optimista en memoria y sincronización con Supabase (upsert por clase_id, estudiante_id) con cola offline resiliente.
 */
export function useAttendanceManager({ catedraId, isDemo = false, user = null, catedra = null }) {
  const [estudiantes, setEstudiantes] = useState([]);
  const [clases, setClases] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [inasistenciasDocente, setInasistenciasDocente] = useState([]);
  const [licenciasDocente, setLicenciasDocente] = useState([]);
  
  // Sincronización dual: fecha e ID de clase seleccionada
  const [fechaSeleccionada, setFechaSeleccionadaState] = useState(getTodayYMD());
  const [selectedClaseId, setSelectedClaseId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Carga completa relacional de Clases e Historial de Asistencias
  const fetchData = useCallback(async () => {
    if (!catedraId) return;
    setLoading(true);
    let rawLicencias = [];

    try {
      if (isSupabaseConfigured && !isDemo) {
        // 1. Obtener nómina, clases ordenadas, inasistencias docentes y unidades en paralelo
        const [estList, clasesRes, inasDocRes, uniRes] = await Promise.all([
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
            .order('fecha', { ascending: false }),
          supabase
            .from('unidades_tematicas')
            .select('*')
            .eq('catedra_id', catedraId)
            .order('numero', { ascending: true })
        ]);

        let rawClases = clasesRes.data || [];
        const allEst = estList || [];
        setEstudiantes(allEst.filter(e => e.estado !== 'BAJA'));
        setInasistenciasDocente(inasDocRes.data || []);
        setUnidades(uniRes.data || []);

        // Autogeneración transparente de clases según horarios de la cátedra
        if (catedra) {
          const autoRes = await ensureScheduledClassesToDate(catedra, rawClases, isDemo);
          if (autoRes.nuevas.length > 0) {
            rawClases = autoRes.all;
          }
        }
        setClases(rawClases);

        // Seleccionar por defecto la clase más reciente para tomar asistencia con un toque
        if (rawClases.length > 0) {
          const masReciente = rawClases[0];
          setSelectedClaseId(masReciente.id);
          setFechaSeleccionadaState(masReciente.fecha);
        }

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

        // 3. Obtener licencias docentes desde Supabase
        try {
          const { data: licData } = await supabase
            .from('licencias_docentes')
            .select('*')
            .order('fecha', { ascending: false });
          if (Array.isArray(licData)) {
            rawLicencias = licData;
          }
        } catch (licFetchErr) {
          console.warn('Error consultando licencias_docentes en useAttendanceManager:', licFetchErr);
        }
      } else {
        // Fallback para modo demo / offline (con soporte de claves con y sin prefijo)
        const storedEst = localStorage.getItem(`docentepro_demo_estudiantes_${catedraId}`) || localStorage.getItem(`estudiantes_${catedraId}`);
        const storedClases = localStorage.getItem(`docentepro_demo_clases_${catedraId}`) || localStorage.getItem(`clases_${catedraId}`);
        const storedAsist = localStorage.getItem(`docentepro_demo_asistencias_${catedraId}`) || localStorage.getItem(`asistencias_${catedraId}`);
        const storedUni = localStorage.getItem(`unidades_tematicas_${catedraId}`);

        let parsedClases = storedClases ? JSON.parse(storedClases) : [];
        if (catedra) {
          const autoRes = await ensureScheduledClassesToDate(catedra, parsedClases, true);
          if (autoRes.nuevas.length > 0) {
            parsedClases = autoRes.all;
            try {
              const jsonClases = JSON.stringify(parsedClases);
              localStorage.setItem(`docentepro_demo_clases_${catedraId}`, jsonClases);
              localStorage.setItem(`clases_${catedraId}`, jsonClases);
            } catch (_) {}
          }
        }

        setEstudiantes(storedEst ? JSON.parse(storedEst) : []);
        setClases(parsedClases);
        setAsistencias(storedAsist ? JSON.parse(storedAsist) : []);
        setUnidades(storedUni ? JSON.parse(storedUni) : []);

        if (parsedClases.length > 0) {
          const masReciente = parsedClases[0];
          setSelectedClaseId(masReciente.id);
          setFechaSeleccionadaState(masReciente.fecha);
        }
      }

      // 4. Unificar con licencias locales (offline / demo / sincronización inmediata)
      const localLics = getLocalLicencias(user?.id);
      const combinedLics = [...rawLicencias];
      for (const l of localLics) {
        if (!combinedLics.some(cl => cl.id === l.id)) {
          combinedLics.push(l);
        }
      }
      setLicenciasDocente(combinedLics);
    } catch (err) {
      handleAppError(err, 'useAttendanceManager / fetchData', user);
    } finally {
      setLoading(false);
    }
  }, [catedraId, isDemo, user, catedra]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Recarga reactiva si se registra o modifica una licencia docente
  useEffect(() => {
    const handleLicenciasUpdated = () => {
      fetchData();
    };
    window.addEventListener('licencias_docentes_updated', handleLicenciasUpdated);
    return () => {
      window.removeEventListener('licencias_docentes_updated', handleLicenciasUpdated);
    };
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
  // Regla estricta: Toda fecha cubierta por Licencia Docente (Decreto 1092) queda
  // excluida de clasesComputables (denominador), impidiendo penalizar el porcentaje estudiantil.
  const asistenciaPorEstudiante = useMemo(() => {
    const fechasLicenciaInas = new Set((inasistenciasDocente || []).map(i => i.fecha).filter(Boolean));

    const isClaseCubiertaPorLicencia = (c) => {
      if (!c) return false;
      if (c.estado === 'DOCENTE_AUSENTE' || Boolean(c.articulo_licencia)) return true;
      if (c.caracter === 'DOCENTE_AUSENTE' || c.caracter_clase === 'DOCENTE_AUSENTE') return true;
      if (fechasLicenciaInas.has(c.fecha)) return true;
      if (isFechaCubiertaPorLicencias(c.fecha, licenciasDocente, catedraId).cubierta) return true;
      return false;
    };

    const clasesComputables = (clases || []).filter(
      c => c.caracter !== 'FERIADO' && !isClaseCubiertaPorLicencia(c)
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
        if (estado === 'PRESENTE' || estado === 'P' || estado === 'JUSTIFICADO' || estado === 'JUSTIFICADA' || estado === 'J') {
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
  }, [clases, asistencias, estudiantes, catedra, inasistenciasDocente, licenciasDocente, catedraId]);

  // Métricas de la jornada seleccionada en tiempo real
  const statsHoy = useMemo(() => {
    const total = alumnosElegibles.length;
    let presentes = 0;
    let ausentes = 0;
    let justificados = 0;

    alumnosElegibles.forEach(e => {
      const rawSt = asistenciasDiaMap.get(e.id);
      if (!rawSt) return;
      const st = String(rawSt).toUpperCase();
      if (st === ESTADO_ASISTENCIA.PRESENTE || st === 'P' || st === 'TARDE' || st === 'T') presentes++;
      else if (st === ESTADO_ASISTENCIA.AUSENTE || st === 'A') ausentes++;
      else if (st === ESTADO_ASISTENCIA.JUSTIFICADO || st === ESTADO_ASISTENCIA.JUSTIFICADA || st === 'J') justificados++;
    });

    const pctDia = total > 0 ? Math.round(((presentes + justificados) / total) * 100) : 0;
    return { total, presentes, ausentes, justificados, pctDia };
  }, [alumnosElegibles, asistenciasDiaMap]);

  const creatingClasePromiseRef = useRef(null);

  // Asegurar registro de clase en Supabase o memoria antes de persistir asistencias (con mutex contra clics simultáneos)
  const asegurarClaseActiva = async (fecha) => {
    if (claseActiva && claseActiva.fecha === fecha) return claseActiva;

    const existente = clases.find(c => c.fecha === fecha);
    if (existente) {
      setSelectedClaseId(existente.id);
      return existente;
    }

    if (creatingClasePromiseRef.current) {
      return creatingClasePromiseRef.current;
    }

    const createTask = (async () => {
      try {
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
              setClases(prev => [data, ...prev.filter(c => c.id !== data.id)]);
              setSelectedClaseId(data.id);
              return data;
            }
          } catch (err) {
            console.warn('Aviso asegurando clase en Supabase:', err);
          }
        }

        // Fallback demo/offline
        setClases(prev => {
          const updated = [nuevaClasePayload, ...prev.filter(c => c.fecha !== fecha)];
          if (isDemo || !isSupabaseConfigured) {
            const json = JSON.stringify(updated);
            localStorage.setItem(`docentepro_demo_clases_${catedraId}`, json);
            localStorage.setItem(`clases_${catedraId}`, json);
          }
          return updated;
        });
        setSelectedClaseId(nuevaClasePayload.id);
        return nuevaClasePayload;
      } finally {
        creatingClasePromiseRef.current = null;
      }
    })();

    creatingClasePromiseRef.current = createTask;
    return createTask;
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

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          enqueueOfflineMutation({
            tipo: 'ASISTENCIA_LOTE',
            payload: rowsToUpsert,
            catedraId
          });
        } else {
          try {
            await supabase
              .from('asistencias')
              .upsert(rowsToUpsert, { onConflict: 'clase_id, estudiante_id' });
          } catch (netErr) {
            enqueueOfflineMutation({
              tipo: 'ASISTENCIA_LOTE',
              payload: rowsToUpsert,
              catedraId
            });
          }
        }
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

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          enqueueOfflineMutation({
            tipo: 'ASISTENCIA_LOTE',
            payload: rowsToUpsert,
            catedraId
          });
        } else {
          try {
            await supabase
              .from('asistencias')
              .upsert(rowsToUpsert, { onConflict: 'clase_id, estudiante_id' });
          } catch (netErr) {
            enqueueOfflineMutation({
              tipo: 'ASISTENCIA_LOTE',
              payload: rowsToUpsert,
              catedraId
            });
          }
        }
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
        const rowToUpsert = {
          clase_id: targetClaseId,
          estudiante_id: estudianteId,
          estado: nuevoEstado,
          updated_at: new Date().toISOString()
        };

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          enqueueOfflineMutation({
            tipo: 'ASISTENCIA_INDIVIDUAL',
            payload: rowToUpsert,
            catedraId
          });
        } else {
          try {
            await supabase
              .from('asistencias')
              .upsert(rowToUpsert, { onConflict: 'clase_id, estudiante_id' });
          } catch (netErr) {
            enqueueOfflineMutation({
              tipo: 'ASISTENCIA_INDIVIDUAL',
              payload: rowToUpsert,
              catedraId
            });
          }
        }
      }
    } catch (err) {
      handleAppError(err, 'useAttendanceManager / handleToggleEstado', user);
    }
  }, [fechaSeleccionada, catedraId, isDemo, user, claseActiva, clases]);

  // Actualizar tema, unidad o estado de una clase específica
  const handleUpdateClase = useCallback(async (claseId, updates) => {
    if (!claseId) return;
    try {
      setClases(prev => {
        const next = prev.map(c => c.id === claseId ? { ...c, ...updates } : c);
        if (isDemo || !isSupabaseConfigured) {
          localStorage.setItem(`docentepro_demo_clases_${catedraId}`, JSON.stringify(next));
        }
        return next;
      });

      if (isSupabaseConfigured && !isDemo) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          enqueueOfflineMutation({
            tipo: 'CLASE_UPSERT',
            payload: { id: claseId, catedra_id: catedraId, ...updates },
            catedraId
          });
        } else {
          try {
            await supabase
              .from('clases')
              .update(updates)
              .eq('id', claseId);
          } catch (netErr) {
            enqueueOfflineMutation({
              tipo: 'CLASE_UPSERT',
              payload: { id: claseId, catedra_id: catedraId, ...updates },
              catedraId
            });
          }
        }
      }
      toast.success('Clase actualizada correctamente.');
    } catch (err) {
      handleAppError(err, 'useAttendanceManager / handleUpdateClase', user);
    }
  }, [catedraId, isDemo, user]);

  // Determinación reactiva de si la clase o fecha seleccionada está cubierta por licencia
  const licenciaDocenteActiva = useMemo(() => {
    const checkDate = claseActiva?.fecha || fechaSeleccionada;
    const res = isFechaCubiertaPorLicencias(checkDate, licenciasDocente, catedraId);
    if (res.cubierta) return res.licencia;
    if (claseActiva?.estado === 'DOCENTE_AUSENTE' || claseActiva?.articulo_licencia) {
      return {
        articulo: claseActiva.articulo_licencia || 'Decreto 1092',
        observacion: claseActiva.observaciones || ''
      };
    }
    return null;
  }, [claseActiva, fechaSeleccionada, licenciasDocente, catedraId]);

  const isLicenciaDocente = Boolean(licenciaDocenteActiva);

  return {
    estudiantes,
    alumnosElegibles,
    clases,
    unidades,
    claseActiva,
    selectedClaseId,
    asistencias,
    inasistenciasDocente,
    licenciasDocente,
    isLicenciaDocente,
    licenciaDocenteActiva,
    fechaSeleccionada,
    setFechaSeleccionada: handleSelectFecha,
    handleSelectClase,
    handleSelectFecha,
    handleUpdateClase,
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
