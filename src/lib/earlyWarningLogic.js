import { calcularPorcentajeAsistencia } from './academicLogic';

/**
 * Motor de Alerta Temprana y Semáforo de Riesgo Académico en Tiempo Real.
 * Analiza en el cliente la trayectoria de asistencia y calificaciones del alumno.
 */

/**
 * Calcula el estado de riesgo de un estudiante particular
 * @param {string} studentId - ID del estudiante
 * @param {Object} context - Datos académicos de la cátedra
 * @returns {Object} { level: 'CRITICAL'|'WARNING'|'OPTIMAL', reasons: string[], badgeLabel: string, colorClass: string, pulseClass: string }
 */
export function calculateStudentRisk(studentId, {
  asistencias = [],
  clases = [],
  inasistenciasDocente = [],
  evaluaciones = [],
  notas = [],
  criterios = {},
  academicLevel = 'TERCIARIO',
  modalidad = 'ANUAL'
}) {
  const minPromoAsist = Number(criterios.min_asist_promo ?? 80);
  const minRegAsist = Number(criterios.min_asist_reg ?? 70);
  const notaMinPromo = Number(criterios.nota_min_promo ?? 7);
  const notaMinReg = Number(criterios.nota_min_reg ?? 4);

  // 1. Filtrar clases efectivas (excluyendo licencias del docente)
  const fechasLicencia = new Set(inasistenciasDocente.map(i => i.fecha));
  const clasesEfectivasOrdenadas = [...clases]
    .filter(c => !fechasLicencia.has(c.fecha))
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const totalClasesEfectivas = clasesEfectivasOrdenadas.length;

  // Mapa de asistencias del estudiante
  const studentAsistencias = asistencias.filter(a => a.estudiante_id === studentId);
  const asistMap = new Map();
  studentAsistencias.forEach(a => {
    asistMap.set(a.clase_id, a.estado);
  });

  // Conteo de presentes y porcentaje actual
  const presentesCount = studentAsistencias.filter(a => a.estado === 'PRESENTE').length;
  const asistPct = calcularPorcentajeAsistencia(studentAsistencias, clases.length, inasistenciasDocente.length);

  // 2. Cálculo de inasistencias consecutivas
  // Revisamos en orden cronológico reciente hacia atrás
  let consecutiveAbsences = 0;
  for (let i = clasesEfectivasOrdenadas.length - 1; i >= 0; i--) {
    const c = clasesEfectivasOrdenadas[i];
    const estado = asistMap.get(c.id);
    if (estado === 'AUSENTE') {
      consecutiveAbsences++;
    } else if (estado === 'PRESENTE') {
      break; // Se interrumpe la racha de ausencias
    }
  }

  // 3. Análisis de evaluaciones y notas
  const studentNotas = notas.filter(n => n.estudiante_id === studentId);
  const notasMap = new Map();
  studentNotas.forEach(n => {
    const val = Number(n.valor);
    if (!isNaN(val)) {
      notasMap.set(n.evaluacion_id, val);
    }
  });

  const parciales = evaluaciones.filter(e => e.tipo === 'PARCIAL');
  const recuperatorios = evaluaciones.filter(e => e.tipo === 'RECUPERATORIO');

  let parcialesReprobadosSinRecup = 0;
  let parcialesConNotaBaja = 0;
  let parcialesPendientesDeNota = 0;

  parciales.forEach(p => {
    const notaOrig = notasMap.get(p.id);
    const recupLinked = recuperatorios.find(r => r.evaluacion_origen_id === p.id);
    const notaRecup = recupLinked ? notasMap.get(recupLinked.id) : undefined;

    if (notaOrig === undefined) {
      parcialesPendientesDeNota++;
    } else {
      const notaEfectiva = notaRecup !== undefined ? Math.max(notaOrig, notaRecup) : notaOrig;
      if (notaEfectiva < notaMinReg) {
        parcialesReprobadosSinRecup++;
      } else if (notaEfectiva < notaMinPromo) {
        parcialesConNotaBaja++;
      }
    }
  });

  // 4. Margen de inasistencias (a 1 falta de perder regularidad o promoción)
  let aUnaFaltaDeRegularidad = false;
  let aUnaFaltaDePromocion = false;

  if (totalClasesEfectivas >= 3) {
    // Si la próxima clase falta: (presentes / (totalClases + 1)) * 100
    const pctSiFaltaProxima = Number(((presentesCount / (totalClasesEfectivas + 1)) * 100).toFixed(1));
    if (asistPct >= minRegAsist && pctSiFaltaProxima < minRegAsist) {
      aUnaFaltaDeRegularidad = true;
    }
    if (asistPct >= minPromoAsist && pctSiFaltaProxima < minPromoAsist) {
      aUnaFaltaDePromocion = true;
    }
  }

  const reasons = [];

  // =========================================================================
  // EVALUACIÓN DE NIVELES DE RIESGO
  // =========================================================================

  // A. Nivel Rojo: RIESGO CRÍTICO
  const esRiesgoInasistenciasConsecutivas = consecutiveAbsences >= 3;
  const esRiesgoCupoMaximoSuperado = totalClasesEfectivas >= 3 && asistPct < minRegAsist;
  const esRiesgoParcialesMultiples = parcialesReprobadosSinRecup >= 2;

  if (esRiesgoInasistenciasConsecutivas) {
    reasons.push(`Acumula ${consecutiveAbsences} inasistencias seguidas.`);
  }
  if (esRiesgoCupoMaximoSuperado) {
    reasons.push(`Superó el cupo máximo de faltas (Asistencia: ${asistPct}% < ${minRegAsist}%).`);
  }
  if (esRiesgoParcialesMultiples) {
    reasons.push(`Registra ${parcialesReprobadosSinRecup} exámenes parciales reprobados sin recuperar.`);
  }

  if (reasons.length > 0) {
    return {
      level: 'CRITICAL',
      score: 3,
      badgeLabel: 'Riesgo Crítico',
      badgeVariant: 'danger',
      reasons,
      primaryReason: reasons[0],
      asistPct,
      consecutiveAbsences
    };
  }

  // B. Nivel Ámbar: EN OBSERVACIÓN / ADVERTENCIA
  if (aUnaFaltaDeRegularidad) {
    reasons.push(`A solo 1 inasistencia de perder la Regularidad.`);
  } else if (aUnaFaltaDePromocion) {
    reasons.push(`A solo 1 inasistencia de perder la Promoción.`);
  }

  if (parcialesReprobadosSinRecup === 1) {
    reasons.push(`1 examen parcial reprobado pendiente de recuperación.`);
  } else if (parcialesPendientesDeNota > 0 && parciales.length > 0) {
    reasons.push(`Examen parcial pendiente de calificación.`);
  }

  if (reasons.length > 0) {
    return {
      level: 'WARNING',
      score: 2,
      badgeLabel: 'En Observación',
      badgeVariant: 'warning',
      reasons,
      primaryReason: reasons[0],
      asistPct,
      consecutiveAbsences
    };
  }

  // C. Nivel Verde: CONDICIÓN ÓPTIMA
  return {
    level: 'OPTIMAL',
    score: 1,
    badgeLabel: 'Óptimo',
    badgeVariant: 'success',
    reasons: ['Asistencia y calificaciones dentro de los parámetros esperados.'],
    primaryReason: 'Asistencia y calificaciones en regla.',
    asistPct,
    consecutiveAbsences
  };
}

/**
 * Genera el resumen global de alerta temprana de la cátedra
 */
export function calculateCatedraRiskSummary(estudiantes = [], context = {}) {
  const critical = [];
  const warning = [];
  const optimal = [];

  estudiantes.forEach(est => {
    const risk = calculateStudentRisk(est.id, context);
    const item = { ...est, risk };
    if (risk.level === 'CRITICAL') {
      critical.push(item);
    } else if (risk.level === 'WARNING') {
      warning.push(item);
    } else {
      optimal.push(item);
    }
  });

  return {
    critical,
    warning,
    optimal,
    total: estudiantes.length,
    criticalCount: critical.length,
    warningCount: warning.length,
    optimalCount: optimal.length
  };
}
