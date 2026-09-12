import React, { useState } from 'react';

/**
 * InteractiveBarChart - Gráfico de barras interactivo nativo SVG + Tailwind.
 * Cero dependencias externas, adaptativo a móvil y desktop, con tooltips y animaciones fluidas.
 * 
 * @param {Array<{ label: string, value: number, color?: string }>} data
 * @param {string} heightClass - Clase de altura (default "h-52")
 * @param {string} valueSuffix - Sufijo para los valores (ej: "alumnos")
 */
export default function InteractiveBarChart({
  data = [],
  heightClass = "h-52",
  valueSuffix = "alumnos"
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const total = data.reduce((acc, d) => acc + (d.value || 0), 0);
  const maxValue = Math.max(...data.map(d => d.value || 0), 1);

  return (
    <div className="w-full flex flex-col p-2 sm:p-4">
      <div className={`relative w-full ${heightClass} flex items-end gap-3 sm:gap-6 pt-10 pb-2 px-2`}>
        {/* Líneas guía horizontales de fondo */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 dark:opacity-10 py-2">
          <div className="border-b border-dashed border-slate-400 w-full" />
          <div className="border-b border-dashed border-slate-400 w-full" />
          <div className="border-b border-dashed border-slate-400 w-full" />
        </div>

        {data.map((item, idx) => {
          const val = item.value || 0;
          const heightPercent = maxValue > 0 ? Math.max((val / maxValue) * 100, 6) : 6;
          const pctOfTotal = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
          const isHovered = hoveredIdx === idx;
          const barColor = item.color || '#3b82f6';

          return (
            <div
              key={idx}
              className="relative flex-1 flex flex-col items-center h-full justify-end group cursor-pointer select-none"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onTouchStart={() => setHoveredIdx(hoveredIdx === idx ? null : idx)}
            >
              {/* Tooltip flotante */}
              {isHovered && (
                <div className="absolute -top-9 z-20 px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-800 rounded-xl shadow-lg border border-white/10 pointer-events-none whitespace-nowrap animate-fadeIn scale-105 transition-all">
                  <span className="font-bold">{val}</span> {valueSuffix} <span className="text-slate-300 font-mono text-[10px]">({pctOfTotal}%)</span>
                </div>
              )}

              {/* Valor numérico superior estático si no está en hover */}
              {!isHovered && (
                <span className="text-[11px] sm:text-xs font-mono font-bold text-text-primary mb-1">
                  {val}
                </span>
              )}

              {/* Barra interactiva con radio redondeado superior */}
              <div
                className="w-full max-w-[48px] sm:max-w-[64px] rounded-t-2xl transition-all duration-300 ease-out"
                style={{
                  height: `${heightPercent}%`,
                  backgroundColor: barColor,
                  opacity: hoveredIdx === null || isHovered ? 1 : 0.4,
                  boxShadow: isHovered ? `0 4px 14px ${barColor}40` : 'none'
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Etiquetas del eje X */}
      <div className="flex justify-between gap-3 sm:gap-6 pt-2.5 border-t border-slate-200/60 dark:border-white/10 text-xs font-semibold text-text-secondary">
        {data.map((item, idx) => (
          <div key={idx} className="flex-1 text-center truncate px-1" title={item.label}>
            <span className="block truncate">{item.label}</span>
            <span className="block text-[10px] font-mono text-text-muted font-normal mt-0.5">
              {total > 0 ? `${(( (item.value || 0) / total) * 100).toFixed(0)}%` : '0%'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
