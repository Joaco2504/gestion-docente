BEGIN;
SELECT plan(5);

-- Setup: Docente, Institución, Ciclo y Cátedra de prueba
INSERT INTO auth.users (id, email)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'docente.evals@test.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.instituciones (id, nombre, nivel, docente_id)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Instituto Evals', 'Superior', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ciclos_lectivos (id, nombre, anio, docente_id)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Ciclo 2026', 2026, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.catedras (id, nombre, nivel, docente_id, institucion_id, ciclo_id)
VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Cátedra Evals', 'Superior', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc')
ON CONFLICT (id) DO NOTHING;

-- Test 1: Inserción canónica con fecha_entrega sincroniza automáticamente 'fecha'
INSERT INTO public.evaluaciones (id, catedra_id, titulo, tipo, fecha_entrega)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'TP 1 Redes', 'TP', '2026-06-15');

SELECT results_eq(
    $$ SELECT fecha FROM public.evaluaciones WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1' $$,
    $$ VALUES ('2026-06-15'::date) $$,
    'Test 1: Escribir fecha_entrega propaga automáticamente fecha'
);

-- Test 2: Inserción de cliente legado con 'fecha' propaga automáticamente 'fecha_entrega'
INSERT INTO public.evaluaciones (id, catedra_id, titulo, tipo, fecha)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Parcial 1 Redes', 'PARCIAL', '2026-06-20');

SELECT results_eq(
    $$ SELECT fecha_entrega FROM public.evaluaciones WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2' $$,
    $$ VALUES ('2026-06-20'::date) $$,
    'Test 2: Escribir fecha propaga automáticamente fecha_entrega'
);

-- Test 3: Actualización de fecha_entrega actualiza 'fecha' en tándem
UPDATE public.evaluaciones
SET fecha_entrega = '2026-06-25'
WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1';

SELECT results_eq(
    $$ SELECT fecha FROM public.evaluaciones WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1' $$,
    $$ VALUES ('2026-06-25'::date) $$,
    'Test 3: UPDATE en fecha_entrega sincroniza fecha'
);

-- Test 4: Omitir fecha no asume CURRENT_DATE (ambos quedan NULL)
INSERT INTO public.evaluaciones (id, catedra_id, titulo, tipo)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'TP Sin Fecha', 'TP');

SELECT results_eq(
    $$ SELECT fecha_entrega, fecha FROM public.evaluaciones WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3' $$,
    $$ VALUES (NULL::date, NULL::date) $$,
    'Test 4: Evaluación sin fecha no es sobreescrita con CURRENT_DATE'
);

-- Test 5: Cero discrepancias entre fecha_entrega y fecha en toda la tabla
SELECT is(
    (SELECT count(*) FROM public.evaluaciones WHERE fecha_entrega IS DISTINCT FROM fecha)::integer,
    0,
    'Test 5: Cero discrepancias entre fecha_entrega y fecha'
);

SELECT * FROM finish();
ROLLBACK;
