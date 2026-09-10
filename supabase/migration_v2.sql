-- ==============================================================================
-- DOCENTEPRO — MIGRACIÓN V2: PERÍODOS ACADÉMICOS E INASISTENCIAS DOCENTES
-- Para ejecutar en: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLA: PERIODOS ACADÉMICOS (Asegurar columnas de límites de fecha)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.periodos_academicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ciclo_id UUID NOT NULL REFERENCES public.ciclos_lectivos(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'CUATRIMESTRE', -- 'CUATRIMESTRE', 'TRIMESTRE', 'RECESO'
    fecha_inicio DATE,
    fecha_fin DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Asegurar columnas si la tabla ya existía previamente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'periodos_academicos' AND column_name = 'fecha_inicio'
    ) THEN
        ALTER TABLE public.periodos_academicos ADD COLUMN fecha_inicio DATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'periodos_academicos' AND column_name = 'fecha_fin'
    ) THEN
        ALTER TABLE public.periodos_academicos ADD COLUMN fecha_fin DATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'periodos_academicos' AND column_name = 'tipo'
    ) THEN
        ALTER TABLE public.periodos_academicos ADD COLUMN tipo TEXT NOT NULL DEFAULT 'CUATRIMESTRE';
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. TABLA: INASISTENCIAS DOCENTE (Licencias y Artículos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inasistencias_docente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catedra_id UUID NOT NULL REFERENCES public.catedras(id) ON DELETE CASCADE,
    docente_id UUID NOT NULL REFERENCES public.docentes(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('LICENCIA', 'RAZONES_PARTICULARES')),
    articulo_licencia TEXT, -- ej. 'Art. 44', 'Art. 50', 'Art. 5'
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(catedra_id, fecha)
);

-- ------------------------------------------------------------------------------
-- 3. POLÍTICAS ROW-LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.periodos_academicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inasistencias_docente ENABLE ROW LEVEL SECURITY;

-- Políticas para Periodos Académicos
DROP POLICY IF EXISTS "periodos_manage_own" ON public.periodos_academicos;
CREATE POLICY "periodos_manage_own" ON public.periodos_academicos
FOR ALL TO authenticated
USING (ciclo_id IN (SELECT id FROM public.ciclos_lectivos WHERE docente_id = auth.uid()))
WITH CHECK (ciclo_id IN (SELECT id FROM public.ciclos_lectivos WHERE docente_id = auth.uid()));

-- Políticas para Inasistencias Docente
DROP POLICY IF EXISTS "inasistencias_docente_manage_own" ON public.inasistencias_docente;
CREATE POLICY "inasistencias_docente_manage_own" ON public.inasistencias_docente
FOR ALL TO authenticated
USING (docente_id = auth.uid())
WITH CHECK (docente_id = auth.uid());
