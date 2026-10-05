import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Clock, Users, CheckSquare } from 'lucide-react';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';

export default function UpcomingClassCard({ upcomingClass }) {
  const navigate = useNavigate();

  return (
    <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 group">
      {/* Ambient Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/15 via-emerald-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10">
        {/* Top Bar inside Box 1 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">
              {upcomingClass?.isToday ? 'Clase de Hoy' : 'Próxima Clase'}
            </span>
          </div>
          <Badge variant={upcomingClass?.nivel === 'TERCIARIO' ? 'primary' : 'warning'}>
            {upcomingClass?.nivel || 'NIVEL'}
          </Badge>
        </div>

        {/* Subject Title */}
        <h3
          onClick={() => upcomingClass && navigate(`/catedra/${upcomingClass.catedraId}`)}
          className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight group-hover:text-primary transition-colors cursor-pointer leading-tight line-clamp-1 mt-3"
        >
          {upcomingClass ? upcomingClass.nombre : 'Sin cátedras activas'}
        </h3>

        <p className="text-xs text-text-muted mt-1.5 flex items-center gap-1.5 truncate font-medium">
          <Building className="w-3.5 h-3.5 shrink-0 text-primary/70" />
          <span className="truncate">{upcomingClass?.institucion || 'Registra tu primera materia'}</span>
        </p>

        {/* Schedule & Room Chips */}
        <div className="flex items-center gap-2 mt-4 flex-wrap text-xs font-mono">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/5 text-text-secondary font-semibold">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>{upcomingClass ? `${upcomingClass.dia} • ${upcomingClass.desde || upcomingClass.hora}` : '--:--'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/5 text-text-secondary font-semibold">
            <span>{upcomingClass?.aula || 'Aula regular'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/5 text-text-secondary font-semibold">
            <Users className="w-3.5 h-3.5 text-text-muted" />
            <span>{upcomingClass?.estudiantesCount || 0} alumnos</span>
          </span>
        </div>
      </div>

      {/* Footer Action */}
      <div className="relative z-10 pt-4 mt-5 border-t border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-text-muted truncate max-w-xs">
          <span className="text-text-secondary font-medium">Tema: </span>
          <span className="italic">{upcomingClass?.ultimaClase?.tema ? upcomingClass.ultimaClase.tema : 'Presentación y contenidos'}</span>
        </div>
        {upcomingClass && (
          <Button
            variant="primary"
            size="sm"
            icon={CheckSquare}
            onClick={() => navigate(`/catedra/${upcomingClass.catedraId}?tab=asistencias`)}
            className="text-xs font-bold shadow-xs whitespace-nowrap rounded-xl"
          >
            Iniciar Asistencia
          </Button>
        )}
      </div>
    </div>
  );
}
