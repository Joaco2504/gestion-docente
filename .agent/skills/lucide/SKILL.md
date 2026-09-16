---
name: lucide
description: Lucide Icons (lucide-react) expert guidance — icon sizing, strokeWidth styling, tree-shaking optimization, dynamic icon rendering, accessibility patterns, and physical microinteractions (hover scales, rotations, pulses). Use when adding icons to buttons, navbars, badges, alerts, or data visualizations.
metadata:
  repo: https://github.com/lucide-icons/lucide
  docs: https://lucide.dev
triggers:
  - lucide
  - lucide-icons
  - lucide-react
  - icon
  - icono
  - iconos
---

# Lucide Icons Master Guide

Guía experta de **Lucide React** (`lucide-react`) para interfaces modernas y consistentes.

## 1. Instalación e Importación
```bash
npm install lucide-react
```
**Importación Directa con Tree-Shaking**:
```jsx
import { 
  GraduationCap, 
  Calendar, 
  Users, 
  Settings, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
```

## 2. Propiedades Estándar y Consistencia Visual
Para lograr una estética SaaS pulida:
- **Tamaño Estándar**:
  - `w-3.5 h-3.5` (14px): Badges, tooltips pequeños, etiquetas secundarias.
  - `w-4 h-4` (16px): Botones compactos, inputs, migas de pan.
  - `w-5 h-5` (20px): Botones estándar, elementos de lista, items de navegación.
  - `w-6 h-6` (24px): Cabeceras de sección, avatares, modales.
- **Grosor de Trazo (`strokeWidth`)**:
  - Por defecto es `2`.
  - Para estilos minimalistas o fintech/editorial de alta gama, usar `strokeWidth={1.75}` o `strokeWidth={1.5}`.

```jsx
<GraduationCap 
  className="w-5 h-5 text-primary" 
  strokeWidth={2} 
  aria-hidden="true" 
/>
```

## 3. Microinteracciones Físicas con Tailwind
Enriquecer la interactividad en botones y tarjetas:
- **Micro-rotación suave**:
  ```jsx
  <button className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-slate-200 dark:border-white/10">
    <Settings className="w-4 h-4 text-slate-500 group-hover:rotate-45 group-hover:text-primary transition-transform duration-200 ease-out" />
    <span>Configuración</span>
  </button>
  ```
- **Micro-desplazamiento en flechas**:
  ```jsx
  <button className="group inline-flex items-center gap-1.5 text-primary font-bold">
    <span>Explorar</span>
    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200 ease-out" />
  </button>
  ```

## 4. Renderizado Dinámico de Íconos
Cuando el nombre del ícono proviene de una base de datos o prop de configuración:
```jsx
import * as Icons from 'lucide-react';

export function DynamicIcon({ name, className = 'w-4 h-4' }) {
  const IconComponent = Icons[name] || Icons.HelpCircle;
  return <IconComponent className={className} aria-hidden="true" />;
}
```

## 5. Accesibilidad (a11y)
1. **Ícono Decorativo (junto a texto visible)**: Añadir siempre `aria-hidden="true"`.
2. **Botón Solo de Ícono**: Añadir `aria-label="Descripción de la acción"` al `<button>`:
   ```jsx
   <button
     type="button"
     aria-label="Cerrar modal"
     onClick={onClose}
     className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
   >
     <X className="w-4 h-4" aria-hidden="true" />
   </button>
   ```
