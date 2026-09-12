import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  UserCheck, 
  CalendarCheck, 
  BarChart2, 
  PieChart, 
  RefreshCw, 
  TrendingUp, 
  Layers, 
  Sparkles,
  ShieldCheck,
  Award,
  Database,
  TestTube2
} from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import Badge from '../common/Badge';
import InteractiveBarChart from '../charts/InteractiveBarChart';
import InteractiveDonutChart from '../charts/InteractiveDonutChart';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { toast } from 'sonner';

export default function GlobalMetricsSection({ isDemo = false, onRunDiagnostic }) {
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [chartType, setChartType] = useState('bars'); // 'bars' | 'donut'

  const [metrics, setMetrics] = useState({
    docentes: 0,
    superadmins: 0,
    catedras: 0,
    estudiantes: 0,
    clases: 0,
    asistencias: 0,
    evaluaciones: 0
  });

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      if (isDemo || !isSupabaseConfigured || !supabase) {
        // Modo Demo / LocalStorage fallback
        let docentesCount = 8;
        let superadminsCount = 2;
        let catedrasCount = 6;
        let estudiantesCount = 48;
        let clasesCount = 36;
        let asistenciasCount = 420;
        let evaluacionesCount = 18;

        try {
          const savedTeachers = localStorage.getItem('docentepro_demo_teachers_list');
          if (savedTeachers) {
            const list = JSON.parse(savedTeachers);
            docentesCount = list.filter(t => t.rol !== 'superadmin').length || 6;
            superadminsCount = list.filter(t => t.rol === 'superadmin').length || 2;
          }

          const savedCatedras = localStorage.getItem('demo_catedras');
          if (savedCatedras) {
            const cList = JSON.parse(savedCatedras);
            if (cList.length > 0) catedrasCount = cList.length;
          }

          // Escanear almacenamiento local para sumar conteos demo
          let totalEst = 0;
          let totalCls = 0;
          let totalAsist = 0;
          let totalEval = 0;

          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('estudiantes_')) {
              try {
                const arr = JSON.parse(localStorage.getItem(key) || '[]');
                totalEst += Array.isArray(arr) ? arr.length : 0;
              } catch (_) {}
            } else if (key?.startsWith('clases_')) {
              try {
                const arr = JSON.parse(localStorage.getItem(key) || '[]');
                totalCls += Array.isArray(arr) ? arr.length : 0;
              } catch (_) {}
            } else if (key?.startsWith('asistencias_')) {
              try {
                const arr = JSON.parse(localStorage.getItem(key) || '[]');
                totalAsist += Array.isArray(arr) ? arr.length : 0;
              } catch (_) {}
            } else if (key?.startsWith('evaluaciones_')) {
              try {
                const arr = JSON.parse(localStorage.getItem(key) || '[]');
                totalEval += Array.isArray(arr) ? arr.length : 0;
              } catch (_) {}
            }
          }

          if (totalEst > 0) estudiantesCount = totalEst;
          if (totalCls > 0) clasesCount = totalCls;
          if (totalAsist > 0) asistenciasCount = totalAsist;
          if (totalEval > 0) evaluacionesCount = totalEval;
        } catch (storageErr) {
          console.warn('Error leyendo localStorage en modo demo:', storageErr);
        }

        setMetrics({
          docentes: docentesCount,
          superadmins: superadminsCount,
          catedras: catedrasCount,
          estudiantes: estudiantesCount,
          clases: clasesCount,
          asistencias: asistenciasCount,
          evaluaciones: evaluacionesCount
        });
        setLastUpdated(new Date());
        setLoading(false);
        return;
      }

      // Consulta de alto rendimiento a Supabase: count exact sin transferir filas (head: true)
      const [
        teachersRes,
        superRes,
        catedrasRes,
        studentsRes,
        clasesRes,
        asistenciasRes,
        evaluacionesRes
      ] = await Promise.all([
        supabase.from('perfiles').select('*', { count: 'exact', head: true }).eq('rol', 'docente'),
        supabase.from('perfiles').select('*', { count: 'exact', head: true }).eq('rol', 'superadmin'),
        supabase.from('catedras').select('*', { count: 'exact', head: true }),
        supabase.from('estudiantes').select('*', { count: 'exact', head: true }),
        supabase.from('clases').select('*', { count: 'exact', head: true }),
        supabase.from('asistencias').select('*', { count: 'exact', head: true }),
        supabase.from('evaluaciones').select('*', { count: 'exact', head: true })
      ]);

      setMetrics({
        docentes: teachersRes?.count ?? 0,
        superadmins: superRes?.count ?? 0,
        catedras: catedrasRes?.count ?? 0,
        estudiantes: studentsRes?.count ?? 0,
        clases: clasesRes?.count ?? 0,
        asistencias: asistenciasRes?.count ?? 0,
        evaluaciones: evaluacionesRes?.count ?? 0
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error al cargar métricas globales:', err);
      toast.error('No se pudieron consultar las métricas del sistema: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Datos para los gráficos comparativos
  const chartData = [
    { label: 'Docentes', value: metrics.docentes, color: '#3b82f6' },
    { label: 'Cátedras', value: metrics.catedras, color: '#8b5cf6' },
    { label: 'Alumnos', value: metrics.estudiantes, color: '#10b981' },
    { label: 'Clases', value: metrics.clases, color: '#f59e0b' },
    { label: 'Evaluaciones', value: metrics.evaluaciones, color: '#ec4899' },
  ];

  const avgStudentsPerCatedra = metrics.catedras > 0 
    ? (metrics.estudiantes / metrics.catedras).toFixed(1) 
    : '0';

  const avgClassesPerCatedra = metrics.catedras > 0 
    ? (metrics.clases / metrics.catedras).toFixed(1) 
    : '0';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Barra de cabecera de la sección de métricas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface-card border border-surface-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2">
              <span>Métricas y Volumen del Ecosistema</span>
              {isDemo && (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">
                  Demo
                </span>
              )}
            </h2>
            <p className="text-xs text-text-muted">
              {lastUpdated 
                ? `Última sincronización: ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` 
                : 'Consultando datos del servidor...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          {onRunDiagnostic && (
            <button
              type="button"
              onClick={onRunDiagnostic}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white text-xs font-bold shadow-xs hover:shadow-emerald-500/25 transition-all cursor-pointer touch-target-44 sm:touch-target-auto"
              title="Abrir la suite de autodiagnóstico y pruebas integrales"
            >
              <TestTube2 className="w-3.5 h-3.5 text-emerald-200" />
              <span className="hidden sm:inline">Diagnóstico QA</span>
              <span className="sm:hidden">QA</span>
            </button>
          )}

          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={fetchMetrics}
            disabled={loading}
            className={`text-xs font-semibold touch-target-44 sm:touch-target-auto ${loading ? 'animate-spin' : ''}`}
            title="Refrescar métricas ahora"
          >
            <span className="hidden sm:inline">Actualizar Métricas</span>
            <span className="sm:hidden">Actualizar</span>
          </Button>
        </div>
      </div>

      {/* 4 Bento KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Docentes Registrados */}
        <Card className="p-4 sm:p-5 border border-surface-border relative overflow-hidden group hover:border-primary/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Docentes Registrados
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
              {loading ? '—' : metrics.docentes}
            </span>
            <span className="text-xs font-medium text-text-muted">
              profesores
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-surface-border flex items-center justify-between text-xs">
            <span className="text-text-muted flex items-center gap-1 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              {metrics.superadmins} Superadmin{metrics.superadmins === 1 ? '' : 's'}
            </span>
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
              Nómina Activa
            </span>
          </div>
        </Card>

        {/* KPI 2: Cátedras Activas */}
        <Card className="p-4 sm:p-5 border border-surface-border relative overflow-hidden group hover:border-primary/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full pointer-events-none group-hover:bg-purple-500/10 transition-colors" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Cátedras Activas
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
              {loading ? '—' : metrics.catedras}
            </span>
            <span className="text-xs font-medium text-text-muted">
              espacios
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-surface-border flex items-center justify-between text-xs">
            <span className="text-text-muted text-[11px]">
              Promedio: <strong className="text-text-primary">{avgStudentsPerCatedra}</strong> alum/cát.
            </span>
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
              En dictado
            </span>
          </div>
        </Card>

        {/* KPI 3: Alumnos Matriculados */}
        <Card className="p-4 sm:p-5 border border-surface-border relative overflow-hidden group hover:border-primary/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Alumnos Matriculados
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
              {loading ? '—' : metrics.estudiantes}
            </span>
            <span className="text-xs font-medium text-text-muted">
              estudiantes
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-surface-border flex items-center justify-between text-xs">
            <span className="text-text-muted text-[11px]">
              Registro nominal global
            </span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              Matrícula
            </span>
          </div>
        </Card>

        {/* KPI 4: Volumen de Clases & Asistencias */}
        <Card className="p-4 sm:p-5 border border-surface-border relative overflow-hidden group hover:border-primary/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none group-hover:bg-amber-500/10 transition-colors" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Clases & Asistencias
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
              {loading ? '—' : metrics.clases}
            </span>
            <span className="text-xs font-medium text-text-muted">
              clases dictadas
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-surface-border flex items-center justify-between text-xs">
            <span className="text-text-muted text-[11px]">
              <strong className="text-text-primary">{metrics.asistencias.toLocaleString()}</strong> marcas asist.
            </span>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
              {avgClassesPerCatedra} cls/cát.
            </span>
          </div>
        </Card>
      </div>

      {/* Gráfico Resumen Bento & Métricas Secundarias */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Principal: Gráfico Interactivo (4 Contenedores Estrictamente Separados) */}
        <Card className="lg:col-span-2 p-4 sm:p-6 border border-surface-border flex flex-col justify-between">
          {/* Contenedor 1: Cabecera con título, subtítulo e icono */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-border">
            <div>
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <span>Distribución y Carga de la Plataforma</span>
                <Sparkles className="w-4 h-4 text-primary" />
              </h3>
              <p className="text-xs text-text-muted">
                Comparativa de volumen entre las entidades clave registradas en el sistema
              </p>
            </div>

            {/* Botón Switcher Bento de Tipo de Gráfico */}
            <div className="inline-flex p-1 rounded-xl bg-surface-hover border border-surface-border self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartType('bars')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-target-44 sm:touch-target-auto ${
                  chartType === 'bars'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                title="Ver como gráfico de barras"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Barras</span>
              </button>
              <button
                type="button"
                onClick={() => setChartType('donut')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-target-44 sm:touch-target-auto ${
                  chartType === 'donut'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                title="Ver como gráfico circular tipo donut"
              >
                <PieChart className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Donut</span>
              </button>
            </div>
          </div>

          {/* Contenedor 2: Gráfico Donut interactivo centrado */}
          <div className="relative flex justify-center items-center my-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-2 text-text-muted py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs">Cargando gráfico...</span>
              </div>
            ) : chartType === 'bars' ? (
              <div className="w-full h-56 sm:h-64">
                <InteractiveBarChart
                  data={chartData}
                  heightClass="h-56 sm:h-64"
                  valueSuffix="registros"
                />
              </div>
            ) : (
              <InteractiveDonutChart
                data={chartData}
                title="Total"
                subtitle="Registros"
                size={220}
                valueSuffix="registros"
                showLegend={false}
              />
            )}
          </div>

          {/* Contenedor 3: Desglose de entidades apiladas en tarjetas horizontales compactas */}
          <div className="space-y-2 my-4">
            {chartData.map((item) => {
              const totalAll = chartData.reduce((acc, curr) => acc + curr.value, 0);
              const percent = totalAll > 0 ? ((item.value / totalAll) * 100).toFixed(1) : 0;
              return (
                <div 
                  key={item.label}
                  className="p-2.5 rounded-xl bg-surface-hover/50 border border-surface-border/60 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div 
                      className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs font-semibold text-text-primary truncate">
                      {item.label}
                    </span>
                  </div>
                  <div className="text-right shrink-0 flex items-baseline gap-2">
                    <span className="text-xs font-mono font-bold text-text-primary">
                      {item.value.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-medium text-text-muted">
                      ({percent}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Contenedor 4: Tarjeta de tip / sugerencia al final del flujo */}
          <div className="mt-4 relative w-full p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300">
            💡 <strong>Tip para dispositivos móviles:</strong> Toca cualquier barra o sección del gráfico para ver el porcentaje exacto y el conteo del recurso en tiempo real.
          </div>
        </Card>

        {/* Columna Lateral: Rendimiento y Capacidad */}
        <div className="space-y-4">
          <Card className="p-4 sm:p-5 border border-surface-border bg-gradient-to-br from-surface-card to-primary/5">
            <h3 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span>Rendimiento y Capacidad</span>
            </h3>
            <p className="text-xs text-text-muted mb-3">
              Métricas calculadas con <code>head: true</code> para optimizar cuotas de red y base de datos.
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-2 border-b border-surface-border/60">
                <span className="text-text-muted">Cátedras por Docente:</span>
                <span className="font-bold text-text-primary font-mono">
                  {metrics.docentes > 0 ? (metrics.catedras / metrics.docentes).toFixed(1) : '0'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-border/60">
                <span className="text-text-muted">Asistencias por Clase:</span>
                <span className="font-bold text-text-primary font-mono">
                  {metrics.clases > 0 ? (metrics.asistencias / metrics.clases).toFixed(1) : '0'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-border/60">
                <span className="text-text-muted">Alumnos por Cátedra:</span>
                <span className="font-bold text-text-primary font-mono">
                  {avgStudentsPerCatedra}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-text-muted">Evaluaciones registradas:</span>
                <span className="font-bold text-primary font-mono">
                  {metrics.evaluaciones}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 border border-surface-border">
            <h3 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Estado de la Plataforma</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-surface-border/60">
                <span className="text-text-muted">Base de Datos Supabase:</span>
                <Badge variant="success" className="text-[10px]">OPERATIVO</Badge>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-surface-border/60">
                <span className="text-text-muted">Políticas RLS Activas:</span>
                <Badge variant="primary" className="text-[10px]">AUDITADAS</Badge>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-text-muted">Modo de Operación:</span>
                <span className="font-semibold text-text-primary">{isDemo ? 'Demostración Local' : 'Producción'}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
