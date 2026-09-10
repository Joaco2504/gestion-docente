-- ==============================================================================
-- DOCENTEPRO — SCRIPT DE CORRECCIÓN DE ERRORES RLS Y CONSTRAINTS
-- Para ejecutar en: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CORRECCIÓN DE CONSTRAINTS PARA IMPORTACIÓN DE EXCEL (ON CONFLICT)
-- ------------------------------------------------------------------------------

-- Asegurar que la tabla 'estudiantes' tenga restricción UNIQUE en (docente_id, dni)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'estudiantes_docente_id_dni_key'
           OR (conrelid = 'public.estudiantes'::regclass AND contype = 'u')
    ) THEN
        ALTER TABLE public.estudiantes 
        ADD CONSTRAINT estudiantes_docente_id_dni_key UNIQUE (docente_id, dni);
    END IF;
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN others THEN 
        BEGIN
            ALTER TABLE public.estudiantes 
            ADD CONSTRAINT estudiantes_docente_id_dni_key UNIQUE (docente_id, dni);
        EXCEPTION
            WHEN others THEN NULL;
        END;
END $$;

-- Asegurar que la tabla 'inscripciones' tenga restricción UNIQUE en (estudiante_id, catedra_id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'inscripciones_estudiante_id_catedra_id_key'
           OR (conrelid = 'public.inscripciones'::regclass AND contype = 'u')
    ) THEN
        ALTER TABLE public.inscripciones 
        ADD CONSTRAINT inscripciones_estudiante_id_catedra_id_key UNIQUE (estudiante_id, catedra_id);
    END IF;
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN others THEN 
        BEGIN
            ALTER TABLE public.inscripciones 
            ADD CONSTRAINT inscripciones_estudiante_id_catedra_id_key UNIQUE (estudiante_id, catedra_id);
        EXCEPTION
            WHEN others THEN NULL;
        END;
END $$;


-- ------------------------------------------------------------------------------
-- 2. CORRECCIÓN DE STORAGE Y BUCKET PARA SUBIDA DE ARCHIVOS / PDFS
-- ------------------------------------------------------------------------------

-- Crear bucket público 'archivos-docentes' si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'archivos-docentes', 
    'archivos-docentes', 
    true, 
    52428800, -- 50MB
    null      -- Acepta todos los tipos de archivo (PDF, Word, Excel, etc.)
)
ON CONFLICT (id) DO UPDATE 
SET public = true, 
    file_size_limit = 52428800;

-- Habilitar RLS en storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores
DROP POLICY IF EXISTS "Docentes upload own files" ON storage.objects;
DROP POLICY IF EXISTS "Docentes upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow all uploads in archivos-docentes" ON storage.objects;
DROP POLICY IF EXISTS "Docentes read own files" ON storage.objects;
DROP POLICY IF EXISTS "Public read files" ON storage.objects;
DROP POLICY IF EXISTS "Allow all reads in archivos-docentes" ON storage.objects;
DROP POLICY IF EXISTS "Docentes update own files" ON storage.objects;
DROP POLICY IF EXISTS "Docentes update files" ON storage.objects;
DROP POLICY IF EXISTS "Allow all updates in archivos-docentes" ON storage.objects;
DROP POLICY IF EXISTS "Docentes delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Docentes delete files" ON storage.objects;
DROP POLICY IF EXISTS "Allow all deletes in archivos-docentes" ON storage.objects;

-- Política 1: Subida de archivos (INSERT)
CREATE POLICY "Allow all uploads in archivos-docentes"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'archivos-docentes');

-- Política 2: Lectura pública (SELECT)
CREATE POLICY "Allow all reads in archivos-docentes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'archivos-docentes');

-- Política 3: Actualización (UPDATE)
CREATE POLICY "Allow all updates in archivos-docentes"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'archivos-docentes');

-- Política 4: Eliminación (DELETE)
CREATE POLICY "Allow all deletes in archivos-docentes"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'archivos-docentes');

-- ------------------------------------------------------------------------------
-- 3. POLÍTICA DE RECURSOS EN TABLA 'public.recursos'
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "recursos_manage_own" ON public.recursos;
DROP POLICY IF EXISTS "recursos_allow_all" ON public.recursos;
CREATE POLICY "recursos_allow_all"
ON public.recursos FOR ALL
TO public
USING (true)
WITH CHECK (true);

