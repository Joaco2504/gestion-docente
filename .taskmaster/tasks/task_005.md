# Task ID: 5
**Title:** Autogeneración Estricta en Días de Cursada y Soporte Completo de Feriados
**Status:** done
**Priority:** high
**Dependencies:** 1, 4

## Description
Impedir creación de clases fantasma fuera de dias_clase y garantizar visualización/bloqueo automático de feriados oficiales.

## Implementation Details
Implementa FERIADOS_OFICIALES_2026, isFeriadoDate y filtrado estricto en ensureScheduledClassesToDate, AttendanceTab y LibroTemasTab.

## Test Strategy
Suite Vitest (67/67 tests pasando) incluyendo regresión para lunes 12/10/2026.

