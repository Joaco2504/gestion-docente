import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, 
  Table2,
  CalendarCheck,
  Award,
  Building2, 
  FileSpreadsheet,
  ShieldCheck,
  LifeBuoy, 
  PanelLeftClose, 
  PanelLeftOpen, 
  ChevronDown, 
  ChevronRight, 
  CheckSquare, 
  FolderOpen, 
  Users, 
  Plus, 
  X,
  User,
  Layers,
  BookOpen,
  Settings,
  GraduationCap,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import CustomSelect from '../common/CustomSelect';
import AvatarPopover, { PRESET_AVATARS } from './AvatarPopover';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { KorumIsotypeSvg } from '../common/BrandIllustrations';
import KorumGlobalMenu from './KorumGlobalMenu';
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

  const activeCatedraId = location.pathname.match(/\/catedra\/([^/?#]+)/)?.[1] || catedras[0]?.id;

  // =========================================================================
  // 12 MÓDULOS DE NAVEGACIÓN GLOBAL KORUM (SIN HUECOS MUERTOS)
  // =========================================================================
  const navigationLinks = [
    // 1. Inicio (reemplazando Dashboard)
    {
      id: 'inicio',
      to: '/dashboard',
      label: 'Inicio',
      icon: LayoutGrid,
      isActive: location.pathname === '/dashboard' || location.pathname === '/'
    },
    // 2. Calendario
    {
      id: 'calendario',
      to: '/calendario',
      label: 'Calendario',
      icon: Calendar,
      isActive: location.pathname.startsWith('/calendario')
    },
    // 3. Asistencia
    {
      id: 'asistencias',
      to: activeCatedraId ? `/catedra/${activeCatedraId}?tab=asistencias` : '/dashboard',
      label: 'Asistencia',
      icon: CalendarCheck,
      isActive: location.pathname.startsWith('/catedra') && (location.search.includes('tab=asistencias') || (!location.search && !location.pathname.includes('/mesas-examen')))
    },
    // 4. Calificaciones
    {
      id: 'calificaciones',
      to: activeCatedraId ? `/catedra/${activeCatedraId}?tab=calificaciones` : '/dashboard',
      label: 'Calificaciones',
      icon: Table2,
      isActive: location.pathname.startsWith('/catedra') && location.search.includes('tab=calificaciones')
    },
    // 5. Mesas de Examen
    {
      id: 'mesas',
      to: '/mesas-examen',
      label: 'Mesas de Examen',
      icon: Award,
      isActive: location.pathname.startsWith('/mesas-examen')
    },
    // 6. Instituciones
    {
      id: 'instituciones',
      to: '/instituciones',
      label: 'Instituciones',
      icon: Building2,
      isActive: location.pathname.startsWith('/instituciones')
    },
    // 7. Libro de Temas (renombrado desde Reportes Oficiales)
    {
      id: 'libro-temas',
      to: activeCatedraId ? `/catedra/${activeCatedraId}?tab=libro-temas` : '/guias',
      label: 'Libro de Temas',
      icon: FileSpreadsheet,
      isActive: location.pathname.startsWith('/guias') || (location.pathname.startsWith('/catedra') && location.search.includes('tab=libro-temas'))
    },
    // 8. Centro de Superadmin (visible únicamente para autorizados)
    ...(esSuperadmin ? [{
      id: 'superadmin',
      to: '/admin',
      label: 'Centro Superadmin',
      icon: ShieldCheck,
      isActive: location.pathname.startsWith('/admin'),
      isSuperadminItem: true,
      hasPending: false
    }] : []),
    // 9. Configuración
    {
      id: 'configuracion',
      to: activeCatedraId ? `/catedra/${activeCatedraId}?tab=configuracion` : '/instituciones',
      label: 'Configuración',
      icon: Settings,
      isActive: location.pathname.startsWith('/catedra') && location.search.includes('tab=configuracion')
    },
    // 10. Soporte Técnico
    {
      id: 'soporte',
      to: '/soporte',
      label: 'Soporte Técnico',
      icon: LifeBuoy,
      isActive: location.pathname.startsWith('/soporte')
    }
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
        <div className={`w-16 min-w-[4rem] h-screen max-h-screen fixed left-0 top-0 bg-white dark:bg-slate-950 border-r border-slate-200/80 dark:border-white/10 flex flex-col py-2.5 items-center z-40 select-none overflow-y-auto overflow-x-hidden scrollbar-none ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} transition-transform duration-300 ease-in-out`}>
          
          {/* Botón Disparador Directo Limpio y Transparente Menú Korum */}
          <div className="mb-1 shrink-0">
            <KorumGlobalMenu onToggleSidebar={toggleSecondaryNav} />
          </div>

          {/* Divisor 1px */}
          <div className="border-t border-slate-200 dark:border-slate-800 my-1.5 w-8 shrink-0" />

          {/* NAVEGACIÓN ESTRUCTURADA UNIFORME SIN HUECOS MUERTOS (gap-1.5) */}
          <nav className="flex flex-col gap-1.5 items-center w-full" aria-label="Navegación Principal">
            {navigationLinks.map((link) => {
              const Icon = link.icon;
              const isActive = link.isActive;

              return (
                <NavLink
                  key={link.id}
                  to={link.to}
                  onClick={onClose}
                  className={`
                    relative w-10 h-10 flex items-center justify-center cursor-pointer touch-target-44 group transition-colors shrink-0
                    ${isActive
                      ? 'bg-emerald-500/10 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl font-semibold'
                      : link.isSuperadminItem
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl p-2.5'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl p-2.5'
                    }
                  `}
                  title={link.label}
                >
                  {/* Marcador de posición inequívoco: barra vertical 3px pegada al borde izquierdo */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-emerald-500 rounded-r" />
                  )}

                  <Icon className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />

                  {/* Indicador sutil si hay auditorías pendientes */}
                  {link.isSuperadminItem && link.hasPending && (
                    <span className="w-2 h-2 bg-amber-400 rounded-full absolute top-2 right-2" />
                  )}

                  {/* Tooltip flotante a la derecha en modo hover */}
                  <span className="hidden md:group-hover:flex absolute left-full ml-3 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl text-xs font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap z-50 animate-fadeIn pointer-events-none items-center gap-1.5 backdrop-blur-md">
                    {link.label}
                  </span>
                </NavLink>
              );
            })}

            {/* Divisor 1px antes de controles finales */}
            <div className="border-t border-slate-200 dark:border-slate-800 my-1.5 w-8 shrink-0" />

            {/* 11. Mi Perfil (Avatar Docente con aro esmeralda y popover) */}
            <div className="relative shrink-0">
              <button
                ref={avatarButtonRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAvatarPopoverOpen(prev => !prev);
                }}
                aria-haspopup="true"
                aria-expanded={isAvatarPopoverOpen}
                aria-label="Abrir mi perfil"
                className="relative w-10 h-10 overflow-hidden ring-2 ring-emerald-500/40 hover:ring-emerald-500 transition-all rounded-xl cursor-pointer flex items-center justify-center bg-slate-100 dark:bg-slate-900 hover:scale-105 active:scale-95"
                title={`Mi Perfil: ${teacherName}`}
              >
                {currentAvatar?.startsWith('preset:') ? (
                  PRESET_AVATARS.find(a => `preset:${a.id}` === currentAvatar)?.svg || (
                    <User className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  )
                ) : currentAvatar?.startsWith('data:') || currentAvatar?.startsWith('http') ? (
                  <img src={currentAvatar} alt={teacherName} className="w-full h-full object-cover transition-all duration-200 ease-out hover:scale-105 cursor-pointer" />
                ) : (
                  <User className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                )}

                {/* Micro-badge de conexión activo en la esquina inferior derecha */}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-full" />
              </button>

              {/* Avatar Popover Menu */}
              <AvatarPopover
                isOpen={isAvatarPopoverOpen}
                onClose={() => setIsAvatarPopoverOpen(false)}
                anchorRef={avatarButtonRef}
              />
            </div>

            {/* 12. Mostrar/Ocultar Panel Lateral */}
            <button
              type="button"
              onClick={toggleSecondaryNav}
              className="group hover:bg-slate-100 dark:hover:bg-slate-800/60 p-2 rounded-xl transition-colors hidden md:flex items-center justify-center w-10 h-10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer relative shrink-0"
              title={isSecondaryNavOpen ? 'Ocultar panel lateral (Ctrl + B)' : 'Mostrar panel lateral (Ctrl + B)'}
              aria-label="Mostrar/Ocultar panel lateral"
            >
              {isSecondaryNavOpen ? (
                <PanelLeftClose className="w-4 h-4 transition-transform duration-200 ease-out group-hover:-translate-x-0.5" />
              ) : (
                <PanelLeftOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 transition-transform duration-200 ease-out group-hover:scale-110" />
              )}

              <span className="hidden md:group-hover:flex absolute left-full ml-3 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl text-xs font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap z-50 animate-fadeIn pointer-events-none items-center gap-1.5 backdrop-blur-md">
                {isSecondaryNavOpen ? 'Ocultar panel (Ctrl + B)' : 'Mostrar panel (Ctrl + B)'}
              </span>
            </button>

            {/* Botón cerrar para móvil */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-primary rounded-lg md:hidden cursor-pointer shrink-0"
              title="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </nav>
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
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                  Korum
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
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/60 transition-all cursor-pointer shadow-xs"
                title="Acceder al Panel de Superadministrador"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Panel Superadmin</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setOpenNewCatedraModal(true);
                if (onClose) onClose();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors cursor-pointer"
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
