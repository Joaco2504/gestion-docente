import React from 'react';
import { 
  CheckCheck, 
  X, 
  Calendar, 
  FileSpreadsheet, 
  Printer, 
  ShieldAlert,
  Percent,
  CheckCircle2,
  Clock,
  Edit3,
  Sparkles
} from 'lucide-react';
import Button from '../../common/Button';
import { formatFechaDMY } from '../../../lib/dateUtils';

/**
 * AttendanceQuickActions
 * Barra de herramientas de alta velocidad con presentismo masivo y selector de jornada.
 */
export default function AttendanceQuickActions({
  fechaSeleccionada,
  onFechaChange,
  claseActiva = null,
  isFeriado = false,
  infoFeriado = null,
  isLicenciaDocente = false,
  infoLicencia = null,
  statsHoy,
  onMarcarTodosPresentes,
  onMarcarTodosAusentes,
  onOpenFaltaDocenteModal,
  onOpenLicenciasModal = null,
  onExportExcel,
  onOpenPrintModal,
  saving = false
}) {
  const { total = 0, presentes = 0, ausentes = 0, pctDia = 0 } = statsHoy || {};
  const formattedDate = formatFechaDMY(fechaSeleccionada).replace(/-/g, '/');

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs">
      {/* Selector de Fecha & Badge Dinámico de Clase */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10">
          <Calendar className="w-4 h-4 text-primary shrink-0" />
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => onFechaChange(e.target.value)}
            className="bg-transparent text-xs font-mono font-bold text-text-primary focus:outline-none cursor-pointer"
            aria-label="Seleccionar fecha de la clase"
          />
        </div>

        {/* Badge Contextual: Feriado Nacional vs Licencia Docente vs Editando Clase vs Nueva Clase */}
        {isFeriado ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-500/15 border border-sky-500/30 text-xs font-bold text-sky-700 dark:text-sky-300">
            <span>🇦🇷 Feriado Nacional ({infoFeriado?.nombre || 'Feriado Oficial'})</span>
          </div>
        ) : isLicenciaDocente ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs font-bold text-amber-700 dark:text-amber-300">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>🛡️ Jornada Justificada (Dto. 1092)</span>
          </div>
        ) : claseActiva ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-700 dark:text-blue-300">
            <Edit3 className="w-3.5 h-3.5 shrink-0" />
            <span>Editando clase registrada ({formattedDate})</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-700 dark:text-amber-400">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Nueva clase en fecha seleccionada</span>
          </div>
        )}

        {/* Chip de Métricas de la Sesión */}
        {!isFeriado && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{presentes} Pres.</span>
            <span className="text-emerald-600/40">•</span>
            <span className="text-rose-600 dark:text-rose-400">{ausentes} Aus.</span>
            <span className="text-emerald-600/40">•</span>
            <span className="font-mono">{pctDia}%</span>
          </div>
        )}
      </div>

      {/* Botones de Acción Masiva y Reportes */}
      <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end w-full lg:w-auto">
        {!isLicenciaDocente && !isFeriado && (
          <>
            {/* [ Marcar Todos Presentes ] */}
            <Button
              variant="outline"
              size="sm"
              icon={CheckCheck}
              onClick={onMarcarTodosPresentes}
              loading={saving}
              className="text-xs font-bold border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 touch-target-44 min-h-[44px]"
              title="Asignar estado PRESENTE a todos los alumnos activos en esta fecha"
            >
              <span>Marcar Todos Presentes</span>
            </Button>

            {/* [ Marcar Todos Ausentes ] */}
            <Button
              variant="outline"
              size="sm"
              icon={X}
              onClick={onMarcarTodosAusentes}
              loading={saving}
              className="text-xs font-bold border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 touch-target-44 min-h-[44px]"
              title="Asignar inasistencia general a toda la nómina en esta fecha"
            >
              <span>Marcar Todos Ausentes</span>
            </Button>
          </>
        )}

        {/* Falta Docente / Licencia Decreto 1092 */}
        <Button
          variant="outline"
          size="sm"
          icon={ShieldAlert}
          onClick={onOpenLicenciasModal || onOpenFaltaDocenteModal}
          className="text-xs font-semibold border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 touch-target-44 min-h-[44px]"
          title="Abrir centro de control y registro de licencias docentes (Decreto 1092)"
        >
          <span className="hidden sm:inline">Licencia Docente</span>
          <span className="sm:hidden">Licencia</span>
        </Button>

        {/* Exportar Excel */}
        <Button
          variant="outline"
          size="sm"
          icon={FileSpreadsheet}
          onClick={onExportExcel}
          className="text-xs font-semibold touch-target-44 min-h-[44px]"
          title="Exportar planilla de asistencia acumulada a Excel"
        >
          <span className="hidden sm:inline">Excel</span>
        </Button>

        {/* Imprimir Planilla */}
        <Button
          variant="outline"
          size="sm"
          icon={Printer}
          onClick={onOpenPrintModal}
          className="text-xs font-semibold touch-target-44 min-h-[44px]"
          title="Imprimir planilla reglamentaria de asistencia"
        >
          <span className="hidden sm:inline">Imprimir</span>
        </Button>
      </div>
    </div>
  );
}
