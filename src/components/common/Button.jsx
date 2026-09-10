import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  ...props
}) {
  // Base with ergonomic mobile touch-target
  const base = 'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.97] touch-target-44';

  const sizes = {
    sm: 'px-3 py-2 sm:py-1.5 text-xs gap-1.5 min-h-[40px] sm:min-h-[32px]',
    md: 'px-4 py-2.5 sm:py-2 text-sm gap-2 min-h-[44px] sm:min-h-[38px]',
    lg: 'px-5 py-3 sm:py-2.5 text-base gap-2.5 min-h-[48px] sm:min-h-[44px]'
  };

  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover focus:ring-primary shadow-sm hover:shadow-md dark:shadow-primary/20',
    secondary: 'bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-surface-border focus:ring-primary/20 shadow-xs',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-sm dark:shadow-rose-600/20',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface-hover',
    outline: 'border border-primary/60 text-primary hover:bg-primary/10 dark:hover:bg-primary/20 focus:ring-primary/20 font-semibold'
  };

  const sizeCls = sizes[size] || sizes.md;
  const variantCls = variants[variant] || variants.primary;

  return (
    <button
      className={`${base} ${sizeCls} ${variantCls} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
