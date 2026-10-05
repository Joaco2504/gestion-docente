import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Edit3, 
  ListChecks, 
  Search, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  FileText
} from 'lucide-react';
import Badge from '../../common/Badge';
import RiskBadge from '../../common/RiskBadge';
import Button from '../../common/Button';
import { formatFechaDMY } from '../../../lib/dateUtils';
import { getShortEvaluationTitle } from './GradesHeaderColumn';

/**
 * Vista móvil y tablet (< 1024 px) "Por Evaluación".
 * Elimina la tabla ancha horizontal en teléfonos y presenta un selector
 * superior de evaluación con la nómina de alumnos y notas editables (touch targets ≥ 44 px).
 */
export default function GradesMobileView({
  evaluaciones = [],
  estudiantes = [],
  notas = [],
  matrixData = [],
  studentRiskMap,
  getNotaValue,
  getNotaEstado,
  getCondBadgeVariant,
  onOpenEditNota,
  onOpenEditEvaluacion,
  onOpenBatchGrade
}) {
  const mainEvaluations = useMemo(() => {
    return evaluaciones.filter(e => !String(e.tipo || '').toUpperCase().includes('RECUP'));
  }, [evaluaciones]);

  const [activeEvalId, setActiveEvalId] = useState(mainEvaluations[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');

  // Sincronizar evaluación activa si cambia la lista
  const activeEval = useMemo(() => {
    return mainEvaluations.find(e => e.id === activeEvalId) || mainEvaluations[0] || null;
  }, [mainEvaluations, activeEvalId]);

  // Recuperatorio vinculado a la evaluación activa (si existe)
  const linkedRecup = useMemo(() => {
    if (!activeEval) return null;
    return evaluaciones.find(
      r => String(r.tipo || '').toUpperCase().includes('RECUP') && r.evaluacion_origen_id === activeEval.id
    );
  }, [evaluaciones, activeEval]);

  // Alumnos filtrados
  const filteredEstudiantes = useMemo(() => {
    if (!searchQuery.trim()) return estudiantes;
    const q = searchQuery.toLowerCase().trim();
    return estudiantes.filter(est => {
      const full = `${est.apellido || ''} ${est.nombre || ''}`.toLowerCase();
      const dni = String(est.dni || '');
      return full.includes(q) || dni.includes(q);
    });
  }, [estudiantes, searchQuery]);

  // Métricas rápidas de la evaluación seleccionada
  const stats = useMemo(() => {
    if (!activeEval || estudiantes.length === 0) return { calificados: 0, aprobados: 0, promedio: '—' };
    let calificadosCount = 0;
    let aprobadosCount = 0;
    let suma = 0;

    estudiantes.forEach(est => {
      const val = getNotaValue(est.id, activeEval.id);
      const estNota = getNotaEstado(est.id, activeEval.id);
      if (val !== null) {
        calificadosCount++;
        suma += val;
        if (val >= 4) aprobadosCount++;
      } else if (estNota === 'AUSENTE' || estNota === 'NO_ENTREGO') {
        calificadosCount++;
      }
    });

    const prom = calificadosCount > 0 ? (suma / (calificadosCount || 1)).toFixed(1) : '—';
    return {
      calificados: calificadosCount,
      aprobados: aprobadosCount,
      promedio: prom
    };
  }, [activeEval, estudiantes, getNotaValue, getNotaEstado]);

  if (evaluaciones.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-surface-border">
        <FileText className="w-12 h-12 mx-auto text-slate-400 mb-3" />
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Sin evaluaciones creadas</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Crea el primer Trabajo Práctico o Parcial para comenzar a calificar a tus alumnos en móvil.
        </p>
      </div>
    );
  }

  const rawDate = activeEval?.fecha_entrega || activeEval?.fecha;

  return (
    <div className="space-y-4">
      {/* 1. Selector Superior Horizontal de Evaluaciones */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-border p-3 shadow-xs">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Seleccionar Evaluación a Calificar
        </label>
        
        {/* Carrusel deslizable de chips de evaluaciones */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
          {mainEvaluations.map((ev, idx) => {
            const isSelected = ev.id === activeEval?.id;
            const shortName = getShortEvaluationTitle(ev.titulo, ev.tipo, idx);
            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => setActiveEvalId(ev.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 touch-target-44 flex flex-col items-start gap-0.5 border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{shortName}</span>
                <span className={`text-[10px] font-mono font-normal ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {ev.tipo}
                </span>
              </button>
            );
          })}
        </div>

        {/* Ficha Resumen de la Evaluación Activa */}
        {activeEval && (
          <div className="mt-3 pt-3 border-t border-surface-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                {activeEval.titulo}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  {rawDate ? `Entrega: ${formatFechaDMY(rawDate)}` : 'Sin fecha fijada'}
                </span>
                <span>•</span>
                <span className="text-[11px]">
                  Calificados: <strong>{stats.calificados}/{estudiantes.length}</strong>
                </span>
              </div>
            </div>

            {/* Acciones para la evaluación activa */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpenEditEvaluacion && onOpenEditEvaluacion(activeEval)}
                className="flex-1 sm:flex-none text-xs touch-target-44"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1" />
                <span>Editar</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOpenBatchGrade && onOpenBatchGrade(activeEval)}
                className="flex-1 sm:flex-none text-xs touch-target-44"
              >
                <ListChecks className="w-3.5 h-3.5 mr-1" />
                <span>Calificar Curso</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Barra de Búsqueda Rápida de Alumnos */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar alumno por nombre o DNI..."
          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-surface-border text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
      </div>

      {/* 3. Listado Vertical de Alumnos con Edición Táctil de Nota */}
      <div className="space-y-2">
        {filteredEstudiantes.map((est, idx) => {
          const valOriginal = getNotaValue(est.id, activeEval.id);
          const estOriginal = getNotaEstado(est.id, activeEval.id);

          const valRecup = linkedRecup ? getNotaValue(est.id, linkedRecup.id) : null;
          const estRecup = linkedRecup ? getNotaEstado(est.id, linkedRecup.id) : null;

          const matrixItem = matrixData.find(m => m.estudiante.id === est.id);
          const studentRisk = studentRiskMap?.get(est.id);

          // Renderizador de Chip de Nota Táctil (≥ 44 px)
          const renderNotaChip = (val, estado, targetEv, isRecup = false) => {
            let label = '—';
            let chipStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700';

            if (estado === 'AUSENTE') {
              label = 'Aus.';
              chipStyle = 'bg-amber-100/80 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
            } else if (estado === 'NO_ENTREGO') {
              label = 'N/E';
              chipStyle = 'bg-rose-100/80 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800';
            } else if (val !== null) {
              label = String(val);
              if (val >= 7) {
                chipStyle = 'bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800';
              } else if (val >= 4) {
                chipStyle = 'bg-amber-100/90 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800';
              } else {
                chipStyle = 'bg-rose-100/90 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800';
              }
            }

            return (
              <button
                type="button"
                onClick={() => onOpenEditNota && onOpenEditNota(est, targetEv)}
                title={`Calificar a ${est.apellido}, ${est.nombre} en ${targetEv?.titulo}`}
                className={`min-w-[48px] min-h-[44px] px-2.5 py-1.5 rounded-xl font-mono text-sm font-bold border flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 touch-target-44 ${chipStyle}`}
              >
                <span>{label}</span>
              </button>
            );
          };

          return (
            <div
              key={est.id}
              className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-surface-border flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              {/* Información del Estudiante */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-mono text-slate-400">
                    {idx + 1}.
                  </span>
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                    {est.apellido}, {est.nombre}
                  </span>
                  <RiskBadge risk={studentRisk} compact />
                </div>

                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-mono">
                  <span>DNI: {est.dni || 'S/D'}</span>
                  <span>•</span>
                  <span>Asist: <strong>{matrixItem?.asistenciaPct || 0}%</strong></span>
                  {matrixItem?.condicion && (
                    <Badge variant={getCondBadgeVariant(matrixItem.condicion.condicion)} className="text-[10px] py-0 px-1.5">
                      {matrixItem.condicion.condicion === 'ACREDITADA_EQUIVALENCIA' ? 'EQUIV' : matrixItem.condicion.condicion}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Controles de Calificación: Original y Recuperatorio si aplica */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-mono uppercase text-slate-400 mb-0.5">Nota</span>
                  {renderNotaChip(valOriginal, estOriginal, activeEval)}
                </div>

                {linkedRecup && (
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-mono uppercase text-amber-500 mb-0.5">Recup</span>
                    {renderNotaChip(valRecup, estRecup, linkedRecup, true)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
