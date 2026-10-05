# ADR-004: Estrategia de Integridad de Dominios mediante CHECK Constraints, Triggers Auto-Normalizadores y Enums TypeScript

- **Fecha:** 2026-10-05
- **Estado:** Aceptado
- **Fase:** Fase 4 - Integridad de dominios (ENUM vs. CHECK)
- **Autor:** Antigravity Agentic Assistant

---

## 1. Contexto y Problema

A lo largo del crecimiento de Korum / PlanillaDocente, diversos componentes del frontend y scripts legados persistieron datos de dominio mediante cadenas de texto libres ("strings mágicos"). Esto provocó divergencias y vulnerabilidades de integridad referencial leve en columnas clave:

1. **`evaluaciones.tipo`**: Coexistencia de `'TP'`, `'Trabajo Práctico'`, `'PARCIAL'`, `'Parcial'`, `'PRUEBA'`, `'RECUPERATORIO'`.
2. **`periodos_academicos.tipo`**: Variabilidad entre `'PRIMER_CUATRIMESTRE'`, `'primer cuatrimestre'`, `'1'`, `'Receso Invernal'`, etc.
3. **`asistencias.estado`**: Variaciones de case (`'PRESENTE'`, `'presente'`, espacios incidentales).
4. **`inscripciones.estado_academico`**: Inconsistencias con las condiciones académicas del Régimen Académico Marco (RAM: `'CURSANDO'`, `'REGULAR'`, `'PROMOCIONAL'`, `'LIBRE'`).
5. **`recursos.categoria` y `recursos.tipo_origen`**: Strings como `'Apunte de Cátedra'` vs. `'APUNTE'`, y `'General'`.

El desafío técnico consistió en blindar la integridad a nivel base de datos sin romper la retrocompatibilidad con clientes o vistas que pudieran enviar variantes históricas, y garantizando migraciones y tests transaccionales.

---

## 2. Opciones Evaluadas

### Opción A: PostgreSQL Native ENUM (`CREATE TYPE ... AS ENUM`)
- **Ventajas:** Definición nativa y estricta en el catálogo de PostgreSQL.
- **Desventajas Críticas:**
  - En PostgreSQL, los comandos `ALTER TYPE ... ADD VALUE` **no pueden ejecutarse dentro de un bloque transaccional** (`BEGIN ... COMMIT`).
  - Esto invalida la ejecución de suites de prueba transaccionales con pgTAP (`BEGIN; SELECT * FROM no_plan(); ROLLBACK;`), haciendo que los tests fallen con error `25001 (cannot run inside a transaction block)`.
  - Dificulta migraciones atómicas y rollbacks seguros en entornos de producción con Supabase CLI.
  - Provoca caídas inmediatas ante payloads de versiones web cacheadas en navegadores de usuarios antiguos.

### Opción B: CHECK Constraints + Triggers Auto-Normalizadores + Enums Centralizados TypeScript (Opción Elegida)
- **Ventajas:**
  - **100% Transaccional:** Compatible con transacciones ACID, rollbacks instantáneos y tests pgTAP.
  - **Tolerancia a fallos y auto-curación:** Los triggers `BEFORE INSERT OR UPDATE` mapean y sanean variantes descriptivas históricas hacia el valor canónico antes de que se evalúe el CHECK constraint.
  - **Cero Bloat:** Los tipos de datos permanecen como `TEXT` optimizados.
  - **Type-Safety en Frontend:** Definiciones únicas en `src/lib/enums.ts` proveen tipado estricto en TypeScript, autocompletado y labels visuales para React.

---

## 3. Decisión de Diseño

Se adoptó la **Opción B**. La arquitectura de integridad de dominios se compone de 3 capas:

