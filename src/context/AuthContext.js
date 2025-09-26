import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, logAuditEvent, updateUserOnlineStatus, checkPendingRegistration, cleanupOldSessions } from '../services/supabase';

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
  
  // Oturum zaman aşımı için state'ler
  const [showSessionTimeout, setShowSessionTimeout] = useState(false);
  const [sessionTimeoutCountdown, setSessionTimeoutCountdown] = useState(0);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  
  // Timeout referansları
  const sessionTimeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const countdownRef = useRef(null);
  const heartbeatRef = useRef(null);
  
  // Oturum zaman aşımı ayarları (dakika cinsinden)
  const SESSION_TIMEOUT_MINUTES = 5; // 5 dakika hareketsizlik
  const WARNING_BEFORE_TIMEOUT_MINUTES = 1; // 1 dakika önce uyarı
  const COUNTDOWN_SECONDS = 60; // 60 saniye geri sayım

  // Kullanıcı aktivitesini takip eden fonksiyon
  const resetSessionTimeout = () => {
    if (!user) return;
    
    // console.log('🔄 Oturum süresi sıfırlanıyor:', new Date().toLocaleTimeString());
    
    // Mevcut timeout'ları temizle
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    
    // Uyarı ve oturum kapatma timeout'larını ayarla
    warningTimeoutRef.current = setTimeout(() => {
      // console.log('⚠️ Uyarı modalı açılıyor:', new Date().toLocaleTimeString());
      setShowSessionTimeout(true);
      setSessionTimeoutCountdown(COUNTDOWN_SECONDS);
      
      // Geri sayım başlat
      countdownRef.current = setInterval(() => {
        setSessionTimeoutCountdown(prev => {
          if (prev <= 1) {
            // Süre doldu, oturumu kapat
            handleSessionExpired();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, (SESSION_TIMEOUT_MINUTES - WARNING_BEFORE_TIMEOUT_MINUTES) * 60 * 1000);
    
    sessionTimeoutRef.current = setTimeout(() => {
      // console.log('⏰ Oturum zaman aşımı:', new Date().toLocaleTimeString());
      handleSessionExpired();
    }, SESSION_TIMEOUT_MINUTES * 60 * 1000);
  };

  // Oturum zaman aşımı durumunda yapılacak işlemler
  const handleSessionExpired = async () => {
    setIsSessionExpired(true);
    setShowSessionTimeout(false);
    setSessionTimeoutCountdown(0);
    
    // Audit log kaydet
    try {
      await logAuditEvent({
        userId: user?.id,
        userEmail: user?.email,
        userName: user?.user_metadata?.full_name || user?.email,
        action: 'SESSION_TIMEOUT',
        tableName: 'auth',
        recordId: null,
        oldValues: null,
        newValues: { timeoutTime: new Date().toISOString() },
        ipAddress: null,
        userAgent: navigator.userAgent,
        details: `Oturum zaman aşımı: ${user?.email}`
      });
    } catch (auditError) {
      console.error('Audit log hatası:', auditError);
    }

    // Online durumunu güncelle
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', user?.email)
        .single();
      
      if (!userError && userData) {
        await updateUserOnlineStatus(userData.id, false);
      }
    } catch (onlineError) {
      console.error('Online durumu güncelleme hatası:', onlineError);
    }
    
    // Oturumu kapat
    await performSignOut();
  };

  // Kullanıcı aktivitesini yenile
  const extendSession = () => {
    setShowSessionTimeout(false);
    setSessionTimeoutCountdown(0);
    
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    
    resetSessionTimeout();
  };

  // Heartbeat - periyodik online durum güncelleme
  const startHeartbeat = () => {
    if (!user) return;
    
    heartbeatRef.current = setInterval(async () => {
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', user?.email)
          .single();
        
        if (!userError && userData) {
          await updateUserOnlineStatus(userData.id, true);
          // console.log('💓 Heartbeat - online durumu güncellendi:', new Date().toLocaleTimeString());
        }
        
        // Her 2 dakikada bir eski oturumları temizle
        if (Math.random() < 0.1) { // %10 ihtimalle
          await cleanupOldSessions();
        }
      } catch (error) {
        console.error('❌ Heartbeat hatası:', error);
      }
    }, 30000); // Her 30 saniyede bir
  };

  const stopHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  // Aktivite event listener'ları
  useEffect(() => {
    if (!user) return;
    
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'keydown', 'scroll', 'touchstart', 'click', 'focus', 'blur', 'resize'];
    
    const handleActivity = () => {
      resetSessionTimeout();
    };
    
    // Tarayıcı kapatma olayları
    const handleBeforeUnload = async (event) => {
      // console.log('🚪 Tarayıcı kapatılıyor, online durumu güncelleniyor...');
      
      // Online durumunu false yap
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', user?.email)
          .single();
        
        if (!userError && userData) {
          await updateUserOnlineStatus(userData.id, false);
        }
      } catch (error) {
        console.error('❌ Tarayıcı kapatma sırasında online durumu güncelleme hatası:', error);
      }
    };
    
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // console.log('👁️ Sayfa gizlendi, online durumu güncelleniyor...');
        
        // Online durumunu false yap
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('email', user?.email)
            .single();
          
          if (!userError && userData) {
            await updateUserOnlineStatus(userData.id, false);
          }
        } catch (error) {
          console.error('❌ Sayfa gizleme sırasında online durumu güncelleme hatası:', error);
        }
      } else {
        // console.log('👁️ Sayfa görünür oldu, online durumu güncelleniyor...');
        
        // Online durumunu true yap
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('email', user?.email)
            .single();
          
          if (!userError && userData) {
            await updateUserOnlineStatus(userData.id, true);
          }
        } catch (error) {
          console.error('❌ Sayfa görünür olma sırasında online durumu güncelleme hatası:', error);
        }
      }
    };
    
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });
    
    // Tarayıcı kapatma olayları
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // İlk timeout'u başlat
    resetSessionTimeout();
    
    // Heartbeat'i başlat
    startHeartbeat();
    
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [user]);

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
      let isUsername = false;
      
      // Eğer @ işareti yoksa kullanıcı adı olarak kabul et
      if (!usernameOrEmail.includes('@')) {
        isUsername = true;
        
        // Önce pending registration kontrolü yap
        const pendingCheck = await checkPendingRegistration(usernameOrEmail);
        if (pendingCheck.success && pendingCheck.hasPendingRegistration) {
          return { 
            success: false, 
            error: '🎯 İsteğiniz admin onayında bekliyor. Onaylandıktan sonra giriş yapabilirsiniz.',
            hasPendingRegistration: true 
          };
        }
        
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
        // Önce eski oturumları temizle
        await cleanupOldSessions();
        
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

  const performSignOut = async () => {
    try {
      // Mevcut kullanıcı bilgilerini sakla
      const currentUser = user;
      
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
      
      // 4. Audit log kaydet
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
      
      // 5. Local storage'ı temizle
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
    }
  };

  const signOut = async () => {
    try {
      // Logout animasyonunu başlat
      setIsLoggingOut(true);
      
      // Animasyon için 1.5 saniye bekle
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Oturumu kapat
      await performSignOut();
      
      return { success: true };
    } catch (error) {
      console.error('SignOut error:', error);
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
    isLoggingIn,
    showSessionTimeout,
    sessionTimeoutCountdown,
    isSessionExpired,
    extendSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 