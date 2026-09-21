import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
  ShieldCheck, 
  Shield, 
  UserCheck, 
  Lock, 
  CreditCard, 
  FileText, 
  RotateCw, 
  Calendar, 
  Check, 
  Eye, 
  Heart, 
  Copy, 
  Link2 as IconLink, 
  Zap,
  BookOpen
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
import { WaveDniInput } from '../components/portal/WaveDniInput';

/**
 * Composición gráfica vectorial de estudiante con credencial y escudo de seguridad
 */
function StudentCredentialGraphic() {
  return (
    <div className="relative w-44 h-36 shrink-0 hidden sm:flex items-center justify-center">
      {/* Halo ambiental esmeralda */}
      <div className="absolute w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
      
      {/* Tarjeta de Credencial Estudiantil */}
      <div className="relative w-36 h-28 bg-white/95 dark:bg-slate-800/90 backdrop-blur border border-emerald-500/30 rounded-2xl p-3 shadow-lg transform -rotate-3 transition-transform hover:rotate-0 duration-300">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="space-y-0.5">
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
            <div className="w-8 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
          </div>
        </div>
        <div className="w-full h-1.5 bg-emerald-500/20 rounded-full mb-2 overflow-hidden">
          <div className="w-3/4 h-full bg-emerald-500 rounded-full" />
        </div>
        <div className="flex items-center justify-between text-[8px] font-mono text-slate-400">
          <span>DNI ••••••••</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">ACTIVO</span>
        </div>
      </div>

      {/* Escudo Flotante Esmeralda */}
      <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30 border-2 border-white dark:border-slate-900 flex items-center justify-center">
        <ShieldCheck className="w-5 h-5" />
      </div>
    </div>
  );
}

/**
 * ConsultaAlumnoPage - Portal de Consulta Académica Oficial Korum
 * Ruta: /consulta/:catedraId
 */
