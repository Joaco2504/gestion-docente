import { parseISO, format, addDays, isBefore, isEqual, isValid } from 'date-fns';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { esFechaFeriado, normalizarTexto } from './feriadosAcademicos';
import { getTodayYMD } from '../lib/dateUtils';

// Mapeo canónico de nombres de días a índices (0: domingo, 1: lunes, ..., 6: sábado)
const DIA_A_NUMERO = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6
};

/**
 * Obtiene el conjunto de números de día (1 a 6) configurados para la cátedra
 */
export function getDiasNumerosCatedra(horariosSemanales = []) {
  const diasSet = new Set();
  (horariosSemanales || []).forEach(h => {
    if (!h?.dia) return;
    const clean = normalizarTexto(h.dia);
    if (clean in DIA_A_NUMERO) {
      diasSet.add(DIA_A_NUMERO[clean]);
    }
  });
  return diasSet;
}

/**
 * Calcula las fechas de clases que deberían existir hasta la fecha límite (por defecto, hoy)
 * omitiendo feriados y clases ya registradas.
 */
export function calcularClasesPendientes({
  catedraId,
  horariosSemanales = [],
  clasesExistentes = [],
  fechaInicio,
  fechaFin = getTodayYMD()
}) {
  if (!catedraId || !horariosSemanales || horariosSemanales.length === 0) {
    return [];
  }

  const diasCatedra = getDiasNumerosCatedra(horariosSemanales);
  if (diasCatedra.size === 0) {
    return [];
  }

  const fechasExistentesSet = new Set(
    (clasesExistentes || []).map(c => String(c.fecha || '').split('T')[0]).filter(Boolean)
  );

  // Determinar fecha de inicio del rastreo:
  // Si no se provee, rastrear desde los últimos 30 días o desde la fecha más reciente registrada
  let startDate;
  if (fechaInicio) {
    startDate = parseISO(fechaInicio);
  } else {
    // Si hay clases, tomar la última fecha registrada menos 7 días, o 30 días atrás
    const hoy = parseISO(fechaFin);
    startDate = addDays(hoy, -30);
  }

  const endDate = parseISO(fechaFin);
  if (!isValid(startDate) || !isValid(endDate) || isBefore(endDate, startDate)) {
    return [];
  }

  let cur = startDate;
  const nuevasClases = [];
  let ultimoNumero = (clasesExistentes || []).reduce((max, c) => Math.max(max, Number(c.numero_clase) || 0), 0);

  while (isBefore(cur, endDate) || isEqual(cur, endDate)) {
    const dayOfWeek = cur.getDay(); // 0 = domingo, 1 = lunes, ...
    const dateStr = format(cur, 'yyyy-MM-dd');

    // 1. Debe ser un día de cursada de la cátedra
    if (diasCatedra.has(dayOfWeek)) {
      // 2. NO debe ser feriado
      if (!esFechaFeriado(dateStr)) {
        // 3. NO debe existir ya en la base de datos
        if (!fechasExistentesSet.has(dateStr)) {
          ultimoNumero += 1;
          nuevasClases.push({
            id: `clase-auto-${Date.parse(dateStr)}`,
            catedra_id: catedraId,
            fecha: dateStr,
            tema: 'Clase en curso (Tema pendiente)',
            unidad: null,
            unidad_id: null,
            estado: 'DICTADA',
            autogenerada: true,
            numero_clase: ultimoNumero
          });
          fechasExistentesSet.add(dateStr);
        }
      }
    }

    cur = addDays(cur, 1);
  }

  return nuevasClases;
}

/**
 * Asegura la autogeneración e inserción de clases hasta el día de la fecha.
 */
export async function ensureScheduledClassesToDate(catedra, existingClases = [], isDemo = false) {
  if (!catedra?.id) {
    return { nuevas: [], all: existingClases };
  }

  const horarios = Array.isArray(catedra.horarios_semanales) ? catedra.horarios_semanales : [];
  if (horarios.length === 0) {
    return { nuevas: [], all: existingClases };
  }

  const nuevas = calcularClasesPendientes({
    catedraId: catedra.id,
    horariosSemanales: horarios,
    clasesExistentes: existingClases,
    fechaFin: getTodayYMD()
  });

  if (nuevas.length === 0) {
    return { nuevas: [], all: existingClases };
  }

  // Persistir en Supabase si está disponible
  if (isSupabaseConfigured && !isDemo) {
    try {
      const rowsToInsert = nuevas.map(c => ({
        catedra_id: c.catedra_id,
        fecha: c.fecha,
        tema: c.tema,
        unidad: c.unidad,
        estado: c.estado,
        numero_clase: c.numero_clase
      }));

      const { data, error } = await supabase
        .from('clases')
        .upsert(rowsToInsert, { onConflict: 'catedra_id, fecha' })
        .select();

      if (!error && data && data.length > 0) {
        // Reemplazar IDs temporales por los reales generados
        const dataMap = new Map(data.map(d => [d.fecha, d]));
        const mergedNuevas = nuevas.map(n => dataMap.get(n.fecha) || n);
        const allCombined = [...existingClases, ...mergedNuevas].sort((a, b) => b.fecha.localeCompare(a.fecha));
        return { nuevas: mergedNuevas, all: allCombined };
      }
    } catch (err) {
      console.warn('Aviso asegurando clases programadas en Supabase:', err);
    }
  }

  // Fallback demo / offline
  const allCombined = [...existingClases, ...nuevas].sort((a, b) => b.fecha.localeCompare(a.fecha));
  try {
    localStorage.setItem(`clases_${catedra.id}`, JSON.stringify(allCombined));
  } catch (e) {}

  return { nuevas, all: allCombined };
}
