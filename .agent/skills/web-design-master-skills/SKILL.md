---
name: web-design-master-skills
description: Marco obligatorio de diseño UI/UX, Design System SaaS Bento Grid, ergonomía mobile-first y microinteracciones de PlanillaDocente.
triggers:
  - diseño
  - ui
  - ux
  - bento
  - estilos
  - componentes
  - mobile
  - tablas
---

# Antigravity System Directive: Web Design & UI/UX Master Skills

Marco de habilidades de diseño obligatorio para cada componente, vista o ajuste visual en **PlanillaDocente**:

## 1. Design System & Estética Moderna
- **Tailwind CSS Puro**: Enfoque limpio tipo SaaS / Bento Grid.
- **Soporte Simétrico Claro / Oscuro**:
  - Fondos: `bg-white dark:bg-slate-900`
  - Bordes: `border border-slate-200/80 dark:border-white/10`
  - Textos: `text-slate-900 dark:text-white` para títulos; `text-slate-600 dark:text-slate-400` para secundarios.
- **Esquinas Redondeadas Consistentes**:
  - `rounded-2xl`: Contenedores y tarjetas principales.
  - `rounded-xl`: Modales, desplegables y botones.
  - `rounded-lg`: Inputs, selects y badges.

## 2. Bento Grid y Jerarquía Espacial
- Estructura tipo mosaico Bento modular y funcional:
  - Cabecera Hero unificada en tarjeta completa (sin partir títulos ni nombres).
  - Tarjetas de resumen con métricas destacadas y gráficos proporcionados.
  - Espaciados armónicos con `gap-4` o `gap-6`.

## 3. UX de Planillas y Tablas Densas
- Planillas de notas, asistencias y nóminas de alumnos:
  - Contenedor con `overflow-x-auto select-none touch-pan-x`.
  - Primera columna congelada: `sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-sm`.
  - Celdas táctiles y cómodas para calificación rápida y control de asistencia.
  - Badges de condición con tonos pasteles suaves y bordes finos:
    - **Verde Esmeralda**: Promoción / Acreditación directa.
    - **Azul**: Regular.
    - **Ámbar**: Recuperatorio / Instancia compensatoria.
    - **Rosa / Rojo**: Libre / No acreditado.

## 4. Motion y Microinteracciones Físicas
- Respuestas visuales al hover y active:
  - Botones primarios: `hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200`.
  - Íconos interactivos: micro-rotaciones (6° a 12°) o escalas (1.05x).
  - Transiciones fluidas: `transition-all duration-200 ease-out`.

## 5. Ergonomía Mobile-First
- Objetivos táctiles mínimos de **44x44 px**.
- Ocultar o colapsar paneles secundarios mediante transiciones suaves (`translate-x`).
- Acciones principales situadas en la zona inferior de la pantalla (zona natural del pulgar).
- Contenedores globales con `overflow-x-hidden` para evitar scroll horizontal indeseado.

## 6. Robustez en Menús Flotantes y Z-Index
- Menús desplegables, selects y popovers nunca deben recortarse por `overflow-hidden`.
- Contenedor de fila con `relative z-20` y lista flotante con `absolute z-50 shadow-2xl max-h-60 overflow-y-auto`.
- Uso de `createPortal` hacia `document.body` para elementos flotantes globales.

## 7. Defensive UI & Estados de Carga
- Skeleton loaders con pulso: `animate-pulse bg-slate-200 dark:bg-slate-800 rounded-lg`.
- `EmptyState` empático con ilustración/icono, mensaje claro y CTA para añadir datos.
- Enmascaramiento de errores técnicos: feedback amigable sin exponer trazas de SQL ni nombres de columnas.
