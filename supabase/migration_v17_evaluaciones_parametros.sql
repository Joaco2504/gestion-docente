-- ==============================================================================
-- PLANILLADOCENTE — MIGRACIÓN V17: PONDERACIÓN Y ESCALA DE NOTAS EN EVALUACIONES
-- Para ejecutar en: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Agregar columnas opcionales a la tabla 'evaluaciones'
DO $$
BEGIN
    -- Columna: ponderacion (NUMERIC para peso porcentual o factor de cálculo, ej. 30.00 %)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evaluaciones' AND column_name = 'ponderacion'
    ) THEN
        ALTER TABLE public.evaluaciones ADD COLUMN ponderacion NUMERIC(5,2) DEFAULT 100.00;
    END IF;

    -- Columna: escala_notas (TEXT para criterio de evaluación: NUMERICA_1_10, NUMERICA_1_100, CONCEPTUAL, APROBADO_DESAPROBADO)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evaluaciones' AND column_name = 'escala_notas'
    ) THEN
        ALTER TABLE public.evaluaciones ADD COLUMN escala_notas TEXT DEFAULT 'NUMERICA_1_10';
    END IF;
END $$;
