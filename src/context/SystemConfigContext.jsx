import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { toast } from 'sonner';
import { handleAppError } from '../utils/handleAppError';

const SystemConfigContext = createContext({});

export const useSystemConfig = () => useContext(SystemConfigContext);

const DEFAULT_CONFIG = {
  id: 'global',
  modo_mantenimiento: false,
  banner_activo: false,
  banner_mensaje: '',
  updated_at: new Date().toISOString()
};

export function SystemConfigProvider({ children }) {
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('docentepro_sistema_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    return DEFAULT_CONFIG;
  });
  const [loading, setLoading] = useState(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Carga inicial de la configuración
  const fetchConfig = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('configuracion_sistema')
        .select('*')
        .eq('id', 'global')
        .single();

      if (!error && data) {
        setConfig(data);
        localStorage.setItem('docentepro_sistema_config', JSON.stringify(data));
      } else if (error && error.code === 'PGRST116') {
        // No existe: creamos la fila global por defecto
        const { data: created } = await supabase
          .from('configuracion_sistema')
          .insert(DEFAULT_CONFIG)
          .select()
          .single();
        if (created) {
          setConfig(created);
          localStorage.setItem('docentepro_sistema_config', JSON.stringify(created));
        }
      }
    } catch (err) {
      console.warn('Error fetching system config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Suscripción al canal Supabase Realtime 'config-realtime'
  useEffect(() => {
    fetchConfig();

    if (!isSupabaseConfigured || !supabase) {
      setIsRealtimeConnected(false);

      // Listener para sincronizar pestañas locales en modo demo
      const handleStorage = (e) => {
        if (e.key === 'docentepro_sistema_config' && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            setConfig(parsed);
          } catch (_) {}
        }
      };
      const handleCustom = (e) => {
        if (e.detail) {
          setConfig(e.detail);
        }
      };

      window.addEventListener('storage', handleStorage);
      window.addEventListener('docentepro_config_changed', handleCustom);
      return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('docentepro_config_changed', handleCustom);
      };
    }

    let channel = null;
    try {
      channel = supabase
        .channel('config-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'configuracion_sistema'
          },
          (payload) => {
            if (payload?.new) {
              const updated = payload.new;
              setConfig(prev => {
                // Notificación emergente si se activa un nuevo aviso global
                if (updated.banner_activo && updated.banner_mensaje && (!prev.banner_activo || prev.banner_mensaje !== updated.banner_mensaje)) {
                  toast.info(updated.banner_mensaje, {
                    description: 'Aviso transmitido por el Administrador',
                    duration: 7000
                  });
                }
                // Notificación si se activa mantenimiento
                if (updated.modo_mantenimiento && !prev.modo_mantenimiento) {
                  toast.warning('El sistema ha entrado en Modo Mantenimiento Programado.', {
                    duration: 8000
                  });
                }
                return updated;
              });
              localStorage.setItem('docentepro_sistema_config', JSON.stringify(updated));
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsRealtimeConnected(true);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsRealtimeConnected(false);
          }
        });
    } catch (err) {
      console.warn('Realtime channel error:', err);
    }

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchConfig]);

  // Actualización de configuración del sistema
  const updateConfig = async (newPartial) => {
    const updated = {
      ...config,
      ...newPartial,
      updated_at: new Date().toISOString()
    };

    // Actualización local inmediata
    setConfig(updated);
    localStorage.setItem('docentepro_sistema_config', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('docentepro_config_changed', { detail: updated }));

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('configuracion_sistema')
          .upsert({
            id: 'global',
            modo_mantenimiento: updated.modo_mantenimiento,
            banner_activo: updated.banner_activo,
            banner_mensaje: updated.banner_mensaje,
            updated_at: updated.updated_at
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setConfig(data);
          localStorage.setItem('docentepro_sistema_config', JSON.stringify(data));
        }
        return { data, error: null };
      } catch (err) {
        handleAppError(err, 'SystemConfigContext / updateConfig');
        return { data: null, error: err };
      }
    }

    return { data: updated, error: null };
  };

  const value = {
    config,
    modoMantenimiento: Boolean(config?.modo_mantenimiento),
    bannerActivo: Boolean(config?.banner_activo),
    bannerMensaje: config?.banner_mensaje || '',
    loading,
    isRealtimeConnected,
    fetchConfig,
    updateConfig
  };

  return (
    <SystemConfigContext.Provider value={value}>
      {children}
    </SystemConfigContext.Provider>
  );
}
