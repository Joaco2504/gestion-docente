-- ====================================================================
-- CONTRACT FASE 3.1: TABLA NOTAS (MARCADA: NO APLICAR EN ESTA ETAPA)
-- ====================================================================
-- ADVERTENCIA: Esta migración representa el paso "CONTRACT" final del patrón
-- expand -> migrate -> contract. Solo debe ejecutarse cuando ningún cliente,
-- script o vista histórica dependa de las columnas 'nota' ni 'calificacion'.
--
-- FECHA TENTATIVA: Fase de limpieza post-estabilización.
-- ====================================================================

-- 1. Eliminar trigger y función de compatibilidad dual-write
DROP TRIGGER IF EXISTS trg_sync_notas_columns ON public.notas;
DROP FUNCTION IF EXISTS public.sync_notas_columns();

-- 2. Eliminar columnas deprecadas de la tabla notas
ALTER TABLE public.notas DROP COLUMN IF EXISTS nota;
ALTER TABLE public.notas DROP COLUMN IF EXISTS calificacion;
