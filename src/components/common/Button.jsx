import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Button - Primitiva unificada accesible con microinteracciones físicas.
 * Cumple con el sistema de movimiento Korum:
 * - Sin `transition: all`: animaciones acotadas a transform, opacity, background-color, border-color, box-shadow.
 * - Feedback táctil active:scale-[0.97].
 * - Elevación hover acotada estrictamente a dispositivos con puntero (@media(hover:hover)).
 * - Foco accesible WAI-ARIA (focus-visible).
 * - Touch-target mínimo de 44px en móvil.
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  type = 'button',
  className = '',
  ...props
}) {
  const base = 'group inline-flex items-center justify-center font-medium transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none [@media(hover:hover)]:hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] touch-target-44 cursor-pointer';

  const sizes = {
    xs: 'px-2 py-1 text-[11px] gap-1 min-h-[32px] rounded-lg',
    sm: 'px-3 py-1.5 sm:py-1 text-xs gap-1.5 min-h-[40px] sm:min-h-[32px] rounded-xl',
    md: 'px-4 py-2.5 sm:py-2 text-sm gap-2 min-h-[44px] sm:min-h-[38px] rounded-xl',
    lg: 'px-5 py-3 sm:py-2.5 text-base gap-2.5 min-h-[48px] sm:min-h-[44px] rounded-2xl',
    icon: 'p-2 min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center'
  };

  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-hover shadow-xs [@media(hover:hover)]:hover:shadow-md dark:shadow-primary/20',
    secondary: 'bg-surface text-text-primary hover:bg-surface-hover active:bg-surface-hover/80 border border-surface-border shadow-xs hover:border-slate-300 dark:hover:border-slate-700',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-xs dark:shadow-rose-600/20',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface-hover active:bg-surface-hover/80',
    outline: 'border border-primary/50 text-primary hover:bg-primary/10 active:bg-primary/20 font-semibold hover:border-primary',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-xs',
    subtle: 'bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30 border border-primary/20 font-semibold'
  };

  const sizeCls = sizes[size] || sizes.md;
  const variantCls = variants[variant] || variants.primary;

  return (
    <button
      type={type}
      className={`${base} ${sizeCls} ${variantCls} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : React.isValidElement(Icon) ? (
        <span className="shrink-0 transition-transform duration-150 [@media(hover:hover)]:group-hover:scale-110 flex items-center justify-center">
          {Icon}
        </span>
      ) : Icon && (typeof Icon === 'function' || (typeof Icon === 'object' && ('render' in Icon || '$$typeof' in Icon))) ? (
        <Icon className="w-4 h-4 shrink-0 transition-transform duration-150 [@media(hover:hover)]:group-hover:scale-110" />
      ) : null}
      {children ? <span>{children}</span> : null}
    </button>
  );
}
