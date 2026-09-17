import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { 
  GraduationCap, 
  Menu, 
  Bell, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  X,
  BookMarked,
  ShieldAlert,
  ArrowRight,
  CheckCheck,
  RefreshCw
} from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';

function formatTimestamp(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 60 && diffSec >= -60) return 'Hace un instante';
  if (diffSec >= 60 && diffSec < 3600) return `Hace ${Math.floor(diffSec / 60)} min`;
  if (diffSec >= 3600 && diffSec < 86400) return `Hace ${Math.floor(diffSec / 3600)} h`;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

export default function Navbar({ onToggleSidebar }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    notificaciones, 
    unreadCount, 
    loading,
    marcarLeida,
    marcarTodasLeidas, 
    limpiarNotificaciones,
    descartarNotificacion,
    recargarNotificaciones 
  } = useNotifications();
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
    <header className="sticky top-0 z-30 bg-white dark:bg-[#0c1222] border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200 relative shadow-xs md:pl-16">
      {/* Animated top shimmer beam */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80 animate-pulseGlow" />
      {/* Ambient soft glow */}
      <div className="absolute -top-10 left-1/4 w-96 h-20 bg-primary/10 blur-3xl pointer-events-none" />

      <div className="w-full px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4 relative z-10">
        {/* Brand & Mobile Hamburger (solo visible en pantallas móviles) */}
        <div className="flex items-center gap-2 sm:gap-3 md:hidden">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 -ml-1 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover touch-target-44 flex items-center justify-center cursor-pointer"
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
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-primary/10 text-primary font-mono">
                v1.2
              </span>
            </div>
            <p className="text-[11px] text-text-muted -mt-0.5 font-medium">
              Gestión Administrativa Docente
            </p>
          </div>
        </div>

        {/* Brand Desktop (Placeholder para equilibrio del layout) */}
        <div className="hidden md:flex items-center gap-2 text-text-muted text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Sistema Activo</span>
        </div>

        {/* Right Actions: Nombre del Docente, Botón de Tema e Ícono de Campana (Bell) */}
        <div className="flex items-center gap-3 sm:gap-4 ml-auto">
          {/* Nombre del docente */}
          <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px] sm:max-w-[220px] select-none">
            {teacherName}
          </span>

          {/* Botón de Tema (Claro / Oscuro) */}
          <ThemeToggle />

          {/* Notificaciones con Campana */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={toggleNotifications}
              className={`relative p-2.5 rounded-xl border transition-all cursor-pointer touch-target-44 flex items-center justify-center ${
                showNotifications
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-text-secondary hover:text-text-primary'
              }`}
              title="Notificaciones y alertas"
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
              <div className="absolute right-0 mt-2 w-[92vw] sm:w-[420px] rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden z-50 animate-scaleIn">
                <div className="p-3.5 border-b border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <span className="font-bold text-xs text-text-primary">Notificaciones</span>
                    {notificaciones.length > 0 && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                        {notificaciones.length}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => recargarNotificaciones()}
                      className="p-1 text-text-muted hover:text-text-primary rounded-lg transition-colors cursor-pointer"
                      title="Actualizar notificaciones"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={marcarTodasLeidas}
                        className="text-[11px] text-text-muted hover:text-primary flex items-center gap-1 transition-colors cursor-pointer px-1.5 py-0.5 rounded"
                        title="Marcar todas como leídas"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Leídas</span>
                      </button>
                    )}

                    {notificaciones.length > 0 && (
                      <button
                        type="button"
                        onClick={limpiarNotificaciones}
                        className="text-[11px] text-text-muted hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer px-1.5 py-0.5 rounded"
                        title="Limpiar todas las notificaciones"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Limpiar</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                  {notificaciones.length === 0 ? (
                    <div className="p-8 text-center text-text-muted space-y-1.5">
                      <Bell className="w-8 h-8 mx-auto opacity-30 text-text-muted" />
                      <p className="text-xs font-semibold text-text-primary">Sin notificaciones pendientes</p>
                      <p className="text-[11px] leading-relaxed">
                        Los avisos de próximas mesas de examen, clases semanales y alertas de asistencia aparecerán aquí automáticamente.
                      </p>
                    </div>
                  ) : (
                    notificaciones.map((n) => {
                      const isError = n.tipo === 'error';
                      const isSuccess = n.tipo === 'success';
                      const isWarning = n.tipo === 'warning';
                      const isMesa = n.categoria === 'mesa';
                      const isClase = n.categoria === 'clase';
                      const isAsist = n.categoria === 'asistencia';

                      return (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (n.link) {
                              marcarLeida(n.id);
                              navigate(n.link);
                              setShowNotifications(false);
                            } else {
                              marcarLeida(n.id);
                            }
                          }}
                          className={`p-3 text-xs transition-colors group relative ${
                            n.link ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.04]' : ''
                          } ${
                            !n.leida ? 'bg-primary/[0.03] dark:bg-primary/[0.06]' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {/* Icono por Categoría / Tipo */}
                            <div className="mt-0.5 shrink-0">
                              {isMesa ? (
                                <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                  <BookMarked className="w-4 h-4" />
                                </div>
                              ) : isClase ? (
                                <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                  <GraduationCap className="w-4 h-4" />
                                </div>
                              ) : isAsist ? (
                                <div className="p-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                  <ShieldAlert className="w-4 h-4" />
                                </div>
                              ) : isError ? (
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
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="font-bold text-text-primary truncate">
                                    {n.titulo}
                                  </span>
                                  {!n.leida && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {n.codigo && (
                                    <span className={`font-mono text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                      isError || isAsist
                                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                        : isWarning || isMesa
                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                        : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                    }`}>
                                      {n.codigo}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      descartarNotificacion(n.id);
                                    }}
                                    className="p-1 text-text-muted hover:text-rose-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Descartar aviso"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              <p className="text-[11px] text-text-secondary leading-relaxed">
                                {n.mensaje}
                              </p>

                              <div className="flex items-center justify-between pt-0.5 text-[10px] text-text-muted">
                                <span className="font-mono">
                                  {formatTimestamp(n.fecha)}
                                </span>
                                {n.link && (
                                  <span className="flex items-center gap-0.5 text-primary font-medium hover:underline">
                                    <span>Ir al módulo</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </span>
                                )}
                              </div>
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
        </div>
      </div>
    </header>
  );
}
