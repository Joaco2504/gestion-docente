import React, { useState } from 'react';
import { 
  Building, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  GraduationCap, 
  Trash2, 
  Layers, 
  School,
  AlertCircle
} from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
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

  // Institution Modal
  const [isInstModalOpen, setIsInstModalOpen] = useState(false);
  const [instNombre, setInstNombre] = useState('');
  const [instNivel, setInstNivel] = useState('TERCIARIO');
  const [savingInst, setSavingInst] = useState(false);

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
      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('instituciones')
          .insert({
            docente_id: user.id,
            nombre: instNombre.trim(),
            nivel: instNivel
          })
          .select()
          .single();

        if (error) throw error;
        await refreshData();
        setIsInstModalOpen(false);
        setInstNombre('');
      } else {
        const newInst = {
          id: 'inst-' + Date.now(),
          docente_id: user?.id,
          nombre: instNombre.trim(),
          nivel: instNivel
        };
        const current = JSON.parse(localStorage.getItem('demo_instituciones') || '[]');
        current.push(newInst);
        localStorage.setItem('demo_instituciones', JSON.stringify(current));
        await refreshData();
        setIsInstModalOpen(false);
        setInstNombre('');
      }
    } catch (err) {
      console.error('Error creating institution:', err);
      setErrorMsg(err.message || 'Error al guardar la institución');
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
        const { data, error } = await supabase
          .from('ciclos_lectivos')
          .insert({
            docente_id: user.id,
            anio: Number(cicloAnio),
            activo: false
          })
          .select()
          .single();

        if (error) throw error;
        await refreshData();
        setIsCicloModalOpen(false);
      } else {
        const newCiclo = {
          id: 'ciclo-' + Date.now(),
          docente_id: user?.id,
          anio: Number(cicloAnio),
          activo: false
        };
        const current = JSON.parse(localStorage.getItem('demo_ciclos') || '[]');
        current.push(newCiclo);
        localStorage.setItem('demo_ciclos', JSON.stringify(current));
        await refreshData();
        setIsCicloModalOpen(false);
      }
    } catch (err) {
      console.error('Error creating ciclo:', err);
      setErrorMsg(err.message || 'Error al crear el ciclo lectivo');
    } finally {
      setSavingCiclo(false);
    }
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
          >
            Nueva Institución
          </Button>
          <Button
            variant="outline"
            icon={Calendar}
            onClick={() => {
              setErrorMsg('');
              setIsCicloModalOpen(true);
            }}
          >
            Nuevo Ciclo
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-danger text-xs rounded-xl flex items-center gap-2">
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
                    isSelected ? 'ring-2 ring-primary border-primary bg-primary/5' : 'hover:border-surface-border'
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

                  <div className="pt-3 border-t border-surface-border flex items-center justify-between">
                    <Button
                      variant={isSelected ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => setActiveInstitucion(inst)}
                      disabled={isSelected}
                    >
                      {isSelected ? 'Seleccionada' : 'Seleccionar como activa'}
                    </Button>
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
                      ? 'border-primary bg-primary/5' 
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
                    onClick={() => setActiveCiclo(ciclo)}
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
            <select
              value={instNivel}
              onChange={(e) => setInstNivel(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="TERCIARIO">Nivel Terciario / Superior / Universitario</option>
              <option value="SECUNDARIO">Nivel Secundario / Medio</option>
            </select>
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
    </div>
  );
}
