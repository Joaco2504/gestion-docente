import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { calcularPorcentajeAsistencia, calcularCondicionFinal } from '../lib/academicLogic';

/**
 * Normaliza un número de DNI removiendo espacios, puntos, guiones y letras.
 */
export function normalizeDni(dni) {
  return String(dni || '').replace(/\D/g, '').trim();
}

/**
 * Formatea un número de DNI para exhibición (ej. 40.111.222).
 */
export function formatDniDisplay(dni) {
  const clean = normalizeDni(dni);
  if (!clean) return '';
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Carga la configuración de visibilidad del portal y datos públicos de la cátedra.
 */
export async function getCatedraPortalConfig(catedraId, isDemo = false) {
  if (!catedraId) return null;

  // 1. Intentar cargar desde Supabase si está activo
  if (isSupabaseConfigured && !isDemo) {
    try {
      const { data, error } = await supabase
        .from('catedras')
        .select(`
          id,
          nombre,
          nivel,
          modalidad,
          portal_activo,
          portal_mostrar_asistencia,
          portal_mostrar_notas,
          portal_mostrar_condicion,
          instituciones (
            nombre
          )
        `)
        .eq('id', catedraId)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          nombre: data.nombre,
          nivel: data.nivel || 'TERCIARIO',
          modalidad: data.modalidad || 'ANUAL',
          institucion_nombre: data.instituciones?.nombre || 'Institución Educativa',
          portal_activo: Boolean(data.portal_activo),
          portal_mostrar_asistencia: data.portal_mostrar_asistencia !== false,
          portal_mostrar_notas: data.portal_mostrar_notas !== false,
          portal_mostrar_condicion: data.portal_mostrar_condicion !== false
        };
      }
    } catch (err) {
      console.warn('Error al consultar configuración del portal en Supabase:', err);
    }
  }

  // 2. Fallback / Modo Demo desde LocalStorage
  try {
    const savedConfig = localStorage.getItem(`portal_config_${catedraId}`);
    let localPortalConfig = savedConfig ? JSON.parse(savedConfig) : null;

    const savedCatedras = JSON.parse(localStorage.getItem('demo_catedras') || '[]');
    const cat = savedCatedras.find(c => c.id === catedraId);

    return {
      id: catedraId,
      nombre: cat?.nombre || localPortalConfig?.nombre || 'Cátedra',
      nivel: cat?.nivel || localPortalConfig?.nivel || 'TERCIARIO',
      modalidad: cat?.modalidad || localPortalConfig?.modalidad || 'ANUAL',
      institucion_nombre: cat?.institucion_nombre || localPortalConfig?.institucion_nombre || 'I.S.F.T. N° 179',
      portal_activo: localPortalConfig?.portal_activo ?? cat?.portal_activo ?? false,
      portal_mostrar_asistencia: localPortalConfig?.portal_mostrar_asistencia ?? cat?.portal_mostrar_asistencia ?? true,
      portal_mostrar_notas: localPortalConfig?.portal_mostrar_notas ?? cat?.portal_mostrar_notas ?? true,
      portal_mostrar_condicion: localPortalConfig?.portal_mostrar_condicion ?? cat?.portal_mostrar_condicion ?? true
    };
  } catch (_) {
    return {
      id: catedraId,
      nombre: 'Cátedra',
      nivel: 'TERCIARIO',
      modalidad: 'ANUAL',
      institucion_nombre: 'Institución Educativa',
      portal_activo: false,
      portal_mostrar_asistencia: true,
      portal_mostrar_notas: true,
      portal_mostrar_condicion: true
    };
  }
}

/**
 * Guarda las preferencias de visibilidad del docente para el portal.
 */
export async function saveCatedraPortalConfig(catedraId, config, isDemo = false) {
  if (!catedraId) return false;

  const payload = {
    portal_activo: Boolean(config.portal_activo),
    portal_mostrar_asistencia: Boolean(config.portal_mostrar_asistencia),
    portal_mostrar_notas: Boolean(config.portal_mostrar_notas),
    portal_mostrar_condicion: Boolean(config.portal_mostrar_condicion)
  };

  // 1. Guardar en LocalStorage (Siempre como caché / respaldo inmediato)
  try {
    localStorage.setItem(`portal_config_${catedraId}`, JSON.stringify({
      ...config,
      ...payload
    }));

    const storedCats = JSON.parse(localStorage.getItem('demo_catedras') || '[]');
    const updatedCats = storedCats.map(c => c.id === catedraId ? { ...c, ...payload } : c);
    localStorage.setItem('demo_catedras', JSON.stringify(updatedCats));
  } catch (e) {
    console.warn('No se pudo guardar la configuración en localStorage:', e);
  }

  // 2. Si Supabase está conectado, actualizar la tabla 'catedras'
  if (isSupabaseConfigured && !isDemo) {
    try {
      const { error } = await supabase
        .from('catedras')
        .update(payload)
        .eq('id', catedraId);

      if (error) throw error;
    } catch (err) {
      console.warn('Aviso: Columnas de portal no encontradas en DB o error RLS. Se mantuvo en localStorage:', err);
    }
  }

  return true;
}

