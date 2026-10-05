import { 
  format, 
  parse, 
  parseISO, 
  isValid, 
  differenceInCalendarDays, 
  isBefore, 
  endOfDay, 
  startOfDay 
} from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Utilidades para manejo y formateo de fechas con date-fns y soporte de localización en español.
 * Estándar: DD-MM-YYYY para presentación y YYYY-MM-DD para persistencia en base de datos.
 */

/**
 * Convierte cualquier formato de fecha estándar (YYYY-MM-DD, ISO string, o Date) a DD-MM-YYYY.
 * @param {string|Date} dateInput 
 * @returns {string} Fecha en formato DD-MM-YYYY (ej: '10-09-2026')
 */
export function formatFechaDMY(dateInput) {
  if (!dateInput) return '';

  if (dateInput instanceof Date) {
    return isValid(dateInput) ? format(dateInput, 'dd-MM-yyyy') : '';
  }

  const str = String(dateInput).trim();

  // Si ya viene como DD-MM-YYYY o DD/MM/YYYY
  if (/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.test(str)) {
    const parts = str.split(/[-/]/);
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${day}-${month}-${year}`;
  }

  // Si viene como YYYY-MM-DD o ISO con hora
  if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(str)) {
    const cleanDate = str.split('T')[0];
    const parsed = parseISO(cleanDate);
    if (isValid(parsed)) {
      return format(parsed, 'dd-MM-yyyy');
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
  return format(new Date(), 'dd-MM-yyyy');
}

/**
 * Retorna la fecha de hoy en formato YYYY-MM-DD para <input type="date">
 * @returns {string}
 */
export function getTodayYMD() {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Determina si una fecha (en formato YYYY-MM-DD o DD-MM-YYYY) ya pasó respecto al fin del día de hoy.
 * @param {string|Date} dateInput 
 * @returns {boolean}
 */
export function isDatePast(dateInput) {
  if (!dateInput) return false;

  let parsedDate;
  if (dateInput instanceof Date) {
    parsedDate = dateInput;
  } else {
    const iso = parseDMYtoYMD(String(dateInput));
    parsedDate = parseISO(iso);
  }

  if (!isValid(parsedDate)) return false;

  // Comparar con el final del día de la fecha objetivo
  return isBefore(endOfDay(parsedDate), new Date());
}

/**
 * Retorna una fecha en formato legible y abreviado en español (ej. "Lun 15 Mar", "Jue 10 Sep").
 * @param {string|Date} dateInput 
 * @returns {string}
 */
export function formatFechaLegible(dateInput) {
  if (!dateInput) return '';

  let parsedDate;
  if (dateInput instanceof Date) {
    parsedDate = dateInput;
  } else {
    const iso = parseDMYtoYMD(String(dateInput));
    parsedDate = parseISO(iso);
  }

  if (!isValid(parsedDate)) return String(dateInput);

  // Formatear con locale español: "lun 15 mar"
  const formatted = format(parsedDate, 'EEE d MMM', { locale: es });
  
  // Capitalizar iniciales para consistencia visual (ej. "Lun 15 Mar")
  return formatted
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Retorna etiqueta de tiempo relativo respecto a hoy (ej. "Hoy", "Mañana", "En 3 días", "Ayer", "Hace 3 días").
 * @param {string|Date} dateInput 
 * @returns {string}
 */
export function getRelativeDateLabel(dateInput) {
  if (!dateInput) return '';

  let targetDate;
  if (dateInput instanceof Date) {
    targetDate = dateInput;
  } else {
    const iso = parseDMYtoYMD(String(dateInput));
    targetDate = parseISO(iso);
  }

  if (!isValid(targetDate)) return '';

  const today = new Date();
  const diffDays = differenceInCalendarDays(targetDate, today);

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Mañana';
  if (diffDays === 2) return 'Pasado mañana';
  if (diffDays > 2) return `En ${diffDays} días`;
  if (diffDays === -1) return 'Ayer';
  return `Hace ${Math.abs(diffDays)} días`;
}
