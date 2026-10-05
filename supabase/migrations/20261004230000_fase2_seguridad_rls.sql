-- ==============================================================================
-- FASE 2: SEGURIDAD Y ENDURECIMIENTO RLS
-- Migración: 20261004230000_fase2_seguridad_rls.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. STORAGE: RESTRINGIR BUCKET 'archivos-docentes'
-- ------------------------------------------------------------------------------

-- Asegurar que el bucket exista y esté activo
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'archivos-docentes', 
    'archivos-docentes', 
    true, 
    52428800, -- 50MB
    null
)
ON CONFLICT (id) DO UPDATE 
SET public = true,
    file_size_limit = 52428800;

-- Limpiar políticas anteriores permisivas o inseguras
DROP POLICY IF EXISTS "Allow all uploads in archivos-docentes" ON storage.objects;
DROP POLICY IF EXISTS "Allow all updates in archivos-docentes" ON storage.objects;
DROP POLICY IF EXISTS "Allow all deletes in archivos-docentes" ON storage.objects;
DROP POLICY IF EXISTS "Allow all reads in archivos-docentes" ON storage.objects;
DROP POLICY IF EXISTS "Docentes upload own files" ON storage.objects;
DROP POLICY IF EXISTS "Docentes upload files" ON storage.objects;
DROP POLICY IF EXISTS "Docentes read own files" ON storage.objects;
DROP POLICY IF EXISTS "Docentes update own files" ON storage.objects;
DROP POLICY IF EXISTS "Docentes delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Public read files" ON storage.objects;
DROP POLICY IF EXISTS "Docentes pueden subir sus propios archivos" ON storage.objects;
DROP POLICY IF EXISTS "Docentes pueden actualizar sus propios archivos" ON storage.objects;
DROP POLICY IF EXISTS "Docentes pueden borrar sus propios archivos" ON storage.objects;
DROP POLICY IF EXISTS "Lectura publica de archivos docentes" ON storage.objects;

-- Lectura pública (mantiene compatibilidad de descarga con recursos ya guardados y portal de alumnos)
CREATE POLICY "Lectura publica de archivos docentes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'archivos-docentes');

-- Inserción: Solo si el path es {userId}/{catedraId}/{archivo} y userId = auth.uid()
CREATE POLICY "Docentes pueden subir sus propios archivos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'archivos-docentes' AND
    (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.es_superadmin()
    )
);

-- Actualización: Solo propietario o superadmin
CREATE POLICY "Docentes pueden actualizar sus propios archivos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'archivos-docentes' AND
    (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.es_superadmin()
    )
)
WITH CHECK (
    bucket_id = 'archivos-docentes' AND
    (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.es_superadmin()
    )
);

-- Eliminación: Solo propietario o superadmin
CREATE POLICY "Docentes pueden borrar sus propios archivos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'archivos-docentes' AND
    (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.es_superadmin()
    )
);

-- ------------------------------------------------------------------------------
-- 2. DISCORD & AUDITORÍA EN BASE DE DATOS
-- ------------------------------------------------------------------------------

-- Columna de configuración de canal en configuracion_sistema
ALTER TABLE public.configuracion_sistema
ADD COLUMN IF NOT EXISTS discord_canal_recordatorios TEXT DEFAULT '1556366651296055357';

UPDATE public.configuracion_sistema
SET discord_canal_recordatorios = '1556366651296055357'
WHERE discord_canal_recordatorios IS NULL;

-- Tabla de idempotencia y trazabilidad de recordatorios
CREATE TABLE IF NOT EXISTS public.recordatorios_enviados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_origen TEXT NOT NULL DEFAULT 'EVENTO_CALENDARIO',
    evento_uuid UUID,
    evento_id TEXT NOT NULL,
    tipo_evento TEXT NOT NULL,
    tipo_aviso TEXT NOT NULL,
    destinatario_canal TEXT NOT NULL,
    enviado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estado TEXT NOT NULL DEFAULT 'ENVIADO' CHECK (estado IN ('ENVIADO', 'REINTENTANDO', 'FALLIDO')),
    intentos INT NOT NULL DEFAULT 1,
    error TEXT,
    payload_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_evento_aviso UNIQUE (evento_id, tipo_aviso)
);

