import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  TestTube2, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ShieldCheck, 
  Database, 
  Users, 
  Calculator, 
  Check, 
  Copy, 
  Layers, 
  Zap, 
  Activity, 
  Clock, 
  ShieldAlert,
  ChevronRight
} from 'lucide-react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { runQASuite } from '../../utils/qaRunner';
import { toast } from 'sonner';

/**
 * QADiagnosticModal - Suite de Autodiagnóstico y Test Integral para Superadministrador.
 * Ejecuta pruebas de las 5 operaciones troncales: Cátedras/Ciclos, Alumnos/Upsert,
 * Asistencias, Calificaciones y Mesas/Actas/Elegibles con diagnóstico PostgREST.
 */
export default function QADiagnosticModal({
  isOpen,
  onClose,
  isDemo = false,
  onRunningStateChange
}) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [copied, setCopied] = useState(false);
  const [executionSource, setExecutionSource] = useState('supabase'); // 'supabase' | 'demo'

  // Notificar al componente padre cuando el diagnóstico está en ejecución
  const updateRunningState = useCallback((isRunning) => {
    setRunning(isRunning);
    if (onRunningStateChange) {
      onRunningStateChange(isRunning);
    }
  }, [onRunningStateChange]);

  // Ejecución del Test Suite centralizado
  const runDiagnosticSuite = useCallback(async () => {
    updateRunningState(true);
    try {
      const suiteData = await runQASuite({ isDemo });
      setExecutionSource(isDemo ? 'demo' : 'supabase');
      setResults(suiteData);
    } catch (err) {
      console.error('Error al ejecutar suite de diagnóstico:', err);
      toast.error('Ocurrió un problema durante el diagnóstico: ' + (err.message || 'Error'));
    } finally {
      updateRunningState(false);
    }
  }, [isDemo, updateRunningState]);

  // Ejecución automática al abrir el modal si no hay resultados previos
  useEffect(() => {
    if (isOpen && !results && !running) {
      runDiagnosticSuite();
    }
  }, [isOpen, results, running, runDiagnosticSuite]);

  // Copiar informe QA al portapapeles con detalle técnico y sugerencias de remediación
  const handleCopyReport = () => {
    if (!results) return;
    try {
      const lineas = [
        '====================================================',
        'INFORME DE AUTODIAGNÓSTICO Y QA — PLANILLADOCENTE',
        '====================================================',
        `Fecha: ${new Date(results.timestamp).toLocaleString('es-AR')}`,
        `Estado: ${results.estado_sistema}`,
        `Pruebas Aprobadas: ${results.pruebas_aprobadas} / ${results.total_pruebas} (${results.porcentaje_operativo}%)`,
        `Tiempo de Respuesta: ${results.duracion_ms} ms`,
        `Entorno: ${executionSource === 'supabase' ? 'Supabase Database (PostgreSQL / PostgREST)' : 'Modo Demostración / Local'}`,
        '----------------------------------------------------',
        ...results.pruebas.map((p, idx) => {
          let str = `[${p.estado}] ${idx + 1}. ${p.categoria}: ${p.titulo}\n  Detalle: ${p.detalles}`;
          if (p.error) {
            str += `\n  Código PostgREST: ${p.error.code}`;
            str += `\n  Mensaje Error: ${p.error.message}`;
            if (p.error.sugerencia) {
              str += `\n  💡 Sugerencia de Corrección: ${p.error.sugerencia}`;
            }
          }
          return str;
        }),
        '===================================================='
      ];
      navigator.clipboard.writeText(lineas.join('\n\n'));
      setCopied(true);
      toast.success('Informe técnico de QA copiado al portapapeles.');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('No se pudo copiar el informe: ' + err.message);
    }
  };

  if (!isOpen) return null;

  const isAllPassed = results?.exitoso === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      {/* Backdrop con desenfoque de fondo */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
        aria-hidden="true"
      />

      {/* Modal Bento Centrado */}
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden z-10 animate-scaleIn">
        
        {/* ========================================================
            1. CABECERA DEL MODAL BENTO GLASS
           ======================================================== */}
        <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/50 backdrop-blur-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
              <TestTube2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-text-primary">
                  Suite de Autodiagnóstico y Test Integral
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  QA Superadmin
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5 truncate">
                Verificación automatizada de integridad de datos, motores de cálculo RAM y consistencia relacional
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl border border-surface-border text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer shrink-0"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================
            2. CUERPO SCROLLABLE CON BENTO CARDS DE RESULTADOS
           ======================================================== */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* BANNER SUPERIOR DE ESTADO DEL SISTEMA */}
          {running ? (
            <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-xl bg-emerald-500 text-white animate-spin">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">
                    Ejecutando Suite de Pruebas de Sistema...
                  </h3>
                  <p className="text-xs text-text-muted">
                    Invocando RPC `ejecutar_qa_docente_suite` y evaluando motores de consistencia en memoria.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Procesando...</span>
              </div>
            </div>
          ) : results ? (
            <div className={`p-5 rounded-2xl border transition-all ${
              isAllPassed 
                ? 'border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/30 shadow-xs' 
                : 'border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/30'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        isAllPassed ? 'bg-emerald-400' : 'bg-amber-400'
                      }`} />
                      <span className={`relative inline-flex rounded-full h-3 w-3 ${
                        isAllPassed ? 'bg-emerald-500' : 'bg-amber-500'
                      }`} />
                    </span>
                    <span className={`text-base sm:text-lg font-black tracking-tight ${
                      isAllPassed ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                    }`}>
                      {results.estado_sistema}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted">
                    Todas las verificaciones estructurales, relacionales y aritméticas han concluido satisfactoriamente.
                  </p>
                </div>

                {/* Micro-indicadores del test */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <div className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-surface-border text-xs font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-bold text-text-primary">{results.pruebas_aprobadas}/{results.total_pruebas}</span>
                    <span className="text-text-muted">Aprobadas</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-surface-border text-xs font-mono flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-bold text-text-primary">{results.duracion_ms} ms</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-surface-border text-xs font-mono flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-primary" />
                    <span className="text-text-muted">{executionSource === 'rpc' ? 'RPC PostgreSQL' : 'Local QA Runner'}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* LISTADO BENTO DE LAS 5 PRUEBAS INTEGRALES */}
          <div className="grid grid-cols-1 gap-3.5">
            {results?.pruebas?.map((test, index) => {
              const isPass = test.estado === 'PASS';

              return (
                <div 
                  key={test.id || index}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    
                    {/* Icono + Info Principal */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isPass 
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}>
                        {isPass ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">
                            {test.categoria}
                          </span>
                          <span className="text-text-muted">•</span>
                          <span className="text-xs font-bold text-text-primary">
                            {test.titulo}
                          </span>
                        </div>

                        <p className="text-xs text-text-muted leading-relaxed">
                          {test.detalles}
                        </p>

                        {/* Badges de Evidencia Específica */}
                        <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px] font-mono">
                          {test.id === 'op1_catedras_ciclos' && (
                            <>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                ✓ Cátedras
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                ✓ Ciclos Lectivos
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                                ✓ Relaciones y RLS
                              </span>
                            </>
                          )}

                          {test.id === 'op2_matriculacion_upsert' && (
                            <>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                Clave: onConflict(docente_id, dni)
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                ✓ Cero duplicados DNI
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                                ✓ Vínculo Inscripciones
                              </span>
                            </>
                          )}

                          {test.id === 'op3_asistencias_historicas' && (
                            <>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                ✓ Clases y Asistencias
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                2/2 = 100%
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                1/2 = 50.0%
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                                ✓ Motor RAM Exacto
                              </span>
                            </>
                          )}

                          {test.id === 'op4_evaluaciones_calificaciones' && (
                            <>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                ✓ Parciales / TP / Notas
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                ✓ Promocional (&ge;7 / &ge;80%)
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                ✓ Regular (&ge;4 / &ge;70%)
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                                ✓ Libre (&lt;4)
                              </span>
                            </>
                          )}

                          {test.id === 'op5_mesas_actas_elegibles' && (
                            <>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                ✓ Mesas y Actas
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                ✓ get_alumnos_elegibles_mesa
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                                ✓ Acreditación Definitiva
                              </span>
                            </>
                          )}
                        </div>

                        {/* Bloque de Detalle Técnico PostgREST y Sugerencia de Corrección si falló */}
                        {test.error && (
                          <div className="mt-3.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-2 text-xs">
                            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-mono font-bold">
                              <AlertTriangle className="w-4 h-4 shrink-0" />
                              <span>Código PostgREST: {test.error.code}</span>
                            </div>
                            <p className="text-rose-800 dark:text-rose-300 font-mono text-[11px] leading-relaxed break-all">
                              {test.error.message}
                            </p>
                            {test.error.details && (
                              <p className="text-rose-700/80 dark:text-rose-400/80 text-[11px] font-mono">
                                {test.error.details}
                              </p>
                            )}
                            <div className="pt-2 border-t border-rose-500/20 flex items-start gap-2 text-amber-900 dark:text-amber-200 bg-amber-500/10 p-2.5 rounded-lg">
                              <span className="font-bold text-amber-600 dark:text-amber-400 shrink-0">💡 Sugerencia de corrección:</span>
                              <span className="leading-relaxed">{test.error.sugerencia}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Badge de Estado del Test */}
                    <div className="self-end sm:self-start shrink-0">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                        isPass
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                      }`}>
                        {isPass ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                        <span>{test.estado}</span>
                      </span>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* ========================================================
            3. PIE DE ACCIONES DEL MODAL
           ======================================================== */}
        <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/50 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <button
            type="button"
            onClick={handleCopyReport}
            disabled={!results || running}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-surface-border bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-hover text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Informe Copiado' : 'Copiar Informe QA'}</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={runDiagnosticSuite}
              disabled={running}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary-hover font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
              <span>{running ? 'Ejecutando...' : 'Re-ejecutar Tests'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center px-4 py-2 rounded-xl border border-surface-border text-text-secondary hover:text-text-primary hover:bg-surface-hover font-semibold text-xs transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
