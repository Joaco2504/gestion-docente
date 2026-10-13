import React, { useState, useEffect } from 'react';
import { Megaphone, AlertTriangle, X, Radio, ShieldAlert } from 'lucide-react';
import { useSystemConfig } from '../../context/SystemConfigContext';

export default function GlobalNoticeBanner() {
  const { bannerActivo, bannerMensaje, modoMantenimiento } = useSystemConfig();
  const [dismissed, setDismissed] = useState(false);
  const [lastSeenMsg, setLastSeenMsg] = useState('');

  // Reabrir el banner si el mensaje cambió
  useEffect(() => {
    if (bannerMensaje && bannerMensaje !== lastSeenMsg) {
      setDismissed(false);
      setLastSeenMsg(bannerMensaje);
    }
  }, [bannerMensaje, lastSeenMsg]);

  if (!modoMantenimiento && (!bannerActivo || !bannerMensaje || dismissed)) {
    return null;
  }

  return (
    <div className="w-full z-40 flex flex-col gap-1 print:hidden select-none animate-fadeIn">
      {/* 1. MODO MANTENIMIENTO (Alerta Crítica) */}
      {modoMantenimiento && (
        <div className="w-full bg-amber-500/15 dark:bg-amber-500/20 border-b border-amber-500/30 backdrop-blur-md px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-amber-950 dark:text-amber-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/25 flex items-center justify-center shrink-0 text-amber-700 dark:text-amber-300">
              <ShieldAlert className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-900 dark:text-amber-100 text-[10px] font-mono">
                Mantenimiento Activo
              </span>
              <span className="font-medium truncate">
                El sistema se encuentra en ventana de mantenimiento y diagnóstico. Los registros guardados permanecen a salvo.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. BANNER DE AVISO GLOBAL (Broadcast) */}
      {bannerActivo && bannerMensaje && !dismissed && (
        <div className="w-full bg-gradient-to-r from-primary/15 via-primary/10 to-blue-500/15 border-b border-primary/25 backdrop-blur-md px-3 sm:px-6 py-2 flex items-center justify-between gap-3 text-text-primary">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-primary/20 text-primary shrink-0">
              <Megaphone className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs min-w-0">
              <span className="font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-mono shrink-0">
                Aviso General
              </span>
              <p className="font-semibold text-xs text-text-primary break-words">
                {bannerMensaje}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-text-primary transition-colors cursor-pointer shrink-0"
            title="Ocultar aviso durante esta sesión"
            aria-label="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
