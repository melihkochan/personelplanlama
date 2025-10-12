// Version check utility for cache busting
export const checkForUpdates = () => {
  // Version kontrolü için timestamp kullan
  const currentVersion = process.env.REACT_APP_VERSION || Date.now().toString();
  
  // LocalStorage'dan son bilinen versiyonu al
  const lastKnownVersion = localStorage.getItem('app-version');
  
  // Eğer versiyon değişmişse, sayfayı yenile
  if (lastKnownVersion && lastKnownVersion !== currentVersion) {
    console.log('Yeni sürüm tespit edildi, sayfa yenileniyor...');
    localStorage.setItem('app-version', currentVersion);
    window.location.reload();
    return true;
  }
  
  // İlk ziyarette versiyonu kaydet
  if (!lastKnownVersion) {
    localStorage.setItem('app-version', currentVersion);
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
  
  // LocalStorage temizle (opsiyonel)
  // localStorage.clear();
  
  // Sayfayı yenile
  window.location.reload();
};
