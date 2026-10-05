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

export interface EvaluacionItem {
  id: string;
  titulo?: string;
  tipo?: string;
  formato?: string;
  fecha?: string | null;
  fecha_entrega?: string | null;
  evaluacion_origen_id?: string | null;
  ponderacion?: number;
}

export interface NotaItem {
  evaluacion_id: string;
  estudiante_id?: string;
  valor?: number | null;
  nota?: number | null;
  estado?: 'CALIFICADO' | 'NO_ENTREGO' | 'AUSENTE' | string;
}

export interface EvaluacionResultadoRAM {
  evaluada: boolean;
  aprobado: boolean;
  nota: number | null;
  estado: 'CALIFICADO' | 'NO_ENTREGO' | 'AUSENTE' | 'PENDIENTE';
  requiereRecuperatorio: boolean;
}

export interface CriteriosRamCatedra {
  asistenciaRegular: number;   // Ej. 70
  asistenciaTrabajo: number;   // Ej. 60
  asistenciaPromocion: number; // Ej. 80
  notaAprobacion: number;      // Ej. 4
  notaPromocion: number;       // Ej. 7
}

/**
 * Motor de Regularidad RAM dinámico:
 * - Soporte para acreditación directa por equivalencia (excluye de cómputos)
 * - Umbral preferencial del 60% para estudiantes con régimen laboral certificado
 * - Umbral del 70% para cursantes estándar y 80% para promoción directa
 */
export function evaluarCondicionEstudiante(
  inscripcion: {
    es_equivalencia?: boolean;
    tiene_certificado_trabajo?: boolean;
  } = {},
  porcentajeAsistencia = 0,
  notasValidas: Array<{ nota: number | null; estado: string; aprobado: boolean }> = [],
  criterios: CriteriosRamCatedra = {
    asistenciaRegular: 70,
    asistenciaTrabajo: 60,
    asistenciaPromocion: 80,
    notaAprobacion: 4,
    notaPromocion: 7
  }
): { condicion: 'ACREDITADA_EQUIVALENCIA' | 'PROMOCIONAL' | 'REGULAR' | 'LIBRE'; umbralAplicado: number; detalle: string } {
  // 1. Acreditación directa por equivalencia
  if (inscripcion?.es_equivalencia) {
    return {
      condicion: 'ACREDITADA_EQUIVALENCIA',
      umbralAplicado: 0,
      detalle: 'Materia acreditada por equivalencia reglamentaria.'
    };
  }

  // 2. Determinar umbral de asistencia según régimen del estudiante
  const umbralAsistencia = inscripcion?.tiene_certificado_trabajo
    ? (criterios?.asistenciaTrabajo ?? 60)
    : (criterios?.asistenciaRegular ?? 70);

  const cumpleAsistenciaRegular = porcentajeAsistencia >= umbralAsistencia;
  const cumpleAsistenciaPromo = porcentajeAsistencia >= (criterios?.asistenciaPromocion ?? 80);

  const examenesAprobados = notasValidas.length > 0 && notasValidas.every(n => n.aprobado);
  const notasParaPromo = notasValidas.length > 0 && notasValidas.every(n => (n.nota || 0) >= (criterios?.notaPromocion ?? 7));

  // 3. Dictamen reglamentario
  if (cumpleAsistenciaPromo && notasParaPromo && examenesAprobados && notasValidas.length > 0) {
    return {
      condicion: 'PROMOCIONAL',
      umbralAplicado: criterios?.asistenciaPromocion ?? 80,
      detalle: `Promoción directa alcanzada (${porcentajeAsistencia}% asistencia).`
    };
  }

  if (cumpleAsistenciaRegular && examenesAprobados) {
    return {
      condicion: 'REGULAR',
      umbralAplicado: umbralAsistencia,
      detalle: `Regularidad alcanzada (${porcentajeAsistencia}% sobre mín. ${umbralAsistencia}%).`
    };
  }

  return {
    condicion: 'LIBRE',
    umbralAplicado: umbralAsistencia,
    detalle: `No alcanza regularidad (requiere ${umbralAsistencia}% asistencia y exámenes aprobados).`
  };
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

/**
 * Normaliza y audita las notas de un alumno protegiendo el cálculo RAM contra valores NaN,
 * tratando NO_ENTREGO y AUSENTE como instancias desaprobadas con derecho a recuperatorio cuando corresponda.
 */
export function calcularNotasRAM(
  evaluaciones: EvaluacionItem[] = [],
  notas: NotaItem[] = [],
  estudianteId?: string,
  notaMinimaAprobacion = 4
): EvaluacionResultadoRAM[] {
  if (!evaluaciones || evaluaciones.length === 0) return [];

  return evaluaciones.map(ev => {
    const registro = notas.find(n => 
      n.evaluacion_id === ev.id && 
      (!estudianteId || !n.estudiante_id || n.estudiante_id === estudianteId)
    );

    if (!registro) {
      return { 
        evaluada: false, 
        aprobado: false, 
        nota: null, 
        estado: 'PENDIENTE', 
        requiereRecuperatorio: false 
      };
    }

    const tUpper = String(ev.tipo || '').toUpperCase();
    const esParcial = tUpper.includes('PARCIAL') || tUpper.includes('RECUP') || tUpper === 'PRUEBA';

    // 1. Estado No Entregó (Típico en TPs)
    if (registro.estado === 'NO_ENTREGO') {
      return {
        evaluada: true,
        aprobado: false,
        nota: 0,
        estado: 'NO_ENTREGO',
        requiereRecuperatorio: false
      };
    }

    // 2. Estado Ausente (Típico en Parciales / Exámenes)
    if (registro.estado === 'AUSENTE') {
      return {
        evaluada: true,
        aprobado: false,
        nota: 0,
        estado: 'AUSENTE',
        requiereRecuperatorio: esParcial
      };
    }

    // 3. Calificación numérica estándar
    const val = registro.valor !== undefined && registro.valor !== null
      ? Number(registro.valor)
      : (registro.nota !== undefined && registro.nota !== null ? Number(registro.nota) : null);

    if (val !== null && !isNaN(val)) {
      return {
        evaluada: true,
        aprobado: val >= notaMinimaAprobacion,
        nota: val,
        estado: 'CALIFICADO',
        requiereRecuperatorio: esParcial && val < notaMinimaAprobacion
      };
    }

    return {
      evaluada: false,
      aprobado: false,
      nota: null,
      estado: 'PENDIENTE',
      requiereRecuperatorio: false
    };
  });
}

/**
 * Calcula el promedio aritmético o ponderado blindado contra NaN o divisiones por cero.
 */
export function calcularPromedioRAM(
  evaluaciones: EvaluacionItem[] = [],
  notas: NotaItem[] = [],
  estudianteId?: string
): number | null {
  const analizadas = calcularNotasRAM(evaluaciones, notas, estudianteId);
  const calificadas = analizadas.filter(a => a.evaluada && a.nota !== null && !isNaN(a.nota));

  if (calificadas.length === 0) return null;

  const suma = calificadas.reduce((acc, curr) => acc + (curr.nota || 0), 0);
  const prom = suma / calificadas.length;

  return isNaN(prom) ? null : Number(prom.toFixed(2));
}

// Re-exportar cálculo tradicional y condicional
export { calcAsistLegacy as calcularPorcentajeAsistencia, calcCondLegacy as calcularCondicionFinal };
export default calcularAsistenciaRAM;
