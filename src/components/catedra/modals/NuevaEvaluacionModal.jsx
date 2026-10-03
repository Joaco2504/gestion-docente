import React, { useState, useEffect } from 'react';
import { CheckCircle2, ExternalLink, Link as LinkIcon, X, Plus } from 'lucide-react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import CustomSelect from '../../common/CustomSelect';

export function NuevaEvaluacionModal({
  isOpen,
  onClose,
  onSave,
  periodos = [],
  evaluaciones = [],
  saving = false
}) {
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('Parcial');
  const [formato, setFormato] = useState('Escrito');
  const [fecha, setFecha] = useState('');
  const [periodoId, setPeriodoId] = useState('');
  const [evalOrigenId, setEvalOrigenId] = useState('');
  const [driveUrl, setDriveUrl] = useState('');

  // Reset al abrir
  useEffect(() => {
    if (isOpen) {
      setTitulo('');
      setTipo('Parcial');
      setFormato('Escrito');
      setFecha('');
      setPeriodoId('');
      setEvalOrigenId('');
      setDriveUrl('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    onSave({
      titulo: titulo.trim(),
      nombre: titulo.trim(),
      tipo,
      formato,
      fecha: fecha || null,
      fecha_entrega: fecha || null,
      periodo_id: periodoId || null,
      evaluacion_origen_id: tipo === 'Recuperatorio' ? (evalOrigenId || null) : null,
      drive_url: driveUrl.trim() || null
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Nueva Evaluación"
      subtitle="Registra un Parcial, Trabajo Práctico o Recuperatorio con fecha estipulada y consignas"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <span>
            Registra los datos de la evaluación para habilitar la columna de calificaciones en la sábana de notas. Puedes vincular consignas digitales o Drive.
          </span>
        </div>

        {/* Título o Nombre */}
        <div>
          <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Título o Nombre de la Evaluación *
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Parcial N° 1, TP N° 1 - Modelado Relacional..."
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all font-medium"
          />
        </div>

        {/* Tipo y Formato */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tipo de Evaluación *
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all cursor-pointer font-medium"
            >
              <option value="Parcial">Parcial</option>
              <option value="Trabajo Práctico">Trabajo Práctico</option>
              <option value="Recuperatorio">Recuperatorio</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Formato
            </label>
            <select
              value={formato}
              onChange={(e) => setFormato(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all cursor-pointer font-medium"
            >
              <option value="Escrito">Escrito</option>
              <option value="Oral">Oral</option>
            </select>
          </div>
        </div>

        {/* Fecha con etiqueta dinámica */}
        <div>
          <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {tipo === 'Trabajo Práctico' || tipo === 'TP'
              ? 'Fecha de Entrega'
              : 'Fecha Estipulada'}
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm font-mono focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
          />
        </div>

        {/* Período Académico (Opcional) */}
        {periodos.length > 0 && (
          <div>
            <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Período Académico (Opcional)
            </label>
            <CustomSelect
              value={periodoId}
              onChange={(val) => setPeriodoId(typeof val === 'object' ? val.target.value : val)}
              options={[
                { value: '', label: '-- General / Todo el Ciclo --' },
                ...periodos.map(p => ({
                  value: p.id,
                  label: p.nombre || `Período ${p.numero}`
                }))
              ]}
              placeholder="Seleccionar período académico..."
            />
          </div>
        )}

        {/* Vinculación al Parcial Original si es Recuperatorio */}
        {tipo === 'Recuperatorio' && (
          <div>
            <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Vincular al Parcial Original (Opcional)
            </label>
            <CustomSelect
              value={evalOrigenId}
              onChange={(val) => setEvalOrigenId(typeof val === 'object' ? val.target.value : val)}
              options={[
                { value: '', label: '-- Sin vinculación directa --' },
                ...evaluaciones
                  .filter(e => {
                    const t = (e.tipo || '').toUpperCase();
                    return t === 'PARCIAL' || t.includes('PARCIAL') || t === 'PRUEBA';
                  })
                  .map(e => ({
                    value: e.id,
                    label: `${e.titulo || e.nombre} (${e.tipo})`
                  }))
              ]}
              placeholder="Seleccionar evaluación original..."
            />
          </div>
        )}

        {/* Enlace de Google Drive a Consignas / Trabajo Práctico */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300">
              Enlace a Google Drive con Consignas / TP (Opcional)
            </label>
            <a
              href="https://drive.google.com"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Abrir Drive</span>
            </a>
          </div>
          <div className="relative">
            <input
              type="url"
              placeholder="https://drive.google.com/file/d/..."
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
            />
            <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            Puedes pegar el enlace compartido de Google Drive con las pautas del examen o trabajo práctico.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            variant="secondary"
            onClick={onClose}
            type="button"
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={saving} variant="primary">
            Guardar Evaluación
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default NuevaEvaluacionModal;
