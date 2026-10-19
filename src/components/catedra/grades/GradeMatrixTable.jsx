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

  if (rawCond === 'PROMOCION_INDIRECTA' || (rawCond === 'PROMOCIONAL' && condicion?.subcondicion === 'INDIRECTA')) {
    label = 'PROM. IND';
    fullTitle = 'Promoción Indirecta';
    variant = 'promo_ind';
  } else if (rawCond === 'PROMOCIONAL' || rawCond === 'PROMO') {
    label = 'PROM. DIR';
    fullTitle = 'Promoción Directa';
    variant = 'promo';
  } else if (rawCond === 'REGULAR' || rawCond === 'REG') {
    label = 'REG';
    fullTitle = 'Alumno Regular';
    variant = 'regular';
  } else if (rawCond === 'RECUPERATORIO' || rawCond === 'REC') {
    label = 'A RECUP.';
    fullTitle = 'Debe Recuperar Parcial(es)';
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
  recuperatorioEval = null,
  regimen = 'CUATRIMESTRAL',
  evalMetricsMap = new Map(),
  getNotaValue,
  getNotaEstado,
  onQuickSetGrade,
  onOpenEditNota,
  onOpenNuevaEvaluacion,
  onOpenEditParams,
  onOpenConfigurarRecuperatorio,
  onDeleteEval,
  density = 'comfortable'
}) {
  const isCompact = density === 'compact';

  const getCondBadgeVariant = (cond) => {
    switch (cond) {
      case 'PROMOCIONAL':
      case 'ACREDITADA_EQUIVALENCIA':
        return 'promo';
      case 'PROMOCION_INDIRECTA':
        return 'promo_ind';
      case 'REGULAR':
        return 'regular';
      case 'RECUPERATORIO':
        return 'warning';
      case 'LIBRE':
        return 'libre';
      default:
        return 'default';
    }
  };

  const renderRecuperatorioCell = (row) => {
    const { estudiante: est } = row;
    const parcialesList = mainEvaluations.filter(e => {
      const t = String(e.tipo || '').toUpperCase();
      return t === 'PARCIAL' || t.includes('PARCIAL') || t === 'PRUEBA';
    });

    // Buscar detalle estructurado de recuperatorio cargado para el alumno
    let detalleRecup = null;
    const recupNota = row.notas?.find(n => {
      if (n.detalle_recuperatorio && Array.isArray(n.detalle_recuperatorio) && n.detalle_recuperatorio.length > 0) return true;
      if (recuperatorioEval && n.evaluacion_id === recuperatorioEval.id) return true;
      return false;
    });

    if (recupNota?.detalle_recuperatorio && Array.isArray(recupNota.detalle_recuperatorio)) {
      detalleRecup = recupNota.detalle_recuperatorio;
    } else if (recupNota?.observaciones && typeof recupNota.observaciones === 'string' && recupNota.observaciones.trim().startsWith('[')) {
      try {
        detalleRecup = JSON.parse(recupNota.observaciones);
      } catch (_) {}
    }

    // Parciales desaprobados en 1ra instancia
    const desaprobados = parcialesList.filter(p => {
      const val = getNotaValue(est.id, p.id);
      const estVal = getNotaEstado(est.id, p.id);
      return estVal === 'AUSENTE' || estVal === 'NO_ENTREGO' || (val !== null && val !== undefined && Number(val) < 4);
    });

    const isAnual = String(regimen || '').toUpperCase().includes('ANUAL');
    const maxPermitido = isAnual ? 2 : 1;

    // 1. Excede límite reglamentario de desaprobados -> Alerta Libre
    if (desaprobados.length > maxPermitido) {
      return (
        <Tooltip content={`Excede el cupo: desaprobó ${desaprobados.length} parciales (máx. ${maxPermitido} en régimen ${isAnual ? 'anual' : 'cuatrimestral'}). Condición reglamentaria: LIBRE.`}>
          <button
            type="button"
            onClick={() => onOpenConfigurarRecuperatorio && onOpenConfigurarRecuperatorio(est)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold font-mono bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors shadow-2xs select-none"
          >
            Excede límite (Libre)
          </button>
        </Tooltip>
      );
    }

    // 2. Tiene detalle de recuperatorio configurado (Chips compactos de parciales)
    if (detalleRecup && detalleRecup.length > 0) {
      return (
        <button
          type="button"
          onClick={() => onOpenConfigurarRecuperatorio && onOpenConfigurarRecuperatorio(est)}
          className="inline-flex flex-wrap items-center justify-center gap-1 p-1 rounded-xl hover:bg-purple-100/60 dark:hover:bg-purple-900/40 transition-colors cursor-pointer group"
          title="Clic para editar parciales y calificaciones de recuperatorio"
        >
          {detalleRecup.map((d, dIdx) => {
            const shortTitle = (d.titulo || `P${dIdx + 1}`)
              .replace(/parcial/i, 'P')
              .replace(/°/g, '')
              .trim();
            const val = d.nota_recuperatorio ?? d.valor ?? d.nota;
            const isApr = val !== null && val !== undefined && val !== '' && Number(val) >= 4;
            const isPromo = val !== null && val !== undefined && val !== '' && Number(val) >= 7;

            return (
              <span
                key={d.evaluacion_id || dIdx}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black border transition-all ${
                  val === null || val === undefined || val === ''
                    ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300'
                    : isPromo
                    ? 'bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-200 dark:border-teal-800'
                    : isApr
                    ? 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800'
                    : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800'
                }`}
              >
                {shortTitle}: {val !== null && val !== undefined && val !== '' ? val : (d.estado || 'Pend')}
              </span>
            );
          })}
        </button>
      );
    }

    // 3. Desaprobó parciales dentro del cupo pero aún no configuró recuperatorio
    if (desaprobados.length > 0) {
      return (
        <button
          type="button"
          onClick={() => onOpenConfigurarRecuperatorio && onOpenConfigurarRecuperatorio(est)}
          className="px-2 py-1 rounded-xl text-[10px] font-bold font-mono bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs select-none"
          title={`Debe recuperar ${desaprobados.length} parcial(es). Clic para configurar.`}
        >
          + Configurar ({desaprobados.length})
        </button>
      );
    }

    // 4. No requiere recuperatorio (0 desaprobados)
    return (
      <Tooltip content="No requiere recuperatorio (parciales aprobados en 1ra instancia)">
        <button
          type="button"
          onClick={() => onOpenConfigurarRecuperatorio && onOpenConfigurarRecuperatorio(est)}
          className="text-xs font-mono text-text-muted hover:text-text-primary px-2 py-1 rounded-lg hover:bg-surface-hover cursor-pointer"
        >
          —
        </button>
      </Tooltip>
    );
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
    <div className="overflow-x-auto touch-pan-x touch-pan-y scrollbar-thin rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 shadow-xs max-h-[75vh]">
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
            {mainEvaluations?.filter(Boolean).map((ev, colIdx) => {
              const metrics = evalMetricsMap.get(ev.id);
              return (
                <GradesHeaderColumn 
                  key={ev.id || colIdx}
                  ev={ev}
                  evaluacion={ev}
                  index={colIdx}
                  metrics={metrics}
                  density={density}
                  onEdit={onOpenEditParams}
                  onDeleteRequest={onDeleteEval}
                />
              );
            })}

            {/* Columna Dedicada: Recuperatorio General Diferenciado */}
            <th 
              scope="col" 
              className="py-3 px-3 text-center w-40 bg-purple-50/60 dark:bg-purple-950/30 border-l border-purple-200/60 dark:border-purple-800/40 text-purple-900 dark:text-purple-200"
            >
              <div className="flex flex-col items-center justify-center gap-0.5">
                <span className="font-black text-[11px] tracking-wider uppercase">
                  Recuperatorio
                </span>
                <span className="text-[9px] font-mono text-purple-600 dark:text-purple-300 font-semibold">
                  General (Diferenciado)
                </span>
              </div>
            </th>

            {/* Columna: Promedio Cursada */}
            <th scope="col" className="py-3 px-3 text-center w-24">
              Promedio
            </th>

            {/* Columna Sticky Derecha: Condición RAM */}
            <th 
              scope="col" 
              className="py-3 px-2.5 sticky right-0 top-0 z-30 bg-slate-50 dark:bg-slate-800/95 backdrop-blur border-l border-slate-200/60 dark:border-white/10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.08)] text-center w-28 sm:w-32"
            >
              Condición RAM
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-200/70 dark:divide-white/5">
          {studentRows.length === 0 ? (
            <tr>
              <td colSpan={mainEvaluations.length + 4} className="py-10 text-center text-xs text-text-muted">
                No se encontraron estudiantes para los criterios de búsqueda.
              </td>
            </tr>
          ) : studentRows.map((row, rowIdx) => {
            const { estudiante: est, promedio, condicion, risk, asistPct } = row;

            return (
              <tr 
                key={est.id} 
                className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors h-12"
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

                {/* Celdas Interactivas de Calificación de Evaluaciones Principales */}
                {mainEvaluations.map((ev, colIdx) => {
                  const infoEfectiva = row.notasEfectivasMap?.get(String(ev.id));
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
                      infoEfectiva={infoEfectiva}
                      onOpenEditNota={onOpenEditNota}
                      onQuickSetGrade={onQuickSetGrade}
                      density={density}
                      rowIdx={rowIdx}
                      colIdx={colIdx}
                    />
                  );
                })}

                {/* Celda Columna: Recuperatorio General Diferenciado */}
                <td className="py-2 px-2 text-center align-middle border-l border-purple-200/50 dark:border-purple-800/30 bg-purple-50/20 dark:bg-purple-950/10">
                  {renderRecuperatorioCell(row)}
                </td>

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
