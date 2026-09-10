import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // Verificar si hay sesión demo previa en localStorage
      const savedDemo = localStorage.getItem('docentepro_demo_user');
      if (savedDemo) {
        try {
          const parsed = JSON.parse(savedDemo);
          setUser(parsed);
          setIsDemo(true);
        } catch (_) {}
      }
      setLoading(false);
      return;
    }

    // Obtener sesión activa de Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
      setUser(null);
      setIsDemo(false);
      return;
    }
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
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
    localStorage.setItem('docentepro_demo_user', JSON.stringify(demoUser));
    setUser(demoUser);
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

  const value = {
    user,
    session,
    loading,
    isDemo,
    isSupabaseConfigured,
    signIn,
    signUp,
    signOut,
    loginDemo,
    updateUserAvatar
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
