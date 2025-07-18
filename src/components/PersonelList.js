import React, { useState, useEffect } from 'react';
import { Search, Users, Filter, UserCheck, MapPin, Calendar, Plus, Edit3, Trash2, Sun, Moon, BarChart3, Car, Truck, Upload } from 'lucide-react';
import { getAllPersonnel, addPersonnel, updatePersonnel, deletePersonnel } from '../services/supabase';
import * as XLSX from 'xlsx';

const PersonelList = ({ personnelData: propPersonnelData, onPersonnelUpdate, userRole }) => {
  const [personnelData, setPersonnelData] = useState(propPersonnelData || []);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [gorevFilter, setGorevFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('cards');
  
  // Excel yükleme için state'ler
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelSuccess, setExcelSuccess] = useState(false);
  const [excelError, setExcelError] = useState(null);
  const [excelStats, setExcelStats] = useState(null); // Yükleme istatistikleri için
  
  // Modal states
  const [showAddPersonnelModal, setShowAddPersonnelModal] = useState(false);
  const [showEditPersonnelModal, setShowEditPersonnelModal] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState(null);
  const [formData, setFormData] = useState({
    employee_code: '',
    full_name: '',
    position: 'ŞOFÖR',
    shift_type: 'gunduz',
    is_active: true
    // experience_level kaldırıldı - veritabanında yok
    // performance_score kaldırıldı - veritabanında yok
  });

  // Excel yükleme fonksiyonu
  const handleExcelUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('📁 Excel dosyası yükleniyor:', file.name);
    setExcelLoading(true);
    setExcelError(null);
    setExcelSuccess(false);
    setExcelStats(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // İlk sheet'i al
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        console.log('📊 Excel verisi:', jsonData);
        console.log('🔍 Excel format kontrol:');
        console.log('  A kolonu (BÖLGE):', jsonData[1]?.[0], '(atlanır)');
        console.log('  B kolonu (SICIL NO):', jsonData[1]?.[1]);
        console.log('  C kolonu (ADI SOYADI):', jsonData[1]?.[2]);
        console.log('  D kolonu (GOREV):', jsonData[1]?.[3]);
        console.log('  E kolonu (VARDIYA):', jsonData[1]?.[4]);
        
        // Başlık satırını atla ve personel verilerini çıkar
        const personnelFromExcel = [];
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row[2] || !row[3]) continue; // Boş satırları atla (C ve D kolonu kontrol)
          
          // A kolonu: BÖLGE (çekmeye gerek yok)
          const employeeCode = row[1]; // B kolonu - SICIL NO
          const fullName = row[2]; // C kolonu - ADI SOYADI
          const position = row[3]; // D kolonu - GOREV
          const vardiyaInfo = row[4]; // E kolonu - VARDIYA
          
          // Employee code kontrolü - Excel'de yoksa isimden oluştur
          let finalEmployeeCode = employeeCode;
          if (!finalEmployeeCode || finalEmployeeCode.toString().trim() === '') {
            finalEmployeeCode = fullName.replace(/\s+/g, '').toUpperCase().substring(0, 10); // İlk 10 karakter
          }
          
          console.log(`🔢 Employee code: "${finalEmployeeCode}" (orijinal: "${row[1]}")`);
          
          // Vardiya tipini belirle
          let shiftType = 'gunduz';
          if (vardiyaInfo) {
            const vardiyaStr = vardiyaInfo.toString().toLowerCase();
            
            // Önce yıllık izin kontrolü yap
            if (vardiyaStr.includes('yıllık izin') || vardiyaStr.includes('yillik izin') || 
                vardiyaStr.includes('izin') || vardiyaStr.includes('rapor') || 
                vardiyaStr.includes('tatil') || vardiyaStr.includes('izinli')) {
              shiftType = 'izin';
            }
            // Sonra gece vardiyası kontrolü
            else if (vardiyaStr.includes('22:00') || vardiyaStr.includes('23:00') || 
                     vardiyaStr.includes('00:00') || vardiyaStr.includes('06:00') ||
                     (vardiyaStr.includes('gece') && !vardiyaStr.includes('izin'))) {
              shiftType = 'gece';
            }
            // Diğer durumlar gündüz
            else {
              shiftType = 'gunduz';
            }
          }
          
          console.log(`👤 ${fullName} - Pozisyon: ${position} - Vardiya: ${vardiyaInfo} → ${shiftType}`);
          
          const personnelRecord = {
            employee_code: finalEmployeeCode,
            full_name: fullName,
            position: position || 'SEVKIYAT ELEMANI',
            shift_type: shiftType.toUpperCase(), // Büyük harfle kaydet
            is_active: true
            // experience_level kaldırıldı - veritabanında yok
            // performance_score kaldırıldı - veritabanında yok
          };
          
          console.log(`📋 Personel kaydı hazırlandı:`, personnelRecord);
          personnelFromExcel.push(personnelRecord);
        }
        
        console.log('✅ Excel\'den çıkarılan personel:', personnelFromExcel);
        console.log('📊 Çıkarılan personel sayısı:', personnelFromExcel.length);
        
        if (personnelFromExcel.length === 0) {
          throw new Error('Excel dosyasından personel verisi çıkarılamadı. Lütfen format kontrolü yapın.');
        }
        
        // Mevcut personel sayısını al (duplicate kontrolü için)
        const beforeCount = personnelData.length;
        console.log(`📊 Mevcut personel sayısı: ${beforeCount}`);
        
        // Mevcut personel kodlarını al (duplicate kontrolü için)
        const existingCodes = new Set(personnelData.map(p => p.employee_code));
        console.log(`📊 Mevcut personel kodları:`, Array.from(existingCodes));
        
        // Personel verilerini veritabanına kaydet
        let successCount = 0;
        let errorCount = 0;
        let duplicateCount = 0;
        let newPersonnel = [];
        let duplicatePersonnel = [];
        
        for (const personnel of personnelFromExcel) {
          try {
            console.log(`💾 Kaydediliyor: ${personnel.full_name}`, personnel);
            
            // Duplicate kontrolü
            const isDuplicate = existingCodes.has(personnel.employee_code);
            if (isDuplicate) {
              duplicateCount++;
              duplicatePersonnel.push(personnel.full_name);
              console.log(`🔄 Duplicate kayıt: ${personnel.full_name} (${personnel.employee_code})`);
            } else {
              newPersonnel.push(personnel.full_name);
              console.log(`🆕 Yeni kayıt: ${personnel.full_name} (${personnel.employee_code})`);
            }
            
            const result = await addPersonnel(personnel);
            console.log(`📡 Kaydetme sonucu:`, result);
            
            if (result.success) {
              successCount++;
              console.log(`✅ ${personnel.full_name} başarıyla kaydedildi`);
            } else {
              errorCount++;
              console.error(`❌ ${personnel.full_name} kaydedilemedi:`, result.error);
            }
          } catch (error) {
            errorCount++;
            console.error(`❌ ${personnel.full_name} kaydetme hatası:`, error);
          }
        }
        
        console.log(`✅ ${successCount} personel başarıyla işlendi`);
        console.log(`🆕 ${newPersonnel.length} yeni personel`);
        console.log(`🔄 ${duplicateCount} duplicate personel`);
        console.log(`❌ ${errorCount} personel eklenemedi`);
        
        // Personel listesini yenile
        console.log('🔄 Personel listesi yenileniyor...');
        await refreshData();
        console.log('🔄 Personel listesi yenilendi, yeni personel sayısı:', personnelData.length);
        
        // Sonuç mesajını hazırla
        const afterCount = personnelData.length;
        const actualNewCount = afterCount - beforeCount;
        
        console.log(`📊 Önceki sayı: ${beforeCount}, Sonraki sayı: ${afterCount}, Gerçek artış: ${actualNewCount}`);
        
        // İstatistikleri kaydet
        setExcelStats({
          total: personnelFromExcel.length,
          newCount: actualNewCount,
          duplicateCount: duplicateCount,
          errorCount: errorCount,
          newPersonnel: newPersonnel,
          duplicatePersonnel: duplicatePersonnel
        });
        
        if (actualNewCount === 0 && duplicateCount > 0) {
          // Hiç yeni kayıt yok, sadece duplicate'lar var
          setExcelError(`Hiç yeni personel eklenmedi! ${duplicateCount} kayıt zaten mevcut.`);
        } else if (actualNewCount > 0 && duplicateCount > 0) {
          // Hem yeni hem duplicate kayıtlar var
          setExcelSuccess(true);
          setTimeout(() => {
            setExcelSuccess(false);
            setExcelStats(null);
          }, 5000);
          console.log(`ℹ️ Karışık sonuç: ${actualNewCount} yeni, ${duplicateCount} duplicate`);
        } else if (actualNewCount > 0 && duplicateCount === 0) {
          // Sadece yeni kayıtlar var
          setExcelSuccess(true);
          setTimeout(() => {
            setExcelSuccess(false);
            setExcelStats(null);
          }, 3000);
        } else {
          // Hiç işlem yapılmadı
          setExcelError(`Hiç personel işlenemedi! ${errorCount} hata oluştu.`);
        }
        
      } catch (error) {
        console.error('❌ Excel işleme hatası:', error);
        setExcelError('Excel dosyası işlenirken hata oluştu: ' + error.message);
        setExcelSuccess(false); // Error durumunda success'i temizle
        setExcelStats(null); // Error durumunda stats'i temizle
      } finally {
        setExcelLoading(false);
        // File input'u temizle
        event.target.value = '';
      }
    };
    
    reader.onerror = (error) => {
      console.error('❌ Dosya okuma hatası:', error);
      setExcelError('Dosya okuma hatası oluştu');
      setExcelSuccess(false);
      setExcelStats(null);
      setExcelLoading(false);
    };
    
    reader.readAsBinaryString(file);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const personnelResult = await getAllPersonnel();
        
        if (personnelResult.success) {
          console.log('✅ Personel verileri veritabanından yüklendi:', personnelResult.data.length, 'kayıt');
          setPersonnelData(personnelResult.data);
          // onPersonnelUpdate callback'ini kaldırdık - sonsuz döngü yaratıyordu
        }
      } catch (error) {
        console.error('❌ Veri yükleme hatası:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // Sadece prop data yoksa veritabanından yükle
    if (!propPersonnelData || propPersonnelData.length === 0) {
      loadData();
    } else {
      setPersonnelData(propPersonnelData);
    }
  }, [propPersonnelData]);

  // Veri yenileme fonksiyonu
  const refreshData = async () => {
    console.log('🔄 refreshData başladı');
    setLoading(true);
    try {
      const personnelResult = await getAllPersonnel();
      console.log('📡 getAllPersonnel sonucu:', personnelResult);
      
      if (personnelResult.success) {
        console.log('✅ Personel verileri yenilendi:', personnelResult.data.length, 'kayıt');
        console.log('👥 Personel listesi:', personnelResult.data);
        setPersonnelData(personnelResult.data);
        // onPersonnelUpdate callback'ini kaldırdık - sonsuz döngü yaratıyordu
      } else {
        console.error('❌ Personel verileri yenilenemedi:', personnelResult.error);
      }
    } catch (error) {
      console.error('❌ Veri yenileme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Gereksiz useEffect kaldırıldı - sonsuz döngü yaratıyordu

  const filteredPersonel = personnelData.filter(personel => {
    const matchesSearch = personel.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         personel.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         personel.employee_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGorev = gorevFilter === 'ALL' || personel.position === gorevFilter;
    
    return matchesSearch && matchesGorev;
  }).sort((a, b) => {
    // Sevkiyat elemanlarını önce, şoförleri sonra sırala
    const aIsDriver = a.position?.toUpperCase().includes('ŞOFÖR') || a.position?.toUpperCase().includes('SOFOR');
    const bIsDriver = b.position?.toUpperCase().includes('ŞOFÖR') || b.position?.toUpperCase().includes('SOFOR');
    
    if (aIsDriver && !bIsDriver) return 1;  // a şoför, b sevkiyat -> b önce
    if (!aIsDriver && bIsDriver) return -1; // a sevkiyat, b şoför -> a önce
    
    // Aynı tipteyse isimlerine göre sırala
    return a.full_name?.localeCompare(b.full_name, 'tr-TR') || 0;
  });

  // Vardiya tipini belirle
  const getVardiyaType = (vardiya) => {
    if (!vardiya) return 'belirsiz';
    
    const normalizedVardiya = vardiya.toString().toLowerCase().trim();
    
    if (normalizedVardiya === 'gece') return 'gece';
    if (normalizedVardiya === 'gunduz') return 'gunduz';
    if (normalizedVardiya === 'izin') return 'izin';
    if (normalizedVardiya === 'belirsiz') return 'belirsiz';
    
    // Önce yıllık izin kontrolü yap
    if (normalizedVardiya.includes('yıllık izin') || normalizedVardiya.includes('yillik izin') || 
        normalizedVardiya.includes('izin') || normalizedVardiya.includes('rapor') || 
        normalizedVardiya.includes('tatil') || normalizedVardiya.includes('izinli')) {
      return 'izin';
    }
    
    // Sonra gece vardiyası kontrolü (izin içermiyorsa)
    if ((normalizedVardiya.includes('gece') && !normalizedVardiya.includes('izin')) || 
        normalizedVardiya.includes('22:00') || normalizedVardiya.includes('23:00') || 
        normalizedVardiya.includes('00:00') || normalizedVardiya.includes('06:00')) {
      return 'gece';
    }
    
    // Gündüz vardiyası kontrolü
    if (normalizedVardiya.includes('gunduz') || normalizedVardiya.includes('gündüz') || 
        normalizedVardiya.includes('08:00') || normalizedVardiya.includes('16:00')) {
      return 'gunduz';
    }
    
    return 'belirsiz';
  };

  const getVardiyaBadge = (vardiya) => {
    const type = getVardiyaType(vardiya);
    
    switch (type) {
      case 'gece':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-300">
            <Moon className="w-4 h-4 mr-1" />
            Gece
          </span>
        );
      case 'gunduz':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
            <Sun className="w-4 h-4 mr-1" />
            Gündüz
          </span>
        );
      case 'izin':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-300">
            <Calendar className="w-4 h-4 mr-1" />
            İzin
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-300">
            <Calendar className="w-4 h-4 mr-1" />
            Belirsiz
          </span>
        );
    }
  };

  const getPositionBadge = (position) => {
    if (!position) return '-';
    
    const positionUpper = position.toUpperCase();
    
    if (positionUpper.includes('ŞOFÖR') || positionUpper.includes('SOFOR')) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-300">
          <Users className="w-4 h-4 mr-1" />
          Şoför
        </span>
      );
    }
    
    if (positionUpper.includes('SEVKİYAT') || positionUpper.includes('SEVKIYAT')) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-300">
          <UserCheck className="w-4 h-4 mr-1" />
          Sevkiyat Elemanı
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-300">
        {position}
      </span>
    );
  };

  // Şoför ve sevkiyat elemanı istatistikleri
  const soforler = personnelData.filter(p => p.position === 'ŞOFÖR');
  const sevkiyatlar = personnelData.filter(p => p.position === 'SEVKİYAT ELEMANI');
  
  // Şoför vardiya dağılımı
  const soforGeceVardiyasi = soforler.filter(p => getVardiyaType(p.shift_type) === 'gece');
  const soforGunduzVardiyasi = soforler.filter(p => getVardiyaType(p.shift_type) === 'gunduz');
  const soforIzinli = soforler.filter(p => getVardiyaType(p.shift_type) === 'izin');
  
  // Sevkiyat elemanı vardiya dağılımı
  const sevkiyatGeceVardiyasi = sevkiyatlar.filter(p => getVardiyaType(p.shift_type) === 'gece');
  const sevkiyatGunduzVardiyasi = sevkiyatlar.filter(p => getVardiyaType(p.shift_type) === 'gunduz');
  const sevkiyatIzinli = sevkiyatlar.filter(p => getVardiyaType(p.shift_type) === 'izin');
  
  // Genel vardiya istatistikleri
  const izinliPersonel = personnelData.filter(p => getVardiyaType(p.shift_type) === 'izin');
  const geceVardiyasi = personnelData.filter(p => getVardiyaType(p.shift_type) === 'gece');
  const gunduzVardiyasi = personnelData.filter(p => getVardiyaType(p.shift_type) === 'gunduz');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Personel CRUD fonksiyonları
  const handleAddPersonnel = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await addPersonnel(formData);
      if (result.success) {
        setShowAddPersonnelModal(false);
        setFormData({
          employee_code: '',
          full_name: '',
          position: 'ŞOFÖR',
          shift_type: 'gunduz',
          is_active: true
          // experience_level kaldırıldı - veritabanında yok
          // performance_score kaldırıldı - veritabanında yok
        });
        await refreshData();
        alert('Personel başarıyla eklendi!');
      } else {
        alert('Personel eklenirken hata oluştu: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Personel ekleme hatası:', error);
      alert('Personel eklenirken hata oluştu!');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPersonnel = (person) => {
    setEditingPersonnel(person);
    console.log('👤 Düzenlenecek personel RAW:', person);
    console.log('📝 Vardiya bilgisi RAW:', person.shift_type);
    console.log('📝 Vardiya bilgisi TYPE:', typeof person.shift_type);
    console.log('📝 Vardiya bilgisi LENGTH:', person.shift_type ? person.shift_type.length : 'null');
    console.log('📝 Vardiya bilgisi TRIM:', person.shift_type ? person.shift_type.trim() : 'null');
    
    // Vardiya bilgisini normalize et
    const normalizedShiftType = person.shift_type ? person.shift_type.trim().toLowerCase() : 'gunduz';
    console.log('📝 Normalized shift_type:', normalizedShiftType);
    
    const formShiftType = normalizedShiftType === 'gece' ? 'gece' : 
                         normalizedShiftType === 'izin' ? 'izin' : 'gunduz';
    console.log('📝 Form shift_type:', formShiftType);
    
    setFormData({
      employee_code: person.employee_code || '',
      full_name: person.full_name || '',
      position: person.position || 'ŞOFÖR',
      shift_type: formShiftType,
      is_active: person.is_active !== undefined ? person.is_active : true
      // experience_level kaldırıldı - veritabanında yok
      // performance_score kaldırıldı - veritabanında yok
    });
    setShowEditPersonnelModal(true);
  };

  const handleUpdatePersonnel = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await updatePersonnel(editingPersonnel.id, formData);
      if (result.success) {
        setShowEditPersonnelModal(false);
        setEditingPersonnel(null);
        await refreshData();
        alert('Personel başarıyla güncellendi!');
      } else {
        alert('Personel güncellenirken hata oluştu: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Personel güncelleme hatası:', error);
      alert('Personel güncellenirken hata oluştu!');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePersonnel = async (id) => {
    if (!window.confirm('Bu personeli silmek istediğinizden emin misiniz?')) {
      return;
    }

    setLoading(true);
    
    try {
      const result = await deletePersonnel(id);
      if (result.success) {
        await refreshData();
        alert('Personel başarıyla silindi!');
      } else {
        alert('Personel silinirken hata oluştu: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Personel silme hatası:', error);
      alert('Personel silinirken hata oluştu!');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Veriler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              Personel Listesi
            </h1>
            <p className="text-gray-600 mt-2">Sisteme kayıtlı {personnelData.length} personel</p>
          </div>
          
          <div className="flex items-center gap-3">
            {(userRole === 'admin' || userRole === 'yönetici') && (
              <button
                onClick={() => setShowAddPersonnelModal(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                Personel Ekle
              </button>
            )}
            
            {(userRole === 'admin' || userRole === 'yönetici') && (
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="hidden"
                  disabled={excelLoading}
                />
                <div className={`px-6 py-3 rounded-xl text-white flex items-center gap-2 font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                  excelLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                }`}>
                {excelLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Yükleniyor...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>Excel'den Yükle</span>
                  </>
                )}
              </div>
            </label>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Personel adı veya sicil numarası ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
            />
          </div>
          
          {/* Filter Tabs */}
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setGorevFilter('ALL')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  gorevFilter === 'ALL'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-4 h-4" />
                Tümü
              </button>
              <button
                onClick={() => setGorevFilter('ŞOFÖR')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  gorevFilter === 'ŞOFÖR'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Car className="w-4 h-4" />
                Şoförler
              </button>
              <button
                onClick={() => setGorevFilter('SEVKİYAT ELEMANI')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  gorevFilter === 'SEVKİYAT ELEMANI'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Truck className="w-4 h-4" />
                Sevkiyat
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          {/* Şoför İstatistikleri */}
          <div className="bg-blue-50 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">{soforler.length}</p>
                <p className="text-sm text-blue-600">Şoför</p>
              </div>
            </div>
            <div className="text-xs text-blue-700 space-y-1">
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Moon className="w-3 h-3" />
                  Gece
                </span>
                <span className="font-medium">{soforGeceVardiyasi.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Sun className="w-3 h-3" />
                  Gündüz
                </span>
                <span className="font-medium">{soforGunduzVardiyasi.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  İzinli
                </span>
                <span className="font-medium">{soforIzinli.length}</span>
              </div>
            </div>
          </div>
          
          {/* Sevkiyat Elemanı İstatistikleri */}
          <div className="bg-green-50 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">{sevkiyatlar.length}</p>
                <p className="text-sm text-green-600">Sevkiyat Elemanı</p>
              </div>
            </div>
            <div className="text-xs text-green-700 space-y-1">
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Moon className="w-3 h-3" />
                  Gece
                </span>
                <span className="font-medium">{sevkiyatGeceVardiyasi.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Sun className="w-3 h-3" />
                  Gündüz
                </span>
                <span className="font-medium">{sevkiyatGunduzVardiyasi.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  İzinli
                </span>
                <span className="font-medium">{sevkiyatIzinli.length}</span>
              </div>
            </div>
          </div>
          
          {/* Toplam Personel */}
          <div className="bg-purple-50 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-900">{personnelData.length}</p>
                <p className="text-sm text-purple-600">Toplam Personel</p>
              </div>
            </div>
            <div className="text-xs text-purple-700 space-y-1">
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Moon className="w-3 h-3" />
                  Gece
                </span>
                <span className="font-medium">{geceVardiyasi.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Sun className="w-3 h-3" />
                  Gündüz
                </span>
                <span className="font-medium">{gunduzVardiyasi.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  İzinli
                </span>
                <span className="font-medium">{izinliPersonel.length}</span>
              </div>
            </div>
          </div>
          
          {/* Genel İstatistik */}
          <div className="bg-slate-50 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-slate-500 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">%{Math.round((personnelData.length - izinliPersonel.length) / personnelData.length * 100) || 0}</p>
                <p className="text-sm text-slate-600">Aktif Oran</p>
              </div>
            </div>
            <div className="text-xs text-slate-700 space-y-1">
              <div className="flex justify-between">
                <span>Şoför/Sevkiyat Elemanı</span>
                <span className="font-medium">{soforler.length}/{sevkiyatlar.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Gece/Gündüz</span>
                <span className="font-medium">{geceVardiyasi.length}/{gunduzVardiyasi.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Aktif/İzinli</span>
                <span className="font-medium">{personnelData.length - izinliPersonel.length}/{izinliPersonel.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Excel Yükleme Mesajları */}
      {excelSuccess && (
        <div className="bg-green-100 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-800 font-semibold">Excel dosyası başarıyla yüklendi!</p>
          </div>
          {excelStats && (
            <div className="text-sm text-green-700 space-y-1">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <strong>{excelStats.newCount}</strong> yeni personel eklendi
                </span>
                {excelStats.duplicateCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    <strong>{excelStats.duplicateCount}</strong> duplicate (güncellendi)
                  </span>
                )}
                {excelStats.errorCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <strong>{excelStats.errorCount}</strong> hata
                  </span>
                )}
              </div>
              {excelStats.duplicateCount > 0 && (
                <div className="text-xs text-green-600 mt-2">
                  <strong>Duplicate kayıtlar:</strong> {excelStats.duplicatePersonnel.slice(0, 3).join(', ')}
                  {excelStats.duplicatePersonnel.length > 3 && ` ve ${excelStats.duplicatePersonnel.length - 3} diğer...`}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {excelError && (
        <div className="bg-red-100 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-800 font-semibold">{excelError}</p>
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setViewMode('cards')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'cards' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}
        >
          Kart Görünümü
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewMode === 'table' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}
        >
          Tablo Görünümü
        </button>
      </div>

      {/* Personnel Cards */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPersonel.map((person, index) => (
            <div key={index} className={`relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-t-4 ${
              person.position === 'ŞOFÖR' ? 'border-blue-500' : 'border-green-500'
            }`}>
              {/* Position Badge at Top */}
              <div className="absolute -top-2 left-6">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                  person.position === 'ŞOFÖR' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-green-500 text-white'
                }`}>
                  {person.position === 'ŞOFÖR' ? <Car className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                  {person.position}
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-4 mt-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    person.position === 'ŞOFÖR' 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                      : 'bg-gradient-to-r from-green-500 to-green-600'
                  }`}>
                    {person.position === 'ŞOFÖR' ? <Car className="w-6 h-6 text-white" /> : <Truck className="w-6 h-6 text-white" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{person.full_name}</h3>
                    <p className="text-gray-600 text-sm">#{person.employee_code}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {(userRole === 'admin' || userRole === 'yönetici') && (
                    <>
                      <button
                        onClick={() => handleEditPersonnel(person)}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePersonnel(person.id)}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Vardiya:</span>
                  {getVardiyaBadge(person.shift_type)}
                </div>
                
                {/* Additional Info */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Durumu:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    person.is_active === false || person.shift_type === 'izin'
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {person.is_active === false || person.shift_type === 'izin' ? 'İzinli' : 'Aktif'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Personnel Table */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">#</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Sicil No</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Ad Soyad</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Görev</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Vardiya</th>
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredPersonel.map((person, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 text-gray-600">{index + 1}</td>
                    <td className="py-4 px-6">
                      <span className="font-medium text-gray-900">{person.employee_code}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                          <Users className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-medium text-gray-900">{person.full_name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {getPositionBadge(person.position)}
                    </td>
                    <td className="py-4 px-6">
                      {getVardiyaBadge(person.shift_type)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {(userRole === 'admin' || userRole === 'yönetici') && (
                          <>
                            <button
                              onClick={() => handleEditPersonnel(person)}
                              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePersonnel(person.id)}
                              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredPersonel.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Personel bulunamadı</p>
        </div>
      )}

      {/* Add Personnel Modal */}
      {showAddPersonnelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full m-4">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">Yeni Personel Ekle</h3>
            
            <form onSubmit={handleAddPersonnel} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sicil No</label>
                <input
                  type="text"
                  name="employee_code"
                  value={formData.employee_code}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ad Soyad</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Görev</label>
                <select
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ŞOFÖR">Şoför</option>
                  <option value="SEVKİYAT ELEMANI">Sevkiyat Elemanı</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vardiya</label>
                <select
                  name="shift_type"
                  value={formData.shift_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="gunduz">Gündüz</option>
                  <option value="gece">Gece</option>
                  <option value="izin">İzin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
                <select
                  name="is_active"
                  value={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="true">Aktif</option>
                  <option value="false">İzinli</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddPersonnelModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Personnel Modal */}
      {showEditPersonnelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full m-4">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">Personel Düzenle</h3>
            
            <form onSubmit={handleUpdatePersonnel} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sicil No</label>
                <input
                  type="text"
                  name="employee_code"
                  value={formData.employee_code}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ad Soyad</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Görev</label>
                <select
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ŞOFÖR">Şoför</option>
                  <option value="SEVKİYAT ELEMANI">Sevkiyat Elemanı</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vardiya</label>
                <select
                  name="shift_type"
                  value={formData.shift_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="gunduz">Gündüz</option>
                  <option value="gece">Gece</option>
                  <option value="izin">İzin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
                <select
                  name="is_active"
                  value={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="true">Aktif</option>
                  <option value="false">İzinli</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditPersonnelModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonelList; 