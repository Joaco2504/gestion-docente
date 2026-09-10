import React, { useState } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle,
  Sparkles,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

export default function AuthPage() {
  const { signIn, signUp, enterDemoMode } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
      } else {
        if (!nombre.trim()) {
          throw new Error('Por favor ingresa tu nombre y apellido.');
        }
        const { error } = await signUp(email, password, nombre.trim());
        if (error) throw error;
        setSuccessMsg('¡Cuenta creada! Revisa tu correo si tienes confirmación activada o inicia sesión.');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setErrorMsg(err.message || 'Ocurrió un error con la autenticación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-canvas">
      {/* Left side: Brand Showcase (Hidden on small screens) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0d07a8] text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative subtle patterns */}
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-primary/30 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-blue-400/20 blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight">Docente<span className="text-blue-300">Pro</span></span>
              <span className="block text-[10px] uppercase font-mono tracking-widest text-blue-200">
                Gestión Administrativa Docente
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 my-auto py-12 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-blue-200 mb-6 border border-white/15">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>Diseñado para Docentes de Nivel Secundario y Terciario</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight text-white mb-4">
            Control administrativo absoluto de tus cátedras, asistencias y notas.
          </h1>
          <p className="text-blue-100/90 text-sm leading-relaxed mb-8">
            Sin burocracia pedagógica innecesaria. Una plataforma de alto rendimiento para importar listas de alumnos por Excel, registrar asistencias en segundos y calcular condiciones finales de forma reglamentaria.
          </p>

          <div className="space-y-3.5">
            <div className="flex items-center gap-3 text-sm text-blue-50">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              </div>
              <span>Cálculo automático de regularidades y promociones sin sobreescribir notas.</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-blue-50">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              </div>
              <span>Importación veloz de nóminas desde archivos Excel (.xlsx) y CSV.</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-blue-50">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4 text-emerald-300" />
              </div>
              <span>Múltiples instituciones y ciclos lectivos organizados en un solo lugar.</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-white/15 text-xs text-blue-200/80 flex items-center justify-between">
          <span>© 2026 DocentePro • Arquitectura Segura con Supabase RLS</span>
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>PostgreSQL Relational</span>
          </div>
        </div>
      </div>

      {/* Right side: Login / Signup Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile brand header */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-bold text-text-primary">Docente<span className="text-primary">Pro</span></span>
              <span className="block text-[10px] uppercase font-mono tracking-widest text-text-muted">
                Gestión Docente
              </span>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-text-primary tracking-tight">
              {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta Docente'}
            </h2>
            <p className="text-xs text-text-muted mt-1">
              {isLogin 
                ? 'Ingresa tus credenciales para acceder a tus instituciones y cátedras.' 
                : 'Regístrate para comenzar a administrar tus cursos y estudiantes.'}
            </p>
          </div>

          {/* Supabase status pill */}
          {!isSupabaseConfigured && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Supabase no configurado en .env</span>
                <span className="text-[11px]">Puedes probar la aplicación completa inmediatamente haciendo clic en el botón de demostración local.</span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-danger text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <Card className="p-6 shadow-sm border border-surface-border">
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Nombre y Apellido *
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Prof. Emilio Martínez"
                    className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    required={!isLogin}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="docente@instituto.edu.ar"
                  className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Contraseña *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm font-mono border border-surface-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="w-full mt-2"
                icon={ArrowRight}
              >
                {isLogin ? 'Ingresar a DocentePro' : 'Registrarme'}
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t border-surface-border flex items-center justify-between text-xs">
              <span className="text-text-muted">
                {isLogin ? '¿No tienes cuenta aún?' : '¿Ya estás registrado?'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="font-bold text-primary hover:underline"
              >
                {isLogin ? 'Crear cuenta' : 'Iniciar sesión'}
              </button>
            </div>
          </Card>

          {/* Quick Demo Access */}
          <div className="p-4 bg-surface rounded-xl border border-dashed border-primary/40 text-center space-y-2">
            <span className="text-xs font-semibold text-text-primary block">
              ¿Quieres probar el sistema sin registrarte?
            </span>
            <p className="text-[11px] text-text-muted">
              Inicia sesión instantáneamente con datos de muestra (Cátedras, Estudiantes, Calificaciones y Asistencias precargadas).
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={enterDemoMode}
              className="w-full border-primary/40 text-primary hover:bg-primary/5"
            >
              🚀 Ingresar en Modo Demo Local
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
