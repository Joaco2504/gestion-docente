import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Building2, Calendar, ChevronDown, Plus } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';

export default function HeaderSelector() {
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
    } catch (err) {
      alert('Error: ' + err.message);
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
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-surface p-3 rounded-xl border border-surface-border">
      {/* Selector de Institución */}
      <div className="relative flex items-center">
        <div className="flex items-center gap-2 bg-surface-hover/60 border border-surface-border hover:border-primary/40 rounded-lg px-3 py-1.5 transition-colors">
          <Building2 className="w-4 h-4 text-primary shrink-0" />
          <select
            value={selectedInstitucion?.id || ''}
            onChange={(e) => {
              const found = instituciones.find(i => i.id === e.target.value);
              if (found) setSelectedInstitucion(found);
            }}
            className="bg-transparent text-xs sm:text-sm font-medium text-text-primary focus:outline-none cursor-pointer max-w-[160px] sm:max-w-[220px] truncate"
          >
            {instituciones.length === 0 ? (
              <option value="">Sin instituciones</option>
            ) : (
              instituciones.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.nombre} ({inst.nivel})
                </option>
              ))
            )}
          </select>
          <button
            onClick={() => setIsInstModalOpen(true)}
            title="Nueva Institución"
            className="p-1 hover:bg-surface-hover rounded text-text-muted hover:text-text-primary transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Selector de Ciclo Lectivo */}
      <div className="relative flex items-center">
        <div className="flex items-center gap-2 bg-surface-hover/60 border border-surface-border hover:border-primary/40 rounded-lg px-3 py-1.5 transition-colors">
          <Calendar className="w-4 h-4 text-primary shrink-0" />
          <select
            value={selectedCiclo?.id || ''}
            onChange={(e) => {
              const found = ciclosLectivos.find(c => c.id === e.target.value);
              if (found) setSelectedCiclo(found);
            }}
            className="bg-transparent text-xs sm:text-sm font-mono font-medium text-text-primary focus:outline-none cursor-pointer"
          >
            {ciclosLectivos.length === 0 ? (
              <option value="">Sin ciclos</option>
            ) : (
              ciclosLectivos.map(c => (
                <option key={c.id} value={c.id}>
                  {c.anio} {c.activo ? '• Activo' : ''}
                </option>
              ))
            )}
          </select>
          <button
            onClick={() => setIsCicloModalOpen(true)}
            title="Nuevo Ciclo Lectivo"
            className="p-1 hover:bg-surface-hover rounded text-text-muted hover:text-text-primary transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
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
              className="w-full px-3.5 py-2 text-sm border border-surface-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
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
              className="w-full px-3.5 py-2 text-sm font-mono border border-surface-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
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
