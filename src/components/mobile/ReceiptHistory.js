import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  Car, 
  Fuel, 
  DollarSign, 
  MapPin,
  RefreshCw,
  X
} from 'lucide-react';
import { fuelReceiptService } from '../../services/supabase';

const ReceiptHistory = ({ selectedDriver, onBack }) => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fişleri yükle
  useEffect(() => {
    loadReceipts();
  }, [selectedDriver]);

  const loadReceipts = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fuelReceiptService.getAllReceipts();
      if (result.success) {
        let filteredReceipts = result.data;
        
        // Admin değilse sadece bu şoförün fişlerini filtrele
        if (!selectedDriver.isAdmin) {
          filteredReceipts = result.data.filter(receipt => 
            receipt.driver_name === selectedDriver.full_name
          );
        }
        
        // Tarihe göre sırala (en yeni üstte)
        filteredReceipts.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time || '00:00:00'}`);
          const dateB = new Date(`${b.date}T${b.time || '00:00:00'}`);
          return dateB - dateA;
        });
        setReceipts(filteredReceipts);
      } else {
        setError('Fişler yüklenirken hata oluştu');
      }
    } catch (error) {
      console.error('Fiş geçmişi yükleme hatası:', error);
      setError('Fişler yüklenirken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date, time) => {
    const dateObj = new Date(`${date}T${time || '00:00:00'}`);
    return dateObj.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRegionDisplayName = (region) => {
    const regionMappings = {
      'ISTANBUL_AND': 'ISTANBUL (Anadolu)',
      'ISTANBUL_AVR': 'ISTANBUL (Avrupa)',
      'ADANA': 'ADANA',
      'ANKARA': 'ANKARA',
      'ANTALYA': 'ANTALYA',
      'BALIKESIR': 'BALIKESIR',
      'BURSA': 'BURSA',
      'DIYARBAKIR': 'DIYARBAKIR',
      'GAZIANTEP': 'GAZIANTEP',
      'IZMIR': 'IZMIR',
      'KONYA': 'KONYA',
      'SAMSUN': 'SAMSUN',
      'TRABZON': 'TRABZON'
    };
    return regionMappings[region] || region;
  };

  const totalAmount = receipts.reduce((sum, receipt) => sum + (parseFloat(receipt.total_amount) || 0), 0);
  const totalLiters = receipts.reduce((sum, receipt) => sum + (parseFloat(receipt.quantity_liters) || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 pt-4 pb-4 px-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onBack}
            className="flex items-center text-blue-600 hover:text-blue-800 py-2"
          >
            <ArrowLeft className="w-6 h-6 mr-2" />
            <span className="font-medium">Geri</span>
          </button>
          <h1 className="text-lg font-bold text-gray-900">
            {selectedDriver.isAdmin ? 'Tüm Fişler' : 'Fiş Geçmişi'}
          </h1>
          <button
            onClick={loadReceipts}
            className="flex items-center text-green-600 hover:text-green-800 py-2 px-2"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <FileText className="w-4 h-4 mr-2" />
          <span>{selectedDriver?.full_name}</span>
          {selectedDriver.isAdmin && (
            <span className="ml-2 px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">
              ADMIN
            </span>
          )}
        </div>
      </div>

      {/* İstatistikler */}
      <div className="p-4">
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Özet</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{receipts.length}</div>
              <div className="text-sm text-gray-500">
                {selectedDriver.isAdmin ? 'Tüm Fişler' : 'Toplam Fiş'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{totalLiters.toFixed(1)}L</div>
              <div className="text-sm text-gray-500">Toplam Litre</div>
            </div>
            <div className="text-center col-span-2">
              <div className="text-2xl font-bold text-purple-600">₺{totalAmount.toFixed(2)}</div>
              <div className="text-sm text-gray-500">Toplam Tutar</div>
            </div>
          </div>
        </div>

        {/* Fiş Listesi */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Fiş Listesi</h3>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Yükleniyor...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-2">{error}</div>
              <button
                onClick={loadReceipts}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Tekrar Dene
              </button>
            </div>
          ) : receipts.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Henüz fiş bulunmuyor</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {receipts.map((receipt, index) => (
                <div
                  key={receipt.id || index}
                  onClick={() => {
                    setSelectedReceipt(receipt);
                    setShowDetailModal(true);
                  }}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-blue-600">#{receipt.receipt_number}</span>
                    <span className="text-sm text-gray-500">
                      {formatDate(receipt.date, receipt.time)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center">
                      <Car className="w-4 h-4 text-gray-400 mr-2" />
                      <span>{receipt.vehicle_plate}</span>
                    </div>
                    <div className="flex items-center">
                      <Fuel className="w-4 h-4 text-gray-400 mr-2" />
                      <span>{receipt.quantity_liters}L</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-2">Yakıt:</span>
                      <span>{receipt.fuel_type}</span>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 text-green-500 mr-2" />
                      <span className="font-semibold text-green-600">₺{receipt.total_amount}</span>
                    </div>
                  </div>
                  
                  {receipt.region && (
                    <div className="mt-2 text-xs text-gray-500 flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {getRegionDisplayName(receipt.region)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fiş Detay Modal */}
      {showDetailModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Fiş Detayı</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Fiş No</label>
                  <p className="text-gray-900 font-semibold">#{selectedReceipt.receipt_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Tarih/Saat</label>
                  <p className="text-gray-900">{formatDate(selectedReceipt.date, selectedReceipt.time)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Araç Plakası</label>
                  <p className="text-gray-900">{selectedReceipt.vehicle_plate}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Şoför</label>
                  <p className="text-gray-900">{selectedReceipt.driver_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Yakıt Türü</label>
                  <p className="text-gray-900">{selectedReceipt.fuel_type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Miktar</label>
                  <p className="text-gray-900">{selectedReceipt.quantity_liters} Litre</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Birim Fiyat</label>
                  <p className="text-gray-900">₺{selectedReceipt.unit_price}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Toplam Tutar</label>
                  <p className="text-gray-900 font-semibold text-green-600">₺{selectedReceipt.total_amount}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">KDV</label>
                  <p className="text-gray-900">₺{selectedReceipt.vat_amount || '0.00'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">İstasyon</label>
                  <p className="text-gray-900">{selectedReceipt.station_name}</p>
                </div>
                {selectedReceipt.region && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-600 mb-1">Bölge</label>
                    <p className="text-gray-900">{getRegionDisplayName(selectedReceipt.region)}</p>
                  </div>
                )}
                {selectedReceipt.km_reading && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">KM Okuma</label>
                    <p className="text-gray-900">{selectedReceipt.km_reading} KM</p>
                  </div>
                )}
                {selectedReceipt.notes && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-600 mb-1">Notlar</label>
                    <p className="text-gray-900">{selectedReceipt.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptHistory;
