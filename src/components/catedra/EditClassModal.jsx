import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar, Clock, Layers, FileText, Trash2 } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import CustomSelect from '../common/CustomSelect';
import { handleAppError } from '../../utils/handleAppError';

const CARACTER_OPTIONS = [
  { value: 'Teórico', label: 'Teórico' },
  { value: 'Práctico', label: 'Práctico' },
  { value: 'Teórico-Práctico', label: 'Teórico-Práctico' },
  { value: 'Evaluación', label: 'Evaluación' },
  { value: 'Taller', label: 'Taller' }
];

export default function EditClassModal({
  isOpen,
  onClose,
  clase,
  unidades = [],
  onQuickCreateUnidad,
  onSave,
  onDeleteRequest,
  saving = false
}) {
  const [fecha, setFecha] = useState('');
  const [tema, setTema] = useState('');
  const [unidadId, setUnidadId] = useState('');
  const [caracterClase, setCaracterClase] = useState('Teórico');
  const [horasCatedra, setHorasCatedra] = useState(2);
  const [observaciones, setObservaciones] = useState('');

  // Modo rápido de creación de unidad
  const [isQuickCreating, setIsQuickCreating] = useState(false);
  const [quickNumero, setQuickNumero] = useState(1);
  const [quickTitulo, setQuickTitulo] = useState('');
  const [savingQuickUnit, setSavingQuickUnit] = useState(false);

  useEffect(() => {
    if (clase) {
      setFecha(clase.fecha || '');
      setTema(clase.tema || '');
      setUnidadId(clase.unidad_id || '');
      
      // Normalizar caracter_clase
      const c = clase.caracter_clase || clase.caracter || 'Teórico';
      const matched = CARACTER_OPTIONS.find(opt => 
        opt.value.toLowerCase() === String(c).toLowerCase() ||
        String(c).toLowerCase().includes(opt.value.toLowerCase())
      );
      setCaracterClase(matched ? matched.value : 'Teórico');
      
      setHorasCatedra(Number(clase.horas_catedra) || 2);
      setObservaciones(clase.observaciones || '');
      setIsQuickCreating(false);
    }
  }, [clase, isOpen]);

  const handleQuickCreateSubmit = async (e) => {
    e.preventDefault();
    if (!quickTitulo.trim()) return;
    if (onQuickCreateUnidad) {
      setSavingQuickUnit(true);
      try {
        const created = await onQuickCreateUnidad({
          numero: Number(quickNumero) || (unidades.length + 1),
          titulo: quickTitulo.trim()
        });
        if (created?.id) {
          setUnidadId(created.id);
        }
        setIsQuickCreating(false);
        setQuickTitulo('');
      } catch (err) {
        handleAppError(err, 'EditClassModal / handleQuickCreateUnidad');
      } finally {
        setSavingQuickUnit(false);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fecha) return;
    if (!tema.trim()) return;

    onSave({
      id: clase?.id,
      fecha,
      tema: tema.trim(),
      unidad_id: unidadId || null,
      caracter_clase: caracterClase,
      horas_catedra: Number(horasCatedra) || 2,
      observaciones: observaciones.trim()
    });
  };

  if (!clase) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={saving ? undefined : onClose}
      title="Editar Detalles de la Sesión de Clase"
    >
      <form onSubmit={handleSubmit} className="space-y-4 animate-fadeIn">
        {/* Fecha de la Clase */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">
            Fecha de la Clase *
          </label>
          <div className="relative">
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm font-mono border border-surface-border rounded-xl bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        {/* Tema / Contenido Desarrollado */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">
            Tema o Contenido Desarrollado *
          </label>
          <input
            type="text"
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            placeholder="Ej: Medidas de Tendencia Central, Diagrama Entidad-Relación..."
            required
            className="w-full px-3 py-2 text-sm border border-surface-border rounded-xl bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Selector de Unidad Temática / Didáctica */}
        <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Unidad Temática / Didáctica</span>
            </label>
            {!isQuickCreating && (
              <button
                type="button"
                onClick={() => {
                  setQuickNumero(unidades.length + 1);
                  setIsQuickCreating(true);
                }}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                + Crear Unidad al vuelo
              </button>
            )}
          </div>

          {!isQuickCreating ? (
            <CustomSelect
              value={unidadId}
              onChange={(val) => setUnidadId(typeof val === 'object' ? val.target.value : val)}
              options={[
                { value: '', label: 'Sin Unidad Asignada' },
                ...unidades.map(u => ({
                  value: u.id,
                  label: `Unidad ${u.numero}: ${u.titulo}`,
                  badge: `U${u.numero}`
                }))
              ]}
              placeholder="Seleccionar unidad..."
            />
          ) : (
            <div className="p-2.5 rounded-xl bg-surface border border-surface-border space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-primary">Nueva Unidad Rápida</span>
                <button
                  type="button"
                  onClick={() => setIsQuickCreating(false)}
                  className="text-[11px] text-text-muted hover:text-text-primary"
                >
                  Cancelar
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1">
                  <input
                    type="number"
                    min="1"
                    placeholder="N°"
                    value={quickNumero}
                    onChange={(e) => setQuickNumero(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-surface-border rounded-lg bg-surface text-text-primary outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    placeholder="Título de la unidad..."
                    value={quickTitulo}
                    onChange={(e) => setQuickTitulo(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-surface text-text-primary outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={handleQuickCreateSubmit}
                  loading={savingQuickUnit}
                  disabled={!quickTitulo.trim()}
                  className="text-xs py-1 px-3"
                >
                  Crear y Asignar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Fila 2: Carácter de la Clase y Horas Cátedra */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Carácter de la Clase
            </label>
            <CustomSelect
              value={caracterClase}
              onChange={(val) => setCaracterClase(typeof val === 'object' ? val.target.value : val)}
              options={CARACTER_OPTIONS}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Horas Cátedra (1 a 6)
            </label>
            <input
              type="number"
              min="1"
              max="6"
              value={horasCatedra}
              onChange={(e) => setHorasCatedra(Math.min(6, Math.max(1, Number(e.target.value) || 1)))}
              className="w-full px-3 py-2 text-sm font-mono border border-surface-border rounded-xl bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        {/* Observaciones Pedagógicas */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1">
            Observaciones Pedagógicas (Opcional)
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
            placeholder="Anotaciones pedagógicas, actividades pendientes o material complementario..."
            className="w-full px-3 py-2 text-xs sm:text-sm border border-surface-border rounded-xl bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          />
        </div>

        {/* Acciones del Modal */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-4 border-t border-surface-border">
          {/* Botón Destructivo Opcional */}
          <Button
            type="button"
            variant="ghost"
            icon={Trash2}
            onClick={onDeleteRequest}
            disabled={saving}
            className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 order-last sm:order-first"
          >
            Eliminar Clase
          </Button>

          <div className="flex items-center gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="flex-1 sm:flex-initial text-xs"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              variant="primary"
              loading={saving}
              className="flex-1 sm:flex-initial text-xs font-bold"
            >
              Guardar Cambios
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
