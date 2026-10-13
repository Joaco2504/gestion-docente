import React from 'react';
import GradeCell from '../GradeCell';
import GradesHeaderColumn from './GradesHeaderColumn';
import Badge from '../../common/Badge';
import Tooltip from '../../common/Tooltip';
import RiskBadge from '../../common/RiskBadge';
import { Plus, Users } from 'lucide-react';
import Button from '../../common/Button';

/**
 * GradeMatrixTable
 * Renderizado de tabla matricial tipo hoja de cálculo para desktop (>= 1024px)
 * con navegación completa por teclado, chips de métricas y columnas fijas.
 */
/**
 * ConditionBadge
 * Badge elástico ultra-compacto con Tooltip accesible de Radix UI (BUG-03).
 * Evita desbordes en celdas de notebook (>=1024px) mostrando etiquetas
 * estandarizadas (PROM, REG, REC, LIB, EQUIV) con detalle reglamentario emergente.
 */
function ConditionBadge({ condicion, isCompact = false }) {
  const rawCond = String(condicion?.condicion || 'EN_CURSO').toUpperCase();

  let label = 'CURSO';
  let fullTitle = 'En Cursado Activo';
  let variant = 'default';

  if (rawCond === 'PROMOCIONAL' || rawCond === 'PROMO') {
    label = 'PROM';
    fullTitle = 'Promoción Directa';
    variant = 'promo';
  } else if (rawCond === 'REGULAR' || rawCond === 'REG') {
    label = 'REG';
    fullTitle = 'Alumno Regular';
    variant = 'regular';
  } else if (rawCond === 'RECUPERATORIO' || rawCond === 'REC') {
    label = 'REC';
    fullTitle = 'Recuperatorio Pendiente';
    variant = 'warning';
  } else if (rawCond === 'LIBRE' || rawCond === 'LIB') {
    label = 'LIB';
    fullTitle = 'Condición Libre';
    variant = 'libre';
  } else if (rawCond === 'ACREDITADA_EQUIVALENCIA' || rawCond === 'EQUIVALENCIA' || rawCond === 'EQUIV') {
    label = 'EQUIV';
    fullTitle = 'Acreditada por Equivalencia';
    variant = 'promo';
  }

  const tooltipText = condicion?.motivo
    ? `${fullTitle}: ${condicion.motivo}`
    : fullTitle;

  return (
    <Tooltip content={tooltipText} side="left">
      <span className="inline-flex">
        <Badge
          variant={variant}
          className={`font-black tracking-wider uppercase font-mono cursor-help select-none ${
            isCompact ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'
          }`}
        >
          {label}
        </Badge>
      </span>
    </Tooltip>
  );
}

