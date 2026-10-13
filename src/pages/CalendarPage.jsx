import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Card from '../components/common/Card';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { getTodayYMD } from '../lib/dateUtils';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import CalendarSidebar from '../components/calendar/CalendarSidebar';
import CalendarHeader from '../components/calendar/CalendarHeader';
import CalendarWeekView from '../components/calendar/CalendarWeekView';
import CalendarMonthView from '../components/calendar/CalendarMonthView';
import CalendarAgendaView from '../components/calendar/CalendarAgendaView';
import { CalendarSkeleton, CalendarErrorState } from '../components/calendar/CalendarStatus';
import { 
  EventDetailModal, 
  NewEventModal, 
  SyncIcsModal, 
  LegendModal 
} from '../components/calendar/CalendarModals';

import CalendarErrorBoundary from '../components/calendar/CalendarErrorBoundary';

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const HOURS_24 = Array.from({ length: 17 }, (_, i) => i + 7);
const HOUR_ROW_HEIGHT = 80;

function safeIsoDate(d, fallback = '') {
  if (!d) return fallback;
  const dateObj = d instanceof Date ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return fallback;
  try {
    return dateObj.toISOString().split('T')[0];
  } catch (_) {
    return fallback;
  }
}

function CalendarPageContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isDemo } = useAuth();
  const { catedras, activeCiclo, periodosAcademicos } = useApp();

  const initialView = useMemo(() => {
    const v = new URLSearchParams(location.search).get('view');
    return v === 'dia' || v === 'mensual' || v === 'semanal' ? v : 'semanal';
  }, [location.search]);

  const [viewMode, setViewMode] = useState(initialView);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [miniCalDate, setMiniCalDate] = useState(new Date());

  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [selectedEventForDetail, setSelectedEventForDetail] = useState(null);
  const [newEventPreset, setNewEventPreset] = useState({ targetDate: null, hour: null });

  useEffect(() => {
    const v = new URLSearchParams(location.search).get('view');
    if (v && (v === 'dia' || v === 'semanal' || v === 'mensual')) {
      setViewMode(v);
    }
  }, [location.search]);

  const {
    loading,
    fetchError,
    fetchAllCalendarData,
    catFilters,
    setCatFilters,
    categoryFilters,
    setCategoryFilters,
    feriadosMap,
    regularClassesList,
    allFilteredEvents,
    nextUpcomingItem,
    getItemDesign,
    weekDays,
    miniCalDays,
    mainCalMonthDays,
    formattedHeaderRange,
    currentTimeIndicator,
    handleCreateEvent,
    handleDeleteEvent,
    handleDownloadIcs
  } = useCalendarEvents({ 
    user, 
    isDemo, 
    catedras, 
    activeCiclo, 
    periodosAcademicos,
    currentDate,
    miniCalDate,
    viewMode
  });

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'dia') d.setDate(d.getDate() - 1);
    else if (viewMode === 'semanal') d.setDate(d.getDate() - 7);
    else if (viewMode === 'mensual') d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'dia') d.setDate(d.getDate() + 1);
    else if (viewMode === 'semanal') d.setDate(d.getDate() + 7);
    else if (viewMode === 'mensual') d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setMiniCalDate(now);
  };

  const docenteNombre = user?.user_metadata?.nombre_completo || 'Prof. Pacheco E. Joaquín';

  // Soporte para simulación de Error Boundary
  if (typeof window !== 'undefined' && (window.__FORCE_CALENDAR_CRASH__ || new URLSearchParams(window.location.search).get('crash') === 'true')) {
    throw new Error('Simulated Calendar Crash for ErrorBoundary Verification');
  }

  if (loading) return <CalendarSkeleton />;
  if (fetchError) return <CalendarErrorState onRetry={fetchAllCalendarData} onGoHome={() => navigate('/dashboard')} />;

  return (
    <div className="w-full max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-6 min-h-[calc(100vh-5rem)] font-sans antialiased text-slate-800 dark:text-slate-100">
      <CalendarSidebar
        docenteNombre={docenteNombre}
        miniCalDate={miniCalDate}
        setMiniCalDate={setMiniCalDate}
        miniCalDays={miniCalDays}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        allFilteredEvents={allFilteredEvents}
        nextUpcomingItem={nextUpcomingItem}
        catedras={catedras}
        catFilters={catFilters}
        setCatFilters={setCatFilters}
        categoryFilters={categoryFilters}
        setCategoryFilters={setCategoryFilters}
        isLegendCollapsed={isLegendCollapsed}
        setIsLegendCollapsed={setIsLegendCollapsed}
        onTodayClick={handleToday}
      />

      <main className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
        <Card variant="default" className="p-6 flex flex-col gap-6">
          <CalendarHeader
            formattedHeaderRange={formattedHeaderRange}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onPrev={handlePrev}
            onToday={handleToday}
            onNext={handleNext}
            onOpenLegend={() => setIsLegendOpen(true)}
            onOpenSync={() => setIsSyncModalOpen(true)}
            onAddNew={() => {
              setNewEventPreset({ targetDate: safeIsoDate(currentDate, getTodayYMD()), hour: 18 });
              setIsNewEventModalOpen(true);
            }}
          />

          <div key={`${viewMode}-${safeIsoDate(currentDate, getTodayYMD())}`} className="w-full overflow-hidden cal-view-transition">
            {viewMode === 'semanal' && (
              <CalendarWeekView
                weekDays={weekDays}
                DAYS_OF_WEEK={DAYS_OF_WEEK}
                HOURS_24={HOURS_24}
                HOUR_ROW_HEIGHT={HOUR_ROW_HEIGHT}
                currentTimeIndicator={currentTimeIndicator}
                feriadosMap={feriadosMap}
                regularClassesList={regularClassesList}
                allFilteredEvents={allFilteredEvents}
                getItemDesign={getItemDesign}
                onSelectEvent={(ev) => setSelectedEventForDetail(ev)}
                onSelectDay={(d) => {
                  setCurrentDate(d);
                  setViewMode('dia');
                }}
                onNewEventAt={({ targetDate, hour }) => {
                  setNewEventPreset({ targetDate: safeIsoDate(targetDate, getTodayYMD()), hour });
                  setIsNewEventModalOpen(true);
                }}
              />
            )}

            {viewMode === 'mensual' && (
              <CalendarMonthView
                mainCalMonthDays={mainCalMonthDays}
                DAYS_OF_WEEK={DAYS_OF_WEEK}
                currentDate={currentDate}
                feriadosMap={feriadosMap}
                allFilteredEvents={allFilteredEvents}
                getItemDesign={getItemDesign}
                onSelectEvent={(ev) => setSelectedEventForDetail(ev)}
                onSelectDay={(d) => {
                  setCurrentDate(d);
                  setViewMode('dia');
                }}
              />
            )}

            {viewMode === 'dia' && (
              <CalendarAgendaView
                currentDate={currentDate}
                DAYS_OF_WEEK={DAYS_OF_WEEK}
                regularClassesList={regularClassesList}
                allFilteredEvents={allFilteredEvents}
                feriadosMap={feriadosMap}
                getItemDesign={getItemDesign}
                onSelectEvent={(ev) => setSelectedEventForDetail(ev)}
                onAddEventForToday={() => {
                  setNewEventPreset({ targetDate: safeIsoDate(currentDate, getTodayYMD()), hour: 18 });
                  setIsNewEventModalOpen(true);
                }}
                onNavigateAttendance={(item) => {
                  if (item.catedra_id) navigate(`/catedra/${item.catedra_id}?tab=asistencias`);
                  else navigate('/asistencia');
                }}
              />
            )}
          </div>
        </Card>
      </main>

      <EventDetailModal
        selectedEvent={selectedEventForDetail}
        onClose={() => setSelectedEventForDetail(null)}
        onDelete={async (id) => {
          const ok = await handleDeleteEvent(id);
          if (ok) setSelectedEventForDetail(null);
        }}
        onNavigateAttendance={(ev) => {
          setSelectedEventForDetail(null);
          if (ev.catedra_id) navigate(`/catedra/${ev.catedra_id}?tab=asistencias`);
          else navigate('/asistencia');
        }}
        feriadosMap={feriadosMap}
      />

      <NewEventModal
        isOpen={isNewEventModalOpen}
        onClose={() => setIsNewEventModalOpen(false)}
        onSubmit={handleCreateEvent}
        catedras={catedras}
        initialDate={newEventPreset.targetDate}
        initialHour={newEventPreset.hour}
      />

      <SyncIcsModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onDownloadIcs={() => {
          handleDownloadIcs();
          setIsSyncModalOpen(false);
        }}
      />

      <LegendModal
        isOpen={isLegendOpen}
        onClose={() => setIsLegendOpen(false)}
        catedras={catedras}
      />
    </div>
  );
}

export default function CalendarPage() {
  return (
    <CalendarErrorBoundary>
      <CalendarPageContent />
    </CalendarErrorBoundary>
  );
}
