import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { toast } from 'sonner';

export const OFFLINE_QUEUE_KEY = 'korum_offline_mutations_queue';
export const OFFLINE_SYNC_EVENT = 'korum_offline_queue_changed';

/**
 * Obtiene la cola de mutaciones offline almacenadas en localStorage
 */
export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Error leyendo cola offline de localStorage:', err);
    return [];
  }
}

/**
 * Guarda la cola actualizada en localStorage y notifica a los suscriptores
 */
export function saveOfflineQueue(queue) {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(OFFLINE_SYNC_EVENT, { detail: { count: queue.length } }));
    }
  } catch (err) {
    console.warn('Error guardando cola offline en localStorage:', err);
  }
}

/**
 * Encola una mutación offline para sincronización diferida
 * @param {Object} mutation
 * @param {'ASISTENCIA_INDIVIDUAL'|'ASISTENCIA_LOTE'|'CLASE_UPSERT'} mutation.tipo
 * @param {Object|Array} mutation.payload
 * @param {string} [mutation.catedraId]
 */
export function enqueueOfflineMutation({ tipo, payload, catedraId }) {
  const queue = getOfflineQueue();
  const id = `mut-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const item = {
    id,
    tipo,
    payload,
    catedraId,
    timestamp: new Date().toISOString()
  };

  // Deduplicación inteligente: si es asistencia individual para el mismo alumno y clase, reemplazar
  if (tipo === 'ASISTENCIA_INDIVIDUAL') {
    const idx = queue.findIndex(
      q => q.tipo === 'ASISTENCIA_INDIVIDUAL' &&
           q.payload.clase_id === payload.clase_id &&
           q.payload.estudiante_id === payload.estudiante_id
    );
    if (idx >= 0) {
      queue[idx] = item;
      saveOfflineQueue(queue);
      return item;
    }
  }

  queue.push(item);
  saveOfflineQueue(queue);
  return item;
}

let isSyncInProgress = false;

/**
 * Sincroniza todas las mutaciones pendientes contra Supabase
 */
export async function syncPendingMutations() {
  if (isSyncInProgress) {
    return { success: true, synced: 0, message: 'Sincronización ya en curso' };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { success: false, synced: 0, error: 'Sin conexión a internet' };
  }

  if (!isSupabaseConfigured) {
    return { success: true, synced: 0, message: 'Modo demo / local activo' };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { success: true, synced: 0 };
  }

  isSyncInProgress = true;
  const remaining = [];
  let syncedCount = 0;

  try {
    for (const item of queue) {
      try {
        if (item.tipo === 'ASISTENCIA_INDIVIDUAL') {
          const { error } = await supabase
            .from('asistencias')
            .upsert(item.payload, { onConflict: 'clase_id, estudiante_id' });
          if (error) throw error;
          syncedCount++;
        } else if (item.tipo === 'ASISTENCIA_LOTE') {
          const rows = Array.isArray(item.payload) ? item.payload : [];
          if (rows.length > 0) {
            const { error } = await supabase
              .from('asistencias')
              .upsert(rows, { onConflict: 'clase_id, estudiante_id' });
            if (error) throw error;
          }
          syncedCount++;
        } else if (item.tipo === 'CLASE_UPSERT') {
          const { error } = await supabase
            .from('clases')
            .upsert(item.payload, { onConflict: 'catedra_id, fecha' });
          if (error) throw error;
          syncedCount++;
        } else if (item.tipo === 'LICENCIA_UPSERT') {
          const p = item.payload || {};
          const { error } = await supabase
            .from('licencias_docentes')
            .upsert({
              id: p.id && !String(p.id).startsWith('lic-') && !String(p.id).startsWith('clase-lic-') ? p.id : undefined,
              docente_id: p.docente_id,
              fecha: p.fecha,
              articulo: p.articulo,
              observacion: p.observacion,
              estado_tramite: p.estado_tramite,
              catedra_id: p.catedra_id,
              clase_id: p.clase_id
            });
          if (error) throw error;
          syncedCount++;
        } else {
          // Tipo no reconocido, descartar
          syncedCount++;
        }
      } catch (err) {
        console.warn('Error sincronizando mutación offline:', item, err);
        // Mantener en la cola para reintento posterior si fue error de red
        remaining.push(item);
      }
    }

    saveOfflineQueue(remaining);

    if (syncedCount > 0 && remaining.length === 0) {
      toast.success('☁️ Conexión restablecida: asistencias sincronizadas', {
        duration: 3500
      });
    } else if (remaining.length > 0) {
      toast.warning(`Sincronizadas ${syncedCount} operaciones. Quedan ${remaining.length} pendientes.`, {
        duration: 4000
      });
    }

    return {
      success: remaining.length === 0,
      synced: syncedCount,
      remaining: remaining.length
    };
  } finally {
    isSyncInProgress = false;
  }
}

/**
 * Escucha global para sincronización automática al volver en línea
 */
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncPendingMutations().catch(err => console.warn('Error en autosync online:', err));
  });
}

/**
 * Hook de React para observar el estado de conectividad y la cola de mutaciones
 */
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(() => getOfflineQueue().length);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      handleSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };
    const handleQueueChange = () => {
      setPendingCount(getOfflineQueue().length);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener(OFFLINE_SYNC_EVENT, handleQueueChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(OFFLINE_SYNC_EVENT, handleQueueChange);
    };
  }, []);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      await syncPendingMutations();
    } finally {
      setIsSyncing(false);
      setPendingCount(getOfflineQueue().length);
    }
  }, []);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    syncNow: handleSync
  };
}
