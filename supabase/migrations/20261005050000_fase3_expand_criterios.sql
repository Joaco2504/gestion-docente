-- Migration: 20261005050000_fase3_expand_criterios.sql
-- Fase 3: Expand catedras (ram_asistencia_*) vs criterios_evaluacion (min_asist_*)
-- Canonical: public.criterios_evaluacion (min_asist_reg, min_asist_trabajo, min_asist_promo)
-- Deprecated: public.catedras (ram_asistencia_regular, ram_asistencia_trabajo, ram_asistencia_promocion)

-- 1. Agregar columna canónica min_asist_trabajo en criterios_evaluacion si no existe
ALTER TABLE public.criterios_evaluacion
ADD COLUMN IF NOT EXISTS min_asist_trabajo NUMERIC DEFAULT 60;

-- 2. Backfill:
-- 2.1 Garantizar que cada cátedra existente posea su registro en criterios_evaluacion
INSERT INTO public.criterios_evaluacion (
    catedra_id, 
    min_asist_reg, 
    min_asist_trabajo, 
    min_asist_promo
)
SELECT 
    c.id, 
    COALESCE(c.ram_asistencia_regular, 70), 
    COALESCE(c.ram_asistencia_trabajo, 60), 
    COALESCE(c.ram_asistencia_promocion, 80)
FROM public.catedras c
WHERE NOT EXISTS (
    SELECT 1 FROM public.criterios_evaluacion ce WHERE ce.catedra_id = c.id
);

-- 2.2 Sincronizar criterios_evaluacion desde catedras si faltan valores
UPDATE public.criterios_evaluacion ce
SET 
    min_asist_trabajo = COALESCE(ce.min_asist_trabajo, c.ram_asistencia_trabajo, 60),
    min_asist_reg = COALESCE(ce.min_asist_reg, c.ram_asistencia_regular, 70),
    min_asist_promo = COALESCE(ce.min_asist_promo, c.ram_asistencia_promocion, 80)
FROM public.catedras c
WHERE ce.catedra_id = c.id;

-- 2.3 Sincronizar catedras desde criterios_evaluacion si difieren o son nulos
UPDATE public.catedras c
SET 
    ram_asistencia_regular = COALESCE(ROUND(ce.min_asist_reg)::integer, c.ram_asistencia_regular, 70),
    ram_asistencia_trabajo = COALESCE(ROUND(ce.min_asist_trabajo)::integer, c.ram_asistencia_trabajo, 60),
    ram_asistencia_promocion = COALESCE(ROUND(ce.min_asist_promo)::integer, c.ram_asistencia_promocion, 80)
FROM public.criterios_evaluacion ce
WHERE c.id = ce.catedra_id;

-- 3. Actualizar función handle_new_catedra para incluir los valores al insertar cátedra
CREATE OR REPLACE FUNCTION public.handle_new_catedra()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.criterios_evaluacion (
        catedra_id,
        min_asist_reg,
        min_asist_trabajo,
        min_asist_promo
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.ram_asistencia_regular, 70),
        COALESCE(NEW.ram_asistencia_trabajo, 60),
        COALESCE(NEW.ram_asistencia_promocion, 80)
    )
    ON CONFLICT (catedra_id) DO UPDATE SET
        min_asist_reg = EXCLUDED.min_asist_reg,
        min_asist_trabajo = EXCLUDED.min_asist_trabajo,
        min_asist_promo = EXCLUDED.min_asist_promo;
    RETURN NEW;
END;
$function$;

-- 4. Triggers bi-direccionales de sincronización:
-- 4.1 De criterios_evaluacion hacia catedras (cuando se actualiza o inserta criterios_evaluacion)
CREATE OR REPLACE FUNCTION public.sync_criterios_to_catedras()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    UPDATE public.catedras
    SET ram_asistencia_regular = COALESCE(ROUND(NEW.min_asist_reg)::integer, 70),
        ram_asistencia_trabajo = COALESCE(ROUND(NEW.min_asist_trabajo)::integer, 60),
        ram_asistencia_promocion = COALESCE(ROUND(NEW.min_asist_promo)::integer, 80)
    WHERE id = NEW.catedra_id
      AND (
          ram_asistencia_regular IS DISTINCT FROM COALESCE(ROUND(NEW.min_asist_reg)::integer, 70) OR
          ram_asistencia_trabajo IS DISTINCT FROM COALESCE(ROUND(NEW.min_asist_trabajo)::integer, 60) OR
          ram_asistencia_promocion IS DISTINCT FROM COALESCE(ROUND(NEW.min_asist_promo)::integer, 80)
      );
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_criterios_to_catedras ON public.criterios_evaluacion;
CREATE TRIGGER trg_sync_criterios_to_catedras
AFTER INSERT OR UPDATE OF min_asist_reg, min_asist_trabajo, min_asist_promo
ON public.criterios_evaluacion
FOR EACH ROW
EXECUTE FUNCTION public.sync_criterios_to_catedras();

-- 4.2 De catedras hacia criterios_evaluacion (cuando clientes legados actualizan catedras)
CREATE OR REPLACE FUNCTION public.sync_catedras_to_criterios()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    IF (OLD.ram_asistencia_regular IS DISTINCT FROM NEW.ram_asistencia_regular) OR
       (OLD.ram_asistencia_trabajo IS DISTINCT FROM NEW.ram_asistencia_trabajo) OR
       (OLD.ram_asistencia_promocion IS DISTINCT FROM NEW.ram_asistencia_promocion) THEN
        UPDATE public.criterios_evaluacion
        SET min_asist_reg = COALESCE(NEW.ram_asistencia_regular, 70),
            min_asist_trabajo = COALESCE(NEW.ram_asistencia_trabajo, 60),
            min_asist_promo = COALESCE(NEW.ram_asistencia_promocion, 80)
        WHERE catedra_id = NEW.id
          AND (
              min_asist_reg IS DISTINCT FROM COALESCE(NEW.ram_asistencia_regular, 70) OR
              min_asist_trabajo IS DISTINCT FROM COALESCE(NEW.ram_asistencia_trabajo, 60) OR
              min_asist_promo IS DISTINCT FROM COALESCE(NEW.ram_asistencia_promocion, 80)
          );
    END IF;
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_catedras_to_criterios ON public.catedras;
CREATE TRIGGER trg_sync_catedras_to_criterios
AFTER UPDATE OF ram_asistencia_regular, ram_asistencia_trabajo, ram_asistencia_promocion
ON public.catedras
FOR EACH ROW
EXECUTE FUNCTION public.sync_catedras_to_criterios();
