import React, { useState } from 'react';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import GlobalNoticeBanner from './GlobalNoticeBanner';
import HeaderSelector from './HeaderSelector';
import Footer from './Footer';
import AppSidebar from './AppSidebar';
import CreateCatedraModal from '../common/CreateCatedraModal';
import OnboardingModal from '../onboarding/OnboardingModal';
import { useApp } from '../../context/AppContext';

/**
 * AppLayout - Layout unificado Korum 2.0 (Modern LMS Architecture)
 * - Desktop (>= 1024px): Top Navigation flotante glassmorphism con 100% ancho de canvas.
 * - Mobile (< 1024px): Barra inferior ergonómica fija de 5 accesos directos (BottomNav).
 * - Scroll vertical fluido a nivel de documento sin contenedores que bloqueen el viewport.
 */
export default function AppLayout({ children }) {
  const { openNewCatedraModal, setOpenNewCatedraModal, refreshCatedras } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen min-h-dvh w-full bg-canvas text-text-primary antialiased selection:bg-primary/20 selection:text-primary flex flex-col relative overscroll-y-auto">
      {/* 1. Header Superior Unificado Flotante (Glassmorphism TopNav) */}
      <Navbar onToggleSidebar={() => setMobileSidebarOpen(prev => !prev)} />

      {/* Drawer lateral para móvil si se activa por menú */}
      <AppSidebar 
        isMobileOpen={mobileSidebarOpen} 
        onCloseMobile={() => setMobileSidebarOpen(false)}
        isCollapsed={true}
        onToggleCollapse={() => {}}
      />

      {/* Global Notice Banner & Maintenance Alert en tiempo real */}
      <GlobalNoticeBanner />

      {/* 2. Área de Trabajo Principal - Ancho completo y scroll fluido */}
      <div className="flex-1 flex flex-col w-full min-w-0">
        <main className="flex-1 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] lg:pb-12 w-full max-w-full">
          <div className="max-w-7xl 2xl:max-w-[96rem] mx-auto space-y-6 transition-all duration-300">
            {/* Selector de Institución y Ciclo Activo */}
            <HeaderSelector />

            {/* Contenido renderizado de la ruta */}
            {children}

            {/* Footer Institucional Korum */}
            <Footer />
          </div>
        </main>
      </div>

      {/* 3. Barra Móvil Inferior Fija de 5 Accesos Directos (< 1024px) */}
      <BottomNav />

      {/* Modales Globales */}
      <CreateCatedraModal 
        isOpen={openNewCatedraModal} 
        onClose={() => setOpenNewCatedraModal(false)} 
        onCreated={refreshCatedras} 
      />
      <OnboardingModal />
    </div>
  );
}
