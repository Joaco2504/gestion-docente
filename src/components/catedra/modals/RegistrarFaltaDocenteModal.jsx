import React, { useState, useEffect, useMemo } from 'react';
import { CalendarOff, AlertTriangle, Check, X, Clock, ShieldAlert, BookOpen, Search } from 'lucide-react';
import Modal from '../../common/Modal';
import { obtenerFeriado } from '../../../utils/feriadosAcademicos';
import { CATALOGO_DECRETO_1092 } from '../../../constants/decreto1092';

export function RegistrarFaltaDocenteModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  catedra = {}, 
  fechaPorDefecto 
}) {
  const [fecha, setFecha] = useState(fechaPorDefecto || new Date().toISOString().split('T')[0]);
  const [horario, setHorario] = useState('');
  const [articulo, setArticulo] = useState('ART_52'); // Artículo reglamentario por defecto (Decreto 1092)
  const [searchArticulo, setSearchArticulo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [errorValidacion, setErrorValidacion] = useState(null);

  const articulosFiltrados = useMemo(() => {
    const q = searchArticulo.trim().toLowerCase();
    if (!q) return CATALOGO_DECRETO_1092;
    return CATALOGO_DECRETO_1092.filter(art =>
      (art.label || '').toLowerCase().includes(q) ||
      (art.codigo || '').toLowerCase().includes(q) ||
      (art.capitulo || '').toLowerCase().includes(q) ||
      (art.descripcion || '').toLowerCase().includes(q)
    );
  }, [searchArticulo]);

  // Sincronizar fecha al abrir el modal si viene fecha por defecto
  useEffect(() => {
    if (isOpen) {
      setFecha(fechaPorDefecto || new Date().toISOString().split('T')[0]);
      setSearchArticulo('');
      setErrorValidacion(null);
    }
  }, [isOpen, fechaPorDefecto]);

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
    const artObj = CATALOGO_DECRETO_1092.find(a => a.codigo === articulo);
    onConfirm({
      fecha,
      articulo: artObj ? artObj.label : articulo,
      articulo_codigo: artObj ? artObj.codigo : null,
      motivo,
      horario: horario.trim() || undefined,
      catedra_id: catedra?.id
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Falta Docente"
      subtitle={`${catedra?.nombre || 'Cátedra'} ${catedra?.nivel ? `· ${catedra.nivel}` : ''}`}
      maxWidth="max-w-lg"
    >
      <div className="space-y-5">

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

          {/* Selector de Artículo de Licencia (Decreto 1092 / Marco Normativo) con Buscador Rápido */}
          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300">
              Régimen / Artículo de Inasistencia (Decreto 1092) *
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchArticulo}
                onChange={(e) => setSearchArticulo(e.target.value)}
                placeholder="🔍 Buscar artículo por número o motivo (ej: 52, 16, salud, examen, fallecimiento)..."
                className="w-full pl-8 pr-8 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
              />
              {searchArticulo && (
                <button
                  type="button"
                  onClick={() => setSearchArticulo('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <select
              value={articulo}
              onChange={(e) => setArticulo(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all cursor-pointer"
            >
              {articulosFiltrados.map(art => (
                <option key={art.codigo} value={art.codigo}>
                  {art.label}
                </option>
              ))}
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
    </Modal>
  );
}

export default RegistrarFaltaDocenteModal;
