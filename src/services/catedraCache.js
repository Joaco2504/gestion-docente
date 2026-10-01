/**
 * catedraCache - Memoria local / caché en estado para datos de cátedras
 * 
 * Evita waterfalls de red y recargas innecesarias al alternar entre las pestañas
 * "Alumnos", "Asistencias" y "Calificaciones" en CatedraDetailPage.
 */

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
    if (!entry) return null;

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
    cache.set(catedraId, {
      timestamp: Date.now(),
      data: { ...prev, ...data }
    });
  },

  /**
   * Actualiza parcialmente datos de la cátedra (ej. notas, asistencias, estudiantes)
   * @param {string} catedraId 
   * @param {Object} partialData 
   */
  update(catedraId, partialData) {
    if (!catedraId) return;
    const prev = cache.get(catedraId)?.data || {};
    cache.set(catedraId, {
      timestamp: Date.now(),
      data: { ...prev, ...partialData }
    });
  },

  /**
   * Invalida la memoria de una cátedra específica o de todas
   * @param {string} [catedraId] 
   */
  invalidate(catedraId) {
    if (catedraId) {
      cache.delete(catedraId);
    } else {
      cache.clear();
    }
  }
};
