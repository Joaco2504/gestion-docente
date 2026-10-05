# Registro de Decisiones de Arquitectura y Refactorización (ADR) - Korum

Este documento registra las decisiones técnicas tomadas a lo largo de las distintas fases de refactorización de Korum, sus fundamentos y contexto.

---

## Índice de Decisiones
- [ADR-001: Línea Base Consolidada y Adopción de Migraciones Versionadas con Timestamp](#adr-001-línea-base-consolidada-y-adopción-de-migraciones-versionadas-con-timestamp)

---

### ADR-001: Línea Base Consolidada y Adopción de Migraciones Versionadas con Timestamp

- **Fecha:** 2026-10-04
- **Estado:** Aceptado
- **Fase:** Fase 1

#### Contexto
El repositorio presentaba un severo *schema drift*:
- El archivo `schema.sql` y más de 30 migraciones sueltas (`v2` a `v26`, `fix_*.sql`) no representaban con fidelidad la base de datos real en Supabase Cloud.
- Migraciones en el repositorio creaban índices sobre columnas inexistentes (`asistencias.catedra_id` y `asistencias.fecha` en `migration_v15`).
- Varias migraciones recientes (`v20`, `v22`, `v23`, `v25`) no habían sido ejecutadas en producción, mientras que en producción existían tablas (`actas_examen_detalle`, `actas_examen_estudiantes`) y decenas de columnas agregadas manualmente o fuera de control de versiones.
- Las consultas en el frontend (`DashboardPage.jsx`) fallaban con HTTP 400 intentando leer `inscripciones.estado_ram`.

#### Decisión
1. Extraer los metadatos exactos de la base real de producción desde el catálogo PostgreSQL de Supabase Cloud.
2. Archivar todas las migraciones previas en `supabase/legacy/` como registro histórico inmutable.
3. Consolidar el estado completo y verificado en una única migración baseline: `supabase/migrations/20261004220000_baseline.sql`.
4. Adoptar el flujo estándar de Supabase con migraciones timestamped (`<timestamp>_<nombre>.sql`), verificado localmente con Docker y `npx supabase db reset`.
5. Incorporar scripts npm `db:types` (generador de `src/types/database.types.ts`) y `db:diff` (verificación de cambios en el esquema local con 0 diff).
6. Instalar `supabase` en `devDependencies` para garantizar portabilidad en Windows y entornos de CI.

#### Consecuencias
- **Positivas:**
  - Paridad 100% garantizada entre base de datos y repositorio.
  - Reproducción instantánea del entorno en Docker local sin fallas de constraints.
  - Tipado automático de TypeScript para Supabase en `src/types/database.types.ts`.
  - Cero riesgo de aplicar índices o migraciones sobre columnas no existentes.
- **Negativas / Costos:**
  - Se debe conciliar gradualmente en las fases siguientes el código que dependía de columnas no aplicadas o nombres divergentes (`vocal_1`/`vocal1`, `estado_ram`/`estado_academico`).
