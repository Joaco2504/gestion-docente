---
name: supabase-architect
description: Especialista en arquitectura de datos relacionales, cliente @supabase/supabase-js y sincronización en tiempo real.
triggers:
  - supabase
  - base de datos
  - crud
  - consultas sql
---

# Supabase Architecture & Data Access Skill

## Responsabilidades
1. Configurar y mantener el cliente oficial `@supabase/supabase-js` utilizando variables de entorno seguras (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`).
2. Implementar funciones asíncronas limpias y tipadas para operaciones CRUD sobre las tablas:
   - `ciclos_lectivos`
   - `catedras`
   - `alumnos`
   - `clases`
   - `asistencias`
   - `calificaciones`
   - `recursos`
   - `eventos_calendario`
3. Asegurar que todas las peticiones `INSERT` inyecten automáticamente el `user_id` obtenido de `supabase.auth.getUser()`.
4. Manejar estados de carga (`loading`), reintentos y captura de errores amigables para el usuario.
