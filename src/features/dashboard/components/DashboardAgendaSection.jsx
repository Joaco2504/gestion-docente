import React from 'react';
import { Clock, Plus, CalendarDays } from 'lucide-react';
import Card from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import Badge from '../../../components/common/Badge';
import SectionHeader from '../../../components/common/SectionHeader';
import { EmptyStateIllustration } from '../../../components/illustrations';
import { getAgendaColorStyles } from '../utils/dashboardHelpers';
import { formatFechaLegible, getRelativeDateLabel } from '../../../lib/dateUtils';

export default function DashboardAgendaSection({
  loading,
  agendaItems,
  onOpenNewEventModal
}) {
  return (
    <section className="space-y-3.5" aria-label="Agenda de compromisos">
      <SectionHeader
        title="Agenda Crítica & Fechas Importantes"
        subtitle="Compromisos, exámenes, mesas y cierres previstos en los próximos 15 días"
        icon={Clock}
        titleAs="h2"
        badge={
          agendaItems.length > 0 ? (
            <Badge variant="secondary" size="sm">
              {agendaItems.length}
            </Badge>
          ) : null
        }
        actions={
          <Button
            variant="ghost"
            size="sm"
            icon={Plus}
            onClick={onOpenNewEventModal}
            className="text-primary font-semibold"
            aria-label="Crear nuevo recordatorio o evento en la agenda"
          >
            Crear Recordatorio
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="h-24 rounded-2xl bg-surface-hover animate-pulse border border-surface-border" />
          <div className="h-24 rounded-2xl bg-surface-hover animate-pulse border border-surface-border" />
          <div className="h-24 rounded-2xl bg-surface-hover animate-pulse border border-surface-border" />
        </div>
      ) : agendaItems.length === 0 ? (
        /* Estado vacío Bento elegante si no hay eventos próximos con ilustración */
        <Card variant="bento" padding="lg" className="text-center space-y-3 flex flex-col items-center justify-center animate-fadeInUp">
          <EmptyStateIllustration className="w-28 h-28 sm:w-36 sm:h-36 mx-auto" />
          <div>
            <h3 className="text-sm sm:text-base font-bold text-text-primary">
              No tienes compromisos ni exámenes programados para los próximos 15 días
            </h3>
            <p className="text-xs text-text-muted mt-1 max-w-md mx-auto leading-relaxed">
              Tu agenda está al día. Puedes registrar mesas examinadoras, reuniones institucionales o entregas de notas.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={Plus}
            onClick={onOpenNewEventModal}
            className="text-xs mx-auto mt-2"
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
                variant="interactive"
                padding="sm"
                className={`flex flex-col justify-between gap-3 ${styles.cardBg}`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${styles.iconColor} bg-surface shadow-xs`}>
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

                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-surface-border/60 text-text-muted font-mono">
                  <span className="flex items-center gap-1 font-semibold text-text-primary">
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
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
