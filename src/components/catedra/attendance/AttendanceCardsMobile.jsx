import React from 'react';
import Badge from '../../common/Badge';
import RiskBadge from '../../common/RiskBadge';
import { 
  Check, 
  X, 
  Clock, 
  Briefcase, 
  GraduationCap,
  Users
} from 'lucide-react';
import { ESTADO_ASISTENCIA } from '../../../lib/enums';

/**
 * AttendanceCardsMobile
 * Design Fork táctil (< 1024px) para toma de asistencia móvil.
 * Botones ergonómicos con áreas mínimas de contacto de 44x44px y umbral adaptativo (60% vs 70%).
 */
export default function AttendanceCardsMobile({
  alumnosElegibles = [],
  asistenciasDiaMap = new Map(),
  asistenciaPorEstudiante = new Map(),
  onToggleEstado,
  disabled = false
}) {
  if (alumnosElegibles.length === 0) {
    return (
      <div className="p-8 text-center bg-white/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-white/10">
        <Users className="w-8 h-8 mx-auto text-text-muted/40 mb-2" />
        <p className="text-xs text-text-muted">No hay estudiantes activos para la toma de asistencia.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alumnosElegibles.map((est, idx) => {
        const rawEstado = asistenciasDiaMap instanceof Map 
          ? asistenciasDiaMap.get(est.id) 
          : asistenciasDiaMap?.[est.id];
        const estadoActual = (typeof rawEstado === 'object' ? rawEstado?.estado : rawEstado) || null;

        const rawStats = asistenciaPorEstudiante instanceof Map
          ? asistenciaPorEstudiante.get(est.id)
          : asistenciaPorEstudiante?.[est.id];
        const asistPct = typeof rawStats === 'number'
          ? Math.round(rawStats)
          : Math.round(rawStats?.porcentaje ?? 100);
        const presentes = rawStats?.presentes ?? 0;
        const totalClases = rawStats?.totalClases ?? 0;
        const minThreshold = rawStats?.umbralRequerido ?? (est.tiene_certificado_trabajo ? 60 : 70);
        const estaEnRiesgo = rawStats?.enRiesgo ?? (asistPct < minThreshold);
        const alBorde = !estaEnRiesgo && (asistPct - minThreshold <= 5);
        const initials = `${est.nombre?.[0] || ''}${est.apellido?.[0] || ''}`.toUpperCase();

        const isPresente = estadoActual === ESTADO_ASISTENCIA.PRESENTE;
        const isAusente = estadoActual === ESTADO_ASISTENCIA.AUSENTE;
        const isJustificado = estadoActual === ESTADO_ASISTENCIA.JUSTIFICADO;

        return (
          <div
            key={est.id}
            className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3 transition-all"
          >
            {/* Cabecera del Alumno */}
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-mono font-bold text-xs flex items-center justify-center shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-text-primary truncate" title={`${est.apellido}, ${est.nombre}`}>
                    {est.apellido}, {est.nombre}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-text-muted font-mono mt-0.5">
                    <span>DNI {est.dni || 'S/D'}</span>
                    {est.tiene_certificado_trabajo && (
                      <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        💼 60%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Porcentaje y Barra Adaptativa */}
              <div className="text-right shrink-0">
                <div className="flex items-baseline justify-end gap-1">
                  <span className={`text-base font-black font-mono block ${
                    estaEnRiesgo
                      ? 'text-rose-600 dark:text-rose-400'
                      : alBorde
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {asistPct}%
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">
                    ({presentes}/{totalClases})
                  </span>
                </div>
                <span className="text-[10px] text-text-muted block mt-0.5">
                  Meta {minThreshold}%
                </span>
              </div>
            </div>

            {/* Barra Visual de Progreso Adaptativo */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  estaEnRiesgo
                    ? 'bg-rose-500'
                    : alBorde
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, asistPct))}%` }}
              />
            </div>

            {/* Botonera Táctil de 3 Estados (Min. 44x44px) */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {/* Botón Presente */}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onToggleEstado(est.id, ESTADO_ASISTENCIA.PRESENTE)}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold text-xs min-h-[44px] transition-all cursor-pointer ${
                  isPresente
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-black'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-text-muted hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                }`}
              >
                <Check className="w-4 h-4 shrink-0" />
                <span>Presente</span>
              </button>

              {/* Botón Ausente */}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onToggleEstado(est.id, ESTADO_ASISTENCIA.AUSENTE)}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold text-xs min-h-[44px] transition-all cursor-pointer ${
                  isAusente
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30 font-black'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                }`}
              >
                <X className="w-4 h-4 shrink-0" />
                <span>Ausente</span>
              </button>

              {/* Botón Justificado */}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onToggleEstado(est.id, ESTADO_ASISTENCIA.JUSTIFICADO)}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold text-xs min-h-[44px] transition-all cursor-pointer ${
                  isJustificado
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30 font-black'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-text-muted hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                }`}
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Justif.</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
