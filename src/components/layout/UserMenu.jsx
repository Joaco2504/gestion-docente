import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Settings, 
  ShieldCheck, 
  LogOut, 
  Sun, 
  Moon, 
  Laptop,
  Check,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup
} from '../common/DropdownMenu';
import { toast } from 'sonner';

export default function UserMenu() {
  const navigate = useNavigate();
  const { user, perfil, esSuperadmin, signOut } = useAuth();
  const { theme, setTheme, isDark } = useTheme();

  const displayName = user?.user_metadata?.nombre_completo || 
                      user?.user_metadata?.nombre || 
                      perfil?.nombre || 
                      'Prof. Pacheco E. Joaquín';

  const displayEmail = user?.email || 'docente@korum.edu.ar';
  const roleName = esSuperadmin ? 'Superadministrador' : 'Docente Titular';

  // Obtener iniciales (ej. "EP")
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('') || 'DP';

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Sesión finalizada correctamente');
      navigate('/login');
    } catch (err) {
      toast.error('Error al cerrar sesión');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menú de usuario"
          className="relative group p-0.5 rounded-full ring-2 ring-transparent hover:ring-primary/40 focus-visible:ring-primary focus-visible:outline-hidden transition-all duration-150 active:scale-95 cursor-pointer"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center font-bold text-xs sm:text-sm tracking-tight shadow-xs select-none">
            {initials}
          </div>
          {/* Indicador de estado activo */}
          <span 
            className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-surface border border-white/20" 
            title="Conectado"
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        align="end" 
        sideOffset={8}
        className="w-72 p-2 shadow-2xl border border-slate-200/80 dark:border-slate-800 bg-surface/98 backdrop-blur-xl animate-in fade-in-0 zoom-in-95"
      >
        {/* Cabecera del Usuario */}
        <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl mb-1.5 border border-slate-200/40 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-text-primary truncate leading-snug">
                {displayName}
              </p>
              <p className="text-[11px] text-text-muted truncate mt-0.5 font-mono">
                {displayEmail}
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {roleName}
            </span>
            <span className="text-[10px] font-mono text-text-muted">Korum v2.6</span>
          </div>
        </div>

        {/* Acciones principales */}
        <DropdownMenuGroup>
          <DropdownMenuItem 
            onClick={() => navigate('/configuracion')}
            className="flex items-center gap-2.5 py-2 text-xs font-medium"
          >
            <Settings className="w-4 h-4 text-text-muted" />
            <span>Configuración y Preferencias</span>
          </DropdownMenuItem>

          {esSuperadmin && (
            <DropdownMenuItem 
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2.5 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Panel de Administración</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Selector de Tema Visual Integrado */}
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Tema Visual
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Modo Claro"
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Claro</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Modo Oscuro"
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Oscuro</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                theme === 'system'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Tema del Sistema"
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Auto</span>
            </button>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Cierre de Sesión */}
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="flex items-center gap-2.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 focus:bg-rose-500/10 focus:text-rose-600"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
