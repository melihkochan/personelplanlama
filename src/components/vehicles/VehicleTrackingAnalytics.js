import React, { useState, useEffect, useMemo } from 'react';
import { 
  Car, 
  User, 
  MapPin, 
  Clock, 
  TrendingUp, 
  BarChart3,
  Download,
  RefreshCw,
  Calendar,
  Filter
} from 'lucide-react';
import { vehicleTrackingService } from '../../services/supabase';

const VehicleTrackingAnalytics = () => {
  const [trackingData, setTrackingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');

  // Veri yükleme
  const loadTrackingData = async () => {
    try {
      setLoading(true);
      const result = await vehicleTrackingService.getTrackingRecords();
      if (result.success) {
        setTrackingData(result.data || []);
      } else {
        console.error('Veri yükleme hatası:', result.error);
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrackingData();
  }, []);

  // Filtrelenmiş veri
  const filteredData = useMemo(() => {
    let filtered = trackingData;

    if (selectedDate) {
      filtered = filtered.filter(item => item.date === selectedDate);
    }
    if (selectedRegion) {
      filtered = filtered.filter(item => item.region === selectedRegion);
    }
    if (selectedDriver) {
      filtered = filtered.filter(item => item.driver_name === selectedDriver);
    }

    return filtered;
  }, [trackingData, selectedDate, selectedRegion, selectedDriver]);

  // Bölge görüntüleme adı
  const getRegionDisplayName = (region) => {
    const regionNames = {
      'ISTANBUL_AND': 'İstanbul Anadolu',
      'ISTANBUL_AVR': 'İstanbul Avrupa',
      'ANKARA': 'Ankara',
      'IZMIR': 'İzmir',
      'BURSA': 'Bursa',
      'ANTALYA': 'Antalya',
      'ADANA': 'Adana'
    };
    return regionNames[region] || region;
  };

  // İstatistikler hesapla
  const stats = useMemo(() => {
    const totalRecords = filteredData.length;
    const totalEntries = filteredData.reduce((sum, item) => sum + (item.vehicle_tracking_entries?.length || 0), 0);
    const totalKm = filteredData.reduce((sum, item) => {
      const entries = item.vehicle_tracking_entries || [];
      if (entries.length > 0) {
        const firstKm = entries[0].departure_km || 0;
        const lastKm = entries[entries.length - 1].departure_km || 0;
        return sum + (lastKm - firstKm);
      }
      return sum;
    }, 0);
    const uniqueVehicles = [...new Set(filteredData.map(item => item.vehicle_plate))].length;
    const uniqueDrivers = [...new Set(filteredData.map(item => item.driver_name))].length;
    const regions = [...new Set(filteredData.map(item => item.region))];

    return {
      totalRecords,
      totalEntries,
      totalKm,
      uniqueVehicles,
      uniqueDrivers,
      regions
    };
  }, [filteredData]);

  // Şoför analizi (bölgelere göre)
  const driverAnalysisByRegion = useMemo(() => {
    const regionDriverStats = {};
    
    filteredData.forEach(item => {
      const region = item.region;
      const driver = item.driver_name;
      
      if (!regionDriverStats[region]) {
        regionDriverStats[region] = {};
      }
      
      if (!regionDriverStats[region][driver]) {
        regionDriverStats[region][driver] = {
          name: driver,
          region: region,
          totalRecords: 0,
          totalEntries: 0,
          totalKm: 0,
          vehicles: new Set()
        };
      }
      
      regionDriverStats[region][driver].totalRecords++;
      regionDriverStats[region][driver].totalEntries += item.vehicle_tracking_entries?.length || 0;
      regionDriverStats[region][driver].vehicles.add(item.vehicle_plate);
      
      const entries = item.vehicle_tracking_entries || [];
      if (entries.length > 0) {
        const firstKm = entries[0].departure_km || 0;
        const lastKm = entries[entries.length - 1].departure_km || 0;
        regionDriverStats[region][driver].totalKm += (lastKm - firstKm);
      }
    });

    // Her bölge için şoförleri sırala ve düzenle
    const result = [];
    Object.keys(regionDriverStats).forEach(region => {
      const drivers = Object.values(regionDriverStats[region]).map(driver => ({
        ...driver,
        vehicles: Array.from(driver.vehicles)
      })).sort((a, b) => b.totalKm - a.totalKm);
      
      result.push({
        region,
        drivers,
        totalRecords: drivers.reduce((sum, d) => sum + d.totalRecords, 0),
        totalEntries: drivers.reduce((sum, d) => sum + d.totalEntries, 0),
        totalKm: drivers.reduce((sum, d) => sum + d.totalKm, 0),
        totalVehicles: [...new Set(drivers.flatMap(d => d.vehicles))].length
      });
    });

    return result.sort((a, b) => b.totalKm - a.totalKm);
  }, [filteredData]);


  // Excel export
  const exportToExcel = () => {
    try {
      const XLSX = require('xlsx');
      
      // Bölge bazlı şoför analizi
      const regionDriverData = [];
      driverAnalysisByRegion.forEach(regionData => {
        regionData.drivers.forEach(driver => {
          regionDriverData.push({
            'Bölge': getRegionDisplayName(regionData.region),
            'Şoför': driver.name,
            'Toplam Kayıt': driver.totalRecords,
            'Toplam Nokta': driver.totalEntries,
            'Toplam KM': driver.totalKm,
            'Kullanılan Araçlar': driver.vehicles.join(', ')
          });
        });
      });

      // Çalışma kitabı oluştur
      const wb = XLSX.utils.book_new();
      
      // Sayfayı ekle
      const ws1 = XLSX.utils.json_to_sheet(regionDriverData);
      
      // Sütun genişliklerini ayarla
      ws1['!cols'] = [
        { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 }
      ];
      
      XLSX.utils.book_append_sheet(wb, ws1, 'Bölge Bazlı Şoför Analizi');
      
      // Dosyayı indir
      const fileName = `Arac_Takip_Analizi_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      console.log('Excel dosyası başarıyla oluşturuldu:', fileName);
    } catch (error) {
      console.error('Excel export hatası:', error);
      alert('Excel dosyası oluşturulurken hata oluştu: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                Araç Takip Analizi
              </h1>
              <p className="text-gray-600">Detaylı analiz ve raporlar</p>
            </div>
            
          </div>
        </div>

        {/* Filtreler */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bölge</label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Tüm Bölgeler</option>
                {[...new Set(trackingData.map(item => item.region))].map(region => (
                  <option key={region} value={region}>{getRegionDisplayName(region)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şoför</label>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Tüm Şoförler</option>
                {[...new Set(trackingData.map(item => item.driver_name))].map(driver => (
                  <option key={driver} value={driver}>{driver}</option>
                ))}
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


        {/* Şoför Analizi - Bölgelere Göre */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Şoför Performans Analizi (Bölgelere Göre)
          </h3>
          
          {driverAnalysisByRegion.map((regionData, regionIndex) => (
            <div key={regionData.region} className="mb-8 last:mb-0">
              {/* Bölge Başlığı ve İstatistikler */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 mb-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-white">{getRegionDisplayName(regionData.region)}</h4>
                  </div>
                  <div className="flex gap-8 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-white text-lg">{regionData.totalRecords}</div>
                      <div className="text-blue-100 font-medium">Kayıt</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-white text-lg">{regionData.totalEntries}</div>
                      <div className="text-blue-100 font-medium">Nokta</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-white text-lg">{regionData.totalKm.toLocaleString()}</div>
                      <div className="text-blue-100 font-medium">KM</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-white text-lg">{regionData.totalVehicles}</div>
                      <div className="text-blue-100 font-medium">Araç</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Şoför Tablosu */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şoför</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Kayıt</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Nokta</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam KM</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Araç Sayısı</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {regionData.drivers.map((driver, driverIndex) => (
                      <tr key={driver.name} className={driverIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="font-medium text-gray-900">{driver.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{driver.totalRecords}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{driver.totalEntries}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{driver.totalKm.toLocaleString()} km</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{driver.vehicles.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default VehicleTrackingAnalytics;
