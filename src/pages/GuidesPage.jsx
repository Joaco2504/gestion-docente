import React, { useState } from 'react';
import { 
  BookMarked, 
  Users, 
  CheckSquare, 
  GraduationCap, 
  Calendar, 
  FileSpreadsheet, 
  ShieldAlert, 
  Palette, 
  ChevronRight, 
  ExternalLink,
  Sparkles,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';

export default function GuidesPage() {
  const [activeSection, setActiveSection] = useState('alumnos');

  const guides = [
    {
      id: 'alumnos',
      title: '1. Carga e Importación de Alumnos',
      icon: Users,
      badge: 'Básico',
      summary: 'Aprende a incorporar tu nómina de estudiantes de forma individual o mediante importación masiva desde Excel.',
      content: [
        {
          sub: 'Importación desde Planilla Excel (.xlsx o .csv)',
          text: 'Dirígete a la cátedra y selecciona la pestaña "Alumnos" > "Importar Excel / CSV". Puedes arrastrar tu archivo con las columnas DNI, Apellido y Nombre. El sistema detecta automáticamente los encabezados y filtra los duplicados de forma inteligente.'
        },
        {
          sub: 'Carga Manual Rápida',
          text: 'Si necesitas incorporar a un alumno que se inscribió fuera de término, haz clic en "Nuevo Alumno (Manual)", escribe su DNI, Apellido y Nombre, y quedará inscripto al instante en la cátedra.'
        },
        {
          sub: 'Edición de Parámetros del Estudiante',
          text: 'Junto a cada alumno en la nómina verás un botón con icono de lápiz para editar su DNI, Apellido o Nombre si existió algún error de tipeo en la planilla original.'
        }
      ]
    },
    {
      id: 'asistencias',
      title: '2. Toma de Asistencias y Presentes Automáticos',
      icon: CheckSquare,
      badge: 'Rápido',
      summary: 'Optimiza el tiempo en el aula con la marcación automática de presentes y control por clase.',
      content: [
        {
          sub: 'Presentes Automáticos al Crear Sesión',
          text: 'Cada vez que agregas una nueva clase indicando la fecha y el tema dictado, PlanillaDocente marca de manera automática a todos los alumnos matriculados como PRESENTE. Solo tendrás que tocar a los estudiantes que estuvieron ausentes.'
        },
        {
          sub: 'Alternar Estados con un Toque',
          text: 'En la lista de la clase puedes presionar el botón "Presente" o "Ausente" para cambiar el estado en tiempo real. Todos los cambios se guardan instantáneamente en la base de datos.'
        },
        {
          sub: 'Marcado Masivo "Todos Presentes"',
          text: 'Si realizaste cambios y deseas volver a marcar a toda la cátedra como presente de una sola vez, pulsa el botón "Todos Presentes" en la barra superior.'
        }
      ]
    },
    {
      id: 'inasistencias',
      title: '3. Inasistencias Docentes y Licencias',
      icon: ShieldAlert,
      badge: 'Reglamentario',
      summary: 'Registro de justificaciones docentes con garantía de no perjudicar el porcentaje de los alumnos.',
      content: [
        {
          sub: 'Regla Académica Clave (Cero Penalización)',
          text: 'Cuando el profesor no asiste a clase por licencia o razón de fuerza mayor, esa fecha queda descontada del divisor total de clases dictadas. Los estudiantes nunca ven disminuido su porcentaje de asistencia por inasistencias del profesor.'
        },
        {
          sub: 'Cómo Registrar una Licencia Docente',
          text: 'En la pestaña Asistencias, pulsa el botón "Inasistencia Docente". Selecciona si se trata de Licencia Reglamentaria (Art. 44 salud, Art. 50 examen, etc.) o Razones Particulares. Puedes añadir observaciones como reemplazos o certificados médicos.'
        },
        {
          sub: 'Visualización Distintiva',
          text: 'La clase afectada mostrará una insignia ámbar destacada [LICENCIA DOCENTE] tanto en el selector de clases como en la agenda del calendario.'
        }
      ]
    },
    {
      id: 'calificaciones',
      title: '4. Calificaciones y Recuperatorios',
      icon: GraduationCap,
      badge: 'Académico',
      summary: 'Sábana panorámica de notas, cálculo reglamentario de regularidad y recuperatorios en paralelo.',
      content: [
        {
          sub: 'Crear Evaluaciones (Parciales, TPs, Pruebas)',
          text: 'Haz clic en "Nueva Eval." en la pestaña Calificaciones para registrar una instancia evaluativa. Puedes especificar si es un Parcial, Trabajo Práctico Obligatorio o Recuperatorio.'
        },
        {
          sub: 'Recuperatorios sin Sobreescritura',
          text: 'Al vincular un examen recuperatorio al parcial original, la nota del recuperatorio se exhibe en paralelo junto a la nota original (R: 7) para preservar el historial académico auténtico.'
        },
        {
          sub: 'Condición Académica Automática',
          text: 'El sistema calcula en tiempo real si el estudiante queda en condición Promocional, Regular o Libre evaluando el porcentaje de asistencia efectiva y las notas mínimas requeridas.'
        },
        {
          sub: 'Exportación a Excel',
          text: 'Con un solo clic puedes descargar la sábana completa en formato Excel profesional con colores reglamentarios, lista para entregar en secretaría académica.'
        }
      ]
    },
    {
      id: 'calendario',
      title: '5. Calendario y Períodos Lectivos',
      icon: Calendar,
      badge: 'Organización',
      summary: 'Visualiza tus horarios semanales, proyecta clases y exporta tu agenda a Google Calendar.',
      content: [
        {
          sub: 'Límites de Cuatrimestres y Receso Invernal',
          text: 'En la sección "Configuración" puedes definir con precisión las fechas de inicio y cierre de cada cuatrimestre y las semanas de receso invernal. Las clases solo se programan dentro de los límites activos.'
        },
        {
          sub: 'Sincronización con Google Calendar (.ics)',
          text: 'En la sección "Calendario", pulsa "Exportar iCal (.ics)" para descargar tu archivo de agenda y sincronizar todas tus cátedras y horarios con Google Calendar, Apple Calendar o Microsoft Outlook.'
        }
      ]
    },
    {
      id: 'personalizacion',
      title: '6. Personalización de Temas y Colores',
      icon: Palette,
      badge: 'Visual',
      summary: 'Acomoda el entorno a tus preferencias visuales entre gamas de color y modos oscuro/claro.',
      content: [
        {
          sub: 'Paleta Azul Francia Predeterminada',
          text: 'PlanillaDocente incluye como gama insignia el Azul Francia (#1a56db), diseñado específicamente para un contraste limpio, elegante y profesional.'
        },
        {
          sub: 'Selector de Gammas en Configuración',
          text: 'Ingresa a "Configuración" desde el menú de navegación para alternar entre Azul Francia, Índigo Real, Verde Esmeralda, Púrpura Académico o Pizarra Grafito. Tu elección se guarda de inmediato.'
        }
      ]
    }
  ];

  const currentGuide = guides.find(g => g.id === activeSection) || guides[0];

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <BookMarked className="w-4 h-4" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Guías de Uso de PlanillaDocente
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-text-muted">
          Manual práctico paso a paso para aprovechar al máximo todas las funciones administrativas de tus cátedras.
        </p>
      </div>

      {/* Main layout: Sidebar with topics + Content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Topics navigation list */}
        <div className="space-y-2">
          {guides.map((g) => {
            const Icon = g.icon;
            const isActive = activeSection === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveSection(g.id)}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  isActive
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5 text-primary shadow-xs'
                    : 'border-surface-border bg-surface hover:bg-surface-hover text-text-secondary'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-primary text-white shadow-xs' : 'bg-surface-hover text-text-muted'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold block truncate text-text-primary">
                      {g.title}
                    </span>
                    <span className="text-[11px] text-text-muted truncate block">
                      {g.badge}
                    </span>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'translate-x-0.5 text-primary' : 'text-text-muted'}`} />
              </button>
            );
          })}
        </div>

        {/* Detailed Topic View */}
        <div className="lg:col-span-2">
          <Card className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-surface-border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <currentGuide.icon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary">
                    {currentGuide.title}
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    {currentGuide.summary}
                  </p>
                </div>
              </div>
              <Badge variant="primary">{currentGuide.badge}</Badge>
            </div>

            {/* Articles / Steps */}
            <div className="space-y-5">
              {currentGuide.content.map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-surface-hover/50 border border-surface-border space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{item.sub}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed pl-6">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Tip callout */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 text-xs text-text-secondary flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>Recomendación docente:</strong> Puedes consultar o repasar estas guías en cualquier momento desde el menú de navegación lateral.
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}