# Task ID: 2
**Title:** Edición Completa de Licencias Registradas
**Status:** done
**Priority:** high
**Dependencies:** 1

## Description
Permitir editar artículo, cantidad de días, fecha de inicio, cátedras alcanzadas y observaciones reconciliando fechas antiguas y nuevas.

## Implementation Details
Reconcilia clases liberadas al acortar o mover fechas y aplica justificación automática en las nuevas fechas alcanzadas.

## Test Strategy
Verificación de updateLicencia en src/services/licenciasService.js y recalculo de saldos excluyendo la licencia en edición.

