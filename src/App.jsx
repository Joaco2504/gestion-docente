import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';
import HeaderSelector from './components/layout/HeaderSelector';

// Pages
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import CatedraDetailPage from './pages/CatedraDetailPage';
import CalendarPage from './pages/CalendarPage';
import InstitutionsPage from './pages/InstitutionsPage';
import SettingsPage from './pages/SettingsPage';
import { GraduationCap } from 'lucide-react';

export default function App() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas relative overflow-hidden">
        {/* Subtle background light glow */}
        <div className="absolute w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none animate-pulseGlow" />
        
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="relative">
            {/* Spinning decorative ring */}
            <div className="w-16 h-16 rounded-2xl border-2 border-primary/20 border-t-primary animate-spin" />
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center text-primary">
              <GraduationCap className="w-7 h-7" />
            </div>
          </div>
          <div className="text-center">
            <span className="font-bold text-base tracking-tight text-text-primary block">
              Docente<span className="text-primary">Pro</span>
            </span>
            <span className="text-xs font-mono text-text-muted">Iniciando plataforma...</span>
          </div>
        </div>
      </div>
    );
  }

  // If unauthenticated, display the Auth Screen
  if (!user) {
    return (
      <>
        <Toaster 
          richColors 
          closeButton 
          position="top-center" 
          theme={theme === 'system' ? undefined : theme} 
        />
        <AuthPage />
      </>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-canvas text-text-primary antialiased selection:bg-primary/20 selection:text-primary">
        {/* Sonner Floating Notifications */}
        <Toaster 
          richColors 
          closeButton 
          position="top-right" 
          theme={theme === 'system' ? undefined : theme} 
        />

        {/* Top Navbar */}
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Main Shell */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Navigation (Responsive: Mobile Drawer, Tablet Rail, Desktop Expanded) */}
          <Sidebar 
            isOpen={sidebarOpen} 
            onClose={() => setSidebarOpen(false)} 
          />

          {/* Content Area with extra bottom padding on mobile for BottomNav */}
          <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
            {/* Institution and Academic Year Global Context Bar */}
            <HeaderSelector />

            <div className="mt-6">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/catedra/:id" element={<CatedraDetailPage />} />
                <Route path="/calendario" element={<CalendarPage />} />
                <Route path="/instituciones" element={<InstitutionsPage />} />
                <Route path="/configuracion" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </main>
        </div>

        {/* Mobile Bottom Navigation Bar (Hidden on md and up) */}
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
