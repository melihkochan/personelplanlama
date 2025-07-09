import React, { useState, useEffect } from 'react';
import { Upload, BarChart3, TrendingUp, Calendar, Users, Truck, Package, RotateCcw, FileText, Car, User, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const PerformanceAnalysis = ({ personnelData: propPersonnelData }) => {
  console.log('🚀 PerformanceAnalysis BAŞLADI');
  console.log('📊 propPersonnelData:', propPersonnelData);
  console.log('📊 propPersonnelData tip:', typeof propPersonnelData);
  console.log('📊 propPersonnelData uzunluk:', propPersonnelData?.length);
  
  const [analysisData, setAnalysisData] = useState(null);
  const [personnelData, setPersonnelData] = useState(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [shiftFilter, setShiftFilter] = useState('all'); // 'all', 'day', 'night', 'leave'
  const [driverSortBy, setDriverSortBy] = useState('trips'); // 'trips', 'pallets', 'boxes', 'avgPallets', 'avgBoxes'
  const [personnelSortBy, setPersonnelSortBy] = useState('trips'); // 'trips', 'pallets', 'boxes', 'avgPallets', 'avgBoxes'
  const [exportLoading, setExportLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Saat aralığından vardiya tipini belirle
  const determineShiftFromTime = (timeRange) => {
    if (!timeRange || typeof timeRange !== 'string') return 'GÜNDÜZ';
    
    const normalizedTime = timeRange.trim().toUpperCase();
    
    // Yıllık izin kontrolü
    if (normalizedTime.includes('YILLIK') || 
        normalizedTime.includes('İZİN') || 
        normalizedTime.includes('IZIN') ||
        normalizedTime.includes('ANNUAL') ||
        normalizedTime.includes('LEAVE') ||
        normalizedTime.includes('TATIL') ||
        normalizedTime.includes('OFF')) {
      return 'İZİNLİ';
    }
    
    // Gece vardiyası belirleyicileri
    if (normalizedTime.includes('22:00') || 
        normalizedTime.includes('23:00') || 
        normalizedTime.includes('00:00') ||
        normalizedTime.includes('01:00') ||
        normalizedTime.includes('02:00') ||
        normalizedTime.includes('03:00') ||
        normalizedTime.includes('04:00') ||
        normalizedTime.includes('05:00') ||
        normalizedTime.includes('06:00') ||
        normalizedTime.includes('GECE') ||
        normalizedTime.includes('NIGHT')) {
      return 'GECE';
    }
    
    // Gündüz vardiyası belirleyicileri
    if (normalizedTime.includes('08:00') || 
        normalizedTime.includes('09:00') || 
        normalizedTime.includes('10:00') ||
        normalizedTime.includes('11:00') ||
        normalizedTime.includes('12:00') ||
        normalizedTime.includes('13:00') ||
        normalizedTime.includes('14:00') ||
        normalizedTime.includes('15:00') ||
        normalizedTime.includes('16:00') ||
        normalizedTime.includes('17:00') ||
        normalizedTime.includes('18:00') ||
        normalizedTime.includes('GÜNDÜZ') ||
        normalizedTime.includes('GUNDUZ') ||
        normalizedTime.includes('DAY')) {
      return 'GÜNDÜZ';
    }
    
    // Default gündüz
    return 'GÜNDÜZ';
  };

  // Prop'dan gelen personel verilerini kontrol et
  useEffect(() => {
    if (propPersonnelData && propPersonnelData.length > 0) {
      console.log('=== PROP PERSONEL VERİSİ ALINDI ===');
      console.log('Prop personel verisi:', propPersonnelData);
      
      // FileUpload'dan gelen formatı PerformanceAnalysis formatına çevir
      const formattedData = formatPersonnelFromProp(propPersonnelData);
      console.log('Formatlanmış personel verisi:', formattedData);
      
      setPersonnelData(formattedData);
    } else {
      console.log('=== PROP PERSONEL VERİSİ YOK ===');
    }
  }, [propPersonnelData]);

  // Vardiya seçimi değiştiğinde tarihleri otomatik güncelle
  useEffect(() => {
    if (availableDates.length > 0) {
      let autoSelectedDates = [];
      
      if (shiftFilter === 'all') {
        // Tüm tarihleri seç
        autoSelectedDates = availableDates.map(d => d.date);
      } else if (shiftFilter === 'day') {
        // Sadece gündüz vardiyalarını seç
        autoSelectedDates = availableDates
          .filter(d => d.shift === 'GÜNDÜZ')
          .map(d => d.date);
      } else if (shiftFilter === 'night') {
        // Sadece gece vardiyalarını seç
        autoSelectedDates = availableDates
          .filter(d => d.shift === 'GECE')
          .map(d => d.date);
      }
      
      setSelectedDates(autoSelectedDates);
      console.log(`📅 Vardiya "${shiftFilter}" seçildi, ${autoSelectedDates.length} tarih otomatik seçildi`);
    }
  }, [shiftFilter, availableDates]);

  // FileUpload'dan gelen personel verisini PerformanceAnalysis formatına çevir
  const formatPersonnelFromProp = (propData) => {
    const results = {
      drivers: {},
      personnel: {}
    };

    console.log('=== PROP DATA FORMATLANMASI ===');
    console.log('İlk personel objesi:', propData[0]);
    console.log('Obje anahtarları:', Object.keys(propData[0] || {}));

    propData.forEach((person, index) => {
      // İsim alanını al - Excel'deki muhtemel alan isimlerini dene
      const name = person.ADI_SOYADI || 
                   person['ADI SOYADI'] ||
                   person.AD_SOYAD ||
                   person.AD || 
                   person.İSİM || 
                   person.ISIM || 
                   person.NAME || 
                   person.name || 
                   person.Ad ||
                   person.Isim ||
                   'İsimsiz';
      
      const job = person.GOREV || person.GÖREVI || person.JOB || 'Belirsiz';
      
      const shiftTime = person.VARDİYA || 
                       person.VARDIYA || 
                       person.Vardiya ||
                       person.SHIFT || 
                       'Gündüz';

      // Saat aralığından vardiya tipini çıkar
      const shift = determineShiftFromTime(shiftTime);

      console.log(`${index + 1}. Personel işleniyor: "${name}" - "${job}" - "${shiftTime}" → "${shift}"`);
      
      // Eğer isim hala İsimsiz ise objenin tüm değerlerini göster
      if (name === 'İsimsiz') {
        console.log('İsimsiz personel objesi:', person);
      }

      const personData = {
        name: name,
        job: job,
        shift: shift,
        totalTrips: 0,
        totalPallets: 0,
        totalBoxes: 0,
        averagePallets: 0,
        averageBoxes: 0,
        dayData: {}
      };

      // Yıllık izinli personeli tablolara ekleme
      if (job === 'ŞOFÖR' || job === 'SOFOR') {
        results.drivers[name] = personData;
      } else if (job === 'SEVKİYAT ELEMANI' || job === 'SEVKIYAT ELEMANI') {
        results.personnel[name] = personData;
      }
    });

    console.log(`📊 Formatlanmış sonuç: ${Object.keys(results.drivers).length} şoför, ${Object.keys(results.personnel).length} sevkiyat personeli`);
    console.log('Şoförler:', Object.keys(results.drivers));
    console.log('Sevkiyat personeli:', Object.keys(results.personnel));
    
    return results;
  };

  // Excel Export Fonksiyonu
  const handleExportToExcel = async () => {
    if (!analysisData) return;
    
    setExportLoading(true);
    
    try {
      const filteredData = getFilteredData();
      if (!filteredData) return;
      
      // Workbook oluştur
      const wb = XLSX.utils.book_new();
      
      // 1. ÖZET SHEET'İ
      const summaryData = [
        ['Performans Analizi Özeti', '', '', ''],
        ['Tarih:', new Date().toLocaleDateString('tr-TR'), '', ''],
        ['Filtre:', shiftFilter === 'all' ? 'Tüm Vardiyalar' : shiftFilter === 'day' ? 'Gündüz' : 'Gece', '', ''],
        ['', '', '', ''],
        ['Metrik', 'Değer', '', ''],
        ['Gündüz Günleri', filteredData.summary.gunduzDays, '', ''],
        ['Gece Günleri', filteredData.summary.geceDays, '', ''],
        ['Toplam Sefer', filteredData.summary.totalDeliveries, '', ''],
        ['Toplam Palet', filteredData.summary.totalPallets, '', ''],
        ['Toplam Kasa', filteredData.summary.totalBoxes, '', ''],
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Özet');
      
      // 2. ŞOFÖR SHEET'İ
      const drivers = Object.values(filteredData.drivers)
        .filter(driver => driver.totalTrips > 0)
        .sort(getSortFunction(driverSortBy));
      
      const driverData = [
        ['Şoför Adı', 'Şu anki Vardiya', 'Toplam Sefer', 'Toplam Palet', 'Toplam Kasa', 'Ortalama Palet/Sefer', 'Ortalama Kasa/Sefer']
      ];
      
      drivers.forEach(driver => {
        const shiftBadge = driver.shift === 'İZİNLİ' ? 'İzinli' : 
                          driver.shift === 'GÜNDÜZ' ? 'Gündüz' : 'Gece';
        
        driverData.push([
          driver.name,
          shiftBadge,
          driver.totalTrips,
          driver.totalPallets,
          driver.totalBoxes,
          driver.averagePallets,
          driver.averageBoxes
        ]);
      });
      
      const driverSheet = XLSX.utils.aoa_to_sheet(driverData);
      XLSX.utils.book_append_sheet(wb, driverSheet, 'Şoför Analizi');
      
      // 3. PERSONEL SHEET'İ
      const personnel = Object.values(filteredData.personnel)
        .filter(person => person.totalTrips > 0)
        .sort(getSortFunction(personnelSortBy));
      
      const personnelData = [
        ['Personel Adı', 'Şu anki Vardiya', 'Toplam Sefer', 'Toplam Palet', 'Toplam Kasa', 'Ortalama Palet/Sefer', 'Ortalama Kasa/Sefer']
      ];
      
      personnel.forEach(person => {
        const shiftBadge = person.shift === 'İZİNLİ' ? 'İzinli' : 
                          person.shift === 'GÜNDÜZ' ? 'Gündüz' : 'Gece';
        
        personnelData.push([
          person.name,
          shiftBadge,
          person.totalTrips,
          person.totalPallets,
          person.totalBoxes,
          person.averagePallets,
          person.averageBoxes
        ]);
      });
      
      const personnelSheet = XLSX.utils.aoa_to_sheet(personnelData);
      XLSX.utils.book_append_sheet(wb, personnelSheet, 'Personel Analizi');
      
      // 4. GÜNLÜK DETAY SHEET'İ (Opsiyonel)
      const dailyData = [];
      dailyData.push(['Tarih', 'Vardiya', 'Toplam Sefer', 'Toplam Palet', 'Toplam Kasa']);
      
      availableDates.forEach(dateItem => {
        if (selectedDates.includes(dateItem.date)) {
          const dailyInfo = analysisData.dailyData && analysisData.dailyData[dateItem.date];
          if (dailyInfo) {
            dailyData.push([
              dateItem.displayName,
              dateItem.shift,
              dailyInfo.uniqueStores || 0,
              dailyInfo.totalPallets || 0,
              dailyInfo.totalBoxes || 0
            ]);
          }
        }
      });
      
      const dailySheet = XLSX.utils.aoa_to_sheet(dailyData);
      XLSX.utils.book_append_sheet(wb, dailySheet, 'Günlük Detay');
      
      // Excel dosyasını indir
      const fileName = `performans_analizi_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      console.log('✅ Excel dosyası başarıyla indirildi:', fileName);
      
    } catch (error) {
      console.error('❌ Excel export hatası:', error);
      alert('Excel dosyası oluşturulurken bir hata oluştu!');
    } finally {
      setExportLoading(false);
    }
  };

  // Reset fonksiyonu
  const handleReset = () => {
    setAnalysisData(null);
    setLoadingPlans(false);
    setAvailableDates([]);
    setSelectedDates([]);
    setShiftFilter('all');
    setDriverSortBy('trips');
    setPersonnelSortBy('trips');
    setExportLoading(false);
    setUploadSuccess(false);
    
    // Prop'dan personel verisi varsa tekrar kullan
    if (propPersonnelData && propPersonnelData.length > 0) {
      const formattedData = formatPersonnelFromProp(propPersonnelData);
      setPersonnelData(formattedData);
    } else {
      setPersonnelData(null);
    }
  };

  // Excel dosyasını yükle ve analiz et
  const handlePlansUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoadingPlans(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        console.log('=== EXCEL DOSYASI OKUNDU ===');
        console.log('Tüm Sheet İsimleri:', workbook.SheetNames);
        
        // YENİ YÖNTEMİ KULLAN - processExcelData doğrudan propPersonnelData ile çalışır
        console.log('📊 PropPersonnelData mevcut:', !!propPersonnelData);
        console.log('📊 PropPersonnelData uzunluk:', propPersonnelData?.length || 0);
        
        const analysisResults = processExcelData(workbook);
        console.log('=== ANALİZ SONUÇLARI ===');
        console.log('Şoförler:', Object.keys(analysisResults.drivers));
        console.log('Sevkiyat Personeli:', Object.keys(analysisResults.personnel));
        console.log('Günlük Veriler:', Object.keys(analysisResults.dailyData));
        
        setAnalysisData(analysisResults);
        // personnelData artık prop'tan geldiği için ayrıca set etmeye gerek yok
        
        // Başarı mesajını göster
        setUploadSuccess(true);
        
        // 3 saniye sonra başarı mesajını gizle
        setTimeout(() => {
          setUploadSuccess(false);
        }, 3000);
        
      } catch (error) {
        console.error('Excel dosyası okuma hatası:', error);
        alert('Excel dosyası okuma hatası: ' + error.message);
      } finally {
        setLoadingPlans(false);
      }
    };
    
    reader.readAsBinaryString(file);
  };

  // Sadece personel verilerini çıkart
  const processPersonnelData = (workbook) => {
    const results = {
      drivers: {},
      personnel: {}
    };

    console.log('Tüm sheet isimleri detayında:', workbook.SheetNames);
    
    // PERSONEL sheet'ini bul ve işle
    let personnelSheetName = null;
    for (const sheetName of workbook.SheetNames) {
      console.log(`Sheet kontrol ediliyor: "${sheetName}"`);
      if (sheetName.toUpperCase().includes('PERSONEL') || 
          sheetName.toUpperCase().includes('PERSONAL') ||
          sheetName === 'PERSONEL' ||
          sheetName.trim() === 'PERSONEL') {
        personnelSheetName = sheetName;
        console.log(`PERSONEL sheet bulundu: "${personnelSheetName}"`);
        break;
      }
    }
    
    if (personnelSheetName) {
      console.log(`=== ${personnelSheetName} SHEET İŞLENİYOR ===`);
      const personnelSheet = workbook.Sheets[personnelSheetName];
      
      const range = XLSX.utils.decode_range(personnelSheet['!ref'] || 'A1:A1');
      console.log(`Sheet range:`, range);
      
      const personnelData = XLSX.utils.sheet_to_json(personnelSheet, { 
        header: 1,
        defval: '',
        raw: false
      });
      
      console.log(`PERSONEL sheet toplam satır: ${personnelData.length}`);
      console.log('İlk 5 satır:', personnelData.slice(0, 5));
      
      // Personel verilerini işle
      processPersonnelSheet(personnelData, results);
    } else {
      console.error('❌ PERSONEL sheet bulunamadı!');
      console.log('Mevcut sheet isimleri:');
      workbook.SheetNames.forEach((name, index) => {
        console.log(`  ${index + 1}. "${name}" (uzunluk: ${name.length})`);
      });
    }

    return results;
  };

  // Plan verilerini işle (personel listesi ile birleştir)
  const processPlansData = (workbook, personnelInfo) => {
    const results = {
      drivers: { ...personnelInfo.drivers }, // Önceki personel verilerini kopyala
      personnel: { ...personnelInfo.personnel },
      vehicles: {},
      dailyData: {},
      summary: {
        gunduzDays: 0,     // Gündüz vardiya günleri
        geceDays: 0,       // Gece vardiya günleri
        totalDeliveries: 0,
        totalPallets: 0,
        totalBoxes: 0
      }
    };

    console.log('=== GÜNLÜK PLANLAR İŞLENİYOR ===');
    console.log(`Toplam ${workbook.SheetNames.length} sheet bulundu`);
    console.log(`Mevcut personel: ${Object.keys(results.drivers).length} şoför, ${Object.keys(results.personnel).length} sevkiyat`);
    
    let processedSheets = 0;
    let skippedSheets = 0;
    const availableDatesTemp = [];
    
    workbook.SheetNames.forEach((sheetName, index) => {
      console.log(`\n🔍 Sheet ${index + 1}/${workbook.SheetNames.length}: "${sheetName}"`);
      
      // PERSONEL ve DEPODA KALAN PERSONELLER sheet'lerini atla
      if (sheetName.includes('PERSONEL') || sheetName.includes('DEPODA KALAN')) {
        console.log(`⏭️ ${sheetName} sheet atlandı (personel/depoda kalan)`);
        skippedSheets++;
        return;
      }
      
      // Sheet isminden tarihi çıkar - tek haneli gün/ay destekli
      const dateMatch = sheetName.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
      if (!dateMatch) {
        console.log(`❌ ${sheetName} tarih formatına uymuyor, atlanıyor`);
        skippedSheets++;
        return;
      }
      
      // Vardiya tipini belirle
      const isGunduz = sheetName.toUpperCase().includes('GÜNDÜZ') || sheetName.toUpperCase().includes('GUNDUZ');
      const vardiyaTipi = isGunduz ? 'GÜNDÜZ' : 'GECE';
      
      console.log(`✅ ${sheetName} → ${vardiyaTipi} vardiyası olarak işlenecek`);
      
      // Available dates'e ekle
      availableDatesTemp.push({
        date: sheetName,
        displayName: sheetName,
        shift: vardiyaTipi,
        selected: true // Başlangıçta tüm tarihler seçili
      });
      
      // Vardiya sayacını artır
      if (isGunduz) {
        results.summary.gunduzDays++;
      } else {
        results.summary.geceDays++;
      }

      const sheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      console.log(`📊 ${sheetName} - ${sheetData.length} satır bulundu`);
      
      // Her sheet için ayrı işlem yap
      processSheetDataDetailed(sheetData, sheetName, results, index);
      processedSheets++;
    });
    
    console.log(`\n📊 GÜNLÜK PLAN İŞLEME SONUÇLARI:`);
    console.log(`✅ İşlenen sheet: ${processedSheets}`);
    console.log(`⏭️ Atlanan sheet: ${skippedSheets}`);
    console.log(`📄 Toplam sheet: ${workbook.SheetNames.length}`);

    // Toplam verileri hesapla
    calculateSummaryDetailed(results);
    
    // Available dates'i güncelle
    setAvailableDates(availableDatesTemp);
    setSelectedDates(availableDatesTemp.map(d => d.date));
    
    // Son durum raporu
    console.log(`\n🎯 FINAL RAPOR:`);
    console.log(`🚚 Aktif şoförler: ${Object.values(results.drivers).filter(d => d.totalTrips > 0).length}/${Object.keys(results.drivers).length}`);
    console.log(`👷 Aktif personeller: ${Object.values(results.personnel).filter(p => p.totalTrips > 0).length}/${Object.keys(results.personnel).length}`);
    
    return results;
  };

  // ESKİ FONKSİYON - artık kullanılmıyor ama silmiyorum
  const processExcelData = (workbook) => {
    const results = {
      drivers: {},
      personnel: {},
      vehicles: {},
      dailyData: {},
      summary: {
        totalDays: 0,
        totalDeliveries: 0,
        totalPallets: 0,
        totalBoxes: 0
      }
    };

    console.log('Available sheets:', workbook.SheetNames);

    // PERSONEL LİSTESİNİ PROPTAN AL - Excel'den okumaya gerek yok!
    console.log('=== PERSONEL LİSTESİ PROPTAN ALINIYOR ===');
    console.log('🔍 propPersonnelData tipi:', typeof propPersonnelData);
    console.log('🔍 propPersonnelData içeriği:', propPersonnelData);
    console.log('🔍 propPersonnelData uzunluğu:', propPersonnelData?.length || 'undefined');
    
    if (propPersonnelData && propPersonnelData.length > 0) {
      console.log(`✅ Proptan ${propPersonnelData.length} personel bulundu`);
      
      // İlk 5 personeli detaylı kontrol et
      console.log('🔍 İLK 5 PERSONEL DETAYLI:');
      for (let i = 0; i < Math.min(5, propPersonnelData.length); i++) {
        const person = propPersonnelData[i];
        console.log(`${i + 1}. Personel:`, person);
        console.log(`   Object keys:`, Object.keys(person || {}));
        // Excel format kontrolü
        console.log(`   ADI SOYADI: "${person?.['ADI SOYADI'] || 'YOK'}"`, typeof person?.['ADI SOYADI']);
        console.log(`   GOREV: "${person?.GOREV || 'YOK'}"`, typeof person?.GOREV);
        console.log(`   Vardiya: "${person?.Vardiya || 'YOK'}"`, typeof person?.Vardiya);
      }
      
      // Personel listesini hazırla - EXCEL FORMAT ILE ÇALIŞIR
      propPersonnelData.forEach((person, index) => {
        console.log(`\n🔍 ${index + 1}. PERSONEL İŞLENİYOR:`, person);
        
        // Excel formatından veri çek
        const name = person['ADI SOYADI'] || person.name || '';
        const job = person.GOREV || person.job || '';
        const vardiya = person.Vardiya || person.shift || '';
        
        if (!name || !job) {
          console.log(`❌ Eksik veri (name:"${name}", job:"${job}"), atlanıyor`);
          return;
        }
        
        // Vardiya bilgisini işle
        const shiftType = determineShiftFromTime(vardiya);
        
        const jobUpper = job.toUpperCase();
        console.log(`   İsim: "${name}"`);
        console.log(`   İş: "${job}" → "${jobUpper}"`);
        console.log(`   Vardiya: "${vardiya}" → "${shiftType}"`);
        
        // ŞOFÖR TESPİTİ - DAHA ESNEKLEŞTİRİLDİ
        if (jobUpper.includes('ŞOFÖR') || 
            jobUpper.includes('SOFÖR') || 
            jobUpper.includes('SHOFÖR') ||
            jobUpper.includes('SOFOR') ||
            jobUpper.includes('DRIVER') ||
            jobUpper === 'ŞOFÖR' ||
            jobUpper === 'SOFÖR') {
          console.log(`✅ ${name} ŞOFÖR olarak eklendi (İş: "${job}")`);
          results.drivers[name] = {
            name: name,
            job: job,
            shift: shiftType,
            totalTrips: 0,
            totalPallets: 0,
            totalBoxes: 0,
            averagePallets: 0,
            averageBoxes: 0,
            dayData: {}
          };
        // SEVKİYAT ELEMANI TESPİTİ - DAHA ESNEKLEŞTİRİLDİ
        } else if (jobUpper.includes('SEVKIYAT') || 
                   jobUpper.includes('SEVKİYAT') || 
                   jobUpper.includes('SEVKIYAT') ||
                   jobUpper.includes('ELEMANI') ||
                   jobUpper.includes('ELEMANI') ||
                   jobUpper.includes('PERSONEL') ||
                   jobUpper.includes('WORKER') ||
                   jobUpper === 'SEVKİYAT ELEMANI' ||
                   jobUpper === 'SEVKIYAT ELEMANI') {
          console.log(`✅ ${name} SEVKIYAT ELEMANI olarak eklendi (İş: "${job}")`);
          results.personnel[name] = {
            name: name,
            job: job,
            shift: shiftType,
            totalTrips: 0,
            totalPallets: 0,
            totalBoxes: 0,
            averagePallets: 0,
            averageBoxes: 0,
            dayData: {}
          };
        } else {
          console.log(`❌ ${name} bilinmeyen iş: "${job}"`);
          console.log(`   Aranılan: ŞOFÖR, SOFÖR, SEVKIYAT ELEMANI, SEVKİYAT ELEMANI`);
          console.log(`   Bulunan: "${jobUpper}"`);
        }
      });
      
      console.log(`📊 SONUÇ: ${Object.keys(results.drivers).length} şoför, ${Object.keys(results.personnel).length} sevkiyat elemanı`);
      console.log(`📊 ŞOFÖR LİSTESİ:`, Object.keys(results.drivers));
      console.log(`📊 SEVKIYAT LİSTESİ:`, Object.keys(results.personnel));
      
    } else {
      console.error('❌ Proptan personel verisi bulunamadı!');
      console.log('propPersonnelData:', propPersonnelData);
      console.log('propPersonnelData type:', typeof propPersonnelData);
      console.log('propPersonnelData length:', propPersonnelData?.length);
    }

    // Her sheet'i işle (günlük planlar)
    console.log('=== GÜNLÜK PLANLAR İŞLENİYOR ===');
    console.log(`Toplam ${workbook.SheetNames.length} sheet bulundu`);
    
    let processedSheets = 0;
    let skippedSheets = 0;
    
    workbook.SheetNames.forEach((sheetName, index) => {
      console.log(`\n🔍 Sheet ${index + 1}/${workbook.SheetNames.length}: "${sheetName}"`);
      
      // PERSONEL ve DEPODA KALAN PERSONELLER sheet'lerini atla
      if (sheetName.includes('PERSONEL') || sheetName.includes('DEPODA KALAN')) {
        console.log(`⏭️ ${sheetName} sheet atlandı (personel/depoda kalan)`);
        skippedSheets++;
        return;
      }
      
      // Sheet isminden tarihi çıkar - tek haneli gün/ay destekli
      const dateMatch = sheetName.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
      if (!dateMatch) {
        console.log(`❌ ${sheetName} tarih formatına uymuyor, atlanıyor`);
        return;
      }
      
      console.log(`✅ ${sheetName} tarih formatına uyuyor, işlenecek`);

      console.log(`${sheetName} işlenecek`);
      const sheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      console.log(`${sheetName} ham verisi:`, sheetData.slice(0, 3));
      
      // YENİ DETAYLI SHEET VERİLERİNİ ANALİZ ET
      const processResult = processSheetDataDetailed(sheetData, sheetName, results, index);
      console.log(`📊 ${sheetName} işlem sonucu:`, processResult);
      processedSheets++;
    });
    
    console.log(`\n📊 GÜNLÜK PLAN İŞLEME SONUÇLARI:`);
    console.log(`✅ İşlenen sheet: ${processedSheets}`);
    console.log(`⏭️ Atlanan sheet: ${skippedSheets}`);
    console.log(`📄 Toplam sheet: ${workbook.SheetNames.length}`);

    // YENİ DETAYLI TOPLAM VERİLERİ HESAPLA
    calculateSummaryDetailed(results);
    
    console.log('\n🎯 FINAL SONUÇ:', {
      drivers: Object.keys(results.drivers).length,
      personnel: Object.keys(results.personnel).length,
      processedSheets
    });
    
    // Birkaç örnek şoför ve personel verisi göster
    const sampleDrivers = Object.entries(results.drivers).slice(0, 3);
    const samplePersonnel = Object.entries(results.personnel).slice(0, 3);
    console.log('📝 Örnek şoför verileri:', sampleDrivers.map(([name, data]) => ({
      name, trips: data.totalTrips, pallets: data.totalPallets, boxes: data.totalBoxes
    })));
    console.log('📝 Örnek personel verileri:', samplePersonnel.map(([name, data]) => ({
      name, trips: data.totalTrips, pallets: data.totalPallets, boxes: data.totalBoxes
    })));
    
    // AVAILABLE DATES GÜNCELLEMESİ - Sheet isimlerini tarihlere çevir
    const newAvailableDates = Object.keys(results.dailyData || {}).map(dateKey => {
      const dayData = results.dailyData[dateKey];
      return {
        date: dateKey,
        displayName: dateKey, // Sheet ismini göster
        shift: dayData.shift,
        pallets: dayData.totalPallets,
        boxes: dayData.totalBoxes,
        selected: true
      };
    });
    
    console.log('📅 Güncellenmiş tarihleri:', newAvailableDates);
    console.log('📅 Toplam tarih sayısı:', newAvailableDates.length);
    
    setAvailableDates(newAvailableDates);
    
    // TÜM TARİHLERİ SEÇİLİ YAP
    const allDates = newAvailableDates.map(d => d.date);
    setSelectedDates(allDates);
    
    console.log('📅 Seçili tarihler:', allDates);
    
    return results;
  };

  const processPersonnelSheet = (personnelData, results) => {
    console.log('=== PERSONEL SHEET İŞLENİYOR ===');
    console.log('PERSONEL sheet ham verisi:', personnelData);
    console.log('PERSONEL sheet satır sayısı:', personnelData.length);
    
    // İlk 10 satırı detaylı göster
    console.log('\n📋 İLK 10 SATIRON DETAYLI GÖRÜNÜMÜ:');
    for (let i = 0; i < Math.min(10, personnelData.length); i++) {
      console.log(`Satır ${i}: [${personnelData[i]?.length || 0} sütun]`, personnelData[i]);
    }
    
    // PERSONEL sheet'inden personel ve araç verilerini çek
    personnelData.forEach((row, index) => {
      if (index === 0) {
        console.log('\n📋 HEADER SATIRI DETAYLI ANALİZ:');
        console.log('Header satırı:', row);
        if (row && Array.isArray(row)) {
          row.forEach((cell, colIndex) => {
            console.log(`  Sütun ${colIndex} (${String.fromCharCode(65 + colIndex)}): "${cell}"`);
          });
        }
        return; // Header satırını atla
      }
      
      // Excel'den gelen veriler - sütun kontrolü yapalım
      const kolonA = (row[0] || '').toString().trim();
      const kolonB = (row[1] || '').toString().trim(); 
      const kolonC = (row[2] || '').toString().trim(); // ADI SOYADI olmalı
      const kolonD = (row[3] || '').toString().trim(); // GÖREV olmalı
      const kolonE = (row[4] || '').toString().trim(); // Vardiya olmalı
      
      // Hangi kolonda ne var görelim
      if (index <= 5) {
        console.log(`\n📋 Satır ${index} DETAYLI ANALİZ:`);
        console.log(`   Ham row (${row?.length || 0} sütun):`, row);
        console.log(`   A(0): "${kolonA}"`);
        console.log(`   B(1): "${kolonB}"`);
        console.log(`   C(2): "${kolonC}" ← ADI SOYADI`);
        console.log(`   D(3): "${kolonD}" ← GÖREV`);
        console.log(`   E(4): "${kolonE}" ← VARDİYA`);
      }
      
      // ADI SOYADI ve GÖREV sütunlarını bul
      let adSoyad = '';
      let gorev = '';
      let vardiya = '';
      
      // Muhtemel sütun kombinasyonları dene
      if (kolonC && kolonD) {
        // C=ADI SOYADI, D=GÖREV
        adSoyad = kolonC;
        gorev = kolonD;
        vardiya = kolonE;
      } else if (kolonB && kolonC) {
        // B=ADI SOYADI, C=GÖREV  
        adSoyad = kolonB;
        gorev = kolonC;
        vardiya = kolonD;
      } else if (kolonA && kolonB) {
        // A=ADI SOYADI, B=GÖREV
        adSoyad = kolonA;
        gorev = kolonB;
        vardiya = kolonC;
      }
      
      // Vardiya bilgisini saat aralığından çıkar
      const shiftType = determineShiftFromTime(vardiya);
      
      if (index < 5) {
        console.log(`${index}. Personel:`, { adSoyad, gorev, vardiya, shiftType });
      }
      
      if (!adSoyad || adSoyad.length < 3) {
        if (index < 5) console.log('Geçersiz ad soyad, atlanıyor');
        return;
      }
      
      // Şoför veya sevkiyat personeli olarak kaydet - esnek kontrol
      const gorevUpper = gorev.toUpperCase();
      
      console.log(`\n🔍 ${adSoyad} GÖREV ANALİZİ:`);
      console.log(`   Görev: "${gorev}" → Upper: "${gorevUpper}"`);
      console.log(`   Vardiya: "${vardiya}" → Shift: "${shiftType}"`);
      
      if (gorevUpper.includes('ŞOFÖR') || gorevUpper.includes('SOFÖR') || gorevUpper.includes('SOFOR')) {
        console.log(`✅ ${adSoyad} şoför olarak eklendi (Görev: "${gorev}", Vardiya: "${shiftType}")`);
        results.drivers[adSoyad] = {
          name: adSoyad,
          job: gorev,
          shift: shiftType,
          totalTrips: 0,
          totalPallets: 0,
          totalBoxes: 0,
          averagePallets: 0,
          averageBoxes: 0,
          dayData: {}
        };
      } else if (gorevUpper.includes('SEVKIYAT') || gorevUpper.includes('SEVKİYAT') || gorevUpper.includes('ELEMANI')) {
        console.log(`✅ ${adSoyad} sevkiyat personeli olarak eklendi (Görev: "${gorev}", Vardiya: "${shiftType}")`);
        results.personnel[adSoyad] = {
          name: adSoyad,
          job: gorev,
          shift: shiftType,
          totalTrips: 0,
          totalPallets: 0,
          totalBoxes: 0,
          averagePallets: 0,
          averageBoxes: 0,
          dayData: {}
        };
      } else {
        if (index < 10) console.log(`❌ ${adSoyad} tanımlanamadı. Görev: "${gorev}" (Büyük harf: "${gorevUpper}")`);
      }
    });

    console.log('=== PERSONEL SHEET SONUÇLARI ===');
    console.log('✅ Bulunan şoförler:', Object.keys(results.drivers));
    console.log('✅ Bulunan sevkiyat personeli:', Object.keys(results.personnel));
    console.log(`📊 Toplam ${Object.keys(results.drivers).length} şoför, ${Object.keys(results.personnel).length} sevkiyat personeli`);
  };

  // LEVENSHTEIN DISTANCE - Karakter farkı hesapla
  const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;
    
    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[len2][len1];
  };

  // İSİM EŞLEŞTIRME FONKSİYONU - Genel kullanım için
  const findMatchingPerson = (searchName, personList) => {
    if (!searchName || !personList) return null;
    
    console.log(`🔍 "${searchName}" için eşleştirme aranıyor...`);
    console.log(`📋 Mevcut personel listesi (${Object.keys(personList).length}):`, Object.keys(personList));
    
    // Tam eşleşme
    if (personList[searchName]) {
      console.log(`✅ TAM EŞLEŞME: "${searchName}" → "${searchName}"`);
      return searchName;
    }
    
    // Güçlü normalizasyon - Türkçe karakterleri de düzelt
    const normalizeText = (text) => {
      return text.toUpperCase()
        .trim()
        .replace(/Ğ/g, 'G')
        .replace(/Ü/g, 'U')
        .replace(/Ş/g, 'S')
        .replace(/İ/g, 'I')
        .replace(/Ö/g, 'O')
        .replace(/Ç/g, 'C')
        .replace(/[^A-Z0-9\s]/g, '') // Özel karakterleri kaldır
        .replace(/\s+/g, ' '); // Çoklu boşlukları tek boşluk yap
    };
    
    const normalizedSearch = normalizeText(searchName);
    
    // Önce tam eşleşmeyi dene
    for (const personName in personList) {
      const normalizedPerson = normalizeText(personName);
      
      // Tam eşleşme
      if (normalizedPerson === normalizedSearch) {
        console.log(`✅ TAM EŞLEŞME: "${searchName}" → "${personName}"`);
        return personName;
      }
    }
    
    // Sonra kısmi eşleşmeleri dene
    for (const personName in personList) {
      const normalizedPerson = normalizeText(personName);
      
      // Kısmi eşleşme - her iki yönde de
      if (normalizedPerson.includes(normalizedSearch) || normalizedSearch.includes(normalizedPerson)) {
        console.log(`✅ KISMEN EŞLEŞME: "${searchName}" → "${personName}"`);
        return personName;
      }
    }
    
    // En son kelime bazlı eşleşme
    const searchWords = normalizedSearch.split(/\s+/).filter(word => word.length >= 2);
    
    for (const personName in personList) {
      const normalizedPerson = normalizeText(personName);
      const personWords = normalizedPerson.split(/\s+/).filter(word => word.length >= 2);
      
      let matchCount = 0;
      
      // Her kelime için eşleşme ara
      searchWords.forEach(searchWord => {
        if (personWords.some(personWord => {
          // Exact match
          if (personWord === searchWord) return true;
          
          // Contains match
          if (personWord.includes(searchWord) || searchWord.includes(personWord)) return true;
          
          // Levenshtein distance
          if (levenshteinDistance(searchWord, personWord) <= 1) return true;
          
          return false;
        })) {
          matchCount++;
        }
      });
      
      // En az 2 kelime eşleşiyorsa veya tek kelime tam eşleşiyorsa kabul et
      if ((matchCount >= 2 && searchWords.length >= 2) || 
          (matchCount >= 1 && searchWords.length === 1)) {
        console.log(`✅ KELİME EŞLEŞME: "${searchName}" → "${personName}" (${matchCount}/${searchWords.length} kelime)`);
        return personName;
      }
    }
    
    console.log(`❌ EŞLEŞME BULUNAMADI: "${searchName}"`);
    console.log(`📝 Aranılan kelimeler: [${searchWords.join(', ')}]`);
    console.log(`📋 Mevcut personel listesi TAM:`, Object.keys(personList));
    
    // ÖNERİ: Benzer isimler var mı kontrol et
    const suggestions = Object.keys(personList).filter(name => {
      const nameLower = name.toLowerCase();
      const searchLower = searchName.toLowerCase();
      return nameLower.includes(searchLower.split(' ')[0]) || searchLower.includes(nameLower.split(' ')[0]);
    });
    
    if (suggestions.length > 0) {
      console.log(`💡 Benzer isimler bulundu:`, suggestions);
    }
    
    return null;
  };

    // YENİ DETAYLI SHEET PROCESSING FONKSİYONU
    const processSheetDataDetailed = (sheetData, sheetName, results, sheetIndex) => {
      console.log(`\n🔍 === ${sheetName} İŞLENİYOR (${sheetIndex + 1}. sheet) ===`);
      
      let processedRows = 0;
      let skippedRows = 0;
      let foundDrivers = new Set();
      let foundPersonnel = new Set();
      
      // MAĞAZA KODU BAZLI SEFER TAKİBİ - Her mağaza kodu sadece 1 sefer
      const storeProcessed = new Set(); // İşlenmiş mağaza kodları
      const storeData = {}; // Mağaza kodu → {şoför, personeller, palet, kasa}
      
      console.log(`\n📊 Sheet işleme başlıyor: ${sheetData.length} toplam satır`);
      
      for (let rowIndex = 1; rowIndex < sheetData.length; rowIndex++) {
        const row = sheetData[rowIndex];
        
        // Satır kontrolü
        if (!row || !Array.isArray(row) || row.length < 16) {
          skippedRows++;
          if (rowIndex <= 10) console.log(`⏭️ Satır ${rowIndex}: Çok kısa (${row?.length || 0} sütun), atlanıyor`);
          continue;
        }
        
        try {
          // Sütun verileri - EXCEL SÜTUNLARI: H=Palet, L=Kasa, N=Şoför, O=Personel1, P=Personel2
          const magazaKodu = (row[4] || '').toString().trim();  // E sütunu: Mağaza kodu
          const palet = parseInt(row[7]) || 0;     // H sütunu: Palet
          const kasa = parseInt(row[11]) || 0;     // L sütunu: Kasa  
          const plaka = (row[12] || '').toString().trim(); // M sütunu: Plaka
          const sofor = (row[13] || '').toString().trim(); // N sütunu: Şoför
          const personel1 = (row[14] || '').toString().trim(); // O sütunu: Personel 1
          const personel2 = (row[15] || '').toString().trim(); // P sütunu: Personel 2
          
          // İlk 5 satır için DETAYLI log
          if (rowIndex <= 5) {
            console.log(`\n📋 DETAYLI Satır ${rowIndex}:`);
            console.log(`   Ham satır (${row.length} sütun):`, row);
            console.log(`   E(${4}): Mağaza="${magazaKodu}"`);
            console.log(`   H(${7}): Palet="${row[7]}" → ${palet}`);
            console.log(`   L(${11}): Kasa="${row[11]}" → ${kasa}`);
            console.log(`   M(${12}): Plaka="${plaka}"`);
            console.log(`   N(${13}): Şoför="${sofor}"`);
            console.log(`   O(${14}): Personel1="${personel1}"`);
            console.log(`   P(${15}): Personel2="${personel2}"`);
          }
          
          // Mağaza kodu kontrolü
          if (!magazaKodu || magazaKodu === '') {
            skippedRows++;
            continue;
          }
          
          // Şoför kontrolü (önemli!)
          if (!sofor || sofor === '') {
            skippedRows++;
            continue;
          }
          
                    // Mağaza kodu bazında veri topla
          if (!storeData[magazaKodu]) {
            storeData[magazaKodu] = {
              drivers: new Set(),
              personnel: new Set(),
              totalPallets: 0,
              totalBoxes: 0
            };
          }
          
          // Şoför ekle
          if (sofor && sofor !== '') {
            storeData[magazaKodu].drivers.add(sofor);
          }
          
          // Personel ekle
          [personel1, personel2].forEach((personelName, index) => {
            if (personelName && personelName !== '') {
              storeData[magazaKodu].personnel.add(personelName);
            }
          });
          
          // Palet ve kasa topla
          storeData[magazaKodu].totalPallets += palet;
          storeData[magazaKodu].totalBoxes += kasa;
          
          processedRows++;
          
        } catch (error) {
          console.error(`Satır ${rowIndex} işlenirken hata:`, error);
          skippedRows++;
        }
      }
      
      // MAĞAZA BAZINDA VERİLERİ İŞLE - HER MAĞAZA SADECE 1 SEFER
      console.log(`\n🏪 Mağaza bazında veri işleme başlıyor...`);
      console.log(`📊 Toplam ${Object.keys(storeData).length} mağaza bulundu`);
      
      // TÜM ŞOFÖR VE PERSONEL LİSTESİ
      const allDriversInSheet = new Set();
      const allPersonnelInSheet = new Set();
      
      Object.entries(storeData).forEach(([magazaKodu, storeInfo]) => {
        storeInfo.drivers.forEach(driver => allDriversInSheet.add(driver));
        storeInfo.personnel.forEach(personnel => allPersonnelInSheet.add(personnel));
      });
      
      console.log(`\n👥 SHEET'TE BULUNAN ŞOFÖRLER (${allDriversInSheet.size} adet):`, Array.from(allDriversInSheet));
      console.log(`👥 SHEET'TE BULUNAN PERSONELLER (${allPersonnelInSheet.size} adet):`, Array.from(allPersonnelInSheet));
      console.log(`📋 PERSONEL LİSTESİNDEKİ ŞOFÖRLER (${Object.keys(results.drivers).length} adet):`, Object.keys(results.drivers));
      console.log(`📋 PERSONEL LİSTESİNDEKİ PERSONELLER (${Object.keys(results.personnel).length} adet):`, Object.keys(results.personnel));
      
      console.log(`\n🔍 MAĞAZA DETAYLARI (${Object.keys(storeData).length} adet):`);
      
      // İlk 3 mağazanın detayını göster
      const storeEntries = Object.entries(storeData);
      for (let i = 0; i < Math.min(3, storeEntries.length); i++) {
        const [magazaKodu, storeInfo] = storeEntries[i];
        console.log(`🏪 ${magazaKodu}: Şoförler=[${Array.from(storeInfo.drivers).join(',')}], Personel=[${Array.from(storeInfo.personnel).join(',')}], Palet=${storeInfo.totalPallets}, Kasa=${storeInfo.totalBoxes}`);
      }
      
      Object.entries(storeData).forEach(([magazaKodu, storeInfo]) => {
        
        // Her mağaza için SADECE 1 SEFER say
        // Ama palet/kasa herkese paylaştır
        
        // Şoförleri işle
        storeInfo.drivers.forEach(driverName => {
          
          console.log(`\n🔍 ŞOFÖR EŞLEŞTIRME ARANIYOR: "${driverName}"`);
          console.log(`📋 Personel listesindeki şoförler:`, Object.keys(results.drivers));
          
          const matchedDriver = findMatchingPerson(driverName, results.drivers);
          console.log(`✅ Eşleştirme sonucu: "${driverName}" → "${matchedDriver}"`);
          
          if (matchedDriver) {
            // Günlük veri yapısını hazırla - GERÇEK SHEET İSMİNİ KULLAN
            if (!results.drivers[matchedDriver].dayData) {
              results.drivers[matchedDriver].dayData = {};
            }
            if (!results.drivers[matchedDriver].dayData[sheetName]) {
              results.drivers[matchedDriver].dayData[sheetName] = {
                trips: 0,
                pallets: 0,
                boxes: 0,
                stores: []
              };
            }
            
            // Sadece 1 sefer ekle
            results.drivers[matchedDriver].totalTrips++;
            results.drivers[matchedDriver].dayData[sheetName].trips++;
            results.drivers[matchedDriver].dayData[sheetName].stores.push(magazaKodu);
            
            // Palet ve kasa ekle
            results.drivers[matchedDriver].totalPallets += storeInfo.totalPallets;
            results.drivers[matchedDriver].totalBoxes += storeInfo.totalBoxes;
            results.drivers[matchedDriver].dayData[sheetName].pallets += storeInfo.totalPallets;
            results.drivers[matchedDriver].dayData[sheetName].boxes += storeInfo.totalBoxes;
            
            console.log(`💾 ${matchedDriver} VERİ GÜNCELLENDİ:`);
            console.log(`   Mağaza: ${magazaKodu}, Palet: +${storeInfo.totalPallets}, Kasa: +${storeInfo.totalBoxes}`);
            console.log(`   Toplam sefer: ${results.drivers[matchedDriver].totalTrips}, Toplam palet: ${results.drivers[matchedDriver].totalPallets}, Toplam kasa: ${results.drivers[matchedDriver].totalBoxes}`);
            
            foundDrivers.add(matchedDriver);
          }
        });
        
        // Personelleri işle
        storeInfo.personnel.forEach(personnelName => {
          
          console.log(`\n🔍 PERSONEL EŞLEŞTIRME ARANIYOR: "${personnelName}"`);
          console.log(`📋 Personel listesindeki sevkiyat elemanları:`, Object.keys(results.personnel));
          
          const matchedPersonnel = findMatchingPerson(personnelName, results.personnel);
          console.log(`✅ Eşleştirme sonucu: "${personnelName}" → "${matchedPersonnel}"`);
          
          if (matchedPersonnel) {
            // Günlük veri yapısını hazırla
            // Personel günlük veri yapısını hazırla - GERÇEK SHEET İSMİNİ KULLAN
            if (!results.personnel[matchedPersonnel].dayData) {
              results.personnel[matchedPersonnel].dayData = {};
            }
            if (!results.personnel[matchedPersonnel].dayData[sheetName]) {
              results.personnel[matchedPersonnel].dayData[sheetName] = {
                trips: 0,
                pallets: 0,
                boxes: 0,
                stores: []
              };
            }
            
            // Sadece 1 sefer ekle
            results.personnel[matchedPersonnel].totalTrips++;
            results.personnel[matchedPersonnel].dayData[sheetName].trips++;
            results.personnel[matchedPersonnel].dayData[sheetName].stores.push(magazaKodu);
            
            // Palet ve kasa ekle
            results.personnel[matchedPersonnel].totalPallets += storeInfo.totalPallets;
            results.personnel[matchedPersonnel].totalBoxes += storeInfo.totalBoxes;
            results.personnel[matchedPersonnel].dayData[sheetName].pallets += storeInfo.totalPallets;
            results.personnel[matchedPersonnel].dayData[sheetName].boxes += storeInfo.totalBoxes;
            
            console.log(`💾 ${matchedPersonnel} VERİ GÜNCELLENDİ:`);
            console.log(`   Mağaza: ${magazaKodu}, Palet: +${storeInfo.totalPallets}, Kasa: +${storeInfo.totalBoxes}`);
            console.log(`   Toplam sefer: ${results.personnel[matchedPersonnel].totalTrips}, Toplam palet: ${results.personnel[matchedPersonnel].totalPallets}, Toplam kasa: ${results.personnel[matchedPersonnel].totalBoxes}`);
            
            foundPersonnel.add(matchedPersonnel);
          } else {
            console.log(`❌ PERSONEL EŞLEŞME BAŞARISIZ: "${personnelName}"`);
            console.log(`📋 Mevcut personel listesi:`, Object.keys(results.personnel));
            
            // Benzer isimler ara
            const possibleMatches = Object.keys(results.personnel).filter(name => 
              name.toLowerCase().includes(personnelName.toLowerCase()) ||
              personnelName.toLowerCase().includes(name.toLowerCase())
            );
            if (possibleMatches.length > 0) {
              console.log(`🔍 Benzer isimler bulundu:`, possibleMatches);
            }
          }
        });
      });
      
      // GÜNLÜKVERİ YAPISI OLUŞTUR - GERÇEK SHEET İSMİNİ KULLAN
      const isGunduz = sheetName.toUpperCase().includes('GÜNDÜZ') || sheetName.toUpperCase().includes('GUNDUZ');
      const vardiyaTipi = isGunduz ? 'GÜNDÜZ' : 'GECE';
      
      console.log(`📅 Sheet: "${sheetName}" → Vardiya: "${vardiyaTipi}" (GÜNDÜZ kelimesi var mı: ${isGunduz})`);
      
      // GERÇEK SHEET İSMİNİ KULLAN, uydurma!
      const actualSheetName = sheetName; // Gerçek sheet ismini kullan
      
      // Günlük veri yapısı oluştur
      if (!results.dailyData) results.dailyData = {};
      if (!results.dailyData[actualSheetName]) {
        results.dailyData[actualSheetName] = {
          shift: vardiyaTipi,
          totalPallets: 0,
          totalBoxes: 0,
          uniqueStores: Object.keys(storeData).length
        };
      }
      
      // Günlük toplam palet ve kasa hesapla
      Object.values(storeData).forEach(storeInfo => {
        results.dailyData[actualSheetName].totalPallets += storeInfo.totalPallets;
        results.dailyData[actualSheetName].totalBoxes += storeInfo.totalBoxes;
      });
      
      console.log(`📅 "${actualSheetName}" günlük verisi oluşturuldu:`, results.dailyData[actualSheetName]);
      
      console.log(`\n📊 ${sheetName} ÖZET:`);
      console.log(`✅ İşlenen satır: ${processedRows}`);
      console.log(`⏭️ Atlanan satır: ${skippedRows}`);
      console.log(`🚗 Bulunan şoförler: ${foundDrivers.size} (${Array.from(foundDrivers).join(', ')})`);
      console.log(`👥 Bulunan personel: ${foundPersonnel.size} (${Array.from(foundPersonnel).join(', ')})`);
      console.log(`🏪 Unique mağaza sayısı: ${Object.keys(storeData).length}`);
      console.log(`📋 Mağaza kodları: ${Object.keys(storeData).join(', ')}`);
      
      return { processedRows, skippedRows, foundDrivers: foundDrivers.size, foundPersonnel: foundPersonnel.size };
    };

    // ESKİ FONKSİYON - artık kullanılmıyor ama silmiyorum
    const processSheetData = (sheetData, sheetName, results) => {
    // Sheet isminden tarihi ve vardiya tipini çıkar
    const isGunduz = sheetName.includes('GÜNDÜZ');
    const dateMatch = sheetName.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (!dateMatch) return;
    
    const date = `${dateMatch[1]}.${dateMatch[2]}.${dateMatch[3]}`;
    const vardiyaTipi = isGunduz ? 'GÜNDÜZ' : 'GECE';
    const fullDate = `${date} ${vardiyaTipi}`;
    
    results.dailyData[fullDate] = {
      totalPallets: 0,
      totalBoxes: 0,
      vehicles: [],
      drivers: [],
      personnel: []
    };

    console.log(`=== ${fullDate} İŞLENİYOR ===`);
    console.log(`Toplam ${sheetData.length} satır bulundu`);

    // Veri satırlarını işle
    sheetData.forEach((row, index) => {
      if (index === 0) {
        console.log(`Header satırı:`, row);
        return; // Header satırını atla
      }
      
      // Satır kontrolü - boş veya çok kısa satırları atla
      if (!row || !Array.isArray(row) || row.length < 16) {
        if (index < 5) console.log(`Satır ${index} atlandı: çok kısa veya boş (uzunluk: ${row?.length || 0})`);
        return;
      }
      
      try {
        // KULLANICININ BELİRTTİĞİ SÜTUN İNDEKSLERİ (0-indexed) - güvenli erişim
        const palet = parseInt(row[7]) || 0;               // H sütunu (7): Palet sayısı
        const kasa = parseInt(row[11]) || 0;               // L sütunu (11): Kasa sayısı
        const plaka = (row[12] || '').toString().trim();   // M sütunu (12): Plaka
        const sofor = (row[13] || '').toString().trim();   // N sütunu (13): Şoför adı
        const personel1 = (row[14] || '').toString().trim(); // O sütunu (14): Sevkiyat personeli 1
        const personel2 = (row[15] || '').toString().trim(); // P sütunu (15): Sevkiyat personeli 2

              if (index < 5) {
          console.log(`Satır ${index}:`, { 
            plaka, sofor, 
            palet, kasa, 
            personel1, personel2,
            'ham_row': row 
          });
        }

      if (!plaka || !sofor) {
        if (index < 5) console.log(`Satır ${index} atlandı: plaka="${plaka}", sofor="${sofor}"`);
        return;
      }

      // Plaka analizi (tur sayısı için)
      const vehicleBase = plaka.replace(/-\d+$/, '');
      const turMatch = plaka.match(/-(\d+)$/);
      const turNumber = turMatch ? parseInt(turMatch[1]) : 1;

      // Şoför verilerini topla (sadece PERSONEL sheet'inden gelenler)
      if (sofor) {
        // İsim eşleştirmesi - farklı formatları dene
        let driverFound = false;
        let matchedDriverName = null;
        
        // Tam eşleşme
        if (results.drivers[sofor]) {
          driverFound = true;
          matchedDriverName = sofor;
        } else {
          // Normalize edilmiş eşleşme (büyük/küçük harf, boşluk)
          const normalizedSofor = sofor.toUpperCase().trim();
          for (const driverName in results.drivers) {
            if (driverName.toUpperCase().trim() === normalizedSofor) {
              driverFound = true;
              matchedDriverName = driverName;
              break;
            }
          }
        }
        
        if (driverFound) {
          if (index < 5) console.log(`✅ ${sofor} şoför bulundu (${matchedDriverName}), veriler ekleniyor`);
          const driver = results.drivers[matchedDriverName];
          driver.totalTrips++;
          driver.totalPallets += palet;
          driver.totalBoxes += kasa;

          // Araç bazlı istatistikler
          if (!driver.vehicles[vehicleBase]) {
            driver.vehicles[vehicleBase] = {
              trips: 0,
              pallets: 0,
              boxes: 0
            };
          }
          driver.vehicles[vehicleBase].trips++;
          driver.vehicles[vehicleBase].pallets += palet;
          driver.vehicles[vehicleBase].boxes += kasa;

          // Günlük istatistikler
          if (!driver.dailyStats[fullDate]) {
            driver.dailyStats[fullDate] = { trips: 0, pallets: 0, boxes: 0 };
          }
          driver.dailyStats[fullDate].trips++;
          driver.dailyStats[fullDate].pallets += palet;
          driver.dailyStats[fullDate].boxes += kasa;
        } else {
          console.log(`❌ ŞOFÖR BULUNAMADI: "${sofor}" (uzunluk: ${sofor.length})`);
          console.log(`📋 Mevcut şoförler:`, Object.keys(results.drivers));
        }
      }

      // Personel verilerini topla (sadece PERSONEL sheet'inden gelenler)
      [personel1, personel2].forEach((person, pIndex) => {
        if (!person || person.trim() === '') {
          if (index < 5) console.log(`Personel ${pIndex + 1} boş`);
          return;
        }

        // İsim eşleştirmesi - farklı formatları dene
        let personnelFound = false;
        let matchedPersonnelName = null;
        
        // Tam eşleşme
        if (results.personnel[person]) {
          personnelFound = true;
          matchedPersonnelName = person;
        } else {
          // Normalize edilmiş eşleşme (büyük/küçük harf, boşluk)
          const normalizedPerson = person.toUpperCase().trim();
          for (const personnelName in results.personnel) {
            if (personnelName.toUpperCase().trim() === normalizedPerson) {
              personnelFound = true;
              matchedPersonnelName = personnelName;
              break;
            }
          }
        }

        if (personnelFound) {
          if (index < 5) console.log(`✅ ${person} personel bulundu (${matchedPersonnelName}), veriler ekleniyor`);
          const personnel = results.personnel[matchedPersonnelName];
          personnel.totalTrips++;
          personnel.totalPallets += palet;
          personnel.totalBoxes += kasa;

          // Araç bazlı istatistikler
          if (!personnel.vehicles[vehicleBase]) {
            personnel.vehicles[vehicleBase] = {
              trips: 0,
              pallets: 0,
              boxes: 0
            };
          }
          personnel.vehicles[vehicleBase].trips++;
          personnel.vehicles[vehicleBase].pallets += palet;
          personnel.vehicles[vehicleBase].boxes += kasa;

          // Günlük istatistikler
          if (!personnel.dailyStats[fullDate]) {
            personnel.dailyStats[fullDate] = { trips: 0, pallets: 0, boxes: 0 };
          }
          personnel.dailyStats[fullDate].trips++;
          personnel.dailyStats[fullDate].pallets += palet;
          personnel.dailyStats[fullDate].boxes += kasa;
        } else {
          console.log(`❌ PERSONEL BULUNAMADI: "${person}" (uzunluk: ${person.length})`);
          console.log(`📋 Mevcut personeller:`, Object.keys(results.personnel));
        }
      });

      // Günlük toplam verileri
      results.dailyData[fullDate].totalPallets += palet;
      results.dailyData[fullDate].totalBoxes += kasa;
      
      } catch (error) {
        console.error(`Satır ${index} işlenirken hata:`, error);
        console.log(`Hatalı satır verisi:`, row);
        // Hata olsa bile devam et
        return;
      }
    });

    console.log(`=== ${fullDate} SONUÇLARI ===`);
    console.log(`Toplam Palet: ${results.dailyData[fullDate].totalPallets}`);
    console.log(`Toplam Kasa: ${results.dailyData[fullDate].totalBoxes}`);
    console.log(`İşlenen satır sayısı: ${sheetData.length - 1}`);

    results.summary.totalDays++;
  };

  // YENİ DETAYLI SUMMARY FONKSİYONU
  const calculateSummaryDetailed = (results) => {
    console.log(`\n🧮 SUMMARY HESAPLANIYORI...`);
    
    let totalDriverTrips = 0;
    let totalDriverPallets = 0;
    let totalDriverBoxes = 0;
    
    let totalPersonnelTrips = 0;
    let totalPersonnelPallets = 0;
    let totalPersonnelBoxes = 0;
    
    // Gündüz ve gece günlerini hesapla
    let gunduzDays = 0;
    let geceDays = 0;
    
    Object.keys(results.dailyData || {}).forEach(dateKey => {
      const dayData = results.dailyData[dateKey];
      if (dayData.shift === 'GÜNDÜZ') {
        gunduzDays++;
      } else if (dayData.shift === 'GECE') {
        geceDays++;
      }
    });
    
    // Summary'ye ekle
    results.summary.gunduzDays = gunduzDays;
    results.summary.geceDays = geceDays;
    
    // Şoförler
    Object.values(results.drivers).forEach(driver => {
      totalDriverTrips += driver.totalTrips;
      totalDriverPallets += driver.totalPallets;
      totalDriverBoxes += driver.totalBoxes;
      
      // Ortalama hesapla
      driver.averagePallets = driver.totalTrips > 0 ? 
        (driver.totalPallets / driver.totalTrips).toFixed(1) : 0;
      driver.averageBoxes = driver.totalTrips > 0 ? 
        (driver.totalBoxes / driver.totalTrips).toFixed(1) : 0;
      
      if (driver.totalTrips > 0) {
        console.log(`🚚 ${driver.name}: ${driver.totalTrips} sefer, ${driver.totalPallets} palet, ${driver.totalBoxes} kasa`);
      }
    });
    
    // Personeller
    Object.values(results.personnel).forEach(personnel => {
      totalPersonnelTrips += personnel.totalTrips;
      totalPersonnelPallets += personnel.totalPallets;
      totalPersonnelBoxes += personnel.totalBoxes;
      
      // Ortalama hesapla
      personnel.averagePallets = personnel.totalTrips > 0 ? 
        (personnel.totalPallets / personnel.totalTrips).toFixed(1) : 0;
      personnel.averageBoxes = personnel.totalTrips > 0 ? 
        (personnel.totalBoxes / personnel.totalTrips).toFixed(1) : 0;
      
      if (personnel.totalTrips > 0) {
        console.log(`👷 ${personnel.name}: ${personnel.totalTrips} sefer, ${personnel.totalPallets} palet, ${personnel.totalBoxes} kasa`);
      }
    });
    
    // Toplam summary - gündüz/gece günleri koru
    results.summary.totalDeliveries = totalDriverTrips; // Sadece şoför seferlerini say
    results.summary.totalPallets = totalDriverPallets + totalPersonnelPallets; // Tüm paletler
    results.summary.totalBoxes = totalDriverBoxes + totalPersonnelBoxes; // Tüm kasalar
    
    console.log(`\n📊 GENEL TOPLAM:`);
    console.log(`🌅 Gündüz vardiya günleri: ${results.summary.gunduzDays}`);
    console.log(`🌙 Gece vardiya günleri: ${results.summary.geceDays}`);
    console.log(`📅 Toplam gün: ${results.summary.gunduzDays + results.summary.geceDays}`);
    console.log(`🚚 Toplam şoför seferi: ${totalDriverTrips}`);
    console.log(`👷 Toplam personel seferi: ${totalPersonnelTrips}`);
    console.log(`📦 Toplam palet: ${results.summary.totalPallets}`);
    console.log(`📦 Toplam kasa: ${results.summary.totalBoxes}`);
  };

  // ESKİ FONKSİYON
  const calculateSummary = (results) => {
    Object.values(results.drivers).forEach(driver => {
      results.summary.totalDeliveries += driver.totalTrips;
      results.summary.totalPallets += driver.totalPallets;
      results.summary.totalBoxes += driver.totalBoxes;
    });
  };

  // Filtrelenmiş data'yı hesapla
  const getFilteredData = () => {
    if (!analysisData) return null;

    // DETAYLI VARDIYA FİLTRELEME DEBUG
    console.log(`\n🔍 VARDİYA FİLTRELEME BAŞLIYOR (shiftFilter: ${shiftFilter})`);
    console.log('📋 Tüm available dates:', availableDates.map(d => ({ date: d.date, shift: d.shift })));
    console.log('📋 Selected dates:', selectedDates);
    
    const filteredDateNames = availableDates
      .filter(dateItem => {
        const dateSelected = selectedDates.includes(dateItem.date);
        const shiftMatch = shiftFilter === 'all' || 
                          (shiftFilter === 'day' && dateItem.shift === 'GÜNDÜZ') ||
                          (shiftFilter === 'night' && dateItem.shift === 'GECE');
        
        console.log(`📅 ${dateItem.date}: dateSelected=${dateSelected}, shift="${dateItem.shift}", shiftMatch=${shiftMatch}, RESULT=${dateSelected && shiftMatch}`);
        
        return dateSelected && shiftMatch;
      })
      .map(dateItem => dateItem.date);

    console.log(`✅ Filtrelenmiş tarihler (${filteredDateNames.length} adet):`, filteredDateNames);

    // Yeni results objesi oluştur
    const filteredResults = {
      drivers: {},
      personnel: {},
      summary: {
        gunduzDays: 0,
        geceDays: 0,
        totalDeliveries: 0,
        totalPallets: 0,
        totalBoxes: 0
      }
    };

    // Şoförleri işle
    Object.entries(analysisData.drivers).forEach(([driverName, driver]) => {
      const filteredDriver = {
        ...driver,
        totalTrips: 0,
        totalPallets: 0,
        totalBoxes: 0,
        dayData: {}
      };

      if (Object.keys(driver.dayData || {}).length > 0) {
        console.log(`🔍 ${driverName} işleniyor. Günlük veriler:`, Object.keys(driver.dayData || {}));
      }

      // Sadece seçili tarihlerin verilerini topla
      Object.entries(driver.dayData || {}).forEach(([date, data]) => {
        if (filteredDateNames.includes(date)) {
          filteredDriver.totalTrips += data.trips || 0;
          filteredDriver.totalPallets += data.pallets || 0;
          filteredDriver.totalBoxes += data.boxes || 0;
          filteredDriver.dayData[date] = data;
          console.log(`✅ ${driverName} - ${date}: +${data.trips} sefer eklendi`);
        }
      });

      if (filteredDriver.totalTrips > 0) {
        console.log(`📊 ${driverName} filtreleme sonrası: ${filteredDriver.totalTrips} sefer`);
      }

      filteredDriver.averagePallets = filteredDriver.totalTrips > 0 ? 
        (filteredDriver.totalPallets / filteredDriver.totalTrips).toFixed(1) : 0;
      filteredDriver.averageBoxes = filteredDriver.totalTrips > 0 ? 
        (filteredDriver.totalBoxes / filteredDriver.totalTrips).toFixed(1) : 0;

      filteredResults.drivers[driverName] = filteredDriver;
    });

    // Personelleri işle
    Object.entries(analysisData.personnel).forEach(([personName, person]) => {
      const filteredPerson = {
        ...person,
        totalTrips: 0,
        totalPallets: 0,
        totalBoxes: 0,
        dayData: {}
      };

      // Sadece seçili tarihlerin verilerini topla
      Object.entries(person.dayData || {}).forEach(([date, data]) => {
        if (filteredDateNames.includes(date)) {
          filteredPerson.totalTrips += data.trips || 0;
          filteredPerson.totalPallets += data.pallets || 0;
          filteredPerson.totalBoxes += data.boxes || 0;
          filteredPerson.dayData[date] = data;
        }
      });

      filteredPerson.averagePallets = filteredPerson.totalTrips > 0 ? 
        (filteredPerson.totalPallets / filteredPerson.totalTrips).toFixed(1) : 0;
      filteredPerson.averageBoxes = filteredPerson.totalTrips > 0 ? 
        (filteredPerson.totalBoxes / filteredPerson.totalTrips).toFixed(1) : 0;

      filteredResults.personnel[personName] = filteredPerson;
    });

    // Summary'yi hesapla
    filteredResults.summary.gunduzDays = availableDates.filter(d => 
      filteredDateNames.includes(d.date) && d.shift === 'GÜNDÜZ'
    ).length;
    
    filteredResults.summary.geceDays = availableDates.filter(d => 
      filteredDateNames.includes(d.date) && d.shift === 'GECE'
    ).length;

    filteredResults.summary.totalDeliveries = 
      Object.values(filteredResults.drivers).reduce((sum, driver) => sum + driver.totalTrips, 0) +
      Object.values(filteredResults.personnel).reduce((sum, person) => sum + person.totalTrips, 0);

    filteredResults.summary.totalPallets = 
      Object.values(filteredResults.drivers).reduce((sum, driver) => sum + driver.totalPallets, 0) +
      Object.values(filteredResults.personnel).reduce((sum, person) => sum + person.totalPallets, 0);

    filteredResults.summary.totalBoxes = 
      Object.values(filteredResults.drivers).reduce((sum, driver) => sum + driver.totalBoxes, 0) +
      Object.values(filteredResults.personnel).reduce((sum, person) => sum + person.totalBoxes, 0);

    return filteredResults;
  };

  // Sıralama fonksiyonları
  const getSortFunction = (sortBy) => {
    switch (sortBy) {
      case 'trips':
        return (a, b) => b.totalTrips - a.totalTrips;
      case 'pallets':
        return (a, b) => b.totalPallets - a.totalPallets;
      case 'boxes':
        return (a, b) => b.totalBoxes - a.totalBoxes;
      case 'avgPallets':
        return (a, b) => {
          const aAvg = a.totalTrips > 0 ? a.totalPallets / a.totalTrips : 0;
          const bAvg = b.totalTrips > 0 ? b.totalPallets / b.totalTrips : 0;
          return bAvg - aAvg;
        };
      case 'avgBoxes':
        return (a, b) => {
          const aAvg = a.totalTrips > 0 ? a.totalBoxes / a.totalTrips : 0;
          const bAvg = b.totalTrips > 0 ? b.totalBoxes / b.totalTrips : 0;
          return bAvg - aAvg;
        };
      default:
        return (a, b) => b.totalTrips - a.totalTrips;
    }
  };

  const renderDriverAnalysis = () => {
    if (!analysisData) return null;

    const filteredData = getFilteredData();
    if (!filteredData) return null;

    const drivers = Object.values(filteredData.drivers)
      .filter(driver => driver.totalTrips > 0) // Sadece verisi olanları göster
      .sort(getSortFunction(driverSortBy));
      
    console.log('🚚 TÜM ŞOFÖRLER:', drivers.map(d => ({ name: d.name, trips: d.totalTrips, pallets: d.totalPallets, boxes: d.totalBoxes })));

    const getSortButtonStyle = (sortType) => {
      return driverSortBy === sortType 
        ? 'bg-blue-500 text-white' 
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    };

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Şoför Performans Analizi
          </h3>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sırala:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setDriverSortBy('trips')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${getSortButtonStyle('trips')}`}
              >
                Sefer
              </button>
              <button
                onClick={() => setDriverSortBy('pallets')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${getSortButtonStyle('pallets')}`}
              >
                Palet
              </button>
              <button
                onClick={() => setDriverSortBy('boxes')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${getSortButtonStyle('boxes')}`}
              >
                Kasa
              </button>
              <button
                onClick={() => setDriverSortBy('avgPallets')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${getSortButtonStyle('avgPallets')}`}
              >
                Ort. Palet
              </button>
              <button
                onClick={() => setDriverSortBy('avgBoxes')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${getSortButtonStyle('avgBoxes')}`}
              >
                Ort. Kasa
              </button>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-700">Şoför</th>
                <th className="text-center py-2 px-3 font-semibold text-gray-700">Şu anki Vardiya</th>
                <th 
                  className={`text-right py-2 px-3 font-semibold cursor-pointer hover:bg-gray-50 ${driverSortBy === 'trips' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                  onClick={() => setDriverSortBy('trips')}
                >
                  Toplam Sefer {driverSortBy === 'trips' && '↓'}
                </th>
                <th 
                  className={`text-right py-2 px-3 font-semibold cursor-pointer hover:bg-gray-50 ${driverSortBy === 'pallets' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                  onClick={() => setDriverSortBy('pallets')}
                >
                  Toplam Palet {driverSortBy === 'pallets' && '↓'}
                </th>
                <th 
                  className={`text-right py-2 px-3 font-semibold cursor-pointer hover:bg-gray-50 ${driverSortBy === 'boxes' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                  onClick={() => setDriverSortBy('boxes')}
                >
                  Toplam Kasa {driverSortBy === 'boxes' && '↓'}
                </th>
                <th 
                  className={`text-right py-2 px-3 font-semibold cursor-pointer hover:bg-gray-50 ${driverSortBy === 'avgPallets' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                  onClick={() => setDriverSortBy('avgPallets')}
                >
                  Ort. Palet/Sefer {driverSortBy === 'avgPallets' && '↓'}
                </th>
                <th 
                  className={`text-right py-2 px-3 font-semibold cursor-pointer hover:bg-gray-50 ${driverSortBy === 'avgBoxes' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                  onClick={() => setDriverSortBy('avgBoxes')}
                >
                  Ort. Kasa/Sefer {driverSortBy === 'avgBoxes' && '↓'}
                </th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium text-gray-800">
                    {driver.name}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      driver.shift === 'İZİNLİ' 
                        ? 'bg-gray-100 text-gray-800' 
                        : driver.shift === 'GÜNDÜZ' || driver.shift === 'Gündüz' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {driver.shift === 'İZİNLİ' 
                        ? '🏖️ İzinli' 
                        : driver.shift === 'GÜNDÜZ' || driver.shift === 'Gündüz' 
                        ? '🌅 Gündüz' 
                        : '🌙 Gece'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right text-gray-600">{driver.totalTrips}</td>
                  <td className="py-2 px-3 text-right text-gray-600">{driver.totalPallets}</td>
                  <td className="py-2 px-3 text-right text-gray-600">{driver.totalBoxes}</td>
                  <td className="py-2 px-3 text-right text-gray-600">
                    {driver.totalTrips > 0 ? (driver.totalPallets / driver.totalTrips).toFixed(1) : '0'}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-600">
                    {driver.totalTrips > 0 ? (driver.totalBoxes / driver.totalTrips).toFixed(1) : '0'}
                  </td>
                </tr>
              ))}
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

    const personnel = Object.values(filteredData.personnel)
      .filter(person => person.totalTrips > 0) // Sadece verisi olanları göster
      .sort(getSortFunction(personnelSortBy));
      
    console.log('👷 TÜM PERSONELLER:', personnel.map(p => ({ name: p.name, trips: p.totalTrips, pallets: p.totalPallets, boxes: p.totalBoxes })));

    const getPersonnelSortButtonStyle = (sortType) => {
      return personnelSortBy === sortType 
        ? 'bg-blue-500 text-white' 
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    };

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Personel Performans Analizi
          </h3>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sırala:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPersonnelSortBy('trips')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${getPersonnelSortButtonStyle('trips')}`}
              >
                Sefer
              </button>
              <button
                onClick={() => setPersonnelSortBy('pallets')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${getPersonnelSortButtonStyle('pallets')}`}
              >
                Palet
              </button>
              <button
                onClick={() => setPersonnelSortBy('boxes')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${getPersonnelSortButtonStyle('boxes')}`}
              >
                Kasa
              </button>
              <button
                onClick={() => setPersonnelSortBy('avgPallets')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${getPersonnelSortButtonStyle('avgPallets')}`}
              >
                Ort. Palet
              </button>
              <button
                onClick={() => setPersonnelSortBy('avgBoxes')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${getPersonnelSortButtonStyle('avgBoxes')}`}
              >
                Ort. Kasa
              </button>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-700">Personel</th>
                <th className="text-center py-2 px-3 font-semibold text-gray-700">Şu anki Vardiya</th>
                <th 
                                      className={`text-right py-2 px-3 font-semibold cursor-pointer hover:bg-gray-50 ${personnelSortBy === 'trips' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                  onClick={() => setPersonnelSortBy('trips')}
                >
                  Toplam Sefer {personnelSortBy === 'trips' && '↓'}
                </th>
                <th 
                  className={`text-right py-2 px-3 font-semibold cursor-pointer hover:bg-gray-50 ${personnelSortBy === 'pallets' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                  onClick={() => setPersonnelSortBy('pallets')}
                >
                  Toplam Palet {personnelSortBy === 'pallets' && '↓'}
                </th>
                <th 
                  className={`text-right py-2 px-3 font-semibold cursor-pointer hover:bg-gray-50 ${personnelSortBy === 'boxes' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                  onClick={() => setPersonnelSortBy('boxes')}
                >
                  Toplam Kasa {personnelSortBy === 'boxes' && '↓'}
                </th>
                <th 
                  className={`text-right py-2 px-3 font-semibold cursor-pointer hover:bg-gray-50 ${personnelSortBy === 'avgPallets' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                  onClick={() => setPersonnelSortBy('avgPallets')}
                >
                  Ort. Palet/Sefer {personnelSortBy === 'avgPallets' && '↓'}
                </th>
                <th 
                  className={`text-right py-2 px-3 font-semibold cursor-pointer hover:bg-gray-50 ${personnelSortBy === 'avgBoxes' ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                  onClick={() => setPersonnelSortBy('avgBoxes')}
                >
                  Ort. Kasa/Sefer {personnelSortBy === 'avgBoxes' && '↓'}
                </th>
              </tr>
            </thead>
            <tbody>
              {personnel.map((person, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium text-gray-800">
                    {person.name}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      person.shift === 'İZİNLİ' 
                        ? 'bg-gray-100 text-gray-800' 
                        : person.shift === 'GÜNDÜZ' || person.shift === 'Gündüz' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {person.shift === 'İZİNLİ' 
                        ? '🏖️ İzinli' 
                        : person.shift === 'GÜNDÜZ' || person.shift === 'Gündüz' 
                        ? '🌅 Gündüz' 
                        : '🌙 Gece'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right text-gray-600">{person.totalTrips}</td>
                  <td className="py-2 px-3 text-right text-gray-600">{person.totalPallets}</td>
                  <td className="py-2 px-3 text-right text-gray-600">{person.totalBoxes}</td>
                  <td className="py-2 px-3 text-right text-gray-600">
                    {person.totalTrips > 0 ? (person.totalPallets / person.totalTrips).toFixed(1) : '0'}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-600">
                    {person.totalTrips > 0 ? (person.totalBoxes / person.totalTrips).toFixed(1) : '0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSummaryCards = () => {
    if (!analysisData) return null;

    const filteredData = getFilteredData();
    if (!filteredData) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs">Gündüz Günleri</p>
              <p className="text-2xl font-bold">{filteredData.summary.gunduzDays}</p>
              <p className="text-blue-200 text-xs">🌅 vardiya</p>
            </div>
            <Calendar className="w-10 h-10 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-xs">Gece Günleri</p>
              <p className="text-2xl font-bold">{filteredData.summary.geceDays}</p>
              <p className="text-indigo-200 text-xs">🌙 vardiya</p>
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-center gap-4 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Performans Analizi</h1>
          {analysisData && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportToExcel}
                disabled={exportLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {exportLoading ? 'İndiriliyor...' : 'Excel İndir'}
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Yeniden Başlat
              </button>
            </div>
          )}
        </div>
        <p className="text-gray-600 text-center">Şoför ve personel performansını analiz edin</p>
      </div>

      {/* DOSYA YÜKLEME */}
      {!analysisData && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          {!loadingPlans ? (
            <div className="flex items-center justify-center">
              <label className="flex flex-col items-center gap-4 cursor-pointer">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-10 h-10 text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-800">Excel Dosyasını Yükleyin</p>
                  <p className="text-sm text-gray-600">Personel listesi ve günlük planlar içeren Excel dosyasını seçin</p>
                </div>
                <div className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                  <Upload className="w-5 h-5 inline mr-2" />
                  Dosya Seç
                </div>
                <input
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
              <div className="mt-4 bg-blue-50 rounded-lg p-3">
                <div className="flex items-center text-blue-700 text-sm">
                  <FileText className="w-4 h-4 mr-2" />
                  <span>Personel listeleri ve günlük planlar işleniyor...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Başarı Mesajı */}
      {analysisData && uploadSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-green-800 mb-2">Başarıyla Yüklendi! 🎉</h3>
              <p className="text-green-700">
                Excel dosyası başarıyla işlendi. Performans analizi hazır!
              </p>
              <div className="mt-4 flex items-center justify-center space-x-4 text-sm text-green-600">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  <span>{Object.keys(analysisData.drivers).length} Şoför</span>
                </div>
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  <span>{Object.keys(analysisData.personnel).length} Personel</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>{availableDates.length} Günlük Plan</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analiz Sonuçları */}
      {analysisData && (
        <>
          {/* Filtreleme Paneli */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Filtreleme Seçenekleri</h3>
            </div>
            
            <div className="space-y-4">
              {/* Vardiya Filtresi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vardiya Seçimi</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShiftFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      shiftFilter === 'all' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Tüm Vardiyalar
                  </button>
                  <button
                    onClick={() => setShiftFilter('day')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      shiftFilter === 'day' 
                        ? 'bg-yellow-500 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🌅 Gündüz
                  </button>
                  <button
                    onClick={() => setShiftFilter('night')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      shiftFilter === 'night' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🌙 Gece
                  </button>

                </div>
              </div>

              {/* Tarih Seçimi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tarih Seçimi</label>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setSelectedDates(availableDates.map(d => d.date))}
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
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                    {availableDates.map((dateItem) => (
                      <div key={dateItem.date} className="relative">
                        <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                          selectedDates.includes(dateItem.date) 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}>
                          <input
                            type="checkbox"
                            checked={selectedDates.includes(dateItem.date)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDates([...selectedDates, dateItem.date]);
                              } else {
                                setSelectedDates(selectedDates.filter(d => d !== dateItem.date));
                              }
                            }}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {dateItem.displayName}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                dateItem.shift === 'İZİNLİ' 
                                  ? 'bg-gray-100 text-gray-800' 
                                  : dateItem.shift === 'GÜNDÜZ' 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {dateItem.shift === 'İZİNLİ' ? '🏖️ İzinli' : dateItem.shift === 'GÜNDÜZ' ? '🌅 Gündüz' : '🌙 Gece'}
                              </span>
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Seçim Özeti */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>📅 Seçilen: {selectedDates.length} / {availableDates.length} tarih</span>
                  <span>🔄 Vardiya: {shiftFilter === 'all' ? 'Tümü' : shiftFilter === 'day' ? 'Gündüz' : 'Gece'}</span>
                </div>
              </div>
            </div>
          </div>

          {renderSummaryCards()}
          
          <div className="grid grid-cols-1 xl:grid-cols-1 gap-8">
            {renderDriverAnalysis()}
            {renderPersonnelAnalysis()}
          </div>
        </>
      )}


    </div>
  );
};

export default PerformanceAnalysis; 