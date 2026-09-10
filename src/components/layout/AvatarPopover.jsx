import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  User, 
  Settings, 
  Camera, 
  LogOut, 
  Check, 
  Sparkles, 
  Upload, 
  X,
  ShieldCheck,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { uploadCatedraFile } from '../../lib/supabase';
import Modal from '../common/Modal';
import Button from '../common/Button';

// 6 Avatares ilustrados estilizados con diferentes paletas y temáticas docentes
export const PRESET_AVATARS = [
  {
    id: 'avatar-1',
    label: 'Profesor Titular',
    bgColor: 'bg-blue-600',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        <circle cx="32" cy="32" r="32" fill="#2563eb" />
        <circle cx="32" cy="24" r="12" fill="#fed7aa" />
        <path d="M20 20c0-6.627 5.373-12 12-12s12 5.373 12 12v3H20v-3z" fill="#1e293b" />
        <rect x="23" y="22" width="7" height="4" rx="1.5" stroke="#1e293b" strokeWidth="1.5" />
        <rect x="34" y="22" width="7" height="4" rx="1.5" stroke="#1e293b" strokeWidth="1.5" />
        <line x1="30" y1="24" x2="34" y2="24" stroke="#1e293b" strokeWidth="1.5" />
        <path d="M14 56c0-9.941 8.059-18 18-18s18 8.059 18 18" fill="#1e3a8a" />
        <polygon points="32,38 35,46 32,54 29,46" fill="#f8fafc" />
      </svg>
    )
  },
  {
    id: 'avatar-2',
    label: 'Profesora Ciencias',
    bgColor: 'bg-emerald-600',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        <circle cx="32" cy="32" r="32" fill="#059669" />
        <circle cx="32" cy="25" r="12" fill="#fcd34d" />
        <path d="M18 19c0-6 6-11 14-11s14 5 14 11v8c0 4-2 7-6 8h-16c-4-1-6-4-6-8v-8z" fill="#475569" />
        <circle cx="32" cy="25" r="11" fill="#fde68a" />
        <circle cx="27" cy="24" r="1.5" fill="#0f172a" />
        <circle cx="37" cy="24" r="1.5" fill="#0f172a" />
        <path d="M28 29c1.5 1.5 6.5 1.5 8 0" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14 56c0-9.941 8.059-18 18-18s18 8.059 18 18" fill="#047857" />
        <path d="M30 38l2 8 2-8" stroke="#f8fafc" strokeWidth="2" />
      </svg>
    )
  },
  {
    id: 'avatar-3',
    label: 'Docente Humanidades',
    bgColor: 'bg-purple-600',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        <circle cx="32" cy="32" r="32" fill="#7c3aed" />
        <circle cx="32" cy="24" r="12" fill="#ffedd5" />
        <path d="M19 19c2-7 8-10 13-10s11 3 13 10c0 0-4 1-8-2-4 3-8 1-10 0-4 1-8 2-8 2z" fill="#78350f" />
        <rect x="23" y="21" width="8" height="5" rx="2" stroke="#451a03" strokeWidth="1.5" />
        <rect x="33" y="21" width="8" height="5" rx="2" stroke="#451a03" strokeWidth="1.5" />
        <line x1="31" y1="23.5" x2="33" y2="23.5" stroke="#451a03" strokeWidth="1.5" />
        <path d="M14 56c0-9.941 8.059-18 18-18s18 8.059 18 18" fill="#581c87" />
        <circle cx="32" cy="46" r="3" fill="#cbd5e1" />
      </svg>
    )
  },
  {
    id: 'avatar-4',
    label: 'Catedrático Senior',
    bgColor: 'bg-amber-600',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        <circle cx="32" cy="32" r="32" fill="#d97706" />
        <circle cx="32" cy="24" r="12" fill="#fde68a" />
        <path d="M20 16c2-5 7-8 12-8s10 3 12 8v2H20v-2z" fill="#e2e8f0" />
        <path d="M26 30c2 2 10 2 12 0" fill="none" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
        <circle cx="27" cy="23" r="1.5" fill="#451a03" />
        <circle cx="37" cy="23" r="1.5" fill="#451a03" />
        <path d="M14 56c0-9.941 8.059-18 18-18s18 8.059 18 18" fill="#b45309" />
        <polygon points="32,38 34,44 32,50 30,44" fill="#fbbf24" />
      </svg>
    )
  },
  {
    id: 'avatar-5',
    label: 'Investigador Tecnológico',
    bgColor: 'bg-cyan-600',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        <circle cx="32" cy="32" r="32" fill="#0891b2" />
        <circle cx="32" cy="24" r="12" fill="#ffedd5" />
        <path d="M19 18c2-6 7-9 13-9s11 3 13 9c-2 2-6 1-9-1-3 2-7 1-10 0-3 1-5 1-7 0z" fill="#0f172a" />
        <circle cx="28" cy="24" r="2" fill="#0284c7" />
        <circle cx="36" cy="24" r="2" fill="#0284c7" />
        <path d="M29 30c1.5 1 4.5 1 6 0" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14 56c0-9.941 8.059-18 18-18s18 8.059 18 18" fill="#164e63" />
        <rect x="29" y="42" width="6" height="14" fill="#38bdf8" rx="1" />
      </svg>
    )
  },
  {
    id: 'avatar-6',
    label: 'Coordinadora Académica',
    bgColor: 'bg-rose-600',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        <circle cx="32" cy="32" r="32" fill="#e11d48" />
        <circle cx="32" cy="25" r="12" fill="#fed7aa" />
        <path d="M17 19c0-6 6-11 15-11s15 5 15 11v11c0 3-1 6-4 7h-22c-3-1-4-4-4-7V19z" fill="#1e1b4b" />
        <circle cx="32" cy="25" r="11" fill="#fed7aa" />
        <circle cx="27" cy="24" r="1.5" fill="#1e1b4b" />
        <circle cx="37" cy="24" r="1.5" fill="#1e1b4b" />
        <path d="M28 29c1.5 1.5 6.5 1.5 8 0" stroke="#be123c" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14 56c0-9.941 8.059-18 18-18s18 8.059 18 18" fill="#9f1239" />
        <circle cx="32" cy="44" r="3" fill="#fecdd3" />
      </svg>
    )
  }
];

