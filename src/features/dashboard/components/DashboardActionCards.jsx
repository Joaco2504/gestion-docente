import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar as CalendarIcon, ShieldAlert, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import Card from '../../../components/common/Card';

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

  const actions = [
    {
      id: 'nueva-catedra',
      label: '+ Nueva Cátedra',
      sublabel: 'Crear asignatura',
      icon: Plus,
      iconColor: 'bg-primary/10 text-primary dark:bg-primary/20',
      onClick: onOpenNewCatedra,
      ariaLabel: 'Crear nueva cátedra'
    },
    {
      id: 'calendario',
      label: 'Calendario y Mesas',
      sublabel: 'Cronograma',
      icon: CalendarIcon,
      iconColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
      onClick: () => navigate('/calendario'),
      ariaLabel: 'Abrir calendario y cronograma de mesas'
    },
    {
      id: 'licencias',
      label: 'Licencia Docente',
      sublabel: 'Artículos y partes',
      icon: ShieldAlert,
      iconColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      onClick: handleLicenciasClick,
      ariaLabel: 'Gestionar licencia docente y artículos de inasistencia'
    },
    {
      id: 'recursos',
      label: 'Recursos y Drive',
      sublabel: 'Repositorio docente',
      icon: ExternalLink,
      iconColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      onClick: handleRecursosClick,
      ariaLabel: 'Abrir repositorio de recursos y archivos de cátedra'
    }
  ];

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3" aria-label="Acciones rápidas del panel">
      {actions.map((act) => {
        const Icon = act.icon;
        return (
          <Card
            key={act.id}
            as="button"
            type="button"
            variant="interactive"
            padding="sm"
            onClick={act.onClick}
            className="flex items-center gap-2.5 sm:gap-3 text-left group min-h-[52px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 select-none"
            aria-label={act.ariaLabel}
          >
            <div className={`p-2 sm:p-2.5 rounded-xl ${act.iconColor} group-hover:scale-105 transition-transform duration-150 shrink-0`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs sm:text-sm font-semibold text-text-primary block truncate">
                {act.label}
              </span>
              <span className="hidden sm:block text-[11px] text-text-muted truncate">
                {act.sublabel}
              </span>
            </div>
          </Card>
        );
      })}
    </section>
  );
}
