import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { calcularNotasEfectivasEstudiante, calcularPromedioGeneral } from '../lib/academicLogic';
import { 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight,
  Calendar, 
  Check, 
  RotateCw,
  GraduationCap,
  Briefcase,
  FileText,
  ClipboardList,
  BookOpen,
  User,
  Info,
  ExternalLink,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import ThemeToggle from '../components/common/ThemeToggle';
import { 
  getCatedraPortalConfig, 
  consultarEstadoAlumno, 
  formatDniDisplay, 
  maskDni,
  normalizeDni 
} from '../services/studentPortalService';
import { handleAppError } from '../utils/handleAppError';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

/**
 * ConsultaAlumnoPage - Portal de Consulta Académica Oficial Korum ("Mi espacio académico")
 * Ruta: /consulta/:catedraId
 */
export default function ConsultaAlumnoPage() {
  useDocumentTitle('Mi espacio académico · Korum');
  const { catedraId } = useParams();

  // Estados de carga e interacción
  const [initLoading, setInitLoading] = useState(true);
  const [catedra, setCatedra] = useState(null);
  const [formattedDni, setFormattedDni] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [resultado, setResultado] = useState(null);
  const [consultaTimestamp, setConsultaTimestamp] = useState('');

  // Control de tasa y cooldown
  const [intentosFallidos, setIntentosFallidos] = useState(0);
  const [bloqueadoHasta, setBloqueadoHasta] = useState(null);
  const [ultimaConsulta, setUltimaConsulta] = useState(0);

  // Carga inicial de datos de la cátedra
  useEffect(() => {
    async function loadInitial() {
      if (!catedraId) return;
      setInitLoading(true);
      setSearchError('');
      try {
        const config = await getCatedraPortalConfig(catedraId);
        setCatedra(config);
      } catch (err) {
        handleAppError(err, 'ConsultaAlumnoPage / loadInitial');
      } finally {
        setInitLoading(false);
      }
    }

    loadInitial();
  }, [catedraId]);

  // Formateo de DNI
  const handleDniInputFormatting = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    setFormattedDni(formatted);
    if (searchError) setSearchError('');
  };

  const handleConsultarDni = async (e) => {
    if (e) e.preventDefault();
    const ahora = Date.now();

    if (bloqueadoHasta && ahora < bloqueadoHasta) {
      const segundosRestantes = Math.ceil((bloqueadoHasta - ahora) / 1000);
      toast.error(`Demasiadas consultas. Esperá ${segundosRestantes}s para reintentar.`);
      return;
    }

    if (ahora - ultimaConsulta < 2000) {
      toast.error('Por favor esperá 2 segundos entre consultas.');
      return;
    }

    const cleanDni = normalizeDni(formattedDni);
    if (!cleanDni || cleanDni.length < 6) {
      setSearchError('Ingresá un número de DNI válido (mínimo 6 dígitos).');
      return;
    }

    setUltimaConsulta(ahora);
    setLoading(true);
    setSearchError('');

    try {
      const targetCatedraId = catedra?.id || catedraId;
      const res = await consultarEstadoAlumno(targetCatedraId, cleanDni);
      if (!res.success) {
        const nuevosIntentos = intentosFallidos + 1;
        setIntentosFallidos(nuevosIntentos);
        if (nuevosIntentos >= 5) {
          setBloqueadoHasta(Date.now() + 30000);
          toast.error('Acceso pausado por 30 segundos por intentos reiterados.');
        }
        setSearchError(res.message || 'No se encontró registro para el DNI ingresado.');
        setResultado(null);
      } else {
        setIntentosFallidos(0);
        setBloqueadoHasta(null);
        setResultado(res);
        setConsultaTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (err) {
      setSearchError('Error de conexión al consultar el estado académico.');
      handleAppError(err, 'ConsultaAlumnoPage / handleConsultarDni');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSearch = () => {
    setResultado(null);
    setFormattedDni('');
    setSearchError('');
  };

  // Carga inicial
  if (initLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="w-7 h-7 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Cátedra no encontrada o inactiva
  if (!catedra) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-sm w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-7 text-center space-y-3 shadow-xl">
          <AlertCircle className="w-9 h-9 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Cátedra no encontrada</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            El enlace no corresponde a una materia activa en el sistema.
          </p>
        </div>
      </div>
    );
  }

  if (!catedra.portal_activo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-sm w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-7 text-center space-y-3 shadow-xl">
          <AlertCircle className="w-9 h-9 text-amber-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Consulta desactivada</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            El docente de <strong>{catedra.nombre}</strong> no tiene habilitada la consulta pública de calificaciones en este momento.
          </p>
        </div>
      </div>
    );
  }

  const institucionNombre = catedra.instituciones?.nombre || catedra.institucion_nombre || 'Institución Educativa';

  // Helper de condición académica comprensible para el estudiante
  const getCondicionContextual = (condicionRaw, esEquivalencia = false, subcondicion = null) => {
    const cond = (condicionRaw || 'REGULAR').toUpperCase();
    if (esEquivalencia || cond.includes('EQUIV')) {
      return {
        label: 'EQUIVALENCIA',
        explicacion: 'Materia registrada bajo régimen de equivalencia académica.',
        boxClass: 'bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 rounded-2xl p-4',
        pillClass: 'bg-emerald-600 text-white'
      };
    }
    if (cond.includes('INDIRECT') || subcondicion === 'INDIRECTA' || (cond.includes('PROMO') && cond.includes('IND'))) {
      return {
        label: 'PROMOCIÓN INDIRECTA',
        explicacion: 'Cumplís los requisitos de promoción indirecta (1 parcial recuperado con nota ≥ 7 y asistencia ≥ 80%).',
        boxClass: 'bg-teal-50/80 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-800/60 rounded-2xl p-4',
        pillClass: 'bg-teal-600 text-white'
      };
    }
    if (cond.includes('PROMO') || cond.includes('APROB')) {
      return {
        label: 'PROMOCIONAL',
        explicacion: 'Cumplís los requisitos de promoción directa sin examen final.',
        boxClass: 'bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 rounded-2xl p-4',
        pillClass: 'bg-emerald-600 text-white'
      };
    }
    if (cond.includes('RECUP')) {
      return {
        label: 'A RECUPERATORIO',
        explicacion: 'Debés presentarte a la instancia de recuperatorio para alcanzar la regularidad o promoción.',
        boxClass: 'bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60 rounded-2xl p-4',
        pillClass: 'bg-amber-600 text-white'
      };
    }
    if (cond.includes('RIESGO') || cond.includes('CONDICIONAL') || cond.includes('ALERTA')) {
      return {
        label: 'EN RIESGO',
        explicacion: 'Atención: debés recuperar asistencia o evaluaciones pendientes para sostener la regularidad.',
        boxClass: 'bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60 rounded-2xl p-4',
        pillClass: 'bg-amber-600 text-white'
      };
    }
    if (cond.includes('LIBRE') || cond.includes('DESAPROB')) {
      return {
        label: 'LIBRE',
        explicacion: 'No alcanzás el mínimo reglamentario de asistencia o calificaciones. Consultá las instancias de examen final libre.',
        boxClass: 'bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-800/60 rounded-2xl p-4',
        pillClass: 'bg-rose-600 text-white'
      };
    }
    return {
      label: 'REGULAR',
      explicacion: 'Cumplís con la regularidad cursada. Estás habilitado para rendir examen final regular.',
      boxClass: 'bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200/70 dark:border-emerald-800/60 rounded-2xl p-4',
      pillClass: 'bg-emerald-600 text-white'
    };
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-emerald-500/20 transition-colors">
      {/* 1. Cabecera Superior */}
      <header className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <img 
            src="/dashboard-logo.png" 
            alt="Korum" 
            className="w-8 h-8 rounded-xl object-contain shrink-0 shadow-xs" 
          />
          <div className="min-w-0">
            <span className="text-xs sm:text-sm font-black tracking-tight text-slate-900 dark:text-white block truncate leading-tight">
              Korum
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Portal Oficial de Consulta Estudiantil
            </p>
          </div>
        </div>

        <ThemeToggle />
      </header>

      {/* 2. Cuerpo Principal */}
      <main className={`${resultado ? 'max-w-5xl' : 'max-w-xl'} w-full mx-auto px-4 py-8 sm:py-10 flex-1 flex flex-col justify-center transition-all`}>
        {!resultado ? (
          /* TARJETA CENTRAL EQUILIBRADA DE CONSULTA */
          <div className="max-w-md w-full mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl p-7 sm:p-8 space-y-6 animate-fadeIn">
            {/* Cabecera Institucional */}
            <div className="space-y-3 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold max-w-full">
                <span className="shrink-0">📚</span>
                <span className="truncate">{catedra.nombre} · {institucionNombre}</span>
              </div>

              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Consulta de Estado Académico
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Ingresá tu número de documento para consultar tu condición reglamentaria, porcentaje de asistencia y calificaciones.
                </p>
              </div>
            </div>

            <form onSubmit={handleConsultarDni} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Documento Nacional de Identidad (DNI)
                </label>
                <div className="relative">
                  <UserCheck className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formattedDni}
                    onChange={handleDniInputFormatting}
                    placeholder="Ej: 42.123.456"
                    autoFocus
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl font-mono text-lg tracking-wider font-bold bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              {searchError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{searchError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-semibold py-3 px-5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 touch-target-44 min-h-[46px]"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Consultando...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Consultar Estado Académico</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* VISTA DE RESULTADOS: "MI ESPACIO ACADÉMICO" */
          (() => {
            const condicionEfectiva = resultado.estudiante?.condicion_manual || resultado.condicion_ram?.condicion;
            const condInfo = getCondicionContextual(
              condicionEfectiva,
              resultado.estudiante?.es_equivalencia,
              resultado.condicion_ram?.subcondicion
            );
            const pctAsistencia = Math.min(100, Math.max(0, resultado.asistencia?.porcentaje ?? 0));
            const metaAsistencia = resultado.asistencia?.min_asist_reg ?? (resultado.estudiante?.tiene_certificado_trabajo ? 60 : 70);
            const evalsList = Array.isArray(resultado.evaluaciones) ? resultado.evaluaciones : [];

            const mostrarParciales = (resultado.config?.mostrar_parciales ?? catedra?.mostrar_parciales) !== false;
            const mostrarTps = (resultado.config?.mostrar_tps ?? catedra?.mostrar_tps) !== false;
            const mostrarPromedio = (resultado.config?.mostrar_promedio ?? catedra?.mostrar_promedio) !== false;

            const isParcialOrRecup = (ev) => {
              const t = (ev?.tipo || '').toUpperCase().trim();
              const title = (ev?.titulo || '').toLowerCase();
              return t === 'PARCIAL' || t === 'RECUPERATORIO' || t.includes('PARCIAL') || t.includes('RECUP') || title.includes('parcial') || title.includes('recup');
            };
            const isTp = (ev) => {
              const t = (ev?.tipo || '').toUpperCase().trim();
              if (t === 'TP' || t === 'TRABAJO_PRACTICO') return true;
              return !isParcialOrRecup(ev);
            };

            const visibleEvalsList = evalsList.filter((ev) => {
              if (!mostrarParciales && isParcialOrRecup(ev)) return false;
              if (!mostrarTps && isTp(ev)) return false;
              return true;
            });

            const { notasEfectivasMap, parcialesRecuperadosCount } = calcularNotasEfectivasEstudiante(evalsList, evalsList);
            const promedioAlumno = resultado.promedio !== undefined && resultado.promedio !== null
              ? resultado.promedio
              : calcularPromedioGeneral(evalsList, evalsList);

            const ultimaEval = visibleEvalsList.length > 0 ? visibleEvalsList[visibleEvalsList.length - 1] : null;
            const recuperatoriosUsados = parcialesRecuperadosCount > 0 ? parcialesRecuperadosCount : evalsList.filter(ev =>
              (ev.tipo || '').toLowerCase().includes('recup') || (ev.titulo || '').toLowerCase().includes('recup')
            ).length;

            return (
              <div className="space-y-6 animate-fadeIn">
                {/* 1. BANNER SUPERIOR ("Mi espacio académico") */}
                <div className="bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-emerald-100/60 dark:from-emerald-950/40 dark:to-slate-900 border border-emerald-200/60 dark:border-emerald-800/50 rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Mi espacio académico
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                        Aquí podés consultar tu situación académica en tiempo real.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetSearch}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-full shadow-xs transition-all inline-flex items-center justify-center gap-2 text-xs sm:text-sm shrink-0 cursor-pointer touch-target-44"
                    title="Realizar una nueva consulta"
                  >
                    <span>🔍 Nueva consulta →</span>
                  </button>
                </div>

                {/* 2. TARJETA PRINCIPAL DEL ESTUDIANTE (3 Columnas en Desktop, Apilada en Móvil) */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Columna 1: Identidad y Privacidad (lg:col-span-5) */}
                  <div className="lg:col-span-5 flex items-center gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <User className="w-7 h-7" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        Estudiante
                      </span>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                        {resultado.estudiante?.apellido}, {resultado.estudiante?.nombre}
                      </h2>
                      <p className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          DNI {maskDni(resultado.estudiante?.dni)}
                        </span>
                        <span>•</span>
                        <span className="truncate">{institucionNombre}</span>
                      </p>
                    </div>
                  </div>

                  {/* Columna 2: Materia y Plan (lg:col-span-4) */}
                  <div className="lg:col-span-4 border-y lg:border-y-0 lg:border-x border-slate-100 dark:border-slate-800 py-4 lg:py-0 lg:px-6 flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-emerald-700 dark:text-emerald-400 font-bold text-base leading-snug">
                        {catedra.nombre}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {catedra.nivel ? `Nivel ${catedra.nivel}` : 'Nivel Superior'} · Régimen {catedra.modalidad || 'Anual'}
                      </p>
                      {consultaTimestamp && (
                        <span className="text-[11px] font-mono text-slate-400 block mt-1">
                          Actualizado hoy a las {consultaTimestamp} hs
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Columna 3: Estado Académico Comprensible (lg:col-span-3) */}
                  <div className="lg:col-span-3">
                    <div className={condInfo.boxClass}>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-600 dark:text-slate-300">
                          CONDICIÓN ACADÉMICA
                        </span>
                        <span className={`px-3 py-0.5 rounded-full text-xs font-mono font-black uppercase tracking-wider shadow-2xs ${condInfo.pillClass}`}>
                          {condInfo.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                        {condInfo.explicacion}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. FILA DE 3 TARJETAS DE MÉTRICAS (Bento Grid) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Tarjeta 1: Asistencia Acumulada */}
                  {resultado.config?.portal_mostrar_asistencia && resultado.asistencia && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <span>Asistencia Acumulada</span>
                        </div>

                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-4xl font-extrabold text-slate-900 dark:text-white font-mono">
                            {pctAsistencia}%
                          </span>
                          <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                            {resultado.asistencia.presentes ?? 0} de {resultado.asistencia.total_clases ?? 0} clases
                          </span>
                        </div>

                        {/* Barra de progreso horizontal suave */}
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              pctAsistencia < metaAsistencia
                                ? 'bg-rose-500'
                                : pctAsistencia < metaAsistencia + 5
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${pctAsistencia}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                          <Info className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>
                            {resultado.estudiante?.tiene_certificado_trabajo
                              ? 'Meta de regularidad: 60% Cert. Laboral'
                              : 'Meta de regularidad: 70%'}
                          </span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                          Meta: {metaAsistencia}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Tarjeta 2: Condición académica reglamentaria */}
                  {resultado.config?.portal_mostrar_condicion && resultado.condicion_ram && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <GraduationCap className="w-4 h-4" />
                          </div>
                          <span>Condición académica reglamentaria</span>
                        </div>

                        <div className="flex items-start justify-between gap-3 pt-1">
                          <div className="space-y-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                              {resultado.condicion_ram.motivo || (condInfo.label === 'LIBRE' ? 'No alcanza regularidad' : 'Requisitos al día')}
                            </p>
                            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                              (Asist: {pctAsistencia}%, Recup: {recuperatoriosUsados})
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase shrink-0 ${condInfo.pillClass}`}>
                            {condInfo.label}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                        Evaluado según Régimen Académico Marco (RAM) vigente.
                      </div>
                    </div>
                  )}

                  {/* Tarjeta 3: Evaluaciones */}
                  {resultado.config?.portal_mostrar_notas && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <ClipboardList className="w-4 h-4" />
                            </div>
                            <span>Evaluaciones</span>
                          </div>
                          {mostrarPromedio && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300">
                              Promedio: {promedioAlumno !== null && promedioAlumno !== undefined ? Number(promedioAlumno).toFixed(2) : '—'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-extrabold text-slate-900 dark:text-white font-mono">
                            {visibleEvalsList.length}
                          </span>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {visibleEvalsList.length === 1 ? 'evaluación visible' : 'evaluaciones visibles'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                        {ultimaEval ? (
                          <>
                            <span className="text-slate-600 dark:text-slate-300 font-medium truncate">
                              Última: <strong>{ultimaEval.titulo}</strong>
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold uppercase shrink-0">
                              {ultimaEval.tipo || 'TP'}
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Sin instancias evaluativas visibles
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. SECCIÓN INFERIOR: CALIFICACIONES (Parciales y TPs) ADAPTABLE */}
                {resultado.config?.portal_mostrar_notas && (mostrarParciales || mostrarTps || mostrarPromedio) && (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2.5 text-sm font-bold text-slate-900 dark:text-white">
                        <GraduationCap className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>
                          {mostrarParciales && mostrarTps
                            ? 'Calificaciones (Parciales y TPs)'
                            : mostrarParciales
                            ? 'Calificaciones (Parciales y Recuperatorios)'
                            : mostrarTps
                            ? 'Calificaciones (Trabajos Prácticos)'
                            : 'Promedio General'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {mostrarPromedio && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/70 dark:border-emerald-800/60 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
                            Promedio General: {promedioAlumno !== null && promedioAlumno !== undefined ? Number(promedioAlumno).toFixed(2) : '—'}
                          </span>
                        )}
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          {visibleEvalsList.length} {visibleEvalsList.length === 1 ? 'instancia' : 'instancias'}
                        </span>
                      </div>
                    </div>

                    {visibleEvalsList.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6">
                        {!mostrarParciales && !mostrarTps
                          ? 'El detalle de parciales y trabajos prácticos se encuentra oculto por configuración de la cátedra.'
                          : 'Sin evaluaciones registradas por el docente para esta vista.'}
                      </p>
                    ) : (
                      <>
                        {/* Vista Desktop (hidden sm:block): Tabla limpia */}
                        <div className="hidden sm:block overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-mono uppercase text-slate-400 dark:text-slate-500">
                                <th className="pb-3 font-semibold">Instancia</th>
                                <th className="pb-3 font-semibold">Tipo</th>
                                <th className="pb-3 font-semibold text-right">Calificación</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                              {visibleEvalsList.map((ev, idx) => {
                                const evalId = ev.id || ev.evaluacion_id;
                                const hasNota = ev.valor !== null && ev.valor !== undefined;
                                const notaNum = hasNota ? Number(ev.valor) : null;
                                const isAprobado = notaNum !== null && notaNum >= 4;
                                const infoEfectiva = (notasEfectivasMap?.get ? notasEfectivasMap.get(String(evalId)) : notasEfectivasMap?.[evalId]) || null;
                                const esRecuperatorio = (ev.tipo || '').toUpperCase().includes('RECUP') || (ev.titulo || '').toLowerCase().includes('recup');
                                const detalleRecup = ev.detalle_recuperatorio;

                                return (
                                  <tr key={evalId || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="py-3.5 pr-4">
                                      <span className="font-bold text-slate-900 dark:text-white block">
                                        {ev.titulo}
                                      </span>
                                      {ev.fecha_entrega && (
                                        <span className="text-[11px] font-mono text-slate-400">
                                          {ev.fecha_entrega}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[11px] font-semibold uppercase">
                                        {ev.tipo || 'TP'}
                                      </span>
                                    </td>
                                    <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                                      {infoEfectiva?.reemplazada ? (
                                        <div 
                                          className="inline-flex items-center gap-1.5"
                                          title={`Nota original: ${infoEfectiva.notaOriginal !== null ? infoEfectiva.notaOriginal : 'Aus.'} → Reemplazada en Recuperatorio por ${infoEfectiva.notaEfectiva}`}
                                        >
                                          <span className="line-through text-slate-400 dark:text-slate-500 font-mono text-xs">
                                            {infoEfectiva.notaOriginal !== null && infoEfectiva.notaOriginal !== undefined ? Number(infoEfectiva.notaOriginal).toFixed(1) : 'Aus.'}
                                          </span>
                                          <span className="text-slate-400 text-xs">➔</span>
                                          <span className="bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono font-bold px-2.5 py-1 rounded-full text-xs inline-flex items-center gap-1 shadow-2xs">
                                            {Number(infoEfectiva.notaEfectiva).toFixed(1)}
                                            <span className="text-[10px] uppercase font-sans font-black text-emerald-600 dark:text-emerald-400">R</span>
                                          </span>
                                        </div>
                                      ) : esRecuperatorio && detalleRecup?.excede_limite ? (
                                        <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                          Excede cupo (Libre)
                                        </span>
                                      ) : esRecuperatorio && detalleRecup?.parciales_recuperados && Object.keys(detalleRecup.parciales_recuperados).length > 0 ? (
                                        <div className="inline-flex flex-wrap items-center justify-end gap-1">
                                          {Object.entries(detalleRecup.parciales_recuperados).map(([pId, data]) => {
                                            const pEval = evalsList.find(e => (e.id || e.evaluacion_id) === pId);
                                            const pName = pEval?.titulo || 'Parcial';
                                            const shortP = pName.length > 7 ? pName.substring(0, 7) + '..' : pName;
                                            return (
                                              <span 
                                                key={pId}
                                                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-semibold border border-slate-200/60 dark:border-slate-700"
                                                title={`${pName}: ${data.nota !== null && data.nota !== undefined ? data.nota : (data.estado || 'Aus.')}`}
                                              >
                                                {shortP}: <strong>{data.nota !== null && data.nota !== undefined ? Number(data.nota).toFixed(1) : (data.estado || 'Aus.')}</strong>
                                              </span>
                                            );
                                          })}
                                        </div>
                                      ) : hasNota ? (
                                        <span className={
                                          isAprobado
                                            ? 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono font-bold px-3 py-1 rounded-full inline-block'
                                            : 'bg-rose-100/80 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-mono font-bold px-3 py-1 rounded-full inline-block'
                                        }>
                                          {notaNum.toFixed(1)} / 10
                                        </span>
                                      ) : ev.estado === 'NO_ENTREGO' ? (
                                        <span className="inline-block px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                          N/E (No entregó)
                                        </span>
                                      ) : ev.estado === 'AUSENTE' ? (
                                        <span className="inline-block px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                          Aus. (Ausente)
                                        </span>
                                      ) : (
                                        <span className="text-xs font-mono text-slate-400">
                                          Pendiente
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Vista en Celulares (sm:hidden): Tarjetas compactas apiladas */}
                        <div className="sm:hidden space-y-2.5">
                          {visibleEvalsList.map((ev, idx) => {
                            const evalId = ev.id || ev.evaluacion_id;
                            const hasNota = ev.valor !== null && ev.valor !== undefined;
                            const notaNum = hasNota ? Number(ev.valor) : null;
                            const isAprobado = notaNum !== null && notaNum >= 4;
                            const infoEfectiva = (notasEfectivasMap?.get ? notasEfectivasMap.get(String(evalId)) : notasEfectivasMap?.[evalId]) || null;
                            const esRecuperatorio = (ev.tipo || '').toUpperCase().includes('RECUP') || (ev.titulo || '').toLowerCase().includes('recup');
                            const detalleRecup = ev.detalle_recuperatorio;

                            return (
                              <div
                                key={evalId || idx}
                                className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center justify-between gap-3"
                              >
                                <div className="min-w-0 space-y-1">
                                  <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                                    {ev.titulo}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold uppercase">
                                      {ev.tipo || 'TP'}
                                    </span>
                                    {ev.fecha_entrega && (
                                      <span className="text-[10px] font-mono text-slate-400">
                                        {ev.fecha_entrega}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0 text-right">
                                  {infoEfectiva?.reemplazada ? (
                                    <div 
                                      className="inline-flex items-center gap-1"
                                      title={`Nota original: ${infoEfectiva.notaOriginal !== null ? infoEfectiva.notaOriginal : 'Aus.'} → Reemplazada en Recuperatorio por ${infoEfectiva.notaEfectiva}`}
                                    >
                                      <span className="line-through text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                                        {infoEfectiva.notaOriginal !== null && infoEfectiva.notaOriginal !== undefined ? Number(infoEfectiva.notaOriginal).toFixed(1) : 'Aus.'}
                                      </span>
                                      <span className="text-slate-400 text-xs">➔</span>
                                      <span className="bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono font-bold text-xs px-2.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                        {Number(infoEfectiva.notaEfectiva).toFixed(1)}
                                        <span className="text-[9px] uppercase font-sans font-black text-emerald-600 dark:text-emerald-400">R</span>
                                      </span>
                                    </div>
                                  ) : esRecuperatorio && detalleRecup?.excede_limite ? (
                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                      Libre (cupo)
                                    </span>
                                  ) : esRecuperatorio && detalleRecup?.parciales_recuperados && Object.keys(detalleRecup.parciales_recuperados).length > 0 ? (
                                    <div className="flex flex-col items-end gap-1">
                                      {Object.entries(detalleRecup.parciales_recuperados).map(([pId, data]) => {
                                        const pEval = evalsList.find(e => (e.id || e.evaluacion_id) === pId);
                                        const pName = pEval?.titulo || 'P';
                                        const shortP = pName.length > 5 ? pName.substring(0, 5) + '..' : pName;
                                        return (
                                          <span 
                                            key={pId}
                                            className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-semibold"
                                          >
                                            {shortP}: {data.nota !== null && data.nota !== undefined ? Number(data.nota).toFixed(1) : (data.estado || 'Aus.')}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  ) : hasNota ? (
                                    <span className={
                                      isAprobado
                                        ? 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono font-bold text-xs px-3 py-1 rounded-full inline-block'
                                        : 'bg-rose-100/80 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-mono font-bold text-xs px-3 py-1 rounded-full inline-block'
                                    }>
                                      {notaNum.toFixed(1)} / 10
                                    </span>
                                  ) : ev.estado === 'NO_ENTREGO' ? (
                                    <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                      N/E
                                    </span>
                                  ) : ev.estado === 'AUSENTE' ? (
                                    <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                      Aus.
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-mono text-slate-400">
                                      Pendiente
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })()
        )}
      </main>

      {/* Footer Sobrio */}
      <footer className="py-4 border-t border-slate-200/80 dark:border-slate-800 text-center text-[11px] font-mono text-slate-500 dark:text-slate-400">
        Korum · Mi espacio académico
      </footer>
    </div>
  );
}

export { ConsultaAlumnoPage };
