import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Download, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  GraduationCap, 
  FileSpreadsheet,
  Award,
  LayoutGrid,
  Table as TableIcon,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Percent,
  Calendar,
  Upload,
  FileText, 
  Paperclip, 
  X, 
  Clock,
  ExternalLink,
  Link as LinkIcon,
  Trash2,
  ListChecks,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';
import Modal from '../common/Modal';
import CustomSelect from '../common/CustomSelect';
import EmptyState from '../common/EmptyState';
import { SkeletonTable } from '../common/SkeletonLoader';
import { calcularCondicionFinal, calcularPorcentajeAsistencia } from '../../lib/academicLogic';
import { exportGradesToExcel, exportGradesToCsv } from '../../lib/excel';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { formatFechaDMY, parseDMYtoYMD } from '../../lib/dateUtils';
import { useAuth } from '../../context/AuthContext';

export default function GradesTab({
  catedraId,
  catedraName,
  academicLevel = 'TERCIARIO',
  modalidad = 'ANUAL'
}) {
  const { user, isDemo } = useAuth();

  const [estudiantes, setEstudiantes] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [notas, setNotas] = useState([]);
  const [clases, setClases] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [inasistenciasDocente, setInasistenciasDocente] = useState([]);
  const [flashingGradeKey, setFlashingGradeKey] = useState(null);
  const [criterios, setCriterios] = useState({
    min_asist_promo: 80,
    min_asist_reg: 70,
    nota_min_promo: 7,
    nota_min_reg: 4,
    nota_min_sec: 6
  });
  const [loading, setLoading] = useState(true);

  // Mobile View mode: 'table' | 'cards' | 'evaluaciones'
  // Default to cards on mobile screens (< 768px)
  const [viewMode, setViewMode] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'table';
  });

  // Expandable accordions for student cards in mobile mode
  const [expandedStudents, setExpandedStudents] = useState({});

  const toggleStudentAccordion = (studentId) => {
    setExpandedStudents((prev) => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const expandAllStudents = () => {
    const all = {};
    estudiantes.forEach((e) => { all[e.id] = true; });
    setExpandedStudents(all);
  };

  const collapseAllStudents = () => {
    setExpandedStudents({});
  };

  // Auto-switch to cards on mobile screens (< 768px)
  useEffect(() => {
    if (window.innerWidth < 768) {
      setViewMode('cards');
    }
  }, []);

  // Modals state
  const [isNewEvalModalOpen, setIsNewEvalModalOpen] = useState(false);
  const [isEditNotaModalOpen, setIsEditNotaModalOpen] = useState(false);
  const [selectedStudentForNota, setSelectedStudentForNota] = useState(null);
  const [selectedEvalForNota, setSelectedEvalForNota] = useState(null);
  const [inputNotaValor, setInputNotaValor] = useState('');
  const [savingNota, setSavingNota] = useState(false);

  // New Eval form
  const [evalTitulo, setEvalTitulo] = useState('');
  const [evalTipo, setEvalTipo] = useState(academicLevel === 'SECUNDARIO' ? 'PRUEBA' : 'PARCIAL');
  const [evalPeriodoId, setEvalPeriodoId] = useState('');
  const [periodos, setPeriodos] = useState([]);
  const [evalOrigenId, setEvalOrigenId] = useState('');
  const [evalFechaEntrega, setEvalFechaEntrega] = useState('');
  const [evalDriveUrl, setEvalDriveUrl] = useState('');
  const [savingEval, setSavingEval] = useState(false);

  // Edit Eval form state
  const [isEditEvalModalOpen, setIsEditEvalModalOpen] = useState(false);
  const [editingEval, setEditingEval] = useState(null);
  const [editEvalTitulo, setEditEvalTitulo] = useState('');
  const [editEvalTipo, setEditEvalTipo] = useState('PARCIAL');
  const [editEvalFechaEntrega, setEditEvalFechaEntrega] = useState('');
  const [editEvalDriveUrl, setEditEvalDriveUrl] = useState('');
  const [savingEditEval, setSavingEditEval] = useState(false);

  // Batch Grade state
  const [isBatchGradeModalOpen, setIsBatchGradeModalOpen] = useState(false);
  const [targetEvalForBatch, setTargetEvalForBatch] = useState(null);
  const [batchGradesMap, setBatchGradesMap] = useState({});
  const [savingBatchGrades, setSavingBatchGrades] = useState(false);

  useEffect(() => {
    fetchData();
  }, [catedraId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        // 1. Estudiantes
        const { data: inscData } = await supabase
          .from('inscripciones')
          .select(`
            estudiante_id,
            estudiantes (
              id,
              dni,
              apellido,
              nombre
            )
          `)
          .eq('catedra_id', catedraId);

        const estList = (inscData || []).map(i => i.estudiantes).filter(Boolean);
        estList.sort((a, b) => a.apellido.localeCompare(b.apellido));

        // 2. Evaluaciones (con fusión resiliente de almacenamiento local)
        const { data: evalData } = await supabase
          .from('evaluaciones')
          .select('*')
          .eq('catedra_id', catedraId)
          .order('created_at', { ascending: true });

        const localKey = `evaluaciones_${catedraId}`;
        let localEvals = [];
        try {
          localEvals = JSON.parse(localStorage.getItem(localKey) || '[]');
        } catch {
          localEvals = [];
        }

        const combinedMap = new Map();
        // Cargar registros remotos
        (evalData || []).forEach(e => combinedMap.set(e.id, e));
        // Preservar registros locales que aún no hayan impactado en la base de datos
        localEvals.forEach(localEv => {
          if (!combinedMap.has(localEv.id)) {
            const match = (evalData || []).find(e => 
              e.titulo?.trim().toLowerCase() === localEv.titulo?.trim().toLowerCase() &&
              String(e.catedra_id) === String(localEv.catedra_id)
            );
            if (!match) {
              combinedMap.set(localEv.id, localEv);
            }
          }
        });

        const mergedEvals = Array.from(combinedMap.values());
        localStorage.setItem(localKey, JSON.stringify(mergedEvals));

        // 3. Notas
        const evalIds = mergedEvals.map(e => e.id);
        let notasList = [];
        if (evalIds.length > 0) {
          const { data: nData } = await supabase
            .from('notas')
            .select('*')
            .in('evaluacion_id', evalIds.filter(id => !String(id).startsWith('eval-')));
          notasList = nData || [];
        }

        // 4. Clases & Asistencias
        const { data: cData } = await supabase
          .from('clases')
          .select('*')
          .eq('catedra_id', catedraId);

        let asistList = [];
        if ((cData || []).length > 0) {
          const { data: aData } = await supabase
            .from('asistencias')
            .select('*')
            .in('clase_id', cData.map(c => c.id));
          asistList = aData || [];
        }

        // 5. Inasistencias Docente
        const { data: inasistData } = await supabase
          .from('inasistencias_docente')
          .select('*')
          .eq('catedra_id', catedraId);

        // 6. Criterios
        const { data: critData } = await supabase
          .from('criterios_evaluacion')
          .select('*')
          .eq('catedra_id', catedraId)
          .maybeSingle();

        // 7. Períodos Académicos del ciclo de la cátedra
        try {
          const { data: catInfo } = await supabase
            .from('catedras')
            .select('ciclo_id')
            .eq('id', catedraId)
            .maybeSingle();

          if (catInfo?.ciclo_id) {
            const { data: pData } = await supabase
              .from('periodos_academicos')
              .select('*')
              .eq('ciclo_id', catInfo.ciclo_id)
              .order('fecha_inicio', { ascending: true });
            setPeriodos(pData || []);
          }
        } catch (perErr) {
          console.warn('Aviso cargando periodos en calificaciones:', perErr);
        }

        setEstudiantes(estList);
        setEvaluaciones(mergedEvals);
        setNotas(notasList);
        setClases(cData || []);
        setAsistencias(asistList);
        setInasistenciasDocente(inasistData || []);
        if (critData) {
          setCriterios({
            min_asist_promo: Number(critData.min_asist_promo) || 80,
            min_asist_reg: Number(critData.min_asist_reg) || 70,
            nota_min_promo: Number(critData.nota_min_promo) || 7,
            nota_min_reg: Number(critData.nota_min_reg) || 4,
            nota_min_sec: Number(critData.nota_min_sec) || 6
          });
        }
      } else {
        // Demo mode fallback
        const storedEst = localStorage.getItem(`estudiantes_${catedraId}`);
        const storedEval = localStorage.getItem(`evaluaciones_${catedraId}`);
        const storedNotas = localStorage.getItem(`notas_${catedraId}`);
        const storedClases = localStorage.getItem(`clases_${catedraId}`);
        const storedAsist = localStorage.getItem(`asistencias_${catedraId}`);

        let estList = storedEst ? JSON.parse(storedEst) : [
          { id: 'est-1', dni: '40111222', apellido: 'Álvarez', nombre: 'Martín' },
          { id: 'est-2', dni: '39444555', apellido: 'Benítez', nombre: 'Lucía' },
          { id: 'est-3', dni: '41888999', apellido: 'Castillo', nombre: 'Ignacio' },
          { id: 'est-4', dni: '38222333', apellido: 'Domínguez', nombre: 'Valentina' },
          { id: 'est-5', dni: '42333444', apellido: 'Fernández', nombre: 'Santiago' }
        ];

        let evalList = storedEval ? JSON.parse(storedEval) : [
          { id: 'eval-1', catedra_id: catedraId, titulo: 'TP N° 1 - Arquitectura', tipo: 'TP' },
          { id: 'eval-2', catedra_id: catedraId, titulo: 'Parcial 1', tipo: 'PARCIAL' },
          { id: 'eval-3', catedra_id: catedraId, titulo: 'Recuperatorio Parcial 1', tipo: 'RECUPERATORIO', evaluacion_origen_id: 'eval-2' },
          { id: 'eval-4', catedra_id: catedraId, titulo: 'Parcial 2', tipo: 'PARCIAL' }
        ];

        let notasList = storedNotas ? JSON.parse(storedNotas) : [
          { evaluacion_id: 'eval-1', estudiante_id: 'est-1', valor: 9 },
          { evaluacion_id: 'eval-2', estudiante_id: 'est-1', valor: 8 },
          { evaluacion_id: 'eval-4', estudiante_id: 'est-1', valor: 7.5 },
          { evaluacion_id: 'eval-1', estudiante_id: 'est-2', valor: 8 },
          { evaluacion_id: 'eval-2', estudiante_id: 'est-2', valor: 4 },
          { evaluacion_id: 'eval-3', estudiante_id: 'est-2', valor: 8 },
          { evaluacion_id: 'eval-4', estudiante_id: 'est-2', valor: 7 },
          { evaluacion_id: 'eval-1', estudiante_id: 'est-3', valor: 7 },
          { evaluacion_id: 'eval-2', estudiante_id: 'est-3', valor: 6 },
          { evaluacion_id: 'eval-4', estudiante_id: 'est-3', valor: 6 },
          { evaluacion_id: 'eval-1', estudiante_id: 'est-4', valor: 6 },
          { evaluacion_id: 'eval-2', estudiante_id: 'est-4', valor: 2 },
          { evaluacion_id: 'eval-4', estudiante_id: 'est-4', valor: 4 },
          { evaluacion_id: 'eval-1', estudiante_id: 'est-5', valor: 10 },
          { evaluacion_id: 'eval-2', estudiante_id: 'est-5', valor: 9 },
          { evaluacion_id: 'eval-4', estudiante_id: 'est-5', valor: 9 }
        ];

        let cls = storedClases ? JSON.parse(storedClases) : [
          { id: 'clase-1', catedra_id: catedraId, fecha: '2026-03-02', tema: 'Clase 1' },
          { id: 'clase-2', catedra_id: catedraId, fecha: '2026-03-09', tema: 'Clase 2' }
        ];

        let asist = storedAsist ? JSON.parse(storedAsist) : [
          { clase_id: 'clase-1', estudiante_id: 'est-1', estado: 'PRESENTE' },
          { clase_id: 'clase-1', estudiante_id: 'est-2', estado: 'PRESENTE' },
          { clase_id: 'clase-1', estudiante_id: 'est-3', estado: 'PRESENTE' },
          { clase_id: 'clase-1', estudiante_id: 'est-4', estado: 'AUSENTE' },
          { clase_id: 'clase-1', estudiante_id: 'est-5', estado: 'PRESENTE' },
          { clase_id: 'clase-2', estudiante_id: 'est-1', estado: 'PRESENTE' },
          { clase_id: 'clase-2', estudiante_id: 'est-2', estado: 'AUSENTE' },
          { clase_id: 'clase-2', estudiante_id: 'est-3', estado: 'PRESENTE' },
          { clase_id: 'clase-2', estudiante_id: 'est-4', estado: 'PRESENTE' },
          { clase_id: 'clase-2', estudiante_id: 'est-5', estado: 'PRESENTE' }
        ];

        setEstudiantes(estList);
        setEvaluaciones(evalList);
        setNotas(notasList);
        setClases(cls);
        setAsistencias(asist);

        const storedInasist = localStorage.getItem(`inasistencias_docente_${catedraId}`);
        setInasistenciasDocente(storedInasist ? JSON.parse(storedInasist) : []);

        localStorage.setItem(`evaluaciones_${catedraId}`, JSON.stringify(evalList));
        localStorage.setItem(`notas_${catedraId}`, JSON.stringify(notasList));
      }
    } catch (err) {
      console.error('Error fetching grades data:', err);
      toast.error('No se pudieron cargar las calificaciones.');
    } finally {
      setLoading(false);
    }
  };

  const getNotaValue = (estudianteId, evaluacionId) => {
    const record = notas.find(
      n => n.estudiante_id === estudianteId && n.evaluacion_id === evaluacionId
    );
    return record?.valor !== undefined && record?.valor !== null ? Number(record.valor) : null;
  };

  const handleOpenEditNota = (estudiante, evaluacion) => {
    setSelectedStudentForNota(estudiante);
    setSelectedEvalForNota(evaluacion);
    const actual = getNotaValue(estudiante.id, evaluacion.id);
    setInputNotaValor(actual !== null ? String(actual) : '');
    setIsEditNotaModalOpen(true);
  };

  const handleDeleteNota = async () => {
    if (!selectedStudentForNota || !selectedEvalForNota) return;

    setSavingNota(true);
    try {
      if (isSupabaseConfigured && !isDemo && !String(selectedEvalForNota.id).startsWith('eval-')) {
        const { error } = await supabase
          .from('notas')
          .delete()
          .match({
            evaluacion_id: selectedEvalForNota.id,
            estudiante_id: selectedStudentForNota.id
          });
        if (error) throw error;
      }

      const updated = notas.filter(
        n => !(n.evaluacion_id === selectedEvalForNota.id && n.estudiante_id === selectedStudentForNota.id)
      );
      setNotas(updated);
      localStorage.setItem(`notas_${catedraId}`, JSON.stringify(updated));

      toast.success(`Calificación eliminada para ${selectedStudentForNota.apellido}.`);
      setIsEditNotaModalOpen(false);
    } catch (err) {
      console.error('Error al eliminar nota:', err);
      toast.error('Error al eliminar la calificación: ' + err.message);
    } finally {
      setSavingNota(false);
    }
  };

  const handleSaveNotaSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudentForNota || !selectedEvalForNota) return;

    // Si el docente deja el campo vacío, se interpreta como borrar la nota
    if (!inputNotaValor || inputNotaValor.trim() === '') {
      await handleDeleteNota();
      return;
    }

    const valNum = Number(inputNotaValor);
    if (isNaN(valNum) || valNum < 1 || valNum > 10) {
      toast.error('La calificación debe ser un valor numérico entre 1 y 10.');
      return;
    }

    setSavingNota(true);
    try {
      if (isSupabaseConfigured && !isDemo && !String(selectedEvalForNota.id).startsWith('eval-')) {
        const { error } = await supabase
          .from('notas')
          .upsert({
            evaluacion_id: selectedEvalForNota.id,
            estudiante_id: selectedStudentForNota.id,
            valor: valNum
          }, { onConflict: 'evaluacion_id, estudiante_id' });

        if (error) throw error;
      }

      // Local update
      const filtered = notas.filter(
        n => !(n.evaluacion_id === selectedEvalForNota.id && n.estudiante_id === selectedStudentForNota.id)
      );
      const updated = [...filtered, {
        evaluacion_id: selectedEvalForNota.id,
        estudiante_id: selectedStudentForNota.id,
        valor: valNum
      }];
      setNotas(updated);
      localStorage.setItem(`notas_${catedraId}`, JSON.stringify(updated));

      toast.success(`Nota de ${selectedStudentForNota.apellido} actualizada a ${valNum}`);
      setFlashingGradeKey(`${selectedStudentForNota.id}_${selectedEvalForNota.id}`);
      setTimeout(() => setFlashingGradeKey(null), 1200);
      setIsEditNotaModalOpen(false);
    } catch (err) {
      console.error('Error al guardar nota:', err);
      toast.error('Error al guardar la calificación: ' + err.message);
    } finally {
      setSavingNota(false);
    }
  };

  const handleCreateEvaluacion = async (e) => {
    e.preventDefault();
    if (!evalTitulo.trim()) return;

    setSavingEval(true);
    try {
      let archivoUrl = evalDriveUrl.trim() || null;
      let archivoNombre = archivoUrl ? 'Consignas en Google Drive' : null;

      // Si se proporcionó enlace a Google Drive, sincronizarlo también en la tabla 'recursos'
      if (archivoUrl) {
        try {
          const recCategory = evalTipo === 'PARCIAL' ? 'PARCIAL' : 'TP';
          const newRec = {
            catedra_id: catedraId,
            categoria: recCategory,
            tipo_origen: 'GOOGLE_LINK',
            titulo: `${evalTitulo.trim()} — Consignas Drive`,
            url_o_path: archivoUrl,
            created_at: new Date().toISOString()
          };
          if (isSupabaseConfigured && !isDemo) {
            await supabase.from('recursos').insert(newRec);
          } else {
            const prevRec = JSON.parse(localStorage.getItem(`recursos_${catedraId}`) || '[]');
            localStorage.setItem(`recursos_${catedraId}`, JSON.stringify([{ ...newRec, id: 'rec-' + Date.now() }, ...prevRec]));
          }
        } catch (recErr) {
          console.warn('Aviso al sincronizar con repositorio:', recErr);
        }
      }

      const isoFechaEntrega = evalFechaEntrega ? parseDMYtoYMD(evalFechaEntrega) : null;
      const localId = 'eval-' + Date.now();

      const newEvalObj = {
        id: localId,
        catedra_id: catedraId,
        periodo_id: evalPeriodoId || null,
        titulo: evalTitulo.trim(),
        tipo: evalTipo,
        evaluacion_origen_id: evalTipo === 'RECUPERATORIO' && evalOrigenId ? evalOrigenId : null,
        fecha_entrega: isoFechaEntrega,
        archivo_url: archivoUrl,
        archivo_nombre: archivoNombre,
        created_at: new Date().toISOString()
      };

      // 1. Guardar de forma inmediata y síncrona en estado y localStorage
      const updatedList = [...evaluaciones, newEvalObj];
      setEvaluaciones(updatedList);
      localStorage.setItem(`evaluaciones_${catedraId}`, JSON.stringify(updatedList));

      // 2. Intentar guardar y sincronizar con Supabase si está disponible
      if (isSupabaseConfigured && !isDemo) {
        try {
          const insertPayload = {
            catedra_id: catedraId,
            periodo_id: evalPeriodoId || null,
            titulo: newEvalObj.titulo,
            tipo: newEvalObj.tipo,
            evaluacion_origen_id: newEvalObj.evaluacion_origen_id,
            fecha_entrega: newEvalObj.fecha_entrega,
            archivo_url: newEvalObj.archivo_url,
            archivo_nombre: newEvalObj.archivo_nombre
          };

          const { data, error } = await supabase
            .from('evaluaciones')
            .insert(insertPayload)
            .select()
            .single();

          if (error) {
            // Si la tabla no tiene las columnas extendidas
            if (error.message && (error.message.includes('column') || error.message.includes('fecha_entrega') || error.message.includes('archivo_url') || error.message.includes('periodo_id'))) {
              const baseObj = {
                catedra_id: catedraId,
                periodo_id: evalPeriodoId || null,
                titulo: newEvalObj.titulo,
                tipo: newEvalObj.tipo,
                evaluacion_origen_id: newEvalObj.evaluacion_origen_id
              };
              const fallbackRes = await supabase
                .from('evaluaciones')
                .insert(baseObj)
                .select()
                .single();

              if (!fallbackRes.error && fallbackRes.data) {
                const synced = {
                  ...fallbackRes.data,
                  fecha_entrega: isoFechaEntrega,
                  archivo_url: archivoUrl,
                  archivo_nombre: archivoNombre
                };
                const refreshed = updatedList.map(e => e.id === localId ? synced : e);
                setEvaluaciones(refreshed);
                localStorage.setItem(`evaluaciones_${catedraId}`, JSON.stringify(refreshed));
              }
            } else {
              console.warn('Evaluación guardada localmente. Aviso Supabase:', error.message);
            }
          } else if (data) {
            const refreshed = updatedList.map(e => e.id === localId ? data : e);
            setEvaluaciones(refreshed);
            localStorage.setItem(`evaluaciones_${catedraId}`, JSON.stringify(refreshed));
          }
        } catch (dbErr) {
          console.warn('Evaluación preservada localmente. Error de red/DB:', dbErr);
        }
      }

      toast.success(`Evaluación "${evalTitulo}" guardada correctamente.`);
      setIsNewEvalModalOpen(false);
      setEvalTitulo('');
      setEvalPeriodoId('');
      setEvalOrigenId('');
      setEvalFechaEntrega('');
      setEvalDriveUrl('');
    } catch (err) {
      toast.error('Error al crear evaluación: ' + err.message);
    } finally {
      setSavingEval(false);
    }
  };

  // Eliminar Evaluación con borrado en cascada de sus notas asociadas
  const handleDeleteEvaluacion = async (evaluacionId, evalTitulo) => {
    const isConfirmed = window.confirm(
      `¿Estás seguro de eliminar la evaluación "${evalTitulo}"?\n\nEsta acción también eliminará todas las notas y recuperatorios asociados.`
    );
    if (!isConfirmed) return;

    try {
      // Si tiene recuperatorios vinculados, incluirlos en la eliminación
      const linkedRecups = evaluaciones.filter(e => e.evaluacion_origen_id === evaluacionId);
      const allIdsToDelete = [evaluacionId, ...linkedRecups.map(r => r.id)];

      // 1. Supabase deletion si está conectado
      if (isSupabaseConfigured && !isDemo) {
        const realIds = allIdsToDelete.filter(id => !String(id).startsWith('eval-'));
        if (realIds.length > 0) {
          await supabase.from('notas').delete().in('evaluacion_id', realIds);
          await supabase.from('evaluaciones').delete().in('id', realIds);
        }
      }

      // 2. Actualización local
      const updatedEvaluaciones = evaluaciones.filter(e => !allIdsToDelete.includes(e.id));
      const updatedNotas = notas.filter(n => !allIdsToDelete.includes(n.evaluacion_id));

      setEvaluaciones(updatedEvaluaciones);
      setNotas(updatedNotas);

      localStorage.setItem(`evaluaciones_${catedraId}`, JSON.stringify(updatedEvaluaciones));
      localStorage.setItem(`notas_${catedraId}`, JSON.stringify(updatedNotas));

      toast.success(`Evaluación "${evalTitulo}" eliminada correctamente.`);
    } catch (err) {
      console.error('Error al eliminar evaluación:', err);
      toast.error('Error al eliminar la evaluación: ' + err.message);
    }
  };

  // Abrir Modal de Edición de Evaluación
  const handleOpenEditEvaluacion = (ev) => {
    setEditingEval(ev);
    setEditEvalTitulo(ev.titulo || '');
    setEditEvalTipo(ev.tipo || 'PARCIAL');
    setEditEvalFechaEntrega(ev.fecha_entrega ? ev.fecha_entrega.split('T')[0] : '');
    setEditEvalDriveUrl(ev.archivo_url || '');
    setIsEditEvalModalOpen(true);
  };

  // Guardar Edición de Evaluación
  const handleSaveEditEvaluacion = async (e) => {
    e.preventDefault();
    if (!editingEval || !editEvalTitulo.trim()) return;

    setSavingEditEval(true);
    try {
      const isoFechaEntrega = editEvalFechaEntrega ? parseDMYtoYMD(editEvalFechaEntrega) : null;
      const driveUrl = editEvalDriveUrl.trim() || null;
      const driveNombre = driveUrl ? 'Consignas en Google Drive' : null;

      const updatedObj = {
        ...editingEval,
        titulo: editEvalTitulo.trim(),
        tipo: editEvalTipo,
        fecha_entrega: isoFechaEntrega,
        archivo_url: driveUrl,
        archivo_nombre: driveNombre,
        updated_at: new Date().toISOString()
      };

      if (isSupabaseConfigured && !isDemo && !String(editingEval.id).startsWith('eval-')) {
        try {
          const { error } = await supabase
            .from('evaluaciones')
            .update({
              titulo: updatedObj.titulo,
              tipo: updatedObj.tipo,
              fecha_entrega: updatedObj.fecha_entrega,
              archivo_url: updatedObj.archivo_url,
              archivo_nombre: updatedObj.archivo_nombre
            })
            .eq('id', editingEval.id);

          if (error) {
            // Fallback en caso de que la tabla remota no tenga columnas extendidas
            await supabase
              .from('evaluaciones')
              .update({
                titulo: updatedObj.titulo,
                tipo: updatedObj.tipo
              })
              .eq('id', editingEval.id);
          }
        } catch (dbErr) {
          console.warn('Evaluación actualizada localmente. Aviso Supabase:', dbErr);
        }
      }

      const updatedList = evaluaciones.map(ev => ev.id === editingEval.id ? updatedObj : ev);
      setEvaluaciones(updatedList);
      localStorage.setItem(`evaluaciones_${catedraId}`, JSON.stringify(updatedList));

      toast.success(`Evaluación "${updatedObj.titulo}" actualizada correctamente.`);
      setIsEditEvalModalOpen(false);
      setEditingEval(null);
    } catch (err) {
      toast.error('Error al actualizar evaluación: ' + err.message);
    } finally {
      setSavingEditEval(false);
    }
  };

  // Calificación rápida masiva por evaluación ("Calificar Curso")
  const handleOpenBatchGrade = (evaluacion) => {
    setTargetEvalForBatch(evaluacion);
    const initialMap = {};
    estudiantes.forEach(est => {
      const v = getNotaValue(est.id, evaluacion.id);
      initialMap[est.id] = v !== null ? String(v) : '';
    });
    setBatchGradesMap(initialMap);
    setIsBatchGradeModalOpen(true);
  };

  const handleSaveBatchGrades = async (e) => {
    e.preventDefault();
    if (!targetEvalForBatch) return;

    setSavingBatchGrades(true);
    try {
      const evalId = targetEvalForBatch.id;
      const newNotas = [...notas.filter(n => n.evaluacion_id !== evalId)];
      const upsertsSupabase = [];
      const deletesEstIds = [];

      for (const est of estudiantes) {
        const rawVal = batchGradesMap[est.id]?.trim();
        if (!rawVal) {
          deletesEstIds.push(est.id);
        } else {
          const num = Number(rawVal);
          if (isNaN(num) || num < 1 || num > 10) {
            toast.error(`Nota inválida para ${est.apellido} (${rawVal}). Debe estar entre 1 y 10.`);
            setSavingBatchGrades(false);
            return;
          }
          newNotas.push({
            evaluacion_id: evalId,
            estudiante_id: est.id,
            valor: num
          });
          upsertsSupabase.push({
            evaluacion_id: evalId,
            estudiante_id: est.id,
            valor: num
          });
        }
      }

      if (isSupabaseConfigured && !isDemo && !String(evalId).startsWith('eval-')) {
        if (upsertsSupabase.length > 0) {
          const { error: upsertErr } = await supabase
            .from('notas')
            .upsert(upsertsSupabase, { onConflict: 'evaluacion_id,estudiante_id' });
          if (upsertErr) throw upsertErr;
        }
        if (deletesEstIds.length > 0) {
          const { error: delErr } = await supabase
            .from('notas')
            .delete()
            .eq('evaluacion_id', evalId)
            .in('estudiante_id', deletesEstIds);
          if (delErr) throw delErr;
        }
      }

      setNotas(newNotas);
      localStorage.setItem(`notas_${catedraId}`, JSON.stringify(newNotas));

      toast.success(`Calificaciones de "${targetEvalForBatch.titulo}" guardadas con éxito.`);
      setIsBatchGradeModalOpen(false);
      setTargetEvalForBatch(null);
    } catch (err) {
      console.error('Error guardando calificaciones masivas:', err);
      toast.error('Error al guardar calificaciones: ' + err.message);
    } finally {
      setSavingBatchGrades(false);
    }
  };

  // Build matrix data
  const mainEvaluations = evaluaciones.filter(e => e.tipo !== 'RECUPERATORIO');

  const matrixData = estudiantes.map(est => {
    const studentAsistencias = asistencias.filter(a => a.estudiante_id === est.id);
    const asistPct = calcularPorcentajeAsistencia(
      studentAsistencias, 
      clases.length, 
      inasistenciasDocente.length
    );

    // Collect student notes
    const studentNotas = [];
    evaluaciones.forEach(ev => {
      const v = getNotaValue(est.id, ev.id);
      if (v !== null) {
        studentNotas.push({
          evaluacion_id: ev.id,
          valor: v,
          tipo: ev.tipo,
          evaluacion_origen_id: ev.evaluacion_origen_id
        });
      }
    });

    const cond = calcularCondicionFinal(
      academicLevel,
      modalidad,
      asistPct,
      evaluaciones,
      studentNotas,
      criterios
    );

    return {
      estudiante: est,
      asistenciaPct: asistPct,
      condicion: cond
    };
  });

  const handleExportExcel = () => {
    try {
      exportGradesToExcel(
        { nombre: catedraName, nivel: academicLevel, modalidad },
        estudiantes,
        evaluaciones,
        notas,
        matrixData.map(m => ({ estudianteId: m.estudiante.id, asistenciaPct: m.asistenciaPct, condicion: m.condicion }))
      );
      toast.success('Archivo Excel (.xlsx) generado correctamente.');
    } catch (err) {
      toast.error('Error al exportar Excel: ' + err.message);
    }
  };

  const handleExportCsv = () => {
    try {
      exportGradesToCsv(
        { nombre: catedraName, nivel: academicLevel, modalidad },
        estudiantes,
        evaluaciones,
        notas,
        matrixData.map(m => ({ estudianteId: m.estudiante.id, asistenciaPct: m.asistenciaPct, condicion: m.condicion }))
      );
      toast.success('Archivo CSV (.csv) generado correctamente.');
    } catch (err) {
      toast.error('Error al exportar CSV: ' + err.message);
    }
  };

  const getCondBadgeVariant = (cond) => {
    switch (cond) {
      case 'PROMOCIONAL': return 'promo';
      case 'REGULAR': return 'regular';
      case 'LIBRE': return 'libre';
      case 'APROBADO': return 'promo';
      case 'DESAPROBADO': return 'libre';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="py-6 space-y-4">
        <SkeletonTable rows={6} cols={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12 sm:pb-0">
      {/* Top Action & View Switcher Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-4 rounded-2xl border border-surface-border shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-text-primary">
            Sábana de Calificaciones & Condición Final
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Recuperatorios exhibidos junto al parcial original sin sobreescribir la nota.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          {/* Mobile View Toggle */}
          <div className="inline-flex rounded-xl bg-surface-hover p-1 border border-surface-border">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all touch-target-44 ${
                viewMode === 'table'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Vista de tabla tradicional con columna fija"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Tabla</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all touch-target-44 ${
                viewMode === 'cards'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Vista de tarjetas individuales por estudiante"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Tarjetas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('evaluaciones')}
              className={`p-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all touch-target-44 ${
                viewMode === 'evaluaciones'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Ver y gestionar listado de evaluaciones, TPs y parciales"
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Evaluaciones</span>
              <span className="xs:hidden">Evals</span>
              <span className="font-mono text-[11px] opacity-80">({evaluaciones.length})</span>
            </button>
          </div>

          {/* Exportación: Excel & CSV */}
          <div className="inline-flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              icon={FileSpreadsheet}
              onClick={handleExportExcel}
              disabled={estudiantes.length === 0}
              className="text-xs"
              title="Descargar sábana completa en Excel (.xlsx)"
            >
              <span className="hidden md:inline">Exportar </span>Excel
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={FileText}
              onClick={handleExportCsv}
              disabled={estudiantes.length === 0}
              className="text-xs"
              title="Descargar calificaciones en CSV (.csv)"
            >
              CSV
            </Button>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsNewEvalModalOpen(true)}
            className="text-xs"
          >
            Nueva Eval.
          </Button>
        </div>
      </div>

      {/* Main Content: Evaluaciones List View vs Table View vs Student Cards View */}
      {viewMode === 'evaluaciones' ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-primary" />
                <span>Listado de Evaluaciones & Trabajos Prácticos ({evaluaciones.length})</span>
              </h4>
              <p className="text-xs text-text-muted">
                Supervisa fechas de entrega, consignas en Google Drive, califica alumnos o elimina registros.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setIsNewEvalModalOpen(true)}
              className="text-xs self-start sm:self-auto"
            >
              Nueva Evaluación
            </Button>
          </div>

          {evaluaciones.length === 0 ? (
            <EmptyState
              illustration="folder"
              title="No hay evaluaciones registradas en esta cátedra"
              description="Crea Trabajos Prácticos, Parciales o Recuperatorios para comenzar a calificar a tus alumnos."
              actionLabel="Crear Primera Evaluación"
              actionIcon={Plus}
              onAction={() => setIsNewEvalModalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {evaluaciones.map(ev => {
                const isRecup = ev.tipo === 'RECUPERATORIO';
                const parentEval = isRecup && ev.evaluacion_origen_id 
                  ? evaluaciones.find(p => p.id === ev.evaluacion_origen_id) 
                  : null;

                // Calificaciones stats
                const validNotas = estudiantes
                  .map(est => getNotaValue(est.id, ev.id))
                  .filter(v => v !== null);
                const gradedCount = validNotas.length;
                const totalStudents = estudiantes.length;
                const gradedPct = totalStudents > 0 ? Math.round((gradedCount / totalStudents) * 100) : 0;
                const avgNota = validNotas.length > 0 
                  ? (validNotas.reduce((a, b) => a + b, 0) / validNotas.length).toFixed(1) 
                  : null;

                return (
                  <Card key={ev.id} className="p-4 sm:p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
                    <div className="space-y-3">
                      {/* Header Badge & Quick Actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-bold ${
                            ev.tipo === 'PARCIAL' 
                              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20' 
                              : ev.tipo === 'TP'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                              : ev.tipo === 'RECUPERATORIO'
                              ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20'
                              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                          }`}>
                            {ev.tipo}
                          </span>
                          {parentEval && (
                            <span className="text-[10px] text-text-muted truncate max-w-[130px]" title={`Recuperatorio de: ${parentEval.titulo}`}>
                              de {parentEval.titulo}
                            </span>
                          )}
                        </div>

                        {/* Quick Action Icons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditEvaluacion(ev)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-amber-600 hover:bg-surface-hover transition-colors touch-target-44"
                            title="Editar título, fecha o enlace de Drive"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvaluacion(ev.id, ev.titulo)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors touch-target-44"
                            title="Eliminar esta evaluación y todas sus notas"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="text-base font-bold text-text-primary leading-snug">
                        {ev.titulo}
                      </h4>

                      {/* Metadata: Fecha de Entrega y Enlace Drive */}
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 text-text-muted">
                          <Clock className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                          {ev.fecha_entrega ? (
                            <span className="font-mono">
                              Entrega: <strong className="text-text-primary">{formatFechaDMY(ev.fecha_entrega)}</strong>
                            </span>
                          ) : (
                            <span className="italic text-[11px]">Sin fecha límite de entrega</span>
                          )}
                        </div>

                        {ev.archivo_url ? (
                          <div className="pt-0.5">
                            <a
                              href={ev.archivo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 border border-amber-500/20 transition-colors max-w-full"
                              title="Abrir consignas en Google Drive"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{ev.archivo_nombre || 'Consignas en Google Drive'}</span>
                            </a>
                          </div>
                        ) : (
                          <div className="text-[11px] text-text-muted italic flex items-center gap-1">
                            <LinkIcon className="w-3 h-3 opacity-40" />
                            <span>Sin consignas enlazadas a Drive</span>
                          </div>
                        )}
                      </div>

                      {/* Calificaciones stats bar */}
                      <div className="pt-2 border-t border-surface-border">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-text-muted font-medium">
                            Calificados: <strong className="text-text-primary font-mono">{gradedCount} / {totalStudents}</strong>
                          </span>
                          <span className="font-mono text-xs font-bold text-primary">
                            {gradedPct}%
                          </span>
                        </div>
                        <div className="w-full bg-surface-hover rounded-full h-2 overflow-hidden mb-2">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${gradedPct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-text-muted">
                          <span>Promedio curso:</span>
                          {avgNota !== null ? (
                            <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-xs ${
                              Number(avgNota) >= 7
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : Number(avgNota) >= 4
                                ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                            }`}>
                              {avgNota}
                            </span>
                          ) : (
                            <span className="italic">Pendiente de notas</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-border">
                      <Button
                        variant="primary"
                        size="sm"
                        icon={ListChecks}
                        onClick={() => handleOpenBatchGrade(ev)}
                        disabled={estudiantes.length === 0}
                        className="text-xs justify-center"
                        title="Cargar o modificar notas para todos los alumnos"
                      >
                        Calificar Curso
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={Edit3}
                        onClick={() => handleOpenEditEvaluacion(ev)}
                        className="text-xs justify-center"
                      >
                        Editar Datos
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : estudiantes.length === 0 ? (
        <EmptyState
          illustration="folder"
          title="No hay estudiantes inscriptos en esta cátedra"
          description="Ve a la pestaña &quot;Cargar Alumnos (Excel)&quot; para importar la nómina de estudiantes."
        />
      ) : viewMode === 'cards' ? (
        /* Mobile-First Student Cards View with Accordion */
        <div className="space-y-4">
          {/* Quick Actions Bar for Cards View */}
          <div className="flex items-center justify-between px-1 py-1">
            <span className="text-xs font-semibold text-text-muted">
              {matrixData.length} estudiante{matrixData.length !== 1 ? 's' : ''} en nómina
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={expandAllStudents}
                className="text-xs font-semibold text-primary hover:underline px-2 py-1"
              >
                Expandir todos
              </button>
              <span className="text-text-muted">•</span>
              <button
                type="button"
                onClick={collapseAllStudents}
                className="text-xs font-semibold text-text-muted hover:text-text-primary px-2 py-1"
              >
                Colapsar todos
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matrixData.map((item, idx) => {
              const est = item.estudiante;
              const initials = `${est.nombre?.[0] || ''}${est.apellido?.[0] || ''}`.toUpperCase();
              const isExpanded = !!expandedStudents[est.id];

              // Count how many evaluations have grades
              const gradedCount = mainEvaluations.filter(ev => getNotaValue(est.id, ev.id) !== null).length;

              return (
                <Card key={est.id} className="p-4 sm:p-5 flex flex-col justify-between space-y-4 border border-surface-border hover:shadow-md transition-all">
                  {/* Student Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-text-primary leading-tight">
                          {est.apellido}, {est.nombre}
                        </h4>
                        <span className="text-[11px] font-mono text-text-muted">
                          DNI: {est.dni}
                        </span>
                      </div>
                    </div>

                    {/* Condition Badge */}
                    <Badge variant={getCondBadgeVariant(item.condicion.condicion)}>
                      {item.condicion.condicion}
                    </Badge>
                  </div>

                  {/* Attendance Mini Bar */}
                  <div className="bg-surface-hover/60 p-2.5 rounded-xl border border-surface-border">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-text-muted font-medium flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5" /> Asistencia
                      </span>
                      <span className={`font-mono font-bold ${
                        item.asistenciaPct < 70 ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {item.asistenciaPct}%
                      </span>
                    </div>
                    <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.asistenciaPct < 70 ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, item.asistenciaPct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Accordion Trigger for Evaluations */}
                  <button
                    type="button"
                    onClick={() => toggleStudentAccordion(est.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-surface-hover hover:bg-surface-hover/80 border border-surface-border transition-colors touch-target-44 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold text-text-primary">
                        Evaluaciones ({mainEvaluations.length})
                      </span>
                      <span className="text-[11px] font-mono text-text-muted">
                        • {gradedCount}/{mainEvaluations.length} calificados
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-text-muted transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-primary' : ''
                      }`}
                    />
                  </button>

                  {/* Accordion Content: Vertical Rows for Evaluations */}
                  {isExpanded && (
                    <div className="space-y-2.5 pt-1 border-t border-surface-border animate-fadeIn">
                      {mainEvaluations.length === 0 ? (
                        <p className="text-xs text-text-muted text-center py-2 italic">
                          No hay evaluaciones cargadas en esta cátedra.
                        </p>
                      ) : (
                        mainEvaluations.map(ev => {
                          const recup = evaluaciones.find(r => r.tipo === 'RECUPERATORIO' && r.evaluacion_origen_id === ev.id);
                          const notaOriginal = getNotaValue(est.id, ev.id);
                          const notaRecup = recup ? getNotaValue(est.id, recup.id) : null;

                          return (
                            <div
                              key={ev.id}
                              className="p-3 rounded-xl bg-surface-hover/50 border border-surface-border/80 flex flex-col gap-2"
                            >
                              {/* Evaluation Info */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold text-text-primary">
                                      {ev.titulo}
                                    </span>
                                    <span className="text-[10px] font-mono uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                                      {ev.tipo}
                                    </span>
                                  </div>

                                  {ev.fecha_entrega && (
                                    <div className="text-[11px] font-mono text-text-muted flex items-center gap-1 mt-1">
                                      <Clock className="w-3 h-3 text-primary/70 shrink-0" />
                                      <span>Entrega: {formatFechaDMY(ev.fecha_entrega)}</span>
                                    </div>
                                  )}

                                  {ev.archivo_url && (
                                    <a
                                      href={ev.archivo_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 mt-1 font-semibold"
                                    >
                                      <ExternalLink className="w-3 h-3 shrink-0" />
                                      <span className="truncate max-w-[180px]">{ev.archivo_nombre || 'Drive Consignas TP'}</span>
                                    </a>
                                  )}
                                </div>
                              </div>

                              {/* Touch Action Buttons for Grades (min 44x44px ergonomic) */}
                              <div className="flex items-center gap-2 pt-1 border-t border-surface-border/40">
                                <div className="flex-1">
                                  <span className="text-[10px] text-text-muted block font-semibold mb-1">
                                    Nota {ev.tipo === 'PARCIAL' ? 'Parcial' : 'Eval'}:
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditNota(est, ev)}
                                    className={`w-full min-h-[44px] px-3 py-2 rounded-xl text-sm font-mono font-bold transition-all border touch-target-44 flex items-center justify-center gap-2 active:scale-95 duration-100 ${
                                      flashingGradeKey === `${est.id}_${ev.id}` ? 'animate-flash-success' : ''
                                    } ${
                                      notaOriginal !== null
                                        ? notaOriginal >= 7
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                                          : notaOriginal >= 4
                                          ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                                          : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300'
                                        : 'bg-surface hover:bg-surface-hover text-text-muted border-dashed border-surface-border hover:border-primary/50'
                                    }`}
                                  >
                                    <Edit3 className="w-3.5 h-3.5 opacity-60" />
                                    <span>{notaOriginal !== null ? notaOriginal : 'Sin nota — Calificar'}</span>
                                  </button>
                                </div>

                                {recup && (
                                  <div className="flex-1">
                                    <span className="text-[10px] text-purple-600 dark:text-purple-400 block font-semibold mb-1">
                                      Recuperatorio:
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditNota(est, recup)}
                                      className={`w-full min-h-[44px] px-3 py-2 rounded-xl text-sm font-mono font-bold transition-all border touch-target-44 flex items-center justify-center gap-2 active:scale-95 duration-100 ${
                                        flashingGradeKey === `${est.id}_${recup.id}` ? 'animate-flash-success' : ''
                                      } ${
                                        notaRecup !== null
                                          ? 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300'
                                          : 'bg-purple-50/40 text-purple-400 border-dashed border-purple-200 dark:bg-purple-950/20'
                                      }`}
                                    >
                                      <Edit3 className="w-3.5 h-3.5 opacity-60" />
                                      <span>{notaRecup !== null ? `R: ${notaRecup}` : 'R: Sin nota'}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {item.condicion.motivo && (
                    <p className="text-[10px] text-text-muted pt-2 border-t border-surface-border">
                      {item.condicion.motivo}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        /* High-Density Panoramic Table View with sticky student column */
        <div className="bg-surface rounded-2xl border border-surface-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-surface-hover/80 text-text-secondary border-b border-surface-border">
                <tr>
                  <th className="hidden md:table-cell px-3 sm:px-4 py-3 text-center w-12 font-mono">#</th>
                  <th className="hidden md:table-cell px-3 sm:px-4 py-3 font-mono">DNI</th>
                  <th className="sticky left-0 z-20 bg-surface dark:bg-slate-900 px-3 sm:px-4 py-3 min-w-[160px] sm:min-w-[210px] border-r border-surface-border shadow-[2px_0_6px_-2px_rgba(0,0,0,0.1)] font-bold text-text-primary">
                    Estudiante
                  </th>
                  <th className="px-3 py-3 text-center w-24 font-mono">% Asist.</th>

                  {/* Main Evaluation Columns */}
                  {mainEvaluations.map(ev => {
                    const recup = evaluaciones.find(r => r.tipo === 'RECUPERATORIO' && r.evaluacion_origen_id === ev.id);
                    return (
                      <th key={ev.id} className="px-3 sm:px-4 py-3 text-center border-l border-surface-border min-w-[145px] align-top">
                        <div className="font-bold text-text-primary text-xs sm:text-sm truncate" title={ev.titulo}>
                          {ev.titulo}
                        </div>
                        <div className="flex items-center justify-center gap-1 mt-1 flex-wrap">
                          <span className="text-[10px] font-mono uppercase bg-primary/10 dark:bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">
                            {ev.tipo}
                          </span>
                          {recup && (
                            <span className="text-[10px] font-mono uppercase bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-bold">
                              +RECUP
                            </span>
                          )}
                        </div>

                        {/* Fecha de Entrega si existe */}
                        {ev.fecha_entrega && (
                          <div className="mt-1 flex items-center justify-center gap-1 text-[10px] font-mono text-text-muted" title={`Fecha límite de entrega: ${formatFechaDMY(ev.fecha_entrega)}`}>
                            <Clock className="w-3 h-3 text-primary/70 shrink-0" />
                            <span>Entrega: {formatFechaDMY(ev.fecha_entrega)}</span>
                          </div>
                        )}

                        {/* Enlace a Google Drive de TP si fue adjuntado */}
                        {ev.archivo_url && (
                          <div className="mt-1 flex items-center justify-center">
                            <a
                              href={ev.archivo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                              title={`Abrir consignas en Google Drive: ${ev.archivo_nombre || 'Google Drive'}`}
                            >
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate max-w-[85px]">{ev.archivo_nombre || 'Drive TP'}</span>
                            </a>
                          </div>
                        )}

                        {/* Botones de acción rápida en cabecera: Calificar, Editar, Borrar */}
                        <div className="flex items-center justify-center gap-1 mt-1.5 pt-1.5 border-t border-surface-border/60">
                          <button
                            type="button"
                            onClick={() => handleOpenBatchGrade(ev)}
                            title={`Calificar a todo el curso en "${ev.titulo}"`}
                            className="p-1 rounded-md text-text-muted hover:text-primary hover:bg-surface transition-colors"
                          >
                            <ListChecks className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditEvaluacion(ev)}
                            title={`Editar datos de "${ev.titulo}"`}
                            className="p-1 rounded-md text-text-muted hover:text-amber-600 hover:bg-surface transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvaluacion(ev.id, ev.titulo)}
                            title={`Eliminar "${ev.titulo}" y todas sus notas`}
                            className="p-1 rounded-md text-text-muted hover:text-rose-600 hover:bg-surface transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </th>
                    );
                  })}

                  <th className="px-4 py-3 text-center border-l border-surface-border min-w-[150px] bg-surface-hover/90 font-bold">
                    Condición Final
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-surface-border">
                {matrixData.map((item, idx) => {
                  const est = item.estudiante;
                  return (
                    <tr key={est.id} className="hover:bg-surface-hover/40 transition-colors">
                      <td className="hidden md:table-cell px-3 sm:px-4 py-3 text-center text-text-muted font-mono">{idx + 1}</td>
                      <td className="hidden md:table-cell px-3 sm:px-4 py-3 font-mono text-text-secondary">{est.dni}</td>
                      <td className="sticky left-0 z-10 bg-surface dark:bg-slate-900 px-3 sm:px-4 py-3 font-semibold text-text-primary whitespace-nowrap border-r border-surface-border shadow-[2px_0_6px_-2px_rgba(0,0,0,0.1)]">
                        <div className="font-semibold text-text-primary">
                          {est.apellido}, {est.nombre}
                        </div>
                        <div className="text-[10px] font-mono text-text-muted md:hidden">
                          DNI: {est.dni}
                        </div>
                      </td>

                      {/* Attendance % */}
                      <td className="px-3 py-3 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          item.asistenciaPct < 70 
                            ? 'bg-red-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300' 
                            : 'bg-green-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        }`}>
                          {item.asistenciaPct}%
                        </span>
                      </td>

                      {/* Main evaluations and linked recuperatorios */}
                      {mainEvaluations.map(ev => {
                        const recup = evaluaciones.find(r => r.tipo === 'RECUPERATORIO' && r.evaluacion_origen_id === ev.id);
                        const notaOriginal = getNotaValue(est.id, ev.id);
                        const notaRecup = recup ? getNotaValue(est.id, recup.id) : null;

                        return (
                          <td key={ev.id} className="px-3 sm:px-4 py-3 text-center border-l border-surface-border">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Original note button */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditNota(est, ev)}
                                title={`Editar nota de ${ev.titulo}`}
                                className={`min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border touch-target-44 flex items-center justify-center active:scale-95 duration-100 ${
                                  flashingGradeKey === `${est.id}_${ev.id}` ? 'animate-flash-success' : ''
                                } ${
                                  notaOriginal !== null
                                    ? notaOriginal >= 7
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                                      : notaOriginal >= 4
                                      ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-100'
                                      : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100'
                                    : 'bg-surface hover:bg-surface-hover text-text-muted border-dashed border-surface-border'
                                }`}
                              >
                                {notaOriginal !== null ? notaOriginal : '—'}
                              </button>

                              {/* Recuperatorio side-by-side if exists */}
                              {recup && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditNota(est, recup)}
                                  title={`Editar ${recup.titulo}`}
                                  className={`min-h-[44px] min-w-[44px] px-2 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border touch-target-44 flex items-center justify-center active:scale-95 duration-100 ${
                                    flashingGradeKey === `${est.id}_${recup.id}` ? 'animate-flash-success' : ''
                                  } ${
                                    notaRecup !== null
                                      ? notaRecup >= 4
                                        ? 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800 hover:bg-purple-100'
                                        : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100'
                                      : 'bg-purple-50/50 hover:bg-purple-100 text-purple-400 border-dashed border-purple-200 dark:bg-purple-950/20'
                                  }`}
                                >
                                  {notaRecup !== null ? `R:${notaRecup}` : 'R:—'}
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Final Condition Badge */}
                      <td className="px-4 py-3 text-center border-l border-surface-border bg-surface-hover/20">
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant={getCondBadgeVariant(item.condicion.condicion)}>
                            {item.condicion.condicion}
                          </Badge>
                          {item.condicion.motivo && (
                            <span className="text-[10px] text-text-muted truncate max-w-[130px]" title={item.condicion.motivo}>
                              {item.condicion.motivo}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal / Bottom Sheet Editar Nota */}
      <Modal
        isOpen={isEditNotaModalOpen}
        onClose={() => setIsEditNotaModalOpen(false)}
        title="Asignar Calificación"
        subtitle={selectedStudentForNota && selectedEvalForNota ? `${selectedStudentForNota.apellido}, ${selectedStudentForNota.nombre} • ${selectedEvalForNota.titulo}` : ''}
      >
        <form onSubmit={handleSaveNotaSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Calificación Numérica (1 a 10)
            </label>
            <input
              type="number"
              step="0.5"
              min="1"
              max="10"
              autoFocus
              placeholder="Ej: 7.5 (dejar vacío para borrar nota)"
              value={inputNotaValor}
              onChange={(e) => setInputNotaValor(e.target.value)}
              className="w-full px-3.5 py-3 text-lg font-mono font-bold border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
            <p className="text-[11px] text-text-muted mt-1.5">
              {selectedEvalForNota?.tipo === 'RECUPERATORIO' 
                ? 'Nota de examen recuperatorio: se conserva en paralelo sin sobreescribir la nota del examen original.' 
                : 'Escala numérica estándar reglamentaria de 1 a 10. Deja en blanco o presiona "Borrar Nota" para eliminarla.'}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-surface-border">
            <div>
              {selectedStudentForNota && selectedEvalForNota && getNotaValue(selectedStudentForNota.id, selectedEvalForNota.id) !== null && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={Trash2}
                  type="button"
                  onClick={handleDeleteNota}
                  loading={savingNota}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-xs"
                  title="Eliminar la calificación asignada a este estudiante"
                >
                  Borrar Nota
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setIsEditNotaModalOpen(false)} type="button">
                Cancelar
              </Button>
              <Button type="submit" loading={savingNota}>
                Guardar Nota
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal / Bottom Sheet Nueva Evaluación */}
      <Modal
        isOpen={isNewEvalModalOpen}
        onClose={() => setIsNewEvalModalOpen(false)}
        title="Crear Nueva Evaluación"
        subtitle="Registra un Parcial, Trabajo Práctico o Recuperatorio con fecha de entrega y consignas"
      >
        <form onSubmit={handleCreateEvaluacion} className="space-y-4">
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-xs text-text-secondary leading-relaxed flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>
              Puedes registrar la evaluación ahora y colocar el enlace a Google Drive de sus consignas. Se guardará de inmediato y no penalizará a los alumnos mientras esté en plazo.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Título o Nombre de la Evaluación *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: TP N° 1 - Modelado Relacional, Parcial 1..."
              value={evalTitulo}
              onChange={(e) => setEvalTitulo(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
                Tipo de Evaluación *
              </label>
              <CustomSelect
                value={evalTipo}
                onChange={(val) => setEvalTipo(typeof val === 'object' ? val.target.value : val)}
                options={[
                  { value: 'PARCIAL', label: 'Parcial (Instancia Mayor)', badge: 'Mayor' },
                  { value: 'TP', label: 'Trabajo Práctico Obligatorio', badge: 'TP' },
                  { value: 'PRUEBA', label: 'Prueba Escrita / Periódica', badge: 'Prueba' },
                  { value: 'RECUPERATORIO', label: 'Recuperatorio', badge: 'Recup' }
                ]}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase text-text-secondary">
                  Fecha de Entrega (Opcional)
                </label>
                {evalFechaEntrega && (
                  <span className="text-[10px] font-mono text-primary font-bold">
                    {formatFechaDMY(evalFechaEntrega)}
                  </span>
                )}
              </div>
              <input
                type="date"
                value={evalFechaEntrega}
                onChange={(e) => setEvalFechaEntrega(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
              />
            </div>
          </div>

          {periodos.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
                Período Académico (Opcional)
              </label>
              <CustomSelect
                value={evalPeriodoId}
                onChange={(val) => setEvalPeriodoId(typeof val === 'object' ? val.target.value : val)}
                options={[
                  { value: '', label: '-- General / Todo el Ciclo --' },
                  ...periodos.map(p => ({
                    value: p.id,
                    label: p.nombre || `Período ${p.numero}`
                  }))
                ]}
                placeholder="Seleccionar período académico..."
              />
            </div>
          )}

          {evalTipo === 'RECUPERATORIO' && (
            <div>
              <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
                Vincular al Parcial Original (Opcional)
              </label>
              <CustomSelect
                value={evalOrigenId}
                onChange={(val) => setEvalOrigenId(typeof val === 'object' ? val.target.value : val)}
                options={[
                  { value: '', label: '-- Sin vinculación directa --' },
                  ...evaluaciones.filter(e => e.tipo === 'PARCIAL' || e.tipo === 'PRUEBA').map(e => ({
                    value: e.id,
                    label: `${e.titulo} (${e.tipo})`
                  }))
                ]}
                placeholder="Seleccionar evaluación original..."
              />
            </div>
          )}

          {/* Enlace de Google Drive a Consignas / Trabajo Práctico */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase text-text-secondary">
                Enlace a Google Drive con Consignas / TP (Opcional)
              </label>
              <a
                href="https://drive.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Abrir Drive</span>
              </a>
            </div>
            <div className="relative">
              <input
                type="url"
                placeholder="https://drive.google.com/file/d/..."
                value={evalDriveUrl}
                onChange={(e) => setEvalDriveUrl(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
              />
              <LinkIcon className="w-4 h-4 text-text-muted absolute left-3 top-3" />
            </div>
            <p className="text-[11px] text-text-muted mt-1.5 leading-relaxed">
              Guarda tus consignas directamente en Google Drive sin ocupar cuota en Supabase y pega aquí el enlace compartido.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
            <Button
              variant="secondary"
              onClick={() => setIsNewEvalModalOpen(false)}
              type="button"
              disabled={savingEval}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={savingEval}>
              Guardar Evaluación
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Evaluación */}
      <Modal
        isOpen={isEditEvalModalOpen}
        onClose={() => {
          setIsEditEvalModalOpen(false);
          setEditingEval(null);
        }}
        title={`Editar: ${editingEval?.titulo || ''}`}
        subtitle="Modifica el título, tipo, fecha de entrega o consignas en Google Drive"
      >
        <form onSubmit={handleSaveEditEvaluacion} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Título de la Evaluación *
            </label>
            <input
              type="text"
              required
              value={editEvalTitulo}
              onChange={(e) => setEditEvalTitulo(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
                Tipo de Evaluación *
              </label>
              <CustomSelect
                value={editEvalTipo}
                onChange={(val) => setEditEvalTipo(typeof val === 'object' ? val.target.value : val)}
                options={[
                  { value: 'PARCIAL', label: 'Parcial (Instancia Mayor)', badge: 'Mayor' },
                  { value: 'TP', label: 'Trabajo Práctico Obligatorio', badge: 'TP' },
                  { value: 'PRUEBA', label: 'Prueba Escrita / Periódica', badge: 'Prueba' },
                  { value: 'RECUPERATORIO', label: 'Recuperatorio', badge: 'Recup' }
                ]}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase text-text-secondary">
                  Fecha de Entrega (Opcional)
                </label>
                {editEvalFechaEntrega && (
                  <span className="text-[10px] font-mono text-primary font-bold">
                    {formatFechaDMY(editEvalFechaEntrega)}
                  </span>
                )}
              </div>
              <input
                type="date"
                value={editEvalFechaEntrega}
                onChange={(e) => setEditEvalFechaEntrega(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
              />
            </div>
          </div>

          {/* Enlace de Google Drive a Consignas / Trabajo Práctico */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase text-text-secondary">
                Enlace a Google Drive con Consignas / TP (Opcional)
              </label>
              <a
                href="https://drive.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Abrir Drive</span>
              </a>
            </div>
            <div className="relative">
              <input
                type="url"
                placeholder="https://drive.google.com/file/d/..."
                value={editEvalDriveUrl}
                onChange={(e) => setEditEvalDriveUrl(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
              />
              <LinkIcon className="w-4 h-4 text-text-muted absolute left-3 top-3" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditEvalModalOpen(false);
                setEditingEval(null);
              }}
              type="button"
              disabled={savingEditEval}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={savingEditEval}>
              Guardar Cambios
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Calificar Curso Completo ("Batch Grading") */}
      <Modal
        isOpen={isBatchGradeModalOpen}
        onClose={() => {
          setIsBatchGradeModalOpen(false);
          setTargetEvalForBatch(null);
        }}
        title={`Calificar Curso: ${targetEvalForBatch?.titulo || ''}`}
        subtitle="Asigna o modifica notas numéricas (1 al 10). Deja el campo vacío para dejar al alumno sin calificación."
      >
        <form onSubmit={handleSaveBatchGrades} className="space-y-4">
          <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {estudiantes.map((est, idx) => {
              const currentVal = batchGradesMap[est.id] ?? '';
              return (
                <div
                  key={est.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-surface-hover/50 border border-surface-border"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-mono text-text-muted w-6 text-right shrink-0">
                      {idx + 1}.
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">
                        {est.apellido}, {est.nombre}
                      </p>
                      <p className="text-[11px] font-mono text-text-muted">
                        DNI: {est.dni}
                      </p>
                    </div>
                  </div>

                  <div className="w-24 shrink-0">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="10"
                      placeholder="—"
                      value={currentVal}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBatchGradesMap(prev => ({ ...prev, [est.id]: val }));
                      }}
                      className="w-full px-2.5 py-1.5 text-sm font-mono font-bold text-center border border-surface-border rounded-lg bg-surface text-text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-surface-border">
            <span className="text-xs text-text-muted">
              Total: <strong>{estudiantes.length} alumnos</strong>
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsBatchGradeModalOpen(false);
                  setTargetEvalForBatch(null);
                }}
                type="button"
                disabled={savingBatchGrades}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={savingBatchGrades}>
                Guardar Calificaciones
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
