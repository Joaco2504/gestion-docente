import React from 'react';
import { 
  ShieldAlert, 
  Users, 
  Activity, 
  Radio, 
  Sliders, 
  Lock, 
  CheckCircle2, 
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import RealtimeSwitchboard from '../components/admin/RealtimeSwitchboard';
import TeachersDirectory from '../components/admin/TeachersDirectory';
import { useAuth } from '../context/AuthContext';
import { useSystemConfig } from '../context/SystemConfigContext';

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, isDemo, toggleDemoRole, esSuperadmin, rol } = useAuth();
  const { modoMantenimiento, bannerActivo, isRealtimeConnected } = useSystemConfig();

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* 1. Header Bento & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver al Dashboard</span>
            </button>
            <span className="text-text-muted">•</span>
            <span className="text-xs font-mono font-bold text-primary">Zona de Gestión Central</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-text-primary">
                Panel de Superadministrador
              </h1>
              <p className="text-xs text-text-muted">
                Control en tiempo real de la plataforma, directorio general y herramientas de soporte docente
              </p>
            </div>
          </div>
        </div>

        {/* Action / Demo switcher pill */}
        <div className="flex items-center gap-2 self-start md:self-center">
          {isDemo && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs">
              <span className="text-amber-700 dark:text-amber-400 font-semibold text-[11px]">
                Modo Demo: Rol <strong>{rol}</strong>
              </span>
              <button
                type="button"
                onClick={toggleDemoRole}
                className="px-2 py-1 bg-amber-500 text-white rounded-lg font-bold text-[10px] hover:bg-amber-600 transition-colors cursor-pointer"
                title="Alternar entre rol Superadmin y Docente para probar la protección"
              >
                Alternar Rol
              </button>
            </div>
          )}

          <div className="px-3 py-1.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-bold flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>Ruta Protegida /admin</span>
          </div>
        </div>
      </div>

      {/* 2. Bento Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Estado del Sistema */}
        <Card className="p-4 border border-surface-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Estado Operativo
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              modoMantenimiento ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            }`}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-black text-text-primary block">
              {modoMantenimiento ? 'Mantenimiento' : 'Producción Activa'}
            </span>
            <span className="text-[11px] text-text-muted">
              {modoMantenimiento ? 'Acceso restringido / Alerta visible' : 'Servicios funcionando con normalidad'}
            </span>
          </div>
        </Card>

        {/* Card 2: Aviso Global */}
        <Card className="p-4 border border-surface-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Aviso en Vivo
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              bannerActivo ? 'bg-primary/15 text-primary' : 'bg-surface-hover text-text-muted'
            }`}>
              <Radio className={`w-4 h-4 ${bannerActivo ? 'animate-pulse' : ''}`} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-black text-text-primary block">
              {bannerActivo ? 'Banner Transmitiendo' : 'Sin Aviso Activo'}
            </span>
            <span className="text-[11px] text-text-muted">
              {bannerActivo ? 'Visible en todas las sesiones docentes' : 'Cintillo superior desactivado'}
            </span>
          </div>
        </Card>

        {/* Card 3: WebSocket Realtime */}
        <Card className="p-4 border border-surface-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Canal Realtime
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isRealtimeConnected ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-black text-text-primary block">
              {isRealtimeConnected ? 'Conectado (WS)' : 'Polling / Local'}
            </span>
            <span className="text-[11px] text-text-muted">
              Canal: <code>config-realtime</code>
            </span>
          </div>
        </Card>

        {/* Card 4: Seguridad & RLS */}
        <Card className="p-4 border border-surface-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Seguridad RLS
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-black text-text-primary block">
              Superadmin Nivel 1
            </span>
            <span className="text-[11px] text-text-muted font-mono truncate block">
              {user?.email}
            </span>
          </div>
        </Card>
      </div>

      {/* 3. Panel A: Realtime Switchboard */}
      <RealtimeSwitchboard />

      {/* 4. Panel B: Directorio Global de Docentes & Soporte */}
      <TeachersDirectory isDemo={isDemo} />

    </div>
  );
}
