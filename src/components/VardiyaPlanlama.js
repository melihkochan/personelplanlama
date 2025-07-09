import React, { useState } from 'react';
import { Calendar, Play, Settings, Clock, Users, Car, CheckCircle, AlertCircle, Info } from 'lucide-react';

const VardiyaPlanlama = ({ personnelData, vehicleData, onPlanGenerated }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);

  const handleVehicleToggle = (vehicleId) => {
    setSelectedVehicles(prev => 
      prev.includes(vehicleId) 
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    );
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
      
      // Final plan - gece planının yapısını kullan (çünkü gündüz planı eklenmiş olacak)
      const combinedPlan = {
        plan: nightShiftResult.plan, // Bu artık hem nightShift hem dayShift içeriyor
        warnings: [...nightShiftResult.warnings, ...dayShiftResult.warnings],
        restingPersonnel: {
          nightShift: nightShiftResult.restingPersonnel,
          dayShift: dayShiftResult.restingPersonnel
        },
        summary: {
          totalDays: days,
          startDate: startDateObj.toISOString().split('T')[0],
          endDate: endDateObj.toISOString().split('T')[0],
          selectedVehicles: selectedVehicles
        }
      };
      
      console.log('Combined plan:', combinedPlan);
      
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
    const allDrivers = personnelData.filter(p => p.GOREV === 'ŞOFÖR');
    const allShippingStaff = personnelData.filter(p => p.GOREV === 'SEVKİYAT ELEMANI');
    
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
      const vardiya = p.Vardiya?.toLowerCase() || '';
      if (shift === 'gece') {
        return vardiya.includes('22:00') || vardiya.includes('06:00');
      } else {
        return vardiya.includes('08:00') || vardiya.includes('16:00');
      }
    });
    
    const shiftShippingStaff = allShippingStaff.filter(p => {
      const vardiya = p.Vardiya?.toLowerCase() || '';
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
      // GECE VARDİYASI - Araç bazlı planlama (1 Şoför + 2 Sevkiyat Elemanı)
      
      // Sabit şoförleri topla ve kontrol et
      const sabitSoforVehicles = vehicles.filter(vehicleId => {
        const vehicle = vehicleData.find(v => v.PLAKA === vehicleId);
        return vehicle?.SABIT_SOFOR;
      });
      
      // Sabit şoför çakışma kontrolü
      const sabitSoforMap = {};
      sabitSoforVehicles.forEach(vehicleId => {
        const vehicle = vehicleData.find(v => v.PLAKA === vehicleId);
        if (vehicle?.SABIT_SOFOR) {
          if (sabitSoforMap[vehicle.SABIT_SOFOR]) {
            warnings.push(`UYARI: ${vehicle.SABIT_SOFOR} sabit şoförü birden fazla araçta tanımlı! (${sabitSoforMap[vehicle.SABIT_SOFOR]} ve ${vehicle.PLAKA})`);
          } else {
            sabitSoforMap[vehicle.SABIT_SOFOR] = vehicle.PLAKA;
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



      // Araç tipi kontrolü - Kamyonet/Panelvan rotasyon kontrolü
      const vehicleTypeHistory = {}; // personel -> araç tipi geçmişi
      
      // Kişi için araç tipi atama kontrolü
      const canAssignToVehicleType = (personName, vehicleType, isSabitSofor = false) => {
        if (vehicleType === 'Kamyon') return true; // Kamyon herkese atanabilir
        if (isSabitSofor) return true; // Sabit şoförler her tür araca çıkabilir
        
        const lastVehicleType = vehicleTypeHistory[personName];
        if (!lastVehicleType) return true; // İlk kez atanıyor
        
        // Aynı kişi 2 gün üst üste Kamyonet/Panelvan'a çıkmamalı
        return lastVehicleType !== vehicleType;
      };
      
      // Şoför rotasyon algoritması - eşit dinlenme sırası
      const totalDrivers = drivers.length;
      const totalVehicles = vehicles.length;
      const driversPerDay = Math.min(totalDrivers, totalVehicles);
      const restingDriversPerDay = totalDrivers - driversPerDay;
      
      console.log(`Toplam şoför: ${totalDrivers}, Araç: ${totalVehicles}, Günlük çalışacak: ${driversPerDay}, Günlük dinlenecek: ${restingDriversPerDay}`);
      
      for (let day = 0; day < days; day++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + day);
        const dateStr = date.toISOString().split('T')[0];
        
        plan[dateStr] = { nightShift: {}, dayShift: null };
        
        // Kullanılan şoförleri takip et
        const usedDrivers = new Set();
        const usedShippingStaff = new Set();
        
        // İsim normalizasyon fonksiyonu
        const normalizeName = (person) => {
          if (typeof person === 'string') return person.trim().toUpperCase();
          return (person?.['ADI SOYADI'] || `${person?.AD || ''} ${person?.SOYAD || ''}`).trim().toUpperCase();
        };

        console.log(`\n=== GÜN ${day + 1} PLANLAMA BAŞLADI ===`);
        
        // Şoför rotasyon algoritması - eşit dinlenme için
        const workingDriversToday = [];
        for (let i = 0; i < driversPerDay; i++) {
          const driverIndex = (day + i) % totalDrivers;
          workingDriversToday.push(drivers[driverIndex]);
        }
        
        // Sevkiyat elemanları rotasyon
        const shuffledShippingStaff = [...shippingStaff];
        for (let i = 0; i < day; i++) {
          shuffledShippingStaff.push(shuffledShippingStaff.shift());
        }
        
        console.log(`Gün ${day + 1} çalışan şoförler:`, workingDriversToday.map(d => d['ADI SOYADI'] || `${d.AD} ${d.SOYAD}`));
        
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
          const availableShipping = [...shuffledShippingStaff];
          
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
              
              if (sabitDriver && canAssignToVehicleType(sabitSoforName, vehicleType, true)) {
                selectedDriver = sabitDriver;
                driverDifficulty = getNextDifficultyForPerson(sabitSoforName, 'basit');
                
                // Listeden çıkar
                const index = availableDrivers.indexOf(sabitDriver);
                availableDrivers.splice(index, 1);
              } else {
                // Sabit şoför atanamazsa başka şoför seç
                selectedDriver = availableDrivers.find(d => 
                  canAssignToVehicleType(normalizeName(d), vehicleType, false)
                );
                
                if (selectedDriver) {
                  const driverName = normalizeName(selectedDriver);
                  driverDifficulty = getNextDifficultyForPerson(driverName, 'basit');
                  
                  const index = availableDrivers.indexOf(selectedDriver);
                  availableDrivers.splice(index, 1);
                }
              }
            } else {
              // Normal şoför seçimi
              selectedDriver = availableDrivers.find(d => 
                canAssignToVehicleType(normalizeName(d), vehicleType, false)
              );
              
              if (selectedDriver) {
                const driverName = normalizeName(selectedDriver);
                driverDifficulty = getNextDifficultyForPerson(driverName, 'basit');
                
                const index = availableDrivers.indexOf(selectedDriver);
                availableDrivers.splice(index, 1);
              }
            }
            
            // Sevkiyat elemanı seçimi
            const shipping = [];
            for (let i = 0; i < 2; i++) {
              const availableShippingFiltered = availableShipping.filter(s => 
                canAssignToVehicleType(normalizeName(s), vehicleType, false)
              );
              
              if (availableShippingFiltered.length > 0) {
                const selectedShipping = availableShippingFiltered[0];
                const shippingName = normalizeName(selectedShipping);
                const shippingDifficulty = getNextDifficultyForPerson(shippingName, 'basit');
                
                shipping.push({
                  person: selectedShipping,
                  difficulty: shippingDifficulty
                });
                
                // Listeden çıkar
                const index = availableShipping.indexOf(selectedShipping);
                availableShipping.splice(index, 1);
                
                // Geçmiş güncelle
                personnelDifficultyHistory[shippingName] = shippingDifficulty;
                vehicleTypeHistory[shippingName] = vehicleType;
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
              vehicleTypeHistory[driverName] = vehicleType;
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
        
        // O gün gerçekten dinlenen şoförler (sadece gece vardiyasında çalışması gerekenler)
        const actualRestingDrivers = drivers.filter(d => {
          const driverName = d['ADI SOYADI'] || `${d.AD} ${d.SOYAD}`;
          return !nightWorkingDriversToday.has(driverName);
        });
        
        // O gün gerçekten dinlenen sevkiyat elemanları (sadece gece vardiyasında çalışması gerekenler)
        const actualRestingShipping = shippingStaff.filter(s => {
          const shippingName = s['ADI SOYADI'] || `${s.AD} ${s.SOYAD}`;
          return !nightWorkingShippingToday.has(shippingName);
        });
        
        restingPersonnel.drivers.push({
          date: dateStr,
          personnel: actualRestingDrivers.map(d => d['ADI SOYADI'] || `${d.AD} ${d.SOYAD}`)
        });
        
        restingPersonnel.shippingStaff.push({
          date: dateStr,
          personnel: actualRestingShipping.map(s => s['ADI SOYADI'] || `${s.AD} ${s.SOYAD}`)
        });
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

  return (
    <div className="max-w-6xl mx-auto space-y-8">
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
            {vehicleData && vehicleData.map((vehicle) => (
              <div
                key={vehicle.PLAKA}
                onClick={() => handleVehicleToggle(vehicle.PLAKA)}
                className={`
                  relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 transform hover:scale-105
                  ${selectedVehicles.includes(vehicle.PLAKA)
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'modern-card border-gray-300 hover:border-blue-300'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      vehicle.TIP === 'Kamyonet' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                      vehicle.TIP === 'Panelvan' ? 'bg-gradient-to-r from-orange-500 to-yellow-600' :
                      'bg-gradient-to-r from-blue-500 to-purple-600'
                    }`}>
                      <Car className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-900">{vehicle.PLAKA}</h5>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          vehicle.TIP === 'Kamyonet' ? 'bg-green-100 text-green-800 border border-green-300' :
                          vehicle.TIP === 'Panelvan' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                          'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}>
                          {vehicle.TIP === 'Kamyonet' ? '🚐' :
                           vehicle.TIP === 'Panelvan' ? '📦' :
                           '🚛'} {vehicle.TIP || 'Kamyon'}
                        </span>
                        <span className="text-gray-500 text-xs">{vehicle.NOKTA || 'Orta'}</span>
                      </div>
                    </div>
                  </div>
                  {selectedVehicles.includes(vehicle.PLAKA) && (
                    <CheckCircle className="w-6 h-6 text-blue-500" />
                  )}
                </div>
              
                <div className="mt-3 flex items-center gap-2">
                  {vehicle.SABIT_SOFOR && (
                    <span className="modern-badge green text-xs">
                      Sabit: {vehicle.SABIT_SOFOR}
                    </span>
                  )}
                  {vehicle.SOFOR_2 && (
                    <span className="modern-badge blue text-xs">
                      2.Şoför: {vehicle.SOFOR_2}
                    </span>
                  )}
                </div>
              </div>
            ))}
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
                {personnelData.filter(p => p.GOREV?.includes('ŞOFÖR')).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Sevkiyat:</span>
              <span className="text-purple-600 font-semibold">
                {personnelData.filter(p => p.GOREV?.includes('SEVKİYAT')).length}
              </span>
            </div>
          </div>
        </div>
      </div>

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
        </ul>
      </div>
    </div>
  );
};

export default VardiyaPlanlama; 