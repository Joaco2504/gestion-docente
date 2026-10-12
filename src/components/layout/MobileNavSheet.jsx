import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  BookOpen,
  FolderOpen,
  Users,
  Layers,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

export default function MobileNavSheet({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { esSuperadmin } = useAuth();
  const { catedras, setOpenNewCatedraModal } = useApp();

  // Obtener cátedra activa
  const catedraMatch = location.pathname.match(/^\/catedra\/([^/]+)/);
  const currentCatedraId = catedraMatch ? catedraMatch[1] : null;
  const lastCatedraId = typeof window !== 'undefined' ? localStorage.getItem('last_active_catedra_id') : null;
  const targetCatedraId = currentCatedraId || lastCatedraId || (catedras?.[0]?.id ? String(catedras[0].id) : null);

  const handleNavigate = (path) => {
    onClose();
    navigate(path);
  };

  const sections = [
    {
      title: 'Herramientas de Cátedra',
      items: [
        {
          label: 'Libro de Temas',
          desc: 'Registro pedagógico y firmas de clase',
          icon: BookOpen,
          onClick: () => handleNavigate(targetCatedraId ? `/catedra/${targetCatedraId}?tab=libro-temas` : '/dashboard')
        },
        {
          label: 'Alumnos y Matrícula',
          desc: 'Nómina, régimen laboral y equivalencias',
          icon: Users,
          onClick: () => handleNavigate(targetCatedraId ? `/catedra/${targetCatedraId}?tab=alumnos` : '/dashboard')
        },
        {
          label: 'Recursos y Drive',
          desc: 'Archivos, bibliografía y enlaces cloud',
          icon: FolderOpen,
          onClick: () => handleNavigate(targetCatedraId ? `/catedra/${targetCatedraId}?tab=recursos` : '/dashboard')
        },
        {
          label: 'Planificación de Unidades',
          desc: 'Avance del programa curricular',
          icon: Layers,
          onClick: () => handleNavigate(targetCatedraId ? `/catedra/${targetCatedraId}?tab=unidades` : '/dashboard')
        }
      ]
    },
    {
      title: 'Gestión Académica e Institucional',
      items: [
        {
          label: 'Mesas de Examen',
          desc: 'Tribunales evaluadores y actas oficiales',
          icon: GraduationCap,
          onClick: () => handleNavigate('/mesas-examen')
        },
        {
          label: 'Calendario Académico',
          desc: 'Horarios, feriados y cronograma',
          icon: Calendar,
          onClick: () => handleNavigate('/calendario')
        },
        {
          label: 'Instituciones & Sedes',
          desc: 'Organizaciones y carreras',
          icon: Building2,
          onClick: () => handleNavigate('/instituciones')
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
      title: 'Sistema y Ajustes',
      items: [
        {
          label: 'Ajustes y Perfil Docente',
          desc: 'Preferencias, contraseña y datos',
          icon: Settings,
          onClick: () => handleNavigate('/configuracion')
        },
        {
          label: 'Guías de Uso y Ayuda',
          desc: 'Manuales y normativa académica',
          icon: BookMarked,
          onClick: () => handleNavigate('/guias')
        },
        {
          label: 'Soporte Técnico',
          desc: 'Asistencia y consultas en línea',
          icon: LifeBuoy,
          onClick: () => handleNavigate('/soporte')
        },
        ...(esSuperadmin ? [
          {
            label: 'Centro de SuperAdmin',
            desc: 'Nómina de docentes y métricas globales',
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
        <Dialog.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl shadow-2xl p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] max-h-[85vh] overflow-y-auto focus:outline-hidden animate-in slide-in-from-bottom duration-200">
          
          {/* Píldora de arrastre superior */}
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4" />

          {/* Cabecera */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800 mb-3 px-1">
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                Korum • Más Opciones
              </h3>
              <p className="text-[11px] text-text-muted">Herramientas pedagógicas y configuración</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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
                        className="w-full min-h-[48px] flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.99] transition-all text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-700">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-text-primary group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {item.label}
                            </p>
                            <p className="text-[11px] text-text-muted">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-emerald-500 shrink-0" />
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
