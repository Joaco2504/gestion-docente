-- ====================================================================
-- ROLLBACK FASE 3.2: EXPAND EVALUACIONES
-- ====================================================================

-- 1. Eliminar trigger y función de sincronización de fechas
DROP TRIGGER IF EXISTS trg_sync_evaluaciones_fechas ON public.evaluaciones;
DROP FUNCTION IF EXISTS public.sync_evaluaciones_fechas();

-- 2. Restaurar default legacy en fecha
ALTER TABLE public.evaluaciones ALTER COLUMN fecha SET DEFAULT CURRENT_DATE;
