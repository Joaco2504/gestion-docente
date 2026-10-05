-- ==============================================================================
-- MIGRACIÓN V4: LIBRO DE TEMAS DIGITAL & MESAS DE EXAMEN CON ACTAS VOLANTES
-- ==============================================================================

-- 1. Ampliar tabla CLASES para Libro de Temas pedagógico
ALTER TABLE public.clases 
ADD COLUMN IF NOT EXISTS horas_catedra INT DEFAULT 2,
ADD COLUMN IF NOT EXISTS caracter TEXT DEFAULT 'TEORICA',
ADD COLUMN IF NOT EXISTS observaciones TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS archivo_adjunto TEXT DEFAULT '';

-- 2. Tabla: MESAS DE EXAMEN (Llamados y Tribunales Evaluadores)
CREATE TABLE IF NOT EXISTS public.mesas_examen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catedra_id UUID NOT NULL REFERENCES public.catedras(id) ON DELETE CASCADE,
    docente_id UUID NOT NULL REFERENCES public.docentes(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    turno_llamado TEXT NOT NULL DEFAULT '1° LLAMADO',
    libro TEXT DEFAULT '',
    tomo TEXT DEFAULT '',
    folio TEXT DEFAULT '',
    acta_numero TEXT DEFAULT '',
    presidente TEXT DEFAULT '',
    vocal1 TEXT DEFAULT '',
    vocal2 TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS en mesas_examen
ALTER TABLE public.mesas_examen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Docentes pueden gestionar sus mesas de examen"
ON public.mesas_examen FOR ALL
USING (auth.uid() = docente_id)
WITH CHECK (auth.uid() = docente_id);

-- 3. Tabla: ACTAS_EXAMEN_ALUMNOS (Calificaciones del Acta Volante)
CREATE TABLE IF NOT EXISTS public.actas_examen_alumnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mesa_id UUID NOT NULL REFERENCES public.mesas_examen(id) ON DELETE CASCADE,
    estudiante_id UUID REFERENCES public.estudiantes(id) ON DELETE SET NULL,
    alumno_nombre_completo TEXT NOT NULL DEFAULT '',
    alumno_dni TEXT NOT NULL DEFAULT '',
    condicion_previa TEXT NOT NULL DEFAULT 'REGULAR' CHECK (condicion_previa IN ('REGULAR', 'LIBRE')),
    nota_escrito NUMERIC(4,2),
    nota_oral NUMERIC(4,2),
    nota_definitiva NUMERIC(4,2),
    dictamen TEXT NOT NULL DEFAULT 'AUSENTE' CHECK (dictamen IN ('APROBADO', 'DESAPROBADO', 'AUSENTE')),
    observaciones TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS en actas_examen_alumnos
ALTER TABLE public.actas_examen_alumnos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Docentes pueden gestionar los alumnos de sus actas de examen"
ON public.actas_examen_alumnos FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.mesas_examen m
        WHERE m.id = actas_examen_alumnos.mesa_id
        AND m.docente_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.mesas_examen m
        WHERE m.id = actas_examen_alumnos.mesa_id
        AND m.docente_id = auth.uid()
    )
);
