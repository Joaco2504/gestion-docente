import React from 'react';
import { TrendingUp, Users, BookOpen, Clock } from 'lucide-react';
import CustomSelect from '../../../components/common/CustomSelect';
import { useCountUp } from '../../../hooks/useCountUp';

export default function QuickMetricsCard({
  displayedMetrics,
  selectedMetricsCatedraId,
  onSelectMetricsCatedraId,
  metricsCatedraOptions,
  activeCiclo
}) {
  const animatedAttendance = useCountUp(displayedMetrics.averageAttendance, 700);
  const animatedStudents = useCountUp(displayedMetrics.totalStudents, 600);
  const animatedClasses = useCountUp(displayedMetrics.totalClasses, 600);
  const animatedCatedras = useCountUp(displayedMetrics.activeCatedras, 600);

  return (
    <div className="backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 relative overflow-hidden group">
      <div>
        {/* Cabecera sin solapamientos (flex-between) */}
        <div className="flex items-center justify-between gap-2 w-full mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
              Métricas Rápidas
            </span>
          </div>
          <span className={`shrink-0 text-xs px-2.5 py-0.5 rounded-full border ${
            displayedMetrics.averageAttendance >= 75
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            {displayedMetrics.averageAttendance >= 75 ? 'Asistencia Óptima' : 'En Seguimiento'}
          </span>
        </div>

        {/* Selector desplegable para filtrar por Cátedra o Consolidado General */}
        <div className="mb-4">
          <CustomSelect
            value={selectedMetricsCatedraId}
            onChange={(val) => {
              const targetVal = typeof val === 'object' && val?.target ? val.target.value : val;
              onSelectMetricsCatedraId(targetVal);
            }}
            options={metricsCatedraOptions}
            placeholder="Consolidado General"
            className="w-full text-xs"
            buttonClassName="py-1.5 px-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl font-medium"
          />
        </div>

        {/* Layout Horizontal 2 Columnas (PC/Desktop): Col 1 Donut, Col 2 Contadores */}
        <div className="grid grid-cols-1 sm:grid-cols-[128px_1fr] items-center gap-4 py-2">
          {/* Columna 1: Donut Chart con porcentaje de asistencia centrado */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 mx-auto flex items-center justify-center shrink-0">
            <svg className="w-28 h-28 sm:w-32 sm:h-32 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                className="stroke-slate-200/80 dark:stroke-slate-800"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                className={`transition-all duration-1000 ease-out ${
                  displayedMetrics.averageAttendance >= 75
                    ? 'stroke-emerald-500 dark:stroke-emerald-400'
                    : 'stroke-amber-500 dark:stroke-amber-400'
                }`}
                strokeWidth="10"
                strokeDasharray={251.3}
                strokeDashoffset={251.3 - (251.3 * Math.min(displayedMetrics.averageAttendance, 100)) / 100}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-white leading-tight">
                {animatedAttendance}%
              </span>
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5 leading-none">
                ASISTENCIA
              </span>
            </div>
          </div>

          {/* Columna 2: 3 contadores con texto completo sin truncado */}
          <div className="grid grid-cols-1 gap-2 w-full">
            <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 whitespace-normal">
                <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Alumnos Activos:</span>
              </span>
              <span className="text-sm font-bold font-mono text-slate-900 dark:text-white shrink-0">
                {animatedStudents}
              </span>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 whitespace-normal">
                <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{displayedMetrics.isFiltered ? 'Materia:' : 'Cátedras:'}</span>
              </span>
              <span className="text-sm font-bold font-mono text-slate-900 dark:text-white shrink-0">
                {displayedMetrics.isFiltered ? '1 Activa' : animatedCatedras}
              </span>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 whitespace-normal">
                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Clases Totales:</span>
              </span>
              <span className="text-sm font-bold font-mono text-slate-900 dark:text-white shrink-0">
                {animatedClasses}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs">
        <span className="text-[11px] text-text-muted font-mono flex items-center gap-1.5 truncate max-w-[200px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
          <span className="truncate">
            {displayedMetrics.isFiltered ? displayedMetrics.catedraNombre : 'Datos sincronizados'}
          </span>
        </span>
        <span className="text-[11px] font-semibold text-primary shrink-0">Ciclo {activeCiclo?.anio || '2026'}</span>
      </div>
    </div>
  );
}
