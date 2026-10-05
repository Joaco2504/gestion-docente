-- ==============================================================================
-- PLANILLADOCENTE — MIGRACIÓN V21: ESTADOS ESPECIALES DE EVALUACIÓN EN NOTAS
-- Permite asentar 'NO_ENTREGO' en Trabajos Prácticos y 'AUSENTE' en Parciales/Exámenes
-- ==============================================================================

DO $$
BEGIN
    -- 1. Permitir valores NULL en 'valor' para estudiantes ausentes o que no entregaron
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'notas' AND column_name = 'valor'
    ) THEN
        ALTER TABLE public.notas ALTER COLUMN valor DROP NOT NULL;
    END IF;

    -- 2. Modificar el constraint de valor para admitir NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' AND table_name = 'notas' AND constraint_name = 'notas_valor_check'
    ) THEN
        ALTER TABLE public.notas DROP CONSTRAINT notas_valor_check;
        ALTER TABLE public.notas ADD CONSTRAINT notas_valor_check CHECK (valor IS NULL OR (valor >= 1.00 AND valor <= 10.00));
    END IF;

    -- 3. Columna: estado ('CALIFICADO' | 'NO_ENTREGO' | 'AUSENTE')
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'notas' AND column_name = 'estado'
    ) THEN
        ALTER TABLE public.notas ADD COLUMN estado TEXT DEFAULT 'CALIFICADO';
    END IF;

    -- 4. Columna: nota (alias numérico)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'notas' AND column_name = 'nota'
    ) THEN
        ALTER TABLE public.notas ADD COLUMN nota NUMERIC(4,2);
    END IF;
END $$;
