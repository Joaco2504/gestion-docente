import React from 'react';

/**
 * GradeCell - Celda individual de nota de examen memoizada para la sábana de notas.
 * Soporta estados especiales contextuales:
 * - TP: 'NO_ENTREGO' (N/E)
 * - Parcial / Recuperatorio: 'AUSENTE' (Aus.)
 * - Calificación numérica estándar: 1.00 - 10.00
 */
export const GradeCell = React.memo(function GradeCell({
  est,
  ev,
  recup,
  notaOriginal,
  estadoOriginal,
  notaRecup,
  estadoRecup,
  isFlashingOriginal,
  isFlashingRecup,
  onOpenEditNota
}) {
  const renderOriginalBadge = () => {
    if (estadoOriginal === 'NO_ENTREGO') {
      return (
        <span
          className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300/80 dark:border-slate-700 font-mono text-xs font-bold tracking-wider inline-flex items-center gap-1 shadow-2xs"
          title="Trabajo Práctico no entregado"
        >
          N/E
        </span>
      );
    }
    if (estadoOriginal === 'AUSENTE') {
      return (
        <span
          className="px-2 py-1 rounded-lg bg-rose-500/10 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-500/20 font-mono text-xs font-bold tracking-wider inline-flex items-center gap-1 shadow-2xs"
          title="Ausente a la instancia de examen"
        >
          Aus.
        </span>
      );
    }
    if (notaOriginal !== null && notaOriginal !== undefined) {
      const num = Number(notaOriginal);
      const isPromo = num >= 7;
      const isReg = num >= 4;
      return (
        <span
          className={`min-h-[32px] min-w-[36px] px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border flex items-center justify-center shadow-2xs ${
            isPromo
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/70'
              : isReg
              ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/70'
              : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950/70'
          }`}
        >
          {notaOriginal}
        </span>
      );
    }
    return (
      <span className="min-h-[32px] min-w-[36px] px-2 py-1.5 rounded-lg text-xs font-mono font-medium text-text-muted border border-dashed border-surface-border flex items-center justify-center hover:bg-surface-hover">
        —
      </span>
    );
  };

  const renderRecupBadge = () => {
    if (estadoRecup === 'AUSENTE') {
      return (
        <span
          className="px-1.5 py-1 rounded-md bg-rose-500/10 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-500/20 font-mono text-xs font-bold tracking-wider inline-flex items-center gap-1"
          title="Ausente al recuperatorio"
        >
          R:Aus.
        </span>
      );
    }
    if (estadoRecup === 'NO_ENTREGO') {
      return (
        <span
          className="px-1.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300/80 dark:border-slate-700 font-mono text-xs font-bold tracking-wider inline-flex items-center gap-1"
          title="Recuperatorio no entregado"
        >
          R:N/E
        </span>
      );
    }
    if (notaRecup !== null && notaRecup !== undefined) {
      const num = Number(notaRecup);
      const isReg = num >= 4;
      return (
        <span
          className={`min-h-[32px] min-w-[34px] px-2 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border flex items-center justify-center ${
            isReg
              ? 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-950/70'
              : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950/70'
          }`}
        >
          R:{notaRecup}
        </span>
      );
    }
    return (
      <span className="min-h-[32px] min-w-[34px] px-1.5 py-1.5 rounded-lg text-xs font-mono font-medium text-purple-400 dark:text-purple-300 border border-dashed border-purple-200 dark:border-purple-900/50 bg-purple-50/30 dark:bg-purple-950/10 flex items-center justify-center hover:bg-purple-100/50">
        R:—
      </span>
    );
  };

  return (
    <td className="px-3 sm:px-4 py-3 text-center border-l border-surface-border">
      <div className="flex items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={() => onOpenEditNota(est, ev)}
          title={`Editar calificación de ${ev.titulo || ev.nombre || 'Evaluación'}`}
          className={`min-h-[44px] min-w-[44px] p-1 rounded-xl transition-all touch-target-44 flex items-center justify-center active:scale-95 duration-100 cursor-pointer ${
            isFlashingOriginal ? 'animate-flash-success ring-2 ring-emerald-500 rounded-xl' : ''
          }`}
        >
          {renderOriginalBadge()}
        </button>

        {recup && (
          <button
            type="button"
            onClick={() => onOpenEditNota(est, recup)}
            title={`Editar recuperatorio: ${recup.titulo || recup.nombre || 'Recuperatorio'}`}
            className={`min-h-[44px] min-w-[44px] p-1 rounded-xl transition-all touch-target-44 flex items-center justify-center active:scale-95 duration-100 cursor-pointer ${
              isFlashingRecup ? 'animate-flash-success ring-2 ring-purple-500 rounded-xl' : ''
            }`}
          >
            {renderRecupBadge()}
          </button>
        )}
      </div>
    </td>
  );
}, (prev, next) => {
  return (
    prev.notaOriginal === next.notaOriginal &&
    prev.estadoOriginal === next.estadoOriginal &&
    prev.notaRecup === next.notaRecup &&
    prev.estadoRecup === next.estadoRecup &&
    prev.isFlashingOriginal === next.isFlashingOriginal &&
    prev.isFlashingRecup === next.isFlashingRecup &&
    prev.ev.id === next.ev.id &&
    prev.recup?.id === next.recup?.id
  );
});

export default GradeCell;
