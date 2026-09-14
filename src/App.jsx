import React, { useState } from 'react';
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

// Pages
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import CatedraDetailPage from './pages/CatedraDetailPage';
import CalendarPage from './pages/CalendarPage';
import InstitutionsPage from './pages/InstitutionsPage';
import SettingsPage from './pages/SettingsPage';
import GuidesPage from './pages/GuidesPage';
import SupportPage from './pages/SupportPage';
import AdminPage from './pages/AdminPage';
import StudentPortalPage from './pages/StudentPortalPage';
import AdminRoute from './components/auth/AdminRoute';
import GlobalNoticeBanner from './components/layout/GlobalNoticeBanner';
import ScrollToTop from './components/common/ScrollToTop';
import { GraduationCap } from 'lucide-react';

/**
 * Shell autenticado para el panel docente
 */
function AuthenticatedDocenteShell() {
  const { user, loading } = useAuth();
  const { openNewCatedraModal, setOpenNewCatedraModal, refreshCatedras } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas relative overflow-hidden">
        <div className="absolute w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none animate-pulseGlow" />
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl border-2 border-primary/20 border-t-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-primary">
              <GraduationCap className="w-7 h-7" />
            </div>
          </div>
          <div className="text-center">
            <span className="font-bold text-base tracking-tight text-text-primary block">
              Planilla<span className="text-primary">Docente</span>
            </span>
            <span className="text-xs font-mono text-text-muted">Iniciando plataforma...</span>
          </div>
        </div>
      </div>
    );
  }

  // Si no está autenticado, mostrar pantalla de Auth (Login / Registro)
  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-text-primary antialiased selection:bg-primary/20 selection:text-primary overflow-x-hidden">
      {/* Top Navbar */}
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      {/* Global Notice Banner & Maintenance Alert (Realtime Broadcast) */}
      <GlobalNoticeBanner />

      {/* Main Shell */}
      <div className="flex-1 flex overflow-hidden">
        {/* Dual-Sidebar Navigation (Icon Rail 64px + Secondary Expandable Tree 224px) */}
        <DualSidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />

        {/* Content Area with extra bottom padding on mobile for BottomNav */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8 w-full max-w-full overflow-x-hidden">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Global Context Bar: Institución y Ciclo Activo */}
            <HeaderSelector />

            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/catedra/:id" element={<CatedraDetailPage />} />
              <Route path="/calendario" element={<CalendarPage />} />
              <Route path="/instituciones" element={<InstitutionsPage />} />
              <Route path="/configuracion" element={<SettingsPage />} />
              <Route path="/guias" element={<GuidesPage />} />
              <Route path="/soporte" element={<SupportPage />} />
              <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>

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
    </div>
  );
}

export default function App() {
  const { theme } = useTheme();

  return (
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

      <Routes>
        {/* Ruta Pública del Estudiante: Accesible sin autenticación */}
        <Route path="/consulta/:catedraId" element={<StudentPortalPage />} />

        {/* Rutas del Sistema Docente */}
        <Route path="/*" element={<AuthenticatedDocenteShell />} />
      </Routes>
    </BrowserRouter>
  );
}
