import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import GradeCell from '../GradeCell';
import GradesHeaderColumn from './GradesHeaderColumn';
import Badge from '../../common/Badge';
import Tooltip from '../../common/Tooltip';
import RiskBadge from '../../common/RiskBadge';
import { Plus, Users, Check, RotateCcw, X } from 'lucide-react';
import Button from '../../common/Button';

/**
 * Helper para formatear código corto y nombre legible de una condición
 */
export function getConditionMeta(rawCondInput, subcondicion = null) {
  const rawCond = String(rawCondInput || 'EN_CURSO').toUpperCase();

  if (rawCond === 'PROMOCION_INDIRECTA' || (rawCond === 'PROMOCIONAL' && subcondicion === 'INDIRECTA')) {
    return {
      code: 'PROMOCION_INDIRECTA',
      label: 'PROM. IND',
      fullTitle: 'Promoción Indirecta',
      variant: 'promo_ind'
    };
  }
  if (rawCond === 'PROMOCIONAL' || rawCond === 'PROMO') {
    return {
      code: 'PROMOCIONAL',
      label: 'PROM. DIR',
      fullTitle: 'Promoción Directa',
      variant: 'promo'
    };
  }
  if (rawCond === 'REGULAR' || rawCond === 'REG') {
    return {
      code: 'REGULAR',
      label: 'REG',
      fullTitle: 'Alumno Regular',
      variant: 'regular'
    };
  }
  if (rawCond === 'RECUPERATORIO' || rawCond === 'REC') {
    return {
      code: 'RECUPERATORIO',
      label: 'A RECUP.',
      fullTitle: 'Debe Recuperar Parcial(es)',
      variant: 'warning'
    };
  }
  if (rawCond === 'LIBRE' || rawCond === 'LIB') {
    return {
      code: 'LIBRE',
      label: 'LIB',
      fullTitle: 'Condición Libre',
      variant: 'libre'
    };
  }
  if (rawCond === 'ACREDITADA_EQUIVALENCIA' || rawCond === 'EQUIVALENCIA' || rawCond === 'EQUIV') {
    return {
      code: 'ACREDITADA_EQUIVALENCIA',
      label: 'EQUIV',
      fullTitle: 'Acreditada por Equivalencia',
      variant: 'promo'
    };
  }

  return {
    code: rawCond,
    label: 'CURSO',
    fullTitle: 'En Cursado Activo',
    variant: 'default'
  };
}

/**
 * ConditionBadge Interactivo con Popover de Override Manual / Automático
 */
