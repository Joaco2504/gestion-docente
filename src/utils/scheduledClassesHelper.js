import { parseISO, format, addDays, isBefore, isEqual, isValid } from 'date-fns';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { normalizarTexto } from './feriadosAcademicos';
import {
  obtenerFeriadoParaFecha,
  obtenerDiasDeCursadaCatedra,
  obtenerLicenciaParaFecha
} from './licenciasHelper';
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

function esTemaFantasmaOVacio(tema) {
  if (!tema) return true;
  const clean = String(tema).trim().toLowerCase();
  return (
    !clean ||
    clean === 'sin tema asignado' ||
    clean === 'clase regular' ||
    clean === 'clase dictada regular' ||
    clean.startsWith('clase en curso') ||
    clean.startsWith('clase del ') ||
    clean.startsWith('sin actividad áulica')
  );
}

/**
 * Obtiene el conjunto de números de día (0 a 6) configurados para la cátedra
 */
export function getDiasNumerosCatedra(horariosSemanales = []) {
  const diasSet = new Set();
  (horariosSemanales || []).forEach(h => {
    if (!h) return;
    const rawDia = typeof h === 'string' || typeof h === 'number' ? h : (h.dia ?? h.dia_semana ?? h.nombre);
    if (rawDia === undefined || rawDia === null) return;
    if (typeof rawDia === 'number' && rawDia >= 0 && rawDia <= 6) {
      diasSet.add(rawDia);
      return;
    }
    const clean = normalizarTexto(String(rawDia));
    if (clean in DIA_A_NUMERO) {
      diasSet.add(DIA_A_NUMERO[clean]);
    }
  });
  return diasSet;
}

/**
 * Recalcula la numeración correlativa (#1, #2, #3...) ordenando cronológicamente (fecha ASC)
 * únicamente las clases reales de dictado (excluyendo feriados y licencias docentes).
 */
export function recalcularNumeracionCorrelativa(clasesList = [], licencias = [], catedraId = null) {
  if (!Array.isArray(clasesList) || clasesList.length === 0) return [];

  // Ordenar ascendente por fecha para numerar correlativamente
  const asc = [...clasesList].sort((a, b) =>
    String(a.fecha || '').slice(0, 10).localeCompare(String(b.fecha || '').slice(0, 10))
  );

  let counter = 0;
  const numberedMap = new Map();

  asc.forEach(c => {
    const fStr = String(c.fecha || '').slice(0, 10);
    const infoFeriado = obtenerFeriadoParaFecha(fStr, c);
    const infoLic = !infoFeriado.esFeriado
      ? obtenerLicenciaParaFecha(fStr, catedraId || c.catedra_id, licencias, c)
      : null;

    const isFeriado = infoFeriado.esFeriado;
    const isLicencia = !isFeriado && (c.estado === 'DOCENTE_AUSENTE' || Boolean(c.articulo_licencia) || Boolean(infoLic));

    if (!isFeriado && !isLicencia) {
      counter += 1;
      numberedMap.set(c.id || fStr, counter);
    } else {
      numberedMap.set(c.id || fStr, null);
    }
  });

  return clasesList.map(c => {
    const fStr = String(c.fecha || '').slice(0, 10);
    const num = numberedMap.get(c.id || fStr);
    return {
      ...c,
      numero_clase: num
    };
  });
}

/**
 * Calcula las fechas de clases que deberían existir hasta la fecha límite (por defecto, hoy)
 * respetando estrictamente los días de cursada de la cátedra.
 */
