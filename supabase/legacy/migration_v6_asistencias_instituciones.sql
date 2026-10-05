-- ==============================================================================
-- MIGRACIÓN V6: SOPORTE ASISTENCIAS JUSTIFICADAS Y GESTIÓN DE INSTITUCIÓN ACTIVA
-- ==============================================================================

-- 1. Ampliar el CHECK de asistencias para permitir 'JUSTIFICADA' y 'TARDANZA'
ALTER TABLE public.asistencias DROP CONSTRAINT IF EXISTS asistencias_estado_check;
ALTER TABLE public.asistencias ADD CONSTRAINT asistencias_estado_check 
CHECK (estado IN ('PRESENTE', 'AUSENTE', 'JUSTIFICADA', 'TARDANZA'));

-- 2. Asegurar que 'instituciones' cuente con la columna 'activa'
ALTER TABLE public.instituciones 
ADD COLUMN IF NOT EXISTS activa BOOLEAN DEFAULT false;

-- 3. Función RPC set_institucion_activa
CREATE OR REPLACE FUNCTION public.set_institucion_activa(p_institucion_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Desactivar todas las instituciones del docente propietario
    UPDATE public.instituciones
    SET activa = false
    WHERE docente_id = (SELECT docente_id FROM public.instituciones WHERE id = p_institucion_id);

    -- Marcar la seleccionada como activa
    UPDATE public.instituciones
    SET activa = true
    WHERE id = p_institucion_id;
END;
$$;
