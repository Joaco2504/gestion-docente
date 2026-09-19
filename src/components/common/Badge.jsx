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

  const selectedVariant = variants[variant] || variants.default;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full uppercase tracking-wider ${sizeClasses} ${selectedVariant} ${className}`}>
      {children}
    </span>
  );
}
