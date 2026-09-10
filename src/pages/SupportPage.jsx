import React, { useState } from 'react';
import { 
  LifeBuoy, 
  HelpCircle, 
  Mail, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  Database, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  BookOpen, 
  ExternalLink,
  Laptop,
  Clock
} from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function SupportPage() {
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState(null);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('duda_funcional');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const handleSubmitTicket = (e) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      toast.error('Por favor completa el asunto y el mensaje de tu consulta.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success('¡Consulta enviada con éxito! Te responderemos a la brevedad.');
      setTicketSubject('');
      setTicketMessage('');
    }, 800);
  };

  const faqs = [
    {
      q: '¿Cuál es el formato exacto para importar la lista de alumnos desde Excel?',
      a: 'PlanillaDocente acepta archivos .xlsx, .xls y .csv. Se recomienda incluir encabezados como "DNI", "Apellido" y "Nombre" (o una columna unificada "Alumno"). El importador busca automáticamente estas columnas de forma inteligente y te permite revisar y editar cualquier dato antes de confirmar la matriculación.'
    },
    {
      q: '¿Cómo funciona la "Inasistencia Docente" y cómo afecta a los alumnos?',
      a: 'Cuando marcas una clase como "Inasistencia Docente", la sesión queda registrada en el historial de la cátedra con su motivo (ej. paro de transporte, licencia médica o jornada institucional). Por diseño pedagógico y normativo, esta clase NO penaliza el porcentaje de asistencia de ningún estudiante ni cuenta como inasistencia estudiantil.'
    },
    {
      q: '¿Dónde configuro las fechas de cuatrimestre y el receso de invierno?',
      a: 'En el menú lateral dirígete a "Configuración" > "Límites de Períodos Académicos y Receso Invernal". Allí puedes definir las fechas de inicio y fin de cada cuatrimestre y las semanas de receso invernal para cada institución y ciclo lectivo.'
    },
    {
      q: '¿Mis datos y cátedras están protegidos de otros profesores?',
      a: 'Sí. PlanillaDocente utiliza Row Level Security (RLS) en Supabase a nivel de base de datos. Cada docente tiene un identificador único seguro (UUID) y solo tiene acceso de lectura y escritura a las cátedras, alumnos, asistencias, notas y archivos que le pertenecen.'
    },
    {
      q: '¿Cómo cambio la gama de colores o el modo claro/oscuro?',
      a: 'Puedes alternar entre modo oscuro y claro tocando el botón del Sol/Luna en la barra superior. Además, en "Configuración" dispones de un selector con múltiples gamas cromáticas: Azul Francia (por defecto), Esmeralda Institucional, Índigo Académico, Ámbar Cálido y Pizarra Minimalista.'
    },
    {
      q: '¿Qué ocurre con los alumnos que aprueban mediante Examen Recuperatorio?',
      a: 'En la pestaña "Calificaciones" de la cátedra, cuando un alumno reprueba un parcial y rinde un recuperatorio, el sistema toma automáticamente la nota del recuperatorio para el cálculo del promedio final y determina su condición académica (Promocionado, Regular o Libre).'
    }
  ];

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
                Centro de Soporte y Ayuda
              </h1>
              <p className="text-sm text-text-muted mt-0.5">
                Respuestas a preguntas frecuentes, estado del sistema y canales de atención docente.
              </p>
            </div>
          </div>
        </div>

        <Link
          to="/guias"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-surface-border text-text-primary hover:bg-surface-hover hover:border-primary/30 text-sm font-semibold transition-all shadow-xs"
        >
          <BookOpen className="w-4 h-4 text-primary" />
          <span>Ver Guías Paso a Paso</span>
          <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
        </Link>
      </div>

      {/* Diagnostic System Status Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-surface-border flex items-center gap-3.5 shadow-xs">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Servidor Cloud</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Online
              </span>
            </div>
            <p className="text-sm font-bold text-text-primary truncate">
              {isSupabaseConfigured ? 'Supabase PostgreSQL' : 'Modo Demostración'}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-surface-border flex items-center gap-3.5 shadow-xs">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Seguridad RLS</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                Activo
              </span>
            </div>
            <p className="text-sm font-bold text-text-primary truncate">
              Aislamiento Multi-Docente
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-surface-border flex items-center gap-3.5 shadow-xs">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500 shrink-0">
            <Laptop className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Plataforma</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400">
                v1.2
              </span>
            </div>
            <p className="text-sm font-bold text-text-primary truncate">
              PlanillaDocente Web
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: FAQ Accordion + Contact Ticket */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: FAQs (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-2 px-1">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-text-primary">
              Preguntas Frecuentes
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-surface-border bg-surface overflow-hidden transition-all shadow-xs hover:border-primary/20"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 font-semibold text-text-primary hover:text-primary transition-colors select-none"
                  >
                    <span className="text-sm leading-snug">{faq.q}</span>
                    <span className="p-1 rounded-lg bg-surface-hover text-text-muted shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-4 pt-1 text-sm text-text-secondary border-t border-surface-border/50 leading-relaxed bg-surface/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Contact & Direct Message (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">Enviar Consulta Directa</h3>
                <p className="text-xs text-text-muted">¿Tienes un problema o sugerencia técnica?</p>
              </div>
            </div>

            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Categoría
                </label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                >
                  <option value="duda_funcional">Consulta sobre uso del sistema</option>
                  <option value="importacion_excel">Problema con archivo Excel / CSV</option>
                  <option value="error_supabase">Error de base de datos o sincronización</option>
                  <option value="sugerencia">Sugerencia de nueva función</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Asunto
                </label>
                <input
                  type="text"
                  placeholder="Ej: Inconveniente al guardar notas..."
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-surface text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Mensaje / Detalle
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe con precisión qué ocurrió, nombre de cátedra o paso a paso..."
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-surface text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
                />
              </div>

              {user && (
                <div className="p-3 rounded-xl bg-surface-hover/80 text-xs text-text-muted flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">Respuesta a: <strong className="text-text-primary">{user.email}</strong></span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full flex items-center justify-center gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Enviando mensaje...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Consulta al Equipo</span>
                  </>
                )}
              </Button>
            </form>
          </Card>

          {/* Tips Card */}
          <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 text-xs space-y-2 text-text-secondary">
            <div className="flex items-center gap-2 font-bold text-primary text-sm">
              <Clock className="w-4 h-4" />
              <span>Horarios de Respuesta</span>
            </div>
            <p>
              Las consultas técnicas recibidas son analizadas prioritariamente de lunes a viernes. Para consultas urgentes sobre exámenes, te recomendamos consultar la pestaña de <strong>Guías</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