CREATE INDEX IF NOT EXISTS idx_recordatorios_evento_aviso ON public.recordatorios_enviados(evento_id, tipo_aviso);
CREATE INDEX IF NOT EXISTS idx_recordatorios_estado ON public.recordatorios_enviados(estado);
CREATE INDEX IF NOT EXISTS idx_recordatorios_origen_uuid ON public.recordatorios_enviados(evento_origen, evento_uuid);

ALTER TABLE public.recordatorios_enviados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Docentes autenticados pueden ver recordatorios enviados" ON public.recordatorios_enviados;
CREATE POLICY "Docentes autenticados pueden ver recordatorios enviados"
ON public.recordatorios_enviados FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Superadmin y procesos pueden gestionar recordatorios" ON public.recordatorios_enviados;
CREATE POLICY "Superadmin y procesos pueden gestionar recordatorios"
ON public.recordatorios_enviados FOR ALL
TO authenticated
USING (public.es_superadmin())
WITH CHECK (public.es_superadmin());

COMMENT ON TABLE public.recordatorios_enviados IS 'Registro de idempotencia y trazabilidad de recordatorios emitidos hacia Discord (n8n/worker)';

-- ------------------------------------------------------------------------------
-- 3. POLÍTICAS DE PERFILES: PREVENCIÓN DE RECURSIÓN
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Edicion de perfil propio" ON public.perfiles;
CREATE POLICY "Edicion de perfil propio" ON public.perfiles
    AS PERMISSIVE
    FOR UPDATE
    TO authenticated
    USING (((id = auth.uid()) OR public.es_superadmin()))
    WITH CHECK (((id = auth.uid()) OR public.es_superadmin()));

DROP POLICY IF EXISTS "Lectura de perfiles" ON public.perfiles;
CREATE POLICY "Lectura de perfiles" ON public.perfiles
    AS PERMISSIVE
    FOR SELECT
    TO authenticated
    USING (((id = auth.uid()) OR public.es_superadmin()));

DROP POLICY IF EXISTS "Superadmin control total perfiles" ON public.perfiles;
CREATE POLICY "Superadmin control total perfiles" ON public.perfiles
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING (public.es_superadmin())
    WITH CHECK (public.es_superadmin());

-- ------------------------------------------------------------------------------
-- 4. FIJAR search_path EXPLÍCITO EN TODAS LAS FUNCIONES SECURITY DEFINER
-- ------------------------------------------------------------------------------

