import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Calendar, 
  Car, 
  User, 
  DollarSign, 
  Fuel, 
  MapPin, 
  Clock, 
  Check, 
  X, 
  Eye, 
  Download,
  TrendingUp,
  AlertTriangle,
  Edit,
  Trash2
} from 'lucide-react';
import { fuelReceiptService } from '../../services/supabase';
import * as XLSX from 'xlsx';

const FuelReceiptList = ({ vehicleData = [], personnelData = [], currentUser }) => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Veritabanından fişleri çek
  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    setLoading(true);
    try {
      const result = await fuelReceiptService.getAllReceipts();
      if (result.success) {
        setReceipts(result.data);
      } else {
        console.error('Fişler yüklenirken hata:', result.error);
      }
    } catch (error) {
      console.error('Fişler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fiş düzenleme
  const handleEdit = (receipt) => {
    setEditingReceipt(receipt);
    setShowEditModal(true);
  };

  // Fiş silme
  const handleDelete = async (receiptId) => {
    if (window.confirm('Bu fişi silmek istediğinizden emin misiniz?')) {
      try {
        const result = await fuelReceiptService.deleteReceipt(receiptId);
        if (result.success) {
          alert('Fiş başarıyla silindi!');
          loadReceipts(); // Listeyi yenile
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Fiş silme hatası:', error);
        alert('Fiş silinirken hata oluştu: ' + error.message);
      }
    }
  };

  // Fiş güncelleme
  const handleUpdate = async (updatedReceipt) => {
    try {
      const result = await fuelReceiptService.updateReceipt(updatedReceipt.id, updatedReceipt);
      if (result.success) {
        alert('Fiş başarıyla güncellendi!');
        setShowEditModal(false);
        setEditingReceipt(null);
        loadReceipts(); // Listeyi yenile
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Fiş güncelleme hatası:', error);
      alert('Fiş güncellenirken hata oluştu: ' + error.message);
    }
  };

  // Filtreleme ve Sıralama
  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = 
      receipt.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.vehicle_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.station_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVehicle = !selectedVehicle || receipt.vehicle_plate === selectedVehicle;
    
    // Tarih aralığı filtresi
    let matchesDate = true;
    if (selectedDateRange) {
      const receiptDate = new Date(receipt.date);
      const today = new Date();
      const daysAgo = parseInt(selectedDateRange);
      
      if (daysAgo > 0) {
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - daysAgo);
        matchesDate = receiptDate >= startDate;
      }
    }
    
    return matchesSearch && matchesVehicle && matchesDate;
  }).sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'date':
        aValue = new Date(a.date);
        bValue = new Date(b.date);
        break;
      case 'driver_name':
        aValue = a.driver_name?.toLowerCase() || '';
        bValue = b.driver_name?.toLowerCase() || '';
        break;
      case 'vehicle_plate':
        aValue = a.vehicle_plate?.toLowerCase() || '';
        bValue = b.vehicle_plate?.toLowerCase() || '';
        break;
      case 'total_amount':
        aValue = a.total_amount || 0;
        bValue = b.total_amount || 0;
        break;
      default:
        aValue = a[sortBy] || '';
        bValue = b[sortBy] || '';
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // İstatistikler
  const stats = {
    total: receipts.length,
    totalAmount: receipts.reduce((sum, r) => sum + (r.total_amount || 0), 0),
    totalFuel: receipts.reduce((sum, r) => sum + (r.quantity_liters || 0), 0),
    totalVehicles: new Set(receipts.map(r => r.vehicle_plate)).size
  };


  // Excel indirme
  const handleExportExcel = () => {
    try {
      // Veri hazırlama
      const data = filteredReceipts.map(receipt => ({
        'Fiş No': receipt.receipt_number,
        'Tarih': receipt.date,
        'Saat': receipt.time,
        'Araç Plakası': receipt.vehicle_plate,
        'Şoför': receipt.driver_name,
        'İstasyon': receipt.station_name,
        'Yakıt Türü': receipt.fuel_type,
        'Miktar (L)': receipt.quantity_liters,
        'Birim Fiyat (₺)': receipt.unit_price,
        'Toplam Tutar (₺)': receipt.total_amount,
        'Araç KM': receipt.km_reading || '',
        'Notlar': receipt.notes || ''
      }));

      // Workbook oluşturma
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);

      // Stil ayarları
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      
      // Font ayarları (Calibri 8)
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!worksheet[cellAddress]) continue;
          
          if (!worksheet[cellAddress].s) worksheet[cellAddress].s = {};
          worksheet[cellAddress].s.font = {
            name: 'Calibri',
            sz: 8,
            color: { rgb: '000000' }
          };
          
          // Başlık satırı için kalın font
          if (R === 0) {
            worksheet[cellAddress].s.font.bold = true;
            worksheet[cellAddress].s.fill = {
              fgColor: { rgb: 'F2F2F2' }
            };
          }
          
          // Kenarlık ekleme
          worksheet[cellAddress].s.border = {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          };
        }
      }

      // Sütun genişliklerini ayarla
      worksheet['!cols'] = [
        { wch: 12 }, // Fiş No
        { wch: 12 }, // Tarih
        { wch: 10 }, // Saat
        { wch: 15 }, // Araç Plakası
        { wch: 20 }, // Şoför
        { wch: 25 }, // İstasyon
        { wch: 15 }, // Yakıt Türü
        { wch: 12 }, // Miktar
        { wch: 15 }, // Birim Fiyat
        { wch: 15 }, // Toplam Tutar
        { wch: 12 }, // Araç KM
        { wch: 30 }  // Notlar
      ];

      // Worksheet'i workbook'a ekle
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Yakıt Fişleri');

      // Dosyayı indir
      const fileName = `yakıt-fişleri-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
    } catch (error) {
      console.error('Excel indirme hatası:', error);
      alert('Excel dosyası indirilirken hata oluştu: ' + error.message);
    }
  };

  // Fiş detayını görüntüleme
  const handleViewDetail = (receipt) => {
    setSelectedReceipt(receipt);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Fuel className="w-6 h-6 text-white" />
              </div>
              Yakıt Fiş Takip Sistemi
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Toplam {stats.total} fiş
            </p>
          </div>
          
        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Toplam Fiş</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <Fuel className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Toplam Yakıt</p>
                <p className="text-2xl font-bold text-green-900">{stats.totalFuel.toFixed(2)}L</p>
              </div>
              <Fuel className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Toplam Araç</p>
                <p className="text-2xl font-bold text-orange-900">{stats.totalVehicles}</p>
              </div>
              <Car className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Toplam Tutar</p>
                <p className="text-2xl font-bold text-purple-900">
                  {stats.totalAmount.toLocaleString('tr-TR', { 
                    style: 'currency', 
                    currency: 'TRY' 
                  })}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Arama, Filtreler ve Sıralama */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Fiş no, plaka, şoför veya istasyon ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date">Tarihe Göre</option>
              <option value="driver_name">Şoföre Göre</option>
              <option value="vehicle_plate">Araca Göre</option>
              <option value="total_amount">Tutara Göre</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl flex items-center gap-2 hover:bg-gray-200 transition-colors"
              title={sortOrder === 'asc' ? 'Azalan' : 'Artan'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl flex items-center gap-2 hover:bg-gray-200 transition-colors"
          >
            <Filter className="w-5 h-5" />
            Filtreler
          </button>
          
          <button
            onClick={handleExportExcel}
            className="bg-green-100 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2 hover:bg-green-200 transition-colors"
          >
            <Download className="w-5 h-5" />
            Excel İndir
          </button>
        </div>

        {/* Filtre Paneli */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Araç</label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tüm Araçlar</option>
                  {vehicleData.map((vehicle, index) => (
                    <option key={index} value={vehicle.license_plate}>
                      {vehicle.license_plate}
                    </option>
                  ))}
                </select>
              </div>
              
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tarih Aralığı</label>
                <select
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tüm Tarihler</option>
                  <option value="1">Son 1 Gün</option>
                  <option value="7">Son 7 Gün</option>
                  <option value="30">Son 30 Gün</option>
                  <option value="90">Son 90 Gün</option>
                  <option value="365">Son 1 Yıl</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fiş Listesi - Tablo Format */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Fiş No</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Tarih/Saat</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Araç</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Şoför</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">İstasyon</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Yakıt</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Tutar</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
        {filteredReceipts.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-blue-50 transition-all duration-200 border-l-4 border-transparent hover:border-blue-400">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center mr-3">
                        <Fuel className="w-4 h-4 text-white" />
                </div>
                      <span className="text-sm font-medium text-gray-900">#{receipt.receipt_number}</span>
                </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{receipt.date}</div>
                    <div className="text-sm text-gray-500">{receipt.time}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Car className="w-4 h-4 text-blue-600 mr-2" />
                      {receipt.vehicle_plate}
              </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <User className="w-4 h-4 text-green-600 mr-2" />
                      {receipt.driver_name}
            </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <MapPin className="w-4 h-4 text-red-600 mr-2" />
                      {receipt.station_name}
              </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Fuel className="w-4 h-4 text-orange-600 mr-2" />
                      {receipt.quantity_liters}L
              </div>
                    <div className="text-xs text-gray-500">{receipt.fuel_type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm font-medium text-gray-900">
                      <DollarSign className="w-4 h-4 text-purple-600 mr-2" />
                  {receipt.total_amount.toLocaleString('tr-TR', { 
                    style: 'currency', 
                    currency: 'TRY' 
                  })}
              </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewDetail(receipt)}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                        title="Detay"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(receipt)}
                        className="p-2 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200 transition-colors"
                        title="Düzenle"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(receipt.id)}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
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
      </div>

      {filteredReceipts.length === 0 && (
        <div className="text-center py-12">
          <Fuel className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Fiş bulunamadı</p>
        </div>
      )}

      {/* Fiş Detay Modal */}
      {showDetailModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full m-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Fiş Detayı #{selectedReceipt.receipt_number}
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Fiş Görseli - Üst Kısım */}
            {selectedReceipt.receipt_image && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Fiş Görseli</label>
                <div className="relative group cursor-pointer" onClick={() => setShowImageModal(true)}>
                  <div className="border-2 border-gray-200 rounded-lg p-3 hover:border-blue-400 transition-all duration-200 hover:shadow-lg">
                    <img 
                      src={selectedReceipt.receipt_image} 
                      alt="Fiş görseli" 
                      className="w-full h-auto rounded-lg max-h-64 object-contain mx-auto"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white bg-opacity-90 rounded-full p-2">
                        <Eye className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <span className="text-xs text-blue-600 hover:text-blue-800 transition-colors font-medium">
                      📸 Tam ekran için tıklayın
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Fiş Bilgileri - Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sol Kolon - Genel Bilgiler */}
              <div className="space-y-3">
                <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Genel Bilgiler
                </h4>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Fiş No</label>
                      <p className="text-gray-900 font-semibold">#{selectedReceipt.receipt_number}</p>
                    </div>
                    
                <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Tarih</label>
                      <p className="text-gray-900">{selectedReceipt.date}</p>
                </div>
                
                <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Saat</label>
                      <p className="text-gray-900">{selectedReceipt.time}</p>
                </div>
                
                <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Araç</label>
                      <p className="text-gray-900">{selectedReceipt.vehicle_plate}</p>
                </div>
                
                <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Şoför</label>
                  <p className="text-gray-900">{selectedReceipt.driver_name}</p>
                </div>
                
                <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">İstasyon</label>
                      <p className="text-gray-900 text-sm">{selectedReceipt.station_name}</p>
                    </div>
                    
                    {selectedReceipt.km_reading && (
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Araç KM</label>
                        <p className="text-gray-900 font-medium">{selectedReceipt.km_reading.toLocaleString('tr-TR')} km</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Sağ Kolon - Yakıt Bilgileri */}
              <div className="space-y-3">
                <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-orange-600" />
                  Yakıt Bilgileri
                </h4>
                
                <div className="bg-orange-50 rounded-lg p-3">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Yakıt Türü</span>
                      <span className="text-gray-900 font-medium">{selectedReceipt.fuel_type}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Miktar</span>
                      <span className="text-gray-900 font-medium">{selectedReceipt.quantity_liters} Litre</span>
                </div>
                
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Birim Fiyat</span>
                      <span className="text-gray-900 font-medium">
                    {selectedReceipt.unit_price.toLocaleString('tr-TR', { 
                      style: 'currency', 
                      currency: 'TRY' 
                    })}
                      </span>
                </div>
                
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">KDV</span>
                      <span className="text-gray-900 font-medium">
                    {selectedReceipt.vat_amount.toLocaleString('tr-TR', { 
                      style: 'currency', 
                      currency: 'TRY' 
                    })}
                      </span>
                </div>
                
                    <div className="border-t border-orange-200 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-800">Toplam Tutar</span>
                        <span className="text-xl font-bold text-orange-600">
                    {selectedReceipt.total_amount.toLocaleString('tr-TR', { 
                      style: 'currency', 
                      currency: 'TRY' 
                    })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
                </div>
                
            {/* Notlar Bölümü - Alt Kısım */}
            {selectedReceipt.notes && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  Açıklama / Notlar
                </h4>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-gray-900 text-sm whitespace-pre-wrap">
                    {selectedReceipt.notes && selectedReceipt.notes.trim() 
                      ? selectedReceipt.notes 
                      : 'Açıklama girilmemiş'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tam Ekran Görsel Modal */}
      {/* Düzenleme Modal */}
      {showEditModal && editingReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Fiş Düzenle</h2>
                  <p className="text-sm text-gray-500 mt-1">#{editingReceipt.receipt_number}</p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Temel Bilgiler */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fiş Numarası</label>
                    <input
                      type="text"
                      value={editingReceipt.receipt_number || ''}
                      onChange={(e) => setEditingReceipt({...editingReceipt, receipt_number: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Araç Plakası</label>
                    <input
                      type="text"
                      value={editingReceipt.vehicle_plate || ''}
                      onChange={(e) => setEditingReceipt({...editingReceipt, vehicle_plate: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Şoför Adı</label>
                    <input
                      type="text"
                      value={editingReceipt.driver_name || ''}
                      onChange={(e) => setEditingReceipt({...editingReceipt, driver_name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tarih</label>
                    <input
                      type="date"
                      value={editingReceipt.date || ''}
                      onChange={(e) => setEditingReceipt({...editingReceipt, date: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Yakıt Bilgileri */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Yakıt Türü</label>
                    <select
                      value={editingReceipt.fuel_type || ''}
                      onChange={(e) => setEditingReceipt({...editingReceipt, fuel_type: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                    >
                      <option value="MOTORIN SVPD">Motorin SVPD</option>
                      <option value="BENZIN SVPD">Benzin SVPD</option>
                      <option value="LPG SVPD">LPG SVPD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Miktar (L)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingReceipt.quantity_liters || ''}
                      onChange={(e) => setEditingReceipt({...editingReceipt, quantity_liters: parseFloat(e.target.value)})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Toplam Tutar (₺)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingReceipt.total_amount || ''}
                      onChange={(e) => setEditingReceipt({...editingReceipt, total_amount: parseFloat(e.target.value)})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Notlar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notlar</label>
                  <textarea
                    value={editingReceipt.notes || ''}
                    onChange={(e) => setEditingReceipt({...editingReceipt, notes: e.target.value})}
                    rows="3"
                    placeholder="Açıklama yazın (opsiyonel)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              {/* Butonlar */}
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleUpdate(editingReceipt)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all font-medium shadow-lg"
                >
                  ✓ Güncelle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showImageModal && selectedReceipt && selectedReceipt.receipt_image && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50" onClick={() => setShowImageModal(false)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full m-4">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 transition-all duration-200"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            
            <div className="bg-white rounded-lg p-4 max-h-full overflow-auto">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Fiş Görseli - #{selectedReceipt.receipt_number}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedReceipt.date} • {selectedReceipt.vehicle_plate}
                </p>
              </div>
              
              <div className="flex justify-center">
                <img 
                  src={selectedReceipt.receipt_image} 
                  alt="Fiş görseli - tam ekran" 
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                />
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">
                  Kapatmak için dışarı tıklayın
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelReceiptList;
