import React, { useMemo, useState } from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip 
} from 'recharts';
import { useCountUp } from '../../hooks/useCountUp';
import { resolveColorForLabel } from './chartTokens';

/**
 * Tooltip accesible para el Donut Chart
 */
function CustomPieTooltip({ active, payload, valueSuffix }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;

  return (
    <div 
      className="p-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-white/10 shadow-lg backdrop-blur-md text-xs font-medium space-y-1 z-50 animate-fadeIn"
      role="tooltip"
    >
      <p className="font-bold text-slate-900 dark:text-white capitalize">{item.label}</p>
      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
        <span 
          className="w-2.5 h-2.5 rounded-full inline-block shrink-0" 
          style={{ backgroundColor: item.color }} 
        />
        <span>
          <strong className="font-mono text-slate-900 dark:text-white">{item.value}</strong> {valueSuffix}
        </span>
        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
          ({item.percent}%)
        </span>
      </div>
    </div>
  );
}

export default function InteractiveDonutChart({
  data = [],
  title = "Total",
  subtitle = "Alumnos",
  size = 220,
  valueSuffix = "estudiantes",
  showLegend = true
}) {
  const [activeIndex, setActiveIndex] = useState(null);

  const total = useMemo(() => data.reduce((acc, item) => acc + (item.value || 0), 0), [data]);
  const animatedTotal = useCountUp(total, 600);

  const formattedData = useMemo(() => {
    return data.map((item, idx) => {
      const val = item.value || 0;
      const pct = total > 0 ? Math.round((val / total) * 100) : 0;
      return {
        ...item,
        value: val,
        percent: pct,
        color: resolveColorForLabel(item.label, item.color, idx)
      };
    });
  }, [data, total]);

  const ariaDescription = useMemo(() => {
    return `Gráfico de dona: ${title} ${total} ${subtitle}. Distribución: ${formattedData.map(d => `${d.label} ${d.value} (${d.percent}%)`).join(', ')}`;
  }, [formattedData, title, total, subtitle]);

  return (
    <div 
      className="flex flex-col items-center justify-center p-2 sm:p-4 w-full h-full min-h-[220px]"
      role="img"
      aria-label={ariaDescription}
    >
      {/* Visualizador Donut con Recharts */}
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<CustomPieTooltip valueSuffix={valueSuffix} />} />
            <Pie
              data={formattedData}
              innerRadius={size * 0.28}
              outerRadius={size * 0.42}
              paddingAngle={3}
              dataKey="value"
              animationDuration={800}
              animationEasing="ease-out"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {formattedData.map((entry, index) => (
                <Cell 
                  key={`donut-cell-${index}`} 
                  fill={entry.color} 
                  stroke="none"
                  className="transition-transform duration-200 cursor-pointer hover:opacity-85"
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Centro de Dona Informativo */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
          <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-white leading-none">
            {animatedTotal}
          </span>
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
            {subtitle}
          </span>
        </div>
      </div>

      {/* Leyenda interactiva inferior accesible */}
      {showLegend && formattedData.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-w-sm">
          {formattedData.map((item, index) => (
            <div
              key={`legend-${index}`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                activeIndex === index
                  ? 'bg-slate-100 dark:bg-slate-800 scale-105'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium capitalize">{item.label}:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {item.value}
              </span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                ({item.percent}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
