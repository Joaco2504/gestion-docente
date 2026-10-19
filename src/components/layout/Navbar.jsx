import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, NavLink, Link } from 'react-router-dom';
import { 
  Menu, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  BookOpen, 
  Home,
  Check,
  LayoutGrid,
  Calendar,
  GraduationCap,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import CommandPalette from './CommandPalette';
import NotificationPanel from './NotificationPanel';
import UserMenu from './UserMenu';
import ThemeToggle from '../common/ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '../common/DropdownMenu';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { esSuperadmin } = useAuth();
  const { catedras, setOpenNewCatedraModal } = useApp();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Atajo global Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Analizar ruta actual para estado de Cátedra activa
  const path = location.pathname;
  const catedraMatch = path.match(/^\/catedra\/([^/?#]+)/);
  const currentCatedraId = catedraMatch ? catedraMatch[1] : null;
  const lastCatedraId = typeof window !== 'undefined' ? localStorage.getItem('last_active_catedra_id') : null;
  const activeCatedraId = currentCatedraId || lastCatedraId || (catedras?.[0]?.id ? String(catedras[0].id) : null);

  const currentCatedra = activeCatedraId 
    ? (catedras || []).find(c => String(c.id) === String(activeCatedraId)) 
    : (catedras?.[0] || null);

  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab');

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { 
      to: currentCatedra ? `/catedra/${currentCatedra.id}` : '/dashboard', 
      label: 'Cátedras', 
      icon: BookOpen,
      isActiveMatch: path.startsWith('/catedra')
    },
    { to: '/calendario', label: 'Calendario', icon: Calendar },
    { to: '/mesas-examen', label: 'Mesas de Examen', icon: GraduationCap },
    ...(esSuperadmin ? [{ to: '/admin', label: 'SuperAdmin', icon: ShieldCheck }] : [])
  ];

  return (
    <>
      <header className="sticky top-0 z-30 h-16 w-full backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 text-text-primary transition-all shadow-xs">
        <div className="flex items-center justify-between gap-1.5 sm:gap-3 w-full px-2.5 sm:px-4 lg:px-6 h-16 max-w-7xl 2xl:max-w-[96rem] mx-auto">
          
          {/* ============================================================
              1. LADO IZQUIERDO: LOGO SVG KORUM + SELECTOR DE CÁTEDRA ACTIVA
             ============================================================ */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink min-w-0">
            {/* Isotipo & Marca Korum */}
            <Link 
              to="/dashboard" 
              className="flex items-center gap-2.5 group shrink-0 focus-visible:outline-none"
              title="Korum 2.0 - Plataforma Académica"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              </div>
              <div className="hidden sm:flex flex-col">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-black text-lg tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Korum
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    2.0
                  </span>
                </div>
              </div>
            </Link>

            {/* Divisor vertical sutil */}
            <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

            {/* Selector Dropdown de Cátedra Activa */}
            {currentCatedra ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/70 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-text-primary transition-all max-w-[110px] xs:max-w-[140px] sm:max-w-[180px] xl:max-w-[220px] truncate cursor-pointer shadow-2xs group shrink-0"
                    title={`Cátedra activa: ${currentCatedra.nombre}`}
                  >
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white dark:ring-slate-900" 
                      style={{ backgroundColor: currentCatedra.color || '#10B981' }}
                    />
                    <span className="truncate">{currentCatedra.nombre}</span>
                    <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="start" className="w-72 max-h-80 overflow-y-auto">
                  <DropdownMenuLabel className="flex items-center justify-between text-xs text-text-muted">
                    <span>Espacios Curriculares</span>
                    <span className="text-[10px] font-mono font-normal">{(catedras || []).length} activas</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(catedras || []).map((cat) => {
                    const isSelected = String(cat.id) === String(currentCatedra.id);
                    return (
                      <DropdownMenuItem
                        key={cat.id}
                        onClick={() => {
                          const tabQuery = activeTab ? `?tab=${activeTab}` : '';
                          navigate(`/catedra/${cat.id}${tabQuery}`);
                        }}
                        className="flex items-center justify-between py-2 cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/20" 
                            style={{ backgroundColor: cat.color || '#10B981' }}
                          />
                          <div className="flex flex-col min-w-0">
                            <span className={`text-xs truncate ${isSelected ? 'font-bold text-primary' : 'font-medium text-text-primary'}`}>
                              {cat.nombre}
                            </span>
                            {cat.nivel && (
                              <span className="text-[10px] text-text-muted truncate">
                                {cat.nivel}
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setOpenNewCatedraModal(true)}
                    className="flex items-center gap-2 text-primary font-bold text-xs py-2 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Crear Nueva Cátedra...</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>

          {/* ============================================================
              2. CENTRO: ENLACES DIRECTOS ESTILO LINEAR / VERCEL UI (>= 1024px)
             ============================================================ */}
          <nav 
            aria-label="Navegación principal superior" 
            className="hidden lg:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-900/80 p-1 rounded-2xl border border-slate-200/70 dark:border-slate-800 shrink-0 mx-auto"
          >
            {navLinks.map((link) => {
              const isCurrentActive = link.isActiveMatch !== undefined 
                ? link.isActiveMatch 
                : location.pathname === link.to;

              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-xl shrink-0 transition-all ${
                    isCurrentActive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <link.icon className={`w-3.5 h-3.5 shrink-0 ${isCurrentActive ? 'text-emerald-500' : 'opacity-70'}`} />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* ============================================================
              3. LADO DERECHO: COMMAND PALETTE + TEMA + NOTIF + USER MENU
             ============================================================ */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Botón disparador de Command Palette (⌘K) en Desktop */}
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden sm:inline-flex items-center justify-between gap-2 px-3 py-1.5 w-44 xl:w-56 rounded-xl bg-slate-100/90 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 text-xs text-text-muted hover:text-text-primary hover:border-emerald-500/40 hover:bg-surface transition-all cursor-pointer shadow-2xs group active:scale-[0.99]"
              title="Abrir buscador global de Korum (Ctrl+K)"
            >
              <span className="inline-flex items-center gap-2 min-w-0 truncate">
                <Search className="w-3.5 h-3.5 text-text-muted group-hover:text-emerald-500 transition-colors shrink-0" />
                <span className="truncate font-medium text-text-secondary">Buscar...</span>
              </span>
              <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-text-muted font-bold shadow-2xs shrink-0">
                ⌘K
              </kbd>
            </button>

            {/* Lupa para disparar CommandPalette en móvil (<640px) */}
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              aria-label="Abrir buscador global"
              className="sm:hidden w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-text-muted hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer active:scale-95 shrink-0"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Selector de Tema Oscuro / Claro */}
            <ThemeToggle className="p-1.5 sm:p-2" />

            {/* Campana de Notificaciones & Agenda */}
            <NotificationPanel />

            {/* Divisor vertical sutil */}
            <div className="hidden sm:block h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

            {/* Menú de Perfil Docente */}
            <UserMenu />
          </div>

        </div>
      </header>

      {/* Modal Dialog de la Paleta de Comandos */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
      />
    </>
  );
}
