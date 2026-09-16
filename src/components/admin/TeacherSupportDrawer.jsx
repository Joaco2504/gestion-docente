import React, { useState, useEffect } from 'react';
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
  ExternalLink,
  Calendar,
  Layers,
  FileSpreadsheet,
  Clock,
  Sparkles,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import ConfirmDialog from '../common/ConfirmDialog';
import EmptyState from '../common/EmptyState';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { formatFechaDMY } from '../../lib/dateUtils';
import { toast } from 'sonner';
import { handleAppError } from '../../utils/handleAppError';

export default function TeacherSupportDrawer({
  isOpen,
  onClose,
  teacher,
  isDemo = false
}) {
  const [activeTab, setActiveTab] = useState('catedras'); // 'catedras' | 'alumnos' | 'clases'
  const [catedras, setCatedras] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [clases, setClases] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [loading, setLoading] = useState(false);

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
        // Generar mock coherente con el docente seleccionado
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
            institucion_nombre: 'Colegio Secundario N° 4',
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
          .limit(30);
        loadedClases = clData || [];

        const { data: evData } = await supabase
          .from('evaluaciones')
          .select('id, titulo, tipo, catedra_id, catedras(nombre)')
          .in('catedra_id', catedraIds)
          .limit(30);
        loadedEvas = evData || [];
      }

      // Detectar cátedras huérfanas (sin inscripciones)
      const mappedCats = (cats || []).map(cat => {
        const count = (studs || []).filter(s => 
          s.inscripciones?.some(i => i.catedras?.id === cat.id)
        ).length;
        return {
          ...cat,
          institucion_nombre: cat.instituciones?.nombre || 'Sin institución',
          estudiantes_count: count,
          isOrphan: count === 0
        };
      });

      setCatedras(mappedCats);
      setAlumnos(studs || []);
      setClases(loadedClases);
      setEvaluaciones(loadedEvas);
    } catch (err) {
      handleAppError(err, 'TeacherSupportDrawer / Cargar Datos');
    } finally {
      setLoading(false);
    }
  };

  // Acción: Eliminar Cátedra
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
            toast.success(`Cátedra "${cat.nombre}" eliminada correctamente.`);
            setConfirmModal({ isOpen: false });
            return;
          }

          const { error } = await supabase.from('catedras').delete().eq('id', cat.id);
          if (error) throw error;

          toast.success(`Cátedra "${cat.nombre}" eliminada de la base de datos.`);
          setCatedras(prev => prev.filter(c => c.id !== cat.id));
          setConfirmModal({ isOpen: false });
        } catch (err) {
          handleAppError(err, 'TeacherSupportDrawer / Eliminar Cátedra');
          setConfirmModal(prev => ({ ...prev, loading: false }));
        }
      }
    });
  };

  // Acción: Eliminar Alumno
  const handleDeleteAlumno = (alu) => {
    setConfirmModal({
      isOpen: true,
      title: `¿Eliminar al estudiante ${alu.apellido}, ${alu.nombre}?`,
      description: `Se eliminarán sus inscripciones, asistencias y notas de todas las materias del docente.`,
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          if (isDemo || !isSupabaseConfigured || !supabase) {
            setAlumnos(prev => prev.filter(a => a.id !== alu.id));
            toast.success(`Estudiante ${alu.apellido} eliminado.`);
            setConfirmModal({ isOpen: false });
            return;
          }

          const { error } = await supabase.from('estudiantes').delete().eq('id', alu.id);
          if (error) throw error;

          toast.success(`Estudiante ${alu.apellido} eliminado del sistema.`);
          setAlumnos(prev => prev.filter(a => a.id !== alu.id));
          setConfirmModal({ isOpen: false });
        } catch (err) {
          handleAppError(err, 'TeacherSupportDrawer / Eliminar Estudiante');
          setConfirmModal(prev => ({ ...prev, loading: false }));
        }
      }
    });
  };

  // Acción: Depurar/Eliminar Clase
  const handleDeleteClase = (cla) => {
    setConfirmModal({
      isOpen: true,
      title: `¿Depurar clase del ${formatFechaDMY(cla.fecha)}?`,
      description: `Se eliminará el registro de la clase y las asistencias asociadas de la cátedra "${cla.catedras?.nombre || cla.catedra_nombre}".`,
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          if (isDemo || !isSupabaseConfigured || !supabase) {
            setClases(prev => prev.filter(c => c.id !== cla.id));
            toast.success('Registro de clase depurado con éxito.');
            setConfirmModal({ isOpen: false });
            return;
          }

          const { error } = await supabase.from('clases').delete().eq('id', cla.id);
          if (error) throw error;

          toast.success('Registro de clase depurado.');
          setClases(prev => prev.filter(c => c.id !== cla.id));
          setConfirmModal({ isOpen: false });
        } catch (err) {
          handleAppError(err, 'TeacherSupportDrawer / Eliminar Clase');
          setConfirmModal(prev => ({ ...prev, loading: false }));
        }
      }
    });
  };

  // Acción: Depurar/Eliminar Evaluación
  const handleDeleteEvaluacion = (ev) => {
    setConfirmModal({
      isOpen: true,
      title: `¿Eliminar evaluación "${ev.titulo}"?`,
      description: `Se borrará la evaluación y todas las notas cargadas en ella.`,
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
          handleAppError(err, 'TeacherSupportDrawer / Eliminar Evaluación');
          setConfirmModal(prev => ({ ...prev, loading: false }));
        }
      }
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity animate-fadeIn"
      />

      {/* Slide-over Drawer Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-canvas border-l border-surface-border shadow-2xl flex flex-col animate-slideLeft">
        
        {/* Header Drawer */}
        <div className="p-5 border-b border-surface-border bg-surface/70 backdrop-blur-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-primary/25 shrink-0">
              {teacher?.nombre ? teacher.nombre.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-text-primary truncate">
                  {teacher?.nombre || 'Docente'}
                </h3>
                <Badge variant={teacher?.rol === 'superadmin' ? 'primary' : 'neutral'} className="font-mono text-[10px]">
                  {teacher?.rol?.toUpperCase() || 'DOCENTE'}
                </Badge>
              </div>
              <p className="text-xs text-text-muted truncate font-mono">
                {teacher?.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
            title="Cerrar panel de soporte"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-surface-border bg-surface/40">
          <button
            type="button"
            onClick={() => setActiveTab('catedras')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'catedras'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Cátedras</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-hover text-[10px] font-mono">
              {catedras.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('alumnos')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'alumnos'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Alumnos</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-hover text-[10px] font-mono">
              {alumnos.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clases')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'clases'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Evaluaciones & Clases</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-hover text-[10px] font-mono">
              {clases.length + evaluaciones.length}
            </span>
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto" />
              <p className="text-xs text-text-muted">Cargando datos del docente...</p>
            </div>
          ) : (
            <>
              {/* ==============================================================
                  TAB 1: CÁTEDRAS
                 ============================================================== */}
              {activeTab === 'catedras' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>Espacios curriculares a cargo</span>
                    <span>{catedras.filter(c => c.isOrphan).length} huérfanas detectadas</span>
                  </div>

                  {catedras.length === 0 ? (
                    <EmptyState
                      title="Sin cátedras registradas"
                      description="El docente no tiene materias asignadas actualmente."
                    />
                  ) : (
                    catedras.map(cat => (
                      <div 
                        key={cat.id} 
                        className={`p-4 rounded-2xl border transition-all ${
                          cat.isOrphan 
                            ? 'bg-amber-500/5 border-amber-500/25 dark:bg-amber-500/10' 
                            : 'bg-surface border-surface-border hover:border-surface-border/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-text-primary">{cat.nombre}</h4>
                              {cat.isOrphan && (
                                <Badge variant="warning" className="text-[10px]">Cátedra Huérfana</Badge>
                              )}
                              <Badge variant="neutral" className="text-[10px]">{cat.nivel}</Badge>
                            </div>
                            <p className="text-xs text-text-secondary">
                              {cat.institucion_nombre} • Modalidad {cat.modalidad}
                            </p>
                            <div className="flex items-center gap-3 pt-1 text-xs text-text-muted font-mono">
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-primary" />
                                {cat.estudiantes_count} inscriptos
                              </span>
                            </div>
                          </div>

                          <Button
                            variant="danger"
                            size="sm"
                            icon={Trash2}
                            onClick={() => handleDeleteCatedra(cat)}
                            className="text-xs shrink-0"
                            title="Eliminar cátedra huérfana o errónea"
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ==============================================================
                  TAB 2: ALUMNOS
                 ============================================================== */}
              {activeTab === 'alumnos' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>Estudiantes registrados bajo la nómina del docente</span>
                    <span>Total: {alumnos.length}</span>
                  </div>

                  {alumnos.length === 0 ? (
                    <EmptyState
                      title="Sin alumnos asociados"
                      description="No hay estudiantes registrados para este docente."
                    />
                  ) : (
                    <div className="space-y-2">
                      {alumnos.map(alu => (
                        <div 
                          key={alu.id} 
                          className="p-3.5 rounded-2xl bg-surface border border-surface-border flex items-center justify-between gap-3 hover:border-primary/30 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-surface-hover flex items-center justify-center font-bold text-xs text-text-secondary shrink-0">
                              {alu.apellido.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-text-primary block truncate">
                                {alu.apellido}, {alu.nombre}
                              </span>
                              <span className="text-[11px] font-mono text-text-muted block">
                                DNI: {alu.dni}
                              </span>
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            icon={Trash2}
                            onClick={() => handleDeleteAlumno(alu)}
                            className="text-xs text-danger hover:bg-danger/10 border-danger/20 shrink-0"
                            title="Eliminar estudiante"
                          >
                            Eliminar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ==============================================================
                  TAB 3: EVALUACIONES Y CLASES
                 ============================================================== */}
              {activeTab === 'clases' && (
                <div className="space-y-6">
                  {/* Evaluaciones */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-primary" />
                      <span>Evaluaciones Registradas ({evaluaciones.length})</span>
                    </h4>

                    {evaluaciones.length === 0 ? (
                      <p className="text-xs text-text-muted italic">No hay evaluaciones registradas.</p>
                    ) : (
                      <div className="space-y-2">
                        {evaluaciones.map(ev => (
                          <div 
                            key={ev.id}
                            className="p-3 rounded-xl bg-surface border border-surface-border flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-text-primary block truncate">{ev.titulo}</span>
                              <span className="text-[10px] text-text-muted font-mono">
                                Tipo: {ev.tipo} • {ev.catedras?.nombre || ev.catedra_nombre}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteEvaluacion(ev)}
                              className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-colors cursor-pointer"
                              title="Depurar evaluación"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Clases */}
                  <div className="space-y-2.5 pt-3 border-t border-surface-border">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span>Historial de Clases ({clases.length})</span>
                    </h4>

                    {clases.length === 0 ? (
                      <p className="text-xs text-text-muted italic">No hay clases dictadas registradas.</p>
                    ) : (
                      <div className="space-y-2">
                        {clases.map(cla => (
                          <div 
                            key={cla.id}
                            className="p-3 rounded-xl bg-surface border border-surface-border flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-text-primary block truncate">{cla.tema || 'Clase sin tema'}</span>
                              <span className="text-[10px] text-text-muted font-mono">
                                {formatFechaDMY(cla.fecha)} • {cla.catedras?.nombre || cla.catedra_nombre}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteClase(cla)}
                              className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-colors cursor-pointer"
                              title="Depurar clase"
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

        {/* Footer */}
        <div className="p-4 border-t border-surface-border bg-surface/70 flex justify-end">
          <Button variant="secondary" onClick={onClose} type="button">
            Cerrar Panel
          </Button>
        </div>
      </div>

      {/* Modal de Confirmación para Acciones Destructivas */}
      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        loading={confirmModal.loading}
      />
    </>
  );
}
