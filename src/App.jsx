import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from './context/AuthContext';
import { useApp } from './context/AppContext';
import { useTheme } from './context/ThemeContext';
import AppLayout from './components/layout/AppLayout';
import RouteLoadingSpinner from './components/common/RouteLoadingSpinner';

import ErrorBoundary from './components/common/ErrorBoundary';
import { Analytics } from '@vercel/analytics/react';

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
import { NotificationProvider } from './context/NotificationContext';
import { TooltipProvider } from './components/common/Tooltip';

function resolveTargetCatedraId(catedras) {
  const lastId = typeof window !== 'undefined' ? localStorage.getItem('last_active_catedra_id') : null;
  if (lastId && (catedras || []).some(c => String(c.id) === String(lastId))) {
    return lastId;
  }
  return catedras?.[0]?.id || null;
}

function AsistenciaRedirect() {
  const { catedras } = useApp();
  const targetId = resolveTargetCatedraId(catedras);
  return <Navigate to={targetId ? `/catedra/${targetId}?tab=asistencias` : '/dashboard'} replace />;
}

function CalificacionesRedirect() {
  const { catedras } = useApp();
  const targetId = resolveTargetCatedraId(catedras);
  return <Navigate to={targetId ? `/catedra/${targetId}?tab=calificaciones` : '/dashboard'} replace />;
}

function LibroTemasRedirect() {
  const { catedras } = useApp();
  const targetId = resolveTargetCatedraId(catedras);
  return <Navigate to={targetId ? `/catedra/${targetId}?tab=libro-temas` : '/guias'} replace />;
}

/**
 * Shell autenticado para el panel docente
 */
function AuthenticatedDocenteShell() {
  const { user, loading } = useAuth();

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
    <AppLayout>
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
    </AppLayout>
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
          <Analytics />
        </BrowserRouter>
      </TooltipProvider>
    </NotificationProvider>
  );
}