export default function ConsultaAlumnoPage() {
  const { catedraId } = useParams();

  // Estados de carga e interacción
  const [initLoading, setInitLoading] = useState(true);
  const [catedra, setCatedra] = useState(null);
  const [formattedDni, setFormattedDni] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [resultado, setResultado] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [consultaTimestamp, setConsultaTimestamp] = useState('');

  const cajaDifusionUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(cajaDifusionUrl);
      setCopiedLink(true);
      toast.success('Enlace copiado al portapapeles');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  };

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
        setConsultaTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
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
              <img src="/dashboard.ico" alt="Korum" className="w-7 h-7 object-contain rounded-xl" />
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
            El equipo docente de <strong>{catedra.nombre}</strong> ({catedra.instituciones?.nombre || catedra.institucion_nombre || 'Institución'}) aún no ha habilitado la consulta pública de calificaciones o la ha pausado temporalmente.
          </p>
          <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-mono">
            💡 Consulta con tu profesor en el aula para conocer tu situación académica reglamentaria.
          </div>
        </div>
      </div>
    );
  }

  const institucionNombre = catedra.instituciones?.nombre || catedra.institucion_nombre || 'I.E.S Belén';
  const modalidadLabel = catedra.modalidad || 'ANUAL';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#080C14] text-slate-900 dark:text-slate-100 antialiased selection:bg-emerald-500/20 selection:text-emerald-500">
      
      {/* ========================================================================= */}
      {/* PARTE 1: HEADER INSTITUCIONAL Y BARRA DE SEGURIDAD                         */}
      {/* ========================================================================= */}
      <header className="w-full bg-white dark:bg-[#0F172A] border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-sm sticky top-0 z-30">
        {/* Extremo Izquierdo */}
        <div className="flex items-center gap-3">
          <img 
            src="/dashboard.ico" 
            alt="Korum" 
            className="w-8 h-8 rounded-xl object-contain drop-shadow-xs" 
          />
          <div>
            <div className="flex items-center">
              <span className="font-bold text-slate-900 dark:text-white text-base leading-none">
                Korum
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-semibold uppercase tracking-wider ml-2">
                PORTAL ALUMNOS
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              {institucionNombre}
            </p>
          </div>
        </div>

        {/* Extremo Derecho */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-mono text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="hidden xs:inline">Cifrado</span> SSL / RLS
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* ========================================================================= */}
      {/* CUERPO PRINCIPAL DEL PORTAL                                               */}
      {/* ========================================================================= */}
      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 flex-1">
        
        {/* ========================================================================= */}
        {/* PARTE 2: HERO BANNER INSTITUCIONAL ("TU INFORMACIÓN, SEGURA Y ACCESIBLE")  */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 border border-emerald-500/20 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          {/* Lado Izquierdo */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold tracking-widest text-emerald-700 dark:text-emerald-400 uppercase block">
                CONSULTA DE CONDICIÓN ACADÉMICA
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1 mb-2">
                Tu información, segura y accesible
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                Ingresá tu DNI para consultar tu número de documento, condición reglamentaria y situación académica en tiempo real en <strong>{catedra.nombre}</strong>.
              </p>
            </div>
          </div>

          {/* Lado Derecho */}
          <StudentCredentialGraphic />
        </section>

        {/* ========================================================================= */}
        {/* PARTE 3: MATRIZ DE CONSULTA Y PRIVACIDAD (FORMULARIO 2 COLUMNAS)         */}
        {/* ========================================================================= */}
        {!resultado ? (
          <section className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch animate-fadeIn">
            {/* Columna Izquierda (md:col-span-7) - Formulario DNI */}
            <div className="md:col-span-7 bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col justify-between">
              <div>
                {/* Encabezado del Formulario */}
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 dark:text-white text-base">
                      Ingresá tu DNI
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Solo vos podrás ver tu información.
                    </p>
                  </div>
                </div>

                {/* Formulario */}
                <form onSubmit={handleConsultarDni} className="mt-4">
                  {/* Campo DNI con animación Wave Floating Label */}
                  <WaveDniInput
                    value={formattedDni}
                    onChange={handleDniInputFormatting}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConsultarDni();
                      }
                    }}
                    onClear={() => setFormattedDni('')}
                  />

                  {/* Micro-nota de respaldo */}
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-4">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Tu información está protegida con tecnología de cifrado.</span>
                  </div>

                  {/* Mensaje de Error si ocurre */}
                  {searchError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 text-left mb-4 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{searchError}</span>
                    </div>
                  )}

                  {/* Botón Primario CTA */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span>Verificando condición...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Consultar condición</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Caja de difusión rápida */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="truncate pr-2 font-mono text-[11px]">
                  {cajaDifusionUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="shrink-0 flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                  title="Copiar enlace de acceso directo"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            {/* Columna Derecha (md:col-span-5) - Privacidad y Seguridad */}
            <div className="md:col-span-5 bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base mt-3 mb-1">
                  Privacidad y seguridad
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                  El acceso a tu información es personal y se realiza de forma segura. No se almacena tu DNI en el sistema.
                </p>
              </div>

              {/* 3 Columnas de Garantías */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
                <div className="flex flex-col items-center">
                  <Shield className="w-4 h-4 text-emerald-500 mx-auto mb-1.5" />
                  <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">
                    Conexión segura (SSL / RLS)
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <UserCheck className="w-4 h-4 text-emerald-500 mx-auto mb-1.5" />
                  <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">
                    Solo vos podés ver tus datos
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <Lock className="w-4 h-4 text-emerald-500 mx-auto mb-1.5" />
                  <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">
                    Sin registro de consultas
                  </span>
                </div>
              </div>
            </div>
          </section>
        ) : (
          /* ========================================================================= */
          /* PARTE 4: CONTENEDOR DE RESULTADOS ACADÉMICOS ("RESULTADO DE LA CONSULTA")  */
          /* ========================================================================= */
          <section className="space-y-6 animate-fadeInUp">
            
            {/* 1. Barra de Estado del Resultado */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500 inline" />
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Resultado de la consulta
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <span>Última actualización: {consultaTimestamp}</span>
                <button
                  type="button"
                  onClick={handleConsultarDni}
                  className="p-1 hover:text-emerald-500 transition-colors cursor-pointer"
                  title="Actualizar datos"
                >
                  <RotateCw className="w-3.5 h-3.5 hover:rotate-180 transition-transform duration-500" />
                </button>
              </div>
            </div>

            {/* 2. Tarjeta Bento de Identidad del Alumno */}
            <div className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              {/* Lado Izquierdo (Datos personales) */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-lg flex items-center justify-center shrink-0 font-mono">
                  {resultado.estudiante?.nombre?.[0] || 'A'}
                  {resultado.estudiante?.apellido?.[0] || 'L'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {resultado.estudiante?.apellido}, {resultado.estudiante?.nombre}
                  </h2>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block mt-0.5">
                    DNI: {formatDniDisplay(resultado.estudiante?.dni)}
                  </span>
                  <div className="text-[10px] font-mono uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400 mt-2 flex flex-wrap items-center gap-1.5">
                    <span>ESTUDIANTE REGULAR</span>
                    <span>•</span>
                    <span>{catedra.nombre}</span>
                    <span>•</span>
                    <span>{catedra.nivel || 'TERCIARIO'} ({modalidadLabel})</span>
                  </div>
                </div>
              </div>

              {/* Lado Derecho (Dictamen de Condición Reglamentaria) */}
              {resultado.config?.portal_mostrar_condicion && resultado.condicion_ram && (
                <div className="flex flex-col items-start sm:items-end gap-1 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-mono text-slate-400 text-right uppercase tracking-wider block">
                    Condición Reglamentaria
                  </span>
                  
                  {(() => {
                    const c = resultado.condicion_ram;
                    const isPromo = c.condicion === 'PROMOCIONAL' || c.condicion === 'PROMOCIONADO' || c.condicion === 'APROBADO';
                    const isReg = c.condicion === 'REGULAR';
                    const isLibre = c.condicion === 'LIBRE' || c.condicion === 'DESAPROBADO' || c.condicion === 'EN RIESGO';

                    if (isPromo) {
                      return (
                        <div className="space-y-1 sm:text-right">
                          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs sm:text-sm font-mono font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>{c.condicion}</span>
                          </span>
                          <p className="text-[11px] text-slate-400 text-right">
                            {c.motivo || 'Cumple con requisitos de promoción directa.'}
                          </p>
                        </div>
                      );
                    }

                    if (isReg) {
                      return (
                        <div className="space-y-1 sm:text-right">
                          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs sm:text-sm font-mono font-bold uppercase tracking-wider bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300">
                            <Check className="w-4 h-4 shrink-0" />
                            <span>{c.condicion}</span>
                          </span>
                          <p className="text-[11px] text-slate-400 text-right">
                            {c.motivo || 'Cumple con el mínimo de asistencia y parciales.'}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-1 sm:text-right">
                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs sm:text-sm font-mono font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{c.condicion}</span>
                        </span>
                        <p className="text-[11px] text-slate-400 text-right">
                          {c.motivo || 'No alcanza regularidad requerida por RAM.'}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* 3. Sub-Grilla 50/50: Asistencia vs Calificaciones */}
            <div className={`grid grid-cols-1 ${
              resultado.config?.portal_mostrar_asistencia && resultado.config?.portal_mostrar_notas 
                ? 'lg:grid-cols-12' 
                : 'grid-cols-1'
            } gap-6 items-stretch`}>
              
              {/* Tarjeta 1: Asistencia Registrada */}
              {resultado.config?.portal_mostrar_asistencia && resultado.asistencia && (
                <div className={`${
                  resultado.config?.portal_mostrar_notas ? 'lg:col-span-6' : 'w-full'
                } bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4`}>
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-500" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Asistencia Registrada
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      RAM Docente
                    </span>
                  </div>

                  {/* Donut Chart destacado */}
                  <div className="flex flex-col items-center justify-center py-2">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      {(() => {
                        const pct = Math.min(100, Math.max(0, resultado.asistencia.porcentaje || 0));
                        const radius = 52;
                        const circumference = 2 * Math.PI * radius;
                        const strokeDashoffset = circumference - (pct / 100) * circumference;

                        let strokeColor = '#10B981'; // emerald
                        if (pct < Number(resultado.asistencia.min_asist_reg || 70)) {
                          strokeColor = '#EF4444'; // rose
                        } else if (pct < Number(resultado.asistencia.min_asist_promo || 80)) {
                          strokeColor = '#0284C7'; // sky
                        }

                        return (
                          <>
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                              <circle
                                cx="64"
                                cy="64"
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="9"
                                className="text-slate-100 dark:text-slate-800"
                                fill="transparent"
                              />
                              <circle
                                cx="64"
                                cy="64"
                                r={radius}
                                stroke={strokeColor}
                                strokeWidth="9"
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

                  {/* 3 Contadores en píldoras */}
                  <div className="grid grid-cols-3 gap-2 text-center pt-2 font-mono">
                    <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                      <span className="text-[10px] uppercase font-bold block">Presentes</span>
                      <span className="text-base font-extrabold">
                        {resultado.asistencia.presentes ?? 0}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Dictadas</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {resultado.asistencia.total_clases ?? 0}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400">
                      <span className="text-[10px] uppercase font-bold block">Ausentes</span>
                      <span className="text-base font-extrabold">
                        {resultado.asistencia.ausentes ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* Pie con umbrales RAM */}
                  <div className="text-[10px] font-mono text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                    Mínimo Regularidad: <strong className="text-slate-700 dark:text-slate-300">{resultado.asistencia.min_asist_reg ?? 70}%</strong> | Mínimo Promoción: <strong className="text-slate-700 dark:text-slate-300">{resultado.asistencia.min_asist_promo ?? 80}%</strong>
                  </div>
                </div>
              )}

              {/* Tarjeta 2: Calificaciones y Evaluaciones */}
              {resultado.config?.portal_mostrar_notas && (
                <div className={`${
                  resultado.config?.portal_mostrar_asistencia ? 'lg:col-span-6' : 'w-full'
                } bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4`}>
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-emerald-500" />
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
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Sin notas registradas aún
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        Tu docente no ha publicado calificaciones para este período.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
                      {resultado.evaluaciones.map((ev, index) => {
                        const hasNota = ev.valor !== null && ev.valor !== undefined;
                        const notaNum = hasNota ? Number(ev.valor) : null;
                        const isAprobado = notaNum !== null && notaNum >= 4;
                        const isPromo = notaNum !== null && notaNum >= 7;

                        return (
                          <div 
                            key={ev.id || index}
                            className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {ev.tipo || 'EVAL'}
                                </span>
                                {ev.fecha_entrega && (
                                  <span className="text-[10px] font-mono text-slate-400">
                                    {ev.fecha_entrega}
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                                {ev.titulo}
                              </h4>
                            </div>

                            <div className="shrink-0 text-right">
                              {hasNota ? (
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${
                                  isPromo
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                    : isAprobado
                                      ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30'
                                      : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                                }`}>
                                  CALIFICACIÓN {notaNum.toFixed(1)} / 10
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-400">
                                  Pendiente
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="text-[10px] font-mono text-slate-400 text-center pt-2 border-t border-slate-100 dark:border-slate-800">
                    Aprobación: <strong>4+ / 10</strong> | Promoción: <strong>7+ / 10</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Botón: Consultar otro DNI */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleResetSearch}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-200 active:scale-95 cursor-pointer text-xs sm:text-sm font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Consultar otro DNI</span>
              </button>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* PARTE 5: FRANJA INFERIOR DE 3 PILARES (EXPERIENCIA KORUM)                  */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Rápido</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Obtené la información en segundos.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Seguro</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Tu información está protegida.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Simple</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Una sola vista, todo lo que necesitás.</p>
            </div>
          </div>
        </section>

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
