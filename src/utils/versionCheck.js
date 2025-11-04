// Uygulama versiyonu - package.json'dan alınmalı
export const APP_VERSION = '1.0.1';

// Versiyon kontrolü - eski versiyonda olanları tespit et ve logout et
export const checkVersion = () => {
  const storedVersion = localStorage.getItem('app-version');
  
  // Versiyon yoksa veya eski versiyondaysa
  if (!storedVersion || storedVersion !== APP_VERSION) {
    // Eski versiyonu temizle
    localStorage.removeItem('app-version');
    localStorage.removeItem('sb-auth-token');
    localStorage.removeItem('supabase.auth.token');
    sessionStorage.clear();
    
    return {
      isValid: false,
      currentVersion: APP_VERSION,
      storedVersion: storedVersion || 'yok'
    };
  }
  
  return {
    isValid: true,
    currentVersion: APP_VERSION,
    storedVersion: storedVersion
  };
};

// Versiyonu kaydet
export const saveVersion = () => {
  localStorage.setItem('app-version', APP_VERSION);
};

// Version check utility for cache busting (eski kullanım - geriye uyumluluk için)
export const checkForUpdates = () => {
  const versionCheck = checkVersion();
  
  if (!versionCheck.isValid) {
    // Yeni versiyonu kaydet
    saveVersion();
    // Sayfayı yenile
    window.location.reload();
    return true;
  }
  
  return false;
};

// Manuel versiyon kontrolü
export const forceUpdate = () => {
  localStorage.removeItem('app-version');
  window.location.reload();
};

// Cache temizleme
export const clearCache = () => {
  // Service Worker cache temizle
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.unregister();
      });
    });
  }
  
  // Versiyon bilgisini de temizle
  localStorage.removeItem('app-version');
  
  // Sayfayı yenile
  window.location.reload();
};
