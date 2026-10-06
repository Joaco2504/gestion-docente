import React from 'react';

/**
 * Card - Primitiva unificada de superficies y Bento Grid.
 * - Sin `transition: all`: transiciones acotadas a propiedades GPU/composición.
 * - Hover elevation acotada estrictamente a dispositivos con cursor real.
 * - Variantes: 'default', 'interactive', 'flat', 'bento', 'highlight'.
 * - Control de espaciado interno: padding 'none', 'sm', 'md', 'lg'.
 */
export default function Card({
  children,
  variant = 'default',
  hover = false,
  padding = 'md',
  className = '',
  as: Component = 'div',
  ...props
}) {
  const paddings = {
    none: 'p-0',
    sm: 'p-3.5 sm:p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8'
  };

  const variants = {
    default: 'backdrop-blur-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]',
    interactive: 'backdrop-blur-xl bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:border-primary/40 dark:[@media(hover:hover)]:hover:border-primary/50 [@media(hover:hover)]:hover:shadow-md cursor-pointer active:scale-[0.99]',
    flat: 'bg-surface dark:bg-slate-900/50 border border-surface-border',
    bento: 'backdrop-blur-2xl bg-white/75 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] [@media(hover:hover)]:hover:border-primary/30 dark:[@media(hover:hover)]:hover:border-primary/40',
    highlight: 'backdrop-blur-xl bg-emerald-500/[0.03] dark:bg-emerald-500/[0.06] border border-primary/30 dark:border-primary/40 shadow-xs'
  };

  const isInteractive = hover || variant === 'interactive';
  const effectiveVariant = isInteractive && variant === 'default' ? 'interactive' : variant;

  const baseClasses = 'rounded-2xl sm:rounded-3xl transition-[transform,border-color,box-shadow,background-color] duration-200 ease-out';
  const paddingCls = paddings[padding] || paddings.md;
  const variantCls = variants[effectiveVariant] || variants.default;

  return (
    <Component
      className={`${baseClasses} ${variantCls} ${paddingCls} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
