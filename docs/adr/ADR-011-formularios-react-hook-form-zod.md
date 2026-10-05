# ADR-011: Estandarización de Formularios con React Hook Form, Validación Tipada Zod y Accesibilidad ARIA

- **Fecha:** 2026-10-05
- **Estado:** Aceptado
- **Fase:** Fase 10 (Sub-mejora 10.2) - Mejoras modulares opcionales
- **Autor:** Antigravity Agentic Assistant

---

## 1. Contexto y Problema

Los modales de creación y registro operativo en el Dashboard de Korum (`NuevaCatedraModal`, `QuickClassModal`, `QuickEventModal`) gestionaban sus formularios mediante múltiples estados locales independientes de React (`useState` para cada campo):
1. **Re-renderizados Innecesarios:** Cada pulsación de teclado en los inputs provocaba el re-renderizado integral del modal y de sus componentes hijos.
2. **Validación Dispersa e Inconsistente:** Las comprobaciones de obligatoriedad, formatos de fecha ISO y longitudes máximas estaban codificadas manualmente dentro del manejador de envío (`handleSubmit`), dificultando la reutilización y el testing unitario.
3. **Barreras de Accesibilidad (WCAG 2.1 AA):** Los estados de error se mostraban como textos genéricos sin vinculación programática con los campos correspondientes (`aria-invalid`, `aria-describedby` y `role="alert"` ausentes).

---

## 2. Decisión de Diseño

Se implementó una arquitectura de formularios desacoplada, tipada y accesible:

### 2.1 Adopción de `react-hook-form` + `zod` y Aislamiento en Rollup
- Se instalaron `react-hook-form`, `zod` y `@hookform/resolvers` (100 % Open Source, licencia MIT).
- Se configuró el chunk dedicado `vendor-forms: ['react-hook-form', 'zod']` en `vite.config.js`, aislando la librería (~119 kB / 36.7 kB gzipped) fuera del bundle principal de la aplicación.

### 2.2 Esquemas Canónicos Centralizados (`src/schemas/dashboardForms.js`)
Se definieron esquemas puros y testeables:
- `nuevaCatedraSchema`: Nombre (2 a 100 caracteres con trim), institución requerida, nivel ('TERCIARIO' | 'SECUNDARIO') y modalidad canónica.
- `quickClassSchema`: Fecha válida formato `YYYY-MM-DD` y tema opcional con límite de 250 caracteres.
- `quickEventSchema`: Título (2 a 150 caracteres), tipo de evento restringido al dominio, fecha, hora (`HH:MM`) y notas opcionales.

### 2.3 Refactorización de Modales Operativos
1. [`NuevaCatedraModal.jsx`](file:///c:/Users/emili/Documents/docente/src/features/dashboard/components/modals/NuevaCatedraModal.jsx) (290 líneas):
   - Migrado a `useForm` con `zodResolver(nuevaCatedraSchema)`.
   - Control de campos personalizados (`CustomSelect`) con `Controller`.
   - Mensajes de error accesibles por campo con `role="alert"` y bordes reactivos `border-danger`.
   - Preservación 100 % del flujo hacia Supabase, fallback de modalidad y modo demo.
2. [`QuickClassModal.jsx`](file:///c:/Users/emili/Documents/docente/src/features/dashboard/components/modals/QuickClassModal.jsx) (196 líneas):
   - Migrado a `useForm` con `zodResolver(quickClassSchema)`.
   - Formateo sincronizado de fecha `DD-MM-YYYY` vía `watch('fecha')`.
   - Preservación de la marcación automática de asistencia a matriculados.
3. [`QuickEventModal.jsx`](file:///c:/Users/emili/Documents/docente/src/features/dashboard/components/modals/QuickEventModal.jsx) (254 líneas):
   - Migrado a `useForm` con `zodResolver(quickEventSchema)`.
   - `Controller` para el selector de tipo de evento con badges visuales.
   - Preservación del cálculo de ventana horaria y guardado en `eventos_calendario`.

---

## 3. Pruebas y Verificación

1. **Compilación de Producción (`npm run build`):**
   - 2.776 módulos transformados exitosamente en 16.37s.
   - Chunk `vendor-forms` generado y aislado limpiamente (119.32 kB / 36.69 kB gzipped).
   - 0 errores de empaquetado.
2. **Suite pgTAP (`npm run db:test`):**
   - **8 suites, 50/50 tests passing (100 % éxito)**.
3. **Verificación de Schema Drift (`npm run db:diff`):**
   - 0 diferencias (`No schema changes found`).
4. **Pruebas de Unidad de Esquemas en Node:**
   - Casos válidos e inválidos para los 3 esquemas verificados con 100% de éxito.
5. **Control de Límites:**
   - Ningún componente supera las 300 líneas (290, 196, 254).

---

## 4. Consecuencias

- **Positivas:**
  - Rendimiento óptimo en renderizado: componentes no se re-evalúan en cada tecla.
  - Validación declarativa y tipada que previene envíos de datos inconsistentes.
  - Accesibilidad WCAG 2.1 AA plena para usuarios de tecnologías asistivas en formularios.
  - Esquemas exportables y reutilizables en otros modales y vistas.
- **Negativas / Costos:**
  - Incorporación de `react-hook-form` y `zod`, mitigada mediante el chunk Rollup dedicado `vendor-forms`.
