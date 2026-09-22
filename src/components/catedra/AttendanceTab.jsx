import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Check, 
  X, 
  Calendar as CalendarIcon, 
  Users, 
  CheckCheck, 
  Clock, 
  AlertCircle,
  Save,
  CheckCircle2,
  Percent,
  ShieldAlert,
  FileText,
  Trash2,
  BookOpen,
  ChevronDown,
  Printer,
  Pencil,
  Layers,
  Lock,
  FileSpreadsheet,
  CalendarOff
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
import AnimatedSearchBar from '../common/AnimatedSearchBar';
import EditClassModal from './EditClassModal';
import ConfirmDeleteClassModal from './ConfirmDeleteClassModal';
import QuickSaveFAB from '../common/QuickSaveFAB';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatFechaDMY, parseDMYtoYMD, getTodayYMD } from '../../lib/dateUtils';
import { calcularPorcentajeAsistencia } from '../../lib/academicLogic';
import { obtenerFeriado } from '../../utils/feriadosAcademicos';
import { DECRETO_1092_CATAMARCA } from '../../data/decreto1092Catamarca';
import LicenciasDecreto1092Table from './LicenciasDecreto1092Table';
import RiskBadge from '../common/RiskBadge';
import { calculateStudentRisk } from '../../lib/earlyWarningLogic';
import { handleAppError } from '../../utils/handleAppError';
import { exportAttendanceToExcel } from '../../lib/excel';

// Comparador memoizado para tarjeta táctil mobile
function areAttendanceCardPropsEqual(prev, next) {
  return (
    prev.disabled === next.disabled &&
    prev.est?.id === next.est?.id &&
    prev.estado === next.estado &&
    prev.isFlashing === next.isFlashing &&
    prev.asistPct === next.asistPct &&
    prev.risk === next.risk &&
    prev.est?.apellido === next.est?.apellido &&
    prev.est?.nombre === next.est?.nombre &&
    prev.est?.dni === next.est?.dni
  );
}

const AttendanceMobileCard = React.memo(function AttendanceMobileCard({
  est,
  estado,
  isFlashing,
  asistPct,
  risk,
  onToggle,
  disabled = false
}) {
  const isPresente = estado === 'PRESENTE';
  const isAusente = estado === 'AUSENTE';
  const initials = `${est.nombre?.[0] || ''}${est.apellido?.[0] || ''}`.toUpperCase();

  return (
    <div
      className={`backdrop-blur-xl bg-white/80 dark:bg-slate-900/70 p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3 transition-all ${
        isFlashing ? 'animate-flash-success' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary font-mono font-bold text-xs flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-sm font-bold text-text-primary truncate leading-tight">
                {est.apellido}, {est.nombre}
              </h4>
              <RiskBadge risk={risk} compact />
            </div>
            <p className="text-[11px] font-mono text-text-muted mt-0.5">
              DNI: {est.dni || 'S/D'}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${
            asistPct >= 75
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300/40'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300/40'
          }`}>
            {asistPct}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onToggle(est.id, 'PRESENTE')}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all touch-target-44 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            isPresente
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-extrabold'
              : 'bg-slate-100/90 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200/80 dark:border-white/10'
          }`}
        >
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>Presente</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onToggle(est.id, 'AUSENTE')}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all touch-target-44 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            isAusente
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 font-extrabold'
              : 'bg-slate-100/90 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200/80 dark:border-white/10'
          }`}
        >
          <X className="w-3.5 h-3.5 shrink-0" />
          <span>Ausente</span>
        </button>
      </div>
    </div>
  );
}, areAttendanceCardPropsEqual);

// Comparador memoizado para fila desktop
function areAttendanceRowPropsEqual(prev, next) {
  return (
    prev.disabled === next.disabled &&
    prev.index === next.index &&
    prev.est?.id === next.est?.id &&
    prev.estado === next.estado &&
    prev.isFlashing === next.isFlashing &&
    prev.risk === next.risk &&
    prev.est?.apellido === next.est?.apellido &&
    prev.est?.nombre === next.est?.nombre &&
    prev.est?.dni === next.est?.dni
  );
}

const AttendanceRow = React.memo(function AttendanceRow({
  est,
  index,
  estado,
  isFlashing,
  risk,
  onToggle,
  disabled = false
}) {
  const isPresente = estado === 'PRESENTE';
  const isAusente = estado === 'AUSENTE';

  return (
    <tr
      className={`hover:bg-slate-100/40 dark:hover:bg-white/[0.03] transition-colors ${
        isFlashing ? 'animate-flash-success' : ''
      }`}
    >
      <td className="sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] px-3 sm:px-4 py-3 border-r border-slate-200/80 dark:border-white/10 min-w-[200px] sm:min-w-[240px]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-mono text-text-muted select-none w-5 shrink-0 text-right">
              {index + 1}.
            </span>
            <span className="font-semibold text-text-primary truncate">
              {est.apellido}, {est.nombre}
            </span>
          </div>
          <RiskBadge risk={risk} compact />
        </div>
        <div className="text-[11px] font-mono text-text-muted pl-7">
          DNI: {est.dni || 'S/D'}
        </div>
      </td>
      <td className="px-3 sm:px-4 py-3">
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onToggle(est.id, 'PRESENTE')}
            className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-transform duration-100 touch-target-44 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isPresente
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'bg-slate-100 dark:bg-white/[0.05] text-text-muted hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-white/10'
            }`}
          >
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>Presente</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onToggle(est.id, 'AUSENTE')}
            className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-transform duration-100 touch-target-44 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isAusente
                ? 'bg-rose-600 text-white shadow-xs font-bold'
                : 'bg-slate-100 dark:bg-white/[0.05] text-text-muted hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200 dark:border-white/10'
            }`}
          >
            <X className="w-3.5 h-3.5 shrink-0" />
            <span>Ausente</span>
          </button>
        </div>
      </td>
    </tr>
  );
}, areAttendanceRowPropsEqual);

// Sanitizador defensivo para evitar error PostgreSQL 23502 (ERR-310: null value in column "id")
const sanitizeAttendancePayload = (itemsToSave, fallbackClaseId = null) => {
  const list = Array.isArray(itemsToSave) ? itemsToSave : [itemsToSave];
  return list.map(item => {
    const registro = {
      clase_id: item.clase_id || fallbackClaseId,
      estudiante_id: item.estudiante_id,
      estado: item.estado === 'JUSTIFICADA' ? 'AUSENTE' : (item.estado || 'AUSENTE'),
      updated_at: new Date().toISOString()
    };
    // Solo agregar id si es un UUID válido y existente (NUNCA id: null ni id: undefined)
    if (item.id && typeof item.id === 'string' && item.id.trim() !== '' && !item.id.startsWith('temp-')) {
      registro.id = item.id;
    }
    return registro;
  });
};

