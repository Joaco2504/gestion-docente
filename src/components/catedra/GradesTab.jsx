import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Plus, 
  FileSpreadsheet, 
  Printer, 
  Search, 
  X,
  Check,
  Settings,
  Eye,
  ChevronDown,
  Save,
  Globe
} from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';
import Modal from '../common/Modal';
import { SkeletonTable } from '../common/SkeletonLoader';
import PrintPreviewModal from '../common/PrintPreviewModal';
import PrintGradesConfigModal from './PrintGradesConfigModal';
import EditEvaluacionParamsModal from './EditEvaluacionParamsModal';
import NuevaEvaluacionModal from './modals/NuevaEvaluacionModal';
import ConfigurarRecuperatorioModal from './modals/ConfigurarRecuperatorioModal';
import GradesStatsHeader from './grades/GradesStatsHeader';
import GradeMatrixTable from './grades/GradeMatrixTable';
import GradeCardsMobile from './grades/GradeCardsMobile';
import GradesDensitySelector from './grades/GradesDensitySelector';
import { useGradesData } from '../../hooks/useGradesData';
import { useAuth } from '../../context/AuthContext';
import { exportGradesToExcel } from '../../lib/excel';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { deleteEvaluacion } from '../../services/evaluacionesService';
import { toast } from 'sonner';

/**
 * GradesTab (Orquestador Korum 2.0 Desacoplado)
 * Mantiene la sábana de notas bajo una arquitectura modular limpia,
 * integrando hooks especializados, métricas grupales, sábana desktop por teclado,
 * selector de visibilidad de columnas, panel de parámetros de condición y override manual/automático.
 */
