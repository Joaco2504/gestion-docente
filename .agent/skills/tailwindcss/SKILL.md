---
name: tailwindcss
description: Tailwind CSS expert guidance — design tokens, responsive layouts, Bento grids, dark mode strategies, theme extension, typography, custom keyframes and utility-first best practices. Use when styling components, configuring tailwind.config.js, building responsive interfaces, or debugging CSS utility issues.
metadata:
  repo: https://github.com/tailwindlabs/tailwindcss
  docs: https://tailwindcss.com/docs
triggers:
  - tailwind
  - tailwindcss
  - css
  - estilos
  - layout
  - responsive
  - dark mode
---

# Tailwind CSS Master Guide

Guía experta de **Tailwind CSS** para interfaces modernas tipo SaaS, Bento Grid y ergonomía mobile-first.

## 1. Principios Fundamentales
- **Utility-First**: Componer interfaces combinando clases atómicas en lugar de escribir hojas de estilos CSS tradicionales.
- **Sin Nombres Dinámicos Fragmentados**: NUNCA concatenar cadenas para construir clases (ej: `text-${color}-500` no es detectado por el compilador JIT). Usar mapas de clases completas:
  ```javascript
  const COLOR_MAP = {
    primary: 'bg-primary text-white border-primary',
    emerald: 'bg-emerald-500 text-white border-emerald-600',
    amber: 'bg-amber-500 text-white border-amber-600',
  };
  ```

## 2. Configuración y Tokens de Diseño (`tailwind.config.js`)
- **Modo Oscuro**: Configurar siempre `'class'` para alternar mediante la clase `.dark` en el elemento raíz (`<html>` o `<body>`):
  ```javascript
  darkMode: 'class',
  ```
- **Sincronización con Variables CSS**: Para temas dinámicos de color, definir variables en `:root` y mapearlas en `colors`:
  ```javascript
  colors: {
    primary: {
      DEFAULT: 'rgb(var(--color-primary-rgb, 26 86 219) / <alpha-value>)',
      hover: 'rgb(var(--color-primary-hover-rgb, 30 66 159) / <alpha-value>)',
    }
  }
  ```

## 3. Patrones de Diseño Bento Grid
- Mosaicos auto-adaptables con `grid` y `col-span`:
  ```jsx
  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
    {/* Tarjeta Principal Hero */}
    <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 shadow-sm">
      ...
    </div>
    {/* Tarjeta Lateral de Métrica */}
    <div className="col-span-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 shadow-sm">
      ...
    </div>
  </div>
  ```

## 4. Modo Claro y Oscuro Simétrico
- Aplicar siempre pares simétricos de contraste:
  - **Fondo base**: `bg-white dark:bg-slate-900`
  - **Fondo secundario / hover**: `bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800`
  - **Bordes**: `border-slate-200/80 dark:border-white/10`
  - **Texto título**: `text-slate-900 dark:text-white`
  - **Texto secundario**: `text-slate-600 dark:text-slate-400`
  - **Texto atenuado**: `text-slate-400 dark:text-slate-500`

## 5. Tablas y Contenedores Densos
- Para planillas de asistencia y calificaciones:
  ```jsx
  <div className="overflow-x-auto select-none touch-pan-x rounded-2xl border border-slate-200/80 dark:border-white/10">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-white/10">
          <th className="sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300">
            Estudiante
          </th>
          ...
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
        ...
      </tbody>
    </table>
  </div>
  ```

## 6. Microinteracciones y Elevación
- Botones interactivos con respuesta física:
  ```jsx
  <button className="px-4 py-2.5 rounded-xl font-semibold bg-primary text-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ease-out">
    Guardar Cambios
  </button>
  ```
