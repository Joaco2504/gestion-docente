/**
 * Servicio de Telemetría y Alertas en Discord para PlanillaDocente
 * Notifica errores críticos de base de datos o fallos de operación al canal de soporte técnico.
 */

const DEFAULT_WEBHOOK_URL = 'https://discord.com/api/webhooks/1444417664805240873/f4ME1RVsAu5h1oKXgBNbpvf_459zLRLF0gXfCNkE4b1TeLKHa9T4C8kGiuCflTHvDsKT';

function getDiscordWebhookUrl(): string {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DISCORD_WEBHOOK_URL) {
      const url = import.meta.env.VITE_DISCORD_WEBHOOK_URL.trim();
      if (url) return url;
    }
  } catch (_) {}
  return DEFAULT_WEBHOOK_URL;
}

const DISCORD_WEBHOOK_URL = getDiscordWebhookUrl();

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
  const codigoFinal = codigoError || 'ERR-SYS';
  const mensajeFinal = mensajeUsuario || mensajeAmigable || 'Sin mensaje especificado';
  try {
    const webhookUrl = DISCORD_WEBHOOK_URL || getDiscordWebhookUrl();
    if (!webhookUrl) {
      console.warn('[discordLogger] DISCORD_WEBHOOK_URL no está configurada.');
      return false;
    }

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

    const payload = {
      username: 'PlanillaDocente Telemetry',
      avatar_url: 'https://cdn-icons-png.flaticon.com/512/3135/3135755.png',
      embeds: [
        {
          title: `🚨 Error en PlanillaDocente [${codigoFinal}]`,
          color: 0xe11d48, // Carmesí / Rose-600
          description: `Se ha registrado una incidencia no recuperable durante la interacción del docente.`,
          fields: [
            {
              name: '👤 Usuario / Docente',
              value: usuario?.email 
                ? `${usuario.email} (\`${usuario.id || 'N/A'}\`)`
                : 'Docente Anónimo / Sesión Local',
              inline: true
            },
            {
              name: '📍 Contexto / Módulo',
              value: contexto || 'General',
              inline: true
            },
            {
              name: '💬 Mensaje Mostrado al Docente',
              value: mensajeFinal,
              inline: false
            },
            {
              name: '🛠️ Detalle Técnico (PostgreSQL / Supabase)',
              value: `\`\`\`json\n${detalleTecnicoStr || '{}'}\n\`\`\``,
              inline: false
            }
          ],
          footer: {
            text: `PlanillaDocente Telemetría • Catamarca: ${fechaCatamarca}`
          },
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
  } catch (err) {
    console.warn('[discordLogger] Error al despachar telemetría a Discord:', err);
    return false;
  }
}
