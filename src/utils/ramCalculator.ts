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
  detalle_recuperatorio?: Array<{
    evaluacion_id: string;
    titulo?: string;
    nota_recuperatorio?: number | null;
    valor?: number | null;
    nota?: number | null;
    estado?: string;
    aprobado?: boolean;
  }> | null;
  observaciones?: string | null;
}

export interface EvaluacionResultadoRAM {
  evaluada: boolean;
  aprobado: boolean;
  nota: number | null;
  estado: 'CALIFICADO' | 'NO_ENTREGO' | 'AUSENTE' | 'PENDIENTE';
  requiereRecuperatorio: boolean;
}

export interface CriteriosRamCatedra {
  asistenciaRegular?: number;        // Ej. 70
  asistenciaTrabajo?: number;        // Ej. 60
  asistenciaPromocion?: number;      // Ej. 80
  notaAprobacion?: number;           // Ej. 4
  notaPromocion?: number;            // Ej. 7
  ram_asistencia_regular?: number;   // Ej. 70
  ram_asistencia_trabajo?: number;   // Ej. 60
  ram_asistencia_promocion?: number; // Ej. 80
  nota_regularidad?: number;         // Ej. 4
  nota_promocion?: number;           // Ej. 7
  porcentaje_tps_regular?: number;   // Ej. 80
  porcentaje_tps_promocion?: number; // Ej. 100
  eval_considerar_asistencia?: boolean;
  eval_considerar_parciales?: boolean;
  eval_considerar_tps?: boolean;
}

/**
 * Motor de Regularidad RAM dinámico:
 * - Soporte para acreditación directa por equivalencia (excluye de cómputos)
 * - Soporte para override manual por alumno (condicion_manual)
 * - Umbral preferencial del 60% para estudiantes con régimen laboral certificado
 * - Umbral del 70% para cursantes estándar y 80% para promoción directa
 * - Soporte para parámetros configurables (eval_considerar_asistencia, eval_considerar_parciales, eval_considerar_tps)
 */
