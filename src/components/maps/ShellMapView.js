import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Filter, Navigation, RefreshCw, ExternalLink } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { shellStationService } from '../../services/supabase';

const ShellMapView = () => {
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
      if (result.success) {
        const stations = result.data.map(station => ({
          id: station.istasyon_kodu,
          code: station.istasyon_kodu,
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

        setShellStations(stations);
        setFilteredStations(stations);
        
        // Haritayı güncelle
        setTimeout(() => {
          if (map && stations.length > 0) {
            const bounds = L.latLngBounds(stations.map(s => [s.lat, s.lng]));
            map.fitBounds(bounds, { padding: [20, 20] });
          }
        }, 1000);

        console.log(`${stations.length} istasyon veritabanından yüklendi`);
      } else {
        console.error('Veri yükleme hatası:', result.error);
        alert('Veriler yüklenirken hata oluştu: ' + result.error);
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      alert('Veriler yüklenirken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Harita başlatma
  useEffect(() => {
    if (!mapRef.current || map) return;

    // Harita container'ının hazır olmasını bekle
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

      // Sayfa yüklendiğinde verileri çek
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
      filtered = filtered.filter(station => 
        station.city.toLowerCase().includes(selectedCity.toLowerCase())
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(station =>
        station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.district.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredStations(filtered);
  }, [shellStations, selectedCity, searchTerm]);

  // Harita işaretçilerini güncelle
  useEffect(() => {
    if (!map || !map._container) return;

    // Önceki işaretçileri temizle
    map.eachLayer(layer => {
      if (layer instanceof L.MarkerClusterGroup || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    if (filteredStations.length === 0) return;

    // Shell ikonu
    const shellIcon = L.divIcon({
      html: `<div style="
        background: #FFD700;
        border: 2px solid #FFA500;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: bold;
        color: #FF4500;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">⛽</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      className: 'shell-marker'
    });

    // Cluster grubu oluştur
    const markers = L.markerClusterGroup({
      iconCreateFunction: function(cluster) {
        const childCount = cluster.getChildCount();
        return L.divIcon({
          html: `<div style="
            background: #FFD700;
            border: 3px solid #FFA500;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
            color: #FF4500;
            box-shadow: 0 3px 6px rgba(0,0,0,0.4);
          ">${childCount}</div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          className: 'shell-cluster'
        });
      }
    });

    // İşaretçileri ekle
    filteredStations.forEach(station => {
      const marker = L.marker([station.lat, station.lng], { icon: shellIcon });
      
      // Popup'ı kaldırdık - sadece sağ üstteki panel açılsın

      marker.on('click', (e) => {
        e.originalEvent.stopPropagation();
        setSelectedStation(station);
        // Harita odaklanmasını tamamen engelle - sadece panel açılsın
      });

      markers.addLayer(marker);
    });

    map.addLayer(markers);

    // Haritayı istasyonlara odakla
    if (filteredStations.length > 0) {
      const bounds = L.latLngBounds(filteredStations.map(s => [s.lat, s.lng]));
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, filteredStations]);

  // Kullanıcı konumunu al
  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          
          if (map) {
            const userIcon = L.divIcon({
              html: `<div style="
                background: #007bff;
                border: 2px solid #ffffff;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              "></div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });

            const userMarker = L.marker([latitude, longitude], { icon: userIcon });
            userMarker.addTo(map);
            userMarker.bindPopup('<div class="p-2"><strong>Konumunuz</strong></div>').openPopup();
            
            map.setView([latitude, longitude], 13);
          }
        },
        (error) => {
          console.error('Konum alınamadı:', error);
          alert('Konumunuz alınamadı. Lütfen konum iznini etkinleştirin.');
        }
      );
    } else {
      alert('Tarayıcınız konum servisini desteklemiyor.');
    }
  };

  // Şehre göre gruplandır
  const groupedStations = filteredStations.reduce((acc, station) => {
    const city = station.city || 'Diğer';
    if (!acc[city]) {
      acc[city] = [];
    }
    acc[city].push(station);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Başlık */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Shell Petrol İstasyonları</h1>
          <p className="text-gray-600">Türkiye'deki Shell istasyonlarını harita üzerinde görüntüleyin</p>
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
                  placeholder="İstasyon adı, adres, il veya ilçe ara..."
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
                {cities.map(city => (
                  <option key={city.value} value={city.value}>
                    {city.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Butonlar */}
            <div className="flex gap-2">
              <button
                onClick={getUserLocation}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Konumum
              </button>
              
              <button
                onClick={loadStationsFromDatabase}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Yenile
              </button>
            </div>
          </div>

          {/* İstatistikler */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
            <span>Toplam İstasyon: <strong>{shellStations.length}</strong></span>
            <span>Filtrelenmiş: <strong>{filteredStations.length}</strong></span>
            <span>Şehir: <strong>{selectedCity ? cities.find(c => c.value === selectedCity)?.label : 'Tümü'}</strong></span>
          </div>
        </div>

        {/* Harita - Tam Genişlik */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6 relative">
          <div 
            ref={mapRef} 
            className="h-[600px] md:h-[700px] rounded-lg"
            style={{ minHeight: '600px' }}
          />
          
          {/* İstasyon Detay Paneli - Haritanın Sağ Üstünde */}
          {selectedStation && (
            <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm z-[1000]">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold text-orange-600 pr-2">{selectedStation.name}</h3>
                <button
                  onClick={() => setSelectedStation(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold flex-shrink-0"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-2 text-sm">
                <div>
                  <strong className="text-gray-700">Adres:</strong>
                  <p className="text-gray-600 text-xs">{selectedStation.address}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <strong className="text-gray-700">İl:</strong>
                    <p className="text-gray-600">{selectedStation.city}</p>
                  </div>
                  <div>
                    <strong className="text-gray-700">İlçe:</strong>
                    <p className="text-gray-600">{selectedStation.district}</p>
                  </div>
                </div>
                
                <div>
                  <strong className="text-gray-700">Bölge:</strong>
                  <p className="text-gray-600">{selectedStation.region}</p>
                </div>
                
                <div>
                  <strong className="text-gray-700">Hizmetler:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedStation.services.map(service => (
                      <span key={service} className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <strong className="text-gray-700">AdBlue:</strong>
                    <span className={`ml-1 px-2 py-1 text-xs rounded ${
                      selectedStation.adblue ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedStation.adblue ? 'VAR' : 'YOK'}
                    </span>
                  </div>
                  <div>
                    <strong className="text-gray-700">UTTS:</strong>
                    <span className={`ml-1 px-2 py-1 text-xs rounded ${
                      selectedStation.utts ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedStation.utts ? 'VAR' : 'YOK'}
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => window.open(`https://maps.google.com/maps?q=${selectedStation.lat},${selectedStation.lng}`, '_blank')}
                className="w-full mt-3 px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-sm"
              >
                Google Maps'te Aç
              </button>
            </div>
          )}
        </div>

        {/* İstasyon Listesi - Alt Taraf */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Shell İstasyonları Listesi</h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
              <span className="ml-2 text-gray-600">Yükleniyor...</span>
            </div>
          ) : filteredStations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>İstasyon bulunamadı</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(groupedStations).map(([city, stations]) => (
                <div key={city} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 text-center bg-orange-50 py-2 rounded">
                    {city} ({stations.length} istasyon)
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {stations.map(station => (
                      <div 
                        key={station.id}
                        className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-orange-50 transition-colors"
                        onClick={() => {
                          setSelectedStation(station);
                          // Haritada istasyonu göster
                          if (map) {
                            map.setView([station.lat, station.lng], 15);
                          }
                        }}
                      >
                        <div className="font-medium text-sm text-gray-900">{station.name}</div>
                        <div className="text-xs text-gray-600 truncate">{station.address}</div>
                        <div className="flex gap-1 mt-1">
                          {station.adblue && (
                            <span className="px-1 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">AdBlue</span>
                          )}
                          {station.utts && (
                            <span className="px-1 py-0.5 bg-green-100 text-green-800 text-xs rounded">UTTS</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ShellMapView;