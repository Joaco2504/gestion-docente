-- ==============================================================================
-- MIGRACIÓN V7: ASOCIACIÓN DE UNIDADES TEMÁTICAS Y PROGRAMA DIDÁCTICO
-- ==============================================================================

-- 1. Crear tabla: UNIDADES_TEMATICAS (Ejes didácticos y contenidos del programa)
CREATE TABLE IF NOT EXISTS public.unidades_tematicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catedra_id UUID NOT NULL REFERENCES public.catedras(id) ON DELETE CASCADE,
    docente_id UUID NOT NULL REFERENCES public.docentes(id) ON DELETE CASCADE,
    numero INT NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(catedra_id, numero)
);

-- Índices de búsqueda
CREATE INDEX IF NOT EXISTS idx_unidades_catedra ON public.unidades_tematicas(catedra_id);
CREATE INDEX IF NOT EXISTS idx_unidades_docente ON public.unidades_tematicas(docente_id);

-- Habilitar Row Level Security
ALTER TABLE public.unidades_tematicas ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para Unidades Temáticas
DROP POLICY IF EXISTS "unidades_tematicas_manage_own" ON public.unidades_tematicas;
CREATE POLICY "unidades_tematicas_manage_own"
ON public.unidades_tematicas FOR ALL
USING (
    docente_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.catedras c
        WHERE c.id = unidades_tematicas.catedra_id
        AND c.docente_id = auth.uid()
    )
)
WITH CHECK (
    docente_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.catedras c
        WHERE c.id = unidades_tematicas.catedra_id
        AND c.docente_id = auth.uid()
    )
);

-- 2. Vincular CLASES con su respectiva UNIDAD TEMÁTICA
ALTER TABLE public.clases 
ADD COLUMN IF NOT EXISTS unidad_id UUID REFERENCES public.unidades_tematicas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clases_unidad ON public.clases(unidad_id);
