import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  FileSpreadsheet, 
  Printer, 
  Search, 
  X,
  LayoutGrid,
  Table as TableIcon,
  Download
} from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';
import { SkeletonTable } from '../common/SkeletonLoader';
import EmptyState from '../common/EmptyState';
import PrintPreviewModal from '../common/PrintPreviewModal';
import PrintGradesConfigModal from './PrintGradesConfigModal';
import NuevaEvaluacionModal from './modals/NuevaEvaluacionModal';
import GradesStatsHeader from './grades/GradesStatsHeader';
import GradeMatrixTable from './grades/GradeMatrixTable';
import GradeCardsMobile from './grades/GradeCardsMobile';
import GradesDensitySelector from './grades/GradesDensitySelector';
import { useGradesData } from '../../hooks/useGradesData';
import { useAuth } from '../../context/AuthContext';
import { exportGradesToExcel } from '../../lib/excel';
import { toast } from 'sonner';

/**
 * GradesTab (Orquestador Korum 2.0 Desacoplado)
 * Mantiene la sábana de notas bajo una arquitectura modular limpia (< 300 líneas),
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
  const [isNuevaEvalModalOpen, setIsNuevaEvalModalOpen] = useState(false);
  const [isPrintConfigModalOpen, setIsPrintConfigModalOpen] = useState(false);
  const [isPrintPreviewModalOpen, setIsPrintPreviewModalOpen] = useState(false);
  const [editingModalNota, setEditingModalNota] = useState(null);

  // Hook desacoplado de datos y mutaciones
  const {
    estudiantes,
    evaluaciones,
    mainEvaluations,
    notas,
    loading,
    studentRows,
    evalMetricsMap,
    overallStats,
    getNotaValue,
    getNotaEstado,
    handleQuickSetGrade,
    refetch
  } = useGradesData({
    catedraId,
    academicLevel,
    modalidad,
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

  const handleExportExcel = () => {
    try {
      if (studentRows.length === 0) {
        toast.info('No hay calificaciones para exportar.');
        return;
      }
      exportGradesToExcel({
        catedraName,
        evaluaciones: mainEvaluations,
        estudiantes: filteredStudentRows.map(r => ({
          ...r.estudiante,
          notas: r.notas,
          promedio: r.promedio,
          condicion: r.condicion?.condicion
        }))
      });
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

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Métricas Grupales Reactivas (Bento Grid) */}
      <GradesStatsHeader overallStats={overallStats} />

      {/* 2. Barra de Herramientas y Acciones */}
      <Card className="p-4 border border-surface-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Buscador reactivo */}
          <div className="relative w-full sm:w-80">
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
            <div className="hidden lg:block">
              <GradesDensitySelector density={density} onChange={setDensity} />
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
          evalMetricsMap={evalMetricsMap}
          getNotaValue={getNotaValue}
          getNotaEstado={getNotaEstado}
          onQuickSetGrade={handleQuickSetGrade}
          onOpenEditNota={(info) => setEditingModalNota(info)}
          onOpenNuevaEvaluacion={() => setIsNuevaEvalModalOpen(true)}
          density={density}
        />
      </div>

      {/* 4. VISTA MÓVIL (< 1024px): Tarjetas Táctiles Modulares (Responsive-Craft) */}
      <div className="lg:hidden">
        <GradeCardsMobile
          studentRows={filteredStudentRows}
          mainEvaluations={mainEvaluations}
          evaluaciones={evaluaciones}
          getNotaValue={getNotaValue}
          getNotaEstado={getNotaEstado}
          onOpenEditNota={(info) => setEditingModalNota(info)}
          onQuickSetGrade={handleQuickSetGrade}
        />
      </div>

      {/* 5. Modales Auxiliares */}
      <NuevaEvaluacionModal
        isOpen={isNuevaEvalModalOpen}
        onClose={() => setIsNuevaEvalModalOpen(false)}
        catedraId={catedraId}
        onEvaluacionCreated={() => {
          setIsNuevaEvalModalOpen(false);
          refetch();
        }}
      />

      <PrintGradesConfigModal
        isOpen={isPrintConfigModalOpen}
        onClose={() => setIsPrintConfigModalOpen(false)}
        onConfirmPrint={(cfg) => {
          setIsPrintConfigModalOpen(false);
          setIsPrintPreviewModalOpen(true);
        }}
        evaluaciones={mainEvaluations}
      />

      <PrintPreviewModal
        isOpen={isPrintPreviewModalOpen}
        onClose={() => setIsPrintPreviewModalOpen(false)}
        type="planillas-notas"
        title={`Planilla de Calificaciones — ${catedraName}`}
        data={{
          catedraName,
          evaluaciones: mainEvaluations,
          studentRows: filteredStudentRows
        }}
      />
    </div>
  );
}
