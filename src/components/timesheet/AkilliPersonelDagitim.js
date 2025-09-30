import React, { useState, useEffect } from 'react';
import { 
  getAllPersonnel, 
  getAllVehicles, 
  getAllStores,
  getAllUsers,
  getWeeklySchedules,
  getPersonnelShiftDetails 
} from '../../services/supabase';
import { 
  Users, 
  MapPin, 
  Truck, 
  Brain, 
  Target, 
  BarChart3, 
  Settings, 
  Play, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Star,
  Zap,
  TrendingUp,
  Activity,
  UserCheck,
  Map,
  Calendar,
  Filter,
  Search,
  Download,
  Upload,
  Eye,
  Edit3,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Save,
  X,
  Check,
  AlertTriangle,
  Info,
  Lightbulb,
  Cpu,
  Database,
  Layers,
  GitBranch,
  Workflow,
  Network,
  Shield,
  Lock,
  Unlock,
  Key,
  Wrench,
  Cog,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Maximize,
  Minimize,
  Move,
  Copy,
  Scissors,
  Clipboard,
  FileText,
  File,
  Folder,
  FolderOpen,
  Archive,
  Package,
  Box,
  Container,
  Navigation,
  Compass,
  Globe,
  World,
  Location,
  Pin,
  Flag,
  Home,
  Building,
  Store,
  Shop,
  Mall,
  Factory,
  Warehouse,
  Office,
  School,
  Hospital,
  Bank,
  Hotel,
  Restaurant,
  Cafe,
  Gas,
  Fuel,
  Battery,
  Power,
  Plug,
  Wifi,
  Signal,
  Radio,
  Bluetooth,
  WifiOff,
  SignalZero,
  SignalLow,
  SignalMedium,
  SignalHigh,
  SignalMax,
  PieChart,
  LineChart,
  AreaChart,
  Scatter,
  Radar,
  Gauge,
  Thermometer,
  Droplets,
  Wind,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudSleet,
  CloudWind,
  CloudSun,
  CloudMoon,
  CloudSunRain,
  CloudMoonRain,
  CloudSnowRain,
  CloudLightningRain,
  CloudDrizzleRain,
  CloudFogRain,
  CloudHailRain,
  CloudSleetRain,
  CloudWindRain,
  CloudSunSnow,
  CloudMoonSnow,
  CloudSnowSnow,
  CloudLightningSnow,
  CloudDrizzleSnow,
  CloudFogSnow,
  CloudHailSnow,
  CloudSleetSnow,
  CloudWindSnow,
  CloudSunLightning,
  CloudMoonLightning,
  CloudSnowLightning,
  CloudLightningLightning,
  CloudDrizzleLightning,
  CloudFogLightning,
  CloudHailLightning,
  CloudSleetLightning,
  CloudWindLightning,
  CloudSunDrizzle,
  CloudMoonDrizzle,
  CloudSnowDrizzle,
  CloudLightningDrizzle,
  CloudDrizzleDrizzle,
  CloudFogDrizzle,
  CloudHailDrizzle,
  CloudSleetDrizzle,
  CloudWindDrizzle,
  CloudSunFog,
  CloudMoonFog,
  CloudSnowFog,
  CloudLightningFog,
  CloudDrizzleFog,
  CloudFogFog,
  CloudHailFog,
  CloudSleetFog,
  CloudWindFog,
  CloudSunHail,
  CloudMoonHail,
  CloudSnowHail,
  CloudLightningHail,
  CloudDrizzleHail,
  CloudFogHail,
  CloudHailHail,
  CloudSleetHail,
  CloudWindHail,
  CloudSunSleet,
  CloudMoonSleet,
  CloudSnowSleet,
  CloudLightningSleet,
  CloudDrizzleSleet,
  CloudFogSleet,
  CloudHailSleet,
  CloudSleetSleet,
  CloudWindSleet,
  CloudSunWind,
  CloudMoonWind,
  CloudSnowWind,
  CloudLightningWind,
  CloudDrizzleWind,
  CloudFogWind,
  CloudHailWind,
  CloudSleetWind,
  CloudWindWind
} from 'lucide-react';

