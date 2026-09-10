-- ==============================================================================
-- GESTIÓN DOCENTE (DOCENTEPRO) — ESQUEMA RELACIONAL COMPLETO & RLS
-- Para ejecutar en Supabase: Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. TABLA: DOCENTES (Perfiles vinculados a auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.docentes (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. TABLA: INSTITUCIONES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instituciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    docente_id UUID NOT NULL REFERENCES public.docentes(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    nivel TEXT NOT NULL CHECK (nivel IN ('SECUNDARIO', 'TERCIARIO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. TABLA: CICLOS LECTIVOS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ciclos_lectivos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    docente_id UUID NOT NULL REFERENCES public.docentes(id) ON DELETE CASCADE,
    anio INT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(docente_id, anio)
);

-- ------------------------------------------------------------------------------
-- 4. TABLA: PERIODOS ACADÉMICOS (Trimestres / Cuatrimestres)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.periodos_academicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ciclo_id UUID NOT NULL REFERENCES public.ciclos_lectivos(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    fecha_inicio DATE,
    fecha_fin DATE
);

-- ------------------------------------------------------------------------------
-- 5. TABLA: CÁTEDRAS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catedras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institucion_id UUID NOT NULL REFERENCES public.instituciones(id) ON DELETE CASCADE,
    ciclo_id UUID NOT NULL REFERENCES public.ciclos_lectivos(id) ON DELETE CASCADE,
    docente_id UUID NOT NULL REFERENCES public.docentes(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    nivel TEXT NOT NULL CHECK (nivel IN ('SECUNDARIO', 'TERCIARIO')),
    modalidad TEXT NOT NULL CHECK (modalidad IN ('ANUAL', 'CUATRIMESTRAL')),
    horarios_semanales JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. TABLA: CRITERIOS DE EVALUACIÓN
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.criterios_evaluacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catedra_id UUID NOT NULL UNIQUE REFERENCES public.catedras(id) ON DELETE CASCADE,
    min_asist_promo NUMERIC(5,2) NOT NULL DEFAULT 80.00,
    min_asist_reg NUMERIC(5,2) NOT NULL DEFAULT 70.00,
    nota_min_promo NUMERIC(4,2) NOT NULL DEFAULT 7.00,
    nota_min_reg NUMERIC(4,2) NOT NULL DEFAULT 4.00,
    nota_min_sec NUMERIC(4,2) NOT NULL DEFAULT 6.00
);

-- ------------------------------------------------------------------------------
-- 7. TABLA: ESTUDIANTES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.estudiantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    docente_id UUID NOT NULL REFERENCES public.docentes(id) ON DELETE CASCADE,
    dni TEXT NOT NULL,
    apellido TEXT NOT NULL,
    nombre TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(docente_id, dni)
);

-- ------------------------------------------------------------------------------
-- 8. TABLA: INSCRIPCIONES (Estudiante en Cátedra)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inscripciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estudiante_id UUID NOT NULL REFERENCES public.estudiantes(id) ON DELETE CASCADE,
    catedra_id UUID NOT NULL REFERENCES public.catedras(id) ON DELETE CASCADE,
    ciclo_id UUID NOT NULL REFERENCES public.ciclos_lectivos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(estudiante_id, catedra_id)
);

-- ------------------------------------------------------------------------------
-- 9. TABLA: CLASES (Sesión de clase)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catedra_id UUID NOT NULL REFERENCES public.catedras(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    tema TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. TABLA: ASISTENCIAS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asistencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clase_id UUID NOT NULL REFERENCES public.clases(id) ON DELETE CASCADE,
    estudiante_id UUID NOT NULL REFERENCES public.estudiantes(id) ON DELETE CASCADE,
    estado TEXT NOT NULL CHECK (estado IN ('PRESENTE', 'AUSENTE')),
    UNIQUE(clase_id, estudiante_id)
);

-- ------------------------------------------------------------------------------
-- 11. TABLA: EVALUACIONES (TP, Parcial, Prueba, Recuperatorio)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evaluaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catedra_id UUID NOT NULL REFERENCES public.catedras(id) ON DELETE CASCADE,
    periodo_id UUID REFERENCES public.periodos_academicos(id) ON DELETE SET NULL,
    titulo TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('TP', 'PARCIAL', 'PRUEBA', 'RECUPERATORIO')),
    evaluacion_origen_id UUID REFERENCES public.evaluaciones(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 12. TABLA: NOTAS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluacion_id UUID NOT NULL REFERENCES public.evaluaciones(id) ON DELETE CASCADE,
    estudiante_id UUID NOT NULL REFERENCES public.estudiantes(id) ON DELETE CASCADE,
    valor NUMERIC(4,2) NOT NULL CHECK (valor >= 1.00 AND valor <= 10.00),
    UNIQUE(evaluacion_id, estudiante_id)
);

-- ------------------------------------------------------------------------------
-- 13. TABLA: RECURSOS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recursos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catedra_id UUID NOT NULL REFERENCES public.catedras(id) ON DELETE CASCADE,
    categoria TEXT NOT NULL CHECK (categoria IN ('APUNTE', 'TP', 'PARCIAL', 'PLANIFICACION', 'BIBLIOGRAFIA')),
    tipo_origen TEXT NOT NULL CHECK (tipo_origen IN ('LOCAL', 'GOOGLE_LINK')),
    titulo TEXT NOT NULL,
    url_o_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 14. TABLA: EVENTOS CALENDARIO
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.eventos_calendario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    docente_id UUID NOT NULL REFERENCES public.docentes(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('CLASE', 'REUNION', 'TRIBUNAL_EXAMEN', 'PERIODO', 'OTRO')),
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin TIMESTAMPTZ NOT NULL,
    notas TEXT,
    editable BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- TRIGGERS AUTOMÁTICOS
-- ==============================================================================

-- Trigger: Crear automáticamente docente al registrarse en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS 
BEGIN
    INSERT INTO public.docentes (id, nombre, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
        NEW.email
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        nombre = COALESCE(EXCLUDED.nombre, public.docentes.nombre);
    RETURN NEW;
END;
 LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Crear criterios de evaluación por defecto al crear una cátedra
CREATE OR REPLACE FUNCTION public.handle_new_catedra()
RETURNS TRIGGER AS 
BEGIN
    INSERT INTO public.criterios_evaluacion (catedra_id)
    VALUES (NEW.id)
    ON CONFLICT (catedra_id) DO NOTHING;
    RETURN NEW;
END;
 LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_catedra_created ON public.catedras;
CREATE TRIGGER on_catedra_created
    AFTER INSERT ON public.catedras
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_catedra();

-- ==============================================================================
-- STORAGE BUCKET: archivos-docentes
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('archivos-docentes', 'archivos-docentes', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage
DROP POLICY IF EXISTS "Docentes upload own files" ON storage.objects;
CREATE POLICY "Docentes upload own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'archivos-docentes' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Docentes read own files" ON storage.objects;
CREATE POLICY "Docentes read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'archivos-docentes');

DROP POLICY IF EXISTS "Docentes delete own files" ON storage.objects;
CREATE POLICY "Docentes delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'archivos-docentes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS
-- ==============================================================================

ALTER TABLE public.docentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instituciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ciclos_lectivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_academicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catedras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criterios_evaluacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_calendario ENABLE ROW LEVEL SECURITY;

-- 1. Docentes
DROP POLICY IF EXISTS "docentes_manage_own" ON public.docentes;
CREATE POLICY "docentes_manage_own" ON public.docentes
FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. Instituciones
DROP POLICY IF EXISTS "instituciones_manage_own" ON public.instituciones;
CREATE POLICY "instituciones_manage_own" ON public.instituciones
FOR ALL TO authenticated USING (auth.uid() = docente_id) WITH CHECK (auth.uid() = docente_id);

-- 3. Ciclos Lectivos
DROP POLICY IF EXISTS "ciclos_lectivos_manage_own" ON public.ciclos_lectivos;
CREATE POLICY "ciclos_lectivos_manage_own" ON public.ciclos_lectivos
FOR ALL TO authenticated USING (auth.uid() = docente_id) WITH CHECK (auth.uid() = docente_id);

-- 4. Periodos Académicos
DROP POLICY IF EXISTS "periodos_manage_own" ON public.periodos_academicos;
CREATE POLICY "periodos_manage_own" ON public.periodos_academicos
FOR ALL TO authenticated
USING (ciclo_id IN (SELECT id FROM public.ciclos_lectivos WHERE docente_id = auth.uid()))
WITH CHECK (ciclo_id IN (SELECT id FROM public.ciclos_lectivos WHERE docente_id = auth.uid()));

-- 5. Cátedras
DROP POLICY IF EXISTS "catedras_manage_own" ON public.catedras;
CREATE POLICY "catedras_manage_own" ON public.catedras
FOR ALL TO authenticated USING (auth.uid() = docente_id) WITH CHECK (auth.uid() = docente_id);

-- 6. Criterios de Evaluación
DROP POLICY IF EXISTS "criterios_manage_own" ON public.criterios_evaluacion;
CREATE POLICY "criterios_manage_own" ON public.criterios_evaluacion
FOR ALL TO authenticated
USING (catedra_id IN (SELECT id FROM public.catedras WHERE docente_id = auth.uid()))
WITH CHECK (catedra_id IN (SELECT id FROM public.catedras WHERE docente_id = auth.uid()));

-- 7. Estudiantes
DROP POLICY IF EXISTS "estudiantes_manage_own" ON public.estudiantes;
CREATE POLICY "estudiantes_manage_own" ON public.estudiantes
FOR ALL TO authenticated USING (auth.uid() = docente_id) WITH CHECK (auth.uid() = docente_id);

-- 8. Inscripciones
DROP POLICY IF EXISTS "inscripciones_manage_own" ON public.inscripciones;
CREATE POLICY "inscripciones_manage_own" ON public.inscripciones
FOR ALL TO authenticated
USING (catedra_id IN (SELECT id FROM public.catedras WHERE docente_id = auth.uid()))
WITH CHECK (catedra_id IN (SELECT id FROM public.catedras WHERE docente_id = auth.uid()));

-- 9. Clases
DROP POLICY IF EXISTS "clases_manage_own" ON public.clases;
CREATE POLICY "clases_manage_own" ON public.clases
FOR ALL TO authenticated
USING (catedra_id IN (SELECT id FROM public.catedras WHERE docente_id = auth.uid()))
WITH CHECK (catedra_id IN (SELECT id FROM public.catedras WHERE docente_id = auth.uid()));

-- 10. Asistencias
DROP POLICY IF EXISTS "asistencias_manage_own" ON public.asistencias;
CREATE POLICY "asistencias_manage_own" ON public.asistencias
FOR ALL TO authenticated
USING (clase_id IN (SELECT cl.id FROM public.clases cl JOIN public.catedras ca ON cl.catedra_id = ca.id WHERE ca.docente_id = auth.uid()))
WITH CHECK (clase_id IN (SELECT cl.id FROM public.clases cl JOIN public.catedras ca ON cl.catedra_id = ca.id WHERE ca.docente_id = auth.uid()));

-- 11. Evaluaciones
DROP POLICY IF EXISTS "evaluaciones_manage_own" ON public.evaluaciones;
CREATE POLICY "evaluaciones_manage_own" ON public.evaluaciones
FOR ALL TO authenticated
USING (catedra_id IN (SELECT id FROM public.catedras WHERE docente_id = auth.uid()))
WITH CHECK (catedra_id IN (SELECT id FROM public.catedras WHERE docente_id = auth.uid()));

-- 12. Notas
DROP POLICY IF EXISTS "notas_manage_own" ON public.notas;
CREATE POLICY "notas_manage_own" ON public.notas
FOR ALL TO authenticated
USING (evaluacion_id IN (SELECT ev.id FROM public.evaluaciones ev JOIN public.catedras ca ON ev.catedra_id = ca.id WHERE ca.docente_id = auth.uid()))
WITH CHECK (evaluacion_id IN (SELECT ev.id FROM public.evaluaciones ev JOIN public.catedras ca ON ev.catedra_id = ca.id WHERE ca.docente_id = auth.uid()));

-- 13. Recursos
DROP POLICY IF EXISTS "recursos_manage_own" ON public.recursos;
CREATE POLICY "recursos_manage_own" ON public.recursos
FOR ALL TO authenticated
USING (catedra_id IN (SELECT id FROM public.catedras WHERE docente_id = auth.uid()))
WITH CHECK (catedra_id IN (SELECT id FROM public.catedras WHERE docente_id = auth.uid()));

-- 14. Eventos Calendario
DROP POLICY IF EXISTS "eventos_manage_own" ON public.eventos_calendario;
CREATE POLICY "eventos_manage_own" ON public.eventos_calendario
FOR ALL TO authenticated USING (auth.uid() = docente_id) WITH CHECK (auth.uid() = docente_id);
