import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { handleAppError } from '../utils/handleAppError';
import { generateIcsContent, downloadIcsFile } from '../lib/calendarSync';
import { FERIADOS_ARGENTINA } from '../data/feriadosArgentina';
import { 
  DEFAULT_MESA_COLOR, 
  DEFAULT_CURATED_COLORS, 
  getContrastTextColor 
} from '../lib/colorTokens';
import { 
  BookOpen, 
  GraduationCap, 
  CheckSquare, 
  Bookmark, 
  CalendarRange, 
  Bell 
} from 'lucide-react';
import { getTodayYMD, formatFechaLegible } from '../lib/dateUtils';
import { isValid, parseISO } from 'date-fns';

function safeParseDate(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return isValid(val) ? val : null;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    const isoParsed = parseISO(trimmed);
    if (isValid(isoParsed)) return isoParsed;
    const directDate = new Date(trimmed);
    if (isValid(directDate)) return directDate;
  }
  return null;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const HOUR_ROW_HEIGHT = 80;

export function useCalendarEvents({ 
  user, 
  isDemo, 
  catedras, 
  activeCiclo, 
  periodosAcademicos,
  currentDate = new Date(),
  miniCalDate = new Date(),
  viewMode = 'semanal'
}) {
  const [events, setEvents] = useState([]);
  const [clases, setClases] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Filtros reactivos de cátedras y categorías
  const [catFilters, setCatFilters] = useState({});
  const [categoryFilters, setCategoryFilters] = useState({
    CLASE: true,
    TRIBUNAL_EXAMEN: true,
    EVALUACION: true,
    TRABAJO_PRACTICO: true,
    PERIODO: true
  });

  // Mapeo indexado de feriados para consultas O(1)
  const feriadosMap = useMemo(() => {
    const map = new Map();
    FERIADOS_ARGENTINA.forEach((f) => {
      map.set(f.fecha, f);
    });
    return map;
  }, []);

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
    }
  }, [catedras]);

  const getDefaultPeriods = () => [
    { id: 'per-1', nombre: '1° Cuatrimestre', tipo: 'PRIMER_CUATRIMESTRE', fecha_inicio: '2026-03-09', fecha_fin: '2026-07-10' },
    { id: 'per-2', nombre: 'Receso Invernal', tipo: 'RECESO_INVERNAL', fecha_inicio: '2026-07-13', fecha_fin: '2026-07-24' },
    { id: 'per-3', nombre: '2° Cuatrimestre', tipo: 'SEGUNDO_CUATRIMESTRE', fecha_inicio: '2026-08-03', fecha_fin: '2026-11-20' }
  ];

  const loadDemoCalendarData = useCallback(() => {
    const firstCat = catedras?.[0] || { id: 'cat-demo-1', nombre: 'Práctica Profesional', color: '#10B981' };
    const secondCat = catedras?.[1] || { id: 'cat-demo-2', nombre: 'Sistemas Operativos', color: '#0EA5E9' };

    let storedMesas = [];
    try {
      storedMesas = JSON.parse(localStorage.getItem('mesas_examen_all') || '[]');
    } catch (_) {}

    if (storedMesas.length === 0) {
      const mesaFecha = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
      const initialDemoMesa = {
        id: 'mesa-demo-auto-1',
        catedra_id: firstCat.id,
        catedras: {
          id: firstCat.id,
          nombre: firstCat.nombre,
          color: firstCat.color || '#10B981',
          instituciones: { nombre: 'Instituto Superior' }
        },
        fecha: mesaFecha,
        hora_inicio: '18:00',
        hora_fin: '20:30',
        turno_llamado: '1° LLAMADO',
        condicion_acta: 'REGULAR',
        presidente: 'Prof. Docente Titular',
        color: DEFAULT_MESA_COLOR,
        aula: 'Tribunal Magna',
        created_at: new Date().toISOString()
      };
      storedMesas = [initialDemoMesa];
      localStorage.setItem('mesas_examen_all', JSON.stringify(storedMesas));
    }
    setMesas(storedMesas);

    const sampleEvents = [
      {
        id: 'ev-demo-2',
        titulo: `Evaluación Parcial: ${firstCat.nombre}`,
        tipo: 'EVALUACION',
        catedra_id: firstCat.id,
        catedra_nombre: firstCat.nombre,
        catedra_color: firstCat.color || '#10B981',
        fecha_inicio: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0] + 'T19:00:00',
        fecha_fin: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0] + 'T21:00:00',
        aula: 'Aula 4',
        institucion: 'Sede Central',
        alumnos_count: 35,
        notas: 'Primer examen parcial integrador según pautas RAM.',
        editable: true
      },
      {
        id: 'ev-demo-3',
        titulo: `Entrega TP Final: ${secondCat.nombre}`,
        tipo: 'TRABAJO_PRACTICO',
        catedra_id: secondCat.id,
        catedra_nombre: secondCat.nombre,
        catedra_color: secondCat.color || '#0EA5E9',
        fecha_inicio: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0] + 'T20:00:00',
        fecha_fin: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0] + 'T21:30:00',
        aula: 'Lab 2',
        institucion: 'Sede Central',
        alumnos_count: 24,
        notas: 'Presentación de informe técnico integrador.',
        editable: true
      }
    ];

    setEvents(sampleEvents);
    setPeriodos((periodosAcademicos && periodosAcademicos.length > 0) ? periodosAcademicos : getDefaultPeriods());
  }, [catedras, periodosAcademicos]);

  const fetchAllCalendarData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      if (isSupabaseConfigured && !isDemo && user) {
        const { data: evData } = await supabase
          .from('eventos_calendario')
          .select('*')
          .eq('docente_id', user.id)
          .order('fecha_inicio', { ascending: true });
        setEvents(evData || []);

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

        try {
          const { data: mData } = await supabase
            .from('mesas_examen')
            .select(`
              *,
              catedras (
                id,
                nombre,
                color,
                nivel,
                instituciones (
                  id,
                  nombre
                )
              )
            `)
            .order('fecha', { ascending: true });
          setMesas(mData || []);
        } catch (mErr) {
          console.warn('Aviso al cargar mesas de examen en Supabase:', mErr);
          setMesas([]);
        }
      } else {
        loadDemoCalendarData();
      }
    } catch (err) {
      handleAppError(err, 'useCalendarEvents / Cargar datos calendario');
      setFetchError(err);
    } finally {
      setLoading(false);
    }
  }, [user, isDemo, catedras, activeCiclo, periodosAcademicos, loadDemoCalendarData]);

  useEffect(() => {
    fetchAllCalendarData();
  }, [fetchAllCalendarData]);

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
  }, [fetchAllCalendarData]);

  useEffect(() => {
    if (periodosAcademicos && periodosAcademicos.length > 0) {
      setPeriodos(periodosAcademicos);
    }
  }, [periodosAcademicos]);

  // Eventos recurrentes de clases semanales
  const regularClassesList = useMemo(() => {
    const list = [];
    (catedras || []).forEach(cat => {
      if (catFilters[cat.id] === false) return;
      if (!categoryFilters.CLASE) return;

      const catColor = cat.color || DEFAULT_CURATED_COLORS[0].value;
      const horarios = Array.isArray(cat.horarios_semanales) ? cat.horarios_semanales : [];
      horarios.forEach(h => {
        list.push({
          id: `class-recur-${cat.id}-${h.dia}`,
          catedra_id: cat.id,
          catedra_nombre: cat.nombre,
          catedra_color: catColor,
          color: catColor,
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

  // Eventos de períodos académicos
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

  // Mesas de Examen
  const mesaEvents = useMemo(() => {
    if (!categoryFilters.TRIBUNAL_EXAMEN) return [];
    return (mesas || []).map(m => {
      const catObj = (catedras || []).find(c => c.id === m.catedra_id) || m.catedras;
      if (m.catedra_id && catFilters[m.catedra_id] === false) return null;

      const f = m.fecha ? String(m.fecha).split('T')[0] : getTodayYMD();
      const hi = m.hora_inicio || '18:00';
      const hf = m.hora_fin || '20:30';
      const catColor = catObj?.color || DEFAULT_CURATED_COLORS[0].value;
      const mesaColor = m.color || DEFAULT_MESA_COLOR;

      return {
        id: `mesa-ev-${m.id}`,
        mesa_id: m.id,
        titulo: `Mesa: ${catObj?.nombre || 'Examen'} (${m.turno_llamado || 'Final'})`,
        tipo: 'TRIBUNAL_EXAMEN',
        fecha_inicio: `${f}T${hi}:00`,
        fecha_fin: `${f}T${hf}:00`,
        fecha: f,
        hora_inicio: hi,
        hora_fin: hf,
        aula: m.aula || 'Tribunal A',
        institucion: catObj?.instituciones?.nombre || catObj?.institucion_nombre || 'Instituto Superior',
        catedra_id: m.catedra_id,
        catedra_nombre: catObj?.nombre || 'Cátedra',
        catedra_color: catColor,
        color: mesaColor,
        condicion_acta: m.condicion_acta,
        presidente: m.presidente,
        notas: `Mesa examinadora • Tribunal Pres.: ${m.presidente || 'Docente Titular'}`,
        isMesa: true,
        editable: true
      };
    }).filter(Boolean);
  }, [mesas, catedras, catFilters, categoryFilters]);

  // Colección unificada de eventos filtrados
  const allFilteredEvents = useMemo(() => {
    const customEvents = events.filter(e => {
      if (categoryFilters[e.tipo] === false) return false;
      if (e.catedra_id && catFilters[e.catedra_id] === false) return false;
      return true;
    }).map(e => {
      const catObj = (catedras || []).find(c => c.id === e.catedra_id);
      return {
        ...e,
        catedra_color: catObj?.color || e.catedra_color || null,
        color: e.color || catObj?.color || null
      };
    });
    return [...customEvents, ...periodoEvents, ...mesaEvents];
  }, [events, periodoEvents, mesaEvents, categoryFilters, catFilters, catedras]);

  // Próximo compromiso destacado
  const nextUpcomingItem = useMemo(() => {
    const now = new Date();
    const candidates = [];

    allFilteredEvents.forEach(ev => {
      const rawDate = ev.fecha_inicio || ev.fecha;
      if (!rawDate) return;
      const evDate = safeParseDate(rawDate);
      if (!evDate) return;
      if (evDate >= now) {
        candidates.push({
          id: ev.id,
          titulo: ev.titulo,
          tipo: ev.tipo,
          date: evDate,
          hora_inicio: ev.fecha_inicio && ev.fecha_inicio.length >= 16 ? ev.fecha_inicio.substring(11, 16) : (ev.hora_inicio || '19:00'),
          hora_fin: ev.fecha_fin && ev.fecha_fin.length >= 16 ? ev.fecha_fin.substring(11, 16) : (ev.hora_fin || '21:05'),
          aula: ev.aula || 'Aula 1',
          institucion: ev.institucion || 'I.E.S Belén',
          catedra_id: ev.catedra_id,
          isClass: false
        });
      }
    });

    const normalizeDayKey = (d) => String(d || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const daysMap = { 'domingo': 0, 'lunes': 1, 'martes': 2, 'miercoles': 3, 'jueves': 4, 'viernes': 5, 'sabado': 6 };
    regularClassesList.forEach(cls => {
      const targetDay = daysMap[normalizeDayKey(cls.dia_semana)];
      if (targetDay !== undefined) {
        let diff = (targetDay - now.getDay() + 7) % 7;
        const clsDate = new Date();
        clsDate.setDate(now.getDate() + diff);
        const [hh, mm] = (cls.desde || '19:00').split(':');
        clsDate.setHours(parseInt(hh, 10) || 19, parseInt(mm, 10) || 0, 0, 0);

        const clsEndDate = new Date(clsDate);
        const [ehh, emm] = (cls.hasta || '21:05').split(':');
        clsEndDate.setHours(parseInt(ehh, 10) || 21, parseInt(emm, 10) || 5, 0, 0);

        if (diff === 0 && clsEndDate < now) {
          clsDate.setDate(clsDate.getDate() + 7);
        }

        if (clsDate >= now || (diff === 0 && clsEndDate >= now)) {
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

  // Tokens de diseño y contraste WCAG 2.1 AA
  const getItemDesign = useCallback((item) => {
    if (!item) {
      return {
        isMesa: false,
        bgColor: DEFAULT_CURATED_COLORS[0].value,
        textColor: '#FFFFFF',
        catedraColor: DEFAULT_CURATED_COLORS[0].value,
        Icon: BookOpen,
        tag: 'Clase Regular'
      };
    }

    const isMesa = item.tipo === 'TRIBUNAL_EXAMEN' || item.isMesa;
    const catObj = item.catedra_id ? (catedras || []).find(c => c.id === item.catedra_id) : null;
    const fallbackColor = DEFAULT_CURATED_COLORS[0].value;

    const rawCatColor = item.catedra_color || catObj?.color;
    const catColor = (typeof rawCatColor === 'string' && rawCatColor.trim().startsWith('#'))
      ? rawCatColor.trim()
      : fallbackColor;

    const rawItemColor = item.color;
    const validItemColor = (typeof rawItemColor === 'string' && rawItemColor.trim().startsWith('#'))
      ? rawItemColor.trim()
      : null;

    const bgColor = isMesa
      ? (validItemColor || DEFAULT_MESA_COLOR)
      : (validItemColor || catColor);

    const textColor = getContrastTextColor(bgColor);

    let Icon = BookOpen;
    let tag = 'Clase Regular';
    if (isMesa) {
      Icon = GraduationCap;
      tag = 'Mesa de Examen';
    } else if (item.tipo === 'EVALUACION') {
      Icon = CheckSquare;
      tag = 'Evaluación / Parcial';
    } else if (item.tipo === 'TRABAJO_PRACTICO') {
      Icon = Bookmark;
      tag = 'Entrega de TP';
    } else if (item.tipo === 'PERIODO') {
      Icon = CalendarRange;
      tag = 'Período Académico';
    } else if (item.tipo === 'RECORDATORIO') {
      Icon = Bell;
      tag = 'Recordatorio';
    }

    return {
      isMesa,
      bgColor,
      textColor,
      catedraColor: catColor,
      Icon,
      tag
    };
  }, [catedras]);

  // Crear Evento
  const handleCreateEvent = async ({ titulo, tipo, fecha, horaInicio, horaFin, aula, catedraId, notas }) => {
    if (!titulo.trim()) return false;
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
    return true;
  };

  // Eliminar Evento
  const handleDeleteEvent = async (eventId) => {
    if (!confirm('¿Deseas eliminar este compromiso del calendario?')) return false;
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { error } = await supabase
          .from('eventos_calendario')
          .delete()
          .eq('id', eventId);
        if (error) throw error;
      }
      setEvents(prev => prev.filter(e => e.id !== eventId));
      toast.success('Compromiso eliminado correctamente');
      return true;
    } catch (err) {
      handleAppError(err, 'useCalendarEvents / Eliminar Evento', user);
      return false;
    }
  };

  // Exportar .ics
  const handleDownloadIcs = () => {
    try {
      const ics = generateIcsContent(allFilteredEvents, clases, catedras);
      downloadIcsFile(`calendario_korum_${new Date().getFullYear()}.ics`, ics);
      toast.success('Archivo .ics descargado con éxito');
      return true;
    } catch (err) {
      handleAppError(err, 'useCalendarEvents / Generar Archivo ICS', user);
      return false;
    }
  };

  // Fechas de la semana actual (Lunes a Domingo)
  const weekDays = useMemo(() => {
    const validCurrent = safeParseDate(currentDate) || new Date();
    const d = new Date(validCurrent);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));

    return Array.from({ length: 7 }, (_, i) => {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      return dayDate;
    });
  }, [currentDate]);

  // Mini Calendario Días
  const miniCalDays = useMemo(() => {
    const validMini = safeParseDate(miniCalDate) || new Date();
    const year = validMini.getFullYear();
    const month = validMini.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const offset = (firstDayIndex + 6) % 7;

    const days = [];
    for (let i = 0; i < offset; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(new Date(year, month, d));
    return days;
  }, [miniCalDate]);

  // Calendario Mensual Días
  const mainCalMonthDays = useMemo(() => {
    const validCurrent = safeParseDate(currentDate) || new Date();
    const year = validCurrent.getFullYear();
    const month = validCurrent.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const offset = (firstDayIndex + 6) % 7;

    const days = [];
    for (let i = 0; i < offset; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(new Date(year, month, d));
    return days;
  }, [currentDate]);

  const formattedHeaderRange = useMemo(() => {
    const validCurrent = safeParseDate(currentDate) || new Date();
    if (viewMode === 'dia') return formatFechaLegible(validCurrent);
    if (viewMode === 'mensual') return `${MONTH_NAMES[validCurrent.getMonth()]}, ${validCurrent.getFullYear()}`;
    const mon = weekDays[0];
    const sun = weekDays[6];
    if (!mon || !sun || !isValid(mon) || !isValid(sun)) return '';
    return `${mon.getDate()} de ${MONTH_NAMES[mon.getMonth()]} - ${sun.getDate()} de ${MONTH_NAMES[sun.getMonth()]}, ${sun.getFullYear()}`;
  }, [viewMode, currentDate, weekDays]);

  const currentTimeIndicator = useMemo(() => {
    const now = new Date();
    const ch = now.getHours();
    const cm = now.getMinutes();
    if (ch < 7 || ch > 23) return null;
    const top = ((ch - 7) + cm / 60) * HOUR_ROW_HEIGHT;
    const todayIndex = (now.getDay() + 6) % 7;
    return { top, todayIndex };
  }, []);

  return {
    events,
    clases,
    periodos,
    mesas,
    loading,
    fetchError,
    fetchAllCalendarData,
    catFilters,
    setCatFilters,
    categoryFilters,
    setCategoryFilters,
    feriadosMap,
    regularClassesList,
    periodoEvents,
    mesaEvents,
    allFilteredEvents,
    nextUpcomingItem,
    getItemDesign,
    weekDays,
    miniCalDays,
    mainCalMonthDays,
    formattedHeaderRange,
    currentTimeIndicator,
    handleCreateEvent,
    handleDeleteEvent,
    handleDownloadIcs
  };
}
