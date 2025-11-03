import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Maximize2, Minimize2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { transferStoreService } from '../../services/supabase';

const TransferStoreMapView = () => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [storeData, setStoreData] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Veritabanından mağaza verilerini yükle
  useEffect(() => {
    const loadStoresFromDatabase = async () => {
      setLoading(true);
      try {
        const result = await transferStoreService.getAllStores();
        if (result.success && result.data) {
          setStoreData(result.data);
          setFilteredStores(result.data);
          // LocalStorage'a da kaydet (fallback için)
          localStorage.setItem('transferStores', JSON.stringify(result.data));
        }
      } catch (error) {
        console.error('Mağaza verileri yüklenirken hata:', error);
        // Hata durumunda localStorage'dan yükle
        try {
          const savedStores = localStorage.getItem('transferStores');
          if (savedStores) {
            const stores = JSON.parse(savedStores);
            setStoreData(stores);
            setFilteredStores(stores);
          }
        } catch (e) {
          console.error('LocalStorage yükleme hatası:', e);
        }
      } finally {
        setLoading(false);
      }
    };

    loadStoresFromDatabase();
  }, []);

  // Tam ekran değiştiğinde harita boyutunu güncelle
  useEffect(() => {
    if (!map) return;

    // Tam ekran state değiştiğinde harita container boyutunu zorla güncelle
    const updateMapSize = () => {
      if (!map || !mapRef.current) return;
      
      const container = map.getContainer();
      if (!container) return;

      // Container'ın parent elementini kontrol et
      const parent = container.parentElement;
      if (!parent) return;

      // Boyutları al - tam ekran modunda window boyutlarını kullan
      const width = isFullscreen ? window.innerWidth : (parent.offsetWidth || window.innerWidth);
      const height = isFullscreen ? window.innerHeight : (parent.offsetHeight || window.innerHeight);

      // Container boyutunu zorla ayarla
      container.style.width = `${width}px`;
      container.style.height = `${height}px`;
      container.style.minWidth = `${width}px`;
      container.style.minHeight = `${height}px`;
      
      // Leaflet'e yeni boyutu bildir - force update ile
      try {
        map.invalidateSize(true);
      } catch (e) {
        // Fallback
        map.invalidateSize(false);
      }
      
      // Tüm layer'ları yeniden çiz
      map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          layer.redraw();
        }
      });
    };

    // İlk güncelleme - kısa gecikme ile
    const timer1 = setTimeout(updateMapSize, 50);
    
    // İkinci güncelleme - biraz daha gecikme ile
    const timer2 = setTimeout(updateMapSize, 150);
    
    // Üçüncü güncelleme - güvenlik için
    const timer3 = setTimeout(updateMapSize, 300);
    
    // Window resize listener ekle
    const handleResize = () => {
      if (map) {
        updateMapSize();
      }
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener('resize', handleResize);
    };
  }, [isFullscreen, map]);

  // Harita başlatma
  useEffect(() => {
    if (!mapRef.current || map) return;

    setTimeout(() => {
      if (!mapRef.current) return;

      const leafletMap = L.map(mapRef.current, {
        maxZoom: 18,
        minZoom: 3,
        zoomControl: true,
        preferCanvas: false,
        updateWhenIdle: false,
        updateWhenZooming: true
      }).setView([39.9334, 32.8597], 6);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
        updateWhenIdle: false,
        updateWhenZooming: true
      }).addTo(leafletMap);

      // İlk boyut ayarı
      setTimeout(() => {
        leafletMap.invalidateSize();
      }, 100);

      setMap(leafletMap);
    }, 100);

    return () => {
      if (map) {
        map.remove();
        setMap(null);
      }
    };
  }, []);

  // Filtreleme
  useEffect(() => {
    let filtered = [...storeData];

    if (selectedCity) {
      filtered = filtered.filter(store => {
        // Önce region'dan şehir çıkarmaya çalış (daha güvenilir)
        if (store.region) {
          const cityFromRegion = store.region.toString().split('-')[0].trim();
          if (cityFromRegion && cityFromRegion.toLowerCase() === selectedCity.toLowerCase()) {
            return true;
          }
        }
        // Eğer region'dan eşleşme yoksa, city'den kontrol et
        if (store.city && store.city.toLowerCase() === selectedCity.toLowerCase()) {
          return true;
        }
        return false;
      });
    }

    if (searchTerm) {
      filtered = filtered.filter(store =>
        store.store_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.store_code?.toString().includes(searchTerm) ||
        store.region?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredStores(filtered);
  }, [storeData, selectedCity, searchTerm]);

  // Harita işaretçilerini güncelle
  useEffect(() => {
    if (!map || !map._container) return;

    // Önceki işaretçileri temizle
    map.eachLayer(layer => {
      if (layer instanceof L.MarkerClusterGroup || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    if (filteredStores.length === 0) return;

    // Mağaza ikonu
    const storeIcon = L.divIcon({
      html: `<div style="
        background: #FF6B35;
        border: 2px solid #FFFFFF;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: bold;
        color: #FFFFFF;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">🏪</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      className: 'store-marker'
    });

    // Cluster grubu oluştur
    const markers = L.markerClusterGroup({
      iconCreateFunction: function(cluster) {
        const childCount = cluster.getChildCount();
        return L.divIcon({
          html: `<div style="
            background: #FF6B35;
            border: 3px solid #FFFFFF;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
            color: #FFFFFF;
            box-shadow: 0 3px 6px rgba(0,0,0,0.4);
          ">${childCount}</div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          className: 'store-cluster'
        });
      }
    });

    // İşaretçileri ekle
    filteredStores.forEach((store, index) => {
      if (store.latitude && store.longitude) {
        const marker = L.marker([store.latitude, store.longitude], { icon: storeIcon });
        
        marker.on('click', (e) => {
          e.originalEvent.stopPropagation();
          setSelectedStore(store);
          // Marker tıklamasında haritayı büyütme, sadece marker'ı merkeze al
          map.setView([store.latitude, store.longitude], Math.max(map.getZoom(), 14));
        });

        markers.addLayer(marker);
      }
    });

    map.addLayer(markers);

    // Haritayı sadece ilk yüklemede veya filtre değiştiğinde odakla (marker tıklamasında değil)
    if (filteredStores.length > 0 && filteredStores.some(s => s.latitude && s.longitude)) {
      const storesWithCoords = filteredStores.filter(s => s.latitude && s.longitude);
      if (storesWithCoords.length > 0) {
        const bounds = L.latLngBounds(storesWithCoords.map(s => [s.latitude, s.longitude]));
        // Sadece eğer harita henüz odaklanmamışsa veya tüm mağazalar filtreleniyorsa fitBounds yap
        if (!map._hasFitBounds || filteredStores.length !== storeData.length) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
          map._hasFitBounds = true;
        }
      }
    }
  }, [map, filteredStores, storeData.length]);

  // Şehir listesi - sadece şehir adlarını göster, bölge müdürlerini değil
  const cities = Array.from(new Set(
    storeData
      .map(s => {
        // Önce region'dan şehir çıkarmaya çalış (daha güvenilir)
        if (s.region && s.region.toString().trim()) {
          const regionStr = s.region.toString().trim();
          // Eğer region'da "-" varsa, "-" öncesi kısmı şehir
          if (regionStr.includes('-')) {
            const cityMatch = regionStr.split('-')[0].trim();
            if (cityMatch && cityMatch.length > 1) {
              return cityMatch;
            }
          } else {
            // Eğer "-" yoksa, tüm region'u şehir olarak kullan (eğer uzunluk uygunsa)
            const cityMatch = regionStr.trim();
            if (cityMatch && cityMatch.length > 1 && cityMatch.length < 50) {
              return cityMatch;
            }
          }
        }
        // Eğer region'dan çıkarılamazsa city'yi kullan
        if (s.city && s.city.toString().trim()) {
          const cityStr = s.city.toString().trim();
          // Şehir adı çok uzunsa veya çok kısaysa geçersiz say
          if (cityStr.length > 1 && cityStr.length < 50) {
            return cityStr;
          }
        }
        return null;
      })
      .filter(Boolean)
      .filter(city => {
        // Kişi isimleri gibi görünen değerleri filtrele (çok uzun veya çok kısa isimler)
        // Türk şehirlerinin genellikle 3-15 karakter arası olduğunu varsayalım
        return city.length >= 3 && city.length <= 30;
      })
  )).sort();

  return (
    <div className={`min-h-screen bg-gray-50 p-2 ${isFullscreen ? 'overflow-hidden' : ''}`}>
      {!isFullscreen && (
      <div className="w-full">
        {/* Başlık */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Aktarma Mağazaları Harita Görünümü</h1>
          <p className="text-gray-600">Aktarma mağazalarını harita üzerinde görüntüleyin</p>
        </div>

        {/* Kontroller */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Arama */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Mağaza adı, kod, bölge ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Şehir Filtresi */}
            <div className="min-w-48">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Tüm Şehirler</option>
                {cities.map(city => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* İstatistikler */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
            <span>Toplam Mağaza: <strong>{storeData.length}</strong></span>
            <span>Filtrelenmiş: <strong>{filteredStores.length}</strong></span>
            <span>Haritada: <strong>{filteredStores.filter(s => s.latitude && s.longitude).length}</strong></span>
            <span>Şehir: <strong>{selectedCity || 'Tümü'}</strong></span>
          </div>
        </div>
      </div>
      )}

        {/* Tam Ekran Modunda Kontroller */}
        {isFullscreen && (
          <div className="fixed top-4 left-4 z-[10000] bg-white rounded-lg shadow-lg p-4 min-w-80 max-w-md"
               style={{ maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto' }}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">Filtreler</h2>
            
            {/* Arama */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Mağaza adı, kod, bölge ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Şehir Filtresi */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Şehir Filtresi</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Tüm Şehirler</option>
                {cities.map(city => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* İstatistikler */}
            <div className="text-sm text-gray-600 space-y-1">
              <div>Toplam: <strong>{storeData.length}</strong></div>
              <div>Filtrelenmiş: <strong>{filteredStores.length}</strong></div>
              <div>Haritada: <strong>{filteredStores.filter(s => s.latitude && s.longitude).length}</strong></div>
            </div>
          </div>
        )}

        {/* Harita Container - Her zaman render ediliyor */}
        <div 
          className={`bg-white rounded-lg shadow-md overflow-hidden mb-6 relative ${isFullscreen ? 'fixed inset-0 z-[9999] m-0 rounded-none' : ''}`}
          style={isFullscreen ? { 
            width: '100vw', 
            height: '100vh',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          } : {}}
        >
          <div 
            ref={mapRef} 
            className="rounded-lg"
            style={isFullscreen ? { 
              width: '100vw', 
              height: '100vh',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            } : { 
              width: '100%',
              minHeight: '700px',
              height: '700px'
            }}
          />
          
          {/* Tam Ekran Butonu */}
          <button
            onClick={() => {
              setIsFullscreen(!isFullscreen);
            }}
            className="absolute top-4 right-4 bg-white hover:bg-gray-100 rounded-lg shadow-lg border border-gray-200 p-2 z-[1001] transition-all duration-200 flex items-center justify-center"
            title={isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran Yap'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5 text-gray-700" />
            ) : (
              <Maximize2 className="w-5 h-5 text-gray-700" />
            )}
          </button>
          
          {/* Mağaza Detay Paneli */}
          {selectedStore && (
            <div className={`absolute bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm z-[1000] ${isFullscreen ? 'top-4 right-4' : 'top-4 right-4'}`}
                 style={isFullscreen ? { top: '1rem', right: '1rem', maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto' } : {}}
            >
              <div className="flex items-start mb-3 relative">
                <button
                  onClick={() => setSelectedStore(null)}
                  className="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full p-1 transition-all duration-200 flex-shrink-0 w-7 h-7 flex items-center justify-center mr-2 absolute left-0 top-0"
                  title="Kapat"
                >
                  <span className="text-xl font-bold leading-none">×</span>
                </button>
                <h3 className="text-lg font-bold text-orange-600 flex-1 ml-9">{selectedStore.store_name}</h3>
              </div>
              
              <div className="space-y-2 text-sm">
                <div>
                  <strong className="text-gray-700">Kod:</strong>
                  <p className="text-gray-600">{selectedStore.store_code}</p>
                </div>
                {selectedStore.region && (
                  <div>
                    <strong className="text-gray-700">Bölge:</strong>
                    <p className="text-gray-600">{selectedStore.region}</p>
                  </div>
                )}
                {selectedStore.city && (
                  <div>
                    <strong className="text-gray-700">Şehir:</strong>
                    <p className="text-gray-600">{selectedStore.city}</p>
                  </div>
                )}
                {selectedStore.location && (
                  <div>
                    <strong className="text-gray-700">Konum:</strong>
                    <p className="text-gray-600 text-xs">{selectedStore.location}</p>
                  </div>
                )}
              </div>
              
              {selectedStore.latitude && selectedStore.longitude && (
                <button
                  onClick={() => window.open(`https://maps.google.com/maps?q=${selectedStore.latitude},${selectedStore.longitude}`, '_blank')}
                  className="w-full mt-3 px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-sm"
                >
                  Google Maps'te Aç
                </button>
              )}
            </div>
          )}
        </div>
    </div>
  );
};

export default TransferStoreMapView;

