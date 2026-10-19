/**
 * src/utils/licenciasHelper.js
 * Detector universal e infalible de licencias docentes por fecha o clase (Decreto Acuerdo 1092).
 * Cruza cualquier fecha ISO (YYYY-MM-DD) o registro de clase contra el listado de licencias_docentes,
 * respetando los días reales de cursada de cada cátedra y la prioridad absoluta de los feriados.
 */
import { obtenerFeriado, normalizarTexto } from './feriadosAcademicos';

const DIA_NOMBRE_A_NUMERO = {
  domingo: 0,
  dom: 0,
  lunes: 1,
  lun: 1,
  martes: 2,
  mar: 2,
  miercoles: 3,
  mie: 3,
  mier: 3,
  jueves: 4,
  jue: 4,
  viernes: 5,
  vie: 5,
  sabado: 6,
  sab: 6
};

/**
 * Catálogo oficial de Feriados Nacionales y Provinciales (Catamarca) 2026
 */
export const FERIADOS_OFICIALES_2026 = {
  '2026-01-01': 'Año Nuevo',
  '2026-02-16': 'Carnaval',
  '2026-02-17': 'Carnaval',
  '2026-03-23': 'Feriado con Fines Turísticos',
  '2026-03-24': 'Día Nacional de la Memoria por la Verdad y la Justicia',
  '2026-04-02': 'Día del Veterano y de los Caídos en la Guerra de Malvinas',
  '2026-04-03': 'Viernes Santo',
  '2026-05-01': 'Día del Trabajador',
  '2026-05-25': 'Día de la Revolución de Mayo',
  '2026-06-15': 'Paso a la Inmortalidad del Gral. Martín Miguel de Güemes',
  '2026-06-20': 'Paso a la Inmortalidad del Gral. Manuel Belgrano',
  '2026-07-09': 'Día de la Independencia',
  '2026-07-10': 'Feriado con Fines Turísticos',
  '2026-08-17': 'Paso a la Inmortalidad del Gral. José de San Martín',
  '2026-08-25': 'Autonomía de Catamarca (Feriado Provincial)',
  '2026-09-07': 'Día del Milagro (Feriado Provincial Catamarca)',
  '2026-09-11': 'Día del Maestro (Asueto Escolar)',
  '2026-09-21': 'Día del Estudiante (Asueto Académico)',
  '2026-10-12': 'Día del Respeto a la Diversidad Cultural',
  '2026-11-20': 'Día de la Soberanía Nacional',
  '2026-12-07': 'Feriado con Fines Turísticos',
  '2026-12-08': 'Día de la Inmaculada Concepción de María',
  '2026-12-25': 'Navidad'
};

/**
 * Determina si una fecha o registro de clase corresponde a un Feriado Nacional o Provincial.
 * @param {string} fechaStr - YYYY-MM-DD
 * @param {Object|null} [claseObj] - Objeto opcional de clase
 * @returns {{ esFeriado: boolean, nombre: string|null, tipo?: string, norma?: string }}
 */
export function obtenerFeriadoParaFecha(fechaStr, claseObj = null) {
  const rawDate = fechaStr || claseObj?.fecha || '';
  const cleanDate = String(rawDate).slice(0, 10);

  if (cleanDate && FERIADOS_OFICIALES_2026[cleanDate]) {
    const det = obtenerFeriado(cleanDate);
    return {
      esFeriado: true,
      nombre: FERIADOS_OFICIALES_2026[cleanDate],
      tipo: det?.tipo || 'NACIONAL',
      norma: det?.norma || 'Calendario Oficial'
    };
  }

  if (cleanDate) {
    const det = obtenerFeriado(cleanDate);
    if (det) {
      return {
        esFeriado: true,
        nombre: det.motivo || 'Feriado Nacional',
        tipo: det.tipo || 'NACIONAL',
        norma: det.norma || 'Calendario Oficial'
      };
    }
  }

  if (claseObj && typeof claseObj === 'object') {
    const temaLower = String(claseObj.tema || '').toLowerCase();
    const isExplicitFeriado =
      claseObj.es_feriado === true ||
      claseObj.estado === 'FERIADO' ||
      claseObj.caracter === 'FERIADO' ||
      claseObj.caracter_clase === 'FERIADO' ||
      Boolean(claseObj.feriadoInfo) ||
      temaLower.includes('feriado');

    if (isExplicitFeriado) {
      const cleanTema = String(claseObj.tema || '')
        .replace(/^sin actividad áulica\s*[—-]\s*/i, '')
        .trim();
      return {
        esFeriado: true,
        nombre:
          claseObj.feriadoInfo?.motivo ||
          (cleanTema && cleanTema.toLowerCase() !== 'feriado' ? cleanTema : 'Feriado Nacional'),
        tipo: claseObj.feriadoInfo?.tipo || 'NACIONAL',
        norma: claseObj.feriadoInfo?.norma || 'Calendario Oficial'
      };
    }
  }

  return { esFeriado: false, nombre: null };
}

