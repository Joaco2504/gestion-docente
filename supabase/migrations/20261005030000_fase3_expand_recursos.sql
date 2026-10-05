-- ====================================================================
-- FASE 3.3: UNIFICACIÓN Y EXPAND/SYNC EN TABLA RECURSOS
-- ====================================================================

-- 1. Agregar columnas faltantes en public.recursos
ALTER TABLE public.recursos 
    ADD COLUMN IF NOT EXISTS url text,
    ADD COLUMN IF NOT EXISTS tipo text,
    ADD COLUMN IF NOT EXISTS visible_alumnos boolean NOT NULL DEFAULT true;

-- 2. Backfill para sincronizar columnas existentes
UPDATE public.recursos
SET 
    url = COALESCE(url, url_o_path),
    url_o_path = COALESCE(url_o_path, url),
    tipo = COALESCE(tipo, tipo_origen),
    tipo_origen = COALESCE(tipo_origen, tipo),
    visible_alumnos = COALESCE(visible_alumnos, true);

-- 3. Trigger de sincronización bi-direccional entre campos de ubicación y tipo
CREATE OR REPLACE FUNCTION public.sync_recursos_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    -- Sincronización de ubicación: url_o_path (canónica) <-> url (compatibilidad)
    IF NEW.url_o_path IS NOT NULL THEN
        NEW.url := NEW.url_o_path;
    ELSIF NEW.url IS NOT NULL THEN
        NEW.url_o_path := NEW.url;
    END IF;

    -- Sincronización y normalización de tipo de origen
    IF NEW.tipo_origen IS NOT NULL THEN
        NEW.tipo := NEW.tipo_origen;
    ELSIF NEW.tipo IS NOT NULL THEN
        -- Normalizar variantes que envía el frontend
        IF UPPER(NEW.tipo) IN ('DRIVE', 'ENLACE', 'URL', 'GOOGLE_LINK') THEN
            NEW.tipo_origen := 'GOOGLE_LINK';
            NEW.tipo := 'GOOGLE_LINK';
        ELSIF UPPER(NEW.tipo) IN ('LOCAL', 'ARCHIVO') THEN
            NEW.tipo_origen := 'LOCAL';
            NEW.tipo := 'LOCAL';
        ELSE
            NEW.tipo_origen := 'GOOGLE_LINK';
        END IF;
    END IF;

    -- Garantizar valor booleano en visible_alumnos
    IF NEW.visible_alumnos IS NULL THEN
        NEW.visible_alumnos := true;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_recursos_columns ON public.recursos;
CREATE TRIGGER trg_sync_recursos_columns
BEFORE INSERT OR UPDATE ON public.recursos
FOR EACH ROW EXECUTE FUNCTION public.sync_recursos_columns();
