import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Menu, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  BookOpen, 
  Home,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import CommandPalette from './CommandPalette';
import NotificationPanel from './NotificationPanel';
import UserMenu from './UserMenu';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '../common/DropdownMenu';

export default function Navbar({ onToggleSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { catedras } = useApp();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Escuchar atajo global Ctrl+K / Cmd+K
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

  // Analizar ruta actual para Breadcrumb
  const path = location.pathname;
  const catedraMatch = path.match(/^\/catedra\/([^/?#]+)/);
  const currentCatedraId = catedraMatch ? catedraMatch[1] : null;
  const currentCatedra = currentCatedraId 
    ? (catedras || []).find(c => String(c.id) === String(currentCatedraId)) 
    : null;

  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab');

  const getTabLabel = (tab) => {
    switch (tab) {
      case 'asistencias': return 'Asistencias';
      case 'calificaciones': return 'Calificaciones';
      case 'libro-temas': return 'Libro de Temas';
      case 'alumnos': return 'Estudiantes';
      case 'recursos': return 'Recursos y Drive';
      case 'unidades': return 'Planificación';
      default: return null;
    }
  };

  const getStaticTitle = () => {
    if (path === '/dashboard' || path === '/') return 'Inicio';
    if (path.startsWith('/calendario')) return 'Calendario Académico';
    if (path.startsWith('/mesas-examen') || path.startsWith('/mesas')) return 'Mesas de Examen';
    if (path.startsWith('/instituciones')) return 'Instituciones';
    if (path.startsWith('/configuracion')) return 'Configuración';
    if (path.startsWith('/guias')) return 'Guías y Recursos';
    if (path.startsWith('/soporte')) return 'Soporte Técnico';
    if (path.startsWith('/admin')) return 'Panel de Administración';
    return 'Korum';
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-14 sm:h-16 w-full bg-surface/90 backdrop-blur-md border-b border-border/50 text-text-primary px-3 sm:px-6 transition-all">
        <div className="h-full flex items-center justify-between gap-3 max-w-7xl 2xl:max-w-[96rem] mx-auto">
          
          {/* ============================================================
              1. LADO IZQUIERDO: MENÚ HAMBURGUESA + BREADCRUMB JERÁRQUICO
             ============================================================ */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
            {/* Botón de apertura de barra lateral en móvil/tablet */}
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label="Abrir barra lateral de navegación"
              className="lg:hidden p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden transition-colors cursor-pointer active:scale-95"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb contextual */}
            <nav aria-label="Ruta de navegación" className="flex items-center gap-1.5 text-xs font-medium min-w-0">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                title="Ir al Inicio"
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Inicio</span>
              </button>

              {currentCatedra ? (
                <>
                  <ChevronRight className="w-3 h-3 text-text-muted/60 shrink-0" />
                  <span className="hidden sm:inline text-text-muted">Cátedras</span>
                  <ChevronRight className="w-3 h-3 text-text-muted/60 shrink-0 hidden sm:inline" />

                  {/* SELECTOR CONTEXTUAL DE CÁTEDRA (solo visible aquí) */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/15 font-bold transition-all text-xs truncate max-w-[140px] sm:max-w-[200px] cursor-pointer"
                        title={`Cátedra actual: ${currentCatedra.nombre}`}
                      >
                        <span 
                          className="w-2 h-2 rounded-full shrink-0" 
                          style={{ backgroundColor: currentCatedra.color || '#10B981' }}
                        />
                        <span className="truncate">{currentCatedra.nombre}</span>
                        <ChevronDown className="w-3 h-3 shrink-0 opacity-70" />
                      </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="start" className="w-64 max-h-72 overflow-y-auto">
                      <DropdownMenuLabel>Cambiar de Cátedra</DropdownMenuLabel>
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
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span 
                                className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/20" 
                                style={{ backgroundColor: cat.color || '#10B981' }}
                              />
                              <span className={`truncate ${isSelected ? 'font-bold text-primary' : ''}`}>
                                {cat.nombre}
                              </span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Pestaña interna de la cátedra */}
                  {activeTab && getTabLabel(activeTab) && (
                    <>
                      <ChevronRight className="w-3 h-3 text-text-muted/60 shrink-0 hidden md:inline" />
                      <span className="font-semibold text-text-primary hidden md:inline truncate">
                        {getTabLabel(activeTab)}
                      </span>
                    </>
                  )}
                </>
              ) : (
                <>
                  <ChevronRight className="w-3 h-3 text-text-muted/60 shrink-0" />
                  <span className="font-bold text-text-primary truncate">
                    {getStaticTitle()}
                  </span>
                </>
              )}
            </nav>
          </div>

          {/* ============================================================
              2. CENTRO: PALETA DE COMANDOS (⌘K / Ctrl+K)
             ============================================================ */}
          <div className="flex items-center justify-center">
            {/* Botón trigger para pantallas medianas y grandes */}
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden sm:inline-flex items-center gap-2.5 px-3.5 py-1.5 w-60 md:w-80 lg:w-96 rounded-xl bg-slate-100/90 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 text-xs text-text-muted hover:text-text-primary hover:border-primary/40 hover:bg-surface transition-all cursor-pointer shadow-2xs group active:scale-[0.99]"
            >
              <Search className="w-3.5 h-3.5 text-text-muted group-hover:text-primary transition-colors shrink-0" />
              <span className="truncate flex-1 text-left font-medium">
                Buscar alumnos, cátedras, acciones...
              </span>
              <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-surface border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-text-muted font-bold shadow-2xs">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* ============================================================
              3. LADO DERECHO: BUSCADOR MÓVIL + NOTIFICACIONES + AVATAR
             ============================================================ */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Lupa para disparar CommandPalette en móvil (<640px) */}
            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              aria-label="Abrir buscador global"
              className="sm:hidden p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer active:scale-95"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Campana de Notificaciones & Agenda */}
            <NotificationPanel />

            {/* Divisor vertical sutil */}
            <div className="h-5 w-px bg-border/60 mx-0.5" />

            {/* Menú de Usuario Unificado */}
            <UserMenu />
          </div>

        </div>
      </header>

      {/* Modal / Dialog de la Paleta de Comandos */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
      />
    </>
  );
}
