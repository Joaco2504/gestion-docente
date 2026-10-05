-- ==============================================================================
-- MIGRACIÓN V16: SOPORTE DE ALIAS Y SLUG AMIGABLE PARA EL PORTAL ESTUDIANTIL
-- ==============================================================================

-- 1. Agregar columna 'alias' en la tabla 'catedras'
ALTER TABLE public.catedras 
ADD COLUMN IF NOT EXISTS alias TEXT;

-- 2. Índice único parcial para acelerar búsquedas públicas por alias amigable
CREATE UNIQUE INDEX IF NOT EXISTS idx_catedras_alias 
ON public.catedras (alias) 
WHERE alias IS NOT NULL;

-- 3. Comentario explicativo de la columna
COMMENT ON COLUMN public.catedras.alias IS 'Alias o slug amigable URL-friendly para acceso directo al portal de alumnos sin exponer UUID.';
