-- ==============================================================================
-- ROLLBACK MIGRACIÓN V25: CALENDARIO (COLORES EDITABLES), RECORDATORIOS Y DISCORD
-- ==============================================================================

-- 1. Eliminar tabla de auditoría e idempotencia
DROP TABLE IF EXISTS public.recordatorios_enviados CASCADE;

-- 2. Revertir columnas agregadas en eventos_calendario
ALTER TABLE public.eventos_calendario
DROP COLUMN IF EXISTS recordatorio_config,
DROP COLUMN IF EXISTS aula,
DROP COLUMN IF EXISTS color,
DROP COLUMN IF EXISTS catedra_id;

-- 3. Revertir columnas agregadas en mesas_examen
ALTER TABLE public.mesas_examen
DROP COLUMN IF EXISTS recordatorio_config,
DROP COLUMN IF EXISTS color;

-- 4. Revertir columna color agregada en catedras
ALTER TABLE public.catedras
DROP COLUMN IF EXISTS color;
