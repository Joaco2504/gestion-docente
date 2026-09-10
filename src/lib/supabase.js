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

  try {
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${catedraId}/${Date.now()}_${cleanFileName}`;

    const { data, error } = await supabase.storage
      .from('archivos-docentes')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

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
