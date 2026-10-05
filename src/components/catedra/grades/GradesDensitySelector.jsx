import React from 'react';
import { SlidersHorizontal, Rows3, Rows4 } from 'lucide-react';

/**
 * Selector de densidad para la sábana de calificaciones.
 * Persiste la preferencia ("comfortable" | "compact") en localStorage.
 */
export default function GradesDensitySelector({ density, onDensityChange }) {
  const isCompact = density === 'compact';

  return (
    <div className="inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/80 p-0.5 border border-slate-200/80 dark:border-slate-700/80">
      <button
        type="button"
        onClick={() => onDensityChange('comfortable')}
        title="Densidad cómoda: celdas más amplias para revisión detallada"
        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all touch-target-44 ${
          !isCompact
            ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
      >
        <Rows3 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Cómoda</span>
      </button>

      <button
        type="button"
        onClick={() => onDensityChange('compact')}
        title="Densidad compacta: máxima información visible en pantalla"
        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all touch-target-44 ${
          isCompact
            ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
      >
        <Rows4 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Compacta</span>
      </button>
    </div>
  );
}
