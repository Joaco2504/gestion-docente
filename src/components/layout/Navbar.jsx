import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useNotifications } from '../../context/NotificationContext';
import { 
  GraduationCap, 
  Menu, 
  Bell, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  X,
  BookMarked,
  ShieldAlert,
  ArrowRight,
  CheckCheck,
  RefreshCw,
  Search,
  ChevronDown,
  BookOpen,
  CalendarCheck,
  Award,
  FileSpreadsheet,
  Settings,
  Users,
  User,
  CornerDownLeft
} from 'lucide-react';
import SunMoonThemeToggle from '../common/SunMoonThemeToggle';
import { useTheme } from '../../context/ThemeContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

function formatTimestamp(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 60 && diffSec >= -60) return 'Hace un instante';
  if (diffSec >= 60 && diffSec < 3600) return `Hace ${Math.floor(diffSec / 60)} min`;
  if (diffSec >= 3600 && diffSec < 86400) return `Hace ${Math.floor(diffSec / 3600)} h`;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

export default function Navbar({ onToggleSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, esSuperadmin } = useAuth();
  const { catedras } = useApp();
  const { isDark, toggleTheme } = useTheme();
  const { 
    notificaciones, 
    unreadCount, 
    loading,
    marcarLeida,
    marcarTodasLeidas, 
    limpiarNotificaciones,
    descartarNotificacion,
    recargarNotificaciones 
  } = useNotifications();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [isCatedraDropdownOpen, setIsCatedraDropdownOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchedStudents, setMatchedStudents] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const notifRef = useRef(null);
  const catedraDropdownRef = useRef(null);

  // Determinar cátedra activa según URL o primera de la lista
  const match = location.pathname.match(/\/catedra\/([^/?#]+)/);
  const currentUrlCatedraId = match ? match[1] : null;
  const activeCatedra = (catedras || []).find(c => String(c.id) === String(currentUrlCatedraId)) || catedras?.[0] || null;

  // Bloqueo de scroll de fondo y reseteo al abrir/cerrar Command Palette
  useEffect(() => {
    if (isCommandPaletteOpen) {
      document.body.style.overflow = 'hidden';
      setSelectedIndex(0);
    } else {
      document.body.style.overflow = '';
      setSearchQuery('');
      setMatchedStudents([]);
      setSelectedIndex(0);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCommandPaletteOpen]);

  // Búsqueda reactiva de estudiantes (por DNI o Nombre/Apellido)
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setMatchedStudents([]);
      return;
    }

    let isMounted = true;
    const cleanDni = q.replace(/\D/g, '');

    const runSearch = async () => {
      setSearchingStudents(true);
      try {
        let found = [];
        if (isSupabaseConfigured && supabase && user?.id) {
          let query = supabase
            .from('estudiantes')
            .select('id, nombre, apellido, dni')
            .limit(8);

          if (cleanDni && cleanDni.length >= 2) {
            query = query.or(`dni.ilike.%${cleanDni}%,nombre.ilike.%${q}%,apellido.ilike.%${q}%`);
          } else {
            query = query.or(`nombre.ilike.%${q}%,apellido.ilike.%${q}%`);
          }

          const { data, error } = await query;
          if (!error && data) {
            found = data;
          }
        }

        // Fallback a localStorage (modo demo o complementario)
        if (found.length === 0) {
          const localList = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('estudiantes_')) {
              try {
                const parsed = JSON.parse(localStorage.getItem(k) || '[]');
                if (Array.isArray(parsed)) localList.push(...parsed);
              } catch (_) {}
            }
          }
          const lowerQ = q.toLowerCase();
          found = localList.filter(s => {
            const fullName = `${s.apellido || ''} ${s.nombre || ''}`.toLowerCase();
            const matchName = fullName.includes(lowerQ);
            const matchDni = cleanDni && String(s.dni || '').replace(/\D/g, '').includes(cleanDni);
            return matchName || matchDni;
          }).slice(0, 8);
        }

        if (isMounted) {
          setMatchedStudents(found);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.warn('CommandPalette student search error:', err);
      } finally {
        if (isMounted) setSearchingStudents(false);
      }
    };

    const timer = setTimeout(runSearch, 120);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, user?.id]);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (catedraDropdownRef.current && !catedraDropdownRef.current.contains(event.target)) {
        setIsCatedraDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Atajo de teclado global: Ctrl + K / Cmd + K para abrir Command Palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      } else if (e.key === 'Escape' && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen]);

  const toggleNotifications = () => {
    if (!showNotifications && unreadCount > 0) {
      marcarTodasLeidas();
    }
    setShowNotifications(!showNotifications);
  };

  const teacherName = 
    user?.perfil?.nombre || 
    user?.user_metadata?.nombre || 
    user?.email?.split('@')[0] || 
    'Docente';

  // Acciones y accesos directos para la Command Palette
  const quickActions = [
    {
      id: 'calificaciones',
      titulo: 'Planilla de Calificaciones',
      subtitulo: activeCatedra ? `Abrir sábana de notas de ${activeCatedra.nombre}` : 'Consultar calificaciones',
      icon: GraduationCap,
      action: () => {
        if (activeCatedra) navigate(`/catedra/${activeCatedra.id}?tab=calificaciones`);
        else navigate('/dashboard');
      }
    },
    {
      id: 'asistencias',
      titulo: 'Registro de Asistencias',
      subtitulo: activeCatedra ? `Toma de presentes de ${activeCatedra.nombre}` : 'Control de asistencias',
      icon: CalendarCheck,
      action: () => {
        if (activeCatedra) navigate(`/catedra/${activeCatedra.id}?tab=asistencias`);
        else navigate('/dashboard');
      }
    },
    {
      id: 'mesas',
      titulo: 'Mesas de Examen & Actas',
      subtitulo: 'Actas volantes y turnos oficiales de examen',
      icon: Award,
      action: () => navigate('/mesas-examen')
    },
    {
      id: 'libro-temas',
      titulo: 'Libro de Temas y Clases',
      subtitulo: 'Planificación y registro de contenidos dictados',
      icon: FileSpreadsheet,
      action: () => {
        if (activeCatedra) navigate(`/catedra/${activeCatedra.id}?tab=libro-temas`);
        else navigate('/guias');
      }
    },
    {
      id: 'alumnos',
      titulo: 'Nómina de Estudiantes Matriculados',
      subtitulo: 'Ver legajos, DNI y estado regular',
      icon: Users,
      action: () => {
        if (activeCatedra) navigate(`/catedra/${activeCatedra.id}?tab=alumnos`);
        else navigate('/dashboard');
      }
    }
  ];

  const filteredCatedras = (catedras || []).filter(c => 
    !searchQuery || 
    c.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.institucion_nombre?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredActions = quickActions.filter(a =>
    !searchQuery ||
    a.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.subtitulo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-200 relative shadow-xs">
      {/* Animated top shimmer beam */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-80 animate-pulseGlow" />

      <div className="w-full px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4 relative z-10">
        
        {/* Brand & Mobile Drawer Button (solo visible en pantallas móviles / < md) */}
        <div className="flex items-center gap-2.5 md:hidden">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-1 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center group"
            title="Abrir menú de navegación"
            aria-label="Abrir menú"
          >
            <img
              src="/dashboard.ico"
              alt="Korum"
              className="w-8 h-8 object-contain rounded-xl drop-shadow-xs group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all"
            />
          </button>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
              Korum
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
              v2.0
            </span>
          </div>
        </div>

        {/* =========================================================================
            SELECTOR DE CÁTEDRA (ESCRITORIO / TABLET)
           ========================================================================= */}
        <div className="hidden md:flex items-center gap-3">
          {/* Selector Rápido de Cátedra Activa */}
          <div className="relative" ref={catedraDropdownRef}>
            <button
              type="button"
              onClick={() => setIsCatedraDropdownOpen(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:border-emerald-500/40 transition-all cursor-pointer max-w-[210px] lg:max-w-[260px] truncate"
              title="Conmutar cátedra activa"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate flex-1 text-left">
                {activeCatedra?.nombre 
                  ? `${activeCatedra.nombre}${activeCatedra.anio ? ` (${activeCatedra.anio}° año)` : ''}${activeCatedra.regimen ? ` · ${activeCatedra.regimen}` : (activeCatedra.comision ? ` · ${activeCatedra.comision}` : '')}`
                  : 'Cátedra Activa'
                }
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${isCatedraDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown flotante (z-50) con las cátedras asignadas */}
            {isCatedraDropdownOpen && (
              <div className="absolute left-0 mt-2 w-80 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-1 z-50 animate-fadeIn">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Cátedras Asignadas ({catedras.length})</span>
                  <span className="text-[9px] font-mono text-emerald-500">Cambio Inmediato</span>
                </div>
                <div className="max-h-64 overflow-y-auto py-1 divide-y divide-slate-100 dark:divide-slate-800/40">
                  {catedras.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">Sin cátedras activas</div>
                  ) : (
                    catedras.map((c) => {
                      const isCurrent = String(c.id) === String(activeCatedra?.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            navigate(`/catedra/${c.id}`);
                            setIsCatedraDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer ${
                            isCurrent ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <div className="truncate flex-1">
                            <p className="truncate font-semibold">{c.nombre}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {c.institucion_nombre ? `${c.institucion_nombre} · ` : ''}{c.anio ? `${c.anio}° año` : ''} {c.regimen ? `· ${c.regimen}` : ''}
                            </p>
                          </div>
                          {isCurrent && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-xs" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            MÓDULO 3: COMMAND PALETTE BAR (BUSCADOR CENTRAL ⌘K)
           ========================================================================= */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center gap-2 w-40 sm:w-48 md:w-72 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-400 hover:border-emerald-500/40 cursor-pointer transition-all"
            title="Abrir buscador rápido (⌘K o Ctrl+K)"
            aria-label="Buscar en Korum"
          >
            <Search className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="flex-1 text-left truncate">Buscar estudiante o DNI...</span>
            <kbd className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-300 select-none">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* =========================================================================
            MÓDULO 4: PILL DE PERFIL DOCENTE CON ROL + TEMA Y NOTIFICACIONES
           ========================================================================= */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {/* MÓDULO 4: Pill de Perfil Docente con Rol */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">
            <span className="font-semibold text-slate-800 dark:text-slate-100 text-xs sm:text-sm truncate max-w-[120px] lg:max-w-[180px] select-none">
              {teacherName}
            </span>
            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 select-none">
              {esSuperadmin ? 'Superadmin' : 'Docente Titular'}
            </span>
          </div>

          {/* Botón de Tema (Sol / Luna con máscara SVG) */}
          <SunMoonThemeToggle isDark={isDark} onToggle={toggleTheme} />

          {/* Notificaciones con Campana */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={toggleNotifications}
              className={`relative p-2.5 rounded-xl border transition-all cursor-pointer touch-target-44 flex items-center justify-center ${
                showNotifications
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                  : 'border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Notificaciones y alertas"
              aria-label="Notificaciones"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white font-mono text-[10px] font-black rounded-full flex items-center justify-center shadow-xs animate-scaleIn">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Popover Desplegable de Notificaciones */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-[92vw] sm:w-[420px] rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden z-50 animate-scaleIn">
                <div className="p-3.5 border-b border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <span className="font-bold text-xs text-text-primary">Notificaciones</span>
                    {notificaciones.length > 0 && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                        {notificaciones.length}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => recargarNotificaciones()}
                      className="p-1 text-text-muted hover:text-text-primary rounded-lg transition-colors cursor-pointer"
                      title="Actualizar notificaciones"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={marcarTodasLeidas}
                        className="text-[11px] text-text-muted hover:text-primary flex items-center gap-1 transition-colors cursor-pointer px-1.5 py-0.5 rounded"
                        title="Marcar todas como leídas"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Leídas</span>
                      </button>
                    )}

                    {notificaciones.length > 0 && (
                      <button
                        type="button"
                        onClick={limpiarNotificaciones}
                        className="text-[11px] text-text-muted hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer px-1.5 py-0.5 rounded"
                        title="Limpiar todas las notificaciones"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Limpiar</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                  {notificaciones.length === 0 ? (
                    <div className="p-8 text-center text-text-muted space-y-1.5">
                      <Bell className="w-8 h-8 mx-auto opacity-30 text-text-muted" />
                      <p className="text-xs font-semibold text-text-primary">Sin notificaciones pendientes</p>
                      <p className="text-[11px] leading-relaxed">
                        Los avisos de próximas mesas de examen, clases semanales y alertas de asistencia aparecerán aquí automáticamente.
                      </p>
                    </div>
                  ) : (
                    notificaciones.map((n) => {
                      const isError = n.tipo === 'error';
                      const isSuccess = n.tipo === 'success';
                      const isWarning = n.tipo === 'warning';
                      const isMesa = n.categoria === 'mesa';
                      const isClase = n.categoria === 'clase';
                      const isAsist = n.categoria === 'asistencia';

                      return (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (n.link) {
                              marcarLeida(n.id);
                              navigate(n.link);
                              setShowNotifications(false);
                            } else {
                              marcarLeida(n.id);
                            }
                          }}
                          className={`p-3 text-xs transition-colors group relative ${
                            n.link ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.04]' : ''
                          } ${
                            !n.leida ? 'bg-primary/[0.03] dark:bg-primary/[0.06]' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {/* Icono por Categoría / Tipo */}
                            <div className="mt-0.5 shrink-0">
                              {isMesa ? (
                                <div className="p-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                  <BookMarked className="w-4 h-4" />
                                </div>
                              ) : isClase ? (
                                <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                  <GraduationCap className="w-4 h-4" />
                                </div>
                              ) : isAsist ? (
                                <div className="p-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                  <ShieldAlert className="w-4 h-4" />
                                </div>
                              ) : isError ? (
                                <AlertCircle className="w-4 h-4 text-rose-500" />
                              ) : isSuccess ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : isWarning ? (
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                              ) : (
                                <Info className="w-4 h-4 text-primary" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="font-bold text-text-primary truncate">
                                    {n.titulo}
                                  </span>
                                  {!n.leida && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {n.codigo && (
                                    <span className={`font-mono text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                      isError || isAsist
                                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                        : isWarning || isMesa
                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                        : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                    }`}>
                                      {n.codigo}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      descartarNotificacion(n.id);
                                    }}
                                    className="p-1 text-text-muted hover:text-rose-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Descartar aviso"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              <p className="text-[11px] text-text-secondary leading-relaxed">
                                {n.mensaje}
                              </p>

                              <div className="flex items-center justify-between pt-0.5 text-[10px] text-text-muted">
                                <span className="font-mono">
                                  {formatTimestamp(n.fecha)}
                                </span>
                                {n.link && (
                                  <span className="flex items-center gap-0.5 text-primary font-medium hover:underline">
                                    <span>Ir al módulo</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DIÁLOGO MODAL COMMAND PALETTE (⌘K) MONTADO POR PORTAL */}
      {isCommandPaletteOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setIsCommandPaletteOpen(false)}
        >
          <div 
            className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Buscador */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
              <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  const total = matchedStudents.length + filteredCatedras.length + filteredActions.length;
                  if (total === 0) return;

                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(prev => (prev + 1) % total);
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(prev => (prev - 1 + total) % total);
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    let currentIdx = 0;
                    // Check students
                    if (selectedIndex < matchedStudents.length) {
                      const s = matchedStudents[selectedIndex];
                      if (activeCatedra) navigate(`/catedra/${activeCatedra.id}?tab=alumnos`);
                      else if (catedras?.[0]) navigate(`/catedra/${catedras[0].id}?tab=alumnos`);
                      else navigate('/dashboard');
                      setIsCommandPaletteOpen(false);
                      return;
                    }
                    currentIdx += matchedStudents.length;
                    // Check catedras
                    if (selectedIndex < currentIdx + filteredCatedras.length) {
                      const c = filteredCatedras[selectedIndex - currentIdx];
                      navigate(`/catedra/${c.id}`);
                      setIsCommandPaletteOpen(false);
                      return;
                    }
                    currentIdx += filteredCatedras.length;
                    // Check actions
                    if (selectedIndex < currentIdx + filteredActions.length) {
                      const a = filteredActions[selectedIndex - currentIdx];
                      a.action();
                      setIsCommandPaletteOpen(false);
                      return;
                    }
                  }
                }}
                placeholder="Buscar estudiante, DNI, cátedra o acción..."
                autoFocus
                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              {searchingStudents && (
                <span className="w-4 h-4 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin shrink-0" />
              )}
              {searchQuery && !searchingStudents && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <kbd className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-slate-500 select-none">
                ESC
              </kbd>
            </div>

            {/* Lista de Resultados */}
            <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/40">
              {/* Sección Estudiantes / DNI */}
              {matchedStudents.length > 0 && (
                <div className="py-2 first:pt-0">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-between font-mono">
                    <span>Estudiantes / DNI ({matchedStudents.length})</span>
                    <span className="text-[9px] text-slate-400">Saltar a legajo</span>
                  </div>
                  {matchedStudents.map((s, idx) => {
                    const isSelected = selectedIndex === idx;
                    const cleanDni = String(s.dni || '').replace(/\D/g, '');
                    const formattedDni = cleanDni.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

                    return (
                      <button
                        key={s.id || idx}
                        type="button"
                        onClick={() => {
                          if (activeCatedra) navigate(`/catedra/${activeCatedra.id}?tab=alumnos`);
                          else if (catedras?.[0]) navigate(`/catedra/${catedras[0].id}?tab=alumnos`);
                          else navigate('/dashboard');
                          setIsCommandPaletteOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition-colors group cursor-pointer ${
                          isSelected 
                            ? 'bg-emerald-500/15 dark:bg-emerald-950/60 ring-1 ring-emerald-500/30' 
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                              {s.apellido}, {s.nombre}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate font-mono">
                              DNI: <strong className="text-slate-600 dark:text-slate-300">{formattedDni}</strong>
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-emerald-500 shrink-0">
                          Ver Alumno
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Sección Cátedras */}
              {filteredCatedras.length > 0 && (
                <div className="py-2 first:pt-0">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Cátedras
                  </div>
                  {filteredCatedras.map((cat, idx) => {
                    const globalIdx = matchedStudents.length + idx;
                    const isSelected = selectedIndex === globalIdx;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          navigate(`/catedra/${cat.id}`);
                          setIsCommandPaletteOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition-colors group cursor-pointer ${
                          isSelected 
                            ? 'bg-emerald-500/15 dark:bg-emerald-950/60 ring-1 ring-emerald-500/30' 
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div className="truncate">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                              {cat.nombre}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate font-mono">
                              {cat.institucion_nombre || ''} {cat.anio ? `· ${cat.anio}° año` : ''} {cat.regimen ? `· ${cat.regimen}` : ''}
                            </p>
                          </div>
                        </div>
                        <CornerDownLeft className={`w-3.5 h-3.5 text-slate-400 transition-opacity ${isSelected ? 'opacity-100 text-emerald-500' : 'opacity-0 group-hover:opacity-100'}`} />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Sección Acciones Rápidas */}
              {filteredActions.length > 0 && (
                <div className="py-2">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Navegación & Acciones
                  </div>
                  {filteredActions.map((action, idx) => {
                    const globalIdx = matchedStudents.length + filteredCatedras.length + idx;
                    const isSelected = selectedIndex === globalIdx;
                    const ActionIcon = action.icon;

                    return (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => {
                          action.action();
                          setIsCommandPaletteOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition-colors group cursor-pointer ${
                          isSelected 
                            ? 'bg-emerald-500/15 dark:bg-emerald-950/60 ring-1 ring-emerald-500/30' 
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ActionIcon className={`w-4 h-4 shrink-0 transition-colors ${
                            isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                          }`} />
                          <div className="truncate">
                            <p className={`text-xs font-medium transition-colors truncate ${
                              isSelected ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                            }`}>
                              {action.titulo}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {action.subtitulo}
                            </p>
                          </div>
                        </div>
                        <CornerDownLeft className={`w-3.5 h-3.5 text-slate-400 transition-opacity ${isSelected ? 'opacity-100 text-emerald-500' : 'opacity-0 group-hover:opacity-100'}`} />
                      </button>
                    );
                  })}
                </div>
              )}

              {matchedStudents.length === 0 && filteredCatedras.length === 0 && filteredActions.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Sin resultados encontrados</p>
                  <p className="text-[11px]">Intenta buscar por cátedra, DNI, o módulo del sistema.</p>
                </div>
              )}
            </div>

            {/* Footer con atajos de ayuda */}
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span>Navegar con teclado</span>
              <div className="flex items-center gap-2">
                <span>↵ Seleccionar</span>
                <span>ESC Cerrar</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
