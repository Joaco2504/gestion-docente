import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
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
  Sparkles,
  Award,
  HelpCircle,
  Tag
} from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { handleAppError } from '../utils/handleAppError';
import { generateIcsContent, downloadIcsFile, getGoogleCalendarUrl } from '../lib/calendarSync';
import { formatFechaDMY, formatFechaLegible, getRelativeDateLabel, getTodayYMD } from '../lib/dateUtils';

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const SHORT_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function CalendarPage() {
  const { user, isDemo } = useAuth();
  const { catedras, activeInstitucion, activeCiclo, periodosAcademicos } = useApp();

  // Mode: 'dia' | 'semanal' | 'mensual' | 'anual'
  const [viewMode, setViewMode] = useState('semanal');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Data states
  const [events, setEvents] = useState([]);
  const [clases, setClases] = useState([]);
  const [inasistenciasDocente, setInasistenciasDocente] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Category Filter
  const [selectedCategory, setSelectedCategory] = useState('TODOS');

  // Mini calendar state for left panel
  const [miniCalDate, setMiniCalDate] = useState(new Date());

  // Modals
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [selectedEventForDetail, setSelectedEventForDetail] = useState(null);

  // New Event Form State
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('TRIBUNAL_EXAMEN');
  const [fecha, setFecha] = useState(getTodayYMD());
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFin, setHoraFin] = useState('10:00');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchAllCalendarData();
  }, [user, catedras, activeCiclo]);

  // Sincronización en tiempo real ante eventos de guardado de períodos (sin recargar página)
  useEffect(() => {
    const handlePeriodosUpdate = (e) => {
      if (e.detail && Array.isArray(e.detail) && e.detail.length > 0) {
        setPeriodos(e.detail);
      } else {
        fetchAllCalendarData();
      }
    };

    window.addEventListener('periodos_academicos_updated', handlePeriodosUpdate);
    window.addEventListener('docentepro:periodos_updated', handlePeriodosUpdate);

    return () => {
      window.removeEventListener('periodos_academicos_updated', handlePeriodosUpdate);
      window.removeEventListener('docentepro:periodos_updated', handlePeriodosUpdate);
    };
  }, []);

  // Sincronización directa si el contexto global actualiza periodosAcademicos
  useEffect(() => {
    if (periodosAcademicos && periodosAcademicos.length > 0) {
      setPeriodos(periodosAcademicos);
    }
  }, [periodosAcademicos]);

  const fetchAllCalendarData = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && !isDemo && user) {
        // 1. Eventos de Calendario
        const { data: evData } = await supabase
          .from('eventos_calendario')
          .select('*')
          .eq('docente_id', user.id)
          .order('fecha_inicio', { ascending: true });
        setEvents(evData || []);

        // 2. Clases Registradas de las Cátedras
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

        // 4. Períodos Académicos del Ciclo Activo
        let perQuery = supabase.from('periodos_academicos').select('*');
        if (activeCiclo?.id) {
          perQuery = perQuery.eq('ciclo_id', activeCiclo.id);
        }
        const { data: perData } = await perQuery.order('fecha_inicio', { ascending: true });

        if (perData && perData.length > 0) {
          setPeriodos(perData);
        } else if (periodosAcademicos && periodosAcademicos.length > 0) {
          setPeriodos(periodosAcademicos);
        } else {
          setPeriodos(getDefaultPeriods());
        }
      } else {
        loadDemoCalendarData();
      }
    } catch (err) {
      handleAppError(err, 'CalendarPage / Cargar datos calendario');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPeriods = () => [
    { id: 'per-1', nombre: '1° Cuatrimestre', tipo: 'PRIMER_CUATRIMESTRE', fecha_inicio: '2026-03-09', fecha_fin: '2026-07-10' },
    { id: 'per-2', nombre: 'Receso Invernal', tipo: 'RECESO_INVERNAL', fecha_inicio: '2026-07-13', fecha_fin: '2026-07-24' },
    { id: 'per-3', nombre: '2° Cuatrimestre', tipo: 'SEGUNDO_CUATRIMESTRE', fecha_inicio: '2026-08-03', fecha_fin: '2026-11-20' }
  ];

  const loadDemoCalendarData = () => {
    const sampleEvents = [
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
        titulo: 'Reunión Plenaria Docente Ciclo 2026',
        tipo: 'REUNION',
        fecha_inicio: new Date(Date.now() + 86400000 * 5).toISOString(),
        fecha_fin: new Date(Date.now() + 86400000 * 5 + 3600000).toISOString(),
        notas: 'Planificación cuatrimestral y pautas institucionales.',
        editable: true
      }
    ];

    setEvents(sampleEvents);
    const demoPeriods = (periodosAcademicos && periodosAcademicos.length > 0) ? periodosAcademicos : getDefaultPeriods();
    setPeriodos(demoPeriods);
  };

  /**
   * Generación de todas las clases recurrentes de las cátedras para la fecha actual
   */
  const regularClasses = useMemo(() => {
    const list = [];
    (catedras || []).forEach(cat => {
      const horarios = Array.isArray(cat.horarios_semanales) ? cat.horarios_semanales : [];
      horarios.forEach(h => {
        list.push({
          id: `class-recur-${cat.id}-${h.dia}`,
          catedra_id: cat.id,
          catedra_nombre: cat.nombre,
          dia_semana: h.dia,
          desde: h.desde || '18:00',
          hasta: h.hasta || '20:00',
          aula: h.aula || 'Aula General',
          nivel: cat.nivel,
          modalidad: cat.modalidad
        });
      });
    });
    return list;
  }, [catedras]);

  /**
   * Generación de eventos sintéticos para límites de períodos lectivos y receso invernal
   */
  const periodoEvents = useMemo(() => {
    const pEvents = [];
    (periodos || []).forEach((p, idx) => {
      const pNombre = p.nombre || (
        p.tipo === 'PRIMER_CUATRIMESTRE' ? '1° Cuatrimestre' :
        p.tipo === 'RECESO_INVERNAL' ? 'Receso Invernal' :
        p.tipo === 'SEGUNDO_CUATRIMESTRE' ? '2° Cuatrimestre' : `Período ${idx + 1}`
      );

      const fInicio = p.fecha_inicio ? String(p.fecha_inicio).split('T')[0] : null;
      const fFin = p.fecha_fin ? String(p.fecha_fin).split('T')[0] : null;

      if (fInicio) {
        pEvents.push({
          id: `per-inicio-${p.id || p.tipo || idx}`,
          titulo: `Inicio: ${pNombre}`,
          tipo: 'PERIODO',
          fecha_inicio: `${fInicio}T08:00:00`,
          fecha_fin: `${fInicio}T12:00:00`,
          fecha: fInicio,
          notas: `Apertura del ciclo o período académico: ${pNombre}. Cronograma: ${fInicio} al ${fFin || fInicio}`,
          isPeriodo: true,
          editable: false
        });
      }

      if (fFin && fFin !== fInicio) {
        pEvents.push({
          id: `per-fin-${p.id || p.tipo || idx}`,
          titulo: `Cierre: ${pNombre}`,
          tipo: 'PERIODO',
          fecha_inicio: `${fFin}T08:00:00`,
          fecha_fin: `${fFin}T18:00:00`,
          fecha: fFin,
          notas: `Cierre del período académico: ${pNombre}. Cronograma: ${fInicio || fFin} al ${fFin}`,
          isPeriodo: true,
          editable: false
        });
      }
    });
    return pEvents;
  }, [periodos]);

  /**
   * Colección unificada de eventos (eventos del docente + hitos de períodos académicos)
   */
  const allCalendarEvents = useMemo(() => {
    return [...events, ...periodoEvents];
  }, [events, periodoEvents]);

  /**
   * Cálculo de Próximo Evento / Clase para la Tarjeta de Cuenta Regresiva
   */
  const nextUpcomingItem = useMemo(() => {
    const now = new Date();
    const candidates = [];

    // 1. Revisar eventos futuros (incluye cierres e hitos de períodos académicos)
    allCalendarEvents.forEach(ev => {
      const evDate = new Date(ev.fecha_inicio || ev.fecha);
      if (evDate >= now) {
        candidates.push({
          id: ev.id,
          titulo: ev.titulo,
          tipo: ev.tipo,
          date: evDate,
          isClass: false,
          hora: ev.fecha_inicio ? ev.fecha_inicio.substring(11, 16) : '08:00'
        });
      }
    });

    // 2. Revisar próximas clases según el día actual
    const daysMap = { 'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6 };
    regularClasses.forEach(cls => {
      const targetDay = daysMap[cls.dia_semana];
      if (targetDay !== undefined) {
        const diff = (targetDay - now.getDay() + 7) % 7;
        const clsDate = new Date();
        clsDate.setDate(now.getDate() + diff);
        const [hh, mm] = (cls.desde || '18:00').split(':');
        clsDate.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);

        if (clsDate >= now) {
          candidates.push({
            id: cls.id,
            titulo: cls.catedra_nombre,
            tipo: 'CLASE',
            date: clsDate,
            isClass: true,
            hora: cls.desde,
            aula: cls.aula
          });
        }
      }
    });

    candidates.sort((a, b) => a.date - b.date);
    return candidates[0] || null;
  }, [allCalendarEvents, regularClasses]);

  /**
   * Navegación de Fecha
   */
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'dia') d.setDate(d.getDate() - 1);
    else if (viewMode === 'semanal') d.setDate(d.getDate() - 7);
    else if (viewMode === 'mensual') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'anual') d.setFullYear(d.getFullYear() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'dia') d.setDate(d.getDate() + 1);
    else if (viewMode === 'semanal') d.setDate(d.getDate() + 7);
    else if (viewMode === 'mensual') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'anual') d.setFullYear(d.getFullYear() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  /**
   * Crear Nuevo Evento en Supabase o Demo
   */
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    setSaving(true);
    setErrorMsg('');

    try {
      const startDateObj = new Date(`${fecha}T${horaInicio}:00`);
      const endDateObj = new Date(`${fecha}T${horaFin}:00`);
      const startIso = isNaN(startDateObj.getTime()) ? `${fecha}T${horaInicio}:00Z` : startDateObj.toISOString();
      const endIso = isNaN(endDateObj.getTime()) ? `${fecha}T${horaFin}:00Z` : endDateObj.toISOString();

      if (isSupabaseConfigured && !isDemo && user) {
        const { data, error } = await supabase
          .from('eventos_calendario')
          .insert({
            docente_id: user.id,
            titulo: titulo.trim(),
            tipo,
            fecha_inicio: startIso,
            fecha_fin: endIso,
            notas: notas.trim() || null
          })
          .select()
          .single();

        if (error) throw error;
        setEvents(prev => [...prev, data]);
        toast.success(`Evento "${titulo}" registrado`);
      } else {
        const newEv = {
          id: 'ev-' + Date.now(),
          titulo: titulo.trim(),
          tipo,
          fecha_inicio: startIso,
          fecha_fin: endIso,
          notas: notas.trim() || null,
          editable: true
        };
        setEvents(prev => [...prev, newEv]);
        toast.success(`Evento "${titulo}" creado (Modo Demo)`);
      }

      setIsNewEventModalOpen(false);
      setTitulo('');
      setNotas('');
    } catch (err) {
      const info = handleAppError(err, 'CalendarPage / Crear Evento', user);
      setErrorMsg(`${info.mensaje} (Código: ${info.codigo})`);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Eliminar Evento
   */
  const handleDeleteEvent = async (eventId) => {
    if (!confirm('¿Estás seguro de eliminar este evento del calendario?')) return;
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { error } = await supabase
          .from('eventos_calendario')
          .delete()
          .eq('id', eventId);
        if (error) throw error;
      }
      setEvents(prev => prev.filter(e => e.id !== eventId));
      setSelectedEventForDetail(null);
      toast.success('Evento eliminado del calendario');
    } catch (err) {
      handleAppError(err, 'CalendarPage / Eliminar Evento', user);
    }
  };

  /**
   * Exportar archivo .ics
   */
  const handleDownloadIcs = () => {
    try {
      const ics = generateIcsContent(allCalendarEvents, catedras);
      downloadIcsFile(ics, `calendario_docente_${new Date().getFullYear()}.ics`);
      toast.success('Archivo .ics descargado con éxito');
      setIsSyncModalOpen(false);
    } catch (err) {
      handleAppError(err, 'CalendarPage / Generar Archivo ICS', user);
    }
  };

  /**
   * Días del mes para el Mini Calendario en el Panel Izquierdo
   */
  const miniCalMonthDays = useMemo(() => {
    const year = miniCalDate.getFullYear();
    const month = miniCalDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // Normalizar a Lunes = 0
    const offset = (firstDayIndex + 6) % 7;
    const days = [];

    // Días vacíos previos
    for (let i = 0; i < offset; i++) {
      days.push(null);
    }
    // Días del mes
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [miniCalDate]);

  /**
   * Días del mes para el Calendario Principal Mensual (reacciona a currentDate)
   */
  const mainCalMonthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // Normalizar a Lunes = 0
    const offset = (firstDayIndex + 6) % 7;
    const days = [];

    for (let i = 0; i < offset; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [currentDate]);

  /**
   * Colores y Estilos Pastel según la Categoría
   */
  const getEventStyle = (tipo) => {
    switch (tipo) {
      case 'CLASE':
        return {
          bg: 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60 hover:border-blue-400',
          badge: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200',
          text: 'text-blue-900 dark:text-blue-100',
          tag: 'Clase Regular',
          dot: 'bg-blue-500'
        };
      case 'TRIBUNAL_EXAMEN':
        return {
          bg: 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 hover:border-rose-400',
          badge: 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200',
          text: 'text-rose-900 dark:text-rose-100',
          tag: 'Examen / Mesa',
          dot: 'bg-rose-500'
        };
      case 'REUNION':
        return {
          bg: 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60 hover:border-sky-400',
          badge: 'bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200',
          text: 'text-sky-900 dark:text-sky-100',
          tag: 'Reunión Docente',
          dot: 'bg-sky-500'
        };
      case 'PERIODO':
        return {
          bg: 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 hover:border-amber-400',
          badge: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200',
          text: 'text-amber-900 dark:text-amber-100',
          tag: 'Cierre de Período',
          dot: 'bg-amber-500'
        };
      default:
        return {
          bg: 'bg-slate-50/90 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-400',
          badge: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200',
          text: 'text-slate-900 dark:text-slate-100',
          tag: 'Compromiso',
          dot: 'bg-slate-400'
        };
    }
  };

  /**
   * Rango de fechas visibles en la cabecera
   */
  const formattedHeaderRange = useMemo(() => {
    if (viewMode === 'dia') {
      return formatFechaLegible(currentDate);
    }
    if (viewMode === 'mensual') {
      return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    if (viewMode === 'anual') {
      return `Ciclo Lectivo ${currentDate.getFullYear()}`;
    }
    // Semanal: inicio y fin de semana
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 5);

    return `${startOfWeek.getDate()} de ${MONTH_NAMES[startOfWeek.getMonth()]} - ${endOfWeek.getDate()} de ${MONTH_NAMES[endOfWeek.getMonth()]} ${endOfWeek.getFullYear()}`;
  }, [viewMode, currentDate]);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-7xl mx-auto">
      {/* Top Header con Sincronización y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
                  Calendario y Agenda Docente
                </h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {activeCiclo ? `Ciclo ${activeCiclo.anio}` : 'Multi-Cátedra'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                Organización de clases de cátedra, tribunales de examen final y cronograma institucional.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            icon={Download}
            onClick={() => setIsSyncModalOpen(true)}
            className="text-xs"
          >
            Sincronizar (.ics)
          </Button>

          <button
            type="button"
            onClick={() => setIsNewEventModalOpen(true)}
            className="group relative inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 border border-indigo-400/30 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 cursor-pointer shrink-0"
            title="Registrar nuevo compromiso, mesa de examen o reunión"
          >
            <Plus className="w-4 h-4 transition-transform duration-300 ease-out group-hover:rotate-90 shrink-0" />
            <span>Agregar Compromiso</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          MULTI-PANEL LAYOUT (LEFT CONTROL PANEL + CENTRAL GRID)
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================
            1. PANEL DE CONTROL / NAVEGACIÓN RÁPIDA BENTO GLASS (4 Cols)
           ======================================================== */}
        <div className="lg:col-span-4 space-y-4">
          <div className="backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 text-text-primary shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] space-y-5 transition-colors">
            {/* Header del Panel de Control */}
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Navegación Rápida
                </span>
              </div>
              <button
                type="button"
                onClick={handleToday}
                className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
              >
                Ir a Hoy
              </button>
            </div>

            {/* A. MINI CALENDARIO MENSUAL INTERACTIVO */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-text-primary">
                  {MONTH_NAMES[miniCalDate.getMonth()]} {miniCalDate.getFullYear()}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(miniCalDate);
                      d.setMonth(d.getMonth() - 1);
                      setMiniCalDate(d);
                    }}
                    className="p-1 rounded-lg hover:bg-slate-100/70 dark:hover:bg-white/[0.05] text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(miniCalDate);
                      d.setMonth(d.getMonth() + 1);
                      setMiniCalDate(d);
                    }}
                    className="p-1 rounded-lg hover:bg-slate-100/70 dark:hover:bg-white/[0.05] text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Días de la semana abreviados */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono text-text-muted font-bold">
                {SHORT_DAYS.map((sd, i) => (
                  <span key={i}>{sd}</span>
                ))}
              </div>

              {/* Grilla de días */}
              <div className="grid grid-cols-7 gap-1">
                {miniCalMonthDays.map((d, i) => {
                  if (!d) return <div key={`empty-${i}`} className="h-7 w-7" />;
                  const isSelected = d.toDateString() === currentDate.toDateString();
                  const isToday = d.toDateString() === new Date().toDateString();

                  // Determinar si hay eventos o clases este día
                  const dStr = d.toISOString().split('T')[0];
                  const hasEv = allCalendarEvents.some(e => (e.fecha_inicio || e.fecha || '').startsWith(dStr));

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentDate(d)}
                      className={`
                        h-7 w-7 rounded-lg text-xs font-mono font-medium transition-all flex flex-col items-center justify-center relative cursor-pointer
                        ${isSelected 
                          ? 'bg-primary text-white font-bold shadow-sm shadow-primary/30' 
                          : isToday 
                            ? 'border border-primary text-primary hover:bg-primary/10' 
                            : 'text-text-secondary hover:bg-slate-100/70 dark:hover:bg-white/[0.05] hover:text-text-primary'
                        }
                      `}
                    >
                      <span>{d.getDate()}</span>
                      {hasEv && (
                        <span className="w-1 h-1 rounded-full bg-primary -mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* B. TARJETA DESTACADA: CUENTA REGRESIVA / PRÓXIMO EVENTO */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-white/80 to-primary/5 dark:from-primary/15 dark:via-slate-800/60 dark:to-primary/10 border border-primary/25 space-y-2.5 relative overflow-hidden backdrop-blur-md shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Próximo Compromiso</span>
                </span>
                {nextUpcomingItem && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/20">
                    {getRelativeDateLabel(nextUpcomingItem.date.toISOString().split('T')[0])}
                  </span>
                )}
              </div>

              {nextUpcomingItem ? (
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-text-primary line-clamp-2 leading-snug">
                    {nextUpcomingItem.titulo}
                  </h4>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-text-secondary font-mono">
                    <span className="text-primary font-bold">
                      {nextUpcomingItem.hora} hs
                    </span>
                    <span>•</span>
                    <span className="text-text-muted truncate">
                      {nextUpcomingItem.isClass ? (nextUpcomingItem.aula || 'Aula regular') : 'Examen / Compromiso'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-text-muted">
                  No tienes clases ni exámenes pendientes programados.
                </p>
              )}
            </div>

            {/* C. FILTROS POR CATEGORÍAS ESTILIZADOS */}
            <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-white/10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1">
                Filtrar por Categoría
              </span>

              <div className="space-y-1.5 text-xs">
                {[
                  { id: 'TODOS', label: 'Todas las categorías', color: 'bg-slate-400' },
                  { id: 'CLASE', label: 'Clases de Cátedra', color: 'bg-primary' },
                  { id: 'TRIBUNAL_EXAMEN', label: 'Exámenes & Tribunales', color: 'bg-rose-500' },
                  { id: 'REUNION', label: 'Reuniones Institucionales', color: 'bg-sky-500' },
                  { id: 'PERIODO', label: 'Períodos & Recesos', color: 'bg-amber-500' }
                ].map(catItem => {
                  const isActive = selectedCategory === catItem.id;
                  return (
                    <button
                      key={catItem.id}
                      type="button"
                      onClick={() => setSelectedCategory(catItem.id)}
                      className={`
                        w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all text-left font-medium cursor-pointer
                        ${isActive 
                          ? 'bg-primary/10 text-primary border border-primary/25 font-bold shadow-xs' 
                          : 'text-text-muted hover:text-text-primary hover:bg-slate-100/70 dark:hover:bg-white/[0.05]'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${catItem.color}`} />
                        <span>{catItem.label}</span>
                      </div>
                      {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* D. RESUMEN BENTO: LÍMITES DE PERÍODOS ACADÉMICOS Y RECESO */}
            <div className="space-y-2.5 pt-3 border-t border-slate-200/60 dark:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
                  <span>Límites Períodos Lectivos</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                  {activeCiclo ? `Ciclo ${activeCiclo.anio}` : 'Vigente'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs font-medium">
                {periodos.map((p, idx) => {
                  const pNombre = p.nombre || (
                    p.tipo === 'PRIMER_CUATRIMESTRE' ? '1° Cuatrimestre' :
                    p.tipo === 'RECESO_INVERNAL' ? 'Receso Invernal' :
                    p.tipo === 'SEGUNDO_CUATRIMESTRE' ? '2° Cuatrimestre' : `Período ${idx + 1}`
                  );
                  const isReceso = p.tipo === 'RECESO_INVERNAL' || p.tipo === 'RECESO';
                  const startStr = p.fecha_inicio ? formatFechaDMY(p.fecha_inicio) : 'S/F';
                  const endStr = p.fecha_fin ? formatFechaDMY(p.fecha_fin) : 'S/F';

                  return (
                    <div 
                      key={p.id || idx}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                        isReceso 
                          ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/40 text-amber-900 dark:text-amber-200' 
                          : 'bg-slate-50/70 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/10 text-text-primary'
                      }`}
                    >
                      <div className="truncate">
                        <span className="text-[11px] font-bold block truncate">{pNombre}</span>
                        <span className="text-[10px] font-mono text-text-muted">
                          {startStr} al {endStr}
                        </span>
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                        isReceso 
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' 
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {isReceso ? 'Receso' : 'Cuatrimestre'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            2. CUADRÍCULA CENTRAL DE HORARIOS Y AGENDA (8 Cols)
           ======================================================== */}
        <div className="lg:col-span-8 space-y-4">
          {/* Barra de Control de Vistas y Rango de Fecha */}
          <div className="backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 p-3.5 sm:p-5 shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Navegación Anterior / Siguiente / Hoy */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 hover:bg-slate-100/70 dark:hover:bg-white/[0.05] text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  title="Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 hover:bg-slate-100/70 dark:hover:bg-white/[0.05] text-xs font-semibold text-text-primary transition-colors cursor-pointer"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 hover:bg-slate-100/70 dark:hover:bg-white/[0.05] text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  title="Siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <span className="text-xs sm:text-sm font-bold text-text-primary font-mono truncate">
                {formattedHeaderRange}
              </span>
            </div>

            {/* SELECTOR DE VISTAS ESTILO PILL: DÍA, SEMANA, MES, AÑO */}
            <div className="flex items-center bg-slate-100/80 dark:bg-white/[0.05] p-1 rounded-xl sm:rounded-2xl border border-slate-200/60 dark:border-white/10 w-full sm:w-auto justify-center">
              {[
                { id: 'dia', label: 'Día' },
                { id: 'semanal', label: 'Semana' },
                { id: 'mensual', label: 'Mes' },
                { id: 'anual', label: 'Año' }
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setViewMode(v.id)}
                  className={`
                    px-3.5 py-1.5 rounded-lg sm:rounded-xl text-xs font-semibold transition-all cursor-pointer
                    ${viewMode === v.id
                      ? 'bg-white dark:bg-slate-800 text-primary shadow-xs font-bold'
                      : 'text-text-muted hover:text-text-primary'
                    }
                  `}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* ========================================================
              CONTENEDOR DINÁMICO DE VISTAS CON ANIMACIÓN FRAMER MOTION
             ======================================================== */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${viewMode}-${currentDate.getFullYear()}-${currentDate.getMonth()}-${viewMode === 'semanal' ? Math.floor(currentDate.getDate() / 7) : currentDate.getDate()}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="transition-all duration-300 ease-out"
            >
              {/* ========================================================
                  VISTA 1: DÍA (DAY VIEW)
                 ======================================================== */}
              {viewMode === 'dia' && (
                <div className="backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 space-y-4 shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] transition-all duration-300 ease-out">
                  <div className="border-b border-slate-200/60 dark:border-white/10 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-text-primary">
                        Agenda del {formatFechaLegible(currentDate)}
                      </h3>
                      <p className="text-xs text-text-muted">Horarios y compromisos de la jornada (orden cronológico)</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFecha(currentDate.toISOString().split('T')[0]);
                        setIsNewEventModalOpen(true);
                      }}
                      className="group relative inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/35 border border-emerald-400/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 transition-transform duration-300 ease-out group-hover:rotate-90 shrink-0" />
                      <span>Agregar a este día</span>
                    </button>
                  </div>

                  {/* Eventos y Clases de este Día (Orden Estricto Ascendente por hora_inicio) */}
                  <div className="space-y-3">
                    {(() => {
                      const currIso = currentDate.toISOString().split('T')[0];
                      const currDayName = DAYS_OF_WEEK[(currentDate.getDay() + 6) % 7];

                      // Filtrar clases de cátedra regulares para este día
                      const matchingClasses = (selectedCategory === 'TODOS' || selectedCategory === 'CLASE')
                        ? regularClasses.filter(c => c.dia_semana === currDayName)
                        : [];

                      // Filtrar eventos de calendario (incluye hitos de períodos)
                      const matchingEvents = allCalendarEvents.filter(e => {
                        if (selectedCategory !== 'TODOS' && e.tipo !== selectedCategory) return false;
                        const evIso = (e.fecha_inicio || e.fecha || '').split('T')[0];
                        return evIso === currIso;
                      });

                      // Unificar y ordenar ASCENDENTEMENTE por hora de ingreso
                      const dayScheduleItems = [
                        ...matchingClasses.map(cls => ({
                          id: `cls-${cls.id}`,
                          tipo: 'CLASE',
                          titulo: cls.catedra_nombre,
                          subtitulo: `${cls.nivel || 'Nivel Superior'} • ${cls.aula || 'Aula regular'}`,
                          hora_inicio: cls.desde || '00:00',
                          hora_fin: cls.hasta || '',
                          isClass: true,
                          data: cls
                        })),
                        ...matchingEvents.map(ev => ({
                          id: `ev-${ev.id}`,
                          tipo: ev.tipo,
                          titulo: ev.titulo,
                          subtitulo: ev.notas || '',
                          hora_inicio: ev.fecha_inicio ? ev.fecha_inicio.substring(11, 16) : (ev.hora || '08:00'),
                          hora_fin: ev.fecha_fin ? ev.fecha_fin.substring(11, 16) : '',
                          isClass: false,
                          isPeriodo: ev.isPeriodo,
                          data: ev
                        }))
                      ].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

                      if (dayScheduleItems.length === 0) {
                        return (
                          <div className="py-12 text-center text-text-muted space-y-2 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01]">
                            <CalendarIcon className="w-8 h-8 mx-auto opacity-40" />
                            <p className="text-xs">No tienes clases ni eventos programados para este día.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          {dayScheduleItems.map(item => {
                            const styles = getEventStyle(item.tipo);
                            return (
                              <div
                                key={item.id}
                                onClick={() => !item.isClass && setSelectedEventForDetail(item.data)}
                                className={`p-4 rounded-2xl border transition-all ${styles.bg} flex items-start justify-between gap-3 ${!item.isClass ? 'cursor-pointer' : ''}`}
                              >
                                <div className="space-y-1">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles.badge}`}>
                                    {styles.tag}
                                  </span>
                                  <h4 className={`text-sm font-bold ${styles.text}`}>
                                    {item.titulo}
                                  </h4>
                                  {item.subtitulo && (
                                    <p className="text-xs text-text-secondary line-clamp-2">
                                      {item.subtitulo}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-surface border border-surface-border text-text-primary">
                                    {item.hora_inicio}{item.hora_fin ? ` - ${item.hora_fin}` : ''} hs
                                  </span>
                                  {!item.isClass && !item.isPeriodo && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteEvent(item.data.id);
                                      }}
                                      className="p-1 text-text-muted hover:text-rose-600 rounded cursor-pointer"
                                      title="Eliminar evento"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* ========================================================
                  VISTA 2: SEMANAL (WEEK VIEW)
                 ======================================================== */}
              {viewMode === 'semanal' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 transition-all duration-300 ease-out">
                  {DAYS_OF_WEEK.map((diaName) => {
                    const todayDayName = DAYS_OF_WEEK[(new Date().getDay() + 6) % 7];
                    const isToday = diaName === todayDayName;

                    // Clases regulares ordenadas estrictamente de forma ascendente por hora de inicio
                    const dayClasses = (selectedCategory === 'TODOS' || selectedCategory === 'CLASE')
                      ? regularClasses
                          .filter(c => c.dia_semana === diaName)
                          .sort((a, b) => (a.desde || '').localeCompare(b.desde || ''))
                      : [];

                    return (
                      <div
                        key={diaName}
                        className={`p-4 sm:p-5 space-y-3 flex flex-col justify-between transition-all duration-300 ease-out ${
                          isToday
                            ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-2 border-emerald-500 rounded-2xl shadow-sm'
                            : 'backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:border-emerald-400/40 hover:-translate-y-0.5'
                        }`}
                      >
                        <div>
                          {/* Cabecera del Día */}
                          <div className={`flex items-center justify-between border-b pb-2.5 ${isToday ? 'border-emerald-500/30' : 'border-slate-200/60 dark:border-white/10'}`}>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold uppercase tracking-wider ${isToday ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-text-primary'}`}>
                                {diaName}
                              </span>
                              {isToday && (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                  HOY
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono font-bold text-text-muted">
                              {dayClasses.length} {dayClasses.length === 1 ? 'materia' : 'materias'}
                            </span>
                          </div>

                          {/* Tarjetas de clases del día ordenadas ascendentemente */}
                          <div className="mt-3 space-y-2">
                            {dayClasses.length === 0 ? (
                              <p className="text-[11px] text-text-muted italic py-3 text-center">
                                Sin cátedras fijas este día
                              </p>
                            ) : (
                              dayClasses.map(cls => {
                                const styles = getEventStyle('CLASE');
                                return (
                                  <div
                                    key={cls.id}
                                    className={`p-3 rounded-xl border transition-all ${styles.bg} space-y-1.5`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <h4 className="text-xs font-bold text-text-primary truncate">
                                        {cls.catedra_nombre}
                                      </h4>
                                      <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded shrink-0">
                                        {cls.desde} hs
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-text-muted">
                                      <span>{cls.aula || 'Aula regular'}</span>
                                      <span>{cls.hasta} hs</span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsNewEventModalOpen(true);
                          }}
                          className="group inline-flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 py-2 px-3 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800/60 hover:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all duration-200 cursor-pointer active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-90 shrink-0" />
                          <span>Agregar Compromiso</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ========================================================
                  VISTA 3: MENSUAL (MONTH VIEW)
                 ======================================================== */}
              {viewMode === 'mensual' && (
                <div className="backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 p-4 sm:p-6 shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] space-y-3">
                  <div className="grid grid-cols-7 gap-1 text-center text-xs font-mono font-bold text-text-muted pb-2.5 border-b border-slate-200/60 dark:border-white/10">
                    {DAYS_OF_WEEK.map((d, i) => (
                      <span key={i} className="truncate">{d.substring(0, 3)}</span>
                    ))}
                    <span className="truncate">Dom</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {mainCalMonthDays.map((d, idx) => {
                      if (!d) {
                        return <div key={`empty-month-${idx}`} className="min-h-[72px] bg-slate-100/30 dark:bg-white/[0.02] rounded-xl" />;
                      }

                      const dStr = d.toISOString().split('T')[0];
                      const isToday = d.toDateString() === new Date().toDateString();
                      const isSelected = d.toDateString() === currentDate.toDateString();

                      // Eventos de este día (incluye hitos de períodos académicos)
                      const dayEvents = allCalendarEvents.filter(e => {
                        if (selectedCategory !== 'TODOS' && e.tipo !== selectedCategory) return false;
                        const evDate = (e.fecha_inicio || e.fecha || '').split('T')[0];
                        return evDate === dStr;
                      });

                      // Detección de Receso Invernal
                      const recesoPeriodo = (periodos || []).find(p => p.tipo === 'RECESO_INVERNAL' || p.tipo === 'RECESO');
                      const recesoInicio = recesoPeriodo?.fecha_inicio ? String(recesoPeriodo.fecha_inicio).split('T')[0] : null;
                      const recesoFin = recesoPeriodo?.fecha_fin ? String(recesoPeriodo.fecha_fin).split('T')[0] : null;
                      const isRecesoDay = recesoInicio && recesoFin && dStr >= recesoInicio && dStr <= recesoFin;

                      return (
                        <motion.div
                          key={idx}
                          whileHover={{ scale: 1.02 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                          onClick={() => {
                            setCurrentDate(d);
                            setViewMode('dia');
                          }}
                          className={`
                            relative min-h-[72px] p-2 rounded-xl border text-xs cursor-pointer transition-colors flex flex-col justify-between overflow-hidden
                            ${isSelected 
                              ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-xs' 
                              : isToday 
                                ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20' 
                                : isRecesoDay
                                  ? 'border-amber-300/60 dark:border-amber-700/50 bg-amber-50/40 dark:bg-amber-950/20 hover:border-amber-400'
                                  : 'border-slate-200/70 dark:border-white/10 hover:border-indigo-400/50 hover:bg-slate-100/40 dark:hover:bg-white/[0.04]'
                            }
                          `}
                        >
                          {/* Animación de pulso sutil en el día actual */}
                          {isToday && (
                            <motion.div
                              className="absolute inset-0 rounded-xl border-2 border-indigo-500 pointer-events-none"
                              animate={{ opacity: [0.35, 0.85, 0.35] }}
                              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                            />
                          )}

                          <div className="flex items-center justify-between">
                            <span className={`font-mono font-bold text-[11px] ${isToday ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-text-primary'}`}>
                              {d.getDate()}
                            </span>
                            {isRecesoDay && !dayEvents.some(e => e.tipo === 'PERIODO') && (
                              <span className="text-[8px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tighter bg-amber-500/15 px-1 rounded">
                                Receso
                              </span>
                            )}
                          </div>

                          <div className="space-y-1 overflow-hidden">
                            {dayEvents.slice(0, 2).map((ev) => {
                              const isPeriod = ev.tipo === 'PERIODO';
                              return (
                                <motion.div
                                  key={ev.id}
                                  initial={{ scale: 0.85, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md truncate ${
                                    isPeriod 
                                      ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/35 font-bold'
                                      : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20'
                                  }`}
                                  title={ev.titulo}
                                >
                                  {isPeriod && '⚡ '}
                                  {ev.titulo}
                                </motion.div>
                              );
                            })}
                            {dayEvents.length > 2 && (
                              <span className="text-[9px] font-mono text-text-muted">
                                +{dayEvents.length - 2} más
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ========================================================
                  VISTA 4: ANUAL (YEAR VIEW)
                 ======================================================== */}
              {viewMode === 'anual' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {MONTH_NAMES.map((mName, mIdx) => (
                    <div
                      key={mName}
                      onClick={() => {
                        const d = new Date(currentDate);
                        d.setMonth(mIdx);
                        setCurrentDate(d);
                        setViewMode('mensual');
                      }}
                      className="backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 hover:border-primary/40 hover:-translate-y-0.5 cursor-pointer transition-all duration-200 shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] space-y-2"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/10 pb-1.5">
                        <span className="text-xs font-bold text-text-primary">{mName}</span>
                        <span className="text-[10px] font-mono text-text-muted">{currentDate.getFullYear()}</span>
                      </div>

                      <div className="py-2 text-center text-xs text-text-muted">
                        <span>Haz clic para explorar el mes</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ========================================================
          MODAL FLOTANTE: CREAR / EDITAR EVENTO (rounded-2xl shadow-2xl)
         ======================================================== */}
      <Modal
        isOpen={isNewEventModalOpen}
        onClose={() => setIsNewEventModalOpen(false)}
        title="Crear Evento en Calendario"
        subtitle="Mesa de examen final, reunión departamental o fecha clave institucional"
      >
        <form onSubmit={handleCreateEvent} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-danger/10 border border-danger/30 text-danger text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
              Título del Evento o Mesa *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Mesa de Examen Final - Práctica Profesionalizante"
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-surface-border rounded-xl bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
              Tipo de Evento *
            </label>
            <CustomSelect
              value={tipo}
              onChange={(val) => setTipo(typeof val === 'object' ? val.target.value : val)}
              options={[
                { value: 'TRIBUNAL_EXAMEN', label: 'Tribunal de Examen / Mesa Final', badge: 'Examen' },
                { value: 'REUNION', label: 'Reunión Docente / Departamental', badge: 'Reunión' },
                { value: 'PERIODO', label: 'Cierre de Período / Calificaciones', badge: 'Cierre' },
                { value: 'OTRO', label: 'Otro Evento', badge: 'General' }
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
                Fecha *
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-surface-border rounded-xl bg-surface text-text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
                Desde *
              </label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-surface-border rounded-xl bg-surface text-text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
                Hasta *
              </label>
              <input
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-surface-border rounded-xl bg-surface text-text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
              Notas adicionales / Vocales de la mesa
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              placeholder="Ej: Aula 14. Integrantes del tribunal: Prof. López, Prof. Díaz."
              className="w-full px-3 py-2 text-xs sm:text-sm border border-surface-border rounded-xl bg-surface text-text-primary resize-none focus:ring-2 focus:ring-primary/20 outline-none"
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

      {/* ========================================================
          MODAL: DETALLES DE EVENTO SELECCIONADO
         ======================================================== */}
      {selectedEventForDetail && (
        <Modal
          isOpen={Boolean(selectedEventForDetail)}
          onClose={() => setSelectedEventForDetail(null)}
          title={selectedEventForDetail.titulo}
          subtitle="Detalle del compromiso registrado en el calendario"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                {selectedEventForDetail.tipo}
              </span>
              <span className="text-xs text-text-muted font-mono">
                {formatFechaLegible(selectedEventForDetail.fecha_inicio || selectedEventForDetail.fecha)}
              </span>
            </div>

            {selectedEventForDetail.notas && (
              <div className="p-3.5 rounded-xl bg-surface-hover text-xs text-text-secondary leading-relaxed">
                {selectedEventForDetail.notas}
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-surface-border">
              {selectedEventForDetail.isPeriodo ? (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Hito de ciclo lectivo (gestionado en Períodos Académicos)
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleDeleteEvent(selectedEventForDetail.id)}
                  className="text-xs text-rose-600 hover:underline inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar del calendario</span>
                </button>
              )}

              <Button
                variant="secondary"
                onClick={() => setSelectedEventForDetail(null)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================
          MODAL: SINCRONIZACIÓN CON GOOGLE CALENDAR & .ICS
         ======================================================== */}
      <Modal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        title="Sincronizar Calendario Docente"
        subtitle="Exporta tus cátedras y exámenes hacia Google Calendar, Outlook o Apple Calendar"
      >
        <div className="space-y-4 text-xs sm:text-sm text-text-secondary">
          <p>
            Puedes descargar el archivo en formato universal <strong>iCalendar (.ics)</strong> para importarlo en tu celular o aplicación de calendario favorita.
          </p>

          <div className="p-3.5 rounded-2xl bg-surface-hover/60 border border-surface-border space-y-2">
            <span className="font-bold text-text-primary text-xs block">
              Pasos para Google Calendar:
            </span>
            <ol className="list-decimal list-inside space-y-1 text-xs text-text-muted">
              <li>Haz clic en "Descargar Archivo .ics".</li>
              <li>Abre Google Calendar en tu navegador.</li>
              <li>Ve a Configuración &gt; Importar y exportar &gt; Seleccionar archivo de tu equipo.</li>
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
    </div>
  );
}
