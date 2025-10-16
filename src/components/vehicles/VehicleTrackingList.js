import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2, 
  Calendar,
  Car,
  User,
  MapPin,
  Clock,
  RefreshCw,
  X
} from 'lucide-react';
import { vehicleTrackingService } from '../../services/supabase';

const VehicleTrackingList = ({ vehicleData = [], personnelData = [], currentUser }) => {
  const [trackingData, setTrackingData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedTracking, setSelectedTracking] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingTracking, setEditingTracking] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editingEntries, setEditingEntries] = useState([]);

  // Veri yükleme fonksiyonu
  const loadTrackingData = async () => {
    setLoading(true);
    try {
      const result = await vehicleTrackingService.getTrackingRecords();
      if (result.success) {
        setTrackingData(result.data);
        setFilteredData(result.data);
      } else {
        console.error('Takip verileri yüklenemedi:', result.error);
        setTrackingData([]);
        setFilteredData([]);
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      setTrackingData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  // Component mount olduğunda veri yükle
  useEffect(() => {
    loadTrackingData();
  }, []);

  // Filtreleme ve arama
  useEffect(() => {
    let filtered = [...(trackingData || [])];

    // Arama terimi
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.vehicle_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.region.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Tarih filtresi
    if (selectedDate) {
      filtered = filtered.filter(item => item.date === selectedDate);
    }

    // Araç filtresi
    if (selectedVehicle) {
      filtered = filtered.filter(item => item.vehicle_plate === selectedVehicle);
    }

    // Şoför filtresi
    if (selectedDriver) {
      filtered = filtered.filter(item => item.driver_name === selectedDriver);
    }

    // Bölge filtresi
    if (selectedRegion) {
      filtered = filtered.filter(item => item.region === selectedRegion);
    }

    // Sıralama
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'vehicle_plate':
          aValue = a.vehicle_plate;
          bValue = b.vehicle_plate;
          break;
        case 'driver_name':
          aValue = a.driver_name;
          bValue = b.driver_name;
          break;
        case 'region':
          aValue = a.region;
          bValue = b.region;
          break;
        default:
          aValue = a.date;
          bValue = b.date;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredData(filtered);
  }, [trackingData, searchTerm, selectedDate, selectedVehicle, selectedDriver, selectedRegion, sortBy, sortOrder]);

  // Bölge adlarını düzenle
  const getRegionDisplayName = (region) => {
    const regionNames = {
      'ISTANBUL_AVR': 'İstanbul Avrupa',
      'ISTANBUL_AND': 'İstanbul Anadolu',
      'ANKARA': 'Ankara',
      'IZMIR': 'İzmir',
      'BURSA': 'Bursa',
      'ANTALYA': 'Antalya',
      'ADANA': 'Adana'
    };
    return regionNames[region] || region;
  };

  // İşlem fonksiyonları
  const handleView = (tracking) => {
    setSelectedTracking(tracking);
    setShowDetailModal(true);
  };

  const handleEdit = (tracking) => {
    setEditingTracking(tracking);
    setEditFormData({
      date: tracking.date,
      vehicle_plate: tracking.vehicle_plate,
      driver_name: tracking.driver_name,
      region: tracking.region,
      notes: tracking.notes || ''
    });
    setEditingEntries(tracking.vehicle_tracking_entries || []);
    setShowEditModal(true);
  };

  const handleDelete = async (trackingId) => {
    if (window.confirm('Bu takip kaydını silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz!')) {
      try {
        console.log('Silme işlemi başlatılıyor:', trackingId);
        const result = await vehicleTrackingService.deleteTracking(trackingId);
        console.log('Silme sonucu:', result);
        
        if (result.success) {
          // Manuel olarak listeden kaldır (daha hızlı)
          setTrackingData(prev => prev.filter(item => item.id !== trackingId));
          setFilteredData(prev => prev.filter(item => item.id !== trackingId));
          
          alert('Takip kaydı başarıyla silindi!');
          
          // Alternatif: Verileri yeniden yükle
          // loadTrackingData();
        } else {
          alert('Silme işlemi başarısız: ' + result.error);
        }
      } catch (error) {
        console.error('Silme hatası:', error);
        alert('Silme işlemi sırasında hata oluştu: ' + error.message);
      }
    }
  };

  // Excel export
  const exportToExcel = () => {
    // Excel export fonksiyonu burada implement edilecek
    console.log('Excel export:', filteredData);
  };

  // İstatistikler hesapla
  const stats = {
    totalRecords: (filteredData || []).length,
    totalEntries: (filteredData || []).reduce((sum, item) => sum + (item.vehicle_tracking_entries?.length || 0), 0),
    totalKm: (filteredData || []).reduce((sum, item) => {
      const entries = item.vehicle_tracking_entries || [];
      if (entries.length > 0) {
        const firstKm = entries[0].departure_km || 0;
        const lastKm = entries[entries.length - 1].departure_km || 0;
        return sum + (lastKm - firstKm);
      }
      return sum;
    }, 0),
    uniqueVehicles: [...new Set((filteredData || []).map(item => item.vehicle_plate))].length,
    uniqueDrivers: [...new Set((filteredData || []).map(item => item.driver_name))].length,
    regions: [...new Set((filteredData || []).map(item => item.region))]
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="w-full">
        {/* Başlık */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Araç Takip Listesi</h1>
          <p className="text-gray-600">Araç hareketlerini ve takip verilerini görüntüleyin</p>
        </div>

        {/* Filtreler */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Araç plakası, şoför ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tüm Araçlar</option>
                {[...new Set((trackingData || []).map(item => item.vehicle_plate))].map(vehicle => (
                  <option key={vehicle} value={vehicle}>{vehicle}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tüm Şoförler</option>
                {[...new Set((trackingData || []).map(item => item.driver_name))].map(driver => (
                  <option key={driver} value={driver}>{driver}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tüm Bölgeler</option>
                {[...new Set((trackingData || []).map(item => item.region))].map(region => (
                  <option key={region} value={region}>{getRegionDisplayName(region)}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date-desc">Tarih (Yeni → Eski)</option>
                <option value="date-asc">Tarih (Eski → Yeni)</option>
                <option value="vehicle_plate-asc">Araç Plakası (A → Z)</option>
                <option value="vehicle_plate-desc">Araç Plakası (Z → A)</option>
                <option value="driver_name-asc">Şoför (A → Z)</option>
                <option value="driver_name-desc">Şoför (Z → A)</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={loadTrackingData}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Yenile
              </button>
              <button
                onClick={exportToExcel}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Excel
              </button>
            </div>
          </div>
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Car className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Toplam Kayıt</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRecords}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <MapPin className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Toplam Giriş</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEntries}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Toplam KM</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalKm.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Car className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Araç Sayısı</p>
                <p className="text-2xl font-bold text-gray-900">{stats.uniqueVehicles}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <User className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Şoför Sayısı</p>
                <p className="text-2xl font-bold text-gray-900">{stats.uniqueDrivers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <MapPin className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Bölge Sayısı</p>
                <p className="text-2xl font-bold text-gray-900">{stats.regions.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bölge Bazlı Analiz */}
        {stats.regions.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-600" />
              Bölge Bazlı Analiz
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(stats.regions || []).map(region => {
                const regionData = (filteredData || []).filter(item => item.region === region);
                const regionEntries = regionData.reduce((sum, item) => sum + (item.vehicle_tracking_entries?.length || 0), 0);
                const regionKm = regionData.reduce((sum, item) => {
                  const entries = item.vehicle_tracking_entries || [];
                  if (entries.length > 0) {
                    const firstKm = entries[0].departure_km || 0;
                    const lastKm = entries[entries.length - 1].departure_km || 0;
                    return sum + (lastKm - firstKm);
                  }
                  return sum;
                }, 0);
                
                return (
                  <div key={region} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{getRegionDisplayName(region)}</h4>
                      <span className="text-sm text-gray-500">{regionData.length} kayıt</span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Toplam Giriş:</span>
                        <span className="font-medium">{regionEntries}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Toplam KM:</span>
                        <span className="font-medium">{regionKm.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Araç Sayısı:</span>
                        <span className="font-medium">{[...new Set(regionData.map(item => item.vehicle_plate))].length}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Veri Listesi */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Veriler yükleniyor...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="p-8 text-center">
              <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Henüz takip kaydı bulunmuyor</p>
              <p className="text-sm text-gray-500 mt-1">Yeni takip kaydı oluşturmak için "Araç Takip Formu"nu kullanın</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tarih
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Araç Plakası
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Şoför
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bölge
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nokta Sayısı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Başlangıç KM
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bitiş KM
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(filteredData || []).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(item.date).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.vehicle_plate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.driver_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getRegionDisplayName(item.region)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.vehicle_tracking_entries?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.vehicle_tracking_entries?.length > 0 
                          ? item.vehicle_tracking_entries[0].departure_km?.toLocaleString('tr-TR') || '-'
                          : '-'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.vehicle_tracking_entries?.length > 0 
                          ? item.vehicle_tracking_entries[item.vehicle_tracking_entries.length - 1].departure_km?.toLocaleString('tr-TR') || '-'
                          : '-'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleView(item)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                            title="Görüntüle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleEdit(item)}
                            className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                            title="Düzenle"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detay Modalı */}
        {showDetailModal && selectedTracking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
            <div className="bg-white rounded-xl p-8 w-[95vw] h-[95vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Car className="w-6 h-6 text-blue-600" />
                  Takip Detayları
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Temel Bilgiler */}
                <div className="lg:col-span-1">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      Temel Bilgiler
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Tarih:</span>
                        <span className="font-semibold text-gray-900">{new Date(selectedTracking.date).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Araç Plakası:</span>
                        <span className="font-semibold text-gray-900 bg-blue-100 px-3 py-1 rounded-lg">{selectedTracking.vehicle_plate}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Şoför:</span>
                        <span className="font-semibold text-gray-900">{selectedTracking.driver_name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Bölge:</span>
                        <span className="font-semibold text-gray-900">{getRegionDisplayName(selectedTracking.region)}</span>
                      </div>
                      {selectedTracking.vehicle_tracking_entries && selectedTracking.vehicle_tracking_entries.length > 0 && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Başlangıç KM:</span>
                            <span className="font-semibold text-gray-900 bg-green-100 px-2 py-1 rounded">
                              {selectedTracking.vehicle_tracking_entries[0].departure_km?.toLocaleString('tr-TR') || '-'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Bitiş KM:</span>
                            <span className="font-semibold text-gray-900 bg-red-100 px-2 py-1 rounded">
                              {selectedTracking.vehicle_tracking_entries[selectedTracking.vehicle_tracking_entries.length - 1].departure_km?.toLocaleString('tr-TR') || '-'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 font-medium">Toplam KM:</span>
                            <span className="font-semibold text-gray-900 bg-blue-100 px-2 py-1 rounded">
                              {selectedTracking.vehicle_tracking_entries.length > 1 
                                ? (selectedTracking.vehicle_tracking_entries[selectedTracking.vehicle_tracking_entries.length - 1].departure_km - selectedTracking.vehicle_tracking_entries[0].departure_km).toLocaleString('tr-TR')
                                : '0'
                              } km
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Görseller */}
                  {selectedTracking.images && selectedTracking.images.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Download className="w-5 h-5 text-green-600" />
                        Takip Belgeleri
                      </h4>
                      <div className="grid grid-cols-1 gap-4">
                        {selectedTracking.images.map((image, index) => {
                          // Görsel verisi string mi yoksa object mi kontrol et
                          let imageSrc = image;
                          if (typeof image === 'object' && image.data) {
                            imageSrc = image.data;
                          }
                          
                          return (
                            <div key={index} className="relative group">
                              {imageSrc && typeof imageSrc === 'string' && (imageSrc.startsWith('data:image/') || imageSrc.startsWith('blob:')) ? (
                                <img 
                                  src={imageSrc} 
                                  alt={`Takip belgesi ${index + 1}`}
                                  className="w-full h-64 object-contain rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-colors cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // Büyük modal aç
                                    const modal = document.createElement('div');
                                    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4';
                                    modal.innerHTML = `
                                      <div class="relative max-w-4xl max-h-[90vh] overflow-auto">
                                        <img src="${imageSrc}" alt="Büyük görsel" class="w-full h-auto rounded-lg shadow-2xl" />
                                        <button onclick="this.parentElement.parentElement.remove()" class="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100">
                                          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                          </svg>
                                        </button>
                                      </div>
                                    `;
                                    document.body.appendChild(modal);
                                    modal.onclick = (e) => {
                                      if (e.target === modal) modal.remove();
                                    };
                                  }}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div 
                                className="w-full h-64 bg-gray-100 rounded-lg border-2 border-gray-200 flex items-center justify-center"
                                style={{ display: imageSrc && typeof imageSrc === 'string' && imageSrc.startsWith('data:image/') ? 'none' : 'flex' }}
                              >
                                <span className="text-gray-500 text-sm">Görsel Yüklenemedi</span>
                              </div>
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                                <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Takip Girişleri */}
                <div className="lg:col-span-2">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    Takip Girişleri ({selectedTracking.vehicle_tracking_entries?.length || 0})
                  </h4>
                  <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
                    {selectedTracking.vehicle_tracking_entries
                      ?.sort((a, b) => {
                        // Önce KM'ye göre sırala (küçükten büyüğe)
                        if (a.departure_km !== b.departure_km) {
                          return a.departure_km - b.departure_km;
                        }
                        // KM aynıysa giriş saatine göre sırala
                        return a.entry_time.localeCompare(b.entry_time);
                      })
                      ?.map((entry, index) => (
                      <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                              {index + 1}
                            </div>
                            <h5 className="font-medium text-gray-900 text-sm">{entry.departure_center}</h5>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-green-50 rounded p-2">
                            <div className="text-xs text-green-600 font-medium">Giriş</div>
                            <div className="text-sm font-semibold text-green-800">{entry.entry_time}</div>
                          </div>
                          <div className="bg-blue-50 rounded p-2">
                            <div className="text-xs text-blue-600 font-medium">Çıkış</div>
                            <div className="text-sm font-semibold text-blue-800">{entry.exit_time || '-'}</div>
                          </div>
                          <div className="bg-purple-50 rounded p-2">
                            <div className="text-xs text-purple-600 font-medium">KM</div>
                            <div className="text-sm font-semibold text-purple-800">{entry.departure_km?.toLocaleString('tr-TR')}</div>
                          </div>
                        </div>
                        
                        {entry.entry_notes && (
                          <div className="bg-gray-50 rounded p-2 mt-2">
                            <div className="text-xs text-gray-600 font-medium">Not: {entry.entry_notes}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {selectedTracking.notes && (
                <div className="mt-8">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Edit className="w-5 h-5 text-orange-600" />
                    Genel Notlar
                  </h4>
                  <div className="bg-orange-50 rounded-xl p-4 border-l-4 border-orange-400">
                    <p className="text-gray-800 leading-relaxed">{selectedTracking.notes}</p>
                  </div>
                </div>
              )}

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Düzenleme Modalı */}
        {showEditModal && editingTracking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-green-600" />
                  Takip Kaydını Düzenle
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const result = await vehicleTrackingService.updateTracking(editingTracking.id, editFormData);
                  if (result.success) {
                    // Manuel olarak listeyi güncelle (daha hızlı)
                    setTrackingData(prev => prev.map(item => 
                      item.id === editingTracking.id 
                        ? { ...item, ...editFormData }
                        : item
                    ));
                    setFilteredData(prev => prev.map(item => 
                      item.id === editingTracking.id 
                        ? { ...item, ...editFormData }
                        : item
                    ));
                    
                    setShowEditModal(false);
                    alert('Takip kaydı başarıyla güncellendi!');
                    
                    // Alternatif: Verileri yeniden yükle
                    // loadTrackingData();
                  } else {
                    alert('Güncelleme başarısız: ' + result.error);
                  }
                } catch (error) {
                  console.error('Güncelleme hatası:', error);
                  alert('Güncelleme sırasında hata oluştu');
                }
              }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tarih *</label>
                    <input
                      type="date"
                      value={editFormData.date || ''}
                      onChange={(e) => setEditFormData({...editFormData, date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Araç Plakası *</label>
                    <input
                      type="text"
                      value={editFormData.vehicle_plate || ''}
                      onChange={(e) => setEditFormData({...editFormData, vehicle_plate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Şoför *</label>
                    <input
                      type="text"
                      value={editFormData.driver_name || ''}
                      onChange={(e) => setEditFormData({...editFormData, driver_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bölge *</label>
                    <select
                      value={editFormData.region || ''}
                      onChange={(e) => setEditFormData({...editFormData, region: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Bölge seçiniz</option>
                      <option value="ISTANBUL_AND">İstanbul Anadolu</option>
                      <option value="ISTANBUL_AVR">İstanbul Avrupa</option>
                      <option value="ANKARA">Ankara</option>
                      <option value="IZMIR">İzmir</option>
                      <option value="BURSA">Bursa</option>
                      <option value="ANTALYA">Antalya</option>
                      <option value="ADANA">Adana</option>
                    </select>
                  </div>
                  
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                  <textarea
                    value={editFormData.notes || ''}
                    onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ek notlar..."
                  />
                </div>

                {/* Nokta Detayları */}
                {editingEntries && editingEntries.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-purple-600" />
                      Nokta Detayları ({editingEntries.length})
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                      <div className="space-y-4">
                        {editingEntries
                          .sort((a, b) => a.departure_km - b.departure_km)
                          .map((entry, index) => (
                          <div key={entry.id} className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                  {index + 1}
                                </div>
                                <h5 className="font-medium text-gray-900">{entry.departure_center}</h5>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs text-gray-600 font-medium mb-1">Giriş Saati</label>
                                <input
                                  type="time"
                                  value={entry.entry_time}
                                  onChange={(e) => {
                                    const newEntries = [...editingEntries];
                                    const entryIndex = newEntries.findIndex(e => e.id === entry.id);
                                    if (entryIndex !== -1) {
                                      newEntries[entryIndex].entry_time = e.target.value;
                                      setEditingEntries(newEntries);
                                    }
                                  }}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 font-medium mb-1">Çıkış Saati</label>
                                <input
                                  type="time"
                                  value={entry.exit_time || ''}
                                  onChange={(e) => {
                                    const newEntries = [...editingEntries];
                                    const entryIndex = newEntries.findIndex(e => e.id === entry.id);
                                    if (entryIndex !== -1) {
                                      newEntries[entryIndex].exit_time = e.target.value;
                                      setEditingEntries(newEntries);
                                    }
                                  }}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 font-medium mb-1">KM Okuma</label>
                                <input
                                  type="number"
                                  value={entry.departure_km}
                                  onChange={(e) => {
                                    const newEntries = [...editingEntries];
                                    const entryIndex = newEntries.findIndex(e => e.id === entry.id);
                                    if (entryIndex !== -1) {
                                      newEntries[entryIndex].departure_km = parseInt(e.target.value) || 0;
                                      setEditingEntries(newEntries);
                                    }
                                  }}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  min="0"
                                  max="999999"
                                />
                              </div>
                            </div>
                            <div className="mt-3">
                              <label className="block text-xs text-gray-600 font-medium mb-1">Notlar</label>
                              <textarea
                                value={entry.entry_notes || ''}
                                onChange={(e) => {
                                  const newEntries = [...editingEntries];
                                  const entryIndex = newEntries.findIndex(e => e.id === entry.id);
                                  if (entryIndex !== -1) {
                                    newEntries[entryIndex].entry_notes = e.target.value;
                                    setEditingEntries(newEntries);
                                  }
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                rows={2}
                                placeholder="Nokta notları..."
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Güncelle
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleTrackingList;