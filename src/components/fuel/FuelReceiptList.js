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
  CheckCircle,
  XCircle,
  Clock as PendingIcon
} from 'lucide-react';
import { fuelReceiptService } from '../../services/supabase';

const FuelReceiptList = ({ vehicleData = [], personnelData = [], currentUser }) => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

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

  // Filtreleme ve Sıralama
  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = 
      receipt.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.vehicle_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.station_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVehicle = !selectedVehicle || receipt.vehicle_plate === selectedVehicle;
    const matchesStatus = !selectedStatus || receipt.status === selectedStatus;
    
    return matchesSearch && matchesVehicle && matchesStatus;
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
    pending: receipts.filter(r => r.status === 'pending').length,
    approved: receipts.filter(r => r.status === 'approved').length,
    rejected: receipts.filter(r => r.status === 'rejected').length,
    totalAmount: receipts.reduce((sum, r) => sum + r.total_amount, 0)
  };

  // Durum badge'i
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { 
        icon: PendingIcon, 
        color: 'bg-yellow-100 text-yellow-800', 
        text: 'Beklemede' 
      },
      approved: { 
        icon: CheckCircle, 
        color: 'bg-green-100 text-green-800', 
        text: 'Onaylandı' 
      },
      rejected: { 
        icon: XCircle, 
        color: 'bg-red-100 text-red-800', 
        text: 'Reddedildi' 
      }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </span>
    );
  };

  // Fiş onaylama/reddetme
  const handleStatusChange = (receiptId, newStatus) => {
    setReceipts(prev => prev.map(receipt => 
      receipt.id === receiptId 
        ? { ...receipt, status: newStatus }
        : receipt
    ));
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
              Toplam {stats.total} fiş • {stats.pending} beklemede • {stats.approved} onaylandı
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
          
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-xl border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">Beklemede</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
              </div>
              <PendingIcon className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Onaylandı</p>
                <p className="text-2xl font-bold text-green-900">{stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
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
        </div>

        {/* Filtre Paneli */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tüm Durumlar</option>
                  <option value="pending">Beklemede</option>
                  <option value="approved">Onaylandı</option>
                  <option value="rejected">Reddedildi</option>
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
                  <option value="today">Bugün</option>
                  <option value="week">Bu Hafta</option>
                  <option value="month">Bu Ay</option>
                  <option value="year">Bu Yıl</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fiş Listesi - Tablo Format */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fiş No</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih/Saat</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Araç</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şoför</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İstasyon</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yakıt</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReceipts.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-gray-50 transition-colors">
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
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                Fiş Detayı #{selectedReceipt.receipt_number}
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {selectedReceipt.receipt_image && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fiş Görseli</label>
                    <div className="border border-gray-200 rounded-lg p-2">
                      <img 
                        src={selectedReceipt.receipt_image} 
                        alt="Fiş görseli" 
                        className="w-full h-auto rounded-lg max-h-64 object-contain"
                      />
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fiş Numarası</label>
                  <p className="text-gray-900 font-medium">#{selectedReceipt.receipt_number}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tarih ve Saat</label>
                  <p className="text-gray-900">{selectedReceipt.date} {selectedReceipt.time}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Araç Plakası</label>
                  <p className="text-gray-900 font-medium">{selectedReceipt.vehicle_plate}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Şoför</label>
                  <p className="text-gray-900">{selectedReceipt.driver_name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">İstasyon</label>
                  <p className="text-gray-900">{selectedReceipt.station_name}</p>
                  <p className="text-sm text-gray-600">{selectedReceipt.station_location}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yakıt Türü</label>
                  <p className="text-gray-900">{selectedReceipt.fuel_type}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Miktar</label>
                  <p className="text-gray-900 font-medium">{selectedReceipt.quantity_liters} Litre</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birim Fiyat</label>
                  <p className="text-gray-900">
                    {selectedReceipt.unit_price.toLocaleString('tr-TR', { 
                      style: 'currency', 
                      currency: 'TRY' 
                    })}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">KDV</label>
                  <p className="text-gray-900">
                    {selectedReceipt.vat_amount.toLocaleString('tr-TR', { 
                      style: 'currency', 
                      currency: 'TRY' 
                    })}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Toplam Tutar</label>
                  <p className="text-gray-900 font-bold text-lg">
                    {selectedReceipt.total_amount.toLocaleString('tr-TR', { 
                      style: 'currency', 
                      currency: 'TRY' 
                    })}
                  </p>
                </div>
                
              </div>
              
              {/* Notlar Bölümü */}
              {selectedReceipt.notes && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama / Notlar</label>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-gray-900 text-sm whitespace-pre-wrap">{selectedReceipt.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelReceiptList;
