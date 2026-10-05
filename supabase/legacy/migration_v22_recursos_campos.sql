-- ==============================================================================
-- MIGRACIÓN V22: CAMPOS EXTENDIDOS EN TABLA RECURSOS (EDICIÓN Y VISIBILIDAD)
-- ==============================================================================

-- 1. Añadir columnas descriptivas y de visibilidad si no existen
ALTER TABLE public.recursos ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE public.recursos ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE public.recursos ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'enlace';
ALTER TABLE public.recursos ADD COLUMN IF NOT EXISTS visible_alumnos BOOLEAN DEFAULT true;
ALTER TABLE public.recursos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Actualizar o relajar la restricción de categorías para admitir tanto códigos internos como etiquetas legibles
ALTER TABLE public.recursos DROP CONSTRAINT IF EXISTS recursos_categoria_check;
ALTER TABLE public.recursos ADD CONSTRAINT recursos_categoria_check 
  CHECK (categoria IN (
    'APUNTE', 'TP', 'PARCIAL', 'PLANIFICACION', 'BIBLIOGRAFIA',
    'General', 'Bibliografía', 'Trabajo Práctico', 'Apunte de Cátedra', 'Planificación'
  ));

-- 3. Sincronizar columna url con url_o_path existente si estuviera vacía
UPDATE public.recursos SET url = url_o_path WHERE url IS NULL AND url_o_path IS NOT NULL;
