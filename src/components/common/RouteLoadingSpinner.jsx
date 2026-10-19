import React from 'react';
import { GraduationCap } from 'lucide-react';

/**
 * RouteLoadingSpinner - Indicador minimalista y elegante para React Suspense
 * Muestra el imagotipo institucional de Korum con pulso sutil y spinner no bloqueante.
 */
export default function RouteLoadingSpinner({ mensaje = 'Cargando espacio académico...' }) {
  return (
    <div className="w-full min-h-[50vh] flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl animate-fadeIn select-none">
      <div className="relative flex items-center justify-center mb-3.5">
        <div className="w-14 h-14 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/25 flex items-center justify-center text-[#10B981] shadow-sm">
          <GraduationCap className="w-7 h-7 animate-pulse" />
        </div>
        <div className="absolute -inset-1.5 rounded-2xl border-2 border-[#10B981]/20 border-t-[#10B981] animate-spin pointer-events-none" />
      </div>
      <div className="text-center">
        <p className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
          Korum
        </p>
        <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
          {mensaje}
        </p>
      </div>
    </div>
  );
}
