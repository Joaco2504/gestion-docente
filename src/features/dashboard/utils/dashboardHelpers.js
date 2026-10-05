import { Award, Users, Clock, Calendar as CalendarIcon } from 'lucide-react';

/**
 * Normalización de texto reactiva para búsqueda de cátedras (insensible a acentos y mayúsculas)
 */
export const normalizeSearchText = (str) => {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

/**
 * Estilo y colorimetría para la agenda de eventos según especificación:
 * - Exámenes / Mesas / Tribunales: Rojo / Violeta
 * - Reuniones Institucionales / De Personal: Azul / Índigo / Sky
 * - Cierre de Períodos / Notas: Ámbar / Naranja
 */
export const getAgendaColorStyles = (tipo) => {
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
export const calculateUpcomingClass = (catedrasList) => {
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
};

/**
 * Consolida eventos de calendario y períodos en una lista ordenada por fecha
 */
export const processAgendaItems = (events, periods, todayIso, next15Days) => {
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
 * Bento Box 2: Métricas Rápidas Dinámicas (Consolidado o por Cátedra puntual)
 */
export const calculateDisplayedMetrics = (catedrasList = [], selectedMetricsCatedraId = 'all') => {
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
};

