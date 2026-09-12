import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  PieChart, 
  Users, 
  Award, 
  TrendingUp, 
  GraduationCap, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  X
} from 'lucide-react';
import Modal from '../common/Modal';
import MinimalSpinner from '../common/MinimalSpinner';
import InteractiveDonutChart from '../charts/InteractiveDonutChart';
import InteractiveBarChart from '../charts/InteractiveBarChart';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { calcularCondicionFinal, calcularPorcentajeAsistencia } from '../../lib/academicLogic';

export default function CatedraStatsModal({
  isOpen,
  onClose,
  catedraId,
  catedraName,
  academicLevel = 'TERCIARIO',
  modalidad = 'ANUAL'
}) {
  const { user, isDemo } = useAuth();
  const [chartType, setChartType] = useState('bar'); // 'bar' | 'donut'
  const [loading, setLoading] = useState(true);

  // Raw states
  const [estudiantes, setEstudiantes] = useState([]);
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

  useEffect(() => {
    if (isOpen && catedraId) {
      loadStatsData();
    }
  }, [isOpen, catedraId]);

  const loadStatsData = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        // 1. Estudiantes inscriptos
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
        setEstudiantes(estList);

        // 2. Evaluaciones
        const { data: evData } = await supabase
          .from('evaluaciones')
          .select('*')
          .eq('catedra_id', catedraId);
        setEvaluaciones(evData || []);

        // 3. Notas
        const evIds = (evData || []).map(e => e.id);
        if (evIds.length > 0) {
          const { data: notasData } = await supabase
            .from('notas')
            .select('*')
            .in('evaluacion_id', evIds);
          setNotas(notasData || []);
        } else {
          setNotas([]);
        }

        // 4. Clases
        const { data: clsData } = await supabase
          .from('clases')
          .select('*')
          .eq('catedra_id', catedraId);
        setClases(clsData || []);

        // 5. Asistencias
        const clsIds = (clsData || []).map(c => c.id);
        if (clsIds.length > 0) {
          const { data: asistData } = await supabase
            .from('asistencias')
            .select('*')
            .in('clase_id', clsIds);
          setAsistencias(asistData || []);
        } else {
          setAsistencias([]);
        }

        // 6. Inasistencias Docente
        const { data: inasistData } = await supabase
          .from('inasistencias_docente')
          .select('*')
          .eq('catedra_id', catedraId);
        setInasistenciasDocente(inasistData || []);

        // 7. Criterios de evaluación
        const { data: critData } = await supabase
          .from('criterios_evaluacion')
          .select('*')
          .eq('catedra_id', catedraId)
          .maybeSingle();

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
        // Fallback desde localStorage o demo
        const storedEst = JSON.parse(localStorage.getItem(`estudiantes_${catedraId}`) || '[]');
        setEstudiantes(storedEst);
        const storedEv = JSON.parse(localStorage.getItem(`evaluaciones_${catedraId}`) || '[]');
        setEvaluaciones(storedEv);
        const storedNotas = JSON.parse(localStorage.getItem(`notas_${catedraId}`) || '[]');
        setNotas(storedNotas);
        const storedClases = JSON.parse(localStorage.getItem(`clases_${catedraId}`) || '[]');
        setClases(storedClases);
        const storedAsist = JSON.parse(localStorage.getItem(`asistencias_${catedraId}`) || '[]');
        setAsistencias(storedAsist);
        const storedInasist = JSON.parse(localStorage.getItem(`inasistencias_docente_${catedraId}`) || '[]');
        setInasistenciasDocente(storedInasist);
      }
    } catch (err) {
      console.error('Error loading stats data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Procesamiento de estadísticas académicas en tiempo real
  const stats = useMemo(() => {
    const totalMatricula = estudiantes.length;
    if (totalMatricula === 0) {
      return {
        totalMatricula: 0,
        tasaRegularidad: 0,
        promedioGeneral: 0,
        chartData: [],
        resumenText: 'Sin alumnos inscriptos'
      };
    }

    const totalClases = clases.length;
    const clasesConLicencia = inasistenciasDocente.filter(
      i => i.tipo === 'LICENCIA' && clases.some(c => c.fecha === i.fecha)
    ).length;

    let promocionalesCount = 0;
    let regularesCount = 0;
    let libresCount = 0;
    let aprobadosCount = 0;
    let enProcesoCount = 0;

    estudiantes.forEach((est) => {
      // 1. Asistencia del alumno
      const studentAsist = asistencias.filter(a => a.estudiante_id === est.id);
      const asistenciaPct = calcularPorcentajeAsistencia(studentAsist, totalClases, clasesConLicencia);

      // 2. Notas del alumno
      const studentNotas = notas.filter(n => n.estudiante_id === est.id);

      // 3. Condición final
      const cond = calcularCondicionFinal(
        academicLevel,
        modalidad,
        asistenciaPct,
        evaluaciones,
        studentNotas,
        criterios
      );

      const status = cond.condicion;
      if (academicLevel === 'SECUNDARIO') {
        if (status === 'APROBADO') {
          aprobadosCount++;
        } else {
          enProcesoCount++;
        }
      } else {
        if (status === 'PROMOCIONAL') {
          promocionalesCount++;
        } else if (status === 'REGULAR') {
          regularesCount++;
        } else {
          libresCount++;
        }
      }
    });

    // Gráficos y distribución
    let chartData = [];
    let tasaRegularidad = 0;

    if (academicLevel === 'SECUNDARIO') {
      const aprobadosPct = Math.round((aprobadosCount / totalMatricula) * 100);
      const enProcesoPct = Math.round((enProcesoCount / totalMatricula) * 100);
      tasaRegularidad = aprobadosPct;

      chartData = [
        { label: 'Aprobados', value: aprobadosCount, color: '#10b981' },
        { label: 'En Proceso / Recuperatorio', value: enProcesoCount, color: '#ef4444' }
      ];
    } else {
      const promoPct = Math.round((promocionalesCount / totalMatricula) * 100);
      const regPct = Math.round((regularesCount / totalMatricula) * 100);
      const libPct = Math.round((libresCount / totalMatricula) * 100);
      tasaRegularidad = Math.round(((promocionalesCount + regularesCount) / totalMatricula) * 100);

      chartData = [
        { label: 'Promocionales', value: promocionalesCount, color: '#10b981' },
        { label: 'Regulares', value: regularesCount, color: '#f59e0b' },
        { label: 'Libres', value: libresCount, color: '#ef4444' }
      ];
    }

    // Promedio general de notas numéricas
    const allNumericNotas = notas
      .map(n => Number(n.valor))
      .filter(v => !isNaN(v) && v >= 1 && v <= 10);

    const promedioGeneral = allNumericNotas.length > 0
      ? (allNumericNotas.reduce((a, b) => a + b, 0) / allNumericNotas.length).toFixed(1)
      : '—';

    return {
      totalMatricula,
      tasaRegularidad,
      promedioGeneral,
      chartData,
      counts: {
        promocionales: promocionalesCount,
        regulares: regularesCount,
        libres: libresCount,
        aprobados: aprobadosCount,
        enProceso: enProcesoCount
      }
    };
  }, [estudiantes, evaluaciones, notas, clases, asistencias, inasistenciasDocente, academicLevel, modalidad, criterios]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rendimiento y Métricas Estadísticas"
      subtitle={`Distribución de condiciones académicas en ${catedraName || 'Cátedra'}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Conmutador interactivo (Pill Switch): Gráfico de Barras | Donut */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Visualización:
            </span>
          </div>

          <div className="flex items-center bg-slate-100/80 dark:bg-white/[0.05] p-1 rounded-2xl border border-slate-200/70 dark:border-white/10">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none touch-target-44 active:scale-95 duration-100 ${
                chartType === 'bar'
                  ? 'bg-white dark:bg-slate-800 text-primary shadow-xs font-bold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Gráfico de Barras</span>
            </button>

            <button
              type="button"
              onClick={() => setChartType('donut')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none touch-target-44 active:scale-95 duration-100 ${
                chartType === 'donut'
                  ? 'bg-white dark:bg-slate-800 text-primary shadow-xs font-bold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Torta / Donut</span>
            </button>
          </div>
        </div>

        {/* Chart View Container con animación de transición */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <MinimalSpinner size="lg" color="primary" />
            <span className="text-xs text-text-muted font-mono">Calculando rendimiento académico...</span>
          </div>
        ) : stats.totalMatricula === 0 ? (
          <div className="py-12 text-center text-text-muted space-y-2 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-6">
            <Users className="w-10 h-10 mx-auto opacity-40" />
            <h4 className="text-sm font-bold text-text-primary">No hay estudiantes inscriptos</h4>
            <p className="text-xs">Carga alumnos en la cátedra para visualizar las estadísticas de rendimiento.</p>
          </div>
        ) : (
          <div
            key={chartType}
            className="backdrop-blur-xl bg-white/60 dark:bg-slate-800/40 rounded-3xl border border-slate-200/80 dark:border-white/10 p-3 sm:p-5 md:p-6 shadow-xs animate-fadeInUp w-full"
          >
            <div className="w-full h-64 sm:h-72 md:h-80 min-h-[220px] flex items-center justify-center">
              {chartType === 'bar' ? (
                <InteractiveBarChart
                  data={stats.chartData}
                  heightClass="h-48 sm:h-56 md:h-64"
                  valueSuffix="alumnos"
                />
              ) : (
                <InteractiveDonutChart
                  data={stats.chartData}
                  title={academicLevel === 'SECUNDARIO' ? 'Aprobados' : 'Promocionales'}
                  subtitle="Matrícula Total"
                  size={210}
                  valueSuffix="estudiantes"
                />
              )}
            </div>
          </div>
        )}

        {/* Tarjetas KPI inferiores (Bento Subcards) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Matrícula Total */}
          <div className="backdrop-blur-xl bg-slate-100/60 dark:bg-white/[0.04] p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span>Matrícula Total</span>
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-mono font-black text-text-primary mt-1">
              {stats.totalMatricula}
            </p>
            <span className="text-[11px] text-text-muted block">Alumnos inscriptos</span>
          </div>

          {/* Tasa Combinada Regularidad/Promoción */}
          <div className="backdrop-blur-xl bg-slate-100/60 dark:bg-white/[0.04] p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{academicLevel === 'SECUNDARIO' ? 'Tasa Aprobación' : 'Tasa Regular/Promo'}</span>
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.tasaRegularidad}%
            </p>
            <span className="text-[11px] text-text-muted block">
              {academicLevel === 'SECUNDARIO' ? 'Aprobados directos' : 'Alumnos no libres'}
            </span>
          </div>

          {/* Promedio General de Notas */}
          <div className="backdrop-blur-xl bg-slate-100/60 dark:bg-white/[0.04] p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" />
                <span>Promedio General</span>
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-mono font-black text-text-primary mt-1">
              {stats.promedioGeneral}
              {stats.promedioGeneral !== '—' && <span className="text-xs font-normal text-text-muted"> / 10</span>}
            </p>
            <span className="text-[11px] text-text-muted block">Media de calificaciones</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
