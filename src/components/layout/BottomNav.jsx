import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  Calendar, 
  CheckSquare, 
  GraduationCap, 
  Clock 
} from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();

  // Extract current catedra ID or fallback to last active from localStorage
  const catedraMatch = location.pathname.match(/^\/catedra\/([^/]+)/);
  const currentCatedraId = catedraMatch ? catedraMatch[1] : null;
  const lastCatedraId = typeof window !== 'undefined' ? localStorage.getItem('last_active_catedra_id') : null;
  const targetCatedraId = currentCatedraId || lastCatedraId;

  // Check query params for active tab inside catedra detail page
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'asistencias';
  const calendarView = searchParams.get('view');

  const isAsistenciaActive = location.pathname.startsWith('/catedra') && activeTab === 'asistencias';
  const isNotasActive = location.pathname.startsWith('/catedra') && activeTab === 'calificaciones';
  const isCatedrasActive = location.pathname === '/dashboard' || location.pathname === '/' || (location.pathname.startsWith('/catedra') && !isAsistenciaActive && !isNotasActive);
  const isClasesActive = location.pathname.startsWith('/calendario') && calendarView === 'dia';
  const isHorariosActive = location.pathname.startsWith('/calendario') && !isClasesActive;

  const navItems = [
    {
      to: '/dashboard',
      label: 'Cátedras',
      icon: BookOpen,
      isActive: isCatedrasActive
    },
    {
      to: targetCatedraId ? `/catedra/${targetCatedraId}?tab=asistencias` : '/dashboard',
      label: 'Asistencia',
      icon: CheckSquare,
      isActive: isAsistenciaActive
    },
    {
      to: targetCatedraId ? `/catedra/${targetCatedraId}?tab=calificaciones` : '/dashboard',
      label: 'Notas',
      icon: GraduationCap,
      isActive: isNotasActive
    },
    {
      to: '/calendario',
      label: 'Horarios',
      icon: Calendar,
      isActive: isHorariosActive
    },
    {
      to: '/calendario?view=dia',
      label: 'Clases',
      icon: Clock,
      isActive: isClasesActive
    },
  ];

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0c1222]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.5)] safe-area-bottom"
      aria-label="Navegación móvil inferior"
    >
      <div className="flex items-center justify-around h-16 px-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.label}
              to={item.to}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10.5px] font-semibold transition-all select-none touch-target-44 ${
                item.isActive
                  ? 'text-primary font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${
                item.isActive ? 'bg-primary/10 dark:bg-primary/20 scale-110' : ''
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="mt-0.5 tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
