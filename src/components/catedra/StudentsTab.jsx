import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  FileSpreadsheet, 
  Search, 
  Edit3, 
  UserMinus, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft,
  ArrowDownAZ,
  ArrowUpZA,
  ArrowUpDown,
  GraduationCap,
  FileText,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';
import Modal from '../common/Modal';
import CustomSelect from '../common/CustomSelect';
import EmptyState from '../common/EmptyState';
import ExpandableSearch from '../common/ExpandableSearch';
import { SkeletonTable } from '../common/SkeletonLoader';
import ExcelImporter from './ExcelImporter';
import EstudianteDetailModal from './EstudianteDetailModal';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { calcularCondicionFinal, calcularPorcentajeAsistencia } from '../../lib/academicLogic';
import RiskBadge from '../common/RiskBadge';
import ErrorBoundary from '../common/ErrorBoundary';
import { calculateStudentRisk } from '../../lib/earlyWarningLogic';
import { getEstudiantesCatedra } from '../../services/catedraEstudiantesService';
import { handleAppError } from '../../utils/handleAppError';
import { catedraCache } from '../../services/catedraCache';

/**
 * Normalización de texto reactiva:
 * - Insensible a mayúsculas/minúsculas (.toLowerCase())
 * - Remueve acentos, tildes y diacríticos (.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
 */
