import { supabase as defaultSupabase, isSupabaseConfigured } from '../lib/supabase';
import { enqueueOfflineMutation } from './offlineSyncService';
import { getTodayYMD } from '../lib/dateUtils';
import { getArticuloByCodigo, getArticuloByText } from '../constants/decreto1092';
import { catedraCache } from './catedraCache';

/**
 * Notifica a los componentes y vacía caché para reactividad inmediata
 */
function notificarCambioLicencias(targetCatedraIds = [], licencia = null) {
  if (Array.isArray(targetCatedraIds)) {
    targetCatedraIds.forEach(cId => {
      if (cId) catedraCache.invalidate(cId);
    });
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('licencias_docentes_updated', { detail: { licencia } }));
    window.dispatchEvent(new CustomEvent('clases_updated', { detail: { catedraIds: targetCatedraIds } }));
  }
}

/**
 * Servicio de Gestión y Control Anual de Licencias Docentes (Decreto 1092)
 * Provee consulta cronológica anual, persistencia multi-nivel (Supabase + LocalStorage/Demo),
 * sincronización bidireccional con clases y cálculo de límites reglamentarios.
 */

export const LICENCIAS_STORAGE_PREFIX = 'docentepro_licencias_';

/**
 * Helper para obtener la clave de almacenamiento local según docente o demo.
 */
function getStorageKey(docenteId) {
  return `${LICENCIAS_STORAGE_PREFIX}${docenteId || 'demo'}`;
}

/**
 * Obtiene las licencias locales almacenadas en localStorage
 */
export function getLocalLicencias(docenteId) {
  try {
    if (typeof localStorage === 'undefined') return [];
    const key = getStorageKey(docenteId);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Error leyendo licencias locales:', e);
    return [];
  }
}

/**
 * Guarda licencias locales en localStorage
 */
export function saveLocalLicencias(docenteId, licencias) {
  try {
    if (typeof localStorage === 'undefined') return;
    const key = getStorageKey(docenteId);
    localStorage.setItem(key, JSON.stringify(licencias));
  } catch (e) {
    console.warn('Error guardando licencias locales:', e);
  }
}

/**
 * Retorna un array con todas las fechas (YYYY-MM-DD) entre startDate y endDate inclusive.
 * @param {string} startDateStr 
 * @param {string} [endDateStr]
 * @returns {string[]}
 */
export function getFechasEnRango(startDateStr, endDateStr) {
  if (!startDateStr) return [];
  const start = new Date(startDateStr.split('T')[0] + 'T00:00:00');
  const end = endDateStr ? new Date(endDateStr.split('T')[0] + 'T00:00:00') : new Date(start);
  const result = [];
  const current = new Date(start);

  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    result.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }
  return result;
}

export { obtenerLicenciaParaFecha } from '../utils/licenciasHelper';
import { obtenerLicenciaParaFecha } from '../utils/licenciasHelper';

/**
 * Determina si una fecha dada está cubierta por alguna de las licencias del docente,
 * evaluando rango de fechas [fecha_inicio, fecha_fin] y alcance de cátedras.
 * @param {string} fechaStr - YYYY-MM-DD
 * @param {Array} licencias - Lista de licencias
 * @param {string} [catedraId] - ID de cátedra opcional
 * @param {Object} [claseObj] - Fila opcional de clase
 * @returns {{ cubierta: boolean, licencia: Object|null }}
 */
export function isFechaCubiertaPorLicencias(fechaStr, licencias = [], catedraId = null, claseObj = null) {
  const lic = obtenerLicenciaParaFecha(fechaStr, catedraId, licencias, claseObj);
  return { cubierta: Boolean(lic), licencia: lic };
}

/**
 * Normaliza un registro de licencia docente con soporte multi-día y multi-cátedra
 */
