import React from 'react';

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

export default function CalendarMonthView({
  mainCalMonthDays,
  DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
  currentDate,
  feriadosMap,
  allFilteredEvents,
  getItemDesign,
  onSelectEvent,
  onSelectDay
}) {
  return (
    <div className="space-y-3" data-testid="calendar-month-view">
      {/* Cabecera de días de la semana */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-mono font-bold text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
        {DAYS_OF_WEEK.map((d, i) => (
          <span key={i} title={d} className="truncate">
            <span className="hidden xl:inline">{d}</span>
            <span className="inline xl:hidden">{d.slice(0, 3)}</span>
          </span>
        ))}
      </div>

      {/* Grilla mensual de días */}
      <div className="grid grid-cols-7 gap-2">
        {mainCalMonthDays.map((d, idx) => {
          if (!d) return <div key={`empty-m-${idx}`} className="min-h-[88px] bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl" />;

          const dStr = safeIsoDate(d);
          const isToday = d.toDateString() === new Date().toDateString();
          const isSelected = d.toDateString() === currentDate.toDateString();
          const feriado = feriadosMap?.get(dStr);

          const dayEvents = (allFilteredEvents || []).filter(e => {
            const evDate = (e.fecha_inicio || e.fecha || '').split('T')[0];
            return evDate === dStr;
          });

          return (
            <div
              key={idx}
              onClick={() => onSelectDay?.(d)}
              className={`
                min-h-[88px] p-2 rounded-2xl border transition-colors duration-150 cursor-pointer flex flex-col justify-between overflow-hidden min-w-0
                ${isToday 
                  ? 'border-2 border-emerald-500 bg-emerald-500/5' 
                  : isSelected
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-slate-200/70 dark:border-slate-800/80 hover:border-emerald-400/50 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <span className={`font-mono font-bold text-xs ${isToday ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-800 dark:text-slate-200'}`}>
                  {d.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </div>

              {feriado && (
                <span 
                  className="bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 text-[10px] font-mono px-1.5 py-0.5 rounded truncate block mt-0.5"
                  title={`${feriado.nombre} (${feriado.tipo === 'provincial' ? 'Feriado Provincial Catamarca' : 'Feriado Nacional'})`}
                >
                  {feriado.nombre}
                </span>
              )}

              <div className="space-y-1 overflow-hidden mt-1 min-w-0 max-w-full">
                {dayEvents.slice(0, 3).map((ev) => {
                  const design = getItemDesign(ev);
                  const EvIcon = design.Icon;
                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent?.(ev);
                      }}
                      style={{
                        backgroundColor: design.bgColor,
                        color: design.textColor
                      }}
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs hover:scale-[1.02] transition-transform min-w-0 max-w-full overflow-hidden ${
                        design.isMesa 
                          ? 'ring-1 ring-inset ring-white/60 border border-dashed border-indigo-300' 
                          : ''
                      }`}
                      title={ev.titulo}
                    >
                      <EvIcon className="w-2.5 h-2.5 shrink-0 opacity-90" />
                      <span className="truncate flex-1 min-w-0">{ev.titulo}</span>
                      {design.isMesa && design.catedraColor && (
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0 ring-1 ring-white/80"
                          style={{ backgroundColor: design.catedraColor }}
                          title={`Cátedra: ${ev.catedra_nombre || ''}`}
                        />
                      )}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <span className="text-[9px] font-mono text-slate-400 block text-right">
                    +{dayEvents.length - 3} más
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
