import React, { useState, useEffect } from 'react';
import { Search, Store, Plus, Edit3, Trash2, MapPin, User, UserCheck, Building, Phone, Mail, Users, SortAsc, SortDesc } from 'lucide-react';
import { getAllStores, addStore, updateStore, deleteStore } from '../services/supabase';

const StoreList = ({ storeData: propStoreData }) => {
  const [storeData, setStoreData] = useState(propStoreData || []);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('store_code');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
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
    staff_count: 0
  });

  useEffect(() => {
    const loadStoreData = async () => {
      setLoading(true);
      try {
        const result = await getAllStores();
        if (result.success) {
          console.log('✅ Mağaza verileri veritabanından yüklendi:', result.data.length, 'kayıt');
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
      
      // String değerler için
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
      const result = await addStore(newStore);
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
          staff_count: 0
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
      const result = await updateStore(storeId, editingStore);
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
      const result = await deleteStore(storeId);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <Store className="w-6 h-6 text-white" />
              </div>
              Mağaza Listesi
            </h1>
            <p className="text-gray-600 mt-2">Sisteme kayıtlı {storeData.length} mağaza</p>
          </div>
          
          <button
            onClick={() => setShowAddStoreModal(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:from-purple-600 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            Mağaza Ekle
          </button>
        </div>

        {/* Search and Sort */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Mağaza kodu, adı, bölge, konum veya müdür ismi ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
            />
          </div>
          
          {/* Sort Controls */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Sıralama:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-sm"
            >
              <option value="store_code">Mağaza Kodu</option>
              <option value="store_name">Mağaza Adı</option>
              <option value="region">Bölge</option>
              <option value="location">Konum</option>
              <option value="region_manager">Bölge Müdürü</option>
              <option value="sales_manager">Satış Müdürü</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-300 text-sm"
            >
              {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
            </button>
          </div>
        </div>
      </div>

      {/* Store Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStores.map((store, index) => (
          <div key={index} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Store className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{store.store_name || store.magaza_adi || 'Mağaza'}</h3>
                  <p className="text-gray-600 text-sm font-medium">{store.store_code || store.kod}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingStore(store)}
                  className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteStore(store.id)}
                  className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {/* Bölge ve Tür */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Building className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="text-gray-500">Bölge:</p>
                    <p className="font-medium text-gray-900">{store.region || store.bolge || 'Belirtilmemiş'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Store className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="text-gray-500">Tür:</p>
                    <p className="font-medium text-gray-900">{store.store_type || store.tip || 'Standart'}</p>
                  </div>
                </div>
              </div>

              {/* Konum */}
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-gray-500">Konum:</p>
                  <p className="font-medium text-gray-900">{store.location || store.konum || 'Belirtilmemiş'}</p>
                </div>
              </div>

              {/* Bölge Müdürü */}
              <div className="flex items-center gap-2 text-sm">
                <UserCheck className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-gray-500">Bölge Müdürü:</p>
                  <p className="font-medium text-gray-900">{store.region_manager || store.bolge_muduru || 'Belirtilmemiş'}</p>
                </div>
              </div>

              {/* Satış Müdürü */}
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-gray-500">Satış Müdürü:</p>
                  <p className="font-medium text-gray-900">{store.sales_manager || store.satis_muduru || 'Belirtilmemiş'}</p>
                </div>
              </div>

           
            </div>
          </div>
        ))}
      </div>

      {filteredStores.length === 0 && (
        <div className="text-center py-12">
          <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Mağaza bulunamadı</p>
        </div>
      )}

      {/* Add Store Modal */}
      {showAddStoreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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