export function calcularClasesPendientes({
  catedraId,
  horariosSemanales = [],
  diasValidosOverride = null,
  clasesExistentes = [],
  fechaInicio,
  fechaFin = getTodayYMD(),
  incluirFeriados = false,
  licencias = []
}) {
  if (!catedraId) return [];

  const diasCatedra = Array.isArray(diasValidosOverride) && diasValidosOverride.length > 0
    ? new Set(diasValidosOverride)
    : getDiasNumerosCatedra(horariosSemanales);

  if (diasCatedra.size === 0) {
    return [];
  }

  const fechasExistentesSet = new Set(
    (clasesExistentes || []).map(c => String(c.fecha || '').split('T')[0]).filter(Boolean)
  );

  let startDate;
  if (fechaInicio) {
    startDate = parseISO(fechaInicio);
  } else if (fechasExistentesSet.size > 0) {
    const earliestExisting = [...fechasExistentesSet].sort()[0];
    startDate = parseISO(earliestExisting);
  } else {
    const hoy = parseISO(fechaFin);
    startDate = addDays(hoy, -30);
  }

  const endDate = parseISO(fechaFin);
  if (!isValid(startDate) || !isValid(endDate) || isBefore(endDate, startDate)) {
    return [];
  }

  let cur = startDate;
  const nuevasClases = [];
  let ultimoNumero = (clasesExistentes || []).reduce((max, c) => {
    const fStr = String(c.fecha || '').slice(0, 10);
    if (obtenerFeriadoParaFecha(fStr, c).esFeriado || c.estado === 'DOCENTE_AUSENTE') return max;
    return Math.max(max, Number(c.numero_clase) || 0);
  }, 0);

  while (isBefore(cur, endDate) || isEqual(cur, endDate)) {
    const dateStr = format(cur, 'yyyy-MM-dd');
    // Usar T12:00:00 para evitar desfases de zona horaria UTC-3
    const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay();

    // 1. Verificar estrictamente que el día de la semana pertenezca a los días de cursada
    if (diasCatedra.has(dayOfWeek) && !fechasExistentesSet.has(dateStr)) {
      const infoFeriado = obtenerFeriadoParaFecha(dateStr);

      if (infoFeriado.esFeriado) {
        if (incluirFeriados) {
          nuevasClases.push({
            id: `clase-feriado-${Date.parse(dateStr)}`,
            catedra_id: catedraId,
            fecha: dateStr,
            tema: infoFeriado.nombre,
            unidad: 'Feriado Nacional',
            unidad_id: null,
            estado: 'FERIADO',
            es_feriado: true,
            autogenerada: true,
            numero_clase: null
          });
          fechasExistentesSet.add(dateStr);
        }
      } else {
        const infoLic = obtenerLicenciaParaFecha(dateStr, catedraId, licencias);
        if (infoLic) {
          nuevasClases.push({
            id: `clase-lic-${Date.parse(dateStr)}`,
            catedra_id: catedraId,
            fecha: dateStr,
            tema: `Sin actividad áulica - Licencia Docente (${infoLic.articulo})`,
            unidad: null,
            unidad_id: null,
            estado: 'DOCENTE_AUSENTE',
            articulo_licencia: infoLic.articulo,
            observaciones: infoLic.observacion || '',
            autogenerada: true,
            numero_clase: null
          });
          fechasExistentesSet.add(dateStr);
        } else {
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
 * Asegura la autogeneración exclusiva en los días de cursada de la cátedra,
 * convierte feriados en días de cursada a estado 'FERIADO' y autolimpia clases fantasma
 * creadas en días de la semana que no corresponden a la cátedra.
 */
export async function ensureScheduledClassesToDate(catedra, existingClases = [], isDemo = false, options = {}) {
  if (!catedra?.id) {
    return { nuevas: [], all: existingClases };
  }

  const asistencias = options.asistencias || [];
  const licencias = options.licencias || [];

  // 1. Obtener días válidos de cursada (configurados o inferidos estrictamente de clases con asistencia tomada)
  const diasValidos = obtenerDiasDeCursadaCatedra(catedra, existingClases, asistencias);
  if (diasValidos.length === 0) {
    // Nunca devolver todos los días de la semana por defecto
    const normalized = recalcularNumeracionCorrelativa(existingClases, licencias, catedra.id);
    return { nuevas: [], all: normalized };
  }

  // Índices de clases que tienen asistencias tomadas por los alumnos
  const clasesConAsistIds = new Set();
  const clasesConAsistFechas = new Set();
  asistencias.forEach(a => {
    if (a?.clase_id) clasesConAsistIds.add(String(a.clase_id));
    if (a?.fecha) clasesConAsistFechas.add(String(a.fecha).slice(0, 10));
  });

  // 2. Autolimpieza de Clases Fantasma al Cargar + Normalización de Feriados en días válidos
  const phantomIdsToDelete = [];
  const feriadoUpdates = [];
  const cleanedExisting = [];

  (existingClases || []).forEach(c => {
    if (!c?.fecha) return;
    const fStr = String(c.fecha).slice(0, 10);
    const diaDeLaSemana = new Date(fStr + 'T12:00:00').getDay();
    const hasAttendance =
      clasesConAsistIds.has(String(c.id)) ||
      clasesConAsistFechas.has(fStr) ||
      c.tiene_asistencia === true ||
      Number(c.presentes) > 0;

    // Si el día de la semana NO pertenece a diasValidos y es un registro vacío/autogenerado sin asistencia tomada -> ELIMINAR
    if (!diasValidos.includes(diaDeLaSemana)) {
      if (!hasAttendance && esTemaFantasmaOVacio(c.tema)) {
        if (c.id && !String(c.id).startsWith('clase-auto-') && !String(c.id).startsWith('clase-lic-') && !String(c.id).startsWith('clase-feriado-')) {
          phantomIdsToDelete.push(c.id);
        }
        return; // Filtrar de la vista
      }
    }

    // Si el día SÍ pertenece a diasValidos (o se conserva) y cae en Feriado Oficial -> Forzar estado FERIADO
    const infoFeriado = obtenerFeriadoParaFecha(fStr, c);
    if (infoFeriado.esFeriado) {
      const needsUpdate =
        c.estado !== 'FERIADO' ||
        c.unidad !== 'Feriado Nacional' ||
        esTemaFantasmaOVacio(c.tema);

      const updatedHolidayRow = {
        ...c,
        estado: 'FERIADO',
        es_feriado: true,
        unidad: 'Feriado Nacional',
        tema: infoFeriado.nombre,
        articulo_licencia: null,
        numero_clase: null
      };

      if (needsUpdate && c.id && !String(c.id).startsWith('clase-')) {
        feriadoUpdates.push(updatedHolidayRow);
      }
      cleanedExisting.push(updatedHolidayRow);
      return;
    }

    cleanedExisting.push(c);
  });

  // Ejecutar autolimpieza remota en Supabase de clases fantasma y actualización de feriados
  if (isSupabaseConfigured && !isDemo && supabase) {
    if (phantomIdsToDelete.length > 0) {
      try {
        await supabase
          .from('clases')
          .delete()
          .in('id', phantomIdsToDelete);
      } catch (delErr) {
        console.warn('Aviso eliminando clases fantasma en Supabase:', delErr);
      }
    }

    if (feriadoUpdates.length > 0) {
      for (const fRow of feriadoUpdates) {
        try {
          await supabase
            .from('clases')
            .update({
              estado: 'FERIADO',
              unidad: 'Feriado Nacional',
              tema: fRow.tema,
              articulo_licencia: null
            })
            .eq('id', fRow.id);
        } catch (_) {}
      }
    }
  }

  // 3. Calcular clases pendientes únicamente en diasValidos (incluyendo feriados que caigan en día de cursada)
  const nuevas = calcularClasesPendientes({
    catedraId: catedra.id,
    diasValidosOverride: diasValidos,
    clasesExistentes: cleanedExisting,
    fechaFin: getTodayYMD(),
    incluirFeriados: true,
    licencias
  });

  let finalClases = [...cleanedExisting];

  if (nuevas.length > 0) {
    if (isSupabaseConfigured && !isDemo && supabase) {
      try {
        const rowsToInsert = nuevas.map(c => ({
          catedra_id: c.catedra_id,
          fecha: c.fecha,
          tema: c.tema,
          unidad: c.unidad,
          estado: c.estado,
          numero_clase: c.numero_clase || 1
        }));

        const { data, error } = await supabase
          .from('clases')
          .upsert(rowsToInsert, { onConflict: 'catedra_id, fecha' })
          .select();

        if (!error && data && data.length > 0) {
          const dataMap = new Map(data.map(d => [String(d.fecha).slice(0, 10), d]));
          const mergedNuevas = nuevas.map(n => {
            const dbRow = dataMap.get(String(n.fecha).slice(0, 10));
            return dbRow ? { ...dbRow, es_feriado: n.es_feriado, estado: n.estado, unidad: n.unidad, tema: n.tema } : n;
          });
          finalClases = [...cleanedExisting, ...mergedNuevas];
        } else {
          finalClases = [...cleanedExisting, ...nuevas];
        }
      } catch (err) {
        console.warn('Aviso asegurando clases programadas en Supabase:', err);
        finalClases = [...cleanedExisting, ...nuevas];
      }
    } else {
      finalClases = [...cleanedExisting, ...nuevas];
    }
  }

  // 4. Ordenar de más reciente a más antigua y recalcular numeración correlativa real (#1, #2, #3...)
  const sortedDesc = finalClases.sort((a, b) =>
    String(b.fecha || '').slice(0, 10).localeCompare(String(a.fecha || '').slice(0, 10))
  );
  const allNumbered = recalcularNumeracionCorrelativa(sortedDesc, licencias, catedra.id);

  try {
    const jsonStr = JSON.stringify(allNumbered);
    localStorage.setItem(`clases_${catedra.id}`, jsonStr);
    localStorage.setItem(`docentepro_demo_clases_${catedra.id}`, jsonStr);
  } catch (_) {}

  return { nuevas, all: allNumbered };
}
