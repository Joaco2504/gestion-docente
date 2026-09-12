import React, { useState } from 'react';

/**
 * InteractiveDonutChart - Gráfico interactivo tipo Donut / Torta nativo SVG.
 * Cero dependencias externas (0 KB bloatware), soporte para toques táctiles,
 * animaciones CSS y modo oscuro nativo con Tailwind.
 * 
 * @param {Array<{ label: string, value: number, color: string }>} data
 * @param {string} title - Título central
 * @param {string} subtitle - Subtítulo central
 * @param {number} size - Diámetro base en píxeles (default 220)
 * @param {string} valueSuffix - Sufijo para los valores (ej: "alumnos")
 */
export default function InteractiveDonutChart({
  data = [],
  title = "Total",
  subtitle = "Alumnos",
  size = 220,
  valueSuffix = "estudiantes"
}) {
  const [activeIndex, setActiveIndex] = useState(null);

  const total = data.reduce((acc, item) => acc + (item.value || 0), 0);
  const radius = 38;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  const segments = data.map((item, index) => {
    const val = item.value || 0;
    const percent = total > 0 ? val / total : 0;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;

    return {
      ...item,
      index,
      percent: Math.round(percent * 100),
      rawPercent: percent * 100,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeItem = activeIndex !== null ? segments[activeIndex] : null;

  return (
    <div className="flex flex-col items-center justify-center p-3 sm:p-5 w-full">
      {/* SVG Donut Visualizer */}
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full -rotate-90 transform select-none"
          role="img"
          aria-label="Gráfico de distribución porcentual"
        >
          {/* Anillo base de fondo */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100 dark:text-slate-800/80"
          />

          {/* Segmentos de datos interactivos */}
          {total > 0 && segments.map((seg) => {
            const isCurrent = activeIndex === seg.index;
            return (
              <circle
                key={seg.index}
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={isCurrent ? strokeWidth + 3 : strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300 cursor-pointer origin-center hover:opacity-100"
                style={{
                  opacity: activeIndex === null || isCurrent ? 1 : 0.45,
                  filter: isCurrent ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))' : 'none'
                }}
                onMouseEnter={() => setActiveIndex(seg.index)}
                onMouseLeave={() => setActiveIndex(null)}
                onTouchStart={() => setActiveIndex(seg.index === activeIndex ? null : seg.index)}
              />
            );
          })}
        </svg>

        {/* Centro de información interactivo */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-3">
          <span className="text-xs font-semibold text-text-muted truncate max-w-[85%] uppercase tracking-wider">
            {activeItem ? activeItem.label : title}
          </span>
          <span className="text-2xl sm:text-3xl font-mono font-extrabold text-text-primary tracking-tight mt-0.5">
            {activeItem ? `${activeItem.rawPercent.toFixed(1)}%` : total}
          </span>
          <span className="text-[11px] text-text-secondary font-medium mt-0.5">
            {activeItem ? `${activeItem.value} ${valueSuffix}` : subtitle}
          </span>
        </div>
      </div>

      {/* Leyenda interactiva inferior tipo chips Bento (columna única en mobile, flex en desktop) */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap justify-center gap-2 text-xs w-full max-w-md">
        {segments.map((seg) => {
          const isCurrent = activeIndex === seg.index;
          return (
            <button
              key={seg.index}
              type="button"
              onClick={() => setActiveIndex(isCurrent ? null : seg.index)}
              className={`flex items-center justify-between md:justify-start gap-2 px-3.5 py-2 rounded-xl border transition-all cursor-pointer select-none touch-target-44 w-full md:w-auto ${
                isCurrent 
                  ? 'bg-white dark:bg-slate-800 font-bold text-text-primary shadow-sm scale-102 border-slate-300 dark:border-white/20 ring-2 ring-primary/20' 
                  : 'bg-slate-100/70 dark:bg-white/[0.04] text-text-secondary border-slate-200/70 dark:border-white/5 hover:bg-slate-200/60 dark:hover:bg-white/[0.08]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                <span className="truncate">{seg.label}:</span>
              </div>
              <div className="flex items-center gap-1 font-mono shrink-0">
                <span className="font-bold text-text-primary">{seg.value}</span>
                <span className="text-[10px] text-text-muted">({seg.rawPercent.toFixed(0)}%)</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