function esTemaAutogeneradoOVacio(tema) {
  if (!tema) return true;
  const clean = String(tema).trim().toLowerCase();
  return (
    !clean ||
    clean === 'sin tema asignado' ||
    clean === 'clase regular' ||
    clean === 'clase dictada regular' ||
    clean.startsWith('clase en curso') ||
    clean.startsWith('clase del ') ||
    clean.startsWith('sin actividad áulica')
  );
}

/**
 * Obtiene el conjunto de días de la semana (0=Dom..6=Sáb) configurados en una cátedra.
 * Soporta horarios_semanales, horarios, dias_cursada y dias (array de objetos, array de strings o string separado por comas).
 * @param {Object|null} catedra
 * @returns {Set<number>}
 */
export function extraerDiasCursadaCatedra(catedra) {
  const diasSet = new Set();
  if (!catedra || typeof catedra !== 'object') return diasSet;

  const fuentes = [
    catedra.horarios_semanales,
    catedra.horarios,
    catedra.dias_cursada,
    catedra.dias_clase,
    catedra.dias
  ];

  const agregarDia = (val) => {
    if (val === null || val === undefined) return;
    if (typeof val === 'number' && val >= 0 && val <= 6) {
      diasSet.add(val);
      return;
    }
    if (typeof val === 'object') {
      const d = val.dia ?? val.dia_semana ?? val.day ?? val.nombre;
      if (d !== undefined) agregarDia(d);
      return;
    }
    if (typeof val === 'string') {
      const partes = val.split(/[,;/|]+/);
      partes.forEach(p => {
        const clean = normalizarTexto(p);
        if (clean in DIA_NOMBRE_A_NUMERO) {
          diasSet.add(DIA_NOMBRE_A_NUMERO[clean]);
        } else if (/^[0-6]$/.test(clean)) {
          diasSet.add(Number(clean));
        }
      });
    }
  };

  fuentes.forEach(fuente => {
    if (!fuente) return;
    if (Array.isArray(fuente)) {
      fuente.forEach(item => agregarDia(item));
    } else {
      agregarDia(fuente);
    }
  });

  return diasSet;
}

/**
 * Analiza estrictamente los días configurados en la cátedra (Lunes -> 1 ... Sábado -> 6).
 * Si el objeto catedra no tiene horarios cargados en memoria, infiere los días de cursada
 * únicamente a partir de las clases que ya tienen asistencia tomada o tema específico dictado.
 * NUNCA devuelve todos los días de la semana por defecto.
 * @param {Object|null} catedra
 * @param {Array} [clasesExistentes]
 * @param {Array} [asistenciasExistentes]
 * @returns {number[]} Array ordenado de números de día de la semana (0=Dom, 1=Lun, ..., 6=Sáb)
 */
