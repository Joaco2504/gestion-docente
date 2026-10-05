# Plan de Refactorización Integral - Korum

Este documento registra el progreso y estado de las 10 fases del plan de refactorización integral de Korum.

---

## Estado General de las Fases

| Fase | Título | Estado | Rama |
|---|---|---|---|
| **Fase 1** | Línea base y saneamiento del *schema drift* | 🟢 Hecha | `refactor/fase-1-schema-baseline` |
| **Fase 2** | Seguridad y endurecimiento RLS | 🟢 Hecha | `refactor/fase-2-seguridad-rls` |
| **Fase 3** | Unificación de columnas duplicadas (expand → migrate → contract) | 🟢 Hecha | `refactor/fase-3-unificacion-columnas` |
| **Fase 4** | Integridad de dominios (ENUM vs. CHECK) | 🟢 Hecha | `refactor/fase-4-integridad-dominios` |
| **Fase 5** | Refactor de `DashboardPage.jsx` (sin cambio visual) | 🟢 Hecha | `refactor/fase-5-dashboard-modularizacion` |
| **Fase 6** | Rendimiento y RPC `dashboard_resumen` | ⚪ Pendiente | — |
| **Fase 7** | Capa de datos con TanStack Query | ⚪ Pendiente | — |
| **Fase 8** | Rediseño integral del Dashboard | ⚪ Pendiente | — |
| **Fase 9** | Gráficos accesibles con Recharts / Visx | ⚪ Pendiente | — |
| **Fase 10** | Mejoras modulares opcionales | ⚪ Pendiente | — |

---

## Detalle de Fases

### Fase 1: Línea base y saneamiento del *schema drift*
- **Objetivo:** Comparar el dump real de Supabase contra `schema.sql` y las migraciones históricas, documentar el drift en `docs/db/DRIFT_REPORT.md`, generar una migración baseline consolidada con timestamp (`supabase/migrations/20261004220000_baseline.sql`), archivar migraciones viejas en `supabase/legacy/`, y generar tipos TypeScript (`src/types/database.types.ts`).
- **Estado:** 🟢 Hecha (Verificado con `npm run db:diff` vacío, `npm run db:types` y `npm run build` sin errores).

### Fase 2: Seguridad y endurecimiento RLS
- **Objetivo:** Auditar y restringir Storage `archivos-docentes` por `{docente_id}/{catedra_id}`, remover canales Discord hardcodeados hacia `configuracion_sistema` o env, resolver recursión de políticas en `perfiles`, asegurar `search_path` en funciones `SECURITY DEFINER` y suites pgTAP.
- **Estado:** 🟢 Hecha (Migración `20261004230000_fase2_seguridad_rls.sql` aplicada, `npm run db:test` 6/6 en verde, manifiesto de storage generado, `npm run build` en verde).

### Fase 3: Unificación de columnas duplicadas
- **Objetivo:** Proceso expand → migrate → contract para unificar columnas (`notas.valor`/`nota`, `evaluaciones.titulo`/`nombre`/`fecha`, `recursos.url_o_path`/`url`, `inscripciones.estado_ram`/`estado_academico`, `criterios_evaluacion.min_asist_*`/`catedras.ram_asistencia_*`). ADR para `docentes` vs `perfiles`.
- **Estado:** 🟢 Hecha (5 sub-entregas expand aplicadas y verificadas con 34/34 tests pgTAP pasando, 0 schema drift, build en verde; contratos pendientes archivados en `supabase/contract_pending/`; ADR-003 presentado para decisión Go / No-Go).

### Fase 4: Integridad de dominios (ENUM vs. CHECK)
- **Objetivo:** Clasificar dominios estables vs crecientes, crear constantes canónicas y tipos TypeScript en `src/lib/enums.ts`, implementar CHECK constraints y triggers auto-normalizadores (`BEFORE INSERT OR UPDATE`) en PostgreSQL, eliminar strings mágicos en componentes frontend, crear rollback y tests pgTAP dedicados.
- **Estado:** 🟢 Hecha (Migración `20261005070000_fase4_integridad_dominios.sql` aplicada, suite pgTAP `07_fase4_dominios_integrity.sql` con 7/7 tests y 41/41 globales en verde, 0 drift en `npm run db:diff`, build en verde, ADR-004 documentado).

### Fase 5: Refactor de `DashboardPage.jsx` (sin cambio visual)
- **Objetivo:** Modularizar `DashboardPage.jsx` en subcomponentes (`src/features/dashboard/`) de menos de 300 líneas, orquestador de menos de 200 líneas, manteniendo paridad visual estricta mediante capturas en todos los breakpoints.
- **Estado:** 🟢 Hecha (Orquestador `DashboardPage.jsx` reducido a 179 líneas; 11 módulos cohesivos en `src/features/dashboard/` con < 260 líneas cada uno; 0 cambios visuales; `npm run build` en verde en 10s; suite pgTAP 41/41 pasando; ADR-005 documentado).

### Fase 6: Rendimiento y RPC `dashboard_resumen`
- **Objetivo:** Consolidar métricas del dashboard en RPCs de PostgreSQL (`dashboard_resumen`, `dashboard_agenda`), golden tests comparativos cliente vs RPC, eliminar N+1 de asistencias y clases.
- **Estado:** ⚪ Pendiente.

### Fase 7: Capa de datos con TanStack Query
- **Objetivo:** Implementar `@tanstack/react-query`, reemplazar gradualmente `catedraCache.js`, tipar llamadas Supabase con `Database`.
- **Estado:** ⚪ Pendiente.

### Fase 8: Rediseño integral del Dashboard
- **Objetivo:** Jerarquía docente orientada al día ("Hoy", alertas de riesgo, agenda de 15 días, métricas, grilla), tarjetas unificadas en `Card.jsx`, accesibilidad AA en 320–1024px.
- **Estado:** ⚪ Pendiente.

### Fase 9: Gráficos accesibles con Recharts / Visx
- **Objetivo:** Reemplazar gráficos SVG caseros por wrappers Recharts/Visx lazy-loaded con chunk dedicado y paleta de tokens.
- **Estado:** ⚪ Pendiente.

### Fase 10: Mejoras modulares opcionales
- **Objetivo:** Mejoras aprobadas una por una: `react-hook-form` + `zod`, `@tanstack/react-table`, `date-fns`, `shadcn/ui`, `exceljs`, tipado TypeScript progresivo.
- **Estado:** ⚪ Pendiente.
