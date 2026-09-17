-- ==============================================================================
-- MIGRACIÓN V19: COLUMNA UPDATED_AT EN CÁTEDRAS
-- ==============================================================================

ALTER TABLE public.catedras 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN public.catedras.updated_at IS 'Marca temporal de la última modificación de los datos de la cátedra.';
