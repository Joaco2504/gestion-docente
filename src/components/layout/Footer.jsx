import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  ArrowRight, 
  Database, 
  ShieldCheck, 
  LifeBuoy, 
  BookOpen, 
  Calendar, 
  Settings, 
  Mail, 
  ExternalLink,
  Sparkles,
  Heart,
  FileText,
  Award,
  Building2,
  Users
} from 'lucide-react';
import Modal from '../common/Modal';

export default function Footer() {
  const navigate = useNavigate();
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  return (
    <div className="mt-16 text-text-secondary font-sans selection:bg-primary selection:text-white">
      {/* ========================================================
          1. BANNER SUPERIOR DE INVITACIÓN CÁLIDO Y HUMANO
         ======================================================== */}
      <div className="bg-surface/90 dark:bg-[#0c1222]/90 backdrop-blur-xl border-t border-b border-surface-border relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8 transition-colors">
        {/* Glows de fondo con acento esmeralda */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/3 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>Espacio Docente</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
              ¿Querés tener tus cátedras organizadas sin perder tiempo?
            </h2>
            <p className="text-sm text-text-muted max-w-2xl leading-relaxed">
              Menos planillas manuales y más tiempo para tus clases. Todo el seguimiento de notas, asistencias y actas oficiales en un solo lugar y al instante.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap justify-center">
            <button
              type="button"
              onClick={() => {
                navigate('/dashboard');
                window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                document.querySelector('main')?.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>Explorar Mis Cátedras</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                navigate('/mesas-examen');
                window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                document.querySelector('main')?.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300/60 dark:border-slate-700/60 text-xs sm:text-sm font-medium transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span>Ver Mesas y Calendario</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. FOOTER INFERIOR CON FONDO ILUSTRADO Y ANCLAJE PROPORCIONAL
         ======================================================== */}
      <footer className="relative w-full overflow-hidden bg-[#F8FAFC] dark:bg-[#080C14] border-t border-slate-200/80 dark:border-slate-800/80 transition-colors duration-300">
        {/* Capa de fondo ilustrado con anclaje a la derecha y escalado proporcional */}
        <div 
          className="absolute inset-0 w-full h-full pointer-events-none bg-no-repeat bg-right-bottom sm:bg-right bg-contain opacity-75 dark:opacity-85 transition-opacity duration-300 bg-[url('/footer-light.webp')] dark:bg-[url('/footer.webp')]"
        />

        {/* Máscara de degradado hacia la izquierda para que los textos siempre tengan contraste 100% legible */}
        <div 
          className="absolute inset-0 bg-gradient-to-r from-[#F8FAFC] via-[#F8FAFC]/80 to-transparent dark:from-[#080C14] dark:via-[#080C14]/85 dark:to-transparent pointer-events-none" 
        />

        {/* Contenido HTML del Footer montado con z-10 */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-10 sm:py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12 pb-10 border-b border-surface-border/60">
            {/* Columna 1: Descripción y Contacto (el isotipo y KORUM están integrados en la imagen de fondo) */}
            <div className="md:col-span-2 space-y-3 pt-2">
              <p className="text-xs text-text-muted leading-relaxed max-w-md">
                Una herramienta pensada por y para docentes. Creada para que llevar las notas al día, tomar asistencia y cerrar actas sea una tarea ágil, transparente y sin complicaciones.
              </p>

              <div className="pt-1">
                <a 
                  href="mailto:emiliopacheco521@gmail.com.ar" 
                  className="text-xs font-mono text-slate-500 hover:text-emerald-500 flex items-center gap-1.5 transition-colors mt-3"
                >
                  <Mail className="w-3.5 h-3.5 text-emerald-500" /> 
                  <span>emiliopacheco521@gmail.com.ar</span>
                </a>
              </div>
            </div>

            {/* Columna 2: Navegación del Sistema */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Navegación
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="/dashboard" className="text-text-muted hover:text-emerald-500 transition-colors flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Panel de Cátedras</span>
                  </Link>
                </li>
                <li>
                  <Link to="/mesas-examen" className="text-text-muted hover:text-emerald-500 transition-colors flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Mesas de Examen</span>
                  </Link>
                </li>
                <li>
                  <Link to="/calendario" className="text-text-muted hover:text-emerald-500 transition-colors flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Calendario Académico</span>
                  </Link>
                </li>
                <li>
                  <Link to="/instituciones" className="text-text-muted hover:text-emerald-500 transition-colors flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Instituciones</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Columna 3: Asistencia y Legal */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Ayuda & Seguridad
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="/guias" className="text-text-muted hover:text-emerald-500 transition-colors flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Guías Paso a Paso</span>
                  </Link>
                </li>
                <li>
                  <Link to="/consulta/demo" className="text-text-muted hover:text-emerald-500 transition-colors flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Consulta de Estudiantes (Portal DNI)</span>
                  </Link>
                </li>
                <li>
                  <Link to="/soporte" className="text-text-muted hover:text-emerald-500 transition-colors flex items-center gap-2">
                    <LifeBuoy className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Soporte Directo</span>
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsPrivacyModalOpen(true)}
                    className="text-text-muted hover:text-emerald-500 transition-colors flex items-center gap-2 text-left cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Seguridad y RLS de Datos</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsTermsModalOpen(true)}
                    className="text-text-muted hover:text-emerald-500 transition-colors flex items-center gap-2 text-left cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Términos Institucionales</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Sub-barra de Créditos y Derechos Reservados */}
          <div className="pt-6 mt-8 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <p>© 2026 Korum. Todos los derechos reservados.</p>
            <p className="text-center sm:text-right">
              Diseñado y desarrollado para la gestión académica por el <span className="font-semibold text-slate-700 dark:text-slate-300">Prof. Pacheco E. Joaquín</span> — Una solución de <span className="font-semibold text-emerald-600 dark:text-emerald-400">Yastai de GeTi (Automatizaciones)</span>.
            </p>
          </div>
        </div>
      </footer>

      {/* Modal Informativo: Privacidad y RLS */}
      <Modal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        title="Seguridad y Protección de Datos Institucionales"
        subtitle="Korum garantiza el aislamiento estricto de la información académica"
      >
        <div className="space-y-4 text-xs text-text-secondary leading-relaxed">
          <p>
            Korum aplica políticas de <strong>Row Level Security (RLS)</strong> a nivel de motor PostgreSQL en Supabase. Cada registro de cátedras, asistencias, notas y nómina de estudiantes está criptográficamente vinculado al identificador de usuario (`auth.uid()`) del docente.
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
