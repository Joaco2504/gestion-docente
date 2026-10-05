# ADR-012: Estandarización del Manejo de Fechas con date-fns, Localización en Español y Aislamiento de Bundle

- **Fecha:** 2026-10-05
- **Estado:** Aceptado
- **Fase:** Fase 10 (Sub-mejora 10.3) - Mejoras modulares opcionales
- **Autor:** Antigravity Agentic Assistant

---

## 1. Contexto y Problema

El formateo, cálculo de diferencias relativas y verificación de días festivos en Korum dependía de implementaciones basadas en el constructor nativo `new Date()` y operaciones manuales sobre strings (`split('-')`, `padStart(2, '0')`):
1. **Riesgo de Desfase por Husos Horarios:** En navegadores que ejecutan en zonas horarias locales como Argentina (ART, UTC-3), el parseo de strings en formato `YYYY-MM-DD` mediante `new Date("2026-10-05")` se interpreta por especificación ECMAScript como medianoche UTC, provocando que en horario local se convierta a las 21:00 hs del día anterior (4 de octubre), causando desfasajes de un día en calendarios y sábanas de asistencia.
2. **Cálculos de Diferencias Manuales:** La función `getRelativeDateLabel` calculaba diferencias dividiendo milisegundos entre `86400000`, susceptible a fallos durante cambios de hora de ahorro de luz diurna (DST) o días con saltos horarios.
3. **Mapeo Artesanal de Días:** En `feriadosAcademicos.ts`, la correspondencia de días de semana con horarios de cursada utilizaba un array estático `DIAS_SEMANA_MAP` e índices manuales, propenso a inconsistencias.

---

## 2. Decisión de Diseño

Se integró **`date-fns` v4** junto con el locale oficial en español (`date-fns/locale/es`), preservando al 100 % las firmas de la API pública:

### 2.1 Adopción de `date-fns` y Aislamiento en Chunk Rollup
- Se instaló `date-fns@^4.4.0` (100 % Open Source, licencia MIT).
- Se configuró el chunk dedicado `vendor-dates: ['date-fns']` en `vite.config.js`, logrando un peso minúsculo (~23.8 kB / 7.0 kB gzipped).

### 2.2 Refactorización de `src/lib/dateUtils.js`
- `formatFechaDMY(dateInput)`: Formatea fechas `Date` o ISO a `dd-MM-yyyy` con validación `isValid`.
- `parseDMYtoYMD(dmyStr)`: Normaliza entradas en español `DD-MM-YYYY` hacia el estándar ISO `YYYY-MM-DD`.
- `getTodayDMY()` / `getTodayYMD()`: Generación inmutable de la fecha actual.
- `isDatePast(dateInput)`: Evaluación precisa contra el final del día de la fecha objetivo (`isBefore(endOfDay(parsed), now)`).
- `formatFechaLegible(dateInput)`: Formateo con locale `es` (`EEE d MMM`) con capitalización visual consistente (`Lun 5 Oct`).
- `getRelativeDateLabel(dateInput)`: Diferencia exacta basada en días de calendario (`differenceInCalendarDays`), resolviendo 'Hoy', 'Mañana', 'Pasado mañana', 'Ayer' y días relativos sin desfase de huso horario.

### 2.3 Refactorización de `src/utils/feriadosAcademicos.ts`
- Determinación del día de la semana mediante `format(parsedDate, 'EEEE', { locale: es })` y normalización de texto.
- Evaluación de rango de período lectivo mediante `isWithinInterval` de `date-fns`.
- Preservación 100 % de tipos TypeScript y de la interfaz exportada `feriadoCoincideConCatedra`, `obtenerFeriadosCatedraEnPeriodo`, etc.

---

## 3. Pruebas y Verificación

1. **Pruebas de Unidad en Node:**
   - Formateo DMY, conversión YMD, formateo legible en español, detección de fechas pasadas y etiquetas relativas verificados con 100% de éxito.
   - Verificación de correspondencia de feriados nacionales (ej. 25 de mayo de 2026 como lunes) comprobada con éxito.
2. **Compilación de Producción (`npm run build`):**
   - 3.602 módulos transformados exitosamente en 17.14s.
   - Chunk `vendor-dates` aislado en 23.77 kB (7.00 kB gzipped).
   - 0 errores o advertencias de empaquetado.
3. **Suite pgTAP (`npm run db:test`):**
   - **8 suites, 50/50 tests passing (100 % éxito)**.
4. **Verificación de Schema Drift (`npm run db:diff`):**
   - 0 diferencias (`No schema changes found`).
5. **Límites de Líneas de Código:**
   - `dateUtils.js`: 178 líneas (< 300).
   - `feriadosAcademicos.ts`: 120 líneas (< 300).

---

## 4. Consecuencias

- **Positivas:**
  - Eliminación absoluta de bugs de desfase de día por husos horarios en calendarios y asistencias.
  - Formateo y etiquetas en español idiomático sin arrays caseros.
  - Código inmutable, tipado y protegido contra fechas inválidas.
  - Cero breaking changes en componentes consumidores.
- **Negativas / Costos:**
  - Añade la librería `date-fns` (~7 kB gzipped en chunk aislado `vendor-dates`).
