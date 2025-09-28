import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ComposedChart, Scatter, ScatterChart, RadarChart, Radar,
  RadialBarChart, RadialBar, FunnelChart, Funnel, Treemap, TreemapItem,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { 
  BarChart3, TrendingUp, TrendingDown, Users, Package, Calendar, 
  Target, Award, Activity, ArrowUpRight, ArrowDownRight, Minus,
  Zap, TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon
} from 'lucide-react';
import { getPerformanceData, getAllPersonnel } from '../../services/supabase';

const Statistics = () => {
  const [performanceData, setPerformanceData] = useState([]);
  const [personnelData, setPersonnelData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [performance, personnel] = await Promise.all([
        getPerformanceData(),
        getAllPersonnel()
      ]);
      
      
      // Performance verisi kontrolü
      let enrichedPerformanceData = [];
      
      if (performance && performance.success && performance.data && performance.data.length > 0) {
        // Performans analizi sayfasındaki gibi gerçek veriyi işle
        enrichedPerformanceData = processRealData(performance.data);
      } else {
        enrichedPerformanceData = generateSampleData();
      }
      
      // Personnel verisi kontrolü
      let personnelDataArray = [];
      if (personnel && personnel.success && personnel.data && personnel.data.length > 0) {
       
        personnelDataArray = personnel.data;
      } else {
      
        personnelDataArray = [];
      }
      
      setPerformanceData(enrichedPerformanceData);
      setPersonnelData(personnelDataArray);
      
      
    } catch (error) {
      console.error('❌ Veri yüklenirken hata:', error);
      setPerformanceData(generateSampleData());
      setPersonnelData([]);
    } finally {
      setLoading(false);
    }
  };

  // Gerçek veri yapısını performans analizi sayfasından al - MAĞAZA BAZINDA BENZERSİZ VERİ
  const processRealData = (rawData) => {
    if (!rawData || !rawData.length) return [];
    
    
    // Mağaza bazında benzersiz veri için gruplandırma (tarih + vardiya + mağaza)
    const storeUniqueRecords = {};
    
    rawData.forEach(record => {
      const { employee_name, employee_code, date, trips = 0, pallets = 0, boxes = 0, stores_visited = 0, date_shift_type, store_codes, sheet_name } = record;
      
      if (!employee_name) {
        return;
      }
      
      // Tarihi formatla
      const formattedDate = new Date(date).toLocaleDateString('tr-TR');
      
      // Tarih + shift kombinasyonu key'i oluştur
      let dateForKey, shiftForKey;
      
      if (sheet_name) {
        dateForKey = sheet_name;
      } else {
        dateForKey = formattedDate;
      }
      
      if (date_shift_type === 'gece') {
        shiftForKey = 'GECE';
      } else {
        shiftForKey = 'GÜNDÜZ';
      }
      
      // Mağaza kodlarını işle
      if (store_codes) {
        const stores = store_codes.split(',').map(s => s.trim()).filter(s => s);
        
        stores.forEach(store => {
          // Her mağaza için benzersiz kayıt oluştur (tarih + vardiya + mağaza)
          const storeKey = `${dateForKey}_${shiftForKey}_${store}`;
          
          if (!storeUniqueRecords[storeKey]) {
            storeUniqueRecords[storeKey] = {
              storeKey,
              formattedDate,
              store,
              trips: 1, // Her mağaza için 1 sefer
              pallets: 0,
              boxes: 0,
              date_shift_type,
              personnel: new Set() // Bu mağazaya giden personel sayısı
            };
          }
          
          // Personel sayısını takip et
          storeUniqueRecords[storeKey].personnel.add(employee_name);
          
          // Palet ve kasa miktarlarını topla (aynı mağazaya birden fazla personel gidiyorsa)
          storeUniqueRecords[storeKey].pallets += pallets;
          storeUniqueRecords[storeKey].boxes += boxes;
        });
      }
    });
    
    // Mağaza bazında benzersiz kayıtları düzleştir
    const processedData = Object.values(storeUniqueRecords).map(storeRecord => {
      const { storeKey, formattedDate, store, pallets, boxes, date_shift_type, personnel } = storeRecord;
      
      const personnelCount = personnel.size;
      
      return {
        employee_name: `${personnelCount} Personel`, // Bu mağazaya giden personel sayısı
        date: new Date(formattedDate.split('.').reverse().join('-')),
        boxes: boxes,
        pallets: pallets,
        trips: 1, // Her mağaza için 1 sefer
        stores_visited: 1, // Her mağaza için 1 ziyaret
        date_shift_type: date_shift_type,
        dayDataKey: storeKey,
        formattedDate: formattedDate,
        personnelCount: personnelCount,
        store: store // Hangi mağaza olduğunu takip et
      };
    });
    
    return processedData;
  };

  // Örnek veri oluştur (gerçek veri yoksa)
  const generateSampleData = () => {
    const sampleData = [];
    const currentYear = selectedYear || new Date().getFullYear();
    const currentMonth = selectedMonth || new Date().getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const realisticPersonnel = [
      'MAHMUT TAŞKIRAN', 'ORHAN AKKAN', 'ALİ YASİN GÜMÜŞ', 'SELİM GÜL', 'HAKAN ASLAN',
      'FATİH AKYÜZ', 'SALİH AYKAÇ', 'MEHMET ALİ ŞABABLI', 'EMRE TOKAÇ', 'SABİT BAŞİN',
      'RAMAZAN YILMAZ', 'ADEM TUTAK', 'ABİDİN CAYLI', 'METİN CAN ÇELİK', 'CANER BOZTAŞ'
    ];

    // Gerçekçi performans verileri
    for (let day = 1; day <= daysInMonth; day++) {
      // Gündüz vardiyası (her gün)
      const dayShiftPersonnel = realisticPersonnel.slice(0, 8);
      dayShiftPersonnel.forEach((person, index) => {
        const baseBoxes = 80 + Math.floor(Math.random() * 120); // 80-200 arası
        const basePallets = Math.floor(baseBoxes / 20) + Math.floor(Math.random() * 3);
        const baseTrips = Math.floor(baseBoxes / 30) + Math.floor(Math.random() * 2);
        
        sampleData.push({
          employee_name: person,
          date: new Date(currentYear, currentMonth, day),
          boxes: baseBoxes + Math.floor(Math.random() * 40),
          pallets: basePallets + Math.floor(Math.random() * 2),
          trips: baseTrips + Math.floor(Math.random() * 1),
          stores_visited: baseTrips + Math.floor(Math.random() * 1),
          date_shift_type: 'gündüz',
          formattedDate: new Date(currentYear, currentMonth, day).toLocaleDateString('tr-TR')
        });
      });

      // Gece vardiyası (hafta içi)
      if (day % 7 !== 0 && day % 7 !== 6) { // Hafta sonu değilse
        const nightShiftPersonnel = realisticPersonnel.slice(8, 12);
        nightShiftPersonnel.forEach((person, index) => {
          const baseBoxes = 60 + Math.floor(Math.random() * 100); // 60-160 arası
          const basePallets = Math.floor(baseBoxes / 20) + Math.floor(Math.random() * 2);
          const baseTrips = Math.floor(baseBoxes / 30) + Math.floor(Math.random() * 1);
          
          sampleData.push({
            employee_name: person,
            date: new Date(currentYear, currentMonth, day),
            boxes: baseBoxes + Math.floor(Math.random() * 30),
            pallets: basePallets + Math.floor(Math.random() * 1),
            trips: baseTrips + Math.floor(Math.random() * 1),
            stores_visited: baseTrips + Math.floor(Math.random() * 1),
            date_shift_type: 'gece',
            formattedDate: new Date(currentYear, currentMonth, day).toLocaleDateString('tr-TR')
          });
        });
      }
    }

    return sampleData;
  };

  // Mevcut ayları hesapla
  const getAvailableMonths = () => {
    if (!performanceData.length) return [];
    
    const monthSet = new Set();
    performanceData.forEach(item => {
      const itemDate = new Date(item.date);
      const monthKey = `${itemDate.getFullYear()}-${itemDate.getMonth()}`;
      monthSet.add(monthKey);
    });
    
    return Array.from(monthSet).sort().map(monthKey => {
      const [year, month] = monthKey.split('-');
      return {
        year: parseInt(year),
        month: parseInt(month),
        display: `${getMonthName(parseInt(month))} ${year}`
      };
    });
  };

  // Aylık performans verilerini hesapla
  const getMonthlyStats = () => {
    if (!performanceData.length) return null;

    let monthlyData;
    if (selectedMonth !== null && selectedYear !== null) {
      monthlyData = performanceData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
      });
    } else {
      monthlyData = performanceData; // Tüm veriler
    }

    const totalBoxes = monthlyData.reduce((sum, item) => sum + (item.boxes || 0), 0);
    const totalPallets = monthlyData.reduce((sum, item) => sum + (item.pallets || 0), 0);
    const totalTrips = monthlyData.reduce((sum, item) => sum + (item.trips || 0), 0);
    const uniquePersonnel = new Set(monthlyData.map(item => item.employee_name)).size;
    const avgBoxesPerPerson = uniquePersonnel > 0 ? (totalBoxes / uniquePersonnel).toFixed(1) : 0;

    return {
      totalBoxes,
      totalPallets,
      totalTrips,
      totalPersonnel: uniquePersonnel,
      avgBoxesPerPerson,
      dayShiftBoxes: monthlyData.filter(item => item.date_shift_type === 'gündüz').reduce((sum, item) => sum + (item.boxes || 0), 0),
      nightShiftBoxes: monthlyData.filter(item => item.date_shift_type === 'gece').reduce((sum, item) => sum + (item.boxes || 0), 0),
      dataPoints: monthlyData.length
    };
  };

  // Günlük trend verilerini hesapla
  const getDailyTrends = () => {
    if (!performanceData.length) return [];

    let monthlyData;
    if (selectedMonth !== null && selectedYear !== null) {
      monthlyData = performanceData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
      });
    } else {
      monthlyData = performanceData; // Tüm veriler
    }

    const dailyTotals = {};
    monthlyData.forEach(item => {
      const date = new Date(item.date).getDate();
      if (!dailyTotals[date]) {
        dailyTotals[date] = { 
          total: 0, 
          dayShift: 0, 
          nightShift: 0, 
          personnelCount: 0,
          pallets: 0,
          trips: 0
        };
      }
      dailyTotals[date].total += item.boxes || 0;
      dailyTotals[date].pallets += item.pallets || 0;
      dailyTotals[date].trips += item.trips || 0;
      dailyTotals[date].personnelCount += 1;
      if (item.date_shift_type === 'gündüz') {
        dailyTotals[date].dayShift += item.boxes || 0;
      } else if (item.date_shift_type === 'gece') {
        dailyTotals[date].nightShift += item.boxes || 0;
      }
    });

    return Object.entries(dailyTotals).map(([day, data]) => ({
      day: parseInt(day),
      total: data.total,
      dayShift: data.dayShift,
      nightShift: data.nightShift,
      personnelCount: data.personnelCount,
      pallets: data.pallets,
      trips: data.trips
    })).sort((a, b) => a.day - b.day);
  };

  // Personel performans karşılaştırması
  const getPersonnelComparison = () => {
    if (!performanceData.length) return [];

    let monthlyData;
    if (selectedMonth !== null && selectedYear !== null) {
      monthlyData = performanceData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
      });
    } else {
      monthlyData = performanceData; // Tüm veriler
    }

    const personnelStats = {};
    
    monthlyData.forEach(item => {
      if (item.employee_name) {
        if (!personnelStats[item.employee_name]) {
          personnelStats[item.employee_name] = {
            totalBoxes: 0,
            totalPallets: 0,
            totalTrips: 0,
            shiftCount: 0,
            avgBoxesPerShift: 0,
            dayShifts: 0,
            nightShifts: 0,
            efficiency: 0
          };
        }
        personnelStats[item.employee_name].totalBoxes += item.boxes || 0;
        personnelStats[item.employee_name].totalPallets += item.pallets || 0;
        personnelStats[item.employee_name].totalTrips += item.trips || 0;
        personnelStats[item.employee_name].shiftCount += 1;
        if (item.date_shift_type === 'gündüz') {
          personnelStats[item.employee_name].dayShifts += 1;
        } else if (item.date_shift_type === 'gece') {
          personnelStats[item.employee_name].nightShifts += 1;
        }
      }
    });

    // Ortalama ve verimlilik hesapla
    Object.keys(personnelStats).forEach(name => {
      const stats = personnelStats[name];
      stats.avgBoxesPerShift = stats.shiftCount > 0 
        ? (stats.totalBoxes / stats.shiftCount).toFixed(1) 
        : 0;
      stats.efficiency = stats.totalPallets > 0 
        ? ((stats.totalBoxes / stats.totalPallets) * 100).toFixed(1)
        : 0;
    });

    return Object.entries(personnelStats)
      .map(([name, stats]) => ({
        name,
        ...stats
      }))
      .sort((a, b) => b.totalBoxes - a.totalBoxes)
      .slice(0, 10);
  };

  // Vardiya karşılaştırması
  const getShiftComparison = () => {
    if (!performanceData.length) return null;

    let monthlyData;
    if (selectedMonth !== null && selectedYear !== null) {
      monthlyData = performanceData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
      });
    } else {
      monthlyData = performanceData; // Tüm veriler
    }

    const dayShiftData = monthlyData.filter(item => item.date_shift_type === 'gündüz');
    const nightShiftData = monthlyData.filter(item => item.date_shift_type === 'gece');

    const dayShiftTotal = dayShiftData.reduce((sum, item) => sum + (item.boxes || 0), 0);
    const nightShiftTotal = nightShiftData.reduce((sum, item) => sum + (item.boxes || 0), 0);

    return {
      dayShift: {
        total: dayShiftTotal,
        count: dayShiftData.length,
        avg: dayShiftData.length > 0 ? (dayShiftTotal / dayShiftData.length).toFixed(1) : 0
      },
      nightShift: {
        total: nightShiftTotal,
        count: nightShiftData.length,
        avg: nightShiftData.length > 0 ? (nightShiftTotal / nightShiftData.length).toFixed(1) : 0
      }
    };
  };

  // Haftalık trend analizi
  const getWeeklyTrends = () => {
    if (!performanceData.length) return [];

    let monthlyData;
    if (selectedMonth !== null && selectedYear !== null) {
      monthlyData = performanceData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear;
      });
    } else {
      monthlyData = performanceData; // Tüm veriler
    }

    const weeklyData = {};
    monthlyData.forEach(item => {
      const date = new Date(item.date);
      const weekNumber = Math.ceil(date.getDate() / 7);
      if (!weeklyData[weekNumber]) {
        weeklyData[weekNumber] = { total: 0, dayShift: 0, nightShift: 0, days: new Set() };
      }
      weeklyData[weekNumber].total += item.boxes || 0;
      weeklyData[weekNumber].days.add(date.getDate());
      if (item.date_shift_type === 'gündüz') {
        weeklyData[weekNumber].dayShift += item.boxes || 0;
      } else if (item.date_shift_type === 'gece') {
        weeklyData[weekNumber].nightShift += item.boxes || 0;
      }
    });

    return Object.entries(weeklyData).map(([week, data]) => ({
      week: parseInt(week),
      total: data.total,
      dayShift: data.dayShift,
      nightShift: data.nightShift,
      days: data.days.size
    })).sort((a, b) => a.week - b.week);
  };

  const monthlyStats = getMonthlyStats();
  const dailyTrends = getDailyTrends();
  const personnelComparison = getPersonnelComparison();
  const shiftComparison = getShiftComparison();
  const weeklyTrends = getWeeklyTrends();

  const getMonthName = (month) => {
    const months = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return months[month];
  };

  const getTrendIcon = (current, previous) => {
    if (!previous) return <Minus className="w-4 h-4 text-gray-400" />;
    if (current > previous) return <ArrowUpRight className="w-4 h-4 text-green-600" />;
    if (current < previous) return <ArrowDownRight className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  // Grafik renkleri
  const COLORS = {
    primary: '#3B82F6',
    secondary: '#10B981',
    accent: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    pink: '#EC4899',
    indigo: '#6366F1',
    teal: '#14B8A6',
    orange: '#F97316',
    cyan: '#06B6D4',
    lime: '#84CC16',
    rose: '#F43F5E'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">İstatistikler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            İstatistikler
          </h1>
          <p className="text-gray-600 mt-1">Performans analizi ve trend grafikleri</p>
        </div>
        
                 {/* Filtreler */}
         <div className="flex items-center gap-4">
           <select
             value={selectedMonth !== null && selectedYear !== null ? `${selectedYear}-${selectedMonth}` : ""}
             onChange={(e) => {
               if (e.target.value === "") {
                 setSelectedYear(null);
                 setSelectedMonth(null);
               } else {
                 const [year, month] = e.target.value.split('-');
                 setSelectedYear(parseInt(year));
                 setSelectedMonth(parseInt(month));
               }
             }}
             className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
           >
             <option value="">Tüm Aylar</option>
             {getAvailableMonths().map(({ year, month, display }) => (
               <option key={`${year}-${month}`} value={`${year}-${month}`}>
                 {display}
               </option>
             ))}
           </select>
         </div>
      </div>


             {/* Modern Grafikler */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   {/* Günlük Kasa Dağılımı - Stacked Bar Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Günlük Vardiya Dağılımı
            </h3>
            
            {dailyTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [typeof value === 'number' ? value.toLocaleString() : value, name === 'dayShift' ? 'Gündüz Vardiyası' : name === 'nightShift' ? 'Gece Vardiyası' : name]}
                    labelFormatter={(label) => `Gün ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="dayShift" fill="#3B82F6" name="Gündüz Vardiyası" />
                  <Bar dataKey="nightShift" fill="#8B5CF6" name="Gece Vardiyası" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">Bu ay için veri bulunamadı</p>
            )}
          </div>

        {/* Günlük Trend Analizi - Line Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Günlük Trend Analizi
          </h3>
          
          {dailyTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                                 <Tooltip 
                   formatter={(value, name) => [typeof value === 'number' ? value.toLocaleString() : value, name === 'total' ? 'Toplam Kasa' : name]}
                   labelFormatter={(label) => `Gün ${label}`}
                 />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke={COLORS.secondary} 
                  strokeWidth={3}
                  dot={{ fill: COLORS.secondary, strokeWidth: 2, r: 4 }}
                  name="Toplam Kasa"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">Bu ay için veri bulunamadı</p>
          )}
        </div>
      </div>

             {/* Vardiya Karşılaştırması - İki Grafik */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Vardiya Karşılaştırması - Pie Chart */}
         <div className="bg-white rounded-xl shadow-lg p-6">
           <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
             <Calendar className="w-5 h-5 text-blue-600" />
             Vardiya Dağılımı
           </h3>
           
           {shiftComparison ? (
             <ResponsiveContainer width="100%" height={250}>
               <PieChart>
                 <Pie
                   data={[
                     { name: 'Gündüz Vardiyası', value: shiftComparison.dayShift.total },
                     { name: 'Gece Vardiyası', value: shiftComparison.nightShift.total }
                   ]}
                   cx="50%"
                   cy="50%"
                   labelLine={false}
                   label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                   outerRadius={60}
                   fill="#8884d8"
                   dataKey="value"
                 >
                   <Cell fill={COLORS.primary} />
                   <Cell fill={COLORS.purple} />
                 </Pie>
                                   <Tooltip formatter={(value) => typeof value === 'number' ? value.toLocaleString() : value} />
               </PieChart>
             </ResponsiveContainer>
           ) : (
             <p className="text-gray-500 text-center py-8">Vardiya verisi bulunamadı</p>
           )}
         </div>

         {/* Vardiya Performans Analizi - Area Chart */}
         <div className="bg-white rounded-xl shadow-lg p-6">
           <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
             <Activity className="w-5 h-5 text-green-600" />
             Vardiya Performans Analizi
           </h3>
           
           {shiftComparison ? (
             <ResponsiveContainer width="100%" height={250}>
               <AreaChart data={[
                 { name: 'Gündüz Vardiyası', kasa: shiftComparison.dayShift.total, ortalama: shiftComparison.dayShift.avg },
                 { name: 'Gece Vardiyası', kasa: shiftComparison.nightShift.total, ortalama: shiftComparison.nightShift.avg }
               ]}>
                 <CartesianGrid strokeDasharray="3 3" />
                 <XAxis dataKey="name" />
                 <YAxis />
                                   <Tooltip formatter={(value, name) => [typeof value === 'number' ? value.toLocaleString() : value, name === 'kasa' ? 'Toplam Kasa' : 'Ortalama']} />
                 <Legend />
                 <Area 
                   type="monotone" 
                   dataKey="kasa" 
                   stackId="1"
                   stroke={COLORS.secondary} 
                   fill={COLORS.secondary}
                   fillOpacity={0.6}
                   name="Toplam Kasa"
                 />
               </AreaChart>
             </ResponsiveContainer>
           ) : (
             <p className="text-gray-500 text-center py-8">Vardiya verisi bulunamadı</p>
           )}
         </div>
       </div>

                                                                                                                                                                                                                               {/* Yeni Modern Grafikler */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                                                                   {/* Modern Scatter Plot - Günlük Kasa Dağılımı */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-emerald-600" />
                    Günlük Kasa Dağılımı
                  </h3>
                  
                  {dailyTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <ScatterChart data={dailyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" name="Gün" />
                        <YAxis dataKey="total" name="Toplam Kasa" />
                        <Tooltip 
                          formatter={(value, name) => [typeof value === 'number' ? value.toLocaleString() : value, name]}
                          labelFormatter={(label) => `Gün ${label}`}
                        />
                        <Scatter 
                          dataKey="total" 
                          fill={COLORS.emerald} 
                          name="Toplam Kasa"
                          shape="circle"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Günlük veri bulunamadı</p>
                  )}
                </div>

            {/* Modern Area Chart - Günlük Performans Trendi */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUpIcon className="w-5 h-5 text-cyan-600" />
                Günlük Performans Trendi
              </h3>
              
              {dailyTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dailyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [typeof value === 'number' ? value.toLocaleString() : value, name]}
                      labelFormatter={(label) => `Gün ${label}`}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stroke={COLORS.cyan} 
                      fill={COLORS.cyan}
                      fillOpacity={0.6}
                      name="Toplam Kasa"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="personnelCount" 
                      stroke={COLORS.pink} 
                      fill={COLORS.pink}
                      fillOpacity={0.6}
                      name="Personel Sayısı"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-8">Günlük veri bulunamadı</p>
              )}
            </div>
          </div>

                           {/* Top 5 Personel ve Yeni Grafik - İki Sütun */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 5 Personel - Modern Radar Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              En İyi 5 Personel Performans Analizi
            </h3>
            
            {personnelComparison.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={personnelComparison.slice(0, 5)}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <PolarRadiusAxis />
                  <Radar 
                    name="Toplam Kasa" 
                    dataKey="totalBoxes" 
                    stroke={COLORS.primary} 
                    fill={COLORS.primary} 
                    fillOpacity={0.3}
                  />
                  <Radar 
                    name="Toplam Palet" 
                    dataKey="totalPallets" 
                    stroke={COLORS.secondary} 
                    fill={COLORS.secondary} 
                    fillOpacity={0.3}
                  />
                  <Tooltip formatter={(value, name) => [typeof value === 'number' ? value.toLocaleString() : value, name]} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">Personel performans verisi bulunamadı</p>
            )}
          </div>

                     {/* Yeni Grafik - Günlük Palet Dağılımı */}
           <div className="bg-white rounded-xl shadow-lg p-6">
             <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
               <Package className="w-5 h-5 text-emerald-600" />
               Günlük Palet Dağılımı
             </h3>
             
             {dailyTrends.length > 0 ? (
               <ResponsiveContainer width="100%" height={300}>
                 <ComposedChart data={dailyTrends}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey="day" />
                   <YAxis />
                   <Tooltip 
                     formatter={(value, name) => [typeof value === 'number' ? value.toLocaleString() : value, name]}
                     labelFormatter={(label) => `Gün ${label}`}
                   />
                   <Legend />
                   <Bar dataKey="pallets" fill={COLORS.emerald} name="Toplam Palet" />
                   <Line type="monotone" dataKey="trips" stroke={COLORS.amber} strokeWidth={2} name="Sefer Sayısı" />
                 </ComposedChart>
               </ResponsiveContainer>
             ) : (
               <p className="text-gray-500 text-center py-8">Günlük veri bulunamadı</p>
             )}
           </div>
        </div>

                                                       {/* Modern Grafikler - İkinci Set */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Günlük Aktivite - Line Chart */}
           <div className="bg-white rounded-xl shadow-lg p-6">
             <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
               <Activity className="w-5 h-5 text-cyan-600" />
               Günlük Aktivite Analizi
             </h3>
             
             {dailyTrends.length > 0 ? (
               <ResponsiveContainer width="100%" height={300}>
                 <LineChart data={dailyTrends}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey="day" />
                   <YAxis />
                   <Tooltip 
                     formatter={(value, name) => [typeof value === 'number' ? value.toLocaleString() : value, name]}
                     labelFormatter={(label) => `Gün ${label}`}
                   />
                   <Legend />
                   <Line 
                     type="monotone" 
                     dataKey="personnelCount" 
                     stroke={COLORS.cyan} 
                     strokeWidth={3}
                     dot={{ fill: COLORS.cyan, strokeWidth: 2, r: 4 }}
                     name="Personel Sayısı"
                   />
                   <Line 
                     type="monotone" 
                     dataKey="trips" 
                     stroke={COLORS.pink} 
                     strokeWidth={3}
                     dot={{ fill: COLORS.pink, strokeWidth: 2, r: 4 }}
                     name="Sefer Sayısı"
                   />
                 </LineChart>
               </ResponsiveContainer>
             ) : (
               <p className="text-gray-500 text-center py-8">Günlük veri bulunamadı</p>
             )}
           </div>

           {/* Vardiya Performans - Bar Chart */}
           <div className="bg-white rounded-xl shadow-lg p-6">
             <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
               <BarChart3 className="w-5 h-5 text-lime-600" />
               Vardiya Performans Karşılaştırması
             </h3>
             
             {shiftComparison ? (
               <ResponsiveContainer width="100%" height={300}>
                 <BarChart data={[
                   { name: 'Gündüz Vardiyası', total: shiftComparison.dayShift.total, avg: shiftComparison.dayShift.avg, count: shiftComparison.dayShift.count },
                   { name: 'Gece Vardiyası', total: shiftComparison.nightShift.total, avg: shiftComparison.nightShift.avg, count: shiftComparison.nightShift.count }
                 ]}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey="name" />
                   <YAxis />
                   <Tooltip 
                     formatter={(value, name) => [typeof value === 'number' ? value.toLocaleString() : value, name]}
                   />
                   <Legend />
                   <Bar dataKey="total" fill={COLORS.lime} name="Toplam Kasa" />
                   <Bar dataKey="avg" fill={COLORS.teal} name="Ortalama" />
                 </BarChart>
               </ResponsiveContainer>
             ) : (
               <p className="text-gray-500 text-center py-8">Vardiya verisi bulunamadı</p>
             )}
           </div>

           {/* Haftalık Performans - Area Chart */}
           <div className="bg-white rounded-xl shadow-lg p-6">
             <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
               <TrendingUpIcon className="w-5 h-5 text-rose-600" />
               Haftalık Performans Trendi
             </h3>
             
             {weeklyTrends.length > 0 ? (
               <ResponsiveContainer width="100%" height={300}>
                 <AreaChart data={weeklyTrends}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey="week" />
                   <YAxis />
                   <Tooltip 
                     formatter={(value, name) => [typeof value === 'number' ? value.toLocaleString() : value, name]}
                     labelFormatter={(label) => `Hafta ${label}`}
                   />
                   <Legend />
                   <Area 
                     type="monotone" 
                     dataKey="total" 
                     stroke={COLORS.rose} 
                     fill={COLORS.rose}
                     fillOpacity={0.6}
                     name="Toplam Kasa"
                   />
                   <Area 
                     type="monotone" 
                     dataKey="days" 
                     stroke={COLORS.indigo} 
                     fill={COLORS.indigo}
                     fillOpacity={0.6}
                     name="Aktif Gün"
                   />
                 </AreaChart>
               </ResponsiveContainer>
             ) : (
               <p className="text-gray-500 text-center py-8">Haftalık veri bulunamadı</p>
             )}
           </div>
         </div>

       






    </div>
  );
};

export default Statistics; 