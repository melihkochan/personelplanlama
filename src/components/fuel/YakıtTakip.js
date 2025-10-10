import React, { useState, useEffect } from 'react';
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
  Clock
} from 'lucide-react';
import FuelReceiptList from './FuelReceiptList';
import FuelReceiptForm from './FuelReceiptForm';
import FuelReceiptAnalytics from './FuelReceiptAnalytics';

const YakıtTakip = ({ vehicleData = [], currentUser }) => {
  const [activeTab, setActiveTab] = useState('list');
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Mock data - gerçek veriler Supabase'den gelecek
  const mockReceipts = [
    {
      id: 1,
      receipt_number: '0092',
      vehicle_plate: '34NVK210',
      driver_name: 'Ahmet Yılmaz',
      date: '2025-01-10',
      time: '14:32',
      fuel_type: 'MOTORIN SVPD',
      quantity_liters: 99.62,
      unit_price: 53.49,
      total_amount: 5328.67,
      vat_amount: 888.11,
      pump_number: '04',
      station_name: 'Shell Petrol A.Ş.',
      station_location: 'Gebze/Kocaeli',
      km_reading: 125000,
      status: 'approved',
      created_at: '2025-01-10T14:32:00Z'
    },
    {
      id: 2,
      receipt_number: '0053',
      vehicle_plate: '34NVK156',
      driver_name: 'Mehmet Demir',
      date: '2025-01-10',
      time: '14:34',
      fuel_type: 'MOTORIN SVPD',
      quantity_liters: 113.48,
      unit_price: 53.49,
      total_amount: 6070.05,
      vat_amount: 1011.67,
      pump_number: '01',
      station_name: 'Shell Petrol A.Ş. Sultanorhan',
      station_location: 'Gebze/Kocaeli',
      km_reading: 98000,
      status: 'pending',
      created_at: '2025-01-10T14:34:00Z'
    },
    {
      id: 3,
      receipt_number: '0123',
      vehicle_plate: '34ABC123',
      driver_name: 'Ali Kaya',
      date: '2025-01-09',
      time: '16:45',
      fuel_type: 'BENZIN',
      quantity_liters: 45.20,
      unit_price: 55.20,
      total_amount: 2495.04,
      vat_amount: 415.84,
      pump_number: '02',
      station_name: 'Petrol Ofisi',
      station_location: 'İstanbul/Beşiktaş',
      km_reading: 75000,
      status: 'rejected',
      created_at: '2025-01-09T16:45:00Z'
    }
  ];

  useEffect(() => {
    setReceipts(mockReceipts);
  }, []);

  // Fiş kaydetme
  const handleSaveReceipt = (receiptData) => {
    const newReceipt = {
      ...receiptData,
      id: Date.now(),
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    setReceipts(prev => [newReceipt, ...prev]);
    setActiveTab('list');
  };

  // Fiş güncelleme
  const handleUpdateReceipt = (receiptId, updates) => {
    setReceipts(prev => prev.map(receipt => 
      receipt.id === receiptId 
        ? { ...receipt, ...updates }
        : receipt
    ));
  };

  // Araç ekleme
  const handleAddVehicle = (vehicleData) => {
    // Bu fonksiyon parent component'e bildirilecek
    console.log('Yeni araç eklendi:', vehicleData);
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

  // İstatistikler
  const stats = {
    total: receipts.length,
    pending: receipts.filter(r => r.status === 'pending').length,
    approved: receipts.filter(r => r.status === 'approved').length,
    rejected: receipts.filter(r => r.status === 'rejected').length,
    totalAmount: receipts.reduce((sum, r) => sum + r.total_amount, 0)
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Fuel className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Yakıt Fiş Takip Sistemi</h1>
                <p className="text-sm text-gray-600">Yakıt tüketimi ve maliyet takibi</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-gray-600">{stats.pending} Beklemede</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">{stats.approved} Onaylandı</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-gray-600">{stats.rejected} Reddedildi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'list' && (
          <FuelReceiptList 
            vehicleData={vehicleData}
            currentUser={currentUser}
            receipts={receipts}
            onUpdateReceipt={handleUpdateReceipt}
          />
        )}
        
        {activeTab === 'add' && (
          <FuelReceiptForm 
            vehicleData={vehicleData}
            currentUser={currentUser}
            onSave={handleSaveReceipt}
            onCancel={() => setActiveTab('list')}
          />
        )}
        
        {activeTab === 'analytics' && (
          <FuelReceiptAnalytics 
            receipts={receipts}
            vehicleData={vehicleData}
          />
        )}
      </div>

      {/* Quick Stats Footer */}
      <div className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              <p className="text-sm text-gray-600">Toplam Fiş</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-sm text-gray-600">Beklemede</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              <p className="text-sm text-gray-600">Onaylandı</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {stats.totalAmount.toLocaleString('tr-TR', { 
                  style: 'currency', 
                  currency: 'TRY',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </p>
              <p className="text-sm text-gray-600">Toplam Harcama</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YakıtTakip;
