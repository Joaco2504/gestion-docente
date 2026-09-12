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
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';
import Modal from '../common/Modal';
import CustomSelect from '../common/CustomSelect';
import EmptyState from '../common/EmptyState';
import { SkeletonTable } from '../common/SkeletonLoader';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatFechaDMY, parseDMYtoYMD, getTodayYMD } from '../../lib/dateUtils';
import { calcularPorcentajeAsistencia } from '../../lib/academicLogic';
import { DECRETO_1092_CATAMARCA } from '../../data/decreto1092Catamarca';
import LicenciasDecreto1092Table from './LicenciasDecreto1092Table';

export default function AttendanceTab({
  catedraId,
  catedraName
}) {
  const { user, isDemo } = useAuth();
  
  const [clases, setClases] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [inasistenciasDocente, setInasistenciasDocente] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flashingStudentId, setFlashingStudentId] = useState(null);

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
  const [isLicenciasApartadoOpen, setIsLicenciasApartadoOpen] = useState(true);

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

        let cls = storedClases ? JSON.parse(storedClases) : [
          { id: 'clase-1', catedra_id: catedraId, fecha: '2026-03-02', tema: 'Presentación de la Cátedra y Pautas' },
          { id: 'clase-2', catedra_id: catedraId, fecha: '2026-03-09', tema: 'Unidad 1 - Fundamentos y Arquitectura' }
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
        setEstudiantes(estList);
        setAsistencias(asist);
        setInasistenciasDocente(inasist);
        if (cls.length > 0) setSelectedClaseId(cls[0].id);

        localStorage.setItem(`clases_${catedraId}`, JSON.stringify(cls));
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
        tema: nuevoTema.trim() || 'Clase Regular'
      };

      let claseId = null;
      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('clases')
          .insert(newClaseObj)
          .select()
          .single();

        if (error) throw error;
        claseId = data.id;
        const updated = [data, ...clases];
        setClases(updated);
        setSelectedClaseId(data.id);
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
          }, { onConflict: 'clase_id, estudiante_id' });

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
          .upsert(newRecords, { onConflict: 'clase_id, estudiante_id' });

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

  const getEstado = (estudianteId) => {
    if (!activeClase) return 'AUSENTE';
    const record = asistencias.find(
      a => a.clase_id === activeClase.id && a.estudiante_id === estudianteId
    );
    return record?.estado || 'AUSENTE';
  };

  const presentesCount = estudiantes.filter(e => getEstado(e.id) === 'PRESENTE').length;
  const ausentesCount = estudiantes.length - presentesCount;
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm sticky top-0 sm:static z-20 transition-all">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-0.5">
              Sesión de Clase {activeClase ? `• ${formatFechaDMY(activeClase.fecha)}` : ''}
            </label>
            {clases.length === 0 ? (
              <span className="text-xs font-medium text-text-muted">No hay clases registradas</span>
            ) : (
              <CustomSelect
                value={activeClase?.id || ''}
                onChange={(val) => setSelectedClaseId(typeof val === 'object' ? val.target.value : val)}
                options={clases.map(c => {
                  const hasAbsence = inasistenciasDocente.some(i => i.fecha === c.fecha);
                  return {
                    value: c.id,
                    label: `${formatFechaDMY(c.fecha)} — ${c.tema || 'Sin tema especificado'}`,
                    badge: hasAbsence ? 'Licencia' : undefined
                  };
                })}
                placeholder="Seleccionar clase..."
                buttonClassName="py-1 px-2 text-xs sm:text-sm font-semibold border-transparent hover:border-surface-border bg-transparent shadow-none"
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {activeClase && estudiantes.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              icon={CheckCheck}
              onClick={handleMarcarTodosPresentes}
              className="flex-1 sm:flex-initial text-xs font-bold shadow-xs min-h-[44px] sm:min-h-0 touch-target-44"
              title="Marcar todos los alumnos como presentes en esta fecha"
            >
              Todos Presentes
            </Button>
          )}

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
            className="flex-1 sm:flex-initial text-xs border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 min-h-[44px] sm:min-h-0 touch-target-44"
            title="Registrar o editar inasistencia / licencia del docente"
          >
            {inasistenciaActual ? 'Ver Licencia Docente' : 'Inasistencia Docente'}
          </Button>

          {/* Botón Nueva Clase */}
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-initial text-xs"
          >
            Nueva Clase
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
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <Card className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <p className="text-[10px] sm:text-xs font-bold uppercase text-text-muted">Presentes</p>
              <p className="text-xl sm:text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1">
                {presentesCount}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </Card>

          <Card className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <p className="text-[10px] sm:text-xs font-bold uppercase text-text-muted">Ausentes</p>
              <p className="text-xl sm:text-2xl font-mono font-bold text-rose-600 dark:text-rose-400 mt-0.5 sm:mt-1">
                {ausentesCount}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </Card>

          <Card className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <p className="text-[10px] sm:text-xs font-bold uppercase text-text-muted">Presentismo</p>
              <p className="text-xl sm:text-2xl font-mono font-bold text-primary mt-0.5 sm:mt-1">
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
          title="No se ha creado ninguna clase"
          description="Haz clic en 'Nueva Clase' arriba para registrar la primera fecha y comenzar a tomar asistencia."
          action={
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
              Crear Primera Clase
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
                {presentesCount} P / {ausentesCount} A
              </span>
            </div>

            {estudiantes.map((est) => {
              const estado = getEstado(est.id);
              const isPresente = estado === 'PRESENTE';
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
                        <h4 className="text-sm font-bold text-text-primary truncate leading-tight">
                          {est.apellido}, {est.nombre}
                        </h4>
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

                  {/* Dos botones táctiles grandes y ergonómicos (mínimo 48px de alto) con micro-escala 100ms */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleToggle(est.id, 'PRESENTE')}
                      className={`h-12 min-h-[48px] rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-transform duration-100 active:scale-95 cursor-pointer select-none ${
                        isPresente
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-[1.02] border border-emerald-500'
                          : 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100/70'
                      }`}
                    >
                      <Check className={`w-5 h-5 ${isPresente ? 'stroke-[2.5]' : ''}`} />
                      <span>✓ Presente</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggle(est.id, 'AUSENTE')}
                      className={`h-12 min-h-[48px] rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-transform duration-100 active:scale-95 cursor-pointer select-none ${
                        !isPresente
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 scale-[1.02] border border-rose-500'
                          : 'bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100/70'
                      }`}
                    >
                      <X className={`w-5 h-5 ${!isPresente ? 'stroke-[2.5]' : ''}`} />
                      <span>✗ Ausente</span>
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
                    <th className="px-3 sm:px-4 py-3 text-center min-w-[180px]">Estado de Asistencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                  {estudiantes.map((est, index) => {
                    const estado = getEstado(est.id);
                    const isPresente = estado === 'PRESENTE';
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
                          {est.apellido}, {est.nombre}
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggle(est.id, 'PRESENTE')}
                              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-transform duration-100 touch-target-44 active:scale-95 cursor-pointer ${
                                isPresente
                                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                                  : 'bg-slate-100 dark:bg-white/[0.05] text-text-muted hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-white/10'
                              }`}
                            >
                              <Check className="w-4 h-4 shrink-0" />
                              <span>Presente</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggle(est.id, 'AUSENTE')}
                              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-transform duration-100 touch-target-44 active:scale-95 cursor-pointer ${
                                !isPresente
                                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                                  : 'bg-slate-100 dark:bg-white/[0.05] text-text-muted hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200 dark:border-white/10'
                              }`}
                            >
                              <X className="w-4 h-4 shrink-0" />
                              <span>Ausente</span>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 sm:p-5 rounded-2xl border border-surface-border shadow-xs">
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

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              icon={isLicenciasApartadoOpen ? ChevronUp : ChevronDown}
              onClick={() => setIsLicenciasApartadoOpen(!isLicenciasApartadoOpen)}
              className="text-xs"
            >
              {isLicenciasApartadoOpen ? 'Contraer Tabla' : 'Ver Tabla Resumen'}
            </Button>
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
    </div>
  );
}
