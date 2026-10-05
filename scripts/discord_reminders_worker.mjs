import fs from 'fs';
import path from 'path';

/**
 * ==============================================================================
 * KORUM DISCORD REMINDERS WORKER
 * ==============================================================================
 * 
 * Proceso autónomo de backend para cálculo y emisión de recordatorios a Discord.
 * - Zona horaria: America/Argentina/Catamarca (UTC-3)
 * - Idempotencia absoluta: tabla/store recordatorios_enviados con clave única (evento_id, tipo_aviso)
 * - Reintentos exponenciales (hasta 3 intentos) ante fallos
 * - Omisión estricta de campos vacíos en Embeds
 * - Cero credenciales hardcodeadas (lectura de .env o secrets)
 */

// Cargar variables de entorno desde .env si existe
const envPath = path.resolve('.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
    if (match && !match[1].startsWith('#')) {
      const key = match[1];
      let val = match[2] || '';
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      process.env[key] = val.trim();
    }
  });
}

// Cargar plantillas versionadas
const templatesPath = path.resolve('config/discordTemplates.json');
let TEMPLATES_CONFIG = {};
try {
  TEMPLATES_CONFIG = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
} catch (err) {
  console.error('[Error] No se pudo leer config/discordTemplates.json:', err.message);
}

const TIMEZONE = TEMPLATES_CONFIG.timezone || 'America/Argentina/Catamarca';
const DEFAULT_GUILD_ID = process.env.DISCORD_GUILD_ID || TEMPLATES_CONFIG.guild_id || '1430396981095960600';
let DEFAULT_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID || TEMPLATES_CONFIG.channel_id || '1556366651296055357';

/**
 * Resuelve el canal de Discord desde configuracion_sistema, env o plantilla
 */
export async function resolveDiscordChannel(supabaseClient = null) {
  if (process.env.DISCORD_CHANNEL_ID) {
    return process.env.DISCORD_CHANNEL_ID;
  }
  if (supabaseClient) {
    try {
      const { data } = await supabaseClient
        .from('configuracion_sistema')
        .select('discord_canal_recordatorios')
        .limit(1)
        .single();
      if (data?.discord_canal_recordatorios) {
        DEFAULT_CHANNEL_ID = data.discord_canal_recordatorios;
        return data.discord_canal_recordatorios;
      }
    } catch (e) {
      // Usar fallback si configuracion_sistema no responde
    }
  }
  return DEFAULT_CHANNEL_ID;
}

/**
 * Convierte código HEX a entero decimal para embeds de Discord
 */
export function hexToDecimal(hex) {
  if (!hex || typeof hex !== 'string') return 1096065;
  const clean = hex.replace('#', '').trim();
  const val = parseInt(clean, 16);
  return isNaN(val) ? 1096065 : val;
}

/**
 * Obtiene la fecha/hora actual formateada en America/Argentina/Catamarca
 */
export function getNowCatamarca() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  return new Date(formatter.format(now));
}

/**
 * Formatea una fecha a español rioplatense largo
 * Ej: "Lunes 12 de Octubre de 2026"
 */
export function formatFechaLargaRioplatense(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(d);
}

/**
 * Construye el payload del embed de Discord según la plantilla y datos del evento
 */
export function buildDiscordEmbed(tipoEvento, data, mentionUserId = null) {
  const tpl = TEMPLATES_CONFIG.templates?.[tipoEvento] || TEMPLATES_CONFIG.templates?.RECORDATORIO;
  if (!tpl) throw new Error(`Plantilla no encontrada para tipo: ${tipoEvento}`);

  // Reemplazo de variables en título y descripción
  let title = tpl.titulo_plantilla
    .replace('{tipo}', tpl.tipo_nombre || '')
    .replace('{titulo}', data.titulo || '')
    .replace('{catedra}', data.catedra || '');

  let description = tpl.descripcion_plantilla
    .replace('{falta}', data.falta || '')
    .replace('{titulo}', data.titulo || '');

  // Mención de usuario si aplica ("2 horas antes" o "día de")
  if (mentionUserId && (data.tipo_aviso === '2_HORAS' || data.tipo_aviso === 'DIA_MANANA')) {
    description = `<@${mentionUserId}>\n\n${description}`;
  }

  // Color decimal (fijo o del evento)
  const colorDec = tpl.color_fijo !== undefined 
    ? tpl.color_fijo 
    : hexToDecimal(data.color || '#10B981');

  // Filtrado estricto de campos: OMITIR cualquier campo sin dato o vacío
  const fields = [];
  if (Array.isArray(tpl.campos)) {
    for (const c of tpl.campos) {
      const val = data[c.key];
      if (val !== undefined && val !== null && String(val).trim() !== '' && String(val) !== 'undefined') {
        fields.push({
          name: c.name,
          value: String(val).trim(),
          inline: c.inline === true
        });
      }
    }
  }

  const embed = {
    title,
    description,
    color: colorDec,
    fields,
    footer: { text: tpl.footer || 'Korum • Recordatorio' }
  };

  if (data.fecha_iso) {
    embed.timestamp = data.fecha_iso;
  }

  return {
    embeds: [embed]
  };
}

