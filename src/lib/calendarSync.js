/**
 * UTILIDADES DE SINCRONIZACIÓN Y EXPORTACIÓN DE CALENDARIO (DocentePro)
 * Generación de archivos .ics estándar (RFC 5545) y URLs de plantilla de Google Calendar.
 */

/**
 * Formatea una fecha o cadena ISO a formato iCalendar (YYYYMMDDTHHmmssZ o YYYYMMDDTHHmmss).
 */
export function formatToIcsDate(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Genera una URL de plantilla directa para añadir un evento a Google Calendar.
 * @param {Object} event
 * @param {string} event.titulo
 * @param {string} event.fecha_inicio
 * @param {string} [event.fecha_fin]
 * @param {string} [event.notas]
 * @param {string} [event.ubicacion]
 * @returns {string} URL de Google Calendar
 */
export function getGoogleCalendarUrl({ titulo, fecha_inicio, fecha_fin, notas, ubicacion }) {
  const startDate = new Date(fecha_inicio);
  let endDate = fecha_fin ? new Date(fecha_fin) : new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hora por defecto

  const startIso = formatToIcsDate(startDate);
  const endIso = formatToIcsDate(endDate);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: titulo || 'Compromiso Académico',
    dates: `${startIso}/${endIso}`,
    details: (notas || 'Generado desde DocentePro - Sistema de Gestión Docente').trim(),
    location: (ubicacion || '').trim()
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Genera el contenido de un archivo .ics estándar (RFC 5545) consolidando eventos y clases.
 * @param {Array} events - Eventos especiales (mesas, reuniones)
 * @param {Array} clases - Clases registradas
 * @param {Array} catedras - Cátedras para resolver nombres y aulas
 * @returns {string} Contenido del archivo .ics
 */
export function generateIcsContent(events = [], clases = [], catedras = []) {
  const catedraMap = new Map((catedras || []).map(c => [c.id, c]));

  let icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DocentePro//Gestion Docente Agenda//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:DocentePro - Agenda Académica',
    'X-WR-TIMEZONE:America/Argentina/Buenos_Aires'
  ];

  const nowIcs = formatToIcsDate(new Date());

  // 1. Agregar Eventos de Calendario (Mesas, Reuniones)
  (events || []).forEach(ev => {
    if (!ev.fecha_inicio) return;
    const startIcs = formatToIcsDate(ev.fecha_inicio);
    const endIcs = ev.fecha_fin ? formatToIcsDate(ev.fecha_fin) : startIcs;
    const uid = `event-${ev.id || Math.random().toString(36).substring(2)}@docentepro.app`;

    icsLines.push('BEGIN:VEVENT');
    icsLines.push(`UID:${uid}`);
    icsLines.push(`DTSTAMP:${nowIcs}`);
    icsLines.push(`DTSTART:${startIcs}`);
    icsLines.push(`DTEND:${endIcs}`);
    icsLines.push(`SUMMARY:${escapeIcsText(ev.titulo || 'Evento')}`);
    if (ev.notas) {
      icsLines.push(`DESCRIPTION:${escapeIcsText(ev.notas)}`);
    }
    icsLines.push('STATUS:CONFIRMED');
    icsLines.push('END:VEVENT');
  });

  // 2. Agregar Clases Registradas
  (clases || []).forEach(clase => {
    if (!clase.fecha) return;
    const cat = catedraMap.get(clase.catedra_id);
    const title = cat ? `${cat.nombre} - Clase` : 'Clase Regular';
    
    // Parsear fecha y asignar horario aproximado o del día
    const [y, m, d] = clase.fecha.split('-').map(Number);
    const startObj = new Date(y, m - 1, d, 18, 0, 0); // 18:00
    const endObj = new Date(y, m - 1, d, 20, 0, 0);   // 20:00

    const startIcs = formatToIcsDate(startObj);
    const endIcs = formatToIcsDate(endObj);
    const uid = `clase-${clase.id || Math.random().toString(36).substring(2)}@docentepro.app`;

    icsLines.push('BEGIN:VEVENT');
    icsLines.push(`UID:${uid}`);
    icsLines.push(`DTSTAMP:${nowIcs}`);
    icsLines.push(`DTSTART:${startIcs}`);
    icsLines.push(`DTEND:${endIcs}`);
    icsLines.push(`SUMMARY:${escapeIcsText(title)}`);
    
    const descParts = [];
    if (clase.tema) descParts.push(`Tema: ${clase.tema}`);
    if (cat?.institucion_nombre) descParts.push(`Institución: ${cat.institucion_nombre}`);
    if (descParts.length > 0) {
      icsLines.push(`DESCRIPTION:${escapeIcsText(descParts.join(' | '))}`);
    }

    icsLines.push('STATUS:CONFIRMED');
    icsLines.push('END:VEVENT');
  });

  icsLines.push('END:VCALENDAR');
  return icsLines.join('\r\n');
}

/**
 * Escapa caracteres reservados en formato RFC 5545
 */
function escapeIcsText(text = '') {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Descarga directamente un archivo .ics en el navegador
 */
export function downloadIcsFile(filename, icsContent) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.ics') ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
