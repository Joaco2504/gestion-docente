-- ==============================================================================
-- MIGRACIÓN V5: MÓDULO DE SUPERADMINISTRADOR & CONFIGURACIÓN EN TIEMPO REAL
-- ==============================================================================

-- 1. TABLA: PERFILES DE USUARIO CON CONTROL DE ROLES
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'docente' CHECK (rol IN ('docente', 'superadmin')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migración segura desde tabla docentes existente si hubiere datos
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'docentes') THEN
        INSERT INTO public.perfiles (id, nombre, email, rol, created_at)
        SELECT id, nombre, email, 'docente', created_at
        FROM public.docentes
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- Habilitar RLS en perfiles
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura en perfiles
CREATE POLICY "Usuarios pueden ver su propio perfil"
ON public.perfiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Superadmins pueden ver todos los perfiles"
ON public.perfiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.perfiles p
        WHERE p.id = auth.uid() AND p.rol = 'superadmin'
    )
);

-- Políticas de actualización en perfiles
CREATE POLICY "Usuarios pueden actualizar su propio perfil"
ON public.perfiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Superadmins pueden actualizar perfiles y roles"
ON public.perfiles FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.perfiles p
        WHERE p.id = auth.uid() AND p.rol = 'superadmin'
    )
);

-- 2. TABLA: CONFIGURACIÓN GLOBAL DEL SISTEMA (SWITCHBOARD)
CREATE TABLE IF NOT EXISTS public.configuracion_sistema (
    id TEXT PRIMARY KEY DEFAULT 'global',
    modo_mantenimiento BOOLEAN NOT NULL DEFAULT false,
    banner_activo BOOLEAN NOT NULL DEFAULT false,
    banner_mensaje TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Insertar fila 'global' por defecto si no existe
INSERT INTO public.configuracion_sistema (id, modo_mantenimiento, banner_activo, banner_mensaje)
VALUES ('global', false, false, '')
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS en configuracion_sistema
ALTER TABLE public.configuracion_sistema ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios (autenticados o anónimos autorizados) pueden leer la configuración
CREATE POLICY "Lectura pública de configuracion_sistema"
ON public.configuracion_sistema FOR SELECT
USING (true);

-- Solo los superadmins pueden actualizar la configuración del sistema
CREATE POLICY "Solo superadmins pueden modificar configuracion_sistema"
ON public.configuracion_sistema FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.perfiles p
        WHERE p.id = auth.uid() AND p.rol = 'superadmin'
    )
);

-- 3. HABILITACIÓN DE REALTIME
-- Para que el canal 'config-realtime' transmita los cambios de la tabla configuracion_sistema
ALTER PUBLICATION supabase_realtime ADD TABLE public.configuracion_sistema;
