-- ==============================================================================
-- DOCENTEPRO — MIGRACIÓN V10: CONEXIÓN ROBUSTA DE PERÍODOS ACADÉMICOS Y RECESO
-- ==============================================================================

-- 1. Asegurar columna docente_id en periodos_academicos si aún no existe
ALTER TABLE public.periodos_academicos 
ADD COLUMN IF NOT EXISTS docente_id UUID REFERENCES public.docentes(id) ON DELETE CASCADE;

-- 2. Asegurar restricción UNIQUE(ciclo_id, tipo) para permitir .upsert(..., { onConflict: 'ciclo_id,tipo' })
DO $$
BEGIN
    -- Eliminar duplicados previos si existieran antes de aplicar la restricción
    DELETE FROM public.periodos_academicos a
    USING public.periodos_academicos b
    WHERE a.id > b.id 
      AND a.ciclo_id = b.ciclo_id 
      AND a.tipo = b.tipo;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'periodos_academicos_ciclo_id_tipo_key'
    ) THEN
        ALTER TABLE public.periodos_academicos 
        ADD CONSTRAINT periodos_academicos_ciclo_id_tipo_key UNIQUE (ciclo_id, tipo);
    END IF;
END $$;

-- 3. Crear índice para optimizar búsquedas por docente y ciclo
CREATE INDEX IF NOT EXISTS idx_periodos_ciclo_tipo ON public.periodos_academicos (ciclo_id, tipo);
CREATE INDEX IF NOT EXISTS idx_periodos_docente_id ON public.periodos_academicos (docente_id);

-- 4. Actualizar políticas RLS de periodos_academicos
DROP POLICY IF EXISTS "periodos_manage_own" ON public.periodos_academicos;
CREATE POLICY "periodos_manage_own" ON public.periodos_academicos
FOR ALL TO authenticated
USING (
    ciclo_id IN (SELECT id FROM public.ciclos_lectivos WHERE docente_id = auth.uid())
    OR docente_id = auth.uid()
)
WITH CHECK (
    ciclo_id IN (SELECT id FROM public.ciclos_lectivos WHERE docente_id = auth.uid())
    OR docente_id = auth.uid()
);
