import React, { useState, useEffect } from 'react';
import { Calendar, Play, Settings, Clock, Users, Car, CheckCircle, AlertCircle, Info, Database, Construction, Wrench, Timer } from 'lucide-react';
import { savePlan, getAllPersonnel, getAllVehicles, getAllStores } from '../services/supabase';

const UnderConstructionBanner = () => (
  <div className="mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-6 shadow-lg">
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Construction className="w-8 h-8 text-amber-600 animate-bounce" />
        <Wrench className="w-6 h-6 text-amber-500" />
      </div>
      <div className="flex-1">
        <h3 className="text-xl font-bold text-amber-800 mb-2 flex items-center gap-2">
          <Timer className="w-5 h-5 animate-pulse" />
          Yapım Aşamasında
        </h3>
        <p className="text-amber-700 mb-2 font-medium">
          Vardiya planlama sistemi aktif olarak geliştirilmektedir. 
        </p>
        <div className="text-sm text-amber-600">
          <p>• Otomatik vardiya atamaları</p>
          <p>• Çalışan performans analizi</p>
          <p>• Mağaza bazlı planlama</p>
          <p>• Araç optimizasyonu</p>
        </div>
      </div>
      <div className="text-right">
        <div className="bg-amber-100 px-4 py-2 rounded-full">
          <p className="text-amber-800 font-semibold text-sm">🚧 Geliştiriliyor</p>
        </div>
      </div>
    </div>
  </div>
);

