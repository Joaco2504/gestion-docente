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
  onOpenEditNota,
  density = 'comfortable',
  rowIdx = 0,
  colIdx = 0
}) {
  const isCompact = density === 'compact';

  const renderOriginalBadge = () => {
    if (estadoOriginal === 'NO_ENTREGO') {
      return (
        <span
          className={`${isCompact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs'} rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-mono font-bold tracking-wider inline-flex items-center gap-1 shadow-2xs select-none`}
          title="Trabajo Práctico no entregado"
        >
          N/E
        </span>
      );
    }
    if (estadoOriginal === 'AUSENTE') {
      return (
        <span
          className={`${isCompact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs'} rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 font-mono font-bold tracking-wider inline-flex items-center gap-1 shadow-2xs select-none`}
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
          className={`${
            isCompact 
              ? 'min-h-[28px] min-w-[32px] px-2 py-1 text-xs' 
              : 'min-h-[32px] min-w-[36px] px-2.5 py-1.5 text-xs'
          } rounded-lg font-mono font-bold transition-all border flex items-center justify-center shadow-2xs select-none ${
            isPromo
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/80'
              : isReg
              ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/80'
              : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950/80'
          }`}
        >
          {notaOriginal}
        </span>
      );
    }
    return (
      <span className={`${isCompact ? 'min-h-[28px] min-w-[30px] px-1.5 py-0.5' : 'min-h-[32px] min-w-[36px] px-2 py-1.5'} rounded-lg text-xs font-mono font-medium text-text-muted border border-dashed border-surface-border flex items-center justify-center hover:bg-surface-hover select-none`}>
        —
      </span>
    );
  };

  const renderRecupBadge = () => {
    if (estadoRecup === 'AUSENTE') {
      return (
        <span
          className="px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 font-mono text-[11px] font-bold tracking-wider inline-flex items-center gap-1 select-none"
          title="Ausente al recuperatorio"
        >
          R:Aus.
        </span>
      );
    }
    if (estadoRecup === 'NO_ENTREGO') {
      return (
        <span
          className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-mono text-[11px] font-bold tracking-wider inline-flex items-center gap-1 select-none"
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
          className={`${
            isCompact 
              ? 'min-h-[28px] min-w-[30px] px-1.5 py-1 text-xs' 
              : 'min-h-[32px] min-w-[34px] px-2 py-1.5 text-xs'
          } rounded-lg font-mono font-bold transition-all border flex items-center justify-center select-none ${
            isReg
              ? 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-950/80'
              : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950/80'
          }`}
        >
          R:{notaRecup}
        </span>
      );
    }
    return (
      <span className="min-h-[28px] min-w-[30px] px-1.5 py-0.5 rounded-lg text-[11px] font-mono font-medium text-purple-600 dark:text-purple-300 border border-dashed border-purple-300 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 flex items-center justify-center hover:bg-purple-100/50 select-none">
        R:—
      </span>
    );
  };

  const originalAccessibleLabel = `Calificación de ${est.apellido}, ${est.nombre} en ${ev.titulo}: ${
    notaOriginal !== null ? notaOriginal : (estadoOriginal === 'NO_ENTREGO' ? 'No entregó' : (estadoOriginal === 'AUSENTE' ? 'Ausente' : 'Sin calificar'))
  }`;

  return (
    <td className={`px-2 sm:px-3 ${isCompact ? 'py-1' : 'py-2.5'} text-center border-l border-surface-border align-middle`}>
      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          data-grade-cell="true"
          data-row={rowIdx}
          data-col={colIdx}
          onClick={() => onOpenEditNota(est, ev)}
          title={`Editar calificación de ${ev.titulo || ev.nombre || 'Evaluación'}`}
          aria-label={originalAccessibleLabel}
          className={`${
            isCompact ? 'min-h-[36px] min-w-[36px] p-0.5' : 'min-h-[44px] min-w-[44px] p-1'
          } rounded-xl transition-all touch-target-44 flex items-center justify-center active:scale-95 duration-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${
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
            aria-label={`Recuperatorio de ${est.apellido}, ${est.nombre} en ${recup.titulo}: ${
              notaRecup !== null ? notaRecup : (estadoRecup === 'NO_ENTREGO' ? 'No entregó' : (estadoRecup === 'AUSENTE' ? 'Ausente' : 'Sin calificar'))
            }`}
            className={`${
              isCompact ? 'min-h-[36px] min-w-[32px] p-0.5' : 'min-h-[44px] min-w-[44px] p-1'
            } rounded-xl transition-all touch-target-44 flex items-center justify-center active:scale-95 duration-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 ${
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
    prev.recup?.id === next.recup?.id &&
    prev.density === next.density &&
    prev.rowIdx === next.rowIdx &&
    prev.colIdx === next.colIdx
  );
});

export default GradeCell;