export function normalizeLicencia(raw, catedrasMap = {}) {
  if (!raw) return null;
  const catedraId = raw.catedra_id || null;
  const catedraInfo = raw.catedra || raw.catedras || (catedraId ? catedrasMap[catedraId] : null) || null;
  const fechaInicio = raw.fecha_inicio || raw.fecha ? String(raw.fecha_inicio || raw.fecha).split('T')[0] : getTodayYMD();
  const fechaFin = raw.fecha_fin ? String(raw.fecha_fin).split('T')[0] : fechaInicio;
  const cantidadDias = Math.max(1, parseInt(raw.cantidad_dias, 10) || 1);
  const fechaReintegro = raw.fecha_reintegro ? String(raw.fecha_reintegro).split('T')[0] : null;
  const aplicaTodasCatedras = Boolean(
    raw.aplica_todas_catedras ?? (raw.catedra_id === null && (!raw.catedra_ids || raw.catedra_ids.length === 0))
  );
  const catedraIds = Array.isArray(raw.catedra_ids) ? raw.catedra_ids : (catedraId ? [catedraId] : []);

  return {
    id: String(raw.id),
    docente_id: raw.docente_id,
    fecha: fechaInicio,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    cantidad_dias: cantidadDias,
    fecha_reintegro: fechaReintegro,
    aplica_todas_catedras: aplicaTodasCatedras,
    catedra_ids: catedraIds,
    catedra_id: catedraId,
    clase_id: raw.clase_id || null,
    clase_ids: Array.isArray(raw.clase_ids) ? raw.clase_ids : (raw.clase_id ? [raw.clase_id] : []),
    articulo: raw.articulo || raw.articulo_licencia || 'Art. 52° - Razones particulares o especiales',
    articulo_codigo: raw.articulo_codigo || getArticuloByText(raw.articulo || raw.articulo_licencia)?.codigo || null,
    observacion: raw.observacion || raw.observaciones || raw.motivo_inasistencia || '',
    estado_tramite: raw.estado_tramite || 'PENDIENTE_CERTIFICADO',
    created_at: raw.created_at || new Date().toISOString(),
    catedra: catedraInfo ? {
      id: catedraInfo.id || catedraId,
      nombre: catedraInfo.nombre || 'Cátedra',
      institucion: catedraInfo.institucion || ''
    } : null
  };
}

/**
 * Consulta de licencias docentes por año calendario.
 * Unifica defensivamente public.licencias_docentes con inasistencias_docente y
 * clases con estado DOCENTE_AUSENTE para evitar pérdida de registros históricos.
 *
 * @param {string} docenteId - ID del docente
 * @param {number|string} year - Año calendario (ej. 2026)
 * @param {Object} [options] - Opciones (supabase, isDemo, catedrasList)
 * @returns {Promise<Array>} Lista normalizada y deduplicada de licencias ordenada por fecha DESC
 */
