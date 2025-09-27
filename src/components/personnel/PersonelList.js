import React, { useState, useEffect } from 'react';
import { Search, Users, Filter, UserCheck, MapPin, Calendar, Plus, Trash2, Sun, Moon, BarChart3, Car, Truck, Upload, Edit } from 'lucide-react';
import { getAllPersonnel, addPersonnelWithAudit, deletePersonnelWithAudit, getPersonnelShiftDetails, getWeeklyPeriods, getWeeklySchedules, getCurrentWeeklyShifts, saveCurrentWeekExcelData, supabase } from '../../services/supabase';
import * as XLSX from 'xlsx';


const PersonelList = ({ personnelData: propPersonnelData, onPersonnelUpdate, userRole, currentShiftData = [], currentUser }) => {
  const [personnelData, setPersonnelData] = useState(propPersonnelData || []);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [gorevFilter, setGorevFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('table');
  
  // Debug: userRole'u console'a yazdır
  console.log('🔍 PersonelList - userRole:', userRole);
  console.log('🔍 PersonelList - currentUser:', currentUser);
  
  // Vardiya istatistikleri için state
  const [shiftStatistics, setShiftStatistics] = useState({});
  const [weeklyPeriods, setWeeklyPeriods] = useState([]);

  

  
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

  // Güncel vardiya dönemini bulma fonksiyonu
  const getCurrentPeriod = () => {
    try {
      // Tüm weekly_periods'ları çek
      const allPeriods = weeklyPeriods || [];
      
      if (allPeriods.length === 0) {
        
        return null;
      }

      // week_label'daki tarihi parse edip en güncel olanı bul
      let latestPeriod = null;
      let latestDate = null;

      
      allPeriods.forEach((period, index) => {
   

        try {
          const weekLabel = period.week_label;
          if (!weekLabel) {
          
            return;
          }

          const dateMatch = weekLabel.match(/(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+-\s+(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(\d{4})/);

          if (dateMatch) {
            const [, startDay, startMonth, endDay, endMonth, year] = dateMatch;
            const monthMap = {
              'Ocak': 0, 'Şubat': 1, 'Mart': 2, 'Nisan': 3, 'Mayıs': 4, 'Haziran': 5,
              'Temmuz': 6, 'Ağustos': 7, 'Eylül': 8, 'Ekim': 9, 'Kasım': 10, 'Aralık': 11
            };

            const startMonthNum = monthMap[startMonth];
            const endMonthNum = monthMap[endMonth];


            if (startMonthNum !== undefined && endMonthNum !== undefined) {
              const periodDate = new Date(parseInt(year), startMonthNum, parseInt(startDay));
              const today = new Date();
              today.setHours(0, 0, 0, 0); // Bugünün başlangıcı


              // Sadece bugünden küçük veya eşit tarihleri kabul et
              if (periodDate <= today) {
                if (!latestDate || periodDate > latestDate) {
                  latestDate = periodDate;
                  latestPeriod = period;
                 
                }
              } else {
             
              }
            } else {
           
            }
          } else {
          
          }
        } catch (error) {
          
        }
      });

      if (!latestPeriod) {
    
        // Fallback: en son yüklenen veriyi kullan
        latestPeriod = allPeriods[0];
      }

      
      return latestPeriod;
    } catch (error) {
   
      return null;
    }
  };



  // Vardiya istatistikleri hesaplama fonksiyonu
  const calculateShiftStatistics = async () => {
    try {
   
      const stats = {};
      
      // Her personel için vardiya verilerini çek
      for (const person of personnelData) {
        try {
          const result = await getPersonnelShiftDetails(person.employee_code);
          
          if (result.success && result.data) {
            const personSchedules = result.data;
            
            // Vardiya tiplerini say
            const nightShifts = personSchedules.filter(s => s.shift_type === 'gece').length;
            const dayShifts = personSchedules.filter(s => s.shift_type === 'gunduz').length;
            const eveningShifts = personSchedules.filter(s => s.shift_type === 'aksam').length;
            const totalDays = personSchedules.length;
            
            stats[person.full_name] = {
              nightShifts,
              dayShifts,
              eveningShifts,
              totalDays
            };
            
           
          } else {
            stats[person.full_name] = {
              nightShifts: 0,
              dayShifts: 0,
              eveningShifts: 0,
              totalDays: 0
            };
          }
        } catch (error) {
        
          stats[person.full_name] = {
            nightShifts: 0,
            dayShifts: 0,
            eveningShifts: 0,
            totalDays: 0
          };
        }
      }
      
      setShiftStatistics(stats);
    
    } catch (error) {
    
    }
  };

  // Excel yükleme fonksiyonu
  const handleExcelUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
    

      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const workbook = XLSX.read(e.target.result, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // İlk satırı başlık olarak kullan
            const headers = jsonData[0];
            const rows = jsonData.slice(1);
            
            const result = rows.map(row => {
              const obj = {};
              headers.forEach((header, index) => {
                obj[header] = row[index];
              });
              return obj;
            });
            
            resolve(result);
          } catch (error) {
            reject(error);
          }
        };
        reader.readAsBinaryString(file);
      });

    

      // Excel'den tarih bilgisini çıkar
      const firstRow = data[0];
      let weekLabel = '';
      let startDate = '';
      let endDate = '';

      // Excel'deki sütun başlıklarını kontrol et
      Object.keys(firstRow).forEach(key => {
        if (key.includes('Temmuz') || key.includes('Ocak') || key.includes('Şubat') || 
            key.includes('Mart') || key.includes('Nisan') || key.includes('Mayıs') || 
            key.includes('Haziran') || key.includes('Ağustos') || key.includes('Eylül') || 
            key.includes('Ekim') || key.includes('Kasım') || key.includes('Aralık')) {
          weekLabel = key;
          
          // Tarih formatını parse et: "20 Temmuz - 26 Temmuz 2025"
          const dateMatch = key.match(/(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+-\s+(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(\d{4})/);
          
          if (dateMatch) {
            const [, startDay, startMonth, endDay, endMonth, year] = dateMatch;
            const monthMap = {
              'Ocak': '01', 'Şubat': '02', 'Mart': '03', 'Nisan': '04', 'Mayıs': '05', 'Haziran': '06',
              'Temmuz': '07', 'Ağustos': '08', 'Eylül': '09', 'Ekim': '10', 'Kasım': '11', 'Aralık': '12'
            };
            
            startDate = `${year}-${monthMap[startMonth]}-${startDay.padStart(2, '0')}`;
            endDate = `${year}-${monthMap[endMonth]}-${endDay.padStart(2, '0')}`;
          }
        }
      });

     

      if (!weekLabel) {
        alert('Excel dosyasında tarih bilgisi bulunamadı!');
        return;
      }

      // Yeni sistemi kullanarak verileri kaydet
      const result = await saveCurrentWeekExcelData(data, weekLabel, startDate, endDate);
      
      if (result.success) {
    
        alert(`Güncel hafta verileri başarıyla yüklendi!\n${data.length} personel kaydı işlendi.`);
        
        // Verileri yenile
       
        await loadPersonnelData();
        await calculateShiftStatistics();
        
        // Ana sayfa güncellemesi için callback
        if (onPersonnelUpdate) {
       
          await onPersonnelUpdate();
        }
        
        
      } else {
       
        alert('Veriler kaydedilirken hata oluştu!');
      }

    } catch (error) {
   
      alert('Excel dosyası yüklenirken hata oluştu!');
    } finally {
      setLoading(false);
      // Input'u temizle
      event.target.value = '';
    }
  };

  // Veritabanından personel verilerini yükle
  const loadPersonnelData = async () => {
    setLoading(true);
    try {
      const personnelResult = await getAllPersonnel();
      
      if (personnelResult.success) {
        setPersonnelData(personnelResult.data);
      }
    } catch (error) {
     
    } finally {
      setLoading(false);
    }
  };

  // Veritabanından personel verilerini yükle
  useEffect(() => {
    loadPersonnelData();
  }, []);

  // Personel verileri yüklendiğinde vardiya verilerini de yükle
  useEffect(() => {
    if (personnelData.length > 0) {
      calculateShiftStatistics();
    }
  }, [personnelData]);

  // PropPersonnelData değiştiğinde local state'i güncelle
  useEffect(() => {
    if (propPersonnelData) {
      setPersonnelData(propPersonnelData);
    }
  }, [propPersonnelData]);

  // Vardiya istatistiklerini yükle
  useEffect(() => {
    if (personnelData.length > 0) {
      calculateShiftStatistics();
    }
  }, [personnelData]);

  // Veri yenileme fonksiyonu
  const refreshData = async () => {
  
    setLoading(true);
    try {
      const personnelResult = await getAllPersonnel();
   
      
      if (personnelResult.success) {
   
        setPersonnelData(personnelResult.data);
        // onPersonnelUpdate callback'ini kaldırdık - sonsuz döngü yaratıyordu
      } else {
       
      }
    } catch (error) {
    
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

    // Doğrudan bilinen anahtarlar
    if (normalizedVardiya === 'gece') return 'gece';
    if (normalizedVardiya === 'gunduz' || normalizedVardiya === 'gündüz') return 'gunduz';
    if (normalizedVardiya === 'aksam' || normalizedVardiya === 'akşam') return 'aksam';
    if (normalizedVardiya === 'izin') return 'izin';
    if (normalizedVardiya === 'yillik_izin' || normalizedVardiya === 'yıllık_izin') return 'yillik_izin';
    if (normalizedVardiya === 'raporlu') return 'raporlu';
    if (normalizedVardiya === 'dinlenme') return 'dinlenme';
    if (normalizedVardiya === 'gecici_gorev' || normalizedVardiya === 'geçici_görev') return 'gecici_gorev';
    if (normalizedVardiya === 'habersiz') return 'habersiz';
    if (normalizedVardiya === 'belirsiz') return 'belirsiz';

    // Anahtar kelime bazlı tespitler
    if (normalizedVardiya.includes('yıllık izin') || normalizedVardiya.includes('yillik izin')) return 'yillik_izin';
    if (normalizedVardiya.includes('rapor')) return 'raporlu';
    if (normalizedVardiya.includes('dinlenme')) return 'dinlenme';
    if (normalizedVardiya.includes('geçici') || normalizedVardiya.includes('gecici')) return 'gecici_gorev';
    if (normalizedVardiya.includes('habersiz') || normalizedVardiya.includes('gelmedi')) return 'habersiz';
    if (normalizedVardiya.includes('izin')) return 'izin';

    // Saat bazlı tespitler
    if (normalizedVardiya.includes('22:00') || normalizedVardiya.includes('23:00') || normalizedVardiya.includes('00:00') || normalizedVardiya.includes('06:00') || normalizedVardiya.includes('gece')) {
      return 'gece';
    }
    if (normalizedVardiya.includes('08:00') || normalizedVardiya.includes('16:00') || normalizedVardiya.includes('gunduz') || normalizedVardiya.includes('gündüz')) {
      return 'gunduz';
    }

    return 'belirsiz';
  };

  const getVardiyaBadge = (vardiya, employeeCode = null) => {
    // Önce güncel vardiya verilerinden kontrol et
    if (employeeCode && currentShiftData && currentShiftData.length > 0) {
      const currentShift = currentShiftData.find(shift => shift.employee_code === employeeCode);
      if (currentShift) {
        // shift_type dolu ve tanınmıyorsa shift_hours üzerinden fallback yap
        let shiftType = currentShift.shift_type;
        if (!shiftType || getVardiyaType(shiftType) === 'belirsiz') {
          shiftType = getVardiyaType(currentShift.shift_hours || currentShift.shift_details);
        } else {
          shiftType = getVardiyaType(shiftType);
        }

        switch (shiftType) {
          case 'gece':
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
                <Moon className="w-3 h-3 mr-1" />
                Gece
              </span>
            );
          case 'gunduz':
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                <Sun className="w-3 h-3 mr-1" />
                Gündüz
              </span>
            );
          case 'aksam':
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
                <Calendar className="w-3 h-3 mr-1" />
                Akşam
              </span>
            );
          case 'izin':
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300">
                🛌 İzinli
              </span>
            );
          case 'yillik_izin':
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                🏖️ Yıllık İzin
              </span>
            );
          case 'raporlu':
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300">
                🏥 Raporlu
              </span>
            );
          case 'dinlenme':
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                😴 Dinlenme
              </span>
            );
          case 'gecici_gorev':
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-300">
                <MapPin className="w-3 h-3 mr-1" />
                Geçici Görev
              </span>
            );
          case 'habersiz':
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-300">
                ❗ Habersiz
              </span>
            );
          default:
            // Son çare: vardiya alanını da parse et
            return (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                ❓ Belirsiz
              </span>
            );
        }
      }
    }

    // Eğer güncel vardiya verisi yoksa, eski yöntemi kullan
    const vardiyaType = getVardiyaType(vardiya);

    switch (vardiyaType) {
      case 'gece':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
            <Moon className="w-3 h-3 mr-1" />
            Gece
          </span>
        );
      case 'gunduz':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
            <Sun className="w-3 h-3 mr-1" />
            Gündüz
          </span>
        );
      case 'aksam':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
            <Calendar className="w-3 h-3 mr-1" />
            Akşam
          </span>
        );
      case 'izin':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300">
            🛌 İzinli
          </span>
        );
      case 'yillik_izin':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
            🏖️ Yıllık İzin
          </span>
        );
      case 'raporlu':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300">
            🏥 Raporlu
          </span>
        );
      case 'dinlenme':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
            😴 Dinlenme
          </span>
        );
      case 'gecici_gorev':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-300">
            <MapPin className="w-3 h-3 mr-1" />
            Geçici Görev
          </span>
        );
      case 'habersiz':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-300">
            ❗ Habersiz
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
            ❓ Belirsiz
          </span>
        );
    }
  };

  const getPositionBadge = (position) => {
    if (!position) return '-';
    
    const positionUpper = position.toUpperCase();
    
    if (positionUpper.includes('ŞOFÖR') || positionUpper.includes('SOFOR')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
          <Users className="w-3 h-3 mr-1" />
          Şoför
        </span>
      );
    }
    
    if (positionUpper.includes('SEVKİYAT') || positionUpper.includes('SEVKIYAT')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
          <UserCheck className="w-3 h-3 mr-1" />
          Sevkiyat Elemanı
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
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

  // Düzenleme fonksiyonları
  const handleEditPersonnel = (person) => {
    setEditingPersonnel(person);
    setFormData({
      employee_code: person.employee_code || '',
      full_name: person.full_name || '',
      position: person.position || 'ŞOFÖR',
      shift_type: person.shift_type || 'gunduz',
      is_active: person.is_active !== false
    });
    setShowEditPersonnelModal(true);
  };

  const handleUpdatePersonnel = async (e) => {
    e.preventDefault();
    if (!editingPersonnel) return;

    setLoading(true);
    
    try {
      // Supabase'de personel güncelleme
      const { error } = await supabase
        .from('personnel')
        .update({
          employee_code: formData.employee_code,
          full_name: formData.full_name,
          position: formData.position,
          shift_type: formData.shift_type,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPersonnel.id);

      if (error) {
        throw error;
      }

      setShowEditPersonnelModal(false);
      setEditingPersonnel(null);
      setFormData({
        employee_code: '',
        full_name: '',
        position: 'ŞOFÖR',
        shift_type: 'gunduz',
        is_active: true
      });
      
      await refreshData();
      alert('Personel başarıyla güncellendi!');
    } catch (error) {
      console.error('❌ Personel güncelleme hatası:', error);
      alert('Personel güncellenirken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Personel CRUD fonksiyonları
  const handleAddPersonnel = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await addPersonnelWithAudit(formData, currentUser);
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





  const handleDeletePersonnel = async (id) => {
    if (!window.confirm('Bu personeli silmek istediğinizden emin misiniz?')) {
      return;
    }

    setLoading(true);
    
    try {
      const result = await deletePersonnelWithAudit(id, currentUser);
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
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
              Personel Listesi
            </h1>
            <p className="text-sm text-gray-600 mt-1">Sisteme kayıtlı {personnelData.length} personel</p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Geçici olarak tüm kullanıcılar için göster */}
            <button
              onClick={() => setShowAddPersonnelModal(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm"
            >
              <Plus className="w-4 h-4" />
              Personel Ekle
            </button>
            
            
            
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Personel adı veya sicil numarası ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-sm"
            />
          </div>
          
          {/* Filter Tabs */}
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setGorevFilter('ALL')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-300 ${
                  gorevFilter === 'ALL'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-3 h-3" />
                Tümü
              </button>
              <button
                onClick={() => setGorevFilter('ŞOFÖR')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-300 ${
                  gorevFilter === 'ŞOFÖR'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Car className="w-3 h-3" />
                Şoförler
              </button>
              <button
                onClick={() => setGorevFilter('SEVKİYAT ELEMANI')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-300 ${
                  gorevFilter === 'SEVKİYAT ELEMANI'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Truck className="w-3 h-3" />
                Sevkiyat
              </button>
            </div>
          </div>
      </div>

      {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {/* Şoför İstatistikleri */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
              <div>
                <p className="text-lg font-bold text-blue-900">{soforler.length}</p>
                <p className="text-xs text-blue-600">Şoför</p>
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
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-white" />
          </div>
              <div>
                <p className="text-lg font-bold text-green-900">{sevkiyatlar.length}</p>
                <p className="text-xs text-green-600">Sevkiyat Elemanı</p>
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
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
          </div>
              <div>
                <p className="text-lg font-bold text-purple-900">{personnelData.length}</p>
                <p className="text-xs text-purple-600">Toplam Personel</p>
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
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-slate-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
                          </div>
                          <div>
                <p className="text-lg font-bold text-slate-900">%{Math.round((personnelData.length - izinliPersonel.length) / personnelData.length * 100) || 0}</p>
                <p className="text-xs text-slate-600">Aktif Oran</p>
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



      {/* View Toggle */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setViewMode('cards')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-sm ${
            viewMode === 'cards' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}
        >
          Kart Görünümü
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-sm ${
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPersonel.map((person, index) => (
            <div key={index} className={`relative bg-white rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-t-4 ${
              person.position === 'ŞOFÖR' ? 'border-blue-500' : 'border-green-500'
            }`}>
              {/* Position Badge at Top */}
              <div className="absolute -top-2 left-4">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  person.position === 'ŞOFÖR' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-green-500 text-white'
                }`}>
                  {person.position === 'ŞOFÖR' ? <Car className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                  {person.position}
              </div>
              </div>
              
              <div className="flex items-center justify-between mb-3 mt-3">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    person.position === 'ŞOFÖR' 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                      : 'bg-gradient-to-r from-green-500 to-green-600'
                  }`}>
                    {person.position === 'ŞOFÖR' ? <Car className="w-5 h-5 text-white" /> : <Truck className="w-5 h-5 text-white" />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{person.full_name}</h3>
                    <p className="text-gray-600 text-xs">#{person.employee_code}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Düzenleme butonu */}
                  <button
                    onClick={() => handleEditPersonnel(person)}
                    className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                    title="Personel düzenle"
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                  
                  {/* Silme butonu */}
                  <button
                    onClick={() => handleDeletePersonnel(person.id)}
                    className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    title="Personel sil"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Şu an ki vardiya:</span>
                  {getVardiyaBadge(person.shift_type, person.employee_code)}
            </div>

                
                {/* Additional Info */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Durumu:</span>
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
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">#</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">Sicil No</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">Ad Soyad</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">Görev</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">Şu an ki vardiya</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                {filteredPersonel.map((person, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-600 text-xs">{index + 1}</td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900 text-xs">{person.employee_code}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                          <Users className="w-3 h-3 text-white" />
                          </div>
                        <span className="font-medium text-gray-900 text-xs">{person.full_name}</span>
                        </div>
                      </td>
                    <td className="py-3 px-4">
                      {getPositionBadge(person.position)}
                      </td>
                                        <td className="py-3 px-4">
                      {getVardiyaBadge(person.shift_type, person.employee_code)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {/* Düzenleme butonu */}
                        <button
                          onClick={() => handleEditPersonnel(person)}
                          className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                          title="Personel düzenle"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        
                        {/* Silme butonu */}
                        <button
                          onClick={() => handleDeletePersonnel(person.id)}
                          className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                          title="Personel sil"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
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
                  list="personnel-suggestions"
                />
                <datalist id="personnel-suggestions">
                  {personnelData.map((person, index) => (
                    <option key={index} value={person.full_name} />
                  ))}
                </datalist>
                <div className="mt-1 text-xs text-gray-500">
                  Mevcut personeller: {personnelData.length} kişi
                </div>
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
                  <option value="aksam">Akşam</option>
                  <option value="izin">İzin</option>
                  <option value="raporlu">Raporlu</option>
                  <option value="gecici_gorev">Geçici Görev</option>
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
      {showEditPersonnelModal && editingPersonnel && (
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
                  <option value="aksam">Akşam</option>
                  <option value="izin">İzin</option>
                  <option value="raporlu">Raporlu</option>
                  <option value="gecici_gorev">Geçici Görev</option>
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
                  onClick={() => {
                    setShowEditPersonnelModal(false);
                    setEditingPersonnel(null);
                  }}
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