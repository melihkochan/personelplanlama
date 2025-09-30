import React, { useState, useEffect, useRef } from 'react';
import { Upload, BarChart3, Calendar, Users, Truck, Package, FileText, User, Download, CheckCircle, XCircle, AlertTriangle, X, Trash2, Edit, TrendingUp, Sun, Moon } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getAllPersonnel, bulkSavePerformanceDataWithAudit, getPerformanceData, getStoreLocationsByCodes, logAuditEvent, checkJuly7Data, supabase } from '../../services/supabase';

const PerformanceAnalysis = ({ personnelData: propPersonnelData, storeData: propStoreData, userRole, currentUser }) => {
  // PerformanceAnalysis başladı
  
  // State'ler
  const [analysisData, setAnalysisData] = useState(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [initialDataLoading, setInitialDataLoading] = useState(true); // İlk veri yükleme durumu

  const [uploadError, setUploadError] = useState('');
  const [selectedDates, setSelectedDates] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null); // Seçili ay
  const [availableShifts, setAvailableShifts] = useState([]); // Mevcut vardiyalar
  const [sortBy, setSortBy] = useState('boxes'); // Default olarak Kasa seçili
  const [sortDirection, setSortDirection] = useState('desc');
  const [personnelDatabase, setPersonnelDatabase] = useState([]);
  const [savedAnalyses, setSavedAnalyses] = useState([]);
  const [weeklyView, setWeeklyView] = useState(false); // Haftalık görünüm
  const [selectedWeeks, setSelectedWeeks] = useState([]); // Seçili haftalar
  
  // Tarih düzenleme modal state'leri
  const [showDateEditModal, setShowDateEditModal] = useState(false);
  const [allPerformanceDates, setAllPerformanceDates] = useState([]);
  const [selectedDateForEdit, setSelectedDateForEdit] = useState(null);
  const [dateEditForm, setDateEditForm] = useState({
    old_date: '',
    old_shift_type: '',
    new_date: '',
    new_shift_type: ''
  });
  const [dateEditLoading, setDateEditLoading] = useState(false);
  
  // Yardımcı: dd.MM.yyyy[ boşluk + metin] -> yyyy-MM-dd
  const formatDateToISO = (displayDate) => {
    if (!displayDate) return '';
    // Örn: '19.09.2025' veya '19.09.2025 GÜNDÜZ'
    const pure = displayDate.toString().split(' ')[0].trim();
    const parts = pure.split('.');
    if (parts.length !== 3) return pure; // zaten ISO olabilir
    const [dayRaw, monthRaw, yearRaw] = parts;
    const day = dayRaw.replace(/\D/g, '').padStart(2, '0');
    const month = monthRaw.replace(/\D/g, '').padStart(2, '0');
    const year = yearRaw.replace(/\D/g, '');
    if (!year || !month || !day) return pure;
    return `${year}-${month}-${day}`;
  };

  // Yardımcı: pozisyondan sürücü/şoför tespiti (tüm varyasyonlar)
  const isDriverRole = (position) => {
    if (!position) return false;
    const lower = position.toString().toLowerCase();
    // Türkçe karakter varyasyonlarını da yakala
    const normalized = lower
      .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i');
    return (
      lower.includes('şoför') || lower.includes('sürücü') ||
      normalized.includes('sofor') || normalized.includes('surucu') ||
      lower.includes('driver') || lower.includes('şöför') || lower.includes('soför')
    );
  };

  // File input ref
  const fileInputRef = useRef(null);

  // Tarih düzenleme fonksiyonları
  const handleOpenDateEditModal = async () => {
    setShowDateEditModal(true);
    setDateEditLoading(true);
    
    try {
      // Performance_data tablosundan tüm benzersiz tarih+shift kombinasyonlarını çek
      // Son 365 günü kapsayalım ve en yeni tarihler önce gelsin
      const minDate = new Date();
      minDate.setDate(minDate.getDate() - 365);
      const minDateStr = minDate.toISOString().slice(0, 10);

      let query = supabase
        .from('performance_data')
        .select('date, date_shift_type, sheet_name')
        .gte('date', minDateStr)
        .order('date', { ascending: false })
        .order('date_shift_type', { ascending: true });

      const { data: performanceData, error } = await query.range(0, 50000);
      
      if (error) throw error;
      
      // Benzersiz tarih+shift kombinasyonlarını oluştur
      const uniqueDates = new Map();
      
      performanceData.forEach(record => {
        const dateKey = `${record.date}_${record.date_shift_type}`;
        if (!uniqueDates.has(dateKey)) {
          uniqueDates.set(dateKey, {
            id: dateKey,
            date: record.date,
            shift_type: record.date_shift_type,
            sheet_name: record.sheet_name,
            display_name: `${new Date(record.date).toLocaleDateString('tr-TR')} ${record.date_shift_type === 'gece' ? 'Gece' : 'Gündüz'}`
          });
        }
      });
      
      const sortedDates = Array.from(uniqueDates.values()).sort((a, b) => {
        const ad = new Date(a.date).getTime();
        const bd = new Date(b.date).getTime();
        if (ad !== bd) return bd - ad; // En yeni tarih önce
        const order = { gunduz: 0, gece: 1 };
        return (order[a.shift_type] ?? 0) - (order[b.shift_type] ?? 0);
      });
      
      setAllPerformanceDates(sortedDates);
    } catch (error) {
      // console.error('❌ Performans tarihleri yükleme hatası:', error);
      alert(`❌ Performans tarihleri yüklenemedi: ${error.message}`);
    } finally {
      setDateEditLoading(false);
    }
  };

  const handleSelectDateForEdit = (dateItem) => {
    setSelectedDateForEdit(dateItem);
    setDateEditForm({
      old_date: dateItem.date,
      old_shift_type: dateItem.shift_type,
      new_date: dateItem.date,
      new_shift_type: dateItem.shift_type
    });
  };

  const handleUpdatePerformanceDate = async () => {
    if (!selectedDateForEdit) return;

    setDateEditLoading(true);
    try {
      // Performance_data tablosundaki tüm kayıtları güncelle
      const { data: updatedRecords, error } = await supabase
        .from('performance_data')
        .update({
          date: dateEditForm.new_date,
          date_shift_type: dateEditForm.new_shift_type
        })
        .eq('date', selectedDateForEdit.date)
        .eq('date_shift_type', selectedDateForEdit.shift_type)
        .select();

      if (error) throw error;


      // Audit log kaydet
      await logAuditEvent({
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userName: currentUser?.user_metadata?.full_name || currentUser?.email,
        action: 'UPDATE',
        tableName: 'performance_data',
        recordId: null,
        oldValues: selectedDateForEdit,
        newValues: {
          ...selectedDateForEdit,
          date: dateEditForm.new_date,
          date_shift_type: dateEditForm.new_shift_type
        },
        ipAddress: null,
        userAgent: navigator.userAgent,
        details: `Performans tarihi güncellendi: ${selectedDateForEdit.date} ${selectedDateForEdit.shift_type} → ${dateEditForm.new_date} ${dateEditForm.new_shift_type} (${updatedRecords.length} kayıt etkilendi)`
      });

      // Modal'ı kapat ve verileri yenile
      setShowDateEditModal(false);
      setSelectedDateForEdit(null);
      
      // State'leri sıfırla ve verileri yeniden yükle
      setAnalysisData(null);
      setAvailableDates([]);
      setSelectedDates([]);
      
      // Kısa bir gecikme ile verileri yeniden yükle
      setTimeout(() => {
        loadPerformanceDataFromDatabase();
      }, 200);

      alert(`✅ Tarih başarıyla güncellendi!\n\n${updatedRecords.length} performans kaydı etkilendi.\n\nVeriler yenileniyor...`);
    } catch (error) {
      alert(`❌ Güncelleme hatası: ${error.message}`);
    } finally {
      setDateEditLoading(false);
    }
  };

  const handleDeletePerformanceDate = async (dateItem) => {
    if (!confirm(`⚠️ Bu tarih aralığını ve tüm performans verilerini silmek istediğinizden emin misiniz?\n\nTarih: ${dateItem.display_name}\n\nBu işlem geri alınamaz!`)) {
      return;
    }

    setDateEditLoading(true);
    
    try {
      // Performance_data tablosundan ilgili kayıtları sil
      const { data: deletedRecords, error } = await supabase
        .from('performance_data')
        .delete()
        .eq('date', dateItem.date)
        .eq('date_shift_type', dateItem.shift_type)
        .select();

      if (error) throw error;


      // Audit log kaydet
      await logAuditEvent({
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userName: currentUser?.user_metadata?.full_name || currentUser?.email,
        action: 'DELETE',
        tableName: 'performance_data',
        recordId: null,
        oldValues: { dateItem, deletedRecords: deletedRecords.length },
        newValues: null,
        ipAddress: null,
        userAgent: navigator.userAgent,
        details: `Performans tarihi silindi: ${dateItem.display_name} (${deletedRecords.length} kayıt silindi)`
      });

      alert(`✅ Tarih başarıyla silindi!\n\n${deletedRecords.length} performans kaydı silindi.\n\nVeriler yenileniyor...`);
      
      // Modal verilerini yenile
      await handleOpenDateEditModal();
      
      // State'leri sıfırla ve verileri yeniden yükle
      setAnalysisData(null);
      setAvailableDates([]);
      setSelectedDates([]);
      
      // Kısa bir gecikme ile verileri yeniden yükle
      setTimeout(() => {
        loadPerformanceDataFromDatabase();
      }, 200);
      
    } catch (error) {
      // console.error('❌ Performans tarihi silme hatası:', error);
      alert(`❌ Tarih silinirken hata oluştu: ${error.message}`);
    } finally {
      setDateEditLoading(false);
    }
  };

  // Sheet adlarını normalize et
  const normalizeSheetName = (sheetName) => {
    if (!sheetName) return '';
    return sheetName.toUpperCase()
      .replace(/\s+/g, ' ')
      .replace(/GUNDUZ/g, 'GÜNDÜZ')
      .replace(/GÜNDUEZ/g, 'GÜNDÜZ')
      .trim();
  };



  // Performans verilerini veritabanından yükle - BASIT YÖNTEM
  const loadPerformanceDataFromDatabase = async () => {
    // loadPerformanceDataFromDatabase başladı
    
    
    // Personnel database kontrolünü geçici olarak kaldır
    // if (!personnelDatabase.length) {
    //   // console.log('⚠️ Personnel database henüz yüklenmemiş, veri yükleme bekleniyor...');
    //   return;
    // }

    try {
      const result = await getPerformanceData();
      
      if (result.success && result.data.length > 0) {
        
        // Personel bazında TÜM verileri göster, sadece toplam hesaplamada benzersiz olanları say
        const processedData = result.data; // Tüm verileri kullan
        
        // Toplam hesaplama için benzersiz mağaza teslimatlarını takip et
        const uniqueStoreDeliveries = new Map();
        
        result.data.forEach(record => {
          // Benzersizlik anahtarı: tarih + mağaza + palet + kasa
          const uniqueKey = `${record.date}_${record.store_id || ''}_${record.pallets || 0}_${record.boxes || 0}`;
          
          if (!uniqueStoreDeliveries.has(uniqueKey)) {
            // İlk teslimat - ekle
            uniqueStoreDeliveries.set(uniqueKey, {
              date: record.date,
              store_id: record.store_id,
              pallets: record.pallets || 0,
              boxes: record.boxes || 0,
              employee_count: 1
            });
          } else {
            // Aynı teslimat var - personel sayısını artır
            uniqueStoreDeliveries.get(uniqueKey).employee_count += 1;
          }
        });
        
        
        
        // Performance_data'daki shift_type dağılımını kontrol et (tarih shift'i)
        const shiftDistribution = {};
        const dateShiftCombos = new Set();
        
        processedData.forEach(record => {
          const shift = record.shift_type || 'undefined';
          const date = new Date(record.date).toLocaleDateString('tr-TR');
          
          shiftDistribution[shift] = (shiftDistribution[shift] || 0) + 1;
          dateShiftCombos.add(`${date}_${shift}`);
        });
        
        // Shift type dağılımı analizi
        
        // Basit format - şoför ve personel ayrımı
        const drivers = {};
        const personnel = {};
        const allDatesSet = new Set();
        
        // Benzersiz teslimatları global olarak sakla (toplam hesaplamada kullanılacak)
        window.uniqueStoreDeliveries = uniqueStoreDeliveries;
        
        // GRUPLANDIRMA: Aynı gün aynı çalışan için kayıtları birleştir
        const groupedRecords = {};
        
        processedData.forEach(record => {
          const { employee_name, employee_code, date, trips = 0, pallets = 0, boxes = 0, stores_visited = 0, date_shift_type, store_codes, sheet_name } = record;
          
          // Performance record işleniyor
          
          if (!employee_name) {
            // console.warn(`⚠️ employee_name boş, kayıt atlanıyor`);
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
              stores: new Set(), // Mağaza kodlarını benzersiz tutmak için Set kullan
              date_shift_type
            };
          }
          
          // Mağaza kodlarını ekle (benzersiz olması için Set kullanıyoruz)
          if (store_codes) {
            const stores = store_codes.split(',').map(s => s.trim()).filter(s => s);
            stores.forEach(store => groupedRecords[groupKey].stores.add(store));
          }
          
          // Palet ve kasa miktarlarını topla
          groupedRecords[groupKey].pallets += pallets;
          groupedRecords[groupKey].boxes += boxes;
          
          // Trips değerini topla ama sonra benzersiz mağaza sayısı ile düzelteceğiz
          groupedRecords[groupKey].trips += trips;
        });
        
                  // Gruplandırma tamamlandı
        
        // Şimdi gruplandırılmış kayıtları işle
        Object.values(groupedRecords).forEach(groupedRecord => {
          const { employee_name, dayDataKey, formattedDate, pallets, boxes, stores, date_shift_type } = groupedRecord;
          
          // Personnel database'den position'a bak
          const person = personnelDatabase.find(p => p.full_name === employee_name);
          if (!person) {
            // console.warn(`⚠️ Personnel database'de bulunamadı: ${employee_name}`);
            return;
          }
          
          // Eşleşen personel bulundu
          
          // Şoför tespiti için daha geniş kontrol
          const positionLower = (person.position || '').toLowerCase().trim();
          const isDriver = positionLower.includes('şoför') || positionLower.includes('sofor') || 
                          positionLower.includes('driver') || positionLower.includes('sürücü');
          
          const targetGroup = isDriver ? drivers : personnel;
          const groupName = isDriver ? 'driver' : 'personnel';
          
          allDatesSet.add(formattedDate);
          
          if (!targetGroup[employee_name]) {
            // Personnel database'den shift_type'ı çek (personelin kendi vardiyası)
            const originalShift = person.shift_type || 'gunduz';
            // Orijinal shift type analizi
            
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
              shift: personnelShiftDisplay, // Personelin kendi vardiyası
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
          
          // Benzersiz mağaza sayısı hesaplandı
          
          targetGroup[employee_name].dayData[dayDataKey].trips = uniqueStoreCount; // Benzersiz mağaza sayısı = sefer sayısı
          targetGroup[employee_name].dayData[dayDataKey].pallets += pallets;
          targetGroup[employee_name].dayData[dayDataKey].boxes += boxes;
          targetGroup[employee_name].dayData[dayDataKey].stores.push(...storeArray);
          
          // Toplam değerleri güncelle
          targetGroup[employee_name].totalTrips += uniqueStoreCount; // Benzersiz mağaza sayısı
          targetGroup[employee_name].totalPallets += pallets;
          targetGroup[employee_name].totalBoxes += boxes;
          targetGroup[employee_name].totalStores += uniqueStoreCount;
        });
        
        // Analiz formatına çevir - gerçek tarihler (düzgün sıralanmış)
        const allDates = Array.from(allDatesSet).sort((a, b) => {
          // Tarih formatını düzgün parse et
          const parseDate = (dateStr) => {
            const [day, month, year] = dateStr.split('.');
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          };
          
          return parseDate(a) - parseDate(b);
        });
        
        // Gerçek tarihler belirlendi
        
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
        
        // Available dates'i performance_data'dan sheet_name bilgisiyle oluştur - daha sağlıklı
        const availableDatesArray = [];
        const uniqueCombinations = new Map(); // Map kullanarak daha güvenli kontrol
        
        // Performance_data'daki her kayıt için sheet_name bilgisini al - dayData ile uyumlu
        result.data.forEach(record => {
          const recordDate = new Date(record.date).toLocaleDateString('tr-TR');
          const { sheet_name, date_shift_type } = record;
          
          // Tarih + shift kombinasyonu key'i oluştur (dayData ile tutarlı)
          let availableKey, displayDate, displayShift;
          
          // Sheet_name varsa onu tarih olarak kullan, ama sadece tarih kısmını al
          if (sheet_name) {
            // Sheet_name'de tarih+shift varsa sadece tarih kısmını al
            if (sheet_name.includes('_')) {
              displayDate = sheet_name.split('_')[0];
            } else {
              displayDate = sheet_name;
            }
            // Tarih çıkarıldı
          } else {
            displayDate = recordDate;
         
          }
          
          // Date_shift_type'dan shift bilgisini al
          if (date_shift_type === 'gece') {
            displayShift = 'GECE';
          } else {
            displayShift = 'GÜNDÜZ';
          }
          
          // Final key: tarih + shift (dayData ile aynı format)
          availableKey = `${displayDate}_${displayShift}`;
                      // Available key oluşturuldu
        
          
          // Map ile benzersizliği garanti et - dayData ile uyumlu key'ler
          if (!uniqueCombinations.has(availableKey)) {
            uniqueCombinations.set(availableKey, {
              date: displayDate,
              shift: displayShift,
              displayName: `${displayDate} ${displayShift}`,
              id: availableKey
            });
            
                          // Available date eklendi
          } else {
            // Zaten mevcut
          }
        });
        
        // Map'ten array'e çevir
        uniqueCombinations.forEach(combo => {
          availableDatesArray.push(combo);
        });
        
        // Tarih+shift kombinasyonlarını düzgün sırala
        availableDatesArray.sort((a, b) => {
          // Tarih formatını düzgün parse et
          const parseDate = (dateStr) => {
            const [day, month, year] = dateStr.split('.');
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          };
          
          const dateA = parseDate(a.date);
          const dateB = parseDate(b.date);
          
          // Önce tarihe göre sırala
          if (dateA.getTime() !== dateB.getTime()) {
            return dateA - dateB;
          }
          
          // Aynı tarihse önce gündüz sonra gece
          if (a.shift === 'GÜNDÜZ' && b.shift === 'GECE') return -1;
          if (a.shift === 'GECE' && b.shift === 'GÜNDÜZ') return 1;
          return 0;
        });
        
              // Available dates hazırlandı
        
        setAvailableDates(availableDatesArray);
        
        // Mevcut vardiyaları analiz et
        const shifts = new Set();
        availableDatesArray.forEach(item => {
          shifts.add(item.shift);
        });
        setAvailableShifts(Array.from(shifts));
        
        // Varsayılan olarak son ayı seç
        const latestMonth = getLatestMonth(availableDatesArray);
        if (latestMonth) {
          setSelectedMonth(latestMonth);
        }
        
        // Selected dates'i güncelle - sadece yeni eklenen tarihleri seç
        const allCombinationIds = availableDatesArray.map(item => item.id);
        
        // Mevcut seçili tarihleri kontrol et
        setSelectedDates(prevSelected => {
          // Eğer hiç seçili tarih yoksa, son ayın verilerini seç
          if (prevSelected.length === 0) {
            // Son ayın verilerini bul
            const getLastMonthDates = () => {
              if (availableDatesArray.length === 0) return allCombinationIds;
              
              // Tarihleri parse et ve en son ayı bul
              const parseDate = (dateStr) => {
                const [day, month, year] = dateStr.split('.');
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              };
              
              // Tarihleri sırala ve en son ayı bul
              const sortedDates = availableDatesArray
                .map(item => ({ ...item, parsedDate: parseDate(item.date) }))
                .sort((a, b) => b.parsedDate - a.parsedDate);
              
              if (sortedDates.length === 0) return allCombinationIds;
              
              // En son tarihin ayını al
              const lastDate = sortedDates[0];
              const lastMonth = lastDate.parsedDate.getMonth();
              const lastYear = lastDate.parsedDate.getFullYear();
              
              // Son ayın tüm tarihlerini filtrele
              const lastMonthDates = availableDatesArray.filter(item => {
                const itemDate = parseDate(item.date);
                return itemDate.getMonth() === lastMonth && itemDate.getFullYear() === lastYear;
              });
              
              return lastMonthDates.map(item => item.id);
            };
            
            const lastMonthIds = getLastMonthDates();
            return lastMonthIds.length > 0 ? lastMonthIds : allCombinationIds;
          }
          
          // Mevcut seçimleri filtrele (artık mevcut olmayan tarihleri temizle)
          const validSelections = prevSelected.filter(id => allCombinationIds.includes(id));
          
          // Eğer geçerli seçim yoksa, son ayın verilerini seç
          if (validSelections.length === 0) {
            // Son ayın verilerini bul
            const getLastMonthDates = () => {
              if (availableDatesArray.length === 0) return allCombinationIds;
              
              // Tarihleri parse et ve en son ayı bul
              const parseDate = (dateStr) => {
                const [day, month, year] = dateStr.split('.');
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              };
              
              // Tarihleri sırala ve en son ayı bul
              const sortedDates = availableDatesArray
                .map(item => ({ ...item, parsedDate: parseDate(item.date) }))
                .sort((a, b) => b.parsedDate - a.parsedDate);
              
              if (sortedDates.length === 0) return allCombinationIds;
              
              // En son tarihin ayını al
              const lastDate = sortedDates[0];
              const lastMonth = lastDate.parsedDate.getMonth();
              const lastYear = lastDate.parsedDate.getFullYear();
              
              // Son ayın tüm tarihlerini filtrele
              const lastMonthDates = availableDatesArray.filter(item => {
                const itemDate = parseDate(item.date);
                return itemDate.getMonth() === lastMonth && itemDate.getFullYear() === lastYear;
              });
              
              return lastMonthDates.map(item => item.id);
            };
            
            const lastMonthIds = getLastMonthDates();
            return lastMonthIds.length > 0 ? lastMonthIds : allCombinationIds;
          }
          
          return validSelections;
        });
        
        // Basit format hazırlandı
        const dbAnalysisResults = {
          drivers,
          personnel,
          dailyData: {},
          summary: {
            gunduzDays: Object.values(drivers).reduce((sum, driver) => {
              return sum + Object.values(driver.dayData).filter(day => day.shift === 'GÜNDÜZ').length;
            }, 0) + Object.values(personnel).reduce((sum, person) => {
              return sum + Object.values(person.dayData).filter(day => day.shift === 'GÜNDÜZ').length;
            }, 0),
            geceDays: Object.values(drivers).reduce((sum, driver) => {
              return sum + Object.values(driver.dayData).filter(day => day.shift === 'GECE').length;
            }, 0) + Object.values(personnel).reduce((sum, person) => {
              return sum + Object.values(person.dayData).filter(day => day.shift === 'GECE').length;
            }, 0),
            totalDeliveries: Object.values(drivers).reduce((sum, driver) => sum + driver.totalTrips, 0) + 
                           Object.values(personnel).reduce((sum, person) => sum + person.totalTrips, 0),
            totalPallets: 0, // Bu değerler aşağıda hesaplanacak
            totalBoxes: 0
          }
        };
        
        setAnalysisData(dbAnalysisResults);
        
        // Global summary'yi de set et (ana sayfa için)
        const performanceSummary = {
          totalBoxes: dbAnalysisResults.summary.totalBoxes,
          totalPallets: dbAnalysisResults.summary.totalPallets,
          totalDeliveries: dbAnalysisResults.summary.totalDeliveries,
          geceDays: dbAnalysisResults.summary.geceDays,
          gunduzDays: dbAnalysisResults.summary.gunduzDays,
          lastUpdated: new Date().toISOString()
        };
        
        window.performanceSummary = performanceSummary;
        
        // localStorage'a da kaydet (F5 yenileme için)
        try {
          localStorage.setItem('performanceSummary', JSON.stringify(performanceSummary));
        } catch (error) {
          // console.warn('⚠️ localStorage\'a kaydetme hatası:', error);
        }
        
        
        // İlk veri yükleme tamamlandı
        setTimeout(() => {
          setInitialDataLoading(false);
        }, 300);
        
      } else {
        // Veri yoksa da loading'i bitir
        setTimeout(() => {
          setInitialDataLoading(false);
        }, 500);
      }
      } catch (error) {
      // console.error('❌ Performans verileri yükleme hatası:', error);
      // Hata durumunda da loading'i bitir
      setTimeout(() => {
        setInitialDataLoading(false);
      }, 500);
    }
  };

  // Personnel verilerini Supabase'den çek
  useEffect(() => {
    const loadPersonnelData = async () => {
      try {
        const result = await getAllPersonnel();
        if (result.success) {
          setPersonnelDatabase(result.data);
          // Personnel veritabanı yüklendi
          
          // Personnel shift_type değerlerini kontrol et
          const personnelShifts = {};
          const personnelPositions = {};
          result.data.forEach(person => {
            const shift = person.shift_type || 'undefined';
            const position = person.position || 'undefined';
            personnelShifts[shift] = (personnelShifts[shift] || 0) + 1;
            personnelPositions[position] = (personnelPositions[position] || 0) + 1;
          });
          // Personnel shift ve position analizi
        } else {
          // console.error('Personnel verileri yüklenemedi:', result.error);
        }
      } catch (error) {
        // console.error('Personnel verileri yüklenirken hata:', error);
      }
    };
    
    loadPersonnelData();
  }, []);

  // Personnel database yüklendiğinde performans verilerini yükle - sadece bir kez
  useEffect(() => {
    if (personnelDatabase.length > 0) {
              // Personnel database yüklendi
      loadPerformanceDataFromDatabase();
    } else {
      // Personnel database boşsa Excel yükleme ekranını göster
              // Personnel database boş
      setTimeout(() => {
        setInitialDataLoading(false);
      }, 1000);
    }
  }, [personnelDatabase.length]); // Length'e göre kontrol et, böylece döngü olmaz





  // Mağaza bilgisini bul
  const findStoreByCode = (storeCode) => {
    if (!propStoreData || !Array.isArray(propStoreData)) return null;
    const cleanCode = storeCode?.toString().trim();
    return propStoreData.find(store => store.KOD?.toString().trim() === cleanCode);
  };

  // Eksik fonksiyonları ekle
  const getAllPerformanceAnalyses = () => {
    return [];
  };

  const savePerformanceAnalysis = () => {
    return Promise.resolve({ success: true });
  };



  // Vardiya belirleme artık veritabanından geliyor

  


  // Seçili ay değiştiğinde tarihleri filtrele
  useEffect(() => {
    if (availableDates.length > 0) {
      if (selectedMonth) {
        // Belirli bir ay seçilmişse, o ayın tarihlerini seç
        const monthDates = getDatesForMonth(availableDates, selectedMonth);
        const monthDateIds = monthDates.map(item => item.id);
        setSelectedDates(monthDateIds);
        
        // Ay değiştiğinde tarihleri seç
      } else {
        // "Tüm Aylar" seçilmişse, tüm tarihleri seç
        const allDateIds = availableDates.map(item => item.id);
        setSelectedDates(allDateIds);
      }
    }
  }, [selectedMonth, availableDates]);

  // Performans verilerini veritabanına kaydet
  const savePerformanceDataToDatabase = async (analysisResults) => {
          try {
        // Performans verileri veritabanına kaydediliyor
      
      const performanceDataArray = [];
      
      // Şoför verilerini hazırla
      Object.entries(analysisResults.drivers).forEach(([driverName, driver]) => {
        // Personel bilgilerini veritabanından bul
        const personnelInfo = personnelDatabase.find(p => p.full_name === driverName);
        if (!personnelInfo) {
          // console.warn(`⚠️ Şoför bulunamadı: ${driverName}`);
          return;
        }
        
   
        
        // Her gün için kayıt oluştur
        Object.entries(driver.dayData).forEach(([date, dayData]) => {
          // Tarih formatını düzenle (dd.MM.yyyy -> yyyy-MM-dd)
          const dateMatch = date.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
          if (!dateMatch) return;
          
          const [, day, month, year] = dateMatch;
          const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          
          // Sheet bilgilerinden date_shift_type'ı çek
          const dayInfo = analysisResults.dailyData[date];
          const dateShiftType = dayInfo ? dayInfo.dateShiftType : 'gunduz';
          const sheetName = dayInfo ? dayInfo.sheetName : date;
          
          // Position'a bakarak şoför olup olmadığını belirle
          const isDriverPosition = isDriverRole(personnelInfo.position);
          
          performanceDataArray.push({
            date: formattedDate,
            employee_code: personnelInfo.employee_code,
            employee_name: personnelInfo.full_name,
            employee_type: isDriverPosition ? 'driver' : 'personnel',
            date_shift_type: dateShiftType, // Tarihin gece/gündüz olması
            sheet_name: normalizeSheetName(sheetName), // Normalize edilmiş sheet adı
            license_plate: dayData.license_plate || '', // Plaka bilgisi
            trips: dayData.trips || 0,
            pallets: dayData.pallets || 0,
            boxes: dayData.boxes || 0,
            stores_visited: dayData.stores ? dayData.stores.length : 0,
            store_codes: dayData.stores ? dayData.stores.join(', ') : '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        });
      });
      
      // Personel verilerini hazırla
      Object.entries(analysisResults.personnel).forEach(([personName, person]) => {
        // Personel bilgilerini veritabanından bul
        const personnelInfo = personnelDatabase.find(p => p.full_name === personName);
        if (!personnelInfo) {
          // console.warn(`⚠️ Personel bulunamadı: ${personName}`);
          return;
        }
        
    
        
        // Her gün için kayıt oluştur
        Object.entries(person.dayData).forEach(([date, dayData]) => {
          // Tarih formatını düzenle (dd.MM.yyyy -> yyyy-MM-dd)
          const dateMatch = date.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
          if (!dateMatch) return;
          
          const [, day, month, year] = dateMatch;
          const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          
          // Sheet bilgilerinden date_shift_type'ı çek
          const dayInfo = analysisResults.dailyData[date];
          const dateShiftType = dayInfo ? dayInfo.dateShiftType : 'gunduz';
          const sheetName = dayInfo ? dayInfo.sheetName : date;
          
          // Position'a bakarak şoför olup olmadığını belirle
          const isDriverPosition = isDriverRole(personnelInfo.position);
          
          performanceDataArray.push({
            date: formattedDate,
            employee_code: personnelInfo.employee_code,
            employee_name: personnelInfo.full_name,
            employee_type: isDriverPosition ? 'driver' : 'personnel',
            date_shift_type: dateShiftType, // Tarihin gece/gündüz olması
            sheet_name: normalizeSheetName(sheetName), // Normalize edilmiş sheet adı
            license_plate: dayData.license_plate || '', // Plaka bilgisi
            trips: dayData.trips || 0,
            pallets: dayData.pallets || 0,
            boxes: dayData.boxes || 0,
            stores_visited: dayData.stores ? dayData.stores.length : 0,
            store_codes: dayData.stores ? dayData.stores.join(', ') : '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        });
      });
      
              // Performans kayıtları hazırlandı
      
      // Aynı tarih+employee_code olan kayıtları birleştir (ON CONFLICT hatası önlemek için)
      const groupedData = {};
      performanceDataArray.forEach(item => {
        const key = `${item.date}_${item.employee_code}`;
        if (!groupedData[key]) {
          groupedData[key] = { ...item };
        } else {
          // Aynı gün birden fazla kayıt varsa, topla
          groupedData[key].trips += item.trips;
          groupedData[key].pallets += item.pallets;
          groupedData[key].boxes += item.boxes;
          groupedData[key].stores_visited += item.stores_visited;
          groupedData[key].store_codes += ', ' + item.store_codes;
        }
      });
      
      const finalData = Object.values(groupedData);
                      // Kayıtlar birleştirildi
      
      if (finalData.length > 0) {
        const result = await bulkSavePerformanceDataWithAudit(finalData, currentUser);
        if (result.success) {
          // Performans verileri kaydedildi
          alert('✅ Performans verileri veritabanına kaydedildi!');
        } else {
       
          alert('❌ Performans verileri kaydedilirken hata: ' + result.error);
        }
      } else {
    
        alert('❌ Performans kayıtları hazırlanamadı!');
      }
      
    } catch (error) {
    
    }
  };

  // Mevcut verileri kontrol et
  const getExistingDates = async () => {
    try {
      const result = await getPerformanceData();
      if (result.success && result.data.length > 0) {
        // Tarih kontrolü için tüm verileri kullan (benzersiz yapmaya gerek yok)
        const existingDates = new Set();
        result.data.forEach(record => {
          if (record.sheet_name) {
            // Mevcut sheet_name'leri de normalize et
            existingDates.add(normalizeSheetName(record.sheet_name));
          }
        });
        
     
        return Array.from(existingDates);
      }
      return [];
    } catch (error) {
      // console.error('❌ Mevcut veriler kontrol edilirken hata:', error);
      return [];
    }
  };

  // Excel yükleme - Akıllı yükleme
  const handlePlansUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoadingPlans(true);
    setUploadError('');
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Excel dosyası okundu
        
        // Mevcut verileri kontrol et
        const existingSheets = await getExistingDates();
        // Sheet kontrol edildi
        
        // Yeni sheet'leri bul - sadece tarihli sheet'leri al
        const newSheets = workbook.SheetNames.filter(sheetName => {
     
          
          // PERSONEL ve DEPODA KALAN sheet'lerini atla
          const sheetNameUpper = sheetName.toUpperCase();
          if (sheetNameUpper.includes('PERSONEL') || 
              sheetNameUpper.includes('DEPODA KALAN') || 
              sheetNameUpper.includes('DEPODA KALAN PERSONELLER')) {
    
            return false;
      }
      
          // Tarih formatını kontrol et
      const dateMatch = sheetName.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
      if (!dateMatch) {
           
            return false;
          }
          
          // Normalize edilmiş sheet adlarını karşılaştır
          const normalizedCurrent = normalizeSheetName(sheetName);
          const normalizedExisting = existingSheets.map(s => normalizeSheetName(s));
          
        
          
          const isExisting = normalizedExisting.includes(normalizedCurrent);
          
          if (isExisting) {
        
            return false;
          }
          
          // Yeni sheet ekleniyor
          return true;
        });
        
     
        
        if (newSheets.length === 0) {
          setUploadError('Bu Excel dosyasındaki tüm veriler zaten mevcut. Yeni veri bulunamadı.');
          setLoadingPlans(false);
          
                  // Input'u temizle (aynı dosyayı tekrar seçebilmek için)
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
          
          return;
        }
        
        // Sadece yeni sheet'leri işle
        const analysisResults = processExcelDataSelective(workbook, newSheets);
        setAnalysisData(analysisResults);
        
        // VERİTABANINA KAYDET
        // Veritabanına kaydetme başlıyor
        await savePerformanceDataToDatabase(analysisResults);
        // Veritabanına kaydetme tamamlandı
        
        // Veri yükleme başarılı - sayfayı yenile
        setUploadError(`✅ ${newSheets.length} yeni tarih bulundu ve eklendi: ${newSheets.join(', ')}`);
        
        // Mevcut verileri yeniden yükle
        await loadPerformanceDataFromDatabase();
        
        // Input'u temizle (aynı dosyayı tekrar seçebilmek için)
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        setTimeout(() => {
          setUploadError('');
        }, 3000);
        
      } catch (error) {
        // console.error('❌ Excel okuma hatası:', error);
        setUploadError('Excel dosyası okuma hatası: ' + error.message);
        
        // Hata durumunda da input'u temizle
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } finally {
        setLoadingPlans(false);
      }
    };
    
    reader.readAsBinaryString(file);
  };

  // Excel verilerini seçici olarak işleme - sadece yeni sheet'ler
  const processExcelDataSelective = (workbook, sheetsToProcess) => {
    const results = {
      drivers: {},
      personnel: {},
      dailyData: {},
      summary: { gunduzDays: 0, geceDays: 0, totalDeliveries: 0, totalPallets: 0, totalBoxes: 0 }
    };

    

    // 1. PERSONEL LİSTESİNİ VERİTABANINDAN AL
    if (personnelDatabase && personnelDatabase.length > 0) {
      
      
      personnelDatabase.forEach((person) => {
        const name = person.full_name || '';
        const job = person.position || '';
        const vardiya = person.shift_type || 'gunduz';
        
        if (!name || !job) return;
        
        const shiftType = vardiya === 'gece' ? 'GECE' : 'GÜNDÜZ';
        const jobUpper = job.toUpperCase();
        
        const personData = {
          name, job, shift: shiftType, totalTrips: 0, totalPallets: 0, totalBoxes: 0,
          averagePallets: 0, averageBoxes: 0, dayData: {}
        };

        if (jobUpper.includes('ŞOFÖR') || jobUpper.includes('SOFÖR')) {
          results.drivers[name] = personData;
        } else if (jobUpper.includes('SEVKIYAT') || jobUpper.includes('SEVKİYAT') || jobUpper.includes('ELEMANI')) {
          results.personnel[name] = personData;
        }
      });
    }

    // 2. SADECE YENİ SHEET'LERİ İŞLE
    const availableDatesTemp = [];
    
    sheetsToProcess.forEach((sheetName) => {
      
      
      // PERSONEL ve DEPODA KALAN sheet'lerini atla
      const sheetNameUpper = sheetName.toUpperCase();
      if (sheetNameUpper.includes('PERSONEL') || 
          sheetNameUpper.includes('DEPODA KALAN') || 
          sheetNameUpper.includes('DEPODA KALAN PERSONELLER')) {
       
        return;
      }
      
      // Tarih formatını kontrol et
      const dateMatch = sheetName.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
      if (!dateMatch) {
        
        return;
      }
      
      // Vardiya tipini belirle
      const isGunduz = sheetName.toUpperCase().includes('GÜNDÜZ') || sheetName.toUpperCase().includes('GUNDUZ');
      const vardiyaTipi = isGunduz ? 'GÜNDÜZ' : 'GECE';
      
   
      // Tarih listesine ekle
      availableDatesTemp.push({
        date: sheetName,
        displayName: sheetName,
        shift: vardiyaTipi,
        selected: true
      });
      
      // Vardiya sayacını artır
      if (isGunduz) {
        results.summary.gunduzDays++;
        } else {
        results.summary.geceDays++;
      }

      // Sheet verilerini işle
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) return;
      
      const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
   
      
      // Basit veri işleme
      processSheetDataSelective(sheetData, sheetName, vardiyaTipi, results);
    });
    
    // 3. ORTALAMALARI HESAPLA
    calculateAverages(results);
    
    // 4. TARİHLERİ SET ET
    setAvailableDates(prev => [...prev, ...availableDatesTemp]);
    setSelectedDates(prev => [...prev, ...availableDatesTemp.map(d => d.date)]);

    
    return results;
  };

  // Sheet verilerini seçici olarak işleme - basit versiyon
  const processSheetDataSelective = (sheetData, sheetName, dateShiftType, results) => {
  
    
    // Günlük veri yapısını hazırla
    if (!results.dailyData[sheetName]) {
      results.dailyData[sheetName] = {
        shift: dateShiftType,
        sheetName: sheetName,
        dateShiftType: dateShiftType.toLowerCase(),
        totalPallets: 0,
        totalBoxes: 0,
        uniqueStores: 0
      };
    }
    
    const processedStores = new Set();
    
    sheetData.forEach((row, rowIndex) => {
      if (rowIndex === 0) return; // Header satırını atla
      
      try {
        // Sütun verilerini çek
        const magazaKodu = (row[4] || '').toString().trim();
        const palet = parseInt(row[7]) || 0;
        const kasa = parseInt(row[11]) || 0;
        const plaka = (row[12] || '').toString().trim(); // M sütunu - PLAKA
        const sofor = (row[13] || '').toString().trim();
        const personel1 = (row[14] || '').toString().trim();
        const personel2 = (row[15] || '').toString().trim();
        
        // Debug için plaka bilgisini logla
        if (rowIndex < 5) {
        }
        
        if (!magazaKodu || !sofor) return;
        
        // Mağaza kodunu kaydet
        processedStores.add(magazaKodu);
        
        // Günlük toplam güncelle - mağaza bazında benzersiz (aynı gün aynı mağaza sadece 1 kere)
        if (!results.dailyData[sheetName].processedStores) {
          results.dailyData[sheetName].processedStores = new Set();
        }
        
        const storeKey = `${magazaKodu}_${sheetName}`;
        if (!results.dailyData[sheetName].processedStores.has(storeKey)) {
          results.dailyData[sheetName].totalPallets += palet;
          results.dailyData[sheetName].totalBoxes += kasa;
          results.dailyData[sheetName].processedStores.add(storeKey);
        }
        
        // Basit personel işleme
        [sofor, personel1, personel2].forEach(personName => {
          if (!personName) return;
          
          const matchedDriver = findMatchingPerson(personName, results.drivers);
          const matchedPersonnel = findMatchingPerson(personName, results.personnel);
          
          if (matchedDriver) {
            if (!results.drivers[matchedDriver].dayData[sheetName]) {
              results.drivers[matchedDriver].dayData[sheetName] = {
                trips: 0, pallets: 0, boxes: 0, stores: [], license_plate: plaka
              };
            }
            results.drivers[matchedDriver].dayData[sheetName].trips += 1;
            results.drivers[matchedDriver].dayData[sheetName].pallets += palet;
            results.drivers[matchedDriver].dayData[sheetName].boxes += kasa;
            // Plaka bilgisini güncelle (son plaka bilgisini al)
            results.drivers[matchedDriver].dayData[sheetName].license_plate = plaka;
            // Mağaza kodunu ekle (duplicate olmaması için kontrol et)
            if (!results.drivers[matchedDriver].dayData[sheetName].stores.includes(magazaKodu)) {
              results.drivers[matchedDriver].dayData[sheetName].stores.push(magazaKodu);
            }
            results.drivers[matchedDriver].totalTrips += 1;
            results.drivers[matchedDriver].totalPallets += palet;
            results.drivers[matchedDriver].totalBoxes += kasa;
          }
          
          if (matchedPersonnel) {
            if (!results.personnel[matchedPersonnel].dayData[sheetName]) {
              results.personnel[matchedPersonnel].dayData[sheetName] = {
                trips: 0, pallets: 0, boxes: 0, stores: [], license_plate: plaka
              };
            }
            results.personnel[matchedPersonnel].dayData[sheetName].trips += 1;
            results.personnel[matchedPersonnel].dayData[sheetName].pallets += palet;
            results.personnel[matchedPersonnel].dayData[sheetName].boxes += kasa;
            // Plaka bilgisini güncelle (son plaka bilgisini al)
            results.personnel[matchedPersonnel].dayData[sheetName].license_plate = plaka;
            // Mağaza kodunu ekle (duplicate olmaması için kontrol et)
            if (!results.personnel[matchedPersonnel].dayData[sheetName].stores.includes(magazaKodu)) {
              results.personnel[matchedPersonnel].dayData[sheetName].stores.push(magazaKodu);
            }
            results.personnel[matchedPersonnel].totalTrips += 1;
            results.personnel[matchedPersonnel].totalPallets += palet;
            results.personnel[matchedPersonnel].totalBoxes += kasa;
          }
        });
        
      } catch (error) {
        
      }
    });
    
    // Toplam summary güncelle
    results.summary.totalDeliveries += results.dailyData[sheetName].totalPallets;
    results.summary.totalPallets += results.dailyData[sheetName].totalPallets;
    results.summary.totalBoxes += results.dailyData[sheetName].totalBoxes;
    results.dailyData[sheetName].uniqueStores = processedStores.size;
    
    
  };

  // Excel verilerini işleme - VERİTABANI VERSİYON
  const processExcelData = (workbook) => {
    const results = {
      drivers: {},
      personnel: {},
      dailyData: {},
      summary: { gunduzDays: 0, geceDays: 0, totalDeliveries: 0, totalPallets: 0, totalBoxes: 0 }
    };


    // 1. PERSONEL LİSTESİNİ VERİTABANINDAN AL
    if (personnelDatabase && personnelDatabase.length > 0) {
      
      personnelDatabase.forEach((person) => {
        const name = person.full_name || '';
        const job = person.position || '';
        const vardiya = person.shift_type || 'gunduz';
        
        if (!name || !job) return;
        
        const shiftType = vardiya === 'gece' ? 'GECE' : 'GÜNDÜZ';
        const jobUpper = job.toUpperCase();
        
        const personData = {
          name, job, shift: shiftType, totalTrips: 0, totalPallets: 0, totalBoxes: 0,
          averagePallets: 0, averageBoxes: 0, dayData: {}
        };

        if (jobUpper.includes('ŞOFÖR') || jobUpper.includes('SOFÖR')) {
          results.drivers[name] = personData;
        } else if (jobUpper.includes('SEVKIYAT') || jobUpper.includes('SEVKİYAT') || jobUpper.includes('ELEMANI')) {
          results.personnel[name] = personData;
        }
      });
    }

    // 2. GÜNLÜK PLANLARI İŞLE
    const availableDatesTemp = [];
    
    workbook.SheetNames.forEach((sheetName) => {
      
      // PERSONEL ve DEPODA KALAN sheet'lerini atla
      const sheetNameUpper = sheetName.toUpperCase();
      if (sheetNameUpper.includes('PERSONEL') || 
          sheetNameUpper.includes('DEPODA KALAN') || 
          sheetNameUpper.includes('DEPODA KALAN PERSONELLER')) {
        return;
      }
      
      // Tarih formatını kontrol et
      const dateMatch = sheetName.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
      if (!dateMatch) {
        return;
      }
      
      // Vardiya tipini belirle
      const isGunduz = sheetName.toUpperCase().includes('GÜNDÜZ') || sheetName.toUpperCase().includes('GUNDUZ');
      const vardiyaTipi = isGunduz ? 'GÜNDÜZ' : 'GECE';
      
      
      // Tarih listesine ekle
      availableDatesTemp.push({
        date: sheetName,
        displayName: sheetName,
        shift: vardiyaTipi,
        selected: true
      });
      
      // Vardiya sayacını artır
      if (isGunduz) {
        results.summary.gunduzDays++;
      } else {
        results.summary.geceDays++;
      }

      // Sheet verilerini işle
      const sheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      
      processSheetData(sheetData, sheetName, vardiyaTipi, results);
    });
    
    // 3. ORTALAMALARI HESAPLA
    calculateAverages(results);
    
    // 4. TARİHLERİ SET ET
    setAvailableDates(availableDatesTemp);
    setSelectedDates(availableDatesTemp.map(d => d.date));
    
    
    return results;
  };

  // Sheet verilerini işleme
  const processSheetData = (sheetData, sheetName, dateShiftType, results) => {
   
    
    // Günlük veri yapısını hazırla
    if (!results.dailyData[sheetName]) {
      results.dailyData[sheetName] = {
        shift: dateShiftType, // Sheet adından çıkarılan vardiya tipi
        sheetName: sheetName, // Orjinal sheet adı
        dateShiftType: dateShiftType.toLowerCase(), // gece veya gunduz
        totalPallets: 0,
        totalBoxes: 0,
        uniqueStores: 0
      };
    }
    
    const processedStores = new Set();
    const dailyPersonnelVisits = new Map(); // Bu sheet için: Personel adı → Set(mağaza kodları)
    
    sheetData.forEach((row, rowIndex) => {
      if (rowIndex === 0) return; // Header satırını atla
      
      try {
        // Sütun verilerini çek
        const magazaKodu = (row[4] || '').toString().trim();
        const palet = parseInt(row[7]) || 0;
        const kasa = parseInt(row[11]) || 0;
        const sofor = (row[13] || '').toString().trim();
        const personel1 = (row[14] || '').toString().trim();
        const personel2 = (row[15] || '').toString().trim();
        
        if (!magazaKodu || !sofor) return;
        
        // Mağaza kodunu kaydet
        processedStores.add(magazaKodu);
        
        // Günlük toplam güncelle - mağaza bazında benzersiz (aynı gün aynı mağaza sadece 1 kere)
        if (!results.dailyData[sheetName].processedStores) {
          results.dailyData[sheetName].processedStores = new Set();
        }
        
        const storeKey = `${magazaKodu}_${sheetName}`;
        if (!results.dailyData[sheetName].processedStores.has(storeKey)) {
          results.dailyData[sheetName].totalPallets += palet;
          results.dailyData[sheetName].totalBoxes += kasa;
          results.dailyData[sheetName].processedStores.add(storeKey);
        }
        
        // ŞOFÖRLERİ İŞLE
        const matchedDriver = findMatchingPerson(sofor, results.drivers);
        // Eşleşme yoksa bile, Excel'deki adıyla geçici bir şoför kaydı aç
        const driverKey = matchedDriver || sofor;
        if (!results.drivers[driverKey]) {
          results.drivers[driverKey] = {
            name: driverKey,
            shift: results.dailyData[sheetName].dateShiftType?.toUpperCase() === 'GECE' ? 'GECE' : 'GÜNDÜZ',
            totalTrips: 0,
            totalPallets: 0,
            totalBoxes: 0,
            dayData: {}
          };
        }
        {
          // Güncel vardiya bilgisini veritabanından çek ve güncelle (varsa)
          const currentShift = getPersonnelShiftFromDatabase(driverKey);
          if (currentShift) {
            results.drivers[driverKey].shift = currentShift;
          }
          
          // Günlük veri yapısını hazırla
          if (!results.drivers[driverKey].dayData[sheetName]) {
            results.drivers[driverKey].dayData[sheetName] = {
              trips: 0, pallets: 0, boxes: 0, stores: []
            };
          }
          
          // Günlük benzersiz mağaza takibi
          if (!dailyPersonnelVisits.has(driverKey)) {
            dailyPersonnelVisits.set(driverKey, new Set());
          }
          
          // Bu şoför bu mağazaya daha önce gitmişse tekrar sayma
          if (!dailyPersonnelVisits.get(driverKey).has(magazaKodu)) {
            dailyPersonnelVisits.get(driverKey).add(magazaKodu);
            results.drivers[driverKey].totalTrips++;
            results.drivers[driverKey].dayData[sheetName].trips++;
            results.drivers[driverKey].dayData[sheetName].stores.push(magazaKodu);
          }
          // Palet ve kasa ekle
          results.drivers[driverKey].totalPallets += palet;
          results.drivers[driverKey].totalBoxes += kasa;
          results.drivers[driverKey].dayData[sheetName].pallets += palet;
          results.drivers[driverKey].dayData[sheetName].boxes += kasa;
        }
        
        // PERSONELLERİ İŞLE
        [personel1, personel2].forEach(personnelName => {
          if (!personnelName) return;
          
          const matchedPersonnel = findMatchingPerson(personnelName, results.personnel);
          if (matchedPersonnel) {
            // Güncel vardiya bilgisini veritabanından çek ve güncelle
            const currentShift = getPersonnelShiftFromDatabase(matchedPersonnel);
            results.personnel[matchedPersonnel].shift = currentShift;
            
            // Günlük veri yapısını hazırla
            if (!results.personnel[matchedPersonnel].dayData[sheetName]) {
              results.personnel[matchedPersonnel].dayData[sheetName] = {
                trips: 0, pallets: 0, boxes: 0, stores: []
              };
            }
            
            // Günlük benzersiz mağaza takibi
            if (!dailyPersonnelVisits.has(matchedPersonnel)) {
              dailyPersonnelVisits.set(matchedPersonnel, new Set());
            }
            
            // Bu personel bu mağazaya daha önce gitmişse tekrar sayma
            if (!dailyPersonnelVisits.get(matchedPersonnel).has(magazaKodu)) {
              dailyPersonnelVisits.get(matchedPersonnel).add(magazaKodu);
              
              // Sefer sayısını artır
            results.personnel[matchedPersonnel].totalTrips++;
            results.personnel[matchedPersonnel].dayData[sheetName].trips++;
            results.personnel[matchedPersonnel].dayData[sheetName].stores.push(magazaKodu);
            
            // Yeni sefer sayıldı
          } else {
              // Aynı mağaza, tekrar sayılmadı
            }
            
            // Palet ve kasa her zaman ekle
            results.personnel[matchedPersonnel].totalPallets += palet;
            results.personnel[matchedPersonnel].totalBoxes += kasa;
            results.personnel[matchedPersonnel].dayData[sheetName].pallets += palet;
            results.personnel[matchedPersonnel].dayData[sheetName].boxes += kasa;
          }
        });
        
      } catch (error) {
      }
    });
    
    // Günlük unique mağaza sayısını set et
    results.dailyData[sheetName].uniqueStores = processedStores.size;
    
   
  };

  // Personnel veritabanından shift bilgisini çek
  const getPersonnelShiftFromDatabase = (personnelName) => {
    // Personnel shift araniyor
    
    if (!personnelDatabase || personnelDatabase.length === 0) {
      // console.warn('Personnel veritabanı boş');
      return 'GÜNDÜZ';
    }

    // İsmi normalize et
    const normalizeText = (text) => {
      return text.toUpperCase().trim()
        .replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ş/g, 'S')
        .replace(/İ/g, 'I').replace(/Ö/g, 'O').replace(/Ç/g, 'C')
        .replace(/[^A-Z0-9\s]/g, '').replace(/\s+/g, ' ');
    };

    const normalizedSearch = normalizeText(personnelName);
    
    // Personnel veritabanında ara
    const foundPerson = personnelDatabase.find(person => {
      const normalizedPersonName = normalizeText(person.full_name || '');
      return normalizedPersonName === normalizedSearch ||
             normalizedPersonName.includes(normalizedSearch) ||
             normalizedSearch.includes(normalizedPersonName);
    });

    if (foundPerson) {
              // Personnel bulundu
      
      // Shift type mapping - daha esnek kontrol
      const originalShiftType = foundPerson.shift_type || '';
      const shiftType = originalShiftType.toLowerCase().trim();
      
      
      if (shiftType.includes('gece') || shiftType === 'night' || shiftType === 'gece') {
        return 'GECE';
      } else if (shiftType.includes('izin') || shiftType === 'leave' || shiftType.includes('izinli')) {
        return 'İZİNLİ';
      } else {
        return 'GÜNDÜZ';
      }
    } else {
      // console.warn('❌ Personnel bulunamadı:', personnelName);
      return 'GÜNDÜZ';
    }
  };

  // Akıllı isim eşleştirme - boşluk problemlerini çözer
  const findMatchingPerson = (searchName, personList) => {
    if (!searchName || !personList) return null;
    
    // Tam eşleşme
    if (personList[searchName]) return searchName;
    
    // Gelişmiş normalize fonksiyonu
    const normalizeText = (text) => {
      return text.toUpperCase().trim()
        .replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ş/g, 'S')
        .replace(/İ/g, 'I').replace(/Ö/g, 'O').replace(/Ç/g, 'C')
        .replace(/[^A-Z0-9\s]/g, '').replace(/\s+/g, ' ');
    };
    
    // Boşluksuz karşılaştırma için özel fonksiyon
    const normalizeForComparison = (text) => {
      return normalizeText(text).replace(/\s/g, ''); // Tüm boşlukları kaldır
    };
    
    const normalizedSearch = normalizeText(searchName);
    const normalizedSearchNoSpaces = normalizeForComparison(searchName);
    
    // İsim aranıyor
    
    // 1. Tam normalized eşleşme
    for (const personName in personList) {
      if (normalizeText(personName) === normalizedSearch) {
        // Tam eşleşme bulundu
        return personName;
      }
    }
    
    // 2. Boşluksuz eşleşme (ana çözüm)
    for (const personName in personList) {
      const personNoSpaces = normalizeForComparison(personName);
      if (personNoSpaces === normalizedSearchNoSpaces) {
        // Boşluksuz eşleşme bulundu
        return personName;
      }
    }
    
    // 3. Kelime bazlı eşleşme (ek kontrol)
    const searchWords = normalizedSearch.split(' ').filter(w => w.length > 0);
    for (const personName in personList) {
      const personWords = normalizeText(personName).split(' ').filter(w => w.length > 0);
      
      // Tüm kelimeler eşleşiyor mu?
      if (searchWords.length === personWords.length) {
        const allWordsMatch = searchWords.every(word => personWords.includes(word));
        if (allWordsMatch) {
          // Kelime bazlı eşleşme bulundu
          return personName;
        }
      }
    }
    
    // 4. Kısmi eşleşme (son çare)
    for (const personName in personList) {
      const normalizedPerson = normalizeText(personName);
      if (normalizedPerson.includes(normalizedSearch) || normalizedSearch.includes(normalizedPerson)) {
        return personName;
      }
    }
    
    // Eşleşme bulunamadı
    return null;
  };

  // Ortalama hesaplama
  const calculateAverages = (results) => {
    // Şoförler için
    Object.values(results.drivers).forEach(driver => {
      driver.averagePallets = driver.totalTrips > 0 ? (driver.totalPallets / driver.totalTrips).toFixed(1) : 0;
      driver.averageBoxes = driver.totalTrips > 0 ? (driver.totalBoxes / driver.totalTrips).toFixed(1) : 0;
    });
    
    // Personeller için
    Object.values(results.personnel).forEach(person => {
      person.averagePallets = person.totalTrips > 0 ? (person.totalPallets / person.totalTrips).toFixed(1) : 0;
      person.averageBoxes = person.totalTrips > 0 ? (person.totalBoxes / person.totalTrips).toFixed(1) : 0;
    });
    
    // Genel summary
    results.summary.totalDeliveries = 
      Object.values(results.drivers).reduce((sum, driver) => sum + driver.totalTrips, 0) +
      Object.values(results.personnel).reduce((sum, person) => sum + person.totalTrips, 0);
    
    results.summary.totalPallets = 
      Object.values(results.drivers).reduce((sum, driver) => sum + driver.totalPallets, 0) +
      Object.values(results.personnel).reduce((sum, person) => sum + person.totalPallets, 0);
    
    // Toplam kasa sayısını benzersiz mağaza teslimatlarından hesapla
    // Aynı gün aynı mağazaya giden personellerin teslimatları tek sefer sayılacak
    const uniqueStoreDeliveries = new Map();
    
    // Tüm personel verilerini kontrol et ve benzersiz mağaza teslimatlarını bul
    Object.values(results.drivers).forEach(driver => {
      Object.entries(driver.dayData).forEach(([sheetName, dayData]) => {
        if (dayData.boxes > 0 && dayData.stores && dayData.stores.length > 0) {
          // Her mağaza için benzersiz teslimat
          dayData.stores.forEach(storeCode => {
            const storeKey = `${storeCode}_${sheetName}`;
            if (!uniqueStoreDeliveries.has(storeKey)) {
              // Ortalama kasa ve palet hesapla
              const avgBoxesPerStore = dayData.boxes / dayData.stores.length;
              const avgPalletsPerStore = dayData.pallets / dayData.stores.length;
              
              uniqueStoreDeliveries.set(storeKey, {
                store_code: storeCode,
                sheet_name: sheetName,
                boxes: avgBoxesPerStore,
                pallets: avgPalletsPerStore
              });
            }
          });
        }
      });
    });
    
    // Benzersiz mağaza teslimatlarından toplam hesapla
    results.summary.totalBoxes = Math.round(Array.from(uniqueStoreDeliveries.values())
      .reduce((sum, delivery) => sum + delivery.boxes, 0));
    results.summary.totalPallets = Math.round(Array.from(uniqueStoreDeliveries.values())
      .reduce((sum, delivery) => sum + delivery.pallets, 0));
    
  };



  // Filtrelenmiş veri
  const getFilteredData = () => {
          // getFilteredData çağrıldı
          // Filtreleme verileri kontrol edildi
    
    if (!analysisData) {
              // analysisData yok
      return null;
    }

    // Vardiya filtreleme başlıyor
    
    // SelectedDates artık id formatında, tam tarih+shift kombinasyonlarını çıkar
    let selectedDateShiftCombinations = [];
    
    if (availableDates.length > 0 && selectedDates.length > 0) {
      // Seçili id'lerin tam tarih+shift kombinasyonlarını çıkar
      const selectedDateItems = availableDates.filter(dateItem => selectedDates.includes(dateItem.id));
      selectedDateShiftCombinations = selectedDateItems;
      
      // Seçili kombinasyonlar bulundu
    } else {
      // Fallback: tüm tarihleri kullan
      selectedDateShiftCombinations = availableDates || [];
    }


    // Seçili tarih+shift kombinasyonlarının bir Set'ini oluştur hızlı kontrol için
    const selectedDateShiftSet = new Set();
    selectedDateShiftCombinations.forEach(combo => {
      selectedDateShiftSet.add(`${combo.date}_${combo.shift}`);
    });
    
          // Seçili tarih+shift set hazırlandı

    const filteredResults = {
      drivers: {},
      personnel: {},
      summary: { gunduzDays: 0, geceDays: 0, totalDeliveries: 0, totalPallets: 0, totalBoxes: 0 }
    };

    // Şoförleri filtrele
    Object.entries(analysisData.drivers).forEach(([driverName, driver]) => {
      const filteredDriver = {
        ...driver,
        totalTrips: 0, totalPallets: 0, totalBoxes: 0,
        dayData: {}
      };

      // Seçili tarih+shift kombinasyonlarının verilerini topla (sheet_name bazında)
      Object.entries(driver.dayData || {}).forEach(([sheetName, data]) => {
        // Şoför verisi işleniyor
        
        // Bu sheet_name (tarih+shift kombinasyonu) seçili mi kontrol et
        if (selectedDateShiftSet.has(sheetName)) {
          filteredDriver.totalTrips += data.trips || 0;
          filteredDriver.totalPallets += data.pallets || 0;
          filteredDriver.totalBoxes += data.boxes || 0;
          filteredDriver.dayData[sheetName] = data;
          
          // Şoför eklendi
        } else {
          // Şoför atlandı
        }
      });

      // Bölge çıkışları kaldırıldı

      filteredDriver.averagePallets = filteredDriver.totalTrips > 0 ? 
        (filteredDriver.totalPallets / filteredDriver.totalTrips).toFixed(1) : 0;
      filteredDriver.averageBoxes = filteredDriver.totalTrips > 0 ? 
        (filteredDriver.totalBoxes / filteredDriver.totalTrips).toFixed(1) : 0;

      // Sadece seçili tarihlerde çalışan şoförleri ekle
      if (filteredDriver.totalTrips > 0) {
      filteredResults.drivers[driverName] = filteredDriver;
      }
    });

    // Personelleri filtrele
          // Personel filtreleme başlıyor
    Object.entries(analysisData.personnel).forEach(([personName, person]) => {
      // Personel işleniyor
      
      const filteredPerson = {
        ...person,
        totalTrips: 0, totalPallets: 0, totalBoxes: 0,
        dayData: {}
      };

      // Seçili tarih+shift kombinasyonlarının verilerini topla (sheet_name bazında)
      let personDateCount = 0;
      Object.entries(person.dayData || {}).forEach(([sheetName, data]) => {
        // Personel sheet verisi işleniyor
        
        // Bu sheet_name (tarih+shift kombinasyonu) seçili mi kontrol et
        if (selectedDateShiftSet.has(sheetName)) {
          personDateCount++;
          filteredPerson.totalTrips += data.trips || 0;
          filteredPerson.totalPallets += data.pallets || 0;
          filteredPerson.totalBoxes += data.boxes || 0;
          filteredPerson.dayData[sheetName] = data;
          
                  // Personel verisi eklendi
      } else {
        // Personel verisi atlandı
        }
      });
      
              // Personel özet hesaplandı

      // Bölge çıkışları kaldırıldı

      filteredPerson.averagePallets = filteredPerson.totalTrips > 0 ? 
        (filteredPerson.totalPallets / filteredPerson.totalTrips).toFixed(1) : 0;
      filteredPerson.averageBoxes = filteredPerson.totalTrips > 0 ? 
        (filteredPerson.totalBoxes / filteredPerson.totalTrips).toFixed(1) : 0;

      // Sadece seçili tarihlerde çalışan personelleri ekle
      if (filteredPerson.totalTrips > 0) {
      filteredResults.personnel[personName] = filteredPerson;
        // Personel filtreye dahil edildi
      } else {
        // Personel filtreye dahil edilmedi
      }
    });

    // Summary hesapla - gece ve gündüz günlerini ayrı ayrı hesapla
    const nightShiftDatesInSelection = new Set();
    const dayShiftDatesInSelection = new Set();
    
    selectedDateShiftCombinations.forEach(combo => {
      if (combo.shift === 'GECE') {
        nightShiftDatesInSelection.add(combo.date);
      } else if (combo.shift === 'GÜNDÜZ' || combo.shift === 'gunduz' || combo.shift === 'GUNDUZ') {
        dayShiftDatesInSelection.add(combo.date);
      }
    });
    
    filteredResults.summary.gunduzDays = dayShiftDatesInSelection.size; // Sadece gündüz vardiyası olan gün sayısı
    filteredResults.summary.geceDays = nightShiftDatesInSelection.size; // Sadece gece vardiyası olan gün sayısı
    
    // Summary hesaplama

    filteredResults.summary.totalDeliveries = 
      Object.values(filteredResults.drivers).reduce((sum, driver) => sum + driver.totalTrips, 0) +
      Object.values(filteredResults.personnel).reduce((sum, person) => sum + person.totalTrips, 0);

    filteredResults.summary.totalPallets = 
      Object.values(filteredResults.drivers).reduce((sum, driver) => sum + driver.totalPallets, 0) +
      Object.values(filteredResults.personnel).reduce((sum, person) => sum + person.totalPallets, 0);

    // Filtrelenmiş veri için de benzersiz mağaza teslimatlarından hesapla
    const filteredUniqueStoreDeliveries = new Map();
    
    Object.values(filteredResults.drivers).forEach(driver => {
      Object.entries(driver.dayData).forEach(([sheetName, dayData]) => {
        if (selectedDateShiftSet.has(sheetName) && dayData.boxes > 0 && dayData.stores && dayData.stores.length > 0) {
          // Her mağaza için benzersiz teslimat
          dayData.stores.forEach(storeCode => {
            const storeKey = `${storeCode}_${sheetName}`;
            if (!filteredUniqueStoreDeliveries.has(storeKey)) {
              // Ortalama kasa ve palet hesapla
              const avgBoxesPerStore = dayData.boxes / dayData.stores.length;
              const avgPalletsPerStore = dayData.pallets / dayData.stores.length;
              
              filteredUniqueStoreDeliveries.set(storeKey, {
                store_code: storeCode,
                sheet_name: sheetName,
                boxes: avgBoxesPerStore,
                pallets: avgPalletsPerStore
              });
            }
          });
        }
      });
    });
    
    filteredResults.summary.totalBoxes = Math.round(Array.from(filteredUniqueStoreDeliveries.values())
      .reduce((sum, delivery) => sum + delivery.boxes, 0));
    filteredResults.summary.totalPallets = Math.round(Array.from(filteredUniqueStoreDeliveries.values())
      .reduce((sum, delivery) => sum + delivery.pallets, 0));
    

    // Shift kombinasyonu sayısını ekle
    filteredResults.summary.shiftCombinations = selectedDateShiftCombinations.length;
    
    // Summary verilerini global olarak erişilebilir hale getir
    const performanceSummary = {
      totalBoxes: filteredResults.summary.totalBoxes,
      totalPallets: filteredResults.summary.totalPallets,
      totalDeliveries: filteredResults.summary.totalDeliveries,
      geceDays: filteredResults.summary.geceDays,
      gunduzDays: filteredResults.summary.gunduzDays,
      lastUpdated: new Date().toISOString()
    };
    
    window.performanceSummary = performanceSummary;
    
    // localStorage'a da kaydet (F5 yenileme için)
    try {
      localStorage.setItem('performanceSummary', JSON.stringify(performanceSummary));
    } catch (error) {
      // console.warn('⚠️ localStorage\'a kaydetme hatası:', error);
    }
    
    
    // Toplam gün sayısını hesapla (sadece benzersiz tarihler)
    const uniqueDates = new Set();
    selectedDateShiftCombinations.forEach(item => {
      if (item.date) {
        uniqueDates.add(item.date); // Tarih kısmını al (shift'i dahil etme)
      }
    });
    filteredResults.summary.totalDays = uniqueDates.size;

    return filteredResults;
  };

  // Sıralama
  const getSortFunction = (sortBy) => {
    switch (sortBy) {
      case 'trips': return (a, b) => b.totalTrips - a.totalTrips;
      case 'pallets': return (a, b) => b.totalPallets - a.totalPallets;
      case 'boxes': return (a, b) => b.totalBoxes - a.totalBoxes;
      case 'avgPallets': return (a, b) => {
          const aAvg = a.totalTrips > 0 ? a.totalPallets / a.totalTrips : 0;
          const bAvg = b.totalTrips > 0 ? b.totalPallets / b.totalTrips : 0;
          return bAvg - aAvg;
        };
      case 'avgBoxes': return (a, b) => {
          const aAvg = a.totalTrips > 0 ? a.totalBoxes / a.totalTrips : 0;
          const bAvg = b.totalTrips > 0 ? b.totalBoxes / b.totalTrips : 0;
          return bAvg - aAvg;
        };
      default: return (a, b) => b.totalTrips - a.totalTrips;
    }
  };

  // Rank-based renklendirme fonksiyonu
  const getRankColor = (index, type = 'text') => {
    const rank = index + 1;
    
    if (type === 'text') {
      if (rank === 1) return 'text-yellow-600 font-bold';
      if (rank === 2) return 'text-gray-600 font-semibold';
      if (rank === 3) return 'text-orange-600 font-semibold';
      return 'text-gray-500';
    }
    
    return 'text-gray-500';
  };

    // HAFTALİK GRUPLANDIRMA - SABİT DÖNGÜ: Pazar başlangıç, 6 gün çalışma sistemi
  const groupDatesByWeeks = (dateItems) => {
    const weeks = [];
    
    // HAFTALİK SİSTEM: 29.06.2025 (Pazar) başlangıç referansı
    const WEEK_START_REFERENCE = new Date(2025, 5, 29); // 29.06.2025 (Pazar)
    
    // Benzersiz tarihleri çıkar ve düzgün sırala
    const uniqueDatesMap = new Map();
    dateItems.forEach(item => {
      const dateKey = item.date;
      if (!uniqueDatesMap.has(dateKey)) {
        // Tarih formatını düzgün parse et
        const [day, month, year] = dateKey.split('.');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        uniqueDatesMap.set(dateKey, {
          date: dateKey,
          dateObj: dateObj,
          shifts: []
        });
      }
      uniqueDatesMap.get(dateKey).shifts.push(item);
    });
    
    // Benzersiz tarihleri kronolojik sırada sırala
    const sortedUniqueDates = Array.from(uniqueDatesMap.values()).sort((a, b) => {
      return a.dateObj - b.dateObj;
    });
    
    // Haftalık gruplandırma başlıyor
    
    // Her tarihi hangi haftaya ait olduğunu belirle
    const dateToWeekMap = new Map();
    
    sortedUniqueDates.forEach(dateInfo => {
      // Bu tarih referans tarihten kaç gün sonra?
      const daysDiff = Math.floor((dateInfo.dateObj - WEEK_START_REFERENCE) / (1000 * 60 * 60 * 24));
      
      // DOĞRU HAFTALİK SİSTEM: 7 günlük döngü (Pazar → Cumartesi)
      const weekNumber = Math.floor(daysDiff / 7);
      
      // Hafta içindeki gün (0=Pazar, 1=Pazartesi, ..., 6=Cumartesi)
      const dayInWeek = daysDiff % 7;
      
      // Hafta hesaplaması yapıldı
      
      if (!dateToWeekMap.has(weekNumber)) {
        dateToWeekMap.set(weekNumber, []);
      }
      
      dateToWeekMap.get(weekNumber).push(dateInfo);
    });
    
    // Haftalık grupları oluştur
    Array.from(dateToWeekMap.keys()).sort((a, b) => a - b).forEach(weekNumber => {
      const weekDates = dateToWeekMap.get(weekNumber);
      
      // Hafta içindeki günleri sırala
      weekDates.sort((a, b) => a.dateObj - b.dateObj);
      
      // Hafta başlangıç ve bitiş tarihlerini hesapla
      const weekStartDate = new Date(WEEK_START_REFERENCE);
      weekStartDate.setDate(weekStartDate.getDate() + (weekNumber * 7));
      
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6); // 7 gün (0-6): Pazar → Cumartesi
      
      // Hafta içindeki tüm shift kombinasyonlarını topla
      const allShiftsInWeek = [];
      
      weekDates.forEach(dateInfo => {
        // Her tarih için shift'leri kronolojik sırala
        const sortedShifts = dateInfo.shifts.sort((a, b) => {
          // Önce tarihe göre sırala
          const dateA = new Date(parseInt(a.date.split('.')[2]), parseInt(a.date.split('.')[1]) - 1, parseInt(a.date.split('.')[0]));
          const dateB = new Date(parseInt(b.date.split('.')[2]), parseInt(b.date.split('.')[1]) - 1, parseInt(b.date.split('.')[0]));
          
          if (dateA.getTime() !== dateB.getTime()) {
            return dateA - dateB;
          }
          
          // Aynı tarihse önce gündüz sonra gece
          if (a.shift === 'GÜNDÜZ' && b.shift === 'GECE') return -1;
          if (a.shift === 'GECE' && b.shift === 'GÜNDÜZ') return 1;
          return 0;
        });
        
        allShiftsInWeek.push(...sortedShifts);
      });
      
      // Hafta etiketini oluştur
      const weekStartStr = weekStartDate.toLocaleDateString('tr-TR');
      const weekEndStr = weekEndDate.toLocaleDateString('tr-TR');
      
      // DOĞRU GÜN SAYISI: Benzersiz tarihleri say (shift değil tarih)
      const uniqueDateCount = weekDates.length; // weekDates zaten benzersiz tarihleri içeriyor
      const shiftCount = allShiftsInWeek.length; // Toplam shift sayısı
      
      // Hafta bilgileri hazırlandı
      
      weeks.push({
        id: `week_${weekNumber}`,
        label: `${weekStartStr} - ${weekEndStr} (6 gün)`, // Haftalık çalışma sistemi 6 gün
        dates: allShiftsInWeek, // Shift kombinasyonları (filtreleme için)
        dayCount: uniqueDateCount, // Benzersiz gün sayısı
        shiftCount: shiftCount, // Toplam shift sayısı
        weekNumber: weekNumber + 1
      });
    });
    
    // Haftalık gruplandırma tamamlandı
    return weeks;
  }; 


  // Reset fonksiyonu kaldırıldı

  // Excel export
  const handleExportToExcel = async () => {
    if (!analysisData) return;
    
    setLoadingPlans(true);
    
    try {
      const filteredData = getFilteredData();
      const wb = XLSX.utils.book_new();
      
      // Özet sheet
      const summaryData = [
        ['Performans Analizi Özeti'],
        ['Tarih:', new Date().toLocaleDateString('tr-TR')],
        ['Gündüz Günleri', filteredData.summary.gunduzDays],
        ['Gece Günleri', filteredData.summary.geceDays],
        ['Toplam Sefer', filteredData.summary.totalDeliveries],
        ['Toplam Palet', filteredData.summary.totalPallets],
        ['Toplam Kasa', filteredData.summary.totalBoxes],
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Özet');
      
      // Şoför sheet
      const drivers = Object.values(filteredData.drivers).filter(d => d.totalTrips > 0);
      const driverData = [
        ['Şoför Adı', 'Sefer', 'Palet', 'Kasa', 'Ort. Palet', 'Ort. Kasa']
      ];
      
      drivers.forEach(driver => {
        driverData.push([
          driver.name,
          driver.totalTrips,
          driver.totalPallets,
          driver.totalBoxes,
          driver.averagePallets,
          driver.averageBoxes
        ]);
      });
      
      const driverSheet = XLSX.utils.aoa_to_sheet(driverData);
      XLSX.utils.book_append_sheet(wb, driverSheet, 'Şoför Analizi');
      
      // Personel sheet
      const personnel = Object.values(filteredData.personnel).filter(p => p.totalTrips > 0);
      const personnelData = [
        ['Personel Adı', 'Sefer', 'Palet', 'Kasa', 'Ort. Palet', 'Ort. Kasa']
      ];
      
      personnel.forEach(person => {
        personnelData.push([
          person.name,
          person.totalTrips,
          person.totalPallets,
          person.totalBoxes,
          person.averagePallets,
          person.averageBoxes
        ]);
      });
      
      const personnelSheet = XLSX.utils.aoa_to_sheet(personnelData);
      XLSX.utils.book_append_sheet(wb, personnelSheet, 'Personel Analizi');
      
      const fileName = `performans_analizi_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
    } catch (error) {
      // console.error('❌ Excel export hatası:', error);
      alert('Excel dosyası oluşturulurken bir hata oluştu!');
    } finally {
      setLoadingPlans(false);
    }
  };

  // Render fonksiyonları
  const renderSummaryCards = () => {
    if (!analysisData) return null;
    const filteredData = getFilteredData();
    if (!filteredData) return null;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Gece Vardiyası */}
        <div className="group relative bg-gradient-to-br from-slate-800 via-blue-900 to-slate-800 text-white rounded-2xl p-4 sm:p-6 shadow-2xl hover:shadow-blue-500/25 transition-all duration-500 hover:scale-105 hover:-translate-y-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-bold text-white group-hover:text-blue-100 transition-colors duration-300">
                  {filteredData.summary.geceDays}
                </div>
                <div className="text-blue-200 text-xs sm:text-sm font-medium">Gün</div>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-blue-100 text-xs sm:text-sm font-semibold">🌙 Gece Vardiyası</p>
              <p className="text-blue-200/80 text-xs">Toplam Çalışma Günü</p>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 w-20 h-20 sm:w-24 sm:h-24 bg-blue-500/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
        </div>
        
        {/* Gündüz Vardiyası */}
        <div className="group relative bg-gradient-to-br from-purple-600 via-indigo-700 to-purple-800 text-white rounded-2xl p-4 sm:p-6 shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 hover:scale-105 hover:-translate-y-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-bold text-white group-hover:text-purple-100 transition-colors duration-300">
                  {filteredData.summary.gunduzDays}
                </div>
                <div className="text-purple-200 text-xs sm:text-sm font-medium">Gün</div>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-purple-100 text-xs sm:text-sm font-semibold">🌅 Gündüz Vardiyası</p>
              <p className="text-purple-200/80 text-xs">Toplam Çalışma Günü</p>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 w-20 h-20 sm:w-24 sm:h-24 bg-purple-500/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
        </div>
        
        {/* Toplam Sefer */}
        <div className="group relative bg-gradient-to-br from-emerald-600 via-green-700 to-emerald-800 text-white rounded-2xl p-4 sm:p-6 shadow-2xl hover:shadow-green-500/25 transition-all duration-500 hover:scale-105 hover:-translate-y-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-bold text-white group-hover:text-emerald-100 transition-colors duration-300">
                  {filteredData.summary.totalDeliveries}
                </div>
                <div className="text-emerald-200 text-xs sm:text-sm font-medium">Sefer</div>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-emerald-100 text-xs sm:text-sm font-semibold">🚚 Toplam Sefer</p>
              <p className="text-emerald-200/80 text-xs">Teslimat Sayısı</p>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 w-20 h-20 sm:w-24 sm:h-24 bg-emerald-500/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
        </div>
        
        {/* Toplam Palet */}
        <div className="group relative bg-gradient-to-br from-violet-600 via-purple-700 to-violet-800 text-white rounded-2xl p-4 sm:p-6 shadow-2xl hover:shadow-violet-500/25 transition-all duration-500 hover:scale-105 hover:-translate-y-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-violet-400 to-violet-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-bold text-white group-hover:text-violet-100 transition-colors duration-300">
                  {filteredData.summary.totalPallets}
                </div>
                <div className="text-violet-200 text-xs sm:text-sm font-medium">Palet</div>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-violet-100 text-xs sm:text-sm font-semibold">📦 Toplam Palet</p>
              <p className="text-violet-200/80 text-xs">Palet Sayısı</p>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 w-20 h-20 sm:w-24 sm:h-24 bg-violet-500/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
        </div>
        
        {/* Toplam Kasa */}
        <div className="group relative bg-gradient-to-br from-amber-600 via-orange-700 to-amber-800 text-white rounded-2xl p-4 sm:p-6 shadow-2xl hover:shadow-amber-500/25 transition-all duration-500 hover:scale-105 hover:-translate-y-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-bold text-white group-hover:text-amber-100 transition-colors duration-300">
                  {filteredData.summary.totalBoxes}
                </div>
                <div className="text-amber-200 text-xs sm:text-sm font-medium">Kasa</div>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-amber-100 text-xs sm:text-sm font-semibold">📦 Toplam Kasa</p>
              <p className="text-amber-200/80 text-xs">Kasa Sayısı</p>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 w-20 h-20 sm:w-24 sm:h-24 bg-amber-500/10 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
        </div>
      </div>
    );
  };

  const renderDriverAnalysis = () => {
    if (!analysisData) return null;
    const filteredData = getFilteredData();
    if (!filteredData) return null;

    const drivers = Object.values(filteredData.drivers).sort(getSortFunction(sortBy));
    


    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Şoför Performans Analizi ({drivers.length} kişi)
          </h3>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Sırala:</span>
            <div className="flex gap-1">
              {['trips', 'pallets', 'boxes', 'avgPallets', 'avgBoxes'].map(sortType => (
              <button
                  key={sortType}
                  onClick={() => setSortBy(sortType)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    sortBy === sortType ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {sortType === 'trips' ? 'Mağaza Sayısı' : sortType === 'pallets' ? 'Palet' : 
                   sortType === 'boxes' ? 'Kasa' : sortType === 'avgPallets' ? 'Ort. Palet' : 'Ort. Kasa'}
              </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-center py-1 px-1 font-semibold text-gray-700 w-8">Sıra</th>
                <th className="text-left py-1 px-1 font-semibold text-gray-700 w-24">Şoför</th>
                <th className="text-right py-1 px-1 font-semibold text-gray-700 w-16">Mağaza</th>
                <th className="text-right py-1 px-1 font-semibold text-gray-700 w-16">Palet</th>
                <th className="text-right py-1 px-1 font-semibold text-gray-700 w-16">Kasa</th>
                <th className="text-right py-1 px-1 font-semibold text-gray-700 w-16">Ort.Palet</th>
                <th className="text-right py-1 px-1 font-semibold text-gray-700 w-16">Ort.Kasa</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver, index) => {
                const rank = index + 1;
                const isTopThree = rank <= 3;
                const textSize = rank <= 3 ? 'text-xs' : rank <= 6 ? 'text-xs' : 'text-xs';
                
                // Renk geçişi için opacity hesapla
                let opacity = 'opacity-100';
                let bgColor = '';
                let textColor = '';
                let borderColor = '';
                
                if (rank === 1) {
                  bgColor = 'bg-gradient-to-r from-yellow-100 to-yellow-50';
                  textColor = 'text-yellow-800';
                  borderColor = 'border-yellow-300';
                } else if (rank === 2) {
                  bgColor = 'bg-gradient-to-r from-gray-100 to-gray-50';
                  textColor = 'text-gray-800';
                  borderColor = 'border-gray-300';
                } else if (rank === 3) {
                  bgColor = 'bg-gradient-to-r from-orange-100 to-orange-50';
                  textColor = 'text-orange-800';
                  borderColor = 'border-orange-300';
                } else if (rank <= 6) {
                  opacity = 'opacity-95';
                  bgColor = 'bg-gradient-to-r from-blue-100 to-blue-50';
                  textColor = 'text-blue-700';
                  borderColor = 'border-blue-200';
                } else if (rank <= 10) {
                  opacity = 'opacity-90';
                  bgColor = 'bg-gradient-to-r from-green-100 to-green-50';
                  textColor = 'text-green-700';
                  borderColor = 'border-green-200';
                } else {
                  opacity = 'opacity-85';
                  bgColor = 'bg-gradient-to-r from-purple-100 to-purple-50';
                  textColor = 'text-purple-700';
                  borderColor = 'border-purple-200';
                }
                
                return (
                  <tr key={index} className={`border-b border-gray-100 hover:bg-gray-50 ${textSize} ${opacity} ${bgColor}`}>
                  <td className="py-1 px-1 text-center">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold border-2 ${textColor} ${borderColor}`}>
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                    </span>
                  </td>
                    <td className={`py-1 px-1 font-medium ${isTopThree ? 'text-gray-900' : 'text-gray-700'}`}>
                      {driver.name}
                  </td>
                    <td className="py-1 px-1 text-right">
                      <span className={getRankColor(index, 'text')}>
                        {driver.totalTrips || 0}
                      </span>
                    </td>
                    <td className="py-1 px-1 text-right">
                      <span className={getRankColor(index, 'text')}>
                        {driver.totalPallets || 0}
                      </span>
                    </td>
                    <td className="py-1 px-1 text-right">
                      <span className={getRankColor(index, 'text')}>
                        {driver.totalBoxes || 0}
                      </span>
                    </td>
                    <td className="py-1 px-1 text-right">
                      <span className={getRankColor(index, 'text')}>
                        {driver.averagePallets}
                      </span>
                    </td>
                    <td className="py-1 px-1 text-right">
                      <span className={getRankColor(index, 'text')}>
                        {driver.averageBoxes}
                      </span>
                    </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };



  const renderPersonnelAnalysis = () => {
    if (!analysisData) return null;
    const filteredData = getFilteredData();
    if (!filteredData) return null;

    const personnel = Object.values(filteredData.personnel).sort(getSortFunction(sortBy));
    


    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Package className="w-4 h-4" />
            Sevkiyat Elemanı Performans Analizi ({personnel.length} kişi)
          </h3>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Sırala:</span>
            <div className="flex gap-1">
              {['trips', 'pallets', 'boxes', 'avgPallets', 'avgBoxes'].map(sortType => (
              <button
                  key={sortType}
                  onClick={() => setSortBy(sortType)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    sortBy === sortType ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {sortType === 'trips' ? 'Mağaza Sayısı' : sortType === 'pallets' ? 'Palet' : 
                   sortType === 'boxes' ? 'Kasa' : sortType === 'avgPallets' ? 'Ort. Palet' : 'Ort. Kasa'}
              </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-center py-1 px-1 font-semibold text-gray-700 w-8">Sıra</th>
                <th className="text-left py-1 px-1 font-semibold text-gray-700 w-24">Personel</th>
                <th className="text-right py-1 px-1 font-semibold text-gray-700 w-16">Mağaza</th>
                <th className="text-right py-1 px-1 font-semibold text-gray-700 w-16">Palet</th>
                <th className="text-right py-1 px-1 font-semibold text-gray-700 w-16">Kasa</th>
                <th className="text-right py-1 px-1 font-semibold text-gray-700 w-16">Ort.Palet</th>
                <th className="text-right py-1 px-1 font-semibold text-gray-700 w-16">Ort.Kasa</th>
              </tr>
            </thead>
            <tbody>
              {personnel.map((person, index) => {
                const rank = index + 1;
                const isTopThree = rank <= 3;
                const textSize = rank <= 3 ? 'text-xs' : rank <= 6 ? 'text-xs' : 'text-xs';
                
                // Renk geçişi için opacity hesapla
                let opacity = 'opacity-100';
                let bgColor = '';
                let textColor = '';
                let borderColor = '';
                
                if (rank === 1) {
                  bgColor = 'bg-gradient-to-r from-yellow-100 to-yellow-50';
                  textColor = 'text-yellow-800';
                  borderColor = 'border-yellow-300';
                } else if (rank === 2) {
                  bgColor = 'bg-gradient-to-r from-gray-100 to-gray-50';
                  textColor = 'text-gray-800';
                  borderColor = 'border-gray-300';
                } else if (rank === 3) {
                  bgColor = 'bg-gradient-to-r from-orange-100 to-orange-50';
                  textColor = 'text-orange-800';
                  borderColor = 'border-orange-300';
                } else if (rank <= 6) {
                  opacity = 'opacity-95';
                  bgColor = 'bg-gradient-to-r from-green-100 to-green-50';
                  textColor = 'text-green-700';
                  borderColor = 'border-green-200';
                } else if (rank <= 10) {
                  opacity = 'opacity-90';
                  bgColor = 'bg-gradient-to-r from-blue-100 to-blue-50';
                  textColor = 'text-blue-700';
                  borderColor = 'border-blue-200';
                } else {
                  opacity = 'opacity-85';
                  bgColor = 'bg-gradient-to-r from-purple-100 to-purple-50';
                  textColor = 'text-purple-700';
                  borderColor = 'border-purple-200';
                }
                
                return (
                  <tr key={index} className={`border-b border-gray-100 hover:bg-gray-50 ${textSize} ${opacity} ${bgColor}`}>
                  <td className="py-1 px-1 text-center">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold border-2 ${textColor} ${borderColor}`}>
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                    </span>
                  </td>
                    <td className={`py-1 px-1 font-medium ${isTopThree ? 'text-gray-900' : 'text-gray-700'}`}>
                      {person.name}
                  </td>
                    <td className="py-1 px-1 text-right">
                      <span className={getRankColor(index, 'text')}>
                        {person.totalTrips || 0}
                      </span>
                    </td>
                    <td className="py-1 px-1 text-right">
                      <span className={getRankColor(index, 'text')}>
                        {person.totalPallets || 0}
                      </span>
                    </td>
                    <td className="py-1 px-1 text-right">
                      <span className={getRankColor(index, 'text')}>
                        {person.totalBoxes || 0}
                      </span>
                    </td>
                    <td className="py-1 px-1 text-right">
                      <span className={getRankColor(index, 'text')}>
                        {person.averagePallets}
                      </span>
                    </td>
                    <td className="py-1 px-1 text-right">
                      <span className={getRankColor(index, 'text')}>
                        {person.averageBoxes}
                      </span>
                    </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Ay filtreleme yardımcı fonksiyonları
  const getAvailableMonths = (dates) => {
    const months = new Set();
    
    dates.forEach(item => {
      // Tarih formatını kontrol et - hem dd.MM.yyyy hem de yyyy-MM-dd formatlarını destekle
      let dateStr = item.date;
      
      // Eğer yyyy-MM-dd formatındaysa, dd.MM.yyyy formatına çevir
      if (dateStr.includes('-')) {
        const [year, month, day] = dateStr.split('-');
        dateStr = `${day}.${month}.${year}`;
      }
      
      const [day, month, year] = dateStr.split('.');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    
    return Array.from(months).sort().reverse(); // En son ay önce gelsin
  };

  const getMonthDisplayName = (monthKey) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
  };

  const getDatesForMonth = (dates, monthKey) => {
    return dates.filter(item => {
      // Tarih formatını kontrol et - hem dd.MM.yyyy hem de yyyy-MM-dd formatlarını destekle
      let dateStr = item.date;
      
      // Eğer yyyy-MM-dd formatındaysa, dd.MM.yyyy formatına çevir
      if (dateStr.includes('-')) {
        const [year, month, day] = dateStr.split('-');
        dateStr = `${day}.${month}.${year}`;
      }
      
      const [day, month, year] = dateStr.split('.');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const itemMonthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      return itemMonthKey === monthKey;
    });
  };

  const getLatestMonth = (dates) => {
    if (dates.length === 0) return null;
    
    const parseDate = (dateStr) => {
      // Tarih formatını kontrol et - hem dd.MM.yyyy hem de yyyy-MM-dd formatlarını destekle
      let formattedDateStr = dateStr;
      
      // Eğer yyyy-MM-dd formatındaysa, dd.MM.yyyy formatına çevir
      if (dateStr.includes('-')) {
        const [year, month, day] = dateStr.split('-');
        formattedDateStr = `${day}.${month}.${year}`;
      }
      
      const [day, month, year] = formattedDateStr.split('.');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    };
    
    const sortedDates = dates
      .map(item => ({ ...item, parsedDate: parseDate(item.date) }))
      .sort((a, b) => b.parsedDate - a.parsedDate);
    
    const lastDate = sortedDates[0];
    const lastMonth = lastDate.parsedDate.getMonth();
    const lastYear = lastDate.parsedDate.getFullYear();
    
    return `${lastYear}-${String(lastMonth + 1).padStart(2, '0')}`;
  };

  return (
    <div className="w-full px-2 py-2">
      <div className="mb-2">
        {/* Modern Header */}
        <div className="text-center mb-2">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-1">
            Performans Analizi
          </h1>
          <p className="text-xs text-gray-600 mb-2">Şoför ve personel performansını analiz edin</p>
          
          {/* Modern Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          {analysisData && (
              <button
                onClick={handleExportToExcel}
                disabled={loadingPlans}
                className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingPlans ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                ) : (
                  <Download className="w-3 h-3" />
                )}
                {loadingPlans ? 'İndiriliyor...' : 'Excel İndir'}
              </button>
            )}
            
            <label className="cursor-pointer">
              <div className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
                {loadingPlans ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                ) : (
                  <Upload className="w-3 h-3" />
                )}
                <span className="font-medium text-sm">
                  {loadingPlans ? 'İşleniyor...' : 'Yeni Veri Ekle'}
                </span>
        </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handlePlansUpload}
                className="hidden"
                disabled={loadingPlans}
              />
            </label>

            {analysisData && (
              <button
                onClick={handleOpenDateEditModal}
                className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Calendar className="w-3 h-3" />
                <span className="font-medium text-sm">Tarih Düzenle</span>
              </button>
            )}

          </div>
        </div>
      </div>

      {/* İlk veri yükleme durumu */}
      {initialDataLoading && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="text-center py-8">
            <div className="flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Veriler Yükleniyor...</h3>
            <p className="text-gray-600">Veritabanından performans verileri alınıyor.</p>
          </div>
        </div>
      )}

      {/* DOSYA YÜKLEME - İLK SEFERDE */}
      {!initialDataLoading && !analysisData && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          {!loadingPlans ? (
            <div className="flex items-center justify-center">
              <label className="flex flex-col items-center gap-4 cursor-pointer">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-lg">
                  <BarChart3 className="w-10 h-10 text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-800">Excel Dosyasını Yükleyin</p>
                  <p className="text-sm text-gray-600">Anadolu planını içeren Excel dosyasını seçin</p>
                </div>
                <div className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
                  <Upload className="w-5 h-5 inline mr-2" />
                  Dosya Seç
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handlePlansUpload}
                  className="hidden"
                  disabled={loadingPlans}
                />
              </label>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="flex items-center justify-center mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Dosya İşleniyor...</h3>
              <p className="text-gray-600">Excel dosyası okunuyor ve veriler analiz ediliyor.</p>
            </div>
          )}
        </div>
      )}

      {/* Hata/Bilgi Mesajı */}
      {uploadError && (
        <div className={`border rounded-xl p-6 mb-8 ${
          uploadError.startsWith('✅') 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                uploadError.startsWith('✅') 
                  ? 'bg-green-100' 
                  : 'bg-red-100'
              }`}>
                {uploadError.startsWith('✅') ? (
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                ) : (
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${
                uploadError.startsWith('✅') 
                  ? 'text-green-800' 
                  : 'text-red-800'
              }`}>
                {uploadError.startsWith('✅') ? 'Başarıyla Güncellendi! 🎉' : 'Bilgi'}
              </h3>
              <p className={`${
                uploadError.startsWith('✅') 
                  ? 'text-green-700' 
                  : 'text-red-700'
              }`}>
                {uploadError}
              </p>
                </div>
          </div>
        </div>
      )}



      {/* Analiz Sonuçları */}
      {!initialDataLoading && analysisData && (
        <>
          {/* Filtreleme Paneli */}
          <div className="bg-white rounded-lg border border-gray-200 p-1 mb-1">
            {/* Üst Bar: Görünüm Butonları */}
            <div className="flex items-center justify-end mb-0.5">
                  {/* Modern Görünüm Toggle */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                      onClick={() => setWeeklyView(false)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        !weeklyView 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                      Günlük
                    </button>
                    <button
                      onClick={() => setWeeklyView(true)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        weeklyView 
                          ? 'bg-white text-purple-600 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4" />
                      Haftalık
                  </button>
                  </div>
            </div>
            
            {/* Filtreler */}
            <div className="space-y-3">

              {/* Modern Ay Seçimi */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Ay Seçimi
                </label>
                <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-1.5">
                  {/* Tüm Aylar Seçeneği - Farklı Renk */}
                  <button
                    onClick={() => setSelectedMonth(null)}
                    className={`p-1.5 rounded-md border-2 transition-all duration-200 hover:shadow-sm ${
                      selectedMonth === null
                        ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-sm mb-0.5 flex justify-center">
                        <BarChart3 className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="text-xs font-medium text-gray-900">Tüm Aylar</div>
                      <div className="text-xs text-gray-500">
                        {availableDates.length} veri
                      </div>
                    </div>
                  </button>

                  {/* Ay Kartları */}
                  {getAvailableMonths(availableDates).map(monthKey => {
                    const monthDates = getDatesForMonth(availableDates, monthKey);
                    const isSelected = selectedMonth === monthKey;
                
                return (
                        <button
                        key={monthKey}
                        onClick={() => setSelectedMonth(monthKey)}
                        className={`p-1.5 rounded-md border-2 transition-all duration-200 hover:shadow-sm ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-blue-300'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-sm mb-0.5">📆</div>
                          <div className="text-xs font-medium text-gray-900">
                            {getMonthDisplayName(monthKey)}
                    </div>
                          <div className="text-xs text-gray-500">
                            {monthDates.length} veri
                  </div>
                          {/* Vardiya göstergesi */}
                          <div className="flex justify-center gap-0.5 mt-0.5">
                            {monthDates.some(d => d.shift === 'GÜNDÜZ') && (
                              <span className="w-1 h-1 bg-orange-400 rounded-full" title="Gündüz"></span>
                            )}
                            {monthDates.some(d => d.shift === 'GECE') && (
                              <span className="w-1 h-1 bg-blue-400 rounded-full" title="Gece"></span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tarih Seçimi */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Tarih Seçimi ({selectedMonth ? getDatesForMonth(availableDates, selectedMonth).length : availableDates.length} veri)
                  </label>
                </div>

                {weeklyView ? (
                  // Haftalık Görünüm
                  <div className="space-y-2">
                    <div className="flex gap-2 mb-2">
                  <button
                        onClick={() => {
                          const weeks = groupDatesByWeeks(selectedMonth ? getDatesForMonth(availableDates, selectedMonth) : availableDates);
                          setSelectedWeeks(weeks.map(w => w.id));
                          setSelectedDates((selectedMonth ? getDatesForMonth(availableDates, selectedMonth) : availableDates).map(item => item.id));
                        }}
                        className="px-2 py-0.5 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                      >
                        Tüm Haftalar
                  </button>
                  <button
                    onClick={() => {
                      // Seçili ayın verilerini seç
                      const monthDates = selectedMonth ? getDatesForMonth(availableDates, selectedMonth) : availableDates;
                      const selectedIds = monthDates.map(item => item.id);
                      setSelectedDates(selectedIds);
                      
                      // Seçili ayın bulunduğu haftaları seç
                      const weeks = groupDatesByWeeks(selectedMonth ? getDatesForMonth(availableDates, selectedMonth) : availableDates);
                      const selectedWeeks = weeks.filter(week => 
                        week.dates.some(date => selectedIds.includes(date.id))
                      ).map(w => w.id);
                      setSelectedWeeks(selectedWeeks);
                    }}
                    className="px-2 py-0.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                  >
                    Seçili Ay
                  </button>
                      <button
                        onClick={() => {
                          setSelectedWeeks([]);
                          setSelectedDates([]);
                        }}
                        className="px-2 py-0.5 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                      >
                        Temizle
                      </button>
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {groupDatesByWeeks(selectedMonth ? getDatesForMonth(availableDates, selectedMonth) : availableDates).map((week) => (
                        <div key={week.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedWeeks.includes(week.id)}
                              onChange={(e) => {
                                const weekDateIds = week.dates.map(item => item.id);
                                if (e.target.checked) {
                                  setSelectedWeeks([...selectedWeeks, week.id]);
                                  setSelectedDates([...new Set([...selectedDates, ...weekDateIds])]);
                                } else {
                                  setSelectedWeeks(selectedWeeks.filter(w => w !== week.id));
                                  setSelectedDates(selectedDates.filter(d => !weekDateIds.includes(d)));
                                }
                              }}
                              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900">{week.label}</span>
                                <span className="text-xs text-gray-500">6 gün</span>
                </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {week.dates
                                  .sort((a, b) => {
                                    // Tarih formatını düzgün parse et
                                    const parseDate = (dateStr) => {
                                      const [day, month, year] = dateStr.split('.');
                                      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                    };
                                    
                                    const dateA = parseDate(a.date);
                                    const dateB = parseDate(b.date);
                                    
                                    // Önce tarihe göre sırala
                                    if (dateA.getTime() !== dateB.getTime()) {
                                      return dateA - dateB;
                                    }
                                    
                                    // Aynı tarihse önce gündüz sonra gece
                                    if (a.shift === 'GÜNDÜZ' && b.shift === 'GECE') return -1;
                                    if (a.shift === 'GECE' && b.shift === 'GÜNDÜZ') return 1;
                                    return 0;
                                  })
                                  .map((dateItem) => (
                                  <span key={dateItem.id} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    dateItem.shift === 'GÜNDÜZ' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {dateItem.shift === 'GÜNDÜZ' ? <Sun className="w-3 h-3 text-orange-500" /> : <Moon className="w-3 h-3 text-blue-500" />} {dateItem.date}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Modern Günlük Görünüm
              <div>
                    {/* Kompakt Hızlı Seçim Butonları */}
                    <div className="flex flex-wrap gap-2 mb-3">
                  <button
                        onClick={() => setSelectedDates((selectedMonth ? getDatesForMonth(availableDates, selectedMonth) : availableDates).map(item => item.id))}
                        className="px-3 py-1.5 bg-green-500 text-white rounded-md text-xs font-medium hover:bg-green-600 transition-colors"
                  >
                        ✅ Tümünü Seç
                  </button>

                  <button
                    onClick={() => setSelectedDates([])}
                        className="px-3 py-1.5 bg-red-500 text-white rounded-md text-xs font-medium hover:bg-red-600 transition-colors"
                      >
                        ❌ Tümünü Kaldır
                      </button>

                      <button
                        onClick={() => {
                          const dayDates = (selectedMonth ? getDatesForMonth(availableDates, selectedMonth) : availableDates)
                            .filter(item => item.shift === 'GÜNDÜZ')
                            .map(item => item.id);
                          setSelectedDates(dayDates);
                        }}
                        className="px-3 py-1.5 bg-orange-500 text-white rounded-md text-xs font-medium hover:bg-orange-600 transition-colors"
                      >
                        🌅 Sadece Gündüz
                      </button>

                      <button
                        onClick={() => {
                          const nightDates = (selectedMonth ? getDatesForMonth(availableDates, selectedMonth) : availableDates)
                            .filter(item => item.shift === 'GECE')
                            .map(item => item.id);
                          setSelectedDates(nightDates);
                        }}
                        className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-xs font-medium hover:bg-blue-600 transition-colors"
                      >
                        🌙 Sadece Gece
                  </button>
                </div>

                    {/* Kompakt Tarih Kartları */}
                    <div className="max-h-48 overflow-y-auto">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                        {(selectedMonth ? getDatesForMonth(availableDates, selectedMonth) : availableDates).map((dateItem) => {
                          const isSelected = selectedDates.includes(dateItem.id);
                          const isDayShift = dateItem.shift === 'GÜNDÜZ';
                          
                          return (
                            <div
                              key={dateItem.id}
                              onClick={() => {
                                if (isSelected) {
                                    setSelectedDates(selectedDates.filter(d => d !== dateItem.id));
                                } else {
                                  setSelectedDates([...selectedDates, dateItem.id]);
                                }
                              }}
                              className={`relative p-2 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-sm transform hover:scale-102 ${
                                isSelected
                                  ? (isDayShift 
                                      ? 'border-orange-500 bg-orange-50 shadow-sm' 
                                      : 'border-blue-500 bg-blue-50 shadow-sm')
                                  : (isDayShift
                                      ? 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50'
                                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50')
                              }`}
                            >
                              {/* Seçim İndikatörü */}
                              <div className="absolute top-1 right-1">
                                <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                                  isSelected
                                    ? (isDayShift ? 'border-orange-500 bg-orange-500' : 'border-blue-500 bg-blue-500')
                                    : 'border-gray-300'
                                }`}>
                                  {isSelected && (
                                    <CheckCircle className="w-2 h-2 text-white" />
                                  )}
                            </div>
                          </div>

                              {/* Tarih İçeriği */}
                              <div className="text-center">
                                <div className="text-sm mb-1 flex justify-center">
                                  {isDayShift ? <Sun className="w-4 h-4 text-orange-500" /> : <Moon className="w-4 h-4 text-blue-500" />}
                      </div>
                                <div className={`text-xs font-medium mb-1 ${
                                  isSelected 
                                    ? (isDayShift ? 'text-orange-800' : 'text-blue-800')
                                    : 'text-gray-900'
                                }`}>
                                  {dateItem.date}
                                </div>
                                <div className={`text-xs font-medium px-1 py-0.5 rounded ${
                                  isSelected
                                    ? (isDayShift 
                                        ? 'bg-orange-200 text-orange-800' 
                                        : 'bg-blue-200 text-blue-800')
                                    : (isDayShift 
                                        ? 'bg-orange-100 text-orange-700' 
                                        : 'bg-blue-100 text-blue-700')
                                }`}>
                                  {isDayShift ? 'Gündüz' : 'Gece'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                  </div>
                </div>
                  </div>
                )}
              </div>

              {/* Seçim Özeti - Kompakt */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-700">Seçilen: <span className="font-medium text-blue-600">{selectedDates.length}</span> / {selectedMonth ? getDatesForMonth(availableDates, selectedMonth).length : availableDates.length} veri</span>
                </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-600">🔄</span>
                    <span className="text-gray-700">Vardiya: <span className="font-medium text-purple-600">{(() => {
                      if (selectedDates.length === 0) return 'Yok';
                      
                      const selectedDateItems = availableDates.filter(item => selectedDates.includes(item.id));
                      const hasDay = selectedDateItems.some(item => item.shift === 'GÜNDÜZ');
                      const hasNight = selectedDateItems.some(item => item.shift === 'GECE');
                      
                      if (hasDay && hasNight) return 'Tümü';
                      if (hasDay && !hasNight) return 'Gündüz';
                      if (!hasDay && hasNight) return 'Gece';
                      return 'Tümü';
                    })()}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    {weeklyView ? <BarChart3 className="w-4 h-4 text-green-600" /> : <TrendingUp className="w-4 h-4 text-green-600" />}
                    <span className="text-gray-700">Görünüm: <span className="font-medium text-green-600">{weeklyView ? 'Haftalık' : 'Günlük'}</span></span>
                  </div>
                </div>
                
                
                {weeklyView && (
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-orange-600">🗓️</span>
                      <span>Seçilen Haftalar: <span className="font-medium text-orange-600">{selectedWeeks.length}</span> / {groupDatesByWeeks(selectedMonth ? getDatesForMonth(availableDates, selectedMonth) : availableDates).length} hafta</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Haftalık İstatistikler */}
          {weeklyView && selectedWeeks.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <h3 className="text-base font-semibold text-gray-800">Haftalık İstatistikler</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                {groupDatesByWeeks(availableDates).filter(week => selectedWeeks.includes(week.id)).map((week) => {
                  const weekShiftIds = week.dates.map(d => d.id); // Tarih+shift kombinasyonları (01.07.2025_GÜNDÜZ formatında)
                  const weekStats = {
                    totalTrips: 0,
                    totalPallets: 0,
                    totalBoxes: 0,
                    activeDrivers: 0,
                    activePersonnel: 0
                  };
                  
                  
                  // Haftalık istatistikleri hesapla - şoförler
                  Object.values(analysisData.drivers).forEach(driver => {
                    let hasTrips = false;
                    Object.entries(driver.dayData || {}).forEach(([sheetName, data]) => {
                      if (weekShiftIds.includes(sheetName)) {
                        weekStats.totalTrips += data.trips || 0;
                        weekStats.totalPallets += data.pallets || 0;
                        weekStats.totalBoxes += data.boxes || 0;
                        if (data.trips > 0) hasTrips = true;
                        
                        // Şoför haftalık verisi
                      }
                    });
                    if (hasTrips) weekStats.activeDrivers++;
                  });
                  
                  // Haftalık istatistikleri hesapla - personeller
                  Object.values(analysisData.personnel).forEach(person => {
                    let hasTrips = false;
                    Object.entries(person.dayData || {}).forEach(([sheetName, data]) => {
                      if (weekShiftIds.includes(sheetName)) {
                        weekStats.totalTrips += data.trips || 0;
                        weekStats.totalPallets += data.pallets || 0;
                        weekStats.totalBoxes += data.boxes || 0;
                        if (data.trips > 0) hasTrips = true;
                        
                        // Personel haftalık verisi
                      }
                    });
                    if (hasTrips) weekStats.activePersonnel++;
                  });
                  
                  
                  return (
                    <div key={week.id} className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-3 border border-purple-200">
                      <div className="text-xs font-medium text-purple-800 mb-2">{week.label}</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Toplam Sefer:</span>
                          <span className="font-medium text-purple-600">{weekStats.totalTrips}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Toplam Palet:</span>
                          <span className="font-medium text-blue-600">{weekStats.totalPallets}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Toplam Kasa:</span>
                          <span className="font-medium text-green-600">{weekStats.totalBoxes}</span>
                        </div>
                        <div className="border-t border-purple-200 pt-1 mt-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Aktif Şoför:</span>
                            <span className="font-medium text-orange-600">{weekStats.activeDrivers}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Aktif Personel:</span>
                            <span className="font-medium text-orange-600">{weekStats.activePersonnel}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {renderSummaryCards()}
          
          <div className="grid grid-cols-1 xl:grid-cols-1 gap-6">
            {renderDriverAnalysis()}
            {renderPersonnelAnalysis()}
          </div>
        </>
      )}

      {/* Performans Tarih Düzenleme Modalı */}
      {showDateEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[85vh] overflow-hidden border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <Calendar className="w-6 h-6 mr-3 text-purple-600" />
                Performans Tarih Düzenleme
              </h3>
              <button
                onClick={() => setShowDateEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-6">
                {/* Tüm Tarihler Listesi */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                  <h4 className="font-bold text-blue-900 text-lg mb-4">📋 Tüm Performans Tarihleri</h4>
                  
                  {dateEditLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-blue-600 font-medium">Tarihler yükleniyor...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {allPerformanceDates.map((dateItem, index) => (
                        <div 
                          key={dateItem.id}
                          onClick={() => handleSelectDateForEdit(dateItem)}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                            selectedDateForEdit?.id === dateItem.id
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50'
                          }`}
                        >
                          <div className="text-sm font-medium text-gray-900">
                            {dateItem.display_name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            ID: {dateItem.id}
                          </div>
                          <div className="text-xs text-gray-500">
                            Sheet: {dateItem.sheet_name || 'N/A'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Seçili Tarih Düzenleme */}
                {selectedDateForEdit && (
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                    <h4 className="font-bold text-green-900 text-lg mb-4">✏️ Seçili Tarihi Düzenle</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-green-800 mb-2">Yeni Tarih</label>
                        <input
                          type="date"
                          value={dateEditForm.new_date}
                          onChange={(e) => setDateEditForm({...dateEditForm, new_date: e.target.value})}
                          className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-green-800 mb-2">Yeni Vardiya Türü</label>
                        <select
                          value={dateEditForm.new_shift_type}
                          onChange={(e) => setDateEditForm({...dateEditForm, new_shift_type: e.target.value})}
                          className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="gunduz">🌅 Gündüz</option>
                          <option value="gece">🌙 Gece</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="text-sm text-yellow-800">
                        <strong>⚠️ Dikkat:</strong> Bu işlem tüm veritabanında bu tarih aralığındaki tüm performans kayıtlarını etkileyecektir.
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end space-x-3">
                      <button
                        onClick={() => setSelectedDateForEdit(null)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        Seçimi İptal Et
                      </button>
                      <button
                        onClick={() => handleDeletePerformanceDate(selectedDateForEdit)}
                        disabled={dateEditLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        {dateEditLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline"></div>
                            Siliniyor...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2 inline" />
                            Bu Tarihi Sil
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleUpdatePerformanceDate}
                        disabled={dateEditLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        {dateEditLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline"></div>
                            Güncelleniyor...
                          </>
                        ) : (
                          'Tüm Veritabanında Güncelle'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PerformanceAnalysis; 