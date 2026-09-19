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
    return sectionFromUrl || 'catedras-ram';
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
      id: 'catedras-ram',
      title: '1. Cátedras y Criterios RAM (Reglamento Académico)',
      icon: Layers,
      badge: 'Estructura & RAM',
      actionLink: { label: 'Ir a Mis Cátedras', to: '/dashboard' },
      summary: 'Configuración de espacios curriculares, edición flexible de cátedra y umbrales reglamentarios.',
      content: [
        {
          sub: 'Creación por Nivel y Régimen Académico',
          text: 'Cómo crear cátedras adaptadas al nivel (Terciario, Secundario o Superior) y modalidad de cursada (cuatrimestral o anual). El sistema parametriza el calendario y las actas volantes correspondientes.'
        },
        {
          sub: 'NUEVA FUNCIÓN: Botón [ ✏️ Editar Cátedra ]',
          text: 'Botón [ ✏️ Editar Cátedra ] en la cabecera para corregir institución asignada, ciclo lectivo, horarios y aulas en cualquier momento sin perder datos ni asistencias.'
        },
        {
          sub: 'Umbrales Automáticos RAM',
          text: 'Configuración de umbrales automáticos RAM: 70% de asistencia para regularidad y 80% para promoción directa.'
        }
      ]
    },
    {
      id: 'calificaciones-sabana',
      title: '2. Calificaciones Inteligentes y Sábana de Notas',
      icon: GraduationCap,
      badge: 'Evaluación Dinámica',
      actionLink: { label: 'Ir a Mis Cátedras', to: '/dashboard' },
      summary: 'Planilla panorámica interactiva, cómputo algorítmico de condición final y guardado rápido.',
      content: [
        {
          sub: 'Registro de Evaluaciones y Recuperatorios',
          text: 'Registro de Trabajos Prácticos, Parciales y Recuperatorios asociados sin sobreescritura de datos, preservando el historial evaluativo.'
        },
        {
          sub: 'Determinación Algorítmica en Tiempo Real',
          text: 'Determinación algorítmica de la condición académica en tiempo real (Promocionado, Regular, Libre, Recuperatorio pendiente).'
        },
        {
          sub: 'Encabezados Compactos y Primera Columna Fija',
          text: 'Encabezados compactos con fecha de entrega y tabla con primera columna fija para rápida lectura de la nómina de estudiantes.'
        },
        {
          sub: 'NUEVA FUNCIÓN: QuickSave FAB y Atajo [ Ctrl + S ]',
          text: 'Botón circular flotante (FAB) y atajo Ctrl + S para guardado rápido desde cualquier sector de la planilla con confirmación inmediata.'
        }
      ]
    },
    {
      id: 'mesas-examen',
      title: '3. Mesas de Examen y Acreditación Definitiva',
      icon: Award,
      badge: 'Acreditación Oficial',
      actionLink: { label: 'Ir a Mesas de Examen', to: '/mesas-examen' },
      summary: 'Módulo independiente para tribunales examinadores, actas volantes y cierre formal de materias.',
      content: [
        {
          sub: 'NUEVA FUNCIÓN: Módulo Independiente en /mesas-examen',
          text: 'Módulo independiente en /mesas-examen accesible desde el riel lateral para gestionar todos los turnos ordinarios, extraordinarios y mesas promocionales.'
        },
        {
          sub: 'Constitución de Mesas y Tipología de Acta',
          text: 'Constitución de mesas con llamado, condición de acta (Promocional, Regular o Libre), presidente y vocales conforme a la normativa RAM.'
        },
        {
          sub: 'Selector Inteligente de Alumnos Elegibles',
          text: 'Selector inteligente de alumnos elegibles que rescata estudiantes históricos no acreditados, advierte intentos previos reprobados y excluye aprobados.'
        },
        {
          sub: 'Asentamiento Definitivo y Persistencia Atómica',
          text: 'Asentamiento definitivo de calificaciones orales/escritas y guardado atómico en base de datos sin almacenamiento local.'
        }
      ]
    },
    {
      id: 'portal-estudiantes',
      title: '4. Portal Estudiantil por DNI',
      icon: Globe,
      badge: 'Autoconsulta Transparente',
      actionLink: { label: 'Ver Portal de Consulta', to: '/consulta/demo' },
      summary: 'Consulta pública para que los estudiantes verifiquen notas y condición en tiempo real.',
      content: [
        {
          sub: 'NUEVA FUNCIÓN: Tarjeta Bento Integrada en /consulta/:catedraId',
          text: 'Tarjeta Bento integrada de consulta en /consulta/:catedraId con verificación cifrada SSL/RLS y visualización clara.'
        },
        {
          sub: 'Activación del Portal y Difusión',
          text: 'Cómo activar el switch del portal desde la configuración de la cátedra y compartir el enlace oficial o código QR.'
        },
        {
          sub: 'Consulta por DNI sin Contraseñas',
          text: 'Los alumnos consultan notas, asistencias y condición en tiempo real ingresando su DNI, sin requerir contraseñas ni registros previos.'
        }
      ]
    },
    {
      id: 'reportes-excel',
      title: '5. Reportes, Impresión y Exportación a Excel',
      icon: FileSpreadsheet,
      badge: 'Documentación Oficial',
      actionLink: { label: 'Ir a Mis Cátedras', to: '/dashboard' },
      summary: 'Emisión de constancias, actas volantes y planillas de cálculo reglamentarias.',
      content: [
        {
          sub: 'Descarga Directa en Planillas .xlsx',
          text: 'Descarga directa en planillas .xlsx para actas volantes de examen y sábanas cronológicas de asistencia con cálculo porcentual.'
        },
        {
          sub: 'NUEVA FUNCIÓN: Modal Interactivo de Impresión/PDF',
          text: 'Modal interactivo de impresión/PDF en calificaciones para marcar exactamente qué evaluaciones, columnas y firmas incluir antes de emitir el documento.'
        },
        {
          sub: 'Actas Volantes y Libro de Aula Oficial',
          text: 'Constancias oficiales normalizadas en formato A4 con membrete institucional, libro, tomo, folio y firmas reglamentarias.'
        }
      ]
    },
    {
      id: 'consola-comandos',
      title: '6. Consola Operativa y Búsqueda Rápida',
      icon: Search,
      badge: 'Productividad Docente',
      actionLink: { label: 'Ir al Dashboard', to: '/dashboard' },
      summary: 'Herramientas de alta velocidad para navegación y control sin fricciones.',
      content: [
        {
          sub: 'Conmutador Directo de Cátedra Activa',
          text: 'Conmutador directo de cátedra activa desde el header superior para alternar entre materias al instante.'
        },
        {
          sub: 'NUEVA FUNCIÓN: Command Palette [ Ctrl + K o ⌘K ]',
          text: 'Command Palette (Ctrl + K o ⌘K) para saltar de inmediato a cualquier estudiante, cátedra o mesa de examen.'
        },
        {
          sub: 'Telemetría de Estado RAM',
          text: 'Monitoreo en tiempo real del motor RAM en la barra superior para garantizar la integridad de datos.'
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
              Guías de Uso de Korum
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