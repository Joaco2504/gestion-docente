import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  BookOpen, 
  Calendar, 
  Building2, 
  Settings,
  HelpCircle, 
  X, 
  GraduationCap,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function Sidebar({ isOpen = false, onClose }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('docentepro_sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('docentepro_sidebar_collapsed', String(next));
      return next;
    });
  };

  const links = [
    { to: '/dashboard', label: 'Cátedras', icon: BookOpen },
    { to: '/calendario', label: 'Calendario & Horarios', icon: Calendar },
    { to: '/instituciones', label: 'Instituciones & Ciclos', icon: Building2 },
    { to: '/configuracion', label: 'Configuración', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Shell:
          - Mobile: slide-over drawer (w-72)
          - Desktop Collapsed: compact icon rail (w-20)
          - Desktop Expanded: full width (w-64)
      */}
      <aside className={`
        fixed md:static top-0 bottom-0 left-0 z-50 md:z-20
        bg-surface border-r border-surface-border p-3 md:p-3.5 lg:p-4
        flex flex-col justify-between shrink-0
        transition-all duration-300 ease-in-out
        w-72 ${isCollapsed ? 'md:w-20' : 'md:w-64'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="space-y-4">
          {/* Mobile close button header */}
          <div className="flex items-center justify-between md:hidden pb-3 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="font-bold text-base text-text-primary">DocentePro</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover touch-target-44"
              aria-label="Cerrar navegación"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Desktop header with collapse toggle */}
          <div className="hidden md:flex items-center justify-between px-1 pb-1">
            {!isCollapsed && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted truncate">
                Navegación
              </span>
            )}
            <button
              onClick={toggleCollapse}
              className={`p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors ${
                isCollapsed ? 'mx-auto' : ''
              }`}
              title={isCollapsed ? 'Expandir menú (Ctrl+B)' : 'Colapsar menú'}
              aria-label={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-primary" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5" aria-label="Menú principal">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => {
                    if (onClose) onClose();
                  }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-xl text-xs font-semibold transition-all touch-target-44 group relative ${
                      isCollapsed ? 'md:justify-center' : 'md:justify-start'
                    } ${
                      isActive 
                        ? 'bg-primary text-white shadow-sm' 
                        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                    }`
                  }
                  title={isCollapsed ? link.label : undefined}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className={`${isCollapsed ? 'md:hidden' : 'inline'} truncate`}>
                    {link.label}
                  </span>

                  {/* Floating Tooltip in Collapsed Rail Mode */}
                  {isCollapsed && (
                    <span className="hidden md:group-hover:block absolute left-full ml-3 px-2.5 py-1 bg-surface border border-surface-border rounded-lg shadow-elevated text-xs font-semibold text-text-primary whitespace-nowrap z-50 animate-fadeIn">
                      {link.label}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Info Card (Hidden when collapsed) */}
        {!isCollapsed ? (
          <div className="hidden md:block p-3.5 rounded-2xl bg-surface-hover/60 border border-surface-border mt-6 animate-fadeIn">
            <div className="flex items-center gap-2 text-primary mb-1">
              <HelpCircle className="w-4 h-4" />
              <span className="text-xs font-bold">DocentePro v1.2</span>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Gestión administrativa de cátedras, asistencias, notas y calendario docente.
            </p>
          </div>
        ) : (
          <div className="hidden md:flex justify-center p-2 text-text-muted">
            <GraduationCap className="w-5 h-5 opacity-40" />
          </div>
        )}
      </aside>
    </>
  );
}