export default function AttendanceTab({
  catedraId,
  catedraName,
  cursadaFinalizada = false,
  onNavigateToLibroTemas
}) {
  const { user, isDemo } = useAuth();
  
  const [clases, setClases] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [inasistenciasDocente, setInasistenciasDocente] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [notas, setNotas] = useState([]);
  const [criterios, setCriterios] = useState({});
  const [loading, setLoading] = useState(true);
  const [flashingStudentId, setFlashingStudentId] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  // Unidades Temáticas del Programa Didáctico
  const [unidades, setUnidades] = useState([]);
  const [nuevaUnidadId, setNuevaUnidadId] = useState('');
  const [isQuickCreatingUnidad, setIsQuickCreatingUnidad] = useState(false);
  const [quickUnidadNum, setQuickUnidadNum] = useState(1);
  const [quickUnidadTitulo, setQuickUnidadTitulo] = useState('');
  const [savingQuickUnit, setSavingQuickUnit] = useState(false);

  // Mapa de estadísticas y porcentaje acumulado de asistencia por estudiante
  const studentStatsMap = React.useMemo(() => {
    const safeClases = clases ?? [];
    const safeAsistencias = asistencias ?? [];
    const safeEstudiantes = estudiantes ?? [];
    const safeInasistencias = inasistenciasDocente ?? [];

    // Salvaguarda RAM: Excluir feriados y clases no computables del denominador
    const safeClasesComputables = safeClases.filter(
      c => !obtenerFeriado(c.fecha) && c.es_computable !== false
    );
    const totalClases = safeClasesComputables.length;
    const clasesConLicencia = safeInasistencias.filter(
      i => i.tipo === 'LICENCIA' && safeClasesComputables.some(c => c.fecha === i.fecha)
    ).length;

    const map = new Map();
    safeEstudiantes.forEach(est => {
      if (!est?.id) return;
      const studentAsist = safeAsistencias.filter(a => {
        if (a.estudiante_id !== est.id) return false;
        const match = safeClases.find(c => c.id === a.clase_id);
        if (match && (obtenerFeriado(match.fecha) || match.es_computable === false)) return false;
        return true;
      });
      const pct = calcularPorcentajeAsistencia(studentAsist, totalClases, clasesConLicencia);
      map.set(est.id, pct);
    });
    return map;
  }, [estudiantes, asistencias, clases, inasistenciasDocente]);

  // Mapa reactivo del Semáforo de Riesgo por estudiante
  const studentRiskMap = React.useMemo(() => {
    const safeEstudiantes = estudiantes ?? [];
    const map = new Map();
    safeEstudiantes.forEach(est => {
      if (!est?.id) return;
      const risk = calculateStudentRisk(est.id, {
        asistencias: asistencias ?? [],
        clases: clases ?? [],
        inasistenciasDocente: inasistenciasDocente ?? [],
        evaluaciones: evaluaciones ?? [],
        notas: notas ?? [],
        criterios: criterios ?? {}
      });
      map.set(est.id, risk);
    });
    return map;
  }, [estudiantes, asistencias, clases, inasistenciasDocente, evaluaciones, notas, criterios]);

  // Retroalimentación háptica en dispositivos móviles táctiles
  const triggerHapticFeedback = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(25);
      } catch (_) {}
    }
  };

  const [selectedClaseId, setSelectedClaseId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState(new Date().toISOString().split('T')[0]);
  const [nuevoTema, setNuevoTema] = useState('');
  const [savingClase, setSavingClase] = useState(false);

  // Clase actualmente seleccionada (declarada antes de cualquier hook o cálculo derivado)
  const activeClase = (clases ?? []).find(c => c.id === selectedClaseId) || (clases ?? [])[0];

  // Detección normativa de jornada no laborable (Feriado Nacional / Provincial)
  const feriadoDetectado = activeClase?.fecha ? obtenerFeriado(activeClase.fecha) : null;

  // Función de estado de asistencia de estudiante (declarada antes de filteredEstudiantes)
  const getEstado = (estudianteId) => {
    if (!activeClase) return 'AUSENTE';
    const record = (asistencias ?? []).find(
      a => a.clase_id === activeClase.id && a.estudiante_id === estudianteId
    );
    return record?.estado || 'AUSENTE';
  };

  // Estados de Búsqueda Rápida y Filtros de Asistencia
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState('TODOS'); // 'TODOS' | 'AUSENTES' | 'RIESGO' | 'AMBAR' | 'VERDE'

  // Resumen de alumnos por nivel del Semáforo de Riesgo RAM
  const riskCounts = React.useMemo(() => {
    let verde = 0;
    let ambar = 0;
    let critico = 0;
    (estudiantes ?? []).forEach(est => {
      const risk = studentRiskMap.get(est.id);
      const level = risk?.level;
      if (level === 'RAM_RISK' || level === 'RED') {
        critico++;
      } else if (level === 'AMBER') {
        ambar++;
      } else {
        verde++;
      }
    });
    return { verde, ambar, critico };
  }, [estudiantes, studentRiskMap]);

  // Avance del Programa Didáctico (Unidades dictadas)
  const programaMetrics = React.useMemo(() => {
    const unidadesDictadasIds = new Set((clases ?? []).filter(c => c.unidad_id).map(c => c.unidad_id));
    const totalUnidades = unidades.length;
    const dictadasCount = unidadesDictadasIds.size;
    const progresoPct = totalUnidades > 0 ? Math.min(100, Math.round((dictadasCount / totalUnidades) * 100)) : 0;
    const currentUnit = (unidades ?? []).find(u => u.id === activeClase?.unidad_id) || unidades[0];
    return {
      totalUnidades,
      dictadasCount,
      progresoPct,
      currentUnit
    };
  }, [clases, unidades, activeClase]);

  // Total de alumnos en riesgo (< 75% de asistencia)
  const totalEnRiesgo = React.useMemo(() => {
    return (estudiantes ?? []).filter(e => (studentStatsMap.get(e?.id) ?? 100) < 75).length;
  }, [estudiantes, studentStatsMap]);

  // Normalizador de búsqueda insensible a tildes y diacríticos
  const normalizeSearchText = (text) => {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  // Lista filtrada de estudiantes según búsqueda y píldora de filtro
  const filteredEstudiantes = React.useMemo(() => {
    const rawQuery = (studentSearchQuery || '').trim();
    const normalizedQuery = normalizeSearchText(rawQuery);
    const digitsOnlyQuery = rawQuery.replace(/\D/g, '');

    return (estudiantes ?? []).filter(est => {
      if (!est) return false;
      // 1. Filtro por píldoras y categorías del Semáforo RAM
      if (attendanceFilter === 'AUSENTES') {
        const estado = getEstado(est.id);
        if (estado !== 'AUSENTE') return false;
      } else if (attendanceFilter === 'RIESGO') {
        const risk = studentRiskMap.get(est.id);
        const asistPct = studentStatsMap.get(est.id) ?? 100;
        if (risk?.level !== 'RAM_RISK' && risk?.level !== 'RED' && asistPct >= 70) return false;
      } else if (attendanceFilter === 'AMBAR') {
        const risk = studentRiskMap.get(est.id);
        if (risk?.level !== 'AMBER') return false;
      } else if (attendanceFilter === 'VERDE') {
        const risk = studentRiskMap.get(est.id);
        if (risk?.level !== 'GREEN' && risk?.level !== undefined) return false;
      }

      // 2. Filtro por texto si hay búsqueda
      if (!normalizedQuery) return true;

      const normApellido = normalizeSearchText(est.apellido);
      const normNombre = normalizeSearchText(est.nombre);
      const normFullName1 = `${normApellido} ${normNombre}`;
      const normFullName2 = `${normNombre} ${normApellido}`;

      const matchApellido = normApellido.includes(normalizedQuery);
      const matchNombre = normNombre.includes(normalizedQuery);
      const matchFullName = normFullName1.includes(normalizedQuery) || normFullName2.includes(normalizedQuery);

      const rawDni = String(est.dni || '');
      const digitsOnlyDni = rawDni.replace(/\D/g, '');
      const matchDni = rawDni.toLowerCase().includes(normalizedQuery) ||
        (digitsOnlyQuery.length > 0 && digitsOnlyDni.includes(digitsOnlyQuery));

      return matchApellido || matchNombre || matchFullName || matchDni;
    });
  }, [estudiantes, studentSearchQuery, attendanceFilter, asistencias, activeClase, studentStatsMap, studentRiskMap]);

  // Estados Modal Edición Rápida y Eliminación Segura de Clase
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [isDeleteClassModalOpen, setIsDeleteClassModalOpen] = useState(false);
  const [deleteClassCount, setDeleteClassCount] = useState(0);
  const [savingEditClass, setSavingEditClass] = useState(false);
  const [deletingClass, setDeletingClass] = useState(false);

  // Modal Inasistencia Docente
  const [isInasistenciaModalOpen, setIsInasistenciaModalOpen] = useState(false);
  const [fechaInasistencia, setFechaInasistencia] = useState(new Date().toISOString().split('T')[0]);
  const [tipoInasistencia, setTipoInasistencia] = useState('LICENCIA');
  const [articuloLicencia, setArticuloLicencia] = useState('Art. 17° - Afecciones Comunes de Corto Tratamiento');
  const [otroArticulo, setOtroArticulo] = useState('');
  const [obsInasistencia, setObsInasistencia] = useState('');
  const [savingInasistencia, setSavingInasistencia] = useState(false);

  // Estados para Tabla Resumen Decreto Acuerdo N° 1092 Catamarca (Modal Selector)
  const [isDecretoModalOpen, setIsDecretoModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [savingQuickAttendance, setSavingQuickAttendance] = useState(false);

  // Opciones completas de artículos oficiales según Decreto Acuerdo N° 1092/2015
  const articuloOptions = React.useMemo(() => [
    ...DECRETO_1092_CATAMARCA.map(art => ({
      value: `${art.numero} - ${art.titulo}`,
      label: `${art.numero} - ${art.titulo}`,
      badge: art.conGoce.toLowerCase().includes('con goce') ? 'Con goce' : undefined
    })),
    { value: 'OTRO', label: 'Otro artículo o motivo específico...' }
  ], []);

  useEffect(() => {
    fetchData();
  }, [catedraId]);

  async function fetchData() {
    setLoading(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        // 1. Clases
        const { data: cData } = await supabase
          .from('clases')
          .select('*')
          .eq('catedra_id', catedraId)
          .order('fecha', { ascending: false });

        // 2. Estudiantes inscriptos (consulta normalizada y defensiva)
        const { data: inscData } = await supabase
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
          .eq('catedra_id', catedraId);

        const estList = (inscData || [])
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

        // 3. Asistencias
        const { data: aData } = await supabase
          .from('asistencias')
          .select('*')
          .in('clase_id', (cData || []).map(c => c.id));

        // 4. Inasistencias Docente
        const { data: inasistData } = await supabase
          .from('inasistencias_docente')
          .select('*')
          .eq('catedra_id', catedraId);

        // 5. Evaluaciones, Notas y Criterios (para Semáforo de Riesgo)
        const { data: evData } = await supabase
          .from('evaluaciones')
          .select('*')
          .eq('catedra_id', catedraId);
        setEvaluaciones(evData || []);

        const evIds = (evData || []).map(e => e.id);
        if (evIds.length > 0) {
          const { data: nData } = await supabase
            .from('notas')
            .select('*')
            .in('evaluacion_id', evIds);
          setNotas(nData || []);
        } else {
          setNotas([]);
        }

        try {
          const { data: critData } = await supabase
            .from('criterios_evaluacion')
            .select('*')
            .eq('catedra_id', catedraId)
            .maybeSingle();
          if (critData) setCriterios(critData);
        } catch (_) {}

        // 6. Unidades Temáticas del Programa
        try {
          const { data: uData, error: uErr } = await supabase
            .from('unidades_tematicas')
            .select('*')
            .eq('catedra_id', catedraId)
            .order('numero', { ascending: true });
          if (!uErr && uData) {
            setUnidades(uData);
          } else {
            const storedU = localStorage.getItem(`unidades_tematicas_${catedraId}`);
            if (storedU) setUnidades(JSON.parse(storedU));
          }
        } catch (_) {
          const storedU = localStorage.getItem(`unidades_tematicas_${catedraId}`);
          if (storedU) setUnidades(JSON.parse(storedU));
        }

        const cls = cData || [];
        setClases(cls);
        setEstudiantes(estList);
        setAsistencias(aData || []);
        setInasistenciasDocente(inasistData || []);
        if (cls.length > 0 && !selectedClaseId) {
          setSelectedClaseId(cls[0].id);
        }
      } else {
        // Demo mode fallback
        const storedClases = localStorage.getItem(`clases_${catedraId}`);
        const storedEst = localStorage.getItem(`estudiantes_${catedraId}`);
        const storedAsist = localStorage.getItem(`asistencias_${catedraId}`);
        const storedInasist = localStorage.getItem(`inasistencias_docente_${catedraId}`);
        const storedUnidades = localStorage.getItem(`unidades_tematicas_${catedraId}`);

        let cls = storedClases ? JSON.parse(storedClases) : [
          { id: 'clase-1', catedra_id: catedraId, fecha: '2026-03-02', tema: 'Presentación de la Cátedra y Pautas', unidad_id: 'unit-1' },
          { id: 'clase-2', catedra_id: catedraId, fecha: '2026-03-09', tema: 'Fundamentos y Arquitectura de Datos', unidad_id: 'unit-1' }
        ];

        let uList = storedUnidades ? JSON.parse(storedUnidades) : [
          { id: 'unit-1', catedra_id: catedraId, numero: 1, titulo: 'Fundamentos y Arquitectura de Datos' },
          { id: 'unit-2', catedra_id: catedraId, numero: 2, titulo: 'Diseño y Modelado Conceptual' }
        ];

        let estList = storedEst ? JSON.parse(storedEst) : [
          { id: 'est-1', dni: '40111222', apellido: 'Álvarez', nombre: 'Martín' },
          { id: 'est-2', dni: '39444555', apellido: 'Benítez', nombre: 'Lucía' },
          { id: 'est-3', dni: '41888999', apellido: 'Castillo', nombre: 'Ignacio' },
          { id: 'est-4', dni: '38222333', apellido: 'Domínguez', nombre: 'Valentina' },
          { id: 'est-5', dni: '42333444', apellido: 'Fernández', nombre: 'Santiago' }
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

        let inasist = storedInasist ? JSON.parse(storedInasist) : [];

        setClases(cls);
        setUnidades(uList);
        setEstudiantes(estList);
        setAsistencias(asist);
        setInasistenciasDocente(inasist);
        if (cls.length > 0) setSelectedClaseId(cls[0].id);

        localStorage.setItem(`clases_${catedraId}`, JSON.stringify(cls));
        localStorage.setItem(`unidades_tematicas_${catedraId}`, JSON.stringify(uList));
        localStorage.setItem(`estudiantes_${catedraId}`, JSON.stringify(estList));
        localStorage.setItem(`asistencias_${catedraId}`, JSON.stringify(asist));
        localStorage.setItem(`inasistencias_docente_${catedraId}`, JSON.stringify(inasist));
      }
    } catch (err) {
      handleAppError(err, 'AttendanceTab / Cargar datos asistencia');
    } finally {
      setLoading(false);
    }
  }

  // Creación rápida de unidad temática al vuelo
  const handleQuickCreateUnidad = async ({ numero, titulo }) => {
    try {
      const payload = {
        catedra_id: catedraId,
        docente_id: user?.id || 'demo-user',
        numero: Number(numero) || (unidades.length + 1),
        titulo: titulo.trim(),
        descripcion: ''
      };

      let newUnit = null;
      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('unidades_tematicas')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        newUnit = data;
      } else {
        newUnit = { ...payload, id: 'unit-' + Date.now() };
      }

      const updated = [...unidades, newUnit].sort((a, b) => Number(a.numero) - Number(b.numero));
      setUnidades(updated);
      localStorage.setItem(`unidades_tematicas_${catedraId}`, JSON.stringify(updated));
      toast.success(`Unidad ${newUnit.numero}: ${newUnit.titulo} creada.`);
      return newUnit;
    } catch (err) {
      console.warn('Fallback quick create unit locally:', err);
      const fallbackUnit = {
        id: 'unit-' + Date.now(),
        catedra_id: catedraId,
        numero: Number(numero) || (unidades.length + 1),
        titulo: titulo.trim(),
        descripcion: ''
      };
      const updated = [...unidades, fallbackUnit].sort((a, b) => Number(a.numero) - Number(b.numero));
      setUnidades(updated);
      localStorage.setItem(`unidades_tematicas_${catedraId}`, JSON.stringify(updated));
      toast.success(`Unidad ${fallbackUnit.numero} creada (Modo Local).`);
      return fallbackUnit;
    }
  };

  const handleCreateClase = async (e) => {
    e.preventDefault();
    if (cursadaFinalizada) {
      toast.error('El cursado está finalizado. No se pueden crear nuevas clases.');
      return;
    }
    if (!nuevaFecha) return;
    setSavingClase(true);
    try {
      if (isSupabaseConfigured && !isDemo && !user?.id) {
        throw new Error('Sesión no válida. Inicia sesión nuevamente.');
      }
      const fechaIso = parseDMYtoYMD(nuevaFecha);
      const fechaDmy = formatFechaDMY(nuevaFecha);

      const feriadoNuevaClase = obtenerFeriado(fechaIso);
      if (feriadoNuevaClase) {
        toast.error(`La fecha seleccionada (${fechaDmy}) coincide con el feriado "${feriadoNuevaClase.nombre}". No se pueden registrar clases presenciales ni asistencias en feriados.`);
        setSavingClase(false);
        return;
      }

      const newClaseObj = {
        catedra_id: catedraId,
        fecha: fechaIso,
        tema: nuevoTema.trim() || 'Clase Regular',
        unidad_id: nuevaUnidadId || null
      };

      let claseId = null;
      if (isSupabaseConfigured && !isDemo) {
        let { data, error } = await supabase
          .from('clases')
          .insert(newClaseObj)
          .select()
          .single();

        if (error && (error.message?.includes('column') || error.code === '42703')) {
          // Fallback si la columna unidad_id aún no existe
          const { data: fbData, error: fbErr } = await supabase
            .from('clases')
            .insert({
              catedra_id: catedraId,
              fecha: fechaIso,
              tema: nuevoTema.trim() || 'Clase Regular'
            })
            .select()
            .single();
          if (fbErr) throw fbErr;
          data = { ...fbData, unidad_id: nuevaUnidadId || null };
        } else if (error) {
          throw error;
        }

        claseId = data.id;
        const updated = [data, ...clases];
        setClases(updated);
        setSelectedClaseId(data.id);
        localStorage.setItem(`clases_${catedraId}`, JSON.stringify(updated));
      } else {
        const created = { ...newClaseObj, id: 'clase-' + Date.now() };
        claseId = created.id;
        const updated = [created, ...clases];
        setClases(updated);
        setSelectedClaseId(created.id);
        localStorage.setItem(`clases_${catedraId}`, JSON.stringify(updated));
      }

      // Automatically mark all currently enrolled students as PRESENTE
      if (claseId && estudiantes.length > 0) {
        const defaultAttendance = estudiantes.map(e => ({
          clase_id: claseId,
          estudiante_id: e.id,
          estado: 'PRESENTE'
        }));

        if (isSupabaseConfigured && !isDemo) {
          const payload = sanitizeAttendancePayload(defaultAttendance);
          const { data, error: asistError } = await supabase
            .from('asistencias')
            .upsert(payload, { onConflict: 'clase_id, estudiante_id' })
            .select();

          if (asistError) console.warn('Aviso al autocompletar asistencias:', asistError);
          if (data && Array.isArray(data)) {
            setAsistencias(prev => [...prev, ...data]);
          } else {
            setAsistencias(prev => [...prev, ...defaultAttendance]);
          }
        } else {
          const prevStored = JSON.parse(localStorage.getItem(`asistencias_${catedraId}`) || '[]');
          localStorage.setItem(`asistencias_${catedraId}`, JSON.stringify([...prevStored, ...defaultAttendance]));
          setAsistencias(prev => [...prev, ...defaultAttendance]);
        }
      }

      toast.success(`Clase del ${fechaDmy} creada con éxito.`);
      setIsModalOpen(false);
      setNuevoTema('');
      setNuevaUnidadId('');
      setIsQuickCreatingUnidad(false);
    } catch (err) {
      handleAppError(err, 'AttendanceTab / Crear Clase', user);
    } finally {
      setSavingClase(false);
    }
  };

  // Toggle or set state memoizado con useCallback para evitar re-render de filas no afectadas
  const handleToggle = React.useCallback(async (estudianteId, nuevoEstado) => {
    if (cursadaFinalizada) {
      toast.error('El cursado está finalizado. La asistencia no puede modificarse.');
      return;
    }
    if (!activeClase) return;
    if (feriadoDetectado || (activeClase.fecha && obtenerFeriado(activeClase.fecha))) {
      toast.error(`No es posible asentar asistencias el día ${formatFechaDMY(activeClase.fecha)}: Jornada de Feriado.`);
      return;
    }
    triggerHapticFeedback();
    setIsDirty(true);
    setFlashingStudentId(estudianteId);
    setTimeout(() => setFlashingStudentId(null), 800);

    const existing = (asistencias ?? []).find(
      a => a.clase_id === activeClase.id && a.estudiante_id === estudianteId
    );

    // Preserve previous state for rollback on error
    let previousState = [];
    setAsistencias(prev => {
      previousState = prev;
      const filtered = prev.filter(
        a => !(a.clase_id === activeClase.id && a.estudiante_id === estudianteId)
      );
      return [...filtered, { 
        id: existing?.id,
        clase_id: activeClase.id, 
        estudiante_id: estudianteId, 
        estado: nuevoEstado 
      }];
    });

    try {
      if (isSupabaseConfigured && !isDemo) {
        if (!user?.id) {
          throw new Error('Sesión de usuario requerida para registrar asistencias.');
        }

        const registro = {
          clase_id: activeClase.id,
          estudiante_id: estudianteId,
          estado: nuevoEstado || 'AUSENTE',
          updated_at: new Date().toISOString()
        };
        // Solo agregar id si es un UUID válido y existente (NUNCA null ni undefined)
        if (existing?.id && typeof existing.id === 'string' && existing.id.trim() !== '' && !existing.id.startsWith('temp-')) {
          registro.id = existing.id;
        }

        const { data, error } = await supabase
          .from('asistencias')
          .upsert([registro], { onConflict: 'clase_id, estudiante_id' })
          .select()
          .maybeSingle();

        if (error) {
          handleAppError(error, 'AttendanceTab / Guardar Asistencia', user);
          return;
        }

        if (data?.id) {
          setAsistencias(prev => prev.map(a => 
            (a.clase_id === activeClase.id && a.estudiante_id === estudianteId) ? data : a
          ));
        }
      } else {
        setAsistencias(curr => {
          localStorage.setItem(`asistencias_${catedraId}`, JSON.stringify(curr));
          return curr;
        });
      }
    } catch (err) {
      // Revert optimistic state
      setAsistencias(previousState);
      handleAppError(err, 'AttendanceTab / Guardar Asistencia', user);
    }
  }, [cursadaFinalizada, activeClase, isDemo, user, catedraId, asistencias]);

  const handleMarcarTodosPresentes = async () => {
    if (cursadaFinalizada) {
      toast.error('El cursado está finalizado. La asistencia no puede modificarse.');
      return;
    }
    if (!activeClase || estudiantes.length === 0) return;
    if (feriadoDetectado || (activeClase.fecha && obtenerFeriado(activeClase.fecha))) {
      toast.error(`No es posible asentar asistencias el día ${formatFechaDMY(activeClase.fecha)}: Jornada de Feriado.`);
      return;
    }
    triggerHapticFeedback();
    setIsDirty(true);
    setFlashingStudentId('ALL');
    setTimeout(() => setFlashingStudentId(null), 800);

    const previousState = [...asistencias];
    const itemsToSave = estudiantes.map(e => {
      const existing = (asistencias ?? []).find(
        a => a.clase_id === activeClase.id && a.estudiante_id === e.id
      );
      return {
        id: existing?.id,
        clase_id: activeClase.id,
        estudiante_id: e.id,
        estado: 'PRESENTE'
      };
    });

    const otherClases = asistencias.filter(a => a.clase_id !== activeClase.id);
    const updated = [...otherClases, ...itemsToSave];
    setAsistencias(updated);

    try {
      if (isSupabaseConfigured && !isDemo) {
        if (!user?.id) {
          throw new Error('Sesión requerida.');
        }

        const payload = itemsToSave.map(item => {
          const registro = {
            clase_id: activeClase.id,
            estudiante_id: item.estudiante_id,
            estado: 'PRESENTE',
            updated_at: new Date().toISOString()
          };
          if (item.id && typeof item.id === 'string' && item.id.trim() !== '' && !item.id.startsWith('temp-')) {
            registro.id = item.id;
          }
          return registro;
        });

        const { data, error } = await supabase
          .from('asistencias')
          .upsert(payload, { onConflict: 'clase_id, estudiante_id' })
          .select();

        if (error) {
          handleAppError(error, 'AttendanceTab / Marcar Todos Presentes', user);
          return;
        }

        if (data && Array.isArray(data)) {
          setAsistencias(prev => {
            const others = (prev ?? []).filter(a => a.clase_id !== activeClase.id);
            return [...others, ...data];
          });
        }
      } else {
        localStorage.setItem(`asistencias_${catedraId}`, JSON.stringify(updated));
      }

      toast.success('Todos los estudiantes marcados como presentes.');
    } catch (err) {
      setAsistencias(previousState);
      handleAppError(err, 'AttendanceTab / Marcar Todos Presentes', user);
    }
  };

  // Guardado rápido y sincronización de asistencias de la clase activa (FAB / Ctrl + S)
  const handleQuickSaveAttendance = async () => {
    if (cursadaFinalizada) {
      toast.error('El cursado está finalizado. La asistencia no puede modificarse.');
      return;
    }
    if (!activeClase) {
      toast.info('Selecciona una clase para registrar o guardar la asistencia.');
      return;
    }
    if (feriadoDetectado || (activeClase.fecha && obtenerFeriado(activeClase.fecha))) {
      toast.error(`No es posible asentar asistencias el día ${formatFechaDMY(activeClase.fecha)}: Jornada de Feriado.`);
      return;
    }

    setSavingQuickAttendance(true);
    try {
      const itemsToSave = estudiantes.map(item => {
        const existing = (asistencias ?? []).find(
          a => a.clase_id === activeClase.id && a.estudiante_id === item.id
        );
        return {
          id: existing?.id,
          clase_id: activeClase.id,
          estudiante_id: item.id,
          estado: existing?.estado || 'AUSENTE'
        };
      });

      const payload = itemsToSave.map(item => {
        const registro = {
          clase_id: activeClase.id,
          estudiante_id: item.estudiante_id,
          estado: item.estado || 'AUSENTE',
          updated_at: new Date().toISOString()
        };
        // Solo agregar id si es un UUID válido y existente (NUNCA null ni undefined)
        if (item.id && typeof item.id === 'string' && item.id.trim() !== '' && !item.id.startsWith('temp-')) {
          registro.id = item.id;
        }
        return registro;
      });

      if (payload.length > 0 && isSupabaseConfigured && !isDemo) {
        if (!user?.id) {
          throw new Error('Sesión de usuario requerida.');
        }

        const { data, error } = await supabase
          .from('asistencias')
          .upsert(payload, { onConflict: 'clase_id, estudiante_id' })
          .select();

        if (error) {
          handleAppError(error, 'AttendanceTab / Guardado Rápido Asistencia', user);
          return;
        }

        if (data && Array.isArray(data)) {
          setAsistencias(prev => {
            const others = (prev ?? []).filter(a => a.clase_id !== activeClase.id);
            return [...others, ...data];
          });
        }
      }

      localStorage.setItem(`asistencias_${catedraId}`, JSON.stringify(asistencias));
      setIsDirty(false);
      toast.success(`Asistencia de la clase del ${formatFechaDMY(activeClase.fecha)} guardada correctamente.`);
    } catch (err) {
      handleAppError(err, 'AttendanceTab / Guardado Rápido Asistencia', user);
    } finally {
      setSavingQuickAttendance(false);
    }
  };

  const inasistenciaActual = activeClase
    ? inasistenciasDocente.find(i => i.fecha === activeClase.fecha)
    : null;

  const handleSaveInasistencia = async (e) => {
    e.preventDefault();
    const targetFecha = activeClase ? activeClase.fecha : fechaInasistencia;
    if (!targetFecha) {
      toast.error('Por favor especifica una fecha válida.');
      return;
    }

    let artFinal = null;
    if (tipoInasistencia === 'LICENCIA') {
      artFinal = articuloLicencia === 'OTRO' ? otroArticulo.trim() : articuloLicencia;
      if (!artFinal) {
        toast.error('Por favor especifica el artículo de licencia.');
        return;
      }
    }

    setSavingInasistencia(true);
    try {
      if (isSupabaseConfigured && !isDemo && !user?.id) {
        throw new Error('Usuario no autenticado.');
      }

      const payload = {
        catedra_id: catedraId,
        docente_id: user?.id,
        fecha: targetFecha,
        tipo: tipoInasistencia,
        articulo_licencia: artFinal,
        observaciones: obsInasistencia.trim()
      };

      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('inasistencias_docente')
          .upsert(payload, { onConflict: 'catedra_id, fecha' })
          .select()
          .single();

        if (error) throw error;
        const other = inasistenciasDocente.filter(i => i.fecha !== targetFecha);
        setInasistenciasDocente([...other, data]);
      } else {
        const withId = { ...payload, id: 'inasist-' + Date.now() };
        const other = inasistenciasDocente.filter(i => i.fecha !== targetFecha);
        const updated = [...other, withId];
        setInasistenciasDocente(updated);
        localStorage.setItem(`inasistencias_docente_${catedraId}`, JSON.stringify(updated));
      }

      toast.success(`Inasistencia docente registrada para el ${targetFecha}.`);
      setIsInasistenciaModalOpen(false);
    } catch (err) {
      handleAppError(err, 'AttendanceTab / Registrar Inasistencia Docente', user);
    } finally {
      setSavingInasistencia(false);
    }
  };

  const handleDeleteInasistencia = async () => {
    if (!activeClase || !inasistenciaActual) return;
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { error } = await supabase
          .from('inasistencias_docente')
          .delete()
          .eq('catedra_id', catedraId)
          .eq('fecha', activeClase.fecha);

        if (error) throw error;
      }

      const updated = inasistenciasDocente.filter(i => i.fecha !== activeClase.fecha);
      setInasistenciasDocente(updated);
      if (!isSupabaseConfigured || isDemo) {
        localStorage.setItem(`inasistencias_docente_${catedraId}`, JSON.stringify(updated));
      }

      toast.success('Inasistencia docente anulada.');
    } catch (err) {
      handleAppError(err, 'AttendanceTab / Anular Inasistencia Docente', user);
    }
  };

  // =========================================================================
  // GESTIÓN RÁPIDA DE TEMA, DETALLES Y ELIMINACIÓN SEGURA DE CLASE
  // =========================================================================
  const handleOpenEditClass = () => {
    if (!activeClase) return;
    setIsEditClassModalOpen(true);
  };

  const handleSaveEditClass = async (updatedData) => {
    if (!activeClase?.id) return;
    setSavingEditClass(true);
    try {
      const payload = {
        fecha: updatedData.fecha,
        tema: updatedData.tema.trim(),
        unidad_id: updatedData.unidad_id || null,
        caracter_clase: updatedData.caracter_clase,
        horas_catedra: updatedData.horas_catedra,
        observaciones: updatedData.observaciones?.trim() || null
      };

      if (isSupabaseConfigured && !isDemo) {
        let { error } = await supabase
          .from('clases')
          .update(payload)
          .eq('id', activeClase.id);

        // Fallback si la columna caracter_clase o unidad_id no existen aún
        if (error && (error.message?.includes('column') || error.code === '42703')) {
          const fallbackPayload = {
            fecha: updatedData.fecha,
            tema: updatedData.tema.trim(),
            unidad_id: updatedData.unidad_id || null,
            caracter: updatedData.caracter_clase,
            horas_catedra: updatedData.horas_catedra,
            observaciones: updatedData.observaciones?.trim() || null
          };
          let fbRes = await supabase
            .from('clases')
            .update(fallbackPayload)
            .eq('id', activeClase.id);
          
          if (fbRes.error) {
            const minRes = await supabase
              .from('clases')
              .update({ fecha: updatedData.fecha, tema: updatedData.tema.trim() })
              .eq('id', activeClase.id);
            if (minRes.error) throw minRes.error;
          }
        } else if (error) {
          throw error;
        }
      }

      // Sincronización reactiva del estado local
      const updatedClases = clases.map(c => 
        c.id === activeClase.id 
          ? { ...c, ...payload } 
          : c
      );
      updatedClases.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setClases(updatedClases);
      localStorage.setItem(`clases_${catedraId}`, JSON.stringify(updatedClases));

      toast.success('Detalles de clase actualizados correctamente');
      setIsEditClassModalOpen(false);
    } catch (err) {
      handleAppError(err, 'AttendanceTab / Actualizar Clase', user);
    } finally {
      setSavingEditClass(false);
    }
  };

  const handleRequestDeleteClass = async () => {
    if (!activeClase?.id) return;
    setIsEditClassModalOpen(false);
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { count, error } = await supabase
          .from('asistencias')
          .select('*', { count: 'exact', head: true })
          .eq('clase_id', activeClase.id);
        
        setDeleteClassCount(count ?? 0);
      } else {
        const count = asistencias.filter(a => a.clase_id === activeClase.id).length;
        setDeleteClassCount(count);
      }
    } catch (err) {
      console.warn('Error counting asistencias for pre-delete check:', err);
      setDeleteClassCount(0);
    }
    setIsDeleteClassModalOpen(true);
  };

  const handleConfirmDeleteClass = async () => {
    if (!activeClase?.id) return;
    setDeletingClass(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        // En Supabase: borrar asistencias asociadas y la sesión de clase
        await supabase
          .from('asistencias')
          .delete()
          .eq('clase_id', activeClase.id);

        const { error } = await supabase
          .from('clases')
          .delete()
          .eq('id', activeClase.id);

        if (error) throw error;
      }

      const remainingClases = clases.filter(c => c.id !== activeClase.id);
      const remainingAsist = asistencias.filter(a => a.clase_id !== activeClase.id);
      setClases(remainingClases);
      setAsistencias(remainingAsist);

      localStorage.setItem(`clases_${catedraId}`, JSON.stringify(remainingClases));
      localStorage.setItem(`asistencias_${catedraId}`, JSON.stringify(remainingAsist));

      // Reasignación automática de clase seleccionada
      if (remainingClases.length > 0) {
        setSelectedClaseId(remainingClases[0].id);
      } else {
        setSelectedClaseId('');
      }

      toast.success('Clase y registros de asistencia eliminados correctamente.');
      setIsDeleteClassModalOpen(false);
    } catch (err) {
      handleAppError(err, 'AttendanceTab / Eliminar Clase', user);
    } finally {
      setDeletingClass(false);
    }
  };

  const presentesCount = estudiantes.filter(e => getEstado(e.id) === 'PRESENTE').length;
  const ausentesCount = estudiantes.filter(e => getEstado(e.id) === 'AUSENTE').length;
  const presentismoPct = estudiantes.length > 0 
    ? ((presentesCount / estudiantes.length) * 100).toFixed(1) 
    : 0;

  const handleExportExcel = () => {
    try {
      if (estudiantes.length === 0) {
        toast.info('No hay estudiantes registrados en esta cátedra para exportar.');
        return;
      }
      exportAttendanceToExcel(
        { nombre: catedraName },
        estudiantes,
        clases,
        asistencias,
        inasistenciasDocente,
        studentStatsMap
      );
      toast.success('Planilla de asistencias exportada a Excel (.xlsx) correctamente.');
    } catch (err) {
      handleAppError(err, 'AttendanceTab / Exportar Excel', user);
    }
  };

  if (loading) {
    return (
      <div className="py-6 space-y-4">
        <SkeletonTable rows={5} cols={3} />
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
            <span className="font-bold">Cursado finalizado:</span> La toma de asistencia diaria se encuentra cerrada para esta cursada. Los registros se exhiben en modo solo lectura.
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LAYOUT PRINCIPAL BENTO ASIMÉTRICO 7 / 5                                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================================= */}
        {/* COLUMNA IZQUIERDA (lg:col-span-7): TOMA Y REGISTRO DE ASISTENCIA            */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
            {/* 1. Cabecera de la Sesión de Asistencia Actual */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      Sesión de Asistencia Actual
                    </h2>
                  </div>
                  {activeClase ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {formatFechaDMY(activeClase.fecha)} — {activeClase.tema || 'Clase ordinaria'}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic mt-0.5">
                      No hay clases registradas
                    </p>
                  )}
                </div>
              </div>

              {/* Badge activo de estado de edición */}
              {activeClase && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-xs font-bold font-mono shrink-0 self-start sm:self-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Modificando asistencia del {formatFechaDMY(activeClase.fecha)}</span>
                </div>
              )}
            </div>

            {/* 2. Selector de clase y Botón Editar Tema */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex-1 min-w-0">
                {clases.length === 0 ? (
                  <span className="text-xs font-medium text-slate-400">
                    No hay clases registradas aún. Pulsa [+ Clase] para iniciar.
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <CustomSelect
                      value={activeClase?.id || ''}
                      onChange={(val) => setSelectedClaseId(typeof val === 'object' ? val.target.value : val)}
                      options={(clases ?? []).map(c => {
                        const hasAbsence = (inasistenciasDocente ?? []).some(i => i?.fecha === c?.fecha);
                        const matchedUnit = (unidades ?? []).find(u => u?.id === c?.unidad_id);
                        const unitNum = c?.unidades_tematicas?.numero ?? matchedUnit?.numero ?? c?.unidad_numero ?? null;
                        const unitPrefix = unitNum ? `[U${unitNum}] ` : '';
                        return {
                          value: c.id,
                          label: `${formatFechaDMY(c.fecha)} — ${unitPrefix}${c.tema || 'Sin tema especificado'}`,
                          badge: hasAbsence ? 'Licencia' : unitNum ? `U${unitNum}` : undefined
                        };
                      })}
                      placeholder="Seleccionar clase..."
                      buttonClassName="py-2 px-3 text-xs sm:text-sm font-semibold border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl flex-1 shadow-2xs"
                    />
                    {activeClase && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Pencil}
                        onClick={handleOpenEditClass}
                        disabled={cursadaFinalizada}
                        title="Editar fecha, tema y detalles de la clase"
                        className="shrink-0 text-xs px-3 py-2 rounded-xl"
                      >
                        <span className="hidden sm:inline">Editar Tema</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Fila de Acciones Rápidas */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                variant="primary"
                size="sm"
                icon={CheckCheck}
                onClick={handleMarcarTodosPresentes}
                disabled={cursadaFinalizada || Boolean(feriadoDetectado) || !activeClase || estudiantes.length === 0}
                className="text-xs font-bold shadow-xs px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                title="Marcar todos los alumnos como presentes en esta fecha"
              >
                Todos Presentes
              </Button>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                disabled={cursadaFinalizada}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 font-semibold text-xs shadow-2xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Crear nueva sesión de clase"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-500" />
                <span>+ Clase</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                disabled={estudiantes.length === 0}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 font-medium text-xs shadow-2xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Exportar asistencias a Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                <span>Excel</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                disabled={estudiantes.length === 0}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 font-medium text-xs shadow-2xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Imprimir / Exportar a PDF"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-500" />
                <span>PDF</span>
              </button>

              <Button
                variant={inasistenciaActual ? 'secondary' : 'outline'}
                size="sm"
                icon={ShieldAlert}
                type="button"
                disabled={cursadaFinalizada || Boolean(feriadoDetectado)}
                onClick={() => {
                  setFechaInasistencia(activeClase ? activeClase.fecha : new Date().toISOString().split('T')[0]);
                  if (inasistenciaActual) {
                    setTipoInasistencia(inasistenciaActual.tipo || 'LICENCIA');
                    setArticuloLicencia(inasistenciaActual.articulo_licencia || 'Art. 17° - Afecciones Comunes de Corto Tratamiento');
                    setObsInasistencia(inasistenciaActual.observaciones || '');
                  } else {
                    setTipoInasistencia('LICENCIA');
                    setArticuloLicencia('Art. 17° - Afecciones Comunes de Corto Tratamiento');
                    setOtroArticulo('');
                    setObsInasistencia('');
                  }
                  setIsInasistenciaModalOpen(true);
                }}
                className="text-xs border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 px-3 py-2 rounded-xl whitespace-nowrap ml-auto"
                title="Registrar o editar licencia del docente"
              >
                {inasistenciaActual ? 'Licencia' : 'Falta Docente'}
              </Button>
            </div>

            {/* Banner de Jornada No Laborable (Feriado Nacional / Provincial) */}
            {activeClase && feriadoDetectado && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
                    <CalendarOff className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        {feriadoDetectado.tipo === 'PROVINCIAL' ? '🏛️ Feriado Provincial' : '🇦🇷 Feriado Nacional'}: {feriadoDetectado.nombre}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold">
                        No computable
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                      Jornada no laborable oficial. Por disposición regulatoria, esta fecha no admite cómputo de asistencias ni registro de faltas, y no altera el porcentaje de regularidad de los estudiantes.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Banner de Licencia Docente si aplica */}
            {activeClase && inasistenciaActual && !feriadoDetectado && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      {inasistenciaActual.tipo === 'LICENCIA'
                        ? `Licencia Docente: ${inasistenciaActual.articulo_licencia || 'Artículo oficial'}`
                        : 'Docente Ausente (Razones Particulares)'}
                    </span>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                      No computa como falta para los alumnos en esta fecha.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteInasistencia}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold self-end sm:self-center cursor-pointer"
                >
                  Quitar Licencia
                </button>
              </div>
            )}

            {/* Fila de métricas rápidas de la sesión */}
            {activeClase && (
              <div className="flex flex-wrap items-center gap-2 text-xs py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                <span className="font-semibold">
                  Presentes: <strong className="text-emerald-600 dark:text-emerald-400">{presentesCount}</strong>
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="font-semibold">
                  Ausentes: <strong className="text-rose-600 dark:text-rose-400">{ausentesCount}</strong>
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="font-semibold">
                  Presentismo: <strong className="text-emerald-600 dark:text-emerald-400">{presentismoPct}%</strong>
                </span>
              </div>
            )}

            {/* 4. Barra de Búsqueda Rápida y Filtros Pills */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <AnimatedSearchBar
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  placeholder="Buscar por Apellido, Nombre o DNI..."
                />
              </div>

              {/* Filtros rápidos tipo pill */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shrink-0 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setAttendanceFilter('TODOS')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    attendanceFilter === 'TODOS'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>Todos</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/60 dark:bg-white/10">
                    {estudiantes.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAttendanceFilter('AUSENTES')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    attendanceFilter === 'AUSENTES'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
                  }`}
                >
                  <span>Ausentes (✗)</span>
                  <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
                    attendanceFilter === 'AUSENTES' ? 'bg-white/20 text-white' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                  }`}>
                    {ausentesCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAttendanceFilter('RIESGO')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    attendanceFilter === 'RIESGO'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                  }`}
                >
                  <span>Riesgo (⚠️)</span>
                  <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
                    attendanceFilter === 'RIESGO' ? 'bg-white/20 text-white' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  }`}>
                    {riskCounts.critico + riskCounts.ambar}
                  </span>
                </button>

                {(attendanceFilter === 'VERDE' || attendanceFilter === 'AMBAR') && (
                  <button
                    type="button"
                    onClick={() => setAttendanceFilter('TODOS')}
                    className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300"
                    title="Limpiar filtro semáforo"
                  >
                    <span>Filtro: {attendanceFilter} ✕</span>
                  </button>
                )}
              </div>
            </div>

            {/* 5. Matriz / Tabla de Alumnos */}
            {estudiantes.length === 0 ? (
              <EmptyState
                illustration="folder"
                title="No hay estudiantes inscriptos en esta cátedra"
                description="Ve a la pestaña 'Alumnos' para cargar manualmente o importar la nómina de estudiantes desde Excel."
              />
            ) : !activeClase ? (
              <EmptyState
                illustration="folder"
                title="No hay clases registradas aún"
                description="Pulsa [+ Clase] para registrar la primera sesión de cursado."
                action={
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Clase</span>
                  </button>
                }
              />
            ) : filteredEstudiantes.length === 0 ? (
              <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                <Users className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No se encontraron alumnos con el filtro actual
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStudentSearchQuery('');
                    setAttendanceFilter('TODOS');
                  }}
                  className="text-xs mx-auto"
                >
                  Restablecer Filtros
                </Button>
              </div>
            ) : (
              <>
                {/* Vista Móvil Touch (< 768px) */}
                <div className="block md:hidden space-y-3">
                  <div className="flex items-center justify-between px-1 text-xs text-slate-500">
                    <span className="font-semibold uppercase tracking-wider text-[11px]">
                      {filteredEstudiantes.length} de {estudiantes.length} Alumnos
                    </span>
                    <span className="font-mono text-[11px] font-bold">
                      {presentesCount} P / {ausentesCount} A ({presentismoPct}%)
                    </span>
                  </div>

                  {filteredEstudiantes.map((est) => (
                    <AttendanceMobileCard
                      key={est.id}
                      est={est}
                      estado={getEstado(est.id)}
                      isFlashing={flashingStudentId === est.id || flashingStudentId === 'ALL'}
                      asistPct={studentStatsMap.get(est.id) ?? 100}
                      risk={studentRiskMap.get(est.id)}
                      onToggle={handleToggle}
                      disabled={cursadaFinalizada || Boolean(feriadoDetectado)}
                    />
                  ))}
                </div>

                {/* Vista Desktop / Tablet (>= 768px): Tabla con Controles Binarios */}
                <div className="hidden md:block rounded-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto touch-pan-x select-none scrollbar-thin max-h-[60vh]">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 backdrop-blur z-20 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200/80 dark:border-slate-800">
                        <tr>
                          <th className="sticky left-0 top-0 bg-slate-50 dark:bg-slate-800/90 backdrop-blur z-30 px-4 py-3 border-r border-slate-200/80 dark:border-slate-800 min-w-[220px]">
                            Estudiante / DNI
                          </th>
                          <th className="px-4 py-3 text-center min-w-[200px]">
                            Asistencia
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
                        {filteredEstudiantes.map((est, index) => (
                          <AttendanceRow
                            key={est.id}
                            index={index}
                            est={est}
                            estado={getEstado(est.id)}
                            isFlashing={flashingStudentId === est.id || flashingStudentId === 'ALL'}
                            risk={studentRiskMap.get(est.id)}
                            onToggle={handleToggle}
                            disabled={cursadaFinalizada || Boolean(feriadoDetectado)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMNA DERECHA (lg:col-span-5): WIDGETS BENTO COMPACTOS APILADOS          */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-6">

          {/* Widget 1: Avance del Programa Didáctico */}
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Programa Didáctico
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {programaMetrics.dictadasCount} de {programaMetrics.totalUnidades || 0} Unidades Dictadas
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                {programaMetrics.progresoPct}%
              </span>
            </div>

            {/* Barra de progreso horizontal fina verde esmeralda */}
            <div className="space-y-1.5">
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-emerald-500 transition-all duration-700 ease-out"
                  style={{ width: `${programaMetrics.progresoPct}%` }}
                />
              </div>
            </div>

            {/* Estado de dictado actual */}
            <div className="p-3 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Dictando actualmente
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {programaMetrics.currentUnit 
                  ? `Unidad ${programaMetrics.currentUnit.numero}: ${programaMetrics.currentUnit.titulo}` 
                  : 'Sin unidad temática vinculada'}
              </p>
            </div>

            {/* Enlace para ir al Libro de Temas */}
            {onNavigateToLibroTemas && (
              <button
                type="button"
                onClick={onNavigateToLibroTemas}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 hover:bg-emerald-50/30 dark:hover:bg-slate-800 text-xs font-semibold text-emerald-600 dark:text-emerald-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Ver Libro de Temas completo</span>
                <span aria-hidden="true">→</span>
              </button>
            )}
          </div>

          {/* Widget 2: Alertas y Semáforo de Riesgo (Early Warning System) */}
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden space-y-4">
            {/* Brillo ambiental sutil */}
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Semáforo de Riesgo (RAM)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Monitoreo de asistencia y pautas de regularidad
                </p>
              </div>
            </div>

            {/* 3 Estados interactivos */}
            <div className="grid grid-cols-1 gap-2.5">
              {/* 1. Verde */}
              <button
                type="button"
                onClick={() => setAttendanceFilter(attendanceFilter === 'VERDE' ? 'TODOS' : 'VERDE')}
                className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  attendanceFilter === 'VERDE'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-950 dark:text-emerald-100 shadow-2xs font-bold'
                    : 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                }`}
                title="Filtrar alumnos en condición regular / óptima"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-xs font-bold truncate">Alumnos al día (Verde)</span>
                </div>
                <span className="text-xs font-mono font-extrabold px-2 py-0.5 rounded-lg bg-emerald-500/20">
                  {riskCounts.verde}
                </span>
              </button>

              {/* 2. Ámbar */}
              <button
                type="button"
                onClick={() => setAttendanceFilter(attendanceFilter === 'AMBAR' ? 'TODOS' : 'AMBAR')}
                className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  attendanceFilter === 'AMBAR'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-950 dark:text-amber-100 shadow-2xs font-bold'
                    : 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300'
                }`}
                title="Filtrar alumnos en observación preventiva"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-xs font-bold truncate">En observación (Ámbar)</span>
                </div>
                <span className="text-xs font-mono font-extrabold px-2 py-0.5 rounded-lg bg-amber-500/20">
                  {riskCounts.ambar}
                </span>
              </button>

              {/* 3. Riesgo RAM Crítico */}
              <button
                type="button"
                onClick={() => setAttendanceFilter(attendanceFilter === 'RIESGO' ? 'TODOS' : 'RIESGO')}
                className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  attendanceFilter === 'RIESGO'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-950 dark:text-rose-100 shadow-2xs font-bold'
                    : 'bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300'
                }`}
                title="Filtrar alumnos en riesgo de no cumplir la asistencia mínima"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                  <span className="text-xs font-bold truncate">Riesgo RAM Crítico (Rojo)</span>
                </div>
                <span className="text-xs font-mono font-extrabold px-2 py-0.5 rounded-lg bg-rose-500/20">
                  {riskCounts.critico}
                </span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
              Haz clic en cualquier estado para filtrar la nómina de la izquierda.
            </p>
          </div>

          {/* Widget 3: Sesiones de Clase / Historial de Clases */}
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Historial de Clases
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {clases.length} sesiones registradas
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                disabled={cursadaFinalizada}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                title="Nueva clase"
              >
                <Plus className="w-4 h-4 text-emerald-500" />
              </button>
            </div>

            {/* Lista cronológica con selección rápida */}
            <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {clases.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  No hay clases registradas aún.
                </p>
              ) : (
                clases.map((c) => {
                  const isActive = c.id === activeClase?.id;
                  const hasAbsence = (inasistenciasDocente ?? []).some(i => i?.fecha === c?.fecha);
                  const matchedUnit = (unidades ?? []).find(u => u?.id === c?.unidad_id);
                  const unitNum = c?.unidades_tematicas?.numero ?? matchedUnit?.numero ?? c?.unidad_numero ?? null;

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedClaseId(c.id)}
                      className={`w-full p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                        isActive
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500/40 text-emerald-950 dark:text-emerald-200 shadow-2xs font-semibold'
                          : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span 
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            hasAbsence ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} 
                        />
                        <span className="font-mono text-xs font-bold shrink-0">
                          {formatFechaDMY(c.fecha)}
                        </span>
                        {unitNum && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                            U{unitNum}
                          </span>
                        )}
                        <span className="text-xs truncate text-slate-600 dark:text-slate-300">
                          {c.tema || 'Clase ordinaria'}
                        </span>
                      </div>

                      {isActive && (
                        <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">
                          Activa
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>


      {/* Modal / Bottom Sheet Nueva Clase */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Nueva Sesión de Clase"
        subtitle="Registra la fecha y tema para pasar asistencia"
      >
        <form onSubmit={handleCreateClase} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase text-text-secondary">
                Fecha de la Clase *
              </label>
              <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                Formato: {formatFechaDMY(nuevaFecha)} (DD-MM-YYYY)
              </span>
            </div>
            <input
              type="date"
              required
              value={nuevaFecha}
              onChange={(e) => setNuevaFecha(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
            <p className="text-[11px] text-text-muted mt-1">
              Se guardará y mostrará registrada con formato <strong>{formatFechaDMY(nuevaFecha)}</strong>.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Tema o Contenido Dictado
            </label>
            <input
              type="text"
              placeholder="Ej: Unidad 2 - Modelado Relacional y Normalización"
              value={nuevoTema}
              onChange={(e) => setNuevoTema(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
            />
          </div>

          {/* Selector de Unidad Temática / Didáctica */}
          <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Unidad Temática / Didáctica</span>
              </label>
              {!isQuickCreatingUnidad && (
                <button
                  type="button"
                  onClick={() => {
                    setQuickUnidadNum(unidades.length + 1);
                    setIsQuickCreatingUnidad(true);
                  }}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  + Crear Unidad al vuelo
                </button>
              )}
            </div>

            {!isQuickCreatingUnidad ? (
              <CustomSelect
                value={nuevaUnidadId}
                onChange={(val) => setNuevaUnidadId(typeof val === 'object' ? val.target.value : val)}
                options={[
                  { value: '', label: 'Sin Unidad Asignada' },
                  ...unidades.map(u => ({
                    value: u.id,
                    label: `Unidad ${u.numero}: ${u.titulo}`,
                    badge: `U${u.numero}`
                  }))
                ]}
                placeholder="Seleccionar unidad temática..."
              />
            ) : (
              <div className="p-2.5 rounded-xl bg-surface border border-surface-border space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-text-primary">Nueva Unidad Rápida</span>
                  <button
                    type="button"
                    onClick={() => setIsQuickCreatingUnidad(false)}
                    className="text-[11px] text-text-muted hover:text-text-primary"
                  >
                    Cancelar
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-1">
                    <input
                      type="number"
                      min="1"
                      placeholder="N°"
                      value={quickUnidadNum}
                      onChange={(e) => setQuickUnidadNum(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-surface-border rounded-lg bg-surface text-text-primary outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="Título de la unidad..."
                      value={quickUnidadTitulo}
                      onChange={(e) => setQuickUnidadTitulo(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-surface-border rounded-lg bg-surface text-text-primary outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={async () => {
                      if (!quickUnidadTitulo.trim()) return;
                      setSavingQuickUnit(true);
                      try {
                        const created = await handleQuickCreateUnidad({
                          numero: quickUnidadNum,
                          titulo: quickUnidadTitulo
                        });
                        if (created?.id) setNuevaUnidadId(created.id);
                        setIsQuickCreatingUnidad(false);
                        setQuickUnidadTitulo('');
                      } finally {
                        setSavingQuickUnit(false);
                      }
                    }}
                    loading={savingQuickUnit}
                    disabled={!quickUnidadTitulo.trim()}
                    className="text-xs py-1 px-3"
                  >
                    Crear y Asignar
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">
              Cancelar
            </Button>
            <Button type="submit" loading={savingClase}>
              Crear Sesión
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal / Bottom Sheet Inasistencia Docente */}
      <Modal
        isOpen={isInasistenciaModalOpen}
        onClose={() => setIsInasistenciaModalOpen(false)}
        title="Inasistencia Docente / Licencia"
        subtitle={activeClase ? `Fecha: ${formatFechaDMY(activeClase.fecha)} — ${activeClase.tema || 'Clase Regular'}` : ''}
      >
        <form onSubmit={handleSaveInasistencia} className="space-y-4">
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-xs text-primary leading-relaxed">
            <strong>Excepción Académica:</strong> Al registrar la inasistencia del profesor, esta fecha <em>no computará como falta</em> para los estudiantes matriculados en la cátedra.
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Fecha de Inasistencia *
            </label>
            <input
              type="date"
              required
              value={activeClase ? activeClase.fecha : fechaInasistencia}
              onChange={(e) => setFechaInasistencia(e.target.value)}
              disabled={!!activeClase}
              className="w-full px-3.5 py-2 text-sm font-mono border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary disabled:opacity-75 disabled:bg-surface-hover"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Tipo de Inasistencia *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipoInasistencia('LICENCIA')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                  tipoInasistencia === 'LICENCIA'
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-surface border-surface-border text-text-secondary hover:bg-surface-hover'
                }`}
              >
                Licencia Reglamentaria
              </button>
              <button
                type="button"
                onClick={() => setTipoInasistencia('RAZONES_PARTICULARES')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                  tipoInasistencia === 'RAZONES_PARTICULARES'
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-surface border-surface-border text-text-secondary hover:bg-surface-hover'
                }`}
              >
                Razones Particulares
              </button>
            </div>
          </div>

          {tipoInasistencia === 'LICENCIA' && (
            <div className="space-y-3 animate-fadeIn">
              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <label className="block text-xs font-semibold uppercase text-text-secondary">
                    Artículo de Licencia *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsDecretoModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline hover:text-primary-hover transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Ver Tabla Resumen Decreto 1092</span>
                  </button>
                </div>
                <CustomSelect
                  value={articuloLicencia}
                  onChange={(val) => setArticuloLicencia(typeof val === 'object' ? val.target.value : val)}
                  options={articuloOptions}
                  placeholder="Seleccionar artículo de licencia..."
                />
              </div>

              {articuloLicencia === 'OTRO' && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
                    Especificar Artículo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Art. 48, Art. 115..."
                    value={otroArticulo}
                    onChange={(e) => setOtroArticulo(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-text-secondary mb-1.5">
              Observaciones (Opcional)
            </label>
            <textarea
              rows={2}
              value={obsInasistencia}
              onChange={(e) => setObsInasistencia(e.target.value)}
              placeholder="Detalle de suplencia, aviso previo a los alumnos o certificación médica..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-surface-border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none bg-surface text-text-primary resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
            <Button
              variant="secondary"
              onClick={() => setIsInasistenciaModalOpen(false)}
              type="button"
              disabled={savingInasistencia}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={savingInasistencia}
            >
              Confirmar Inasistencia
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Interactivo con Tabla Resumen Decreto Acuerdo N° 1092/2015 Catamarca */}
      <Modal
        isOpen={isDecretoModalOpen}
        onClose={() => setIsDecretoModalOpen(false)}
        title="Régimen de Licencias Docentes — Decreto Acuerdo N° 1092/2015"
        subtitle="Ministerio de Educación, Ciencia y Tecnología de Catamarca • Tabla Resumen Oficial"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-muted">
            Consulta los artículos vigentes o haz clic en <strong>"Elegir"</strong> en cualquier fila para seleccionar automáticamente el artículo correspondiente a tu inasistencia.
          </p>
          <LicenciasDecreto1092Table
            onSelectArticle={(art) => {
              setArticuloLicencia(`${art.numero} - ${art.titulo}`);
              setTipoInasistencia('LICENCIA');
              setIsDecretoModalOpen(false);
              toast.success(`Artículo asignado: ${art.numero} - ${art.titulo}`);
            }}
            selectedArticleNumero={articuloLicencia}
          />
          <div className="flex justify-end pt-3 border-t border-surface-border">
            <Button
              variant="secondary"
              onClick={() => setIsDecretoModalOpen(false)}
              type="button"
            >
              Cerrar Tabla
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de Edición de Clase */}
      <EditClassModal
        isOpen={isEditClassModalOpen}
        onClose={() => setIsEditClassModalOpen(false)}
        clase={activeClase}
        unidades={unidades}
        onQuickCreateUnidad={handleQuickCreateUnidad}
        onSave={handleSaveEditClass}
        onDeleteRequest={handleRequestDeleteClass}
        saving={savingEditClass}
      />

      {/* Modal de Confirmación de Borrado Seguro */}
      <ConfirmDeleteClassModal
        isOpen={isDeleteClassModalOpen}
        onClose={() => setIsDeleteClassModalOpen(false)}
        clase={activeClase}
        totalAsistencias={deleteClassCount}
        onConfirmDelete={handleConfirmDeleteClass}
        deleting={deletingClass}
      />

      {/* Visor Unificado de Impresión de Asistencias */}
      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        type="asistencias"
        title="Registro Oficial de Asistencias y Permanencia"
        subtitle="Cómputo reglamentario para archivo en Secretaría Académica"
        defaultOrientation="landscape"
        data={{
          catedra: { id: catedraId, nombre: catedraName },
          estudiantes,
          clases,
          asistencias,
          inasistenciasDocente,
          studentStatsMap,
          criterios,
          cicloAnio: '2026',
          institucionNombre: 'INSTITUTO DE EDUCACIÓN SUPERIOR',
          docenteNombre: user?.user_metadata?.nombre_completo || user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Docente Titular'
        }}
      />

      {/* Botón Flotante de Guardado Rápido (Quick Action FAB) reactivo con Ctrl + S */}
      <QuickSaveFAB
        onSave={handleQuickSaveAttendance}
        loading={savingQuickAttendance}
        isDirty={isDirty}
        hasChanges={isDirty}
        visible={isDirty && !feriadoDetectado}
        disabled={!activeClase || cursadaFinalizada || Boolean(feriadoDetectado)}
        tooltipText="Guardado rápido (Ctrl + S)"
        ariaLabel="Guardar asistencia de la clase actual"
      />
    </div>
  );
}
