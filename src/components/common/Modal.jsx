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
export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
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

  const handleRequestClose = () => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm(unsavedChangesMessage);
      if (!confirmClose) return;
    }
    onClose?.();
  };

  const handlePointerDown = (e) => {
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
          handleRequestClose();
        }
      }}
    >
      <Dialog.Portal>
        {/* Backdrop animado con overlay accesible de Radix */}
        <Dialog.Overlay
          className={`fixed inset-0 ${zIndex} bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200 data-[state=open]:animate-fadeIn data-[state=closed]:animate-fadeOut`}
        />

        {/* Contenedor de Posicionamiento */}
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
              if (hasUnsavedChanges) {
                e.preventDefault();
                handleRequestClose();
              }
            }}
            className={`pointer-events-auto modal-sheet modal-shell relative w-full sm:w-auto ${maxWidth} max-w-[100vw] sm:max-w-xl md:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-200/80 dark:border-white/10 overflow-hidden max-h-[90dvh] sm:max-h-[85vh] flex flex-col pb-safe focus:outline-hidden data-[state=open]:animate-sheet-up sm:data-[state=open]:animate-scaleIn data-[state=closed]:animate-sheet-down sm:data-[state=closed]:animate-modalOut`}
          >
            {/* Cabecera táctil deslizable con Pointer Events */}
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              style={{ touchAction: 'none' }}
              className="cursor-grab active:cursor-grabbing select-none shrink-0"
            >
              {/* Mobile Drag Handle */}
              <div className="sm:hidden pt-3 pb-1.5 flex justify-center">
                <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="pr-10 min-w-0">
                  {title ? (
                    <Dialog.Title className="text-base font-bold text-text-primary truncate">
                      {title}
                    </Dialog.Title>
                  ) : (
                    <Dialog.Title className="sr-only">
                      Ventana de Diálogo
                    </Dialog.Title>
                  )}
                  {subtitle ? (
                    <Dialog.Description className="text-xs text-text-muted mt-0.5 leading-snug">
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRequestClose();
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                    }}
                    className="p-2 -mr-1 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors touch-target-44 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer shrink-0"
                    title="Cerrar ventana"
                    aria-label="Cerrar ventana"
                  >
                    <X className="w-5 h-5 pointer-events-none" />
                  </button>
                </Dialog.Close>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 max-h-[calc(90dvh-5rem)] sm:max-h-[70vh] pb-safe">
              {children}
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