export default function GradeMatrixTable({
  studentRows = [],
  mainEvaluations = [],
  evaluaciones = [],
  evalMetricsMap = new Map(),
  getNotaValue,
  getNotaEstado,
  onQuickSetGrade,
  onOpenEditNota,
  onOpenNuevaEvaluacion,
  density = 'comfortable'
}) {
  const isCompact = density === 'compact';

  const getCondBadgeVariant = (cond) => {
    switch (cond) {
      case 'PROMOCIONAL':
      case 'ACREDITADA_EQUIVALENCIA':
        return 'promo';
      case 'REGULAR':
        return 'regular';
      case 'LIBRE':
        return 'libre';
      default:
        return 'default';
    }
  };

  if (mainEvaluations.length === 0) {
    return (
      <div className="p-12 text-center bg-white/50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 space-y-3">
        <Users className="w-10 h-10 mx-auto text-text-muted/40" />
        <h3 className="font-bold text-sm text-text-primary">
          No hay evaluaciones registradas en esta cátedra
        </h3>
        <p className="text-xs text-text-muted max-w-sm mx-auto">
          Crea el primer parcial, trabajo práctico o examen para habilitar la sábana de notas.
        </p>
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={onOpenNuevaEvaluacion}
        >
          Crear Primera Evaluación
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto touch-pan-x scrollbar-thin rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 shadow-xs max-h-[75vh]">
      <table 
        className="w-full text-left border-collapse text-xs" 
        aria-label="Sábana de Calificaciones Académicas"
      >
        <caption className="sr-only">Matriz de calificaciones de la cátedra</caption>
        <thead className="sticky top-0 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur z-20">
          <tr className="border-b border-slate-200 dark:border-white/10 text-text-muted font-bold text-[11px] uppercase tracking-wider">
            {/* Columna Sticky Izquierda: Estudiante */}
            <th 
              scope="col" 
              className="py-3 px-3.5 sticky left-0 top-0 z-30 bg-slate-50 dark:bg-slate-800/95 backdrop-blur border-r border-slate-200/60 dark:border-white/10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] w-64 sm:w-72"
            >
              Estudiante (Apellido, Nombre y DNI)
            </th>

            {/* Columnas Dinámicas de Evaluaciones */}
            {mainEvaluations.map((ev, colIdx) => {
              const metrics = evalMetricsMap.get(ev.id);
              return (
                <th 
                  key={ev.id} 
                  scope="col" 
                  className="py-2 px-2.5 text-center min-w-[130px] border-r border-slate-200/40 dark:border-white/5"
                >
                  <GradesHeaderColumn 
                    evaluacion={ev}
                    metrics={metrics}
                  />
                </th>
              );
            })}

            {/* Columna: Promedio Cursada */}
            <th scope="col" className="py-3 px-3 text-center w-24">
              Promedio
            </th>

            {/* Columna Sticky Derecha: Condición RAM */}
            <th 
              scope="col" 
              className="py-3 px-3.5 sticky right-0 top-0 z-30 bg-slate-50 dark:bg-slate-800/95 backdrop-blur border-l border-slate-200/60 dark:border-white/10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.08)] text-center w-36"
            >
              Condición RAM
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-200/70 dark:divide-white/5">
          {studentRows.map((row, rowIdx) => {
            const { estudiante: est, promedio, condicion, risk, asistPct } = row;

            return (
              <tr 
                key={est.id} 
                className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
              >
                {/* Estudiante Congelado Izquierda */}
                <td 
                  scope="row" 
                  className={`sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/80 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] border-r border-slate-200/60 dark:border-white/10 px-3.5 ${
                    isCompact ? 'py-1.5' : 'py-2.5'
                  } w-64 sm:w-72`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono tabular-nums text-[10px] text-text-muted select-none w-4 shrink-0 text-right">
                          {rowIdx + 1}.
                        </span>
                        <strong className="text-xs text-text-primary truncate block font-bold" title={`${est.apellido}, ${est.nombre}`}>
                          {est.apellido}, {est.nombre}
                        </strong>
                      </div>
                      <div className="flex items-center gap-2 pl-5 text-[10px] text-text-muted font-mono">
                        <span>DNI: {est.dni || 'S/D'}</span>
                        {est.tiene_certificado_trabajo && (
                          <span className="text-blue-600 dark:text-blue-400 font-bold" title="Régimen Laboral 60%">
                            • 💼 60%
                          </span>
                        )}
                      </div>
                    </div>
                    {risk && <RiskBadge risk={risk} compact />}
                  </div>
                </td>

                {/* Celdas Interactivas de Calificación */}
                {mainEvaluations.map((ev, colIdx) => {
                  const recup = evaluaciones.find(
                    r => String(r.tipo || '').toUpperCase().includes('RECUP') && r.evaluacion_origen_id === ev.id
                  );
                  const notaOriginal = getNotaValue(est.id, ev.id);
                  const estadoOriginal = getNotaEstado(est.id, ev.id);
                  const notaRecup = recup ? getNotaValue(est.id, recup.id) : null;
                  const estadoRecup = recup ? getNotaEstado(est.id, recup.id) : null;

                  return (
                    <GradeCell
                      key={ev.id}
                      est={est}
                      ev={ev}
                      recup={recup}
                      notaOriginal={notaOriginal}
                      estadoOriginal={estadoOriginal}
                      notaRecup={notaRecup}
                      estadoRecup={estadoRecup}
                      onOpenEditNota={onOpenEditNota}
                      onQuickSetGrade={onQuickSetGrade}
                      density={density}
                      rowIdx={rowIdx}
                      colIdx={colIdx}
                    />
                  );
                })}

                {/* Promedio */}
                <td className="py-2 px-3 text-center font-mono font-bold text-xs text-text-primary">
                  {promedio !== null ? (
                    <span className={`px-2 py-0.5 rounded-lg ${
                      promedio >= 7
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : promedio >= 4
                        ? 'bg-primary/10 text-primary'
                        : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                    }`}>
                      {promedio}
                    </span>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>

                {/* Condición Final Congelada Derecha */}
                <td 
                  className={`sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/80 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.08)] border-l border-slate-200/60 dark:border-white/10 px-2.5 ${
                    isCompact ? 'py-1.5' : 'py-2.5'
                  } text-center w-28 sm:w-32`}
                >
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <ConditionBadge condicion={condicion} isCompact={isCompact} />
                    {condicion?.motivo && (
                      <Tooltip content={condicion.motivo} side="left">
                        <span className="text-[9px] font-mono text-text-muted text-center truncate max-w-[85px] leading-tight cursor-help select-none">
                          {condicion.motivo}
                        </span>
                      </Tooltip>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
