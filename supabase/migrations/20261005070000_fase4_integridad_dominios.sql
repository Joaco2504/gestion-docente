-- Migration: 20261005070000_fase4_integridad_dominios.sql
-- Fase 4: Integridad de dominios, normalización de CHECK constraints y triggers de integridad

-- 1. Normalización y CHECK constraint en inscripciones (estado_academico)
UPDATE public.inscripciones
SET estado_academico = CASE
    WHEN upper(trim(estado_academico)) IN ('PROMOCIONAL', 'PROMOCIONADO', 'PROMOCION') THEN 'PROMOCIONAL'
    WHEN upper(trim(estado_academico)) = 'REGULAR' THEN 'REGULAR'
    WHEN upper(trim(estado_academico)) = 'LIBRE' THEN 'LIBRE'
    WHEN upper(trim(estado_academico)) = 'APROBADO' THEN 'APROBADO'
    WHEN upper(trim(estado_academico)) = 'DESAPROBADO' THEN 'DESAPROBADO'
    ELSE 'CURSANDO'
END
WHERE estado_academico IS NOT NULL;

ALTER TABLE public.inscripciones
DROP CONSTRAINT IF EXISTS inscripciones_estado_academico_check;

ALTER TABLE public.inscripciones
ADD CONSTRAINT inscripciones_estado_academico_check
CHECK (upper(estado_academico) = ANY (ARRAY['CURSANDO'::text, 'REGULAR'::text, 'PROMOCIONAL'::text, 'PROMOCIONADO'::text, 'LIBRE'::text, 'APROBADO'::text, 'DESAPROBADO'::text]));

-- 2. Normalización y actualización de evaluaciones_tipo_check en evaluaciones
UPDATE public.evaluaciones
SET tipo = CASE
    WHEN upper(tipo) LIKE '%PARCIAL%' THEN 'PARCIAL'
    WHEN upper(tipo) LIKE '%TRABAJO%' OR upper(tipo) LIKE '%PRÁCTICO%' OR upper(tipo) LIKE '%PRACTICO%' OR upper(tipo) LIKE '%TP%' THEN 'TP'
    WHEN upper(tipo) LIKE '%RECUP%' THEN 'RECUPERATORIO'
    WHEN upper(tipo) LIKE '%PRUEBA%' THEN 'PRUEBA'
    WHEN upper(tipo) LIKE '%FINAL%' THEN 'FINAL'
    WHEN upper(tipo) LIKE '%COLOQUIO%' THEN 'COLOQUIO'
    ELSE 'PARCIAL'
END
WHERE tipo IS NOT NULL;

ALTER TABLE public.evaluaciones
DROP CONSTRAINT IF EXISTS evaluaciones_tipo_check;

ALTER TABLE public.evaluaciones
ADD CONSTRAINT evaluaciones_tipo_check
CHECK (upper(tipo) = ANY (ARRAY['TP'::text, 'PARCIAL'::text, 'PRUEBA'::text, 'RECUPERATORIO'::text, 'FINAL'::text, 'COLOQUIO'::text]));

-- Trigger auto-normalizador para evaluaciones.tipo
CREATE OR REPLACE FUNCTION public.normalize_evaluaciones_tipo()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.tipo IS NOT NULL THEN
        NEW.tipo := CASE
            WHEN upper(trim(NEW.tipo)) LIKE '%PARCIAL%' THEN 'PARCIAL'
            WHEN upper(trim(NEW.tipo)) LIKE '%TRABAJO%' 
              OR upper(trim(NEW.tipo)) LIKE '%PRÁCTICO%' 
              OR upper(trim(NEW.tipo)) LIKE '%PRACTICO%' 
              OR upper(trim(NEW.tipo)) = 'TP' THEN 'TP'
            WHEN upper(trim(NEW.tipo)) LIKE '%RECUP%' THEN 'RECUPERATORIO'
            WHEN upper(trim(NEW.tipo)) LIKE '%PRUEBA%' THEN 'PRUEBA'
            WHEN upper(trim(NEW.tipo)) LIKE '%FINAL%' THEN 'FINAL'
            WHEN upper(trim(NEW.tipo)) LIKE '%COLOQUIO%' THEN 'COLOQUIO'
            ELSE upper(trim(NEW.tipo))
        END;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_evaluaciones_tipo ON public.evaluaciones;
CREATE TRIGGER trg_normalize_evaluaciones_tipo
BEFORE INSERT OR UPDATE
ON public.evaluaciones
FOR EACH ROW
EXECUTE FUNCTION public.normalize_evaluaciones_tipo();

