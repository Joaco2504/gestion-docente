import React from 'react';

/**
 * SearchEmptyIllustration - Ilustración SVG nativa estilo Tabler interactiva.
 * Representa una búsqueda sin resultados o filtro sin coincidencias en nóminas docentes.
 *
 * @param {string} className - Clases de dimensión o espaciado
 * @param {number} strokeWidth - Grosor de trazo homogéneo (default 1.5)
 */
export default function SearchEmptyIllustration({
  className = 'w-36 h-36 sm:w-44 sm:h-44',
  strokeWidth = 1.5
}) {
  return (
    <div className={`relative flex items-center justify-center select-none group ${className}`}>
      {/* Halo ambiental suave en tonos ámbar / primario */}
      <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-primary/10 to-indigo-500/10 rounded-full blur-2xl pointer-events-none transition-opacity duration-300 group-hover:opacity-100 opacity-70" />

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

        {/* Hoja de nómina / documento de fondo */}
        <g transform="translate(30, 32)">
          {/* Cuerpo del documento */}
          <rect
            x="4"
            y="4"
            width="82"
            height="104"
            rx="10"
            className="fill-white dark:fill-slate-900 stroke-slate-700 dark:stroke-slate-200"
            strokeWidth={strokeWidth}
          />

          {/* Cabecera del documento simulada */}
          <rect
            x="12"
            y="14"
            width="28"
            height="8"
            rx="2"
            className="fill-primary/20 dark:fill-primary/30"
          />
          <line x1="12" y1="30" x2="78" y2="30" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth={1} />

          {/* Filas de la nómina con líneas discontinuas simulando registros no encontrados */}
          <g className="stroke-slate-300 dark:stroke-slate-600">
            <line x1="14" y1="42" x2="68" y2="42" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray="3 4" />
            <line x1="14" y1="56" x2="52" y2="56" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray="3 4" />
            <line x1="14" y1="70" x2="74" y2="70" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray="3 4" />
            <line x1="14" y1="84" x2="44" y2="84" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray="3 4" />
            <line x1="14" y1="96" x2="60" y2="96" strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray="3 4" />
          </g>
        </g>

        {/* Gran Lupa de Búsqueda estilo Tabler en primer plano */}
        <g transform="translate(68, 54)">
          {/* Cristal / Círculo de la lupa con reflejo suave */}
          <circle
            cx="32"
            cy="32"
            r="26"
            className="fill-primary/10 dark:fill-primary/20 stroke-slate-700 dark:stroke-slate-200"
            strokeWidth={strokeWidth * 1.25}
          />

          {/* Reflejo curvado dentro del lente */}
          <path
            d="M18 24 C22 16 34 14 42 18"
            className="stroke-white/80 dark:stroke-slate-400/40"
            strokeWidth={2}
            strokeLinecap="round"
          />

          {/* Signo de interrogación / detalle tenue dentro de la lupa */}
          <g className="text-amber-500 dark:text-amber-400">
            <path
              d="M28 26 C28 22 36 22 36 26 C36 30 32 30 32 34"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <circle cx="32" cy="39" r="1.5" fill="currentColor" />
          </g>

          {/* Mango ergonómico de la lupa */}
          <path
            d="M51 51 L68 68"
            className="stroke-slate-700 dark:stroke-slate-200"
            strokeWidth={strokeWidth * 2.5}
            strokeLinecap="round"
          />
          <path
            d="M52 52 L67 67"
            className="stroke-amber-500 dark:stroke-amber-400"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </g>

        {/* Pequeños destellos de atención */}
        <g className="text-amber-400 dark:text-amber-300">
          <circle cx="22" cy="54" r="2" fill="currentColor" />
          <path d="M136 46 L140 46 M138 44 L138 48" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
          <circle cx="132" cy="116" r="2" fill="currentColor" />
        </g>
      </svg>
    </div>
  );
}
