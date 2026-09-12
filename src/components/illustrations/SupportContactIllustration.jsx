import React from 'react';

/**
 * SupportContactIllustration - Ilustración vectorial estilo Tabler / SVG Repo
 * Representa el envío fluido de mensajes, correspondencia y soporte técnico pedagógico.
 */
export default function SupportContactIllustration({ className = 'w-48 h-48 sm:w-56 sm:h-56' }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Halo de fondo difuminado suave */}
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/15 via-teal-500/10 to-primary/15 rounded-full blur-2xl pointer-events-none" />

      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-sm"
      >
        {/* Base de apoyo suave */}
        <ellipse cx="100" cy="175" rx="65" ry="10" className="fill-slate-200/60 dark:fill-slate-800/60" />

        {/* Círculo decorativo posterior */}
        <circle
          cx="100"
          cy="95"
          r="68"
          className="stroke-slate-200 dark:stroke-slate-800 fill-slate-50/50 dark:fill-slate-900/30"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Hoja de mensaje que emerge del sobre */}
        <g className="transition-transform duration-300">
          <rect
            x="58"
            y="42"
            width="84"
            height="72"
            rx="8"
            className="fill-white dark:fill-slate-900 stroke-slate-300 dark:stroke-slate-700"
            strokeWidth="1.75"
          />
          {/* Líneas de texto simuladas en la hoja */}
          <line
            x1="70"
            y1="58"
            x2="105"
            y2="58"
            className="stroke-primary"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            x1="70"
            y1="70"
            x2="130"
            y2="70"
            className="stroke-slate-300 dark:stroke-slate-600"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="70"
            y1="82"
            x2="120"
            y2="82"
            className="stroke-slate-300 dark:stroke-slate-600"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Badge o sello en la hoja */}
          <circle cx="126" cy="58" r="4" className="fill-emerald-500" />
        </g>

        {/* Sobre de correspondencia en perspectiva Tabler */}
        <rect
          x="44"
          y="78"
          width="112"
          height="82"
          rx="12"
          className="fill-emerald-500/10 dark:fill-emerald-500/20 stroke-emerald-500 dark:stroke-emerald-400"
          strokeWidth="2"
        />

        {/* Pliegue interior del sobre */}
        <path
          d="M45 82 L100 125 L155 82"
          className="stroke-emerald-500 dark:stroke-emerald-400"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Pliegues inferiores del sobre */}
        <path
          d="M46 158 L88 116"
          className="stroke-emerald-500/60 dark:stroke-emerald-400/60"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <path
          d="M154 158 L112 116"
          className="stroke-emerald-500/60 dark:stroke-emerald-400/60"
          strokeWidth="1.75"
          strokeLinecap="round"
        />

        {/* Trayectoria de vuelo en bucle punteado */}
        <path
          d="M95 85 C 130 50, 160 55, 155 35 C 150 18, 125 24, 138 48"
          className="stroke-teal-500 dark:stroke-teal-400"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          strokeLinecap="round"
        />

        {/* Avión de papel estilo Tabler despegando */}
        <g transform="translate(136, 24) rotate(15)">
          <path
            d="M2 18 L24 2 L14 26 L10 17 L2 18 Z"
            className="fill-primary stroke-primary"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M24 2 L10 17"
            className="stroke-white/80"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>

        {/* Destellos de éxito y conexión */}
        <g className="text-amber-400 dark:text-amber-300">
          <path
            d="M32 60 L36 60 M34 58 L34 62"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M168 115 L172 115 M170 113 L170 117"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <circle cx="165" cy="85" r="2" fill="currentColor" />
        </g>
      </svg>
    </div>
  );
}
