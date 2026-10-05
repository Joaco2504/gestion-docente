-- ==============================================================================
-- ACTUALIZACIÓN DE RESTRICCIÓN CHECK PARA MODALIDAD DE CÁTEDRAS
-- Permite especificar explícitamente '1° CUATRIMESTRE' y '2° CUATRIMESTRE'
-- ==============================================================================

DO $$
BEGIN
    -- 1. Eliminar la restricción previa si existe
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'catedras_modalidad_check' 
          AND table_name = 'catedras'
    ) THEN
        ALTER TABLE catedras DROP CONSTRAINT catedras_modalidad_check;
    END IF;

    -- 2. Agregar la nueva restricción que admite 1° y 2° Cuatrimestre
    ALTER TABLE catedras ADD CONSTRAINT catedras_modalidad_check 
        CHECK (modalidad IN ('ANUAL', 'CUATRIMESTRAL', '1° CUATRIMESTRE', '2° CUATRIMESTRE'));
END $$;
