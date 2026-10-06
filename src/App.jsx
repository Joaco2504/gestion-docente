import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from './context/AuthContext';
import { useApp } from './context/AppContext';
import { useTheme } from './context/ThemeContext';
import Navbar from './components/layout/Navbar';
import AppSidebar from './components/layout/AppSidebar';
import BottomNav from './components/layout/BottomNav';
import HeaderSelector from './components/layout/HeaderSelector';
import Footer from './components/layout/Footer';
import CreateCatedraModal from './components/common/CreateCatedraModal';
import RouteLoadingSpinner from './components/common/RouteLoadingSpinner';

import ErrorBoundary from './components/common/ErrorBoundary';

/**
 * Envoltorio resiliente para importaciones diferidas (React.lazy)
 * Si un chunk falla por despliegue nuevo (404), recarga la ventana automáticamente una vez.
 */
function lazyWithRetry(componentImport) {
  return lazy(async () => {
    try {
      const component = await componentImport();
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('korum_chunk_reloaded');
      }
      return component;
    } catch (error) {
      const isChunkError = Boolean(
        error &&
        (error.name === 'ChunkLoadError' ||
          /Failed to fetch dynamically imported module|Importing a module script failed/i.test(
            error.message || ''
          ))
      );
      if (typeof window !== 'undefined' && isChunkError) {
        const hasReloaded = window.sessionStorage.getItem('korum_chunk_reloaded');
        if (!hasReloaded) {
          window.sessionStorage.setItem('korum_chunk_reloaded', 'true');
          window.location.reload();
          return { default: () => null };
        }
      }
      throw error;
    }
  });
}

// Pages críticas de inicio (carga síncrona)
import Login from './pages/Login';
import DashboardPage from './pages/DashboardPage';
import CatedraDetailPage from './pages/CatedraDetailPage';
import OnboardingModal from './components/onboarding/OnboardingModal';

// Pages secundarias (Code-Splitting con lazyWithRetry)
const MesasExamenPage = lazyWithRetry(() => import('./pages/MesasExamenPage'));
const CalendarPage = lazyWithRetry(() => import('./pages/CalendarPage'));
const InstitutionsPage = lazyWithRetry(() => import('./pages/InstitutionsPage'));
const SettingsPage = lazyWithRetry(() => import('./pages/SettingsPage'));
const GuidesPage = lazyWithRetry(() => import('./pages/GuidesPage'));
const SupportPage = lazyWithRetry(() => import('./pages/SupportPage'));
const AdminPage = lazyWithRetry(() => import('./pages/AdminPage'));
const ConsultaAlumnoPage = lazyWithRetry(() => import('./pages/ConsultaAlumnoPage'));
import AdminRoute from './components/auth/AdminRoute';
import GlobalNoticeBanner from './components/layout/GlobalNoticeBanner';
import ScrollToTop from './components/common/ScrollToTop';
import { GraduationCap } from 'lucide-react';
import { NotificationProvider } from './context/NotificationContext';
import { TooltipProvider } from './components/common/Tooltip';

function AsistenciaRedirect() {
  const { catedras } = useApp();
  const firstId = catedras?.[0]?.id;
  return <Navigate to={firstId ? `/catedra/${firstId}?tab=asistencias` : '/dashboard'} replace />;
}

function CalificacionesRedirect() {
  const { catedras } = useApp();
  const firstId = catedras?.[0]?.id;
  return <Navigate to={firstId ? `/catedra/${firstId}?tab=calificaciones` : '/dashboard'} replace />;
}

function LibroTemasRedirect() {
  const { catedras } = useApp();
  const firstId = catedras?.[0]?.id;
  return <Navigate to={firstId ? `/catedra/${firstId}?tab=libro-temas` : '/guias'} replace />;
}

/**
 * Shell autenticado para el panel docente
 */
