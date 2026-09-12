import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  // Consulta el perfil del usuario desde Supabase o mock en localStorage
  const fetchPerfil = async (currentUser) => {
    if (!currentUser) {
      setPerfil(null);
      return null;
    }

    if (!isSupabaseConfigured || !supabase || isDemo) {
      const savedDemoPerfil = localStorage.getItem('docentepro_demo_perfil');
      if (savedDemoPerfil) {
        try {
          const parsed = JSON.parse(savedDemoPerfil);
          setPerfil(parsed);
          return parsed;
        } catch (_) {}
      }
      // Por defecto en demo, rol superadmin para habilitar pruebas completas
      const defaultDemoPerfil = {
        id: currentUser.id,
        nombre: currentUser.user_metadata?.nombre || 'Prof. Emilio Martínez',
        email: currentUser.email || 'profesor.demo@docentepro.edu.ar',
        rol: 'superadmin',
        created_at: new Date().toISOString()
      };
      localStorage.setItem('docentepro_demo_perfil', JSON.stringify(defaultDemoPerfil));
      setPerfil(defaultDemoPerfil);
      return defaultDemoPerfil;
    }

    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (!error && data) {
        setPerfil(data);
        return data;
      } else if (error && error.code === 'PGRST116') {
        // Registro no existe aún: crearlo con rol docente por defecto
        const nuevoPerfil = {
          id: currentUser.id,
          nombre: currentUser.user_metadata?.nombre || currentUser.email?.split('@')[0] || '',
          email: currentUser.email || '',
          rol: currentUser.user_metadata?.rol === 'superadmin' ? 'superadmin' : 'docente'
        };
        const { data: created } = await supabase.from('perfiles').insert(nuevoPerfil).select().single();
        if (created) {
          setPerfil(created);
          return created;
        }
      }
    } catch (err) {
      console.warn('Error al consultar perfil de usuario:', err);
    }
    return null;
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // Verificar si hay sesión demo previa en localStorage
      const savedDemo = localStorage.getItem('docentepro_demo_user');
      if (savedDemo) {
        try {
          const parsed = JSON.parse(savedDemo);
          setUser(parsed);
          setIsDemo(true);
          fetchPerfil(parsed);
        } catch (_) {}
      }
      setLoading(false);
      return;
    }

    // Obtener sesión activa de Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      if (activeUser) {
        fetchPerfil(activeUser);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      if (activeUser) {
        fetchPerfil(activeUser);
      } else {
        setPerfil(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [isDemo]);

  // Iniciar sesión con Supabase Auth
  const signIn = async (email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase no está configurado. Revisa tu archivo .env o ingresa en Modo Demo.');
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  // Registro con Supabase Auth
  const signUp = async (email, password, nombre) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase no está configurado. Revisa tu archivo .env.');
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre }
      }
    });
    if (error) throw error;
    return data;
  };

  // Cerrar sesión
  const signOut = async () => {
    if (isDemo) {
      localStorage.removeItem('docentepro_demo_user');
      localStorage.removeItem('docentepro_demo_perfil');
      setUser(null);
      setPerfil(null);
      setIsDemo(false);
      return;
    }
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setPerfil(null);
  };

  // Modo Demo local (para probar inmediatamente la app sin backend configurado)
  const loginDemo = (nivelPreferido = 'TERCIARIO') => {
    const demoUser = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'profesor.demo@docentepro.edu.ar',
      user_metadata: {
        nombre: 'Prof. Emilio Martínez',
        nivel: nivelPreferido
      }
    };
    const demoPerfil = {
      id: demoUser.id,
      nombre: 'Prof. Emilio Martínez',
      email: demoUser.email,
      rol: 'superadmin',
      created_at: new Date().toISOString()
    };
    localStorage.setItem('docentepro_demo_user', JSON.stringify(demoUser));
    localStorage.setItem('docentepro_demo_perfil', JSON.stringify(demoPerfil));
    setUser(demoUser);
    setPerfil(demoPerfil);
    setIsDemo(true);
  };

  // Actualizar avatar del docente (persistido en user_metadata de Supabase y localStorage en Demo)
  const updateUserAvatar = async (avatarUrl) => {
    if (isDemo || !supabase) {
      const updated = {
        ...user,
        user_metadata: {
          ...user?.user_metadata,
          avatar_url: avatarUrl
        }
      };
      localStorage.setItem('docentepro_demo_user', JSON.stringify(updated));
      setUser(updated);
      return { data: { user: updated }, error: null };
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl }
      });
      if (error) throw error;
      if (data?.user) {
        setUser(data.user);
      }
      return { data, error: null };
    } catch (err) {
      console.error('Error updating user avatar:', err);
      return { error: err };
    }
  };

  // Función para alternar rol en Demo o forzar recarga de perfil
  const toggleDemoRole = () => {
    if (isDemo || !isSupabaseConfigured || !supabase) {
      const nuevoRol = perfil?.rol === 'superadmin' ? 'docente' : 'superadmin';
      const updated = { ...perfil, rol: nuevoRol };
      localStorage.setItem('docentepro_demo_perfil', JSON.stringify(updated));
      setPerfil(updated);
      return updated;
    }
  };

  const esSuperadmin = Boolean(perfil?.rol === 'superadmin');

  const value = {
    user,
    session,
    perfil,
    rol: perfil?.rol || 'docente',
    esSuperadmin,
    loading,
    isDemo,
    isSupabaseConfigured,
    signIn,
    signUp,
    signOut,
    loginDemo,
    updateUserAvatar,
    fetchPerfil,
    toggleDemoRole
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
