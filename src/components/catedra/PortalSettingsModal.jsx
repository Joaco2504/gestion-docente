import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Share2, 
  QrCode, 
  Copy, 
  Check, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  CheckSquare, 
  GraduationCap, 
  TrafficCone, 
  Sparkles, 
  Save, 
  X, 
  AlertCircle, 
  ShieldCheck, 
  Users,
  Smartphone
} from 'lucide-react';
import { toast } from 'sonner';
import { handleAppError } from '../../utils/handleAppError';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';
import QRCodeDisplay from '../common/QRCodeDisplay';
import { 
  getCatedraPortalConfig, 
  saveCatedraPortalConfig,
  slugifyCatedra 
} from '../../services/studentPortalService';
import { useAuth } from '../../context/AuthContext';

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

  // Configuración del portal
  const [portalActivo, setPortalActivo] = useState(false);
  const [mostrarAsistencia, setMostrarAsistencia] = useState(true);
  const [mostrarNotas, setMostrarNotas] = useState(true);
  const [mostrarCondicion, setMostrarCondicion] = useState(true);
  const [alias, setAlias] = useState('');

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
    } catch (err) {
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
    } catch (err) {
      toast.error('No se pudo copiar el alias al portapapeles.');
    }
  };

  const handleWhatsAppShare = () => {
    const text = `📢 Estimados estudiantes de *${catedra?.nombre || 'la cátedra'}*:\n\nYa pueden consultar su estado académico (asistencias y notas actualizadas) ingresando su número de DNI en nuestro portal oficial:\n👉 ${portalUrl}\n\nNo requiere registrarse ni contraseña. ¡Saludos!`;
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
          : 'Configuración del portal guardada (Portal actualmente pausado).'
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
      <Modal
        isOpen={isOpen && !showQR}
        onClose={onClose}
        maxWidth="max-w-4xl"
        title="Portal Público de Consulta para Alumnos"
        subtitle={`Control granular de visibilidad y acceso para ${catedra?.nombre || 'la cátedra'}`}
      >
        <div className="space-y-6 p-4 sm:p-6 overflow-y-auto max-h-[75vh] scrollbar-thin">
          {/* Switch Maestro - Layout simétrico con margen de seguridad */}
          <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 shadow-sm w-full gap-4 transition-all duration-300">
            {/* Lado izquierdo: Ícono centrado, título con badge ACTIVO/INACTIVO y texto explicativo */}
            <div className="flex items-start gap-4 min-w-0 flex-1">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                portalActivo 
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm' 
                  : 'bg-slate-100 dark:bg-slate-800 text-text-muted border border-slate-200 dark:border-slate-700'
              }`}>
                <Globe className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h4 className="text-sm sm:text-base font-bold text-text-primary">
                    Habilitar Portal de Consulta Pública
                  </h4>
                  <span className={`text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full uppercase tracking-wider border shrink-0 ${
                    portalActivo
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}>
                    {portalActivo ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Permite a los alumnos matriculados consultar su situación académica ingresando su número de DNI, sin necesidad de registro previo.
                </p>
              </div>
            </div>

            {/* Lado derecho: Componente Switch estilizado con margen de seguridad */}
            <div className="shrink-0 mr-1 flex items-center">
              <button
                type="button"
                onClick={() => setPortalActivo(!portalActivo)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                  portalActivo ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                role="switch"
                aria-checked={portalActivo}
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

          {/* Grid Principal: Criterios de Visibilidad + Live Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Columna Izquierda: Criterios Granulares y Difusión (7 columnas) */}
            <div className="lg:col-span-7 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-primary" />
                  <h5 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                    Criterios de Visibilidad del Alumno
                  </h5>
                </div>

                <div className="space-y-3">
                  {/* Toggle 1: Asistencia */}
                  <label className={`flex items-start justify-between gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    mostrarAsistencia 
                      ? 'bg-white/80 dark:bg-slate-800/60 border-primary/30 shadow-xs' 
                      : 'bg-slate-50/50 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/5 opacity-70'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-semibold text-text-primary block">
                          Mostrar Porcentaje y Registro de Asistencia
                        </span>
                        <span className="text-[11px] text-text-muted block mt-0.5 leading-snug">
                          Desglosa clases dictadas, presentes, ausentes y el porcentaje global.
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={mostrarAsistencia}
                      onChange={(e) => setMostrarAsistencia(e.target.checked)}
                      className="mt-1.5 h-4 w-4 rounded text-primary focus:ring-primary border-slate-300 dark:border-slate-700 cursor-pointer"
                    />
                  </label>

                  {/* Toggle 2: Exámenes y Notas */}
                  <label className={`flex items-start justify-between gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    mostrarNotas 
                      ? 'bg-white/80 dark:bg-slate-800/60 border-primary/30 shadow-xs' 
                      : 'bg-slate-50/50 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/5 opacity-70'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-semibold text-text-primary block">
                          Mostrar Exámenes y Calificaciones
                        </span>
                        <span className="text-[11px] text-text-muted block mt-0.5 leading-snug">
                          Exhibe parciales, trabajos prácticos y notas numéricas obtenidas.
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={mostrarNotas}
                      onChange={(e) => setMostrarNotas(e.target.checked)}
                      className="mt-1.5 h-4 w-4 rounded text-primary focus:ring-primary border-slate-300 dark:border-slate-700 cursor-pointer"
                    />
                  </label>

                  {/* Toggle 3: Semáforo RAM */}
                  <label className={`flex items-start justify-between gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    mostrarCondicion 
                      ? 'bg-white/80 dark:bg-slate-800/60 border-primary/30 shadow-xs' 
                      : 'bg-slate-50/50 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/5 opacity-70'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <TrafficCone className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-semibold text-text-primary block">
                          Mostrar Semáforo de Condición RAM
                        </span>
                        <span className="text-[11px] text-text-muted block mt-0.5 leading-snug">
                          Informa estado reglamentario (Promocional / Regular / En Riesgo o Libre).
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={mostrarCondicion}
                      onChange={(e) => setMostrarCondicion(e.target.checked)}
                      className="mt-1.5 h-4 w-4 rounded text-primary focus:ring-primary border-slate-300 dark:border-slate-700 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Caja de Difusión para Alumnos */}
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                      Caja de Difusión con Alumnos
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <Sparkles className="w-2.5 h-2.5" />
                    Slug amigable activo
                  </span>
                </div>

                {/* Enlace Limpio Principal */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-text-muted">
                    <span>Enlace amigable para estudiantes:</span>
                    <button
                      type="button"
                      onClick={() => setAlias(slugifyCatedra(catedra?.nombre || ''))}
                      className="text-primary hover:underline cursor-pointer text-[10px]"
                      title="Regenerar slug a partir del nombre de la cátedra"
                    >
                      Autogenerar slug
                    </button>
                  </div>
                  <div className="flex items-center gap-2 p-1.5 pl-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-2xs">
                    <span className="text-xs font-mono text-text-secondary truncate select-all flex-1" title={portalUrl}>
                      {portalUrl}
                    </span>
                    <Button
                      size="sm"
                      variant={copiedType === 'link' ? 'secondary' : 'primary'}
                      icon={copiedType === 'link' ? Check : Copy}
                      onClick={handleCopyLink}
                      className="text-xs font-semibold rounded-xl px-3 shrink-0 cursor-pointer"
                    >
                      {copiedType === 'link' ? 'Copiado' : 'Copiar Enlace'}
                    </Button>
                  </div>
                </div>

                {/* Fila del Alias de Cátedra */}
                <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted shrink-0">
                      Alias:
                    </span>
                    <input
                      type="text"
                      value={alias}
                      onChange={(e) => setAlias(slugifyCatedra(e.target.value))}
                      placeholder={slugifyCatedra(catedra?.nombre || 'alias-catedra')}
                      className="text-xs font-mono font-medium text-text-primary bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-primary focus:outline-none px-1 py-0.5 max-w-[200px] truncate"
                      title="Haz clic para personalizar el alias"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={copiedType === 'alias' ? Check : Copy}
                    onClick={handleCopyAlias}
                    className="text-[11px] font-medium py-1 px-2.5 rounded-xl shrink-0 cursor-pointer text-text-secondary hover:text-primary border-slate-200 dark:border-white/10"
                  >
                    {copiedType === 'alias' ? 'Alias Copiado' : 'Copiar Alias'}
                  </Button>
                </div>

                {/* Botones de Difusión WhatsApp y QR */}
                <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                  <Button
                    variant="outline"
                    icon={Smartphone}
                    onClick={handleWhatsAppShare}
                    className="text-xs font-semibold rounded-2xl py-2 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                  >
                    Compartir en WhatsApp
                  </Button>

                  <Button
                    variant="outline"
                    icon={QrCode}
                    onClick={() => setShowQR(true)}
                    className="text-xs font-semibold rounded-2xl py-2 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
                  >
                    Ver Código QR
                  </Button>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Live Preview Reactivo (5 columnas) */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                    Live Preview del Alumno
                  </span>
                </div>
                <span className="text-[10px] bg-slate-100 dark:bg-white/10 text-text-muted px-2 py-0.5 rounded-full font-mono">
                  En tiempo real
                </span>
              </div>

              {/* Contenedor del Preview estilo Smartphone Bento */}
              <div className="flex-1 rounded-3xl border border-slate-200/90 dark:border-white/10 bg-gradient-to-b from-slate-100/50 to-slate-200/30 dark:from-slate-900/80 dark:to-slate-950/80 p-4 flex flex-col justify-center">
                {!portalActivo ? (
                  <div className="text-center p-6 space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                      <EyeOff className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-text-primary">Portal Pausado</p>
                    <p className="text-[11px] text-text-muted max-w-xs mx-auto">
                      Los alumnos verán un mensaje avisando que la consulta pública se encuentra temporalmente desactivada.
                    </p>
                  </div>
                ) : (
                  <div className="backdrop-blur-xl bg-white dark:bg-slate-900/90 rounded-2xl p-4 border border-slate-200/80 dark:border-white/10 shadow-lg space-y-3.5 animate-fadeIn">
                    {/* Header Mini Preview */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          AM
                        </div>
                        <div>
                          <p className="text-xs font-bold text-text-primary leading-tight">Álvarez, Martín</p>
                          <p className="text-[10px] font-mono text-text-muted">DNI: 40.111.222</p>
                        </div>
                      </div>
                      
                      {mostrarCondicion && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700">
                          Promocional
                        </span>
                      )}
                    </div>

                    {/* Bloque Asistencia Mini */}
                    {mostrarAsistencia && (
                      <div className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-center justify-between animate-fadeIn">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block uppercase">
                            Asistencia
                          </span>
                          <span className="text-[11px] text-text-muted block">14 de 16 Clases</span>
                        </div>
                        <span className="text-sm font-mono font-black text-blue-600 dark:text-blue-400">
                          87.5%
                        </span>
                      </div>
                    )}

                    {/* Bloque Calificaciones Mini */}
                    {mostrarNotas && (
                      <div className="space-y-1.5 animate-fadeIn">
                        <span className="text-[10px] font-bold text-text-muted uppercase block">
                          Calificaciones Recientes
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                            <span className="text-[10px] text-text-muted truncate block">1° Parcial</span>
                            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">8.50 / 10</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5">
                            <span className="text-[10px] text-text-muted truncate block">TP N° 1</span>
                            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">9.00 / 10</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Si no hay bloques activos */}
                    {!mostrarAsistencia && !mostrarNotas && !mostrarCondicion && (
                      <div className="text-center py-3">
                        <span className="text-[11px] text-text-muted italic">
                          No has seleccionado ningún bloque de datos para mostrar.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer de Acciones del Modal */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/80 dark:border-white/10">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="text-xs font-semibold rounded-2xl px-4"
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              icon={Save}
              onClick={handleSave}
              disabled={saving}
              className="text-xs font-bold rounded-2xl px-5"
            >
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </div>
      </Modal>

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
