/**
 * Centralizador de Gestión y Traducción de Errores Técnicos
 * Traduce códigos SQL / PostgreSQL / Supabase a lenguaje humano comprensible para docentes
 * y formatea telemetría legible para Discord.
 */

import { toast } from 'sonner';
import { handleAppError as baseHandleAppError } from '../utils/handleAppError';

/**
 * Traduce códigos y errores técnicos (PostgreSQL, Supabase) a lenguaje claro y accionable.
 * @param {any} error
 * @returns {{ titulo: string, explicacion: string, accionSugerida: string }}
 */
export function traducirErrorTecnico(error) {
  const code = error?.code || '';
  const message = error?.message || (typeof error === 'string' ? error : '');

  if (code === '42P10' || String(message).includes('42P10') || String(message).toLowerCase().includes('no unique or exclusion constraint')) {
    return {
      titulo: 'Restricción de duplicados pendiente en base de datos',
      explicacion: 'El sistema intentó asentar la inasistencia sin duplicar registros, pero la base de datos requiere la regla de unicidad (clase_id, estudiante_id).',
      accionSugerida: 'Ejecutar la instrucción UNIQUE (clase_id, estudiante_id) en el editor SQL de Supabase.'
    };
  }

  if (code === '23502' || String(message).includes('23502') || String(message).toLowerCase().includes('null value in column')) {
    return {
      titulo: 'Dato obligatorio faltante',
      explicacion: 'Uno de los campos requeridos para la inasistencia se envió vacío.',
      accionSugerida: 'Verificar la fecha seleccionada y que el identificador sea generado automáticamente.'
    };
  }

  return {
    titulo: 'Incidencia al registrar inasistencia',
    explicacion: message || 'No se pudo comunicar con el servidor.',
    accionSugerida: 'Reintentar la operación o comprobar la conexión a internet.'
  };
}

/**
 * Construye el payload limpio y profesional para Discord
 */
export function construirPayloadDiscord({ error, contexto = 'Asistencias', user }) {
  const traduccion = traducirErrorTecnico(error);

  return {
    embeds: [{
      title: `⚠️ ${traduccion.titulo}`,
      description: traduccion.explicacion,
      color: 0xEF4444,
      fields: [
        { name: 'Módulo', value: contexto || 'Asistencias', inline: true },
        { name: 'Docente', value: user?.email || 'Desconocido', inline: true },
        { name: 'Solución Sugerida', value: traduccion.accionSugerida }
      ],
      footer: { text: `Korum Telemetría · Catamarca, 2026` },
      timestamp: new Date().toISOString()
    }]
  };
}

/**
 * Manejador unificado de errores con notificación amigable en pantalla y reporte a Discord
 */
export function handleAppError(error, contexto = 'General', user = null) {
  return baseHandleAppError(error, contexto, user);
}

/**
 * Guarda o actualiza registros de asistencias blindando la operación contra el error 42P10
 * (falta de restricción UNIQUE en clase_id, estudiante_id en PostgreSQL/Supabase).
 */
export async function guardarAsistenciasBlindado(supabase, payload, claseId) {
  const items = Array.isArray(payload) ? payload : [payload];
  if (!items.length) return { data: [], error: null };

  // 1. Intento estándar con upsert
  const { data, error } = await supabase
    .from('asistencias')
    .upsert(items, { onConflict: 'clase_id, estudiante_id' })
    .select();

  if (!error) {
    return { data, error: null };
  }

  // 2. Si el error es 42P10 (o falta de índice único para ON CONFLICT), activar blindaje de rescate
  const is42P10 = 
    error?.code === '42P10' || 
    String(error?.message || '').includes('42P10') ||
    String(error?.message || '').toLowerCase().includes('no unique or exclusion constraint');

  if (is42P10) {
    console.warn('[Blindaje 42P10] ON CONFLICT falló por falta de restricción única en DB. Ejecutando rescate seguro.');

    try {
      const { data: existingRows, error: fetchErr } = await supabase
        .from('asistencias')
        .select('id, estudiante_id')
        .eq('clase_id', claseId);

      if (fetchErr) throw fetchErr;

      const existingMap = new Map((existingRows || []).map(r => [r.estudiante_id, r.id]));
      const toUpdate = [];
      const toInsert = [];

      for (const item of items) {
        const existingId = item.id || existingMap.get(item.estudiante_id);
        if (existingId) {
          toUpdate.push({ ...item, id: existingId });
        } else {
          const { id: _, ...cleanItem } = item;
          toInsert.push(cleanItem);
        }
      }

      for (const item of toUpdate) {
        await supabase
          .from('asistencias')
          .update({
            estado: item.estado,
            updated_at: item.updated_at || new Date().toISOString()
          })
          .eq('id', item.id);
      }

      if (toInsert.length > 0) {
        await supabase
          .from('asistencias')
          .insert(toInsert);
      }

      const { data: refreshed, error: refErr } = await supabase
        .from('asistencias')
        .select('*')
        .eq('clase_id', claseId);

      if (refErr) throw refErr;

      return { data: refreshed, error: null, blindado: true };
    } catch (rescueErr) {
      console.error('[Blindaje 42P10] Error en fallback de guardado:', rescueErr);
      return { data: null, error: rescueErr };
    }
  }

  return { data: null, error };
}

export default {
  traducirErrorTecnico,
  construirPayloadDiscord,
  handleAppError,
  guardarAsistenciasBlindado
};
