import React, { useState, useEffect, useRef } from 'react';
import { Upload, BarChart3, Calendar, Users, Truck, Package, FileText, User, Download, CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getAllPersonnel, bulkSavePerformanceData, getPerformanceData, getStoreLocationsByCodes } from '../services/supabase';

const PerformanceAnalysis = ({ personnelData: propPersonnelData, storeData: propStoreData, userRole }) => {
  // PerformanceAnalysis başladı
  
  // State'ler
  const [analysisData, setAnalysisData] = useState(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [initialDataLoading, setInitialDataLoading] = useState(true); // İlk veri yükleme durumu

  const [uploadError, setUploadError] = useState('');
  const [selectedDates, setSelectedDates] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [shiftFilter, setShiftFilter] = useState('all');
  const [sortBy, setSortBy] = useState('boxes'); // Default olarak Kasa seçili
  const [sortDirection, setSortDirection] = useState('desc');
  const [personnelDatabase, setPersonnelDatabase] = useState([]);
  const [savedAnalyses, setSavedAnalyses] = useState([]);
  const [weeklyView, setWeeklyView] = useState(false); // Haftalık görünüm
  const [selectedWeeks, setSelectedWeeks] = useState([]); // Seçili haftalar
  


  
  // File input ref
  const fileInputRef = useRef(null);

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
    
    if (!personnelDatabase.length) {
      // Personnel database henüz yüklenmemiş
      return;
    }

    try {
      const result = await getPerformanceData();
      
      if (result.success && result.data.length > 0) {
        
        // Performance_data'daki shift_type dağılımını kontrol et (tarih shift'i)
        const shiftDistribution = {};
        const dateShiftCombos = new Set();
        
        result.data.forEach(record => {
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
        
        // GRUPLANDIRMA: Aynı gün aynı çalışan için kayıtları birleştir
        const groupedRecords = {};
        
        result.data.forEach(record => {
          const { employee_name, employee_code, date, trips = 0, pallets = 0, boxes = 0, stores_visited = 0, date_shift_type, store_codes, sheet_name } = record;
          
          // Performance record işleniyor
          
          if (!employee_name) {
            console.warn(`⚠️ employee_name boş, kayıt atlanıyor`);
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
            console.warn(`⚠️ Personnel database'de bulunamadı: ${employee_name}`);
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
        
        // Selected dates'i sadece ilk kez yüklendiğinde tümünü seç, sonra kullanıcının seçimini koru
        const allCombinationIds = availableDatesArray.map(item => item.id);
        
        // Sadece selectedDates boşsa tümünü seç
        setSelectedDates(prevSelected => {
          if (prevSelected.length === 0) {
            return allCombinationIds;
          } else {
            // Mevcut seçimleri filtreleme (artık mevcut olmayan tarihleri temizle)
            const validSelections = prevSelected.filter(id => allCombinationIds.includes(id));
            return validSelections.length > 0 ? validSelections : allCombinationIds;
          }
        });
        
        // Basit format hazırlandı
        
        setAnalysisData(analysisResults);
        

        
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
      console.error('Performans verileri yükleme hatası:', error);
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
          console.error('Personnel verileri yüklenemedi:', result.error);
        }
      } catch (error) {
        console.error('Personnel verileri yüklenirken hata:', error);
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

  // Vardiya filtreleme - sadece shiftFilter değiştiğinde çalışsın
  useEffect(() => {
          // Vardiya filtreleme
    if (availableDates.length > 0) {
      let filteredDateIds = [];
      
      if (shiftFilter === 'all') {
        filteredDateIds = availableDates.map(item => item.id);
      } else if (shiftFilter === 'day') {
        filteredDateIds = availableDates.filter(item => item.shift === 'GÜNDÜZ').map(item => item.id);
      } else if (shiftFilter === 'night') {
        filteredDateIds = availableDates.filter(item => item.shift === 'GECE').map(item => item.id);
      }
      
      setSelectedDates(filteredDateIds);
    }
  }, [shiftFilter]); // availableDates bağımlılığını kaldırdım
  
  // AvailableDates yüklendiğinde selectedDates'i set et - basit versiyon
  useEffect(() => {
    if (availableDates.length > 0) {
      const allIds = availableDates.map(item => item.id);
      setSelectedDates(allIds);
    }
  }, [availableDates]); // availableDates her değiştiğinde çalışsın

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
          console.warn(`⚠️ Şoför bulunamadı: ${driverName}`);
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
          const isDriverPosition = personnelInfo.position && 
            personnelInfo.position.toLowerCase().includes('şoför');
          
          performanceDataArray.push({
            date: formattedDate,
            employee_code: personnelInfo.employee_code,
            employee_name: personnelInfo.full_name,
            employee_type: isDriverPosition ? 'driver' : 'personnel',
            date_shift_type: dateShiftType, // Tarihin gece/gündüz olması
            sheet_name: normalizeSheetName(sheetName), // Normalize edilmiş sheet adı
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
          console.warn(`⚠️ Personel bulunamadı: ${personName}`);
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
          const isDriverPosition = personnelInfo.position && 
            personnelInfo.position.toLowerCase().includes('şoför');
          
          performanceDataArray.push({
            date: formattedDate,
            employee_code: personnelInfo.employee_code,
            employee_name: personnelInfo.full_name,
            employee_type: isDriverPosition ? 'driver' : 'personnel',
            date_shift_type: dateShiftType, // Tarihin gece/gündüz olması
            sheet_name: normalizeSheetName(sheetName), // Normalize edilmiş sheet adı
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
        const result = await bulkSavePerformanceData(finalData);
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
      console.error('❌ Mevcut veriler kontrol edilirken hata:', error);
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
        console.error('❌ Excel okuma hatası:', error);
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
        const sofor = (row[13] || '').toString().trim();
        const personel1 = (row[14] || '').toString().trim();
        const personel2 = (row[15] || '').toString().trim();
        
        if (!magazaKodu || !sofor) return;
        
        // Mağaza kodunu kaydet
        processedStores.add(magazaKodu);
        
        // Günlük toplam güncelle
        results.dailyData[sheetName].totalPallets += palet;
        results.dailyData[sheetName].totalBoxes += kasa;
        
        // Basit personel işleme
        [sofor, personel1, personel2].forEach(personName => {
          if (!personName) return;
          
          const matchedDriver = findMatchingPerson(personName, results.drivers);
          const matchedPersonnel = findMatchingPerson(personName, results.personnel);
          
          if (matchedDriver) {
            if (!results.drivers[matchedDriver].dayData[sheetName]) {
              results.drivers[matchedDriver].dayData[sheetName] = {
                trips: 0, pallets: 0, boxes: 0, stores: []
              };
            }
            results.drivers[matchedDriver].dayData[sheetName].trips += 1;
            results.drivers[matchedDriver].dayData[sheetName].pallets += palet;
            results.drivers[matchedDriver].dayData[sheetName].boxes += kasa;
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
                trips: 0, pallets: 0, boxes: 0, stores: []
              };
            }
            results.personnel[matchedPersonnel].dayData[sheetName].trips += 1;
            results.personnel[matchedPersonnel].dayData[sheetName].pallets += palet;
            results.personnel[matchedPersonnel].dayData[sheetName].boxes += kasa;
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
        
        // Günlük toplam güncelle
        results.dailyData[sheetName].totalPallets += palet;
        results.dailyData[sheetName].totalBoxes += kasa;
        
        // ŞOFÖRLERİ İŞLE
        const matchedDriver = findMatchingPerson(sofor, results.drivers);
          if (matchedDriver) {
          // Güncel vardiya bilgisini veritabanından çek ve güncelle
          const currentShift = getPersonnelShiftFromDatabase(matchedDriver);
          results.drivers[matchedDriver].shift = currentShift;
          
          // Günlük veri yapısını hazırla
            if (!results.drivers[matchedDriver].dayData[sheetName]) {
              results.drivers[matchedDriver].dayData[sheetName] = {
              trips: 0, pallets: 0, boxes: 0, stores: []
            };
          }
          
          // Günlük benzersiz mağaza takibi
          if (!dailyPersonnelVisits.has(matchedDriver)) {
            dailyPersonnelVisits.set(matchedDriver, new Set());
          }
          
          // Bu şoför bu mağazaya daha önce gitmişse tekrar sayma
          if (!dailyPersonnelVisits.get(matchedDriver).has(magazaKodu)) {
            dailyPersonnelVisits.get(matchedDriver).add(magazaKodu);
            
            // Sefer sayısını artır
            results.drivers[matchedDriver].totalTrips++;
            results.drivers[matchedDriver].dayData[sheetName].trips++;
            results.drivers[matchedDriver].dayData[sheetName].stores.push(magazaKodu);
            
            // Yeni sefer sayıldı
          } else {
            // Aynı mağaza, tekrar sayılmadı
          }
          
          // Palet ve kasa her zaman ekle
          results.drivers[matchedDriver].totalPallets += palet;
          results.drivers[matchedDriver].totalBoxes += kasa;
          results.drivers[matchedDriver].dayData[sheetName].pallets += palet;
          results.drivers[matchedDriver].dayData[sheetName].boxes += kasa;
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
      console.warn('Personnel veritabanı boş');
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
      console.warn('❌ Personnel bulunamadı:', personnelName);
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
    
    results.summary.totalBoxes = 
      Object.values(results.drivers).reduce((sum, driver) => sum + driver.totalBoxes, 0) +
      Object.values(results.personnel).reduce((sum, person) => sum + person.totalBoxes, 0);
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

    // VARDİYA FİLTRESİ UYGULA
    if (shiftFilter !== 'all') {
      const beforeFilterCount = selectedDateShiftCombinations.length;
      
      if (shiftFilter === 'day') {
        // Sadece gündüz vardiyaları
        selectedDateShiftCombinations = selectedDateShiftCombinations.filter(item => 
          item.shift === 'GÜNDÜZ' || item.shift === 'gunduz' || item.shift === 'GUNDUZ'
        );
        // Gündüz filtresi uygulandı
      } else if (shiftFilter === 'night') {
        // Sadece gece vardiyaları
        selectedDateShiftCombinations = selectedDateShiftCombinations.filter(item => 
          item.shift === 'GECE' || item.shift === 'gece' || item.shift === 'NIGHT'
        );
        // Gece filtresi uygulandı
      }
      
      // Shift filtresi uygulandı
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

    filteredResults.summary.totalBoxes = 
      Object.values(filteredResults.drivers).reduce((sum, driver) => sum + driver.totalBoxes, 0) +
      Object.values(filteredResults.personnel).reduce((sum, person) => sum + person.totalBoxes, 0);

    // Shift kombinasyonu sayısını ekle
    filteredResults.summary.shiftCombinations = selectedDateShiftCombinations.length;
    
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
        ['Şoför Adı', 'Vardiya', 'Sefer', 'Palet', 'Kasa', 'Ort. Palet', 'Ort. Kasa']
      ];
      
      drivers.forEach(driver => {
        driverData.push([
          driver.name,
          driver.shift === 'İZİNLİ' ? 'İzinli' : driver.shift === 'GÜNDÜZ' ? 'Gündüz' : 'Gece',
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
        ['Personel Adı', 'Vardiya', 'Sefer', 'Palet', 'Kasa', 'Ort. Palet', 'Ort. Kasa']
      ];
      
      personnel.forEach(person => {
        personnelData.push([
          person.name,
          person.shift === 'İZİNLİ' ? 'İzinli' : person.shift === 'GÜNDÜZ' ? 'Gündüz' : 'Gece',
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
      console.error('❌ Excel export hatası:', error);
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs">🌙 gece vardiyası</p>
              <p className="text-2xl font-bold">{filteredData.summary.geceDays}</p>
              <p className="text-blue-200 text-xs">Toplam Gün</p>
            </div>
            <Calendar className="w-10 h-10 text-blue-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-xs">🌅 gündüz vardiyası</p>
              <p className="text-2xl font-bold">{filteredData.summary.gunduzDays}</p>
              <p className="text-indigo-200 text-xs">Toplam Gün</p>
            </div>
            <Calendar className="w-10 h-10 text-indigo-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-xs">Toplam Sefer</p>
              <p className="text-2xl font-bold">{filteredData.summary.totalDeliveries}</p>
              <p className="text-green-200 text-xs">🚚 sefer</p>
            </div>
            <Truck className="w-10 h-10 text-green-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-xs">Toplam Palet</p>
              <p className="text-2xl font-bold">{filteredData.summary.totalPallets}</p>
              <p className="text-purple-200 text-xs">📦 palet</p>
            </div>
            <Package className="w-10 h-10 text-purple-200" />
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-xs">Toplam Kasa</p>
              <p className="text-2xl font-bold">{filteredData.summary.totalBoxes}</p>
              <p className="text-orange-200 text-xs">📦 kasa</p>
            </div>
            <Package className="w-10 h-10 text-orange-200" />
          </div>
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
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Şoför Performans Analizi ({drivers.length} kişi)
          </h3>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sırala:</span>
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
                <th className="text-center py-2 px-2 font-semibold text-gray-700 w-12">Sıra</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-700">Şoför</th>
                <th className="text-center py-2 px-2 font-semibold text-gray-700">Vardiya</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Mağaza</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Palet</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Kasa</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Ort.Palet</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Ort.Kasa</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver, index) => {
                const rank = index + 1;
                const isTopThree = rank <= 3;
                const textSize = rank <= 3 ? 'text-sm' : rank <= 6 ? 'text-sm' : 'text-xs';
                
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
                  <td className="py-2 px-2 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border-2 ${textColor} ${borderColor}`}>
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                    </span>
                  </td>
                    <td className={`py-2 px-2 font-medium ${isTopThree ? 'text-gray-900' : 'text-gray-700'}`}>
                      {driver.name}
                  </td>
                  <td className="py-2 px-2 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        driver.shift === 'İZİNLİ' ? 'bg-gray-100 text-gray-800' : 
                        driver.shift === 'GÜNDÜZ' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {driver.shift === 'İZİNLİ' ? '🏖️ İzinli' : driver.shift === 'GÜNDÜZ' ? '🌅 Gündüz' : '🌙 Gece'}
                          </span>
                  </td>
                    <td className="py-2 px-2 text-right text-gray-600">{driver.totalTrips || 0}</td>
                    <td className="py-2 px-2 text-right text-gray-600">{driver.totalPallets || 0}</td>
                    <td className="py-2 px-2 text-right text-gray-600">{driver.totalBoxes || 0}</td>
                    <td className="py-2 px-2 text-right text-gray-600">{driver.averagePallets}</td>
                    <td className="py-2 px-2 text-right text-gray-600">{driver.averageBoxes}</td>
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
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Sevkiyat Elemanı Performans Analizi ({personnel.length} kişi)
          </h3>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sırala:</span>
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
                <th className="text-center py-2 px-2 font-semibold text-gray-700 w-12">Sıra</th>
                <th className="text-left py-2 px-2 font-semibold text-gray-700">Personel</th>
                <th className="text-center py-2 px-2 font-semibold text-gray-700">Vardiya</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Mağaza</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Palet</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Kasa</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Ort.Palet</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-700">Ort.Kasa</th>
              </tr>
            </thead>
            <tbody>
              {personnel.map((person, index) => {
                const rank = index + 1;
                const isTopThree = rank <= 3;
                const textSize = rank <= 3 ? 'text-sm' : rank <= 6 ? 'text-sm' : 'text-xs';
                
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
                  <td className="py-2 px-2 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border-2 ${textColor} ${borderColor}`}>
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                    </span>
                  </td>
                    <td className={`py-2 px-2 font-medium ${isTopThree ? 'text-gray-900' : 'text-gray-700'}`}>
                      {person.name}
                  </td>
                  <td className="py-2 px-2 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        person.shift === 'İZİNLİ' ? 'bg-gray-100 text-gray-800' : 
                        person.shift === 'GÜNDÜZ' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {person.shift === 'İZİNLİ' ? '🏖️ İzinli' : person.shift === 'GÜNDÜZ' ? '🌅 Gündüz' : '🌙 Gece'}
                          </span>
                  </td>
                    <td className="py-2 px-2 text-right text-gray-600">{person.totalTrips || 0}</td>
                    <td className="py-2 px-2 text-right text-gray-600">{person.totalPallets || 0}</td>
                    <td className="py-2 px-2 text-right text-gray-600">{person.totalBoxes || 0}</td>
                    <td className="py-2 px-2 text-right text-gray-600">{person.averagePallets}</td>
                    <td className="py-2 px-2 text-right text-gray-600">{person.averageBoxes}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full px-2 py-8">
      <div className="mb-8">
        {/* Modern Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Performans Analizi
          </h1>
          <p className="text-lg text-gray-600 mb-6">Şoför ve personel performansını analiz edin</p>
          
          {/* Modern Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {analysisData && (
              <button
                onClick={handleExportToExcel}
                disabled={loadingPlans}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingPlans ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {loadingPlans ? 'İndiriliyor...' : 'Excel İndir'}
              </button>
            )}
            
            <label className="cursor-pointer">
              <div className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
                {loadingPlans ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span className="font-medium">
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
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            {/* Üst Bar: Başlık + Görünüm Butonları */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Filtreleme Seçenekleri</h3>
            </div>
            
                  <button
                onClick={() => {
                  const newWeeklyView = !weeklyView;
                  setWeeklyView(newWeeklyView);
                  // Haftalık görünüm aktif olduğunda tüm vardiyaları göster
                  if (newWeeklyView) {
                    setShiftFilter('all');
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  weeklyView ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {weeklyView ? '📅 Haftalık Görünüm' : '📊 Günlük Görünüm'}
                  </button>
            </div>
            
            {/* Filtreler */}
            <div className="space-y-3">
              {/* Vardiya Filtresi - Gece ve Gündüz */}
              {!weeklyView && (
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 min-w-[100px]">Vardiya Seçimi</label>
                  <div className="flex gap-2">
                    {[
                      { key: 'all', label: 'Tüm Vardiyalar', color: 'bg-blue-500' },
                      { key: 'day', label: '🌅 Gündüz', color: 'bg-yellow-500' },
                      { key: 'night', label: '🌙 Gece', color: 'bg-blue-500' }
                    ].map(({ key, label, color }) => (
                  <button
                        key={key}
                        onClick={() => setShiftFilter(key)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          shiftFilter === key ? `${color} text-white` : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                  </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tarih Seçimi */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Tarih Seçimi ({availableDates.length} gün)
                  </label>
                </div>

                {weeklyView ? (
                  // Haftalık Görünüm
                  <div className="space-y-2">
                    <div className="flex gap-2 mb-2">
                  <button
                        onClick={() => {
                          const weeks = groupDatesByWeeks(availableDates);
                          setSelectedWeeks(weeks.map(w => w.id));
                          setSelectedDates(availableDates.map(item => item.id));
                        }}
                        className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                      >
                        Tüm Haftalar
                  </button>
                      <button
                        onClick={() => {
                          setSelectedWeeks([]);
                          setSelectedDates([]);
                        }}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                      >
                        Temizle
                      </button>
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {groupDatesByWeeks(availableDates).map((week) => (
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
                                    {dateItem.shift === 'GÜNDÜZ' ? '🌅' : '🌙'} {dateItem.date}
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
                  // Günlük Görünüm
              <div>
                <div className="flex gap-2 mb-2">
                  <button
                        onClick={() => setSelectedDates(availableDates.map(item => item.id))}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                  >
                    Tümünü Seç
                  </button>
                  <button
                    onClick={() => setSelectedDates([])}
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                  >
                    Tümünü Kaldır
                  </button>
                </div>
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {availableDates.map((dateItem) => (
                          <div key={dateItem.id} className="relative">
                        <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                              selectedDates.includes(dateItem.id) ? 
                                (dateItem.shift === 'GECE' ? 'border-blue-500 bg-blue-50' : 'border-orange-500 bg-orange-50') :
                                (dateItem.shift === 'GECE' ? 'border-gray-200 bg-white hover:border-blue-300' : 'border-gray-200 bg-white hover:border-orange-300')
                        }`}>
                          <input
                            type="checkbox"
                                checked={selectedDates.includes(dateItem.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                    setSelectedDates([...selectedDates, dateItem.id]);
                              } else {
                                    setSelectedDates(selectedDates.filter(d => d !== dateItem.id));
                              }
                            }}
                                className={`w-5 h-5 rounded focus:ring-2 ${
                                  dateItem.shift === 'GECE' ? 'text-blue-600 focus:ring-blue-500' : 'text-orange-600 focus:ring-orange-500'
                                }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-900 truncate">{dateItem.date}</span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    dateItem.shift === 'GÜNDÜZ' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {dateItem.shift === 'GÜNDÜZ' ? '🌅 Gündüz' : '🌙 Gece'}
                              </span>
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                  </div>
                )}
              </div>

              {/* Seçim Özeti - Kompakt */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">📅</span>
                    <span className="text-gray-700">Seçilen: <span className="font-medium text-blue-600">{selectedDates.length}</span> / {availableDates.length} tarih</span>
                </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-600">🔄</span>
                    <span className="text-gray-700">Vardiya: <span className="font-medium text-purple-600">{shiftFilter === 'all' ? 'Tümü' : shiftFilter === 'day' ? 'Gündüz' : 'Gece'}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">{weeklyView ? '📊' : '📈'}</span>
                    <span className="text-gray-700">Görünüm: <span className="font-medium text-green-600">{weeklyView ? 'Haftalık' : 'Günlük'}</span></span>
                  </div>
                </div>
                {weeklyView && (
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-orange-600">🗓️</span>
                      <span>Seçilen Haftalar: <span className="font-medium text-orange-600">{selectedWeeks.length}</span> / {groupDatesByWeeks(availableDates).length} hafta</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Haftalık İstatistikler */}
          {weeklyView && selectedWeeks.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-800">Haftalık İstatistikler</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
                    <div key={week.id} className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
                      <div className="text-sm font-medium text-purple-800 mb-2">{week.label}</div>
                      <div className="space-y-2 text-sm">
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
                        <div className="border-t border-purple-200 pt-2 mt-2">
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


    </div>
  );
};

export default PerformanceAnalysis; 