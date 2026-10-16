import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Layers, 
  Check, 
  ShieldAlert, 
  RotateCcw, 
  Sparkles, 
  Save,
  FileText
} from 'lucide-react';
import JustificarDecreto1092Modal from '../modals/JustificarDecreto1092Modal';
import OfflineSyncBadge from '../../common/OfflineSyncBadge';
import { formatFechaDMY } from '../../../lib/dateUtils';

/**
 * AttendanceClassTopicBar
 * Barra interactiva de alta velocidad para vincular Unidad temática,
 * completar el tema dictado de la clase y justificar inasistencias por Decreto 1092.
 */
export default function AttendanceClassTopicBar({
  claseActiva,
  unidades = [],
  onUpdateClase,
  disabled = false,
  onOpenLicenciasModal = null
}) {
  const [tema, setTema] = useState('');
  const [unidad, setUnidad] = useState('');
  const [isModal1092Open, setIsModal1092Open] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sincronizar inputs cuando cambia la clase activa
  useEffect(() => {
    if (claseActiva) {
      setTema(claseActiva.tema || '');
      setUnidad(claseActiva.unidad || '');
      setHasChanges(false);
    } else {
      setTema('');
      setUnidad('');
      setHasChanges(false);
    }
  }, [claseActiva?.id, claseActiva?.tema, claseActiva?.unidad]);

  if (!claseActiva) {
    return null;
  }

  const isDocenteAusente = claseActiva.estado === 'DOCENTE_AUSENTE';
  const articuloLicencia = claseActiva.articulo_licencia || 'Decreto 1092';
  const formattedDate = formatFechaDMY(claseActiva.fecha);

  const handleGuardarTemaYUnidad = async () => {
    if (!claseActiva?.id) return;
    setSaving(true);
    try {
      await onUpdateClase(claseActiva.id, {
        tema: tema.trim() || 'Clase regular',
        unidad: unidad.trim() || null
      });
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  const handleRevertirADictada = async () => {
    if (!claseActiva?.id) return;
    setSaving(true);
    try {
      await onUpdateClase(claseActiva.id, {
        estado: 'DICTADA',
        articulo_licencia: null,
        tema: tema.includes('Licencia Docente') ? 'Clase dictada regular' : tema
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* 1. Banner Especial si la clase fue justificada por Licencia Docente */}
      {isDocenteAusente ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 shadow-xs animate-fadeIn">
          <div className="flex items-start gap-2.5 min-w-0">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold leading-tight">
                🛡️ Clase justificada por Licencia Docente ({articuloLicencia})
              </p>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                Esta jornada ({formattedDate}) no computa inasistencias para los alumnos. Los porcentajes de asistencia acumulada no son penalizados.
                {onOpenLicenciasModal && (
                  <button
                    type="button"
                    onClick={onOpenLicenciasModal}
                    className="ml-1.5 font-bold underline hover:text-amber-950 dark:hover:text-white cursor-pointer inline-block"
                  >
                    Ver balance anual de licencias
                  </button>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
            <OfflineSyncBadge />
            <button
              type="button"
              disabled={disabled || saving}
              onClick={handleRevertirADictada}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 touch-target-44 min-h-[38px]"
              title="Revertir el estado a clase dictada y reanudar el pase de lista"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Revertir a Dictada</span>
            </button>
          </div>
        </div>
      ) : (
        /* 2. Barra Rápida de Edición de Unidad y Tema + Botón Decreto 1092 */
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 min-w-0">
            {/* Selector Rápido de Unidad */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 shrink-0">
              <Layers className="w-4 h-4 text-primary shrink-0" />
              <select
                value={unidad}
                onChange={(e) => {
                  setUnidad(e.target.value);
                  setHasChanges(true);
                }}
                disabled={disabled}
                className="bg-transparent text-xs font-semibold text-text-primary focus:outline-none cursor-pointer max-w-[140px]"
                aria-label="Seleccionar o asignar unidad temática a la clase"
              >
                <option value="" className="text-slate-900 dark:text-white">Sin Unidad</option>
                {unidades.map((u) => (
                  <option key={u.id || u.numero} value={`Unidad ${u.numero}`} className="text-slate-900 dark:text-white">
                    Unidad {u.numero} {u.titulo ? `· ${u.titulo}` : ''}
                  </option>
                ))}
                {!unidades.some(u => `Unidad ${u.numero}` === unidad) && unidad && (
                  <option value={unidad} className="text-slate-900 dark:text-white">{unidad}</option>
                )}
                <option value="Unidad 1" className="text-slate-900 dark:text-white">Unidad 1</option>
                <option value="Unidad 2" className="text-slate-900 dark:text-white">Unidad 2</option>
                <option value="Unidad 3" className="text-slate-900 dark:text-white">Unidad 3</option>
                <option value="Unidad 4" className="text-slate-900 dark:text-white">Unidad 4</option>
              </select>
            </div>

            {/* Input de Tema de la Clase */}
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                value={tema}
                onChange={(e) => {
                  setTema(e.target.value);
                  setHasChanges(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleGuardarTemaYUnidad();
                  }
                }}
                placeholder="Agregar o editar el tema dictado en esta clase..."
                disabled={disabled}
                className="w-full pl-3 pr-20 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
              />
              {hasChanges && (
                <button
                  type="button"
                  onClick={handleGuardarTemaYUnidad}
                  disabled={saving}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-primary text-white text-[10px] font-bold shadow-xs hover:bg-primary-hover transition-all cursor-pointer flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  <span>{saving ? 'Guardando...' : 'Guardar'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Botones de Soporte y Decreto 1092 */}
          <div className="flex items-center gap-2 justify-end shrink-0">
            <OfflineSyncBadge />

            {/* Botón Justificar Inasistencia Decreto 1092 */}
            <button
              type="button"
              onClick={() => setIsModal1092Open(true)}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-xs font-bold transition-all cursor-pointer touch-target-44 min-h-[38px]"
              title="Justificar inasistencia docente según los artículos del Decreto 1092 (Catamarca)"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Justificar mi Inasistencia</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal Decreto 1092 */}
      <JustificarDecreto1092Modal
        isOpen={isModal1092Open}
        onClose={() => setIsModal1092Open(false)}
        clase={claseActiva}
        onOpenHistorialLicencias={onOpenLicenciasModal}
        onConfirm={async (data) => {
          await onUpdateClase(data.claseId, {
            estado: data.estado,
            articulo_licencia: data.articulo_licencia,
            tema: data.tema,
            observaciones: data.observaciones
          });
        }}
      />
    </div>
  );
}