export async function getLicenciasByYear(docenteId, year = new Date().getFullYear(), options = {}) {
  const client = options.supabase || defaultSupabase;
  const isDemo = Boolean(options.isDemo);
  const targetYear = Number(year) || new Date().getFullYear();
  const startDate = `${targetYear}-01-01`;
  const endDate = `${targetYear}-12-31`;

  const catedrasList = options.catedrasList || [];
  const catedrasMap = {};
  for (const c of catedrasList) {
    if (c?.id) catedrasMap[c.id] = c;
  }

  // 1. Obtener datos locales (modo demo u offline)
  const localList = getLocalLicencias(docenteId).filter(item => {
    const y = item.fecha ? parseInt(item.fecha.substring(0, 4), 10) : null;
    return y === targetYear;
  });

  if (isDemo || !isSupabaseConfigured || !client) {
    return localList.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  const licenciasUnificadas = new Map();

  // Incorporar locales inicialmente
  for (const item of localList) {
    const norm = normalizeLicencia(item, catedrasMap);
    const dedupeKey = norm.clase_id ? `clase_${norm.clase_id}` : `fecha_${norm.fecha}_cat_${norm.catedra_id || 'gral'}`;
    licenciasUnificadas.set(dedupeKey, norm);
  }

  try {
    // 2. Intentar consultar public.licencias_docentes
    let queryLicencias = client
      .from('licencias_docentes')
      .select('*, catedras(id, nombre, institucion)')
      .gte('fecha', startDate)
      .lte('fecha', endDate)
      .order('fecha', { ascending: false });

    if (docenteId) {
      queryLicencias = queryLicencias.eq('docente_id', docenteId);
    }

    const { data: remoteLicencias, error: licErr } = await queryLicencias;

    if (!licErr && Array.isArray(remoteLicencias)) {
      for (const lic of remoteLicencias) {
        const norm = normalizeLicencia(lic, catedrasMap);
        const dedupeKey = norm.clase_id ? `clase_${norm.clase_id}` : `fecha_${norm.fecha}_cat_${norm.catedra_id || 'gral'}`;
        licenciasUnificadas.set(dedupeKey, norm);
      }
    }
  } catch (err) {
    console.warn('Tabla public.licencias_docentes no disponible o error:', err);
  }

  // 3. Respaldo defensivo: buscar clases con estado = 'DOCENTE_AUSENTE' en el rango del año
  try {
    const catedraIds = Object.keys(catedrasMap);
    if (catedraIds.length > 0) {
      const { data: clasesAusentes, error: clasesErr } = await client
        .from('clases')
        .select('id, catedra_id, fecha, tema, estado, articulo_licencia, observaciones')
        .in('catedra_id', catedraIds)
        .eq('estado', 'DOCENTE_AUSENTE')
        .gte('fecha', startDate)
        .lte('fecha', endDate);

      if (!clasesErr && Array.isArray(clasesAusentes)) {
        for (const cl of clasesAusentes) {
          const dedupeKey = `clase_${cl.id}`;
          if (!licenciasUnificadas.has(dedupeKey)) {
            const norm = normalizeLicencia({
              id: `clase-lic-${cl.id}`,
              docente_id: docenteId,
              fecha: cl.fecha,
              catedra_id: cl.catedra_id,
              clase_id: cl.id,
              articulo: cl.articulo_licencia || 'Art. 15° - Razones particulares',
              observacion: cl.observaciones || '',
              estado_tramite: 'PRESENTADA'
            }, catedrasMap);
            licenciasUnificadas.set(dedupeKey, norm);
          }
        }
      }
    }
  } catch (clasesCatchErr) {
    console.warn('Error en respaldo defensivo de clases ausentes:', clasesCatchErr);
  }

  // 4. Respaldo defensivo adicional: inasistencias_docente
  try {
    let queryInas = client
      .from('inasistencias_docente')
      .select('*')
      .gte('fecha', startDate)
      .lte('fecha', endDate);

    if (docenteId) {
      queryInas = queryInas.eq('docente_id', docenteId);
    }

    const { data: inasData, error: inasErr } = await queryInas;
    if (!inasErr && Array.isArray(inasData)) {
      for (const inas of inasData) {
        const dedupeKey = `inas_${inas.id}`;
        const altKey = `fecha_${inas.fecha}_cat_${inas.catedra_id || 'gral'}`;
        if (!licenciasUnificadas.has(dedupeKey) && !licenciasUnificadas.has(altKey)) {
          const norm = normalizeLicencia({
            id: inas.id,
            docente_id: inas.docente_id,
            fecha: inas.fecha,
            catedra_id: inas.catedra_id,
            articulo: inas.articulo_licencia || 'Art. 15° - Razones particulares',
            observacion: inas.observaciones || '',
            estado_tramite: 'PRESENTADA'
          }, catedrasMap);
          licenciasUnificadas.set(dedupeKey, norm);
        }
      }
    }
  } catch (inasCatchErr) {
    console.warn('Error en respaldo de inasistencias_docente:', inasCatchErr);
  }

  const results = Array.from(licenciasUnificadas.values());
  results.sort((a, b) => b.fecha.localeCompare(a.fecha));

  // Actualizar caché local
  saveLocalLicencias(docenteId, results);

  return results;
}

/**
 * Registra o actualiza una licencia docente con soporte multi-día y multi-cátedra.
 * Si se seleccionan cátedras o todas, sincroniza las clases correspondientes en public.clases.
 *
 * @param {Object} payload
 * @param {string} payload.fecha - YYYY-MM-DD (fecha inicio)
 * @param {string} [payload.fecha_inicio] - YYYY-MM-DD
 * @param {string} [payload.fecha_fin] - YYYY-MM-DD
 * @param {number} [payload.cantidad_dias] - Días computados
 * @param {string} [payload.fecha_reintegro] - YYYY-MM-DD
 * @param {boolean} [payload.aplica_todas_catedras] - Abarca todas las cátedras
 * @param {string[]} [payload.catedra_ids] - IDs de cátedras seleccionadas
 * @param {string} [payload.catedra_id] - ID de cátedra singular o null
 * @param {string} payload.articulo - Artículo normativo
 * @param {string} [payload.observacion] - Texto libre
 * @param {'PRESENTADA'|'PENDIENTE_CERTIFICADO'|'APROBADA'} [payload.estado_tramite]
 * @param {string} [payload.docente_id]
 * @param {string} [payload.clase_id]
 * @param {string[]} [payload.clase_ids]
 * @param {Object} [options] - Opciones (supabase, isDemo, allCatedraIds, catedrasList)
 * @returns {Promise<Object>} Licencia guardada
 */
export async function createOrUpdateLicencia(payload, options = {}) {
  const client = options.supabase || defaultSupabase;
  const isDemo = Boolean(options.isDemo);
  const docenteId = payload.docente_id || options.docenteId || 'demo';

  const licenciaId = payload.id || `lic-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const fechaInicio = payload.fecha_inicio || payload.fecha ? String(payload.fecha_inicio || payload.fecha).split('T')[0] : getTodayYMD();
  const fechaFin = payload.fecha_fin ? String(payload.fecha_fin).split('T')[0] : fechaInicio;
  const cantidadDias = Math.max(1, parseInt(payload.cantidad_dias, 10) || 1);
  const fechaReintegro = payload.fecha_reintegro ? String(payload.fecha_reintegro).split('T')[0] : null;
  const aplicaTodasCatedras = Boolean(
    payload.aplica_todas_catedras ?? (payload.catedra_id === null && (!payload.catedra_ids || payload.catedra_ids.length === 0))
  );
  const catedraIds = Array.isArray(payload.catedra_ids) 
    ? payload.catedra_ids 
    : (payload.catedra_id ? [payload.catedra_id] : []);
  const catedraId = !aplicaTodasCatedras && catedraIds.length === 1 ? catedraIds[0] : (payload.catedra_id || null);

  const articulo = payload.articulo || 'Art. 52° - Razones particulares o especiales';
  const articuloCodigo = payload.articulo_codigo || getArticuloByText(articulo)?.codigo || null;
  const observacion = payload.observacion || payload.observaciones || '';
  const estadoTramite = payload.estado_tramite || 'PENDIENTE_CERTIFICADO';
  let claseId = payload.clase_id || null;
  const affectedClaseIds = Array.isArray(payload.clase_ids) ? [...payload.clase_ids] : (claseId ? [claseId] : []);

  // Fechas dentro del rango
  const fechasRango = getFechasEnRango(fechaInicio, fechaFin);

  // Determinar cátedras a sincronizar
  let targetCatedraIds = [];
  if (aplicaTodasCatedras) {
    if (options.catedrasList && options.catedrasList.length > 0) {
      targetCatedraIds = options.catedrasList.map(c => c.id).filter(Boolean);
    } else if (options.allCatedraIds && options.allCatedraIds.length > 0) {
      targetCatedraIds = options.allCatedraIds;
    }
  } else {
    targetCatedraIds = catedraIds;
  }

  // 1. Sincronización con clases si hay cátedras involucradas
  if (targetCatedraIds.length > 0) {
    // 1a. Sincronización en localStorage (Modo Demo / Offline / Inmediato)
    if (typeof localStorage !== 'undefined') {
      try {
        for (const cId of targetCatedraIds) {
          const keyLocal1 = `clases_${cId}`;
          const keyLocal2 = `docentepro_demo_clases_${cId}`;
          const rawStored = localStorage.getItem(keyLocal1) || localStorage.getItem(keyLocal2);
          let localClases = rawStored ? JSON.parse(rawStored) : [];
          let modificado = false;

          for (const f of fechasRango) {
            const idx = localClases.findIndex(c => (c.fecha || '').slice(0, 10) === f);
            if (idx >= 0) {
              localClases[idx] = {
                ...localClases[idx],
                estado: 'DOCENTE_AUSENTE',
                articulo_licencia: articulo,
                observaciones: observacion,
                tema: `Sin actividad áulica - Licencia Docente (${articulo})`
              };
              modificado = true;
            } else {
              localClases.push({
                id: `clase-lic-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                catedra_id: cId,
                fecha: f,
                estado: 'DOCENTE_AUSENTE',
                articulo_licencia: articulo,
                observaciones: observacion,
                tema: `Sin actividad áulica - Licencia Docente (${articulo})`,
                horas_catedra: 0
              });
              modificado = true;
            }
          }

          if (modificado) {
            const jsonStr = JSON.stringify(localClases);
            localStorage.setItem(keyLocal1, jsonStr);
            localStorage.setItem(keyLocal2, jsonStr);
          }
        }
      } catch (errLocalSync) {
        console.warn('Aviso sincronizando clases en localStorage:', errLocalSync);
      }
    }

    // 1b. Sincronización remota en Supabase
    if (isSupabaseConfigured && !isDemo && client) {
      try {
        for (const cId of targetCatedraIds) {
          for (const f of fechasRango) {
            const { data: existingClases } = await client
              .from('clases')
              .select('id, tema')
              .eq('catedra_id', cId)
              .eq('fecha', f);

            if (existingClases && existingClases.length > 0) {
              const foundId = existingClases[0].id;
              if (!affectedClaseIds.includes(foundId)) affectedClaseIds.push(foundId);
              if (!claseId) claseId = foundId;
              await client
                .from('clases')
                .update({
                  estado: 'DOCENTE_AUSENTE',
                  articulo_licencia: articulo,
                  observaciones: observacion,
                  tema: `Sin actividad áulica - Licencia Docente (${articulo})`
                })
                .eq('id', foundId);
            } else {
              const { data: newClase } = await client
                .from('clases')
                .insert({
                  catedra_id: cId,
                  fecha: f,
                  estado: 'DOCENTE_AUSENTE',
                  articulo_licencia: articulo,
                  observaciones: observacion,
                  tema: `Sin actividad áulica - Licencia Docente (${articulo})`
                })
                .select()
                .single();

              if (newClase) {
                if (!affectedClaseIds.includes(newClase.id)) affectedClaseIds.push(newClase.id);
                if (!claseId) claseId = newClase.id;
              }
            }
          }
        }
      } catch (claseSyncErr) {
        console.warn('Error sincronizando clases de licencia en rango:', claseSyncErr);
      }
    }
  }

  const licenciaItem = {
    id: licenciaId,
    docente_id: docenteId,
    fecha: fechaInicio,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    cantidad_dias: cantidadDias,
    fecha_reintegro: fechaReintegro,
    aplica_todas_catedras: aplicaTodasCatedras,
    catedra_ids: targetCatedraIds,
    catedra_id: catedraId,
    clase_id: claseId,
    clase_ids: affectedClaseIds,
    articulo,
    articulo_codigo: articuloCodigo,
    observacion,
    estado_tramite: estadoTramite,
    updated_at: new Date().toISOString()
  };

  // 2. Persistir localmente
  const currentList = getLocalLicencias(docenteId);
  const existingIdx = currentList.findIndex(l => l.id === licenciaId);
  if (existingIdx >= 0) {
    currentList[existingIdx] = { ...currentList[existingIdx], ...licenciaItem };
  } else {
    currentList.unshift(licenciaItem);
  }
  saveLocalLicencias(docenteId, currentList);

  // 3. Persistir en Supabase
  if (isSupabaseConfigured && !isDemo && client) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueueOfflineMutation({
        tipo: 'LICENCIA_UPSERT',
        payload: licenciaItem,
        catedraId: catedraId || undefined
      });
    } else {
      try {
        const isTempId = String(licenciaId).startsWith('lic-') || String(licenciaId).startsWith('clase-lic-');
        
        // Intento completo con soporte multi-día y multi-cátedra
        const fullPayload = {
          id: !isTempId ? licenciaId : undefined,
          docente_id: docenteId,
          fecha: fechaInicio,
          fecha_fin: fechaFin,
          cantidad_dias: cantidadDias,
          fecha_reintegro: fechaReintegro,
          aplica_todas_catedras: aplicaTodasCatedras,
          catedra_ids: targetCatedraIds,
          articulo,
          articulo_codigo: articuloCodigo,
          observacion,
          estado_tramite: estadoTramite,
          catedra_id: catedraId,
          clase_id: claseId
        };

        const { error: insertErr } = await client
          .from('licencias_docentes')
          .upsert(fullPayload);

        if (insertErr) {
          // Fallback clásico si la tabla remota no tiene aún columnas multi-día
          const fallbackPayload = {
            id: !isTempId ? licenciaId : undefined,
            docente_id: docenteId,
            fecha: fechaInicio,
            articulo,
            articulo_codigo: articuloCodigo,
            observacion,
            estado_tramite: estadoTramite,
            catedra_id: catedraId,
            clase_id: claseId
          };

          const { error: fallbackErr } = await client
            .from('licencias_docentes')
            .upsert(fallbackPayload);

          if (fallbackErr) {
            // Fallback final a inasistencias_docente
            await client
              .from('inasistencias_docente')
              .insert({
                docente_id: docenteId,
                fecha: fechaInicio,
                tipo: 'LICENCIA',
                articulo_licencia: articulo,
                observaciones: observacion,
                catedra_id: catedraId
              });
          }
        }
      } catch (saveErr) {
        console.warn('Error al guardar en Supabase:', saveErr);
      }
    }
  }

  notificarCambioLicencias(targetCatedraIds, licenciaItem);

  return normalizeLicencia(licenciaItem);
}

