# ADR-014: Primitivas Accesibles de Interfaz con Radix UI (@radix-ui/react-dialog, dropdown-menu, tooltip) y Aislamiento en Bundle

- **Fecha:** 2026-10-05
- **Estado:** Aceptado
- **Fase:** Fase 10 (Sub-mejora 10.5) - Mejoras modulares opcionales
- **Autor:** Antigravity Agentic Assistant

---

## 1. Contexto y Problema

El sistema Korum depende extensivamente de ventanas modales, diálogos y tarjetas con alertas contextuales (más de 20 modales operativos entre cátedras, dashboard, mesas de examen y reportes):
1. **Falta de Trampa de Foco WAI-ARIA:** La implementación previa de `Modal.jsx` dependía de un `div` absoluto con listeners manuales en `window` para la tecla `Escape`. Al presionar la tecla `Tab`, el foco del teclado podía escapar del modal hacia elementos interactivos de fondo, violando el estándar de accesibilidad WAI-ARIA Dialog (Modal).
2. **Restauración de Foco Inconsistente:** Al cerrarse un modal, el foco no retornaba de manera determinista al elemento disparador (*trigger*), desorientando a usuarios que navegan mediante tecnología asistiva o teclado.
3. **Recortes por `overflow-hidden`:** Componentes como `RiskBadge.jsx` renderizaban sus tooltips flotantes mediante posicionamiento absoluto manual dentro de sus propios contenedores, provocando recortes visuales cuando estaban dentro de tablas o tarjetas con desbordamiento oculto.
4. **Ausencia de Menús Desplegables Estandarizados:** Las acciones secundarias se resolvían con acordeones caseros o botones repetitivos sin detección de colisiones de pantalla ni navegación con flechas de cursor.

---

## 2. Decisión de Diseño

Se integraron las primitivas oficiales de **Radix UI** (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tooltip`) bajo licencia 100% MIT:

### 2.1 Aislamiento en Chunk Rollup (`vendor-radix`)
- Se instalaron las 3 dependencias unstyled oficiales.
- Se configuró el chunk dedicado `'vendor-radix': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tooltip']` en `vite.config.js`.
- Tamaño en bundle de producción: **74.82 kB (25.89 kB gzipped)**, sin afectar el bundle principal.

### 2.2 Refactorización de `src/components/common/Modal.jsx` (148 líneas)
- Se sustituyó el marcado manual por la suite de primitivas `Dialog.Root`, `Dialog.Portal`, `Dialog.Overlay`, `Dialog.Content`, `Dialog.Title`, `Dialog.Description` y `Dialog.Close`.
- **Beneficios inmediatos para todos los modales de la aplicación:**
  - Trampa de foco nativa que mantiene el ciclo del `Tab` estrictamente dentro del diálogo.
  - Cierre accesible con tecla `Escape` y retorno de foco al disparador al desmontarse.
  - Bloqueo y restauración de scroll de fondo gestionado por Radix sin efectos secundarios.
  - Títulos semánticos obligatorios para lectores de pantalla con fallback accesible (`sr-only`).
  - Preservación íntegra del gesto táctil mobile *swipe-down* mediante Pointer Events en la cabecera.

### 2.3 Creación de `DropdownMenu.jsx` (66 líneas)
- Módulo accesible reutilizable con `DropdownMenu.Root`, `Trigger`, `Content`, `Item`, `Label` y `Separator`.
- Soporte para navegación con flechas arriba/abajo, cierre con `Escape`, selección con `Enter` y detección automática de colisión en viewport (`avoidCollisions={true}`).

### 2.4 Refactorización de `Tooltip.jsx` (48 líneas) y `RiskBadge.jsx` (114 líneas)
- Se proveyó `TooltipProvider` global en `App.jsx` con retardo configurable (200ms).
- Se refactorizó `RiskBadge.jsx` para proyectar su panel informativo a través de `TooltipPrimitive.Portal`, eliminando recortes por contenedores con `overflow-hidden` en tablas de notas, asistencias y nóminas de alumnos.

---

## 3. Pruebas y Verificación

1. **Compilación de Producción (`npm run build`):**
   - 3.670 módulos transformados en 22.61s.
   - Chunk `vendor-radix` aislado limpiamente (74.82 kB / 25.89 kB gzipped).
   - 0 errores o advertencias de compilación.
2. **Suite pgTAP (`npm run db:test`):**
   - **8 suites, 50/50 tests passing (100 % éxito)**.
3. **Verificación de Schema Drift (`npm run db:diff`):**
   - **0 diferencias de esquema (`No schema changes found`)**.
4. **Límites de Líneas de Código:**
   - `Modal.jsx`: 148 líneas (< 300).
   - `DropdownMenu.jsx`: 66 líneas (< 300).
   - `Tooltip.jsx`: 48 líneas (< 300).
   - `RiskBadge.jsx`: 114 líneas (< 300).
   - `App.jsx`: 193 líneas (< 200).

---

## 4. Estado de Licencias y Dependencias

- `@radix-ui/react-dialog`: MIT.
- `@radix-ui/react-dropdown-menu`: MIT.
- `@radix-ui/react-tooltip`: MIT.
- 100 % Open Source, cero dependencias comerciales.
