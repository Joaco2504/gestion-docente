import React from 'react';

/**
 * ProgressBar - Barra de progreso fluida inspirada en UIverse y Animista
 * Soporta modo indeterminado (para sincronización con Supabase) o determinado con porcentaje.
 * 
 * @param {number|null} value - Porcentaje de 0 a 100, o null para modo indeterminado continuo
 * @param {'primary'|'emerald'|'amber'|'gradient'} color - Color o gradiente de la barra
 * @param {'sm'|'md'|'lg'} size - Altura de la barra
 * @param {string} className - Clases adicionales de Tailwind
 * @param {string} label - Etiqueta descriptiva opcional
 */
export default function ProgressBar({
  value = null,
  color = 'gradient',
  size = 'md',
  className = '',
  label = ''
}) {
  const isIndeterminate = value === null || value === undefined;

  const heightClasses = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2.5'
  };

  const colorVariants = {
    primary: 'bg-primary',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    gradient: 'bg-gradient-to-r from-primary via-teal-400 to-emerald-400'
  };

  const heightClass = heightClasses[size] || heightClasses.md;
  const barColor = colorVariants[color] || colorVariants.gradient;

  return (
    <div className={`w-full select-none ${className}`}>
      {label && (
        <div className="flex justify-between items-center text-xs text-text-muted mb-1 font-medium">
          <span>{label}</span>
          {!isIndeterminate && <span className="font-mono font-bold">{Math.round(value)}%</span>}
        </div>
      )}

      <div className={`w-full bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden relative ${heightClass}`}>
        {isIndeterminate ? (
          /* Modo indeterminado continuo fluido estilo Animista */
          <div
            className={`h-full rounded-full ${barColor} animate-indeterminate w-full origin-left`}
          />
        ) : (
          /* Modo determinado con porcentaje exacto */
          <div
            className={`h-full rounded-full transition-all duration-300 ease-out ${barColor}`}
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          />
        )}
      </div>
    </div>
  );
}
