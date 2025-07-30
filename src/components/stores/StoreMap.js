import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet marker icon'larını düzelt
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const StoreMap = ({ latitude, longitude, storeName }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapType, setMapType] = useState('osm'); // osm, satellite, terrain

  useEffect(() => {
    if (!latitude || !longitude) return;

    // Harita zaten varsa temizle
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // DOM element'inin hazır olmasını bekle
    const timer = setTimeout(() => {
      if (mapRef.current && !mapInstanceRef.current) {
        try {
          // Yeni harita oluştur
          const map = L.map(mapRef.current).setView([latitude, longitude], 15);
          mapInstanceRef.current = map;

          // Harita türüne göre tile layer seç
          let tileLayer;
          switch (mapType) {
            case 'satellite':
              tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '© Esri'
              });
              break;
            case 'terrain':
              tileLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenTopoMap'
              });
              break;
            default: // osm
              tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
              });
          }
          tileLayer.addTo(map);

          // Mağaza marker'ı ekle (varsayılan Leaflet pin'i kullan)
          const marker = L.marker([latitude, longitude], {
            icon: L.icon({
              iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
              iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
              shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            })
          }).addTo(map);

          // Popup ekle
          if (storeName) {
            marker.bindPopup(`
              <div style="text-align: center; padding: 10px;">
                <h3 style="margin: 0 0 10px 0; color: #8b5cf6;">${storeName}</h3>
                <p style="margin: 0; color: #666;">
                  <strong>Konum:</strong><br>
                  ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
                </p>
              </div>
            `);
          }

          // Harita boyutunu güncelle
          map.invalidateSize();
        } catch (error) {
          console.error('Harita yükleme hatası:', error);
        }
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, storeName, mapType]);

  if (!latitude || !longitude) {
    return (
      <div className="bg-white rounded-xl p-4 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-gray-600">Koordinat bilgisi bulunamadı</p>
          <p className="text-sm text-gray-500 mt-2">Mağaza konumu gösterilemiyor</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900">Konum</h3>
        </div>
        
        {/* Harita Türü Seçici */}
        <div className="flex gap-2">
          <button
            onClick={() => setMapType('osm')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              mapType === 'osm' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Harita
          </button>
          <button
            onClick={() => setMapType('satellite')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              mapType === 'satellite' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Uydu
          </button>
          <button
            onClick={() => setMapType('terrain')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              mapType === 'terrain' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Arazi
          </button>
        </div>
      </div>
      
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg overflow-hidden border border-gray-200"
        style={{ minHeight: '400px', height: '400px' }}
      />
      

    </div>
  );
};

export default StoreMap; 