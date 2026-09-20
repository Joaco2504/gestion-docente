import React, { useState } from 'react';
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';
import { Building2, Calendar, ChevronDown, Plus } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import CustomSelect from '../common/CustomSelect';
import { useAuth } from '../../context/AuthContext';
import { handleAppError } from '../../utils/handleAppError';

export default function HeaderSelector() {
  const { user } = useAuth();
  const {
    instituciones,
    selectedInstitucion,
    setSelectedInstitucion,
    ciclosLectivos,
    selectedCiclo,
    setSelectedCiclo,
    createInstitucion,
    createCicloLectivo
  } = useApp();

  const [isInstModalOpen, setIsInstModalOpen] = useState(false);
  const [isCicloModalOpen, setIsCicloModalOpen] = useState(false);

  // Form states
  const [instNombre, setInstNombre] = useState('');
  const [instNivel, setInstNivel] = useState('TERCIARIO');
  const [cicloAnio, setCicloAnio] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const handleCreateInst = async (e) => {
    e.preventDefault();
    if (!instNombre.trim()) return;
    setLoading(true);
    try {
      await createInstitucion(instNombre.trim(), instNivel);
      setInstNombre('');
      setIsInstModalOpen(false);
      toast.success('Institución creada con éxito');
    } catch (err) {
      handleAppError(err, 'HeaderSelector / Crear Institución', user);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCiclo = async (e) => {
    e.preventDefault();
    if (!cicloAnio) return;
    setLoading(true);
    try {
      await createCicloLectivo(cicloAnio, true);
      setIsCicloModalOpen(false);
      toast.success(`Ciclo Lectivo ${cicloAnio} activado`);
    } catch (err) {
      handleAppError(err, 'HeaderSelector / Crear Ciclo Lectivo', user);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hidden md:flex flex-wrap items-center gap-2 sm:gap-3 bg-surface p-3 rounded-2xl border border-surface-border shadow-xs">
      {/* Selector de Institución */}
      <div className="flex items-center gap-1.5 flex-1 min-w-[200px] max-w-xs">
        <CustomSelect
          value={selectedInstitucion?.id || ''}
          onChange={(val) => {
            const targetId = typeof val === 'object' ? val.target.value : val;
            const found = instituciones.find(i => i.id === targetId);
            if (found) setSelectedInstitucion(found);
          }}
          options={instituciones.map(inst => ({
            value: inst.id,
            label: inst.nombre,
            badge: inst.nivel === 'TERCIARIO' ? 'Terciario' : 'Secundario'
          }))}
          placeholder="Sin instituciones"
          icon={Building2}
          buttonClassName="py-2 text-xs"
        />
        <button
          type="button"
          onClick={() => setIsInstModalOpen(true)}
          title="Nueva Institución"
          className="p-2 hover:bg-surface-hover rounded-xl text-text-muted hover:text-text-primary transition-colors shrink-0 border border-surface-border"
        >
          <Plus className="w-4 h-4 text-primary" />
        </button>
      </div>

      {/* Selector de Ciclo Lectivo */}
      <div className="flex items-center gap-1.5 min-w-[160px] max-w-[220px]">
        <CustomSelect
          value={selectedCiclo?.id || ''}
          onChange={(val) => {
            const targetId = typeof val === 'object' ? val.target.value : val;
            const found = ciclosLectivos.find(c => c.id === targetId);
            if (found) setSelectedCiclo(found);
          }}
          options={ciclosLectivos.map(c => ({
            value: c.id,
            label: `${c.anio} ${c.activo ? '• Activo' : ''}`,
            badge: String(c.anio)
          }))}
          placeholder="Sin ciclos"
          icon={Calendar}
          buttonClassName="py-2 text-xs font-mono"
        />
        <button
          type="button"
          onClick={() => setIsCicloModalOpen(true)}
          title="Nuevo Ciclo Lectivo"
          className="p-2 hover:bg-surface-hover rounded-xl text-text-muted hover:text-text-primary transition-colors shrink-0 border border-surface-border"
        >
          <Plus className="w-4 h-4 text-primary" />
        </button>
      </div>

      {/* Modal Nueva Institución */}
      <Modal
        isOpen={isInstModalOpen}
        onClose={() => setIsInstModalOpen(false)}
        title="Crear Nueva Institución"
        subtitle="Registra el colegio o instituto terciario donde dictas cátedras"
      >
        <form onSubmit={handleCreateInst} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Nombre de la Institución
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Instituto Superior de Formación Docente N° 19"
              value={instNombre}
              onChange={(e) => setInstNombre(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-surface text-text-primary border border-surface-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Nivel Educativo
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 p-3 rounded-lg border border-surface-border cursor-pointer transition-all hover:bg-surface-hover">
                <input
                  type="radio"
                  name="nivel"
                  value="TERCIARIO"
                  checked={instNivel === 'TERCIARIO'}
                  onChange={() => setInstNivel('TERCIARIO')}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-xs font-medium text-text-primary">Terciario / Superior</span>
              </label>
              <label className="flex items-center gap-2 p-3 rounded-lg border border-surface-border cursor-pointer transition-all hover:bg-surface-hover">
                <input
                  type="radio"
                  name="nivel"
                  value="SECUNDARIO"
                  checked={instNivel === 'SECUNDARIO'}
                  onChange={() => setInstNivel('SECUNDARIO')}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-xs font-medium text-text-primary">Secundario</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsInstModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Crear Institución
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Nuevo Ciclo Lectivo */}
      <Modal
        isOpen={isCicloModalOpen}
        onClose={() => setIsCicloModalOpen(false)}
        title="Crear Nuevo Ciclo Lectivo"
        subtitle="Habilita un año académico para agrupar asistencias y calificaciones"
      >
        <form onSubmit={handleCreateCiclo} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Año Lectivo
            </label>
            <input
              type="number"
              required
              min="2000"
              max="2100"
              value={cicloAnio}
              onChange={(e) => setCicloAnio(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-mono bg-surface text-text-primary border border-surface-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsCicloModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Crear Ciclo
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
