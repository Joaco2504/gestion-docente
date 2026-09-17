/**
 * Servicio de Generación de Notificaciones Dinámicas Automáticas
 * 
 * Lógica de avisos basada en datos cargados:
 * 1. Recordatorios de próximas mesas de examen constituidas con fecha cercana (próximos 14 días o día de hoy).
 * 2. Avisos de clases registradas en la semana en curso.
 * 3. Alertas de alumnos en riesgo académico por baja asistencia (< 70% según normativa RAM).
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { calcularPorcentajeAsistencia } from '../lib/academicLogic';
import { formatFechaDMY, getTodayYMD } from '../lib/dateUtils';

const STORAGE_READ_KEY = 'docentepro_notificaciones_read';
const STORAGE_DISMISSED_KEY = 'docentepro_notificaciones_dismissed';

export function getStoredReadIds() {
  try {
    const raw = localStorage.getItem(STORAGE_READ_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (_) {
    return new Set();
  }
}

export function saveStoredReadIds(set) {
  try {
    localStorage.setItem(STORAGE_READ_KEY, JSON.stringify(Array.from(set)));
  } catch (_) {}
}

export function getStoredDismissedIds() {
  try {
    const raw = localStorage.getItem(STORAGE_DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (_) {
    return new Set();
  }
}

export function saveStoredDismissedIds(set) {
  try {
    localStorage.setItem(STORAGE_DISMISSED_KEY, JSON.stringify(Array.from(set)));
  } catch (_) {}
}

/**
 * Obtiene el rango de fecha de la semana en curso (Lunes 00:00 a Domingo 23:59)
 */
