import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const SimpleStoreMap = ({ storeData }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapType, setMapType] = useState('osm');
  const [isMapReady, setIsMapReady] = useState(false);

  // Belirtilen koordinat (40.926761, 29.308891)
  const FOCUS_CENTER = [40.926761, 29.308891];
  const DEFAULT_ZOOM = 10;

  useEffect(() => {
    // Sadece storeData değiştiğinde haritayı yeniden oluştur
    if (!storeData || storeData.length === 0) return;

    // Harita zaten varsa temizle
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    setIsMapReady(false);

    // DOM element'inin hazır olmasını bekle
    const timer = setTimeout(() => {
      if (mapRef.current) {
        try {
          // Yeni harita oluştur
          const map = L.map(mapRef.current, {
            zoomControl: true,
            attributionControl: true,
            preferCanvas: false,
            zoomSnap: 0.5,
            zoomDelta: 0.5
          }).setView(FOCUS_CENTER, DEFAULT_ZOOM);
          mapInstanceRef.current = map;
          
          console.log('🗺️ Harita oluşturuldu:', FOCUS_CENTER, 'Zoom:', DEFAULT_ZOOM);

          // Harita türüne göre tile layer seç
          let tileLayer;
          switch (mapType) {
            case 'satellite':
              tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '© Esri',
                maxZoom: 18,
                subdomains: ['server']
              });
              break;
            case 'terrain':
              tileLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenTopoMap',
                maxZoom: 17,
                subdomains: ['a', 'b', 'c']
              });
              break;
            default: // osm
              tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
              });
          }
          
          tileLayer.addTo(map);

          // Tile yükleme hatalarını kontrol et
          tileLayer.on('tileerror', (e) => {
            console.error('Tile yükleme hatası:', e);
          });

          tileLayer.on('tileload', () => {
            console.log('Tile başarıyla yüklendi');
          });

          // Mağaza verilerini filtrele (koordinatı olanlar)
          const storesWithCoords = storeData.filter(store => 
            store.latitude && store.longitude && 
            !isNaN(parseFloat(store.latitude)) && 
            !isNaN(parseFloat(store.longitude))
          );

          console.log('🏪 Toplam mağaza:', storeData.length);
          console.log('📍 Koordinatlı mağaza:', storesWithCoords.length);

          // Özel mağaza ikonu
          const customIcon = L.divIcon({
            className: 'custom-store-marker',
            html: `
              <div style="
                background: linear-gradient(135deg, #ef4444, #dc2626);
                width: 20px;
                height: 20px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                border: 2px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
              ">
                <div style="
                  transform: rotate(45deg);
                  color: white;
                  font-weight: bold;
                  font-size: 10px;
                  text-align: center;
                  line-height: 1;
                ">🏪</div>
              </div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 20],
            popupAnchor: [0, -20]
          });

          // Mağaza marker'larını ekle
          storesWithCoords.forEach(store => {
            const lat = parseFloat(store.latitude);
            const lng = parseFloat(store.longitude);
            
            const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
            
            // Popup içeriği
            const storeName = store.name || store.store_name || store.mağaza_adı || 'Mağaza';
            const storeAddress = store.address || store.adres || store.mağaza_adresi || 'Adres bilgisi yok';
            const storeRegion = store.region || store.bölge || store.mağaza_bölgesi || 'Belirtilmemiş';
            const storePhone = store.phone || store.telefon || store.mağaza_telefonu;
            
            console.log('🏪 Mağaza popup verisi:', { storeName, storeAddress, storeRegion, storePhone });
            
            const popupContent = `
              <div style="font-family: 'Inter', sans-serif; min-width: 200px;">
                <div style="
                  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                  color: white;
                  padding: 12px;
                  margin: -10px -10px 10px -10px;
                  border-radius: 8px 8px 0 0;
                  font-weight: 600;
                  font-size: 14px;
                ">
                  🏪 ${storeName}
                </div>
                <div style="padding: 8px 0;">
                  <div style="margin-bottom: 8px;">
                    <strong style="color: #374151;">📍 Adres:</strong><br>
                    <span style="color: #6b7280; font-size: 13px;">${storeAddress}</span>
                  </div>
                  <div style="margin-bottom: 8px;">
                    <strong style="color: #374151;">🏢 Bölge:</strong><br>
                    <span style="color: #6b7280; font-size: 13px;">${storeRegion}</span>
                  </div>
                  ${storePhone ? `
                    <div style="margin-bottom: 8px;">
                      <strong style="color: #374151;">📞 Telefon:</strong><br>
                      <span style="color: #6b7280; font-size: 13px;">${storePhone}</span>
                    </div>
                  ` : ''}
                  <div style="
                    background: #f3f4f6;
                    padding: 6px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    color: #6b7280;
                    margin-top: 8px;
                  ">
                    📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}
                  </div>
                </div>
              </div>
            `;
            
            marker.bindPopup(popupContent);
          });

          // Haritayı mağazalara odakla
          if (storesWithCoords.length > 0) {
            const bounds = L.latLngBounds();
            storesWithCoords.forEach(store => {
              const lat = parseFloat(store.latitude);
              const lng = parseFloat(store.longitude);
              bounds.extend([lat, lng]);
            });
            
            // Bounds'ı biraz genişlet ki mağazalar tam görünsün
            const sw = bounds.getSouthWest();
            const ne = bounds.getNorthEast();
            const latDiff = ne.lat - sw.lat;
            const lngDiff = ne.lng - sw.lng;
            
            // Bounds'ı %20 genişlet
            const expandedBounds = L.latLngBounds(
              [sw.lat - latDiff * 0.2, sw.lng - lngDiff * 0.2],
              [ne.lat + latDiff * 0.2, ne.lng + lngDiff * 0.2]
            );
            
            map.fitBounds(expandedBounds, {
              padding: [20, 20],
              maxZoom: 12
            });
            
            console.log('📍 Harita mağazalara odaklandı:', storesWithCoords.length, 'mağaza');
            console.log('📍 Bounds:', bounds.getNorthEast(), bounds.getSouthWest());
          } else {
            // Mağaza yoksa belirtilen koordinata odakla
            map.setView(FOCUS_CENTER, 10);
            console.log('📍 Harita belirtilen koordinata odaklandı - mağaza bulunamadı');
          }

          // Harita boyutunu güncelle
          setTimeout(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize();
            }
          }, 100);

          setIsMapReady(true);
        } catch (error) {
          console.error('Harita yükleme hatası:', error);
        }
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [storeData]); // Sadece storeData değiştiğinde çalışsın

  // Harita türü değiştiğinde sadece tile layer'ı güncelle
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Mevcut tile layer'ları kaldır
    mapInstanceRef.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });

    // Yeni tile layer ekle
    let tileLayer;
    switch (mapType) {
      case 'satellite':
        tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: '© Esri',
          maxZoom: 18,
          subdomains: ['server']
        });
        break;
      case 'terrain':
        tileLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenTopoMap',
          maxZoom: 17,
          subdomains: ['a', 'b', 'c']
        });
        break;
      default: // osm
        tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        });
    }
    
    tileLayer.addTo(mapInstanceRef.current);
    
    // Harita türü değiştiğinde mağazalara tekrar odaklan
    const storesWithCoords = storeData.filter(store => 
      store.latitude && store.longitude && 
      !isNaN(parseFloat(store.latitude)) && 
      !isNaN(parseFloat(store.longitude))
    );
    
    if (storesWithCoords.length > 0) {
      const bounds = L.latLngBounds();
      storesWithCoords.forEach(store => {
        const lat = parseFloat(store.latitude);
        const lng = parseFloat(store.longitude);
        bounds.extend([lat, lng]);
      });
      
      // Bounds'ı biraz genişlet
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const latDiff = ne.lat - sw.lat;
      const lngDiff = ne.lng - sw.lng;
      
      const expandedBounds = L.latLngBounds(
        [sw.lat - latDiff * 0.2, sw.lng - lngDiff * 0.2],
        [ne.lat + latDiff * 0.2, ne.lng + lngDiff * 0.2]
      );
      
      mapInstanceRef.current.fitBounds(expandedBounds, {
        padding: [20, 20],
        maxZoom: 12
      });
    }
  }, [mapType, storeData]);

  const storesWithCoords = storeData.filter(store => 
    store.latitude && store.longitude && 
    !isNaN(parseFloat(store.latitude)) && 
    !isNaN(parseFloat(store.longitude))
  );

  return (
    <div className="bg-white rounded-xl h-full relative">
      {/* Harita Türü Seçici - Sadece sağ üstte */}
      <div className="absolute top-4 right-4 z-10">
        <div className="flex space-x-2">
          <button
            onClick={() => setMapType('osm')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
              mapType === 'osm' 
                ? 'bg-blue-500 text-white shadow-lg' 
                : 'bg-white/90 text-gray-600 hover:bg-white hover:text-gray-800'
            }`}
          >
            Harita
          </button>
          <button
            onClick={() => setMapType('satellite')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
              mapType === 'satellite' 
                ? 'bg-blue-500 text-white shadow-lg' 
                : 'bg-white/90 text-gray-600 hover:bg-white hover:text-gray-800'
            }`}
          >
            Uydu
          </button>
          <button
            onClick={() => setMapType('terrain')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
              mapType === 'terrain' 
                ? 'bg-blue-500 text-white shadow-lg' 
                : 'bg-white/90 text-gray-600 hover:bg-white hover:text-gray-800'
            }`}
          >
            Arazi
          </button>
        </div>
      </div>
      
      {!isMapReady && (
        <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-500 text-sm">Harita yükleniyor...</p>
          </div>
        </div>
      )}
      
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ 
          minHeight: '400px',
          height: '400px',
          display: isMapReady ? 'block' : 'none'
        }}
      />
    </div>
  );
};

export default SimpleStoreMap;
