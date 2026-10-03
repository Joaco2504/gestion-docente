import React, { useState, useEffect, useMemo } from 'react';
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
  Check,
  Printer,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Card from '../common/Card';
import Modal from '../common/Modal';
import CustomSelect from '../common/CustomSelect';
import EmptyState from '../common/EmptyState';
import { SkeletonTable } from '../common/SkeletonLoader';
import PrintPreviewModal from '../common/PrintPreviewModal';
import PrintGradesConfigModal from './PrintGradesConfigModal';
import AnimatedSearchBar from '../common/AnimatedSearchBar';
import { calcularCondicionFinal, calcularPorcentajeAsistencia } from '../../lib/academicLogic';
import { exportGradesToExcel, exportGradesToCsv } from '../../lib/excel';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { formatFechaDMY, parseDMYtoYMD } from '../../lib/dateUtils';
import { useAuth } from '../../context/AuthContext';
import RiskBadge from '../common/RiskBadge';
import { calculateStudentRisk } from '../../lib/earlyWarningLogic';
import { handleAppError } from '../../utils/handleAppError';
import { QuickSaveFab } from '../common/QuickSaveFAB';
import { catedraCache } from '../../services/catedraCache';
import NuevaEvaluacionModal from './modals/NuevaEvaluacionModal';
import GradeCell from './GradeCell';

/**
 * DebouncedGradeInput - Input de nota con debounce configurable (default 300ms)
 * Previene ráfagas de escrituras concurrentes hacia Supabase mientras el docente tipea.
 */
function DebouncedGradeInput({ value, onChange, onDebouncedChange, delay = 300, className = '', ...props }) {
  const [localVal, setLocalVal] = useState(value ?? '');
  const timerRef = React.useRef(null);

  useEffect(() => {
    setLocalVal(value ?? '');
  }, [value]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setLocalVal(val);
    if (onChange) onChange(val);

    if (onDebouncedChange) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onDebouncedChange(val);
      }, delay);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <input
      type="number"
      step="0.5"
      min="1"
      max="10"
      value={localVal}
      onChange={handleInputChange}
      className={className}
      {...props}
    />
  );
}

/**
 * GradeRow - Fila de estudiante memoizada para la matriz de calificaciones
 */
