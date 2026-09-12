import React from 'react';

/**
 * SuccessCheckIllustration - Ilustración vectorial estilo Tabler / SVG Repo
 * Representa la confirmación de éxito: cierre de notas, asistencia completada e importación de alumnos.
 */
export default function SuccessCheckIllustration({ className = 'w-36 h-36 sm:w-44 sm:h-44' }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Halo ambiental suave esmeralda */}
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 via-teal-500/15 to-transparent rounded-full blur-xl pointer-events-none" />

      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-xs"
      >
        {/* Base elíptica suave */}
        <ellipse cx="80" cy="144" rx="50" ry="8" className="fill-slate-200/60 dark:fill-slate-800/60" />

        {/* Tablilla / Documento de registro posterior */}
        <rect
          x="38"
          y="32"
          width="84"
          height="100"
          rx="12"
          className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-700"
          strokeWidth="1.75"
        />

        {/* Broche superior de la tablilla */}
        <rect
          x="62"
          y="24"
          width="36"
          height="16"
          rx="4"
          className="fill-slate-100 dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-700"
          strokeWidth="1.5"
        />
        <circle cx="80" cy="30" r="2.5" className="fill-slate-400 dark:fill-slate-500" />

        {/* Filas de ítems completados con checks pequeños */}
        <g className="text-slate-400 dark:text-slate-500">
          {/* Fila 1 */}
          <circle cx="52" cy="54" r="5" className="fill-emerald-500/20 stroke-emerald-500" strokeWidth="1.25" />
          <path d="M50 54 L51.5 55.5 L54.5 52.5" className="stroke-emerald-600 dark:stroke-emerald-400" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="64" y1="54" x2="108" y2="54" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="2" strokeLinecap="round" />

          {/* Fila 2 */}
          <circle cx="52" cy="68" r="5" className="fill-emerald-500/20 stroke-emerald-500" strokeWidth="1.25" />
          <path d="M50 68 L51.5 69.5 L54.5 66.5" className="stroke-emerald-600 dark:stroke-emerald-400" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="64" y1="68" x2="98" y2="68" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="2" strokeLinecap="round" />

          {/* Fila 3 */}
          <circle cx="52" cy="82" r="5" className="fill-emerald-500/20 stroke-emerald-500" strokeWidth="1.25" />
          <path d="M50 82 L51.5 83.5 L54.5 80.5" className="stroke-emerald-600 dark:stroke-emerald-400" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="64" y1="82" x2="104" y2="82" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Emblema central de verificación exitosa en primer plano */}
        <g transform="translate(80, 96)">
          <circle
            cx="24"
            cy="24"
            r="22"
            className="fill-emerald-500 stroke-white dark:stroke-slate-900 shadow-lg"
            strokeWidth="2.5"
          />
          <path
            d="M16 24 L22 30 L32 18"
            className="stroke-white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Partículas de celebración y destellos */}
        <g className="text-emerald-500 dark:text-emerald-400">
          <path d="M26 46 L30 46 M28 44 L28 48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="34" cy="74" r="2" fill="currentColor" />
          <circle cx="132" cy="46" r="2.5" fill="currentColor" />
          <circle cx="136" cy="88" r="2" fill="currentColor" />
          <path d="M124 126 L128 126 M126 124 L126 128" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </g>
        <g className="text-amber-400 dark:text-amber-300">
          <circle cx="28" cy="116" r="2" fill="currentColor" />
          <path d="M118 28 L122 28 M120 26 L120 30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}
