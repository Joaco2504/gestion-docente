import React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';

/**
 * DropdownMenu - Primitiva de menú contextual accesible con @radix-ui/react-dropdown-menu.
 * Soporta navegación por flechas, detección de colisión y focus trapping según WAI-ARIA.
 */
export function DropdownMenu({ children, ...props }) {
  return <DropdownMenuPrimitive.Root {...props}>{children}</DropdownMenuPrimitive.Root>;
}

export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;

export function DropdownMenuContent({
  className = '',
  sideOffset = 6,
  align = 'end',
  children,
  ...props
}) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        avoidCollisions={true}
        className={`z-50 min-w-[12rem] bg-surface rounded-2xl border border-surface-border p-1.5 shadow-xl text-text-primary focus:outline-hidden data-[state=open]:animate-fadeIn data-[state=closed]:animate-fadeOut ${className}`}
        {...props}
      >
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({ className = '', children, ...props }) {
  return (
    <DropdownMenuPrimitive.Item
      className={`relative flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer select-none outline-hidden transition-colors data-[highlighted]:bg-surface-hover data-[highlighted]:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Item>
  );
}

export function DropdownMenuLabel({ className = '', children, ...props }) {
  return (
    <DropdownMenuPrimitive.Label
      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted ${className}`}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Label>
  );
}

export function DropdownMenuSeparator({ className = '', ...props }) {
  return (
    <DropdownMenuPrimitive.Separator
      className={`-mx-1 my-1 h-px bg-surface-border ${className}`}
      {...props}
    />
  );
}