-- Función: admin_cambiar_rol
CREATE OR REPLACE FUNCTION public.admin_cambiar_rol(p_usuario_id uuid, p_nuevo_rol text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions, pg_temp
AS $function$
BEGIN
    IF NOT public.es_superadmin() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol de Superadmin';
    END IF;

    UPDATE public.perfiles
    SET rol = p_nuevo_rol, updated_at = NOW()
    WHERE id = p_usuario_id;
END;
$function$
;

-- Función: admin_purgar_huerfanos_docente
CREATE OR REPLACE FUNCTION public.admin_purgar_huerfanos_docente(p_docente_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions, pg_temp
AS $function$
DECLARE
    v_catedras_borradas INT;
    v_inscripciones_borradas INT;
BEGIN
    IF NOT public.es_superadmin() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol de Superadmin';
    END IF;

    -- Eliminar cátedras huérfanas (sin institución o sin ciclo válido)
    WITH deleted_cat AS (
        DELETE FROM public.catedras
        WHERE docente_id = p_docente_id 
          AND (institucion_id IS NULL OR ciclo_id IS NULL)
        RETURNING id
    )
    SELECT count(*) INTO v_catedras_borradas FROM deleted_cat;

    -- Eliminar inscripciones que apunten a cátedras inexistentes
    WITH deleted_insc AS (
        DELETE FROM public.inscripciones
        WHERE catedra_id NOT IN (SELECT id FROM public.catedras)
        RETURNING id
    )
    SELECT count(*) INTO v_inscripciones_borradas FROM deleted_insc;

    RETURN json_build_object(
        'catedras_eliminadas', v_catedras_borradas,
        'inscripciones_eliminadas', v_inscripciones_borradas
    );
END;
$function$
;

-- Función: autofill_inscripcion_ciclo
CREATE OR REPLACE FUNCTION public.autofill_inscripcion_ciclo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions, pg_temp
AS $function$
BEGIN
    IF NEW.ciclo_id IS NULL THEN
        SELECT ciclo_id INTO NEW.ciclo_id 
        FROM public.catedras 
        WHERE id = NEW.catedra_id;
    END IF;
    RETURN NEW;
END;
$function$
;

-- Función: consultar_estado_alumno
CREATE OR REPLACE FUNCTION public.consultar_estado_alumno(p_catedra_id uuid, p_dni text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions, pg_temp
AS $function$
DECLARE
    v_catedra RECORD;
    v_estudiante RECORD;
    v_criterios RECORD;
    v_clean_dni TEXT;
    v_total_clases INT := 0;
    v_clases_licencia INT := 0;
    v_clases_efectivas INT := 0;
    v_presentes INT := 0;
    v_ausentes INT := 0;
    v_asistencia_pct NUMERIC(5,2) := 100.00;
    v_evaluaciones JSONB := '[]'::jsonb;
    v_result JSONB;
BEGIN
    -- Normalizar DNI removiendo espacios, puntos y guiones
    v_clean_dni := REGEXP_REPLACE(p_dni, '[^0-9]', '', 'g');

    IF v_clean_dni IS NULL OR LENGTH(v_clean_dni) < 6 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'DNI_INVALIDO',
            'message', 'El número de DNI ingresado no es válido.'
        );
    END IF;

    -- Verificar que la cátedra exista y tenga el portal activo
    SELECT c.*, i.nombre AS institucion_nombre
    INTO v_catedra
    FROM public.catedras c
    LEFT JOIN public.instituciones i ON i.id = c.institucion_id
    WHERE c.id = p_catedra_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'CATEDRA_NO_ENCONTRADA',
            'message', 'La cátedra solicitada no existe.'
        );
    END IF;

    IF NOT v_catedra.portal_activo THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'PORTAL_INACTIVO',
            'message', 'El portal de consulta de esta cátedra se encuentra pausado por el docente.'
        );
    END IF;

    -- Buscar estudiante inscripto en la cátedra con ese DNI
    SELECT e.id, e.dni, e.apellido, e.nombre
    INTO v_estudiante
    FROM public.estudiantes e
    JOIN public.inscripciones ins ON ins.estudiante_id = e.id
    WHERE ins.catedra_id = p_catedra_id
      AND REGEXP_REPLACE(e.dni, '[^0-9]', '', 'g') = v_clean_dni
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'ESTUDIANTE_NO_ENCONTRADO',
            'message', 'No se encontró ningún estudiante inscripto con el DNI ingresado en esta materia.'
        );
    END IF;

    -- Obtener criterios de evaluación
    SELECT * INTO v_criterios
    FROM public.criterios_evaluacion
    WHERE catedra_id = p_catedra_id;

    -- Estructura base de respuesta
    v_result := jsonb_build_object(
        'success', true,
        'catedra', jsonb_build_object(
            'id', v_catedra.id,
            'nombre', v_catedra.nombre,
            'nivel', v_catedra.nivel,
            'modalidad', v_catedra.modalidad,
            'institucion_nombre', COALESCE(v_catedra.institucion_nombre, 'Institución Educativa')
        ),
        'estudiante', jsonb_build_object(
            'id', v_estudiante.id,
            'dni', v_estudiante.dni,
            'apellido', v_estudiante.apellido,
            'nombre', v_estudiante.nombre
        ),
        'config', jsonb_build_object(
            'portal_mostrar_asistencia', v_catedra.portal_mostrar_asistencia,
            'portal_mostrar_notas', v_catedra.portal_mostrar_notas,
            'portal_mostrar_condicion', v_catedra.portal_mostrar_condicion
        )
    );

    -- 1. Calcular Asistencias (si está habilitado)
    IF v_catedra.portal_mostrar_asistencia OR v_catedra.portal_mostrar_condicion THEN
        SELECT COUNT(*) INTO v_total_clases
        FROM public.clases
        WHERE catedra_id = p_catedra_id;

        -- Descontar inasistencias docentes
        SELECT COUNT(*) INTO v_clases_licencia
        FROM public.inasistencias_docente
        WHERE catedra_id = p_catedra_id;

        v_clases_efectivas := GREATEST(0, v_total_clases - v_clases_licencia);

        IF v_clases_efectivas > 0 THEN
            SELECT 
                COUNT(*) FILTER (WHERE a.estado = 'PRESENTE'),
                COUNT(*) FILTER (WHERE a.estado = 'AUSENTE')
            INTO v_presentes, v_ausentes
            FROM public.asistencias a
            JOIN public.clases cl ON cl.id = a.clase_id
            WHERE cl.catedra_id = p_catedra_id
              AND a.estudiante_id = v_estudiante.id;

            v_asistencia_pct := ROUND(((v_presentes::NUMERIC / v_clases_efectivas::NUMERIC) * 100), 1);
        ELSE
            v_asistencia_pct := 100.00;
        END IF;

        IF v_catedra.portal_mostrar_asistencia THEN
            v_result := v_result || jsonb_build_object(
                'asistencia', jsonb_build_object(
                    'total_clases', v_clases_efectivas,
                    'presentes', v_presentes,
                    'ausentes', v_ausentes,
                    'porcentaje', v_asistencia_pct,
                    'min_asist_reg', COALESCE(v_criterios.min_asist_reg, 70),
                    'min_asist_promo', COALESCE(v_criterios.min_asist_promo, 80)
                )
            );
        END IF;
    END IF;

    -- 2. Obtener Calificaciones (si está habilitado)
    IF v_catedra.portal_mostrar_notas OR v_catedra.portal_mostrar_condicion THEN
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', ev.id,
                'titulo', ev.titulo,
                'tipo', ev.tipo,
                'fecha_entrega', ev.fecha_entrega,
                'valor', n.valor
            ) ORDER BY ev.created_at ASC
        ), '[]'::jsonb)
        INTO v_evaluaciones
        FROM public.evaluaciones ev
        LEFT JOIN public.notas n ON n.evaluacion_id = ev.id AND n.estudiante_id = v_estudiante.id
        WHERE ev.catedra_id = p_catedra_id;

        IF v_catedra.portal_mostrar_notas THEN
            v_result := v_result || jsonb_build_object(
                'evaluaciones', v_evaluaciones
            );
        END IF;
    END IF;

    RETURN v_result;
