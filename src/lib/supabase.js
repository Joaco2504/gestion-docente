import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://tu-proyecto.supabase.co' &&
  supabaseAnonKey !== 'tu_clave_anon_aqui' &&
  !supabaseUrl.includes('placeholder')
);

// Cliente oficial de Supabase
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/**
 * Storage Helper: Sube un archivo al bucket 'archivos-docentes'
 * @param {string} param1 - catedraId o docenteId
 * @param {File|string} param2 - file o catedraId
 * @param {File} [param3] - file
 * @returns {Promise<{ path?: string, publicUrl?: string, error?: any }>}
 */
export async function uploadCatedraFile(param1, param2, param3) {
  if (!isSupabaseConfigured || !supabase) {
    return { error: new Error('Supabase no está configurado en el archivo .env') };
  }

  let catedraId = param1;
  let file = param2;

  if (param3) {
    catedraId = param2;
    file = param3;
  }

  if (!file) {
    return { error: new Error('No se ha proporcionado ningún archivo para subir.') };
  }

  try {
    // Obtener el usuario autenticado para que la política de storage (auth.uid() = foldername[1]) se cumpla
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;

    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    // Si tenemos userId, la ruta comienza con userId/catedraId/... para cumplir con la RLS de Supabase Storage
    const filePath = userId 
      ? `${userId}/${catedraId}/${Date.now()}_${cleanFileName}`
      : `${catedraId}/${Date.now()}_${cleanFileName}`;

    const { data, error } = await supabase.storage
      .from('archivos-docentes')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      // Diagnóstico amigable para errores de RLS o bucket no existente
      if (error.message?.includes('row-level security') || error.message?.includes('policy') || error.statusCode === '403') {
        throw new Error(
          "Permiso denegado por Row-Level Security en Supabase Storage. " +
          "Asegúrate de ejecutar el script 'supabase/fix_rls_and_conflicts.sql' en el SQL Editor de Supabase " +
          "o crear el bucket 'archivos-docentes' como público con políticas de INSERT para usuarios autenticados."
        );
      }
      if (error.message?.includes('Bucket not found') || error.statusCode === '404') {
        throw new Error(
          "El bucket 'archivos-docentes' no existe en tu proyecto de Supabase. " +
          "Créalo en Supabase Dashboard -> Storage -> New Bucket ('archivos-docentes', Público: activado) " +
          "o ejecuta 'supabase/fix_rls_and_conflicts.sql'."
        );
      }
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from('archivos-docentes')
      .getPublicUrl(data.path);

    return {
      path: data.path,
      publicUrl: publicUrlData.publicUrl,
      url: publicUrlData.publicUrl,
      error: null
    };
  } catch (err) {
    return { error: err };
  }
}
