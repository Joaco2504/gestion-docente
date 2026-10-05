BEGIN;
SELECT plan(6);

-- Setup: Docente, Institución, Ciclo y Cátedra de prueba
INSERT INTO auth.users (id, email)
VALUES ('12121212-1212-1212-1212-121212121212', 'docente.rec@test.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.instituciones (id, nombre, nivel, docente_id)
VALUES ('23232323-2323-2323-2323-232323232323', 'Instituto Recursos', 'Superior', '12121212-1212-1212-1212-121212121212')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ciclos_lectivos (id, nombre, anio, docente_id)
VALUES ('34343434-3434-3434-3434-343434343434', 'Ciclo 2026', 2026, '12121212-1212-1212-1212-121212121212')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.catedras (id, nombre, nivel, docente_id, institucion_id, ciclo_id)
VALUES ('45454545-4545-4545-4545-454545454545', 'Cátedra Recursos', 'Superior', '12121212-1212-1212-1212-121212121212', '23232323-2323-2323-2323-232323232323', '34343434-3434-3434-3434-343434343434')
ON CONFLICT (id) DO NOTHING;

-- Test 1: Inserción canónica con url_o_path propaga automáticamente a url
INSERT INTO public.recursos (id, catedra_id, categoria, tipo_origen, titulo, url_o_path)
VALUES (
    '56565656-5656-5656-5656-565656565651',
    '45454545-4545-4545-4545-454545454545',
    'APUNTE',
    'GOOGLE_LINK',
    'Apunte Unidad 1',
    'https://drive.google.com/apunte1'
);

SELECT results_eq(
    $$ SELECT url FROM public.recursos WHERE id = '56565656-5656-5656-5656-565656565651' $$,
    $$ VALUES ('https://drive.google.com/apunte1'::text) $$,
    'Test 1: Inserción con url_o_path propaga url'
);

-- Test 2: Inserción de cliente legado con url propaga a url_o_path
INSERT INTO public.recursos (id, catedra_id, categoria, tipo_origen, titulo, url)
VALUES (
    '56565656-5656-5656-5656-565656565652',
    '45454545-4545-4545-4545-454545454545',
    'BIBLIOGRAFIA',
    'GOOGLE_LINK',
    'Libro Redes Tanenbaum',
    'https://drive.google.com/libro'
);

SELECT results_eq(
    $$ SELECT url_o_path FROM public.recursos WHERE id = '56565656-5656-5656-5656-565656565652' $$,
    $$ VALUES ('https://drive.google.com/libro'::text) $$,
    'Test 2: Inserción con url propaga url_o_path'
);

-- Test 3: Inserción con tipo = 'enlace' normaliza tipo_origen = 'GOOGLE_LINK'
INSERT INTO public.recursos (id, catedra_id, categoria, tipo, titulo, url_o_path)
VALUES (
    '56565656-5656-5656-5656-565656565653',
    '45454545-4545-4545-4545-454545454545',
    'TP',
    'enlace',
    'Consigna TP 1',
    'https://drive.google.com/tp1'
);

SELECT results_eq(
    $$ SELECT tipo_origen, tipo FROM public.recursos WHERE id = '56565656-5656-5656-5656-565656565653' $$,
    $$ VALUES ('GOOGLE_LINK'::text, 'GOOGLE_LINK'::text) $$,
    'Test 3: tipo enlace normaliza a GOOGLE_LINK'
);

-- Test 4: Inserción con tipo = 'local' normaliza tipo_origen = 'LOCAL'
INSERT INTO public.recursos (id, catedra_id, categoria, tipo, titulo, url_o_path)
VALUES (
    '56565656-5656-5656-5656-565656565654',
    '45454545-4545-4545-4545-454545454545',
    'PLANIFICACION',
    'local',
    'Planificación Anual',
    'docente/cat/plan.pdf'
);

SELECT results_eq(
    $$ SELECT tipo_origen, tipo FROM public.recursos WHERE id = '56565656-5656-5656-5656-565656565654' $$,
    $$ VALUES ('LOCAL'::text, 'LOCAL'::text) $$,
    'Test 4: tipo local normaliza a LOCAL'
);

-- Test 5: visible_alumnos asigna true por defecto y puede mutarse
INSERT INTO public.recursos (id, catedra_id, categoria, tipo_origen, titulo, url_o_path, visible_alumnos)
VALUES (
    '56565656-5656-5656-5656-565656565655',
    '45454545-4545-4545-4545-454545454545',
    'PARCIAL',
    'GOOGLE_LINK',
    'Solución Parcial Oculta',
    'https://drive.google.com/solucion',
    false
);

SELECT results_eq(
    $$ SELECT visible_alumnos FROM public.recursos WHERE id = '56565656-5656-5656-5656-565656565655' $$,
    $$ VALUES (false) $$,
    'Test 5: visible_alumnos persiste false explícito'
);

-- Test 6: Cero discrepancias en campos de ubicación url_o_path vs url
SELECT is(
    (SELECT count(*) FROM public.recursos WHERE url_o_path IS DISTINCT FROM url)::integer,
    0,
    'Test 6: Cero divergencias entre url_o_path y url'
);

SELECT * FROM finish();
ROLLBACK;
