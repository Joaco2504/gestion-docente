import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Modal from './Modal';
import CustomSelect from './CustomSelect';
import Button from './Button';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export default function CreateCatedraModal({ isOpen, onClose, onCreated }) {
  const navigate = useNavigate();
  const { user, isDemo } = useAuth();
  const { 
    instituciones, 
    activeInstitucion, 
    activeCiclo, 
    ciclosLectivos, 
    refreshData,
    setCatedras 
  } = useApp();

  const [nombre, setNombre] = useState('');
  const [institucionId, setInstitucionId] = useState('');
  const [nivel, setNivel] = useState('TERCIARIO');
  const [modalidad, setModalidad] = useState('ANUAL');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sincronizar institución por defecto al abrir o al cambiar la institución activa
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (activeInstitucion?.id) {
        setInstitucionId(activeInstitucion.id);
        setNivel(activeInstitucion.nivel || 'TERCIARIO');
      } else if (instituciones.length > 0) {
        setInstitucionId(instituciones[0].id);
        setNivel(instituciones[0].nivel || 'TERCIARIO');
      }
    }
  }, [isOpen, activeInstitucion, instituciones]);

  const handleClose = () => {
    if (saving) return;
    setErrorMsg('');
    setNombre('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMsg('El nombre de la cátedra es obligatorio.');
      return;
    }

    const targetInstId = institucionId || activeInstitucion?.id || instituciones[0]?.id;
    if (!targetInstId) {
      setErrorMsg('Debes seleccionar una institución educativa.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      let createdCatedra = null;

      if (isSupabaseConfigured && !isDemo && user) {
        // Resolver ciclo_id activo
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
          nombre: nombre.trim(),
          nivel,
          modalidad,
          horarios_semanales: []
        };

        const { data: resData, error } = await supabase
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
          // Fallback resiliente si la restricción en Supabase aún usa 'CUATRIMESTRAL'
          const fallbackRes = await supabase
            .from('catedras')
            .insert({ ...insertPayload, modalidad: 'CUATRIMESTRAL' })
            .select(`*, instituciones(id, nombre, nivel)`)
            .single();
          if (fallbackRes.error) throw fallbackRes.error;
          createdCatedra = fallbackRes.data;
        } else if (error) {
          throw error;
        } else {
          createdCatedra = resData;
        }
      } else {
        // Modo Demo
        const instFound = instituciones.find(i => i.id === targetInstId);
        createdCatedra = {
          id: 'cat-' + Date.now(),
          docente_id: user?.id || 'demo',
          institucion_id: targetInstId,
          institucion_nombre: instFound?.nombre || 'Instituto Superior N° 19',
          institucion_nivel: nivel,
          nombre: nombre.trim(),
          nivel,
          modalidad,
          horarios_semanales: [],
          estudiantes_count: 0,
          asistencia_promedio: null,
          ultima_clase: null
        };

        // Guardar en demo_catedras de localStorage
        const existingDemo = localStorage.getItem('demo_catedras');
        const list = existingDemo ? JSON.parse(existingDemo) : [];
        list.push(createdCatedra);
        localStorage.setItem('demo_catedras', JSON.stringify(list));
        if (setCatedras) {
          setCatedras(prev => [...prev, createdCatedra]);
        }
      }

      toast.success(`Cátedra "${createdCatedra.nombre}" creada con éxito.`);
      setNombre('');
      onClose();

      // Refrescar listado global y lateral
      if (onCreated) {
        await onCreated(createdCatedra);
      } else if (refreshData) {
        await refreshData();
      }

      // Redirigir automáticamente a la nueva cátedra
      if (createdCatedra?.id) {
        navigate(`/catedra/${createdCatedra.id}`);
      }
    } catch (err) {
      console.error('Error al crear cátedra:', err);
      setErrorMsg(err.message || 'Error al crear la cátedra. Inténtalo nuevamente.');
      toast.error('Error al crear la cátedra: ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Crear Nueva Cátedra"
      subtitle="Agrega una nueva asignatura a tu panel docente"
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
            value={institucionId}
            onChange={(val) => {
              const targetId = typeof val === 'object' ? val.target.value : val;
              setInstitucionId(targetId);
              const inst = instituciones.find(i => i.id === targetId);
              if (inst?.nivel) setNewNivel(inst.nivel);
            }}
            options={instituciones.map(inst => ({
              value: inst.id,
              label: `${inst.nombre} (${inst.nivel})`,
              badge: inst.nivel === 'TERCIARIO' ? 'Terc.' : 'Sec.'
            }))}
            placeholder="Seleccionar institución..."
            menuClassName="z-50 max-h-48 overflow-y-auto shadow-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
            Nombre de la Asignatura / Cátedra *
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Programación II, Historia Argentina, Matemática..."
            className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-6">
          <div className="relative z-30">
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Nivel Académico
            </label>
            <CustomSelect
              value={nivel}
              onChange={(val) => setNivel(typeof val === 'object' ? val.target.value : val)}
              options={[
                { value: 'TERCIARIO', label: 'Terciario / Superior' },
                { value: 'SECUNDARIO', label: 'Secundario' }
              ]}
              menuClassName="z-50 max-h-48 overflow-y-auto shadow-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl"
            />
          </div>

          <div className="relative z-30">
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Modalidad
            </label>
            <CustomSelect
              value={modalidad}
              onChange={(val) => setModalidad(typeof val === 'object' ? val.target.value : val)}
              options={[
                { value: '1° CUATRIMESTRE', label: '1° Cuatrimestre', badge: '1° Cuat.' },
                { value: '2° CUATRIMESTRE', label: '2° Cuatrimestre', badge: '2° Cuat.' },
                { value: 'ANUAL', label: 'Anual', badge: 'Anual' },
                { value: 'CUATRIMESTRAL', label: 'Cuatrimestral (Genérico)', badge: 'Cuat.' }
              ]}
              menuClassName="z-50 max-h-48 overflow-y-auto shadow-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={saving}
          >
            Crear Cátedra
          </Button>
        </div>
      </form>
    </Modal>
  );
}
