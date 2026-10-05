-- ====================================================================
-- KORUM / GESTION-DOCENTE: BASELINE SCHEMA MIGRATION
-- Generated from live Supabase Cloud database state
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- --------------------------------------------------------------------
-- 2. TABLES & COLUMNS
-- --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.docentes (
    id UUID NOT NULL,
    nombre TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID NOT NULL,
    email TEXT,
    nombre TEXT,
    rol TEXT DEFAULT 'docente'::text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.instituciones (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    docente_id UUID DEFAULT auth.uid() NOT NULL,
    nombre TEXT NOT NULL,
    nivel TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    activa BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.ciclos_lectivos (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    docente_id UUID DEFAULT auth.uid() NOT NULL,
    anio INTEGER NOT NULL,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    nombre TEXT,
    institucion_id UUID
);

CREATE TABLE IF NOT EXISTS public.periodos_academicos (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    ciclo_id UUID NOT NULL,
    nombre TEXT NOT NULL,
    fecha_inicio DATE,
    fecha_fin DATE,
    tipo TEXT,
    docente_id UUID DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS public.configuracion_sistema (
    id TEXT DEFAULT 'global'::text NOT NULL,
    modo_mantenimiento BOOLEAN DEFAULT false,
    banner_mensaje TEXT DEFAULT ''::text,
    banner_activo BOOLEAN DEFAULT false,
    permitir_nuevos_registros BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.catedras (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    institucion_id UUID NOT NULL,
    ciclo_id UUID NOT NULL,
    docente_id UUID DEFAULT auth.uid() NOT NULL,
    nombre TEXT NOT NULL,
    nivel TEXT NOT NULL,
    modalidad TEXT DEFAULT 'Presencial'::text NOT NULL,
    horarios_semanales JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    portal_activo BOOLEAN DEFAULT false,
    portal_mostrar_asistencia BOOLEAN DEFAULT true,
    portal_mostrar_notas BOOLEAN DEFAULT true,
    portal_mostrar_condicion BOOLEAN DEFAULT true,
    cursada_finalizada BOOLEAN DEFAULT false,
    fecha_cierre_cursada TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ram_asistencia_regular INTEGER DEFAULT 70,
    ram_asistencia_trabajo INTEGER DEFAULT 60,
    ram_asistencia_promocion INTEGER DEFAULT 80
);

CREATE TABLE IF NOT EXISTS public.estudiantes (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    docente_id UUID DEFAULT auth.uid() NOT NULL,
    dni TEXT NOT NULL,
    apellido TEXT NOT NULL,
    nombre TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    legajo TEXT,
    email TEXT,
    telefono TEXT,
    observaciones TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.criterios_evaluacion (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    catedra_id UUID NOT NULL,
    min_asist_promo NUMERIC DEFAULT 80,
    min_asist_reg NUMERIC DEFAULT 70,
    nota_min_promo NUMERIC DEFAULT 7,
    nota_min_reg NUMERIC DEFAULT 4,
    nota_min_sec NUMERIC DEFAULT 6
);

CREATE TABLE IF NOT EXISTS public.unidades_tematicas (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    catedra_id UUID NOT NULL,
    docente_id UUID DEFAULT auth.uid() NOT NULL,
    numero INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inscripciones (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    estudiante_id UUID NOT NULL,
    catedra_id UUID NOT NULL,
    ciclo_id UUID NOT NULL,
    estado_academico TEXT DEFAULT 'CURSANDO'::text,
    nota_final_acreditacion NUMERIC,
    fecha_acreditacion TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    nota_final NUMERIC,
    condicion TEXT DEFAULT 'REGULAR'::text,
    estado TEXT DEFAULT 'ACTIVO'::text,
    porcentaje_asistencia NUMERIC DEFAULT 0,
    observaciones TEXT,
    fecha_inscripcion DATE DEFAULT CURRENT_DATE,
    tiene_certificado_trabajo BOOLEAN DEFAULT false,
    es_equivalencia BOOLEAN DEFAULT false,
    resolucion_equivalencia TEXT,
    fecha_equivalencia DATE
);

CREATE TABLE IF NOT EXISTS public.clases (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    catedra_id UUID NOT NULL,
    fecha DATE DEFAULT CURRENT_DATE NOT NULL,
    tema TEXT NOT NULL,
    caracter_clase TEXT DEFAULT 'Teórico-Práctica'::text,
    horas_catedra INTEGER DEFAULT 2,
    observaciones TEXT,
    caracter TEXT DEFAULT 'TEORICA'::text,
    archivo_adjunto TEXT DEFAULT ''::text,
    unidad_id UUID,
    unidad_texto TEXT,
    numero_clase INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    contenido TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asistencias (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    clase_id UUID NOT NULL,
    estudiante_id UUID NOT NULL,
    estado TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.evaluaciones (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    catedra_id UUID NOT NULL,
    periodo_id UUID,
    titulo TEXT NOT NULL,
    tipo TEXT NOT NULL,
    evaluacion_origen_id UUID,
    fecha_entrega DATE,
    archivo_url TEXT,
    archivo_nombre TEXT,
    fecha DATE DEFAULT CURRENT_DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ponderacion NUMERIC DEFAULT 1,
    escala_maxima NUMERIC DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notas (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    evaluacion_id UUID NOT NULL,
    estudiante_id UUID NOT NULL,
    valor NUMERIC(4,2),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    observaciones TEXT,
    nota NUMERIC,
    calificacion NUMERIC,
    estado TEXT DEFAULT 'CALIFICADO'::text
);

CREATE TABLE IF NOT EXISTS public.recursos (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    catedra_id UUID NOT NULL,
    categoria TEXT NOT NULL,
    tipo_origen TEXT NOT NULL,
    titulo TEXT NOT NULL,
    url_o_path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mesas_examen (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    catedra_id UUID NOT NULL,
    docente_id UUID DEFAULT auth.uid() NOT NULL,
    fecha DATE NOT NULL,
    turno_llamado TEXT NOT NULL,
    libro TEXT,
    folio TEXT,
    acta_numero TEXT,
    presidente TEXT NOT NULL,
    vocal_1 TEXT,
    vocal_2 TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    tomo TEXT,
    tipo_mesa TEXT DEFAULT 'EXAMEN_FINAL'::text,
    condicion_acta TEXT DEFAULT 'REGULAR'::text
);

CREATE TABLE IF NOT EXISTS public.actas_examen_estudiantes (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    mesa_id UUID NOT NULL,
    estudiante_id UUID NOT NULL,
    condicion_previa TEXT DEFAULT 'Regular'::text,
    nota_escrito NUMERIC(4,2),
    nota_oral NUMERIC(4,2),
    nota_definitiva NUMERIC(4,2),
    resultado TEXT,
    observaciones TEXT
);

CREATE TABLE IF NOT EXISTS public.actas_examen_alumnos (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    mesa_id UUID NOT NULL,
    estudiante_id UUID,
    alumno_nombre_completo TEXT DEFAULT ''::text NOT NULL,
    alumno_dni TEXT DEFAULT ''::text NOT NULL,
    condicion_previa TEXT DEFAULT 'REGULAR'::text NOT NULL,
    nota_escrito NUMERIC(4,2),
    nota_oral NUMERIC(4,2),
    nota_definitiva NUMERIC(4,2),
    dictamen TEXT DEFAULT 'AUSENTE'::text NOT NULL,
    observaciones TEXT DEFAULT ''::text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.actas_examen_detalle (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    mesa_id UUID NOT NULL,
    estudiante_id UUID NOT NULL,
    catedra_id UUID NOT NULL,
    condicion_al_rendir TEXT NOT NULL,
    nota_escrito NUMERIC,
    nota_oral NUMERIC,
    nota_definitiva NUMERIC,
    resultado TEXT NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.eventos_calendario (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    docente_id UUID DEFAULT auth.uid() NOT NULL,
    titulo TEXT NOT NULL,
    tipo TEXT NOT NULL,
    fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_fin TIMESTAMP WITH TIME ZONE NOT NULL,
    notas TEXT,
    editable BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.inasistencias_docente (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    docente_id UUID DEFAULT auth.uid() NOT NULL,
    catedra_id UUID,
    fecha DATE NOT NULL,
    tipo TEXT NOT NULL,
    articulo_licencia TEXT,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- --------------------------------------------------------------------
-- 3. CONSTRAINTS (Primary Keys, Foreign Keys, Checks, Unique)
-- --------------------------------------------------------------------

ALTER TABLE public.actas_examen_alumnos DROP CONSTRAINT IF EXISTS actas_examen_alumnos_pkey;
ALTER TABLE public.actas_examen_alumnos ADD CONSTRAINT actas_examen_alumnos_pkey PRIMARY KEY (id);

ALTER TABLE public.actas_examen_detalle DROP CONSTRAINT IF EXISTS actas_examen_detalle_pkey;
ALTER TABLE public.actas_examen_detalle ADD CONSTRAINT actas_examen_detalle_pkey PRIMARY KEY (id);

ALTER TABLE public.actas_examen_estudiantes DROP CONSTRAINT IF EXISTS actas_examen_estudiantes_pkey;
ALTER TABLE public.actas_examen_estudiantes ADD CONSTRAINT actas_examen_estudiantes_pkey PRIMARY KEY (id);

ALTER TABLE public.asistencias DROP CONSTRAINT IF EXISTS asistencias_pkey;
ALTER TABLE public.asistencias ADD CONSTRAINT asistencias_pkey PRIMARY KEY (id);

ALTER TABLE public.catedras DROP CONSTRAINT IF EXISTS catedras_pkey;
ALTER TABLE public.catedras ADD CONSTRAINT catedras_pkey PRIMARY KEY (id);

ALTER TABLE public.ciclos_lectivos DROP CONSTRAINT IF EXISTS ciclos_lectivos_pkey;
ALTER TABLE public.ciclos_lectivos ADD CONSTRAINT ciclos_lectivos_pkey PRIMARY KEY (id);

ALTER TABLE public.clases DROP CONSTRAINT IF EXISTS clases_pkey;
ALTER TABLE public.clases ADD CONSTRAINT clases_pkey PRIMARY KEY (id);

ALTER TABLE public.configuracion_sistema DROP CONSTRAINT IF EXISTS configuracion_sistema_pkey;
ALTER TABLE public.configuracion_sistema ADD CONSTRAINT configuracion_sistema_pkey PRIMARY KEY (id);

ALTER TABLE public.criterios_evaluacion DROP CONSTRAINT IF EXISTS criterios_evaluacion_pkey;
ALTER TABLE public.criterios_evaluacion ADD CONSTRAINT criterios_evaluacion_pkey PRIMARY KEY (id);

ALTER TABLE public.docentes DROP CONSTRAINT IF EXISTS docentes_pkey;
ALTER TABLE public.docentes ADD CONSTRAINT docentes_pkey PRIMARY KEY (id);

ALTER TABLE public.estudiantes DROP CONSTRAINT IF EXISTS estudiantes_pkey;
ALTER TABLE public.estudiantes ADD CONSTRAINT estudiantes_pkey PRIMARY KEY (id);

ALTER TABLE public.evaluaciones DROP CONSTRAINT IF EXISTS evaluaciones_pkey;
ALTER TABLE public.evaluaciones ADD CONSTRAINT evaluaciones_pkey PRIMARY KEY (id);

ALTER TABLE public.eventos_calendario DROP CONSTRAINT IF EXISTS eventos_calendario_pkey;
ALTER TABLE public.eventos_calendario ADD CONSTRAINT eventos_calendario_pkey PRIMARY KEY (id);

ALTER TABLE public.inasistencias_docente DROP CONSTRAINT IF EXISTS inasistencias_docente_pkey;
ALTER TABLE public.inasistencias_docente ADD CONSTRAINT inasistencias_docente_pkey PRIMARY KEY (id);

ALTER TABLE public.inscripciones DROP CONSTRAINT IF EXISTS inscripciones_pkey;
ALTER TABLE public.inscripciones ADD CONSTRAINT inscripciones_pkey PRIMARY KEY (id);

ALTER TABLE public.instituciones DROP CONSTRAINT IF EXISTS instituciones_pkey;
ALTER TABLE public.instituciones ADD CONSTRAINT instituciones_pkey PRIMARY KEY (id);

ALTER TABLE public.mesas_examen DROP CONSTRAINT IF EXISTS mesas_examen_pkey;
ALTER TABLE public.mesas_examen ADD CONSTRAINT mesas_examen_pkey PRIMARY KEY (id);

ALTER TABLE public.notas DROP CONSTRAINT IF EXISTS notas_pkey;
ALTER TABLE public.notas ADD CONSTRAINT notas_pkey PRIMARY KEY (id);

ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS perfiles_pkey;
ALTER TABLE public.perfiles ADD CONSTRAINT perfiles_pkey PRIMARY KEY (id);

ALTER TABLE public.periodos_academicos DROP CONSTRAINT IF EXISTS periodos_academicos_pkey;
ALTER TABLE public.periodos_academicos ADD CONSTRAINT periodos_academicos_pkey PRIMARY KEY (id);

ALTER TABLE public.recursos DROP CONSTRAINT IF EXISTS recursos_pkey;
ALTER TABLE public.recursos ADD CONSTRAINT recursos_pkey PRIMARY KEY (id);

ALTER TABLE public.unidades_tematicas DROP CONSTRAINT IF EXISTS unidades_tematicas_pkey;
ALTER TABLE public.unidades_tematicas ADD CONSTRAINT unidades_tematicas_pkey PRIMARY KEY (id);

ALTER TABLE public.actas_examen_detalle DROP CONSTRAINT IF EXISTS actas_examen_detalle_mesa_id_estudiante_id_key;
ALTER TABLE public.actas_examen_detalle ADD CONSTRAINT actas_examen_detalle_mesa_id_estudiante_id_key UNIQUE (mesa_id, estudiante_id);

ALTER TABLE public.actas_examen_estudiantes DROP CONSTRAINT IF EXISTS actas_examen_estudiantes_mesa_id_estudiante_id_key;
ALTER TABLE public.actas_examen_estudiantes ADD CONSTRAINT actas_examen_estudiantes_mesa_id_estudiante_id_key UNIQUE (mesa_id, estudiante_id);

ALTER TABLE public.asistencias DROP CONSTRAINT IF EXISTS asistencias_clase_estudiante_key;
ALTER TABLE public.asistencias ADD CONSTRAINT asistencias_clase_estudiante_key UNIQUE (clase_id, estudiante_id);

ALTER TABLE public.asistencias DROP CONSTRAINT IF EXISTS asistencias_clase_id_estudiante_id_key;
ALTER TABLE public.asistencias ADD CONSTRAINT asistencias_clase_id_estudiante_id_key UNIQUE (clase_id, estudiante_id);

ALTER TABLE public.criterios_evaluacion DROP CONSTRAINT IF EXISTS criterios_evaluacion_catedra_id_key;
ALTER TABLE public.criterios_evaluacion ADD CONSTRAINT criterios_evaluacion_catedra_id_key UNIQUE (catedra_id);

ALTER TABLE public.estudiantes DROP CONSTRAINT IF EXISTS estudiantes_docente_dni_key;
ALTER TABLE public.estudiantes ADD CONSTRAINT estudiantes_docente_dni_key UNIQUE (docente_id, dni);

ALTER TABLE public.inscripciones DROP CONSTRAINT IF EXISTS inscripciones_estudiante_catedra_ciclo_key;
ALTER TABLE public.inscripciones ADD CONSTRAINT inscripciones_estudiante_catedra_ciclo_key UNIQUE (estudiante_id, catedra_id, ciclo_id);

ALTER TABLE public.inscripciones DROP CONSTRAINT IF EXISTS inscripciones_estudiante_id_catedra_id_ciclo_id_key;
ALTER TABLE public.inscripciones ADD CONSTRAINT inscripciones_estudiante_id_catedra_id_ciclo_id_key UNIQUE (estudiante_id, catedra_id, ciclo_id);

ALTER TABLE public.notas DROP CONSTRAINT IF EXISTS notas_evaluacion_estudiante_key;
ALTER TABLE public.notas ADD CONSTRAINT notas_evaluacion_estudiante_key UNIQUE (evaluacion_id, estudiante_id);

ALTER TABLE public.notas DROP CONSTRAINT IF EXISTS notas_evaluacion_id_estudiante_id_key;
ALTER TABLE public.notas ADD CONSTRAINT notas_evaluacion_id_estudiante_id_key UNIQUE (evaluacion_id, estudiante_id);

ALTER TABLE public.periodos_academicos DROP CONSTRAINT IF EXISTS periodos_academicos_ciclo_tipo_key;
ALTER TABLE public.periodos_academicos ADD CONSTRAINT periodos_academicos_ciclo_tipo_key UNIQUE (ciclo_id, tipo);

ALTER TABLE public.unidades_tematicas DROP CONSTRAINT IF EXISTS unidades_catedra_numero_key;
ALTER TABLE public.unidades_tematicas ADD CONSTRAINT unidades_catedra_numero_key UNIQUE (catedra_id, numero);

ALTER TABLE public.unidades_tematicas DROP CONSTRAINT IF EXISTS unidades_tematicas_catedra_id_numero_key;
ALTER TABLE public.unidades_tematicas ADD CONSTRAINT unidades_tematicas_catedra_id_numero_key UNIQUE (catedra_id, numero);

ALTER TABLE public.actas_examen_alumnos DROP CONSTRAINT IF EXISTS actas_examen_alumnos_condicion_previa_check;
ALTER TABLE public.actas_examen_alumnos ADD CONSTRAINT actas_examen_alumnos_condicion_previa_check CHECK ((condicion_previa = ANY (ARRAY['REGULAR'::text, 'LIBRE'::text])));

ALTER TABLE public.actas_examen_alumnos DROP CONSTRAINT IF EXISTS actas_examen_alumnos_dictamen_check;
ALTER TABLE public.actas_examen_alumnos ADD CONSTRAINT actas_examen_alumnos_dictamen_check CHECK ((dictamen = ANY (ARRAY['APROBADO'::text, 'DESAPROBADO'::text, 'AUSENTE'::text])));

ALTER TABLE public.asistencias DROP CONSTRAINT IF EXISTS asistencias_estado_check;
ALTER TABLE public.asistencias ADD CONSTRAINT asistencias_estado_check CHECK ((estado = ANY (ARRAY['PRESENTE'::text, 'AUSENTE'::text])));

ALTER TABLE public.catedras DROP CONSTRAINT IF EXISTS catedras_modalidad_check;
ALTER TABLE public.catedras ADD CONSTRAINT catedras_modalidad_check CHECK ((upper(modalidad) = ANY (ARRAY['PRESENCIAL'::text, 'VIRTUAL'::text, 'HIBRIDA'::text, 'SEMIPRESENCIAL'::text, 'SEMI_PRESENCIAL'::text, 'A DISTANCIA'::text, 'ANUAL'::text, 'CUATRIMESTRAL'::text, '1° CUATRIMESTRE'::text, '2° CUATRIMESTRE'::text])));

ALTER TABLE public.catedras DROP CONSTRAINT IF EXISTS catedras_nivel_check;
ALTER TABLE public.catedras ADD CONSTRAINT catedras_nivel_check CHECK ((upper(nivel) = ANY (ARRAY['SECUNDARIO'::text, 'TERCIARIO'::text, 'SUPERIOR'::text, 'UNIVERSITARIO'::text, 'PRIMARIO'::text])));

ALTER TABLE public.evaluaciones DROP CONSTRAINT IF EXISTS evaluaciones_tipo_check;
ALTER TABLE public.evaluaciones ADD CONSTRAINT evaluaciones_tipo_check CHECK ((tipo = ANY (ARRAY['TP'::text, 'PARCIAL'::text, 'PRUEBA'::text, 'RECUPERATORIO'::text])));

ALTER TABLE public.eventos_calendario DROP CONSTRAINT IF EXISTS eventos_calendario_tipo_check;
ALTER TABLE public.eventos_calendario ADD CONSTRAINT eventos_calendario_tipo_check CHECK ((tipo = ANY (ARRAY['CLASE'::text, 'REUNION'::text, 'TRIBUNAL_EXAMEN'::text, 'PERIODO'::text, 'OTRO'::text])));

ALTER TABLE public.instituciones DROP CONSTRAINT IF EXISTS instituciones_nivel_check;
ALTER TABLE public.instituciones ADD CONSTRAINT instituciones_nivel_check CHECK ((upper(nivel) = ANY (ARRAY['SECUNDARIO'::text, 'TERCIARIO'::text, 'SUPERIOR'::text, 'UNIVERSITARIO'::text, 'PRIMARIO'::text])));

ALTER TABLE public.mesas_examen DROP CONSTRAINT IF EXISTS check_condicion_acta;
ALTER TABLE public.mesas_examen ADD CONSTRAINT check_condicion_acta CHECK ((condicion_acta = ANY (ARRAY['PROMOCIONAL'::text, 'REGULAR'::text, 'LIBRE'::text])));

ALTER TABLE public.notas DROP CONSTRAINT IF EXISTS check_estado_nota;
ALTER TABLE public.notas ADD CONSTRAINT check_estado_nota CHECK ((estado = ANY (ARRAY['CALIFICADO'::text, 'NO_ENTREGO'::text, 'AUSENTE'::text])));

ALTER TABLE public.notas DROP CONSTRAINT IF EXISTS notas_valor_check;
ALTER TABLE public.notas ADD CONSTRAINT notas_valor_check CHECK (((valor IS NULL) OR ((valor >= 1.00) AND (valor <= 10.00))));

ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;
ALTER TABLE public.perfiles ADD CONSTRAINT perfiles_rol_check CHECK ((rol = ANY (ARRAY['docente'::text, 'superadmin'::text])));

ALTER TABLE public.recursos DROP CONSTRAINT IF EXISTS recursos_categoria_check;
ALTER TABLE public.recursos ADD CONSTRAINT recursos_categoria_check CHECK ((categoria = ANY (ARRAY['APUNTE'::text, 'TP'::text, 'PARCIAL'::text, 'PLANIFICACION'::text, 'BIBLIOGRAFIA'::text])));

ALTER TABLE public.recursos DROP CONSTRAINT IF EXISTS recursos_tipo_origen_check;
ALTER TABLE public.recursos ADD CONSTRAINT recursos_tipo_origen_check CHECK ((tipo_origen = ANY (ARRAY['LOCAL'::text, 'GOOGLE_LINK'::text])));

ALTER TABLE public.actas_examen_alumnos DROP CONSTRAINT IF EXISTS actas_examen_alumnos_estudiante_id_fkey;
ALTER TABLE public.actas_examen_alumnos ADD CONSTRAINT actas_examen_alumnos_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE SET NULL;

ALTER TABLE public.actas_examen_alumnos DROP CONSTRAINT IF EXISTS actas_examen_alumnos_mesa_id_fkey;
ALTER TABLE public.actas_examen_alumnos ADD CONSTRAINT actas_examen_alumnos_mesa_id_fkey FOREIGN KEY (mesa_id) REFERENCES mesas_examen(id) ON DELETE CASCADE;

ALTER TABLE public.actas_examen_detalle DROP CONSTRAINT IF EXISTS actas_examen_detalle_catedra_id_fkey;
ALTER TABLE public.actas_examen_detalle ADD CONSTRAINT actas_examen_detalle_catedra_id_fkey FOREIGN KEY (catedra_id) REFERENCES catedras(id) ON DELETE CASCADE;

ALTER TABLE public.actas_examen_detalle DROP CONSTRAINT IF EXISTS actas_examen_detalle_estudiante_id_fkey;
ALTER TABLE public.actas_examen_detalle ADD CONSTRAINT actas_examen_detalle_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE;

ALTER TABLE public.actas_examen_detalle DROP CONSTRAINT IF EXISTS actas_examen_detalle_mesa_id_fkey;
ALTER TABLE public.actas_examen_detalle ADD CONSTRAINT actas_examen_detalle_mesa_id_fkey FOREIGN KEY (mesa_id) REFERENCES mesas_examen(id) ON DELETE CASCADE;

ALTER TABLE public.actas_examen_estudiantes DROP CONSTRAINT IF EXISTS actas_examen_estudiantes_estudiante_id_fkey;
ALTER TABLE public.actas_examen_estudiantes ADD CONSTRAINT actas_examen_estudiantes_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE;

ALTER TABLE public.actas_examen_estudiantes DROP CONSTRAINT IF EXISTS actas_examen_estudiantes_mesa_id_fkey;
ALTER TABLE public.actas_examen_estudiantes ADD CONSTRAINT actas_examen_estudiantes_mesa_id_fkey FOREIGN KEY (mesa_id) REFERENCES mesas_examen(id) ON DELETE CASCADE;

ALTER TABLE public.asistencias DROP CONSTRAINT IF EXISTS asistencias_clase_id_fkey;
ALTER TABLE public.asistencias ADD CONSTRAINT asistencias_clase_id_fkey FOREIGN KEY (clase_id) REFERENCES clases(id) ON DELETE CASCADE;

ALTER TABLE public.asistencias DROP CONSTRAINT IF EXISTS asistencias_estudiante_id_fkey;
ALTER TABLE public.asistencias ADD CONSTRAINT asistencias_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE;

ALTER TABLE public.catedras DROP CONSTRAINT IF EXISTS catedras_ciclo_id_fkey;
ALTER TABLE public.catedras ADD CONSTRAINT catedras_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES ciclos_lectivos(id) ON DELETE CASCADE;

ALTER TABLE public.catedras DROP CONSTRAINT IF EXISTS catedras_docente_id_fkey;
ALTER TABLE public.catedras ADD CONSTRAINT catedras_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.catedras DROP CONSTRAINT IF EXISTS catedras_institucion_id_fkey;
ALTER TABLE public.catedras ADD CONSTRAINT catedras_institucion_id_fkey FOREIGN KEY (institucion_id) REFERENCES instituciones(id) ON DELETE CASCADE;

ALTER TABLE public.ciclos_lectivos DROP CONSTRAINT IF EXISTS ciclos_lectivos_docente_id_fkey;
ALTER TABLE public.ciclos_lectivos ADD CONSTRAINT ciclos_lectivos_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.ciclos_lectivos DROP CONSTRAINT IF EXISTS ciclos_lectivos_institucion_id_fkey;
ALTER TABLE public.ciclos_lectivos ADD CONSTRAINT ciclos_lectivos_institucion_id_fkey FOREIGN KEY (institucion_id) REFERENCES instituciones(id) ON DELETE CASCADE;

ALTER TABLE public.clases DROP CONSTRAINT IF EXISTS clases_catedra_id_fkey;
ALTER TABLE public.clases ADD CONSTRAINT clases_catedra_id_fkey FOREIGN KEY (catedra_id) REFERENCES catedras(id) ON DELETE CASCADE;

ALTER TABLE public.clases DROP CONSTRAINT IF EXISTS clases_unidad_id_fkey;
ALTER TABLE public.clases ADD CONSTRAINT clases_unidad_id_fkey FOREIGN KEY (unidad_id) REFERENCES unidades_tematicas(id) ON DELETE SET NULL;

ALTER TABLE public.criterios_evaluacion DROP CONSTRAINT IF EXISTS criterios_evaluacion_catedra_id_fkey;
ALTER TABLE public.criterios_evaluacion ADD CONSTRAINT criterios_evaluacion_catedra_id_fkey FOREIGN KEY (catedra_id) REFERENCES catedras(id) ON DELETE CASCADE;

ALTER TABLE public.docentes DROP CONSTRAINT IF EXISTS docentes_id_fkey;
ALTER TABLE public.docentes ADD CONSTRAINT docentes_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.estudiantes DROP CONSTRAINT IF EXISTS estudiantes_docente_id_fkey;
ALTER TABLE public.estudiantes ADD CONSTRAINT estudiantes_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.evaluaciones DROP CONSTRAINT IF EXISTS evaluaciones_catedra_id_fkey;
ALTER TABLE public.evaluaciones ADD CONSTRAINT evaluaciones_catedra_id_fkey FOREIGN KEY (catedra_id) REFERENCES catedras(id) ON DELETE CASCADE;

ALTER TABLE public.evaluaciones DROP CONSTRAINT IF EXISTS evaluaciones_evaluacion_origen_id_fkey;
ALTER TABLE public.evaluaciones ADD CONSTRAINT evaluaciones_evaluacion_origen_id_fkey FOREIGN KEY (evaluacion_origen_id) REFERENCES evaluaciones(id) ON DELETE SET NULL;

ALTER TABLE public.evaluaciones DROP CONSTRAINT IF EXISTS evaluaciones_periodo_id_fkey;
ALTER TABLE public.evaluaciones ADD CONSTRAINT evaluaciones_periodo_id_fkey FOREIGN KEY (periodo_id) REFERENCES periodos_academicos(id) ON DELETE SET NULL;

ALTER TABLE public.eventos_calendario DROP CONSTRAINT IF EXISTS eventos_calendario_docente_id_fkey;
ALTER TABLE public.eventos_calendario ADD CONSTRAINT eventos_calendario_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.inasistencias_docente DROP CONSTRAINT IF EXISTS inasistencias_docente_catedra_id_fkey;
ALTER TABLE public.inasistencias_docente ADD CONSTRAINT inasistencias_docente_catedra_id_fkey FOREIGN KEY (catedra_id) REFERENCES catedras(id) ON DELETE CASCADE;

ALTER TABLE public.inasistencias_docente DROP CONSTRAINT IF EXISTS inasistencias_docente_docente_id_fkey;
ALTER TABLE public.inasistencias_docente ADD CONSTRAINT inasistencias_docente_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.inscripciones DROP CONSTRAINT IF EXISTS inscripciones_catedra_id_fkey;
ALTER TABLE public.inscripciones ADD CONSTRAINT inscripciones_catedra_id_fkey FOREIGN KEY (catedra_id) REFERENCES catedras(id) ON DELETE CASCADE;

ALTER TABLE public.inscripciones DROP CONSTRAINT IF EXISTS inscripciones_ciclo_id_fkey;
ALTER TABLE public.inscripciones ADD CONSTRAINT inscripciones_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES ciclos_lectivos(id) ON DELETE CASCADE;

ALTER TABLE public.inscripciones DROP CONSTRAINT IF EXISTS inscripciones_estudiante_id_fkey;
ALTER TABLE public.inscripciones ADD CONSTRAINT inscripciones_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE;

ALTER TABLE public.instituciones DROP CONSTRAINT IF EXISTS instituciones_docente_id_fkey;
ALTER TABLE public.instituciones ADD CONSTRAINT instituciones_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.mesas_examen DROP CONSTRAINT IF EXISTS mesas_examen_catedra_id_fkey;
ALTER TABLE public.mesas_examen ADD CONSTRAINT mesas_examen_catedra_id_fkey FOREIGN KEY (catedra_id) REFERENCES catedras(id) ON DELETE CASCADE;

ALTER TABLE public.mesas_examen DROP CONSTRAINT IF EXISTS mesas_examen_docente_id_fkey;
ALTER TABLE public.mesas_examen ADD CONSTRAINT mesas_examen_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.notas DROP CONSTRAINT IF EXISTS notas_estudiante_id_fkey;
ALTER TABLE public.notas ADD CONSTRAINT notas_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE CASCADE;

ALTER TABLE public.notas DROP CONSTRAINT IF EXISTS notas_evaluacion_id_fkey;
ALTER TABLE public.notas ADD CONSTRAINT notas_evaluacion_id_fkey FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones(id) ON DELETE CASCADE;

ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS perfiles_id_fkey;
ALTER TABLE public.perfiles ADD CONSTRAINT perfiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.periodos_academicos DROP CONSTRAINT IF EXISTS periodos_academicos_ciclo_id_fkey;
ALTER TABLE public.periodos_academicos ADD CONSTRAINT periodos_academicos_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES ciclos_lectivos(id) ON DELETE CASCADE;

ALTER TABLE public.periodos_academicos DROP CONSTRAINT IF EXISTS periodos_academicos_docente_id_fkey;
ALTER TABLE public.periodos_academicos ADD CONSTRAINT periodos_academicos_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES auth.users(id);

ALTER TABLE public.recursos DROP CONSTRAINT IF EXISTS recursos_catedra_id_fkey;
ALTER TABLE public.recursos ADD CONSTRAINT recursos_catedra_id_fkey FOREIGN KEY (catedra_id) REFERENCES catedras(id) ON DELETE CASCADE;

ALTER TABLE public.unidades_tematicas DROP CONSTRAINT IF EXISTS unidades_tematicas_catedra_id_fkey;
ALTER TABLE public.unidades_tematicas ADD CONSTRAINT unidades_tematicas_catedra_id_fkey FOREIGN KEY (catedra_id) REFERENCES catedras(id) ON DELETE CASCADE;

ALTER TABLE public.unidades_tematicas DROP CONSTRAINT IF EXISTS unidades_tematicas_docente_id_fkey;
ALTER TABLE public.unidades_tematicas ADD CONSTRAINT unidades_tematicas_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES auth.users(id);

-- --------------------------------------------------------------------
-- 4. INDEXES
-- --------------------------------------------------------------------

CREATE INDEX idx_actas_estudiante_cat ON public.actas_examen_detalle USING btree (estudiante_id, catedra_id);
CREATE INDEX idx_actas_mesa ON public.actas_examen_detalle USING btree (mesa_id);
CREATE INDEX idx_asistencias_clase ON public.asistencias USING btree (clase_id);
CREATE INDEX idx_asistencias_clase_estudiante ON public.asistencias USING btree (clase_id, estudiante_id);
CREATE INDEX idx_catedras_docente ON public.catedras USING btree (docente_id);
CREATE INDEX idx_catedras_portal_activo ON public.catedras USING btree (id) WHERE (portal_activo = true);
CREATE INDEX idx_clases_catedra ON public.clases USING btree (catedra_id);
CREATE INDEX idx_clases_catedra_fecha ON public.clases USING btree (catedra_id, fecha DESC);
CREATE INDEX idx_estudiantes_dni_clean ON public.estudiantes USING btree (dni);
CREATE INDEX idx_estudiantes_docente ON public.estudiantes USING btree (docente_id);
CREATE INDEX idx_evaluaciones_catedra ON public.evaluaciones USING btree (catedra_id);
CREATE INDEX idx_evaluaciones_catedra_fecha ON public.evaluaciones USING btree (catedra_id, fecha DESC);
CREATE INDEX idx_inscripciones_catedra_estudiante ON public.inscripciones USING btree (catedra_id, estudiante_id);
CREATE INDEX idx_instituciones_docente ON public.instituciones USING btree (docente_id);
CREATE INDEX idx_notas_eval_estudiante ON public.notas USING btree (evaluacion_id, estudiante_id);
CREATE INDEX idx_notas_evaluacion ON public.notas USING btree (evaluacion_id);
CREATE INDEX idx_perfiles_rol ON public.perfiles USING btree (id, rol);

-- --------------------------------------------------------------------
-- 5. FUNCTIONS / STORED PROCEDURES
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_cambiar_rol(p_usuario_id uuid, p_nuevo_rol text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NOT public.es_superadmin() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol de Superadmin';
    END IF;

    UPDATE public.perfiles
    SET rol = p_nuevo_rol, updated_at = NOW()
    WHERE id = p_usuario_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_purgar_huerfanos_docente(p_docente_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_catedras_borradas INT;
    v_inscripciones_borradas INT;
BEGIN
    IF NOT public.es_superadmin() THEN
        RAISE EXCEPTION 'Acceso denegado: Se requiere rol de Superadmin';
    END IF;

    -- Eliminar cátedras huérfanas (sin institución o sin ciclo válido)
    WITH deleted_cat AS (
        DELETE FROM public.catedras
        WHERE docente_id = p_docente_id 
          AND (institucion_id IS NULL OR ciclo_id IS NULL)
        RETURNING id
    )
    SELECT count(*) INTO v_catedras_borradas FROM deleted_cat;

    -- Eliminar inscripciones que apunten a cátedras inexistentes
    WITH deleted_insc AS (
        DELETE FROM public.inscripciones
        WHERE catedra_id NOT IN (SELECT id FROM public.catedras)
        RETURNING id
    )
    SELECT count(*) INTO v_inscripciones_borradas FROM deleted_insc;

    RETURN json_build_object(
        'catedras_eliminadas', v_catedras_borradas,
        'inscripciones_eliminadas', v_inscripciones_borradas
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.autofill_inscripcion_ciclo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF NEW.ciclo_id IS NULL THEN
        SELECT ciclo_id INTO NEW.ciclo_id 
        FROM public.catedras 
        WHERE id = NEW.catedra_id;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.consultar_estado_alumno(p_catedra_id uuid, p_dni text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_catedra RECORD;
    v_estudiante RECORD;
    v_criterios RECORD;
    v_clean_dni TEXT;
    v_total_clases INT := 0;
    v_clases_licencia INT := 0;
    v_clases_efectivas INT := 0;
    v_presentes INT := 0;
    v_ausentes INT := 0;
    v_asistencia_pct NUMERIC(5,2) := 100.00;
    v_evaluaciones JSONB := '[]'::jsonb;
    v_result JSONB;
BEGIN
    -- Normalizar DNI removiendo espacios, puntos y guiones
    v_clean_dni := REGEXP_REPLACE(p_dni, '[^0-9]', '', 'g');

    IF v_clean_dni IS NULL OR LENGTH(v_clean_dni) < 6 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'DNI_INVALIDO',
            'message', 'El número de DNI ingresado no es válido.'
        );
    END IF;

    -- Verificar que la cátedra exista y tenga el portal activo
    SELECT c.*, i.nombre AS institucion_nombre
    INTO v_catedra
    FROM public.catedras c
    LEFT JOIN public.instituciones i ON i.id = c.institucion_id
    WHERE c.id = p_catedra_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'CATEDRA_NO_ENCONTRADA',
            'message', 'La cátedra solicitada no existe.'
        );
    END IF;

    IF NOT v_catedra.portal_activo THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'PORTAL_INACTIVO',
            'message', 'El portal de consulta de esta cátedra se encuentra pausado por el docente.'
        );
    END IF;

    -- Buscar estudiante inscripto en la cátedra con ese DNI
    SELECT e.id, e.dni, e.apellido, e.nombre
    INTO v_estudiante
    FROM public.estudiantes e
    JOIN public.inscripciones ins ON ins.estudiante_id = e.id
    WHERE ins.catedra_id = p_catedra_id
      AND REGEXP_REPLACE(e.dni, '[^0-9]', '', 'g') = v_clean_dni
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'ESTUDIANTE_NO_ENCONTRADO',
            'message', 'No se encontró ningún estudiante inscripto con el DNI ingresado en esta materia.'
        );
    END IF;

    -- Obtener criterios de evaluación
    SELECT * INTO v_criterios
    FROM public.criterios_evaluacion
    WHERE catedra_id = p_catedra_id;

    -- Estructura base de respuesta
    v_result := jsonb_build_object(
        'success', true,
        'catedra', jsonb_build_object(
            'id', v_catedra.id,
            'nombre', v_catedra.nombre,
            'nivel', v_catedra.nivel,
            'modalidad', v_catedra.modalidad,
            'institucion_nombre', COALESCE(v_catedra.institucion_nombre, 'Institución Educativa')
        ),
        'estudiante', jsonb_build_object(
            'id', v_estudiante.id,
            'dni', v_estudiante.dni,
            'apellido', v_estudiante.apellido,
            'nombre', v_estudiante.nombre
        ),
        'config', jsonb_build_object(
            'portal_mostrar_asistencia', v_catedra.portal_mostrar_asistencia,
            'portal_mostrar_notas', v_catedra.portal_mostrar_notas,
            'portal_mostrar_condicion', v_catedra.portal_mostrar_condicion
        )
    );

    -- 1. Calcular Asistencias (si está habilitado)
    IF v_catedra.portal_mostrar_asistencia OR v_catedra.portal_mostrar_condicion THEN
        SELECT COUNT(*) INTO v_total_clases
        FROM public.clases
        WHERE catedra_id = p_catedra_id;

        -- Descontar inasistencias docentes
        SELECT COUNT(*) INTO v_clases_licencia
        FROM public.inasistencias_docente
        WHERE catedra_id = p_catedra_id;

        v_clases_efectivas := GREATEST(0, v_total_clases - v_clases_licencia);

        IF v_clases_efectivas > 0 THEN
            SELECT 
                COUNT(*) FILTER (WHERE a.estado = 'PRESENTE'),
                COUNT(*) FILTER (WHERE a.estado = 'AUSENTE')
            INTO v_presentes, v_ausentes
            FROM public.asistencias a
            JOIN public.clases cl ON cl.id = a.clase_id
            WHERE cl.catedra_id = p_catedra_id
              AND a.estudiante_id = v_estudiante.id;

            v_asistencia_pct := ROUND(((v_presentes::NUMERIC / v_clases_efectivas::NUMERIC) * 100), 1);
        ELSE
            v_asistencia_pct := 100.00;
        END IF;

        IF v_catedra.portal_mostrar_asistencia THEN
            v_result := v_result || jsonb_build_object(
                'asistencia', jsonb_build_object(
                    'total_clases', v_clases_efectivas,
                    'presentes', v_presentes,
                    'ausentes', v_ausentes,
                    'porcentaje', v_asistencia_pct,
                    'min_asist_reg', COALESCE(v_criterios.min_asist_reg, 70),
                    'min_asist_promo', COALESCE(v_criterios.min_asist_promo, 80)
                )
            );
        END IF;
    END IF;

    -- 2. Obtener Calificaciones (si está habilitado)
    IF v_catedra.portal_mostrar_notas OR v_catedra.portal_mostrar_condicion THEN
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', ev.id,
                'titulo', ev.titulo,
                'tipo', ev.tipo,
                'fecha_entrega', ev.fecha_entrega,
                'valor', n.valor
            ) ORDER BY ev.created_at ASC
        ), '[]'::jsonb)
        INTO v_evaluaciones
        FROM public.evaluaciones ev
        LEFT JOIN public.notas n ON n.evaluacion_id = ev.id AND n.estudiante_id = v_estudiante.id
        WHERE ev.catedra_id = p_catedra_id;

        IF v_catedra.portal_mostrar_notas THEN
            v_result := v_result || jsonb_build_object(
                'evaluaciones', v_evaluaciones
            );
        END IF;
    END IF;

    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.consultar_estado_estudiante(p_catedra_id uuid, p_dni text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_catedra RECORD;
    v_estudiante RECORD;
    v_total_clases INT := 0;
    v_presentes INT := 0;
    v_porcentaje_asistencia NUMERIC := NULL;
    v_notas JSON := '[]'::json;
    v_condicion TEXT := NULL;
BEGIN
    -- 1. Verificar si la cátedra tiene el portal activado y obtener sus preferencias
    SELECT id, nombre, portal_activo, portal_mostrar_asistencia, portal_mostrar_notas, portal_mostrar_condicion
    INTO v_catedra
    FROM public.catedras
    WHERE id = p_catedra_id;

    IF v_catedra.id IS NULL THEN
        RETURN json_build_object('valido', false, 'mensaje', 'Cátedra no encontrada.');
    END IF;

    IF NOT COALESCE(v_catedra.portal_activo, false) THEN
        RETURN json_build_object('valido', false, 'mensaje', 'El portal de consultas para esta cátedra se encuentra pausado por el docente.');
    END IF;

    -- 2. Validar que el estudiante pertenezca a la cátedra por DNI
    SELECT e.id, e.nombre, e.apellido
    INTO v_estudiante
    FROM public.estudiantes e
    JOIN public.inscripciones i ON i.estudiante_id = e.id
    WHERE i.catedra_id = p_catedra_id AND e.dni = p_dni;

    IF v_estudiante.id IS NULL THEN
        RETURN json_build_object('valido', false, 'mensaje', 'El DNI ingresado no está registrado en esta cátedra.');
    END IF;

    -- 3. Calcular Asistencia (si el docente lo habilitó)
    IF v_catedra.portal_mostrar_asistencia THEN
        SELECT count(*) INTO v_total_clases FROM public.clases WHERE catedra_id = p_catedra_id;
        SELECT count(*) INTO v_presentes FROM public.asistencias a
        JOIN public.clases c ON c.id = a.clase_id
        WHERE c.catedra_id = p_catedra_id AND a.estudiante_id = v_estudiante.id AND a.estado = 'PRESENTE';

        v_porcentaje_asistencia := CASE 
            WHEN v_total_clases > 0 THEN round((v_presentes::numeric / v_total_clases::numeric) * 100, 1)
            ELSE 100 
        END;
    END IF;

    -- 4. Obtener Notas (si el docente lo habilitó)
    IF v_catedra.portal_mostrar_notas THEN
        SELECT COALESCE(json_agg(json_build_object(
            'evaluacion', ev.titulo,
            'tipo', ev.tipo,
            'nota', n.valor
        ) ORDER BY ev.created_at ASC), '[]'::json)
        INTO v_notas
        FROM public.evaluaciones ev
        LEFT JOIN public.notas n ON n.evaluacion_id = ev.id AND n.estudiante_id = v_estudiante.id
        WHERE ev.catedra_id = p_catedra_id;
    END IF;

    -- 5. Respuesta JSON adaptada al criterio configurado
    RETURN json_build_object(
        'valido', true,
        'materia', v_catedra.nombre,
        'estudiante', v_estudiante.nombre || ' ' || v_estudiante.apellido,
        'mostrar_asistencia', v_catedra.portal_mostrar_asistencia,
        'total_clases', v_total_clases,
        'asistencias_presentes', v_presentes,
        'porcentaje_asistencia', v_porcentaje_asistencia,
        'mostrar_notas', v_catedra.portal_mostrar_notas,
        'notas', v_notas,
        'mostrar_condicion', v_catedra.portal_mostrar_condicion
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.es_superadmin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.perfiles
        WHERE id = auth.uid() AND rol = 'superadmin'
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_alumnos_elegibles_mesa(p_catedra_id uuid, p_condicion_acta text)
 RETURNS TABLE(estudiante_id uuid, nombre text, apellido text, dni text, ciclo_nombre text, ciclo_anio integer, estado_cursada text, intentos_previos bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        e.id AS estudiante_id,
        e.nombre,
        e.apellido,
        e.dni,
        COALESCE(cl.nombre, 'Sin Ciclo') AS ciclo_nombre,
        COALESCE(cl.anio, 2026) AS ciclo_anio,
        COALESCE(i.estado_academico, 'CURSANDO') AS estado_cursada,
        (SELECT count(*) FROM public.actas_examen_detalle aed 
         WHERE aed.estudiante_id = e.id AND aed.catedra_id = p_catedra_id AND aed.resultado = 'DESAPROBADO') AS intentos_previos
    FROM public.estudiantes e
    JOIN public.inscripciones i ON i.estudiante_id = e.id
    LEFT JOIN public.ciclos_lectivos cl ON cl.id = i.ciclo_id
    WHERE i.catedra_id = p_catedra_id
      AND COALESCE(i.estado_academico, '') != 'ACREDITADO'
    ORDER BY e.apellido ASC, e.nombre ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.guardar_acta_examen_lote(p_mesa_id uuid, p_catedra_id uuid, p_filas jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_item JSONB;
    v_total INT := 0;
BEGIN
    -- Validar permisos
    IF NOT (public.es_superadmin() OR EXISTS (SELECT 1 FROM public.mesas_examen WHERE id = p_mesa_id AND docente_id = auth.uid())) THEN
        RAISE EXCEPTION 'Acceso denegado a la mesa de examen';
    END IF;

    -- Iterar e insertar/actualizar cada registro
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_filas)
    LOOP
        INSERT INTO public.actas_examen_detalle (
            mesa_id,
            estudiante_id,
            catedra_id,
            condicion_al_rendir,
            nota_escrito,
            nota_oral,
            nota_definitiva,
            resultado,
            observaciones
        ) VALUES (
            p_mesa_id,
            (v_item->>'estudiante_id')::UUID,
            p_catedra_id,
            v_item->>'condicion_al_rendir',
            NULLIF(v_item->>'nota_escrito', '')::NUMERIC,
            NULLIF(v_item->>'nota_oral', '')::NUMERIC,
            NULLIF(v_item->>'nota_definitiva', '')::NUMERIC,
            v_item->>'resultado',
            v_item->>'observaciones'
        )
        ON CONFLICT (mesa_id, estudiante_id) DO UPDATE SET
            condicion_al_rendir = EXCLUDED.condicion_al_rendir,
            nota_escrito = EXCLUDED.nota_escrito,
            nota_oral = EXCLUDED.nota_oral,
            nota_definitiva = EXCLUDED.nota_definitiva,
            resultado = EXCLUDED.resultado,
            observaciones = EXCLUDED.observaciones;

        -- Si aprobó / acreditó, actualizar inscripción
        IF v_item->>'resultado' = 'ACREDITADO' THEN
            UPDATE public.inscripciones
            SET estado_academico = 'ACREDITADO',
                nota_final_acreditacion = NULLIF(v_item->>'nota_definitiva', '')::NUMERIC,
                fecha_acreditacion = NOW()
            WHERE estudiante_id = (v_item->>'estudiante_id')::UUID
              AND catedra_id = p_catedra_id;
        END IF;

        v_total := v_total + 1;
    END LOOP;

    RETURN json_build_object('success', true, 'procesados', v_total);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_catedra()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.criterios_evaluacion (catedra_id)
    VALUES (new.id);
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.perfiles (id, email, nombre, rol)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Docente'),
        'docente'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.registrar_resultado_examen(p_mesa_id uuid, p_estudiante_id uuid, p_catedra_id uuid, p_ciclo_id uuid, p_condicion text, p_nota_escrito numeric, p_nota_oral numeric, p_nota_definitiva numeric, p_resultado text, p_observaciones text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- 1. Insertar / Actualizar en el acta de la mesa
    INSERT INTO public.actas_examen_detalle (
        mesa_id, estudiante_id, catedra_id, condicion_al_rendir,
        nota_escrito, nota_oral, nota_definitiva, resultado, observaciones
    ) VALUES (
        p_mesa_id, p_estudiante_id, p_catedra_id, p_condicion,
        p_nota_escrito, p_nota_oral, p_nota_definitiva, p_resultado, p_observaciones
    )
    ON CONFLICT (mesa_id, estudiante_id) DO UPDATE SET
        nota_escrito = EXCLUDED.nota_escrito,
        nota_oral = EXCLUDED.nota_oral,
        nota_definitiva = EXCLUDED.nota_definitiva,
        resultado = EXCLUDED.resultado,
        observaciones = EXCLUDED.observaciones;

    -- 2. Si ACREDITÓ (Aprobó), actualizar inscripción general a 'ACREDITADO'
    IF p_resultado = 'ACREDITADO' THEN
        UPDATE public.inscripciones
        SET estado_academico = 'ACREDITADO',
            nota_final_acreditacion = p_nota_definitiva,
            fecha_acreditacion = NOW()
        WHERE estudiante_id = p_estudiante_id 
          AND catedra_id = p_catedra_id;
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_institucion_activa(p_inst_id uuid, p_docente_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    UPDATE public.instituciones 
    SET activa = (id = p_inst_id)
    WHERE docente_id = p_docente_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_sync_inscripciones_alias()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Sincronizar condicion y estado_academico
    IF NEW.condicion IS NOT NULL AND (NEW.estado_academico IS NULL OR NEW.estado_academico = 'REGULAR') THEN
        NEW.estado_academico := NEW.condicion;
    ELSIF NEW.estado_academico IS NOT NULL THEN
        NEW.condicion := NEW.estado_academico;
    END IF;

    -- Sincronizar nota_final y nota_final_acreditacion
    IF NEW.nota_final IS NOT NULL AND NEW.nota_final_acreditacion IS NULL THEN
        NEW.nota_final_acreditacion := NEW.nota_final;
    ELSIF NEW.nota_final_acreditacion IS NOT NULL THEN
        NEW.nota_final := NEW.nota_final_acreditacion;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$function$
;

-- --------------------------------------------------------------------
-- 6. TRIGGERS
-- --------------------------------------------------------------------

DROP TRIGGER IF EXISTS on_catedra_created ON public.catedras;
CREATE TRIGGER on_catedra_created AFTER INSERT ON catedras FOR EACH ROW EXECUTE FUNCTION handle_new_catedra();

DROP TRIGGER IF EXISTS tr_autofill_inscripcion_ciclo ON public.inscripciones;
CREATE TRIGGER tr_autofill_inscripcion_ciclo BEFORE INSERT ON inscripciones FOR EACH ROW EXECUTE FUNCTION autofill_inscripcion_ciclo();

DROP TRIGGER IF EXISTS trg_sync_inscripciones_alias_trigger ON public.inscripciones;
CREATE TRIGGER trg_sync_inscripciones_alias_trigger BEFORE INSERT OR UPDATE ON inscripciones FOR EACH ROW EXECUTE FUNCTION trg_sync_inscripciones_alias();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- --------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) & POLICIES
-- --------------------------------------------------------------------

ALTER TABLE public.actas_examen_alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actas_examen_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actas_examen_estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catedras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ciclos_lectivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criterios_evaluacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.docentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_calendario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inasistencias_docente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instituciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mesas_examen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_academicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades_tematicas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Docentes pueden gestionar los alumnos de sus actas de examen" ON public.actas_examen_alumnos;
CREATE POLICY "Docentes pueden gestionar los alumnos de sus actas de examen" ON public.actas_examen_alumnos
    AS PERMISSIVE
    FOR ALL
    USING ((EXISTS ( SELECT 1
   FROM mesas_examen m
  WHERE ((m.id = actas_examen_alumnos.mesa_id) AND (m.docente_id = auth.uid())))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM mesas_examen m
  WHERE ((m.id = actas_examen_alumnos.mesa_id) AND (m.docente_id = auth.uid())))))
;

DROP POLICY IF EXISTS "actas_detalle_admin_docente_policy" ON public.actas_examen_detalle;
CREATE POLICY "actas_detalle_admin_docente_policy" ON public.actas_examen_detalle
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING ((es_superadmin() OR (EXISTS ( SELECT 1
   FROM mesas_examen m
  WHERE ((m.id = actas_examen_detalle.mesa_id) AND (m.docente_id = auth.uid()))))))
    WITH CHECK ((es_superadmin() OR (EXISTS ( SELECT 1
   FROM mesas_examen m
  WHERE ((m.id = actas_examen_detalle.mesa_id) AND (m.docente_id = auth.uid()))))))
;

DROP POLICY IF EXISTS "actas_examen_detalle_policy" ON public.actas_examen_detalle;
CREATE POLICY "actas_examen_detalle_policy" ON public.actas_examen_detalle
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING ((es_superadmin() OR (EXISTS ( SELECT 1
   FROM catedras c
  WHERE ((c.id = actas_examen_detalle.catedra_id) AND (c.docente_id = auth.uid()))))))
    WITH CHECK ((es_superadmin() OR (EXISTS ( SELECT 1
   FROM catedras c
  WHERE ((c.id = actas_examen_detalle.catedra_id) AND (c.docente_id = auth.uid()))))))
;

DROP POLICY IF EXISTS "actas_examen_docente_policy" ON public.actas_examen_detalle;
CREATE POLICY "actas_examen_docente_policy" ON public.actas_examen_detalle
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING ((es_superadmin() OR (EXISTS ( SELECT 1
   FROM mesas_examen m
  WHERE ((m.id = actas_examen_detalle.mesa_id) AND (m.docente_id = auth.uid()))))))
    WITH CHECK ((es_superadmin() OR (EXISTS ( SELECT 1
   FROM mesas_examen m
  WHERE ((m.id = actas_examen_detalle.mesa_id) AND (m.docente_id = auth.uid()))))))
;

DROP POLICY IF EXISTS "actas_examen_policy" ON public.actas_examen_detalle;
CREATE POLICY "actas_examen_policy" ON public.actas_examen_detalle
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING ((es_superadmin() OR (EXISTS ( SELECT 1
   FROM catedras c
  WHERE ((c.id = actas_examen_detalle.catedra_id) AND (c.docente_id = auth.uid()))))))
    WITH CHECK ((es_superadmin() OR (EXISTS ( SELECT 1
   FROM catedras c
  WHERE ((c.id = actas_examen_detalle.catedra_id) AND (c.docente_id = auth.uid()))))))
;

DROP POLICY IF EXISTS "Docentes manage actas estudiantes" ON public.actas_examen_estudiantes;
CREATE POLICY "Docentes manage actas estudiantes" ON public.actas_examen_estudiantes
    AS PERMISSIVE
    FOR ALL
    USING (true)
    WITH CHECK (true)
;

DROP POLICY IF EXISTS "actas_examen_estudiantes_policy" ON public.actas_examen_estudiantes;
CREATE POLICY "actas_examen_estudiantes_policy" ON public.actas_examen_estudiantes
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING ((es_superadmin() OR (EXISTS ( SELECT 1
   FROM mesas_examen m
  WHERE ((m.id = actas_examen_estudiantes.mesa_id) AND (m.docente_id = auth.uid()))))))
    WITH CHECK ((es_superadmin() OR (EXISTS ( SELECT 1
   FROM mesas_examen m
  WHERE ((m.id = actas_examen_estudiantes.mesa_id) AND (m.docente_id = auth.uid()))))))
;

DROP POLICY IF EXISTS "Acceso a asistencias propias" ON public.asistencias;
CREATE POLICY "Acceso a asistencias propias" ON public.asistencias
    AS PERMISSIVE
    FOR ALL
    USING ((clase_id IN ( SELECT cl.id
   FROM (clases cl
     JOIN catedras ca ON ((cl.catedra_id = ca.id)))
  WHERE (ca.docente_id = auth.uid()))))
;

DROP POLICY IF EXISTS "asistencias_policy" ON public.asistencias;
CREATE POLICY "asistencias_policy" ON public.asistencias
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING ((es_superadmin() OR (EXISTS ( SELECT 1
   FROM (clases cl
     JOIN catedras c ON ((c.id = cl.catedra_id)))
  WHERE ((cl.id = asistencias.clase_id) AND (c.docente_id = auth.uid()))))))
    WITH CHECK ((es_superadmin() OR (EXISTS ( SELECT 1
   FROM (clases cl
     JOIN catedras c ON ((c.id = cl.catedra_id)))
  WHERE ((cl.id = asistencias.clase_id) AND (c.docente_id = auth.uid()))))))
;

DROP POLICY IF EXISTS "Acceso a catedras propias" ON public.catedras;
CREATE POLICY "Acceso a catedras propias" ON public.catedras
    AS PERMISSIVE
    FOR ALL
    USING ((auth.uid() = docente_id))
;

DROP POLICY IF EXISTS "catedras_policy" ON public.catedras;
CREATE POLICY "catedras_policy" ON public.catedras
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING ((es_superadmin() OR (docente_id = auth.uid())))
    WITH CHECK ((es_superadmin() OR (docente_id = auth.uid())))
;

DROP POLICY IF EXISTS "public_read_active_catedras" ON public.catedras;
CREATE POLICY "public_read_active_catedras" ON public.catedras
    AS PERMISSIVE
    FOR SELECT
    TO anon,authenticated
    USING ((portal_activo = true))
;

DROP POLICY IF EXISTS "Acceso a ciclos propios" ON public.ciclos_lectivos;
CREATE POLICY "Acceso a ciclos propios" ON public.ciclos_lectivos
    AS PERMISSIVE
    FOR ALL
    USING ((auth.uid() = docente_id))
;

DROP POLICY IF EXISTS "ciclos_lectivos_policy" ON public.ciclos_lectivos;
CREATE POLICY "ciclos_lectivos_policy" ON public.ciclos_lectivos
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING ((es_superadmin() OR (docente_id = auth.uid())))
    WITH CHECK ((es_superadmin() OR (docente_id = auth.uid())))
;

DROP POLICY IF EXISTS "Acceso a clases propias" ON public.clases;
CREATE POLICY "Acceso a clases propias" ON public.clases
    AS PERMISSIVE
    FOR ALL
    USING ((catedra_id IN ( SELECT catedras.id
   FROM catedras
  WHERE (catedras.docente_id = auth.uid()))))
;

DROP POLICY IF EXISTS "clases_policy" ON public.clases;
CREATE POLICY "clases_policy" ON public.clases
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING ((es_superadmin() OR (EXISTS ( SELECT 1
   FROM catedras c
  WHERE ((c.id = clases.catedra_id) AND (c.docente_id = auth.uid()))))))
    WITH CHECK ((es_superadmin() OR (EXISTS ( SELECT 1
   FROM catedras c
  WHERE ((c.id = clases.catedra_id) AND (c.docente_id = auth.uid()))))))
;

DROP POLICY IF EXISTS "Lectura publica configuracion" ON public.configuracion_sistema;
CREATE POLICY "Lectura publica configuracion" ON public.configuracion_sistema
    AS PERMISSIVE
    FOR SELECT
    TO authenticated
    USING (true)
;

DROP POLICY IF EXISTS "Superadmin edita configuracion" ON public.configuracion_sistema;
CREATE POLICY "Superadmin edita configuracion" ON public.configuracion_sistema
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING (es_superadmin())
    WITH CHECK (es_superadmin())
;

DROP POLICY IF EXISTS "Acceso a criterios propios" ON public.criterios_evaluacion;
CREATE POLICY "Acceso a criterios propios" ON public.criterios_evaluacion
    AS PERMISSIVE
    FOR ALL
    USING ((catedra_id IN ( SELECT catedras.id
   FROM catedras
  WHERE (catedras.docente_id = auth.uid()))))
;

DROP POLICY IF EXISTS "Acceso a docentes propios" ON public.docentes;
CREATE POLICY "Acceso a docentes propios" ON public.docentes
    AS PERMISSIVE
    FOR ALL
    USING ((auth.uid() = id))
;

DROP POLICY IF EXISTS "Acceso a estudiantes propios" ON public.estudiantes;
CREATE POLICY "Acceso a estudiantes propios" ON public.estudiantes
    AS PERMISSIVE
    FOR ALL
    USING ((auth.uid() = docente_id))
;

DROP POLICY IF EXISTS "estudiantes_policy" ON public.estudiantes;
CREATE POLICY "estudiantes_policy" ON public.estudiantes
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING ((es_superadmin() OR (docente_id = auth.uid())))
    WITH CHECK ((es_superadmin() OR (docente_id = auth.uid())))
;

DROP POLICY IF EXISTS "Acceso a evaluaciones propias" ON public.evaluaciones;
CREATE POLICY "Acceso a evaluaciones propias" ON public.evaluaciones
    AS PERMISSIVE
    FOR ALL
    USING ((catedra_id IN ( SELECT catedras.id
   FROM catedras
  WHERE (catedras.docente_id = auth.uid()))))
;

DROP POLICY IF EXISTS "evaluaciones_policy" ON public.evaluaciones;
CREATE POLICY "evaluaciones_policy" ON public.evaluaciones
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING ((es_superadmin() OR (EXISTS ( SELECT 1
   FROM catedras c
  WHERE ((c.id = evaluaciones.catedra_id) AND (c.docente_id = auth.uid()))))))
    WITH CHECK ((es_superadmin() OR (EXISTS ( SELECT 1
   FROM catedras c
  WHERE ((c.id = evaluaciones.catedra_id) AND (c.docente_id = auth.uid()))))))
;

DROP POLICY IF EXISTS "Acceso a eventos propios" ON public.eventos_calendario;
CREATE POLICY "Acceso a eventos propios" ON public.eventos_calendario
    AS PERMISSIVE
    FOR ALL
    USING ((auth.uid() = docente_id))
;

DROP POLICY IF EXISTS "eventos_calendario_policy" ON public.eventos_calendario;
CREATE POLICY "eventos_calendario_policy" ON public.eventos_calendario
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING ((es_superadmin() OR (docente_id = auth.uid())))
    WITH CHECK ((es_superadmin() OR (docente_id = auth.uid())))
;

DROP POLICY IF EXISTS "inasistencias_docente_policy" ON public.inasistencias_docente;
CREATE POLICY "inasistencias_docente_policy" ON public.inasistencias_docente
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING ((es_superadmin() OR (docente_id = auth.uid())))
    WITH CHECK ((es_superadmin() OR (docente_id = auth.uid())))
;

DROP POLICY IF EXISTS "Acceso a inscripciones propias" ON public.inscripciones;
CREATE POLICY "Acceso a inscripciones propias" ON public.inscripciones
    AS PERMISSIVE
    FOR ALL
    USING ((catedra_id IN ( SELECT catedras.id
   FROM catedras
  WHERE (catedras.docente_id = auth.uid()))))
;

DROP POLICY IF EXISTS "inscripciones_policy" ON public.inscripciones;
CREATE POLICY "inscripciones_policy" ON public.inscripciones
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING ((es_superadmin() OR (EXISTS ( SELECT 1
   FROM catedras c
  WHERE ((c.id = inscripciones.catedra_id) AND (c.docente_id = auth.uid()))))))
    WITH CHECK ((es_superadmin() OR (EXISTS ( SELECT 1
   FROM catedras c
  WHERE ((c.id = inscripciones.catedra_id) AND (c.docente_id = auth.uid()))))))
;

DROP POLICY IF EXISTS "Acceso a instituciones propias" ON public.instituciones;
CREATE POLICY "Acceso a instituciones propias" ON public.instituciones
    AS PERMISSIVE
    FOR ALL
    USING ((auth.uid() = docente_id))
;

DROP POLICY IF EXISTS "instituciones_policy" ON public.instituciones;
CREATE POLICY "instituciones_policy" ON public.instituciones
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING ((es_superadmin() OR (docente_id = auth.uid())))
    WITH CHECK ((es_superadmin() OR (docente_id = auth.uid())))
;

DROP POLICY IF EXISTS "public_read_instituciones_active_catedras" ON public.instituciones;
CREATE POLICY "public_read_instituciones_active_catedras" ON public.instituciones
    AS PERMISSIVE
    FOR SELECT
    TO anon,authenticated
    USING ((id IN ( SELECT catedras.institucion_id
   FROM catedras
  WHERE (catedras.portal_activo = true))))
;

DROP POLICY IF EXISTS "Docentes manage own mesas" ON public.mesas_examen;
CREATE POLICY "Docentes manage own mesas" ON public.mesas_examen
    AS PERMISSIVE
    FOR ALL
    USING (true)
    WITH CHECK (true)
;

DROP POLICY IF EXISTS "Docentes pueden gestionar sus mesas de examen" ON public.mesas_examen;
CREATE POLICY "Docentes pueden gestionar sus mesas de examen" ON public.mesas_examen
    AS PERMISSIVE
    FOR ALL
    USING ((auth.uid() = docente_id))
    WITH CHECK ((auth.uid() = docente_id))
;

DROP POLICY IF EXISTS "mesas_examen_admin_docente_policy" ON public.mesas_examen;
CREATE POLICY "mesas_examen_admin_docente_policy" ON public.mesas_examen
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING ((es_superadmin() OR (docente_id = auth.uid())))
    WITH CHECK ((es_superadmin() OR (docente_id = auth.uid())))
;

DROP POLICY IF EXISTS "mesas_examen_docente_policy" ON public.mesas_examen;
CREATE POLICY "mesas_examen_docente_policy" ON public.mesas_examen
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING ((es_superadmin() OR (docente_id = auth.uid())))
    WITH CHECK ((es_superadmin() OR (docente_id = auth.uid())))
;

DROP POLICY IF EXISTS "mesas_examen_policy" ON public.mesas_examen;
CREATE POLICY "mesas_examen_policy" ON public.mesas_examen
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING ((es_superadmin() OR (docente_id = auth.uid())))
    WITH CHECK ((es_superadmin() OR (docente_id = auth.uid())))
;

DROP POLICY IF EXISTS "Acceso a notas propias" ON public.notas;
CREATE POLICY "Acceso a notas propias" ON public.notas
    AS PERMISSIVE
    FOR ALL
    USING ((evaluacion_id IN ( SELECT ev.id
   FROM (evaluaciones ev
     JOIN catedras ca ON ((ev.catedra_id = ca.id)))
  WHERE (ca.docente_id = auth.uid()))))
;

DROP POLICY IF EXISTS "notas_policy" ON public.notas;
CREATE POLICY "notas_policy" ON public.notas
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING ((es_superadmin() OR (EXISTS ( SELECT 1
   FROM (evaluaciones ev
     JOIN catedras c ON ((c.id = ev.catedra_id)))
  WHERE ((ev.id = notas.evaluacion_id) AND (c.docente_id = auth.uid()))))))
    WITH CHECK ((es_superadmin() OR (EXISTS ( SELECT 1
   FROM (evaluaciones ev
     JOIN catedras c ON ((c.id = ev.catedra_id)))
  WHERE ((ev.id = notas.evaluacion_id) AND (c.docente_id = auth.uid()))))))
;

DROP POLICY IF EXISTS "Edicion de perfil propio" ON public.perfiles;
CREATE POLICY "Edicion de perfil propio" ON public.perfiles
    AS PERMISSIVE
    FOR UPDATE
    TO authenticated
    USING (((id = auth.uid()) OR es_superadmin()))
    WITH CHECK (((id = auth.uid()) OR es_superadmin()))
;

DROP POLICY IF EXISTS "Lectura de perfiles" ON public.perfiles;
CREATE POLICY "Lectura de perfiles" ON public.perfiles
    AS PERMISSIVE
    FOR SELECT
    TO authenticated
    USING (((id = auth.uid()) OR es_superadmin()))
;

DROP POLICY IF EXISTS "Superadmin control total perfiles" ON public.perfiles;
CREATE POLICY "Superadmin control total perfiles" ON public.perfiles
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING (es_superadmin())
    WITH CHECK (es_superadmin())
;

DROP POLICY IF EXISTS "Acceso a periodos propios" ON public.periodos_academicos;
CREATE POLICY "Acceso a periodos propios" ON public.periodos_academicos
    AS PERMISSIVE
    FOR ALL
    USING ((ciclo_id IN ( SELECT ciclos_lectivos.id
   FROM ciclos_lectivos
  WHERE (ciclos_lectivos.docente_id = auth.uid()))))
;

DROP POLICY IF EXISTS "periodos_academicos_policy" ON public.periodos_academicos;
CREATE POLICY "periodos_academicos_policy" ON public.periodos_academicos
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING ((es_superadmin() OR (docente_id = auth.uid())))
    WITH CHECK ((es_superadmin() OR (docente_id = auth.uid())))
;

DROP POLICY IF EXISTS "Acceso a recursos propios" ON public.recursos;
CREATE POLICY "Acceso a recursos propios" ON public.recursos
    AS PERMISSIVE
    FOR ALL
    USING ((catedra_id IN ( SELECT catedras.id
   FROM catedras
  WHERE (catedras.docente_id = auth.uid()))))
;

DROP POLICY IF EXISTS "recursos_policy" ON public.recursos;
CREATE POLICY "recursos_policy" ON public.recursos
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING ((es_superadmin() OR (EXISTS ( SELECT 1
   FROM catedras c
  WHERE ((c.id = recursos.catedra_id) AND (c.docente_id = auth.uid()))))))
    WITH CHECK ((es_superadmin() OR (EXISTS ( SELECT 1
   FROM catedras c
  WHERE ((c.id = recursos.catedra_id) AND (c.docente_id = auth.uid()))))))
;

DROP POLICY IF EXISTS "unidades_tematicas_policy" ON public.unidades_tematicas;
CREATE POLICY "unidades_tematicas_policy" ON public.unidades_tematicas
    AS PERMISSIVE
    FOR ALL
    TO authenticated
    USING ((es_superadmin() OR (docente_id = auth.uid())))
    WITH CHECK ((es_superadmin() OR (docente_id = auth.uid())))
;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
