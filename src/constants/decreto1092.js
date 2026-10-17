/**
 * Catálogo Oficial Completo del Régimen de Licencias, Justificaciones y Franquicias
 * para el Personal Docente de Catamarca - Decreto Acuerdo N° 1092/2015 (Anexo I).
 *
 * Clasificado en 3 modalidades de límite:
 * - 'CON_TOPE': Cupo anual o mensual taxativo con descuento de saldo.
 * - 'POR_EVENTO': Límite individual por acontecimiento sin tope anual prefijado.
 * - 'SIN_LIMITE': Sin tope anual ni mensual; justificado por constancia o resolución.
 *
 * Parámetros de duración y cálculo de finalización:
 * - diasFijosPorEvento: Número fijo de días fijado por el decreto (o null si es variable)
 * - requiereIngresarDias: Boolean que indica si el docente debe especificar los días otorgados
 */

export const CATALOGO_DECRETO_1092 = [
  // --- CAPÍTULO VI: JUSTIFICACIÓN DE INASISTENCIAS (USO FRECUENTE) ---
  {
    codigo: 'ART_52',
    label: 'Art. 52° - Razones particulares o especiales',
    capitulo: 'Cap. VI - Justificación de Inasistencias',
    modoLimite: 'CON_TOPE',
    topeAnual: 5,
    topeMensual: 2,
    topePorEvento: 2,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'días hábiles',
    tipoComputo: 'HABILES',
    conGoce: true,
    descripcion: 'Hasta 5 días hábiles al año y máximo 2 días por mes (solicitar con 24 hs de anticipación).'
  },
  {
    codigo: 'ART_53_54_A',
    label: 'Art. 53° y 54° inc. a) - Superposición horaria: Tribunal Examinador',
    capitulo: 'Cap. VI - Justificación de Inasistencias',
    modoLimite: 'SIN_LIMITE',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: null,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'según superposición horaria',
    tipoComputo: 'HABILES',
    conGoce: true,
    descripcion: 'Sin límite anual ni mensual fijo. Se justifica con constancia oficial cada vez que integrás mesas examinadoras.'
  },
  {
    codigo: 'ART_53_54_BYF',
    label: 'Art. 53° y 54° inc. b-f) - Superposición horaria: Actos, Reuniones o Clases',
    capitulo: 'Cap. VI - Justificación de Inasistencias',
    modoLimite: 'SIN_LIMITE',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: null,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'según superposición horaria',
    tipoComputo: 'HABILES',
    conGoce: true,
    descripcion: 'Sin límite anual ni mensual fijo. Cubre actos celebratorios, reuniones citadas por superioridad o extensión de servicios.'
  },
  {
    codigo: 'ART_56_A',
    label: 'Art. 56° inc. a) - Comisión de servicios: Salidas didácticas / Viajes con alumnos',
    capitulo: 'Cap. VI - Justificación de Inasistencias',
    modoLimite: 'SIN_LIMITE',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: null,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'según autorización de Nivel',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: 'Sin límite anual ni mensual. No se computan inasistencias al acompañar alumnos en excursiones o actividades educativas autorizadas.'
  },
  {
    codigo: 'ART_56_B',
    label: 'Art. 56° inc. b) - Comisión de servicios: Misión oficial del Ministerio',
    capitulo: 'Cap. VI - Justificación de Inasistencias',
    modoLimite: 'SIN_LIMITE',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: null,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'según designación oficial',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: 'Sin límite anual ni mensual. Comisión o misión oficial emanada del Ministerio de Educación, Ciencia y Tecnología.'
  },
  {
    codigo: 'ART_49',
    label: 'Art. 49° - Razones extraordinarias (Fenómenos meteorológicos / Fuerza mayor)',
    capitulo: 'Cap. VI - Justificación de Inasistencias',
    modoLimite: 'SIN_LIMITE',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: null,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'según ocurrencia comprobada',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: 'Sin límite anual ni mensual. Justifica inasistencias por fenómenos climáticos o fuerza mayor debidamente comprobados.'
  },
  {
    codigo: 'ART_50',
    label: 'Art. 50° - Donación de sangre',
    capitulo: 'Cap. VI - Justificación de Inasistencias',
    modoLimite: 'POR_EVENTO',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: 1,
    diasFijosPorEvento: 1,
    requiereIngresarDias: false,
    unidad: 'día por donación',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: '1 día justificado por cada donación presentando comprobante (no se computa para calificación anual).'
  },
  {
    codigo: 'ART_51',
    label: 'Art. 51° - Donación de órganos',
    capitulo: 'Cap. VI - Justificación de Inasistencias',
    modoLimite: 'SIN_LIMITE',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: null,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'según dictamen de Junta Médica',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: 'Sin tope preestablecido: la duración es determinada por la Junta Médica Idónea y Reconocimiento Médico.'
  },
  {
    codigo: 'ART_48_A',
    label: 'Art. 48° inc. a) - Fallecimiento de cónyuge, padres o hijos',
    capitulo: 'Cap. VI - Justificación de Inasistencias',
    modoLimite: 'POR_EVENTO',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: 10,
    diasFijosPorEvento: 10,
    requiereIngresarDias: false,
    unidad: 'días por fallecimiento',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: '10 días por evento (sin límite anual de ocurrencias ni requisito de antigüedad).'
  },
  {
    codigo: 'ART_48_B',
    label: 'Art. 48° inc. b) - Fallecimiento de hermanos, abuelos, nietos, suegros (2° grado y afines)',
    capitulo: 'Cap. VI - Justificación de Inasistencias',
    modoLimite: 'POR_EVENTO',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: 5,
    diasFijosPorEvento: 5,
    requiereIngresarDias: false,
    unidad: 'días por fallecimiento',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: '5 días por fallecimiento de parientes de 2° grado, afines o personas a cargo.'
  },
  {
    codigo: 'ART_48_C',
    label: 'Art. 48° inc. c) - Fallecimiento de tíos, primos, sobrinos (3° y 4° grado)',
    capitulo: 'Cap. VI - Justificación de Inasistencias',
    modoLimite: 'POR_EVENTO',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: 1,
    diasFijosPorEvento: 1,
    requiereIngresarDias: false,
    unidad: 'día (el del sepelio)',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: '1 día (el día del sepelio) por fallecimiento de parientes de 3° y 4° grado.'
  },
  {
    codigo: 'ART_55',
    label: 'Art. 55° - Festividades religiosas (Credos no católicos reconocidos)',
    capitulo: 'Cap. VI - Justificación de Inasistencias',
    modoLimite: 'CON_TOPE',
    topeAnual: 5,
    topeMensual: null,
    topePorEvento: null,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'días anuales',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: 'Hasta 5 días anuales presentando certificado de la autoridad religiosa.'
  },

  // --- CAPÍTULO IV: LICENCIAS ESPECIALES POR SALUD Y RAZONES FAMILIARES ---
  {
    codigo: 'ART_16',
    label: 'Art. 16° - Afecciones de corto tratamiento (Salud)',
    capitulo: 'Cap. IV - Salud y Razones Familiares',
    modoLimite: 'CON_TOPE',
    topeAnual: 25,
    topeMensual: null,
    topePorEvento: null,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'días corridos',
    tipoComputo: 'CORRIDOS',
    grupoCupo: 'CORTO_TRATAMIENTO',
    conGoce: true,
    descripcion: 'Hasta 25 días corridos por año calendario (continuos o discontinuos) con goce íntegro de haberes. El docente ingresa los días que le otorgó el médico.'
  },
  {
    codigo: 'ART_18',
    label: 'Art. 18° - Enfermedades en hora de labor (Retiro del servicio)',
    capitulo: 'Cap. IV - Salud y Razones Familiares',
    modoLimite: 'CON_TOPE',
    topeAnual: 25,
    topeMensual: null,
    topePorEvento: 1,
    diasFijosPorEvento: 1,
    requiereIngresarDias: false,
    unidad: 'días corridos (imputa al Art. 16°)',
    tipoComputo: 'CORRIDOS',
    grupoCupo: 'CORTO_TRATAMIENTO',
    conGoce: true,
    descripcion: 'Retiro por enfermedad con certificado de Guardia o SAME (1 día por retiro, se descuenta de los 25 días del Art. 16°).'
  },
  {
    codigo: 'ART_19',
    label: 'Art. 19° - Accidente de trabajo o enfermedad profesional (ART / Autoseguro)',
    capitulo: 'Cap. IV - Salud y Razones Familiares',
    modoLimite: 'SIN_LIMITE',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: null,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'según alta médica / Ley 24.557',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: 'Sin tope anual fijo en días. Se rige por el Decreto Acuerdo N° 872/1996 y la Ley de Riesgos del Trabajo N° 24.557.'
  },
  {
    codigo: 'ART_20',
    label: 'Art. 20° - Enfermedades de largo tratamiento',
    capitulo: 'Cap. IV - Salud y Razones Familiares',
    modoLimite: 'CON_TOPE',
    topeAnual: 365,
    topeMensual: null,
    topePorEvento: null,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'días corridos',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: 'Hasta 1 año con 100% de haberes, 6 meses más al 50% y 6 meses sin goce de haberes (por Junta Médica).'
  },
  {
    codigo: 'ART_24_25',
    label: 'Art. 24° y 25° - Cambio de Funciones (CFT / CFD) o Incapacidad',
    capitulo: 'Cap. IV - Salud y Razones Familiares',
    modoLimite: 'SIN_LIMITE',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: null,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'según Junta Médica (CFT 1 año extensible)',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: 'Otorgado por Junta Médica con control bimestral (CFT) o anual (CFD), o hasta obtener beneficio jubilatorio.'
  },
  {
    codigo: 'ART_26',
    label: 'Art. 26° - Violencia de género',
    capitulo: 'Cap. IV - Salud y Razones Familiares',
    modoLimite: 'SIN_LIMITE',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: null,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'según evaluación de servicios de asistencia',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: 'Sin límite prefijado de días. Sujeto a la certificación y evaluación de los servicios de atención y asistencia.'
  },
  {
    codigo: 'ART_27',
    label: 'Art. 27° - Maternidad (General, prematuro o múltiple)',
    capitulo: 'Cap. IV - Salud y Razones Familiares',
    modoLimite: 'POR_EVENTO',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: 120,
    diasFijosPorEvento: 120,
    requiereIngresarDias: false,
    unidad: 'días corridos (135 prematuro / +10 múltiple)',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: 'Hasta 120 días corridos por embarazo/parto (135 en prematuro, +10 por cada alumbramiento múltiple).'
  },
  {
    codigo: 'ART_28',
    label: 'Art. 28° - Atención de hijos menores (hasta 10 años por fallecimiento de cónyuge)',
    capitulo: 'Cap. IV - Salud y Razones Familiares',
    modoLimite: 'POR_EVENTO',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: 30,
    diasFijosPorEvento: 30,
    requiereIngresarDias: false,
    unidad: 'días corridos por evento',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: '30 días corridos por evento, sin perjuicio de la licencia correspondiente por duelo.'
  },
  {
    codigo: 'ART_29',
    label: 'Art. 29° - Tenencia con fines de adopción (niños de hasta 7 años)',
    capitulo: 'Cap. IV - Salud y Razones Familiares',
    modoLimite: 'POR_EVENTO',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: 60,
    diasFijosPorEvento: 60,
    requiereIngresarDias: false,
    unidad: 'días corridos por evento',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: '60 días corridos a partir del día hábil siguiente a la presentación judicial o administrativa.'
  },
  {
    codigo: 'ART_30_GOCE',
    label: 'Art. 30° - Atención de grupo familiar enfermo (Con goce de haberes)',
    capitulo: 'Cap. IV - Salud y Razones Familiares',
    modoLimite: 'CON_TOPE',
    topeAnual: 15,
    topeMensual: null,
    topePorEvento: null,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'días corridos',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: 'Hasta 15 días corridos por año calendario con goce de haberes (continuos o discontinuos).'
  },
  {
    codigo: 'ART_30_SINGOCE',
    label: 'Art. 30° - Atención de grupo familiar enfermo (Prórroga sin goce)',
    capitulo: 'Cap. IV - Salud y Razones Familiares',
    modoLimite: 'CON_TOPE',
    topeAnual: 45,
    topeMensual: null,
    topePorEvento: null,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'días corridos sin goce',
    tipoComputo: 'CORRIDOS',
    conGoce: false,
    descripcion: 'Hasta 45 días corridos adicionales en el año sin goce de haberes (ampliable excepcionalmente).'
  },
  {
    codigo: 'ART_31',
    label: 'Art. 31° - Matrimonio del docente (+1 día prenupcial)',
    capitulo: 'Cap. IV - Salud y Razones Familiares',
    modoLimite: 'POR_EVENTO',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: 15,
    diasFijosPorEvento: 15,
    requiereIngresarDias: false,
    unidad: 'días corridos (15 + 1 prenupcial)',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: '15 días corridos continuados por matrimonio más 1 día de permiso para el examen médico prenupcial.'
  },
  {
    codigo: 'ART_32',
    label: 'Art. 32° - Por aislamiento (Epidemia o Pandemia declarada)',
    capitulo: 'Cap. IV - Salud y Razones Familiares',
    modoLimite: 'CON_TOPE',
    topeAnual: 40,
    topeMensual: null,
    topePorEvento: 40,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'días corridos',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: '40 días corridos continuos por año calendario ante declaración administrativa provincial.'
  },
  {
    codigo: 'ART_33',
    label: 'Art. 33° - Atención de persona disfuncionada (Ley N° 4793)',
    capitulo: 'Cap. IV - Salud y Razones Familiares',
    modoLimite: 'SIN_LIMITE',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: null,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'según Ley Provincial N° 4793',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: 'Sin tope fijo en el decreto; se aplica íntegramente el régimen especial de la Ley N° 4793.'
  },

  // --- CAPÍTULO V: LICENCIAS EXTRAORDINARIAS ---
  {
    codigo: 'ART_35',
    label: 'Art. 35° - Para rendir exámenes finales (Superior, Universitario o Postgrado)',
    capitulo: 'Cap. V - Licencias Extraordinarias',
    modoLimite: 'CON_TOPE',
    topeAnual: 30,
    topeMensual: null,
    topePorEvento: 5,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'días laborables',
    tipoComputo: 'HABILES',
    conGoce: true,
    descripcion: 'Hasta 30 días anuales laborables por año calendario y hasta 5 días por cada examen.'
  },
  {
    codigo: 'ART_36',
    label: 'Art. 36° - Prácticas obligatorias de estudio (Superposición horaria)',
    capitulo: 'Cap. V - Licencias Extraordinarias',
    modoLimite: 'CON_TOPE',
    topeAnual: 15,
    topeMensual: null,
    topePorEvento: 5,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'días laborables',
    tipoComputo: 'HABILES',
    conGoce: true,
    descripcion: 'Hasta 15 días anuales laborables (máximo 5 días laborables por vez).'
  },
  {
    codigo: 'ART_37',
    label: 'Art. 37° - Estudios e investigaciones de post-grado',
    capitulo: 'Cap. V - Licencias Extraordinarias',
    modoLimite: 'SIN_LIMITE',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: 365,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: '1 año (prorrogable por 1 año más)',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: '1 año con prórroga de 1 año más para estudios o investigaciones científicas/técnicas.'
  },
  {
    codigo: 'ART_38',
    label: 'Art. 38° - Actividades de interés educativo, científico, cultural y tecnológico',
    capitulo: 'Cap. V - Licencias Extraordinarias',
    modoLimite: 'SIN_LIMITE',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: null,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'por el período del evento oficial',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: 'Sin límite anual ni mensual fijo. Se otorga por el período que involucre la participación oficial.'
  },
  {
    codigo: 'ART_39',
    label: 'Art. 39° - Actividades deportivas no rentadas (Representación oficial)',
    capitulo: 'Cap. V - Licencias Extraordinarias',
    modoLimite: 'SIN_LIMITE',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: null,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'por el período del evento deportivo',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: 'Sin límite anual ni mensual fijo. Por el período que involucre la participación directa del agente.'
  },
  {
    codigo: 'ART_40',
    label: 'Art. 40° - Representación gremial (Cargos electivos / Cuerpos orgánicos)',
    capitulo: 'Cap. V - Licencias Extraordinarias',
    modoLimite: 'SIN_LIMITE',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: null,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'por el término del mandato',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: 'Sin límite de días: dura por todo el término del mandato o representación gremial.'
  },
  {
    codigo: 'ART_41',
    label: 'Art. 41° - Capacitación y perfeccionamiento docente (Con auspicio oficial)',
    capitulo: 'Cap. V - Licencias Extraordinarias',
    modoLimite: 'CON_TOPE',
    topeAnual: 10,
    topeMensual: null,
    topePorEvento: null,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'días hábiles',
    tipoComputo: 'HABILES',
    conGoce: true,
    descripcion: '10 días hábiles anuales (continuos o discontinuos) comunicando con 5 días de anticipación.'
  },
  {
    codigo: 'ART_42_43_44',
    label: 'Art. 42°, 43° o 44° - Candidatura, Cargos Electivos o Mayor Jerarquía (Sin goce)',
    capitulo: 'Cap. V - Licencias Extraordinarias (Sin goce)',
    modoLimite: 'SIN_LIMITE',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: null,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'mientras dure la función o cargo',
    tipoComputo: 'CORRIDOS',
    conGoce: false,
    descripcion: 'Sin límite anual/mensual: se extiende por todo el período que dure la candidatura, mandato o designación.'
  },
  {
    codigo: 'ART_45_A',
    label: 'Art. 45° inc. a) - Asuntos particulares común (Sin goce de haberes)',
    capitulo: 'Cap. V - Licencias Extraordinarias (Sin goce)',
    modoLimite: 'CON_TOPE',
    topeAnual: 180,
    topeMensual: null,
    topePorEvento: 180,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'días (hasta 6 meses cada 10 años)',
    tipoComputo: 'CORRIDOS',
    conGoce: false,
    descripcion: 'Hasta completar 6 meses dentro de cada decenio (requiere 2 años de antigüedad ininterrumpida).'
  },
  {
    codigo: 'ART_45_B',
    label: 'Art. 45° inc. b) - Asuntos particulares especial: Emprendimientos mineros (Sin goce)',
    capitulo: 'Cap. V - Licencias Extraordinarias (Sin goce)',
    modoLimite: 'SIN_LIMITE',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: null,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'mientras dure relación de dependencia',
    tipoComputo: 'CORRIDOS',
    conGoce: false,
    descripcion: 'Sin límite anual/mensual fijo: vigente mientras dure el contrato con empleadores mineros en la provincia.'
  },
  {
    codigo: 'ART_46',
    label: 'Art. 46° - Para acompañar al cónyuge/concubino en misión oficial (Sin goce)',
    capitulo: 'Cap. V - Licencias Extraordinarias (Sin goce)',
    modoLimite: 'SIN_LIMITE',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: 730,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'hasta 2 años máximo',
    tipoComputo: 'CORRIDOS',
    conGoce: false,
    descripcion: 'Por misiones oficiales a más de 100 km mayores a 60 días (plazo máximo de hasta 2 años).'
  },

  // --- CAPÍTULO VII: FRANQUICIAS ---
  {
    codigo: 'ART_58',
    label: 'Art. 58° - Franquicia de horario para estudiantes',
    capitulo: 'Cap. VII - Franquicias',
    modoLimite: 'SIN_LIMITE',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: null,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'durante el período de cursado',
    tipoComputo: 'HABILES',
    conGoce: true,
    descripcion: 'Sin límite anual fijo. Permisos sujetos a reposición horaria o reducción de 2 hs diarias.'
  },
  {
    codigo: 'ART_59',
    label: 'Art. 59° - Reducción horaria por lactancia (1 hora diaria)',
    capitulo: 'Cap. VII - Franquicias',
    modoLimite: 'CON_TOPE',
    topeAnual: 360,
    topeMensual: null,
    topePorEvento: 360,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'días corridos desde el nacimiento',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: '1 hora diaria (o 2 descansos de 1/2 hora) durante 360 días corridos a partir del nacimiento.'
  },
  {
    codigo: 'ART_60',
    label: 'Art. 60° - Citaciones judiciales o trámites personales obligatorios',
    capitulo: 'Cap. VII - Franquicias',
    modoLimite: 'SIN_LIMITE',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: null,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'según citación o trámite obligatorio',
    tipoComputo: 'HABILES',
    conGoce: true,
    descripcion: 'Sin límite anual ni mensual fijo. Justifica el tiempo demandado presentando constancia dentro de los 2 días.'
  },
  {
    codigo: 'ART_61_A',
    label: 'Art. 61° (51°) inc. a) - Franquicia Gremial: Delegado Escolar (8 hs/mes)',
    capitulo: 'Cap. VII - Franquicias',
    modoLimite: 'CON_TOPE',
    topeAnual: null,
    topeMensual: 8,
    topePorEvento: null,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'horas mensuales no acumulativas',
    tipoComputo: 'HABILES',
    conGoce: true,
    descripcion: 'Hasta 8 horas mensuales no acumulativas previa solicitud sindical.'
  },
  {
    codigo: 'ART_61_B',
    label: 'Art. 61° (51°) inc. b) - Franquicia Gremial: Delegado Jurisdiccional',
    capitulo: 'Cap. VII - Franquicias',
    modoLimite: 'CON_TOPE',
    topeAnual: 24,
    topeMensual: 2,
    topePorEvento: 2,
    diasFijosPorEvento: null,
    requiereIngresarDias: true,
    unidad: 'días por mes',
    tipoComputo: 'HABILES',
    conGoce: true,
    descripcion: 'Hasta 2 días por cada mes para Delegados Jurisdiccionales.'
  },
  {
    codigo: 'ART_61_C',
    label: 'Art. 61° (51°) inc. c) - Franquicia Gremial: Congresales',
    capitulo: 'Cap. VII - Franquicias',
    modoLimite: 'POR_EVENTO',
    topeAnual: null,
    topeMensual: null,
    topePorEvento: 1,
    diasFijosPorEvento: 1,
    requiereIngresarDias: false,
    unidad: 'día por congreso',
    tipoComputo: 'HABILES',
    conGoce: true,
    descripcion: '1 día por cada realización/convocatoria de congreso sindical (sin tope anual fijo).'
  },

  // --- CAPÍTULO III: LICENCIA ANUAL ORDINARIA ---
  {
    codigo: 'ART_13_14',
    label: 'Art. 13° y 14° - Licencia anual ordinaria (Receso escolar)',
    capitulo: 'Cap. III - Licencia Anual Ordinaria',
    modoLimite: 'CON_TOPE',
    topeAnual: 35,
    topeMensual: null,
    topePorEvento: 35,
    diasFijosPorEvento: 35,
    requiereIngresarDias: false,
    unidad: 'días corridos',
    tipoComputo: 'CORRIDOS',
    conGoce: true,
    descripcion: '35 días corridos por año calendario vencido en simultáneo en todos los cargos.'
  }
];