const GradeRow = React.memo(function GradeRow({
  item,
  idx,
  mainEvaluations,
  evaluaciones,
  flashingGradeKey,
  studentRisk,
  getNotaValue,
  getNotaEstado,
  getCondBadgeVariant,
  onOpenEditNota,
  notas
}) {
  const est = item.estudiante;

  return (
    <tr className="group hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors">
      <td scope="row" className="sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-100 dark:group-hover:bg-slate-800/80 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] px-3 sm:px-4 py-3 border-r border-surface-border w-64 sm:w-72">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-mono tabular-nums text-text-muted select-none w-5 shrink-0 text-right">
              {idx + 1}.
            </span>
            <span className="font-semibold text-text-primary break-words">
              {est.apellido}, {est.nombre}
            </span>
          </div>
          <RiskBadge risk={studentRisk} compact />
        </div>
        <div className="text-[11px] font-mono tabular-nums text-text-muted pl-7">
          DNI: {est.dni || 'S/D'}
        </div>
      </td>

      {/* Attendance % */}
      <td className="px-3 py-3 text-center font-mono tabular-nums w-24 sm:w-28">
        <span className={`px-2 py-0.5 rounded text-xs font-bold tabular-nums ${
          item.asistenciaPct < 70 
            ? 'bg-red-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300' 
            : 'bg-green-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
        }`}>
          {item.asistenciaPct}%
        </span>
      </td>

      {/* Main evaluations and linked recuperatorios */}
      {mainEvaluations.map(ev => {
        const recup = evaluaciones.find(r => String(r.tipo || '').toUpperCase().includes('RECUP') && r.evaluacion_origen_id === ev.id);
        const notaOriginal = getNotaValue(est.id, ev.id);
        const estadoOriginal = getNotaEstado(est.id, ev.id);
        const notaRecup = recup ? getNotaValue(est.id, recup.id) : null;
        const estadoRecup = recup ? getNotaEstado(est.id, recup.id) : null;
        const isFlashingOriginal = flashingGradeKey === `${est.id}_${ev.id}`;
        const isFlashingRecup = recup ? flashingGradeKey === `${est.id}_${recup.id}` : false;

        return (
          <GradeCell
            key={ev.id}
            est={est}
            ev={ev}
            recup={recup}
            notaOriginal={notaOriginal}
            estadoOriginal={estadoOriginal}
            notaRecup={notaRecup}
            estadoRecup={estadoRecup}
            isFlashingOriginal={isFlashingOriginal}
            isFlashingRecup={isFlashingRecup}
            onOpenEditNota={onOpenEditNota}
          />
        );
      })}

      {/* Final Condition Badge */}
      <td className="px-4 py-3 text-center border-l border-surface-border bg-surface-hover/20">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5">
            <Badge variant={getCondBadgeVariant(item.condicion?.condicion)}>
              {item.condicion?.condicion}
            </Badge>
            <RiskBadge risk={studentRisk} compact />
          </div>
          {item.condicion?.motivo && (
            <span className="text-[10px] text-text-muted truncate max-w-[130px]" title={item.condicion.motivo}>
              {item.condicion.motivo}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}, (prev, next) => {
  return (
    prev.item.estudiante.id === next.item.estudiante.id &&
    prev.item.asistenciaPct === next.item.asistenciaPct &&
    prev.item.condicion?.condicion === next.item.condicion?.condicion &&
    prev.item.condicion?.motivo === next.item.condicion?.motivo &&
    prev.studentRisk === next.studentRisk &&
    prev.mainEvaluations === next.mainEvaluations &&
    prev.evaluaciones === next.evaluaciones &&
    prev.flashingGradeKey === next.flashingGradeKey &&
    prev.notas === next.notas
  );
});

export default function GradesTab({
  catedraId,
  catedraName,
  academicLevel = 'TERCIARIO',
  modalidad = 'ANUAL',
  cursadaFinalizada = false
}) {
  const { user, isDemo } = useAuth();

  const [estudiantes, setEstudiantes] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [notas, setNotas] = useState([]);
  const [clases, setClases] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [inasistenciasDocente, setInasistenciasDocente] = useState([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [flashingGradeKey, setFlashingGradeKey] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [criterios, setCriterios] = useState({
    min_asist_promo: 80,
    min_asist_reg: 70,
    nota_min_promo: 7,
    nota_min_reg: 4,
    nota_min_sec: 6
  });
  const [loading, setLoading] = useState(true);
  const [isPrintConfigModalOpen, setIsPrintConfigModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printConfig, setPrintConfig] = useState({
    includeAsistencia: true,
    selectedEvalIds: [],
    includeNotaFinal: true,
    includeCondicion: true,
    orientation: 'landscape',
    includeSignature: true
  });

  const handleGeneratePreview = (config) => {
    setPrintConfig(config);
    setIsPrintConfigModalOpen(false);
    setIsPrintModalOpen(true);
  };

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
    (estudiantes ?? []).forEach((e) => { if (e?.id) all[e.id] = true; });
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
  const [selectedEstadoNota, setSelectedEstadoNota] = useState(null); // 'CALIFICADO' | 'NO_ENTREGO' | 'AUSENTE' | null
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
  const [editEvalTipo, setEditEvalTipo] = useState('Parcial');
  const [editEvalFormato, setEditEvalFormato] = useState('Escrito');
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

  // Sincronización reactiva cuando se crea o actualiza una evaluación (ej. desde Libro de Temas)
  useEffect(() => {
    const handleEvaluacionesUpdated = (e) => {
      if (!e.detail?.catedraId || e.detail.catedraId === catedraId) {
        const cached = catedraCache.get(catedraId);
        if (cached?.evaluaciones) {
          setEvaluaciones(cached.evaluaciones);
        } else {
          const stored = localStorage.getItem(`evaluaciones_${catedraId}`);
          if (stored) {
            try {
              setEvaluaciones(JSON.parse(stored));
            } catch (_) {}
          }
        }
      }
    };

    window.addEventListener('evaluaciones_updated', handleEvaluacionesUpdated);
    return () => {
      window.removeEventListener('evaluaciones_updated', handleEvaluacionesUpdated);
    };
  }, [catedraId]);

  async function fetchData(forceRefresh = false) {
    // 1. Verificación instantánea de caché en memoria de sesión
    if (!forceRefresh) {
      const cached = catedraCache.get(catedraId);
      if (cached && cached.estudiantes) {
        setEstudiantes(cached.estudiantes);
        if (cached.evaluaciones) setEvaluaciones(cached.evaluaciones);
        if (cached.notas) setNotas(cached.notas);
        if (cached.clases) setClases(cached.clases);
        if (cached.asistencias) setAsistencias(cached.asistencias);
        if (cached.inasistenciasDocente) setInasistenciasDocente(cached.inasistenciasDocente);
        if (cached.criterios) setCriterios(cached.criterios);
        if (cached.periodos) setPeriodos(cached.periodos);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        // Round 1: Carga paralela de inscripciones, evaluaciones, clases, inasistencias, criterios y ciclo
        const [
          inscRes,
          evalRes,
          clsRes,
          inasistRes,
          critRes,
          catRes
        ] = await Promise.all([
          supabase
            .from('inscripciones')
            .select(`
              id,
              estudiante_id,
              catedra_id,
              ciclo_id,
              estado_academico,
              condicion,
              nota_final,
              nota_final_acreditacion,
              estudiantes (
                id,
                dni,
                apellido,
                nombre
              )
            `)
            .eq('catedra_id', catedraId),
          supabase
            .from('evaluaciones')
            .select('id, catedra_id, titulo, tipo, evaluacion_origen_id, fecha_entrega, archivo_url, created_at')
            .eq('catedra_id', catedraId)
            .order('created_at', { ascending: true }),
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
            .maybeSingle(),
          supabase
            .from('catedras')
            .select('id, ciclo_id')
            .eq('id', catedraId)
            .maybeSingle()
        ]);

        const estList = (inscRes.data || [])
          .map(ins => {
            const est = ins.estudiantes || {};
            const condicion = ins.condicion || ins.estado_academico || 'REGULAR';
            const notaFinal = ins.nota_final ?? ins.nota_final_acreditacion ?? null;
            const estado = ins.estado_academico ?? ins.condicion ?? 'CURSANDO';
            return {
              ...est,
              inscripcion_id: ins.id,
              condicion,
              estado_academico: estado,
              nota_final: notaFinal,
              nota_final_acreditacion: notaFinal
            };
          })
          .filter(Boolean)
          .filter(s => s && s.id);
        estList.sort((a, b) => (a.apellido || '').localeCompare(b.apellido || '', 'es'));

        const localKey = `evaluaciones_${catedraId}`;
        let localEvals = [];
        try {
          localEvals = JSON.parse(localStorage.getItem(localKey) || '[]');
        } catch {
          localEvals = [];
        }

        const combinedMap = new Map();
        (evalRes.data || []).forEach(e => combinedMap.set(e.id, e));
        localEvals.forEach(localEv => {
          if (!combinedMap.has(localEv.id)) {
            const match = (evalRes.data || []).find(e => 
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

        const cList = clsRes.data || [];
        const inasistList = inasistRes.data || [];

        // Round 2: Carga paralela de Notas, Asistencias y Periodos Académicos
        const validEvalIds = mergedEvals.map(e => e.id).filter(id => !String(id).startsWith('eval-'));
        const validClaseIds = cList.map(c => c.id);
        const cicloId = catRes.data?.ciclo_id;

        const [notasRes, asistRes, periodosRes] = await Promise.all([
          validEvalIds.length > 0
            ? supabase.from('notas').select('id, evaluacion_id, estudiante_id, valor, estado, nota').in('evaluacion_id', validEvalIds)
                .then(r => r.error ? supabase.from('notas').select('id, evaluacion_id, estudiante_id, valor').in('evaluacion_id', validEvalIds) : r)
            : Promise.resolve({ data: [] }),
          validClaseIds.length > 0
            ? supabase.from('asistencias').select('id, clase_id, estudiante_id, estado').in('clase_id', validClaseIds)
            : Promise.resolve({ data: [] }),
          cicloId
            ? supabase.from('periodos_academicos').select('id, ciclo_id, nombre, numero, fecha_inicio, fecha_fin').eq('ciclo_id', cicloId).order('fecha_inicio', { ascending: true })
            : Promise.resolve({ data: [] })
        ]);

        let notasList = notasRes.data || [];
        try {
          const storedNotas = JSON.parse(localStorage.getItem(`notas_${catedraId}`) || '[]');
          if (Array.isArray(storedNotas) && storedNotas.length > 0) {
            const notaKeyMap = new Map();
            notasList.forEach(n => notaKeyMap.set(`${n.estudiante_id}_${n.evaluacion_id}`, n));
            storedNotas.forEach(sn => {
              const k = `${sn.estudiante_id}_${sn.evaluacion_id}`;
              const existing = notaKeyMap.get(k);
              if (!existing) {
                notaKeyMap.set(k, sn);
              } else if (sn.estado && !existing.estado) {
                notaKeyMap.set(k, { ...existing, estado: sn.estado, nota: sn.nota ?? existing.valor });
              }
            });
            notasList = Array.from(notaKeyMap.values());
          }
        } catch (_) {}
        const asistList = asistRes.data || [];
        const periodosList = periodosRes.data || [];

        let critObj = null;
        if (critRes.data) {
          critObj = {
            min_asist_promo: Number(critRes.data.min_asist_promo) || 80,
            min_asist_reg: Number(critRes.data.min_asist_reg) || 70,
            nota_min_promo: Number(critRes.data.nota_min_promo) || 7,
            nota_min_reg: Number(critRes.data.nota_min_reg) || 4,
            nota_min_sec: Number(critRes.data.nota_min_sec) || 6
          };
          setCriterios(critObj);
        }

        setEstudiantes(estList);
        setEvaluaciones(mergedEvals);
        setNotas(notasList);
        setClases(cList);
        setAsistencias(asistList);
        setInasistenciasDocente(inasistList);
        setPeriodos(periodosList);

        // Actualizar caché de sesión en memoria
        catedraCache.set(catedraId, {
          estudiantes: estList,
          evaluaciones: mergedEvals,
          notas: notasList,
          clases: cList,
          asistencias: asistList,
          inasistenciasDocente: inasistList,
          criterios: critObj,
          periodos: periodosList
        });
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
      handleAppError(err, 'GradesTab / Cargar calificaciones');
    } finally {
      setLoading(false);
    }
  };

  const getNotaRecord = (estudianteId, evaluacionId) => {
    return notas.find(
      n => n.estudiante_id === estudianteId && n.evaluacion_id === evaluacionId
    );
  };

  const getNotaValue = (estudianteId, evaluacionId) => {
    const record = getNotaRecord(estudianteId, evaluacionId);
    return record?.valor !== undefined && record?.valor !== null
      ? Number(record.valor)
      : (record?.nota !== undefined && record?.nota !== null ? Number(record.nota) : null);
  };

  const getNotaEstado = (estudianteId, evaluacionId) => {
    const record = getNotaRecord(estudianteId, evaluacionId);
    return record?.estado || null;
  };

  const handleOpenEditNota = (estudiante, evaluacion) => {
    setSelectedStudentForNota(estudiante);
    setSelectedEvalForNota(evaluacion);
    const rec = getNotaRecord(estudiante.id, evaluacion.id);
    const actual = rec?.valor !== undefined && rec?.valor !== null
      ? Number(rec.valor)
      : (rec?.nota !== undefined && rec?.nota !== null ? Number(rec.nota) : null);
    setInputNotaValor(actual !== null ? String(actual) : '');
    setSelectedEstadoNota(rec?.estado || (actual !== null ? 'CALIFICADO' : null));
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
      catedraCache.update(catedraId, { notas: updated });

      toast.success(`Calificación eliminada para ${selectedStudentForNota.apellido}.`);
      setIsEditNotaModalOpen(false);
    } catch (err) {
      handleAppError(err, 'GradesTab / Eliminar Calificación', user);
    } finally {
      setSavingNota(false);
    }
  };

  const handleSaveNotaSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!selectedStudentForNota || !selectedEvalForNota) return;

    if (cursadaFinalizada) {
      toast.error('El cursado está finalizado. Las calificaciones regulares están bloqueadas.');
      return;
    }

    const isEstadoEspecial = selectedEstadoNota === 'NO_ENTREGO' || selectedEstadoNota === 'AUSENTE';

    let valNum = null;
    let finalEstado = selectedEstadoNota;

    if (isEstadoEspecial) {
      valNum = null;
    } else {
      // Si el docente deja el campo vacío y no seleccionó estado especial, se interpreta como borrar la nota
      if (!inputNotaValor || inputNotaValor.trim() === '') {
        await handleDeleteNota();
        return;
      }

      valNum = Number(inputNotaValor.replace(',', '.'));
      if (isNaN(valNum) || valNum < 1 || valNum > 10) {
        toast.error('La calificación debe ser un valor numérico entre 1 y 10.');
        return;
      }
      finalEstado = 'CALIFICADO';
    }

    setSavingNota(true);
    try {
      const payloadCompleto = {
        evaluacion_id: selectedEvalForNota.id,
        estudiante_id: selectedStudentForNota.id,
        valor: valNum,
        nota: valNum,
        estado: finalEstado,
        updated_at: new Date().toISOString()
      };

      if (isSupabaseConfigured && !isDemo && !String(selectedEvalForNota.id).startsWith('eval-')) {
        try {
          const { error: upsertError } = await supabase
            .from('notas')
            .upsert(payloadCompleto, { onConflict: 'evaluacion_id,estudiante_id' });

          if (upsertError) {
            console.warn('[GradesTab] Error al guardar con payload extendido, reintentando con payload compatible:', upsertError.message);
            const fallbackPayload = {
              evaluacion_id: selectedEvalForNota.id,
              estudiante_id: selectedStudentForNota.id,
              valor: valNum !== null ? valNum : 1, // Compatible con esquema NOT NULL legado
              updated_at: new Date().toISOString()
            };
            const { error: fallbackError } = await supabase
              .from('notas')
              .upsert(fallbackPayload, { onConflict: 'evaluacion_id,estudiante_id' });
            if (fallbackError) throw fallbackError;
          }
        } catch (dbErr) {
          console.error('[GradesTab] Error de persistencia en Supabase:', dbErr);
        }
      }

      // Actualización local en estado y caché
      const filtered = notas.filter(
        n => !(n.evaluacion_id === selectedEvalForNota.id && n.estudiante_id === selectedStudentForNota.id)
      );
      const updatedRecord = {
        evaluacion_id: selectedEvalForNota.id,
        estudiante_id: selectedStudentForNota.id,
        valor: valNum,
        nota: valNum,
        estado: finalEstado,
        updated_at: new Date().toISOString()
      };
      const updated = [...filtered, updatedRecord];

      setNotas(updated);
      localStorage.setItem(`notas_${catedraId}`, JSON.stringify(updated));
      catedraCache.update(catedraId, { notas: updated });

      const mensajeSuccess = isEstadoEspecial
        ? `Estado "${finalEstado === 'NO_ENTREGO' ? 'No entregó (N/E)' : 'Ausente (Aus.)'}" registrado para ${selectedStudentForNota.apellido}.`
        : `Nota de ${selectedStudentForNota.apellido} actualizada a ${valNum}.`;
      toast.success(mensajeSuccess);

      setIsDirty(false);
      setFlashingGradeKey(`${selectedStudentForNota.id}_${selectedEvalForNota.id}`);
      setTimeout(() => setFlashingGradeKey(null), 1200);
      setIsEditNotaModalOpen(false);
    } catch (err) {
      handleAppError(err, 'GradesTab / Guardar Calificación', user);
    } finally {
      setSavingNota(false);
    }
  };

  const handleCreateEvaluacion = async (modalPayload) => {
    if (cursadaFinalizada) {
      toast.error('El cursado está finalizado. No se pueden agregar nuevas evaluaciones.');
      return;
    }

    const payloadData = (modalPayload && typeof modalPayload === 'object' && modalPayload.titulo)
      ? modalPayload
      : {
          titulo: evalTitulo?.trim(),
          nombre: evalTitulo?.trim(),
          tipo: evalTipo || 'Parcial',
          formato: 'Escrito',
          fecha: evalFechaEntrega || null,
          fecha_entrega: evalFechaEntrega ? parseDMYtoYMD(evalFechaEntrega) : null,
          periodo_id: evalPeriodoId || null,
          evaluacion_origen_id: evalOrigenId || null,
          drive_url: evalDriveUrl?.trim() || null
        };

    if (!payloadData.titulo) return;

    setSavingEval(true);
    try {
      let archivoUrl = payloadData.drive_url || null;
      let archivoNombre = archivoUrl ? 'Consignas en Google Drive' : null;

      // Si se proporcionó enlace a Google Drive, sincronizarlo también en la tabla 'recursos'
      if (archivoUrl) {
        try {
          const isParcialRec = String(payloadData.tipo || '').toUpperCase().includes('PARCIAL');
          const recCategory = isParcialRec ? 'PARCIAL' : 'TP';
          const newRec = {
            catedra_id: catedraId,
            categoria: recCategory,
            tipo_origen: 'GOOGLE_LINK',
            titulo: `${payloadData.titulo} — Consignas Drive`,
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

      const rawFecha = payloadData.fecha_entrega || payloadData.fecha;
      const isoFechaEntrega = rawFecha ? (rawFecha.includes('-') ? rawFecha : parseDMYtoYMD(rawFecha)) : null;
      const localId = 'eval-' + Date.now();

      const newEvalObj = {
        id: localId,
        catedra_id: catedraId,
        periodo_id: payloadData.periodo_id || null,
        titulo: payloadData.titulo,
        nombre: payloadData.nombre || payloadData.titulo,
        tipo: payloadData.tipo,
        formato: payloadData.formato || 'Escrito',
        evaluacion_origen_id: (String(payloadData.tipo).toLowerCase().includes('recup') && payloadData.evaluacion_origen_id) ? payloadData.evaluacion_origen_id : null,
        fecha: isoFechaEntrega,
        fecha_entrega: isoFechaEntrega,
        ponderacion: 1,
        archivo_url: archivoUrl,
        archivo_nombre: archivoNombre,
        created_at: new Date().toISOString()
      };

      // 1. Guardar de forma inmediata y síncrona en estado y localStorage
      const updatedList = [...evaluaciones, newEvalObj];
      setEvaluaciones(updatedList);
      localStorage.setItem(`evaluaciones_${catedraId}`, JSON.stringify(updatedList));
      catedraCache.update(catedraId, { evaluaciones: updatedList });

      // 2. Intentar guardar y sincronizar con Supabase si está disponible
      if (isSupabaseConfigured && !isDemo) {
        try {
          const insertPayload = {
            catedra_id: catedraId,
            periodo_id: newEvalObj.periodo_id,
            titulo: newEvalObj.titulo,
            nombre: newEvalObj.nombre,
            tipo: newEvalObj.tipo,
            formato: newEvalObj.formato,
            fecha: newEvalObj.fecha,
            fecha_entrega: newEvalObj.fecha_entrega,
            ponderacion: 1,
            evaluacion_origen_id: newEvalObj.evaluacion_origen_id,
            archivo_url: newEvalObj.archivo_url,
            archivo_nombre: newEvalObj.archivo_nombre
          };

          const { data, error } = await supabase
            .from('evaluaciones')
            .insert(insertPayload)
            .select()
            .single();

          if (error) {
            // Fallback defensivo si faltan columnas o tipo requiere legacy mapping
            let mappedTipo = newEvalObj.tipo;
            const tUpper = String(newEvalObj.tipo || '').toUpperCase();
            if (tUpper.includes('PARCIAL')) mappedTipo = 'PARCIAL';
            else if (tUpper.includes('TRABAJO') || tUpper.includes('TP')) mappedTipo = 'TP';
            else if (tUpper.includes('RECUP')) mappedTipo = 'RECUPERATORIO';

            const baseObj = {
              catedra_id: catedraId,
              periodo_id: newEvalObj.periodo_id,
              titulo: newEvalObj.titulo,
              tipo: mappedTipo,
              evaluacion_origen_id: newEvalObj.evaluacion_origen_id,
              fecha_entrega: newEvalObj.fecha_entrega,
              archivo_url: newEvalObj.archivo_url,
              archivo_nombre: newEvalObj.archivo_nombre
            };
            const fallbackRes = await supabase
              .from('evaluaciones')
              .insert(baseObj)
              .select()
              .single();

            if (!fallbackRes.error && fallbackRes.data) {
              const synced = {
                ...fallbackRes.data,
                formato: newEvalObj.formato,
                fecha_entrega: isoFechaEntrega,
                archivo_url: archivoUrl,
                archivo_nombre: archivoNombre
              };
              const refreshed = updatedList.map(e => e.id === localId ? synced : e);
              setEvaluaciones(refreshed);
              localStorage.setItem(`evaluaciones_${catedraId}`, JSON.stringify(refreshed));
              catedraCache.update(catedraId, { evaluaciones: refreshed });
            }
          } else if (data) {
            const refreshed = updatedList.map(e => e.id === localId ? data : e);
            setEvaluaciones(refreshed);
            localStorage.setItem(`evaluaciones_${catedraId}`, JSON.stringify(refreshed));
            catedraCache.update(catedraId, { evaluaciones: refreshed });
          }
        } catch (dbErr) {
          console.warn('Evaluación preservada localmente. Aviso Supabase:', dbErr);
        }
      }

      toast.success(`Evaluación "${newEvalObj.titulo}" guardada correctamente.`);
      setIsNewEvalModalOpen(false);
      setEvalTitulo('');
      setEvalPeriodoId('');
      setEvalOrigenId('');
      setEvalFechaEntrega('');
      setEvalDriveUrl('');
    } catch (err) {
      handleAppError(err, 'GradesTab / Crear Evaluación', user);
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
      catedraCache.update(catedraId, { evaluaciones: updatedEvaluaciones, notas: updatedNotas });

      toast.success(`Evaluación "${evalTitulo}" eliminada correctamente.`);
    } catch (err) {
      handleAppError(err, 'GradesTab / Eliminar Evaluación', user);
    }
  };

  // Abrir Modal de Edición de Evaluación
  const handleOpenEditEvaluacion = (ev) => {
    setEditingEval(ev);
    setEditEvalTitulo(ev.titulo || ev.nombre || '');
    
    // Normalizar tipo de evaluación
    const tUpper = String(ev.tipo || '').toUpperCase();
    if (tUpper.includes('PARCIAL') || tUpper === 'PRUEBA') {
      setEditEvalTipo('Parcial');
    } else if (tUpper.includes('TP') || tUpper.includes('TRABAJO')) {
      setEditEvalTipo('Trabajo Práctico');
    } else if (tUpper.includes('RECUP')) {
      setEditEvalTipo('Recuperatorio');
    } else {
      setEditEvalTipo(ev.tipo || 'Parcial');
    }

    setEditEvalFormato(ev.formato || 'Escrito');
    setEditEvalFechaEntrega(ev.fecha_entrega ? ev.fecha_entrega.split('T')[0] : (ev.fecha ? ev.fecha.split('T')[0] : ''));
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
        nombre: editEvalTitulo.trim(),
        tipo: editEvalTipo,
        formato: editEvalFormato || 'Escrito',
        fecha: isoFechaEntrega,
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
              nombre: updatedObj.nombre,
              tipo: updatedObj.tipo,
              formato: updatedObj.formato,
              fecha: updatedObj.fecha,
              fecha_entrega: updatedObj.fecha_entrega,
              archivo_url: updatedObj.archivo_url,
              archivo_nombre: updatedObj.archivo_nombre
            })
            .eq('id', editingEval.id);

          if (error) {
            // Fallback con tipos legacy y columnas base
            let mappedTipo = updatedObj.tipo;
            const tUpper = String(updatedObj.tipo || '').toUpperCase();
            if (tUpper.includes('PARCIAL')) mappedTipo = 'PARCIAL';
            else if (tUpper.includes('TRABAJO') || tUpper.includes('TP')) mappedTipo = 'TP';
            else if (tUpper.includes('RECUP')) mappedTipo = 'RECUPERATORIO';

            await supabase
              .from('evaluaciones')
              .update({
                titulo: updatedObj.titulo,
                tipo: mappedTipo,
                fecha_entrega: updatedObj.fecha_entrega,
                archivo_url: updatedObj.archivo_url,
                archivo_nombre: updatedObj.archivo_nombre
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
      catedraCache.update(catedraId, { evaluaciones: updatedList });

      toast.success(`Evaluación "${updatedObj.titulo}" actualizada correctamente.`);
      setIsEditEvalModalOpen(false);
      setEditingEval(null);
    } catch (err) {
      handleAppError(err, 'GradesTab / Actualizar Evaluación', user);
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
      const estNota = getNotaEstado(est.id, evaluacion.id);
      if (estNota === 'AUSENTE') {
        initialMap[est.id] = 'Aus';
      } else if (estNota === 'NO_ENTREGO') {
        initialMap[est.id] = 'N/E';
      } else if (v !== null) {
        initialMap[est.id] = String(v);
      } else {
        initialMap[est.id] = '';
      }
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
          const rawUpper = rawVal.toUpperCase();
          if (rawUpper === 'A' || rawUpper === 'AUS' || rawUpper === 'AUSENTE') {
            newNotas.push({
              evaluacion_id: evalId,
              estudiante_id: est.id,
              valor: null,
              nota: null,
              estado: 'AUSENTE'
            });
            upsertsSupabase.push({
              evaluacion_id: evalId,
              estudiante_id: est.id,
              valor: null,
              nota: null,
              estado: 'AUSENTE',
              updated_at: new Date().toISOString()
            });
          } else if (rawUpper === 'N' || rawUpper === 'NE' || rawUpper === 'N/E' || rawUpper.includes('NO ENTREG')) {
            newNotas.push({
              evaluacion_id: evalId,
              estudiante_id: est.id,
              valor: null,
              nota: null,
              estado: 'NO_ENTREGO'
            });
            upsertsSupabase.push({
              evaluacion_id: evalId,
              estudiante_id: est.id,
              valor: null,
              nota: null,
              estado: 'NO_ENTREGO',
              updated_at: new Date().toISOString()
            });
          } else {
            const num = Number(rawVal.replace(',', '.'));
            if (isNaN(num) || num < 1 || num > 10) {
              toast.error(`Calificación inválida para ${est.apellido} ("${rawVal}"). Ingrese de 1 a 10, "A" (Ausente) o "N" (No entregó).`);
              setSavingBatchGrades(false);
              return;
            }
            newNotas.push({
              evaluacion_id: evalId,
              estudiante_id: est.id,
              valor: num,
              nota: num,
              estado: 'CALIFICADO'
            });
            upsertsSupabase.push({
              evaluacion_id: evalId,
              estudiante_id: est.id,
              valor: num,
              nota: num,
              estado: 'CALIFICADO',
              updated_at: new Date().toISOString()
            });
          }
        }
      }

      if (isSupabaseConfigured && !isDemo && !String(evalId).startsWith('eval-')) {
        if (upsertsSupabase.length > 0) {
          try {
            const { error: upsertErr } = await supabase
              .from('notas')
              .upsert(upsertsSupabase, { onConflict: 'evaluacion_id,estudiante_id' });
            if (upsertErr) {
              console.warn('[GradesTab] Fallback batch upsert compatible:', upsertErr.message);
              const fallbackBatch = upsertsSupabase.map(u => ({
                evaluacion_id: u.evaluacion_id,
                estudiante_id: u.estudiante_id,
                valor: u.valor !== null ? u.valor : 1,
                updated_at: u.updated_at
              }));
              await supabase.from('notas').upsert(fallbackBatch, { onConflict: 'evaluacion_id,estudiante_id' });
            }
          } catch (batchErr) {
            console.error('[GradesTab] Error en batch upsert Supabase:', batchErr);
          }
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
      catedraCache.update(catedraId, { notas: newNotas });

      toast.success(`Calificaciones de "${targetEvalForBatch.titulo}" guardadas con éxito.`);
      setIsDirty(false);
      setIsBatchGradeModalOpen(false);
      setTargetEvalForBatch(null);
    } catch (err) {
      handleAppError(err, 'GradesTab / Guardar Calificaciones Masivas', user);
    } finally {
      setSavingBatchGrades(false);
    }
  };

  // Guardado rápido global (FAB / Ctrl + S) para la vista de calificaciones
  const [savingQuickGrades, setSavingQuickGrades] = useState(false);

  const handleQuickSaveGrades = async () => {
    if (isBatchGradeModalOpen && targetEvalForBatch) {
      await handleSaveBatchGrades({ preventDefault: () => {} });
      return;
    }
    if (isEditNotaModalOpen && selectedStudentForNota && selectedEvalForNota) {
      await handleSaveNotaSubmit({ preventDefault: () => {} });
      return;
    }
    if (isEditEvalModalOpen && editingEval) {
      await handleSaveEditEvaluacion({ preventDefault: () => {} });
      return;
    }
    if (isNewEvalModalOpen) {
      await handleCreateEvaluacion({ preventDefault: () => {} });
      return;
    }

    setSavingQuickGrades(true);
    try {
      if (isSupabaseConfigured && !isDemo && notas.length > 0) {
        const validNotas = notas.filter(n => !String(n.evaluacion_id).startsWith('eval-') && n.valor !== null);
        if (validNotas.length > 0) {
          const payload = validNotas.map(n => ({
            evaluacion_id: n.evaluacion_id,
            estudiante_id: n.estudiante_id,
            valor: n.valor,
            updated_at: new Date().toISOString()
          }));
          const { error } = await supabase.from('notas').upsert(payload, { onConflict: 'evaluacion_id,estudiante_id' });
          if (error) throw error;
        }
      }
      localStorage.setItem(`notas_${catedraId}`, JSON.stringify(notas));
      catedraCache.update(catedraId, { notas });
      setIsDirty(false);
      toast.success('Sábana de calificaciones guardada y sincronizada.');
    } catch (err) {
      handleAppError(err, 'GradesTab / Guardado Rápido', user);
    } finally {
      setSavingQuickGrades(false);
    }
  };

  // Build matrix data
  const mainEvaluations = evaluaciones.filter(e => !String(e.tipo || '').toUpperCase().includes('RECUP'));

  const studentRiskMap = React.useMemo(() => {
    const map = new Map();
    estudiantes.forEach(est => {
      const risk = calculateStudentRisk(est.id, {
        asistencias,
        clases,
        inasistenciasDocente,
        evaluaciones,
        notas,
        criterios,
        academicLevel,
        modalidad
      });
      map.set(est.id, risk);
    });
    return map;
  }, [estudiantes, asistencias, clases, inasistenciasDocente, evaluaciones, notas, criterios, academicLevel, modalidad]);

  const matrixData = useMemo(() => {
    return estudiantes.map(est => {
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
        const estNota = getNotaEstado(est.id, ev.id);
        if (v !== null || estNota) {
          studentNotas.push({
            evaluacion_id: ev.id,
            valor: v,
            nota: v,
            estado: estNota,
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
  }, [estudiantes, asistencias, clases.length, inasistenciasDocente.length, evaluaciones, notas, criterios, academicLevel, modalidad]);

  const filteredMatrixData = useMemo(() => {
    if (!studentSearchQuery.trim()) return matrixData;
    const q = studentSearchQuery.toLowerCase().trim();
    return matrixData.filter(item => {
      const est = item.estudiante;
      const fullName = `${est.apellido || ''} ${est.nombre || ''}`.toLowerCase();
      const dni = String(est.dni || '');
      return fullName.includes(q) || dni.includes(q);
    });
  }, [matrixData, studentSearchQuery]);

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
      handleAppError(err, 'GradesTab / Exportar Excel', user);
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
      handleAppError(err, 'GradesTab / Exportar CSV', user);
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
      {/* Banner de Cursado Cerrado */}
      {cursadaFinalizada && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-800 dark:text-amber-200 animate-fadeIn">
          <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="text-xs sm:text-sm">
            <span className="font-bold">Cursado finalizado:</span> La carga y modificación de evaluaciones y notas regulares se encuentra bloqueada. Los registros quedan en modo solo lectura.
          </div>
        </div>
      )}

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

          {/* Búsqueda Animada de Alumnos */}
          <AnimatedSearchBar
            value={studentSearchQuery}
            onChange={(e) => setStudentSearchQuery(e.target.value)}
            placeholder="Buscar alumno..."
          />

          {/* Exportación: Excel & CSV */}
          <div className="inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsPrintConfigModalOpen(true)}
              disabled={estudiantes.length === 0}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-500/50 hover:bg-emerald-50/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              title="Abrir configuración de impresión y PDF oficial de la sábana de notas"
            >
              <Printer className="w-4 h-4 text-emerald-500" />
              <span className="hidden sm:inline">Imprimir / PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={estudiantes.length === 0}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-500/50 hover:bg-emerald-50/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              title="Descargar sábana completa en Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span><span className="hidden md:inline">Exportar </span>Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={estudiantes.length === 0}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-500/50 hover:bg-emerald-50/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium shadow-sm active:scale-95 transition-all duration-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              title="Descargar calificaciones en CSV (.csv)"
            >
              <FileText className="w-4 h-4 text-emerald-500" />
              <span>CSV</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsNewEvalModalOpen(true)}
            disabled={cursadaFinalizada}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm shadow-lg shadow-emerald-600/20 active:scale-95 transition-all duration-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Eval.</span>
          </button>
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
            <button
              type="button"
              onClick={() => setIsNewEvalModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm shadow-lg shadow-emerald-600/20 active:scale-95 transition-all duration-200 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Evaluación</span>
            </button>
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
                const tUpper = String(ev.tipo || '').toUpperCase();
                const isRecup = tUpper.includes('RECUP');
                const isParcial = tUpper.includes('PARCIAL') || tUpper === 'PRUEBA';
                const isTP = tUpper.includes('TP') || tUpper.includes('TRABAJO');
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
                            isParcial 
                              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20' 
                              : isTP
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                              : isRecup
                              ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20'
                              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                          }`}>
                            {ev.tipo}
                          </span>
                          {ev.formato && (
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-semibold bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">
                              {ev.formato}
                            </span>
                          )}
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
              {filteredMatrixData.length} estudiante{filteredMatrixData.length !== 1 ? 's' : ''} {studentSearchQuery.trim() ? 'encontrado' + (filteredMatrixData.length !== 1 ? 's' : '') : 'en nómina'}
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
            {filteredMatrixData.map((item, idx) => {
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-bold text-text-primary leading-tight">
                            {est.apellido}, {est.nombre}
                          </h4>
                          <RiskBadge risk={studentRiskMap.get(est.id)} compact />
                        </div>
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
                          const recup = evaluaciones.find(r => String(r.tipo || '').toUpperCase().includes('RECUP') && r.evaluacion_origen_id === ev.id);
                          const notaOriginal = getNotaValue(est.id, ev.id);
                          const estadoOriginal = getNotaEstado(est.id, ev.id);
                          const notaRecup = recup ? getNotaValue(est.id, recup.id) : null;
                          const estadoRecup = recup ? getNotaEstado(est.id, recup.id) : null;

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
                                    {ev.formato && (
                                      <span className="text-[10px] font-mono uppercase bg-slate-500/10 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-semibold border border-slate-500/20">
                                        {ev.formato}
                                      </span>
                                    )}
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
                                    Nota {String(ev.tipo || '').toUpperCase().includes('PARCIAL') ? 'Parcial' : 'Eval'}:
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditNota(est, ev)}
                                    className={`w-full min-h-[44px] px-3 py-2 rounded-xl text-sm font-mono font-bold transition-all border touch-target-44 flex items-center justify-center gap-2 active:scale-95 duration-100 ${
                                      flashingGradeKey === `${est.id}_${ev.id}` ? 'animate-flash-success' : ''
                                    } ${
                                      estadoOriginal === 'NO_ENTREGO'
                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                                        : estadoOriginal === 'AUSENTE'
                                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                                        : notaOriginal !== null
                                        ? notaOriginal >= 7
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                                          : notaOriginal >= 4
                                          ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                                          : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300'
                                        : 'bg-surface hover:bg-surface-hover text-text-muted border-dashed border-surface-border hover:border-primary/50'
                                    }`}
                                  >
                                    <Edit3 className="w-3.5 h-3.5 opacity-60" />
                                    <span>
                                      {estadoOriginal === 'NO_ENTREGO'
                                        ? 'N/E — No entregó'
                                        : estadoOriginal === 'AUSENTE'
                                        ? 'Aus. — Ausente al examen'
                                        : notaOriginal !== null
                                        ? notaOriginal
                                        : 'Sin nota — Calificar'}
                                    </span>
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
                                        estadoRecup === 'AUSENTE'
                                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800'
                                          : estadoRecup === 'NO_ENTREGO'
                                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                                          : notaRecup !== null
                                          ? 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300'
                                          : 'bg-purple-50/40 text-purple-400 border-dashed border-purple-200 dark:bg-purple-950/20'
                                      }`}
                                    >
                                      <Edit3 className="w-3.5 h-3.5 opacity-60" />
                                      <span>
                                        {estadoRecup === 'AUSENTE'
                                          ? 'R: Ausente'
                                          : estadoRecup === 'NO_ENTREGO'
                                          ? 'R: No entregó'
                                          : notaRecup !== null
                                          ? `R: ${notaRecup}`
                                          : 'R: Sin nota'}
                                      </span>
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
          <div className="overflow-x-auto touch-pan-x scrollbar-thin max-h-[75vh]">
            <table className="w-full text-left text-xs sm:text-sm border-collapse table-fixed" aria-label="Sábana de Calificaciones">
              <caption className="sr-only">Sábana general de calificaciones y condición final de estudiantes</caption>
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 backdrop-blur z-20 text-text-secondary border-b border-surface-border">
                <tr>
                  <th scope="col" className="sticky left-0 top-0 bg-slate-50 dark:bg-slate-800/90 backdrop-blur z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] px-3 sm:px-4 py-3 w-64 sm:w-72 border-r border-surface-border font-bold text-text-primary">
                    Estudiante / DNI
                  </th>
                  <th scope="col" className="px-3 py-3 text-center w-24 sm:w-28 font-mono tabular-nums">% Asist.</th>

                  {/* Main Evaluation Columns - Encabezados compactos y limpios */}
                  {mainEvaluations.map(ev => {
                    return (
                      <th scope="col" key={ev.id} className="px-3 sm:px-4 py-2.5 text-center border-l border-surface-border w-28 sm:w-36 min-w-[145px] align-top">
                        {/* Línea 1: Nombre de la evaluación */}
                        <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate" title={ev.titulo}>
                          {ev.titulo}
                        </div>

                        {/* Línea 2: Fecha de entrega */}
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5" title={ev.fecha_entrega ? `Entrega: ${formatFechaDMY(ev.fecha_entrega)}` : 'Sin fecha asignada'}>
                          {ev.fecha_entrega ? `Entrega: ${formatFechaDMY(ev.fecha_entrega)}` : 'Sin fecha'}
                        </div>

                        {/* Botones de acción inferiores: Editar, Calificar, Borrar (Touch Target 44x44px) */}
                        <div className="flex items-center justify-center gap-1 mt-1 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => handleOpenEditEvaluacion(ev)}
                            title={`Editar datos de "${ev.titulo}"`}
                            className="p-2 touch-44 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-text-muted hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenBatchGrade(ev)}
                            title={`Calificar a todo el curso en "${ev.titulo}"`}
                            className="p-2 touch-44 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                          >
                            <ListChecks className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvaluacion(ev.id, ev.titulo)}
                            title={`Eliminar "${ev.titulo}" y todas sus notas`}
                            className="p-2 touch-44 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </th>
                    );
                  })}

                  <th scope="col" className="px-4 py-3 text-center border-l border-surface-border w-32 sm:w-36 min-w-[150px] bg-slate-100 dark:bg-slate-800 font-bold">
                    Condición Final
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-surface-border">
                {filteredMatrixData.map((item, idx) => (
                  <GradeRow
                    key={item.estudiante.id}
                    item={item}
                    idx={idx}
                    mainEvaluations={mainEvaluations}
                    evaluaciones={evaluaciones}
                    flashingGradeKey={flashingGradeKey}
                    studentRisk={studentRiskMap.get(item.estudiante.id)}
                    getNotaValue={getNotaValue}
                    getNotaEstado={getNotaEstado}
                    getCondBadgeVariant={getCondBadgeVariant}
                    onOpenEditNota={handleOpenEditNota}
                    notas={notas}
                  />
                ))}
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
        subtitle={selectedStudentForNota && selectedEvalForNota ? `${selectedStudentForNota.apellido}, ${selectedStudentForNota.nombre} • ${selectedEvalForNota.titulo || selectedEvalForNota.nombre}` : ''}
      >
        <form onSubmit={handleSaveNotaSubmit} className="space-y-4">
          {(() => {
            const evalTipoUpper = String(selectedEvalForNota?.tipo || '').toUpperCase();
            const esTP = evalTipoUpper === 'TP' || evalTipoUpper.includes('TRABAJO') || evalTipoUpper.includes('PRÁCTICO') || evalTipoUpper.includes('PRACTICO');
            const esParcial = evalTipoUpper.includes('PARCIAL') || evalTipoUpper.includes('RECUP') || evalTipoUpper === 'PRUEBA';

            return (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
                    Calificación Numérica (1 a 10)
                  </label>
                  <DebouncedGradeInput
                    autoFocus
                    placeholder={
                      selectedEstadoNota === 'NO_ENTREGO'
                        ? 'No entregó (N/E) marcado'
                        : selectedEstadoNota === 'AUSENTE'
                        ? 'Ausente (Aus.) marcado'
                        : 'Ej: 7.5 (dejar vacío para borrar nota)'
                    }
                    value={inputNotaValor}
                    delay={300}
                    onKeyDown={(e) => {
                      if (e.key === 'a' || e.key === 'A') {
                        if (esParcial) {
                          e.preventDefault();
                          setSelectedEstadoNota(prev => prev === 'AUSENTE' ? null : 'AUSENTE');
                          setInputNotaValor('');
                        }
                      } else if (e.key === 'n' || e.key === 'N') {
                        if (esTP) {
                          e.preventDefault();
                          setSelectedEstadoNota(prev => prev === 'NO_ENTREGO' ? null : 'NO_ENTREGO');
                          setInputNotaValor('');
                        }
                      }
                    }}
                    onDebouncedChange={(val) => {
                      setInputNotaValor(val);
                      if (val && val.trim() !== '') {
                        setSelectedEstadoNota('CALIFICADO');
                      }
                      setIsDirty(true);
                    }}
                    className="w-full px-3.5 py-3 text-lg font-mono font-bold border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
                  />
                  <p className="text-[11px] text-text-muted mt-1.5">
                    {String(selectedEvalForNota?.tipo || '').toUpperCase().includes('RECUP') 
                      ? 'Nota de examen recuperatorio: se conserva en paralelo sin sobreescribir la nota del examen original.' 
                      : 'Escala numérica estándar reglamentaria de 1 a 10.'}
                  </p>
                </div>

                {/* Acciones de estado especial contextual */}
                <div className="pt-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono uppercase font-bold text-text-muted">
                      Estado Especial:
                    </span>
                    <span className="text-[10px] text-text-muted italic">
                      (Para instancias no aprobadas reglamentarias)
                    </span>
                  </div>

                  {esTP && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedEstadoNota === 'NO_ENTREGO') {
                          setSelectedEstadoNota(null);
                        } else {
                          setSelectedEstadoNota('NO_ENTREGO');
                          setInputNotaValor('');
                        }
                      }}
                      className={`w-full py-2.5 px-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        selectedEstadoNota === 'NO_ENTREGO'
                          ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-white shadow-sm ring-2 ring-slate-400/40'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/70'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span>Marcar como &quot;No entregó&quot;</span>
                        <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border border-slate-300 dark:border-slate-600">
                          N/E
                        </span>
                      </div>
                      <span className="text-[10px] font-mono opacity-70">
                        Atajo: [N]
                      </span>
                    </button>
                  )}

                  {esParcial && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedEstadoNota === 'AUSENTE') {
                          setSelectedEstadoNota(null);
                        } else {
                          setSelectedEstadoNota('AUSENTE');
                          setInputNotaValor('');
                        }
                      }}
                      className={`w-full py-2.5 px-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        selectedEstadoNota === 'AUSENTE'
                          ? 'bg-rose-600 text-white border-rose-600 dark:bg-rose-600 shadow-sm ring-2 ring-rose-400/40'
                          : 'bg-rose-50/60 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/40 hover:bg-rose-100/70 dark:hover:bg-rose-950/40'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        <span>Marcar como &quot;Ausente al Examen&quot;</span>
                        <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-rose-200/80 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 font-bold border border-rose-300 dark:border-rose-700">
                          Aus.
                        </span>
                      </div>
                      <span className="text-[10px] font-mono opacity-70">
                        Atajo: [A]
                      </span>
                    </button>
                  )}

                  {/* Banner explicativo según estado */}
                  {selectedEstadoNota === 'NO_ENTREGO' && (
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold">No entregó (N/E):</strong> Computa como desaprobado para regularidad y requerirá instancia de recuperatorio reglamentario.
                      </div>
                    </div>
                  )}

                  {selectedEstadoNota === 'AUSENTE' && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold">Ausente al examen (Aus.):</strong> Inasistencia computada como desaprobada con derecho a examen recuperatorio.
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-surface-border">
                  <div>
                    {selectedStudentForNota && selectedEvalForNota && (getNotaValue(selectedStudentForNota.id, selectedEvalForNota.id) !== null || getNotaEstado(selectedStudentForNota.id, selectedEvalForNota.id) !== null) && (
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
                        Borrar
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => setIsEditNotaModalOpen(false)} type="button">
                      Cancelar
                    </Button>
                    <Button type="submit" loading={savingNota}>
                      {selectedEstadoNota === 'NO_ENTREGO'
                        ? 'Guardar "No entregó"'
                        : selectedEstadoNota === 'AUSENTE'
                        ? 'Guardar "Ausente"'
                        : 'Guardar Calificación'}
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </form>
      </Modal>

      {/* Modal Nueva Evaluación */}
      <NuevaEvaluacionModal
        isOpen={isNewEvalModalOpen}
        onClose={() => setIsNewEvalModalOpen(false)}
        onSave={handleCreateEvaluacion}
        periodos={periodos}
        evaluaciones={evaluaciones}
        saving={savingEval}
      />

      {/* Modal Editar Evaluación */}
      <Modal
        isOpen={isEditEvalModalOpen}
        onClose={() => {
          setIsEditEvalModalOpen(false);
          setEditingEval(null);
        }}
        title={`Editar: ${editingEval?.titulo || editingEval?.nombre || ''}`}
        subtitle="Modifica el título, tipo, formato, fecha estipulada o consignas en Google Drive"
      >
        <form onSubmit={handleSaveEditEvaluacion} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Título o Nombre de la Evaluación *
            </label>
            <input
              type="text"
              required
              value={editEvalTitulo}
              onChange={(e) => setEditEvalTitulo(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Tipo de Evaluación *
              </label>
              <select
                value={editEvalTipo}
                onChange={(e) => setEditEvalTipo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all cursor-pointer font-medium"
              >
                <option value="Parcial">Parcial</option>
                <option value="Trabajo Práctico">Trabajo Práctico</option>
                <option value="Recuperatorio">Recuperatorio</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Formato
              </label>
              <select
                value={editEvalFormato}
                onChange={(e) => setEditEvalFormato(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all cursor-pointer font-medium"
              >
                <option value="Escrito">Escrito</option>
                <option value="Oral">Oral</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono uppercase font-semibold text-slate-700 dark:text-slate-300">
                {editEvalTipo === 'Trabajo Práctico' || editEvalTipo === 'TP'
                  ? 'Fecha de Entrega'
                  : 'Fecha Estipulada'}
              </label>
              {editEvalFechaEntrega && (
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {formatFechaDMY(editEvalFechaEntrega)}
                </span>
              )}
            </div>
            <input
              type="date"
              value={editEvalFechaEntrega}
              onChange={(e) => setEditEvalFechaEntrega(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm font-mono focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
            />
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
                    <DebouncedGradeInput
                      placeholder="—"
                      value={currentVal}
                      delay={300}
                      onDebouncedChange={(val) => {
                        setBatchGradesMap(prev => ({ ...prev, [est.id]: val }));
                        setIsDirty(true);
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
              <Button type="submit" loading={savingBatchGrades} className="whitespace-nowrap shrink-0">
                <span className="hidden sm:inline">Guardar Calificaciones</span>
                <span className="sm:hidden">Guardar</span>
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal Interactivo de Configuración Previa de Impresión */}
      <PrintGradesConfigModal
        isOpen={isPrintConfigModalOpen}
        onClose={() => setIsPrintConfigModalOpen(false)}
        evaluaciones={evaluaciones}
        onGeneratePreview={handleGeneratePreview}
        initialConfig={printConfig}
      />

      {/* Visor Unificado de Impresión de Calificaciones */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        type="calificaciones"
        title="Planilla Oficial de Calificaciones y Condiciones Finales"
        subtitle="Sábana panorámica reglamentaria para archivo institucional y Libro Matriz"
        defaultOrientation={printConfig.orientation || 'landscape'}
        data={{
          catedra: { id: catedraId, nombre: catedraName, nivel: academicLevel, modalidad },
          estudiantes,
          evaluaciones,
          notas,
          matrixData,
          criterios,
          cicloAnio: '2026',
          institucionNombre: 'INSTITUTO DE EDUCACIÓN SUPERIOR',
          docenteNombre: user?.user_metadata?.nombre_completo || user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Docente Titular',
          printConfig
        }}
      />

      {/* Botón Flotante de Guardado Rápido (Quick Action FAB) reactivo con Ctrl + S */}
      <QuickSaveFab
        onSave={handleQuickSaveGrades}
        isSaving={savingQuickGrades || savingBatchGrades || savingNota || savingEval || savingEditEval}
        isDirty={isDirty}
        hasChanges={isDirty}
        visible={isDirty && !cursadaFinalizada}
      />
    </div>
  );
}
