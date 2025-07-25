import React, { useState, useEffect } from 'react';
import { Upload, Users, Calendar, BarChart3, Sparkles, Store, LogOut, Shield, Car, Home, Menu, X, Check, AlertCircle, ChevronDown, Clock, Truck, Package, MapPin } from 'lucide-react';

import PersonelList from './components/PersonelList';
import VehicleList from './components/VehicleList';
import StoreList from './components/StoreList';
import VardiyaPlanlama from './components/VardiyaPlanlama';
import PerformanceAnalysis from './components/PerformanceAnalysis';
import PersonelVardiyaKontrol from './components/PersonelVardiyaKontrol';
import StoreDistribution from './components/StoreDistribution';
import VehicleDistribution from './components/VehicleDistribution';
import AdminPanel from './components/AdminPanel';
import LoginForm from './components/LoginForm';
import { AuthProvider, useAuth } from './context/AuthContext';
import { getAllPersonnel, getAllVehicles, getAllStores, getUserRole, getUserDetails, getDailyNotes, getWeeklySchedules, getPerformanceData } from './services/supabase';
import './App.css';

// Ana uygulama component'i (Authentication wrapper içinde)
function MainApp() {
  const { user, isAuthenticated, loading, signOut, isLoggingOut, isLoggingIn } = useAuth();
  
  // localStorage'dan aktif tab'i oku, yoksa 'home' kullan
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('activeTab');
    return savedTab || 'home';
  });
  
  const [personnelData, setPersonnelData] = useState([]);
  const [vehicleData, setVehicleData] = useState([]);
  const [storeData, setStoreData] = useState([]);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [currentShiftData, setCurrentShiftData] = useState([]);
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

  // Veritabanından veri yükleme fonksiyonu
  const loadData = async () => {
    try {
      console.log('🔄 Ana sayfa verileri yükleniyor...');
      
      const [personnelResult, vehicleResult, storeResult, dailyNotesResult] = await Promise.all([
        getAllPersonnel(),
        getAllVehicles(),
        getAllStores(),
        getDailyNotes()
      ]);

      // Personnel data
      if (personnelResult.success) {
        setPersonnelData(personnelResult.data || []);
        setDataStatus(prev => ({
          ...prev,
          personnel: {
            loaded: true,
            count: personnelResult.data?.length || 0,
            hasExisting: (personnelResult.data?.length || 0) > 0
          }
        }));
      }

      // Vehicle data
      if (vehicleResult.success) {
        setVehicleData(vehicleResult.data || []);
        setDataStatus(prev => ({
          ...prev,
          vehicles: {
            loaded: true,
            count: vehicleResult.data?.length || 0,
            hasExisting: (vehicleResult.data?.length || 0) > 0
          }
        }));
      }

      // Store data
      if (storeResult.success) {
        setStoreData(storeResult.data || []);
        setDataStatus(prev => ({
          ...prev,
          stores: {
            loaded: true,
            count: storeResult.data?.length || 0,
            hasExisting: (storeResult.data?.length || 0) > 0
          }
        }));
      }

      // Daily notes
      if (dailyNotesResult.success) {
        setDataStatus(prev => ({
          ...prev,
          dailyNotes: dailyNotesResult.data || []
        }));
      }

      setDataLoaded(true);
      console.log('✅ Ana sayfa verileri yüklendi');
    } catch (error) {
      console.error('❌ Ana sayfa veri yükleme hatası:', error);
      showNotification('Veri yükleme hatası!', 'error');
    }
  };

  // İlk yükleme
  useEffect(() => {
    if (isAuthenticated && user) {
      loadData();
      loadDailyNotes(); // Daily notes'u da yükle
    }
  }, [isAuthenticated, user]);

  // Veri yenileme fonksiyonu
  const refreshData = async () => {
    console.log('🔄 refreshData başladı');
    await loadData();
    await loadDailyNotes();
    console.log('✅ refreshData tamamlandı');
    showNotification('Veriler yenilendi!', 'success');
  };

  // Günlük notları yükle
  const loadDailyNotes = async () => {
    try {
      const result = await getDailyNotes();
      if (result.success) {
        setDataStatus(prev => ({
          ...prev,
          dailyNotes: result.data || []
        }));
      }
    } catch (error) {
      console.error('❌ Daily notes yükleme hatası:', error);
    }
  };

  // Plan oluşturulduğunda
  const handlePlanGenerated = (plan) => {
    setGeneratedPlan(plan);
    showNotification('Vardiya planı başarıyla oluşturuldu!', 'success');
  };

  // Takvim yardımcı fonksiyonları
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

    // Önceki ayın günleri
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
    
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        month: prevMonth,
        year: prevYear,
        isCurrentMonth: false,
        isToday: false
      });
    }

    // Mevcut ayın günleri
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = today.getDate() === day && 
                     today.getMonth() === selectedMonth && 
                     today.getFullYear() === selectedYear;
      
      days.push({
        day,
        month: selectedMonth,
        year: selectedYear,
        isCurrentMonth: true,
        isToday
      });
    }

    // Sonraki ayın günleri
    const nextMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
    const nextYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
    const remainingDays = 42 - days.length; // 6 satır x 7 gün = 42
    
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        month: nextMonth,
        year: nextYear,
        isCurrentMonth: false,
        isToday: false
      });
    }

    return days;
  };

  const isFutureDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
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
    switch (status) {
      case 'active': return 'Aktif';
      case 'inactive': return 'Pasif';
      case 'pending': return 'Beklemede';
      default: return status;
    }
  };

  const animateCalendar = (direction) => {
    setCalendarAnimation(direction);
    setTimeout(() => setCalendarAnimation(''), 300);
  };

  const handleMonthChange = (newMonth, newYear) => {
    const direction = newMonth > selectedMonth || (newMonth === 0 && selectedMonth === 11) ? 'right' : 'left';
    animateCalendar(direction);
    
    setTimeout(() => {
      setSelectedMonth(newMonth);
      setSelectedYear(newYear);
    }, 150);
  };

  // Performans verilerini yükle
  const loadPerformanceData = async () => {
    try {
      const result = await getPerformanceData();
      if (result.success) {
        // Performans verilerini işle
        const performanceData = result.data || [];
        
        // Haftalık planları yükle
        const weeklySchedulesResult = await getWeeklySchedules();
        if (weeklySchedulesResult.success) {
          setDataStatus(prev => ({
            ...prev,
            weeklySchedules: weeklySchedulesResult.data || []
          }));
        }
      }
    } catch (error) {
      console.error('❌ Performans veri yükleme hatası:', error);
    }
  };

  // Performans özeti hesapla
  const getPerformanceSummary = () => {
    const performanceData = dataStatus.weeklySchedules || [];
    
    if (performanceData.length === 0) {
      return {
        totalPersonnel: 0,
        totalVehicles: 0,
        totalStores: 0,
        averageEfficiency: 0
      };
    }

    // Basit özet hesaplamaları
    const totalPersonnel = performanceData.reduce((sum, item) => sum + (item.personnel_count || 0), 0);
    const totalVehicles = performanceData.reduce((sum, item) => sum + (item.vehicle_count || 0), 0);
    const totalStores = performanceData.reduce((sum, item) => sum + (item.store_count || 0), 0);
    
    const averageEfficiency = performanceData.length > 0 
      ? performanceData.reduce((sum, item) => sum + (item.efficiency || 0), 0) / performanceData.length 
      : 0;

    return {
      totalPersonnel,
      totalVehicles,
      totalStores,
      averageEfficiency: Math.round(averageEfficiency * 100) / 100
    };
  };

  const handleLogout = async () => {
    try {
      await signOut();
      showNotification('Başarıyla çıkış yapıldı!', 'success');
    } catch (error) {
      console.error('❌ Logout error:', error);
      showNotification('Çıkış yapılırken hata oluştu!', 'error');
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
    { id: 'planning', label: 'Vardiya Planlama', icon: Calendar }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-slate-100">
      {/* Logout Animation Overlay */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-t-white mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold mb-2">Çıkış Yapılıyor</h2>
            <p className="text-white/80">Güvenli çıkış için hazırlanıyor...</p>
          </div>
        </div>
      )}

      {/* Login Animation Overlay */}
      {isLoggingIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-t-white mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold mb-2">Giriş Yapılıyor</h2>
            <p className="text-white/80">Hesabınıza giriş yapılıyor...</p>
          </div>
        </div>
      )}
      
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.05),transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(99,102,241,0.05),transparent_70%)]"></div>
      </div>

      {/* Main Layout */}
      <div className="relative z-10 flex h-screen">
        {/* Sidebar */}
        <div className="w-80 bg-white/95 backdrop-blur-md border-r border-gray-200/50 shadow-xl flex flex-col">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-200/50">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Personel Takip</h1>
                <p className="text-xs text-gray-500">Modern İş Yönetimi</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="p-6 border-b border-gray-200/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {(userDetails?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userDetails?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${userRole === 'admin' ? 'bg-green-500' : userRole === 'yönetici' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                  {userRole === 'admin' ? 'Admin' : userRole === 'yönetici' ? 'Yönetici' : 'Kullanıcı'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {/* Ana Sayfa */}
            <button
              onClick={() => handleTabChange('home')}
              className={`
                w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105
                ${activeTab === 'home'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                }
              `}
            >
              <Home className="w-5 h-5 mr-3" />
              Ana Sayfa
            </button>

            {/* Personel Yönetimi Grubu */}
            <div className="space-y-2">
              <div className="flex items-center px-4 py-2">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Personel Yönetimi</span>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>
              
              <button
                onClick={() => handleTabChange('personnel')}
                className={`
                  w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105
                  ${activeTab === 'personnel'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                  }
                `}
              >
                <Users className="w-5 h-5 mr-3" />
                Personel Listesi
              </button>
              
              <button
                onClick={() => handleTabChange('vardiya-kontrol')}
                className={`
                  w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105
                  ${activeTab === 'vardiya-kontrol'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                  }
                `}
              >
                <Clock className="w-5 h-5 mr-3" />
                Personel Kontrol
              </button>
              
              <button
                onClick={() => handleTabChange('performance')}
                className={`
                  w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105
                  ${activeTab === 'performance'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                  }
                `}
              >
                <BarChart3 className="w-5 h-5 mr-3" />
                Performans Analizi
              </button>
              
              <button
                onClick={() => handleTabChange('store-distribution')}
                className={`
                  w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105
                  ${activeTab === 'store-distribution'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                  }
                `}
              >
                <MapPin className="w-5 h-5 mr-3" />
                Personel Konum Dağılımı
              </button>
              
              <button
                onClick={() => handleTabChange('vehicle-distribution')}
                className={`
                  w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105
                  ${activeTab === 'vehicle-distribution'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                  }
                `}
              >
                <Car className="w-5 h-5 mr-3" />
                Personel Araç Dağılımı
              </button>
            </div>

            {/* Sistem Yönetimi Grubu */}
            <div className="space-y-2">
              <div className="flex items-center px-4 py-2">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Sistem Yönetimi</span>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>
              
              <button
                onClick={() => handleTabChange('vehicles')}
                className={`
                  w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105
                  ${activeTab === 'vehicles'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                  }
                `}
              >
                <Car className="w-5 h-5 mr-3" />
                Araç Listesi
              </button>
              
              <button
                onClick={() => handleTabChange('stores')}
                className={`
                  w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105
                  ${activeTab === 'stores'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                  }
                `}
              >
                <Store className="w-5 h-5 mr-3" />
                Mağaza Listesi
              </button>
            </div>

            {/* Vardiya Planlama Grubu */}
            <div className="space-y-2">
              <div className="flex items-center px-4 py-2">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Vardiya Planlama</span>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>
              
              <button
                onClick={() => handleTabChange('planning')}
                className={`
                  w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105
                  ${activeTab === 'planning'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                  }
                `}
              >
                <Calendar className="w-5 h-5 mr-3" />
                Vardiya Planlama
              </button>
              

            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-200/50 space-y-2">
            {/* Admin Panel Button */}
            {(userRole === 'admin' || userRole === 'yönetici') && (
              <button
                onClick={() => handleTabChange('admin')}
                className="w-full flex items-center px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 text-sm shadow-lg"
              >
                <Shield className="w-5 h-5 mr-3" />
                Admin Panel
              </button>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 text-sm shadow-lg"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Çıkış Yap
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header for Mobile */}
          <header className="lg:hidden bg-white/95 backdrop-blur-md border-b border-gray-200/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Personel Takip</h1>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </header>

          {/* Mobile Menu Overlay */}
          {mobileMenuOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
              <div className="absolute left-0 top-0 h-full w-80 bg-white shadow-2xl">
                <div className="p-6 border-b border-gray-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h1 className="text-lg font-bold text-gray-900">Personel Takip</h1>
                      </div>
                    </div>
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  {/* Ana Sayfa */}
                  <button
                    onClick={() => {
                      handleTabChange('home');
                      setMobileMenuOpen(false);
                    }}
                    className={`
                      w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                      ${activeTab === 'home'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Home className="w-5 h-5 mr-3" />
                    Ana Sayfa
                  </button>

                  {/* Personel Yönetimi Grubu */}
                  <div className="space-y-2">
                    <div className="flex items-center px-4 py-2">
                      <div className="flex-1 h-px bg-gray-300"></div>
                      <span className="px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Personel Yönetimi</span>
                      <div className="flex-1 h-px bg-gray-300"></div>
                    </div>
                    
                    <button
                      onClick={() => {
                        handleTabChange('personnel');
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                        ${activeTab === 'personnel'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Users className="w-5 h-5 mr-3" />
                      Personel Listesi
                    </button>
                    
                    <button
                      onClick={() => {
                        handleTabChange('vardiya-kontrol');
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                        ${activeTab === 'vardiya-kontrol'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Clock className="w-5 h-5 mr-3" />
                      Personel Kontrol
                    </button>
                    
                    <button
                      onClick={() => {
                        handleTabChange('performance');
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                        ${activeTab === 'performance'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <BarChart3 className="w-5 h-5 mr-3" />
                      Performans Analizi
                    </button>
                    
                    <button
                      onClick={() => {
                        handleTabChange('store-distribution');
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                        ${activeTab === 'store-distribution'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <MapPin className="w-5 h-5 mr-3" />
                      Personel Konum Dağılımı
                    </button>
                    
                    <button
                      onClick={() => {
                        handleTabChange('vehicle-distribution');
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                        ${activeTab === 'vehicle-distribution'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Car className="w-5 h-5 mr-3" />
                      Personel Araç Dağılımı
                    </button>
                  </div>

                  {/* Sistem Yönetimi Grubu */}
                  <div className="space-y-2">
                    <div className="flex items-center px-4 py-2">
                      <div className="flex-1 h-px bg-gray-300"></div>
                      <span className="px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Sistem Yönetimi</span>
                      <div className="flex-1 h-px bg-gray-300"></div>
                    </div>
                    
                    <button
                      onClick={() => {
                        handleTabChange('vehicles');
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                        ${activeTab === 'vehicles'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Car className="w-5 h-5 mr-3" />
                      Araç Listesi
                    </button>
                    
                    <button
                      onClick={() => {
                        handleTabChange('stores');
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                        ${activeTab === 'stores'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Store className="w-5 h-5 mr-3" />
                      Mağaza Listesi
                    </button>
                  </div>

                  {/* Vardiya Planlama Grubu */}
                  <div className="space-y-2">
                    <div className="flex items-center px-4 py-2">
                      <div className="flex-1 h-px bg-gray-300"></div>
                      <span className="px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Vardiya Planlama</span>
                      <div className="flex-1 h-px bg-gray-300"></div>
                    </div>
                    
                    <button
                      onClick={() => {
                        handleTabChange('planning');
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                        ${activeTab === 'planning'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Calendar className="w-5 h-5 mr-3" />
                      Vardiya Planlama
                    </button>
                    

                  </div>
                  
                  <div className="h-px bg-gray-200 my-4"></div>
                  
                  {(userRole === 'admin' || userRole === 'yönetici') && (
                    <button
                      onClick={() => {
                        handleTabChange('admin');
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl shadow-lg"
                    >
                      <Shield className="w-5 h-5 mr-3" />
                      Admin Panel
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl shadow-lg"
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    Çıkış Yap
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notification */}
          {notification && (
            <div className="fixed top-6 right-6 z-50 transform transition-all duration-500 ease-out animate-slide-in-right">
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
          <main className="flex-1 overflow-auto p-8">
            {/* Ana Sayfa Dashboard */}
            {activeTab === 'home' && (
              <div className="space-y-8">
                {/* Hoş Geldiniz */}
                <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-3xl p-8 text-white">
                  <h1 className="text-3xl font-bold mb-2">
                    Hoş Geldin {userDetails?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Kullanıcı'}! 👋
                  </h1>
                  <p className="text-blue-100 mb-6">Personel Takip Sistemi Dashboard'una hoş geldiniz. Sisteminizin genel durumunu buradan takip edebilirsiniz.</p>
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
                    <button
                      onClick={() => {
                        const newMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
                        const newYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
                        handleMonthChange(newMonth, newYear);
                      }}
                      className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <ChevronDown className="w-5 h-5 transform rotate-90" />
                    </button>
                    
                    <h4 className="text-xl font-semibold text-gray-900">
                      {getMonthName(selectedMonth)} {selectedYear}
                    </h4>
                    
                    <button
                      onClick={() => {
                        const newMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
                        const newYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
                        handleMonthChange(newMonth, newYear);
                      }}
                      className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <ChevronDown className="w-5 h-5 transform -rotate-90" />
                    </button>
                  </div>

                  {/* Takvim Grid */}
                  <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* Gün başlıkları */}
                    <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                      {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
                        <div key={day} className="p-3 text-center text-sm font-medium text-gray-600">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Takvim günleri */}
                    <div className={`grid grid-cols-7 ${calendarAnimation === 'left' ? 'animate-slide-left' : calendarAnimation === 'right' ? 'animate-slide-right' : ''}`}>
                      {getCalendarDays().map((day, index) => (
                                                                <div
                                          key={index}
                                          className={`
                                            p-2 border-r border-b border-gray-100 min-h-[120px] relative
                                            ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                                            ${day.isToday ? 'bg-blue-50 border-blue-200' : ''}
                                            ${isFutureDate(new Date(day.year, day.month, day.day)) ? 'opacity-60' : ''}
                                          `}
                                        >
                          <div className={`
                            text-sm font-medium mb-1
                            ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                            ${day.isToday ? 'text-blue-600' : ''}
                          `}>
                            {day.day}
                          </div>
                          
                          {/* Günlük notlar */}
                          {(() => {
                            const dayNotes = dataStatus.dailyNotes.filter(note => {
                              const noteDate = new Date(note.date);
                              return noteDate.getDate() === day.day && 
                                     noteDate.getMonth() === day.month && 
                                     noteDate.getFullYear() === day.year;
                            });
                            
                            if (dayNotes.length > 0) {
                              return (
                                <div className="mt-2 space-y-1">
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <div className="text-xs text-gray-500">
                                      {dayNotes.length} kayıt
                                    </div>
                                  </div>
                                  {/* Kayıt detayları */}
                                  <div className="text-xs text-gray-600 max-h-24 overflow-y-auto space-y-0.5 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pr-1">
                                    {dayNotes.slice(0, 4).map((note, index) => (
                                      <div key={index} className="truncate leading-tight">
                                        {note.full_name} - {note.status}
                                      </div>
                                    ))}
                                    {dayNotes.length > 4 && (
                                      <div className="text-gray-400 leading-tight mt-1 font-medium">
                                        +{dayNotes.length - 4} daha
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Araç Listesi */}
            {activeTab === 'vehicles' && (
              <VehicleList 
                vehicleData={vehicleData}
              />
            )}
            
            {/* Personel Listesi */}
            {activeTab === 'personnel' && (
              <PersonelList 
                personnelData={personnelData}
                vehicleData={vehicleData}
                userRole={userRole}
                currentShiftData={currentShiftData}
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
              <VardiyaPlanlama 
                userRole={userRole}
                onDataUpdate={refreshData}
              />
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
              <PersonelVardiyaKontrol 
                userRole={userRole} 
                onDataUpdate={refreshData}
                onCurrentShiftDataUpdate={setCurrentShiftData}
              />
            )}

            {/* Mağaza Konum Dağılımı */}
            {activeTab === 'store-distribution' && (
              <StoreDistribution />
            )}

            {/* Araç Dağılımı */}
            {activeTab === 'vehicle-distribution' && (
              <VehicleDistribution />
            )}

            {/* Admin Panel */}
            {activeTab === 'admin' && (userRole === 'admin' || userRole === 'yönetici') && (
              <div className="space-y-6">
                <AdminPanel userRole={userRole} currentUser={user} />
              </div>
            )}
          </main>
        </div>
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