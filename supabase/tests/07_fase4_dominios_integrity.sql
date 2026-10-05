BEGIN;
SELECT plan(7);

-- Setup: Docente, Institución, Ciclo, Cátedra, Estudiante
INSERT INTO auth.users (id, email)
VALUES ('77777777-7777-7777-7777-777777777777', 'docente.dominios@test.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.instituciones (id, nombre, nivel, docente_id)
VALUES ('66666666-6666-6666-6666-666666666666', 'Inst Dominios', 'Superior', '77777777-7777-7777-7777-777777777777')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ciclos_lectivos (id, nombre, anio, docente_id)
VALUES ('55555555-5555-5555-5555-555555555555', 'Ciclo 2026', 2026, '77777777-7777-7777-7777-777777777777')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.catedras (id, nombre, nivel, docente_id, institucion_id, ciclo_id)
VALUES ('44444444-4444-4444-4444-444444444444', 'Cátedra Dominios', 'Superior', '77777777-7777-7777-7777-777777777777', '66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.estudiantes (id, nombre, apellido, dni, docente_id)
VALUES ('33333333-3333-3333-3333-333333333333', 'Alumno Dominios', 'Test', '99887766', '77777777-7777-7777-7777-777777777777')
ON CONFLICT (id) DO NOTHING;

-- Test 1: Inserción de estado inválido en inscripciones es rechazada por CHECK
SELECT throws_ok(
    $$ INSERT INTO public.inscripciones (estudiante_id, catedra_id, ciclo_id, estado_academico)
       VALUES ('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', 'ESTADO_INVALIDO') $$,
    '23514',
    NULL,
    'Test 1: inscripciones_estado_academico_check rechaza estados academicos invalidos'
);

-- Test 2: Inserción con estado canónico del RAM es aceptada
INSERT INTO public.inscripciones (id, estudiante_id, catedra_id, ciclo_id, estado_academico)
VALUES ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', 'REGULAR');

SELECT results_eq(
    $$ SELECT estado_academico FROM public.inscripciones WHERE id = '22222222-2222-2222-2222-222222222222' $$,
    $$ VALUES ('REGULAR'::text) $$,
    'Test 2: inscripciones acepta estado academico REGULAR del RAM'
);

-- Test 3: Evaluaciones acepta tipo canónico y extendido (FINAL, COLOQUIO)
INSERT INTO public.evaluaciones (id, catedra_id, titulo, tipo)
VALUES ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Final de Cátedra', 'FINAL');

SELECT results_eq(
    $$ SELECT tipo FROM public.evaluaciones WHERE id = '11111111-1111-1111-1111-111111111111' $$,
    $$ VALUES ('FINAL'::text) $$,
    'Test 3: evaluaciones acepta tipo extendido FINAL'
);

-- Test 4: Evaluaciones auto-normaliza variantes de texto ('Trabajo Práctico' -> 'TP')
INSERT INTO public.evaluaciones (id, catedra_id, titulo, tipo)
VALUES ('11111111-1111-1111-1111-111111111112', '44444444-4444-4444-4444-444444444444', 'Guía 1', 'Trabajo Práctico');

SELECT results_eq(
    $$ SELECT tipo FROM public.evaluaciones WHERE id = '11111111-1111-1111-1111-111111111112' $$,
    $$ VALUES ('TP'::text) $$,
    'Test 4: Trigger trg_normalize_evaluaciones_tipo auto-normaliza Trabajo Practico a TP'
);

-- Test 5: Periodos académicos auto-normaliza variantes ('1_CUATRIMESTRE' -> 'PRIMER_CUATRIMESTRE')
INSERT INTO public.periodos_academicos (id, ciclo_id, nombre, tipo, docente_id)
VALUES ('11111111-1111-1111-1111-111111111113', '55555555-5555-5555-5555-555555555555', 'Cuatrimestre 1', '1_CUATRIMESTRE', '77777777-7777-7777-7777-777777777777');

SELECT results_eq(
    $$ SELECT tipo FROM public.periodos_academicos WHERE id = '11111111-1111-1111-1111-111111111113' $$,
    $$ VALUES ('PRIMER_CUATRIMESTRE'::text) $$,
    'Test 5: Trigger trg_normalize_periodos_tipo normaliza variantes a PRIMER_CUATRIMESTRE'
);

-- Test 6: Asistencias auto-normaliza estado en minusculas a mayusculas
INSERT INTO public.clases (id, catedra_id, fecha, tema)
VALUES ('11111111-1111-1111-1111-111111111114', '44444444-4444-4444-4444-444444444444', CURRENT_DATE, 'Clase Test Asistencia');

INSERT INTO public.asistencias (clase_id, estudiante_id, estado)
VALUES ('11111111-1111-1111-1111-111111111114', '33333333-3333-3333-3333-333333333333', 'presente');

SELECT results_eq(
    $$ SELECT estado FROM public.asistencias WHERE clase_id = '11111111-1111-1111-1111-111111111114' AND estudiante_id = '33333333-3333-3333-3333-333333333333' $$,
    $$ VALUES ('PRESENTE'::text) $$,
    'Test 6: Trigger trg_normalize_asistencias_estado normaliza presente a PRESENTE'
);

-- Test 7: Recursos auto-normaliza categoria descriptiva a canonica
INSERT INTO public.recursos (id, catedra_id, titulo, categoria, tipo_origen, url)
VALUES ('11111111-1111-1111-1111-111111111115', '44444444-4444-4444-4444-444444444444', 'Material Teorico Unidad 1', 'Apunte Teórico', 'google_link', 'https://drive.google.com/test');

SELECT results_eq(
    $$ SELECT categoria, tipo_origen FROM public.recursos WHERE id = '11111111-1111-1111-1111-111111111115' $$,
    $$ VALUES ('APUNTE'::text, 'GOOGLE_LINK'::text) $$,
    'Test 7: Trigger trg_normalize_recursos_dominios normaliza categoria y tipo_origen'
);

SELECT * FROM finish();
ROLLBACK;
