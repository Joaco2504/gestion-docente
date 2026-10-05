import React from 'react';
import { Clock, Plus, CalendarDays } from 'lucide-react';
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
            <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
              Agenda Crítica & Fechas Importantes
            </h2>
            <p className="text-[11px] text-text-muted">
              Compromisos, exámenes, mesas y cierres previstos en los próximos 15 días
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenNewEventModal}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Crear Recordatorio</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="h-24 rounded-2xl bg-surface-hover animate-pulse" />
          <div className="h-24 rounded-2xl bg-surface-hover animate-pulse" />
          <div className="h-24 rounded-2xl bg-surface-hover animate-pulse" />
        </div>
      ) : agendaItems.length === 0 ? (
        /* Estado vacío Bento elegante si no hay eventos próximos con ilustración */
        <div className="backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 sm:p-8 text-center space-y-3 shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] flex flex-col items-center justify-center animate-fadeInUp">
          <EmptyStateIllustration className="w-28 h-28 sm:w-36 sm:h-36 mx-auto" />
          <div>
            <h3 className="text-sm sm:text-base font-bold text-text-primary">
              No tienes compromisos ni exámenes programados para los próximos 15 días
            </h3>
            <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
              Tu agenda está al día. Puedes registrar mesas examinadoras, reuniones institucionales o entregas de notas.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={Plus}
            onClick={onOpenNewEventModal}
            className="text-xs mx-auto active:scale-95 duration-100"
          >
            Crear Recordatorio / Evento
          </Button>
        </div>
      ) : (
        /* Grilla de eventos próximos ordenados */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {agendaItems.map((item) => {
            const styles = getAgendaColorStyles(item.tipo);
            const IconComp = styles.icon;
            const relativeTag = getRelativeDateLabel(item.fecha);

            return (
              <div
                key={item.id}
                className={`backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] flex flex-col justify-between gap-3 ${styles.cardBg}`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${styles.iconColor} bg-surface`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border mb-1 ${styles.badge}`}>
                        {styles.label}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-text-primary leading-snug line-clamp-2">
                        {item.titulo}
                      </h4>
                    </div>
                  </div>

                  <span className="shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-surface border border-surface-border text-text-secondary">
                    {relativeTag}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-surface-border/50 text-text-muted font-mono">
                  <span className="flex items-center gap-1 font-semibold text-text-secondary">
                    <CalendarDays className="w-3 h-3 text-text-muted" />
                    {formatFechaLegible(item.fecha)}
                  </span>
                  {item.hora && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-text-muted" />
                      {item.hora} hs
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
