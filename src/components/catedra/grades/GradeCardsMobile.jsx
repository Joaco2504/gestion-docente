import React, { useState } from 'react';
import Badge from '../../common/Badge';
import RiskBadge from '../../common/RiskBadge';
import { 
  FileSpreadsheet, 
  ChevronDown, 
  Edit3, 
  CheckCircle2, 
  AlertCircle,
  Briefcase,
  GraduationCap
} from 'lucide-react';

/**
 * GradeCardsMobile
 * Design Fork táctil (< 1024px) basado en responsive-craft.
 * Tarjetas modulares apiladas con áreas de contacto mínimas de 44x44px.
 */
export default function GradeCardsMobile({
  studentRows = [],
  mainEvaluations = [],
  evaluaciones = [],
  getNotaValue,
  getNotaEstado,
  onOpenEditNota,
  onQuickSetGrade
}) {
  const [expandedId, setExpandedId] = useState(null);

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

  if (studentRows.length === 0) {
    return (
      <div className="p-8 text-center bg-white/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-white/10">
        <p className="text-xs text-text-muted">No hay estudiantes en la nómina.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {studentRows.map((row, idx) => {
        const { estudiante: est, promedio, condicion, risk, asistPct } = row;
        const isExpanded = expandedId === est.id;

        return (
          <div
            key={est.id}
            className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3 transition-all"
          >
            {/* Cabecera de la Tarjeta */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-text-muted">#{idx + 1}</span>
                  <h4 className="font-bold text-sm text-text-primary truncate" title={`${est.apellido}, ${est.nombre}`}>
                    {est.apellido}, {est.nombre}
                  </h4>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted font-mono mt-0.5">
                  <span>DNI {est.dni || 'S/D'}</span>
                  {est.tiene_certificado_trabajo && (
                    <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      Cert. 60%
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {risk && <RiskBadge risk={risk} compact />}
                <Badge variant={getCondBadgeVariant(condicion?.condicion)}>
                  {condicion?.condicion === 'ACREDITADA_EQUIVALENCIA' ? 'EQUIVALENCIA' : condicion?.condicion || 'EN CURSO'}
                </Badge>
              </div>
            </div>

            {/* Micro-KPIs: Promedio y Asistencia */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] font-bold uppercase text-text-muted block">Promedio</span>
                <span className={`text-sm font-black font-mono ${
                  promedio !== null && promedio >= 7
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : promedio !== null && promedio >= 4
                    ? 'text-primary'
                    : 'text-text-muted'
                }`}>
                  {promedio !== null ? promedio : '—'}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] font-bold uppercase text-text-muted block">Asistencia</span>
                <span className={`text-sm font-black font-mono ${
                  asistPct >= (est.tiene_certificado_trabajo ? 60 : 70)
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {asistPct}%
                </span>
              </div>
            </div>

            {/* Píldoras Rápidas de Evaluaciones */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : est.id)}
                className="w-full flex items-center justify-between text-xs font-semibold text-text-muted hover:text-text-primary py-1.5 cursor-pointer touch-target-44"
              >
                <span>Evaluaciones ({mainEvaluations.length})</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded && (
                <div className="space-y-2 pt-1 animate-fadeIn">
                  {mainEvaluations.map(ev => {
                    const recup = evaluaciones.find(
                      r => String(r.tipo || '').toUpperCase().includes('RECUP') && r.evaluacion_origen_id === ev.id
                    );
                    const nota = getNotaValue(est.id, ev.id);
                    const estado = getNotaEstado(est.id, ev.id);

                    return (
                      <div
                        key={ev.id}
                        onClick={() => onOpenEditNota && onOpenEditNota({
                          estudianteId: est.id,
                          evaluacionId: ev.id,
                          nombreEstudiante: `${est.apellido}, ${est.nombre}`,
                          nombreEvaluacion: ev.nombre
                        })}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px]"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-text-primary block truncate">
                            {ev.nombre}
                          </span>
                          <span className="text-[10px] text-text-muted uppercase">
                            {ev.tipo || 'Evaluación'}
                          </span>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {estado === 'NO_ENTREGO' ? (
                            <span className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                              N/E
                            </span>
                          ) : estado === 'AUSENTE' ? (
                            <span className="px-2 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                              Aus.
                            </span>
                          ) : nota !== null ? (
                            <span className={`px-2 py-1 rounded-lg text-xs font-mono font-black ${
                              Number(nota) >= 7
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                                : Number(nota) >= 4
                                ? 'bg-primary/15 text-primary border border-primary/30'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                            }`}>
                              {nota}
                            </span>
                          ) : (
                            <span className="text-xs font-mono text-text-muted px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                              —
                            </span>
                          )}
                          <Edit3 className="w-3.5 h-3.5 text-text-muted" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
