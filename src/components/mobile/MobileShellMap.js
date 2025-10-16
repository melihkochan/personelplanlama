import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, ExternalLink } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { shellStationService } from '../../services/supabase';

const MobileShellMap = ({ onBack }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [shellStations, setShellStations] = useState([]);
  const [filteredStations, setFilteredStations] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);

  const cities = [
    { value: '', label: 'Tüm Şehirler' },
    { value: 'ADANA', label: 'Adana' },
    { value: 'ANKARA', label: 'Ankara' },
    { value: 'ANTALYA', label: 'Antalya' },
    { value: 'BURSA', label: 'Bursa' },
    { value: 'İSTANBUL', label: 'İstanbul' },
    { value: 'İZMİR', label: 'İzmir' },
    { value: 'KONYA', label: 'Konya' },
    { value: 'MERSİN', label: 'Mersin' },
    { value: 'GAZİANTEP', label: 'Gaziantep' },
    { value: 'KAYSERİ', label: 'Kayseri' },
    { value: 'ESKİŞEHİR', label: 'Eskişehir' },
    { value: 'SAMSUN', label: 'Samsun' },
    { value: 'TRABZON', label: 'Trabzon' },
    { value: 'MALATYA', label: 'Malatya' },
    { value: 'KOCAELİ', label: 'Kocaeli' },
    { value: 'SAKARYA', label: 'Sakarya' },
    { value: 'BALIKESİR', label: 'Balıkesir' },
    { value: 'TEKİRDAĞ', label: 'Tekirdağ' },
    { value: 'ÇANAKKALE', label: 'Çanakkale' }
  ];

  // Veritabanından verileri yükle
  const loadStationsFromDatabase = async () => {
    setLoading(true);
    try {
      const result = await shellStationService.getAllStations();
      if (result.success && result.data.length > 0) {
        const mapStations = result.data.map(station => ({
          id: station.istasyon_kodu,
          name: station.istasyon_adi,
          address: station.istasyon_adresi,
          city: station.il,
          district: station.ilce,
          region: station.region,
          lat: parseFloat(station.latitude),
          lng: parseFloat(station.longitude),
          services: [
            ...(station.adblue === 'VAR' ? ['AdBlue'] : []),
            ...(station.utts === 'VAR' ? ['UTTS'] : []),
            'Benzin', 'Motorin'
          ],
          adblue: station.adblue === 'VAR',
          utts: station.utts === 'VAR'
        }));
        setShellStations(mapStations);
        setFilteredStations(mapStations);
        if (map && mapStations.length > 0) {
          setTimeout(() => {
            map.setView([39.9334, 32.8597], 6);
          }, 500);
        }
      } else {
        alert('Veritabanında Shell istasyonu bulunamadı.');
      }
    } catch (error) {
      console.error('Veritabanından veri çekme hatası:', error);
      alert('Veritabanından veri çekme sırasında hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Harita başlatma
  useEffect(() => {
    if (!mapRef.current || map) return;

    setTimeout(() => {
      if (!mapRef.current) return;

      const leafletMap = L.map(mapRef.current, {
        maxZoom: 18,
        minZoom: 3,
        zoomControl: true
      }).setView([39.9334, 32.8597], 6);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(leafletMap);

      setMap(leafletMap);
      loadStationsFromDatabase();
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
    let filtered = shellStations;

    if (selectedCity) {
      filtered = filtered.filter(station => station.city === selectedCity);
    }

    if (searchTerm) {
      filtered = filtered.filter(station => 
        station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.district.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredStations(filtered);
  }, [shellStations, selectedCity, searchTerm]);

  // Marker'ları haritaya ekle
  useEffect(() => {
    if (!map || !filteredStations.length) return;

    // Önceki marker'ları temizle
    map.eachLayer(layer => {
      if (layer instanceof L.MarkerClusterGroup || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Marker cluster grubu oluştur
    const markers = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50
    });

    filteredStations.forEach(station => {
      const marker = L.marker([station.lat, station.lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: `
            <div class="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white">
              S
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        })
      });

      marker.on('click', () => {
        setSelectedStation(station);
      });

      markers.addLayer(marker);
    });

    map.addLayer(markers);

    // Kullanıcı konumu varsa marker ekle
    if (userLocation) {
      const userMarker = L.marker([userLocation.lat, userLocation.lng], {
        icon: L.divIcon({
          className: 'user-location-marker',
          html: `
            <div class="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white">
              <Navigation className="w-3 h-3" />
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      });
      map.addLayer(userMarker);
    }

  }, [map, filteredStations, userLocation]);


  // Şehirlere göre gruplandır
  const groupedStations = filteredStations.reduce((acc, station) => {
    if (!acc[station.city]) {
      acc[station.city] = [];
    }
    acc[station.city].push(station);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 pt-4 pb-4 px-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onBack} className="flex items-center text-blue-600 hover:text-blue-800 py-2">
            <ArrowLeft className="w-6 h-6 mr-2" />
            <span className="font-medium">Geri</span>
          </button>
          <h1 className="text-lg font-bold text-gray-900">Shell İstasyonları</h1>
          <div className="w-8"></div>
        </div>
        
        {/* Arama ve Filtre */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="İstasyon ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            {cities.map(city => (
              <option key={city.value} value={city.value}>{city.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Harita */}
      <div className="bg-white shadow-md overflow-hidden relative">
        <div 
          ref={mapRef} 
          className="h-[calc(100vh-280px)] w-full"
          style={{ minHeight: '400px', zIndex: 1 }}
        />
        
        {/* İstasyon Detay Paneli */}
        {selectedStation && (
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs z-[1000]">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900 text-sm">{selectedStation.name}</h3>
              <button
                onClick={() => setSelectedStation(null)}
                className="text-gray-400 hover:text-gray-600 ml-2"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-gray-600 mb-2">{selectedStation.address}</p>
            <p className="text-xs text-gray-500 mb-3">{selectedStation.district}, {selectedStation.city}</p>
            
            <div className="flex flex-wrap gap-1 mb-3">
              {selectedStation.services.map((service, index) => (
                <span key={index} className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                  {service}
                </span>
              ))}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedStation.lat},${selectedStation.lng}`;
                  window.open(url, '_blank');
                }}
                className="flex-1 bg-orange-500 text-white px-3 py-2 rounded-lg text-xs hover:bg-orange-600 transition-colors flex items-center justify-center"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Yol Tarifi
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-3"></div>
            <span className="text-gray-700">İstasyonlar yükleniyor...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileShellMap;
