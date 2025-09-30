// Kodun başına aşağıdaki yorumu ekle:
// Gündüz bölgeleri: Karşı, Anadolu (Toplam: 2)
import React, { useState, useEffect } from 'react';
import { 
  Users, Car, Truck, MapPin, Calendar, Filter, Search, RefreshCw, 
  Download, Eye, EyeOff, Sun, Moon, Clock, AlertCircle, CheckCircle,
  BarChart3, Settings, RotateCcw, Save, FileText, UserCheck, Plus, Minus, Printer, ArrowLeft, Trash2, Edit
} from 'lucide-react';
import { 
  getAllPersonnel, 
  getAllVehicles, 
  getAllStores,
  getCurrentWeeklyShifts,
  getPersonnelShiftDetails,
  supabase
} from '../../services/supabase';
import { Table, Card, Button, Space, Tag, Tooltip, Alert, Spin, Row, Col, Statistic, message } from 'antd';

const AkilliDagitim = ({ userRole, onDataUpdate, user }) => {
  const [personnelData, setPersonnelData] = useState([]);
  const [vehicleData, setVehicleData] = useState([]);
  const [storeData, setStoreData] = useState([]);
  const [currentShifts, setCurrentShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Vardiya bilgileri için state
  const [shiftInfo, setShiftInfo] = useState({
    gunduzDrivers: [],
    geceDrivers: [],
    gunduzDeliveryStaff: [],
    geceDeliveryStaff: []
  });

  // Personel çalışma yoğunluğu takibi
  const [personnelWorkload, setPersonnelWorkload] = useState({});
  
  // Haftalık bölge dağıtım takibi
  const [weeklyRegionDistribution, setWeeklyRegionDistribution] = useState({});
  
  // Personel istatistikleri takibi
  const [personnelStats, setPersonnelStats] = useState({});
  
  // Personel atama geçmişi (peş peşe aynı plakaya atanmasın)
  const [personnelAssignmentHistory, setPersonnelAssignmentHistory] = useState({});
  
  // Kaydedilen planlar
  const [savedPlans, setSavedPlans] = useState([]);
  const [showSavedPlans, setShowSavedPlans] = useState(true); // İlk açılışta true
  const [currentView, setCurrentView] = useState('list'); // 'list' veya 'detail'
  
  // Plan oluşturma durumu
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  // Ayarlar durumu
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    enableLeaveExclusion: true,
    enablePreviousDayConsideration: true,
    enableWorkloadBalancing: true
  });
  
  // Hafta bilgisi
  const [currentWeek, setCurrentWeek] = useState('28-04 Ekim 2025');
  
  // Haftalık plan
  const [weeklyPlan, setWeeklyPlan] = useState(null);
  
  // Özet bilgiler
  const [summary, setSummary] = useState(null);
  
  // Düzenlenebilir başlıklar
  const [editableTitles, setEditableTitles] = useState({
    mainTitle: 'Akıllı Personel Dağıtım Sistemi',
    subtitle: 'Gece vardiyası personeli için optimize edilmiş haftalık dağıtım planı',
    planTitle: 'Akıllı Personel Dağıtım Planı - Gece Vardiyası',
    planSubtitle: '8 araç - Ekip Kuralı: 1 Şoför + 2 Sevkiyat Elemanı'
  });
  
  // Düzenleme durumu
  const [editingTitle, setEditingTitle] = useState(null);

  // İlk açılışta kaydedilen planları yükle
  useEffect(() => {
    loadSavedPlans();
  }, []);

  // Başlık düzenleme fonksiyonları
  const handleTitleEdit = (titleKey) => {
    setEditingTitle(titleKey);
  };

  const handleTitleSave = (titleKey, newValue) => {
    setEditableTitles(prev => ({
      ...prev,
      [titleKey]: newValue
    }));
    setEditingTitle(null);
  };

  const handleTitleCancel = () => {
    setEditingTitle(null);
  };

  // Plan silme fonksiyonu
  const handleDeletePlan = async (planId) => {
    try {
      const { error } = await supabase
        .from('saved_plans')
        .delete()
        .eq('id', planId);
      
      if (error) throw error;
      
      message.success('Plan başarıyla silindi!');
      loadSavedPlans(); // Listeyi yenile
    } catch (error) {
      console.error('Plan silme hatası:', error);
      message.error('Plan silinirken hata oluştu!');
    }
  };

  // Plan adı güncelleme fonksiyonu
  const handleUpdatePlanName = async (planId, newName) => {
    try {
      const { error } = await supabase
        .from('saved_plans')
        .update({ plan_name: newName })
        .eq('id', planId);
      
      if (error) throw error;
      
      message.success('Plan adı güncellendi!');
      loadSavedPlans(); // Listeyi yenile
    } catch (error) {
      console.error('Plan adı güncelleme hatası:', error);
      message.error('Plan adı güncellenirken hata oluştu!');
    }
  };

  // Düzenlenebilir başlık bileşeni
  const EditableTitle = ({ titleKey, title, className = "", placeholder = "" }) => {
    const [tempValue, setTempValue] = useState(title);
    
    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        handleTitleSave(titleKey, tempValue);
      } else if (e.key === 'Escape') {
        setTempValue(title);
        handleTitleCancel();
      }
    };

    if (editingTitle === titleKey) {
      return (
        <input
          type="text"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={handleKeyPress}
          onBlur={() => handleTitleSave(titleKey, tempValue)}
          className={`bg-transparent border-b-2 border-blue-500 outline-none ${className}`}
          placeholder={placeholder}
          autoFocus
        />
      );
    }

    return (
      <span 
        className={`cursor-pointer hover:bg-gray-100 px-2 py-1 rounded ${className}`}
        onClick={() => {
          setTempValue(title);
          handleTitleEdit(titleKey);
        }}
        title="Düzenlemek için tıklayın"
      >
        {title}
      </span>
    );
  };

  // A3 yazdırma fonksiyonu
  const handlePrint = () => {
    const printContent = document.getElementById('printable-plan');
    if (!printContent) {
      message.error('Yazdırılacak içerik bulunamadı');
      return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Akıllı Personel Dağıtım Planı - A3 Format</title>
          <style>
            @page {
              size: A3;
              margin: 1cm;
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.4;
            }
            .print-header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .print-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .print-subtitle {
              font-size: 14px;
              color: #666;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #333;
              padding: 8px;
              text-align: center;
              vertical-align: top;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .day-row {
              background-color: #f9f9f9;
            }
            .driver-cell {
              background-color: #e3f2fd;
              font-weight: bold;
            }
            .staff-cell {
              background-color: #e8f5e8;
            }
            .print-footer {
              margin-top: 20px;
              text-align: center;
              font-size: 10px;
              color: #666;
              border-top: 1px solid #333;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <div class="print-title">Akıllı Personel Dağıtım Planı - Gece Vardiyası</div>
            <div class="print-subtitle">8 araç - Ekip Kuralı: 1 Şoför + 2 Sevkiyat Elemanı</div>
            <div class="print-subtitle">Tarih: ${new Date().toLocaleDateString('tr-TR')}</div>
          </div>
          ${printContent.innerHTML}
          <div class="print-footer">
            Bu plan otomatik olarak oluşturulmuştur. Tarih: ${new Date().toLocaleString('tr-TR')}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Planı kaydetme fonksiyonu
  const handleSavePlan = async () => {
    if (!weeklyPlan) {
      message.error('Kaydedilecek plan bulunamadı');
      return;
    }

    try {
      const planData = {
        plan_name: `Gece Vardiyası Planı - ${new Date().toLocaleDateString('tr-TR')}`,
        plan_data: weeklyPlan,
        personnel_stats: personnelStats,
        created_at: new Date().toISOString(),
        created_by: user?.full_name || user?.email || 'Sistem'
      };

      const { data, error } = await supabase
        .from('saved_plans')
        .insert([planData])
        .select();

      if (error) {
        console.error('Plan kaydetme hatası:', error);
        message.error('Plan kaydedilemedi: ' + error.message);
        return;
      }

      message.success('Plan başarıyla kaydedildi!');
      loadSavedPlans(); // Kaydedilen planları yeniden yükle
      setCurrentView('detail'); // Plan oluşturulduktan sonra detay sayfasına git
    } catch (error) {
      console.error('Plan kaydetme hatası:', error);
      message.error('Plan kaydedilemedi');
    }
  };

  // Kaydedilen planları yükleme fonksiyonu
  const loadSavedPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Planlar yüklenirken hata:', error);
        return;
      }

      setSavedPlans(data || []);
    } catch (error) {
      console.error('Planlar yüklenirken hata:', error);
    }
  };

  // Kaydedilen planı yükleme fonksiyonu
  const loadSavedPlan = async (planId) => {
    try {
      const { data, error } = await supabase
        .from('saved_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (error) {
        console.error('Plan yüklenirken hata:', error);
        message.error('Plan yüklenemedi');
        return;
      }

      setWeeklyPlan(data.plan_data);
      setPersonnelStats(data.personnel_stats || {});
      setCurrentView('detail');
      message.success('Plan başarıyla yüklendi!');
    } catch (error) {
      console.error('Plan yüklenirken hata:', error);
      message.error('Plan yüklenemedi');
    }
  };
  
    // Haftalık bölge hedefleri kaldırıldı - Sadece personel dağılımına odaklanıyoruz

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

  // Bölgeler - Detaylı kurallara göre düzenlenmiş
  const regions = {
    gece: {
      // Kamyon bölgeleri (Gebze, Kocaeli, Sakarya)
      kamyon: {
        gebze: 'Gebze',
        kocaeli: 'Kocaeli',
        sakarya: 'Sakarya'
      },
      // M.tepe/Kartal/Pendik - Her gün 2 araç (1 Kamyonet + 1 Panelvan)
      maltepe: {
        maltepe: 'M.tepe/Kartal/Pendik'
      },
      // Panelvan bölgeleri (Şile, Kadıköy)
      panelvan: {
        sile: 'Şile',
        kadikoy: 'Kadıköy'
      },
      // Haftalık bölgeler (Ataşehir, Beykoz - hafta da 2-3 kez)
      haftalik: {
        atasehir: 'Ataşehir/Ümraniye/Üsküdar',
        beykoz: 'Beykoz/Ç.köy/S.tepe/S.beyliği'
      },
      // Kapalı bölgeler (Balıkesir-Avşa - sezonluk kapalı)
      kapali: {
        avsa: 'Balıkesir-Avşa'
      }
    }
  };

  // Bölge zorluk seviyeleri ve haftalık dağıtım kuralları
  const regionDifficulty = {
    'Sakarya': { level: 3, weight: 1.5, type: 'kamyon', weeklyTarget: 3 },
    'Kocaeli': { level: 3, weight: 1.5, type: 'kamyon', weeklyTarget: 3 },
    'Gebze': { level: 3, weight: 1.5, type: 'kamyon', weeklyTarget: 3 },
    'Şile': { level: 2, weight: 1.2, type: 'panelvan', weeklyTarget: 2 },
    'M.tepe/Kartal/Pendik': { level: 1, weight: 1.0, type: 'maltepe', weeklyTarget: 7 }, // Her gün 2 araç
    'Kadıköy': { level: 1, weight: 1.0, type: 'panelvan', weeklyTarget: 3 },
    'Ataşehir/Ümraniye/Üsküdar': { level: 1, weight: 1.0, type: 'haftalik', weeklyTarget: 2 },
    'Beykoz/Ç.köy/S.tepe/S.beyliği': { level: 1, weight: 1.0, type: 'haftalik', weeklyTarget: 2 },
    'Balıkesir-Avşa': { level: 0, weight: 0, type: 'kapali', weeklyTarget: 0 } // Kapalı
  };

  // Bölge renk haritası kaldırıldı

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

  // En iyi sevkiyat elemanını seç (akıllı dinlenme algoritması)
  const selectBestStaff = (candidateStaff, dayIndex, vehicleIndex, staffIndex) => {
    if (candidateStaff.length === 0) return null;
    if (candidateStaff.length === 1) return candidateStaff[0];

    // Her sevkiyat elemanı için skor hesapla
    const staffScores = candidateStaff.map(staff => {
      const workload = personnelWorkload[staff.employee_code] || {
        totalDays: 0,
        totalWeight: 0,
        uzakRegions: 0,
        consecutiveDays: 0
      };

      // Skor hesaplama (düşük skor = daha iyi seçim)
      let score = 0;
      
      // 1. Toplam çalışma günü (düşük olan tercih edilir)
      score += workload.totalDays * 10;
      
      // 2. Toplam yoğunluk ağırlığı (düşük olan tercih edilir)
      score += workload.totalWeight * 5;
      
      // 3. Uzak bölge çalışma sayısı (düşük olan tercih edilir)
      score += workload.uzakRegions * 15;
      
      // 4. Ardışık çalışma günleri (düşük olan tercih edilir)
      score += workload.consecutiveDays * 8;
      
      // 5. Son çalışma günü (uzun süre dinlenen tercih edilir)
      const daysSinceLastWork = dayIndex - workload.lastWorkDay;
      score -= daysSinceLastWork * 3;
      
      // 6. Günlük rotasyon faktörü (her gün farklı personel için)
      score += (dayIndex + vehicleIndex + staffIndex) * 0.5;
      
      // 7. Rastgele faktör (eşit skorlarda çeşitlilik için)
      score += Math.random() * 2;

      return {
        staff,
        score,
        workload
      };
    });

    // En düşük skorlu sevkiyat elemanını seç
    staffScores.sort((a, b) => a.score - b.score);
    
    const selected = staffScores[0];
    console.log(`🎯 Sevkiyat seçimi: ${selected.staff.full_name} (skor: ${selected.score.toFixed(2)})`);
    
    return selected.staff;
  };

  // En iyi şoförü seç (akıllı dinlenme algoritması)
  const selectBestDriver = (candidateDrivers, dayIndex, vehicleIndex) => {
    if (candidateDrivers.length === 0) return null;
    if (candidateDrivers.length === 1) return candidateDrivers[0];

    // Her şoför için skor hesapla
    const driverScores = candidateDrivers.map(driver => {
      const workload = personnelWorkload[driver.employee_code] || {
        totalDays: 0,
        totalWeight: 0,
        uzakRegions: 0,
        consecutiveDays: 0,
        lastWorkDay: -1
      };

      // Skor hesaplama (düşük skor = daha iyi seçim)
      let score = 0;
      
      // 1. Toplam çalışma günü (düşük olan tercih edilir)
      score += workload.totalDays * 10;
      
      // 2. Toplam yoğunluk ağırlığı (düşük olan tercih edilir)
      score += workload.totalWeight * 5;
      
      // 3. Uzak bölge çalışma sayısı (düşük olan tercih edilir)
      score += workload.uzakRegions * 15;
      
      // 4. Ardışık çalışma günleri (düşük olan tercih edilir)
      score += workload.consecutiveDays * 8;
      
      // 5. Son çalışma günü (uzun süre dinlenen tercih edilir)
      const daysSinceLastWork = dayIndex - workload.lastWorkDay;
      score -= daysSinceLastWork * 3;
      
      // 6. Günlük rotasyon faktörü (her gün farklı personel için)
      score += (dayIndex + vehicleIndex) * 0.5;
      
      // 7. Rastgele faktör (eşit skorlarda çeşitlilik için)
      score += Math.random() * 2;

      return {
        driver,
        score,
        workload
      };
    });

    // En düşük skorlu şoförü seç
    driverScores.sort((a, b) => a.score - b.score);
    
    const selected = driverScores[0];
    console.log(`🎯 Şoför seçimi: ${selected.driver.full_name} (skor: ${selected.score.toFixed(2)})`);
    
    return selected.driver;
  };

  // Personel çalışma yoğunluğunu hesapla
  const calculatePersonnelWorkload = (weeklyPlan) => {
    if (!weeklyPlan) return {};

    const workload = {};
    
    // Tüm personel için başlangıç değerleri
    const allPersonnel = [...shiftInfo.geceDrivers, ...shiftInfo.geceDeliveryStaff];
    allPersonnel.forEach(person => {
      workload[person.employee_code] = {
        name: person.full_name,
        totalDays: 0,
        totalWeight: 0,
        uzakRegions: 0,
        ortaRegions: 0,
        yakinRegions: 0,
        lastWorkDay: -1,
        consecutiveDays: 0
      };
    });

    // Haftalık planı analiz et
    const weekDays = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
    
    weekDays.forEach((day, dayIndex) => {
      const dayPlan = weeklyPlan.gece[day];
      if (!dayPlan) return;

      Object.values(dayPlan.vehicles).forEach(vehicle => {
        // Şoför yoğunluğu
        if (vehicle.driver) {
          const driverCode = vehicle.driver.employee_code;
          if (workload[driverCode]) {
            workload[driverCode].totalDays++;
            workload[driverCode].lastWorkDay = dayIndex;
            
            // Bölge zorluk ağırlığı
            const regionInfo = regionDifficulty[vehicle.region];
            if (regionInfo) {
              workload[driverCode].totalWeight += regionInfo.weight;
              
              if (regionInfo.type === 'uzak') workload[driverCode].uzakRegions++;
              else if (regionInfo.type === 'orta') workload[driverCode].ortaRegions++;
              else if (regionInfo.type === 'yakin') workload[driverCode].yakinRegions++;
            }
          }
        }

        // Sevkiyat elemanı yoğunluğu
        vehicle.deliveryStaff.forEach(staff => {
          const staffCode = staff.employee_code;
          if (workload[staffCode]) {
            workload[staffCode].totalDays++;
            workload[staffCode].lastWorkDay = dayIndex;
            
            // Bölge zorluk ağırlığı
            const regionInfo = regionDifficulty[vehicle.region];
            if (regionInfo) {
              workload[staffCode].totalWeight += regionInfo.weight;
              
              if (regionInfo.type === 'uzak') workload[staffCode].uzakRegions++;
              else if (regionInfo.type === 'orta') workload[staffCode].ortaRegions++;
              else if (regionInfo.type === 'yakin') workload[staffCode].yakinRegions++;
            }
          }
        });
      });
    });

    // Ardışık çalışma günlerini hesapla
    Object.values(workload).forEach(person => {
      if (person.totalDays > 0) {
        person.consecutiveDays = person.lastWorkDay + 1;
      }
    });

    return workload;
  };

    // Personel istatistiklerini hesapla
  const calculatePersonnelStats = (weeklyPlan) => {
    const stats = {};
    console.log('🔍 DEBUG - calculatePersonnelStats başladı, weeklyPlan:', weeklyPlan);
    
    if (!weeklyPlan || !weeklyPlan.gece) {
      console.log('🔍 DEBUG - weeklyPlan veya gece verisi yok');
      return {};
    }
    
    // Tüm personeli önce başlat (yazılmadığı gün sayısını hesaplamak için)
    // shiftInfo boşsa personnelData'dan al
    let allPersonnel = [];
    if (shiftInfo.geceDrivers && shiftInfo.geceDeliveryStaff && shiftInfo.geceDrivers.length > 0) {
      allPersonnel = [...shiftInfo.geceDrivers, ...shiftInfo.geceDeliveryStaff];
    } else {
      // Fallback: personnelData'dan gece vardiyası personelini al
      const gecePersonnel = personnelData.filter(person => {
        const shiftStatus = getCurrentShiftStatus(person.employee_code);
        return shiftStatus === 'gece';
      });
      allPersonnel = gecePersonnel;
    }
    
    allPersonnel.forEach(person => {
      stats[person.employee_code] = {
        name: person.full_name,
        position: person.position || (person.position === 'ŞOFÖR' ? 'ŞOFÖR' : 'SEVKİYAT ELEMANI'),
        kamyon: 0,
        kamyonet: 0,
        panelvan: 0,
        total: 0,
        unassignedDays: 0
      };
    });
    
    // Haftalık planı analiz et
    const weekDays = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
    
    weekDays.forEach(day => {
      const dayPlan = weeklyPlan.gece[day];
      if (!dayPlan || !dayPlan.vehicles) return;
      
      // Günlük atanan personeli topla
      const dailyAssigned = new Set();
      
      Object.values(dayPlan.vehicles).forEach(vehicleAssignment => {
        console.log('🔍 DEBUG - vehicleAssignment:', vehicleAssignment);
        // Araç tipini vehicleAssignment'dan al
        const vehicleType = vehicleAssignment.vehicleType || vehicleAssignment.type || 'Bilinmiyor';
        console.log('🔍 DEBUG - vehicleType:', vehicleType);
        
        // Araç tipini normalize et (büyük/küçük harf uyumluluğu için)
        let normalizedType = vehicleType.toLowerCase();
        if (normalizedType === 'kamyon') {
          normalizedType = 'kamyon';
        } else if (normalizedType === 'kamyonet') {
          normalizedType = 'kamyonet';
        } else if (normalizedType === 'panelvan') {
          normalizedType = 'panelvan';
        }
        
        // Şoför istatistikleri
        if (vehicleAssignment.driver) {
          const driverCode = vehicleAssignment.driver.employee_code;
          if (stats[driverCode]) {
            // Araç tipine göre sayacı artır
            if (normalizedType === 'kamyon') {
              stats[driverCode].kamyon++;
            } else if (normalizedType === 'kamyonet') {
              stats[driverCode].kamyonet++;
            } else if (normalizedType === 'panelvan') {
              stats[driverCode].panelvan++;
            }
          stats[driverCode].total++;
            dailyAssigned.add(driverCode);
          }
        }
        
        // Sevkiyat elemanı istatistikleri
        if (vehicleAssignment.deliveryStaff && Array.isArray(vehicleAssignment.deliveryStaff)) {
        vehicleAssignment.deliveryStaff.forEach(staff => {
          const staffCode = staff.employee_code;
            if (stats[staffCode]) {
              // Araç tipine göre sayacı artır
              if (normalizedType === 'kamyon') {
                stats[staffCode].kamyon++;
              } else if (normalizedType === 'kamyonet') {
                stats[staffCode].kamyonet++;
              } else if (normalizedType === 'panelvan') {
                stats[staffCode].panelvan++;
              }
          stats[staffCode].total++;
              dailyAssigned.add(staffCode);
            }
          });
        }
      });
      
      // Bu gün atanmayan personeli işaretle
      allPersonnel.forEach(person => {
        if (!dailyAssigned.has(person.employee_code)) {
          stats[person.employee_code].unassignedDays++;
        }
      });
    });
    
    console.log('🔍 DEBUG - calculatePersonnelStats sonucu:', stats);
    return stats;
  };

    // Akıllı Personel Dağıtım Sistemi - Ana Plan Oluşturma
  const generateWeeklyPlan = () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    
    // Haftalık bölge hedefleri kaldırıldı - Sadece personel dağılımına odaklanıyoruz

    const { 
      geceSoforler, 
      geceSevkiyatElemanlari 
    } = categorizePersonnel();
    
    // Sadece gece vardiyası personelini kullan
    const availableGeceDrivers = filterAvailablePersonnel(geceSoforler);
    const availableGeceDeliveryStaff = filterAvailablePersonnel(geceSevkiyatElemanlari);
    
    // Gece vardiyası araçları
    const geceVehicles = getFixedVehicles();

    console.log('🌙 Müsait gece şoförleri:', availableGeceDrivers.length, availableGeceDrivers.map(d => d.full_name));
    console.log('🌙 Müsait gece sevkiyat elemanları:', availableGeceDeliveryStaff.length, availableGeceDeliveryStaff.map(s => s.full_name));
    
    // Personel eksikliği kontrolü
    const fixedVehiclesCheck = getFixedVehicles();
    const totalDriversNeeded = fixedVehiclesCheck.length; // 8 şoför
    const totalDeliveryStaffNeeded = fixedVehiclesCheck.length * 2; // 16 sevkiyat elemanı
    
    console.log(`📊 Personel İhtiyacı: ${totalDriversNeeded} şoför, ${totalDeliveryStaffNeeded} sevkiyat elemanı`);
    console.log(`📊 Mevcut Personel: ${availableGeceDrivers.length} şoför, ${availableGeceDeliveryStaff.length} sevkiyat elemanı`);
    
    if (availableGeceDrivers.length < totalDriversNeeded) {
      console.warn(`⚠️ Şoför eksikliği: ${totalDriversNeeded - availableGeceDrivers.length} kişi`);
    }
    if (availableGeceDeliveryStaff.length < totalDeliveryStaffNeeded) {
      console.warn(`⚠️ Sevkiyat elemanı eksikliği: ${totalDeliveryStaffNeeded - availableGeceDeliveryStaff.length} kişi`);
    }

    // Vardiya bilgilerini state'e kaydet
    setShiftInfo({
      geceDrivers: availableGeceDrivers,
      geceDeliveryStaff: availableGeceDeliveryStaff
    });

    // Personel yoğunluğu takibini başlat (boş başlangıç)
    const initialWorkload = {};
    [...availableGeceDrivers, ...availableGeceDeliveryStaff].forEach(person => {
      initialWorkload[person.employee_code] = {
        name: person.full_name,
        totalDays: 0,
        totalWeight: 0,
        uzakRegions: 0,
        ortaRegions: 0,
        yakinRegions: 0,
        lastWorkDay: -1,
        consecutiveDays: 0
      };
    });
    setPersonnelWorkload(initialWorkload);

    // Sabit araçları al
    const fixedVehicles = getFixedVehicles();
    
    if (fixedVehicles.length === 0) {
      const errorMessage = `Araç verileri yüklenemedi!\n\nMevcut araç sayısı: ${vehicleData.length}\nAranan plakalar: ${fixedVehiclePlates.join(', ')}\n\nLütfen sayfayı yenileyin veya araç listesini kontrol edin.`;
      alert(errorMessage);
      return;
    }

    console.log('✅ Bulunan araçlar:', fixedVehicles.map(v => `${v.plate} (${v.type}) - Sabit Şoför1: ${v.driver1 || 'Yok'} - Sabit Şoför2: ${v.driver2 || 'Yok'}`));

    // Haftalık plan oluştur - Sadece gece vardiyası
    const weekDays = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
    const weeklyPlan = {
      gece: {}
    };

    // Akıllı Dağıtım Algoritması - Gece Vardiyası
    weekDays.forEach((day, dayIndex) => {
      const dayPlan = {
        date: getDateForDay(dayIndex),
        vehicles: {}
      };



      // Araçları al
      const geceVehicles = getFixedVehicles();

      // --- GÜNLÜK ATANAN PERSONEL TAKİBİ ---
      const assignedDrivers = new Set();
      const assignedDeliveryStaff = new Set();

      // --- AKILLI DAĞITIM ALGORİTMASI ---
      geceVehicles.forEach((vehicle, vehicleIndex) => {
        const vehicleAssignment = {
          plate: vehicle.plate,
          type: vehicle.type,
          vehicleType: vehicle.type, // Araç tipini ekle
          driver: null,
          deliveryStaff: [],
          region: ''
        };

        // 1. SABİT ŞOFÖR ATAMA - Öncelikli (SABİT ŞOFÖRLERİ KORU - DEĞİŞTİRME)
        let fixedDriverAssigned = false;
        if (vehicle.driver1) {
          const fixedDriver = availableGeceDrivers.find(d => d.full_name === vehicle.driver1);
          if (fixedDriver) {
            vehicleAssignment.driver = fixedDriver;
            assignedDrivers.add(fixedDriver.employee_code);
            fixedDriverAssigned = true;
            console.log(`🌙 ${day} - ${vehicle.plate}: Sabit Şoför1 ${fixedDriver.full_name} atandı (SABİT)`);
          }
        }
        if (!fixedDriverAssigned && vehicle.driver2) {
          const fixedDriver = availableGeceDrivers.find(d => d.full_name === vehicle.driver2);
          if (fixedDriver) {
            vehicleAssignment.driver = fixedDriver;
            assignedDrivers.add(fixedDriver.employee_code);
            fixedDriverAssigned = true;
            console.log(`🌙 ${day} - ${vehicle.plate}: Sabit Şoför2 ${fixedDriver.full_name} atandı (SABİT)`);
          }
        }

        // 2. ROTASYONLU ŞOFÖR ATAMA - EŞİT DAĞITIM VE ADALET
        if (!fixedDriverAssigned) {
          // Sabit olmayan şoförleri filtrele (sabit şoförler hariç)
          const nonFixedDrivers = availableGeceDrivers.filter(driver => {
            // Sabit şoför olup olmadığını kontrol et
            const isFixedDriver = geceVehicles.some(v => 
              (v.driver1 && v.driver1 === driver.full_name) || 
              (v.driver2 && v.driver2 === driver.full_name)
            );
            return !isFixedDriver && !assignedDrivers.has(driver.employee_code);
          });

          if (nonFixedDrivers.length > 0) {
            // EŞİT DAĞITIM: En az çalışan şoförleri öncelikle seç
            const driversWithWorkload = nonFixedDrivers.map(driver => {
              // Bu hafta kaç gün çalıştığını hesapla
              let workDays = 0;
              for (let i = 0; i < dayIndex; i++) {
                const checkDay = weekDays[i];
                const checkDayPlan = weeklyPlan.gece[checkDay];
                if (checkDayPlan) {
                  Object.values(checkDayPlan.vehicles).forEach(prevAssignment => {
                    if (prevAssignment.driver && prevAssignment.driver.employee_code === driver.employee_code) {
                      workDays++;
                    }
                  });
                }
              }
              
              return {
                driver,
                workDays,
                isAvailable: true
              };
            });

            // En az çalışan şoförleri öncelikle seç
            driversWithWorkload.sort((a, b) => a.workDays - b.workDays);
            
            // Araç tipi ve aynı araç rotasyonu kontrolü
            const availableDrivers = driversWithWorkload.filter(({ driver, workDays }) => {
              // Son 2 gün hangi araçlara atanmış kontrol et
              if (dayIndex >= 2) {
                const lastTwoDays = [weekDays[dayIndex - 1], weekDays[dayIndex - 2]];
                let consecutiveSameVehicle = false;
                
                lastTwoDays.forEach(checkDay => {
                  const checkDayPlan = weeklyPlan.gece[checkDay];
                  if (checkDayPlan) {
                    Object.values(checkDayPlan.vehicles).forEach(prevAssignment => {
                      if (prevAssignment.driver && prevAssignment.driver.employee_code === driver.employee_code) {
                        // Aynı araç plakasına 2 gün üst üste atanmış mı?
                        if (prevAssignment.vehiclePlate === vehicle.plate) {
                          consecutiveSameVehicle = true;
                        }
                      }
                    });
                  }
                });
                
                if (consecutiveSameVehicle) {
                  console.log(`🚫 ${driver.full_name} son 2 gün ${vehicle.plate} aracına atanmış, bugün aynı araca atanmayacak`);
                  return false;
                }
              }
              
              // Araç tipi rotasyonu kontrolü
              if (dayIndex > 0) {
                const previousDay = weekDays[dayIndex - 1];
                const previousDayPlan = weeklyPlan.gece[previousDay];
                if (previousDayPlan) {
                  // Önceki gün hangi araç tipine atanmış bul
                  let previousVehicleType = null;
                  Object.values(previousDayPlan.vehicles).forEach(prevAssignment => {
                    if (prevAssignment.driver && prevAssignment.driver.employee_code === driver.employee_code) {
                      previousVehicleType = prevAssignment.vehicleType;
                    }
                  });
                  
                  if (previousVehicleType) {
                    const currentVehicleType = vehicle.type;
                    
                    // Kamyon → Kamyon atanmasın (Kamyonet/Panelvan'a atanmalı)
                    if (previousVehicleType === 'Kamyon' && currentVehicleType === 'Kamyon') {
                      return false;
                    }
                    // Kamyonet → Kamyonet atanmasın (Kamyon'a atanmalı)
                    if (previousVehicleType === 'Kamyonet' && currentVehicleType === 'Kamyonet') {
                      return false;
                    }
                    // Panelvan → Panelvan atanmasın (Kamyon'a atanmalı)
                    if (previousVehicleType === 'Panelvan' && currentVehicleType === 'Panelvan') {
                      return false;
                    }
                    // Kamyonet → Panelvan atanmasın (Kamyon'a atanmalı)
                    if (previousVehicleType === 'Kamyonet' && currentVehicleType === 'Panelvan') {
                      return false;
                    }
                    // Panelvan → Kamyonet atanmasın (Kamyon'a atanmalı)
                    if (previousVehicleType === 'Panelvan' && currentVehicleType === 'Kamyonet') {
                      return false;
                    }
                  }
                }
              }
              
              return true;
            }).map(({ driver }) => driver);

            if (availableDrivers.length > 0) {
              // EŞİT DAĞITIM: En az çalışan şoförü seç
              const selectedDriver = availableDrivers[0];
            vehicleAssignment.driver = selectedDriver;
            assignedDrivers.add(selectedDriver.employee_code);
              console.log(`🌙 ${day} - ${vehicle.plate}: Rotasyonlu Şoför ${selectedDriver.full_name} atandı (EŞİT DAĞITIM - En az çalışan)`);
          } else {
              // Eğer eşit dağıtım yapılamıyorsa, en az çalışan şoförü seç
              const selectedDriver = driversWithWorkload[0].driver;
              vehicleAssignment.driver = selectedDriver;
              assignedDrivers.add(selectedDriver.employee_code);
              console.log(`🌙 ${day} - ${vehicle.plate}: Rotasyonlu Şoför ${selectedDriver.full_name} atandı (SON ÇARE - En az çalışan)`);
            }
          } else {
            // Eğer sabit olmayan şoför yoksa, tüm şoförlerden seç (ama aynı gün 2 kez yazma)
            const availableDrivers = availableGeceDrivers.filter(driver => 
              !assignedDrivers.has(driver.employee_code)
            );
            
            if (availableDrivers.length > 0) {
              const driverIndex = (dayIndex * geceVehicles.length + vehicleIndex) % availableDrivers.length;
              const selectedDriver = availableDrivers[driverIndex];
              vehicleAssignment.driver = selectedDriver;
              assignedDrivers.add(selectedDriver.employee_code);
              console.log(`🌙 ${day} - ${vehicle.plate}: Şoför ${selectedDriver.full_name} atandı (SON ÇARE)`);
            } else {
              console.log(`❌ ${day} - ${vehicle.plate}: Şoför atanamadı`);
            }
          }
        }

        // 3. SEVKİYAT ELEMANI ATAMA - HER GÜN FARKLI EŞLEŞTİRME
        const staffNeeded = 2; // TÜM ARAÇLAR İÇİN 2 SEVKİYAT ELEMANI ZORUNLU
        
        // Tüm sevkiyat elemanlarının bu hafta araç tipi dağılımını hesapla
        const staffVehicleTypeStats = {};
        availableGeceDeliveryStaff.forEach(staff => {
          staffVehicleTypeStats[staff.employee_code] = {
            staff,
            kamyon: 0,
            kamyonet: 0,
            panelvan: 0,
            total: 0,
            workDays: 0,
            // Bu güne kadar hangi kişilerle çalıştığını takip et
            workedWith: new Set()
          };
          
          // Bu güne kadar kaç gün çalıştığını ve hangi araç tiplerine çıktığını hesapla
          for (let j = 0; j < dayIndex; j++) {
            const checkDay = weekDays[j];
            const checkDayPlan = weeklyPlan.gece[checkDay];
            if (checkDayPlan) {
              Object.values(checkDayPlan.vehicles).forEach(prevAssignment => {
                if (prevAssignment.deliveryStaff && prevAssignment.deliveryStaff.some(s => s.employee_code === staff.employee_code)) {
                  staffVehicleTypeStats[staff.employee_code].workDays++;
                  const vehicleType = prevAssignment.vehicleType;
                  if (vehicleType === 'Kamyon') staffVehicleTypeStats[staff.employee_code].kamyon++;
                  else if (vehicleType === 'Kamyonet') staffVehicleTypeStats[staff.employee_code].kamyonet++;
                  else if (vehicleType === 'Panelvan') staffVehicleTypeStats[staff.employee_code].panelvan++;
                  staffVehicleTypeStats[staff.employee_code].total++;
                  
                  // Bu güne kadar hangi kişilerle çalıştığını kaydet
                  prevAssignment.deliveryStaff.forEach(partner => {
                    if (partner.employee_code !== staff.employee_code) {
                      staffVehicleTypeStats[staff.employee_code].workedWith.add(partner.employee_code);
                    }
                  });
                }
              });
            }
          }
        });
        
        for (let i = 0; i < staffNeeded; i++) {
          let selectedStaff = null;
          
          // Mevcut araç tipi için en uygun sevkiyat elemanını seç
          const currentVehicleType = vehicle.type;
          const availableStaff = availableGeceDeliveryStaff.filter(staff => 
            !assignedDeliveryStaff.has(staff.employee_code)
          );
          
          if (availableStaff.length > 0) {
            // Araç tipi rotasyonu, eşit dağıtım ve farklı eşleştirme için skorlama
            const scoredStaff = availableStaff.map(staff => {
              const stats = staffVehicleTypeStats[staff.employee_code];
              let score = 0;
              
              // En az çalışan kişileri öncelikle seç
              score += (10 - stats.workDays) * 100;
              
              // Araç tipi eşit dağıtımı için skor
              if (currentVehicleType === 'Kamyon') {
                score += (10 - stats.kamyon) * 50;
              } else if (currentVehicleType === 'Kamyonet') {
                score += (10 - stats.kamyonet) * 50;
              } else if (currentVehicleType === 'Panelvan') {
                score += (10 - stats.panelvan) * 50;
              }
              
              // FARKLI EŞLEŞTİRME: Bu güne kadar az çalıştığı kişilerle eşleş
              const alreadyAssignedStaff = Array.from(assignedDeliveryStaff);
              let diversityScore = 0;
              alreadyAssignedStaff.forEach(assignedCode => {
                if (!stats.workedWith.has(assignedCode)) {
                  diversityScore += 100; // Daha önce çalışmadığı kişiyle eşleş
                } else {
                  diversityScore -= 50; // Daha önce çalıştığı kişiyle eşleşme
                }
              });
              score += diversityScore;
              
              // Önceki gün araç tipi rotasyonu kontrolü
              if (dayIndex > 0) {
                const previousDay = weekDays[dayIndex - 1];
                const previousDayPlan = weeklyPlan.gece[previousDay];
                if (previousDayPlan) {
                  let previousVehicleType = null;
                  Object.values(previousDayPlan.vehicles).forEach(prevAssignment => {
                    if (prevAssignment.deliveryStaff && prevAssignment.deliveryStaff.some(s => s.employee_code === staff.employee_code)) {
                      previousVehicleType = prevAssignment.vehicleType;
                    }
                  });
                  
                  if (previousVehicleType) {
                    // Kamyon → Kamyon atanmasın (Kamyonet/Panelvan'a atanmalı)
                    if (previousVehicleType === 'Kamyon' && currentVehicleType === 'Kamyon') {
                      score -= 1000;
                    }
                    // Kamyonet → Kamyonet atanmasın (Kamyon'a atanmalı)
                    if (previousVehicleType === 'Kamyonet' && currentVehicleType === 'Kamyonet') {
                      score -= 1000;
                    }
                    // Panelvan → Panelvan atanmasın (Kamyon'a atanmalı)
                    if (previousVehicleType === 'Panelvan' && currentVehicleType === 'Panelvan') {
                      score -= 1000;
                    }
                    // Kamyonet → Panelvan atanmasın (Kamyon'a atanmalı)
                    if (previousVehicleType === 'Kamyonet' && currentVehicleType === 'Panelvan') {
                      score -= 1000;
                    }
                    // Panelvan → Kamyonet atanmasın (Kamyon'a atanmalı)
                    if (previousVehicleType === 'Panelvan' && currentVehicleType === 'Kamyonet') {
                      score -= 1000;
                    }
                  }
                }
              }
              
              // Aynı araç plakasına 2 gün üst üste atanma kontrolü
              if (dayIndex >= 2) {
                const lastTwoDays = [weekDays[dayIndex - 1], weekDays[dayIndex - 2]];
                let consecutiveSameVehicle = false;
                
                lastTwoDays.forEach(checkDay => {
                  const checkDayPlan = weeklyPlan.gece[checkDay];
                  if (checkDayPlan) {
                    Object.values(checkDayPlan.vehicles).forEach(prevAssignment => {
                      if (prevAssignment.deliveryStaff && prevAssignment.deliveryStaff.some(s => s.employee_code === staff.employee_code)) {
                        if (prevAssignment.vehiclePlate === vehicle.plate) {
                          consecutiveSameVehicle = true;
                        }
                      }
                    });
                  }
                });
                
                if (consecutiveSameVehicle) {
                  score -= 2000;
                }
              }
              
              return { staff, score };
            });
            
            // En yüksek skorlu sevkiyat elemanını seç
            scoredStaff.sort((a, b) => b.score - a.score);
            selectedStaff = scoredStaff[0].staff;
            assignedDeliveryStaff.add(selectedStaff.employee_code);
            
            console.log(`🌙 ${day} - ${vehicle.plate}: Sevkiyat ${i+1} ${selectedStaff.full_name} atandı (SKOR: ${scoredStaff[0].score})`);
          }
          
          if (selectedStaff) {
            vehicleAssignment.deliveryStaff.push(selectedStaff);
          } else {
            console.log(`❌ ${day} - ${vehicle.plate}: Sevkiyat ${i+1} atanamadı`);
          }
        }

        // 4. BÖLGE ATAMA - KALDIRILDI (SADECE PERSONEL DAĞILIMINA ODAKLAN)
        // Bölgeleri tamamen kaldırdık, sadece personel dağılımına odaklanıyoruz
        vehicleAssignment.region = '';
        console.log(`🌙 ${day} - ${vehicle.plate}: Personel atandı (${vehicle.type}) - PERSONEL ODAKLI`);
        
        dayPlan.vehicles[vehicle.id] = vehicleAssignment;
      });
      
      weeklyPlan.gece[day] = dayPlan;
    });

    console.log('✅ Akıllı Personel Dağıtım Planı oluşturuldu:', weeklyPlan);
    setWeeklyPlan(weeklyPlan);
    
    // Personel çalışma yoğunluğunu hesapla ve kaydet
    const workload = calculatePersonnelWorkload(weeklyPlan);
    setPersonnelWorkload(workload);
    
    // Personel istatistiklerini hesapla ve kaydet
    const stats = calculatePersonnelStats(weeklyPlan);
    console.log('🔍 DEBUG - calculatePersonnelStats sonucu:', stats);
    console.log('🔍 DEBUG - Object.keys(stats).length:', Object.keys(stats).length);
    setPersonnelStats(stats);
    
    console.log('📊 Personel Çalışma Yoğunluğu:', workload);
    console.log('📊 Personel İstatistikleri:', stats);
    
    // Özet bilgileri hesapla
    const planSummary = {
      totalVehicles: geceVehicles.length,
      totalDrivers: availableGeceDrivers.length,
      totalDeliveryStaff: availableGeceDeliveryStaff.length,
      shortage: {
        driverShortage: Math.max(0, geceVehicles.length - availableGeceDrivers.length),
        deliveryStaffShortage: Math.max(0, geceVehicles.length * 2 - availableGeceDeliveryStaff.length)
      }
    };
    setSummary(planSummary);
    
    setIsGenerating(false);
    setGenerationProgress(100);
    setCurrentView('detail'); // Plan oluşturulduktan sonra detay sayfasına git
    message.success('Plan başarıyla oluşturuldu!');
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

  // Personel eksikliği kontrolü - Sadece Gece Vardiyası
  const checkPersonnelShortage = () => {
    const { 
      geceSoforler, 
      geceSevkiyatElemanlari 
    } = categorizePersonnel();
    
    const availableGeceDrivers = filterAvailablePersonnel(geceSoforler);
    const availableGeceDeliveryStaff = filterAvailablePersonnel(geceSevkiyatElemanlari);

    const fixedVehicles = getFixedVehicles();
    const totalDriversNeeded = fixedVehicles.length; // 8 şoför
    
    // Sevkiyat elemanı ihtiyacı hesapla - Ekip Kuralı: Her Araç = 1 Şoför + 2 Sevkiyat Elemanı
    const totalVehicles = fixedVehicles.length; // 8 araç
    
    // Minimum sevkiyat elemanı ihtiyacı: 8 araç × 2 kişi = 16 kişi
    const totalDeliveryStaffNeeded = totalVehicles * 2;

    return {
      driverShortage: Math.max(0, totalDriversNeeded - availableGeceDrivers.length),
      deliveryStaffShortage: Math.max(0, totalDeliveryStaffNeeded - availableGeceDeliveryStaff.length),
      availableDrivers: availableGeceDrivers.length,
      availableDeliveryStaff: availableGeceDeliveryStaff.length,
      geceDrivers: availableGeceDrivers.length,
      geceDeliveryStaff: availableGeceDeliveryStaff.length,
      totalVehicles: totalVehicles,
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


  // Günlük atanmamış personeli hesapla - Gece Vardiyası
  const getUnassignedPersonnelForDay = (day) => {
    if (!weeklyPlan || !shiftInfo.geceDrivers || !shiftInfo.geceDeliveryStaff) {
      return { unassignedDrivers: [], unassignedDeliveryStaff: [] };
    }

    const dayPlan = weeklyPlan.gece[day];
    if (!dayPlan) {
      return { unassignedDrivers: [], unassignedDeliveryStaff: [] };
    }

    // O gün atanan personeli topla
    const assignedDrivers = new Set();
    const assignedDeliveryStaff = new Set();

    // Tüm araçlardaki atamaları topla
    Object.values(dayPlan.vehicles).forEach(vehicle => {
      if (vehicle.driver) {
        assignedDrivers.add(vehicle.driver.employee_code);
      }
      if (vehicle.deliveryStaff) {
        vehicle.deliveryStaff.forEach(staff => {
        assignedDeliveryStaff.add(staff.employee_code);
      });
    }
    });

    // Atanmamış personeli bul ve kaç kez atanmadığını hesapla
    const unassignedDrivers = shiftInfo.geceDrivers
      .filter(driver => !assignedDrivers.has(driver.employee_code))
      .map(driver => {
        // Bu personelin kaç kez atanmadığını hesapla
        let unassignedCount = 0;
        const weekDays = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
        
        weekDays.forEach(checkDay => {
          const checkDayPlan = weeklyPlan.gece[checkDay];
          if (checkDayPlan) {
            let wasAssigned = false;
            Object.values(checkDayPlan.vehicles).forEach(vehicle => {
              if (vehicle.driver && vehicle.driver.employee_code === driver.employee_code) {
                wasAssigned = true;
              }
            });
            if (!wasAssigned) {
              unassignedCount++;
            }
          }
        });
        
        return {
          ...driver,
          unassignedCount
        };
      });
      
    const unassignedDeliveryStaff = shiftInfo.geceDeliveryStaff
      .filter(staff => !assignedDeliveryStaff.has(staff.employee_code))
      .map(staff => {
        // Bu personelin kaç kez atanmadığını hesapla
        let unassignedCount = 0;
        const weekDays = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
        
        weekDays.forEach(checkDay => {
          const checkDayPlan = weeklyPlan.gece[checkDay];
          if (checkDayPlan) {
            let wasAssigned = false;
            Object.values(checkDayPlan.vehicles).forEach(vehicle => {
              if (vehicle.deliveryStaff && vehicle.deliveryStaff.some(s => s.employee_code === staff.employee_code)) {
                wasAssigned = true;
              }
            });
            if (!wasAssigned) {
              unassignedCount++;
            }
          }
        });
        
        return {
          ...staff,
          unassignedCount
        };
      });

    return { unassignedDrivers, unassignedDeliveryStaff };
  };

  // Gece planı için Ant Design tablosu
  const createNightShiftTableData = () => {
    if (!weeklyPlan) return [];
    
    const weekDays = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
    const vehicles = getFixedVehicles();
    
    // Her gün için farklı arka plan rengi
    const dayColors = {
      'Pazar': 'bg-blue-50',
      'Pazartesi': 'bg-green-50', 
      'Salı': 'bg-yellow-50',
      'Çarşamba': 'bg-purple-50',
      'Perşembe': 'bg-pink-50',
      'Cuma': 'bg-indigo-50'
    };
    
    return weekDays.map(day => {
      const dayPlan = weeklyPlan.gece[day];
      const dayColor = dayColors[day];
      const row = { 
        key: day, 
        day: day,
        className: dayColor
      };
      
      vehicles.forEach(vehicle => {
        const assignment = dayPlan?.vehicles[vehicle.id];
        if (assignment) {
          // TÜM ARAÇLAR İÇİN 2 SEVKİYAT ELEMANI ZORUNLU
          const requiredStaff = 2;
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
              <div className="mb-2">
                <div className="text-sm font-bold text-blue-600">Şoför</div>
                <div className="text-sm font-medium text-gray-800">
                  {assignment.driver ? assignment.driver.full_name : 'BOŞ'}
                </div>
              </div>
              
              <div className="space-y-2">
                {[0, 1].map((index) => {
                  const staff = assignment.deliveryStaff?.[index];
                  return (
                    <div key={index} className="border-t border-gray-200 pt-1">
                      <div className="text-sm font-bold text-green-600">Sevkiyat {index + 1}</div>
                      <div className="text-sm font-medium text-gray-800">
                        {staff ? staff.full_name : 'BOŞ'}
                  </div>
                  </div>
                  );
                })}
                {/* Eksik sevkiyat uyarıları kaldırıldı */}
              </div>
              
              {/* Bölge yazısı kaldırıldı */}
            </div>
          );
        }
      });
      
      return row;
    });
  };


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
              <EditableTitle 
                titleKey="mainTitle"
                title={editableTitles.mainTitle}
                className="text-2xl font-bold text-gray-900"
                placeholder="Ana başlık"
              />
            </h2>
            <p className="text-gray-600 mt-1">
              <EditableTitle 
                titleKey="subtitle"
                title={editableTitles.subtitle}
                className="text-gray-600"
                placeholder="Alt başlık"
              />
            </p>
          </div>
          <Space>
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

      {/* Liste Görünümü */}
      {currentView === 'list' && (
        <Card 
          title={
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-5 h-5 text-blue-600 mr-2" />
                Kaydedilen Planlar
              </div>
              <Button 
                type="primary" 
                icon={<RefreshCw />} 
                onClick={generateWeeklyPlan}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Yeni Plan Oluştur
              </Button>
            </div>
          }
        >
          {savedPlans.length > 0 ? (
            <div className="space-y-3">
              {savedPlans.map((plan, index) => (
                <Card
                  key={plan.id}
                  className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500"
                  style={{
                    background: index % 2 === 0 ? '#fafafa' : '#ffffff',
                    borderRadius: '12px'
                  }}
                  bodyStyle={{ padding: '16px' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                        <h4 className="font-semibold text-gray-800 text-base group-hover:text-blue-600 transition-colors flex-1">
                          {plan.plan_name}
                        </h4>
                        <div className="flex items-center space-x-1">
                          <Button 
                            type="text" 
                            size="small"
                            onClick={() => {
                              const newName = prompt('Plan adını düzenleyin:', plan.plan_name);
                              if (newName && newName.trim() !== '') {
                                handleUpdatePlanName(plan.id, newName.trim());
                              }
                            }}
                            className="text-gray-400 hover:text-blue-600 p-1"
                            icon={<Edit className="w-4 h-4" />}
                            title="Plan adını düzenle"
                          />
                          <Button 
                            type="text" 
                            size="small"
                            onClick={() => {
                              if (window.confirm('Bu planı silmek istediğinizden emin misiniz?')) {
                                handleDeletePlan(plan.id);
                              }
                            }}
                            className="text-gray-400 hover:text-red-600 p-1"
                            icon={<Trash2 className="w-4 h-4" />}
                            title="Planı sil"
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                          {new Date(plan.created_at).toLocaleDateString('tr-TR')}
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1 text-gray-400" />
                          {new Date(plan.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1 text-gray-400" />
                          {plan.created_by || 'Sistem'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end items-center pt-4 border-t border-gray-100">
                    <div className="flex space-x-2">
                      <Button 
                        type="primary" 
                        size="small"
                        onClick={() => loadSavedPlan(plan.id)}
                        className="bg-blue-600 hover:bg-blue-700 border-0 rounded-lg font-medium"
                        icon={<Eye className="w-4 h-4" />}
                      >
                        Aç
                      </Button>
                      <Button 
                        type="default" 
                        size="small"
                        onClick={() => {
                          setWeeklyPlan(plan.plan_data);
                          setPersonnelStats(plan.personnel_stats || {});
                          setCurrentView('detail');
                          // Yazdırma işlemini biraz geciktir
                          setTimeout(() => {
                            handlePrint();
                          }, 500);
                        }}
                        className="border-gray-300 hover:border-blue-300 hover:text-blue-600 rounded-lg font-medium"
                        icon={<Printer className="w-4 h-4" />}
                      >
                        Yazdır
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="bg-gray-50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <FileText className="w-12 h-12 text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Henüz plan yok</h3>
              <p className="text-gray-500 mb-6">İlk planınızı oluşturmak için aşağıdaki butona tıklayın</p>
              <Button 
                type="primary" 
                size="large"
                onClick={generateWeeklyPlan}
                className="bg-blue-600 hover:bg-blue-700 border-0 rounded-lg font-medium px-8"
                icon={<RefreshCw className="w-5 h-5" />}
              >
                İlk Planı Oluştur
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Detay Görünümü */}
      {currentView === 'detail' && (
        <>
          {/* Geri Dön Butonu */}
          <Card>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Plan Detayları</h3>
                <p className="text-sm text-gray-600">Oluşturulan planın detaylı görünümü</p>
              </div>
              <Button 
                type="default" 
                icon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => setCurrentView('list')}
                className="border-gray-300"
              >
                Geri Dön
              </Button>
            </div>
          </Card>


      {/* Akıllı Personel Dağıtım Planı */}
      {weeklyPlan && (
        <div className="space-y-6">
          {/* Gece Vardiyası Planı */}
          <Card
            title={
              <div className="flex items-center">
                <Moon className="w-5 h-5 text-purple-600 mr-2" />
                <EditableTitle 
                  titleKey="planTitle"
                  title={editableTitles.planTitle}
                  className="text-lg font-semibold"
                  placeholder="Plan başlığı"
                />
              </div>
            }
            extra={
              <div className="flex items-center space-x-3">
              <EditableTitle 
                titleKey="planSubtitle"
                title={editableTitles.planSubtitle}
                className="text-gray-600 text-sm"
                placeholder="Plan alt başlığı"
              />
                <Button 
                  type="primary" 
                  icon={<Printer className="w-4 h-4" />}
                  onClick={handlePrint}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  A3 Yazdır
                </Button>
                <Button 
                  type="default" 
                  icon={<Save className="w-4 h-4" />}
                  onClick={handleSavePlan}
                  className="border-green-500 text-green-600 hover:bg-green-50"
                >
                  Planı Kaydet
                </Button>
              </div>
            }
          >
            <div id="printable-plan" className="printable-content">
            <Table
              dataSource={createNightShiftTableData()}
              columns={nightShiftColumns}
              pagination={false}
              scroll={{ x: 1000 }}
              size="small"
              bordered
                rowClassName={(record) => record.className || ''}
            />
            </div>
            
            {/* Personel İstatistikleri - Şoför ve Sevkiyatçı Ayrı */}
            {Object.keys(personnelStats).length > 0 ? (
              <div className="mt-6">
                <div className="flex items-center mb-4">
                  <BarChart3 className="w-5 h-5 text-purple-600 mr-2" />
                  <h4 className="text-lg font-bold text-gray-800">📊 Personel Araç Atama İstatistikleri</h4>
                </div>
                
                {/* Şoförler */}
                <div className="mb-6">
                  <div className="flex items-center mb-3">
                    <Truck className="w-4 h-4 text-blue-600 mr-2" />
                    <h5 className="text-sm font-bold text-blue-600">🚛 Şoförler - Araç Tipi Dağılımı</h5>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {Object.entries(personnelStats)
                      .filter(([code, stats]) => stats.position === 'ŞOFÖR' || stats.position === 'Şoför')
                      .sort((a, b) => b[1].total - a[1].total) // Toplam atama sayısına göre sırala
                      .map(([code, stats]) => (
                        <div key={code} className="border border-blue-200 rounded-lg p-4 bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="text-sm font-bold text-gray-800 mb-3 text-center">{stats.name}</div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-600 flex items-center">
                                <Truck className="w-3 h-3 mr-1" />
                                Kamyon:
                              </span>
                              <span className="font-bold text-blue-600 bg-blue-200 px-2 py-1 rounded-full">{stats.kamyon} kez</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-600 flex items-center">
                                <Car className="w-3 h-3 mr-1" />
                                Kamyonet:
                              </span>
                              <span className="font-bold text-orange-600 bg-orange-200 px-2 py-1 rounded-full">{stats.kamyonet} kez</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-600 flex items-center">
                                <Car className="w-3 h-3 mr-1" />
                                Panelvan:
                              </span>
                              <span className="font-bold text-purple-600 bg-purple-200 px-2 py-1 rounded-full">{stats.panelvan} kez</span>
                            </div>
                            <div className="flex justify-between items-center text-xs border-t border-gray-300 pt-2 mt-2">
                              <span className="text-gray-700 font-bold">Toplam Atama:</span>
                              <span className="font-bold text-gray-800 bg-gray-200 px-2 py-1 rounded-full">{stats.total} kez</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-600 flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                Yazılmadığı Gün:
                              </span>
                              <span className={`font-bold px-2 py-1 rounded-full ${
                                stats.unassignedDays === 0 
                                  ? 'text-green-600 bg-green-200' 
                                  : stats.unassignedDays <= 2 
                                    ? 'text-yellow-600 bg-yellow-200' 
                                    : 'text-red-600 bg-red-200'
                              }`}>
                                {stats.unassignedDays} gün
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
                
                {/* Sevkiyatçılar */}
                <div>
                  <div className="flex items-center mb-3">
                    <Users className="w-4 h-4 text-green-600 mr-2" />
                    <h5 className="text-sm font-bold text-green-600">📦 Sevkiyat Elemanları - Araç Tipi Dağılımı</h5>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {Object.entries(personnelStats)
                      .filter(([code, stats]) => stats.position === 'SEVKİYAT ELEMANI' || stats.position === 'Sevkiyat Elemanı')
                      .sort((a, b) => b[1].total - a[1].total) // Toplam atama sayısına göre sırala
                      .map(([code, stats]) => (
                        <div key={code} className="border border-green-200 rounded-lg p-4 bg-gradient-to-br from-green-50 to-green-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="text-sm font-bold text-gray-800 mb-3 text-center">{stats.name}</div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-600 flex items-center">
                                <Truck className="w-3 h-3 mr-1" />
                                Kamyon:
                              </span>
                              <span className="font-bold text-blue-600 bg-blue-200 px-2 py-1 rounded-full">{stats.kamyon} kez</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-600 flex items-center">
                                <Car className="w-3 h-3 mr-1" />
                                Kamyonet:
                              </span>
                              <span className="font-bold text-orange-600 bg-orange-200 px-2 py-1 rounded-full">{stats.kamyonet} kez</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-600 flex items-center">
                                <Car className="w-3 h-3 mr-1" />
                                Panelvan:
                              </span>
                              <span className="font-bold text-purple-600 bg-purple-200 px-2 py-1 rounded-full">{stats.panelvan} kez</span>
                            </div>
                            <div className="flex justify-between items-center text-xs border-t border-gray-300 pt-2 mt-2">
                              <span className="text-gray-700 font-bold">Toplam Atama:</span>
                              <span className="font-bold text-gray-800 bg-gray-200 px-2 py-1 rounded-full">{stats.total} kez</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-600 flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                Yazılmadığı Gün:
                              </span>
                              <span className={`font-bold px-2 py-1 rounded-full ${
                                stats.unassignedDays === 0 
                                  ? 'text-green-600 bg-green-200' 
                                  : stats.unassignedDays <= 2 
                                    ? 'text-yellow-600 bg-yellow-200' 
                                    : 'text-red-600 bg-red-200'
                              }`}>
                                {stats.unassignedDays} gün
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <div className="flex items-center mb-4">
                  <BarChart3 className="w-5 h-5 text-purple-600 mr-2" />
                  <h4 className="text-lg font-bold text-gray-800">📊 Personel Araç Atama İstatistikleri</h4>
                </div>
                <div className="text-center py-8">
                  <div className="text-gray-500 mb-2">İstatistikler yükleniyor...</div>
                  <div className="text-xs text-gray-400">Plan oluşturulduktan sonra detaylı istatistikler görüntülenecek</div>
                </div>
              </div>
            )}
            
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
                              <div key={index} className="p-1 bg-green-50 rounded text-green-700 text-xs flex justify-between items-center">
                                <span>{driver.full_name}</span>
                                <span className="bg-green-200 text-green-800 px-1 rounded text-xs font-bold">
                                  {driver.unassignedCount} kez
                                </span>
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
                              <div key={index} className="p-1 bg-blue-50 rounded text-blue-700 text-xs flex justify-between items-center">
                                <span>{staff.full_name}</span>
                                <span className="bg-blue-200 text-blue-800 px-1 rounded text-xs font-bold">
                                  {staff.unassignedCount} kez
                                </span>
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
        </>
      )}
    </div>
  );
};

export default AkilliDagitim; 