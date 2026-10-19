import React from 'react';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import GlobalNoticeBanner from './GlobalNoticeBanner';
import HeaderSelector from './HeaderSelector';
import Footer from './Footer';
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

  return (
    <div className="min-h-screen min-h-dvh w-full bg-canvas text-text-primary antialiased selection:bg-primary/20 selection:text-primary flex flex-col relative overscroll-y-auto">
      {/* 1. Header Superior Unificado Flotante (Glassmorphism TopNav) */}
      <Navbar />

      {/* Global Notice Banner & Maintenance Alert en tiempo real */}
      <GlobalNoticeBanner />

      {/* 2. Área de Trabajo Principal - Centrado simétrico y márgenes limpios */}
      <div className="flex-1 flex flex-col w-full min-w-0">
        <main className="flex-1 w-full max-w-7xl 2xl:max-w-[96rem] mx-auto px-3 sm:px-5 lg:px-8 py-4 sm:py-6 pb-28 lg:pb-12 min-w-0">
          <div className="space-y-6 transition-all duration-300">
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
      <div className="lg:hidden">
        <BottomNav />
      </div>

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
