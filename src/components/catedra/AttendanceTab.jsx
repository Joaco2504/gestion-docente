import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, X, ShieldAlert } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { SkeletonTable } from '../common/SkeletonLoader';
import PrintPreviewModal from '../common/PrintPreviewModal';
import RegistrarFaltaDocenteModal from './modals/RegistrarFaltaDocenteModal';
import LicenciasDocenteModal from '../common/LicenciasDocenteModal';
import AttendanceQuickActions from './attendance/AttendanceQuickActions';
import AttendanceDesktopTable from './attendance/AttendanceDesktopTable';
import AttendanceCardsMobile from './attendance/AttendanceCardsMobile';
import AttendanceClassCarousel from './attendance/AttendanceClassCarousel';
import AttendanceClassTopicBar from './attendance/AttendanceClassTopicBar';
import { useAttendanceManager } from '../../hooks/useAttendanceManager';
import { useAuth } from '../../context/AuthContext';
import { exportAttendanceToExcel } from '../../lib/excel';
import { getTodayYMD, formatFechaDMY } from '../../lib/dateUtils';
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
  const [isLicenciasModalOpen, setIsLicenciasModalOpen] = useState(false);

  // Hook desacoplado de gestión de asistencia
  const {
    alumnosElegibles,
    clases,
    unidades,
    claseActiva,
    selectedClaseId,
    asistencias,
    licenciasDocente,
    isFeriado,
    feriadoActivo,
    isLicenciaDocente,
    licenciaDocenteActiva,
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
      exportAttendanceToExcel(
        catedra || { id: catedraId, nombre: catedraName },
        alumnosElegibles,
        clases,
        asistencias,
        [],
        asistenciaPorEstudiante
      );
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
        licenciasDocente={licenciasDocente}
        catedraId={catedraId}
        onSelectClase={handleSelectClase}
        onSelectNuevaClaseHoy={() => setFechaSeleccionada(getTodayYMD())}
      />

      {/* 2. Barra de Herramientas de Alta Velocidad (Fecha & Acciones Masivas) */}
      <AttendanceQuickActions
        fechaSeleccionada={fechaSeleccionada}
        onFechaChange={setFechaSeleccionada}
        claseActiva={claseActiva}
        isFeriado={isFeriado}
        infoFeriado={feriadoActivo}
        isLicenciaDocente={isLicenciaDocente}
        infoLicencia={licenciaDocenteActiva}
        statsHoy={statsHoy}
        onMarcarTodosPresentes={handleMarcarTodosPresentes}
        onMarcarTodosAusentes={handleMarcarTodosAusentes}
        onOpenFaltaDocenteModal={() => setIsFaltaDocenteModalOpen(true)}
        onOpenLicenciasModal={() => setIsLicenciasModalOpen(true)}
        onExportExcel={handleExportExcel}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
        saving={saving || cursadaFinalizada}
      />

      {/* 3. Barra Rápida de Unidad, Tema dictado & Decreto 1092 */}
      <AttendanceClassTopicBar
        claseActiva={claseActiva}
        isFeriado={isFeriado}
        feriadoActivo={feriadoActivo}
        isLicenciaDocente={isLicenciaDocente}
        licenciaDocenteActiva={licenciaDocenteActiva}
        unidades={unidades}
        onUpdateClase={handleUpdateClase}
        onOpenLicenciasModal={() => setIsLicenciasModalOpen(true)}
        disabled={saving || cursadaFinalizada}
      />

      {/* 4. Vista Condicional: Bloqueo por Feriado Oficial / Licencia Docente vs Lista de Presentismo */}
      {isFeriado ? (
        <Card className="p-6 border-2 border-sky-400/50 bg-sky-50/70 dark:bg-sky-950/30 dark:border-sky-800/60 shadow-sm animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-sky-500/20 text-sky-700 dark:text-sky-300 shrink-0 text-xl leading-none flex items-center justify-center">
                🇦🇷
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-sky-950 dark:text-sky-100">
                  🇦🇷 Día no laborable — Feriado Nacional ({feriadoActivo?.nombre || 'Feriado Oficial'})
                </h3>
                <p className="text-sm font-medium text-sky-800/90 dark:text-sky-200/90">
                  No se requiere tomar asistencia ni cargar tema, y esta fecha no se computa para las inasistencias de los alumnos.
                </p>
                <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium pt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold">✅ Calendario Oficial 2026</span>
                  <span className="text-slate-400">•</span>
                  <span>Jornada no computable</span>
                  <span className="text-slate-400">•</span>
                  <span>No descuenta % de asistencia a los alumnos</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : isLicenciaDocente ? (
        <Card className="p-6 border-2 border-amber-500/40 bg-amber-50/70 dark:bg-amber-950/20 shadow-sm animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-amber-950 dark:text-amber-200">
                  🛡️ Sin dictado de clases — Cubierto por Licencia Docente
                </h3>
                <p className="text-sm font-semibold text-amber-800/90 dark:text-amber-300/90">
                  {licenciaDocenteActiva?.articulo || 'Licencia Decreto 1092'}
                  {licenciaDocenteActiva?.fecha_inicio && licenciaDocenteActiva?.fecha_fin ? (
                    <span className="font-normal ml-1.5">
                      (Del {formatFechaDMY(licenciaDocenteActiva.fecha_inicio)} al {formatFechaDMY(licenciaDocenteActiva.fecha_fin)})
                    </span>
                  ) : null}
                </p>
                {licenciaDocenteActiva?.observacion && (
                  <p className="text-xs text-amber-700/80 dark:text-amber-400/80 italic">
                    Nota: {licenciaDocenteActiva.observacion}
                  </p>
                )}
                <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium pt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold">✅ Justificada automáticamente</span>
                  <span className="text-slate-400">•</span>
                  <span>No requiere tomar asistencia ni cargar tema</span>
                  <span className="text-slate-400">•</span>
                  <span>No descuenta % de asistencia a los alumnos</span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLicenciasModalOpen(true)}
              className="border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 shrink-0 touch-target-44 min-h-[44px]"
            >
              Ver balance anual de licencias
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Buscador Reactivo */}
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

          {/* VISTA DESKTOP (>= 1024px): Tabla de Alta Densidad */}
          <AttendanceDesktopTable
            filteredAlumnos={filteredAlumnos}
            asistenciasDiaMap={asistenciasDiaMap}
            asistenciaPorEstudiante={asistenciaPorEstudiante}
            onToggleEstado={handleToggleEstado}
            disabled={saving || cursadaFinalizada}
          />

          {/* VISTA MÓVIL (< 1024px): Tarjetas Táctiles Modulares (Responsive-Craft) */}
          <div className="lg:hidden">
            <AttendanceCardsMobile
              alumnosElegibles={filteredAlumnos}
              asistenciasDiaMap={asistenciasDiaMap}
              asistenciaPorEstudiante={asistenciaPorEstudiante}
              onToggleEstado={handleToggleEstado}
              disabled={saving || cursadaFinalizada}
            />
          </div>
        </>
      )}

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

      {/* Centro y Balance Anual de Licencias Docentes */}
      <LicenciasDocenteModal
        isOpen={isLicenciasModalOpen}
        onClose={() => setIsLicenciasModalOpen(false)}
        catedras={catedra ? [catedra] : [{ id: catedraId, nombre: catedraName }]}
        initialCatedraId={catedraId}
        docenteId={user?.id}
        onLicenciaSaved={() => {
          refetch();
        }}
      />
    </div>
  );
}
