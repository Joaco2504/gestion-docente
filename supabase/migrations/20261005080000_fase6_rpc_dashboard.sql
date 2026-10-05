-- ============================================================================
-- Migración: 20261005080000_fase6_rpc_dashboard.sql
-- Fase 6: Rendimiento y Funciones RPC para Dashboard (dashboard_resumen y dashboard_agenda)
-- Consolida consultas de cátedras, clases, inscripciones, asistencias y agenda en una llamada atómica.
-- ============================================================================

-- 1. Función RPC: dashboard_resumen
CREATE OR REPLACE FUNCTION public.dashboard_resumen(p_docente_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_docente_id UUID;
    v_result JSONB;
BEGIN
    -- Determinar docente_id efectivo
    v_docente_id := COALESCE(p_docente_id, auth.uid());
    
    IF v_docente_id IS NULL THEN
        RETURN jsonb_build_object(
            'metricas_globales', jsonb_build_object(
                'total_estudiantes', 0,
                'asistencia_promedio_general', 0,
                'total_clases', 0,
                'total_catedras', 0
            ),
            'catedras', '[]'::jsonb
        );
    END IF;

    -- Validar aislamiento multi-inquilino si el usuario autenticado difiere del solicitado
    IF auth.uid() IS NOT NULL AND auth.uid() <> v_docente_id THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.perfiles
            WHERE id = auth.uid() AND rol = 'superadmin'
        ) THEN
            RAISE EXCEPTION 'Acceso denegado: no autorizado para consultar datos de otro docente';
        END IF;
    END IF;

    WITH docente_catedras AS (
        SELECT 
            c.id,
            c.docente_id,
            c.institucion_id,
            c.ciclo_id,
            c.nombre,
            c.nivel,
            c.modalidad,
            c.horarios_semanales,
            c.created_at,
            c.updated_at,
            i.nombre AS institucion_nombre,
            i.nivel AS institucion_nivel,
            cl.anio AS ciclo_anio,
            cl.activo AS ciclo_activo
        FROM public.catedras c
        LEFT JOIN public.instituciones i ON i.id = c.institucion_id
        LEFT JOIN public.ciclos_lectivos cl ON cl.id = c.ciclo_id
        WHERE c.docente_id = v_docente_id
    ),
    conteo_estudiantes AS (
        SELECT 
            ins.catedra_id,
            COUNT(ins.id)::int AS estudiantes_count
        FROM public.inscripciones ins
        WHERE ins.catedra_id IN (SELECT id FROM docente_catedras)
        GROUP BY ins.catedra_id
    ),
    resumen_clases AS (
        SELECT 
            cls.catedra_id,
            COUNT(cls.id)::int AS clases_count
        FROM public.clases cls
        WHERE cls.catedra_id IN (SELECT id FROM docente_catedras)
        GROUP BY cls.catedra_id
    ),
    ultimas_clases_ranked AS (
        SELECT 
            cls.id AS clase_id,
            cls.catedra_id,
            cls.fecha,
            cls.tema,
            ROW_NUMBER() OVER (PARTITION BY cls.catedra_id ORDER BY cls.fecha DESC, cls.created_at DESC) AS rn
        FROM public.clases cls
        WHERE cls.catedra_id IN (SELECT id FROM docente_catedras)
    ),
    ultimas_clases AS (
        SELECT 
            ucr.clase_id,
            ucr.catedra_id,
            ucr.fecha,
            ucr.tema,
            COALESCE(COUNT(a.id) FILTER (WHERE a.estado = 'PRESENTE'), 0)::int AS presentes,
            COALESCE(COUNT(a.id), 0)::int AS total_asist
        FROM ultimas_clases_ranked ucr
        LEFT JOIN public.asistencias a ON a.clase_id = ucr.clase_id
        WHERE ucr.rn = 1
        GROUP BY ucr.clase_id, ucr.catedra_id, ucr.fecha, ucr.tema
    ),
    asistencia_general_catedra AS (
        SELECT 
            cls.catedra_id,
            COUNT(a.id) AS total_asistencias,
            COUNT(a.id) FILTER (WHERE a.estado = 'PRESENTE') AS total_presentes
        FROM public.clases cls
        JOIN public.asistencias a ON a.clase_id = cls.id
        WHERE cls.catedra_id IN (SELECT id FROM docente_catedras)
        GROUP BY cls.catedra_id
    ),
    catedras_enriquecidas AS (
        SELECT 
            dc.id,
            dc.docente_id,
            dc.institucion_id,
            dc.ciclo_id,
            dc.nombre,
            dc.nivel,
            dc.modalidad,
            dc.horarios_semanales,
            dc.created_at,
            dc.updated_at,
            COALESCE(dc.institucion_nombre, 'Institución') AS institucion_nombre,
            COALESCE(dc.institucion_nivel, dc.nivel) AS institucion_nivel,
            dc.ciclo_anio,
            dc.ciclo_activo,
            COALESCE(ce.estudiantes_count, 0) AS estudiantes_count,
            COALESCE(rc.clases_count, 0) AS clases_count,
            CASE 
                WHEN agc.total_asistencias > 0 
                THEN ROUND((agc.total_presentes::numeric / agc.total_asistencias::numeric) * 100, 1)
                ELSE NULL
            END AS asistencia_promedio,
            CASE 
                WHEN uc.clase_id IS NOT NULL THEN jsonb_build_object(
                    'id', uc.clase_id,
                    'fecha', uc.fecha,
                    'tema', uc.tema,
                    'presentes', uc.presentes,
                    'totalAsist', uc.total_asist
                )
                ELSE NULL
            END AS ultima_clase
        FROM docente_catedras dc
        LEFT JOIN conteo_estudiantes ce ON ce.catedra_id = dc.id
        LEFT JOIN resumen_clases rc ON rc.catedra_id = dc.id
        LEFT JOIN ultimas_clases uc ON uc.catedra_id = dc.id
        LEFT JOIN asistencia_general_catedra agc ON agc.catedra_id = dc.id
        ORDER BY dc.nombre ASC
    ),
    metricas_globales AS (
        SELECT 
            COALESCE(SUM(estudiantes_count), 0)::int AS total_estudiantes,
            COALESCE(SUM(clases_count), 0)::int AS total_clases,
            COUNT(id)::int AS total_catedras,
            CASE 
                WHEN COUNT(asistencia_promedio) > 0 
                THEN ROUND(AVG(asistencia_promedio)::numeric, 0)::int
                ELSE 0
            END AS asistencia_promedio_general
        FROM catedras_enriquecidas
    )
    SELECT jsonb_build_object(
        'metricas_globales', (SELECT to_jsonb(mg) FROM metricas_globales mg),
        'catedras', COALESCE((SELECT jsonb_agg(to_jsonb(ce)) FROM catedras_enriquecidas ce), '[]'::jsonb)
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- 2. Función RPC: dashboard_agenda
CREATE OR REPLACE FUNCTION public.dashboard_agenda(
    p_docente_id UUID DEFAULT NULL,
    p_dias INT DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_docente_id UUID;
    v_today_date DATE := CURRENT_DATE;
    v_max_date DATE;
    v_result JSONB;
BEGIN
    v_docente_id := COALESCE(p_docente_id, auth.uid());
    v_max_date := v_today_date + COALESCE(p_dias, 15);

    IF v_docente_id IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    IF auth.uid() IS NOT NULL AND auth.uid() <> v_docente_id THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.perfiles
            WHERE id = auth.uid() AND rol = 'superadmin'
        ) THEN
            RAISE EXCEPTION 'Acceso denegado: no autorizado para consultar agenda de otro docente';
        END IF;
    END IF;

    WITH eventos AS (
        SELECT 
            ev.id::text AS id,
            ev.titulo,
            COALESCE(ev.tipo, 'TRIBUNAL_EXAMEN') AS tipo,
            ev.fecha_inicio::date AS fecha_date,
            TO_CHAR(ev.fecha_inicio, 'YYYY-MM-DD') AS fecha,
            CASE 
                WHEN ev.fecha_inicio IS NOT NULL AND ev.fecha_inicio::text LIKE '%T%' 
                THEN SUBSTRING(ev.fecha_inicio::text FROM 'T([0-9]{2}:[0-9]{2})')
                ELSE TO_CHAR(ev.fecha_inicio, 'HH24:MI')
            END AS hora,
            'EVENTO' AS origen,
            ev.notas
        FROM public.eventos_calendario ev
        WHERE ev.docente_id = v_docente_id
          AND ev.fecha_inicio::date >= v_today_date
          AND ev.fecha_inicio::date <= v_max_date
    ),
    periodos_fin AS (
        SELECT 
            'per-fin-' || per.id::text AS id,
            'Cierre: ' || per.nombre AS titulo,
            'PERIODO' AS tipo,
            per.fecha_fin::date AS fecha_date,
            TO_CHAR(per.fecha_fin::date, 'YYYY-MM-DD') AS fecha,
            NULL::text AS hora,
            'PERIODO' AS origen,
            'Límite para cierre de notas y actas reglamentarias' AS notas
        FROM public.periodos_academicos per
        WHERE per.fecha_fin IS NOT NULL
          AND per.fecha_fin::date >= v_today_date
          AND per.fecha_fin::date <= v_max_date
    ),
    periodos_inicio AS (
        SELECT 
            'per-ini-' || per.id::text AS id,
            'Inicio: ' || per.nombre AS titulo,
            'PERIODO' AS tipo,
            per.fecha_inicio::date AS fecha_date,
            TO_CHAR(per.fecha_inicio::date, 'YYYY-MM-DD') AS fecha,
            NULL::text AS hora,
            'PERIODO' AS origen,
            'Inicio del período lectivo' AS notas
        FROM public.periodos_academicos per
        WHERE per.fecha_inicio IS NOT NULL
          AND per.fecha_inicio::date >= v_today_date
          AND per.fecha_inicio::date <= v_max_date
    ),
    todos_items AS (
        SELECT id, titulo, tipo, fecha, hora, origen, notas, fecha_date FROM eventos
        UNION ALL
        SELECT id, titulo, tipo, fecha, hora, origen, notas, fecha_date FROM periodos_fin
        UNION ALL
        SELECT id, titulo, tipo, fecha, hora, origen, notas, fecha_date FROM periodos_inicio
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', t.id,
                'titulo', t.titulo,
                'tipo', t.tipo,
                'fecha', t.fecha,
                'hora', t.hora,
                'origen', t.origen,
                'notas', t.notas
            )
            ORDER BY t.fecha_date ASC, t.hora ASC NULLS LAST
        ),
        '[]'::jsonb
    ) INTO v_result
    FROM todos_items t;

    RETURN v_result;
END;
$$;

-- 3. Permisos de ejecución
GRANT EXECUTE ON FUNCTION public.dashboard_resumen(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.dashboard_agenda(UUID, INT) TO authenticated, anon, service_role;
