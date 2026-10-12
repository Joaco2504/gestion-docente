import React from 'react';

export default function CalendarProgressWidget() {
  return (
    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
        Progreso de Cursada y Cumplimiento
      </span>

      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-slate-700 dark:text-slate-300">Clases Dictadas del Cuatrimestre</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">75%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full w-[75%]" />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-slate-700 dark:text-slate-300">Carga de Calificaciones</span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">90%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full w-[90%]" />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-slate-700 dark:text-slate-300">Promedio Asistencia RAM</span>
            <span className="font-mono font-bold text-teal-600 dark:text-teal-400">82%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full w-[82%]" />
          </div>
        </div>
      </div>
    </div>
  );
}
