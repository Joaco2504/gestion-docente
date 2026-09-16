-- ==============================================================================
-- MIGRACIÓN V14: RPC GUARDAR_ACTA_EXAMEN_LOTE & ACREDITACIÓN EN INSCRIPCIONES
-- ==============================================================================

-- Función RPC para asentar en lote todas las calificaciones de una mesa de examen
-- y actualizar atómicamente la acreditación de los alumnos aprobados en inscripciones.
CREATE OR REPLACE FUNCTION public.guardar_acta_examen_lote(
    p_mesa_id UUID,
    p_catedra_id UUID,
    p_filas JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_fila JSONB;
    v_id UUID;
    v_raw_id TEXT;
    v_estudiante_id UUID;
    v_nombre TEXT;
    v_dni TEXT;
    v_condicion TEXT;
    v_escrito NUMERIC(4,2);
    v_oral NUMERIC(4,2);
    v_definitiva NUMERIC(4,2);
    v_dictamen TEXT;
    v_obs TEXT;
    v_count INT := 0;
    v_acreditados INT := 0;
BEGIN
    IF p_filas IS NULL OR jsonb_array_length(p_filas) = 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'No se enviaron filas para procesar',
            'count', 0,
            'acreditados', 0
        );
    END IF;

    FOR v_fila IN SELECT * FROM jsonb_array_elements(p_filas)
    LOOP
        v_raw_id := v_fila->>'id';
        
        -- Validar si v_raw_id es un UUID válido (evitar colisión con temp-xxx)
        IF v_raw_id IS NOT NULL AND v_raw_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            v_id := v_raw_id::UUID;
        ELSE
            v_id := NULL;
        END IF;

        IF (v_fila->>'estudiante_id') IS NOT NULL AND (v_fila->>'estudiante_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            v_estudiante_id := (v_fila->>'estudiante_id')::UUID;
        ELSE
            v_estudiante_id := NULL;
        END IF;

        v_nombre := COALESCE(v_fila->>'alumno_nombre_completo', '');
        v_dni := COALESCE(v_fila->>'alumno_dni', '');
        v_condicion := COALESCE(v_fila->>'condicion_previa', 'REGULAR');
        
        v_escrito := CASE WHEN (v_fila->>'nota_escrito') IS NOT NULL AND (v_fila->>'nota_escrito') != '' 
                          THEN (v_fila->>'nota_escrito')::NUMERIC(4,2) 
                          ELSE NULL END;
        v_oral := CASE WHEN (v_fila->>'nota_oral') IS NOT NULL AND (v_fila->>'nota_oral') != '' 
                       THEN (v_fila->>'nota_oral')::NUMERIC(4,2) 
                       ELSE NULL END;
        v_definitiva := CASE WHEN (v_fila->>'nota_definitiva') IS NOT NULL AND (v_fila->>'nota_definitiva') != '' 
                             THEN (v_fila->>'nota_definitiva')::NUMERIC(4,2) 
                             ELSE NULL END;
        
        v_dictamen := COALESCE(v_fila->>'dictamen', 'AUSENTE');
        v_obs := COALESCE(v_fila->>'observaciones', '');

        -- 1. Intentar actualizar por ID existente si es UUID válido
        IF v_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.actas_examen_alumnos WHERE id = v_id) THEN
            UPDATE public.actas_examen_alumnos
            SET 
                nota_escrito = v_escrito,
                nota_oral = v_oral,
                nota_definitiva = v_definitiva,
                dictamen = v_dictamen,
                condicion_previa = v_condicion,
                observaciones = v_obs,
                alumno_nombre_completo = v_nombre,
                alumno_dni = v_dni
            WHERE id = v_id;
        ELSE
            -- 2. Si no existe por ID, verificar si ya existe en esta mesa por estudiante_id o DNI
            IF v_estudiante_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.actas_examen_alumnos WHERE mesa_id = p_mesa_id AND estudiante_id = v_estudiante_id) THEN
                UPDATE public.actas_examen_alumnos
                SET 
                    nota_escrito = v_escrito,
                    nota_oral = v_oral,
                    nota_definitiva = v_definitiva,
                    dictamen = v_dictamen,
                    condicion_previa = v_condicion,
                    observaciones = v_obs,
                    alumno_nombre_completo = v_nombre,
                    alumno_dni = v_dni
                WHERE mesa_id = p_mesa_id AND estudiante_id = v_estudiante_id;
            ELSE
                -- 3. Insertar nuevo registro
                INSERT INTO public.actas_examen_alumnos (
                    id,
                    mesa_id,
                    estudiante_id,
                    alumno_nombre_completo,
                    alumno_dni,
                    condicion_previa,
                    nota_escrito,
                    nota_oral,
                    nota_definitiva,
                    dictamen,
                    observaciones
                ) VALUES (
                    COALESCE(v_id, gen_random_uuid()),
                    p_mesa_id,
                    v_estudiante_id,
                    v_nombre,
                    v_dni,
                    v_condicion,
                    v_escrito,
                    v_oral,
                    v_definitiva,
                    v_dictamen,
                    v_obs
                );
            END IF;
        END IF;

        v_count := v_count + 1;

        -- 4. Si el dictamen es ACREDITADO o APROBADO, actualizar la inscripción
        IF v_dictamen IN ('ACREDITADO', 'APROBADO') AND v_estudiante_id IS NOT NULL AND p_catedra_id IS NOT NULL THEN
            UPDATE public.inscripciones
            SET 
                estado_academico = 'ACREDITADO',
                nota_final_acreditacion = v_definitiva,
                nota_final = v_definitiva,
                fecha_acreditacion = NOW()
            WHERE estudiante_id = v_estudiante_id AND catedra_id = p_catedra_id;

            v_acreditados := v_acreditados + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Acta procesada con éxito',
        'count', v_count,
        'acreditados', v_acreditados
    );
END;
$$;

-- Otorgar permisos de ejecución para usuarios autenticados y anónimos (si aplica)
GRANT EXECUTE ON FUNCTION public.guardar_acta_examen_lote(UUID, UUID, JSONB) TO authenticated, anon;
