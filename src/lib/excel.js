import * as XLSX from 'xlsx';
import { formatFechaDMY } from './dateUtils';

/**
 * Procesa un archivo Excel (.xlsx, .xls) o CSV en el navegador usando SheetJS.
 * @param {File} file - Archivo proveniente de input file o drag & drop
 * @returns {Promise<{ rows: Array, headers: Array }>}
 */
export async function parseExcelOrCsv(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Tomar la primera hoja
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convertir a matriz JSON con encabezados de la fila 1
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        if (!rawJson || rawJson.length === 0) {
          resolve({ rows: [], headers: [] });
          return;
        }

        const headers = Object.keys(rawJson[0]);
        resolve({ rows: rawJson, headers });
      } catch (err) {
        reject(new Error('Error al procesar el archivo Excel/CSV: ' + err.message));
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Autodetecta las columnas correspondientes a DNI, Apellido y Nombre.
 * @param {Array<string>} headers
 * @returns {{ dniField: string, apellidoField: string, nombreField: string }}
 */
export function autoDetectColumns(headers = []) {
  const normalize = (s) => s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  let dniField = '';
  let apellidoField = '';
  let nombreField = '';

  for (const h of headers) {
    const norm = normalize(h);
    if (!dniField && (norm.includes('dni') || norm.includes('documento') || norm.includes('cedula') || norm.includes('legajo'))) {
      dniField = h;
    } else if (!apellidoField && (norm.includes('apellido') || norm.includes('apellidos'))) {
      apellidoField = h;
    } else if (!nombreField && (norm.includes('nombre') || norm.includes('nombres'))) {
      nombreField = h;
    }
  }

  // Fallbacks posicionales
  if (!dniField && headers[0]) dniField = headers[0];
  if (!apellidoField && headers[1]) apellidoField = headers[1];
  if (!nombreField && headers[2]) nombreField = headers[2];

  return { dniField, apellidoField, nombreField };
}

/**
 * Normaliza y valida los datos crudos extraídos de la planilla.
 */
export function sanitizeStudentRows(rows = [], mapping = {}) {
  const { dniField, apellidoField, nombreField } = mapping;
  const sanitized = [];
  const dniSet = new Set();
  const errors = [];

  rows.forEach((row, index) => {
    const dniRaw = String(row[dniField] ?? '').trim().replace(/\D/g, '');
    const apellido = String(row[apellidoField] ?? '').trim();
    const nombre = String(row[nombreField] ?? '').trim();

    if (!dniRaw && !apellido && !nombre) {
      // Fila vacía, omitir
      return;
    }

    if (!dniRaw) {
      errors.push(`Fila ${index + 1}: DNI vacío para "${apellido}, ${nombre}"`);
      return;
    }

    if (dniSet.has(dniRaw)) {
      errors.push(`Fila ${index + 1}: DNI duplicado (${dniRaw}) en el archivo.`);
      return;
    }

    dniSet.add(dniRaw);
    sanitized.push({
      dni: dniRaw,
      apellido: apellido || 'Sin Apellido',
      nombre: nombre || 'Sin Nombre'
    });
  });

  return { sanitized, errors };
}

/**
 * Exporta la sábana de calificaciones y asistencia completa a un archivo Excel (.xlsx).
 */
export function exportGradesToExcel(arg1, arg2, arg3, arg4, arg5) {
  exportGradesToFile('xlsx', arg1, arg2, arg3, arg4, arg5);
}

export function exportGradesToCsv(arg1, arg2, arg3, arg4, arg5) {
  exportGradesToFile('csv', arg1, arg2, arg3, arg4, arg5);
}

/**
 * Exporta la sábana de calificaciones en formato Excel (.xlsx) o CSV (.csv).
 * @param {'xlsx'|'csv'} format 
 */
export function exportGradesToFile(format = 'xlsx', arg1, arg2, arg3, arg4, arg5) {
  let catedraInfo = { nombre: 'Catedra' };
  let estudiantes = [];
  let evaluaciones = [];
  let notas = [];
  let extraMatrix = [];

  if (arg1 && arg2 && Array.isArray(arg2)) {
    // Positional call: (catedraInfo, estudiantes, evaluaciones, notas, extraMatrix)
    catedraInfo = arg1;
    estudiantes = arg2;
    evaluaciones = arg3 || [];
    notas = arg4 || [];
    extraMatrix = arg5 || [];
  } else if (typeof arg1 === 'object') {
    // Single object call
    catedraInfo = { nombre: arg1.catedraNombre || 'Catedra' };
    evaluaciones = arg1.evaluaciones || [];
    if (arg1.estudiantesConNotas) {
      // Convert format
      estudiantes = arg1.estudiantesConNotas.map(e => e.estudiante);
    }
  }

  // Notas indexadas por estudianteId + evaluacionId
  const notasMap = new Map();
  notas.forEach(n => {
    notasMap.set(`${n.estudiante_id}_${n.evaluacion_id}`, n.valor);
  });

  // Extra matrix indexada por estudianteId
  const matrixMap = new Map();
  extraMatrix.forEach(m => {
    matrixMap.set(m.estudianteId, m);
  });

  const mainEvals = evaluaciones.filter(e => e.tipo !== 'RECUPERATORIO');
  const recups = evaluaciones.filter(e => e.tipo === 'RECUPERATORIO');

  const rows = estudiantes.map((est, idx) => {
    const matrixInfo = matrixMap.get(est.id) || {};
    const row = {
      'N°': idx + 1,
      'DNI': est.dni,
      'Apellido': est.apellido,
      'Nombre': est.nombre,
      '% Asistencia': `${matrixInfo.asistenciaPct ?? 100}%`
    };

    // Evaluaciones principales
    mainEvals.forEach(ev => {
      const v = notasMap.get(`${est.id}_${ev.id}`);
      row[ev.titulo] = v !== undefined && v !== null ? v : '-';

      // Recuperatorio asociado
      const linkedRecup = recups.find(r => r.evaluacion_origen_id === ev.id);
      if (linkedRecup) {
        const rv = notasMap.get(`${est.id}_${linkedRecup.id}`);
        row[`Recup. ${ev.titulo}`] = rv !== undefined && rv !== null ? rv : '-';
      }
    });

    const cond = matrixInfo.condicion?.condicion || 'REGULAR';
    const motivo = matrixInfo.condicion?.motivo || '';

    row['Condición Final'] = cond;
    row['Observaciones / Criterio'] = motivo;

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Ajustar anchos
  const wscols = [
    { wch: 6 },   // N°
    { wch: 14 },  // DNI
    { wch: 22 },  // Apellido
    { wch: 22 },  // Nombre
    { wch: 14 },  // Asist
  ];
  worksheet['!cols'] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Calificaciones");

  const cleanCatedraName = (catedraInfo.nombre || 'Catedra').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];

  if (format === 'csv') {
    const fileName = `Calificaciones_${cleanCatedraName}_${dateStr}.csv`;
    XLSX.writeFile(workbook, fileName, { bookType: 'csv' });
  } else {
    const fileName = `Calificaciones_${cleanCatedraName}_${dateStr}.xlsx`;
    XLSX.writeFile(workbook, fileName, { bookType: 'xlsx' });
  }
}

/**
 * Exporta el acta de una mesa de examen completa a un archivo Excel (.xlsx).
 * @param {Object} mesa - Metadatos de la mesa examinadora
 * @param {Array} actasAlumnos - Lista de alumnos inscriptos con sus notas y dictámenes
 * @param {string} catedraNombre - Nombre de la cátedra
 */
export function exportMesaExamenToExcel(mesa = {}, actasAlumnos = [], catedraNombre = '') {
  const cleanCatedra = (catedraNombre || mesa.catedras?.nombre || 'Catedra').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeTurno = (mesa.turno_llamado || 'Examen').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = mesa.fecha ? formatFechaDMY(mesa.fecha) : new Date().toISOString().split('T')[0];

  const rows = (actasAlumnos || []).map((acta, idx) => {
    const est = acta.estudiantes || {};
    const dni = acta.dni || est.dni || '-';
    const apellido = acta.apellido || est.apellido || '-';
    const nombre = acta.nombre || est.nombre || '-';
    const escrito = acta.nota_escrito !== undefined && acta.nota_escrito !== null ? acta.nota_escrito : '-';
    const oral = acta.nota_oral !== undefined && acta.nota_oral !== null ? acta.nota_oral : '-';
    const definitiva = acta.nota_definitiva !== undefined && acta.nota_definitiva !== null ? acta.nota_definitiva : '-';
    const letras = acta.calificacion_letras || acta.nota_letras || '-';
    const dictamen = acta.dictamen || acta.resultado || '-';

    return {
      'N°': idx + 1,
      'DNI': dni,
      'Apellido': apellido,
      'Nombre': nombre,
      'Nota Escrito': escrito,
      'Nota Oral': oral,
      'Nota Definitiva': definitiva,
      'Calificación en Letras': letras,
      'Dictamen': dictamen,
      'Folio': acta.folio_fisico || mesa.folio || '-'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  const wscols = [
    { wch: 6 },   // N°
    { wch: 14 },  // DNI
    { wch: 22 },  // Apellido
    { wch: 22 },  // Nombre
    { wch: 14 },  // Nota Escrito
    { wch: 14 },  // Nota Oral
    { wch: 16 },  // Nota Definitiva
    { wch: 24 },  // Letras
    { wch: 18 },  // Dictamen
    { wch: 10 },  // Folio
  ];
  worksheet['!cols'] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Acta de Examen");

  const fileName = `Acta_Examen_${cleanCatedra}_${safeTurno}_${dateStr}.xlsx`;
  XLSX.writeFile(workbook, fileName, { bookType: 'xlsx' });
}

/**
 * Exporta la sábana cronológica completa de asistencias de una cátedra a un archivo Excel (.xlsx).
 * @param {Object} catedraInfo - Datos de la cátedra (nombre, nivel, etc.)
 * @param {Array} estudiantes - Lista de alumnos
 * @param {Array} clases - Sesiones de clase registradas
 * @param {Array} asistencias - Registros de asistencia individuales
 * @param {Array} inasistenciasDocente - Licencias / ausencias del docente
 * @param {Map} studentStatsMap - Mapa id -> porcentaje acumulado
 */
export function exportAttendanceToExcel(
  catedraInfo = {},
  estudiantes = [],
  clases = [],
  asistencias = [],
  inasistenciasDocente = [],
  studentStatsMap = new Map()
) {
  const cleanCatedra = (catedraInfo.nombre || 'Catedra').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];

  // Ordenar clases cronológicamente
  const sortedClases = [...(clases || [])].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  // Mapa rápido de asistencias: `${estudianteId}_${claseId}` -> estado
  const asistenciasMap = new Map();
  (asistencias || []).forEach(a => {
    if (a.estudiante_id && a.clase_id) {
      asistenciasMap.set(`${a.estudiante_id}_${a.clase_id}`, a.estado);
    }
  });

  const rows = (estudiantes || []).map((est, idx) => {
    let presentes = 0;
    let ausentes = 0;
    let justificadas = 0;

    const row = {
      'N°': idx + 1,
      'DNI': est.dni || '-',
      'Apellido': est.apellido || '-',
      'Nombre': est.nombre || '-'
    };

    sortedClases.forEach(c => {
      const fechaCol = formatFechaDMY(c.fecha);
      const estado = asistenciasMap.get(`${est.id}_${c.id}`);
      if (estado === 'PRESENTE') {
        presentes++;
        row[fechaCol] = 'P';
      } else if (estado === 'AUSENTE') {
        ausentes++;
        row[fechaCol] = 'A';
      } else if (estado === 'JUSTIFICADA') {
        justificadas++;
        row[fechaCol] = 'J';
      } else {
        row[fechaCol] = '-';
      }
    });

    const pct = studentStatsMap?.get(est.id) ?? (
      sortedClases.length > 0 ? Math.round((presentes / sortedClases.length) * 100) : 100
    );

    row['Total Clases'] = sortedClases.length;
    row['Presentes'] = presentes;
    row['Ausentes'] = ausentes;
    row['Justificadas'] = justificadas;
    row['% Asistencia'] = `${pct}%`;

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  const wscols = [
    { wch: 6 },   // N°
    { wch: 14 },  // DNI
    { wch: 22 },  // Apellido
    { wch: 22 },  // Nombre
  ];
  sortedClases.forEach(() => {
    wscols.push({ wch: 12 });
  });
  wscols.push({ wch: 14 }); // Total Clases
  wscols.push({ wch: 12 }); // Presentes
  wscols.push({ wch: 12 }); // Ausentes
  wscols.push({ wch: 12 }); // Justificadas
  wscols.push({ wch: 14 }); // % Asistencia

  worksheet['!cols'] = wscols;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Asistencias");

  const fileName = `Asistencias_${cleanCatedra}_${dateStr}.xlsx`;
  XLSX.writeFile(workbook, fileName, { bookType: 'xlsx' });
}
