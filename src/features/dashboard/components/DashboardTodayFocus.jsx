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
    <Card className="p-4 sm:p-6 space-y-4 relative overflow-hidden" aria-label="Resumen del día">
      {/* Cabecera Principal "Hoy" */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1.5 text-primary font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedToday}</span>
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-medium">
              {activeCiclo ? (activeCiclo.nombre || `Ciclo ${activeCiclo.anio}`) : 'Ciclo Activo'}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>{greeting}, {docenteName}</span>
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          </h1>
        </div>

        {/* Estado Operativo Inmediato del Día */}
        <div className="flex items-center gap-2">
          {upcomingClass?.isToday ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Clase programada para hoy</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-white/5 text-slate-600 dark:text-slate-300 text-xs font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Hoy sin clases fijas en horario</span>
            </div>
          )}
        </div>
      </div>

      {/* Banner de Alerta Temprana y Riesgo Académico */}
      {alerts.length > 0 ? (
        <div className={`rounded-xl border transition-all ${
          criticalCount > 0 
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300' 
            : 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300'
        } p-3 sm:p-3.5`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-lg bg-white/80 dark:bg-slate-900/80 shrink-0">
                {criticalCount > 0 ? (
                  <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight truncate">
                  {criticalCount > 0 
                    ? `${criticalCount} cátedra${criticalCount > 1 ? 's' : ''} en riesgo de regularidad o atención urgente` 
                    : `${warningCount} materia${warningCount > 1 ? 's' : ''} pendiente${warningCount > 1 ? 's' : ''} de inicio de clases o compromisos próximos`}
                </p>
                <p className="text-[11px] opacity-80 truncate hidden sm:block">
                  Haz clic para ver las materias y tomar acciones preventivas.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAlertsDetail(prev => !prev)}
              className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-white/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 transition-colors shrink-0 cursor-pointer min-h-[36px]"
              aria-expanded={showAlertsDetail}
              aria-label="Ver detalle de alertas tempranas"
            >
              <span>{showAlertsDetail ? 'Ocultar' : 'Revisar'} ({alerts.length})</span>
              {showAlertsDetail ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Desplegable con detalle de alertas */}
          {showAlertsDetail && (
            <div className="mt-3 pt-3 border-t border-rose-500/20 dark:border-amber-500/20 space-y-2 animate-fadeIn">
              {alerts.map((al) => (
                <div 
                  key={al.id}
                  className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-800 dark:text-slate-200"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{al.title}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{al.description}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (al.url) {
                        navigate(al.url);
                      } else if (al.catedraId) {
                        navigate(`/catedra/${al.catedraId}?tab=${al.tab || 'asistencias'}`);
                      }
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline shrink-0 cursor-pointer min-h-[32px]"
                  >
                    <span>{al.actionLabel}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Trayectorias académicas al día: todas las cátedras cumplen con los parámetros de asistencia y planificación.</span>
        </div>
      )}
    </Card>
  );
}
