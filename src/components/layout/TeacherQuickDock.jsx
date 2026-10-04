import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Zap, 
  X, 
  CalendarCheck2, 
  Award, 
  BookOpen, 
  Search,
  Users
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

/**
 * TeacherQuickDock - Acceso rápido ergonómico para el docente frente al aula.
 * Flota sobre la Bottom Navigation Bar en dispositivos móviles y tablets (<1024px).
 * Permite tomar asistencia, cargar notas, abrir libro de temas y buscar alumnos en <= 2 toques.
 */
export default function TeacherQuickDock() {
  const [isOpen, setIsOpen] = useState(false);
  const { catedras } = useApp();
  const location = useLocation();
  const useNavigateHook = useNavigate();

  const buttonRef = useRef(null);
  const firstItemRef = useRef(null);
  const menuRef = useRef(null);

  // Determinar la cátedra activa
  const match = location.pathname.match(/\/catedra\/([^/?#]+)/);
  const currentCatedraId = match ? match[1] : (catedras?.[0]?.id || null);

  // Manejo de foco accesible: enfocar primer ítem al abrir, devolver foco al botón al cerrar
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        firstItemRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Manejo de teclado: Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleNavigateToTab = (tabName) => {
    setIsOpen(false);
    if (currentCatedraId) {
      useNavigateHook(`/catedra/${currentCatedraId}?tab=${tabName}`);
    } else {
      useNavigateHook('/dashboard');
    }
  };

  const handleQuickSearch = () => {
    setIsOpen(false);
    if (currentCatedraId) {
      useNavigateHook(`/catedra/${currentCatedraId}?tab=alumnos`);
    } else {
      useNavigateHook('/dashboard');
      return;
    }

    // Scroll al top + foco en el campo de búsqueda de la nómina
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const searchInput = document.querySelector('input[placeholder*="Buscar"], input[aria-label*="Buscar"], input[type="text"]');
      if (searchInput) {
        searchInput.focus();
        searchInput.select?.();
      }
    }, 150);
  };

  return (
    <div className="lg:hidden">
      {/* Backdrop oscuro translúcido con blur */}
      {isOpen && (
        <div
          role="presentation"
          onClick={() => {
            setIsOpen(false);
            buttonRef.current?.focus();
          }}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 transition-opacity animate-fadeIn"
          aria-hidden="true"
        />
      )}

      {/* Menú Flotante Desplegable con resortes */}
      {isOpen && (
        <div
          ref={menuRef}
          id="teacher-quick-dock-menu"
          role="menu"
          aria-label="Acciones rápidas de aula"
          className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+8.5rem)] right-4 z-50 w-72 bg-surface/95 dark:bg-slate-900/95 backdrop-blur-md p-2 rounded-2xl border border-surface-border shadow-2xl animate-dock-pop flex flex-col gap-1.5 focus:outline-none"
        >
          <div className="px-3 py-2 border-b border-surface-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
              Atajos de Aula
            </span>
            <span className="text-xs font-bold text-text-primary block truncate">
              {catedras?.find(c => c.id === currentCatedraId)?.nombre || 'Cátedra Activa'}
            </span>
          </div>

          {/* 1. Tomar Asistencia */}
          <button
            ref={firstItemRef}
            type="button"
            role="menuitem"
            onClick={() => handleNavigateToTab('asistencias')}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover dark:hover:bg-slate-800 text-left transition-colors min-h-[48px] cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-text-primary block leading-tight">
                Tomar Asistencia
              </span>
              <span className="text-[11px] text-text-secondary block leading-tight mt-0.5">
                Registro de presentes de hoy
              </span>
            </div>
          </button>

          {/* 2. Cargar Nota */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleNavigateToTab('calificaciones')}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover dark:hover:bg-slate-800 text-left transition-colors min-h-[48px] cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-text-primary block leading-tight">
                Cargar Notas
              </span>
              <span className="text-[11px] text-text-secondary block leading-tight mt-0.5">
                Actas y exámenes parciales
              </span>
            </div>
          </button>

          {/* 3. Libro de Temas */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleNavigateToTab('libro-temas')}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover dark:hover:bg-slate-800 text-left transition-colors min-h-[48px] cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-text-primary block leading-tight">
                Libro de Temas
              </span>
              <span className="text-[11px] text-text-secondary block leading-tight mt-0.5">
                Contenidos y observaciones
              </span>
            </div>
          </button>

          {/* 4. Buscar Alumno */}
          <button
            type="button"
            role="menuitem"
            onClick={handleQuickSearch}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-hover dark:hover:bg-slate-800 text-left transition-colors min-h-[48px] cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Search className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-text-primary block leading-tight">
                Buscar Alumno
              </span>
              <span className="text-[11px] text-text-secondary block leading-tight mt-0.5">
                Enfocar buscador en nómina
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Botón Flotante Principal (FAB 48x48) sobre la BottomNav */}
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls="teacher-quick-dock-menu"
        aria-label={isOpen ? "Cerrar atajos de aula" : "Abrir atajos de aula"}
        onClick={() => setIsOpen(prev => !prev)}
        className="fixed bottom-dock right-4 z-50 w-12 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-xl shadow-emerald-950/25 border border-emerald-400/20 flex items-center justify-center transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
      >
        {isOpen ? (
          <X className="w-6 h-6 transition-transform duration-200 rotate-90" />
        ) : (
          <Zap className="w-5 h-5 text-emerald-100 animate-pulse" />
        )}
      </button>
    </div>
  );
}
