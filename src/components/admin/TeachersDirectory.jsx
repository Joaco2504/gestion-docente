import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Wrench, 
  ShieldCheck, 
  UserCheck, 
  UserX,
  Mail, 
  Calendar, 
  Check, 
  X,
  Filter,
  RefreshCw,
  MoreVertical,
  Shield,
  GraduationCap,
  BookOpen,
  Sparkles,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import Badge from '../common/Badge';
import ExpandableSearch from '../common/ExpandableSearch';
import SupportHubModal from './SupportHubModal';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { formatFechaDMY } from '../../lib/dateUtils';
import { toast } from 'sonner';
import { handleAppError } from '../../utils/handleAppError';

const DEMO_TEACHERS = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    nombre: 'Prof. Emilio Martínez',
    email: 'profesor.demo@docentepro.edu.ar',
    rol: 'superadmin',
    activo: true,
    ultimo_ingreso: '2026-10-12T11:45:00.000Z',
    created_at: '2025-02-10T10:00:00.000Z',
    catedras_list: ['Práctica Docente III', 'Sistemas Operativos']
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    nombre: 'Prof. Laura Gómez',
    email: 'laura.gomez@docentepro.edu.ar',
    rol: 'docente',
    activo: true,
    ultimo_ingreso: '2026-10-10T09:20:00.000Z',
    created_at: '2025-03-01T14:30:00.000Z',
    catedras_list: ['Didáctica General', 'Pedagogía']
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    nombre: 'Prof. Carlos Rodríguez',
    email: 'carlos.rodriguez@docentepro.edu.ar',
    rol: 'docente',
    activo: true,
    ultimo_ingreso: '2026-09-28T16:15:00.000Z',
    created_at: '2026-10-02T09:15:00.000Z',
    catedras_list: ['Matemática Discreta']
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    nombre: 'Prof. Mariana Silva',
    email: 'mariana.silva@docentepro.edu.ar',
    rol: 'docente',
    activo: false,
    ultimo_ingreso: '2026-08-15T10:00:00.000Z',
    created_at: '2025-04-05T16:45:00.000Z',
    catedras_list: []
  }
];

