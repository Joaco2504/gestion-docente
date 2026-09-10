import React from 'react';

export default function Card({ children, className = '', hover = false, ...props }) {
  const hoverClasses = hover 
    ? 'hover:border-primary/40 dark:hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer' 
    : '';

  return (
    <div
      className={`bg-surface rounded-2xl border border-surface-border p-5 shadow-xs transition-colors duration-200 ${hoverClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