const AkilliPersonelDagitim = ({ userRole, onDataUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [distributionData, setDistributionData] = useState([]);
  const [personnelData, setPersonnelData] = useState([]);
  const [vehicleData, setVehicleData] = useState([]);
  const [storeData, setStoreData] = useState([]);
  const [weeklySchedules, setWeeklySchedules] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [weeklyPlan, setWeeklyPlan] = useState({});
  const [optimizationSettings, setOptimizationSettings] = useState({
    equalDistribution: true,
    prioritizeExperience: true,
    considerDistance: true,
    considerVehicleType: true
  });

  // Haftalık plan günleri (Pazar gecesi - Cuma gecesi)
  const weekDays = [
    { key: 'pazar_gece', label: 'Pazar Gecesi', shift: 'Gece' },
    { key: 'pazartesi_gece', label: 'Pazartesi Gecesi', shift: 'Gece' },
    { key: 'sali_gece', label: 'Salı Gecesi', shift: 'Gece' },
    { key: 'carsamba_gece', label: 'Çarşamba Gecesi', shift: 'Gece' },
    { key: 'persembe_gece', label: 'Perşembe Gecesi', shift: 'Gece' },
    { key: 'cuma_gece', label: 'Cuma Gecesi', shift: 'Gece' }
  ];

  // Uzak noktalar
  const distantStores = ['Sakarya', 'Kocaeli', 'Gebze'];
  
  // Vardiya filtreleme - planlamaya dahil edilmeyecek vardiyalar
  const excludedShifts = ['Akşam', 'Raporlu', 'Geçici', 'Yıllık İzin'];
  
  // Görev tipleri
  const jobTypes = {
    SEVKIYAT_ELEMANI: 'SEVKİYAT ELEMANI',
    SOFOR: 'ŞOFÖR'
  };

  // Haftalık plan oluşturma - weekly_schedules tablosundan güncel vardiya verilerini kullan
  const generateWeeklyPlan = async () => {
    const plan = {};
    
    try {
      // Önce weekly_schedules tablosundan gece vardiyası olan employee_code'ları çek
      const geceEmployeeCodes = weeklySchedules
        .filter(schedule => schedule.shift_type === 'gece')
        .map(schedule => schedule.employee_code);
      
      // Unique employee_code'ları al
      const uniqueGeceEmployeeCodes = [...new Set(geceEmployeeCodes)];
      console.log('🌙 Gece vardiyası employee_code sayısı:', uniqueGeceEmployeeCodes.length);
      console.log('🔍 Gece vardiyası employee_code\'lar:', uniqueGeceEmployeeCodes);
      
      // Personnel tablosundan bu employee_code'lara sahip personelleri bul
      const gecePersonnelList = personnelData.filter(person => {
        const personEmployeeCode = person.employee_code || person.id;
        return uniqueGeceEmployeeCodes.includes(personEmployeeCode);
      });
      
      console.log('👥 Personnel tablosundan bulunan gece personel sayısı:', gecePersonnelList.length);
      console.log('👥 Bulunan gece personeller:', gecePersonnelList.map(p => ({
        employee_code: p.employee_code || p.id,
        full_name: p.full_name || p.employee_name
      })));
      
      // Eğer personnel tablosunda bulunamadıysa, weekly_schedules'den direkt oluştur
      if (gecePersonnelList.length === 0) {
        console.log('⚠️ Personnel tablosunda eşleşme bulunamadı, weekly_schedules\'den oluşturuluyor...');
        
        // weekly_schedules'den gece vardiyası olan personelleri grupla
        const personnelGroups = {};
        weeklySchedules
          .filter(schedule => schedule.shift_type === 'gece')
          .forEach(schedule => {
            if (!personnelGroups[schedule.employee_code]) {
              personnelGroups[schedule.employee_code] = {
                employee_code: schedule.employee_code,
                full_name: schedule.full_name || 'Bilinmeyen',
                position: schedule.position || 'SEVKİYAT ELEMANI',
                schedules: []
              };
            }
            personnelGroups[schedule.employee_code].schedules.push(schedule);
          });
        
        const weeklySchedulesPersonnel = Object.values(personnelGroups);
        console.log('📅 Weekly_schedules\'den oluşturulan personel sayısı:', weeklySchedulesPersonnel.length);
        
        weekDays.forEach(day => {
          const dayVehicles = vehicleData.filter(v => v && v.license_plate);
          
          plan[day.key] = {
            day: day.label,
            shift: day.shift,
            assignments: assignPersonnelToVehicles(weeklySchedulesPersonnel, dayVehicles, storeData),
            totalPersonnel: weeklySchedulesPersonnel.length,
            totalVehicles: dayVehicles.length
          };
        });
      } else {
        // Personnel tablosundan bulunan personelleri kullan
        weekDays.forEach(day => {
          const dayVehicles = vehicleData.filter(v => v && v.license_plate);
          
          plan[day.key] = {
            day: day.label,
            shift: day.shift,
            assignments: assignPersonnelToVehicles(gecePersonnelList, dayVehicles, storeData),
            totalPersonnel: gecePersonnelList.length,
            totalVehicles: dayVehicles.length
          };
        });
      }
      
      setWeeklyPlan(plan);
      console.log('📅 Haftalık plan oluşturuldu:', plan);
      
    } catch (error) {
      console.error('Haftalık plan oluşturma hatası:', error);
    }
  };

  // Personel verilerini filtrele - sadece aktif personeller
  const getFilteredPersonnel = () => {
    return personnelData.filter(person => 
      person.is_active !== false // is_active false değilse aktif kabul et
    );
  };

  // Araç atama mantığı - DÜZGÜN MANTIK
  const assignPersonnelToVehicles = (personnel, vehicles, stores) => {
    const distribution = [];
    
    // Personelleri rastgele dağıt
    const shuffledPersonnel = [...personnel].sort(() => Math.random() - 0.5);
    
    // Her araç için 1 ŞOFÖR + 2 SEVKİYAT ELEMANI ataması
    vehicles.forEach((vehicle, index) => {
      // Araç plakası kontrolü
      const vehiclePlate = vehicle.license_plate || vehicle.plate;
      if (!vehiclePlate) return;
      
      // Sabit şoförleri kontrol et
      let assignedSofor = null;
      if (vehicle.first_driver && vehicle.first_driver !== 'Belirtilmemiş') {
        // Sabit şoför varsa onu kullan
        assignedSofor = {
          adSoyad: vehicle.first_driver,
          sicilNo: 'SABİT',
          gorev: 'ŞOFÖR',
          deneyim: 5
        };
      } else if (shuffledPersonnel.length > 0) {
        // Sabit şoför yoksa, rastgele personeli şoför yap
        const randomPerson = shuffledPersonnel[index % shuffledPersonnel.length];
        assignedSofor = {
          adSoyad: randomPerson.full_name || randomPerson.employee_name,
          sicilNo: randomPerson.employee_code || randomPerson.id,
          gorev: 'ŞOFÖR',
          deneyim: 3
        };
      }
      
      // Kalan personelleri SEVKİYAT ELEMANI yap
      const remainingPersonnel = shuffledPersonnel.filter((_, i) => i !== (index % shuffledPersonnel.length));
      const assignedSevkiyat1 = remainingPersonnel[index * 2] ? {
        adSoyad: remainingPersonnel[index * 2].full_name || remainingPersonnel[index * 2].employee_name,
        sicilNo: remainingPersonnel[index * 2].employee_code || remainingPersonnel[index * 2].id,
        gorev: 'SEVKİYAT ELEMANI',
        deneyim: 2
      } : null;
      
      const assignedSevkiyat2 = remainingPersonnel[index * 2 + 1] ? {
        adSoyad: remainingPersonnel[index * 2 + 1].full_name || remainingPersonnel[index * 2 + 1].employee_name,
        sicilNo: remainingPersonnel[index * 2 + 1].employee_code || remainingPersonnel[index * 2 + 1].id,
        gorev: 'SEVKİYAT ELEMANI',
        deneyim: 2
      } : null;
      
      // Store ataması - uzak noktalar için Kamyon, yakın noktalar için diğer araçlar
      const suitableStores = stores.filter(store => {
        const isDistant = distantStores.some(distant => store.name.includes(distant));
        if (isDistant) {
          return vehicle.vehicle_type === 'Kamyon' || vehicle.type === 'Kamyon';
        } else {
          return vehicle.vehicle_type === 'Kamyonet' || vehicle.vehicle_type === 'Panelvan' || 
                 vehicle.type === 'Kamyonet' || vehicle.type === 'Panelvan';
        }
      });
      
      const assignedStore = suitableStores[index % suitableStores.length] || stores[index % stores.length];
      
      if (assignedSofor && assignedSevkiyat1 && assignedSevkiyat2) {
        distribution.push({
          id: index + 1,
          vehicle: {
            plate: vehiclePlate,
            type: vehicle.vehicle_type || vehicle.type,
            sofor1: vehicle.first_driver,
            sofor2: vehicle.second_driver
          },
          assignedPersonnel: {
            sofor: assignedSofor,
            sevkiyat1: assignedSevkiyat1,
            sevkiyat2: assignedSevkiyat2
          },
          store: assignedStore,
          isDistant: distantStores.some(distant => assignedStore.name.includes(distant)),
          efficiency: calculateEfficiency(assignedSofor, assignedSevkiyat1, assignedSevkiyat2, assignedStore),
          estimatedTime: calculateEstimatedTime(assignedStore, vehicle.vehicle_type || vehicle.type)
        });
      }
    });
    
    console.log('🚛 Araç atamaları oluşturuldu:', distribution.length, 'atama');
    return distribution;
  };

  // Verimlilik hesaplama
  const calculateEfficiency = (sofor, sevkiyat1, sevkiyat2, store) => {
    let efficiency = 70; // Base efficiency
    
    // Deneyim faktörü
    const avgExperience = (sofor.deneyim + sevkiyat1.deneyim + sevkiyat2.deneyim) / 3;
    efficiency += Math.min(avgExperience * 2, 20);
    
    // Uzak nokta bonusu
    if (distantStores.some(distant => store.name.includes(distant))) {
      efficiency += 5;
    }
    
    return Math.min(Math.round(efficiency), 100);
  };

  // Tahmini süre hesaplama
  const calculateEstimatedTime = (store, vehicleType) => {
    let baseTime = 60; // Base time in minutes
    
    // Uzak nokta süresi
    if (distantStores.some(distant => store.name.includes(distant))) {
      baseTime += 30;
    }
    
    // Araç tipi faktörü
    if (vehicleType === 'Kamyon') {
      baseTime += 10;
    } else if (vehicleType === 'Kamyonet') {
      baseTime -= 5;
    } else if (vehicleType === 'Panelvan') {
      baseTime -= 10;
    }
    
    return baseTime;
  };

  const handleOptimizeDistribution = async () => {
    setIsLoading(true);
    try {
      // Gerçek verileri yükle - weekly_schedules tablosundan güncel vardiya verilerini çek
      const [personnelResult, vehicleResult, storeResult, schedulesResult] = await Promise.all([
        getAllPersonnel(),
        getAllVehicles(),
        getAllStores(),
        getWeeklySchedules()
      ]);
      
      if (personnelResult.success) {
        // Personnel tablosundan aktif personelleri al
        const personnel = personnelResult.data.filter(person => 
          person.is_active !== false // is_active false değilse aktif kabul et
        );
        setPersonnelData(personnel);
        console.log('📊 Yüklenen personel sayısı:', personnel.length);
      }
      
      if (vehicleResult.success) {
        setVehicleData(vehicleResult.data || []);
        console.log('🚛 Yüklenen araç sayısı:', vehicleResult.data?.length || 0);
      }
      
      if (storeResult.success) {
        setStoreData(storeResult.data || []);
        console.log('🏪 Yüklenen mağaza sayısı:', storeResult.data?.length || 0);
      }
      
      if (schedulesResult.success) {
        setWeeklySchedules(schedulesResult.data || []);
        console.log('📅 Yüklenen vardiya sayısı:', schedulesResult.data?.length || 0);
        console.log('🌙 Gece vardiyası sayısı:', schedulesResult.data?.filter(s => s.shift_type === 'gece').length || 0);
      }
      
      // Haftalık plan oluştur
      await generateWeeklyPlan();
      
    } catch (error) {
      console.error('Optimizasyon hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEfficiencyColor = (efficiency) => {
    if (efficiency >= 90) return 'text-green-600 bg-green-100';
    if (efficiency >= 80) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Kolay': return 'text-green-600 bg-green-100';
      case 'Orta': return 'text-yellow-600 bg-yellow-100';
      case 'Zor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                <Brain className="w-8 h-8 inline-block mr-3 text-purple-600" />
                Akıllı Personel Dağıtım Sistemi
              </h1>
              <p className="text-gray-600 text-lg">
                Pazar gecesi - Cuma gecesi haftalık personel dağıtım planı
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Hafta:</label>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Bu Hafta</option>
                  <option value="next">Gelecek Hafta</option>
                </select>
              </div>
              <button
                onClick={handleOptimizeDistribution}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
                {isLoading ? 'Plan Oluşturuluyor...' : 'Haftalık Plan Oluştur'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Gece Vardiyası Personel</p>
                <p className="text-2xl font-bold text-gray-900">{personnelData.filter(p => p.vardiya === 'Gece').length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Toplam Araç</p>
                <p className="text-2xl font-bold text-gray-900">{vehicleData.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Truck className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Uzak Nokta</p>
                <p className="text-2xl font-bold text-gray-900">{distantStores.length}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Ortalama Verimlilik</p>
                <p className="text-2xl font-bold text-gray-900">
                  {distributionData.length > 0 
                    ? Math.round(distributionData.reduce((sum, item) => sum + item.efficiency, 0) / distributionData.length)
                    : 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sol Panel - Algoritma Seçimi ve Ayarlar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-blue-600" />
                Dağıtım Ayarları
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plan Türü
                  </label>
                  <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600">
                    Pazar Gecesi - Cuma Gecesi Haftalık Plan
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Gece vardiyası personelleri için 6 günlük haftalık dağıtım planı
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Optimizasyon Kriterleri</h4>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={optimizationSettings.equalDistribution}
                      onChange={(e) => setOptimizationSettings(prev => ({
                        ...prev,
                        equalDistribution: e.target.checked
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Eşit dağıtım yap</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={optimizationSettings.prioritizeExperience}
                      onChange={(e) => setOptimizationSettings(prev => ({
                        ...prev,
                        prioritizeExperience: e.target.checked
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Deneyimli personeli önceliklendir</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={optimizationSettings.considerDistance}
                      onChange={(e) => setOptimizationSettings(prev => ({
                        ...prev,
                        considerDistance: e.target.checked
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Mesafeyi dikkate al</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={optimizationSettings.considerVehicleType}
                      onChange={(e) => setOptimizationSettings(prev => ({
                        ...prev,
                        considerVehicleType: e.target.checked
                      }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Araç tipini dikkate al</span>
                  </label>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Dağıtım Kuralları</h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Her araç: 1 ŞOFÖR + 2 SEVKİYAT ELEMANI</li>
                    <li>• Uzak noktalar (Sakarya, Kocaeli, Gebze) → Kamyon</li>
                    <li>• Yakın noktalar → Kamyonet/Panelvan</li>
                    <li>• Sabit şoförler değiştirilmez</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* AI Önerileri */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl shadow-lg border border-purple-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Lightbulb className="w-5 h-5 mr-2 text-yellow-600" />
                Akıllı Öneriler
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">
                    Uzak noktalara (Sakarya, Kocaeli, Gebze) deneyimli şoförleri atayın
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">
                    Kamyon araçları uzak noktalar için rezerve edin
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">
                    SEVKİYAT ELEMANI'ları eşit olarak dağıtın
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700">
                    Sabit şoförleri kendi araçlarında tutun
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sağ Panel - Dağıtım Sonuçları */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-green-600" />
                  Optimizasyon Sonuçları
                </h3>
              </div>
              
              <div className="p-6">
                {Object.keys(weeklyPlan).length === 0 ? (
                  <div className="text-center py-12">
                    <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Henüz haftalık plan oluşturulmadı
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Pazar gecesi - Cuma gecesi haftalık planını oluşturmak için yukarıdaki butona tıklayın
                    </p>
                    <button
                      onClick={handleOptimizeDistribution}
                      disabled={isLoading}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                      {isLoading ? 'Plan Oluşturuluyor...' : 'Haftalık Plan Oluştur'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {weekDays.map((day) => {
                      const dayPlan = weeklyPlan[day.key];
                      if (!dayPlan) return null;
                      
                      return (
                        <div key={day.key} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                                {day.label.split(' ')[0].charAt(0)}
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">{day.label}</h3>
                                <p className="text-sm text-gray-500">{dayPlan.totalPersonnel} personel, {dayPlan.totalVehicles} araç</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {dayPlan.assignments.length} atama
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {dayPlan.assignments.map((item) => (
                              <div key={item.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                      {item.vehicle.plate.slice(-3)}
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-gray-900 text-sm">{item.vehicle.plate}</h4>
                                      <p className="text-xs text-gray-500">{item.vehicle.type}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEfficiencyColor(item.efficiency)}`}>
                                      %{item.efficiency}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Personel Atamaları */}
                                <div className="space-y-2">
                                  <div className="bg-blue-100 rounded p-2">
                                    <div className="flex items-center space-x-1 mb-1">
                                      <UserCheck className="w-3 h-3 text-blue-600" />
                                      <span className="text-xs font-medium text-blue-900">ŞOFÖR</span>
                                    </div>
                                    <p className="text-xs text-blue-800">{item.assignedPersonnel.sofor.adSoyad}</p>
                                  </div>
                                  
                                  <div className="bg-green-100 rounded p-2">
                                    <div className="flex items-center space-x-1 mb-1">
                                      <Users className="w-3 h-3 text-green-600" />
                                      <span className="text-xs font-medium text-green-900">SEVKİYAT</span>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-xs text-green-800">{item.assignedPersonnel.sevkiyat1.adSoyad}</p>
                                      <p className="text-xs text-green-800">{item.assignedPersonnel.sevkiyat2.adSoyad}</p>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Mağaza Bilgisi */}
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <div className="flex items-center space-x-1">
                                    <MapPin className="w-3 h-3 text-gray-500" />
                                    <p className="text-xs text-gray-600 truncate">{item.store.name}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AkilliPersonelDagitim;
