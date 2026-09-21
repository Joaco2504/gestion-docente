import React, { useState, useEffect } from 'react';
import { 
  Users,
  ShieldCheck,
  Eye,
  EyeOff,
  CalendarCheck,
  GraduationCap,
  Award,
  FileText,
  Receipt,
  Lightbulb,
  ArrowRight,
  X,
  Globe,
  Share2,
  QrCode,
  Copy,
  Check,
  Sparkles,
  Save,
  Smartphone,
  BookOpen,
  Link2 as LinkIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { handleAppError } from '../../utils/handleAppError';
import QRCodeDisplay from '../common/QRCodeDisplay';
import { 
  getCatedraPortalConfig, 
  saveCatedraPortalConfig,
  slugifyCatedra 
} from '../../services/studentPortalService';
import { useAuth } from '../../context/AuthContext';

/**
 * Switch accesible y estilizado con soporte de microinteracciones Korum.
 */
function Switch({ checked, onChange, disabled = false, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${
        checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

/**
 * PortalSettingsModal / PortalConfigModal - Panel expandido con Split Live Preview
 * para la configuración del Portal Estudiantil.
 */
export default function PortalSettingsModal({
  isOpen,
  onClose,
  catedra,
  onCatedraUpdated
}) {
  const { user, isDemo } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedType, setCopiedType] = useState(''); // 'link' | 'alias' | ''
  const [showQR, setShowQR] = useState(false);

  // Estados de configuración reactivos
  const [portalActivo, setPortalActivo] = useState(false);
  const [mostrarAsistencia, setMostrarAsistencia] = useState(true);
  const [mostrarNotas, setMostrarNotas] = useState(true);
  const [mostrarCondicion, setMostrarCondicion] = useState(true);
  const [mostrarInfoAcademica, setMostrarInfoAcademica] = useState(true);
  const [mostrarAranceles, setMostrarAranceles] = useState(false);
  const [alias, setAlias] = useState('');

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !showQR) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showQR, onClose]);

  // Cargar configuración inicial
  useEffect(() => {
    async function loadConfig() {
      if (!catedra?.id) return;
      setLoading(true);
      try {
        const config = await getCatedraPortalConfig(catedra.id, isDemo);
        if (config) {
          setPortalActivo(Boolean(config.portal_activo));
          setMostrarAsistencia(config.portal_mostrar_asistencia !== false);
          setMostrarNotas(config.portal_mostrar_notas !== false);
          setMostrarCondicion(config.portal_mostrar_condicion !== false);
          setMostrarInfoAcademica(config.portal_mostrar_info_academica !== false);
          setMostrarAranceles(Boolean(config.portal_mostrar_aranceles));
          setAlias(config.alias || catedra?.alias || slugifyCatedra(catedra?.nombre || ''));
        } else {
          setAlias(catedra?.alias || slugifyCatedra(catedra?.nombre || ''));
        }
      } catch (err) {
        handleAppError(err, 'PortalSettingsModal / loadConfig', user);
      } finally {
        setLoading(false);
      }
    }

    if (isOpen) {
      loadConfig();
    }
  }, [isOpen, catedra?.id, catedra?.nombre, catedra?.alias, isDemo, user]);

  if (!isOpen) return null;

  // Slug amigable y URL limpia del portal público
  const activeSlug = alias.trim() || catedra?.alias || slugifyCatedra(catedra?.nombre || 'catedra');
  const portalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/consulta/${activeSlug}`
    : `https://app.planilladocente.com/consulta/${activeSlug}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopiedType('link');
      toast.success('¡Enlace limpio copiado al portapapeles!', {
        description: 'Compártelo con tus alumnos para que consulten su estado directamente.'
      });
      setTimeout(() => setCopiedType(''), 2500);
    } catch {
      toast.error('No se pudo copiar el enlace al portapapeles.');
    }
  };

  const handleCopyAlias = async () => {
    try {
      await navigator.clipboard.writeText(activeSlug);
      setCopiedType('alias');
      toast.success('¡Alias de cátedra copiado al portapapeles!', {
        description: `Código slug: ${activeSlug}`
      });
      setTimeout(() => setCopiedType(''), 2500);
    } catch {
      toast.error('No se pudo copiar el alias al portapapeles.');
    }
  };

  const handleWhatsAppShare = () => {
    const text = `📢 Estimados estudiantes de *${catedra?.nombre || 'la cátedra'}*:\n\nYa pueden consultar su situación académica (asistencias y notas actualizadas) ingresando su número de DNI en nuestro portal oficial:\n👉 ${portalUrl}\n\nNo requiere registrarse ni contraseña. ¡Saludos!`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const newConfig = {
        portal_activo: portalActivo,
        portal_mostrar_asistencia: mostrarAsistencia,
        portal_mostrar_notas: mostrarNotas,
        portal_mostrar_condicion: mostrarCondicion,
        portal_mostrar_info_academica: mostrarInfoAcademica,
        portal_mostrar_aranceles: mostrarAranceles,
        alias: activeSlug
      };

      await saveCatedraPortalConfig(catedra.id, newConfig, isDemo);

      if (onCatedraUpdated) {
        onCatedraUpdated({
          ...catedra,
          ...newConfig
        });
      }

      toast.success(
        portalActivo 
          ? 'Portal de alumnos activado y configuración guardada.' 
          : 'Configuración guardada (Portal actualmente pausado).'
      );
      onClose();
    } catch (err) {
      handleAppError(err, 'PortalSettingsModal / Guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Envoltorio Modal de dimensiones amplias */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-fadeIn"
        onClick={(e) => {
          if (e.target === e.currentTarget && !showQR) onClose();
        }}
      >
        <div 
          className="relative w-full max-w-5xl xl:max-w-6xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ========================================================================= */}
          {/* PARTE 1: CABECERA DEL DIÁLOGO                                             */}
          {/* ========================================================================= */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40 shrink-0">
            {/* Lado Izquierdo */}
            <div className="flex items-center min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mr-3 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg truncate leading-tight">
                  Portal Público de Consulta para Alumnos
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  Controlá qué información pueden ver tus estudiantes en {catedra?.nombre || 'la cátedra'}.
                </p>
              </div>
            </div>

            {/* Lado Derecho */}
            <div className="flex items-center gap-3 shrink-0 ml-3">
              <div className="hidden sm:flex px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium items-center gap-1.5 shadow-2xs">
                <Eye className="w-3.5 h-3.5" />
                <span>Vista previa en tiempo real</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PARTE 2 Y 3: CUERPO DISTRIBUIDO EN 2 COLUMNAS (CONTROLES VS LIVE PREVIEW)   */}
          {/* ========================================================================= */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 scrollbar-thin">
            
            {/* --------------------------------------------------------------------- */}
            {/* COLUMNA IZQUIERDA (lg:col-span-7) — CONFIGURACIÓN DE ACCESOS         */}
            {/* --------------------------------------------------------------------- */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Master Switch - Habilitar Portal de Consulta Pública */}
              <div className="p-5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between gap-4 transition-all duration-200">
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                        Habilitar Portal de Consulta Pública
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border shrink-0 ${
                        portalActivo
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                      }`}>
                        {portalActivo ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Permite a los alumnos matriculados consultar su situación académica ingresando su número de DNI, sin necesidad de registro previo.
                    </p>
                  </div>
                </div>

                {/* Switch interactivo de encendido general (Emerald toggle) */}
                <div className="shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={portalActivo}
                    aria-label="Habilitar Portal de Consulta Pública"
                    onClick={() => setPortalActivo(!portalActivo)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                      portalActivo ? 'bg-emerald-600 shadow-sm shadow-emerald-600/30' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                        portalActivo ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Etiqueta de Sección */}
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5 pt-1">
                <Eye className="w-3.5 h-3.5 text-emerald-500" />
                <span>INFORMACIÓN DISPONIBLE PARA EL ESTUDIANTE</span>
              </div>

              {/* Lista de 5 Módulos Configurables (Cards con Switch) */}
              <div className="space-y-2.5">
                
                {/* 1. Asistencia */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all hover:border-emerald-500/30 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <CalendarCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        Asistencia
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Muestra el porcentaje de asistencia y el detalle de inasistencias.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={mostrarAsistencia}
                    onChange={setMostrarAsistencia}
                    ariaLabel="Mostrar Asistencia"
                  />
                </div>

                {/* 2. Calificaciones y Evaluaciones */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all hover:border-emerald-500/30 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        Calificaciones y Evaluaciones
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Exhibe parciales, trabajos prácticos y notas numéricas obtenidas.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={mostrarNotas}
                    onChange={setMostrarNotas}
                    ariaLabel="Mostrar Calificaciones"
                  />
                </div>

                {/* 3. Condición Reglamentaria */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all hover:border-emerald-500/30 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        Condición Reglamentaria
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Informa el estado de la regularidad y la condición académica (promocional, regular o libre).
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={mostrarCondicion}
                    onChange={setMostrarCondicion}
                    ariaLabel="Mostrar Condición Reglamentaria"
                  />
                </div>

                {/* 4. Información Académica */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all hover:border-emerald-500/30 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        Información Académica
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Muestra datos de la carrera, plan de estudios y datos personales básicos.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={mostrarInfoAcademica}
                    onChange={setMostrarInfoAcademica}
                    ariaLabel="Mostrar Información Académica"
                  />
                </div>

                {/* 5. Deudas y Aranceles */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all hover:border-emerald-500/30 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 flex items-center justify-center shrink-0">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        Deudas y Aranceles
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        Permite consultar el estado de pagos y conceptos pendientes (si aplica).
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={mostrarAranceles}
                    onChange={setMostrarAranceles}
                    ariaLabel="Mostrar Deudas y Aranceles"
                  />
                </div>
              </div>

              {/* Caja de Difusión para Alumnos */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 space-y-3.5 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Difusión con Alumnos
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <Sparkles className="w-2.5 h-2.5" />
                    Slug amigable activo
                  </span>
                </div>

                {/* Enlace Limpio Principal */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Enlace amigable para estudiantes:</span>
                    <button
                      type="button"
                      onClick={() => setAlias(slugifyCatedra(catedra?.nombre || ''))}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer text-[10px] font-medium"
                      title="Regenerar slug a partir del nombre de la cátedra"
                    >
                      Autogenerar slug
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <LinkIcon className="w-4 h-4 text-emerald-500 shrink-0"/>
                      <span className="text-xs sm:text-sm font-mono text-slate-600 dark:text-slate-300 truncate" title={portalUrl}>
                        {portalUrl}
                      </span>
                    </div>
                    <button 
                      type="button"
                      onClick={handleCopyLink}
                      className="self-end sm:self-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      {copiedType === 'link' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5"/>}
                      <span>{copiedType === 'link' ? 'Copiado' : 'Copiar Enlace'}</span>
                    </button>
                  </div>
                </div>

                {/* Fila del Alias de Cátedra */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                      Alias:
                    </span>
                    <input
                      type="text"
                      value={alias}
                      onChange={(e) => setAlias(slugifyCatedra(e.target.value))}
                      placeholder={slugifyCatedra(catedra?.nombre || 'alias-catedra')}
                      className="text-xs font-mono font-medium text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-emerald-500 focus:outline-none px-1 py-0.5 w-full min-w-0 truncate"
                      title="Haz clic para personalizar el alias"
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={handleCopyAlias}
                    className="self-end sm:self-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 text-xs font-medium shadow-2xs hover:border-emerald-500 transition-all active:scale-95 cursor-pointer"
                  >
                    {copiedType === 'alias' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400"/>}
                    <span>{copiedType === 'alias' ? 'Alias Copiado' : 'Copiar Alias'}</span>
                  </button>
                </div>

                {/* Botones de Difusión WhatsApp y QR */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all active:scale-95 cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Compartir por WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQR(true)}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-300/80 dark:border-slate-700 transition-all active:scale-95 cursor-pointer"
                  >
                    <QrCode className="w-4 h-4 text-emerald-500" />
                    <span>Ver Código QR</span>
                  </button>
                </div>
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* COLUMNA DERECHA (lg:col-span-5) — SIMULADOR EN VIVO                   */}
            {/* --------------------------------------------------------------------- */}
            <div className="lg:col-span-5 flex flex-col">
              
              {/* Encabezado de la Columna */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-semibold text-sm">
                  <Eye className="w-4 h-4 text-emerald-500" />
                  <span>Vista previa del alumno</span>
                </div>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-mono">
                  En tiempo real
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Así se verá la información en el portal estudiantil.
              </p>

              {/* Tarjeta Simulada del Estudiante (Mockup Phone/Card) */}
              <div className="flex-1 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 p-4 sm:p-5 shadow-inner space-y-3.5 flex flex-col justify-start">
                
                {/* Caso 1: Portal Pausado */}
                {!portalActivo ? (
                  <div className="text-center py-12 px-4 space-y-3 my-auto">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto shadow-xs">
                      <EyeOff className="w-7 h-7" />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                        Portal Desactivado o Pausado
                      </h5>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                        Los alumnos verán un aviso indicando que la consulta pública se encuentra temporalmente suspendida por el equipo docente.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Caso 2: Simulación Reactiva en Vivo */
                  <div className="backdrop-blur-xl bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-4.5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3.5 animate-fadeIn transition-all duration-300">
                    
                    {/* Header Mini Preview (Identidad Simulada) */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-bold font-mono">
                          AR
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            Álvarez, Martín
                          </p>
                          <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                            DNI: 40.111.222
                          </p>
                        </div>
                      </div>

                      {/* Insignia reactiva de condición */}
                      {mostrarCondicion && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 animate-fadeIn">
                          PROMOCIONAL
                        </span>
                      )}
                    </div>

                    {/* Módulo de Asistencia (Reactivo) */}
                    {mostrarAsistencia && (
                      <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/25 border border-blue-100 dark:border-blue-900/40 flex items-center justify-between animate-fadeIn transition-all">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block uppercase tracking-wider font-mono">
                            Asistencia
                          </span>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-200 block">
                            14 de 16 Clases
                          </span>
                        </div>
                        <span className="text-base font-mono font-black text-emerald-600 dark:text-emerald-400">
                          87.5%
                        </span>
                      </div>
                    )}

                    {/* Módulo de Calificaciones (Reactivo) */}
                    {mostrarNotas && (
                      <div className="space-y-1.5 animate-fadeIn transition-all">
                        <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          Calificaciones Recientes
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block">1° Parcial</span>
                            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">8.50 / 10</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block">TP N° 1</span>
                            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">9.00 / 10</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Módulo de Información Académica (Reactivo) */}
                    {mostrarInfoAcademica && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 animate-fadeIn transition-all">
                        <BookOpen className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="text-[11px] leading-snug">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                            Tec. Sup. en Higiene y Seguridad
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 text-[10px]">
                            Plan 2021 • {catedra?.nivel || 'Nivel Superior'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Módulo de Deudas y Aranceles (Reactivo) */}
                    {mostrarAranceles && (
                      <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between text-xs animate-fadeIn transition-all">
                        <span className="text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                          Estado Arancelario:
                        </span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-[11px]">
                          Al día (Sin saldo)
                        </span>
                      </div>
                    )}

                    {/* Si no hay bloques activos */}
                    {!mostrarAsistencia && !mostrarNotas && !mostrarCondicion && !mostrarInfoAcademica && !mostrarAranceles && (
                      <div className="text-center py-6 text-slate-400 dark:text-slate-500 animate-fadeIn">
                        <p className="text-xs italic">
                          No has seleccionado ningún módulo de información para exhibir a los estudiantes.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PARTE 4: PIE DE RECOMENDACIONES Y ACCIONES DEL MODAL                       */}
          {/* ========================================================================= */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0F172A] shrink-0 space-y-3">
            
            {/* 1. Banner de Recomendaciones */}
            <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <Lightbulb className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="text-slate-600 dark:text-slate-300 truncate sm:whitespace-normal">
                  <strong>Recomendaciones:</strong> Para una mejor experiencia, activá solo la información que necesiten tus estudiantes y mantené actualizados los datos académicos.
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => toast.info('Ayuda: Podés activar o pausar el portal en cualquier momento del ciclo lectivo según el calendario institucional.')} 
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 shrink-0 cursor-pointer text-xs"
              >
                <span>Ver ayuda</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 2. Botones de Cierre y Persistencia */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-sm shadow-lg shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Guardando cambios...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visor de Código QR en pantalla grande para proyectores */}
      {showQR && (
        <QRCodeDisplay
          url={portalUrl}
          title={`Portal Alumnos · ${catedra?.nombre || 'Cátedra'}`}
          subtitle="Escaneá con la cámara de tu celular para consultar tus asistencias y calificaciones ingresando tu DNI."
          onClose={() => setShowQR(false)}
        />
      )}
    </>
  );
}
