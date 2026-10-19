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
  // NIVEL TERCIARIO: Promocional (Directa/Indirecta), Regular, Libre
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

  // Determinar régimen de la cátedra: Anual (máx. 2 parciales a recuperar) vs Cuatrimestral (máx. 1)
  const regimenStr = String(arg1?.regimen || arg1?.modalidad || modalidad || 'CUATRIMESTRAL').toUpperCase();
  const esAnual = regimenStr.includes('ANUAL');
  const maxRecupPermitidoReg = esAnual ? 2 : 1;

  // Mapa de detalles de recuperatorio configurados para el alumno (Opción B)
  const recuperatoriosMap = new Map(); // parcial_id -> { evaluacion_id, titulo, nota_recuperatorio, estado, aprobado }
  studentNotas.forEach(n => {
    let detalle = n.detalle_recuperatorio;
    if (!detalle && n.observaciones && typeof n.observaciones === 'string' && n.observaciones.trim().startsWith('[')) {
      try {
        detalle = JSON.parse(n.observaciones);
      } catch (_) {}
    }
    if (Array.isArray(detalle)) {
      detalle.forEach(item => {
        if (item && item.evaluacion_id) {
          recuperatoriosMap.set(String(item.evaluacion_id), item);
        }
      });
    }
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

  // Parciales exigibles (excluyendo parciales con fecha futura sin calificar ni estado)
  const parcialesExigibles = parciales.filter(p => {
    if (p.fecha_entrega && !isDatePast(p.fecha_entrega) && !notasMap.has(p.id) && !estadosMap.has(p.id)) {
      return false;
    }
    return true;
  });

  // 1. Contabilizar parciales desaprobados en primera instancia
  let desaprobadosPrimeraInstancia = 0;
  parcialesExigibles.forEach(p => {
    const notaOrig = notasMap.get(p.id);
    const estadoOrig = estadosMap.get(p.id);
    const esDesaprobado = estadoOrig === 'NO_ENTREGO' || estadoOrig === 'AUSENTE' || (notaOrig !== undefined && notaOrig < notaMinReg);
    if (esDesaprobado) {
      desaprobadosPrimeraInstancia++;
    }
  });

  // REGLA DE EXCLUSIÓN AUTOMÁTICA A LIBRE:
  // Si desaprueba más parciales que el tope del régimen (>1 en cuatrimestral o >2 en anual), queda automáticamente LIBRE
  if (desaprobadosPrimeraInstancia > maxRecupPermitidoReg) {
    const limiteTexto = esAnual ? 'máx. 2 en régimen anual' : 'máx. 1 en régimen cuatrimestral';
    return {
      condicion: 'LIBRE',
      color: 'text-rose-700',
      badgeVariant: 'libre',
      motivo: `Libre por exceder límite de parciales desaprobados (${desaprobadosPrimeraInstancia} desaprobados, ${limiteTexto})`
    };
  }

  // 2. Evaluar cada parcial y su correspondiente nota de recuperatorio
  let recupsRendidos = 0;
  let algunRecupDesaprobado = false;
  let desaprobadoRecupDetalle = '';
  let todosParcialesReg = true;
  let todosParcialesPromo = true;

  for (const p of parcialesExigibles) {
    const notaOrig = notasMap.get(p.id);
    const estadoOrig = estadosMap.get(p.id);

    let notaRecup = undefined;
    let estadoRecup = undefined;

    // A. Opción B: Recuperatorio configurado en detalle_recuperatorio
    if (recuperatoriosMap.has(String(p.id))) {
      const item = recuperatoriosMap.get(String(p.id));
      const valRec = item.nota_recuperatorio ?? item.valor ?? item.nota;
      if (valRec !== null && valRec !== undefined && valRec !== '') {
        const num = Number(valRec);
        if (!isNaN(num)) {
          notaRecup = num;
        } else {
          estadoRecup = String(valRec).toUpperCase();
        }
      }
      if (item.estado) estadoRecup = String(item.estado).toUpperCase();
    } else {
      // B. Recuperatorio vinculado por evaluacion_origen_id (legacy)
      const recupLinked = recuperatorios.find(r => r.evaluacion_origen_id === p.id);
      if (recupLinked) {
        notaRecup = notasMap.get(recupLinked.id);
        estadoRecup = estadosMap.get(recupLinked.id);
      }
    }

    const rindioRecup = notaRecup !== undefined || estadoRecup === 'AUSENTE' || estadoRecup === 'NO_ENTREGO';
    if (rindioRecup) {
      recupsRendidos++;
      if (estadoRecup === 'AUSENTE' || estadoRecup === 'NO_ENTREGO' || (notaRecup !== undefined && notaRecup < notaMinReg)) {
        algunRecupDesaprobado = true;
        desaprobadoRecupDetalle = `${p.titulo || 'Parcial'}: ${notaRecup !== undefined ? notaRecup : (estadoRecup || 'Desaprobado')}`;
      }
    }

    // Regla de Reemplazo Efectivo:
    // Si la nota_recuperada es aprobada (>= notaMinReg), esa nota REEMPLAZA a la nota del parcial original
    let notaEfectiva = null;
    if (notaRecup !== undefined && notaRecup >= notaMinReg) {
      notaEfectiva = notaRecup;
    } else if (notaRecup !== undefined && notaRecup < notaMinReg) {
      notaEfectiva = notaRecup; // Desaprobado en recuperatorio
    } else if (estadoRecup === 'AUSENTE' || estadoRecup === 'NO_ENTREGO') {
      notaEfectiva = null;
    } else if (notaOrig !== undefined) {
      notaEfectiva = notaOrig;
    } else if (estadoOrig === 'AUSENTE' || estadoOrig === 'NO_ENTREGO') {
      notaEfectiva = null;
    }

    if (notaEfectiva === null || notaEfectiva < notaMinReg) {
      todosParcialesReg = false;
    }
    if (notaEfectiva === null || notaEfectiva < notaMinPromo) {
      todosParcialesPromo = false;
    }
  }

  // REGLA: Si rindió recuperatorio y desaprobó alguno de los parciales a recuperar, queda automáticamente LIBRE
  if (algunRecupDesaprobado) {
    return {
      condicion: 'LIBRE',
      color: 'text-rose-700',
      badgeVariant: 'libre',
      motivo: `Libre por desaprobar recuperatorio (${desaprobadoRecupDetalle})`
    };
  }

  // REGLA: Si la asistencia no alcanza el piso reglamentario, queda LIBRE
  if (asistenciaPct < minRegAsist) {
    return {
      condicion: 'LIBRE',
      color: 'text-rose-700',
      badgeVariant: 'libre',
      motivo: `Libre por inasistencias (${asistenciaPct}% sobre mín. ${minRegAsist}%)`
    };
  }

  // Caso especial: Taller / Seminario evaluado solo por TPs
  const soloTps = parciales.length === 0 && tpsExigibles.length > 0;

  // REGLA: Si no tiene todos los parciales regulares o TPs aprobados
  if (!todosParcialesReg || !todosTpsAprobados) {
    // Si desaprobó parciales en primera instancia dentro del cupo y aún no cargó recuperatorio
    if (desaprobadosPrimeraInstancia > 0 && recupsRendidos === 0) {
      return {
        condicion: 'RECUPERATORIO',
        color: 'text-amber-700',
        badgeVariant: 'warning',
        motivo: `Debe recuperar ${desaprobadosPrimeraInstancia} parcial(es) desaprobado(s)`
      };
    }
    return {
      condicion: 'LIBRE',
      color: 'text-rose-700',
      badgeVariant: 'libre',
      motivo: `No alcanza regularidad en evaluaciones`
    };
  }

  // 1. PROMOCIÓN DIRECTA: 0 parciales recuperados, notas >= notaMinPromo, Asistencia >= minPromoAsist
  if (
    asistenciaPct >= minPromoAsist &&
    todosTpsAprobados &&
    (soloTps ? todosTpsPromo : (parcialesExigibles.length > 0 && todosParcialesPromo && recupsRendidos === 0))
  ) {
    return {
      condicion: 'PROMOCIONAL',
      subcondicion: 'DIRECTA',
      color: 'text-emerald-700',
      badgeVariant: 'promo',
      motivo: soloTps
        ? `Asistencia: ${asistenciaPct}% | TPs >= ${notaMinPromo}`
        : `Promoción Directa alcanzada (0 parciales recuperados) | Asist: ${asistenciaPct}%`
    };
  }

  // 2. PROMOCIÓN INDIRECTA: exactamente 1 parcial recuperado, notas finales >= notaMinPromo, Asistencia >= minPromoAsist
  if (
    asistenciaPct >= minPromoAsist &&
    todosTpsAprobados &&
    parcialesExigibles.length > 0 &&
    todosParcialesPromo &&
    recupsRendidos === 1
  ) {
    return {
      condicion: 'PROMOCION_INDIRECTA',
      subcondicion: 'INDIRECTA',
      color: 'text-teal-700',
      badgeVariant: 'promo',
      motivo: `Promoción Indirecta alcanzada (1 parcial recuperado) | Asist: ${asistenciaPct}%`
    };
  }

  // 3. REGULAR: Parciales aprobados >= notaMinReg (incluyendo hasta 2 recuperados en Anual)
  return {
    condicion: 'REGULAR',
    color: 'text-amber-700',
    badgeVariant: 'regular',
    motivo: recupsRendidos > 0
      ? `Regularidad alcanzada con ${recupsRendidos} parcial(es) recuperado(s) | Asist: ${asistenciaPct}%`
      : `Regularidad alcanzada (habilitado a examen final) | Asist: ${asistenciaPct}%`
  };
}

/**
 * Helper unificado para calcular notas efectivas, reemplazos de recuperatorios
 * y promedios trazables por estudiante.
 */
export function calcularNotasEfectivasEstudiante({
  evaluaciones = [],
  studentNotas = [],
  criterios = {}
}) {
  const notaMinReg = Number(criterios.nota_min_reg ?? 4);
  const notasMap = new Map();
  const estadosMap = new Map();
  const recuperatoriosMap = new Map();

  studentNotas.forEach(n => {
    const evalId = String(n.evaluacion_id || n.id);
    const rawVal = n.valor !== undefined && n.valor !== null ? n.valor : (n.nota !== undefined && n.nota !== null ? n.nota : null);
    if (rawVal !== null && rawVal !== '' && !isNaN(Number(rawVal))) {
      notasMap.set(evalId, Number(rawVal));
    }
    if (n.estado) {
      estadosMap.set(evalId, String(n.estado).toUpperCase());
    }

    let detalle = n.detalle_recuperatorio;
    if (!detalle && n.observaciones && typeof n.observaciones === 'string' && n.observaciones.trim().startsWith('[')) {
      try {
        detalle = JSON.parse(n.observaciones);
      } catch (_) {}
    }
    if (Array.isArray(detalle)) {
      detalle.forEach(item => {
        if (item && item.evaluacion_id) {
          recuperatoriosMap.set(String(item.evaluacion_id), item);
        }
      });
    }
  });

  const notasEfectivasMap = new Map();
  const valoresParaPromedio = [];
  let parcialesRecuperadosCount = 0;

  evaluaciones.forEach(ev => {
    const evId = String(ev.id);
    const isRecup = String(ev.tipo || '').toUpperCase().includes('RECUP');
    if (isRecup) return; // Se evalúa en base a los parciales

    const notaOrig = notasMap.get(evId);
    const estadoOrig = estadosMap.get(evId);

    let notaRecup = undefined;
    let estadoRecup = undefined;

    if (recuperatoriosMap.has(evId)) {
      const item = recuperatoriosMap.get(evId);
      const valRec = item.nota_recuperatorio ?? item.valor ?? item.nota;
      if (valRec !== null && valRec !== undefined && valRec !== '' && !isNaN(Number(valRec))) {
        notaRecup = Number(valRec);
      } else if (valRec) {
        estadoRecup = String(valRec).toUpperCase();
      }
      if (item.estado) estadoRecup = String(item.estado).toUpperCase();
    }

    const fueRecuperado = notaRecup !== undefined || estadoRecup !== undefined;
    if (fueRecuperado) {
      parcialesRecuperadosCount++;
    }

    let notaEfectiva = null;
    let estadoEfectivo = estadoOrig ?? null;

    if (notaRecup !== undefined) {
      notaEfectiva = notaRecup;
      estadoEfectivo = notaRecup >= notaMinReg ? 'CALIFICADO' : 'DESAPROBADO';
    } else if (estadoRecup === 'AUSENTE' || estadoRecup === 'NO_ENTREGO') {
      notaEfectiva = null;
      estadoEfectivo = estadoRecup;
    } else if (notaOrig !== undefined) {
      notaEfectiva = notaOrig;
    }

    if (notaEfectiva !== null) {
      valoresParaPromedio.push(notaEfectiva);
    }

    notasEfectivasMap.set(evId, {
      evaluacionId: evId,
      notaOriginal: notaOrig ?? null,
      estadoOriginal: estadoOrig ?? null,
      notaRecup: notaRecup ?? null,
      estadoRecup: estadoRecup ?? null,
      notaEfectiva,
      estadoEfectivo,
      fueRecuperado,
      reemplazada: fueRecuperado && notaRecup !== undefined && notaRecup >= notaMinReg
    });
  });

  const promedioEfectivo = valoresParaPromedio.length > 0
    ? Number((valoresParaPromedio.reduce((a, b) => a + b, 0) / valoresParaPromedio.length).toFixed(1))
    : null;

  return {
    notasEfectivasMap,
    parcialesRecuperadosCount,
    promedioEfectivo
  };
}
