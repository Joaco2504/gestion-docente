import React from 'react';
import { Check, X, Clock, Briefcase } from 'lucide-react';
import Badge from '../../common/Badge';
import { ESTADO_ASISTENCIA } from '../../../lib/enums';

export default function AttendanceDesktopTable({
  filteredAlumnos,
  asistenciasDiaMap,
  asistenciaPorEstudiante,
  onToggleEstado,
  disabled = false
}) {
  return (
    <div className="hidden lg:block overflow-x-auto rounded-2xl border border-surface-border bg-surface">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-surface-border bg-slate-50/50 dark:bg-white/[0.02] text-[11px] font-bold uppercase tracking-wider text-text-muted">
            <th className="py-3 px-4">Estudiante / Legajo</th>
            <th className="py-3 px-4 text-center">Régimen RAM</th>
            <th className="py-3 px-4 text-center">Asistencia Actual</th>
            <th className="py-3 px-4 text-center">Presente</th>
            <th className="py-3 px-4 text-center">Ausente</th>
            <th className="py-3 px-4 text-center">Justificado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border text-sm">
          {filteredAlumnos.map(est => {
            const rawEstado = asistenciasDiaMap instanceof Map
              ? asistenciasDiaMap.get(est.id)
              : (asistenciasDiaMap?.[est.id]?.estado ?? asistenciasDiaMap?.[est.id]);
            const estadoActual = (typeof rawEstado === 'object' ? rawEstado?.estado : rawEstado) || null;
            const isPresente = estadoActual === ESTADO_ASISTENCIA.PRESENTE;
            const isAusente = estadoActual === ESTADO_ASISTENCIA.AUSENTE;
            const isJustificado = estadoActual === ESTADO_ASISTENCIA.JUSTIFICADO;

            const rawStats = asistenciaPorEstudiante instanceof Map
              ? asistenciaPorEstudiante.get(est.id)
              : asistenciaPorEstudiante?.[est.id];
            const pct = typeof rawStats === 'number'
              ? Math.round(rawStats)
              : Math.round(rawStats?.porcentaje ?? 100);
            const presentes = rawStats?.presentes ?? 0;
            const totalClases = rawStats?.totalClases ?? 0;
            const esLaboral = Boolean(est.tiene_certificado_trabajo || rawStats?.esLaboral);
            const umbral = rawStats?.umbralRequerido ?? (esLaboral ? 60 : 70);
            const estaEnRiesgo = rawStats?.enRiesgo ?? (pct < umbral);
            const alBorde = !estaEnRiesgo && (pct - umbral <= 5);

            return (
              <tr key={est.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.01] transition-colors h-12">
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-text-secondary">
                      {(est.nombre || 'A')[0]}{(est.apellido || 'E')[0]}
                    </div>
                    <div>
                      <p className="font-bold text-text-primary text-sm leading-tight">
                        {est.apellido}, {est.nombre}
                      </p>
                      <p className="text-[11px] font-mono text-text-muted mt-0.5">
                        DNI {est.dni || 'S/D'}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="py-3 px-4 text-center">
                  {esLaboral ? (
                    <Badge variant="warning" className="inline-flex items-center gap-1 font-bold text-[10px]">
                      <Briefcase className="w-3 h-3" />
                      <span>Laboral (60%)</span>
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-text-muted">
                      Regular (70%)
                    </Badge>
                  )}
                </td>

                <td className="py-3 px-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className={`font-mono font-bold text-sm ${
                        estaEnRiesgo
                          ? 'text-rose-600 dark:text-rose-400 font-black'
                          : alBorde
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {pct}%
                      </span>
                      <span className="text-[10px] font-mono text-text-muted">
                        ({presentes}/{totalClases})
                      </span>
                    </div>
                    <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          estaEnRiesgo 
                            ? 'bg-rose-500' 
                            : alBorde 
                            ? 'bg-amber-500' 
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                  </div>
                </td>

                <td className="py-3 px-4 text-center">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onToggleEstado(est.id, ESTADO_ASISTENCIA.PRESENTE)}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer min-h-[38px] ${
                      isPresente
                        ? 'bg-emerald-500 text-white shadow-xs font-black'
                        : 'bg-slate-100 dark:bg-slate-800 text-text-muted hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Presente</span>
                  </button>
                </td>

                <td className="py-3 px-4 text-center">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onToggleEstado(est.id, ESTADO_ASISTENCIA.AUSENTE)}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer min-h-[38px] ${
                      isAusente
                        ? 'bg-rose-600 text-white shadow-xs font-black'
                        : 'bg-slate-100 dark:bg-slate-800 text-text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Ausente</span>
                  </button>
                </td>

                <td className="py-3 px-4 text-center">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onToggleEstado(est.id, ESTADO_ASISTENCIA.JUSTIFICADO)}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer min-h-[38px] ${
                      isJustificado
                        ? 'bg-amber-500 text-white shadow-xs font-black'
                        : 'bg-slate-100 dark:bg-slate-800 text-text-muted hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Justificado</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
