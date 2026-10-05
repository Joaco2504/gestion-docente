# ADR-013: Tablas Avanzadas de Alta Densidad con TanStack Table (@tanstack/react-table) y Accesibilidad WCAG AA

- **Fecha:** 2026-10-05
- **Estado:** Aceptado
- **Fase:** Fase 10 (Sub-mejora 10.4) - Mejoras modulares opcionales
- **Autor:** Antigravity Agentic Assistant

---

## 1. Contexto y Problema

Las pantallas de gestión académica de Korum (como `StudentsTab.jsx`, `GradesTab.jsx` y `AttendanceTab.jsx`) manipulan nóminas densas de estudiantes con múltiples condiciones, badges y métricas:
1. **Acoplamiento de Lógica y Marcado:** Las tablas anteriores se renderizaban como marcado HTML `<table>` manual y rígido, con gestión artesanal del ordenamiento mediante múltiples funciones imperativas dispersas (`handleSort`, `renderSortIcon`, `toggleSortAZ`) duplicadas en cada vista.
2. **Deficiencias de Accesibilidad ARIA:** Los encabezados ordenables carecían de atributos semánticos `aria-sort="ascending" | "descending" | "none"` interactivos y no ofrecían un foco por teclado estandarizado ni captions accesibles para lectores de pantalla.
3. **Escalabilidad y Rendimiento:** La tabla de escritorio renderizaba la nómina completa en el DOM sin soporte para paginación controlada ni selección configurable de tamaño de página (15, 25, 50, 100 filas), impactando el rendimiento con cursos numerosos (>100 estudiantes).
4. **Hipertrofia de Componentes:** `StudentsTab.jsx` acumulaba más de 2.260 líneas con componentes internos redundantes (`StudentRow`, `EquivalenciaRow`) que mezclaban lógica de ordenamiento con UI.

---

## 2. Decisión de Diseño

Se integró **TanStack Table v8** (`@tanstack/react-table@^8.20.6`), biblioteca líder en la industria de arquitectura *headless* (100 % Open Source, licencia MIT):

### 2.1 Aislamiento en Chunk Rollup (`vendor-table`)
- Se instaló `@tanstack/react-table@^8.20.6`.
- Se configuró el chunk dedicado `'vendor-table': ['@tanstack/react-table']` en `vite.config.js`.
- Tamaño en bundle de producción: **51.76 kB (13.85 kB gzipped)**, sin afectar el bundle principal.

### 2.2 Componente Modular Reutilizable: `StudentsDataTable`
Se crearon dos módulos especializados con estricto límite de líneas:
1. **`src/components/catedra/tables/studentColumns.jsx` (264 líneas):**
   - Factoría de columnas memoizadas mediante `createColumnHelper`.
   - Soporte desacoplado para ambas modalidades: **Cursantes Regulares** y **Acreditados por Equivalencia**.
   - Celdas especializadas para DNI (tipografía mono con tabular numbers), Apellido/Nombre clickeable para abrir ficha, badges de condición académica, certificados laborales (60%), semáforo de riesgo (`RiskBadge`) y barra de acciones.
2. **`src/components/catedra/tables/StudentsDataTable.jsx` (248 líneas):**
   - Instanciación de `useReactTable` con `getCoreRowModel`, `getSortedRowModel` y `getPaginationRowModel`.
   - **Primera columna anclada (*sticky DNI*)** con sombreado de separación (`shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]`) y compatibilidad con modo claro y oscuro (`bg-surface`).
   - Encabezados pegajosos (`sticky top-0`) con efecto `backdrop-blur`.
   - Botones de ordenamiento accesibles con indicadores visuales claros (`ChevronUp`, `ChevronDown`, `ArrowUpDown`) y soporte nativo para `aria-sort`.
   - Barra de paginación accesible: navegación entre páginas, salto a extremos, indicador de rango ("Mostrando X a Y de Z estudiantes") y selector dinámico de tamaño de página.

### 2.3 Saneamiento de `StudentsTab.jsx`
- Se reemplazó el bloque manual de más de 145 líneas de tablas de escritorio por `<StudentsDataTable ... />`.
- Se eliminaron componentes internos redundantes `StudentRow` y `EquivalenciaRow`, reduciendo `StudentsTab.jsx` en más de 360 líneas de código duplicado.

---

## 3. Pruebas y Verificación

1. **Compilación de Producción (`npm run build`):**
   - 3.606 módulos transformados exitosamente en 26.45s.
   - Chunk `vendor-table` generado limpiamente con 51.76 kB (13.85 kB gzipped).
   - 0 errores o advertencias de compilación.
2. **Suite de Base de Datos pgTAP (`npm run db:test`):**
   - **8 suites, 50/50 tests passing (100 % éxito)**.
3. **Verificación de Schema Drift (`npm run db:diff`):**
   - **0 diferencias de esquema (`No schema changes found`)**.
4. **Límites de Líneas de Código:**
   - `StudentsDataTable.jsx`: 248 líneas (< 300).
   - `studentColumns.jsx`: 264 líneas (< 300).
   - Reducción neta de `StudentsTab.jsx` de 2.261 líneas a ~1.895 líneas.

---

## 4. Estado de Licencias y Dependencias

- `@tanstack/react-table`: MIT (100 % gratuita y Open Source).
- Cumplimiento estricto con las políticas de cero dependencias comerciales y respeto a la privacidad del docente.
