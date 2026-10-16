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
export function calculateStudentRisk(studentIdOrOptions, maybeContext = {}) {
  // Manejo polimórfico: si se pasa un único objeto con propiedades del estudiante
  let studentId = studentIdOrOptions;
  let context = maybeContext || {};

  if (studentIdOrOptions && typeof studentIdOrOptions === 'object') {
    studentId = studentIdOrOptions.studentId || 
                studentIdOrOptions.estudiante?.id || 
                studentIdOrOptions.estudiante_id || 
                studentIdOrOptions.id;
    context = { ...studentIdOrOptions, ...maybeContext };
  }

  const {
    asistencias = [],
    clases = [],
    inasistenciasDocente = [],
    evaluaciones = [],
    notas = [],
    criterios = {},
    academicLevel = 'TERCIARIO',
    modalidad = 'ANUAL',
    asistenciaPct: forcedAsistPct
  } = context;

  const tieneCertTrabajo = Boolean(
    context?.tiene_certificado_trabajo ||
    context?.estudiante?.tiene_certificado_trabajo ||
    criterios?.tiene_certificado_trabajo
  );
  const minPromoAsist = Number(criterios?.min_asist_promo ?? 80);
  const minRegAsist = tieneCertTrabajo
    ? Number(criterios?.min_asist_trabajo ?? 60)
    : Number(criterios?.min_asist_reg ?? 70);
  const notaMinPromo = Number(criterios?.nota_min_promo ?? 7);
  const notaMinReg = Number(criterios?.nota_min_reg ?? 4);

  // 1. Filtrar clases efectivas (excluyendo licencias del docente)
  const safeInasistenciasDocente = Array.isArray(inasistenciasDocente) ? inasistenciasDocente : [];
  const safeClases = Array.isArray(clases) ? clases : [];
  const fechasLicencia = new Set(safeInasistenciasDocente.map(i => i.fecha));
  const clasesEfectivasOrdenadas = [...safeClases]
    .filter(c => !fechasLicencia.has(c.fecha) && c.estado !== 'DOCENTE_AUSENTE')
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const totalClasesEfectivas = clasesEfectivasOrdenadas.length;
  const licenciasEfectivas = Math.max(0, safeClases.length - totalClasesEfectivas);

  // Mapa de asistencias del estudiante
  const safeAsistencias = Array.isArray(asistencias) ? asistencias : [];
  const studentAsistencias = studentId 
    ? safeAsistencias.filter(a => !a?.estudiante_id || a.estudiante_id === studentId) 
    : [];
  const asistMap = new Map();
  studentAsistencias.forEach(a => {
    if (a?.clase_id) asistMap.set(a.clase_id, String(a.estado || '').toUpperCase());
  });

  // Conteo de presentes (incluyendo justificados) y porcentaje actual
  const presentesCount = studentAsistencias.reduce((acc, a) => {
    const est = String(a?.estado || '').toUpperCase();
    if (est === 'PRESENTE' || est === 'P' || est === 'JUSTIFICADO' || est === 'JUSTIFICADA' || est === 'J') return acc + 1;
    if (est === 'TARDE' || est === 'T') return acc + 0.5;
    return acc;
  }, 0);
  const asistPct = typeof forcedAsistPct === 'number'
    ? forcedAsistPct
    : calcularPorcentajeAsistencia(studentAsistencias, safeClases.length, licenciasEfectivas);

  // 2. Cálculo de inasistencias consecutivas
  // Revisamos en orden cronológico reciente hacia atrás
  let consecutiveAbsences = 0;
  for (let i = clasesEfectivasOrdenadas.length - 1; i >= 0; i--) {
    const c = clasesEfectivasOrdenadas[i];
    const estado = asistMap.get(c.id);
    if (estado === 'AUSENTE' || estado === 'A') {
      consecutiveAbsences++;
    } else if (estado === 'PRESENTE' || estado === 'P' || estado === 'JUSTIFICADO' || estado === 'JUSTIFICADA' || estado === 'J' || estado === 'TARDE' || estado === 'T') {
      break; // Se interrumpe la racha de ausencias
    }
  }

  // 3. Análisis de evaluaciones y notas
  const safeEvaluaciones = Array.isArray(evaluaciones) ? evaluaciones : [];
  const notasMap = new Map();

  if (Array.isArray(notas)) {
    const studentNotas = studentId
      ? notas.filter(n => !n?.estudiante_id || n.estudiante_id === studentId)
      : notas;
    studentNotas.forEach(n => {
      const rawVal = n?.valor !== undefined && n?.valor !== null ? n.valor : n?.nota;
      if (rawVal !== null && rawVal !== undefined && rawVal !== '' && n?.evaluacion_id) {
        const val = Number(rawVal);
        if (!isNaN(val)) {
          notasMap.set(n.evaluacion_id, val);
        }
      }
    });
  } else if (notas && typeof notas === 'object') {
    Object.entries(notas).forEach(([evalId, val]) => {
      if (val !== null && val !== undefined && val !== '') {
        const numVal = Number(val);
        if (!isNaN(numVal)) {
          notasMap.set(evalId, numVal);
        }
      }
    });
  }

  const parciales = evaluaciones.filter(e => {
    const t = String(e.tipo || '').toUpperCase();
    return t === 'PARCIAL' || t === 'PRUEBA' || (t.includes('PARCIAL') && !t.includes('RECUP'));
  });
  const recuperatorios = evaluaciones.filter(e => {
    const t = String(e.tipo || '').toUpperCase();
    return t === 'RECUPERATORIO' || t.includes('RECUP');
  });

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
