-- ==============================================================================
-- MIGRACIÓN: SISTEMA DE RECUPERATORIO DIFERENCIADO POR ALUMNO
-- Fecha: 2026-10-19
-- Descripción: Agrega soporte para detalle_recuperatorio (JSONB) en la tabla `notas`,
-- permitiendo que una única evaluación de recuperatorio en la sábana almacene los parciales
-- específicos que recupera cada estudiante con su respectiva nota y trazabilidad.
-- ==============================================================================

ALTER TABLE public.notas
ADD COLUMN IF NOT EXISTS detalle_recuperatorio JSONB DEFAULT NULL;

COMMENT ON COLUMN public.notas.detalle_recuperatorio IS 'Detalle estructurado de parciales recuperados por el alumno: [{"evaluacion_id": UUID, "titulo": text, "nota_recuperatorio": numeric, "estado": text, "aprobado": boolean}]';
