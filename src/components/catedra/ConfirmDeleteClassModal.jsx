import React from 'react';
import { AlertTriangle, Trash2, Calendar, BookOpen, Clock } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { formatFechaDMY } from '../../lib/dateUtils';

/**
 * ConfirmDeleteClassModal - Modal Bento de Confirmación Destructiva
 * Alerta sobre el impacto exacto en registros de asistencia antes de borrar una clase.
 */
export default function ConfirmDeleteClassModal({
  isOpen,
  onClose,
  clase,
  totalAsistencias = 0,
  onConfirmDelete,
  deleting = false
}) {
  if (!clase) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={deleting ? undefined : onClose}
      title="¿Eliminar esta sesión de clase?"
    >
      <div className="space-y-4 animate-fadeIn">
        {/* Encabezado con Icono de Advertencia Rojo Suave */}
        <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-red-500/10 dark:bg-red-500/15 border border-red-500/20">
          <div className="p-3 bg-red-500/15 dark:bg-red-500/25 text-red-600 dark:text-red-400 rounded-full shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="min-w-0 space-y-1">
            <h4 className="text-sm font-bold text-red-700 dark:text-red-400">
              Advertencia de Acción Irreversible
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Esta acción recalculará los porcentajes de asistencia de todos los alumnos de la cátedra y no se puede deshacer.
            </p>
          </div>
        </div>

        {/* Tarjeta de Resumen de Impacto Bento */}
        <div className="p-4 rounded-2xl bg-surface-hover/60 dark:bg-white/[0.03] border border-surface-border space-y-3">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Clase a eliminar
            </span>
            <div className="text-sm font-bold text-text-primary flex items-center gap-2 flex-wrap">
              <span className="font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md text-xs">
                {formatFechaDMY(clase.fecha)}
              </span>
              <span className="truncate">{clase.tema || 'Sin tema'}</span>
            </div>
            {clase.horas_catedra && (
              <span className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{clase.horas_catedra} horas cátedra</span>
              </span>
            )}
          </div>

          {/* Alerta Destacada en Caja Ámbar/Roja */}
          <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-2">
            <span className="text-base shrink-0">⚠️</span>
            <span>
              Se eliminarán permanentemente los <strong>{totalAsistencias}</strong> registros de asistencia asociados a esta fecha.
            </span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-4 border-t border-surface-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={deleting}
            className="w-full sm:w-auto text-xs"
          >
            Mantener Clase
          </Button>

          <Button
            type="button"
            variant="danger"
            onClick={onConfirmDelete}
            loading={deleting}
            icon={Trash2}
            className="w-full sm:w-auto text-xs font-bold"
          >
            Sí, Eliminar Definitivamente
          </Button>
        </div>
      </div>
    </Modal>
  );
}
