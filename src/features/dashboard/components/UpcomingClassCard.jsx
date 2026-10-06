import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Clock, Users, CheckSquare } from 'lucide-react';
import Card from '../../../components/common/Card';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';

export default function UpcomingClassCard({ upcomingClass }) {
  const navigate = useNavigate();

  return (
    <Card variant="bento" padding="md" className="relative overflow-hidden flex flex-col justify-between group">
      {/* Ambient Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 via-emerald-500/[0.03] to-transparent rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-3">
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
          <Badge variant={upcomingClass?.nivel === 'TERCIARIO' ? 'primary' : 'warning'} size="sm">
            {upcomingClass?.nivel || 'NIVEL'}
          </Badge>
        </div>

        {/* Subject Title */}
        <h3
          onClick={() => upcomingClass && navigate(`/catedra/${upcomingClass.catedraId}`)}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && upcomingClass) {
              navigate(`/catedra/${upcomingClass.catedraId}`);
            }
          }}
          tabIndex={upcomingClass ? 0 : -1}
          role={upcomingClass ? 'link' : undefined}
          aria-label={upcomingClass ? `Ir a cátedra ${upcomingClass.nombre}` : undefined}
          className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight group-hover:text-primary transition-colors cursor-pointer leading-tight line-clamp-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
        >
          {upcomingClass ? upcomingClass.nombre : 'Sin cátedras activas'}
        </h3>

        <p className="text-xs text-text-muted flex items-center gap-1.5 truncate font-medium">
          <Building className="w-3.5 h-3.5 shrink-0 text-primary/80" />
          <span className="truncate">{upcomingClass?.institucion || 'Registra tu primera materia'}</span>
        </p>

        {/* Schedule & Room Chips */}
        <div className="flex items-center gap-2 pt-1 flex-wrap text-xs font-mono">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-hover/80 border border-surface-border text-text-primary font-semibold">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>{upcomingClass ? `${upcomingClass.dia} • ${upcomingClass.desde || upcomingClass.hora}` : '--:--'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-hover/80 border border-surface-border text-text-primary font-semibold">
            <span>{upcomingClass?.aula || 'Aula regular'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-hover/80 border border-surface-border text-text-muted font-semibold">
            <Users className="w-3.5 h-3.5" />
            <span>{upcomingClass?.estudiantesCount || 0} alumnos</span>
          </span>
        </div>
      </div>

      {/* Footer Action */}
      <div className="relative z-10 pt-4 mt-5 border-t border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
            aria-label={`Iniciar asistencia para ${upcomingClass.nombre}`}
          >
            Iniciar Asistencia
          </Button>
        )}
      </div>
    </Card>
  );
}