export function obtenerDiasDeCursadaCatedra(catedra, clasesExistentes = [], asistenciasExistentes = []) {
  const explicitSet = extraerDiasCursadaCatedra(catedra);
  if (explicitSet.size > 0) {
    return Array.from(explicitSet).sort((a, b) => a - b);
  }

  const inferredSet = new Set();
  if (!Array.isArray(clasesExistentes) || clasesExistentes.length === 0) {
    return [];
  }

  // 1. Inferir prioritariamente a partir de clases con asistencia tomada
  const clasesConAsistenciaIds = new Set();
  const clasesConAsistenciaFechas = new Set();
  if (Array.isArray(asistenciasExistentes) && asistenciasExistentes.length > 0) {
    asistenciasExistentes.forEach(a => {
      if (a?.clase_id) clasesConAsistenciaIds.add(String(a.clase_id));
      if (a?.fecha) clasesConAsistenciaFechas.add(String(a.fecha).slice(0, 10));
    });
  }

  clasesExistentes.forEach(c => {
    if (!c?.fecha) return;
    const fStr = String(c.fecha).slice(0, 10);
    const hasAttendance =
      clasesConAsistenciaIds.has(String(c.id)) ||
      clasesConAsistenciaFechas.has(fStr) ||
      c.tiene_asistencia === true ||
      Number(c.presentes) > 0;

    if (hasAttendance) {
      const dt = new Date(fStr + 'T12:00:00');
      if (!isNaN(dt.getTime())) {
        inferredSet.add(dt.getDay());
      }
    }
  });

  if (inferredSet.size > 0) {
    return Array.from(inferredSet).sort((a, b) => a - b);
  }

  // 2. Si aún no hay asistencias pasadas como parámetro, inferir solo de clases con tema real cargado manualmente
  clasesExistentes.forEach(c => {
    if (!c?.fecha) return;
    if (c.autogenerada || String(c.id || '').startsWith('clase-auto-') || String(c.id || '').startsWith('clase-lic-')) {
      return;
    }
    if (c.estado === 'DOCENTE_AUSENTE' || c.estado === 'FERIADO') {
      return;
    }
    if (!esTemaAutogeneradoOVacio(c.tema)) {
      const fStr = String(c.fecha).slice(0, 10);
      const dt = new Date(fStr + 'T12:00:00');
      if (!isNaN(dt.getTime())) {
        inferredSet.add(dt.getDay());
      }
    }
  });

  return Array.from(inferredSet).sort((a, b) => a - b);
}

/**
 * Indica si el objeto cátedra posee configuración explícita de días/horarios de cursada.
 * @param {Object|null} catedra
 * @param {Array} [clasesExistentes]
 * @param {Array} [asistenciasExistentes]
 * @returns {boolean}
 */
export function tieneHorariosConfigurados(catedra, clasesExistentes = [], asistenciasExistentes = []) {
  return obtenerDiasDeCursadaCatedra(catedra, clasesExistentes, asistenciasExistentes).length > 0;
}

/**
 * Determina si una cátedra tiene clases programadas en una fecha específica (YYYY-MM-DD).
 * Convierte fechaStr en día de la semana (0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb)
 * y devuelve true SOLO si esa cátedra se dicta ese día de la semana.
 * @param {Object|null} catedra
 * @param {string} fechaStr - YYYY-MM-DD
 * @param {Array} [clasesExistentes]
 * @param {Array} [asistenciasExistentes]
 * @returns {boolean}
 */
export function catedraTieneClaseEnFecha(catedra, fechaStr, clasesExistentes = [], asistenciasExistentes = []) {
  if (!fechaStr) return false;
  const cleanDate = String(fechaStr).slice(0, 10);
  const dateObj = new Date(cleanDate + 'T12:00:00');
  if (isNaN(dateObj.getTime())) return false;

  const dayOfWeek = dateObj.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb
  const diasValidos = obtenerDiasDeCursadaCatedra(catedra, clasesExistentes, asistenciasExistentes);
  if (diasValidos.length === 0) return false;

  return diasValidos.includes(dayOfWeek);
}

/**
 * Genera el array de fechas YYYY-MM-DD inclusivas entre fechaInicio y fechaFin.
 * @param {string} fechaInicio
 * @param {string} fechaFin
 * @returns {string[]}
 */
export function generarFechasEnRango(fechaInicio, fechaFin) {
  const startStr = String(fechaInicio || '').slice(0, 10);
  const endStr = String(fechaFin || startStr).slice(0, 10);
  if (!startStr) return [];
  if (endStr <= startStr) return [startStr];

  const dates = [];
  const p1 = startStr.split('-').map(Number);
  const p2 = endStr.split('-').map(Number);
  if (p1.length !== 3 || p2.length !== 3) return [startStr];

  const cur = new Date(p1[0], p1[1] - 1, p1[2], 12, 0, 0);
  const end = new Date(p2[0], p2[1] - 1, p2[2], 12, 0, 0);

  let guard = 0;
  while (cur <= end && guard < 366) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
    guard++;
  }
  return dates;
}

/**
 * Verifica si fechaStr coincide con un feriado nacional/provincial del calendario oficial
 * o si en clasesDeCatedra esa fecha ya está marcada como FERIADO.
 * @param {string} fechaStr - YYYY-MM-DD
 * @param {Array} [clasesDeCatedra]
 * @returns {boolean}
 */
