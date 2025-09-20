// Otomatik versiyon sistemi
export const VERSION_CONFIG = {
  major: 1,
  minor: 1,
  patch: 0,
  buildDate: new Date().toISOString().split('T')[0], // Bugünün tarihi
  lastUpdate: new Date().toLocaleDateString('tr-TR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  })
};

// Versiyon string'ini oluştur
export const getVersionString = () => {
  return `v${VERSION_CONFIG.major}.${VERSION_CONFIG.minor}.${VERSION_CONFIG.patch}`;
};

// Güncelleme tarihini al
export const getUpdateDate = () => {
  return VERSION_CONFIG.lastUpdate;
};

// Versiyon bilgilerini al
export const getVersionInfo = () => {
  return {
    version: getVersionString(),
    buildDate: VERSION_CONFIG.buildDate,
    lastUpdate: VERSION_CONFIG.lastUpdate
  };
};
