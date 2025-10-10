import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Car, 
  Fuel, 
  DollarSign, 
  User, 
  MapPin, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  LineChart,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';

const FuelReceiptAnalytics = ({ receipts = [], vehicleData = [], personnelData = [] }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [loading, setLoading] = useState(false);

  // Mock data - gerçek veriler Supabase'den gelecek
  const mockReceipts = [
    {
      id: 1,
      vehicle_plate: '34NVK210',
      driver_name: 'Ahmet Yılmaz',
      date: '2025-01-10',
      fuel_type: 'MOTORIN SVPD',
      quantity_liters: 99.62,
      total_amount: 5328.67,
      km_reading: 125000,
      status: 'approved'
    },
    {
      id: 2,
      vehicle_plate: '34NVK156',
      driver_name: 'Mehmet Demir',
      date: '2025-01-10',
      fuel_type: 'MOTORIN SVPD',
      quantity_liters: 113.48,
      total_amount: 6070.05,
      km_reading: 98000,
      status: 'approved'
    },
    {
      id: 3,
      vehicle_plate: '34ABC123',
      driver_name: 'Ali Kaya',
      date: '2025-01-09',
      fuel_type: 'BENZIN',
      quantity_liters: 45.20,
      total_amount: 2495.04,
      km_reading: 75000,
      status: 'approved'
    },
    {
      id: 4,
      vehicle_plate: '34NVK210',
      driver_name: 'Ahmet Yılmaz',
      date: '2025-01-08',
      fuel_type: 'MOTORIN SVPD',
      quantity_liters: 85.30,
      total_amount: 4561.55,
      km_reading: 124500,
      status: 'approved'
    }
  ];

  const [analyticsData, setAnalyticsData] = useState(mockReceipts);

  // Personnel tablosundan şoförleri çek
  const getDriversFromPersonnel = () => {
    return personnelData.filter(person => 
      person.position && person.position.toUpperCase() === 'ŞOFÖR'
    );
  };

  const drivers = getDriversFromPersonnel();

  // Filtreleme
  const filteredData = analyticsData.filter(receipt => {
    const matchesVehicle = !selectedVehicle || receipt.vehicle_plate === selectedVehicle;
    return matchesVehicle;
  });

  // İstatistikler hesaplama
  const calculateStats = () => {
    const totalAmount = filteredData.reduce((sum, r) => sum + r.total_amount, 0);
    const totalLiters = filteredData.reduce((sum, r) => sum + r.quantity_liters, 0);
    const totalReceipts = filteredData.length;
    const averageAmount = totalReceipts > 0 ? totalAmount / totalReceipts : 0;
    const averageLiters = totalReceipts > 0 ? totalLiters / totalReceipts : 0;

    return {
      totalAmount,
      totalLiters,
      totalReceipts,
      averageAmount,
      averageLiters
    };
  };

  // KM Tüketim Analizi
  const calculateConsumptionAnalysis = () => {
    const vehicleConsumption = {};
    
    filteredData.forEach(receipt => {
      if (!vehicleConsumption[receipt.vehicle_plate]) {
        vehicleConsumption[receipt.vehicle_plate] = {
          totalLiters: 0,
          totalKm: 0,
          receipts: []
        };
      }
      
      vehicleConsumption[receipt.vehicle_plate].totalLiters += receipt.quantity_liters;
      vehicleConsumption[receipt.vehicle_plate].receipts.push(receipt);
    });

    // KM hesaplama (basit örnek - gerçek implementasyonda önceki KM okumalarından hesaplanacak)
    Object.keys(vehicleConsumption).forEach(plate => {
      const data = vehicleConsumption[plate];
      if (data.receipts.length > 1) {
        const firstReceipt = data.receipts[data.receipts.length - 1];
        const lastReceipt = data.receipts[0];
        data.totalKm = lastReceipt.km_reading - firstReceipt.km_reading;
      }
    });

    return vehicleConsumption;
  };

  // Şoför Performansı - Personnel verileri ile karşılaştır
  const calculateDriverPerformance = () => {
    const driverStats = {};
    
    // Fiş verilerinden şoför istatistiklerini hesapla
    filteredData.forEach(receipt => {
      if (!driverStats[receipt.driver_name]) {
        driverStats[receipt.driver_name] = {
          totalAmount: 0,
          totalLiters: 0,
          receiptCount: 0,
          vehicle: receipt.vehicle_plate,
          isInPersonnel: false,
          personnelInfo: null
        };
      }
      
      driverStats[receipt.driver_name].totalAmount += receipt.total_amount;
      driverStats[receipt.driver_name].totalLiters += receipt.quantity_liters;
      driverStats[receipt.driver_name].receiptCount += 1;
    });

    // Personnel verileri ile karşılaştır
    drivers.forEach(driver => {
      const driverName = driver.full_name;
      if (driverStats[driverName]) {
        driverStats[driverName].isInPersonnel = true;
        driverStats[driverName].personnelInfo = driver;
      }
    });

    return Object.entries(driverStats).map(([name, stats]) => ({
      name,
      ...stats,
      averageAmount: stats.totalAmount / stats.receiptCount
    })).sort((a, b) => b.totalAmount - a.totalAmount);
  };

  // İstasyon Bazlı Harcama
  const calculateStationExpenses = () => {
    const stationStats = {};
    
    filteredData.forEach(receipt => {
      const station = receipt.station_name || 'Bilinmeyen';
      if (!stationStats[station]) {
        stationStats[station] = {
          totalAmount: 0,
          receiptCount: 0
        };
      }
      
      stationStats[station].totalAmount += receipt.total_amount;
      stationStats[station].receiptCount += 1;
    });

    return Object.entries(stationStats).map(([name, stats]) => ({
      name,
      ...stats
    })).sort((a, b) => b.totalAmount - a.totalAmount);
  };

  // Aylık Harcama Grafiği (Mock data)
  const monthlyExpenses = [
    { month: 'Ocak', amount: 25000, receipts: 15 },
    { month: 'Şubat', amount: 32000, receipts: 18 },
    { month: 'Mart', amount: 28000, receipts: 16 },
    { month: 'Nisan', amount: 35000, receipts: 20 },
    { month: 'Mayıs', amount: 42000, receipts: 24 },
    { month: 'Haziran', amount: 38000, receipts: 22 }
  ];

  const stats = calculateStats();
  const consumptionAnalysis = calculateConsumptionAnalysis();
  const driverPerformance = calculateDriverPerformance();
  const stationExpenses = calculateStationExpenses();

  // Anormal tüketim tespiti
  const detectAbnormalConsumption = () => {
    const abnormalVehicles = [];
    
    Object.entries(consumptionAnalysis).forEach(([plate, data]) => {
      if (data.totalKm > 0) {
        const consumptionPer100km = (data.totalLiters / data.totalKm) * 100;
        
        // Normal tüketim 25-35 L/100km arasında kabul ediliyor
        if (consumptionPer100km > 35 || consumptionPer100km < 15) {
          abnormalVehicles.push({
            plate,
            consumptionPer100km: consumptionPer100km.toFixed(2),
            totalKm: data.totalKm,
            totalLiters: data.totalLiters,
            status: consumptionPer100km > 35 ? 'high' : 'low'
          });
        }
      }
    });
    
    return abnormalVehicles;
  };

  const abnormalConsumption = detectAbnormalConsumption();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              Yakıt Analiz ve Raporlar
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Detaylı yakıt tüketimi ve performans analizleri
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-200 transition-colors">
              <Download className="w-4 h-4" />
              Excel İndir
            </button>
            <button className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600 transition-colors">
              <RefreshCw className="w-4 h-4" />
              Yenile
            </button>
          </div>
        </div>

        {/* Filtreler */}
        <div className="flex flex-col md:flex-row gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dönem</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="week">Bu Hafta</option>
              <option value="month">Bu Ay</option>
              <option value="quarter">Bu Çeyrek</option>
              <option value="year">Bu Yıl</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Araç</label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tüm Araçlar</option>
              {vehicleData.map((vehicle, index) => (
                <option key={index} value={vehicle.license_plate}>
                  {vehicle.license_plate}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Özet İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Toplam Harcama</p>
              <p className="text-2xl font-bold text-blue-900">
                {stats.totalAmount.toLocaleString('tr-TR', { 
                  style: 'currency', 
                  currency: 'TRY' 
                })}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Toplam Litre</p>
              <p className="text-2xl font-bold text-green-900">{stats.totalLiters.toFixed(2)}L</p>
            </div>
            <Fuel className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Toplam Fiş</p>
              <p className="text-2xl font-bold text-purple-900">{stats.totalReceipts}</p>
            </div>
            <Car className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Ortalama Fiş</p>
              <p className="text-2xl font-bold text-orange-900">
                {stats.averageAmount.toLocaleString('tr-TR', { 
                  style: 'currency', 
                  currency: 'TRY' 
                })}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* KM Tüketim Analizi */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Car className="w-5 h-5 text-blue-600" />
          KM Tüketim Analizi
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-4">Araç Bazlı Tüketim (L/100KM)</h4>
            <div className="space-y-3">
              {Object.entries(consumptionAnalysis).map(([plate, data]) => {
                const consumptionPer100km = data.totalKm > 0 ? (data.totalLiters / data.totalKm) * 100 : 0;
                const isAbnormal = consumptionPer100km > 35 || consumptionPer100km < 15;
                
                return (
                  <div key={plate} className={`p-4 rounded-lg border ${isAbnormal ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{plate}</p>
                        <p className="text-sm text-gray-600">
                          {data.totalKm} KM • {data.totalLiters.toFixed(2)}L
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${isAbnormal ? 'text-red-600' : 'text-gray-900'}`}>
                          {consumptionPer100km.toFixed(2)} L/100KM
                        </p>
                        {isAbnormal && (
                          <span className="text-xs text-red-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Anormal
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-4">Anormal Tüketim Uyarıları</h4>
            {abnormalConsumption.length > 0 ? (
              <div className="space-y-3">
                {abnormalConsumption.map((vehicle, index) => (
                  <div key={index} className="p-4 rounded-lg border border-red-200 bg-red-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-red-900">{vehicle.plate}</p>
                        <p className="text-sm text-red-700">
                          {vehicle.totalKm} KM • {vehicle.totalLiters.toFixed(2)}L
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">
                          {vehicle.consumptionPer100km} L/100KM
                        </p>
                        <span className="text-xs text-red-600">
                          {vehicle.status === 'high' ? 'Yüksek Tüketim' : 'Düşük Tüketim'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-green-600 font-medium">Tüm araçlar normal tüketimde</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Şoför Performansı */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-green-600" />
          Şoför Performansı
        </h3>
        
        <div>
          <h4 className="text-md font-medium text-gray-700 mb-4">Tüm Şoför İstatistikleri</h4>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {driverPerformance.map((driver, index) => (
              <div key={index} className={`p-4 rounded-lg border ${driver.isInPersonnel ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-medium text-gray-900">{driver.name}</p>
                      {driver.isInPersonnel && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Personel
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Araç</p>
                        <p className="font-medium">{driver.vehicle}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Fiş Sayısı</p>
                        <p className="font-medium">{driver.receiptCount} adet</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Toplam Litre</p>
                        <p className="font-medium">{driver.totalLiters.toFixed(2)}L</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Ortalama/Fiş</p>
                        <p className="font-medium">
                          {driver.averageAmount.toLocaleString('tr-TR', { 
                            style: 'currency', 
                            currency: 'TRY' 
                          })}
                        </p>
                      </div>
                    </div>
                    {driver.personnelInfo && (
                      <p className="text-xs text-gray-500 mt-2">
                        ID: {driver.personnelInfo.id} • Tel: {driver.personnelInfo.phone || 'N/A'}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-bold text-lg text-gray-900">
                      {driver.totalAmount.toLocaleString('tr-TR', { 
                        style: 'currency', 
                        currency: 'TRY' 
                      })}
                    </p>
                    <p className="text-sm text-gray-600">Toplam Tutar</p>
                  </div>
                </div>
              </div>
            ))}
            {driverPerformance.length === 0 && (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Henüz fiş verisi bulunmuyor</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* İstasyon Bazlı Harcama */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-red-600" />
          İstasyon Bazlı Harcama Dağılımı
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-4">En Çok Harcama Yapılan İstasyonlar</h4>
            <div className="space-y-3">
              {stationExpenses.slice(0, 5).map((station, index) => (
                <div key={index} className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{station.name}</p>
                      <p className="text-sm text-gray-600">{station.receiptCount} fiş</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        {station.totalAmount.toLocaleString('tr-TR', { 
                          style: 'currency', 
                          currency: 'TRY' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-4">Aylık Harcama Trendi</h4>
            <div className="space-y-3">
              {monthlyExpenses.map((month, index) => (
                <div key={index} className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{month.month}</p>
                      <p className="text-sm text-gray-600">{month.receipts} fiş</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        {month.amount.toLocaleString('tr-TR', { 
                          style: 'currency', 
                          currency: 'TRY' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FuelReceiptAnalytics;
