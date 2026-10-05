-- ====================================================================
-- ROLLBACK FASE 3.1: EXPAND NOTAS
-- ====================================================================

-- 1. Eliminar constraint de consistencia
ALTER TABLE public.notas DROP CONSTRAINT IF EXISTS check_notas_consistencia_estado;

-- 2. Eliminar trigger y función de sincronización
DROP TRIGGER IF EXISTS trg_sync_notas_columns ON public.notas;
DROP FUNCTION IF EXISTS public.sync_notas_columns();
