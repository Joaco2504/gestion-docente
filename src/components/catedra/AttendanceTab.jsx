import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import Card from '../common/Card';
import { SkeletonTable } from '../common/SkeletonLoader';
import PrintPreviewModal from '../common/PrintPreviewModal';
import RegistrarFaltaDocenteModal from './modals/RegistrarFaltaDocenteModal';
import AttendanceQuickActions from './attendance/AttendanceQuickActions';
import AttendanceDesktopTable from './attendance/AttendanceDesktopTable';
import AttendanceCardsMobile from './attendance/AttendanceCardsMobile';
import AttendanceClassCarousel from './attendance/AttendanceClassCarousel';
import AttendanceClassTopicBar from './attendance/AttendanceClassTopicBar';
import { useAttendanceManager } from '../../hooks/useAttendanceManager';
import { useAuth } from '../../context/AuthContext';
import { exportAttendanceToExcel } from '../../lib/excel';
import { getTodayYMD } from '../../lib/dateUtils';
import { toast } from 'sonner';

/**
 * AttendanceTab (Orquestador Korum 2.0 Desacoplado)
 * Gestión modular de presentismo (< 200 líneas), con soporte para acciones masivas,
 * régimen laboral adaptativo (meta 60% vs 70%) y vista táctil mobile-first.
 */
export default function AttendanceTab({
  catedraId,
  catedraName = 'Cátedra',
  academicLevel = 'TERCIARIO',
  cursadaFinalizada = false,
  onNavigateToLibroTemas,
  catedra
}) {
  const { user, isDemo } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFaltaDocenteModalOpen, setIsFaltaDocenteModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Hook desacoplado de gestión de asistencia
  const {
    alumnosElegibles,
    clases,
    unidades,
    claseActiva,
    selectedClaseId,
    asistencias,
    fechaSeleccionada,
    setFechaSeleccionada,
    handleSelectClase,
    handleUpdateClase,
    loading,
    saving,
    asistenciasDiaMap,
    asistenciaPorEstudiante,
    statsHoy,
    handleMarcarTodosPresentes,
    handleMarcarTodosAusentes,
    handleToggleEstado,
    refetch
  } = useAttendanceManager({
    catedraId,
    isDemo,
    user,
    catedra
  });

  // Filtrado reactivo de estudiantes por nombre o DNI
  const filteredAlumnos = useMemo(() => {
    if (!searchQuery.trim()) return alumnosElegibles;
    const q = searchQuery.toLowerCase().trim();
    return alumnosElegibles.filter(e =>
      (e.apellido || '').toLowerCase().includes(q) ||
      (e.nombre || '').toLowerCase().includes(q) ||
      (e.dni || '').toLowerCase().includes(q)
    );
  }, [alumnosElegibles, searchQuery]);

  const handleExportExcel = () => {
    try {
      if (alumnosElegibles.length === 0) {
        toast.info('No hay registros de alumnos para exportar.');
        return;
      }
      exportAttendanceToExcel({
        catedraName,
        clases,
        estudiantes: alumnosElegibles,
        asistencias
      });
      toast.success('Planilla de asistencia exportada a Excel.');
    } catch (err) {
      toast.error('Error al exportar asistencia a Excel.');
    }
  };

  if (loading) {
    return (
      <div className="py-6 space-y-4 animate-fadeIn">
        <SkeletonTable rows={8} cols={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Carrusel de Clases Registradas & Selección de Jornada */}
      <AttendanceClassCarousel
        clases={clases}
        selectedClaseId={selectedClaseId}
        selectedFecha={fechaSeleccionada}
        asistencias={asistencias}
        onSelectClase={handleSelectClase}
        onSelectNuevaClaseHoy={() => setFechaSeleccionada(getTodayYMD())}
      />

      {/* 2. Barra de Herramientas de Alta Velocidad (Fecha & Acciones Masivas) */}
      <AttendanceQuickActions
        fechaSeleccionada={fechaSeleccionada}
        onFechaChange={setFechaSeleccionada}
        claseActiva={claseActiva}
        statsHoy={statsHoy}
        onMarcarTodosPresentes={handleMarcarTodosPresentes}
        onMarcarTodosAusentes={handleMarcarTodosAusentes}
        onOpenFaltaDocenteModal={() => setIsFaltaDocenteModalOpen(true)}
        onExportExcel={handleExportExcel}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
        saving={saving}
      />

      {/* 3. Barra Rápida de Unidad, Tema dictado & Decreto 1092 */}
      <AttendanceClassTopicBar
        claseActiva={claseActiva}
        unidades={unidades}
        onUpdateClase={handleUpdateClase}
        disabled={saving}
      />

      {/* 4. Buscador Reactivo */}
      <Card className="p-3.5 border border-surface-border">
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
      </Card>

      {/* 3. VISTA DESKTOP (>= 1024px): Tabla de Alta Densidad */}
      <AttendanceDesktopTable
        filteredAlumnos={filteredAlumnos}
        asistenciasDiaMap={asistenciasDiaMap}
        asistenciaPorEstudiante={asistenciaPorEstudiante}
        onToggleEstado={handleToggleEstado}
        disabled={saving}
      />

      {/* 4. VISTA MÓVIL (< 1024px): Tarjetas Táctiles Modulares (Responsive-Craft) */}
      <div className="lg:hidden">
        <AttendanceCardsMobile
          alumnosElegibles={filteredAlumnos}
          asistenciasDiaMap={asistenciasDiaMap}
          asistenciaPorEstudiante={asistenciaPorEstudiante}
          onToggleEstado={handleToggleEstado}
          disabled={saving}
        />
      </div>

      {/* 5. Modales Auxiliares */}
      <RegistrarFaltaDocenteModal
        isOpen={isFaltaDocenteModalOpen}
        onClose={() => setIsFaltaDocenteModalOpen(false)}
        catedraId={catedraId}
        onSuccess={() => {
          setIsFaltaDocenteModalOpen(false);
          refetch();
        }}
      />

      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        type="asistencia"
        title={`Planilla de Asistencia — ${catedraName}`}
        data={{
          catedraName,
          clases,
          estudiantes: filteredAlumnos,
          asistencias
        }}
      />
    </div>
  );
}
