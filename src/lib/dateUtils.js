/**
 * Utilidades para manejo y formateo de fechas en formato DD-MM-YYYY (estándar argentino/latinoamericano).
 */

/**
 * Convierte cualquier formato de fecha estándar (YYYY-MM-DD, ISO string, o Date) a DD-MM-YYYY.
 * @param {string|Date} dateInput 
 * @returns {string} Fecha en formato DD-MM-YYYY (ej: '10-09-2026')
 */
export function formatFechaDMY(dateInput) {
  if (!dateInput) return '';

  if (dateInput instanceof Date) {
    const d = String(dateInput.getDate()).padStart(2, '0');
    const m = String(dateInput.getMonth() + 1).padStart(2, '0');
    const y = dateInput.getFullYear();
    return `${d}-${m}-${y}`;
  }

  const str = String(dateInput).trim();

  // Si ya viene como DD-MM-YYYY o DD/MM/YYYY
  if (/^(\d{2})[-/](\d{2})[-/](\d{4})$/.test(str)) {
    return str.replace(/\//g, '-');
  }

  // Si viene como YYYY-MM-DD o con tiempo (ISO)
  if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(str)) {
    const cleanDate = str.split('T')[0];
    const parts = cleanDate.split(/[-/]/);
    if (parts.length >= 3) {
      const [year, month, day] = parts;
      return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
    }
  }

  return str;
}

/**
 * Convierte una fecha DD-MM-YYYY a formato ISO YYYY-MM-DD para almacenamiento estándar en PostgreSQL/Supabase.
 * @param {string} dmyStr 
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export function parseDMYtoYMD(dmyStr) {
  if (!dmyStr) return '';

  const str = String(dmyStr).trim();

  // Si ya está en YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Si viene como DD-MM-YYYY o DD/MM/YYYY
  const match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }

  return str;
}

/**
 * Retorna la fecha de hoy en formato DD-MM-YYYY
 * @returns {string}
 */
export function getTodayDMY() {
  return formatFechaDMY(new Date());
}

/**
 * Retorna la fecha de hoy en formato YYYY-MM-DD para <input type="date">
 * @returns {string}
 */
export function getTodayYMD() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Determina si una fecha (en formato YYYY-MM-DD o DD-MM-YYYY) ya pasó respecto al día de hoy.
 * @param {string} dateStr 
 * @returns {boolean}
 */
export function isDatePast(dateStr) {
  if (!dateStr) return false;
  const iso = parseDMYtoYMD(dateStr);
  const target = new Date(iso + 'T23:59:59');
  return target.getTime() < Date.now();
}
