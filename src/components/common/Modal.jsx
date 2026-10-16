import React, { useState, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

/**
 * Modal / Bottom-Sheet accesible de alto rendimiento con @radix-ui/react-dialog.
 * - En móvil (<640px): Bottom-Sheet táctil con gesto swipe-down para descartar.
 * - En escritorio (>=640px): Modal centrado clásico con trampa de foco nativa WAI-ARIA.
 * - Portaling gestionado por Radix UI evitando recortes por overflow o z-index.
 * - Control de escape y bloqueo de scroll nativos.
 */
const SIZE_MAP = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
  '2xl': 'sm:max-w-5xl',
  '3xl': 'sm:max-w-6xl',
  '4xl': 'sm:max-w-7xl',
  full: 'sm:max-w-[96vw]'
};

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size,
  maxWidth = 'max-w-lg',
  zIndex = 'z-[110]',
  hasUnsavedChanges = false,
  unsavedChangesMessage = 'Tienes cambios sin guardar. ¿Deseas cerrar la ventana sin guardar?'
}) {
  // Gesto de arrastre táctil hacia abajo (Pointer Events)
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef(0);
  const dragStartTimeRef = useRef(0);

  const resolvedMaxWidth = size && SIZE_MAP[size] ? SIZE_MAP[size] : maxWidth;

  const handleRequestClose = () => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm(unsavedChangesMessage);
      if (!confirmClose) return;
    }
    onClose?.();
  };

  const handlePointerDown = (e) => {
    // Solo activar gesto swipe-down en pantallas táctiles o móviles (< 640px)
    if (e.pointerType === 'mouse' && typeof window !== 'undefined' && window.innerWidth >= 640) {
      return;
    }
    // Si el evento se originó en un botón o control interactivo, no iniciar arrastre ni capturar puntero
    if (e.target.closest('button, a, input, select, textarea, [role="button"], [data-no-drag]')) {
      return;
    }
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    dragStartTimeRef.current = Date.now();
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const currentY = e.clientY;
    const diff = currentY - dragStartYRef.current;
    if (diff > 0) {
      setDragOffset(diff);
    } else {
      setDragOffset(0);
    }
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch (_) {}

    const elapsed = Math.max(1, Date.now() - dragStartTimeRef.current);
    const velocity = dragOffset / elapsed; // px/ms

    // Umbral: arrastrado > 80px o velocidad hacia abajo > 0.45 px/ms con al menos 30px
    if (dragOffset > 80 || (dragOffset > 30 && velocity > 0.45)) {
      setDragOffset(0);
      handleRequestClose();
    } else {
      setDragOffset(0);
    }
  };

  const handlePointerCancel = () => {
    setIsDragging(false);
    setDragOffset(0);
  };

  return (
    <Dialog.Root
      open={Boolean(isOpen)}
      onOpenChange={(open) => {
        if (!open) {
          if (hasUnsavedChanges) {
            handleRequestClose();
          } else {
            onClose?.();
          }
        }
      }}
    >
      <Dialog.Portal>
        {/* Backdrop animado con overlay accesible de Radix */}
        <Dialog.Overlay
          className={`fixed inset-0 ${zIndex} bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200 data-[state=open]:animate-fadeIn data-[state=closed]:animate-fadeOut`}
        />

        {/* Contenedor de Posicionamiento: Bottom-Sheet en móvil, centrado en >= sm */}
        <div className={`fixed inset-0 ${zIndex} flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 pointer-events-none`}>
          <Dialog.Content
            style={{
              transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
              transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onEscapeKeyDown={(e) => {
              if (hasUnsavedChanges) {
                e.preventDefault();
                handleRequestClose();
              }
            }}
            onPointerDownOutside={(e) => {
              if (e.target?.closest?.('[role="combobox"], [data-radix-popper-content-wrapper], [role="listbox"], [data-radix-select-viewport]')) {
                e.preventDefault();
                return;
              }
              if (hasUnsavedChanges) {
                e.preventDefault();
                handleRequestClose();
              }
            }}
            className={`pointer-events-auto modal-sheet modal-shell relative w-full sm:w-[92vw] ${resolvedMaxWidth} sm:max-w-[96vw] bg-white dark:bg-[#0F172A] rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90dvh] sm:max-h-[85dvh] flex flex-col sm:my-auto pb-safe focus:outline-hidden data-[state=open]:animate-scaleIn data-[state=closed]:animate-modalOut`}
          >
            {/* Cabecera táctil con Pointer Events */}
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              style={{ touchAction: 'none' }}
              className="sm:cursor-default cursor-grab active:cursor-grabbing select-none shrink-0"
            >
              {/* Mobile Drag Handle */}
              <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
                <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
              </div>

              {/* Header Fijo */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <div className="pr-4 min-w-0 flex-1">
                  {title ? (
                    <Dialog.Title className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                      {title}
                    </Dialog.Title>
                  ) : (
                    <Dialog.Title className="sr-only">
                      Ventana de Diálogo
                    </Dialog.Title>
                  )}
                  {subtitle ? (
                    <Dialog.Description className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">
                      {subtitle}
                    </Dialog.Description>
                  ) : (
                    <Dialog.Description className="sr-only">
                      Detalles de la ventana de diálogo
                    </Dialog.Description>
                  )}
                </div>

                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="p-2 -mr-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer shrink-0"
                    title="Cerrar ventana"
                    aria-label="Cerrar ventana"
                  >
                    <X className="w-4 h-4 pointer-events-none" />
                  </button>
                </Dialog.Close>
              </div>
            </div>

            {/* Cuerpo con Scroll Vertical Independiente Contenido */}
            <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1 min-h-0 text-slate-800 dark:text-slate-200 pb-safe">
              {children}
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
