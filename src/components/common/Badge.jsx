import React from 'react';

/**
 * Badge - Insignia unificada accesible de alta legibilidad para el sistema Korum.
 * - Soporta estados académicos RAM reglamentarios (Catamarca / Argentina).
 * - nowrap y shrink-0 por defecto para evitar cortes o desbordes en tablas densas.
 * - Soporte para punto indicador opcional (dot).
 * - Tamaños: 'xs', 'sm', 'md', 'lg'.
 */
export default function Badge({
  children,
  variant = 'default',
  className = '',
  size = 'md',
  dot = false,
  as: Component = 'span',
  ...props
}) {
  const sizeClasses = {
    xs: 'px-1.5 py-0.2 text-[9px] gap-1',
    sm: 'px-2 py-0.5 text-[10px] sm:text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-xs sm:text-sm gap-2'
  };

  const variants = {
    primary: 'bg-primary/10 text-primary border border-primary/20 dark:bg-primary/25 dark:text-emerald-300 dark:border-primary/40 font-semibold',
    secondary: 'bg-surface-hover text-text-secondary border border-surface-border font-medium',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 font-medium',
    warning: 'bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 font-medium',
    danger: 'bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 font-medium',
    info: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 font-medium',
    default: 'bg-surface-hover text-text-secondary border border-surface-border font-medium',
    
    // Academic semantic statuses (Korum RAM High-Legibility Badges)
    promo: 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] dark:bg-[#064E3B]/40 dark:text-[#6EE7B7] dark:border-[#059669]/50 font-bold',
    promocionado: 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] dark:bg-[#064E3B]/40 dark:text-[#6EE7B7] dark:border-[#059669]/50 font-bold',
    presente: 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] dark:bg-[#064E3B]/40 dark:text-[#6EE7B7] dark:border-[#059669]/50 font-bold',
    approved: 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] dark:bg-[#064E3B]/40 dark:text-[#6EE7B7] dark:border-[#059669]/50 font-bold',
    
    regular: 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] dark:bg-[#172554]/50 dark:text-[#93C5FD] dark:border-[#2563EB]/40 font-bold',
    justificada: 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] dark:bg-[#172554]/50 dark:text-[#93C5FD] dark:border-[#2563EB]/40 font-bold',
    
    recuperatorio: 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] dark:bg-[#451A03]/60 dark:text-[#FCD34D] dark:border-[#D97706]/40 font-bold',
    recup: 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] dark:bg-[#451A03]/60 dark:text-[#FCD34D] dark:border-[#D97706]/40 font-bold',
    alerta: 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] dark:bg-[#451A03]/60 dark:text-[#FCD34D] dark:border-[#D97706]/40 font-bold',
    
    libre: 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] dark:bg-[#450A0A]/60 dark:text-[#FCA5A5] dark:border-[#DC2626]/40 font-bold',
    ausente: 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] dark:bg-[#450A0A]/60 dark:text-[#FCA5A5] dark:border-[#DC2626]/40 font-bold'
  };

  const dotColors = {
    promo: 'bg-emerald-500',
    promocionado: 'bg-emerald-500',
    presente: 'bg-emerald-500',
    approved: 'bg-emerald-500',
    success: 'bg-emerald-500',
    primary: 'bg-emerald-500',
    regular: 'bg-blue-500',
    justificada: 'bg-blue-500',
    info: 'bg-blue-500',
    recuperatorio: 'bg-amber-500',
    recup: 'bg-amber-500',
    alerta: 'bg-amber-500',
    warning: 'bg-amber-500',
    libre: 'bg-rose-500',
    ausente: 'bg-rose-500',
    danger: 'bg-rose-500',
    secondary: 'bg-slate-400',
    default: 'bg-slate-400'
  };

  const selectedSize = sizeClasses[size] || sizeClasses.md;
  const selectedVariant = variants[variant] || variants.default;
  const dotColor = dotColors[variant] || dotColors.default;

  return (
    <Component
      className={`inline-flex items-center whitespace-nowrap shrink-0 w-fit rounded-full uppercase tracking-wider ${selectedSize} ${selectedVariant} ${className}`}
      {...props}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} aria-hidden="true" />
      )}
      <span>{children}</span>
    </Component>
  );
}
