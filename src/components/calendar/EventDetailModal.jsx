import React from 'react';
import { Trash2, MapPin, Building2 } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { formatFechaDMY, getTodayDMY } from '../../lib/dateUtils';
import { obtenerFeriado } from '../../utils/feriadosAcademicos';

function safeIsoDate(d, fallback = '') {
  if (!d) return fallback;
  const dateObj = d instanceof Date ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return fallback;
  try {
    return dateObj.toISOString().split('T')[0];
  } catch (_) {
    return fallback;
  }
}

export default function EventDetailModal({
  selectedEvent,
  onClose,
  onDelete,
  onNavigateAttendance,
  feriadosMap
}) {
  if (!selectedEvent) return null;

  const eventDateStr = selectedEvent.fecha || 
    (selectedEvent.fecha_inicio ? selectedEvent.fecha_inicio.substring(0, 10) : null) || 
    (selectedEvent.date ? safeIsoDate(selectedEvent.date) : null);
  const eventFeriado = eventDateStr ? (feriadosMap?.get(eventDateStr) || obtenerFeriado(eventDateStr)) : null;

  return (
    <Modal
      isOpen={Boolean(selectedEvent)}
      onClose={onClose}
      title="Detalle del Compromiso Académico"
      subtitle="Información institucional y seguimiento pedagógico Korum"
    >
      <div className="space-y-4 text-slate-800 dark:text-slate-100">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
            Materia / Compromiso
          </label>
          <input
            type="text"
            value={selectedEvent.titulo}
            readOnly
            className="w-full px-3.5 py-2.5 text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
              Fecha
            </label>
            <input
              type="text"
              value={selectedEvent.fecha ? formatFechaDMY(selectedEvent.fecha) : getTodayDMY()}
              readOnly
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
              Hora Entrada
            </label>
            <input
              type="text"
              value={`${selectedEvent.hora_inicio || '18:30'} hs`}
              readOnly
              className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
              Hora Salida
            </label>
            <input
              type="text"
              value={`${selectedEvent.hora_fin || '20:30'} hs`}
              readOnly
              className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
              Aula Asignada
            </label>
            <div className="flex items-center gap-2 px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800">
              <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-semibold truncate">{selectedEvent.aula || 'Aula 1'}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
              Institución
            </label>
            <div className="flex items-center gap-2 px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800">
              <Building2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-semibold truncate">{selectedEvent.institucion || 'Sede Principal'}</span>
            </div>
          </div>
        </div>

        {selectedEvent.notas && (
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
              Observaciones / Tema del Libro de Aula
            </label>
            <div className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800">
              {selectedEvent.notas}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          {selectedEvent.editable ? (
            <button
              type="button"
              onClick={() => onDelete(selectedEvent.id)}
              className="text-xs text-rose-500 hover:text-rose-600 inline-flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar Evento</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {eventFeriado ? (
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold opacity-75 cursor-not-allowed border border-slate-300 dark:border-slate-700"
                title={`Jornada no laborable oficial: ${eventFeriado.nombre}`}
              >
                <span>🔒 Sin Clases (Feriado)</span>
              </button>
            ) : selectedEvent.tipo === 'LICENCIA_DOCENTE' ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold">
                <span>🛡️ Jornada Cubierta por Licencia Docente</span>
              </div>
            ) : (
              <Button
                variant="primary"
                onClick={() => onNavigateAttendance(selectedEvent)}
              >
                {selectedEvent.tipo === 'ASISTENCIA_REGISTRADA' ? '✓ Ver / Modificar Asistencia' : '⚡ Iniciar Registro de Asistencia'}
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={onClose}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
