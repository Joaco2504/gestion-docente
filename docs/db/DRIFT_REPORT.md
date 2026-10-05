# Informe de Schema Drift (Línea Base) — Korum

**Proyecto Supabase:** `rjndiodfnlncefyiujbg` (Región: `us-west-2`)  
**Fecha de inspección:** 2026-10-04  
**Origen:** Metadatos extraídos directamente del catálogo de PostgreSQL en Supabase Cloud comparados contra `schema.sql` y las migraciones históricas `migration_v2.sql` a `migration_v26.sql`.

---

## 1. Verificación Puntual de Columnas Críticas

De acuerdo con las instrucciones de la Fase 1, se verificó el estado real de cada columna en Supabase Cloud:

| Campo auditado | Estado en Base Real | Estado en Repo (`schema.sql` / migraciones) | Diagnóstico e Impacto |
|---|---|---|---|
| `asistencias.catedra_id` | ❌ **No existe** | Referenciado en `migration_v15` | `migration_v15` definía índices `idx_asistencias_catedra_id` sobre una columna inexistente. En la base real, la asistencia depende de `clase_id`. |
| `asistencias.fecha` | ❌ **No existe** | Referenciado en `migration_v15` | Similar al anterior: la fecha reside en `clases.fecha`, no en `asistencias`. |
| `inscripciones.estado_ram` | ❌ **No existe** | Invocado en `DashboardPage.jsx:181` | La consulta `.select('..., estado_ram')` fallaba en producción con HTTP 400 (`column inscripciones.estado_ram does not exist`). La columna real es `estado_academico`. |
| `inscripciones.estado_academico` | ✔️ **Existe** (`text`) | Creado en `migration_v11` / `v13` | Posee default `'CURSANDO'`. Se sincroniza con `condicion` mediante el trigger `trg_sync_inscripciones_alias`. |
| `inscripciones.nota_final` | ✔️ **Existe** (`numeric(4,2)`) | Creado en `migration_v11` / `v13` | Coexiste con `nota_final_acreditacion`. Sincronizado por trigger `trg_sync_inscripciones_alias`. |
| `evaluaciones.recurso_id` | ❌ **No existe** | Agregado en `migration_v23` | `migration_v23` nunca se llegó a ejecutar en Supabase Cloud. |
| `evaluaciones.fecha` | ✔️ **Existe** (`date`) | Agregado en migraciones recientes | Coexiste con `fecha_entrega`. |
| `evaluaciones.nombre` | ❌ **No existe** | Declarado en `migration_v20` | `migration_v20` nunca se ejecutó en producción. La columna real es `titulo`. |
| `notas.nota` | ✔️ **Existe** (`numeric(4,2)`) | Agregado en `migration_v26` | Coexiste con `valor` y `calificacion`. |
| `notas.valor` | ✔️ **Existe** (`numeric(4,2)`) | En `schema.sql` | Columna histórica de la calificación numérica. Nullable tras v26. |
| `notas.estado` | ✔️ **Existe** (`text`) | Agregado en `migration_v21` / `v26` | Contiene `'CALIFICADO'`, `'NO_ENTREGO'`, `'AUSENTE'`. |

---

## 2. Clasificación Exhaustiva de Discrepancias

### (A) Objetos y Columnas en la Base Real que NO figuraban en el Repo

1. **Tablas completas no registradas en DDL:**
   - `public.actas_examen_detalle`: Tabla con columnas `(id, mesa_id, estudiante_id, catedra_id, condicion_al_rendir, nota_escrito, nota_oral, nota_definitiva, resultado, observaciones, created_at)`.
   - `public.actas_examen_estudiantes`: Tabla de actas de examen.
