import { isDatePast } from './dateUtils';

/**
 * Calcula el porcentaje de asistencia de un alumno.
 * No penaliza al estudiante si el docente estuvo ausente / con licencia.
 * @param {Array|Object} arg1 - Lista de asistencias del alumno o config object
 * @param {number} [arg2] - Cantidad total de clases dictadas
 * @param {number} [arg3] - Cantidad de clases con inasistencia docente (a descontar del total)
 * @returns {number} Porcentaje de 0 a 100
 */
export function calcularPorcentajeAsistencia(arg1 = [], arg2 = 0, arg3 = 0) {
  let asistencias = [];
  let totalClases = 0;
  let clasesConLicencia = 0;

  if (typeof arg1 === 'object' && arg1 !== null && !Array.isArray(arg1)) {
    asistencias = arg1.asistencias || [];
    totalClases = Number(arg1.totalClases ?? 0);
    clasesConLicencia = Number(arg1.clasesConLicencia ?? 0);
  } else {
    asistencias = Array.isArray(arg1) ? arg1 : [];
    totalClases = Number(arg2 ?? 0);
    clasesConLicencia = Number(arg3 ?? 0);
  }

  const clasesEfectivas = Math.max(0, totalClases - clasesConLicencia);
  if (clasesEfectivas === 0) return 100;

  // Sumar presentes, justificados (1) y llegadas tarde (0.5), excluyendo clases con licencia docente
  const presentes = asistencias.reduce((acc, a) => {
    if (!a || a.docenteAusente || a.inasistenciaDocente) return acc;
    const est = String(a.estado || '').trim().toUpperCase();
    if (est === 'PRESENTE' || est === 'P' || est === 'JUSTIFICADO' || est === 'JUSTIFICADA' || est === 'J') {
      return acc + 1;
    }
    if (est === 'TARDE' || est === 'T') {
      return acc + 0.5;
    }
    return acc;
  }, 0);

  return Math.min(100, Number(((presentes / clasesEfectivas) * 100).toFixed(1)));
}

/**
 * Determina la condición académica automática de un estudiante.
 * Compatible con llamada posicional o por objeto de opciones.
 */
