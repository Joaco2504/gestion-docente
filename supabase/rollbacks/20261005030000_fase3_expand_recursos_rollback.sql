-- ====================================================================
-- ROLLBACK FASE 3.3: EXPAND RECURSOS
-- ====================================================================

-- 1. Eliminar trigger y función de sincronización
DROP TRIGGER IF EXISTS trg_sync_recursos_columns ON public.recursos;
DROP FUNCTION IF EXISTS public.sync_recursos_columns();

-- 2. Eliminar columnas agregadas
ALTER TABLE public.recursos 
    DROP COLUMN IF EXISTS url,
    DROP COLUMN IF EXISTS tipo,
    DROP COLUMN IF EXISTS visible_alumnos;
