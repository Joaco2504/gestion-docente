import { toast } from 'sonner';
import { procesarErrorDocente, ErrorDocenteInfo } from './errorCodes';
import { notificarErrorDiscord } from '../services/discordLogger';

import { supabase } from '../lib/supabase';

let isLoggingOut = false;

/**
 * Servicio Centralizado de Manejo de Errores de PlanillaDocente
 * Unifica la presentación amigable al usuario (sin fugas de SQL/PostgreSQL),
 * el registro en consola para depuración, el envío de telemetría a Discord
 * y el auto-logout inmediato cuando la sesión JWT ha expirado (ERR-101 / PGRST303).
 */
export function handleAppError(error: any, contexto: string, user?: any): ErrorDocenteInfo {
  // 1. Obtener mensaje limpio y código institucional
  const info = procesarErrorDocente(error);

  const errorMsg = String(error?.message || '').toLowerCase();
  const errorCode = String(error?.code || '').toUpperCase();
  const rawStr = String(error || '').toLowerCase();

  // Detección de sesión caducada / JWT expirado
  const isJwtExpired = 
    info.codigo === 'ERR-101' ||
    errorCode === 'PGRST303' ||
    errorMsg.includes('jwt expired') ||
    rawStr.includes('jwt expired') ||
    errorMsg.includes('token is expired') ||
    errorMsg.includes('pgrst303') ||
    rawStr.includes('pgrst303');

  if (isJwtExpired) {
    if (!isLoggingOut) {
      isLoggingOut = true;
      console.warn(`[ERR-101] Sesión expirada detectada en ${contexto}. Ejecutando auto-logout.`);

      // Enviar reporte a Discord antes de redirigir
      try {
        notificarErrorDiscord({
          codigoError: 'ERR-101',
          mensajeUsuario: 'Sesión caducada. Auto-logout activado.',
          errorTecnico: error,
          contexto: contexto,
          usuario: user ? { email: user.email, id: user.id } : undefined
        });
      } catch (_) {}

      // 1. Ejecutar de inmediato el cierre de sesión y limpieza de tokens obsoletos
      (async () => {
        try {
          if (supabase) {
            await supabase.auth.signOut().catch(() => {});
          }
        } catch (_) {}

        try {
          localStorage.clear();
          sessionStorage.clear();
          sessionStorage.setItem('auth_expired_notice', 'true');
        } catch (_) {}

        // Redirigir limpiamente a login
        window.location.href = '/login';
      })();
    }

    return info;
  }

  // 2. Notificación en pantalla amigable (NUNCA mostrar el mensaje nativo de SQL)
  toast.error(`${info.mensaje} (Código: ${info.codigo})`);

  // 3. Registrar en consola para depuración local
  console.error(`[${info.codigo}] Error en ${contexto}:`, error);

  // 4. Enviar reporte detallado a Discord
  notificarErrorDiscord({
    codigoError: info.codigo,
    mensajeUsuario: info.mensaje,
    errorTecnico: error,
    contexto: contexto,
    usuario: user ? { email: user.email, id: user.id } : undefined
  });

  return info;
}

export default handleAppError;
