-- ==============================================================================
-- MIGRACIÓN V11: CIERRE DE CURSADO, MESAS DE EXAMEN Y ACREDITACIÓN ESTUDIANTIL
-- ==============================================================================

-- 1. Ampliar tabla CÁTEDRAS con banderas de cierre de cursada
ALTER TABLE public.catedras
ADD COLUMN IF NOT EXISTS cursada_finalizada BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS fecha_cierre_cursada TIMESTAMPTZ;

-- 2. Ampliar tabla MESAS_EXAMEN con tipo de mesa (FINAL u ORDINARIA vs PROMOCIONAL)
ALTER TABLE public.mesas_examen
ADD COLUMN IF NOT EXISTS tipo_mesa TEXT NOT NULL DEFAULT 'FINAL' CHECK (tipo_mesa IN ('FINAL', 'PROMOCIONAL'));

-- 3. Ampliar tabla INSCRIPCIONES con estado académico de acreditación y nota definitiva
ALTER TABLE public.inscripciones
ADD COLUMN IF NOT EXISTS estado_academico TEXT NOT NULL DEFAULT 'CURSANDO' CHECK (estado_academico IN ('CURSANDO', 'REGULAR', 'PROMOCIONAL', 'LIBRE', 'ACREDITADO')),
ADD COLUMN IF NOT EXISTS nota_final NUMERIC(4,2),
ADD COLUMN IF NOT EXISTS fecha_acreditacion TIMESTAMPTZ;

-- 4. RPC: registrar_resultado_examen
-- Permite asentar de forma atómica la calificación en el acta de examen y actualizar la acreditación del estudiante
CREATE OR REPLACE FUNCTION public.registrar_resultado_examen(
    p_acta_alumno_id UUID,
    p_mesa_id UUID,
    p_estudiante_id UUID,
    p_alumno_nombre_completo TEXT,
    p_alumno_dni TEXT,
    p_condicion_previa TEXT,
    p_nota_escrito NUMERIC,
    p_nota_oral NUMERIC,
    p_nota_definitiva NUMERIC,
    p_dictamen TEXT,
    p_observaciones TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_catedra_id UUID;
    v_result_id UUID;
BEGIN
    -- Obtener la cátedra asociada a la mesa
    SELECT catedra_id INTO v_catedra_id
    FROM public.mesas_examen
    WHERE id = p_mesa_id;

    -- Upsert en actas_examen_alumnos
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
        COALESCE(p_acta_alumno_id, gen_random_uuid()),
        p_mesa_id,
        p_estudiante_id,
        p_alumno_nombre_completo,
        p_alumno_dni,
        p_condicion_previa,
        p_nota_escrito,
        p_nota_oral,
        p_nota_definitiva,
        p_dictamen,
        p_observaciones
    )
    ON CONFLICT (id) DO UPDATE SET
        nota_escrito = EXCLUDED.nota_escrito,
        nota_oral = EXCLUDED.nota_oral,
        nota_definitiva = EXCLUDED.nota_definitiva,
        dictamen = EXCLUDED.dictamen,
        condicion_previa = EXCLUDED.condicion_previa,
        observaciones = EXCLUDED.observaciones
    RETURNING id INTO v_result_id;

    -- Si el dictamen es ACREDITADO o APROBADO y tenemos estudiante y cátedra, marcar como ACREDITADO
    IF (p_dictamen IN ('ACREDITADO', 'APROBADO')) AND p_estudiante_id IS NOT NULL AND v_catedra_id IS NOT NULL THEN
        UPDATE public.inscripciones
        SET estado_academico = 'ACREDITADO',
            nota_final = p_nota_definitiva,
            fecha_acreditacion = NOW()
        WHERE estudiante_id = p_estudiante_id AND catedra_id = v_catedra_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'acta_alumno_id', v_result_id,
        'dictamen', p_dictamen
    );
END;
$$;
