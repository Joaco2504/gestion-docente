-- ====================================================================
-- FASE 3.4: UNIFICACIÓN Y EXPAND/SYNC EN TABLA INSCRIPCIONES
-- ====================================================================

-- 1. Agregar columna temporal de compatibilidad estado_ram
ALTER TABLE public.inscripciones 
    ADD COLUMN IF NOT EXISTS estado_ram text;

-- 2. Backfill inicial sincronizando estado_ram con la columna canónica estado_academico
UPDATE public.inscripciones
SET 
    estado_ram = COALESCE(estado_ram, estado_academico, 'CURSANDO'),
    estado_academico = COALESCE(estado_academico, estado_ram, 'CURSANDO');

-- 3. Trigger de sincronización bi-direccional entre estado_academico y estado_ram
CREATE OR REPLACE FUNCTION public.sync_inscripciones_estado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    -- Manejo consciente del default 'CURSANDO' que PostgreSQL aplica antes del trigger:
    -- Si un cliente legado envía explícitamente estado_ram distinto de null y estado_academico no fue provisto (o vino con el default 'CURSANDO')
    IF NEW.estado_ram IS NOT NULL AND (NEW.estado_academico IS NULL OR NEW.estado_academico = 'CURSANDO') THEN
        NEW.estado_academico := NEW.estado_ram;
    ELSIF NEW.estado_academico IS NOT NULL THEN
        NEW.estado_ram := NEW.estado_academico;
    ELSE
        NEW.estado_academico := 'CURSANDO';
        NEW.estado_ram := 'CURSANDO';
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_inscripciones_estado ON public.inscripciones;
CREATE TRIGGER trg_sync_inscripciones_estado
BEFORE INSERT OR UPDATE ON public.inscripciones
FOR EACH ROW EXECUTE FUNCTION public.sync_inscripciones_estado();
