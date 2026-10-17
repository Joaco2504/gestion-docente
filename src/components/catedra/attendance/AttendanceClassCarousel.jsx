import React, { useRef } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  History,
  Users,
  ShieldAlert
} from 'lucide-react';
import { formatFechaDMY } from '../../../lib/dateUtils';
import { isFechaCubiertaPorLicencias } from '../../../services/licenciasService';
import Badge from '../../common/Badge';

/**
 * AttendanceClassCarousel
 * Carrusel horizontal ergonómico y táctil de clases registradas en la cátedra.
 * Permite seleccionar cualquier clase dictada para revisar o corregir asistencia.
 */
export default function AttendanceClassCarousel({
  clases = [],
  selectedClaseId = null,
  selectedFecha = '',
  asistencias = [],
  licenciasDocente = [],
  catedraId = null,
  onSelectClase,
  onSelectNuevaClaseHoy
}) {
  const scrollContainerRef = useRef(null);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const offset = direction === 'left' ? -240 : 240;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Calcular asistencia registrada por cada clase
  const getClaseAttendanceStats = (clase) => {
    const list = (asistencias || []).filter(
      a => a.clase_id === clase.id || a.fecha === clase.fecha
    );
    const total = list.length;
    const presentes = list.filter(
      a => a.estado === 'PRESENTE' || a.estado === 'JUSTIFICADO'
    ).length;
    return { total, presentes, hasRecords: total > 0 };
  };

  return (
    <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs space-y-3">
      {/* Cabecera del Carrusel */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <History className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary truncate">
                Clases Registradas
              </h3>
              <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0.5">
                {clases.length}
              </Badge>
            </div>
            <p className="text-[11px] text-text-muted truncate">
              Haz clic en cualquier clase para ver o editar la asistencia de ese día.
            </p>
          </div>
        </div>

        {/* Acciones de Navegación del Carrusel */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onSelectNuevaClaseHoy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer touch-target-44 min-h-[36px]"
            title="Seleccionar la fecha de hoy para una nueva clase"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nueva Clase (Hoy)</span>
            <span className="sm:hidden">Hoy</span>
          </button>

          {clases.length > 3 && (
            <div className="hidden md:flex items-center gap-1 ml-1">
              <button
                type="button"
                onClick={() => scroll('left')}
                aria-label="Desplazar a la izquierda"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-text-muted hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                aria-label="Desplazar a la derecha"
                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-text-muted hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lista Deslizable de Clases */}
      {clases.length === 0 ? (
        <div className="py-6 px-4 text-center rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800">
          <Calendar className="w-6 h-6 mx-auto text-text-muted/50 mb-1.5" />
          <p className="text-xs font-semibold text-text-primary">
            No hay clases registradas en esta cátedra.
          </p>
          <p className="text-[11px] text-text-muted mt-0.5">
            Elige una fecha en el panel inferior y marca asistencia para crear la primera clase automáticamente.
          </p>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin overscroll-contain snap-x"
        >
          {clases.map((c, idx) => {
            const isSelected = selectedClaseId 
              ? c.id === selectedClaseId 
              : c.fecha === selectedFecha;
            const stats = getClaseAttendanceStats(c);
            const formattedDate = formatFechaDMY(c.fecha).replace(/-/g, '/');
            const coverage = isFechaCubiertaPorLicencias(c.fecha, licenciasDocente, catedraId);
            const isLicencia = c.estado === 'DOCENTE_AUSENTE' || Boolean(c.articulo_licencia) || coverage.cubierta;
            const licenciaArticulo = c.articulo_licencia || (coverage.licencia?.articulo_codigo || coverage.licencia?.articulo);

            let cardStyle = 'border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-900/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700';
            if (isLicencia) {
              cardStyle = isSelected
                ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 shadow-xs ring-2 ring-amber-500/30'
                : 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10 hover:border-amber-500/60';
            } else if (isSelected) {
              cardStyle = 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 shadow-xs ring-2 ring-emerald-500/30';
            }

            return (
              <button
                key={c.id || idx}
                type="button"
                onClick={() => onSelectClase?.(c)}
                className={`group relative flex flex-col items-start gap-1 p-2.5 rounded-xl border transition-all cursor-pointer min-w-[145px] max-w-[180px] shrink-0 snap-start text-left touch-target-44 ${cardStyle}`}
                title={isLicencia ? `Licencia Docente registrada (${formattedDate})` : `Ver y editar asistencia del ${formattedDate}`}
              >
                {/* Línea 1: Fecha e Indicador de Selección */}
                <div className="w-full flex items-center justify-between gap-1">
                  <span className={`font-mono text-xs font-bold ${
                    isSelected
                      ? isLicencia ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'
                      : isLicencia ? 'text-amber-600 dark:text-amber-400' : 'text-text-primary'
                  }`}>
                    {formattedDate}
                  </span>
                  <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                    isLicencia
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-text-muted'
                  }`}>
                    {isLicencia ? 'LIC' : `N° ${c.numero_clase || (clases.length - idx)}`}
                  </span>
                </div>

                {/* Línea 2: Tema de la Clase o Licencia */}
                <div className={`w-full text-[11px] truncate font-medium ${
                  isLicencia ? 'text-amber-700 dark:text-amber-300 font-semibold' : 'text-text-muted'
                }`}>
                  {isLicencia 
                    ? (licenciaArticulo || c.motivo_inasistencia || 'Licencia Docente')
                    : (c.tema || 'Clase regular')}
                </div>

                {/* Línea 3: Chip de Asistencia Tomada o Licencia */}
                <div className="w-full pt-1 mt-0.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-mono">
                  {isLicencia ? (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold truncate">
                      <ShieldAlert className="w-3 h-3 shrink-0" />
                      <span>🛡️ Licencia</span>
                    </span>
                  ) : stats.hasRecords ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{stats.presentes} presentes</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-text-muted">
                      <Clock className="w-3 h-3" />
                      <span>Sin registros</span>
                    </span>
                  )}
                  {isSelected && (
                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                      isLicencia ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
