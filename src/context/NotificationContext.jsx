import React, { createContext, useContext, useState, useMemo } from 'react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notificaciones, setNotificaciones] = useState([]);

  const agregarNotificacion = ({
    tipo = 'info', // 'info' | 'error' | 'success' | 'warning'
    titulo = 'Notificación',
    mensaje = '',
    codigo = null
  }) => {
    const nueva = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tipo,
      titulo,
      mensaje,
      codigo,
      fecha: new Date(),
      leida: false
    };

    setNotificaciones(prev => [nueva, ...prev.slice(0, 49)]); // Guardar últimas 50
    return nueva;
  };

  const marcarLeida = (id) => {
    setNotificaciones(prev =>
      prev.map(n => (n.id === id ? { ...n, leida: true } : n))
    );
  };

  const marcarTodasLeidas = () => {
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
  };

  const limpiarNotificaciones = () => {
    setNotificaciones([]);
  };

  const unreadCount = useMemo(() => {
    return notificaciones.filter(n => !n.leida).length;
  }, [notificaciones]);

  const value = {
    notificaciones,
    unreadCount,
    agregarNotificacion,
    marcarLeida,
    marcarTodasLeidas,
    limpiarNotificaciones
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
