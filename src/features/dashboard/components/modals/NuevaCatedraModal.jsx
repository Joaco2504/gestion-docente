import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import Modal from '../../../../components/common/Modal';
import CustomSelect from '../../../../components/common/CustomSelect';
import Button from '../../../../components/common/Button';
import { supabase, isSupabaseConfigured } from '../../../../lib/supabase';
import { handleAppError } from '../../../../utils/handleAppError';
import { nuevaCatedraSchema } from '../../../../schemas/dashboardForms';

export default function NuevaCatedraModal({
  isOpen,
  onClose,
  user,
  isDemo,
  instituciones = [],
  activeInstitucion,
  activeCiclo,
  ciclosLectivos = [],
  refreshData,
  onCatedraCreated
}) {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

  const defaultInstId = activeInstitucion?.id || instituciones[0]?.id || '';
  const defaultNivel = activeInstitucion?.nivel || instituciones[0]?.nivel || 'TERCIARIO';

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(nuevaCatedraSchema),
    defaultValues: {
      nombre: '',
      institucion_id: defaultInstId,
      nivel: defaultNivel,
      modalidad: 'ANUAL'
    }
  });

  useEffect(() => {
    if (isOpen) {
      setServerError('');
      const targetInst = activeInstitucion || instituciones[0];
      reset({
        nombre: '',
        institucion_id: targetInst?.id || '',
        nivel: targetInst?.nivel || 'TERCIARIO',
        modalidad: 'ANUAL'
      });
    }
  }, [isOpen, activeInstitucion, instituciones, reset]);

  const onFormSubmit = async (formData) => {
    setServerError('');
    const targetInstId = formData.institucion_id;

    try {
      if (isSupabaseConfigured && !isDemo && user) {
        let resolvedCicloId = activeCiclo?.id;
        if (!resolvedCicloId && ciclosLectivos?.length > 0) {
          resolvedCicloId = ciclosLectivos.find(c => c.activo)?.id || ciclosLectivos[0]?.id;
        }
        if (!resolvedCicloId) {
          const { data: cDb } = await supabase
            .from('ciclos_lectivos')
            .select('id')
            .eq('docente_id', user.id)
            .order('anio', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (cDb?.id) resolvedCicloId = cDb.id;
        }

        const insertPayload = {
          docente_id: user.id,
          institucion_id: targetInstId,
          ciclo_id: resolvedCicloId || null,
          nombre: formData.nombre.trim(),
          nivel: formData.nivel,
          modalidad: formData.modalidad,
          horarios_semanales: []
        };

        let data = null;
        const { data: resData, error } = await supabase
          .from('catedras')
          .insert(insertPayload)
          .select(`*, instituciones (id, nombre, nivel)`)
          .single();

        if (error && (error.message?.includes('violates check constraint') || error.message?.includes('catedras_modalidad_check'))) {
          const fallbackRes = await supabase
            .from('catedras')
            .insert({ ...insertPayload, modalidad: 'CUATRIMESTRAL' })
            .select(`*, instituciones (id, nombre, nivel)`)
            .single();
          if (fallbackRes.error) throw fallbackRes.error;
          data = fallbackRes.data;
          toast.info("Cátedra creada con modalidad compatible.");
        } else if (error) {
          throw error;
        } else {
          data = resData;
        }

        toast.success(`Cátedra "${data.nombre}" creada con éxito`);
        onClose();
        if (refreshData) await refreshData();
        if (onCatedraCreated) await onCatedraCreated(data);
        navigate(`/catedra/${data.id}`);
      } else {
        const instFound = instituciones.find(i => i.id === targetInstId);
        const newCat = {
          id: 'cat-' + Date.now(),
          docente_id: user?.id || 'demo',
          institucion_id: targetInstId,
          institucion_nombre: instFound?.nombre || 'Instituto Superior N° 19',
          institucion_nivel: formData.nivel,
          nombre: formData.nombre.trim(),
          nivel: formData.nivel,
          modalidad: formData.modalidad,
          horarios_semanales: [],
          estudiantes_count: 0,
          asistencia_promedio: null,
          ultima_clase: null
        };
        onClose();
        toast.success(`Cátedra "${newCat.nombre}" creada`);
        if (onCatedraCreated) onCatedraCreated(newCat);
      }
    } catch (err) {
      const info = handleAppError(err, 'DashboardPage / Crear Cátedra', user);
      setServerError(`${info.mensaje} (Código: ${info.codigo})`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Nueva Cátedra"
      subtitle="Agrega una nueva asignatura a tu panel unificado"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4" noValidate>
        {serverError && (
          <div role="alert" className="p-3 bg-danger/10 border border-danger/30 text-danger text-xs rounded-xl">
            {serverError}
          </div>
        )}

        <div>
          <label htmlFor="institucion_id" className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
            Institución Educativa *
          </label>
          <Controller
            name="institucion_id"
            control={control}
            render={({ field }) => (
              <CustomSelect
                id="institucion_id"
                value={field.value}
                onChange={(val) => {
                  const targetId = typeof val === 'object' ? val.target.value : val;
                  field.onChange(targetId);
                  const inst = instituciones.find(i => i.id === targetId);
                  if (inst?.nivel) setValue('nivel', inst.nivel);
                }}
                options={instituciones.map(inst => ({
                  value: inst.id,
                  label: `${inst.nombre} (${inst.nivel})`,
                  badge: inst.nivel === 'TERCIARIO' ? 'Terc.' : 'Sec.'
                }))}
                placeholder="Seleccionar institución..."
              />
            )}
          />
          {errors.institucion_id && (
            <p id="institucion-error" role="alert" className="text-xs text-danger mt-1">
              {errors.institucion_id.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="nombre" className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
            Nombre de la Asignatura / Cátedra *
          </label>
          <input
            id="nombre"
            type="text"
            {...register('nombre')}
            aria-invalid={!!errors.nombre}
            aria-describedby={errors.nombre ? 'nombre-error' : undefined}
            placeholder="Ej: Programación II, Historia Argentina, Matemática..."
            className={`w-full px-3.5 py-2.5 text-sm border rounded-xl bg-surface text-text-primary focus:outline-none focus:ring-2 transition-colors ${
              errors.nombre 
                ? 'border-danger focus:ring-danger/20' 
                : 'border-surface-border focus:ring-primary/20 focus:border-primary'
            }`}
          />
          {errors.nombre && (
            <p id="nombre-error" role="alert" className="text-xs text-danger mt-1">
              {errors.nombre.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Nivel Académico
            </label>
            <Controller
              name="nivel"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  value={field.value}
                  onChange={(val) => field.onChange(typeof val === 'object' ? val.target.value : val)}
                  options={[
                    { value: 'TERCIARIO', label: 'Terciario / Superior' },
                    { value: 'SECUNDARIO', label: 'Secundario' }
                  ]}
                />
              )}
            />
            {errors.nivel && (
              <p role="alert" className="text-xs text-danger mt-1">
                {errors.nivel.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Modalidad
            </label>
            <Controller
              name="modalidad"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  value={field.value}
                  onChange={(val) => field.onChange(typeof val === 'object' ? val.target.value : val)}
                  options={[
                    { value: '1° CUATRIMESTRE', label: '1° Cuatrimestre', badge: '1° Cuat.' },
                    { value: '2° CUATRIMESTRE', label: '2° Cuatrimestre', badge: '2° Cuat.' },
                    { value: 'ANUAL', label: 'Anual', badge: 'Anual' },
                    { value: 'CUATRIMESTRAL', label: 'Cuatrimestral (Genérico)', badge: 'Cuat.' }
                  ]}
                />
              )}
            />
            {errors.modalidad && (
              <p role="alert" className="text-xs text-danger mt-1">
                {errors.modalidad.message}
              </p>
            )}
          </div>
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
            Crear Cátedra
          </Button>
        </div>
      </form>
    </Modal>
  );
}
