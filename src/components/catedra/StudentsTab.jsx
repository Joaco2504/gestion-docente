import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Briefcase,
  RotateCcw,
  Award,
  X,
  ChevronDown,
  SlidersHorizontal
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
import StudentsDataTable from './tables/StudentsDataTable';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { calcularCondicionFinal, calcularPorcentajeAsistencia } from '../../lib/academicLogic';
import { formatFechaDMY } from '../../lib/dateUtils';
import RiskBadge from '../common/RiskBadge';
import ErrorBoundary from '../common/ErrorBoundary';
import { calculateStudentRisk } from '../../lib/earlyWarningLogic';
import { 
  getEstudiantesCatedra, 
  actualizarCertificadoTrabajo, 
  declararEquivalencia, 
  revertirEquivalencia 
} from '../../services/catedraEstudiantesService';
import { handleAppError } from '../../utils/handleAppError';
import { catedraCache } from '../../services/catedraCache';
import { ESTADO_ACADEMICO } from '../../lib/enums';

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
 * StudentCardMobile - Card táctil optimizada para móvil y tablet (<1024px)
 * Ergonomía para el pulgar, micro-KPIs (asistencia y promedio), sin emojis, acordeón accesible.
 */
const StudentCardMobile = React.memo(function StudentCardMobile({
  st,
  cond,
  isAcreditado,
  notaFinal,
  risk,
  asistPct,
  promedio,
  onOpenStudentDetail,
  onOpenEdit,
  onOpenDelete,
  onOpenDeclararEquivalencia,
  onToggleCertificadoTrabajo,
  getCondBadgeVariant
}) {
  const [expanded, setExpanded] = useState(false);
  const initials = ((st.apellido?.[0] || '') + (st.nombre?.[0] || '')).toUpperCase() || 'AL';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenStudentDetail(st)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenStudentDetail(st);
        }
      }}
      aria-label={`Ver ficha académica de ${st.apellido}, ${st.nombre}`}
      className="group relative bg-surface hover:bg-surface-hover/30 p-4 rounded-2xl border border-surface-border shadow-xs hover:shadow-sm transition-all text-left w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      {/* Fila Superior: Iniciales + Nombre + DNI + Semáforo */}
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h4 
              className="font-bold text-text-primary text-sm sm:text-base leading-tight truncate group-hover:text-primary transition-colors"
              title={`${st.apellido}, ${st.nombre}`}
            >
              {st.apellido}, {st.nombre}
            </h4>
            <span className="font-mono tabular-nums text-xs text-text-secondary mt-0.5 block">
              {st.dni ? `DNI ${st.dni}` : 'Sin DNI'}
            </span>
          </div>
        </div>
        <div className="shrink-0 pt-0.5">
          <RiskBadge risk={risk} compact />
        </div>
      </div>

      {/* Badges de Estado */}
      <div className="flex items-center gap-1.5 flex-wrap mt-3">
        {st.es_equivalencia ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
            <span>Acreditada (Equiv.)</span>
          </span>
        ) : isAcreditado ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
            <span>Acreditado (Nota: {notaFinal ?? 'Aprobado'})</span>
          </span>
        ) : (
          <Badge variant={getCondBadgeVariant(cond)}>
            {cond}
          </Badge>
        )}

        {st.tiene_certificado_trabajo && (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
            title="Régimen Laboral Acreditado (60%)"
          >
            <Briefcase className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span>Cert. Laboral (60%)</span>
          </span>
        )}
      </div>

      {/* Micro-KPI Grid de 2 columnas para el docente frente al aula */}
      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-surface-border">
        <div className="bg-surface-elevated/50 p-2.5 rounded-xl border border-surface-border/50">
          <span className="text-[10px] font-semibold uppercase text-text-muted block">Asistencia</span>
          <span className={`text-base font-bold font-mono tabular-nums leading-tight mt-0.5 block ${
            asistPct !== null && asistPct !== undefined
              ? asistPct >= (st.tiene_certificado_trabajo ? 60 : 70)
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
              : 'text-text-secondary'
          }`}>
            {asistPct !== null && asistPct !== undefined ? `${asistPct}%` : '—'}
          </span>
        </div>

        <div className="bg-surface-elevated/50 p-2.5 rounded-xl border border-surface-border/50">
          <span className="text-[10px] font-semibold uppercase text-text-muted block">Promedio</span>
          <span className="text-base font-bold font-mono tabular-nums leading-tight mt-0.5 text-text-primary block">
            {promedio !== null && promedio !== undefined ? promedio : '—'}
          </span>
        </div>
      </div>

      {/* Barra de Acciones del Pulgar */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenStudentDetail(st);
          }}
          className="flex-1 py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px] transition-colors"
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>Ver Ficha</span>
        </button>

        <button
          type="button"
          aria-expanded={expanded}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(prev => !prev);
          }}
          className="px-3 py-2 rounded-xl border border-surface-border hover:bg-surface-hover text-text-secondary hover:text-text-primary text-xs font-medium flex items-center gap-1 min-h-[44px] transition-colors"
          title={expanded ? "Ocultar acciones secundarias" : "Más acciones"}
        >
          <span>Acciones</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Acordeón accesible de acciones secundarias */}
      {expanded && (
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="mt-3 pt-3 border-t border-surface-border grid grid-cols-2 gap-2 animate-fadeIn"
        >
          <button
            type="button"
            onClick={() => onToggleCertificadoTrabajo(st)}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 min-h-[44px] transition-colors ${
              st.tiene_certificado_trabajo
                ? 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                : 'border-surface-border text-text-secondary hover:bg-surface-hover'
            }`}
          >
            <Briefcase className="w-4 h-4 shrink-0" />
            <span className="truncate">{st.tiene_certificado_trabajo ? 'Quitar Cert. (70%)' : 'Cert. Laboral (60%)'}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenDeclararEquivalencia(st)}
            className="p-2.5 rounded-xl border border-surface-border text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-1.5 min-h-[44px] transition-colors"
          >
            <Award className="w-4 h-4 shrink-0" />
            <span className="truncate">Equivalencia</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenEdit(st)}
            className="p-2.5 rounded-xl border border-surface-border text-xs font-semibold text-text-primary hover:bg-surface-hover flex items-center gap-1.5 min-h-[44px] transition-colors"
          >
            <Edit3 className="w-4 h-4 shrink-0" />
            <span className="truncate">Editar</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenDelete(st)}
            className="p-2.5 rounded-xl border border-danger/20 text-xs font-semibold text-danger hover:bg-danger/10 flex items-center gap-1.5 min-h-[44px] transition-colors"
          >
            <UserMinus className="w-4 h-4 shrink-0" />
            <span className="truncate">Dar de Baja</span>
          </button>
        </div>
      )}
    </div>
  );
});

/**
 * EquivalenciaCardMobile - Card táctil para alumnos de equivalencia (<1024px)
 */
const EquivalenciaCardMobile = React.memo(function EquivalenciaCardMobile({
  st,
  onOpenStudentDetail,
  onRevertirEquivalencia
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenStudentDetail(st)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenStudentDetail(st);
        }
      }}
      aria-label={`Ver ficha académica de ${st.apellido}, ${st.nombre}`}
      className="group relative bg-surface hover:bg-surface-hover/30 p-4 rounded-2xl border border-surface-border shadow-xs hover:shadow-sm transition-all text-left w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/20">
            {((st.apellido?.[0] || '') + (st.nombre?.[0] || '')).toUpperCase() || 'EQ'}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-text-primary text-sm sm:text-base leading-tight truncate group-hover:text-primary transition-colors">
              {st.apellido}, {st.nombre}
            </h4>
            <span className="font-mono tabular-nums text-xs text-text-secondary mt-0.5 block">
              {st.dni ? `DNI ${st.dni}` : 'Sin DNI'}
            </span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Equivalencia</span>
        </span>
      </div>

      <div className="mt-3 p-2.5 rounded-xl bg-surface-elevated/50 border border-surface-border/50 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-text-primary font-mono">
          <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="font-semibold truncate">{st.resolucion_equivalencia || 'Resolución Registrada'}</span>
        </div>
        {st.fecha_equivalencia && (
          <span className="text-[11px] font-mono text-text-secondary block">
            Acreditado el: {formatFechaDMY(st.fecha_equivalencia)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 mt-3 pt-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenStudentDetail(st);
          }}
          className="flex-1 py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px] transition-colors"
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>Ver Ficha</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRevertirEquivalencia(st);
          }}
          className="py-2 px-3 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-1.5 min-h-[44px] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          <span>Revertir</span>
        </button>
      </div>
    </div>
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

  // Segmented control: 'activos' | 'equivalencias' | 'todos'
  const [studentListFilter, setStudentListFilter] = useState('activos');

  // Modal: Declarar Acreditación por Equivalencia
  const [isEquivalenciaModalOpen, setIsEquivalenciaModalOpen] = useState(false);
  const [studentForEquivalencia, setStudentForEquivalencia] = useState(null);
  const [resolucionEquivInput, setResolucionEquivInput] = useState('');
  const [fechaEquivInput, setFechaEquivInput] = useState(new Date().toISOString().split('T')[0]);
  const [savingEquivalencia, setSavingEquivalencia] = useState(false);

  // Toggle de certificado de trabajo en edición
  const [tieneTrabajoEdit, setTieneTrabajoEdit] = useState(false);

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
            .select('min_asist_promo, min_asist_reg, min_asist_trabajo, nota_min_promo, nota_min_reg, nota_min_sec')
            .eq('catedra_id', catedraId)
            .maybeSingle()
        ]);

        const list = (rawList || []).map(ins => {
          const condicion = ins.condicion || ins.estado_academico || ESTADO_ACADEMICO.REGULAR;
          const notaFinal = ins.nota_final ?? ins.nota_final_acreditacion ?? null;
          const estado = ins.estado_academico ?? ins.condicion ?? ESTADO_ACADEMICO.CURSANDO;
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
            min_asist_trabajo: Number(critRes.data.min_asist_trabajo) || 60,
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
          condicion: ins.condicion || ins.estado_academico || ESTADO_ACADEMICO.REGULAR,
          nota_final: ins.nota_final ?? ins.nota_final_acreditacion ?? null,
          nota_final_acreditacion: ins.nota_final ?? ins.nota_final_acreditacion ?? null,
          estado_academico: ins.estado_academico ?? ins.condicion ?? ESTADO_ACADEMICO.CURSANDO
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

      // 0. Acreditación reglamentaria por equivalencia directa
      if (st.es_equivalencia) {
        map.set(st.id, 'ACREDITADA_EQUIVALENCIA');
        return;
      }

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
        criterios,
        st
      );

      map.set(st.id, res?.condicion || ESTADO_ACADEMICO.REGULAR);
    });
    return map;
  }, [estudiantes, asistencias, clases.length, inasistenciasDocente.length, evaluaciones, notas, criterios, academicLevel, modalidad, catedraId]);

  // Obtener condición académica con acceso O(1)
  const getStudentCondition = (studentId) => {
    if (!studentId) return ESTADO_ACADEMICO.REGULAR;
    return studentConditionsMap.get(studentId) || ESTADO_ACADEMICO.REGULAR;
  };

  // Mapa reactivo del Semáforo de Riesgo por estudiante
  const studentRiskMap = useMemo(() => {
    const map = new Map();
    (estudiantes || []).forEach(st => {
      if (!st || !st.id) return;
      if (st.es_equivalencia) {
        map.set(st.id, { 
          level: 'OPTIMAL', 
          reasons: ['Acreditación por Equivalencia'], 
          badgeLabel: 'Equivalencia', 
          colorClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' 
        });
        return;
      }
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

  // Mapa reactivo de porcentajes de asistencia por alumno
  const studentAttendanceMap = useMemo(() => {
    const map = new Map();
    (estudiantes || []).forEach(st => {
      if (!st?.id) return;
      const studentAsistencias = (asistencias || []).filter(a => a.estudiante_id === st.id);
      const pct = calcularPorcentajeAsistencia(
        studentAsistencias,
        clases.length,
        inasistenciasDocente.length
      );
      map.set(st.id, pct);
    });
    return map;
  }, [estudiantes, asistencias, clases.length, inasistenciasDocente.length]);

  // Mapa reactivo de promedios de notas numéricas por alumno
  const studentAverageMap = useMemo(() => {
    const map = new Map();
    (estudiantes || []).forEach(st => {
      if (!st?.id) return;
      const studentNotas = (notas || []).filter(n => n.estudiante_id === st.id && n.valor !== null && n.valor !== undefined && !isNaN(Number(n.valor)));
      if (studentNotas.length === 0) {
        map.set(st.id, null);
      } else {
        const sum = studentNotas.reduce((acc, curr) => acc + Number(curr.valor), 0);
        const avg = Number((sum / studentNotas.length).toFixed(1));
        map.set(st.id, avg);
      }
    });
    return map;
  }, [estudiantes, notas]);

  // Paginación incremental para móviles / tablets (<1024px)
  const [visibleCount, setVisibleCount] = useState(30);

  useEffect(() => {
    setVisibleCount(30);
  }, [searchQuery, studentListFilter, sortField, sortDirection]);

  const getCondBadgeVariant = (cond) => {
    switch (cond) {
      case 'ACREDITADA_EQUIVALENCIA': return 'promo';
      case ESTADO_ACADEMICO.PROMOCIONAL: return 'promo';
      case ESTADO_ACADEMICO.REGULAR: return 'regular';
      case ESTADO_ACADEMICO.LIBRE: return 'libre';
      case ESTADO_ACADEMICO.APROBADO: return 'promo';
      case ESTADO_ACADEMICO.DESAPROBADO: return 'libre';
      case 'REINCORPORADO': return 'info';
      case 'OYENTE': return 'default';
      default: return 'default';
    }
  };

  const toggleSortAZ = () => {
    setSortField('apellido');
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
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

  // Contadores reactivos para la nómina y pestañas segmentadas
  const totalActivos = useMemo(() => (estudiantes || []).filter(e => !e.es_equivalencia).length, [estudiantes]);
  const totalEquivalencias = useMemo(() => (estudiantes || []).filter(e => Boolean(e.es_equivalencia)).length, [estudiantes]);
  const totalInscriptos = (estudiantes || []).length;

  // Toggle Certificado de Trabajo (Régimen Laboral 60%)
  const handleToggleCertificadoTrabajo = async (student) => {
    if (!student?.id) return;
    const nuevoEstado = !student.tiene_certificado_trabajo;
    try {
      await actualizarCertificadoTrabajo(catedraId, student.id, nuevoEstado, { supabase, isDemo });
      const updated = estudiantes.map(st => 
        st.id === student.id ? { ...st, tiene_certificado_trabajo: nuevoEstado } : st
      );
      setEstudiantes(updated);
      catedraCache.update(catedraId, { estudiantes: updated });
      toast.success(
        nuevoEstado 
          ? `Régimen Laboral acreditado para ${student.apellido}. Meta de regularidad reducida al 60%.`
          : `Régimen Laboral desmarcado para ${student.apellido}. Requisito estándar restablecido al 70%.`
      );
    } catch (err) {
      handleAppError(err, 'StudentsTab / Certificado Trabajo', user);
    }
  };

  // Abrir Modal de Declaración de Equivalencia
  const handleOpenDeclararEquivalencia = (student) => {
    setStudentForEquivalencia(student);
    setResolucionEquivInput(student.resolucion_equivalencia || '');
    setFechaEquivInput(student.fecha_equivalencia || new Date().toISOString().split('T')[0]);
    setIsEquivalenciaModalOpen(true);
  };

  // Confirmar Declaración de Equivalencia
  const handleConfirmDeclararEquivalencia = async (e) => {
    if (e) e.preventDefault();
    if (!studentForEquivalencia) return;
    setSavingEquivalencia(true);
    try {
      await declararEquivalencia(catedraId, studentForEquivalencia.id, {
        resolucion: resolucionEquivInput.trim(),
        fecha: fechaEquivInput
      }, { supabase, isDemo });

      const updated = estudiantes.map(st => 
        st.id === studentForEquivalencia.id ? { 
          ...st, 
          es_equivalencia: true,
          resolucion_equivalencia: resolucionEquivInput.trim(),
          fecha_equivalencia: fechaEquivInput,
          condicion: 'ACREDITADA_EQUIVALENCIA',
          estado_academico: 'ACREDITADO'
        } : st
      );
      setEstudiantes(updated);
      catedraCache.update(catedraId, { estudiantes: updated });
      toast.success(`Materia acreditada por equivalencia reglamentaria para ${studentForEquivalencia.apellido}, ${studentForEquivalencia.nombre}.`);
      setIsEquivalenciaModalOpen(false);
      setStudentForEquivalencia(null);
    } catch (err) {
      handleAppError(err, 'StudentsTab / Declarar Equivalencia', user);
    } finally {
      setSavingEquivalencia(false);
    }
  };

  // Revertir Equivalencia a Regular
  const handleRevertirEquivalencia = async (student) => {
    if (!student?.id) return;
    const confirmacion = window.confirm(`¿Deseas revertir la acreditación por equivalencia de ${student.apellido}, ${student.nombre}?\n\nEl alumno volverá a registrarse como cursante activo.`);
    if (!confirmacion) return;

    try {
      await revertirEquivalencia(catedraId, student.id, { supabase, isDemo });
      const updated = estudiantes.map(st => 
        st.id === student.id ? { 
          ...st, 
          es_equivalencia: false,
          resolucion_equivalencia: null,
          fecha_equivalencia: null,
          condicion: 'REGULAR',
          estado_academico: 'CURSANDO'
        } : st
      );
      setEstudiantes(updated);
      catedraCache.update(catedraId, { estudiantes: updated });
      toast.success(`Acreditación revertida. ${student.apellido}, ${student.nombre} reintegrado a cursantes activos.`);
    } catch (err) {
      handleAppError(err, 'StudentsTab / Revertir Equivalencia', user);
    }
  };

  // Abrir Modal de Edición
  const handleOpenEdit = (student) => {
    setEditingStudent(student);
    setDniEdit(student.dni || '');
    setApellidoEdit(student.apellido || '');
    setNombreEdit(student.nombre || '');
    setTieneTrabajoEdit(Boolean(student.tiene_certificado_trabajo));
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
        const { error } = await supabase
          .from('estudiantes')
          .upsert({
            nombre: cleanNombre,
            apellido: cleanApellido,
            dni: cleanDni,
            docente_id: user.id
          }, { onConflict: 'docente_id,dni' });

        if (error) throw error;
      }

      if (tieneTrabajoEdit !== Boolean(editingStudent.tiene_certificado_trabajo)) {
        await actualizarCertificadoTrabajo(catedraId, editingStudent.id, tieneTrabajoEdit, { supabase, isDemo });
      }

      const updated = estudiantes.map(st => 
        st.id === editingStudent.id 
          ? { 
              ...st, 
              dni: cleanDni, 
              apellido: cleanApellido, 
              nombre: cleanNombre,
              tiene_certificado_trabajo: tieneTrabajoEdit
            }
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
      // 1. Filtrar según pestaña activa (segmented control)
      if (studentListFilter === 'activos' && st.es_equivalencia) return false;
      if (studentListFilter === 'equivalencias' && !st.es_equivalencia) return false;

      // 2. Filtrar por búsqueda
      if (!normalizedQuery) return true;

      const normApellido = normalizeSearchText(st.apellido);
      const normNombre = normalizeSearchText(st.nombre);
      const normFullName1 = `${normApellido} ${normNombre}`;
      const normFullName2 = `${normNombre} ${normApellido}`;

      // Coincidencia por Apellido
      const matchApellido = normApellido.includes(normalizedQuery);

      // Coincidencia por Nombre
      const matchNombre = normNombre.includes(normalizedQuery);

      // Coincidencias de nombre y apellido combinados
      const matchFullName = normFullName1.includes(normalizedQuery) || normFullName2.includes(normalizedQuery);

      // Coincidencia por DNI
      const rawDni = String(st.dni || '');
      const digitsOnlyDni = rawDni.replace(/\D/g, '');
      const matchDni = rawDni.toLowerCase().includes(normalizedQuery) ||
        (digitsOnlyQuery.length > 0 && digitsOnlyDni.includes(digitsOnlyQuery));

      // Coincidencia por Condición Académica o N° Resolución
      const cond = normalizeSearchText(getStudentCondition(st.id));
      const resNum = normalizeSearchText(st.resolucion_equivalencia);
      const matchCond = cond.includes(normalizedQuery) || resNum.includes(normalizedQuery);

      return matchApellido || matchNombre || matchFullName || matchDni || matchCond;
    });

    // Ordenamiento A-Z / Z-A sin mutar el array original
    return [...list].sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortField === 'apellido') {
        valA = (a.apellido || '').trim();
        valB = (b.apellido || '').trim();
        const cmp = valA.localeCompare(valB, 'es', { numeric: true, sensitivity: 'base' });
        return sortDirection === 'asc' ? cmp : -cmp;
      } else if (sortField === 'nombre') {
        valA = (a.nombre || '').trim();
        valB = (b.nombre || '').trim();
        const cmp = valA.localeCompare(valB, 'es', { numeric: true, sensitivity: 'base' });
        return sortDirection === 'asc' ? cmp : -cmp;
      } else if (sortField === 'dni') {
        valA = String(a.dni || '').trim();
        valB = String(b.dni || '').trim();
        const cmp = valA.localeCompare(valB, 'es', { numeric: true, sensitivity: 'base' });
        return sortDirection === 'asc' ? cmp : -cmp;
      } else if (sortField === 'condicion') {
        valA = getStudentCondition(a.id);
        valB = getStudentCondition(b.id);
        const cmp = valA.localeCompare(valB, 'es', { numeric: true, sensitivity: 'base' });
        return sortDirection === 'asc' ? cmp : -cmp;
      } else if (sortField === 'asistencia') {
        const pctA = studentAttendanceMap.get(a.id) ?? -1;
        const pctB = studentAttendanceMap.get(b.id) ?? -1;
        return sortDirection === 'asc' ? pctA - pctB : pctB - pctA;
      } else if (sortField === 'promedio') {
        const promA = studentAverageMap.get(a.id) ?? -1;
        const promB = studentAverageMap.get(b.id) ?? -1;
        return sortDirection === 'asc' ? promA - promB : promB - promA;
      }

      return 0;
    });
  }, [estudiantes, searchQuery, sortField, sortDirection, studentConditionsMap, studentListFilter, studentAttendanceMap, studentAverageMap]);

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
          {/* Top Control Bar con Primitivas Korum */}
          <Card variant="default" padding="sm" className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
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
                    size="sm"
                    className="font-mono text-[11px]"
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
              <Button
                variant="secondary"
                size="md"
                icon={FileSpreadsheet}
                onClick={() => setViewMode('import-excel')}
                className="flex-1 sm:flex-initial"
              >
                Importar Excel / CSV
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={UserPlus}
                onClick={() => setIsManualModalOpen(true)}
                className="flex-1 sm:flex-initial"
              >
                Nuevo Alumno
              </Button>
            </div>
          </Card>

          {/* Segmented Control de Vistas: Cursantes Activos / Acreditados por Equivalencia / Todos */}
          <div className="flex items-center gap-1.5 p-1 bg-surface rounded-2xl border border-surface-border shadow-xs overflow-x-auto no-scrollbar max-w-full shrink-0">
            <button
              type="button"
              onClick={() => setStudentListFilter('activos')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98] flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap select-none ${
                studentListFilter === 'activos'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover/60'
              }`}
            >
              <span>Cursantes Activos</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                studentListFilter === 'activos'
                  ? 'bg-white/20 text-white'
                  : 'bg-primary/10 text-primary'
              }`}>
                {totalActivos}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStudentListFilter('equivalencias')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98] flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap select-none ${
                studentListFilter === 'equivalencias'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover/60'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Acreditados por Equivalencia</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                studentListFilter === 'equivalencias'
                  ? 'bg-white/20 text-white'
                  : 'bg-primary/10 text-primary'
              }`}>
                {totalEquivalencias}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStudentListFilter('todos')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98] flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap select-none ${
                studentListFilter === 'todos'
                  ? 'bg-slate-700 dark:bg-slate-700 text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover/60'
              }`}
            >
              <span>Todos los Inscriptos</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                studentListFilter === 'todos'
                  ? 'bg-white/20 text-white'
                  : 'bg-surface-hover text-text-muted'
              }`}>
                {totalInscriptos}
              </span>
            </button>
          </div>

          {/* Search bar expandible reactiva, Contador de Coincidencias & Orden A-Z */}
          <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <ExpandableSearch
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                placeholder={studentListFilter === 'equivalencias' ? "Buscar por Apellido, DNI o N° Resolución..." : "Buscar por Apellido, Nombre o DNI..."}
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

            {/* A-Z / Z-A Quick Toggle Button (Desktop >= 1024px) */}
            <button
              type="button"
              onClick={toggleSortAZ}
              className="hidden lg:inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-surface-border bg-surface hover:bg-surface-hover text-text-primary transition-all shadow-xs shrink-0 touch-target-44 active:scale-95 duration-100 cursor-pointer"
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

          {/* Selector de Ordenamiento Móvil & Tablet (<1024px) */}
          <div className="flex lg:hidden items-center justify-between gap-2 bg-surface p-2.5 rounded-2xl border border-surface-border shadow-xs">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <SlidersHorizontal className="w-4 h-4 text-text-muted shrink-0 ml-1" />
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                aria-label="Criterio de ordenamiento"
                className="bg-transparent text-xs font-semibold text-text-primary focus:outline-none w-full cursor-pointer py-1"
              >
                <option value="apellido">Ordenar por: Apellido</option>
                <option value="nombre">Ordenar por: Nombre</option>
                <option value="dni">Ordenar por: DNI</option>
                <option value="condicion">Ordenar por: Condición</option>
                <option value="asistencia">Ordenar por: Asistencia %</option>
                <option value="promedio">Ordenar por: Promedio Notas</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-surface-elevated border border-surface-border text-xs font-bold text-primary shrink-0 touch-target-44 cursor-pointer active:scale-95 transition-all"
              title={sortDirection === 'asc' ? 'Orden Ascendente (menor a mayor / A-Z)' : 'Orden Descendente (mayor a menor / Z-A)'}
            >
              {sortDirection === 'asc' ? (
                <>
                  <ArrowDownAZ className="w-4 h-4 text-primary" />
                  <span className="text-[11px]">Asc</span>
                </>
              ) : (
                <>
                  <ArrowUpZA className="w-4 h-4 text-primary" />
                  <span className="text-[11px]">Desc</span>
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
            studentListFilter === 'equivalencias' ? (
              <EmptyState
                illustration="folder"
                title="No hay alumnos acreditados por equivalencia"
                description="Los alumnos con resolución de equivalencia quedan exentos de la toma de asistencia diaria y evaluaciones activas. Para declarar una equivalencia, usa el botón con ícono de medalla en la lista de Cursantes Activos."
                actionLabel="Ver Cursantes Activos"
                actionIcon={Users}
                actionVariant="primary"
                onAction={() => setStudentListFilter('activos')}
              />
            ) : (
              <EmptyState
                illustration="search"
                title={`No se encontraron alumnos que coincidan con "${searchQuery}"`}
                description="Verifica que el apellido, nombre o número de DNI estén bien escritos, o restablece la vista para ver la nómina completa."
                actionLabel="Restablecer Vista"
                actionIcon={X}
                actionVariant="primary"
                onAction={() => setSearchQuery('')}
              />
            )
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
              {/* VISTA MÓVIL Y TABLET: Grid de cards táctiles con micro-KPIs (<1024px) */}
              <div className="lg:hidden space-y-3">
                {studentListFilter === 'equivalencias' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredAndSortedStudents.slice(0, visibleCount).map((st) => (
                      <EquivalenciaCardMobile
                        key={st.id}
                        st={st}
                        onOpenStudentDetail={handleOpenStudentDetail}
                        onRevertirEquivalencia={handleRevertirEquivalencia}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredAndSortedStudents.slice(0, visibleCount).map((st) => {
                      if (!st || !st.id) return null;
                      const isAcreditado = st.estado_academico === 'ACREDITADO';
                      const cond = getStudentCondition(st.id);
                      const notaFinal = st.nota_final ?? st.nota_final_acreditacion ?? null;

                      return (
                        <StudentCardMobile
                          key={st.id}
                          st={st}
                          cond={cond}
                          isAcreditado={isAcreditado}
                          notaFinal={notaFinal}
                          risk={studentRiskMap.get(st.id)}
                          asistPct={studentAttendanceMap.get(st.id)}
                          promedio={studentAverageMap.get(st.id)}
                          onOpenStudentDetail={handleOpenStudentDetail}
                          onOpenEdit={handleOpenEdit}
                          onOpenDelete={handleOpenDelete}
                          onOpenDeclararEquivalencia={handleOpenDeclararEquivalencia}
                          onToggleCertificadoTrabajo={handleToggleCertificadoTrabajo}
                          getCondBadgeVariant={getCondBadgeVariant}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Paginación incremental para listas extensas (>30 alumnos) */}
                {filteredAndSortedStudents.length > visibleCount && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setVisibleCount(prev => prev + 30)}
                      className="w-full py-3 px-4 rounded-xl border border-surface-border bg-surface hover:bg-surface-hover text-xs font-bold text-text-primary transition-all shadow-xs min-h-[44px] flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <span>Cargar más alumnos ({filteredAndSortedStudents.length - visibleCount} restantes)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* VISTA ESCRITORIO: Tabla headless accesible con @tanstack/react-table (>=1024px) */}
              <div className="hidden lg:block bg-surface rounded-2xl border border-surface-border overflow-hidden shadow-xs">
                <StudentsDataTable
                  data={filteredAndSortedStudents}
                  isEquivalencias={studentListFilter === 'equivalencias'}
                  getStudentCondition={getStudentCondition}
                  studentRiskMap={studentRiskMap}
                  getCondBadgeVariant={getCondBadgeVariant}
                  onOpenStudentDetail={handleOpenStudentDetail}
                  onOpenEdit={handleOpenEdit}
                  onOpenDelete={handleOpenDelete}
                  onOpenDeclararEquivalencia={handleOpenDeclararEquivalencia}
                  onToggleCertificadoTrabajo={handleToggleCertificadoTrabajo}
                  onRevertirEquivalencia={handleRevertirEquivalencia}
                />
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

          <div className="pb-4 relative z-30">
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

          {/* Certificado de Trabajo (Régimen Laboral 60%) */}
          <div className="p-3.5 rounded-xl border border-blue-500/25 bg-blue-500/5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-text-primary block">
                  Certificado de Trabajo (Régimen Laboral)
                </span>
                <span className="text-[11px] text-text-muted">
                  Reduce el requisito de regularidad al 60% por normativa laboral.
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={tieneTrabajoEdit}
                onChange={(e) => setTieneTrabajoEdit(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
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

      {/* Modal: Declarar Acreditación por Equivalencia */}
      <Modal
        isOpen={isEquivalenciaModalOpen}
        onClose={() => setIsEquivalenciaModalOpen(false)}
        title="Declarar Acreditación por Equivalencia"
        subtitle="Homologación reglamentaria de la cátedra para el estudiante"
      >
        <form onSubmit={handleConfirmDeclararEquivalencia} className="space-y-4">
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex items-start gap-3">
            <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-text-secondary leading-relaxed">
              Estás por declarar como acreditada por equivalencia reglamentaria la cátedra para{' '}
              <strong className="text-text-primary">{studentForEquivalencia?.apellido}, {studentForEquivalencia?.nombre}</strong> (DNI: {studentForEquivalencia?.dni}).
              El alumno quedará exceptuado de la toma de asistencia diaria y evaluaciones activas, conservando su registro oficial en la sección de Equivalencias.
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
              N° de Resolución / Expediente *
            </label>
            <input
              type="text"
              required
              value={resolucionEquivInput}
              onChange={(e) => setResolucionEquivInput(e.target.value)}
              placeholder="Ej: Res. Decanal N° 142/2026 o Expte. 8921/25"
              className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none bg-surface text-text-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
              Fecha de la Acreditación / Resolución *
            </label>
            <input
              type="date"
              required
              value={fechaEquivInput}
              onChange={(e) => setFechaEquivInput(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none bg-surface text-text-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEquivalenciaModalOpen(false)}
              disabled={savingEquivalencia}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingEquivalencia}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Confirmar Acreditación
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
