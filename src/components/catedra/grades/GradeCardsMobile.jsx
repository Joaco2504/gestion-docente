import React, { useState, useMemo } from 'react';
import Badge from '../../common/Badge';
import RiskBadge from '../../common/RiskBadge';
import { ConditionBadge, isParcialOrRecupEval, isTpEval } from './GradeMatrixTable';
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
  recuperatorioEval = null,
  regimen = 'CUATRIMESTRAL',
  getNotaValue,
  getNotaEstado,
  onOpenEditNota,
  onOpenConfigurarRecuperatorio,
  onQuickSetGrade,
  onSelectCondicionManual,
  mostrarParciales = true,
  mostrarTps = true,
  mostrarPromedio = true
}) {
  const [expandedId, setExpandedId] = useState(null);

  const visibleMainEvaluations = useMemo(() => {
    return (mainEvaluations || []).filter(Boolean).filter(ev => {
      if (isParcialOrRecupEval(ev)) return mostrarParciales;
      if (isTpEval(ev)) return mostrarTps;
      return mostrarParciales || mostrarTps;
    });
  }, [mainEvaluations, mostrarParciales, mostrarTps]);

  if (studentRows.length === 0) {
    return (
      <div className="p-8 text-center bg-white/70 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-white/10">
        <p className="text-xs text-text-muted">No hay estudiantes en la nómina.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
      {studentRows.map((row, idx) => {
        const { estudiante: est, promedio, condicion, condicionAutomatica, risk, asistPct } = row;
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
                <ConditionBadge
                  condicion={condicion}
                  condicionAutomatica={condicionAutomatica}
                  estudiante={est}
                  asistPct={asistPct}
                  onSelectCondicionManual={onSelectCondicionManual}
                  disabled={!onSelectCondicionManual}
                />
              </div>
            </div>

            {/* Micro-KPIs: Promedio y Asistencia */}
            <div className={`grid ${mostrarPromedio ? 'grid-cols-2' : 'grid-cols-1'} gap-2 pt-2 border-t border-slate-100 dark:border-white/5`}>
              {mostrarPromedio && (
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
              )}

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
                <span>Evaluaciones ({visibleMainEvaluations.length})</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded && (
                <div className="space-y-2 pt-1 animate-fadeIn">
                  {visibleMainEvaluations.map(ev => {
                    const infoEfectiva = row.notasEfectivasMap?.get(String(ev.id));
                    const recup = evaluaciones.find(
                      r => String(r.tipo || '').toUpperCase().includes('RECUP') && r.evaluacion_origen_id === ev.id
                    );
                    const nota = getNotaValue(est.id, ev.id);
                    const estado = getNotaEstado(est.id, ev.id);
                    const notaRecup = recup ? getNotaValue(est.id, recup.id) : null;
                    const estadoRecup = recup ? getNotaEstado(est.id, recup.id) : null;
                    const evalTitulo = ev?.titulo || ev?.nombre || 'Evaluación';

                    return (
                      <div key={ev.id} className="space-y-1.5">
                        <div
                          onClick={() => onOpenEditNota && onOpenEditNota({
                            estudianteId: est.id,
                            evaluacionId: ev.id,
                            nombreEstudiante: `${est.apellido}, ${est.nombre}`,
                            nombreEvaluacion: evalTitulo,
                            est,
                            ev
                          })}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px]"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="text-xs font-bold text-text-primary block truncate">
                              {evalTitulo}
                            </span>
                            <span className="text-[10px] text-text-muted uppercase">
                              {ev.tipo || 'Evaluación'}
                            </span>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {infoEfectiva?.reemplazada ? (
                              <div className="flex items-center gap-1.5">
                                <span className="line-through text-text-muted text-[11px] opacity-60">
                                  {nota}
                                </span>
                                <span className="px-2 py-1 rounded-lg text-xs font-mono font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                  ➔ {infoEfectiva.notaRecup}
                                  <span className="text-[9px] font-black uppercase text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 px-1 py-0.2 rounded">
                                    R
                                  </span>
                                </span>
                              </div>
                            ) : estado === 'NO_ENTREGO' ? (
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

                        {recup && mostrarParciales && (
                          <div
                            onClick={() => onOpenEditNota && onOpenEditNota({
                              estudianteId: est.id,
                              evaluacionId: recup.id,
                              nombreEstudiante: `${est.apellido}, ${est.nombre}`,
                              nombreEvaluacion: recup.titulo || recup.nombre || `Recuperatorio de ${evalTitulo}`,
                              est,
                              ev: recup
                            })}
                            className="flex items-center justify-between px-3 py-2 ml-3 rounded-xl border border-purple-300/60 dark:border-purple-800/50 bg-purple-50/40 dark:bg-purple-950/20 hover:bg-purple-100/50 dark:hover:bg-purple-900/30 transition-colors cursor-pointer min-h-[40px]"
                          >
                            <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 truncate pr-2">
                              ↳ {recup.titulo || `Recup. ${evalTitulo}`}
                            </span>
                            <div className="shrink-0 flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-white/80 dark:bg-slate-900 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                {estadoRecup === 'AUSENTE' ? 'R:Aus.' : estadoRecup === 'NO_ENTREGO' ? 'R:N/E' : notaRecup !== null ? `R:${notaRecup}` : 'R:—'}
                              </span>
                              <Edit3 className="w-3 h-3 text-purple-500" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Fila Dedicada: Recuperatorio General Diferenciado */}
                  {mostrarParciales && (() => {
                    const parcialesList = mainEvaluations.filter(e => {
                      const t = String(e.tipo || '').toUpperCase();
                      return t === 'PARCIAL' || t.includes('PARCIAL') || t === 'PRUEBA';
                    });
                    let detalleRecup = null;
                    const recupNota = row.notas?.find(n => {
                      if (n.detalle_recuperatorio && Array.isArray(n.detalle_recuperatorio) && n.detalle_recuperatorio.length > 0) return true;
                      if (recuperatorioEval && n.evaluacion_id === recuperatorioEval.id) return true;
                      return false;
                    });
                    if (recupNota?.detalle_recuperatorio && Array.isArray(recupNota.detalle_recuperatorio)) {
                      detalleRecup = recupNota.detalle_recuperatorio;
                    } else if (recupNota?.observaciones && typeof recupNota.observaciones === 'string' && recupNota.observaciones.trim().startsWith('[')) {
                      try { detalleRecup = JSON.parse(recupNota.observaciones); } catch(_) {}
                    }

                    const desaprobados = parcialesList.filter(p => {
                      const val = getNotaValue(est.id, p.id);
                      const estVal = getNotaEstado(est.id, p.id);
                      return estVal === 'AUSENTE' || estVal === 'NO_ENTREGO' || (val !== null && val !== undefined && Number(val) < 4);
                    });
                    const isAnual = String(regimen || '').toUpperCase().includes('ANUAL');
                    const maxPermitido = isAnual ? 2 : 1;

                    return (
                      <div className="pt-2 border-t border-purple-200/50 dark:border-purple-800/30">
                        <div
                          onClick={() => onOpenConfigurarRecuperatorio && onOpenConfigurarRecuperatorio(est)}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-purple-300/60 dark:border-purple-800/50 bg-purple-50/40 dark:bg-purple-950/20 hover:bg-purple-100/50 dark:hover:bg-purple-900/30 transition-colors cursor-pointer min-h-[44px]"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="text-xs font-bold text-purple-900 dark:text-purple-200 block truncate">
                              Recuperatorio General
                            </span>
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold uppercase">
                              {desaprobados.length > maxPermitido
                                ? 'Excede límite (Libre)'
                                : detalleRecup?.length > 0
                                ? `${detalleRecup.length} parcial(es) configurado(s)`
                                : desaprobados.length > 0
                                ? `${desaprobados.length} parcial(es) a recuperar`
                                : 'No requiere recuperatorio'}
                            </span>
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5">
                            {desaprobados.length > maxPermitido ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300">
                                Libre
                              </span>
                            ) : detalleRecup && detalleRecup.length > 0 ? (
                              <div className="flex items-center gap-1 flex-wrap">
                                {detalleRecup.map((d, dIdx) => {
                                  const shortTitle = (d.titulo || `P${dIdx + 1}`).replace(/parcial/i, 'P').replace(/°/g, '').trim();
                                  const val = d.nota_recuperatorio ?? d.valor ?? d.nota;
                                  return (
                                    <span key={d.evaluacion_id || dIdx} className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/80 dark:bg-slate-900 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                      {shortTitle}: {val !== null && val !== undefined && val !== '' ? val : (d.estado || 'Pend')}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : desaprobados.length > 0 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                                + Configurar
                              </span>
                            ) : (
                              <span className="text-xs font-mono text-text-muted px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                —
                              </span>
                            )}
                            <Edit3 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
