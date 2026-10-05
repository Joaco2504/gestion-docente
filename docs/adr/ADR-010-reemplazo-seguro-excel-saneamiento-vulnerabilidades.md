# ADR-010: Reemplazo Seguro de Excel, Saneamiento de Vulnerabilidades y Mitigación de Archivos No Confiables

- **Fecha:** 2026-10-05
- **Estado:** Aceptado
- **Fase:** Fase 10 (Sub-mejora 10.1) - Mejoras modulares opcionales
- **Autor:** Antigravity Agentic Assistant

---

## 1. Contexto y Problema

El procesamiento e importación/exportación de nóminas y sábanas de notas en Korum utilizaba `xlsx@^0.18.5` obtenido desde el registro público de npm:
1. **Vulnerabilidades Críticas Reportadas:** La versión `xlsx@0.18.5` en npm fue abandonada por sus mantenedores en mayo de 2022 y contiene vulnerabilidades activas sin parches en npm:
   - **Prototype Pollution** (CVE-2023-30533 / GHSA-4r6h-8v6p-xvw6): manipulación de prototipos de objetos vía inyección de cabeceras maliciosas en hojas de cálculo.
   - **Regular Expression Denial of Service (ReDoS)** (CVE-2024-22363 / GHSA-5pgg-2g8v-p4x9): agotamiento de CPU por patrones regex complejos en el parser.
2. **Tratamiento de Archivos de Usuario como No Confiables:** Las funciones de lectura en `src/lib/excel.js` y `ExcelImporter.jsx` carecían de límites explícitos de tamaño de archivo (pudiendo saturar la memoria del navegador móvil con archivos sobredimensionados) y de filtrado estricto de propiedades peligrosas.
3. **Requisito de Compatibilidad de Formatos:** Docentes de diversas instituciones escolares operan con archivos legados en formato binario `.xls` (BIFF8), además del estándar `.xlsx` y archivos `.csv`.

---

## 2. Decisión de Diseño

Se adoptó una estrategia de remediación integral compuesta por tres pilares:

### 2.1 Adopción de la Distribución Oficial Segura de SheetJS (Apache-2.0)
- Se actualizó la dependencia hacia la distribución canónica oficial:
  `"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"`
- **Licencia:** 100 % libre bajo Apache-2.0 (cero costos comerciales).
- **Remediación en npm audit:** Eliminación total de las alertas de Prototype Pollution y ReDoS vinculadas a `xlsx`.
- **Aislamiento en Vite:** Conservación del chunk Rollup dedicado `vendor-excel` en `vite.config.js`, cargado únicamente bajo demanda (*lazy*) al importar o exportar planillas.

### 2.2 Blindaje de Archivos Externos No Confiables
En [`src/lib/excel.js`](file:///c:/Users/emili/Documents/docente/src/lib/excel.js) y [`src/components/catedra/ExcelImporter.jsx`](file:///c:/Users/emili/Documents/docente/src/components/catedra/ExcelImporter.jsx):
- **Límite de Tamaño Máximo:** Establecido en 5 MB (`MAX_EXCEL_FILE_SIZE = 5 * 1024 * 1024`). Archivos que superen este umbral son rechazados inmediatamente antes de procesar su contenido en memoria.
- **Límite Defensivo de Filas:** Tope de 5.000 filas por planilla (`MAX_ROWS_LIMIT = 5000`) para mitigar ataques de denegación de servicio por memoria o CPU.
- **Validación Estricta de Extensiones:** Admisión exclusiva de `.xlsx`, `.xls` y `.csv`.
- **Defensa contra Prototype Pollution:** Sanitización pura de cada fila mediante `sanitizeRowObject`, descartando claves reservadas (`__proto__`, `constructor`, `prototype`).

### 2.3 Preservación Estricta de la API Pública
Se mantuvo la firma y comportamiento exacto de todas las funciones exportadas:
- `parseExcelOrCsv(file)`
- `parseExcelFile(file)`
- `exportToExcel(data, fileName)`
- `autoDetectColumns(headers)`
- `sanitizeStudentRows(rows, mapping)`
- `exportGradesToExcel(...)`
- `exportGradesToCsv(...)`
- `exportGradesToFile(...)`
- `exportMesaExamenToExcel(...)`
- `exportAttendanceToExcel(...)`

---

## 3. Pruebas y Verificación

1. **Auditoría de Seguridad (`npm audit`):**
   - Las 2 vulnerabilidades críticas asociadas a `xlsx` quedaron 100 % remediadas.
2. **Compilación de Producción (`npm run build`):**
   - 2.677 módulos transformados exitosamente en ~12-16s sin advertencias.
   - Chunk `vendor-excel` aislado en 500 kB (163 kB gzipped).
3. **Suite pgTAP (`npm run db:test`):**
   - **8 suites, 50/50 tests passing (100 % éxito)**.
4. **Verificación de Schema Drift (`npm run db:diff`):**
   - Cero diferencias (`No schema changes found`).
5. **Pruebas de Unidad en Node:**
   - Validación de rechazo de archivos > 5MB, rechazo de 0 bytes y formatos no admitidos.
   - Detección de columnas y sanitización de duplicados comprobadas con 100% de éxito.

---

## 4. Consecuencias

- **Positivas:**
  - Código y dependencias 100% libres de vulnerabilidades de seguridad conocidas en el motor de planillas.
  - Compatibilidad total preservada con `.xlsx`, `.xls` y `.csv`.
  - Navegador protegido contra archivos maliciosos o de gran volumen.
  - Cero breaking changes en componentes consumidores (`ExcelImporter`, `AttendanceTab`, `GradesTab`, `MesaDetalleView`).
- **Negativas / Costos:**
  - Dependencia de un archivo tarball seguro servido desde `cdn.sheetjs.com`.
