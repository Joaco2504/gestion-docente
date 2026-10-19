import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Download, 
  Tag 
} from 'lucide-react';
import Button from '../common/Button';

export default function CalendarHeader({
  formattedHeaderRange,
  viewMode,
  setViewMode,
  onPrev,
  onToday,
  onNext,
  onOpenLegend,
  onOpenSync,
  onAddNew
}) {
  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
      <div className="min-w-0">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
          {formattedHeaderRange}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Agenda oficial del docente y sincronización horaria 24 hs
        </p>
      </div>

      <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
        {[
          { id: 'mensual', label: 'Mes' },
          { id: 'semanal', label: 'Semana' },
          { id: 'dia', label: 'Día' }
        ].map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setViewMode(v.id)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === v.id
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="sm" onClick={onPrev} title="Anterior" aria-label="Anterior" icon={ChevronLeft} />
          <Button variant="secondary" size="sm" onClick={onToday}>Hoy</Button>
          <Button variant="secondary" size="sm" onClick={onNext} title="Siguiente" aria-label="Siguiente" icon={ChevronRight} />
        </div>
        <Button variant="secondary" size="sm" onClick={onOpenLegend} icon={Tag} title="Leyenda de Colores">
          Leyenda
        </Button>
        <Button variant="secondary" size="sm" onClick={onOpenSync} icon={Download} title="Exportar .ics">
          <span className="hidden sm:inline">.ics</span>
        </Button>
        <Button 
          variant="primary" 
          size="sm" 
          onClick={onAddNew} 
          icon={Plus}
        >
          Agregar
        </Button>
      </div>
    </div>
  );
}
