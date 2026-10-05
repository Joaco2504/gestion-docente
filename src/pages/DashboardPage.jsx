import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useDashboardData } from '../features/dashboard/hooks/useDashboardData';
import { calculateUpcomingClass, normalizeSearchText, calculateDisplayedMetrics } from '../features/dashboard/utils/dashboardHelpers';
import DashboardTodayFocus from '../features/dashboard/components/DashboardTodayFocus';
import DashboardActionCards from '../features/dashboard/components/DashboardActionCards';
import UpcomingClassCard from '../features/dashboard/components/UpcomingClassCard';
import QuickMetricsCard from '../features/dashboard/components/QuickMetricsCard';
import CatedrasSection from '../features/dashboard/components/CatedrasSection';
import DashboardAgendaSection from '../features/dashboard/components/DashboardAgendaSection';
import NuevaCatedraModal from '../features/dashboard/components/modals/NuevaCatedraModal';
import QuickClassModal from '../features/dashboard/components/modals/QuickClassModal';
import QuickEventModal from '../features/dashboard/components/modals/QuickEventModal';

const EditarCatedraModal = lazy(() => import('../components/catedra/EditarCatedraModal'));

export default function DashboardPage() {
  useDocumentTitle('Panel Principal');
  const { user, isDemo } = useAuth();
  const { instituciones, activeInstitucion, activeCiclo, ciclosLectivos, refreshData } = useApp();

  // 1. Data Hook
  const {
    loading, catedrasList, setCatedrasList,
    agendaItems, setAgendaItems, fetchDashboardData
  } = useDashboardData(user, isDemo, activeCiclo);

  // 2. Filters & Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [selectedInstFilter] = useState('ALL');
  const [selectedMetricsCatedraId, setSelectedMetricsCatedraId] = useState('all');

  // 3. Modals State
  const [isNewCatedraModalOpen, setIsNewCatedraModalOpen] = useState(false);
  const [editingCatedra, setEditingCatedra] = useState(null);
  const [activeMenuCatedraId, setActiveMenuCatedraId] = useState(null);
  const [isQuickClassModalOpen, setIsQuickClassModalOpen] = useState(false);
  const [targetCatedraForClass, setTargetCatedraForClass] = useState(null);
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);

  // 4. Computed Data
  const upcomingClass = useMemo(() => calculateUpcomingClass(catedrasList), [catedrasList]);

  const filteredCatedras = useMemo(() => {
    const rawQuery = searchQuery.trim();
    const normalizedQuery = normalizeSearchText(rawQuery);
    return catedrasList.filter(cat => {
      if (levelFilter !== 'ALL' && cat.nivel !== levelFilter) return false;
      if (selectedInstFilter !== 'ALL' && cat.institucion_id !== selectedInstFilter) return false;
      if (normalizedQuery) {
        const matchesName = normalizeSearchText(cat.nombre).includes(normalizedQuery);
        const matchesInst = normalizeSearchText(cat.institucion_nombre).includes(normalizedQuery);
        const matchesNivel = normalizeSearchText(cat.nivel).includes(normalizedQuery);
        if (!matchesName && !matchesInst && !matchesNivel) return false;
      }
      return true;
    });
  }, [catedrasList, levelFilter, selectedInstFilter, searchQuery]);

  const metricsCatedraOptions = useMemo(() => [
    { value: 'all', label: '📊 Consolidado General (Todas)' },
    ...catedrasList.map(c => ({
      value: c.id,
      label: `${c.nombre} (${c.institucion_nombre || 'Inst.'})`,
      badge: c.nivel === 'TERCIARIO' ? 'Terc.' : 'Sec.'
    }))
  ], [catedrasList]);

  const displayedMetrics = useMemo(
    () => calculateDisplayedMetrics(catedrasList, selectedMetricsCatedraId),
    [catedrasList, selectedMetricsCatedraId]
  );

  return (
    <div className="space-y-6">
      {/* 1. Jerarquía del Día "Hoy" y Alertas Tempranas */}
      <DashboardTodayFocus
        user={user}
        upcomingClass={upcomingClass}
        catedrasList={catedrasList}
        agendaItems={agendaItems}
        activeCiclo={activeCiclo}
      />

      {/* 2. Acciones Rápidas Superiores */}
      <DashboardActionCards
        onOpenNewCatedra={() => setIsNewCatedraModalOpen(true)}
        upcomingClass={upcomingClass}
        firstCatedraId={catedrasList[0]?.id}
      />

      {/* 3. Monitoreo Operativo Bento 50/50 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 items-stretch">
        <UpcomingClassCard upcomingClass={upcomingClass} />
        <QuickMetricsCard
          displayedMetrics={displayedMetrics}
          selectedMetricsCatedraId={selectedMetricsCatedraId}
          onSelectMetricsCatedraId={setSelectedMetricsCatedraId}
          metricsCatedraOptions={metricsCatedraOptions}
          activeCiclo={activeCiclo}
        />
      </section>

      {/* 4. Mis Cátedras Activas */}
      <CatedrasSection
        loading={loading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        levelFilter={levelFilter}
        onLevelFilterChange={setLevelFilter}
        filteredCatedras={filteredCatedras}
        totalCatedrasCount={catedrasList.length}
        activeMenuCatedraId={activeMenuCatedraId}
        onToggleMenu={setActiveMenuCatedraId}
        onEditCatedra={setEditingCatedra}
        onRegisterFirstClass={(cat) => {
          setTargetCatedraForClass(cat);
          setIsQuickClassModalOpen(true);
        }}
        onOpenNewCatedra={() => setIsNewCatedraModalOpen(true)}
      />

      {/* 5. Agenda Crítica & Fechas Importantes */}
      <DashboardAgendaSection
        loading={loading}
        agendaItems={agendaItems}
        onOpenNewEventModal={() => setIsNewEventModalOpen(true)}
      />

      {/* 6. Modales */}
      <NuevaCatedraModal
        isOpen={isNewCatedraModalOpen}
        onClose={() => setIsNewCatedraModalOpen(false)}
        user={user}
        isDemo={isDemo}
        instituciones={instituciones}
        activeInstitucion={activeInstitucion}
        activeCiclo={activeCiclo}
        ciclosLectivos={ciclosLectivos}
        refreshData={refreshData}
        onCatedraCreated={async (newCat) => {
          if (isDemo || !user) setCatedrasList(prev => [newCat, ...prev]);
          else await fetchDashboardData();
        }}
      />

      <QuickClassModal
        isOpen={isQuickClassModalOpen}
        onClose={() => setIsQuickClassModalOpen(false)}
        targetCatedra={targetCatedraForClass}
        user={user}
        isDemo={isDemo}
        onClassCreated={async (localClass) => {
          if (localClass) setCatedrasList(prev => prev.map(c => c.id === targetCatedraForClass?.id ? { ...c, ultima_clase: localClass } : c));
          else await fetchDashboardData();
        }}
      />

      <QuickEventModal
        isOpen={isNewEventModalOpen}
        onClose={() => setIsNewEventModalOpen(false)}
        user={user}
        isDemo={isDemo}
        onEventCreated={async (localEvent) => {
          if (localEvent) setAgendaItems(prev => [localEvent, ...prev].sort((a, b) => a.fecha.localeCompare(b.fecha)));
          else await fetchDashboardData();
        }}
      />

      {editingCatedra && (
        <Suspense fallback={null}>
          <EditarCatedraModal
            isOpen={Boolean(editingCatedra)}
            onClose={() => setEditingCatedra(null)}
            catedra={editingCatedra}
            onCatedraUpdated={(updated) => {
              setCatedrasList(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
              setEditingCatedra(null);
              if (refreshData) refreshData();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
