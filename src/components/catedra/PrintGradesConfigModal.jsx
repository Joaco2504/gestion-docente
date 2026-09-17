import React, { useState, useEffect, useMemo } from 'react';
import { 
  Printer, 
  Eye, 
  CheckSquare, 
  Square, 
  Layers, 
  FileText, 
  CheckCircle2, 
  RotateCw, 
  SlidersHorizontal,
  GraduationCap,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { formatFechaDMY } from '../../lib/dateUtils';

/**
 * PrintGradesConfigModal - Modal interactivo de configuración previa de impresión de calificaciones
 * Permite al docente personalizar qué columnas, evaluaciones y formatos incluir antes de abrir la vista previa oficial.
 */
export default function PrintGradesConfigModal({
  isOpen,
  onClose,
  evaluaciones = [],
  onGeneratePreview,
  initialConfig = {}
}) {
  // Estado de configuración de columnas
  const [includeAsistencia, setIncludeAsistencia] = useState(true);
  const [selectedEvalIds, setSelectedEvalIds] = useState([]);
  const [includeNotaFinal, setIncludeNotaFinal] = useState(true);
  const [includeCondicion, setIncludeCondicion] = useState(true);

  // Estado de formato de página y legal
  const [orientation, setOrientation] = useState('landscape'); // 'landscape' | 'portrait'
  const [includeSignature, setIncludeSignature] = useState(true);

  // Sincronizar estado cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setIncludeAsistencia(initialConfig.includeAsistencia !== undefined ? initialConfig.includeAsistencia : true);
      setIncludeNotaFinal(initialConfig.includeNotaFinal !== undefined ? initialConfig.includeNotaFinal : true);
      setIncludeCondicion(initialConfig.includeCondicion !== undefined ? initialConfig.includeCondicion : true);
      setOrientation(initialConfig.orientation || 'landscape');
      setIncludeSignature(initialConfig.includeSignature !== undefined ? initialConfig.includeSignature : true);

      if (initialConfig.selectedEvalIds && Array.isArray(initialConfig.selectedEvalIds)) {
        setSelectedEvalIds(initialConfig.selectedEvalIds);
      } else {
        // Por defecto, todas las evaluaciones seleccionadas
        setSelectedEvalIds(evaluaciones.map(e => e.id));
      }
    }
  }, [isOpen, evaluaciones, initialConfig]);

  // Evaluaciones principales (no recuperatorios) y mapa de recuperatorios
  const mainEvaluations = useMemo(() => {
    return evaluaciones.filter(e => e.tipo !== 'RECUPERATORIO');
  }, [evaluaciones]);

  const recuperatorios = useMemo(() => {
    return evaluaciones.filter(e => e.tipo === 'RECUPERATORIO');
  }, [evaluaciones]);

  // Toggle individual de evaluación
  const toggleEvaluation = (id) => {
    setSelectedEvalIds(prev => {
      if (prev.includes(id)) {
        // Si deseleccionamos una evaluación principal, deseleccionamos también sus recuperatorios vinculados
        const linkedRecup = recuperatorios.find(r => r.evaluacion_origen_id === id);
        return prev.filter(item => item !== id && (!linkedRecup || item !== linkedRecup.id));
      } else {
        // Si seleccionamos, incluimos la evaluación y sus recuperatorios
        const linkedRecup = recuperatorios.find(r => r.evaluacion_origen_id === id);
        const next = [...prev, id];
        if (linkedRecup && !next.includes(linkedRecup.id)) {
          next.push(linkedRecup.id);
        }
        return next;
      }
    });
  };

  // Acciones rápidas de selección de evaluaciones
  const selectAllEvaluations = () => {
    setSelectedEvalIds(evaluaciones.map(e => e.id));
  };

  const deselectAllEvaluations = () => {
    setSelectedEvalIds([]);
  };

  const selectOnlyParciales = () => {
    const parcialIds = evaluaciones
      .filter(e => e.tipo === 'PARCIAL' || (e.tipo === 'RECUPERATORIO' && evaluaciones.some(p => p.id === e.evaluacion_origen_id && p.tipo === 'PARCIAL')))
      .map(e => e.id);
    setSelectedEvalIds(parcialIds);
  };

  const selectOnlyTPs = () => {
    const tpIds = evaluaciones.filter(e => e.tipo === 'TP').map(e => e.id);
    setSelectedEvalIds(tpIds);
  };

  // Validación: Al menos una columna o evaluación debe estar seleccionada
  const selectedMainCount = mainEvaluations.filter(e => selectedEvalIds.includes(e.id)).length;
  const hasAtLeastOneColumn = includeAsistencia || selectedMainCount > 0 || includeNotaFinal || includeCondicion;

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!hasAtLeastOneColumn) return;

    onGeneratePreview({
      includeAsistencia,
      selectedEvalIds,
      includeNotaFinal,
      includeCondicion,
      orientation,
      includeSignature
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configurar Impresión / Exportación PDF"
      subtitle="Personaliza las columnas, evaluaciones y formato de página antes de generar el acta"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 overflow-y-auto max-h-[75vh]">
        
        {/* SECCIÓN 1: COLUMNAS BÁSICAS A INCLUIR */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
              Columnas del Reporte
            </h4>
            <span className="text-[11px] text-text-muted">
              Selecciona los datos a visibilizar en la sábana
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* 1. Porcentaje de Asistencia */}
            <label
              className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                includeAsistencia 
                  ? 'bg-primary/5 border-primary/40 text-text-primary shadow-xs' 
                  : 'bg-surface/50 border-surface-border text-text-muted hover:border-surface-border-strong'
              }`}
            >
              <input
                type="checkbox"
                checked={includeAsistencia}
                onChange={(e) => setIncludeAsistencia(e.target.checked)}
                className="mt-0.5 rounded border-surface-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-text-primary flex items-center justify-between">
                  <span>% Asistencia</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface border border-surface-border text-text-muted">
                    %
                  </span>
                </div>
                <p className="text-[11px] text-text-muted mt-0.5 leading-tight">
                  Cómputo general de asistencias a clase
                </p>
              </div>
            </label>

            {/* 2. Nota Final de Cursada */}
            <label
              className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                includeNotaFinal 
                  ? 'bg-primary/5 border-primary/40 text-text-primary shadow-xs' 
                  : 'bg-surface/50 border-surface-border text-text-muted hover:border-surface-border-strong'
              }`}
            >
              <input
                type="checkbox"
                checked={includeNotaFinal}
                onChange={(e) => setIncludeNotaFinal(e.target.checked)}
                className="mt-0.5 rounded border-surface-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-text-primary flex items-center justify-between">
                  <span>Nota Final</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface border border-surface-border text-text-muted">
                    Promedio
                  </span>
                </div>
                <p className="text-[11px] text-text-muted mt-0.5 leading-tight">
                  Promedio ponderado de notas obtenidas
                </p>
              </div>
            </label>

            {/* 3. Condición Reglamentaria */}
            <label
              className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                includeCondicion 
                  ? 'bg-primary/5 border-primary/40 text-text-primary shadow-xs' 
                  : 'bg-surface/50 border-surface-border text-text-muted hover:border-surface-border-strong'
              }`}
            >
              <input
                type="checkbox"
                checked={includeCondicion}
                onChange={(e) => setIncludeCondicion(e.target.checked)}
                className="mt-0.5 rounded border-surface-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-text-primary flex items-center justify-between">
                  <span>Condición Final</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface border border-surface-border text-text-muted">
                    Estado
                  </span>
                </div>
                <p className="text-[11px] text-text-muted mt-0.5 leading-tight">
                  Promocional, Regular o Libre
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* SECCIÓN 2: EVALUACIONES ESPECÍFICAS (TPS / PARCIALES) */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-primary" />
                Evaluaciones Específicas
              </h4>
              <p className="text-[11px] text-text-muted">
                {selectedMainCount} de {mainEvaluations.length} evaluaciones seleccionadas
              </p>
            </div>

            {/* Botones de selección rápida */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={selectAllEvaluations}
                className="px-2 py-1 text-[11px] font-semibold text-text-muted hover:text-text-primary bg-surface hover:bg-surface-hover border border-surface-border rounded-lg transition-colors cursor-pointer"
              >
                Todas
              </button>
              <button
                type="button"
                onClick={deselectAllEvaluations}
                className="px-2 py-1 text-[11px] font-semibold text-text-muted hover:text-text-primary bg-surface hover:bg-surface-hover border border-surface-border rounded-lg transition-colors cursor-pointer"
              >
                Ninguna
              </button>
              {evaluaciones.some(e => e.tipo === 'PARCIAL') && (
                <button
                  type="button"
                  onClick={selectOnlyParciales}
                  className="px-2 py-1 text-[11px] font-semibold text-text-muted hover:text-text-primary bg-surface hover:bg-surface-hover border border-surface-border rounded-lg transition-colors cursor-pointer"
                >
                  Solo Parciales
                </button>
              )}
              {evaluaciones.some(e => e.tipo === 'TP') && (
                <button
                  type="button"
                  onClick={selectOnlyTPs}
                  className="px-2 py-1 text-[11px] font-semibold text-text-muted hover:text-text-primary bg-surface hover:bg-surface-hover border border-surface-border rounded-lg transition-colors cursor-pointer"
                >
                  Solo TPs
                </button>
              )}
            </div>
          </div>

          {/* Listado de evaluaciones */}
          <div className="border border-surface-border rounded-2xl p-2 bg-surface/30 max-h-52 overflow-y-auto space-y-1.5">
            {mainEvaluations.length === 0 ? (
              <div className="p-4 text-center text-xs text-text-muted italic">
                No hay evaluaciones registradas en esta cátedra.
              </div>
            ) : (
              mainEvaluations.map((ev) => {
                const isSelected = selectedEvalIds.includes(ev.id);
                const linkedRecup = recuperatorios.find(r => r.evaluacion_origen_id === ev.id);

                return (
                  <div
                    key={ev.id}
                    onClick={() => toggleEvaluation(ev.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-surface border-primary/30 shadow-2xs'
                        : 'bg-surface/20 border-surface-border opacity-70 hover:opacity-100 hover:border-surface-border-strong'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="text-primary shrink-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4 text-text-muted" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-text-primary truncate">
                            {ev.titulo}
                          </span>
                          {linkedRecup && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                              + Recuperatorio
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-text-muted block truncate">
                          {ev.fecha_entrega ? `Entrega: ${formatFechaDMY(ev.fecha_entrega)}` : 'Sin fecha fijada'}
                        </span>
                      </div>
                    </div>

                    <Badge 
                      variant={
                        ev.tipo === 'PARCIAL' ? 'warning' :
                        ev.tipo === 'TP' ? 'info' : 'default'
                      }
                      className="shrink-0 text-[10px] uppercase font-bold"
                    >
                      {ev.tipo}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SECCIÓN 3: OPCIONES DE FORMATO Y LEGAL */}
        <div className="space-y-3 pt-2 border-t border-surface-border">
          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <RotateCw className="w-3.5 h-3.5 text-primary" />
            Opciones de Formato y Página
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Orientación Horizontal (Landscape) */}
            <div
              onClick={() => setOrientation('landscape')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                orientation === 'landscape'
                  ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary'
                  : 'bg-surface/50 border-surface-border text-text-muted hover:border-surface-border-strong'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${orientation === 'landscape' ? 'bg-primary text-white' : 'bg-surface text-text-muted'}`}>
                <RotateCw className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <span>Horizontal (Landscape)</span>
                  <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded">
                    Recomendado
                  </span>
                </div>
                <p className="text-[11px] text-text-muted mt-0.5 leading-tight">
                  Ideal para sábanas de notas completas y múltiples columnas evaluativas.
                </p>
              </div>
            </div>

            {/* Orientación Vertical (Portrait) */}
            <div
              onClick={() => setOrientation('portrait')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                orientation === 'portrait'
                  ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary'
                  : 'bg-surface/50 border-surface-border text-text-muted hover:border-surface-border-strong'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${orientation === 'portrait' ? 'bg-primary text-white' : 'bg-surface text-text-muted'}`}>
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-text-primary">
                  Vertical (Portrait)
                </div>
                <p className="text-[11px] text-text-muted mt-0.5 leading-tight">
                  Adecuado para nóminas reducidas o resúmenes rápidos de cursada.
                </p>
              </div>
            </div>
          </div>

          {/* Inclusión de Firmas al Pie */}
          <label
            className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none mt-2 ${
              includeSignature
                ? 'bg-primary/5 border-primary/40 text-text-primary shadow-xs'
                : 'bg-surface/50 border-surface-border text-text-muted hover:border-surface-border-strong'
            }`}
          >
            <input
              type="checkbox"
              checked={includeSignature}
              onChange={(e) => setIncludeSignature(e.target.checked)}
              className="mt-0.5 rounded border-surface-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-text-primary">
                Incluir bloque de firmas al pie
              </div>
              <p className="text-[11px] text-text-muted mt-0.5 leading-tight">
                Espacios formales reglamentarios para firma y sello del Docente Titular y Secretaría Académica.
              </p>
            </div>
          </label>
        </div>

        {/* ALERTA SI NO HAY COLUMNAS SELECCIONADAS */}
        {!hasAtLeastOneColumn && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Por favor selecciona al menos una columna o evaluación para generar el reporte.</span>
          </div>
        )}

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-between pt-4 border-t border-surface-border">
          <Button
            variant="secondary"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            variant="primary"
            icon={Eye}
            disabled={!hasAtLeastOneColumn}
            className="font-bold shadow-xs"
          >
            Generar Vista Previa
          </Button>
        </div>
      </form>
    </Modal>
  );
}
