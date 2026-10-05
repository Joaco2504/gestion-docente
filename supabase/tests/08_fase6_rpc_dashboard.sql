-- ============================================================================
-- Test Suite pgTAP: 08_fase6_rpc_dashboard.sql
-- Valida las funciones RPC dashboard_resumen y dashboard_agenda
-- ============================================================================

BEGIN;
SELECT plan(9);

-- Test 1: Verificar existencia de dashboard_resumen
SELECT has_function(
    'public',
    'dashboard_resumen',
    ARRAY['uuid'],
    'dashboard_resumen(UUID) debe existir en el esquema public'
);

-- Test 2: Verificar existencia de dashboard_agenda
SELECT has_function(
    'public',
    'dashboard_agenda',
    ARRAY['uuid', 'integer'],
    'dashboard_agenda(UUID, INT) debe existir en el esquema public'
);

-- Test 3: Llamar dashboard_resumen con NULL devuelve estructura base vacía
SELECT is(
    (dashboard_resumen(NULL)->'catedras')::text,
    '[]',
    'dashboard_resumen(NULL) debe retornar catedras como array vacio'
);

SELECT is(
    (dashboard_resumen(NULL)->'metricas_globales'->>'total_catedras')::int,
    0,
    'dashboard_resumen(NULL) debe retornar 0 catedras globales'
);

-- Preparar datos de prueba transaccionales
DO $$
DECLARE
    v_doc1 UUID := 'a1111111-1111-1111-1111-111111111111';
    v_doc2 UUID := 'b2222222-2222-2222-2222-222222222222';
    v_inst UUID;
    v_cat1 UUID;
    v_cat2 UUID;
    v_est1 UUID;
    v_est2 UUID;
    v_cls1 UUID;
    v_ev1  UUID;
BEGIN
    -- Crear usuarios de prueba en auth.users
    INSERT INTO auth.users (id, email) VALUES 
        (v_doc1, 'docente1_rpc@test.com'),
        (v_doc2, 'docente2_rpc@test.com')
    ON CONFLICT (id) DO NOTHING;

    -- Institución
    INSERT INTO public.instituciones (nombre, nivel, docente_id)
    VALUES ('Inst RPC Test', 'TERCIARIO', v_doc1)
    RETURNING id INTO v_inst;

    -- Ciclos lectivos para Docente 1 y Docente 2
    DECLARE
        v_ciclo1 UUID;
        v_ciclo2 UUID;
    BEGIN
        INSERT INTO public.ciclos_lectivos (anio, activo, docente_id)
        VALUES (2026, true, v_doc1)
        RETURNING id INTO v_ciclo1;

        INSERT INTO public.ciclos_lectivos (anio, activo, docente_id)
        VALUES (2026, true, v_doc2)
        RETURNING id INTO v_ciclo2;

        -- Cátedra para Docente 1
        INSERT INTO public.catedras (nombre, nivel, modalidad, docente_id, institucion_id, ciclo_id)
        VALUES ('Catedra RPC 1', 'TERCIARIO', 'ANUAL', v_doc1, v_inst, v_ciclo1)
        RETURNING id INTO v_cat1;

        -- Cátedra para Docente 2
        INSERT INTO public.catedras (nombre, nivel, modalidad, docente_id, institucion_id, ciclo_id)
        VALUES ('Catedra RPC 2', 'SECUNDARIO', 'ANUAL', v_doc2, v_inst, v_ciclo2)
        RETURNING id INTO v_cat2;
    END;

    -- Estudiantes para Cátedra 1
    INSERT INTO public.estudiantes (nombre, apellido, dni, docente_id)
    VALUES ('Juan', 'Perez', '40111222', v_doc1)
    RETURNING id INTO v_est1;

    INSERT INTO public.inscripciones (catedra_id, estudiante_id, estado_academico)
    VALUES (v_cat1, v_est1, 'CURSANDO');

    -- Clase para Cátedra 1 (con tema NOT NULL obligatorio)
    INSERT INTO public.clases (catedra_id, fecha, tema)
    VALUES (v_cat1, CURRENT_DATE, 'Introduccion RPC')
    RETURNING id INTO v_cls1;

    -- Asistencia PRESENTE para la clase
    INSERT INTO public.asistencias (clase_id, estudiante_id, estado)
    VALUES (v_cls1, v_est1, 'PRESENTE');

    -- Evento de calendario para Docente 1 en los próximos días
    INSERT INTO public.eventos_calendario (docente_id, titulo, tipo, fecha_inicio, fecha_fin)
    VALUES (v_doc1, 'Mesa Especial RPC', 'TRIBUNAL_EXAMEN', (CURRENT_DATE + 2)::timestamp, (CURRENT_DATE + 2)::timestamp + interval '2 hours');
END;
$$;

-- Test 4: dashboard_resumen para docente 1 retorna métricas consolidadas correctas
SELECT is(
    (dashboard_resumen('a1111111-1111-1111-1111-111111111111'::uuid)->'metricas_globales'->>'total_catedras')::int,
    1,
    'dashboard_resumen debe reportar exactamente 1 catedra para docente 1'
);

-- Test 5: dashboard_resumen reporta asistencia promedio del 100% y última clase poblada
SELECT is(
    (dashboard_resumen('a1111111-1111-1111-1111-111111111111'::uuid)->'catedras'->0->>'asistencia_promedio')::numeric,
    100.0,
    'La cátedra debe tener 100.0% de asistencia promedio'
);

-- Test 6: Aislamiento por docente: docente 2 no debe ver las cátedras de docente 1
SELECT is(
    (dashboard_resumen('b2222222-2222-2222-2222-222222222222'::uuid)->'catedras'->0->>'nombre'),
    'Catedra RPC 2',
    'Docente 2 solo debe ver su propia cátedra'
);

-- Test 7: dashboard_agenda para docente 1 retorna el evento programado
SELECT is(
    (dashboard_agenda('a1111111-1111-1111-1111-111111111111'::uuid, 15)->0->>'titulo'),
    'Mesa Especial RPC',
    'dashboard_agenda debe retornar el evento programado en los próximos 15 días'
);

-- Test 8: dashboard_agenda para docente 2 no contiene el evento de docente 1
SELECT is(
    jsonb_array_length(dashboard_agenda('b2222222-2222-2222-2222-222222222222'::uuid, 15)),
    0,
    'dashboard_agenda para docente 2 no debe incluir eventos de docente 1'
);

SELECT * FROM finish();
ROLLBACK;
