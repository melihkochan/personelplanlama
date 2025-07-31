import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Clock, Car, ArrowRightLeft, X, Info, Warehouse } from 'lucide-react';
import { supabase } from '../../services/supabase';

const StoreDistanceCalculator = () => {
  const [stores, setStores] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [selectedStores, setSelectedStores] = useState([]);
  const [distanceInfo, setDistanceInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [routePolyline, setRoutePolyline] = useState(null);
  const [sortBy, setSortBy] = useState('name'); // 'name' veya 'code'
  const [mapType, setMapType] = useState('street'); // 'street', 'satellite', 'terrain'
  const mapRef = useRef(null);

  // Tuzla Depo bilgileri
  const tuzlaDepo = {
    id: 'tuzla-depo',
    store_name: 'Tuzla Depo',
    store_code: 'DEPO',
    latitude: 40.883510,
    longitude: 29.368118,
    address: 'Tuzla, İstanbul',
    isDepo: true
  };

  // Mağaza konumlarına göre renk belirleme - Personel konum dağılımındaki konumlara göre
  const getStoreColor = (store) => {
    if (store.isDepo) return 'purple';
    
    // Gerçek mağaza verilerini kullan
    const storeLocation = store.location || store.address || '';
    const locationLower = storeLocation.toLowerCase();
    
    // Personel konum dağılımındaki konumlara göre renk belirleme
    if (locationLower.includes('ataşehir') || locationLower.includes('ümraniye') || locationLower.includes('üsküdar')) {
      return 'blue';
    }
    if (locationLower.includes('balıkesir') || locationLower.includes('avşa')) {
      return 'green';
    }
    if (locationLower.includes('beykoz') || locationLower.includes('çekmeköy') || locationLower.includes('sancaktepe') || locationLower.includes('sultanbeyli')) {
      return 'purple';
    }
    if (locationLower.includes('gebze')) {
      return 'orange';
    }
    if (locationLower.includes('kadıköy')) {
      return 'red';
    }
    if (locationLower.includes('kocaeli')) {
      return 'indigo';
    }
    if (locationLower.includes('maltepe') || locationLower.includes('kartal') || locationLower.includes('pendik')) {
      return 'pink';
    }
    if (locationLower.includes('sakarya')) {
      return 'yellow';
    }
    if (locationLower.includes('şile')) {
      return 'teal';
    }
    
    // Varsayılan renk
    return 'gray';
  };

  // Mağaza simgesi ile pin HTML'i oluştur
  const getStorePinHtml = (store, isSelected = false) => {
    if (store.isDepo) {
      return `<div class="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center text-white shadow-lg border-2 border-white">
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
        </svg>
      </div>`;
    }
    
    const color = getStoreColor(store);
    const size = isSelected ? 'w-10 h-10' : 'w-8 h-8';
    
    return `<div class="${size} bg-${color}-500 rounded-lg flex items-center justify-center text-white shadow-lg border-2 border-white">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5zM12 22c-4.18-1.26-7-5.42-7-10V9l7-3.5 7 3.5v3c0 4.58-2.82 8.74-7 10z"/>
        <path d="M12 9l-5 2.5v3c0 3.55 2.18 6.64 5 7.9 2.82-1.26 5-4.35 5-7.9v-3L12 9z"/>
      </svg>
    </div>`;
  };

  // Hover tooltip HTML'i oluştur - Gerçek mağaza verilerini kullan
  const getHoverTooltipHtml = (store) => {
    const color = getStoreColor(store);
    
    // Gerçek mağaza verilerini kullan
    const region = store.isDepo ? 'Anadolu Bölge Deposu' : 
      store.region || store.bolge || 'Belirtilmemiş';
    
    const location = store.location || store.konum || store.address || 'Konum bilgisi yok';
    const type = store.isDepo ? 'DEPO' : (store.store_type || store.tip || 'MAĞAZA');
    
    return `
      <div class="bg-white rounded-lg shadow-lg border border-gray-200 p-3 max-w-64">
        <div class="flex items-start space-x-2">
          <div class="w-8 h-8 bg-gradient-to-br from-${color}-500 to-${color}-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-md">
            ${store.isDepo ? 'D' : store.store_code}
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-gray-900 text-sm mb-1">${store.store_name || store.magaza_adi}</h3>
            <p class="text-xs text-gray-600 mb-2">Kod: <span class="font-semibold text-gray-800">${store.store_code || store.kod}</span></p>
            <div class="space-y-1">
              <div class="flex justify-between text-xs">
                <span class="text-gray-600">Bölge:</span>
                <span class="font-medium text-gray-900">${region}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-gray-600">Konum:</span>
                <span class="font-medium text-gray-900">${location}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-gray-600">Tür:</span>
                <span class="font-medium text-gray-900">${type}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    if (stores.length > 0 && !map) {
      initializeMap();
    }
  }, [stores, map]);

  const loadStores = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .not('store_name', 'ilike', '%beauty%');

      if (error) throw error;
      const storesData = data || [];
      setStores(storesData);
      setFilteredStores(storesData);
    } catch (error) {
      console.error('Mağazalar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortStores = (storesToSort) => {
    return [...storesToSort].sort((a, b) => {
      if (sortBy === 'name') {
        return a.store_name.localeCompare(b.store_name, 'tr');
      } else {
        return a.store_code.localeCompare(b.store_code, 'tr');
      }
    });
  };

  const initializeMap = () => {
    if (!window.L) {
      console.error('Leaflet yüklenmemiş');
      return;
    }

    // Harita başlangıç merkezi (İstanbul)
    const mapInstance = window.L.map(mapRef.current).setView([41.0082, 28.9784], 10);

    // Harita türleri
    const tileLayers = {
      street: window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }),
      satellite: window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri'
      }),
      terrain: window.L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap'
      })
    };

    // Başlangıç harita türünü ekle
    tileLayers[mapType].addTo(mapInstance);
    mapInstance.tileLayers = tileLayers;

    // Mağaza pinlerini ekle
    const newMarkers = stores.map(store => {
      const color = getStoreColor(store);
      const marker = window.L.marker([store.latitude, store.longitude], {
        icon: window.L.divIcon({
          className: 'custom-marker',
          html: getStorePinHtml(store),
          iconSize: [40, 48],
          iconAnchor: [20, 48]
        })
      });

      // Store code bilgisini marker'a ekle
      marker.store_code = store.store_code;
      marker.isDepo = false;
      marker.storeColor = color;
      marker.store = store;

      // Hover tooltip ekle
      marker.bindTooltip(getHoverTooltipHtml(store), {
        direction: 'top',
        offset: [0, -10],
        className: 'custom-tooltip',
        permanent: false,
        sticky: true
      });

      // Marker'a tıklandığında seç
      marker.on('click', () => {
        handleStoreSelect(store);
      });

      marker.addTo(mapInstance);
      return marker;
    });

    // Tuzla Depo pinini her zaman ekle
    const depoMarker = window.L.marker([tuzlaDepo.latitude, tuzlaDepo.longitude], {
      icon: window.L.divIcon({
        className: 'custom-marker',
        html: getStorePinHtml(tuzlaDepo),
        iconSize: [48, 48],
        iconAnchor: [24, 48]
      })
    });

    depoMarker.store_code = 'DEPO';
    depoMarker.isDepo = true;
    depoMarker.storeColor = 'red';
    depoMarker.store = tuzlaDepo;

    // Depo hover tooltip
    depoMarker.bindTooltip(getHoverTooltipHtml(tuzlaDepo), {
      direction: 'top',
      offset: [0, -10],
      className: 'custom-tooltip',
      permanent: false,
      sticky: true
    });

    // Depo marker'a tıklandığında
    depoMarker.on('click', () => {
      handleStoreSelect(tuzlaDepo);
    });

    depoMarker.addTo(mapInstance);
    newMarkers.push(depoMarker);

    setMap(mapInstance);
    setMarkers(newMarkers);
  };

  const handleStoreSelect = (store) => {
    setSelectedStores(prev => {
      const isSelected = prev.find(s => s.id === store.id);
      if (isSelected) {
        return prev.filter(s => s.id !== store.id);
      } else {
        return [...prev, store];
      }
    });
  };

  const calculateDistance = async () => {
    if (selectedStores.length !== 2) {
      alert('Lütfen tam olarak 2 mağaza seçin');
      return;
    }

    // Açık olan tüm popup'ları kapat
    if (map) {
      map.closePopup();
    }

    const [store1, store2] = selectedStores;

    // Kuş bakışı mesafe hesaplama (Haversine formülü)
    const R = 6371; // Dünya'nın yarıçapı (km)
    const lat1 = store1.latitude * Math.PI / 180;
    const lat2 = store2.latitude * Math.PI / 180;
    const deltaLat = (store2.latitude - store1.latitude) * Math.PI / 180;
    const deltaLon = (store2.longitude - store1.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightDistance = R * c;

    // Global değişken olarak sakla
    window.currentStraightDistance = straightDistance;

    // Basit rota hesaplama (kuş bakışı mesafe üzerinden)
    const routeDistance = straightDistance * 1.5; // Gerçek rota genellikle daha uzun
    const routeTime = Math.round(routeDistance * 1.2); // 60 km/h ortalama hız varsayımı

    setDistanceInfo({
      store1,
      store2,
      straightDistance: Math.round(straightDistance * 100) / 100,
      routeDistance: Math.round(routeDistance * 100) / 100,
      routeTime,
      routeTimeHours: Math.floor(routeTime / 60),
      routeTimeMinutes: routeTime % 60
    });

    // Diğer pinleri gizle, sadece seçili mağazaları göster
    hideOtherMarkers();
    
    // Kuş bakışı rota çiz
    drawRealisticRoute(store1, store2);
  };

  const drawRoute = (store1, store2) => {
    if (!map) return;

    // Önceki rotayı temizle
    if (routePolyline) {
      map.removeLayer(routePolyline);
    }

    // Basit düz çizgi (gerçek uygulamada Google Directions API kullanılmalı)
    const polyline = window.L.polyline([
      [store1.latitude, store1.longitude],
      [store2.latitude, store2.longitude]
    ], {
      color: 'red',
      weight: 4,
      opacity: 0.7,
      dashArray: '10, 10'
    });

    polyline.addTo(map);
    setRoutePolyline(polyline);

    // Haritayı rotaya odakla
    map.fitBounds(polyline.getBounds());
  };

  const drawRealisticRoute = (store1, store2) => {
    if (!map) return;

    console.log('Mock rota çiziliyor');

    // Önceki rotayı temizle
    if (routePolyline) {
      map.removeLayer(routePolyline);
    }

    try {
      // Mock rota için ara noktalar oluştur
      const points = generateRealisticRoute(store1, store2);
      
      console.log('Oluşturulan mock rota noktaları:', points);
      
      const polyline = window.L.polyline(points, {
        color: '#3B82F6', // Mavi renk
        weight: 8,
        opacity: 0.9,
        dashArray: '8, 12'
      });

      polyline.addTo(map);
      setRoutePolyline(polyline);

      // Haritayı rotaya odakla
      map.fitBounds(polyline.getBounds());
    } catch (error) {
      console.error('Mock rota çizme hatası:', error);
    }
  };

  // Gerçekçi rota noktaları oluşturan fonksiyon
  const generateRealisticRoute = (store1, store2) => {
    const points = [];
    
    // Başlangıç noktası
    points.push([store1.latitude, store1.longitude]);
    
    // Ara noktalar oluştur (gerçekçi rota simülasyonu)
    const straightDistance = window.currentStraightDistance || 10;
    const numPoints = Math.max(5, Math.floor(straightDistance / 5)); // Her 5km'de bir nokta
    
    for (let i = 1; i < numPoints; i++) {
      const ratio = i / numPoints;
      
      // Kuş bakışı çizgi üzerinde ara nokta
      const lat = store1.latitude + (store2.latitude - store1.latitude) * ratio;
      const lng = store1.longitude + (store2.longitude - store1.longitude) * ratio;
      
      // Daha gerçekçi sapma ekle (yollar düz gitmez, kıvrımlı)
      const deviationLat = 0.02 * Math.sin(ratio * Math.PI * 3) * (Math.random() - 0.5);
      const deviationLng = 0.02 * Math.cos(ratio * Math.PI * 2) * (Math.random() - 0.5);
      
      // Ekstra ara noktalar ekle (daha kıvrımlı rota)
      if (i < numPoints - 1) {
        const extraLat = lat + deviationLat * 0.5;
        const extraLng = lng + deviationLng * 0.5;
        points.push([extraLat, extraLng]);
      }
      
      points.push([lat + deviationLat, lng + deviationLng]);
    }
    
    // Bitiş noktası
    points.push([store2.latitude, store2.longitude]);
    
    return points;
  };

  const clearSelection = () => {
    setSelectedStores([]);
    setDistanceInfo(null);
    
    // Açık olan tüm popup'ları kapat
    if (map) {
      map.closePopup();
    }
    
    if (routePolyline && map) {
      map.removeLayer(routePolyline);
      setRoutePolyline(null);
    }
    // Tüm pinleri tekrar göster
    showAllMarkers();
  };

  const changeMapType = (newMapType) => {
    if (!map) return;
    
    setMapType(newMapType);
    
    // Mevcut harita türünü kaldır
    Object.values(map.tileLayers).forEach(layer => {
      map.removeLayer(layer);
    });
    
    // Yeni harita türünü ekle
    map.tileLayers[newMapType].addTo(map);
  };

  // Diğer pinleri gizle, sadece seçili mağazaları göster
  const hideOtherMarkers = () => {
    if (!map || !markers.length) return;
    
    markers.forEach(marker => {
      const markerLatLng = marker.getLatLng();
      const isSelected = selectedStores.some(store => 
        store.latitude === markerLatLng.lat && store.longitude === markerLatLng.lng
      );
      
      if (isSelected) {
        // Seçili mağazaları büyüt
        const iconSize = marker.isDepo ? [60, 60] : [50, 50];
        const iconAnchor = marker.isDepo ? [30, 60] : [25, 50];
        
        marker.setIcon(window.L.divIcon({
          className: 'custom-marker',
          html: getStorePinHtml(marker.store, true),
          iconSize: iconSize,
          iconAnchor: iconAnchor
        }));
        marker.addTo(map);
      } else {
        // Diğer pinleri gizle
        map.removeLayer(marker);
      }
    });
  };

  // Tüm pinleri tekrar göster
  const showAllMarkers = () => {
    if (!map || !markers.length) return;
    
    markers.forEach(marker => {
      const markerLatLng = marker.getLatLng();
      const isSelected = selectedStores.some(store => 
        store.latitude === markerLatLng.lat && store.longitude === markerLatLng.lng
      );
      
      // Tüm pinleri normal renklerine getir
      const iconSize = marker.isDepo ? [48, 48] : [32, 32];
      const iconAnchor = marker.isDepo ? [24, 48] : [16, 32];
      
      marker.setIcon(window.L.divIcon({
        className: 'custom-marker',
        html: getStorePinHtml(marker.store, isSelected),
        iconSize: iconSize,
        iconAnchor: iconAnchor
      }));
      marker.addTo(map);
    });
  };

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full">
      <div className="flex h-full gap-2 p-1">
        {/* Sol Panel - Kontroller ve Mağaza Listesi */}
        <div className="w-72 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-lg p-2 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded flex items-center justify-center">
                <MapPin className="w-3 h-3 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900">Mağaza Uzaklık Ölçer</h1>
                <p className="text-xs text-gray-600">Mesafe hesaplama</p>
              </div>
            </div>

            {/* Arama */}
            <div className="mb-3">
              <input
                type="text"
                placeholder="Mağaza ara..."
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                onChange={(e) => {
                  const searchTerm = e.target.value.toLowerCase();
                  const filtered = stores.filter(store => 
                    store.store_name.toLowerCase().includes(searchTerm) ||
                    store.store_code.toLowerCase().includes(searchTerm)
                  );
                  setFilteredStores(filtered);
                }}
              />
            </div>

            {/* Seçilen Mağazalar */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-900">Seçilen Mağazalar</h3>
                {selectedStores.length > 0 && (
                  <button
                    onClick={clearSelection}
                    className="flex items-center space-x-1 px-2 py-1 text-xs bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm"
                  >
                    <X className="w-2 h-2" />
                    <span>Temizle</span>
                  </button>
                )}
              </div>

              {selectedStores.length === 0 ? (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Mağaza Seçilmedi</h4>
                  <p className="text-xs text-gray-500">Mesafe hesaplamak için 2 mağaza seçin</p>
                </div>
              ) : (
                <div className="space-y-2 mb-2">
                  {selectedStores.map(store => (
                    <div key={store.id} className={`flex items-center space-x-2 p-2 rounded-lg border transition-all duration-200 ${
                      store.isDepo 
                        ? 'bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 shadow-sm' 
                        : 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 shadow-sm'
                    }`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        store.isDepo 
                          ? 'bg-gradient-to-r from-purple-500 to-purple-600' 
                          : 'bg-gradient-to-r from-blue-500 to-blue-600'
                      }`}>
                        {store.isDepo ? <Warehouse className="w-3 h-3 text-white" /> : <MapPin className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-xs text-gray-900 truncate">{store.store_name}</span>
                        <p className="text-xs text-gray-500 truncate">{store.store_code}</p>
                      </div>
                      <button
                        onClick={() => handleStoreSelect(store)}
                        className={`p-1 rounded-full transition-colors ${
                          store.isDepo 
                            ? 'text-purple-600 hover:text-purple-800 hover:bg-purple-100' 
                            : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100'
                        }`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {selectedStores.length === 2 && (
                <button
                  onClick={calculateDistance}
                  className="w-full flex items-center justify-center space-x-1 px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-xs"
                >
                  <Navigation className="w-3 h-3" />
                  <span>Mesafeyi Hesapla</span>
                </button>
              )}
            </div>

            {/* Mesafe Bilgisi */}
            {distanceInfo && (
              <div className="mb-3 p-2 bg-blue-50 rounded">
                <h3 className="text-xs font-semibold text-gray-900 mb-1">Mesafe Bilgileri</h3>
                <div className="space-y-1">
                  <div className="bg-white p-1 rounded shadow-sm">
                    <div className="flex items-center space-x-1 mb-0.5">
                      <ArrowRightLeft className="w-2 h-2 text-blue-500" />
                      <span className="text-xs font-medium text-gray-900">Kuş Bakışı</span>
                    </div>
                    <p className="text-sm font-bold text-blue-600">{distanceInfo.straightDistance} km</p>
                  </div>
                  <div className="bg-white p-1 rounded shadow-sm">
                    <div className="flex items-center space-x-1 mb-0.5">
                      <Car className="w-2 h-2 text-green-500" />
                      <span className="text-xs font-medium text-gray-900">Rota</span>
                    </div>
                    <p className="text-sm font-bold text-green-600">{distanceInfo.routeDistance} km</p>
                  </div>
                  <div className="bg-white p-1 rounded shadow-sm">
                    <div className="flex items-center space-x-1 mb-0.5">
                      <Clock className="w-2 h-2 text-orange-500" />
                      <span className="text-xs font-medium text-gray-900">Süre</span>
                    </div>
                    <p className="text-sm font-bold text-orange-600">
                      {distanceInfo.routeTimeHours}s {distanceInfo.routeTimeMinutes}dk
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Mağaza Listesi */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-1 flex-shrink-0">
                <h3 className="text-xs font-semibold text-gray-900">Tüm Mağazalar</h3>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setSortBy('name')}
                    className={`px-1 py-0.5 text-xs rounded ${
                      sortBy === 'name' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    A-Z
                  </button>
                  <button
                    onClick={() => setSortBy('code')}
                    className={`px-1 py-0.5 text-xs rounded ${
                      sortBy === 'code' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    Kod
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                <div className="space-y-0.5">
                  {/* Tuzla Depo - Her zaman en üstte */}
                  <div
                    onClick={() => handleStoreSelect(tuzlaDepo)}
                    className={`p-1 rounded border cursor-pointer transition-all text-xs ${
                      selectedStores.find(s => s.id === tuzlaDepo.id)
                        ? 'bg-purple-50 border-purple-300' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-1">
                      <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-[10px]">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate text-xs">{tuzlaDepo.store_name}</h4>
                        <p className="text-xs text-gray-500 truncate">{tuzlaDepo.address}</p>
                      </div>
                    </div>
                  </div>
                  
                  {sortStores(filteredStores).map(store => {
                    const isSelected = selectedStores.find(s => s.id === store.id);
                    const color = getStoreColor(store);
                    return (
                      <div
                        key={store.id}
                        onClick={() => handleStoreSelect(store)}
                        className={`p-1 rounded border cursor-pointer transition-all text-xs ${
                          isSelected 
                            ? 'bg-blue-50 border-blue-300' 
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center space-x-1">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] bg-${color}-500`}>
                            {store.store_code}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate text-xs">{store.store_name}</h4>
                            <p className="text-xs text-gray-500 truncate">{store.address}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sağ Panel - Harita */}
        <div className="flex-1 h-full">
          <div className="bg-white rounded-lg shadow-lg p-1 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <div className="flex items-center space-x-1">
                <Info className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-600">Haritada mağazalara tıklayarak seçin</span>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => changeMapType('street')}
                  className={`px-2 py-1 text-xs rounded ${
                    mapType === 'street' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  Sokak
                </button>
                <button
                  onClick={() => changeMapType('satellite')}
                  className={`px-2 py-1 text-xs rounded ${
                    mapType === 'satellite' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  Uydu
                </button>
                <button
                  onClick={() => changeMapType('terrain')}
                  className={`px-2 py-1 text-xs rounded ${
                    mapType === 'terrain' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  Arazi
                </button>
              </div>
            </div>
            <div 
              ref={mapRef} 
              className="w-full flex-1 rounded border border-gray-200"
              style={{ zIndex: 1 }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreDistanceCalculator; 