-- ====================================================================
-- CONTRACT FASE 3.3: TABLA RECURSOS (MARCADA: NO APLICAR EN ESTA ETAPA)
-- ====================================================================
-- ADVERTENCIA: Esta migración representa el paso "CONTRACT" final del patrón
-- expand -> migrate -> contract. Solo debe ejecutarse cuando ningún cliente,
-- script o modal legado dependa de las columnas temporales 'url' o 'tipo'.
--
-- FECHA TENTATIVA: Fase de limpieza post-estabilización.
-- ====================================================================

-- 1. Eliminar trigger y función de compatibilidad dual-write
DROP TRIGGER IF EXISTS trg_sync_recursos_columns ON public.recursos;
DROP FUNCTION IF EXISTS public.sync_recursos_columns();

-- 2. Eliminar columnas deprecadas temporales 'url' y 'tipo'
-- (quedando 'url_o_path', 'tipo_origen', 'categoria' y 'visible_alumnos' como esquema final)
ALTER TABLE public.recursos DROP COLUMN IF EXISTS url;
ALTER TABLE public.recursos DROP COLUMN IF EXISTS tipo;
