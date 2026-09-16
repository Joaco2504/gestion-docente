import { toast } from 'sonner';
import { procesarErrorDocente, ErrorDocenteInfo } from './errorCodes';
import { notificarErrorDiscord } from '../services/discordLogger';

/**
 * Servicio Centralizado de Manejo de Errores de PlanillaDocente
 * Unifica la presentación amigable al usuario (sin fugas de SQL/PostgreSQL),
 * el registro en consola para depuración y el envío de telemetría a Discord.
 */
export function handleAppError(error: any, contexto: string, user?: any): ErrorDocenteInfo {
  // 1. Obtener mensaje limpio y código institucional
  const info = procesarErrorDocente(error);

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
