import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BookOpen, Calendar, Building2, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function BottomNav() {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  const navItems = [
    { to: '/dashboard', label: 'Cátedras', icon: BookOpen },
    { to: '/calendario', label: 'Agenda', icon: Calendar },
    { to: '/instituciones', label: 'Colegios', icon: Building2 },
  ];

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-lg border-t border-surface-border shadow-elevated safe-area-bottom"
      aria-label="Navegación móvil inferior"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-semibold transition-all select-none touch-target-44 ${
                isActive
                  ? 'text-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${
                isActive ? 'bg-primary/10 dark:bg-primary/20 scale-110' : ''
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="mt-0.5 tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}

        {/* Theme toggle directly inside bottom nav */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-semibold text-text-muted hover:text-text-primary transition-all select-none touch-target-44"
          title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          <div className="p-1 rounded-xl">
            {isDark ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-blue-500" />
            )}
          </div>
          <span className="mt-0.5 tracking-tight">{isDark ? 'Claro' : 'Oscuro'}</span>
        </button>
      </div>
    </nav>
  );
}
