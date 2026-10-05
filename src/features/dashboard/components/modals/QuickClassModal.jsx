import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import Modal from '../../../../components/common/Modal';
import Button from '../../../../components/common/Button';
import { supabase, isSupabaseConfigured } from '../../../../lib/supabase';
import { handleAppError } from '../../../../utils/handleAppError';
import { formatFechaDMY, parseDMYtoYMD, getTodayYMD } from '../../../../lib/dateUtils';
import { quickClassSchema } from '../../../../schemas/dashboardForms';

export default function QuickClassModal({
  isOpen,
  onClose,
  targetCatedra,
  user,
  isDemo,
  onClassCreated
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(quickClassSchema),
    defaultValues: {
      fecha: getTodayYMD(),
      tema: ''
    }
  });

  const currentFecha = watch('fecha');

  useEffect(() => {
    if (isOpen) {
      reset({
        fecha: getTodayYMD(),
        tema: ''
      });
    }
  }, [isOpen, reset]);

  const onFormSubmit = async (formData) => {
    if (!targetCatedra || !formData.fecha) return;

    try {
      const fechaIso = parseDMYtoYMD(formData.fecha);
      const newClaseObj = {
        catedra_id: targetCatedra.id,
        fecha: fechaIso,
        tema: formData.tema.trim() || 'Primera Clase / Presentación de la Cátedra'
      };

      if (isSupabaseConfigured && !isDemo && user) {
        const { data, error } = await supabase
          .from('clases')
          .insert(newClaseObj)
          .select()
          .single();

        if (error) throw error;

        // Si la cátedra tiene alumnos inscriptos, marcarlos a todos como presentes
        const { data: inscData } = await supabase
          .from('inscripciones')
          .select('estudiante_id')
          .eq('catedra_id', targetCatedra.id);

        if (inscData && inscData.length > 0) {
          const autoAsist = inscData.map(i => ({
            clase_id: data.id,
            estudiante_id: i.estudiante_id,
            estado: 'PRESENTE',
            updated_at: new Date().toISOString()
          }));
          const { error: asistErr } = await supabase
            .from('asistencias')
            .upsert(autoAsist, { onConflict: 'clase_id, estudiante_id' });
          if (asistErr) {
            console.warn('Aviso al guardar asistencias automáticas:', asistErr);
          }
        }

        toast.success(`Primera clase registrada el ${formatFechaDMY(formData.fecha)}.`);
        onClose();
        if (onClassCreated) await onClassCreated();
      } else {
        // Modo local
        toast.success(`Primera clase registrada el ${formatFechaDMY(formData.fecha)}.`);
        onClose();
        if (onClassCreated) {
          onClassCreated({
            id: 'clase-' + Date.now(),
            fecha: fechaIso,
            tema: formData.tema.trim() || 'Primera Clase / Presentación',
            presentes: targetCatedra.estudiantes_count || 1,
            totalAsist: targetCatedra.estudiantes_count || 1
          });
        }
      }
    } catch (err) {
      handleAppError(err, 'DashboardPage / Registrar Clase Rápida', user);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Primera Sesión de Clase"
      subtitle={targetCatedra ? `${targetCatedra.nombre} • ${targetCatedra.institucion_nombre}` : ''}
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4" noValidate>
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-xs text-text-secondary leading-relaxed flex items-start gap-2.5">
          <CheckCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>
            Al guardar la primera clase, todos los estudiantes matriculados en la cátedra quedarán registrados como <strong>PRESENTE</strong> de manera automática.
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="quick-fecha" className="block text-xs font-semibold uppercase text-text-secondary">
              Fecha de la Sesión *
            </label>
            <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
              {formatFechaDMY(currentFecha)} (DD-MM-YYYY)
            </span>
          </div>
          <input
            id="quick-fecha"
            type="date"
            {...register('fecha')}
            aria-invalid={!!errors.fecha}
            aria-describedby={errors.fecha ? 'quick-fecha-error' : undefined}
            className={`w-full px-3.5 py-2.5 text-sm font-mono border rounded-xl outline-none bg-surface text-text-primary transition-colors ${
              errors.fecha
                ? 'border-danger focus:ring-2 focus:ring-danger/20'
                : 'border-surface-border focus:ring-2 focus:ring-primary/20'
            }`}
          />
          {errors.fecha && (
            <p id="quick-fecha-error" role="alert" className="text-xs text-danger mt-1">
              {errors.fecha.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="quick-tema" className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
            Tema o Contenido Dictado
          </label>
          <input
            id="quick-tema"
            type="text"
            placeholder="Ej: Presentación de la Cátedra, Pautas y Unidad 1"
            {...register('tema')}
            aria-invalid={!!errors.tema}
            aria-describedby={errors.tema ? 'quick-tema-error' : undefined}
            className={`w-full px-3.5 py-2.5 text-sm border rounded-xl outline-none bg-surface text-text-primary transition-colors ${
              errors.tema
                ? 'border-danger focus:ring-2 focus:ring-danger/20'
                : 'border-surface-border focus:ring-2 focus:ring-primary/20'
            }`}
          />
          {errors.tema && (
            <p id="quick-tema-error" role="alert" className="text-xs text-danger mt-1">
              {errors.tema.message}
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
            Guardar Primera Clase
          </Button>
        </div>
      </form>
    </Modal>
  );
}
