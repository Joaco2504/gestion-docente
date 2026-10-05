BEGIN;
SELECT plan(6);

-- ==============================================================================
-- TEST RLS: AISLAMIENTO MULTI-DOCENTE EN DATOS Y STORAGE (pgTAP)
-- ==============================================================================

-- 1. SETUP DE DOCENTES DE PRUEBA
INSERT INTO auth.users (id, email, raw_user_meta_data, role, aud)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'docente.a@test.edu.ar', '{"nombre":"Docente A"}', 'authenticated', 'authenticated'),
    ('22222222-2222-2222-2222-222222222222', 'docente.b@test.edu.ar', '{"nombre":"Docente B"}', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.docentes (id, nombre, email)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Docente A', 'docente.a@test.edu.ar'),
    ('22222222-2222-2222-2222-222222222222', 'Docente B', 'docente.b@test.edu.ar')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.perfiles (id, email, nombre, rol)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'docente.a@test.edu.ar', 'Docente A', 'docente'),
    ('22222222-2222-2222-2222-222222222222', 'docente.b@test.edu.ar', 'Docente B', 'docente')
ON CONFLICT (id) DO NOTHING;

-- Institución y Ciclo
INSERT INTO public.instituciones (id, docente_id, nombre, nivel)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Instituto Central Test', 'TERCIARIO')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ciclos_lectivos (id, docente_id, nombre, institucion_id, anio)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Ciclo 2026', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 2026)
ON CONFLICT (id) DO NOTHING;

-- Docente A crea una cátedra propia
INSERT INTO public.catedras (id, institucion_id, ciclo_id, docente_id, nombre, nivel, modalidad)
VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111',
    'Matemática Discreta - Cátedra A',
    'TERCIARIO',
    'PRESENCIAL'
)
ON CONFLICT (id) DO NOTHING;

-- Docente A tiene un archivo en Storage
INSERT INTO storage.objects (id, bucket_id, name, owner)
VALUES (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'archivos-docentes',
    '11111111-1111-1111-1111-111111111111/cccccccc-cccc-cccc-cccc-cccccccccccc/tp1_consignas.pdf',
    '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 2. SIMULAR CONTEXTO DE DOCENTE B (AUTHENTICATED)
-- ==============================================================================
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated", "email": "docente.b@test.edu.ar"}';

-- TEST 1: Docente B NO puede ver cátedras de Docente A
SELECT is_empty(
    $$ SELECT id FROM public.catedras WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
    'Docente B no puede ver cátedras pertenecientes a Docente A'
);

-- TEST 2: Docente B NO puede modificar cátedras de Docente A
UPDATE public.catedras
SET nombre = 'Hackeada por Docente B'
WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

SELECT is(
    (SELECT nombre FROM public.catedras WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
    NULL,
    'Docente B no pudo modificar el nombre de la cátedra de Docente A'
);

-- TEST 3: Docente B NO puede borrar cátedras de Docente A
DELETE FROM public.catedras
WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

-- Volver temporalmente a superuser para verificar que sigue intacta
RESET ROLE;
SELECT results_eq(
    $$ SELECT nombre FROM public.catedras WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
    $$ VALUES ('Matemática Discreta - Cátedra A') $$,
    'La cátedra de Docente A sigue intacta tras intento de borrado de Docente B'
);

-- Volver a rol Docente B para tests de Storage
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

-- TEST 4: Docente B NO puede modificar archivo de Storage de Docente A
UPDATE storage.objects
SET metadata = '{"hack": true}'::jsonb
WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

RESET ROLE;
SELECT is(
    (SELECT (metadata->>'hack')::text FROM storage.objects WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
    NULL,
    'El archivo en storage de Docente A no pudo ser modificado por Docente B'
);

-- TEST 5: Docente B NO puede subir archivos en la carpeta de Docente A
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

SELECT throws_ok(
    $$ INSERT INTO storage.objects (id, bucket_id, name, owner)
       VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'archivos-docentes', '11111111-1111-1111-1111-111111111111/cccccccc-cccc-cccc-cccc-cccccccccccc/malicioso.exe', '22222222-2222-2222-2222-222222222222') $$,
    '42501',
    NULL,
    'Docente B recibe error de violación de RLS al intentar subir en carpeta de Docente A'
);

-- TEST 6: Docente B SÍ puede subir archivos en su propia carpeta
SELECT lives_ok(
    $$ INSERT INTO storage.objects (id, bucket_id, name, owner)
       VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'archivos-docentes', '22222222-2222-2222-2222-222222222222/catedra-b/legitimo.pdf', '22222222-2222-2222-2222-222222222222') $$,
    'Docente B puede subir legítimamente archivos en su propia carpeta en storage'
);

SELECT * FROM finish();
ROLLBACK;
