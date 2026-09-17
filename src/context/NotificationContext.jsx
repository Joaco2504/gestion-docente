import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useApp } from './AppContext';
import { 
  fetchDynamicNotifications, 
  getStoredReadIds, 
  saveStoredReadIds, 
  getStoredDismissedIds, 
  saveStoredDismissedIds 
} from '../services/notificationService';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, isDemo } = useAuth();
  const { catedras } = useApp();

  const [manualNotificaciones, setManualNotificaciones] = useState([]);
  const [dynamicNotificaciones, setDynamicNotificaciones] = useState([]);
  const [readIds, setReadIds] = useState(() => getStoredReadIds());
  const [dismissedIds, setDismissedIds] = useState(() => getStoredDismissedIds());
  const [loading, setLoading] = useState(false);

  // Cargar notificaciones dinámicas (Mesas próximas, Clases de la semana, Alumnos con asistencia <70%)
  const refreshDynamic = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchDynamicNotifications({ user, isDemo, catedras });
      setDynamicNotificaciones(items);
    } catch (err) {
      console.warn('Error al actualizar notificaciones automáticas:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isDemo, catedras]);

  useEffect(() => {
    refreshDynamic();
  }, [refreshDynamic]);

  // Agregar notificación manual (operaciones de sistema, errores, exportaciones)
  const agregarNotificacion = useCallback(({
    tipo = 'info', // 'info' | 'error' | 'success' | 'warning'
    titulo = 'Notificación',
    mensaje = '',
    codigo = null,
    link = null,
    categoria = 'sistema'
  }) => {
    const nueva = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tipo,
      categoria,
      titulo,
      mensaje,
      codigo,
      link,
      fecha: new Date(),
      leida: false
    };

    setManualNotificaciones(prev => [nueva, ...prev.slice(0, 49)]);
    return nueva;
  }, []);

  // Marcar una notificación individual como leída
  const marcarLeida = useCallback((id) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      saveStoredReadIds(next);
      return next;
    });
  }, []);

  // Marcar todas las notificaciones visibles como leídas
  const marcarTodasLeidas = useCallback(() => {
    setReadIds(prev => {
      const next = new Set(prev);
      [...manualNotificaciones, ...dynamicNotificaciones].forEach(n => {
        next.add(n.id);
      });
      saveStoredReadIds(next);
      return next;
    });
  }, [manualNotificaciones, dynamicNotificaciones]);

  // Limpiar / Descartar todas las notificaciones del panel
  const limpiarNotificaciones = useCallback(() => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      [...manualNotificaciones, ...dynamicNotificaciones].forEach(n => {
        next.add(n.id);
      });
      saveStoredDismissedIds(next);
      return next;
    });
    setManualNotificaciones([]);
  }, [manualNotificaciones, dynamicNotificaciones]);

  // Descartar una notificación puntual
  const descartarNotificacion = useCallback((id) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      saveStoredDismissedIds(next);
      return next;
    });
    setManualNotificaciones(prev => prev.filter(n => n.id !== id));
  }, []);

  // Lista consolidada de notificaciones visibles
  const notificaciones = useMemo(() => {
    const all = [...manualNotificaciones, ...dynamicNotificaciones];
    const map = new Map();

    all.forEach(n => {
      if (!dismissedIds.has(n.id) && !map.has(n.id)) {
        map.set(n.id, {
          ...n,
          leida: Boolean(readIds.has(n.id) || n.leida)
        });
      }
    });

    return Array.from(map.values());
  }, [manualNotificaciones, dynamicNotificaciones, readIds, dismissedIds]);

  const unreadCount = useMemo(() => {
    return notificaciones.filter(n => !n.leida).length;
  }, [notificaciones]);

  const value = {
    notificaciones,
    unreadCount,
    loading,
    agregarNotificacion,
    marcarLeida,
    marcarTodasLeidas,
    limpiarNotificaciones,
    descartarNotificacion,
    recargarNotificaciones: refreshDynamic
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications debe utilizarse dentro de un NotificationProvider');
  }
  return ctx;
}
