import React from 'react';
import { TrendingUp, Users, BookOpen, Clock } from 'lucide-react';
import Card from '../../../components/common/Card';
import Badge from '../../../components/common/Badge';
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

  const isOptima = displayedMetrics.averageAttendance >= 75;

  return (
    <Card variant="bento" padding="md" className="flex flex-col justify-between relative overflow-hidden group">
      <div>
        {/* Cabecera sin solapamientos (flex-between) */}
        <div className="flex items-center justify-between gap-2 w-full mb-3 pb-2.5 border-b border-surface-border">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted whitespace-nowrap">
              Métricas Rápidas
            </span>
          </div>
          <Badge
            variant={isOptima ? "promo" : "recuperatorio"}
            size="sm"
            dot={true}
          >
            {isOptima ? 'Asistencia Óptima' : 'En Seguimiento'}
          </Badge>
        </div>

        {/* Selector desplegable para filtrar por Cátedra o Consolidado General */}
        <div className="mb-3.5">
          <CustomSelect
            value={selectedMetricsCatedraId}
            onChange={(val) => {
              const targetVal = typeof val === 'object' && val?.target ? val.target.value : val;
              onSelectMetricsCatedraId(targetVal);
            }}
            options={metricsCatedraOptions}
            placeholder="Consolidado General"
            className="w-full text-xs"
            buttonClassName="py-2 px-3 text-xs bg-surface-hover/70 border border-surface-border rounded-xl font-medium min-h-[44px] sm:min-h-[36px]"
            aria-label="Seleccionar cátedra para filtrar métricas rápidas"
          />
        </div>

        {/* Layout Horizontal 2 Columnas (PC/Desktop): Col 1 Donut, Col 2 Contadores */}
        <div className="grid grid-cols-1 sm:grid-cols-[128px_1fr] items-center gap-4 py-1">
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
            <div className="p-2 sm:p-2.5 rounded-xl bg-surface-hover/70 border border-surface-border flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Alumnos Activos:</span>
              </span>
              <span className="text-xs font-bold font-mono text-text-primary shrink-0">
                {animatedStudents}
              </span>
            </div>

            <div className="p-2 sm:p-2.5 rounded-xl bg-surface-hover/70 border border-surface-border flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Clases Dictadas:</span>
              </span>
              <span className="text-xs font-bold font-mono text-text-primary shrink-0">
                {animatedClasses}
              </span>
            </div>

            <div className="p-2 sm:p-2.5 rounded-xl bg-surface-hover/70 border border-surface-border flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Materias en Vista:</span>
              </span>
              <span className="text-xs font-bold font-mono text-text-primary shrink-0">
                {animatedCatedras}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pie con Ciclo Lectivo */}
      <div className="pt-3 mt-3 border-t border-surface-border flex items-center justify-between text-[11px] text-text-muted">
        <span>Ciclo Lectivo:</span>
        <span className="font-semibold text-text-secondary">
          {activeCiclo ? (activeCiclo.nombre || `Año ${activeCiclo.anio}`) : 'Ciclo Anual Activo'}
        </span>
      </div>
    </Card>
  );
}
