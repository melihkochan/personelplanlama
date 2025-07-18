import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error getting session:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (usernameOrEmail, password) => {
    try {
      let email = usernameOrEmail;
      
      // Eğer @ işareti yoksa kullanıcı adı olarak kabul et
      if (!usernameOrEmail.includes('@')) {
        // Users tablosundan username ile email'i bul
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('username', usernameOrEmail)
          .single();
        
        if (userError || !userData) {
          throw new Error('Kullanıcı bulunamadı');
        }
        
        email = userData.email;
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        // Email onayı hatası için özel mesaj
        if (error.message.includes('Email not confirmed')) {
          throw new Error(`Email onayı gerekli!\n\nÇözüm için:\n1. Supabase Dashboard → Authentication → Settings → Email Auth → "Confirm email" OFF yapın\n2. Veya: ${email} adresine gelen onay linkine tıklayın\n\nTeknik detay: ${error.message}`);
        }
        throw error;
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    console.log('🔐 AuthContext signOut çağrıldı');
    
    try {
      console.log('📡 Supabase auth.signOut() çağrılıyor...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Supabase signOut hatası:', error);
        throw error;
      }
      
      console.log('✅ Supabase signOut başarılı, user state temizleniyor');
      setUser(null);
      
      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext signOut error:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 