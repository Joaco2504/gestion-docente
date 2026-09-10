import React from 'react';
import { useAuth } from '../../context/AuthContext';
import HeaderSelector from './HeaderSelector';
import { GraduationCap, LogOut, User, AlertCircle, Menu } from 'lucide-react';
import Badge from '../common/Badge';

export default function Navbar({ onToggleSidebar }) {
  const { user, isDemo, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-surface-border shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Mobile Hamburger */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 -ml-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover lg:hidden"
            title="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm shadow-primary/30">
            <GraduationCap className="w-6 h-6" />
          </div>

          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-text-primary">Docente<span className="text-primary">Pro</span></span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">v1.0</span>
            </div>
            <p className="text-[11px] text-text-muted -mt-0.5 font-medium">Gestión Administrativa Docente</p>
          </div>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-semibold text-text-primary truncate max-w-[160px]">
              {user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Docente'}
            </span>
            <span className="text-[10px] text-text-muted font-mono">
              {isDemo ? 'Modo Demostración' : 'Supabase Conectado'}
            </span>
          </div>

          <button
            onClick={signOut}
            title="Cerrar sesión"
            className="p-2 rounded-lg text-text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