/**
 * Actualiza la observación y/o estado de trámite de una licencia
 *
 * @param {string} licenciaId - ID de la licencia
 * @param {string} nuevaObservacion - Nueva nota / observación
 * @param {string} [estadoTramite] - Nuevo estado del trámite
 * @param {Object} [options] - Opciones (supabase, isDemo, docenteId, claseId)
 */
export async function updateObservacion(licenciaId, nuevaObservacion, estadoTramite, options = {}) {
  const client = options.supabase || defaultSupabase;
  const isDemo = Boolean(options.isDemo);
  const docenteId = options.docenteId || 'demo';

  // 1. Actualizar localmente
  const currentList = getLocalLicencias(docenteId);
  const target = currentList.find(l => String(l.id) === String(licenciaId));
  if (target) {
    target.observacion = nuevaObservacion;
    if (estadoTramite) target.estado_tramite = estadoTramite;
    target.updated_at = new Date().toISOString();
    saveLocalLicencias(docenteId, currentList);
  }

  // 2. Actualizar en Supabase
  if (isSupabaseConfigured && !isDemo && client) {
    try {
      const updates = { observacion: nuevaObservacion, updated_at: new Date().toISOString() };
      if (estadoTramite) updates.estado_tramite = estadoTramite;

      await client
        .from('licencias_docentes')
        .update(updates)
        .eq('id', licenciaId);

      // Si está asociada a una clase, actualizar también observaciones de la clase
      const claseId = target?.clase_id || options.claseId;
      if (claseId) {
        await client
          .from('clases')
          .update({ observaciones: nuevaObservacion })
          .eq('id', claseId);
      }
    } catch (err) {
      console.warn('Error al actualizar observación en Supabase:', err);
    }
  }

  const notifIds = target?.catedra_ids && target.catedra_ids.length > 0
    ? target.catedra_ids
    : (target?.catedra_id ? [target.catedra_id] : []);
  notificarCambioLicencias(notifIds, target);

  return target ? normalizeLicencia(target) : null;
}

