import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
  HelpCircle,
  Award,
  Lock,
  Globe,
  BookOpen,
  Search,
  ArrowRight,
  Layers
} from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';

export default function GuidesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionFromUrl = searchParams.get('section');

  const [activeSection, setActiveSection] = useState(() => {
    return sectionFromUrl || 'alumnos';
  });

  const [searchQuery, setSearchQuery] = useState('');

  // Sincronizar sección si cambia el parámetro de URL
  useEffect(() => {
    if (sectionFromUrl) {
      setActiveSection(sectionFromUrl);
    }
  }, [sectionFromUrl]);

  const handleSelectSection = (id) => {
    setActiveSection(id);
    setSearchParams({ section: id });
  };

  const guides = [
    {
      id: 'alumnos',
      title: '1. Carga e Importación de Alumnos',
      icon: Users,
      badge: 'Básico',
      actionLink: { label: 'Ir a Mis Cátedras', to: '/dashboard' },
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
        },
        {
          sub: 'Ficha Académica Histórica del Alumno',
          text: 'Al pulsar sobre cualquier estudiante, se abre su Ficha Académica completa: porcentaje de asistencia acumulado, detalle de notas en parciales y el historial cronológico de todas las mesas de examen en las que se haya presentado.'
        }
      ]
    },
    {
      id: 'asistencias',
      title: '2. Toma de Asistencias y Presentes Automáticos',
      icon: CheckSquare,
      badge: 'Rápido',
      actionLink: { label: 'Ir a Mis Cátedras', to: '/dashboard' },
      summary: 'Optimiza el tiempo en el aula con la marcación automática de presentes y control por clase.',
      content: [
        {
          sub: 'Formato Estándar de Fecha (DD-MM-YYYY)',
          text: 'Las sesiones de clase se registran y exhiben de manera estandarizada en formato DD-MM-YYYY (ej. 10-09-2026) tanto en el menú selector como en reportes y vistas móviles.'
        },
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
      actionLink: { label: 'Ir a Mis Cátedras', to: '/dashboard' },
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
      title: '4. Calificaciones, Entregas y Régimen RAM',
      icon: GraduationCap,
      badge: 'Académico',
      actionLink: { label: 'Ir a Mis Cátedras', to: '/dashboard' },
      summary: 'Sábana panorámica de notas, adjuntos de Trabajos Prácticos, fechas límite y cálculo reglamentario.',
      content: [
        {
          sub: 'Crear Evaluaciones, Fechas de Entrega y Subida de Archivos',
          text: 'Al pulsar "Nueva Eval." puedes registrar un Parcial, TP o Recuperatorio. En esa misma ventana puedes fijar una Fecha de Entrega y subir el documento de consignas (PDF, Word, Excel, etc.). La evaluación se guarda inmediatamente aunque aún no hayas calificado alumnos.'
        },
        {
          sub: 'Preservación de Estado Durante Plazo de Entrega',
          text: 'Si creas un Trabajo Práctico con entrega futura y sin notas cargadas, el sistema NO penaliza a los alumnos como "Libres"; se conserva su condición en curso mientras transcurre el plazo de entrega.'
        },
        {
          sub: 'Descarga Directa de Consignas y Repositorio',
          text: 'Los trabajos prácticos con archivos adjuntos exhiben un botón de descarga directa en la cabecera de la tabla y en las tarjetas, y se sincronizan en el Repositorio de Recursos de la cátedra.'
        },
        {
          sub: 'Recuperatorios sin Sobreescritura',
          text: 'Al vincular un examen recuperatorio al parcial original, la nota del recuperatorio se exhibe en paralelo junto a la nota original (R: 7) para preservar el historial académico auténtico.'
        },
        {
          sub: 'Condición Académica Automática y Exportación',
          text: 'El sistema calcula en tiempo real la condición (Promocional, Regular, Libre) y te permite exportar toda la sábana a Excel con fórmulas y colores institucionales.'
        }
      ]
    },
    {
      id: 'cierre-cursado',
      title: '5. Cierre de Cursado y Período Evaluativo',
      icon: Lock,
      badge: 'Ciclo Lectivo',
      actionLink: { label: 'Ir a Mis Cátedras', to: '/dashboard' },
      summary: 'Finalización formal del ciclo ordinario, protección de solo lectura y paso a instancias de acreditación.',
      content: [
        {
          sub: 'Finalizar el Cursado Regular',
          text: 'Al terminar las semanas lectivas ordinarias y calificados todos los parciales y recuperatorios, pulsa el botón "[ 🏁 Finalizar Cursado ]" ubicado en la cabecera Bento de la cátedra. Un modal te explicará el impacto formal de la acción antes de confirmar.'
        },
        {
          sub: 'Protección contra Modificaciones Accidentales (Solo Lectura)',
          text: 'Una vez finalizado el cursado, las secciones de Asistencias y Calificaciones entran en modo de solo lectura. Los botones de registrar nuevas clases o crear parciales quedan inhabilitados para resguardar la validez de los porcentajes y condiciones finales ya consolidadas.'
        },
        {
          sub: 'Transición a Mesas de Examen y Acreditación',
          text: 'En la parte superior de la cátedra se desplegará el banner institucional "[ 🔒 Cursada finalizada — Período de Exámenes y Acreditación ]", con un botón de acceso directo que te redirige inmediatamente al módulo de Mesas de Examen filtrando por esa cátedra.'
        },
        {
          sub: 'Reapertura Excepcional de Cursado',
          text: 'Si descubres un error de tipeo o debes asentar una justificación de fuerza mayor, puedes presionar el botón "[ 🔓 Reabrir Cursado ]" en la cabecera para reactivar temporalmente la edición de notas y asistencias.'
        }
      ]
    },
    {
      id: 'mesas-examen',
      title: '6. Mesas de Examen & Actas de Acreditación',
      icon: Award,
      badge: 'Exámenes / RAM',
      actionLink: { label: 'Ir a Mesas de Examen', to: '/mesas-examen' },
      summary: 'Módulo independiente para constituir tribunales, seleccionar cohortes por condición RAM, calificar y emitir actas volantes oficiales.',
      content: [
        {
          sub: 'Módulo Independiente y Acceso Global',
          text: 'Accede a la sección de primer nivel "Mesas de Examen" desde el icono de acta/trofeo en el Riel de Navegación lateral, o bien desde el botón del banner de cursada cerrada en cualquier cátedra. Este módulo centraliza todos los turnos ordinarios, extraordinarios y mesas promocionales de todas tus instituciones.'
        },
        {
          sub: 'Constitución de Mesa y Condición del Acta (Paso 1)',
          text: 'Al presionar "[ + Nueva Mesa de Examen ]", el asistente te solicitará seleccionar la Cátedra e Institución y definir la Condición Exclusiva del Acta: Promocional (para asentar promociones directas), Regular (para estudiantes regulares) o Libre (para exámenes libres con instancia escrita y oral). La reglamentación RAM exige actas independientes y homogéneas según la condición del alumno.'
        },
        {
          sub: 'Tribunal Evaluador y Registro Matriz (Paso 2)',
          text: 'Indica la fecha del examen, el turno/llamado (ej. "Turno Ordinario 1° Llamado", "2° Llamado", "Mesa Especial") y confirma al Presidente de Mesa (autocompletado con tu nombre de usuario). Despliega el acordeón opcional para registrar Libro N°, Tomo N°, Folio N°, Acta N° y los Vocales 1 y 2 que integran el tribunal.'
        },
        {
          sub: 'Filtros Bento, Píldoras y Búsqueda Predictiva',
          text: 'En el panel general de mesas puedes filtrar por una cátedra específica o ver todas; seleccionar las píldoras [ Todas ], [ 🎖️ Promocionales ], [ 📋 Regulares ] y [ 🔓 Libres ]; o escribir en el buscador rápido por nombre, turno o número de acta. Cada tarjeta resume en tiempo real cuántos alumnos están cargados, acreditados y desaprobados.'
        },
        {
          sub: 'Incorporación Inteligente de Alumnos a Evaluar',
          text: 'Al ingresar a la planilla de la mesa y pulsar "[ + Seleccionar Alumnos ]", el sistema consulta automáticamente a los estudiantes de la cátedra que cumplen con la condición del acta constituida:\n• Detecta la Cohorte de origen del alumno (ej. 2024, 2025).\n• Exhibe una alerta preventiva en caso de registrar "⚠️ X intentos desaprobados previos" en llamados anteriores.\n• Excluye de manera estricta a los estudiantes que ya hayan acreditado y aprobado la materia para evitar duplicaciones.'
        },
        {
          sub: 'Calificación Adaptativa: Actas Promocionales vs. Regulares/Libres',
          text: '• Actas Promocionales: El sistema precarga automáticamente la nota final de cursado de cada alumno y ofrece el botón masivo "[ 🎖️ Acreditar Todos ]" para asentar la acreditación directa en 1 solo clic.\n• Actas Regulares y Libres: Proporciona columnas numéricas independientes para examen Escrito y Oral, calculando en vivo la Nota Definitiva con redondeo reglamentario, el selector de Dictamen (ACREDITADO, DESAPROBADO, AUSENTE) y campo para observaciones.'
        },
        {
          sub: 'Guardado y Acreditación Definitiva del Estudiante',
          text: 'Al pulsar "[ Guardar Calificaciones ]", el sistema asienta las notas en las actas volantes y actualiza la matrícula del estudiante a "ACREDITADO" con su nota final y fecha de examen. El alumno queda formalmente aprobado y ya no figurará como pendiente en futuros llamados de la misma cátedra.'
        },
        {
          sub: 'Generación e Impresión del Acta Volante Oficial (A4)',
          text: 'El botón "[ 🖨️ Imprimir Acta ]" despliega el documento oficial normalizado en formato A4 listo para imprimir (Ctrl+P o window.print()). Incluye el membrete institucional, libro, tomo, folio, acta, nómina completa con notas en números y letras, y casilleros reglamentarios para firmas y sellos del Presidente y Vocales.'
        },
        {
          sub: 'Historial en la Ficha del Estudiante',
          text: 'Todas las presentaciones a mesas de examen quedan documentadas de manera indeleble en la Ficha Académica del Estudiante (accesible desde la nómina de alumnos), con detalle del tribunal, fecha, notas y dictamen final.'
        }
      ]
    },
    {
      id: 'portal-estudiante',
      title: '7. Portal Estudiante y Consulta Pública RAM',
      icon: Globe,
      badge: 'Transparencia',
      actionLink: { label: 'Ir a Mis Cátedras', to: '/dashboard' },
      summary: 'Publica las condiciones de cursada, notas y asistencias para tus alumnos mediante enlaces seguros o códigos QR.',
      content: [
        {
          sub: 'Acceso al Panel de Configuración del Portal',
          text: 'En la barra superior de cualquier cátedra, presiona el botón "[ 🌐 Portal Estudiante ]" para abrir el modal Bento de control y difusión pública.'
        },
        {
          sub: 'Control Granular de Visibilidad por el Docente',
          text: 'Tú decides qué datos se publican mediante interruptores independientes:\n• Switch Maestro: Habilita o suspende el portal de consulta instantáneamente.\n• Asistencia: Muestra el porcentaje global y el desglose de presentes y ausentes.\n• Calificaciones: Muestra las notas de evaluaciones parciales, recuperatorios y TPs.\n• Semáforo RAM: Exhibe la condición académica (Promoción, Regular, En Riesgo).'
        },
        {
          sub: 'Difusión Segura con Enlace y Código QR',
          text: 'El modal genera una URL pública protegida por token institucional y un Código QR descargable. Puedes proyectar el QR en clase o copiar el enlace para enviarlo al grupo de WhatsApp. Los estudiantes consultan indicando únicamente su DNI, sin contraseñas ni altas previas.'
        }
      ]
    },
    {
      id: 'libro-temas',
      title: '8. Libro de Temas y Programa de Unidades',
      icon: BookOpen,
      badge: 'Planificación',
      actionLink: { label: 'Ir a Mis Cátedras', to: '/dashboard' },
      summary: 'Asienta el avance curricular diario, vincula contenidos con las unidades y genera el Libro de Aula reglamentario.',
      content: [
        {
          sub: 'Programa Curricular por Unidades',
          text: 'En la pestaña "Programa / Unidades" puedes cargar las unidades temáticas, contenidos mínimos, bibliografía y recursos para hacer el seguimiento pedagógico del plan de estudio.'
        },
        {
          sub: 'Libro de Temas Digital',
          text: 'En la pestaña "Libro de Temas", cada clase registra la fecha, cantidad de horas cátedra, unidad dictada, resumen de contenidos teóricos/prácticos, actividades y observaciones.'
        },
        {
          sub: 'Impresión Institucional del Libro de Aula',
          text: 'Permite imprimir o exportar a PDF el Libro de Temas en formato estandarizado para presentación formal ante secretaría académica o supervisión pedagógica.'
        }
      ]
    },
    {
      id: 'calendario',
      title: '9. Calendario y Períodos Lectivos',
      icon: Calendar,
      badge: 'Organización',
      actionLink: { label: 'Ir al Calendario', to: '/calendario' },
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
      title: '10. Personalización de Temas y Colores',
      icon: Palette,
      badge: 'Visual',
      actionLink: { label: 'Ir a Configuración', to: '/configuracion' },
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

  // Filtro de búsqueda en tiempo real
  const filteredGuides = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return guides;
    return guides.filter(g => {
      const matchTitle = g.title.toLowerCase().includes(q);
      const matchSummary = g.summary.toLowerCase().includes(q);
      const matchBadge = g.badge.toLowerCase().includes(q);
      const matchContent = g.content.some(c => 
        c.sub.toLowerCase().includes(q) || c.text.toLowerCase().includes(q)
      );
      return matchTitle || matchSummary || matchBadge || matchContent;
    });
  }, [guides, searchQuery]);

  const currentGuide = guides.find(g => g.id === activeSection) || filteredGuides[0] || guides[0];

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            Manual práctico y normativo paso a paso para aprovechar al máximo todas las funciones administrativas de tus cátedras y mesas examinadoras.
          </p>
        </div>

        {/* Acceso rápido a Mesas de Examen */}
        <Link
          to="/mesas-examen"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary text-white text-xs font-bold shadow-sm shadow-primary/30 hover:opacity-95 transition-all self-start sm:self-auto shrink-0 cursor-pointer"
        >
          <Award className="w-4 h-4" />
          <span>Ir a Mesas de Examen</span>
        </Link>
      </div>

      {/* Main layout: Sidebar with topics + Content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Buscador y Lista de Temas */}
        <div className="space-y-3">
          {/* Buscador de temas */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en las guías (actas, notas, licencias...)"
              className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border border-surface-border bg-surface text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>

          {/* Lista de Guías */}
          <div className="space-y-1.5 max-h-[calc(100vh-14rem)] overflow-y-auto pr-0.5 scrollbar-thin">
            {filteredGuides.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-muted rounded-2xl border border-dashed border-surface-border">
                No se encontraron guías que coincidan con "{searchQuery}".
              </div>
            ) : (
              filteredGuides.map((g) => {
                const Icon = g.icon;
                const isActive = activeSection === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleSelectSection(g.id)}
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
              })
            )}
          </div>
        </div>

        {/* Columna Derecha: Vista Detallada del Tema */}
        <div className="lg:col-span-2">
          {currentGuide && (
            <Card className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-surface-border">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-xs">
                    <currentGuide.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-text-primary">
                        {currentGuide.title}
                      </h2>
                      <Badge variant="primary">{currentGuide.badge}</Badge>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      {currentGuide.summary}
                    </p>
                  </div>
                </div>

                {currentGuide.actionLink && (
                  <Link
                    to={currentGuide.actionLink.to}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-border bg-surface-hover hover:bg-primary/10 text-text-primary hover:text-primary text-xs font-bold transition-all shrink-0 self-start cursor-pointer"
                  >
                    <span>{currentGuide.actionLink.label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              {/* Contenido / Pasos del Tema */}
              <div className="space-y-4">
                {currentGuide.content.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-surface-hover/50 border border-surface-border space-y-2">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{item.sub}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-text-secondary leading-relaxed pl-6 whitespace-pre-line">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Tip o Recomendación */}
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15 text-xs text-text-secondary flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>
                  <strong>Tip reglamentario:</strong> Puedes acceder a estas guías o compartirlas en cualquier momento desde el menú de navegación lateral.
                </span>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}