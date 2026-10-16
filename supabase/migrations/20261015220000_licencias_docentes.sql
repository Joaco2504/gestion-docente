-- ====================================================================
-- MIGRACIÓN: Control y Registro Anual de Licencias Docentes (Decreto 1092)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.licencias_docentes (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    docente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    catedra_id UUID REFERENCES public.catedras(id) ON DELETE SET NULL,
    clase_id UUID REFERENCES public.clases(id) ON DELETE SET NULL,
    fecha DATE NOT NULL,
    articulo TEXT NOT NULL,
    observacion TEXT,
    estado_tramite TEXT DEFAULT 'PENDIENTE_CERTIFICADO' CHECK (estado_tramite IN ('PRESENTADA', 'PENDIENTE_CERTIFICADO', 'APROBADA')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices de alto rendimiento para búsquedas anuales y por cátedra
CREATE INDEX IF NOT EXISTS idx_licencias_docentes_docente_fecha 
    ON public.licencias_docentes (docente_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_licencias_docentes_catedra_id 
    ON public.licencias_docentes (catedra_id);

CREATE INDEX IF NOT EXISTS idx_licencias_docentes_clase_id 
    ON public.licencias_docentes (clase_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.licencias_docentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "licencias_docentes_manage_own" ON public.licencias_docentes;
CREATE POLICY "licencias_docentes_manage_own" ON public.licencias_docentes
    FOR ALL
    TO authenticated
    USING (docente_id = auth.uid())
    WITH CHECK (docente_id = auth.uid());
