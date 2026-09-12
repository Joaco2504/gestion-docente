import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  User, 
  BookOpen, 
  Users, 
  GraduationCap, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  ShieldCheck,
  Calendar, 
  Layers, 
  FileSpreadsheet, 
  Clock, 
  Sparkles, 
  RefreshCw, 
  FolderOpen,
  Copy,
  Check,
  Download,
  Eye,
  Eraser,
  Search,
  Building,
  ArrowRight
} from 'lucide-react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import ConfirmDialog from '../common/ConfirmDialog';
import EmptyState from '../common/EmptyState';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { formatFechaDMY } from '../../lib/dateUtils';
import { toast } from 'sonner';

export default function SupportHubModal({
  isOpen,
  onClose,
  teacher,
  isDemo = false,
  onTeacherUpdated
}) {
  const [activeTab, setActiveTab] = useState('catedras'); // 'catedras' | 'alumnos' | 'clases'
  const [catedras, setCatedras] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [clases, setClases] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [changingRole, setChangingRole] = useState(false);
  const [purging, setPurging] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  // Estado para Diálogo de Confirmación
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: null,
    loading: false
  });

  useEffect(() => {
    if (isOpen && teacher?.id) {
      loadTeacherData(teacher.id);
    }
  }, [isOpen, teacher?.id]);

  const loadTeacherData = async (teacherId) => {
    setLoading(true);
    try {
      if (isDemo || !isSupabaseConfigured || !supabase) {
        // Mock data en demo
        const demoCats = JSON.parse(localStorage.getItem('demo_catedras') || '[]');
        const filteredCats = demoCats.filter(c => c.docente_id === teacherId || !c.docente_id);
        
        setCatedras(filteredCats.length > 0 ? filteredCats : [
          {
            id: 'cat-demo-1',
            nombre: 'Introducción a la Algoritmia',
            nivel: 'TERCIARIO',
            modalidad: 'ANUAL',
            institucion_nombre: 'Instituto Superior de Formación Docente N° 19',
            estudiantes_count: 14,
            isOrphan: false
          },
          {
            id: 'cat-demo-orphan',
            nombre: 'Taller de Práctica Experimental (Inactiva)',
            nivel: 'SECUNDARIO',
            modalidad: 'CUATRIMESTRAL',
            institucion_nombre: null,
            estudiantes_count: 0,
            isOrphan: true
          }
        ]);

        setAlumnos([
          { id: 'alu-1', dni: '42.105.890', apellido: 'Gómez', nombre: 'Lucas Valentín', email: 'lucas.gomez@gmail.com', catedras: ['Introducción a la Algoritmia'] },
          { id: 'alu-2', dni: '43.512.441', apellido: 'Benítez', nombre: 'Camila Sofía', email: 'cami.benitez@gmail.com', catedras: ['Introducción a la Algoritmia'] },
          { id: 'alu-3', dni: '41.902.115', apellido: 'Vargas', nombre: 'Matías Ezequiel', email: 'matias.vargas@gmail.com', catedras: ['Introducción a la Algoritmia'] }
        ]);

        setClases([
          { id: 'cla-1', fecha: '2026-03-15', tema: 'Presentación de la materia y régimen de cursado', catedra_nombre: 'Introducción a la Algoritmia' },
          { id: 'cla-2', fecha: '2026-03-22', tema: 'Tipos de datos y estructuras de control', catedra_nombre: 'Introducción a la Algoritmia' }
        ]);

        setEvaluaciones([
          { id: 'eva-1', titulo: 'Trabajo Práctico N° 1: Variables y Bucles', tipo: 'TP', catedra_nombre: 'Introducción a la Algoritmia' },
          { id: 'eva-2', titulo: 'Primer Parcial Teórico-Práctico', tipo: 'PARCIAL', catedra_nombre: 'Introducción a la Algoritmia' }
        ]);

        setLoading(false);
        return;
      }

      // Cargar desde Supabase
      // 1. Cátedras
      const { data: cats, error: catsErr } = await supabase
        .from('catedras')
        .select(`
          id, nombre, nivel, modalidad, created_at,
          instituciones(nombre)
        `)
        .eq('docente_id', teacherId);

      if (catsErr) throw catsErr;

      // 2. Alumnos asociados al docente
      const { data: studs, error: studsErr } = await supabase
        .from('estudiantes')
        .select(`
          id, dni, apellido, nombre,
          inscripciones(
            catedras(id, nombre)
          )
        `)
        .eq('docente_id', teacherId);

      if (studsErr) throw studsErr;

      // 3. Clases y Evaluaciones de sus cátedras
      const catedraIds = (cats || []).map(c => c.id);
      let loadedClases = [];
      let loadedEvas = [];

      if (catedraIds.length > 0) {
        const { data: clData } = await supabase
          .from('clases')
          .select('id, fecha, tema, catedra_id, catedras(nombre)')
          .in('catedra_id', catedraIds)
          .order('fecha', { ascending: false })
          .limit(40);
        loadedClases = clData || [];

        const { data: evData } = await supabase
          .from('evaluaciones')
          .select('id, titulo, tipo, catedra_id, catedras(nombre)')
          .in('catedra_id', catedraIds)
          .limit(40);
        loadedEvas = evData || [];
      }

      // Detectar cátedras huérfanas
      const mappedCats = (cats || []).map(cat => {
        const count = (studs || []).filter(s => 
          s.inscripciones?.some(i => i.catedras?.id === cat.id)
        ).length;
        const hasInst = Boolean(cat.instituciones?.nombre);
        return {
          ...cat,
          institucion_nombre: cat.instituciones?.nombre || 'Sin institución',
          estudiantes_count: count,
          isOrphan: count === 0 || !hasInst
        };
      });

      setCatedras(mappedCats);
      setAlumnos(studs || []);
      setClases(loadedClases);
      setEvaluaciones(loadedEvas);
    } catch (err) {
      console.error('Error al cargar datos del docente:', err);
      toast.error('Error al cargar datos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Copiar Supabase UUID
  const handleCopyId = () => {
    if (!teacher?.id) return;
    navigator.clipboard.writeText(teacher.id);
    setCopiedId(true);
    toast.success('ID de Supabase copiado al portapapeles');
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Cambiar rol conectado a admin_cambiar_rol
  const handleRoleChange = async (newRole) => {
    if (!teacher || teacher.rol === newRole) return;
    setChangingRole(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        // Intentar RPC admin_cambiar_rol
        const { error: rpcErr } = await supabase.rpc('admin_cambiar_rol', {
          p_user_id: teacher.id,
          p_nuevo_rol: newRole
        });

        if (rpcErr) {
          // Fallback a update directo en perfiles
          const { error: updErr } = await supabase
            .from('perfiles')
            .update({ rol: newRole })
            .eq('id', teacher.id);
          if (updErr) throw updErr;
        }
      }

      if (onTeacherUpdated) {
        onTeacherUpdated({ ...teacher, rol: newRole });
      }
      toast.success(`Rol actualizado a "${newRole === 'superadmin' ? 'Superadmin' : 'Docente'}".`);
    } catch (err) {
      toast.error('Error al cambiar rol: ' + err.message);
    } finally {
      setChangingRole(false);
    }
  };

  // Purgar Huérfanos
  const handlePurgeOrphans = async () => {
    if (!teacher?.id) return;
    setPurging(true);
    try {
      let purgedCount = 0;
      if (isSupabaseConfigured && !isDemo) {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_purgar_huerfanos_docente', {
          p_docente_id: teacher.id
        });

        if (!rpcErr && rpcRes !== undefined) {
          purgedCount = typeof rpcRes === 'number' ? rpcRes : (rpcRes?.purgados || 0);
        } else {
          // Fallback manual: eliminar cátedras sin alumnos o instituciones
          const orphanIds = catedras.filter(c => c.isOrphan).map(c => c.id);
          if (orphanIds.length > 0) {
            const { error: delErr } = await supabase
              .from('catedras')
              .delete()
              .in('id', orphanIds);
            if (delErr) throw delErr;
            purgedCount = orphanIds.length;
          }
        }
      } else {
        // Demo fallback
        const orphanIds = catedras.filter(c => c.isOrphan).map(c => c.id);
        setCatedras(prev => prev.filter(c => !c.isOrphan));
        purgedCount = orphanIds.length;
      }

      await loadTeacherData(teacher.id);
      toast.success(`Depuración completada: ${purgedCount} registros huérfanos eliminados.`);
    } catch (err) {
      toast.error('Error al purgar huérfanos: ' + err.message);
    } finally {
      setPurging(false);
    }
  };

  // Inspeccionar como Docente
  const handleInspectAsTeacher = () => {
    localStorage.setItem('support_inspect_teacher_id', teacher.id);
    localStorage.setItem('support_inspect_teacher_name', teacher.nombre || teacher.email);
    toast.info(`Modo soporte activo para: ${teacher.nombre || teacher.email}. Vista en modo solo lectura.`);
    onClose();
  };

  // Volcado de Datos JSON
  const handleExportJson = () => {
    try {
      const dump = {
        docente: teacher,
        catedras,
        alumnos,
        clases,
        evaluaciones,
        exported_at: new Date().toISOString(),
        exported_by: 'Superadmin Support Hub'
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dump, null, 2));
      const downloadAnchor = document.createElement('a');
      const safeName = (teacher.nombre || teacher.email || 'docente').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `volcado_soporte_${safeName}_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      toast.success('Volcado de datos JSON exportado correctamente.');
    } catch (err) {
      toast.error('Error al generar volcado JSON: ' + err.message);
    }
  };

  // Eliminar Cátedra
  const handleDeleteCatedra = (cat) => {
    setConfirmModal({
      isOpen: true,
      title: `¿Eliminar cátedra "${cat.nombre}"?`,
      description: 'Esta acción borrará todas las clases, asistencias, evaluaciones y notas vinculadas a esta cátedra.',
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          if (isDemo || !isSupabaseConfigured || !supabase) {
            setCatedras(prev => prev.filter(c => c.id !== cat.id));
            toast.success(`Cátedra "${cat.nombre}" eliminada.`);
            setConfirmModal({ isOpen: false });
            return;
          }

          const { error } = await supabase.from('catedras').delete().eq('id', cat.id);
          if (error) throw error;

          toast.success(`Cátedra "${cat.nombre}" eliminada de la base de datos.`);
          setCatedras(prev => prev.filter(c => c.id !== cat.id));
          setConfirmModal({ isOpen: false });
        } catch (err) {
          toast.error('Error al eliminar cátedra: ' + err.message);
          setConfirmModal(prev => ({ ...prev, loading: false }));
        }
      }
    });
  };

  // Eliminar Matrícula de Alumno
  const handleDeleteAlumno = (alu) => {
    setConfirmModal({
      isOpen: true,
      title: `¿Eliminar matrícula de ${alu.apellido}, ${alu.nombre}?`,
      description: `Se eliminarán sus inscripciones y registros vinculados a este docente.`,
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          if (isDemo || !isSupabaseConfigured || !supabase) {
            setAlumnos(prev => prev.filter(a => a.id !== alu.id));
            toast.success(`Matrícula de ${alu.apellido} eliminada.`);
            setConfirmModal({ isOpen: false });
            return;
          }

          const { error } = await supabase.from('estudiantes').delete().eq('id', alu.id);
          if (error) throw error;

          toast.success(`Estudiante ${alu.apellido} eliminado del sistema.`);
          setAlumnos(prev => prev.filter(a => a.id !== alu.id));
          setConfirmModal({ isOpen: false });
        } catch (err) {
          toast.error('Error al eliminar estudiante: ' + err.message);
          setConfirmModal(prev => ({ ...prev, loading: false }));
        }
      }
    });
  };

  // Depurar Clase
  const handleDeleteClase = (cla) => {
    setConfirmModal({
      isOpen: true,
      title: `¿Depurar clase del ${formatFechaDMY(cla.fecha)}?`,
      description: `Se eliminará el registro de la clase y las asistencias asociadas.`,
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          if (isDemo || !isSupabaseConfigured || !supabase) {
            setClases(prev => prev.filter(c => c.id !== cla.id));
            toast.success('Clase depurada.');
            setConfirmModal({ isOpen: false });
            return;
          }

          const { error } = await supabase.from('clases').delete().eq('id', cla.id);
          if (error) throw error;

          toast.success('Registro de clase depurado.');
          setClases(prev => prev.filter(c => c.id !== cla.id));
          setConfirmModal({ isOpen: false });
        } catch (err) {
          toast.error('Error al eliminar clase: ' + err.message);
          setConfirmModal(prev => ({ ...prev, loading: false }));
        }
      }
    });
  };

  // Depurar Evaluación
  const handleDeleteEvaluacion = (ev) => {
    setConfirmModal({
      isOpen: true,
      title: `¿Eliminar evaluación "${ev.titulo}"?`,
      description: `Se borrará la evaluación y todas las calificaciones cargadas en ella.`,
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          if (isDemo || !isSupabaseConfigured || !supabase) {
            setEvaluaciones(prev => prev.filter(e => e.id !== ev.id));
            toast.success('Evaluación eliminada.');
            setConfirmModal({ isOpen: false });
            return;
          }

          const { error } = await supabase.from('evaluaciones').delete().eq('id', ev.id);
          if (error) throw error;

          toast.success('Evaluación eliminada correctamente.');
          setEvaluaciones(prev => prev.filter(e => e.id !== ev.id));
          setConfirmModal({ isOpen: false });
        } catch (err) {
          toast.error('Error al eliminar evaluación: ' + err.message);
          setConfirmModal(prev => ({ ...prev, loading: false }));
        }
      }
    });
  };

  // Filtrado de alumnos en pestaña Alumnos
  const filteredAlumnos = useMemo(() => {
    const q = studentSearch.toLowerCase().trim();
    if (!q) return alumnos;
    return alumnos.filter(a => 
      a.apellido?.toLowerCase().includes(q) ||
      a.nombre?.toLowerCase().includes(q) ||
      String(a.dni || '').includes(q)
    );
  }, [alumnos, studentSearch]);

  if (!isOpen) return null;

  const initials = teacher?.nombre
    ? teacher.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'DO';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      {/* Fondo desenfocado backdrop-blur-md */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
        aria-hidden="true"
      />

      {/* MODAL BENTO CENTRADO DE GRAN FORMATO */}
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden z-10 animate-scaleIn">
        
        {/* ========================================================
            1. CABECERA DE USUARIO BENTO GLASS
           ======================================================== */}
        <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-800/50 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-white flex items-center justify-center font-extrabold text-base shadow-lg shadow-primary/25 shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-text-primary truncate">
                  {teacher?.nombre || 'Docente'}
                </h2>
                <Badge variant={teacher?.rol === 'superadmin' ? 'primary' : 'default'} className="font-mono text-[10px] font-bold">
                  {teacher?.rol?.toUpperCase() || 'DOCENTE'}
                </Badge>
              </div>
              <p className="text-xs text-text-muted font-mono truncate mt-0.5">
                {teacher?.email}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-mono text-text-muted truncate max-w-[180px] sm:max-w-[280px]">
                  UUID: {teacher?.id}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1 text-text-muted hover:text-primary rounded transition-colors cursor-pointer"
                  title="Copiar ID de Supabase"
                >
                  {copiedId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Selector de Rol y Botón Cerrar */}
          <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
            <div className="flex items-center p-1 rounded-xl bg-slate-200/60 dark:bg-white/10 border border-slate-300/60 dark:border-white/5">
              <button
                type="button"
                disabled={changingRole}
                onClick={() => handleRoleChange('docente')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  teacher?.rol !== 'superadmin'
                    ? 'bg-white dark:bg-slate-800 text-text-primary shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Docente
              </button>
              <button
                type="button"
                disabled={changingRole}
                onClick={() => handleRoleChange('superadmin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  teacher?.rol === 'superadmin'
                    ? 'bg-gradient-to-r from-rose-500 to-primary text-white shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Superadmin</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Cerrar modal de soporte"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================
            2. BARRA DE ACCIONES RÁPIDAS DE SUPERUSUARIO
           ======================================================== */}
        <div className="px-5 sm:px-6 py-3 border-b border-slate-200/60 dark:border-white/5 bg-slate-100/60 dark:bg-white/[0.02] flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              icon={Eraser}
              onClick={handlePurgeOrphans}
              disabled={purging}
              className="text-xs font-bold border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 whitespace-nowrap"
            >
              {purging ? 'Purgando...' : '🧹 Purgar Huérfanos'}
            </Button>

            <Button
              size="sm"
              variant="outline"
              icon={Eye}
              onClick={handleInspectAsTeacher}
              className="text-xs font-bold border-primary/30 text-primary hover:bg-primary/10 whitespace-nowrap"
            >
              👁️ Inspeccionar como Docente
            </Button>

            <Button
              size="sm"
              variant="outline"
              icon={Download}
              onClick={handleExportJson}
              className="text-xs font-bold border-slate-300 dark:border-white/20 whitespace-nowrap"
            >
              📥 Volcado de Datos JSON
            </Button>
          </div>

          <button
            type="button"
            onClick={() => loadTeacherData(teacher.id)}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors shrink-0"
            title="Recargar datos del docente"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* ========================================================
            3. PESTAÑAS DE GESTIÓN BENTO
           ======================================================== */}
        <div className="flex items-center gap-2 px-5 sm:px-6 pt-3 border-b border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('catedras')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'catedras'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Cátedras</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">
              {catedras.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('alumnos')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'alumnos'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Alumnos</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">
              {alumnos.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clases')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'clases'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Evaluaciones & Clases</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">
              {clases.length + evaluaciones.length}
            </span>
          </button>
        </div>

        {/* ========================================================
            4. CONTENIDO DE LAS PESTAÑAS (TARJETAS ESTILIZADAS)
           ======================================================== */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* PESTAÑA CÁTEDRAS: Tarjetas estilizadas en cuadrícula */}
              {activeTab === 'catedras' && (
                <div className="space-y-4">
                  {catedras.length === 0 ? (
                    <EmptyState
                      icon={BookOpen}
                      title="Sin cátedras registradas"
                      description="El docente no tiene espacios curriculares asignados en este momento."
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {catedras.map((cat) => (
                        <div
                          key={cat.id}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                            cat.isOrphan 
                              ? 'bg-amber-500/5 border-amber-500/30 dark:bg-amber-500/10' 
                              : 'bg-slate-50/70 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/10 hover:border-primary/40'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-bold text-text-primary leading-snug">
                                {cat.nombre}
                              </h4>
                              {cat.isOrphan && (
                                <Badge variant="warning" className="text-[10px] font-mono font-bold shrink-0">
                                  Huérfana
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={cat.nivel === 'TERCIARIO' ? 'primary' : 'default'} className="text-[10px]">
                                {cat.nivel || 'N/A'}
                              </Badge>
                              <Badge variant="default" className="text-[10px]">
                                {cat.modalidad || 'ANUAL'}
                              </Badge>
                              <span className="text-[11px] text-text-muted flex items-center gap-1 font-mono">
                                <Users className="w-3 h-3 text-primary" />
                                {cat.estudiantes_count} {cat.estudiantes_count === 1 ? 'alumno' : 'alumnos'}
                              </span>
                            </div>

                            <p className="text-xs text-text-muted flex items-center gap-1.5 truncate">
                              <Building className="w-3.5 h-3.5 text-text-muted shrink-0" />
                              <span className="truncate">{cat.institucion_nombre || 'Sin institución asignada'}</span>
                            </p>
                          </div>

                          <div className="pt-3 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                            <span className="text-[10px] font-mono text-text-muted">
                              ID: {cat.id?.substring(0, 8)}...
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteCatedra(cat)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar cátedra"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Borrado Seguro</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PESTAÑA ALUMNOS: Tabla estilizada con buscador interno */}
              {activeTab === 'alumnos' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Buscar alumno por apellido, nombre o DNI..."
                      className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 text-text-primary focus:outline-none focus:border-primary"
                    />
                    {studentSearch && (
                      <button
                        onClick={() => setStudentSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {filteredAlumnos.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title="Sin alumnos coincidentes"
                      description="No se encontraron estudiantes para los criterios ingresados."
                    />
                  ) : (
                    <div className="border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/80 dark:bg-white/[0.04] text-text-secondary font-semibold border-b border-slate-200/80 dark:border-white/10">
                          <tr>
                            <th className="px-4 py-3 font-mono">DNI</th>
                            <th className="px-4 py-3">Estudiante</th>
                            <th className="px-4 py-3">Cátedras Vinculadas</th>
                            <th className="px-4 py-3 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                          {filteredAlumnos.map((alu) => {
                            const catList = Array.isArray(alu.catedras)
                              ? alu.catedras
                              : (alu.inscripciones || []).map(i => i.catedras?.nombre).filter(Boolean);

                            return (
                              <tr key={alu.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02]">
                                <td className="px-4 py-3 font-mono text-text-muted">{alu.dni || 'S/D'}</td>
                                <td className="px-4 py-3 font-bold text-text-primary">
                                  {alu.apellido}, {alu.nombre}
                                </td>
                                <td className="px-4 py-3 text-text-muted">
                                  <div className="flex flex-wrap gap-1">
                                    {catList.length > 0 ? (
                                      catList.map((cName, idx) => (
                                        <span key={idx} className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-medium">
                                          {cName}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="italic text-text-muted text-[11px]">Sin matrícula activa</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAlumno(alu)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                    title="Eliminar matrícula"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Eliminar Matrícula</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* PESTAÑA EVALUACIONES & CLASES: Lista cronológica con botón de depuración */}
              {activeTab === 'clases' && (
                <div className="space-y-4">
                  {/* Evaluaciones */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted px-1">
                      Evaluaciones ({evaluaciones.length})
                    </h4>
                    {evaluaciones.length === 0 ? (
                      <p className="text-xs text-text-muted italic px-1">Sin evaluaciones cargadas.</p>
                    ) : (
                      <div className="space-y-2">
                        {evaluaciones.map((ev) => (
                          <div
                            key={ev.id}
                            className="p-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="primary" className="text-[10px]">
                                  {ev.tipo || 'EVAL'}
                                </Badge>
                                <span className="text-xs font-bold text-text-primary truncate">
                                  {ev.titulo}
                                </span>
                              </div>
                              <p className="text-[11px] text-text-muted mt-0.5 truncate">
                                Cátedra: {ev.catedras?.nombre || ev.catedra_nombre || 'N/A'}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteEvaluacion(ev)}
                              className="p-1.5 text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0 cursor-pointer"
                              title="Eliminar evaluación"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Clases */}
                  <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-white/5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted px-1">
                      Últimas Clases Dictadas ({clases.length})
                    </h4>
                    {clases.length === 0 ? (
                      <p className="text-xs text-text-muted italic px-1">Sin clases registradas.</p>
                    ) : (
                      <div className="space-y-2">
                        {clases.map((cla) => (
                          <div
                            key={cla.id}
                            className="p-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono font-bold text-primary">
                                  {formatFechaDMY(cla.fecha)}
                                </span>
                                <span className="text-xs font-semibold text-text-primary truncate">
                                  {cla.tema || 'Sin tema especificado'}
                                </span>
                              </div>
                              <p className="text-[11px] text-text-muted mt-0.5 truncate">
                                Cátedra: {cla.catedras?.nombre || cla.catedra_nombre || 'N/A'}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteClase(cla)}
                              className="p-1.5 text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0 cursor-pointer"
                              title="Depurar registro de clase"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal de Confirmación Destructiva */}
        <ConfirmDialog
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          description={confirmModal.description}
          confirmText="Confirmar Eliminación"
          cancelText="Cancelar"
          variant="danger"
          loading={confirmModal.loading}
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal({ isOpen: false })}
        />
      </div>
    </div>
  );
}
