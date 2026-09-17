import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  BookOpen, 
  Users, 
  CheckCircle2, 
  Clock, 
  Plus, 
  ArrowRight, 
  Calendar as CalendarIcon, 
  GraduationCap, 
  Building, 
  Award, 
  AlertCircle, 
  Search, 
  ChevronRight, 
  Sparkles, 
  CheckCheck, 
  FileText, 
  X,
  Layers,
  Percent,
  CalendarDays,
  ExternalLink,
  CheckSquare,
  TrendingUp,
  Zap,
  ShieldAlert,
  Pencil,
  MoreVertical
} from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import EmptyState from '../components/common/EmptyState';
import ExpandableSearch from '../components/common/ExpandableSearch';
import { EmptyStateIllustration } from '../components/illustrations';
import { SkeletonCatedraCard, SkeletonBentoGrid } from '../components/common/SkeletonLoader';
const EditarCatedraModal = lazy(() => import('../components/catedra/EditarCatedraModal'));
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { handleAppError } from '../utils/handleAppError';
import { 
  formatFechaDMY, 
  formatFechaLegible, 
  getRelativeDateLabel, 
  parseDMYtoYMD, 
  getTodayYMD 
} from '../lib/dateUtils';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isDemo } = useAuth();
  const { instituciones, activeInstitucion, activeCiclo, ciclosLectivos, refreshData } = useApp();

  // Primary Data States
  const [loading, setLoading] = useState(true);
  const [catedrasList, setCatedrasList] = useState([]);
  const [agendaItems, setAgendaItems] = useState([]);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL'); // 'ALL' | 'TERCIARIO' | 'SECUNDARIO'
  const [selectedInstFilter, setSelectedInstFilter] = useState('ALL');
  const [selectedMetricsCatedraId, setSelectedMetricsCatedraId] = useState('all');

  // Modal Nueva Cátedra
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newInstitucionId, setNewInstitucionId] = useState('');
  const [newNivel, setNewNivel] = useState('TERCIARIO');
  const [newModalidad, setNewModalidad] = useState('ANUAL');
  const [savingCatedra, setSavingCatedra] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal Modificar / Editar Cátedra
  const [editingCatedra, setEditingCatedra] = useState(null);
  const [activeMenuCatedraId, setActiveMenuCatedraId] = useState(null);

  // Modal Registrar Primera Clase Rápida
  const [isQuickClassModalOpen, setIsQuickClassModalOpen] = useState(false);
  const [targetCatedraForClass, setTargetCatedraForClass] = useState(null);
  const [quickFecha, setQuickFecha] = useState(getTodayYMD());
  const [quickTema, setQuickTema] = useState('');
  const [savingQuickClass, setSavingQuickClass] = useState(false);

  // Modal Crear Evento / Recordatorio Rápido
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [newEventTitulo, setNewEventTitulo] = useState('');
  const [newEventTipo, setNewEventTipo] = useState('TRIBUNAL_EXAMEN');
  const [newEventFecha, setNewEventFecha] = useState(getTodayYMD());
  const [newEventHora, setNewEventHora] = useState('08:00');
  const [newEventNotas, setNewEventNotas] = useState('');
  const [savingEvent, setSavingEvent] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [user, activeCiclo]);

  // Limpiar campo de búsqueda al cambiar de ciclo lectivo o institución activa
  useEffect(() => {
    setSearchQuery('');
  }, [activeCiclo?.id, activeInstitucion?.id]);

  // Set default institution in creation modal
  useEffect(() => {
    if (activeInstitucion) {
      setNewInstitucionId(activeInstitucion.id);
      setNewNivel(activeInstitucion.nivel || 'TERCIARIO');
    } else if (instituciones.length > 0) {
      setNewInstitucionId(instituciones[0].id);
      setNewNivel(instituciones[0].nivel || 'TERCIARIO');
    }
  }, [activeInstitucion, instituciones]);

  /**
   * Carga y optimización de datos en paralelo desde Supabase
   */
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && !isDemo && user) {
        const todayIso = new Date().toISOString().split('T')[0];
        const next15Days = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];

        // 1. Cátedras globales del docente (sin filtrar por instituto) + Eventos y Períodos
        const [catedrasRes, eventsRes, periodsRes] = await Promise.all([
          supabase
            .from('catedras')
            .select(`
              *,
              instituciones (
                id,
                nombre,
                nivel
              ),
              ciclos_lectivos (
                id,
                anio,
                activo
              )
            `)
            .eq('docente_id', user.id)
            .order('nombre', { ascending: true }),

          supabase
            .from('eventos_calendario')
            .select('*')
            .eq('docente_id', user.id)
            .gte('fecha_inicio', todayIso + 'T00:00:00')
            .lte('fecha_inicio', next15Days + 'T23:59:59')
            .order('fecha_inicio', { ascending: true }),

          supabase
            .from('periodos_academicos')
            .select('*')
            .order('fecha_inicio', { ascending: true })
        ]);

        const rawCatedras = catedrasRes.data || [];
        const catedraIds = rawCatedras.map(c => c.id);

        let inscripcionesByCat = {};
        let latestClaseByCat = {};
        let attendancePctByCat = {};
        let clasesCountByCat = {};

        if (catedraIds.length > 0) {
          // 2. Consultar inscripciones y todas las clases en paralelo
          const [inscRes, clasesRes] = await Promise.all([
            supabase
              .from('inscripciones')
              .select('catedra_id, estudiante_id')
              .in('catedra_id', catedraIds),

            supabase
              .from('clases')
              .select('id, catedra_id, fecha, tema')
              .in('catedra_id', catedraIds)
              .order('fecha', { ascending: false })
          ]);

          // Conteo de inscriptos por cátedra
          (inscRes.data || []).forEach(row => {
            inscripcionesByCat[row.catedra_id] = (inscripcionesByCat[row.catedra_id] || 0) + 1;
          });

          // Obtener la clase más reciente de cada cátedra y conteo total de clases por cátedra
          const allClases = clasesRes.data || [];
          const latestClaseIds = [];
          
          clasesCountByCat = (allClases || []).reduce((acc, c) => {
            const catId = c.catedra_id;
            acc[catId] = (acc[catId] || 0) + 1;
            return acc;
          }, {});

          allClases.forEach(c => {
            if (!latestClaseByCat[c.catedra_id]) {
              latestClaseByCat[c.catedra_id] = { ...c };
              latestClaseIds.push(c.id);
            }
          });

          // 3. Asistencias de la última clase y cálculo de asistencia global
          if (latestClaseIds.length > 0) {
            const { data: asistData } = await supabase
              .from('asistencias')
              .select('clase_id, estudiante_id, estado')
              .in('clase_id', latestClaseIds);

            const asistMap = {};
            (asistData || []).forEach(a => {
              if (!asistMap[a.clase_id]) {
                asistMap[a.clase_id] = { presentes: 0, total: 0 };
              }
              asistMap[a.clase_id].total += 1;
              if (a.estado === 'PRESENTE') {
                asistMap[a.clase_id].presentes += 1;
              }
            });

            // Asignar presentes a la última clase
            Object.keys(latestClaseByCat).forEach(catId => {
              const cls = latestClaseByCat[catId];
              if (cls && asistMap[cls.id]) {
                cls.presentes = asistMap[cls.id].presentes;
                cls.totalAsist = asistMap[cls.id].total;
              }
            });
          }

          // Calcular porcentaje promedio de asistencia por cátedra
          const allClaseIds = allClases.map(c => c.id);
          if (allClaseIds.length > 0) {
            const { data: allAsistData } = await supabase
              .from('asistencias')
              .select('clase_id, estado')
              .in('clase_id', allClaseIds);

            const claseToCat = {};
            allClases.forEach(c => { claseToCat[c.id] = c.catedra_id; });

            const totalByCat = {};
            const presentesByCat = {};

            (allAsistData || []).forEach(a => {
              const catId = claseToCat[a.clase_id];
              if (catId) {
                totalByCat[catId] = (totalByCat[catId] || 0) + 1;
                if (a.estado === 'PRESENTE') {
                  presentesByCat[catId] = (presentesByCat[catId] || 0) + 1;
                }
              }
            });

            catedraIds.forEach(catId => {
              const tot = totalByCat[catId] || 0;
              const pres = presentesByCat[catId] || 0;
              attendancePctByCat[catId] = tot > 0 ? Number(((pres / tot) * 100).toFixed(1)) : null;
            });
          }
        }

        // Combinar eventos de calendario y fechas límite de períodos académicos
        const agenda = processAgendaItems(eventsRes.data || [], periodsRes.data || [], todayIso, next15Days);

        // Mapeo unificado de cátedras con todos sus datos listos
        const enriched = rawCatedras.map(c => ({
          ...c,
          institucion_nombre: c.instituciones?.nombre || 'Institución',
          institucion_nivel: c.instituciones?.nivel || c.nivel,
          estudiantes_count: inscripcionesByCat[c.id] ?? 0,
          clases_count: clasesCountByCat?.[c.id] ?? 0,
          ultima_clase: latestClaseByCat[c.id] || null,
          asistencia_promedio: attendancePctByCat[c.id] ?? null
        }));

        setCatedrasList(enriched);
        setAgendaItems(agenda);
      } else {
        // Modo demostración con datos sintéticos completos
        loadDemoData();
      }
    } catch (err) {
      handleAppError(err, 'DashboardPage / Cargar Datos', user);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Consolida eventos de calendario y períodos en una lista ordenada por fecha
   */
  const processAgendaItems = (events, periods, todayIso, next15Days) => {
    const items = [];

    // 1. Eventos del calendario
    events.forEach(ev => {
      const fechaClean = ev.fecha_inicio ? ev.fecha_inicio.split('T')[0] : '';
      items.push({
        id: ev.id,
        titulo: ev.titulo,
        tipo: ev.tipo || 'TRIBUNAL_EXAMEN',
        fecha: fechaClean,
        hora: ev.fecha_inicio && ev.fecha_inicio.includes('T') ? ev.fecha_inicio.split('T')[1].substring(0, 5) : null,
        origen: 'EVENTO',
        notas: ev.notas
      });
    });

    // 2. Períodos académicos críticos que venzan en los próximos 15 días
    periods.forEach(per => {
      // Fecha de cierre / entrega
      if (per.fecha_fin && per.fecha_fin >= todayIso && per.fecha_fin <= next15Days) {
        items.push({
          id: 'per-fin-' + per.id,
          titulo: `Cierre: ${per.nombre}`,
          tipo: 'PERIODO',
          fecha: per.fecha_fin,
          hora: null,
          origen: 'PERIODO',
          notas: 'Límite para cierre de notas y actas reglamentarias'
        });
      }
      // Fecha de inicio de cuatrimestre / receso
      if (per.fecha_inicio && per.fecha_inicio >= todayIso && per.fecha_inicio <= next15Days) {
        items.push({
          id: 'per-ini-' + per.id,
          titulo: `Inicio: ${per.nombre}`,
          tipo: 'PERIODO',
          fecha: per.fecha_inicio,
          hora: null,
          origen: 'PERIODO',
          notas: 'Inicio del período lectivo'
        });
      }
    });

    // Ordenar ascendentemente por fecha
    items.sort((a, b) => a.fecha.localeCompare(b.fecha));
    return items;
  };

  /**
   * Datos demo para pruebas locales sin conexión activa
   */
  const loadDemoData = () => {
    const demoCatedras = [
      {
        id: 'cat-1',
        nombre: 'Programación y Algoritmos II',
        nivel: 'TERCIARIO',
        modalidad: 'ANUAL',
        institucion_nombre: 'Instituto Superior de Formación Docente N° 19',
        institucion_nivel: 'TERCIARIO',
        estudiantes_count: 26,
        asistencia_promedio: 88.5,
        clases_count: 8,
        horarios_semanales: [{ dia: 'Lunes', desde: '18:00', hasta: '20:00', aula: 'Lab 1' }],
        ultima_clase: {
          id: 'clase-demo-1',
          fecha: '2026-03-09',
          tema: 'Unidad 2 - Estructuras de Datos Avanzadas y Recursión',
          presentes: 24,
          totalAsist: 26
        }
      },
      {
        id: 'cat-2',
        nombre: 'Bases de Datos Relacionales',
        nivel: 'TERCIARIO',
        modalidad: 'CUATRIMESTRAL',
        institucion_nombre: 'Instituto Superior de Formación Docente N° 19',
        institucion_nivel: 'TERCIARIO',
        estudiantes_count: 31,
        asistencia_promedio: 92.0,
        clases_count: 12,
        horarios_semanales: [{ dia: 'Martes', desde: '19:00', hasta: '21:00', aula: 'Lab 2' }],
        ultima_clase: {
          id: 'clase-demo-2',
          fecha: '2026-03-10',
          tema: 'Normalización 3FN y Claves Foráneas en PostgreSQL',
          presentes: 29,
          totalAsist: 31
        }
      },
      {
        id: 'cat-3',
        nombre: 'Informática y Ciudadanía Digital',
        nivel: 'SECUNDARIO',
        modalidad: 'ANUAL',
        institucion_nombre: 'Colegio Secundario N° 4 Manuel Belgrano',
        institucion_nivel: 'SECUNDARIO',
        estudiantes_count: 28,
        asistencia_promedio: 84.2,
        clases_count: 5,
        horarios_semanales: [{ dia: 'Miércoles', desde: '08:30', hasta: '10:30', aula: 'Aula 4' }],
        ultima_clase: {
          id: 'clase-demo-3',
          fecha: '2026-03-04',
          tema: 'Seguridad en Internet, Privacidad y Huella Digital',
          presentes: 25,
          totalAsist: 28
        }
      },
      {
        id: 'cat-4',
        nombre: 'Sistemas Operativos y Redes',
        nivel: 'TERCIARIO',
        modalidad: 'ANUAL',
        institucion_nombre: 'Instituto Superior de Formación Docente N° 19',
        institucion_nivel: 'TERCIARIO',
        estudiantes_count: 22,
        asistencia_promedio: 86.0,
        clases_count: 0,
        horarios_semanales: [{ dia: 'Jueves', desde: '18:00', hasta: '20:00', aula: 'Lab 3' }],
        ultima_clase: null // Cátedra sin clases aún para probar estado vacío
      }
    ];

    const demoAgenda = [
      {
        id: 'ev-1',
        titulo: 'Mesa de Examen Final — Turno Especial Marzo',
        tipo: 'TRIBUNAL_EXAMEN',
        fecha: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        hora: '18:30',
        notas: 'Tribunal evaluador: Algoritmos y Estructura de Datos'
      },
      {
        id: 'ev-2',
        titulo: 'Reunión Plenaria de Personal Docente',
        tipo: 'REUNION',
        fecha: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
        hora: '09:00',
        notas: 'Planificación anual y pautas institucionales ciclo 2026'
      },
      {
        id: 'ev-3',
        titulo: 'Cierre de Carga de Diagnósticos Iniciales',
        tipo: 'PERIODO',
        fecha: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0],
        hora: null,
        notas: 'Plazo reglamentario de entrega en secretaría'
      }
    ];

    setCatedrasList(demoCatedras);
    setAgendaItems(demoAgenda);
  };

