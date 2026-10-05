# Registro de Decisiones de Arquitectura y Refactorización (ADR) - Korum

Este documento registra las decisiones técnicas tomadas a lo largo de las distintas fases de refactorización de Korum, sus fundamentos y contexto.

---

## Índice de Decisiones
- [ADR-001: Línea Base Consolidada y Adopción de Migraciones Versionadas con Timestamp](#adr-001-línea-base-consolidada-y-adopción-de-migraciones-versionadas-con-timestamp)
- [ADR-002: Endurecimiento RLS de Storage, search_path Explícito y Desacoplamiento de Canal Discord](#adr-002-endurecimiento-rls-de-storage-search_path-explícito-y-desacoplamiento-de-canal-discord)
- [ADR-003: Deprecación y Eliminación de la Tabla Huérfana public.docentes en favor de public.perfiles](#adr-003-deprecación-y-eliminación-de-la-tabla-huérfana-publicdocentes-en-favor-de-publicperfiles)

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

---

### ADR-002: Endurecimiento RLS de Storage, search_path Explícito y Desacoplamiento de Canal Discord

- **Fecha:** 2026-10-04
- **Estado:** Aceptado
- **Fase:** Fase 2

#### Contexto
1. El bucket de Supabase Storage `archivos-docentes` contaba con políticas globales (`Allow all uploads / deletes`) que permitían que cualquier usuario autenticado pisara o borrara archivos ajenos.
2. El canal de Discord estaba hardcodeado como un `DEFAULT` en la base de datos y en plantillas de n8n.
3. La tabla `recordatorios_enviados` usaba un campo `evento_id TEXT` sin soporte para referencias tipadas o índices polimórficos.
4. Múltiples funciones `SECURITY DEFINER` carecían de `search_path` explícito, representando un vector de escalada de privilegios según las guías de seguridad de PostgreSQL y Supabase.

#### Decisión
1. **Storage RLS:**
   - Mantener el bucket público para lectura (`SELECT`) preservando la compatibilidad de descarga directa en `recursos` y el portal de alumnos sin necesidad de regenerar URLs firmadas.
   - Restringir `INSERT`, `UPDATE` y `DELETE` en `storage.objects` a la regla estricta: `(storage.foldername(name))[1] = auth.uid()::text OR public.es_superadmin()`.
   - Normalizar la subida en el helper del cliente `src/lib/supabase.js` para exigir sesión autenticada y anteponer `{userId}/{catedraId}/`.
2. **Discord:**
   - Crear la columna `discord_canal_recordatorios` en `configuracion_sistema`, inicializada en `1556366651296055357`.
   - Crear la tabla `recordatorios_enviados` con `evento_origen TEXT` y `evento_uuid UUID` indexados, manteniendo `evento_id TEXT` para soportar resúmenes sintéticos diarios.
   - Adaptar `discord_reminders_worker.mjs` y `korum_discord_reminders.json` para resolver el canal desde la base o variable de entorno.
3. **Funciones `SECURITY DEFINER`:**
   - Reemplazar todas las funciones `SECURITY DEFINER` fijando explícitamente `SET search_path = public, extensions, pg_temp;`.
4. **Verificación de Aislamiento:**
   - Crear suite de pruebas de aislamiento con pgTAP (`supabase/tests/01_rls_isolation.sql`) ejecutada automáticamente con `npm run db:test`.

#### Consecuencias
- **Positivas:**
  - Aislamiento total entre docentes demostrado empíricamente mediante pruebas automatizadas pgTAP.
  - Blindaje contra secuestro de `search_path` en todas las funciones privilegiadas.
  - El canal de Discord puede modificarse dinámicamente desde configuración o variables de entorno sin migraciones de esquema.
- **Negativas / Costos:**
  - Los scripts de backend externos que requieran escribir en `recordatorios_enviados` deben correr como `service_role` o superadmin.

---

### ADR-003: Deprecación y Eliminación de la Tabla Huérfana `public.docentes` en favor de `public.perfiles`

- **Fecha:** 2026-10-05
- **Estado:** Aceptado (Aprobación Go otorgada)
- **Fase:** Fase 3 (Sub-paso 3b)

#### Contexto
Durante la auditoría del esquema de base de datos se detectó la coexistencia de `public.perfiles` y `public.docentes`. La investigación técnica determinó:
1. **Foreign Keys:** Cero tablas en PostgreSQL tienen FK apuntando a `public.docentes` ni a `public.perfiles` (todas las relaciones maestras usan `docente_id REFERENCES auth.users(id)`).
2. **Triggers:** El trigger `handle_new_user()` tras el registro en `auth.users` inserta exclusivamente en `public.perfiles`. Nunca alimenta a `public.docentes`.
3. **Frontend:** 8 consultas activas a `public.perfiles` en componentes críticos, y **0 consultas** a `public.docentes`.
4. **Datos:** `public.docentes` contiene 0 registros tanto en local como en producción.

#### Decisión Propuesta
1. Establecer `public.perfiles` como entidad única y canónica de perfiles de usuario.
2. Deprecar formalmente `public.docentes` sin añadir sincronización innecesaria.
3. Solicitar aprobación Go / No-Go para su eliminación definitiva en la fase de contratos.

#### Consecuencias
- **Positivas:**
  - Cero riesgo de regresión o rotura de funcionalidad.
  - Eliminación de ambigüedad y código muerto en base de datos.
  - Mantenimiento enfocado en una única tabla de perfiles.
- **Negativas / Costos:**
  - Ninguna identificada.

