-- ==============================================================================
-- MIGRACIÓN V12: MÓDULO INDEPENDIENTE DE MESAS DE EXAMEN & ACTAS DE ACREDITACIÓN
-- ==============================================================================

-- 1. Ampliar tabla MESAS_EXAMEN con la condición reglamentaria del acta
ALTER TABLE public.mesas_examen
ADD COLUMN IF NOT EXISTS condicion_acta TEXT NOT NULL DEFAULT 'REGULAR' 
CHECK (condicion_acta IN ('PROMOCIONAL', 'REGULAR', 'LIBRE'));

-- Compatibilizar tipo_mesa previo con condicion_acta si existe
UPDATE public.mesas_examen 
SET condicion_acta = 'PROMOCIONAL' 
WHERE (tipo_mesa = 'PROMOCIONAL' OR turno_llamado ILIKE '%PROMOCION%') AND condicion_acta = 'REGULAR';

-- 2. RPC: get_alumnos_elegibles_mesa
-- Obtiene la nómina de estudiantes históricos y actuales de la cátedra que aún no
-- han acreditado la materia, calculando los intentos previos desaprobados y cohorte.
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
          OR (p_condicion_acta = 'LIBRE') -- En acta de libres pueden presentarse libres o regulares caídos
      )
    ORDER BY e.apellido ASC, e.nombre ASC;
END;
$$;

-- Otorgar permisos de ejecución para usuarios autenticados
GRANT EXECUTE ON FUNCTION public.get_alumnos_elegibles_mesa(UUID, TEXT) TO authenticated, anon;
