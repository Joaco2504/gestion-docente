import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  ArrowRight,
  Pencil,
  BookMarked
} from 'lucide-react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import ConfirmDialog from '../common/ConfirmDialog';
import EmptyState from '../common/EmptyState';
import CustomSelect from '../common/CustomSelect';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { formatFechaDMY } from '../../lib/dateUtils';
import { toast } from 'sonner';
import { handleAppError } from '../../utils/handleAppError';

export default function SupportHubModal({
  isOpen,
  onClose,
  teacher,
  isDemo = false,
  onTeacherUpdated
}) {
  const [activeTab, setActiveTab] = useState('catedras'); // 'catedras' | 'alumnos' | 'evaluaciones' | 'clases' | 'mesas'
  const [catedras, setCatedras] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [clases, setClases] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [notas, setNotas] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [changingRole, setChangingRole] = useState(false);
  const [purging, setPurging] = useState(false);

  // Filtros de Alumnos
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedCatedraAlumnos, setSelectedCatedraAlumnos] = useState('all');

  // Auditoría y Edición de Evaluaciones y Calificaciones
  const [evalCatedraFilter, setEvalCatedraFilter] = useState('all');
  const [evalTipoFilter, setEvalTipoFilter] = useState('all');
  const [selectedEvalAudit, setSelectedEvalAudit] = useState(null);
  const [editingGrade, setEditingGrade] = useState({
    isOpen: false,
    evaluacion: null,
    estudiante: null,
    valor: '',
    currentValor: null
  });

  // Edición de Mesa en Panel de Soporte
  const [editingMesa, setEditingMesa] = useState(null);
  const [editForm, setEditForm] = useState({
    fecha: '',
    turno_llamado: '',
    condicion_acta: 'REGULAR',
    presidente: '',
    vocal1: '',
    vocal2: '',
    libro: '',
    folio: ''
  });
  const [savingEditMesa, setSavingEditMesa] = useState(false);

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
        
        const initialCats = filteredCats.length > 0 ? filteredCats : [
          {
            id: 'cat-demo-1',
            nombre: 'Introducción a la Algoritmia',
            nivel: 'TERCIARIO',
            modalidad: 'ANUAL',
            institucion_nombre: 'Instituto Superior de Formación Docente N° 19',
            estudiantes_count: 2,
            isOrphan: false
          },
          {
            id: 'cat-demo-2',
            nombre: 'Sistemas Operativos y Redes',
            nivel: 'TERCIARIO',
            modalidad: 'CUATRIMESTRAL',
            institucion_nombre: 'Instituto Superior de Formación Docente N° 19',
            estudiantes_count: 2,
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
        ];

        setCatedras(initialCats);

        setAlumnos([
          { 
            id: 'alu-1', 
            dni: '42.105.890', 
            apellido: 'Gómez', 
            nombre: 'Lucas Valentín', 
            email: 'lucas.gomez@gmail.com', 
            catedras: ['Introducción a la Algoritmia'],
            inscripciones: [{ catedras: { id: 'cat-demo-1', nombre: 'Introducción a la Algoritmia' } }]
          },
          { 
            id: 'alu-2', 
            dni: '43.512.441', 
            apellido: 'Benítez', 
            nombre: 'Camila Sofía', 
            email: 'cami.benitez@gmail.com', 
            catedras: ['Introducción a la Algoritmia', 'Sistemas Operativos y Redes'],
            inscripciones: [
              { catedras: { id: 'cat-demo-1', nombre: 'Introducción a la Algoritmia' } },
              { catedras: { id: 'cat-demo-2', nombre: 'Sistemas Operativos y Redes' } }
            ]
          },
          { 
            id: 'alu-3', 
            dni: '41.902.115', 
            apellido: 'Vargas', 
            nombre: 'Matías Ezequiel', 
            email: 'matias.vargas@gmail.com', 
            catedras: ['Sistemas Operativos y Redes'],
            inscripciones: [{ catedras: { id: 'cat-demo-2', nombre: 'Sistemas Operativos y Redes' } }]
          }
        ]);

        setClases([
          { id: 'cla-1', fecha: '2026-03-15', tema: 'Presentación de la materia y régimen de cursado', catedra_id: 'cat-demo-1', catedra_nombre: 'Introducción a la Algoritmia', catedras: { id: 'cat-demo-1', nombre: 'Introducción a la Algoritmia' } },
          { id: 'cla-2', fecha: '2026-03-22', tema: 'Tipos de datos y estructuras de control', catedra_id: 'cat-demo-1', catedra_nombre: 'Introducción a la Algoritmia', catedras: { id: 'cat-demo-1', nombre: 'Introducción a la Algoritmia' } }
        ]);

        setEvaluaciones([
          { id: 'eva-1', titulo: 'Trabajo Práctico N° 1: Variables y Bucles', tipo: 'TP', fecha_entrega: '2026-04-10', catedra_id: 'cat-demo-1', catedra_nombre: 'Introducción a la Algoritmia', catedras: { id: 'cat-demo-1', nombre: 'Introducción a la Algoritmia' } },
          { id: 'eva-2', titulo: 'Primer Parcial Teórico-Práctico', tipo: 'PARCIAL', fecha_entrega: '2026-05-20', catedra_id: 'cat-demo-1', catedra_nombre: 'Introducción a la Algoritmia', catedras: { id: 'cat-demo-1', nombre: 'Introducción a la Algoritmia' } },
          { id: 'eva-3', titulo: 'Recuperatorio 1° Parcial', tipo: 'RECUPERATORIO', fecha_entrega: '2026-06-05', catedra_id: 'cat-demo-1', catedra_nombre: 'Introducción a la Algoritmia', catedras: { id: 'cat-demo-1', nombre: 'Introducción a la Algoritmia' } }
        ]);

        setNotas([
          { id: 'not-1', evaluacion_id: 'eva-1', estudiante_id: 'alu-1', valor: 8.50 },
          { id: 'not-2', evaluacion_id: 'eva-1', estudiante_id: 'alu-2', valor: 9.00 },
          { id: 'not-3', evaluacion_id: 'eva-2', estudiante_id: 'alu-1', valor: 7.00 },
          { id: 'not-4', evaluacion_id: 'eva-2', estudiante_id: 'alu-2', valor: 6.50 },
          { id: 'not-5', evaluacion_id: 'eva-3', estudiante_id: 'alu-2', valor: 8.00 }
        ]);

        setMesas([
          {
            id: 'mesa-demo-1',
            fecha: '2026-07-15',
            turno_llamado: '1° LLAMADO JULIO',
            condicion_acta: 'REGULAR',
            presidente: teacher?.nombre || 'Docente Titular',
            vocal1: 'Prof. García',
            vocal2: 'Prof. López',
            inscriptos_count: 5,
            libro: 'L-12',
            folio: '45',
            catedras: { nombre: 'Introducción a la Algoritmia' }
          }
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

      // 3. Clases, Evaluaciones y Notas de sus cátedras
      const catedraIds = (cats || []).map(c => c.id);
      let loadedClases = [];
      let loadedEvas = [];
      let loadedNotas = [];

      if (catedraIds.length > 0) {
        const { data: clData } = await supabase
          .from('clases')
          .select('id, fecha, tema, catedra_id, catedras(id, nombre)')
          .in('catedra_id', catedraIds)
          .order('fecha', { ascending: false })
          .limit(50);
        loadedClases = clData || [];

        const { data: evData } = await supabase
          .from('evaluaciones')
          .select('id, titulo, tipo, fecha_entrega, catedra_id, catedras(id, nombre)')
          .in('catedra_id', catedraIds)
          .limit(50);
        loadedEvas = evData || [];

        if (loadedEvas.length > 0) {
          const evalIds = loadedEvas.map(e => e.id);
          const { data: nData, error: nErr } = await supabase
            .from('notas')
            .select('id, evaluacion_id, estudiante_id, valor')
            .in('evaluacion_id', evalIds);
          if (!nErr && nData) {
            loadedNotas = nData;
          }
        }
      }

      // 4. Mesas de Examen creadas por el docente con actas
      const { data: mData, error: mErr } = await supabase
        .from('mesas_examen')
        .select(`
          id, catedra_id, docente_id, fecha, turno_llamado, tipo_mesa, condicion_acta,
          libro, tomo, folio, acta_numero, presidente, vocal_1, vocal_2,
          catedras ( id, nombre ),
          actas_examen_alumnos ( id )
        `)
        .eq('docente_id', teacherId)
        .order('fecha', { ascending: false });

      if (mErr) {
        console.warn('Error al cargar mesas_examen en SupportHub:', mErr);
      }

      const loadedMesas = (mData || []).map(m => ({
        ...m,
        vocal1: m.vocal_1 || '',
        vocal2: m.vocal_2 || '',
        condicion_acta: m.condicion_acta || (m.tipo_mesa === 'PROMOCIONAL' ? 'PROMOCIONAL' : 'REGULAR'),
        inscriptos_count: (m.actas_examen_alumnos || []).length
      }));

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
      setNotas(loadedNotas);
      setMesas(loadedMesas);
    } catch (err) {
      handleAppError(err, 'SupportHubModal / Cargar datos docente');
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
        const { error: rpcErr } = await supabase.rpc('admin_cambiar_rol', {
          p_user_id: teacher.id,
          p_nuevo_rol: newRole
        });

        if (rpcErr) {
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
      handleAppError(err, 'SupportHubModal / Cambiar rol');
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
        const orphanIds = catedras.filter(c => c.isOrphan).map(c => c.id);
        setCatedras(prev => prev.filter(c => !c.isOrphan));
        purgedCount = orphanIds.length;
      }

      await loadTeacherData(teacher.id);
      toast.success(`Depuración completada: ${purgedCount} registros huérfanos eliminados.`);
    } catch (err) {
      handleAppError(err, 'SupportHubModal / Purgar huérfanos');
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
        mesas,
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
      handleAppError(err, 'SupportHubModal / Exportar JSON');
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
          handleAppError(err, 'SupportHubModal / Eliminar cátedra');
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
          handleAppError(err, 'SupportHubModal / Eliminar estudiante');
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
          handleAppError(err, 'SupportHubModal / Eliminar clase');
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
          handleAppError(err, 'SupportHubModal / Eliminar evaluación');
          setConfirmModal(prev => ({ ...prev, loading: false }));
        }
      }
    });
  };

  // ==========================================
  // GESTIÓN DE MESAS DE EXAMEN (SUPERADMIN)
  // ==========================================
  const handleStartEditMesa = (mesa) => {
    setEditingMesa(mesa);
    setEditForm({
      fecha: mesa.fecha || '',
      turno_llamado: mesa.turno_llamado || '',
      condicion_acta: mesa.condicion_acta || 'REGULAR',
      presidente: mesa.presidente || '',
      vocal1: mesa.vocal1 || '',
      vocal2: mesa.vocal2 || '',
      libro: mesa.libro || '',
      folio: mesa.folio || ''
    });
  };

  const handleSaveEditMesa = async () => {
    if (!editingMesa?.id) return;
    setSavingEditMesa(true);
    try {
      if (isSupabaseConfigured && !isDemo && supabase) {
        const { error } = await supabase
          .from('mesas_examen')
          .update({
            fecha: editForm.fecha,
            turno_llamado: editForm.turno_llamado,
            condicion_acta: editForm.condicion_acta,
            tipo_mesa: editForm.condicion_acta === 'PROMOCIONAL' ? 'PROMOCIONAL' : 'FINAL',
            presidente: editForm.presidente,
            vocal_1: editForm.vocal1 || editForm.vocal_1 || '',
            vocal_2: editForm.vocal2 || editForm.vocal_2 || '',
            libro: editForm.libro,
            folio: editForm.folio
          })
          .eq('id', editingMesa.id);

        if (error) throw error;
      }

      setMesas(prev => prev.map(m => m.id === editingMesa.id ? { ...m, ...editForm } : m));
      toast.success('Mesa de examen actualizada correctamente.');
      setEditingMesa(null);
    } catch (err) {
      handleAppError(err, 'SupportHubModal / Actualizar mesa');
    } finally {
      setSavingEditMesa(false);
    }
  };

  const handleDeleteMesa = (m) => {
    setConfirmModal({
      isOpen: true,
      title: `¿Eliminar mesa de examen "${m.turno_llamado || 'Examen'}"?`,
      description: `Esta acción eliminará de forma irreversible la mesa de examen y todas sus actas de calificaciones asociadas (${m.inscriptos_count} alumnos inscriptos) en cascada sin dejar registros huérfanos.`,
      loading: false,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          if (isDemo || !isSupabaseConfigured || !supabase) {
            setMesas(prev => prev.filter(x => x.id !== m.id));
            toast.success('Mesa de examen y actas eliminadas.');
            setConfirmModal({ isOpen: false });
            return;
          }

          // 1. Borrar primero las actas asociadas para garantizar cascada
          await supabase.from('actas_examen_alumnos').delete().eq('mesa_id', m.id);
          
          // 2. Borrar la mesa
          const { error } = await supabase.from('mesas_examen').delete().eq('id', m.id);
          if (error) throw error;

          toast.success('Mesa de examen y actas eliminadas en cascada.');
          setMesas(prev => prev.filter(x => x.id !== m.id));
          setConfirmModal({ isOpen: false });
        } catch (err) {
          handleAppError(err, 'SupportHubModal / Eliminar mesa');
          setConfirmModal(prev => ({ ...prev, loading: false }));
        }
      }
    });
  };

  // Opciones de Cátedras para CustomSelect
  const catedraOptions = useMemo(() => {
    return [
      { value: 'all', label: 'Todas las materias' },
      ...catedras.map(c => ({
        value: c.id,
        label: c.nombre
      }))
    ];
  }, [catedras]);

  // Filtrado de alumnos en pestaña Alumnos (Por cátedra y por búsqueda de texto)
  const filteredAlumnos = useMemo(() => {
    let list = alumnos;
    if (selectedCatedraAlumnos && selectedCatedraAlumnos !== 'all') {
      list = list.filter(a => {
        if (Array.isArray(a.inscripciones) && a.inscripciones.length > 0) {
          return a.inscripciones.some(i => i.catedras?.id === selectedCatedraAlumnos);
        }
        if (Array.isArray(a.catedra_ids)) {
          return a.catedra_ids.includes(selectedCatedraAlumnos);
        }
        if (Array.isArray(a.catedras)) {
          const catObj = catedras.find(c => c.id === selectedCatedraAlumnos);
          return catObj && a.catedras.includes(catObj.nombre);
        }
        return false;
      });
    }

    const q = studentSearch.toLowerCase().trim();
    if (!q) return list;
    return list.filter(a => 
      a.apellido?.toLowerCase().includes(q) ||
      a.nombre?.toLowerCase().includes(q) ||
      String(a.dni || '').includes(q)
    );
  }, [alumnos, selectedCatedraAlumnos, studentSearch, catedras]);

  // Evaluaciones filtradas por Cátedra y por Tipo
  const filteredEvaluaciones = useMemo(() => {
    return evaluaciones.filter(ev => {
      const matchCatedra = evalCatedraFilter === 'all' || ev.catedra_id === evalCatedraFilter || ev.catedras?.id === evalCatedraFilter;
      const matchTipo = evalTipoFilter === 'all' || ev.tipo === evalTipoFilter;
      return matchCatedra && matchTipo;
    });
  }, [evaluaciones, evalCatedraFilter, evalTipoFilter]);

  // Nómina de estudiantes matriculados en la cátedra de la evaluación que se audita
  const auditStudents = useMemo(() => {
    if (!selectedEvalAudit) return [];
    const targetCatId = selectedEvalAudit.catedra_id || selectedEvalAudit.catedras?.id;
    return alumnos.filter(a => {
      if (!targetCatId) return true;
      if (Array.isArray(a.inscripciones) && a.inscripciones.length > 0) {
        return a.inscripciones.some(i => i.catedras?.id === targetCatId);
      }
      if (Array.isArray(a.catedra_ids)) {
        return a.catedra_ids.includes(targetCatId);
      }
      if (Array.isArray(a.catedras)) {
        const catObj = catedras.find(c => c.id === targetCatId);
        return catObj && a.catedras.includes(catObj.nombre);
      }
      return true;
    });
  }, [selectedEvalAudit, alumnos, catedras]);

  // Iniciar edición puntual de calificación como Superadmin
  const handleOpenEditGrade = (estudiante, evaluacion) => {
    const existingNota = notas.find(
      n => n.evaluacion_id === evaluacion.id && n.estudiante_id === estudiante.id
    );
    setEditingGrade({
      isOpen: true,
      evaluacion,
      estudiante,
      valor: existingNota?.valor !== undefined && existingNota?.valor !== null ? String(existingNota.valor) : '',
      currentValor: existingNota?.valor ?? null
    });
  };

  // Confirmar y persistir modificación de nota en tabla 'notas'
  const handleSaveGradeConfirm = () => {
    const { evaluacion, estudiante, valor } = editingGrade;
    if (!evaluacion || !estudiante) return;

    if (!valor || valor.trim() === '') {
      toast.error('Por favor ingresa una calificación válida.');
      return;
    }

    const valNum = Number(valor);
    if (isNaN(valNum) || valNum < 1 || valNum > 10) {
      toast.error('La calificación debe ser un valor numérico entre 1.00 y 10.00.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: `¿Confirmar modificación de calificación?`,
      description: `Se actualizará la nota de ${estudiante.apellido}, ${estudiante.nombre} en "${evaluacion.titulo}" a ${valNum.toFixed(2)}. Esta acción se guardará directamente en la base de datos de notas del docente.`,
      variant: 'warning',
      confirmText: 'Guardar Calificación',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true }));
        try {
          if (isSupabaseConfigured && !isDemo && !String(evaluacion.id).startsWith('eva-')) {
            const { error } = await supabase
              .from('notas')
              .upsert({
                evaluacion_id: evaluacion.id,
                estudiante_id: estudiante.id,
                valor: valNum
              }, { onConflict: 'evaluacion_id,estudiante_id' });
            if (error) throw error;
          }

          // Actualizar estado local en tiempo real
          setNotas(prev => {
            const exists = prev.some(n => n.evaluacion_id === evaluacion.id && n.estudiante_id === estudiante.id);
            if (exists) {
              return prev.map(n => 
                (n.evaluacion_id === evaluacion.id && n.estudiante_id === estudiante.id)
                  ? { ...n, valor: valNum }
                  : n
              );
            } else {
              return [...prev, {
                id: `nota-${Date.now()}`,
                evaluacion_id: evaluacion.id,
                estudiante_id: estudiante.id,
                valor: valNum
              }];
            }
          });

          toast.success(`Calificación de ${estudiante.apellido} actualizada a ${valNum.toFixed(2)}.`);
          setEditingGrade({ isOpen: false, evaluacion: null, estudiante: null, valor: '', currentValor: null });
          setConfirmModal({ isOpen: false, loading: false });
        } catch (err) {
          handleAppError(err, 'SupportHubModal / Editar Calificación');
          setConfirmModal(prev => ({ ...prev, loading: false }));
        }
      }
    });
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const initials = teacher?.nombre
    ? teacher.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'DO';

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      {/* Fondo desenfocado backdrop-blur-sm */}
      <div 
        onClick={onClose}
        className="fixed inset-0"
        aria-hidden="true"
      />

      {/* MODAL CONTENEDOR RESPONSIVO */}
      <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-10 animate-scaleIn dark text-slate-100">
        
        {/* ========================================================
            1. CABECERA DE USUARIO (2 FILAS CLARAS)
           ======================================================== */}
        <div className="p-4 sm:p-5 border-b border-slate-700/80 bg-slate-800/60 backdrop-blur-xl flex flex-col gap-3 shrink-0">
          {/* Fila 1: Avatar, Nombre, Email a la izquierda; Botón accesible [ ✕ ] a la derecha */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-500/20 shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 truncate">
                  <h2 className="text-sm sm:text-base font-bold text-white truncate">
                    {teacher?.nombre || 'Docente'}
                  </h2>
                  <Badge variant={teacher?.rol === 'superadmin' ? 'primary' : 'default'} className="font-mono text-[10px] font-bold shrink-0">
                    {teacher?.rol?.toUpperCase() || 'DOCENTE'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 font-mono truncate">
                  {teacher?.email || 'Sin correo registrado'}
                </p>
              </div>
            </div>

            {/* Botón accesible [ ✕ ] de cierre (área de toque 44x44px) */}
            <button
              type="button"
              onClick={onClose}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              title="Cerrar modal de soporte"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Fila 2: Badge UUID con botón de copia rápida + selector de rol compacto */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-700/60">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 max-w-[210px] sm:max-w-xs">
              <span className="text-[10px] sm:text-xs font-mono text-slate-400 truncate">
                UUID: {teacher?.id}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="p-1 text-slate-400 hover:text-indigo-400 rounded transition-colors cursor-pointer shrink-0"
                title="Copiar ID de Supabase"
              >
                {copiedId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            <div className="flex items-center p-0.5 rounded-xl bg-slate-800 border border-slate-700/60">
              <button
                type="button"
                disabled={changingRole}
                onClick={() => handleRoleChange('docente')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  teacher?.rol !== 'superadmin'
                    ? 'bg-slate-700 text-white shadow-xs font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Docente
              </button>
              <button
                type="button"
                disabled={changingRole}
                onClick={() => handleRoleChange('superadmin')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  teacher?.rol === 'superadmin'
                    ? 'bg-gradient-to-r from-rose-500 to-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Superadmin</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================
            2. BARRA DE ACCIONES DE SUPERUSUARIO (LUCIDE SVG ONLY)
           ======================================================== */}
        <div className="p-3 sm:px-5 border-b border-slate-700/80 bg-slate-800/40 flex items-center justify-between gap-2.5 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 flex-1">
            <button
              type="button"
              onClick={handlePurgeOrphans}
              disabled={purging}
              className="bg-slate-800/80 border border-slate-700/80 rounded-xl py-2.5 px-3 text-xs font-medium hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{purging ? 'Purgando...' : 'Purgar Huérfanos'}</span>
            </button>

            <button
              type="button"
              onClick={handleInspectAsTeacher}
              className="bg-slate-800/80 border border-slate-700/80 rounded-xl py-2.5 px-3 text-xs font-medium hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Inspeccionar</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="bg-slate-800/80 border border-slate-700/80 rounded-xl py-2.5 px-3 text-xs font-medium hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Exportar JSON</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => loadTeacherData(teacher?.id)}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-700/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0 cursor-pointer"
            title="Recargar datos del docente"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* ========================================================
            3. PESTAÑAS DE NAVEGACIÓN
           ======================================================== */}
        <div className="flex items-center border-b border-slate-700/80 px-4 overflow-x-auto no-scrollbar gap-2 shrink-0 bg-slate-900/60">
          <button
            type="button"
            onClick={() => setActiveTab('catedras')}
            className={`whitespace-nowrap px-3.5 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'catedras'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>Cátedras ({catedras.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('alumnos')}
            className={`whitespace-nowrap px-3.5 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'alumnos'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Alumnos ({alumnos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('evaluaciones')}
            className={`whitespace-nowrap px-3.5 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'evaluaciones'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span>Evaluaciones y Notas ({evaluaciones.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clases')}
            className={`whitespace-nowrap px-3.5 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'clases'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4 shrink-0" />
            <span>Clases ({clases.length})</span>
          </button>

          {/* Pestaña: Mesas de Examen */}
          <button
            type="button"
            onClick={() => setActiveTab('mesas')}
            className={`whitespace-nowrap px-3.5 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'mesas'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookMarked className="w-4 h-4 shrink-0" />
            <span>🎓 Mesas de Examen ({mesas.length})</span>
          </button>
        </div>

        {/* ========================================================
            4. CONTENIDO DE LAS PESTAÑAS (TARJETAS TRUNCADAS ESTILIZADAS)
           ======================================================== */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin space-y-4">
          
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <>
              {/* PESTAÑA CÁTEDRAS */}
              {activeTab === 'catedras' && (
                <div className="space-y-2.5">
                  {catedras.length === 0 ? (
                    <EmptyState
                      icon={BookOpen}
                      title="Sin cátedras registradas"
                      description="El docente no tiene espacios curriculares asignados en este momento."
                    />
                  ) : (
                    catedras.map((cat) => (
                      <div
                        key={cat.id}
                        className={`flex items-center justify-between p-3.5 rounded-xl border gap-3 transition-colors ${
                          cat.isOrphan 
                            ? 'bg-amber-500/5 border-amber-500/30 dark:bg-amber-500/10' 
                            : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/80 dark:border-white/5 hover:border-indigo-500/30'
                        }`}
                      >
                        <div className="min-w-0 flex-1 truncate">
                          <div className="flex items-center gap-2 truncate">
                            <h4 className="text-xs sm:text-sm font-bold text-text-primary truncate">
                              {cat.nombre}
                            </h4>
                            {cat.isOrphan && (
                              <Badge variant="warning" className="text-[10px] font-mono shrink-0">
                                Huérfana
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-text-muted mt-1 truncate">
                            <span className="font-medium text-text-secondary">{cat.nivel || 'N/A'}</span>
                            <span>•</span>
                            <span>{cat.modalidad || 'ANUAL'}</span>
                            <span>•</span>
                            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{cat.estudiantes_count} alums</span>
                            <span>•</span>
                            <span className="truncate">{cat.institucion_nombre || 'Sin institución'}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteCatedra(cat)}
                          className="shrink-0 p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar cátedra"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* PESTAÑA ALUMNOS */}
              {activeTab === 'alumnos' && (
                <div className="space-y-3">
                  {/* Selector desplegable superior CustomSelect: Filtrar por Cátedra y Buscador */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                    <div className="w-full sm:w-64 shrink-0">
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                        Filtrar por Cátedra:
                      </label>
                      <CustomSelect
                        value={selectedCatedraAlumnos}
                        onChange={(val) => setSelectedCatedraAlumnos(val)}
                        options={catedraOptions}
                        placeholder="Todas las materias"
                        className="w-full"
                        buttonClassName="py-1.5 text-xs bg-slate-100/80 dark:bg-white/[0.04] border-slate-200/80 dark:border-white/10"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                        Buscar alumno:
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                          type="text"
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          placeholder="Buscar alumno por apellido, nombre o DNI..."
                          className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 text-text-primary focus:outline-none focus:border-indigo-600"
                        />
                        {studentSearch && (
                          <button
                            type="button"
                            onClick={() => setStudentSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Resumen de filtro de alumnos */}
                  <div className="flex items-center justify-between text-[11px] text-text-muted px-0.5">
                    <span>
                      Mostrando <b>{filteredAlumnos.length}</b> {filteredAlumnos.length === 1 ? 'estudiante' : 'estudiantes'}
                    </span>
                    {selectedCatedraAlumnos !== 'all' && (
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                        Cátedra: {catedras.find(c => c.id === selectedCatedraAlumnos)?.nombre || 'Seleccionada'}
                      </span>
                    )}
                  </div>

                  {filteredAlumnos.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title="Sin alumnos coincidentes"
                      description="No se encontraron estudiantes para los criterios ingresados."
                    />
                  ) : (
                    <div className="space-y-2.5">
                      {filteredAlumnos.map((alu) => {
                        const catList = Array.isArray(alu.catedras)
                          ? alu.catedras
                          : (alu.inscripciones || []).map(i => i.catedras?.nombre).filter(Boolean);

                        return (
                          <div
                            key={alu.id}
                            className="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/80 dark:border-white/5 gap-3"
                          >
                            <div className="min-w-0 flex-1 truncate">
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-xs sm:text-sm font-bold text-text-primary truncate">
                                  {alu.apellido}, {alu.nombre}
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-white/10 text-text-muted shrink-0">
                                  DNI {alu.dni || 'S/D'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 mt-1 truncate text-xs text-text-muted">
                                {catList.length > 0 ? (
                                  catList.map((cName, idx) => (
                                    <span key={idx} className="px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-medium truncate max-w-[140px]">
                                      {cName}
                                    </span>
                                  ))
                                ) : (
                                  <span className="italic text-text-muted text-[11px]">Sin cátedras activas</span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteAlumno(alu)}
                              className="shrink-0 p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar matrícula"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* PESTAÑA EVALUACIONES Y NOTAS */}
              {activeTab === 'evaluaciones' && (
                <div className="space-y-4">
                  {/* Filtros: Cátedra + Tipo */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-white/5">
                    <div className="w-full sm:w-60">
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                        Cátedra:
                      </label>
                      <CustomSelect
                        value={evalCatedraFilter}
                        onChange={(val) => {
                          setEvalCatedraFilter(val);
                          setSelectedEvalAudit(null);
                        }}
                        options={catedraOptions}
                        placeholder="Todas las materias"
                        className="w-full"
                        buttonClassName="py-1.5 text-xs bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-white/10"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                        Tipo de Evaluación:
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {['all', 'TP', 'PARCIAL', 'RECUPERATORIO'].map((tipo) => (
                          <button
                            key={tipo}
                            type="button"
                            onClick={() => {
                              setEvalTipoFilter(tipo);
                              setSelectedEvalAudit(null);
                            }}
                            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                              evalTipoFilter === tipo
                                ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                                : 'bg-white dark:bg-slate-800/80 text-text-secondary hover:text-text-primary border border-slate-200/60 dark:border-white/5'
                            }`}
                          >
                            {tipo === 'all' ? 'Todas' : tipo}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Subsección: Auditoría de Evaluaciones Registradas */}
                  {selectedEvalAudit && (
                    <div className="space-y-3 rounded-xl border-2 border-indigo-500/30 bg-indigo-50/20 dark:bg-indigo-950/10 p-4">
                      <div className="flex items-start justify-between gap-3 border-b border-indigo-200/50 dark:border-white/10 pb-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="primary" className="text-[10px] font-mono shrink-0 font-bold">
                              {selectedEvalAudit.tipo || 'EVAL'}
                            </Badge>
                            <h4 className="text-sm font-bold text-text-primary">
                              {selectedEvalAudit.titulo}
                            </h4>
                            <span className="text-xs text-text-muted font-mono">
                              • Entrega: {selectedEvalAudit.fecha_entrega ? formatFechaDMY(selectedEvalAudit.fecha_entrega) : 'S/F'}
                            </span>
                          </div>
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                            Cátedra: {selectedEvalAudit.catedras?.nombre || selectedEvalAudit.catedra_nombre || 'N/A'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedEvalAudit(null)}
                          className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-text-muted hover:text-text-primary cursor-pointer transition-colors shrink-0"
                        >
                          Cerrar Auditoría ✕
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-text-muted px-1">
                          <span className="font-semibold text-text-secondary">
                            Nómina de alumnos y calificaciones ({auditStudents.length})
                          </span>
                          <span className="text-[11px] italic">
                            Auditoría Superadmin: Edición directa con confirmación
                          </span>
                        </div>

                        {auditStudents.length === 0 ? (
                          <p className="text-xs text-text-muted italic py-3 text-center">
                            No hay alumnos matriculados en esta cátedra.
                          </p>
                        ) : (
                          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                            {auditStudents.map((alu) => {
                              const studentNota = notas.find(
                                n => n.evaluacion_id === selectedEvalAudit.id && n.estudiante_id === alu.id
                              );
                              const hasGrade = studentNota?.valor !== undefined && studentNota?.valor !== null;
                              const gradeNum = hasGrade ? Number(studentNota.valor) : null;
                              const isApproved = gradeNum !== null && gradeNum >= 6;

                              return (
                                <div
                                  key={alu.id}
                                  className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-800/70 border border-slate-200/70 dark:border-white/5 gap-2 hover:border-indigo-500/30 transition-colors"
                                >
                                  <div className="min-w-0 flex-1 truncate">
                                    <div className="flex items-center gap-2 truncate">
                                      <span className="text-xs font-bold text-text-primary truncate">
                                        {alu.apellido}, {alu.nombre}
                                      </span>
                                      <span className="text-[10px] font-mono text-text-muted px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 shrink-0">
                                        DNI {alu.dni || 'S/D'}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2.5 shrink-0">
                                    {hasGrade ? (
                                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                                        isApproved
                                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                      }`}>
                                        {gradeNum.toFixed(2)}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] font-mono text-text-muted px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                                        Sin calificar
                                      </span>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditGrade(alu, selectedEvalAudit)}
                                      className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium"
                                      title="Editar calificación numérica"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Editar</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Lista de Evaluaciones registradas */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                        Evaluaciones Registradas ({filteredEvaluaciones.length})
                      </h4>
                      <span className="text-[11px] text-text-muted">
                        Pulsa "Auditar" para ver las notas de cada alumno
                      </span>
                    </div>

                    {filteredEvaluaciones.length === 0 ? (
                      <EmptyState
                        icon={FileSpreadsheet}
                        title="Sin evaluaciones encontradas"
                        description="No se encontraron evaluaciones con los filtros seleccionados."
                      />
                    ) : (
                      <div className="space-y-2">
                        {filteredEvaluaciones.map((ev) => {
                          const evalGradesCount = notas.filter(n => n.evaluacion_id === ev.id).length;
                          const isAuditing = selectedEvalAudit?.id === ev.id;

                          return (
                            <div
                              key={ev.id}
                              className={`flex items-center justify-between p-3.5 rounded-xl border gap-3 transition-colors ${
                                isAuditing
                                  ? 'bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-500/40'
                                  : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/80 dark:border-white/5 hover:border-indigo-500/30'
                              }`}
                            >
                              <div className="min-w-0 flex-1 truncate">
                                <div className="flex items-center gap-2 truncate">
                                  <Badge variant="primary" className="text-[10px] font-mono shrink-0 font-bold">
                                    {ev.tipo || 'EVAL'}
                                  </Badge>
                                  <span className="text-xs sm:text-sm font-semibold text-text-primary truncate">
                                    {ev.titulo}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-text-muted mt-1 truncate">
                                  <span className="font-medium text-text-secondary truncate">
                                    {ev.catedras?.nombre || ev.catedra_nombre || 'Sin cátedra'}
                                  </span>
                                  <span>•</span>
                                  <span>{ev.fecha_entrega ? formatFechaDMY(ev.fecha_entrega) : 'Sin fecha'}</span>
                                  <span>•</span>
                                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                                    {evalGradesCount} notas
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setSelectedEvalAudit(isAuditing ? null : ev)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                                    isAuditing
                                      ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                                      : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-white/10 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                                  }`}
                                  title="Auditar evaluaciones y modificar calificaciones"
                                >
                                  <FileSpreadsheet className="w-3.5 h-3.5" />
                                  <span>{isAuditing ? 'Cerrar' : 'Auditar'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteEvaluacion(ev)}
                                  className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                                  title="Eliminar evaluación"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PESTAÑA CLASES */}
              {activeTab === 'clases' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                      Clases Dictadas ({clases.length})
                    </h4>
                  </div>

                  {clases.length === 0 ? (
                    <EmptyState
                      icon={GraduationCap}
                      title="Sin clases registradas"
                      description="El docente no ha registrado clases ni temas dictados todavía."
                    />
                  ) : (
                    <div className="space-y-2">
                      {clases.map((cla) => (
                        <div
                          key={cla.id}
                          className="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/80 dark:border-white/5 gap-3"
                        >
                          <div className="min-w-0 flex-1 truncate">
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                                {formatFechaDMY(cla.fecha)}
                              </span>
                              <span className="text-xs sm:text-sm font-medium text-text-primary truncate">
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
                            className="shrink-0 p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                            title="Depurar registro de clase"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================
                  PESTAÑA MESAS DE EXAMEN (SUPERADMIN CONTROL)
                 ======================================================== */}
              {activeTab === 'mesas' && (
                <div className="space-y-3">
                  {mesas.length === 0 ? (
                    <EmptyState
                      icon={BookMarked}
                      title="Sin mesas de examen registradas"
                      description="El docente no ha creado actas ni mesas de examen todavía."
                    />
                  ) : (
                    <div className="space-y-2.5">
                      {mesas.map((m) => {
                        const isPromo = m.condicion_acta === 'PROMOCIONAL';
                        const isLib = m.condicion_acta === 'LIBRE';

                        return (
                          <div
                            key={m.id}
                            className="p-3.5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/80 dark:border-white/5 space-y-2 hover:border-indigo-500/30 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge 
                                    variant={isPromo ? 'promo' : isLib ? 'libre' : 'regular'}
                                    className="text-[10px] font-bold uppercase font-mono"
                                  >
                                    {isPromo ? '🎖️ PROMOCIONAL' : isLib ? '🔓 LIBRE' : '📋 REGULAR'}
                                  </Badge>

                                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {formatFechaDMY(m.fecha)} • {m.turno_llamado}
                                  </span>

                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-white/10 text-text-muted">
                                    {m.inscriptos_count} alumnos inscriptos
                                  </span>
                                </div>

                                <h4 className="text-xs sm:text-sm font-bold text-text-primary mt-1 truncate">
                                  Cátedra: {m.catedras?.nombre || 'Cátedra'}
                                </h4>

                                <div className="text-[11px] text-text-muted flex items-center gap-2 flex-wrap mt-0.5">
                                  <span>Tribunal: <b>{m.presidente || 'Docente Titular'}</b> (Pres.)</span>
                                  <span>•</span>
                                  <span>V1: <b>{m.vocal1 || '—'}</b></span>
                                  <span>•</span>
                                  <span>V2: <b>{m.vocal2 || '—'}</b></span>
                                  <span>•</span>
                                  <span>Libro: <b>{m.libro || '—'}</b> / Folio: <b>{m.folio || '—'}</b></span>
                                </div>
                              </div>

                              {/* Acciones Superadmin: Editar y Eliminar */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditMesa(m)}
                                  className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors cursor-pointer"
                                  title="Editar parámetros de la mesa de examen"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteMesa(m)}
                                  className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                                  title="Eliminar mesa y actas asociadas en cascada"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal / Formulario de Edición de Mesa (Superadmin) */}
        {editingMesa && (
          <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-30 p-5 flex flex-col justify-between overflow-y-auto animate-fadeIn">
            <div className="space-y-4 max-w-lg mx-auto w-full">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-bold text-sm text-text-primary">Editar Mesa de Examen</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingMesa(null)}
                  className="p-1 rounded-lg text-text-muted hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-text-secondary block mb-1">Fecha de Examen</label>
                  <input
                    type="date"
                    value={editForm.fecha}
                    onChange={(e) => setEditForm(prev => ({ ...prev, fecha: e.target.value }))}
                    className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div>
                  <label className="font-bold text-text-secondary block mb-1">Turno / Llamado</label>
                  <input
                    type="text"
                    value={editForm.turno_llamado}
                    onChange={(e) => setEditForm(prev => ({ ...prev, turno_llamado: e.target.value }))}
                    placeholder="Ej: 1° LLAMADO JULIO"
                    className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div>
                  <label className="font-bold text-text-secondary block mb-1">Condición del Acta</label>
                  <select
                    value={editForm.condicion_acta}
                    onChange={(e) => setEditForm(prev => ({ ...prev, condicion_acta: e.target.value }))}
                    className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <option value="REGULAR">REGULAR</option>
                    <option value="PROMOCIONAL">PROMOCIONAL</option>
                    <option value="LIBRE">LIBRE</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-text-secondary block mb-1">Presidente de Mesa</label>
                  <input
                    type="text"
                    value={editForm.presidente}
                    onChange={(e) => setEditForm(prev => ({ ...prev, presidente: e.target.value }))}
                    placeholder="Nombre del docente titular"
                    className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div>
                  <label className="font-bold text-text-secondary block mb-1">Vocal 1</label>
                  <input
                    type="text"
                    value={editForm.vocal1}
                    onChange={(e) => setEditForm(prev => ({ ...prev, vocal1: e.target.value }))}
                    placeholder="Docente Vocal 1"
                    className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div>
                  <label className="font-bold text-text-secondary block mb-1">Vocal 2</label>
                  <input
                    type="text"
                    value={editForm.vocal2}
                    onChange={(e) => setEditForm(prev => ({ ...prev, vocal2: e.target.value }))}
                    placeholder="Docente Vocal 2"
                    className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div>
                  <label className="font-bold text-text-secondary block mb-1">Libro Matriz</label>
                  <input
                    type="text"
                    value={editForm.libro}
                    onChange={(e) => setEditForm(prev => ({ ...prev, libro: e.target.value }))}
                    placeholder="Ej: L-14"
                    className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                <div>
                  <label className="font-bold text-text-secondary block mb-1">Folio</label>
                  <input
                    type="text"
                    value={editForm.folio}
                    onChange={(e) => setEditForm(prev => ({ ...prev, folio: e.target.value }))}
                    placeholder="Ej: 82"
                    className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80 dark:border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingMesa(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  loading={savingEditMesa}
                  onClick={handleSaveEditMesa}
                >
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal / Formulario de Edición Puntual de Calificación (Superadmin) */}
        {editingGrade.isOpen && (
          <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-30 p-5 flex flex-col justify-center items-center overflow-y-auto animate-fadeIn">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-bold text-sm text-text-primary">Editar Calificación (Superadmin)</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingGrade({ isOpen: false, evaluacion: null, estudiante: null, valor: '', currentValor: null })}
                  className="p-1 rounded-lg text-text-muted hover:text-text-primary cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 space-y-1">
                  <div className="text-text-secondary">
                    <b>Estudiante:</b> {editingGrade.estudiante?.apellido}, {editingGrade.estudiante?.nombre}
                  </div>
                  <div className="text-text-secondary truncate">
                    <b>Evaluación:</b> {editingGrade.evaluacion?.titulo} ({editingGrade.evaluacion?.tipo})
                  </div>
                  <div className="text-text-muted text-[11px]">
                    <b>Calificación actual:</b> {editingGrade.currentValor !== null ? `${Number(editingGrade.currentValor).toFixed(2)}` : 'Sin calificar'}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-text-secondary block mb-1">
                    Nueva Calificación Numérica (1.00 a 10.00):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max="10"
                    autoFocus
                    value={editingGrade.valor}
                    onChange={(e) => setEditingGrade(prev => ({ ...prev, valor: e.target.value }))}
                    placeholder="Ej: 8.50"
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-text-primary text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                  <p className="text-[11px] text-text-muted mt-1">
                    Ingresa una nota decimal o entera válida entre 1.00 y 10.00.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80 dark:border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingGrade({ isOpen: false, evaluacion: null, estudiante: null, valor: '', currentValor: null })}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSaveGradeConfirm}
                >
                  Guardar Calificación
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmación Destructiva / Crítica */}
        <ConfirmDialog
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          description={confirmModal.description}
          confirmText={confirmModal.confirmText || "Confirmar Eliminación"}
          cancelText={confirmModal.cancelText || "Cancelar"}
          variant={confirmModal.variant || "danger"}
          loading={confirmModal.loading}
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal({ isOpen: false })}
        />
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
