// Kodun başına aşağıdaki yorumu ekle:
// Gündüz bölgeleri: Karşı, Anadolu (Toplam: 2)
import React, { useState, useEffect } from 'react';
import { 
  Users, Car, Truck, MapPin, Calendar, Filter, Search, RefreshCw, 
  Download, Eye, EyeOff, Sun, Moon, Clock, AlertCircle, CheckCircle,
  BarChart3, Settings, RotateCcw, Save, FileText, UserCheck, Plus, Minus
} from 'lucide-react';
import { 
  getAllPersonnel, 
  getAllVehicles, 
  getAllStores,
  getCurrentWeeklyShifts,
  getPersonnelShiftDetails,
  supabase
} from '../../services/supabase';
import { Table, Card, Button, Space, Tag, Tooltip, Alert, Spin, Row, Col, Statistic } from 'antd';

const AkilliDagitim = ({ userRole, onDataUpdate }) => {
  const [personnelData, setPersonnelData] = useState([]);
  const [vehicleData, setVehicleData] = useState([]);
  const [storeData, setStoreData] = useState([]);
  const [currentShifts, setCurrentShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  const [currentWeek, setCurrentWeek] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    enableLeaveExclusion: true,
    enablePreviousDayConsideration: true,
    allowEmptySpotsForSmallVehicles: true
  });

  // Vardiya bilgileri için state
  const [shiftInfo, setShiftInfo] = useState({
    gunduzDrivers: [],
    geceDrivers: [],
    gunduzDeliveryStaff: [],
    geceDeliveryStaff: []
  });

  // Sabit araç plakaları (8 araç) - Veritabanından alınan doğru plakalar
  const fixedVehiclePlates = [
    '34FKL846', // Kamyonet
    '34NBJ082', // Kamyonet
    '34NBU785', // Panelvan
    '34KMG185', // Kamyon
    '34TD3822', // Kamyon
    '34KKR356', // Kamyon
    '34CGY867', // Kamyon
    '34CGY821'  // Kamyon
  ];

  // Araç listesinden sabit araçları filtrele
  const getFixedVehicles = () => {
    // Araç verileri yüklenmediyse veya undefined ise, manuel araç listesi oluştur
    if (!vehicleData || vehicleData.length === 0 || vehicleData.some(v => v === undefined)) {
      // Manuel araç listesi oluştur
      const manualVehicles = fixedVehiclePlates.map((plate, index) => {
        let type = 'Kamyon';
        if (plate === '34NBU785') type = 'Panelvan';
        if (plate === '34NBJ082' || plate === '34FKL846') type = 'Kamyonet';
        
        return {
          id: `manual_${index}`,
          plate: plate,
          type: type,
          capacity: type === 'Kamyon' ? '5 ton' : type === 'Panelvan' ? '1.5 ton' : '2 ton',
          region: 'istanbul_anadolu',
          driver1: null, // Manuel listede sabit şoför yok
          driver2: null
        };
      });
      
      return manualVehicles;
    }

    const foundVehicles = fixedVehiclePlates.map(plate => {
      const vehicle = vehicleData.find(v => v && v.license_plate === plate);
      if (vehicle) {
        return {
          id: vehicle.id,
          plate: vehicle.license_plate,
          type: vehicle.vehicle_type,
          capacity: vehicle.capacity || 'N/A',
          region: 'istanbul_anadolu',
          driver1: vehicle.first_driver,
          driver2: vehicle.second_driver
        };
      } else {
        // Bulunamayan araç için manuel oluştur
        let type = 'Kamyon';
        if (plate === '34NBU785') type = 'Panelvan';
        if (plate === '34NBJ082' || plate === '34FKL846') type = 'Kamyonet';
        
        return {
          id: `not_found_${plate}`,
          plate: plate,
          type: type,
          capacity: type === 'Kamyon' ? '5 ton' : type === 'Panelvan' ? '1.5 ton' : '2 ton',
          region: 'istanbul_anadolu',
          driver1: null,
          driver2: null
        };
      }
    });

    return foundVehicles;
  };

  // Bölgeler - Personel Konum Dağılımı'ndaki bölgelere göre
  const regions = {
    // Gündüz ekipleri için bölgeler (karşı, anadolu ve avşa)
    gunduz: {
      karsi: 'Karşı',
      anadolu: 'Anadolu',
      avsa: 'Balıkesir-Avşa'
    },
    // Gece ekipleri için bölgeler (araç tipine göre ayrılmış)
    gece: {
      // Panelvan ve Kamyonet için bölgeler
      panelvanKamyonet: {
        sile: 'Şile'
      },
      // Kamyon için bölgeler
      kamyon: {
        sakarya: 'Sakarya',
        kocaeli: 'Kocaeli',
        gebze: 'Gebze'
      },
      // Genel bölgeler (tüm araç tipleri için)
      genel: {
        atasehir: 'Ataşehir/Ümraniye/Üsküdar',
        kadikoy: 'Kadıköy',
        maltepe: 'M.tepe/Kartal/Pendik',
        beykoz: 'Beykoz/Ç.köy/S.tepe/S.beyliği'
      }
    }
  };

  // Bölge renk haritası - StoreDistribution.js'den al
  const regionColors = {
    'Ataşehir/Ümraniye/Üsküdar': 'bg-blue-100 text-blue-800 border-blue-300',
    'Balıkesir-Avşa': 'bg-green-100 text-green-800 border-green-300',
    'Beykoz/Ç.köy/S.tepe/S.beyliği': 'bg-purple-100 text-purple-800 border-purple-300',
    'Gebze': 'bg-orange-100 text-orange-800 border-orange-300',
    'Kadıköy': 'bg-red-100 text-red-800 border-red-300',
    'Kocaeli': 'bg-indigo-100 text-indigo-800 border-indigo-300',
    'M.tepe/Kartal/Pendik': 'bg-pink-100 text-pink-800 border-pink-300',
    'Sakarya': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'Şile': 'bg-teal-100 text-teal-800 border-teal-300',
    'Karşı': 'bg-red-100 text-red-800 border-red-300',
    'Anadolu': 'bg-blue-100 text-blue-800 border-blue-300'
  };

  useEffect(() => {
    loadData();
  }, []);

    const loadData = async () => {
    try {
      setLoading(true);
      
      // Personel verilerini yükle
      const personnelResult = await getAllPersonnel();
      if (personnelResult.success) {
        setPersonnelData(personnelResult.data);
      }

      // Araç verilerini yükle
      const vehicleResult = await getAllVehicles();
      if (vehicleResult.success) {
        setVehicleData(vehicleResult.data);
      }

      // Mağaza verilerini yükle
      const storeResult = await getAllStores();
      if (storeResult.success) {
        setStoreData(storeResult.data);
      }

      // Personel Kontrol mantığı ile vardiya verilerini yükle
      try {
        // En güncel dönemi bul
        const { data: periods, error: periodsError } = await supabase
          .from('weekly_periods')
          .select('*')
          .order('start_date', { ascending: false })
          .limit(1);
        
        if (periodsError) {
          setCurrentShifts([]);
        } else if (periods && periods.length > 0) {
          const latestPeriod = periods[0];
          
          // Bu dönemdeki tüm vardiya verilerini getir
          const { data: shifts, error: shiftsError } = await supabase
            .from('weekly_schedules')
            .select('*')
            .eq('period_id', latestPeriod.id)
            .order('employee_code', { ascending: true });
          
          if (shiftsError) {
            setCurrentShifts([]);
          } else if (shifts && shifts.length > 0) {
            setCurrentShifts(shifts);
            
            // Güncel hafta bilgisini al
            if (latestPeriod.week_label) {
              setCurrentWeek(latestPeriod.week_label);
            }
          } else {
            setCurrentShifts([]);
          }
        } else {
          setCurrentShifts([]);
        }
      } catch (error) {
        setCurrentShifts([]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      setLoading(false);
    }
  };

  // Personel kategorilerini ayır
  const categorizePersonnel = () => {
    const anadoluPersonnel = personnelData.filter(person => 
      person.position === 'ŞOFÖR' || person.position === 'SEVKİYAT ELEMANI'
    );

    const soforler = anadoluPersonnel.filter(person => 
      person.position === 'ŞOFÖR'
    );

    const sevkiyatElemanlari = anadoluPersonnel.filter(person => 
      person.position === 'SEVKİYAT ELEMANI'
    );

    // Gündüz ve gece vardiyasına göre ayır
    const gunduzSoforler = soforler.filter(person => {
      const shiftStatus = getCurrentShiftStatus(person.employee_code);
      // Sadece gece vardiyasında olmayan şoförler gündüz ekibine dahil
      return shiftStatus !== 'gece' && shiftStatus !== 'raporlu' && shiftStatus !== 'yillik_izin';
    });

    const geceSoforler = soforler.filter(person => {
      const shiftStatus = getCurrentShiftStatus(person.employee_code);
      // Sadece gece vardiyasında olan şoförler
      return shiftStatus === 'gece';
    });

    const gunduzSevkiyatElemanlari = sevkiyatElemanlari.filter(person => {
      const shiftStatus = getCurrentShiftStatus(person.employee_code);
      // Sadece gece vardiyasında olmayan sevkiyat elemanları gündüz ekibine dahil
      return shiftStatus !== 'gece' && shiftStatus !== 'raporlu' && shiftStatus !== 'yillik_izin';
    });

    const geceSevkiyatElemanlari = sevkiyatElemanlari.filter(person => {
      const shiftStatus = getCurrentShiftStatus(person.employee_code);
      // Sadece gece vardiyasında olan sevkiyat elemanları
      return shiftStatus === 'gece';
    });

    console.log('🌅 Gündüz şoför sayısı:', gunduzSoforler.length, gunduzSoforler.map(s => s.full_name));
    console.log('🌙 Gece şoför sayısı:', geceSoforler.length, geceSoforler.map(s => s.full_name));
    console.log('🌅 Gündüz sevkiyat elemanı sayısı:', gunduzSevkiyatElemanlari.length, gunduzSevkiyatElemanlari.map(s => s.full_name));
    console.log('🌙 Gece sevkiyat elemanı sayısı:', geceSevkiyatElemanlari.length, geceSevkiyatElemanlari.map(s => s.full_name));
    
    // Vardiya durumlarını detaylı göster
    console.log('📊 Vardiya durumları:');
    personnelData.forEach(person => {
      const shiftStatus = getCurrentShiftStatus(person.employee_code);
      console.log(`  ${person.full_name} (${person.position}): ${shiftStatus || 'Vardiya verisi yok'}`);
    });

    return { 
      soforler, 
      sevkiyatElemanlari, 
      anadoluPersonnel,
      gunduzSoforler,
      geceSoforler,
      gunduzSevkiyatElemanlari,
      geceSevkiyatElemanlari
    };
  };

  // Güncel vardiya durumunu kontrol et
  const getCurrentShiftStatus = (employeeCode) => {
    const shift = currentShifts.find(s => s.employee_code === employeeCode);
    if (shift) {
      console.log(`🔍 ${employeeCode} vardiya durumu:`, shift.shift_type);
      return shift.shift_type;
    }
    console.log(`⚠️ ${employeeCode} için vardiya verisi bulunamadı`);
    return null;
  };

  // Müsait personeli filtrele
  const filterAvailablePersonnel = (personnelList) => {
    if (!settings.enableLeaveExclusion) {
      return personnelList;
    }

    // Zaten kategorize ederken raporlu ve yıllık izindeki personeli çıkardık
    // Burada sadece ek kontroller yapabiliriz
    return personnelList.filter(person => {
      const shiftStatus = getCurrentShiftStatus(person.employee_code);
      // Eğer hala raporlu veya yıllık izindeyse çıkar
      return shiftStatus !== 'raporlu' && shiftStatus !== 'yillik_izin';
    });
  };

    // Haftalık plan oluştur
  const generateWeeklyPlan = () => {
    const { 
      soforler, 
      sevkiyatElemanlari, 
      gunduzSoforler, 
      geceSoforler, 
      gunduzSevkiyatElemanlari, 
      geceSevkiyatElemanlari 
    } = categorizePersonnel();
    
    // Müsait personeli filtrele (gündüz ve gece ayrı)
    const availableGunduzDrivers = filterAvailablePersonnel(gunduzSoforler);
    const availableGeceDrivers = filterAvailablePersonnel(geceSoforler);
    const availableGunduzDeliveryStaff = filterAvailablePersonnel(gunduzSevkiyatElemanlari);
    const availableGeceDeliveryStaff = filterAvailablePersonnel(geceSevkiyatElemanlari);

    console.log(' Müsait gündüz şoförleri:', availableGunduzDrivers.length, availableGunduzDrivers.map(d => d.full_name));
    console.log('🌙 Müsait gece şoförleri:', availableGeceDrivers.length, availableGeceDrivers.map(d => d.full_name));
    console.log('🌅 Müsait gündüz sevkiyat elemanları:', availableGunduzDeliveryStaff.length, availableGunduzDeliveryStaff.map(s => s.full_name));
    console.log('🌙 Müsait gece sevkiyat elemanları:', availableGeceDeliveryStaff.length, availableGeceDeliveryStaff.map(s => s.full_name));

    // Vardiya bilgilerini state'e kaydet
    setShiftInfo({
      gunduzDrivers: availableGunduzDrivers,
      geceDrivers: availableGeceDrivers,
      gunduzDeliveryStaff: availableGunduzDeliveryStaff,
      geceDeliveryStaff: availableGeceDeliveryStaff
    });

    // Sabit araçları al
    const fixedVehicles = getFixedVehicles();
    
    if (fixedVehicles.length === 0) {
      const errorMessage = `Araç verileri yüklenemedi!\n\nMevcut araç sayısı: ${vehicleData.length}\nAranan plakalar: ${fixedVehiclePlates.join(', ')}\n\nLütfen sayfayı yenileyin veya araç listesini kontrol edin.`;
      alert(errorMessage);
      return;
    }

    console.log('✅ Bulunan araçlar:', fixedVehicles.map(v => `${v.plate} (${v.type}) - Sabit Şoför1: ${v.driver1 || 'Yok'} - Sabit Şoför2: ${v.driver2 || 'Yok'}`));

    // Haftalık plan oluştur - Gündüz ve gece ayrı
    const weekDays = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    const weeklyPlan = {
      gunduz: {},
      gece: {}
    };

    // Gündüz planı oluştur (2 ekip, 2 gün Karşı / 2 gün Anadolu rotasyonu)
    weekDays.forEach((day, dayIndex) => {
      const dayPlan = {
        date: getDateForDay(dayIndex),
        ekip1: {}, // 1. Ekip
        ekip2: {}  // 2. Ekip
      };

      // 2 gün Karşı / 2 gün Anadolu rotasyonu + Avşa rotasyonu
      const isKarşıWeek = Math.floor(dayIndex / 2) % 2 === 0; // 0-1: Karşı, 2-3: Anadolu, 4-5: Karşı, 6: Anadolu
      const isKarşıDay = dayIndex % 2 === 0; // Pazartesi, Çarşamba, Cuma, Pazar: Karşı
      
      // Avşa rotasyonu - 2 haftada 1 ekip Avşa için gider
      const currentWeek = Math.floor(new Date().getTime() / (7 * 24 * 60 * 60 * 1000));
      const isAvsaWeek = currentWeek % 2 === 0; // Çift haftalar Avşa haftası
      const isAvsaDay = dayIndex === 0; // Sadece Pazartesi Avşa'ya gider
      
      // 1. Ekip için şoför ata (günlük değişir)
      if (availableGunduzDrivers.length > 0) {
        const driverIndex = dayIndex % availableGunduzDrivers.length;
        const selectedDriver = availableGunduzDrivers[driverIndex];
        dayPlan.ekip1.driver = selectedDriver;
        console.log(`🌅 ${day} - 1. Ekip - Şoför: ${selectedDriver.full_name}`);
      }
      
      // 1. Ekip için 2 sevkiyat elemanı ata (sabit - hafta boyunca aynı)
      const ekip1DeliveryStaff = availableGunduzDeliveryStaff.slice(0, 2);
      dayPlan.ekip1.deliveryStaff = ekip1DeliveryStaff;
      
      // 1. Ekip bölge ataması
      if (isAvsaWeek && isAvsaDay) {
        dayPlan.ekip1.region = 'Balıkesir-Avşa';
      } else {
        dayPlan.ekip1.region = isKarşıDay ? 'Karşı' : 'Anadolu';
      }
      console.log(`🌅 ${day} - 1. Ekip - Sevkiyat: ${ekip1DeliveryStaff.map(s => s.full_name).join(', ')} - Bölge: ${dayPlan.ekip1.region}`);
      
      // 2. Ekip için şoför ata (günlük değişir, 1. Ekip'ten farklı)
      if (availableGunduzDrivers.length > 1) {
        const driverIndex = (dayIndex + 1) % availableGunduzDrivers.length; // Farklı şoför
        const selectedDriver = availableGunduzDrivers[driverIndex];
        dayPlan.ekip2.driver = selectedDriver;
        console.log(`🌅 ${day} - 2. Ekip - Şoför: ${selectedDriver.full_name}`);
      } else if (availableGunduzDrivers.length === 1) {
        // Sadece 1 şoför varsa aynı kişiyi kullan
        dayPlan.ekip2.driver = availableGunduzDrivers[0];
        console.log(`🌅 ${day} - 2. Ekip - Şoför: ${availableGunduzDrivers[0].full_name} (tek şoför)`);
      }
      
      // 2. Ekip için 2 sevkiyat elemanı ata (sabit - hafta boyunca aynı)
      const ekip2DeliveryStaff = availableGunduzDeliveryStaff.slice(2, 4);
      dayPlan.ekip2.deliveryStaff = ekip2DeliveryStaff;
      
      // 2. Ekip bölge ataması
      if (isAvsaWeek && isAvsaDay) {
        dayPlan.ekip2.region = 'Anadolu'; // 1. Ekip Avşa'ya giderse, 2. Ekip Anadolu'ya
      } else {
        dayPlan.ekip2.region = isKarşıDay ? 'Anadolu' : 'Karşı'; // 1. Ekip'in tersi
      }
      console.log(`🌅 ${day} - 2. Ekip - Sevkiyat: ${ekip2DeliveryStaff.map(s => s.full_name).join(', ')} - Bölge: ${dayPlan.ekip2.region}`);

      weeklyPlan.gunduz[day] = dayPlan;
    });



    // 2. Kaydırmalı rotasyon fonksiyonu
    function rotateArray(arr, n) {
      if (!arr.length) return arr;
      const k = n % arr.length;
      return arr.slice(k).concat(arr.slice(0, k));
    }

    // 3. Bölge uzaklık sınıflandırması
    const regionDistance = {
      'Sakarya': 'uzak',
      'Kocaeli': 'uzak', 
      'Gebze': 'uzak',
      'Şile': 'orta',
      'Balıkesir-Avşa': 'orta',
      'Ataşehir/Ümraniye/Üsküdar': 'yakın',
      'Kadıköy': 'yakın',
      'M.tepe/Kartal/Pendik': 'yakın',
      'Beykoz/Ç.köy/S.tepe/S.beyliği': 'yakın'
    };

    // Gece planı oluştur (8 araç, uzak bölgeler)
    weekDays.forEach((day, dayIndex) => {
      const dayPlan = {
        date: getDateForDay(dayIndex),
        vehicles: {}
      };
      const geceVehicles = getFixedVehicles();

      // --- GÜNLÜK ATANAN PERSONEL TAKİBİ ---
      const assignedDrivers = new Set();
      const assignedDeliveryStaff = new Set();

      // --- ŞİLE VE SAKARYA İÇİN ÖZEL ARAÇ BELİRLEME ---
      // Şile ve Sakarya için sabit araçlar belirle (hafta boyunca aynı araç)
      const sileVehicle = geceVehicles.find(v => v.type === 'Panelvan' || v.type === 'Kamyonet');
      const sakaryaVehicle = geceVehicles.find(v => v.type === 'Kamyon' && v !== sileVehicle);

      geceVehicles.forEach((vehicle, vehicleIndex) => {
        const vehicleAssignment = {
          plate: vehicle.plate,
          type: vehicle.type,
          driver: null,
          deliveryStaff: [],
          region: ''
        };

        // SABİT ŞOFÖR ATAMA - Öncelikli
        let fixedDriverAssigned = false;
        if (vehicle.driver1) {
          const fixedDriver = availableGeceDrivers.find(d => d.full_name === vehicle.driver1);
          if (fixedDriver && !assignedDrivers.has(fixedDriver.employee_code)) {
            vehicleAssignment.driver = fixedDriver;
            assignedDrivers.add(fixedDriver.employee_code);
            fixedDriverAssigned = true;
            console.log(`🌙 ${day} - ${vehicle.plate}: Sabit Şoför1 ${fixedDriver.full_name} atandı`);
          }
        }
        if (!fixedDriverAssigned && vehicle.driver2) {
          const fixedDriver = availableGeceDrivers.find(d => d.full_name === vehicle.driver2);
          if (fixedDriver && !assignedDrivers.has(fixedDriver.employee_code)) {
            vehicleAssignment.driver = fixedDriver;
            assignedDrivers.add(fixedDriver.employee_code);
            fixedDriverAssigned = true;
            console.log(`🌙 ${day} - ${vehicle.plate}: Sabit Şoför2 ${fixedDriver.full_name} atandı`);
          }
        }

        // Sabit şoför yoksa, GÜNLÜK ROTASYON ile şoför ata
        if (!fixedDriverAssigned) {
          // Sabit olmayan şoförleri filtrele
          const nonFixedDrivers = availableGeceDrivers.filter(driver => {
            const isFixedDriver = geceVehicles.some(v => 
              (v.driver1 && v.driver1 === driver.full_name) || 
              (v.driver2 && v.driver2 === driver.full_name)
            );
            return !isFixedDriver;
          });

          if (nonFixedDrivers.length > 0) {
            // Günlük rotasyon: her gün farklı şoför
            const driverIndex = (dayIndex + vehicleIndex) % nonFixedDrivers.length;
            const selectedDriver = nonFixedDrivers[driverIndex];
            vehicleAssignment.driver = selectedDriver;
            assignedDrivers.add(selectedDriver.employee_code);
            console.log(`🌙 ${day} - ${vehicle.plate}: Rotasyonlu Şoför ${selectedDriver.full_name} atandı`);
          } else {
            // Eğer sadece sabit şoförler varsa, atanmamış olanlardan seç
            for (let i = 0; i < availableGeceDrivers.length; i++) {
              const candidateDriver = availableGeceDrivers[i];
              if (!assignedDrivers.has(candidateDriver.employee_code)) {
                vehicleAssignment.driver = candidateDriver;
                assignedDrivers.add(candidateDriver.employee_code);
                console.log(`🌙 ${day} - ${vehicle.plate}: Şoför ${candidateDriver.full_name} atandı`);
                break;
              }
            }
          }
        }

        // SEVKİYATÇI ATAMA - GÜNLÜK ROTASYON
        const staffNeeded = vehicle.type === 'Kamyon' ? 2 : 1;
        for (let i = 0; i < staffNeeded; i++) {
          let selectedStaff = null;
          
          // Günlük rotasyon: her gün farklı sevkiyatçı
          if (availableGeceDeliveryStaff.length > 0) {
            const staffIndex = (dayIndex * geceVehicles.length + vehicleIndex * staffNeeded + i) % availableGeceDeliveryStaff.length;
            selectedStaff = availableGeceDeliveryStaff[staffIndex];
            assignedDeliveryStaff.add(selectedStaff.employee_code);
          }
          
          if (selectedStaff) {
            vehicleAssignment.deliveryStaff.push(selectedStaff);
            console.log(`🌙 ${day} - ${vehicle.plate}: Sevkiyat ${i+1} ${selectedStaff.full_name} atandı`);
          } else {
            console.log(`❌ ${day} - ${vehicle.plate}: Sevkiyat ${i+1} atanamadı`);
          }
        }

        // --- BÖLGE ATAMA - ŞİLE VE SAKARYA SABİT ARAÇLARA ---
        if (vehicle === sileVehicle) {
          // Şile için sabit araç
          vehicleAssignment.region = 'Şile';
          console.log(`🌙 ${day} - ${vehicle.plate}: Şile bölgesi (sabit araç)`);
        } else if (vehicle === sakaryaVehicle) {
          // Sakarya için sabit araç
          vehicleAssignment.region = 'Sakarya';
          console.log(`🌙 ${day} - ${vehicle.plate}: Sakarya bölgesi (sabit araç)`);
        } else {
          // Diğer araçlar için diğer bölgeler
          let availableRegions = [];
          if (vehicle.type === 'Panelvan' || vehicle.type === 'Kamyonet') {
            availableRegions = Object.values(regions.gece.genel).filter(r => 
              r !== 'Balıkesir-Avşa' && r !== 'Şile' && r !== 'Sakarya'
            );
          } else if (vehicle.type === 'Kamyon') {
            availableRegions = [
              ...Object.values(regions.gece.kamyon).filter(r => r !== 'Sakarya'),
              ...Object.values(regions.gece.genel).filter(r => 
                r !== 'Balıkesir-Avşa' && r !== 'Şile' && r !== 'Sakarya'
              )
            ];
          }
          
          if (availableRegions.length === 0) {
            availableRegions = Object.values(regions.gece.genel).filter(r => 
              r !== 'Balıkesir-Avşa' && r !== 'Şile' && r !== 'Sakarya'
            );
          }
          
          const regionIndex = (dayIndex + vehicleIndex) % availableRegions.length;
          vehicleAssignment.region = availableRegions[regionIndex];
          console.log(`🌙 ${day} - ${vehicle.plate}: ${vehicleAssignment.region} bölgesi`);
        }
        
        dayPlan.vehicles[vehicle.id] = vehicleAssignment;
      });
      weeklyPlan.gece[day] = dayPlan;
    });

    // 4. Badge renklerini night shift tablosunda uygula
    // createNightShiftTableData fonksiyonunda:
    // <Tag ...> yerine
    // <span className={`px-2 py-1 rounded text-xs font-semibold border ${regionColors[assignment.region] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>{assignment.region}</span>

    console.log('✅ Haftalık plan oluşturuldu:', weeklyPlan);
    setWeeklyPlan(weeklyPlan);
  };

  // Gün için tarih hesapla
  const getDateForDay = (dayIndex) => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Pazar
    const daysToAdd = dayIndex - (currentDay - 1); // Pazartesi = 1
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysToAdd);
    
    return targetDate.toLocaleDateString('tr-TR');
  };

  // Personel eksikliği kontrolü
  const checkPersonnelShortage = () => {
    const { 
      soforler, 
      sevkiyatElemanlari, 
      gunduzSoforler, 
      geceSoforler, 
      gunduzSevkiyatElemanlari, 
      geceSevkiyatElemanlari 
    } = categorizePersonnel();
    
    const availableGunduzDrivers = filterAvailablePersonnel(gunduzSoforler);
    const availableGeceDrivers = filterAvailablePersonnel(geceSoforler);
    const availableGunduzDeliveryStaff = filterAvailablePersonnel(gunduzSevkiyatElemanlari);
    const availableGeceDeliveryStaff = filterAvailablePersonnel(geceSevkiyatElemanlari);

    const fixedVehicles = getFixedVehicles();
    const totalDriversNeeded = fixedVehicles.length; // 8 şoför
    
    // Sevkiyat elemanı ihtiyacı hesapla (küçük araçlarda tek kişi olabilir)
    const kamyonlar = fixedVehicles.filter(v => v.type === 'Kamyon').length; // 5 kamyon
    const kucukAraclar = fixedVehicles.filter(v => v.type !== 'Kamyon').length; // 3 küçük araç
    
    // Minimum sevkiyat elemanı ihtiyacı: 5 kamyon × 2 kişi + 3 küçük araç × 1 kişi = 13 kişi
    const totalDeliveryStaffNeeded = (kamyonlar * 2) + kucukAraclar;

    const totalAvailableDrivers = availableGunduzDrivers.length + availableGeceDrivers.length;
    const totalAvailableDeliveryStaff = availableGunduzDeliveryStaff.length + availableGeceDeliveryStaff.length;

    return {
      driverShortage: Math.max(0, totalDriversNeeded - totalAvailableDrivers),
      deliveryStaffShortage: Math.max(0, totalDeliveryStaffNeeded - totalAvailableDeliveryStaff),
      availableDrivers: totalAvailableDrivers,
      availableDeliveryStaff: totalAvailableDeliveryStaff,
      gunduzDrivers: availableGunduzDrivers.length,
      geceDrivers: availableGeceDrivers.length,
      gunduzDeliveryStaff: availableGunduzDeliveryStaff.length,
      geceDeliveryStaff: availableGeceDeliveryStaff.length,
      kamyonlar,
      kucukAraclar,
      minDeliveryStaffNeeded: totalDeliveryStaffNeeded
    };
  };

  // Özet bilgileri oluştur
  const generateSummary = () => {
    if (!weeklyPlan) return null;

    const shortage = checkPersonnelShortage();
    const totalDays = Object.keys(weeklyPlan).length;
    const fixedVehicles = getFixedVehicles();
    const totalVehicles = fixedVehicles.length;

    return {
      totalDays,
      totalVehicles,
      totalAssignments: totalDays * totalVehicles,
      shortage,
      weekPeriod: currentWeek
    };
  };

  // Excel export fonksiyonu (basit)
  const exportToExcel = () => {
    if (!weeklyPlan) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Vardiya, Hafta, Gün, Araç Plakası, Araç Tipi, Şoför, Sevkiyat Elemanı 1, Sevkiyat Elemanı 2, Bölge\n";

    // Gece planı (önce)
    Object.entries(weeklyPlan.gece).forEach(([day, dayPlan]) => {
      Object.entries(dayPlan.vehicles).forEach(([vehicleId, vehicle]) => {
        const row = [
          'Gece',
          currentWeek,
          day,
          vehicle.plate,
          vehicle.type,
          vehicle.driver ? vehicle.driver.full_name : 'BOŞ',
          vehicle.deliveryStaff[0] ? vehicle.deliveryStaff[0].full_name : 'BOŞ',
          vehicle.deliveryStaff[1] ? vehicle.deliveryStaff[1].full_name : 'BOŞ',
          vehicle.region
        ].join(', ');
        
        csvContent += row + '\n';
      });
    });

    // Gündüz planı - 1. Ekip
    Object.entries(weeklyPlan.gunduz).forEach(([day, dayPlan]) => {
      Object.entries(dayPlan.ekip1).forEach(([vehicleId, vehicle]) => {
        const row = [
          'Gündüz - 1. Ekip',
          currentWeek,
          day,
          vehicle.plate,
          vehicle.type,
          vehicle.driver ? vehicle.driver.full_name : 'BOŞ',
          vehicle.deliveryStaff[0] ? vehicle.deliveryStaff[0].full_name : 'BOŞ',
          vehicle.deliveryStaff[1] ? vehicle.deliveryStaff[1].full_name : 'BOŞ',
          vehicle.region
        ].join(', ');
        
        csvContent += row + '\n';
      });
    });

    // Gündüz planı - 2. Ekip
    Object.entries(weeklyPlan.gunduz).forEach(([day, dayPlan]) => {
      Object.entries(dayPlan.ekip2).forEach(([vehicleId, vehicle]) => {
        const row = [
          'Gündüz - 2. Ekip',
          currentWeek,
          day,
          vehicle.plate,
          vehicle.type,
          vehicle.driver ? vehicle.driver.full_name : 'BOŞ',
          vehicle.deliveryStaff[0] ? vehicle.deliveryStaff[0].full_name : 'BOŞ',
          vehicle.deliveryStaff[1] ? vehicle.deliveryStaff[1].full_name : 'BOŞ',
          vehicle.region
        ].join(', ');
        
        csvContent += row + '\n';
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `haftalik_plan_${currentWeek}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" />
        <p className="text-gray-600 ml-4">Veriler yükleniyor...</p>
      </div>
    );
  }

  const summary = generateSummary();

  // Gündüz planı için Ant Design tablosu
  const createDayShiftTableData = () => {
    if (!weeklyPlan) return [];
    
    const weekDays = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    const teams = [
      { key: 'ekip1', name: '1. EKİP' },
      { key: 'ekip2', name: '2. EKİP' }
    ];

    return weekDays.map(day => {
      const dayPlan = weeklyPlan.gunduz[day];
      const row = { key: day, day: day };
      
      teams.forEach((team) => {
        if (dayPlan) {
          const teamData = dayPlan[team.key];
          
          // Ekip için özet bilgi oluştur
          const driver = teamData.driver;
          const deliveryStaff = teamData.deliveryStaff || [];
          const region = teamData.region || 'Belirsiz';
          
          row[team.key] = (
            <div className="border border-gray-200 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{team.name}</span>
                <span className={`px-2 py-1 rounded text-xs font-semibold border ${regionColors[region] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                  {region}
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-600">
                  Şoför: {driver ? driver.full_name : 'BOŞ'}
                </div>
                <div className="text-xs">
                  Sevkiyat: {deliveryStaff.map(staff => staff.full_name).join(', ')}
                </div>
              </div>
            </div>
          );
        }
      });
      
      return row;
    });
  };

  // Günlük atanmamış personeli hesapla
  const getUnassignedPersonnelForDay = (day) => {
    if (!weeklyPlan || !shiftInfo.gunduzDrivers || !shiftInfo.gunduzDeliveryStaff) {
      return { unassignedDrivers: [], unassignedDeliveryStaff: [] };
    }

    const dayPlan = weeklyPlan.gunduz[day];
    if (!dayPlan) {
      return { unassignedDrivers: [], unassignedDeliveryStaff: [] };
    }

    // O gün atanan personeli topla
    const assignedDrivers = new Set();
    const assignedDeliveryStaff = new Set();

    // 1. Ekip atamaları
    if (dayPlan.ekip1.driver) {
      assignedDrivers.add(dayPlan.ekip1.driver.employee_code);
    }
    if (dayPlan.ekip1.deliveryStaff) {
      dayPlan.ekip1.deliveryStaff.forEach(staff => {
        assignedDeliveryStaff.add(staff.employee_code);
      });
    }

    // 2. Ekip atamaları
    if (dayPlan.ekip2.driver) {
      assignedDrivers.add(dayPlan.ekip2.driver.employee_code);
    }
    if (dayPlan.ekip2.deliveryStaff) {
      dayPlan.ekip2.deliveryStaff.forEach(staff => {
        assignedDeliveryStaff.add(staff.employee_code);
      });
    }

    // Atanmamış personeli bul
    const unassignedDrivers = shiftInfo.gunduzDrivers.filter(
      driver => !assignedDrivers.has(driver.employee_code)
    );
    const unassignedDeliveryStaff = shiftInfo.gunduzDeliveryStaff.filter(
      staff => !assignedDeliveryStaff.has(staff.employee_code)
    );

    return { unassignedDrivers, unassignedDeliveryStaff };
  };

  // Gece planı için Ant Design tablosu
  const createNightShiftTableData = () => {
    if (!weeklyPlan) return [];
    
    const weekDays = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    const vehicles = getFixedVehicles();
    
    return weekDays.map(day => {
      const dayPlan = weeklyPlan.gece[day];
      const row = { key: day, day: day };
      
      vehicles.forEach(vehicle => {
        const assignment = dayPlan?.vehicles[vehicle.id];
        if (assignment) {
          // Kamyon araçları için 2 sevkiyat elemanı zorunlu, diğerleri için esnek
          const requiredStaff = vehicle.type === 'Kamyon' ? 2 : 1;
          const hasMissingStaff = assignment.deliveryStaff.length < requiredStaff;
          const hasNoStaff = assignment.deliveryStaff.length === 0;
          
          row[vehicle.plate] = (
            <div className={`text-center space-y-1 ${hasMissingStaff || hasNoStaff ? 'border-2 border-red-300 bg-red-50 rounded p-1' : ''}`}>
              {hasMissingStaff && (
                <div className="text-xs text-red-600 font-bold mb-1">
                  ⚠️ EKSİK PERSONEL
                </div>
              )}
              {hasNoStaff && (
                <div className="text-xs text-red-600 font-bold mb-1">
                  ⚠️ PERSONEL YOK
                </div>
              )}
              <div className="mb-1">
                <div className="text-xs font-medium">Şoför</div>
                <div className="text-xs">
                  {assignment.driver ? assignment.driver.full_name : 'BOŞ'}
                </div>
              </div>
              
              <div className="space-y-1">
                {assignment.deliveryStaff?.map((staff, index) => (
                  <div key={index}>
                    <div className="text-xs font-medium">Sevkiyat {index + 1}</div>
                    <div className="text-xs">{staff.full_name}</div>
                  </div>
                ))}
                {hasMissingStaff && (
                  <div className="text-xs text-red-600 font-bold bg-red-100 p-1 rounded">
                    ⚠️ Sevkiyat {requiredStaff}: Yetersiz Eleman
                  </div>
                )}
                {hasNoStaff && (
                  <div className="text-xs text-red-600 font-bold bg-red-100 p-1 rounded">
                    ⚠️ Sevkiyat Elemanı Yok
                  </div>
                )}
                {assignment.deliveryStaff.length === 1 && vehicle.type === 'Kamyon' && (
                  <div className="text-xs text-red-600 font-bold bg-red-100 p-1 rounded">
                    ⚠️ Sevkiyat 2: Yetersiz Eleman
                  </div>
                )}
              </div>
              
              <span className={`px-2 py-1 rounded text-xs font-semibold border ${regionColors[assignment.region] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                {assignment.region}
              </span>
            </div>
          );
        }
      });
      
      return row;
    });
  };

  const dayShiftColumns = [
    {
      title: 'Gün',
      dataIndex: 'day',
      key: 'day',
      width: 100,
      fixed: 'left',
      render: (text) => (
        <div className="font-medium text-blue-600">{text}</div>
      )
    },
    {
      title: '1. EKİP',
      dataIndex: 'ekip1',
      key: 'ekip1',
      width: 300,
      render: (content) => content
    },
    {
      title: '2. EKİP',
      dataIndex: 'ekip2',
      key: 'ekip2',
      width: 300,
      render: (content) => content
    }
  ];

  const nightShiftColumns = [
    {
      title: 'Gün',
      dataIndex: 'day',
      key: 'day',
      width: 80,
      fixed: 'left',
      render: (text) => (
        <div className="font-medium text-purple-600">{text}</div>
      )
    },
    ...getFixedVehicles().map(vehicle => ({
      title: (
        <div className="text-center">
          <div className="font-medium text-xs">{vehicle.plate}</div>
          <div className="text-xs text-gray-400">{vehicle.type}</div>
        </div>
      ),
      dataIndex: vehicle.plate,
      key: vehicle.plate,
      width: 120,
      render: (content) => content
    }))
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Users className="w-6 h-6 mr-3 text-purple-600" />
              Akıllı Dağıtım Sistemi
            </h2>
            <p className="text-gray-600 mt-1">
              Haftalık personel ve araç dağıtım planı
            </p>
          </div>
          <Space>
            <Button 
              icon={<Settings />} 
              onClick={() => setShowSettings(!showSettings)}
            >
              Ayarlar
            </Button>
            <Button 
              type="primary" 
              icon={<RefreshCw />} 
              onClick={generateWeeklyPlan}
            >
              Plan Oluştur
            </Button>
            {/* {weeklyPlan && (
              <Button 
                type="primary" 
                icon={<Download />} 
                onClick={exportToExcel}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Excel'e Aktar
              </Button>
            )} */}
          </Space>
        </div>

        {/* Hafta Bilgisi */}
        {currentWeek && (
          <Alert
            message={
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                <span className="font-semibold">Güncel Hafta: {currentWeek}</span>
              </div>
            }
            type="info"
            showIcon={false}
          />
        )}
      </Card>

      {/* Ayarlar */}
      {showSettings && (
        <Card title="Dağıtım Ayarları">
          <Space direction="vertical" style={{ width: '100%' }}>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.enableLeaveExclusion}
                onChange={(e) => setSettings({...settings, enableLeaveExclusion: e.target.checked})}
                className="mr-3"
              />
              <span className="text-gray-700">Raporlu ve yıllık izindeki personeli hariç tut</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.enablePreviousDayConsideration}
                onChange={(e) => setSettings({...settings, enablePreviousDayConsideration: e.target.checked})}
                className="mr-3"
              />
              <span className="text-gray-700">Önceki gün atamalarını dikkate al</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.allowEmptySpotsForSmallVehicles}
                onChange={(e) => setSettings({...settings, allowEmptySpotsForSmallVehicles: e.target.checked})}
                className="mr-3"
              />
              <span className="text-gray-700">Küçük araçlarda boş yer bırakılabilir</span>
            </label>
          </Space>
        </Card>
      )}

      {/* Haftalık Plan */}
      {weeklyPlan && (
        <div className="space-y-6">
          {/* Gece Planı - Önce göster */}
          <Card
            title={
              <div className="flex items-center">
                <Moon className="w-5 h-5 text-purple-600 mr-2" />
                Gece Vardiyası Planı
              </div>
            }
            extra={
              <span className="text-gray-600 text-sm">Tüm 8 araç - Gece personeli (Uzak bölgeler ağırlıklı)</span>
            }
          >
            <Table
              dataSource={createNightShiftTableData()}
              columns={nightShiftColumns}
              pagination={false}
              scroll={{ x: 1000 }}
              size="small"
              bordered
            />
          </Card>

          {/* Gündüz Planı */}
          <Card
            title={
              <div className="flex items-center">
                <Sun className="w-5 h-5 text-yellow-600 mr-2" />
                Gündüz Vardiyası Planı
              </div>
            }
            extra={
              <span className="text-gray-600 text-sm">2 gün karşı, 2 gün anadolu - Sadece şoförler değişir</span>
            }
          >
            <Table
              dataSource={createDayShiftTableData()}
              columns={dayShiftColumns}
              pagination={false}
              scroll={{ x: 1200 }}
              size="small"
              bordered
            />
            
            {/* Günlük Atanmamış Personel */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Günlük Atanmamış Personel:</h4>
              <div className="grid grid-cols-7 gap-2">
                {['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'].map(day => {
                  const { unassignedDrivers, unassignedDeliveryStaff } = getUnassignedPersonnelForDay(day);
                  return (
                    <div key={day} className="border border-gray-200 rounded p-2">
                      <div className="text-xs font-medium text-gray-600 mb-1">{day}</div>
                      {unassignedDrivers.length > 0 && (
                        <div className="mb-1">
                          <div className="text-xs text-gray-500">Şoförler:</div>
                          <div className="text-xs space-y-1">
                            {unassignedDrivers.map((driver, index) => (
                              <div key={index} className="p-1 bg-green-50 rounded text-green-700 text-xs">
                                {driver.full_name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {unassignedDeliveryStaff.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500">Sevkiyat:</div>
                          <div className="text-xs space-y-1">
                            {unassignedDeliveryStaff.map((staff, index) => (
                              <div key={index} className="p-1 bg-blue-50 rounded text-blue-700 text-xs">
                                {staff.full_name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {unassignedDrivers.length === 0 && unassignedDeliveryStaff.length === 0 && (
                        <div className="text-xs text-gray-400">Tüm personel atandı</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Personel Eksikliği Uyarısı */}
      {summary && (summary.shortage.driverShortage > 0 || summary.shortage.deliveryStaffShortage > 0) && (
        <Alert
          message="Personel Eksikliği"
          description={
            <div>
              {summary.shortage.driverShortage > 0 && <div>Şoför eksikliği: {summary.shortage.driverShortage}</div>}
              {summary.shortage.deliveryStaffShortage > 0 && <div>Sevkiyat elemanı eksikliği: {summary.shortage.deliveryStaffShortage}</div>}
            </div>
          }
          type="warning"
          showIcon
        />
      )}
    </div>
  );
};

export default AkilliDagitim; 