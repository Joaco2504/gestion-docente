import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Calendar, 
  CalendarCheck, 
  Table2, 
  Award, 
  Building2, 
  BookOpen, 
  ShieldCheck, 
  Settings, 
  LifeBuoy, 
  User, 
  PanelLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function KorumGlobalMenu({ onToggleSidebar, className = '' }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { esSuperadmin } = useAuth();

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 270;
      // Si está anclado en el riel lateral izquierdo (pantallas >= 768px):
      if (rect.left < 100 && window.innerWidth >= 768) {
        // Desplegar suavemente hacia la derecha del riel lateral
        const left = rect.right + 12;
        const top = Math.max(12, Math.min(rect.top, window.innerHeight - 480));
        setCoords({ top, left });
      } else {
        // Modo estándar / móvil: debajo del disparador
        const left = Math.max(12, Math.min(rect.left, window.innerWidth - menuWidth - 12));
        const top = Math.min(rect.bottom + 8, window.innerHeight - 450);
        setCoords({ top, left });
      }
    }
  };

  const handleToggle = () => {
    if (!isMenuOpen) {
      updatePosition();
    }
    setIsMenuOpen(prev => !prev);
  };

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    const handleResize = () => {
      updatePosition();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [isMenuOpen]);

  const handleNavigate = (path) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  const menuItems = [
    { id: 'inicio', label: 'Inicio', path: '/', icon: Home },
    { id: 'calendario', label: 'Calendario', path: '/calendario', icon: Calendar },
    { id: 'asistencia', label: 'Asistencia', path: '/asistencia', icon: CalendarCheck },
    { id: 'calificaciones', label: 'Calificaciones', path: '/calificaciones', icon: Table2 },
    { id: 'mesas', label: 'Mesas de Examen', path: '/mesas-examen', icon: Award },
    { id: 'instituciones', label: 'Instituciones', path: '/instituciones', icon: Building2 },
    { id: 'libro-temas', label: 'Libro de Temas', path: '/libro-temas', icon: BookOpen },
    ...(esSuperadmin ? [
      { id: 'admin', label: 'Centro de Superadmin', path: '/admin', icon: ShieldCheck, isSuper: true }
    ] : []),
  ];

  const secondaryItems = [
    { id: 'configuracion', label: 'Configuración', path: '/configuracion', icon: Settings },
    { id: 'soporte', label: 'Soporte Técnico', path: '/soporte', icon: LifeBuoy },
    { id: 'perfil', label: 'Mi Perfil', path: '/perfil', icon: User },
  ];

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Botón Disparador Directo Limpio y Transparente Menú Korum */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        onContextMenu={(e) => {
          e.preventDefault();
          handleToggle();
        }}
        className="relative p-0 m-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none cursor-pointer group"
        title="Menú Korum"
        aria-label="Menú principal Korum"
      >
        <img
          src="/dashboard.ico"
          alt="Korum"
          className="w-full h-full object-contain rounded-2xl drop-shadow-md group-hover:drop-shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all"
        />
      </button>

      {/* Menú Flotante montado en Portal */}
      {isMenuOpen && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[99] bg-black/20 dark:bg-black/40 backdrop-blur-[1px]"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Menú Desplegable Flotante */}
          <div
            ref={menuRef}
            style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
            className="fixed z-[100] shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 min-w-[260px] animate-scaleIn select-none text-slate-800 dark:text-slate-100"
          >
            {/* Encabezado del menú */}
            <div className="px-3 py-1.5 mb-1 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Menú Korum
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Global
              </span>
            </div>

            {/* Accesos 1 al 8 */}
            <div className="space-y-0.5">
              {menuItems.map(item => {
                const Icon = item.icon;
                const isCurrent = location.pathname === item.path;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.path)}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                      isCurrent
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                        : item.isSuper
                        ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-emerald-600 dark:hover:text-emerald-400'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${
                      isCurrent ? 'text-emerald-600 dark:text-emerald-400' : item.isSuper ? 'text-rose-500' : 'text-slate-400'
                    }`} />
                    <span className="flex-1 truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Separador de 1px */}
            <div className="h-[1px] bg-slate-200 dark:bg-slate-800 my-1" />

            {/* Accesos 9 al 11 */}
            <div className="space-y-0.5">
              {secondaryItems.map(item => {
                const Icon = item.icon;
                const isCurrent = location.pathname === item.path;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.path)}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                      isCurrent
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-emerald-600 dark:hover:text-emerald-400'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                  </button>
                );
              })}

              {/* Acceso 12: [ ◨ Alternar Panel Lateral ] */}
              {onToggleSidebar && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onToggleSidebar();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer text-left"
                >
                  <PanelLeft className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="flex-1 truncate">Alternar Panel Lateral</span>
                </button>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
