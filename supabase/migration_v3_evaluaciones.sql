-- ==============================================================================
-- PLANILLADOCENTE — MIGRACIÓN V3: FECHA DE ENTREGA Y ARCHIVO ADJUNTO EN EVALUACIONES
-- Para ejecutar en: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Agregar columnas opcionales a la tabla 'evaluaciones'
DO $$
BEGIN
    -- Columna: fecha_entrega (DATE)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evaluaciones' AND column_name = 'fecha_entrega'
    ) THEN
        ALTER TABLE public.evaluaciones ADD COLUMN fecha_entrega DATE;
    END IF;

    -- Columna: archivo_url (TEXT para URL de descarga en Supabase Storage)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evaluaciones' AND column_name = 'archivo_url'
    ) THEN
        ALTER TABLE public.evaluaciones ADD COLUMN archivo_url TEXT;
    END IF;

    -- Columna: archivo_nombre (TEXT para nombre legible del archivo adjunto)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evaluaciones' AND column_name = 'archivo_nombre'
    ) THEN
        ALTER TABLE public.evaluaciones ADD COLUMN archivo_nombre TEXT;
    END IF;
END $$;
