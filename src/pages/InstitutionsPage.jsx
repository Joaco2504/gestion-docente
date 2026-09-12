import React, { useState } from 'react';
import { toast } from 'sonner';
import { 
  Building, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  GraduationCap, 
  Trash2, 
  Layers, 
  School,
  AlertCircle,
  Pencil
} from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export default function InstitutionsPage() {
  const { user, isDemo } = useAuth();
  const { 
    instituciones, 
    ciclosLectivos, 
    activeInstitucion, 
    setActiveInstitucion,
    activeCiclo, 
    setActiveCiclo,
    refreshData 
  } = useApp();

  // Institution Modal (Crear)
  const [isInstModalOpen, setIsInstModalOpen] = useState(false);
  const [instNombre, setInstNombre] = useState('');
  const [instNivel, setInstNivel] = useState('TERCIARIO');
  const [savingInst, setSavingInst] = useState(false);

  // Edit Institution Modal
  const [editingInst, setEditingInst] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [editNivel, setEditNivel] = useState('TERCIARIO');
  const [savingEditInst, setSavingEditInst] = useState(false);

  // Delete Institution Modal
  const [instToDelete, setInstToDelete] = useState(null);
  const [deleteCascadeCount, setDeleteCascadeCount] = useState(null);
  const [deletingInst, setDeletingInst] = useState(false);

  // Ciclo Modal
  const [isCicloModalOpen, setIsCicloModalOpen] = useState(false);
  const [cicloAnio, setCicloAnio] = useState(new Date().getFullYear() + 1);
  const [savingCiclo, setSavingCiclo] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');

  const handleCreateInstitution = async (e) => {
    e.preventDefault();
    if (!instNombre.trim()) {
      setErrorMsg('El nombre de la institución es requerido.');
      return;
    }

    setSavingInst(true);
    setErrorMsg('');

    try {
      const normalizedNivel = String(instNivel || 'TERCIARIO').toUpperCase().includes('SEC') 
        ? 'SECUNDARIO' 
        : 'TERCIARIO';

      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('instituciones')
          .insert({
            nombre: instNombre.trim(),
            nivel: normalizedNivel,
            docente_id: user.id
          })
          .select()
          .single();

        if (error) throw error;
        await refreshData();
        setIsInstModalOpen(false);
        setInstNombre('');
        toast.success(`Institución creada con éxito`);
      } else {
        const newInst = {
          id: 'inst-' + Date.now(),
          docente_id: user?.id,
          nombre: instNombre.trim(),
          nivel: normalizedNivel
        };
        const current = JSON.parse(localStorage.getItem('demo_instituciones') || '[]');
        current.push(newInst);
        localStorage.setItem('demo_instituciones', JSON.stringify(current));
        await refreshData();
        setIsInstModalOpen(false);
        setInstNombre('');
        toast.success(`Institución "${newInst.nombre}" creada (Modo Demo)`);
      }
    } catch (err) {
      console.error('Error creating institution:', err);
      setErrorMsg(err.message || 'Error al guardar la institución');
      toast.error('Error al guardar la institución: ' + err.message);
    } finally {
      setSavingInst(false);
    }
  };

  const handleCreateCiclo = async (e) => {
    e.preventDefault();
    setSavingCiclo(true);
    setErrorMsg('');

    try {
      if (isSupabaseConfigured && !isDemo) {
        const cicloPayload = {
          nombre: `Ciclo Lectivo ${cicloAnio}`,
          anio: Number(cicloAnio),
          institucion_id: activeInstitucion?.id || null,
          docente_id: user.id,
          activo: true
        };

        let { data, error } = await supabase
          .from('ciclos_lectivos')
          .insert(cicloPayload)
          .select()
          .single();

        // Tolerancia a esquemas si la tabla carece de columnas auxiliares nombre o institucion_id
        if (error && (error.message?.includes('column') || error.code === '42703')) {
          const fallbackRes = await supabase
            .from('ciclos_lectivos')
            .insert({
              docente_id: user.id,
              anio: Number(cicloAnio),
              activo: true
            })
            .select()
            .single();

          if (fallbackRes.error) throw fallbackRes.error;
          data = fallbackRes.data;
        } else if (error) {
          throw error;
        }

        await refreshData();
        setIsCicloModalOpen(false);
        toast.success(`Ciclo Lectivo ${cicloAnio} registrado`);
      } else {
        const newCiclo = {
          id: 'ciclo-' + Date.now(),
          docente_id: user?.id,
          nombre: `Ciclo Lectivo ${cicloAnio}`,
          anio: Number(cicloAnio),
          institucion_id: activeInstitucion?.id || null,
          activo: true
        };
        const current = JSON.parse(localStorage.getItem('demo_ciclos') || '[]');
        current.push(newCiclo);
        localStorage.setItem('demo_ciclos', JSON.stringify(current));
        await refreshData();
        setIsCicloModalOpen(false);
        toast.success(`Ciclo Lectivo ${cicloAnio} creado (Modo Demo)`);
      }
    } catch (err) {
      console.error('Error creating ciclo:', err);
      setErrorMsg(err.message || 'Error al crear el ciclo lectivo');
      toast.error('Error al crear ciclo: ' + err.message);
    } finally {
      setSavingCiclo(false);
    }
  };

  const handleOpenEditModal = (inst) => {
    setEditingInst(inst);
    setEditNombre(inst.nombre || '');
    setEditNivel(inst.nivel || 'TERCIARIO');
  };

  const handleSaveEditInstitution = async (e) => {
    e.preventDefault();
    if (!editNombre.trim()) {
      toast.error('El nombre de la institución es requerido.');
      return;
    }
    setSavingEditInst(true);
    try {
      const normalizedNivel = String(editNivel || 'TERCIARIO').toUpperCase().includes('SEC') 
        ? 'SECUNDARIO' 
        : 'TERCIARIO';

      if (isSupabaseConfigured && !isDemo) {
        const { error } = await supabase
          .from('instituciones')
          .update({
            nombre: editNombre.trim(),
            nivel: normalizedNivel
          })
          .eq('id', editingInst.id);

        if (error) throw error;
      } else {
        const current = JSON.parse(localStorage.getItem('demo_instituciones') || '[]');
        const updated = current.map(i => i.id === editingInst.id ? { ...i, nombre: editNombre.trim(), nivel: normalizedNivel } : i);
        localStorage.setItem('demo_instituciones', JSON.stringify(updated));
      }

      toast.success('Institución actualizada con éxito.');
      setEditingInst(null);
      await refreshData();
    } catch (err) {
      console.error('Error al editar institución:', err);
      toast.error('Error al actualizar institución: ' + err.message);
    } finally {
      setSavingEditInst(false);
    }
  };

  const handleOpenDeleteModal = (inst) => {
    setInstToDelete(inst);
    setDeleteCascadeCount(null);
    if (isSupabaseConfigured && !isDemo) {
      supabase
        .from('catedras')
        .select('*', { count: 'exact', head: true })
        .eq('institucion_id', inst.id)
        .then(({ count }) => setDeleteCascadeCount(count ?? 0))
        .catch(() => setDeleteCascadeCount(0));
    } else {
      try {
        const cats = JSON.parse(localStorage.getItem('demo_catedras') || '[]');
        const count = cats.filter(c => c.institucion_id === inst.id).length;
        setDeleteCascadeCount(count);
      } catch (_) {
        setDeleteCascadeCount(0);
      }
    }
  };

  const handleConfirmDeleteInstitution = async () => {
    if (!instToDelete) return;
    setDeletingInst(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { error } = await supabase
          .from('instituciones')
          .delete()
          .eq('id', instToDelete.id);

        if (error) throw error;
      } else {
        const current = JSON.parse(localStorage.getItem('demo_instituciones') || '[]');
        const updated = current.filter(i => i.id !== instToDelete.id);
        localStorage.setItem('demo_instituciones', JSON.stringify(updated));
      }

      // Si era la activa, reasignar a la primera disponible o null
      if (activeInstitucion?.id === instToDelete.id) {
        const remaining = instituciones.filter(i => i.id !== instToDelete.id);
        setActiveInstitucion(remaining[0] || null);
        if (remaining[0]?.id) {
          localStorage.setItem('institucion_activa_id', remaining[0].id);
        } else {
          localStorage.removeItem('institucion_activa_id');
        }
      }

      toast.success(`Institución "${instToDelete.nombre}" eliminada.`);
      setInstToDelete(null);
      await refreshData();
    } catch (err) {
      console.error('Error eliminando institución:', err);
      toast.error('Error al eliminar institución: ' + err.message);
    } finally {
      setDeletingInst(false);
    }
  };

  const handleMarcarActiva = async (inst) => {
    setActiveInstitucion(inst);
    localStorage.setItem('institucion_activa_id', inst.id);
    if (isSupabaseConfigured && !isDemo && user?.id) {
      try {
        const { error: rpcErr } = await supabase.rpc('set_institucion_activa', { p_inst_id: inst.id, p_docente_id: user.id });
        if (rpcErr) {
          await supabase
            .from('instituciones')
            .update({ activa: false })
            .eq('docente_id', user.id);

          await supabase
            .from('instituciones')
            .update({ activa: true })
            .eq('id', inst.id);
        }
      } catch (err) {
        console.warn('Aviso sincronización institución activa:', err);
      }
    }
    toast.success(`Institución activa: ${inst.nombre}`);
    refreshData();
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-6 rounded-2xl border border-surface-border shadow-sm">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-text-muted block mb-1">
            Configuración Estructural
          </span>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Instituciones y Ciclos Lectivos
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Administra los colegios o institutos donde dictas clases y los periodos académicos activos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              setErrorMsg('');
              setIsInstModalOpen(true);
            }}
            className="touch-target-44 sm:touch-target-auto whitespace-nowrap shrink-0 text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">Nueva Institución</span>
            <span className="sm:hidden">+ Institución</span>
          </Button>
          <Button
            variant="outline"
            icon={Calendar}
            onClick={() => {
              setErrorMsg('');
              setIsCicloModalOpen(true);
            }}
            className="touch-target-44 sm:touch-target-auto whitespace-nowrap shrink-0 text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">Nuevo Ciclo</span>
            <span className="sm:hidden">+ Ciclo</span>
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-danger/10 border border-danger/30 text-danger text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid: Institutions (Left) & Academic Cycles (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Institutions (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Building className="w-4 h-4 text-primary" />
              Instituciones Registradas ({instituciones.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {instituciones.map((inst) => {
              const isSelected = activeInstitucion?.id === inst.id;
              return (
                <Card 
                  key={inst.id} 
                  className={`p-5 transition-all relative ${
                    isSelected ? 'ring-2 ring-primary border-primary bg-primary/5 dark:bg-primary/10' : 'hover:border-surface-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <Badge variant={inst.nivel === 'TERCIARIO' ? 'primary' : 'warning'}>
                      {inst.nivel}
                    </Badge>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Activa
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-text-primary mb-1">
                    {inst.nombre}
                  </h3>
                  <p className="text-xs text-text-muted mb-4">
                    {inst.nivel === 'TERCIARIO' ? 'Nivel Superior / Terciario (Promoción / Regularidad)' : 'Nivel Secundario (Trimestral)'}
                  </p>

                  <div className="pt-3 border-t border-surface-border flex items-center justify-between gap-2">
                    <Button
                      variant={isSelected ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => handleMarcarActiva(inst)}
                      disabled={isSelected}
                      className="text-xs"
                    >
                      {isSelected ? '✓ Activa' : 'Marcar como Activa'}
                    </Button>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Pencil}
                        onClick={() => handleOpenEditModal(inst)}
                        title="Editar nombre y nivel"
                        className="touch-target-44 p-2 text-text-muted hover:text-text-primary"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handleOpenDeleteModal(inst)}
                        title="Eliminar institución"
                        className="touch-target-44 p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Academic Cycles (1 Col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Ciclos Lectivos
            </h2>
          </div>

          <Card className="p-4 space-y-3">
            {ciclosLectivos.map((ciclo) => {
              const isSelected = activeCiclo?.id === ciclo.id;
              return (
                <div
                  key={ciclo.id}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/5 dark:bg-primary/10' 
                      : 'border-surface-border hover:bg-surface-hover'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
                      isSelected ? 'bg-primary text-white' : 'bg-surface text-text-muted border border-surface-border'
                    }`}>
                      {ciclo.anio.toString().slice(-2)}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-text-primary block font-mono">
                        Ciclo Lectivo {ciclo.anio}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {isSelected ? 'Ciclo actual de trabajo' : 'Histórico / Futuro'}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant={isSelected ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setActiveCiclo(ciclo);
                      toast.info(`Ciclo lectivo activo: ${ciclo.anio}`);
                    }}
                    disabled={isSelected}
                  >
                    {isSelected ? 'Activo' : 'Activar'}
                  </Button>
                </div>
              );
            })}
          </Card>
        </div>
      </div>

      {/* Modal Nueva Institución */}
      <Modal
        isOpen={isInstModalOpen}
        onClose={() => setIsInstModalOpen(false)}
        title="Registrar Nueva Institución Educativa"
      >
        <form onSubmit={handleCreateInstitution} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Nombre de la Institución *
            </label>
            <input
              type="text"
              value={instNombre}
              onChange={(e) => setInstNombre(e.target.value)}
              placeholder="Ej: Escuela Normal Superior N° 1, I.S.F.T. N° 179"
              className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Nivel Educativo
            </label>
            <CustomSelect
              value={instNivel}
              onChange={(val) => setInstNivel(typeof val === 'object' ? val.target.value : val)}
              options={[
                { value: 'TERCIARIO', label: 'Nivel Terciario / Superior / Universitario' },
                { value: 'SECUNDARIO', label: 'Nivel Secundario / Medio' }
              ]}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsInstModalOpen(false)}
              disabled={savingInst}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingInst}
            >
              Guardar Institución
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Nuevo Ciclo */}
      <Modal
        isOpen={isCicloModalOpen}
        onClose={() => setIsCicloModalOpen(false)}
        title="Habilitar Nuevo Ciclo Lectivo"
      >
        <form onSubmit={handleCreateCiclo} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Año Lectivo *
            </label>
            <input
              type="number"
              min="2020"
              max="2035"
              value={cicloAnio}
              onChange={(e) => setCicloAnio(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-surface-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCicloModalOpen(false)}
              disabled={savingCiclo}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingCiclo}
            >
              Guardar Ciclo
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Institución */}
      <Modal
        isOpen={!!editingInst}
        onClose={() => setEditingInst(null)}
        title="Editar Institución Educativa"
      >
        <form onSubmit={handleSaveEditInstitution} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Nombre de la Institución *
            </label>
            <input
              type="text"
              value={editNombre}
              onChange={(e) => setEditNombre(e.target.value)}
              placeholder="Ej: I.S.F.T. N° 179"
              className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Nivel Educativo
            </label>
            <CustomSelect
              value={editNivel}
              onChange={(val) => setEditNivel(typeof val === 'object' ? val.target.value : val)}
              options={[
                { value: 'TERCIARIO', label: 'Nivel Terciario / Superior / Universitario' },
                { value: 'SECUNDARIO', label: 'Nivel Secundario / Medio' }
              ]}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingInst(null)}
              disabled={savingEditInst}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingEditInst}
            >
              Guardar Cambios
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Eliminación de Institución */}
      <Modal
        isOpen={!!instToDelete}
        onClose={() => setInstToDelete(null)}
        title="¿Eliminar Institución Educativa?"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-text-primary">
                {instToDelete?.nombre}
              </h4>
              <p className="text-xs text-text-secondary">
                {deleteCascadeCount !== null ? (
                  deleteCascadeCount > 0 ? (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      ⚠️ Atención: Esta institución tiene {deleteCascadeCount} cátedra(s) vinculada(s). Al eliminarla, se eliminarán en cascada las cátedras, clases, asistencias y notas asociadas.
                    </span>
                  ) : (
                    'No tiene cátedras vinculadas en este momento.'
                  )
                ) : (
                  'Verificando cátedras vinculadas...'
                )}
              </p>
              <p className="text-[11px] text-text-muted">
                Esta acción no se puede deshacer.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setInstToDelete(null)}
              disabled={deletingInst}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirmDeleteInstitution}
              loading={deletingInst}
              icon={Trash2}
            >
              Eliminar Definitivamente
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
