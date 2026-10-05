-- ====================================================================
-- CONTRACT FASE 3.4: TABLA INSCRIPCIONES (MARCADA: NO APLICAR EN ESTA ETAPA)
-- ====================================================================
-- ADVERTENCIA: Esta migración representa el paso "CONTRACT" final del patrón
-- expand -> migrate -> contract. Solo debe ejecutarse cuando ningún cliente,
-- script o consulta histórica dependa de la columna temporal 'estado_ram'.
--
-- FECHA TENTATIVA: Fase de limpieza post-estabilización.
-- ====================================================================

-- 1. Eliminar trigger y función de compatibilidad dual-write
DROP TRIGGER IF EXISTS trg_sync_inscripciones_estado ON public.inscripciones;
DROP FUNCTION IF EXISTS public.sync_inscripciones_estado();

-- 2. Eliminar columna deprecada temporal 'estado_ram' (quedando 'estado_academico' como única fuente canónica)
ALTER TABLE public.inscripciones DROP COLUMN IF EXISTS estado_ram;
