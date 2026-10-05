-- ==============================================================================
-- DOCENTEPRO — SCRIPT DE CORRECCIÓN DE ERRORES RLS Y CONSTRAINTS AUDITADO
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

-- Política 1: Subida de archivos autenticados (INSERT)
CREATE POLICY "Docentes upload files in archivos-docentes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'archivos-docentes');

-- Política 2: Lectura pública (SELECT)
CREATE POLICY "Allow all reads in archivos-docentes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'archivos-docentes');

-- Política 3: Actualización autenticada (UPDATE)
CREATE POLICY "Docentes update own files in archivos-docentes"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'archivos-docentes');

-- Política 4: Eliminación autenticada (DELETE)
CREATE POLICY "Docentes delete own files in archivos-docentes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'archivos-docentes');

-- ------------------------------------------------------------------------------
-- 3. REPARACIÓN AUDITADA DE RLS: RESTRICCIÓN POR DOCENTE Y SUPERADMIN
-- ------------------------------------------------------------------------------
ALTER TABLE public.evaluaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;

-- 1. Eliminar políticas inseguras de acceso público
DROP POLICY IF EXISTS "evaluaciones_allow_all" ON public.evaluaciones;
DROP POLICY IF EXISTS "evaluaciones_manage_own" ON public.evaluaciones;
DROP POLICY IF EXISTS "evaluaciones_docente_manage" ON public.evaluaciones;

DROP POLICY IF EXISTS "calificaciones_allow_all" ON public.calificaciones;
DROP POLICY IF EXISTS "calificaciones_docente_manage" ON public.calificaciones;

DROP POLICY IF EXISTS "recursos_allow_all" ON public.recursos;
DROP POLICY IF EXISTS "recursos_manage_own" ON public.recursos;
DROP POLICY IF EXISTS "recursos_docente_manage" ON public.recursos;

DROP POLICY IF EXISTS "asistencias_allow_all" ON public.asistencias;
DROP POLICY IF EXISTS "asistencias_manage_own" ON public.asistencias;
DROP POLICY IF EXISTS "asistencias_docente_manage" ON public.asistencias;

-- 2. Restablecer políticas estrictas por propietario (docente_id) y superadmin
CREATE POLICY "evaluaciones_docente_manage" ON public.evaluaciones
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.catedras c
      WHERE c.id = evaluaciones.catedra_id
      AND (c.docente_id = auth.uid() OR (auth.jwt() ->> 'email') = 'jooako7@gmail.com')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.catedras c
      WHERE c.id = evaluaciones.catedra_id
      AND (c.docente_id = auth.uid() OR (auth.jwt() ->> 'email') = 'jooako7@gmail.com')
    )
  );

CREATE POLICY "calificaciones_docente_manage" ON public.calificaciones
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.evaluaciones e
      JOIN public.catedras c ON c.id = e.catedra_id
      WHERE e.id = calificaciones.evaluacion_id
      AND (c.docente_id = auth.uid() OR (auth.jwt() ->> 'email') = 'jooako7@gmail.com')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.evaluaciones e
      JOIN public.catedras c ON c.id = e.catedra_id
      WHERE e.id = calificaciones.evaluacion_id
      AND (c.docente_id = auth.uid() OR (auth.jwt() ->> 'email') = 'jooako7@gmail.com')
    )
  );

CREATE POLICY "recursos_docente_manage" ON public.recursos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.catedras c
      WHERE c.id = recursos.catedra_id
      AND (c.docente_id = auth.uid() OR (auth.jwt() ->> 'email') = 'jooako7@gmail.com')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.catedras c
      WHERE c.id = recursos.catedra_id
      AND (c.docente_id = auth.uid() OR (auth.jwt() ->> 'email') = 'jooako7@gmail.com')
    )
  );

CREATE POLICY "asistencias_docente_manage" ON public.asistencias
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clases cl
      JOIN public.catedras c ON c.id = cl.catedra_id
      WHERE cl.id = asistencias.clase_id
      AND (c.docente_id = auth.uid() OR (auth.jwt() ->> 'email') = 'jooako7@gmail.com')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clases cl
      JOIN public.catedras c ON c.id = cl.catedra_id
      WHERE cl.id = asistencias.clase_id
      AND (c.docente_id = auth.uid() OR (auth.jwt() ->> 'email') = 'jooako7@gmail.com')
    )
  );

-- 3. Recargar PostgREST
NOTIFY pgrst, 'reload schema';
