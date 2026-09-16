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
  Globe,
  Lock,
  Flag,
  Unlock
} from 'lucide-react';
import { toast } from 'sonner';
import { handleAppError } from '../utils/handleAppError';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
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
  const [isCierreModalOpen, setIsCierreModalOpen] = useState(false);
  const [isReabrirModalOpen, setIsReabrirModalOpen] = useState(false);
  const [isCierreActionLoading, setIsCierreActionLoading] = useState(false);
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

  async function handleFinalizarCursadaConfirm() {
    if (!id) return;
    setIsCierreActionLoading(true);
    try {
      const nowIso = new Date().toISOString();
      if (isSupabaseConfigured && !isDemo) {
        const { error } = await supabase
          .from('catedras')
          .update({
            cursada_finalizada: true,
            fecha_cierre_cursada: nowIso
          })
          .eq('id', id);

        if (error) {
          console.warn('Fallback updating cursada_finalizada in local storage:', error);
        }
      }

      const updated = {
        ...catedra,
        cursada_finalizada: true,
        fecha_cierre_cursada: nowIso
      };
      setCatedra(updated);
      try {
        localStorage.setItem(`cursada_finalizada_${id}`, JSON.stringify({
          cursada_finalizada: true,
          fecha_cierre_cursada: nowIso
        }));
      } catch (_) {}

      toast.success('Cursado finalizado. Se habilitó la instancia de exámenes y acreditación.');
      setIsCierreModalOpen(false);
      navigate(`/mesas-examen?catedraId=${id}`);
    } catch (err) {
      handleAppError(err, 'CatedraDetailPage / Finalizar cursado');
    } finally {
      setIsCierreActionLoading(false);
    }
  }

  async function handleReabrirCursadaConfirm() {
    if (!id) return;
    setIsCierreActionLoading(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { error } = await supabase
          .from('catedras')
          .update({
            cursada_finalizada: false,
            fecha_cierre_cursada: null
          })
          .eq('id', id);

        if (error) {
          console.warn('Fallback reopening cursada locally:', error);
        }
      }

      const updated = {
        ...catedra,
        cursada_finalizada: false,
        fecha_cierre_cursada: null
      };
      setCatedra(updated);
      try {
        localStorage.setItem(`cursada_finalizada_${id}`, JSON.stringify({
          cursada_finalizada: false,
          fecha_cierre_cursada: null
        }));
      } catch (_) {}

      toast.success('Cursado reabierto. Asistencias y calificaciones habilitadas.');
      setIsReabrirModalOpen(false);
    } catch (err) {
      handleAppError(err, 'CatedraDetailPage / Reabrir cursado');
    } finally {
      setIsCierreActionLoading(false);
    }
  }

  async function fetchCatedraData() {
    if (!id) return;
    setLoading(true);
    setErrorMsg('');
    try {
      if (isSupabaseConfigured && !isDemo) {
        const [catedraRes, critRes] = await Promise.all([
          supabase
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
            .single(),
          supabase
            .from('criterios_evaluacion')
            .select('min_asist_promo, min_asist_reg, nota_min_promo, nota_min_reg, nota_min_sec')
            .eq('catedra_id', id)
            .maybeSingle()
        ]);

        if (catedraRes.error) throw catedraRes.error;
        const data = catedraRes.data;
        
        // Cargar estado de cierre de cursada (con fallback local)
        let cursadaFin = data.cursada_finalizada;
        let fechaCierre = data.fecha_cierre_cursada;
        if (cursadaFin === undefined || cursadaFin === null) {
          try {
            const storedFin = JSON.parse(localStorage.getItem(`cursada_finalizada_${id}`) || 'null');
            if (storedFin) {
              cursadaFin = storedFin.cursada_finalizada;
              fechaCierre = storedFin.fecha_cierre_cursada;
            }
          } catch (_) {}
        }
        
        setCatedra({
          ...data,
          cursada_finalizada: Boolean(cursadaFin),
          fecha_cierre_cursada: fechaCierre || null
        });

        if (critRes.data) {
          setCriterios({
            min_asist_promo: Number(critRes.data.min_asist_promo) || 80,
            min_asist_reg: Number(critRes.data.min_asist_reg) || 70,
            nota_min_promo: Number(critRes.data.nota_min_promo) || 7,
            nota_min_reg: Number(critRes.data.nota_min_reg) || 4,
            nota_min_sec: Number(critRes.data.nota_min_sec) || 6
          });
        }
      } else {
        // Modo demo / LocalStorage
        let found = (catedras ?? []).find((c) => c.id === id);
        if (!found) {
          try {
            const stored = JSON.parse(localStorage.getItem('demo_catedras') || '[]');
            found = stored.find((c) => c.id === id);
          } catch (_) {}
        }

        let cursadaFin = false;
        let fechaCierre = null;
        try {
          const storedFin = JSON.parse(localStorage.getItem(`cursada_finalizada_${id}`) || 'null');
          if (storedFin) {
            cursadaFin = storedFin.cursada_finalizada;
            fechaCierre = storedFin.fecha_cierre_cursada;
          }
        } catch (_) {}

        if (found) {
          setCatedra({
            ...found,
            cursada_finalizada: cursadaFin || Boolean(found.cursada_finalizada),
            fecha_cierre_cursada: fechaCierre || found.fecha_cierre_cursada || null
          });
        } else {
          // Fallback mock seguro
          setCatedra({
            id,
            nombre: 'Programación Web II',
            nivel: 'TERCIARIO',
            modalidad: 'ANUAL',
            institucion_nombre: 'I.S.F.T. N° 179',
            cursada_finalizada: cursadaFin,
            fecha_cierre_cursada: fechaCierre,
            horarios_semanales: [
              { dia: 'Lunes', desde: '18:00', hasta: '20:00', aula: 'Lab 1' },
              { dia: 'Miércoles', desde: '18:00', hasta: '20:00', aula: 'Lab 1' }
            ]
          });
        }
      }
    } catch (err) {
      handleAppError(err, 'CatedraDetailPage / fetchCatedraData', user);
      setErrorMsg('No se pudo cargar la cátedra solicitada.');
    } finally {
      setLoading(false);
    }
  }

  // Sincronizar pestaña desde URL (redirige mesas-examen al nuevo módulo independiente)
  useEffect(() => {
    if (tabFromUrl === 'mesas-examen') {
      navigate(`/mesas-examen?catedraId=${id}`, { replace: true });
      return;
    }
    if (tabFromUrl && isValidCatedraTab(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl, id, navigate]);

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
            cursadaFinalizada={Boolean(catedra?.cursada_finalizada)}
            fechaCierreCursada={catedra?.fecha_cierre_cursada}
            onFinalizarCursada={() => setIsCierreModalOpen(true)}
            onReabrirCursada={() => setIsReabrirModalOpen(true)}
          />

          {/* Banner de Aviso cuando la cursada está finalizada */}
          {Boolean(catedra?.cursada_finalizada) && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-primary/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                    Cursada finalizada — Período de Exámenes y Acreditación
                  </p>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                    El registro diario de asistencias y parciales regulares está cerrado. Gestiona actas y acredita a los estudiantes en Mesas de Examen.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="primary"
                icon={Award}
                onClick={() => navigate(`/mesas-examen?catedraId=${id}`)}
                className="text-xs shrink-0 font-bold"
              >
                Ir a Mesas de Examen
              </Button>
            </div>
          )}

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
              <AttendanceTab 
                catedraId={catedra.id} 
                catedraName={catedra.nombre} 
                cursadaFinalizada={Boolean(catedra?.cursada_finalizada)}
              />
            )}

            {activeTab === 'calificaciones' && (
              <GradesTab 
                catedraId={catedra.id} 
                catedraName={catedra.nombre} 
                academicLevel={catedra.nivel}
                modalidad={catedra.modalidad}
                cursadaFinalizada={Boolean(catedra?.cursada_finalizada)}
              />
            )}

            {activeTab === 'alumnos' && (
              <StudentsTab 
                catedraId={catedra.id} 
                catedraName={catedra.nombre} 
                academicLevel={catedra.nivel}
                modalidad={catedra.modalidad}
                cicloId={catedra.ciclo_id || activeCiclo?.id}
                cursadaFinalizada={Boolean(catedra?.cursada_finalizada)}
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

        {/* Modal de Confirmación: Finalizar Cursado */}
        {isCierreModalOpen && (
          <Modal
            isOpen={isCierreModalOpen}
            onClose={() => !isCierreActionLoading && setIsCierreModalOpen(false)}
            title="🏁 Finalizar Cursado de Cátedra"
            size="md"
          >
            <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-900 dark:text-amber-200">
                    ¿Confirmas la finalización del período de cursada?
                  </p>
                  <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed text-xs">
                    Al finalizar el cursado, la toma de asistencia diaria y la carga de calificaciones regulares se mantendrán en modo solo lectura.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-white/5 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  ¿Qué ocurre al finalizar el cursado?
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 text-xs">
                  <li>Se fija la condición final de los estudiantes (Promocionales, Regulares, Libres).</li>
                  <li>Se habilitan prioritariamente las <b>Mesas de Examen</b> para constituir actas volantes y acreditar materias.</li>
                  <li>Puedes reabrir el cursado en cualquier momento si necesitas hacer correcciones excepcionales.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-white/10">
                <Button
                  variant="outline"
                  onClick={() => setIsCierreModalOpen(false)}
                  disabled={isCierreActionLoading}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  icon={Flag}
                  onClick={handleFinalizarCursadaConfirm}
                  loading={isCierreActionLoading}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  Confirmar y Finalizar Cursado
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Modal de Confirmación: Reabrir Cursado */}
        {isReabrirModalOpen && (
          <Modal
            isOpen={isReabrirModalOpen}
            onClose={() => !isCierreActionLoading && setIsReabrirModalOpen(false)}
            title="🔓 Reabrir Cursado de Cátedra"
            size="sm"
          >
            <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              <p className="leading-relaxed">
                Reabrir el cursado reactivará el registro de asistencias diarias y la edición de notas de parciales y trabajos prácticos.
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-white/10">
                <Button
                  variant="outline"
                  onClick={() => setIsReabrirModalOpen(false)}
                  disabled={isCierreActionLoading}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  icon={Unlock}
                  onClick={handleReabrirCursadaConfirm}
                  loading={isCierreActionLoading}
                  className="font-bold"
                >
                  Confirmar Reapertura
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </ErrorBoundary>
  );
}