function getCurrentWeekRange() {
  const now = new Date();
  const day = now.getDay();
  // En JS 0 = Domingo, 1 = Lunes
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const formatIsoDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayStr}`;
  };

  return {
    mondayDate: monday,
    sundayDate: sunday,
    mondayIso: formatIsoDate(monday),
    sundayIso: formatIsoDate(sunday)
  };
}

/**
 * 1. Recordatorios de próximas mesas de examen constituidas con fecha cercana
 */
async function getMesasNotifications({ user, isDemo, catedras = [] }) {
  const notifs = [];
  const todayYMD = getTodayYMD();
  const todayDate = new Date(todayYMD + 'T00:00:00');

  let mesas = [];

  if (isSupabaseConfigured && !isDemo && user?.id) {
    try {
      const { data, error } = await supabase
        .from('mesas_examen')
        .select(`
          id, fecha, turno_llamado, condicion_acta, tipo_mesa, libro, tomo, folio, acta_numero,
          catedras ( id, nombre )
        `)
        .eq('docente_id', user.id)
        .order('fecha', { ascending: true });

      if (!error && data) {
        mesas = data;
      }
    } catch (err) {
      console.warn('Aviso cargando mesas en notificationService:', err);
    }
  }

  // Fallback a localStorage o demo
  if (mesas.length === 0) {
    try {
      const stored = localStorage.getItem('mesas_examen_all');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          mesas = parsed;
        }
      }
    } catch (_) {}
  }

  // Si está en modo demo o vacío, sembrar mesas de muestra para fecha de hoy
  if (mesas.length === 0 && (isDemo || !isSupabaseConfigured)) {
    const sampleCat = catedras[0] || { id: 'cat-1', nombre: 'Programación y Algoritmos II' };
    mesas = [
      {
        id: 'mesa-demo-promo-1',
        catedra_id: sampleCat.id,
        fecha: todayYMD,
        turno_llamado: 'PROMOCIONAL DIRECTA',
        condicion_acta: 'PROMOCIONAL',
        libro: 'IX',
        folio: '45',
        catedras: { id: sampleCat.id, nombre: sampleCat.nombre }
      },
      {
        id: 'mesa-demo-reg-1',
        catedra_id: sampleCat.id,
        fecha: todayYMD,
        turno_llamado: '1° LLAMADO REGULAR',
        condicion_acta: 'REGULAR',
        libro: 'VIII',
        folio: '142',
        catedras: { id: sampleCat.id, nombre: sampleCat.nombre }
      }
    ];
  }

  mesas.forEach(m => {
    if (!m.fecha) return;
    const cleanFecha = String(m.fecha).split('T')[0];
    const mesaDate = new Date(cleanFecha + 'T00:00:00');
    if (isNaN(mesaDate.getTime())) return;

    const diffDays = Math.round((mesaDate.getTime() - todayDate.getTime()) / 86400000);
    const catNombre = m.catedras?.nombre || 'Cátedra';
    const turno = m.turno_llamado || 'Mesa de Examen';
    const condicion = m.condicion_acta || 'REGULAR';

    // Mesas para hoy
    if (diffDays === 0) {
      notifs.push({
        id: `notif-mesa-today-${m.id}`,
        categoria: 'mesa',
        tipo: 'warning',
        titulo: `¡Hoy! Mesa de Examen: ${turno}`,
        mensaje: `Hoy se sustancia la mesa de "${catNombre}" (${condicion}). Libro: ${m.libro || '—'} / Folio: ${m.folio || '—'}.`,
        codigo: 'MESA-HOY',
        fecha: new Date(cleanFecha + 'T08:00:00'),
        link: `/mesas-examen?mesaId=${m.id}`
      });
    } 
    // Mesas para mañana
    else if (diffDays === 1) {
      notifs.push({
        id: `notif-mesa-tomorrow-${m.id}`,
        categoria: 'mesa',
        tipo: 'warning',
        titulo: `Mesa de Examen Mañana: ${turno}`,
        mensaje: `Mañana se constituye la mesa de "${catNombre}" (${condicion}). Revisa la nómina de alumnos inscriptos.`,
        codigo: 'MESA-PROX',
        fecha: new Date(cleanFecha + 'T08:00:00'),
        link: `/mesas-examen?mesaId=${m.id}`
      });
    }
    // Mesas en los próximos 14 días
    else if (diffDays > 1 && diffDays <= 14) {
      notifs.push({
        id: `notif-mesa-prox-${m.id}`,
        categoria: 'mesa',
        tipo: 'info',
        titulo: `Próxima Mesa: ${turno}`,
        mensaje: `En ${diffDays} días (${formatFechaDMY(cleanFecha)}): Mesa de "${catNombre}" (${condicion}).`,
        codigo: 'MESA-PROX',
        fecha: new Date(cleanFecha + 'T08:00:00'),
        link: `/mesas-examen?mesaId=${m.id}`
      });
    }
    // Mesas concluidas en los últimos 2 días para recordar asentar actas
    else if (diffDays >= -2 && diffDays < 0) {
      notifs.push({
        id: `notif-mesa-recent-${m.id}`,
        categoria: 'mesa',
        tipo: 'info',
        titulo: `Mesa Reciente: ${turno}`,
        mensaje: `Mesa del ${formatFechaDMY(cleanFecha)} ("${catNombre}"): Recuerda asentar las calificaciones definitivas en el libro matriz.`,
        codigo: 'MESA-ACTA',
        fecha: new Date(cleanFecha + 'T18:00:00'),
        link: `/mesas-examen?mesaId=${m.id}`
      });
    }
  });

  return notifs;
}

/**
 * 2. Avisos de clases registradas en la semana en curso
 */
async function getClasesSemanaNotifications({ user, isDemo, catedras = [] }) {
  const notifs = [];
  const { mondayIso, sundayIso } = getCurrentWeekRange();
  const todayYMD = getTodayYMD();

  const catedraIds = catedras.map(c => c.id).filter(Boolean);
  if (catedraIds.length === 0) return notifs;

  let allClases = [];

  if (isSupabaseConfigured && !isDemo && user?.id) {
    try {
      const { data, error } = await supabase
        .from('clases')
        .select(`
          id, fecha, tema, catedra_id,
          catedras ( id, nombre )
        `)
        .in('catedra_id', catedraIds)
        .gte('fecha', mondayIso)
        .lte('fecha', sundayIso)
        .order('fecha', { ascending: false });

      if (!error && data) {
        allClases = data;
      }
    } catch (err) {
      console.warn('Aviso cargando clases semanales en notificationService:', err);
    }
  }

  // Fallback a localStorage por cátedra
  if (allClases.length === 0) {
    catedras.forEach(cat => {
      try {
        const stored = localStorage.getItem(`clases_${cat.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            parsed.forEach(cl => {
              if (!cl.fecha) return;
              const clFecha = String(cl.fecha).split('T')[0];
              if (clFecha >= mondayIso && clFecha <= sundayIso) {
                allClases.push({
                  ...cl,
                  catedra_id: cat.id,
                  catedras: { id: cat.id, nombre: cat.nombre }
                });
              }
            });
          }
        }
      } catch (_) {}
    });
  }

  // Si no hay clases registradas en la semana actual en modo demo, sembramos un aviso demostrativo útil
  if (allClases.length === 0 && (isDemo || !isSupabaseConfigured)) {
    const firstCat = catedras[0] || { id: 'cat-1', nombre: 'Programación y Algoritmos II' };
    allClases.push({
      id: `clase-demo-sem-${firstCat.id}`,
      fecha: todayYMD,
      tema: 'Estructuras de datos dinámicas y colecciones en memoria',
      catedra_id: firstCat.id,
      catedras: { id: firstCat.id, nombre: firstCat.nombre }
    });
  }

  // Agrupar clases por cátedra
  const clasesPorCatedra = {};
  allClases.forEach(cl => {
    const cId = cl.catedra_id || cl.catedras?.id;
    if (!cId) return;
    if (!clasesPorCatedra[cId]) {
      clasesPorCatedra[cId] = [];
    }
    clasesPorCatedra[cId].push(cl);
  });

  Object.entries(clasesPorCatedra).forEach(([cId, cList]) => {
    const catObj = catedras.find(c => c.id === cId);
    const catNombre = catObj?.nombre || cList[0]?.catedras?.nombre || 'Cátedra';
    const lastClase = cList[0]; // La más reciente
    const count = cList.length;

    notifs.push({
      id: `notif-clase-sem-${cId}-${mondayIso}`,
      categoria: 'clase',
      tipo: 'info',
      titulo: 'Clases Registradas en la Semana',
      mensaje: `"${catNombre}": Se registraron ${count} ${count === 1 ? 'clase' : 'clases'} esta semana. Último tema: "${lastClase.tema || 'Dictado regular'}" (${formatFechaDMY(lastClase.fecha)}).`,
      codigo: 'CLASE-SEMANA',
      fecha: new Date(lastClase.fecha + 'T12:00:00'),
      link: `/catedra/${cId}?tab=clases`
    });
  });

  return notifs;
}

