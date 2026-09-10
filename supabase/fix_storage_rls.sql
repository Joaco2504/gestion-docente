-- ==============================================================================
-- DOCENTEPRO — SOLUCIÓN DEFINITIVA DE STORAGE Y ROW-LEVEL SECURITY (RLS)
-- ==============================================================================
-- Instrucciones:
-- 1. Ingresa a tu panel de Supabase: https://supabase.com/dashboard/project/rjndiodfnlncefyiujbg
-- 2. En el menú de la izquierda, haz clic en "SQL Editor".
-- 3. Haz clic en "New query", pega todo este contenido y presiona "Run" (o presiona Ctrl+Enter).
-- ==============================================================================

-- 1. CREAR EL BUCKET 'archivos-docentes' COMO PÚBLICO
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'archivos-docentes', 
    'archivos-docentes', 
    true, 
    52428800, -- 50MB
    null      -- Acepta cualquier tipo de archivo (PDF, Word, Excel, etc.)
)
ON CONFLICT (id) DO UPDATE 
SET public = true,
    file_size_limit = 52428800;

-- 2. ASEGURAR QUE RLS ESTÉ ACTIVO EN storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. LIMPIAR POLÍTICAS ANTERIORES DEL BUCKET 'archivos-docentes'
DROP POLICY IF EXISTS "Docentes upload own files" ON storage.objects;
DROP POLICY IF EXISTS "Docentes upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow all uploads in archivos-docentes" ON storage.objects;
DROP POLICY IF EXISTS "Public read files" ON storage.objects;
DROP POLICY IF EXISTS "Docentes read own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow all reads in archivos-docentes" ON storage.objects;
DROP POLICY IF EXISTS "Docentes update own files" ON storage.objects;
DROP POLICY IF EXISTS "Docentes update files" ON storage.objects;
DROP POLICY IF EXISTS "Allow all updates in archivos-docentes" ON storage.objects;
DROP POLICY IF EXISTS "Docentes delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Docentes delete files" ON storage.objects;
DROP POLICY IF EXISTS "Allow all deletes in archivos-docentes" ON storage.objects;

-- 4. PERMITIR SUBIDA (INSERT) EN EL BUCKET 'archivos-docentes'
CREATE POLICY "Allow all uploads in archivos-docentes"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'archivos-docentes');

-- 5. PERMITIR LECTURA Y DESCARGA PÚBLICA (SELECT)
CREATE POLICY "Allow all reads in archivos-docentes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'archivos-docentes');

-- 6. PERMITIR ACTUALIZACIÓN (UPDATE)
CREATE POLICY "Allow all updates in archivos-docentes"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'archivos-docentes');

-- 7. PERMITIR ELIMINACIÓN (DELETE)
CREATE POLICY "Allow all deletes in archivos-docentes"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'archivos-docentes');

-- 8. ASEGURAR POLÍTICA EN TABLA 'public.recursos' PARA GUARDAR LOS REGISTROS
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'recursos'
    ) THEN
        ALTER TABLE public.recursos ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "recursos_manage_own" ON public.recursos;
        DROP POLICY IF EXISTS "recursos_allow_all" ON public.recursos;
        CREATE POLICY "recursos_allow_all"
        ON public.recursos FOR ALL
        TO public
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;
