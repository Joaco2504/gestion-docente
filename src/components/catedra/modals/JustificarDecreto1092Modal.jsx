import React, { useState, useMemo } from 'react';
import { ShieldAlert, AlertTriangle, Check, X, BookOpen, Clock, FileText, Search } from 'lucide-react';
import Modal from '../../common/Modal';
import { formatFechaDMY } from '../../../lib/dateUtils';
import { getLocalLicencias, calcularDisponibilidadArticulo } from '../../../services/licenciasService';
import { useAuth } from '../../../context/AuthContext';
import { CATALOGO_DECRETO_1092 } from '../../../constants/decreto1092';

/**
 * JustificarDecreto1092Modal
 * Modal ágil para justificar inasistencia docente por Decreto 1092 (Catamarca).
 * Al registrarse, la clase pasa a 'DOCENTE_AUSENTE' y no descuenta asistencia al alumnado.
 */
export default function JustificarDecreto1092Modal({
  isOpen,
  onClose,
  clase,
  onConfirm,
  onOpenHistorialLicencias
}) {
  const { user } = useAuth();
  const [selectedCodigo, setSelectedCodigo] = useState('ART_52');
  const [searchArticulo, setSearchArticulo] = useState('');
  const [customArticulo, setCustomArticulo] = useState('');
  const [observacion, setObservacion] = useState('');
  const [saving, setSaving] = useState(false);

  const currentYear = new Date().getFullYear();
  const localLicencias = useMemo(() => {
    try {
      return getLocalLicencias(user?.id) || [];
    } catch (_) {
      return [];
    }
  }, [user?.id, isOpen]);

  const licenciasCount = useMemo(() => {
    return localLicencias.filter(l => (l.fecha || l.fecha_inicio || '').startsWith(String(currentYear))).length;
  }, [localLicencias, currentYear]);

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

  if (!isOpen || !clase) return null;

  const fechaFormateada = formatFechaDMY(clase.fecha);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const selectedObj = CATALOGO_DECRETO_1092.find(a => a.codigo === selectedCodigo);
      const articuloFinal = selectedCodigo === 'OTRO'
        ? (customArticulo.trim() || 'Motivo Institucional')
        : (selectedObj?.label || selectedCodigo);

      await onConfirm({
        claseId: clase.id,
        estado: 'DOCENTE_AUSENTE',
        articulo_licencia: articuloFinal,
        articulo_codigo: selectedCodigo !== 'OTRO' ? selectedCodigo : null,
        tema: `Sin actividad áulica - Licencia Docente (${articuloFinal})`,
        observaciones: observacion.trim() || undefined
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🛡️ Justificar Inasistencia Docente"
      subtitle={`Clase del ${fechaFormateada} · Régimen Decreto 1092`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Banner de Garantía Académica */}
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <strong className="block font-bold">Garantía Académica para los Estudiantes</strong>
            <p className="leading-relaxed">
              Esta jornada quedará eximida del cómputo general. Ningún estudiante será penalizado en su porcentaje acumulado ni perderá la regularidad por esta clase.
            </p>
          </div>
        </div>

        {/* Botón de Acceso Directo: Historial Anual de Licencias */}
        {onOpenHistorialLicencias && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenHistorialLicencias();
            }}
            className="w-full py-2 px-3 rounded-xl border border-primary/25 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer touch-target-44 min-h-[40px]"
            title="Abrir el centro de control anual de licencias docentes"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>📋 Ver mi historial anual de licencias ({licenciasCount} usadas en {currentYear})</span>
          </button>
        )}

        {/* Selector de Artículo del Decreto 1092 con Buscador Rápido */}
        <div className="space-y-2">
          <label className="block text-xs font-mono uppercase font-bold text-text-secondary">
            Artículo / Causal del Decreto 1092 *
          </label>

          {/* Input de búsqueda en tiempo real */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchArticulo}
              onChange={(e) => setSearchArticulo(e.target.value)}
              placeholder="🔍 Buscar artículo por número o motivo (ej: 52, 16, salud, examen, fallecimiento)..."
              className="w-full pl-8 pr-8 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-surface-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
            />
            {searchArticulo && (
              <button
                type="button"
                onClick={() => setSearchArticulo('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {articulosFiltrados.map((art) => {
              const isSelected = selectedCodigo === art.codigo;
              const disp = calcularDisponibilidadArticulo(art.codigo, localLicencias, clase.fecha);
              const badgeCupo = disp.modo === 'SIN_LIMITE'
                ? 'Sin límite'
                : disp.modo === 'POR_EVENTO'
                ? `Hasta ${art.topePorEvento} ${art.unidad}/ev.`
                : disp.bloqueado
                ? 'Cupo agotado'
                : `${disp.restanteAnual ?? '—'} disp.`;
              return (
                <label
                  key={art.codigo}
                  className={`flex items-start justify-between gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary/10 border-primary text-text-primary font-semibold shadow-xs'
                      : 'bg-surface border-surface-border text-text-secondary hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <input
                      type="radio"
                      name="articuloDecreto"
                      value={art.codigo}
                      checked={isSelected}
                      onChange={() => setSelectedCodigo(art.codigo)}
                      className="mt-0.5 text-primary focus:ring-primary"
                    />
                    <div className="min-w-0">
                      <span className="block font-medium text-text-primary">{art.label}</span>
                      <span className="block text-[10px] text-text-muted">{art.capitulo} · {art.descripcion}</span>
                    </div>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    disp.bloqueado
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      : disp.modo === 'SIN_LIMITE'
                      ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {badgeCupo}
                  </span>
                </label>
              );
            })}

            {/* Opción Otro artículo */}
            <label
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                selectedCodigo === 'OTRO'
                  ? 'bg-primary/10 border-primary text-text-primary font-semibold shadow-xs'
                  : 'bg-surface border-surface-border text-text-secondary hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <input
                type="radio"
                name="articuloDecreto"
                value="OTRO"
                checked={selectedCodigo === 'OTRO'}
                onChange={() => setSelectedCodigo('OTRO')}
                className="mt-0.5 text-primary focus:ring-primary"
              />
              <div className="min-w-0">
                <span className="block font-medium text-text-primary">Otro artículo / Motivo institucional</span>
                <span className="text-[10px] text-text-muted">Especificar norma reglamentaria manualmente</span>
              </div>
            </label>
          </div>
        </div>

        {/* Input libre si eligió OTRO */}
        {selectedCodigo === 'OTRO' && (
          <div className="space-y-1 animate-fadeIn">
            <label className="block text-xs font-mono font-semibold text-text-secondary">
              Especificar artículo o norma:
            </label>
            <input
              type="text"
              value={customArticulo}
              onChange={(e) => setCustomArticulo(e.target.value)}
              placeholder="Ej: Art. 50 — Comisión de Servicios Especiales"
              required
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-surface-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
            />
          </div>
        )}

        {/* Observación / Nota personal */}
        <div className="space-y-1">
          <label className="block text-xs font-mono uppercase font-bold text-text-secondary">
            Observación / Nota personal (Opcional)
          </label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder="Escribí una observación (ej: Entregué certificado al preceptor, mesa de examen en IES, reposo médico por 48hs...)"
            rows={2}
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-surface-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium resize-none"
          />
        </div>

        {/* Botonera de Acción */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-surface-border text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{saving ? 'Registrando...' : 'Confirmar Justificación'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
