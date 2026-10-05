import { supabase as defaultSupabase, isSupabaseConfigured } from '../lib/supabase';
import { parseDMYtoYMD } from '../lib/dateUtils';
import { normalizeTipoEvaluacion } from '../lib/enums';

/**
 * Constante canónica de columnas para la tabla 'evaluaciones'.
 * Incluye tanto 'fecha' como 'fecha_entrega' para garantizar compatibilidad
 * bidireccional y evitar errores por omisión de columnas o desincronización.
 */
export const EVALUACIONES_COLUMNS = 'id, catedra_id, periodo_id, titulo, tipo, evaluacion_origen_id, fecha, fecha_entrega, ponderacion, escala_maxima, archivo_url, archivo_nombre, created_at, updated_at';

/**
 * Normaliza una evaluación para asegurar paridad estricta entre fecha y fecha_entrega.
 * Garantiza que la fecha esté en formato YYYY-MM-DD sin componente horario
 * para prevenir cualquier desplazamiento por conversión UTC en husos horarios locales.
 * 
 * @param {Object} ev - Objeto de evaluación desde base de datos o estado local
 * @returns {Object|null} Evaluación con fecha y fecha_entrega sincronizadas
 */
export function normalizeEvaluacion(ev) {
  if (!ev) return null;

  const rawDate = ev.fecha_entrega || ev.fecha || null;
  let cleanDate = null;

  if (rawDate) {
    if (typeof rawDate === 'string') {
      const trimmed = rawDate.trim();
      if (trimmed.includes('T')) {
        cleanDate = trimmed.split('T')[0];
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        cleanDate = trimmed;
      } else {
        cleanDate = parseDMYtoYMD(trimmed);
      }
    } else if (rawDate instanceof Date) {
      const year = rawDate.getFullYear();
      const month = String(rawDate.getMonth() + 1).padStart(2, '0');
      const day = String(rawDate.getDate()).padStart(2, '0');
      cleanDate = `${year}-${month}-${day}`;
    }
  }

  const tipoNormalizado = ev.tipo ? normalizeTipoEvaluacion(ev.tipo) : 'PARCIAL';

  return {
    ...ev,
    titulo: ev.titulo || ev.nombre || '',
    tipo: tipoNormalizado,
    fecha: cleanDate,
    fecha_entrega: cleanDate
  };
}

/**
 * Consulta unificada de evaluaciones de una cátedra.
 * Lee con la constante EVALUACIONES_COLUMNS y aplica normalización defensiva.
 * 
 * @param {string} catedraId 
 * @param {Object} [options]
 * @returns {Promise<Array<Object>>} Lista normalizada de evaluaciones
 */
export async function getEvaluacionesCatedra(catedraId, options = {}) {
  if (!catedraId) return [];

  const client = options.supabase || defaultSupabase;
  const isDemo = Boolean(options.isDemo);
  const localKey = `evaluaciones_${catedraId}`;

  let localEvals = [];
  try {
    const rawLocal = localStorage.getItem(localKey);
    localEvals = rawLocal ? JSON.parse(rawLocal) : [];
  } catch (_) {
    localEvals = [];
  }

  if (isSupabaseConfigured && !isDemo && client) {
    try {
      const { data, error } = await client
        .from('evaluaciones')
        .select(EVALUACIONES_COLUMNS)
        .eq('catedra_id', catedraId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('[evaluacionesService] Error al consultar evaluaciones en Supabase:', error);
        // Fallback a almacenamiento local si la consulta remota falla
        return localEvals.map(normalizeEvaluacion);
      }

      const dbEvals = (data || []).map(normalizeEvaluacion);

      // Combinar conservando evaluaciones locales que no existan en el servidor (ej: creadas offline)
      const combinedMap = new Map();
      dbEvals.forEach(e => combinedMap.set(e.id, e));

      localEvals.forEach(localEv => {
        if (!combinedMap.has(localEv.id)) {
          const match = dbEvals.find(e =>
            e.titulo?.trim().toLowerCase() === localEv.titulo?.trim().toLowerCase() &&
            String(e.catedra_id) === String(localEv.catedra_id)
          );
          if (!match) {
            combinedMap.set(localEv.id, normalizeEvaluacion(localEv));
          }
        }
      });

      const mergedList = Array.from(combinedMap.values());
      try {
        localStorage.setItem(localKey, JSON.stringify(mergedList));
      } catch (_) {}

      return mergedList;
    } catch (err) {
      console.warn('[evaluacionesService] Error de red al consultar evaluaciones:', err);
      return localEvals.map(normalizeEvaluacion);
    }
  }

  // Modo demo o sin conexión a Supabase
  if (localEvals.length > 0) {
    return localEvals.map(normalizeEvaluacion);
  }

  // Fixtures predeterminadas para modo demo
  const demoFixtures = [
    { id: 'eval-1', catedra_id: catedraId, titulo: 'TP N° 1 - Arquitectura', tipo: 'TP', fecha: null, fecha_entrega: null },
    { id: 'eval-2', catedra_id: catedraId, titulo: 'Parcial 1', tipo: 'PARCIAL', fecha: null, fecha_entrega: null },
    { id: 'eval-3', catedra_id: catedraId, titulo: 'Recuperatorio Parcial 1', tipo: 'RECUPERATORIO', evaluacion_origen_id: 'eval-2', fecha: null, fecha_entrega: null },
    { id: 'eval-4', catedra_id: catedraId, titulo: 'Parcial 2', tipo: 'PARCIAL', fecha: null, fecha_entrega: null }
  ];

  try {
    localStorage.setItem(localKey, JSON.stringify(demoFixtures));
  } catch (_) {}

  return demoFixtures.map(normalizeEvaluacion);
}

