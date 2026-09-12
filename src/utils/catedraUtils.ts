/**
 * Funciones utilitarias y cálculos centrales para el ecosistema de Cátedras.
 * Extraído para centralizar la lógica de negocio y evitar importaciones circulares.
 */

import { 
  calcularPorcentajeAsistencia, 
  calcularCondicionFinal 
} from '../lib/academicLogic';
import { 
  formatFechaDMY, 
  parseDMYtoYMD, 
  getTodayYMD, 
  isDatePast 
} from '../lib/dateUtils';
import { 
  calculateStudentRisk, 
  calculateCatedraRiskSummary 
} from '../lib/earlyWarningLogic';
import { 
  VALID_CATEDRA_TABS, 
  DEFAULT_CRITERIOS_EVALUACION,
  type CatedraTabId,
  type CondicionEstudiante,
  type HorarioSemanal
} from '../types/catedra';

// Re-exportar utilidades comunes
export {
  calcularPorcentajeAsistencia,
  calcularCondicionFinal,
  formatFechaDMY,
  parseDMYtoYMD,
  getTodayYMD,
  isDatePast,
  calculateStudentRisk,
  calculateCatedraRiskSummary,
  VALID_CATEDRA_TABS,
  DEFAULT_CRITERIOS_EVALUACION
};

/**
 * Valida si un ID de pestaña es válido dentro de la vista de Cátedra.
 */
export function isValidCatedraTab(tab: string | null | undefined): tab is CatedraTabId {
  if (!tab) return false;
  return (VALID_CATEDRA_TABS as string[]).includes(tab);
}

/**
 * Devuelve la variante de Badge para una condición académica (RAM).
 */
export function getConditionBadgeVariant(condicion: string | CondicionEstudiante): 'success' | 'warning' | 'danger' | 'default' | 'primary' {
  const norm = String(condicion || '').toUpperCase().trim();
  switch (norm) {
    case 'PROMOCIONAL':
    case 'PROMOCION':
    case 'APROBADO':
      return 'success';
    case 'REGULAR':
      return 'primary';
    case 'LIBRE':
    case 'DESAPROBADO':
      return 'danger';
    case 'EN_CURSO':
    case 'EN SEGUIMIENTO':
      return 'warning';
    default:
      return 'default';
  }
}

/**
 * Formatea un horario semanal para mostrar en chips o listas.
 */
export function formatHorario(h: HorarioSemanal): string {
  if (!h) return '';
  const aulaPart = h.aula ? ` (${h.aula})` : '';
  return `${h.dia || ''} ${h.desde || ''}-${h.hasta || ''}${aulaPart}`.trim();
}

/**
 * Obtiene el color de semáforo para un porcentaje de asistencia.
 */
export function getAsistenciaColorClass(pct: number, minReg: number = 70, minPromo: number = 80): string {
  if (pct >= minPromo) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= minReg) return 'text-indigo-600 dark:text-indigo-400';
  return 'text-rose-600 dark:text-rose-400';
}
