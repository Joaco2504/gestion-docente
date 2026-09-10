import React from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, Calendar, Building2, HelpCircle, X, GraduationCap } from 'lucide-react';

export default function Sidebar({ isOpen = false, onClose }) {
  const links = [
    { to: '/dashboard', label: 'Cátedras', icon: BookOpen },
    { to: '/calendario', label: 'Calendario & Horarios', icon: Calendar },
    { to: '/instituciones', label: 'Instituciones & Ciclos', icon: Building2 },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside className={`
        fixed lg:static top-0 bottom-0 left-0 z-40
        w-64 bg-surface border-r border-surface-border p-4 flex flex-col justify-between shrink-0
        transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="space-y-4">
          {/* Mobile close button header */}
          <div className="flex items-center justify-between lg:hidden pb-3 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <span className="font-bold text-sm text-text-primary">DocentePro</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-hover"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">
            Navegación
          </p>

          <nav className="space-y-1">
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
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive 
                        ? 'bg-primary text-white shadow-sm' 
                        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Info card footer */}
        <div className="p-3.5 rounded-xl bg-surface-hover/60 border border-surface-border mt-6">
          <div className="flex items-center gap-2 text-primary mb-1">
            <HelpCircle className="w-4 h-4" />
            <span className="text-xs font-bold">DocentePro v1.0</span>
          </div>
          <p className="text-[11px] text-text-muted leading-relaxed">
            Gestión administrativa de cátedras, asistencias y notas con recuperatorios sin sobreescritura.
          </p>
        </div>
      </aside>
    </>
  );
}
