import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Megaphone, 
  Wrench, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Sparkles,
  SlidersHorizontal,
  RefreshCw
} from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { useSystemConfig } from '../../context/SystemConfigContext';
import { toast } from 'sonner';

export default function RealtimeSwitchboard() {
  const { 
    config, 
    modoMantenimiento, 
    bannerActivo, 
    bannerMensaje, 
    isRealtimeConnected, 
    updateConfig,
    fetchConfig 
  } = useSystemConfig();

  const [localMantenimiento, setLocalMantenimiento] = useState(modoMantenimiento);
  const [localBannerActivo, setLocalBannerActivo] = useState(bannerActivo);
  const [localBannerMensaje, setLocalBannerMensaje] = useState(bannerMensaje);
  const [saving, setSaving] = useState(false);

  // Sincronizar estado local cuando cambia la configuración remota
  useEffect(() => {
    setLocalMantenimiento(modoMantenimiento);
    setLocalBannerActivo(bannerActivo);
    setLocalBannerMensaje(bannerMensaje);
  }, [modoMantenimiento, bannerActivo, bannerMensaje]);

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const { error } = await updateConfig({
        modo_mantenimiento: localMantenimiento,
        banner_activo: localBannerActivo,
        banner_mensaje: localBannerMensaje.trim()
      });

      if (error) throw error;
      toast.success('Configuración del sistema actualizada con éxito', {
        description: 'Los cambios fueron transmitidos a todos los docentes conectados.'
      });
    } catch (err) {
      toast.error('Error al guardar configuración: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = 
    localMantenimiento !== modoMantenimiento ||
    localBannerActivo !== bannerActivo ||
    localBannerMensaje !== bannerMensaje;

  return (
    <Card className="p-5 sm:p-6 space-y-6 relative overflow-hidden border border-surface-border">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-80 h-40 bg-primary/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary-hover text-white flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
                Panel de Control en Tiempo Real
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                Switchboard
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Transmisión instantánea de estados y alertas globales vía WebSocket Realtime
            </p>
          </div>
        </div>

        {/* Realtime Status Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border ${
            isRealtimeConnected 
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>{isRealtimeConnected ? 'Canal Realtime Activo' : 'Sincronización Local / Polling'}</span>
          </div>

          <button
            type="button"
            onClick={() => fetchConfig()}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            title="Sincronizar ahora"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 relative z-10">
        {/* Controles Bento en 2 Columnas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Switch 1: Modo Mantenimiento */}
          <div className={`p-4 rounded-2xl border transition-all duration-200 ${
            localMantenimiento 
              ? 'bg-amber-500/10 border-amber-500/30 dark:bg-amber-500/15' 
              : 'bg-surface-hover/50 border-surface-border'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  localMantenimiento ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-surface text-text-muted border border-surface-border'
                }`}>
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-text-primary">Modo Mantenimiento</span>
                    {localMantenimiento && (
                      <Badge variant="warning" className="text-[10px] py-0 px-1.5">Activo</Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Muestra un aviso persistente en la cabecera de todos los docentes alertando de tareas de actualización.
                  </p>
                </div>
              </div>

              {/* iOS Style Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={localMantenimiento}
                onClick={() => setLocalMantenimiento(prev => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  localMantenimiento ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    localMantenimiento ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Switch 2: Banner Activo */}
          <div className={`p-4 rounded-2xl border transition-all duration-200 ${
            localBannerActivo 
              ? 'bg-primary/10 border-primary/30 dark:bg-primary/15' 
              : 'bg-surface-hover/50 border-surface-border'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  localBannerActivo ? 'bg-primary/20 text-primary' : 'bg-surface text-text-muted border border-surface-border'
                }`}>
                  <Radio className={`w-4 h-4 ${localBannerActivo ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-text-primary">Banner de Aviso Global</span>
                    {localBannerActivo && (
                      <Badge variant="primary" className="text-[10px] py-0 px-1.5">En el aire</Badge>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Proyecta un cintillo informativo en tiempo real en la pantalla de cada usuario conectado.
                  </p>
                </div>
              </div>

              {/* iOS Style Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={localBannerActivo}
                onClick={() => setLocalBannerActivo(prev => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  localBannerActivo ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    localBannerActivo ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

        </div>

        {/* Input Mensaje del Banner */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5 text-primary" />
              <span>Contenido del Aviso Global</span>
            </label>
            <span className="text-[11px] font-mono text-text-muted">
              {localBannerMensaje.length} / 180 caracteres
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              maxLength={180}
              value={localBannerMensaje}
              onChange={(e) => setLocalBannerMensaje(e.target.value)}
              placeholder="Ej: Mantenimiento de servidores programado para hoy a las 23:00 hs (Duración estimada: 20 min)."
              className="w-full px-4 py-2.5 text-sm rounded-xl bg-surface border border-surface-border text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pr-24"
            />
            {localBannerMensaje && (
              <button
                type="button"
                onClick={() => setLocalBannerMensaje('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-muted hover:text-text-primary px-2 py-1 rounded-lg hover:bg-surface-hover transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Previsualización en Vivo */}
        {localBannerActivo && (
          <div className="p-3.5 rounded-2xl bg-surface border border-surface-border space-y-2 animate-fadeIn">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-muted uppercase tracking-wider">
              <Eye className="w-3.5 h-3.5 text-primary" />
              <span>Vista previa en tiempo real (así lo verán los docentes):</span>
            </div>
            
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-primary/15 via-primary/10 to-blue-500/15 border border-primary/25 flex items-center gap-2 text-xs text-text-primary">
              <Megaphone className="w-4 h-4 text-primary shrink-0 animate-bounce" />
              <span className="font-bold text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                Aviso General
              </span>
              <span className="font-medium truncate">
                {localBannerMensaje || 'Escribe un mensaje para previsualizarlo aquí...'}
              </span>
            </div>
          </div>
        )}

        {/* Botón Guardar Cambios */}
        <div className="flex items-center justify-between pt-2 border-t border-surface-border">
          <div className="text-xs text-text-muted">
            {config?.updated_at && (
              <span>Última sincronización: <strong className="text-text-secondary font-mono">{new Date(config.updated_at).toLocaleTimeString()}</strong></span>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            icon={Save}
            loading={saving}
            disabled={!hasChanges && !saving}
            className="min-h-[44px] sm:min-h-0 touch-target-44"
          >
            Guardar Configuración
          </Button>
        </div>
      </form>
    </Card>
  );
}
