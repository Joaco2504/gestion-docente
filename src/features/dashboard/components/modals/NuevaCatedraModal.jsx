import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Modal from '../../../../components/common/Modal';
import CustomSelect from '../../../../components/common/CustomSelect';
import Button from '../../../../components/common/Button';
import { supabase, isSupabaseConfigured } from '../../../../lib/supabase';
import { handleAppError } from '../../../../utils/handleAppError';

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
  const [newNombre, setNewNombre] = useState('');
  const [newInstitucionId, setNewInstitucionId] = useState('');
  const [newNivel, setNewNivel] = useState('TERCIARIO');
  const [newModalidad, setNewModalidad] = useState('ANUAL');
  const [savingCatedra, setSavingCatedra] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (activeInstitucion) {
      setNewInstitucionId(activeInstitucion.id);
      setNewNivel(activeInstitucion.nivel || 'TERCIARIO');
    } else if (instituciones.length > 0) {
      setNewInstitucionId(instituciones[0].id);
      setNewNivel(instituciones[0].nivel || 'TERCIARIO');
    }
  }, [activeInstitucion, instituciones]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newNombre.trim()) {
      setErrorMsg('El nombre de la cátedra es obligatorio.');
      return;
    }
    const targetInstId = newInstitucionId || activeInstitucion?.id || instituciones[0]?.id;
    if (!targetInstId) {
      setErrorMsg('Debes seleccionar una institución educativa.');
      return;
    }

    setSavingCatedra(true);
    setErrorMsg('');

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

        let insertPayload = {
          docente_id: user.id,
          institucion_id: targetInstId,
          ciclo_id: resolvedCicloId || null,
          nombre: newNombre.trim(),
          nivel: newNivel,
          modalidad: newModalidad,
          horarios_semanales: []
        };

        let data = null;
        let { data: resData, error } = await supabase
          .from('catedras')
          .insert(insertPayload)
          .select(`
            *,
            instituciones (
              id,
              nombre,
              nivel
            )
          `)
          .single();

        if (error && (error.message?.includes('violates check constraint') || error.message?.includes('catedras_modalidad_check'))) {
          console.warn('Aviso: Restricción check previa en Supabase. Aplicando fallback a CUATRIMESTRAL...');
          const fallbackRes = await supabase
            .from('catedras')
            .insert({ ...insertPayload, modalidad: 'CUATRIMESTRAL' })
            .select(`*, instituciones(id, nombre, nivel)`)
            .single();
          if (fallbackRes.error) throw fallbackRes.error;
          data = fallbackRes.data;
          toast.info(`Cátedra creada. Recuerda ejecutar el script 'supabase/update_modalidad_check.sql' en el SQL Editor para guardar el valor exacto.`);
        } else if (error) {
          throw error;
        } else {
          data = resData;
        }

        toast.success(`Cátedra "${data.nombre}" creada con éxito`);
        onClose();
        setNewNombre('');
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
          institucion_nivel: newNivel,
          nombre: newNombre.trim(),
          nivel: newNivel,
          modalidad: newModalidad,
          horarios_semanales: [],
          estudiantes_count: 0,
          asistencia_promedio: null,
          ultima_clase: null
        };
        onClose();
        setNewNombre('');
        toast.success(`Cátedra "${newCat.nombre}" creada`);
        if (onCatedraCreated) onCatedraCreated(newCat);
      }
    } catch (err) {
      const info = handleAppError(err, 'DashboardPage / Crear Cátedra', user);
      setErrorMsg(`${info.mensaje} (Código: ${info.codigo})`);
    } finally {
      setSavingCatedra(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Nueva Cátedra"
      subtitle="Agrega una nueva asignatura a tu panel unificado"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-danger/10 border border-danger/30 text-danger text-xs rounded-xl">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
            Institución Educativa *
          </label>
          <CustomSelect
            value={newInstitucionId}
            onChange={(val) => {
              const targetId = typeof val === 'object' ? val.target.value : val;
              setNewInstitucionId(targetId);
              const inst = instituciones.find(i => i.id === targetId);
              if (inst?.nivel) setNewNivel(inst.nivel);
            }}
            options={instituciones.map(inst => ({
              value: inst.id,
              label: `${inst.nombre} (${inst.nivel})`,
              badge: inst.nivel === 'TERCIARIO' ? 'Terc.' : 'Sec.'
            }))}
            placeholder="Seleccionar institución..."
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
            Nombre de la Asignatura / Cátedra *
          </label>
          <input
            type="text"
            value={newNombre}
            onChange={(e) => setNewNombre(e.target.value)}
            placeholder="Ej: Programación II, Historia Argentina, Matemática..."
            className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Nivel Académico
            </label>
            <CustomSelect
              value={newNivel}
              onChange={(val) => setNewNivel(typeof val === 'object' ? val.target.value : val)}
              options={[
                { value: 'TERCIARIO', label: 'Terciario / Superior' },
                { value: 'SECUNDARIO', label: 'Secundario' }
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Modalidad
            </label>
            <CustomSelect
              value={newModalidad}
              onChange={(val) => setNewModalidad(typeof val === 'object' ? val.target.value : val)}
              options={[
                { value: '1° CUATRIMESTRE', label: '1° Cuatrimestre', badge: '1° Cuat.' },
                { value: '2° CUATRIMESTRE', label: '2° Cuatrimestre', badge: '2° Cuat.' },
                { value: 'ANUAL', label: 'Anual', badge: 'Anual' },
                { value: 'CUATRIMESTRAL', label: 'Cuatrimestral (Genérico)', badge: 'Cuat.' }
              ]}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={savingCatedra}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={savingCatedra}
          >
            Crear Cátedra
          </Button>
        </div>
      </form>
    </Modal>
  );
}
