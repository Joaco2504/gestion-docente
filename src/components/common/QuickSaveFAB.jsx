import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Save } from 'lucide-react';

/**
 * QuickSaveFAB - Botón Flotante de Guardado Rápido (Quick Action FAB)
 * Proporciona un botón circular fijo en la esquina inferior derecha con tooltip "Guardado rápido (Ctrl + S)"
 * e intercepción del atajo de teclado Ctrl+S / Cmd+S.
 */
export default function QuickSaveFAB({
  onSave,
  loading = false,
  disabled = false,
  tooltipText = 'Guardado rápido (Ctrl + S)',
  ariaLabel = 'Guardado rápido',
  shortcutEnabled = true,
  hasChanges = false
}) {
  const [isHovered, setIsHovered] = useState(false);

  // Atajo de teclado global Ctrl + S / Cmd + S
  useEffect(() => {
    if (!shortcutEnabled || disabled) return;

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        if (!loading && typeof onSave === 'function') {
          onSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, loading, disabled, shortcutEnabled]);

  if (typeof document === 'undefined') return null;

  const content = (
    <div className="group pointer-events-auto select-none">
      {/* Tooltip flotante a la izquierda del botón */}
      <div 
        role="tooltip"
        className={`fixed bottom-8 right-24 z-40 px-3.5 py-1.5 rounded-xl bg-slate-950/95 dark:bg-slate-900/95 text-white text-xs font-semibold shadow-2xl border border-white/10 transition-all duration-200 pointer-events-none whitespace-nowrap flex items-center gap-1.5 ${
          isHovered 
            ? 'opacity-100 translate-x-0 scale-100' 
            : 'opacity-0 translate-x-2 scale-95 hidden sm:flex'
        }`}
      >
        <span>{tooltipText}</span>
      </div>

      {/* Botón Circular FAB con estilo exacto */}
      <button
        type="button"
        onClick={onSave}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={disabled || loading}
        aria-label={ariaLabel}
        title={tooltipText}
        className={`fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 border-2 border-white/20 cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
        }`}
      >
        {/* Distintivo animado si hay cambios pendientes */}
        {hasChanges && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border border-white text-[9px] font-black text-white items-center justify-center">
              !
            </span>
          </span>
        )}

        {loading ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Save className="w-6 h-6 drop-shadow-md" />
        )}
      </button>
    </div>
  );

  return createPortal(content, document.body);
}
