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
import { fuelReceiptService } from '../../services/supabase';
import * as XLSX from 'xlsx';

const FuelReceiptAnalytics = ({ vehicleData = [], personnelData = [] }) => {
  const [receipts, setReceipts] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [loading, setLoading] = useState(false);

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

  // Personnel tablosundan şoförleri çek
  const getDriversFromPersonnel = () => {
    return personnelData.filter(person => 
      person.position && person.position.toUpperCase() === 'ŞOFÖR'
    );
  };

  const drivers = getDriversFromPersonnel();

  // Filtreleme
  const filteredData = receipts.filter(receipt => {
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

  // Plaka Bazında Yakıt Analizi
  const calculateVehicleFuelAnalysis = () => {
    const vehicleStats = {};
    
    filteredData.forEach(receipt => {
      if (!vehicleStats[receipt.vehicle_plate]) {
        vehicleStats[receipt.vehicle_plate] = {
          totalAmount: 0,
          totalLiters: 0,
          receiptCount: 0,
          receipts: [],
          fuelTypes: new Set()
        };
      }
      
      vehicleStats[receipt.vehicle_plate].totalAmount += receipt.total_amount;
      vehicleStats[receipt.vehicle_plate].totalLiters += receipt.quantity_liters;
      vehicleStats[receipt.vehicle_plate].receiptCount += 1;
      vehicleStats[receipt.vehicle_plate].receipts.push(receipt);
      vehicleStats[receipt.vehicle_plate].fuelTypes.add(receipt.fuel_type);
    });

    return Object.entries(vehicleStats).map(([plate, data]) => {
      const averagePrice = data.totalLiters > 0 ? data.totalAmount / data.totalLiters : 0;
      const sortedReceipts = data.receipts.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      return {
        plate,
        totalAmount: data.totalAmount,
        totalLiters: data.totalLiters,
        receiptCount: data.receiptCount,
        averagePrice,
        fuelTypes: Array.from(data.fuelTypes),
        firstReceiptDate: sortedReceipts[0]?.date || '-',
        lastReceiptDate: sortedReceipts[sortedReceipts.length - 1]?.date || '-'
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);
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


  const stats = calculateStats();
  const vehicleFuelAnalysis = calculateVehicleFuelAnalysis();
  const driverPerformance = calculateDriverPerformance();

  // Excel indirme
  const handleExportExcel = () => {
    try {
      // Analiz verilerini hazırla
      const analysisData = {
        'Plaka Bazında Yakıt Analizi': vehicleFuelAnalysis.map(vehicle => ({
          'Araç Plakası': vehicle.vehicle,
          'Toplam Tutar (₺)': vehicle.totalAmount,
          'Toplam Litre': vehicle.totalLiters,
          'Ortalama Fiyat': vehicle.averagePrice,
          'Fiş Sayısı': vehicle.receiptCount,
          'İlk Fiş Tarihi': vehicle.firstReceipt,
          'Son Fiş Tarihi': vehicle.lastReceipt,
          'Yakıt Türleri': vehicle.fuelTypes.join(', ')
        })),
        'Şoför Performansı': driverPerformance.map(driver => ({
          'Şoför Adı': driver.name,
          'Araç': driver.vehicle,
          'Fiş Sayısı': driver.receiptCount,
          'Toplam Litre': driver.totalLiters,
          'Ortalama/Fiş': driver.averageAmount,
          'Toplam Tutar (₺)': driver.totalAmount
        }))
      };

      // Workbook oluşturma
      const workbook = XLSX.utils.book_new();

      // Her analiz için ayrı worksheet oluştur
      Object.keys(analysisData).forEach(sheetName => {
        const worksheet = XLSX.utils.json_to_sheet(analysisData[sheetName]);
        
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
        worksheet['!cols'] = Array(Object.keys(analysisData[sheetName][0] || {}).length).fill({ wch: 15 });

        // Worksheet'i workbook'a ekle
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      });

      // Dosyayı indir
      const fileName = `yakıt-analizleri-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
    } catch (error) {
      console.error('Excel indirme hatası:', error);
      alert('Excel dosyası indirilirken hata oluştu: ' + error.message);
    }
  };

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
            <button 
              onClick={handleExportExcel}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-200 transition-colors"
            >
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-xs text-gray-600">Toplam Harcama</p>
              <p className="text-lg font-semibold text-gray-900">
                {stats.totalAmount.toLocaleString('tr-TR', { 
                  style: 'currency', 
                  currency: 'TRY' 
                })}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <Fuel className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-xs text-gray-600">Toplam Litre</p>
              <p className="text-lg font-semibold text-gray-900">{stats.totalLiters.toFixed(2)}L</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <Car className="w-5 h-5 text-purple-500" />
            <div>
              <p className="text-xs text-gray-600">Toplam Fiş</p>
              <p className="text-lg font-semibold text-gray-900">{stats.totalReceipts}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-xs text-gray-600">Ortalama Fiş</p>
              <p className="text-lg font-semibold text-gray-900">
                {stats.averageAmount.toLocaleString('tr-TR', { 
                  style: 'currency', 
                  currency: 'TRY' 
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Plaka Bazında Yakıt Analizi */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Car className="w-5 h-5 text-blue-600" />
          Plaka Bazında Yakıt Analizi
        </h3>
        
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plaka</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fiş Sayısı</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Litre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ortalama Fiyat/L</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Tutar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İlk Fiş</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Son Fiş</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vehicleFuelAnalysis.map((vehicle, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Car className="w-5 h-5 text-blue-500 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{vehicle.plate}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{vehicle.receiptCount} adet</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{vehicle.totalLiters.toFixed(2)}L</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{vehicle.averagePrice.toFixed(2)} TL</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {vehicle.totalAmount.toLocaleString('tr-TR', {
                          style: 'currency',
                          currency: 'TRY'
                        })}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{vehicle.firstReceiptDate}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{vehicle.lastReceiptDate}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {vehicleFuelAnalysis.length === 0 && (
          <div className="text-center py-8">
            <Car className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Henüz yakıt verisi bulunmuyor</p>
          </div>
        )}
      </div>

      {/* Şoför Performansı */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-green-600" />
          Şoför Performansı
        </h3>
        
          <div>
          <h4 className="text-md font-medium text-gray-700 mb-4">Tüm Şoför İstatistikleri</h4>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şoför</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Araç</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fiş Sayısı</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Litre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ortalama/Fiş</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Tutar</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {driverPerformance.map((driver, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-5 h-5 text-green-500 mr-2" />
                          <span className="text-sm font-medium text-gray-900">{driver.name}</span>
                    </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{driver.vehicle}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{driver.receiptCount} adet</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{driver.totalLiters.toFixed(2)}L</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {driver.averageAmount.toLocaleString('tr-TR', { 
                          style: 'currency', 
                          currency: 'TRY' 
                        })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {driver.totalAmount.toLocaleString('tr-TR', { 
                            style: 'currency', 
                            currency: 'TRY' 
                          })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {driverPerformance.length === 0 && (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Henüz fiş verisi bulunmuyor</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FuelReceiptAnalytics;