const VardiyaPlanlama = ({ personnelData: propPersonnelData, vehicleData: propVehicleData, storeData: propStoreData, onPlanGenerated }) => {
  const [personnelData, setPersonnelData] = useState(propPersonnelData || []);
  const [vehicleData, setVehicleData] = useState(propVehicleData || []);
  const [storeData, setStoreData] = useState(propStoreData || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!propPersonnelData || !propVehicleData || !propStoreData) {
        setLoading(true);
        try {
          const [personnelResult, vehicleResult, storeResult] = await Promise.all([
            getAllPersonnel(),
            getAllVehicles(),
            getAllStores()
          ]);
          
          if (personnelResult.success) {
            setPersonnelData(personnelResult.data);
          }
          if (vehicleResult.success) {
            setVehicleData(vehicleResult.data);
          }
          if (storeResult.success) {
            setStoreData(storeResult.data);
          }
        } catch (error) {
          console.error('Veri yükleme hatası:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadData();
  }, [propPersonnelData, propVehicleData, propStoreData]);

  // Props'tan gelen veri varsa onları kullan
  useEffect(() => {
    if (propPersonnelData) setPersonnelData(propPersonnelData);
    if (propVehicleData) setVehicleData(propVehicleData);
    if (propStoreData) setStoreData(propStoreData);
  }, [propPersonnelData, propVehicleData, propStoreData]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);

  // Araç verilerini normalize etme fonksiyonu
  const normalizeVehicleData = (vehicle) => {
    return {
      // License plate - hem eski hem yeni format destekler
      license_plate: vehicle.license_plate || vehicle.PLAKA || vehicle.plaka,
      // Vehicle type - hem eski hem yeni format destekler
      vehicle_type: vehicle.vehicle_type || vehicle.TIP || vehicle.tip || 'Kamyon',
      // Driver name - hem eski hem yeni format destekler
      driver_name: vehicle.driver_name || vehicle.SABIT_SOFOR || vehicle['1.Şoför'] || vehicle['1.ŞOFÖR'],
      // Capacity
      capacity: vehicle.capacity || vehicle.KAPASITE || null,
      // Eski format alanları da koru
      PLAKA: vehicle.license_plate || vehicle.PLAKA || vehicle.plaka,
      TIP: vehicle.vehicle_type || vehicle.TIP || vehicle.tip || 'Kamyon',
      SABIT_SOFOR: vehicle.driver_name || vehicle.SABIT_SOFOR || vehicle['1.Şoför'] || vehicle['1.ŞOFÖR'],
      SOFOR_2: vehicle.SOFOR_2 || vehicle['2.Şoför'] || vehicle['2.ŞOFÖR']
    };
  };

  // Personel verilerini normalize etme fonksiyonu
  const normalizePersonnelData = (person) => {
    return {
      // Full name - hem eski hem yeni format destekler
      full_name: person.full_name || person['ADI SOYADI'] || `${person.AD || ''} ${person.SOYAD || ''}`.trim(),
      // Position - hem eski hem yeni format destekler
      position: person.position || person.GOREV || person.GÖREVİ || person.GÖREVI,
      // Shift type - hem eski hem yeni format destekler
      shift_type: person.shift_type || person.Vardiya || person.VARDIYA,
      // Department
      department: person.department || person.BOLUM || person.BÖLÜM,
      // Experience level
      experience_level: person.experience_level || person.DENEYIM || person.EXPERIENCE || 'orta',
      // Performance score
      performance_score: person.performance_score || 0.0,
      // Eski format alanları da koru
      'ADI SOYADI': person.full_name || person['ADI SOYADI'] || `${person.AD || ''} ${person.SOYAD || ''}`.trim(),
      GOREV: person.position || person.GOREV || person.GÖREVİ || person.GÖREVI,
      Vardiya: person.shift_type || person.Vardiya || person.VARDIYA,
      AD: person.AD || person.first_name,
      SOYAD: person.SOYAD || person.last_name
    };
  };

  const handleVehicleToggle = (vehicleId) => {
    setSelectedVehicles(prev => 
      prev.includes(vehicleId) 
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  // Personel özet hesaplama fonksiyonu - DOĞRU VERİ YAPISI
  const calculatePersonnelSummary = (plan, restingPersonnel = null) => {
    const summary = {};
    
    Object.keys(plan).forEach(date => {
      const dayPlan = plan[date];
      console.log(`📅 ${date} günü işleniyor:`, dayPlan);
      
      // Gece vardiyası kontrolü
      if (dayPlan.nightShift && typeof dayPlan.nightShift === 'object') {
        console.log(`🌙 ${date} gece vardiyası:`, dayPlan.nightShift);
        Object.values(dayPlan.nightShift).forEach(assignment => {
          console.log(`🚛 Assignment:`, assignment);
          // Şoför bilgisi - driver objesi içinden ismi al
          const driverName = assignment.driver?.['ADI SOYADI'];
          const vehicleType = assignment.vehicle?.vehicleType || assignment.vehicle?.TIP || 'Kamyon';
          const difficulty = assignment.vehicle?.displayDifficulty || assignment.driver?.difficulty || 'basit';
          
          if (driverName) {
                          if (!summary[driverName]) {
                summary[driverName] = {
                  name: driverName,
                  type: 'Şoför',
                  vehicleTypes: {},
                  difficulties: {},
                  totalDays: 0,
                  nightShifts: 0,
                  dayShifts: 0,
                  restingDays: 0,
                restingDates: [],
                workedDates: new Set() // Aynı tarihteki gece/gündüz vardiyalarını tekrar saymamak için
                };
              }
            summary[driverName].vehicleTypes[vehicleType] = (summary[driverName].vehicleTypes[vehicleType] || 0) + 1;
            summary[driverName].difficulties[difficulty] = (summary[driverName].difficulties[difficulty] || 0) + 1;
            summary[driverName].workedDates.add(date); // Tarihi set'e ekle
            summary[driverName].nightShifts++;
          }
          
          // Sevkiyat personeli - shipping array'i içinden isimleri al
          if (assignment.shipping && Array.isArray(assignment.shipping)) {
            assignment.shipping.forEach(person => {
              const personName = person?.['ADI SOYADI'];
              const personDifficulty = person?.difficulty || 'basit';
              
              if (personName) {
                if (!summary[personName]) {
                  summary[personName] = {
                    name: personName,
                    type: 'Sevkiyat',
                    vehicleTypes: {},
                    difficulties: {},
                    totalDays: 0,
                    nightShifts: 0,
                    dayShifts: 0,
                    restingDays: 0,
                    restingDates: [],
                    workedDates: new Set() // Aynı tarihteki gece/gündüz vardiyalarını tekrar saymamak için
                  };
                }
                summary[personName].vehicleTypes[vehicleType] = (summary[personName].vehicleTypes[vehicleType] || 0) + 1;
                summary[personName].difficulties[personDifficulty] = (summary[personName].difficulties[personDifficulty] || 0) + 1;
                summary[personName].workedDates.add(date); // Tarihi set'e ekle
                summary[personName].nightShifts++;
              }
            });
          }
        });
      }
      
      // Gündüz vardiyası kontrolü - farklı veri yapısı
      if (dayPlan.dayShift && typeof dayPlan.dayShift === 'object') {
        console.log(`🌅 ${date} gündüz vardiyası:`, dayPlan.dayShift);
        // Karşı bölgesi personeli
        if (dayPlan.dayShift.karsiPersonel && Array.isArray(dayPlan.dayShift.karsiPersonel)) {
          console.log(`🏢 Karşı personeli:`, dayPlan.dayShift.karsiPersonel);
          dayPlan.dayShift.karsiPersonel.forEach(person => {
            const personName = person?.['ADI SOYADI'];
            
            if (personName) {
              if (!summary[personName]) {
                summary[personName] = {
                  name: personName,
                  type: 'Sevkiyat',
                  vehicleTypes: {},
                  difficulties: {},
                  totalDays: 0,
                  nightShifts: 0,
                  dayShifts: 0,
                  restingDays: 0,
                  restingDates: [],
                  workedDates: new Set() // Aynı tarihteki gece/gündüz vardiyalarını tekrar saymamak için
                };
              }
              // Gündüz vardiyası için sabit bilgiler
              summary[personName].vehicleTypes['Gündüz-Karşı'] = (summary[personName].vehicleTypes['Gündüz-Karşı'] || 0) + 1;
              summary[personName].difficulties['orta'] = (summary[personName].difficulties['orta'] || 0) + 1;
              summary[personName].workedDates.add(date); // Tarihi set'e ekle
              summary[personName].dayShifts++;
            }
          });
        }
        
        // Anadolu bölgesi personeli
        if (dayPlan.dayShift.anadoluPersonel && Array.isArray(dayPlan.dayShift.anadoluPersonel)) {
          console.log(`🏙️ Anadolu personeli:`, dayPlan.dayShift.anadoluPersonel);
          dayPlan.dayShift.anadoluPersonel.forEach(person => {
            const personName = person?.['ADI SOYADI'];
            
            if (personName) {
              if (!summary[personName]) {
                summary[personName] = {
                  name: personName,
                  type: 'Sevkiyat',
                  vehicleTypes: {},
                  difficulties: {},
                  totalDays: 0,
                  nightShifts: 0,
                  dayShifts: 0,
                  restingDays: 0,
                  restingDates: [],
                  workedDates: new Set() // Aynı tarihteki gece/gündüz vardiyalarını tekrar saymamak için
                };
              }
              // Gündüz vardiyası için sabit bilgiler
              summary[personName].vehicleTypes['Gündüz-Anadolu'] = (summary[personName].vehicleTypes['Gündüz-Anadolu'] || 0) + 1;
              summary[personName].difficulties['orta'] = (summary[personName].difficulties['orta'] || 0) + 1;
              summary[personName].workedDates.add(date); // Tarihi set'e ekle
              summary[personName].dayShifts++;
            }
          });
        }
      }
    });
    
    // Dinlenme günlerini hesapla
    if (restingPersonnel && restingPersonnel.drivers) {
      restingPersonnel.drivers.forEach(dayData => {
        dayData.personnel.forEach(personName => {
          if (summary[personName]) {
            summary[personName].restingDays++;
            summary[personName].restingDates.push(dayData.date);
          }
        });
      });
    }
    
    // totalDays'i workedDates set'inin boyutundan hesapla (aynı tarihteki gece/gündüz vardiyaları 1 gün olarak sayılır)
    Object.keys(summary).forEach(personName => {
      summary[personName].totalDays = summary[personName].workedDates.size;
      // Set'i array'e çevir (JSON serialization için)
      summary[personName].workedDates = Array.from(summary[personName].workedDates);
    });
    
    console.log('📊 Personel özet raporu oluşturuldu:', summary);
    return summary;
  };

  const generatePlan = async () => {
    console.log('generatePlan called');
    
    if (!startDate) {
      alert('Lütfen başlangıç tarihi seçin');
      return;
    }
    
    if (!endDate) {
      alert('Lütfen bitiş tarihi seçin');
      return;
    }
    
    if (selectedVehicles.length === 0) {
      alert('Lütfen en az bir araç seçin');
      return;
    }

    if (!personnelData || personnelData.length === 0) {
      alert('Personel verileri yüklenmemiş');
      return;
    }

    if (!vehicleData || vehicleData.length === 0) {
      alert('Araç verileri yüklenmemiş');
      return;
    }

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    console.log('Dates:', { startDate, endDate, startDateObj, endDateObj });
    
    if (endDateObj <= startDateObj) {
      alert('Bitiş tarihi başlangıç tarihinden sonra olmalıdır');
      return;
    }
    
    const diffTime = Math.abs(endDateObj - startDateObj);
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    console.log('Days calculated:', days);
    
    if (days > 30) {
      alert('Maksimum 30 günlük plan oluşturabilirsiniz');
      return;
    }

    setIsGenerating(true);
    setGeneratedPlan(null);
    
    try {
      console.log('Generating night shift plan first...');
      // ÖNCE GECE vardiya planını oluştur
      const nightShiftResult = generateShiftPlan(days, selectedVehicles, 'gece', startDateObj);
      console.log('Night shift result:', nightShiftResult);
      
      console.log('Generating day shift plan with night shift data...');
      // SONRA GÜNDÜZ vardiya planını gece planının üzerine ekle
      const dayShiftResult = generateShiftPlan(days, selectedVehicles, 'gunduz', startDateObj, nightShiftResult.plan);
      console.log('Day shift result:', dayShiftResult);
      
      // Personel özet bilgilerini hesapla
      console.log('🔍 Plan verisi personnelSummary hesaplaması için:', nightShiftResult.plan);
      const personnelSummary = calculatePersonnelSummary(nightShiftResult.plan, nightShiftResult.restingPersonnel);
      console.log('📋 Hesaplanan personnelSummary:', personnelSummary);
      
      // Final plan - gece planının yapısını kullan (çünkü gündüz planı eklenmiş olacak)
      const combinedPlan = {
        plan: nightShiftResult.plan, // Bu artık hem nightShift hem dayShift içeriyor
        warnings: [...nightShiftResult.warnings, ...dayShiftResult.warnings],
        restingPersonnel: {
          nightShift: nightShiftResult.restingPersonnel,
          dayShift: dayShiftResult.restingPersonnel
        },
        personnelSummary: personnelSummary,
        summary: {
          totalDays: days,
          startDate: startDateObj.toISOString().split('T')[0],
          endDate: endDateObj.toISOString().split('T')[0],
          selectedVehicles: selectedVehicles
        }
      };
      
      console.log('Combined plan:', combinedPlan);
      
      // Planı Supabase'e kaydet
      try {
        console.log('📡 Plan Supabase\'e kaydediliyor...');
        const saveResult = await savePlan(combinedPlan);
        if (saveResult.success) {
          console.log('✅ Plan başarıyla kaydedildi:', saveResult.data);
        } else {
          console.warn('⚠️ Plan kaydedilirken hata:', saveResult.error);
        }
      } catch (saveError) {
        console.warn('⚠️ Plan kaydedilirken hata:', saveError.message);
      }
      
      setGeneratedPlan(combinedPlan);
      onPlanGenerated(combinedPlan);
      
    } catch (error) {
      console.error('Plan oluşturulurken hata:', error);
      alert(`Plan oluşturulurken bir hata oluştu: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateShiftPlan = (days, vehicles, shift, startDate, existingPlan = null) => {
    console.log('generateShiftPlan called with:', { days, vehicles, shift, startDate });
    console.log('personnelData:', personnelData);
    console.log('vehicleData:', vehicleData);
    
    // Veri kontrolü
    if (!personnelData || !Array.isArray(personnelData)) {
      throw new Error('Personel verileri bulunamadı');
    }
    
    if (!vehicleData || !Array.isArray(vehicleData)) {
      throw new Error('Araç verileri bulunamadı');
    }
    
    if (!vehicles || !Array.isArray(vehicles) || vehicles.length === 0) {
      throw new Error('Seçili araç bulunamadı');
    }
    
    if (!days || days <= 0) {
      throw new Error('Geçersiz gün sayısı');
    }
    
    const plan = {};
    const warnings = [];
    
    // Dinlendirilmiş personel takibi - fonksiyonun başında tanımla
    const restingPersonnel = {
      drivers: [],
      shippingStaff: []
    };
    
    // Vardiya bilgisine göre personel ayır
    const allDrivers = personnelData.filter(p => {
      const normalizedPerson = normalizePersonnelData(p);
      return normalizedPerson.position === 'ŞOFÖR';
    });
    const allShippingStaff = personnelData.filter(p => {
      const normalizedPerson = normalizePersonnelData(p);
      return normalizedPerson.position === 'SEVKİYAT ELEMANI';
    });
    
    console.log('All drivers:', allDrivers);
    console.log('All shipping staff:', allShippingStaff);
    
    if (allDrivers.length === 0) {
      throw new Error('Hiç şoför bulunamadı');
    }
    
    if (allShippingStaff.length === 0) {
      throw new Error('Hiç sevkiyat elemanı bulunamadı');
    }
    
    // Gündüz/gece vardiyası olan personelleri ayır
    const shiftDrivers = allDrivers.filter(p => {
      const normalizedPerson = normalizePersonnelData(p);
      const vardiya = normalizedPerson.shift_type?.toLowerCase() || '';
      if (shift === 'gece') {
        return vardiya.includes('22:00') || vardiya.includes('06:00');
      } else {
        return vardiya.includes('08:00') || vardiya.includes('16:00');
      }
    });
    
    const shiftShippingStaff = allShippingStaff.filter(p => {
      const normalizedPerson = normalizePersonnelData(p);
      const vardiya = normalizedPerson.shift_type?.toLowerCase() || '';
      if (shift === 'gece') {
        return vardiya.includes('22:00') || vardiya.includes('06:00');
      } else {
        return vardiya.includes('08:00') || vardiya.includes('16:00');
      }
    });

    // Eğer o vardiyada personel yoksa, genel havuzdan kullan
    const drivers = shiftDrivers.length > 0 ? shiftDrivers : allDrivers;
    const shippingStaff = shiftShippingStaff.length > 0 ? shiftShippingStaff : allShippingStaff;

    if (shift === 'gece') {
      // GECE VARDİYASI - Araç bazlı planlama (1 Şoför + 2 Sevkiyat Elemanı) + DİNLENME
      
      // Sabit şoförleri topla ve kontrol et
      const sabitSoforVehicles = vehicles.filter(vehicleId => {
        const vehicle = vehicleData.find(v => {
          const normalizedVehicle = normalizeVehicleData(v);
          return normalizedVehicle.license_plate === vehicleId;
        });
        return vehicle && normalizeVehicleData(vehicle).driver_name;
      });
      
      // Sabit şoför çakışma kontrolü
      const sabitSoforMap = {};
      sabitSoforVehicles.forEach(vehicleId => {
        const vehicle = vehicleData.find(v => {
          const normalizedVehicle = normalizeVehicleData(v);
          return normalizedVehicle.license_plate === vehicleId;
        });
                if (vehicle) {
          const normalizedVehicle = normalizeVehicleData(vehicle);
          if (normalizedVehicle.driver_name) {
            if (sabitSoforMap[normalizedVehicle.driver_name]) {
              warnings.push(`UYARI: ${normalizedVehicle.driver_name} sabit şoförü birden fazla araçta tanımlı! (${sabitSoforMap[normalizedVehicle.driver_name]} ve ${normalizedVehicle.license_plate})`);
          } else {
              sabitSoforMap[normalizedVehicle.driver_name] = normalizedVehicle.license_plate;
            }
          }
        }
      });

      // Kişi bazlı zorluk geçmişi (isim -> son zorluk seviyesi)
      const personnelDifficultyHistory = {};
      
      // Kişi için sonraki zorluk seviyesini hesapla
      const getNextDifficultyForPerson = (personName, defaultDifficulty = 'basit') => {
        const lastDifficulty = personnelDifficultyHistory[personName];
        if (!lastDifficulty) return defaultDifficulty;
        
        // Rotasyon: basit → zor → orta → basit
        switch (lastDifficulty) {
          case 'basit': return 'zor';
          case 'zor': return 'orta';
          case 'orta': return 'basit';
          default: return 'basit';
        }
      };

      // Araçların Excel'deki nokta bilgisini al (sadece bilgi amaçlı)
      const getVehicleBaseLocation = (nokta) => {
        if (!nokta) return 'Orta';
        
        const noktaLower = nokta.toString().toLowerCase().trim();
        
        if (noktaLower.includes('yakın') || noktaLower.includes('yakin') || noktaLower === 'yakin') {
          return 'Yakın';
        } else if (noktaLower.includes('uzak') || noktaLower === 'uzak') {
          return 'Uzak';
        } else if (noktaLower.includes('orta') || noktaLower === 'orta') {
          return 'Orta';
        }
        
        return 'Orta';
      };



          // Gelişmiş araç tipi ve sabit şoför kontrolü
    const vehicleTypeHistory = {}; // personel -> araç tipi geçmişi
    const sabitSoforRestTracker = {}; // sabit şoför -> dinlenme günü sayısı
    const personnelWorkHistory = {}; // personel -> çalışma günü geçmişi
    
    // BÖLGE BAZLI ARAÇ ATAMA SİSTEMİ - Gerçek konum verilerine göre
    // Gerçek mağaza konum verilerinden bölgeleri al
    const getAllRegions = () => {
      if (!storeData || !Array.isArray(storeData)) {
        console.warn('Mağaza verileri bulunamadı, varsayılan bölgeler kullanılıyor');
        return [
          'Sakarya', 'Kocaeli', 'Gebze', 'Kadıköy', 'Şile',
          'Ataşehir/Ümraniye/Üsküdar', 'M.tepe/Kartal/Pendik', 
          'Beykoz/Ç.köy/S.tepe/S.beyliği', 'Balıkesir-Avşa', 'Gündüz'
        ];
      }

      // Mağaza verilerinden benzersiz konumları çıkar
      const uniqueLocations = new Set();
      
      storeData.forEach(store => {
        if (store.KONUM && store.KONUM.trim()) {
          const location = store.KONUM.trim();
          uniqueLocations.add(location);
        }
      });
      
      const realRegions = Array.from(uniqueLocations).sort();
      console.log('🗺️ Gerçek mağaza konumları:', realRegions);
      
      return realRegions.length > 0 ? realRegions : [
        'Sakarya', 'Kocaeli', 'Gebze', 'Kadıköy', 'Şile',
        'Ataşehir/Ümraniye/Üsküdar', 'M.tepe/Kartal/Pendik', 
        'Beykoz/Ç.köy/S.tepe/S.beyliği', 'Balıkesir-Avşa', 'Gündüz'
      ];
    };

    const generateRegionVehicleMapping = (regions) => {
      const mapping = {};
      
      regions.forEach(region => {
        const regionLower = region.toLowerCase();
        
        // Mesafe ve zorluk seviyesine göre araç tipi ata
        if (regionLower.includes('sakarya') || 
            regionLower.includes('balıkesir') || 
            regionLower.includes('balikesir') ||
            regionLower.includes('bolu') ||
            regionLower.includes('ankara') ||
            regionLower.includes('adapazarı') ||
            regionLower.includes('adapazari')) {
          // Uzak bölgeler - Kamyon öncelik
          mapping[region] = ['Kamyon'];
        } else if (regionLower.includes('kocaeli') || 
                   regionLower.includes('izmit') ||
                   regionLower.includes('gebze') ||
                   regionLower.includes('beykoz') ||
                   regionLower.includes('şile') ||
                   regionLower.includes('sile')) {
          // Orta mesafe bölgeler - Kamyon/Kamyonet
          mapping[region] = ['Kamyon', 'Kamyonet'];
        } else if (regionLower.includes('kadıköy') || 
                   regionLower.includes('kadikoy') ||
                   regionLower.includes('ataşehir') ||
                   regionLower.includes('atasehir') ||
                   regionLower.includes('ümraniye') ||
                   regionLower.includes('umraniye') ||
                   regionLower.includes('üsküdar') ||
                   regionLower.includes('uskudar') ||
                   regionLower.includes('maltepe') ||
                   regionLower.includes('kartal') ||
                   regionLower.includes('pendik')) {
          // Yakın bölgeler - Kamyonet/Panelvan
          mapping[region] = ['Kamyonet', 'Panelvan'];
        } else if (regionLower.includes('gündüz') || 
                   regionLower.includes('gunduz') ||
                   regionLower.includes('merkez') ||
                   regionLower.includes('center')) {
          // Özel kategoriler - Panelvan
          mapping[region] = ['Panelvan'];
        } else {
          // Diğer bölgeler - Varsayılan Kamyonet
          mapping[region] = ['Kamyonet'];
        }
      });
      
      console.log('📊 Dinamik bölge-araç mapping:', mapping);
      return mapping;
    };
    
    const allRegions = getAllRegions();
    const REGION_VEHICLE_MAPPING = generateRegionVehicleMapping(allRegions);

    // HAFTALİK VARDİYA SİSTEMİ - DOĞRU DÖNGÜ: 
    // 🗓️ Pazar gece başlayıp Cumartesi gündüz bitmeli (6 gün çalışma)
    // 📅 06.07.2025 (Pazar gece) → 12.07.2025 (Cumartesi gündüz)
    // 🕒 6 gün çalışma: Pazar, Pazartesi, Salı, Çarşamba, Perşembe, Cuma, Cumartesi gündüz
    // 🛌 1 gün dinlenme: Cumartesi gece dinlenir, yeni hafta Pazar gece başlar
    // 
    // Gün Dizini:
    // 0 = Pazar (gece başlangıç)
    // 1 = Pazartesi
    // 2 = Salı
    // 3 = Çarşamba
    // 4 = Perşembe
    // 5 = Cuma
    // 6 = Cumartesi (sadece gündüz, gece dinlenme)

    // BÖLGE FREKANS SİSTEMİ - Bazı bölgeler her gün, bazıları haftada 1-2 kez
    const REGION_FREQUENCY = {
      'Balıkesir-Avşa': 2,    // Haftada 2 kez
      'Balıkesir': 2,         // Haftada 2 kez
      'Avşa': 2,              // Haftada 2 kez
      'Bolu': 3,              // Haftada 3 kez
      'Ankara': 3,            // Haftada 3 kez
      'Adapazarı': 4,         // Haftada 4 kez
      'Sakarya': 4,           // Haftada 4 kez
      'Kocaeli': 7,           // Her gün (6 gün çalışma)
      'Gebze': 7,             // Her gün (6 gün çalışma)
      'Kadıköy': 7,           // Her gün (6 gün çalışma)
      'Şile': 2,              // Haftada 2 kez
      'Ataşehir': 7,          // Her gün (6 gün çalışma)
      'Ümraniye': 7,          // Her gün (6 gün çalışma)
      'Üsküdar': 7,           // Her gün (6 gün çalışma)
      'Maltepe': 7,           // Her gün (6 gün çalışma)
      'Kartal': 7,            // Her gün (6 gün çalışma)
      'Pendik': 7,            // Her gün (6 gün çalışma)
      'Beykoz': 5,            // Haftada 5 kez
      'Çekmeköy': 4,          // Haftada 4 kez
      'Sultanbeyli': 4,       // Haftada 4 kez
      'Sancaktepe': 4,        // Haftada 4 kez
      'Gündüz': 7             // Her gün (6 gün çalışma)
    };

    // Bölge frekansını kontrol et - YENİ HAFTALİK SİSTEM: Pazar gece başlangıç, Cumartesi gündüz son, 6 gün çalışma
    const shouldRegionWorkToday = (region, dayOfWeek, isNightShift = false) => {
      const regionKey = region.split('/')[0].trim(); // İlk kısmı al
      const frequency = REGION_FREQUENCY[regionKey] || REGION_FREQUENCY[region] || 7;
      
      // Haftada frequency kadar çalışacak
      if (frequency >= 7) {
        // 6 gün çalışma sistemi: Pazar gece başlangıç → Cumartesi gündüz son
        // Çalışma günleri: Pazar(0), Pazartesi(1), Salı(2), Çarşamba(3), Perşembe(4), Cuma(5)
        // Cumartesi(6): Sadece gündüz çalışır (haftanın son vardiyası)
        
        if (dayOfWeek === 6) {
          // Cumartesi: Sadece gündüz çalışır, gece vardiyası YOK (bir sonraki hafta başlar)
          return !isNightShift; // Gündüz = true, Gece = false
        } else if (dayOfWeek >= 0 && dayOfWeek <= 5) {
          // Pazar-Cuma: Hem gece hem gündüz çalışır
          return true;
        } else {
          return false;
        }
      }
      
      // Haftanın hangi günlerinde çalışacak (Pazar=0 başlangıç, Cuma=5 bitiş sistemi)
      const workDays = [];
      
      // Frequency'e göre hangi günlerde çalışacağını belirle
      if (frequency === 6) {
        // 6 gün çalışma: Pazar-Cuma arası
        workDays.push(0, 1, 2, 3, 4, 5); // Pazar, Pazartesi, Salı, Çarşamba, Perşembe, Cuma
      } else if (frequency === 5) {
        // 5 gün çalışma: Pazartesi-Cuma arası
        workDays.push(1, 2, 3, 4, 5); // Pazartesi, Salı, Çarşamba, Perşembe, Cuma
      } else if (frequency === 4) {
        // 4 gün çalışma: Pazartesi, Salı, Çarşamba, Perşembe
        workDays.push(1, 2, 3, 4); // Pazartesi, Salı, Çarşamba, Perşembe
      } else if (frequency === 3) {
        // 3 gün çalışma: Pazartesi, Çarşamba, Cuma
        workDays.push(1, 3, 5); // Pazartesi, Çarşamba, Cuma
      } else if (frequency === 2) {
        // 2 gün çalışma: Salı, Perşembe
        workDays.push(2, 4); // Salı, Perşembe
      } else if (frequency === 1) {
        // 1 gün çalışma: Çarşamba
        workDays.push(3); // Çarşamba
      }
      
      return workDays.includes(dayOfWeek);
    };

    // Bölge çıkarma fonksiyonu
    const extractMainRegion = (konum) => {
      if (!konum || konum === '') return '';
      
      const cleanKonum = konum.trim();
      
      const regionMappings = {
        'Ataşehir': 'Ataşehir/Ümraniye/Üsküdar',
        'Ümraniye': 'Ataşehir/Ümraniye/Üsküdar',
        'Üsküdar': 'Ataşehir/Ümraniye/Üsküdar',
        'Balıkesir': 'Balıkesir-Avşa',
        'Avşa': 'Balıkesir-Avşa',
        'Beykoz': 'Beykoz/Ç.köy/S.tepe/S.beyliği',
        'Çekmeköy': 'Beykoz/Ç.köy/S.tepe/S.beyliği',
        'Sultanbeyli': 'Beykoz/Ç.köy/S.tepe/S.beyliği',
        'Sancaktepe': 'Beykoz/Ç.köy/S.tepe/S.beyliği',
        'Gebze': 'Gebze',
        'Gündüz': 'Gündüz',
        'Kadıköy': 'Kadıköy',
        'Kocaeli': 'Kocaeli',
        'Maltepe': 'M.tepe/Kartal/Pendik',
        'Kartal': 'M.tepe/Kartal/Pendik',
        'Pendik': 'M.tepe/Kartal/Pendik',
        'Sakarya': 'Sakarya',
        'Şile': 'Şile'
      };
      
      const firstPart = cleanKonum.split('/')[0].trim();
      return regionMappings[firstPart] || firstPart || '';
    };

    // Bölge için en uygun araç tipini seç
    const getBestVehicleTypeForRegion = (region) => {
      const availableTypes = REGION_VEHICLE_MAPPING[region];
      if (!availableTypes || availableTypes.length === 0) {
        return 'Kamyon'; // Default
      }
      return availableTypes[0]; // İlk sırada olan öncelikli
    };

    // Personel rotasyon takip sistemi - her şoför/personel farklı bölgelere eşit dağıtılsın
    const personnelRegionHistory = {}; // personel adı -> [gittigi bölgeler]
    
    // Personel için bir sonraki bölgeyi belirle - PERFORMANS ANALİZİ VERİLERİ + FREKANS SİSTEMİ
    const getNextRegionForPersonnel = (personnelName, allRegions, currentDate = null, isNightShift = false) => {
      if (!personnelRegionHistory[personnelName]) {
        personnelRegionHistory[personnelName] = [];
      }
      
      const currentPlanHistory = personnelRegionHistory[personnelName];
      
      // Gerçek tarih kullanarak hafta günü hesapla
      let dayOfWeek = 0;
      if (currentDate) {
        const dateObj = new Date(currentDate);
        dayOfWeek = dateObj.getDay(); // 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi
      }
      
      // SADECE BUGÜN ÇALIŞACAK BÖLGELERİ FİLTRELE
      const todaysAvailableRegions = allRegions.filter(region => 
        shouldRegionWorkToday(region, dayOfWeek, isNightShift)
      );
      
      const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
      const shiftName = isNightShift ? 'Gece' : 'Gündüz';
      console.log(`📅 ${currentDate || 'Tarih yok'} (${dayNames[dayOfWeek]}) - ${shiftName} Vardiyası`);
      console.log(`🗺️ Bugün çalışacak bölgeler:`, todaysAvailableRegions);
      
      if (todaysAvailableRegions.length === 0) {
        console.warn(`⚠️ Bugün hiç bölge çalışmayacak! Varsayılan bölge veriliyor.`);
        return allRegions[0] || 'Sakarya';
      }
      
      // Her bölgeye kaç kez gittiğini say (şu anki plan için)
      const currentPlanCount = {};
      todaysAvailableRegions.forEach(region => {
        currentPlanCount[region] = currentPlanHistory.filter(r => r === region).length;
      });
      
      // PERFORMANS ANALİZİNDEN MEVCUT VERİLER
      const existingRegionCount = getExistingRegionCountForPersonnel(personnelName);
      
      // TOPLAM SAYIM: Mevcut + Şu anki plan (sadece bugün çalışacak bölgeler için)
      const totalRegionCount = {};
      todaysAvailableRegions.forEach(region => {
        const existing = existingRegionCount[region] || 0;
        const current = currentPlanCount[region] || 0;
        totalRegionCount[region] = existing + current;
      });
      
      console.log(`🔍 ${personnelName} bölge dağılımı (bugün çalışacaklar):`, totalRegionCount);
      
      // En az gittiği bölgeyi seç (eşitlemek için)
      const minCount = Math.min(...Object.values(totalRegionCount));
      const availableRegions = Object.keys(totalRegionCount).filter(region => totalRegionCount[region] === minCount);
      
      // Rastgele seç (aynı skordaki bölgeler arasından)
      const selectedRegion = availableRegions[Math.floor(Math.random() * availableRegions.length)];
      
      console.log(`🎯 ${personnelName} → En az gittiği bölge: ${selectedRegion} (${minCount} kez) - ${availableRegions.length} seçenek arasından`);
      
      return selectedRegion;
    };
    
    // Personel için mevcut bölge sayımını al (performans analizinden)
    const getExistingRegionCountForPersonnel = (personnelName) => {
      // Bu fonksiyon performans analizi verilerinden o personelin 
      // şu ana kadar hangi bölgelere kaç kez gittiğini alacak
      // Şimdilik örnek veri döndürüyorum, gerçekte propPersonnelData'dan alınacak
      
      const mockData = {
        'MAHMUT TAŞKIRAN': {
          'Ataşehir/Ümraniye/Üsküdar': 13,
          'Kadıköy': 12,
          'Gebze': 6,
          'Kocaeli': 5,
          'Sakarya': 4,
          'M.tepe/Kartal/Pendik': 4,
          'Beykoz/Ç.köy/S.tepe/S.beyliği': 4,
          'Şile': 0,
          'Balıkesir-Avşa': 0,
          'Gündüz': 0
        }
      };
      
      return mockData[personnelName] || {};
    };
    
    // Personel rotasyon geçmişini güncelle
    const updatePersonnelRegionHistory = (personnelName, region) => {
      if (!personnelRegionHistory[personnelName]) {
        personnelRegionHistory[personnelName] = [];
      }
      personnelRegionHistory[personnelName].push(region);
    };

    // İsim normalizasyon fonksiyonu - EN BAŞTA TANIMLA
    const normalizeName = (person) => {
      if (typeof person === 'string') return person.trim().toUpperCase();
      return (person?.['ADI SOYADI'] || `${person?.AD || ''} ${person?.SOYAD || ''}`).trim().toUpperCase();
    };
      
             // Şoför dinlendirme kontrolü - KAMYONET/PANELVAN HARİÇ
       const shouldRestDriver = (driverName, vehicleType, day) => {
         // Kamyonet ve Panelvan sürücüleri dinlendirilmez (başkası süremez)
         if (vehicleType === 'Kamyonet' || vehicleType === 'Panelvan') {
           return false;
         }
         
         // Kamyon sürücüleri dinlendirilebilir
         if (!sabitSoforRestTracker[driverName]) {
           sabitSoforRestTracker[driverName] = { workedDays: 0, lastRestDay: -999 };
         }
         
         const tracker = sabitSoforRestTracker[driverName];
         
         // Her 3 günde bir dinlendir (sadece Kamyon için)
         if (tracker.workedDays >= 3 && (day - tracker.lastRestDay) > 3) {
           tracker.lastRestDay = day;
           tracker.workedDays = 0;
           return true;
         }
         
         return false;
       };
      
      // Kişi için araç tipi atama kontrolü - Geliştirilmiş  
      const canAssignToVehicleType = (personName, vehicleType, isSabitSofor = false, day = 0) => {
        // SABİT ŞOFÖR KONTROLÜ - EN ÖNEMLİ KONTROL
        const sabitSoforVehicle = vehicleData.find(v => 
          v.SABIT_SOFOR && normalizeName(v.SABIT_SOFOR) === personName
        );
        
        if (sabitSoforVehicle) {
          // Bu kişi sabit şoför - sadece kendi araç tipini sürebilir
          const sabitAracTipi = sabitSoforVehicle.TIP || sabitSoforVehicle.Tip || sabitSoforVehicle.tip || 'Kamyon';
          if (sabitAracTipi !== vehicleType) {
            console.log(`🚫 SABİT ŞOFÖR HATASI: ${personName} sabit şoförü ${sabitAracTipi} sürücüsü, ${vehicleType} süremez!`);
            return false;
          }
          console.log(`✅ SABİT ŞOFÖR DOĞRU: ${personName} → ${vehicleType} (kendi aracı)`);
        }
        
        // Kamyon herkese atanabilir (sabit şoför kontrolü geçtikten sonra)
        if (vehicleType === 'Kamyon') return true;
        
        // Şoför dinlendirme kontrolü (araç tipine göre)
        if (shouldRestDriver(personName, vehicleType, day)) {
          console.log(`🛌 Şoför ${personName} dinlendiriliyor (${vehicleType} - Gün ${day + 1})`);
          return false;
        }
        
        // SABİT ŞOFÖR DEĞİLSE ROTASYON KONTROLÜ
        if (!isSabitSofor) {
          // Araç tipi geçmişi kontrolü
          const history = vehicleTypeHistory[personName] || [];
          
          // İlk 2 gün kontrol et
          if (history.length === 0) return true; // İlk kez atanıyor
          
          // Son 2 günde aynı basit araç tipini kullandı mı kontrol et
          const lastTwoVehicles = history.slice(-2);
          
                  // ARAÇ TİPİ ROTASYON MANTIGI - Adaletli dağılım
        const vehicleTypeCount = {};
        history.forEach(vType => {
          vehicleTypeCount[vType] = (vehicleTypeCount[vType] || 0) + 1;
        });
        
        // Kamyonet ve Panelvan basit araç tipleri - peş peşe vermemeli
        const simpleVehicleTypes = ['Kamyonet', 'Panelvan'];
        
        if (simpleVehicleTypes.includes(vehicleType)) {
          // Son 2 günde bu araç tipini kullandıysa red et
          const usedRecently = lastTwoVehicles.filter(v => v === vehicleType).length >= 2;
          if (usedRecently) {
            console.log(`🚫 ${personName} son 2 günde ${vehicleType} kullandı, rotasyon için atlaníyor`);
            return false;
          }
          
          // Aynı araç tipini çok kullanmış mı kontrol et
          const currentCount = vehicleTypeCount[vehicleType] || 0;
          const otherTypesCount = Object.keys(vehicleTypeCount).filter(t => t !== vehicleType).reduce((sum, t) => sum + vehicleTypeCount[t], 0);
          
          if (currentCount > otherTypesCount + 1) {
            console.log(`🚫 ${personName} ${vehicleType} çok kullandı (${currentCount} kez), rotasyon için atlaníyor`);
            return false;
          }
          
          // Son günde farklı bir basit araç kullandıysa, çeşitlilik için izin ver
          const lastVehicle = history[history.length - 1];
          if (simpleVehicleTypes.includes(lastVehicle) && lastVehicle !== vehicleType) {
            return true;
          }
        }
        }
        
        return true;
      };
      
      // Araç tipi geçmişini güncelle
      const updateVehicleTypeHistory = (personName, vehicleType) => {
        if (!vehicleTypeHistory[personName]) {
          vehicleTypeHistory[personName] = [];
        }
        vehicleTypeHistory[personName].push(vehicleType);
        
        // Son 5 günü sakla (performans için)
        if (vehicleTypeHistory[personName].length > 5) {
          vehicleTypeHistory[personName] = vehicleTypeHistory[personName].slice(-5);
        }
      };
      
      // Şoför çalışma günü güncelle (dinlenme için)
      const updateDriverWork = (driverName, vehicleType) => {
        // Sadece dinlendirilecek şoförler için takip et (Kamyon sürücüleri)
        if (vehicleType === 'Kamyon') {
          if (!sabitSoforRestTracker[driverName]) {
            sabitSoforRestTracker[driverName] = { workedDays: 0, lastRestDay: -999 };
          }
          sabitSoforRestTracker[driverName].workedDays++;
        }
      };
      
      // YENİ AKILLI DİNLENME ROTASYON SİSTEMİ - SADECE GECE VARDİYASI
      const totalDrivers = drivers.length;
      const totalVehicles = vehicles.length;
      const driversPerDay = Math.min(totalDrivers, totalVehicles);
      const restingDriversPerDay = Math.max(0, totalDrivers - driversPerDay);
      
      console.log(`🚛 AKILLI DİNLENME MANTIGI (GECE): ${totalDrivers} şoför, ${totalVehicles} araç, günlük ${driversPerDay} çalışacak, ${restingDriversPerDay} dinlenecek`);
      
      // Dinlenme geçmişi takip sistemi (tüm günler boyunca kalıcı)
      const restingHistory = {}; // personName -> [günler arası dinlenme geçmişi]
      
      // Kamyonet/Panelvan şoförleri belirleme (dinlendirilmeyecekler)
      const nonRestableDrivers = new Set();
      vehicleData.forEach(vehicle => {
        if (vehicle.SABIT_SOFOR) {
          const vehicleType = vehicle.TIP || vehicle.Tip || vehicle.tip || 'Kamyon';
          if (vehicleType === 'Kamyonet' || vehicleType === 'Panelvan') {
            nonRestableDrivers.add(normalizeName(vehicle.SABIT_SOFOR));
            console.log(`🚫 ${vehicle.SABIT_SOFOR} (${vehicleType}) dinlendirilmeyecek - başkası süremez`);
          }
        }
      });
      
      console.log(`📋 Dinlendirilmeyecek şoförler (Kamyonet/Panelvan):`, Array.from(nonRestableDrivers));
      
      for (let day = 0; day < days; day++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + day);
        const dateStr = date.toISOString().split('T')[0];
        
        plan[dateStr] = { nightShift: {}, dayShift: null };
        
        // Kullanılan şoförleri takip et
        const usedDrivers = new Set();
        const usedShippingStaff = new Set();
        
        console.log(`\n=== GÜN ${day + 1} PLANLAMA BAŞLADI ===`);
        
        // AKILLI DİNLENME SEÇİM ALGORİTMASI
        const todayRestingDrivers = [];
        const todayWorkingDrivers = [];
        
        // 1. Dinlenebilir şoförleri belirle (Kamyonet/Panelvan hariç)
        const restableDrivers = drivers.filter(driver => {
          const driverName = normalizeName(driver);
          return !nonRestableDrivers.has(driverName);
        });
        
        // 2. Dinlendirilemez şoförleri direkt çalışacaklar listesine ekle
        drivers.forEach(driver => {
          const driverName = normalizeName(driver);
          if (nonRestableDrivers.has(driverName)) {
            todayWorkingDrivers.push(driver);
            console.log(`🚛 ${driverName} Kamyonet/Panelvan şoförü - dinlendirilmez`);
          }
        });
        
        // 3. Dinlenebilir şoförler için geçmiş analizi
        const driverRestScores = restableDrivers.map(driver => {
          const driverName = normalizeName(driver);
          
          // Dinlenme geçmişini başlat
          if (!restingHistory[driverName]) {
            restingHistory[driverName] = [];
          }
          
          // Son dinlenme tarihini hesapla (kaç gün önce dinlendi)
          let daysSinceLastRest = 999; // Çok büyük sayı (hiç dinlenmedi)
          const history = restingHistory[driverName];
          
          if (history.length > 0) {
            const lastRestDay = Math.max(...history);
            daysSinceLastRest = day - lastRestDay;
          }
          
          // Toplam dinlenme sayısı
          const totalRestDays = history.length;
          
          // Skor hesapla: En uzun süre dinlemeyenler öncelik
          const score = daysSinceLastRest * 1000 - totalRestDays * 10;
          
          console.log(`📊 ${driverName}: Son dinlenme ${daysSinceLastRest} gün önce, toplam ${totalRestDays} dinlenme, skor: ${score}`);
          
          return {
            driver: driver,
            name: driverName,
            score: score,
            daysSinceLastRest: daysSinceLastRest,
            totalRestDays: totalRestDays
          };
        });
        
        // 4. Skora göre sırala (yüksek skor = öncelik)
        driverRestScores.sort((a, b) => b.score - a.score);
        
        // 5. En yüksek skorlu şoförleri dinlendir
        for (let i = 0; i < Math.min(restingDriversPerDay, driverRestScores.length); i++) {
          const driverInfo = driverRestScores[i];
          todayRestingDrivers.push(driverInfo.driver);
          
          // Dinlenme geçmişine kaydet
          restingHistory[driverInfo.name].push(day);
          
          console.log(`🛌 ${driverInfo.name} dinleniyor (Gün ${day + 1}, ${driverInfo.daysSinceLastRest} gün sonra, skor: ${driverInfo.score})`);
        }
        
        // 6. Kalan dinlenebilir şoförleri çalışacaklar listesine ekle
        for (let i = restingDriversPerDay; i < driverRestScores.length; i++) {
          const driverInfo = driverRestScores[i];
          todayWorkingDrivers.push(driverInfo.driver);
        }
        
        // 7. Güvenlik kontrolü: Yeterli çalışacak şoför var mı?
        if (todayWorkingDrivers.length < driversPerDay) {
          const needMore = driversPerDay - todayWorkingDrivers.length;
          console.log(`⚠️ Yeterli çalışacak şoför yok! ${needMore} şoför daha gerekli`);
          
          // En az dinlenen şoförleri geri al
          for (let i = 0; i < needMore && todayRestingDrivers.length > 0; i++) {
            const driver = todayRestingDrivers.pop();
            todayWorkingDrivers.push(driver);
            const driverName = normalizeName(driver);
            
            // Dinlenme geçmişinden son kaydı sil
            if (restingHistory[driverName]) {
              restingHistory[driverName].pop();
            }
            
            console.log(`⚠️ ${driverName} acil durumda çalışmaya alındı`);
          }
        }
        
        let workingDriversToday = [...todayWorkingDrivers];
        const reserveDrivers = [...todayRestingDrivers]; // Dinlenen şoförler rezerv olarak kullanılabilir
        
        // Sevkiyat elemanları da aynı mantık - normal rotasyon + rezerv
        const shuffledShippingStaff = [...shippingStaff];
        for (let i = 0; i < day; i++) {
          shuffledShippingStaff.push(shuffledShippingStaff.shift());
        }

        // Sevkiyat elemanları için rezerv sistemi (araç sayısı * 2 kişi temel)
        const baseShippingCount = vehicles.length * 2;
        const baseShippingStaff = shuffledShippingStaff.slice(0, baseShippingCount);
        const reserveShippingStaff = shuffledShippingStaff.slice(baseShippingCount);
        
        console.log(`📋 Gün ${day + 1} SONUÇLAR:`);
        console.log(`  🔧 Çalışan şoförler (${todayWorkingDrivers.length}):`, todayWorkingDrivers.map(d => d['ADI SOYADI'] || `${d.AD} ${d.SOYAD}`));
        console.log(`  😴 Dinlenen şoförler (${todayRestingDrivers.length}):`, todayRestingDrivers.map(d => d['ADI SOYADI'] || `${d.AD} ${d.SOYAD}`));
        console.log(`  👷 Temel sevkiyat (${baseShippingStaff.length}):`, baseShippingStaff.map(s => s['ADI SOYADI'] || `${s.AD} ${s.SOYAD}`));
        console.log(`  👷 Rezerv sevkiyat (${reserveShippingStaff.length}):`, reserveShippingStaff.map(s => s['ADI SOYADI'] || `${s.AD} ${s.SOYAD}`));
        
        // Dinlenme kaydını tut
        if (todayRestingDrivers.length > 0) {
          restingPersonnel.drivers.push({
            date: dateStr,
            personnel: todayRestingDrivers.map(d => d['ADI SOYADI'] || `${d.AD} ${d.SOYAD}`)
          });
        }
        
        // PERSONEL ROTASYON SİSTEMİ - Her şoför/personel farklı bölgelere eşit dağıtılsın
        const allRegions = getAllRegions();
        console.log(`🗺️ Tüm bölgeler:`, allRegions);
        
        // Araç atama öncesi hazırlık
        const sabitSoforAssignments = [];
        const normalVehicleAssignments = [];
        
        vehicles.forEach((vehicleId) => {
          const vehicle = vehicleData.find(v => v.PLAKA === vehicleId);
          if (!vehicle) {
            console.error(`Vehicle not found for ID: ${vehicleId}`);
            warnings.push(`UYARI: ${vehicleId} plakası bulunamadı!`);
            return;
          }
          
          if (vehicle.SABIT_SOFOR) {
            sabitSoforAssignments.push({vehicleId, vehicle});
          } else {
            normalVehicleAssignments.push({vehicleId, vehicle});
          }
        });

        // Akıllı araç-personel eşleştirme algoritması
        const makeSmartAssignments = () => {
          const assignments = [];
          const availableDrivers = [...workingDriversToday];
          const availableShipping = [...baseShippingStaff];
          
          // Araçları türe göre grupla
          const allVehicles = [...sabitSoforAssignments, ...normalVehicleAssignments];
          
          for (let assignment of allVehicles) {
            const { vehicleId, vehicle } = assignment;
            const vehicleType = vehicle.TIP || vehicle.Tip || vehicle.tip || 'Kamyon';
            
            // Şoför seçimi
            let selectedDriver = null;
            let driverDifficulty = 'basit';
            
            if (vehicle.SABIT_SOFOR) {
              // Sabit şoför kontrol
          const sabitSoforName = normalizeName(vehicle.SABIT_SOFOR);
              const sabitDriver = availableDrivers.find(d => normalizeName(d) === sabitSoforName);
              
              if (sabitDriver && canAssignToVehicleType(sabitSoforName, vehicleType, true, day)) {
                selectedDriver = sabitDriver;
                driverDifficulty = getNextDifficultyForPerson(sabitSoforName, 'basit');
                
                // Listeden çıkar
                const index = availableDrivers.indexOf(sabitDriver);
                availableDrivers.splice(index, 1);
              } else {
                // Sabit şoför atanamazsa başka şoför seç - AKILLI SEÇİM
                const alternativeScores = availableDrivers
                  .filter(d => canAssignToVehicleType(normalizeName(d), vehicleType, false, day))
                  .map(d => {
                    const driverName = normalizeName(d);
                    const history = vehicleTypeHistory[driverName] || [];
                    
                    // Bu araç tipini kaç kez kullandı
                    const vehicleTypeCount = history.filter(vt => vt === vehicleType).length;
                    
                    // Skor: Az kullanan = yüksek öncelik
                    const score = vehicleTypeCount * -1000;
                    
                    return {
                      driver: d,
                      name: driverName,
                      vehicleTypeCount: vehicleTypeCount,
                      score: score
                    };
                  });
                
                if (alternativeScores.length > 0) {
                  alternativeScores.sort((a, b) => b.score - a.score);
                  
                  selectedDriver = alternativeScores[0].driver;
                  console.log(`🎯 Sabit şoför yerine ${vehicleType} için seçilen: ${alternativeScores[0].name} (${alternativeScores[0].vehicleTypeCount} kez kullandı)`);
                  
                  const driverName = normalizeName(selectedDriver);
                  driverDifficulty = getNextDifficultyForPerson(driverName, 'basit');
                  
                  const index = availableDrivers.indexOf(selectedDriver);
                  availableDrivers.splice(index, 1);
                }
              }
              } else {
              // NORMAL ŞOFÖR SEÇİMİ - Basit rotasyon
              const driverScores = availableDrivers
                .filter(d => canAssignToVehicleType(normalizeName(d), vehicleType, false, day))
                .map(d => {
                  const driverName = normalizeName(d);
                  
                  // Araç tipi geçmişi
                  const vehicleHistory = vehicleTypeHistory[driverName] || [];
                  const vehicleTypeCount = vehicleHistory.filter(vt => vt === vehicleType).length;
                  
                  // Skor hesapla: Az kullanan = yüksek öncelik
                  const score = vehicleTypeCount * -100;
                  
                  console.log(`🎯 ${driverName} → ${vehicleType} (${vehicleTypeCount} kez kullandı) - Skor: ${score}`);
                  
                  return {
                    driver: d,
                    name: driverName,
                    vehicleTypeCount: vehicleTypeCount,
                    score: score
                  };
                });
              
              // En yüksek skorlu şoförü seç
              if (driverScores.length > 0) {
                driverScores.sort((a, b) => b.score - a.score);
                
                selectedDriver = driverScores[0].driver;
                const driverName = normalizeName(selectedDriver);
                
                console.log(`🎯 ${vehicleType} için seçilen şoför: ${driverName}`);
                
                driverDifficulty = getNextDifficultyForPerson(driverName, 'basit');
                
                const index = availableDrivers.indexOf(selectedDriver);
                availableDrivers.splice(index, 1);
              }
            }
            
            // Eğer hala şoför bulunmadıysa rezerv şoförlerden dene
            if (!selectedDriver && reserveDrivers.length > 0) {
              console.log(`⚠️ Rezerv şoför devreye giriyor: ${vehicle.PLAKA}`);
              
              // REZERV ŞOFÖRLER İÇİN BASIT SEÇİM
              const reserveScores = reserveDrivers
                .filter(d => canAssignToVehicleType(normalizeName(d), vehicleType, false, day))
                .map(d => {
                  const driverName = normalizeName(d);
                  
                  // Araç tipi geçmişi
                  const vehicleHistory = vehicleTypeHistory[driverName] || [];
                  const vehicleTypeCount = vehicleHistory.filter(vt => vt === vehicleType).length;
                  
                  // Skor hesapla: Az kullanan = yüksek öncelik
                  const score = vehicleTypeCount * -100;
                  
                  return {
                    driver: d,
                    name: driverName,
                    vehicleTypeCount: vehicleTypeCount,
                    score: score
                  };
                });
              
              if (reserveScores.length > 0) {
                reserveScores.sort((a, b) => b.score - a.score);
                
                selectedDriver = reserveScores[0].driver;
                const driverName = normalizeName(selectedDriver);
                
                console.log(`🎯 REZERV ${vehicleType} için seçilen şoför: ${driverName}`);
                
                driverDifficulty = getNextDifficultyForPerson(driverName, 'basit');
                
                // Rezerv listesinden çıkar ve working listesine ekle
                const index = reserveDrivers.indexOf(selectedDriver);
                reserveDrivers.splice(index, 1);
                workingDriversToday.push(selectedDriver);
              }
            }
            
            // Sevkiyat elemanı seçimi
            const shipping = [];
            for (let i = 0; i < 2; i++) {
              const availableShippingFiltered = availableShipping.filter(s => 
                canAssignToVehicleType(normalizeName(s), vehicleType, false, day)
              );
              
              let selectedShipping = null;
              if (availableShippingFiltered.length > 0) {
                                // BASIT SEÇİM - Sevkiyat elemanı için
                const shippingScores = availableShippingFiltered.map(s => {
                  const shippingName = normalizeName(s);
                  
                  // Araç tipi geçmişi
                  const vehicleHistory = vehicleTypeHistory[shippingName] || [];
                  const vehicleTypeCount = vehicleHistory.filter(vt => vt === vehicleType).length;
                  
                  // Skor hesapla: Az kullanan = yüksek öncelik
                  const score = vehicleTypeCount * -100;
                  
                  return {
                    person: s,
                    name: shippingName,
                    vehicleTypeCount: vehicleTypeCount,
                    score: score
                  };
                });
                
                // En yüksek skorlu sevkiyat elemanını seç
                shippingScores.sort((a, b) => b.score - a.score);
                selectedShipping = shippingScores[0].person;
                
                const shippingName = normalizeName(selectedShipping);
                
                console.log(`🎯 ${vehicleType} sevkiyat #${i+1} için seçilen: ${shippingName}`);
                
                // Listeden çıkar
                const index = availableShipping.indexOf(selectedShipping);
                availableShipping.splice(index, 1);
              } else if (reserveShippingStaff.length > 0) {
                // Rezerv sevkiyat elemanı devreye gir
                console.log(`⚠️ Rezerv sevkiyat elemanı devreye giriyor: ${vehicle.PLAKA} - ${i + 1}. kişi`);
                
                const reserveFiltered = reserveShippingStaff.filter(s => 
                  canAssignToVehicleType(normalizeName(s), vehicleType, false, day)
                );
                
                if (reserveFiltered.length > 0) {
                  // REZERV SEVKİYAT İÇİN DE PERSONEL ROTASYON SEÇİMİ
                  const reserveShippingScores = reserveFiltered.map(s => {
                    const shippingName = normalizeName(s);
                    
                    // Bu sevkiyat elemanı için bir sonraki bölgeyi belirle
                    const nextRegion = getNextRegionForPersonnel(shippingName, allRegions, dateStr, true);
                    
                    // Bu bölge için uygun araç tipini al
                    const preferredVehicleTypes = REGION_VEHICLE_MAPPING[nextRegion] || ['Kamyon'];
                    
                    // Mevcut araç tipi bu bölge için uygun mu?
                    const isPreferredType = preferredVehicleTypes.includes(vehicleType);
                    
                    // Araç tipi geçmişi
                    const vehicleHistory = vehicleTypeHistory[shippingName] || [];
                    const vehicleTypeCount = vehicleHistory.filter(vt => vt === vehicleType).length;
                    
                    // Skor hesapla: Bölge uygunluğu + araç tipi rotasyonu
                    const regionScore = isPreferredType ? 1000 : 0;
                    const rotationScore = vehicleTypeCount * -100;
                    const totalScore = regionScore + rotationScore;
                    
                    return {
                      person: s,
                      name: shippingName,
                      nextRegion: nextRegion,
                      isPreferredType: isPreferredType,
                      vehicleTypeCount: vehicleTypeCount,
                      score: totalScore
                    };
                  });
                  
                  // En yüksek skorlu rezerv sevkiyat elemanını seç
                  reserveShippingScores.sort((a, b) => b.score - a.score);
                  selectedShipping = reserveShippingScores[0].person;
                  
                  const shippingName = normalizeName(selectedShipping);
                  const assignedRegion = reserveShippingScores[0].nextRegion;
                  
                  console.log(`🎯 REZERV ${vehicleType} sevkiyat #${i+1} için seçilen: ${shippingName} → ${assignedRegion} bölgesi`);
                  
                  // Personel rotasyon geçmişini güncelle
                  updatePersonnelRegionHistory(shippingName, assignedRegion);
                  
                  // Rezerv listesinden çıkar
                  const index = reserveShippingStaff.indexOf(selectedShipping);
                  reserveShippingStaff.splice(index, 1);
                }
              }
              
              if (selectedShipping) {
                const shippingName = normalizeName(selectedShipping);
                const shippingDifficulty = getNextDifficultyForPerson(shippingName, 'basit');
                
                shipping.push({
                  person: selectedShipping,
                  difficulty: shippingDifficulty
                });
                
                // Geçmiş güncelle
                personnelDifficultyHistory[shippingName] = shippingDifficulty;
                updateVehicleTypeHistory(shippingName, vehicleType);
              }
            }
            
            assignments.push({
              vehicleId,
              vehicle,
              driver: selectedDriver,
              driverDifficulty,
              shipping,
              vehicleType
            });
            
            // Şoför geçmişini güncelle
            if (selectedDriver) {
            const driverName = normalizeName(selectedDriver);
              personnelDifficultyHistory[driverName] = driverDifficulty;
              updateVehicleTypeHistory(driverName, vehicleType);
              
              // Şoför çalışma günü güncelle
              updateDriverWork(driverName, vehicleType);
            }
          }
          
          return assignments;
        };
        
        const smartAssignments = makeSmartAssignments();

        // Akıllı atama sonuçlarını plan'a yazma
        smartAssignments.forEach(({ vehicleId, vehicle, driver, driverDifficulty, shipping, vehicleType }) => {
          // Şoför bilgisi
          let assignedDriver;
          if (driver) {
            const driverName = normalizeName(driver);
            const displayName = driver['ADI SOYADI'] || `${driver.AD} ${driver.SOYAD}`;
            
            assignedDriver = {
              'ADI SOYADI': displayName,
              GOREV: 'ŞOFÖR',
              Vardiya: '22:00 - 06:00',
              isSabit: !!vehicle.SABIT_SOFOR,
              originalData: driver,
              difficulty: driverDifficulty
            };
            usedDrivers.add(driverName);
          } else {
            assignedDriver = {
              'ADI SOYADI': 'YETERSİZ ŞOFÖR',
              GOREV: 'ŞOFÖR',
              Vardiya: '22:00 - 06:00',
              isSabit: false,
              isWarning: true
            };
            warnings.push(`UYARI: ${dateStr} tarihinde ${vehicle.PLAKA} aracı için yeterli şoför bulunamadı!`);
          }
          
          // Sevkiyat elemanları bilgisi
          const assignedShipping = [];
          shipping.forEach(({ person, difficulty }, index) => {
            const shippingName = normalizeName(person);
            const displayName = person['ADI SOYADI'] || `${person.AD} ${person.SOYAD}`;
              
              assignedShipping.push({
                'ADI SOYADI': displayName,
                GOREV: 'SEVKİYAT ELEMANI',
                Vardiya: '22:00 - 06:00',
              originalData: person,
              difficulty: difficulty
              });
              usedShippingStaff.add(shippingName);
          });
              
          // Eğer sevkiyat elemanı eksikse uyarı ekle
          while (assignedShipping.length < 2) {
              assignedShipping.push({
                'ADI SOYADI': 'YETERSİZ SEVKİYAT ELEMANI',
                GOREV: 'SEVKİYAT ELEMANI',
                Vardiya: '22:00 - 06:00',
                isWarning: true
              });
              warnings.push(`UYARI: ${dateStr} tarihinde ${vehicle.PLAKA} aracı için yeterli sevkiyat elemanı bulunamadı!`);
            }
          

          
          plan[dateStr].nightShift[vehicleId] = {
            vehicle: {
              ...vehicle,
              displayDifficulty: assignedDriver.difficulty || 'basit',
              baseLocation: getVehicleBaseLocation(vehicle.NOKTA),
              vehicleType: vehicleType
            },
            driver: assignedDriver,
            shipping: assignedShipping,
            shift: '22:00 - 06:00'
          };
        });
        
        // Dinlendirilmiş personeli hesapla - sadece o gün gerçekten dinlenen kişiler
        // Gece vardiyasında çalışmayanlar dinleniyor (sabit şoförler hariç çalışabilir)
        const nightWorkingDriversToday = new Set();
        const nightWorkingShippingToday = new Set();
        const nightShiftDataToday = plan[dateStr]?.nightShift;
        if (nightShiftDataToday) {
          Object.values(nightShiftDataToday).forEach(vehicleAssignment => {
            if (vehicleAssignment.driver && vehicleAssignment.driver['ADI SOYADI']) {
              nightWorkingDriversToday.add(vehicleAssignment.driver['ADI SOYADI']);
            }
            if (vehicleAssignment.shipping && Array.isArray(vehicleAssignment.shipping)) {
              vehicleAssignment.shipping.forEach(shipping => {
                if (shipping['ADI SOYADI']) {
                  nightWorkingShippingToday.add(shipping['ADI SOYADI']);
                }
              });
            }
          });
        }
        
        // ESKİ DINLENME HESAPLAMASI SİLİNDİ - YENİ ALGORİTMA KULLANIYOR
        
        // ESKİ DINLENME KAYDI KODU SİLİNDİ - YENİ ALGORİTMA KULLANIYOR
        // Yeni dinlenme algoritması zaten kayıt tutuyor, duplikasyon olmasın
      }
    } else {
      // GÜNDÜZ VARDİYASI - Sevkiyat elemanı bazlı planlama (2 kişi aynı, 2 gün karşı 2 gün anadolu)
      
      // Eğer existingPlan (gece planı) varsa onu kullan
      if (existingPlan) {
        Object.assign(plan, existingPlan);
        console.log('Existing plan loaded:', plan);
      }
      
      // Gündüz vardiyası için sabit 2 kişi seçelim (gece çalışmayanlardan)
      const nightShiftData = plan[Object.keys(plan)[0]]?.nightShift;
      const nightWorkingShipping = new Set();
      
      if (nightShiftData) {
        Object.values(nightShiftData).forEach(vehicleAssignment => {
          if (vehicleAssignment.shipping && Array.isArray(vehicleAssignment.shipping)) {
            vehicleAssignment.shipping.forEach(shipping => {
              if (shipping['ADI SOYADI']) {
                nightWorkingShipping.add(shipping['ADI SOYADI']);
              }
            });
          }
        });
      }
      
      // Gece çalışmayanlardan 4 kişi seçelim (rotasyon ile)
      const availableForDay = shippingStaff.filter(s => {
        const shippingName = s['ADI SOYADI'] || `${s.AD} ${s.SOYAD}`;
        return !nightWorkingShipping.has(shippingName);
      });
      
      if (availableForDay.length < 4) {
        warnings.push(`UYARI: Gündüz vardiyası için yeterli sevkiyat elemanı bulunamadı! (${availableForDay.length} kişi mevcut, 4 gerekli)`);
      }
      
      // İlk 4 kişiyi seçelim
      const dayTeam = availableForDay.slice(0, 4);
      console.log('Gündüz vardiyası sabit takım:', dayTeam.map(p => p['ADI SOYADI'] || `${p.AD} ${p.SOYAD}`));
      
      for (let day = 0; day < days; day++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + day);
        const dateStr = date.toISOString().split('T')[0];
        
        // HAFTALIK SİSTEM KONTROLÜ: Cumartesi gündüz vardiyası kontrol et
        const dayOfWeek = date.getDay(); // 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi
        
        // Cumartesi (6) sadece gündüz çalışır ama gece çalışmaz
        // Eğer cumartesi gündüz vardiyası planlanacaksa, bölge çalışma kontrol et
        if (dayOfWeek === 6) {
          // Cumartesi gündüz: Sadece yüksek frekanslı bölgeler çalışabilir
          console.log(`📅 ${dateStr} Cumartesi - Gündüz vardiyası (haftanın son günü)`);
        }
        
        // Gündüz vardiyası planını dayShift'e yaz
        if (!plan[dateStr]) {
          plan[dateStr] = { nightShift: {}, dayShift: null };
        }
        
        // 2 gün rotasyon: 2 gün (A,B->Karşı, C,D->Anadolu), 2 gün (C,D->Karşı, A,B->Anadolu)
        const rotationCycle = Math.floor(day / 2) % 2; // 0: ilk düzen, 1: ters düzen
        
        let karsiPersonnel, anadoluPersonnel;
        if (rotationCycle === 0) {
          // İlk düzen: A,B karşıya, C,D anadolu'ya
          karsiPersonnel = [dayTeam[0], dayTeam[1]];
          anadoluPersonnel = [dayTeam[2], dayTeam[3]];
        } else {
          // Ters düzen: C,D karşıya, A,B anadolu'ya
          karsiPersonnel = [dayTeam[2], dayTeam[3]];
          anadoluPersonnel = [dayTeam[0], dayTeam[1]];
        }
        
        console.log(`Gün ${day + 1}: Karşı -> ${karsiPersonnel.map(p => p?.['ADI SOYADI']).join(', ')}, Anadolu -> ${anadoluPersonnel.map(p => p?.['ADI SOYADI']).join(', ')}`);
        
        plan[dateStr].dayShift = {
          type: 'gunduz_sevkiyat',
          karsiPersonel: [],
          anadoluPersonel: [],
          date: dateStr,
          shift: '08:00 - 16:00'
        };
        
        // Karşı bölgesine 2 kişi ata
        karsiPersonnel.forEach((person, index) => {
          if (person) {
            const personName = person['ADI SOYADI'] || `${person.AD} ${person.SOYAD}`;
            plan[dateStr].dayShift.karsiPersonel.push({
              'ADI SOYADI': personName,
              GOREV: 'SEVKİYAT ELEMANI',
              Vardiya: '08:00 - 16:00',
              Bolge: 'Karşı',
              originalData: person
            });
          }
        });
        
        // Anadolu bölgesine 2 kişi ata
        anadoluPersonnel.forEach((person, index) => {
          if (person) {
            const personName = person['ADI SOYADI'] || `${person.AD} ${person.SOYAD}`;
            plan[dateStr].dayShift.anadoluPersonel.push({
              'ADI SOYADI': personName,
              GOREV: 'SEVKİYAT ELEMANI',
              Vardiya: '08:00 - 16:00',
              Bolge: 'Anadolu',
              originalData: person
            });
          }
        });
        
        // Dinlendirilmiş personeli hesapla
        // Gece çalışan sevkiyat elemanlarını kontrol et
        const nightWorkingShippingToday = new Set();
        const nightShiftDataToday = plan[dateStr]?.nightShift;
        if (nightShiftDataToday) {
          Object.values(nightShiftDataToday).forEach(vehicleAssignment => {
            if (vehicleAssignment.shipping && Array.isArray(vehicleAssignment.shipping)) {
              vehicleAssignment.shipping.forEach(shipping => {
                if (shipping['ADI SOYADI']) {
                  nightWorkingShippingToday.add(shipping['ADI SOYADI']);
                }
              });
            }
          });
        }
        
        // Gündüz çalışan sevkiyat elemanları (4 kişi)
        const dayWorkingShipping = new Set();
        karsiPersonnel.forEach(person => {
          if (person) {
            const personName = person['ADI SOYADI'] || `${person.AD} ${person.SOYAD}`;
            dayWorkingShipping.add(personName);
          }
        });
        anadoluPersonnel.forEach(person => {
          if (person) {
            const personName = person['ADI SOYADI'] || `${person.AD} ${person.SOYAD}`;
            dayWorkingShipping.add(personName);
          }
        });
        
        // Gündüz vardiyası için dinlendirilmiş personel hesaplama yapmıyoruz
        // Çünkü dinlendirilmiş personel sadece gece vardiyası için gösterilir
      }
    }

    // Uyarıları plana ekle
    if (warnings.length > 0) {
      plan.warnings = warnings;
    }

    return {
      plan,
      warnings,
      restingPersonnel,
      summary: {
        totalDays: days,
        totalVehicles: vehicles.length,
        totalDrivers: allDrivers.length,
        totalShippingStaff: allShippingStaff.length,
        shift: shift
      }
    };
  };

  if (loading) {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-pink-500 to-orange-600 rounded-full mb-6 animate-pulse">
            <Database className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Veriler Yükleniyor...
          </h2>
          <p className="text-gray-600 text-lg">
            Personel, araç ve mağaza verileri Supabase'den çekiliyor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Under Construction Banner */}
      <UnderConstructionBanner />
      
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-pink-500 to-orange-600 rounded-full mb-6 animate-pulse-slow">
          <Calendar className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4 gradient-text">
          Vardiya Planlama
        </h2>
        <p className="text-gray-600 text-lg">
          Seçtiğiniz tarih aralığı ve araçlar için otomatik vardiya planı oluşturun
        </p>
      </div>

      {/* Planning Form */}
      <div className="modern-card p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <Settings className="w-6 h-6" />
          Planlama Ayarları
        </h3>

        {/* Date Range */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="modern-input w-full px-4 py-3 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || new Date().toISOString().split('T')[0]}
              className="modern-input w-full px-4 py-3 text-gray-900"
            />
          </div>
        </div>

        {/* Vehicle Selection */}
        <div className="mb-8">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Car className="w-5 h-5" />
            Araç Seçimi ({selectedVehicles.length}/{vehicleData?.length || 0})
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicleData && vehicleData.map((vehicle) => {
              const normalizedVehicle = normalizeVehicleData(vehicle);
              const licensePlate = normalizedVehicle.license_plate;
              const vehicleType = normalizedVehicle.vehicle_type;
              const driverName = normalizedVehicle.driver_name;
              
              return (
              <div
                  key={licensePlate}
                  onClick={() => handleVehicleToggle(licensePlate)}
                className={`
                  relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 transform hover:scale-105
                    ${selectedVehicles.includes(licensePlate)
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'modern-card border-gray-300 hover:border-blue-300'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        vehicleType === 'Kamyonet' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                        vehicleType === 'Panelvan' ? 'bg-gradient-to-r from-orange-500 to-yellow-600' :
                      'bg-gradient-to-r from-blue-500 to-purple-600'
                    }`}>
                      <Car className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h5 className="font-semibold text-gray-900">{licensePlate}</h5>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            vehicleType === 'Kamyonet' ? 'bg-green-100 text-green-800 border border-green-300' :
                            vehicleType === 'Panelvan' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                          'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}>
                            {vehicleType === 'Kamyonet' ? '🚐' :
                             vehicleType === 'Panelvan' ? '📦' :
                             '🚛'} {vehicleType || 'Kamyon'}
                        </span>
                      </div>
                    </div>
                  </div>
                    {selectedVehicles.includes(licensePlate) && (
                    <CheckCircle className="w-6 h-6 text-blue-500" />
                  )}
                </div>
              
                <div className="mt-3 flex items-center gap-2">
                    {driverName && (
                    <span className="modern-badge green text-xs">
                        Sabit: {driverName}
                    </span>
                  )}
                    {normalizedVehicle.SOFOR_2 && (
                    <span className="modern-badge blue text-xs">
                        2.Şoför: {normalizedVehicle.SOFOR_2}
                    </span>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>

        {/* Error Message */}
        {/* error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        ) */}

        {/* Generate Button */}
        <div className="flex justify-center">
          <button
            onClick={generatePlan}
            disabled={isGenerating}
            className={`
              modern-button flex items-center gap-3 px-8 py-4 text-lg
              ${isGenerating 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:scale-105'
              }
            `}
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Plan Oluşturuluyor...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Vardiya Planı Oluştur
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="modern-card p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Vardiya Saatleri
          </h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <div>
                <p className="font-medium text-blue-800">Gece Vardiyası</p>
                <p className="text-sm text-blue-600">22:00 - 06:00</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
              <div>
                <p className="font-medium text-orange-800">Gündüz Vardiyası</p>
                <p className="text-sm text-orange-600">08:00 - 16:00</p>
              </div>
            </div>
          </div>
        </div>

        <div className="modern-card p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Personel Özeti
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-700">Toplam Personel:</span>
              <span className="text-gray-900 font-semibold">{personnelData.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Şoför:</span>
              <span className="text-blue-600 font-semibold">
                {personnelData.filter(p => {
                  const normalizedPerson = normalizePersonnelData(p);
                  return normalizedPerson.position?.includes('ŞOFÖR');
                }).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Sevkiyat:</span>
              <span className="text-purple-600 font-semibold">
                {personnelData.filter(p => {
                  const normalizedPerson = normalizePersonnelData(p);
                  return normalizedPerson.position?.includes('SEVKİYAT');
                }).length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Personnel Summary */}
      {generatedPlan && generatedPlan.personnelSummary && (
        <div className="modern-card p-6 mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Personel Özet Raporu
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(generatedPlan.personnelSummary).map((person, index) => (
              <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    person.type === 'Şoför' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-orange-100 text-orange-600'
                  }`}>
                    {person.type === 'Şoför' ? '🚚' : '👷'}
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-800 text-sm">{person.name}</h5>
                    <p className="text-xs text-gray-600">{person.type}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Toplam Gün:</span>
                    <span className="text-sm font-medium text-gray-800">{person.totalDays}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">🌙 Gece:</span>
                    <span className="text-sm font-medium text-blue-600">{person.nightShifts}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">🌅 Gündüz:</span>
                    <span className="text-sm font-medium text-orange-600">{person.dayShifts}</span>
                  </div>
                  
                  {/* Araç Tipleri */}
                  <div className="mt-3">
                    <p className="text-xs text-gray-600 mb-1">Araç Tipleri:</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(person.vehicleTypes).map(([vehicleType, count]) => (
                        <span 
                          key={vehicleType}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            vehicleType === 'Kamyonet' ? 'bg-green-100 text-green-800' :
                            vehicleType === 'Panelvan' ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {vehicleType === 'Kamyonet' ? '🚐' :
                           vehicleType === 'Panelvan' ? '📦' :
                           '🚛'} {count}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Zorluk Seviyeleri */}
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-1">Zorluk Seviyeleri:</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(person.difficulties).map(([difficulty, count]) => (
                        <span 
                          key={difficulty}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            difficulty === 'basit' ? 'bg-green-100 text-green-800' :
                            difficulty === 'orta' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}
                        >
                          {difficulty === 'basit' ? '✅' :
                           difficulty === 'orta' ? '⚠️' :
                           '🔥'} {difficulty}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-1">Planlama Özeti</h4>
                <p className="text-sm text-blue-700">
                  Bu rapor, her personelin kaç gün çalıştığını, hangi araç tiplerinde görev aldığını ve 
                  zorluk seviyelerinin dağılımını göstermektedir. Sistemin adil rotasyon ve dengeli 
                  iş yükü dağılımını sağladığını kontrol edebilirsiniz.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="modern-card p-6 bg-blue-50 border-l-4 border-blue-500">
        <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <Info className="w-5 h-5" />
          Nasıl Kullanılır?
        </h4>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1 font-semibold">1.</span>
            Planlama yapmak istediğiniz tarih aralığını seçin (maksimum 30 gün)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1 font-semibold">2.</span>
            Plana dahil etmek istediğiniz araçları seçin
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1 font-semibold">3.</span>
            "Vardiya Planı Oluştur" butonuna tıklayın
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1 font-semibold">4.</span>
            Sistem otomatik olarak gece ve gündüz vardiyalarını planlayacak
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-1 font-semibold">5.</span>
            Plan oluşturulduktan sonra personel özet raporunu inceleyin
          </li>
        </ul>
      </div>
    </div>
  );
};

export default VardiyaPlanlama; 