import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from '../common/Button';

export function CalendarSkeleton() {
  return (
    <div 
      className="w-full max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-6 min-h-[calc(100vh-5rem)] font-sans antialiased animate-pulse" 
      data-testid="calendar-loading-skeleton"
    >
      <aside className="hidden lg:flex lg:col-span-4 xl:col-span-3 flex-col gap-5">
        <div className="p-5 rounded-3xl bg-surface border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          </div>
          <div className="h-52 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
        </div>
      </aside>
      <main className="lg:col-span-8 xl:col-span-9 flex flex-col gap-5">
        <div className="p-4 sm:p-5 rounded-3xl bg-surface border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="h-8 w-44 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-8 w-60 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
        <div className="p-6 rounded-3xl bg-surface border border-slate-200/80 dark:border-slate-800 min-h-[500px]" />
      </main>
    </div>
  );
}

export function CalendarErrorState({ onRetry, onGoHome }) {
  return (
    <div 
      className="w-full max-w-xl mx-auto p-6 sm:p-8 rounded-3xl bg-surface border border-rose-500/20 shadow-xl my-12 text-center" 
      data-testid="calendar-error-state"
    >
      <div className="w-14 h-14 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
        Error al cargar el calendario
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
        No pudimos sincronizar los eventos y mesas de examen. Verifica tu conexión o reintenta.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Button variant="primary" onClick={onRetry} icon={RefreshCw}>
          Reintentar carga
        </Button>
        <Button variant="outline" onClick={onGoHome}>
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}
