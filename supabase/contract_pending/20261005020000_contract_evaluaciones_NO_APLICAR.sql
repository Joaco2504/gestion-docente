-- ====================================================================
-- CONTRACT FASE 3.2: TABLA EVALUACIONES (MARCADA: NO APLICAR EN ESTA ETAPA)
-- ====================================================================
-- ADVERTENCIA: Esta migración representa el paso "CONTRACT" final del patrón
-- expand -> migrate -> contract. Solo debe ejecutarse cuando ningún cliente,
-- script o RPC histórica dependa de la columna legacy 'fecha'.
--
-- FECHA TENTATIVA: Fase de limpieza post-estabilización.
-- ====================================================================

-- 1. Eliminar trigger y función de compatibilidad dual-write
DROP TRIGGER IF EXISTS trg_sync_evaluaciones_fechas ON public.evaluaciones;
DROP FUNCTION IF EXISTS public.sync_evaluaciones_fechas();

-- 2. Eliminar columna deprecada 'fecha' (quedando 'fecha_entrega' como única fuente)
ALTER TABLE public.evaluaciones DROP COLUMN IF EXISTS fecha;