export default function GradesTab({
  catedraId,
  catedraName = 'Cátedra',
  academicLevel = 'TERCIARIO',
  modalidad = 'ANUAL',
  cursadaFinalizada = false
}) {
  const { user, isDemo } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [density, setDensity] = useState('comfortable'); // 'comfortable' | 'compact'
  const [regimen, setRegimen] = useState(
    String(modalidad || 'ANUAL').toUpperCase().includes('CUATRI') ? 'CUATRIMESTRAL' : 'ANUAL'
  );
  const [isParamsOpen, setIsParamsOpen] = useState(false);
  const [isNuevaEvalModalOpen, setIsNuevaEvalModalOpen] = useState(false);
  const [isPrintConfigModalOpen, setIsPrintConfigModalOpen] = useState(false);
  const [isPrintPreviewModalOpen, setIsPrintPreviewModalOpen] = useState(false);
  const [printConfig, setPrintConfig] = useState(null);
  const [editingModalNota, setEditingModalNota] = useState(null);
  const [editingEvalParams, setEditingEvalParams] = useState(null);
  const [configurandoRecupEstudiante, setConfigurandoRecupEstudiante] = useState(null);

  // Hook desacoplado de datos y mutaciones
  const {
    estudiantes,
    evaluaciones,
    mainEvaluations,
    recuperatorioEvaluation,
    notas,
    loading,
    criterios,
    saveCriteriosCondicion,
    visibilityConfig,
    updateVisibilityConfig,
    handleSetCondicionManual,
    studentRows,
    evalMetricsMap,
    overallStats,
    getNotaValue,
    getNotaEstado,
    getNotaObj,
    ensureRecuperatorioEval,
    handleQuickSetGrade,
    deleteEvaluacionLocal,
    refetch
  } = useGradesData({
    catedraId,
    academicLevel,
    modalidad: regimen,
    isDemo,
    user
  });

  const {
    mostrar_parciales: mostrarParciales = true,
    mostrar_tps: mostrarTps = true,
    mostrar_promedio: mostrarPromedio = true,
    sincronizar_portal: sincronizarPortal = false
  } = visibilityConfig || {};

  const todoActivo = mostrarParciales && mostrarTps && mostrarPromedio;

  const handleToggleTodo = async () => {
    const nextState = await updateVisibilityConfig({
      mostrar_parciales: true,
      mostrar_tps: true,
      mostrar_promedio: true
    });
    if (nextState.sincronizar_portal) {
      toast.success('Vista completa sincronizada con el Portal del Alumno');
    }
  };

  const handleToggleVisibilityPill = async (field) => {
    const nextVal = !visibilityConfig[field];
    // Evitar que se desactiven las 3 píldoras a la vez dejando la vista vacía
    const nextStateCandidate = {
      ...visibilityConfig,
      [field]: nextVal
    };
    if (!nextStateCandidate.mostrar_parciales && !nextStateCandidate.mostrar_tps && !nextStateCandidate.mostrar_promedio) {
      toast.info('Debe quedar al menos una categoría visible en la sábana.');
      return;
    }
    const updated = await updateVisibilityConfig({ [field]: nextVal });
    if (updated.sincronizar_portal) {
      toast.success('Preferencia de visibilidad sincronizada con el Portal del Alumno');
    }
  };

  const handleToggleSyncPortal = async () => {
    const nextSync = !sincronizarPortal;
    await updateVisibilityConfig({ sincronizar_portal: nextSync }, nextSync);
    if (nextSync) {
      toast.success('Vista sincronizada con el Portal del Alumno (public.catedras)');
    } else {
      toast.info('Sincronización automática con el Portal del Alumno desactivada');
    }
  };

  const handleParamChange = async (partialParams, nextRegimen = null) => {
    if (nextRegimen) {
      setRegimen(nextRegimen);
    }
    await saveCriteriosCondicion(partialParams, nextRegimen || regimen);
  };

  // Filtrado reactivo de estudiantes por nombre o DNI
  const filteredStudentRows = useMemo(() => {
    if (!searchQuery.trim()) return studentRows;
    const q = searchQuery.toLowerCase().trim();
    return studentRows.filter(r => 
      (r.estudiante?.apellido || '').toLowerCase().includes(q) ||
      (r.estudiante?.nombre || '').toLowerCase().includes(q) ||
      (r.estudiante?.dni || '').toLowerCase().includes(q)
    );
  }, [studentRows, searchQuery]);

  const handleOpenEditNota = (info, maybeEv) => {
    if (cursadaFinalizada) {
      toast.info('La cursada está finalizada. Reabre el cursado para modificar calificaciones.');
      return;
    }
    if (info && info.estudianteId && info.evaluacionId) {
      setEditingModalNota(info);
    } else if (info && maybeEv) {
      setEditingModalNota({
        estudianteId: info.id,
        evaluacionId: maybeEv.id,
        nombreEstudiante: `${info.apellido || ''}, ${info.nombre || ''}`.trim(),
        nombreEvaluacion: maybeEv.titulo || maybeEv.nombre || 'Evaluación'
      });
    }
  };

  const handleSaveRecuperatorio = async (detalle, valorPromedio, estado) => {
    if (!configurandoRecupEstudiante) return;
    try {
      const recupEval = await ensureRecuperatorioEval();
      await handleQuickSetGrade({
        estudianteId: configurandoRecupEstudiante.id,
        evaluacionId: recupEval.id,
        valor: valorPromedio,
        estado: estado || (valorPromedio !== null ? 'CALIFICADO' : null),
        detalle_recuperatorio: detalle
      });
      toast.success(`Recuperatorio guardado para ${configurandoRecupEstudiante.apellido}, ${configurandoRecupEstudiante.nombre}`);
      refetch();
    } catch (err) {
      console.error('Error guardando recuperatorio:', err);
      toast.error('Error al guardar recuperatorio');
    }
  };

  const handleSaveEvalParams = async (updatedEval) => {
    if (isSupabaseConfigured && !isDemo && updatedEval?.id && !String(updatedEval.id).startsWith('eval-')) {
      const { error } = await supabase
        .from('evaluaciones')
        .update({
          titulo: updatedEval.titulo,
          tipo: updatedEval.tipo,
          fecha_entrega: updatedEval.fecha_entrega,
          ponderacion: updatedEval.ponderacion,
          escala_notas: updatedEval.escala_notas,
          archivo_url: updatedEval.archivo_url,
          archivo_nombre: updatedEval.archivo_nombre
        })
        .eq('id', updatedEval.id);
      if (error) throw error;
    } else {
      try {
        const key = `docentepro_demo_evals_${catedraId}`;
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        const next = list.map(e => e.id === updatedEval.id ? { ...e, ...updatedEval } : e);
        localStorage.setItem(key, JSON.stringify(next));
      } catch (_) {}
    }
    toast.success('Parámetros de evaluación actualizados.');
    refetch();
  };

  const handleDeleteEval = async (evToDelete) => {
    if (!evToDelete?.id) return;
    if (!window.confirm(`¿Deseas eliminar la evaluación "${evToDelete.titulo || 'Evaluación'}" y sus calificaciones asociadas?`)) {
      return;
    }
    try {
      // 1. Inmediatamente actualizar la UI optimista
      deleteEvaluacionLocal(evToDelete.id);

      // 2. Ejecutar borrado seguro en 2 pasos
      await deleteEvaluacion(evToDelete.id, {
        catedraId,
        supabase,
        isDemo
      });

      toast.success('Evaluación eliminada correctamente.');
      refetch();
    } catch (err) {
      console.error('Error al eliminar evaluación:', err);
      toast.error('No se pudo eliminar la evaluación.');
      refetch();
    }
  };

  const handleExportExcel = () => {
    try {
      if (studentRows.length === 0) {
        toast.info('No hay calificaciones para exportar.');
        return;
      }
      exportGradesToExcel(
        { nombre: catedraName },
        filteredStudentRows.map(r => r.estudiante),
        evaluaciones,
        notas,
        filteredStudentRows.map(r => ({
          estudianteId: r.estudiante.id,
          asistenciaPct: r.asistPct,
          condicion: r.condicion
        }))
      );
      toast.success('Planilla de calificaciones exportada a Excel.');
    } catch (err) {
      toast.error('Error al exportar planilla de calificaciones.');
    }
  };

  if (loading) {
    return (
      <div className="py-6 space-y-4 animate-fadeIn">
        <SkeletonTable rows={8} cols={6} />
      </div>
    );
  }

  const currentModalVal = editingModalNota
    ? getNotaValue(editingModalNota.estudianteId, editingModalNota.evaluacionId)
    : null;
  const currentModalEstado = editingModalNota
    ? getNotaEstado(editingModalNota.estudianteId, editingModalNota.evaluacionId)
    : null;

  return (
    <div className="space-y-4 animate-fadeIn pb-12">
      {/* 1. Métricas Grupales Reactivas (Bento Grid) */}
      <GradesStatsHeader overallStats={overallStats} />

      {/* 2. Barra de Herramientas, Visibilidad de Notas y Parámetros de Condición */}
      <Card className="p-4 border border-surface-border space-y-3.5">
        {/* Fila 1: Buscador y Acciones Principales */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Buscador reactivo */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por DNI o Apellido/Nombre..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 rounded-md text-xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Acciones principales */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Conmutador de Régimen Académico (Anual vs Cuatrimestral) */}
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/80 dark:border-white/10 text-xs font-bold select-none">
              <button
                type="button"
                onClick={() => handleParamChange({}, 'ANUAL')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  regimen === 'ANUAL'
                    ? 'bg-white dark:bg-slate-900 text-primary shadow-xs font-black'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                title="Régimen Anual: Máximo 2 parciales a recuperar"
              >
                Anual (máx. 2)
              </button>
              <button
                type="button"
                onClick={() => handleParamChange({}, 'CUATRIMESTRAL')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  regimen === 'CUATRIMESTRAL'
                    ? 'bg-white dark:bg-slate-900 text-primary shadow-xs font-black'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                title="Régimen Cuatrimestral: Máximo 1 parcial a recuperar"
              >
                Cuatrimestral (máx. 1)
              </button>
            </div>

            {/* Botón Desplegable: Parámetros de Condición */}
            <button
              type="button"
              onClick={() => setIsParamsOpen(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all inline-flex items-center gap-1.5 cursor-pointer select-none min-h-[36px] ${
                isParamsOpen
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-500/50'
              }`}
              title="Configurar criterios y umbrales para el cálculo automático de condición académica"
            >
              <span>⚙️ Parámetros de Condición</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isParamsOpen ? 'rotate-180' : ''}`} />
            </button>

            <div className="hidden lg:block">
              <GradesDensitySelector density={density} onDensityChange={setDensity} />
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={FileSpreadsheet}
              onClick={handleExportExcel}
              className="text-xs font-bold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
            >
              Exportar Excel
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={Printer}
              onClick={() => setIsPrintConfigModalOpen(true)}
              className="text-xs font-bold"
            >
              Imprimir
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              disabled={cursadaFinalizada}
              onClick={() => setIsNuevaEvalModalOpen(true)}
              className="text-xs font-bold shadow-xs"
            >
              Nueva Evaluación
            </Button>
          </div>
        </div>

        {/* Fila 2: Selector Rápido de Qué Notas Mostrar (Píldoras + Switch Sincronizar Portal) */}
        <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-mono font-bold uppercase text-text-muted mr-1 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-emerald-500" />
              <span>Mostrar:</span>
            </span>

            {/* Píldora: Todo a la vez */}
            <button
              type="button"
              onClick={handleToggleTodo}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 border select-none ${
                todoActivo
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500/40'
              }`}
            >
              <Check className={`w-3.5 h-3.5 ${todoActivo ? 'opacity-100' : 'opacity-40'}`} />
              <span>Todo a la vez</span>
            </button>

            {/* Píldora: Parciales y Recuperatorios */}
            <button
              type="button"
              onClick={() => handleToggleVisibilityPill('mostrar_parciales')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 border select-none ${
                mostrarParciales
                  ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-black ${
                mostrarParciales ? 'bg-emerald-600 text-white' : 'bg-slate-300 dark:bg-slate-700 text-transparent'
              }`}>
                ✓
              </span>
              <span>Parciales y Recuperatorios</span>
            </button>

            {/* Píldora: Trabajos Prácticos */}
            <button
              type="button"
              onClick={() => handleToggleVisibilityPill('mostrar_tps')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 border select-none ${
                mostrarTps
                  ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-black ${
                mostrarTps ? 'bg-emerald-600 text-white' : 'bg-slate-300 dark:bg-slate-700 text-transparent'
              }`}>
                ✓
              </span>
              <span>Trabajos Prácticos</span>
            </button>

            {/* Píldora: Promedio General */}
            <button
              type="button"
              onClick={() => handleToggleVisibilityPill('mostrar_promedio')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 border select-none ${
                mostrarPromedio
                  ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] font-black ${
                mostrarPromedio ? 'bg-emerald-600 text-white' : 'bg-slate-300 dark:bg-slate-700 text-transparent'
              }`}>
                ✓
              </span>
              <span>Promedio General</span>
            </button>
          </div>

          {/* Switch Opcional: Sincronizar esta vista con el Portal del Alumno */}
          <label className="inline-flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 self-start lg:self-auto">
            <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Sincronizar esta vista con el Portal del Alumno</span>
            <button
              type="button"
              role="switch"
              aria-checked={sincronizarPortal}
              onClick={handleToggleSyncPortal}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
                sincronizarPortal ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-xs transform transition-transform duration-200 ease-in-out ${
                  sincronizarPortal ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </label>
        </div>

        {/* Panel Desplegable: ⚙️ Parámetros de Condición */}
        {isParamsOpen && (
          <div className="pt-3.5 border-t border-slate-200/80 dark:border-slate-800 animate-fadeIn space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>⚙️ Parámetros para Decidir la Condición Académica</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Elegí qué criterios evalúa el motor automático para definir si un alumno está Promocional, Regular o Libre. Los cambios recalculan la planilla al instante.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Save}
                  onClick={async () => {
                    await saveCriteriosCondicion(criterios, regimen);
                    toast.success('Parámetros de condición guardados en la cátedra y planilla recalculada.');
                    setIsParamsOpen(false);
                  }}
                  className="text-xs font-bold shrink-0"
                >
                  Guardar y Cerrar
                </Button>
              </div>

              {/* 1. Checkboxes de qué criterios evaluar */}
              <div>
                <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Criterios Activos en el Cálculo Automático
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 cursor-pointer hover:border-emerald-500/40 transition-all">
                    <input
                      type="checkbox"
                      checked={criterios.eval_considerar_asistencia !== false}
                      onChange={(e) => handleParamChange({ eval_considerar_asistencia: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Evaluar Asistencia
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-snug">
                        Si se destilda, las inasistencias no dejan libre al alumno en el cálculo automático.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 cursor-pointer hover:border-emerald-500/40 transition-all">
                    <input
                      type="checkbox"
                      checked={criterios.eval_considerar_parciales !== false}
                      onChange={(e) => handleParamChange({ eval_considerar_parciales: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Evaluar Parciales y Recuperatorios
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-snug">
                        Si se destilda, decide la condición solo con los demás parámetros activos.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 cursor-pointer hover:border-emerald-500/40 transition-all">
                    <input
                      type="checkbox"
                      checked={criterios.eval_considerar_tps !== false}
                      onChange={(e) => handleParamChange({ eval_considerar_tps: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Evaluar Trabajos Prácticos
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-snug">
                        Si se destilda, los TPs desaprobados o N/E no bajan la condición del alumno.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 2. Inputs numéricos rápidos de umbrales */}
              <div>
                <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Umbrales Reglamentarios y Régimen
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Nota mín. Regularidad
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      step="0.5"
                      value={criterios.nota_regularidad ?? criterios.nota_min_reg ?? 4}
                      onChange={(e) => handleParamChange({
                        nota_regularidad: Number(e.target.value),
                        nota_min_reg: Number(e.target.value)
                      })}
                      className="w-full px-2 py-1 rounded-lg font-mono font-bold text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Nota mín. Promoción
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      step="0.5"
                      value={criterios.nota_promocion ?? criterios.nota_min_promo ?? 7}
                      onChange={(e) => handleParamChange({
                        nota_promocion: Number(e.target.value),
                        nota_min_promo: Number(e.target.value)
                      })}
                      className="w-full px-2 py-1 rounded-lg font-mono font-bold text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      % Asist. Regular
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={criterios.ram_asistencia_regular ?? criterios.min_asist_reg ?? 70}
                      onChange={(e) => handleParamChange({
                        ram_asistencia_regular: Number(e.target.value),
                        min_asist_reg: Number(e.target.value)
                      })}
                      className="w-full px-2 py-1 rounded-lg font-mono font-bold text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      % Régimen Laboral
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={criterios.ram_asistencia_trabajo ?? criterios.min_asist_trabajo ?? 60}
                      onChange={(e) => handleParamChange({
                        ram_asistencia_trabajo: Number(e.target.value),
                        min_asist_trabajo: Number(e.target.value)
                      })}
                      className="w-full px-2 py-1 rounded-lg font-mono font-bold text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      % TPs Regularizar
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={criterios.porcentaje_tps_regular ?? 80}
                      onChange={(e) => handleParamChange({
                        porcentaje_tps_regular: Number(e.target.value)
                      })}
                      className="w-full px-2 py-1 rounded-lg font-mono font-bold text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      % TPs Promocionar
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={criterios.porcentaje_tps_promocion ?? 100}
                      onChange={(e) => handleParamChange({
                        porcentaje_tps_promocion: Number(e.target.value)
                      })}
                      className="w-full px-2 py-1 rounded-lg font-mono font-bold text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 col-span-2 sm:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Régimen de Cursada
                    </label>
                    <select
                      value={regimen}
                      onChange={(e) => handleParamChange({}, e.target.value)}
                      className="w-full px-2 py-1 rounded-lg font-bold text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer"
                    >
                      <option value="ANUAL">Anual (máx. 2 recup.)</option>
                      <option value="CUATRIMESTRAL">Cuatrimestral (máx. 1 recup.)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 3. VISTA DESKTOP (>= 1024px): Sábana de Notas Matricial con Navegación por Teclado */}
      <div className="hidden lg:block">
        <GradeMatrixTable
          studentRows={filteredStudentRows}
          mainEvaluations={mainEvaluations}
          evaluaciones={evaluaciones}
          recuperatorioEval={recuperatorioEvaluation}
          regimen={regimen}
          evalMetricsMap={evalMetricsMap}
          getNotaValue={getNotaValue}
          getNotaEstado={getNotaEstado}
          onQuickSetGrade={cursadaFinalizada ? undefined : handleQuickSetGrade}
          onOpenEditNota={handleOpenEditNota}
          onOpenNuevaEvaluacion={() => setIsNuevaEvalModalOpen(true)}
          onOpenEditParams={(ev) => setEditingEvalParams(ev)}
          onOpenConfigurarRecuperatorio={(est) => setConfigurandoRecupEstudiante(est)}
          onDeleteEval={handleDeleteEval}
          onSelectCondicionManual={cursadaFinalizada ? undefined : handleSetCondicionManual}
          mostrarParciales={mostrarParciales}
          mostrarTps={mostrarTps}
          mostrarPromedio={mostrarPromedio}
          density={density}
        />
      </div>

      {/* 4. VISTA MÓVIL Y TABLET (< 1024px): Tarjetas Táctiles Modulares (Responsive-Craft) */}
      <div className="lg:hidden">
        <GradeCardsMobile
          studentRows={filteredStudentRows}
          mainEvaluations={mainEvaluations}
          evaluaciones={evaluaciones}
          recuperatorioEval={recuperatorioEvaluation}
          regimen={regimen}
          getNotaValue={getNotaValue}
          getNotaEstado={getNotaEstado}
          onOpenEditNota={handleOpenEditNota}
          onOpenConfigurarRecuperatorio={(est) => setConfigurandoRecupEstudiante(est)}
          onQuickSetGrade={cursadaFinalizada ? undefined : handleQuickSetGrade}
          onSelectCondicionManual={cursadaFinalizada ? undefined : handleSetCondicionManual}
          mostrarParciales={mostrarParciales}
          mostrarTps={mostrarTps}
          mostrarPromedio={mostrarPromedio}
        />
      </div>

      {/* 5. Modal Táctil Rápido de Calificación Individual (Mobile / Tablet / Desktop Click) */}
      <Modal
        isOpen={Boolean(editingModalNota)}
        onClose={() => setEditingModalNota(null)}
        title={editingModalNota?.nombreEvaluacion || 'Asignar Calificación'}
        subtitle={editingModalNota?.nombreEstudiante ? `Estudiante: ${editingModalNota.nombreEstudiante}` : ''}
        size="sm"
      >
        {editingModalNota && (
          <div className="space-y-4">
            <div>
              <span className="block text-xs font-bold uppercase text-text-muted mb-2">
                Seleccionar Nota Numérica (1 a 10)
              </span>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const isSelected = currentModalEstado === 'CALIFICADO' && Number(currentModalVal) === num;
                  const colorClasses = num >= 7
                    ? isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                    : num >= 4
                    ? isSelected
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                    : isSelected
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20';

                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        handleQuickSetGrade({
                          estudianteId: editingModalNota.estudianteId,
                          evaluacionId: editingModalNota.evaluacionId,
                          valor: num,
                          estado: 'CALIFICADO'
                        });
                        setEditingModalNota(null);
                      }}
                      className={`min-h-[48px] rounded-xl font-mono font-black text-base border transition-all active:scale-95 cursor-pointer flex items-center justify-center ${colorClasses}`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-surface-border">
              <span className="block text-xs font-bold uppercase text-text-muted mb-2">
                Estados Especiales
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    handleQuickSetGrade({
                      estudianteId: editingModalNota.estudianteId,
                      evaluacionId: editingModalNota.evaluacionId,
                      valor: null,
                      estado: 'AUSENTE'
                    });
                    setEditingModalNota(null);
                  }}
                  className={`min-h-[44px] px-3 py-2 rounded-xl font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    currentModalEstado === 'AUSENTE'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                  }`}
                >
                  <span>Ausente (Aus.)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleQuickSetGrade({
                      estudianteId: editingModalNota.estudianteId,
                      evaluacionId: editingModalNota.evaluacionId,
                      valor: null,
                      estado: 'NO_ENTREGO'
                    });
                    setEditingModalNota(null);
                  }}
                  className={`min-h-[44px] px-3 py-2 rounded-xl font-bold text-xs border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    currentModalEstado === 'NO_ENTREGO'
                      ? 'bg-slate-700 text-white border-slate-700'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>No Entregó (N/E)</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-surface-border">
              <Button variant="secondary" size="sm" onClick={() => setEditingModalNota(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 6. Modales Auxiliares */}
      <NuevaEvaluacionModal
        isOpen={isNuevaEvalModalOpen}
        onClose={() => setIsNuevaEvalModalOpen(false)}
        catedraId={catedraId}
        onEvaluacionCreated={() => {
          setIsNuevaEvalModalOpen(false);
          refetch();
        }}
        onEvaluacionCreada={() => {
          setIsNuevaEvalModalOpen(false);
          refetch();
        }}
      />

      <EditEvaluacionParamsModal
        isOpen={Boolean(editingEvalParams)}
        onClose={() => setEditingEvalParams(null)}
        evaluacion={editingEvalParams}
        catedraId={catedraId}
        onSave={handleSaveEvalParams}
        onDelete={(ev) => {
          setEditingEvalParams(null);
          handleDeleteEval(ev);
        }}
      />

      <PrintGradesConfigModal
        isOpen={isPrintConfigModalOpen}
        onClose={() => setIsPrintConfigModalOpen(false)}
        onGeneratePreview={(cfg) => {
          setPrintConfig(cfg);
          setIsPrintConfigModalOpen(false);
          setIsPrintPreviewModalOpen(true);
        }}
        evaluaciones={evaluaciones}
      />

      <PrintPreviewModal
        isOpen={isPrintPreviewModalOpen}
        onClose={() => setIsPrintPreviewModalOpen(false)}
        type="planillas-notas"
        title={`Planilla de Calificaciones — ${catedraName}`}
        defaultOrientation={printConfig?.orientation || 'landscape'}
        data={{
          catedraName,
          evaluaciones: printConfig?.selectedEvalIds
            ? mainEvaluations.filter(e => printConfig.selectedEvalIds.includes(e.id))
            : mainEvaluations,
          studentRows: filteredStudentRows,
          printConfig
        }}
      />

      {configurandoRecupEstudiante && (
        <ConfigurarRecuperatorioModal
          isOpen={Boolean(configurandoRecupEstudiante)}
          onClose={() => setConfigurandoRecupEstudiante(null)}
          estudiante={configurandoRecupEstudiante}
          parciales={mainEvaluations.filter(e => {
            const t = String(e.tipo || '').toUpperCase();
            return t === 'PARCIAL' || t.includes('PARCIAL') || t === 'PRUEBA';
          })}
          notasMap={(evalId) => {
            const val = getNotaValue(configurandoRecupEstudiante.id, evalId);
            const est = getNotaEstado(configurandoRecupEstudiante.id, evalId);
            return { valor: val, nota: val, estado: est };
          }}
          recuperatorioActual={
            getNotaObj(
              configurandoRecupEstudiante.id,
              recuperatorioEvaluation?.id || 'recup-gen'
            ) ||
            notas.find(
              n => n.estudiante_id === configurandoRecupEstudiante.id &&
              (n.detalle_recuperatorio || (recuperatorioEvaluation && n.evaluacion_id === recuperatorioEvaluation.id))
            )
          }
          regimen={regimen}
          onSave={handleSaveRecuperatorio}
        />
      )}
    </div>
  );
}
