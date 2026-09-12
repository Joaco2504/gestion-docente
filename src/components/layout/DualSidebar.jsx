import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  Building2, 
  Settings, 
  BookMarked, 
  LifeBuoy, 
  GraduationCap, 
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
  Sparkles,
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
    refreshData
  } = useApp();

  // Estado colapsado del riel secundario (persistido en localStorage)
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(() => {
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
  const [isCatedraModalOpen, setIsCatedraModalOpen] = useState(false);

  // Form states para creación rápida
  const [instNombre, setInstNombre] = useState('');
  const [instNivel, setInstNivel] = useState('TERCIARIO');
  const [cicloAnio, setCicloAnio] = useState(new Date().getFullYear());
  const [newCatNombre, setNewCatNombre] = useState('');
  const [newCatNivel, setNewCatNivel] = useState('TERCIARIO');
  const [newCatModalidad, setNewCatModalidad] = useState('ANUAL');
  const [creating, setCreating] = useState(false);

  const toggleSubmenu = () => {
    setIsSubmenuOpen(prev => {
      const next = !prev;
      localStorage.setItem('planilladocente_dual_secondary_open', String(next));
      return next;
    });
  };

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

  // Icon rail links
  const primaryLinks = [
    { to: '/dashboard', label: 'Dashboard & Cátedras', icon: LayoutDashboard },
    { to: '/calendario', label: 'Calendario & Horarios', icon: Calendar },
    { to: '/instituciones', label: 'Instituciones & Ciclos', icon: Building2 },
    { to: '/configuracion', label: 'Configuración', icon: Settings },
    { to: '/guias', label: 'Guías de Usuario', icon: BookMarked },
    { to: '/soporte', label: 'Soporte Técnico', icon: LifeBuoy },
    ...(esSuperadmin ? [{ to: '/admin', label: 'Panel Superadmin', icon: ShieldAlert, isSpecial: true }] : [])
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
      toast.error('Error al registrar institución: ' + err.message);
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
      toast.error('Error al crear ciclo: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const teacherName = user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Docente';
  const currentAvatar = user?.user_metadata?.avatar_url || 'preset:avatar-1';

  // Sub-views de cada cátedra en el árbol
  const getCatedraSubViews = (catId) => [
    { id: 'asistencias', label: 'Asistencia', icon: CheckSquare, query: '?tab=asistencias' },
    { id: 'calificaciones', label: 'Calificaciones', icon: GraduationCap, query: '?tab=calificaciones' },
    { id: 'alumnos', label: 'Alumnos', icon: Users, query: '?tab=alumnos' },
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
        {/* ========================================================
            1. RIEL IZQUIERDO ESTRECHO (ICON RAIL: 4rem / 64px)
           ======================================================== */}
        <div className="w-16 bg-white dark:bg-[#080d1a] border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between items-center py-3.5 z-20 shrink-0 select-none shadow-xs dark:shadow-none">
          {/* Top Logo / Isotipo */}
          <div className="flex flex-col items-center gap-4">
            <NavLink
              to="/dashboard"
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white shadow-md shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
              title="PlanillaDocente — Yastai de Geti"
            >
              <GraduationCap className="w-5 h-5" />
            </NavLink>

            {/* Separador sutil */}
            <div className="w-8 h-[1px] bg-surface-border" />

            {/* Primary Action Icons */}
            <nav className="flex flex-col items-center gap-1.5" aria-label="Riel de accesos rápidos">
              {primaryLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname.startsWith(link.to);

                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={onClose}
                    className={`
                      relative group w-10 h-10 rounded-xl flex items-center justify-center
                      transition-all duration-150 touch-target-44 cursor-pointer
                      ${isActive
                        ? link.isSpecial 
                          ? 'bg-gradient-to-br from-rose-500 to-primary text-white shadow-md shadow-rose-500/30' 
                          : 'bg-primary text-white shadow-md shadow-primary/30'
                        : link.isSpecial
                          ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30'
                          : 'text-text-muted hover:text-text-primary hover:bg-surface-hover/80'
                      }
                    `}
                    title={link.label}
                  >
                    <Icon className="w-5 h-5 shrink-0" />

                    {/* Tooltip flotante a la derecha en modo hover */}
                    <span className="hidden md:group-hover:flex absolute left-full ml-3 px-2.5 py-1 bg-surface border border-surface-border rounded-lg shadow-elevated text-xs font-semibold text-text-primary whitespace-nowrap z-50 animate-fadeIn pointer-events-none items-center gap-1.5 backdrop-blur-md">
                      {link.label}
                    </span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Bottom: Teacher Avatar with Active Pulse Ring */}
          <div className="relative flex flex-col items-center">
            {/* Mobile close button on mobile */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 mb-2 text-text-muted hover:text-text-primary rounded-lg md:hidden"
              title="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Toggle Rail Collapse Button (Desktop) */}
            <button
              type="button"
              onClick={toggleSubmenu}
              className="hidden md:flex w-8 h-8 rounded-lg mb-3 items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
              title={isSubmenuOpen ? 'Ocultar panel de cátedras' : 'Mostrar panel de cátedras'}
              aria-label="Alternar panel secundario"
            >
              {isSubmenuOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4 text-primary" />
              )}
            </button>

            {/* Avatar Button */}
            <button
              ref={avatarButtonRef}
              type="button"
              onClick={() => setIsAvatarPopoverOpen(prev => !prev)}
              className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-primary/40 hover:border-primary transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center bg-surface-hover group"
              title={`Perfil: ${teacherName}`}
            >
              {currentAvatar?.startsWith('preset:') ? (
                PRESET_AVATARS.find(a => `preset:${a.id}` === currentAvatar)?.svg || (
                  <User className="w-5 h-5 text-text-secondary" />
                )
              ) : currentAvatar?.startsWith('data:') || currentAvatar?.startsWith('http') ? (
                <img src={currentAvatar} alt={teacherName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-text-secondary" />
              )}

              {/* Halo / Dot Activo Verde */}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-surface" />
            </button>

            {/* Avatar Popover Menu */}
            <AvatarPopover
              isOpen={isAvatarPopoverOpen}
              onClose={() => setIsAvatarPopoverOpen(false)}
              anchorRef={avatarButtonRef}
            />
          </div>
        </div>

        {/* ========================================================
            2. SUB-MENÚ DESPLEGABLE SECUNDARIO (SECONDARY RAIL: 14rem / 224px)
           ======================================================== */}
        <div
          className={`
            bg-white dark:bg-[#0c1222] border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between
            transition-all duration-300 ease-in-out overflow-hidden z-10
            ${isSubmenuOpen ? 'w-56 opacity-100' : 'w-0 opacity-0 md:border-r-0 pointer-events-none'}
          `}
        >
          {/* Sub-menu Header & Cascading Selectors */}
          <div className="p-3 border-b border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  Gestión Docente
                </span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary/10 text-primary font-bold">
                Yastai
              </span>
            </div>

            {/* Selector de Institución (CustomDropdown estilizado) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-text-secondary">
                <span className="truncate">Institución</span>
                <button
                  type="button"
                  onClick={() => setIsInstModalOpen(true)}
                  className="text-primary hover:underline flex items-center gap-0.5 text-[10px]"
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
                buttonClassName="text-xs py-1.5 px-2.5 bg-surface-hover/70"
              />
            </div>

            {/* Selector de Ciclo Lectivo (CustomDropdown estilizado) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-text-secondary">
                <span className="truncate">Ciclo Lectivo</span>
                <button
                  type="button"
                  onClick={() => setIsCicloModalOpen(true)}
                  className="text-primary hover:underline flex items-center gap-0.5 text-[10px]"
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
                buttonClassName="text-xs py-1.5 px-2.5 bg-surface-hover/70 font-mono"
              />
            </div>
          </div>

          {/* Menú de Árbol Jerárquico: CÁTEDRAS ACTIVAS & SUB-VISTAS */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-thin">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Cátedras ({catedras.length})
              </span>
              <NavLink
                to="/dashboard"
                onClick={onClose}
                className="text-[10px] text-primary hover:underline font-semibold"
              >
                Ver todas
              </NavLink>
            </div>

            {catedras.length === 0 ? (
              <div className="p-3 text-center rounded-xl bg-surface-hover/40 border border-surface-border text-xs text-text-muted">
                No hay cátedras en este ciclo.
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
                          flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold
                          cursor-pointer transition-all duration-150 select-none group
                          ${isCurrentCatedra
                            ? 'bg-primary/10 text-primary font-bold'
                            : 'text-text-primary hover:bg-surface-hover hover:text-text-primary'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <BookOpen className={`w-3.5 h-3.5 shrink-0 ${isCurrentCatedra ? 'text-primary' : 'text-text-muted'}`} />
                          <span className="truncate">{cat.nombre}</span>
                        </div>

                        {/* Botón de acordeón para desplegar sub-vistas */}
                        <button
                          type="button"
                          onClick={(e) => toggleCatedraAccordion(cat.id, e)}
                          className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-border/50 shrink-0 transition-transform"
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
                        <div className="ml-4 pl-2 border-l border-surface-border py-1 space-y-0.5 animate-fadeIn">
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
                                  w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-medium
                                  transition-all duration-150 text-left
                                  ${isSubActive
                                    ? 'bg-primary text-white font-semibold shadow-xs'
                                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                                  }
                                `}
                              >
                                <SubIcon className="w-3 h-3 shrink-0 opacity-80" />
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
          <div className="p-2.5 border-t border-surface-border/70 space-y-1.5">
            {esSuperadmin && (
              <button
                type="button"
                onClick={() => {
                  navigate('/admin');
                  if (onClose) onClose();
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl bg-gradient-to-r from-rose-500/15 via-primary/10 to-primary/15 text-rose-600 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition-all cursor-pointer"
                title="Acceder al Panel de Superadministrador"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                <span>Panel Superadmin</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                navigate('/dashboard');
                if (onClose) onClose();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Cátedra</span>
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
