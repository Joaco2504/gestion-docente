-- ==============================================================================
-- PLANILLADOCENTE — FIX DEFINITIVO DE RLS Y COLUMNAS PARA EVALUACIONES Y NOTAS
-- ==============================================================================

-- 1. Asegurar columnas en la tabla 'evaluaciones'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evaluaciones' AND column_name = 'fecha_entrega'
    ) THEN
        ALTER TABLE public.evaluaciones ADD COLUMN fecha_entrega DATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evaluaciones' AND column_name = 'archivo_url'
    ) THEN
        ALTER TABLE public.evaluaciones ADD COLUMN archivo_url TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'evaluaciones' AND column_name = 'archivo_nombre'
    ) THEN
        ALTER TABLE public.evaluaciones ADD COLUMN archivo_nombre TEXT;
    END IF;
END $$;

-- 2. Habilitar RLS y definir políticas restrictivas en 'evaluaciones'
ALTER TABLE public.evaluaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "evaluaciones_manage_own" ON public.evaluaciones;
DROP POLICY IF EXISTS "evaluaciones_allow_all" ON public.evaluaciones;
DROP POLICY IF EXISTS "evaluaciones_docente_manage" ON public.evaluaciones;

CREATE POLICY "evaluaciones_docente_manage" ON public.evaluaciones
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.catedras c
      WHERE c.id = evaluaciones.catedra_id
      AND (c.docente_id = auth.uid() OR (auth.jwt() ->> 'email') = 'jooako7@gmail.com')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.catedras c
      WHERE c.id = evaluaciones.catedra_id
      AND (c.docente_id = auth.uid() OR (auth.jwt() ->> 'email') = 'jooako7@gmail.com')
    )
  );

-- 3. Habilitar RLS y definir políticas restrictivas en 'calificaciones' / 'notas'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'calificaciones'
    ) THEN
        ALTER TABLE public.calificaciones ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "calificaciones_allow_all" ON public.calificaciones;
        DROP POLICY IF EXISTS "calificaciones_manage_own" ON public.calificaciones;
        DROP POLICY IF EXISTS "calificaciones_docente_manage" ON public.calificaciones;

        CREATE POLICY "calificaciones_docente_manage" ON public.calificaciones
          FOR ALL TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.evaluaciones e
              JOIN public.catedras c ON c.id = e.catedra_id
              WHERE e.id = calificaciones.evaluacion_id
              AND (c.docente_id = auth.uid() OR (auth.jwt() ->> 'email') = 'jooako7@gmail.com')
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.evaluaciones e
              JOIN public.catedras c ON c.id = e.catedra_id
              WHERE e.id = calificaciones.evaluacion_id
              AND (c.docente_id = auth.uid() OR (auth.jwt() ->> 'email') = 'jooako7@gmail.com')
            )
          );
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'notas'
    ) THEN
        ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "notas_manage_own" ON public.notas;
        DROP POLICY IF EXISTS "notas_allow_all" ON public.notas;
        DROP POLICY IF EXISTS "notas_docente_manage" ON public.notas;

        CREATE POLICY "notas_docente_manage" ON public.notas
          FOR ALL TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.evaluaciones e
              JOIN public.catedras c ON c.id = e.catedra_id
              WHERE e.id = notas.evaluacion_id
              AND (c.docente_id = auth.uid() OR (auth.jwt() ->> 'email') = 'jooako7@gmail.com')
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.evaluaciones e
              JOIN public.catedras c ON c.id = e.catedra_id
              WHERE e.id = notas.evaluacion_id
              AND (c.docente_id = auth.uid() OR (auth.jwt() ->> 'email') = 'jooako7@gmail.com')
            )
          );
    END IF;
END $$;

-- 4. Recargar esquema PostgREST
NOTIFY pgrst, 'reload schema';
