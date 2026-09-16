---
name: radix-ui
description: Radix UI Primitives expert guidance — unstyled accessible React primitives (Dialog, DropdownMenu, Popover, Select, Tooltip, Tabs, Accordion), asChild composition pattern with Slot, focus traps, keyboard navigation, collision-aware floating placement, and data-[state] attribute styling with Tailwind CSS. Use when creating accessible interactive components or customizing shadcn/ui primitives.
metadata:
  repo: https://github.com/radix-ui/primitives
  docs: https://www.radix-ui.com/primitives/docs/overview/introduction
triggers:
  - radix
  - radix-ui
  - primitives
  - dialog
  - dropdown
  - popover
  - tooltip
  - asChild
  - accessibility
---

# Radix UI Primitives Master Guide

Guía experta de **Radix UI Primitives** para construir componentes accesibles y robustos con Tailwind CSS.

## 1. Concepto Fundamental
Radix UI provee componentes **completamente sin estilos (unstyled)** y con **accesibilidad certificada (WAI-ARIA)**. Se enfoca en la gestión de foco, trampas de teclado (focus trap), portales y navegación por teclado (Enter, Esc, Flechas).

## 2. Patrón de Composición `asChild`
La prop `asChild` utiliza internamente `@radix-ui/react-slot` para fusionar props y eventos con el elemento hijo inmediato, evitando añadir divs envolventes innecesarios en el DOM:

```jsx
import * as Dialog from '@radix-ui/react-dialog';

export function ModalTrigger() {
  return (
    <Dialog.Trigger asChild>
      <button className="px-4 py-2 rounded-xl bg-primary text-white font-bold">
        Abrir Diálogo
      </button>
    </Dialog.Trigger>
  );
}
```

## 3. Componentes Clave y Estilizado con Tailwind

### A. Diálogo / Modal Accesible (`@radix-ui/react-dialog`)
```jsx
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

export function CustomDialog({ open, onOpenChange, title, children }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Backdrop animado con data-[state] */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs data-[state=open]:animate-fadeIn data-[state=closed]:animate-fadeOut" />
        
        {/* Contenido centrado con foco atrapado */}
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-6 shadow-2xl focus:outline-hidden data-[state=open]:animate-slideUp">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
            <Dialog.Title className="text-lg font-bold text-slate-900 dark:text-white">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="py-4 text-sm text-slate-600 dark:text-slate-300">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

### B. Menú Desplegable con Detección de Colisión (`@radix-ui/react-dropdown-menu`)
```jsx
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export function ActionMenu({ children, trigger }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {trigger}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={6}
          align="end"
          avoidCollisions={true}
          className="z-50 min-w-[12rem] bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-white/10 p-1.5 shadow-2xl focus:outline-hidden animate-fadeIn"
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
```

## 4. Estados con Selectores `data-[state]`
Radix inyecta atributos `data-state="open"` / `data-state="closed"` o `data-side="top"` / `data-side="bottom"`:
- `data-[state=open]:opacity-100`
- `data-[state=closed]:opacity-0`
- `data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-800` (al navegar con flechas del teclado)

## 5. Reglas de Oro
1. **Siempre usar `<Component.Portal>`** para overlays, popovers y modales. Esto evita que contenedores con `overflow-hidden` o `z-index` recorten la ventana flotante.
2. **`Dialog.Title` es Obligatorio por a11y**: Si el diseño no muestra título visual, incluir `<Dialog.Title className="sr-only">Título Accesible</Dialog.Title>`.
