import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutGrid, 
  Calendar, 
  BookOpen, 
  CheckSquare, 
  MoreHorizontal 
} from 'lucide-react';
import MobileNavSheet from './MobileNavSheet';

export default function BottomNav() {
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Extraer ID de cátedra activa actual o fallback desde localStorage
  const catedraMatch = location.pathname.match(/^\/catedra\/([^/]+)/);
  const currentCatedraId = catedraMatch ? catedraMatch[1] : null;
  const lastCatedraId = typeof window !== 'undefined' ? localStorage.getItem('last_active_catedra_id') : null;
  const targetCatedraId = currentCatedraId || lastCatedraId;

  // Inspeccionar estado activo
  const isDashboardActive = location.pathname === '/dashboard' || location.pathname === '/';
  const isCalendarActive = location.pathname.startsWith('/calendario');
  const isAsistenciaActive = location.pathname.startsWith('/catedra') && location.search.includes('tab=asistencias');
  const isCatedraActive = location.pathname.startsWith('/catedra') && !isAsistenciaActive;

  const navItems = [
    {
      to: '/dashboard',
      label: 'Inicio',
      icon: LayoutGrid,
      isActive: isDashboardActive,
      ariaLabel: 'Ir al Inicio'
    },
    {
      to: '/calendario',
      label: 'Calendario',
      icon: Calendar,
      isActive: isCalendarActive,
      ariaLabel: 'Ver Calendario y Horarios'
    },
    {
      to: targetCatedraId ? `/catedra/${targetCatedraId}` : '/dashboard',
      label: 'Cátedras',
      icon: BookOpen,
      isActive: isCatedraActive,
      ariaLabel: 'Ver Cátedras'
    },
    {
      to: targetCatedraId ? `/catedra/${targetCatedraId}?tab=asistencias` : '/asistencia',
      label: 'Asistencia',
      icon: CheckSquare,
      isActive: isAsistenciaActive,
      ariaLabel: 'Tomar Asistencia'
    }
  ];

  return (
    <>
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-border/70 shadow-lg"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
        aria-label="Navegación móvil inferior"
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
                    ? 'text-primary font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all duration-150 ${
                  item.isActive 
                    ? 'bg-primary/15 text-primary scale-105 shadow-2xs' 
                    : 'hover:bg-surface-hover'
                }`}>
                  <Icon className="w-5 h-5 shrink-0" />
                </div>
                <span className="mt-0.5 tracking-tight font-medium text-[11px] truncate max-w-[64px]">
                  {item.label}
                </span>
              </NavLink>
            );
          })}

          {/* Botón 'Más' para desplegar MobileNavSheet */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            aria-label="Más opciones"
            className="flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 text-[11px] font-semibold text-text-muted hover:text-text-primary transition-all select-none rounded-xl active:scale-95 cursor-pointer"
          >
            <div className="p-1.5 rounded-xl hover:bg-surface-hover transition-all duration-150">
              <MoreHorizontal className="w-5 h-5 shrink-0" />
            </div>
            <span className="mt-0.5 tracking-tight font-medium text-[11px] truncate max-w-[64px]">
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
