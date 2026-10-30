import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { calcularPorcentajeAsistencia, calcularCondicionFinal, calcularPromedioGeneral } from '../lib/academicLogic';
import { getEstudiantesCatedra } from './catedraEstudiantesService';

/**
 * Helper interno para construir un objeto de condición RAM a partir de un override manual.
 */
function buildManualCondicionRam(condicionManual, motivoManual = null, condicionAutomatica = null) {
  const code = String(condicionManual || '').toUpperCase();
  const isPromoInd = code === 'PROMOCION_INDIRECTA';
  const isPromoDir = code === 'PROMOCIONAL' || code === 'PROMOCION_DIRECTA' || code === 'APROBADO';
  const isReg = code === 'REGULAR';

  return {
    condicion: isPromoInd ? 'PROMOCION_INDIRECTA' : (isPromoDir ? 'PROMOCIONAL' : (isReg ? 'REGULAR' : 'LIBRE')),
    subcondicion: isPromoInd ? 'INDIRECTA' : (isPromoDir ? 'DIRECTA' : null),
    es_manual: true,
    condicion_manual: code,
    condicion_automatica: condicionAutomatica?.condicion || null,
    badgeVariant: (isPromoDir || isPromoInd) ? 'promo' : (isReg ? 'regular' : 'libre'),
    color: isPromoInd
      ? 'text-teal-700 dark:text-teal-400'
      : isPromoDir
      ? 'text-emerald-700 dark:text-emerald-400'
      : isReg
      ? 'text-amber-700 dark:text-amber-400'
      : 'text-rose-700 dark:text-rose-400',
    motivo: motivoManual
      ? `Condición fijada por la cátedra: ${motivoManual}`
      : 'Condición asignada administrativamente por el docente'
  };
}

/**
 * Lee el override manual desde el estudiante o desde localStorage.
 */
function resolveStudentManualOverride(catedraId, resolvedCatedraId, student) {
  if (!student || student.es_equivalencia) return { condicion_manual: null, motivo_condicion_manual: null };
  if (student.condicion_manual && student.condicion_manual !== 'AUTO') {
    return {
      condicion_manual: student.condicion_manual,
      motivo_condicion_manual: student.motivo_condicion_manual || null
    };
  }
  try {
    const raw =
      localStorage.getItem(`condicion_override_${resolvedCatedraId}_${student.id}`) ||
      localStorage.getItem(`condicion_override_${catedraId}_${student.id}`);
    if (!raw || raw === 'AUTO') return { condicion_manual: null, motivo_condicion_manual: null };
    if (raw.startsWith('{')) {
      const parsed = JSON.parse(raw);
      return {
        condicion_manual: parsed?.condicion_manual || null,
        motivo_condicion_manual: parsed?.motivo_condicion_manual || null
      };
    }
    return { condicion_manual: raw, motivo_condicion_manual: null };
  } catch (_) {
    return { condicion_manual: null, motivo_condicion_manual: null };
  }
}

/**
 * Convierte un nombre de cátedra o texto en un slug amigable y limpio en kebab-case.
 * Remueve tildes, caracteres especiales (°/º/() etc.) y colapsa espacios/guiones.
 */
export function slugifyCatedra(nombre) {
  if (!nombre) return '';
  return String(nombre)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar diacríticos / tildes
    .toLowerCase()
    .trim()
    .replace(/[°ºª]/g, '') // Quitar indicadores ordinales
    .replace(/[^a-z0-9\s-]/g, '') // Quitar símbolos y puntuación restante
    .replace(/[\s_]+/g, '-') // Espacios y guiones bajos a guiones medios
    .replace(/-+/g, '-') // Colapsar múltiples guiones consecutivos
    .replace(/^-+|-+$/g, ''); // Limpiar guiones iniciales o finales
}

/**
 * Valida si una cadena cumple el formato estándar de UUID v4.
 */
export function isUuid(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str || '').trim());
}

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
 * Enmascara los dígitos centrales del DNI para proteger la privacidad tras la consulta.
 * Ej: "42376302" -> "42.***.302" | "8123456" -> "8.***.456"
 */