export default function AvatarPopover({ isOpen, onClose, anchorRef }) {
  const navigate = useNavigate();
  const { user, isDemo, signOut, updateUserAvatar } = useAuth();
  const popoverRef = useRef(null);
  const fileInputRef = useRef(null);

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const currentAvatar = user?.user_metadata?.avatar_url || 'preset:avatar-1';

  // Cerrar popover al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(e.target) &&
        (!anchorRef?.current || !anchorRef.current.contains(e.target))
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, anchorRef]);

  // Manejo de selección de avatar ilustrado
  const handleSelectPreset = async (presetId) => {
    const avatarKey = `preset:${presetId}`;
    try {
      const res = await updateUserAvatar(avatarKey);
      if (res?.error) throw res.error;
      toast.success('Avatar actualizado con éxito');
      setIsAvatarModalOpen(false);
      onClose();
    } catch (err) {
      toast.error('Error al actualizar avatar: ' + (err.message || err));
    }
  };

  // Manejo de subida de imagen personalizada
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validación básica de imagen
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 5 MB.');
      return;
    }

    setUploading(true);
    try {
      if (isDemo || !user?.id) {
        // En modo demo creamos una URL de datos persistida localmente
        const reader = new FileReader();
        reader.onloadend = async () => {
          await updateUserAvatar(reader.result);
          setUploading(false);
          setIsAvatarModalOpen(false);
          onClose();
          toast.success('Foto de perfil actualizada (Modo Demo)');
        };
        reader.readAsDataURL(file);
        return;
      }

      // Subida real a Supabase Storage en el bucket 'archivos-docentes'
      const { publicUrl, error } = await uploadCatedraFile(user.id, 'avatars', file);
      if (error) throw error;

      await updateUserAvatar(publicUrl);
      toast.success('¡Foto de perfil subida y guardada en Supabase!');
      setIsAvatarModalOpen(false);
      onClose();
    } catch (err) {
      console.error('Error uploading avatar:', err);
      toast.error('Error al subir imagen: ' + (err.message || 'Verifica las políticas de Storage'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const teacherName = user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Docente';
  const teacherEmail = user?.email || 'profesor@docentepro.edu.ar';

  return (
    <>
      <div
        ref={popoverRef}
        className="fixed left-4 right-4 sm:left-20 sm:right-auto bottom-20 md:bottom-4 z-[9999] w-auto sm:w-80 bg-white dark:bg-[#0c1222] border-2 border-primary/40 dark:border-primary/50 rounded-2xl shadow-2xl shadow-black/25 dark:shadow-black/70 ring-1 ring-black/10 dark:ring-white/10 p-3 animate-fadeIn text-text-primary origin-bottom-left"
      >
        {/* Cabecera del usuario con alto contraste */}
        <div className="p-3 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 flex items-center gap-3 mb-2">
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-primary/30 flex items-center justify-center shadow-xs">
              {currentAvatar?.startsWith('preset:') ? (
                PRESET_AVATARS.find(a => `preset:${a.id}` === currentAvatar)?.svg || (
                  <User className="w-6 h-6 text-primary" />
                )
              ) : currentAvatar?.startsWith('data:') || currentAvatar?.startsWith('http') ? (
                <img src={currentAvatar} alt={teacherName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-primary" />
              )}
            </div>
            {/* Halo activo online */}
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-text-primary truncate block">
                {teacherName}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            </div>
            <p className="text-[11px] text-text-muted truncate font-mono">
              {teacherEmail}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-primary font-semibold mt-0.5">
              <ShieldCheck className="w-3 h-3" />
              <span>{isDemo ? 'Sesión Demo Activa' : 'Cuenta Verificada'}</span>
            </div>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="p-1 space-y-1">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/configuracion');
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-text-secondary hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
          >
            <User className="w-4 h-4 text-text-muted" />
            <span>Ver Perfil & Períodos</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/configuracion');
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl text-text-secondary hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
          >
            <Settings className="w-4 h-4 text-text-muted" />
            <span>Ajustes de Cuenta & Temas</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAvatarModalOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl text-text-secondary hover:text-primary hover:bg-primary/5 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Camera className="w-4 h-4 text-primary" />
              <span className="font-semibold text-primary">Seleccionar Avatar</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
              Personalizar
            </span>
          </button>
        </div>

        {/* Separador y Salida */}
        <div className="p-1 border-t border-slate-200 dark:border-slate-800 mt-1">
          <button
            type="button"
            onClick={() => {
              onClose();
              signOut();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Modal para Selección y Carga de Avatar */}
      <Modal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        title="Personaliza tu Avatar Docente"
        subtitle="Elige entre avatares ilustrados o sube tu propia fotografía a Supabase"
      >
        <div className="space-y-6">
          {/* 1. Avatares Ilustrados */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted block mb-3">
              Avatares Ilustrados Disponibles
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {PRESET_AVATARS.map((preset) => {
                const isSelected = currentAvatar === `preset:${preset.id}`;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`
                      relative p-1 rounded-2xl flex flex-col items-center gap-1.5 transition-all
                      hover:scale-105 group
                      ${isSelected ? 'ring-3 ring-primary bg-primary/10' : 'hover:bg-surface-hover'}
                    `}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden shadow-xs">
                      {preset.svg}
                    </div>
                    <span className="text-[10px] font-medium text-text-secondary text-center truncate max-w-[70px]">
                      {preset.label.split(' ')[0]}
                    </span>
                    {isSelected && (
                      <span className="absolute top-0 right-0 p-0.5 bg-primary text-white rounded-full shadow-xs">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Subir Fotografía Personal */}
          <div className="p-4 rounded-2xl border border-surface-border bg-surface-hover/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-text-primary">Subir Fotografía Propia</span>
              </div>
              <span className="text-[10px] text-text-muted font-mono">PNG, JPG o WebP</span>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Tu foto se almacenará de manera segura en el bucket docente de Supabase Storage y se sincronizará en todos tus dispositivos.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileUpload}
              className="hidden"
            />

            <Button
              variant="outline"
              icon={Upload}
              loading={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-xs"
            >
              {uploading ? 'Subiendo imagen a Supabase...' : 'Seleccionar Imagen desde el Equipo'}
            </Button>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => setIsAvatarModalOpen(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
