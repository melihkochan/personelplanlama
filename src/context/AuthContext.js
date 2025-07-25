import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, logAuditEvent, updateUserOnlineStatus } from '../services/supabase';

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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error('Session error:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (usernameOrEmail, password) => {
    try {
      // Giriş animasyonunu başlat
      setIsLoggingIn(true);
      
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
      
      // Giriş başarılı animasyonu için 1 saniye bekle
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Audit log kaydet
      try {
        await logAuditEvent({
          userId: data.user?.id,
          userEmail: data.user?.email,
          userName: data.user?.user_metadata?.full_name || data.user?.email,
          action: 'LOGIN',
          tableName: 'auth',
          recordId: null,
          oldValues: null,
          newValues: { loginTime: new Date().toISOString() },
          ipAddress: null,
          userAgent: navigator.userAgent,
          details: `Kullanıcı giriş yaptı: ${data.user?.email}`
        });
      } catch (auditError) {
        console.error('Audit log hatası:', auditError);
      }

      // Online durumunu güncelle
      try {
        // Önce users tablosundan kullanıcıyı bul
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', data.user?.email)
          .single();
        
        if (!userError && userData) {
          console.log('🔄 Online durumu güncelleniyor:', userData.id);
          await updateUserOnlineStatus(userData.id, true);
        } else {
          console.error('❌ Users tablosunda kullanıcı bulunamadı:', data.user?.email);
        }
      } catch (onlineError) {
        console.error('Online durumu güncelleme hatası:', onlineError);
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoggingIn(false);
    }
  };

  const signOut = async () => {
    try {
      // Logout animasyonunu başlat
      setIsLoggingOut(true);
      
      // Mevcut kullanıcı bilgilerini sakla
      const currentUser = user;
      
      // Animasyon için 1.5 saniye bekle
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Vercel için güçlü logout
      
      // 1. Supabase'den çıkış yap
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        // Hata olsa bile devam et
      }
      
      // 2. Local state'i temizle
      setUser(null);
      
      // 3. URL'yi ana sayfaya yönlendir
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/');
      }
      
      // 3. Audit log kaydet
      try {
        await logAuditEvent({
          userId: currentUser?.id,
          userEmail: currentUser?.email,
          userName: currentUser?.user_metadata?.full_name || currentUser?.email,
          action: 'LOGOUT',
          tableName: 'auth',
          recordId: null,
          oldValues: null,
          newValues: { logoutTime: new Date().toISOString() },
          ipAddress: null,
          userAgent: navigator.userAgent,
          details: `Kullanıcı çıkış yaptı: ${currentUser?.email}`
        });
      } catch (auditError) {
        console.error('Audit log hatası:', auditError);
      }

      // Online durumunu güncelle
      try {
        // Önce users tablosundan kullanıcıyı bul
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', currentUser?.email)
          .single();
        
        if (!userError && userData) {
          console.log('🔄 Online durumu güncelleniyor (çıkış):', userData.id);
          await updateUserOnlineStatus(userData.id, false);
        } else {
          console.error('❌ Users tablosunda kullanıcı bulunamadı (çıkış):', currentUser?.email);
        }
      } catch (onlineError) {
        console.error('Online durumu güncelleme hatası:', onlineError);
      }
      
      // 3. Local storage'ı temizle
      try {
        localStorage.removeItem('sb-' + supabase.supabaseUrl.split('//')[1].split('.')[0] + '-auth-token');
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.clear();
      } catch (storageError) {
        // Storage temizleme hatası olsa bile devam et
      }
      
      return { success: true };
    } catch (error) {
      console.error('SignOut error:', error);
      // Hata olsa bile user'ı null yap
      setUser(null);
      return { success: false, error: error.message };
    } finally {
      setIsLoggingOut(false);
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user,
    isLoggingOut,
    isLoggingIn
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 