const normalizeSearchText = (str) => {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

/**
 * StudentRow - Fila de estudiante memoizada para la tabla de alumnos
 */
const StudentRow = React.memo(function StudentRow({
  st,
  cond,
  isAcreditado,
  notaFinal,
  risk,
  onOpenStudentDetail,
  onOpenEdit,
  onOpenDelete,
  getCondBadgeVariant
}) {
  return (
    <tr className="hover:bg-surface-hover/40 transition-colors group">
      {/* 1. DNI */}
      <td scope="row" className="px-4 py-3.5 font-mono tabular-nums font-medium text-text-secondary whitespace-nowrap">
        {st.dni || '-'}
      </td>

      {/* 2. Apellido */}
      <td className="px-4 py-3.5 font-bold text-text-primary whitespace-nowrap">
        <button
          type="button"
          onClick={() => onOpenStudentDetail(st)}
          className="text-left font-bold text-text-primary hover:text-primary transition-colors cursor-pointer"
          title="Ver ficha académica e historial de exámenes"
        >
          {st.apellido || '-'}
        </button>
      </td>

      {/* 3. Nombre */}
      <td className="px-4 py-3.5 text-text-primary whitespace-nowrap">
        <button
          type="button"
          onClick={() => onOpenStudentDetail(st)}
          className="text-left text-text-primary hover:text-primary transition-colors cursor-pointer"
          title="Ver ficha académica e historial de exámenes"
        >
          {st.nombre || '-'}
        </button>
      </td>

      {/* 4. Condición */}
      <td className="px-4 py-3.5 text-center whitespace-nowrap">
        <div className="flex items-center justify-center gap-1.5">
          {isAcreditado ? (
            <button
              type="button"
              onClick={() => onOpenStudentDetail(st)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all cursor-pointer shadow-2xs"
              title={`Materia Acreditada (Calificación Final: ${notaFinal ?? 'Aprobado'}). Clic para ver ficha`}
            >
              <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>🎓 Acreditado (Nota: {notaFinal ?? 'Aprobado'})</span>
            </button>
          ) : (
            <>
              <Badge variant={getCondBadgeVariant(cond)}>
                {cond}
              </Badge>
              <RiskBadge risk={risk} compact />
            </>
          )}
        </div>
      </td>

      {/* 5. Acciones */}
      <td className="px-4 py-3.5 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onOpenStudentDetail(st)}
            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface-hover transition-colors touch-target-44"
            title="Ver ficha del estudiante e historial de exámenes"
          >
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={() => onOpenEdit(st)}
            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface-hover transition-colors touch-target-44"
            title="Editar datos y condición del alumno"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onOpenDelete(st)}
            className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors touch-target-44"
            title="Dar de baja de la cátedra"
          >
            <UserMinus className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}, (prev, next) => {
  return (
    prev.st.id === next.st.id &&
    prev.st.dni === next.st.dni &&
    prev.st.apellido === next.st.apellido &&
    prev.st.nombre === next.st.nombre &&
    prev.cond === next.cond &&
    prev.isAcreditado === next.isAcreditado &&
    prev.notaFinal === next.notaFinal &&
    prev.risk === next.risk
  );
});

export default function StudentsTab({ 
  catedraId, 
  catedraName, 
  academicLevel = 'TERCIARIO', 
  modalidad = 'ANUAL',
  cicloId
}) {
  const { user, isDemo } = useAuth();
  const { activeCiclo } = useApp();

  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'import-excel'

  // Limpiar automáticamente el campo de búsqueda al cambiar de cátedra o ciclo lectivo
  useEffect(() => {
    setSearchQuery('');
  }, [catedraId, cicloId, activeCiclo?.id]);

  // Sorting state: 'apellido' | 'nombre' | 'dni' | 'condicion', 'asc' (A-Z) | 'desc' (Z-A)
  const [sortField, setSortField] = useState('apellido');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' = A-Z, 'desc' = Z-A
  const sortKey = sortField;
  const sortDir = sortDirection;

  // Academic data for condition calculation
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [notas, setNotas] = useState([]);
  const [clases, setClases] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [inasistenciasDocente, setInasistenciasDocente] = useState([]);
  const [criterios, setCriterios] = useState({
    min_asist_promo: 80,
    min_asist_reg: 70,
    nota_min_promo: 7,
    nota_min_reg: 4,
    nota_min_sec: 6
  });

  // Modal: Ficha del Estudiante e Historial de Exámenes
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleOpenStudentDetail = (student) => {
    setSelectedStudentForDetail(student);
    setIsDetailModalOpen(true);
  };

  // Modal: Carga Manual
  const [dniManual, setDniManual] = useState('');
  const [apellidoManual, setApellidoManual] = useState('');
  const [nombreManual, setNombreManual] = useState('');
  const [condicionManual, setCondicionManual] = useState('AUTO');
  const [savingManual, setSavingManual] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Modal: Editar Estudiante
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [dniEdit, setDniEdit] = useState('');
  const [apellidoEdit, setApellidoEdit] = useState('');
  const [nombreEdit, setNombreEdit] = useState('');
  const [condicionEdit, setCondicionEdit] = useState('AUTO');
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal: Confirmar Baja
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [catedraId]);

  async function fetchStudents(forceRefresh = false) {
    // 1. Verificación instantánea de caché en memoria de sesión
    if (!forceRefresh) {
      const cached = catedraCache.get(catedraId);
      if (cached && cached.estudiantes) {
        setEstudiantes(cached.estudiantes);
        if (cached.evaluaciones) setEvaluaciones(cached.evaluaciones);
        if (cached.clases) setClases(cached.clases);
        if (cached.inasistenciasDocente) setInasistenciasDocente(cached.inasistenciasDocente);
        if (cached.criterios) setCriterios(cached.criterios);
        if (cached.notas) setNotas(cached.notas);
        if (cached.asistencias) setAsistencias(cached.asistencias);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        // Round 1: Carga en paralelo de estudiantes, evaluaciones, clases, inasistencias y criterios con columnas proyectadas
        const [rawList, evalRes, clsRes, inasistRes, critRes] = await Promise.all([
          getEstudiantesCatedra(catedraId, { supabase, isDemo }),
          supabase
            .from('evaluaciones')
            .select('id, catedra_id, titulo, tipo, fecha, peso_porcentual, criterio_ponderacion, orden, evaluacion_origen_id')
            .eq('catedra_id', catedraId),
          supabase
            .from('clases')
            .select('id, catedra_id, fecha, tema')
            .eq('catedra_id', catedraId),
          supabase
            .from('inasistencias_docente')
            .select('id, catedra_id, fecha, motivo, articulo')
            .eq('catedra_id', catedraId),
          supabase
            .from('criterios_evaluacion')
            .select('min_asist_promo, min_asist_reg, nota_min_promo, nota_min_reg, nota_min_sec')
            .eq('catedra_id', catedraId)
            .maybeSingle()
        ]);

        const list = (rawList || []).map(ins => {
          const condicion = ins.condicion || ins.estado_academico || 'REGULAR';
          const notaFinal = ins.nota_final ?? ins.nota_final_acreditacion ?? null;
          const estado = ins.estado_academico ?? ins.condicion ?? 'CURSANDO';
          return {
            ...ins,
            condicion,
            nota_final: notaFinal,
            nota_final_acreditacion: notaFinal,
            estado_academico: estado
          };
        });

        const evList = evalRes.data || [];
        const cList = clsRes.data || [];
        const inasistList = inasistRes.data || [];
        let critData = null;
        if (critRes.data) {
          critData = {
            min_asist_promo: Number(critRes.data.min_asist_promo) || 80,
            min_asist_reg: Number(critRes.data.min_asist_reg) || 70,
            nota_min_promo: Number(critRes.data.nota_min_promo) || 7,
            nota_min_reg: Number(critRes.data.nota_min_reg) || 4,
            nota_min_sec: Number(critRes.data.nota_min_sec) || 6
          };
          setCriterios(critData);
        }

        setEstudiantes(list);
        setEvaluaciones(evList);
        setClases(cList);
        setInasistenciasDocente(inasistList);

        // Round 2: Carga en paralelo de Notas y Asistencias proyectadas sin select(*)
        const validEvalIds = evList.map(e => e.id).filter(id => !String(id).startsWith('eval-'));
        const validClaseIds = cList.map(c => c.id);

        const [notasRes, asistRes] = await Promise.all([
          validEvalIds.length > 0
            ? supabase.from('notas').select('id, evaluacion_id, estudiante_id, valor').in('evaluacion_id', validEvalIds)
            : Promise.resolve({ data: [] }),
          validClaseIds.length > 0
            ? supabase.from('asistencias').select('id, clase_id, estudiante_id, estado').in('clase_id', validClaseIds)
            : Promise.resolve({ data: [] })
        ]);

        const notasList = notasRes.data || [];
        const asistList = asistRes.data || [];

        setNotas(notasList);
        setAsistencias(asistList);

        // Sincronizar en memoria caché de sesión
        catedraCache.set(catedraId, {
          estudiantes: list,
          evaluaciones: evList,
          clases: cList,
          inasistenciasDocente: inasistList,
          criterios: critData,
          notas: notasList,
          asistencias: asistList
        });
      } else {
        const rawList = await getEstudiantesCatedra(catedraId, { supabase, isDemo });
        const list = (rawList || []).map(ins => ({
          ...ins,
          condicion: ins.condicion || ins.estado_academico || 'REGULAR',
          nota_final: ins.nota_final ?? ins.nota_final_acreditacion ?? null,
          nota_final_acreditacion: ins.nota_final ?? ins.nota_final_acreditacion ?? null,
          estado_academico: ins.estado_academico ?? ins.condicion ?? 'CURSANDO'
        }));
        setEstudiantes(list);

        const storedEval = localStorage.getItem(`evaluaciones_${catedraId}`);
        const storedNotas = localStorage.getItem(`notas_${catedraId}`);
        const storedClases = localStorage.getItem(`clases_${catedraId}`);
        const storedAsist = localStorage.getItem(`asistencias_${catedraId}`);
        const storedInasist = localStorage.getItem(`inasistencias_docente_${catedraId}`);

        const evList = storedEval ? JSON.parse(storedEval) : [];
        const nList = storedNotas ? JSON.parse(storedNotas) : [];
        const cList = storedClases ? JSON.parse(storedClases) : [];
        const aList = storedAsist ? JSON.parse(storedAsist) : [];
        const inList = storedInasist ? JSON.parse(storedInasist) : [];

        if (storedEval) setEvaluaciones(evList);
        if (storedNotas) setNotas(nList);
        if (storedClases) setClases(cList);
        if (storedAsist) setAsistencias(aList);
        if (storedInasist) setInasistenciasDocente(inList);

        catedraCache.set(catedraId, {
          estudiantes: list,
          evaluaciones: evList,
          clases: cList,
          inasistenciasDocente: inList,
          notas: nList,
          asistencias: aList
        });
      }
    } catch (err) {
      handleAppError(err, 'StudentsTab / Cargar Estudiantes', user);
    } finally {
      setLoading(false);
    }
  };

  // Mapa reactivo y memoizado de condiciones RAM por estudiante (evita recálculos O(N) en bucles)
  const studentConditionsMap = useMemo(() => {
    const map = new Map();
    (estudiantes || []).forEach(st => {
      if (!st?.id) return;
      if (st.estado_academico === 'ACREDITADO') {
        map.set(st.id, 'ACREDITADO');
        return;
      }

      // 1. Override manual
      const override = localStorage.getItem(`condicion_override_${catedraId}_${st.id}`);
      if (override && override !== 'AUTO') {
        map.set(st.id, override);
        return;
      }

      // 2. Cálculo dinámico
      const studentAsistencias = (asistencias || []).filter(a => a.estudiante_id === st.id);
      const asistPct = calcularPorcentajeAsistencia(
        studentAsistencias, 
        clases.length, 
        inasistenciasDocente.length
      );

      const studentNotas = [];
      (evaluaciones || []).forEach(ev => {
        const record = (notas || []).find(n => n.estudiante_id === st.id && n.evaluacion_id === ev.id);
        if (record?.valor !== undefined && record?.valor !== null) {
          studentNotas.push({
            evaluacion_id: ev.id,
            valor: Number(record.valor),
            tipo: ev.tipo,
            evaluacion_origen_id: ev.evaluacion_origen_id
          });
        }
      });

      const res = calcularCondicionFinal(
        academicLevel,
        modalidad,
        asistPct,
        evaluaciones,
        studentNotas,
        criterios
      );

      map.set(st.id, res?.condicion || 'REGULAR');
    });
    return map;
  }, [estudiantes, asistencias, clases.length, inasistenciasDocente.length, evaluaciones, notas, criterios, academicLevel, modalidad, catedraId]);

  // Obtener condición académica con acceso O(1)
  const getStudentCondition = (studentId) => {
    if (!studentId) return 'REGULAR';
    return studentConditionsMap.get(studentId) || 'REGULAR';
  };

  // Mapa reactivo del Semáforo de Riesgo por estudiante
  const studentRiskMap = useMemo(() => {
    const map = new Map();
    (estudiantes || []).forEach(st => {
      if (!st || !st.id) return;
      if (st.estado_academico === 'ACREDITADO') {
        map.set(st.id, { 
          level: 'OPTIMAL', 
          reasons: ['Materia Acreditada'], 
          badgeLabel: 'Acreditado', 
          colorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' 
        });
        return;
      }
      try {
        const risk = calculateStudentRisk(st.id, {
          asistencias,
          clases,
          inasistenciasDocente,
          evaluaciones,
          notas,
          criterios,
          academicLevel,
          modalidad
        });
        map.set(st.id, risk);
      } catch (e) {
        console.warn(`Aviso calculando semáforo para estudiante ${st.id}:`, e);
        map.set(st.id, { 
          level: 'OPTIMAL', 
          reasons: [], 
          badgeLabel: 'Regular', 
          colorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10' 
        });
      }
    });
    return map;
  }, [estudiantes, asistencias, clases, inasistenciasDocente, evaluaciones, notas, criterios, academicLevel, modalidad]);

  const getCondBadgeVariant = (cond) => {
    switch (cond) {
      case 'PROMOCIONAL': return 'promo';
      case 'REGULAR': return 'regular';
      case 'LIBRE': return 'libre';
      case 'APROBADO': return 'promo';
      case 'DESAPROBADO': return 'libre';
      case 'REINCORPORADO': return 'info';
      case 'OYENTE': return 'default';
      default: return 'default';
    }
  };

  // Manejo de ordenamiento (A-Z / Z-A)
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleSortAZ = () => {
    setSortField('apellido');
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-text-muted opacity-40 group-hover:opacity-70" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowDownAZ className="w-3.5 h-3.5 text-primary" />
    ) : (
      <ArrowUpZA className="w-3.5 h-3.5 text-primary" />
    );
  };

  // Resolver ciclo_id de la cátedra de manera infalible
  const getResolvedCicloId = async () => {
    if (cicloId) return cicloId;
    if (activeCiclo?.id) return activeCiclo.id;
    if (isSupabaseConfigured && !isDemo) {
      try {
        const { data: catData } = await supabase
          .from('catedras')
          .select('ciclo_id')
          .eq('id', catedraId)
          .maybeSingle();
        if (catData?.ciclo_id) return catData.ciclo_id;

        if (user?.id) {
          const { data: cicloData } = await supabase
            .from('ciclos_lectivos')
            .select('id')
            .eq('docente_id', user.id)
            .eq('activo', true)
            .maybeSingle();
          if (cicloData?.id) return cicloData.id;
        }
      } catch (err) {
        console.warn('Error resolviendo ciclo_id:', err);
      }
    }
    return null;
  };

  // Carga Manual de Alumno
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const cleanDni = dniManual.trim().replace(/\D/g, '');
    const cleanApellido = apellidoManual.trim();
    const cleanNombre = nombreManual.trim();

    if (!cleanDni || !cleanApellido || !cleanNombre) {
      toast.error('Por favor completa todos los campos requeridos (DNI, Apellido y Nombre).');
      return;
    }

    setSavingManual(true);
    try {
      let studentId;
      if (isSupabaseConfigured && !isDemo) {
        if (!user?.id) {
          throw new Error('Sesión de usuario no válida. Inicia sesión nuevamente.');
        }

        const currentCicloId = await getResolvedCicloId();
        if (!currentCicloId) {
          throw new Error('No se pudo determinar el ciclo lectivo de la cátedra. Verifica que exista un ciclo lectivo activo.');
        }

        // 1. Guardar o actualizar estudiante mediante upsert seguro con onConflict: 'docente_id,dni'
        const { data: studentRecord, error: upsertEstErr } = await supabase
          .from('estudiantes')
          .upsert({
            docente_id: user.id,
            dni: cleanDni,
            apellido: cleanApellido,
            nombre: cleanNombre
          }, { onConflict: 'docente_id,dni' })
          .select()
          .single();

        if (upsertEstErr) throw upsertEstErr;
        studentId = studentRecord.id;

        // 2. Inscribir en la cátedra enviando explícitamente estudiante_id, catedra_id y ciclo_id
        const { data: existingInsc, error: inscFindErr } = await supabase
          .from('inscripciones')
          .select('id')
          .eq('catedra_id', catedraId)
          .eq('estudiante_id', studentId)
          .maybeSingle();

        if (inscFindErr) throw inscFindErr;

        if (!existingInsc) {
          const { error: inscErr } = await supabase
            .from('inscripciones')
            .upsert({
              estudiante_id: studentId,
              catedra_id: catedraId,
              ciclo_id: currentCicloId
            }, { onConflict: 'estudiante_id,catedra_id,ciclo_id' });

          if (inscErr) {
            console.warn('Fallback al guardar inscripción:', inscErr);
            const { error: fallbackErr } = await supabase
              .from('inscripciones')
              .upsert({
                estudiante_id: studentId,
                catedra_id: catedraId,
                ciclo_id: currentCicloId
              }, { onConflict: 'estudiante_id,catedra_id' });
            if (fallbackErr) throw fallbackErr;
          }
        } else {
          toast.info('El alumno ya se encontraba inscripto en esta cátedra.');
        }

        await fetchStudents(true);
      } else {
        // Demo mode
        studentId = 'est-' + Date.now();
        const newStudent = {
          id: studentId,
          dni: cleanDni,
          apellido: cleanApellido,
          nombre: cleanNombre
        };
        const updated = [...estudiantes, newStudent];
        updated.sort((a, b) => a.apellido.localeCompare(b.apellido, 'es'));
        setEstudiantes(updated);
        catedraCache.update(catedraId, { estudiantes: updated });
        localStorage.setItem(`estudiantes_${catedraId}`, JSON.stringify(updated));
      }

      if (condicionManual && condicionManual !== 'AUTO' && studentId) {
        localStorage.setItem(`condicion_override_${catedraId}_${studentId}`, condicionManual);
      }

      toast.success(`${cleanApellido}, ${cleanNombre} matriculado correctamente.`);
      setIsManualModalOpen(false);
      setDniManual('');
      setApellidoManual('');
      setNombreManual('');
      setCondicionManual('AUTO');
    } catch (err) {
      handleAppError(err, 'StudentsTab / Matricular Estudiante', user);
    } finally {
      setSavingManual(false);
    }
  };

  // Abrir Modal de Edición
  const handleOpenEdit = (student) => {
    setEditingStudent(student);
    setDniEdit(student.dni || '');
    setApellidoEdit(student.apellido || '');
    setNombreEdit(student.nombre || '');
    const savedCond = localStorage.getItem(`condicion_override_${catedraId}_${student.id}`);
    setCondicionEdit(savedCond || 'AUTO');
    setIsEditModalOpen(true);
  };

  // Guardar Edición
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;

    const cleanDni = dniEdit.trim().replace(/\D/g, '');
    const cleanApellido = apellidoEdit.trim();
    const cleanNombre = nombreEdit.trim();

    if (!cleanDni || !cleanApellido || !cleanNombre) {
      toast.error('Por favor completa todos los campos.');
      return;
    }

    setSavingEdit(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('estudiantes')
          .upsert({
            nombre: cleanNombre,
            apellido: cleanApellido,
            dni: cleanDni,
            docente_id: user.id
          }, { onConflict: 'docente_id,dni' });

        if (error) throw error;
      }

      const updated = estudiantes.map(st => 
        st.id === editingStudent.id 
          ? { ...st, dni: cleanDni, apellido: cleanApellido, nombre: cleanNombre }
          : st
      );
      setEstudiantes(updated);
      catedraCache.update(catedraId, { estudiantes: updated });

      if (!isSupabaseConfigured || isDemo) {
        localStorage.setItem(`estudiantes_${catedraId}`, JSON.stringify(updated));
      }

      // Guardar condición personalizada
      if (condicionEdit && condicionEdit !== 'AUTO') {
        localStorage.setItem(`condicion_override_${catedraId}_${editingStudent.id}`, condicionEdit);
      } else {
        localStorage.removeItem(`condicion_override_${catedraId}_${editingStudent.id}`);
      }

      toast.success('Datos del estudiante actualizados con éxito.');
      setIsEditModalOpen(false);
      setEditingStudent(null);
    } catch (err) {
      handleAppError(err, 'StudentsTab / Actualizar Estudiante', user);
    } finally {
      setSavingEdit(false);
    }
  };

  // Abrir Modal de Baja
  const handleOpenDelete = (student) => {
    setStudentToDelete(student);
    setIsDeleteModalOpen(true);
  };

  // Confirmar Baja de la Cátedra
  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;
    setDeletingStudent(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { error } = await supabase
          .from('inscripciones')
          .delete()
          .eq('catedra_id', catedraId)
          .eq('estudiante_id', studentToDelete.id);

        if (error) throw error;
      }

      const updated = estudiantes.filter(st => st.id !== studentToDelete.id);
      setEstudiantes(updated);
      catedraCache.update(catedraId, { estudiantes: updated });

      if (!isSupabaseConfigured || isDemo) {
        localStorage.setItem(`estudiantes_${catedraId}`, JSON.stringify(updated));
      }

      localStorage.removeItem(`condicion_override_${catedraId}_${studentToDelete.id}`);

      toast.success(`${studentToDelete.apellido}, ${studentToDelete.nombre} dado de baja de la cátedra.`);
      setIsDeleteModalOpen(false);
      setStudentToDelete(null);
    } catch (err) {
      handleAppError(err, 'StudentsTab / Desvincular Estudiante', user);
    } finally {
      setDeletingStudent(false);
    }
  };

  // Filtrado reactivo en tiempo real (Client-side) y ordenamiento sin mutar el array original
  const filteredAndSortedStudents = useMemo(() => {
    const rawQuery = searchQuery.trim();
    const normalizedQuery = normalizeSearchText(rawQuery);
    const digitsOnlyQuery = rawQuery.replace(/\D/g, '');

    let list = estudiantes.filter(st => {
      if (!normalizedQuery) return true;

      const normApellido = normalizeSearchText(st.apellido);
      const normNombre = normalizeSearchText(st.nombre);
      const normFullName1 = `${normApellido} ${normNombre}`;
      const normFullName2 = `${normNombre} ${normApellido}`;

      // 1. Coincidencia por Apellido (ej. Gomez -> Gómez)
      const matchApellido = normApellido.includes(normalizedQuery);

      // 2. Coincidencia por Nombre (ej. Maria -> María)
      const matchNombre = normNombre.includes(normalizedQuery);

      // Coincidencias de nombre y apellido combinados
      const matchFullName = normFullName1.includes(normalizedQuery) || normFullName2.includes(normalizedQuery);

      // 3. Coincidencia por DNI (insensible a puntos y formato numérico)
      const rawDni = String(st.dni || '');
      const digitsOnlyDni = rawDni.replace(/\D/g, '');
      const matchDni = rawDni.toLowerCase().includes(normalizedQuery) ||
        (digitsOnlyQuery.length > 0 && digitsOnlyDni.includes(digitsOnlyQuery));

      // 4. Coincidencia por Condición Académica
      const cond = normalizeSearchText(getStudentCondition(st.id));
      const matchCond = cond.includes(normalizedQuery);

      return matchApellido || matchNombre || matchFullName || matchDni || matchCond;
    });

    // Ordenamiento A-Z / Z-A sin mutar el array original
    return [...list].sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortField === 'apellido') {
        valA = (a.apellido || '').trim();
        valB = (b.apellido || '').trim();
      } else if (sortField === 'nombre') {
        valA = (a.nombre || '').trim();
        valB = (b.nombre || '').trim();
      } else if (sortField === 'dni') {
        valA = String(a.dni || '').trim();
        valB = String(b.dni || '').trim();
      } else if (sortField === 'condicion') {
        valA = getStudentCondition(a.id);
        valB = getStudentCondition(b.id);
      }

      const cmp = valA.localeCompare(valB, 'es', { numeric: true, sensitivity: 'base' });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [estudiantes, searchQuery, sortField, sortDirection, studentConditionsMap]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12 sm:pb-0">
      {/* View Mode: Excel Importer View */}
      {viewMode === 'import-excel' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-surface p-4 rounded-2xl border border-surface-border">
            <button
              onClick={() => setViewMode('list')}
              className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al Listado de Alumnos</span>
            </button>
            <Badge variant="primary">Modo Importador Excel</Badge>
          </div>

          <ExcelImporter
            catedraId={catedraId}
            cicloId={cicloId || activeCiclo?.id}
            onStudentsImported={() => {
              fetchStudents(true);
              setViewMode('list');
              toast.success('Lista de alumnos actualizada desde archivo Excel.');
            }}
          />
        </div>
      ) : (
        /* View Mode: Students List View */
        <>
          {/* Top Control Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-surface p-4 rounded-2xl border border-surface-border shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-text-primary">
                    Nómina de Alumnos
                  </h3>
                  <Badge 
                    variant={searchQuery.trim() ? "primary" : "default"} 
                    className="font-mono text-[11px] transition-all"
                  >
                    {searchQuery.trim() 
                      ? `Mostrando ${filteredAndSortedStudents.length} de ${estudiantes.length} alumnos`
                      : `${estudiantes.length} ${estudiantes.length === 1 ? 'alumno' : 'alumnos'}`
                    }
                  </Badge>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Gestiona la matrícula activa mediante carga manual rápida o importación masiva.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() => setViewMode('import-excel')}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-500/50 hover:bg-emerald-50/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-1.5 cursor-pointer flex-1 sm:flex-initial"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span>Importar Excel / CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm shadow-lg shadow-emerald-600/20 active:scale-95 transition-all duration-200 flex items-center gap-1.5 cursor-pointer flex-1 sm:flex-initial"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Nuevo Alumno (Manual)</span>
              </button>
            </div>
          </div>

          {/* Search bar expandible reactiva, Contador de Coincidencias & Orden A-Z */}
          <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <ExpandableSearch
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                placeholder="Buscar por Apellido, Nombre o DNI..."
                widthClass="w-full sm:w-80 md:w-96"
              />

              {/* Contador de coincidencias en escritorio */}
              {searchQuery.trim() && (
                <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary animate-fadeIn shrink-0 shadow-xs">
                  <span>
                    Mostrando <strong className="font-mono font-bold text-primary">{filteredAndSortedStudents.length}</strong> de <span className="font-mono">{estudiantes.length}</span> alumnos
                  </span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-0.5 hover:bg-primary/20 rounded-full transition-colors text-primary ml-0.5 cursor-pointer"
                    title="Limpiar búsqueda"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* A-Z / Z-A Quick Toggle Button */}
            <button
              type="button"
              onClick={toggleSortAZ}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-surface-border bg-surface hover:bg-surface-hover text-text-primary transition-all shadow-xs shrink-0 touch-target-44 active:scale-95 duration-100 cursor-pointer"
              title={sortDirection === 'asc' ? 'Orden alfabético A-Z activo. Clic para ordenar Z-A' : 'Orden alfabético Z-A activo. Clic para ordenar A-Z'}
            >
              {sortDirection === 'asc' ? (
                <>
                  <ArrowDownAZ className="w-4 h-4 text-primary" />
                  <span>Ordenar: <strong className="text-primary font-bold">A-Z</strong></span>
                </>
              ) : (
                <>
                  <ArrowUpZA className="w-4 h-4 text-primary" />
                  <span>Ordenar: <strong className="text-primary font-bold">Z-A</strong></span>
                </>
              )}
            </button>
          </div>

          {/* Contador de coincidencias visible en dispositivos móviles cuando hay búsqueda activa */}
          {searchQuery.trim() && (
            <div className="flex sm:hidden items-center justify-between px-3.5 py-2 rounded-2xl bg-primary/10 border border-primary/20 text-xs font-semibold text-primary animate-fadeIn shadow-xs">
              <span>
                Mostrando <strong className="font-mono font-bold">{filteredAndSortedStudents.length}</strong> de <span className="font-mono">{estudiantes.length}</span> alumnos
              </span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-primary font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Limpiar</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Student Table / Cards */}
          {loading ? (
            <div className="py-4 space-y-3">
              <SkeletonTable rows={5} cols={5} />
            </div>
          ) : estudiantes.length === 0 ? (
            <EmptyState
              tipo="alumnos"
              onAction={() => setViewMode('import-excel')}
              secondaryActionLabel="Carga Manual Rápida"
              secondaryActionIcon={UserPlus}
              onSecondaryAction={() => setIsManualModalOpen(true)}
            />
          ) : filteredAndSortedStudents.length === 0 ? (
            <EmptyState
              illustration="search"
              title={`No se encontraron alumnos que coincidan con "${searchQuery}"`}
              description="Verifica que el apellido, nombre o número de DNI estén bien escritos, o restablece la vista para ver la nómina completa."
              actionLabel="Restablecer Vista"
              actionIcon={X}
              actionVariant="primary"
              onAction={() => setSearchQuery('')}
            />
          ) : (
            <ErrorBoundary
              title="Aviso en la nómina de alumnos"
              fallback={({ error, retry }) => (
                <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400 mx-auto" />
                  <h4 className="font-bold text-text-primary text-sm">Aviso en la visualización de alumnos</h4>
                  <p className="text-xs text-text-muted max-w-md mx-auto">
                    Se detectó una discrepancia de formato en algún registro de la nómina. La información permanece intacta y protegida.
                  </p>
                  <Button variant="primary" size="sm" onClick={retry}>Reintentar Visualización</Button>
                </div>
              )}
            >
              <div className="bg-surface rounded-2xl border border-surface-border overflow-hidden shadow-xs">
                <div className="overflow-x-auto touch-pan-x">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse" aria-label="Nómina Oficial de Estudiantes">
                    <caption className="sr-only">Nómina oficial de estudiantes inscriptos en la cátedra</caption>
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 backdrop-blur z-20 text-text-secondary font-semibold border-b border-surface-border">
                      <tr>
                        {/* 1. DNI */}
                        <th 
                          scope="col"
                          aria-sort={sortKey === 'dni' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                          className="p-0 w-32 sm:w-36"
                        >
                          <button
                            type="button"
                            onClick={() => handleSort('dni')}
                            className="w-full flex items-center justify-between gap-2 px-4 py-3 min-h-[44px] font-bold text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors"
                            title="Ordenar por DNI"
                          >
                            <span>DNI</span>
                            {renderSortIcon('dni')}
                          </button>
                        </th>

                        {/* 2. Apellido */}
                        <th 
                          scope="col"
                          aria-sort={sortKey === 'apellido' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                          className="p-0"
                        >
                          <button
                            type="button"
                            onClick={() => handleSort('apellido')}
                            className="w-full flex items-center justify-between gap-2 px-4 py-3 min-h-[44px] font-bold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors"
                            title="Ordenar por Apellido (A-Z / Z-A)"
                          >
                            <span>Apellido</span>
                            {renderSortIcon('apellido')}
                          </button>
                        </th>

                        {/* 3. Nombre */}
                        <th 
                          scope="col"
                          aria-sort={sortKey === 'nombre' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                          className="p-0"
                        >
                          <button
                            type="button"
                            onClick={() => handleSort('nombre')}
                            className="w-full flex items-center justify-between gap-2 px-4 py-3 min-h-[44px] font-bold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors"
                            title="Ordenar por Nombre (A-Z / Z-A)"
                          >
                            <span>Nombre</span>
                            {renderSortIcon('nombre')}
                          </button>
                        </th>

                        {/* 4. Condición */}
                        <th 
                          scope="col"
                          aria-sort={sortKey === 'condicion' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                          className="p-0 w-36 sm:w-44"
                        >
                          <button
                            type="button"
                            onClick={() => handleSort('condicion')}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] font-bold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors"
                            title="Ordenar por Condición Académica"
                          >
                            <span>Condición</span>
                            {renderSortIcon('condicion')}
                          </button>
                        </th>

                        {/* 5. Acciones */}
                        <th scope="col" className="px-4 py-3 text-right w-28 sm:w-32 font-bold text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {filteredAndSortedStudents.map((st) => {
                        if (!st || !st.id) return null;
                        const isAcreditado = st.estado_academico === 'ACREDITADO';
                        const cond = getStudentCondition(st.id);
                        const notaFinal = st.nota_final ?? st.nota_final_acreditacion ?? null;

                        return (
                          <StudentRow
                            key={st.id}
                            st={st}
                            cond={cond}
                            isAcreditado={isAcreditado}
                            notaFinal={notaFinal}
                            risk={studentRiskMap.get(st.id)}
                            onOpenStudentDetail={handleOpenStudentDetail}
                            onOpenEdit={handleOpenEdit}
                            onOpenDelete={handleOpenDelete}
                            getCondBadgeVariant={getCondBadgeVariant}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </ErrorBoundary>
          )}
        </>
      )}

      {/* Modal: Carga Manual Rápida */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Matricular Nuevo Alumno"
        subtitle="Ingreso manual ágil a la cátedra"
      >
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
              DNI / Documento *
            </label>
            <input
              type="text"
              required
              value={dniManual}
              onChange={(e) => setDniManual(e.target.value)}
              placeholder="Ej: 42123456"
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
                Apellido *
              </label>
              <input
                type="text"
                required
                value={apellidoManual}
                onChange={(e) => setApellidoManual(e.target.value)}
                placeholder="Ej: Pérez"
                className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={nombreManual}
                onChange={(e) => setNombreManual(e.target.value)}
                placeholder="Ej: Juan Manuel"
                className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
              />
            </div>
          </div>

          <div className="pb-6 relative z-30">
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
              Condición Académica Inicial
            </label>
            <CustomSelect
              value={condicionManual}
              onChange={(val) => setCondicionManual(typeof val === 'object' ? val.target.value : val)}
              options={[
                { value: 'AUTO', label: 'Automática (Calculada según RAM y Asistencias)', badge: 'Auto' },
                { value: 'REGULAR', label: 'Regular', badge: 'Regular' },
                { value: 'PROMOCIONAL', label: 'Promocional', badge: 'Promo' },
                { value: 'LIBRE', label: 'Libre', badge: 'Libre' },
                { value: 'APROBADO', label: 'Aprobado', badge: 'Aprobado' },
                { value: 'DESAPROBADO', label: 'Desaprobado', badge: 'Desaprobado' },
                { value: 'REINCORPORADO', label: 'Reincorporado', badge: 'Reinc.' },
                { value: 'OYENTE', label: 'Oyente', badge: 'Oyente' }
              ]}
              menuClassName="z-50 max-h-48 overflow-y-auto shadow-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsManualModalOpen(false)}
              disabled={savingManual}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingManual}
            >
              Matricular Alumno
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Editar Estudiante */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Datos del Estudiante"
        subtitle="Actualiza la información personal y condición académica"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
              DNI / Documento *
            </label>
            <input
              type="text"
              required
              value={dniEdit}
              onChange={(e) => setDniEdit(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
                Apellido *
              </label>
              <input
                type="text"
                required
                value={apellidoEdit}
                onChange={(e) => setApellidoEdit(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={nombreEdit}
                onChange={(e) => setNombreEdit(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
              />
            </div>
          </div>

          <div className="pb-6 relative z-30">
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
              Condición Académica
            </label>
            <CustomSelect
              value={condicionEdit}
              onChange={(val) => setCondicionEdit(typeof val === 'object' ? val.target.value : val)}
              options={[
                { value: 'AUTO', label: 'Automática (Calculada según Asistencias y Notas)', badge: 'Auto' },
                { value: 'REGULAR', label: 'Regular', badge: 'Regular' },
                { value: 'PROMOCIONAL', label: 'Promocional', badge: 'Promo' },
                { value: 'LIBRE', label: 'Libre', badge: 'Libre' },
                { value: 'APROBADO', label: 'Aprobado', badge: 'Aprobado' },
                { value: 'DESAPROBADO', label: 'Desaprobado', badge: 'Desaprobado' },
                { value: 'REINCORPORADO', label: 'Reincorporado', badge: 'Reinc.' },
                { value: 'OYENTE', label: 'Oyente', badge: 'Oyente' }
              ]}
              menuClassName="z-50 max-h-48 overflow-y-auto shadow-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl"
            />
            <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
              Selecciona "Automática" para que el sistema calcule la condición según el RAM, o elige una condición fija para el alumno.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
              disabled={savingEdit}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingEdit}
            >
              Guardar Cambios
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirmación de Baja */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Dar de Baja de la Cátedra"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-danger/10 border border-danger/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div className="text-xs text-danger leading-relaxed">
              ¿Estás seguro de que deseas dar de baja a{' '}
              <strong>{studentToDelete?.apellido}, {studentToDelete?.nombre}</strong> (DNI: {studentToDelete?.dni}) de esta cátedra?
              El alumno dejará de aparecer en la lista de asistencias y calificaciones de <strong>{catedraName}</strong>.
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deletingStudent}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={deletingStudent}
              onClick={handleDeleteConfirm}
            >
              Confirmar Baja
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Ficha del Estudiante e Historial de Exámenes */}
      <EstudianteDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        student={selectedStudentForDetail}
        catedraId={catedraId}
        catedraName={catedraName}
      />
    </div>
  );
}
