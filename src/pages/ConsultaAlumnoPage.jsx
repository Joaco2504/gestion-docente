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
  ExternalLink
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
 * ConsultaAlumnoPage - Portal de Consulta Académica Oficial Korum (Diseño Ultraminimalista)
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
      <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
        <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Cátedra no encontrada o inactiva
  if (!catedra) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
        <div className="max-w-sm w-full bg-surface border border-surface-border rounded-2xl p-6 text-center space-y-3 shadow-xs">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-text-primary">Cátedra no encontrada</h2>
          <p className="text-xs text-text-muted leading-relaxed">
            El enlace no corresponde a una materia activa en el sistema.
          </p>
        </div>
      </div>
    );
  }

  if (!catedra.portal_activo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
        <div className="max-w-sm w-full bg-surface border border-surface-border rounded-2xl p-6 text-center space-y-3 shadow-xs">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
          <h2 className="text-base font-bold text-text-primary">Consulta desactivada</h2>
          <p className="text-xs text-text-muted leading-relaxed">
            El docente de <strong>{catedra.nombre}</strong> no tiene habilitada la consulta pública de calificaciones en este momento.
          </p>
        </div>
      </div>
    );
  }

  const institucionNombre = catedra.instituciones?.nombre || catedra.institucion_nombre || 'Institución Educativa';

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-text-primary antialiased selection:bg-emerald-500/20">
      {/* 1. Cabecera Compacta */}
      <header className="w-full bg-surface border-b border-surface-border px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <img 
            src="/dashboard-logo.png" 
            alt="Korum" 
            className="w-7 h-7 rounded-lg object-contain shrink-0" 
          />
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-text-primary truncate leading-tight">
              Consulta de Estado Académico
            </h1>
            <p className="text-[11px] text-text-muted truncate">
              {catedra.nombre} · {institucionNombre}
            </p>
          </div>
        </div>

        <ThemeToggle />
      </header>

      {/* 2. Cuerpo Utilitario */}
      <main className="max-w-xl w-full mx-auto px-4 py-6 sm:py-8 flex-1 flex flex-col justify-start">
        {!resultado ? (
          /* PANTALLA DE BÚSQUEDA DIRECTA */
          <div className="bg-surface border border-surface-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 animate-fadeIn">
            <div>
              <h2 className="text-sm font-bold text-text-primary">
                Ingresá tu DNI
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Consulta inmediata de condición reglamentaria, asistencia y notas.
              </p>
            </div>

            <form onSubmit={handleConsultarDni} className="space-y-3">
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formattedDni}
                  onChange={handleDniInputFormatting}
                  placeholder="Ej: 42.123.456"
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-base font-mono font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 text-center tracking-wider"
                />
              </div>

              {searchError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{searchError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-primary hover:bg-primary-hover active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 touch-target-44 min-h-[44px]"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Consultando...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Consultar Estado</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* FICHA DE RESULTADOS COMPACTA (1 PANTALLA) */
          <div className="space-y-4 animate-fadeIn">
            {/* Encabezado del Alumno y Botón Volver */}
            <div className="flex items-center justify-between gap-3 bg-surface border border-surface-border rounded-2xl p-4 shadow-xs">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-text-primary truncate">
                  {resultado.estudiante?.apellido}, {resultado.estudiante?.nombre}
                </h2>
                <div className="flex items-center gap-2 text-xs font-mono text-text-muted mt-0.5">
                  <span>DNI {formatDniDisplay(resultado.estudiante?.dni)}</span>
                  <span>•</span>
                  <span>{catedra.nombre}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetSearch}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-border text-xs font-bold text-text-muted hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 touch-target-44 min-h-[38px] cursor-pointer"
                title="Consultar otro número de DNI"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver</span>
              </button>
            </div>

            {/* Tarjeta Principal de Condición Reglamentaria */}
            {resultado.config?.portal_mostrar_condicion && resultado.condicion_ram && (
              <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase font-bold text-text-muted block">
                    Condición Académica
                  </span>
                  <p className="text-xs text-text-muted">
                    {resultado.condicion_ram.motivo || 'Situación académica según RAM provincial.'}
                  </p>
                </div>

                {(() => {
                  const cond = (resultado.condicion_ram.condicion || '').toUpperCase();
                  const isPromo = cond.includes('PROMO') || cond.includes('APROB');
                  const isReg = cond === 'REGULAR';
                  const isEquiv = cond.includes('EQUIV') || resultado.estudiante?.es_equivalencia;

                  let badgeColor = 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20';
                  if (isEquiv || isPromo) {
                    badgeColor = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
                  } else if (isReg) {
                    badgeColor = 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20';
                  }

                  return (
                    <span className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-mono font-black uppercase tracking-wider border shrink-0 ${badgeColor}`}>
                      {cond}
                    </span>
                  );
                })()}
              </div>
            )}

            {/* Bloque de Asistencia Acumulada */}
            {resultado.config?.portal_mostrar_asistencia && resultado.asistencia && (
              <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                    <Calendar className="w-4 h-4 text-primary shrink-0" />
                    <span>Asistencia Acumulada</span>
                  </div>
                  <span className="text-xs font-mono text-text-muted">
                    {resultado.asistencia.presentes ?? 0} de {resultado.asistencia.total_clases ?? 0} clases
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black font-mono text-text-primary">
                    {resultado.asistencia.porcentaje ?? 0}%
                  </span>
                  <div className="text-right">
                    <span className="text-[11px] font-mono text-text-muted block">
                      {resultado.estudiante?.tiene_certificado_trabajo ? (
                        <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                          <Briefcase className="w-3 h-3" /> Meta 60% (Laboral)
                        </span>
                      ) : (
                        <span>Meta 70% (Regular)</span>
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
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
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

            {/* Lista Compacta de Evaluaciones y TPs */}
            {resultado.config?.portal_mostrar_notas && (
              <div className="bg-surface border border-surface-border rounded-2xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-surface-border pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                    <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                    <span>Calificaciones y Evaluaciones</span>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted uppercase">
                    {resultado.evaluaciones?.length || 0} Registradas
                  </span>
                </div>

                {(!resultado.evaluaciones || resultado.evaluaciones.length === 0) ? (
                  <p className="text-xs text-text-muted text-center py-4">
                    Sin evaluaciones registradas por el docente para este ciclo.
                  </p>
                ) : (
                  <div className="divide-y divide-surface-border">
                    {resultado.evaluaciones.map((ev, idx) => {
                      const hasNota = ev.valor !== null && ev.valor !== undefined;
                      const notaNum = hasNota ? Number(ev.valor) : null;
                      const isAprobado = notaNum !== null && notaNum >= 4;

                      return (
                        <div key={ev.id || idx} className="py-2.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-text-primary block truncate">
                              {ev.titulo}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted mt-0.5">
                              <span className="uppercase">{ev.tipo || 'EVAL'}</span>
                              {ev.fecha_entrega && <span>· {ev.fecha_entrega}</span>}
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            {hasNota ? (
                              <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-mono font-bold border ${
                                isAprobado
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                              }`}>
                                {notaNum.toFixed(1)} / 10
                              </span>
                            ) : ev.estado === 'NO_ENTREGO' ? (
                              <span className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                NO ENTREGÓ
                              </span>
                            ) : ev.estado === 'AUSENTE' ? (
                              <span className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                                AUSENTE
                              </span>
                            ) : (
                              <span className="text-[11px] font-mono text-text-muted">
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
        )}
      </main>

      {/* Footer Sobrio */}
      <footer className="py-4 border-t border-surface-border text-center text-[11px] font-mono text-text-muted">
        Korum · Consulta de Estado Académico
      </footer>
    </div>
  );
}

export { ConsultaAlumnoPage };
