-- Contract phase for Criterios de Evaluación vs Cátedras (NO APLICAR EN ESTA FASE)
-- Ejecutar únicamente tras deprecación completa de clientes que leen ram_asistencia_* en catedras.

-- 1. Eliminar triggers de sincronización bi-direccional
DROP TRIGGER IF EXISTS trg_sync_criterios_to_catedras ON public.criterios_evaluacion;
DROP FUNCTION IF EXISTS public.sync_criterios_to_catedras();

DROP TRIGGER IF EXISTS trg_sync_catedras_to_criterios ON public.catedras;
DROP FUNCTION IF EXISTS public.sync_catedras_to_criterios();

-- 2. Eliminar columnas deprecadas en public.catedras
ALTER TABLE public.catedras DROP COLUMN IF EXISTS ram_asistencia_regular;
ALTER TABLE public.catedras DROP COLUMN IF EXISTS ram_asistencia_trabajo;
ALTER TABLE public.catedras DROP COLUMN IF EXISTS ram_asistencia_promocion;