/**
 * Elimina una licencia docente y restaura las clases asociadas a 'DICTADA'
 *
 * @param {string} licenciaId - ID de la licencia
 * @param {string} [claseId] - ID de clase vinculada si existe
 * @param {Object} [options] - Opciones (supabase, isDemo, docenteId)
 */
export async function deleteLicencia(licenciaId, claseId = null, options = {}) {
  const client = options.supabase || defaultSupabase;
  const isDemo = Boolean(options.isDemo);
  const docenteId = options.docenteId || 'demo';

  // 1. Eliminar localmente
  const currentList = getLocalLicencias(docenteId);
  const target = currentList.find(l => String(l.id) === String(licenciaId));
  const effectiveClaseId = claseId || target?.clase_id;
  const effectiveClaseIds = target?.clase_ids || (effectiveClaseId ? [effectiveClaseId] : []);
  const nextList = currentList.filter(l => String(l.id) !== String(licenciaId));
  saveLocalLicencias(docenteId, nextList);

  // 2. Restaurar clases en localStorage (Modo Demo / Offline)
  if (typeof localStorage !== 'undefined' && target) {
    try {
      const catIds = target.catedra_ids && target.catedra_ids.length > 0
        ? target.catedra_ids
        : (target.catedra_id ? [target.catedra_id] : []);
      const fRange = getFechasEnRango(target.fecha_inicio || target.fecha, target.fecha_fin || target.fecha_inicio || target.fecha);

      for (const cId of catIds) {
        const keyLocal1 = `clases_${cId}`;
        const keyLocal2 = `docentepro_demo_clases_${cId}`;
        const rawStored = localStorage.getItem(keyLocal1) || localStorage.getItem(keyLocal2);
        if (rawStored) {
          let localClases = JSON.parse(rawStored);
          let mod = false;
          localClases = localClases.map(c => {
            if (fRange.includes((c.fecha || '').slice(0, 10)) && c.estado === 'DOCENTE_AUSENTE') {
              mod = true;
              return {
                ...c,
                estado: 'DICTADA',
                articulo_licencia: null,
                tema: 'Clase dictada regular'
              };
            }
            return c;
          });
          if (mod) {
            const jsonStr = JSON.stringify(localClases);
            localStorage.setItem(keyLocal1, jsonStr);
            localStorage.setItem(keyLocal2, jsonStr);
          }
        }
      }
    } catch (errLocalDel) {
      console.warn('Aviso restaurando clases en localStorage:', errLocalDel);
    }
  }

  // 3. Restaurar clases en Supabase si existen
  if (isSupabaseConfigured && !isDemo && client) {
    try {
      if (effectiveClaseIds.length > 0) {
        await client
          .from('clases')
          .update({
            estado: 'DICTADA',
            articulo_licencia: null,
            tema: 'Clase dictada regular'
          })
          .in('id', effectiveClaseIds);
      } else if (target && target.fecha_inicio && target.fecha_fin) {
        const fechasRango = getFechasEnRango(target.fecha_inicio, target.fecha_fin);
        let q = client
          .from('clases')
          .update({
            estado: 'DICTADA',
            articulo_licencia: null,
            tema: 'Clase dictada regular'
          })
          .in('fecha', fechasRango);

        if (target.catedra_ids && target.catedra_ids.length > 0) {
          q = q.in('catedra_id', target.catedra_ids);
        } else if (target.catedra_id) {
          q = q.eq('catedra_id', target.catedra_id);
        }
        await q;
      }
    } catch (claseErr) {
      console.warn('Error restaurando clases a DICTADA:', claseErr);
    }
  }

  // 4. Eliminar en Supabase
  if (isSupabaseConfigured && !isDemo && client) {
    try {
      await client
        .from('licencias_docentes')
        .delete()
        .eq('id', licenciaId);
    } catch (err) {
      console.warn('Error al eliminar licencia de Supabase:', err);
    }
  }

  const affectedCatIds = target?.catedra_ids && target?.catedra_ids.length > 0
    ? target.catedra_ids
    : (target?.catedra_id ? [target.catedra_id] : []);
  notificarCambioLicencias(affectedCatIds, target);

  return true;
}

