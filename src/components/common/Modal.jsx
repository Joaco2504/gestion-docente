import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Modal / Bottom-Sheet accesible de alto rendimiento.
 * - En móvil (<640px): se comporta como Bottom-Sheet nativo (max-h: 90dvh, rounded-t-3xl, pb-safe).
 * - Gesto swipe-down para descartar mediante Pointer Events con umbral y velocidad.
 * - En escritorio (>=640px): modal centrado clásico.
 * - Bloqueo de scroll de fondo y liberación al desmontar.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
  zIndex = 'z-[110]'
}) {
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef(null);

  // Gesto de arrastre táctil hacia abajo (Pointer Events)
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef(0);
  const dragStartTimeRef = useRef(0);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setDragOffset(0);
    timerRef.current = setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 180);
  }, [isClosing, onClose]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  // Manejo de puntero (Touch / Mouse drag) sobre el tirador y cabecera
  const handlePointerDown = (e) => {
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
      handleClose();
    } else {
      setDragOffset(0);
    }
  };

  const handlePointerCancel = () => {
    setIsDragging(false);
    setDragOffset(0);
  };

  if (!isOpen && !isClosing) return null;

  const modalContent = (
    <div className={`fixed inset-0 ${zIndex} flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 ${isClosing ? 'modal-closing pointer-events-none' : ''}`}>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-200 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Dialog (Bottom Sheet en móvil, Modal centrado en escritorio) */}
      <div
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        className={`modal-sheet modal-shell relative w-full sm:w-auto ${maxWidth} max-w-[100vw] sm:max-w-xl md:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-200/80 dark:border-white/10 overflow-hidden z-10 max-h-[90dvh] sm:max-h-[85vh] flex flex-col pb-safe ${
          isClosing ? 'animate-sheet-down sm:animate-modalOut' : 'animate-sheet-up sm:animate-scaleIn'
        }`}
        role="dialog"
        aria-modal="true"
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
              <h3 className="text-base font-bold text-text-primary truncate">{title}</h3>
              {subtitle && (
                <p className="text-xs text-text-muted mt-0.5 leading-snug">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 -mr-1 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors touch-target-44 flex items-center justify-center cursor-pointer shrink-0"
              title="Cerrar ventana"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body (Independiente del gesto de arrastre) */}
        <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 max-h-[calc(90dvh-5rem)] sm:max-h-[70vh] pb-safe">
          {children}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
