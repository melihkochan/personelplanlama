import React, { useState, useEffect, useMemo } from 'react';
import { 
  Fuel, 
  List, 
  Plus, 
  BarChart3, 
  Settings,
  Car,
  User,
  MapPin,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Download
} from 'lucide-react';
import FuelReceiptList from './FuelReceiptList';
import FuelReceiptForm from './FuelReceiptForm';
import FuelReceiptAnalytics from './FuelReceiptAnalytics';
import { fuelReceiptService } from '../../services/supabase';

// Cache mekanizması - component dışında tutuyoruz ki tekrar yüklendiğinde korunsun
let cachedReceipts = null;
let lastFetchTime = null;
const CACHE_DURATION = 30000; // 30 saniye cache süresi

const YakıtTakip = ({ vehicleData = [], personnelData = [], currentUser, initialTab = 'fuel-receipt-list', onTabChange }) => {
  // App.js'den gelen tab'i internal format'a çevir
  const getInternalTab = (appTab) => {
    if (appTab === 'fuel-receipt-form') return 'add';
    if (appTab === 'fuel-receipt-analytics') return 'analytics';
    return 'list'; // fuel-receipt-list
  };

  const [activeTab, setActiveTab] = useState(getInternalTab(initialTab));
  const [receipts, setReceipts] = useState(cachedReceipts || []);
  const [loading, setLoading] = useState(false);

  // initialTab değiştiğinde internal tab'i güncelle
  useEffect(() => {
    setActiveTab(getInternalTab(initialTab));
  }, [initialTab]);

  // Verileri bir kere yükle ve cache'le
  useEffect(() => {
    const now = Date.now();
    // Cache varsa ve süre dolmamışsa, API çağrısı yapma
    if (cachedReceipts && lastFetchTime && (now - lastFetchTime < CACHE_DURATION)) {
      setReceipts(cachedReceipts);
    } else {
      loadReceipts();
    }
  }, []);

  const loadReceipts = async (forceRefresh = false, showLoading = true) => {
    // Force refresh değilse ve cache geçerliyse, API çağrısı yapma
    const now = Date.now();
    if (!forceRefresh && cachedReceipts && lastFetchTime && (now - lastFetchTime < CACHE_DURATION)) {
      setReceipts(cachedReceipts);
      return;
    }

    if (showLoading) setLoading(true);
    try {
      const result = await fuelReceiptService.getAllReceipts();
      if (result.success) {
        cachedReceipts = result.data;
        lastFetchTime = Date.now();
        setReceipts(result.data);
      } else {
        console.error('Fişler yüklenirken hata:', result.error);
      }
    } catch (error) {
      console.error('Fişler yüklenirken hata:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Fiş kaydetme
  const handleSaveReceipt = async (receiptData) => {
    // Fiş zaten FuelReceiptForm'da kaydedildi, burada sadece cache'i temizle
    try {
      // Cache'i temizle ki yeni fiş listede görünsün
      cachedReceipts = null;
      // Liste yenilemeyi arka planda yap (loading gösterme)
      loadReceipts(false, false); // forceRefresh = false, showLoading = false
    } catch (error) {
      console.error('Cache temizlenirken hata:', error);
    }
  };

  // Fiş güncelleme
  const handleUpdateReceipt = async (receiptId, updates) => {
    try {
      const result = await fuelReceiptService.updateReceipt(receiptId, updates);
      if (result.success) {
        // Cache'i temizle ve listeyi yenile (loading gösterme)
        cachedReceipts = null;
        await loadReceipts(true, false);
      } else {
        console.error('Fiş güncellenirken hata:', result.error);
      }
    } catch (error) {
      console.error('Fiş güncellenirken hata:', error);
    }
  };

  // Manuel yenileme (force refresh)
  const handleRefresh = async () => {
    cachedReceipts = null;
    await loadReceipts(true, true); // Manuel yenileme için loading göster
  };

  // Araç ekleme
  const handleAddVehicle = (vehicleData) => {
    // Bu fonksiyon parent component'e bildirilecek
    console.log('Yeni araç eklendi:', vehicleData);
  };

  // Internal tab'den App.js tab'ine çevir
  const getAppTab = (internalTab) => {
    if (internalTab === 'add') return 'fuel-receipt-form';
    if (internalTab === 'analytics') return 'fuel-receipt-analytics';
    return 'fuel-receipt-list';
  };

  // Tab değişikliğini App.js'e bildir
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    if (onTabChange) {
      onTabChange(getAppTab(newTab));
    }
  };

  // Tab menüleri
  const tabs = [
    {
      id: 'list',
      name: 'Fiş Listesi',
      icon: List,
      description: 'Tüm yakıt fişlerini görüntüle ve yönet'
    },
    {
      id: 'add',
      name: 'Yeni Fiş',
      icon: Plus,
      description: 'Yeni yakıt fişi ekle'
    },
    {
      id: 'analytics',
      name: 'Analizler',
      icon: BarChart3,
      description: 'Detaylı raporlar ve analizler'
    }
  ];

  // İstatistikler - memoize ile gereksiz hesaplamaları önle
  const stats = useMemo(() => ({
    total: receipts.length,
    pending: receipts.filter(r => r.status === 'pending').length,
    approved: receipts.filter(r => r.status === 'approved').length,
    rejected: receipts.filter(r => r.status === 'rejected').length,
    totalAmount: receipts.reduce((sum, r) => sum + (r.total_amount || 0), 0)
  }), [receipts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Fuel className="w-6 h-6 text-white" />
              </div>
              Yakıt Fiş Takip Sistemi
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Yakıt tüketimi ve maliyet takibi
            </p>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Fiş Listesi için Quick Stats ve Filtreler */}
        {activeTab === 'list' && (
          <>
            {/* Quick Stats */}
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
                    <p className="text-2xl font-bold text-green-900">
                      {receipts.reduce((sum, r) => sum + (r.quantity_liters || 0), 0).toFixed(2)}L
                    </p>
                  </div>
                  <Fuel className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600 font-medium">Toplam Araç</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {new Set(receipts.map(r => r.vehicle_plate)).size}
                    </p>
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
                        currency: 'TRY',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      })}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>

          </>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-xl shadow-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Veriler yükleniyor...</p>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'list' && (
            <FuelReceiptList 
              vehicleData={vehicleData}
              personnelData={personnelData}
              currentUser={currentUser}
              receipts={receipts}
              onUpdateReceipt={handleUpdateReceipt}
              onRefresh={handleRefresh}
            />
          )}
          
          {activeTab === 'add' && (
            <FuelReceiptForm 
              vehicleData={vehicleData}
              personnelData={personnelData}
              currentUser={currentUser}
              onSave={handleSaveReceipt}
              onCancel={() => handleTabChange('list')}
            />
          )}
          
          {activeTab === 'analytics' && (
            <FuelReceiptAnalytics 
              receipts={receipts}
              vehicleData={vehicleData}
              personnelData={personnelData}
              onRefresh={handleRefresh}
            />
          )}
        </>
      )}
    </div>
  );
};

export default YakıtTakip;