/**
 * Calcula los contadores reglamentarios de consumo de licencias (Decreto 1092)
 * acumulando correctamente los días computados por cada evento.
 *
 * @param {Array} licencias - Lista de licencias del año
 * @param {number|string} [targetYear] - Año actual (ej. 2026)
 * @param {string} [targetDate] - Fecha de referencia (YYYY-MM-DD)
 * @returns {Object} Contadores calculados y alertas reglamentarias
 */
export function calcularConsumoLicencias(licencias = [], targetYear = new Date().getFullYear(), targetDate = getTodayYMD()) {
  const yearStr = String(targetYear);
  const currentMonth = targetDate.substring(0, 7); // YYYY-MM

  const licenciasDelAno = licencias.filter(l => (l.fecha || '').startsWith(yearStr));
  const totalAnual = licenciasDelAno.reduce((acc, l) => acc + (Number(l.cantidad_dias) || 1), 0);

  let art15Anual = 0;
  let art15Mes = 0;
  const desglose = {};

  for (const lic of licenciasDelAno) {
    const art = lic.articulo || '';
    const artLower = art.toLowerCase();
    const isArt15 = art.includes('Art. 52') || art.includes('Art. 15') || art.includes('Art. 60') || artLower.includes('razones particulares') || lic.articulo_codigo === 'ART_52';
    const diasLic = Number(lic.cantidad_dias) || 1;

    if (isArt15) {
      art15Anual += diasLic;
      if ((lic.fecha || '').startsWith(currentMonth)) {
        art15Mes += diasLic;
      }
    }

    // Clasificación normalizada para chips
    let chipKey = 'Otro';
    if (isArt15) chipKey = art.includes('Art. 52') || lic.articulo_codigo === 'ART_52' ? 'Art. 52°' : (art.includes('Art. 60') ? 'Art. 60°' : 'Art. 15°');
    else if (art.includes('Art. 16') || art.includes('Art. 9') || art.includes('Art. 17') || artLower.includes('enfermedad') || artLower.includes('afecciones') || lic.articulo_codigo === 'ART_16') {
      chipKey = art.includes('Art. 16') || lic.articulo_codigo === 'ART_16' ? 'Art. 16°' : (art.includes('Art. 17') ? 'Art. 17°' : 'Art. 9°');
    }
    else if (art.includes('Art. 30') || art.includes('Art. 24') || art.includes('Art. 22') || artLower.includes('familiar') || lic.articulo_codigo === 'ART_30_GOCE') {
      chipKey = art.includes('Art. 30') ? 'Art. 30°' : (art.includes('Art. 22') ? 'Art. 22°' : 'Art. 24°');
    }
    else if (art.includes('Art. 41') || art.includes('Art. 28') || art.includes('Art. 29') || artLower.includes('perfeccionamiento') || artLower.includes('capacitación') || lic.articulo_codigo === 'ART_41') chipKey = 'Art. 41°';
    else if (art.includes('Art. 53') || art.includes('Art. 54') || art.includes('Art. 32') || art.includes('Art. 35') || artLower.includes('mesa') || artLower.includes('tribunal') || lic.articulo_codigo?.startsWith('ART_53')) {
      chipKey = 'Art. 53°/54°';
    }
    else if (art.includes('Art. 49') || art.includes('Art. 45') || artLower.includes('fuerza mayor') || artLower.includes('meteorológico') || lic.articulo_codigo === 'ART_49') {
      chipKey = 'Art. 49°';
    }
    else {
      const match = art.match(/Art\.?\s*(\d+)/i);
      chipKey = match ? `Art. ${match[1]}°` : 'Otro';
    }

    desglose[chipKey] = (desglose[chipKey] || 0) + diasLic;
  }

  // Alertas reglamentarias (Decreto 1092: Máx 6 por año, Máx 2 por mes)
  const art15AnualMax = 6;
  const art15MesMax = 2;

  let alertaArt15 = 'normal';
  if (art15Anual >= art15AnualMax || art15Mes >= art15MesMax) {
    alertaArt15 = 'limite';
  } else if (art15Anual >= 4 || art15Mes >= 1) {
    alertaArt15 = 'advertencia';
  }

  return {
    totalAnual,
    art15: {
      usadosAnio: art15Anual,
      maxAnio: art15AnualMax,
      usadosMes: art15Mes,
      maxMes: art15MesMax,
      alerta: alertaArt15
    },
    desglose,
    licenciasDelAno
  };
}