END;
$function$
;

-- Función: consultar_estado_estudiante
CREATE OR REPLACE FUNCTION public.consultar_estado_estudiante(p_catedra_id uuid, p_dni text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions, pg_temp
AS $function$
DECLARE
    v_catedra RECORD;
    v_estudiante RECORD;
    v_total_clases INT := 0;
    v_presentes INT := 0;
    v_porcentaje_asistencia NUMERIC := NULL;
    v_notas JSON := '[]'::json;
    v_condicion TEXT := NULL;
BEGIN
    -- 1. Verificar si la cátedra tiene el portal activado y obtener sus preferencias
    SELECT id, nombre, portal_activo, portal_mostrar_asistencia, portal_mostrar_notas, portal_mostrar_condicion
    INTO v_catedra
    FROM public.catedras
    WHERE id = p_catedra_id;

    IF v_catedra.id IS NULL THEN
        RETURN json_build_object('valido', false, 'mensaje', 'Cátedra no encontrada.');
    END IF;

    IF NOT COALESCE(v_catedra.portal_activo, false) THEN
        RETURN json_build_object('valido', false, 'mensaje', 'El portal de consultas para esta cátedra se encuentra pausado por el docente.');
    END IF;

    -- 2. Validar que el estudiante pertenezca a la cátedra por DNI
    SELECT e.id, e.nombre, e.apellido
    INTO v_estudiante
    FROM public.estudiantes e
    JOIN public.inscripciones i ON i.estudiante_id = e.id
    WHERE i.catedra_id = p_catedra_id AND e.dni = p_dni;

    IF v_estudiante.id IS NULL THEN
        RETURN json_build_object('valido', false, 'mensaje', 'El DNI ingresado no está registrado en esta cátedra.');
    END IF;

    -- 3. Calcular Asistencia (si el docente lo habilitó)
    IF v_catedra.portal_mostrar_asistencia THEN
        SELECT count(*) INTO v_total_clases FROM public.clases WHERE catedra_id = p_catedra_id;
        SELECT count(*) INTO v_presentes FROM public.asistencias a
        JOIN public.clases c ON c.id = a.clase_id
        WHERE c.catedra_id = p_catedra_id AND a.estudiante_id = v_estudiante.id AND a.estado = 'PRESENTE';

        v_porcentaje_asistencia := CASE 
            WHEN v_total_clases > 0 THEN round((v_presentes::numeric / v_total_clases::numeric) * 100, 1)
            ELSE 100 
        END;
    END IF;

    -- 4. Obtener Notas (si el docente lo habilitó)
    IF v_catedra.portal_mostrar_notas THEN
        SELECT COALESCE(json_agg(json_build_object(
            'evaluacion', ev.titulo,
            'tipo', ev.tipo,
            'nota', n.valor
        ) ORDER BY ev.created_at ASC), '[]'::json)
        INTO v_notas
        FROM public.evaluaciones ev
        LEFT JOIN public.notas n ON n.evaluacion_id = ev.id AND n.estudiante_id = v_estudiante.id
        WHERE ev.catedra_id = p_catedra_id;
    END IF;

    -- 5. Respuesta JSON adaptada al criterio configurado
    RETURN json_build_object(
        'valido', true,
        'materia', v_catedra.nombre,
        'estudiante', v_estudiante.nombre || ' ' || v_estudiante.apellido,
        'mostrar_asistencia', v_catedra.portal_mostrar_asistencia,
        'total_clases', v_total_clases,
        'asistencias_presentes', v_presentes,
        'porcentaje_asistencia', v_porcentaje_asistencia,
        'mostrar_notas', v_catedra.portal_mostrar_notas,
        'notas', v_notas,
        'mostrar_condicion', v_catedra.portal_mostrar_condicion
    );
END;
$function$
;

-- Función: es_superadmin
CREATE OR REPLACE FUNCTION public.es_superadmin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions, pg_temp
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE id = auth.uid() AND rol = 'superadmin'
    );