export default function TeachersDirectory({ isDemo = false }) {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'activos' | 'inactivos'
  const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL' | 'docente' | 'superadmin'
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [totalCatedrasCount, setTotalCatedrasCount] = useState(0);

  // Cargar lista de docentes y cátedras asignadas
  const fetchTeachers = async () => {
    setLoading(true);
    try {
      if (isDemo || !isSupabaseConfigured || !supabase) {
        const saved = localStorage.getItem('docentepro_demo_teachers_list');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setTeachers(parsed);
          } catch (_) {
            setTeachers(DEMO_TEACHERS);
          }
        } else {
          setTeachers(DEMO_TEACHERS);
          localStorage.setItem('docentepro_demo_teachers_list', JSON.stringify(DEMO_TEACHERS));
        }

        // Cátedras en demo
        const storedCats = localStorage.getItem('docentepro_demo_catedras');
        if (storedCats) {
          try {
            const parsedCats = JSON.parse(storedCats);
            setTotalCatedrasCount(parsedCats.length);
          } catch (_) {
            setTotalCatedrasCount(5);
          }
        } else {
          setTotalCatedrasCount(5);
        }

        setLoading(false);
        return;
      }

      // Consulta a Supabase: perfiles y cátedras
      const [perfilesRes, catedrasRes] = await Promise.all([
        supabase.from('perfiles').select('*').order('created_at', { ascending: false }),
        supabase.from('catedras').select('id, nombre, docente_id, user_id')
      ]);

      if (perfilesRes.error) throw perfilesRes.error;

      const catedrasList = catedrasRes.data || [];
      setTotalCatedrasCount(catedrasList.length);

      // Mapa de cátedras por docente
      const catMap = {};
      catedrasList.forEach(c => {
        const uid = c.docente_id || c.user_id;
        if (uid) {
          if (!catMap[uid]) catMap[uid] = [];
          catMap[uid].push(c.nombre);
        }
      });

      const teachersWithCatedras = (perfilesRes.data || []).map(p => ({
        ...p,
        activo: p.activo !== false,
        catedras_list: catMap[p.id] || []
      }));

      setTeachers(teachersWithCatedras);
    } catch (err) {
      handleAppError(err, 'TeachersDirectory / Cargar nómina docentes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [isDemo]);

  // Cambiar rol de usuario (Docente <-> Superadmin)
  const handleToggleRole = async (teacher) => {
    const newRole = teacher.rol === 'superadmin' ? 'docente' : 'superadmin';
    const updatedList = teachers.map(t => t.id === teacher.id ? { ...t, rol: newRole } : t);
    setTeachers(updatedList);

    if (isDemo || !isSupabaseConfigured || !supabase) {
      localStorage.setItem('docentepro_demo_teachers_list', JSON.stringify(updatedList));
      toast.success(`Rol de ${teacher.nombre || teacher.email} actualizado a "${newRole}".`);
      return;
    }

    try {
      const { error } = await supabase
        .from('perfiles')
        .update({ rol: newRole })
        .eq('id', teacher.id);

      if (error) throw error;
      toast.success(`Rol de ${teacher.nombre || teacher.email} actualizado a "${newRole}".`);
    } catch (err) {
      handleAppError(err, 'TeachersDirectory / Actualizar rol');
      fetchTeachers();
    }
  };

  // Alternar estado activo / inactivo
  const handleToggleActive = async (teacher) => {
    const newActivo = teacher.activo === false;
    const updatedList = teachers.map(t => t.id === teacher.id ? { ...t, activo: newActivo } : t);
    setTeachers(updatedList);

    if (isDemo || !isSupabaseConfigured || !supabase) {
      localStorage.setItem('docentepro_demo_teachers_list', JSON.stringify(updatedList));
      toast.success(`Docente ${teacher.nombre || teacher.email} marcado como ${newActivo ? 'Activo' : 'Inactivo'}.`);
      return;
    }

    try {
      const { error } = await supabase
        .from('perfiles')
        .update({ activo: newActivo })
        .eq('id', teacher.id);

      if (error) {
        console.warn('Aviso al actualizar estado en perfiles:', error);
      }
      toast.success(`Docente ${teacher.nombre || teacher.email} marcado como ${newActivo ? 'Activo' : 'Inactivo'}.`);
    } catch (err) {
      console.warn('Error alternando estado activo:', err);
    }
  };

  // Filtrado reactivo en tiempo real
  const filteredTeachers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return teachers.filter(t => {
      const matchesSearch = 
        !q ||
        t.nombre?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q) ||
        t.id?.toLowerCase().includes(q);

      const matchesStatus = 
        statusFilter === 'ALL' ||
        (statusFilter === 'activos' && t.activo !== false) ||
        (statusFilter === 'inactivos' && t.activo === false);

      const matchesRole = 
        roleFilter === 'ALL' || 
        t.rol === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [teachers, searchQuery, statusFilter, roleFilter]);

  // Métricas Bento superiores
  const stats = useMemo(() => {
    const total = teachers.length;
    const activos = teachers.filter(t => t.activo !== false).length;
    const inactivos = total - activos;

    // Docentes nuevos del mes actual
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const nuevosMes = teachers.filter(t => {
      if (!t.created_at) return false;
      const d = new Date(t.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    return { total, activos, inactivos, nuevosMes };
  }, [teachers]);

  const handleOpenSupport = (teacher) => {
    setSelectedTeacher(teacher);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* =========================================================================
          1. TARJETAS BENTO KPI SUPERIORES (DOCENTES, CÁTEDRAS, NUEVOS)
      ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Bento 1: Total Docentes Activos */}
        <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Docentes Activos
            </span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <strong className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {stats.activos}
            </strong>
            <span className="text-xs font-semibold text-text-muted">
              de {stats.total} registrados
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-text-muted font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{Math.round((stats.activos / (stats.total || 1)) * 100)}% de operatividad en nómina</span>
          </div>
        </div>

        {/* Bento 2: Total Cátedras en el Sistema */}
        <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs relative overflow-hidden group hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Cátedras en el Sistema
            </span>
            <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <strong className="text-3xl font-black font-mono text-text-primary">
              {totalCatedrasCount}
            </strong>
            <span className="text-xs font-semibold text-text-muted">
              espacios curriculares
            </span>
          </div>
          <div className="mt-2 text-[11px] text-text-muted font-medium flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5 text-primary" />
            <span>Gestión multisede e interinstitucional</span>
          </div>
        </div>

        {/* Bento 3: Docentes Nuevos del Mes */}
        <div className="p-5 rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Docentes Nuevos del Mes
            </span>
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <strong className="text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400">
              +{stats.nuevosMes}
            </strong>
            <span className="text-xs font-semibold text-text-muted">
              altas recientes
            </span>
          </div>
          <div className="mt-2 text-[11px] text-text-muted font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>Incorporaciones durante el ciclo actual</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. TABLA MODERNA DE NÓMINA DE DOCENTES
      ========================================================================= */}
      <Card className="p-5 sm:p-6 space-y-6 border border-surface-border">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
                  Nómina de Docentes Registrados
                </h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-surface-hover text-text-muted">
                  {filteredTeachers.length} {filteredTeachers.length === 1 ? 'docente' : 'docentes'}
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Directorio general de usuarios, espacios curriculares asignados y gestión de accesos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchTeachers}
              className="p-2 rounded-xl border border-surface-border bg-surface text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
              title="Refrescar lista"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Buscador animado */}
          <div className="w-full sm:w-auto">
            <ExpandableSearch
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              placeholder="Buscar docente por nombre o correo electrónico..."
              widthClass="w-full sm:w-80 md:w-96"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro por Estado (Activo / Inactivo) */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-hover/70 border border-surface-border shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-surface text-text-primary shadow-xs font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('activos')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === 'activos'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Activos ({stats.activos})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('inactivos')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === 'inactivos'
                    ? 'bg-slate-500/15 text-slate-600 dark:text-slate-400 font-bold border border-slate-500/30'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Inactivos ({stats.inactivos})
              </button>
            </div>

            {/* Role Filter Chips */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-hover/70 border border-surface-border shrink-0">
              <button
                type="button"
                onClick={() => setRoleFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  roleFilter === 'ALL'
                    ? 'bg-surface text-text-primary shadow-xs font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Roles: Todos
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('superadmin')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  roleFilter === 'superadmin'
                    ? 'bg-primary text-white shadow-xs font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Superadmins
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('docente')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  roleFilter === 'docente'
                    ? 'bg-surface text-text-primary shadow-xs font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Docentes
              </button>
            </div>
          </div>
        </div>

        {/* Teachers List / Bento Table */}
        <div className="overflow-x-auto rounded-2xl border border-surface-border">
          <table className="w-full text-left border-collapse text-xs" aria-label="Directorio de Docentes">
            <caption className="sr-only">Directorio de docentes y administración de cuentas de usuario</caption>
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-surface-border text-text-secondary uppercase font-bold text-[11px] tracking-wider">
                <th scope="col" className="py-3 px-4">Docente</th>
                <th scope="col" className="py-3 px-4">Cátedras Asignadas</th>
                <th scope="col" className="py-3 px-4">Último Ingreso / Registro</th>
                <th scope="col" className="py-3 px-4 text-center">Estado</th>
                <th scope="col" className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-text-muted">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    Cargando directorio de docentes...
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-text-muted">
                    No se encontraron docentes con el criterio de búsqueda seleccionado.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => {
                  const isSuper = teacher.rol === 'superadmin';
                  const isActivo = teacher.activo !== false;
                  const catedras = teacher.catedras_list || [];

                  return (
                    <tr 
                      key={teacher.id} 
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
                    >
                      {/* Docente (Nombre, Apellido, Email y Avatar) */}
                      <td scope="row" className="py-3.5 px-4 font-semibold text-text-primary">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary/20 via-emerald-500/20 to-indigo-500/20 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                            {teacher.nombre ? teacher.nombre.charAt(0).toUpperCase() : 'D'}
                          </div>
                          <div className="min-w-0">
                            <span className="block font-bold text-text-primary text-xs sm:text-sm truncate">
                              {teacher.nombre || 'Docente sin nombre'}
                            </span>
                            <div className="flex items-center gap-1.5 font-mono text-text-muted text-[11px] truncate">
                              <Mail className="w-3 h-3 text-text-muted shrink-0" />
                              <span className="truncate">{teacher.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cátedras Asignadas (Badges) */}
                      <td className="py-3.5 px-4">
                        {catedras.length === 0 ? (
                          <span className="text-[11px] text-text-muted italic">
                            Sin cátedras asignadas
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                            {catedras.slice(0, 2).map((catName, cIdx) => (
                              <span
                                key={cIdx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 truncate max-w-[130px]"
                                title={catName}
                              >
                                <BookOpen className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{catName}</span>
                              </span>
                            ))}
                            {catedras.length > 2 && (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-white/5 text-text-muted">
                                +{catedras.length - 2} más
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Último Ingreso / Registro */}
                      <td className="py-3.5 px-4 font-mono text-xs text-text-muted">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-text-secondary font-medium">
                            <Clock className="w-3.5 h-3.5 text-text-muted shrink-0" />
                            <span>
                              {teacher.ultimo_ingreso ? formatFechaDMY(teacher.ultimo_ingreso) : 'Reciente'}
                            </span>
                          </div>
                          <div className="text-[10px] text-text-muted">
                            Alta: {teacher.created_at ? formatFechaDMY(teacher.created_at) : '—'}
                          </div>
                        </div>
                      </td>

                      {/* Estado (Activo / Inactivo con Badge Esmeralda o Slate) */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(teacher)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                            isActivo
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                              : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30 hover:bg-slate-500/25'
                          }`}
                          title={`Clic para marcar como ${isActivo ? 'Inactivo' : 'Activo'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActivo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <span>{isActivo ? 'Activo' : 'Inactivo'}</span>
                        </button>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Toggle Rol */}
                          <button
                            type="button"
                            onClick={() => handleToggleRole(teacher)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                              isSuper 
                                ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/25' 
                                : 'bg-surface-hover text-text-secondary border border-surface-border hover:border-primary/30'
                            }`}
                            title="Haz clic para alternar rol (Superadmin / Docente)"
                          >
                            <Shield className="w-3 h-3" />
                            <span>{isSuper ? 'Superadmin' : 'Docente'}</span>
                          </button>

                          {/* Botón Gestión / Soporte */}
                          <Button
                            variant="outline"
                            size="sm"
                            icon={Wrench}
                            onClick={() => handleOpenSupport(teacher)}
                            className="text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 touch-target-44 sm:touch-target-auto whitespace-nowrap shrink-0"
                            title="Abrir panel de inspección y soporte técnico para este docente"
                          >
                            <span className="hidden sm:inline">Soporte</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Bento Centrado de Soporte */}
        <SupportHubModal
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedTeacher(null);
          }}
          teacher={selectedTeacher}
          isDemo={isDemo}
          onTeacherUpdated={(t) => setTeachers(prev => prev.map(item => item.id === t.id ? t : item))}
        />
      </Card>
    </div>
  );
}
