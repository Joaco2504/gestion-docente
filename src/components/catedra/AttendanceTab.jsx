import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Check, 
  X, 
  Calendar as CalendarIcon, 
  Users, 
  CheckCheck, 
  Clock, 
  AlertCircle,
  Save,
  CheckCircle2,
  Percent,
  ShieldAlert,
  FileText,
  Trash2,
  BookOpen,
  ChevronDown,
  Printer,
  Pencil,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';
import Modal from '../common/Modal';
import CustomSelect from '../common/CustomSelect';
import EmptyState from '../common/EmptyState';
import { SkeletonTable } from '../common/SkeletonLoader';
import PrintPreviewModal from '../common/PrintPreviewModal';
import EditClassModal from './EditClassModal';
import ConfirmDeleteClassModal from './ConfirmDeleteClassModal';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatFechaDMY, parseDMYtoYMD, getTodayYMD } from '../../lib/dateUtils';
import { calcularPorcentajeAsistencia } from '../../lib/academicLogic';
import { DECRETO_1092_CATAMARCA } from '../../data/decreto1092Catamarca';
import LicenciasDecreto1092Table from './LicenciasDecreto1092Table';
import RiskBadge from '../common/RiskBadge';
import { calculateStudentRisk } from '../../lib/earlyWarningLogic';