END;
$function$
;

-- Función: get_alumnos_elegibles_mesa
CREATE OR REPLACE FUNCTION public.get_alumnos_elegibles_mesa(p_catedra_id uuid, p_condicion_acta text)
 RETURNS TABLE(estudiante_id uuid, nombre text, apellido text, dni text, ciclo_nombre text, ciclo_anio integer, estado_cursada text, intentos_previos bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions, pg_temp
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        e.id AS estudiante_id,
        e.nombre,
        e.apellido,
        e.dni,
        COALESCE(cl.nombre, 'Sin Ciclo') AS ciclo_nombre,
        COALESCE(cl.anio, 2026) AS ciclo_anio,
        COALESCE(i.estado_academico, 'CURSANDO') AS estado_cursada,
        (SELECT count(*) FROM public.actas_examen_detalle aed 
         WHERE aed.estudiante_id = e.id AND aed.catedra_id = p_catedra_id AND aed.resultado = 'DESAPROBADO') AS intentos_previos
    FROM public.estudiantes e
    JOIN public.inscripciones i ON i.estudiante_id = e.id
    LEFT JOIN public.ciclos_lectivos cl ON cl.id = i.ciclo_id
    WHERE i.catedra_id = p_catedra_id
      AND COALESCE(i.estado_academico, '') != 'ACREDITADO'
    ORDER BY e.apellido ASC, e.nombre ASC;
END;
$function$
;

-- Función: guardar_acta_examen_lote
CREATE OR REPLACE FUNCTION public.guardar_acta_examen_lote(p_mesa_id uuid, p_catedra_id uuid, p_filas jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions, pg_temp
AS $function$
DECLARE
    v_item JSONB;
    v_total INT := 0;
BEGIN
    -- Validar permisos
    IF NOT (public.es_superadmin() OR EXISTS (SELECT 1 FROM public.mesas_examen WHERE id = p_mesa_id AND docente_id = auth.uid())) THEN
        RAISE EXCEPTION 'Acceso denegado a la mesa de examen';
    END IF;

    -- Iterar e insertar/actualizar cada registro
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_filas)
    LOOP
        INSERT INTO public.actas_examen_detalle (
            mesa_id,
            estudiante_id,
            catedra_id,
            condicion_al_rendir,
            nota_escrito,
            nota_oral,
            nota_definitiva,
            resultado,
            observaciones
        ) VALUES (
            p_mesa_id,
            (v_item->>'estudiante_id')::UUID,
            p_catedra_id,
            v_item->>'condicion_al_rendir',
            NULLIF(v_item->>'nota_escrito', '')::NUMERIC,
            NULLIF(v_item->>'nota_oral', '')::NUMERIC,
            NULLIF(v_item->>'nota_definitiva', '')::NUMERIC,
            v_item->>'resultado',
            v_item->>'observaciones'
        )
        ON CONFLICT (mesa_id, estudiante_id) DO UPDATE SET
            condicion_al_rendir = EXCLUDED.condicion_al_rendir,
            nota_escrito = EXCLUDED.nota_escrito,
            nota_oral = EXCLUDED.nota_oral,
            nota_definitiva = EXCLUDED.nota_definitiva,
            resultado = EXCLUDED.resultado,
            observaciones = EXCLUDED.observaciones;

        -- Si aprobó / acreditó, actualizar inscripción
        IF v_item->>'resultado' = 'ACREDITADO' THEN
            UPDATE public.inscripciones
            SET estado_academico = 'ACREDITADO',
                nota_final_acreditacion = NULLIF(v_item->>'nota_definitiva', '')::NUMERIC,
                fecha_acreditacion = NOW()
            WHERE estudiante_id = (v_item->>'estudiante_id')::UUID
              AND catedra_id = p_catedra_id;
        END IF;

        v_total := v_total + 1;
    END LOOP;

    RETURN json_build_object('success', true, 'procesados', v_total);
END;
$function$
;

-- Función: handle_new_catedra
CREATE OR REPLACE FUNCTION public.handle_new_catedra()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions, pg_temp
AS $function$
BEGIN
    INSERT INTO public.criterios_evaluacion (catedra_id)
    VALUES (new.id);
    RETURN NEW;
END;
$function$
;

-- Función: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions, pg_temp
AS $function$
BEGIN
    INSERT INTO public.perfiles (id, email, nombre, rol)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Docente'),
        'docente'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
    RETURN NEW;
END;
$function$
;

-- Función: registrar_resultado_examen
CREATE OR REPLACE FUNCTION public.registrar_resultado_examen(p_mesa_id uuid, p_estudiante_id uuid, p_catedra_id uuid, p_ciclo_id uuid, p_condicion text, p_nota_escrito numeric, p_nota_oral numeric, p_nota_definitiva numeric, p_resultado text, p_observaciones text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions, pg_temp
AS $function$
BEGIN
    -- 1. Insertar / Actualizar en el acta de la mesa
    INSERT INTO public.actas_examen_detalle (
        mesa_id, estudiante_id, catedra_id, condicion_al_rendir,
        nota_escrito, nota_oral, nota_definitiva, resultado, observaciones
    ) VALUES (
        p_mesa_id, p_estudiante_id, p_catedra_id, p_condicion,
        p_nota_escrito, p_nota_oral, p_nota_definitiva, p_resultado, p_observaciones
    )
    ON CONFLICT (mesa_id, estudiante_id) DO UPDATE SET
        nota_escrito = EXCLUDED.nota_escrito,
        nota_oral = EXCLUDED.nota_oral,
        nota_definitiva = EXCLUDED.nota_definitiva,
        resultado = EXCLUDED.resultado,
        observaciones = EXCLUDED.observaciones;

    -- 2. Si ACREDITÓ (Aprobó), actualizar inscripción general a 'ACREDITADO'
    IF p_resultado = 'ACREDITADO' THEN
        UPDATE public.inscripciones
        SET estado_academico = 'ACREDITADO',
            nota_final_acreditacion = p_nota_definitiva,
            fecha_acreditacion = NOW()
        WHERE estudiante_id = p_estudiante_id 
          AND catedra_id = p_catedra_id;
    END IF;
END;
$function$
;

-- Función: rls_auto_enable
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions, pg_temp
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

-- Función: set_institucion_activa
CREATE OR REPLACE FUNCTION public.set_institucion_activa(p_inst_id uuid, p_docente_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, extensions, pg_temp
AS $function$
BEGIN
    UPDATE public.instituciones 
    SET activa = (id = p_inst_id)
    WHERE docente_id = p_docente_id;
END;
$function$
;

NOTIFY pgrst, 'reload schema';
