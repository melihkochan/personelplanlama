import React, { useState, useEffect } from 'react';
import { Search, Car, Plus, Edit3, Trash2, Save, X, Truck, User, Users, Wrench } from 'lucide-react';
import { getAllVehicles, addVehicleWithAudit, updateVehicleWithAudit, deleteVehicleWithAudit } from '../../services/supabase';

const VehicleList = ({ vehicleData: propVehicleData, currentUser }) => {
  const [vehicleData, setVehicleData] = useState(propVehicleData || []);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [newVehicle, setNewVehicle] = useState({
    license_plate: '',
    vehicle_type: 'Kamyon',
    first_driver: '',
    second_driver: ''
  });

  useEffect(() => {
    const loadVehicleData = async () => {
      setLoading(true);
      try {
        const result = await getAllVehicles();
        if (result.success) {
          console.log('✅ Araç verileri veritabanından yüklendi:', result.data.length, 'kayıt');
          setVehicleData(result.data);
        }
      } catch (error) {
        console.error('❌ Araç veri yükleme hatası:', error);
      } finally {
        setLoading(false);
      }
    };

    loadVehicleData();
  }, [propVehicleData]);

  // Veri yenileme
  const refreshVehicleData = async () => {
    setLoading(true);
    try {
      const result = await getAllVehicles();
      if (result.success) {
        setVehicleData(result.data);
      }
    } catch (error) {
      console.error('❌ Araç veri yenileme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Arama filtresi
  const filteredVehicles = vehicleData.filter(vehicle => {
    const searchLower = searchTerm.toLowerCase();
    return (
      vehicle.license_plate?.toLowerCase().includes(searchLower) ||
      vehicle.vehicle_type?.toLowerCase().includes(searchLower) ||
      vehicle.first_driver?.toLowerCase().includes(searchLower) ||
      vehicle.second_driver?.toLowerCase().includes(searchLower)
    );
  });

  // Araç ekleme
  const handleAddVehicle = async () => {
    if (!newVehicle.license_plate || !newVehicle.vehicle_type) {
      alert('Lütfen plaka ve araç tipini girin!');
      return;
    }

    setLoading(true);
    try {
      const result = await addVehicleWithAudit(newVehicle, currentUser);
      if (result.success) {
        setNewVehicle({
          license_plate: '',
          vehicle_type: 'Kamyon',
          first_driver: '',
          second_driver: ''
        });
        setShowAddVehicleModal(false);
        await refreshVehicleData();
        alert('Araç başarıyla eklendi!');
      } else {
        alert('Araç eklenirken hata oluştu: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Araç ekleme hatası:', error);
      alert('Araç eklenirken hata oluştu!');
    } finally {
      setLoading(false);
    }
  };

  // Araç düzenleme
  const handleUpdateVehicle = async (vehicleId) => {
    setLoading(true);
    try {
      const result = await updateVehicleWithAudit(vehicleId, editingVehicle, currentUser);
      if (result.success) {
        setEditingVehicle(null);
        await refreshVehicleData();
        alert('Araç başarıyla güncellendi!');
      } else {
        alert('Araç güncellenirken hata oluştu: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Araç güncelleme hatası:', error);
      alert('Araç güncellenirken hata oluştu!');
    } finally {
      setLoading(false);
    }
  };

  // Araç silme
  const handleDeleteVehicle = async (vehicleId) => {
    if (!window.confirm('Bu aracı silmek istediğinizden emin misiniz?')) {
      return;
    }

    setLoading(true);
    try {
      const result = await deleteVehicleWithAudit(vehicleId, currentUser);
      if (result.success) {
        await refreshVehicleData();
        alert('Araç başarıyla silindi!');
      } else {
        alert('Araç silinirken hata oluştu: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Araç silme hatası:', error);
      alert('Araç silinirken hata oluştu!');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
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
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Car className="w-6 h-6 text-white" />
              </div>
              Araç Listesi
            </h1>
            <p className="text-gray-600 mt-2">Sisteme kayıtlı {vehicleData.length} araç</p>
          </div>
          
          <button
            onClick={() => setShowAddVehicleModal(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            Araç Ekle
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Plaka, tip veya şoför ismi ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
          />
        </div>
      </div>

      {/* Vehicle Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVehicles.map((vehicle, index) => (
          <div key={index} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{vehicle.license_plate}</h3>
                  <p className="text-gray-600 text-sm">{vehicle.vehicle_type}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingVehicle(vehicle)}
                  className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteVehicle(vehicle.id)}
                  className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {/* Araç Tipi */}
              <div className="flex items-center gap-2 text-sm">
                <Wrench className="w-4 h-4 text-blue-600" />
                <div>
                  <span className="text-gray-500">Araç Tipi:</span>
                  <span className="font-medium text-gray-900 ml-2">
                    {vehicle.vehicle_type || 'Belirtilmemiş'}
                  </span>
                </div>
              </div>

              {/* 1. Şoför */}
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-green-600" />
                <div>
                  <span className="text-gray-500">1. Şoför:</span>
                  <span className="font-medium text-gray-900 ml-2">
                    {vehicle.first_driver || 'Belirtilmemiş'}
                  </span>
                </div>
              </div>

              {/* 2. Şoför */}
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-purple-600" />
                <div>
                  <span className="text-gray-500">2. Şoför:</span>
                  <span className="font-medium text-gray-900 ml-2">
                    {vehicle.second_driver || 'Belirtilmemiş'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredVehicles.length === 0 && (
        <div className="text-center py-12">
          <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Araç bulunamadı</p>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full m-4">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">Yeni Araç Ekle</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plaka</label>
                <input
                  type="text"
                  value={newVehicle.license_plate}
                  onChange={(e) => setNewVehicle({...newVehicle, license_plate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="34 ABC 123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Araç Tipi</label>
                <select
                  value={newVehicle.vehicle_type}
                  onChange={(e) => setNewVehicle({...newVehicle, vehicle_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Kamyon">Kamyon</option>
                  <option value="Kamyonet">Kamyonet</option>
                  <option value="Panelvan">Panelvan</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">1. Şoför</label>
                <input
                  type="text"
                  value={newVehicle.first_driver}
                  onChange={(e) => setNewVehicle({...newVehicle, first_driver: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Şoför adı"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">2. Şoför</label>
                <input
                  type="text"
                  value={newVehicle.second_driver}
                  onChange={(e) => setNewVehicle({...newVehicle, second_driver: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Şoför adı (isteğe bağlı)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddVehicleModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleAddVehicle}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Vehicle Modal */}
      {editingVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full m-4">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">Araç Düzenle</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plaka</label>
                <input
                  type="text"
                  value={editingVehicle.license_plate}
                  onChange={(e) => setEditingVehicle({...editingVehicle, license_plate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Araç Tipi</label>
                <select
                  value={editingVehicle.vehicle_type}
                  onChange={(e) => setEditingVehicle({...editingVehicle, vehicle_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Kamyon">Kamyon</option>
                  <option value="Kamyonet">Kamyonet</option>
                  <option value="Panelvan">Panelvan</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">1. Şoför</label>
                <input
                  type="text"
                  value={editingVehicle.first_driver}
                  onChange={(e) => setEditingVehicle({...editingVehicle, first_driver: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">2. Şoför</label>
                <input
                  type="text"
                  value={editingVehicle.second_driver}
                  onChange={(e) => setEditingVehicle({...editingVehicle, second_driver: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingVehicle(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => handleUpdateVehicle(editingVehicle.id)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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

export default VehicleList; 