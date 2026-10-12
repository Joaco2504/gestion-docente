import React from 'react';
import { Plus, ArrowRight } from 'lucide-react';
import Button from '../common/Button';
import { formatFechaLegible, getTodayYMD } from '../../lib/dateUtils';
import { obtenerFeriado } from '../../utils/feriadosAcademicos';

function safeIsoDate(d, fallback = '') {
  if (!d) return fallback;
  const dateObj = d instanceof Date ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return fallback;
  try {
    return dateObj.toISOString().split('T')[0];
  } catch (_) {
    return fallback;
  }
}

export default function CalendarAgendaView({
  currentDate,
  DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
  regularClassesList = [],
  allFilteredEvents = [],
  feriadosMap,
  getItemDesign,
  onSelectEvent,
  onAddEventForToday,
  onNavigateAttendance
}) {
  const diaStr = safeIsoDate(currentDate, getTodayYMD());
  const feriadoDia = feriadosMap?.get(diaStr) || obtenerFeriado(diaStr);
  const esProv = feriadoDia && (feriadoDia.tipo || '').toLowerCase() === 'provincial';

  const currDayName = DAYS_OF_WEEK[(currentDate.getDay() + 6) % 7];

  const dayClasses = regularClassesList
    .filter(c => c.dia_semana === currDayName)
    .map(c => ({
      ...c,
      hora_inicio: c.desde,
      hora_fin: c.hasta
    }));

  const dayEvents = allFilteredEvents
    .filter(e => (e.fecha_inicio || e.fecha || '').startsWith(diaStr))
    .map(e => ({
      ...e,
      hora_inicio: e.fecha_inicio ? e.fecha_inicio.substring(11, 16) : (e.hora_inicio || '18:00'),
      hora_fin: e.fecha_fin ? e.fecha_fin.substring(11, 16) : (e.hora_fin || '20:00')
    }));

  const allItems = [...dayClasses, ...dayEvents].sort((a, b) => 
    (a.hora_inicio || '').localeCompare(b.hora_inicio || '')
  );

  return (
    <div className="space-y-4" data-testid="calendar-agenda-view">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Agenda del {formatFechaLegible(currentDate)}
          </h3>
          <p className="text-xs text-slate-400">
            Horarios de ingreso, dictado y cierre en orden cronológico
          </p>
          {feriadoDia && (
            <div className="mt-2 inline-flex items-center gap-2 bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/25 text-xs px-3 py-1.5 rounded-xl shadow-2xs">
              <span className="text-sm">{esProv ? '🏛️' : '🇦🇷'}</span>
              <span className="font-bold">{feriadoDia.nombre}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold">
                {esProv ? 'Feriado Provincial Catamarca' : 'Feriado Nacional'} • No computable
              </span>
            </div>
          )}
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={onAddEventForToday}
          icon={Plus}
        >
          Agregar a esta jornada
        </Button>
      </div>

      {/* Lista cronológica del día */}
      <div className="space-y-3">
        {allItems.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs italic">
            No hay clases ni exámenes asignados para esta fecha.
          </div>
        ) : (
          allItems.map(item => {
            const design = getItemDesign(item);
            const EvIcon = design.Icon;
            return (
              <div
                key={item.id}
                onClick={() => onSelectEvent?.(item)}
                style={{
                  borderLeftColor: design.bgColor
                }}
                className={`p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 border-l-[6px] transition-colors duration-150 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 shadow-xs ${
                  design.isMesa 
                    ? 'bg-indigo-50/25 dark:bg-indigo-950/20 border-dashed border-r-indigo-300 dark:border-r-indigo-800/50' 
                    : 'bg-surface'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span 
                      style={{
                        backgroundColor: design.bgColor,
                        color: design.textColor
                      }}
                      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs"
                    >
                      <EvIcon className="w-3 h-3" />
                      <span>{design.tag}</span>
                    </span>

                    {design.isMesa && design.catedraColor && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 inline-flex items-center gap-1 border border-slate-200 dark:border-slate-700">
                        <span 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: design.catedraColor }}
                        />
                        <span>{item.catedra_nombre || 'Cátedra'}</span>
                      </span>
                    )}

                    <span className="font-mono font-bold text-xs text-slate-600 dark:text-slate-300">
                      {item.hora_inicio} - {item.hora_fin} hs
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {item.titulo}
                  </h4>

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono flex-wrap">
                    <span>📍 {item.aula}</span>
                    <span>•</span>
                    <span>{item.institucion}</span>
                    {item.alumnos_count && (
                      <>
                        <span>•</span>
                        <span>👥 {item.alumnos_count} inscriptos</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {feriadoDia ? (
                    <button
                      type="button"
                      disabled
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold opacity-75 cursor-not-allowed border border-slate-300 dark:border-slate-700"
                      title={`Sin clases presenciales: ${feriadoDia.nombre}`}
                    >
                      <span>🔒 Sin Clases (Feriado)</span>
                    </button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateAttendance?.(item);
                      }}
                    >
                      <span>Asistencia</span>
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
