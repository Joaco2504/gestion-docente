import React from 'react';

export default function Badge({ children, variant = 'default', className = '', size = 'md' }) {
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-[10px]' 
    : 'px-2.5 py-1 text-xs';

  const variants = {
    primary: 'bg-primary/10 text-primary border border-primary/20 font-semibold',
    secondary: 'bg-surface-hover text-text-secondary border border-surface-border font-medium',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200 font-medium',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200 font-medium',
    info: 'bg-blue-50 text-blue-700 border border-blue-200 font-medium',
    default: 'bg-surface-hover text-text-secondary border border-surface-border font-medium',
    // Academic semantic variants
    promo: 'bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold',
    regular: 'bg-amber-50 text-amber-800 border border-amber-300 font-bold',
    libre: 'bg-rose-50 text-rose-700 border border-rose-300 font-bold',
    approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium'
  };

  const selectedVariant = variants[variant] || variants.default;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full uppercase tracking-wider ${sizeClasses} ${selectedVariant} ${className}`}>
      {children}
    </span>
  );
}
