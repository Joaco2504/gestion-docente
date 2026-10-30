-- =====================================================================
-- KORUM 2.0: Selector de Visibilidad de Notas, Parámetros de Condición
-- y Override Manual/Automático por Alumno
-- =====================================================================

-- 1. Nuevas columnas en public.catedras para Visibilidad y Parámetros de Condición
ALTER TABLE public.catedras
  ADD COLUMN IF NOT EXISTS mostrar_parciales BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS mostrar_tps BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS mostrar_promedio BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS eval_considerar_asistencia BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS eval_considerar_parciales BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS eval_considerar_tps BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS nota_regularidad NUMERIC(4,2) NOT NULL DEFAULT 4.00,
  ADD COLUMN IF NOT EXISTS nota_promocion NUMERIC(4,2) NOT NULL DEFAULT 7.00,
  ADD COLUMN IF NOT EXISTS ram_asistencia_regular INTEGER NOT NULL DEFAULT 70,
  ADD COLUMN IF NOT EXISTS ram_asistencia_trabajo INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS porcentaje_tps_regular INTEGER NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS porcentaje_tps_promocion INTEGER NOT NULL DEFAULT 100;

-- 2. Nuevas columnas en public.inscripciones para Override Manual de Condición
ALTER TABLE public.inscripciones
  ADD COLUMN IF NOT EXISTS condicion_manual TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS motivo_condicion_manual TEXT DEFAULT NULL;

COMMENT ON COLUMN public.inscripciones.condicion_manual IS
  'Override manual del docente (NULL = Automático, PROMOCIONAL, PROMOCION_INDIRECTA, REGULAR, LIBRE).';
COMMENT ON COLUMN public.inscripciones.motivo_condicion_manual IS
  'Motivo opcional ingresado por el docente al fijar una condición manual.';
