-- ==============================================================================
-- PLANILLADOCENTE — MIGRACIÓN V24: EQUIVALENCIAS Y RÉGIMEN LABORAL RAM
-- ==============================================================================

DO $$
BEGIN
    -- 1. Columnas de configuración RAM en cátedras
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'catedras' AND column_name = 'ram_asistencia_regular'
    ) THEN
        ALTER TABLE public.catedras ADD COLUMN ram_asistencia_regular NUMERIC DEFAULT 70;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'catedras' AND column_name = 'ram_asistencia_trabajo'
    ) THEN
        ALTER TABLE public.catedras ADD COLUMN ram_asistencia_trabajo NUMERIC DEFAULT 60;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'catedras' AND column_name = 'ram_asistencia_promocion'
    ) THEN
        ALTER TABLE public.catedras ADD COLUMN ram_asistencia_promocion NUMERIC DEFAULT 80;
    END IF;

    -- 2. Columnas en inscripciones (por cátedra)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inscripciones' AND column_name = 'es_equivalencia'
    ) THEN
        ALTER TABLE public.inscripciones ADD COLUMN es_equivalencia BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inscripciones' AND column_name = 'tiene_certificado_trabajo'
    ) THEN
        ALTER TABLE public.inscripciones ADD COLUMN tiene_certificado_trabajo BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inscripciones' AND column_name = 'resolucion_equivalencia'
    ) THEN
        ALTER TABLE public.inscripciones ADD COLUMN resolucion_equivalencia TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'inscripciones' AND column_name = 'fecha_equivalencia'
    ) THEN
        ALTER TABLE public.inscripciones ADD COLUMN fecha_equivalencia DATE;
    END IF;

    -- 3. Índices para búsqueda y filtrado rápido
    CREATE INDEX IF NOT EXISTS idx_inscripciones_es_equivalencia ON public.inscripciones(es_equivalencia);
    CREATE INDEX IF NOT EXISTS idx_inscripciones_certificado_trabajo ON public.inscripciones(tiene_certificado_trabajo);
END $$;
