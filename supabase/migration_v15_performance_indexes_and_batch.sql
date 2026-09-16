-- ==============================================================================
-- MIGRACIÓN V15: ÍNDICES DE ALTO RENDIMIENTO PARA RLS, JOINS Y FILTROS CRÍTICOS
-- Optimización exhaustiva de PlanillaDocente (React + Vite + Supabase + PostgreSQL)
-- ==============================================================================

-- 1. TABLA: inscripciones
-- Optimiza consultas de nómina de cátedra, verificación de unicidad y RLS multi-docente
CREATE INDEX IF NOT EXISTS idx_inscripciones_catedra_id 
    ON public.inscripciones (catedra_id);

CREATE INDEX IF NOT EXISTS idx_inscripciones_estudiante_id 
    ON public.inscripciones (estudiante_id);

CREATE INDEX IF NOT EXISTS idx_inscripciones_catedra_estudiante 
    ON public.inscripciones (catedra_id, estudiante_id);

CREATE INDEX IF NOT EXISTS idx_inscripciones_estado_academico 
    ON public.inscripciones (catedra_id, estado_academico);

-- 2. TABLA: asistencias
-- Acelera el renderizado de la matriz de asistencias (90+ filas x 30+ columnas)
CREATE INDEX IF NOT EXISTS idx_asistencias_catedra_id 
    ON public.asistencias (catedra_id);

CREATE INDEX IF NOT EXISTS idx_asistencias_estudiante_id 
    ON public.asistencias (estudiante_id);

CREATE INDEX IF NOT EXISTS idx_asistencias_clase_id 
    ON public.asistencias (clase_id);

CREATE INDEX IF NOT EXISTS idx_asistencias_catedra_fecha 
    ON public.asistencias (catedra_id, fecha);

CREATE INDEX IF NOT EXISTS idx_asistencias_estudiante_catedra 
    ON public.asistencias (estudiante_id, catedra_id);

-- 3. TABLA: notas
-- Elimina cuellos de botella al calcular promedios, cargar evaluaciones y asentar notas
CREATE INDEX IF NOT EXISTS idx_notas_evaluacion_id 
    ON public.notas (evaluacion_id);

CREATE INDEX IF NOT EXISTS idx_notas_estudiante_id 
    ON public.notas (estudiante_id);

CREATE INDEX IF NOT EXISTS idx_notas_evaluacion_estudiante 
    ON public.notas (evaluacion_id, estudiante_id);

-- 4. TABLA: clases (Libro de Temas)
-- Optimiza el ordenamiento cronológico y la sincronización con unidades temáticas
CREATE INDEX IF NOT EXISTS idx_clases_catedra_id 
    ON public.clases (catedra_id);

CREATE INDEX IF NOT EXISTS idx_clases_fecha 
    ON public.clases (fecha);

CREATE INDEX IF NOT EXISTS idx_clases_catedra_fecha 
    ON public.clases (catedra_id, fecha);

CREATE INDEX IF NOT EXISTS idx_clases_unidad_id 
    ON public.clases (unidad_id);

-- 5. TABLA: evaluaciones
-- Optimiza el filtrado por ciclo lectivo, período académico y cátedra
CREATE INDEX IF NOT EXISTS idx_evaluaciones_catedra_id 
    ON public.evaluaciones (catedra_id);

CREATE INDEX IF NOT EXISTS idx_evaluaciones_fecha 
    ON public.evaluaciones (fecha);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'evaluaciones' 
          AND column_name = 'periodo_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_evaluaciones_periodo_id 
            ON public.evaluaciones (periodo_id);
    END IF;
END $$;

-- 6. TABLA: mesas_examen
-- Optimiza el listado de turnos de exámenes y actas volantes
CREATE INDEX IF NOT EXISTS idx_mesas_examen_catedra_id 
    ON public.mesas_examen (catedra_id);

CREATE INDEX IF NOT EXISTS idx_mesas_examen_fecha 
    ON public.mesas_examen (fecha);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'mesas_examen' 
          AND column_name = 'periodo_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_mesas_examen_periodo_id 
            ON public.mesas_examen (periodo_id);
    END IF;
END $$;

-- 7. TABLA: actas_examen_alumnos
-- Optimiza la carga y persistencia en lote del acta de examen volante
CREATE INDEX IF NOT EXISTS idx_actas_examen_alumnos_mesa_id 
    ON public.actas_examen_alumnos (mesa_id);

CREATE INDEX IF NOT EXISTS idx_actas_examen_alumnos_estudiante_id 
    ON public.actas_examen_alumnos (estudiante_id);

CREATE INDEX IF NOT EXISTS idx_actas_examen_alumnos_mesa_estudiante 
    ON public.actas_examen_alumnos (mesa_id, estudiante_id);

-- 8. TABLA: actas_examen_detalle (si existe por compatibilidad histórica)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'actas_examen_detalle'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_actas_examen_detalle_mesa_id 
            ON public.actas_examen_detalle (mesa_id);

        CREATE INDEX IF NOT EXISTS idx_actas_examen_detalle_estudiante_id 
            ON public.actas_examen_detalle (estudiante_id);
    END IF;
END $$;

-- 9. TABLA: unidades_tematicas (Programa analítico)
CREATE INDEX IF NOT EXISTS idx_unidades_tematicas_catedra_id 
    ON public.unidades_tematicas (catedra_id);

CREATE INDEX IF NOT EXISTS idx_unidades_tematicas_catedra_numero 
    ON public.unidades_tematicas (catedra_id, numero);

-- 10. TABLA: inasistencias_docente
CREATE INDEX IF NOT EXISTS idx_inasistencias_docente_catedra_id 
    ON public.inasistencias_docente (catedra_id);

CREATE INDEX IF NOT EXISTS idx_inasistencias_docente_catedra_fecha 
    ON public.inasistencias_docente (catedra_id, fecha);

-- 11. TABLA: estudiantes
-- Optimiza búsquedas masivas por DNI en el importador Excel y en el Portal de Alumnos
CREATE INDEX IF NOT EXISTS idx_estudiantes_dni 
    ON public.estudiantes (dni);

CREATE INDEX IF NOT EXISTS idx_estudiantes_docente_dni 
    ON public.estudiantes (docente_id, dni);

-- 12. TABLA: criterios_evaluacion
CREATE INDEX IF NOT EXISTS idx_criterios_evaluacion_catedra_id 
    ON public.criterios_evaluacion (catedra_id);

-- Finalización de script de migración defensiva v15
COMMENT ON INDEX idx_inscripciones_catedra_estudiante IS 'Optimización v15 para filtros RLS y verificación rápida de matrículas';
COMMENT ON INDEX idx_asistencias_catedra_fecha IS 'Optimización v15 para renderizado rápido de matrices de asistencia';
