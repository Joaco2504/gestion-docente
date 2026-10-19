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
 * Indica si el objeto cátedra posee configuración explícita de días/horarios de cursada.
 * @param {Object|null} catedra
 * @returns {boolean}
 */
export function tieneHorariosConfigurados(catedra) {
  return extraerDiasCursadaCatedra(catedra).size > 0;
}

/**
 * Determina si una cátedra tiene clases programadas en una fecha específica (YYYY-MM-DD).
 * Convierte fechaStr en día de la semana (0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb)
 * y devuelve true SOLO si esa cátedra se dicta ese día de la semana.
 * @param {Object|null} catedra
 * @param {string} fechaStr - YYYY-MM-DD
 * @returns {boolean}
 */
export function catedraTieneClaseEnFecha(catedra, fechaStr) {
  if (!catedra || !fechaStr) return false;
  const cleanDate = String(fechaStr).slice(0, 10);
  const parts = cleanDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return false;

  const dateObj = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  if (isNaN(dateObj.getTime())) return false;

  const dayOfWeek = dateObj.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb
  const diasSet = extraerDiasCursadaCatedra(catedra);
  if (diasSet.size === 0) return false;

  return diasSet.has(dayOfWeek);
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
  if (obtenerFeriado(cleanDate) !== null) {
    return true;
  }
  if (Array.isArray(clasesDeCatedra) && clasesDeCatedra.length > 0) {
    return clasesDeCatedra.some(c => {
      if (!c) return false;
      const cFecha = String(c.fecha || '').slice(0, 10);
      if (cFecha !== cleanDate) return false;
      return (
        c.es_feriado === true ||
        c.caracter === 'FERIADO' ||
        c.caracter_clase === 'FERIADO' ||
        c.estado === 'FERIADO' ||
        Boolean(c.feriadoInfo)
      );
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
