import React from 'react';

export default function Card({ children, className = '', hover = false, ...props }) {
  const hoverClasses = hover 
    ? 'hover:-translate-y-0.5 hover:border-primary/40 dark:hover:border-primary/50 hover:shadow-md cursor-pointer' 
    : '';

  return (
    <div
      className={`backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] transition-all duration-200 ${hoverClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
