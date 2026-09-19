import React, { useState } from 'react';
import { 
  BookOpen, 
  X, 
  GraduationCap, 
  Award, 
  Globe, 
  FileSpreadsheet, 
  Command, 
  Search, 
  CheckCircle2, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  Layers,
  Save,
  Printer,
  Edit3
} from 'lucide-react';
import Modal from '../common/Modal';
import Badge from '../common/Badge';

export const KORUM_GUIDES_DATA = [
  {
    id: 'catedras-ram',
    title: '1. Cátedras y Criterios RAM (Reglamento Académico)',
    badge: 'Estructura & RAM',
    icon: Layers,
    summary: 'Configuración inicial de espacios curriculares, edición flexible de cátedra y umbrales reglamentarios.',
    steps: [
      {
        titulo: 'Creación y Niveles Académicos',
        descripcion: 'Crea cátedras adaptadas al nivel educativo (Secundario, Terciario o Superior) y modalidad (cuatrimestral o anual). El sistema parametriza automáticamente el calendario de cursada y las actas volantes correspondientes.'
      },
      {
        titulo: 'NUEVA FUNCIÓN: Botón [ ✏️ Editar Cátedra ]',
        descripcion: 'Ubicado en la cabecera Bento de la cátedra, te permite actualizar en cualquier momento la institución asignada, ciclo lectivo, días de cursado, horarios y aulas sin perder datos ni asistencias previas.'
      },
      {
        titulo: 'Umbrales Automáticos RAM',
        descripcion: 'Configuración de porcentajes reglamentarios estándar: 70% de asistencia mínima para alcanzar la regularidad y 80% para acceder a la promoción directa de la materia.'
      }
    ]
  },
  {
    id: 'calificaciones-sabana',
    title: '2. Calificaciones Inteligentes y Sábana de Notas',
    badge: 'Evaluación Dinámica',
    icon: GraduationCap,
    summary: 'Planilla panorámica interactiva, cómputo algorítmico de condición final y guardado rápido.',
    steps: [
      {
        titulo: 'Evaluaciones, Parciales y Recuperatorios',
        descripcion: 'Registra Trabajos Prácticos, Evaluaciones Parciales y Recuperatorios asociados sin sobreescritura, preservando el historial evaluativo del estudiante en paralelo.'
      },
      {
        titulo: 'Determinación Algorítmica en Tiempo Real',
        descripcion: 'El motor calcula instantáneamente el estado académico de cada alumno: Promocionado, Regular, Libre o Recuperatorio pendiente según notas y asistencia acumulada.'
      },
      {
        titulo: 'Encabezados Compactos y Primera Columna Fija',
        descripcion: 'Grilla de alta densidad con columna de estudiantes sticky para fácil desplazamiento horizontal y fechas de entrega visibles en cada encabezado.'
      },
      {
        titulo: 'NUEVA FUNCIÓN: QuickSave FAB y Atajo [ Ctrl + S ]',
        descripcion: 'Botón flotante esmeralda y escucha global de teclado (Ctrl + S / Cmd + S) con microinteracción física y auto-blur para guardar de inmediato las calificaciones editadas.'
      }
    ]
  },
  {
    id: 'mesas-examen',
    title: '3. Mesas de Examen y Acreditación Definitiva',
    badge: 'Acreditación Oficial',
    icon: Award,
    summary: 'Módulo independiente para tribunales examinadores, actas volantes y cierre formal de materias.',
    steps: [
      {
        titulo: 'NUEVA FUNCIÓN: Módulo Centralizado en /mesas-examen',
        descripcion: 'Sección de primer nivel accesible directamente desde el riel lateral izquierdo para gestionar todos los turnos ordinarios, extraordinarios y mesas de acreditación.'
      },
      {
        titulo: 'Constitución de Mesa y Homogeneidad RAM',
        descripcion: 'Configuración de llamado, presidente y vocales, y tipología estricta de acta: Promocional, Regular o Libre conforme a la normativa RAM.'
      },
      {
        titulo: 'Selector Inteligente de Alumnos Elegibles',
        descripcion: 'El asistente rescata automáticamente estudiantes históricos que adeuden la materia, alertando si registran llamados reprobados previos y excluyendo a los ya acreditados.'
      },
      {
        titulo: 'Asentamiento Definitivo y Persistencia Atómica',
        descripcion: 'Cálculo de nota oral/escrita y promedio reglamentario. Al confirmar, la acreditación se guarda de forma atómica en Supabase sin depender de almacenamiento local volátil.'
      }
    ]
  },
  {
    id: 'portal-estudiantes',
    title: '4. Portal Estudiantil por DNI',
    badge: 'Autoconsulta Transparente',
    icon: Globe,
    summary: 'Consulta pública para que los estudiantes verifiquen notas y condición en tiempo real.',
    steps: [
      {
        titulo: 'NUEVA FUNCIÓN: Tarjeta Bento Unificada en /consulta/:catedraId',
        descripcion: 'Interfaz moderna y adaptada a celulares con verificación SSL/RLS, squircle central y visualización clara de notas y condición reglamentaria.'
      },
      {
        titulo: 'Activación Simple y Enlace Institucional',
        descripcion: 'Habilita el switch maestro del portal desde los ajustes de la cátedra para generar el enlace web o código QR oficial para compartir con la comisión.'
      },
      {
        titulo: 'Acceso Universal con Solo Ingresar DNI',
        descripcion: 'Los estudiantes consultan su situación con solo tipear su DNI formateado (ej. 42.123.456), sin necesidad de crear contraseñas ni registrar usuarios externos.'
      }
    ]
  },
  {
    id: 'reportes-excel',
    title: '5. Reportes, Impresión y Exportación a Excel',
    badge: 'Documentación Oficial',
    icon: FileSpreadsheet,
    summary: 'Emisión de constancias, actas volantes y planillas de cálculo reglamentarias.',
    steps: [
      {
        titulo: 'Descarga Directa en Formato .xlsx',
        descripcion: 'Exportación a Excel nativo de planillas de calificaciones, asistencias cronológicas y libros de temas con formato profesional y fórmulas integradas.'
      },
      {
        titulo: 'NUEVA FUNCIÓN: Modal Interactivo de Impresión/PDF',
        descripcion: 'Configurador previo en calificaciones que permite seleccionar qué columnas de evaluaciones incluir, agregar casilleros de firmas y generar constancias listas para imprimir en A4.'
      },
      {
        titulo: 'Actas Volantes Reglamentarias',
        descripcion: 'Impresión de actas con numeración de libro, tomo y folio, nómina en números y letras, y casilleros de firma para todo el tribunal examinador.'
      }
    ]
  },
  {
    id: 'consola-comandos',
    title: '6. Consola Operativa y Búsqueda Rápida',
    badge: 'Productividad Docente',
    icon: Command,
    summary: 'Herramientas de alta velocidad para navegación y control sin fricciones.',
    steps: [
      {
        titulo: 'Conmutador Directo de Cátedra Activa',
        descripcion: 'Dropdown superior permanente en la barra de navegación que exhibe cátedra y régimen actual, permitiendo cambiar de materia al instante con un solo clic.'
      },
      {
        titulo: 'NUEVA FUNCIÓN: Command Palette [ ⌘K / Ctrl + K ]',
        descripcion: 'Buscador central flotante que permite escribir el apellido o DNI de cualquier estudiante, cátedra o mesa de examen para saltar inmediatamente a su registro.'
      },
      {
        titulo: 'Telemetría y Estado RAM en Vivo',
        descripcion: 'Indicador permanente del motor RAM en el header para asegurar la consistencia y conectividad del entorno de trabajo.'
      }
    ]
  }
];

