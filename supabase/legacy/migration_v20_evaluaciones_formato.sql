-- ==============================================================================
-- PLANILLADOCENTE — MIGRACIÓN V20: FORMATO DE EVALUACIÓN Y COLUMNAS DE COMPATIBILIDAD
-- ==============================================================================

DO $$
BEGIN
    -- 1. Columna: formato ('Escrito' | 'Oral')
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evaluaciones' AND column_name = 'formato'
    ) THEN
        ALTER TABLE public.evaluaciones ADD COLUMN formato TEXT DEFAULT 'Escrito';
    END IF;

    -- 2. Columna: nombre (alias de titulo para interoperabilidad)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evaluaciones' AND column_name = 'nombre'
    ) THEN
        ALTER TABLE public.evaluaciones ADD COLUMN nombre TEXT;
    END IF;

    -- 3. Columna: fecha (alias de fecha_entrega para interoperabilidad)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evaluaciones' AND column_name = 'fecha'
    ) THEN
        ALTER TABLE public.evaluaciones ADD COLUMN fecha DATE;
    END IF;
END $$;