// Normalización de texto reactiva para búsqueda de cátedras
const normalizeSearchText = (str) => {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

  /**
   * Filtrado y búsqueda reactiva de cátedras (Client-side)
   */
  const filteredCatedras = useMemo(() => {
    const rawQuery = searchQuery.trim();
    const normalizedQuery = normalizeSearchText(rawQuery);

    return catedrasList.filter(cat => {
      // Filtro por Nivel
      if (levelFilter !== 'ALL' && cat.nivel !== levelFilter) {
        return false;
      }
      // Filtro por Institución si el usuario lo desea
      if (selectedInstFilter !== 'ALL' && cat.institucion_id !== selectedInstFilter) {
        return false;
      }
      // Búsqueda por texto insensible a mayúsculas y tildes (nombre de cátedra o institución)
      if (normalizedQuery) {
        const matchesName = normalizeSearchText(cat.nombre).includes(normalizedQuery);
        const matchesInst = normalizeSearchText(cat.institucion_nombre).includes(normalizedQuery);
        const matchesNivel = normalizeSearchText(cat.nivel).includes(normalizedQuery);
        if (!matchesName && !matchesInst && !matchesNivel) return false;
      }
      return true;
    });
  }, [catedrasList, levelFilter, selectedInstFilter, searchQuery]);

  /**
   * Estilo y colorimetría para la agenda de eventos según especificación:
   * - Exámenes / Mesas / Tribunales: Rojo / Violeta
   * - Reuniones Institucionales / De Personal: Azul / Índigo / Sky
   * - Cierre de Períodos / Notas: Ámbar / Naranja
   */
  const getAgendaColorStyles = (tipo) => {
    switch (tipo) {
      case 'TRIBUNAL_EXAMEN':
        return {
          cardBg: 'bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/25 dark:border-rose-500/30',
          badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
          iconColor: 'text-rose-600 dark:text-rose-400',
          icon: Award,
          label: 'Mesa / Examen'
        };
      case 'REUNION':
        return {
          cardBg: 'bg-sky-500/5 hover:bg-sky-500/10 border-sky-500/25 dark:border-sky-500/30',
          badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
          iconColor: 'text-sky-600 dark:text-sky-400',
          icon: Users,
          label: 'Reunión Docente'
        };
      case 'PERIODO':
        return {
          cardBg: 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/25 dark:border-amber-500/30',
          badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
          iconColor: 'text-amber-600 dark:text-amber-400',
          icon: Clock,
          label: 'Cierre Académico'
        };
      default:
        return {
          cardBg: 'bg-primary/5 hover:bg-primary/10 border-primary/25',
          badge: 'bg-primary/15 text-primary border-primary/30',
          iconColor: 'text-primary',
          icon: CalendarIcon,
          label: 'Compromiso'
        };
    }
  };

  /**
   * Bento Box 1: Próxima Clase Inminente (Cálculo Dinámico por Horarios Semanales)
   */
  const upcomingClass = useMemo(() => {
    if (!catedrasList || catedrasList.length === 0) return null;

    const daysMap = { 'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6 };
    const now = new Date();
    const currentDay = now.getDay();
    const candidates = [];

    catedrasList.forEach(cat => {
      const schedules = Array.isArray(cat.horarios_semanales) ? cat.horarios_semanales : [];
      schedules.forEach(h => {
        const targetDay = daysMap[h.dia];
        if (targetDay !== undefined) {
          const diff = (targetDay - currentDay + 7) % 7;
          const classDate = new Date();
          classDate.setDate(now.getDate() + diff);
          const [hh, mm] = (h.desde || '18:00').split(':');
          classDate.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);

          candidates.push({
            catedraId: cat.id,
            nombre: cat.nombre,
            institucion: cat.institucion_nombre,
            nivel: cat.nivel,
            modalidad: cat.modalidad,
            dia: h.dia,
            desde: h.desde || '18:00',
            hasta: h.hasta || '20:00',
            aula: h.aula || 'Aula Principal',
            isToday: diff === 0,
            date: classDate,
            ultimaClase: cat.ultima_clase,
            estudiantesCount: cat.estudiantes_count || 0
          });
        }
      });
    });

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.date - b.date);
      return candidates[0];
    }

    // Si no hay horarios específicos configurados, seleccionar la primera cátedra activa
    const firstCat = catedrasList[0];
    return {
      catedraId: firstCat.id,
      nombre: firstCat.nombre,
      institucion: firstCat.institucion_nombre,
      nivel: firstCat.nivel,
      modalidad: firstCat.modalidad,
      dia: 'Próxima Sesión',
      desde: '18:00',
      hasta: '20:00',
      aula: 'Aula de Cátedra',
      isToday: false,
      date: new Date(),
      ultimaClase: firstCat.ultima_clase,
      estudiantesCount: firstCat.estudiantes_count || 0
    };
  }, [catedrasList]);

  /**
   * Bento Box 2: Próximo Evento de la Agenda Crítica
   */
  const nextCriticalEvent = useMemo(() => {
    if (!agendaItems || agendaItems.length === 0) return null;
    const examOrPeriod = agendaItems.find(a => a.tipo === 'TRIBUNAL_EXAMEN' || a.tipo === 'PERIODO');
    return examOrPeriod || agendaItems[0];
  }, [agendaItems]);

  /**
   * Bento Box 3: Opciones del Selector de Cátedras
   */
  const metricsCatedraOptions = useMemo(() => {
    return [
      { value: 'all', label: '📊 Consolidado General (Todas)' },
      ...catedrasList.map(c => ({
        value: c.id,
        label: `${c.nombre} (${c.institucion_nombre || 'Inst.'})`,
        badge: c.nivel === 'TERCIARIO' ? 'Terc.' : 'Sec.'
      }))
    ];
  }, [catedrasList]);

  /**
   * Bento Box 3: Métricas Rápidas Dinámicas (Consolidado o por Cátedra puntual)
   */
  const displayedMetrics = useMemo(() => {
    if (selectedMetricsCatedraId === 'all') {
      let totalStudents = 0;
      let validAttendanceSum = 0;
      let attendanceCount = 0;
      let totalClasses = 0;

      catedrasList.forEach(c => {
        totalStudents += (c.estudiantes_count || 0);
        if (c.asistencia_promedio !== null && !isNaN(c.asistencia_promedio)) {
          validAttendanceSum += Number(c.asistencia_promedio);
          attendanceCount += 1;
        }
        totalClasses += (c.clases_count !== undefined ? c.clases_count : (c.ultima_clase ? 1 : 0));
      });

      const averageAttendance = attendanceCount > 0 ? Math.round(validAttendanceSum / attendanceCount) : 0;
      return {
        totalStudents,
        averageAttendance,
        totalClasses,
        activeCatedras: catedrasList.length,
        isFiltered: false,
        catedraNombre: 'Todas las materias'
      };
    }

    const selectedCat = catedrasList.find(c => String(c.id) === String(selectedMetricsCatedraId));
    if (!selectedCat) {
      return {
        totalStudents: 0,
        averageAttendance: 0,
        totalClasses: 0,
        activeCatedras: 0,
        isFiltered: true,
        catedraNombre: 'Cátedra no encontrada'
      };
    }

    const attendance = selectedCat.asistencia_promedio !== null && !isNaN(selectedCat.asistencia_promedio)
      ? Math.round(Number(selectedCat.asistencia_promedio))
      : 0;

    return {
      totalStudents: selectedCat.estudiantes_count || 0,
      averageAttendance: attendance,
      totalClasses: selectedCat.clases_count !== undefined ? selectedCat.clases_count : (selectedCat.ultima_clase ? 1 : 0),
      activeCatedras: 1,
      isFiltered: true,
      catedraNombre: selectedCat.nombre
    };
  }, [selectedMetricsCatedraId, catedrasList]);

  const globalMetrics = displayedMetrics;

  /**
   * Crear Cátedra
   */
  const handleCreateCatedra = async (e) => {
    e.preventDefault();
    if (!newNombre.trim()) {
      setErrorMsg('El nombre de la cátedra es obligatorio.');
      return;
    }
    const targetInstId = newInstitucionId || activeInstitucion?.id || instituciones[0]?.id;
    if (!targetInstId) {
      setErrorMsg('Debes seleccionar una institución educativa.');
      return;
    }

    setSavingCatedra(true);
    setErrorMsg('');

    try {
      if (isSupabaseConfigured && !isDemo && user) {
        let resolvedCicloId = activeCiclo?.id;
        if (!resolvedCicloId && ciclosLectivos?.length > 0) {
          resolvedCicloId = ciclosLectivos.find(c => c.activo)?.id || ciclosLectivos[0]?.id;
        }
        if (!resolvedCicloId) {
          const { data: cDb } = await supabase
            .from('ciclos_lectivos')
            .select('id')
            .eq('docente_id', user.id)
            .order('anio', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (cDb?.id) resolvedCicloId = cDb.id;
        }

        let insertPayload = {
          docente_id: user.id,
          institucion_id: targetInstId,
          ciclo_id: resolvedCicloId || null,
          nombre: newNombre.trim(),
          nivel: newNivel,
          modalidad: newModalidad,
          horarios_semanales: []
        };

        let data = null;
        let { data: resData, error } = await supabase
          .from('catedras')
          .insert(insertPayload)
          .select(`
            *,
            instituciones (
              id,
              nombre,
              nivel
            )
          `)
          .single();

        if (error && (error.message?.includes('violates check constraint') || error.message?.includes('catedras_modalidad_check'))) {
          // Fallback si la restricción en Supabase aún no fue actualizada con el script
          console.warn('Aviso: Restricción check previa en Supabase. Aplicando fallback a CUATRIMESTRAL...');
          const fallbackRes = await supabase
            .from('catedras')
            .insert({ ...insertPayload, modalidad: 'CUATRIMESTRAL' })
            .select(`*, instituciones(id, nombre, nivel)`)
            .single();
          if (fallbackRes.error) throw fallbackRes.error;
          data = fallbackRes.data;
          toast.info(`Cátedra creada. Recuerda ejecutar el script 'supabase/update_modalidad_check.sql' en el SQL Editor para guardar el valor exacto.`);
        } else if (error) {
          throw error;
        } else {
          data = resData;
        }

        if (error) throw error;
        toast.success(`Cátedra "${data.nombre}" creada con éxito`);
        setIsModalOpen(false);
        setNewNombre('');
        await refreshData();
        await fetchDashboardData();
        navigate(`/catedra/${data.id}`);
      } else {
        const instFound = instituciones.find(i => i.id === targetInstId);
        const newCat = {
          id: 'cat-' + Date.now(),
          docente_id: user?.id || 'demo',
          institucion_id: targetInstId,
          institucion_nombre: instFound?.nombre || 'Instituto Superior N° 19',
          institucion_nivel: newNivel,
          nombre: newNombre.trim(),
          nivel: newNivel,
          modalidad: newModalidad,
          horarios_semanales: [],
          estudiantes_count: 0,
          asistencia_promedio: null,
          ultima_clase: null
        };
        setCatedrasList(prev => [newCat, ...prev]);
        setIsModalOpen(false);
        setNewNombre('');
        toast.success(`Cátedra "${newCat.nombre}" creada`);
      }
    } catch (err) {
      const info = handleAppError(err, 'DashboardPage / Crear Cátedra', user);
      setErrorMsg(`${info.mensaje} (Código: ${info.codigo})`);
    } finally {
      setSavingCatedra(false);
    }
  };

  /**
   * Registrar Primera Clase Rápida desde el Dashboard
   */
  const handleQuickCreateClase = async (e) => {
    e.preventDefault();
    if (!targetCatedraForClass || !quickFecha) return;

    setSavingQuickClass(true);
    try {
      const fechaIso = parseDMYtoYMD(quickFecha);
      const newClaseObj = {
        catedra_id: targetCatedraForClass.id,
        fecha: fechaIso,
        tema: quickTema.trim() || 'Primera Clase / Presentación de la Cátedra'
      };

      if (isSupabaseConfigured && !isDemo && user) {
        const { data, error } = await supabase
          .from('clases')
          .insert(newClaseObj)
          .select()
          .single();

        if (error) throw error;

        // Si la cátedra tiene alumnos inscriptos, marcarlos a todos como presentes
        const { data: inscData } = await supabase
          .from('inscripciones')
          .select('estudiante_id')
          .eq('catedra_id', targetCatedraForClass.id);

        if (inscData && inscData.length > 0) {
          const autoAsist = inscData.map(i => ({
            clase_id: data.id,
            estudiante_id: i.estudiante_id,
            estado: 'PRESENTE'
          }));
          const { error: asistErr } = await supabase
            .from('asistencias')
            .upsert(autoAsist, { onConflict: 'clase_id,estudiante_id' });
          if (asistErr) {
            console.warn('Aviso al guardar asistencias automáticas:', asistErr);
          }
        }

        toast.success(`Primera clase registrada el ${formatFechaDMY(quickFecha)}.`);
        setIsQuickClassModalOpen(false);
        setQuickTema('');
        await fetchDashboardData();
      } else {
        // Modo local
        setCatedrasList(prev => prev.map(c => {
          if (c.id === targetCatedraForClass.id) {
            return {
              ...c,
              ultima_clase: {
                id: 'clase-' + Date.now(),
                fecha: fechaIso,
                tema: quickTema.trim() || 'Primera Clase / Presentación',
                presentes: c.estudiantes_count || 1,
                totalAsist: c.estudiantes_count || 1
              }
            };
          }
          return c;
        }));

        toast.success(`Primera clase registrada el ${formatFechaDMY(quickFecha)}.`);
        setIsQuickClassModalOpen(false);
        setQuickTema('');
      }
    } catch (err) {
      handleAppError(err, 'DashboardPage / Registrar Clase Rápida', user);
    } finally {
      setSavingQuickClass(false);
    }
  };

  /**
   * Crear Evento Rápido en Agenda
   */
  const handleCreateQuickEvent = async (e) => {
    e.preventDefault();
    if (!newEventTitulo.trim() || !newEventFecha) return;

    setSavingEvent(true);
    try {
      const fechaIso = parseDMYtoYMD(newEventFecha);
      const startDateObj = new Date(`${fechaIso}T${newEventHora || '08:00'}:00`);
      const endDateObj = new Date(`${fechaIso}T10:00:00`);
      const startDateTime = isNaN(startDateObj.getTime()) ? `${fechaIso}T${newEventHora || '08:00'}:00Z` : startDateObj.toISOString();
      const endDateTime = isNaN(endDateObj.getTime()) ? `${fechaIso}T10:00:00Z` : endDateObj.toISOString();

      if (isSupabaseConfigured && !isDemo && user) {
        const { data, error } = await supabase
          .from('eventos_calendario')
          .insert({
            docente_id: user.id,
            titulo: newEventTitulo.trim(),
            tipo: newEventTipo,
            fecha_inicio: startDateTime,
            fecha_fin: endDateTime,
            notas: newEventNotas.trim() || null
          })
          .select()
          .single();

        if (error) throw error;
        toast.success('Evento agendado en tu calendario.');
        setIsNewEventModalOpen(false);
        setNewEventTitulo('');
        setNewEventNotas('');
        await fetchDashboardData();
      } else {
        const newEv = {
          id: 'ev-' + Date.now(),
          titulo: newEventTitulo.trim(),
          tipo: newEventTipo,
          fecha: fechaIso,
          hora: newEventHora,
          notas: newEventNotas.trim()
        };
        setAgendaItems(prev => [newEv, ...prev].sort((a, b) => a.fecha.localeCompare(b.fecha)));
        setIsNewEventModalOpen(false);
        setNewEventTitulo('');
        setNewEventNotas('');
        toast.success('Evento agregado a la agenda.');
      }
    } catch (err) {
      handleAppError(err, 'DashboardPage / Agendar Evento Rápido', user);
    } finally {
      setSavingEvent(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn pb-12">
      {/* 1. WELCOME BENTO HEADER */}
      <div className="backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-white/10 shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Glow decorativo sutil */}
        <div className="absolute -right-10 -top-10 w-52 h-52 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
              Panel de Control Central
            </span>
            <span className="text-xs text-text-muted flex items-center gap-1 font-medium">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{formatFechaLegible(new Date())}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            ¡Hola, {user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Profesor'}!
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary max-w-2xl leading-relaxed">
            Arquitectura visual unificada para el seguimiento de cátedras, asistencias y agenda académica.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 relative z-10 flex-wrap sm:flex-nowrap">
          <Button
            variant="outline"
            icon={CalendarIcon}
            onClick={() => {
              navigate('/calendario');
              window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
              document.querySelector('main')?.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            }}
            className="flex-1 sm:flex-initial text-xs rounded-xl touch-target-44 sm:touch-target-auto whitespace-nowrap shrink-0"
          >
            <span className="hidden sm:inline">Ver Calendario</span>
            <span className="sm:hidden">Calendario</span>
          </Button>

          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              setErrorMsg('');
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-initial text-xs shadow-xs rounded-xl touch-target-44 sm:touch-target-auto whitespace-nowrap shrink-0"
          >
            <span className="hidden sm:inline">Nueva Cátedra</span>
            <span className="sm:hidden">+ Cátedra</span>
          </Button>
        </div>
      </div>

      {/* 2. BENTO GRID SYSTEM OVERVIEW (ASYMMETRICAL 4-COL GRID) */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 items-stretch">
        {/* =========================================================
            BENTO BOX 1 (HERO CARD - col-span-1 md:col-span-2 lg:col-span-2)
            "Próxima Clase Inminente"
           ========================================================= */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2 backdrop-blur-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 group">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/15 via-emerald-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10">
            {/* Top Bar inside Box 1 */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">
                  {upcomingClass?.isToday ? 'Clase de Hoy' : 'Próxima Clase'}
                </span>
              </div>
              <Badge variant={upcomingClass?.nivel === 'TERCIARIO' ? 'primary' : 'warning'}>
                {upcomingClass?.nivel || 'NIVEL'}
              </Badge>
            </div>

            {/* Subject Title */}
            <h3
              onClick={() => upcomingClass && navigate(`/catedra/${upcomingClass.catedraId}`)}
              className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight group-hover:text-primary transition-colors cursor-pointer leading-tight line-clamp-1 mt-3"
            >
              {upcomingClass ? upcomingClass.nombre : 'Sin cátedras activas'}
            </h3>

            <p className="text-xs text-text-muted mt-1.5 flex items-center gap-1.5 truncate font-medium">
              <Building className="w-3.5 h-3.5 shrink-0 text-primary/70" />
              <span className="truncate">{upcomingClass?.institucion || 'Registra tu primera materia'}</span>
            </p>

            {/* Schedule & Room Chips */}
            <div className="flex items-center gap-2 mt-4 flex-wrap text-xs font-mono">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/5 text-text-secondary font-semibold">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>{upcomingClass ? `${upcomingClass.dia} • ${upcomingClass.desde || upcomingClass.hora}` : '--:--'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/5 text-text-secondary font-semibold">
                <span>{upcomingClass?.aula || 'Aula regular'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/5 text-text-secondary font-semibold">
                <Users className="w-3.5 h-3.5 text-text-muted" />
                <span>{upcomingClass?.estudiantesCount || 0} alumnos</span>
              </span>
            </div>
          </div>

          {/* Footer Action */}
          <div className="relative z-10 pt-4 mt-5 border-t border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-text-muted truncate max-w-xs">
              <span className="text-text-secondary font-medium">Tema: </span>
              <span className="italic">{upcomingClass?.ultimaClase?.tema ? upcomingClass.ultimaClase.tema : 'Presentación y contenidos'}</span>
            </div>
            {upcomingClass && (
              <Button
                variant="primary"
                size="sm"
                icon={CheckSquare}
                onClick={() => navigate(`/catedra/${upcomingClass.catedraId}?tab=asistencias`)}
                className="text-xs font-bold shadow-xs whitespace-nowrap rounded-xl"
              >
                Iniciar Asistencia Rápida
              </Button>
            )}
          </div>
        </div>

        {/* =========================================================
            BENTO BOX 2 (col-span-1)
            "Agenda Crítica & Exámenes"
           ========================================================= */}
        <div className="backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Award className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">
                  Agenda Crítica
                </span>
              </div>
              {nextCriticalEvent && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  {getRelativeDateLabel(nextCriticalEvent.fecha)}
                </span>
              )}
            </div>

            {nextCriticalEvent ? (
              <div className="my-auto py-3 space-y-2">
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-text-secondary border border-slate-200/60 dark:border-white/5">
                  {nextCriticalEvent.tipo === 'TRIBUNAL_EXAMEN' ? 'Mesa de Examen Final' : nextCriticalEvent.tipo === 'PERIODO' ? 'Cierre Académico' : 'Reunión Docente'}
                </span>
                <h4 className="text-sm font-bold text-text-primary leading-snug line-clamp-2">
                  {nextCriticalEvent.titulo}
                </h4>
                <p className="text-[11px] text-text-muted font-mono flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>{formatFechaLegible(nextCriticalEvent.fecha)}</span>
                  {nextCriticalEvent.hora && <span>• {nextCriticalEvent.hora} hs</span>}
                </p>
              </div>
            ) : (
              <div className="my-auto py-6 text-center">
                <CalendarIcon className="w-7 h-7 text-text-muted/40 mx-auto mb-1.5" />
                <p className="text-xs text-text-muted">Sin mesas ni vencimientos en los próximos 15 días.</p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setIsNewEventModalOpen(true)}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Recordatorio</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/calendario')}
              className="text-[11px] text-text-muted hover:text-text-primary flex items-center gap-0.5 cursor-pointer"
            >
              <span>Ver todo</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* =========================================================
            BENTO BOX 3 (col-span-1)
            "Métricas Rápidas & Asistencia Global"
           ========================================================= */}
        <div className="backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 relative overflow-hidden group">
          <div>
            {/* Cabecera sin solapamientos (flex-between) */}
            <div className="flex items-center justify-between gap-2 w-full mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                  Métricas Rápidas
                </span>
              </div>
              <span className={`shrink-0 text-xs px-2.5 py-0.5 rounded-full border ${
                displayedMetrics.averageAttendance >= 75
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {displayedMetrics.averageAttendance >= 75 ? 'Asistencia Óptima' : 'En Seguimiento'}
              </span>
            </div>

            {/* Selector desplegable para filtrar por Cátedra o Consolidado General */}
            <div className="mb-4">
              <CustomSelect
                value={selectedMetricsCatedraId}
                onChange={(val) => {
                  const targetVal = typeof val === 'object' && val?.target ? val.target.value : val;
                  setSelectedMetricsCatedraId(targetVal);
                }}
                options={metricsCatedraOptions}
                placeholder="Consolidado General"
                className="w-full text-xs"
                buttonClassName="py-1.5 px-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl font-medium"
              />
            </div>

            {/* Layout Horizontal 2 Columnas (PC/Desktop): Col 1 Donut 100px, Col 2 Contadores */}
            <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] items-center gap-4 py-2">
              {/* Columna 1: Donut Chart de 100px con porcentaje de asistencia centrado */}
              <div className="relative w-[100px] h-[100px] mx-auto flex items-center justify-center shrink-0">
                <svg className="w-[100px] h-[100px] transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-slate-200/80 dark:stroke-slate-800"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className={`transition-all duration-1000 ease-out ${
                      displayedMetrics.averageAttendance >= 75
                        ? 'stroke-emerald-500 dark:stroke-emerald-400'
                        : 'stroke-amber-500 dark:stroke-amber-400'
                    }`}
                    strokeWidth="10"
                    strokeDasharray={251.3}
                    strokeDashoffset={251.3 - (251.3 * Math.min(displayedMetrics.averageAttendance, 100)) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                  <span className="text-base font-mono font-bold text-slate-900 dark:text-white leading-tight">
                    {displayedMetrics.averageAttendance}%
                  </span>
                  <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5 leading-none">
                    ASISTENCIA
                  </span>
                </div>
              </div>

              {/* Columna 2: 3 contadores con texto completo sin truncado */}
              <div className="grid grid-cols-1 gap-2 w-full">
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 whitespace-normal">
                    <span className="text-sm">👥</span>
                    <span>Alumnos Activos:</span>
                  </span>
                  <span className="text-sm font-bold font-mono text-slate-900 dark:text-white shrink-0">
                    {displayedMetrics.totalStudents}
                  </span>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 whitespace-normal">
                    <span className="text-sm">📖</span>
                    <span>{displayedMetrics.isFiltered ? 'Materia:' : 'Cátedras:'}</span>
                  </span>
                  <span className="text-sm font-bold font-mono text-slate-900 dark:text-white shrink-0">
                    {displayedMetrics.isFiltered ? '1 Activa' : displayedMetrics.activeCatedras}
                  </span>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 whitespace-normal">
                    <span className="text-sm">⏱️</span>
                    <span>Clases Totales:</span>
                  </span>
                  <span className="text-sm font-bold font-mono text-slate-900 dark:text-white shrink-0">
                    {displayedMetrics.totalClasses}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs">
            <span className="text-[11px] text-text-muted font-mono flex items-center gap-1.5 truncate max-w-[200px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="truncate">
                {displayedMetrics.isFiltered ? displayedMetrics.catedraNombre : 'Datos sincronizados'}
              </span>
            </span>
            <span className="text-[11px] font-semibold text-primary shrink-0">Ciclo {activeCiclo?.anio || '2026'}</span>
          </div>
        </div>
      </section>

      {/* 3. BENTO BOX 5: ACCIONES RÁPIDAS Y ATAJOS MODULARES */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => { setErrorMsg(''); setIsModalOpen(true); }}
          className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xs transition-all flex items-center gap-3 text-left group cursor-pointer"
        >
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
            <Plus className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-text-primary block truncate">Nueva Cátedra</span>
            <span className="text-[10px] text-text-muted block truncate">Crear asignatura</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/calendario')}
          className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xs transition-all flex items-center gap-3 text-left group cursor-pointer"
        >
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-text-primary block truncate">Calendario y Mesas</span>
            <span className="text-[10px] text-text-muted block truncate">Cronograma</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            if (upcomingClass) {
              navigate(`/catedra/${upcomingClass.catedraId}?tab=asistencias`);
            } else if (catedrasList.length > 0) {
              navigate(`/catedra/${catedrasList[0].id}?tab=asistencias`);
            } else {
              toast.info('Crea una cátedra primero para gestionar inasistencias docentes.');
            }
          }}
          className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xs transition-all flex items-center gap-3 text-left group cursor-pointer"
        >
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-text-primary block truncate">Licencia Docente</span>
            <span className="text-[10px] text-text-muted block truncate">Artículos y partes</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            if (upcomingClass) {
              navigate(`/catedra/${upcomingClass.catedraId}?tab=recursos`);
            } else if (catedrasList.length > 0) {
              navigate(`/catedra/${catedrasList[0].id}?tab=recursos`);
            } else {
              toast.info('Crea una cátedra primero para subir archivos.');
            }
          }}
          className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xs transition-all flex items-center gap-3 text-left group cursor-pointer"
        >
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
            <ExternalLink className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-text-primary block truncate">Recursos y Drive</span>
            <span className="text-[10px] text-text-muted block truncate">Repositorio de cátedra</span>
          </div>
        </button>
      </section>

      {/* 4. BENTO BOX 4 (GRILLA EXPANDIDA): MIS CÁTEDRAS */}
      <section className="space-y-4">
        {/* Cabecera de Cátedras con Filtros y Buscador */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
                Mis Cátedras Activas
              </h2>
              <p className="text-[11px] text-text-muted font-mono">
                {searchQuery.trim()
                  ? `Mostrando ${filteredCatedras.length} de ${catedrasList.length} materias`
                  : `${filteredCatedras.length} de ${catedrasList.length} materias visibles`
                }
              </p>
            </div>
          </div>

          {/* Barra de Filtros interactiva */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Buscador de texto expandible */}
            <ExpandableSearch
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              placeholder="Buscar materia o colegio..."
              widthClass="w-56 sm:w-64 md:w-72"
            />

            {/* Contador de coincidencias en vivo si hay búsqueda activa */}
            {searchQuery.trim() && (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary animate-fadeIn shrink-0 shadow-xs">
                <span>
                  Mostrando <strong className="font-mono font-bold text-primary">{filteredCatedras.length}</strong> de <span className="font-mono">{catedrasList.length}</span> cátedras
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-0.5 hover:bg-primary/20 rounded-full transition-colors text-primary ml-0.5 cursor-pointer"
                  title="Limpiar búsqueda"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Chips de filtro por nivel */}
            <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/80 dark:border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setLevelFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  levelFilter === 'ALL'
                    ? 'bg-surface text-primary shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Todas ({catedrasList.length})
              </button>
              <button
                type="button"
                onClick={() => setLevelFilter('TERCIARIO')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  levelFilter === 'TERCIARIO'
                    ? 'bg-surface text-primary shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Terciario
              </button>
              <button
                type="button"
                onClick={() => setLevelFilter('SECUNDARIO')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  levelFilter === 'SECUNDARIO'
                    ? 'bg-surface text-primary shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Secundario
              </button>
            </div>
          </div>
        </div>

        {/* Grilla Responsive de Cátedras Bento */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <SkeletonCatedraCard count={3} />
          </div>
        ) : filteredCatedras.length === 0 ? (
          <EmptyState
            illustration={searchQuery ? "search" : "folder"}
            title={searchQuery ? `No se encontraron cátedras que coincidan con "${searchQuery}"` : "No hay cátedras registradas"}
            description={
              searchQuery
                ? `No hay materias ni colegios que coincidan con "${searchQuery}". Intenta con otro término de búsqueda o cambia de nivel.`
                : 'Aún no has registrado materias en este ciclo lectivo o nivel educativo.'
            }
            actionLabel={searchQuery ? "Restablecer Vista" : "Crear Primera Cátedra"}
            actionIcon={searchQuery ? X : Plus}
            onAction={() => {
              if (searchQuery) {
                setSearchQuery('');
                setLevelFilter('ALL');
              } else {
                setIsModalOpen(true);
              }
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCatedras.map((cat) => {
              const hasClases = Boolean(cat.ultima_clase);
              const ultClase = cat.ultima_clase;
              const asistPromedio = cat.asistencia_promedio;

              return (
                <div
                  key={cat.id}
                  className="backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs hover:shadow-md hover:-translate-y-1 hover:border-primary/40 transition-all duration-200 flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    {/* Encabezado: Badges Nivel + Modalidad + Flecha de Acceso */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant={cat.nivel === 'TERCIARIO' ? 'primary' : 'warning'}>
                          {cat.nivel}
                        </Badge>
                        <Badge variant="default">
                          {cat.modalidad}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1 relative">
                        {/* Botón Acción Rápida: Editar Cátedra */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCatedra(cat);
                          }}
                          className="p-1.5 rounded-xl text-text-muted hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
                          title="Modificar o editar cátedra"
                          aria-label="Modificar o editar cátedra"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* Menú Contextual (...) */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuCatedraId(prev => prev === cat.id ? null : cat.id);
                            }}
                            className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                            title="Más opciones de cátedra"
                            aria-label="Más opciones de cátedra"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuCatedraId === cat.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-30" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuCatedraId(null);
                                }} 
                              />
                              <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-1.5 z-40 animate-fadeIn space-y-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuCatedraId(null);
                                    setEditingCatedra(cat);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-text-primary hover:text-primary hover:bg-primary/10 rounded-xl transition-colors cursor-pointer text-left"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span>Editar Configuración</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuCatedraId(null);
                                    navigate(`/catedra/${cat.id}?tab=asistencias`);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-left"
                                >
                                  <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  <span>Asistencias</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuCatedraId(null);
                                    navigate(`/catedra/${cat.id}?tab=calificaciones`);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-left"
                                >
                                  <GraduationCap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                  <span>Calificaciones</span>
                                </button>
                                <div className="border-t border-slate-100 dark:border-white/10 my-1" />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuCatedraId(null);
                                    navigate(`/catedra/${cat.id}`);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-left"
                                >
                                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>Ir a la Cátedra</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Botón Ir a la Cátedra */}
                        <button
                          type="button"
                          onClick={() => navigate(`/catedra/${cat.id}`)}
                          className="p-1.5 rounded-xl text-text-muted group-hover:text-primary group-hover:bg-primary/10 transition-all cursor-pointer"
                          title="Ver detalle de la cátedra"
                          aria-label="Ver detalle de la cátedra"
                        >
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>

                    {/* Título de la Asignatura */}
                    <div>
                      <h3
                        onClick={() => navigate(`/catedra/${cat.id}`)}
                        className="text-base font-bold text-text-primary group-hover:text-primary cursor-pointer transition-colors leading-snug line-clamp-2"
                        title={cat.nombre}
                      >
                        {cat.nombre}
                      </h3>

                      {/* Etiqueta visual de la Institución con icono */}
                      <div className="inline-flex items-center gap-1.5 mt-2 text-xs text-text-secondary bg-slate-100/70 dark:bg-slate-800/50 px-2.5 py-1 rounded-xl border border-slate-200/60 dark:border-white/5 max-w-full truncate font-medium">
                        <Building className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                        <span className="truncate">{cat.institucion_nombre}</span>
                      </div>
                    </div>

                    {/* Métricas Rápidas: Alumnos Inscriptos + Asistencia General */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2.5 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 flex items-center gap-2">
                        <Users className="w-4 h-4 text-text-muted shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] text-text-muted block uppercase font-bold tracking-wider">Inscriptos</span>
                          <span className="text-xs font-mono font-bold text-text-primary truncate block">
                            {cat.estudiantes_count} alumnos
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 flex items-center gap-2">
                        <Percent className="w-4 h-4 text-text-muted shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] text-text-muted block uppercase font-bold tracking-wider">Asist. Media</span>
                          <span className={`text-xs font-mono font-bold truncate block ${
                            asistPromedio === null 
                              ? 'text-text-muted' 
                              : asistPromedio >= 75 
                                ? 'text-emerald-600 dark:text-emerald-400' 
                                : 'text-amber-600 dark:text-amber-400'
                          }`}>
                            {asistPromedio !== null ? `${asistPromedio}%` : 'Sin clases'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* MÓDULO INTEGRADO: "ÚLTIMA CLASE REGISTRADA" */}
                    <div className="rounded-2xl border border-slate-200/60 dark:border-white/5 bg-slate-100/70 dark:bg-slate-800/50 p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          <span>Última Clase Dictada</span>
                        </span>
                        {hasClases && (
                          <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                            {formatFechaLegible(ultClase.fecha)}
                          </span>
                        )}
                      </div>

                      {hasClases ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-text-primary line-clamp-2 leading-snug">
                            {ultClase.tema || 'Clase regular sin tema especificado'}
                          </p>

                          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/50 dark:border-white/5 font-mono text-text-muted">
                            <span className="text-text-secondary">Asistencia:</span>
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3" />
                              {ultClase.presentes !== undefined 
                                ? `${ultClase.presentes}/${ultClase.totalAsist || cat.estudiantes_count} presentes` 
                                : 'Registrada'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-2 space-y-2">
                          <p className="text-[11px] text-text-muted">
                            Aún no hay sesiones de clase registradas.
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTargetCatedraForClass(cat);
                              setQuickFecha(getTodayYMD());
                              setQuickTema('');
                              setIsQuickClassModalOpen(true);
                            }}
                            className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Registrar Primera Clase</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer con Horario y Botón Ingresar */}
                  <div className="pt-4 mt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-text-muted font-mono truncate max-w-[140px]">
                      {cat.horarios_semanales?.length > 0 
                        ? `${cat.horarios_semanales[0].dia} ${cat.horarios_semanales[0].desde || ''}` 
                        : 'Horario flexible'}
                    </span>

                    <Button
                      variant="primary"
                      size="sm"
                      icon={ArrowRight}
                      onClick={() => navigate(`/catedra/${cat.id}`)}
                      className="text-xs shadow-xs rounded-xl"
                    >
                      Ingresar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. PANEL: FECHAS IMPORTANTES & AGENDA PRÓXIMA (PRÓXIMOS 15 DÍAS) */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
                Agenda Crítica & Fechas Importantes
              </h2>
              <p className="text-[11px] text-text-muted">
                Compromisos, exámenes, mesas y cierres previstos en los próximos 15 días
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsNewEventModalOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear Recordatorio</span>
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div className="h-24 rounded-2xl bg-surface-hover animate-pulse" />
            <div className="h-24 rounded-2xl bg-surface-hover animate-pulse" />
            <div className="h-24 rounded-2xl bg-surface-hover animate-pulse" />
          </div>
        ) : agendaItems.length === 0 ? (
          /* Estado vacío Bento elegante si no hay eventos próximos con ilustración Tabler */
          <div className="backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 sm:p-8 text-center space-y-3 shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] flex flex-col items-center justify-center animate-fadeInUp">
            <EmptyStateIllustration className="w-28 h-28 sm:w-36 sm:h-36 mx-auto" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-text-primary">
                No tienes compromisos ni exámenes programados para los próximos 15 días
              </h3>
              <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
                Tu agenda está al día. Puedes registrar mesas examinadoras, reuniones institucionales o entregas de notas.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={() => setIsNewEventModalOpen(true)}
              className="text-xs mx-auto active:scale-95 duration-100"
            >
              Crear Recordatorio / Evento
            </Button>
          </div>
        ) : (
          /* Grilla de eventos próximos ordenados */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {agendaItems.map((item) => {
              const styles = getAgendaColorStyles(item.tipo);
              const IconComp = styles.icon;
              const relativeTag = getRelativeDateLabel(item.fecha);

              return (
                <div
                  key={item.id}
                  className={`backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] flex flex-col justify-between gap-3 ${styles.cardBg}`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${styles.iconColor} bg-surface`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border mb-1 ${styles.badge}`}>
                          {styles.label}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-text-primary leading-snug line-clamp-2">
                          {item.titulo}
                        </h4>
                      </div>
                    </div>

                    <span className="shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-surface border border-surface-border text-text-secondary">
                      {relativeTag}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-surface-border/50 text-text-muted font-mono">
                    <span className="flex items-center gap-1 font-semibold text-text-secondary">
                      <CalendarDays className="w-3 h-3 text-text-muted" />
                      {formatFechaLegible(item.fecha)}
                    </span>
                    {item.hora && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-text-muted" />
                        {item.hora} hs
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* MODAL 1: NUEVA CÁTEDRA */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Nueva Cátedra"
        subtitle="Agrega una nueva asignatura a tu panel unificado"
      >
        <form onSubmit={handleCreateCatedra} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-danger/10 border border-danger/30 text-danger text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Institución Educativa *
            </label>
            <CustomSelect
              value={newInstitucionId}
              onChange={(val) => {
                const targetId = typeof val === 'object' ? val.target.value : val;
                setNewInstitucionId(targetId);
                const inst = instituciones.find(i => i.id === targetId);
                if (inst?.nivel) setNewNivel(inst.nivel);
              }}
              options={instituciones.map(inst => ({
                value: inst.id,
                label: `${inst.nombre} (${inst.nivel})`,
                badge: inst.nivel === 'TERCIARIO' ? 'Terc.' : 'Sec.'
              }))}
              placeholder="Seleccionar institución..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Nombre de la Asignatura / Cátedra *
            </label>
            <input
              type="text"
              value={newNombre}
              onChange={(e) => setNewNombre(e.target.value)}
              placeholder="Ej: Programación II, Historia Argentina, Matemática..."
              className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
                Nivel Académico
              </label>
              <CustomSelect
                value={newNivel}
                onChange={(val) => setNewNivel(typeof val === 'object' ? val.target.value : val)}
                options={[
                  { value: 'TERCIARIO', label: 'Terciario / Superior' },
                  { value: 'SECUNDARIO', label: 'Secundario' }
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
                Modalidad
              </label>
              <CustomSelect
                value={newModalidad}
                onChange={(val) => setNewModalidad(typeof val === 'object' ? val.target.value : val)}
                options={[
                  { value: '1° CUATRIMESTRE', label: '1° Cuatrimestre', badge: '1° Cuat.' },
                  { value: '2° CUATRIMESTRE', label: '2° Cuatrimestre', badge: '2° Cuat.' },
                  { value: 'ANUAL', label: 'Anual', badge: 'Anual' },
                  { value: 'CUATRIMESTRAL', label: 'Cuatrimestral (Genérico)', badge: 'Cuat.' }
                ]}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={savingCatedra}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingCatedra}
            >
              Crear Cátedra
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: REGISTRAR PRIMERA CLASE RÁPIDA */}
      <Modal
        isOpen={isQuickClassModalOpen}
        onClose={() => setIsQuickClassModalOpen(false)}
        title="Registrar Primera Sesión de Clase"
        subtitle={targetCatedraForClass ? `${targetCatedraForClass.nombre} • ${targetCatedraForClass.institucion_nombre}` : ''}
      >
        <form onSubmit={handleQuickCreateClase} className="space-y-4">
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-xs text-text-secondary leading-relaxed flex items-start gap-2.5">
            <CheckCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>
              Al guardar la primera clase, todos los estudiantes matriculados en la cátedra quedarán registrados como <strong>PRESENTE</strong> de manera automática.
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase text-text-secondary">
                Fecha de la Sesión *
              </label>
              <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                {formatFechaDMY(quickFecha)} (DD-MM-YYYY)
              </span>
            </div>
            <input
              type="date"
              required
              value={quickFecha}
              onChange={(e) => setQuickFecha(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Tema o Contenido Dictado
            </label>
            <input
              type="text"
              placeholder="Ej: Presentación de la Cátedra, Pautas y Unidad 1"
              value={quickTema}
              onChange={(e) => setQuickTema(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsQuickClassModalOpen(false)}
              disabled={savingQuickClass}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingQuickClass}
            >
              Guardar Primera Clase
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: CREAR EVENTO / RECORDATORIO RÁPIDO */}
      <Modal
        isOpen={isNewEventModalOpen}
        onClose={() => setIsNewEventModalOpen(false)}
        title="Crear Recordatorio o Evento en Agenda"
        subtitle="Agrega mesas de examen, reuniones o fechas límite para los próximos días"
      >
        <form onSubmit={handleCreateQuickEvent} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Título del Compromiso *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Mesa de Examen Final, Jornada Institucional, Entrega de Actas..."
              value={newEventTitulo}
              onChange={(e) => setNewEventTitulo(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
                Tipo de Evento *
              </label>
              <CustomSelect
                value={newEventTipo}
                onChange={(val) => setNewEventTipo(typeof val === 'object' ? val.target.value : val)}
                options={[
                  { value: 'TRIBUNAL_EXAMEN', label: 'Mesa / Tribunal de Examen', badge: 'Examen' },
                  { value: 'REUNION', label: 'Reunión Institucional', badge: 'Reunión' },
                  { value: 'PERIODO', label: 'Cierre de Período / Notas', badge: 'Cierre' },
                  { value: 'CLASE', label: 'Clase Especial', badge: 'Clase' },
                  { value: 'OTRO', label: 'Otro Compromiso', badge: 'General' }
                ]}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase text-text-secondary">
                  Fecha *
                </label>
                <span className="text-[10px] font-mono text-primary font-bold">
                  {formatFechaDMY(newEventFecha)}
                </span>
              </div>
              <input
                type="date"
                required
                value={newEventFecha}
                onChange={(e) => setNewEventFecha(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Hora de Inicio (Opcional)
            </label>
            <input
              type="time"
              value={newEventHora}
              onChange={(e) => setNewEventHora(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Notas o Detalles (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Detalle de aula, cátedras participantes o pautas de entrega..."
              value={newEventNotas}
              onChange={(e) => setNewEventNotas(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsNewEventModalOpen(false)}
              disabled={savingEvent}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingEvent}
            >
              Guardar Evento en Agenda
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: MODIFICAR / EDITAR CÁTEDRA */}
      {editingCatedra && (
        <Suspense fallback={null}>
          <EditarCatedraModal
            isOpen={Boolean(editingCatedra)}
            onClose={() => setEditingCatedra(null)}
            catedra={editingCatedra}
            onCatedraUpdated={(updated) => {
              setCatedrasList(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
              setEditingCatedra(null);
              if (refreshData) refreshData();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
