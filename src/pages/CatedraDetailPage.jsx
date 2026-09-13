import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckSquare, 
  GraduationCap, 
  FolderOpen, 
  Settings as SettingsIcon, 
  Clock, 
  Users, 
  Building,
  AlertCircle,
  ShieldCheck,
  BarChart3,
  BookOpen,
  Award,
  Layers,
  Globe
} from 'lucide-react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import EarlyWarningCard from '../components/catedra/EarlyWarningCard';
import ProgramaProgressCard from '../components/catedra/ProgramaProgressCard';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { CatedraDetailSkeleton, CatedraTabSkeleton } from '../components/common/SkeletonLoader';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { 
  VALID_CATEDRA_TABS, 
  DEFAULT_CRITERIOS_EVALUACION
} from '../types/catedra';
import { isValidCatedraTab } from '../utils/catedraUtils';

// Importaciones dinámicas lazy de pestañas y modales pesados
const AttendanceTab = lazy(() => import('../components/catedra/AttendanceTab'));
const GradesTab = lazy(() => import('../components/catedra/GradesTab'));
const StudentsTab = lazy(() => import('../components/catedra/StudentsTab'));
const ResourcesTab = lazy(() => import('../components/catedra/ResourcesTab'));
const SettingsTab = lazy(() => import('../components/catedra/SettingsTab'));
const LibroTemasTab = lazy(() => import('../components/catedra/LibroTemasTab'));
const MesasExamenTab = lazy(() => import('../components/catedra/MesasExamenTab'));
const UnidadesTab = lazy(() => import('../components/catedra/UnidadesTab'));
const CatedraStatsModal = lazy(() => import('../components/catedra/CatedraStatsModal'));
const PortalSettingsModal = lazy(() => import('../components/catedra/PortalSettingsModal'));

// Configuración estática de pestañas (definida a nivel de módulo para evitar reinicializaciones)
const TABS_CONFIG = [
  { id: 'alumnos', label: 'Alumnos', icon: Users },
  { id: 'asistencias', label: 'Asistencias', icon: CheckSquare },
  { id: 'calificaciones', label: 'Calificaciones', icon: GraduationCap },
  { id: 'unidades', label: 'Programa / Unidades', icon: Layers },
  { id: 'libro-temas', label: 'Libro de Temas', icon: BookOpen },
  { id: 'mesas-examen', label: 'Mesas de Examen', icon: Award },
  { id: 'recursos', label: 'Recursos y Archivos', icon: FolderOpen },
  { id: 'configuracion', label: 'Configuración y Criterios', icon: SettingsIcon }
];

