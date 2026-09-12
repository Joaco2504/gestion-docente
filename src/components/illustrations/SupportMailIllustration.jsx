import React from 'react';

/**
 * SupportMailIllustration - Ilustración SVG nativa estilo Tabler con avión de papel flotante.
 * Representa el envío de consultas, mensajes de soporte y atención docente prioritaria.
 *
 * @param {string} className - Clases de dimensión o espaciado
 * @param {number} strokeWidth - Grosor de trazo homogéneo (default 1.5)
 */
export default function SupportMailIllustration({
  className = 'w-36 h-36 sm:w-44 sm:h-44',
  strokeWidth = 1.5
}) {
  return (
    <div className={`relative flex items-center justify-center select-none group ${className}`}>
      {/* Halo ambiental suave en tonos menta, teal e índigo */}
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/15 via-teal-500/10 to-indigo-500/10 rounded-full blur-2xl pointer-events-none transition-opacity duration-300 group-hover:opacity-100 opacity-70" />

      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-xs"
      >
        {/* Base elíptica de apoyo */}
        <ellipse
          cx="80"
          cy="146"
          rx="56"
          ry="7"
          className="fill-slate-200/70 dark:fill-slate-800/60"
        />

        {/* Sobre de correo estilizado */}
        <g transform="translate(24, 60)">
          {/* Cuerpo principal del sobre */}
          <rect
            x="6"
            y="14"
            width="96"
            height="64"
            rx="10"
            className="fill-white dark:fill-slate-900 stroke-slate-700 dark:stroke-slate-200"
            strokeWidth={strokeWidth}
          />

          {/* Solapa posterior abierta con relleno primario sutil */}
          <path
            d="M8 22 L54 50 L100 22"
            className="stroke-slate-700 dark:stroke-slate-200 fill-primary/10 dark:fill-primary/20"
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />

          {/* Pliegues inferiores del sobre */}
          <path
            d="M6 72 L42 46 M102 72 L66 46"
            className="stroke-slate-300 dark:stroke-slate-700"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Tarjeta / Hoja de mensaje que asoma desde dentro del sobre */}
          <g transform="translate(20, -18)">
            <rect
              x="0"
              y="0"
              width="68"
              height="46"
              rx="6"
              className="fill-slate-50 dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-600"
              strokeWidth={strokeWidth}
            />
            {/* Líneas de texto del mensaje de consulta */}
            <line x1="10" y1="12" x2="38" y2="12" className="stroke-indigo-500 dark:stroke-indigo-400" strokeWidth={strokeWidth * 1.3} strokeLinecap="round" />
            <line x1="10" y1="22" x2="58" y2="22" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth={strokeWidth} strokeLinecap="round" />
            <line x1="10" y1="32" x2="48" y2="32" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth={strokeWidth} strokeLinecap="round" />
          </g>

          {/* Sello o medalla esmeralda en el sobre */}
          <circle
            cx="54"
            cy="52"
            r="10"
            className="fill-emerald-500/20 stroke-emerald-500 dark:stroke-emerald-400"
            strokeWidth={strokeWidth}
          />
          <path
            d="M50 52 L53 55 L58 49"
            className="stroke-emerald-600 dark:stroke-emerald-400"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Estela de vuelo punteada para el avión */}
        <path
          d="M48 95 C62 82 86 80 94 92 C100 102 114 104 122 92 C126 86 128 72 126 56"
          className="stroke-indigo-400 dark:stroke-indigo-500"
          strokeWidth={strokeWidth}
          strokeDasharray="3 4"
          strokeLinecap="round"
        />

        {/* Avión de papel flotante animado (Micro-flotación infinita con clase animate-float) */}
        <g className="animate-float" transform="translate(102, 22)">
          {/* Cuerpo del avión de papel estilo origami Tabler */}
          <path
            d="M4 36 L40 4 L28 40 L18 28 L4 36 Z"
            className="fill-white dark:fill-slate-800 stroke-slate-700 dark:stroke-slate-200 drop-shadow-sm"
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Pliegue central del ala */}
          <path
            d="M40 4 L18 28"
            className="stroke-slate-700 dark:stroke-slate-200"
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          {/* Sombra de ala interna en tono primario / índigo */}
          <path
            d="M18 28 L28 40 L24 24 Z"
            className="fill-primary/20 dark:fill-primary/30 stroke-primary dark:stroke-primary-light"
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </g>

        {/* Destellos y burbujas de diálogo flotantes */}
        <g className="text-emerald-500 dark:text-emerald-400">
          <circle cx="28" cy="48" r="2.5" fill="currentColor" />
          <path d="M18 64 L22 64 M20 62 L20 66" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
          <path d="M136 116 L140 116 M138 114 L138 118" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}
