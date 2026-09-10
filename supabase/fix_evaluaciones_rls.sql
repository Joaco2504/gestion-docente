-- ==============================================================================
-- PLANILLADOCENTE — FIX DEFINITIVO DE RLS Y COLUMNAS PARA EVALUACIONES Y NOTAS
-- Para ejecutar en: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Asegurar columnas en la tabla 'evaluaciones'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evaluaciones' AND column_name = 'fecha_entrega'
    ) THEN
        ALTER TABLE public.evaluaciones ADD COLUMN fecha_entrega DATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evaluaciones' AND column_name = 'archivo_url'
    ) THEN
        ALTER TABLE public.evaluaciones ADD COLUMN archivo_url TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evaluaciones' AND column_name = 'archivo_nombre'
    ) THEN
        ALTER TABLE public.evaluaciones ADD COLUMN archivo_nombre TEXT;
    END IF;
END $$;

-- 2. Habilitar RLS y definir políticas permisivas en 'evaluaciones'
ALTER TABLE public.evaluaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "evaluaciones_manage_own" ON public.evaluaciones;
DROP POLICY IF EXISTS "evaluaciones_allow_all" ON public.evaluaciones;

CREATE POLICY "evaluaciones_allow_all"
ON public.evaluaciones FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 3. Habilitar RLS y definir políticas permisivas en 'notas'
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notas_manage_own" ON public.notas;
DROP POLICY IF EXISTS "notas_allow_all" ON public.notas;

CREATE POLICY "notas_allow_all"
ON public.notas FOR ALL
TO public
USING (true)
WITH CHECK (true);
