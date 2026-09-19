import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Check, Sparkles } from 'lucide-react';
import { OnboardingStepIllustration, KorumIsotypeSvg } from '../common/BrandIllustrations';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
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
  const { catedras, loading, setOpenNewCatedraModal } = useApp();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Apertura automática si el usuario no tiene cátedras y no ha completado el onboarding
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      setCurrentStep(1);
      return;
    }

    if (!loading && user) {
      const onboardingCompleted = localStorage.getItem('korum_onboarding_v1');
      if (!onboardingCompleted && (!catedras || catedras.length === 0)) {
        setIsOpen(true);
      }
    }
  }, [loading, user, catedras, forceOpen]);

  if (!isOpen) return null;

  const currentData = STEPS_DATA[currentStep - 1] || STEPS_DATA[0];

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('korum_onboarding_v1', 'skipped');
    handleClose();
    toast.info('Guía pospuesta. Puedes consultarla cuando desees desde la barra de soporte.');
  };

  const handleFinish = () => {
    localStorage.setItem('korum_onboarding_v1', 'completed');
    handleClose();
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
            <KorumIsotypeSvg className="w-7 h-7" />
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
