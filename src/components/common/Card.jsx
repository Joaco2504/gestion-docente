import React from 'react';

export default function Card({ children, className = '', hover = false, ...props }) {
  const hoverClasses = hover ? 'hover:border-primary/40 hover:shadow-md transition-all duration-200' : '';

  return (
    <div
      className={`bg-surface rounded-xl border border-surface-border p-5 shadow-sm ${hoverClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
