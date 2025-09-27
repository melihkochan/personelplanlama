import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Upload, Users, Calendar, BarChart3, Sparkles, Store, LogOut, Shield, Car, Home, Menu, X, Check, AlertCircle, ChevronDown, ChevronRight, Clock, Truck, Package, MapPin, Bell, MessageCircle, BookOpen, Map, UserCheck, AlertTriangle, TrendingUp, TrendingDown, Search, Phone } from 'lucide-react';
import { FileExcelOutlined } from '@ant-design/icons';
import 'antd/dist/reset.css';

import PersonelList from './components/personnel/PersonelList';
import VehicleList from './components/vehicles/VehicleList';
import StoreList from './components/stores/StoreList';
import StoreDistanceCalculator from './components/stores/StoreDistanceCalculator';
import StoreDifficultyManager from './components/stores/StoreDifficultyManager';
import TransferPersonnelList from './components/transfer/TransferPersonnelList';
import TransferPersonnelMagazaZorluk from './components/transfer/TransferPersonnelMagazaZorluk';
import TransferDistributionAnalysis from './components/transfer/TransferDistributionAnalysis';
import TransferVehicleList from './components/transfer/TransferVehicleList';
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
import { getAllPersonnel, getAllVehicles, getAllStores, getUserRole, getUserDetails, getDailyNotes, getWeeklySchedules, getPerformanceData, getUnreadNotificationCount, markAllNotificationsAsRead, deleteAllNotifications, createPendingApprovalNotification, supabase, avatarService, getUserProfile, updateUserProfile } from './services/supabase';
import { getPendingRegistrationsCount } from './services/supabase';
import ModernAvatarUpload from './components/ui/ModernAvatarUpload';
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
  const [userAvatar, setUserAvatar] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [userRoleLoading, setUserRoleLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Mağaza arama için state'ler
  const [storeSearchTerm, setStoreSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [allStores, setAllStores] = useState([]);

  // Mağaza verilerini yükle
  useEffect(() => {
    const loadStores = async () => {
      try {
        const result = await getAllStores();
        
        if (result.success) {
          setAllStores(result.data || []);
        } else {
          console.error('❌ Mağaza verileri yüklenemedi:', result.error);
        }
      } catch (error) {
        console.error('❌ Mağaza verileri yüklenirken hata:', error);
      }
    };

    if (isAuthenticated) {
      loadStores();
    }
  }, [isAuthenticated]);

  // Mağaza arama fonksiyonu
  const handleStoreSearch = (term) => {
    setStoreSearchTerm(term);
    if (term.length >= 2) {
      setIsSearching(true);
      console.log('🔍 Arama terimi:', term);
      console.log('🔍 Tüm mağazalar:', allStores);
      
      const filtered = allStores.filter(store => {
        // Sadece isim ve kod ile ara
        const nameMatch = store.name?.toLowerCase().includes(term.toLowerCase());
        const storeCodeMatch = store.store_code?.toLowerCase().includes(term.toLowerCase());
        const storeNameMatch = store.store_name?.toLowerCase().includes(term.toLowerCase());
        const mağazaAdıMatch = store.mağaza_adı?.toLowerCase().includes(term.toLowerCase());
        
        console.log('🔍 Mağaza:', store.name || store.store_name || store.mağaza_adı, 'Eşleşme:', nameMatch || storeCodeMatch || storeNameMatch || mağazaAdıMatch);
        
        return nameMatch || storeCodeMatch || storeNameMatch || mağazaAdıMatch;
      });
      
      console.log('🔍 Filtrelenmiş sonuçlar:', filtered);
      setSearchResults(filtered.slice(0, 5)); // İlk 5 sonucu göster
      setIsSearching(false);
    } else {
      setSearchResults([]);
    }
  };
  
  // Avatar yükleme fonksiyonu
  const handleAvatarUpload = async (file) => {
    if (!file || !user) return;
    
    setUploadingAvatar(true);
    try {
      const result = await avatarService.uploadAvatar(file, user.id);
      if (result.success) {
        // Avatar URL'ini güncelle
        setUserAvatar(result.url);
        
        // Veritabanında avatar_url'i güncelle
        await updateUserProfile(user.id, { avatar_url: result.path });
        
        // User details'i güncelle
        setUserDetails(prev => ({
          ...prev,
          avatar_url: result.path
        }));
        
        alert('Avatar başarıyla yüklendi!');
        
        // Sayfayı yenile (avatar'ın görünmesi için)
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        alert('Avatar yüklenirken hata oluştu: ' + result.error);
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      alert('Avatar yüklenirken hata oluştu!');
    } finally {
      setUploadingAvatar(false);
    }
  };
  
  // Güncel veriler için state'ler
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weatherData, setWeatherData] = useState(null);
  const [dailyMotivation, setDailyMotivation] = useState('');
  const [activeWeatherTab, setActiveWeatherTab] = useState('temperature');
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('İstanbul');
  const [cityCoordinates, setCityCoordinates] = useState({ lat: 41.0138, lon: 28.9497 });
  const [selectedDay, setSelectedDay] = useState(0); // 0 = bugün, 1 = yarın, vs.
  
  // Türkiye'nin 81 ili (alfabetik sıralı)
  const cities = [
    { name: 'Adana', lat: 37.0000, lon: 35.3213 },
    { name: 'Adıyaman', lat: 37.7648, lon: 38.2786 },
    { name: 'Afyonkarahisar', lat: 38.7507, lon: 30.5567 },
    { name: 'Ağrı', lat: 39.7191, lon: 43.0503 },
    { name: 'Amasya', lat: 40.6499, lon: 35.8353 },
    { name: 'Ankara', lat: 39.9334, lon: 32.8597 },
    { name: 'Antalya', lat: 36.8969, lon: 30.7133 },
    { name: 'Artvin', lat: 41.1828, lon: 41.8183 },
    { name: 'Aydın', lat: 37.8560, lon: 27.8416 },
    { name: 'Balıkesir', lat: 39.6484, lon: 27.8826 },
    { name: 'Bilecik', lat: 40.1426, lon: 29.9793 },
    { name: 'Bingöl', lat: 38.8847, lon: 40.4986 },
    { name: 'Bitlis', lat: 38.3938, lon: 42.1232 },
    { name: 'Bolu', lat: 40.7314, lon: 31.5898 },
    { name: 'Burdur', lat: 37.7206, lon: 30.2906 },
    { name: 'Bursa', lat: 40.1826, lon: 29.0665 },
    { name: 'Çanakkale', lat: 40.1553, lon: 26.4142 },
    { name: 'Çankırı', lat: 40.6013, lon: 33.6134 },
    { name: 'Çorum', lat: 40.5506, lon: 34.9556 },
    { name: 'Denizli', lat: 37.7765, lon: 29.0864 },
    { name: 'Diyarbakır', lat: 37.9144, lon: 40.2306 },
    { name: 'Edirne', lat: 41.6771, lon: 26.5557 },
    { name: 'Elazığ', lat: 38.6810, lon: 39.2264 },
    { name: 'Erzincan', lat: 39.7500, lon: 39.5000 },
    { name: 'Erzurum', lat: 39.9334, lon: 41.2767 },
    { name: 'Eskişehir', lat: 39.7767, lon: 30.5206 },
    { name: 'Gaziantep', lat: 37.0662, lon: 37.3833 },
    { name: 'Giresun', lat: 40.9128, lon: 38.3895 },
    { name: 'Gümüşhane', lat: 40.4603, lon: 39.5086 },
    { name: 'Hakkâri', lat: 37.5833, lon: 43.7333 },
    { name: 'Hatay', lat: 36.4018, lon: 36.3498 },
    { name: 'Isparta', lat: 37.7648, lon: 30.5566 },
    { name: 'Mersin', lat: 36.8000, lon: 34.6333 },
    { name: 'İstanbul', lat: 41.0138, lon: 28.9497 },
    { name: 'İzmir', lat: 38.4192, lon: 27.1287 },
    { name: 'Kars', lat: 40.6013, lon: 43.0975 },
    { name: 'Kastamonu', lat: 41.3887, lon: 33.7827 },
    { name: 'Kayseri', lat: 38.7312, lon: 35.4787 },
    { name: 'Kırklareli', lat: 41.7350, lon: 27.2256 },
    { name: 'Kırşehir', lat: 39.1425, lon: 34.1709 },
    { name: 'Kocaeli', lat: 40.8533, lon: 29.8815 },
    { name: 'Konya', lat: 37.8746, lon: 32.4932 },
    { name: 'Kütahya', lat: 39.4186, lon: 29.9831 },
    { name: 'Malatya', lat: 38.3552, lon: 38.3095 },
    { name: 'Manisa', lat: 38.6191, lon: 27.4289 },
    { name: 'Kahramanmaraş', lat: 37.5858, lon: 36.9371 },
    { name: 'Mardin', lat: 37.3212, lon: 40.7245 },
    { name: 'Muğla', lat: 37.2153, lon: 28.3636 },
    { name: 'Muş', lat: 38.9462, lon: 41.7539 },
    { name: 'Nevşehir', lat: 38.6939, lon: 34.6857 },
    { name: 'Niğde', lat: 37.9667, lon: 34.6833 },
    { name: 'Ordu', lat: 40.9839, lon: 37.8764 },
    { name: 'Rize', lat: 41.0201, lon: 40.5234 },
    { name: 'Sakarya', lat: 40.7889, lon: 30.4053 },
    { name: 'Samsun', lat: 41.2928, lon: 36.3313 },
    { name: 'Siirt', lat: 37.9333, lon: 41.9500 },
    { name: 'Sinop', lat: 42.0231, lon: 35.1531 },
    { name: 'Sivas', lat: 39.7477, lon: 37.0179 },
    { name: 'Tekirdağ', lat: 40.9833, lon: 27.5167 },
    { name: 'Tokat', lat: 40.3167, lon: 36.5500 },
    { name: 'Trabzon', lat: 41.0015, lon: 39.7178 },
    { name: 'Tunceli', lat: 39.1079, lon: 39.5401 },
    { name: 'Şanlıurfa', lat: 37.1591, lon: 38.7969 },
    { name: 'Uşak', lat: 38.6823, lon: 29.4082 },
    { name: 'Van', lat: 38.4891, lon: 43.4089 },
    { name: 'Yozgat', lat: 39.8181, lon: 34.8147 },
    { name: 'Zonguldak', lat: 41.4564, lon: 31.7987 },
    { name: 'Aksaray', lat: 38.3687, lon: 34.0370 },
    { name: 'Bayburt', lat: 40.2552, lon: 40.2249 },
    { name: 'Karaman', lat: 37.1759, lon: 33.2287 },
    { name: 'Kırıkkale', lat: 39.8468, lon: 33.4988 },
    { name: 'Batman', lat: 37.8812, lon: 41.1351 },
    { name: 'Şırnak', lat: 37.4187, lon: 42.4918 },
    { name: 'Bartın', lat: 41.6344, lon: 32.3375 },
    { name: 'Ardahan', lat: 41.1105, lon: 42.7022 },
    { name: 'Iğdır', lat: 39.9208, lon: 44.0048 },
    { name: 'Yalova', lat: 40.6560, lon: 29.2846 },
    { name: 'Karabük', lat: 41.2061, lon: 32.6204 },
    { name: 'Kilis', lat: 36.7184, lon: 37.1212 },
    { name: 'Osmaniye', lat: 37.0742, lon: 36.2478 },
    { name: 'Düzce', lat: 40.8438, lon: 31.1565 }
  ];
  
  const handleCityChange = (city) => {
    setSelectedCity(city.name);
    setCityCoordinates({ lat: city.lat, lon: city.lon });
  };

  // Türkçe karakter duyarsız arama fonksiyonu
  const normalizeText = (text) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/İ/g, 'i')
      .replace(/Ğ/g, 'g')
      .replace(/Ü/g, 'u')
      .replace(/Ş/g, 's')
      .replace(/Ö/g, 'o')
      .replace(/Ç/g, 'c');
  };

  // Favori şehirler ve sıralama
  const getSortedCities = () => {
    const favorites = ['İstanbul', 'Kocaeli'];
    const favoriteCities = cities.filter(city => favorites.includes(city.name));
    const otherCities = cities.filter(city => !favorites.includes(city.name));
    return [...favoriteCities, ...otherCities];
  };

  // Dropdown dışına tıklayınca kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCitySelector && !event.target.closest('.city-selector')) {
        setShowCitySelector(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCitySelector]);
  
  // Gerçek zamanlı saat güncellemesi
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Hava durumu verilerini çek
  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${cityCoordinates.lat}&longitude=${cityCoordinates.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m,precipitation,wind_speed_10m,wind_direction_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Europe%2FIstanbul&forecast_days=7`);
        const data = await response.json();
        
        if (data.hourly && data.daily) {
          setWeatherData(data);
        }
      } catch (error) {
        console.error('❌ Hava durumu verisi yüklenirken hata:', error);
        // Fallback veri
        setWeatherData({
          hourly: {
            time: [],
            temperature_2m: [22, 23, 24, 25, 26, 27, 28],
            precipitation: [0, 0.5, 1.2, 0, 0.8, 0, 0.3, 0],
            wind_speed_10m: [15, 18, 12, 20, 16, 14, 19, 17],
            wind_direction_10m: [45, 60, 30, 90, 120, 75, 105, 135],
            relative_humidity_2m: [65, 70, 68, 72, 75, 80, 78, 82]
          },
          daily: {
            time: [],
            temperature_2m_max: [24, 25, 26, 27, 28, 29, 30],
            temperature_2m_min: [18, 19, 20, 21, 22, 23, 24],
            weather_code: [0, 1, 2, 3, 0, 1, 2]
          }
        });
      }
    };

    fetchWeatherData();
  }, [cityCoordinates]);
  
  // Hava durumu verisi çekme
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Open-Meteo API kullanarak İstanbul hava durumu
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=41.0138&longitude=28.9497&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe/Istanbul&forecast_days=7`
        );
        if (response.ok) {
          const data = await response.json();
          setWeatherData(data);
        }
      } catch (error) {
        // Fallback veri
        setWeatherData({
          hourly: {
            time: [
              new Date().toISOString(),
              new Date(Date.now() + 3600000).toISOString(),
              new Date(Date.now() + 7200000).toISOString(),
              new Date(Date.now() + 10800000).toISOString(),
              new Date(Date.now() + 14400000).toISOString(),
              new Date(Date.now() + 18000000).toISOString(),
              new Date(Date.now() + 21600000).toISOString()
            ],
            temperature_2m: [22, 21, 20, 19, 18, 17, 16],
            relative_humidity_2m: [65, 70, 75, 80, 85, 90, 95],
            wind_speed_10m: [8, 10, 12, 15, 18, 20, 22],
            weather_code: [0, 1, 2, 3, 45, 48, 51]
          },
          daily: {
            time: [
              new Date().toISOString().split('T')[0],
              new Date(Date.now() + 86400000).toISOString().split('T')[0],
              new Date(Date.now() + 172800000).toISOString().split('T')[0],
              new Date(Date.now() + 259200000).toISOString().split('T')[0],
              new Date(Date.now() + 345600000).toISOString().split('T')[0],
              new Date(Date.now() + 432000000).toISOString().split('T')[0],
              new Date(Date.now() + 518400000).toISOString().split('T')[0]
            ],
            weather_code: [0, 1, 2, 3, 45, 48, 51],
            temperature_2m_max: [25, 24, 23, 22, 21, 20, 19],
            temperature_2m_min: [18, 17, 16, 15, 14, 13, 12]
          }
        });
      }
    };
    
    fetchWeather();
    // Her 10 dakikada bir güncelle
    const weatherTimer = setInterval(fetchWeather, 600000);
    return () => clearInterval(weatherTimer);
  }, []);
  
  // Günlük motivasyon mesajları
  useEffect(() => {
    const motivations = [
      "Bugün harika bir gün olacak! Başarılar dileriz 🌟",
      "Yeni gün, yeni fırsatlar! Haydi başlayalım 💪",
      "Bugün de muhteşem işler çıkaracağız! 🚀",
      "Pozitif enerji ile dolu bir gün geçirin! ✨",
      "Her gün bir hediyedir, bugünü en iyi şekilde değerlendirin! 🎁"
    ];
    
    const today = new Date().getDate();
    const motivationIndex = today % motivations.length;
    setDailyMotivation(motivations[motivationIndex]);
  }, []);

  
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
  
  // Açılır-kapanır menü state'leri
  const [expandedGroups, setExpandedGroups] = useState({
    personnel: true,
    stores: true,
    vehicles: true,
    aktarma: true
  });


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

  // Grup açma/kapama fonksiyonu
  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
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
            
            // Avatar URL'ini ayarla
            if (userDetailsResult.data.avatar_url) {
              const avatarUrl = avatarService.getAvatarUrl(userDetailsResult.data.avatar_url);
              setUserAvatar(avatarUrl);
            } else {
            }
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
        <div className="sidebar-container w-64 bg-white backdrop-blur-md border-r border-gray-200 shadow-2xl flex flex-col h-screen relative z-20 pointer-events-auto">
          {/* Modern Sidebar Header */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Personel Takip</h1>
                  <p className="text-xs text-gray-700">Modern İş Yönetimi</p>
                </div>
              </div>
              <button
                onClick={() => setShowRulesModal(true)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-all duration-300"
                title="Sistem Kuralları"
              >
                <Shield className="w-4 h-4 text-blue-400" />
              </button>
            </div>
            
          </div>

          {/* Modern Navigation */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-0.5 sidebar-scroll">
            {/* Ana Sayfa */}
            <button
              onClick={() => handleTabChange('home')}
              className={`
                w-full flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                ${activeTab === 'home'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-gray-800 hover:text-gray-900 hover:bg-gray-100'
                }
              `}
            >
              <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                activeTab === 'home' 
                  ? 'bg-white/20' 
                  : 'bg-gray-100 group-hover:bg-gray-200'
              }`}>
                <Home className={`w-3 h-3 ${activeTab === 'home' ? 'text-white' : 'text-gray-700'}`} />
              </div>
              <span className="flex-1 text-left">Ana Sayfa</span>
              {activeTab === 'home' && (
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
              )}
            </button>


            {/* Chat */}
            <button
              onClick={() => handleTabChange('chat')}
              className={`
                w-full flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                ${activeTab === 'chat'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25'
                  : 'text-gray-800 hover:text-gray-900 hover:bg-gray-100'
                }
              `}
            >
              <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                activeTab === 'chat' 
                  ? 'bg-white/20' 
                  : 'bg-gray-100 group-hover:bg-gray-200'
              }`}>
                <MessageCircle className={`w-3 h-3 ${activeTab === 'chat' ? 'text-white' : 'text-gray-700'}`} />
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



            {/* Anadolu Grubu */}
            <div className="space-y-1 mt-4">
              <div className="flex items-center px-2 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent"></div>
                <span className="px-3 text-xs font-bold text-gray-800 uppercase tracking-wider bg-white rounded-full border border-gray-300">Anadolu</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent"></div>
              </div>

              {/* Personel Yönetimi Alt Grubu */}
              <div className="ml-2">
                <button
                  onClick={() => toggleGroup('personnel')}
                  className="w-full flex items-center px-1 py-0.5 rounded text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
                >
                  {expandedGroups.personnel ? (
                    <ChevronDown className="w-3 h-3 mr-1" />
                  ) : (
                    <ChevronRight className="w-3 h-3 mr-1" />
                  )}
                  <span className="text-xs font-medium text-gray-700">Personel Yönetimi</span>
                </button>
                
                {expandedGroups.personnel && (
                  <div className="ml-4 space-y-0.5 mt-1">

              {/* İstatistikler */}
              <button
                onClick={() => handleTabChange('statistics')}
                className={`
                  w-full flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'statistics'
                    ? 'text-white border-l-4 border-l-emerald-500 bg-slate-700/30'
                    : 'text-gray-800 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'statistics' 
                    ? 'bg-white/20' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <BarChart3 className={`w-3 h-3 ${activeTab === 'statistics' ? 'text-white' : 'text-gray-700'}`} />
                </div>
                <span className="flex-1 text-left">Anadolu İstatistikler</span>
              </button>

              <button
                onClick={() => handleTabChange('vardiya-kontrol')}
                className={`
                  w-full flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'vardiya-kontrol'
                    ? 'text-white border-l-4 border-l-amber-500 bg-slate-700/30'
                    : 'text-gray-800 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'vardiya-kontrol' 
                    ? 'bg-white/20' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <Clock className={`w-3 h-3 ${activeTab === 'vardiya-kontrol' ? 'text-white' : 'text-gray-700'}`} />
                </div>
                <span className="flex-1 text-left">Anadolu Personel Kontrol</span>
              </button>

              <button
                onClick={() => handleTabChange('performance')}
                className={`
                  w-full flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'performance'
                    ? 'text-white border-l-4 border-l-green-500 bg-slate-700/30'
                    : 'text-gray-800 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'performance' 
                    ? 'bg-white/20' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <BarChart3 className={`w-3 h-3 ${activeTab === 'performance' ? 'text-white' : 'text-gray-700'}`} />
                </div>
                <span className="flex-1 text-left">Anadolu Performans Analizi</span>
              </button>

              <button
                onClick={() => handleTabChange('store-distribution')}
                className={`
                  w-full flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'store-distribution'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                    : 'text-gray-800 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'store-distribution' 
                    ? 'bg-white/20' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <MapPin className={`w-3 h-3 ${activeTab === 'store-distribution' ? 'text-white' : 'text-gray-700'}`} />
                </div>
                <span className="flex-1 text-left">Anadolu Personel Konum Dağılımı</span>
                {activeTab === 'store-distribution' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>

              <button
                onClick={() => handleTabChange('vehicle-distribution')}
                className={`
                  w-full flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'vehicle-distribution'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                    : 'text-gray-800 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'vehicle-distribution' 
                    ? 'bg-white/20' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <Car className={`w-3 h-3 ${activeTab === 'vehicle-distribution' ? 'text-white' : 'text-gray-700'}`} />
                </div>
                <span className="flex-1 text-left">Anadolu Personel Araç Dağılımı</span>
                {activeTab === 'vehicle-distribution' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>

              <button
                onClick={() => handleTabChange('personnel')}
                className={`
                  w-full flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'personnel'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25'
                    : 'text-gray-800 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'personnel' 
                    ? 'bg-white/20' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <Users className={`w-3 h-3 ${activeTab === 'personnel' ? 'text-white' : 'text-gray-700'}`} />
                </div>
                <span className="flex-1 text-left">Anadolu Personel Listesi</span>
                {activeTab === 'personnel' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>
            </div>
                )}
              </div>

              {/* Mağaza Yönetimi Alt Grubu */}
              <div className="ml-2 mt-2">
                <button
                  onClick={() => toggleGroup('stores')}
                  className="w-full flex items-center px-1 py-0.5 rounded text-xs font-medium text-gray-800 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
                >
                  {expandedGroups.stores ? (
                    <ChevronDown className="w-3 h-3 mr-1" />
                  ) : (
                    <ChevronRight className="w-3 h-3 mr-1" />
                  )}
                  <span className="text-xs font-medium text-gray-700">Mağaza Yönetimi</span>
                </button>
                
                {expandedGroups.stores && (
                  <div className="ml-4 space-y-0.5 mt-1">

              <button
                onClick={() => handleTabChange('stores')}
                className={`
                  w-full flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'stores'
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25'
                    : 'text-gray-800 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'stores' 
                    ? 'bg-white/20' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <Store className={`w-3 h-3 ${activeTab === 'stores' ? 'text-white' : 'text-gray-700'}`} />
                </div>
                <span className="flex-1 text-left">Anadolu Mağaza Listesi</span>
                {activeTab === 'stores' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>

              <button
                onClick={() => handleTabChange('store-distance')}
                className={`
                  w-full flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'store-distance'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-gray-800 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'store-distance' 
                    ? 'bg-white/20' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <MapPin className={`w-3 h-3 ${activeTab === 'store-distance' ? 'text-white' : 'text-gray-700'}`} />
                </div>
                <span className="flex-1 text-left">Anadolu Mağaza Uzaklık Ölçer</span>
                {activeTab === 'store-distance' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>

                  </div>
                )}
              </div>

              {/* Araç Yönetimi Alt Grubu */}
              <div className="ml-2 mt-2">
                <button
                  onClick={() => toggleGroup('vehicles')}
                  className="w-full flex items-center px-1 py-0.5 rounded text-xs font-medium text-gray-800 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
                >
                  {expandedGroups.vehicles ? (
                    <ChevronDown className="w-3 h-3 mr-1" />
                  ) : (
                    <ChevronRight className="w-3 h-3 mr-1" />
                  )}
                  <span className="text-xs font-medium text-gray-700">Araç Yönetimi</span>
                </button>
                
                {expandedGroups.vehicles && (
                  <div className="ml-4 space-y-0.5 mt-1">
                    <button
                      onClick={() => handleTabChange('vehicles')}
                      className={`
                        w-full flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                        ${activeTab === 'vehicles'
                          ? 'bg-gradient-to-r from-gray-500 to-slate-600 text-white shadow-lg shadow-gray-500/25'
                          : 'text-gray-800 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                        activeTab === 'vehicles' 
                          ? 'bg-white/20' 
                          : 'bg-gray-100 group-hover:bg-gray-200'
                      }`}>
                        <Car className={`w-3 h-3 ${activeTab === 'vehicles' ? 'text-white' : 'text-gray-700'}`} />
                      </div>
                      <span className="flex-1 text-left">Anadolu Araç Listesi</span>
                      {activeTab === 'vehicles' && (
                        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Aktarma Depo Grubu */}
            <div className="space-y-1 mt-4">
              <div className="flex items-center px-2 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent"></div>
                <span className="px-3 text-xs font-bold text-gray-800 uppercase tracking-wider bg-white rounded-full border border-gray-300">Aktarma Depo</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent"></div>
              </div>

              {/* Personel Yönetimi Alt Grubu */}
              <div className="ml-2">
                <button
                  onClick={() => toggleGroup('personnel')}
                  className="w-full flex items-center px-1 py-0.5 rounded text-xs font-medium text-gray-800 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
                >
                  {expandedGroups.personnel ? (
                    <ChevronDown className="w-3 h-3 mr-1" />
                  ) : (
                    <ChevronRight className="w-3 h-3 mr-1" />
                  )}
                  <span className="text-xs font-medium text-gray-700">Personel ve Mağaza Yönetimi</span>
                </button>
                
                {expandedGroups.personnel && (
                  <div className="ml-4 space-y-0.5 mt-1">
              <button
                onClick={() => handleTabChange('aktarma-personel-list')}
                className={`
                  w-full flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'aktarma-personel-list'
                    ? 'bg-gradient-to-r from-gray-500 to-slate-600 text-white shadow-lg shadow-gray-500/25'
                    : 'text-gray-800 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'aktarma-personel-list' 
                    ? 'bg-white/20' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <Users className={`w-3 h-3 ${activeTab === 'aktarma-personel-list' ? 'text-white' : 'text-gray-700'}`} />
                </div>
                      <span className="flex-1 text-left">Personel Performans Analizi</span>
                {activeTab === 'aktarma-personel-list' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>

              <button
                onClick={() => handleTabChange('aktarma-dagitim-analizi')}
                className={`
                  w-full flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'aktarma-dagitim-analizi'
                    ? 'bg-gradient-to-r from-gray-500 to-slate-600 text-white shadow-lg shadow-gray-500/25'
                    : 'text-gray-800 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'aktarma-dagitim-analizi' 
                    ? 'bg-white/20' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <BarChart3 className={`w-3 h-3 ${activeTab === 'aktarma-dagitim-analizi' ? 'text-white' : 'text-gray-700'}`} />
                </div>
                      <span className="flex-1 text-left">Mağaza Detaylı Dağıtım Analizi</span>
                {activeTab === 'aktarma-dagitim-analizi' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>

              <button
                onClick={() => handleTabChange('aktarma-personel-magaza-zorluk')}
                className={`
                  w-full flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'aktarma-personel-magaza-zorluk'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                    : 'text-gray-800 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'aktarma-personel-magaza-zorluk' 
                    ? 'bg-white/20' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <AlertTriangle className={`w-3 h-3 ${activeTab === 'aktarma-personel-magaza-zorluk' ? 'text-white' : 'text-gray-700'}`} />
                </div>
                      <span className="flex-1 text-left">Aktarma Personel Mağaza Zorluk Verileri</span>
                {activeTab === 'aktarma-personel-magaza-zorluk' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>

              <button
                onClick={() => handleTabChange('store-difficulty')}
                className={`
                  w-full flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'store-difficulty'
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/25'
                    : 'text-gray-800 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'store-difficulty' 
                    ? 'bg-white/20' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <AlertCircle className={`w-3 h-3 ${activeTab === 'store-difficulty' ? 'text-white' : 'text-gray-700'}`} />
                </div>
                <span className="flex-1 text-left">Aktarma Mağaza Zorluk Yönetimi</span>
                {activeTab === 'store-difficulty' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>

                  </div>
                )}
              </div>

              {/* Araç Yönetimi Alt Grubu */}
              <div className="ml-2">
              <button
                  onClick={() => toggleGroup('vehicles')}
                  className="w-full flex items-center px-1 py-0.5 rounded text-xs font-medium text-gray-800 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
                >
                  {expandedGroups.vehicles ? (
                    <ChevronDown className="w-3 h-3 mr-1" />
                  ) : (
                    <ChevronRight className="w-3 h-3 mr-1" />
                  )}
                  <span className="text-xs font-medium text-gray-700">Araç Yönetimi</span>
                </button>
                
                {expandedGroups.vehicles && (
                  <div className="ml-4 space-y-0.5 mt-1">
                    <button
                      onClick={() => handleTabChange('aktarma-vehicle-list')}
                className={`
                  w-full flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                        ${activeTab === 'aktarma-vehicle-list'
                          ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-gray-800 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                        activeTab === 'aktarma-vehicle-list' 
                    ? 'bg-white/20' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                        <Car className={`w-3 h-3 ${activeTab === 'aktarma-vehicle-list' ? 'text-white' : 'text-gray-700'}`} />
                </div>
                      <span className="flex-1 text-left">Aktarma Depo Araç Listesi</span>
                      {activeTab === 'aktarma-vehicle-list' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>
                  </div>
                )}
              </div>
            </div>

            {/* TUZLA EKİP BİLGİLERİ Grubu */}
            <div className="space-y-1 mt-4">
              <div className="flex items-center px-2 py-1">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                <span className="px-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">Tuzla Ekip Bilgileri</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              </div>

              <button
                onClick={() => handleTabChange('team-shifts')}
                className={`
                  w-full flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'team-shifts'
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/25'
                    : 'text-gray-800 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'team-shifts' 
                    ? 'bg-white/20' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <Clock className={`w-3 h-3 ${activeTab === 'team-shifts' ? 'text-white' : 'text-gray-700'}`} />
                </div>
                <span className="flex-1 text-left">Ekip Vardiyaları</span>
                {activeTab === 'team-shifts' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>

              <button
                onClick={() => handleTabChange('team-personnel')}
                className={`
                  w-full flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'team-personnel'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-gray-800 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'team-personnel' 
                    ? 'bg-white/20' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <Users className={`w-3 h-3 ${activeTab === 'team-personnel' ? 'text-white' : 'text-gray-700'}`} />
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
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                <span className="px-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">Puantaj Takip</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              </div>

              <button
                onClick={() => handleTabChange('puantaj-takip')}
                className={`
                  w-full flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'puantaj-takip'
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/25'
                    : 'text-gray-800 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'puantaj-takip' 
                    ? 'bg-white/20' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <FileExcelOutlined className={`w-3 h-3 ${activeTab === 'puantaj-takip' ? 'text-white' : 'text-gray-700'}`} />
                </div>
                <span className="flex-1 text-left">Puantaj Takip</span>
                {activeTab === 'puantaj-takip' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>

              <button
                onClick={() => handleTabChange('puantaj-takvim')}
                className={`
                  w-full flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'puantaj-takvim'
                    ? 'bg-gradient-to-r from-lime-500 to-green-600 text-white shadow-lg shadow-lime-500/25'
                    : 'text-gray-800 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'puantaj-takvim' 
                    ? 'bg-white/20' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <Package className={`w-3 h-3 ${activeTab === 'puantaj-takvim' ? 'text-white' : 'text-gray-700'}`} />
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
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                <span className="px-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">Vardiya Planlama</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              </div>

              <button
                onClick={() => handleTabChange('planning')}
                className={`
                  w-full flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'planning'
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25'
                    : 'text-gray-800 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'planning' 
                    ? 'bg-white/20' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <Calendar className={`w-3 h-3 ${activeTab === 'planning' ? 'text-white' : 'text-gray-700'}`} />
                </div>
                <span className="flex-1 text-left">Vardiya Planlama</span>
                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-300 shadow-sm">
                  Geliştirme
                </span>
                {activeTab === 'planning' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>



              <button
                onClick={() => handleTabChange('akilli-dagitim')}
                className={`
                  w-full flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 relative group
                  ${activeTab === 'akilli-dagitim'
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg shadow-yellow-500/25'
                    : 'text-gray-800 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <div className={`w-5 h-5 rounded-md flex items-center justify-center mr-2 transition-all duration-300 ${
                  activeTab === 'akilli-dagitim' 
                    ? 'bg-white/20' 
                    : 'bg-gray-100 group-hover:bg-gray-200'
                }`}>
                  <Users className={`w-3 h-3 ${activeTab === 'akilli-dagitim' ? 'text-white' : 'text-gray-700'}`} />
                </div>
                <span className="flex-1 text-left">Akıllı Dağıtım</span>
                <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300 shadow-sm">
                  Geliştirme
                </span>
                {activeTab === 'akilli-dagitim' && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-white rounded-l-full"></div>
                )}
              </button>

            </div>
          </nav>

          {/* Modern Sidebar Footer */}
          <div className="p-3 border-t border-gray-200 space-y-2 flex-shrink-0">
            {/* User Profile with Notification */}
            <div className="flex items-center gap-2">
              {/* User Profile */}
              <div 
                onClick={() => setShowProfileModal(true)}
                className="flex-1 flex items-center p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-all duration-300 group cursor-pointer"
              >
                <div className="relative">
                  {userAvatar ? (
                    <div className="w-7 h-7 rounded-lg overflow-hidden shadow-lg">
                      <img 
                        src={userAvatar} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className={`w-full h-full bg-gradient-to-r ${
                        userRole === 'admin' ? 'from-red-500 to-pink-500' : 
                        userRole === 'yönetici' ? 'from-purple-500 to-indigo-500' : 
                        'from-blue-500 to-cyan-500'
                      } rounded-lg flex items-center justify-center shadow-lg`} style={{display: 'none'}}>
                        <span className="text-white font-bold text-xs">
                          {(userDetails?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ) : (
                  <div className={`w-7 h-7 bg-gradient-to-r ${
                    userRole === 'admin' ? 'from-red-500 to-pink-500' : 
                    userRole === 'yönetici' ? 'from-purple-500 to-indigo-500' : 
                    'from-blue-500 to-cyan-500'
                  } rounded-lg flex items-center justify-center shadow-lg`}>
                    <span className="text-white font-bold text-xs">
                      {(userDetails?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-white flex items-center justify-center">
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                  </div>
                </div>
                
                <div className="flex-1 ml-2 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {userDetails?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Kullanıcı'}
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-600">
                      {userRole === 'admin' ? 'Admin' : userRole === 'yönetici' ? 'Yönetici' : 'Kullanıcı'}
                    </span>
                    <span className={`px-1 py-0.5 rounded-full text-[9px] font-bold ${
                      userRole === 'admin' ? 'bg-red-100 text-red-700' : 
                      userRole === 'yönetici' ? 'bg-purple-100 text-purple-700' : 
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {userRole === 'admin' ? 'Yönetici' : userRole === 'yönetici' ? 'Moderatör' : 'Üye'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notification Button */}
              <button
                onClick={() => setShowNotificationPanel(true)}
                className={`relative p-2 rounded-lg transition-all duration-300 ${
                  unreadNotificationCount > 0
                    ? 'bg-green-500/20 hover:bg-green-500/30 border border-green-500/30'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <Bell className={`w-4 h-4 ${unreadNotificationCount > 0 ? 'text-green-600' : 'text-gray-700'}`} />
                <span className={`absolute -top-1 -right-1 px-1 py-0.5 text-white text-[10px] font-bold rounded-full ${unreadNotificationCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}>
                  {unreadNotificationCount}
                </span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className={`flex gap-2 ${(userRole === 'admin' || userRole === 'yönetici') ? 'flex-row' : 'flex-col'}`}>
              {(userRole === 'admin' || userRole === 'yönetici') && (
                <button
                  onClick={() => handleTabChange('admin')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-md hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-md hover:shadow-green-500/25 group text-xs font-medium"
                >
                  <Shield className="w-3 h-3" />
                  <span>Admin</span>
                  {pendingApprovalCount > 0 && (
                    <span className="px-1 py-0.5 bg-yellow-500 text-white text-xs font-bold rounded-full animate-pulse">
                      {pendingApprovalCount}
                    </span>
                  )}
                </button>
              )}
              
              <button
                onClick={handleLogout}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-md hover:from-red-600 hover:to-pink-700 transition-all duration-300 shadow-md hover:shadow-red-500/25 group text-xs font-medium ${(userRole === 'admin' || userRole === 'yönetici') ? 'flex-1' : 'w-full'}`}
              >
                <LogOut className="w-3 h-3" />
                <span>Çıkış</span>
              </button>
            </div>
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
                  <span className={`absolute -top-1 -right-1 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center shadow-lg border-2 border-white ${unreadNotificationCount > 0 ? `${getNotificationColor(unreadNotificationCount)} animate-pulse` : 'bg-gray-500'}`}>
                    {unreadNotificationCount}
                  </span>
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

                  {/* Anadolu Grubu */}
                  <div className="space-y-2">
                    <div className="flex items-center px-4 py-2">
                      <div className="flex-1 h-px bg-gray-300"></div>
                      <span className="px-3 text-xs font-medium text-gray-700 uppercase tracking-wider">Anadolu</span>
                      <div className="flex-1 h-px bg-gray-300"></div>
                    </div>

                    {/* İstatistikler */}
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
                      Anadolu İstatistikler
                    </button>

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
                      Anadolu Personel Listesi
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
                      Anadolu Personel Kontrol
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
                      Anadolu Performans Analizi
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
                      Anadolu Personel Konum Dağılımı
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
                      Anadolu Personel Araç Dağılımı
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
                      Anadolu Mağaza Listesi
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
                      Anadolu Mağaza Zorluk Yönetimi
                    </button>
                  </div>

                  {/* Sistem Yönetimi Grubu */}
                  <div className="space-y-2">
                    <div className="flex items-center px-4 py-2">
                      <div className="flex-1 h-px bg-gray-300"></div>
                      <span className="px-3 text-xs font-medium text-gray-700 uppercase tracking-wider">Sistem Yönetimi</span>
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
                  </div>

                  {/* Aktarma Depo Grubu */}
                  <div className="space-y-2">
                    <div className="flex items-center px-4 py-2">
                      <div className="flex-1 h-px bg-gray-300"></div>
                      <span className="px-3 text-xs font-medium text-gray-700 uppercase tracking-wider">Aktarma Depo</span>
                      <div className="flex-1 h-px bg-gray-300"></div>
                    </div>

                    <button
                      onClick={() => {
                        handleTabChange('aktarma-personel-list');
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                        ${activeTab === 'aktarma-personel-list'
                          ? 'bg-gradient-to-r from-gray-500 to-slate-600 text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Users className="w-5 h-5 mr-3" />
                      Aktarma Personel Performans Analizi
                    </button>

                    <button
                      onClick={() => {
                        handleTabChange('aktarma-dagitim-analizi');
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                        ${activeTab === 'aktarma-dagitim-analizi'
                          ? 'bg-gradient-to-r from-gray-500 to-slate-600 text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <BarChart3 className="w-5 h-5 mr-3" />
                      Mağaza Detaylı Dağıtım Analizi
                    </button>
                  </div>

                  {/* TUZLA EKİP BİLGİLERİ Grubu */}
                  <div className="space-y-2">
                    <div className="flex items-center px-4 py-2">
                      <div className="flex-1 h-px bg-gray-300"></div>
                      <span className="px-3 text-xs font-medium text-gray-700 uppercase tracking-wider">TUZLA EKİP BİLGİLERİ</span>
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
                      <span className="px-3 text-xs font-medium text-gray-700 uppercase tracking-wider">PUANTAJ TAKİP</span>
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
                      <span className="px-3 text-xs font-medium text-gray-700 uppercase tracking-wider">Vardiya Planlama</span>
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
                {/* Ultra Modern Hero Section - Time Based Background */}
                <div className={`relative overflow-hidden rounded-3xl p-6 text-white shadow-2xl border border-white/10 ${
                  (() => {
                    const hour = currentTime.getHours();
                    if (hour >= 5 && hour < 12) {
                      return 'bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500'; // Sabah - Parlak güneş doğumu
                    } else if (hour >= 12 && hour < 17) {
                      return 'bg-gradient-to-br from-cyan-400 via-blue-500 to-yellow-300'; // Öğlen - Çok parlak güneş
                    } else if (hour >= 17 && hour < 20) {
                      return 'bg-gradient-to-br from-slate-700 via-purple-800 to-indigo-900'; // Akşam - Karanlık atmosfer
                    } else {
                      return 'bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-800'; // Gece - Yıldızlı gece
                    }
                  })()
                }`}>
                  {/* Dynamic Animated Background Elements */}
                  <div className="absolute inset-0 overflow-hidden">
                    {(() => {
                      const hour = currentTime.getHours();
                      if (hour >= 5 && hour < 12) {
                        // Sabah - Parlak güneş doğumu
                        return (
                          <>
                            <div className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br from-yellow-200/50 to-orange-300/50 rounded-full blur-3xl animate-pulse"></div>
                            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-tr from-pink-300/40 to-yellow-400/40 rounded-full blur-2xl animate-bounce"></div>
                            <div className="absolute top-1/3 left-1/3 w-48 h-48 bg-gradient-to-r from-orange-300/35 to-yellow-400/35 rounded-full blur-xl animate-spin"></div>
                            <div className="absolute top-2/3 right-1/4 w-32 h-32 bg-gradient-to-l from-pink-300/30 to-orange-400/30 rounded-full blur-lg animate-pulse"></div>
                          </>
                        );
                      } else if (hour >= 12 && hour < 17) {
                        // Öğlen - Çok parlak güneş
                        return (
                          <>
                            <div className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br from-yellow-100/60 to-orange-200/60 rounded-full blur-3xl animate-pulse"></div>
                            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-tr from-cyan-200/50 to-blue-300/50 rounded-full blur-2xl animate-bounce"></div>
                            <div className="absolute top-1/3 left-1/3 w-48 h-48 bg-gradient-to-r from-cyan-300/40 to-blue-400/40 rounded-full blur-xl animate-spin"></div>
                            <div className="absolute top-2/3 right-1/4 w-32 h-32 bg-gradient-to-l from-yellow-300/35 to-orange-400/35 rounded-full blur-lg animate-pulse"></div>
                          </>
                        );
                      } else if (hour >= 17 && hour < 20) {
                        // Akşam - Karanlık atmosfer
                        return (
                          <>
                            <div className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br from-purple-600/25 to-indigo-700/25 rounded-full blur-3xl animate-pulse"></div>
                            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-tr from-slate-600/20 to-purple-700/20 rounded-full blur-2xl animate-bounce"></div>
                            <div className="absolute top-1/3 left-1/3 w-48 h-48 bg-gradient-to-r from-indigo-600/15 to-purple-700/15 rounded-full blur-xl animate-spin"></div>
                            <div className="absolute top-2/3 right-1/4 w-32 h-32 bg-gradient-to-l from-slate-600/10 to-indigo-700/10 rounded-full blur-lg animate-pulse"></div>
                          </>
                        );
                      } else {
                        // Gece - Yıldızlı gece
                        return (
                          <>
                            <div className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br from-indigo-400/30 to-purple-600/30 rounded-full blur-3xl animate-pulse"></div>
                            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-tr from-purple-400/25 to-indigo-500/25 rounded-full blur-2xl animate-bounce"></div>
                            <div className="absolute top-1/3 left-1/3 w-48 h-48 bg-gradient-to-r from-blue-400/20 to-indigo-500/20 rounded-full blur-xl animate-spin"></div>
                            <div className="absolute top-2/3 right-1/4 w-32 h-32 bg-gradient-to-l from-purple-400/15 to-indigo-500/15 rounded-full blur-lg animate-pulse"></div>
                          </>
                        );
                      }
                    })()}
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
                      <div className="w-full">
                        <div className="w-full h-full relative">
                          {/* Sol taraf - Avatar ve Selamlama */}
                          <div className="flex items-center gap-6">
                            {/* Avatar */}
                            <div className="relative">
                              {userAvatar ? (
                                <div className="w-20 h-20 rounded-full overflow-hidden shadow-2xl border-4 border-white/20">
                                  <img 
                                    src={userAvatar} 
                                    alt="Avatar" 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-2xl border-4 border-white/20" style={{display: 'none'}}>
                                    <span className="text-2xl font-bold text-white">
                                      {userDetails?.full_name?.charAt(0) || user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                                </div>
                              ) : (
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-2xl border-4 border-white/20">
                                  <span className="text-2xl font-bold text-white">
                                    {userDetails?.full_name?.charAt(0) || user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                                  </span>
                                </div>
                              )}
                              {/* Online indicator */}
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                              </div>
                            </div>
                            
                            {/* Greeting Message */}
                            <div>
                              <h1 className="text-4xl lg:text-5xl font-bold text-white whitespace-nowrap">
                                {(() => {
                                  const hour = currentTime.getHours();
                                  if (hour >= 5 && hour < 12) {
                                    return 'Günaydın';
                                  } else if (hour >= 12 && hour < 17) {
                                    return 'İyi günler';
                                  } else if (hour >= 17 && hour < 20) {
                                    return 'İyi akşamlar';
                                  } else {
                                    return 'İyi geceler';
                                  }
                                })()}
                                ,{' '}
                                <span className="bg-gradient-to-r from-yellow-200 to-orange-200 bg-clip-text text-transparent">
                            {userDetails?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Kullanıcı'}
                          </span>
                          !
                        </h1>
                            </div>
                          </div>
                          
                          {/* Biraz sollu orta - Mesaj */}
                          <div className="absolute top-1/2 right-8 transform -translate-y-1/2">
                            <p className="text-white/90 text-lg font-medium">
                              {(() => {
                                const hour = currentTime.getHours();
                                if (hour >= 5 && hour < 12) {
                                  return '🌅 Güneş doğuyor, yeni başlangıçlar!';
                                } else if (hour >= 12 && hour < 17) {
                                  return '☀️ Parlak gün, enerji dolu saatler!';
                                } else if (hour >= 17 && hour < 20) {
                                  return '🌇 Gün batımı, huzurlu akşam!';
                                } else {
                                  return '🌙 Yıldızlı gece, dinlenme vakti!';
                                }
                              })()}
                            </p>
                      </div>
                        </div>
                        
                      </div>
                    </div>
                  </div>
                </div>



                {/* Modern Dashboard Cards */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
                  {/* Bugünün Durumları - Sol Yarı */}
                  <div className="relative bg-white/80 backdrop-blur-lg rounded-2xl lg:rounded-3xl shadow-2xl border border-white/20 p-4 lg:p-8 overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-600"></div>
                    </div>
                    
                    <div className="relative z-10">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4 lg:mb-8">
                              <div className="flex items-center gap-2 lg:gap-4">
                          <div className="w-10 h-10 lg:w-14 lg:h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl lg:rounded-3xl flex items-center justify-center shadow-xl">
                            <Calendar className="w-5 h-5 lg:w-7 lg:h-7 text-white" />
                                </div>
                                <div>
                            <h3 className="text-xl lg:text-3xl font-bold text-gray-900">Hava Durumu</h3>
                          </div>
                        </div>

                        {/* Sağ üstte saat */}
                        <div className="text-right">
                          <div className="flex items-center gap-1 lg:gap-2 mb-1">
                            <Clock className="w-3 h-3 lg:w-4 lg:h-4 text-gray-600" />
                            <p className="text-xs lg:text-sm font-medium text-gray-700">Şu anki saat</p>
                          </div>
                          <p className="text-lg lg:text-2xl font-bold text-gray-900">
                            {currentTime.toLocaleTimeString('tr-TR', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </p>
                          <p className="text-xs text-gray-600 hidden lg:block">
                            {currentTime.toLocaleDateString('tr-TR', { 
                              weekday: 'long', 
                              day: 'numeric', 
                              month: 'long' 
                            })}
                          </p>
                        </div>
                        </div>

                      {/* Hava Durumu */}
                      <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl lg:rounded-2xl p-3 lg:p-6 mb-4 lg:mb-6 border border-sky-200/50">
                        <div className="flex items-center justify-between mb-3 lg:mb-4">
                          <div className="flex items-center gap-2 lg:gap-4">
                            <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-sky-400 to-blue-500 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg">
                              <svg className="w-6 h-6 lg:w-8 lg:h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                {(() => {
                                  const weatherCode = weatherData?.daily?.weather_code?.[0] || 0;
                                  
                                  // Open-Meteo weather codes için emoji ikonlar
                                  const weatherEmojis = {
                                    0: '☀️',   // Clear sky
                                    1: '🌤️',   // Mainly clear
                                    2: '⛅',    // Partly cloudy
                                    3: '☁️',    // Overcast
                                    45: '🌫️',  // Fog
                                    48: '🌫️',  // Depositing rime fog
                                    51: '🌦️',  // Light drizzle
                                    53: '🌦️',  // Moderate drizzle
                                    55: '🌦️',  // Dense drizzle
                                    61: '🌧️',  // Slight rain
                                    63: '🌧️',  // Moderate rain
                                    65: '🌧️',  // Heavy rain
                                    71: '❄️',   // Slight snow fall
                                    73: '❄️',   // Moderate snow fall
                                    75: '❄️',   // Heavy snow fall
                                    77: '❄️',   // Snow grains
                                    80: '🌦️',  // Slight rain showers
                                    81: '🌧️',  // Moderate rain showers
                                    82: '🌧️',  // Violent rain showers
                                    85: '❄️',   // Slight snow showers
                                    86: '❄️',   // Heavy snow showers
                                    95: '⛈️',   // Thunderstorm
                                    96: '⛈️',   // Thunderstorm with slight hail
                                    99: '⛈️'    // Thunderstorm with heavy hail
                                  };
                                  
                                  return (
                                    <text x="12" y="18" textAnchor="middle" fontSize="16" fill="white">
                                      {weatherEmojis[weatherData?.daily?.weather_code?.[selectedDay] || 0] || '☀️'}
                                    </text>
                                  );
                                })()}
                              </svg>
                            </div>
                            <div>
                              <div className="relative city-selector">
                                <button
                                  onClick={() => setShowCitySelector(!showCitySelector)}
                                  className="flex items-center gap-1 lg:gap-2 text-sm lg:text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                                >
                                  {selectedCity}
                                  <svg className="w-3 h-3 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                
                                {showCitySelector && (
                                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-60 overflow-y-auto">
                                    <div className="p-2">
                                      <input
                                        type="text"
                                        placeholder="Şehir ara..."
                                        value={searchTerm}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                      />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                      {getSortedCities()
                                        .filter(city => {
                                          if (!searchTerm) return true;
                                          return normalizeText(city.name).includes(normalizeText(searchTerm));
                                        })
                                        .map(city => (
                                        <button
                                          key={city.name}
                                          onClick={() => {
                                            handleCityChange(city);
                                            setShowCitySelector(false);
                                            setSearchTerm('');
                                          }}
                                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${
                                            selectedCity === city.name ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <span>{city.name}</span>
                                            {['İstanbul', 'Kocaeli'].includes(city.name) && (
                                              <span className="text-xs text-yellow-600">⭐</span>
                                            )}
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">
                                {(() => {
                                  const weatherCode = weatherData?.daily?.weather_code?.[selectedDay] || 0;
                                  const descriptions = {
                                    0: 'Güneşli',
                                    1: 'Az bulutlu',
                                    2: 'Parçalı bulutlu',
                                    3: 'Bulutlu',
                                    45: 'Sisli',
                                    48: 'Sisli',
                                    51: 'Hafif yağmurlu',
                                    53: 'Orta yağmurlu',
                                    55: 'Yoğun yağmurlu',
                                    61: 'Hafif yağmurlu',
                                    63: 'Orta yağmurlu',
                                    65: 'Yoğun yağmurlu',
                                    71: 'Hafif kar',
                                    73: 'Orta kar',
                                    75: 'Yoğun kar',
                                    80: 'Hafif sağanak',
                                    81: 'Orta sağanak',
                                    82: 'Yoğun sağanak',
                                    95: 'Fırtınalı',
                                    96: 'Fırtınalı',
                                    99: 'Şiddetli fırtınalı'
                                  };
                                  return descriptions[weatherCode] || 'Güneşli';
                                })()}, {selectedDay === 0 
                                  ? Math.round(weatherData?.current?.temperature_2m || weatherData?.hourly?.temperature_2m?.[0] || 22)
                                  : Math.round(weatherData?.daily?.temperature_2m_max?.[selectedDay] || 22)
                                }°C
                              </p>
                              <p className="text-xs text-gray-700">
                                Nem: {selectedDay === 0 
                                  ? Math.round(weatherData?.current?.relative_humidity_2m || weatherData?.hourly?.relative_humidity_2m?.[0] || 65)
                                  : Math.round(weatherData?.hourly?.relative_humidity_2m?.[0] || 65)
                                }% • Rüzgar: {selectedDay === 0 
                                  ? Math.round(weatherData?.current?.wind_speed_10m || weatherData?.hourly?.wind_speed_10m?.[0] || 15)
                                  : Math.round(weatherData?.hourly?.wind_speed_10m?.[0] || 15)
                                } km/h
                              </p>
                              <p className="text-xs text-gray-700">
                                En yüksek: {Math.round(weatherData?.daily?.temperature_2m_max?.[selectedDay] || 22)}° • En düşük: {Math.round(weatherData?.daily?.temperature_2m_min?.[selectedDay] || 18)}°
                              </p>
                          </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-700 mb-1">Sıcaklık</p>
                            <p className="text-xl lg:text-2xl font-bold text-gray-900">
                              {selectedDay === 0 
                                ? Math.round(weatherData?.current?.temperature_2m || weatherData?.hourly?.temperature_2m?.[0] || 22)
                                : Math.round(weatherData?.daily?.temperature_2m_max?.[selectedDay] || 22)
                              }°
                            </p>
                            <p className="text-xs lg:text-sm text-gray-600 hidden lg:block">
                              {currentTime.toLocaleDateString('tr-TR', { 
                                weekday: 'long', 
                                day: 'numeric', 
                                month: 'long' 
                              })}
                            </p>
                          </div>
                        </div>
                        
                        
                        {/* 7 Günlük Hava Durumu Tahmini - Grafiğin altında */}
                        <div className="bg-transparent rounded-lg lg:rounded-xl p-2 lg:p-4">
                          <div className="grid grid-cols-7 gap-1 lg:gap-2">
                            {Array.from({ length: 7 }, (_, i) => {
                              const date = new Date();
                              date.setDate(date.getDate() + i);
                              const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
                              
                              // Open-Meteo API'den gelen veriyi kullan
                              const maxTemp = Math.round(weatherData?.daily?.temperature_2m_max?.[i] || (20 + i));
                              const minTemp = Math.round(weatherData?.daily?.temperature_2m_min?.[i] || (18 + i));
                              const weatherCode = weatherData?.daily?.weather_code?.[i] || 0;
                              const isSelected = selectedDay === i;
                              
                              const getWeatherIcon = (code) => {
                                // Open-Meteo weather codes için emoji ikonlar
                                const weatherEmojis = {
                                  0: '☀️',   // Clear sky
                                  1: '🌤️',   // Mainly clear
                                  2: '⛅',    // Partly cloudy
                                  3: '☁️',    // Overcast
                                  45: '🌫️',  // Fog
                                  48: '🌫️',  // Depositing rime fog
                                  51: '🌦️',  // Light drizzle
                                  53: '🌦️',  // Moderate drizzle
                                  55: '🌦️',  // Dense drizzle
                                  61: '🌧️',  // Slight rain
                                  63: '🌧️',  // Moderate rain
                                  65: '🌧️',  // Heavy rain
                                  71: '❄️',   // Slight snow fall
                                  73: '❄️',   // Moderate snow fall
                                  75: '❄️',   // Heavy snow fall
                                  77: '❄️',   // Snow grains
                                  80: '🌦️',  // Slight rain showers
                                  81: '🌧️',  // Moderate rain showers
                                  82: '🌧️',  // Violent rain showers
                                  85: '❄️',   // Slight snow showers
                                  86: '❄️',   // Heavy snow showers
                                  95: '⛈️',   // Thunderstorm
                                  96: '⛈️',   // Thunderstorm with slight hail
                                  99: '⛈️'    // Thunderstorm with heavy hail
                              };
                              
                              return (
                                  <div className="w-6 h-6 lg:w-8 lg:h-8 flex items-center justify-center text-lg lg:text-2xl">
                                    {weatherEmojis[code] || '☀️'}
                          </div>
                                );
                              };
                              
                              return (
                                <button
                                  key={i}
                                  onClick={() => setSelectedDay(i)}
                                  className={`text-center p-1 lg:p-2 rounded-md lg:rounded-lg transition-all duration-200 ${
                                    isSelected 
                                      ? 'bg-blue-500 text-white shadow-md' 
                                      : 'hover:bg-white/40 text-gray-700'
                                  }`}
                                >
                                  <p className={`text-xs mb-1 font-medium ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                                    {dayNames[date.getDay()]}
                                  </p>
                                  <div className="flex justify-center mb-1">{getWeatherIcon(weatherCode)}</div>
                                  <p className={`text-xs lg:text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>{maxTemp}°</p>
                                  <p className={`text-xs ${isSelected ? 'text-blue-100' : 'text-gray-600'}`}>{minTemp}°</p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>


                      {/* Günlük Sıcaklık Grafiği - 7 günlük takvimin üstünde */}
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl lg:rounded-2xl p-3 lg:p-6 mb-3 lg:mb-4 border border-blue-200/50">
                        <div className="flex items-center gap-2 lg:gap-3 mb-3 lg:mb-4">
                          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg lg:rounded-xl flex items-center justify-center">
                            <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            </div>
                          <h4 className="text-sm lg:text-lg font-semibold text-gray-900">
                            Hava Grafiği
                          </h4>
                          </div>
                        <div className="bg-white/60 rounded-lg lg:rounded-xl p-2 lg:p-4">
                          {/* Hava Durumu Sekmeleri */}
                          <div className="flex space-x-0.5 bg-gray-100 rounded-lg p-0.5 mb-3 lg:mb-4">
                            <button
                              onClick={() => setActiveWeatherTab('temperature')}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                                activeWeatherTab === 'temperature'
                                  ? 'bg-white text-gray-900 shadow-sm'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              Sıcaklık
                            </button>
                            <button
                              onClick={() => setActiveWeatherTab('precipitation')}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                                activeWeatherTab === 'precipitation'
                                  ? 'bg-white text-gray-900 shadow-sm'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              Yağış
                            </button>
                            <button
                              onClick={() => setActiveWeatherTab('wind')}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                                activeWeatherTab === 'wind'
                                  ? 'bg-white text-gray-900 shadow-sm'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              Rüzgar
                            </button>
                            </div>
                          
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-gray-600">
                              {activeWeatherTab === 'temperature' && '24 Saatlik Sıcaklık Trendi'}
                              {activeWeatherTab === 'precipitation' && '24 Saatlik Yağış Trendi'}
                              {activeWeatherTab === 'wind' && '24 Saatlik Rüzgar Trendi'}
                            </span>
                            <span className="text-xs text-gray-700">{selectedCity}</span>
                            </div>
                          <div className="h-40 relative">
                            <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                              {(() => {
                                if (activeWeatherTab === 'temperature' && weatherData?.hourly?.temperature_2m?.slice(0, 24)) {
                                  // Seçilen güne göre veri al
                                  const startHour = selectedDay * 24;
                                  const endHour = startHour + 24;
                                  const temps = weatherData.hourly.temperature_2m.slice(startHour, endHour) || weatherData.hourly.temperature_2m.slice(0, 24);
                                  const maxTemp = Math.max(...temps);
                                  const minTemp = Math.min(...temps);
                                  const tempRange = maxTemp - minTemp || 1;
                                  
                                  const points = temps.map((temp, index) => {
                                    const x = (index / 23) * 400;
                                    const y = 100 - ((temp - minTemp) / tempRange) * 80 - 10;
                                    return `${x},${y}`;
                                  }).join(' ');
                                  
                                  return (
                                    <>
                                      <polygon
                                        points={`0,110 ${points} 400,110`}
                                        fill="url(#temperatureGradient)"
                                        opacity="0.3"
                                      />
                                      <polyline
                                        points={points}
                                        fill="none"
                                        stroke="#f59e0b"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        filter="url(#tempGlow)"
                                      />
                                      {temps.map((temp, index) => {
                                        const x = (index / 23) * 400;
                                        const y = 100 - ((temp - minTemp) / tempRange) * 80 - 10;
                                        const isCurrentHour = index === new Date().getHours();
                                        
                                        return (
                                          <g key={index}>
                                            <circle
                                              cx={x}
                                              cy={y}
                                              r={isCurrentHour ? "4" : "2"}
                                              fill={isCurrentHour ? "#ef4444" : "#f59e0b"}
                                              stroke="white"
                                              strokeWidth="1"
                                            />
                                            {/* Sıcaklık değerleri */}
                                            <text
                                              x={x}
                                              y={y - 6}
                                              textAnchor="middle"
                                              className="fill-gray-500"
                                              fontSize="8"
                                            >
                                              {Math.round(temp)}°
                                            </text>
                                          </g>
                                        );
                                      })}
                                      <defs>
                                        <linearGradient id="temperatureGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8"/>
                                          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.1"/>
                                        </linearGradient>
                                        <filter id="tempGlow">
                                          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                          <feMerge> 
                                            <feMergeNode in="coloredBlur"/>
                                            <feMergeNode in="SourceGraphic"/>
                                          </feMerge>
                                        </filter>
                                      </defs>
                                    </>
                                  );
                                } else if (activeWeatherTab === 'precipitation') {
                                  // Yağış grafiği - modern bar chart
                                  const startHour = selectedDay * 24;
                                  const endHour = startHour + 8;
                                  const precipitation = weatherData?.hourly?.precipitation?.slice(startHour, endHour) || weatherData?.hourly?.precipitation?.slice(0, 8) || [0, 0, 0, 0, 0, 0, 0, 0];
                                  const maxPrecip = Math.max(...precipitation, 0.1);
                                  
                                  return (
                                    <>
                                      <defs>
                                        <linearGradient id="precipitationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9"/>
                                          <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.6"/>
                                        </linearGradient>
                                      </defs>
                                      {/* Minimum çizgi - yağış olmasa bile */}
                                      <line
                                        x1="25"
                                        y1="100"
                                        x2="375"
                                        y2="100"
                                        stroke="#e5e7eb"
                                        strokeWidth="1"
                                        strokeDasharray="2,2"
                                        opacity="0.5"
                                      />
                                      {/* Y ekseni çizgileri */}
                                      <line
                                        x1="25"
                                        y1="30"
                                        x2="25"
                                        y2="100"
                                        stroke="#e5e7eb"
                                        strokeWidth="1"
                                        opacity="0.3"
                                      />
                                      <line
                                        x1="375"
                                        y1="30"
                                        x2="375"
                                        y2="100"
                                        stroke="#e5e7eb"
                                        strokeWidth="1"
                                        opacity="0.3"
                                      />
                                      {/* Grid çizgileri */}
                                      {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                                        <line
                                          key={i}
                                          x1={25 + (i * 50)}
                                          y1="30"
                                          x2={25 + (i * 50)}
                                          y2="100"
                                          stroke="#f3f4f6"
                                          strokeWidth="0.5"
                                          opacity="0.5"
                                        />
                                      ))}
                                      {precipitation.map((precip, index) => {
                                        const x = (index / 7) * 350 + 25;
                                        const barWidth = 35;
                                        const barHeight = maxPrecip > 0 ? (precip / maxPrecip) * 70 : 0;
                                        const y = 100 - barHeight;
                                        const isCurrentHour = index === new Date().getHours();
                                        
                                        return (
                                          <g key={index}>
                                            {barHeight > 0 && (
                                              <rect
                                                x={x}
                                                y={y}
                                                width={barWidth}
                                                height={barHeight}
                                                fill={isCurrentHour ? "#ef4444" : "url(#precipitationGradient)"}
                                                rx="4"
                                                className="drop-shadow-sm"
                                              />
                                            )}
                                            <text
                                              x={x + barWidth/2}
                                              y={y - 8}
                                              textAnchor="middle"
                                              className="fill-gray-600"
                                              fontSize="9"
                                              fontWeight="500"
                                            >
                                              {precip > 0 ? `${precip.toFixed(1)}mm` : '0.0mm'}
                                            </text>
                                            <text
                                              x={x + barWidth/2}
                                              y={105}
                                              textAnchor="middle"
                                              className="fill-gray-400"
                                              fontSize="8"
                                            >
                                              {index * 3}:00
                                            </text>
                                          </g>
                                        );
                                      })}
                                    </>
                                  );
                                } else if (activeWeatherTab === 'wind') {
                                  // Rüzgar grafiği - modern wind rose
                                  const startHour = selectedDay * 24;
                                  const endHour = startHour + 8;
                                  const windSpeeds = weatherData?.hourly?.wind_speed_10m?.slice(startHour, endHour) || weatherData?.hourly?.wind_speed_10m?.slice(0, 8) || [0, 0, 0, 0, 0, 0, 0, 0];
                                  const windDirections = weatherData?.hourly?.wind_direction_10m?.slice(startHour, endHour) || weatherData?.hourly?.wind_direction_10m?.slice(0, 8) || [0, 0, 0, 0, 0, 0, 0, 0];
                                  const maxWind = Math.max(...windSpeeds, 0.1);
                                  
                                  const getDirectionText = (degrees) => {
                                    const directions = ['K', 'KKD', 'KD', 'DKD', 'D', 'DGD', 'GD', 'GGD', 'G', 'GGB', 'GB', 'BGB', 'B', 'BBK', 'BK', 'KBK'];
                                    return directions[Math.round(degrees / 22.5) % 16];
                                  };
                                  
                                  return (
                                    <>
                                      <defs>
                                        <linearGradient id="windGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.9"/>
                                          <stop offset="100%" stopColor="#059669" stopOpacity="0.6"/>
                                        </linearGradient>
                                        <filter id="windGlow">
                                          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                          <feMerge> 
                                            <feMergeNode in="coloredBlur"/>
                                            <feMergeNode in="SourceGraphic"/>
                                          </feMerge>
                                        </filter>
                                      </defs>
                                      {windSpeeds.map((speed, index) => {
                                        const x = (index / 7) * 350 + 25;
                                        const y = 60;
                                        const isCurrentHour = index === new Date().getHours();
                                        const direction = windDirections[index];
                                        const directionText = getDirectionText(direction);
                                        
                                        // Rüzgar hızına göre ok uzunluğu
                                        const arrowLength = maxWind > 0 ? (speed / maxWind) * 25 + 5 : 5;
                                        
                                        // Yön açısına göre ok koordinatları
                                        const radians = (direction - 90) * Math.PI / 180;
                                        const endX = x + 20 + Math.cos(radians) * arrowLength;
                                        const endY = y + Math.sin(radians) * arrowLength;
                                        
                                        return (
                                          <g key={index}>
                                            {/* Rüzgar hızı metni */}
                                            <text
                                              x={x + 20}
                                              y={y - 15}
                                              textAnchor="middle"
                                              className="fill-gray-600"
                                              fontSize="9"
                                              fontWeight="500"
                                            >
                                              {speed.toFixed(1)} km/h
                                            </text>
                                            
                                            {/* Rüzgar yönü metni */}
                                            <text
                                              x={x + 20}
                                              y={y + 35}
                                              textAnchor="middle"
                                              className="fill-gray-500"
                                              fontSize="8"
                                            >
                                              {directionText}
                                            </text>
                                            
                                            {/* Saat etiketi */}
                                            <text
                                              x={x + 20}
                                              y={y + 50}
                                              textAnchor="middle"
                                              className="fill-gray-400"
                                              fontSize="7"
                                            >
                                              {index * 3}:00
                                            </text>
                                            
                                            {/* Rüzgar oku */}
                                            <line
                                              x1={x + 20}
                                              y1={y}
                                              x2={endX}
                                              y2={endY}
                                              stroke={isCurrentHour ? "#ef4444" : "#10b981"}
                                              strokeWidth={isCurrentHour ? "3" : "2"}
                                              strokeLinecap="round"
                                              filter="url(#windGlow)"
                                            />
                                            
                                            {/* Ok başı */}
                                            <polygon
                                              points={`${endX},${endY} ${endX - Math.cos(radians - 0.3) * 6},${endY - Math.sin(radians - 0.3) * 6} ${endX - Math.cos(radians + 0.3) * 6},${endY - Math.sin(radians + 0.3) * 6}`}
                                              fill={isCurrentHour ? "#ef4444" : "#10b981"}
                                            />
                                            
                                            {/* Merkez nokta */}
                                            <circle
                                              cx={x + 20}
                                              cy={y}
                                              r={isCurrentHour ? "4" : "2"}
                                              fill={isCurrentHour ? "#ef4444" : "#10b981"}
                                              stroke="white"
                                              strokeWidth="1"
                                            />
                                          </g>
                                        );
                                      })}
                                    </>
                                  );
                                } else {
                                  // Fallback
                                  return (
                                    <polyline
                                      points="0,80 50,70 100,60 150,50 200,45 250,50 300,60 350,70 400,80"
                                      fill="none"
                                      stroke="#9ca3af"
                                      strokeWidth="2"
                                    />
                                  );
                                }
                              })()}
                            </svg>
                          </div>
                          <div className="flex justify-between text-xs text-gray-700 mt-2">
                            <span>03:00</span>
                            <span>06:00</span>
                            <span>09:00</span>
                            <span>12:00</span>
                            <span>15:00</span>
                            <span>18:00</span>
                            <span>21:00</span>
                            <span>00:00</span>
                            </div>
                            </div>
                          </div>
                    </div>
                  </div>

                  {/* Hızlı Mağaza Arama - Sağ Yarı */}
                  <div className="relative bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-600"></div>
                    </div>
                    
                          <div className="relative z-10">
                      <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl flex items-center justify-center shadow-xl">
                            <Search className="w-7 h-7 text-white" />
                            </div>
                          <div>
                            <h3 className="text-3xl font-bold text-gray-900">Hızlı Mağaza Arama (İSTANBUL - AND)</h3>
                            <p className="text-base text-gray-600">Mağaza adı veya kod ile arayın</p>
                          </div>
                        </div>
                      </div>

                      {/* Arama Kutusu */}
                      <div className="relative mb-6">
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Mağaza adı veya kod yazın..."
                          value={storeSearchTerm}
                          onChange={(e) => handleStoreSearch(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-lg"
                        />
                          {isSearching && (
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Arama Sonuçları */}
                      {searchResults.length > 0 ? (
                        <div className="space-y-3 mb-6">
                          <h4 className="text-lg font-semibold text-gray-900">Arama Sonuçları ({searchResults.length})</h4>
                          <div className="max-h-96 overflow-y-auto space-y-3">
                            {searchResults.map((store, index) => (
                            <div key={store.id || index} className="bg-white rounded-xl p-4 border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-200 cursor-pointer">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="font-semibold text-gray-900 mb-1">
                                    {store.name || store.store_name || store.mağaza_adı || 'İsimsiz Mağaza'}
                                  </h5>
                                  <div className="flex items-center gap-4 text-xs text-gray-700">
                                    {store.store_code && (
                                      <span className="flex items-center gap-1">
                                        <span className="w-3 h-3 text-center text-xs">#</span>
                                        {store.store_code}
                                      </span>
                                    )}
                                    {store.phone && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="w-3 h-3" />
                                        {store.phone}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="ml-4">
                        <button
                                    onClick={() => {
                                      // Mağaza listesine git ve seçili mağazayı aç
                                      console.log('Mağaza listesine gidiliyor:', store);
                                      const storeId = store.id || store.store_code;
                                      navigate(`/stores?selected=${storeId}`);
                                    }}
                                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200 transition-colors"
                                  >
                                    Detay Gör
                                  </button>
                            </div>
                          </div>
                            </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 mb-6">
                          <h4 className="text-lg font-semibold text-gray-900">Tüm Mağazalar ({allStores.length})</h4>
                          <div className="max-h-[620px] overflow-y-auto space-y-3">
                            {allStores
                              .sort((a, b) => {
                                const nameA = (a.name || a.store_name || a.mağaza_adı || '').toLowerCase();
                                const nameB = (b.name || b.store_name || b.mağaza_adı || '').toLowerCase();
                                return nameA.localeCompare(nameB, 'tr');
                              })
                              .filter(store => {
                                const storeName = (store.name || store.store_name || store.mağaza_adı || '').toLowerCase();
                                return !storeName.includes('altıntepe');
                              })
                              .map((store, index) => (
                            <div key={store.id || index} className="bg-white rounded-xl p-4 border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-200 cursor-pointer">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="font-semibold text-gray-900 mb-1">
                                    {store.name || store.store_name || store.mağaza_adı || 'İsimsiz Mağaza'}
                                  </h5>
                                  <div className="flex items-center gap-4 text-xs text-gray-700">
                                    {store.store_code && (
                                      <span className="flex items-center gap-1">
                                        <span className="w-3 h-3 text-center text-xs">#</span>
                                        {store.store_code}
                                      </span>
                                    )}
                                    {store.phone && (
                                      <span className="flex items-center gap-1">
                                        <Phone className="w-3 h-3" />
                                        {store.phone}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <button
                                    onClick={() => {
                                      // Mağaza listesine git ve seçili mağazayı aç
                                      console.log('Mağaza listesine gidiliyor:', store);
                                      const storeId = store.id || store.store_code;
                                      navigate(`/stores?selected=${storeId}`);
                                    }}
                                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200 transition-colors"
                                  >
                                    Detay Gör
                                  </button>
                                </div>
                              </div>
                            </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>

                {/* Recent Activity & Calendar */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
                  {/* Ultra Modern Activity Timeline */}
                  <div className="relative bg-white/80 backdrop-blur-lg rounded-2xl lg:rounded-3xl shadow-2xl border border-white/20 p-4 lg:p-8 overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600"></div>
                    </div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 lg:gap-3 mb-4 lg:mb-8">
                        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg">
                          <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg lg:text-2xl font-bold text-gray-900">Son Aktiviteler </h3>
                          <p className="text-xs lg:text-sm text-gray-600">Güncel personel durumları</p>
                        </div>
                      </div>

                      {dataStatus.dailyNotes.length === 0 ? (
                        <div className="text-center py-6 lg:py-12">
                          <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl lg:rounded-2xl flex items-center justify-center mx-auto mb-3 lg:mb-4">
                            <Clock className="w-8 h-8 lg:w-10 lg:h-10 text-gray-400" />
                          </div>
                          <h4 className="text-sm lg:text-lg font-semibold text-gray-600 mb-2">Henüz aktivite bulunmuyor</h4>
                          <p className="text-xs lg:text-sm text-gray-700">Personel aktiviteleri burada görünecek</p>
                        </div>
                      ) : (
                        <div className="relative">
                          {/* Modern Timeline Line */}
                          <div className="absolute left-4 lg:left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-green-400 via-blue-400 to-purple-400 rounded-full"></div>
                          
                          <div className="space-y-3 lg:space-y-4">
                            {dataStatus.dailyNotes.slice(0, 7).map((note, index) => {
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
                                'yillik_izin': { 
                                  color: 'purple', 
                                  bg: 'from-purple-50 to-purple-100', 
                                  border: 'border-purple-200/50',
                                  icon: '🏖️',
                                  label: 'Yıllık İzin'
                                },
                                'habersiz': { 
                                  color: 'orange', 
                                  bg: 'from-orange-50 to-orange-100', 
                                  border: 'border-orange-200/50',
                                  icon: '❌',
                                  label: 'Habersiz'
                                },
                                'gecici_gorev': { 
                                  color: 'blue', 
                                  bg: 'from-blue-50 to-blue-100', 
                                  border: 'border-blue-200/50',
                                  icon: '🔄',
                                  label: 'Geçici Görev'
                                }
                              };
                              
                              const config = statusConfig[note.status] || { 
                                color: 'gray', 
                                bg: 'from-gray-50 to-gray-100', 
                                border: 'border-gray-200/50',
                                icon: '👤',
                                label: 'Bilinmeyen Durum'
                              };

                              return (
                                <div key={index} className="relative pl-10 lg:pl-12 group">
                                  {/* Modern Timeline Dot */}
                                  <div className={`absolute left-2 lg:left-3 top-3 w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full bg-${config.color}-500 ring-2 ring-${config.color}-100 shadow-md group-hover:scale-125 transition-transform duration-300`}></div>
                                  
                                  {/* Modern Activity Card */}
                                  <div className={`relative bg-gradient-to-br ${config.bg} rounded-lg lg:rounded-xl p-2 lg:p-3 border ${config.border} hover:shadow-md transition-all duration-300 group-hover:scale-105 overflow-hidden`}>
                                    {/* Card Background Pattern */}
                                    <div className="absolute top-0 right-0 w-12 h-12 lg:w-16 lg:h-16 bg-white/20 rounded-full -translate-y-6 translate-x-6 lg:-translate-y-8 lg:translate-x-8 group-hover:scale-150 transition-transform duration-500"></div>
                                    
                                    <div className="relative z-10">
                                      <div className="flex items-center justify-between mb-1 lg:mb-2">
                                        <div className="flex items-center gap-1 lg:gap-2">
                                          <span className="text-xs lg:text-sm">{config.icon}</span>
                                          <p className="text-xs font-semibold text-gray-900 truncate">{note.full_name}</p>
                                        </div>
                                        <span className="text-xs text-gray-700 bg-white/50 px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-md">
                                          {new Date(note.date).toLocaleDateString('tr-TR')}
                                        </span>
                                      </div>
                                      
                                      <div className="flex items-center gap-1 lg:gap-2">
                                        <span className={`inline-flex items-center px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-700 border border-${config.color}-200`}>
                                          <div className={`w-1 h-1 lg:w-1.5 lg:h-1.5 bg-${config.color}-500 rounded-full mr-1 lg:mr-1.5`}></div>
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
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl overflow-hidden border border-gray-200/50 shadow-lg flex-1">
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
                                p-2 border-r border-b border-gray-200/50 min-h-[80px] relative transition-all duration-300 hover:bg-white/50 group
                                ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50/50'}
                                ${day.isToday ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300/50' : ''}
                                ${isFutureDate(new Date(day.year, day.month, day.day)) ? 'opacity-60' : ''}
                              `}
                            >
                              <div className={`
                                text-xs font-bold mb-1 flex items-center justify-between
                                ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                                ${day.isToday ? 'text-blue-600' : ''}
                              `}>
                                <span>{day.day}</span>
                                {day.isToday && (
                                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
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
                                    'raporlu': { color: 'red', icon: '🚫', label: 'Raporlu' },
                                    'dinlenme': { color: 'green', icon: '😴', label: 'Dinlenme' },
                                    'yillik_izin': { color: 'purple', icon: '🏖️', label: 'Yıllık İzin' },
                                    'habersiz': { color: 'orange', icon: '❌', label: 'Habersiz' },
                                    'gecici_gorev': { color: 'blue', icon: '🔄', label: 'Geçici Görev' }
                                  };

                                  return (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1 mb-1">
                                        <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                                        <span className="text-xs font-bold text-gray-600">
                                          {dayNotes.length} aktivite
                                        </span>
                                      </div>
                                      
                                      <div className="space-y-0.5">
                                        {dayNotes.slice(0, 2).map((note, index) => {
                                          const config = statusConfig[note.status] || { color: 'blue', icon: '👤', label: 'Aktif' };
                                          return (
                                            <div key={index} className={`text-xs px-1.5 py-0.5 rounded-md bg-${config.color}-100 text-${config.color}-700 border border-${config.color}-200 truncate flex items-center gap-1`}>
                                              <span className="text-xs">{config.icon}</span>
                                              <span className="truncate">{note.full_name}</span>
                                            </div>
                                          );
                                        })}
                                        
                                        {dayNotes.length > 2 && (
                                          <div 
                                            className="text-xs text-gray-700 bg-gray-100 rounded-md px-1.5 py-0.5 text-center border border-gray-200 cursor-help relative"
                                            title={`${dayNotes.slice(2).map(note => {
                                              const config = statusConfig[note.status] || { label: 'Aktif' };
                                              return `${note.full_name} (${config.label})`;
                                            }).join(', ')}`}
                                          >
                                            +{dayNotes.length - 2} daha
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Günlük tooltip - tüm aktiviteler */}
                                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 min-w-max">
                                        <div className="font-semibold mb-1">{day.day} {getMonthName(day.month)} {day.year}</div>
                                        {dayNotes.map((note, index) => {
                                          const config = statusConfig[note.status] || { label: 'Aktif' };
                                          return (
                                            <div key={index} className="flex items-center gap-2">
                                              <span className="text-xs">{config.icon}</span>
                                              <span>{note.full_name} - {config.label}</span>
                                            </div>
                                          );
                                        })}
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
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

            {/* Aktarma Depo Araç Listesi */}
            {activeTab === 'aktarma-vehicle-list' && (
              <TransferVehicleList />
            )}

            {/* Aktarma Dağıtım Analizi */}
            {activeTab === 'aktarma-dagitim-analizi' && (
              <TransferDistributionAnalysis />
            )}

            {/* Aktarma Personel Mağaza Zorluk Kontrol */}
            {activeTab === 'aktarma-personel-magaza-zorluk' && (
              <TransferPersonnelMagazaZorluk />
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
      {/* Profil Ayarları Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full m-4 relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Profil Ayarları</h3>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Modern Avatar Yükleme */}
              <ModernAvatarUpload
                currentAvatar={userAvatar}
                onUpload={handleAvatarUpload}
                onCancel={() => {}} // Modal'ı kapatma, sadece dosya seçimini iptal et
                uploading={uploadingAvatar}
                maxSize={5 * 1024 * 1024} // 5MB
                acceptedTypes={['image/jpeg', 'image/png', 'image/webp', 'image/gif']}
              />

              {/* Kullanıcı Bilgileri */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                    {userDetails?.full_name || user?.user_metadata?.full_name || 'Bilgi yok'}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                    {user?.email || 'Bilgi yok'}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
                    {userDetails?.role === 'admin' ? '👑 Admin' : 
                     userDetails?.role === 'yönetici' ? '⭐ Yönetici' : 
                     '👤 Kullanıcı'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Kapat
              </button>
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