-- ==============================================================================
-- MIGRACIÓN V13: BLINDAJE DE NÓMINA DE ALUMNOS, COMPATIBILIDAD DE ACTAS Y QA SUITE
-- ==============================================================================

-- 1. Asegurar compatibilidad de columnas de calificación final en INSCRIPCIONES
ALTER TABLE public.inscripciones
ADD COLUMN IF NOT EXISTS nota_final_acreditacion NUMERIC(4,2),
ADD COLUMN IF NOT EXISTS nota_final NUMERIC(4,2),
ADD COLUMN IF NOT EXISTS estado_academico TEXT NOT NULL DEFAULT 'CURSANDO',
ADD COLUMN IF NOT EXISTS fecha_acreditacion TIMESTAMPTZ;

-- Sincronizar valores existentes entre nota_final y nota_final_acreditacion
UPDATE public.inscripciones
SET nota_final_acreditacion = nota_final
WHERE nota_final_acreditacion IS NULL AND nota_final IS NOT NULL;

UPDATE public.inscripciones
SET nota_final = nota_final_acreditacion
WHERE nota_final IS NULL AND nota_final_acreditacion IS NOT NULL;

-- 2. Asegurar índice único compuesto para alta/matriculación segura (Upsert)
CREATE UNIQUE INDEX IF NOT EXISTS estudiantes_docente_id_dni_idx 
ON public.estudiantes (docente_id, dni);

-- 3. Vista de compatibilidad: actas_examen_detalle
-- Permite consultar el historial de actas con esquema unificado sin romper joins
CREATE OR REPLACE VIEW public.actas_examen_detalle AS
SELECT 
    a.id,
    a.mesa_id,
    m.catedra_id,
    a.estudiante_id,
    a.alumno_nombre_completo,
    a.alumno_dni,
    a.condicion_previa,
    a.nota_escrito,
    a.nota_oral,
    a.nota_definitiva,
    a.dictamen AS resultado,
    a.observaciones,
    a.created_at,
    a.updated_at
FROM public.actas_examen_alumnos a
JOIN public.mesas_examen m ON a.mesa_id = m.id;

-- Conceder permisos de lectura a la vista
GRANT SELECT ON public.actas_examen_detalle TO authenticated, anon;

-- 4. Asegurar función RPC get_alumnos_elegibles_mesa con permisos
CREATE OR REPLACE FUNCTION public.get_alumnos_elegibles_mesa(
    p_catedra_id UUID,
    p_condicion_acta TEXT DEFAULT 'TODOS'
)
RETURNS TABLE (
    estudiante_id UUID,
    dni TEXT,
    apellido TEXT,
    nombre TEXT,
    condicion TEXT,
    estado_academico TEXT,
    ciclo_anio INT,
    intentos_desaprobados INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id AS estudiante_id,
        e.dni::TEXT,
        e.apellido::TEXT,
        e.nombre::TEXT,
        COALESCE(i.condicion, 'REGULAR')::TEXT AS condicion,
        COALESCE(i.estado_academico, 'CURSANDO')::TEXT AS estado_academico,
        COALESCE(cl.anio, EXTRACT(YEAR FROM i.created_at)::INT)::INT AS ciclo_anio,
        (
            SELECT COUNT(*)::INT 
            FROM public.actas_examen_alumnos a
            JOIN public.mesas_examen m ON a.mesa_id = m.id
            WHERE m.catedra_id = p_catedra_id 
              AND (a.estudiante_id = e.id OR (a.alumno_dni IS NOT NULL AND a.alumno_dni = e.dni))
              AND a.dictamen = 'DESAPROBADO'
        ) AS intentos_desaprobados
    FROM public.inscripciones i
    JOIN public.estudiantes e ON i.estudiante_id = e.id
    LEFT JOIN public.ciclos_lectivos cl ON i.ciclo_id = cl.id
    WHERE i.catedra_id = p_catedra_id
      AND (i.estado_academico IS NULL OR i.estado_academico != 'ACREDITADO')
      AND (
          p_condicion_acta IS NULL 
          OR p_condicion_acta = 'TODOS'
          OR (p_condicion_acta = 'PROMOCIONAL' AND (i.condicion = 'PROMOCIONAL' OR i.estado_academico = 'PROMOCIONAL'))
          OR (p_condicion_acta = 'REGULAR' AND (i.condicion = 'REGULAR' OR i.estado_academico = 'REGULAR'))
          OR (p_condicion_acta = 'LIBRE')
      )
    ORDER BY e.apellido ASC, e.nombre ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_alumnos_elegibles_mesa(UUID, TEXT) TO authenticated, anon;
