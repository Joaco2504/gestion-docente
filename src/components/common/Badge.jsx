import React from 'react';

export default function Badge({ children, variant = 'default', className = '', size = 'md' }) {
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-[10px]' 
    : 'px-2.5 py-1 text-xs';

  const variants = {
    primary: 'bg-primary/10 text-primary border border-primary/20 dark:bg-primary/25 dark:text-blue-300 dark:border-primary/40 font-semibold',
    secondary: 'bg-surface-hover text-text-secondary border border-surface-border font-medium',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 font-medium',
    warning: 'bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 font-medium',
    danger: 'bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 font-medium',
    info: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 font-medium',
    default: 'bg-surface-hover text-text-secondary border border-surface-border font-medium',
    // Academic semantic statuses
    promo: 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 font-bold',
    regular: 'bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 font-bold',
    libre: 'bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700 font-bold',
    approved: 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 font-bold',
    recup: 'bg-purple-50 text-purple-700 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700 font-bold'
  };

  const selectedVariant = variants[variant] || variants.default;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full uppercase tracking-wider ${sizeClasses} ${selectedVariant} ${className}`}>
      {children}
    </span>
  );
}
