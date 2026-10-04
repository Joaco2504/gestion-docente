import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  Calendar, 
  CheckSquare, 
  GraduationCap, 
  FileSpreadsheet
} from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();

  // Extraer ID de cátedra activa actual o fallback desde localStorage
  const catedraMatch = location.pathname.match(/^\/catedra\/([^/]+)/);
  const currentCatedraId = catedraMatch ? catedraMatch[1] : null;
  const lastCatedraId = typeof window !== 'undefined' ? localStorage.getItem('last_active_catedra_id') : null;
  const targetCatedraId = currentCatedraId || lastCatedraId;

  // Inspeccionar pestaña activa dentro de cátedra
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'asistencias';

  const isAsistenciaActive = location.pathname.startsWith('/catedra') && activeTab === 'asistencias';
  const isNotasActive = location.pathname.startsWith('/catedra') && activeTab === 'calificaciones';
  const isLibroTemasActive = (location.pathname.startsWith('/catedra') && activeTab === 'libro-temas') || location.pathname.startsWith('/guias');
  const isCatedrasActive = location.pathname === '/dashboard' || location.pathname === '/' || (location.pathname.startsWith('/catedra') && !isAsistenciaActive && !isNotasActive && !isLibroTemasActive);
  const isHorariosActive = location.pathname.startsWith('/calendario');

  const navItems = [
    {
      to: '/dashboard',
      label: 'Cátedras',
      icon: BookOpen,
      isActive: isCatedrasActive,
      ariaLabel: 'Ir al panel de cátedras'
    },
    {
      to: targetCatedraId ? `/catedra/${targetCatedraId}?tab=asistencias` : '/dashboard',
      label: 'Asistencia',
      icon: CheckSquare,
      isActive: isAsistenciaActive,
      ariaLabel: 'Ir a toma de asistencias'
    },
    {
      to: targetCatedraId ? `/catedra/${targetCatedraId}?tab=calificaciones` : '/dashboard',
      label: 'Notas',
      icon: GraduationCap,
      isActive: isNotasActive,
      ariaLabel: 'Ir a registro de calificaciones'
    },
    {
      to: targetCatedraId ? `/catedra/${targetCatedraId}?tab=libro-temas` : '/guias',
      label: 'Programa',
      icon: FileSpreadsheet,
      isActive: isLibroTemasActive,
      ariaLabel: 'Ir al libro de temas y programa'
    },
    {
      to: '/calendario',
      label: 'Horarios',
      icon: Calendar,
      isActive: isHorariosActive,
      ariaLabel: 'Ver calendario y horarios semanales'
    },
  ];

  return (
    <nav 
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)]"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
      aria-label="Navegación principal inferior"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.label}
              to={item.to}
              aria-label={item.ariaLabel}
              className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] py-1 text-[11px] font-semibold transition-all select-none rounded-xl active:scale-95 touch-target-48 ${
                item.isActive
                  ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all duration-200 ${
                item.isActive 
                  ? 'bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 scale-105' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}>
                <Icon className="w-5 h-5 shrink-0" />
              </div>
              <span className="bottomnav-label mt-0.5 tracking-tight font-medium text-[11px] truncate max-w-[64px]">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

