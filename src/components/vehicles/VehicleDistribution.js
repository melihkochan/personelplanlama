import React, { useState, useEffect, useMemo } from 'react';
import { getPerformanceData, getAllPersonnel, getAllVehicles } from '../../services/supabase';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'; // Added lucide-react for sort icons

const VehicleDistribution = () => {
  const [performanceData, setPerformanceData] = useState([]);
  const [personnelData, setPersonnelData] = useState([]);
  const [vehicleData, setVehicleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Mevcut ayları ve yılları hesapla
  const availableMonthsAndYears = useMemo(() => {
    if (!performanceData.length) return { months: [], years: [] };
    
    const monthYearSet = new Set();
    performanceData.forEach(record => {
      const recordDate = new Date(record.date);
      const month = recordDate.getMonth();
      const year = recordDate.getFullYear();
      monthYearSet.add(`${year}-${month}`);
    });
    
    const months = [];
    const years = [];
    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    
    monthYearSet.forEach(monthYear => {
      const [year, month] = monthYear.split('-').map(Number);
      months.push({ value: month, label: monthNames[month], year });
      years.push(year);
    });
    
    // Ayları yıla göre sırala
    months.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.value - a.value;
    });
    
    // Yılları sırala
    years.sort((a, b) => b - a);
    
    return { months, years: [...new Set(years)] };
  }, [performanceData]);

  // Pozisyon sıralama değeri - Sevkiyat Elemanları önce, sonra Şoförler
  const getPositionOrder = (position) => {
    if (position === 'Sevkiyat Elemanları') return 1;
    if (position === 'Şoförler') return 2;
    return 3;
  };

  // Araç tipini belirle
  const getVehicleType = (licensePlate, recordVehicleType) => {
    if (!licensePlate) return 'Bilinmiyor';
    const plate = licensePlate.toString().toUpperCase();
    
    // 1. Önce record'daki vehicle_type'a bak
    if (recordVehicleType) {
      const vehicleType = recordVehicleType.toString().toUpperCase();
      if (vehicleType.includes('KAMYON') && !vehicleType.includes('KAMYONET')) return 'Kamyon';
      if (vehicleType.includes('KAMYONET')) return 'Kamyonet';
      if (vehicleType.includes('PANELVAN')) return 'Panelvan';
      if (vehicleType.includes('TIR')) return 'Tır';
      if (vehicleType.includes('KÜÇÜK')) return 'Küçük Araç';
    }
    
    // 2. Vehicles tablosundan ara
    const vehicle = vehicleData.find(v => v.license_plate && v.license_plate.toString().toUpperCase() === plate);
    if (vehicle && vehicle.vehicle_type) {
      const vehicleType = vehicle.vehicle_type.toString().toUpperCase();
      if (vehicleType.includes('KAMYON') && !vehicleType.includes('KAMYONET')) return 'Kamyon';
      if (vehicleType.includes('KAMYONET')) return 'Kamyonet';
      if (vehicleType.includes('PANELVAN')) return 'Panelvan';
      if (vehicleType.includes('TIR')) return 'Tır';
      if (vehicleType.includes('KÜÇÜK')) return 'Küçük Araç';
      return vehicle.vehicle_type;
    }
    
    // 3. Plaka içeriğinden tahmin et
    if (plate.includes('PANELVAN')) return 'Panelvan';
    if (plate.includes('KAMYONET') || plate.includes('PICKUP')) return 'Kamyonet';
    if (plate.includes('KAMYON') || plate.includes('TRUCK')) return 'Kamyon';
    if (plate.includes('TIR') || plate.includes('SEMI')) return 'Tır';
    if (plate.includes('KÜÇÜK') || plate.includes('SMALL')) return 'Küçük Araç';
    
    // 4. Varsayılan olarak Kamyon
    return 'Kamyon';
  };

  // Tur sayısını hesapla (her -2, -3 ayrı tur)
  const getTripCount = (licensePlate) => {
    if (!licensePlate) return 1;
    const plate = licensePlate.toString();
    if (plate.includes('-')) {
      const tripNo = parseInt(plate.split('-')[1]);
      return tripNo || 1;
    }
    return 1;
  };

  // Çift tur sayısını hesapla (her -2, -3 ayrı çift tur)
  const getDoubleTripCount = (licensePlate) => {
    if (!licensePlate) return 0;
    const plate = licensePlate.toString();
    if (plate.includes('-')) {
      const tripNo = parseInt(plate.split('-')[1]);
      // -2 = 1 çift tur, -3 = 2 çift tur, -4 = 3 çift tur
      return tripNo >= 2 ? tripNo - 1 : 0;
    }
    return 0;
  };

  // Sıralama fonksiyonu
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // İstatistikleri hazırla
  const processedData = useMemo(() => {
    if (!performanceData.length || !personnelData.length) {
      return [];
    }
    
    const filteredData = performanceData.filter(record => {
      const recordDate = new Date(record.date);
      const recordMonth = recordDate.getMonth();
      const recordYear = recordDate.getFullYear();
      if (selectedDay) {
        const selectedDate = new Date(selectedDay);
        return recordDate.toDateString() === selectedDate.toDateString();
      } else {
        return recordMonth === selectedMonth && recordYear === selectedYear;
      }
    });
    
    let result = personnelData.map(personnel => {
      const personnelRecords = filteredData.filter(record => record.employee_code === personnel.employee_code);
      const stats = {
        Kamyon: { total: 0, doubleTrips: 0 },
        Kamyonet: { total: 0, doubleTrips: 0 },
        Panelvan: { total: 0, doubleTrips: 0 }
      };
      
      // Günlük bazda gruplandır
      const dailyStats = {};
      
      personnelRecords.forEach(record => {
        const recordDate = new Date(record.date);
        const dateKey = recordDate.toDateString(); // Gün bazında key
        const type = getVehicleType(record.license_plate, record.vehicle_type);
        
        if (!stats[type]) return;
        
        // Günlük istatistikleri başlat
        if (!dailyStats[dateKey]) {
          dailyStats[dateKey] = {
            Kamyon: { hasTrip: false, hasDoubleTrip: false },
            Kamyonet: { hasTrip: false, hasDoubleTrip: false },
            Panelvan: { hasTrip: false, hasDoubleTrip: false }
          };
        }
        
        // Bu gün bu araç tipinde tur var
        dailyStats[dateKey][type].hasTrip = true;
        
        // Çift tur kontrolü
        const doubleTrips = getDoubleTripCount(record.license_plate);
        if (doubleTrips > 0) {
          dailyStats[dateKey][type].hasDoubleTrip = true;
        }
      });
      
      // Günlük istatistikleri topla
      Object.values(dailyStats).forEach(dayStats => {
        Object.entries(dayStats).forEach(([vehicleType, dayData]) => {
          if (dayData.hasTrip) {
            stats[vehicleType].total++;
          }
          if (dayData.hasDoubleTrip) {
            stats[vehicleType].doubleTrips++;
          }
        });
      });
      
      return {
        ...personnel,
        vehicleStats: stats,
        employeeCodeNum: parseInt(personnel.employee_code) || 0
      };
    });

    // Varsayılan sıralama: Önce pozisyona göre sırala (Sevkiyat Elemanları önce, sonra Şoförler)
    if (!sortConfig.key || sortConfig.key === 'default') {
      result.sort((a, b) => {
        const aIsSevkiyat = a.position && a.position.toUpperCase().includes('SEVKİYAT');
        const bIsSevkiyat = b.position && b.position.toUpperCase().includes('SEVKİYAT');
        const aIsSofor = a.position && a.position.toUpperCase().includes('ŞOFÖR');
        const bIsSofor = b.position && b.position.toUpperCase().includes('ŞOFÖR');

        // Sevkiyat Elemanları önce
        if (aIsSevkiyat && !bIsSevkiyat) return -1;
        if (!aIsSevkiyat && bIsSevkiyat) return 1;

        // Şoförler ikinci
        if (aIsSofor && !bIsSofor && !aIsSevkiyat && !bIsSevkiyat) return -1;
        if (!aIsSofor && bIsSofor && !aIsSevkiyat && !bIsSevkiyat) return 1;

        // Aynı pozisyondaysa sicil numarasına göre sırala
        if (aIsSevkiyat && bIsSevkiyat) {
          return a.employeeCodeNum - b.employeeCodeNum;
        }
        if (aIsSofor && bIsSofor) {
          return a.employeeCodeNum - b.employeeCodeNum;
        }

        // Diğer pozisyonlar için sicil numarasına göre
        return a.employeeCodeNum - b.employeeCodeNum;
      });
    } else {
      // Kullanıcı sıralaması uygula
      result.sort((a, b) => {
        let aValue, bValue;
        
        if (sortConfig.key.startsWith('kamyon')) {
          aValue = a.vehicleStats.Kamyon[sortConfig.key.includes('double') ? 'doubleTrips' : 'total'];
          bValue = b.vehicleStats.Kamyon[sortConfig.key.includes('double') ? 'doubleTrips' : 'total'];
        } else if (sortConfig.key.startsWith('kamyonet')) {
          aValue = a.vehicleStats.Kamyonet[sortConfig.key.includes('double') ? 'doubleTrips' : 'total'];
          bValue = b.vehicleStats.Kamyonet[sortConfig.key.includes('double') ? 'doubleTrips' : 'total'];
        } else if (sortConfig.key.startsWith('panelvan')) {
          aValue = a.vehicleStats.Panelvan[sortConfig.key.includes('double') ? 'doubleTrips' : 'total'];
          bValue = b.vehicleStats.Panelvan[sortConfig.key.includes('double') ? 'doubleTrips' : 'total'];
        } else if (sortConfig.key === 'position') {
          aValue = a.position.toLowerCase();
          bValue = b.position.toLowerCase();
        } else if (sortConfig.key === 'employee_code') {
          aValue = a.employeeCodeNum;
          bValue = b.employeeCodeNum;
        } else if (sortConfig.key === 'full_name') {
          aValue = a.full_name.toLowerCase();
          bValue = b.full_name.toLowerCase();
        } else {
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
        }
        
        if (sortConfig.direction === 'asc') {
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return aValue.localeCompare(bValue);
          }
          return aValue - bValue;
        } else {
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return bValue.localeCompare(aValue);
          }
          return bValue - aValue;
        }
      });
    }
    
    return result;
  }, [performanceData, personnelData, selectedMonth, selectedYear, selectedDay, vehicleData, sortConfig]);

  // Sıralama ikonu fonksiyonu
  const getSortIcon = (column) => {
    if (sortConfig.key !== column) {
      return <ArrowUpDown className="w-3 h-3 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-blue-600" />
      : <ArrowDown className="w-3 h-3 text-blue-600" />;
  };

  // Pozisyon rengi fonksiyonu
  const getPositionColor = (position) => {
    if (position && position.toUpperCase().includes('SEVKİYAT')) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    } else if (position && position.toUpperCase().includes('ŞOFÖR')) {
      return 'bg-green-100 text-green-800 border-green-300';
    } else {
      return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Araç tur rengi fonksiyonu
  const getVehicleTripColor = (tripCount, baseColor) => {
    if (tripCount === 0) return 'text-gray-400';
    
    // Base color'a göre renk tonları
    if (baseColor === 'orange') {
      if (tripCount >= 15) return 'bg-red-100 text-red-800 border border-red-200';
      if (tripCount >= 10) return 'bg-orange-100 text-orange-800 border border-orange-200';
      if (tripCount >= 5) return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      return 'bg-orange-100 text-orange-800 border border-orange-200';
    } else if (baseColor === 'blue') {
      if (tripCount >= 15) return 'bg-red-100 text-red-800 border border-red-200';
      if (tripCount >= 10) return 'bg-orange-100 text-orange-800 border border-orange-200';
      if (tripCount >= 5) return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      return 'bg-blue-100 text-blue-800 border border-blue-200';
    } else if (baseColor === 'green') {
      if (tripCount >= 15) return 'bg-red-100 text-red-800 border border-red-200';
      if (tripCount >= 10) return 'bg-orange-100 text-orange-800 border border-orange-200';
      if (tripCount >= 5) return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      return 'bg-green-100 text-green-800 border border-green-200';
    }
    
    return 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  // Çift tur rengi fonksiyonu
  const getDoubleTripColor = (doubleTripCount) => {
    if (doubleTripCount === 0) return 'text-gray-400';
    if (doubleTripCount >= 10) return 'bg-red-100 text-red-800 border border-red-200';
    if (doubleTripCount >= 5) return 'bg-orange-100 text-orange-800 border border-orange-200';
    if (doubleTripCount >= 2) return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    return 'bg-green-100 text-green-800 border border-green-200';
  };

  // Özet istatistikleri hesapla
  const summaryStats = useMemo(() => {
    const totalPersonnel = processedData.length;
    const totalKamyon = processedData.reduce((sum, p) => sum + p.vehicleStats.Kamyon.total, 0);
    const totalKamyonet = processedData.reduce((sum, p) => sum + p.vehicleStats.Kamyonet.total, 0);
    const totalPanelvan = processedData.reduce((sum, p) => sum + p.vehicleStats.Panelvan.total, 0);
    const totalDoubleTrips = processedData.reduce((sum, p) => 
      sum + p.vehicleStats.Kamyon.doubleTrips + p.vehicleStats.Kamyonet.doubleTrips + p.vehicleStats.Panelvan.doubleTrips, 0
    );
    
    // Farklı personel sayılarını hesapla
    const kamyonPersonnel = processedData.filter(p => p.vehicleStats.Kamyon.total > 0).length;
    const kamyonetPersonnel = processedData.filter(p => p.vehicleStats.Kamyonet.total > 0).length;
    const panelvanPersonnel = processedData.filter(p => p.vehicleStats.Panelvan.total > 0).length;
    const doubleTripPersonnel = processedData.filter(p => 
      p.vehicleStats.Kamyon.doubleTrips > 0 || p.vehicleStats.Kamyonet.doubleTrips > 0 || p.vehicleStats.Panelvan.doubleTrips > 0
    ).length;
    
    return { 
      totalPersonnel, 
      totalKamyon, 
      totalKamyonet, 
      totalPanelvan, 
      totalDoubleTrips,
      kamyonPersonnel,
      kamyonetPersonnel,
      panelvanPersonnel,
      doubleTripPersonnel
    };
  }, [processedData]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [performanceResult, personnelResult, vehicleResult] = await Promise.all([
          getPerformanceData(),
          getAllPersonnel(),
          getAllVehicles()
        ]);
        
        if (performanceResult.success) {
          setPerformanceData(performanceResult.data || []);
        }
        if (personnelResult.success) {
          setPersonnelData(personnelResult.data || []);
        }
        if (vehicleResult.success) {
          setVehicleData(vehicleResult.data || []);
        }
      } catch (error) {
        console.error('❌ Veri yükleme hatası:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // İlk yüklemede mevcut verilerden ilk ay/yılı seç
  useEffect(() => {
    if (availableMonthsAndYears.months.length > 0 && !selectedMonth && !selectedYear) {
      const firstMonth = availableMonthsAndYears.months[0];
      setSelectedMonth(firstMonth.value);
      setSelectedYear(firstMonth.year);
    }
  }, [availableMonthsAndYears, selectedMonth, selectedYear]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-2">
      <div className="max-w-full mx-auto space-y-3">
        {/* Header - Kutusuz */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              🚗 Personel Araç Dağılımı
            </h1>
            <p className="text-xs text-gray-600 mt-1">Personellerin araç kullanım istatistikleri ve çift tur analizleri</p>
          </div>
        </div>

        {/* Ana İçerik Kartı */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
          {/* Özet İstatistikler */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <div className="bg-blue-50 rounded-lg p-2">
              <div className="text-lg font-bold text-blue-600">
                {summaryStats.totalPersonnel}
              </div>
              <div className="text-xs text-blue-600">Toplam Personel</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-2">
              <div className="text-lg font-bold text-orange-600">
                {summaryStats.totalKamyon}
              </div>
              <div className="text-xs text-orange-600">Kamyon Turu ({summaryStats.kamyonPersonnel} personel)</div>
            </div>
            <div className="bg-green-50 rounded-lg p-2">
              <div className="text-lg font-bold text-green-600">
                {summaryStats.totalKamyonet}
              </div>
              <div className="text-xs text-green-600">Kamyonet Turu ({summaryStats.kamyonetPersonnel} personel)</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-2">
              <div className="text-lg font-bold text-purple-600">
                {summaryStats.totalPanelvan}
              </div>
              <div className="text-xs text-purple-600">Panelvan Turu ({summaryStats.panelvanPersonnel} personel)</div>
            </div>
          </div>
          
          {/* Veri Tarihi */}
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700">Veri Tarihi:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">
                {availableMonthsAndYears.months.find(m => m.value === selectedMonth)?.label} {selectedYear}
              </span>
            </div>
          </div>
          
          {/* Filtreler */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ay Seçin</label>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
              >
                {availableMonthsAndYears.months.map(month => (
                  <option key={`${month.year}-${month.value}`} value={month.value}>
                    {month.label} {month.year}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Yıl</label>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
              >
                {availableMonthsAndYears.years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Gün (Opsiyonel)</label>
              <input 
                type="date"
                onChange={(e) => setSelectedDay(e.target.value ? new Date(e.target.value) : null)}
                className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
              />
            </div>
          </div>
        </div>

        {/* Ana Tablo */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              📊 Personel Araç Kullanım Tablosu
            </h2>
            <p className="text-blue-100 text-xs mt-1">Her personelin araç türlerine göre kullanım istatistikleri</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th 
                    className="px-2 py-2 text-left text-xs font-semibold text-gray-900 sticky left-0 bg-gray-50 z-10 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('employee_code')}
                  >
                    <div className="flex items-center gap-1">
                      Sicil No
                      {getSortIcon('employee_code')}
                    </div>
                  </th>
                  <th 
                    className="px-2 py-2 text-left text-xs font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('full_name')}
                  >
                    <div className="flex items-center gap-1">
                      Ad Soyad
                      {getSortIcon('full_name')}
                    </div>
                  </th>
                  <th 
                    className="px-2 py-2 text-left text-xs font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('position')}
                  >
                    <div className="flex items-center gap-1">
                      Pozisyon
                      {getSortIcon('position')}
                    </div>
                  </th>
                  <th 
                    className="px-2 py-2 text-center text-xs font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('kamyon_total')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      KAMYON
                      {getSortIcon('kamyon_total')}
                    </div>
                    <div className="mt-1">
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
                        {summaryStats.totalKamyon} tur
                      </span>
                    </div>
                  </th>
                  <th 
                    className="px-2 py-2 text-center text-xs font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('kamyon_double')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      KAMYON ÇİFT TUR
                      {getSortIcon('kamyon_double')}
                    </div>
                    <div className="mt-1">
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                        {processedData.reduce((sum, p) => sum + p.vehicleStats.Kamyon.doubleTrips, 0)} çift tur
                      </span>
                    </div>
                  </th>
                  <th 
                    className="px-2 py-2 text-center text-xs font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('kamyonet_total')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      KAMYONET
                      {getSortIcon('kamyonet_total')}
                    </div>
                    <div className="mt-1">
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        {summaryStats.totalKamyonet} tur
                      </span>
                    </div>
                  </th>
                  <th 
                    className="px-2 py-2 text-center text-xs font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('kamyonet_double')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      KAMYONET ÇİFT TUR
                      {getSortIcon('kamyonet_double')}
                    </div>
                    <div className="mt-1">
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                        {processedData.reduce((sum, p) => sum + p.vehicleStats.Kamyonet.doubleTrips, 0)} çift tur
                      </span>
                    </div>
                  </th>
                  <th 
                    className="px-2 py-2 text-center text-xs font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('panelvan_total')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      PANELVAN
                      {getSortIcon('panelvan_total')}
                    </div>
                    <div className="mt-1">
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                        {summaryStats.totalPanelvan} tur
                      </span>
                    </div>
                  </th>
                  <th 
                    className="px-2 py-2 text-center text-xs font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('panelvan_double')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      PANELVAN ÇİFT TUR
                      {getSortIcon('panelvan_double')}
                    </div>
                    <div className="mt-1">
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                        {processedData.reduce((sum, p) => sum + p.vehicleStats.Panelvan.doubleTrips, 0)} çift tur
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {processedData.map((personnel, index) => {
                  const totalTrips = personnel.vehicleStats.Kamyon.total + personnel.vehicleStats.Kamyonet.total + personnel.vehicleStats.Panelvan.total;
                  
                  const isSevkiyat = personnel.position && personnel.position.toUpperCase().includes('SEVKİYAT');
                  const isSofor = personnel.position && personnel.position.toUpperCase().includes('ŞOFÖR');
                  
                  const rowColor = isSevkiyat ? 'bg-blue-50 hover:bg-blue-100' : 
                                  isSofor ? 'bg-green-50 hover:bg-green-100' : 
                                  'bg-gray-50 hover:bg-gray-100';
                  
                  return (
                    <tr 
                      key={personnel.employee_code} 
                      className={`${rowColor} transition-colors border-b border-gray-100`}
                    >
                      <td className="px-2 py-2 text-gray-900 font-bold text-xs sticky left-0 bg-inherit">
                        {personnel.employee_code}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                            {personnel.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          <span className="font-semibold text-gray-900 text-xs">{personnel.full_name}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${getPositionColor(personnel.position)}`}>
                          {personnel.position}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        {personnel.vehicleStats.Kamyon.total > 0 ? (
                          <span className={`inline-flex px-2 py-1 rounded-lg font-bold text-xs ${getVehicleTripColor(personnel.vehicleStats.Kamyon.total, 'orange')}`}>
                            {personnel.vehicleStats.Kamyon.total}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {personnel.vehicleStats.Kamyon.doubleTrips > 0 ? (
                          <span className={`inline-flex px-2 py-1 rounded-lg font-bold text-xs ${getDoubleTripColor(personnel.vehicleStats.Kamyon.doubleTrips)}`}>
                            {personnel.vehicleStats.Kamyon.doubleTrips}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {personnel.vehicleStats.Kamyonet.total > 0 ? (
                          <span className={`inline-flex px-2 py-1 rounded-lg font-bold text-xs ${getVehicleTripColor(personnel.vehicleStats.Kamyonet.total, 'blue')}`}>
                            {personnel.vehicleStats.Kamyonet.total}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {personnel.vehicleStats.Kamyonet.doubleTrips > 0 ? (
                          <span className={`inline-flex px-2 py-1 rounded-lg font-bold text-xs ${getDoubleTripColor(personnel.vehicleStats.Kamyonet.doubleTrips)}`}>
                            {personnel.vehicleStats.Kamyonet.doubleTrips}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {personnel.vehicleStats.Panelvan.total > 0 ? (
                          <span className={`inline-flex px-2 py-1 rounded-lg font-bold text-xs ${getVehicleTripColor(personnel.vehicleStats.Panelvan.total, 'green')}`}>
                            {personnel.vehicleStats.Panelvan.total}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {personnel.vehicleStats.Panelvan.doubleTrips > 0 ? (
                          <span className={`inline-flex px-2 py-1 rounded-lg font-bold text-xs ${getDoubleTripColor(personnel.vehicleStats.Panelvan.doubleTrips)}`}>
                            {personnel.vehicleStats.Panelvan.doubleTrips}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {processedData.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">Seçilen tarih aralığında veri bulunamadı</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VehicleDistribution; 