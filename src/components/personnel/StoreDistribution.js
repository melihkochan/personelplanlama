import React, { useState, useEffect } from 'react';
import { MapPin, Users, TrendingUp, Calendar, Filter, RefreshCw, Download, BarChart3, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { getPerformanceData, getStoreLocationsByCodes, getAllPersonnel } from '../../services/supabase';

const StoreDistribution = () => {
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(null); // Seçili ay
  const [personnelStats, setPersonnelStats] = useState({});
  const [storeLocations, setStoreLocations] = useState({});
  const [uniqueLocations, setUniqueLocations] = useState([]);
  const [personnelData, setPersonnelData] = useState({});
  const [allPersonnelCount, setAllPersonnelCount] = useState(0);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    column: 'default',
    direction: 'asc'
  });

  // Veri yükleme
  useEffect(() => {
    loadPerformanceData();
  }, []); // Sadece component mount olduğunda yükle

  // Seçili ay değiştiğinde tarihleri filtrele
  useEffect(() => {
    if (availableDates.length > 0) {
      if (selectedMonth) {
        // Belirli bir ay seçilmişse, o ayın tarihlerini seç
        const monthDates = getDatesForMonth(availableDates, selectedMonth);
        const monthDateIds = monthDates.map(item => item.id);
        setSelectedDates(monthDateIds);
      } else {
        // "Tüm Aylar" seçilmişse, tüm tarihleri seç
        const allDateIds = availableDates.map(item => item.id);
        setSelectedDates(allDateIds);
      }
    }
  }, [selectedMonth, availableDates]);

  // Seçili tarihler değiştiğinde veriyi filtrele ve mağaza konumlarını yükle
  useEffect(() => {
    if (performanceData.length > 0 && selectedDates.length > 0) {
      // Seçilen tarihlere göre filtrele
      const filteredData = performanceData.filter(record => {
        const key = `${record.date}_${record.shift}`;
        return selectedDates.includes(key);
      });
      
      // Mağaza konumlarını çek ve hesaplamaları yap
      if (filteredData.length > 0) {
        loadStoreLocations(filteredData);
      } else {
        setPersonnelStats({});
        setStoreLocations({});
        setUniqueLocations([]);
      }
    }
  }, [selectedDates, performanceData]);

  // Helper fonksiyonlar
  const getAvailableMonths = (dates) => {
    const months = new Set();
    dates.forEach(item => {
      if (item.date) {
        // YYYY-MM-DD formatını kontrol et
        if (item.date.includes('-')) {
          const [year, month, day] = item.date.split('-');
          if (month && year) {
            const monthKey = `${year}-${month.padStart(2, '0')}`;
            months.add(monthKey);
          }
        } else if (item.date.includes('.')) {
          // DD.MM.YYYY formatını kontrol et
          const [day, month, year] = item.date.split('.');
          if (month && year) {
            const monthKey = `${year}-${month.padStart(2, '0')}`;
            months.add(monthKey);
          }
        }
      }
    });
    return Array.from(months).sort();
  };

  const getMonthDisplayName = (monthKey) => {
    const [year, month] = monthKey.split('-');
    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const getDatesForMonth = (dates, monthKey) => {
    return dates.filter(item => {
      if (item.date) {
        let itemMonthKey;
        
        // YYYY-MM-DD formatını kontrol et
        if (item.date.includes('-')) {
          const [year, month, day] = item.date.split('-');
          if (month && year) {
            itemMonthKey = `${year}-${month.padStart(2, '0')}`;
          }
        } else if (item.date.includes('.')) {
          // DD.MM.YYYY formatını kontrol et
          const [day, month, year] = item.date.split('.');
          if (month && year) {
            itemMonthKey = `${year}-${month.padStart(2, '0')}`;
          }
        }
        
        return itemMonthKey === monthKey;
      }
      return false;
    });
  };

  const getLatestMonth = (dates) => {
    if (dates.length === 0) return null;
    
    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      
      // YYYY-MM-DD formatını kontrol et
      if (dateStr.includes('-')) {
        const [year, month, day] = dateStr.split('-');
        if (!day || !month || !year) return null;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else if (dateStr.includes('.')) {
        // DD.MM.YYYY formatını kontrol et
        const [day, month, year] = dateStr.split('.');
        if (!day || !month || !year) return null;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      
      return null;
    };
    
    const validDates = dates
      .filter(item => item.date)
      .map(item => ({ ...item, parsedDate: parseDate(item.date) }))
      .filter(item => item.parsedDate !== null)
      .sort((a, b) => b.parsedDate - a.parsedDate);
    
    if (validDates.length === 0) return null;
    
    const latestDate = validDates[0];
    const month = (latestDate.parsedDate.getMonth() + 1).toString().padStart(2, '0');
    const year = latestDate.parsedDate.getFullYear();
    
    return `${year}-${month}`;
  };

  const loadPerformanceData = async () => {
    try {
      setLoading(true);
      
      const [result, personnelResult] = await Promise.all([
        getPerformanceData(),
        getAllPersonnel()
      ]);
      
      if (result.success) {
        const data = result.data || [];
        
        // Available dates hazırla
        const availableDatesArray = [];
        const dateShiftMap = new Map();
        
        data.forEach(record => {
          const key = `${record.date}_${record.shift}`;
          if (!dateShiftMap.has(key)) {
            dateShiftMap.set(key, true);
            availableDatesArray.push({
              id: key,
              date: record.date,
              shift: record.shift
            });
          }
        });
        
                 // Available dates'i sırala
         availableDatesArray.sort((a, b) => {
           const parseDate = (dateStr) => {
             if (!dateStr) return new Date(0);
             
             // YYYY-MM-DD formatını kontrol et
             if (dateStr.includes('-')) {
               const [year, month, day] = dateStr.split('-');
               if (!day || !month || !year) return new Date(0);
               return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
             } else if (dateStr.includes('.')) {
               // DD.MM.YYYY formatını kontrol et
               const [day, month, year] = dateStr.split('.');
               if (!day || !month || !year) return new Date(0);
               return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
             }
             
             return new Date(0);
           };
           return parseDate(b.date) - parseDate(a.date);
         });
        
        // Available dates hazırlandı
        setAvailableDates(availableDatesArray);

                 // Varsayılan olarak "Tüm Aylar" seçili gelsin
         setSelectedMonth(null);
        
        // State'leri güncelle
        setPerformanceData(data);
        
        // Personel verilerini hazırla
        if (personnelResult.success) {
          const personnelMap = {};
          personnelResult.data.forEach(person => {
            personnelMap[person.employee_code] = person;
          });
          setPersonnelData(personnelMap);
          setAllPersonnelCount(personnelResult.data.length);
        }
      } else {
        setPerformanceData([]);
        setPersonnelStats({});
        setStoreLocations({});
        setUniqueLocations([]);
      }
    } catch (error) {
      setPerformanceData([]);
      setPersonnelStats({});
      setStoreLocations({});
      setUniqueLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStoreLocations = async (data) => {
    try {
      // Tüm store_codes'ları topla
      const allStoreCodes = new Set();
      data.forEach(record => {
        if (record.store_codes) {
          const codes = record.store_codes.split(',').map(s => s.trim()).filter(s => s);
          codes.forEach(code => allStoreCodes.add(code));
        }
      });

      if (allStoreCodes.size === 0) {
        setStoreLocations({});
        setUniqueLocations([]);
        return;
      }

      // Mağaza konumlarını çek
      const storeCodesArray = Array.from(allStoreCodes);
      
      const locationsResult = await getStoreLocationsByCodes(storeCodesArray);
      
      if (locationsResult.success) {
        const locationMap = {};
        const uniqueLocs = new Set();
        
        locationsResult.data.forEach(store => {
          locationMap[store.store_code] = store.location;
          // "Gündüz" mağazalarını dahil etme
          if (store.location && store.location !== 'Gündüz') {
            uniqueLocs.add(store.location);
          }
        });
        
        // State'leri güncelle ve hesaplamaları yap
        setStoreLocations(locationMap);
        setUniqueLocations(Array.from(uniqueLocs).sort());
        
        // State güncellemesi tamamlandıktan sonra hesaplamaları yap
        setTimeout(() => {
          calculatePersonnelStoreVisits(data, locationMap);
        }, 200);
      } else {
        setStoreLocations({});
        setUniqueLocations([]);
      }
    } catch (error) {
      setStoreLocations({});
      setUniqueLocations([]);
    }
  };

  const calculatePersonnelStoreVisits = (data, locationMap = null) => {
    // Eğer locationMap parametresi verilmişse onu kullan, yoksa state'ten al
    const currentLocationMap = locationMap || storeLocations;
    
    const personnelVisits = {};

    // Her personel için mağaza ziyaretlerini hesapla
    data.forEach((record) => {
      const { employee_code, employee_name, date, store_codes } = record;
      
      if (store_codes) {
        // Aynı gün aynı mağazaya birden fazla giriş varsa tek say
        const uniqueStores = [...new Set(store_codes.split(',').map(s => s.trim()).filter(s => s))];
        
        if (!personnelVisits[employee_code]) {
          personnelVisits[employee_code] = {
            name: employee_name,
            totalVisits: 0,
            storeVisits: {},
            locationVisits: {},
            visitsByDate: {}
          };
        }
        
        uniqueStores.forEach(storeCode => {
          const storeKey = storeCode.trim();
          const location = currentLocationMap[storeKey];
          
          // Sadece geçerli konumları ve "Gündüz" olmayanları hesapla
          if (location && location !== 'Gündüz') {
            // Aynı gün aynı mağazaya birden fazla giriş kontrolü
            const dateKey = `${date}_${employee_code}_${storeKey}`;
            if (!personnelVisits[employee_code].visitsByDate[dateKey]) {
              personnelVisits[employee_code].totalVisits++;
              
              // Mağaza kodu bazında ziyaret sayısı
              if (!personnelVisits[employee_code].storeVisits[storeKey]) {
                personnelVisits[employee_code].storeVisits[storeKey] = 0;
              }
              personnelVisits[employee_code].storeVisits[storeKey]++;
              
              // Konum bazında ziyaret sayısı
              if (!personnelVisits[employee_code].locationVisits[location]) {
                personnelVisits[employee_code].locationVisits[location] = 0;
              }
              personnelVisits[employee_code].locationVisits[location]++;
              
              personnelVisits[employee_code].visitsByDate[dateKey] = true;
            }
          }
        });
      }
    });

    // Set'leri array'e çevir ve temizle
    Object.keys(personnelVisits).forEach(personnel => {
      delete personnelVisits[personnel].visitsByDate;
    });
    
    setPersonnelStats(personnelVisits);
  };

  const handleSort = (column) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortedPersonnel = () => {
    // Tüm personelleri al ve performans verisi olmayanlar için 0 değerler ekle
    const personnelArray = Object.entries(personnelData).map(([employeeCode, personnel]) => {
      const stats = personnelStats[employeeCode] || {
        name: personnel.full_name || 'Bilinmeyen',
        totalVisits: 0,
        storeVisits: {},
        locationVisits: {}
      };
      
      return {
        employeeCode,
        ...stats,
        position: personnel.position || 'Bilinmeyen',
        employeeCodeNum: parseInt(employeeCode) || 0
      };
    });

    // Eğer özel bir sıralama seçilmişse uygula
    if (sortConfig.column !== 'default') {
      personnelArray.sort((a, b) => {
        let aValue, bValue;

        if (sortConfig.column === 'totalVisits') {
          aValue = a.totalVisits;
          bValue = b.totalVisits;
        } else if (sortConfig.column === 'employeeCode') {
          aValue = a.employeeCodeNum;
          bValue = b.employeeCodeNum;
        } else if (sortConfig.column === 'name') {
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
        } else if (sortConfig.column === 'position') {
          aValue = a.position.toLowerCase();
          bValue = b.position.toLowerCase();
        } else if (sortConfig.column.startsWith('location_')) {
          const location = sortConfig.column.replace('location_', '');
          aValue = a.locationVisits[location] || 0;
          bValue = b.locationVisits[location] || 0;
        } else {
          aValue = a.employeeCodeNum;
          bValue = b.employeeCodeNum;
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
    } else {
      // Varsayılan sıralama: Önce pozisyona göre sırala (Sevkiyat Elemanları önce, sonra Şoförler)
      personnelArray.sort((a, b) => {
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
    }

    return personnelArray;
  };

  // Konum için renk gradyanı fonksiyonu
  const getLocationVisitColor = (visitCount, maxVisits) => {
    if (visitCount === 0) return 'text-gray-400';
    if (maxVisits === 0) return 'text-gray-400';
    
    const percentage = visitCount / maxVisits;
    
    if (percentage >= 0.8) return 'bg-red-100 text-red-800 border-red-300';
    if (percentage >= 0.6) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (percentage >= 0.4) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (percentage >= 0.2) return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  // Toplam ziyaret için renk gradyanı fonksiyonu
  const getTotalVisitColor = (visitCount) => {
    if (visitCount === 0) return 'bg-gray-100 text-gray-800 border-gray-300';
    if (visitCount >= 50) return 'bg-red-100 text-red-800 border-red-300';
    if (visitCount >= 30) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (visitCount >= 20) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (visitCount >= 10) return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  // Her konum için maksimum ziyaret sayısını hesapla
  const getMaxVisitsForLocation = (location) => {
    return Math.max(...Object.values(personnelStats).map(personnel => 
      personnel.locationVisits[location] || 0
    ));
  };

  const getPositionColor = (position) => {
    if (position && position.toUpperCase().includes('SEVKİYAT')) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    } else if (position && position.toUpperCase().includes('ŞOFÖR')) {
      return 'bg-green-100 text-green-800 border-green-300';
    } else {
      return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };



  const getLocationColor = (locationName) => {
    // Her konum için farklı renk kombinasyonları
    const colorMap = {
      'Ataşehir/Ümraniye/Üsküdar': 'bg-blue-100 text-blue-800 border-blue-300',
      'Balıkesir-Avşa': 'bg-green-100 text-green-800 border-green-300',
      'Beykoz/Ç.köy/S.tepe/S.beyliği': 'bg-purple-100 text-purple-800 border-purple-300',
      'Gebze': 'bg-orange-100 text-orange-800 border-orange-300',
      'Kadıköy': 'bg-red-100 text-red-800 border-red-300',
      'Kocaeli': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      'M.tepe/Kartal/Pendik': 'bg-pink-100 text-pink-800 border-pink-300',
      'Sakarya': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Şile': 'bg-teal-100 text-teal-800 border-teal-300'
    };
    
    return colorMap[locationName] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getSortIcon = (column) => {
    if (sortConfig.column === column) {
      return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
    }
    return <ArrowUpDown className="w-3 h-3" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Mağaza dağılımı yükleniyor...</p>
        </div>
      </div>
    );
  }

  const sortedPersonnel = getSortedPersonnel();

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-600" />
            Personel Konum Dağılımı
          </h1>
          <p className="text-sm text-gray-600 mt-1">Personellerin mağaza ziyaret istatistikleri</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadPerformanceData()}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
        </div>
      </div>

      {/* Özet İstatistikler */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          Özet İstatistikler
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xl font-bold text-blue-600">
              {uniqueLocations.length}
            </div>
            <div className="text-xs text-blue-600">Location</div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-xl font-bold text-green-600">
              {allPersonnelCount}
            </div>
            <div className="text-xs text-green-600">Aktif Personel</div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-xl font-bold text-purple-600">
              {Object.values(personnelStats).reduce((sum, stats) => sum + stats.totalVisits, 0)}
            </div>
            <div className="text-xs text-purple-600">Toplam Ziyaret</div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="text-xl font-bold text-orange-600">
              {performanceData.length}
            </div>
            <div className="text-xs text-orange-600">Toplam Kayıt</div>
          </div>
        </div>
      </div>

      {/* Tarih Bilgisi */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Veri Tarihi:</span>
          </div>
          
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 min-w-[80px]">Ay</label>
            <div className="flex-1 relative max-w-[200px]">
              <select
                value={selectedMonth || ''}
                onChange={(e) => setSelectedMonth(e.target.value || null)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm hover:border-gray-400 transition-colors appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.75rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem'
                }}
              >
                <option value="">📅 Tüm Aylar</option>
                {getAvailableMonths(availableDates).map(monthKey => (
                  <option key={monthKey} value={monthKey}>
                    📆 {getMonthDisplayName(monthKey)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {selectedMonth && (
          <div className="mt-3 text-sm text-gray-600">
            <span>Seçilen: <span className="font-medium text-blue-600">{selectedDates.length}</span> / {getDatesForMonth(availableDates, selectedMonth).length} tarih</span>
          </div>
        )}
      </div>

      

      {/* Ana Tablo */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Personel Mağaza Ziyaret Tablosu
          </h2>
          <p className="text-blue-100 text-sm mt-1">Her personelin her mağaza konumuna kaç kez gittiği</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th 
                  className="px-3 py-3 text-left text-xs font-semibold text-gray-900 sticky left-0 bg-gray-50 z-10 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('employeeCode')}
                >
                  <div className="flex items-center gap-1">
                    Sicil No
                    {getSortIcon('employeeCode')}
                  </div>
                </th>
                <th 
                  className="px-3 py-3 text-left text-xs font-semibold text-gray-900 sticky left-0 bg-gray-50 z-10 cursor-pointer hover:bg-gray-100 transition-colors" 
                  style={{left: '60px'}}
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Ad Soyad
                    {getSortIcon('name')}
                  </div>
                </th>
                <th 
                  className="px-3 py-3 text-left text-xs font-semibold text-gray-900 sticky left-0 bg-gray-50 z-10 cursor-pointer hover:bg-gray-100 transition-colors" 
                  style={{left: '140px'}}
                  onClick={() => handleSort('position')}
                >
                  <div className="flex items-center gap-1">
                    Pozisyon
                    {getSortIcon('position')}
                  </div>
                </th>
                <th 
                  className="px-3 py-3 text-center text-xs font-semibold text-gray-900 sticky left-0 bg-gray-50 z-10 cursor-pointer hover:bg-gray-100 transition-colors" 
                  style={{left: '220px'}}
                  onClick={() => handleSort('totalVisits')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Toplam Ziyaret
                    {getSortIcon('totalVisits')}
                  </div>
                </th>
                {uniqueLocations.map((location, index) => (
                  <th 
                    key={location} 
                    className="px-2 py-3 text-center text-xs font-semibold text-gray-900 min-w-[100px] cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort(`location_${location}`)}
                  >
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-xs">{location}</span>
                        {getSortIcon(`location_${location}`)}
                      </div>
                      <span className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium border ${getLocationColor(location)}`}>
                        {Object.values(personnelStats).reduce((total, personnel) => {
                          return total + (personnel.locationVisits[location] || 0);
                        }, 0)} ziyaret
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedPersonnel.map((personnel, index) => {
                const isSevkiyat = personnel.position && personnel.position.toUpperCase().includes('SEVKİYAT');
                const isSofor = personnel.position && personnel.position.toUpperCase().includes('ŞOFÖR');
                
                const rowColor = isSevkiyat ? 'bg-blue-50 hover:bg-blue-100' : 
                                isSofor ? 'bg-green-50 hover:bg-green-100' : 
                                'bg-gray-50 hover:bg-gray-100';
                
                return (
                  <tr key={personnel.employeeCode} className={`${rowColor} transition-colors`}>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900 sticky left-0 bg-white z-10">
                      {personnel.employeeCode}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 sticky left-0 bg-white z-10" style={{left: '60px'}}>
                      {personnel.name}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap sticky left-0 bg-white z-10" style={{left: '140px'}}>
                      <span className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium border ${getPositionColor(personnel.position)}`}>
                        {personnel.position}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-center sticky left-0 bg-white z-10" style={{left: '220px'}}>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getTotalVisitColor(personnel.totalVisits)}`}>
                        {personnel.totalVisits}
                      </span>
                    </td>
                    {uniqueLocations.map(location => {
                      const maxVisits = getMaxVisitsForLocation(location);
                      const visitCount = personnel.locationVisits[location] || 0;
                      const visitColor = getLocationVisitColor(visitCount, maxVisits);
                      
                      return (
                        <td key={location} className="px-2 py-2 whitespace-nowrap text-center">
                          {personnel.locationVisits[location] ? (
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium border ${visitColor}`}>
                              {personnel.locationVisits[location]}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StoreDistribution; 