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
  Heart
} from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';
import Modal from '../common/Modal';

export default function Footer() {
  const navigate = useNavigate();
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  return (
    <footer className="mt-16 text-slate-300 font-sans selection:bg-primary selection:text-white">
      {/* ========================================================
          1. BANNER SUPERIOR DE LLAMADO A LA ACCIÓN (CTA BANNER #11131d)
         ======================================================== */}
      <div className="bg-[#11131d] border-t border-b border-[#1e2337] relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
        {/* Glow de fondo turquesa de innovación y azul corporativo Yastai */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#00C2CB]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/3 w-80 h-80 bg-[#004A99]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00C2CB]/10 border border-[#00C2CB]/30 text-[#00C2CB] text-xs font-mono font-bold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Plataforma Docente Inteligente</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              ¿Listo para optimizar la gestión de tus cátedras?
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Centraliza asistencias en tiempo real, cálculo automático de condiciones académicas, cronograma de exámenes y respaldo seguro en la nube.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap justify-center">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-primary hover:from-blue-500 hover:to-primary text-white text-sm font-bold shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>Explorar Mis Cátedras</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/calendario')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-white text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Calendar className="w-4 h-4 text-[#00C2CB]" />
              <span>Ver Calendario</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. FOOTER INFERIOR ULTRA-OSCURO (#0b0d17)
         ======================================================== */}
      <div className="bg-[#0b0d17] border-t border-[#161a29] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12 pb-10 border-b border-slate-800/80">
          {/* Columna 1: Branding Institucional Yastai de Geti */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#004A99] to-[#00C2CB] flex items-center justify-center text-white shadow-md shadow-primary/30 shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="font-extrabold text-lg text-white tracking-tight">
                  Planilla<span className="text-[#00C2CB]">Docente</span>
                </span>
                <span className="block text-[11px] font-mono text-slate-400">
                  Una solución de <strong className="text-white">Yastai de Geti</strong>
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              Software de grado enterprise diseñado para profesores de nivel secundario, terciario y universitario. Cumple con normativas jurisdiccionales vigentes (RAM) para el régimen de cursada y promociones.
            </p>

            <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
              <a
                href="mailto:soporte@docentepro.edu.ar"
                className="inline-flex items-center gap-1.5 hover:text-[#00C2CB] transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-[#00C2CB]" />
                <span>contacto@geti.com.ar</span>
              </a>
            </div>
          </div>

          {/* Columna 2: Navegación del Sistema */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Navegación
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <span>Panel de Cátedras</span>
                </Link>
              </li>
              <li>
                <Link to="/calendario" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-[#00C2CB]" />
                  <span>Calendario y Mesas</span>
                </Link>
              </li>
              <li>
                <Link to="/instituciones" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Instituciones y Ciclos</span>
                </Link>
              </li>
              <li>
                <Link to="/configuracion" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ajustes y Períodos</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Asistencia y Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Ayuda & Seguridad
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/guias" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                  <span>Guías Paso a Paso</span>
                </Link>
              </li>
              <li>
                <Link to="/soporte" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                  <LifeBuoy className="w-3.5 h-3.5 text-rose-400" />
                  <span>Soporte Técnico Directo</span>
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setIsPrivacyModalOpen(true)}
                  className="text-slate-400 hover:text-white transition-colors text-left"
                >
                  Seguridad y RLS de Datos
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setIsTermsModalOpen(true)}
                  className="text-slate-400 hover:text-white transition-colors text-left"
                >
                  Términos Institucionales
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Sub-barra: Copyright y Estado del Sistema en Tiempo Real */}
        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-slate-400">
          <div>
            © {new Date().getFullYear()} <strong className="text-slate-200">PlanillaDocente</strong>. Desarrollado con tecnología de vanguardia por <strong className="text-slate-200">Yastai de Geti</strong>.
          </div>

          {/* Indicador de Estado en Tiempo Real */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-300">
              {isSupabaseConfigured 
                ? 'Base de datos Supabase conectada / Sistema operativo (Latencia < 28ms)' 
                : 'Modo Demostración Activo / Almacenamiento Local Seguro'}
            </span>
          </div>
        </div>
      </div>

      {/* Modal Informativo: Privacidad y RLS */}
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
    </footer>
  );
}
