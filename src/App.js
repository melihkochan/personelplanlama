import React, { useState, useEffect } from 'react';
import { Upload, Users, Calendar, FileText, BarChart3, Sparkles, Store, LogOut, Shield, Car, Home, Menu, X, Check, AlertCircle, ChevronDown, Clock, Truck, Package } from 'lucide-react';
import FileUpload from './components/FileUpload';
import PersonelList from './components/PersonelList';
import VehicleList from './components/VehicleList';
import StoreList from './components/StoreList';
import VardiyaPlanlama from './components/VardiyaPlanlama';
import PlanDisplay from './components/PlanDisplay';
import PerformanceAnalysis from './components/PerformanceAnalysis';
import PersonelVardiyaKontrol from './components/PersonelVardiyaKontrol';
import AdminPanel from './components/AdminPanel';
import LoginForm from './components/LoginForm';
import { AuthProvider, useAuth } from './context/AuthContext';
import { getAllPersonnel, getAllVehicles, getAllStores, getUserRole, getUserDetails, getDailyNotes, getWeeklySchedules, getPerformanceData } from './services/supabase';
import './App.css';

// Ana uygulama component'i (Authentication wrapper içinde)
function MainApp() {
  const { user, isAuthenticated, loading, signOut } = useAuth();
  
  // localStorage'dan aktif tab'i oku, yoksa 'home' kullan
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('activeTab');
    return savedTab || 'home';
  });
  
  const [personnelData, setPersonnelData] = useState([]);
  const [vehicleData, setVehicleData] = useState([]);
  const [storeData, setStoreData] = useState([]);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [userDetails, setUserDetails] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dataStatus, setDataStatus] = useState({
    personnel: { loaded: false, count: 0, hasExisting: false },
    vehicles: { loaded: false, count: 0, hasExisting: false },
    stores: { loaded: false, count: 0, hasExisting: false },
    dailyNotes: [],
    weeklySchedules: []
  });

  // Takvim için state'ler
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [calendarAnimation, setCalendarAnimation] = useState('');
  const [notification, setNotification] = useState(null);
  


  // Tab değiştiğinde localStorage'a kaydet
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    localStorage.setItem('activeTab', tabId);
  };

  // Kullanıcı rolünü al
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          const role = await getUserRole(user.id);
          setUserRole(role);
          
          // Kullanıcı detaylarını da çek
          const userDetailsResult = await getUserDetails(user.id, user.email);
          if (userDetailsResult.success && userDetailsResult.data) {
            setUserDetails(userDetailsResult.data);
          }
        } catch (error) {
          console.error('❌ User role error:', error);
          // Hata durumunda admin ver (test için)
          setUserRole('admin');
        }
      }
    };

    fetchUserRole();
  }, [user]);



  // Notification gösterme fonksiyonu
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 7000); // 7 saniye göster
  };



  // Veritabanından veri yükleme
  useEffect(() => {
    const loadData = async () => {
      try {
              const [personnelResult, vehicleResult, storeResult, dailyNotesResult, weeklySchedulesResult] = await Promise.all([
        getAllPersonnel(),
        getAllVehicles(),
        getAllStores(),
        getDailyNotes(),
        getWeeklySchedules()
      ]);
        
        // Veri durumu güncelle
        const newDataStatus = {
          personnel: { 
            loaded: personnelResult.success, 
            count: personnelResult.success ? personnelResult.data.length : 0,
            hasExisting: personnelResult.success && personnelResult.data.length > 0
          },
          vehicles: { 
            loaded: vehicleResult.success, 
            count: vehicleResult.success ? vehicleResult.data.length : 0,
            hasExisting: vehicleResult.success && vehicleResult.data.length > 0
          },
          stores: { 
            loaded: storeResult.success, 
            count: storeResult.success ? storeResult.data.length : 0,
            hasExisting: storeResult.success && storeResult.data.length > 0
          }
        };
        
        setDataStatus({
          ...newDataStatus,
          dailyNotes: dailyNotesResult.success ? dailyNotesResult.data : [],
          weeklySchedules: weeklySchedulesResult.success ? weeklySchedulesResult.data : []
        });
        
        if (personnelResult.success) setPersonnelData(personnelResult.data);
        if (vehicleResult.success) setVehicleData(vehicleResult.data);
        if (storeResult.success) setStoreData(storeResult.data);
        
        setDataLoaded(true);
        
        // Veri durumu bilgilendirme
        const hasAnyData = newDataStatus.personnel.hasExisting || 
                          newDataStatus.vehicles.hasExisting || 
                          newDataStatus.stores.hasExisting;
        
        if (hasAnyData) {
          showNotification('Veritabanından veriler başarıyla yüklendi', 'success');
        } else {
          showNotification('Henüz sisteme veri yüklenmemiş. Excel dosyası yükleyebilirsiniz.', 'info');
        }
      } catch (error) {
        console.error('Data loading error:', error);
        showNotification('Veri yükleme sırasında hata oluştu', 'error');
      }
    };

    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handleDataUpload = (data) => {
    console.log('📊 handleDataUpload çağrıldı:', data);
    
    // Mevcut veri sayılarını al
    const currentPersonnelCount = personnelData.length;
    const currentVehicleCount = vehicleData.length;
    const currentStoreCount = storeData.length;
    
    // Yeni veri sayılarını hesapla
    const newPersonnelCount = data.personnel ? data.personnel.length : 0;
    const newVehicleCount = data.vehicles ? data.vehicles.length : 0;
    const newStoreCount = data.stores ? data.stores.length : 0;
    
    // Sadece var olan veri tiplerini güncelle
    const updatedDataTypes = [];
    const noChangeTypes = [];
    
    if (newPersonnelCount > 0) {
      setPersonnelData(data.personnel);
      updatedDataTypes.push(`${newPersonnelCount} personel`);
    } else if (currentPersonnelCount > 0) {
      // Personel verisi yoksa mesaj ver
      noChangeTypes.push('personel');
    }
    
    if (newVehicleCount > 0) {
      setVehicleData(data.vehicles);
      updatedDataTypes.push(`${newVehicleCount} araç`);
    } else if (currentVehicleCount > 0) {
      // Araç verisi yoksa mesaj ver
      noChangeTypes.push('araç');
    }
    
    if (newStoreCount > 0) {
      setStoreData(data.stores);
      updatedDataTypes.push(`${newStoreCount} mağaza`);
    } else if (currentStoreCount > 0) {
      // Mağaza verisi yoksa mesaj ver
      noChangeTypes.push('mağaza');
    }
    
    // Veri durumu güncelle (sadece değişen veriler için)
    const newDataStatus = {
      personnel: { 
        loaded: true, 
        count: newPersonnelCount > 0 ? newPersonnelCount : currentPersonnelCount,
        hasExisting: newPersonnelCount > 0 ? true : currentPersonnelCount > 0
      },
      vehicles: { 
        loaded: true, 
        count: newVehicleCount > 0 ? newVehicleCount : currentVehicleCount,
        hasExisting: newVehicleCount > 0 ? true : currentVehicleCount > 0
      },
      stores: { 
        loaded: true, 
        count: newStoreCount > 0 ? newStoreCount : currentStoreCount,
        hasExisting: newStoreCount > 0 ? true : currentStoreCount > 0
      }
    };
    
    setDataStatus(newDataStatus);
    setDataLoaded(true);
    
    // Akıllı feedback mesajları
    if (updatedDataTypes.length > 0) {
      showNotification(`Başarıyla yüklendi: ${updatedDataTypes.join(', ')}`, 'success');
    }
    
    if (noChangeTypes.length > 0) {
      showNotification(`Excel dosyasında ${noChangeTypes.join(', ')} verisi bulunamadı`, 'info');
    }
    
    if (updatedDataTypes.length === 0 && noChangeTypes.length === 0) {
      showNotification('Yüklenen dosyada hiçbir geçerli veri bulunamadı', 'warning');
    }
  };

  const handlePlanGenerated = (plan) => {
    setGeneratedPlan(plan);
    handleTabChange('display');
  };

  // Takvim fonksiyonları
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const getCalendarDays = () => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth);
    const days = [];

    // Önceki ayın son günleri
    for (let i = firstDay - 1; i >= 0; i--) {
      const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
      const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
      const prevMonthDays = getDaysInMonth(prevYear, prevMonth);
      days.push({
        date: new Date(prevYear, prevMonth, prevMonthDays - i),
        isCurrentMonth: false,
        notes: []
      });
    }

    // Bu ayın günleri
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth, day);
      const dateStr = date.toISOString().split('T')[0];
      const dayNotes = dataStatus.dailyNotes.filter(note => note.date === dateStr);
      
      days.push({
        date,
        isCurrentMonth: true,
        notes: dayNotes
      });
    }

    // Sonraki ayın ilk günleri
    const remainingDays = 42 - days.length; // 6 hafta x 7 gün
    for (let day = 1; day <= remainingDays; day++) {
      const nextMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
      const nextYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
      days.push({
        date: new Date(nextYear, nextMonth, day),
        isCurrentMonth: false,
        notes: []
      });
    }

    return days;
  };

  const isFutureDate = (date) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Bugünün sonu
    return date > today;
  };

  const getMonthName = (month) => {
    const months = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return months[month];
  };

  const getStatusText = (status) => {
    const statusMap = {
      'raporlu': 'Raporlu',
      'habersiz': 'Habersiz',
      'yillik_izin': 'Yıllık İzin',
      'dinlenme': 'Dinlenme'
    };
    return statusMap[status] || status;
  };

  const animateCalendar = (direction) => {
    setCalendarAnimation(direction);
    setTimeout(() => {
      setCalendarAnimation('slide-in');
    }, 300);
  };

  const handleMonthChange = (newMonth, newYear) => {
    const currentDate = new Date(selectedYear, selectedMonth);
    const newDate = new Date(newYear, newMonth);
    
    // Gelecek tarih kontrolü
    const today = new Date();
    const selectedDate = new Date(newYear, newMonth, 1);
    if (selectedDate > today) {
      alert('Gelecek tarihler seçilemez!');
      return;
    }
    
    if (newDate > currentDate) {
      animateCalendar('slide-out-left');
    } else {
      animateCalendar('slide-out-right');
    }
    
    setTimeout(() => {
      setSelectedMonth(newMonth);
      setSelectedYear(newYear);
    }, 150);
  };

  // Performans verilerini hesapla
  const [performanceData, setPerformanceData] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);

  const loadPerformanceData = async () => {
    try {
      const result = await getPerformanceData();
      if (result.success && result.data.length > 0) {
        setPerformanceData(result.data);
        
        // Performans Analizi'ndeki gibi veri işleme
        const drivers = {};
        const personnel = {};
        const allDatesSet = new Set();
        
        // GRUPLANDIRMA: Aynı gün aynı çalışan için kayıtları birleştir
        const groupedRecords = {};
        
        result.data.forEach(record => {
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
          
          const dayDataKey = `${dateForKey}_${shiftForKey}`;
          const groupKey = `${employee_name}_${dayDataKey}`;
          
          // Gruplandırma - aynı çalışan aynı gün için
          if (!groupedRecords[groupKey]) {
            groupedRecords[groupKey] = {
              employee_name,
              dayDataKey,
              formattedDate,
              trips: 0,
              pallets: 0,
              boxes: 0,
              stores: new Set(),
              date_shift_type
            };
          }
          
          // Mağaza kodlarını ekle
          if (store_codes) {
            const stores = store_codes.split(',').map(s => s.trim()).filter(s => s);
            stores.forEach(store => groupedRecords[groupKey].stores.add(store));
          }
          
          // Palet ve kasa miktarlarını topla
          groupedRecords[groupKey].pallets += pallets;
          groupedRecords[groupKey].boxes += boxes;
          groupedRecords[groupKey].trips += trips;
        });
        
        // Şimdi gruplandırılmış kayıtları işle
        Object.values(groupedRecords).forEach(groupedRecord => {
          const { employee_name, dayDataKey, formattedDate, pallets, boxes, stores, date_shift_type } = groupedRecord;
          
          // Personnel database'den position'a bak
          const person = personnelData.find(p => p.full_name === employee_name);
          if (!person) {
            return;
          }
          
          // Şoför tespiti için daha geniş kontrol
          const positionLower = (person.position || '').toLowerCase().trim();
          const isDriver = positionLower.includes('şoför') || positionLower.includes('sofor') || 
                          positionLower.includes('driver') || positionLower.includes('sürücü');
          
          const targetGroup = isDriver ? drivers : personnel;
          
          allDatesSet.add(formattedDate);
          
          if (!targetGroup[employee_name]) {
            const originalShift = person.shift_type || 'gunduz';
            const shiftLower = originalShift.toLowerCase().trim();
            let personnelShiftDisplay;
            
            if (shiftLower.includes('gece') || shiftLower === 'night' || shiftLower === 'gece') {
              personnelShiftDisplay = 'GECE';
            } else if (shiftLower.includes('izin') || shiftLower === 'leave' || shiftLower === 'vacation' || shiftLower.includes('izinli')) {
              personnelShiftDisplay = 'İZİNLİ';
            } else {
              personnelShiftDisplay = 'GÜNDÜZ';
            }
            
            targetGroup[employee_name] = {
              name: employee_name,
              shift: personnelShiftDisplay,
              totalTrips: 0,
              totalPallets: 0,
              totalBoxes: 0,
              totalStores: 0,
              dayData: {}
            };
          }
          
          // Günlük veriyi sheet_name bazında ekle
          if (!targetGroup[employee_name].dayData[dayDataKey]) {
            targetGroup[employee_name].dayData[dayDataKey] = {
              trips: 0,
              pallets: 0,
              boxes: 0,
              stores: []
            };
          }
          
          // ÖNEMLİ: Trips sayısını benzersiz mağaza sayısı olarak ayarla
          const uniqueStoreCount = stores.size;
          const storeArray = Array.from(stores);
          
          targetGroup[employee_name].dayData[dayDataKey].trips = uniqueStoreCount;
          targetGroup[employee_name].dayData[dayDataKey].pallets += pallets;
          targetGroup[employee_name].dayData[dayDataKey].boxes += boxes;
          targetGroup[employee_name].dayData[dayDataKey].stores.push(...storeArray);
          
          // Toplam değerleri güncelle
          targetGroup[employee_name].totalTrips += uniqueStoreCount;
          targetGroup[employee_name].totalPallets += pallets;
          targetGroup[employee_name].totalBoxes += boxes;
          targetGroup[employee_name].totalStores += uniqueStoreCount;
        });
        
        // Analiz formatına çevir
        const allDates = Array.from(allDatesSet).sort((a, b) => {
          const parseDate = (dateStr) => {
            const [day, month, year] = dateStr.split('.');
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          };
          
          return parseDate(a) - parseDate(b);
        });
        
        const analysisResults = {
          drivers,
          personnel,
          allDates,
          summary: {
            totalDrivers: Object.keys(drivers).length,
            totalPersonnel: Object.keys(personnel).length,
            totalDays: allDates.length
          }
        };
        
        setAnalysisData(analysisResults);
      }
    } catch (error) {
      console.error('Performans verisi yüklenirken hata:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated && personnelData.length > 0) {
      loadPerformanceData();
    }
  }, [isAuthenticated, personnelData]);

  const getPerformanceSummary = () => {
    if (!analysisData) {
      return {
        geceDays: 0,
        gunduzDays: 0,
        totalDeliveries: 0,
        totalPallets: 0,
        totalBoxes: 0
      };
    }

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Bu ayki tarihleri filtrele
    const thisMonthDates = analysisData.allDates.filter(dateStr => {
      const [day, month, year] = dateStr.split('.');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    // Vardiya günlerini hesapla (Performans Analizi'ndeki gibi)
    const nightShiftDates = new Set();
    const dayShiftDates = new Set();
    
    // Tüm şoför ve personel verilerinden vardiya bilgilerini topla
    [...Object.values(analysisData.drivers), ...Object.values(analysisData.personnel)].forEach(person => {
      Object.entries(person.dayData || {}).forEach(([dayDataKey, data]) => {
        const [dateStr, shift] = dayDataKey.split('_');
        if (shift === 'GECE') {
          nightShiftDates.add(dateStr);
        } else if (shift === 'GÜNDÜZ') {
          dayShiftDates.add(dateStr);
        }
      });
    });
    
    // Bu ayki vardiya günlerini filtrele
    const thisMonthNightDays = Array.from(nightShiftDates).filter(dateStr => {
      const [day, month, year] = dateStr.split('.');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    const thisMonthDayDays = Array.from(dayShiftDates).filter(dateStr => {
      const [day, month, year] = dateStr.split('.');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    
    // Toplam değerleri hesapla
    const totalDeliveries = [...Object.values(analysisData.drivers), ...Object.values(analysisData.personnel)]
      .reduce((sum, person) => sum + person.totalTrips, 0);
    
    const totalPallets = [...Object.values(analysisData.drivers), ...Object.values(analysisData.personnel)]
      .reduce((sum, person) => sum + person.totalPallets, 0);
    
    const totalBoxes = [...Object.values(analysisData.drivers), ...Object.values(analysisData.personnel)]
      .reduce((sum, person) => sum + person.totalBoxes, 0);

    return {
      geceDays: thisMonthNightDays.length,
      gunduzDays: thisMonthDayDays.length,
      totalDeliveries,
      totalPallets,
      totalBoxes
    };
  };

  const handleLogout = async () => {
    const result = await signOut();
    if (result.success) {
      // localStorage'ı temizle ve home'a dön
      localStorage.removeItem('activeTab');
      setActiveTab('home');
      setPersonnelData([]);
      setVehicleData([]);
      setStoreData([]);
      setGeneratedPlan(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Authentication check
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Navigation items
  const navigationItems = [
    { id: 'home', label: 'Ana Sayfa', icon: Home },
    { id: 'vehicles', label: 'Araç Listesi', icon: Car },
    { id: 'stores', label: 'Mağaza Listesi', icon: Store },
    { id: 'personnel', label: 'Personel Listesi', icon: Users },
    { id: 'vardiya-kontrol', label: 'Personel Kontrol', icon: Clock },
    { id: 'performance', label: 'Performans Analizi', icon: BarChart3 },
    { id: 'planning', label: 'Vardiya Planlama', icon: Calendar },
    { id: 'display', label: 'Plan Görüntüle', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-slate-100">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.05),transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(99,102,241,0.05),transparent_70%)]"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-28">
              {/* Left: Logo & Brand - Sabit genişlik */}
              <div className="flex items-center space-x-4 min-w-0 flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-2xl font-bold text-gray-900 leading-tight">Personel Takip</h1>
                  <p className="text-xs text-gray-500 mt-0.5">Modern İş Yönetimi Sistemi</p>
                </div>
              </div>

              {/* Center: Desktop Navigation - Esnek genişlik */}
              <nav className="hidden lg:flex flex-1 justify-center max-w-4xl mx-8">
                <div className="flex items-center space-x-1">
                  {navigationItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
                      className={`
                        flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105
                        ${activeTab === item.id
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                        }
                      `}
                    >
                      <item.icon className="w-4 h-4 mr-2" />
                      <span className="hidden xl:inline text-xs">{item.label}</span>
                    </button>
                  ))}
                </div>
              </nav>

              {/* Right: User Info & Actions - Sabit genişlik */}
              <div className="flex items-center space-x-4 flex-shrink-0">
                {/* User Info - Sadece bilgi gösterir */}
                <div className="hidden md:flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {userDetails?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 justify-end mt-0.5">
                      <div className={`w-2 h-2 rounded-full ${userRole === 'admin' ? 'bg-green-500' : userRole === 'yönetici' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                      {userRole === 'admin' ? 'Admin' : userRole === 'yönetici' ? 'Yönetici' : 'Kullanıcı'}
                    </p>
                  </div>
                </div>

                {/* Admin Panel Button */}
                {(userRole === 'admin' || userRole === 'yönetici') && (
                  <button
                    onClick={() => handleTabChange('admin')}
                    className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 text-sm shadow-lg"
                  >
                    <Shield className="w-4 h-4" />
                    <span className="hidden lg:inline">Admin Panel</span>
                  </button>
                )}

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 text-sm shadow-lg"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden lg:inline">Çıkış</span>
                </button>


                
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile/Tablet Navigation */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-200/50 bg-white/95 backdrop-blur-sm relative">
              <div className="px-4 sm:px-6 py-4 space-y-2">
                {navigationItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleTabChange(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`
                      w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative
                      ${activeTab === item.id
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </button>
                ))}
                
                {/* Divider */}
                <div className="h-px bg-gray-200 my-3"></div>
                
                {/* Admin Panel - Mobile */}
                {(userRole === 'admin' || userRole === 'yönetici') && (
                  <button
                    onClick={() => {
                      handleTabChange('admin');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg"
                  >
                    <Shield className="w-5 h-5 mr-3" />
                    Admin Panel
                  </button>
                )}
                
                {/* Logout - Mobile */}
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Çıkış Yap
                </button>
              </div>
                </div>
          )}

          {/* Medium Screen Navigation */}
          <div className="hidden md:block lg:hidden border-t border-gray-200/50 bg-white/95 backdrop-blur-sm relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-center py-4 space-x-2">
                {navigationItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`
                      flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 relative
                      ${activeTab === item.id
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                      }
                    `}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    <span className="text-xs">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Notification */}
        {notification && (
          <div className="fixed top-40 right-6 z-50 transform transition-all duration-500 ease-out animate-slide-in-right">
            <div className={`
              relative overflow-hidden rounded-2xl shadow-2xl border backdrop-blur-lg min-w-[320px] max-w-md
              ${notification.type === 'success' ? 'bg-green-50/95 border-green-200 text-green-900' :
                notification.type === 'error' ? 'bg-red-50/95 border-red-200 text-red-900' :
                notification.type === 'warning' ? 'bg-amber-50/95 border-amber-200 text-amber-900' :
                'bg-blue-50/95 border-blue-200 text-blue-900'}
            `}>
              {/* Colored top border */}
              <div className={`
                absolute top-0 left-0 w-full h-1
                ${notification.type === 'success' ? 'bg-gradient-to-r from-green-400 to-green-600' :
                  notification.type === 'error' ? 'bg-gradient-to-r from-red-400 to-red-600' :
                  notification.type === 'warning' ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                  'bg-gradient-to-r from-blue-400 to-blue-600'}
              `}></div>

              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`
                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                    ${notification.type === 'success' ? 'bg-green-100' :
                      notification.type === 'error' ? 'bg-red-100' :
                      notification.type === 'warning' ? 'bg-amber-100' :
                      'bg-blue-100'}
                  `}>
                    {notification.type === 'success' && <Check className="w-4 h-4 text-green-600" />}
                    {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
                    {notification.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600" />}
                    {notification.type === 'info' && <Upload className="w-4 h-4 text-blue-600" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-relaxed">
                      {notification.message}
                    </p>
                </div>

                  <button
                    onClick={() => setNotification(null)}
                    className={`
                      flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors
                      ${notification.type === 'success' ? 'hover:bg-green-200 text-green-600' :
                        notification.type === 'error' ? 'hover:bg-red-200 text-red-600' :
                        notification.type === 'warning' ? 'hover:bg-amber-200 text-amber-600' :
                        'hover:bg-blue-200 text-blue-600'}
                    `}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Ana Sayfa Dashboard */}
          {activeTab === 'home' && (
            <div className="space-y-8">
              {/* Hoş Geldiniz */}
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-3xl p-8 text-white">
                <h1 className="text-3xl font-bold mb-2">
                  Hoş Geldin {userDetails?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Kullanıcı'}! 👋
                </h1>
                <p className="text-blue-100 mb-6">Personel Planlama Sistemi Dashboard'una hoş geldiniz. Sisteminizin genel durumunu buradan takip edebilirsiniz.</p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Sistem Aktif</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>Veriler Hazır</span>
                  </div>
                </div>
              </div>

              {/* İstatistik Kartları */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-blue-500 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-2xl font-bold text-gray-900">{dataStatus.personnel.count}</h3>
                        <p className="text-sm text-gray-600">Toplam Personel</p>
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${dataStatus.personnel.hasExisting ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  </div>
                  {!dataStatus.personnel.hasExisting && (
                    <div className="mt-3 text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                      Veri yok - Excel yükleyin
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-green-500 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <Car className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-2xl font-bold text-gray-900">{dataStatus.vehicles.count}</h3>
                        <p className="text-sm text-gray-600">Toplam Araç</p>
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${dataStatus.vehicles.hasExisting ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  </div>
                  {!dataStatus.vehicles.hasExisting && (
                    <div className="mt-3 text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                      Veri yok - Excel yükleyin
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-purple-500 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between">
                <div className="flex items-center">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Store className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-2xl font-bold text-gray-900">{dataStatus.stores.count}</h3>
                        <p className="text-sm text-gray-600">Toplam Mağaza</p>
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${dataStatus.stores.hasExisting ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  </div>
                  {!dataStatus.stores.hasExisting && (
                    <div className="mt-3 text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                      Veri yok - Excel yükleyin
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-orange-500 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between">
                <div className="flex items-center">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-orange-600" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-2xl font-bold text-gray-900">{generatedPlan ? 1 : 0}</h3>
                        <p className="text-sm text-gray-600">Aktif Planlar</p>
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${generatedPlan ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  </div>
                  {!generatedPlan && (
                    <div className="mt-3 text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                      Plan oluşturun
                    </div>
                  )}
                </div>
              </div>

              
              {/* Takvim Görünümü */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">📅 Aylık Takip Takvimi</h3>
                
                {/* Takvim Kontrolleri */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="text-lg font-semibold text-gray-900">
                      {getMonthName(selectedMonth)} {selectedYear}
                    </div>
                   
                  </div>
                  
                </div>

                {/* Takvim Grid */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <div className={`grid grid-cols-7 gap-1 transition-all duration-300 ${
                    calendarAnimation === 'slide-out-left' ? 'transform -translate-x-full opacity-0' :
                    calendarAnimation === 'slide-out-right' ? 'transform translate-x-full opacity-0' :
                    calendarAnimation === 'slide-in' ? 'transform translate-x-0 opacity-100' :
                    'transform translate-x-0 opacity-100'
                  }`}>
                    {/* Gün Başlıkları */}
                    {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
                      <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 bg-gray-50 rounded-lg flex items-center justify-center h-10">
                        {day}
                      </div>
                    ))}

                    {/* Takvim Günleri */}
                    {getCalendarDays().map((day, index) => (
                      <div
                        key={index}
                        className={`p-3 min-h-[120px] border border-gray-200 rounded-xl transition-all duration-300 flex flex-col ${
                          day.isCurrentMonth 
                            ? isFutureDate(day.date) 
                              ? 'bg-gray-50 text-gray-400 cursor-not-allowed' 
                              : 'bg-white hover:bg-gray-50 hover:shadow-lg hover:scale-105 cursor-pointer' 
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        <div className={`text-sm font-bold mb-2 flex-shrink-0 ${
                          isFutureDate(day.date) ? 'text-gray-400' : 'text-gray-900'
                        }`}>
                          {day.date.getDate()}
                        </div>
                        {day.isCurrentMonth && day.notes.length > 0 && !isFutureDate(day.date) && (
                          <div className="space-y-1.5 max-h-[80px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 flex-1">
                            {day.notes.map((note, noteIndex) => (
                              <div
                                key={noteIndex}
                                className={`text-xs px-2 py-1.5 rounded-lg font-medium transition-all duration-300 hover:scale-105 hover:shadow-md ${
                                  note.status === 'dinlenme' ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-900 hover:from-purple-200 hover:to-purple-300 border border-purple-300 shadow-sm' :
                                  note.status === 'raporlu' ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-900 hover:from-red-200 hover:to-red-300 border border-red-300 shadow-sm' :
                                  note.status === 'habersiz' ? 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-900 hover:from-orange-200 hover:to-orange-300 border border-orange-300 shadow-sm' :
                                  note.status === 'yillik_izin' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-900 hover:from-blue-200 hover:to-blue-300 border border-blue-300 shadow-sm' :
                                  'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 hover:from-gray-200 hover:to-gray-300 border border-gray-300 shadow-sm'
                                }`}
                                title={`${note.full_name} - ${getStatusText(note.status)}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="truncate">{note.full_name}</span>
                                  <span className={`ml-1 text-xs ${
                                    note.status === 'dinlenme' ? 'text-purple-700' :
                                    note.status === 'raporlu' ? 'text-red-700' :
                                    note.status === 'habersiz' ? 'text-orange-700' :
                                    note.status === 'yillik_izin' ? 'text-blue-700' :
                                    'text-gray-700'
                                  }`}>
                                    {note.status === 'dinlenme' ? '😴' :
                                     note.status === 'raporlu' ? '🏥' :
                                     note.status === 'habersiz' ? '❌' :
                                     note.status === 'yillik_izin' ? '🏖️' : '📝'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dosya Yükleme */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Veri Yükleme</h3>
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <FileUpload onDataUpload={handleDataUpload} />
                </div>
              </div>
            </div>
          )}

          {/* Personel Listesi */}
          {activeTab === 'personnel' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-gray-900">Personel Listesi</h2>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{personnelData.length}</span> personel
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl shadow-lg">
              <PersonelList 
                personnelData={personnelData}
                  onPersonnelUpdate={setPersonnelData}
                  userRole={userRole}
                />
              </div>
            </div>
          )}

          {/* Araç Listesi */}
          {activeTab === 'vehicles' && (
            <VehicleList 
                vehicleData={vehicleData}
              />
            )}
            
          {/* Mağaza Listesi */}
            {activeTab === 'stores' && (
              <StoreList 
                storeData={storeData}
              />
            )}
            
          {/* Vardiya Planlama */}
            {activeTab === 'planning' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">Vardiya Planlama</h2>
              <div className="bg-white rounded-2xl shadow-lg">
              <VardiyaPlanlama 
                personnelData={personnelData}
                vehicleData={vehicleData}
                storeData={storeData}
                onPlanGenerated={handlePlanGenerated}
              />
              </div>
            </div>
            )}
            
          {/* Plan Görüntüle */}
          {activeTab === 'display' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">Plan Görüntüle</h2>
              <div className="bg-white rounded-2xl shadow-lg">
              <PlanDisplay 
                  generatedPlan={generatedPlan}
                  personnelData={personnelData}
                  vehicleData={vehicleData}
                  storeData={storeData}
              />
              </div>
            </div>
            )}
            
          {/* Performans Analizi */}
          {activeTab === 'performance' && (
            <PerformanceAnalysis 
              generatedPlan={generatedPlan}
              personnelData={personnelData}
              vehicleData={vehicleData}
              storeData={storeData}
              onNavigateToHome={() => handleTabChange('home')}
            />
            )}

          {/* Vardiya Kontrol */}
          {activeTab === 'vardiya-kontrol' && (
            <PersonelVardiyaKontrol userRole={userRole} />
          )}

          {/* Admin Panel */}
          {activeTab === 'admin' && (userRole === 'admin' || userRole === 'yönetici') && (
            <div className="space-y-6">
              <AdminPanel userRole={userRole} currentUser={user} />
          </div>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white/50 backdrop-blur-sm border-t border-gray-200/50 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <p className="text-gray-600 font-semibold">Modern Personel Planlama Sistemi</p>
              </div>
              <div className="flex items-center justify-center gap-6 text-gray-400 text-sm">
                <span>© 2025 Personel Planlama Sistemi</span>
                <span>•</span>
                <span>Melih KOÇHAN</span>
                <span>•</span>
                <span>melihkochan.com</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Ana App component'i - AuthProvider ile wrap edilmiş
function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App; 