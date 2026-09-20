import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import ThemeToggle from '../components/common/ThemeToggle';
import WaveAnimatedInput from '../components/auth/WaveAnimatedInput';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { handleAppError } from '../utils/handleAppError';
import { procesarErrorDocente } from '../utils/errorCodes';
import { toast } from 'sonner';

const getFriendlyAuthError = (err) => {
  const msg = (err?.message || '').toLowerCase();
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (msg.includes('user already registered') || msg.includes('already exists')) {
    return 'Este correo electrónico ya se encuentra registrado.';
  }
  if (msg.includes('password should be at least')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Por favor confirma tu dirección de correo electrónico.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Demasiados intentos. Por favor espera unos minutos antes de reintentar.';
  }
  if (err?.message && !err.message.includes('relation') && !err.message.includes('column') && !err.message.includes('select') && !err.message.includes('insert') && !err.message.includes('sql') && !err.message.includes('postgres') && !err.message.includes('schema')) {
    return err.message;
  }
  const info = procesarErrorDocente(err);
  return `${info.mensaje} (${info.codigo})`;
};

export default function Login() {
  const navigate = useNavigate();
  const { user, signIn, signUp, enterDemoMode } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [heroBgUrl, setHeroBgUrl] = useState('/brand/login-hero.png');

  // Fallback reactivo si la imagen login-hero tiene extensión .webp o .jpg
  useEffect(() => {
    const testImg = new Image();
    testImg.src = '/brand/login-hero.png';
    testImg.onerror = () => {
      const testWebp = new Image();
      testWebp.src = '/brand/login-hero.webp';
      testWebp.onload = () => setHeroBgUrl('/brand/login-hero.webp');
      testWebp.onerror = () => {
        setHeroBgUrl('/brand/login-hero.jpg');
      };
    };
  }, []);

  // Notificar al usuario si la sesión anterior caducó por seguridad
  useEffect(() => {
    try {
      const expiredNotice = sessionStorage.getItem('auth_expired_notice');
      if (expiredNotice) {
        sessionStorage.removeItem('auth_expired_notice');
        toast.info('Tu sesión ha caducado por seguridad. Por favor, ingresa nuevamente.');
      }
    } catch (_) {}
  }, []);

  // Redirigir al dashboard si ya está autenticado
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Capturar errores devueltos por Supabase OAuth en el hash o query params
  useEffect(() => {
    try {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash.includes('error=') || search.includes('error=')) {
        const params = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : search);
        const errDesc = params.get('error_description') || params.get('error');
        if (errDesc) {
          setErrorMsg(decodeURIComponent(errDesc.replace(/\+/g, ' ')));
        }
      }
    } catch (_) {}
  }, []);

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase no está configurado en las variables de entorno.');
      }
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } catch (err) {
      const info = handleAppError(err, 'Login / Google Auth', null, { mostrarToast: false });
      const friendly = getFriendlyAuthError(err) || info.mensaje;
      setErrorMsg(friendly);
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
      const info = handleAppError(err, 'Login / Form Submit', null, { mostrarToast: false });
      const friendly = getFriendlyAuthError(err) || info.mensaje;
      setErrorMsg(friendly);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = () => {
    enterDemoMode();
    toast.success('Accediendo en Modo Demostración de Korum');
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen bg-[#0B0F19]">
      {/* ===================================================================
          COLUMNA IZQUIERDA: ACCESO DOCENTE (FORMULARIO)
          =================================================================== */}
      <div className="flex flex-col justify-between p-6 sm:p-12 md:p-16 relative z-10">
        {/* Barra superior con toggle de tema o enlaces rápidos */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Korum Node v2.0
            </span>
          </div>
          <ThemeToggle />
        </div>

        {/* Contenedor central del formulario */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          {/* Encabezado con Isotipo Korum, título y subtítulo */}
          <div className="mb-8 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start">
              <img 
                src="/dashboard.ico" 
                alt="Korum" 
                className="w-12 h-12 object-contain rounded-2xl mb-3 shadow-lg shadow-emerald-950/30" 
              />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center sm:justify-start gap-2">
              Korum
            </h1>
            <p className="text-sm text-slate-400 mt-1.5 font-medium">
              Gestión Académica y Actas Reglamentarias
            </p>
          </div>

          {/* Advertencia si falta Supabase */}
          {!isSupabaseConfigured && (
            <div className="mb-5 p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-amber-300">Supabase no configurado en .env</span>
                <span className="text-[11px] text-amber-400/90">
                  Puedes ingresar utilizando el <strong>Modo Demostración</strong> interactivo.
                </span>
              </div>
            </div>
          )}

          {/* Mensajes de error o éxito */}
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Formulario de Credenciales con estilo oscuro elegante y onda de letras */}
          <form onSubmit={handleSubmit} className="space-y-2">
            {!isLogin && (
              <WaveAnimatedInput
                label="Nombre y Apellido"
                type="text"
                name="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            )}

            <WaveAnimatedInput
              label="Correo Electrónico"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="relative">
              <WaveAnimatedInput
                label="Contraseña"
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              {isLogin && (
                <div className="text-right -mt-2 mb-3">
                  <span className="text-[11px] text-slate-400 hover:text-emerald-400 cursor-pointer transition-colors">
                    ¿Olvidaste tu clave?
                  </span>
                </div>
              )}
            </div>

            {/* Botón de acceso con estética esmeralda */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl h-11 transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Ingresar a Korum' : 'Crear Cuenta Docente'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Alternar entre Login y Registro */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className="text-xs text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer font-medium"
            >
              {isLogin
                ? '¿Aún no tienes cuenta? Regístrate aquí'
                : '¿Ya tienes una cuenta activa? Inicia sesión'}
            </button>
          </div>

          {/* Separador */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0B0F19] px-3 text-slate-500 font-mono text-[10px]">
                O continuar con
              </span>
            </div>
          </div>

          {/* Acciones Secundarias: Google y Demo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="h-10 px-3 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/80 text-slate-300 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                />
              </svg>
              <span>Google Workspace</span>
            </button>

            <button
              type="button"
              onClick={handleDemoAccess}
              className="h-10 px-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 hover:text-emerald-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Modo Demostración</span>
            </button>
          </div>
        </div>

        {/* Pie de página izquierdo */}
        <div className="w-full max-w-md mx-auto pt-6 border-t border-slate-900 text-center sm:text-left flex items-center justify-between text-[11px] text-slate-500">
          <span>© 2026 Korum Platform</span>
          <div className="flex items-center gap-1.5 text-emerald-500/80 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>RLS PostgreSQL</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* COLUMNA DERECHA: PANEL INMERSIVO KORUM (FULL-BLEED BACKGROUND) */}
      {/* ========================================================= */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 xl:p-14 overflow-hidden border-l border-slate-800/80 bg-[#080C14]">
        
        {/* 1. Imagen de Fondo a Pantalla Completa (Cubre el 100% del contenedor) */}
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat pointer-events-none transition-transform duration-1000 ease-out hover:scale-105"
          style={{ backgroundImage: `url('${heroBgUrl}')` }}
        />

        {/* 2. Filtro / Overlay de Gradiente para Garantizar Contraste y Fusión */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080C14] via-[#080C14]/40 to-[#080C14]/30 pointer-events-none" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-[#080C14]/70 pointer-events-none" />

        {/* 3. Badge Institucional Superior (Montado sobre z-10) */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 shadow-lg">
            <img src="/dashboard.ico" alt="Korum" className="w-5 h-5 rounded-md" />
            <span className="text-xs font-mono font-medium text-slate-200 tracking-wider uppercase">
              Korum Suite Académica
            </span>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 backdrop-blur-md">
            v2.6 Operativa
          </span>
        </div>

        {/* 4. Cita / Manifiesto Institucional Inferior (Montado sobre z-10) */}
        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Rigor Reglamentario & Exactitud Algorítmica
          </div>
          <h2 className="text-2xl xl:text-3xl font-bold text-white tracking-tight leading-snug drop-shadow-md">
            Certeza matemática, actas oficiales y transparencia en cada cátedra.
          </h2>
          <p className="text-xs xl:text-sm text-slate-300 mt-2.5 leading-relaxed drop-shadow">
            Plataforma de gestión docente integral con cálculo automatizado de regularidades, actas volantes de examen y portal de consulta directa por DNI.
          </p>
        </div>

      </div>
    </div>
  );
}
