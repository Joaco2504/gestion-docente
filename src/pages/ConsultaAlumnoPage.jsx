import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Search, 
  CheckSquare, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft, 
  ShieldAlert, 
  X,
  Sparkles,
  BookOpen,
  Zap,
  Lock
} from 'lucide-react';
import ThemeToggle from '../components/common/ThemeToggle';
import { KorumIsotypeSvg } from '../components/common/BrandIllustrations';
import { 
  getCatedraPortalConfig, 
  consultarEstadoAlumno, 
  formatDniDisplay, 
  normalizeDni 
} from '../services/studentPortalService';
import { useTheme } from '../context/ThemeContext';
import { handleAppError } from '../utils/handleAppError';

/**
 * ConsultaAlumnoPage - Portal de Consulta Académica Oficial Korum
 * Ruta: /consulta/:catedraId
 */
export default function ConsultaAlumnoPage() {
  const { catedraId } = useParams();
  const { theme } = useTheme();

  // Estados de carga e interacción
  const [initLoading, setInitLoading] = useState(true);
  const [catedra, setCatedra] = useState(null);
  const [formattedDni, setFormattedDni] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [resultado, setResultado] = useState(null);

  // Carga inicial de metadatos de la cátedra
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

  // Formateo numérico en vivo con separador de miles sin romper el cursor
  const handleDniInputFormatting = (e) => {
    const input = e.target;
    const oldVal = input.value;
    const oldCursor = input.selectionStart || 0;
    
    // Contar dígitos numéricos antes del cursor
    const digitsBeforeCursor = oldVal.slice(0, oldCursor).replace(/\D/g, '').length;
    
    // Extraer únicamente dígitos (hasta 8 dígitos para DNI)
    const raw = oldVal.replace(/\D/g, '').slice(0, 8);
    const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    setFormattedDni(formatted);
    if (searchError) setSearchError('');

    // Reubicar el cursor conservando los dígitos ingresados sin saltar al final
    requestAnimationFrame(() => {
      let newCursor = 0;
      let digitsSeen = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
          digitsSeen++;
        }
        if (digitsSeen === digitsBeforeCursor) {
          newCursor = i + 1;
          break;
        }
      }
      if (digitsBeforeCursor === 0) newCursor = 0;
      if (digitsSeen < digitsBeforeCursor) newCursor = formatted.length;
      input.setSelectionRange(newCursor, newCursor);
    });
  };

  const handleConsultarDni = async (e) => {
    if (e) e.preventDefault();
    const cleanDni = normalizeDni(formattedDni);
    if (!cleanDni || cleanDni.length < 6) {
      setSearchError('Por favor ingresá un número de DNI válido (mínimo 6 dígitos).');
      return;
    }

    setLoading(true);
    setSearchError('');

    try {
      const targetCatedraId = catedra?.id || catedraId;
      const res = await consultarEstadoAlumno(targetCatedraId, cleanDni);
      if (!res.success) {
        setSearchError(res.message || 'No se encontró registro para el DNI ingresado.');
        setResultado(null);
      } else {
        setResultado(res);
      }
    } catch (err) {
      handleAppError(err, 'ConsultaAlumnoPage / handleConsultarDni');
      setSearchError('Ocurrió un error al verificar la situación académica. Reintenta en unos instantes.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSearch = () => {
    setResultado(null);
    setSearchError('');
    setFormattedDni('');
  };

  // 1. PANTALLA DE CARGA INICIAL
  if (initLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080C14] p-4">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <KorumIsotypeSvg className="w-7 h-7" />
            </div>
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Korum</h2>
            <p className="text-xs text-slate-400 mt-0.5">Conectando con el portal de la cátedra...</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. CASO: CÁTEDRA NO ENCONTRADA O PORTAL PAUSADO
  if (!catedra) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
        <div className="max-w-md w-full backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 text-center shadow-lg animate-fadeIn">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Cátedra no encontrada</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            El enlace al que intentas acceder no corresponde a una materia activa en el sistema. Revisa la URL proporcionada por tu docente.
          </p>
        </div>
      </div>
    );
  }

  if (!catedra.portal_activo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-canvas p-4 selection:bg-emerald-500/20">
        <div className="max-w-md w-full backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 text-center shadow-xl animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/20 shadow-xs">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400 block mb-1">
            Consulta Pausada
          </span>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Portal de Consulta Desactivado
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            El equipo docente de <strong>{catedra.nombre}</strong> ({catedra.instituciones?.nombre || catedra.institucion_nombre}) aún no ha habilitado la consulta pública de calificaciones o la ha pausado temporalmente.
          </p>
          <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-mono">
            💡 Consulta con tu profesor en el aula para conocer tu situación académica reglamentaria.
          </div>
        </div>
      </div>
    );
  }

  // 3. VISTA PRINCIPAL
  return (
    <div className="min-h-screen flex flex-col bg-canvas text-text-primary antialiased selection:bg-emerald-500/20 selection:text-emerald-500">
      {/* Barra de Identificación Oficial Korum */}
      <header className="w-full bg-white/80 dark:bg-[#080C14]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <KorumIsotypeSvg className="w-8 h-8 rounded-xl" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white">
                  Korum
                </span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Portal Alumnos
                </span>
              </div>
              <p className="text-[10px] text-slate-400 -mt-0.5">
                {catedra.instituciones?.nombre || catedra.institucion_nombre || 'Sistema de Gestión Académica'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Cifrado SSL / RLS</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Contenedor Central */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {!resultado ? (
          /* =========================================================================
             PARTE 4: TARJETA BENTO UNIFICADA DE CONSULTA OFICIAL KORUM
             ========================================================================= */
          <div className="w-full max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 animate-fadeIn">
            {/* Cabecera de Cátedra Integrada */}
            <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Cátedra Oficial
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mt-0.5">
                  {catedra?.nombre || "Cátedra Académica"}
                </h2>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                RAM: 70% Reg. / 80% Promo
              </span>
            </div>

            {/* Contenedor Central de Consulta */}
            <div className="p-6 sm:p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-sm">
                <Search className="w-6 h-6"/>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 tracking-tight">
                Verificación de Situación Académica
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6">
                Ingresá tu número de DNI para consultar notas y condición reglamentaria en tiempo real.
              </p>

              {/* Formulario de Entrada DNI Monospace */}
              <form onSubmit={handleConsultarDni} className="space-y-4">
                <div className="text-left">
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 ml-1 font-medium">
                    Documento Nacional de Identidad
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formattedDni}
                      onChange={handleDniInputFormatting}
                      placeholder="Ej. 42.123.456"
                      maxLength={10}
                      className="w-full h-13 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-lg text-slate-900 dark:text-white tracking-widest placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-inner"
                      autoFocus
                    />
                    {formattedDni && (
                      <button
                        type="button"
                        onClick={() => setFormattedDni('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title="Limpiar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {searchError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 text-left animate-fadeIn">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{searchError}</span>
                  </div>
                )}

                {/* Botón CTA Esmeralda Sólido */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span className="font-semibold tracking-wide">VERIFICANDO CONDICIÓN...</span>
                    </span>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-emerald-200"/>
                      <span className="font-semibold tracking-wide">CONSULTAR CONDICIÓN REGLAMENTARIA</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-400 font-mono">
                <Lock className="w-3.5 h-3.5 text-emerald-500"/>
                <span>Conexión cifrada directa protegida por RLS.</span>
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================================
             FICHA BENTO DE RESULTADOS DEL ESTUDIANTE
             ========================================================================= */
          <div className="space-y-6 animate-fadeInUp">
            {/* Tarjeta de Identidad y Condición RAM */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg sm:text-xl shadow-inner shrink-0 font-mono">
                    {resultado.estudiante?.nombre?.[0] || 'A'}
                    {resultado.estudiante?.apellido?.[0] || 'L'}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                      Estudiante Regular · {catedra.nombre}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                      {resultado.estudiante?.apellido}, {resultado.estudiante?.nombre}
                    </h2>
                    <span className="text-xs font-mono text-slate-400 block mt-0.5">
                      DNI: {formatDniDisplay(resultado.estudiante?.dni)}
                    </span>
                  </div>
                </div>

                {/* Condición Reglamentaria RAM */}
                {resultado.config?.portal_mostrar_condicion && resultado.condicion_ram && (
                  <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400">
                      Condición RAM
                    </span>
                    
                    {(() => {
                      const c = resultado.condicion_ram;
                      const isPromo = c.condicion === 'PROMOCIONAL' || c.condicion === 'APROBADO';
                      const isReg = c.condicion === 'REGULAR';
                      const isLibre = c.condicion === 'LIBRE' || c.condicion === 'DESAPROBADO' || c.condicion === 'EN RIESGO';

                      let badgeClass = 'badge-ram-regular';
                      let Icon = Clock;
                      if (isPromo) {
                        badgeClass = 'badge-ram-promocionado';
                        Icon = CheckCircle2;
                      } else if (isReg) {
                        badgeClass = 'badge-ram-regular';
                        Icon = Clock;
                      } else if (isLibre) {
                        badgeClass = 'badge-ram-libre';
                        Icon = AlertTriangle;
                      }

                      return (
                        <div className="space-y-1 sm:text-right">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${badgeClass}`}>
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{c.condicion}</span>
                          </span>
                          {c.motivo && (
                            <p className="text-[11px] text-slate-400 max-w-xs leading-snug">
                              {c.motivo}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Grilla Bento: Asistencias & Calificaciones */}
            <div className={`grid grid-cols-1 ${
              resultado.config?.portal_mostrar_asistencia && resultado.config?.portal_mostrar_notas 
                ? 'lg:grid-cols-12' 
                : 'grid-cols-1'
            } gap-6`}>
              
              {/* Bloque Asistencia */}
              {resultado.config?.portal_mostrar_asistencia && resultado.asistencia && (
                <div className={`${
                  resultado.config?.portal_mostrar_notas ? 'lg:col-span-5' : 'w-full'
                } bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-md flex flex-col justify-between space-y-5`}>
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Asistencia Registrada
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      RAM Docente
                    </span>
                  </div>

                  {/* Círculo de porcentaje SVG */}
                  <div className="flex flex-col items-center justify-center py-2">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      {(() => {
                        const pct = Math.min(100, Math.max(0, resultado.asistencia.porcentaje || 0));
                        const radius = 54;
                        const circumference = 2 * Math.PI * radius;
                        const strokeDashoffset = circumference - (pct / 100) * circumference;

                        let strokeColor = '#10b981'; // emerald
                        if (pct < Number(resultado.asistencia.min_asist_reg || 70)) {
                          strokeColor = '#dc2626'; // libre
                        } else if (pct < Number(resultado.asistencia.min_asist_promo || 80)) {
                          strokeColor = '#2563eb'; // regular
                        }

                        return (
                          <>
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                              <circle
                                cx="64"
                                cy="64"
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="10"
                                className="text-slate-100 dark:text-slate-800"
                                fill="transparent"
                              />
                              <circle
                                cx="64"
                                cy="64"
                                r={radius}
                                stroke={strokeColor}
                                strokeWidth="10"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                fill="transparent"
                                className="transition-all duration-700 ease-out"
                              />
                            </svg>
                            <div className="absolute flex flex-col items-center justify-center text-center">
                              <span className="text-2xl sm:text-3xl font-mono font-black text-slate-900 dark:text-white tracking-tight">
                                {pct}%
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Asistencia
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Resumen de Clases */}
                  <div className="grid grid-cols-3 gap-2 text-center pt-2 font-mono">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Dictadas</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {resultado.asistencia.total_clases}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                      <span className="text-[10px] uppercase font-bold block">Presentes</span>
                      <span className="text-base font-black">
                        {resultado.asistencia.presentes}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400">
                      <span className="text-[10px] uppercase font-bold block">Ausentes</span>
                      <span className="text-base font-black">
                        {resultado.asistencia.ausentes}
                      </span>
                    </div>
                  </div>

                  {/* Parámetros RAM */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span>Mínimo Regularidad:</span>
                      <strong className="text-slate-900 dark:text-white">{resultado.asistencia.min_asist_reg}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Mínimo Promoción:</span>
                      <strong className="text-slate-900 dark:text-white">{resultado.asistencia.min_asist_promo}%</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Bloque Calificaciones */}
              {resultado.config?.portal_mostrar_notas && (
                <div className={`${
                  resultado.config?.portal_mostrar_asistencia ? 'lg:col-span-7' : 'w-full'
                } bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-md flex flex-col space-y-4`}>
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Calificaciones y Evaluaciones
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      {resultado.evaluaciones?.length || 0} Registradas
                    </span>
                  </div>

                  {(!resultado.evaluaciones || resultado.evaluaciones.length === 0) ? (
                    <div className="text-center py-8 space-y-2">
                      <BookOpen className="w-8 h-8 text-slate-400 mx-auto opacity-40" />
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Sin notas registradas</p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        Tu docente aún no ha cargado notas de exámenes para tu legajo.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {resultado.evaluaciones.map((ev, index) => {
                        const hasNota = ev.valor !== null && ev.valor !== undefined;
                        const notaNum = hasNota ? Number(ev.valor) : null;
                        const isAprobado = notaNum !== null && notaNum >= 4;
                        const isPromo = notaNum !== null && notaNum >= 7;

                        let gradeClass = 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700';
                        if (hasNota) {
                          if (isPromo) {
                            gradeClass = 'badge-ram-promocionado';
                          } else if (isAprobado) {
                            gradeClass = 'badge-ram-regular';
                          } else {
                            gradeClass = 'badge-ram-libre';
                          }
                        }

                        return (
                          <div 
                            key={ev.id || index}
                            className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between gap-3 hover:border-emerald-500/30 transition-colors"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {ev.tipo}
                                </span>
                                {ev.fecha_entrega && (
                                  <span className="text-[10px] font-mono text-slate-400">
                                    {ev.fecha_entrega}
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2">
                                {ev.titulo}
                              </h4>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800">
                              <span className="text-[10px] uppercase font-mono font-bold text-slate-400">
                                Calificación
                              </span>
                              {hasNota ? (
                                <span className={`px-2.5 py-1 rounded-lg text-xs sm:text-sm font-mono border ${gradeClass}`}>
                                  {notaNum.toFixed(2)} / 10
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-400">
                                  Pendiente
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Botón: Consultar otro DNI */}
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={handleResetSearch}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 shadow-md transition-all duration-200 hover:scale-105 active:scale-95 group cursor-pointer text-xs sm:text-sm font-semibold"
              >
                <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
                <span>Consultar otro DNI</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer del Portal Estudiantil */}
      <footer className="mt-auto py-6 border-t border-slate-200/60 dark:border-slate-800 px-4 text-center font-mono">
        <p className="text-[11px] text-slate-400">
          Korum · Plataforma Oficial de Gestión Docente y Situación Académica
        </p>
      </footer>
    </div>
  );
}

export { ConsultaAlumnoPage };
