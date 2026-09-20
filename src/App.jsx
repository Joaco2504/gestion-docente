import React, { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from './context/AuthContext';
import { useApp } from './context/AppContext';
import { useTheme } from './context/ThemeContext';
import Navbar from './components/layout/Navbar';
import DualSidebar from './components/layout/DualSidebar';
import BottomNav from './components/layout/BottomNav';
import HeaderSelector from './components/layout/HeaderSelector';
import Footer from './components/layout/Footer';
import CreateCatedraModal from './components/common/CreateCatedraModal';
import RouteLoadingSpinner from './components/common/RouteLoadingSpinner';

// Pages críticas de inicio (carga síncrona)
import Login from './pages/Login';
import DashboardPage from './pages/DashboardPage';
import CatedraDetailPage from './pages/CatedraDetailPage';
import OnboardingModal from './components/onboarding/OnboardingModal';

// Pages secundarias (Code-Splitting con React.lazy)
const MesasExamenPage = lazy(() => import('./pages/MesasExamenPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const InstitutionsPage = lazy(() => import('./pages/InstitutionsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const GuidesPage = lazy(() => import('./pages/GuidesPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ConsultaAlumnoPage = lazy(() => import('./pages/ConsultaAlumnoPage'));
import AdminRoute from './components/auth/AdminRoute';
import GlobalNoticeBanner from './components/layout/GlobalNoticeBanner';
import ScrollToTop from './components/common/ScrollToTop';
import { GraduationCap } from 'lucide-react';
import { NotificationProvider } from './context/NotificationContext';

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] relative overflow-hidden">
        <div className="absolute w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none animate-pulseGlow" />
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <img src="/dashboard.ico" alt="Korum" className="w-8 h-8 object-contain rounded-xl" />
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
    <div className="flex h-screen w-full overflow-hidden bg-canvas dark:bg-[#080C14] text-text-primary antialiased selection:bg-primary/20 selection:text-primary">
      {/* 1. Barra Lateral Anclada a Altura Completa */}
      <DualSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* 2. Área de Trabajo Principal (Header pegado arriba + Scroll interno) */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        {/* Header adosado de forma continua al Sidebar, sin huecos */}
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Global Notice Banner & Maintenance Alert (Realtime Broadcast) */}
        <GlobalNoticeBanner />

        {/* Contenido con scroll independiente */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8 w-full max-w-full scrollbar-thin">
          <div className="max-w-7xl 2xl:max-w-[96rem] mx-auto space-y-6 transition-all duration-300">
            {/* Global Context Bar: Institución y Ciclo Activo */}
            <HeaderSelector />

            <Suspense fallback={<RouteLoadingSpinner mensaje="Cargando módulo académico..." />}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/catedra/:id" element={<CatedraDetailPage />} />
                <Route path="/mesas-examen" element={<MesasExamenPage />} />
                <Route path="/calendario" element={<CalendarPage />} />
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
      </BrowserRouter>
    </NotificationProvider>
  );
}
