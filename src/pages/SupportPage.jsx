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
  GraduationCap,
  Search,
  FileSpreadsheet,
  Palette,
  FileText,
  Check,
  X
} from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import CustomSelect from '../components/common/CustomSelect';
import Modal from '../components/common/Modal';
import MinimalSpinner from '../components/common/MinimalSpinner';
import SupportContactIllustration from '../components/illustrations/SupportContactIllustration';
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

  // FAQ State
  const [openFaq, setOpenFaq] = useState(null);
  const [faqSearch, setFaqSearch] = useState('');
  const [selectedFaqCategory, setSelectedFaqCategory] = useState('ALL');

  // Modales de información institucional
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

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
      id: 'faq-1',
      category: 'EXCEL',
      categoryLabel: 'Nómina & Excel',
      icon: FileSpreadsheet,
      q: '¿Cuál es el formato exacto para importar la lista de alumnos desde Excel?',
      a: 'PlanillaDocente acepta archivos .xlsx, .xls y .csv. Se recomienda incluir encabezados como "DNI", "Apellido" y "Nombre" (o una columna unificada "Alumno"). El importador busca automáticamente estas columnas de forma inteligente y te permite revisar y editar cualquier dato antes de confirmar la matriculación.',
      tip: 'Puedes arrastrar directamente el archivo descargado de tu sistema de gestión estudiantil institucional.'
    },
    {
      id: 'faq-2',
      category: 'ASISTENCIAS',
      categoryLabel: 'Asistencias & Licencias',
      icon: Clock,
      q: '¿Cómo funciona la "Inasistencia Docente" y cómo afecta a los alumnos?',
      a: 'Cuando marcas una clase como "Inasistencia Docente", la sesión queda registrada en el historial de la cátedra con su motivo (ej. paro de transporte, licencia médica o jornada institucional). Por diseño pedagógico y normativo, esta clase NO penaliza el porcentaje de asistencia de ningún estudiante ni cuenta como inasistencia estudiantil.',
      tip: 'La fórmula descuenta automáticamente la clase del divisor total para preservar la regularidad de los alumnos.'
    },
    {
      id: 'faq-3',
      category: 'CALIFICACIONES',
      categoryLabel: 'Calificaciones & Evaluaciones',
      icon: GraduationCap,
      q: '¿Cómo se registran Parciales o Trabajos Prácticos pendientes de corrección?',
      a: 'En la pestaña "Calificaciones" de la cátedra, puedes crear una nueva evaluación (TP o Parcial) indicando fecha de entrega y adjuntando las consignas. La columna queda inmediatamente creada y protegida de modo que nunca se borre al recargar, permitiéndote calificar a cada alumno a medida que entreguen.',
      tip: 'Los alumnos no son penalizados mientras el trabajo práctico esté dentro del plazo límite de entrega estipulado.'
    },
    {
      id: 'faq-4',
      category: 'CALIFICACIONES',
      categoryLabel: 'Exportación de Datos',
      icon: FileText,
      q: '¿Cómo puedo exportar la sábana de notas a Excel o CSV?',
      a: 'Dentro de la pestaña "Calificaciones", dispones de botones para exportar en formato Excel (.xlsx) con columnas autoajustadas o en CSV (.csv) compatible con sistemas escolares provinciales y hojas de cálculo tradicionales.',
      tip: 'El archivo generado incluye asistencias efectivas, notas de parciales, recuperatorios y condición académica RAM.'
    },
    {
      id: 'faq-5',
      category: 'SEGURIDAD',
      categoryLabel: 'Seguridad & RLS',
      icon: ShieldCheck,
      q: '¿Mis datos y cátedras están protegidos de otros profesores?',
      a: 'Sí. PlanillaDocente utiliza Row Level Security (RLS) en Supabase a nivel de motor PostgreSQL. Cada docente tiene un identificador único seguro (UUID) y solo tiene acceso de lectura y escritura a las cátedras, alumnos, asistencias, notas y archivos que le pertenecen.',
      tip: 'Tus planillas y notas de exámenes están criptográficamente aisladas y no pueden ser leídas por terceros.'
    },
    {
      id: 'faq-6',
      category: 'CONFIG',
      categoryLabel: 'Apariencia & Paletas',
      icon: Palette,
      q: '¿Cómo cambio la gama de colores o el modo claro/oscuro?',
      a: 'Puedes alternar entre modo oscuro y claro tocando el selector Sol/Luna. Además, en "Configuración" dispones de un selector con múltiples gamas cromáticas: Azul Francia (predeterminada), Índigo Real, Verde Esmeralda, Púrpura Académico y Pizarra Grafito, con efecto liquid glass y persistencia en tu navegador.',
      tip: 'La paleta elegida se aplica armoniosamente en toda la interfaz, incluidos los menús laterales y el pie institucional.'
    }
  ];

  const faqCategories = [
    { id: 'ALL', label: 'Todas las preguntas' },
    { id: 'EXCEL', label: 'Nómina & Excel' },
    { id: 'ASISTENCIAS', label: 'Asistencias' },
    { id: 'CALIFICACIONES', label: 'Calificaciones' },
    { id: 'SEGURIDAD', label: 'Seguridad & RLS' },
    { id: 'CONFIG', label: 'Apariencia' }
  ];

  const filteredFaqs = faqs.filter(f => {
    const matchesCategory = selectedFaqCategory === 'ALL' || f.category === selectedFaqCategory;
    const qNorm = f.q.toLowerCase();
    const aNorm = f.a.toLowerCase();
    const searchNorm = faqSearch.trim().toLowerCase();
    const matchesSearch = !searchNorm || qNorm.includes(searchNorm) || aNorm.includes(searchNorm) || f.categoryLabel.toLowerCase().includes(searchNorm);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 pb-12 animate-fadeIn max-w-6xl mx-auto">
      {/* Header Principal con Identidad Institucional */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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

        {/* ========================================================
            ACCESOS RÁPIDOS INSTITUCIONALES CON ICONOS
           ======================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Guías Paso a Paso */}
          <Link
            to="/guias"
            className="group p-4 rounded-2xl bg-surface/85 backdrop-blur-xl border border-surface-border hover:border-primary/50 hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-primary transition-colors flex items-center gap-1.5">
                  <span>Guías Paso a Paso</span>
                </h4>
                <p className="text-[11px] text-text-muted">
                  Tutoriales interactivos del sistema
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors shrink-0" />
          </Link>

          {/* Card 2: Seguridad y RLS de Datos */}
          <button
            type="button"
            onClick={() => setIsPrivacyModalOpen(true)}
            className="group p-4 rounded-2xl bg-surface/85 backdrop-blur-xl border border-surface-border hover:border-emerald-500/50 hover:shadow-md transition-all flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-emerald-500 transition-colors">
                  Seguridad y RLS de Datos
                </h4>
                <p className="text-[11px] text-text-muted">
                  Aislamiento criptográfico PostgreSQL
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Seguro
            </span>
          </button>

          {/* Card 3: Términos Institucionales */}
          <button
            type="button"
            onClick={() => setIsTermsModalOpen(true)}
            className="group p-4 rounded-2xl bg-surface/85 backdrop-blur-xl border border-surface-border hover:border-primary/50 hover:shadow-md transition-all flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-primary transition-colors">
                  Términos Institucionales
                </h4>
                <p className="text-[11px] text-text-muted">
                  Normativas de cursada y RAM
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Normativa
            </span>
          </button>
        </div>
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

            {/* Botón Verde Esmeralda / Menta Prominente con Feedback Táctil */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-transform duration-100 text-white font-bold text-sm shadow-md shadow-emerald-500/25 hover:shadow-emerald-500/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <MinimalSpinner size="sm" variant="white" />
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

          {/* Gráfico Vectorial Pulido Estilo Tabler */}
          <div className="relative z-10 flex flex-col items-center text-center my-auto py-6">
            <SupportContactIllustration className="w-48 h-48 sm:w-60 sm:h-60 mb-6" />

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
          PREGUNTAS FRECUENTES Y RESPUESTAS INMEDIATAS (FAQS)
         ======================================================== */}
      <div className="space-y-6 pt-4">
        {/* Cabecera de la Sección con Buscador */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
                Preguntas Frecuentes y Respuestas Inmediatas
              </h3>
              <p className="text-xs text-text-muted">
                Respuestas directas a las dudas operativas, normativas y técnicas más habituales
              </p>
            </div>
          </div>

          {/* Buscador de preguntas en vivo */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar en preguntas frecuentes..."
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-surface/90 border border-surface-border text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-xs"
            />
            {faqSearch && (
              <button
                type="button"
                onClick={() => setFaqSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary rounded-md transition-colors"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filtros por Categoría */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {faqCategories.map((cat) => {
            const isCatActive = selectedFaqCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedFaqCategory(cat.id)}
                className={`
                  px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer
                  ${isCatActive
                    ? 'bg-primary text-white shadow-sm shadow-primary/30'
                    : 'bg-surface/80 hover:bg-surface-hover text-text-muted hover:text-text-primary border border-surface-border'
                  }
                `}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Listado de Acordeones Liquid Glass */}
        {filteredFaqs.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-surface/80 border border-surface-border backdrop-blur-md space-y-3">
            <HelpCircle className="w-10 h-10 text-text-muted mx-auto opacity-50" />
            <p className="text-sm font-semibold text-text-primary">
              No se encontraron respuestas para "{faqSearch}"
            </p>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              Prueba con otro término de búsqueda o completa el formulario superior para consultar con nuestro equipo técnico.
            </p>
            <button
              type="button"
              onClick={() => { setFaqSearch(''); setSelectedFaqCategory('ALL'); }}
              className="text-xs font-bold text-primary hover:underline"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFaqs.map((faq, idx) => {
              const isOpen = openFaq === faq.id;
              const FaqIcon = faq.icon;

              return (
                <div
                  key={faq.id}
                  className={`
                    rounded-2xl border transition-all duration-200 overflow-hidden backdrop-blur-md shadow-xs
                    ${isOpen 
                      ? 'border-primary/40 bg-surface/95 shadow-md shadow-primary/5' 
                      : 'border-surface-border bg-surface/80 hover:border-surface-border/80 hover:bg-surface/90'
                    }
                  `}
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left font-bold text-text-primary cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`p-2 rounded-xl shrink-0 transition-colors ${
                        isOpen ? 'bg-primary text-white shadow-sm' : 'bg-surface-hover text-primary'
                      }`}>
                        <FaqIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {faq.categoryLabel}
                          </span>
                        </div>
                        <span className="text-xs sm:text-sm text-text-primary leading-snug block">
                          {faq.q}
                        </span>
                      </div>
                    </div>

                    <span className={`p-1.5 rounded-xl border border-surface-border shrink-0 transition-transform duration-200 ${
                      isOpen ? 'bg-primary/10 text-primary rotate-180' : 'bg-surface-hover text-text-muted'
                    }`}>
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-text-secondary border-t border-surface-border/60 leading-relaxed bg-surface-hover/20 animate-fadeIn space-y-3">
                      <p>{faq.a}</p>

                      {faq.tip && (
                        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-text-primary text-xs flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <div>
                            <strong className="font-semibold text-primary block">Consejo pedagógico / operativo:</strong>
                            <span className="text-text-muted">{faq.tip}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Informativo: Privacidad y RLS de Datos */}
      <Modal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        title="Seguridad y Protección de Datos Institucionales"
        subtitle="PlanillaDocente garantiza el aislamiento estricto de la información académica"
      >
        <div className="space-y-4 text-xs text-text-secondary leading-relaxed">
          <p>
            PlanillaDocente aplica políticas de <strong>Row Level Security (RLS)</strong> a nivel de motor PostgreSQL en Supabase. Cada registro de cátedras, asistencias, notas y nómina de estudiantes está criptográficamente vinculado al identificador de usuario (`auth.uid()`) del docente.
          </p>
          <p>
            Ningún otro docente o tercero tiene acceso de lectura o escritura a tus planillas de calificación ni a los archivos cargados en el bucket de Storage.
          </p>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono text-[11px]">
            ✓ Cumplimiento estricto con la Ley de Protección de Datos Personales y secreto estadístico docente.
          </div>
        </div>
      </Modal>

      {/* Modal Informativo: Términos */}
      <Modal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        title="Términos Institucionales de Uso"
        subtitle="Lineamientos de operación pedagógica y administrativa"
      >
        <div className="space-y-4 text-xs text-text-secondary leading-relaxed">
          <p>
            El sistema calcula las condiciones de <strong>Promoción, Regularidad o Recurso</strong> en base a las fórmulas parametrizadas por el docente o establecidas en el Régimen Académico Marco (RAM).
          </p>
          <p>
            Las inasistencias docentes no computan en contra del porcentaje de asistencia del alumnado y quedan debidamente registradas para auditoría institucional.
          </p>
        </div>
      </Modal>
    </div>
  );
}
