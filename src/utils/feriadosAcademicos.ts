import { parseISO, format, isWithinInterval, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { FERIADOS_ARGENTINA, type Feriado } from '../data/feriadosArgentina';

// Mapeo estándar de días (0 = Domingo, 1 = Lunes, ..., 6 = Sábado)
const DIAS_SEMANA_MAP: Record<number, string> = {
  0: 'domingo',
  1: 'lunes',
  2: 'martes',
  3: 'miercoles',
  4: 'jueves',
  5: 'viernes',
  6: 'sabado'
};

/**
 * Normaliza cadenas quitando acentos y espacios
 */
export function normalizarTexto(txt: string): string {
  return (txt || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Verifica si una fecha específica (YYYY-MM-DD o ISO) es feriado nacional o provincial
 */
export function obtenerFeriado(fechaStr: string): Feriado | null {
  if (!fechaStr) return null;
  const fechaLimpia = String(fechaStr).split('T')[0];
  return FERIADOS_ARGENTINA.find(f => f.fecha === fechaLimpia) || null;
}

/**
 * Determina rápidamente si una fecha específica es feriado
 */
export function esFechaFeriado(fechaStr: string): boolean {
  return obtenerFeriado(fechaStr) !== null;
}

/**
 * Determina si un feriado coincide con los días de clase asignados a la cátedra
 */
export function feriadoCoincideConCatedra(
  fechaStr: string,
  horariosSemanales: Array<{ dia: string; hora_inicio?: string; hora_fin?: string; desde?: string; hasta?: string; aula?: string }>
): { coincide: boolean; feriado: Feriado | null; detalleHorario?: any } {
  const feriado = obtenerFeriado(fechaStr);
  if (!feriado) return { coincide: false, feriado: null };

  const cleanDate = String(fechaStr).split('T')[0];
  const parsedDate = parseISO(cleanDate);

  let nombreDia = '';
  if (isValid(parsedDate)) {
    // Obtener nombre del día en español (ej. "lunes", "martes")
    nombreDia = normalizarTexto(format(parsedDate, 'EEEE', { locale: es }));
  } else {
    // Fallback defensivo posicional
    const partes = cleanDate.split('-');
    const fallbackDate = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    nombreDia = DIAS_SEMANA_MAP[fallbackDate.getDay()] || '';
  }

  const horarioCatedra = (horariosSemanales || []).find(h => 
    normalizarTexto(h.dia) === nombreDia
  );

  return {
    coincide: Boolean(horarioCatedra),
    feriado,
    detalleHorario: horarioCatedra
  };
}

/**
 * Obtiene todos los feriados que coinciden con los días habituales de la cátedra
 * dentro del período lectivo especificado.
 */
export function obtenerFeriadosCatedraEnPeriodo(
  horariosSemanales: Array<{ dia: string; hora_inicio?: string; hora_fin?: string; desde?: string; hasta?: string; aula?: string }>,
  fechaInicio = '2026-03-01',
  fechaFin = '2026-11-30'
): Array<{ fecha: string; feriado: Feriado; detalleHorario: any }> {
  const start = parseISO(String(fechaInicio).split('T')[0]);
  const end = parseISO(String(fechaFin).split('T')[0]);

  const resultados: Array<{ fecha: string; feriado: Feriado; detalleHorario: any }> = [];

  FERIADOS_ARGENTINA.forEach(f => {
    const fDate = parseISO(f.fecha);
    const inRange = isValid(start) && isValid(end) && isValid(fDate)
      ? isWithinInterval(fDate, { start, end })
      : (f.fecha >= String(fechaInicio).split('T')[0] && f.fecha <= String(fechaFin).split('T')[0]);

    if (inRange) {
      const match = feriadoCoincideConCatedra(f.fecha, horariosSemanales);
      if (match.coincide && match.feriado) {
        resultados.push({
          fecha: f.fecha,
          feriado: match.feriado,
          detalleHorario: match.detalleHorario
        });
      }
    }
  });

  return resultados;
}

export default {
  obtenerFeriado,
  esFechaFeriado,
  feriadoCoincideConCatedra,
  obtenerFeriadosCatedraEnPeriodo,
  normalizarTexto
};
