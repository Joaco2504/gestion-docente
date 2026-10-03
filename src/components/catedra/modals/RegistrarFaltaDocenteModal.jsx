import React, { useState, useEffect } from 'react';
import { CalendarOff, AlertTriangle, Check, X, Clock, ShieldAlert, BookOpen } from 'lucide-react';
import { obtenerFeriado } from '../../../utils/feriadosAcademicos';

export function RegistrarFaltaDocenteModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  catedra = {}, 
  fechaPorDefecto 
}) {
  const [fecha, setFecha] = useState(fechaPorDefecto || new Date().toISOString().split('T')[0]);
  const [horario, setHorario] = useState('');
  const [articulo, setArticulo] = useState('70-A'); // Artículo reglamentario por defecto (Decreto 1092)
  const [motivo, setMotivo] = useState('');
  const [errorValidacion, setErrorValidacion] = useState(null);

  // Sincronizar fecha al abrir el modal si viene fecha por defecto
  useEffect(() => {
    if (isOpen) {
      setFecha(fechaPorDefecto || new Date().toISOString().split('T')[0]);
      setErrorValidacion(null);
    }
  }, [isOpen, fechaPorDefecto]);

  // Manejo de tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const feriadoDetectado = obtenerFeriado(fecha);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (feriadoDetectado) {
      setErrorValidacion(
        `La fecha seleccionada es feriado (${feriadoDetectado.nombre}). No requiere cómputo de falta docente.`
      );
      return;
    }
    setErrorValidacion(null);
    onConfirm({
      fecha,
      articulo,
      motivo,
      horario: horario.trim() || undefined,
      catedra_id: catedra?.id
    });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-falta-title"
    >
      <div 
        className="w-full max-w-lg bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 transition-all transform animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20 shrink-0">
              <CalendarOff className="w-5 h-5"/>
            </div>
            <div>
              <h3 id="modal-falta-title" className="font-bold text-base text-slate-900 dark:text-white">
                Registrar Falta Docente
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {catedra?.nombre || 'Cátedra'} {catedra?.nivel ? `· ${catedra.nivel}` : ''}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* Advertencia si la fecha es Feriado */}
        {feriadoDetectado && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500"/>
            <div className="space-y-0.5">
              <strong className="block font-semibold">
                {feriadoDetectado.tipo === 'provincial' ? '🏛️ Feriado Provincial' : '🇦🇷 Feriado Nacional'}: {feriadoDetectado.nombre}
              </strong>
              <p className="leading-relaxed">
                {feriadoDetectado.descripcion || 'Esta jornada no es laborable. No requiere cómputo de falta docente ni altera el cursado.'}
              </p>
            </div>
          </div>
        )}

        {/* Banner Excepción Académica */}
        {!feriadoDetectado && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>Garantía Académica:</strong> La falta docente no computa inasistencia para los estudiantes en esta jornada.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selector de Fecha */}
          <div>
            <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Fecha de la Inasistencia *
            </label>
            <input 
              type="date"
              value={fecha}
              onChange={(e) => {
                setFecha(e.target.value);
                setErrorValidacion(null);
              }}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all font-mono"
            />
          </div>

          {/* Horario / Turno de la Inasistencia */}
          <div>
            <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Horario / Turno de Clase (Opcional)</span>
            </label>
            <input 
              type="text"
              value={horario}
              onChange={(e) => setHorario(e.target.value)}
              placeholder="Ej: 08:00 - 10:00 o Turno Tarde"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
            />
          </div>

          {/* Selector de Artículo de Licencia (Decreto 1092 / Marco Normativo) */}
          <div>
            <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Régimen / Artículo de Inasistencia *
            </label>
            <select
              value={articulo}
              onChange={(e) => setArticulo(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all cursor-pointer"
            >
              <option value="70-A">Art. 70-A: Enfermedad común (Corto tratamiento)</option>
              <option value="70-B">Art. 70-B: Enfermedad largo tratamiento</option>
              <option value="70-G">Art. 70-G: Atención familiar enfermo</option>
              <option value="70-I">Art. 70-I: Examen o perfeccionamiento docente</option>
              <option value="70-K">Art. 70-K: Razones particulares (con/sin goce)</option>
              <option value="PARO">Medida de fuerza gremial / Adhesión a paro</option>
              <option value="SIN_AVISO">Inasistencia Injustificada / Sin parte médico</option>
            </select>
          </div>

          {/* Observaciones o Justificación */}
          <div>
            <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Observaciones / N° de Certificado (Opcional)
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Detalle o nota interna para el libro de temas..."
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all resize-none"
            />
          </div>

          {errorValidacion && (
            <p className="text-xs text-rose-500 font-medium">{errorValidacion}</p>
          )}

          {/* Botonera de Acción */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={Boolean(feriadoDetectado)}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-xs font-bold text-white shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5"/> Asentar Inasistencia
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegistrarFaltaDocenteModal;
