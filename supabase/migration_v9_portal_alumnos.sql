-- ==============================================================================
-- MIGRACIÓN V9: PORTAL PÚBLICO DE CONSULTA PARA ALUMNOS CON CONTROL GRANULAR
-- ==============================================================================

-- 1. Agregar columnas de configuración granular del portal en 'catedras'
ALTER TABLE public.catedras 
ADD COLUMN IF NOT EXISTS portal_activo BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS portal_mostrar_asistencia BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS portal_mostrar_notas BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS portal_mostrar_condicion BOOLEAN NOT NULL DEFAULT true;

-- 2. Índices para acelerar búsquedas públicas y validaciones
CREATE INDEX IF NOT EXISTS idx_catedras_portal_activo ON public.catedras (id) WHERE portal_activo = true;
CREATE INDEX IF NOT EXISTS idx_estudiantes_dni_clean ON public.estudiantes (dni);

-- 3. Políticas RLS: Permitir lectura pública de metadatos básicos de cátedras activas
DROP POLICY IF EXISTS "public_read_active_catedras" ON public.catedras;
CREATE POLICY "public_read_active_catedras" ON public.catedras
FOR SELECT TO anon, authenticated
USING (portal_activo = true);

DROP POLICY IF EXISTS "public_read_instituciones_active_catedras" ON public.instituciones;
CREATE POLICY "public_read_instituciones_active_catedras" ON public.instituciones
FOR SELECT TO anon, authenticated
USING (id IN (SELECT institucion_id FROM public.catedras WHERE portal_activo = true));

-- 4. Función RPC Segura (SECURITY DEFINER): Consulta personal por DNI
-- Garantiza privacidad absoluta: ningún alumno puede consultar datos de otros
CREATE OR REPLACE FUNCTION public.consultar_estado_alumno(
    p_catedra_id UUID,
    p_dni TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
