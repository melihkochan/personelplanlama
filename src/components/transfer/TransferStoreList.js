import React, { useState, useEffect } from 'react';
import { Search, Store, Plus, MapPin, Building, SortAsc, SortDesc, User, UserCheck } from 'lucide-react';
import StoreMap from '../stores/StoreMap';
import { transferStoreService } from '../../services/supabase';

const TransferStoreList = () => {
  const [storeData, setStoreData] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState(null);
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [sortBy, setSortBy] = useState('store_code');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedCity, setSelectedCity] = useState('');
  const [newStore, setNewStore] = useState({
    store_code: '',
    store_name: '',
    region: '',
    store_type: '',
    location: '',
    city: '',
    district: '',
    phone: '',
    email: '',
    latitude: null,
    longitude: null,
    region_manager: '',
    sales_manager: ''
  });

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

  // Mağaza ekleme fonksiyonu
  const handleAddStore = async () => {
    if (!newStore.store_code || !newStore.store_name) {
      alert('Lütfen mağaza kodu ve adını girin!');
      return;
    }

    setLoading(true);
    try {
      const result = await transferStoreService.upsertStore(newStore);
      if (result.success) {
        // Veritabanından tekrar çek
        const refreshResult = await transferStoreService.getAllStores();
        if (refreshResult.success && refreshResult.data) {
          setStoreData(refreshResult.data);
          setFilteredStores(refreshResult.data);
          localStorage.setItem('transferStores', JSON.stringify(refreshResult.data));
        }
        
        setNewStore({
          store_code: '',
          store_name: '',
          region: '',
          store_type: '',
          location: '',
          city: '',
          district: '',
          phone: '',
          email: '',
          latitude: null,
          longitude: null,
          region_manager: '',
          sales_manager: ''
        });
        setShowAddStoreModal(false);
        alert('✅ Mağaza başarıyla eklendi!');
      } else {
        alert('❌ Mağaza eklenirken hata oluştu: ' + result.error);
      }
    } catch (error) {
      console.error('Mağaza ekleme hatası:', error);
      alert('Mağaza eklenirken hata oluştu!');
    } finally {
      setLoading(false);
    }
  };


  // Filtreleme ve sıralama
  useEffect(() => {
    let filtered = [...storeData];

    // Arama filtresi
    if (searchTerm) {
      filtered = filtered.filter(store =>
        store.store_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.store_code?.toString().includes(searchTerm) ||
        store.region?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Şehir filtresi
    if (selectedCity) {
      filtered = filtered.filter(store => {
        // Önce city'den kontrol et
        if (store.city?.toLowerCase().includes(selectedCity.toLowerCase())) {
          return true;
        }
        // Eğer city yoksa, region'dan şehir çıkar ve kontrol et
        if (!store.city && store.region) {
          const cityFromRegion = store.region.toString().split('-')[0].trim().toLowerCase();
          return cityFromRegion.includes(selectedCity.toLowerCase());
        }
        return false;
      });
    }

    // Sıralama
    filtered.sort((a, b) => {
      let aValue = a[sortBy] || '';
      let bValue = b[sortBy] || '';
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredStores(filtered);
  }, [storeData, searchTerm, selectedCity, sortBy, sortOrder]);

  // Şehir listesi - sadece şehir adlarını göster, bölge müdürlerini değil
  const cities = Array.from(new Set(
    storeData
      .map(s => {
        // Önce region'dan şehir çıkarmaya çalış (daha güvenilir)
        if (s.region) {
          const cityMatch = s.region.toString().split('-')[0].trim();
          if (cityMatch) {
            return cityMatch;
          }
        }
        // Eğer region'dan çıkarılamazsa city'yi kullan
        if (s.city) {
          // City değeri boş değilse ve şehir adı gibi görünüyorsa kullan
          return s.city;
        }
        return null;
      })
      .filter(Boolean)
  )).sort();

  // Sıralama fonksiyonu
  const sortStores = (stores, sortBy, sortOrder) => {
    return [...stores].sort((a, b) => {
      let aValue = a[sortBy] || '';
      let bValue = b[sortBy] || '';
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const sortedStores = sortStores(filteredStores, sortBy, sortOrder);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sol Panel - Mağaza Listesi */}
      <div className="w-1/2 p-6 overflow-y-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                  <Store className="w-5 h-5 text-white" />
                </div>
                Aktarma Mağaza Listesi
              </h1>
              <p className="text-sm text-gray-600 mt-1">Toplam {storeData.length} Mağaza</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddStoreModal(true)}
                className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:from-orange-600 hover:to-red-700 transition-all duration-300 text-sm shadow-md"
              >
                <Plus className="w-4 h-4" />
                Mağaza Ekle
              </button>
            </div>
          </div>

          {/* Search and Sort */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Mağaza ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 text-sm"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700">Sıralama:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 text-xs"
              >
                <option value="store_code">Mağaza Kodu</option>
                <option value="store_name">Mağaza Adı</option>
                <option value="region">Bölge</option>
                <option value="location">Konum</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-300 text-xs"
              >
                {sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />}
                {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
              </button>
            </div>
          </div>
        </div>

        {/* Store Cards */}
        <div className="space-y-2">
          {sortedStores.map((store, index) => (
            <div 
              key={store.id || store.store_code || index} 
              className={`bg-white rounded-lg p-3 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border-2 ${
                selectedStore?.store_code === store.store_code ? 'border-orange-500 bg-orange-50' : 'border-transparent'
              }`}
              onClick={() => setSelectedStore(store)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                    <Store className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{store.store_name || 'Mağaza'}</h3>
                    <p className="text-gray-600 text-xs">{store.store_code || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Building className="w-3 h-3 text-orange-600" />
                  <span className="text-gray-500">Bölge:</span>
                  <span className="font-medium">{store.region || '-'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-orange-600" />
                  <span className="text-gray-500">Konum:</span>
                  <span className="font-medium">{store.location || store.city || '-'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {sortedStores.length === 0 && (
          <div className="text-center py-8">
            <Store className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 text-sm">Mağaza bulunamadı</p>
          </div>
        )}
      </div>

      {/* Sağ Panel - Detay ve Harita */}
      <div className="w-1/2 p-4 bg-white border-l border-gray-200">
        {selectedStore ? (
          <div className="h-full flex flex-col">
            {/* Mağaza Detayları */}
            <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-xl p-4 text-white mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{selectedStore.store_name}</h2>
                    <p className="text-orange-100 text-xs">Kod: {selectedStore.store_code}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-orange-200">Bölge</p>
                  <p className="font-semibold">{selectedStore.region || 'Belirtilmemiş'}</p>
                </div>
                <div>
                  <p className="text-orange-200">Tür</p>
                  <p className="font-semibold">{selectedStore.store_type || 'Belirtilmemiş'}</p>
                </div>
                <div>
                  <p className="text-orange-200">Konum</p>
                  <p className="font-semibold">{selectedStore.location || selectedStore.city || 'Belirtilmemiş'}</p>
                </div>
                <div>
                  <p className="text-orange-200">Koordinatlar</p>
                  <p className="font-semibold">
                    {selectedStore.latitude && selectedStore.longitude 
                      ? `${selectedStore.latitude.toFixed(6)}, ${selectedStore.longitude.toFixed(6)}`
                      : 'Belirtilmemiş'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Müdür Bilgileri */}
            {(selectedStore.region_manager || selectedStore.sales_manager) && (
              <div className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-500 mb-6 border border-gray-200/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl">
                    <UserCheck className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    Yönetim Bilgileri
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bölge Müdürü */}
                  {selectedStore.region_manager && (
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200/50 hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg">
                          <UserCheck className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="font-semibold text-gray-800">Bölge Müdürü</h4>
                      </div>
                      <p className="text-lg font-bold text-orange-700 bg-white/50 rounded-lg px-3 py-2 border border-orange-200">
                        {selectedStore.region_manager}
                      </p>
                    </div>
                  )}

                  {/* Satış Müdürü */}
                  {selectedStore.sales_manager && (
                    <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border border-red-200/50 hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-gradient-to-r from-red-500 to-red-600 rounded-lg">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="font-semibold text-gray-800">Satış Müdürü</h4>
                      </div>
                      <p className="text-lg font-bold text-red-700 bg-white/50 rounded-lg px-3 py-2 border border-red-200">
                        {selectedStore.sales_manager}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Harita */}
            <div className="flex-1">
              <StoreMap 
                latitude={selectedStore.latitude}
                longitude={selectedStore.longitude}
                storeName={selectedStore.store_name}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Mağaza seçin</p>
              <p className="text-sm text-gray-500 mt-2">Detayları görmek için sol panelden bir mağaza seçin</p>
            </div>
          </div>
        )}
      </div>

      {/* Mağaza Ekleme Modal */}
      {showAddStoreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full m-4 max-h-screen overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">Yeni Mağaza Ekle</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mağaza Kodu *</label>
                <input
                  type="text"
                  value={newStore.store_code}
                  onChange={(e) => setNewStore({...newStore, store_code: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mağaza Adı *</label>
                <input
                  type="text"
                  value={newStore.store_name}
                  onChange={(e) => setNewStore({...newStore, store_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Mağaza Adı"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bölge</label>
                <input
                  type="text"
                  value={newStore.region}
                  onChange={(e) => setNewStore({...newStore, region: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="İSTANBUL-AVR"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mağaza Tipi</label>
                <select
                  value={newStore.store_type}
                  onChange={(e) => setNewStore({...newStore, store_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Mağaza tipi seçin</option>
                  <option value="AVM">AVM</option>
                  <option value="Cadde">Cadde</option>
                  <option value="Beauty">Beauty</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Şehir</label>
                <input
                  type="text"
                  value={newStore.city}
                  onChange={(e) => setNewStore({...newStore, city: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="İstanbul"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">İlçe</label>
                <input
                  type="text"
                  value={newStore.district}
                  onChange={(e) => setNewStore({...newStore, district: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Kadıköy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Konum</label>
                <input
                  type="text"
                  value={newStore.location}
                  onChange={(e) => setNewStore({...newStore, location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Adres"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                <input
                  type="text"
                  value={newStore.phone}
                  onChange={(e) => setNewStore({...newStore, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0212 123 45 67"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">E-posta</label>
                <input
                  type="email"
                  value={newStore.email}
                  onChange={(e) => setNewStore({...newStore, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="ornek@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bölge Müdürü</label>
                <input
                  type="text"
                  value={newStore.region_manager}
                  onChange={(e) => setNewStore({...newStore, region_manager: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ahmet Yılmaz"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Satış Müdürü</label>
                <input
                  type="text"
                  value={newStore.sales_manager}
                  onChange={(e) => setNewStore({...newStore, sales_manager: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Mehmet Demir"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Enlem</label>
                <input
                  type="number"
                  step="any"
                  value={newStore.latitude || ''}
                  onChange={(e) => setNewStore({...newStore, latitude: parseFloat(e.target.value) || null})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="41.0082"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Boylam</label>
                <input
                  type="number"
                  step="any"
                  value={newStore.longitude || ''}
                  onChange={(e) => setNewStore({...newStore, longitude: parseFloat(e.target.value) || null})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="28.9784"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddStoreModal(false);
                  setNewStore({
                    store_code: '',
                    store_name: '',
                    region: '',
                    store_type: '',
                    location: '',
                    city: '',
                    district: '',
                    phone: '',
                    email: '',
                    latitude: null,
                    longitude: null,
                    region_manager: '',
                    sales_manager: ''
                  });
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleAddStore}
                disabled={loading}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Ekleniyor...' : 'Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferStoreList;
