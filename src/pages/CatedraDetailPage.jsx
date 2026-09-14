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
import CatedraHeader from '../components/catedra/CatedraHeader';
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

          {/* Hero Bento Header unificado */}
          <CatedraHeader
            catedra={catedra}
            criterios={criterios}
            activeCiclo={activeCiclo}
            onOpenPortal={() => setIsPortalModalOpen(true)}
            onOpenStats={() => setIsStatsModalOpen(true)}
          />

          {/* Floating Pill Tab Navigation Dock con touch targets mínimos de 44px */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl p-1.5 sm:p-2 shadow-xs mb-6 overflow-x-auto scrollbar-thin scroll-smooth">
            <div className="flex items-center gap-1.5 min-w-max">
              {TABS_CONFIG.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 min-h-[44px] rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer ${
                      isActive
                        ? 'bg-primary text-white shadow-sm shadow-primary/30 font-bold scale-[1.01]'
                        : 'text-text-muted hover:text-text-primary hover:bg-slate-100/80 dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{tab.label}</span>
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