export default function AttendanceTab({
  catedraId,
  catedraName
}) {
  const { user, isDemo } = useAuth();
  
  const [clases, setClases] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [inasistenciasDocente, setInasistenciasDocente] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [notas, setNotas] = useState([]);
  const [criterios, setCriterios] = useState({});
  const [loading, setLoading] = useState(true);
  const [flashingStudentId, setFlashingStudentId] = useState(null);

  // Unidades Temáticas del Programa Didáctico
  const [unidades, setUnidades] = useState([]);
  const [nuevaUnidadId, setNuevaUnidadId] = useState('');
  const [isQuickCreatingUnidad, setIsQuickCreatingUnidad] = useState(false);
  const [quickUnidadNum, setQuickUnidadNum] = useState(1);
  const [quickUnidadTitulo, setQuickUnidadTitulo] = useState('');
  const [savingQuickUnit, setSavingQuickUnit] = useState(false);

  // Mapa de estadísticas y porcentaje acumulado de asistencia por estudiante
  const studentStatsMap = React.useMemo(() => {
    const totalClases = clases.length;
    const clasesConLicencia = inasistenciasDocente.filter(
      i => i.tipo === 'LICENCIA' && clases.some(c => c.fecha === i.fecha)
    ).length;

    const map = new Map();
    estudiantes.forEach(est => {
      const studentAsist = asistencias.filter(a => a.estudiante_id === est.id);
      const pct = calcularPorcentajeAsistencia(studentAsist, totalClases, clasesConLicencia);
      map.set(est.id, pct);
    });
    return map;
  }, [estudiantes, asistencias, clases, inasistenciasDocente]);

  // Mapa reactivo del Semáforo de Riesgo por estudiante
  const studentRiskMap = React.useMemo(() => {
    const map = new Map();
    estudiantes.forEach(est => {
      const risk = calculateStudentRisk(est.id, {
        asistencias,
        clases,
        inasistenciasDocente,
        evaluaciones,
        notas,
        criterios
      });
      map.set(est.id, risk);
    });
    return map;
  }, [estudiantes, asistencias, clases, inasistenciasDocente, evaluaciones, notas, criterios]);

  // Retroalimentación háptica en dispositivos móviles táctiles
  const triggerHapticFeedback = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(25);
      } catch (_) {}
    }
  };

  const [selectedClaseId, setSelectedClaseId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState(new Date().toISOString().split('T')[0]);
  const [nuevoTema, setNuevoTema] = useState('');
  const [savingClase, setSavingClase] = useState(false);

  // Estados Modal Edición Rápida y Eliminación Segura de Clase
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [isDeleteClassModalOpen, setIsDeleteClassModalOpen] = useState(false);
  const [deleteClassCount, setDeleteClassCount] = useState(0);
  const [savingEditClass, setSavingEditClass] = useState(false);
  const [deletingClass, setDeletingClass] = useState(false);

  // Modal Inasistencia Docente
  const [isInasistenciaModalOpen, setIsInasistenciaModalOpen] = useState(false);
  const [fechaInasistencia, setFechaInasistencia] = useState(new Date().toISOString().split('T')[0]);
  const [tipoInasistencia, setTipoInasistencia] = useState('LICENCIA');
  const [articuloLicencia, setArticuloLicencia] = useState('Art. 17° - Afecciones Comunes de Corto Tratamiento');
  const [otroArticulo, setOtroArticulo] = useState('');
  const [obsInasistencia, setObsInasistencia] = useState('');
  const [savingInasistencia, setSavingInasistencia] = useState(false);

  // Estados para Tabla Resumen Decreto Acuerdo N° 1092 Catamarca
  const [isDecretoModalOpen, setIsDecretoModalOpen] = useState(false);
  const [isLicenciasApartadoOpen, setIsLicenciasApartadoOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Opciones completas de artículos oficiales según Decreto Acuerdo N° 1092/2015
  const articuloOptions = React.useMemo(() => [
    ...DECRETO_1092_CATAMARCA.map(art => ({
      value: `${art.numero} - ${art.titulo}`,
      label: `${art.numero} - ${art.titulo}`,
      badge: art.conGoce.toLowerCase().includes('con goce') ? 'Con goce' : undefined
    })),
    { value: 'OTRO', label: 'Otro artículo o motivo específico...' }
  ], []);

  useEffect(() => {
    fetchData();
  }, [catedraId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        // 1. Clases
        const { data: cData } = await supabase
          .from('clases')
          .select('*')
          .eq('catedra_id', catedraId)
          .order('fecha', { ascending: false });

        // 2. Estudiantes inscriptos
        const { data: inscData } = await supabase
          .from('inscripciones')
          .select(`
            estudiante_id,
            estudiantes (
              id,
              dni,
              apellido,
              nombre
            )
          `)
          .eq('catedra_id', catedraId);

        const estList = (inscData || []).map(i => i.estudiantes).filter(Boolean);
        estList.sort((a, b) => a.apellido.localeCompare(b.apellido));

        // 3. Asistencias
        const { data: aData } = await supabase
          .from('asistencias')
          .select('*')
          .in('clase_id', (cData || []).map(c => c.id));

        // 4. Inasistencias Docente
        const { data: inasistData } = await supabase
          .from('inasistencias_docente')
          .select('*')
          .eq('catedra_id', catedraId);

        // 5. Evaluaciones, Notas y Criterios (para Semáforo de Riesgo)
        const { data: evData } = await supabase
          .from('evaluaciones')
          .select('*')
          .eq('catedra_id', catedraId);
        setEvaluaciones(evData || []);

        const evIds = (evData || []).map(e => e.id);
        if (evIds.length > 0) {
          const { data: nData } = await supabase
            .from('notas')
            .select('*')
            .in('evaluacion_id', evIds);
          setNotas(nData || []);
        } else {
          setNotas([]);
        }

        try {
          const { data: critData } = await supabase
            .from('criterios_evaluacion')
            .select('*')
            .eq('catedra_id', catedraId)
            .maybeSingle();
          if (critData) setCriterios(critData);
        } catch (_) {}

        // 6. Unidades Temáticas del Programa
        try {
          const { data: uData, error: uErr } = await supabase
            .from('unidades_tematicas')
            .select('*')
            .eq('catedra_id', catedraId)
            .order('numero', { ascending: true });
          if (!uErr && uData) {
            setUnidades(uData);
          } else {
            const storedU = localStorage.getItem(`unidades_tematicas_${catedraId}`);
            if (storedU) setUnidades(JSON.parse(storedU));
          }
        } catch (_) {
          const storedU = localStorage.getItem(`unidades_tematicas_${catedraId}`);
          if (storedU) setUnidades(JSON.parse(storedU));
        }

        const cls = cData || [];
        setClases(cls);
        setEstudiantes(estList);
        setAsistencias(aData || []);
        setInasistenciasDocente(inasistData || []);
        if (cls.length > 0 && !selectedClaseId) {
          setSelectedClaseId(cls[0].id);
        }
      } else {
        // Demo mode fallback
        const storedClases = localStorage.getItem(`clases_${catedraId}`);
        const storedEst = localStorage.getItem(`estudiantes_${catedraId}`);
        const storedAsist = localStorage.getItem(`asistencias_${catedraId}`);
        const storedInasist = localStorage.getItem(`inasistencias_docente_${catedraId}`);
        const storedUnidades = localStorage.getItem(`unidades_tematicas_${catedraId}`);

        let cls = storedClases ? JSON.parse(storedClases) : [
          { id: 'clase-1', catedra_id: catedraId, fecha: '2026-03-02', tema: 'Presentación de la Cátedra y Pautas', unidad_id: 'unit-1' },
          { id: 'clase-2', catedra_id: catedraId, fecha: '2026-03-09', tema: 'Fundamentos y Arquitectura de Datos', unidad_id: 'unit-1' }
        ];

        let uList = storedUnidades ? JSON.parse(storedUnidades) : [
          { id: 'unit-1', catedra_id: catedraId, numero: 1, titulo: 'Fundamentos y Arquitectura de Datos' },
          { id: 'unit-2', catedra_id: catedraId, numero: 2, titulo: 'Diseño y Modelado Conceptual' }
        ];

        let estList = storedEst ? JSON.parse(storedEst) : [
          { id: 'est-1', dni: '40111222', apellido: 'Álvarez', nombre: 'Martín' },
          { id: 'est-2', dni: '39444555', apellido: 'Benítez', nombre: 'Lucía' },
          { id: 'est-3', dni: '41888999', apellido: 'Castillo', nombre: 'Ignacio' },
          { id: 'est-4', dni: '38222333', apellido: 'Domínguez', nombre: 'Valentina' },
          { id: 'est-5', dni: '42333444', apellido: 'Fernández', nombre: 'Santiago' }
        ];

        let asist = storedAsist ? JSON.parse(storedAsist) : [
          { clase_id: 'clase-1', estudiante_id: 'est-1', estado: 'PRESENTE' },
          { clase_id: 'clase-1', estudiante_id: 'est-2', estado: 'PRESENTE' },
          { clase_id: 'clase-1', estudiante_id: 'est-3', estado: 'PRESENTE' },
          { clase_id: 'clase-1', estudiante_id: 'est-4', estado: 'AUSENTE' },
          { clase_id: 'clase-1', estudiante_id: 'est-5', estado: 'PRESENTE' },
          { clase_id: 'clase-2', estudiante_id: 'est-1', estado: 'PRESENTE' },
          { clase_id: 'clase-2', estudiante_id: 'est-2', estado: 'AUSENTE' },
          { clase_id: 'clase-2', estudiante_id: 'est-3', estado: 'PRESENTE' },
          { clase_id: 'clase-2', estudiante_id: 'est-4', estado: 'PRESENTE' },
          { clase_id: 'clase-2', estudiante_id: 'est-5', estado: 'PRESENTE' }
        ];

        let inasist = storedInasist ? JSON.parse(storedInasist) : [];

        setClases(cls);
        setUnidades(uList);
        setEstudiantes(estList);
        setAsistencias(asist);
        setInasistenciasDocente(inasist);
        if (cls.length > 0) setSelectedClaseId(cls[0].id);

        localStorage.setItem(`clases_${catedraId}`, JSON.stringify(cls));
        localStorage.setItem(`unidades_tematicas_${catedraId}`, JSON.stringify(uList));
        localStorage.setItem(`estudiantes_${catedraId}`, JSON.stringify(estList));
        localStorage.setItem(`asistencias_${catedraId}`, JSON.stringify(asist));
        localStorage.setItem(`inasistencias_docente_${catedraId}`, JSON.stringify(inasist));
      }
    } catch (err) {
      console.error('Error fetching attendance data:', err);
      toast.error('Error al cargar datos de asistencia.');
    } finally {
      setLoading(false);
    }
  };

  const activeClase = clases.find(c => c.id === selectedClaseId) || clases[0];

  // Creación rápida de unidad temática al vuelo
  const handleQuickCreateUnidad = async ({ numero, titulo }) => {
    try {
      const payload = {
        catedra_id: catedraId,
        docente_id: user?.id || 'demo-user',
        numero: Number(numero) || (unidades.length + 1),
        titulo: titulo.trim(),
        descripcion: ''
      };

      let newUnit = null;
      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('unidades_tematicas')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        newUnit = data;
      } else {
        newUnit = { ...payload, id: 'unit-' + Date.now() };
      }

      const updated = [...unidades, newUnit].sort((a, b) => Number(a.numero) - Number(b.numero));
      setUnidades(updated);
      localStorage.setItem(`unidades_tematicas_${catedraId}`, JSON.stringify(updated));
      toast.success(`Unidad ${newUnit.numero}: ${newUnit.titulo} creada.`);
      return newUnit;
    } catch (err) {
      console.warn('Fallback quick create unit locally:', err);
      const fallbackUnit = {
        id: 'unit-' + Date.now(),
        catedra_id: catedraId,
        numero: Number(numero) || (unidades.length + 1),
        titulo: titulo.trim(),
        descripcion: ''
      };
      const updated = [...unidades, fallbackUnit].sort((a, b) => Number(a.numero) - Number(b.numero));
      setUnidades(updated);
      localStorage.setItem(`unidades_tematicas_${catedraId}`, JSON.stringify(updated));
      toast.success(`Unidad ${fallbackUnit.numero} creada (Modo Local).`);
      return fallbackUnit;
    }
  };

  const handleCreateClase = async (e) => {
    e.preventDefault();
    if (!nuevaFecha) return;
    setSavingClase(true);
    try {
      if (isSupabaseConfigured && !isDemo && !user?.id) {
        throw new Error('Sesión no válida. Inicia sesión nuevamente.');
      }
      const fechaIso = parseDMYtoYMD(nuevaFecha);
      const fechaDmy = formatFechaDMY(nuevaFecha);

      const newClaseObj = {
        catedra_id: catedraId,
        fecha: fechaIso,
        tema: nuevoTema.trim() || 'Clase Regular',
        unidad_id: nuevaUnidadId || null
      };

      let claseId = null;
      if (isSupabaseConfigured && !isDemo) {
        let { data, error } = await supabase
          .from('clases')
          .insert(newClaseObj)
          .select()
          .single();

        if (error && (error.message?.includes('column') || error.code === '42703')) {
          // Fallback si la columna unidad_id aún no existe
          const { data: fbData, error: fbErr } = await supabase
            .from('clases')
            .insert({
              catedra_id: catedraId,
              fecha: fechaIso,
              tema: nuevoTema.trim() || 'Clase Regular'
            })
            .select()
            .single();
          if (fbErr) throw fbErr;
          data = { ...fbData, unidad_id: nuevaUnidadId || null };
        } else if (error) {
          throw error;
        }

        claseId = data.id;
        const updated = [data, ...clases];
        setClases(updated);
        setSelectedClaseId(data.id);
        localStorage.setItem(`clases_${catedraId}`, JSON.stringify(updated));
      } else {
        const created = { ...newClaseObj, id: 'clase-' + Date.now() };
        claseId = created.id;
        const updated = [created, ...clases];
        setClases(updated);
        setSelectedClaseId(created.id);
        localStorage.setItem(`clases_${catedraId}`, JSON.stringify(updated));
      }

      // Automatically mark all currently enrolled students as PRESENTE
      if (claseId && estudiantes.length > 0) {
        const defaultAttendance = estudiantes.map(e => ({
          clase_id: claseId,
          estudiante_id: e.id,
          estado: 'PRESENTE'
        }));

        if (isSupabaseConfigured && !isDemo) {
          const { error: asistError } = await supabase
            .from('asistencias')
            .upsert(defaultAttendance, { onConflict: 'clase_id, estudiante_id' });
          if (asistError) console.warn('Aviso al autocompletar asistencias:', asistError);
        } else {
          const prevStored = JSON.parse(localStorage.getItem(`asistencias_${catedraId}`) || '[]');
          localStorage.setItem(`asistencias_${catedraId}`, JSON.stringify([...prevStored, ...defaultAttendance]));
        }

        setAsistencias(prev => [...prev, ...defaultAttendance]);
      }

      toast.success(`Clase del ${fechaDmy} guardada. Todos los alumnos fueron marcados como presentes.`);
      setIsModalOpen(false);
      setNuevoTema('');
      setNuevaUnidadId('');
      setIsQuickCreatingUnidad(false);
    } catch (err) {
      toast.error('Error al crear clase: ' + err.message);
    } finally {
      setSavingClase(false);
    }
  };

  // Toggle or set state
  const handleToggle = async (estudianteId, nuevoEstado) => {
    if (!activeClase) return;
    triggerHapticFeedback();
    setFlashingStudentId(estudianteId);
    setTimeout(() => setFlashingStudentId(null), 800);

    // Preserve previous state for rollback on error
    const previousState = [...asistencias];

    // Optimistic local update
    const filtered = asistencias.filter(
      a => !(a.clase_id === activeClase.id && a.estudiante_id === estudianteId)
    );
    const updated = [...filtered, { clase_id: activeClase.id, estudiante_id: estudianteId, estado: nuevoEstado }];
    setAsistencias(updated);

    try {
      if (isSupabaseConfigured && !isDemo) {
        if (!user?.id) {
          throw new Error('Sesión de usuario requerida para registrar asistencias.');
        }

        const { error } = await supabase
          .from('asistencias')
          .upsert({
            clase_id: activeClase.id,
            estudiante_id: estudianteId,
            estado: nuevoEstado
          }, { onConflict: 'clase_id,estudiante_id' });

        if (error) throw error;
      } else {
        localStorage.setItem(`asistencias_${catedraId}`, JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Error actualizando asistencia:', err);
      // Revert optimistic state
      setAsistencias(previousState);
      toast.error('Error al guardar asistencia: ' + (err.message || 'Error en el servidor'));
    }
  };

  const handleMarcarTodosPresentes = async () => {
    if (!activeClase || estudiantes.length === 0) return;
    triggerHapticFeedback();
    setFlashingStudentId('ALL');
    setTimeout(() => setFlashingStudentId(null), 800);

    const previousState = [...asistencias];
    const newRecords = estudiantes.map(e => ({
      clase_id: activeClase.id,
      estudiante_id: e.id,
      estado: 'PRESENTE'
    }));

    const otherClases = asistencias.filter(a => a.clase_id !== activeClase.id);
    const updated = [...otherClases, ...newRecords];
    setAsistencias(updated);

    try {
      if (isSupabaseConfigured && !isDemo) {
        if (!user?.id) {
          throw new Error('Sesión requerida.');
        }

        const { error } = await supabase
          .from('asistencias')
          .upsert(newRecords, { onConflict: 'clase_id,estudiante_id' });

        if (error) throw error;
      } else {
        localStorage.setItem(`asistencias_${catedraId}`, JSON.stringify(updated));
      }

      toast.success('Todos los estudiantes marcados como presentes.');
    } catch (err) {
      console.error('Error marcando todos presentes:', err);
      setAsistencias(previousState);
      toast.error('Error al marcar presentes: ' + (err.message || 'Error en el servidor'));
    }
  };

  const inasistenciaActual = activeClase
    ? inasistenciasDocente.find(i => i.fecha === activeClase.fecha)
    : null;

  const handleSaveInasistencia = async (e) => {
    e.preventDefault();
    const targetFecha = activeClase ? activeClase.fecha : fechaInasistencia;
    if (!targetFecha) {
      toast.error('Por favor especifica una fecha válida.');
      return;
    }

    let artFinal = null;
    if (tipoInasistencia === 'LICENCIA') {
      artFinal = articuloLicencia === 'OTRO' ? otroArticulo.trim() : articuloLicencia;
      if (!artFinal) {
        toast.error('Por favor especifica el artículo de licencia.');
        return;
      }
    }

    setSavingInasistencia(true);
    try {
      if (isSupabaseConfigured && !isDemo && !user?.id) {
        throw new Error('Usuario no autenticado.');
      }

      const payload = {
        catedra_id: catedraId,
        docente_id: user?.id,
        fecha: targetFecha,
        tipo: tipoInasistencia,
        articulo_licencia: artFinal,
        observaciones: obsInasistencia.trim()
      };

      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('inasistencias_docente')
          .upsert(payload, { onConflict: 'catedra_id, fecha' })
          .select()
          .single();

        if (error) throw error;
        const other = inasistenciasDocente.filter(i => i.fecha !== targetFecha);
        setInasistenciasDocente([...other, data]);
      } else {
        const withId = { ...payload, id: 'inasist-' + Date.now() };
        const other = inasistenciasDocente.filter(i => i.fecha !== targetFecha);
        const updated = [...other, withId];
        setInasistenciasDocente(updated);
        localStorage.setItem(`inasistencias_docente_${catedraId}`, JSON.stringify(updated));
      }

      toast.success(`Inasistencia docente registrada para el ${targetFecha}.`);
      setIsInasistenciaModalOpen(false);
    } catch (err) {
      console.error('Error saving inasistencia docente:', err);
      toast.error('Error al registrar inasistencia: ' + err.message);
    } finally {
      setSavingInasistencia(false);
    }
  };

  const handleDeleteInasistencia = async () => {
    if (!activeClase || !inasistenciaActual) return;
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { error } = await supabase
          .from('inasistencias_docente')
          .delete()
          .eq('catedra_id', catedraId)
          .eq('fecha', activeClase.fecha);

        if (error) throw error;
      }

      const updated = inasistenciasDocente.filter(i => i.fecha !== activeClase.fecha);
      setInasistenciasDocente(updated);
      if (!isSupabaseConfigured || isDemo) {
        localStorage.setItem(`inasistencias_docente_${catedraId}`, JSON.stringify(updated));
      }

      toast.success('Inasistencia docente anulada.');
    } catch (err) {
      console.error('Error deleting inasistencia docente:', err);
      toast.error('Error al quitar inasistencia: ' + err.message);
    }
  };

  // =========================================================================
  // GESTIÓN RÁPIDA DE TEMA, DETALLES Y ELIMINACIÓN SEGURA DE CLASE
  // =========================================================================
  const handleOpenEditClass = () => {
    if (!activeClase) return;
    setIsEditClassModalOpen(true);
  };

  const handleSaveEditClass = async (updatedData) => {
    if (!activeClase?.id) return;
    setSavingEditClass(true);
    try {
      const payload = {
        fecha: updatedData.fecha,
        tema: updatedData.tema.trim(),
        unidad_id: updatedData.unidad_id || null,
        caracter_clase: updatedData.caracter_clase,
        horas_catedra: updatedData.horas_catedra,
        observaciones: updatedData.observaciones?.trim() || null
      };

      if (isSupabaseConfigured && !isDemo) {
        let { error } = await supabase
          .from('clases')
          .update(payload)
          .eq('id', activeClase.id);

        // Fallback si la columna caracter_clase o unidad_id no existen aún
        if (error && (error.message?.includes('column') || error.code === '42703')) {
          const fallbackPayload = {
            fecha: updatedData.fecha,
            tema: updatedData.tema.trim(),
            unidad_id: updatedData.unidad_id || null,
            caracter: updatedData.caracter_clase,
            horas_catedra: updatedData.horas_catedra,
            observaciones: updatedData.observaciones?.trim() || null
          };
          let fbRes = await supabase
            .from('clases')
            .update(fallbackPayload)
            .eq('id', activeClase.id);
          
          if (fbRes.error) {
            const minRes = await supabase
              .from('clases')
              .update({ fecha: updatedData.fecha, tema: updatedData.tema.trim() })
              .eq('id', activeClase.id);
            if (minRes.error) throw minRes.error;
          }
        } else if (error) {
          throw error;
        }
      }

      // Sincronización reactiva del estado local
      const updatedClases = clases.map(c => 
        c.id === activeClase.id 
          ? { ...c, ...payload } 
          : c
      );
      updatedClases.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setClases(updatedClases);
      localStorage.setItem(`clases_${catedraId}`, JSON.stringify(updatedClases));

      toast.success('Detalles de clase actualizados correctamente');
      setIsEditClassModalOpen(false);
    } catch (err) {
      console.error('Error updating class:', err);
      toast.error('Error al actualizar clase: ' + err.message);
    } finally {
      setSavingEditClass(false);
    }
  };

  const handleRequestDeleteClass = async () => {
    if (!activeClase?.id) return;
    setIsEditClassModalOpen(false);
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { count, error } = await supabase
          .from('asistencias')
          .select('*', { count: 'exact', head: true })
          .eq('clase_id', activeClase.id);
        
        setDeleteClassCount(count ?? 0);
      } else {
        const count = asistencias.filter(a => a.clase_id === activeClase.id).length;
        setDeleteClassCount(count);
      }
    } catch (err) {
      console.warn('Error counting asistencias for pre-delete check:', err);
      setDeleteClassCount(0);
    }
    setIsDeleteClassModalOpen(true);
  };

  const handleConfirmDeleteClass = async () => {
    if (!activeClase?.id) return;
    setDeletingClass(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        // En Supabase: borrar asistencias asociadas y la sesión de clase
        await supabase
          .from('asistencias')
          .delete()
          .eq('clase_id', activeClase.id);

        const { error } = await supabase
          .from('clases')
          .delete()
          .eq('id', activeClase.id);

        if (error) throw error;
      }

      const remainingClases = clases.filter(c => c.id !== activeClase.id);
      const remainingAsist = asistencias.filter(a => a.clase_id !== activeClase.id);
      setClases(remainingClases);
      setAsistencias(remainingAsist);

      localStorage.setItem(`clases_${catedraId}`, JSON.stringify(remainingClases));
      localStorage.setItem(`asistencias_${catedraId}`, JSON.stringify(remainingAsist));

      // Reasignación automática de clase seleccionada
      if (remainingClases.length > 0) {
        setSelectedClaseId(remainingClases[0].id);
      } else {
        setSelectedClaseId('');
      }

      toast.success('Clase y registros de asistencia eliminados correctamente.');
      setIsDeleteClassModalOpen(false);
    } catch (err) {
      console.error('Error deleting class:', err);
      toast.error('Error al eliminar clase: ' + err.message);
    } finally {
      setDeletingClass(false);
    }
  };

  const getEstado = (estudianteId) => {
    if (!activeClase) return 'AUSENTE';
    const record = asistencias.find(
      a => a.clase_id === activeClase.id && a.estudiante_id === estudianteId
    );
    return record?.estado || 'AUSENTE';
  };

  const presentesCount = estudiantes.filter(e => getEstado(e.id) === 'PRESENTE').length;
  const ausentesCount = estudiantes.filter(e => getEstado(e.id) === 'AUSENTE').length;
  const justificadasCount = estudiantes.filter(e => getEstado(e.id) === 'JUSTIFICADA').length;
  const presentismoPct = estudiantes.length > 0 
    ? ((presentesCount / estudiantes.length) * 100).toFixed(1) 
    : 0;

  if (loading) {
    return (
      <div className="py-6 space-y-4">
        <SkeletonTable rows={5} cols={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12 sm:pb-0">
      {/* Top selector & action bar (Sticky on mobile for quick access while scrolling) */}
      <div className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm sticky top-0 sm:static z-20 transition-all space-y-3">
        {/* Fila 1: Sesión de Clase, Selector con botón Editar Tema, y Badge de Edición Activa */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-[240px]">
            <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-0.5">
                Sesión de Clase {activeClase ? `• ${formatFechaDMY(activeClase.fecha)}` : ''}
              </label>
              {clases.length === 0 ? (
                <span className="text-xs font-medium text-text-muted">No hay clases registradas aún. Pulsa [+ Clase] para iniciar.</span>
              ) : (
                <div className="flex items-center gap-2">
                  <CustomSelect
                    value={activeClase?.id || ''}
                    onChange={(val) => setSelectedClaseId(typeof val === 'object' ? val.target.value : val)}
                    options={clases.map(c => {
                      const hasAbsence = inasistenciasDocente.some(i => i.fecha === c.fecha);
                      const matchedUnit = unidades.find(u => u.id === c.unidad_id);
                      const unitPrefix = matchedUnit ? `[U${matchedUnit.numero}] ` : '';
                      return {
                        value: c.id,
                        label: `${formatFechaDMY(c.fecha)} — ${unitPrefix}${c.tema || 'Sin tema especificado'}`,
                        badge: hasAbsence ? 'Licencia' : matchedUnit ? `U${matchedUnit.numero}` : undefined
                      };
                    })}
                    placeholder="Seleccionar clase..."
                    buttonClassName="py-1 px-2 text-xs sm:text-sm font-semibold border-transparent hover:border-surface-border bg-transparent shadow-none flex-1"
                  />
                  {activeClase && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={Pencil}
                      onClick={handleOpenEditClass}
                      title="Editar fecha, tema y detalles de la clase"
                      className="shrink-0 text-xs px-2.5 py-1.5 touch-target-44"
                    >
                      <span className="hidden sm:inline">✏️ Editar Tema</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Badge visible con la fecha de la clase que se está editando activamente */}
          {activeClase && (
            <div className="self-start sm:self-center inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>Modificando asistencia del {formatFechaDMY(activeClase.fecha)}</span>
            </div>
          )}
        </div>

        {/* Fila 2: Grilla Flexible de Botones de Asistencia (Captura 1) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full mt-3">
          <Button
            variant="primary"
            size="sm"
            icon={CheckCheck}
            onClick={handleMarcarTodosPresentes}
            disabled={!activeClase || estudiantes.length === 0}
            className="w-full text-xs font-bold shadow-xs min-h-[44px] touch-target-44"
            title="Marcar todos los alumnos como presentes en esta fecha"
          >
            ✓ Todos
          </Button>

          <Button
            variant={inasistenciaActual ? 'secondary' : 'outline'}
            size="sm"
            icon={ShieldAlert}
            type="button"
            onClick={() => {
              setFechaInasistencia(activeClase ? activeClase.fecha : new Date().toISOString().split('T')[0]);
              if (inasistenciaActual) {
                setTipoInasistencia(inasistenciaActual.tipo || 'LICENCIA');
                setArticuloLicencia(inasistenciaActual.articulo_licencia || 'Art. 17° - Afecciones Comunes de Corto Tratamiento');
                setObsInasistencia(inasistenciaActual.observaciones || '');
              } else {
                setTipoInasistencia('LICENCIA');
                setArticuloLicencia('Art. 17° - Afecciones Comunes de Corto Tratamiento');
                setOtroArticulo('');
                setObsInasistencia('');
              }
              setIsInasistenciaModalOpen(true);
            }}
            className="w-full text-xs border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 min-h-[44px] touch-target-44 whitespace-nowrap shrink-0"
            title="Registrar o editar inasistencia / licencia del docente"
          >
            {inasistenciaActual ? 'Licencia' : '+ Falta'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={Printer}
            onClick={() => setIsPrintModalOpen(true)}
            disabled={estudiantes.length === 0}
            className="w-full text-xs border-primary/30 text-primary hover:bg-primary/10 min-h-[44px] touch-target-44 whitespace-nowrap shrink-0"
            title="Abrir visor de impresión y PDF oficial de la planilla de asistencias"
          >
            🖨️ PDF
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsModalOpen(true)}
            className="w-full text-xs min-h-[44px] touch-target-44 font-semibold whitespace-nowrap shrink-0"
            title="Crear nueva sesión de clase"
          >
            Clase
          </Button>
        </div>
      </div>

      {/* Banner de Inasistencia Docente si aplica a esta clase */}
      {activeClase && inasistenciaActual && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="warning" className="font-bold text-xs">
                  {inasistenciaActual.tipo === 'LICENCIA'
                    ? `Licencia Docente — ${inasistenciaActual.articulo_licencia || 'Artículo'}`
                    : 'Docente Ausente — Razones Particulares'}
                </Badge>
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  (No computa como falta para los alumnos)
                </span>
              </div>
              <p className="text-xs text-text-muted mt-1">
                {inasistenciaActual.observaciones 
                  ? inasistenciaActual.observaciones 
                  : 'Esta clase está contemplada como excepción y se descuenta del total de clases para no penalizar a los estudiantes.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={handleDeleteInasistencia}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-danger hover:bg-danger/10 border border-danger/20 transition-all cursor-pointer"
              title="Cancelar inasistencia docente de esta fecha"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Quitar Licencia</span>
            </button>
          </div>
        </div>
      )}

      {/* Attendance summary cards */}
      {activeClase && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <Card className="p-3 sm:p-4 flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] sm:text-xs font-bold uppercase text-text-muted">Presentes</p>
              <p className="text-xl sm:text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {presentesCount}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </Card>

          <Card className="p-3 sm:p-4 flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] sm:text-xs font-bold uppercase text-text-muted">Ausentes</p>
              <p className="text-xl sm:text-2xl font-mono font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                {ausentesCount}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </Card>

          <Card className="p-3 sm:p-4 flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] sm:text-xs font-bold uppercase text-text-muted">Justificadas</p>
              <p className="text-xl sm:text-2xl font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {justificadasCount}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </Card>

          <Card className="p-3 sm:p-4 flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] sm:text-xs font-bold uppercase text-text-muted">Presentismo</p>
              <p className="text-xl sm:text-2xl font-mono font-bold text-primary mt-0.5">
                {presentismoPct}%
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </Card>
        </div>
      )}

      {/* Students list */}
      {estudiantes.length === 0 ? (
        <EmptyState
          illustration="folder"
          title="No hay estudiantes inscriptos en esta cátedra"
          description="Ve a la pestaña 'Alumnos' para cargar manualmente o importar la nómina de estudiantes desde Excel."
        />
      ) : !activeClase ? (
        <EmptyState
          illustration="folder"
          title="No hay clases registradas aún"
          description="No hay clases registradas aún. Pulsa [+ Clase] para iniciar."
          action={
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
              Clase
            </Button>
          }
        />
      ) : (
        <>
          {/* ========================================================
              VISTA MÓVIL: TARJETAS RÁPIDAS TÁCTILES TOUCH (< 768px)
             ======================================================== */}
          <div className="block md:hidden space-y-3">
            <div className="flex items-center justify-between px-1 text-xs text-text-muted">
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                {estudiantes.length} {estudiantes.length === 1 ? 'Estudiante' : 'Estudiantes'} en Nómina
              </span>
              <span className="font-mono text-[11px]">
                {presentesCount} P / {ausentesCount} A {justificadasCount > 0 ? `/ ${justificadasCount} J` : ''}
              </span>
            </div>

            {estudiantes.map((est) => {
              const estado = getEstado(est.id);
              const isPresente = estado === 'PRESENTE';
              const isAusente = estado === 'AUSENTE';
              const isJustificada = estado === 'JUSTIFICADA';
              const asistPct = studentStatsMap.get(est.id) ?? 100;
              const initials = `${est.nombre?.[0] || ''}${est.apellido?.[0] || ''}`.toUpperCase();
              const isFlashing = flashingStudentId === est.id || flashingStudentId === 'ALL';

              return (
                <div
                  key={est.id}
                  className={`backdrop-blur-xl bg-white/80 dark:bg-slate-900/70 p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3 transition-all ${
                    isFlashing ? 'animate-flash-success' : ''
                  }`}
                >
                  {/* Fila Superior: Datos del Alumno y Porcentaje visible en esquina */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-bold text-text-primary truncate leading-tight">
                            {est.apellido}, {est.nombre}
                          </h4>
                          <RiskBadge risk={studentRiskMap.get(est.id)} compact />
                        </div>
                        <span className="text-[11px] font-mono text-text-muted">
                          DNI: {est.dni}
                        </span>
                      </div>
                    </div>

                    {/* Porcentaje acumulado de asistencia en la esquina */}
                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${
                        asistPct >= 70
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
                          : 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40'
                      }`}
                      title="Porcentaje acumulado de asistencia"
                    >
                      {asistPct}% Asist.
                    </span>
                  </div>

                  {/* Tres botones táctiles ergonómicos (mínimo 44px de alto) con micro-escala 100ms */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleToggle(est.id, 'PRESENTE')}
                      className={`h-11 min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs transition-transform duration-100 active:scale-95 cursor-pointer select-none ${
                        isPresente
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-[1.02] border border-emerald-500'
                          : 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100/70'
                      }`}
                      title="Marcar presente"
                    >
                      <Check className={`w-4 h-4 ${isPresente ? 'stroke-[2.5]' : ''}`} />
                      <span className="truncate">✓ Presente</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggle(est.id, 'AUSENTE')}
                      className={`h-11 min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs transition-transform duration-100 active:scale-95 cursor-pointer select-none ${
                        isAusente
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 scale-[1.02] border border-rose-500'
                          : 'bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100/70'
                      }`}
                      title="Marcar ausente"
                    >
                      <X className={`w-4 h-4 ${isAusente ? 'stroke-[2.5]' : ''}`} />
                      <span className="truncate">✗ Ausente</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggle(est.id, 'JUSTIFICADA')}
                      className={`h-11 min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs transition-transform duration-100 active:scale-95 cursor-pointer select-none ${
                        isJustificada
                          ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 scale-[1.02] border border-amber-500'
                          : 'bg-amber-50/70 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 hover:bg-amber-100/70'
                      }`}
                      title="Marcar inasistencia justificada"
                    >
                      <AlertCircle className={`w-4 h-4 ${isJustificada ? 'stroke-[2.5]' : ''}`} />
                      <span className="truncate">⚠️ Justificada</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ========================================================
              VISTA DESKTOP / TABLET (>= 768px): TABLA TRADICIONAL
             ======================================================== */}
          <div className="hidden md:block backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100/80 dark:bg-white/[0.04] text-text-secondary font-semibold border-b border-slate-200/80 dark:border-white/10">
                  <tr>
                    <th className="px-3 sm:px-4 py-3 w-12 text-center">#</th>
                    <th className="px-3 sm:px-4 py-3 font-mono">DNI</th>
                    <th className="px-3 sm:px-4 py-3">Estudiante</th>
                    <th className="px-3 sm:px-4 py-3 text-center min-w-[240px]">Estado de Asistencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                  {estudiantes.map((est, index) => {
                    const estado = getEstado(est.id);
                    const isPresente = estado === 'PRESENTE';
                    const isAusente = estado === 'AUSENTE';
                    const isJustificada = estado === 'JUSTIFICADA';
                    const isFlashing = flashingStudentId === est.id || flashingStudentId === 'ALL';

                    return (
                      <tr
                        key={est.id}
                        className={`hover:bg-slate-100/40 dark:hover:bg-white/[0.03] transition-colors ${
                          isFlashing ? 'animate-flash-success' : ''
                        }`}
                      >
                        <td className="px-3 sm:px-4 py-3 text-center text-text-muted font-mono">{index + 1}</td>
                        <td className="px-3 sm:px-4 py-3 font-mono text-text-secondary">{est.dni}</td>
                        <td className="px-3 sm:px-4 py-3 font-semibold text-text-primary">
                          <div className="flex items-center gap-2">
                            <span>{est.apellido}, {est.nombre}</span>
                            <RiskBadge risk={studentRiskMap.get(est.id)} compact />
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggle(est.id, 'PRESENTE')}
                              className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-transform duration-100 touch-target-44 active:scale-95 cursor-pointer ${
                                isPresente
                                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                                  : 'bg-slate-100 dark:bg-white/[0.05] text-text-muted hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-white/10'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5 shrink-0" />
                              <span>Presente</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggle(est.id, 'AUSENTE')}
                              className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-transform duration-100 touch-target-44 active:scale-95 cursor-pointer ${
                                isAusente
                                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                                  : 'bg-slate-100 dark:bg-white/[0.05] text-text-muted hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200 dark:border-white/10'
                              }`}
                            >
                              <X className="w-3.5 h-3.5 shrink-0" />
                              <span>Ausente</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggle(est.id, 'JUSTIFICADA')}
                              className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-transform duration-100 touch-target-44 active:scale-95 cursor-pointer ${
                                isJustificada
                                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                                  : 'bg-slate-100 dark:bg-white/[0.05] text-text-muted hover:text-amber-700 dark:hover:text-amber-300 border border-slate-200 dark:border-white/10'
                              }`}
                            >
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>Justificada</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================================
          APARTADO: RÉGIMEN DE LICENCIAS DOCENTES - DECRETO 1092
         ======================================================== */}
      <div className="mt-8 pt-6 border-t border-surface-border space-y-4">
        <div 
          onClick={() => setIsLicenciasApartadoOpen(!isLicenciasApartadoOpen)}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 sm:p-5 rounded-2xl border border-surface-border shadow-xs cursor-pointer select-none transition-all"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-extrabold text-text-primary tracking-tight">
                  Régimen de Licencias Docentes — Decreto Acuerdo N° 1092
                </h3>
                <Badge variant="primary" className="text-[10px] uppercase font-bold">
                  Catamarca
                </Badge>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Ministerio de Educación, Ciencia y Tecnología • Tabla oficial de justificaciones, licencias y franquicias.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsLicenciasApartadoOpen(!isLicenciasApartadoOpen);
              }}
              aria-label={isLicenciasApartadoOpen ? "Colapsar tabla" : "Desplegar tabla"}
              className="w-9 h-9 rounded-full flex items-center justify-center border border-slate-200/80 dark:border-white/10 bg-surface hover:bg-primary/10 hover:text-primary transition-all duration-200 cursor-pointer shrink-0 active:scale-95 shadow-xs"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-300 ease-in-out transform ${
                  isLicenciasApartadoOpen ? 'rotate-180 text-primary' : 'rotate-0 text-text-muted'
                }`}
              />
            </button>
          </div>
        </div>

        {isLicenciasApartadoOpen && (
          <div className="animate-fadeIn">
            <LicenciasDecreto1092Table
              onSelectArticle={(art) => {
                setFechaInasistencia(activeClase ? activeClase.fecha : new Date().toISOString().split('T')[0]);
                setArticuloLicencia(`${art.numero} - ${art.titulo}`);
                setTipoInasistencia('LICENCIA');
                setIsInasistenciaModalOpen(true);
                toast.info(`Artículo seleccionado: ${art.numero}. Completa la fecha y confirma.`);
              }}
              selectedArticleNumero={articuloLicencia}
            />
          </div>
        )}
      </div>

      {/* Modal / Bottom Sheet Nueva Clase */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Nueva Sesión de Clase"
        subtitle="Registra la fecha y tema para pasar asistencia"
      >
        <form onSubmit={handleCreateClase} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase text-text-secondary">
                Fecha de la Clase *
              </label>
              <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                Formato: {formatFechaDMY(nuevaFecha)} (DD-MM-YYYY)
              </span>
            </div>
            <input
              type="date"
              required
              value={nuevaFecha}
              onChange={(e) => setNuevaFecha(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
            <p className="text-[11px] text-text-muted mt-1">
              Se guardará y mostrará registrada con formato <strong>{formatFechaDMY(nuevaFecha)}</strong>.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Tema o Contenido Dictado
            </label>
            <input
              type="text"
              placeholder="Ej: Unidad 2 - Modelado Relacional y Normalización"
              value={nuevoTema}
              onChange={(e) => setNuevoTema(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
          </div>

          {/* Selector de Unidad Temática / Didáctica */}
          <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Unidad Temática / Didáctica</span>
              </label>
              {!isQuickCreatingUnidad && (
                <button
                  type="button"
                  onClick={() => {
                    setQuickUnidadNum(unidades.length + 1);
                    setIsQuickCreatingUnidad(true);
                  }}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  + Crear Unidad al vuelo
                </button>
              )}
            </div>

            {!isQuickCreatingUnidad ? (
              <CustomSelect
                value={nuevaUnidadId}
                onChange={(val) => setNuevaUnidadId(typeof val === 'object' ? val.target.value : val)}
                options={[
                  { value: '', label: 'Sin Unidad Asignada' },
                  ...unidades.map(u => ({
                    value: u.id,
                    label: `Unidad ${u.numero}: ${u.titulo}`,
                    badge: `U${u.numero}`
                  }))
                ]}
                placeholder="Seleccionar unidad temática..."
              />
            ) : (
              <div className="p-2.5 rounded-xl bg-surface border border-surface-border space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-text-primary">Nueva Unidad Rápida</span>
                  <button
                    type="button"
                    onClick={() => setIsQuickCreatingUnidad(false)}
                    className="text-[11px] text-text-muted hover:text-text-primary"
                  >
                    Cancelar
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-1">
                    <input
                      type="number"
                      min="1"
                      placeholder="N°"
                      value={quickUnidadNum}
                      onChange={(e) => setQuickUnidadNum(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-surface-border rounded-lg bg-surface text-text-primary outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Título de la unidad..."
                      value={quickUnidadTitulo}
                      onChange={(e) => setQuickUnidadTitulo(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-surface text-text-primary outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={async () => {
                      if (!quickUnidadTitulo.trim()) return;
                      setSavingQuickUnit(true);
                      try {
                        const created = await handleQuickCreateUnidad({
                          numero: quickUnidadNum,
                          titulo: quickUnidadTitulo
                        });
                        if (created?.id) setNuevaUnidadId(created.id);
                        setIsQuickCreatingUnidad(false);
                        setQuickUnidadTitulo('');
                      } finally {
                        setSavingQuickUnit(false);
                      }
                    }}
                    loading={savingQuickUnit}
                    disabled={!quickUnidadTitulo.trim()}
                    className="text-xs py-1 px-3"
                  >
                    Crear y Asignar
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button type="submit" loading={savingClase}>
              Crear Sesión
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal / Bottom Sheet Inasistencia Docente */}
      <Modal
        isOpen={isInasistenciaModalOpen}
        onClose={() => setIsInasistenciaModalOpen(false)}
        title="Inasistencia Docente / Licencia"
        subtitle={activeClase ? `Fecha: ${formatFechaDMY(activeClase.fecha)} — ${activeClase.tema || 'Clase Regular'}` : ''}
      >
        <form onSubmit={handleSaveInasistencia} className="space-y-4">
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-xs text-primary leading-relaxed">
            <strong>Excepción Académica:</strong> Al registrar la inasistencia del profesor, esta fecha <em>no computará como falta</em> para los estudiantes matriculados en la cátedra.
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Fecha de Inasistencia *
            </label>
            <input
              type="date"
              required
              value={activeClase ? activeClase.fecha : fechaInasistencia}
              onChange={(e) => setFechaInasistencia(e.target.value)}
              disabled={!!activeClase}
              className="w-full px-3.5 py-2 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary disabled:opacity-75 disabled:bg-surface-hover"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Tipo de Inasistencia *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipoInasistencia('LICENCIA')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                  tipoInasistencia === 'LICENCIA'
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-surface border-surface-border text-text-secondary hover:bg-surface-hover'
                }`}
              >
                Licencia Reglamentaria
              </button>
              <button
                type="button"
                onClick={() => setTipoInasistencia('RAZONES_PARTICULARES')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                  tipoInasistencia === 'RAZONES_PARTICULARES'
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-surface border-surface-border text-text-secondary hover:bg-surface-hover'
                }`}
              >
                Razones Particulares
              </button>
            </div>
          </div>

          {tipoInasistencia === 'LICENCIA' && (
            <div className="space-y-3 animate-fadeIn">
              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <label className="block text-xs font-semibold uppercase text-text-secondary">
                    Artículo de Licencia *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsDecretoModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline hover:text-primary-hover transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Ver Tabla Resumen Decreto 1092</span>
                  </button>
                </div>
                <CustomSelect
                  value={articuloLicencia}
                  onChange={(val) => setArticuloLicencia(typeof val === 'object' ? val.target.value : val)}
                  options={articuloOptions}
                  placeholder="Seleccionar artículo de licencia..."
                />
              </div>

              {articuloLicencia === 'OTRO' && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
                    Especificar Artículo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Art. 48, Art. 115..."
                    value={otroArticulo}
                    onChange={(e) => setOtroArticulo(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Observaciones (Opcional)
            </label>
            <textarea
              rows={2}
              value={obsInasistencia}
              onChange={(e) => setObsInasistencia(e.target.value)}
              placeholder="Detalle de suplencia, aviso previo a los alumnos o certificación médica..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
            <Button
              variant="secondary"
              onClick={() => setIsInasistenciaModalOpen(false)}
              type="button"
              disabled={savingInasistencia}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingInasistencia}
            >
              Confirmar Inasistencia
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Interactivo con Tabla Resumen Decreto Acuerdo N° 1092/2015 Catamarca */}
      <Modal
        isOpen={isDecretoModalOpen}
        onClose={() => setIsDecretoModalOpen(false)}
        title="Régimen de Licencias Docentes — Decreto Acuerdo N° 1092/2015"
        subtitle="Ministerio de Educación, Ciencia y Tecnología de Catamarca • Tabla Resumen Oficial"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-muted">
            Consulta los artículos vigentes o haz clic en <strong>"Elegir"</strong> en cualquier fila para seleccionar automáticamente el artículo correspondiente a tu inasistencia.
          </p>
          <LicenciasDecreto1092Table
            onSelectArticle={(art) => {
              setArticuloLicencia(`${art.numero} - ${art.titulo}`);
              setTipoInasistencia('LICENCIA');
              setIsDecretoModalOpen(false);
              toast.success(`Artículo asignado: ${art.numero} - ${art.titulo}`);
            }}
            selectedArticleNumero={articuloLicencia}
          />
          <div className="flex justify-end pt-3 border-t border-surface-border">
            <Button
              variant="secondary"
              onClick={() => setIsDecretoModalOpen(false)}
              type="button"
            >
              Cerrar Tabla
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Edición de Clase */}
      <EditClassModal
        isOpen={isEditClassModalOpen}
        onClose={() => setIsEditClassModalOpen(false)}
        clase={activeClase}
        unidades={unidades}
        onQuickCreateUnidad={handleQuickCreateUnidad}
        onSave={handleSaveEditClass}
        onDeleteRequest={handleRequestDeleteClass}
        saving={savingEditClass}
      />

      {/* Modal de Confirmación de Borrado Seguro */}
      <ConfirmDeleteClassModal
        isOpen={isDeleteClassModalOpen}
        onClose={() => setIsDeleteClassModalOpen(false)}
        clase={activeClase}
        totalAsistencias={deleteClassCount}
        onConfirmDelete={handleConfirmDeleteClass}
        deleting={deletingClass}
      />

      {/* Visor Unificado de Impresión de Asistencias */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        type="asistencias"
        title="Registro Oficial de Asistencias y Permanencia"
        subtitle="Cómputo reglamentario para archivo en Secretaría Académica"
        defaultOrientation="landscape"
        data={{
          catedra: { id: catedraId, nombre: catedraName },
          estudiantes,
          clases,
          asistencias,
          inasistenciasDocente,
          studentStatsMap,
          criterios,
          cicloAnio: '2026',
          institucionNombre: 'INSTITUTO DE EDUCACIÓN SUPERIOR',
          docenteNombre: user?.user_metadata?.nombre_completo || user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Docente Titular'
        }}
      />
    </div>
  );
}