### 3.1 Capa de Frontend: `src/lib/enums.ts`
Se centralizaron los dominios del sistema con constantes `as const`, tipos TypeScript derivados, labels oficiales y helpers puros de normalización:
- `ESTADO_ASISTENCIA`: `PRESENTE`, `AUSENTE`, `JUSTIFICADO`, `TARDE`.
- `ESTADO_NOTA`: `APROBADO`, `DESAPROBADO`, `PENDIENTE`, `AUSENTE`.
- `TIPO_EVALUACION`: `TP`, `PARCIAL`, `PRUEBA`, `RECUPERATORIO`, `FINAL`, `COLOQUIO`.
- `FORMATO_EVALUACION`: `NUMERICA_1_10`, `NUMERICA_1_100`, `CONCEPTUAL`, `PORCENTAJE`.
- `ESTADO_ACADEMICO`: `CURSANDO`, `REGULAR`, `PROMOCIONAL`, `PROMOCIONADO`, `LIBRE`, `APROBADO`, `DESAPROBADO`.
- `NIVEL_EDUCATIVO`: `SUPERIOR`, `SECUNDARIO`, `UNIVERSITARIO`, `PRIMARIO`, `OTRO`.
- `MODALIDAD_CURSADO`: `PRESENCIAL`, `VIRTUAL`, `HIBRIDA`.
- `CATEGORIA_RECURSO`: `APUNTE`, `TP`, `PARCIAL`, `PLANIFICACION`, `BIBLIOGRAFIA`.
- `TIPO_ORIGEN_RECURSO`: `LOCAL`, `GOOGLE_LINK`.
- `TIPO_PERIODO`: `PRIMER_CUATRIMESTRE`, `RECESO_INVERNAL`, `SEGUNDO_CUATRIMESTRE`, `ANUAL`, `OTRO`.
- `ROL_USUARIO`: `DOCENTE`, `SUPERADMIN`, `ADMIN`, `AYUDANTE`.

### 3.2 Capa de Base de Datos: Triggers Defensivos (`BEFORE INSERT OR UPDATE`)
Se crearon funciones y triggers que interceptan cualquier inserción o actualización:
- `trg_normalize_evaluaciones_tipo`: Normaliza `'Trabajo Práctico'` a `'TP'`, `'Examen Parcial'` a `'PARCIAL'`, etc.
- `trg_normalize_periodos_tipo`: Normaliza strings que contengan `'1'` o `'primer'` a `'PRIMER_CUATRIMESTRE'`, `'receso'`/`'invernal'` a `'RECESO_INVERNAL'`, etc.
- `trg_normalize_asistencias_estado`: Ejecuta `upper(trim(NEW.estado))`.
- `trg_normalize_recursos_dominios`: Normaliza categorías y tipos de origen descriptivos (`'Apunte de Cátedra'` a `'APUNTE'`, etc.).

### 3.3 Capa de Base de Datos: CHECK Constraints Canónicos
Una vez normalizado el registro por el trigger, el `CHECK constraint` garantiza que ningún dato anómalo persista en el motor:
- `inscripciones_estado_academico_check` en `public.inscripciones`.
- `evaluaciones_tipo_check` en `public.evaluaciones`.
- `periodos_academicos_tipo_check` en `public.periodos_academicos`.

---

## 4. Estado de Verificación y Métricas

1. **Tests pgTAP (`supabase/tests/07_fase4_dominios_integrity.sql`):** 7 tests específicos que prueban valores válidos, auto-normalización mediante triggers y rechazo de valores inválidos.
2. **Suite Global de Pruebas:** 41/41 tests pasando (100% éxito).
3. **Drift de Base de Datos (`supabase db diff`):** 0 drift (`No schema changes found`).
4. **Build Frontend (`npm run build`):** 0 errores de compilación Vite / TypeScript.
5. **Rollback:** Script idempotente en `supabase/rollbacks/20261005070000_fase4_integridad_dominios_rollback.sql`.

---

## 5. Conclusiones

Esta estrategia proporciona la robustez de un sistema fuertemente tipado sin incurrir en los problemas operacionales y bloqueos de PostgreSQL ENUMs en migraciones y tests continuos.
