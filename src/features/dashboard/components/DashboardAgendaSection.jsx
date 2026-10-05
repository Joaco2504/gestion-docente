import React from 'react';
import { Clock, Plus, CalendarDays } from 'lucide-react';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import { EmptyStateIllustration } from '../../../components/illustrations';
import { getAgendaColorStyles } from '../utils/dashboardHelpers';
import { formatFechaLegible, getRelativeDateLabel } from '../../../lib/dateUtils';

export default function DashboardAgendaSection({
  loading,
  agendaItems,
  onOpenNewEventModal
}) {
  return (
    <section className="space-y-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Agenda Crítica & Fechas Importantes
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Compromisos, exámenes, mesas y cierres previstos en los próximos 15 días
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenNewEventModal}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer min-h-[44px] sm:min-h-[32px] px-2"
          aria-label="Crear nuevo recordatorio o evento en la agenda"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Crear Recordatorio</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="h-24 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
          <div className="h-24 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
          <div className="h-24 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
        </div>
      ) : agendaItems.length === 0 ? (
        /* Estado vacío Bento elegante si no hay eventos próximos con ilustración */
        <Card className="p-6 sm:p-8 text-center space-y-3 flex flex-col items-center justify-center animate-fadeInUp">
          <EmptyStateIllustration className="w-28 h-28 sm:w-36 sm:h-36 mx-auto" />
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              No tienes compromisos ni exámenes programados para los próximos 15 días
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Tu agenda está al día. Puedes registrar mesas examinadoras, reuniones institucionales o entregas de notas.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={Plus}
            onClick={onOpenNewEventModal}
            className="text-xs mx-auto active:scale-95 duration-100 min-h-[44px] sm:min-h-[36px]"
            aria-label="Crear recordatorio o evento"
          >
            Crear Recordatorio / Evento
          </Button>
        </Card>
      ) : (
        /* Grilla de eventos próximos ordenados */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {agendaItems.map((item) => {
            const styles = getAgendaColorStyles(item.tipo);
            const IconComp = styles.icon;
            const relativeTag = getRelativeDateLabel(item.fecha);

            return (
              <Card
                key={item.id}
                hover={true}
                className={`p-4 sm:p-5 flex flex-col justify-between gap-3 ${styles.cardBg}`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${styles.iconColor} bg-white dark:bg-slate-900`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border mb-1 ${styles.badge}`}>
                        {styles.label}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                        {item.titulo}
                      </h4>
                    </div>
                  </div>

                  <span className="shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400">
                    {relativeTag}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200/60 dark:border-white/5 text-slate-500 dark:text-slate-400 font-mono">
                  <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                    <CalendarDays className="w-3 h-3 text-slate-400" />
                    {formatFechaLegible(item.fecha)}
                  </span>
                  {item.hora && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {item.hora} hs
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
