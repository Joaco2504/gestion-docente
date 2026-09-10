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
  Clock,
  Sparkles,
  Building,
  GraduationCap
} from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import CustomSelect from '../components/common/CustomSelect';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export default function SupportPage() {
  const { user } = useAuth();
  const { catedras } = useApp();

  // Form State
  const [docenteNombre, setDocenteNombre] = useState(
    user?.user_metadata?.nombre || user?.email?.split('@')[0] || ''
  );
  const [docenteEmail, setDocenteEmail] = useState(user?.email || '');
  const [ticketCategory, setTicketCategory] = useState('duda_funcional');
  const [linkedCatedra, setLinkedCatedra] = useState('none');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const handleSubmitTicket = (e) => {
    e.preventDefault();
    if (!docenteNombre.trim() || !docenteEmail.trim() || !ticketSubject.trim() || !ticketMessage.trim()) {
      toast.error('Por favor completa todos los campos requeridos del formulario.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success('¡Consulta enviada al equipo de soporte de Yastai de Geti! Recibirás respuesta a la brevedad.');
      setTicketSubject('');
      setTicketMessage('');
      setLinkedCatedra('none');
    }, 900);
  };

  const categoryOptions = [
    { value: 'duda_funcional', label: 'Consulta sobre uso general de la plataforma', badge: 'Guía' },
    { value: 'importacion_excel', label: 'Importación o formato de nómina Excel / CSV', badge: 'Alumnos' },
    { value: 'inasistencias_docentes', label: 'Inasistencias docentes y cálculo de asistencias', badge: 'Asistencia' },
    { value: 'calificaciones_ram', label: 'Cálculo de promedios y condición académica (RAM)', badge: 'Notas' },
    { value: 'error_supabase', label: 'Incidencia de base de datos o sincronización Supabase', badge: 'Técnico' },
    { value: 'sugerencia', label: 'Sugerencia de nueva función pedagógica', badge: 'Idea' }
  ];

  const catedraOptions = [
    { value: 'none', label: 'Consulta general (ninguna cátedra en particular)' },
    ...catedras.map(cat => ({
      value: cat.id,
      label: cat.nombre,
      badge: cat.nivel === 'TERCIARIO' ? 'Terciario' : 'Secundario'
    }))
  ];

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
    <div className="space-y-8 pb-12 animate-fadeIn max-w-6xl mx-auto">
      {/* Header Principal con Identidad Institucional */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
                  Centro de Soporte y Ayuda
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                  Respuesta Rápida
                </span>
              </div>
              <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                Canal de atención docente oficial de <strong className="text-text-primary">PlanillaDocente — Yastai de Geti</strong>.
              </p>
            </div>
          </div>
        </div>

        <Link
          to="/guias"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-surface-border text-text-primary hover:bg-surface-hover hover:border-primary/30 text-xs sm:text-sm font-semibold transition-all shadow-xs"
        >
          <BookOpen className="w-4 h-4 text-primary" />
          <span>Ver Guías Paso a Paso</span>
          <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
        </Link>
      </div>

      {/* ========================================================
          SPLIT-CARD SUPPORT FORM
         ======================================================== */}
      <div className="bg-surface rounded-3xl border border-surface-border shadow-elevated overflow-hidden grid grid-cols-1 lg:grid-cols-12 transition-all">
        {/* LADO IZQUIERDO: FORMULARIO DE SOPORTE (7 Columnas en Desktop) */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
              <MessageSquare className="w-4 h-4" />
              <span>Formulario de Contacto Directo</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
              ¿En qué podemos ayudarte hoy?
            </h2>
            <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
              Completa el formulario y un especialista del equipo pedagógico y técnico revisará tu consulta.
            </p>
          </div>

          <form onSubmit={handleSubmitTicket} className="space-y-4">
            {/* Nombre y Correo en 2 Columnas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={docenteNombre}
                  onChange={(e) => setDocenteNombre(e.target.value)}
                  placeholder="Prof. Juan Pérez"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-surface text-text-primary text-xs sm:text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={docenteEmail}
                  onChange={(e) => setDocenteEmail(e.target.value)}
                  placeholder="docente@escuela.edu.ar"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-surface text-text-primary text-xs sm:text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all font-mono"
                />
              </div>
            </div>

            {/* Tipo de Consulta (CustomSelect) */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Tipo de Consulta o Problema *
              </label>
              <CustomSelect
                value={ticketCategory}
                onChange={(val) => setTicketCategory(typeof val === 'object' ? val.target.value : val)}
                options={categoryOptions}
                placeholder="Selecciona la categoría..."
                buttonClassName="py-2.5"
              />
            </div>

            {/* Cátedra Vinculada (CustomSelect opcional) */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Cátedra Vinculada (Opcional)
              </label>
              <CustomSelect
                value={linkedCatedra}
                onChange={(val) => setLinkedCatedra(typeof val === 'object' ? val.target.value : val)}
                options={catedraOptions}
                placeholder="Selecciona la cátedra afectada..."
                buttonClassName="py-2.5"
              />
            </div>

            {/* Asunto */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Asunto de la Consulta *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Inconveniente al guardar notas del recuperatorio..."
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-surface text-text-primary text-xs sm:text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Mensaje / Detalle del Problema */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Mensaje / Detalle del Problema *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Describe con precisión qué ocurrió, pasos que realizaste o mensaje de error visualizado..."
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border bg-surface text-text-primary text-xs sm:text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all resize-none leading-relaxed"
              />
            </div>

            {/* Botón Verde Esmeralda / Menta Prominente */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Enviando mensaje al equipo...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar Consulta al Equipo de Soporte</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* LADO DERECHO: PANEL ILUSTRATIVO MENTA / TEAL PASTEL (5 Columnas en Desktop) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-emerald-50 via-teal-50/70 to-cyan-50/50 dark:from-[#062820] dark:via-[#092224] dark:to-[#091823] p-8 sm:p-10 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-emerald-100 dark:border-emerald-900/30 relative overflow-hidden">
          {/* Círculos y formas geométricas decorativas con blur suave */}
          <div className="absolute top-4 right-4 w-40 h-40 bg-emerald-400/20 dark:bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-10 left-4 w-48 h-48 bg-teal-400/20 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Gráfico Vectorial Pulido: Sobre abriéndose + Avión de papel despegando */}
          <div className="relative z-10 flex flex-col items-center text-center my-auto py-6">
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 mb-6">
              {/* Gráficos vectoriales SVG estilizados */}
              <svg viewBox="0 0 240 240" fill="none" className="w-full h-full drop-shadow-lg">
                {/* Sombra suave de base */}
                <ellipse cx="120" cy="205" rx="70" ry="12" fill="rgba(16, 185, 129, 0.15)" />

                {/* Sobre de correspondencia en perspectiva suave */}
                <rect x="50" y="100" width="140" height="90" rx="16" fill="#10b981" />
                <rect x="50" y="100" width="140" height="90" rx="16" fill="url(#envelopeGradient)" />
                
                {/* Hoja de carta que emerge del sobre */}
                <rect x="65" y="60" width="110" height="80" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
                <line x1="80" y1="80" x2="140" y2="80" stroke="#004A99" strokeWidth="3" strokeLinecap="round" />
                <line x1="80" y1="95" x2="160" y2="95" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="80" y1="108" x2="130" y2="108" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="155" cy="80" r="4" fill="#00C2CB" />

                {/* Solapa del sobre */}
                <path d="M50 102 L120 150 L190 102" fill="none" stroke="#047857" strokeWidth="3" strokeLinejoin="round" />
                <path d="M50 190 L105 140" stroke="#059669" strokeWidth="2" />
                <path d="M190 190 L135 140" stroke="#059669" strokeWidth="2" />

                {/* Trayectoria de vuelo punteada del avión */}
                <path
                  d="M120 110 C 130 80, 160 50, 195 40"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  fill="none"
                />

                {/* Avión de papel en vuelo ascendente */}
                <g transform="translate(180, 25) rotate(15)">
                  <polygon points="0,25 35,0 15,28" fill="#ffffff" />
                  <polygon points="15,28 35,0 20,38" fill="#e2e8f0" />
                  <polygon points="15,28 20,38 18,34" fill="#00C2CB" />
                </g>

                {/* Estrellas y acentos geométricos */}
                <circle cx="45" cy="70" r="3" fill="#10b981" />
                <circle cx="205" cy="115" r="4" fill="#00C2CB" />
                <polygon points="40,140 43,148 51,148 45,153 47,161 40,156 33,161 35,153 29,148 37,148" fill="#f59e0b" />

                <defs>
                  <linearGradient id="envelopeGradient" x1="50" y1="100" x2="190" y2="190" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#10b981" />
                    <stop offset="1" stopColor="#059669" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="space-y-2 relative z-10">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold tracking-wide uppercase">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Atención Docente Prioritaria</span>
              </span>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Estamos contigo en cada clase
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs mx-auto leading-relaxed">
                Tanto si necesitas asistencia con la planilla de cálculo de notas como si deseas reportar una duda de asistencia, nuestro equipo te responderá de forma personalizada.
              </p>
            </div>
          </div>

          {/* Tarjeta de horario de atención al pie del panel ilustrativo */}
          <div className="relative z-10 p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200/60 dark:border-emerald-800/40 backdrop-blur-md space-y-1.5 text-xs text-slate-700 dark:text-slate-300 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400">
              <Clock className="w-4 h-4" />
              <span>Horarios de Respuesta Activa</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
              Lunes a Viernes de 08:00 a 20:00 hs. Las consultas sobre mesas de exámenes finales y cierres de actas son atendidas con carácter de <strong>máxima prioridad</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================
          PREGUNTAS FRECUENTES (FAQS)
         ======================================================== */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-text-primary tracking-tight">
            Preguntas Frecuentes y Respuestas Inmediatas
          </h3>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-surface-border bg-surface overflow-hidden transition-all shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between gap-4 p-4 text-left font-bold text-text-primary hover:bg-surface-hover/80 transition-colors"
                >
                  <span className="text-xs sm:text-sm leading-snug">{faq.q}</span>
                  <span className="p-1 rounded-lg bg-surface-hover text-text-muted shrink-0">
                    {isOpen ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-text-secondary border-t border-surface-border/50 leading-relaxed bg-surface-hover/30">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
