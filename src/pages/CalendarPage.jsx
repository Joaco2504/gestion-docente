import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  Building2, 
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
  Tag,
  MapPin,
  GraduationCap,
  Bell,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Bookmark,
  CalendarCheck,
  CheckSquare,
  Square,
  Edit3
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
import { generateIcsContent, downloadIcsFile } from '../lib/calendarSync';
import { formatFechaDMY, parseDMYtoYMD, formatFechaLegible, getRelativeDateLabel, getTodayYMD, getTodayDMY } from '../lib/dateUtils';
import { FERIADOS_ARGENTINA } from '../data/feriadosArgentina';
import { obtenerFeriado } from '../utils/feriadosAcademicos';

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const SHORT_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Horario 24 hs de 07:00 a 23:00 (17 franjas)
const HOURS_24 = Array.from({ length: 17 }, (_, i) => i + 7);
const HOUR_ROW_HEIGHT = 80; // px por hora

export default function CalendarPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isDemo } = useAuth();
  const { catedras, activeInstitucion, activeCiclo, periodosAcademicos } = useApp();

  // Sincronizar vista desde parámetro URL (?view=dia | semanal | mensual)
  const initialView = useMemo(() => {
    const v = new URLSearchParams(location.search).get('view');
    return v === 'dia' || v === 'mensual' || v === 'semanal' ? v : 'semanal';
  }, []);

  // Vistas: 'semanal' | 'mensual' | 'dia'
  const [viewMode, setViewMode] = useState(initialView);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Mapeo indexado de feriados para consultas O(1)
  const feriadosMap = useMemo(() => {
    const map = new Map();
    FERIADOS_ARGENTINA.forEach((f) => {
      map.set(f.fecha, f);
    });
    return map;
  }, []);

  // Sincronizar reactivamente si cambia location.search
  useEffect(() => {
    const v = new URLSearchParams(location.search).get('view');
    if (v && (v === 'dia' || v === 'semanal' || v === 'mensual')) {
      setViewMode(v);
    }
  }, [location.search]);

  // Datos
  const [events, setEvents] = useState([]);
  const [clases, setClases] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros reactivos de cátedras y categorías
  const [catFilters, setCatFilters] = useState({});
  const [categoryFilters, setCategoryFilters] = useState({
    CLASE: true,
    TRIBUNAL_EXAMEN: true,
    EVALUACION: true,
    TRABAJO_PRACTICO: true,
    PERIODO: true
  });

  // Mini-calendario fecha de navegación
  const [miniCalDate, setMiniCalDate] = useState(new Date());

  // Modales
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [selectedEventForDetail, setSelectedEventForDetail] = useState(null);

  // Formulario Nuevo Evento
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('CLASE');
  const [fecha, setFecha] = useState(getTodayYMD());
  const [horaInicio, setHoraInicio] = useState('18:30');
  const [horaFin, setHoraFin] = useState('20:30');
  const [aula, setAula] = useState('Aula 1');
  const [catedraId, setCatedraId] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sincronizar cátedras con filtros al cargar
  useEffect(() => {
    if (catedras && catedras.length > 0) {
      setCatFilters(prev => {
        const next = { ...prev };
        catedras.forEach(c => {
          if (next[c.id] === undefined) next[c.id] = true;
        });
        return next;
      });
      if (!catedraId && catedras[0]?.id) {
        setCatedraId(catedras[0].id);
      }
    }
  }, [catedras]);

  useEffect(() => {
    fetchAllCalendarData();
  }, [user, catedras, activeCiclo]);

  // Manejo de eventos en tiempo real de períodos
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

  useEffect(() => {
    if (periodosAcademicos && periodosAcademicos.length > 0) {
      setPeriodos(periodosAcademicos);
    }
  }, [periodosAcademicos]);

  const getDefaultPeriods = () => [
    { id: 'per-1', nombre: '1° Cuatrimestre', tipo: 'PRIMER_CUATRIMESTRE', fecha_inicio: '2026-03-09', fecha_fin: '2026-07-10' },
    { id: 'per-2', nombre: 'Receso Invernal', tipo: 'RECESO_INVERNAL', fecha_inicio: '2026-07-13', fecha_fin: '2026-07-24' },
    { id: 'per-3', nombre: '2° Cuatrimestre', tipo: 'SEGUNDO_CUATRIMESTRE', fecha_inicio: '2026-08-03', fecha_fin: '2026-11-20' }
  ];

  const fetchAllCalendarData = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && !isDemo && user) {
        // 1. Eventos registrados en Supabase
        const { data: evData } = await supabase
          .from('eventos_calendario')
          .select('*')
          .eq('docente_id', user.id)
          .order('fecha_inicio', { ascending: true });
        setEvents(evData || []);

        // 2. Clases registradas
        const catIds = (catedras || []).map(c => c.id);
        if (catIds.length > 0) {
          const { data: clsData } = await supabase
            .from('clases')
            .select('*')
            .in('catedra_id', catIds)
            .order('fecha', { ascending: true });
          setClases(clsData || []);
        } else {
          setClases([]);
        }

        // 3. Períodos del ciclo
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

  const loadDemoCalendarData = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayIso = `${y}-${m}-${d}`;

    const sampleEvents = [
      {
        id: 'ev-demo-1',
        titulo: 'Mesa de Examen Final - Turno Tarde',
        tipo: 'TRIBUNAL_EXAMEN',
        fecha_inicio: `${todayIso}T18:00:00`,
        fecha_fin: `${todayIso}T20:30:00`,
        aula: 'Aula Magna',
        institucion: 'I.E.S Belén',
        catedra_nombre: 'Estadística Aplicada',
        alumnos_count: 28,
        notas: 'Tribunal constituido por Prof. Pacheco y Prof. Gómez. Modalidad oral y escrita.',
        editable: true
      },
      {
        id: 'ev-demo-2',
        titulo: 'Evaluación Parcial 1: Control Estadístico',
        tipo: 'EVALUACION',
        fecha_inicio: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0] + 'T19:00:00',
        fecha_fin: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0] + 'T21:00:00',
        aula: 'Aula 4',
        institucion: 'I.E.S Belén',
        catedra_nombre: 'Estadística (2° año)',
        alumnos_count: 35,
        notas: 'Primer examen parcial integrador según pautas RAM.',
        editable: true
      },
      {
        id: 'ev-demo-3',
        titulo: 'Entrega de Trabajo Práctico N° 2',
        tipo: 'TRABAJO_PRACTICO',
        fecha_inicio: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0] + 'T20:00:00',
        fecha_fin: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0] + 'T21:30:00',
        aula: 'Lab 2',
        institucion: 'Colegio Belgrano',
        catedra_nombre: 'Higiene y Seguridad',
        alumnos_count: 24,
        notas: 'Presentación de informe de riesgos de planta y matrices ergonómicas.',
        editable: true
      }
    ];

    setEvents(sampleEvents);
    setPeriodos((periodosAcademicos && periodosAcademicos.length > 0) ? periodosAcademicos : getDefaultPeriods());
  };

  /**
   * Genera los eventos recurrentes de clases semanales para la semana seleccionada
   */
  const regularClassesList = useMemo(() => {
    const list = [];
    (catedras || []).forEach(cat => {
      // Filtrar si la cátedra está desmarcada
      if (catFilters[cat.id] === false) return;
      if (!categoryFilters.CLASE) return;

      const horarios = Array.isArray(cat.horarios_semanales) ? cat.horarios_semanales : [];
      horarios.forEach(h => {
        list.push({
          id: `class-recur-${cat.id}-${h.dia}`,
          catedra_id: cat.id,
          catedra_nombre: cat.nombre,
          titulo: cat.nombre,
          dia_semana: h.dia,
          desde: h.desde || '18:30',
          hasta: h.hasta || '20:30',
          aula: h.aula || 'Aula 1',
          institucion: cat.institucion_nombre || 'Sede Principal',
          tipo: 'CLASE',
          alumnos_count: cat.estudiantes_count || cat.total_estudiantes || 32,
          nivel: cat.nivel || 'TERCIARIO',
          modalidad: cat.modalidad || 'ANUAL',
          notas: `Cátedra regular de cursado. Régimen RAM ${cat.modalidad || 'Cuatrimestral'}.`,
          isClass: true,
          editable: false
        });
      });
    });
    return list;
  }, [catedras, catFilters, categoryFilters]);

  /**
   * Generación de eventos de períodos académicos
   */
  const periodoEvents = useMemo(() => {
    if (!categoryFilters.PERIODO) return [];
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
          id: `per-ini-${p.id || idx}`,
          titulo: `Inicio: ${pNombre}`,
          tipo: 'PERIODO',
          fecha_inicio: `${fInicio}T08:00:00`,
          fecha_fin: `${fInicio}T10:00:00`,
          fecha: fInicio,
          hora_inicio: '08:00',
          hora_fin: '10:00',
          aula: 'Institucional',
          institucion: 'Régimen Académico',
          notas: `Apertura oficial del período ${pNombre}.`,
          isPeriodo: true,
          editable: false
        });
      }
      if (fFin && fFin !== fInicio) {
        pEvents.push({
          id: `per-fin-${p.id || idx}`,
          titulo: `Cierre: ${pNombre}`,
          tipo: 'PERIODO',
          fecha_inicio: `${fFin}T18:00:00`,
          fecha_fin: `${fFin}T20:00:00`,
          fecha: fFin,
          hora_inicio: '18:00',
          hora_fin: '20:00',
          aula: 'Institucional',
          institucion: 'Régimen Académico',
          notas: `Cierre de actas y regularidades de ${pNombre}.`,
          isPeriodo: true,
          editable: false
        });
      }
    });
    return pEvents;
  }, [periodos, categoryFilters]);

  /**
   * Colección unificada de eventos filtrados
   */
  const allFilteredEvents = useMemo(() => {
    const customEvents = events.filter(e => {
      if (categoryFilters[e.tipo] === false) return false;
      if (e.catedra_id && catFilters[e.catedra_id] === false) return false;
      return true;
    });
    return [...customEvents, ...periodoEvents];
  }, [events, periodoEvents, categoryFilters, catFilters]);

  /**
   * Cálculo de fechas de la semana actual (Lunes a Domingo)
   */
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay(); // 0 = Domingo, 1 = Lunes, etc.
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar a Lunes
    const monday = new Date(d.setDate(diff));

    return Array.from({ length: 7 }, (_, i) => {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      return dayDate;
    });
  }, [currentDate]);

  /**
   * Próximo compromiso destacado para el Widget Bento
   */
  const nextUpcomingItem = useMemo(() => {
    const now = new Date();
    const candidates = [];

    // Revisar eventos fijados
    allFilteredEvents.forEach(ev => {
      const evDate = new Date(ev.fecha_inicio || ev.fecha);
      if (evDate >= now) {
        candidates.push({
          id: ev.id,
          titulo: ev.titulo,
          tipo: ev.tipo,
          date: evDate,
          hora_inicio: ev.fecha_inicio ? ev.fecha_inicio.substring(11, 16) : (ev.hora_inicio || '19:00'),
          hora_fin: ev.fecha_fin ? ev.fecha_fin.substring(11, 16) : (ev.hora_fin || '21:05'),
          aula: ev.aula || 'Aula 1',
          institucion: ev.institucion || 'I.E.S Belén',
          catedra_id: ev.catedra_id,
          isClass: false
        });
      }
    });

    // Revisar clases recurrentes de la semana
    const daysMap = { 'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6 };
    regularClassesList.forEach(cls => {
      const targetDay = daysMap[cls.dia_semana];
      if (targetDay !== undefined) {
        const diff = (targetDay - now.getDay() + 7) % 7;
        const clsDate = new Date();
        clsDate.setDate(now.getDate() + diff);
        const [hh, mm] = (cls.desde || '19:00').split(':');
        clsDate.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);

        if (clsDate >= now) {
          candidates.push({
            id: cls.id,
            titulo: cls.catedra_nombre,
            tipo: 'CLASE',
            date: clsDate,
            hora_inicio: cls.desde || '19:00',
            hora_fin: cls.hasta || '21:05',
            aula: cls.aula || 'Aula 1',
            institucion: cls.institucion || 'I.E.S Belén',
            catedra_id: cls.catedra_id,
            isClass: true
          });
        }
      }
    });

    candidates.sort((a, b) => a.date - b.date);
    return candidates[0] || null;
  }, [allFilteredEvents, regularClassesList]);

  // Mini Calendario Días
  const miniCalDays = useMemo(() => {
    const year = miniCalDate.getFullYear();
    const month = miniCalDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const offset = (firstDayIndex + 6) % 7; // Lunes = 0

    const days = [];
    for (let i = 0; i < offset; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(new Date(year, month, d));
    return days;
  }, [miniCalDate]);

  // Calendario Mensual Días
  const mainCalMonthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const offset = (firstDayIndex + 6) % 7;

    const days = [];
    for (let i = 0; i < offset; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(new Date(year, month, d));
    return days;
  }, [currentDate]);

  /**
   * Tokens de Color por Categoría Académica
   */
  const getEventStyle = (tipo) => {
    switch (tipo) {
      case 'CLASE':
        return {
          card: 'bg-emerald-50/90 text-emerald-950 border-l-4 border-emerald-500 border-slate-200/80 dark:bg-emerald-950/30 dark:text-emerald-100 dark:border-l-4 dark:border-emerald-500 dark:border-emerald-800/40',
          badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-500',
          tag: 'Clase Regular'
        };
      case 'TRIBUNAL_EXAMEN':
        return {
          card: 'bg-amber-50/90 text-amber-950 border-l-4 border-amber-500 border-slate-200/80 dark:bg-amber-950/30 dark:text-amber-100 dark:border-l-4 dark:border-amber-500 dark:border-amber-800/40',
          badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
          dot: 'bg-amber-500',
          tag: 'Mesa de Examen'
        };
      case 'EVALUACION':
        return {
          card: 'bg-blue-50/90 text-blue-950 border-l-4 border-blue-500 border-slate-200/80 dark:bg-blue-950/30 dark:text-blue-100 dark:border-l-4 dark:border-blue-500 dark:border-blue-800/40',
          badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
          dot: 'bg-blue-500',
          tag: 'Evaluación / Parcial'
        };
      case 'TRABAJO_PRACTICO':
      case 'REUNION':
      default:
        return {
          card: 'bg-violet-50/90 text-violet-950 border-l-4 border-violet-500 border-slate-200/80 dark:bg-violet-950/30 dark:text-violet-100 dark:border-l-4 dark:border-violet-500 dark:border-violet-800/40',
          badge: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
          dot: 'bg-violet-500',
          tag: 'Entrega TP / Reunión'
        };
    }
  };

  /**
   * Navegación de Fecha
   */
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'dia') d.setDate(d.getDate() - 1);
    else if (viewMode === 'semanal') d.setDate(d.getDate() - 7);
    else if (viewMode === 'mensual') d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'dia') d.setDate(d.getDate() + 1);
    else if (viewMode === 'semanal') d.setDate(d.getDate() + 7);
    else if (viewMode === 'mensual') d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setMiniCalDate(now);
  };

  // Crear Nuevo Evento
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    setSaving(true);
    setErrorMsg('');

    try {
      const selectedCat = (catedras || []).find(c => c.id === catedraId);
      const startIso = `${fecha}T${horaInicio}:00`;
      const endIso = `${fecha}T${horaFin}:00`;

      if (isSupabaseConfigured && !isDemo && user) {
        const { data, error } = await supabase
          .from('eventos_calendario')
          .insert({
            docente_id: user.id,
            catedra_id: catedraId || null,
            titulo: titulo.trim(),
            tipo,
            fecha_inicio: startIso,
            fecha_fin: endIso,
            aula: aula.trim() || 'Aula 1',
            institucion: selectedCat?.institucion_nombre || 'Sede Principal',
            notas: notas.trim() || null
          })
          .select()
          .single();

        if (error) throw error;
        setEvents(prev => [...prev, { ...data, catedra_nombre: selectedCat?.nombre, alumnos_count: selectedCat?.estudiantes_count || 30 }]);
        toast.success(`Compromiso "${titulo}" registrado`);
      } else {
        const newEv = {
          id: 'ev-' + Date.now(),
          titulo: titulo.trim(),
          tipo,
          fecha_inicio: startIso,
          fecha_fin: endIso,
          aula: aula.trim() || 'Aula 1',
          institucion: selectedCat?.institucion_nombre || 'I.E.S Belén',
          catedra_id: catedraId,
          catedra_nombre: selectedCat?.nombre || 'Cátedra Institucional',
          alumnos_count: selectedCat?.estudiantes_count || 32,
          notas: notas.trim() || null,
          editable: true
        };
        setEvents(prev => [...prev, newEv]);
        toast.success(`Compromiso "${titulo}" creado con éxito`);
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

  // Eliminar Evento
  const handleDeleteEvent = async (eventId) => {
    if (!confirm('¿Deseas eliminar este compromiso del calendario?')) return;
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
      toast.success('Compromiso eliminado correctamente');
    } catch (err) {
      handleAppError(err, 'CalendarPage / Eliminar Evento', user);
    }
  };

  // Exportar .ics
  const handleDownloadIcs = () => {
    try {
      const ics = generateIcsContent(allFilteredEvents, catedras);
      downloadIcsFile(ics, `calendario_korum_${new Date().getFullYear()}.ics`);
      toast.success('Archivo .ics descargado con éxito');
      setIsSyncModalOpen(false);
    } catch (err) {
      handleAppError(err, 'CalendarPage / Generar Archivo ICS', user);
    }
  };

  // Formato del rango de cabecera
  const formattedHeaderRange = useMemo(() => {
    if (viewMode === 'dia') {
      return formatFechaLegible(currentDate);
    }
    if (viewMode === 'mensual') {
      return `${MONTH_NAMES[currentDate.getMonth()]}, ${currentDate.getFullYear()}`;
    }
    // Semanal: lunes a domingo
    const mon = weekDays[0];
    const sun = weekDays[6];
    return `${mon.getDate()} de ${MONTH_NAMES[mon.getMonth()]} - ${sun.getDate()} de ${MONTH_NAMES[sun.getMonth()]}, ${sun.getFullYear()}`;
  }, [viewMode, currentDate, weekDays]);

  // Indicador de hora actual en tiempo real para la matriz semanal
  const currentTimeIndicator = useMemo(() => {
    const now = new Date();
    const ch = now.getHours();
    const cm = now.getMinutes();
    if (ch < 7 || ch > 23) return null;
    const top = ((ch - 7) + cm / 60) * HOUR_ROW_HEIGHT;
    const todayIndex = (now.getDay() + 6) % 7; // Lunes = 0
    return { top, todayIndex };
  }, []);

  const docenteNombre = user?.user_metadata?.nombre_completo || 'Prof. Pacheco E. Joaquín';

  return (
    <div className="w-full max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-6 min-h-[calc(100vh-5rem)] font-sans antialiased text-slate-800 dark:text-slate-100">
      
      {/* ========================================================
          COLUMNA LATERAL IZQUIERDA: PANEL DE CONTROL Y CONTEXTO
          (lg:col-span-4 xl:col-span-3)
         ======================================================== */}
      <aside className="lg:col-span-4 xl:col-span-3 flex flex-col gap-5">
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm dark:shadow-xl flex flex-col gap-5 transition-colors">
          
          {/* 1. CABECERA DEL DOCENTE */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl ring-2 ring-emerald-500/40 p-0.5 bg-emerald-500/10 flex items-center justify-center font-bold text-emerald-600 dark:text-emerald-400 text-sm shrink-0 shadow-xs">
                {docenteNombre.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('')}
              </div>
              <div className="truncate">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate leading-tight">
                  {docenteNombre}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Docente Titular
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToday}
              className="relative p-2 rounded-xl border border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer shrink-0"
              title="Ir a fecha actual"
            >
              <Bell className="w-4 h-4" />
              {nextUpcomingItem && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
          </div>

          {/* 2. MINI-CALENDARIO MENSUAL INTERACTIVO */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold font-mono tracking-tight text-slate-800 dark:text-slate-200">
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
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Mes anterior"
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
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Mes siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono text-slate-400 font-bold">
              {SHORT_DAYS.map((sd, i) => (
                <span key={i}>{sd}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {miniCalDays.map((d, i) => {
                if (!d) return <div key={`empty-min-${i}`} className="h-7 w-7" />;
                const isSelected = d.toDateString() === currentDate.toDateString();
                const isToday = d.toDateString() === new Date().toDateString();
                const dStr = d.toISOString().split('T')[0];
                const hasEvent = allFilteredEvents.some(e => (e.fecha_inicio || e.fecha || '').startsWith(dStr));

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setCurrentDate(d);
                    }}
                    className={`
                      h-7 w-7 mx-auto rounded-lg text-xs font-mono font-medium transition-all flex flex-col items-center justify-center relative cursor-pointer
                      ${isToday 
                        ? 'bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/20' 
                        : isSelected 
                          ? 'border border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-bold' 
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }
                    `}
                  >
                    <span>{d.getDate()}</span>
                    {hasEvent && !isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 -mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. WIDGET DE PRÓXIMO COMPROMISO DESTACADO (BENTO) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Próximo Compromiso</span>
              </span>
              {nextUpcomingItem && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  {getRelativeDateLabel(nextUpcomingItem.date.toISOString().split('T')[0])}
                </span>
              )}
            </div>

            {nextUpcomingItem ? (
              <div className="space-y-2">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                  {nextUpcomingItem.titulo}
                </h4>
                
                <div className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {nextUpcomingItem.hora_inicio} - {nextUpcomingItem.hora_fin} hs · {nextUpcomingItem.aula}
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  📍 {nextUpcomingItem.institucion}
                </div>

                {(() => {
                  const nextItemDateStr = nextUpcomingItem.date ? nextUpcomingItem.date.toISOString().split('T')[0] : null;
                  const nextItemFeriado = nextItemDateStr ? (feriadosMap.get(nextItemDateStr) || obtenerFeriado(nextItemDateStr)) : null;

                  return (
                    <div className="flex items-center gap-2 pt-1">
                      {nextItemFeriado ? (
                        <button
                          type="button"
                          disabled
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold opacity-75 cursor-not-allowed border border-slate-300 dark:border-slate-700"
                          title={`Sin clases presenciales: ${nextItemFeriado.nombre}`}
                        >
                          <span>🔒 Sin Clases (Feriado)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (nextUpcomingItem.catedra_id) {
                              navigate(`/catedra/${nextUpcomingItem.catedra_id}?tab=asistencias`);
                            } else {
                              navigate('/asistencia');
                            }
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                        >
                          <span>Iniciar Asistencia</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (nextUpcomingItem.catedra_id) {
                            navigate(`/catedra/${nextUpcomingItem.catedra_id}?tab=unidades`);
                          } else {
                            navigate('/libro-temas');
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
                        title="Ver Planificación y Temas"
                      >
                        Planificación
                      </button>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No tienes compromisos inminentes programados.
              </p>
            )}
          </div>

          {/* 4. MIS CÁTEDRAS / FILTROS ACTIVOS (STYLE RADIX/IOS) */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Mis Cátedras & Filtros
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {(catedras || []).length} activas
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Cátedras individuales */}
              {(catedras || []).map(cat => {
                const checked = catFilters[cat.id] !== false;
                return (
                  <div
                    key={cat.id}
                    onClick={() => setCatFilters(prev => ({ ...prev, [cat.id]: !checked }))}
                    className="flex items-center justify-between p-2 rounded-xl border border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      {checked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {cat.nombre}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                      {cat.estudiantes_count || cat.total_estudiantes || 32} al.
                    </span>
                  </div>
                );
              })}

              {/* Categorías adicionales */}
              <div
                onClick={() => setCategoryFilters(prev => ({ ...prev, TRIBUNAL_EXAMEN: !prev.TRIBUNAL_EXAMEN }))}
                className="flex items-center justify-between p-2 rounded-xl border border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  {categoryFilters.TRIBUNAL_EXAMEN ? (
                    <CheckSquare className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Mesas de Examen</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Exámenes
                </span>
              </div>

              <div
                onClick={() => setCategoryFilters(prev => ({ ...prev, EVALUACION: !prev.EVALUACION }))}
                className="flex items-center justify-between p-2 rounded-xl border border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  {categoryFilters.EVALUACION ? (
                    <CheckSquare className="w-4 h-4 text-blue-500 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Evaluaciones / Parciales</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Parciales
                </span>
              </div>

              <div
                onClick={() => setCategoryFilters(prev => ({ ...prev, TRABAJO_PRACTICO: !prev.TRABAJO_PRACTICO }))}
                className="flex items-center justify-between p-2 rounded-xl border border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  {categoryFilters.TRABAJO_PRACTICO ? (
                    <CheckSquare className="w-4 h-4 text-violet-500 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Entregas de Trabajos Prácticos</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                  TPs
                </span>
              </div>
            </div>
          </div>

          {/* 5. PROGRESO DE CURSADA Y CUMPLIMIENTO */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Progreso de Cursada y Cumplimiento
            </span>

            <div className="space-y-3">
              {/* Clases Dictadas */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-700 dark:text-slate-300">Clases Dictadas del Cuatrimestre</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">75%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[75%]" />
                </div>
              </div>

              {/* Carga de Calificaciones */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-700 dark:text-slate-300">Carga de Calificaciones</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">90%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full w-[90%]" />
                </div>
              </div>

              {/* Porcentaje Asistencia RAM */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-700 dark:text-slate-300">Promedio Asistencia RAM</span>
                  <span className="font-mono font-bold text-teal-600 dark:text-teal-400">82%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full w-[82%]" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </aside>

      {/* ========================================================
          COLUMNA PRINCIPAL DERECHA: AGENDA Y MATRIZ SEMANAL
          (lg:col-span-8 xl:col-span-9)
         ======================================================== */}
      <main className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm dark:shadow-xl flex flex-col gap-6 transition-colors">
          
          {/* 1. CABECERA TEMPORAL SUPERIOR */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
            {/* Lado izquierdo: Mes y Año actual */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {formattedHeaderRange}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Agenda oficial del docente y sincronización horaria 24 hs
              </p>
            </div>

            {/* Centro: Selector de vista en pastilla segmentada (Pill Switcher) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              {[
                { id: 'mensual', label: 'Mes' },
                { id: 'semanal', label: 'Semana' },
                { id: 'dia', label: 'Día' }
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setViewMode(v.id)}
                  className={`
                    px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer
                    ${viewMode === v.id
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }
                  `}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {/* Lado derecho: Navegación y Acciones Rápidas */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsSyncModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                title="Exportar a Google Calendar / iCal"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">.ics</span>
              </button>

              <button
                type="button"
                onClick={() => setIsNewEventModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 hover:shadow-emerald-600/35 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Compromiso</span>
              </button>
            </div>
          </div>

          {/* 2. VISTA DINÁMICA: SEMANA / MES / DÍA */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${viewMode}-${currentDate.toISOString().slice(0, 10)}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-full overflow-hidden"
            >

              {/* ========================================================
                  VISTA SEMANAL: FRANJA DE DÍAS Y MATRIZ 24 HS
                 ======================================================== */}
              {viewMode === 'semanal' && (
                <div className="w-full overflow-x-auto select-none">
                  <div className="min-w-[780px]">
                    
                    {/* FRANJA DE DÍAS DE LA SEMANA */}
                    <div className="grid grid-cols-8 gap-2 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                      {/* Espacio para la columna de horas */}
                      <div className="w-16 text-right pr-3 font-mono text-xs text-slate-400 self-end pb-2">
                        GMT-3
                      </div>

                      {/* 7 Columnas de días */}
                      {weekDays.map((d, idx) => {
                        const dayName = DAYS_OF_WEEK[idx];
                        const isToday = d.toDateString() === new Date().toDateString();
                        const dayStr = d.toISOString().split('T')[0];
                        const feriado = feriadosMap.get(dayStr);

                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              setCurrentDate(d);
                              setViewMode('dia');
                            }}
                            className={`
                              flex flex-col items-center justify-center p-2 rounded-2xl cursor-pointer transition-all text-center
                              ${isToday
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 scale-105'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400'
                              }
                            `}
                          >
                            <span className="text-xs uppercase tracking-wider font-semibold">
                              {dayName.slice(0, 3)}
                            </span>
                            <span className={`text-xl font-bold font-mono ${isToday ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                              {d.getDate()}
                            </span>
                            {feriado && (
                              <span 
                                className="mt-1 bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 text-[9px] font-mono px-1 py-0.5 rounded truncate max-w-[84px] block"
                                title={`${feriado.nombre} (${feriado.tipo === 'provincial' ? 'Feriado Provincial Catamarca' : 'Feriado Nacional'})`}
                              >
                                {feriado.nombre}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* MATRIZ HORARIA 24 HORAS */}
                    <div className="relative mt-2">
                      {/* Línea horizontal en tiempo real con punto pulsante */}
                      {currentTimeIndicator && (
                        <div
                          style={{ top: `${currentTimeIndicator.top}px` }}
                          className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/30 animate-pulse -ml-1" />
                          <div className="w-full h-0.5 bg-emerald-500 shadow-sm" />
                        </div>
                      )}

                      {/* Filas de horas (07:00 a 23:00 hs) */}
                      {HOURS_24.map((hour) => {
                        const hourStr = `${String(hour).padStart(2, '0')}:00 hs`;
                        return (
                          <div
                            key={hour}
                            style={{ height: `${HOUR_ROW_HEIGHT}px` }}
                            className="grid grid-cols-8 gap-2 border-b border-slate-100 dark:border-slate-800/60 relative"
                          >
                            {/* Eje de Horas */}
                            <div className="w-16 font-mono text-xs text-slate-400 dark:text-slate-500 text-right pr-3 -mt-2.5">
                              {hourStr}
                            </div>

                            {/* 7 Celdas de tiempo correspondientes a cada día */}
                            {Array.from({ length: 7 }).map((_, dayIdx) => (
                              <div
                                key={dayIdx}
                                className="border-l border-slate-100/80 dark:border-slate-800/40 h-full relative group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                                onClick={() => {
                                  const targetDate = weekDays[dayIdx];
                                  setFecha(targetDate.toISOString().split('T')[0]);
                                  setHoraInicio(`${String(hour).padStart(2, '0')}:00`);
                                  setHoraFin(`${String(hour + 2).padStart(2, '0')}:00`);
                                  setIsNewEventModalOpen(true);
                                }}
                              />
                            ))}
                          </div>
                        );
                      })}

                      {/* EVENTOS ACADÉMICOS POSICIONADOS EN LA MATRIZ */}
                      {weekDays.map((dayDate, dayIdx) => {
                        const dayName = DAYS_OF_WEEK[dayIdx];
                        const dayStr = dayDate.toISOString().split('T')[0];

                        // Clases regulares correspondientes a este día
                        const dayRegularClasses = regularClassesList.filter(c => c.dia_semana === dayName);

                        // Eventos fijados de este día
                        const dayCustomEvents = allFilteredEvents.filter(e => {
                          const evDate = (e.fecha_inicio || e.fecha || '').split('T')[0];
                          return evDate === dayStr;
                        });

                        const dayAllItems = [
                          ...dayRegularClasses.map(c => ({
                            ...c,
                            hora_inicio: c.desde,
                            hora_fin: c.hasta
                          })),
                          ...dayCustomEvents.map(e => ({
                            ...e,
                            hora_inicio: e.fecha_inicio ? e.fecha_inicio.substring(11, 16) : (e.hora_inicio || '18:00'),
                            hora_fin: e.fecha_fin ? e.fecha_fin.substring(11, 16) : (e.hora_fin || '20:00')
                          }))
                        ];

                        return (
                          <React.Fragment key={`events-col-${dayIdx}`}>
                            {dayAllItems.map((item, itemIdx) => {
                              const [sh, sm] = (item.hora_inicio || '18:00').split(':').map(Number);
                              const [eh, em] = (item.hora_fin || '20:00').split(':').map(Number);
                              
                              const startMinTotal = (isNaN(sh) ? 18 : sh) * 60 + (isNaN(sm) ? 0 : sm);
                              const endMinTotal = (isNaN(eh) ? 20 : eh) * 60 + (isNaN(em) ? 0 : em);
                              const baseMinTotal = 7 * 60; // 07:00 hs base

                              const top = Math.max(0, ((startMinTotal - baseMinTotal) / 60) * HOUR_ROW_HEIGHT);
                              const durationHours = Math.max(1, (endMinTotal - startMinTotal) / 60);
                              const height = Math.max(56, durationHours * HOUR_ROW_HEIGHT - 6);

                              const styles = getEventStyle(item.tipo);

                              // Cálculo de columna en grid de 8 (col 1 es hora, cols 2-8 son días)
                              const colLeftPercent = (dayIdx + 1) * (100 / 8);
                              const colWidthPercent = 100 / 8;

                              return (
                                <div
                                  key={item.id || `ev-${dayIdx}-${itemIdx}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEventForDetail(item);
                                  }}
                                  style={{
                                    top: `${top}px`,
                                    left: `calc(${colLeftPercent}% + 4px)`,
                                    width: `calc(${colWidthPercent}% - 8px)`,
                                    height: `${height}px`
                                  }}
                                  className={`
                                    absolute z-20 rounded-xl p-2.5 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md cursor-pointer overflow-hidden flex flex-col justify-between
                                    ${styles.card}
                                  `}
                                >
                                  {/* Línea 1: Título de la materia o examen */}
                                  <div>
                                    <div className="flex items-center justify-between gap-1">
                                      <h4 className="font-bold text-xs sm:text-sm truncate leading-tight">
                                        {item.titulo}
                                      </h4>
                                    </div>

                                    {/* Línea 2: Horario en formato 24 hs */}
                                    <div className="font-mono text-[11px] opacity-85 mt-0.5 font-semibold">
                                      {item.hora_inicio} - {item.hora_fin} hs
                                    </div>
                                  </div>

                                  {/* Línea 3: Micro-chips informativos */}
                                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono mt-1 pt-1 border-t border-black/5 dark:border-white/10">
                                    <span className="truncate">📍 {item.aula || 'Aula 1'}</span>
                                    {item.alumnos_count && (
                                      <span>👥 {item.alumnos_count}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </div>

                  </div>
                </div>
              )}

              {/* ========================================================
                  VISTA MENSUAL: CUADRÍCULA BENTO COMPLETA
                 ======================================================== */}
              {viewMode === 'mensual' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-7 gap-1 text-center text-xs font-mono font-bold text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                    {DAYS_OF_WEEK.map((d, i) => (
                      <span key={i}>{d}</span>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {mainCalMonthDays.map((d, idx) => {
                      if (!d) return <div key={`empty-m-${idx}`} className="min-h-[88px] bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl" />;

                      const dStr = d.toISOString().split('T')[0];
                      const isToday = d.toDateString() === new Date().toDateString();
                      const isSelected = d.toDateString() === currentDate.toDateString();
                      const feriado = feriadosMap.get(dStr);

                      const dayEvents = allFilteredEvents.filter(e => {
                        const evDate = (e.fecha_inicio || e.fecha || '').split('T')[0];
                        return evDate === dStr;
                      });

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setCurrentDate(d);
                            setViewMode('dia');
                          }}
                          className={`
                            min-h-[88px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between
                            ${isToday 
                              ? 'border-2 border-emerald-500 bg-emerald-500/5' 
                              : isSelected
                                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                                : 'border-slate-200/70 dark:border-slate-800/80 hover:border-emerald-400/50 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`font-mono font-bold text-xs ${isToday ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-800 dark:text-slate-200'}`}>
                              {d.getDate()}
                            </span>
                            {dayEvents.length > 0 && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            )}
                          </div>

                          {feriado && (
                            <span 
                              className="bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 text-[10px] font-mono px-1.5 py-0.5 rounded truncate block mt-0.5"
                              title={`${feriado.nombre} (${feriado.tipo === 'provincial' ? 'Feriado Provincial Catamarca' : 'Feriado Nacional'})`}
                            >
                              {feriado.nombre}
                            </span>
                          )}

                          <div className="space-y-1 overflow-hidden mt-1">
                            {dayEvents.slice(0, 2).map((ev) => {
                              const st = getEventStyle(ev.tipo);
                              return (
                                <div
                                  key={ev.id}
                                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded truncate ${st.card}`}
                                  title={ev.titulo}
                                >
                                  {ev.titulo}
                                </div>
                              );
                            })}
                            {dayEvents.length > 2 && (
                              <span className="text-[9px] font-mono text-slate-400 block text-right">
                                +{dayEvents.length - 2} más
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ========================================================
                  VISTA DÍA: TIMELINE EN DETALLE 24 HS
                 ======================================================== */}
              {viewMode === 'dia' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        Agenda del {formatFechaLegible(currentDate)}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Horarios de ingreso, dictado y cierre en orden cronológico
                      </p>
                      {(() => {
                        const diaStr = currentDate.toISOString().split('T')[0];
                        const feriadoDia = feriadosMap.get(diaStr) || obtenerFeriado(diaStr);
                        if (!feriadoDia) return null;
                        const esProv = (feriadoDia.tipo || '').toLowerCase() === 'provincial';
                        return (
                          <div className="mt-2 inline-flex items-center gap-2 bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/25 text-xs px-3 py-1.5 rounded-xl shadow-2xs">
                            <span className="text-sm">{esProv ? '🏛️' : '🇦🇷'}</span>
                            <span className="font-bold">{feriadoDia.nombre}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold">
                              {esProv ? 'Feriado Provincial Catamarca' : 'Feriado Nacional'} • No computable
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setFecha(currentDate.toISOString().split('T')[0]);
                        setIsNewEventModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar a esta jornada</span>
                    </button>
                  </div>

                  {/* Lista cronológica del día */}
                  <div className="space-y-3">
                    {(() => {
                      const currIso = currentDate.toISOString().split('T')[0];
                      const currDayName = DAYS_OF_WEEK[(currentDate.getDay() + 6) % 7];

                      const dayClasses = regularClassesList
                        .filter(c => c.dia_semana === currDayName)
                        .map(c => ({
                          ...c,
                          hora_inicio: c.desde,
                          hora_fin: c.hasta
                        }));

                      const dayEvents = allFilteredEvents
                        .filter(e => (e.fecha_inicio || e.fecha || '').startsWith(currIso))
                        .map(e => ({
                          ...e,
                          hora_inicio: e.fecha_inicio ? e.fecha_inicio.substring(11, 16) : (e.hora_inicio || '18:00'),
                          hora_fin: e.fecha_fin ? e.fecha_fin.substring(11, 16) : (e.hora_fin || '20:00')
                        }));

                      const allItems = [...dayClasses, ...dayEvents].sort((a, b) => 
                        (a.hora_inicio || '').localeCompare(b.hora_inicio || '')
                      );

                      if (allItems.length === 0) {
                        return (
                          <div className="text-center py-12 text-slate-400 text-xs italic">
                            No hay clases ni exámenes asignados para esta fecha.
                          </div>
                        );
                      }

                      return allItems.map(item => {
                        const styles = getEventStyle(item.tipo);
                        return (
                          <div
                            key={item.id}
                            onClick={() => setSelectedEventForDetail(item)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${styles.card}`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${styles.badge}`}>
                                  {styles.tag}
                                </span>
                                <span className="font-mono font-bold text-xs">
                                  {item.hora_inicio} - {item.hora_fin} hs
                                </span>
                              </div>
                              <h4 className="text-sm font-bold">
                                {item.titulo}
                              </h4>
                              <div className="flex items-center gap-2 text-xs opacity-80 font-mono">
                                <span>📍 {item.aula}</span>
                                <span>•</span>
                                <span>{item.institucion}</span>
                                {item.alumnos_count && (
                                  <>
                                    <span>•</span>
                                    <span>👥 {item.alumnos_count} inscriptos</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {(() => {
                                const diaStr = currentDate.toISOString().split('T')[0];
                                const feriadoDia = feriadosMap.get(diaStr) || obtenerFeriado(diaStr);

                                if (feriadoDia) {
                                  return (
                                    <button
                                      type="button"
                                      disabled
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold opacity-75 cursor-not-allowed border border-slate-300 dark:border-slate-700"
                                      title={`Sin clases presenciales: ${feriadoDia.nombre}`}
                                    >
                                      <span>🔒 Sin Clases (Feriado)</span>
                                    </button>
                                  );
                                }

                                return (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (item.catedra_id) {
                                        navigate(`/catedra/${item.catedra_id}?tab=asistencias`);
                                      } else {
                                        navigate('/asistencia');
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer"
                                  >
                                    <span>Asistencia</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

        </div>
      </main>

      {/* ========================================================
          PARTE 5: TARJETA FLOTANTE / MODAL DE DETALLE DE COMPROMISO
          (bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-2xl)
         ======================================================== */}
      {selectedEventForDetail && (
        <Modal
          isOpen={Boolean(selectedEventForDetail)}
          onClose={() => setSelectedEventForDetail(null)}
          title="Detalle del Compromiso Académico"
          subtitle="Información institucional y seguimiento pedagógico Korum"
        >
          <div className="space-y-4 text-slate-800 dark:text-slate-100">
            {/* Título editable con cursor activo */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Materia / Compromiso
              </label>
              <input
                type="text"
                value={selectedEventForDetail.titulo}
                readOnly={!selectedEventForDetail.editable}
                onChange={(e) => setSelectedEventForDetail(prev => ({ ...prev, titulo: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Fecha y Horarios en formato 24 hs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Fecha
                </label>
                <input
                  type="text"
                  value={selectedEventForDetail.fecha ? formatFechaDMY(selectedEventForDetail.fecha) : getTodayDMY()}
                  readOnly
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Hora Entrada
                </label>
                <input
                  type="text"
                  value={`${selectedEventForDetail.hora_inicio || '18:30'} hs`}
                  readOnly
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Hora Salida
                </label>
                <input
                  type="text"
                  value={`${selectedEventForDetail.hora_fin || '20:30'} hs`}
                  readOnly
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400"
                />
              </div>
            </div>

            {/* Aula e Institución */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Aula Asignada
                </label>
                <div className="flex items-center gap-2 px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-semibold truncate">{selectedEventForDetail.aula || 'Aula 1'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Institución
                </label>
                <div className="flex items-center gap-2 px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <Building2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-semibold truncate">{selectedEventForDetail.institucion || 'Sede Principal'}</span>
                </div>
              </div>
            </div>

            {/* Etiquetas de Cátedra */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                Régimen y Marco Académico
              </label>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold">
                  📚 {selectedEventForDetail.nivel || 'Terciario'}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 font-semibold">
                  ⏳ 2° Cuatrimestre
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold">
                  🛡️ Regularidad RAM
                </span>
              </div>
            </div>

            {/* Notas / Tema a dictar */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Observaciones / Tema del Libro de Aula
              </label>
              <textarea
                rows={3}
                value={selectedEventForDetail.notas || ''}
                readOnly={!selectedEventForDetail.editable}
                onChange={(e) => setSelectedEventForDetail(prev => ({ ...prev, notas: e.target.value }))}
                placeholder="Tema planificado o temas abordados..."
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 resize-none focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Botones de Pie */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              {selectedEventForDetail.editable ? (
                <button
                  type="button"
                  onClick={() => handleDeleteEvent(selectedEventForDetail.id)}
                  className="text-xs text-rose-500 hover:text-rose-600 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar Evento</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {(() => {
                  const eventDateStr = selectedEventForDetail.fecha || 
                    (selectedEventForDetail.fecha_inicio ? selectedEventForDetail.fecha_inicio.substring(0, 10) : null) || 
                    (selectedEventForDetail.date ? selectedEventForDetail.date.toISOString().split('T')[0] : null);
                  const eventFeriado = eventDateStr ? (feriadosMap.get(eventDateStr) || obtenerFeriado(eventDateStr)) : null;

                  if (eventFeriado) {
                    return (
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold opacity-75 cursor-not-allowed border border-slate-300 dark:border-slate-700"
                        title={`Jornada no laborable oficial: ${eventFeriado.nombre}`}
                      >
                        <span>🔒 Sin Clases (Feriado)</span>
                      </button>
                    );
                  }

                  return (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedEventForDetail.catedra_id) {
                          navigate(`/catedra/${selectedEventForDetail.catedra_id}?tab=asistencias`);
                        } else {
                          navigate('/asistencia');
                        }
                        setSelectedEventForDetail(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                    >
                      <span>⚡ Iniciar Registro de Asistencia</span>
                    </button>
                  );
                })()}

                <Button
                  variant="secondary"
                  onClick={() => setSelectedEventForDetail(null)}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================
          MODAL: CREAR COMPROMISO / EVENTO
         ======================================================== */}
      <Modal
        isOpen={isNewEventModalOpen}
        onClose={() => setIsNewEventModalOpen(false)}
        title="Agregar Compromiso Académico"
        subtitle="Mesa de examen, parcial, entrega de trabajo práctico o reunión"
      >
        <form onSubmit={handleCreateEvent} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
              Título del Compromiso o Materia *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Clase Magistral: Control Estadístico de Procesos"
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Tipo de Compromiso *
              </label>
              <CustomSelect
                value={tipo}
                onChange={(val) => setTipo(typeof val === 'object' ? val.target.value : val)}
                options={[
                  { value: 'CLASE', label: 'Clase Regular de Cátedra', badge: 'Clase' },
                  { value: 'TRIBUNAL_EXAMEN', label: 'Mesa de Examen Final', badge: 'Mesa' },
                  { value: 'EVALUACION', label: 'Evaluación / Examen Parcial', badge: 'Parcial' },
                  { value: 'TRABAJO_PRACTICO', label: 'Entrega de Trabajo Práctico', badge: 'TP' },
                  { value: 'REUNION', label: 'Reunión Docente / Institucional', badge: 'Reunión' }
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Vincular Cátedra
              </label>
              <CustomSelect
                value={catedraId}
                onChange={(val) => setCatedraId(typeof val === 'object' ? val.target.value : val)}
                options={(catedras || []).map(c => ({
                  value: c.id,
                  label: c.nombre
                }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Fecha *
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Hora Inicio (24 hs) *
              </label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Hora Fin (24 hs) *
              </label>
              <input
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
              Aula Asignada
            </label>
            <input
              type="text"
              value={aula}
              onChange={(e) => setAula(e.target.value)}
              placeholder="Ej: Aula 1 - Laboratorio Central"
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
              Observaciones / Tema a Dictar
            </label>
            <textarea
              rows={3}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Objetivos pedagógicos, tribunal evaluador o notas del libro..."
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
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
              Guardar Compromiso
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          MODAL: SINCRONIZAR CALENDARIO (.ICS)
         ======================================================== */}
      <Modal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        title="Sincronizar Calendario Académico"
        subtitle="Exporta tus cátedras y exámenes hacia Google Calendar, Outlook o Apple Calendar"
      >
        <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          <p>
            Descarga el archivo <strong>iCalendar (.ics)</strong> para importar tus horarios directamente en tu dispositivo móvil o servicio de calendario.
          </p>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
            <span className="font-bold text-slate-800 dark:text-slate-100 text-xs block">
              Pasos para sincronizar con Google Calendar:
            </span>
            <ol className="list-decimal list-inside space-y-1 text-xs text-slate-500 dark:text-slate-400">
              <li>Haz clic en "Descargar Archivo .ics".</li>
              <li>Abre Google Calendar en tu navegador.</li>
              <li>Ve a Configuración &gt; Importar y exportar &gt; Selecciona el archivo descargado.</li>
            </ol>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
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
