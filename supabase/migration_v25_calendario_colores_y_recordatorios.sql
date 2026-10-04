-- ==============================================================================
-- MIGRACIÓN V25: CALENDARIO (COLORES EDITABLES), RECORDATORIOS Y DISCORD
-- ==============================================================================

-- 1. Ampliar tabla CATEDRAS con columna color (HEX)
ALTER TABLE public.catedras
ADD COLUMN IF NOT EXISTS color TEXT;

-- 2. Asignar colores por defecto de la paleta curada a cátedras existentes sin color
DO $$
DECLARE
    cat RECORD;
    palette TEXT[] := ARRAY[
        '#10B981', -- Esmeralda
        '#2563EB', -- Azul Océano
        '#F59E0B', -- Ámbar
        '#8B5CF6', -- Púrpura
        '#EC4899', -- Rosa
        '#06B6D4', -- Cian
        '#F97316', -- Naranja Coral
        '#14B8A6', -- Teal
        '#6366F1', -- Índigo Suave
        '#E11D48', -- Carmesí
        '#7C3AED', -- Violeta
        '#84CC16'  -- Lima
    ];
    palette_len INT := array_length(palette, 1);
    idx INT := 1;
BEGIN
    FOR cat IN SELECT id FROM public.catedras WHERE color IS NULL OR color = '' ORDER BY created_at ASC LOOP
        UPDATE public.catedras
        SET color = palette[((idx - 1) % palette_len) + 1]
        WHERE id = cat.id;
        idx := idx + 1;
    END LOOP;
END $$;

-- 3. Ampliar tabla MESAS_EXAMEN con columna color propio y configuración de recordatorios
ALTER TABLE public.mesas_examen
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#4338CA',
ADD COLUMN IF NOT EXISTS recordatorio_config JSONB DEFAULT '{"activo": true, "aviso_7d": true, "aviso_1d": true, "aviso_2h": true}'::jsonb;

-- Asignar color reservado por defecto (#4338CA) a mesas existentes sin color
UPDATE public.mesas_examen
SET color = '#4338CA'
WHERE color IS NULL OR color = '';

-- 4. Ampliar tabla EVENTOS_CALENDARIO con cátedra_id y configuración de recordatorios
ALTER TABLE public.eventos_calendario
ADD COLUMN IF NOT EXISTS catedra_id UUID REFERENCES public.catedras(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS aula TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS recordatorio_config JSONB DEFAULT '{"activo": true, "aviso_7d": true, "aviso_3d": true, "aviso_1d": true, "aviso_dia": true, "aviso_2h": true}'::jsonb;

-- 5. Tabla de auditoría e idempotencia: RECORDATORIOS_ENVIADOS
CREATE TABLE IF NOT EXISTS public.recordatorios_enviados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id TEXT NOT NULL,
    tipo_evento TEXT NOT NULL, -- 'MESA', 'PARCIAL', 'TP', 'CLASE', 'OTRO', 'RESUMEN'
    tipo_aviso TEXT NOT NULL,  -- '7_DIAS', '3_DIAS', '1_DIA', 'DIA_MANANA', '2_HORAS', 'CANCELACION', 'RESUMEN_DIARIO'
    destinatario_canal TEXT NOT NULL DEFAULT '1556366651296055357',
    enviado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estado TEXT NOT NULL DEFAULT 'ENVIADO' CHECK (estado IN ('ENVIADO', 'REINTENTANDO', 'FALLIDO')),
    intentos INT NOT NULL DEFAULT 1,
    error TEXT,
    payload_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_evento_aviso UNIQUE (evento_id, tipo_aviso)
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_recordatorios_evento_aviso ON public.recordatorios_enviados(evento_id, tipo_aviso);
CREATE INDEX IF NOT EXISTS idx_recordatorios_estado ON public.recordatorios_enviados(estado);

-- RLS para recordatorios_enviados
ALTER TABLE public.recordatorios_enviados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Docentes autenticados pueden ver recordatorios enviados" ON public.recordatorios_enviados;
CREATE POLICY "Docentes autenticados pueden ver recordatorios enviados"
ON public.recordatorios_enviados FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Comentario descriptivo
COMMENT ON TABLE public.recordatorios_enviados IS 'Registro de idempotencia y trazabilidad de recordatorios emitidos hacia Discord (n8n/worker)';
