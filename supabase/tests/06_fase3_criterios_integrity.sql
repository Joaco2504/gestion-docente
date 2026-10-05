BEGIN;
SELECT plan(5);

-- Setup: Docente, Institución, Ciclo y Cátedra de prueba
INSERT INTO auth.users (id, email)
VALUES ('88888888-8888-8888-8888-888888888888', 'docente.crit@test.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.instituciones (id, nombre, nivel, docente_id)
VALUES ('99999999-9999-9999-9999-999999999999', 'Inst Crit', 'Superior', '88888888-8888-8888-8888-888888888888')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ciclos_lectivos (id, nombre, anio, docente_id)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ciclo 2026', 2026, '88888888-8888-8888-8888-888888888888')
ON CONFLICT (id) DO NOTHING;

-- Test 1: Columna min_asist_trabajo existe en criterios_evaluacion
SELECT has_column(
    'public',
    'criterios_evaluacion',
    'min_asist_trabajo',
    'Test 1: Columna min_asist_trabajo existe en criterios_evaluacion'
);

-- Test 2: Inserción de cátedra nueva genera automáticamente fila en criterios_evaluacion con valores especificados
INSERT INTO public.catedras (
    id, 
    nombre, 
    nivel, 
    docente_id, 
    institucion_id, 
    ciclo_id, 
    ram_asistencia_regular, 
    ram_asistencia_trabajo, 
    ram_asistencia_promocion
)
VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
    'Cátedra Criterios Test', 
    'Superior', 
    '88888888-8888-8888-8888-888888888888', 
    '99999999-9999-9999-9999-999999999999', 
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
    75, 
    65, 
    85
);

SELECT results_eq(
    $$ SELECT min_asist_reg, min_asist_trabajo, min_asist_promo FROM public.criterios_evaluacion WHERE catedra_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
    $$ VALUES (75::numeric, 65::numeric, 85::numeric) $$,
    'Test 2: Nueva cátedra genera automáticamente fila en criterios_evaluacion sincronizada'
);

-- Test 3: Actualizar criterios_evaluacion propaga a catedras
UPDATE public.criterios_evaluacion
SET min_asist_reg = 72, min_asist_trabajo = 62, min_asist_promo = 82
WHERE catedra_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

SELECT results_eq(
    $$ SELECT ram_asistencia_regular, ram_asistencia_trabajo, ram_asistencia_promocion FROM public.catedras WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
    $$ VALUES (72, 62, 82) $$,
    'Test 3: Actualización en criterios_evaluacion sincroniza catedras'
);

-- Test 4: Actualizar catedras propaga a criterios_evaluacion
UPDATE public.catedras
SET ram_asistencia_regular = 68, ram_asistencia_trabajo = 58, ram_asistencia_promocion = 78
WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

SELECT results_eq(
    $$ SELECT min_asist_reg, min_asist_trabajo, min_asist_promo FROM public.criterios_evaluacion WHERE catedra_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
    $$ VALUES (68::numeric, 58::numeric, 78::numeric) $$,
    'Test 4: Actualización en catedras sincroniza criterios_evaluacion'
);

-- Test 5: Cero discrepancias entre catedras y criterios_evaluacion
SELECT is(
    (SELECT count(*) FROM public.catedras c 
     JOIN public.criterios_evaluacion ce ON c.id = ce.catedra_id 
     WHERE c.ram_asistencia_regular IS DISTINCT FROM ROUND(ce.min_asist_reg)::integer
        OR c.ram_asistencia_trabajo IS DISTINCT FROM ROUND(ce.min_asist_trabajo)::integer
        OR c.ram_asistencia_promocion IS DISTINCT FROM ROUND(ce.min_asist_promo)::integer)::integer,
    0,
    'Test 5: Cero discrepancias entre catedras y criterios_evaluacion'
);

SELECT * FROM finish();
ROLLBACK;
