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
  BookOpen
} from 'lucide-react';
import Button from '../components/common/Button';
import ThemeToggle from '../components/common/ThemeToggle';
import { 
  getCatedraPortalConfig, 
  consultarEstadoAlumno, 
  formatDniDisplay, 
  normalizeDni 
} from '../services/studentPortalService';
import { useTheme } from '../context/ThemeContext';
import { handleAppError } from '../utils/handleAppError';

export default function StudentPortalPage() {
  const { catedraId } = useParams();
  const { theme } = useTheme();

  // Estados de carga e interacción
  const [initLoading, setInitLoading] = useState(true);
  const [portalConfig, setPortalConfig] = useState(null);
  const [dniInput, setDniInput] = useState('');
  const [searching, setSearching] = useState(false);
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
        setPortalConfig(config);
      } catch (err) {
        handleAppError(err, 'StudentPortalPage / loadInitial');
      } finally {
        setInitLoading(false);
      }
    }

    loadInitial();
  }, [catedraId]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const clean = normalizeDni(dniInput);
    if (!clean || clean.length < 6) {
      setSearchError('Por favor ingresa un número de DNI válido (mínimo 6 números).');
      return;
    }

    setSearching(true);
    setSearchError('');

    try {
      const targetCatedraId = portalConfig?.id || catedraId;
      const res = await consultarEstadoAlumno(targetCatedraId, clean);
      if (!res.success) {
        setSearchError(res.message || 'No se pudo encontrar el estudiante.');
        setResultado(null);
      } else {
        setResultado(res);
      }
    } catch (err) {
      handleAppError(err, 'StudentPortalPage / handleSearch');
      setSearchError('Ocurrió un error inesperado al consultar los datos. Por favor reintenta en unos instantes.');
    } finally {
      setSearching(false);
    }
  };

  const handleResetSearch = () => {
    setResultado(null);
    setSearchError('');
    setDniInput('');
  };

  // ---------------------------------------------------------------------------
  // 1. PANTALLA DE CARGA INICIAL
  // ---------------------------------------------------------------------------
  if (initLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl border-2 border-primary/20 border-t-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-primary">
              <GraduationCap className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">PlanillaDocente</h2>
            <p className="text-xs text-text-muted mt-0.5">Conectando con el portal de la cátedra...</p>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. CASO: CÁTEDRA NO ENCONTRADA O PORTAL INACTIVO
  // ---------------------------------------------------------------------------
  if (!portalConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
        <div className="max-w-md w-full backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 sm:p-8 text-center shadow-lg animate-fadeIn">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-text-primary mb-1">Cátedra no encontrada</h2>
          <p className="text-xs text-text-muted mb-6 leading-relaxed">
            El enlace al que intentas acceder no corresponde a una materia activa en el sistema. Revisa la URL proporcionada por tu docente.
          </p>
        </div>
      </div>
    );
  }

  if (!portalConfig.portal_activo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-canvas p-4 selection:bg-primary/20">
        <div className="max-w-md w-full backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 sm:p-8 text-center shadow-xl animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/20 shadow-xs">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <span className="text-[11px] uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400 block mb-1">
            Consulta Pausada
          </span>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Portal de Consulta Desactivado
          </h2>
          <p className="text-xs sm:text-sm text-text-muted mb-6 leading-relaxed">
            El equipo docente de <strong>{portalConfig.nombre}</strong> ({portalConfig.institucion_nombre}) aún no ha habilitado la consulta pública de calificaciones o la ha pausado temporalmente.
          </p>
          <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/5 text-xs text-text-secondary leading-relaxed">
            💡 Por favor consulta con tu profesor en el aula de clases para conocer tu situación académica.
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. VISTA PRINCIPAL (FORMULARIO Y FICHA DE RESULTADOS)
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col bg-canvas text-text-primary antialiased selection:bg-primary/20 selection:text-primary">
      {/* Barra Superior Minimalista con Identidad y Tema */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-white/10 px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm shadow-primary/30">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black tracking-tight text-text-primary block leading-none">
                Planilla<span className="text-primary">Docente</span>
              </span>
              <span className="text-[10px] text-text-muted font-medium block">
                Portal Estudiantil
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Contenido Central */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Cabecera Simplificada: ÚNICAMENTE Nombre de la carrera/cátedra destacado */}
        <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 sm:p-8 shadow-xs text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-text-primary tracking-tight">
            {portalConfig.nombre}
          </h1>
        </div>

        {/* Formulario de Búsqueda por DNI (Si aún no consultó o quiere cambiar) */}
        {!resultado ? (
          <div className="backdrop-blur-xl bg-white/90 dark:bg-slate-900/80 rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 sm:p-8 shadow-sm max-w-lg mx-auto text-center space-y-6 animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
              <Search className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-bold text-text-primary">
                Consulta tu Estado Académico
              </h2>
              <p className="text-xs text-text-muted leading-relaxed max-w-xs mx-auto">
                Ingresá tu número de DNI para consultar tus asistencias registradas y calificaciones en esta materia.
              </p>
            </div>

            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={dniInput}
                  onChange={(e) => {
                    setDniInput(e.target.value);
                    if (searchError) setSearchError('');
                  }}
                  placeholder="Ingresa tu DNI sin puntos..."
                  className="w-full text-center text-lg sm:text-xl font-mono font-bold tracking-widest px-4 py-3.5 rounded-2xl bg-slate-100/70 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-text-primary placeholder:text-text-muted/60 placeholder:text-sm placeholder:font-normal placeholder:tracking-normal"
                  autoFocus
                />
                {dniInput && (
                  <button
                    type="button"
                    onClick={() => setDniInput('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {searchError && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 text-left animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{searchError}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                disabled={searching || !dniInput.trim()}
                className="w-full text-sm font-bold py-3.5 rounded-2xl shadow-md shadow-primary/20 cursor-pointer min-h-[48px]"
              >
                {searching ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Buscando ficha...
                  </span>
                ) : (
                  'Consultar mi Estado'
                )}
              </Button>
            </form>

            <div className="pt-2 border-t border-slate-100 dark:border-white/5">
              <span className="text-[11px] text-text-muted block">
                🔒 Consulta directa y privada. Tus datos académicos son protegidos por la institución.
              </span>
            </div>
          </div>
        ) : (
          /* Ficha de Resultados del Estudiante (Renderizado Condicional) */
          <div className="space-y-6 animate-fadeInUp">
            {/* Tarjeta Bento de Identidad del Alumno y Condición RAM */}
            <div className="backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 sm:p-7 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-primary to-blue-500 text-white flex items-center justify-center font-bold text-lg sm:text-xl shadow-md shadow-primary/20 shrink-0">
                    {resultado.estudiante?.nombre?.[0] || 'A'}
                    {resultado.estudiante?.apellido?.[0] || 'L'}
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                      Estudiante Regular
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                      {resultado.estudiante?.apellido}, {resultado.estudiante?.nombre}
                    </h2>
                    <span className="text-xs font-mono text-text-muted block mt-0.5">
                      DNI: {formatDniDisplay(resultado.estudiante?.dni)}
                    </span>
                  </div>
                </div>

                {/* Bloque Condición RAM (Si está activo) */}
                {resultado.config?.portal_mostrar_condicion && resultado.condicion_ram && (
                  <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
                    <span className="text-[10px] uppercase font-bold text-text-muted">
                      Condición Reglamentaria (RAM)
                    </span>
                    
                    {(() => {
                      const c = resultado.condicion_ram;
                      const isPromo = c.condicion === 'PROMOCIONAL' || c.condicion === 'APROBADO';
                      const isReg = c.condicion === 'REGULAR';
                      const isLibre = c.condicion === 'LIBRE' || c.condicion === 'DESAPROBADO' || c.condicion === 'EN RIESGO';

                      let badgeColor = 'bg-slate-100 text-text-secondary border-slate-200';
                      let Icon = Sparkles;
                      if (isPromo) {
                        badgeColor = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-xs shadow-emerald-500/10';
                        Icon = CheckCircle2;
                      } else if (isReg) {
                        badgeColor = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 shadow-xs shadow-blue-500/10';
                        Icon = Clock;
                      } else if (isLibre) {
                        badgeColor = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 shadow-xs shadow-rose-500/10';
                        Icon = AlertTriangle;
                      }

                      return (
                        <div className="space-y-1 sm:text-right">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${badgeColor}`}>
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{c.condicion}</span>
                          </span>
                          {c.motivo && (
                            <p className="text-[11px] text-text-muted max-w-xs leading-snug">
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

            {/* Grilla Bento: Asistencia y Evaluaciones */}
            <div className={`grid grid-cols-1 ${
              resultado.config?.portal_mostrar_asistencia && resultado.config?.portal_mostrar_notas 
                ? 'lg:grid-cols-12' 
                : 'grid-cols-1'
            } gap-6`}>
              {/* Bloque Asistencia (Si está activo) */}
              {resultado.config?.portal_mostrar_asistencia && resultado.asistencia && (
                <div className={`${
                  resultado.config?.portal_mostrar_notas ? 'lg:col-span-5' : 'w-full'
                } backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 shadow-xs flex flex-col justify-between space-y-5`}>
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-text-primary">
                        Registro de Asistencia
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      RAM Docente
                    </span>
                  </div>

                  {/* Anillo de Porcentaje SVG */}
                  <div className="flex flex-col items-center justify-center py-2">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      {(() => {
                        const pct = Math.min(100, Math.max(0, resultado.asistencia.porcentaje || 0));
                        const radius = 54;
                        const circumference = 2 * Math.PI * radius;
                        const strokeDashoffset = circumference - (pct / 100) * circumference;

                        let strokeColor = '#10b981'; // emerald
                        if (pct < Number(resultado.asistencia.min_asist_reg || 70)) {
                          strokeColor = '#f43f5e'; // rose
                        } else if (pct < Number(resultado.asistencia.min_asist_promo || 80)) {
                          strokeColor = '#3b82f6'; // blue
                        }

                        return (
                          <>
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                              {/* Background track circle */}
                              <circle
                                cx="64"
                                cy="64"
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="10"
                                className="text-slate-100 dark:text-white/5"
                                fill="transparent"
                              />
                              {/* Progress bar circle */}
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
                              <span className="text-2xl sm:text-3xl font-mono font-black text-text-primary tracking-tight">
                                {pct}%
                              </span>
                              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                Asistencia
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Métricas: Presentes, Ausentes, Clases Dictadas */}
                  <div className="grid grid-cols-3 gap-2 text-center pt-2">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                      <span className="text-[10px] uppercase font-bold text-text-muted block">Dictadas</span>
                      <span className="text-base font-mono font-bold text-text-primary">
                        {resultado.asistencia.total_clases}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                      <span className="text-[10px] uppercase font-bold block">Presentes</span>
                      <span className="text-base font-mono font-black">
                        {resultado.asistencia.presentes}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400">
                      <span className="text-[10px] uppercase font-bold block">Ausentes</span>
                      <span className="text-base font-mono font-black">
                        {resultado.asistencia.ausentes}
                      </span>
                    </div>
                  </div>

                  {/* Requisitos mínimos de la materia */}
                  <div className="p-3 rounded-2xl bg-slate-100/60 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 text-[11px] text-text-muted space-y-1">
                    <div className="flex justify-between">
                      <span>Mínimo para Regularidad:</span>
                      <strong className="text-text-primary font-mono">{resultado.asistencia.min_asist_reg}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Mínimo para Promoción:</span>
                      <strong className="text-text-primary font-mono">{resultado.asistencia.min_asist_promo}%</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Bloque Evaluaciones y Notas (Si está activo) */}
              {resultado.config?.portal_mostrar_notas && (
                <div className={`${
                  resultado.config?.portal_mostrar_asistencia ? 'lg:col-span-7' : 'w-full'
                } backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 shadow-xs flex flex-col space-y-4`}>
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-text-primary">
                        Exámenes y Calificaciones
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                      {resultado.evaluaciones?.length || 0} Evaluaciones
                    </span>
                  </div>

                  {/* Lista de Tarjetas Bento con Evaluaciones */}
                  {(!resultado.evaluaciones || resultado.evaluaciones.length === 0) ? (
                    <div className="text-center py-8 space-y-2">
                      <BookOpen className="w-8 h-8 text-text-muted/40 mx-auto" />
                      <p className="text-xs font-semibold text-text-primary">Sin evaluaciones registradas</p>
                      <p className="text-[11px] text-text-muted max-w-xs mx-auto">
                        El docente aún no ha cargado exámenes o trabajos prácticos en esta cátedra.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {resultado.evaluaciones.map((ev, index) => {
                        const hasNota = ev.valor !== null && ev.valor !== undefined;
                        const notaNum = hasNota ? Number(ev.valor) : null;
                        const isAprobado = notaNum !== null && notaNum >= 4;
                        const isPromo = notaNum !== null && notaNum >= 7;

                        let gradeColor = 'text-text-muted';
                        let gradeBg = 'bg-slate-100 dark:bg-white/5';
                        if (hasNota) {
                          if (isPromo) {
                            gradeColor = 'text-emerald-700 dark:text-emerald-400 font-black';
                            gradeBg = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/50';
                          } else if (isAprobado) {
                            gradeColor = 'text-blue-700 dark:text-blue-400 font-bold';
                            gradeBg = 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700/50';
                          } else {
                            gradeColor = 'text-rose-700 dark:text-rose-400 font-black';
                            gradeBg = 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700/50';
                          }
                        }

                        return (
                          <div 
                            key={ev.id || index}
                            className="p-4 rounded-2xl bg-slate-50/60 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 flex flex-col justify-between gap-3 hover:border-primary/30 transition-colors"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                  ev.tipo === 'PARCIAL' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' :
                                  ev.tipo === 'TP' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
                                  'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                                }`}>
                                  {ev.tipo}
                                </span>
                                {ev.fecha_entrega && (
                                  <span className="text-[10px] font-mono text-text-muted">
                                    {ev.fecha_entrega}
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs sm:text-sm font-semibold text-text-primary leading-snug line-clamp-2">
                                {ev.titulo}
                              </h4>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-white/5">
                              <span className="text-[10px] uppercase font-bold text-text-muted">
                                Calificación
                              </span>
                              {hasNota ? (
                                <span className={`px-2.5 py-1 rounded-xl text-xs sm:text-sm font-mono border ${gradeBg} ${gradeColor}`}>
                                  {notaNum.toFixed(2)} / 10
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-xl text-[11px] font-mono bg-slate-100 dark:bg-white/5 text-text-muted">
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

            {/* Aviso si el docente no habilitó ninguna sección */}
            {!resultado.config?.portal_mostrar_asistencia && !resultado.config?.portal_mostrar_notas && !resultado.config?.portal_mostrar_condicion && (
              <div className="p-8 text-center rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 space-y-2">
                <p className="text-sm font-bold text-text-primary">Sin información académica visible</p>
                <p className="text-xs text-text-muted max-w-sm mx-auto">
                  El docente tiene el portal habilitado pero ha pausado temporalmente la visualización de asistencias y calificaciones.
                </p>
              </div>
            )}

            {/* Botón Reubicado y Estilizado: Consultar otro DNI */}
            <button
              type="button"
              onClick={handleResetSearch}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 shadow-md transition-all duration-200 hover:scale-105 active:scale-95 mx-auto mt-6 group cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
              <span className="font-semibold text-xs sm:text-sm">Consultar otro DNI</span>
            </button>
          </div>
        )}
      </main>

      {/* Pie Institucional del Portal */}
      <footer className="mt-auto py-6 border-t border-slate-200/60 dark:border-white/5 px-4 text-center">
        <p className="text-[11px] text-text-muted">
          PlanillaDocente · Sistema Integral de Gestión Académica y Asistencia para Docentes
        </p>
      </footer>
    </div>
  );
}
