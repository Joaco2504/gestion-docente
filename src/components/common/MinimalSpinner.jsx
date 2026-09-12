import React from 'react';

/**
 * MinimalSpinner - Spinner vectorial minimalista inspirado en UIverse
 * Trazo homogéneo SVG con animación suave de rotación continua.
 * 
 * @param {'sm'|'md'|'lg'|'xl'} size - Tamaño del spinner
 * @param {string} className - Clases adicionales de Tailwind
 * @param {'primary'|'white'|'emerald'|'current'} variant - Color del spinner
 */
export default function MinimalSpinner({
  size = 'md',
  variant = 'primary',
  className = ''
}) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const strokeWidthMap = {
    sm: 3,
    md: 2.75,
    lg: 2.5,
    xl: 2.25
  };

  const colorClasses = {
    primary: 'text-primary',
    white: 'text-white',
    emerald: 'text-emerald-500',
    current: 'text-current'
  };

  const strokeWidth = strokeWidthMap[size] || 2.75;
  const dimensionClass = sizeMap[size] || sizeMap.md;
  const colorClass = colorClasses[variant] || colorClasses.primary;

  return (
    <div
      role="status"
      aria-label="Cargando..."
      className={`inline-flex items-center justify-center select-none ${dimensionClass} ${colorClass} ${className}`}
    >
      <svg
        className="w-full h-full animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Pista circular de fondo */}
        <circle
          cx="12"
          cy="12"
          r="9.5"
          className="opacity-20"
          stroke="currentColor"
          strokeWidth={strokeWidth}
        />
        {/* Arco animado principal con terminación redondeada */}
        <path
          d="M12 2.5 C17.25 2.5 21.5 6.75 21.5 12"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">Cargando...</span>
    </div>
  );
}
