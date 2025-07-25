import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Check, X, AlertCircle, Eye, AlertTriangle, Info } from 'lucide-react';
import { addPersonnel, addVehicle, addStore, getAllPersonnel, getAllVehicles, getAllStores, bulkSavePerformanceData } from '../services/supabase';
import * as XLSX from 'xlsx';

const FileUpload = ({ onDataUpload }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [conflicts, setConflicts] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setError('');
    setResults(null);
    setPreviewData(null);
    setShowConfirmation(false);
    setConflicts(null);
  };

  const processExcelFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          console.log('📊 Excel dosyası bilgileri:');
          console.log('Sheet isimleri:', workbook.SheetNames);

          const sheetName = workbook.SheetNames[0];
          console.log('Kullanılan sheet:', sheetName);
          
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          console.log('Toplam satır sayısı:', jsonData.length);
          console.log('İlk 3 satır:', jsonData.slice(0, 3));
          
          // Excel sütun yapısını kontrol et
          if (jsonData.length > 0) {
            console.log('🔍 Excel sütun yapısı:');
            console.log('Tüm sütunlar:', Object.keys(jsonData[0]));
            console.log('A-Z sütunları:', Object.keys(jsonData[0]).filter(key => /^[A-Z]$/.test(key)));
            console.log('M sütunu var mı?', 'M' in jsonData[0]);
            console.log('M sütunu değeri:', jsonData[0]['M']);
            console.log('PLAKA sütunu var mı?', 'PLAKA' in jsonData[0]);
            console.log('PLAKA sütunu değeri:', jsonData[0]['PLAKA']);
            console.log('İlk 3 satırın PLAKA değerleri:', jsonData.slice(0, 3).map(row => row['PLAKA']));
          }
          
          resolve(jsonData);
        } catch (error) {
          console.error('Excel okuma hatası:', error);
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const processPersonnelData = (data) => {
    const personnel = [];
    
    // Excel başlıklarını kontrol et
    if (data.length > 0) {
      console.log('🔍 Excel başlıkları (ilk satır):', Object.keys(data[0]));
      console.log('🔍 İlk veri satırı:', data[0]);
    }
    
    data.forEach((row, index) => {
      if (index === 0) return; // Skip header row
      
      // Esnek kolon eşleştirme
      const findColumn = (possibleNames) => {
        for (let name of possibleNames) {
          if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
            return String(row[name]).trim();
          }
        }
        return null;
      };
      
      const person = {
        employee_code: findColumn(['B', 'Sicil No', 'SICIL_NO', 'SicilNo', 'Sicil', 'Employee Code', 'SICIL', 'Sicil_No']),
        full_name: findColumn(['C', 'Ad Soyad', 'ADI SOYADI', 'AdSoyad', 'Full Name', 'İsim', 'Isim', 'AD_SOYAD', 'NAME']),
        position: findColumn(['D', 'Pozisyon', 'POZISYON', 'Görev', 'GOREV', 'Position', 'Meslek', 'POZISYON', 'Job']),
        shift_type: findColumn(['E', 'Vardiya', 'VARDIYA', 'Shift', 'Vardiya Türü', 'VARDIYA_TURU', 'VARDIYA_TIPI', 'SHIFT'])
      };
      
      if (index < 5) { // İlk 5 satır için debug
        console.log(`🔍 Personel ${index}:`, person);
        console.log(`🔍 Excel satırı ${index} ham veri:`, row);
      }
      
      // Personel ekleme kriterleri: full_name mutlaka olmalı
      if (person.full_name) {
        // Eğer employee_code yoksa, full_name'i kod olarak kullan (geçici çözüm)
        if (!person.employee_code) {
          person.employee_code = person.full_name;
          console.log(`⚠️ Personel kodu bulunamadı, isim kod olarak kullanılıyor: ${person.full_name}`);
        }
        
        personnel.push(person);
      } else {
        console.log(`❌ Personel atlandı (isim yok): satır ${index}`, row);
      }
    });
    
    console.log(`✅ Toplam ${personnel.length} personel bulundu`);
    
    // Debug: İlk 3 personeli göster
    if (personnel.length > 0) {
      console.log('📋 İlk 3 personel:', personnel.slice(0, 3));
    }
    
    return personnel;
  };

  const processVehicleData = (data) => {
    const vehicles = [];

    // Excel başlıklarını kontrol et
    if (data.length > 0) {
      console.log('🚗 Araç verileri - Excel başlıkları:', Object.keys(data[0]));
    }
    
    data.forEach((row, index) => {
      if (index === 0) return; // Skip header row
      
      // Esnek kolon eşleştirme
      const findColumn = (possibleNames) => {
        for (let name of possibleNames) {
          if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
            return row[name];
          }
        }
        return null;
      };
      
          const vehicle = {
        license_plate: findColumn(['I', 'Plaka', 'PLAKA', 'License Plate', 'Plaka No', 'PLAKA_NO']),
        vehicle_type: findColumn(['L', 'Araç Tipi', 'ARAC_TIPI', 'AracTipi', 'Vehicle Type', 'Tip', 'TIP', 'Araç Türü']),
        first_driver: findColumn(['J', '1. Şoför', 'SOFOR1', 'Şoför1', 'First Driver', 'Birinci Şoför', 'BIRINCI_SOFOR']),
        second_driver: findColumn(['K', '2. Şoför', 'SOFOR2', 'Şoför2', 'Second Driver', 'İkinci Şoför', 'IKINCI_SOFOR'])
      };
      
      if (index < 5) { // İlk 5 satır için debug
        console.log(`🚗 Araç ${index}:`, vehicle);
      }
      
      if (vehicle.license_plate) {
          vehicles.push(vehicle);
        }
      });

    console.log(`✅ Toplam ${vehicles.length} araç bulundu`);
    return vehicles;
  };

  const processStoreData = (data) => {
      const stores = [];
    
    // Excel başlıklarını kontrol et
    if (data.length > 0) {
      console.log('🏪 Mağaza verileri - Excel başlıkları:', Object.keys(data[0]));
    }
    
    data.forEach((row, index) => {
      if (index === 0) return; // Skip header row
      
      // Esnek kolon eşleştirme
      const findColumn = (possibleNames) => {
        for (let name of possibleNames) {
          if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
            return row[name];
        }
      }
        return null;
      };
      
      const store = {
        store_code: findColumn(['A', 'Kod', 'KOD', 'Store Code', 'Mağaza Kod', 'MAGAZA_KOD']),
        store_name: findColumn(['B', 'Mağaza Adı', 'MAGAZA_ADI', 'Store Name', 'Mağaza İsmi', 'MAGAZA_ISMI']),
        region: findColumn(['C', 'Bölge', 'BOLGE', 'Region', 'Bölge Adı', 'BOLGE_ADI']),
        store_type: findColumn(['D', 'Tür', 'TUR', 'Store Type', 'Mağaza Türü', 'MAGAZA_TURU']) || 'Standart',
        location: findColumn(['E', 'Konum', 'KONUM', 'Location', 'Adres', 'ADRES']),
        region_manager: findColumn(['F', 'Bölge Müdürü', 'BOLGE_MUDURU', 'Region Manager', 'Bölge Yöneticisi']),
        sales_manager: findColumn(['G', 'Satış Müdürü', 'SATIS_MUDURU', 'Sales Manager', 'Satış Yöneticisi']),
        phone: findColumn(['H', 'Telefon', 'TELEFON', 'Phone', 'Tel', 'TEL']),
        email: findColumn(['I', 'E-posta', 'EMAIL', 'E-mail', 'Mail', 'MAIL']),
        staff_count: parseInt(findColumn(['J', 'Personel Sayısı', 'PERSONEL_SAYISI', 'Staff Count', 'Çalışan Sayısı']) || '0') || 0
      };
      
      if (index < 5) { // İlk 5 satır için debug
        console.log(`🏪 Mağaza ${index}:`, store);
      }
      
      if (store.store_code && store.store_name) {
        stores.push(store);
          }
    });
    
    console.log(`✅ Toplam ${stores.length} mağaza bulundu`);
    return stores;
  };

  const processPerformanceData = (data) => {
    const performanceData = [];
    
    // Excel başlıklarını kontrol et
    if (data.length > 0) {
      console.log('🔍 Performance Excel başlıkları (ilk satır):', Object.keys(data[0]));
      console.log('🔍 İlk performance veri satırı:', data[0]);
      console.log('🔍 Tüm kolonlar (A-Z):', Object.keys(data[0]).filter(key => /^[A-Z]$/.test(key)));
      console.log('🔍 M sütunu var mı?', 'M' in data[0]);
      console.log('🔍 M sütunu değeri:', data[0]['M']);
    }
    
    data.forEach((row, index) => {
      if (index === 0) return; // Skip header row
      
      // Esnek kolon eşleştirme
      const findColumn = (possibleNames) => {
        for (let name of possibleNames) {
          if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
            const value = String(row[name]).trim();
            if (index < 5) {
              console.log(`🔍 Kolon ${name} bulundu:`, value);
            }
            return value;
          }
        }
        if (index < 5) {
          console.log(`🔍 Kolonlar bulunamadı:`, possibleNames);
          console.log(`🔍 Mevcut kolonlar:`, Object.keys(row));
        }
        return null;
      };
      
      const performance = {
        date: findColumn(['A', 'Tarih', 'DATE', 'Date', 'Gün', 'GUN', 'Day', 'SİPARİŞ TARİH']),
        employee_code: findColumn(['B', 'Sicil No', 'SICIL_NO', 'Employee Code', 'Sicil', 'SICIL', 'SicilNo', 'SİPARİŞ NUMARAS']),
        full_name: findColumn(['C', 'Ad Soyad', 'ADI SOYADI', 'Full Name', 'İsim', 'Isim', 'AD_SOYAD', 'NAME', 'ŞOFOR']),
        position: findColumn(['D', 'Pozisyon', 'POZISYON', 'Position', 'Görev', 'GOREV', 'Job', 'Lokasyon']),
        license_plate: findColumn(['PLAKA', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'LICENSE_PLATE', 'License Plate', 'Araç', 'ARAC', 'Vehicle', 'Plaka No']),
        store_codes: findColumn(['F', 'MAĞAZA KODU', 'Mağaza Kodları', 'STORE_CODES', 'Store Codes', 'Mağazalar', 'MAGAZALAR', 'Stores']),
        shift_type: findColumn(['G', 'Vardiya', 'VARDIYA', 'Shift', 'Vardiya Türü', 'VARDIYA_TURU', 'SHIFT']),
        sheet_name: 'performance_data'
      };
      
      if (index < 5) { // İlk 5 satır için debug
        console.log(`🔍 Performance ${index}:`, performance);
        console.log(`🔍 Excel satırı ${index} ham veri:`, row);
        console.log(`🔍 M sütunu değeri:`, row['M'] || 'BOŞ');
        console.log(`🔍 PLAKA sütunu değeri:`, row['PLAKA'] || 'BOŞ');
        console.log(`🔍 Tüm sütun isimleri:`, Object.keys(row));
        console.log(`🔍 Plaka bulundu mu:`, !!performance.license_plate);
        console.log(`🔍 Plaka değeri:`, performance.license_plate);
      }
      
      // Performance data ekleme kriterleri: date ve employee_code mutlaka olmalı
      if (performance.date && performance.employee_code) {
        // Tarih formatını düzelt
        try {
          const dateObj = new Date(performance.date);
          if (isNaN(dateObj.getTime())) {
            console.log(`⚠️ Geçersiz tarih formatı: ${performance.date}`);
            return;
          }
          performance.date = dateObj.toISOString().split('T')[0];
        } catch (error) {
          console.log(`⚠️ Tarih dönüştürme hatası: ${performance.date}`);
          return;
        }
        
        performanceData.push(performance);
      } else {
        console.log(`⚠️ Performance ${index} atlandı - tarih veya sicil no bulunamadı`);
      }
    });
    
    console.log(`✅ Toplam ${performanceData.length} performance kaydı bulundu`);
    return performanceData;
  };

  const saveToDatabase = async (personnel, vehicles, stores, performanceData = []) => {
    const results = {
      personnel: { success: 0, error: 0 },
      vehicles: { success: 0, error: 0 },
      stores: { success: 0, error: 0 },
      performance: { success: 0, error: 0 }
    };

    // Save personnel only if exists
    if (personnel.length > 0) {
      console.log(`💾 ${personnel.length} personel kaydediliyor...`);
      for (const person of personnel) {
        try {
          const result = await addPersonnel(person);
          if (result.success) {
            results.personnel.success++;
            console.log(`✅ Personel eklendi/güncellendi: ${person.full_name}`);
          } else {
            results.personnel.error++;
            console.log(`❌ Personel hatası: ${person.full_name} - ${result.error}`);
          }
        } catch (error) {
          results.personnel.error++;
          console.log(`❌ Personel hatası: ${person.full_name} - ${error.message}`);
        }
      }
    }

    // Save vehicles only if exists
    if (vehicles.length > 0) {
      console.log(`🚗 ${vehicles.length} araç kaydediliyor...`);
      for (const vehicle of vehicles) {
        try {
          const result = await addVehicle(vehicle);
          if (result.success) {
            results.vehicles.success++;
            console.log(`✅ Araç eklendi/güncellendi: ${vehicle.license_plate}`);
                  } else {
            results.vehicles.error++;
            console.log(`❌ Araç hatası: ${vehicle.license_plate} - ${result.error}`);
                  }
                } catch (error) {
          results.vehicles.error++;
          console.log(`❌ Araç hatası: ${vehicle.license_plate} - ${error.message}`);
                }
              }
    }

    // Save stores only if exists
    if (stores.length > 0) {
      console.log(`🏪 ${stores.length} mağaza kaydediliyor...`);
      for (const store of stores) {
        try {
          const result = await addStore(store);
          if (result.success) {
            results.stores.success++;
            console.log(`✅ Mağaza eklendi/güncellendi: ${store.store_name}`);
          } else {
            results.stores.error++;
            console.log(`❌ Mağaza hatası: ${store.store_name} - ${result.error}`);
          }
        } catch (error) {
          results.stores.error++;
          console.log(`❌ Mağaza hatası: ${store.store_name} - ${error.message}`);
        }
      }
    }

    // Save performance data only if exists
    if (performanceData.length > 0) {
      console.log(`📊 ${performanceData.length} performance kaydı kaydediliyor...`);
      try {
        const result = await bulkSavePerformanceData(performanceData, ['performance_data']);
        if (result.success) {
          results.performance.success = performanceData.length;
          console.log(`✅ Performance data başarıyla kaydedildi: ${performanceData.length} kayıt`);
        } else {
          results.performance.error = performanceData.length;
          console.log(`❌ Performance data hatası: ${result.error}`);
        }
      } catch (error) {
        results.performance.error = performanceData.length;
        console.log(`❌ Performance data hatası: ${error.message}`);
      }
    }

    return results;
  };

  const analyzeData = async (personnel, vehicles, stores) => {
    const conflicts = {
      personnel: { existing: [], new: [] },
      vehicles: { existing: [], new: [] },
      stores: { existing: [], new: [] }
    };

    // Mevcut verileri al
    const [currentPersonnel, currentVehicles, currentStores] = await Promise.all([
      getAllPersonnel(),
      getAllVehicles(),
      getAllStores()
    ]);

    // Personel çakışmalarını kontrol et
    if (personnel.length > 0) {
      console.log('🔍 Mevcut personel verisi:', currentPersonnel.success ? currentPersonnel.data : 'Veri yok');
      console.log('🔍 Excel personel verisi:', personnel);
        
      // Mevcut personel kodları - null ve undefined değerleri filtrele
      const existingPersonnelCodes = new Set(
        currentPersonnel.success ? 
          currentPersonnel.data
            .filter(p => p.employee_code && p.employee_code !== null && p.employee_code !== '')
            .map(p => String(p.employee_code).trim()) : []
      );
      
      // Mevcut personel isimlerini de kontrol et (fallback)
      const existingPersonnelNames = new Set(
        currentPersonnel.success ? 
          currentPersonnel.data
            .filter(p => p.full_name && p.full_name !== null && p.full_name !== '')
            .map(p => String(p.full_name).trim().toLowerCase()) : []
      );
      
      console.log('🔍 Mevcut personel kodları:', Array.from(existingPersonnelCodes));
      console.log('🔍 Mevcut personel isimleri:', Array.from(existingPersonnelNames));
      
      personnel.forEach(person => {
        const personCode = person.employee_code ? String(person.employee_code).trim() : null;
        const personName = person.full_name ? String(person.full_name).trim().toLowerCase() : null;
        
        console.log(`🔍 Kontrol edilen personel: kod="${personCode}", isim="${personName}"`);
        
        let isExisting = false;
        
        // Önce employee_code ile kontrol et
        if (personCode && existingPersonnelCodes.has(personCode)) {
          isExisting = true;
          console.log(`✅ Kod eşleşmesi bulundu: ${personCode}`);
        }
        // Kod yoksa veya eşleşmiyorsa isim ile kontrol et
        else if (personName && existingPersonnelNames.has(personName)) {
          isExisting = true;
          console.log(`✅ İsim eşleşmesi bulundu: ${personName}`);
        }
        
        if (isExisting) {
          conflicts.personnel.existing.push(person);
        } else {
          conflicts.personnel.new.push(person);
        }
      });
    }

    // Araç çakışmalarını kontrol et
    if (vehicles.length > 0) {
      const existingVehiclePlates = new Set(
        currentVehicles.success ? currentVehicles.data.map(v => v.license_plate) : []
      );
      
      vehicles.forEach(vehicle => {
        if (existingVehiclePlates.has(vehicle.license_plate)) {
          conflicts.vehicles.existing.push(vehicle);
                  } else {
          conflicts.vehicles.new.push(vehicle);
                  }
      });
    }

    // Mağaza çakışmalarını kontrol et
    if (stores.length > 0) {
      const existingStoreCodes = new Set(
        currentStores.success ? currentStores.data.map(s => s.store_code) : []
      );
      
      stores.forEach(store => {
        if (existingStoreCodes.has(store.store_code)) {
          conflicts.stores.existing.push(store);
        } else {
          conflicts.stores.new.push(store);
          }
        });
      }

    return conflicts;
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      setError('Lütfen bir dosya seçin');
      return;
    }

    setAnalyzing(true);
    setError('');

    try {
      const file = files[0];
      console.log('📁 Dosya analizi başlatılıyor:', file.name);
      
      const data = await processExcelFile(file);
      
      console.log('🔍 Veri işleme başlatılıyor...');
      const personnel = processPersonnelData(data);
      const vehicles = processVehicleData(data);
      const stores = processStoreData(data);
      const performance = processPerformanceData(data);

      console.log('📊 İşleme sonuçları:', {
        personel: personnel.length,
        araç: vehicles.length,
        mağaza: stores.length,
        performance: performance.length
      });

      // Performance data kontrolü
      if (performance.length > 0) {
        console.log('🔍 Performance data örnekleri:');
        performance.slice(0, 3).forEach((item, index) => {
          console.log(`Performance ${index}:`, {
            date: item.date,
            employee_code: item.employee_code,
            license_plate: item.license_plate,
            vehicle_type: item.vehicle_type
          });
        });
      }

      if (personnel.length === 0 && vehicles.length === 0 && stores.length === 0 && performance.length === 0) {
        setError('Excel dosyasında geçerli veri bulunamadı. Lütfen dosya formatını kontrol edin.');
        setAnalyzing(false);
        return;
      }

      console.log('⚖️ Çakışma analizi başlatılıyor...');
      const conflicts = await analyzeData(personnel, vehicles, stores);

      setPreviewData({ personnel, vehicles, stores, performance });
      setConflicts(conflicts);
      setShowConfirmation(true);
      
    } catch (error) {
      console.error('❌ Analysis error:', error);
      setError('Dosya analizi sırasında hata oluştu: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmedUpload = async (actionType) => {
    if (!previewData) return;

    setUploading(true);
    setError('');

    try {
      let dataToUpload = { personnel: [], vehicles: [], stores: [], performance: [] };

      // ActionType'a göre hangi verileri yükleyeceğimizi belirle
      if (actionType === 'new_only') {
        dataToUpload = {
          personnel: conflicts.personnel.new,
          vehicles: conflicts.vehicles.new,
          stores: conflicts.stores.new,
          performance: previewData.performance || []
        };
      } else if (actionType === 'update_only') {
        dataToUpload = {
          personnel: conflicts.personnel.existing,
          vehicles: conflicts.vehicles.existing,
          stores: conflicts.stores.existing,
          performance: previewData.performance || []
        };
      } else if (actionType === 'all') {
        dataToUpload = previewData;
      }

      // Save to database
      const dbResults = await saveToDatabase(
        dataToUpload.personnel, 
        dataToUpload.vehicles, 
        dataToUpload.stores,
        dataToUpload.performance
      );

      // Update parent component
      onDataUpload(dataToUpload);

      // Create results
      const processedDataTypes = [];
      if (dataToUpload.personnel.length > 0) processedDataTypes.push(`${dataToUpload.personnel.length} personel`);
      if (dataToUpload.vehicles.length > 0) processedDataTypes.push(`${dataToUpload.vehicles.length} araç`);
      if (dataToUpload.stores.length > 0) processedDataTypes.push(`${dataToUpload.stores.length} mağaza`);
      if (dataToUpload.performance.length > 0) processedDataTypes.push(`${dataToUpload.performance.length} performance kaydı`);

      setResults({
        personnel: dataToUpload.personnel.length,
        vehicles: dataToUpload.vehicles.length,
        stores: dataToUpload.stores.length,
        performance: dataToUpload.performance.length,
        database: dbResults,
        processedDataTypes,
        totalProcessed: dataToUpload.personnel.length + dataToUpload.vehicles.length + dataToUpload.stores.length + dataToUpload.performance.length,
        actionType
      });

      setShowConfirmation(false);

    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || 'Dosya yüklenirken bir hata oluştu');
    } finally {
      setUploading(false);
    }
  };

  return (
        <div className="space-y-6">
      {/* Upload Area */}
      <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
        analyzing 
          ? 'border-purple-400 bg-purple-50' :
          uploading 
          ? 'border-blue-400 bg-blue-50' 
          : 'border-gray-300 hover:border-blue-400'
      }`}>
        <div className="flex flex-col items-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
            analyzing 
              ? 'bg-purple-200 animate-pulse' :
              uploading 
              ? 'bg-blue-200 animate-pulse' 
              : 'bg-blue-100'
          }`}>
            {analyzing ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            ) : uploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            ) : (
              <FileSpreadsheet className="w-8 h-8 text-blue-600" />
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {analyzing ? 'Dosya Analiz Ediliyor...' : 
               uploading ? 'Veriler İşleniyor...' : 
               'Excel Dosyası Yükleyin'}
            </h3>
            <p className="text-gray-600 text-sm">
              {analyzing 
                ? 'Dosya içeriği analiz ediliyor ve mevcut verilerle karşılaştırılıyor...' :
                uploading 
                ? 'Lütfen bekleyin, dosyanız veritabanına kaydediliyor...' 
                : 'Personel, araç ve mağaza bilgilerini içeren Excel dosyanızı buraya sürükleyin'
              }
            </p>
          </div>

          {!analyzing && !uploading && (
            <>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              
              <label
                htmlFor="file-upload"
                className="cursor-pointer bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Dosya Seç
              </label>
            </>
          )}
        </div>
      </div>

      {/* Selected Files */}
      {files.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="font-medium text-gray-900 mb-3">Seçilen Dosyalar</h4>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-700">{file.name}</span>
                <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analyze Button */}
      {files.length > 0 && !previewData && (
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {analyzing ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Analiz Ediliyor...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Eye className="w-5 h-5" />
              <span>Dosyayı Analiz Et</span>
          </div>
        )}
        </button>
      )}

      {/* Reset Button */}
      {previewData && !showConfirmation && (
        <button
          onClick={() => {
            setPreviewData(null);
            setConflicts(null);
            setFiles([]);
            setResults(null);
            setError('');
          }}
          className="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 px-6 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span>Yeni Dosya Seç</span>
        </button>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Check className="w-5 h-5 text-green-500" />
            <h4 className="font-medium text-green-900">Yükleme Başarılı!</h4>
            </div>
          
          <div className="mb-4">
            <p className="text-green-800 font-medium">
              {results.processedDataTypes.length > 0 
                ? `${results.processedDataTypes.join(', ')} başarıyla işlendi.`
                : 'Hiç veri bulunamadı.'
              }
            </p>
            {results.actionType && (
              <p className="text-green-700 text-sm mt-1">
                İşlem türü: {
                  results.actionType === 'new_only' ? 'Sadece yeni kayıtlar eklendi' :
                  results.actionType === 'update_only' ? 'Sadece mevcut kayıtlar güncellendi' :
                  'Tüm kayıtlar işlendi (yeni + güncelleme)'
                }
              </p>
            )}
          </div>
          
          {/* Sadece var olan veri tiplerini göster */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {results.personnel > 0 && (
              <div className="text-center bg-white rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-green-600">{results.personnel}</div>
                <div className="text-sm text-green-700">Personel</div>
              </div>
            )}
            {results.vehicles > 0 && (
              <div className="text-center bg-white rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-green-600">{results.vehicles}</div>
                <div className="text-sm text-green-700">Araç</div>
              </div>
            )}
            {results.stores > 0 && (
              <div className="text-center bg-white rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-green-600">{results.stores}</div>
                <div className="text-sm text-green-700">Mağaza</div>
              </div>
            )}
          </div>

          {/* Veritabanı sonuçları - sadece var olan veri tiplerini göster */}
          {results.database && (
            <div className="mt-4 pt-4 border-t border-green-200">
              <div className="text-sm text-green-700">
                <h5 className="font-medium text-green-800 mb-2">Veritabanı Durumu:</h5>
                <div className="space-y-1">
                  {results.personnel > 0 && (
                    <div className="flex justify-between">
                      <span>Personel:</span>
                      <span className="font-medium">
                        {results.database.personnel.success} eklendi/güncellendi
                        {results.database.personnel.error > 0 && (
                          <span className="text-red-600 ml-1">({results.database.personnel.error} hata)</span>
                        )}
                      </span>
                    </div>
                  )}
                  {results.vehicles > 0 && (
                    <div className="flex justify-between">
                      <span>Araç:</span>
                      <span className="font-medium">
                        {results.database.vehicles.success} eklendi/güncellendi
                        {results.database.vehicles.error > 0 && (
                          <span className="text-red-600 ml-1">({results.database.vehicles.error} hata)</span>
                        )}
                      </span>
                </div>
                  )}
                  {results.stores > 0 && (
                    <div className="flex justify-between">
                      <span>Mağaza:</span>
                      <span className="font-medium">
                        {results.database.stores.success} eklendi/güncellendi
                        {results.database.stores.error > 0 && (
                          <span className="text-red-600 ml-1">({results.database.stores.error} hata)</span>
                        )}
                      </span>
              </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && previewData && conflicts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full m-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Excel Dosyası Analiz Sonucu</h3>
            <button
                onClick={() => setShowConfirmation(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

            {/* Data Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {previewData.personnel.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Personel</h4>
                  <div className="text-sm text-blue-700">
                    <div className="flex justify-between">
                      <span>Toplam:</span>
                      <span className="font-medium">{previewData.personnel.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Yeni:</span>
                      <span className="font-medium text-green-600">{conflicts.personnel.new.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mevcut:</span>
                      <span className="font-medium text-amber-600">{conflicts.personnel.existing.length}</span>
                    </div>
                  </div>
                </div>
              )}

              {previewData.vehicles.length > 0 && (
                <div className="bg-green-50 rounded-xl p-4">
                  <h4 className="font-semibold text-green-900 mb-2">Araç</h4>
                  <div className="text-sm text-green-700">
                    <div className="flex justify-between">
                      <span>Toplam:</span>
                      <span className="font-medium">{previewData.vehicles.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Yeni:</span>
                      <span className="font-medium text-green-600">{conflicts.vehicles.new.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mevcut:</span>
                      <span className="font-medium text-amber-600">{conflicts.vehicles.existing.length}</span>
                    </div>
                  </div>
                </div>
              )}

              {previewData.stores.length > 0 && (
                <div className="bg-purple-50 rounded-xl p-4">
                  <h4 className="font-semibold text-purple-900 mb-2">Mağaza</h4>
                  <div className="text-sm text-purple-700">
                    <div className="flex justify-between">
                      <span>Toplam:</span>
                      <span className="font-medium">{previewData.stores.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Yeni:</span>
                      <span className="font-medium text-green-600">{conflicts.stores.new.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mevcut:</span>
                      <span className="font-medium text-amber-600">{conflicts.stores.existing.length}</span>
                    </div>
                  </div>
              </div>
              )}
              </div>

            {/* Conflict Warnings */}
            {(conflicts.personnel.existing.length > 0 || conflicts.vehicles.existing.length > 0 || conflicts.stores.existing.length > 0) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <h4 className="font-semibold text-amber-900">Çakışma Tespit Edildi</h4>
              </div>
                <p className="text-sm text-amber-800">
                  Excel dosyasında bulunan bazı kayıtlar veritabanında zaten mevcut. 
                  Aşağıdaki seçeneklerden birini seçerek devam edebilirsiniz.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <div className="text-sm text-gray-600 mb-2">
                <strong>Ne yapmak istiyorsunuz?</strong>
              </div>

              {/* Only New Records */}
              {(conflicts.personnel.new.length > 0 || conflicts.vehicles.new.length > 0 || conflicts.stores.new.length > 0) && (
                <button
                  onClick={() => handleConfirmedUpload('new_only')}
                  disabled={uploading}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  <span>Sadece Yeni Kayıtları Ekle</span>
                  <span className="text-green-200">
                    ({conflicts.personnel.new.length + conflicts.vehicles.new.length + conflicts.stores.new.length} kayıt)
                  </span>
                </button>
              )}

              {/* Only Update Existing */}
              {(conflicts.personnel.existing.length > 0 || conflicts.vehicles.existing.length > 0 || conflicts.stores.existing.length > 0) && (
                <button
                  onClick={() => handleConfirmedUpload('update_only')}
                  disabled={uploading}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 px-6 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-5 h-5" />
                  <span>Sadece Mevcut Kayıtları Güncelle</span>
                  <span className="text-amber-200">
                    ({conflicts.personnel.existing.length + conflicts.vehicles.existing.length + conflicts.stores.existing.length} kayıt)
                  </span>
                </button>
              )}

              {/* All Records */}
              <button
                onClick={() => handleConfirmedUpload('all')}
                disabled={uploading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                <span>Tüm Kayıtları İşle (Yeni + Güncelle)</span>
                <span className="text-blue-200">
                  ({previewData.personnel.length + previewData.vehicles.length + previewData.stores.length} kayıt)
                </span>
              </button>

              {/* Cancel */}
              <button
                onClick={() => setShowConfirmation(false)}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 px-6 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                <span>İptal Et</span>
              </button>
            </div>

            {uploading && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-blue-800">Veriler işleniyor, lütfen bekleyin...</span>
                </div>
        </div>
      )}
        </div>
      </div>
      )}
    </div>
  );
};

export default FileUpload; 