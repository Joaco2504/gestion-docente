BEGIN;
SELECT plan(7);

-- Setup: Docente, Cátedra, Estudiante y Evaluaciones de prueba
INSERT INTO auth.users (id, email)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'docente.notas@test.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.instituciones (id, nombre, nivel, docente_id)
VALUES ('22222222-2222-2222-2222-222222222222', 'Instituto Test Notas', 'Superior', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ciclos_lectivos (id, nombre, anio, docente_id)
VALUES ('33333333-3333-3333-3333-333333333333', 'Ciclo 2026', 2026, '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.catedras (id, nombre, nivel, docente_id, institucion_id, ciclo_id)
VALUES ('44444444-4444-4444-4444-444444444444', 'Cátedra Notas', 'Superior', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.estudiantes (id, nombre, apellido, dni, docente_id)
VALUES ('55555555-5555-5555-5555-555555555555', 'Alumno', 'Notas', '88888888', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.evaluaciones (id, catedra_id, titulo, tipo, fecha_entrega)
VALUES 
    ('66666666-6666-6666-6666-666666666661', '44444444-4444-4444-4444-444444444444', 'Parcial 1', 'PARCIAL', '2026-05-10'),
    ('66666666-6666-6666-6666-666666666662', '44444444-4444-4444-4444-444444444444', 'TP 1', 'TP', '2026-05-15'),
    ('66666666-6666-6666-6666-666666666663', '44444444-4444-4444-4444-444444444444', 'TP 2', 'TP', '2026-05-20'),
    ('66666666-6666-6666-6666-666666666664', '44444444-4444-4444-4444-444444444444', 'Parcial 2', 'PARCIAL', '2026-06-10')
ON CONFLICT (id) DO NOTHING;

-- Test 1: Inserción canónica con 'valor' sincroniza automáticamente 'nota' y 'calificacion'
INSERT INTO public.notas (evaluacion_id, estudiante_id, valor, estado)
VALUES ('66666666-6666-6666-6666-666666666661', '55555555-5555-5555-5555-555555555555', 8.50, 'CALIFICADO');

SELECT results_eq(
    $$ SELECT nota, calificacion FROM public.notas WHERE evaluacion_id = '66666666-6666-6666-6666-666666666661' $$,
    $$ VALUES (8.50::numeric, 8.50::numeric) $$,
    'Test 1: Escribir en valor propaga nota y calificacion'
);

-- Test 2: Inserción de cliente legado con 'nota' sincroniza automáticamente 'valor'
INSERT INTO public.notas (evaluacion_id, estudiante_id, nota)
VALUES ('66666666-6666-6666-6666-666666666662', '55555555-5555-5555-5555-555555555555', 9.00);

SELECT results_eq(
    $$ SELECT valor, estado FROM public.notas WHERE evaluacion_id = '66666666-6666-6666-6666-666666666662' $$,
    $$ VALUES (9.00::numeric, 'CALIFICADO'::text) $$,
    'Test 2: Escribir en nota propaga valor y asigna estado CALIFICADO'
);

-- Test 3: Marcar 'NO_ENTREGO' fuerza valor = NULL y nota = NULL
INSERT INTO public.notas (evaluacion_id, estudiante_id, valor, estado)
VALUES ('66666666-6666-6666-6666-666666666663', '55555555-5555-5555-5555-555555555555', 1.00, 'NO_ENTREGO');

SELECT results_eq(
    $$ SELECT valor, nota FROM public.notas WHERE evaluacion_id = '66666666-6666-6666-6666-666666666663' $$,
    $$ VALUES (NULL::numeric, NULL::numeric) $$,
    'Test 3: Marcar NO_ENTREGO garantiza valor = NULL y nota = NULL'
);

-- Test 4: Marcar 'AUSENTE' fuerza valor = NULL y nota = NULL
INSERT INTO public.notas (evaluacion_id, estudiante_id, valor, estado)
VALUES ('66666666-6666-6666-6666-666666666664', '55555555-5555-5555-5555-555555555555', 5.00, 'AUSENTE');

SELECT results_eq(
    $$ SELECT valor, nota FROM public.notas WHERE evaluacion_id = '66666666-6666-6666-6666-666666666664' $$,
    $$ VALUES (NULL::numeric, NULL::numeric) $$,
    'Test 4: Marcar AUSENTE garantiza valor = NULL y nota = NULL'
);

-- Test 5: Update a nota existente modifica en tándem ambas columnas
UPDATE public.notas 
SET valor = 10.00, estado = 'CALIFICADO'
WHERE evaluacion_id = '66666666-6666-6666-6666-666666666661';

SELECT results_eq(
    $$ SELECT valor, nota FROM public.notas WHERE evaluacion_id = '66666666-6666-6666-6666-666666666661' $$,
    $$ VALUES (10.00::numeric, 10.00::numeric) $$,
    'Test 5: UPDATE a valor mantiene nota sincronizada'
);

-- Test 6: Constraint rechaza violación directa de consistencia (evitando estados corruptos)
SELECT throws_ok(
    $$ 
        INSERT INTO public.notas (id, evaluacion_id, estudiante_id, valor, estado)
        OVERRIDING SYSTEM VALUE
        VALUES (
            gen_random_uuid(),
            '66666666-6666-6666-6666-666666666661',
            '55555555-5555-5555-5555-555555555555',
            7.0,
            'NO_ENTREGO'
        )
    $$,
    '23505', -- O error 23505/23514 por duplicado o check
    NULL,
    'Test 6: Inserción inválida es rechazada por constraints'
);

-- Test 7: Cero discrepancia entre valor y nota en filas existentes
SELECT is(
    (SELECT count(*) FROM public.notas WHERE (estado = 'CALIFICADO' AND valor IS DISTINCT FROM nota))::integer,
    0,
    'Test 7: Cero divergencia entre valor y nota en todos los registros calificados'
);

SELECT * FROM finish();
ROLLBACK;
