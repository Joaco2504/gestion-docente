import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Wrench, 
  ShieldCheck, 
  UserCheck, 
  Mail, 
  Calendar, 
  Check, 
  X,
  Filter,
  RefreshCw,
  MoreVertical,
  Shield,
  GraduationCap
} from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import Badge from '../common/Badge';
import ExpandableSearch from '../common/ExpandableSearch';
import SupportHubModal from './SupportHubModal';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { formatFechaDMY } from '../../lib/dateUtils';
import { toast } from 'sonner';

const DEMO_TEACHERS = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    nombre: 'Prof. Emilio Martínez',
    email: 'profesor.demo@docentepro.edu.ar',
    rol: 'superadmin',
    created_at: '2025-02-10T10:00:00.000Z'
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    nombre: 'Prof. Laura Gómez',
    email: 'laura.gomez@docentepro.edu.ar',
    rol: 'docente',
    created_at: '2025-03-01T14:30:00.000Z'
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    nombre: 'Prof. Carlos Rodríguez',
    email: 'carlos.rodriguez@docentepro.edu.ar',
    rol: 'docente',
    created_at: '2025-03-12T09:15:00.000Z'
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    nombre: 'Prof. Mariana Silva',
    email: 'mariana.silva@docentepro.edu.ar',
    rol: 'docente',
    created_at: '2025-04-05T16:45:00.000Z'
  }
];

export default function TeachersDirectory({ isDemo = false }) {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL' | 'docente' | 'superadmin'
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Cargar lista de docentes desde Supabase o mock en demo
  const fetchTeachers = async () => {
    setLoading(true);
    try {
      if (isDemo || !isSupabaseConfigured || !supabase) {
        const saved = localStorage.getItem('docentepro_demo_teachers_list');
        if (saved) {
          try {
            setTeachers(JSON.parse(saved));
          } catch (_) {
            setTeachers(DEMO_TEACHERS);
          }
        } else {
          setTeachers(DEMO_TEACHERS);
          localStorage.setItem('docentepro_demo_teachers_list', JSON.stringify(DEMO_TEACHERS));
        }
        setLoading(false);
        return;
      }

      // Consulta a la tabla perfiles
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeachers(data || []);
    } catch (err) {
      console.warn('Error al cargar directorio de docentes:', err);
      toast.error('No se pudo cargar la nómina de docentes: ' + err.message);
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
      toast.error('Error al actualizar rol: ' + err.message);
      // Revertir
      fetchTeachers();
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

      const matchesRole = 
        roleFilter === 'ALL' || 
        t.rol === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [teachers, searchQuery, roleFilter]);

  const handleOpenSupport = (teacher) => {
    setSelectedTeacher(teacher);
    setIsDrawerOpen(true);
  };

  return (
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
                Directorio Global de Docentes
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-surface-hover text-text-muted">
                {filteredTeachers.length} {filteredTeachers.length === 1 ? 'docente' : 'docentes'}
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Población de usuarios registrados, roles asignados y herramientas de asistencia técnica
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchTeachers}
            className="p-2 rounded-xl border border-surface-border bg-surface text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            title="Refrescar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
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

        {/* Role Filter Chips */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-hover/70 border border-surface-border shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setRoleFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              roleFilter === 'ALL'
                ? 'bg-surface text-text-primary shadow-xs font-bold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Todos ({teachers.length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('superadmin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              roleFilter === 'superadmin'
                ? 'bg-primary text-white shadow-xs font-bold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Superadmins ({teachers.filter(t => t.rol === 'superadmin').length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter('docente')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              roleFilter === 'docente'
                ? 'bg-surface text-text-primary shadow-xs font-bold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Docentes ({teachers.filter(t => t.rol !== 'superadmin').length})
          </button>
        </div>
      </div>

      {/* Teachers List / Bento Table */}
      <div className="overflow-x-auto rounded-2xl border border-surface-border">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-surface-hover/60 border-b border-surface-border text-text-secondary uppercase font-bold text-[11px] tracking-wider">
              <th className="py-2.5 px-3 sm:py-3 sm:px-4">Docente</th>
              <th className="py-2.5 px-3 sm:py-3 sm:px-4">Correo Electrónico</th>
              <th className="py-2.5 px-3 sm:py-3 sm:px-4">Fecha de Alta</th>
              <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-center">Rol Activo</th>
              <th className="py-2.5 px-3 sm:py-3 sm:px-4 text-right">Acciones de Soporte</th>
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
                  No se encontraron docentes con el criterio "{searchQuery}".
                </td>
              </tr>
            ) : (
              filteredTeachers.map((teacher) => {
                const isSuper = teacher.rol === 'superadmin';
                return (
                  <tr 
                    key={teacher.id} 
                    className="hover:bg-surface-hover/50 transition-colors group"
                  >
                    {/* Docente */}
                    <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 font-semibold text-text-primary">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {teacher.nombre ? teacher.nombre.charAt(0).toUpperCase() : 'D'}
                        </div>
                        <div>
                          <span className="block font-bold text-text-primary text-xs sm:text-sm">
                            {teacher.nombre || 'Sin nombre'}
                          </span>
                          <span className="text-[10px] text-text-muted font-mono block">
                            ID: {teacher.id?.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 font-mono text-text-secondary text-xs">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-text-muted" />
                        <span>{teacher.email}</span>
                      </div>
                    </td>

                    {/* Fecha de Registro */}
                    <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 font-mono text-text-muted text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-text-muted" />
                        <span>{teacher.created_at ? formatFechaDMY(teacher.created_at) : '—'}</span>
                      </div>
                    </td>

                    {/* Rol y Switch de Rol */}
                    <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleRole(teacher)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                          isSuper 
                            ? 'bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25' 
                            : 'bg-surface-hover text-text-secondary border border-surface-border hover:border-primary/30'
                        }`}
                        title="Haz clic para alternar rol (Superadmin / Docente)"
                      >
                        <Shield className="w-3 h-3" />
                        <span>{isSuper ? 'Superadmin' : 'Docente'}</span>
                      </button>
                    </td>

                    {/* Botón Gestión / Soporte */}
                    <td className="py-2.5 px-3 sm:py-3.5 sm:px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={Wrench}
                        onClick={() => handleOpenSupport(teacher)}
                        className="text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 touch-target-44 sm:touch-target-auto whitespace-nowrap shrink-0"
                        title="Abrir panel de inspección y soporte técnico para este docente"
                      >
                        <span className="hidden sm:inline">Gestionar Datos / Soporte</span>
                        <span className="sm:hidden">Soporte</span>
                      </Button>
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
  );
}
