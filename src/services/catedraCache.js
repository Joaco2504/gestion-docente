/**
 * catedraCache - Memoria local / caché sincronizada con TanStack Query
 * 
 * Evita waterfalls de red y recargas innecesarias al alternar entre las pestañas
 * "Alumnos", "Asistencias", "Calificaciones" y "Libro de Temas".
 * 
 * En la Fase 7, este módulo actúa como puente bidireccional:
 * - Mantiene 100% la interfaz síncrona original (.get, .set, .update, .invalidate)
 *   garantizando paridad absoluta y cero breaking changes con los componentes existentes.
 * - Sincroniza automáticamente los datos y las invalidaciones con `queryClient`
 *   de TanStack Query.
 */

import { queryClient } from '../lib/queryClient';
import { queryKeys } from '../lib/queryKeys';

const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos de vigencia en sesión

export const catedraCache = {
  /**
   * Obtiene los datos en caché de una cátedra si no han expirado
   * @param {string} catedraId 
   * @returns {Object|null}
   */
  get(catedraId) {
    if (!catedraId) return null;
    const entry = cache.get(catedraId);
    if (!entry) {
      // Si el Map local está vacío, intentar recuperar del cache de TanStack Query
      const reactQueryData = queryClient.getQueryData(queryKeys.catedras.fullData(catedraId));
      if (reactQueryData) {
        return reactQueryData;
      }
      return null;
    }

    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      cache.delete(catedraId);
      return null;
    }

    return entry.data;
  },

  /**
   * Guarda o reemplaza el dataset completo de la cátedra
   * @param {string} catedraId 
   * @param {Object} data 
   */
  set(catedraId, data) {
    if (!catedraId) return;
    const prev = cache.get(catedraId)?.data || {};
    const merged = { ...prev, ...data };
    cache.set(catedraId, {
      timestamp: Date.now(),
      data: merged
    });
    // Sincronizar en cache de TanStack Query
    queryClient.setQueryData(queryKeys.catedras.fullData(catedraId), merged);
  },

  /**
   * Actualiza parcialmente datos de la cátedra (ej. notas, asistencias, estudiantes)
   * @param {string} catedraId 
   * @param {Object} partialData 
   */
  update(catedraId, partialData) {
    if (!catedraId) return;
    const prev = cache.get(catedraId)?.data || {};
    const merged = { ...prev, ...partialData };
    cache.set(catedraId, {
      timestamp: Date.now(),
      data: merged
    });
    // Sincronizar en cache de TanStack Query
    queryClient.setQueryData(queryKeys.catedras.fullData(catedraId), merged);
  },

  /**
   * Invalida la memoria de una cátedra específica o de todas
   * @param {string} [catedraId] 
   */
  invalidate(catedraId) {
    if (catedraId) {
      cache.delete(catedraId);
      queryClient.invalidateQueries({ queryKey: queryKeys.catedras.detail(catedraId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.catedras.fullData(catedraId) });
    } else {
      cache.clear();
      queryClient.invalidateQueries({ queryKey: queryKeys.catedras.all });
    }
  }
};