/**
 * Función única de persistencia para crear o actualizar una evaluación.
 * 
 * Reglas de integridad:
 * 1. Envía exclusivamente columnas reales de la tabla 'evaluaciones' (evita 'nombre', 'formato', etc.).
 * 2. Escribe en 'fecha' y 'fecha_entrega' con el mismo valor ISO (YYYY-MM-DD).
 * 3. Solicita la fila devuelta por la base (.select(EVALUACIONES_COLUMNS).single()).
 * 4. Si el guardado falla, arroja el error para notificación vía toast.
 * 5. Actualiza de inmediato el almacenamiento local con la fila retornada.
 * 
 * @param {Object} evalData - Datos de la evaluación a guardar
 * @param {Object} [options] - Opciones (catedraId, supabase, isDemo)
 * @returns {Promise<Object>} Fila de evaluación guardada y normalizada
 */
export async function saveEvaluacion(evalData, options = {}) {
  if (!evalData) throw new Error('Datos de evaluación no proporcionados');

  const client = options.supabase || defaultSupabase;
  const isDemo = Boolean(options.isDemo);
  const catedraId = options.catedraId || evalData.catedra_id;

  const rawFecha = evalData.fecha_entrega || evalData.fecha || null;
  let isoFecha = null;
  if (rawFecha) {
    const str = String(rawFecha).trim();
    if (str.includes('T')) {
      isoFecha = str.split('T')[0];
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      isoFecha = str;
    } else {
      isoFecha = parseDMYtoYMD(str) || null;
    }
  }

  const tituloLimpio = (evalData.titulo || evalData.nombre || '').trim();
  if (!tituloLimpio) throw new Error('El título de la evaluación es requerido');

  const tipoCanonico = normalizeTipoEvaluacion(evalData.tipo);
  const isNew = !evalData.id || String(evalData.id).startsWith('eval-');

  // Payload filtrado estrictamente con las columnas válidas de public.evaluaciones
  const dbPayload = {
    titulo: tituloLimpio,
    tipo: tipoCanonico,
    fecha: isoFecha,
    fecha_entrega: isoFecha,
    archivo_url: evalData.archivo_url || null,
    archivo_nombre: evalData.archivo_nombre || null,
    periodo_id: evalData.periodo_id || null,
    evaluacion_origen_id: tipoCanonico === 'RECUPERATORIO' ? (evalData.evaluacion_origen_id || null) : null,
    updated_at: new Date().toISOString()
  };

  if (evalData.ponderacion !== undefined) {
    dbPayload.ponderacion = Number(evalData.ponderacion) || 1;
  }
  if (evalData.escala_maxima !== undefined) {
    dbPayload.escala_maxima = Number(evalData.escala_maxima) || 10;
  }

  let savedRow = null;

  if (isSupabaseConfigured && !isDemo && client && !isNew) {
    // Actualización de registro existente en Supabase
    const { data, error } = await client
      .from('evaluaciones')
      .update(dbPayload)
      .eq('id', evalData.id)
      .select(EVALUACIONES_COLUMNS)
      .single();

    if (error) {
      console.error('[evaluacionesService] Error al actualizar evaluación:', error);
      throw new Error(`Error en base de datos: ${error.message || error.details || error.code}`);
    }

    savedRow = normalizeEvaluacion(data);
  } else if (isSupabaseConfigured && !isDemo && client && isNew) {
    // Inserción de nuevo registro en Supabase
    const insertPayload = {
      ...dbPayload,
      catedra_id: catedraId
    };

    const { data, error } = await client
      .from('evaluaciones')
      .insert(insertPayload)
      .select(EVALUACIONES_COLUMNS)
      .single();

    if (error) {
      console.error('[evaluacionesService] Error al crear evaluación:', error);
      throw new Error(`Error en base de datos: ${error.message || error.details || error.code}`);
    }

    savedRow = normalizeEvaluacion(data);
  } else {
    // Modo demo o local
    savedRow = normalizeEvaluacion({
      ...evalData,
      ...dbPayload,
      id: evalData.id || `eval-${Date.now()}`,
      catedra_id: catedraId,
      created_at: evalData.created_at || new Date().toISOString()
    });
  }

  // Sincronizar en localStorage
  if (catedraId) {
    const localKey = `evaluaciones_${catedraId}`;
    try {
      const stored = localStorage.getItem(localKey);
      const list = stored ? JSON.parse(stored) : [];
      const updatedList = list.some(e => e.id === savedRow.id)
        ? list.map(e => e.id === savedRow.id ? savedRow : e)
        : [...list, savedRow];
      localStorage.setItem(localKey, JSON.stringify(updatedList));
    } catch (_) {}
  }

  return savedRow;
}

/**
 * Eliminación de evaluación con sincronización de estado local.
 * 
 * @param {string} evaluacionId 
 * @param {Object} [options]
 */
export async function deleteEvaluacion(evaluacionId, options = {}) {
  if (!evaluacionId) return;

  const client = options.supabase || defaultSupabase;
  const isDemo = Boolean(options.isDemo);
  const catedraId = options.catedraId;

  if (isSupabaseConfigured && !isDemo && client && !String(evaluacionId).startsWith('eval-')) {
    const { error } = await client
      .from('evaluaciones')
      .delete()
      .eq('id', evaluacionId);

    if (error) {
      console.error('[evaluacionesService] Error al eliminar evaluación:', error);
      throw new Error(`Error en base de datos al eliminar: ${error.message}`);
    }
  }

  if (catedraId) {
    const localKey = `evaluaciones_${catedraId}`;
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) {
        const list = JSON.parse(stored);
        const filtered = list.filter(e => e.id !== evaluacionId && e.evaluacion_origen_id !== evaluacionId);
        localStorage.setItem(localKey, JSON.stringify(filtered));
      }
    } catch (_) {}
  }
}
