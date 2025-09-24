import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Upload, Users, Calendar, BarChart3, Sparkles, Store, LogOut, Shield, Car, Home, Menu, X, Check, AlertCircle, ChevronDown, Clock, Truck, Package, MapPin, Bell, MessageCircle, BookOpen, Map, UserCheck } from 'lucide-react';
import { FileExcelOutlined } from '@ant-design/icons';
import 'antd/dist/reset.css';

import PersonelList from './components/personnel/PersonelList';
import VehicleList from './components/vehicles/VehicleList';
import StoreList from './components/stores/StoreList';
import StoreDistanceCalculator from './components/stores/StoreDistanceCalculator';
import StoreDifficultyManager from './components/stores/StoreDifficultyManager';
import TransferPersonnelList from './components/transfer/TransferPersonnelList';
import TransferDistributionAnalysis from './components/transfer/TransferDistributionAnalysis';
import VardiyaPlanlama from './components/timesheet/VardiyaPlanlama';
import AkilliDagitim from './components/timesheet/AkilliDagitim';
import PerformanceAnalysis from './components/personnel/PerformanceAnalysis';
import PersonelVardiyaKontrol from './components/personnel/PersonelVardiyaKontrol';
import StoreDistribution from './components/stores/StoreDistribution';
import VehicleDistribution from './components/vehicles/VehicleDistribution';
import Statistics from './components/statistics/Statistics';
import TeamShifts from './components/timesheet/TeamShifts';
import PuantajTakvim from './components/puantaj/PuantajTakvim';
import PuantajTakip from './components/puantaj/PuantajTakip';
import TeamPersonnel from './components/timesheet/TeamPersonnel';
import AdminPanel from './components/admin/AdminPanel';
import LoginForm from './components/ui/LoginForm';
import NotificationPanel from './components/notifications/NotificationPanel';
import ToastManager from './components/notifications/ToastManager';
import SimpleNotification from './components/notifications/SimpleNotification';
import UnauthorizedAccess from './components/ui/UnauthorizedAccess';
import ChatSystem from './components/chat/ChatSystem';
import SessionTimeoutModal from './components/ui/SessionTimeoutModal';
import RulesApp from './components/rules/RulesApp';
import { AuthProvider, useAuth } from './context/AuthContext';
import { getVersionInfo } from './config/version';
import { getAllPersonnel, getAllVehicles, getAllStores, getUserRole, getUserDetails, getDailyNotes, getWeeklySchedules, getPerformanceData, getUnreadNotificationCount, markAllNotificationsAsRead, deleteAllNotifications, createPendingApprovalNotification, supabase } from './services/supabase';
import { getPendingRegistrationsCount } from './services/supabase';
import './App.css';