export default function CatedraDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isDemo } = useAuth();
  const { catedras, activeCiclo } = useApp();

  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);
  const tabFromUrl = searchParams.get('tab');
  
  const [activeTab, setActiveTab] = useState(() => {
    return isValidCatedraTab(tabFromUrl) ? tabFromUrl : 'asistencias';
  });

  const [catedra, setCatedra] = useState(null);
  const [criterios, setCriterios] = useState(DEFAULT_CRITERIOS_EVALUACION);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // =========================================================================
  // 1. FUNCIONES AUXILIARES DECLARADAS Y HOISTEADAS ANTES DE LOS EFECTOS
  // =========================================================================

  function handleTabChange(newTab) {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  }

  function handleCatedraUpdated(updated) {
    setCatedra(updated);
  }

  async function fetchCatedraData() {
    if (!id) return;
    setLoading(true);
    setErrorMsg('');
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('catedras')
          .select(`
            *,
            instituciones (
              nombre,
              nivel
            ),
            ciclos_lectivos (
              id,
              nombre,
              anio
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setCatedra(data);

        try {
          const { data: critData } = await supabase
            .from('criterios_evaluacion')
            .select('min_asist_promo, min_asist_reg, nota_min_promo, nota_min_reg, nota_min_sec')
            .eq('catedra_id', id)
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
        } catch (_) {}
      } else {
        // Modo demo / LocalStorage
        let found = (catedras ?? []).find((c) => c.id === id);
        if (!found) {
          try {
            const stored = JSON.parse(localStorage.getItem('demo_catedras') || '[]');
            found = stored.find((c) => c.id === id);
          } catch (_) {}
        }

        if (found) {
          setCatedra(found);
        } else {
          // Fallback mock seguro
          setCatedra({
            id,
            nombre: 'Programación Web II',
            nivel: 'TERCIARIO',
            modalidad: 'ANUAL',
            institucion_nombre: 'I.S.F.T. N° 179',
            horarios_semanales: [
              { dia: 'Lunes', desde: '18:00', hasta: '20:00', aula: 'Lab 1' },
              { dia: 'Miércoles', desde: '18:00', hasta: '20:00', aula: 'Lab 1' }
            ]
          });
        }
      }
    } catch (err) {
      console.error('Error fetching cátedra:', err);
      setErrorMsg('No se pudo cargar la cátedra solicitada.');
    } finally {
      setLoading(false);
    }
  }

  // Sincronizar pestaña desde URL
  useEffect(() => {
    if (tabFromUrl && isValidCatedraTab(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Carga inicial de datos de la cátedra
  useEffect(() => {
    if (id) {
      try {
        localStorage.setItem('last_active_catedra_id', id);
      } catch (_) {}
      fetchCatedraData();
    }
  }, [id]);

  if (loading) {
    return <CatedraDetailSkeleton />;
  }

  if (errorMsg || !catedra) {
    return (
      <div className="p-8 sm:p-12 text-center rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-sm max-w-xl mx-auto my-12 animate-fadeIn">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/20 shadow-xs">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black text-text-primary mb-1.5">Cátedra no encontrada</h2>
        <p className="text-xs sm:text-sm text-text-muted mb-6 leading-relaxed">
          {errorMsg || 'La cátedra seleccionada no existe en el sistema o no tienes los permisos requeridos para acceder a ella.'}
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button variant="primary" icon={ArrowLeft} onClick={() => navigate('/dashboard')} className="text-xs font-bold">
            ← Volver al Dashboard
          </Button>
          <Button variant="outline" onClick={fetchCatedraData} className="text-xs font-semibold">
            Reintentar Carga
          </Button>
        </div>
      </div>
    );
  }

  const schedules = Array.isArray(catedra?.horarios_semanales) ? catedra.horarios_semanales : [];

  return (
    <ErrorBoundary onReset={fetchCatedraData} title="Error al visualizar la cátedra">
      <div className="space-y-6">
        {/* Top navigation back button */}
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary transition-colors mb-3.5 group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Volver al Panel de Cátedras</span>
          </button>

          {/* Bento Workspace Header Card */}
          <div className="backdrop-blur-xl bg-white/75 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-white/10 p-6 sm:p-7 shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] transition-all">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={catedra?.nivel === 'TERCIARIO' ? 'primary' : 'warning'}>
                    {catedra?.nivel ?? 'TERCIARIO'}
                  </Badge>
                  <Badge variant="default">
                    {catedra?.modalidad ?? 'ANUAL'}
                  </Badge>
                  <span className="text-xs text-text-muted flex items-center gap-1 font-medium bg-slate-100/60 dark:bg-white/[0.04] px-2.5 py-0.5 rounded-lg border border-slate-200/60 dark:border-white/5">
                    <Building className="w-3.5 h-3.5 text-primary" />
                    <span>{catedra?.instituciones?.nombre ?? catedra?.institucion_nombre ?? 'Sin Institución'}</span>
                  </span>
                  <span className="text-xs text-text-muted flex items-center gap-1 font-medium bg-slate-100/60 dark:bg-white/[0.04] px-2.5 py-0.5 rounded-lg border border-slate-200/60 dark:border-white/5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Asist. Mín: <b>{criterios?.min_asist_reg ?? 70}%</b> Reg. / <b>{criterios?.min_asist_promo ?? 80}%</b> Promo</span>
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                  {catedra?.nombre ?? 'Cátedra'}
                </h1>

                {/* Schedules display */}
                {schedules.length > 0 && (
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    <Clock className="w-3.5 h-3.5 text-text-muted shrink-0" />
                    <span className="text-xs text-text-muted font-medium">Horarios:</span>
                    {schedules.map((s, idx) => (
                      <span key={idx} className="text-xs bg-slate-100/80 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/5 px-2.5 py-0.5 rounded-lg text-text-secondary font-mono">
                        {s.dia} {s.desde}-{s.hasta} {s.aula ? `(${s.aula})` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons and quick stats on header */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                {/* Quick stats on header */}
                <div className="flex items-center gap-3 sm:gap-4 bg-slate-100/60 dark:bg-white/[0.04] p-3 sm:p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 shrink-0">
                  <div className="text-center px-2 sm:px-3">
                    <span className="text-[10px] uppercase font-bold text-text-muted block">Ciclo</span>
                    <span className="text-sm sm:text-base font-mono font-bold text-text-primary">
                      {catedra?.ciclos_lectivos?.nombre ?? catedra?.ciclos_lectivos?.anio ?? activeCiclo?.anio ?? 'Ciclo Actual'}
                    </span>
                  </div>
                  <div className="h-7 w-px bg-slate-200/80 dark:bg-white/10" />
                  <div className="text-center px-2 sm:px-3">
                    <span className="text-[10px] uppercase font-bold text-text-muted block">Régimen</span>
                    <span className="text-sm sm:text-base font-semibold text-text-primary">
                      {catedra?.modalidad ?? 'ANUAL'}
                    </span>
                  </div>
                  <div className="h-7 w-px bg-slate-200/80 dark:bg-white/10" />
                  <div className="text-center px-2 sm:px-3">
                    <span className="text-[10px] uppercase font-bold text-text-muted block">Aprobación</span>
                    <span className="text-sm sm:text-base font-mono font-bold text-primary">
                      {criterios?.nota_min_reg ?? 4}+ / 10
                    </span>
                  </div>
                </div>

                {/* Botón Disparador: Portal Estudiante */}
                <Button
                  variant="outline"
                  icon={Globe}
                  onClick={() => setIsPortalModalOpen(true)}
                  className={`text-xs sm:text-sm font-bold rounded-2xl min-h-[44px] shadow-xs px-3.5 whitespace-nowrap shrink-0 transition-all ${
                    catedra?.portal_activo
                      ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/25 hover:bg-emerald-500/15'
                      : 'border-slate-300/80 dark:border-white/15 text-text-secondary hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                  title="Configurar y compartir el portal público de consulta para los alumnos"
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${catedra?.portal_activo ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-600'}`} />
                    <span className="hidden sm:inline">Portal Estudiante</span>
                    <span className="sm:hidden">Portal</span>
                  </span>
                </Button>

                {/* Botón Disparador: Estadísticas de Cátedra */}
                <Button
                  variant="outline"
                  icon={BarChart3}
                  onClick={() => setIsStatsModalOpen(true)}
                  className="text-xs sm:text-sm font-bold border-primary/30 text-primary hover:bg-primary/10 rounded-2xl min-h-[44px] shadow-xs px-3.5 whitespace-nowrap shrink-0"
                  title="Ver gráficos estadísticos y distribución de rendimiento de los alumnos"
                >
                  <span className="hidden sm:inline">Estadísticas de Cátedra</span>
                  <span className="sm:hidden">Estadísticas</span>
                </Button>
              </div>
            </div>

            {/* Floating Pill Tab Navigation with 44px touch targets */}
            <div className="flex items-center gap-1.5 overflow-x-auto border-t border-slate-200/60 dark:border-white/10 mt-6 pt-4 pb-1 scrollbar-thin scroll-smooth -mx-2 px-2">
              {TABS_CONFIG.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 min-h-[44px] rounded-2xl text-xs font-medium whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer ${
                      isActive
                        ? 'bg-primary text-white shadow-md shadow-primary/25 font-bold scale-[1.02]'
                        : 'text-text-muted hover:text-text-primary hover:bg-slate-100/70 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate text-xs font-medium px-2.5 py-1.5 whitespace-nowrap">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tarjeta Bento: Avance del Programa Curricular y Unidades */}
        <ProgramaProgressCard
          catedraId={catedra.id}
          onSelectTab={handleTabChange}
        />

        {/* Tarjeta Bento: Alertas Preventivas y Semáforo de Riesgo */}
        <EarlyWarningCard
          catedraId={catedra.id}
          criterios={criterios}
          academicLevel={catedra.nivel}
          modalidad={catedra.modalidad}
          onSelectTab={handleTabChange}
        />

        {/* Tab Contents envuelto en Suspense con esqueleto especializado CatedraTabSkeleton */}
        <div key={activeTab} className="mt-4 animate-fadeInUp">
          <Suspense fallback={<CatedraTabSkeleton />}>
            {activeTab === 'asistencias' && (
              <AttendanceTab catedraId={catedra.id} catedraName={catedra.nombre} />
            )}

            {activeTab === 'calificaciones' && (
              <GradesTab 
                catedraId={catedra.id} 
                catedraName={catedra.nombre} 
                academicLevel={catedra.nivel}
                modalidad={catedra.modalidad}
              />
            )}

            {activeTab === 'alumnos' && (
              <StudentsTab 
                catedraId={catedra.id} 
                catedraName={catedra.nombre} 
                academicLevel={catedra.nivel}
                modalidad={catedra.modalidad}
                cicloId={catedra.ciclo_id || activeCiclo?.id}
              />
            )}

            {activeTab === 'unidades' && (
              <UnidadesTab 
                catedraId={catedra.id} 
                catedraName={catedra.nombre} 
                onNavigateToLibroTemas={() => handleTabChange('libro-temas')}
              />
            )}

            {activeTab === 'libro-temas' && (
              <LibroTemasTab 
                catedraId={catedra.id} 
                catedraName={catedra.nombre} 
              />
            )}

            {activeTab === 'mesas-examen' && (
              <MesasExamenTab 
                catedraId={catedra.id} 
                catedraName={catedra.nombre} 
                academicLevel={catedra.nivel}
                modalidad={catedra.modalidad}
              />
            )}

            {activeTab === 'recursos' && (
              <ResourcesTab catedraId={catedra.id} catedraName={catedra.nombre} />
            )}

            {activeTab === 'configuracion' && (
              <SettingsTab catedra={catedra} onCatedraUpdated={handleCatedraUpdated} />
            )}
          </Suspense>
        </div>

        {/* Modal Bento de Rendimiento Académico y Estadísticas (Cargado en Suspense) */}
        {isStatsModalOpen && (
          <Suspense fallback={null}>
            <CatedraStatsModal
              isOpen={isStatsModalOpen}
              onClose={() => setIsStatsModalOpen(false)}
              catedraId={catedra?.id}
              catedraName={catedra?.nombre}
              academicLevel={catedra?.nivel}
              modalidad={catedra?.modalidad}
            />
          </Suspense>
        )}

        {/* Modal Bento: Configuración del Portal de Consulta para Alumnos */}
        {isPortalModalOpen && (
          <Suspense fallback={null}>
            <PortalSettingsModal
              isOpen={isPortalModalOpen}
              onClose={() => setIsPortalModalOpen(false)}
              catedra={catedra}
              onCatedraUpdated={handleCatedraUpdated}
            />
          </Suspense>
        )}
      </div>
    </ErrorBoundary>
  );
}