/**
 * Consulta de estado académico para un estudiante sin necesidad de autenticación.
 * Resuelve de forma segura y granular los datos permitidos por el docente.
 */
export async function consultarEstadoAlumno(catedraId, dniInput, isDemo = false) {
  const cleanDni = normalizeDni(dniInput);
  if (!cleanDni || cleanDni.length < 6) {
    return {
      success: false,
      error_code: 'DNI_INVALIDO',
      message: 'Ingresa un número de DNI válido (mínimo 6 dígitos).'
    };
  }

  // 1. Si Supabase está activo y no es demo, intentar RPC primero
  if (isSupabaseConfigured && !isDemo) {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('consultar_estado_alumno', {
        p_catedra_id: catedraId,
        p_dni: cleanDni
      });

      if (!rpcError && rpcData) {
        if (rpcData.success) {
          // Si el RPC no incluye cálculo completo de condición RAM, lo complementamos localmente
          if (rpcData.config?.portal_mostrar_condicion && !rpcData.condicion_ram) {
            const nivel = rpcData.catedra?.nivel || 'TERCIARIO';
            const mod = rpcData.catedra?.modalidad || 'ANUAL';
            const asistPct = rpcData.asistencia?.porcentaje ?? 100;
            const evals = rpcData.evaluaciones || [];
            const notas = evals.filter(e => e.valor !== null && e.valor !== undefined);
            
            const cond = calcularCondicionFinal(nivel, mod, asistPct, evals, notas);
            rpcData.condicion_ram = cond;
          }
          return rpcData;
        } else {
          return rpcData;
        }
      }
    } catch (rpcErr) {
      console.warn('RPC consultar_estado_alumno no disponible, ejecutando motor de resolución directa:', rpcErr);
    }
  }

  // 2. Motor de consulta local y resiliente (Demo / Offline / Fallback)
  const portalConfig = await getCatedraPortalConfig(catedraId, isDemo);
  if (!portalConfig) {
    return {
      success: false,
      error_code: 'CATEDRA_NO_ENCONTRADA',
      message: 'La cátedra solicitada no existe o el enlace es incorrecto.'
    };
  }

  if (!portalConfig.portal_activo) {
    return {
      success: false,
      error_code: 'PORTAL_INACTIVO',
      message: 'El portal de consulta de esta cátedra se encuentra pausado por el docente.'
    };
  }

  // Cargar estudiantes de la cátedra
  let studentList = [];
  try {
    const stored = localStorage.getItem(`estudiantes_${catedraId}`);
    if (stored) {
      studentList = JSON.parse(stored);
    } else {
      // Muestra demo si es la primera vez que se consulta
      studentList = [
        { id: 'est-1', dni: '40111222', apellido: 'Álvarez', nombre: 'Martín' },
        { id: 'est-2', dni: '39444555', apellido: 'Benítez', nombre: 'Lucía' },
        { id: 'est-3', dni: '41888999', apellido: 'Castillo', nombre: 'Ignacio' },
        { id: 'est-4', dni: '38222333', apellido: 'Domínguez', nombre: 'Valentina' },
        { id: 'est-5', dni: '42333444', apellido: 'Fernández', nombre: 'Santiago' }
      ];
      localStorage.setItem(`estudiantes_${catedraId}`, JSON.stringify(studentList));
    }
  } catch (_) {}

  // Buscar coincidencia de DNI
  const student = studentList.find(s => normalizeDni(s.dni) === cleanDni);
  if (!student) {
    return {
      success: false,
      error_code: 'ESTUDIANTE_NO_ENCONTRADO',
      message: `No se encontró ningún estudiante inscripto con el DNI ${formatDniDisplay(cleanDni)} en esta cátedra.`
    };
  }

  // Datos académicos auxiliares
  let clases = [];
  let asistencias = [];
  let inasistenciasDocente = [];
  let evaluaciones = [];
  let notas = [];
  let criterios = {
    min_asist_promo: 80,
    min_asist_reg: 70,
    nota_min_promo: 7,
    nota_min_reg: 4,
    nota_min_sec: 6
  };

  try {
    const stClases = localStorage.getItem(`clases_${catedraId}`);
    if (stClases) clases = JSON.parse(stClases);

    const stAsist = localStorage.getItem(`asistencias_${catedraId}`);
    if (stAsist) asistencias = JSON.parse(stAsist);

    const stInasist = localStorage.getItem(`inasistencias_docente_${catedraId}`);
    if (stInasist) inasistenciasDocente = JSON.parse(stInasist);

    const stEval = localStorage.getItem(`evaluaciones_${catedraId}`);
    if (stEval) evaluaciones = JSON.parse(stEval);

    const stNotas = localStorage.getItem(`notas_${catedraId}`);
    if (stNotas) notas = JSON.parse(stNotas);

    const stCrit = localStorage.getItem(`criterios_${catedraId}`);
    if (stCrit) criterios = { ...criterios, ...JSON.parse(stCrit) };
  } catch (_) {}

  // Si no hay clases ni evaluaciones aún en demo, proveer datos amigables para visualización de prueba
  if (clases.length === 0 && evaluaciones.length === 0) {
    clases = [
      { id: 'cls-1', fecha: '2026-03-10', tema: 'Presentación de la Materia' },
      { id: 'cls-2', fecha: '2026-03-17', tema: 'Arquitectura de Software' },
      { id: 'cls-3', fecha: '2026-03-24', tema: 'Componentes y Estado' },
      { id: 'cls-4', fecha: '2026-03-31', tema: 'Hooks y Context API' }
    ];
    asistencias = [
      { clase_id: 'cls-1', estudiante_id: student.id, estado: 'PRESENTE' },
      { clase_id: 'cls-2', estudiante_id: student.id, estado: 'PRESENTE' },
      { clase_id: 'cls-3', estudiante_id: student.id, estado: 'PRESENTE' },
      { clase_id: 'cls-4', estudiante_id: student.id, estado: 'AUSENTE' }
    ];
    evaluaciones = [
      { id: 'ev-1', titulo: 'Trabajo Práctico N° 1', tipo: 'TP' },
      { id: 'ev-2', titulo: '1° Parcial Teórico-Práctico', tipo: 'PARCIAL' }
    ];
    notas = [
      { evaluacion_id: 'ev-1', estudiante_id: student.id, valor: 8.5 },
      { evaluacion_id: 'ev-2', estudiante_id: student.id, valor: 7.0 }
    ];
  }

  // 1. Cálculo Asistencia
  const studentAsist = asistencias.filter(a => a.estudiante_id === student.id);
  const totalClasesEfectivas = Math.max(0, clases.length - inasistenciasDocente.length);
  const presentes = studentAsist.filter(a => a.estado === 'PRESENTE').length;
  const ausentes = Math.max(0, totalClasesEfectivas - presentes);
  const asistenciaPct = calcularPorcentajeAsistencia(studentAsist, clases.length, inasistenciasDocente.length);

  // 2. Mapeo de Evaluaciones y Calificaciones
  const studentEvaluaciones = evaluaciones.map(ev => {
    const notaRecord = notas.find(n => n.evaluacion_id === ev.id && n.estudiante_id === student.id);
    return {
      id: ev.id,
      titulo: ev.titulo,
      tipo: ev.tipo,
      fecha_entrega: ev.fecha_entrega || null,
      valor: notaRecord?.valor !== undefined && notaRecord?.valor !== null ? Number(notaRecord.valor) : null
    };
  });

  // 3. Cálculo de Condición RAM
  const studentNotasForLogic = studentEvaluaciones
    .filter(e => e.valor !== null)
    .map(e => ({ evaluacion_id: e.id, valor: e.valor, tipo: e.tipo }));

  const condicionCalculada = calcularCondicionFinal(
    portalConfig.nivel,
    portalConfig.modalidad,
    asistenciaPct,
    evaluaciones,
    studentNotasForLogic,
    criterios
  );

  // Verificar override manual del docente si existe
  const manualOverride = localStorage.getItem(`condicion_override_${catedraId}_${student.id}`);
  let finalCondicion = condicionCalculada;
  if (manualOverride && manualOverride !== 'AUTO') {
    finalCondicion = {
      condicion: manualOverride,
      badgeVariant: manualOverride === 'PROMOCIONAL' || manualOverride === 'APROBADO' ? 'promo' : (manualOverride === 'REGULAR' ? 'regular' : 'libre'),
      color: manualOverride === 'PROMOCIONAL' || manualOverride === 'APROBADO' ? 'text-emerald-700 dark:text-emerald-400' : (manualOverride === 'REGULAR' ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400'),
      motivo: 'Condición asignada administrativamente por el docente'
    };
  }

  // Estructura de respuesta
  return {
    success: true,
    catedra: {
      id: portalConfig.id,
      nombre: portalConfig.nombre,
      nivel: portalConfig.nivel,
      modalidad: portalConfig.modalidad,
      institucion_nombre: portalConfig.institucion_nombre
    },
    estudiante: {
      id: student.id,
      dni: student.dni,
      apellido: student.apellido,
      nombre: student.nombre
    },
    config: {
      portal_mostrar_asistencia: portalConfig.portal_mostrar_asistencia,
      portal_mostrar_notas: portalConfig.portal_mostrar_notas,
      portal_mostrar_condicion: portalConfig.portal_mostrar_condicion
    },
    asistencia: portalConfig.portal_mostrar_asistencia ? {
      total_clases: totalClasesEfectivas,
      presentes,
      ausentes,
      porcentaje: asistenciaPct,
      min_asist_reg: criterios.min_asist_reg,
      min_asist_promo: criterios.min_asist_promo
    } : null,
    evaluaciones: portalConfig.portal_mostrar_notas ? studentEvaluaciones : null,
    condicion_ram: portalConfig.portal_mostrar_condicion ? finalCondicion : null
  };
}