/**
 * Calcula la disponibilidad, consumo y alertas de un artículo del Decreto 1092
 * para una fecha y docente dados según su modalidad de límite:
 * 'SIN_LIMITE' | 'POR_EVENTO' | 'CON_TOPE'
 *
 * @param {string} articuloCodigoOTexto - Código del artículo (ej. 'ART_52') o texto
 * @param {Array} licencias - Historial de licencias
 * @param {string} [fecha] - Fecha de referencia (YYYY-MM-DD, default hoy)
 * @returns {Object} Información completa de disponibilidad, topes y mensajes
 */
export function calcularDisponibilidadArticulo(articuloCodigoOTexto, licencias = [], fecha = getTodayYMD()) {
  const art = getArticuloByCodigo(articuloCodigoOTexto) || getArticuloByText(articuloCodigoOTexto);
  if (!art) {
    return {
      art: null,
      modo: 'SIN_LIMITE',
      usadosAnio: 0,
      usadosMes: 0,
      restantesAnio: null,
      restantesMes: null,
      topeEvento: null,
      bloqueado: false,
      alerta: 'info',
      badgeColor: 'blue',
      mensajeSolicitud: null,
      mensajeAnual: 'Artículo no catalogado o especial',
      mensajeMensual: null,
      mensajes: ['Artículo no catalogado o especial']
    };
  }

  const anio = fecha ? String(fecha).substring(0, 4) : String(new Date().getFullYear());
  const mes = fecha ? String(fecha).substring(0, 7) : `${anio}-01`;
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const mesNum = parseInt(mes.substring(5, 7), 10);
  const nombreMes = (!isNaN(mesNum) && mesNum >= 1 && mesNum <= 12) ? MESES[mesNum - 1] : 'este mes';

  const licenciasDelAno = (licencias || []).filter(l => (l.fecha || '').startsWith(anio));
  const licenciasDelMes = licenciasDelAno.filter(l => (l.fecha || '').startsWith(mes));

  function matchLicencia(lic) {
    const licCod = lic.articulo_codigo || getArticuloByText(lic.articulo)?.codigo;
    if (!licCod) return false;
    if (licCod === art.codigo) return true;
    if (art.grupoCupo) {
      const otherArt = getArticuloByCodigo(licCod);
      if (otherArt?.grupoCupo && otherArt.grupoCupo === art.grupoCupo) {
        return true;
      }
    }
    return false;
  }

  const usadosAnio = licenciasDelAno.filter(matchLicencia).reduce((acc, l) => acc + (Number(l.cantidad_dias) || 1), 0);
  const usadosMes = licenciasDelMes.filter(matchLicencia).reduce((acc, l) => acc + (Number(l.cantidad_dias) || 1), 0);

  if (art.modoLimite === 'SIN_LIMITE') {
    const mensajeAnual = `♾️ Sin límite anual fijo (${art.unidad}) — Llevás ${usadosAnio} días registrados en ${anio}`;
    const mensajeMensual = `♾️ Sin límite mensual fijo — Llevás ${usadosMes} días registrados en ${nombreMes}`;
    return {
      art,
      modo: 'SIN_LIMITE',
      usadosAnio,
      usadosMes,
      restantesAnio: null,
      restantesMes: null,
      topeEvento: null,
      bloqueado: false,
      alerta: 'info',
      badgeColor: 'blue',
      mensajeSolicitud: null,
      mensajeAnual,
      mensajeMensual,
      mensajes: [mensajeAnual, mensajeMensual]
    };
  }

  if (art.modoLimite === 'POR_EVENTO') {
    const mensajeSolicitud = `📌 Tope por evento: hasta ${art.topePorEvento} ${art.unidad}`;
    const mensajeAnual = `♾️ Sin tope anual ni mensual de ocurrencias (Usados este año: ${usadosAnio} días / este mes: ${usadosMes} días)`;
    return {
      art,
      modo: 'POR_EVENTO',
      usadosAnio,
      usadosMes,
      restantesAnio: null,
      restantesMes: null,
      topeEvento: art.topePorEvento,
      bloqueado: false,
      alerta: 'evento',
      badgeColor: 'indigo',
      mensajeSolicitud,
      mensajeAnual,
      mensajeMensual: null,
      mensajes: [mensajeSolicitud, mensajeAnual]
    };
  }

  // Modo: CON_TOPE
  const restantesAnio = Math.max(0, art.topeAnual - usadosAnio);
  const restantesMes = art.topeMensual != null ? Math.max(0, art.topeMensual - usadosMes) : null;
  const bloqueado = (restantesAnio <= 0) || (restantesMes !== null && restantesMes <= 0);
  const alerta = bloqueado ? 'limite' : (restantesAnio <= 1 || (restantesMes !== null && restantesMes <= 1) ? 'advertencia' : 'normal');
  const badgeColor = bloqueado ? 'red' : (alerta === 'advertencia' ? 'amber' : 'emerald');

  const mensajeAnual = `📊 Cupo Anual: Usaste ${usadosAnio} de ${art.topeAnual} → Te quedan ${restantesAnio} ${art.unidad}`;
  const mensajeMensual = art.topeMensual != null
    ? `📅 Cupo Mensual: Usaste ${usadosMes} de ${art.topeMensual} → Te quedan ${restantesMes} este mes.`
    : `📅 Mensual: Sin límite mensual (disponibles hasta ${restantesAnio} días de tu saldo anual).`;

  return {
    art,
    modo: 'CON_TOPE',
    usadosAnio,
    usadosMes,
    restantesAnio,
    restantesMes,
    topeEvento: art.topePorEvento || null,
    bloqueado,
    alerta,
    badgeColor,
    mensajeSolicitud: null,
    mensajeAnual,
    mensajeMensual,
    mensajes: [mensajeAnual, mensajeMensual]
  };
}

