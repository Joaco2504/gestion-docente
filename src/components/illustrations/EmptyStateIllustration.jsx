import React from 'react';

/**
 * EmptyStateIllustration - Ilustración SVG nativa estilo Tabler interactiva y dinámica.
 * Representa una carpeta / libreta docente vacía con soporte adaptable Light/Dark mode.
 *
 * @param {string} className - Clases de dimensión o espaciado
 * @param {number} strokeWidth - Grosor de trazo homogéneo (default 1.5)
 */
export default function EmptyStateIllustration({ 
  className = 'w-36 h-36 sm:w-44 sm:h-44',
  strokeWidth = 1.5 
}) {
  return (
    <div className={`relative flex items-center justify-center select-none group ${className}`}>
      {/* Halo ambiental suave adaptable */}
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-primary/10 to-emerald-500/10 rounded-full blur-2xl pointer-events-none transition-opacity duration-300 group-hover:opacity-100 opacity-70" />

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

        {/* Hoja de fondo 2 (inclinada sutilmente a la izquierda) */}
        <g transform="rotate(-6 80 85)">
          <rect
            x="36"
            y="38"
            width="88"
            height="96"
            rx="8"
            className="fill-slate-100 dark:fill-slate-800/40 stroke-slate-300 dark:stroke-slate-700"
            strokeWidth={strokeWidth}
          />
        </g>

        {/* Hoja de fondo 1 (inclinada a la derecha) */}
        <g transform="rotate(4 80 85)">
          <rect
            x="36"
            y="38"
            width="88"
            height="96"
            rx="8"
            className="fill-slate-50 dark:fill-slate-800/60 stroke-slate-300 dark:stroke-slate-600"
            strokeWidth={strokeWidth}
          />
        </g>

        {/* Carpeta / Libreta principal central */}
        <g>
          {/* Tapa posterior / cuerpo de la libreta */}
          <rect
            x="34"
            y="34"
            width="92"
            height="102"
            rx="10"
            className="fill-white dark:fill-slate-900 stroke-slate-700 dark:stroke-slate-200"
            strokeWidth={strokeWidth}
          />

          {/* Solapa superior tipo carpeta Tabler */}
          <path
            d="M34 46 L34 42 C34 37.5 37.5 34 42 34 L68 34 L78 44 L116 44 C121.5 44 126 48.5 126 54 L126 62"
            className="fill-primary/10 dark:fill-primary/20 stroke-slate-700 dark:stroke-slate-200"
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />

          {/* Lomo / Anillado de la libreta docente */}
          <g className="text-indigo-500 dark:text-indigo-400 stroke-current">
            <line x1="42" y1="48" x2="42" y2="124" strokeWidth={strokeWidth} strokeDasharray="3 4" strokeLinecap="round" />
            <circle cx="42" cy="56" r="2" fill="currentColor" />
            <circle cx="42" cy="74" r="2" fill="currentColor" />
            <circle cx="42" cy="92" r="2" fill="currentColor" />
            <circle cx="42" cy="110" r="2" fill="currentColor" />
          </g>

          {/* Marcapáginas colgante esmeralda */}
          <path
            d="M104 34 L104 60 L112 54 L120 60 L120 34 Z"
            className="fill-emerald-500/20 stroke-emerald-500 dark:stroke-emerald-400"
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />

          {/* Líneas de notas vacías simuladas con terminación punteada */}
          <g className="stroke-current text-slate-300 dark:text-slate-600">
            <line x1="56" y1="64" x2="94" y2="64" strokeWidth={strokeWidth} strokeLinecap="round" />
            <line x1="56" y1="78" x2="108" y2="78" strokeWidth={strokeWidth} strokeLinecap="round" />
            <line x1="56" y1="92" x2="88" y2="92" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray="2 3" />
            <line x1="56" y1="106" x2="102" y2="106" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray="2 3" />
          </g>

          {/* Insignia o sello circular sutil en la esquina inferior */}
          <circle
            cx="106"
            cy="114"
            r="9"
            className="fill-primary/10 dark:fill-primary/20 stroke-primary/50 dark:stroke-primary/60"
            strokeWidth={strokeWidth}
          />
          <path
            d="M103 114 L105.5 116.5 L110 111.5"
            className="stroke-primary dark:stroke-primary-light"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Destellos / Partículas docentes sutiles */}
        <g className="text-indigo-400 dark:text-indigo-300">
          <path
            d="M24 64 L26 64 M25 63 L25 65"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <path
            d="M136 78 L140 78 M138 76 L138 80"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <circle cx="28" cy="116" r="1.75" fill="currentColor" />
          <circle cx="134" cy="46" r="2" fill="currentColor" />
        </g>
      </svg>
    </div>
  );
}
