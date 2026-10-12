import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import CustomSelect from '../common/CustomSelect';
import { getTodayYMD } from '../../lib/dateUtils';

export default function NewEventModal({
  isOpen,
  onClose,
  onSubmit,
  catedras,
  initialDate,
  initialHour
}) {
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('CLASE');
  const [fecha, setFecha] = useState(initialDate || getTodayYMD());
  const [horaInicio, setHoraInicio] = useState(initialHour ? `${String(initialHour).padStart(2, '0')}:00` : '18:30');
  const [horaFin, setHoraFin] = useState(initialHour ? `${String(initialHour + 2).padStart(2, '0')}:00` : '20:30');
  const [aula, setAula] = useState('Aula 1');
  const [catedraId, setCatedraId] = useState(catedras?.[0]?.id || '');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    setSaving(true);
    setErrorMsg('');
    try {
      const ok = await onSubmit({
        titulo: titulo.trim(),
        tipo,
        fecha,
        horaInicio,
        horaFin,
        aula: aula.trim() || 'Aula 1',
        catedraId,
        notas: notas.trim() || null
      });
      if (ok) {
        setTitulo('');
        setNotas('');
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error al guardar compromiso');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Agregar Compromiso Académico"
      subtitle="Mesa de examen, parcial, entrega de trabajo práctico o reunión"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs rounded-xl">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
            Título del Compromiso o Materia *
          </label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: Clase Magistral: Control Estadístico de Procesos"
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
              Tipo de Compromiso *
            </label>
            <CustomSelect
              value={tipo}
              onChange={(val) => setTipo(typeof val === 'object' ? val.target.value : val)}
              options={[
                { value: 'CLASE', label: 'Clase Regular de Cátedra', badge: 'Clase' },
                { value: 'TRIBUNAL_EXAMEN', label: 'Mesa de Examen Final', badge: 'Mesa' },
                { value: 'EVALUACION', label: 'Evaluación / Examen Parcial', badge: 'Parcial' },
                { value: 'TRABAJO_PRACTICO', label: 'Entrega de Trabajo Práctico', badge: 'TP' },
                { value: 'REUNION', label: 'Reunión Docente / Institucional', badge: 'Reunión' }
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
              Vincular Cátedra
            </label>
            <CustomSelect
              value={catedraId}
              onChange={(val) => setCatedraId(typeof val === 'object' ? val.target.value : val)}
              options={(catedras || []).map(c => ({
                value: c.id,
                label: c.nombre
              }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
              Fecha *
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
              Hora Inicio (24 hs) *
            </label>
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
              Hora Fin (24 hs) *
            </label>
            <input
              type="time"
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
            Aula Asignada
          </label>
          <input
            type="text"
            value={aula}
            onChange={(e) => setAula(e.target.value)}
            placeholder="Ej: Aula 1 - Laboratorio Central"
            className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
            Observaciones / Tema a Dictar
          </label>
          <textarea
            rows={3}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Objetivos pedagógicos, tribunal evaluador o notas del libro..."
            className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={saving}
          >
            Guardar Compromiso
          </Button>
        </div>
      </form>
    </Modal>
  );
}
