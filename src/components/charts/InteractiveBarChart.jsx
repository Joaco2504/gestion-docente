import React, { useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  CartesianGrid 
} from 'recharts';
import { resolveColorForLabel } from './chartTokens';

function formatMobileLabel(label) {
  if (!label) return '';
  const map = {
    'promocionales': 'Prom.',
    'promocional': 'Prom.',
    'promoción': 'Prom.',
    'regulares': 'Reg.',
    'regular': 'Reg.',
    'libres': 'Lib.',
    'libre': 'Lib.',
    'aprobados': 'Aprob.',
    'aprobado': 'Aprob.',
    'desaprobados': 'Desap.',
    'desaprobado': 'Desap.',
    'ausentes': 'Aus.',
    'ausente': 'Aus.',
    'docentes': 'Doc.',
    'cátedras': 'Cát.',
    'estudiantes': 'Alum.',
    'evaluaciones': 'Eval.'
  };
  const lower = label.toLowerCase().trim();
  return map[lower] || (label.length > 9 ? label.slice(0, 8) + '.' : label);
}

/**
 * Tooltip personalizado y accesible
 */
function CustomBarTooltip({ active, payload, valueSuffix }) {
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
        {item.percent && (
          <span className="text-[10px] font-mono opacity-80">({item.percent}%)</span>
        )}
      </div>
    </div>
  );
}

export default function InteractiveBarChart({
  data = [],
  heightClass = "h-56 sm:h-64 md:h-72",
  valueSuffix = "alumnos"
}) {
  const total = useMemo(() => data.reduce((acc, d) => acc + (d.value || 0), 0), [data]);

  const formattedData = useMemo(() => {
    return data.map((d, idx) => ({
      ...d,
      shortLabel: formatMobileLabel(d.label),
      color: resolveColorForLabel(d.label, d.color, idx),
      percent: total > 0 ? ((d.value / total) * 100).toFixed(1) : '0.0'
    }));
  }, [data, total]);

  const ariaDescription = useMemo(() => {
    return `Gráfico de barras: ${formattedData.map(d => `${d.label}: ${d.value} ${valueSuffix}`).join(', ')}`;
  }, [formattedData, valueSuffix]);

  return (
    <div 
      className={`w-full ${heightClass} p-1 sm:p-2 select-none relative`}
      role="img"
      aria-label={ariaDescription}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={formattedData} 
          margin={{ top: 16, right: 10, left: -20, bottom: 20 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke="currentColor" 
            className="text-slate-200 dark:text-slate-800" 
          />
          <XAxis 
            dataKey="shortLabel" 
            tickLine={false} 
            axisLine={false}
            tick={{ fontSize: 11, fill: 'currentColor' }}
            className="text-slate-500 dark:text-slate-400 font-medium"
            dy={8}
          />
          <YAxis 
            tickLine={false} 
            axisLine={false}
            tick={{ fontSize: 10, fill: 'currentColor' }}
            className="text-slate-500 dark:text-slate-400 font-mono"
            allowDecimals={false}
          />
          <Tooltip 
            content={<CustomBarTooltip valueSuffix={valueSuffix} />} 
            cursor={{ fill: 'rgba(100, 116, 139, 0.08)', radius: 8 }}
          />
          <Bar 
            dataKey="value" 
            radius={[6, 6, 0, 0]} 
            maxBarSize={48}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {formattedData.map((entry, index) => (
              <Cell 
                key={`bar-cell-${index}`} 
                fill={entry.color} 
                className="transition-all hover:opacity-80 cursor-pointer"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
