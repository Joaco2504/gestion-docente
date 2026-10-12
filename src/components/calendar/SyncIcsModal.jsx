import React from 'react';
import { Download } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';

export default function SyncIcsModal({
  isOpen,
  onClose,
  onDownloadIcs
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sincronizar Calendario Académico"
      subtitle="Exporta tus cátedras y exámenes hacia Google Calendar, Outlook o Apple Calendar"
    >
      <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
        <p>
          Descarga el archivo <strong>iCalendar (.ics)</strong> para importar tus horarios directamente en tu dispositivo móvil o servicio de calendario.
        </p>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
          <span className="font-bold text-slate-800 dark:text-slate-100 text-xs block">
            Pasos para sincronizar con Google Calendar:
          </span>
          <ol className="list-decimal list-inside space-y-1 text-xs text-slate-500 dark:text-slate-400">
            <li>Haz clic en "Descargar Archivo .ics".</li>
            <li>Abre Google Calendar en tu navegador.</li>
            <li>Ve a Configuración &gt; Importar y exportar &gt; Selecciona el archivo descargado.</li>
          </ol>
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={onClose}
            type="button"
          >
            Cerrar
          </Button>
          <Button
            variant="primary"
            icon={Download}
            onClick={onDownloadIcs}
          >
            Descargar Archivo .ics
          </Button>
        </div>
      </div>
    </Modal>
  );
}
