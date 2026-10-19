# 04. Historial de Cambios y Estado Actual — Korum 2.0

Bitácora técnica viva donde se registran cronológicamente todas las directivas, refactorizaciones y correcciones realizadas para preservar la memoria del proyecto y evitar cualquier tipo de regresión.

---

## Hitos Históricos y Mejoras de Producción

### 1. Catálogo Completo Decreto 1092/1979 e Integración de Licencias
- Creación de [`src/utils/decreto1092Catalog.js`](file:///c:/Users/emili/Documents/docente/src/utils/decreto1092Catalog.js) con catálogo completo de artículos.
- Soporte para licencias multi-día con cómputo de días `CORRIDOS` y `HABILES`.
- Control de cupos anuales y mensuales en tiempo real.

### 2. Edición Completa de Licencias Registradas y Reconciliación
- Creación de `updateLicencia` en [`src/services/licenciasService.js`](file:///c:/Users/emili/Documents/docente/src/services/licenciasService.js) con reconciliación de fechas liberadas vs nuevas fechas alcanzadas.
- Exclusión del registro en edición al evaluar topes disponibles para evitar falsos bloqueos.

### 3. Corrección Exhaustiva de Vistas Desktop (10 Puntos UI/UX)
- Solución definitiva al solapamiento en el Header ([`Navbar.jsx`](file:///c:/Users/emili/Documents/docente/src/components/layout/Navbar.jsx)) eliminando `absolute` de la barra central y distribuyendo 3 bloques `flex`.
- Optimización de tarjetas de Clases Registradas, Calendario, SuperAdmin, Login y Portal Estudiantil en resoluciones de escritorio.

### 4. Rediseño del Portal Estudiantil "Mi espacio académico"
- Enmascaramiento de DNI (`42.***.302`) por privacidad en [`ConsultaAlumnoPage.jsx`](file:///c:/Users/emili/Documents/docente/src/pages/ConsultaAlumnoPage.jsx).
- Explicación pedagógica de la condición del alumno (Regular, Promocional, Libre) y tarjetas adaptables en dispositivos móviles.

### 5. Autogeneración Estricta en Días de Cursada y Soporte de Feriados Oficiales
- Implementación de regla estricta: solo se autogeneran clases en días de la semana donde la cátedra efectivamente se dicta (`catedraHasClassOnDate`).
- Catálogo oficial `FERIADOS_OFICIALES_2026` con prioridad absoluta sobre licencias docentes (verificado con regresión para el lunes 12/10/2026).
- 67 tests unitarios pasando en Vitest y build limpio con Vite.

### 6. Instalación de Skills y Motores de Estado
- `cursor-memory-bank`: Directorio `memory-bank/` + comandos `/van`, `/plan`, `/creative`, `/build`, `/reflect`, `/archive`.
- `claude-task-master`: Motor de estado determinista `.taskmaster/` + CLI `scripts/taskmaster-state.mjs` (`npm run tm`).
- `bmad-method`: 31 skills oficiales + directorio `_bmad/` inicializado con `uv`.

### 7. Auditoría y Refactorización Responsiva Integral (Phone 360px–430px & Tablet 768px–1024px)
- **Estado:** ✅ Completado y Verificado (Fases 1 a 8).
- **Alcance y Mejoras Realizadas:**
  * **Viewport y Scroll:** Contención global en `html, body, #root { overflow-x: hidden; max-width: 100vw; }` en `index.css`.
  * **Layout Global:** Padding inferior en `AppLayout.jsx` (`pb-28 lg:pb-12`) previniendo solapamiento con el `BottomNav` móvil.
  * **Header & Navbar:** Selectores en `HeaderSelector.jsx` fluidos con `min-w-0`, truncado de selector de cátedra en celulares, botón táctil de búsqueda de 44px.
  * **BottomNav:** Padding seguro `pb-safe`, áreas de contacto mínimas de 48px, texto de 10px con truncado defensivo.
  * **Dashboard:** Bento cards 50/50 y tarjetas de acciones rápidas fluidas sin desbordes horizontales en 360px.
  * **Cátedra & Asistencia:** Botonera táctil de 3 estados (Presente, Ausente, Justificado) en tarjetas móviles con $44\text{px}\times 44\text{px}$, barra de temas y Decreto 1092 con ajuste flexible en pantallas estrechas.
  * **Calendario:** Horas de referencia (`07:00 hs`, etc.) fijadas con `sticky left-0` para mantener la orientación temporal mientras se desliza horizontalmente entre días en móviles y tablets.
  * **Modales:** Limitación universal en `Modal.jsx` a `max-h-[90dvh]` con scroll vertical independiente y gesto táctil swipe-down para descartar.
  * **Login & Portal Estudiantil:** Formulario con padding elástico para celulares (`p-4 xs:p-6`), DNI enmascarado (`42.***.302`), y tabla de calificaciones que transmuta automáticamente a tarjetas apiladas en pantallas pequeñas.
  * **QA & Build:** 67/67 pruebas unitarias aprobadas en Vitest (`npx vitest run --passWithNoTests`) y build de producción exitoso con Vite (Código 0).

### 8. Integración de Vercel Speed Insights
- **Estado:** ✅ Completado y Verificado.
- **Detalle:**
  * Paquete `@vercel/speed-insights` verificado e instalado en `package.json`.
  * Integración en la raíz de la aplicación ([`src/App.jsx`](file:///c:/Users/emili/Documents/docente/src/App.jsx)) importando y montando `<SpeedInsights />` junto a `<Analytics />`.
  * Verificación de calidad: 67/67 tests pasando en Vitest y compilación de producción exitosa con Vite (código 0).
