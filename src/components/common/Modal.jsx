import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg'
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog (Bottom Sheet on Mobile, Centered Modal on Tablet/Desktop) */}
      <div
        className={`relative w-full ${maxWidth} backdrop-blur-2xl bg-white/95 dark:bg-slate-900/95 rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-200/80 dark:border-white/10 overflow-hidden z-10 animate-slideUp sm:animate-fadeIn max-h-[90vh] sm:max-h-[85vh] flex flex-col`}
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile Drag Handle */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
          <div className="w-12 h-1.5 bg-text-muted/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="text-base font-bold text-text-primary">{title}</h3>
            {subtitle && (
              <p className="text-xs text-text-muted mt-0.5 leading-snug">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-1 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors touch-target-44 flex items-center justify-center cursor-pointer"
            title="Cerrar ventana"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1">
          {children}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