2. **Columnas existentes en producción no declaradas en migraciones:**
   - `asistencias`: `created_at`, `updated_at`.
   - `catedras`: `portal_mostrar_asistencia`, `portal_mostrar_notas`, `portal_mostrar_condicion`, `fecha_cierre_cursada`.
   - `ciclos_lectivos`: `nombre`, `institucion_id`.
   - `clases`: `caracter_clase`, `observaciones`, `caracter`, `archivo_adjunto`, `unidad_texto`, `numero_clase`, `updated_at`, `contenido`.
   - `configuracion_sistema`: `permitir_nuevos_registros`.
   - `estudiantes`: `legajo`, `email`, `telefono`, `observaciones`, `updated_at`.
   - `evaluaciones`: `updated_at`, `escala_maxima`.
   - `inscripciones`: `fecha_acreditacion`, `updated_at`, `condicion`, `estado`, `porcentaje_asistencia`, `observaciones`, `fecha_inscripcion`.
   - `mesas_examen`: `vocal_1`, `vocal_2` (con guion bajo).
   - `notas`: `created_at`, `observaciones`, `calificacion`.
   - `perfiles`: `updated_at`.
3. **Triggers y Funciones de Sincronización en Producción:**
   - Función `trg_sync_inscripciones_alias()` y su trigger `trg_sync_inscripciones_alias_trigger` en `inscripciones` (sincroniza `condicion` $\leftrightarrow$ `estado_academico` y `nota_final` $\leftrightarrow$ `nota_final_acreditacion`).

---

### (B) Objetos y Columnas en el Repo que NO existen en la Base Real

1. **Tabla fantasma:**
   - `recordatorios_enviados`: Declarada en `migration_v25_calendario_colores_y_recordatorios.sql`, nunca fue creada en Supabase Cloud.
2. **Columnas de migraciones no aplicadas:**
   - `evaluaciones.escala_notas` (`migration_v17`)
   - `evaluaciones.formato` (`migration_v20`)
   - `evaluaciones.nombre` (`migration_v20`)
   - `evaluaciones.recurso_id` (`migration_v23`)
   - `evaluaciones.link_consigna` (`migration_v23`)
   - `catedras.alias` (`migration_v16`)
   - `catedras.color` (`migration_v25`)
   - `mesas_examen.color` (`migration_v25`)
   - `mesas_examen.vocal1`, `vocal2` (en base real son `vocal_1`, `vocal_2`)
   - `eventos_calendario.catedra_id` (`migration_v25`)
   - `recursos.descripcion`, `url`, `tipo`, `visible_alumnos`, `updated_at` (`migration_v22`)
   - `perfiles.avatar_url` (`migration_v5`)
   - `configuracion_sistema.updated_by` (`migration_v5`)
3. **Índices sobre columnas inexistentes:**
   - `idx_asistencias_catedra_id` y `idx_asistencias_catedra_fecha` (`migration_v15`).

---

### (C) Discrepancias de Tipos, Nulabilidad y Constraints

1. **`mesas_examen` (Vocales):** En `migration_v4` se declararon `vocal1` y `vocal2`. En la base real se crearon como `vocal_1` y `vocal_2`.
2. **`inscripciones`:** Coexisten `estado` (`text`), `condicion` (`text`), y `estado_academico` (`text`, default `'CURSANDO'`). El código a menudo recurre a encadenamientos `ins.estado_academico ?? ins.condicion ?? 'CURSANDO'`.
3. **`notas`:** Coexisten tres columnas de calificación: `valor` (original), `calificacion` (agregada en alguna prueba sin migración formal) y `nota` (agregada en v26).
4. **`evaluaciones`:** Coexisten `fecha_entrega` (`date`) y `fecha` (`date`).

---

## 3. Resolución en la Baseline Consolidada

La migración baseline `supabase/migrations/20261004220000_baseline.sql` fue armada tomando el esquema real de producción al 100%:
- Se preservaron las 22 tablas reales con sus tipos exactos.
- Se preservaron todas las claves foráneas, restricciones de unicidad y chequeos vigentes.
- Se incluyeron los 52 índices reales (excluyendo los dos índices rotos de v15).
- Se incorporaron las 14 funciones reales con su código verbatim y los 3 triggers en `public` más el trigger en `auth.users`.
- Se configuraron las 47 políticas de RLS reales.

Cualquier unificación o corrección de nombres (`vocal_1`/`vocal1`, `valor`/`nota`, `estado_ram`) será tratada sistemáticamente en las Fases 2, 3 y 4 mediante el patrón seguro *expand $\to$ migrate $\to$ contract*.
