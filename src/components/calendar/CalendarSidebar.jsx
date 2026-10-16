import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Tag, 
  CheckSquare, 
  Square, 
  Bell, 
  BookOpen, 
  Bookmark, 
  CalendarRange, 
  GraduationCap 
} from 'lucide-react';
import Card from '../common/Card';
import CalendarProgressWidget from './CalendarProgressWidget';
import { DEFAULT_CURATED_COLORS, DEFAULT_MESA_COLOR } from '../../lib/colorTokens';

const SHORT_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

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

export default function CalendarSidebar({
  docenteNombre,
  miniCalDate,
  setMiniCalDate,
  miniCalDays,
  currentDate,
  setCurrentDate,
  allFilteredEvents,
  nextUpcomingItem,
  catedras,
  catFilters,
  setCatFilters,
  categoryFilters,
  setCategoryFilters,
  isLegendCollapsed,
  setIsLegendCollapsed,
  onTodayClick,
  showOnMobile = false
}) {
  return (
    <aside className={`${showOnMobile ? 'flex' : 'hidden'} lg:flex lg:col-span-4 xl:col-span-3 flex-col gap-5`} data-testid="calendar-sidebar">
      <Card variant="default" className="p-5 flex flex-col gap-5">
        
        {/* 1. CABECERA DEL DOCENTE */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl ring-2 ring-emerald-500/40 p-0.5 bg-emerald-500/10 flex items-center justify-center font-bold text-emerald-600 dark:text-emerald-400 text-sm shrink-0 shadow-xs">
              {docenteNombre.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('')}
            </div>
            <div className="truncate">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate leading-tight">
                {docenteNombre}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Docente Titular
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onTodayClick}
            className="relative p-2 rounded-xl border border-slate-200/70 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer shrink-0"
            title="Ir a fecha actual"
          >
            <Bell className="w-4 h-4" />
            {nextUpcomingItem && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>

        {/* 2. MINI-CALENDARIO MENSUAL INTERACTIVO */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold font-mono tracking-tight text-slate-800 dark:text-slate-200">
              {MONTH_NAMES[miniCalDate.getMonth()]} {miniCalDate.getFullYear()}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const d = new Date(miniCalDate);
                  d.setMonth(d.getMonth() - 1);
                  setMiniCalDate(d);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(miniCalDate);
                  d.setMonth(d.getMonth() + 1);
                  setMiniCalDate(d);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono text-slate-400 font-bold">
            {SHORT_DAYS.map((sd, i) => (
              <span key={i}>{sd}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {miniCalDays.map((d, i) => {
              if (!d) return <div key={`empty-min-${i}`} className="h-7 w-7" />;
              const isSelected = d.toDateString() === currentDate.toDateString();
              const isToday = d.toDateString() === new Date().toDateString();
              const dStr = safeIsoDate(d);
              const hasEvent = (allFilteredEvents || []).some(e => (e.fecha_inicio || e.fecha || '').startsWith(dStr));

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentDate(d)}
                  className={`
                    h-7 w-7 mx-auto rounded-lg text-xs font-mono font-medium transition-colors flex flex-col items-center justify-center relative cursor-pointer
                    ${isToday 
                      ? 'bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/20' 
                      : isSelected 
                        ? 'border border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-bold' 
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }
                  `}
                >
                  <span>{d.getDate()}</span>
                  {hasEvent && !isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 -mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. WIDGET DE PRÓXIMO COMPROMISO DESTACADO (BENTO) */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Próximo Compromiso</span>
            </span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
              En Vivo
            </span>
          </div>

          {nextUpcomingItem ? (
            <div className="space-y-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 line-clamp-1">
                {nextUpcomingItem.titulo}
              </h4>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-mono">
                <span>⏰ {nextUpcomingItem.hora_inicio} - {nextUpcomingItem.hora_fin} hs</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-emerald-500/10">
                <span className="truncate">📍 {nextUpcomingItem.aula}</span>
                <span className="truncate max-w-[120px]">{nextUpcomingItem.institucion}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic py-2 text-center">
              Sin compromisos pendientes
            </div>
          )}
        </div>

        {/* 4. FILTROS Y LEYENDA COLAPSABLE */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              <span>Filtros y Categorías</span>
            </span>
            <button
              type="button"
              onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}
              className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              {isLegendCollapsed ? 'Expandir' : 'Ocultar'}
            </button>
          </div>

          {!isLegendCollapsed && (
            <div className="space-y-3 text-xs">
              {/* Cátedras */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Cátedras</span>
                {(catedras || []).map(cat => {
                  const active = catFilters[cat.id] !== false;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCatFilters(prev => ({ ...prev, [cat.id]: !active }))}
                      className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color || DEFAULT_CURATED_COLORS[0].value }}
                        />
                        <span className={`truncate text-xs ${active ? 'text-slate-800 dark:text-slate-200 font-medium' : 'text-slate-400 line-through'}`}>
                          {cat.nombre}
                        </span>
                      </div>
                      {active ? (
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Categorías */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Tipos de Eventos</span>
                {[
                  { key: 'CLASE', label: 'Clases Regulares', Icon: BookOpen },
                  { key: 'TRIBUNAL_EXAMEN', label: 'Mesas de Examen', Icon: GraduationCap },
                  { key: 'EVALUACION', label: 'Parciales / Evaluaciones', Icon: CheckSquare },
                  { key: 'TRABAJO_PRACTICO', label: 'Entregas de TP', Icon: Bookmark },
                  { key: 'PERIODO', label: 'Períodos RAM', Icon: CalendarRange }
                ].map(({ key, label, Icon: CatIcon }) => {
                  const active = categoryFilters[key] !== false;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCategoryFilters(prev => ({ ...prev, [key]: !active }))}
                      className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate text-xs text-slate-700 dark:text-slate-300">
                        <CatIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className={active ? 'font-medium' : 'text-slate-400 line-through'}>{label}</span>
                      </div>
                      {active ? (
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 5. PROGRESO DE CURSADA Y CUMPLIMIENTO */}
        <CalendarProgressWidget />

      </Card>
    </aside>
  );
}
