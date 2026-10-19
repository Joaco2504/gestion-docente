import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  FileSpreadsheet, 
  Printer, 
  Search, 
  X,
  Check
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
 * integrando hooks especializados, métricas grupales, sábana desktop por teclado
 * y vista táctil mobile responsive-craft.
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
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Métricas Grupales Reactivas (Bento Grid) */}
      <GradesStatsHeader overallStats={overallStats} />

      {/* 2. Barra de Herramientas y Acciones */}
      <Card className="p-4 border border-surface-border">
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
                onClick={() => setRegimen('ANUAL')}
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
                onClick={() => setRegimen('CUATRIMESTRAL')}
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