export function esFechaFeriado(fechaStr, clasesDeCatedra = []) {
  if (!fechaStr) return false;
  const cleanDate = String(fechaStr).slice(0, 10);
  if (obtenerFeriadoParaFecha(cleanDate).esFeriado) {
    return true;
  }
  if (Array.isArray(clasesDeCatedra) && clasesDeCatedra.length > 0) {
    return clasesDeCatedra.some(c => {
      if (!c) return false;
      const cFecha = String(c.fecha || '').slice(0, 10);
      if (cFecha !== cleanDate) return false;
      return obtenerFeriadoParaFecha(cleanDate, c).esFeriado;
    });
  }
  return false;
}

/**
 * Determina si una fecha o clase específica está alcanzada por una licencia docente.
 * @param {string} fechaStr - Fecha a consultar (YYYY-MM-DD)
 * @param {string|null} [catedraId] - ID de la cátedra activa
 * @param {Array} [licencias] - Listado de licencias del docente
 * @param {Object|null} [claseObj] - Registro opcional de clase
 * @returns {Object|null} Información de la licencia si aplica, o null si la jornada es regular o feriado
 */
export function obtenerLicenciaParaFecha(fechaStr, catedraId = null, licencias = [], claseObj = null) {
  const rawDate = fechaStr || claseObj?.fecha;
  if (!rawDate) return null;
  const targetDate = String(rawDate).slice(0, 10);

  // Prioridad de Feriado cuando la clase ya está marcada como FERIADO
  if (
    claseObj &&
    (claseObj.es_feriado === true ||
     claseObj.estado === 'FERIADO' ||
     claseObj.caracter === 'FERIADO' ||
     claseObj.caracter_clase === 'FERIADO' ||
     Boolean(claseObj.feriadoInfo))
  ) {
    return null;
  }

  // 1. Si la propia fila de clase ya está marcada como DOCENTE_AUSENTE o tiene articulo_licencia
  if (
    claseObj && 
    (claseObj.estado === 'DOCENTE_AUSENTE' || 
     Boolean(claseObj.articulo_licencia) || 
     claseObj.caracter === 'DOCENTE_AUSENTE' || 
     claseObj.caracter_clase === 'DOCENTE_AUSENTE')
  ) {
    return {
      esLicencia: true,
      id: claseObj.id,
      articulo: claseObj.articulo_licencia || 'Licencia Docente (Dto. 1092)',
      articulo_codigo: claseObj.articulo_codigo || null,
      observacion: claseObj.motivo_inasistencia || claseObj.observaciones || '',
      fecha_inicio: String(claseObj.fecha).slice(0, 10),
      fecha_fin: String(claseObj.fecha).slice(0, 10),
      cantidad_dias: 1
    };
  }

  if (!targetDate || !Array.isArray(licencias) || licencias.length === 0) return null;

  const match = licencias.find((lic) => {
    if (!lic) return false;
    const inicio = String(lic.fecha_inicio || lic.fecha || '').slice(0, 10);
    const fin = String(lic.fecha_fin || lic.fecha_inicio || lic.fecha || '').slice(0, 10);
    if (!inicio) return false;

    // Rango inclusivo ISO (YYYY-MM-DD)
    const enRango = targetDate >= inicio && targetDate <= fin;
    if (!enRango) return false;

    // Verificar si aplica a esta cátedra (o a todas)
    if (lic.aplica_todas_catedras !== false) return true;
    if (!catedraId) return true;
    if (lic.catedra_id && String(lic.catedra_id) === String(catedraId)) return true;
    if (Array.isArray(lic.catedra_ids) && lic.catedra_ids.map(String).includes(String(catedraId))) return true;
    return false;
  });

  if (!match) return null;

  const fInicio = String(match.fecha_inicio || match.fecha || targetDate).slice(0, 10);
  const fFin = String(match.fecha_fin || match.fecha_inicio || match.fecha || targetDate).slice(0, 10);

  return {
    esLicencia: true,
    id: match.id,
    articulo: match.articulo || match.articulo_licencia || 'Licencia Docente (Dto. 1092)',
    articulo_codigo: match.articulo_codigo || null,
    observacion: match.observacion || match.observaciones || match.motivo_inasistencia || '',
    fecha_inicio: fInicio,
    fecha_fin: fFin,
    fecha_reintegro: match.fecha_reintegro ? String(match.fecha_reintegro).slice(0, 10) : null,
    cantidad_dias: match.cantidad_dias || 1,
    aplica_todas_catedras: match.aplica_todas_catedras !== false,
    catedra_id: match.catedra_id || null,
    catedra_ids: match.catedra_ids || []
  };
}

export default obtenerLicenciaParaFecha;