function AuthenticatedDocenteShell() {
  const { user, loading } = useAuth();
  const { openNewCatedraModal, setOpenNewCatedraModal, refreshCatedras } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Estado colapsado del riel de escritorio (persistido con try/catch)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('korum_sidebar_collapsed') === 'true';
    } catch (_) {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('korum_sidebar_collapsed', String(next));
      } catch (_) {}
      return next;
    });
  };

  // Atajo de teclado global Ctrl+B / Cmd+B para alternar colapso de sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        toggleSidebarCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="min-h-app flex items-center justify-center bg-[#0B0F19] relative overflow-hidden">
        <div className="absolute w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none animate-pulseGlow" />
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <img src="/dashboard-logo.png" alt="Korum" className="w-8 h-8 object-contain rounded-xl" />
            </div>
          </div>
          <div className="text-center">
            <span className="font-bold text-lg tracking-tight text-white block">
              Korum
            </span>
            <span className="text-xs font-mono text-slate-400">Iniciando plataforma académica...</span>
          </div>
        </div>
      </div>
    );
  }

  // Si no está autenticado, mostrar pantalla de Login Korum
  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex min-h-dvh w-full bg-canvas text-text-primary antialiased selection:bg-primary/20 selection:text-primary relative overflow-x-clip">
      {/* 1. Barra Lateral Anclada a Altura Completa (Colapsable y con Etiquetas) */}
      <AppSidebar 
        isMobileOpen={sidebarOpen} 
        onCloseMobile={() => setSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />

      {/* 2. Área de Trabajo Principal (Scroll a nivel de documento, sin capturas intermedias) */}
      <div className="flex flex-col flex-1 min-w-0 min-h-dvh">
        {/* Header pegado arriba con sticky top-0 */}
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Global Notice Banner & Maintenance Alert (Realtime Broadcast) */}
        <GlobalNoticeBanner />

        {/* Contenido principal con padding inferior seguro para la barra de navegación */}
        <main className="flex-1 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] lg:pb-10 w-full max-w-full">
          <div className="max-w-7xl 2xl:max-w-[96rem] mx-auto space-y-6 transition-all duration-300">
            {/* Global Context Bar: Institución y Ciclo Activo */}
            <HeaderSelector />

            <ErrorBoundary title="Error en el módulo docente">
              <Suspense fallback={<RouteLoadingSpinner mensaje="Cargando módulo académico..." />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/catedra/:id" element={<CatedraDetailPage />} />
                  <Route path="/mesas-examen" element={<MesasExamenPage />} />
                  <Route path="/mesas" element={<Navigate to="/mesas-examen" replace />} />
                  <Route path="/calendario" element={
                    <ErrorBoundary title="Error en el Calendario Académico">
                      <CalendarPage />
                    </ErrorBoundary>
                  } />
                  <Route path="/instituciones" element={<InstitutionsPage />} />
                  <Route path="/configuracion" element={<SettingsPage />} />
                  <Route path="/guias" element={<GuidesPage />} />
                  <Route path="/soporte" element={<SupportPage />} />
                  <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
                  <Route path="/asistencia" element={<AsistenciaRedirect />} />
                  <Route path="/calificaciones" element={<CalificacionesRedirect />} />
                  <Route path="/libro-temas" element={<LibroTemasRedirect />} />
                  <Route path="/perfil" element={<Navigate to="/configuracion" replace />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>

            {/* Institutional Footer & Dark Enterprise CTA Banner */}
            <Footer />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Hidden on md and up) */}
      <BottomNav />

      {/* Modal Global para Crear Nueva Cátedra */}
      <CreateCatedraModal 
        isOpen={openNewCatedraModal} 
        onClose={() => setOpenNewCatedraModal(false)} 
        onCreated={refreshCatedras} 
      />

      {/* Modal de Onboarding Asistido Korum */}
      <OnboardingModal />
    </div>
  );
}

export default function App() {
  const { theme } = useTheme();

  return (
    <NotificationProvider>
      <TooltipProvider>
        <BrowserRouter>
          {/* Scroll restoration helper: resets scroll to top on every navigation */}
          <ScrollToTop />

          {/* Sonner Floating Notifications */}
          <Toaster 
            richColors 
            closeButton 
            position="top-right" 
            theme={theme === 'system' ? undefined : theme} 
          />

          <ErrorBoundary title="Error en el portal académico">
            <Suspense fallback={<RouteLoadingSpinner mensaje="Iniciando portal..." />}>
              <Routes>
                {/* Ruta Pública del Estudiante: Accesible sin autenticación */}
                <Route path="/consulta/:catedraId" element={<ConsultaAlumnoPage />} />

                {/* Ruta Explícita de Autenticación / Login */}
                <Route path="/login" element={<Login />} />

                {/* Rutas del Sistema Docente */}
                <Route path="/*" element={<AuthenticatedDocenteShell />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </NotificationProvider>
  );
}
