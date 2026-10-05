-- Rollback for 20261005050000_fase3_expand_criterios.sql

DROP TRIGGER IF EXISTS trg_sync_criterios_to_catedras ON public.criterios_evaluacion;
DROP FUNCTION IF EXISTS public.sync_criterios_to_catedras();

DROP TRIGGER IF EXISTS trg_sync_catedras_to_criterios ON public.catedras;
DROP FUNCTION IF EXISTS public.sync_catedras_to_criterios();

CREATE OR REPLACE FUNCTION public.handle_new_catedra()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.criterios_evaluacion (catedra_id)
    VALUES (new.id);
    RETURN NEW;
END;
$function$;

ALTER TABLE public.criterios_evaluacion DROP COLUMN IF EXISTS min_asist_trabajo;
