import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, 
  Calendar, 
  BookOpen, 
  GraduationCap, 
  Building2, 
  BookMarked, 
  Settings, 
  LifeBuoy, 
  ShieldCheck, 
  PanelLeftClose, 
  PanelLeftOpen, 
  ChevronRight, 
  Plus, 
  X,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import Tooltip from '../common/Tooltip';

export default function AppSidebar({
  isMobileOpen = false,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, esSuperadmin } = useAuth();
  const { catedras, setOpenNewCatedraModal } = useApp();

  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(min-width: 1024px)');
    const onChange = (e) => setIsDesktop(e.matches);
    setIsDesktop(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // En escritorio (>= 1024px) respeta preferencia de colapso; en tablet (641-1023px) siempre colapsado a 72px
  const isRailCollapsed = !isDesktop || Boolean(isCollapsed);

  const [expandedSections, setExpandedSections] = useState({
    catedras: true
  });

  const isCurrent = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const navGroups = [
    {
      id: 'hoy',
      title: 'Hoy',
      items: [
        {
          label: 'Inicio',
          to: '/dashboard',
          icon: LayoutGrid,
          badge: null
        },
        {
          label: 'Calendario',
          to: '/calendario',
          icon: Calendar,
          badge: null
        }
      ]
    },
    {
      id: 'academico',
      title: 'Académico',
      items: [
        {
          label: 'Cátedras',
          to: '/dashboard',
          icon: BookOpen,
          badge: (catedras || []).length > 0 ? (catedras || []).length : null,
          hasSubmenu: true
        },
        {
          label: 'Mesas de Examen',
          to: '/mesas-examen',
          icon: GraduationCap,
          badge: null
        }
      ]
    },
    {
      id: 'gestion',
      title: 'Gestión',
      items: [
        {
          label: 'Instituciones',
          to: '/instituciones',
          icon: Building2,
          badge: null
        },
        {
          label: 'Guías y Recursos',
          to: '/guias',
          icon: BookMarked,
          badge: null
        }
      ]
    },
    {
      id: 'sistema',
      title: 'Sistema',
      items: [
        {
          label: 'Configuración',
          to: '/configuracion',
          icon: Settings,
          badge: null
        },
        {
          label: 'Soporte',
          to: '/soporte',
          icon: LifeBuoy,
          badge: null
        },
        ...(esSuperadmin ? [
          {
            label: 'Administración',
            to: '/admin',
            icon: ShieldCheck,
            badge: 'Admin'
          }
        ] : [])
      ]
    }
  ];

  const renderNavItem = (item, collapsed) => {
    const Icon = item.icon;
    const active = isCurrent(item.to);

    const linkContent = (
      <NavLink
        to={item.to}
        onClick={() => {
          if (onCloseMobile) onCloseMobile();
        }}
        aria-current={active ? 'page' : undefined}
        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-colors duration-150 outline-hidden select-none active:scale-[0.98] ${
          active
            ? 'bg-primary/10 text-primary font-bold shadow-2xs'
            : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
        } ${collapsed ? 'justify-center px-0 w-11 h-11 mx-auto' : 'w-full'}`}
      >
        {/* Barra indicadora activa */}
        {active && (
          <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" />
        )}

        <Icon className={`w-5 h-5 shrink-0 transition-transform duration-150 ${active ? 'text-primary scale-105' : 'text-text-muted group-hover:text-text-primary'}`} />

        {!collapsed && (
          <span className="truncate flex-1 text-left">
            {item.label}
          </span>
        )}

        {!collapsed && item.badge && (
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md ${
            active 
              ? 'bg-primary text-white' 
              : 'bg-slate-200/60 dark:bg-slate-800 text-text-muted'
          }`}>
            {item.badge}
          </span>
        )}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.label} content={item.label} side="right">
          {linkContent}
        </Tooltip>
      );
    }

    return <div key={item.label}>{linkContent}</div>;
  };

  const renderSidebarContent = (collapsed, isDrawer = false) => (
    <div className="flex flex-col h-full bg-surface border-r border-border/50 text-text-primary select-none">
      {/* 1. Cabecera del Sidebar con Logo y Botón de Colapso */}
      <div className={`flex items-center h-16 px-4 border-b border-border/40 shrink-0 ${collapsed ? 'justify-center px-2' : 'justify-between'}`}>
        {!collapsed ? (
          <div 
            onClick={() => {
              navigate('/dashboard');
              if (isDrawer && onCloseMobile) onCloseMobile();
            }}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-black text-base shadow-sm group-hover:scale-105 transition-transform duration-150">
              K
            </div>
            <div className="leading-none">
              <span className="font-extrabold text-sm tracking-tight text-text-primary group-hover:text-primary transition-colors">
                KORUM
              </span>
              <span className="block text-[10px] font-mono text-text-muted uppercase tracking-wider mt-0.5">
                Docente
              </span>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-black text-base shadow-sm hover:scale-105 transition-transform duration-150 cursor-pointer"
            title="Korum - Inicio"
          >
            K
          </div>
        )}

        {/* Botón de colapso en escritorio (solo en riel permanente) */}
        {!isDrawer && (
          <div className="hidden lg:block">
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden transition-colors cursor-pointer"
              title={collapsed ? 'Expandir barra (Ctrl+B)' : 'Colapsar barra (Ctrl+B)'}
            >
              {collapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>
        )}

        {/* Botón cerrar en modal móvil / tablet */}
        {isDrawer && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Cerrar navegación lateral"
            className="lg:hidden p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. Cuerpo de Navegación con Secciones Agrupadas */}
      <nav 
        aria-label="Navegación principal"
        className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin"
      >
        {navGroups.map((group) => (
          <div key={group.id} className="space-y-1">
            {!collapsed ? (
              <div className="px-3 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted/70">
                  {group.title}
                </span>
              </div>
            ) : (
              <div className="w-6 h-px bg-border/40 mx-auto my-2" />
            )}

            <div className="space-y-1">
              {group.items.map((it) => renderNavItem(it, collapsed))}
            </div>

            {/* Submenú de cátedras activas cuando el grupo es 'academico' y está expandido */}
            {group.id === 'academico' && !collapsed && (
              <div className="pt-1.5 pl-4 pr-1 space-y-1 border-l-2 border-border/40 ml-4 mt-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-text-muted px-2 py-1">
                  <span>Mis Cátedras</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (isDrawer && onCloseMobile) onCloseMobile();
                      setOpenNewCatedraModal(true);
                    }}
                    className="p-0.5 rounded-md hover:bg-surface-hover text-text-muted hover:text-primary transition-colors cursor-pointer"
                    title="Nueva cátedra"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {(catedras || []).slice(0, 4).map((cat) => {
                  const activeCat = location.pathname === `/catedra/${cat.id}`;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        navigate(`/catedra/${cat.id}`);
                        if (isDrawer && onCloseMobile) onCloseMobile();
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left truncate cursor-pointer ${
                        activeCat
                          ? 'bg-primary/10 text-primary font-bold'
                          : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
                      }`}
                    >
                      <span 
                        className="w-2 h-2 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/20"
                        style={{ backgroundColor: cat.color || '#10B981' }}
                      />
                      <span className="truncate flex-1">
                        {cat.nombre}
                      </span>
                    </button>
                  );
                })}

                {(catedras || []).length > 4 && (
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/dashboard');
                      if (isDrawer && onCloseMobile) onCloseMobile();
                    }}
                    className="w-full text-left text-[11px] font-semibold text-primary hover:underline px-2.5 py-1"
                  >
                    + Ver todas ({(catedras || []).length})
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* 3. Pie del Sidebar */}
      <div className="p-3 border-t border-border/40 shrink-0 bg-slate-50/50 dark:bg-slate-900/20">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-muted font-mono">
              Plataforma Korum
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              En línea
            </span>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Sistema conectado" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. ESCRITORIO & TABLET (Riel lateral permanente: 72px en tablet, 72/232px en escritorio) */}
      <aside 
        className={`hidden md:block shrink-0 transition-[width] duration-200 ease-out z-20 ${
          isRailCollapsed ? 'w-[72px]' : 'w-[232px]'
        }`}
      >
        <div className={`fixed top-0 bottom-0 left-0 transition-[width] duration-200 ease-out ${
          isRailCollapsed ? 'w-[72px]' : 'w-[232px]'
        }`}>
          {renderSidebarContent(isRailCollapsed, false)}
        </div>
      </aside>

      {/* 2. MÓVIL / TABLET OVERLAY (Drawer táctil al presionar Menú) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop con descarte táctil */}
          <div 
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0 duration-150"
          />
          {/* Panel deslizante */}
          <div className="fixed top-0 bottom-0 left-0 w-[260px] max-w-[85vw] shadow-2xl animate-in slide-in-from-left duration-200">
            {renderSidebarContent(false, true)}
          </div>
        </div>
      )}
    </>
  );
}
