import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

/**
 * TooltipProvider - Proveedor global para retrasos y estado accesible de Tooltips.
 */
export function TooltipProvider({ delayDuration = 200, children, ...props }) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration} {...props}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

/**
 * Tooltip - Componente tooltip accesible construido con @radix-ui/react-tooltip.
 * Respeta teclado (Escape para descartar, Tab/focus para mostrar), colisiones en viewport y tokens de diseño.
 */
export default function Tooltip({
  children,
  content,
  side = 'top',
  align = 'center',
  className = '',
  sideOffset = 6
}) {
  if (!content) return children;

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          avoidCollisions={true}
          className={`z-50 px-2.5 py-1 text-[11px] font-medium text-white bg-slate-900 dark:bg-slate-800 dark:text-slate-100 rounded-lg shadow-md border border-slate-700/50 select-none animate-fadeIn ${className}`}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-slate-900 dark:fill-slate-800" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
