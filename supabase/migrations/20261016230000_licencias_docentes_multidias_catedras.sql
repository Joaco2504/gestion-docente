-- ====================================================================
-- MIGRACIÓN: Soporte Multi-Día, Fecha Fin y Multi-Cátedra para Licencias Docentes
-- Decreto Acuerdo N° 1092/2015 (Anexo I - Catamarca)
-- ====================================================================

ALTER TABLE public.licencias_docentes
  ADD COLUMN IF NOT EXISTS fecha_fin DATE,
  ADD COLUMN IF NOT EXISTS cantidad_dias INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS fecha_reintegro DATE,
  ADD COLUMN IF NOT EXISTS aplica_todas_catedras BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS catedra_ids JSONB DEFAULT '[]'::jsonb;

-- Índices de rango de fechas para consultas eficientes en calendario y presentismo
CREATE INDEX IF NOT EXISTS idx_licencias_docentes_rango_fechas 
  ON public.licencias_docentes (fecha, fecha_fin);
