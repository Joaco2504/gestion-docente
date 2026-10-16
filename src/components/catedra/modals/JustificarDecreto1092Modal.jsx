import React, { useState, useMemo } from 'react';
import { ShieldAlert, AlertTriangle, Check, X, BookOpen, Clock, FileText } from 'lucide-react';
import Modal from '../../common/Modal';
import { formatFechaDMY } from '../../../lib/dateUtils';
import { getLocalLicencias } from '../../../services/licenciasService';
import { useAuth } from '../../../context/AuthContext';

const ARTICULOS_DECRETO_1092 = [
  { id: 'Art. 9°', label: 'Art. 9° — Enfermedad de corto tratamiento', descripcion: 'Afección común con certificado médico oficial' },
  { id: 'Art. 15°', label: 'Art. 15° — Razones particulares (con goce de haberes)', descripcion: 'Trámites o motivos personales reglamentarios' },
  { id: 'Art. 24°', label: 'Art. 24° — Atención de familiar enfermo', descripcion: 'Cuidado directo de cónyuge, hijos o padres' },
  { id: 'Art. 28°/29°', label: 'Art. 28° / 29° — Perfeccionamiento / Capacitación docente', descripcion: 'Congresos, jornadas académicas o formación en servicio' },
  { id: 'Art. 32°', label: 'Art. 32° — Examen / Mesas examinadoras', descripcion: 'Integración de tribunal examinador en otra institución' },
  { id: 'Art. 45°', label: 'Art. 45° — Fuerza mayor / Fenómenos climáticos', descripcion: 'Inclemencias meteorológicas o suspensión de actividades' },
  { id: 'OTRO', label: 'Otro artículo / Motivo institucional', descripcion: 'Especificar norma reglamentaria manualmente' }
];

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
  const [selectedArticulo, setSelectedArticulo] = useState('Art. 9°');
  const [customArticulo, setCustomArticulo] = useState('');
  const [observacion, setObservacion] = useState('');
  const [saving, setSaving] = useState(false);

  const currentYear = new Date().getFullYear();
  const licenciasCount = useMemo(() => {
    try {
      const list = getLocalLicencias(user?.id);
      return list.filter(l => (l.fecha || '').startsWith(String(currentYear))).length;
    } catch (_) {
      return 0;
    }
  }, [user?.id, currentYear, isOpen]);

  if (!isOpen || !clase) return null;

  const fechaFormateada = formatFechaDMY(clase.fecha);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const articuloFinal = selectedArticulo === 'OTRO' 
        ? (customArticulo.trim() || 'Motivo Institucional')
        : selectedArticulo;

      await onConfirm({
        claseId: clase.id,
        estado: 'DOCENTE_AUSENTE',
        articulo_licencia: articuloFinal,
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

        {/* Selector de Artículo del Decreto 1092 */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono uppercase font-bold text-text-secondary">
            Artículo / Causal del Decreto 1092 *
          </label>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {ARTICULOS_DECRETO_1092.map((art) => {
              const isSelected = selectedArticulo === art.id;
              return (
                <label
                  key={art.id}
                  className={`flex items-start gap-3 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary/10 border-primary text-text-primary font-semibold shadow-xs'
                      : 'bg-surface border-surface-border text-text-secondary hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="articuloDecreto"
                    value={art.id}
                    checked={isSelected}
                    onChange={() => setSelectedArticulo(art.id)}
                    className="mt-0.5 text-primary focus:ring-primary"
                  />
                  <div className="min-w-0">
                    <span className="block font-medium text-text-primary">{art.label}</span>
                    <span className="text-[11px] text-text-muted">{art.descripcion}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Input libre si eligió OTRO */}
        {selectedArticulo === 'OTRO' && (
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
