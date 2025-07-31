import React, { useState, useEffect } from 'react';
import { Search, Store, Plus, Edit3, Trash2, MapPin, User, UserCheck, Building, Phone, Mail, Users, SortAsc, SortDesc, Map } from 'lucide-react';
import { getAllStores, addStoreWithAudit, updateStoreWithAudit, deleteStoreWithAudit } from '../../services/supabase';
import StoreMap from './StoreMap';

const StoreList = ({ storeData: propStoreData, currentUser }) => {
  const [storeData, setStoreData] = useState(propStoreData || []);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('store_code');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [newStore, setNewStore] = useState({
    store_code: '',
    store_name: '',
    region: '',
    store_type: 'Standart',
    location: '',
    region_manager: '',
    sales_manager: '',
    phone: '',
    email: '',
    staff_count: 0,
    latitude: null,
    longitude: null
  });

  useEffect(() => {
    const loadStoreData = async () => {
      setLoading(true);
      try {
        const result = await getAllStores();
        if (result.success) {
          setStoreData(result.data);
        }
      } catch (error) {
        console.error('❌ Mağaza veri yükleme hatası:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStoreData();
  }, [propStoreData]);

  // Veri yenileme
  const refreshStoreData = async () => {
    setLoading(true);
    try {
      const result = await getAllStores();
      if (result.success) {
        setStoreData(result.data);
      }
    } catch (error) {
      console.error('❌ Mağaza veri yenileme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

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

  // Arama filtresi ve sıralama
  const filteredStores = sortStores(
    storeData.filter(store => {
      const searchLower = searchTerm.toLowerCase();
      return (
        store.store_code?.toLowerCase().includes(searchLower) ||
        store.store_name?.toLowerCase().includes(searchLower) ||
        store.region?.toLowerCase().includes(searchLower) ||
        store.location?.toLowerCase().includes(searchLower) ||
        store.region_manager?.toLowerCase().includes(searchLower) ||
        store.sales_manager?.toLowerCase().includes(searchLower)
      );
    }),
    sortBy,
    sortOrder
  );

  // Mağaza ekleme
  const handleAddStore = async () => {
    if (!newStore.store_code || !newStore.store_name) {
      alert('Lütfen mağaza kodu ve adını girin!');
      return;
    }

    setLoading(true);
    try {
      const result = await addStoreWithAudit(newStore, currentUser);
      if (result.success) {
        setNewStore({
          store_code: '',
          store_name: '',
          region: '',
          store_type: 'Standart',
          location: '',
          region_manager: '',
          sales_manager: '',
          phone: '',
          email: '',
          staff_count: 0,
          latitude: null,
          longitude: null
        });
        setShowAddStoreModal(false);
        await refreshStoreData();
        alert('Mağaza başarıyla eklendi!');
      } else {
        alert('Mağaza eklenirken hata oluştu: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Mağaza ekleme hatası:', error);
      alert('Mağaza eklenirken hata oluştu!');
    } finally {
      setLoading(false);
    }
  };

  // Mağaza düzenleme
  const handleUpdateStore = async (storeId) => {
    setLoading(true);
    try {
      const result = await updateStoreWithAudit(storeId, editingStore, currentUser);
      if (result.success) {
        setEditingStore(null);
        await refreshStoreData();
        alert('Mağaza başarıyla güncellendi!');
      } else {
        alert('Mağaza güncellenirken hata oluştu: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Mağaza güncelleme hatası:', error);
      alert('Mağaza güncellenirken hata oluştu!');
    } finally {
      setLoading(false);
    }
  };

  // Mağaza silme
  const handleDeleteStore = async (storeId) => {
    if (!window.confirm('Bu mağazayı silmek istediğinizden emin misiniz?')) {
      return;
    }

    setLoading(true);
    try {
      const result = await deleteStoreWithAudit(storeId, currentUser);
      if (result.success) {
        await refreshStoreData();
        alert('Mağaza başarıyla silindi!');
      } else {
        alert('Mağaza silinirken hata oluştu: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Mağaza silme hatası:', error);
      alert('Mağaza silinirken hata oluştu!');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sol Panel - Mağaza Listesi */}
      <div className="w-1/2 p-6 overflow-y-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <Store className="w-5 h-5 text-white" />
                </div>
                Mağaza Listesi
              </h1>
              <p className="text-sm text-gray-600 mt-1">İstanbul Anadolu'da Toplam {storeData.length} Mağaza</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddStoreModal(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:from-purple-600 hover:to-pink-700 transition-all duration-300 text-sm"
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
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-sm"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700">Sıralama:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-xs"
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
          {filteredStores.map((store, index) => (
            <div 
              key={index} 
              className={`bg-white rounded-lg p-3 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border-2 ${
                selectedStore?.id === store.id ? 'border-purple-500 bg-purple-50' : 'border-transparent'
              }`}
              onClick={() => setSelectedStore(store)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <Store className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{store.store_name || store.magaza_adi || 'Mağaza'}</h3>
                    <p className="text-gray-600 text-xs">{store.store_code || store.kod}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingStore(store);
                    }}
                    className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteStore(store.id);
                    }}
                    className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Building className="w-3 h-3 text-purple-600" />
                  <span className="text-gray-500">Bölge:</span>
                  <span className="font-medium">{store.region || store.bolge || '-'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-purple-600" />
                  <span className="text-gray-500">Konum:</span>
                  <span className="font-medium">{store.location || store.konum || '-'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredStores.length === 0 && (
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
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl p-4 text-white mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{selectedStore.store_name || selectedStore.magaza_adi}</h2>
                    <p className="text-purple-100 text-xs">Kod: {selectedStore.store_code || selectedStore.kod}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-purple-200">Bölge</p>
                  <p className="font-semibold">{selectedStore.region || selectedStore.bolge || 'Belirtilmemiş'}</p>
                </div>
                <div>
                  <p className="text-purple-200">Tür</p>
                  <p className="font-semibold">{selectedStore.store_type || selectedStore.tip || 'Standart'}</p>
                </div>
                <div>
                  <p className="text-purple-200">Konum</p>
                  <p className="font-semibold">{selectedStore.location || selectedStore.konum || 'Belirtilmemiş'}</p>
                </div>
                <div>
                  <p className="text-purple-200">Koordinatlar</p>
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
            <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Yönetim Bilgileri</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-gray-500 text-sm">Bölge Müdürü</p>
                    <p className="font-medium">{selectedStore.region_manager || selectedStore.bolge_muduru || 'Belirtilmemiş'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-gray-500 text-sm">Satış Müdürü</p>
                    <p className="font-medium">{selectedStore.sales_manager || selectedStore.satis_muduru || 'Belirtilmemiş'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Harita */}
            <div className="flex-1">
              <StoreMap 
                latitude={selectedStore.latitude}
                longitude={selectedStore.longitude}
                storeName={selectedStore.store_name || selectedStore.magaza_adi}
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

      {/* Add Store Modal */}
      {showAddStoreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full m-4 max-h-screen overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">Yeni Mağaza Ekle</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mağaza Kodu</label>
                <input
                  type="text"
                  value={newStore.store_code}
                  onChange={(e) => setNewStore({...newStore, store_code: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mağaza Adı</label>
                <input
                  type="text"
                  value={newStore.store_name}
                  onChange={(e) => setNewStore({...newStore, store_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Mağaza Adı"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bölge</label>
                <input
                  type="text"
                  value={newStore.region}
                  onChange={(e) => setNewStore({...newStore, region: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="İstanbul"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mağaza Tipi</label>
                <select
                  value={newStore.store_type}
                  onChange={(e) => setNewStore({...newStore, store_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="Standart">Standart</option>
                  <option value="AVM">AVM</option>
                  <option value="Cadde">Cadde</option>
                  <option value="Beauty">Beauty</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Konum</label>
                <input
                  type="text"
                  value={newStore.location}
                  onChange={(e) => setNewStore({...newStore, location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Şişli/İstanbul"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bölge Müdürü</label>
                <input
                  type="text"
                  value={newStore.region_manager}
                  onChange={(e) => setNewStore({...newStore, region_manager: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ahmet Yılmaz"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Satış Müdürü</label>
                <input
                  type="text"
                  value={newStore.sales_manager}
                  onChange={(e) => setNewStore({...newStore, sales_manager: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="28.9784"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddStoreModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleAddStore}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Store Modal */}
      {editingStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full m-4 max-h-screen overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">Mağaza Düzenle</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mağaza Kodu</label>
                <input
                  type="text"
                  value={editingStore.store_code || ''}
                  onChange={(e) => setEditingStore({...editingStore, store_code: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mağaza Adı</label>
                <input
                  type="text"
                  value={editingStore.store_name || ''}
                  onChange={(e) => setEditingStore({...editingStore, store_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bölge</label>
                <input
                  type="text"
                  value={editingStore.region || ''}
                  onChange={(e) => setEditingStore({...editingStore, region: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mağaza Tipi</label>
                <select
                  value={editingStore.store_type || ''}
                  onChange={(e) => setEditingStore({...editingStore, store_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="Standart">Standart</option>
                  <option value="AVM">AVM</option>
                  <option value="Cadde">Cadde</option>
                  <option value="Beauty">Beauty</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Konum</label>
                <input
                  type="text"
                  value={editingStore.location || ''}
                  onChange={(e) => setEditingStore({...editingStore, location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bölge Müdürü</label>
                <input
                  type="text"
                  value={editingStore.region_manager || ''}
                  onChange={(e) => setEditingStore({...editingStore, region_manager: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Satış Müdürü</label>
                <input
                  type="text"
                  value={editingStore.sales_manager || ''}
                  onChange={(e) => setEditingStore({...editingStore, sales_manager: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Enlem</label>
                <input
                  type="number"
                  step="any"
                  value={editingStore.latitude || ''}
                  onChange={(e) => setEditingStore({...editingStore, latitude: parseFloat(e.target.value) || null})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Boylam</label>
                <input
                  type="number"
                  step="any"
                  value={editingStore.longitude || ''}
                  onChange={(e) => setEditingStore({...editingStore, longitude: parseFloat(e.target.value) || null})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingStore(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => handleUpdateStore(editingStore.id)}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                Güncelle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreList; 