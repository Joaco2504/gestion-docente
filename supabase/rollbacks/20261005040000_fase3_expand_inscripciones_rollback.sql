-- ====================================================================
-- ROLLBACK FASE 3.4: EXPAND INSCRIPCIONES
-- ====================================================================

-- 1. Eliminar trigger y función de sincronización
DROP TRIGGER IF EXISTS trg_sync_inscripciones_estado ON public.inscripciones;
DROP FUNCTION IF EXISTS public.sync_inscripciones_estado();

-- 2. Eliminar columna agregada estado_ram
ALTER TABLE public.inscripciones DROP COLUMN IF EXISTS estado_ram;
