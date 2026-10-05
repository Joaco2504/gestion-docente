import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar as CalendarIcon, ShieldAlert, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardActionCards({ onOpenNewCatedra, upcomingClass, firstCatedraId }) {
  const navigate = useNavigate();

  const handleLicenciasClick = () => {
    if (upcomingClass) {
      navigate(`/catedra/${upcomingClass.catedraId}?tab=asistencias`);
    } else if (firstCatedraId) {
      navigate(`/catedra/${firstCatedraId}?tab=asistencias`);
    } else {
      toast.info('Crea una cátedra primero para gestionar inasistencias docentes.');
    }
  };

  const handleRecursosClick = () => {
    if (upcomingClass) {
      navigate(`/catedra/${upcomingClass.catedraId}?tab=recursos`);
    } else if (firstCatedraId) {
      navigate(`/catedra/${firstCatedraId}?tab=recursos`);
    } else {
      toast.info('Crea una cátedra primero para subir archivos.');
    }
  };

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <button
        type="button"
        onClick={onOpenNewCatedra}
        className="p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xs transition-all flex items-center gap-2.5 sm:gap-3 text-left group cursor-pointer"
      >
        <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform shrink-0">
          <Plus className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="text-xs font-semibold text-text-primary block truncate">+ Nueva Cátedra</span>
          <span className="hidden sm:block text-[10px] text-text-muted truncate">Crear asignatura</span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => navigate('/calendario')}
        className="p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xs transition-all flex items-center gap-2.5 sm:gap-3 text-left group cursor-pointer"
      >
        <div className="p-2 sm:p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform shrink-0">
          <CalendarIcon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="text-xs font-semibold text-text-primary block truncate">Calendario y Mesas</span>
          <span className="hidden sm:block text-[10px] text-text-muted truncate">Cronograma</span>
        </div>
      </button>

      <button
        type="button"
        onClick={handleLicenciasClick}
        className="p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xs transition-all flex items-center gap-2.5 sm:gap-3 text-left group cursor-pointer"
      >
        <div className="p-2 sm:p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform shrink-0">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="text-xs font-semibold text-text-primary block truncate">Licencia Docente</span>
          <span className="hidden sm:block text-[10px] text-text-muted truncate">Artículos y partes</span>
        </div>
      </button>

      <button
        type="button"
        onClick={handleRecursosClick}
        className="p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xs transition-all flex items-center gap-2.5 sm:gap-3 text-left group cursor-pointer"
      >
        <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
          <ExternalLink className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="text-xs font-semibold text-text-primary block truncate">Recursos y Drive</span>
          <span className="hidden sm:block text-[10px] text-text-muted truncate">Repositorio de cátedra</span>
        </div>
      </button>
    </section>
  );
}
