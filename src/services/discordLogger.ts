/**
 * Servicio de Telemetría y Alertas en Discord para Korum
 * Notifica errores críticos de base de datos o fallos de operación al canal de soporte técnico.
 */

import { traducirErrorTecnico } from '../lib/errorHandler';

function getDiscordWebhookUrl(): string | null {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DISCORD_WEBHOOK_URL) {
      const url = String(import.meta.env.VITE_DISCORD_WEBHOOK_URL || '').trim();
      if (url) return url;
    }
  } catch (_) {}
  return null;
}

export interface NotificarErrorDiscordParams {
  codigoError?: string;
  mensajeUsuario?: string;
  mensajeAmigable?: string;
  errorTecnico: any;
  contexto: string;
  usuario?: {
    email?: string;
    id?: string;
  } | null;
}

/**
 * Envía un reporte estructurado y estilizado mediante Webhook de Discord
 */
export async function notificarErrorDiscord({
  codigoError,
  mensajeUsuario,
  mensajeAmigable,
  errorTecnico,
  contexto,
  usuario
}: NotificarErrorDiscordParams): Promise<boolean> {
  try {
    const webhookUrl = getDiscordWebhookUrl();
    if (!webhookUrl) {
      // Silenciar completamente si la variable de entorno no está configurada (SEC-05)
      return false;
    }

    const codigoFinal = codigoError || 'ERR-SYS';
    const mensajeFinal = mensajeUsuario || mensajeAmigable || 'Sin mensaje especificado';

    // Formatear detalle técnico seguro (JSON indentado, limitado a 1000 caracteres)
    let detalleTecnicoStr = '';
    try {
      if (typeof errorTecnico === 'string') {
        detalleTecnicoStr = errorTecnico;
      } else if (errorTecnico instanceof Error) {
        detalleTecnicoStr = `${errorTecnico.name}: ${errorTecnico.message}\n${errorTecnico.stack || ''}`;
      } else {
        detalleTecnicoStr = JSON.stringify(errorTecnico, null, 2);
      }
    } catch (_) {
      detalleTecnicoStr = String(errorTecnico || 'Error no serializable');
    }

    if (detalleTecnicoStr.length > 950) {
      detalleTecnicoStr = detalleTecnicoStr.substring(0, 950) + '\n... [truncado por longitud]';
    }

    // Marca temporal formateada para Catamarca / Argentina
    let fechaCatamarca = '';
    try {
      fechaCatamarca = new Intl.DateTimeFormat('es-AR', {
        timeZone: 'America/Argentina/Catamarca',
        dateStyle: 'medium',
        timeStyle: 'medium'
      }).format(new Date());
    } catch (_) {
      fechaCatamarca = new Date().toLocaleString();
    }

    const traduccion = traducirErrorTecnico(
      typeof errorTecnico === 'object' && errorTecnico !== null
        ? { code: codigoError || errorTecnico.code, message: errorTecnico.message || mensajeFinal, ...errorTecnico }
        : { code: codigoError, message: mensajeFinal }
    );

    const isGenericFallback = traduccion.titulo === 'Incidencia al registrar inasistencia' && !(contexto || '').toLowerCase().includes('asistencia');
    const embedTitle = isGenericFallback ? `⚠️ Incidencia en ${contexto || 'Korum'} (${codigoFinal})` : `⚠️ ${traduccion.titulo} (${codigoFinal})`;
    const embedDesc = isGenericFallback ? mensajeFinal : traduccion.explicacion;

    const payload = {
      username: 'Korum Telemetría',
      embeds: [
        {
          title: embedTitle,
          description: embedDesc,
          color: 0xEF4444,
          fields: [
            { name: 'Código', value: codigoFinal, inline: true },
            { name: 'Módulo', value: contexto || 'General', inline: true },
            { name: 'Docente', value: usuario?.email || 'Desconocido', inline: true },
            { name: 'Solución Sugerida', value: traduccion.accionSugerida },
            ...(detalleTecnicoStr ? [{ name: 'Detalle Técnico', value: `\`\`\`json\n${detalleTecnicoStr}\n\`\`\`` }] : [])
          ],
          footer: { text: `Korum Telemetría · Catamarca (${fechaCatamarca})` },
          timestamp: new Date().toISOString()
        }
      ]
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return res.ok;
  } catch (_) {
    // Silenciado de errores para prevenir fugas de red o stacktraces en bundle del cliente (SEC-05)
    return false;
  }
}
