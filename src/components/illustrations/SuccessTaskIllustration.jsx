import React from 'react';

/**
 * SuccessTaskIllustration - Ilustración SVG nativa estilo Tabler con checkmark animado.
 * Representa una lista de tareas / nómina docente completada con éxito.
 *
 * @param {string} className - Clases de dimensión o espaciado
 * @param {number} strokeWidth - Grosor de trazo homogéneo (default 1.5)
 */
export default function SuccessTaskIllustration({
  className = 'w-36 h-36 sm:w-44 sm:h-44',
  strokeWidth = 1.5
}) {
  return (
    <div className={`relative flex items-center justify-center select-none group ${className}`}>
      {/* Halo ambiental suave esmeralda */}
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/15 via-teal-500/10 to-primary/10 rounded-full blur-2xl pointer-events-none transition-opacity duration-300 group-hover:opacity-100 opacity-70" />

      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-xs transition-transform duration-300 group-hover:scale-105"
      >
        {/* Base elíptica de apoyo */}
        <ellipse
          cx="80"
          cy="146"
          rx="56"
          ry="7"
          className="fill-slate-200/70 dark:fill-slate-800/60"
        />

        {/* Portapapeles / Planilla docente de fondo */}
        <g>
          {/* Base del portapapeles */}
          <rect
            x="32"
            y="26"
            width="96"
            height="114"
            rx="12"
            className="fill-slate-100 dark:fill-slate-800/50 stroke-slate-400 dark:stroke-slate-600"
            strokeWidth={strokeWidth}
          />

          {/* Clip superior metálico */}
          <path
            d="M62 26 L62 20 C62 16.7 64.7 14 68 14 L92 14 C95.3 14 98 16.7 98 20 L98 26 Z"
            className="fill-slate-200 dark:fill-slate-700 stroke-slate-700 dark:stroke-slate-200"
            strokeWidth={strokeWidth}
          />
          <circle cx="80" cy="20" r="2.5" className="fill-slate-400 dark:fill-slate-500" />

          {/* Hoja de papel blanca frontal */}
          <rect
            x="40"
            y="36"
            width="80"
            height="96"
            rx="6"
            className="fill-white dark:fill-slate-900 stroke-slate-700 dark:stroke-slate-200"
            strokeWidth={strokeWidth}
          />

          {/* Fila 1 de tarea / asistencia: Casilla con tilde completado */}
          <g transform="translate(48, 48)">
            <rect
              x="0"
              y="0"
              width="14"
              height="14"
              rx="3"
              className="fill-emerald-500/20 stroke-emerald-500 dark:stroke-emerald-400"
              strokeWidth={strokeWidth}
            />
            <path
              d="M3.5 7 L6 9.5 L10.5 4.5"
              className="stroke-emerald-600 dark:stroke-emerald-400"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line x1="22" y1="7" x2="58" y2="7" className="stroke-slate-700 dark:stroke-slate-200" strokeWidth={strokeWidth} strokeLinecap="round" />
          </g>

          {/* Fila 2 de tarea / notas: Casilla con tilde completado */}
          <g transform="translate(48, 70)">
            <rect
              x="0"
              y="0"
              width="14"
              height="14"
              rx="3"
              className="fill-emerald-500/20 stroke-emerald-500 dark:stroke-emerald-400"
              strokeWidth={strokeWidth}
            />
            <path
              d="M3.5 7 L6 9.5 L10.5 4.5"
              className="stroke-emerald-600 dark:stroke-emerald-400"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line x1="22" y1="7" x2="50" y2="7" className="stroke-slate-700 dark:stroke-slate-200" strokeWidth={strokeWidth} strokeLinecap="round" />
          </g>

          {/* Fila 3: Línea de texto sutil */}
          <g transform="translate(48, 92)">
            <rect
              x="0"
              y="0"
              width="14"
              height="14"
              rx="3"
              className="fill-slate-100 dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-600"
              strokeWidth={strokeWidth}
            />
            <line x1="22" y1="7" x2="44" y2="7" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray="2 3" />
          </g>
        </g>

        {/* Emblema circular flotante con gran checkmark animado */}
        <g transform="translate(90, 80)">
          {/* Círculo de fondo con efecto glassmorphism */}
          <circle
            cx="24"
            cy="24"
            r="23"
            className="fill-white dark:fill-slate-900 stroke-emerald-500 dark:stroke-emerald-400 drop-shadow-md"
            strokeWidth={strokeWidth * 1.25}
          />
          <circle
            cx="24"
            cy="24"
            r="19"
            className="fill-emerald-500/15 dark:fill-emerald-500/25"
          />

          {/* Gran Checkmark animado con trazo progresivo */}
          <path
            d="M14 24 L21 31 L34 17"
            className="stroke-emerald-600 dark:stroke-emerald-400 animate-draw-check"
            strokeWidth={2.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Chispas de éxito / celebración en verde y violeta índigo */}
        <g className="text-emerald-500 dark:text-emerald-400">
          <circle cx="28" cy="46" r="2" fill="currentColor" />
          <path d="M22 62 L26 62 M24 60 L24 64" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
          <path d="M138 68 L142 68 M140 66 L140 70" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
          <circle cx="134" cy="120" r="2" fill="currentColor" />
        </g>
      </svg>
    </div>
  );
}
