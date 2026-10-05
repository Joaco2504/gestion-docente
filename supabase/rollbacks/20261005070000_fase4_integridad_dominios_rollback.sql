-- Rollback for 20261005070000_fase4_integridad_dominios.sql

DROP TRIGGER IF EXISTS trg_normalize_recursos_dominios ON public.recursos;
DROP FUNCTION IF EXISTS public.normalize_recursos_dominios();

DROP TRIGGER IF EXISTS trg_normalize_asistencias_estado ON public.asistencias;
DROP FUNCTION IF EXISTS public.normalize_asistencias_estado();

DROP TRIGGER IF EXISTS trg_normalize_periodos_tipo ON public.periodos_academicos;
DROP FUNCTION IF EXISTS public.normalize_periodos_tipo();
ALTER TABLE public.periodos_academicos DROP CONSTRAINT IF EXISTS periodos_academicos_tipo_check;

DROP TRIGGER IF EXISTS trg_normalize_evaluaciones_tipo ON public.evaluaciones;
DROP FUNCTION IF EXISTS public.normalize_evaluaciones_tipo();
ALTER TABLE public.evaluaciones DROP CONSTRAINT IF EXISTS evaluaciones_tipo_check;
ALTER TABLE public.evaluaciones ADD CONSTRAINT evaluaciones_tipo_check CHECK (tipo = ANY (ARRAY['TP'::text, 'PARCIAL'::text, 'PRUEBA'::text, 'RECUPERATORIO'::text]));

ALTER TABLE public.inscripciones DROP CONSTRAINT IF EXISTS inscripciones_estado_academico_check;