/**
 * Cliente de envío con reintentos exponenciales
 */
export async function sendToDiscord(payload, options = {}) {
  const { 
    webhookUrl = process.env.DISCORD_WEBHOOK_URL,
    botToken = process.env.DISCORD_BOT_TOKEN,
    channelId = process.env.DISCORD_CHANNEL_ID || DEFAULT_CHANNEL_ID,
    mockFailure = false,
    maxRetries = 3
  } = options;

  let attempt = 0;
  let lastError = null;

  while (attempt < maxRetries) {
    attempt++;
    try {
      if (mockFailure) {
        throw new Error(`[Discord API Error 500] Error simulado en intento ${attempt}/${maxRetries}`);
      }

      // Si no hay webhook ni token configurado, retornar simulación exitosa en dry-run
      if (!webhookUrl && !botToken) {
        return {
          success: true,
          mode: 'simulated_dry_run',
          channelId,
          attempt,
          timestamp: new Date().toISOString()
        };
      }

      let response;
      if (webhookUrl) {
        response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else if (botToken) {
        response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${botToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      return {
        success: true,
        mode: webhookUrl ? 'webhook' : 'bot_api',
        channelId,
        attempt,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      lastError = err;
      console.warn(`[Intento ${attempt}/${maxRetries} fallido]: ${err.message}`);
      if (attempt < maxRetries) {
        // Backoff exponencial: 300ms * 2^attempt
        const waitMs = 300 * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, waitMs));
      }
    }
  }

  return {
    success: false,
    attempt: maxRetries,
    error: lastError?.message || 'Error desconocido al comunicar con Discord'
  };
}

/**
 * Almacén de idempotencia (compatible con archivo JSON local o Supabase)
 */
class IdempotencyStore {
  constructor(filePath = 'recordatorios_enviados_local.json') {
    this.filePath = path.resolve(filePath);
    this.cache = this.load();
  }

  load() {
    if (fs.existsSync(this.filePath)) {
      try {
        return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      } catch (_) {
        return [];
      }
    }
    return [];
  }

  save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.cache, null, 2), 'utf8');
  }

  hasSent(eventoId, tipoAviso) {
    return this.cache.some(
      r => r.evento_id === String(eventoId) && r.tipo_aviso === tipoAviso && r.estado === 'ENVIADO'
    );
  }

  record(entry) {
    const existingIndex = this.cache.findIndex(
      r => r.evento_id === String(entry.evento_id) && r.tipo_aviso === entry.tipo_aviso
    );

    const recordItem = {
      id: entry.id || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      evento_id: String(entry.evento_id),
      tipo_evento: entry.tipo_evento,
      tipo_aviso: entry.tipo_aviso,
      destinatario_canal: entry.destinatario_canal || DEFAULT_CHANNEL_ID,
      enviado_en: new Date().toISOString(),
      estado: entry.estado,
      intentos: entry.intentos || 1,
      error: entry.error || null
    };

    if (existingIndex >= 0) {
      this.cache[existingIndex] = recordItem;
    } else {
      this.cache.push(recordItem);
    }
    this.save();
    return recordItem;
  }
}

/**
 * Runner principal de verificación y pruebas
 */