export function calcularCondicionFinal(
  arg1,
  arg2,
  arg3,
  arg4,
  arg5,
  arg6,
  arg7
) {
  let nivel = 'TERCIARIO';
  let modalidad = 'CUATRIMESTRAL';
  let asistenciaPct = 100;
  let evaluaciones = [];
  let studentNotas = [];
  let criterios = {
    min_asist_promo: 80,
    min_asist_reg: 70,
    nota_min_promo: 7,
    nota_min_reg: 4,
    nota_min_sec: 6
  };

  if (typeof arg1 === 'object' && arg1 !== null && !Array.isArray(arg1)) {
    // Objeto único
    nivel = arg1.nivel || nivel;
    modalidad = arg1.modalidad || modalidad;
    asistenciaPct = arg1.asistenciaPct !== undefined ? arg1.asistenciaPct : asistenciaPct;
    evaluaciones = arg1.evaluaciones || arg1.parciales || [];
    studentNotas = arg1.studentNotas || arg1.notas || [];
    criterios = { ...criterios, ...(arg1.criterios || {}) };
  } else {
    // Argumentos posicionales: (academicLevel, modalidad, asistPct, evaluaciones, studentNotas, criterios, arg7)
    if (arg1) nivel = arg1;
    if (arg2) modalidad = arg2;
    if (arg3 !== undefined) asistenciaPct = arg3;
    if (arg4) evaluaciones = arg4;
    if (arg5) studentNotas = arg5;
    if (arg6) criterios = { ...criterios, ...arg6 };
  }

  // 1. Verificación directa de Acreditación por Equivalencia
  if (
    arg1?.es_equivalencia || 
    arg1?.inscripcion?.es_equivalencia || 
    arg1?.estudiante?.es_equivalencia ||
    criterios?.es_equivalencia ||
    arg7?.es_equivalencia ||
    arg7?.inscripcion?.es_equivalencia
  ) {
    return {
      condicion: 'ACREDITADA_EQUIVALENCIA',
      color: 'text-emerald-700',
      badgeVariant: 'promo',
      motivo: 'Materia acreditada por equivalencia reglamentaria.'
    };
  }

  const tieneCertificadoTrabajo = Boolean(
    arg1?.tiene_certificado_trabajo ||
    arg1?.inscripcion?.tiene_certificado_trabajo ||
    arg1?.estudiante?.tiene_certificado_trabajo ||
    criterios?.tiene_certificado_trabajo ||
    arg7?.tiene_certificado_trabajo ||
    arg7?.inscripcion?.tiene_certificado_trabajo
  );

  const minRegAsistBase = Number(criterios.min_asist_reg ?? criterios.ram_asistencia_regular ?? 70);
  const minTrabajoAsist = Number(criterios.min_asist_trabajo ?? criterios.ram_asistencia_trabajo ?? criterios.asistenciaTrabajo ?? 60);
  const minRegAsist = tieneCertificadoTrabajo ? minTrabajoAsist : minRegAsistBase;
  const minPromoAsist = Number(criterios.min_asist_promo ?? criterios.ram_asistencia_promocion ?? criterios.asistenciaPromocion ?? 80);
  const notaMinPromo = Number(criterios.nota_min_promo ?? 7);
  const notaMinReg = Number(criterios.nota_min_reg ?? 4);
  const notaMinSec = Number(criterios.nota_min_sec ?? 6);

  // Mapeo rápido de notas y estados por ID de evaluación
  const notasMap = new Map();
  const estadosMap = new Map();
  studentNotas.forEach(n => {
    const evalId = n.evaluacion_id || n.id;
    const rawVal = n.valor !== undefined && n.valor !== null ? n.valor : (n.nota !== undefined && n.nota !== null ? n.nota : null);
    
    if (rawVal !== null && rawVal !== '') {
      const parsedNum = Number(rawVal);
      if (!isNaN(parsedNum)) {
        notasMap.set(evalId, parsedNum);
      } else {
        const valStr = String(rawVal).trim().toUpperCase();
        if (valStr === 'N/E' || valStr === 'NO ENTREGO' || valStr === 'NO_ENTREGA' || valStr === 'NO_ENTREGO') {
          estadosMap.set(evalId, 'NO_ENTREGO');
        } else if (valStr === 'AUS.' || valStr === 'AUS' || valStr === 'AUSENTE') {
          estadosMap.set(evalId, 'AUSENTE');
        }
      }
    }

    if (n.estado) {
      const rawEst = String(n.estado).trim().toUpperCase();
      let normalizedEst = rawEst;
      if (rawEst === 'N/E' || rawEst === 'NO ENTREGO' || rawEst === 'NO_ENTREGA' || rawEst === 'NO_ENTREGO') {
        normalizedEst = 'NO_ENTREGO';
      } else if (rawEst === 'AUS.' || rawEst === 'AUS' || rawEst === 'AUSENTE') {
        normalizedEst = 'AUSENTE';
      }
      estadosMap.set(evalId, normalizedEst);
    }
  });

  // =========================================================================
  // NIVEL SECUNDARIO: Aprobado con nota >= 6
  // =========================================================================
  if (nivel === 'SECUNDARIO') {
    const valores = [];
    if (evaluaciones && evaluaciones.length > 0) {
      evaluaciones.forEach(ev => {
        if (notasMap.has(ev.id)) {
          valores.push(notasMap.get(ev.id));
        } else if (estadosMap.get(ev.id) === 'NO_ENTREGO' || estadosMap.get(ev.id) === 'AUSENTE') {
          valores.push(1); // Aplazo reglamentario por inasistencia o no entrega
        }
      });
    }

    // Fallback si no había lista de evaluaciones o studentNotas venía directo
    if (valores.length === 0 && (notasMap.size > 0 || estadosMap.size > 0)) {
      notasMap.forEach(v => valores.push(v));
      estadosMap.forEach(est => {
        if (est === 'NO_ENTREGO' || est === 'AUSENTE') valores.push(1);
      });
    }

    if (valores.length === 0) {
      return {
        condicion: 'SIN CALIFICAR',
        color: 'text-text-muted',
        badgeVariant: 'default',
        motivo: 'Sin calificaciones registradas'
      };
    }

    const divisor = Math.max(1, valores.length);
    const suma = valores.reduce((a, b) => a + (isNaN(b) ? 0 : Number(b)), 0);
    const promedio = Number((suma / divisor).toFixed(2));
    const aprobado = promedio >= notaMinSec && asistenciaPct >= minRegAsist;

    if (aprobado) {
      return {
        condicion: 'APROBADO',
        color: 'text-emerald-700',
        badgeVariant: 'approved',
        motivo: `Promedio: ${promedio.toFixed(1)} (Mín. ${notaMinSec}) | Asist: ${asistenciaPct}%`
      };
    } else {
      return {
        condicion: 'DESAPROBADO',
        color: 'text-rose-700',
        badgeVariant: 'libre',
        motivo: `Promedio: ${promedio.toFixed(1)} | Asist: ${asistenciaPct}%`
      };
    }
  }

  // =========================================================================
  // NIVEL TERCIARIO: Promocional, Regular, Libre
  // =========================================================================
  if (notasMap.size === 0 && estadosMap.size === 0) {
    return {
      condicion: 'EN CURSO',
      color: 'text-text-muted',
      badgeVariant: 'default',
      motivo: evaluaciones.length > 0
        ? `${evaluaciones.length} evaluación(es) en curso / pendientes de entrega`
        : 'Sin evaluaciones calificadas aún'
    };
  }

  const parciales = evaluaciones.filter(e => {
    const t = String(e.tipo || '').toUpperCase();
    return t === 'PARCIAL' || t === 'PRUEBA' || t === 'COLOQUIO' || (t.includes('PARCIAL') && !t.includes('RECUP'));
  });
  const tps = evaluaciones.filter(e => {
    const t = String(e.tipo || '').toUpperCase();
    return t === 'TP' || t.includes('TRABAJO') || t.includes('PRÁCTICO') || t.includes('PRACTICO');
  });
  const recuperatorios = evaluaciones.filter(e => {
    const t = String(e.tipo || '').toUpperCase();
    return t === 'RECUPERATORIO' || t.includes('RECUP');
  });

  // Verificar TPs (se exige aprobación con >= notaMinReg para los TPs ya calificados o vencidos)
  let todosTpsAprobados = true;
  let todosTpsPromo = true;
  const tpsExigibles = tps.filter(tp => {
    if (tp.fecha_entrega && !isDatePast(tp.fecha_entrega) && !notasMap.has(tp.id) && !estadosMap.has(tp.id)) {
      return false;
    }
    return true;
  });

  if (tpsExigibles.length > 0) {
    for (const tp of tpsExigibles) {
      const v = notasMap.get(tp.id);
      const est = estadosMap.get(tp.id);
      if (est === 'NO_ENTREGO' || est === 'AUSENTE' || v === undefined || v < notaMinReg) {
        todosTpsAprobados = false;
        todosTpsPromo = false;
        break;
      }
      if (v < notaMinPromo) {
        todosTpsPromo = false;
      }
    }
  }

  // Parciales y recuperatorios exigibles (excluyendo parciales con fecha futura sin calificar ni estado)
  let recupsUsados = 0;
  let todosParcialesReg = true;
  let todosParcialesPromo = true;

  const parcialesExigibles = parciales.filter(p => {
    if (p.fecha_entrega && !isDatePast(p.fecha_entrega) && !notasMap.has(p.id) && !estadosMap.has(p.id)) {
      return false;
    }
    return true;
  });

  for (const p of parcialesExigibles) {
    const notaOrig = notasMap.get(p.id);
    const estadoOrig = estadosMap.get(p.id);
    const recupLinked = recuperatorios.find(r => r.evaluacion_origen_id === p.id);
    const notaRecup = recupLinked ? notasMap.get(recupLinked.id) : undefined;
    const estadoRecup = recupLinked ? estadosMap.get(recupLinked.id) : undefined;

    const necesitoRecup = notaOrig === undefined || notaOrig < notaMinPromo;
    if (necesitoRecup && (notaRecup !== undefined || estadoRecup === 'AUSENTE' || estadoRecup === 'NO_ENTREGO')) {
      recupsUsados++;
    }

    // La nota efectiva protege la nota original si el alumno ya había aprobado y sacó menos o faltó al recuperatorio
    let notaEfectiva = null;
    if (notaOrig !== undefined && notaRecup !== undefined) {
      notaEfectiva = Math.max(notaOrig, notaRecup);
    } else if (notaRecup !== undefined) {
      notaEfectiva = notaRecup;
    } else if (notaOrig !== undefined) {
      notaEfectiva = notaOrig;
    } else if (estadoRecup === 'AUSENTE' || estadoRecup === 'NO_ENTREGO' || estadoOrig === 'AUSENTE' || estadoOrig === 'NO_ENTREGO') {
      notaEfectiva = null;
    }

    if (notaEfectiva === null || notaEfectiva < notaMinReg) {
      todosParcialesReg = false;
    }
    if (notaEfectiva === null || notaEfectiva < notaMinPromo) {
      todosParcialesPromo = false;
    }
  }

  const maxRecupPermitidoReg = String(modalidad).toUpperCase().includes('ANUAL') ? 2 : 1;

  // Caso especial: hay parciales futuros aún sin rendir pero ya se calificaron TPs
  if (parciales.length > 0 && parcialesExigibles.length === 0) {
    if (asistenciaPct >= minRegAsist && todosTpsAprobados) {
      return {
        condicion: 'REGULAR',
        color: 'text-amber-700',
        badgeVariant: 'regular',
        motivo: `En curso con TPs aprobados (parciales pendientes) | Asist: ${asistenciaPct}%`
      };
    }
    return {
      condicion: 'LIBRE',
      color: 'text-rose-700',
      badgeVariant: 'libre',
      motivo: `No alcanza regularidad en TPs o asistencia (${asistenciaPct}%)`
    };
  }

  // Caso especial: Cátedra tipo Taller / Seminario evaluada únicamente con TPs (sin parciales)
  const soloTps = parciales.length === 0 && tpsExigibles.length > 0;

  // 1. PROMOCIONAL
  const cumplePromo =
    asistenciaPct >= minPromoAsist &&
    todosTpsAprobados &&
    (soloTps ? todosTpsPromo : (parcialesExigibles.length > 0 && todosParcialesPromo && recupsUsados <= 1));

  if (cumplePromo) {
    return {
      condicion: 'PROMOCIONAL',
      color: 'text-emerald-700',
      badgeVariant: 'promo',
      motivo: soloTps
        ? `Asistencia: ${asistenciaPct}% | TPs >= ${notaMinPromo}`
        : `Asistencia: ${asistenciaPct}% | Parciales >= ${notaMinPromo} | Recup: ${recupsUsados}/1`
    };
  }

  // 2. REGULAR
  const cumpleReg =
    asistenciaPct >= minRegAsist &&
    todosTpsAprobados &&
    (soloTps ? true : (parcialesExigibles.length > 0 && todosParcialesReg && recupsUsados <= maxRecupPermitidoReg));

  if (cumpleReg) {
    return {
      condicion: 'REGULAR',
      color: 'text-amber-700',
      badgeVariant: 'regular',
      motivo: soloTps
        ? `Asistencia: ${asistenciaPct}% | TPs aprobados >= ${notaMinReg}`
        : `Asistencia: ${asistenciaPct}% | Parciales >= ${notaMinReg} | Recup: ${recupsUsados}/${maxRecupPermitidoReg}`
    };
  }

  // 3. LIBRE
  return {
    condicion: 'LIBRE',
    color: 'text-rose-700',
    badgeVariant: 'libre',
    motivo: `No alcanza regularidad (Asist: ${asistenciaPct}%, Recup: ${recupsUsados})`
  };
}
