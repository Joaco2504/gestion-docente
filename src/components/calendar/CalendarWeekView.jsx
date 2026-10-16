import React, { useRef, useEffect } from 'react';

function safeIsoDate(d, fallback = '') {
  if (!d) return fallback;
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  const dateObj = d instanceof Date ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return fallback;
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function CalendarWeekView({
  weekDays,
  currentDate,
  DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
  HOURS_24 = Array.from({ length: 17 }, (_, i) => i + 7),
  HOUR_ROW_HEIGHT = 80,
  currentTimeIndicator,
  feriadosMap,
  regularClassesList,
  allFilteredEvents,
  getItemDesign,
  onSelectEvent,
  onSelectDay,
  onNewEventAt
}) {
  const scrollContainerRef = useRef(null);
  const autoScrolledWeekRef = useRef(null);

  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const targetDate = currentDate instanceof Date ? currentDate : new Date();
    const currentWeekKey = `${targetDate.getFullYear()}-${targetDate.getMonth()}-${targetDate.getDate()}`;
    if (autoScrolledWeekRef.current === currentWeekKey) return;

    const timer = setTimeout(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const ahora = new Date();
      const horaActual = ahora.getHours();
      const minutosActuales = ahora.getMinutes();

      // Altura del slot horario
      const hourSlot = container.querySelector('[data-hour-row]');
      const hourHeight = hourSlot ? hourSlot.getBoundingClientRect().height : HOUR_ROW_HEIGHT;

      // Base: 07:00 hs (primer slot de HOURS_24). Margen superior: 30 min (0.5 hs)
      const baseHour = HOURS_24[0] ?? 7;
      const offsetHoras = Math.max(0, (horaActual - baseHour + minutosActuales / 60) - 0.5);
      const targetScrollTop = offsetHoras * hourHeight;

      container.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });

      autoScrolledWeekRef.current = currentWeekKey;
    }, 150);

    return () => clearTimeout(timer);
  }, [currentDate, weekDays, HOURS_24, HOUR_ROW_HEIGHT]);

  return (
    <div 
      ref={scrollContainerRef}
      className="w-full max-h-[660px] overflow-y-auto overflow-x-auto overscroll-contain select-none relative rounded-2xl touch-pan-x touch-pan-y" 
      data-testid="calendar-week-view"
    >
      <div className="min-w-[780px]">
        {/* FRANJA DE DÍAS DE LA SEMANA STICKY */}
        <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md grid grid-cols-8 gap-2 pb-4 pt-1 border-b border-slate-100 dark:border-slate-800/80">
          {/* Espacio para la columna de horas */}
          <div className="w-16 text-right pr-3 font-mono text-xs text-slate-400 self-end pb-2">
            GMT-3
          </div>

          {/* 7 Columnas de días */}
          {weekDays.map((d, idx) => {
            const dayName = DAYS_OF_WEEK[idx];
            const isToday = d.toDateString() === new Date().toDateString();
            const dayStr = safeIsoDate(d);
            const feriado = feriadosMap?.get(dayStr);

            return (
              <div
                key={idx}
                onClick={() => onSelectDay?.(d)}
                className={`
                  flex flex-col items-center justify-center p-2 rounded-2xl cursor-pointer transition-[background-color,color,transform,box-shadow] duration-150 text-center
                  ${isToday
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 scale-105'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400'
                  }
                `}
              >
                <span className="text-xs uppercase tracking-wider font-semibold">
                  {dayName.slice(0, 3)}
                </span>
                <span className={`text-xl font-bold font-mono ${isToday ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                  {d.getDate()}
                </span>
                {feriado && (
                  <span 
                    className="mt-1 bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 text-[9px] font-mono px-1 py-0.5 rounded truncate max-w-[84px] block"
                    title={`${feriado.nombre} (${feriado.tipo === 'provincial' ? 'Feriado Provincial Catamarca' : 'Feriado Nacional'})`}
                  >
                    {feriado.nombre}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* MATRIZ HORARIA 24 HORAS */}
        <div className="relative mt-2">
          {/* Línea horizontal en tiempo real con punto pulsante */}
          {currentTimeIndicator && (
            <div
              style={{ top: `${currentTimeIndicator.top}px` }}
              className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/30 animate-pulse -ml-1" />
              <div className="w-full h-0.5 bg-emerald-500 shadow-sm" />
            </div>
          )}

          {/* Filas de horas (07:00 a 23:00 hs) */}
          {HOURS_24.map((hour) => {
            const hourStr = `${String(hour).padStart(2, '0')}:00 hs`;
            return (
              <div
                key={hour}
                data-hour-row="true"
                style={{ height: `${HOUR_ROW_HEIGHT}px` }}
                className="grid grid-cols-8 gap-2 border-b border-slate-100 dark:border-slate-800/60 relative"
              >
                {/* Eje de Horas */}
                <div className="w-16 font-mono text-xs text-slate-400 dark:text-slate-500 text-right pr-3 -mt-2.5">
                  {hourStr}
                </div>

                {/* 7 Celdas de tiempo correspondientes a cada día */}
                {Array.from({ length: 7 }).map((_, dayIdx) => (
                  <div
                    key={dayIdx}
                    className="border-l border-slate-100/80 dark:border-slate-800/40 h-full relative group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                    onClick={() => {
                      const targetDate = weekDays[dayIdx];
                      onNewEventAt?.({ targetDate, hour });
                    }}
                  />
                ))}
              </div>
            );
          })}

          {/* EVENTOS ACADÉMICOS POSICIONADOS EN LA MATRIZ */}
          {weekDays.map((dayDate, dayIdx) => {
            const dayName = DAYS_OF_WEEK[dayIdx];
            const dayStr = safeIsoDate(dayDate);

            // Clases regulares correspondientes a este día
            const dayRegularClasses = (regularClassesList || []).filter(c => c.dia_semana === dayName);

            // Eventos fijados de este día
            const dayCustomEvents = (allFilteredEvents || []).filter(e => {
              const evDate = (e.fecha_inicio || e.fecha || '').split('T')[0];
              return evDate === dayStr;
            });

            const dayAllItems = [
              ...dayRegularClasses.map(c => ({
                ...c,
                hora_inicio: c.desde,
                hora_fin: c.hasta
              })),
              ...dayCustomEvents.map(e => ({
                ...e,
                hora_inicio: e.fecha_inicio ? e.fecha_inicio.substring(11, 16) : (e.hora_inicio || '18:00'),
                hora_fin: e.fecha_fin ? e.fecha_fin.substring(11, 16) : (e.hora_fin || '20:00')
              }))
            ].map((item) => {
              const [sh, sm] = (item.hora_inicio || '18:00').split(':').map(Number);
              const [eh, em] = (item.hora_fin || '20:00').split(':').map(Number);
              const startMinTotal = (isNaN(sh) ? 18 : sh) * 60 + (isNaN(sm) ? 0 : sm);
              const endMinTotal = Math.max(startMinTotal + 60, (isNaN(eh) ? 20 : eh) * 60 + (isNaN(em) ? 0 : em));
              return { ...item, startMinTotal, endMinTotal };
            });

            return (
              <React.Fragment key={`events-col-${dayIdx}`}>
                {dayAllItems.map((item, itemIdx) => {
                  const baseMinTotal = 7 * 60; // 07:00 hs base

                  // Detectar solapamientos en la misma columna de día
                  const overlapping = dayAllItems.filter(
                    other => other.startMinTotal < item.endMinTotal && other.endMinTotal > item.startMinTotal
                  );
                  const overlapCount = Math.max(1, overlapping.length);
                  const overlapIndex = Math.max(0, overlapping.indexOf(item));

                  const top = Math.max(0, ((item.startMinTotal - baseMinTotal) / 60) * HOUR_ROW_HEIGHT);
                  const durationHours = Math.max(1, (item.endMinTotal - item.startMinTotal) / 60);
                  const height = Math.max(56, durationHours * HOUR_ROW_HEIGHT - 6);

                  const design = getItemDesign(item);
                  const EvIcon = design.Icon;

                  // Columna en grid de 8 (col 1 es hora, cols 2-8 son días)
                  const dayColLeftPercent = (dayIdx + 1) * (100 / 8);
                  const dayColWidthPercent = (100 / 8) / overlapCount;
                  const colLeftPercent = dayColLeftPercent + overlapIndex * dayColWidthPercent;

                  return (
                    <div
                      key={item.id || `ev-${dayIdx}-${itemIdx}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent?.(item);
                      }}
                      style={{
                        top: `${top}px`,
                        left: `calc(${colLeftPercent}% + 3px)`,
                        width: `calc(${dayColWidthPercent}% - 6px)`,
                        height: `${height}px`,
                        backgroundColor: design.bgColor,
                        color: design.textColor
                      }}
                      className={`
                        absolute z-20 rounded-xl p-2.5 shadow-sm transition-[transform,box-shadow] duration-200 hover:scale-[1.02] hover:shadow-md cursor-pointer overflow-hidden flex flex-col justify-between
                        ${design.isMesa 
                          ? 'border-2 border-dashed border-indigo-300 ring-2 ring-indigo-500/40 shadow-indigo-500/20' 
                          : 'border border-black/10 dark:border-white/10'
                        }
                      `}
                    >
                      {/* Línea 1: Título de la materia o examen */}
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <EvIcon className="w-3.5 h-3.5 shrink-0 opacity-90" />
                            <h4 className="font-bold text-xs sm:text-sm truncate leading-tight">
                              {item.titulo}
                            </h4>
                          </div>
                        </div>

                        {/* Indicador de Cátedra para Mesas de Examen */}
                        {design.isMesa && design.catedraColor && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span
                              className="w-2 h-2 rounded-full shrink-0 ring-1 ring-white/80"
                              style={{ backgroundColor: design.catedraColor }}
                              title={`Cátedra: ${item.catedra_nombre || ''}`}
                            />
                            <span className="text-[10px] font-medium opacity-90 truncate">
                              {item.catedra_nombre || 'Materia'}
                            </span>
                          </div>
                        )}

                        {/* Línea 2: Horario en formato 24 hs */}
                        <div className="font-mono text-[11px] opacity-85 mt-1 font-semibold">
                          {item.hora_inicio} - {item.hora_fin} hs
                        </div>
                      </div>

                      {/* Línea 3: Micro-chips informativos */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono mt-1 pt-1 border-t border-black/10 dark:border-white/15 opacity-90">
                        <span className="truncate">📍 {item.aula || 'Aula 1'}</span>
                        {item.alumnos_count && (
                          <span>👥 {item.alumnos_count}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