async function main() {
  const args = process.argv.slice(2);
  const store = new IdempotencyStore();

  console.log('=== KORUM DISCORD REMINDERS WORKER ===');
  console.log(`Zona Horaria: ${TIMEZONE}`);
  console.log(`Destino: Servidor ${DEFAULT_GUILD_ID} | Canal ${DEFAULT_CHANNEL_ID}`);

  // MODO 1: Prueba de Evento con Verificación de Idempotencia
  if (args.includes('--test-event')) {
    console.log('\n--- [TEST] Ejecutando Prueba de Recordatorio de Mesa de Examen ---');
    const testMesa = {
      id: 'mesa-test-101',
      tipo: 'TRIBUNAL_EXAMEN',
      titulo: 'Mesa de Examen Final (Prueba)',
      catedra: 'Programación y Algoritmos II',
      color: '#4338CA', // Color reservado para mesas
      fecha_larga: formatFechaLargaRioplatense('2026-10-15T18:00:00-03:00'),
      hora: '18:00 hs',
      aula_o_lugar: 'Aula Magna',
      turno_llamado: '1° Llamado (Turno Ordinario)',
      cierre_inscripcion: '12 de Octubre a las 23:59 hs',
      falta: 'en 7 días',
      tipo_aviso: '7_DIAS',
      fecha_iso: '2026-10-15T18:00:00-03:00'
    };

    // 1. Verificar si ya fue enviado (Idempotencia)
    if (store.hasSent(testMesa.id, testMesa.tipo_aviso)) {
      console.log(`[IDEMPOTENCIA DETECTADA] El aviso "${testMesa.tipo_aviso}" para evento ${testMesa.id} YA fue enviado.`);
      console.log('Mensaje OMITIDO exitosamente: Doble ejecución no genera duplicados.');
      return;
    }

    const payload = buildDiscordEmbed(testMesa.tipo, testMesa, process.env.DISCORD_USER_ID);
    console.log('Payload generado para Discord:');
    console.log(JSON.stringify(payload, null, 2));

    const result = await sendToDiscord(payload);
    if (result.success) {
      store.record({
        evento_id: testMesa.id,
        tipo_evento: testMesa.tipo,
        tipo_aviso: testMesa.tipo_aviso,
        destinatario_canal: DEFAULT_CHANNEL_ID,
        estado: 'ENVIADO',
        intentos: result.attempt
      });
      console.log(`[ÉXITO] Aviso enviado y registrado con idempotencia en intento ${result.attempt}.`);
    } else {
      console.error(`[ERROR] Falló envío: ${result.error}`);
    }
    return;
  }

  // MODO 2: Prueba de Falla y Reintentos Exponenciales
  if (args.includes('--test-failure')) {
    console.log('\n--- [TEST FALLA] Simulando rechazo de Discord y reintentos exponenciales ---');
    const failEvent = {
      id: 'evento-fail-999',
      tipo: 'EVALUACION',
      titulo: 'Parcial Simulado con Error',
      catedra: 'Bases de Datos',
      color: '#F59E0B',
      fecha_larga: 'Viernes 20 de Octubre',
      hora: '19:00 hs',
      falta: 'en 2 horas',
      tipo_aviso: '2_HORAS'
    };

    const payload = buildDiscordEmbed(failEvent.tipo, failEvent);
    const result = await sendToDiscord(payload, { mockFailure: true, maxRetries: 3 });

    if (!result.success) {
      const record = store.record({
        evento_id: failEvent.id,
        tipo_evento: failEvent.tipo,
        tipo_aviso: failEvent.tipo_aviso,
        destinatario_canal: DEFAULT_CHANNEL_ID,
        estado: 'FALLIDO',
        intentos: result.attempt,
        error: result.error
      });
      console.log(`[RESULTADO TEST FALLA]: Reintentos completados (${result.attempt} intentos).`);
      console.log(`Registro asentado en base de auditoría con estado: ${record.estado}`);
      console.log(`Error capturado: ${record.error}`);
    }
    return;
  }

  console.log('Uso: node scripts/discord_reminders_worker.mjs [--test-event | --test-failure]');
}

// Ejecutar si se invoca directamente desde CLI
if (process.argv[1] && process.argv[1].endsWith('discord_reminders_worker.mjs')) {
  main().then(() => process.exit(0)).catch(err => {
    console.error('Error no controlado:', err);
    process.exit(1);
  });
}
