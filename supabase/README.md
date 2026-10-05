# Gestión de Base de Datos y Migraciones — Korum (DocentePro)

Este directorio gestiona el ciclo de vida del esquema de base de datos PostgreSQL en Supabase.

---

## 1. Estructura de Directorios

- `migrations/`: Migraciones versionadas oficiales con prefijo de timestamp (`<YYYYMMDDHHMMSS>_<nombre>.sql`).
  - `20261004220000_baseline.sql`: Migración de línea base consolidada que representa el estado real de la base de datos de producción tras resolver el *schema drift*.
- `legacy/`: Historial de migraciones sueltas anteriores a la refactorización (`migration_v2.sql` … `v26.sql`, `fix_*.sql`, etc.). Se preserva únicamente como registro histórico inmutable; no debe aplicarse en nuevos entornos.
- `config.toml`: Configuración local del CLI de Supabase para desarrollo local en Docker.

---

## 2. Flujo de Trabajo con Migraciones Versionadas

A partir de la Fase 1, **toda nueva modificación en la base de datos debe seguir el flujo estándar de Supabase**:

1. **Crear una nueva migración:**
   ```bash
   npx supabase migration new <nombre_descriptivo>
   ```
   Esto generará un archivo en `supabase/migrations/<timestamp>_<nombre_descriptivo>.sql`.

2. **Reglas para escribir migraciones:**
   - Idempotencia: Usar siempre `IF NOT EXISTS`, `IF EXISTS` o bloques `DO $$ ... END $$;`.
   - Cero operaciones destructivas directas en producción (`DROP COLUMN`, `TRUNCATE`, etc.).
   - Utilizar el patrón seguro **Expand $\to$ Migrate $\to$ Contract** para renombrar o unificar columnas.
   - Cada migración debe tener un script de rollback documentado.

3. **Aplicar en la base de datos local:**
   ```bash
   npx supabase db reset
   ```
   Esto recrea la base local en Docker desde cero y aplica todas las migraciones en orden cronológico.

4. **Verificar diff contra la base local:**
   ```bash
   npm run db:diff
   ```
   Debe devolver `No schema changes found`.

5. **Regenerar tipos de TypeScript:**
   ```bash
   npm run db:types
   ```
   Actualiza automáticamente `src/types/database.types.ts`.

---

## 3. Scripts Disponibles en `package.json`

| Comando | Acción |
|---|---|
| `npm run db:diff` | Compara el estado de las migraciones contra el esquema local en Docker (`supabase db diff --local --schema public`). |
| `npm run db:types` | Genera los tipos de TypeScript actualizados en `src/types/database.types.ts`. |

---

## 4. Desarrollo Local con Docker

Para levantar los servicios locales de Supabase (PostgreSQL, PostgREST, Auth, Storage, Studio):
```bash
npx supabase start
```
- PostgreSQL Local: `localhost:54322` (`postgres:postgres`)
- Supabase Studio Local: `http://localhost:54323`
- API REST Local: `http://127.0.0.1:54321/rest/v1`

Para detener los servicios locales:
```bash
npx supabase stop
```
