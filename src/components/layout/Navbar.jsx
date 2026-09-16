import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { 
  GraduationCap, 
  LogOut, 
  Menu, 
  Bell, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  X
} from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';

function formatTimestamp(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 60) return 'Hace un instante';
  if (diffSec < 3600) return `Hace ${Math.floor(diffSec / 60)} min`;
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export default function Navbar({ onToggleSidebar }) {
  const { user, isDemo, signOut } = useAuth();
  const { notificaciones, unreadCount, marcarTodasLeidas, limpiarNotificaciones } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  // Cerrar popover al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const toggleNotifications = () => {
    if (!showNotifications && unreadCount > 0) {
      marcarTodasLeidas();
    }
    setShowNotifications(!showNotifications);
  };

  const teacherName = 
    user?.perfil?.nombre || 
    user?.user_metadata?.nombre || 
    user?.email?.split('@')[0] || 
    'Docente';

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-[#0c1222] border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200 relative shadow-xs">
      {/* Animated top shimmer beam */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80 animate-pulseGlow" />
      {/* Ambient soft glow */}
      <div className="absolute -top-10 left-1/4 w-96 h-20 bg-primary/10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4 relative z-10">
        {/* Brand & Mobile Hamburger */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 -ml-1 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover md:hidden touch-target-44 flex items-center justify-center cursor-pointer"
            title="Abrir menú de navegación"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm shadow-primary/30 shrink-0 transition-transform duration-200 hover:scale-105">
            <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>

          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-base sm:text-lg tracking-tight text-text-primary">
                Planilla<span className="text-primary">Docente</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-primary/10 text-primary font-mono hidden xs:inline">
                v1.2
              </span>
            </div>
            <p className="text-[11px] text-text-muted -mt-0.5 font-medium hidden sm:block">
              Gestión Administrativa Docente
            </p>
          </div>
        </div>

        {/* Right Actions: Theme Switcher, Notifications, User Info & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Theme Switcher */}
          <ThemeToggle />

          {/* Centro de Notificaciones con Campana */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={toggleNotifications}
              className={`relative p-2.5 rounded-xl border transition-all cursor-pointer touch-target-44 flex items-center justify-center ${
                showNotifications
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-text-secondary hover:text-text-primary'
              }`}
              title="Centro de notificaciones y alertas"
              aria-label="Notificaciones"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white font-mono text-[10px] font-black rounded-full flex items-center justify-center shadow-xs animate-scaleIn">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Popover Desplegable de Notificaciones */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-[88vw] sm:w-96 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden z-50 animate-scaleIn">
                <div className="p-3.5 border-b border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <span className="font-bold text-xs text-text-primary">Centro de Notificaciones</span>
                    {notificaciones.length > 0 && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                        {notificaciones.length}
                      </span>
                    )}
                  </div>

                  {notificaciones.length > 0 && (
                    <button
                      type="button"
                      onClick={limpiarNotificaciones}
                      className="text-[11px] text-text-muted hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Limpiar todas las notificaciones"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Limpiar todo</span>
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                  {notificaciones.length === 0 ? (
                    <div className="p-8 text-center text-text-muted space-y-1.5">
                      <Bell className="w-8 h-8 mx-auto opacity-30 text-text-muted" />
                      <p className="text-xs font-semibold text-text-primary">Sin notificaciones pendientes</p>
                      <p className="text-[11px]">Los avisos y estados de tus operaciones aparecerán aquí.</p>
                    </div>
                  ) : (
                    notificaciones.map((n) => {
                      const isError = n.tipo === 'error';
                      const isSuccess = n.tipo === 'success';
                      const isWarning = n.tipo === 'warning';

                      return (
                        <div
                          key={n.id}
                          className={`p-3 text-xs transition-colors ${
                            !n.leida ? 'bg-primary/[0.03] dark:bg-primary/[0.06]' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 shrink-0">
                              {isError ? (
                                <AlertCircle className="w-4 h-4 text-rose-500" />
                              ) : isSuccess ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : isWarning ? (
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                              ) : (
                                <Info className="w-4 h-4 text-primary" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-text-primary truncate">
                                  {n.titulo}
                                </span>
                                {n.codigo && (
                                  <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold shrink-0">
                                    {n.codigo}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-text-secondary leading-relaxed">
                                {n.mensaje}
                              </p>
                              <span className="text-[10px] text-text-muted font-mono block">
                                {formatTimestamp(n.fecha)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User badge: únicamente nombre del docente y estado limpio (sin menciones de BD) */}
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-text-primary truncate max-w-[160px]">
              {teacherName}
            </span>
            <span className="text-[10px] text-text-muted font-mono">
              {isDemo ? 'Modo Demostración' : (user?.email || 'Docente')}
            </span>
          </div>

          {/* Botón de Logout Animado (Hover Expandable Circular a Cápsula) */}
          <button
            onClick={signOut}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="group relative h-11 w-11 hover:w-36 focus:w-36 rounded-full flex items-center justify-start overflow-hidden px-3 transition-all duration-300 ease-in-out cursor-pointer shadow-sm bg-white border border-slate-200 text-slate-700 hover:bg-rose-600 hover:text-white hover:border-rose-600 dark:bg-slate-800/80 dark:border-white/10 dark:text-slate-300 dark:hover:bg-rose-600 dark:hover:text-white dark:hover:border-rose-600 active:scale-95 touch-target-44"
          >
            <LogOut className="w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-105" />
            <span className="text-xs font-bold whitespace-nowrap overflow-hidden transition-all duration-300 opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-[85px] group-hover:ml-2 group-focus:opacity-100 group-focus:max-w-[85px] group-focus:ml-2">
              Cerrar Sesión
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
