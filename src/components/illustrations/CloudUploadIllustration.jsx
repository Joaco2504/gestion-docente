import React from 'react';

/**
 * CloudUploadIllustration - Ilustración vectorial estilo Tabler / SVG Repo
 * Representa la carga de archivos, subida a la nube y procesamiento de planillas Excel/CSV.
 */
export default function CloudUploadIllustration({ className = 'w-36 h-36 sm:w-44 sm:h-44' }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Halo ambiental suave */}
      <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/15 via-primary/10 to-emerald-500/10 rounded-full blur-xl pointer-events-none" />

      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-xs"
      >
        {/* Base elíptica suave */}
        <ellipse cx="80" cy="144" rx="55" ry="8" className="fill-slate-200/60 dark:fill-slate-800/60" />

        {/* Nube estilizada posterior */}
        <path
          d="M48 116 C34 116 24 104 24 90 C24 78 33 67 45 65 C48 48 62 36 80 36 C97 36 112 47 116 63 C127 64 136 73 136 85 C136 97 127 107 115 108"
          className="stroke-primary/40 dark:stroke-primary/50 fill-primary/5 dark:fill-primary/10"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hoja de cálculo tipo Excel / CSV flotante */}
        <g transform="translate(36, 52)">
          {/* Tarjeta del documento */}
          <rect
            x="8"
            y="6"
            width="64"
            height="76"
            rx="8"
            className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-700"
            strokeWidth="1.75"
          />

          {/* Icono de planilla / cuadrícula verde esmeralda */}
          <rect
            x="16"
            y="14"
            width="48"
            height="32"
            rx="4"
            className="fill-emerald-500/10 dark:fill-emerald-500/20 stroke-emerald-500"
            strokeWidth="1.5"
          />
          {/* Líneas de cuadrícula tipo hoja de cálculo */}
          <line x1="16" y1="24" x2="64" y2="24" className="stroke-emerald-500" strokeWidth="1" />
          <line x1="16" y1="34" x2="64" y2="34" className="stroke-emerald-500" strokeWidth="1" />
          <line x1="32" y1="14" x2="32" y2="46" className="stroke-emerald-500" strokeWidth="1" />
          <line x1="48" y1="14" x2="48" y2="46" className="stroke-emerald-500" strokeWidth="1" />

          {/* Líneas de texto simuladas bajo la grilla */}
          <line x1="18" y1="56" x2="46" y2="56" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="18" y1="66" x2="58" y2="66" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Flecha de subida animada / destacada estilo Tabler */}
        <g transform="translate(86, 68)">
          {/* Círculo contenedor de la flecha con gradiente primario */}
          <circle
            cx="24"
            cy="24"
            r="22"
            className="fill-primary stroke-white dark:stroke-slate-900"
            strokeWidth="2.5"
          />
          {/* Flecha hacia arriba */}
          <path
            d="M24 14 L16 22 M24 14 L32 22 M24 14 L24 34"
            className="stroke-white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Partículas de datos ascendentes */}
        <g className="text-sky-500 dark:text-sky-400">
          <circle cx="28" cy="52" r="2.5" fill="currentColor" />
          <circle cx="128" cy="48" r="2" fill="currentColor" />
          <circle cx="138" cy="110" r="2.5" fill="currentColor" />
          <path
            d="M36 34 L40 34 M38 32 L38 36"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}
