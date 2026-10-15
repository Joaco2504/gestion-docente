import React from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useOfflineSync } from '../../services/offlineSyncService';

/**
 * OfflineSyncBadge
 * Chip de estado de conectividad y cola offline para la suite Korum.
 * Muestra:
 * - 🟢 Sincronizado (cuando hay red y 0 pendientes)
 * - 🟠 Modo Aula Offline (X pendientes) [Sincronizar ahora] (cuando offline o con cola)
 */
export default function OfflineSyncBadge({ className = '' }) {
  const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineSync();

  if (isOnline && pendingCount === 0) {
    return (
      <div 
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 select-none ${className}`}
        title="Todos los datos están sincronizados con la nube"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        <span>Sincronizado</span>
      </div>
    );
  }

  return (
    <div 
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[11px] font-bold text-amber-800 dark:text-amber-300 select-none ${className}`}
      title={isOnline ? 'Hay operaciones pendientes de sincronización' : 'Sin conexión a internet. Guardando localmente en el aula.'}
    >
      <div className="flex items-center gap-1.5">
        {isOnline ? (
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        )}
        <span>
          Modo Aula Offline {pendingCount > 0 && `(${pendingCount})`}
        </span>
      </div>

      {isOnline && pendingCount > 0 && (
        <button
          type="button"
          onClick={syncNow}
          disabled={isSyncing}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-[10px] font-bold text-amber-900 dark:text-amber-200 transition-colors cursor-pointer disabled:opacity-50"
          title="Sincronizar cambios pendientes ahora"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
        </button>
      )}
    </div>
  );
}
