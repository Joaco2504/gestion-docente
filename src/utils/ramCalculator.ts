import { obtenerFeriado } from './feriadosAcademicos';
import { calcularPorcentajeAsistencia as calcAsistLegacy, calcularCondicionFinal as calcCondLegacy } from '../lib/academicLogic';

export interface AsistenciaItem {
  id?: string;
  clase_id?: string;
  fecha?: string;
  estado: 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADA' | string;
  docenteAusente?: boolean;
  inasistenciaDocente?: boolean;
  es_computable?: boolean;
}

export interface ClaseItem {
  id?: string;
  fecha?: string;
  es_computable?: boolean;
  isFeriado?: boolean;
  tema?: string;
}

/**
 * Calcula el porcentaje de asistencia reglamentaria RAM protegiendo la integridad
 * del denominador. Los feriados y clases no computables se excluyen estrictamente
 * tanto del total de clases como del cómputo de inasistencias.
 *
 * Fórmula RAM: (Presentes en clases computables / Clases computables efectivas) * 100
 */
export function calcularAsistenciaRAM(
  asistencias: AsistenciaItem[] = [],
  clases: ClaseItem[] | number = [],
  clasesConLicenciaDocente = 0
): number {
  let totalClasesComputables = 0;
  const licencias = Number(clasesConLicenciaDocente || 0);

  if (Array.isArray(clases)) {
    // Filtrar clases computables (excluyendo feriados oficiales y jornadas no computables)
    totalClasesComputables = clases.filter(c => {
      if (c.es_computable === false || c.isFeriado) return false;
      if (c.fecha && obtenerFeriado(c.fecha)) return false;
      return true;
    }).length;
  } else {
    totalClasesComputables = Number(clases || 0);
  }

  // Filtrar asistencias del alumno en clases computables
  const asistenciasComputables = (asistencias || []).filter(a => {
    if (a.es_computable === false) return false;
    if (a.fecha && obtenerFeriado(a.fecha)) return false;
    return true;
  });

  return calcAsistLegacy(asistenciasComputables, totalClasesComputables, licencias);
}

// Re-exportar cálculo tradicional y condicional
export { calcAsistLegacy as calcularPorcentajeAsistencia, calcCondLegacy as calcularCondicionFinal };
export default calcularAsistenciaRAM;
