import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import Modal from '../../../../components/common/Modal';
import CustomSelect from '../../../../components/common/CustomSelect';
import Button from '../../../../components/common/Button';
import { supabase, isSupabaseConfigured } from '../../../../lib/supabase';
import { handleAppError } from '../../../../utils/handleAppError';
import { formatFechaDMY, parseDMYtoYMD, getTodayYMD } from '../../../../lib/dateUtils';
import { quickEventSchema } from '../../../../schemas/dashboardForms';

export default function QuickEventModal({
  isOpen,
  onClose,
  user,
  isDemo,
  onEventCreated
}) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(quickEventSchema),
    defaultValues: {
      titulo: '',
      tipo: 'TRIBUNAL_EXAMEN',
      fecha: getTodayYMD(),
      hora: '08:00',
      notas: ''
    }
  });

  const currentFecha = watch('fecha');

  useEffect(() => {
    if (isOpen) {
      reset({
        titulo: '',
        tipo: 'TRIBUNAL_EXAMEN',
        fecha: getTodayYMD(),
        hora: '08:00',
        notas: ''
      });
    }
  }, [isOpen, reset]);

  const onFormSubmit = async (formData) => {
    try {
      const fechaIso = parseDMYtoYMD(formData.fecha);
      const horaVal = formData.hora || '08:00';
      const startDateObj = new Date(`${fechaIso}T${horaVal}:00`);
      const endDateObj = new Date(`${fechaIso}T10:00:00`);
      const startDateTime = isNaN(startDateObj.getTime()) ? `${fechaIso}T${horaVal}:00Z` : startDateObj.toISOString();
      const endDateTime = isNaN(endDateObj.getTime()) ? `${fechaIso}T10:00:00Z` : endDateObj.toISOString();

      if (isSupabaseConfigured && !isDemo && user) {
        const { error } = await supabase
          .from('eventos_calendario')
          .insert({
            docente_id: user.id,
            titulo: formData.titulo.trim(),
            tipo: formData.tipo,
            fecha_inicio: startDateTime,
            fecha_fin: endDateTime,
            notas: formData.notas.trim() || null
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
          titulo: formData.titulo.trim(),
          tipo: formData.tipo,
          fecha: fechaIso,
          hora: horaVal,
          notas: formData.notas.trim()
        };
        toast.success('Evento agregado a la agenda.');
        onClose();
        if (onEventCreated) onEventCreated(newEv);
      }
    } catch (err) {
      handleAppError(err, 'DashboardPage / Agendar Evento Rápido', user);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Recordatorio o Evento en Agenda"
      subtitle="Agrega mesas de examen, reuniones o fechas límite para los próximos días"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="event-titulo" className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
            Título del Compromiso *
          </label>
          <input
            id="event-titulo"
            type="text"
            placeholder="Ej: Mesa de Examen Final, Jornada Institucional, Entrega de Actas..."
            {...register('titulo')}
            aria-invalid={!!errors.titulo}
            aria-describedby={errors.titulo ? 'event-titulo-error' : undefined}
            className={`w-full px-3.5 py-2.5 text-sm border rounded-xl outline-none bg-surface text-text-primary transition-colors ${
              errors.titulo
                ? 'border-danger focus:ring-2 focus:ring-danger/20'
                : 'border-surface-border focus:ring-2 focus:ring-primary/20'
            }`}
          />
          {errors.titulo && (
            <p id="event-titulo-error" role="alert" className="text-xs text-danger mt-1">
              {errors.titulo.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Tipo de Evento *
            </label>
            <Controller
              name="tipo"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  value={field.value}
                  onChange={(val) => field.onChange(typeof val === 'object' ? val.target.value : val)}
                  options={[
                    { value: 'TRIBUNAL_EXAMEN', label: 'Mesa / Tribunal de Examen', badge: 'Examen' },
                    { value: 'REUNION', label: 'Reunión Institucional', badge: 'Reunión' },
                    { value: 'PERIODO', label: 'Cierre de Período / Notas', badge: 'Cierre' },
                    { value: 'CLASE', label: 'Clase Especial', badge: 'Clase' },
                    { value: 'OTRO', label: 'Otro Compromiso', badge: 'General' }
                  ]}
                />
              )}
            />
            {errors.tipo && (
              <p role="alert" className="text-xs text-danger mt-1">
                {errors.tipo.message}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="event-fecha" className="block text-xs font-semibold uppercase text-text-secondary">
                Fecha *
              </label>
              <span className="text-[10px] font-mono text-primary font-bold">
                {formatFechaDMY(currentFecha)}
              </span>
            </div>
            <input
              id="event-fecha"
              type="date"
              {...register('fecha')}
              aria-invalid={!!errors.fecha}
              aria-describedby={errors.fecha ? 'event-fecha-error' : undefined}
              className={`w-full px-3.5 py-2.5 text-sm font-mono border rounded-xl outline-none bg-surface text-text-primary transition-colors ${
                errors.fecha
                  ? 'border-danger focus:ring-2 focus:ring-danger/20'
                  : 'border-surface-border focus:ring-2 focus:ring-primary/20'
              }`}
            />
            {errors.fecha && (
              <p id="event-fecha-error" role="alert" className="text-xs text-danger mt-1">
                {errors.fecha.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="event-hora" className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
            Hora de Inicio (Opcional)
          </label>
          <input
            id="event-hora"
            type="time"
            {...register('hora')}
            aria-invalid={!!errors.hora}
            aria-describedby={errors.hora ? 'event-hora-error' : undefined}
            className={`w-full px-3.5 py-2.5 text-sm font-mono border rounded-xl outline-none bg-surface text-text-primary transition-colors ${
              errors.hora
                ? 'border-danger focus:ring-2 focus:ring-danger/20'
                : 'border-surface-border focus:ring-2 focus:ring-primary/20'
            }`}
          />
          {errors.hora && (
            <p id="event-hora-error" role="alert" className="text-xs text-danger mt-1">
              {errors.hora.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="event-notas" className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
            Notas o Detalles (Opcional)
          </label>
          <textarea
            id="event-notas"
            rows={2}
            placeholder="Detalle de aula, cátedras participantes o pautas de entrega..."
            {...register('notas')}
            aria-invalid={!!errors.notas}
            aria-describedby={errors.notas ? 'event-notas-error' : undefined}
            className={`w-full px-3.5 py-2 text-sm border rounded-xl outline-none bg-surface text-text-primary resize-none transition-colors ${
              errors.notas
                ? 'border-danger focus:ring-2 focus:ring-danger/20'
                : 'border-surface-border focus:ring-2 focus:ring-primary/20'
            }`}
          />
          {errors.notas && (
            <p id="event-notas-error" role="alert" className="text-xs text-danger mt-1">
              {errors.notas.message}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
          >
            Guardar Evento en Agenda
          </Button>
        </div>
      </form>
    </Modal>
  );
}
