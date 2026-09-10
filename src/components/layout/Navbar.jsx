import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, LogOut, Menu, User } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';

export default function Navbar({ onToggleSidebar }) {
  const { user, isDemo, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-surface-border transition-colors duration-200 relative overflow-hidden">
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

        {/* Right Actions: Theme Switcher, User Info & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Theme Switcher */}
          <ThemeToggle />

          {/* User badge */}
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-text-primary truncate max-w-[150px]">
              {user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Docente'}
            </span>
            <span className="text-[10px] text-text-muted font-mono">
              {isDemo ? 'Modo Demostración' : 'Supabase Conectado'}
            </span>
          </div>

          <button
            onClick={signOut}
            title="Cerrar sesión"
            className="p-2 rounded-xl text-text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors touch-target-44 flex items-center justify-center"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