/**
 * 3. Alertas de alumnos en riesgo académico por baja asistencia (< 70% RAM)
 */
async function getAsistenciaRiesgoNotifications({ user, isDemo, catedras = [] }) {
  const notifs = [];

  for (const cat of catedras) {
    if (!cat?.id) continue;
    let estudiantes = [];
    let clases = [];
    let asistencias = [];
    let inasistenciasDocente = [];

    if (isSupabaseConfigured && !isDemo && user?.id) {
      try {
        const [clRes, inasDocRes, inscRes] = await Promise.all([
          supabase.from('clases').select('id, fecha').eq('catedra_id', cat.id),
          supabase.from('inasistencias_docente').select('fecha').eq('catedra_id', cat.id),
          supabase.from('inscripciones').select('estudiante_id, estudiantes(id, apellido, nombre, dni)').eq('catedra_id', cat.id)
        ]);

        clases = clRes.data || [];
        inasistenciasDocente = inasDocRes.data || [];
        estudiantes = (inscRes.data || []).map(i => i.estudiantes).filter(Boolean);

        const clIds = clases.map(c => c.id);
        if (clIds.length > 0) {
          const { data: aData } = await supabase
            .from('asistencias')
            .select('clase_id, estudiante_id, estado')
            .in('clase_id', clIds);
          asistencias = aData || [];
        }
      } catch (err) {
        console.warn('Aviso cargando asistencias para riesgo en notificationService:', err);
      }
    }

    // Fallback local / demo
    if (estudiantes.length === 0 || clases.length === 0) {
      try {
        const storedClases = localStorage.getItem(`clases_${cat.id}`);
        const storedEst = localStorage.getItem(`estudiantes_${cat.id}`);
        const storedAsist = localStorage.getItem(`asistencias_${cat.id}`);
        const storedInas = localStorage.getItem(`inasistencias_docente_${cat.id}`);

        if (storedEst) estudiantes = JSON.parse(storedEst);
        if (storedClases) clases = JSON.parse(storedClases);
        if (storedAsist) asistencias = JSON.parse(storedAsist);
        if (storedInas) inasistenciasDocente = JSON.parse(storedInas);
      } catch (_) {}
    }

    // Si aún no hay estudiantes en modo demo, sembrar datos de muestra conocidos con alumno en riesgo
    if (estudiantes.length === 0 && (isDemo || !isSupabaseConfigured)) {
      estudiantes = [
        { id: 'est-1', dni: '40.111.222', apellido: 'Álvarez', nombre: 'Martín' },
        { id: 'est-2', dni: '39.444.555', apellido: 'Benítez', nombre: 'Lucía' },
        { id: 'est-4', dni: '38.222.333', apellido: 'Domínguez', nombre: 'Valentina' }
      ];
      clases = [
        { id: 'clase-1', fecha: '2026-03-02', tema: 'Introducción a la materia' },
        { id: 'clase-2', fecha: '2026-03-09', tema: 'Arquitectura y Modelado' }
      ];
      asistencias = [
        { clase_id: 'clase-1', estudiante_id: 'est-1', estado: 'PRESENTE' },
        { clase_id: 'clase-1', estudiante_id: 'est-2', estado: 'PRESENTE' },
        { clase_id: 'clase-1', estudiante_id: 'est-4', estado: 'AUSENTE' }, // Falta clase 1
        { clase_id: 'clase-2', estudiante_id: 'est-1', estado: 'PRESENTE' },
        { clase_id: 'clase-2', estudiante_id: 'est-2', estado: 'PRESENTE' },
        { clase_id: 'clase-2', estudiante_id: 'est-4', estado: 'PRESENTE' } // 1 presente / 2 clases = 50%
      ];
    }

    if (clases.length === 0 || estudiantes.length === 0) continue;

    const totalClases = clases.length;
    const inasDocCount = inasistenciasDocente.length;

    const atRiskStudents = [];

    estudiantes.forEach(est => {
      const studentAsists = asistencias.filter(a => a.estudiante_id === est.id);
      const asistPct = calcularPorcentajeAsistencia(studentAsists, totalClases, inasDocCount);

      // Criterio RAM de Alerta Crítica: asistencia inferior al 70%
      if (asistPct < 70) {
        atRiskStudents.push({
          est,
          asistPct
        });
      }
    });

    // Ordenar de menor porcentaje a mayor (más crítico primero)
    atRiskStudents.sort((a, b) => a.asistPct - b.asistPct);

    // Notificaciones individuales para los casos críticos (hasta 3 alumnos por cátedra)
    const topRisk = atRiskStudents.slice(0, 3);
    topRisk.forEach(({ est, asistPct }) => {
      const isExtreme = asistPct < 50;
      notifs.push({
        id: `notif-riesgo-asist-${cat.id}-${est.id}`,
        categoria: 'asistencia',
        tipo: isExtreme ? 'error' : 'warning',
        titulo: isExtreme ? 'Riesgo Crítico: Asistencia < 50%' : 'Alerta: Asistencia < 70%',
        mensaje: `${est.apellido}, ${est.nombre} (DNI ${est.dni || 'S/D'}) registra ${asistPct.toFixed(1)}% de asistencia en "${cat.nombre}" (límite mínimo RAM: 70%).`,
        codigo: isExtreme ? 'ASIST-CRITICA' : 'RIESGO-ASIST',
        fecha: new Date(),
        link: `/catedra/${cat.id}?tab=asistencias`
      });
    });

    // Si hay más de 3 alumnos en riesgo, agregar aviso general de la cátedra
    if (atRiskStudents.length > 3) {
      notifs.push({
        id: `notif-riesgo-general-${cat.id}`,
        categoria: 'asistencia',
        tipo: 'warning',
        titulo: `Alerta General de Asistencia: ${cat.nombre}`,
        mensaje: `Se detectaron ${atRiskStudents.length} alumnos con asistencia inferior al 70% reglamentario. Revisa la nómina de cursado.`,
        codigo: 'RIESGO-RAM',
        fecha: new Date(),
        link: `/catedra/${cat.id}?tab=asistencias`
      });
    }
  }

  return notifs;
}

/**
 * Consulta y unifica todas las notificaciones automáticas y dinámicas
 */
export async function fetchDynamicNotifications({ user, isDemo, catedras = [] }) {
  try {
    const [mesasNotifs, clasesNotifs, asistNotifs] = await Promise.all([
      getMesasNotifications({ user, isDemo, catedras }),
      getClasesSemanaNotifications({ user, isDemo, catedras }),
      getAsistenciaRiesgoNotifications({ user, isDemo, catedras })
    ]);

    // Ordenar: primero 'error', luego 'warning', luego 'info'
    const priorityOrder = { error: 0, warning: 1, info: 2, success: 3 };
    const merged = [...mesasNotifs, ...clasesNotifs, ...asistNotifs].sort((a, b) => {
      const pA = priorityOrder[a.tipo] ?? 99;
      const pB = priorityOrder[b.tipo] ?? 99;
      if (pA !== pB) return pA - pB;
      return new Date(b.fecha) - new Date(a.fecha);
    });

    return merged;
  } catch (err) {
    console.warn('Error en fetchDynamicNotifications:', err);
    return [];
  }
}
