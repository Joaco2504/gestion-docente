import React from 'react';
import { AlertTriangle, AlertCircle, Trash2 } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Confirmar acción?',
  description = 'Esta operación no se puede deshacer y afectará permanentemente los registros seleccionados.',
  confirmText = 'Sí, eliminar',
  cancelText = 'Cancelar',
  variant = 'danger', // 'danger' | 'warning' | 'primary'
  loading = false,
  icon: CustomIcon
}) {
  const isDanger = variant === 'danger';
  const Icon = CustomIcon || (isDanger ? Trash2 : AlertTriangle);

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title={title}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-danger/10 border border-danger/20">
          <div className="w-10 h-10 rounded-xl bg-danger/20 text-danger flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-text-primary text-sm">
              Acción de Alto Impacto
            </h4>
            <p className="text-text-secondary leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            type="button"
          >
            {cancelText}
          </Button>

          <Button
            variant={isDanger ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
            type="button"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