export function ConditionBadge({
  condicion,
  condicionAutomatica,
  estudiante,
  asistPct,
  onSelectCondicionManual,
  disabled = false,
  isCompact = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [motivoInput, setMotivoInput] = useState(
    condicion?.motivoManual || estudiante?.motivo_condicion_manual || ''
  );
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const effectiveMeta = getConditionMeta(condicion?.condicion, condicion?.subcondicion);
  const autoObj = condicionAutomatica || condicion?.condicionAutomatica || condicion;
  const autoMeta = getConditionMeta(autoObj?.condicion, autoObj?.subcondicion);

  const isManual = Boolean(
    condicion?.esManual ||
    (estudiante?.condicion_manual && estudiante.condicion_manual !== 'AUTO')
  );
  const currentManualVal = condicion?.condicionManual || estudiante?.condicion_manual || null;

  useEffect(() => {
    setMotivoInput(condicion?.motivoManual || estudiante?.motivo_condicion_manual || '');
  }, [condicion?.motivoManual, estudiante?.motivo_condicion_manual, isOpen]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popWidth = 320;
    const popHeight = 390;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.right - popWidth;
    if (left < 12) left = 12;
    if (left + popWidth > vw - 12) left = vw - popWidth - 12;

    let top = rect.bottom + 8;
    if (top + popHeight > vh - 12) {
      top = Math.max(12, rect.top - popHeight - 8);
    }

    setCoords({ top, left });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const handleScrollOrResize = () => updatePosition();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updatePosition]);

  const tooltipText = isManual
    ? `Condición fijada manualmente por el docente: ${effectiveMeta.code} (Cálculo automático: ${autoMeta.code}).${
        condicion?.motivoManual ? ` Motivo: ${condicion.motivoManual}.` : ''
      } Clic para volver a automático.`
    : condicion?.motivo
    ? `${effectiveMeta.fullTitle}: ${condicion.motivo} (Clic para ajustar condición)`
    : `${effectiveMeta.fullTitle} (Clic para ajustar condición)`;

  const handleApplyOption = (targetValue) => {
    if (!onSelectCondicionManual || !estudiante?.id) {
      setIsOpen(false);
      return;
    }
    onSelectCondicionManual(estudiante.id, targetValue, targetValue ? motivoInput : '');
    setIsOpen(false);
  };

  const options = [
    {
      value: null,
      icon: '⚡',
      label: 'Automático (Según parámetros de la cátedra)',
      sublabel: `Sugerido: ${autoMeta.label}`
    },
    {
      value: 'PROMOCIONAL',
      icon: '✋',
      label: 'Fijar manualmente como Promoción Directa',
      badge: 'PROM. DIR',
      badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
    },
    {
      value: 'PROMOCION_INDIRECTA',
      icon: '✋',
      label: 'Fijar manualmente como Promoción Indirecta',
      badge: 'PROM. IND',
      badgeClass: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30'
    },
    {
      value: 'REGULAR',
      icon: '✋',
      label: 'Fijar manualmente como Regular',
      badge: 'REGULAR',
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
    },
    {
      value: 'LIBRE',
      icon: '✋',
      label: 'Fijar manualmente como Libre',
      badge: 'LIBRE',
      badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
    }
  ];

  return (
    <>
      <Tooltip content={tooltipText} side="left">
        <button
          ref={triggerRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (disabled || estudiante?.es_equivalencia) return;
            setIsOpen(prev => !prev);
          }}
          className={`inline-flex items-center gap-1 rounded-full transition-all select-none ${
            !disabled && !estudiante?.es_equivalencia
              ? 'cursor-pointer hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/40'
              : 'cursor-help'
          } ${
            isManual
              ? 'ring-2 ring-amber-500/60 dark:ring-amber-400/60 ring-offset-1 dark:ring-offset-slate-900 rounded-full'
              : ''
          }`}
        >
          <Badge
            variant={effectiveMeta.variant}
            className={`font-black tracking-wider uppercase font-mono inline-flex items-center gap-1 ${
              isCompact ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'
            }`}
          >
            {isManual && (
              <span title="Condición fijada manualmente" className="text-[10px] leading-none">
                ✋
              </span>
            )}
            <span>{effectiveMeta.label}</span>
          </Badge>
        </button>
      </Tooltip>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-50"
          onClick={() => setIsOpen(false)}
        >
          <div
            ref={popoverRef}
            style={{ top: `${coords.top}px`, left: `${coords.left}px`, width: '320px' }}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-3.5 space-y-3 animate-fadeIn text-left"
          >
            {/* Cabecera con Sugerencia Automática */}
            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 dark:text-slate-500 block truncate">
                  {estudiante ? `${estudiante.apellido}, ${estudiante.nombre}` : 'Condición Académica'}
                </span>
                <div className="mt-1 p-2 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100">
                      🤖 Sugerencia Automática:
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-emerald-600 text-white">
                      {autoMeta.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                    {autoObj?.motivo || `Asistencia ${asistPct ?? 100}%`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Campo opcional de motivo antes o al seleccionar */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Motivo de ajuste manual (opcional)
              </label>
              <input
                type="text"
                value={motivoInput}
                onChange={(e) => setMotivoInput(e.target.value)}
                placeholder="Ej: Justificación médica / Acta especial..."
                className="w-full px-2.5 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            {/* Lista de Opciones de Condición */}
            <div className="space-y-1">
              {options.map((opt) => {
                const isSelected = opt.value === null
                  ? !isManual
                  : isManual && String(currentManualVal).toUpperCase() === opt.value;

                return (
                  <button
                    key={opt.value || 'AUTO'}
                    type="button"
                    onClick={() => handleApplyOption(opt.value)}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left border ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                        : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm shrink-0">{opt.icon}</span>
                      <div className="min-w-0">
                        <span className="block truncate leading-tight">{opt.label}</span>
                        {opt.sublabel && (
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block">
                            {opt.sublabel}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {opt.badge && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-black border ${opt.badgeClass}`}>
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

/**
 * Helper para clasificar una evaluación como Parcial/Recuperatorio o TP
 */
export function isParcialOrRecupEval(ev) {
  const t = String(ev?.tipo || '').toUpperCase();
  return (
    t === 'PARCIAL' ||
    t === 'RECUPERATORIO' ||
    t === 'PRUEBA' ||
    t === 'COLOQUIO' ||
    t.includes('PARCIAL') ||
    t.includes('RECUP')
  );
}

export function isTpEval(ev) {
  const t = String(ev?.tipo || '').toUpperCase();
  return t === 'TP' || t.includes('TRABAJO') || t.includes('PRÁCTICO') || t.includes('PRACTICO');
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
  onSelectCondicionManual,
  mostrarParciales = true,
  mostrarTps = true,
  mostrarPromedio = true,
  density = 'comfortable'
}) {
  const isCompact = density === 'compact';

  // Filtrar columnas de evaluaciones principales según los selectores de visibilidad activos
  const visibleMainEvaluations = useMemo(() => {
    return (mainEvaluations || []).filter(Boolean).filter(ev => {
      if (isParcialOrRecupEval(ev)) return mostrarParciales;
      if (isTpEval(ev)) return mostrarTps;
      return mostrarParciales || mostrarTps;
    });
  }, [mainEvaluations, mostrarParciales, mostrarTps]);

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

  const totalCols =
    1 +
    visibleMainEvaluations.length +
    (mostrarParciales ? 1 : 0) +
    (mostrarPromedio ? 1 : 0) +
    1;

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

            {/* Columnas Dinámicas de Evaluaciones Visibles */}
            {visibleMainEvaluations.map((ev, colIdx) => {
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

            {/* Columna Dedicada: Recuperatorio General Diferenciado (si mostrarParciales está activo) */}
            {mostrarParciales && (
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
            )}

            {/* Columna: Promedio Cursada (si mostrarPromedio está activo) */}
            {mostrarPromedio && (
              <th scope="col" className="py-3 px-3 text-center w-24">
                Promedio
              </th>
            )}

            {/* Columna Sticky Derecha: Condición Final RAM */}
            <th 
              scope="col" 
              className="py-3 px-2.5 sticky right-0 top-0 z-30 bg-slate-50 dark:bg-slate-800/95 backdrop-blur border-l border-slate-200/60 dark:border-white/10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.08)] text-center w-28 sm:w-32"
            >
              Condición Final
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-200/70 dark:divide-white/5">
          {studentRows.length === 0 ? (
            <tr>
              <td colSpan={totalCols} className="py-10 text-center text-xs text-text-muted">
                No se encontraron estudiantes para los criterios de búsqueda.
              </td>
            </tr>
          ) : studentRows.map((row, rowIdx) => {
            const { estudiante: est, promedio, condicion, condicionAutomatica, risk, asistPct } = row;

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

                {/* Celdas Interactivas de Calificación de Evaluaciones Visibles */}
                {visibleMainEvaluations.map((ev, colIdx) => {
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
                {mostrarParciales && (
                  <td className="py-2 px-2 text-center align-middle border-l border-purple-200/50 dark:border-purple-800/30 bg-purple-50/20 dark:bg-purple-950/10">
                    {renderRecuperatorioCell(row)}
                  </td>
                )}

                {/* Promedio */}
                {mostrarPromedio && (
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
                )}

                {/* Condición Final Congelada Derecha (Interactivo con Override Manual/Automático) */}
                <td 
                  className={`sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/80 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.08)] border-l border-slate-200/60 dark:border-white/10 px-2.5 ${
                    isCompact ? 'py-1.5' : 'py-2.5'
                  } text-center w-28 sm:w-32`}
                >
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <ConditionBadge
                      condicion={condicion}
                      condicionAutomatica={condicionAutomatica}
                      estudiante={est}
                      asistPct={asistPct}
                      onSelectCondicionManual={onSelectCondicionManual}
                      disabled={!onSelectCondicionManual}
                      isCompact={isCompact}
                    />
                    {condicion?.motivo && (
                      <Tooltip content={condicion.motivo} side="left">
                        <span className="text-[9px] font-mono text-text-muted text-center truncate max-w-[85px] leading-tight cursor-help select-none">
                          {condicion.esManual ? 'Ajuste manual' : condicion.motivo}
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
