import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  Calendar, 
  Check, 
  RotateCw,
  GraduationCap,
  Briefcase,
  FileText,
  ExternalLink,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import ThemeToggle from '../components/common/ThemeToggle';
import { 
  getCatedraPortalConfig, 
  consultarEstadoAlumno, 
  formatDniDisplay, 
  normalizeDni 
} from '../services/studentPortalService';
import { handleAppError } from '../utils/handleAppError';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

/**
 * ConsultaAlumnoPage - Portal de Consulta Académica Oficial Korum
 * Ruta: /consulta/:catedraId
 */
export default function ConsultaAlumnoPage() {
  useDocumentTitle('Consulta de Estado Académico');
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
      <main className="max-w-xl w-full mx-auto px-4 py-8 sm:py-12 flex-1 flex flex-col justify-center">
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
          /* VISTA DE RESULTADOS DEL ALUMNO (TARJETAS BENTO LIMPIAS) */
          <div className="space-y-4 animate-fadeIn">
            {/* Encabezado del Alumno y Botón Volver */}
            <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5">
                  <span>📚 {catedra.nombre}</span>
                  {consultaTimestamp && <span className="text-slate-400 font-mono">· {consultaTimestamp} hs</span>}
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                  {resultado.estudiante?.apellido}, {resultado.estudiante?.nombre}
                </h2>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  <span>DNI {formatDniDisplay(resultado.estudiante?.dni)}</span>
                  <span>•</span>
                  <span className="truncate">{institucionNombre}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetSearch}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 touch-target-44 min-h-[38px] cursor-pointer"
                title="Consultar otro número de DNI"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Nueva consulta</span>
              </button>
            </div>

            {/* Tarjeta Bento 1: Condición Reglamentaria */}
            {resultado.config?.portal_mostrar_condicion && resultado.condicion_ram && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block">
                    Condición Académica Reglamentaria
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {resultado.condicion_ram.motivo || 'Situación académica según RAM provincial.'}
                  </p>
                </div>

                {(() => {
                  const cond = (resultado.condicion_ram.condicion || '').toUpperCase();
                  const isPromo = cond.includes('PROMO') || cond.includes('APROB');
                  const isReg = cond === 'REGULAR';
                  const isEquiv = cond.includes('EQUIV') || resultado.estudiante?.es_equivalencia;

                  let badgeColor = 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25';
                  if (isEquiv || isPromo) {
                    badgeColor = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25';
                  } else if (isReg) {
                    badgeColor = 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25';
                  }

                  return (
                    <span className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-mono font-black uppercase tracking-wider border shrink-0 ${badgeColor}`}>
                      {cond}
                    </span>
                  );
                })()}
              </div>
            )}

            {/* Tarjeta Bento 2: Barra de Progreso de Asistencia con Meta */}
            {resultado.config?.portal_mostrar_asistencia && resultado.asistencia && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Asistencia Acumulada</span>
                  </div>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {resultado.asistencia.presentes ?? 0} de {resultado.asistencia.total_clases ?? 0} clases
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                    {resultado.asistencia.porcentaje ?? 0}%
                  </span>
                  <div className="text-right">
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block">
                      {resultado.estudiante?.tiene_certificado_trabajo ? (
                        <span className="text-blue-600 dark:text-blue-400 font-bold inline-flex items-center gap-1">
                          <Briefcase className="w-3 h-3" /> Meta 60% Cert. Laboral
                        </span>
                      ) : (
                        <span>Meta 70% Regularidad</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Barra Visual de Progreso */}
                {(() => {
                  const pct = Math.min(100, Math.max(0, resultado.asistencia.porcentaje ?? 0));
                  const meta = resultado.estudiante?.tiene_certificado_trabajo ? 60 : 70;
                  const isOk = pct >= meta;
                  const isAlBorde = pct >= meta && pct < meta + 5;

                  return (
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          !isOk 
                            ? 'bg-rose-500' 
                            : isAlBorde 
                            ? 'bg-amber-500' 
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Tarjeta Bento 3: Tabla Ordenada de Calificaciones */}
            {resultado.config?.portal_mostrar_notas && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <GraduationCap className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Calificaciones (Parciales y TPs)</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                    {resultado.evaluaciones?.length || 0} Evaluaciones
                  </span>
                </div>

                {(!resultado.evaluaciones || resultado.evaluaciones.length === 0) ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
                    Sin evaluaciones registradas por el docente para este ciclo.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-mono uppercase text-slate-400 dark:text-slate-500">
                          <th className="pb-2 font-semibold">Instancia</th>
                          <th className="pb-2 font-semibold hidden sm:table-cell">Tipo</th>
                          <th className="pb-2 font-semibold text-right">Calificación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                        {resultado.evaluaciones.map((ev, idx) => {
                          const hasNota = ev.valor !== null && ev.valor !== undefined;
                          const notaNum = hasNota ? Number(ev.valor) : null;
                          const isAprobado = notaNum !== null && notaNum >= 4;

                          return (
                            <tr key={ev.id || idx}>
                              <td className="py-2.5 pr-2">
                                <span className="font-bold text-slate-900 dark:text-white block truncate max-w-[200px] sm:max-w-[260px]">
                                  {ev.titulo}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 sm:hidden">
                                  {ev.tipo || 'EVAL'} {ev.fecha_entrega ? `· ${ev.fecha_entrega}` : ''}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 hidden sm:table-cell">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px] font-semibold uppercase">
                                  {ev.tipo || 'EVAL'}
                                </span>
                              </td>
                              <td className="py-2.5 pl-2 text-right whitespace-nowrap">
                                {hasNota ? (
                                  <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold border ${
                                    isAprobado
                                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                      : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                                  }`}>
                                    {notaNum.toFixed(1)} / 10
                                  </span>
                                ) : ev.estado === 'NO_ENTREGO' ? (
                                  <span className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    N/E (No entregó)
                                  </span>
                                ) : ev.estado === 'AUSENTE' ? (
                                  <span className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                    Aus. (Ausente)
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-mono text-slate-400">
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
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Sobrio */}
      <footer className="py-4 border-t border-slate-200/80 dark:border-slate-800 text-center text-[11px] font-mono text-slate-500 dark:text-slate-400">
        Korum · Consulta de Estado Académico
      </footer>
    </div>
  );
}

export { ConsultaAlumnoPage };
