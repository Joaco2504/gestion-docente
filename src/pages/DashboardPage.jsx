import React, { useState, useEffect, useMemo } from 'react';
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
  ExternalLink
} from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { SkeletonCatedraCard } from '../components/common/SkeletonLoader';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
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
  const { instituciones, activeInstitucion, activeCiclo, refreshData } = useApp();

  // Primary Data States
  const [loading, setLoading] = useState(true);
  const [catedrasList, setCatedrasList] = useState([]);
  const [agendaItems, setAgendaItems] = useState([]);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL'); // 'ALL' | 'TERCIARIO' | 'SECUNDARIO'
  const [selectedInstFilter, setSelectedInstFilter] = useState('ALL');

  // Modal Nueva Cátedra
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newInstitucionId, setNewInstitucionId] = useState('');
  const [newNivel, setNewNivel] = useState('TERCIARIO');
  const [newModalidad, setNewModalidad] = useState('ANUAL');
  const [savingCatedra, setSavingCatedra] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

          // Obtener la clase más reciente de cada cátedra
          const allClases = clasesRes.data || [];
          const latestClaseIds = [];
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
      console.error('Error fetching dashboard data:', err);
      toast.error('Error al cargar datos del panel: ' + err.message);
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

  /**
   * Filtrado y búsqueda interactiva de cátedras
   */
  const filteredCatedras = useMemo(() => {
    return catedrasList.filter(cat => {
      // Filtro por Nivel
      if (levelFilter !== 'ALL' && cat.nivel !== levelFilter) {
        return false;
      }
      // Filtro por Institución si el usuario lo desea
      if (selectedInstFilter !== 'ALL' && cat.institucion_id !== selectedInstFilter) {
        return false;
      }
      // Búsqueda por texto (nombre de cátedra o institución)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = cat.nombre?.toLowerCase().includes(q);
        const matchesInst = cat.institucion_nombre?.toLowerCase().includes(q);
        if (!matchesName && !matchesInst) return false;
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
        const { data, error } = await supabase
          .from('catedras')
          .insert({
            docente_id: user.id,
            institucion_id: targetInstId,
            ciclo_id: activeCiclo?.id || null,
            nombre: newNombre.trim(),
            nivel: newNivel,
            modalidad: newModalidad,
            horarios_semanales: []
          })
          .select(`
            *,
            instituciones (
              id,
              nombre,
              nivel
            )
          `)
          .single();

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
      console.error('Error creating cátedra:', err);
      setErrorMsg(err.message || 'Error al crear la cátedra');
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
          await supabase.from('asistencias').upsert(autoAsist, { onConflict: 'clase_id,estudiante_id' });
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
      toast.error('Error al registrar clase: ' + err.message);
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
      const startDateTime = `${fechaIso}T${newEventHora || '08:00'}:00`;
      const endDateTime = `${fechaIso}T10:00:00`;

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
      toast.error('Error al agendar evento: ' + err.message);
    } finally {
      setSavingEvent(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* 1. WELCOME HEADER & QUICK SUMMARY */}
      <div className="bg-surface rounded-3xl p-5 sm:p-7 border border-surface-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        {/* Glow decorativo sutil en azul Francia */}
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
              Panel de Control Central
            </span>
            <span className="text-xs text-text-muted flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{formatFechaLegible(new Date())}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            ¡Hola, {user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Profesor'}!
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary max-w-2xl leading-relaxed">
            Vista unificada de todas tus cátedras, agenda de compromisos para los próximos 15 días y seguimiento de la última clase dictada.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 flex-wrap sm:flex-nowrap">
          <Button
            variant="outline"
            icon={CalendarIcon}
            onClick={() => navigate('/calendario')}
            className="flex-1 sm:flex-initial text-xs"
          >
            Ver Calendario
          </Button>

          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              setErrorMsg('');
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-initial text-xs shadow-xs"
          >
            Nueva Cátedra
          </Button>
        </div>
      </div>

      {/* 2. PANEL SUPERIOR: FECHAS IMPORTANTES & AGENDA PRÓXIMA (PRÓXIMOS 15 DÍAS) */}
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
          /* Estado vacío elegante si no hay eventos próximos */
          <div className="p-6 rounded-2xl bg-surface border border-surface-border text-center space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-surface-hover text-text-muted flex items-center justify-center mx-auto">
              <CalendarIcon className="w-5 h-5 opacity-60" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                No tienes compromisos ni exámenes programados para los próximos 15 días
              </h3>
              <p className="text-xs text-text-muted mt-0.5 max-w-md mx-auto">
                Tu agenda está al día. Puedes registrar mesas examinadoras, reuniones institucionales o entregas de notas.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={() => setIsNewEventModalOpen(true)}
              className="text-xs mx-auto"
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
                  className={`p-4 rounded-2xl border transition-all shadow-xs flex flex-col justify-between gap-3 ${styles.cardBg}`}
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

      {/* 3. SECCIÓN PRINCIPAL: TODAS MIS CÁTEDRAS (VISTA GLOBAL UNIFICADA) */}
      <section className="space-y-4">
        {/* Cabecera de Cátedras con Filtros y Buscador */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
                Todas Mis Cátedras
              </h2>
              <p className="text-[11px] text-text-muted">
                {catedrasList.length} materias activas (Secundario y Terciario unificadas)
              </p>
            </div>
          </div>

          {/* Barra de Filtros interactiva */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Buscador de texto */}
            <div className="relative flex-1 sm:w-60 min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Buscar materia o colegio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-surface-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Chips de filtro por nivel */}
            <div className="flex items-center bg-surface-hover/80 p-1 rounded-xl border border-surface-border shrink-0">
              <button
                type="button"
                onClick={() => setLevelFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
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
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
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
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
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

        {/* Grilla Responsive de Cátedras */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <SkeletonCatedraCard count={3} />
          </div>
        ) : filteredCatedras.length === 0 ? (
          <Card className="text-center py-14">
            <div className="w-12 h-12 rounded-2xl bg-surface-hover text-text-muted flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-6 h-6 opacity-60" />
            </div>
            <h3 className="text-sm font-bold text-text-primary mb-1">
              No se encontraron cátedras con los filtros actuales
            </h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto mb-4">
              {searchQuery
                ? `No hay resultados para "${searchQuery}". Intenta con otro término.`
                : 'Aún no has registrado cátedras en este nivel.'}
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSearchQuery(''); setLevelFilter('ALL'); }}
              >
                Restablecer Filtros
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCatedras.map((cat) => {
              const hasClases = Boolean(cat.ultima_clase);
              const ultClase = cat.ultima_clase;
              const asistPromedio = cat.asistencia_promedio;

              return (
                <Card
                  key={cat.id}
                  hover
                  className="flex flex-col justify-between group transition-all duration-200 border-surface-border hover:border-primary/40 hover:shadow-md p-5"
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

                      <button
                        type="button"
                        onClick={() => navigate(`/catedra/${cat.id}`)}
                        className="p-1 rounded-lg text-text-muted group-hover:text-primary group-hover:bg-primary/10 transition-all"
                        title="Ver detalle completo de la cátedra"
                      >
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </button>
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
                      <div className="inline-flex items-center gap-1.5 mt-1.5 text-xs text-text-secondary bg-surface-hover/70 px-2.5 py-1 rounded-lg border border-surface-border/60 max-w-full truncate">
                        <Building className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                        <span className="truncate font-medium">{cat.institucion_nombre}</span>
                      </div>
                    </div>

                    {/* Métricas Rápidas: Alumnos Inscriptos + Asistencia General */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2.5 rounded-xl bg-surface-hover/40 border border-surface-border/60 flex items-center gap-2">
                        <Users className="w-4 h-4 text-text-muted shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] text-text-muted block uppercase font-bold tracking-wider">Inscriptos</span>
                          <span className="text-xs font-mono font-bold text-text-primary truncate block">
                            {cat.estudiantes_count} alumnos
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-surface-hover/40 border border-surface-border/60 flex items-center gap-2">
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

                    {/* C. MÓDULO INTEGRADO: "ÚLTIMA CLASE REGISTRADA" */}
                    <div className="rounded-2xl border border-surface-border bg-surface-hover/60 p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          <span>Última Clase Dictada</span>
                        </span>
                        {hasClases && (
                          <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                            {formatFechaLegible(ultClase.fecha)}
                          </span>
                        )}
                      </div>

                      {hasClases ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-text-primary line-clamp-2 leading-snug">
                            {ultClase.tema || 'Clase regular sin tema especificado'}
                          </p>

                          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-surface-border/60 font-mono text-text-muted">
                            <span className="text-text-secondary">Asistencia de la sesión:</span>
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3" />
                              {ultClase.presentes !== undefined 
                                ? `${ultClase.presentes}/${ultClase.totalAsist || cat.estudiantes_count} presentes` 
                                : 'Registrada'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* Si no tiene clases registradas aún */
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
                            className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all touch-target-44"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Registrar Primera Clase</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer con Botón Principal "Ingresar a la Cátedra" */}
                  <div className="pt-4 mt-2 border-t border-surface-border flex items-center justify-between gap-3">
                    <span className="text-[11px] text-text-muted font-mono">
                      {cat.horarios_semanales?.length > 0 
                        ? `${cat.horarios_semanales[0].dia} ${cat.horarios_semanales[0].desde || ''}` 
                        : 'Horario flexible'}
                    </span>

                    <Button
                      variant="primary"
                      size="sm"
                      icon={ArrowRight}
                      onClick={() => navigate(`/catedra/${cat.id}`)}
                      className="text-xs shadow-xs"
                    >
                      Ingresar a la Cátedra
                    </Button>
                  </div>
                </Card>
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
            <select
              value={newInstitucionId}
              onChange={(e) => {
                setNewInstitucionId(e.target.value);
                const inst = instituciones.find(i => i.id === e.target.value);
                if (inst?.nivel) setNewNivel(inst.nivel);
              }}
              className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
            >
              {instituciones.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.nombre} ({inst.nivel})
                </option>
              ))}
            </select>
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
              <select
                value={newNivel}
                onChange={(e) => setNewNivel(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
              >
                <option value="TERCIARIO">Terciario / Superior</option>
                <option value="SECUNDARIO">Secundario</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
                Modalidad
              </label>
              <select
                value={newModalidad}
                onChange={(e) => setNewModalidad(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
              >
                <option value="ANUAL">Anual</option>
                <option value="CUATRIMESTRAL">Cuatrimestral</option>
              </select>
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
              <select
                value={newEventTipo}
                onChange={(e) => setNewEventTipo(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary cursor-pointer"
              >
                <option value="TRIBUNAL_EXAMEN">Mesa / Tribunal de Examen (Rojo/Violeta)</option>
                <option value="REUNION">Reunión Institucional (Azul/Índigo)</option>
                <option value="PERIODO">Cierre de Período / Notas (Ámbar/Naranja)</option>
                <option value="CLASE">Clase Especial</option>
                <option value="OTRO">Otro Compromiso</option>
              </select>
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
    </div>
  );
}
