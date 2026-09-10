import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  Building, 
  BookOpen, 
  Users, 
  Trash2, 
  AlertCircle,
  CheckCircle2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  ShieldAlert,
  CalendarDays,
  CalendarRange,
  SunMedium,
  Check,
  Sparkles
} from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { generateIcsContent, downloadIcsFile, getGoogleCalendarUrl } from '../lib/calendarSync';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const EVENT_TYPES = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'CLASE', label: 'Clases Regulares', color: 'primary' },
  { id: 'TRIBUNAL_EXAMEN', label: 'Tribunales de Examen', color: 'danger' },
  { id: 'REUNION', label: 'Reuniones de Cátedra / Dpto', color: 'warning' },
  { id: 'PERIODO', label: 'Cierre de Periodo / Entrega', color: 'secondary' },
  { id: 'OTRO', label: 'Otros Eventos', color: 'default' }
];

export default function CalendarPage() {
  const { user, isDemo } = useAuth();
  const { catedras, activeInstitucion, activeCiclo } = useApp();

  // Mode: 'semanal' | 'mensual' | 'anual'
  const [viewMode, setViewMode] = useState('semanal');
  const [currentDate, setCurrentDate] = useState(new Date());

  const [events, setEvents] = useState([]);
  const [clases, setClases] = useState([]);
  const [inasistenciasDocente, setInasistenciasDocente] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('TODOS');

  // Modals
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // New Event Form State
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('TRIBUNAL_EXAMEN');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFin, setHoraFin] = useState('10:00');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchAllCalendarData();
  }, [user, catedras]);

  const fetchAllCalendarData = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && !isDemo && user) {
        // 1. Eventos de Calendario
        const { data: evData } = await supabase
          .from('eventos_calendario')
          .select('*')
          .order('fecha_inicio', { ascending: true });
        setEvents(evData || []);

        // 2. Clases Registradas de las Cátedras del Docente
        const catIds = (catedras || []).map(c => c.id);
        if (catIds.length > 0) {
          const { data: clsData } = await supabase
            .from('clases')
            .select('*')
            .in('catedra_id', catIds)
            .order('fecha', { ascending: true });
          setClases(clsData || []);

          // 3. Inasistencias Docente
          const { data: inasistData } = await supabase
            .from('inasistencias_docente')
            .select('*')
            .in('catedra_id', catIds);
          setInasistenciasDocente(inasistData || []);
        } else {
          setClases([]);
          setInasistenciasDocente([]);
        }

        // 4. Períodos Académicos
        const { data: perData } = await supabase
          .from('periodos_academicos')
          .select('*')
          .order('fecha_inicio', { ascending: true });

        if (perData && perData.length > 0) {
          setPeriodos(perData);
        } else {
          setPeriodos(getDefaultPeriods());
        }
      } else {
        // Demo mode fallback
        loadDemoCalendarData();
      }
    } catch (err) {
      console.error('Error fetching calendar data:', err);
      toast.error('Error al cargar datos del calendario.');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPeriods = () => [
    { id: 'per-1', nombre: '1° Cuatrimestre', tipo: 'CUATRIMESTRE', fecha_inicio: '2026-03-09', fecha_fin: '2026-07-10' },
    { id: 'per-2', nombre: 'Receso Invernal', tipo: 'RECESO', fecha_inicio: '2026-07-13', fecha_fin: '2026-07-24' },
    { id: 'per-3', nombre: '2° Cuatrimestre', tipo: 'CUATRIMESTRE', fecha_inicio: '2026-08-03', fecha_fin: '2026-11-20' }
  ];

  const loadDemoCalendarData = () => {
    const storedEv = localStorage.getItem('demo_eventos_calendario');
    const storedClases = localStorage.getItem('demo_clases_all');
    const storedInasist = localStorage.getItem('demo_inasistencias_all');
    const storedPer = localStorage.getItem('demo_periodos_all');

    const sampleEvents = storedEv ? JSON.parse(storedEv) : [
      {
        id: 'ev-1',
        titulo: 'Mesa de Examen Final - Práctica Profesional',
        tipo: 'TRIBUNAL_EXAMEN',
        fecha_inicio: new Date(Date.now() + 86400000 * 2).toISOString(),
        fecha_fin: new Date(Date.now() + 86400000 * 2 + 7200000).toISOString(),
        notas: 'Tribunal: Prof. Martínez, Prof. Gómez. Aula 4.',
        editable: true
      },
      {
        id: 'ev-2',
        titulo: 'Reunión de Departamento de Informática',
        tipo: 'REUNION',
        fecha_inicio: new Date(Date.now() + 86400000 * 5).toISOString(),
        fecha_fin: new Date(Date.now() + 86400000 * 5 + 3600000).toISOString(),
        notas: 'Definición de fechas de parciales y proyectos transversales.',
        editable: true
      }
    ];

    const sampleClases = storedClases ? JSON.parse(storedClases) : [
      { id: 'cls-1', catedra_id: catedras[0]?.id || 'cat-1', fecha: '2026-03-09', tema: 'Presentación de la Cátedra' },
      { id: 'cls-2', catedra_id: catedras[0]?.id || 'cat-1', fecha: '2026-03-16', tema: 'Unidad 1 - Fundamentos' },
      { id: 'cls-3', catedra_id: catedras[1]?.id || 'cat-2', fecha: '2026-03-17', tema: 'Normalización de Datos' }
    ];

    const sampleInasist = storedInasist ? JSON.parse(storedInasist) : [
      { id: 'in-1', catedra_id: catedras[0]?.id || 'cat-1', fecha: '2026-03-23', tipo: 'LICENCIA', articulo_licencia: 'Art. 44', observaciones: 'Certificado de reposo médico' }
    ];

    setEvents(sampleEvents);
    setClases(sampleClases);
    setInasistenciasDocente(sampleInasist);
    setPeriodos(storedPer ? JSON.parse(storedPer) : getDefaultPeriods());
  };

  // Crear Evento / Mesa
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setErrorMsg('El título del evento es obligatorio.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const startDateTime = new Date(`${fecha}T${horaInicio}:00`).toISOString();
      const endDateTime = new Date(`${fecha}T${horaFin}:00`).toISOString();

      const newEvent = {
        docente_id: user?.id,
        titulo: titulo.trim(),
        tipo,
        fecha_inicio: startDateTime,
        fecha_fin: endDateTime,
        notas: notas.trim(),
        editable: true
      };

      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('eventos_calendario')
          .insert(newEvent)
          .select()
          .single();

        if (error) throw error;
        setEvents([...events, data]);
      } else {
        const withId = { ...newEvent, id: 'ev-' + Date.now() };
        const updated = [...events, withId];
        setEvents(updated);
        localStorage.setItem('demo_eventos_calendario', JSON.stringify(updated));
      }

      setIsNewEventModalOpen(false);
      setTitulo('');
      setNotas('');
      toast.success('Evento registrado con éxito en el calendario.');
    } catch (err) {
      console.error('Error creating event:', err);
      setErrorMsg(err.message || 'Error al guardar el evento.');
      toast.error('Error al guardar el evento: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { error } = await supabase.from('eventos_calendario').delete().eq('id', id);
        if (error) throw error;
      }
      const updated = events.filter((e) => e.id !== id);
      setEvents(updated);
      if (!isSupabaseConfigured || isDemo) {
        localStorage.setItem('demo_eventos_calendario', JSON.stringify(updated));
      }
      toast.success('Evento eliminado del calendario.');
    } catch (err) {
      console.error('Error deleting event:', err);
      toast.error('Error al eliminar el evento: ' + err.message);
    }
  };

  // =========================================================================
  // REGLAS ESTRICTAS DE LÍMITES DE PERÍODOS Y RECESO INVERNAL
  // =========================================================================
  const recesoPeriodo = periodos.find(p => p.tipo === 'RECESO');
  const regularPeriods = periodos.filter(p => p.tipo !== 'RECESO');

  /**
   * Verifica si una fecha dada cae dentro de algún período lectivo válido
   * y NUNCA durante el receso invernal.
   */
  const isDateWithinAcademicPeriod = (dateStr) => {
    if (!dateStr) return false;
    
    // 1. Si cae dentro de las fechas de receso invernal -> Excluido estrictamente
    if (recesoPeriodo?.fecha_inicio && recesoPeriodo?.fecha_fin) {
      if (dateStr >= recesoPeriodo.fecha_inicio && dateStr <= recesoPeriodo.fecha_fin) {
        return false;
      }
    }

    // 2. Si no hay periodos cargados, permitimos por defecto
    if (regularPeriods.length === 0) return true;

    // 3. Debe caer dentro de al menos un período activo (1° o 2° cuatrimestre, etc.)
    return regularPeriods.some(p => {
      if (!p.fecha_inicio || !p.fecha_fin) return true;
      return dateStr >= p.fecha_inicio && dateStr <= p.fecha_fin;
    });
  };

  const isDateInRecess = (dateStr) => {
    if (!recesoPeriodo?.fecha_inicio || !recesoPeriodo?.fecha_fin) return false;
    return dateStr >= recesoPeriodo.fecha_inicio && dateStr <= recesoPeriodo.fecha_fin;
  };

  // =========================================================================
  // NAVEGACIÓN Y CÁLCULOS DE SEMANA Y MES
  // =========================================================================
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'semanal') {
      d.setDate(d.getDate() - 7);
    } else if (viewMode === 'mensual') {
      d.setMonth(d.getMonth() - 1);
    } else {
      d.setFullYear(d.getFullYear() - 1);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'semanal') {
      d.setDate(d.getDate() + 7);
    } else if (viewMode === 'mensual') {
      d.setMonth(d.getMonth() + 1);
    } else {
      d.setFullYear(d.getFullYear() + 1);
    }
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Cálculo de los 6 días de la semana actual (Lunes a Sábado)
  const currentWeekDays = useMemo(() => {
    const curr = new Date(currentDate);
    // Calcular lunes de esta semana
    const dayOfWeek = curr.getDay(); // 0: Dom, 1: Lun ...
    const diffToMonday = curr.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const monday = new Date(curr.setDate(diffToMonday));

    const week = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      week.push({
        name: DAYS[i],
        date: d,
        isoDate: iso,
        inAcademicPeriod: isDateWithinAcademicPeriod(iso),
        inRecess: isDateInRecess(iso)
      });
    }
    return week;
  }, [currentDate, periodos]);

  // Cátedras map para búsqueda rápida
  const catedrasMap = useMemo(() => {
    return new Map((catedras || []).map(c => [c.id, c]));
  }, [catedras]);

  // Consolidar slots semanales recurrentes
  const weeklyClassSlots = useMemo(() => {
    const slots = [];
    (catedras || []).forEach(cat => {
      if (Array.isArray(cat.horarios_semanales)) {
        cat.horarios_semanales.forEach(s => {
          slots.push({
            catedraId: cat.id,
            catedraNombre: cat.nombre,
            nivel: cat.nivel,
            dia: s.dia,
            desde: s.desde,
            hasta: s.hasta,
            aula: s.aula
          });
        });
      }
    });
    return slots;
  }, [catedras]);

  const filteredEvents = filterType === 'TODOS'
    ? events
    : events.filter(e => e.tipo === filterType);

  // Exportar .ics
  const handleDownloadIcs = () => {
    try {
      const ics = generateIcsContent(events, clases, catedras);
      downloadIcsFile('agenda_docentepro_2026.ics', ics);
      toast.success('Archivo .ics descargado exitosamente. Ya puedes importarlo en Google Calendar, Outlook o Apple Calendar.');
      setIsSyncModalOpen(false);
    } catch (err) {
      toast.error('Error al generar archivo de calendario: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 sm:pb-0">
      {/* Top Header Card with View Switcher */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-surface p-5 rounded-2xl border border-surface-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted">
              Agenda Docente 2026
            </span>
            {recesoPeriodo && (
              <Badge variant="warning" className="text-[10px] font-semibold">
                Receso Invernal: {recesoPeriodo.fecha_inicio} al {recesoPeriodo.fecha_fin}
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Calendario Académico y Horarios de Cursada
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Sincronización semanal, mensual y anual con límites de cursada y exclusión de receso invernal.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end flex-wrap sm:flex-nowrap">
          {/* View Switcher (Semanal / Mensual / Anual) */}
          <div className="inline-flex rounded-xl bg-surface-hover p-1 border border-surface-border">
            <button
              type="button"
              onClick={() => setViewMode('semanal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all touch-target-44 ${
                viewMode === 'semanal'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Semanal</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('mensual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all touch-target-44 ${
                viewMode === 'mensual'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Mensual</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('anual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all touch-target-44 ${
                viewMode === 'anual'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Anual</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={() => setIsSyncModalOpen(true)}
              className="text-xs"
              title="Exportar y sincronizar con Google Calendar"
            >
              Sincronizar Google Calendar
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => {
                setErrorMsg('');
                setIsNewEventModalOpen(true);
              }}
              className="text-xs"
            >
              Nuevo Evento
            </Button>
          </div>
        </div>
      </div>

      {/* Date Navigation Bar */}
      <div className="flex items-center justify-between bg-surface px-4 py-3 rounded-2xl border border-surface-border shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-xl hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors touch-target-44"
            title="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1 rounded-xl text-xs font-semibold bg-surface-hover text-text-primary hover:bg-surface-hover/80 transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={handleNext}
            className="p-1.5 rounded-xl hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors touch-target-44"
            title="Siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-sm font-bold text-text-primary ml-2">
            {viewMode === 'semanal' && (
              <>
                Semana del {currentWeekDays[0]?.date.getDate()} de {MONTHS[currentWeekDays[0]?.date.getMonth()]} al {currentWeekDays[5]?.date.getDate()} de {MONTHS[currentWeekDays[5]?.date.getMonth()]} de {currentDate.getFullYear()}
              </>
            )}
            {viewMode === 'mensual' && (
              <>
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </>
            )}
            {viewMode === 'anual' && (
              <>
                Ciclo Lectivo {currentDate.getFullYear()}
              </>
            )}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          {regularPeriods.map(p => (
            <span key={p.id} className="text-[11px] font-medium text-text-muted">
              <strong>{p.nombre}:</strong> {p.fecha_inicio} al {p.fecha_fin}
            </span>
          ))}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* VISTA 1: SEMANAL */}
      {/* ===================================================================== */}
      {viewMode === 'semanal' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Grilla Semanal (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {currentWeekDays.map((dayInfo) => {
                // Clases del horario regular correspondientes a este día
                const daySlots = weeklyClassSlots.filter(s => s.dia === dayInfo.name);
                
                // Clases efectivamente registradas en el sistema para esta fecha específica
                const registeredClassesForDate = clases.filter(c => c.fecha === dayInfo.isoDate);

                // Inasistencias docentes registradas para esta fecha
                const absenceForDate = inasistenciasDocente.find(i => i.fecha === dayInfo.isoDate);

                return (
                  <div
                    key={dayInfo.isoDate}
                    className={`p-3 rounded-2xl border flex flex-col min-h-[190px] transition-all ${
                      dayInfo.inRecess
                        ? 'bg-amber-500/5 border-amber-500/20'
                        : !dayInfo.inAcademicPeriod
                        ? 'bg-surface/50 border-surface-border opacity-70'
                        : 'bg-surface border-surface-border shadow-xs'
                    }`}
                  >
                    {/* Header del Día */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-surface-border">
                      <div>
                        <span className="text-xs font-bold text-text-primary block">
                          {dayInfo.name}
                        </span>
                        <span className="text-[11px] font-mono text-text-muted">
                          {dayInfo.date.getDate()} de {MONTHS[dayInfo.date.getMonth()]}
                        </span>
                      </div>

                      {dayInfo.inRecess ? (
                        <Badge variant="warning" className="text-[9px] font-bold">
                          Receso
                        </Badge>
                      ) : !dayInfo.inAcademicPeriod ? (
                        <Badge variant="default" className="text-[9px]">
                          Fuera de Término
                        </Badge>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-text-muted">
                          {daySlots.length + registeredClassesForDate.length}
                        </span>
                      )}
                    </div>

                    {/* Contenido del Día */}
                    <div className="space-y-2 flex-1">
                      {/* Caso 1: Receso Invernal (Regla estricta: NO hay clases) */}
                      {dayInfo.inRecess ? (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center my-auto">
                          <SunMedium className="w-5 h-5 text-amber-600 dark:text-amber-400 mx-auto mb-1 opacity-70" />
                          <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                            Receso Invernal
                          </p>
                          <p className="text-[10px] text-text-muted mt-0.5">
                            Sin actividades académicas ni dictado de clases.
                          </p>
                        </div>
                      ) : !dayInfo.inAcademicPeriod ? (
                        /* Caso 2: Fuera de límites de cursada */
                        <div className="p-3 rounded-xl bg-surface-hover text-center my-auto">
                          <p className="text-[11px] font-medium text-text-muted italic">
                            Fuera del período de cursada regular
                          </p>
                        </div>
                      ) : (
                        /* Caso 3: Período Regular Activo */
                        <>
                          {/* Banner de Licencia Docente si existe en este día */}
                          {absenceForDate && (
                            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                              <span className="text-[10px] font-bold">
                                {absenceForDate.tipo === 'LICENCIA'
                                  ? `Licencia: ${absenceForDate.articulo_licencia || 'Art.'}`
                                  : 'Docente Ausente'}
                              </span>
                            </div>
                          )}

                          {/* Clases registradas en la fecha */}
                          {registeredClassesForDate.map(rc => {
                            const cat = catedrasMap.get(rc.catedra_id);
                            return (
                              <div
                                key={rc.id}
                                className="p-2 rounded-xl bg-primary/10 border border-primary/20 shadow-xs border-l-4 border-l-primary"
                              >
                                <div className="flex items-center justify-between">
                                  <h5 className="text-xs font-bold text-text-primary truncate">
                                    {cat?.nombre || 'Clase Registrada'}
                                  </h5>
                                  <Badge variant="primary" className="text-[9px] px-1 py-0">
                                    Dictada
                                  </Badge>
                                </div>
                                <p className="text-[10px] text-text-muted mt-0.5 truncate">
                                  {rc.tema || 'Sin tema registrado'}
                                </p>
                              </div>
                            );
                          })}

                          {/* Horarios recurrentes proyectados (si no hay registrada) */}
                          {daySlots.length === 0 && registeredClassesForDate.length === 0 ? (
                            <span className="text-[11px] text-text-muted italic block pt-3 text-center">
                              Sin clases programadas
                            </span>
                          ) : (
                            daySlots.map((slot, i) => (
                              <div
                                key={i}
                                className="p-2 rounded-xl bg-surface-hover/60 border border-surface-border shadow-xs"
                              >
                                <h5 className="text-xs font-bold text-text-primary truncate">
                                  {slot.catedraNombre}
                                </h5>
                                <div className="flex items-center justify-between mt-1 text-[10px] font-mono text-text-muted">
                                  <span>{slot.desde} - {slot.hasta}</span>
                                  {slot.aula && <span className="text-text-secondary">{slot.aula}</span>}
                                </div>
                              </div>
                            ))
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Special Events & Google Calendar Fast Sync (1 Col) */}
          <div className="space-y-4">
            <Card>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-surface-border">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-text-primary">
                    Mesas, Exámenes y Compromisos
                  </h3>
                </div>
                <Badge variant="default" className="text-xs font-mono">
                  {filteredEvents.length}
                </Badge>
              </div>

              {/* Event Type Filter */}
              <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-3 scrollbar-thin">
                {EVENT_TYPES.slice(0, 4).map((et) => (
                  <button
                    key={et.id}
                    onClick={() => setFilterType(et.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                      filterType === et.id
                        ? 'bg-primary text-white font-semibold'
                        : 'bg-surface-hover text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {et.label}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No hay eventos ni mesas en esta categoría.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                  {filteredEvents.map((ev) => {
                    const sDate = new Date(ev.fecha_inicio);
                    const googleUrl = getGoogleCalendarUrl(ev);

                    return (
                      <div
                        key={ev.id}
                        className="p-3.5 rounded-xl bg-surface-hover/50 border border-surface-border flex flex-col justify-between group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <Badge variant={ev.tipo === 'TRIBUNAL_EXAMEN' ? 'danger' : 'primary'}>
                            {ev.tipo.replace('_', ' ')}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <a
                              href={googleUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded text-text-muted hover:text-primary transition-colors"
                              title="Añadir a Google Calendar"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => handleDeleteEvent(ev.id)}
                              className="text-text-muted hover:text-danger p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Eliminar evento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h4 className="text-xs font-bold text-text-primary mt-2">
                          {ev.titulo}
                        </h4>

                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted mt-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {sDate.toLocaleDateString('es-AR')} • {sDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                          </span>
                        </div>

                        {ev.notas && (
                          <p className="text-[11px] text-text-secondary mt-2 bg-surface p-2 rounded-lg border border-surface-border">
                            {ev.notas}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VISTA 2: MENSUAL */}
      {/* ===================================================================== */}
      {viewMode === 'mensual' && (
        <Card className="p-4 sm:p-6 space-y-4">
          {/* Header días de la semana */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-bold text-text-muted pb-2 border-b border-surface-border">
            <span>Lun</span>
            <span>Mar</span>
            <span>Mié</span>
            <span>Jue</span>
            <span>Vie</span>
            <span>Sáb</span>
            <span>Dom</span>
          </div>

          {/* Cuadrícula de días */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {(() => {
              const year = currentDate.getFullYear();
              const month = currentDate.getMonth();
              const firstDay = new Date(year, month, 1);
              const lastDay = new Date(year, month + 1, 0);
              
              // Ajuste para que lunes sea día 0
              let startOffset = firstDay.getDay() - 1;
              if (startOffset === -1) startOffset = 6;

              const cells = [];

              // Días vacíos al principio
              for (let i = 0; i < startOffset; i++) {
                cells.push(
                  <div key={`empty-${i}`} className="min-h-[90px] sm:min-h-[110px] p-1 bg-surface-hover/10 rounded-xl border border-dashed border-surface-border opacity-30" />
                );
              }

              // Días del mes
              for (let d = 1; d <= lastDay.getDate(); d++) {
                const dayDate = new Date(year, month, d);
                const isoStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const inRecess = isDateInRecess(isoStr);
                const inPeriod = isDateWithinAcademicPeriod(isoStr);
                const dayClasses = clases.filter(c => c.fecha === isoStr);
                const dayAbsence = inasistenciasDocente.find(i => i.fecha === isoStr);
                const dayEvents = events.filter(e => e.fecha_inicio?.startsWith(isoStr));
                const isToday = new Date().toISOString().split('T')[0] === isoStr;

                cells.push(
                  <div
                    key={isoStr}
                    className={`min-h-[90px] sm:min-h-[110px] p-2 rounded-xl border flex flex-col justify-between transition-all ${
                      isToday
                        ? 'border-primary shadow-xs ring-1 ring-primary'
                        : inRecess
                        ? 'bg-amber-500/5 border-amber-500/20'
                        : !inPeriod
                        ? 'bg-surface/50 border-surface-border opacity-60'
                        : 'bg-surface border-surface-border hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold font-mono ${isToday ? 'text-primary' : 'text-text-primary'}`}>
                        {d}
                      </span>
                      {inRecess && (
                        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/20 px-1 rounded">
                          Receso
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 my-1 flex-1 overflow-hidden">
                      {dayAbsence && (
                        <div className="text-[9px] font-bold text-amber-800 dark:text-amber-300 bg-amber-500/20 px-1 py-0.5 rounded truncate">
                          {dayAbsence.tipo === 'LICENCIA' ? `Lic: ${dayAbsence.articulo_licencia || 'Art'}` : 'Falta'}
                        </div>
                      )}
                      {dayClasses.map(c => {
                        const cat = catedrasMap.get(c.catedra_id);
                        return (
                          <div key={c.id} className="text-[9px] font-semibold text-primary bg-primary/10 px-1 py-0.5 rounded truncate">
                            {cat?.nombre || 'Clase'}
                          </div>
                        );
                      })}
                      {dayEvents.map(e => (
                        <div key={e.id} className="text-[9px] font-semibold text-danger bg-danger/10 px-1 py-0.5 rounded truncate">
                          {e.titulo}
                        </div>
                      ))}
                    </div>

                    <div className="text-[9px] font-mono text-text-muted text-right">
                      {dayClasses.length + dayEvents.length > 0 ? `${dayClasses.length + dayEvents.length} act.` : ''}
                    </div>
                  </div>
                );
              }

              return cells;
            })()}
          </div>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* VISTA 3: ANUAL */}
      {/* ===================================================================== */}
      {viewMode === 'anual' && (
        <div className="space-y-6">
          {/* Tarjetas de Resumen de Períodos del Año */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {periodos.map((p) => {
              const isRecess = p.tipo === 'RECESO';
              return (
                <Card
                  key={p.id}
                  className={`p-4 border-l-4 ${
                    isRecess ? 'border-l-amber-500 bg-amber-500/5' : 'border-l-primary'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-text-primary">
                      {p.nombre}
                    </h3>
                    <Badge variant={isRecess ? 'warning' : 'primary'}>
                      {p.tipo}
                    </Badge>
                  </div>
                  <p className="text-xs font-mono text-text-muted">
                    {p.fecha_inicio ? `Desde: ${p.fecha_inicio}` : 'Inicio sin definir'}
                  </p>
                  <p className="text-xs font-mono text-text-muted mt-0.5">
                    {p.fecha_fin ? `Hasta: ${p.fecha_fin}` : 'Fin sin definir'}
                  </p>
                  <p className="text-[11px] text-text-secondary mt-2">
                    {isRecess 
                      ? 'Vacaciones de invierno. Clases suspendidas sin cómputo de falta.'
                      : 'Período regular de dictado de clases y evaluación.'}
                  </p>
                </Card>
              );
            })}
          </div>

          {/* Grilla Anual de los 12 meses */}
          <Card className="p-6">
            <h3 className="text-sm font-bold text-text-primary mb-4 pb-2 border-b border-surface-border">
              Mapa Anual de Actividad Lectiva ({currentDate.getFullYear()})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {MONTHS.map((mName, mIdx) => {
                const isCurrentMonth = new Date().getMonth() === mIdx && new Date().getFullYear() === currentDate.getFullYear();
                const daysInMonth = new Date(currentDate.getFullYear(), mIdx + 1, 0).getDate();

                // Clases dictadas en este mes
                const monthClases = clases.filter(c => {
                  const [y, m] = (c.fecha || '').split('-').map(Number);
                  return y === currentDate.getFullYear() && m === (mIdx + 1);
                });

                // Eventos en este mes
                const monthEvents = events.filter(e => {
                  if (!e.fecha_inicio) return false;
                  const d = new Date(e.fecha_inicio);
                  return d.getFullYear() === currentDate.getFullYear() && d.getMonth() === mIdx;
                });

                return (
                  <div
                    key={mName}
                    className={`p-3 rounded-xl border transition-all ${
                      isCurrentMonth
                        ? 'border-primary ring-1 ring-primary bg-primary/5'
                        : 'border-surface-border bg-surface-hover/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-text-primary">
                        {mName}
                      </span>
                      {isCurrentMonth && (
                        <Badge variant="primary" className="text-[9px]">Actual</Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-text-muted font-mono">{daysInMonth} días</p>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-text-secondary">
                      <span>{monthClases.length} clases</span>
                      <span className="font-semibold text-primary">{monthEvents.length} eventos</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: Sincronización Google Calendar / Descargar .ics */}
      {/* ===================================================================== */}
      <Modal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        title="Sincronizar con Google Calendar"
        subtitle="Exporta tu cronograma completo a tu calendario digital"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-xl text-xs text-primary leading-relaxed">
            <strong>Compatibilidad Total:</strong> Genera un archivo estándar RFC 5545 (<code>.ics</code>) que puedes importar en Google Calendar, Apple Calendar, Outlook o el calendario de tu celular.
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-text-secondary tracking-wider">
              Paso a Paso para Google Calendar:
            </h4>
            <ol className="text-xs text-text-muted space-y-1.5 list-decimal pl-4">
              <li>Haz clic en <strong>Descargar archivo .ics</strong> abajo.</li>
              <li>Abre <a href="https://calendar.google.com" target="_blank" rel="noreferrer" className="text-primary underline">calendar.google.com</a> en tu navegador.</li>
              <li>Ve a <strong>Configuración (engranaje) &gt; Importar y exportar</strong>.</li>
              <li>Selecciona el archivo descargado y confirma la importación.</li>
            </ol>
          </div>

          <div className="pt-3 border-t border-surface-border flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsSyncModalOpen(false)}
              type="button"
            >
              Cerrar
            </Button>
            <Button
              variant="primary"
              icon={Download}
              onClick={handleDownloadIcs}
            >
              Descargar Archivo .ics
            </Button>
          </div>
        </div>
      </Modal>

      {/* ===================================================================== */}
      {/* MODAL: Nuevo Evento / Mesa */}
      {/* ===================================================================== */}
      <Modal
        isOpen={isNewEventModalOpen}
        onClose={() => setIsNewEventModalOpen(false)}
        title="Crear Evento en Calendario"
        subtitle="Mesa de examen final, reunión departamental o fecha clave"
      >
        <form onSubmit={handleCreateEvent} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-danger/10 border border-danger/30 text-danger text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
              Título del Evento o Mesa *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Mesa de Examen Final - Práctica Profesionalizante"
              className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
              Tipo de Evento *
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="TRIBUNAL_EXAMEN">Tribunal de Examen / Mesa Final</option>
              <option value="REUNION">Reunión Docente / Departamental</option>
              <option value="PERIODO">Cierre de Período / Calificaciones</option>
              <option value="OTRO">Otro Evento</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                Fecha *
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-surface-border rounded-xl bg-surface text-text-primary"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                Desde *
              </label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-surface-border rounded-xl bg-surface text-text-primary"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                Hasta *
              </label>
              <input
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-surface-border rounded-xl bg-surface text-text-primary"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
              Notas adicionales / Vocales de la mesa
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              placeholder="Ej: Aula 14. Integrantes del tribunal: Prof. López, Prof. Díaz."
              className="w-full px-3 py-2 text-xs sm:text-sm border border-surface-border rounded-xl bg-surface text-text-primary resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsNewEventModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
            >
              Guardar Evento
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
