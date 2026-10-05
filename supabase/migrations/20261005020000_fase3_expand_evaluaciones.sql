-- ====================================================================
-- FASE 3.2: UNIFICACIÓN Y EXPAND/SYNC EN TABLA EVALUACIONES
-- ====================================================================

-- 1. Backfill para unificar fecha y fecha_entrega en evaluaciones existentes
UPDATE public.evaluaciones
SET 
    fecha_entrega = COALESCE(fecha_entrega, fecha),
    fecha = COALESCE(fecha_entrega, fecha)
WHERE fecha_entrega IS DISTINCT FROM fecha;

-- 2. Eliminar el DEFAULT CURRENT_DATE en la columna legacy 'fecha'
-- para evitar que inserciones omitidas sobreescriban con la fecha de hoy
ALTER TABLE public.evaluaciones ALTER COLUMN fecha DROP DEFAULT;

-- 3. Trigger de sincronización bi-direccional entre fecha_entrega (canónica) y fecha (legacy)
CREATE OR REPLACE FUNCTION public.sync_evaluaciones_fechas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    -- Sincronización bi-direccional transparente
    IF NEW.fecha_entrega IS NOT NULL THEN
        NEW.fecha := NEW.fecha_entrega;
    ELSIF NEW.fecha IS NOT NULL THEN
        NEW.fecha_entrega := NEW.fecha;
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_evaluaciones_fechas ON public.evaluaciones;
CREATE TRIGGER trg_sync_evaluaciones_fechas
BEFORE INSERT OR UPDATE ON public.evaluaciones
FOR EACH ROW EXECUTE FUNCTION public.sync_evaluaciones_fechas();
