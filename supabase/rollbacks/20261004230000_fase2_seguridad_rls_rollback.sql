-- ==============================================================================
-- ROLLBACK FASE 2: SEGURIDAD Y ENDURECIMIENTO RLS
-- Archivo: 20261004230000_fase2_seguridad_rls_rollback.sql
-- ==============================================================================

-- 1. Revertir tabla recordatorios_enviados
DROP TABLE IF EXISTS public.recordatorios_enviados CASCADE;

-- 2. Revertir columna discord_canal_recordatorios en configuracion_sistema
ALTER TABLE public.configuracion_sistema
DROP COLUMN IF EXISTS discord_canal_recordatorios;

-- 3. Revertir políticas de storage en storage.objects
DROP POLICY IF EXISTS "Docentes pueden subir sus propios archivos" ON storage.objects;
DROP POLICY IF EXISTS "Docentes pueden actualizar sus propios archivos" ON storage.objects;
DROP POLICY IF EXISTS "Docentes pueden borrar sus propios archivos" ON storage.objects;
DROP POLICY IF EXISTS "Lectura publica de archivos docentes" ON storage.objects;

-- Restaurar política pública de lectura de la baseline
CREATE POLICY "Allow all reads in archivos-docentes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'archivos-docentes');

-- 4. Notificar a PostgREST
NOTIFY pgrst, 'reload schema';
