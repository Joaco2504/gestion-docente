import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckSquare, 
  GraduationCap, 
  FileSpreadsheet, 
  FolderOpen, 
  Settings as SettingsIcon, 
  Clock, 
  Users, 
  Building,
  AlertCircle,
  ShieldCheck,
  Calendar,
  Percent,
  BarChart3,
  BookOpen,
  Award
} from 'lucide-react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Card from '../components/common/Card';
import AttendanceTab from '../components/catedra/AttendanceTab';
import GradesTab from '../components/catedra/GradesTab';
import StudentsTab from '../components/catedra/StudentsTab';
import ResourcesTab from '../components/catedra/ResourcesTab';
import SettingsTab from '../components/catedra/SettingsTab';
import LibroTemasTab from '../components/catedra/LibroTemasTab';
import MesasExamenTab from '../components/catedra/MesasExamenTab';
import EarlyWarningCard from '../components/catedra/EarlyWarningCard';
import CatedraStatsModal from '../components/catedra/CatedraStatsModal';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export default function CatedraDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isDemo } = useAuth();
  const { catedras, activeCiclo } = useApp();

  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const tabFromUrl = searchParams.get('tab');
  const validTabs = ['alumnos', 'asistencias', 'calificaciones', 'libro-temas', 'mesas-examen', 'recursos', 'configuracion'];
  const [activeTab, setActiveTab] = useState(() => {
    return validTabs.includes(tabFromUrl) ? tabFromUrl : 'asistencias';
  });

  useEffect(() => {
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };
  const [catedra, setCatedra] = useState(null);
  const [criterios, setCriterios] = useState({
    min_asist_promo: 80,
    min_asist_reg: 70,
    nota_min_promo: 7,
    nota_min_reg: 4
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (id) {
      try {
        localStorage.setItem('last_active_catedra_id', id);
      } catch (e) {
        // ignore localStorage errors
      }
    }
    fetchCatedraData();
  }, [id]);

  const fetchCatedraData = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && !isDemo) {
        const { data, error } = await supabase
          .from('catedras')
          .select(`
            *,
            instituciones (
              nombre,
              nivel
            )
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setCatedra(data);

        try {
          const { data: critData } = await supabase
            .from('criterios_evaluacion')
            .select('min_asist_promo, min_asist_reg, nota_min_promo, nota_min_reg')
            .eq('catedra_id', id)
            .maybeSingle();
          if (critData) {
            setCriterios({
              min_asist_promo: Number(critData.min_asist_promo) || 80,
              min_asist_reg: Number(critData.min_asist_reg) || 70,
              nota_min_promo: Number(critData.nota_min_promo) || 7,
              nota_min_reg: Number(critData.nota_min_reg) || 4
            });
          }
        } catch (_) {}
      } else {
        // Look up in AppContext catedras or localStorage
        let found = catedras.find((c) => c.id === id);
        if (!found) {
          const stored = JSON.parse(localStorage.getItem('demo_catedras') || '[]');
          found = stored.find((c) => c.id === id);
        }

        if (found) {
          setCatedra(found);
        } else {
          // Fallback mock
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
  };

  const handleCatedraUpdated = (updated) => {
    setCatedra(updated);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (errorMsg || !catedra) {
    return (
      <Card className="text-center py-16">
        <AlertCircle className="w-10 h-10 text-danger mx-auto mb-3" />
        <h3 className="text-base font-bold text-text-primary mb-1">Cátedra no encontrada</h3>
        <p className="text-xs text-text-muted mb-4">{errorMsg || 'La cátedra seleccionada no existe o no tienes acceso.'}</p>
        <Button variant="primary" icon={ArrowLeft} onClick={() => navigate('/dashboard')}>
          Volver al Panel
        </Button>
      </Card>
    );
  }

  const schedules = Array.isArray(catedra.horarios_semanales) ? catedra.horarios_semanales : [];

  const tabs = [
    { id: 'alumnos', label: 'Alumnos', icon: Users },
    { id: 'asistencias', label: 'Asistencias', icon: CheckSquare },
    { id: 'calificaciones', label: 'Calificaciones', icon: GraduationCap },
    { id: 'libro-temas', label: 'Libro de Temas', icon: BookOpen },
    { id: 'mesas-examen', label: 'Mesas de Examen', icon: Award },
    { id: 'recursos', label: 'Recursos y Archivos', icon: FolderOpen },
    { id: 'configuracion', label: 'Configuración y Criterios', icon: SettingsIcon }
  ];

  return (
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
                <Badge variant={catedra.nivel === 'TERCIARIO' ? 'primary' : 'warning'}>
                  {catedra.nivel}
                </Badge>
                <Badge variant="default">
                  {catedra.modalidad}
                </Badge>
                <span className="text-xs text-text-muted flex items-center gap-1 font-medium bg-slate-100/60 dark:bg-white/[0.04] px-2.5 py-0.5 rounded-lg border border-slate-200/60 dark:border-white/5">
                  <Building className="w-3.5 h-3.5 text-primary" />
                  <span>{catedra.instituciones?.nombre || catedra.institucion_nombre || 'Institución'}</span>
                </span>
                <span className="text-xs text-text-muted flex items-center gap-1 font-medium bg-slate-100/60 dark:bg-white/[0.04] px-2.5 py-0.5 rounded-lg border border-slate-200/60 dark:border-white/5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Asist. Mín: <b>{criterios.min_asist_reg}%</b> Reg. / <b>{criterios.min_asist_promo}%</b> Promo</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                {catedra.nombre}
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
                  <span className="text-sm sm:text-base font-mono font-bold text-text-primary">{activeCiclo?.anio || '2026'}</span>
                </div>
                <div className="h-7 w-px bg-slate-200/80 dark:bg-white/10" />
                <div className="text-center px-2 sm:px-3">
                  <span className="text-[10px] uppercase font-bold text-text-muted block">Régimen</span>
                  <span className="text-sm sm:text-base font-semibold text-text-primary">{catedra.modalidad}</span>
                </div>
                <div className="h-7 w-px bg-slate-200/80 dark:bg-white/10" />
                <div className="text-center px-2 sm:px-3">
                  <span className="text-[10px] uppercase font-bold text-text-muted block">Aprobación</span>
                  <span className="text-sm sm:text-base font-mono font-bold text-primary">{criterios.nota_min_reg}+ / 10</span>
                </div>
              </div>

              {/* Botón Disparador: Estadísticas de Cátedra */}
              <Button
                variant="outline"
                icon={BarChart3}
                onClick={() => setIsStatsModalOpen(true)}
                className="text-xs sm:text-sm font-bold border-primary/30 text-primary hover:bg-primary/10 rounded-2xl min-h-[44px] shadow-xs px-3.5"
                title="Ver gráficos estadísticos y distribución de rendimiento de los alumnos"
              >
                Estadísticas de Cátedra
              </Button>
            </div>
          </div>

          {/* Floating Pill Tab Navigation with 44px touch targets */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-t border-slate-200/60 dark:border-white/10 mt-6 pt-4 pb-1 scrollbar-thin scroll-smooth -mx-2 px-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-2xl text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 duration-100 cursor-pointer ${
                    isActive
                      ? 'bg-primary text-white shadow-md shadow-primary/25 font-bold scale-[1.02]'
                      : 'text-text-muted hover:text-text-primary hover:bg-slate-100/70 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tarjeta Bento: Alertas Preventivas y Semáforo de Riesgo */}
      <EarlyWarningCard
        catedraId={catedra.id}
        criterios={criterios}
        academicLevel={catedra.nivel}
        modalidad={catedra.modalidad}
        onSelectTab={handleTabChange}
      />

      {/* Tab Contents con micro-animación suave de entrada (200ms) */}
      <div key={activeTab} className="mt-4 animate-fadeInUp">
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
      </div>

      {/* Modal Bento de Rendimiento Académico y Estadísticas */}
      <CatedraStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        catedraId={catedra.id}
        catedraName={catedra.nombre}
        academicLevel={catedra.nivel}
        modalidad={catedra.modalidad}
      />
    </div>
  );
}
