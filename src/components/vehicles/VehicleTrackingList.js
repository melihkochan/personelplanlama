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
  X,
  AlertCircle
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [trackingToDelete, setTrackingToDelete] = useState(null);

  // Veri yükleme fonksiyonu
  const loadTrackingData = async () => {
    setLoading(true);
    try {
      console.log('Veri yükleme başlatılıyor...');
      const result = await vehicleTrackingService.getTrackingRecords();
      console.log('Veri yükleme sonucu:', result);
      
      if (result.success) {
        console.log('Yüklenen veri sayısı:', result.data?.length || 0);
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

  const handleDelete = (trackingId) => {
    const tracking = trackingData.find(item => item.id === trackingId);
    setTrackingToDelete(tracking);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!trackingToDelete) return;
    
    try {
      console.log('Silme işlemi başlatılıyor:', trackingToDelete.id);
      const result = await vehicleTrackingService.deleteTracking(trackingToDelete.id);
      console.log('Silme sonucu:', result);
      
      if (result.success) {
        console.log('Silme başarılı, verileri yeniden yüklüyor...');
        
        // Verileri yeniden yükle (daha güvenli)
        await loadTrackingData();
        
        // Başarı mesajı
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg bg-green-500 text-white transition-all duration-300 transform';
        successMessage.innerHTML = `
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium">Takip kaydı başarıyla silindi!</p>
            </div>
          </div>
        `;
        document.body.appendChild(successMessage);
        
        setTimeout(() => {
          successMessage.remove();
        }, 3000);
      } else {
        alert('Silme işlemi başarısız: ' + result.error);
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      alert('Silme işlemi sırasında hata oluştu: ' + error.message);
    } finally {
      setShowDeleteModal(false);
      setTrackingToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setTrackingToDelete(null);
  };

  // Excel export
  const exportToExcel = () => {
    try {
      // Ana veri sayfası
      const mainData = (filteredData || []).map(item => ({
        'Tarih': new Date(item.date).toLocaleDateString('tr-TR'),
        'Araç Plakası': item.vehicle_plate,
        'Şoför': item.driver_name,
        'Bölge': getRegionDisplayName(item.region),
        'Nokta Sayısı': item.vehicle_tracking_entries?.length || 0,
        'Başlangıç KM': item.vehicle_tracking_entries?.length > 0 ? item.vehicle_tracking_entries[0].departure_km : '-',
        'Bitiş KM': item.vehicle_tracking_entries?.length > 0 ? item.vehicle_tracking_entries[item.vehicle_tracking_entries.length - 1].departure_km : '-',
        'Toplam KM': item.vehicle_tracking_entries?.length > 1 
          ? item.vehicle_tracking_entries[item.vehicle_tracking_entries.length - 1].departure_km - item.vehicle_tracking_entries[0].departure_km
          : 0,
        'Notlar': item.notes || ''
      }));

      // Detay veri sayfası
      const detailData = [];
      (filteredData || []).forEach(item => {
        item.vehicle_tracking_entries?.forEach((entry, index) => {
          detailData.push({
            'Tarih': new Date(item.date).toLocaleDateString('tr-TR'),
            'Araç Plakası': item.vehicle_plate,
            'Şoför': item.driver_name,
            'Bölge': getRegionDisplayName(item.region),
            'Nokta Sırası': index + 1,
            'Gidilen Yer': entry.departure_center,
            'Giriş Saati': entry.entry_time,
            'Çıkış Saati': entry.exit_time || '-',
            'KM Okuma': entry.departure_km,
            'Notlar': entry.entry_notes || ''
          });
        });
      });

      // Bölge analizi
      const regionData = [];
      stats.regions.forEach(region => {
        const regionItems = (filteredData || []).filter(item => item.region === region);
        const regionEntries = regionItems.reduce((sum, item) => sum + (item.vehicle_tracking_entries?.length || 0), 0);
        const regionKm = regionItems.reduce((sum, item) => {
          const entries = item.vehicle_tracking_entries || [];
          if (entries.length > 0) {
            const firstKm = entries[0].departure_km || 0;
            const lastKm = entries[entries.length - 1].departure_km || 0;
            return sum + (lastKm - firstKm);
          }
          return sum;
        }, 0);
        
        regionData.push({
          'Bölge': getRegionDisplayName(region),
          'Kayıt Sayısı': regionItems.length,
          'Toplam Nokta': regionEntries,
          'Toplam KM': regionKm,
          'Araç Sayısı': [...new Set(regionItems.map(item => item.vehicle_plate))].length
        });
      });

      // Excel dosyası oluştur
      const XLSX = require('xlsx');
      
      // Çalışma kitabı oluştur
      const wb = XLSX.utils.book_new();
      
      // Sayfaları ekle
      const ws1 = XLSX.utils.json_to_sheet(mainData);
      const ws2 = XLSX.utils.json_to_sheet(detailData);
      const ws3 = XLSX.utils.json_to_sheet(regionData);
      
      // Sütun genişliklerini ayarla
      ws1['!cols'] = [
        { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 18 }, 
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 }
      ];
      ws2['!cols'] = [
        { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 18 }, 
        { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 }
      ];
      ws3['!cols'] = [
        { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
      ];
      
      XLSX.utils.book_append_sheet(wb, ws1, 'Ana Liste');
      XLSX.utils.book_append_sheet(wb, ws2, 'Detay Listesi');
      XLSX.utils.book_append_sheet(wb, ws3, 'Bölge Analizi');
      
      // Dosyayı indir
      const fileName = `Arac_Takip_Listesi_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      console.log('Excel dosyası başarıyla oluşturuldu:', fileName);
    } catch (error) {
      console.error('Excel export hatası:', error);
      alert('Excel dosyası oluşturulurken hata oluştu: ' + error.message);
    }
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                  <Car className="w-6 h-6 text-white" />
                </div>
                Araç Takip Sistemi
              </h1>
              <p className="text-gray-600">Araç hareketlerini ve takip verilerini görüntüleyin</p>
            </div>
            
          </div>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Toplam Kayıt</p>
                <p className="text-3xl font-bold">{stats.totalRecords}</p>
              </div>
              <Car className="w-8 h-8 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Toplam Nokta</p>
                <p className="text-3xl font-bold">{stats.totalEntries}</p>
              </div>
              <MapPin className="w-8 h-8 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Toplam KM</p>
                <p className="text-3xl font-bold">{stats.totalKm.toLocaleString()}</p>
              </div>
              <Clock className="w-8 h-8 text-purple-200" />
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Araç Sayısı</p>
                <p className="text-3xl font-bold">{stats.uniqueVehicles}</p>
              </div>
              <Car className="w-8 h-8 text-orange-200" />
            </div>
          </div>
        </div>


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
                                  className="w-full h-48 object-contain rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-colors cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Resim tıklandı:', imageSrc);
                                    
                                    // Modal oluştur
                                    const modal = document.createElement('div');
                                    modal.style.cssText = `
                                      position: fixed;
                                      top: 0;
                                      left: 0;
                                      width: 100vw;
                                      height: 100vh;
                                      background: rgba(0,0,0,0.8);
                                      display: flex;
                                      justify-content: center;
                                      align-items: center;
                                      z-index: 99999;
                                      cursor: pointer;
                                      padding: 20px;
                                      box-sizing: border-box;
                                    `;
                                    
                                    modal.innerHTML = `
                                      <div style="position: relative; max-width: 4xl; max-height: 90vh; width: 100%; margin: 16px;">
                                        <button onclick="this.parentElement.parentElement.remove()" style="position: absolute; top: 16px; right: 16px; z-index: 10; background: white; background-opacity: 0.2; hover:background-opacity: 0.3; border-radius: 50%; padding: 8px; transition: all 0.2s; border: none; cursor: pointer;">
                                          <span style="color: white; font-size: 24px; font-weight: bold;">×</span>
                                        </button>
                                        
                                        <div style="background: white; border-radius: 8px; padding: 16px; max-height: 100%; overflow: auto;">
                                          <div style="text-align: center; margin-bottom: 16px;">
                                            <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0;">
                                              Takip Belgesi - Görsel ${index + 1}
                                            </h3>
                                            <p style="font-size: 14px; color: #6b7280; margin: 4px 0 0 0;">
                                              ${selectedTracking.date} • ${selectedTracking.vehicle_plate}
                                            </p>
                                          </div>
                                          
                                          <div style="display: flex; justify-content: center;">
                                            <img src="${imageSrc}" alt="Takip belgesi - tam ekran" style="max-width: 100%; max-height: 70vh; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);" />
                                          </div>
                                          
                                          <div style="margin-top: 16px; text-align: center;">
                                            <p style="font-size: 14px; color: #6b7280; margin: 0;">
                                              Kapatmak için dışarı tıklayın
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    `;
                                    
                                    modal.onclick = (event) => {
                                      if (event.target === modal) {
                                        modal.remove();
                                      }
                                    };
                                    
                                    document.body.appendChild(modal);
                                    console.log('Modal eklendi');
                                  }}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div 
                                className="w-full h-48 bg-gray-100 rounded-lg border-2 border-gray-200 flex items-center justify-center"
                                style={{ display: imageSrc && typeof imageSrc === 'string' && imageSrc.startsWith('data:image/') ? 'none' : 'flex' }}
                              >
                                <span className="text-gray-500 text-sm">Görsel Yüklenemedi</span>
                              </div>
                              <div 
                                className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center cursor-pointer"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Overlay tıklandı:', imageSrc);
                                  
                                  // Modal oluştur - Fiş listesi gibi güzel görünüm
                                  const modal = document.createElement('div');
                                  modal.style.cssText = `
                                    position: fixed;
                                    top: 0;
                                    left: 0;
                                    width: 100vw;
                                    height: 100vh;
                                    background: rgba(0,0,0,0.8);
                                    display: flex;
                                    justify-content: center;
                                    align-items: center;
                                    z-index: 99999;
                                    cursor: pointer;
                                    padding: 20px;
                                    box-sizing: border-box;
                                  `;
                                  
                                  modal.innerHTML = `
                                    <div style="position: relative; max-width: 4xl; max-height: 90vh; width: 100%; margin: 16px;">
                                      <button onclick="this.parentElement.parentElement.remove()" style="position: absolute; top: 16px; right: 16px; z-index: 10; background: white; background-opacity: 0.2; hover:background-opacity: 0.3; border-radius: 50%; padding: 8px; transition: all 0.2s; border: none; cursor: pointer;">
                                        <span style="color: white; font-size: 24px; font-weight: bold;">×</span>
                                      </button>
                                      
                                      <div style="background: white; border-radius: 8px; padding: 16px; max-height: 100%; overflow: auto;">
                                        <div style="text-align: center; margin-bottom: 16px;">
                                          <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0;">
                                            Takip Belgesi - Görsel ${index + 1}
                                          </h3>
                                          <p style="font-size: 14px; color: #6b7280; margin: 4px 0 0 0;">
                                            ${selectedTracking.date} • ${selectedTracking.vehicle_plate}
                                          </p>
                                        </div>
                                        
                                        <div style="display: flex; justify-content: center;">
                                          <img src="${imageSrc}" alt="Takip belgesi - tam ekran" style="max-width: 100%; max-height: 70vh; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);" />
                                        </div>
                                        
                                        <div style="margin-top: 16px; text-align: center;">
                                          <p style="font-size: 14px; color: #6b7280; margin: 0;">
                                            Kapatmak için dışarı tıklayın
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  `;
                                  
                                  modal.onclick = (event) => {
                                    if (event.target === modal) {
                                      modal.remove();
                                    }
                                  };
                                  
                                  document.body.appendChild(modal);
                                  console.log('Modal eklendi (overlay)');
                                }}
                              >
                                <div className="text-center">
                                  <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity mx-auto mb-1" />
                                  <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">Tıklayarak büyüt</span>
                                </div>
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
            <div className="bg-white rounded-xl p-6 max-w-6xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
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
                  // Ana kaydı güncelle
                  const result = await vehicleTrackingService.updateTracking(editingTracking.id, editFormData);
                  if (result.success) {
                    // Girişleri de güncelle
                    for (const entry of editingEntries) {
                      await vehicleTrackingService.updateTrackingEntry(entry.id, {
                        departure_center: entry.departure_center,
                        entry_time: entry.entry_time,
                        exit_time: entry.exit_time || null,
                        departure_km: entry.departure_km
                      });
                    }
                    
                    // Manuel olarak listeyi güncelle (daha hızlı)
                    setTrackingData(prev => prev.map(item => 
                      item.id === editingTracking.id 
                        ? { ...item, ...editFormData, vehicle_tracking_entries: editingEntries }
                        : item
                    ));
                    setFilteredData(prev => prev.map(item => 
                      item.id === editingTracking.id 
                        ? { ...item, ...editFormData, vehicle_tracking_entries: editingEntries }
                        : item
                    ));
                    
                    setShowEditModal(false);
                    alert('Takip kaydı ve girişleri başarıyla güncellendi!');
                    
                    // Alternatif: Verileri yeniden yükle
                    // loadTrackingData();
                  } else {
                    alert('Güncelleme başarısız: ' + result.error);
                  }
                } catch (error) {
                  console.error('Güncelleme hatası:', error);
                  alert('Güncelleme sırasında hata oluştu: ' + error.message);
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
                    <div className="bg-gray-50 rounded-lg p-4 max-h-80 overflow-y-auto">
                      <div className="space-y-4">
                        {editingEntries
                          .sort((a, b) => a.departure_km - b.departure_km)
                          .map((entry, index) => (
                          <div key={entry.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors">
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                  {index + 1}
                                </div>
                                <h5 className="font-medium text-gray-900">Nokta {index + 1}</h5>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm('Bu noktayı silmek istediğinizden emin misiniz?')) {
                                    const newEntries = editingEntries.filter(e => e.id !== entry.id);
                                    setEditingEntries(newEntries);
                                  }
                                }}
                                className="p-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                title="Noktayı Sil"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-gray-600 font-medium mb-1">Gidilen Yer</label>
                                <input
                                  type="text"
                                  value={entry.departure_center}
                                  onChange={(e) => {
                                    const newEntries = [...editingEntries];
                                    const entryIndex = newEntries.findIndex(e => e.id === entry.id);
                                    if (entryIndex !== -1) {
                                        newEntries[entryIndex].departure_center = e.target.value;
                                        setEditingEntries(newEntries);
                                      }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Gidilen yer adı..."
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
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  min="0"
                                  max="999999"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
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

        {/* Silme Onay Modalı */}
        {showDeleteModal && trackingToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-600" />
                  Takip Kaydını Sil
                </h3>
                <button
                  onClick={cancelDelete}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-800 font-semibold">Dikkat!</span>
                  </div>
                  <p className="text-red-700 text-sm">
                    Bu işlem geri alınamaz. Takip kaydı ve tüm girişleri kalıcı olarak silinecektir.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Silinecek Kayıt:</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Tarih:</span>
                      <span className="font-medium">{new Date(trackingToDelete.date).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Araç:</span>
                      <span className="font-medium">{trackingToDelete.vehicle_plate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Şoför:</span>
                      <span className="font-medium">{trackingToDelete.driver_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bölge:</span>
                      <span className="font-medium">{getRegionDisplayName(trackingToDelete.region)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nokta Sayısı:</span>
                      <span className="font-medium">{trackingToDelete.vehicle_tracking_entries?.length || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Sil
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleTrackingList;