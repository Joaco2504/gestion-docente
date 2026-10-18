/**
 * src/utils/licenciasHelper.js
 * Detector universal e infalible de licencias docentes por fecha o clase (Decreto Acuerdo 1092).
 * Cruza cualquier fecha ISO (YYYY-MM-DD) o registro de clase contra el listado de licencias_docentes.
 */

/**
 * Determina si una fecha o clase específica está alcanzada por una licencia docente.
 * @param {string} fechaStr - Fecha a consultar (YYYY-MM-DD)
 * @param {string|null} [catedraId] - ID de la cátedra activa
 * @param {Array} [licencias] - Listado de licencias del docente
 * @param {Object|null} [claseObj] - Registro opcional de clase
 * @returns {Object|null} Información de la licencia si aplica, o null si la jornada es regular
 */
export function obtenerLicenciaParaFecha(fechaStr, catedraId = null, licencias = [], claseObj = null) {
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

  const rawDate = fechaStr || claseObj?.fecha;
  if (!rawDate) return null;
  const targetDate = String(rawDate).slice(0, 10);
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
