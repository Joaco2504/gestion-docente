import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

/**
 * RiskBadge - Badge semántico pulsante con tooltip interactivo del Semáforo de Riesgo.
 * 
 * @param {Object} risk - Objeto de riesgo devuelto por calculateStudentRisk
 * @param {boolean} compact - Si es true muestra versión circular compacta
 * @param {string} className - Clases CSS adicionales
 */
export default function RiskBadge({ risk, compact = false, className = '' }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!risk) return null;

  const isCritical = risk.level === 'CRITICAL';
  const isWarning = risk.level === 'WARNING';
  const isOptimal = risk.level === 'OPTIMAL';

  const config = isCritical ? {
    bg: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25 dark:border-rose-500/30',
    pingBg: 'bg-rose-500',
    dotBg: 'bg-rose-600 dark:bg-rose-500',
    icon: ShieldAlert,
    label: risk.badgeLabel || 'Riesgo Crítico'
  } : isWarning ? {
    bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25 dark:border-amber-500/30',
    pingBg: 'bg-amber-500',
    dotBg: 'bg-amber-500',
    icon: AlertCircle,
    label: risk.badgeLabel || 'En Observación'
  } : {
    bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 dark:border-emerald-500/30',
    pingBg: 'bg-emerald-400',
    dotBg: 'bg-emerald-500',
    icon: CheckCircle2,
    label: risk.badgeLabel || 'Óptimo'
  };

  const Icon = config.icon;

  return (
    <div 
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={(e) => {
        e.stopPropagation();
        setShowTooltip(!showTooltip);
      }}
    >
      {compact ? (
        <button
          type="button"
          aria-label={config.label}
          className="relative p-1 rounded-full hover:scale-110 transition-transform cursor-pointer focus:outline-none"
        >
          {/* Pulsing Beacon */}
          {(isCritical || isWarning) && (
            <span className="absolute inset-0.5 rounded-full animate-ping opacity-75 inline-flex"
              style={{ backgroundColor: isCritical ? '#f43f5e' : '#f59e0b' }}
            />
          )}
          <span className={`relative block w-2.5 h-2.5 rounded-full ${config.dotBg}`} />
        </button>
      ) : (
        <div 
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer select-none shadow-xs ${config.bg}`}
        >
          {/* Pulsing Beacon dot */}
          <span className="relative flex h-2 w-2 shrink-0">
            {(isCritical || isWarning) && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.pingBg}`} />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotBg}`} />
          </span>

          <Icon className="w-3 h-3 shrink-0" />
          <span>{config.label}</span>
        </div>
      )}

      {/* Tooltip flotante interactivo */}
      {showTooltip && (
        <div 
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-64 p-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-white/15 shadow-xl text-left text-xs space-y-1.5 animate-fadeIn pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-white/10">
            <span className="font-bold flex items-center gap-1.5 text-text-primary">
              <Icon className="w-3.5 h-3.5 text-primary" />
              <span>{config.label}</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-text-muted">
              {risk.asistPct !== undefined ? `${risk.asistPct}% Asist.` : ''}
            </span>
          </div>

          <div className="space-y-1 text-text-secondary text-[11px]">
            {risk.reasons && risk.reasons.length > 0 ? (
              risk.reasons.map((r, i) => (
                <div key={i} className="flex items-start gap-1.5 leading-snug">
                  <span className="text-primary font-bold">•</span>
                  <span>{r}</span>
                </div>
              ))
            ) : (
              <p>{risk.primaryReason || 'Sin alertas pedagógicas registradas.'}</p>
            )}
          </div>

          {/* Flechita decorativa del tooltip */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-white dark:bg-slate-900 border-r border-b border-slate-200 dark:border-white/15 transform rotate-45 -mt-1" />
        </div>
      )}
    </div>
  );
}