-- 3. Normalización y CHECK constraint en periodos_academicos (tipo)
UPDATE public.periodos_academicos
SET tipo = CASE
    WHEN upper(trim(tipo)) IN ('PRIMER_CUATRIMESTRE', '1_CUATRIMESTRE', '1ER_CUATRIMESTRE') THEN 'PRIMER_CUATRIMESTRE'
    WHEN upper(trim(tipo)) IN ('RECESO_INVERNAL', 'RECESO', 'INVIERNO') THEN 'RECESO_INVERNAL'
    WHEN upper(trim(tipo)) IN ('SEGUNDO_CUATRIMESTRE', '2_CUATRIMESTRE', '2DO_CUATRIMESTRE') THEN 'SEGUNDO_CUATRIMESTRE'
    WHEN upper(trim(tipo)) = 'ANUAL' THEN 'ANUAL'
    ELSE 'OTRO'
END
WHERE tipo IS NOT NULL;

ALTER TABLE public.periodos_academicos
DROP CONSTRAINT IF EXISTS periodos_academicos_tipo_check;

ALTER TABLE public.periodos_academicos
ADD CONSTRAINT periodos_academicos_tipo_check
CHECK (upper(tipo) = ANY (ARRAY['PRIMER_CUATRIMESTRE'::text, 'RECESO_INVERNAL'::text, 'SEGUNDO_CUATRIMESTRE'::text, 'ANUAL'::text, 'OTRO'::text]));

-- Trigger auto-normalizador para periodos_academicos.tipo
CREATE OR REPLACE FUNCTION public.normalize_periodos_tipo()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.tipo IS NOT NULL THEN
        NEW.tipo := CASE
            WHEN upper(trim(NEW.tipo)) IN ('PRIMER_CUATRIMESTRE', '1_CUATRIMESTRE', '1ER_CUATRIMESTRE') THEN 'PRIMER_CUATRIMESTRE'
            WHEN upper(trim(NEW.tipo)) IN ('RECESO_INVERNAL', 'RECESO', 'INVIERNO') THEN 'RECESO_INVERNAL'
            WHEN upper(trim(NEW.tipo)) IN ('SEGUNDO_CUATRIMESTRE', '2_CUATRIMESTRE', '2DO_CUATRIMESTRE') THEN 'SEGUNDO_CUATRIMESTRE'
            WHEN upper(trim(NEW.tipo)) = 'ANUAL' THEN 'ANUAL'
            WHEN upper(trim(NEW.tipo)) = 'OTRO' THEN 'OTRO'
            ELSE upper(trim(NEW.tipo))
        END;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_periodos_tipo ON public.periodos_academicos;
CREATE TRIGGER trg_normalize_periodos_tipo
BEFORE INSERT OR UPDATE
ON public.periodos_academicos
FOR EACH ROW
EXECUTE FUNCTION public.normalize_periodos_tipo();

-- 4. Trigger auto-normalizador para asistencias.estado
CREATE OR REPLACE FUNCTION public.normalize_asistencias_estado()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.estado IS NOT NULL THEN
        NEW.estado := upper(trim(NEW.estado));
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_asistencias_estado ON public.asistencias;
CREATE TRIGGER trg_normalize_asistencias_estado
BEFORE INSERT OR UPDATE
ON public.asistencias
FOR EACH ROW
EXECUTE FUNCTION public.normalize_asistencias_estado();

-- 5. Trigger auto-normalizador para recursos.categoria y tipo_origen
CREATE OR REPLACE FUNCTION public.normalize_recursos_dominios()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.categoria IS NOT NULL THEN
        NEW.categoria := CASE
            WHEN upper(trim(NEW.categoria)) LIKE '%APUNTE%' 
              OR upper(trim(NEW.categoria)) LIKE '%TEOR%' 
              OR upper(trim(NEW.categoria)) LIKE '%TEÓR%' THEN 'APUNTE'
            WHEN upper(trim(NEW.categoria)) LIKE '%TRABAJO%' 
              OR upper(trim(NEW.categoria)) LIKE '%GUIA%' 
              OR upper(trim(NEW.categoria)) LIKE '%GUÍA%' 
              OR upper(trim(NEW.categoria)) = 'TP' THEN 'TP'
            WHEN upper(trim(NEW.categoria)) LIKE '%EVALUAC%' 
              OR upper(trim(NEW.categoria)) LIKE '%EXAM%' 
              OR upper(trim(NEW.categoria)) = 'PARCIAL' THEN 'PARCIAL'
            WHEN upper(trim(NEW.categoria)) LIKE '%PROGRAMA%' 
              OR upper(trim(NEW.categoria)) LIKE '%PLAN%' THEN 'PLANIFICACION'
            WHEN upper(trim(NEW.categoria)) LIKE '%LIBRO%' 
              OR upper(trim(NEW.categoria)) LIKE '%BIBLIO%' THEN 'BIBLIOGRAFIA'
            ELSE upper(trim(NEW.categoria))
        END;
    END IF;
    IF NEW.tipo_origen IS NOT NULL THEN
        NEW.tipo_origen := upper(trim(NEW.tipo_origen));
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_recursos_dominios ON public.recursos;
CREATE TRIGGER trg_normalize_recursos_dominios
BEFORE INSERT OR UPDATE
ON public.recursos
FOR EACH ROW
EXECUTE FUNCTION public.normalize_recursos_dominios();
