import React from 'react';
import { TrendingUp, Users, BookOpen, Clock } from 'lucide-react';
import Card from '../../../components/common/Card';
import CustomSelect from '../../../components/common/CustomSelect';
import AttendanceGaugeChart from '../../../components/charts/AttendanceGaugeChart';
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
    <Card className="flex flex-col justify-between relative overflow-hidden group">
      <div>
        {/* Cabecera sin solapamientos (flex-between) */}
        <div className="flex items-center justify-between gap-2 w-full mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Métricas Rápidas
            </span>
          </div>
          <span className={`shrink-0 text-xs px-2.5 py-0.5 rounded-full border ${
            displayedMetrics.averageAttendance >= 75
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
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
            buttonClassName="py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl font-medium min-h-[44px] sm:min-h-[36px]"
            aria-label="Seleccionar cátedra para filtrar métricas rápidas"
          />
        </div>

        {/* Layout Horizontal 2 Columnas (PC/Desktop): Col 1 Donut, Col 2 Contadores */}
        <div className="grid grid-cols-1 sm:grid-cols-[128px_1fr] items-center gap-4 py-2">
          {/* Columna 1: Gauge Chart accesible con Recharts */}
          <div className="mx-auto flex items-center justify-center shrink-0">
            <AttendanceGaugeChart
              percentage={displayedMetrics.averageAttendance}
              animatedPercentage={animatedAttendance}
              size={128}
            />
          </div>

          {/* Columna 2: 3 contadores con texto completo sin truncado */}
          <div className="grid grid-cols-1 gap-2 w-full">
            <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 whitespace-normal">
                <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Alumnos Activos:</span>
              </span>
              <span className="text-xs font-bold font-mono text-slate-900 dark:text-white shrink-0">
                {animatedStudents}
              </span>
            </div>

            <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 whitespace-normal">
                <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Clases Dictadas:</span>
              </span>
              <span className="text-xs font-bold font-mono text-slate-900 dark:text-white shrink-0">
                {animatedClasses}
              </span>
            </div>

            <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 whitespace-normal">
                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Materias en Vista:</span>
              </span>
              <span className="text-xs font-bold font-mono text-slate-900 dark:text-white shrink-0">
                {animatedCatedras}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pie con Ciclo Lectivo */}
      <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span>Ciclo Lectivo:</span>
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          {activeCiclo ? (activeCiclo.nombre || `Año ${activeCiclo.anio}`) : 'Ciclo Anual Activo'}
        </span>
      </div>
    </Card>
  );
}