export default function GuiasPasoAPasoModal({ isOpen, onClose, initialGuideId = 'catedras-ram' }) {
  const [selectedGuideId, setSelectedGuideId] = useState(initialGuideId);
  const [searchFilter, setSearchFilter] = useState('');

  const activeGuide = KORUM_GUIDES_DATA.find(g => g.id === selectedGuideId) || KORUM_GUIDES_DATA[0];

  const filteredGuides = KORUM_GUIDES_DATA.filter(g => 
    !searchFilter ||
    g.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
    g.summary.toLowerCase().includes(searchFilter.toLowerCase()) ||
    g.steps.some(s => s.titulo.toLowerCase().includes(searchFilter.toLowerCase()) || s.descripcion.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Guías Paso a Paso de Korum"
      subtitle="Manual operativo con todas las funciones modernas del sistema de gestión docente"
      size="xl"
    >
      <div className="space-y-6">
        {/* Buscador Rápido */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Buscar tema o función (ej. RAM, Mesas, QuickSave, DNI, Excel...)"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition-all font-sans"
          />
        </div>

        {/* Layout de 2 columnas: Lista de 6 guías y Detalle */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Columna Izquierda: 6 Guías */}
          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
            {filteredGuides.map((guide) => {
              const Icon = guide.icon;
              const isSelected = guide.id === activeGuide.id;

              return (
                <button
                  key={guide.id}
                  type="button"
                  onClick={() => setSelectedGuideId(guide.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">
                        {guide.title}
                      </p>
                      <span className="text-[10px] font-mono text-slate-400 block truncate">
                        {guide.badge}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-emerald-500 translate-x-0.5' : 'text-slate-400'}`} />
                </button>
              );
            })}
          </div>

          {/* Columna Derecha: Detalle de la Guía Activa */}
          <div className="md:col-span-2 bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 max-h-[380px] overflow-y-auto scrollbar-thin space-y-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  {activeGuide.badge}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1">
                  {activeGuide.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {activeGuide.summary}
                </p>
              </div>
            </div>

            {/* Pasos / Bloques de Contenido */}
            <div className="space-y-3">
              {activeGuide.steps.map((step, idx) => (
                <div 
                  key={idx} 
                  className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{step.titulo}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-6">
                    {step.descripcion}
                  </p>
                </div>
              ))}
            </div>

            {/* Tip Institucional */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5 font-mono">
              <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                Korum aplica fórmulas oficiales y persistencia atómica en Supabase protegida por RLS.
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            Cerrar Guías
          </button>
        </div>
      </div>
    </Modal>
  );
}
