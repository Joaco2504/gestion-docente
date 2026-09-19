import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Save } from 'lucide-react';

/**
 * QuickSaveFab / QuickSaveFAB - Botón Flotante de Guardado Rápido (Quick Action FAB)
 * Sistema de Marca Korum: Botón circular esmeralda fijo en la esquina inferior derecha
 * relativo al viewport (Portal en document.body con z-50), reactivo al estado isDirty / hasChanges.
 */
export function QuickSaveFab({
  onSave,
  isSaving = false,
  loading = false,
  visible = undefined,
  disabled = false,
  isDirty = false,
  hasChanges = false,
  shortcutEnabled = true,
  tooltipText = 'Guardado Rápido (Ctrl + S)',
  ariaLabel = 'Guardado rápido (Ctrl + S)'
}) {
  const saving = Boolean(isSaving || loading);
  const isDisabled = Boolean(disabled || saving);

  // Visibilidad reactiva estricta según isDirty o hasChanges (o visible como fallback)
  const isDirtyState = Boolean(isDirty || hasChanges || (visible !== undefined ? visible : false));

  // Escucha global de teclado: Ctrl + S / Cmd + S
  useEffect(() => {
    if (!shortcutEnabled || disabled || !isDirtyState) return;

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        if (!saving && typeof onSave === 'function') {
          if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur();
          }
          onSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, saving, disabled, isDirtyState, shortcutEnabled]);

  const fabContent = (
    <div
      className={`fixed bottom-6 right-6 z-50 group select-none transition-all duration-300 ease-out origin-bottom-right ${
        isDirtyState
          ? 'scale-100 opacity-100 pointer-events-auto'
          : 'scale-0 opacity-0 pointer-events-none'
      }`}
    >
      <button
        type="button"
        onClick={onSave}
        disabled={isDisabled}
        title={tooltipText}
        aria-label={ariaLabel}
        className="h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-2xl shadow-emerald-600/40 border-2 border-white/20 flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer disabled:opacity-60 relative"
      >
        {/* Distintivo indicador de cambios pendientes */}
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border border-white text-[9px] font-black text-white items-center justify-center shadow-xs">
            !
          </span>
        </span>

        <Save className={`w-6 h-6 transition-transform ${saving ? 'animate-spin' : 'group-hover:rotate-6'}`} />
      </button>

      <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md bg-slate-900 text-white text-xs font-mono whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-lg border border-slate-800">
        {tooltipText}
      </span>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(fabContent, document.body);
}

export const QuickSaveFAB = QuickSaveFab;
export default QuickSaveFab;
