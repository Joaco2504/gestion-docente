import React from 'react';
import { Loader2 } from 'lucide-react';

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
  // Base with ergonomic mobile touch-target and interactive micro-animations
  const base = 'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] touch-target-44 cursor-pointer';

  const sizes = {
    sm: 'px-3 py-2 sm:py-1.5 text-xs gap-1.5 min-h-[40px] sm:min-h-[32px]',
    md: 'px-4 py-2.5 sm:py-2 text-sm gap-2 min-h-[44px] sm:min-h-[38px]',
    lg: 'px-5 py-3 sm:py-2.5 text-base gap-2.5 min-h-[48px] sm:min-h-[44px]'
  };

  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover focus:ring-primary shadow-sm hover:shadow-md dark:shadow-primary/20 hover:brightness-105 active:brightness-95',
    secondary: 'bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-surface-border focus:ring-primary/20 shadow-xs hover:border-text-muted/30',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-sm dark:shadow-rose-600/20 hover:brightness-105',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface-hover',
    outline: 'border border-primary/50 text-primary hover:bg-primary/10 dark:hover:bg-primary/20 focus:ring-primary/20 font-semibold hover:border-primary'
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
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
