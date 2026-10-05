BEGIN;
SELECT plan(5);

-- Setup: Docente, Institución, Ciclo, Cátedra y Estudiantes de prueba
INSERT INTO auth.users (id, email)
VALUES ('31313131-3131-3131-3131-313131313131', 'docente.insc@test.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.instituciones (id, nombre, nivel, docente_id)
VALUES ('42424242-4242-4242-4242-424242424242', 'Instituto Inscripciones', 'Superior', '31313131-3131-3131-3131-313131313131')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ciclos_lectivos (id, nombre, anio, docente_id)
VALUES ('53535353-5353-5353-5353-535353535353', 'Ciclo 2026', 2026, '31313131-3131-3131-3131-313131313131')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.catedras (id, nombre, nivel, docente_id, institucion_id, ciclo_id)
VALUES ('64646464-6464-6464-6464-646464646464', 'Cátedra Inscripciones', 'Superior', '31313131-3131-3131-3131-313131313131', '42424242-4242-4242-4242-424242424242', '53535353-5353-5353-5353-535353535353')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.estudiantes (id, nombre, apellido, dni, docente_id)
VALUES 
    ('75757575-7575-7575-7575-757575757571', 'Estudiante 1', 'Test', '11112222', '31313131-3131-3131-3131-313131313131'),
    ('75757575-7575-7575-7575-757575757572', 'Estudiante 2', 'Test', '22223333', '31313131-3131-3131-3131-313131313131'),
    ('75757575-7575-7575-7575-757575757573', 'Estudiante 3', 'Test', '33334444', '31313131-3131-3131-3131-313131313131')
ON CONFLICT (id) DO NOTHING;

-- Test 1: Inserción canónica con estado_academico propaga automáticamente estado_ram
INSERT INTO public.inscripciones (id, estudiante_id, catedra_id, ciclo_id, estado_academico)
VALUES (
    '86868686-8686-8686-8686-868686868681',
    '75757575-7575-7575-7575-757575757571',
    '64646464-6464-6464-6464-646464646464',
    '53535353-5353-5353-5353-535353535353',
    'REGULAR'
);

SELECT results_eq(
    $$ SELECT estado_ram FROM public.inscripciones WHERE id = '86868686-8686-8686-8686-868686868681' $$,
    $$ VALUES ('REGULAR'::text) $$,
    'Test 1: Inserción con estado_academico propaga estado_ram'
);

-- Test 2: Inserción de cliente legado con estado_ram propaga estado_academico
INSERT INTO public.inscripciones (id, estudiante_id, catedra_id, ciclo_id, estado_ram)
VALUES (
    '86868686-8686-8686-8686-868686868682',
    '75757575-7575-7575-7575-757575757572',
    '64646464-6464-6464-6464-646464646464',
    '53535353-5353-5353-5353-535353535353',
    'PROMOCIONADO'
);

SELECT results_eq(
    $$ SELECT estado_academico FROM public.inscripciones WHERE id = '86868686-8686-8686-8686-868686868682' $$,
    $$ VALUES ('PROMOCIONADO'::text) $$,
    'Test 2: Inserción con estado_ram propaga estado_academico'
);

-- Test 3: Actualización de estado_academico propaga a estado_ram
UPDATE public.inscripciones
SET estado_academico = 'LIBRE'
WHERE id = '86868686-8686-8686-8686-868686868681';

SELECT results_eq(
    $$ SELECT estado_ram FROM public.inscripciones WHERE id = '86868686-8686-8686-8686-868686868681' $$,
    $$ VALUES ('LIBRE'::text) $$,
    'Test 3: UPDATE en estado_academico sincroniza estado_ram'
);

-- Test 4: Inserción sin estado asigna 'CURSANDO' por defecto en ambos
INSERT INTO public.inscripciones (id, estudiante_id, catedra_id, ciclo_id)
VALUES (
    '86868686-8686-8686-8686-868686868683',
    '75757575-7575-7575-7575-757575757573',
    '64646464-6464-6464-6464-646464646464',
    '53535353-5353-5353-5353-535353535353'
);

SELECT results_eq(
    $$ SELECT estado_academico, estado_ram FROM public.inscripciones WHERE id = '86868686-8686-8686-8686-868686868683' $$,
    $$ VALUES ('CURSANDO'::text, 'CURSANDO'::text) $$,
    'Test 4: Inserción sin estado asigna CURSANDO por defecto'
);

-- Test 5: Cero discrepancias entre estado_academico y estado_ram
SELECT is(
    (SELECT count(*) FROM public.inscripciones WHERE estado_academico IS DISTINCT FROM estado_ram)::integer,
    0,
    'Test 5: Cero divergencias entre estado_academico y estado_ram'
);

SELECT * FROM finish();
ROLLBACK;
