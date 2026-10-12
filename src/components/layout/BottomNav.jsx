import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutGrid, 
  BookOpen, 
  CheckSquare, 
  Award, 
  SlidersHorizontal 
} from 'lucide-react';
import MobileNavSheet from './MobileNavSheet';
import { useApp } from '../../context/AppContext';

/**
 * BottomNav - Barra móvil inferior fija de 5 accesos directos ergonómicos (< 1024px)
 * 1. 📊 Inicio (/dashboard)
 * 2. 📚 Cátedras (cátedra activa)
 * 3. 📅 Asistencia (cátedra activa ?tab=asistencias)
 * 4. 📝 Calificaciones (cátedra activa ?tab=calificaciones)
 * 5. ⚙️ Más (despliega MobileNavSheet)
 */
export default function BottomNav() {
  const location = useLocation();
  const { catedras } = useApp();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Extraer ID de cátedra activa
  const catedraMatch = location.pathname.match(/^\/catedra\/([^/]+)/);
  const currentCatedraId = catedraMatch ? catedraMatch[1] : null;
  const lastCatedraId = typeof window !== 'undefined' ? localStorage.getItem('last_active_catedra_id') : null;
  const targetCatedraId = currentCatedraId || lastCatedraId || (catedras?.[0]?.id ? String(catedras[0].id) : null);

  // Estados activos
  const isDashboardActive = location.pathname === '/dashboard' || location.pathname === '/';
  const isAsistenciaActive = location.pathname.startsWith('/catedra') && location.search.includes('tab=asistencias');
  const isCalificacionesActive = location.pathname.startsWith('/catedra') && location.search.includes('tab=calificaciones');
  const isCatedraActive = location.pathname.startsWith('/catedra') && !isAsistenciaActive && !isCalificacionesActive;

  const navItems = [
    {
      to: '/dashboard',
      label: 'Inicio',
      icon: LayoutGrid,
      isActive: isDashboardActive,
      ariaLabel: 'Ir al Dashboard de Inicio'
    },
    {
      to: targetCatedraId ? `/catedra/${targetCatedraId}` : '/dashboard',
      label: 'Cátedras',
      icon: BookOpen,
      isActive: isCatedraActive,
      ariaLabel: 'Ver Espacio Curricular'
    },
    {
      to: targetCatedraId ? `/catedra/${targetCatedraId}?tab=asistencias` : '/asistencia',
      label: 'Asistencia',
      icon: CheckSquare,
      isActive: isAsistenciaActive,
      ariaLabel: 'Tomar Asistencia Rápida'
    },
    {
      to: targetCatedraId ? `/catedra/${targetCatedraId}?tab=calificaciones` : '/calificaciones',
      label: 'Calificaciones',
      icon: Award,
      isActive: isCalificacionesActive,
      ariaLabel: 'Sábana de Calificaciones'
    }
  ];

  return (
    <>
      <nav 
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 shadow-xl"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
        aria-label="Navegación móvil inferior Korum"
      >
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.to}
                aria-label={item.ariaLabel}
                className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 text-[11px] font-semibold transition-all select-none rounded-xl active:scale-95 cursor-pointer ${
                  item.isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-black'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all duration-150 ${
                  item.isActive 
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 scale-105 shadow-2xs' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}>
                  <Icon className="w-5 h-5 shrink-0" />
                </div>
                <span className="mt-0.5 tracking-tight font-medium text-[10px] sm:text-[11px] truncate max-w-[62px]">
                  {item.label}
                </span>
              </NavLink>
            );
          })}

          {/* 5. Botón 'Más' para desplegar menú secundario */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            aria-label="Más herramientas y ajustes"
            className="flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 text-[11px] font-semibold text-text-muted hover:text-text-primary transition-all select-none rounded-xl active:scale-95 cursor-pointer"
          >
            <div className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150">
              <SlidersHorizontal className="w-5 h-5 shrink-0" />
            </div>
            <span className="mt-0.5 tracking-tight font-medium text-[10px] sm:text-[11px] truncate max-w-[62px]">
              Más
            </span>
          </button>
        </div>
      </nav>

      {/* Bottom Sheet para destinos secundarios */}
      <MobileNavSheet
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
      />
    </>
  );
}
