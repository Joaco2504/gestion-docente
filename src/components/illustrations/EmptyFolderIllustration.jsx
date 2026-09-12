import React from 'react';

/**
 * EmptyFolderIllustration - Ilustración vectorial estilo Tabler / SVG Repo
 * Representa estados vacíos (Empty States): libreta, carpeta y escritorio sin datos aún registrados.
 */
export default function EmptyFolderIllustration({ className = 'w-36 h-36 sm:w-44 sm:h-44' }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Halo ambiental suave */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-sky-400/10 to-transparent rounded-full blur-xl pointer-events-none" />

      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-xs"
      >
        {/* Base de apoyo elíptica */}
        <ellipse cx="80" cy="142" rx="55" ry="8" className="fill-slate-200/60 dark:fill-slate-800/60" />

        {/* Carpeta / Libreta posterior */}
        <path
          d="M28 50 C28 46, 31 43, 35 43 L60 43 L72 53 L125 53 C129 53, 132 46, 132 50 L132 120 C132 124, 129 127, 125 127 L35 127 C31 127, 28 124, 28 120 Z"
          className="fill-slate-100 dark:fill-slate-800/50 stroke-slate-300 dark:stroke-slate-700"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />

        {/* Hoja de papel central ligeramente inclinada */}
        <g transform="rotate(-3 80 85)">
          <rect
            x="48"
            y="48"
            width="64"
            height="72"
            rx="6"
            className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-700"
            strokeWidth="1.75"
          />
          {/* Líneas tenues discontinuas que representan ausencia de datos */}
          <line
            x1="58"
            y1="64"
            x2="88"
            y2="64"
            className="stroke-primary/80"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            x1="58"
            y1="76"
            x2="102"
            y2="76"
            className="stroke-slate-300 dark:stroke-slate-600"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeDasharray="4 4"
          />
          <line
            x1="58"
            y1="88"
            x2="95"
            y2="88"
            className="stroke-slate-300 dark:stroke-slate-600"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeDasharray="4 4"
          />
          <line
            x1="58"
            y1="100"
            x2="80"
            y2="100"
            className="stroke-slate-300 dark:stroke-slate-600"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeDasharray="4 4"
          />
        </g>

        {/* Pestaña frontal de la carpeta en perspectiva abierta */}
        <path
          d="M24 66 C24 62, 27 59, 31 59 L64 59 L76 68 L136 68 C140 68, 143 71, 143 75 L138 126 C138 130, 134 133, 130 133 L30 133 C26 133, 23 130, 24 126 Z"
          className="fill-primary/10 dark:fill-primary/20 stroke-primary"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Lupa / Explorador estilo Tabler */}
        <g transform="translate(92, 86)">
          <circle
            cx="20"
            cy="20"
            r="14"
            className="fill-white/80 dark:fill-slate-900/80 stroke-primary dark:stroke-sky-400"
            strokeWidth="2"
          />
          <line
            x1="30"
            y1="30"
            x2="40"
            y2="40"
            className="stroke-primary dark:stroke-sky-400"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Reflejo en cristal de la lupa */}
          <path
            d="M13 14 A 8 8 0 0 1 23 11"
            className="stroke-primary/40 dark:stroke-sky-400/40"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>

        {/* Destellos geométricos minimalistas */}
        <g className="text-amber-400 dark:text-amber-300">
          <circle cx="34" cy="40" r="2" fill="currentColor" />
          <path
            d="M136 42 L140 42 M138 40 L138 44"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}
