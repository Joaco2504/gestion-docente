-- Contract phase for public.docentes (NO APLICAR EN ESTA FASE)
-- Aprobado según ADR-003. Ejecutar únicamente durante la fase de contratos final.

-- Eliminar tabla huérfana obsoleta public.docentes
DROP TABLE IF EXISTS public.docentes CASCADE;