export function evaluarCondicionEstudiante(
  inscripcion: {
    es_equivalencia?: boolean;
    tiene_certificado_trabajo?: boolean;
    condicion_manual?: string | null;
    motivo_condicion_manual?: string | null;
  } = {},
  porcentajeAsistencia = 0,
  notasValidas: Array<{ nota: number | null; estado: string; aprobado: boolean }> = [],
  criterios: CriteriosRamCatedra = {
    asistenciaRegular: 70,
    asistenciaTrabajo: 60,
    asistenciaPromocion: 80,
    notaAprobacion: 4,
    notaPromocion: 7,
    eval_considerar_asistencia: true,
    eval_considerar_parciales: true,
    eval_considerar_tps: true
  }
): { condicion: 'ACREDITADA_EQUIVALENCIA' | 'PROMOCIONAL' | 'PROMOCION_INDIRECTA' | 'REGULAR' | 'LIBRE' | 'RECUPERATORIO'; umbralAplicado: number; detalle: string; esManual?: boolean } {
  // 1. Acreditación directa por equivalencia
  if (inscripcion?.es_equivalencia) {
    return {
      condicion: 'ACREDITADA_EQUIVALENCIA',
      umbralAplicado: 0,
      detalle: 'Materia acreditada por equivalencia reglamentaria.'
    };
  }

  // 2. Determinar umbral de asistencia según régimen del estudiante
  const evalAsist = criterios?.eval_considerar_asistencia !== false;
  const evalParciales = criterios?.eval_considerar_parciales !== false;

  const umbralAsistencia = inscripcion?.tiene_certificado_trabajo
    ? (criterios?.ram_asistencia_trabajo ?? criterios?.asistenciaTrabajo ?? 60)
    : (criterios?.ram_asistencia_regular ?? criterios?.asistenciaRegular ?? 70);
  const umbralPromo = criterios?.ram_asistencia_promocion ?? criterios?.asistenciaPromocion ?? 80;
  const notaMinPromo = criterios?.nota_promocion ?? criterios?.notaPromocion ?? 7;

  const cumpleAsistenciaRegular = !evalAsist || porcentajeAsistencia >= umbralAsistencia;
  const cumpleAsistenciaPromo = !evalAsist || porcentajeAsistencia >= umbralPromo;

  const examenesAprobados = !evalParciales || (notasValidas.length > 0 && notasValidas.every(n => n.aprobado));
  const notasParaPromo = !evalParciales || (notasValidas.length > 0 && notasValidas.every(n => (n.nota || 0) >= notaMinPromo));

  // 3. Override manual si el docente fijó condición para este alumno
  if (inscripcion?.condicion_manual && inscripcion.condicion_manual !== 'AUTO') {
    const manualCond = inscripcion.condicion_manual as 'PROMOCIONAL' | 'PROMOCION_INDIRECTA' | 'REGULAR' | 'LIBRE';
    return {
      condicion: manualCond,
      umbralAplicado: umbralAsistencia,
      detalle: inscripcion.motivo_condicion_manual || `Condición fijada manualmente por el docente: ${manualCond}`,
      esManual: true
    };
  }

  // 4. Dictamen reglamentario automático
  if (cumpleAsistenciaPromo && notasParaPromo && examenesAprobados && (!evalParciales || notasValidas.length > 0)) {
    return {
      condicion: 'PROMOCIONAL',
      umbralAplicado: umbralPromo,
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
 * Si un parcial tiene recuperatorio aprobado con nota mayor, utiliza la mejor nota efectiva.
 */
export function calcularPromedioRAM(
  evaluaciones: EvaluacionItem[] = [],
  notas: NotaItem[] = [],
  estudianteId?: string
): number | null {
  const analizadas = calcularNotasRAM(evaluaciones, notas, estudianteId);
  if (analizadas.length === 0) return null;

  // Mapear por evaluación para resolver recuperatorios vinculados a su parcial origen
  const evalById = new Map(evaluaciones.map((ev, idx) => [ev.id, { ev, res: analizadas[idx] }]));
  const recupsByOrigen = new Map<string, { ev: EvaluacionItem; res: EvaluacionResultadoRAM }>();

  // Mapa de recuperatorios configurados en detalle_recuperatorio (Opción B)
  const recuperatoriosMap = new Map<string, number>();
  notas.forEach(n => {
    if (estudianteId && n.estudiante_id && n.estudiante_id !== estudianteId) return;
    let detalle = n.detalle_recuperatorio;
    if (!detalle && n.observaciones && typeof n.observaciones === 'string' && n.observaciones.trim().startsWith('[')) {
      try {
        detalle = JSON.parse(n.observaciones);
      } catch (_) {}
    }
    if (Array.isArray(detalle)) {
      detalle.forEach(item => {
        if (item && item.evaluacion_id) {
          const valRec = item.nota_recuperatorio ?? item.valor ?? item.nota;
          if (valRec !== null && valRec !== undefined && valRec !== '' && !isNaN(Number(valRec))) {
            recuperatoriosMap.set(String(item.evaluacion_id), Number(valRec));
          }
        }
      });
    }
  });

  evaluaciones.forEach((ev, idx) => {
    const isRecup = String(ev.tipo || '').toUpperCase().includes('RECUP');
    if (isRecup && ev.evaluacion_origen_id) {
      recupsByOrigen.set(ev.evaluacion_origen_id, { ev, res: analizadas[idx] });
    }
  });

  let sumaPonderada = 0;
  let pesoTotal = 0;

  evaluaciones.forEach((ev, idx) => {
    const isRecup = String(ev.tipo || '').toUpperCase().includes('RECUP');
    if (isRecup && ev.evaluacion_origen_id && evalById.has(ev.evaluacion_origen_id)) {
      return; // Se evalúa junto a su parcial de origen
    }

    const mainRes = analizadas[idx];
    const linkedRecup = recupsByOrigen.get(ev.id)?.res;

    let notaEfectiva: number | null = null;
    if (mainRes.evaluada && mainRes.nota !== null && !isNaN(mainRes.nota)) {
      notaEfectiva = mainRes.nota;
    }
    if (linkedRecup?.evaluada && linkedRecup.nota !== null && !isNaN(linkedRecup.nota)) {
      notaEfectiva = notaEfectiva !== null ? Math.max(notaEfectiva, linkedRecup.nota) : linkedRecup.nota;
    }
    if (recuperatoriosMap.has(String(ev.id))) {
      const recVal = recuperatoriosMap.get(String(ev.id))!;
      notaEfectiva = notaEfectiva !== null ? Math.max(notaEfectiva, recVal) : recVal;
    }

    if (notaEfectiva !== null) {
      const peso = ev.ponderacion && Number(ev.ponderacion) > 0 ? Number(ev.ponderacion) : 1;
      sumaPonderada += notaEfectiva * peso;
      pesoTotal += peso;
    }
  });

  if (pesoTotal === 0) return null;
  const prom = sumaPonderada / pesoTotal;
  return isNaN(prom) ? null : Number(prom.toFixed(2));
}

// Re-exportar cálculo tradicional y condicional
export { calcAsistLegacy as calcularPorcentajeAsistencia, calcCondLegacy as calcularCondicionFinal };
export default calcularAsistenciaRAM;
