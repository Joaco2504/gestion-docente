import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  ChevronDown, 
  Clock, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import Card from '../../../components/common/Card';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';

export default function DashboardTodayFocus({
  user,
  upcomingClass,
  catedrasList = [],
  agendaItems = [],
  activeCiclo
}) {
  const navigate = useNavigate();
  const [showAlertsDetail, setShowAlertsDetail] = useState(false);

  // 1. Saludo según la hora
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'Buenos días';
    if (hour >= 12 && hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  const docenteName = user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Docente';

  // 2. Fecha formateada en español
  const formattedToday = useMemo(() => {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('es-AR', options);
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  }, []);

  // 3. Detección de Alertas Tempranas (Early Warnings)
  const alerts = useMemo(() => {
    const items = [];

    // A. Cátedras con asistencia crítica (< 75%)
    catedrasList.forEach((cat) => {
      if (cat.asistencia_promedio !== null && cat.asistencia_promedio < 75) {
        items.push({
          id: `asist-${cat.id}`,
          type: 'CRITICAL',
          catedraId: cat.id,
          title: `${cat.nombre}: Asistencia crítica (${cat.asistencia_promedio}%)`,
          description: 'Por debajo del 75% reglamentario. Riesgo de pérdida de regularidad.',
          actionLabel: 'Ver Asistencias',
          tab: 'asistencias'
        });
      }
    });

    // B. Cátedras activas sin clases registradas aún
    catedrasList.forEach((cat) => {
      if (cat.clases_count === 0 && (!cat.cursada_finalizada)) {
        items.push({
          id: `noclass-${cat.id}`,
          type: 'WARNING',
          catedraId: cat.id,
          title: `${cat.nombre}: Sin clases registradas`,
          description: 'Aún no se ha asentado ninguna clase en el libro de temas o asistencias.',
          actionLabel: 'Iniciar 1ª Clase',
          tab: 'asistencias'
        });
      }
    });

    // C. Eventos críticos en las próximas 48 horas
    const todayIso = new Date().toISOString().split('T')[0];
    const tomorrowIso = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    agendaItems.forEach((ev) => {
      if (ev.fecha === todayIso || ev.fecha === tomorrowIso) {
        items.push({
          id: `event-${ev.id}`,
          type: 'INFO',
          catedraId: null,
          title: `${ev.fecha === todayIso ? 'Hoy' : 'Mañana'}: ${ev.titulo}`,
          description: ev.hora ? `Programado a las ${ev.hora} hs.` : 'Compromiso académico en agenda.',
          actionLabel: 'Ver Calendario',
          url: '/calendario'
        });
      }
    });

    return items;
  }, [catedrasList, agendaItems]);

  const criticalCount = alerts.filter(a => a.type === 'CRITICAL').length;
  const warningCount = alerts.filter(a => a.type === 'WARNING').length;

  return (
    <Card variant="bento" padding="md" className="space-y-4 relative overflow-hidden" aria-label="Resumen del día">
      {/* Cabecera Principal "Hoy" */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap text-xs text-text-muted font-medium">
            <span className="flex items-center gap-1.5 text-primary font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedToday}</span>
            </span>
            <span>•</span>
            <Badge variant="secondary" size="xs">
              {activeCiclo ? (activeCiclo.nombre || `Ciclo ${activeCiclo.anio}`) : 'Ciclo Activo'}
            </Badge>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight flex items-center gap-2">
            <span>{greeting}, {docenteName}</span>
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          </h1>
        </div>

        {/* Estado Operativo Inmediato del Día */}
        <div className="flex items-center gap-2 shrink-0">
          {upcomingClass?.isToday ? (
            <Badge variant="promo" size="md" dot={true}>
              Clase programada para hoy
            </Badge>
          ) : (
            <Badge variant="secondary" size="md">
              <Clock className="w-3.5 h-3.5 text-text-muted mr-1" />
              Hoy sin clases fijas en horario
            </Badge>
          )}
        </div>
      </div>

      {/* Banner de Alerta Temprana y Riesgo Académico */}
      {alerts.length > 0 ? (
        <div className={`rounded-2xl border transition-[background-color,border-color] duration-150 p-3.5 sm:p-4 ${
          criticalCount > 0 
            ? 'bg-rose-500/[0.06] border-rose-500/25 text-rose-900 dark:text-rose-200' 
            : 'bg-amber-500/[0.06] border-amber-500/25 text-amber-900 dark:text-amber-200'
        }`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-surface shadow-xs shrink-0">
                {criticalCount > 0 ? (
                  <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold leading-tight truncate">
                  {criticalCount > 0 
                    ? `${criticalCount} cátedra${criticalCount > 1 ? 's' : ''} en riesgo de regularidad o atención urgente` 
                    : `${warningCount} materia${warningCount > 1 ? 's' : ''} pendiente${warningCount > 1 ? 's' : ''} de inicio de clases o compromisos próximos`}
                </p>
                <p className="text-[11px] text-text-muted truncate hidden sm:block mt-0.5">
                  Revisá las materias para tomar acciones preventivas reglamentarias.
                </p>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAlertsDetail(prev => !prev)}
              aria-expanded={showAlertsDetail}
              className="text-xs font-semibold shrink-0"
            >
              <span>{showAlertsDetail ? 'Ocultar' : 'Revisar'} ({alerts.length})</span>
              {showAlertsDetail ? <ChevronDown className="w-3.5 h-3.5 ml-1" /> : <ChevronRight className="w-3.5 h-3.5 ml-1" />}
            </Button>
          </div>

          {/* Desplegable con detalle de alertas */}
          {showAlertsDetail && (
            <div className="mt-3 pt-3 border-t border-surface-border/60 space-y-2 animate-fadeIn">
              {alerts.map((al) => (
                <div 
                  key={al.id}
                  className="p-3 rounded-xl bg-surface border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-text-primary shadow-xs"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{al.title}</p>
                    <p className="text-[11px] text-text-muted">{al.description}</p>
                  </div>

                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      if (al.url) {
                        navigate(al.url);
                      } else if (al.catedraId) {
                        navigate(`/catedra/${al.catedraId}?tab=${al.tab || 'asistencias'}`);
                      }
                    }}
                    className="text-xs font-bold text-primary hover:text-primary-hover shrink-0 self-end sm:self-center"
                  >
                    <span>{al.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Trayectorias académicas al día: todas las cátedras cumplen con los parámetros reglamentarios.</span>
        </div>
      )}
    </Card>
  );
}
