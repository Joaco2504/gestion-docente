import * as XLSX from 'xlsx';

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
