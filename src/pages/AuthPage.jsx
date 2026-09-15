import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import ThemeToggle from '../components/common/ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, signIn, signUp, enterDemoMode } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Asegurar que tras la validación de la sesión no quede colgado en pantallas de login intermedias
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase no está configurado en las variables de entorno.');
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      if (error) throw error;
    } catch (err) {
      console.error('Google Auth error:', err);
      setErrorMsg(err.message || 'Error al conectar con Google.');
    }
  };

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
              <span className="text-xl font-bold tracking-tight">Planilla<span className="text-blue-300">Docente</span></span>
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
          <span>© 2026 PlanillaDocente • Arquitectura Segura con Supabase RLS</span>
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>PostgreSQL Relational</span>
          </div>
        </div>
      </div>

      {/* Right side: Login / Signup Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md space-y-6">
          {/* Mobile brand header */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-bold text-text-primary">Planilla<span className="text-primary">Docente</span></span>
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
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Supabase no configurado en .env</span>
                <span className="text-[11px]">Verifica las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.</span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-danger/10 border border-danger/30 text-danger text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2">
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
                {isLogin ? 'Ingresar a PlanillaDocente' : 'Registrarme'}
              </Button>
            </form>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-surface-border" />
              <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">o continúa con</span>
              <div className="flex-1 h-px bg-surface-border" />
            </div>

            {/* Google OAuth Button below Ingresar a PlanillaDocente */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-surface-border bg-surface hover:bg-surface-hover text-text-primary text-xs font-semibold shadow-xs transition-all touch-target-44 cursor-pointer hover:border-text-muted/40"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Continuar con Google</span>
            </button>

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
                className="font-bold text-primary hover:underline cursor-pointer"
              >
                {isLogin ? 'Crear cuenta' : 'Iniciar sesión'}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