// Ana uygulama component'i (Authentication wrapper içinde)
function MainApp() {
  const { user, isAuthenticated, loading, signOut, isLoggingOut, isLoggingIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // URL'den aktif tab'i al
  const [activeTab, setActiveTab] = useState(() => {
    const path = location.pathname;
    if (path === '/') return 'home';
    return path.substring(1) || 'home';
  });

  const [personnelData, setPersonnelData] = useState([]);
  const [vehicleData, setVehicleData] = useState([]);
  const [storeData, setStoreData] = useState([]);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [currentShiftData, setCurrentShiftData] = useState([]);
  const [userRole, setUserRole] = useState('user');
  const [userDetails, setUserDetails] = useState(null);
  const [userRoleLoading, setUserRoleLoading] = useState(true);
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
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [showSimpleNotification, setShowSimpleNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [lastNotificationCount, setLastNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);


  // Bildirim sayısına göre renk belirleme fonksiyonu
  const getNotificationColor = (count) => {
    if (count === 0) return 'bg-gray-400';
    if (count <= 3) return 'bg-green-500';
    if (count <= 7) return 'bg-yellow-500';
    if (count <= 15) return 'bg-orange-500';
    return 'bg-red-500';
  };


  // Tab değiştiğinde URL'yi güncelle
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'home') {
      navigate('/');
    } else {
      navigate(`/${tabId}`);
    }
  };

  // URL değişikliklerini dinle
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') {
      setActiveTab('home');
    } else {
      setActiveTab(path.substring(1));
    }
  }, [location]);

  // Kullanıcı rolünü al
  useEffect(() => {
    const fetchUserRoleAndDetails = async () => {
      if (isAuthenticated && user) {
        try {
          const role = await getUserRole(user.id);
          setUserRole(role);

          const userDetailsResult = await getUserDetails(user.id, user.email);
          if (userDetailsResult.success && userDetailsResult.data) {
            setUserDetails(userDetailsResult.data);
          } else {
            // Eğer veritabanında bulunamazsa, user metadata'sını kullan
            setUserDetails({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Kullanıcı',
              role: role,
              is_active: true
            });
          }
        } catch (error) {
          console.error('❌ User role or details fetch error:', error);
          setUserRole('user');
        } finally {
          setUserRoleLoading(false);
        }
      } else if (!isAuthenticated && !loading) {
        setUserRole('user');
        setUserDetails(null);
        setUserRoleLoading(false);
      }
    };

    fetchUserRoleAndDetails();
  }, [user, isAuthenticated, loading]);

  // Notification gösterme fonksiyonu
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 7000); // 7 saniye göster
  };

  // Okunmamış bildirim sayısını yükle
  useEffect(() => {
    const loadUnreadCount = async () => {
      if (user) {
        try {
          const result = await getUnreadNotificationCount(user.id);
          if (result.success) {
            const newCount = result.count;
            const oldCount = unreadNotificationCount;
            setUnreadNotificationCount(newCount);
          }
        } catch (error) {
          // Hata durumunda sessizce devam et
        }
      }
    };

    loadUnreadCount();

    // Her 3 saniyede bir güncelle (daha sık)
    const interval = setInterval(loadUnreadCount, 3000);
    return () => clearInterval(interval);
  }, [user]);

  // Bekleyen onaylar için bildirim kontrolü (admin/yönetici kullanıcılar için)
  useEffect(() => {
    const checkPendingApprovals = async () => {
      if (user && (userRole === 'admin' || userRole === 'yönetici')) {
        try {
          // Bekleyen onaylar için bildirim oluştur
          await createPendingApprovalNotification();
        } catch (error) {
          // Hata durumunda sessizce devam et
        }
      }
    };

    // Sadece kullanıcı rolü yüklendikten sonra kontrol et
    if (!userRoleLoading && userRole) {
      checkPendingApprovals();
    }
  }, [user, userRole, userRoleLoading]);

  // Bildirim sayısı değişikliğini izle
  useEffect(() => {
    if (unreadNotificationCount > lastNotificationCount && lastNotificationCount > 0) {
      const increase = unreadNotificationCount - lastNotificationCount;
      setNotificationMessage(`${increase} yeni bildirim geldi!`);
      setShowSimpleNotification(true);

    }
    setLastNotificationCount(unreadNotificationCount);
  }, [unreadNotificationCount, lastNotificationCount]);

  // Okunmamış mesaj sayısını yükle
  useEffect(() => {
    const loadUnreadMessageCount = async () => {
      if (user?.id) {
        try {
          const { data: conversations, error } = await supabase
            .from('conversations')
            .select(`
              id,
              chat_participants!inner(user_id),
              messages!inner(
                id,
                sender_id,
                is_read
              )
            `)
            .eq('chat_participants.user_id', user.id);

          if (!error && conversations) {
            let totalUnread = 0;
            for (const conversation of conversations) {
              const unreadMessages = conversation.messages?.filter(msg =>
                msg.sender_id !== user.id && !msg.is_read
              ) || [];
              totalUnread += unreadMessages.length;
            }
            setUnreadMessageCount(totalUnread);
          }
        } catch (error) {
          console.error('❌ Unread message count error:', error);
        }
      }
    };

    // Hemen yükle
    loadUnreadMessageCount();

    // 5 saniyede bir güncelle (daha sık)
    const interval = setInterval(loadUnreadMessageCount, 5000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Veritabanından veri yükleme fonksiyonu
  const loadData = async () => {
    try {


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

    } catch (error) {

      showNotification('Veri yükleme hatası!', 'error');
    }
  };

  // İlk yükleme
  useEffect(() => {
    if (isAuthenticated && user) {
      // Temel verileri yükle
      loadData();
      loadDailyNotes();
      loadCurrentShiftData();
    }
  }, [isAuthenticated, user]);


  // Periyodik olarak güncel vardiya verilerini yenile (her 2 dakikada bir)
  useEffect(() => {
    if (isAuthenticated && user) {
      const interval = setInterval(loadCurrentShiftData, 120000); // 2 dakika
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  // Periyodik olarak tüm verileri yenile (her 5 dakikada bir)
  useEffect(() => {
    if (isAuthenticated && user) {
      const interval = setInterval(async () => {
        try {
          await loadData();
          await loadDailyNotes();
        } catch (error) {
          console.error('❌ Periyodik veri yenileme hatası:', error);
        }
      }, 300000); // 5 dakika
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  // Sayfa görünürlük kontrolü - kullanıcı sekmeye geri döndüğünde veri yenile
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && isAuthenticated && user) {
        // Kullanıcı sekmeye geri döndü, verileri yenile
        try {
          await loadData();
          await loadDailyNotes();
          await loadCurrentShiftData();
        } catch (error) {
          console.error('❌ Sayfa görünürlük veri yenileme hatası:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, user]);

  // Veri yenileme fonksiyonu - Cache temizleme ile
  const refreshData = async () => {
    try {
      // Cache temizleme
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // localStorage temizleme (performans verileri hariç)
      const keysToKeep = ['performanceSummary', 'userPreferences'];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      
      // Verileri yeniden yükle
      await loadData();
      await loadDailyNotes();
      await loadCurrentShiftData();
      
      // Sayfayı yenile (cache bypass için)
      window.location.reload();
      
      showNotification('Veriler yenilendi ve cache temizlendi!', 'success');
    } catch (error) {
      console.error('❌ Veri yenileme hatası:', error);
      showNotification('Veri yenileme sırasında hata oluştu!', 'error');
    }
  };

  // Güncel vardiya verilerini yükle
  const loadCurrentShiftData = async () => {
    try {

      // En güncel dönemi bul
      const { data: periods, error: periodsError } = await supabase
        .from('weekly_periods')
        .select('*')
        .order('start_date', { ascending: false })
        .limit(1);

      if (periodsError) {
        return;
      }

      if (periods && periods.length > 0) {
        const latestPeriod = periods[0];

        // Bu dönemdeki tüm vardiya verilerini getir
        const { data: shifts, error: shiftsError } = await supabase
          .from('weekly_schedules')
          .select('*')
          .eq('period_id', latestPeriod.id)
          .order('employee_code', { ascending: true });

        if (shiftsError) {
          console.error('❌ Güncel vardiya verileri getirilemedi:', shiftsError);
          return;
        }

        if (shifts && shifts.length > 0) {
          // Personel listesini getir
          const employeeCodes = shifts.map(s => s.employee_code);

          const { data: personnel, error: personnelError } = await supabase
            .from('personnel')
            .select('employee_code, full_name, position')
            .in('employee_code', employeeCodes);

          if (personnelError) {
            console.error('❌ Personel verileri getirilemedi:', personnelError);
            return;
          }

          // Personel bilgilerini birleştir
          const personnelMap = {};
          personnel.forEach(p => {
            personnelMap[p.employee_code] = p;
          });

          const enrichedShifts = shifts.map(shift => {
            const person = personnelMap[shift.employee_code];
            return {
              ...shift,
              full_name: person?.full_name || 'Bilinmeyen',
              position: person?.position || 'Belirtilmemiş'
            };
          });

          setCurrentShiftData(enrichedShifts);
        } else {
          setCurrentShiftData([]);
        }
      } else {
        setCurrentShiftData([]);
      }
    } catch (error) {
      console.error('❌ Güncel vardiya verileri yükleme hatası:', error);
      setCurrentShiftData([]);
    }
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
      // Çıkış yaptıktan sonra ana sayfaya yönlendir
      navigate('/');
      setActiveTab('home');
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
    { id: 'store-difficulty', label: 'Mağaza Zorluk Yönetimi', icon: AlertCircle },
    { id: 'personnel', label: 'Personel Listesi', icon: Users },
    { id: 'vardiya-kontrol', label: 'Personel Kontrol', icon: Clock },
    { id: 'performance', label: 'Performans Analizi', icon: BarChart3 },
    { id: 'planning', label: 'Vardiya Planlama', icon: Calendar },
    { id: 'akilli-dagitim', label: 'Akıllı Dağıtım', icon: Users },
    { id: 'statistics', label: 'İstatistikler', icon: BarChart3 }
  ];

  return (
    <div className="app-container h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-slate-100 overflow-hidden">
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
        <div className="sidebar-container w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 backdrop-blur-md border-r border-slate-700/50 shadow-2xl flex flex-col h-screen relative z-20 pointer-events-auto">
          {/* Modern Sidebar Header */}
          <div className="p-4 border-b border-slate-700/50 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Personel Takip</h1>
                  <p className="text-xs text-slate-300">Modern İş Yönetimi</p>
                </div>
              </div>
              <button
                onClick={() => setShowRulesModal(true)}
                className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-all duration-300"
                title="Sistem Kuralları"
              >
                <Shield className="w-4 h-4 text-blue-400" />
              </button>
            </div>
            
            {/* Version Info */}
            <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-slate-300">{getVersionInfo().version}</span>
                </div>
                <span className="text-xs text-slate-400">{getVersionInfo().lastUpdate}</span>
              </div>
            </div>
          </div>

          {/* Modern Navigation */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1 sidebar-scroll">
            {/* Ana Sayfa */}
            <button
              onClick={() => handleTabChange('home')}
              className={`
                w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                ${activeTab === 'home'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }
              `}
            >
              <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                activeTab === 'home' 
                  ? 'bg-white/20' 
                  : 'bg-slate-700/50 group-hover:bg-slate-600/50'
              }`}>
                <Home className={`w-3 h-3 ${activeTab === 'home' ? 'text-white' : 'text-slate-400'}`} />
              </div>
              <span className="flex-1 text-left">Ana Sayfa</span>
              {activeTab === 'home' && (
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
              )}
            </button>

            {/* İstatistikler */}
            <button
              onClick={() => handleTabChange('statistics')}
              className={`
                w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                ${activeTab === 'statistics'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }
              `}
            >
              <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                activeTab === 'statistics' 
                  ? 'bg-white/20' 
                  : 'bg-slate-700/50 group-hover:bg-slate-600/50'
              }`}>
                <BarChart3 className={`w-3 h-3 ${activeTab === 'statistics' ? 'text-white' : 'text-slate-400'}`} />
              </div>
              <span className="flex-1 text-left">İstatistikler</span>
              {activeTab === 'statistics' && (
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
              )}
            </button>

            {/* Chat */}
            <button
              onClick={() => handleTabChange('chat')}
              className={`
                w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                ${activeTab === 'chat'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }
              `}
            >
              <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                activeTab === 'chat' 
                  ? 'bg-white/20' 
                  : 'bg-slate-700/50 group-hover:bg-slate-600/50'
              }`}>
                <MessageCircle className={`w-3 h-3 ${activeTab === 'chat' ? 'text-white' : 'text-slate-400'}`} />
              </div>
              <span className="flex-1 text-left">Mesajlar</span>
              {unreadMessageCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                  {unreadMessageCount}
                </span>
              )}
              {activeTab === 'chat' && (
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
              )}
            </button>



            {/* Personel Yönetimi Grubu */}
            <div className="space-y-1 mt-4">
              <div className="flex items-center px-2 py-1">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
                <span className="px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Personel Yönetimi</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
              </div>

              <button
                onClick={() => handleTabChange('vardiya-kontrol')}
                className={`
                  w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'vardiya-kontrol'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }
                `}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'vardiya-kontrol' 
                    ? 'bg-white/20' 
                    : 'bg-slate-700/50 group-hover:bg-slate-600/50'
                }`}>
                  <Clock className={`w-3 h-3 ${activeTab === 'vardiya-kontrol' ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <span className="flex-1 text-left">Personel Kontrol</span>
                {activeTab === 'vardiya-kontrol' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>

              <button
                onClick={() => handleTabChange('performance')}
                className={`
                  w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'performance'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }
                `}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'performance' 
                    ? 'bg-white/20' 
                    : 'bg-slate-700/50 group-hover:bg-slate-600/50'
                }`}>
                  <BarChart3 className={`w-3 h-3 ${activeTab === 'performance' ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <span className="flex-1 text-left">Performans Analizi</span>
                {activeTab === 'performance' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>

              <button
                onClick={() => handleTabChange('store-distribution')}
                className={`
                  w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'store-distribution'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }
                `}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'store-distribution' 
                    ? 'bg-white/20' 
                    : 'bg-slate-700/50 group-hover:bg-slate-600/50'
                }`}>
                  <MapPin className={`w-3 h-3 ${activeTab === 'store-distribution' ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <span className="flex-1 text-left">Personel Konum Dağılımı</span>
                {activeTab === 'store-distribution' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>

              <button
                onClick={() => handleTabChange('vehicle-distribution')}
                className={`
                  w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'vehicle-distribution'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }
                `}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'vehicle-distribution' 
                    ? 'bg-white/20' 
                    : 'bg-slate-700/50 group-hover:bg-slate-600/50'
                }`}>
                  <Car className={`w-3 h-3 ${activeTab === 'vehicle-distribution' ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <span className="flex-1 text-left">Personel Araç Dağılımı</span>
                {activeTab === 'vehicle-distribution' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>

              <button
                onClick={() => handleTabChange('personnel')}
                className={`
                  w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'personnel'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }
                `}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'personnel' 
                    ? 'bg-white/20' 
                    : 'bg-slate-700/50 group-hover:bg-slate-600/50'
                }`}>
                  <Users className={`w-3 h-3 ${activeTab === 'personnel' ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <span className="flex-1 text-left">Personel Listesi</span>
                {activeTab === 'personnel' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>
            </div>

            {/* Mağaza Yönetimi Grubu */}
            <div className="space-y-1 mt-4">
              <div className="flex items-center px-2 py-1">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
                <span className="px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Mağaza Yönetimi</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
              </div>

              <button
                onClick={() => handleTabChange('stores')}
                className={`
                  w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'stores'
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }
                `}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'stores' 
                    ? 'bg-white/20' 
                    : 'bg-slate-700/50 group-hover:bg-slate-600/50'
                }`}>
                  <Store className={`w-3 h-3 ${activeTab === 'stores' ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <span className="flex-1 text-left">Mağaza Listesi</span>
                {activeTab === 'stores' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>

              <button
                onClick={() => handleTabChange('store-distance')}
                className={`
                  w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'store-distance'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }
                `}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'store-distance' 
                    ? 'bg-white/20' 
                    : 'bg-slate-700/50 group-hover:bg-slate-600/50'
                }`}>
                  <MapPin className={`w-3 h-3 ${activeTab === 'store-distance' ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <span className="flex-1 text-left">Mağaza Uzaklık Ölçer</span>
                {activeTab === 'store-distance' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>

              <button
                onClick={() => handleTabChange('store-difficulty')}
                className={`
                  w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'store-difficulty'
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }
                `}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'store-difficulty' 
                    ? 'bg-white/20' 
                    : 'bg-slate-700/50 group-hover:bg-slate-600/50'
                }`}>
                  <AlertCircle className={`w-3 h-3 ${activeTab === 'store-difficulty' ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <span className="flex-1 text-left">Mağaza Zorluk Yönetimi</span>
                {activeTab === 'store-difficulty' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>
            </div>

            {/* Aktarma Depo Grubu */}
            <div className="space-y-1 mt-4">
              <div className="flex items-center px-2 py-1">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
                <span className="px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Aktarma Depo</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
              </div>


              <button
                onClick={() => handleTabChange('aktarma-personel-list')}
                className={`
                  w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'aktarma-personel-list'
                    ? 'bg-gradient-to-r from-gray-500 to-slate-600 text-white shadow-lg shadow-gray-500/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }
                `}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'aktarma-personel-list' 
                    ? 'bg-white/20' 
                    : 'bg-slate-700/50 group-hover:bg-slate-600/50'
                }`}>
                  <Users className={`w-3 h-3 ${activeTab === 'aktarma-personel-list' ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <span className="flex-1 text-left">Aktarma Depo Personel Kontrol</span>
                {activeTab === 'aktarma-personel-list' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>

              <button
                onClick={() => handleTabChange('aktarma-dagitim-analizi')}
                className={`
                  w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'aktarma-dagitim-analizi'
                    ? 'bg-gradient-to-r from-gray-500 to-slate-600 text-white shadow-lg shadow-gray-500/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }
                `}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'aktarma-dagitim-analizi' 
                    ? 'bg-white/20' 
                    : 'bg-slate-700/50 group-hover:bg-slate-600/50'
                }`}>
                  <BarChart3 className={`w-3 h-3 ${activeTab === 'aktarma-dagitim-analizi' ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <span className="flex-1 text-left">Aktarma Dağıtım Analizi</span>
                {activeTab === 'aktarma-dagitim-analizi' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>
            </div>

            {/* Araç Yönetimi Grubu */}
            <div className="space-y-1 mt-4">
              <div className="flex items-center px-2 py-1">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
                <span className="px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Araç Yönetimi</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
              </div>

              <button
                onClick={() => handleTabChange('vehicles')}
                className={`
                  w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'vehicles'
                    ? 'bg-gradient-to-r from-gray-500 to-slate-600 text-white shadow-lg shadow-gray-500/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }
                `}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'vehicles' 
                    ? 'bg-white/20' 
                    : 'bg-slate-700/50 group-hover:bg-slate-600/50'
                }`}>
                  <Car className={`w-3 h-3 ${activeTab === 'vehicles' ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <span className="flex-1 text-left">Araç Listesi</span>
                {activeTab === 'vehicles' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>
            </div>

            {/* TUZLA EKİP BİLGİLERİ Grubu */}
            <div className="space-y-1 mt-4">
              <div className="flex items-center px-2 py-1">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
                <span className="px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tuzla Ekip Bilgileri</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
              </div>

              <button
                onClick={() => handleTabChange('team-shifts')}
                className={`
                  w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'team-shifts'
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }
                `}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'team-shifts' 
                    ? 'bg-white/20' 
                    : 'bg-slate-700/50 group-hover:bg-slate-600/50'
                }`}>
                  <Clock className={`w-3 h-3 ${activeTab === 'team-shifts' ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <span className="flex-1 text-left">Ekip Vardiyaları</span>
                {activeTab === 'team-shifts' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>

              <button
                onClick={() => handleTabChange('team-personnel')}
                className={`
                  w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'team-personnel'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }
                `}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'team-personnel' 
                    ? 'bg-white/20' 
                    : 'bg-slate-700/50 group-hover:bg-slate-600/50'
                }`}>
                  <Users className={`w-3 h-3 ${activeTab === 'team-personnel' ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <span className="flex-1 text-left">Ekip Personel Bilgileri</span>
                {activeTab === 'team-personnel' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>

            </div>

            {/* PUANTAJ TAKİP Grubu */}
            <div className="space-y-1 mt-4">
              <div className="flex items-center px-2 py-1">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
                <span className="px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Puantaj Takip</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
              </div>

              <button
                onClick={() => handleTabChange('puantaj-takip')}
                className={`
                  w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'puantaj-takip'
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }
                `}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'puantaj-takip' 
                    ? 'bg-white/20' 
                    : 'bg-slate-700/50 group-hover:bg-slate-600/50'
                }`}>
                  <FileExcelOutlined className={`w-3 h-3 ${activeTab === 'puantaj-takip' ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <span className="flex-1 text-left">Puantaj Takip</span>
                {activeTab === 'puantaj-takip' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>

              <button
                onClick={() => handleTabChange('puantaj-takvim')}
                className={`
                  w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'puantaj-takvim'
                    ? 'bg-gradient-to-r from-lime-500 to-green-600 text-white shadow-lg shadow-lime-500/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }
                `}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'puantaj-takvim' 
                    ? 'bg-white/20' 
                    : 'bg-slate-700/50 group-hover:bg-slate-600/50'
                }`}>
                  <Package className={`w-3 h-3 ${activeTab === 'puantaj-takvim' ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <span className="flex-1 text-left">Puantaj Takvim</span>
                {activeTab === 'puantaj-takvim' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>

            </div>

            {/* Vardiya Planlama Grubu */}
            <div className="space-y-1 mt-4">
              <div className="flex items-center px-2 py-1">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
                <span className="px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Vardiya Planlama</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
              </div>

              <button
                onClick={() => handleTabChange('planning')}
                className={`
                  w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'planning'
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }
                `}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'planning' 
                    ? 'bg-white/20' 
                    : 'bg-slate-700/50 group-hover:bg-slate-600/50'
                }`}>
                  <Calendar className={`w-3 h-3 ${activeTab === 'planning' ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <span className="flex-1 text-left">Vardiya Planlama</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                  Geliştirme
                </span>
                {activeTab === 'planning' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>



              <button
                onClick={() => handleTabChange('akilli-dagitim')}
                className={`
                  w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'akilli-dagitim'
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg shadow-yellow-500/25'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }
                `}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'akilli-dagitim' 
                    ? 'bg-white/20' 
                    : 'bg-slate-700/50 group-hover:bg-slate-600/50'
                }`}>
                  <Users className={`w-3 h-3 ${activeTab === 'akilli-dagitim' ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <span className="flex-1 text-left">Akıllı Dağıtım</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Geliştirme
                </span>
                {activeTab === 'akilli-dagitim' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>

            </div>
          </nav>

          {/* Modern Sidebar Footer */}
          <div className="p-3 border-t border-slate-700/50 space-y-2 flex-shrink-0">
            {/* User Profile */}
            <div className="flex items-center p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-all duration-300 group">
              <div className="relative">
                <div className={`w-8 h-8 bg-gradient-to-r ${
                  userRole === 'admin' ? 'from-red-500 to-pink-500' : 
                  userRole === 'yönetici' ? 'from-purple-500 to-indigo-500' : 
                  'from-blue-500 to-cyan-500'
                } rounded-lg flex items-center justify-center shadow-lg`}>
                  <span className="text-white font-bold text-sm">
                    {(userDetails?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border border-slate-800 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              </div>
              
              <div className="flex-1 ml-2 min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {userDetails?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Kullanıcı'}
                </p>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-300">
                    {userRole === 'admin' ? 'Admin' : userRole === 'yönetici' ? 'Yönetici' : 'Kullanıcı'}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    userRole === 'admin' ? 'bg-red-500/20 text-red-300' : 
                    userRole === 'yönetici' ? 'bg-purple-500/20 text-purple-300' : 
                    'bg-blue-500/20 text-blue-300'
                  }`}>
                    {userRole === 'admin' ? 'Yönetici' : userRole === 'yönetici' ? 'Moderatör' : 'Üye'}
                  </span>
                </div>
              </div>
            </div>

            {/* Notification Button */}
            <button
              onClick={() => setShowNotificationPanel(true)}
              className={`w-full flex items-center justify-between p-2 rounded-lg transition-all duration-300 ${
                unreadNotificationCount > 0
                  ? 'bg-green-500/20 hover:bg-green-500/30 border border-green-500/30'
                  : 'bg-slate-800/50 hover:bg-slate-700/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                  unreadNotificationCount > 0 ? 'bg-green-500/20' : 'bg-slate-700/50'
                }`}>
                  <Bell className={`w-3 h-3 ${unreadNotificationCount > 0 ? 'text-green-400' : 'text-slate-400'}`} />
                </div>
                <span className="text-xs font-medium text-slate-300">Bildirimler</span>
              </div>
              {unreadNotificationCount > 0 && (
                <span className="px-1.5 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full animate-pulse">
                  {unreadNotificationCount}
                </span>
              )}
            </button>

            {/* Admin Panel Button */}
            {(userRole === 'admin' || userRole === 'yönetici') && (
              <button
                onClick={() => handleTabChange('admin')}
                className="w-full flex items-center gap-2 p-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-green-500/25 group"
              >
                <div className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Shield className="w-3 h-3" />
                </div>
                <span className="flex-1 text-xs font-medium">Admin Panel</span>
                {pendingApprovalCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-white/20 text-white text-xs font-bold rounded-full">
                    {pendingApprovalCount}
                  </span>
                )}
              </button>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 p-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:from-red-600 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-red-500/25 group"
            >
              <div className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center group-hover:scale-110 transition-transform">
                <LogOut className="w-3 h-3" />
              </div>
              <span className="flex-1 text-xs font-medium">Çıkış Yap</span>
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
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowRulesModal(true)}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                  title="Sistem Kuralları"
                >
                  <Shield className="w-5 h-5 text-blue-600" />
                </button>
                <button
                  onClick={() => setShowNotificationPanel(true)}
                  className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  {unreadNotificationCount > 0 && (
                    <span className={`absolute -top-1 -right-1 ${getNotificationColor(unreadNotificationCount)} text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center shadow-lg border-2 border-white animate-pulse`}>
                      {unreadNotificationCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </header>

          {/* Mobile Menu Overlay */}
          {mobileMenuOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
              <div className="absolute left-0 top-0 h-full w-80 bg-white shadow-2xl flex flex-col">
                <div className="p-6 border-b border-gray-200/50 flex-shrink-0">
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

                <div className="flex-1 overflow-y-auto p-4 space-y-2 sidebar-scroll">
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

                  {/* Mesajlar */}
                  <button
                    onClick={() => {
                      handleTabChange('chat');
                      setMobileMenuOpen(false);
                    }}
                    className={`
                      w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative
                      ${activeTab === 'chat'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <MessageCircle className="w-5 h-5 mr-3" />
                    Mesajlar
                    {unreadMessageCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] h-5 flex items-center justify-center shadow-lg border-2 border-white animate-pulse">
                        {unreadMessageCount}
                      </span>
                    )}
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

                    <button
                      onClick={() => {
                        handleTabChange('store-difficulty');
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                        ${activeTab === 'store-difficulty'
                          ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <AlertCircle className="w-5 h-5 mr-3" />
                      Mağaza Zorluk Yönetimi
                    </button>
                  </div>

                  {/* TUZLA EKİP BİLGİLERİ Grubu */}
                  <div className="space-y-2">
                    <div className="flex items-center px-4 py-2">
                      <div className="flex-1 h-px bg-gray-300"></div>
                      <span className="px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">TUZLA EKİP BİLGİLERİ</span>
                      <div className="flex-1 h-px bg-gray-300"></div>
                    </div>

                    <button
                      onClick={() => {
                        handleTabChange('team-shifts');
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                        ${activeTab === 'team-shifts'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Clock className="w-5 h-5 mr-3" />
                      Ekip Vardiyaları

                    </button>

                    <button
                      onClick={() => {
                        handleTabChange('team-personnel');
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                        ${activeTab === 'team-personnel'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Users className="w-5 h-5 mr-3" />
                      Ekip Personel Bilgileri
                    </button>

                  </div>

                  {/* PUANTAJ TAKİP Grubu */}
                  <div className="space-y-2">
                    <div className="flex items-center px-4 py-2">
                      <div className="flex-1 h-px bg-gray-300"></div>
                      <span className="px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">PUANTAJ TAKİP</span>
                      <div className="flex-1 h-px bg-gray-300"></div>
                    </div>

                    <button
                      onClick={() => {
                        handleTabChange('puantaj-takvim');
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                        ${activeTab === 'puantaj-takvim'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Package className="w-5 h-5 mr-3" />
                      Puantaj Takvim
                    </button>

                    <button
                      onClick={() => {
                        handleTabChange('puantaj-takip');
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                        ${activeTab === 'puantaj-takip'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <FileExcelOutlined className="w-5 h-5 mr-3" />
                      Puantaj Takip
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
                      <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                        <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-1 animate-pulse"></div>
                        Geliştirme
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        handleTabChange('statistics');
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                        ${activeTab === 'statistics'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <BarChart3 className="w-5 h-5 mr-3" />
                      İstatistikler
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
          <main className="main-content flex-1 overflow-auto p-8">
            {/* Ana Sayfa Dashboard */}
            {activeTab === 'home' && (
              <div className="space-y-8">
                {/* Ultra Modern Hero Section */}
                <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-blue-800 to-purple-900 rounded-3xl p-8 text-white shadow-2xl border border-white/10">
                  {/* Advanced Animated Background Elements */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-tr from-purple-400/30 to-pink-500/30 rounded-full blur-2xl animate-bounce"></div>
                    <div className="absolute top-1/3 left-1/3 w-48 h-48 bg-gradient-to-r from-cyan-400/25 to-blue-500/25 rounded-full blur-xl animate-spin"></div>
                    <div className="absolute top-2/3 right-1/4 w-32 h-32 bg-gradient-to-l from-pink-400/20 to-rose-500/20 rounded-full blur-lg animate-pulse"></div>
                  </div>

                  {/* Floating Particles */}
                  <div className="absolute inset-0">
                    <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/60 rounded-full animate-ping"></div>
                    <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-blue-300/80 rounded-full animate-pulse"></div>
                    <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-purple-300/70 rounded-full animate-bounce"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-1 h-1 bg-pink-300/90 rounded-full animate-ping"></div>
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                      <div className="max-w-2xl">
                        <div className="mb-4">
                          <span className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium mb-4 animate-fade-in">
                            <Clock className="w-4 h-4 mr-2" />
                            {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} • {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-bold mb-6 animate-fade-in-up">
                          Hoş Geldin{' '}
                          <span className="bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent animate-gradient">
                            {userDetails?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Kullanıcı'}
                          </span>
                          !
                        </h1>
                        
                      </div>
                      <div className="hidden lg:block">
                        <div className="w-32 h-32 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-lg rounded-full flex items-center justify-center border border-white/20 animate-float">
                          <Sparkles className="w-16 h-16 text-white animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>



                {/* Modern Dashboard Cards */}
                <div className="grid grid-cols-1 gap-6">
                  {/* Ultra Modern Quick Actions - Full Width */}
                  <div className="relative bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-600"></div>
                    </div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl flex items-center justify-center shadow-xl">
                            <Sparkles className="w-7 h-7 text-white" />
                          </div>
                          <div>
                            <h3 className="text-3xl font-bold text-gray-900">Hızlı İşlemler</h3>
                            <p className="text-base text-gray-600">En sık kullanılan özellikler</p>
                          </div>
                        </div>
                       
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Modern Personnel Button */}
                        <button
                          onClick={() => handleTabChange('personnel')}
                          className="group relative bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-3xl p-8 text-center transition-all duration-500 hover:scale-105 hover:shadow-xl border border-blue-200/50 overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-500"></div>
                          <div className="relative z-10">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <Users className="w-8 h-8 text-white" />
                            </div>
                            <p className="text-lg font-semibold text-gray-900">Personel</p>
                            <p className="text-sm text-blue-600 mt-2">Yönetim Paneli</p>
                          </div>
                        </button>

                        {/* Modern Stores Button */}
                        <button
                          onClick={() => handleTabChange('stores')}
                          className="group relative bg-gradient-to-br from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 rounded-3xl p-8 text-center transition-all duration-500 hover:scale-105 hover:shadow-xl border border-emerald-200/50 overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-500"></div>
                          <div className="relative z-10">
                            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <Store className="w-8 h-8 text-white" />
                            </div>
                            <p className="text-lg font-semibold text-gray-900">Mağaza Listesi</p>
                            <p className="text-sm text-emerald-600 mt-2">Lokasyon Yönetimi</p>
                          </div>
                        </button>

                        {/* Modern Personnel Control Button */}
                        <button
                          onClick={() => handleTabChange('vardiya-kontrol')}
                          className="group relative bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-3xl p-8 text-center transition-all duration-500 hover:scale-105 hover:shadow-xl border border-purple-200/50 overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-500"></div>
                          <div className="relative z-10">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <Shield className="w-8 h-8 text-white" />
                            </div>
                            <p className="text-lg font-semibold text-gray-900">Personel Kontrol</p>
                            <p className="text-sm text-purple-600 mt-2">Vardiya Takibi</p>
                          </div>
                        </button>

                        {/* Modern Location Distribution Button */}
                        <button
                          onClick={() => handleTabChange('store-distribution')}
                          className="group relative bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-3xl p-8 text-center transition-all duration-500 hover:scale-105 hover:shadow-xl border border-orange-200/50 overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-500"></div>
                          <div className="relative z-10">
                            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <MapPin className="w-8 h-8 text-white" />
                            </div>
                            <p className="text-lg font-semibold text-gray-900">Konum Dağılımı</p>
                            <p className="text-sm text-orange-600 mt-2">Harita Görünümü</p>
                          </div>
                        </button>

                        {/* Modern Statistics Button */}
                        <button
                          onClick={() => handleTabChange('statistics')}
                          className="group relative bg-gradient-to-br from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 rounded-3xl p-8 text-center transition-all duration-500 hover:scale-105 hover:shadow-xl border border-indigo-200/50 overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/10 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-500"></div>
                          <div className="relative z-10">
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <BarChart3 className="w-8 h-8 text-white" />
                            </div>
                            <p className="text-lg font-semibold text-gray-900">İstatistikler</p>
                            <p className="text-sm text-indigo-600 mt-2">Analiz Raporları</p>
                          </div>
                        </button>

                        {/* Modern Vehicle Distribution Button */}
                        <button
                          onClick={() => handleTabChange('vehicle-distribution')}
                          className="group relative bg-gradient-to-br from-teal-50 to-teal-100 hover:from-teal-100 hover:to-teal-200 rounded-3xl p-8 text-center transition-all duration-500 hover:scale-105 hover:shadow-xl border border-teal-200/50 overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-20 h-20 bg-teal-500/10 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-500"></div>
                          <div className="relative z-10">
                            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <Truck className="w-8 h-8 text-white" />
                            </div>
                            <p className="text-lg font-semibold text-gray-900">Araç Dağılımı</p>
                            <p className="text-sm text-teal-600 mt-2">Filo Yönetimi</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity & Calendar */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Ultra Modern Activity Timeline */}
                  <div className="relative bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600"></div>
                    </div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <Clock className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">Son Aktiviteler</h3>
                          <p className="text-sm text-gray-600">Güncel personel durumları</p>
                        </div>
                      </div>

                      {dataStatus.dailyNotes.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Clock className="w-10 h-10 text-gray-400" />
                          </div>
                          <h4 className="text-lg font-semibold text-gray-600 mb-2">Henüz aktivite bulunmuyor</h4>
                          <p className="text-sm text-gray-500">Personel aktiviteleri burada görünecek</p>
                        </div>
                      ) : (
                        <div className="relative">
                          {/* Modern Timeline Line */}
                          <div className="absolute left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-green-400 via-blue-400 to-purple-400 rounded-full"></div>
                          
                          <div className="space-y-6">
                            {dataStatus.dailyNotes.slice(0, 5).map((note, index) => {
                              const statusConfig = {
                                'raporlu': { 
                                  color: 'red', 
                                  bg: 'from-red-50 to-red-100', 
                                  border: 'border-red-200/50',
                                  icon: '🚫',
                                  label: 'Raporlu'
                                },
                                'dinlenme': { 
                                  color: 'green', 
                                  bg: 'from-green-50 to-green-100', 
                                  border: 'border-green-200/50',
                                  icon: '😴',
                                  label: 'Dinlenme'
                                },
                                'izinli': { 
                                  color: 'purple', 
                                  bg: 'from-purple-50 to-purple-100', 
                                  border: 'border-purple-200/50',
                                  icon: '🏖️',
                                  label: 'İzinli'
                                },
                                'hastalık': { 
                                  color: 'orange', 
                                  bg: 'from-orange-50 to-orange-100', 
                                  border: 'border-orange-200/50',
                                  icon: '🤒',
                                  label: 'Hastalık'
                                }
                              };
                              
                              const config = statusConfig[note.status] || { 
                                color: 'blue', 
                                bg: 'from-blue-50 to-blue-100', 
                                border: 'border-blue-200/50',
                                icon: '👤',
                                label: 'Aktif'
                              };

                              return (
                                <div key={index} className="relative pl-16 group">
                                  {/* Modern Timeline Dot */}
                                  <div className={`absolute left-4 top-4 w-4 h-4 rounded-full bg-${config.color}-500 ring-4 ring-${config.color}-100 shadow-lg group-hover:scale-125 transition-transform duration-300`}></div>
                                  
                                  {/* Modern Activity Card */}
                                  <div className={`relative bg-gradient-to-br ${config.bg} rounded-2xl p-4 border ${config.border} hover:shadow-lg transition-all duration-300 group-hover:scale-105 overflow-hidden`}>
                                    {/* Card Background Pattern */}
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/20 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-500"></div>
                                    
                                    <div className="relative z-10">
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                          <span className="text-lg">{config.icon}</span>
                                          <p className="text-sm font-semibold text-gray-900 truncate">{note.full_name}</p>
                                        </div>
                                        <span className="text-xs text-gray-500 bg-white/50 px-2 py-1 rounded-lg">
                                          {new Date(note.date).toLocaleDateString('tr-TR')}
                                        </span>
                                      </div>
                                      
                                      <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-700 border border-${config.color}-200`}>
                                          <div className={`w-2 h-2 bg-${config.color}-500 rounded-full mr-2`}></div>
                                          {config.label}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ultra Modern Calendar */}
                  <div className="relative bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600"></div>
                    </div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Calendar className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-gray-900">Aylık Takip</h3>
                            <p className="text-sm text-gray-600">Personel aktivite takvimi</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const newMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
                              const newYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
                              handleMonthChange(newMonth, newYear);
                            }}
                            className="p-3 rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all duration-300 shadow-lg hover:shadow-xl group"
                          >
                            <ChevronDown className="w-4 h-4 transform rotate-90 group-hover:scale-110 transition-transform" />
                          </button>
                          <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/50">
                            <span className="text-sm font-bold text-gray-900 min-w-[120px] text-center">
                              {getMonthName(selectedMonth)} {selectedYear}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              const newMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
                              const newYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
                              handleMonthChange(newMonth, newYear);
                            }}
                            className="p-3 rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all duration-300 shadow-lg hover:shadow-xl group"
                          >
                            <ChevronDown className="w-4 h-4 transform -rotate-90 group-hover:scale-110 transition-transform" />
                          </button>
                        </div>
                      </div>

                      {/* Ultra Modern Calendar Grid */}
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl overflow-hidden border border-gray-200/50 shadow-lg">
                        {/* Modern Day Headers */}
                        <div className="grid grid-cols-7 bg-gradient-to-r from-blue-600 to-indigo-600">
                          {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day, index) => (
                            <div key={day} className="p-3 text-center text-sm font-bold text-white border-r border-white/20 last:border-r-0">
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* Modern Calendar Days */}
                        <div className={`grid grid-cols-7 ${calendarAnimation === 'left' ? 'animate-slide-left' : calendarAnimation === 'right' ? 'animate-slide-right' : ''}`}>
                          {getCalendarDays().map((day, index) => (
                            <div
                              key={index}
                              className={`
                                p-3 border-r border-b border-gray-200/50 min-h-[100px] relative transition-all duration-300 hover:bg-white/50
                                ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50/50'}
                                ${day.isToday ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300/50' : ''}
                                ${isFutureDate(new Date(day.year, day.month, day.day)) ? 'opacity-60' : ''}
                              `}
                            >
                              <div className={`
                                text-sm font-bold mb-2 flex items-center justify-between
                                ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                                ${day.isToday ? 'text-blue-600' : ''}
                              `}>
                                <span>{day.day}</span>
                                {day.isToday && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                )}
                              </div>

                              {/* Modern Daily Notes */}
                              {(() => {
                                const dayNotes = dataStatus.dailyNotes.filter(note => {
                                  const noteDate = new Date(note.date);
                                  return noteDate.getDate() === day.day &&
                                    noteDate.getMonth() === day.month &&
                                    noteDate.getFullYear() === day.year;
                                });

                                if (dayNotes.length > 0) {
                                  const statusConfig = {
                                    'raporlu': { color: 'red', icon: '🚫' },
                                    'dinlenme': { color: 'green', icon: '😴' },
                                    'izinli': { color: 'purple', icon: '🏖️' },
                                    'hastalık': { color: 'orange', icon: '🤒' }
                                  };

                                  return (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1 mb-2">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                        <span className="text-xs font-bold text-gray-600">
                                          {dayNotes.length} aktivite
                                        </span>
                                      </div>
                                      
                                      <div className="space-y-1">
                                        {dayNotes.slice(0, 2).map((note, index) => {
                                          const config = statusConfig[note.status] || { color: 'blue', icon: '👤' };
                                          return (
                                            <div key={index} className={`text-xs px-2 py-1 rounded-lg bg-${config.color}-100 text-${config.color}-700 border border-${config.color}-200 truncate flex items-center gap-1`}>
                                              <span className="text-xs">{config.icon}</span>
                                              <span className="truncate">{note.full_name}</span>
                                            </div>
                                          );
                                        })}
                                        
                                        {dayNotes.length > 2 && (
                                          <div className="text-xs text-gray-500 bg-gray-100 rounded-lg px-2 py-1 text-center border border-gray-200">
                                            +{dayNotes.length - 2} daha
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
                </div>
              </div>
            )}


            {/* Aktarma Depo Personel Kontrol */}
            {activeTab === 'aktarma-personel-list' && (
              <TransferPersonnelList />
            )}

            {/* Aktarma Dağıtım Analizi */}
            {activeTab === 'aktarma-dagitim-analizi' && (
              <TransferDistributionAnalysis />
            )}

            {/* Araç Listesi */}
            {activeTab === 'vehicles' && (
              <VehicleList
                vehicleData={vehicleData}
                currentUser={user}
              />
            )}

            {/* Personel Listesi */}
            {activeTab === 'personnel' && (
              <PersonelList
                personnelData={personnelData}
                vehicleData={vehicleData}
                userRole={userRole}
                currentShiftData={currentShiftData}
                currentUser={user}
              />
            )}

            {/* Mağaza Listesi */}
            {activeTab === 'stores' && (
              <StoreList
                storeData={storeData}
                currentUser={user}
              />
            )}

            {/* Mağaza Uzaklık Ölçer */}
            {activeTab === 'store-distance' && (
              <StoreDistanceCalculator />
            )}

            {/* Mağaza Zorluk Yönetimi */}
            {activeTab === 'store-difficulty' && (
              <StoreDifficultyManager />
            )}



            {/* Vardiya Planlama */}
            {activeTab === 'planning' && (
              <VardiyaPlanlama
                userRole={userRole}
                onDataUpdate={refreshData}
              />
            )}



            {/* Akıllı Dağıtım */}
            {activeTab === 'akilli-dagitim' && (
              <AkilliDagitim
                userRole={userRole}
                onDataUpdate={refreshData}
              />
            )}

            {/* İstatistikler */}
            {activeTab === 'statistics' && (
              <Statistics />
            )}

            {/* Performans Analizi */}
            {activeTab === 'performance' && (
              <PerformanceAnalysis
                generatedPlan={generatedPlan}
                personnelData={personnelData}
                vehicleData={vehicleData}
                storeData={storeData}
                onNavigateToHome={() => handleTabChange('home')}
                currentUser={user}
              />
            )}

            {/* Vardiya Kontrol */}
            {activeTab === 'vardiya-kontrol' && (
              <PersonelVardiyaKontrol
                userRole={userRole}
                onDataUpdate={refreshData}
                onCurrentShiftDataUpdate={setCurrentShiftData}
                currentUser={user}
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

            {/* Ekip Vardiyaları */}
            {activeTab === 'team-shifts' && (
              <TeamShifts />
            )}
            {/* Puantaj Takip */}
            {activeTab === 'puantaj-takip' && (
              <PuantajTakip />
            )}
            {/* Puantaj Takvim */}
            {activeTab === 'puantaj-takvim' && (
              <PuantajTakvim />
            )}



            {/* Ekip Personel Bilgileri */}
            {activeTab === 'team-personnel' && (
              <TeamPersonnel />
            )}

            {/* Admin Panel */}
            {activeTab === 'admin' && (
              <>
                {loading ? (
                  <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Oturum bilgileri yükleniyor...</p>
                    </div>
                  </div>
                ) : !isAuthenticated ? (
                  <UnauthorizedAccess
                    userRole={userRole}
                    onNavigateHome={() => handleTabChange('home')}
                  />
                ) : userRoleLoading ? (
                  <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Kullanıcı yetkileri kontrol ediliyor...</p>
                    </div>
                  </div>
                ) : (userRole === 'admin' || userRole === 'yönetici') ? (
                  <div className="space-y-6">
                    <AdminPanel userRole={userRole} currentUser={user} />
                  </div>
                ) : (
                  <UnauthorizedAccess
                    userRole={userRole}
                    onNavigateHome={() => handleTabChange('home')}
                  />
                )}
              </>
            )}

            {/* Chat Sistemi */}
            {activeTab === 'chat' && (
              <div className="flex-1 h-full">
                <ChatSystem
                  currentUser={user}

                />
              </div>
            )}


          </main>
        </div>
      </div>

      {/* Bildirim Paneli */}
      <NotificationPanel
        currentUser={user}
        isOpen={showNotificationPanel}
        onClose={() => setShowNotificationPanel(false)}
      />

      {/* Toast Bildirim Yöneticisi */}
      <ToastManager
        onViewNotifications={() => setShowNotificationPanel(true)}
      />

      {/* Basit Bildirim */}
      {showSimpleNotification && (
        <SimpleNotification
          message={notificationMessage}
          onClose={() => setShowSimpleNotification(false)}
          onViewNotifications={() => {
            setShowSimpleNotification(false);
            setShowNotificationPanel(true);
          }}
        />
      )}

      {/* Oturum Zaman Aşımı Modalı */}
      <SessionTimeoutModal />

      {/* Kurallar Modalı */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <Shield className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Sistem Kuralları</h2>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <RulesApp currentUser={user} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Ana App component'i - AuthProvider ile wrap edilmiş
function App() {
  return (
    <div className="App">
      <Router>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </Router>
    </div>
  );
}

export default App; 