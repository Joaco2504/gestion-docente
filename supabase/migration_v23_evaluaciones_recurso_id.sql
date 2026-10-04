-- ==============================================================================
-- PLANILLADOCENTE — MIGRACIÓN V23: VINCULACIÓN EVALUACIONES Y RECURSOS
-- ==============================================================================

DO $$
BEGIN
    -- 1. Columna: recurso_id en evaluaciones con referencia a tabla recursos
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evaluaciones' AND column_name = 'recurso_id'
    ) THEN
        ALTER TABLE public.evaluaciones 
        ADD COLUMN recurso_id UUID REFERENCES public.recursos(id) ON DELETE SET NULL;
    END IF;

    -- 2. Columna: link_consigna (alias interoperable de archivo_url)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evaluaciones' AND column_name = 'link_consigna'
    ) THEN
        ALTER TABLE public.evaluaciones 
        ADD COLUMN link_consigna TEXT;
    END IF;

    -- 3. Actualizar o relajar restricción de categoría en recursos para admitir 'Evaluaciones'
    ALTER TABLE public.recursos DROP CONSTRAINT IF EXISTS recursos_categoria_check;
    ALTER TABLE public.recursos ADD CONSTRAINT recursos_categoria_check 
      CHECK (categoria IN (
        'APUNTE', 'TP', 'PARCIAL', 'PLANIFICACION', 'BIBLIOGRAFIA',
        'General', 'Bibliografía', 'Trabajo Práctico', 'Apunte de Cátedra', 'Planificación',
        'Evaluaciones', 'Parcial'
      ));

    -- 4. Índice para optimizar consultas de evaluaciones vinculadas a recursos
    CREATE INDEX IF NOT EXISTS idx_evaluaciones_recurso_id ON public.evaluaciones(recurso_id);
END $$;
