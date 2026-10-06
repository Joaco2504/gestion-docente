import React from 'react';
import { useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { 
  X, 
  GraduationCap, 
  Building2, 
  BookMarked, 
  Settings, 
  LifeBuoy, 
  ShieldCheck, 
  Plus, 
  ChevronRight,
  LayoutGrid,
  Calendar,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

export default function MobileNavSheet({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { esSuperadmin } = useAuth();
  const { setOpenNewCatedraModal } = useApp();

  const handleNavigate = (path) => {
    onClose();
    navigate(path);
  };

  const sections = [
    {
      title: 'Académico',
      items: [
        {
          label: 'Mesas de Examen',
          desc: 'Tribunales evaluadores y actas',
          icon: GraduationCap,
          onClick: () => handleNavigate('/mesas-examen')
        },
        {
          label: 'Crear Nueva Cátedra',
          desc: 'Añadir espacio curricular',
          icon: Plus,
          onClick: () => {
            onClose();
            setOpenNewCatedraModal(true);
          }
        }
      ]
    },
    {
      title: 'Gestión Institucional',
      items: [
        {
          label: 'Instituciones & Sedes',
          desc: 'Organizaciones educativas',
          icon: Building2,
          onClick: () => handleNavigate('/instituciones')
        },
        {
          label: 'Guías de Uso y Ayuda',
          desc: 'Documentación y manuales',
          icon: BookMarked,
          onClick: () => handleNavigate('/guias')
        }
      ]
    },
    {
      title: 'Sistema',
      items: [
        {
          label: 'Configuración y Perfil',
          desc: 'Preferencias del docente',
          icon: Settings,
          onClick: () => handleNavigate('/configuracion')
        },
        {
          label: 'Soporte Técnico',
          desc: 'Asistencia y consultas',
          icon: LifeBuoy,
          onClick: () => handleNavigate('/soporte')
        },
        ...(esSuperadmin ? [
          {
            label: 'Panel de Administración',
            desc: 'Gestión global de la plataforma',
            icon: ShieldCheck,
            onClick: () => handleNavigate('/admin')
          }
        ] : [])
      ]
    }
  ];

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0 duration-150" />
        <Dialog.Content className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border/80 rounded-t-3xl shadow-2xl p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] max-h-[85vh] overflow-y-auto focus:outline-hidden animate-in slide-in-from-bottom duration-200">
          
          {/* Píldora de arrastre superior */}
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4" />

          {/* Cabecera */}
          <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-3 px-1">
            <h3 className="text-sm font-bold text-text-primary">
              Más Opciones y Destinos
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover cursor-pointer"
              aria-label="Cerrar panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Grupos de opciones con targets mínimos de 44px */}
          <div className="space-y-4">
            {sections.map((sec, sIdx) => (
              <div key={sIdx} className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted px-2 block">
                  {sec.title}
                </span>
                <div className="space-y-1">
                  {sec.items.map((item, iIdx) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={iIdx}
                        type="button"
                        onClick={item.onClick}
                        className="w-full min-h-[44px] flex items-center justify-between p-2.5 rounded-2xl hover:bg-surface-hover active:bg-surface-hover/80 transition-colors text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-primary flex items-center justify-center shrink-0 border border-border/40">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors">
                              {item.label}
                            </p>
                            <p className="text-[11px] text-text-muted">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