export function maskDni(dni) {
  const clean = normalizeDni(dni);
  if (!clean) return '';
  if (clean.length <= 5) return `${clean.slice(0, 1)}.***.${clean.slice(-2)}`;
  const prefix = clean.slice(0, clean.length - 6);
  const last3 = clean.slice(-3);
  return `${prefix}.***.${last3}`;
}

/**
 * Carga la configuración de visibilidad del portal y datos públicos de la cátedra.
 * Admite tanto UUID directo como slugs o alias amigables de cátedra.
 */
export async function getCatedraPortalConfig(catedraId, isDemo = false) {
  if (!catedraId) return null;
  const inputIdentifier = String(catedraId).trim();
  const isInputUuid = isUuid(inputIdentifier);

  // 1. Intentar cargar desde Supabase si está activo
  if (isSupabaseConfigured && !isDemo) {
    try {
      let data = null;

      if (isInputUuid) {
        // Búsqueda directa por UUID (intentamos primero con todos los campos extendidos)
        const res = await supabase
          .from('catedras')
          .select(`
            *,
            instituciones (
              nombre
            )
          `)
          .eq('id', inputIdentifier)
          .maybeSingle();

        if (!res.error && res.data) {
          data = res.data;
        } else if (res.error) {
          // Fallback en caso de que alguna columna no exista en la tabla aún
          const retryRes = await supabase
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
            .eq('id', inputIdentifier)
            .maybeSingle();
          if (!retryRes.error && retryRes.data) {
            data = retryRes.data;
          }
        }
      } else {
        // Búsqueda por slug o alias amigable
        // Intento 1: Buscar por columna alias si existe
        try {
          const aliasRes = await supabase
            .from('catedras')
            .select(`
              *,
              instituciones (
                nombre
              )
            `)
            .eq('alias', inputIdentifier)
            .maybeSingle();

          if (!aliasRes.error && aliasRes.data) {
            data = aliasRes.data;
          }
        } catch (_) {}

        // Intento 2: Si no coincidió por alias o no existe la columna, resolver por slug del nombre
        if (!data) {
          const { data: activeList, error: listErr } = await supabase
            .from('catedras')
            .select(`
              *,
              instituciones (
                nombre
              )
            `)
            .eq('portal_activo', true);

          if (!listErr && activeList) {
            data = activeList.find(c => 
              slugifyCatedra(c.nombre) === inputIdentifier || 
              (c.alias && c.alias.toLowerCase() === inputIdentifier.toLowerCase())
            ) || null;
          }
        }
      }

      if (data) {
        let localPortalOverride = {};
        try {
          const rawLocal = localStorage.getItem(`portal_config_${data.id}`);
          if (rawLocal) localPortalOverride = JSON.parse(rawLocal) || {};
        } catch (_) {}

        return {
          id: data.id,
          nombre: data.nombre,
          alias: data.alias || slugifyCatedra(data.nombre),
          nivel: data.nivel || 'TERCIARIO',
          modalidad: data.modalidad || 'ANUAL',
          institucion_nombre: data.instituciones?.nombre || 'Institución Educativa',
          portal_activo: Boolean(data.portal_activo),
          portal_mostrar_asistencia: data.portal_mostrar_asistencia !== false,
          portal_mostrar_notas: data.portal_mostrar_notas !== false,
          portal_mostrar_condicion: data.portal_mostrar_condicion !== false,
          portal_mostrar_info_academica: data.portal_mostrar_info_academica !== false,
          portal_mostrar_aranceles: Boolean(data.portal_mostrar_aranceles),
          mostrar_parciales: (data.mostrar_parciales ?? localPortalOverride.mostrar_parciales) !== false,
          mostrar_tps: (data.mostrar_tps ?? localPortalOverride.mostrar_tps) !== false,
          mostrar_promedio: (data.mostrar_promedio ?? localPortalOverride.mostrar_promedio) !== false,
          eval_considerar_asistencia: (data.eval_considerar_asistencia ?? localPortalOverride.eval_considerar_asistencia) !== false,
          eval_considerar_parciales: (data.eval_considerar_parciales ?? localPortalOverride.eval_considerar_parciales) !== false,
          eval_considerar_tps: (data.eval_considerar_tps ?? localPortalOverride.eval_considerar_tps) !== false,
          nota_regularidad: Number(data.nota_regularidad ?? data.ram_nota_regular ?? localPortalOverride.nota_regularidad ?? 4),
          nota_promocion: Number(data.nota_promocion ?? data.ram_nota_promocion ?? localPortalOverride.nota_promocion ?? 7),
          ram_asistencia_regular: Number(data.ram_asistencia_regular ?? localPortalOverride.ram_asistencia_regular ?? 70),
          ram_asistencia_trabajo: Number(data.ram_asistencia_trabajo ?? localPortalOverride.ram_asistencia_trabajo ?? 60),
          porcentaje_tps_regular: Number(data.porcentaje_tps_regular ?? localPortalOverride.porcentaje_tps_regular ?? 80),
          porcentaje_tps_promocion: Number(data.porcentaje_tps_promocion ?? localPortalOverride.porcentaje_tps_promocion ?? 100)
        };
      }
    } catch (err) {
      console.warn('Error al consultar configuración del portal en Supabase:', err);
    }
  }

  // 2. Fallback / Modo Demo desde LocalStorage
  try {
    const savedCatedras = JSON.parse(localStorage.getItem('demo_catedras') || '[]');
    let cat = savedCatedras.find(c => 
      c.id === inputIdentifier || 
      c.alias === inputIdentifier || 
      slugifyCatedra(c.nombre) === inputIdentifier
    );

    let resolvedId = cat?.id || inputIdentifier;
    let localPortalConfig = null;

    // Buscar en portal_config_ por ID resuelto o explorar todas las claves
    const savedConfig = localStorage.getItem(`portal_config_${resolvedId}`);
    if (savedConfig) {
      localPortalConfig = JSON.parse(savedConfig);
    } else {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('portal_config_')) {
          try {
            const parsed = JSON.parse(localStorage.getItem(key));
            if (
              parsed?.alias === inputIdentifier || 
              slugifyCatedra(parsed?.nombre) === inputIdentifier
            ) {
              localPortalConfig = parsed;
              resolvedId = key.replace('portal_config_', '');
              if (!cat) {
                cat = savedCatedras.find(c => c.id === resolvedId) || { id: resolvedId, ...parsed };
              }
              break;
            }
          } catch (_) {}
        }
      }
    }

    if (cat || localPortalConfig) {
      const nombre = cat?.nombre || localPortalConfig?.nombre || 'Cátedra';
      let localCrit = {};
      try {
        const rawCrit = localStorage.getItem(`criterios_${resolvedId}`);
        if (rawCrit) localCrit = JSON.parse(rawCrit) || {};
      } catch (_) {}

      return {
        id: resolvedId,
        nombre,
        alias: cat?.alias || localPortalConfig?.alias || slugifyCatedra(nombre),
        nivel: cat?.nivel || localPortalConfig?.nivel || 'TERCIARIO',
        modalidad: cat?.modalidad || localPortalConfig?.modalidad || localCrit?.regimen_cursada || 'ANUAL',
        institucion_nombre: cat?.institucion_nombre || localPortalConfig?.institucion_nombre || 'I.S.F.T. N° 179',
        portal_activo: localPortalConfig?.portal_activo ?? cat?.portal_activo ?? false,
        portal_mostrar_asistencia: localPortalConfig?.portal_mostrar_asistencia ?? cat?.portal_mostrar_asistencia ?? true,
        portal_mostrar_notas: localPortalConfig?.portal_mostrar_notas ?? cat?.portal_mostrar_notas ?? true,
        portal_mostrar_condicion: localPortalConfig?.portal_mostrar_condicion ?? cat?.portal_mostrar_condicion ?? true,
        portal_mostrar_info_academica: localPortalConfig?.portal_mostrar_info_academica ?? cat?.portal_mostrar_info_academica ?? true,
        portal_mostrar_aranceles: localPortalConfig?.portal_mostrar_aranceles ?? cat?.portal_mostrar_aranceles ?? false,
        mostrar_parciales: (localPortalConfig?.mostrar_parciales ?? cat?.mostrar_parciales) !== false,
        mostrar_tps: (localPortalConfig?.mostrar_tps ?? cat?.mostrar_tps) !== false,
        mostrar_promedio: (localPortalConfig?.mostrar_promedio ?? cat?.mostrar_promedio) !== false,
        eval_considerar_asistencia: (localCrit?.eval_considerar_asistencia ?? localPortalConfig?.eval_considerar_asistencia ?? cat?.eval_considerar_asistencia) !== false,
        eval_considerar_parciales: (localCrit?.eval_considerar_parciales ?? localPortalConfig?.eval_considerar_parciales ?? cat?.eval_considerar_parciales) !== false,
        eval_considerar_tps: (localCrit?.eval_considerar_tps ?? localPortalConfig?.eval_considerar_tps ?? cat?.eval_considerar_tps) !== false,
        nota_regularidad: Number(localCrit?.nota_regularidad ?? localCrit?.nota_min_reg ?? cat?.nota_regularidad ?? 4),
        nota_promocion: Number(localCrit?.nota_promocion ?? localCrit?.nota_min_promo ?? cat?.nota_promocion ?? 7),
        ram_asistencia_regular: Number(localCrit?.ram_asistencia_regular ?? localCrit?.min_asist_reg ?? cat?.ram_asistencia_regular ?? 70),
        ram_asistencia_trabajo: Number(localCrit?.ram_asistencia_trabajo ?? localCrit?.min_asist_trabajo ?? cat?.ram_asistencia_trabajo ?? 60),
        porcentaje_tps_regular: Number(localCrit?.porcentaje_tps_regular ?? cat?.porcentaje_tps_regular ?? 80),
        porcentaje_tps_promocion: Number(localCrit?.porcentaje_tps_promocion ?? cat?.porcentaje_tps_promocion ?? 100)
      };
    }

    return null;
  } catch (_) {
    return null;
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
    portal_mostrar_condicion: Boolean(config.portal_mostrar_condicion),
    portal_mostrar_info_academica: Boolean(config.portal_mostrar_info_academica),
    portal_mostrar_aranceles: Boolean(config.portal_mostrar_aranceles)
  };

  const aliasVal = config.alias ? slugifyCatedra(config.alias) : undefined;

  // 1. Guardar en LocalStorage (Siempre como caché / respaldo inmediato)
  try {
    localStorage.setItem(`portal_config_${catedraId}`, JSON.stringify({
      ...config,
      ...payload,
      ...(aliasVal ? { alias: aliasVal } : {})
    }));

    const storedCats = JSON.parse(localStorage.getItem('demo_catedras') || '[]');
    const updatedCats = storedCats.map(c => c.id === catedraId ? { 
      ...c, 
      ...payload,
      ...(aliasVal ? { alias: aliasVal } : {})
    } : c);
    localStorage.setItem('demo_catedras', JSON.stringify(updatedCats));
  } catch (e) {
    console.warn('No se pudo guardar la configuración en localStorage:', e);
  }

  // 2. Si Supabase está conectado, actualizar la tabla 'catedras'
  if (isSupabaseConfigured && !isDemo) {
    try {
      const updatePayload = {
        ...payload,
        ...(aliasVal ? { alias: aliasVal } : {})
      };
      const { error } = await supabase
        .from('catedras')
        .update(updatePayload)
        .eq('id', catedraId);

      if (error) {
        // Fallback 1: Si falló por nuevas columnas o 'alias', intentar con columnas base + alias
        const basePayload = {
          portal_activo: payload.portal_activo,
          portal_mostrar_asistencia: payload.portal_mostrar_asistencia,
          portal_mostrar_notas: payload.portal_mostrar_notas,
          portal_mostrar_condicion: payload.portal_mostrar_condicion,
          ...(aliasVal ? { alias: aliasVal } : {})
        };
        const { error: retryErr } = await supabase
          .from('catedras')
          .update(basePayload)
          .eq('id', catedraId);

        if (retryErr) {
          // Fallback 2: Solo columnas históricas seguras
          await supabase
            .from('catedras')
            .update({
              portal_activo: payload.portal_activo,
              portal_mostrar_asistencia: payload.portal_mostrar_asistencia,
              portal_mostrar_notas: payload.portal_mostrar_notas,
              portal_mostrar_condicion: payload.portal_mostrar_condicion
            })
            .eq('id', catedraId);
        }
      }
    } catch (err) {
      console.warn('Aviso: Error al persistir configuración en Supabase. Se mantuvo en localStorage:', err);
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

  // Resolver ID real si catedraId es un slug o alias
  let resolvedCatedraId = catedraId;
  let resolvedConfig = null;
  if (!isUuid(catedraId)) {
    resolvedConfig = await getCatedraPortalConfig(catedraId, isDemo);
    if (resolvedConfig?.id) {
      resolvedCatedraId = resolvedConfig.id;
    }
  }

  // 1. Si Supabase está activo y no es demo, intentar RPC primero
  if (isSupabaseConfigured && !isDemo) {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('consultar_estado_alumno', {
        p_catedra_id: resolvedCatedraId,
        p_dni: cleanDni
      });

      if (!rpcError && rpcData) {
        if (rpcData.success) {
          const portalCfg = resolvedConfig || await getCatedraPortalConfig(resolvedCatedraId, isDemo);
          rpcData.config = {
            ...(rpcData.config || {}),
            mostrar_parciales: (rpcData.config?.mostrar_parciales ?? portalCfg?.mostrar_parciales) !== false,
            mostrar_tps: (rpcData.config?.mostrar_tps ?? portalCfg?.mostrar_tps) !== false,
            mostrar_promedio: (rpcData.config?.mostrar_promedio ?? portalCfg?.mostrar_promedio) !== false
          };

          const nivel = rpcData.catedra?.nivel || portalCfg?.nivel || 'TERCIARIO';
          const mod = rpcData.catedra?.modalidad || portalCfg?.modalidad || 'ANUAL';
          const asistPct = rpcData.asistencia?.porcentaje ?? 100;
          const evals = rpcData.evaluaciones || [];
          const notas = evals.filter(e => e.valor !== null && e.valor !== undefined || e.estado || e.detalle_recuperatorio);
          const mergedCriterios = {
            eval_considerar_asistencia: portalCfg?.eval_considerar_asistencia !== false,
            eval_considerar_parciales: portalCfg?.eval_considerar_parciales !== false,
            eval_considerar_tps: portalCfg?.eval_considerar_tps !== false,
            nota_regularidad: portalCfg?.nota_regularidad ?? 4,
            nota_promocion: portalCfg?.nota_promocion ?? 7,
            ram_asistencia_regular: portalCfg?.ram_asistencia_regular ?? 70,
            ram_asistencia_trabajo: portalCfg?.ram_asistencia_trabajo ?? 60,
            porcentaje_tps_regular: portalCfg?.porcentaje_tps_regular ?? 80,
            porcentaje_tps_promocion: portalCfg?.porcentaje_tps_promocion ?? 100
          };

          const condAuto = calcularCondicionFinal(nivel, mod, asistPct, evals, notas, mergedCriterios, rpcData.estudiante || {});
          const { condicion_manual, motivo_condicion_manual } = resolveStudentManualOverride(catedraId, resolvedCatedraId, rpcData.estudiante);

          if (rpcData.config?.portal_mostrar_condicion) {
            rpcData.condicion_ram = condicion_manual
              ? buildManualCondicionRam(condicion_manual, motivo_condicion_manual, condAuto)
              : (rpcData.condicion_ram || condAuto);
          }

          if (rpcData.estudiante) {
            rpcData.estudiante.condicion_manual = condicion_manual || null;
            rpcData.estudiante.motivo_condicion_manual = motivo_condicion_manual || null;
          }

          rpcData.promedio = calcularPromedioGeneral(evals, notas);
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
  const portalConfig = resolvedConfig || await getCatedraPortalConfig(resolvedCatedraId, isDemo);
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

  // Cargar estudiantes de la cátedra de manera resiliente
  let studentList = [];
  try {
    studentList = await getEstudiantesCatedra(resolvedCatedraId, { supabase, isDemo });
  } catch (_) {
    try {
      const stored = localStorage.getItem(`estudiantes_${resolvedCatedraId}`) || localStorage.getItem(`estudiantes_${catedraId}`);
      if (stored) {
        studentList = JSON.parse(stored);
      }
    } catch (_) {}
  }

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
    min_asist_reg: portalConfig.ram_asistencia_regular ?? 70,
    min_asist_trabajo: portalConfig.ram_asistencia_trabajo ?? 60,
    ram_asistencia_regular: portalConfig.ram_asistencia_regular ?? 70,
    ram_asistencia_trabajo: portalConfig.ram_asistencia_trabajo ?? 60,
    nota_min_promo: portalConfig.nota_promocion ?? 7,
    nota_min_reg: portalConfig.nota_regularidad ?? 4,
    nota_promocion: portalConfig.nota_promocion ?? 7,
    nota_regularidad: portalConfig.nota_regularidad ?? 4,
    nota_min_sec: 6,
    eval_considerar_asistencia: portalConfig.eval_considerar_asistencia !== false,
    eval_considerar_parciales: portalConfig.eval_considerar_parciales !== false,
    eval_considerar_tps: portalConfig.eval_considerar_tps !== false,
    porcentaje_tps_regular: portalConfig.porcentaje_tps_regular ?? 80,
    porcentaje_tps_promocion: portalConfig.porcentaje_tps_promocion ?? 100
  };

  try {
    const stClases = localStorage.getItem(`clases_${resolvedCatedraId}`) || localStorage.getItem(`clases_${catedraId}`);
    if (stClases) clases = JSON.parse(stClases);

    const stAsist = localStorage.getItem(`asistencias_${resolvedCatedraId}`) || localStorage.getItem(`asistencias_${catedraId}`);
    if (stAsist) asistencias = JSON.parse(stAsist);

    const stInasist = localStorage.getItem(`inasistencias_docente_${resolvedCatedraId}`) || localStorage.getItem(`inasistencias_docente_${catedraId}`);
    if (stInasist) inasistenciasDocente = JSON.parse(stInasist);

    const stEval = localStorage.getItem(`evaluaciones_${resolvedCatedraId}`) || localStorage.getItem(`evaluaciones_${catedraId}`);
    if (stEval) evaluaciones = JSON.parse(stEval);

    const stNotas = localStorage.getItem(`notas_${resolvedCatedraId}`) || localStorage.getItem(`notas_${catedraId}`);
    if (stNotas) notas = JSON.parse(stNotas);

    const stCrit = localStorage.getItem(`criterios_${resolvedCatedraId}`) || localStorage.getItem(`criterios_${catedraId}`);
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
    const numValor = notaRecord?.valor !== undefined && notaRecord?.valor !== null ? Number(notaRecord.valor) : null;
    const numNota = notaRecord?.nota !== undefined && notaRecord?.nota !== null ? Number(notaRecord.nota) : numValor;
    return {
      id: ev.id,
      evaluacion_id: ev.id,
      titulo: ev.titulo,
      tipo: ev.tipo,
      fecha_entrega: ev.fecha_entrega || null,
      archivo_url: ev.archivo_url || ev.link_consigna || null,
      archivo_nombre: ev.archivo_nombre || null,
      link_consigna: ev.link_consigna || ev.archivo_url || null,
      valor: numValor,
      nota: numNota,
      estado: notaRecord?.estado || null,
      detalle_recuperatorio: notaRecord?.detalle_recuperatorio || null,
      observaciones: notaRecord?.observaciones || null
    };
  });

  // 3. Cálculo de Condición RAM
  const studentNotasForLogic = studentEvaluaciones
    .filter(e => e.valor !== null || e.estado || e.detalle_recuperatorio)
    .map(e => ({ 
      evaluacion_id: e.id, 
      valor: e.valor, 
      nota: e.nota, 
      estado: e.estado, 
      tipo: e.tipo,
      detalle_recuperatorio: e.detalle_recuperatorio,
      observaciones: e.observaciones
    }));

  const condicionCalculada = student.es_equivalencia 
    ? {
        condicion: 'ACREDITADA_EQUIVALENCIA',
        badgeVariant: 'promo',
        color: 'text-emerald-700 dark:text-emerald-400',
        motivo: `Materia acreditada por equivalencia reglamentaria${student.resolucion_equivalencia ? ` (${student.resolucion_equivalencia})` : ''}. No requiere cursado ni asistencia.`,
        resolucion: student.resolucion_equivalencia || null,
        fecha_resolucion: student.fecha_equivalencia || null
      }
    : calcularCondicionFinal(
        portalConfig.nivel,
        criterios.regimen_cursada || portalConfig.modalidad,
        asistenciaPct,
        evaluaciones,
        studentNotasForLogic,
        criterios,
        student
      );

  // Verificar override manual del docente si existe (inscripcion.condicion_manual || condicionAutomatica)
  const { condicion_manual, motivo_condicion_manual } = resolveStudentManualOverride(catedraId, resolvedCatedraId, student);
  let finalCondicion = condicionCalculada;
  if (!student.es_equivalencia && condicion_manual && condicion_manual !== 'AUTO') {
    finalCondicion = buildManualCondicionRam(condicion_manual, motivo_condicion_manual, condicionCalculada);
  }

  const promedioGeneral = calcularPromedioGeneral(evaluaciones, studentNotasForLogic);

  // Estructura de respuesta
  return {
    success: true,
    catedra: {
      id: portalConfig.id,
      nombre: portalConfig.nombre,
      nivel: portalConfig.nivel,
      modalidad: criterios.regimen_cursada || portalConfig.modalidad,
      institucion_nombre: portalConfig.institucion_nombre
    },
    estudiante: {
      id: student.id,
      dni: student.dni,
      apellido: student.apellido,
      nombre: student.nombre,
      es_equivalencia: Boolean(student.es_equivalencia),
      tiene_certificado_trabajo: Boolean(student.tiene_certificado_trabajo),
      resolucion_equivalencia: student.resolucion_equivalencia || null,
      fecha_equivalencia: student.fecha_equivalencia || null,
      condicion_manual: condicion_manual || null,
      motivo_condicion_manual: motivo_condicion_manual || null
    },
    config: {
      portal_mostrar_asistencia: portalConfig.portal_mostrar_asistencia,
      portal_mostrar_notas: portalConfig.portal_mostrar_notas,
      portal_mostrar_condicion: portalConfig.portal_mostrar_condicion,
      mostrar_parciales: portalConfig.mostrar_parciales !== false,
      mostrar_tps: portalConfig.mostrar_tps !== false,
      mostrar_promedio: portalConfig.mostrar_promedio !== false
    },
    asistencia: portalConfig.portal_mostrar_asistencia ? {
      total_clases: totalClasesEfectivas,
      presentes,
      ausentes,
      porcentaje: asistenciaPct,
      min_asist_reg: student.tiene_certificado_trabajo ? (criterios.ram_asistencia_trabajo ?? criterios.min_asist_trabajo ?? 60) : (criterios.ram_asistencia_regular ?? criterios.min_asist_reg ?? 70),
      min_asist_trabajo: criterios.ram_asistencia_trabajo ?? criterios.min_asist_trabajo ?? 60,
      min_asist_promo: criterios.min_asist_promo ?? 80,
      tiene_certificado_trabajo: Boolean(student.tiene_certificado_trabajo),
      es_equivalencia: Boolean(student.es_equivalencia)
    } : null,
    evaluaciones: portalConfig.portal_mostrar_notas ? studentEvaluaciones : null,
    promedio: portalConfig.portal_mostrar_notas ? promedioGeneral : null,
    condicion_ram: portalConfig.portal_mostrar_condicion ? finalCondicion : null,
    condicion_automatica: condicionCalculada
  };
}
