import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CHART_PALETTE } from './chartTokens';

/**
 * AttendanceGaugeChart - Indicador radial / Gauge de asistencia basado en Recharts.
 * Reemplaza SVG inline con un componente reusable, accesible y adaptativo.
 */
export default function AttendanceGaugeChart({
  percentage = 0,
  animatedPercentage = 0,
  size = 120
}) {
  const safePct = Math.min(Math.max(percentage, 0), 100);
  const isOptimal = safePct >= 75;
  const fillColor = isOptimal ? CHART_PALETTE.promocion : CHART_PALETTE.recuperatorio;

  const chartData = [
    { name: 'Asistencia', value: safePct, color: fillColor },
    { name: 'Restante', value: 100 - safePct, color: 'currentColor' }
  ];

  return (
    <div 
      className="relative flex items-center justify-center shrink-0" 
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Porcentaje de asistencia: ${safePct}% (${isOptimal ? 'Óptima' : 'En Seguimiento'})`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            startAngle={90}
            endAngle={-270}
            innerRadius={size * 0.32}
            outerRadius={size * 0.44}
            dataKey="value"
            stroke="none"
            animationDuration={800}
            animationEasing="ease-out"
          >
            <Cell fill={fillColor} />
            <Cell className="text-slate-200 dark:text-slate-800" fill="currentColor" opacity={0.6} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Porcentaje centrado */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
        <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white leading-tight">
          {animatedPercentage}%
        </span>
        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5 leading-none">
          ASISTENCIA
        </span>
      </div>
    </div>
  );
}
