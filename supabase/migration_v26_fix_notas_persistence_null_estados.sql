-- ==============================================================================
-- PLANILLADOCENTE — MIGRACIÓN V26: FIX PERSISTENCIA NOTAS ESTADOS ESPECIALES
-- Garantiza que 'valor' y 'nota' admitan NULL para 'NO_ENTREGO' y 'AUSENTE'
-- ==============================================================================

-- 1. Quitar NOT NULL de la columna valor en public.notas
ALTER TABLE public.notas ALTER COLUMN valor DROP NOT NULL;

-- 2. Modificar constraint de validación para admitir NULL (estados especiales)
ALTER TABLE public.notas DROP CONSTRAINT IF EXISTS notas_valor_check;
ALTER TABLE public.notas ADD CONSTRAINT notas_valor_check 
    CHECK (valor IS NULL OR (valor >= 1.00 AND valor <= 10.00));

-- 3. Asegurar existencia de columnas 'estado', 'nota' y 'updated_at'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'notas' AND column_name = 'estado'
    ) THEN
        ALTER TABLE public.notas ADD COLUMN estado TEXT DEFAULT 'CALIFICADO';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'notas' AND column_name = 'nota'
    ) THEN
        ALTER TABLE public.notas ADD COLUMN nota NUMERIC(4,2);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'notas' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.notas ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 4. Saneamiento de datos históricos: limpiar 'valor = 1' en estados especiales legados
UPDATE public.notas
SET valor = NULL, nota = NULL
WHERE estado IN ('NO_ENTREGO', 'AUSENTE') AND (valor = 1.00 OR valor = 1);

-- 5. Notificar a PostgREST para recargar la caché del esquema
NOTIFY pgrst, 'reload schema';
