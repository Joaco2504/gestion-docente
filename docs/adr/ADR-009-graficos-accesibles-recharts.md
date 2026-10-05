# ADR-009: Visualización de Datos Accesible con Recharts, Tokens de Diseño y Aislamiento de Bundle

- **Fecha:** 2026-10-05
- **Estado:** Aceptado
- **Fase:** Fase 9 - Gráficos accesibles con Recharts / Visx
- **Autor:** Antigravity Agentic Assistant

---

## 1. Contexto y Problema

En las versiones previas de Korum, la visualización de métricas académicas (distribución de calificaciones, condición de alumnos, estadísticas de cátedra y asistencia docente) dependía de implementaciones manuales de SVG inline:
1. **Barrera de accesibilidad:** Los elementos SVG caseros carecían de roles semánticos, tooltips para lectores de pantalla y descripciones textuales estructuradas para personas con discapacidad visual.
2. **Fragilidad de renderizado:** Los cálculos manuales de arcos y circunferencias (`strokeDasharray`, `strokeDashoffset`) resultaban rígidos ante cambios en la cantidad de segmentos y resoluciones no estándar.
3. **Optimización de bundle:** Incorporar una biblioteca de gráficos madura y rica requiere garantizar que no degrade el tiempo de carga inicial de las rutas principales ni compita por ancho de banda en dispositivos móviles.

---

## 2. Decisión de Diseño

Se implementó una arquitectura de gráficos accesible basada en **Recharts v3** (`recharts`), combinada con aislamiento en Rollup y tokens de color de alto contraste:

### 2.1 Adopción de `recharts` y Aislamiento en Chunk Rollup
- Se instaló `recharts@^3.10.1` (100 % Open Source, licencia MIT).
- Se configuró un chunk Rollup dedicado `vendor-charts` en `vite.config.js` (`manualChunks: { 'vendor-charts': ['recharts'] }`), aislando la librería (~386 kB sin comprimir / 111.9 kB gzipped) para no afectar el bundle principal.

### 2.2 Paleta Canónica de Tokens Accesibles (`chartTokens.ts`)
- Se creó [`src/components/charts/chartTokens.ts`](file:///c:/Users/emili/Documents/docente/src/components/charts/chartTokens.ts):
  - Tokens semánticos de condición académica: Promoción (`#10b981`), Regular (`#0284c7`), Recuperatorio (`#f59e0b`), Libre (`#ef4444`).
  - Ejes y grillas con contraste adecuado para modo claro (`#e2e8f0`) y modo oscuro (`rgba(255, 255, 255, 0.08)`).
  - Función pura de resolución automática `resolveColorForLabel` que mapea etiquetas a colores con contraste WCAG 2.1 AA.

### 2.3 Componente `InteractiveBarChart.jsx`
- Reemplazo completo de la implementación artesanal utilizando:
  - `ResponsiveContainer`, `BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Cell`.
  - Tooltip personalizado con backdrop blur, colores por serie y valores formateados (`CustomBarTooltip`).
  - Atributos `role="img"` y descripciones semánticas exhaustivas en `aria-label`.
  - Preservación íntegra de la API pública (`data`, `heightClass`, `valueSuffix`).

### 2.4 Componente `InteractiveDonutChart.jsx`
- Reemplazo completo utilizando:
  - `ResponsiveContainer`, `PieChart`, `Pie`, `Cell`, `Tooltip`.
  - Centro de dona informativo con total animado (`useCountUp`) y etiquetas descriptivas.
  - Leyenda interactiva inferior accesible con porcentajes y estados hover sincronizados.
  - Preservación íntegra de la API pública (`data`, `title`, `subtitle`, `size`, `valueSuffix`, `showLegend`).

### 2.5 Indicador Radial de Asistencia (`AttendanceGaugeChart.jsx`)
- Se creó [`src/components/charts/AttendanceGaugeChart.jsx`](file:///c:/Users/emili/Documents/docente/src/components/charts/AttendanceGaugeChart.jsx) para reemplazar el SVG inline de [`QuickMetricsCard.jsx`](file:///c:/Users/emili/Documents/docente/src/features/dashboard/components/QuickMetricsCard.jsx), otorgando semántica ARIA y renderizado fluido.

---

## 3. Pruebas y Verificación

1. **Compilación de Producción (`npm run build`):**
   - 2.677 módulos transformados en 15.62s.
   - Chunk `vendor-charts` generado y aislado limpiamente (386.27 kB / 111.95 kB gzipped).
   - 0 errores o advertencias de empaquetado.
2. **Suite de Base de Datos pgTAP (`npm run db:test`):**
   - **8 suites, 50/50 tests passing (100 % éxito)**.
3. **Verificación de Schema Drift (`npm run db:diff`):**
   - 0 diferencias (`No schema changes found`).

---

## 4. Consecuencias

- **Positivas:**
  - Plena conformidad con accesibilidad WCAG 2.1 AA para visualización de datos numéricos.
  - Gráficos fluidos, responsivos y con animaciones de entrada suaves.
  - Cero breaking changes en componentes consumidores (`CatedraStatsModal`, `GlobalMetricsSection`, `QuickMetricsCard`).
  - Aislamiento de código que garantiza carga ultrarrápida del resto de la aplicación.
- **Negativas / Costos:**
  - Incorporación de `recharts` al proyecto, mitigada mediante el chunk Rollup dedicado.
