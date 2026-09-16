import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, 
  BookOpen, 
  Calendar, 
  Building2, 
  Settings, 
  LifeBuoy, 
  GraduationCap, 
  Award,
  ChevronDown, 
  ChevronRight, 
  CheckSquare, 
  FolderOpen, 
  Users, 
  Plus, 
  PanelLeftClose, 
  PanelLeftOpen, 
  X,
  User,
  Layers,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import CustomSelect from '../common/CustomSelect';
import AvatarPopover, { PRESET_AVATARS } from './AvatarPopover';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { toast } from 'sonner';
import { handleAppError } from '../../utils/handleAppError';

export default function DualSidebar({ isOpen = false, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, esSuperadmin } = useAuth();
  const { 
    catedras, 
    instituciones, 
    selectedInstitucion, 
    setSelectedInstitucion, 
    ciclosLectivos, 
    selectedCiclo, 
    setSelectedCiclo,
    createInstitucion,
    createCicloLectivo,
    refreshData,
    setOpenNewCatedraModal
  } = useApp();

  // Estado colapsado del riel secundario (persistido en localStorage)
  const [isSecondaryNavOpen, setIsSecondaryNavOpen] = useState(() => {
    return localStorage.getItem('planilladocente_dual_secondary_open') !== 'false';
  });

  // Control del Avatar Popover
  const [isAvatarPopoverOpen, setIsAvatarPopoverOpen] = useState(false);
  const avatarButtonRef = useRef(null);

  // Acordeones abiertos de cátedras en el árbol jerárquico
  const [expandedCatedras, setExpandedCatedras] = useState({});

  // Modales de creación rápida en el riel secundario
  const [isInstModalOpen, setIsInstModalOpen] = useState(false);
  const [isCicloModalOpen, setIsCicloModalOpen] = useState(false);

  // Form states para creación rápida
  const [instNombre, setInstNombre] = useState('');
  const [instNivel, setInstNivel] = useState('TERCIARIO');
  const [cicloAnio, setCicloAnio] = useState(new Date().getFullYear());
  const [creating, setCreating] = useState(false);

  const toggleSecondaryNav = () => {
    setIsSecondaryNavOpen(prev => {
      const next = !prev;
      localStorage.setItem('planilladocente_dual_secondary_open', String(next));
      return next;
    });
  };

  // Atajo de teclado global: Ctrl + B / Cmd + B para colapsar o expandir el panel secundario
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setIsSecondaryNavOpen(prev => {
          const next = !prev;
          localStorage.setItem('planilladocente_dual_secondary_open', String(next));
          toast.info(next ? 'Panel lateral desplegado' : 'Panel lateral oculto (espacio de trabajo ampliado)', {
            duration: 1800
          });
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto expandir cátedra actual si estamos en `/catedra/:id`
  useEffect(() => {
    const match = location.pathname.match(/\/catedra\/([^/?#]+)/);
    if (match && match[1]) {
      setExpandedCatedras(prev => ({ ...prev, [match[1]]: true }));
    }
  }, [location.pathname]);

  const toggleCatedraAccordion = (catId, e) => {
    e.stopPropagation();
    setExpandedCatedras(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  // Íconos del Riel Superior con sus microinteracciones físicas independientes
  const primaryUpperLinks = [
    {
      to: '/dashboard',
      label: 'Dashboard & Cátedras',
      icon: LayoutGrid,
      buttonHoverClass: 'group hover:bg-indigo-50 dark:hover:bg-indigo-950/40 p-2.5 rounded-xl transition-colors',
      iconClass: 'transition-transform duration-200 ease-out group-hover:scale-110 group-hover:rotate-6 group-hover:text-indigo-600',
      activeButtonClass: 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 rounded-xl',
      activeIconClass: 'text-white'
    },
    {
      to: '/mesas-examen',
      label: 'Mesas de Examen',
      icon: Award,
      buttonHoverClass: 'group hover:bg-amber-50 dark:hover:bg-amber-950/40 p-2.5 rounded-xl transition-colors',
      iconClass: 'transition-transform duration-250 ease-out group-hover:-translate-y-1.5 group-hover:-rotate-6 group-hover:text-amber-500',
      activeButtonClass: 'bg-amber-500 text-white shadow-md shadow-amber-500/25 rounded-xl',
      activeIconClass: 'text-white'
    },
    {
      to: '/calendario',
      label: 'Calendario & Horarios',
      icon: Calendar,
      buttonHoverClass: 'group hover:bg-blue-50 dark:hover:bg-blue-950/40 p-2.5 rounded-xl transition-colors',
      iconClass: 'transition-transform duration-200 ease-in-out group-hover:rotate-12 group-hover:scale-105 group-hover:text-blue-500',
      activeButtonClass: 'bg-blue-600 text-white shadow-md shadow-blue-500/25 rounded-xl',
      activeIconClass: 'text-white'
    },
    {
      to: '/instituciones',
      label: 'Instituciones & Ciclos',
      icon: Building2,
      buttonHoverClass: 'group hover:bg-emerald-50 dark:hover:bg-emerald-950/40 p-2.5 rounded-xl transition-colors',
      iconClass: 'transition-transform duration-200 ease-out group-hover:-translate-y-1 group-hover:scale-105 group-hover:text-emerald-500',
      activeButtonClass: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25 rounded-xl',
      activeIconClass: 'text-white'
    },
    {
      to: '/configuracion',
      label: 'Configuración',
      icon: Settings,
      buttonHoverClass: 'group hover:bg-slate-100 dark:hover:bg-slate-800/60 p-2.5 rounded-xl transition-colors',
      iconClass: 'transition-transform duration-500 ease-in-out group-hover:rotate-90 group-hover:text-slate-900 dark:group-hover:text-white',
      activeButtonClass: 'bg-slate-800 dark:bg-slate-700 text-white shadow-md rounded-xl',
      activeIconClass: 'text-white'
    },
    {
      to: '/guias',
      label: 'Guías de Usuario',
      icon: BookOpen,
      buttonHoverClass: 'group hover:bg-violet-50 dark:hover:bg-violet-950/40 p-2.5 rounded-xl transition-colors',
      iconClass: 'transition-transform duration-200 ease-out group-hover:skew-x-3 group-hover:scale-110 group-hover:text-violet-500',
      activeButtonClass: 'bg-violet-600 text-white shadow-md shadow-violet-500/25 rounded-xl',
      activeIconClass: 'text-white'
    },
    ...(esSuperadmin ? [{
      to: '/admin',
      label: 'Panel Superadmin',
      icon: ShieldAlert,
      buttonHoverClass: 'group hover:bg-rose-50 dark:hover:bg-rose-950/40 p-2.5 rounded-xl transition-colors',
      iconClass: 'transition-transform duration-200 ease-out group-hover:scale-110 group-hover:text-rose-500',
      activeButtonClass: 'bg-gradient-to-br from-rose-500 to-indigo-600 text-white shadow-md shadow-rose-500/25 rounded-xl',
      activeIconClass: 'text-white',
      isSpecial: true
    }] : [])
  ];

  // Crear Institución Rápida
  const handleCreateInst = async (e) => {
    e.preventDefault();
    if (!instNombre.trim()) return;
    setCreating(true);
    try {
      await createInstitucion(instNombre.trim(), instNivel);
      setInstNombre('');
      setIsInstModalOpen(false);
      toast.success('Institución registrada correctamente');
    } catch (err) {
      handleAppError(err, 'DualSidebar / Registrar Institución', user);
    } finally {
      setCreating(false);
    }
  };

  // Crear Ciclo Rápido
  const handleCreateCiclo = async (e) => {
    e.preventDefault();
    if (!cicloAnio) return;
    setCreating(true);
    try {
      await createCicloLectivo(cicloAnio, true);
      setIsCicloModalOpen(false);
      toast.success(`Ciclo ${cicloAnio} activado`);
    } catch (err) {
      handleAppError(err, 'DualSidebar / Crear Ciclo', user);
    } finally {
      setCreating(false);
    }
  };

  const teacherName = user?.perfil?.nombre || user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Docente';
  const currentAvatar = user?.user_metadata?.avatar_url || 'preset:avatar-1';

  // Sub-views de cada cátedra en el árbol
  const getCatedraSubViews = (catId) => [
    { id: 'asistencias', label: 'Asistencia', icon: CheckSquare, query: '?tab=asistencias' },
    { id: 'calificaciones', label: 'Calificaciones', icon: GraduationCap, query: '?tab=calificaciones' },
    { id: 'alumnos', label: 'Alumnos', icon: Users, query: '?tab=alumnos' },
    { id: 'unidades', label: 'Programa', icon: Layers, query: '?tab=unidades' },
    { id: 'libro-temas', label: 'Libro Temas', icon: BookOpen, query: '?tab=libro-temas' },
    { id: 'recursos', label: 'Recursos', icon: FolderOpen, query: '?tab=recursos' },
    { id: 'configuracion', label: 'Ajustes', icon: Settings, query: '?tab=configuracion' }
  ];

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* DUAL SIDEBAR CONTAINER */}
      <aside
        className={`
          fixed md:sticky top-0 md:top-16 bottom-0 left-0 z-50 md:z-20 h-[100dvh] md:h-[calc(100vh-4rem)]
          flex shrink-0 transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Espaciador de riel fijo de 64px para desktop */}
        <div className="w-16 min-w-[4rem] shrink-0 hidden md:block pointer-events-none" aria-hidden="true" />

        {/* ========================================================
            1. RIEL PRINCIPAL DE ÍCONOS (SIN SCROLLBAR VERTICAL)
           ======================================================== */}
        <div className={`w-16 min-w-[4rem] h-screen max-h-screen fixed left-0 top-0 bg-white dark:bg-slate-950 border-r border-slate-200/80 dark:border-white/10 flex flex-col justify-between py-3 items-center z-40 select-none overflow-hidden ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} transition-transform duration-300 ease-in-out`}>
          
          {/* --- GRUPO SUPERIOR --- */}
          <div className="flex flex-col items-center w-full">
            {/* Logo superior en contenedor centrado con botón de home */}
            <NavLink
              to="/dashboard"
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="PlanillaDocente — Ir al Inicio"
            >
              <GraduationCap className="w-5 h-5 transition-transform duration-200 hover:rotate-12" />
            </NavLink>

            {/* Divisor fino horizontal */}
            <div className="w-8 h-[1px] bg-slate-200 dark:bg-white/10 my-2" />

            {/* Contenedor de iconos de navegación con espaciado compacto */}
            <nav className="flex flex-col gap-1.5 items-center w-full" aria-label="Navegación principal">
              {primaryUpperLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname.startsWith(link.to);

                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={onClose}
                    className={`
                      relative w-10 h-10 flex items-center justify-center cursor-pointer touch-target-44
                      ${isActive
                        ? link.activeButtonClass
                        : link.buttonHoverClass
                      }
                      ${link.isSpecial && !isActive ? 'border border-rose-500/30 bg-rose-500/10' : ''}
                    `}
                    title={link.label}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? link.activeIconClass : link.iconClass}`} />

                    {/* Tooltip flotante a la derecha en modo hover */}
                    <span className="hidden md:group-hover:flex absolute left-full ml-3 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg shadow-xl text-xs font-semibold text-text-primary whitespace-nowrap z-50 animate-fadeIn pointer-events-none items-center gap-1.5 backdrop-blur-md">
                      {link.label}
                    </span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* --- GRUPO INFERIOR (SIEMPRE VISIBLE SIN HACER SCROLL) --- */}
          <div className="flex flex-col items-center gap-1.5 w-full mt-auto pt-2 border-t border-slate-200/60 dark:border-white/5">
            
            {/* Botón de Soporte / Ayuda */}
            <NavLink
              to="/soporte"
              onClick={onClose}
              className={`
                relative w-10 h-10 flex items-center justify-center cursor-pointer touch-target-44
                ${location.pathname === '/soporte'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-500/25 rounded-xl'
                  : 'group hover:bg-rose-50 dark:hover:bg-rose-950/40 p-2.5 rounded-xl transition-colors text-text-muted hover:text-rose-600'
                }
              `}
              title="Soporte Técnico"
            >
              <LifeBuoy className={`w-5 h-5 shrink-0 ${
                location.pathname === '/soporte' 
                  ? 'text-white' 
                  : 'transition-transform duration-300 ease-out group-hover:-rotate-45 group-hover:scale-110 group-hover:text-rose-500'
              }`} />

              <span className="hidden md:group-hover:flex absolute left-full ml-3 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg shadow-xl text-xs font-semibold text-text-primary whitespace-nowrap z-50 animate-fadeIn pointer-events-none items-center gap-1.5 backdrop-blur-md">
                Soporte Técnico
              </span>
            </NavLink>

            {/* Botón de Colapso/Expansión del panel secundario [ ◨ ] */}
            <button
              type="button"
              onClick={toggleSecondaryNav}
              className="group hover:bg-slate-100 dark:hover:bg-slate-800/60 p-2 rounded-xl transition-colors hidden md:flex items-center justify-center w-10 h-10 text-text-muted hover:text-text-primary cursor-pointer relative"
              title={isSecondaryNavOpen ? 'Ocultar panel lateral (Ctrl + B)' : 'Mostrar panel lateral (Ctrl + B)'}
              aria-label="Alternar panel de gestión docente"
            >
              {isSecondaryNavOpen ? (
                <PanelLeftClose className="w-4 h-4 transition-transform duration-200 ease-out group-hover:-translate-x-1" />
              ) : (
                <PanelLeftOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 transition-transform duration-200 ease-out group-hover:scale-110" />
              )}

              <span className="hidden md:group-hover:flex absolute left-full ml-3 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg shadow-xl text-xs font-semibold text-text-primary whitespace-nowrap z-50 animate-fadeIn pointer-events-none items-center gap-1.5 backdrop-blur-md">
                {isSecondaryNavOpen ? 'Ocultar panel (Ctrl + B)' : 'Mostrar panel (Ctrl + B)'}
              </span>
            </button>

            {/* Avatar del docente con indicador de estado (fijo al pie) */}
            <div className="relative pt-1">
              <button
                ref={avatarButtonRef}
                type="button"
                onClick={() => setIsAvatarPopoverOpen(prev => !prev)}
                className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-indigo-500/40 hover:border-indigo-500 transition-all duration-200 ease-out hover:ring-2 hover:ring-indigo-500 hover:ring-offset-2 hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center bg-surface-hover"
                title={`Perfil: ${teacherName}`}
              >
                {currentAvatar?.startsWith('preset:') ? (
                  PRESET_AVATARS.find(a => `preset:${a.id}` === currentAvatar)?.svg || (
                    <User className="w-5 h-5 text-text-secondary" />
                  )
                ) : currentAvatar?.startsWith('data:') || currentAvatar?.startsWith('http') ? (
                  <img src={currentAvatar} alt={teacherName} className="w-full h-full object-cover transition-all duration-200 ease-out hover:scale-105 cursor-pointer" />
                ) : (
                  <User className="w-5 h-5 text-text-secondary" />
                )}

                {/* Indicador de estado activo (Verde esmeralda) */}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-950 shadow-xs" />
              </button>

              {/* Avatar Popover Menu */}
              <AvatarPopover
                isOpen={isAvatarPopoverOpen}
                onClose={() => setIsAvatarPopoverOpen(false)}
                anchorRef={avatarButtonRef}
              />
            </div>

            {/* Mobile close button on mobile */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-primary rounded-lg md:hidden cursor-pointer"
              title="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>

          </div>
        </div>

        {/* ========================================================
            2. PANEL SECUNDARIO COLAPSABLE ("GESTIÓN DOCENTE")
           ======================================================== */}
        <div
          className={`
            bg-white dark:bg-[#0c1222] border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between
            transition-all duration-300 ease-in-out z-10 shrink-0 h-full
            ${isSecondaryNavOpen 
              ? 'w-72 opacity-100 translate-x-0' 
              : 'w-0 opacity-0 -translate-x-full overflow-hidden pointer-events-none md:border-r-0'
            }
          `}
        >
          {/* Cabecera del Panel Secundario */}
          <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800/80 space-y-3 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Gestión Docente
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20">
                  Yastai
                </span>
              </div>

              {/* Botón discreto a la derecha para ocultar el panel */}
              <button
                type="button"
                onClick={toggleSecondaryNav}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Ocultar panel lateral (Ctrl + B)"
                aria-label="Ocultar panel lateral"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* Selector de Institución (CustomDropdown estilizado) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-text-secondary">
                <span className="truncate">Institución</span>
                <button
                  type="button"
                  onClick={() => setIsInstModalOpen(true)}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 text-[10px] cursor-pointer"
                  title="Nueva Institución"
                >
                  <Plus className="w-3 h-3" />
                  <span>Alta</span>
                </button>
              </div>

              <CustomSelect
                value={selectedInstitucion?.id || ''}
                onChange={(val) => {
                  const targetId = typeof val === 'object' ? val.target.value : val;
                  const found = instituciones.find(i => i.id === targetId);
                  if (found) setSelectedInstitucion(found);
                }}
                options={instituciones.map(inst => ({
                  value: inst.id,
                  label: inst.nombre,
                  badge: inst.nivel === 'TERCIARIO' ? 'Terc.' : 'Sec.'
                }))}
                placeholder="Sin instituciones"
                buttonClassName="text-xs py-1.5 px-2.5 bg-slate-100/70 dark:bg-white/5 border border-slate-200/70 dark:border-white/5"
              />
            </div>

            {/* Selector de Ciclo Lectivo (CustomDropdown estilizado) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-text-secondary">
                <span className="truncate">Ciclo Lectivo</span>
                <button
                  type="button"
                  onClick={() => setIsCicloModalOpen(true)}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 text-[10px] cursor-pointer"
                  title="Nuevo Ciclo Lectivo"
                >
                  <Plus className="w-3 h-3" />
                  <span>Alta</span>
                </button>
              </div>

              <CustomSelect
                value={selectedCiclo?.id || ''}
                onChange={(val) => {
                  const targetId = typeof val === 'object' ? val.target.value : val;
                  const found = ciclosLectivos.find(c => c.id === targetId);
                  if (found) setSelectedCiclo(found);
                }}
                options={ciclosLectivos.map(c => ({
                  value: c.id,
                  label: `${c.anio} ${c.activo ? '• Activo' : ''}`,
                  badge: String(c.anio)
                }))}
                placeholder="Sin ciclos"
                buttonClassName="text-xs py-1.5 px-2.5 bg-slate-100/70 dark:bg-white/5 border border-slate-200/70 dark:border-white/5 font-mono"
              />
            </div>
          </div>

          {/* Menú de Árbol Jerárquico: CÁTEDRAS ACTIVAS & SUB-VISTAS */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Cátedras ({catedras.length})
              </span>
              <NavLink
                to="/dashboard"
                onClick={onClose}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                Ver todas
              </NavLink>
            </div>

            {catedras.length === 0 ? (
              <div className="p-4 text-center rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 text-xs text-text-muted space-y-1">
                <BookOpen className="w-6 h-6 mx-auto opacity-30 mb-1" />
                <p className="font-semibold text-text-primary">Sin cátedras activas</p>
                <p className="text-[11px]">Usa el botón de abajo para registrar tu primera materia.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {catedras.map((cat) => {
                  const isExpanded = Boolean(expandedCatedras[cat.id]);
                  const isCurrentCatedra = location.pathname.startsWith(`/catedra/${cat.id}`);

                  return (
                    <div key={cat.id} className="rounded-xl overflow-hidden">
                      {/* Cabecera de Cátedra */}
                      <div
                        onClick={() => {
                          navigate(`/catedra/${cat.id}`);
                          if (onClose && window.innerWidth < 768) onClose();
                        }}
                        className={`
                          flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold
                          cursor-pointer transition-all duration-150 select-none group
                          ${isCurrentCatedra
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20'
                            : 'text-text-primary hover:bg-slate-100/80 dark:hover:bg-white/5'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <BookOpen className={`w-3.5 h-3.5 shrink-0 ${isCurrentCatedra ? 'text-indigo-600 dark:text-indigo-400' : 'text-text-muted'}`} />
                          <span className="truncate">{cat.nombre}</span>
                        </div>

                        {/* Botón de acordeón para desplegar sub-vistas */}
                        <button
                          type="button"
                          onClick={(e) => toggleCatedraAccordion(cat.id, e)}
                          className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-slate-200/50 dark:hover:bg-white/10 shrink-0 transition-transform"
                          title={isExpanded ? 'Contraer accesos' : 'Expandir accesos'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Sub-vistas anidadas: Asistencia, Calificaciones, Alumnos, Recursos, Config */}
                      {isExpanded && (
                        <div className="ml-4 pl-2.5 border-l border-slate-200 dark:border-white/10 py-1 space-y-0.5 animate-fadeIn">
                          {getCatedraSubViews(cat.id).map((sub) => {
                            const SubIcon = sub.icon;
                            const isSubActive = isCurrentCatedra && (
                              (location.search === sub.query) || 
                              (!location.search && sub.id === 'asistencias')
                            );

                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => {
                                  navigate(`/catedra/${cat.id}${sub.query}`);
                                  if (onClose && window.innerWidth < 768) onClose();
                                }}
                                className={`
                                  w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap
                                  transition-all duration-150 text-left cursor-pointer
                                  ${isSubActive
                                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                                    : 'text-text-secondary hover:text-text-primary hover:bg-slate-100 dark:hover:bg-white/5'
                                  }
                                `}
                              >
                                <SubIcon className="w-3.5 h-3.5 shrink-0 opacity-85" />
                                <span className="truncate">{sub.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer de Riel Secundario: Alta Rápida de Cátedra & Panel Superadmin */}
          <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2 shrink-0">
            {esSuperadmin && (
              <button
                type="button"
                onClick={() => {
                  navigate('/admin');
                  if (onClose) onClose();
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl bg-gradient-to-r from-rose-500/15 via-indigo-500/10 to-indigo-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition-all cursor-pointer shadow-xs"
                title="Acceder al Panel de Superadministrador"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                <span>Panel Superadmin</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setOpenNewCatedraModal(true);
                if (onClose) onClose();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Nueva Cátedra</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Modal Nueva Institución Rápida */}
      <Modal
        isOpen={isInstModalOpen}
        onClose={() => setIsInstModalOpen(false)}
        title="Crear Nueva Institución"
        subtitle="Registra el colegio o instituto terciario"
      >
        <form onSubmit={handleCreateInst} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Nombre de la Institución
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Instituto Superior N° 19"
              value={instNombre}
              onChange={(e) => setInstNombre(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-surface text-text-primary border border-surface-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Nivel Educativo
            </label>
            <CustomSelect
              value={instNivel}
              onChange={(val) => setInstNivel(typeof val === 'object' ? val.target.value : val)}
              options={[
                { value: 'TERCIARIO', label: 'Terciario / Superior' },
                { value: 'SECUNDARIO', label: 'Secundario' }
              ]}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsInstModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button type="submit" loading={creating}>
              Crear Institución
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Nuevo Ciclo Lectivo Rápido */}
      <Modal
        isOpen={isCicloModalOpen}
        onClose={() => setIsCicloModalOpen(false)}
        title="Crear Nuevo Ciclo Lectivo"
        subtitle="Habilita un año académico para agrupar cátedras"
      >
        <form onSubmit={handleCreateCiclo} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Año Lectivo
            </label>
            <input
              type="number"
              required
              min="2000"
              max="2100"
              value={cicloAnio}
              onChange={(e) => setCicloAnio(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-mono bg-surface text-text-primary border border-surface-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsCicloModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button type="submit" loading={creating}>
              Crear Ciclo
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
