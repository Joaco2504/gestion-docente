import React from 'react';
import MinimalSpinner from './MinimalSpinner';
import { GraduationCap } from 'lucide-react';

/**
 * RouteLoadingSpinner - Indicador minimalista y elegante para React Suspense
 * Muestra el imagotipo institucional de PlanillaDocente con pulso sutil y spinner no bloqueante.
 */
export default function RouteLoadingSpinner({ mensaje = 'Cargando módulo...' }) {
  return (
    <div className="w-full min-h-[50vh] flex flex-col items-center justify-center p-6 animate-fadeIn select-none">
      <div className="relative flex items-center justify-center mb-3">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
          <GraduationCap className="w-7 h-7 animate-pulse" />
        </div>
        <div className="absolute -inset-1.5 rounded-2xl border-2 border-primary/20 border-t-primary animate-spin pointer-events-none" />
      </div>
      <div className="text-center">
        <p className="text-xs font-mono font-bold text-text-primary tracking-wide">
          Planilla<span className="text-primary">Docente</span>
        </p>
        <p className="text-[11px] font-mono text-text-muted mt-0.5">
          {mensaje}
        </p>
      </div>
    </div>
  );
}