/**
 * Obtiene un artículo del catálogo por su código oficial.
 */
export function getArticuloByCodigo(codigo) {
  if (!codigo) return null;
  const clean = String(codigo).trim().toUpperCase();
  return CATALOGO_DECRETO_1092.find(a => a.codigo === clean) || null;
}

/**
 * Busca de forma tolerante y retrocompatible un artículo por texto libre
 * (nomenclatura histórica, número de artículo o descripción).
 */
export function getArticuloByText(text) {
  if (!text) return null;
  const str = String(text).trim();

  // Búsqueda directa por código
  const directByCode = getArticuloByCodigo(str);
  if (directByCode) return directByCode;

  // Búsqueda exacta por etiqueta
  const exactByLabel = CATALOGO_DECRETO_1092.find(a => a.label.toLowerCase() === str.toLowerCase());
  if (exactByLabel) return exactByLabel;

  const low = str.toLowerCase();

  // Mapeos canónicos de equivalencia entre Decreto 1092 y jerga docente
  if (low.includes('art. 52') || low.includes('art. 15') || low.includes('art. 60') || low.includes('razones particulares')) {
    return getArticuloByCodigo('ART_52');
  }
  if (low.includes('art. 53') || low.includes('art. 54') || low.includes('mesa') || low.includes('tribunal examinador')) {
    return getArticuloByCodigo('ART_53_54_A');
  }
  if (low.includes('art. 16') || low.includes('art. 9') || (low.includes('corto tratamiento') && !low.includes('hora de labor'))) {
    return getArticuloByCodigo('ART_16');
  }
  if (low.includes('art. 18') || low.includes('hora de labor')) {
    return getArticuloByCodigo('ART_18');
  }
  if (low.includes('art. 19') || low.includes('accidente') || low.includes('art /')) {
    return getArticuloByCodigo('ART_19');
  }
  if (low.includes('art. 20') || low.includes('largo tratamiento')) {
    return getArticuloByCodigo('ART_20');
  }
  if (low.includes('art. 26') || low.includes('violencia de género') || low.includes('violencia de genero')) {
    return getArticuloByCodigo('ART_26');
  }
  if (low.includes('art. 27') || low.includes('maternidad')) {
    return getArticuloByCodigo('ART_27');
  }
  if (low.includes('art. 28') && (low.includes('menores') || low.includes('hijos'))) {
    return getArticuloByCodigo('ART_28');
  }
  if (low.includes('art. 29') && low.includes('adopción')) {
    return getArticuloByCodigo('ART_29');
  }
  if (low.includes('art. 30') || low.includes('art. 24') || low.includes('art. 22') || low.includes('familiar enfermo')) {
    return getArticuloByCodigo('ART_30_GOCE');
  }
  if (low.includes('art. 48') || low.includes('fallecimiento') || low.includes('duelo')) {
    if (low.includes('hermano') || low.includes('abuelo') || low.includes('nieto') || low.includes('2°')) return getArticuloByCodigo('ART_48_B');
    if (low.includes('tío') || low.includes('tio') || low.includes('primo') || low.includes('3°')) return getArticuloByCodigo('ART_48_C');
    return getArticuloByCodigo('ART_48_A');
  }
  if (low.includes('art. 49') || low.includes('art. 45') || low.includes('fuerza mayor') || low.includes('meteorológico') || low.includes('climático')) {
    return getArticuloByCodigo('ART_49');
  }
  if (low.includes('art. 50') || low.includes('sangre')) {
    return getArticuloByCodigo('ART_50');
  }
  if (low.includes('art. 51') || low.includes('órganos') || low.includes('organos')) {
    return getArticuloByCodigo('ART_51');
  }
  if (low.includes('art. 41') || low.includes('art. 28') || low.includes('art. 29') || low.includes('capacitación') || low.includes('perfeccionamiento')) {
    return getArticuloByCodigo('ART_41');
  }
  if (low.includes('art. 35') || low.includes('rendir exámenes') || low.includes('rendir examenes')) {
    return getArticuloByCodigo('ART_35');
  }
  if (low.includes('art. 36') || low.includes('prácticas obligatorias') || low.includes('practicas obligatorias')) {
    return getArticuloByCodigo('ART_36');
  }
  if (low.includes('art. 31') || low.includes('matrimonio')) {
    return getArticuloByCodigo('ART_31');
  }
  if (low.includes('art. 13') || low.includes('anual ordinaria') || low.includes('receso escolar')) {
    return getArticuloByCodigo('ART_13_14');
  }

  // Búsqueda parcial por prefijo de número
  const match = str.match(/Art\.?\s*(\d+)/i);
  if (match) {
    const num = match[1];
    const candidate = CATALOGO_DECRETO_1092.find(a => a.label.includes(`Art. ${num}°`) || a.codigo.includes(`ART_${num}`));
    if (candidate) return candidate;
  }

  return null;
}

