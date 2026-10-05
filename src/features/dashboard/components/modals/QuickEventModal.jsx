import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Modal from '../../../../components/common/Modal';
import CustomSelect from '../../../../components/common/CustomSelect';
import Button from '../../../../components/common/Button';
import { supabase, isSupabaseConfigured } from '../../../../lib/supabase';
import { handleAppError } from '../../../../utils/handleAppError';
import { formatFechaDMY, parseDMYtoYMD, getTodayYMD } from '../../../../lib/dateUtils';

export default function QuickEventModal({
  isOpen,
  onClose,
  user,
  isDemo,
  onEventCreated
}) {
  const [newEventTitulo, setNewEventTitulo] = useState('');
  const [newEventTipo, setNewEventTipo] = useState('TRIBUNAL_EXAMEN');
  const [newEventFecha, setNewEventFecha] = useState(getTodayYMD());
  const [newEventHora, setNewEventHora] = useState('08:00');
  const [newEventNotas, setNewEventNotas] = useState('');
  const [savingEvent, setSavingEvent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewEventTitulo('');
      setNewEventTipo('TRIBUNAL_EXAMEN');
      setNewEventFecha(getTodayYMD());
      setNewEventHora('08:00');
      setNewEventNotas('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newEventTitulo.trim() || !newEventFecha) return;

    setSavingEvent(true);
    try {
      const fechaIso = parseDMYtoYMD(newEventFecha);
      const startDateObj = new Date(`${fechaIso}T${newEventHora || '08:00'}:00`);
      const endDateObj = new Date(`${fechaIso}T10:00:00`);
      const startDateTime = isNaN(startDateObj.getTime()) ? `${fechaIso}T${newEventHora || '08:00'}:00Z` : startDateObj.toISOString();
      const endDateTime = isNaN(endDateObj.getTime()) ? `${fechaIso}T10:00:00Z` : endDateObj.toISOString();

      if (isSupabaseConfigured && !isDemo && user) {
        const { data, error } = await supabase
          .from('eventos_calendario')
          .insert({
            docente_id: user.id,
            titulo: newEventTitulo.trim(),
            tipo: newEventTipo,
            fecha_inicio: startDateTime,
            fecha_fin: endDateTime,
            notas: newEventNotas.trim() || null
          })
          .select()
          .single();

        if (error) throw error;
        toast.success('Evento agendado en tu calendario.');
        onClose();
        if (onEventCreated) await onEventCreated();
      } else {
        const newEv = {
          id: 'ev-' + Date.now(),
          titulo: newEventTitulo.trim(),
          tipo: newEventTipo,
          fecha: fechaIso,
          hora: newEventHora,
          notas: newEventNotas.trim()
        };
        toast.success('Evento agregado a la agenda.');
        onClose();
        if (onEventCreated) onEventCreated(newEv);
      }
    } catch (err) {
      handleAppError(err, 'DashboardPage / Agendar Evento Rápido', user);
    } finally {
      setSavingEvent(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Recordatorio o Evento en Agenda"
      subtitle="Agrega mesas de examen, reuniones o fechas límite para los próximos días"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
            Título del Compromiso *
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Mesa de Examen Final, Jornada Institucional, Entrega de Actas..."
            value={newEventTitulo}
            onChange={(e) => setNewEventTitulo(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Tipo de Evento *
            </label>
            <CustomSelect
              value={newEventTipo}
              onChange={(val) => setNewEventTipo(typeof val === 'object' ? val.target.value : val)}
              options={[
                { value: 'TRIBUNAL_EXAMEN', label: 'Mesa / Tribunal de Examen', badge: 'Examen' },
                { value: 'REUNION', label: 'Reunión Institucional', badge: 'Reunión' },
                { value: 'PERIODO', label: 'Cierre de Período / Notas', badge: 'Cierre' },
                { value: 'CLASE', label: 'Clase Especial', badge: 'Clase' },
                { value: 'OTRO', label: 'Otro Compromiso', badge: 'General' }
              ]}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase text-text-secondary">
                Fecha *
              </label>
              <span className="text-[10px] font-mono text-primary font-bold">
                {formatFechaDMY(newEventFecha)}
              </span>
            </div>
            <input
              type="date"
              required
              value={newEventFecha}
              onChange={(e) => setNewEventFecha(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
            Hora de Inicio (Opcional)
          </label>
          <input
            type="time"
            value={newEventHora}
            onChange={(e) => setNewEventHora(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
            Notas o Detalles (Opcional)
          </label>
          <textarea
            rows={2}
            placeholder="Detalle de aula, cátedras participantes o pautas de entrega..."
            value={newEventNotas}
            onChange={(e) => setNewEventNotas(e.target.value)}
            className="w-full px-3.5 py-2 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={savingEvent}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={savingEvent}
          >
            Guardar Evento en Agenda
          </Button>
        </div>
      </form>
    </Modal>
  );
}
