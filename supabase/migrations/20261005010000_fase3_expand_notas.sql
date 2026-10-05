-- ====================================================================
-- FASE 3.1: UNIFICACIÓN Y EXPAND/SYNC EN TABLA NOTAS
-- ====================================================================

-- 1. Backfill inicial para sincronizar columnas existentes
UPDATE public.notas
SET 
    valor = COALESCE(valor, nota, calificacion),
    nota = COALESCE(valor, nota, calificacion),
    calificacion = COALESCE(valor, nota, calificacion)
WHERE valor IS DISTINCT FROM nota OR valor IS DISTINCT FROM calificacion;

-- 2. Asegurar regla de negocio en datos históricos:
-- Si estado != 'CALIFICADO', la nota/valor debe ser NULL
UPDATE public.notas
SET 
    valor = NULL,
    nota = NULL,
    calificacion = NULL
WHERE estado IN ('NO_ENTREGO', 'AUSENTE') AND (valor IS NOT NULL OR nota IS NOT NULL OR calificacion IS NOT NULL);

-- 3. Función y Trigger de dual-write y sincronización automática
CREATE OR REPLACE FUNCTION public.sync_notas_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    -- Regla de consistencia: si el estado es NO_ENTREGO o AUSENTE, la nota numérica DEBE ser NULL
    IF NEW.estado IN ('NO_ENTREGO', 'AUSENTE') THEN
        NEW.valor := NULL;
        NEW.nota := NULL;
        NEW.calificacion := NULL;
    ELSE
        -- Si viene valor (columna canónica elegida por menor costo), sincronizar hacia legacy
        IF NEW.valor IS NOT NULL THEN
            NEW.nota := NEW.valor;
            NEW.calificacion := NEW.valor;
        -- Si un cliente legado envía 'nota' pero 'valor' es NULL
        ELSIF NEW.nota IS NOT NULL THEN
            NEW.valor := NEW.nota;
            NEW.calificacion := NEW.nota;
        -- Si un cliente legado envía 'calificacion'
        ELSIF NEW.calificacion IS NOT NULL THEN
            NEW.valor := NEW.calificacion;
            NEW.nota := NEW.calificacion;
        END IF;
    END IF;

    -- Si estado no fue provisto pero hay un valor numérico, asumir CALIFICADO
    IF NEW.estado IS NULL AND NEW.valor IS NOT NULL THEN
        NEW.estado := 'CALIFICADO';
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_notas_columns ON public.notas;
CREATE TRIGGER trg_sync_notas_columns
BEFORE INSERT OR UPDATE ON public.notas
FOR EACH ROW EXECUTE FUNCTION public.sync_notas_columns();

-- 4. Constraint de consistencia en PostgreSQL
ALTER TABLE public.notas DROP CONSTRAINT IF EXISTS check_notas_consistencia_estado;
ALTER TABLE public.notas ADD CONSTRAINT check_notas_consistencia_estado
    CHECK (
        (estado = 'CALIFICADO' AND valor IS NOT NULL)
        OR (estado IN ('NO_ENTREGO', 'AUSENTE') AND valor IS NULL)
        OR (estado IS NULL)
    );
