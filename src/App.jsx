import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import HeaderSelector from './components/layout/HeaderSelector';

// Pages
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import CatedraDetailPage from './pages/CatedraDetailPage';
import CalendarPage from './pages/CalendarPage';
import InstitutionsPage from './pages/InstitutionsPage';

export default function App() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <span className="text-xs font-mono text-text-muted">Cargando DocentePro...</span>
        </div>
      </div>
    );
  }

  // If unauthenticated, display the Auth Screen
  if (!user) {
    return <AuthPage />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-canvas text-text-primary antialiased selection:bg-primary/20 selection:text-primary">
        {/* Top Navbar */}
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Main Shell */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Navigation */}
          <Sidebar 
            isOpen={sidebarOpen} 
            onClose={() => setSidebarOpen(false)} 
          />

          {/* Content Area */}
          <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
            {/* Institution and Academic Year Global Context Bar */}
            <HeaderSelector />

            <div className="mt-6">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/catedra/:id" element={<CatedraDetailPage />} />
                <Route path="/calendario" element={<CalendarPage />} />
                <Route path="/instituciones" element={<InstitutionsPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
