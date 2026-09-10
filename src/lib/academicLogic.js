/**
 * LÓGICA DE NEGOCIO ACADÉMICA (DocentePro)
 * Manejo de cálculo de asistencia, recuperatorios y condición final (Promocional/Regular/Libre/Aprobado).
 */

/**
 * Calcula el porcentaje de asistencia de un alumno.
 * @param {Array} asistencias - Lista de asistencias del alumno
 * @param {number} totalClases - Cantidad total de clases dictadas
 * @returns {number} Porcentaje de 0 a 100
 */
export function calcularPorcentajeAsistencia(asistencias = [], totalClases = 0) {
  if (!totalClases || totalClases === 0) return 100;
  const presentes = asistencias.filter(a => a.estado === 'PRESENTE').length;
  return Number(((presentes / totalClases) * 100).toFixed(1));
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
  arg6
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
    // Argumentos posicionales: (academicLevel, modalidad, asistPct, evaluaciones, studentNotas, criterios)
    if (arg1) nivel = arg1;
    if (arg2) modalidad = arg2;
    if (arg3 !== undefined) asistenciaPct = arg3;
    if (arg4) evaluaciones = arg4;
    if (arg5) studentNotas = arg5;
    if (arg6) criterios = { ...criterios, ...arg6 };
  }

  const minPromoAsist = Number(criterios.min_asist_promo ?? 80);
  const minRegAsist = Number(criterios.min_asist_reg ?? 70);
  const notaMinPromo = Number(criterios.nota_min_promo ?? 7);
  const notaMinReg = Number(criterios.nota_min_reg ?? 4);
  const notaMinSec = Number(criterios.nota_min_sec ?? 6);

  // Mapeo rápido de notas por ID de evaluación
  const notasMap = new Map();
  studentNotas.forEach(n => {
    const evalId = n.evaluacion_id || n.id;
    const val = n.valor !== undefined ? Number(n.valor) : (n.nota !== undefined ? Number(n.nota) : null);
    if (val !== null && !isNaN(val)) {
      notasMap.set(evalId, val);
    }
  });

  // =========================================================================
  // NIVEL SECUNDARIO: Aprobado con nota >= 6
  // =========================================================================
  if (nivel === 'SECUNDARIO') {
    const valores = Array.from(notasMap.values());
    if (valores.length === 0) {
      return {
        condicion: 'SIN CALIFICAR',
        color: 'text-text-muted',
        badgeVariant: 'default',
        motivo: 'Sin calificaciones registradas'
      };
    }

    const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
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
  const parciales = evaluaciones.filter(e => e.tipo === 'PARCIAL');
  const tps = evaluaciones.filter(e => e.tipo === 'TP');
  const recuperatorios = evaluaciones.filter(e => e.tipo === 'RECUPERATORIO');

  // Verificar TPs (deben estar todos aprobados con >= notaMinReg)
  let todosTpsAprobados = true;
  if (tps.length > 0) {
    for (const tp of tps) {
      const v = notasMap.get(tp.id);
      if (v === undefined || v < notaMinReg) {
        todosTpsAprobados = false;
        break;
      }
    }
  }

  // Parciales y recuperatorios
  let recupsUsados = 0;
  let todosParcialesReg = true;
  let todosParcialesPromo = true;

  for (const p of parciales) {
    const notaOrig = notasMap.get(p.id);
    const recupLinked = recuperatorios.find(r => r.evaluacion_origen_id === p.id);
    const notaRecup = recupLinked ? notasMap.get(recupLinked.id) : undefined;

    if (notaRecup !== undefined) {
      recupsUsados++;
    }

    // La nota efectiva para regularidad o promoción toma el recuperatorio si existe y es mayor
    const notaEfectiva = notaRecup !== undefined ? Math.max(notaOrig ?? 0, notaRecup) : (notaOrig ?? null);

    if (notaEfectiva === null || notaEfectiva < notaMinReg) {
      todosParcialesReg = false;
    }
    if (notaEfectiva === null || notaEfectiva < notaMinPromo) {
      todosParcialesPromo = false;
    }
  }

  const maxRecupPermitidoReg = modalidad === 'ANUAL' ? 2 : 1;

  // 1. PROMOCIONAL
  const cumplePromo =
    asistenciaPct >= minPromoAsist &&
    todosTpsAprobados &&
    parciales.length > 0 &&
    todosParcialesPromo &&
    recupsUsados <= 1;

  if (cumplePromo) {
    return {
      condicion: 'PROMOCIONAL',
      color: 'text-emerald-700',
      badgeVariant: 'promo',
      motivo: `Asistencia: ${asistenciaPct}% | Parciales >= ${notaMinPromo} | Recup: ${recupsUsados}/1`
    };
  }

  // 2. REGULAR
  const cumpleReg =
    asistenciaPct >= minRegAsist &&
    todosTpsAprobados &&
    parciales.length > 0 &&
    todosParcialesReg &&
    recupsUsados <= maxRecupPermitidoReg;

  if (cumpleReg) {
    return {
      condicion: 'REGULAR',
      color: 'text-amber-700',
      badgeVariant: 'regular',
      motivo: `Asistencia: ${asistenciaPct}% | Parciales >= ${notaMinReg} | Recup: ${recupsUsados}/${maxRecupPermitidoReg}`
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
