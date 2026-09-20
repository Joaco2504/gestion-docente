import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Check, Sparkles } from 'lucide-react';
import { OnboardingStepIllustration } from '../common/BrandIllustrations';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { toast } from 'sonner';

const STEPS_DATA = [
  {
    step: 1,
    badge: 'Paso 1 de 3 • Estructura Académica',
    title: 'Organización de Cátedras y Ciclos',
    description: 'Configura tus materias por nivel educativo (Terciario, Secundario o Universitario) y selecciona regímenes cuatrimestrales o anuales con adaptación inmediata.'
  },
  {
    step: 2,
    badge: 'Paso 2 de 3 • Motor Reglamentario RAM',
    title: 'Cálculo Automático de Condiciones',
    description: 'Korum evalúa asistencias y notas con rigor matemático: 70% para Regularidad y 80% para Promoción Directa, sin sobreescribir tus evaluaciones.'
  },
  {
    step: 3,
    badge: 'Paso 3 de 3 • Certificación Oficial',
    title: 'Actas Oficiales y Consulta por DNI',
    description: 'Genera actas volantes en PDF listas para archivar con código QR y habilita a tus estudiantes la consulta pública y segura mediante DNI.'
  }
];

export default function OnboardingModal({ forceOpen = false, onClose = null }) {
  const { catedras, loading: appLoading, setOpenNewCatedraModal } = useApp();
  const { user, loading: authLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Apertura defensiva: SOLO para usuarios realmente nuevos que ingresan por primera vez
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      setCurrentStep(1);
      return;
    }

    // 1. Diagnóstico y prevención de race-condition:
    // No evaluar el onboarding si la sesión o las cátedras aún están cargando
    if (appLoading || authLoading || !user) return;

    // 2. Si el usuario YA TIENE cátedras registradas, marcar como completado inmediatamente en segundo plano
    if (user.id && catedras && catedras.length > 0) {
      localStorage.setItem(`korum_onboarding_completed_${user.id}`, 'true');
      return;
    }

    // 3. Lógica defensiva de usuario nuevo (deben cumplirse TODAS las condiciones juntas):
    // - El docente tiene exactamente 0 cátedras
    // - No existe marca en localStorage vinculada a su ID
    // - No tiene la marca en sus metadatos de Supabase
    // - No tiene marca previa de versión anterior
    const localCompleted = localStorage.getItem(`korum_onboarding_completed_${user.id}`);
    const legacyCompleted = localStorage.getItem('korum_onboarding_v1');
    const metadataCompleted = user.user_metadata?.onboarding_completed;

    if (
      (!catedras || catedras.length === 0) &&
      !localCompleted &&
      !metadataCompleted &&
      legacyCompleted !== 'completed' &&
      legacyCompleted !== 'skipped'
    ) {
      setIsOpen(true);
    }
  }, [appLoading, authLoading, user, catedras, forceOpen]);

  if (!isOpen) return null;

  const currentData = STEPS_DATA[currentStep - 1] || STEPS_DATA[0];

  /**
   * Persistencia atómica centralizada al omitir, cerrar o completar el onboarding
   */
  const handleDismissOnboarding = async (reason = 'skipped') => {
    if (user?.id) {
      // 1. Persistencia inmediata en cliente
      localStorage.setItem(`korum_onboarding_completed_${user.id}`, 'true');
      localStorage.setItem('korum_onboarding_v1', reason);

      // 2. Persistencia remota en Supabase User Metadata (no depende del navegador)
      try {
        if (isSupabaseConfigured && supabase) {
          await supabase.auth.updateUser({
            data: { onboarding_completed: true }
          });
        }
      } catch (err) {
        console.warn('No se pudo sincronizar el flag de onboarding en Supabase', err);
      }
    }
    setIsOpen(false);
    if (onClose) onClose();
  };

  const handleSkip = async () => {
    await handleDismissOnboarding('skipped');
    toast.info('Guía pospuesta. Puedes consultarla cuando desees desde la barra de soporte.');
  };

  const handleFinish = async () => {
    await handleDismissOnboarding('completed');
    toast.success('¡Bienvenido a Korum! Plataforma lista para tus cátedras.', {
      duration: 4500,
      icon: '🎉'
    });

    // Abrir automáticamente el modal para crear la primera cátedra
    if (setOpenNewCatedraModal) {
      setTimeout(() => {
        setOpenNewCatedraModal(true);
      }, 400);
    }
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      {/* Contenedor del Modal Bento Dark Enterprise */}
      <div 
        className="bg-[#0F172A] border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between animate-fadeInUp"
        role="dialog"
        aria-modal="true"
      >
        {/* Resplandor esmeralda superior de fondo */}
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Barra superior con Isotipo Korum y botón cerrar */}
        <div className="flex items-center justify-between relative z-10 mb-4">
          <div className="flex items-center gap-2.5">
            <img src="/dashboard.ico" alt="Korum" className="w-7 h-7 object-contain rounded-xl drop-shadow-xs" />
            <span className="text-xs font-bold font-mono uppercase tracking-widest text-emerald-400">
              Korum Onboarding
            </span>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            title="Cerrar guía"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ilustración Vectorial Nativa del Paso Actual */}
        <div className="relative z-10 my-2 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-center shadow-inner">
          <OnboardingStepIllustration step={currentStep} className="w-full h-40" />
        </div>

        {/* Textos y Explicación del Paso */}
        <div className="relative z-10 mt-4 space-y-2 text-center sm:text-left">
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-medium">
            {currentData.badge}
          </span>
          <h3 className="text-xl font-bold text-white tracking-tight">
            {currentData.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            {currentData.description}
          </p>
        </div>

        {/* Pie de navegación: Indicador de pasos y botones */}
        <div className="relative z-10 mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between gap-3">
          {/* Botón Izquierdo: Omitir o Anterior */}
          {currentStep === 1 ? (
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer font-medium px-2 py-1.5"
            >
              Omitir
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePrev}
              className="px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>
          )}

          {/* Indicadores de pasos (Dots) */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((stepNum) => (
              <button
                key={stepNum}
                type="button"
                onClick={() => setCurrentStep(stepNum)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentStep === stepNum
                    ? 'w-6 bg-emerald-500 shadow-sm shadow-emerald-500/50'
                    : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
                aria-label={`Ir al paso ${stepNum}`}
              />
            ))}
          </div>

          {/* Botón Derecho: Siguiente o Finalizar e Iniciar */}
          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/30 cursor-pointer"
            >
              <span>Siguiente</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-950/40 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Finalizar e Iniciar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