/**
 * Agrupa los artículos del catálogo por Capítulo oficial para renderizar en <optgroup>.
 * @returns {Array<{ capitulo: string, articulos: Array }>}
 */
export function getArticulosAgrupadosPorCapitulo() {
  const groupsMap = new Map();

  for (const art of CATALOGO_DECRETO_1092) {
    const cap = art.capitulo || 'Otros';
    if (!groupsMap.has(cap)) {
      groupsMap.set(cap, []);
    }
    groupsMap.get(cap).push(art);
  }

  return Array.from(groupsMap.entries()).map(([capitulo, articulos]) => ({
    capitulo,
    articulos
  }));
}

/**
 * Calcula la fecha de finalización y fecha de reintegro de una licencia docente
 * según la cantidad de días y el tipo de cómputo (HABILES vs. CORRIDOS).
 *
 * @param {string} fechaInicioStr - Fecha de inicio (YYYY-MM-DD)
 * @param {number} cantidadDias - Cantidad de días de la licencia (>= 1)
 * @param {'HABILES'|'CORRIDOS'} [tipoComputo='CORRIDOS'] - Modalidad de cómputo
 * @returns {{ fechaFin: string, fechaReintegro: string, diasComputados: number }}
 */
export function calcularFechaFinLicencia(fechaInicioStr, cantidadDias = 1, tipoComputo = 'CORRIDOS') {
  if (!fechaInicioStr) {
    const today = new Date().toISOString().split('T')[0];
    return { fechaFin: today, fechaReintegro: today, diasComputados: 1 };
  }

  const dias = Math.max(1, parseInt(cantidadDias, 10) || 1);
  const parts = String(fechaInicioStr).split('T')[0].split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];

  const formatYMD = (dt) => {
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  if (tipoComputo === 'HABILES') {
    let current = new Date(y, m - 1, d);
    
    // Si la fecha de inicio es sábado o domingo, empezar a computar el primer día hábil siguiente
    while (current.getDay() === 0 || current.getDay() === 6) {
      current.setDate(current.getDate() + 1);
    }

    const effectiveStart = new Date(current);
    let diasContados = 0;
    let lastActiveDay = new Date(current);

    while (diasContados < dias) {
      if (current.getDay() !== 0 && current.getDay() !== 6) {
        diasContados++;
        lastActiveDay = new Date(current);
      }
      if (diasContados < dias) {
        current.setDate(current.getDate() + 1);
      }
    }

    // Fecha de reintegro: próximo día hábil posterior a lastActiveDay
    let reintegro = new Date(lastActiveDay);
    do {
      reintegro.setDate(reintegro.getDate() + 1);
    } while (reintegro.getDay() === 0 || reintegro.getDay() === 6);

    return {
      fechaInicio: formatYMD(effectiveStart),
      fechaFin: formatYMD(lastActiveDay),
      fechaReintegro: formatYMD(reintegro),
      diasComputados: dias
    };
  } else {
    // CORRIDOS (calendario corrido)
    const start = new Date(y, m - 1, d);
    const end = new Date(start);
    end.setDate(start.getDate() + (dias - 1));

    const reintegro = new Date(end);
    reintegro.setDate(end.getDate() + 1);

    return {
      fechaInicio: formatYMD(start),
      fechaFin: formatYMD(end),
      fechaReintegro: formatYMD(reintegro),
      diasComputados: dias
    };
  }
}

export default CATALOGO_DECRETO_1092;
