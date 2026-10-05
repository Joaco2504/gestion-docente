# ADR-003: Deprecación y Eliminación de la Tabla Huérfana `public.docentes` en favor de `public.perfiles`

- **Fecha:** 2026-10-05
- **Estado:** Propuesto (Esperando Go / No-Go)
- **Fase:** Fase 3 (Sub-paso 3b)
- **Autor:** Antigravity Agentic Assistant

---

## 1. Contexto y Problema

Durante la auditoría del esquema de base de datos de Korum se identificó la coexistencia de dos tablas con propósitos superpuestos para la representación de usuarios del sistema:
- `public.perfiles` (id, email, nombre, rol, created_at, updated_at)
- `public.docentes` (id, nombre, email, created_at)

Se requería determinar si existían dependencias activas, relaciones de clave foránea o flujos de sincronización que justificaran mantener ambas tablas o si una de ellas constituía un remanente obsoleto (dead code en base de datos).

---

## 2. Inventario de Dependencias y Hallazgos Empíricos

### 2.1 Claves Foráneas (Foreign Keys en PostgreSQL)
Se ejecutó una auditoría sobre el catálogo `information_schema.table_constraints` y `pg_constraint`:
- **Resultado:** **Ninguna tabla en PostgreSQL tiene FK apuntando a `public.docentes` ni a `public.perfiles`**.
- Todas las tablas del dominio académico (`instituciones`, `catedras`, `estudiantes`, `unidades_tematicas`, etc.) declaran:
  ```sql
  docente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
  ```
- Tanto `public.perfiles` como `public.docentes` referencian directamente a `auth.users(id)`.

### 2.2 Triggers de Autenticación
- El trigger `on_auth_user_created` en PostgreSQL ejecuta la función `handle_new_user()`:
  ```sql
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
  BEGIN
      INSERT INTO public.perfiles (id, email, nombre, rol)
      VALUES (
          NEW.id,
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Docente'),
          'docente'
      )
      ON CONFLICT (id) DO NOTHING;
      RETURN NEW;
  END;
  $$;
  ```
- **Hallazgo:** El alta de usuarios solo alimenta a `public.perfiles`. La tabla `public.docentes` **nunca recibe registros automáticos**.

### 2.3 Funciones y Lógica de Negocio en Base de Datos
- Las funciones de autorización del sistema (`es_superadmin()`, `cambiar_rol_usuario()`) consultan y modifican exclusivamente la columna `rol` de `public.perfiles`.
- Ninguna función, vista o procedimiento almacenado hace referencia a `public.docentes`.

### 2.4 Código Frontend (`src/`)
- Búsqueda en el repositorio:
  - `from('perfiles')`: **8 ocurrencias activas** en componentes y páginas clave (autenticación, perfil de usuario, panel de administración, validación de roles y navbar).
  - `from('docentes')`: **0 ocurrencias** en todo el código fuente de la aplicación.

### 2.5 Volumen de Datos
- Consulta en base de datos local y producción:
  ```sql
  SELECT count(*) FROM public.docentes; -- 0 registros
  ```

---

## 3. Matriz Costo / Beneficio y Evaluación de Riesgos

| Dimensión | Opción 1: Mantener `docentes` con sincronización | Opción 2: Deprecar y eliminar `docentes` (Recomendada) |
| :--- | :--- | :--- |
| **Complejidad** | Alta: requiere triggers bi-direccionales y migración de datos artificiales. | Mínima: eliminar tabla huérfana de 0 registros. |
| **Riesgo de Ruptura** | Medio: posibles bucles de triggers o discrepancias de rol. | **Cero**: ningún componente lee ni escribe en `docentes`. |
| **Mantenibilidad** | Pobre: confusión para desarrolladores futuros sobre cuál tabla consultar. | Óptima: fuente de verdad única y canónica en `perfiles`. |
| **Almacenamiento/Esquema** | Deuda técnica latente y RLS duplicado. | Esquema limpio, normalizado y alineado con Supabase Auth. |

---

## 4. Decisión Propuesta

1. **Ratificar `public.perfiles` como la tabla canónica** para la gestión de usuarios, datos personales y roles (`docente`, `superadmin`).
2. **Deprecar formalmente `public.docentes`**:
   - No crear triggers de sincronización innecesarios para una tabla sin uso ni datos.
   - En la Fase Contract (o con aprobación Go), preparar la migración de eliminación:
     ```sql
     DROP TABLE IF EXISTS public.docentes CASCADE;
     ```
3. **Punto de Control:** Esta decisión queda sujeta a la aprobación explícita de **Go / No-Go** por parte del usuario antes de aplicar cualquier DDL sobre `public.docentes`.
