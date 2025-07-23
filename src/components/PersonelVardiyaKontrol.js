import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Users, Upload, Clock, TrendingUp, AlertCircle, CheckCircle, XCircle, BarChart3, FileText, Plus, Save, Eye, X, User, Trash2, RefreshCw, Edit, Download, Info } from 'lucide-react';
import { saveWeeklySchedules, saveWeeklyPeriods, saveDailyAttendance, getAllShiftStatistics, getDailyAttendance, getAllPersonnel, getWeeklyPeriods, getPersonnelShiftDetails, getWeeklySchedules, getDailyNotes, clearAllShiftData, saveExcelData, supabase } from '../services/supabase';
import * as XLSX from 'xlsx';

// Skeleton Loading Component
const SkeletonLoading = ({ type = 'table', rows = 5 }) => {
  // Custom pulse animation if Tailwind's animate-pulse doesn't work
  const pulseStyle = {
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
  };
  
  // Add keyframes for pulse animation
  React.useEffect(() => {
    if (!document.getElementById('pulse-keyframes')) {
      const style = document.createElement('style');
      style.id = 'pulse-keyframes';
      style.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);
  if (type === 'table') {
    return (
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900 text-xs">#</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 text-xs">Sicil No</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 text-xs">Ad Soyad</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 text-xs">Görev</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 text-xs">Şu an ki vardiya</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 text-xs">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 px-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-200 rounded-lg animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="h-6 bg-gray-200 rounded-full animate-pulse w-20"></div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="h-6 bg-gray-200 rounded-full animate-pulse w-28"></div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                      <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (type === 'cards') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-8 animate-pulse"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded mb-4 animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'stats') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-gray-200 rounded-lg" style={pulseStyle}></div>
              <div className="h-6 bg-gray-200 rounded w-8" style={pulseStyle}></div>
            </div>
            <div className="h-8 bg-gray-200 rounded mb-2" style={pulseStyle}></div>
            <div className="h-3 bg-gray-200 rounded" style={pulseStyle}></div>
          </div>
        ))}
      </div>
    );
  }

  return null;
};

const PersonelVardiyaKontrol = ({ userRole, onDataUpdate }) => {
  // getMonthName fonksiyonunu en başta tanımla
  const getMonthName = (month) => {
    const months = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return months[month] || 'Bilinmeyen';
  };

  const [activeTab, setActiveTab] = useState('overview');
  const [scheduleData, setScheduleData] = useState([]);
  const [shiftStatistics, setShiftStatistics] = useState([]);
  const [dailyAttendance, setDailyAttendance] = useState([]);
  const [personnelList, setPersonnelList] = useState([]);
  const [weeklyPeriods, setWeeklyPeriods] = useState([]); // Haftalık dönemler
  const [loading, setLoading] = useState(false);
  
  // Personel detay modalı için state'ler
  const [selectedPersonnel, setSelectedPersonnel] = useState(null);
  const [personnelDetails, setPersonnelDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [newAbsence, setNewAbsence] = useState({
    employee_code: '',
    date: new Date().toISOString().split('T')[0],
    status: '',
    notes: ''
  });
  const [absenceLoading, setAbsenceLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);
  const [statsUpdateResult, setStatsUpdateResult] = useState(null);
  
  // İstatistik güncelleme modal state'i
  const [showStatsModal, setShowStatsModal] = useState(false);
  
  // Veritabanı temizleme state'i
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  
  // Günlük takip state'leri (Supabase'e kaydedilir)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Bugünün tarihi
  });
  const [showAllDates, setShowAllDates] = useState(true); // Tüm tarihleri göster
  const [viewMode, setViewMode] = useState('calendar'); // 'list' veya 'calendar' - varsayılan takvim
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Veri olan ilk ayı bul
    const monthsWithData = new Set();
    // Bu fonksiyon component mount olmadan önce çalıştığı için dailyNotes henüz yüklenmemiş olabilir
    // Bu yüzden geçici olarak mevcut ayı kullan, sonra useEffect ile güncelle
    return `${new Date().getFullYear()}-${new Date().getMonth()}`;
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [calendarAnimation, setCalendarAnimation] = useState('slide-in'); // 'slide-in', 'slide-out-left', 'slide-out-right'
  
  // Sayfalama state'leri
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Sayfa başına gösterilecek kayıt sayısı
  const [attendanceForm, setAttendanceForm] = useState({
    employee_code: '',
    status: 'raporlu',
    reason: ''
  });
  const [dailyNotes, setDailyNotes] = useState([]);
  
  // Seçilen personel ve tarih için mevcut kayıtları gösterme
  const [existingRecords, setExistingRecords] = useState([]);
  
  // Filtre state'leri
  const [filterType, setFilterType] = useState('all'); // all, gece, gunduz, aksam, gecici, hastalik_izni, yillik_izin
  const [sortOrder, setSortOrder] = useState('name'); // name, code, position
  const [sortDirection, setSortDirection] = useState('asc'); // asc, desc - varsayılan A-Z sıralama
  
  // Günlük takip sıralama state'leri
  const [dailySortOrder, setDailySortOrder] = useState('date'); // date, name, status
  const [dailySortDirection, setDailySortDirection] = useState('desc'); // desc = en yeni önce
  const [selectedDashboardYear, setSelectedDashboardYear] = useState(new Date().getFullYear());
  
  // Aylık detay sıralama state'leri
  const [monthlySortColumn, setMonthlySortColumn] = useState('total');
  const [monthlySortDirection, setMonthlySortDirection] = useState('desc');
  
  // Aylık detay ay seçimi state'i
  const [selectedMonthlyMonth, setSelectedMonthlyMonth] = useState('all_months');
  const [selectedMonthlyYear, setSelectedMonthlyYear] = useState(new Date().getFullYear());

  const [todayStatusLoading, setTodayStatusLoading] = useState(false);
  const [todayStatus, setTodayStatus] = useState({
    raporlu: { count: 0, personnel: [] },
    habersiz: { count: 0, personnel: [] },
    yillikIzin: { count: 0, personnel: [] },
    dinlenme: { count: 0, personnel: [] }
  });

  // Personel detay modalı için tarih aralığı state'leri
  const [detailDateRange, setDetailDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [filteredPersonnelDetails, setFilteredPersonnelDetails] = useState([]);
  const [filteredDailyNotes, setFilteredDailyNotes] = useState([]);
  
  // Hafta detayları için state
  
  // Şu Anki Vardiya için state'ler
  const [currentShiftData, setCurrentShiftData] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Pazartesi
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Pazar
    return {
      startDate: startOfWeek.toISOString().split('T')[0],
      endDate: endOfWeek.toISOString().split('T')[0],
      label: `${startOfWeek.getDate()} ${getMonthName(startOfWeek.getMonth())} - ${endOfWeek.getDate()} ${getMonthName(endOfWeek.getMonth())} ${endOfWeek.getFullYear()}`
    };
  });
  const [showCurrentShiftModal, setShowCurrentShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [shiftForm, setShiftForm] = useState({
    employee_code: '',
    shift_type: 'gunduz',
    shift_hours: '08:00 - 16:00',
    status: 'dinlenme'
  });
  const [filteredPersonnelForModal, setFilteredPersonnelForModal] = useState([]);
  const [currentShiftSortConfig, setCurrentShiftSortConfig] = useState({ key: null, direction: 'asc' });

  // Mevcut dönem bilgisini hesapla
  const getCurrentPeriod = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const startDate = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`;
    const endDate = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-31`;
    const label = `${getMonthName(currentMonth)} ${currentYear}`;
    
    return { startDate, endDate, label };
  };
  const [selectedWeekDetails, setSelectedWeekDetails] = useState(null);

  // Excel upload fonksiyonu
  const handleExcelUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadLoading(true);
    setUploadMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Excel verilerini JSON'a çevir
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          
          if (jsonData.length < 2) {
            throw new Error('Excel dosyası boş veya geçersiz format');
          }

          // Başlık satırını al (1. satır)
          const headers = jsonData[0];

          // Veri satırlarını al (2. satırdan itibaren)
          const dataRows = jsonData.slice(1);
          
          // Haftalık dönemleri ve programları işle
          const periods = [];
          const schedules = [];
          
          // Başlık satırından haftalık dönemleri çıkar (E sütunundan itibaren)
          for (let col = 4; col < headers.length; col++) { // E sütunu = index 4
            const weekLabel = headers[col];
            
            if (weekLabel && typeof weekLabel === 'string') {
              // Tüm ay isimlerini kontrol et (2024 ve 2025 için)
              const monthPattern = /(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)/;
              const monthMatch = weekLabel.match(monthPattern);
              
              if (monthMatch) {
                
                // Tarih aralığını parse et - manuel parsing
                let startDay, startMonth, endDay, endMonth, year;
                
                // Önce yılı bul
                const yearMatch = weekLabel.match(/(\d{4})/);
                if (yearMatch) {
                  year = parseInt(yearMatch[1]);
                  
                  // Ay isimlerini bul
                  const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
                  let foundMonths = [];
                  
                  monthNames.forEach(month => {
                    const monthIndex = weekLabel.indexOf(month);
                    if (monthIndex !== -1) {
                      foundMonths.push({ name: month, index: monthIndex });
                    }
                  });
                  
                  // Ay isimlerini sırala
                  foundMonths.sort((a, b) => a.index - b.index);
                  
                  if (foundMonths.length >= 1) {
                    // İlk ayı al
                    startMonth = getMonthNumber(foundMonths[0].name);
                    
                    // İkinci ay varsa onu al, yoksa aynı ay
                    if (foundMonths.length >= 2) {
                      endMonth = getMonthNumber(foundMonths[1].name);
                    } else {
                      endMonth = startMonth;
                    }
                    
                    // Günleri bul
                    const dayMatches = weekLabel.match(/(\d{1,2})/g);
                    if (dayMatches && dayMatches.length >= 2) {
                      startDay = parseInt(dayMatches[0]);
                      endDay = parseInt(dayMatches[1]);
                      
                      
                      // Tarihi doğrudan string olarak oluştur (timezone sorunu olmasın)
                      const startDateStr = `${year}-${startMonth.toString().padStart(2, '0')}-${startDay.toString().padStart(2, '0')}`;
                      const endDateStr = `${year}-${endMonth.toString().padStart(2, '0')}-${endDay.toString().padStart(2, '0')}`;
                      
                      periods.push({
                        start_date: startDateStr,
                        end_date: endDateStr,
                        week_label: `${startDay}.${startMonth}.${year} - ${endDay}.${endMonth}.${year}`,
                        year: year
                      });
                    }
                  }
                } else {
                }
              }
            }
          }
          
          // Her personel satırını işle
          dataRows.forEach((row, rowIndex) => {
            
            if (row.length < 4) {
              return;
            }
            
            const employeeCode = row[1]; // B sütunu - Personel ID
            const employeeName = row[2]; // C sütunu - ADI SOYADI
            const position = row[3]; // D sütunu - GÖREVİ
            
            if (!employeeCode || !employeeName) {
              return;
            }
            
            // E sütunundan itibaren her hafta için vardiya bilgisini al
            for (let col = 4; col < Math.min(row.length, headers.length); col++) {
              const shiftValue = row[col];
              
              // Boş değerleri atla - o personel o hafta işe başlamamış
              if (!shiftValue || shiftValue === '' || shiftValue === null || shiftValue === undefined) {
                continue;
              }
              
              const period = periods[col - 4]; // E sütunu = index 4
              if (!period) {
                continue;
              }
              
              let shiftType = 'dinlenme';
              let shiftHours = null;
              let status = null;
              
              // Vardiya türünü belirle
              if (typeof shiftValue === 'string') {
                const value = shiftValue.trim();
                
                if (value === '22:00 - 06:00') {
                  shiftType = 'gece';
                  shiftHours = value;
                } else if (value === '08:00 - 16:00') {
                  shiftType = 'gunduz';
                  shiftHours = value;
                } else if (value === '16:00 - 00:00' || value === '16:00-00:00') {
                  shiftType = 'aksam';
                  shiftHours = value;
                } else if (value.toLowerCase().includes('rapor') || value === 'Raporlu' || value === 'Rapor') {
                  shiftType = 'raporlu';
                  status = 'raporlu';
                } else if (value === 'Yıllık izinli' || value.toLowerCase().includes('izin')) {
                  shiftType = 'yillik_izin';
                  status = 'yillik_izin';
                } else if (value === 'GEÇİCİ GÖREV' || value.toLowerCase().includes('geçici')) {
                  shiftType = 'gecici_gorev';
                  status = 'gecici_gorev';
                } else {
                  // Bilinmeyen değerler için de dinlenme olarak kaydet
                  shiftType = 'dinlenme';
                }
              } else if (shiftValue === null || shiftValue === undefined) {
                continue;
              } else {
                // String olmayan değerler için de dinlenme olarak kaydet
                shiftType = 'dinlenme';
              }
              
              schedules.push({
                employee_code: employeeCode.toString(),
                period_id: null, // Period ID'yi sonra set edeceğiz
                shift_type: shiftType,
                shift_hours: shiftHours,
                status: status,
                period_start_date: period.start_date,
                period_end_date: period.end_date,
                year: period.year
              });
              
              // Debug log ekle
              console.log('📝 Vardiya kaydı:', {
                employee_code: employeeCode.toString(),
                shift_type: shiftType,
                shift_hours: shiftHours,
                status: status,
                period_start_date: period.start_date,
                period_end_date: period.end_date,
                year: period.year
              });
            }
          });
          
          
          // Veritabanına kaydet
          const result = await saveExcelData(periods, schedules);
          
          if (result.success) {
            setUploadMessage({
              type: 'success',
              message: `✅ Excel verisi başarıyla yüklendi!\n\n📊 ${periods.length} haftalık dönem\n👥 ${schedules.length} vardiya kaydı\n\nVeriler sisteme kaydedildi.`
            });
            
            // Hızlı veri güncelleme
            console.log('🔄 Veriler güncelleniyor...');
            
            // Sadece personel listesini yeniden yükle (hızlı)
            const personnelResult = await getAllPersonnel();
            if (personnelResult.success) {
              const sortedPersonnel = personnelResult.data.sort((a, b) => 
                a.full_name.localeCompare(b.full_name, 'tr', { sensitivity: 'base' })
              );
              setPersonnelList(sortedPersonnel);
            }
            
            // Ana sayfa takvimini güncelle
            if (onDataUpdate) {
              console.log('🔄 Ana sayfa güncelleniyor...');
              await onDataUpdate();
            }
            
            console.log('✅ Veri güncelleme tamamlandı');
          } else {
            // Mevcut veri uyarısı veya diğer hatalar
            setUploadMessage({
              type: 'error',
              message: result.error
            });
            return; // İşlemi durdur
          }
          
        } catch (error) {
          setUploadMessage({
            type: 'error',
            message: `❌ Excel dosyası işlenirken hata oluştu:\n${error.message}`
          });
        } finally {
          setUploadLoading(false);
        }
      };
      
      reader.readAsArrayBuffer(file);
      
    } catch (error) {
      setUploadMessage({
        type: 'error',
        message: `❌ Dosya okunamadı:\n${error.message}`
      });
      setUploadLoading(false);
    }
  };

  // Ay numarasını döndür
  const getMonthNumber = (monthName) => {
    const months = {
      'Ocak': 1,
      'Şubat': 2,
      'Mart': 3,
      'Nisan': 4,
      'Mayıs': 5,
      'Haziran': 6,
      'Temmuz': 7,
      'Ağustos': 8,
      'Eylül': 9,
      'Ekim': 10,
      'Kasım': 11,
      'Aralık': 12
    };
    return months[monthName] || 1;
  };

  // Component yüklendiğinde verileri getir
  useEffect(() => {
    loadInitialData();
    loadDailyNotes();
  }, []);

  // Personel listesi yüklendikten sonra vardiya verilerini yükle
  useEffect(() => {
    if (personnelList.length > 0) {
      loadCurrentShiftData();
    }
  }, [personnelList]);

  // Takvim görünümünde veri güncellemesi için
  useEffect(() => {
    if (viewMode === 'calendar' && dailyNotes.length > 0) {
      // Takvim verilerini yenile
    }
  }, [dailyNotes, viewMode]);

  // Veri değiştiğinde takvimi yenile
  useEffect(() => {
    if (dailyNotes.length > 0) {
      // Takvim otomatik olarak yeniden render olacak
    }
  }, [dailyNotes]);

  // Periyodik veri yenileme (her 30 saniyede bir)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (viewMode === 'calendar') {
        await loadDailyNotes();
      }
    }, 30000); // 30 saniye

    return () => clearInterval(interval);
  }, [viewMode]);

  // Tarih değiştiğinde günlük notları yenile
  useEffect(() => {
    if (selectedDate) {
      loadDailyNotes();
    }
  }, [selectedDate]);

  // Vardiya kaydetme fonksiyonu
  const handleSaveShift = async (e) => {
    e.preventDefault();
    
    try {
      const currentPeriod = getCurrentPeriod();
      const shiftData = {
        employee_code: shiftForm.employee_code,
        shift_type: shiftForm.shift_type,
        shift_hours: shiftForm.shift_hours,
        status: shiftForm.shift_type === 'yillik_izin' ? 'yillik_izin' : 
                shiftForm.shift_type === 'raporlu' ? 'raporlu' : 'dinlenme',
        period_id: currentPeriod.id
      };

      if (editingShift) {
        // Güncelleme
        const { error } = await supabase
          .from('weekly_schedules')
          .update(shiftData)
          .eq('id', editingShift.id);
        
        if (error) throw error;
        console.log('✅ Vardiya güncellendi');
      } else {
        // Yeni kayıt
        const { error } = await supabase
          .from('weekly_schedules')
          .insert(shiftData);
        
        if (error) throw error;
        console.log('✅ Yeni vardiya eklendi');
      }

      // Verileri yenile
      await loadCurrentShiftData();
      
      // Modal'ı kapat
      setShowCurrentShiftModal(false);
      setEditingShift(null);
      setShiftForm({
        employee_code: '',
        shift_type: 'gunduz',
        shift_hours: '08:00 - 16:00',
        status: 'dinlenme'
      });

    } catch (error) {
      console.error('❌ Vardiya kaydetme hatası:', error);
      alert('Vardiya kaydedilemedi: ' + error.message);
    }
  };

  // Vardiya tablosu sıralama fonksiyonu
  const handleCurrentShiftSort = (key) => {
    let direction = 'asc';
    if (currentShiftSortConfig.key === key && currentShiftSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setCurrentShiftSortConfig({ key, direction });
  };

  // Sıralanmış vardiya verilerini al
  const getSortedCurrentShiftData = () => {
    if (!currentShiftSortConfig.key) return currentShiftData;

    return [...currentShiftData].sort((a, b) => {
      let aValue = a[currentShiftSortConfig.key];
      let bValue = b[currentShiftSortConfig.key];

      // Özel alanlar için
      if (currentShiftSortConfig.key === 'full_name') {
        aValue = a.full_name || '';
        bValue = b.full_name || '';
      } else if (currentShiftSortConfig.key === 'shift_hours') {
        aValue = a.shift_hours || '';
        bValue = b.shift_hours || '';
      }

      if (aValue < bValue) {
        return currentShiftSortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return currentShiftSortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Sıralama ikonunu al
  const getCurrentShiftSortIcon = (key) => {
    if (currentShiftSortConfig.key !== key) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    if (currentShiftSortConfig.direction === 'asc') {
      return (
        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
        </svg>
      );
    } else {
      return (
        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      );
    }
  };

  // Vardiya silme fonksiyonu
  const handleDeleteShift = async (shiftId) => {
    if (!confirm('Bu vardiyayı silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('weekly_schedules')
        .delete()
        .eq('id', shiftId);
      
      if (error) throw error;
      
      console.log('✅ Vardiya silindi');
      await loadCurrentShiftData();
      
    } catch (error) {
      console.error('❌ Vardiya silme hatası:', error);
      alert('Vardiya silinemedi: ' + error.message);
    }
  };

  // Şu Anki Vardiya verilerini yükle
  const loadCurrentShiftData = async () => {
    try {
      console.log('🔄 Şu anki vardiya verileri yükleniyor...');

      // En güncel week_label tarihli weekly_periods kaydını bul
      const { data: allPeriods, error: periodError } = await supabase
        .from('weekly_periods')
        .select('*')
        .order('created_at', { ascending: false });

      if (periodError) {
        console.error('❌ Dönem verileri çekilemedi:', periodError);
        setCurrentShiftData([]);
        return;
      }

      if (!allPeriods || allPeriods.length === 0) {
        console.log('📊 Hiç dönem kaydı bulunamadı');
        setCurrentShiftData([]);
        return;
      }

      // week_label'daki tarihi parse edip en güncel olanı bul
      let latestPeriod = null;
      let latestDate = null;

      console.log('🔍 Tüm dönemler:', allPeriods.length);
      
      allPeriods.forEach((period, index) => {
        console.log(`📅 Dönem ${index + 1}:`, period.week_label);
        
        try {
          // week_label formatı: "20 Temmuz - 26 Temmuz 2025"
          const weekLabel = period.week_label;
          if (!weekLabel) {
            console.log('⚠️ week_label boş:', period);
            return;
          }

          // İlk tarihi al (başlangıç tarihi)
          const dateMatch = weekLabel.match(/(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+-\s+(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(\d{4})/);
          
          if (dateMatch) {
            const [, startDay, startMonth, endDay, endMonth, year] = dateMatch;
            const monthMap = {
              'Ocak': 0, 'Şubat': 1, 'Mart': 2, 'Nisan': 3, 'Mayıs': 4, 'Haziran': 5,
              'Temmuz': 6, 'Ağustos': 7, 'Eylül': 8, 'Ekim': 9, 'Kasım': 10, 'Aralık': 11
            };
            
            const startMonthNum = monthMap[startMonth];
            const endMonthNum = monthMap[endMonth];
            
            console.log(`📊 Parse edilen: ${startDay} ${startMonth} ${year} -> ${startMonthNum}`);
            
            if (startMonthNum !== undefined && endMonthNum !== undefined) {
              const periodDate = new Date(parseInt(year), startMonthNum, parseInt(startDay));
              const today = new Date();
              today.setHours(0, 0, 0, 0); // Bugünün başlangıcı
              
              console.log(`📅 Tarih hesaplandı:`, periodDate);
              console.log(`📅 Bugün:`, today);
              console.log(`📅 Gelecek mi:`, periodDate > today);
              
              // Sadece bugünden küçük veya eşit tarihleri kabul et
              if (periodDate <= today) {
                if (!latestDate || periodDate > latestDate) {
                  latestDate = periodDate;
                  latestPeriod = period;
                  console.log(`✅ Yeni en güncel:`, period.week_label);
                }
              } else {
                console.log(`⏭️ Gelecek tarih atlandı:`, period.week_label);
              }
            } else {
              console.log('⚠️ Ay numarası bulunamadı:', startMonth, endMonth);
            }
          } else {
            console.log('⚠️ Regex eşleşmedi:', weekLabel);
          }
        } catch (error) {
          console.warn('⚠️ week_label parse hatası:', period.week_label, error);
        }
      });

      if (periodError) {
        console.error('❌ En son dönem bulunamadı:', periodError);
        setCurrentShiftData([]);
        return;
      }

      if (!latestPeriod) {
        console.log('📊 En güncel dönem bulunamadı, en son yüklenen kullanılıyor...');
        // Fallback: en son yüklenen veriyi kullan
        latestPeriod = allPeriods[0];
      }

      const currentPeriod = latestPeriod;

      console.log('📅 En güncel dönem:', currentPeriod);
      console.log('📅 Dönem detayları:', {
        start_date: currentPeriod.start_date,
        end_date: currentPeriod.end_date,
        week_label: currentPeriod.week_label,
        created_at: currentPeriod.created_at,
        parsed_date: latestDate
      });

      // Bu dönem için tüm vardiyaları çek
      const { data: currentSchedules, error: schedulesError } = await supabase
        .from('weekly_schedules')
        .select('*')
        .eq('period_id', currentPeriod.id);

      if (schedulesError) {
        console.error('❌ Vardiya verileri çekilemedi:', schedulesError);
        setCurrentShiftData([]);
        return;
      }

      if (currentSchedules && currentSchedules.length > 0) {
        // Personel bilgilerini zenginleştir
        const enrichedData = currentSchedules.map(schedule => {
          const person = personnelList.find(p => p.employee_code === schedule.employee_code);
          
          return {
            ...schedule,
            full_name: person?.full_name || 'Bilinmeyen',
            position: person?.position || 'Bilinmeyen',
            period_start_date: currentPeriod.start_date,
            period_end_date: currentPeriod.end_date,
            week_label: currentPeriod.week_label
          };
        });

        setCurrentShiftData(enrichedData);
        console.log('✅ Güncel vardiya verileri yüklendi:', enrichedData.length, 'kayıt');
      } else {
        console.log('📊 Bu dönem için vardiya verisi bulunamadı');
        setCurrentShiftData([]);
      }
    } catch (error) {
      console.error('❌ Şu anki vardiya verileri yükleme hatası:', error);
      setCurrentShiftData([]);
    }
  };

  // Personel veya tarih değiştiğinde mevcut kayıtları kontrol et
  useEffect(() => {
    if (attendanceForm.employee_code && selectedDate) {
      checkExistingRecords();
    } else {
      setExistingRecords([]);
    }
  }, [attendanceForm.employee_code, selectedDate]);

  // DailyNotes yüklendiğinde varsayılan ayı güncelle
  useEffect(() => {
    if (dailyNotes.length > 0) {
      // Veri olan ayları bul
      const monthsWithData = new Set();
      dailyNotes.forEach(note => {
        const noteDate = new Date(note.date);
        const noteYear = noteDate.getFullYear();
        const noteMonth = noteDate.getMonth();
        monthsWithData.add(`${noteYear}-${noteMonth}`);
      });

      // Mevcut seçimde veri var mı kontrolü
      const currentSelection = selectedMonth;
      const hasDataForCurrentSelection = monthsWithData.has(currentSelection);

      if (!hasDataForCurrentSelection) {
        // Veri olan ayları sırala (en yeni önce)
        const sortedMonths = Array.from(monthsWithData).sort((a, b) => {
          const [yearA, monthA] = a.split('-');
          const [yearB, monthB] = b.split('-');
          if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
          return parseInt(monthB) - parseInt(monthA);
        });
        // İlk verisi olan ayı seç
        const firstMonthWithData = sortedMonths[0];
        setSelectedMonth(firstMonthWithData);
      }
    }
  }, [dailyNotes]);

  // Günlük notları yükle
  const loadDailyNotes = async () => {
    try {
      
      // Tüm notları getir (tarih filtresiz) - filtreleme frontend'de yapılacak
      const result = await getDailyNotes();
      
      if (result.success) {
        setDailyNotes(result.data);
        if (result.data.length > 0) {
        }
        
        // Seçilen tarihe göre filtrelenmiş verileri de logla
        const filteredNotes = result.data.filter(note => note.date === selectedDate);
      } else {
        setDailyNotes([]);
      }
    } catch (error) {
      setDailyNotes([]);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      
      // 1. Önce personelleri çek
      const personnelResult = await getAllPersonnel();
      
      if (personnelResult.success) {
        const filteredPersonnel = personnelResult.data;
        
        // Personel listesini A-Z sırala
        const sortedPersonnel = filteredPersonnel.sort((a, b) => 
          a.full_name.localeCompare(b.full_name, 'tr', { sensitivity: 'base' })
        );
        setPersonnelList(sortedPersonnel);
        
                  // 2. Her personel için ayrı ayrı vardiya verilerini çek
          try {
            
            // Her personel için ayrı ayrı veri çek
            const realTimeStats = [];
            
            for (const person of sortedPersonnel) {
              try {
                const personResult = await getPersonnelShiftDetails(person.employee_code);
                
                if (personResult.success) {
                  const personSchedules = personResult.data || [];
                  
                  // Vardiya tiplerini say
                  const stats = {
                    total_night_shifts: personSchedules.filter(s => s.shift_type === 'gece').length,
                    total_day_shifts: personSchedules.filter(s => s.shift_type === 'gunduz').length,
                    total_evening_shifts: personSchedules.filter(s => s.shift_type === 'aksam').length,
                    total_temp_assignments: personSchedules.filter(s => s.shift_type === 'gecici_gorev').length,
                    total_sick_days: personSchedules.filter(s => s.shift_type === 'raporlu').length,
                    total_annual_leave: personSchedules.filter(s => s.shift_type === 'yillik_izin').length
                  };
                  
                
                  
                  realTimeStats.push({
                    employee_code: person.employee_code,
                    full_name: person.full_name,
                    position: person.position || 'Belirtilmemiş',
                    ...stats,
                    year: 'Tüm Yıllar'
                  });
                } else {
                  realTimeStats.push({
                    employee_code: person.employee_code,
                    full_name: person.full_name,
                    position: person.position || 'Belirtilmemiş',
                    total_night_shifts: 0,
                    total_day_shifts: 0,
                    total_evening_shifts: 0,
                    total_temp_assignments: 0,
                    total_sick_days: 0,
                    total_annual_leave: 0,
                    year: 'Tüm Yıllar'
                  });
                }
              } catch (error) {
                realTimeStats.push({
                  employee_code: person.employee_code,
                  full_name: person.full_name,
                  position: person.position || 'Belirtilmemiş',
                  total_night_shifts: 0,
                  total_day_shifts: 0,
                  total_evening_shifts: 0,
                  total_temp_assignments: 0,
                  total_sick_days: 0,
                  total_annual_leave: 0,
                  year: 'Tüm Yıllar'
                });
              }
            }
            
            setShiftStatistics(realTimeStats);
            // İstatistik özeti
            const totalStats = realTimeStats.reduce((acc, person) => {
              acc.gece += person.total_night_shifts;
              acc.gunduz += person.total_day_shifts;
              acc.aksam += person.total_evening_shifts;
              acc.gecici += person.total_temp_assignments;
              acc.raporlu += person.total_sick_days;
              acc.yillik_izin += person.total_annual_leave;
              return acc;
            }, { gece: 0, gunduz: 0, aksam: 0, gecici: 0, raporlu: 0, yillik_izin: 0 });
            
          } catch (scheduleError) {
            // Hata durumunda sadece personelleri göster
            const emptyStats = sortedPersonnel.map(person => ({
              employee_code: person.employee_code,
              full_name: person.full_name,
              position: person.position || 'Belirtilmemiş',
              total_night_shifts: 0,
              total_day_shifts: 0,
              total_evening_shifts: 0,
              total_temp_assignments: 0,
              total_sick_days: 0,
              total_annual_leave: 0,
              year: 'Tüm Yıllar'
            }));
            setShiftStatistics(emptyStats);
          }
      } else {
        setPersonnelList([]);
        setShiftStatistics([]);
      }
      
      // 3. Weekly periods'ı da çekmeyi dene
      try {
        const periodsResult = await getWeeklyPeriods(null);
        if (periodsResult.success) {
          setWeeklyPeriods(periodsResult.data);
        } else {
          setWeeklyPeriods([]);
        }
      } catch (periodError) {
        setWeeklyPeriods([]);
      }
      
      // 4. Günlük notları yükle
      loadDailyNotes();
      
      // 5. Bugünkü durumu da yükle
      setTimeout(() => {
        loadTodayStatus();
      }, 1000); // 1 saniye bekle, diğer veriler yüklensin
      
    } catch (error) {
      // Hata durumunda boş state'ler set et
      setPersonnelList([]);
      setShiftStatistics([]);
      setWeeklyPeriods([]);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingRecords = () => {
    const records = dailyNotes.filter(note => 
      note.employee_code === attendanceForm.employee_code && 
      note.date === selectedDate
    );
    
    setExistingRecords(records);
  };

  const getFilteredAndSortedPersonnel = () => {
    let filtered = [...shiftStatistics];
    
    // Vardiya tipine göre filtreleme
    if (filterType !== 'all') {
      filtered = filtered.filter(personnel => {
        switch (filterType) {
          case 'gece':
            return personnel.total_night_shifts > 0;
          case 'gunduz':
            return personnel.total_day_shifts > 0;
          case 'aksam':
            return personnel.total_evening_shifts > 0;
          case 'gecici':
            return personnel.total_temp_assignments > 0;
          case 'hastalik_izni':
            return personnel.total_sick_days > 0;
          case 'yillik_izin':
            return personnel.total_annual_leave > 0;
          default:
            return true;
        }
      });
    }
    
    // Sıralama
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortOrder) {
        case 'name':
          aValue = a.full_name || '';
          bValue = b.full_name || '';
          return sortDirection === 'asc' ? aValue.localeCompare(bValue, 'tr') : bValue.localeCompare(aValue, 'tr');
        case 'code':
          aValue = a.employee_code || '';
          bValue = b.employee_code || '';
          return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        case 'position':
          aValue = a.position || '';
          bValue = b.position || '';
          return sortDirection === 'asc' ? aValue.localeCompare(bValue, 'tr') : bValue.localeCompare(aValue, 'tr');
        case 'gece':
          aValue = a.total_night_shifts || 0;
          bValue = b.total_night_shifts || 0;
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        case 'gunduz':
          aValue = a.total_day_shifts || 0;
          bValue = b.total_day_shifts || 0;
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        case 'aksam':
          aValue = a.total_evening_shifts || 0;
          bValue = b.total_evening_shifts || 0;
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        case 'gecici':
          aValue = a.total_temp_assignments || 0;
          bValue = b.total_temp_assignments || 0;
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        case 'raporlu':
          aValue = a.total_sick_days || 0;
          bValue = b.total_sick_days || 0;
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        case 'izin':
          aValue = a.total_annual_leave || 0;
          bValue = b.total_annual_leave || 0;
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        default:
          aValue = a.full_name || '';
          bValue = b.full_name || '';
          return sortDirection === 'asc' ? aValue.localeCompare(bValue, 'tr') : bValue.localeCompare(aValue, 'tr');
      }
    });
    
    return filtered;
  };

  const handleSort = (column) => {
    if (sortOrder === column) {
      // Aynı kolona tıklandıysa yönü değiştir
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Yeni kolona tıklandıysa o kolonu seç ve varsayılan olarak artan sırala
      setSortOrder(column);
      setSortDirection('asc');
    }
  };

  // Günlük takip sıralama fonksiyonu
  const handleDailySort = (column) => {
    if (dailySortOrder === column) {
      setDailySortDirection(dailySortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setDailySortOrder(column);
      setDailySortDirection('desc'); // Varsayılan olarak en yeni önce
    }
  };

  const getSortIcon = (column) => {
    if (sortOrder !== column) {
      return <span className="text-gray-400 text-xs">↕</span>;
    }
    return sortDirection === 'asc' ? <span className="text-blue-600 text-xs font-bold">↑</span> : <span className="text-blue-600 text-xs font-bold">↓</span>;
  };

  // Günlük takip sıralama ikonu
  const getDailySortIcon = (column) => {
    if (dailySortOrder !== column) {
      return <span className="text-gray-400 text-xs">↕</span>;
    }
    return dailySortDirection === 'asc' ? <span className="text-blue-600 text-xs font-bold">↑</span> : <span className="text-blue-600 text-xs font-bold">↓</span>;
  };

  // Aylık detay sıralama fonksiyonları
  const handleMonthlySort = (column) => {
    if (monthlySortColumn === column) {
      setMonthlySortDirection(monthlySortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setMonthlySortColumn(column);
      setMonthlySortDirection('asc');
    }
  };

  const getMonthlySortIcon = (column) => {
    if (monthlySortColumn !== column) {
      return <span className="text-gray-400 text-xs">↕</span>;
    }
    return monthlySortDirection === 'asc' ? <span className="text-blue-600 text-xs font-bold">↑</span> : <span className="text-blue-600 text-xs font-bold">↓</span>;
  };

  const getSortableHeader = (column, label, icon = null, showSortText = false) => (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        {icon && <span className="mr-1">{icon}</span>}
        <span className="group-hover:text-blue-600 transition-colors">{label}</span>
      </div>
      <div className="flex items-center">
        {getSortIcon(column)}
        {showSortText && (
          <div className="ml-1 text-xs text-gray-400 group-hover:text-blue-400 transition-colors">
            {sortOrder === column ? (sortDirection === 'asc' ? 'A→Z' : 'Z→A') : 'Sırala'}
          </div>
        )}
      </div>
    </div>
  );

  const handleAddAbsence = async (e) => {
    e.preventDefault();
    
    // Form validasyonu
    if (!newAbsence.employee_code.trim()) {
      alert('❌ Lütfen personel seçin!');
      return;
    }
    
    if (!newAbsence.date) {
      alert('❌ Lütfen tarih seçin!');
      return;
    }
    
    if (!newAbsence.status) {
      alert('❌ Lütfen durum seçin!');
      return;
    }
    
    // Gelecek tarih kontrolü
    const selectedDate = new Date(newAbsence.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (selectedDate > today) {
      alert('❌ Gelecek tarihler seçilemez!');
      return;
    }
    
    setAbsenceLoading(true);
    
    try {
      if (editMode && editingRecord) {
        // Güncelleme işlemi
        const result = await supabase
          .from('daily_notes')
          .update({
            employee_code: newAbsence.employee_code,
            date: newAbsence.date,
            status: newAbsence.status,
            reason: newAbsence.notes
          })
          .eq('id', editingRecord.id);
        
        if (result.error) {
          throw result.error;
        }
        setShowAbsenceModal(false);
        setEditMode(false);
        setEditingRecord(null);
      } else {
        // Yeni kayıt ekleme
        const result = await supabase.from('daily_notes').insert({
          employee_code: newAbsence.employee_code,
          date: newAbsence.date,
          status: newAbsence.status,
          reason: newAbsence.notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        if (result.error) {
          throw result.error;
        }
        setShowAbsenceModal(false);
      }
      
      setNewAbsence({
        employee_code: '',
        date: new Date().toISOString().split('T')[0],
        status: '',
        notes: ''
      });
      await loadDailyNotes(); // Günlük notları yenile
      
      // Ana sayfa takvimini güncelle
      if (onDataUpdate) {
        await onDataUpdate();
      }
    } catch (error) {
      alert(`İşlem başarısız: ${error.message}`);
    } finally {
      setAbsenceLoading(false);
    }
  };

  const handleEditRecord = (record) => {
    setEditingRecord(record);
    setEditMode(true);
    setNewAbsence({
      employee_code: record.employee_code,
      date: record.date,
      status: record.status,
      notes: record.reason || ''
    });
    setShowAbsenceModal(true);
  };

  const openPersonnelDetailsModal = async (employee_code) => {
    setSelectedPersonnel(employee_code);
    setDetailsLoading(true);
    
    // Varsayılan tarih aralığını ayarla (son 30 gün)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    setDetailDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
    
    // Filtreleme state'lerini sıfırla
    setFilteredPersonnelDetails([]);
    setFilteredDailyNotes([]);
    
    try {
      // 1. Personel vardiya detaylarını çek
      const result = await getPersonnelShiftDetails(employee_code);
      
      if (result.success) {
        
        // 2. Weekly periods'ı da çek
        const periodsResult = await getWeeklyPeriods();
        
        if (periodsResult.success) {
          
          // 3. Vardiya kayıtlarını period bilgileri ile birleştir
          const enrichedDetails = result.data.map(schedule => {
            const period = periodsResult.data.find(p => p.id === schedule.period_id);
            return {
              ...schedule,
              period_info: period || null
            };
          });
          
          // En yeni tarihten en eskiye doğru sırala
          const sortedDetails = enrichedDetails.sort((a, b) => {
            const dateA = a.period_info ? new Date(a.period_info.start_date) : new Date(a.created_at);
            const dateB = b.period_info ? new Date(b.period_info.start_date) : new Date(b.created_at);
            return dateB - dateA; // En yeni tarih önce gelsin
          });
          
          setPersonnelDetails(sortedDetails);
        } else {
          // En yeni tarihten en eskiye doğru sırala
          const sortedData = result.data.sort((a, b) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return dateB - dateA; // En yeni tarih önce gelsin
          });
          setPersonnelDetails(sortedData);
        }
      } else {
        setPersonnelDetails([]);
      }
    } catch (error) {
      setPersonnelDetails([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'raporlu':
        return 'bg-red-100 text-red-800';
      case 'habersiz':
        return 'bg-orange-100 text-orange-800';
      case 'yillik_izin':
        return 'bg-blue-100 text-blue-800';
      case 'dinlenme':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'raporlu':
        return '🏥 Raporlu';
      case 'habersiz':
        return '❌ Habersiz';
      case 'yillik_izin':
        return '🏖️ Yıllık İzin';
      case 'dinlenme':
        return '😴 Dinlenme';
      default:
        return status;
    }
  };

  const getNotesForSelectedDate = () => {
    let filteredNotes;
    
    // selectedMonth henüz tanımlanmamışsa boş array döndür
    if (!selectedMonth) {
      return [];
    }
    
    // Seçilen ay ve yıla göre filtrele
    filteredNotes = dailyNotes.filter(note => {
      const noteDate = new Date(note.date);
      const noteYear = noteDate.getFullYear();
      const noteMonth = noteDate.getMonth();
      
      // Seçilen ay ve yıla göre filtrele
      if (selectedMonth && selectedMonth.includes && selectedMonth.includes('-')) {
        const [year, month] = selectedMonth.split('-');
        return noteYear === parseInt(year) && noteMonth === parseInt(month);
      }
      
      return noteYear === selectedYear && noteMonth === selectedMonth;
    });
    
    
    // Sıralama uygula
    filteredNotes.sort((a, b) => {
      let aValue, bValue;
      
      switch (dailySortOrder) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'name':
          aValue = a.full_name || '';
          bValue = b.full_name || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'reason':
          aValue = a.reason || '';
          bValue = b.reason || '';
          break;
        default:
          aValue = new Date(a.date);
          bValue = new Date(b.date);
      }
      
      if (dailySortOrder === 'name' || dailySortOrder === 'status' || dailySortOrder === 'reason') {
        return dailySortDirection === 'asc' 
          ? aValue.localeCompare(bValue, 'tr') 
          : bValue.localeCompare(aValue, 'tr');
      } else {
        return dailySortDirection === 'asc' 
          ? aValue - bValue 
          : bValue - aValue;
      }
    });
    
    if (selectedMonth && selectedMonth.includes && selectedMonth.includes('-')) {
      const [year, month] = selectedMonth.split('-');
    } else if (selectedMonth) {
    } else {
    }
    return filteredNotes;
  };

  // Sayfalama için yardımcı fonksiyonlar
  const getPaginatedNotes = () => {
    const allNotes = getNotesForSelectedDate();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return allNotes.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const allNotes = getNotesForSelectedDate();
    return Math.ceil(allNotes.length / itemsPerPage);
  };

  // Takvim görünümü için yardımcı fonksiyonlar
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };



  const getCalendarDays = useMemo(() => {
    // selectedMonth henüz tanımlanmamışsa boş array döndür
    if (!selectedMonth) {
      return [];
    }
    
    // selectedMonth string formatında ise parse et
    let currentMonth, currentYear;
    if (selectedMonth && selectedMonth.includes && selectedMonth.includes('-')) {
      const [year, month] = selectedMonth.split('-');
      currentYear = parseInt(year);
      currentMonth = parseInt(month);
    } else {
      currentYear = selectedYear;
      currentMonth = selectedMonth;
    }
    
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days = [];

    // Önceki ayın son günleri
    for (let i = firstDay - 1; i >= 0; i--) {
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const prevMonthDays = getDaysInMonth(prevYear, prevMonth);
      days.push({
        date: new Date(prevYear, prevMonth, prevMonthDays - i),
        isCurrentMonth: false,
        notes: []
      });
    }

    // Bu ayın günleri
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateStr = date.toISOString().split('T')[0];
      
      // Bu gün için daily_notes'tan notları filtrele
      const dayNotes = dailyNotes.filter(note => {
        const noteDate = new Date(note.date);
        return (
          noteDate.getFullYear() === date.getFullYear() &&
          noteDate.getMonth() === date.getMonth() &&
          noteDate.getDate() === date.getDate()
        );
      });
      

      
      days.push({
        date,
        isCurrentMonth: true,
        notes: dayNotes
      });
    }

    // Sonraki ayın ilk günleri
    const remainingDays = 42 - days.length; // 6 hafta x 7 gün
    for (let day = 1; day <= remainingDays; day++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      days.push({
        date: new Date(nextYear, nextMonth, day),
        isCurrentMonth: false,
        notes: []
      });
    }

    return days;
  }, [selectedMonth, selectedYear, dailyNotes]);

  // Gelecek tarih kontrolü
  const isFutureDate = (date) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Bugünün sonu
    return date > today;
  };

  // Takvim animasyonu için fonksiyonlar
  const animateCalendar = (direction) => {
    setCalendarAnimation(direction);
    setTimeout(() => {
      setCalendarAnimation('slide-in');
    }, 300);
  };

  const handleMonthChange = (newMonth, newYear) => {
    // selectedMonth henüz tanımlanmamışsa sadece yeni değerleri set et
    if (!selectedMonth) {
      setSelectedMonth(`${newYear}-${newMonth}`);
      setSelectedYear(newYear);
      setCurrentPage(1);
      return;
    }
    
    // Mevcut ay ve yılı parse et
    let currentMonth, currentYear;
    if (selectedMonth && selectedMonth.includes && selectedMonth.includes('-')) {
      const [year, month] = selectedMonth.split('-');
      currentYear = parseInt(year);
      currentMonth = parseInt(month);
    } else {
      currentYear = selectedYear;
      currentMonth = selectedMonth;
    }
    
    const currentDate = new Date(currentYear, currentMonth);
    const newDate = new Date(newYear, newMonth);
    
    // Gelecek tarih kontrolü
    const today = new Date();
    const selectedDate = new Date(newYear, newMonth, 1);
    if (selectedDate > today) {
      alert('Gelecek tarihler seçilemez!');
      return;
    }
    
    if (newDate > currentDate) {
      animateCalendar('slide-out-left');
    } else {
      animateCalendar('slide-out-right');
    }
    
    setTimeout(() => {
      setSelectedMonth(`${newYear}-${newMonth}`);
      setSelectedYear(newYear);
      setCurrentPage(1); // Ay değiştiğinde ilk sayfaya dön
    }, 150);
  };

  // Bugünkü personel durumlarını hesapla
  const getTodayPersonnelStatus = async () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth(); // 0-11 arası (Temmuz = 6)
    const currentYear = currentDate.getFullYear();
    
    try {
      // 1. Daily notes tablosundan bu ay oluşturulan verileri çek
      const thisMonthDailyNotes = dailyNotes.filter(note => {
        const createdDate = new Date(note.created_at);
        return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
      });
      
      
      thisMonthDailyNotes.forEach((note, index) => {
      });
      
      // 2. Kategorilere göre grupla - SADECE daily_notes'den
      
      // Raporlu: daily_notes'den status = 'raporlu' olanlar
      const raporluPersonnelCodes = [...new Set(thisMonthDailyNotes.filter(note => 
        note.status === 'raporlu'
      ).map(note => note.employee_code))];
      
      // Habersiz: Bu ay hiç günlük takip kaydı olmayan personeller
      const allPersonnelCodes = personnelList.map(p => p.employee_code);
      const personnelWithDailyNotes = [...new Set(thisMonthDailyNotes.map(note => note.employee_code))];
      const habersizPersonnelCodes = allPersonnelCodes.filter(code => 
        !personnelWithDailyNotes.includes(code)
      );
      
      // Yıllık İzin: daily_notes'den status = 'yillik_izin' olanlar
      const yillikIzinPersonnelCodes = [...new Set(thisMonthDailyNotes.filter(note => 
        note.status === 'yillik_izin'
      ).map(note => note.employee_code))];
      
      // Dinlenme: daily_notes'den status = 'dinlenme' olanlar
      const dinlenmePersonnelCodes = [...new Set(thisMonthDailyNotes.filter(note => 
        note.status === 'dinlenme'
      ).map(note => note.employee_code))];
      
      // Personel isimlerini al
      const raporluPersonnel = raporluPersonnelCodes.map(code => {
        const person = personnelList.find(p => p.employee_code === code);
        return {
          employee_code: code,
          employee_name: person ? person.full_name : 'Bilinmeyen',
          status: 'raporlu'
        };
      });
      
      const habersizPersonnel = habersizPersonnelCodes.map(code => {
        const person = personnelList.find(p => p.employee_code === code);
        return {
          employee_code: code,
          employee_name: person ? person.full_name : 'Bilinmeyen',
          status: 'habersiz'
        };
      });
      
      const yillikIzinPersonnel = yillikIzinPersonnelCodes.map(code => {
        const person = personnelList.find(p => p.employee_code === code);
        return {
          employee_code: code,
          employee_name: person ? person.full_name : 'Bilinmeyen',
          status: 'yillik_izin'
        };
      });
      
      const dinlenmePersonnel = dinlenmePersonnelCodes.map(code => {
        const person = personnelList.find(p => p.employee_code === code);
        return {
          employee_code: code,
          employee_name: person ? person.full_name : 'Bilinmeyen',
          status: 'dinlenme'
        };
      });
      
      
      const result = {
        raporlu: {
          count: raporluPersonnel.length,
          personnel: raporluPersonnel.map(r => r.employee_name || 'Bilinmeyen')
        },
        habersiz: {
          count: habersizPersonnel.length,
          personnel: habersizPersonnel.map(r => r.employee_name || 'Bilinmeyen')
        },
        yillikIzin: {
          count: yillikIzinPersonnel.length,
          personnel: yillikIzinPersonnel.map(r => r.employee_name || 'Bilinmeyen')
        },
        dinlenme: {
          count: dinlenmePersonnel.length,
          personnel: dinlenmePersonnel.map(r => r.employee_name || 'Bilinmeyen')
        }
      };
      
      return result;
    } catch (error) {
      return {
        raporlu: { count: 0, personnel: [] },
        habersiz: { count: 0, personnel: [] },
        yillikIzin: { count: 0, personnel: [] },
        dinlenme: { count: 0, personnel: [] }
      };
    }
  };

  const handleDeleteAttendance = async (id) => {
    if (window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) {
      try {
        const result = await supabase
          .from('daily_notes')
          .delete()
          .eq('id', id);
        
        if (result.error) {
          throw result.error;
        }
        
        loadDailyNotes(); // Günlük notları yenile
      } catch (error) {
        alert(`Silme işlemi başarısız: ${error.message}`);
      }
    }
  };



  // Genel tarih düzenleme state'leri
  const [globalDateEditModal, setGlobalDateEditModal] = useState(false);
  const [allPeriods, setAllPeriods] = useState([]);
  const [selectedPeriodForEdit, setSelectedPeriodForEdit] = useState(null);
  const [globalEditForm, setGlobalEditForm] = useState({
    old_start_date: '',
    old_end_date: '',
    new_start_date: '',
    new_end_date: ''
  });
  const [globalEditLoading, setGlobalEditLoading] = useState(false);
            


  // Bu fonksiyon artık kullanılmıyor - istatistikler otomatik hesaplanıyor



  // Genel tarih düzenleme fonksiyonları
  const handleOpenGlobalDateEdit = async () => {
    setGlobalDateEditModal(true);
    setGlobalEditLoading(true);
    
    try {
      // Tüm period'ları çek
      const { data: periods, error } = await supabase
        .from('weekly_periods')
        .select('*')
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      
      setAllPeriods(periods || []);
    } catch (error) {
      alert(`❌ Period'lar yüklenemedi: ${error.message}`);
    } finally {
      setGlobalEditLoading(false);
    }
  };

  const handleSelectPeriodForEdit = (period) => {
    setSelectedPeriodForEdit(period);
    setGlobalEditForm({
      old_start_date: period.start_date,
      old_end_date: period.end_date,
      new_start_date: period.start_date,
      new_end_date: period.end_date
    });
  };

  const handleUpdateGlobalDate = async () => {
    if (!selectedPeriodForEdit) return;

    setGlobalEditLoading(true);
    try {
      // 1. Period'u güncelle
      const { error: periodError } = await supabase
        .from('weekly_periods')
        .update({
          start_date: globalEditForm.new_start_date,
          end_date: globalEditForm.new_end_date
        })
        .eq('id', selectedPeriodForEdit.id);

      if (periodError) throw periodError;

      // 2. Bu period'a ait tüm schedule'ları bul ve güncelle
      const { data: schedules, error: scheduleError } = await supabase
        .from('weekly_schedules')
        .select('*')
        .eq('period_id', selectedPeriodForEdit.id);

      if (scheduleError) throw scheduleError;

      console.log(`✅ ${schedules.length} vardiya kaydı güncellendi`);

      // 3. Modal'ı kapat ve verileri yenile
      setGlobalDateEditModal(false);
      setSelectedPeriodForEdit(null);
      
      // 4. Ana verileri yeniden yükle
      loadInitialData();
      loadTodayStatus();

      alert(`✅ Tarih başarıyla güncellendi!\n\n${schedules.length} vardiya kaydı etkilendi.`);
    } catch (error) {
      alert(`❌ Güncelleme hatası: ${error.message}`);
    } finally {
      setGlobalEditLoading(false);
    }
  };



  const handleCleanupDatabase = async () => {
    if (window.confirm('⚠️ DİKKAT: Tüm vardiya verilerini temizlemek istediğinize emin misiniz?\n\nBu işlem:\n• Tüm vardiya programlarını silecek\n• Tüm istatistikleri sıfırlayacak\n• Tüm günlük kayıtları silecek\n\nBu işlem geri alınamaz!')) {
      setCleanupLoading(true);
      try {
        const result = await clearAllShiftData();
        if (result.success) {
          setCleanupResult({ 
            type: 'success', 
            message: `✅ Veritabanı başarıyla temizlendi! Tüm veriler silindi.` 
          });
          loadInitialData(); // Yeni verileri yükle
          loadTodayStatus(); // Bugünkü durumu da güncelle
        } else {
          setCleanupResult({ type: 'error', message: `❌ Veritabanı temizleme hatası: ${result.error}` });
        }
      } catch (error) {
        setCleanupResult({ type: 'error', message: `❌ Veritabanı temizleme hatası: ${error.message}` });
      } finally {
        setCleanupLoading(false);
      }
    }
  };

  const formatWeekRange = (startDate, endDate, weekLabel) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.toLocaleDateString('tr-TR', { month: 'numeric', day: 'numeric' })} - ${end.toLocaleDateString('tr-TR', { month: 'numeric', day: 'numeric' })} (${weekLabel})`;
  };

  // Bugünkü personel durumlarını yükle
  const loadTodayStatus = async () => {
    setTodayStatusLoading(true);
    try {
      const status = await getTodayPersonnelStatus();
      setTodayStatus(status);
    } catch (error) {
    } finally {
      setTodayStatusLoading(false);
    }
  };

  // Günlük notlar yüklendiğinde bugünkü durumu da güncelle
  useEffect(() => {
    if (dailyNotes.length > 0) {
      loadTodayStatus();
    }
  }, [dailyNotes]);

  // Vardiya istatistikleri yüklendiğinde bugünkü durumu da güncelle
  useEffect(() => {
    if (shiftStatistics.length > 0) {
      loadTodayStatus();
    }
  }, [shiftStatistics]);

  // Dashboard fonksiyonları
  const getMonthlyDriverStats = () => {
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                   'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    
    return months.map((month, index) => {
      const monthNumber = index + 1;
      const monthRecords = dailyNotes.filter(note => {
        const noteDate = new Date(note.date);
        const noteYear = noteDate.getFullYear();
        const noteMonth = noteDate.getMonth() + 1;
        
        return noteYear === selectedDashboardYear && 
               noteMonth === monthNumber &&
               personnelList.find(p => p.employee_code === note.employee_code)?.position?.toLowerCase().includes('şoför');
      });
      
      return {
        month,
        dinlenme: monthRecords.filter(r => r.status === 'dinlenme').length,
        izin: monthRecords.filter(r => r.status === 'yillik_izin').length,
        rapor: monthRecords.filter(r => r.status === 'raporlu').length
      };
    });
  };

  const getMonthlyDeliveryStats = () => {
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                   'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    
    return months.map((month, index) => {
      const monthNumber = index + 1;
      const monthRecords = dailyNotes.filter(note => {
        const noteDate = new Date(note.date);
        const noteYear = noteDate.getFullYear();
        const noteMonth = noteDate.getMonth() + 1;
        
        return noteYear === selectedDashboardYear && 
               noteMonth === monthNumber &&
               personnelList.find(p => p.employee_code === note.employee_code)?.position?.toLowerCase().includes('sevkiyat');
      });
      
      return {
        month,
        dinlenme: monthRecords.filter(r => r.status === 'dinlenme').length,
        izin: monthRecords.filter(r => r.status === 'yillik_izin').length,
        rapor: monthRecords.filter(r => r.status === 'raporlu').length
      };
    });
  };

  const getMonthlyGeneralStats = () => {
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                   'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    
    return months.map((month, index) => {
      const monthNumber = index + 1;
      const monthRecords = dailyNotes.filter(note => {
        const noteDate = new Date(note.date);
        const noteYear = noteDate.getFullYear();
        const noteMonth = noteDate.getMonth() + 1;
        
        return noteYear === selectedDashboardYear && noteMonth === monthNumber;
      });
      
      return {
        month,
        total: monthRecords.length
      };
    });
  };

  // Personel aylık istatistikleri
  const getPersonnelMonthlyStats = (employeeCode) => {
    const stats = {};
    
    for (let month = 1; month <= 12; month++) {
      const monthRecords = dailyNotes.filter(note => {
        const noteDate = new Date(note.date);
        const noteYear = noteDate.getFullYear();
        const noteMonth = noteDate.getMonth() + 1;
        
        // Eğer "Tüm Aylar" seçilmişse sadece yıla göre filtrele
        if (selectedMonthlyMonth === 'all') {
          return noteYear === selectedMonthlyYear && 
                 note.employee_code === employeeCode;
        }
        
        return noteYear === selectedMonthlyYear && 
               noteMonth === month && 
               note.employee_code === employeeCode;
      });
      
      stats[month] = monthRecords.length;
    }
    
    return stats;
  };

  // Aylık detaylar için hover tooltip içeriği
  const getMonthlyDetailsTooltip = (employeeCode, month) => {
    const monthRecords = dailyNotes.filter(note => {
      const noteDate = new Date(note.date);
      const noteYear = noteDate.getFullYear();
      const noteMonth = noteDate.getMonth() + 1;
      
      return noteYear === selectedMonthlyYear && 
             noteMonth === month && 
             note.employee_code === employeeCode;
    });

    if (monthRecords.length === 0) return null;

    const monthNames = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                       'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

    return {
      month: monthNames[month],
      records: monthRecords.map(record => ({
        date: new Date(record.date).toLocaleDateString('tr-TR'),
        status: getStatusText(record.status),
        reason: record.reason || 'Açıklama yok'
      }))
    };
  };

  const exportPersonnelDetails = (personnelData) => {
    // CSV alanlarını güvenli hale getiren yardımcı fonksiyon
    const escapeCsvField = (field) => {
      if (field === null || field === undefined) {
        return '';
      }
      let stringField = String(field);
      
      // Türkçe karakterleri düzelt
      stringField = stringField
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/İ/g, 'I')
        .replace(/Ğ/g, 'G')
        .replace(/Ü/g, 'U')
        .replace(/Ş/g, 'S')
        .replace(/Ö/g, 'O')
        .replace(/Ç/g, 'C');
      
      // Eğer alan virgül, çift tırnak veya yeni satır içeriyorsa tırnak içine al
      if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n') || stringField.includes(';')) {
        // İçindeki çift tırnakları ikiye katla
        stringField = stringField.replace(/"/g, '""');
        return `"${stringField}"`;
      }
      return stringField;
    };

    // Vardiya tipini Türkçe'ye çevir
    const getShiftTypeText = (shiftType) => {
      switch (shiftType) {
        case 'gece': return 'Gece Vardiyasi';
        case 'gunduz': return 'Gunduz Vardiyasi';
        case 'aksam': return 'Aksam Vardiyasi';
        case 'gecici': return 'Gecici Gorev';
        case 'hastalik_izni': return 'Normal Izin';
        case 'yillik_izin': return 'Yillik Izin';
        default: return shiftType;
      }
    };

    // CSV başlıkları
    const headers = [
      'Personel Kodu',
      'Personel Adi',
      'Pozisyon',
      'Vardiya Tipi',
      'Baslangic Tarihi',
      'Bitis Tarihi',
      'Sure (Gun)',
      'Sure (Saat)'
    ];

    // CSV satırları
    const rows = personnelData.map(detail => {
      // Period bilgilerini kullan
      let startDate, endDate;
      
      if (detail.period_info) {
        startDate = new Date(detail.period_info.start_date);
        endDate = new Date(detail.period_info.end_date);
      } else {
        startDate = new Date(detail.created_at);
        endDate = new Date(detail.updated_at || detail.created_at);
      }
      
      // Geçerli tarih kontrolü
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        startDate = new Date();
        endDate = new Date();
      }
      
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      const personnel = shiftStatistics.find(s => s.employee_code === selectedPersonnel);
      
      // Vardiya tipini düzgün göster
      let shiftTypeText = '';
      if (detail.shift_type === 'gece') {
        shiftTypeText = 'Gece Vardiyası';
      } else if (detail.shift_type === 'gunduz') {
        shiftTypeText = 'Gündüz Vardiyası';
      } else if (detail.shift_type === 'aksam') {
        shiftTypeText = 'Akşam Vardiyası';
      } else if (detail.shift_type === 'gecici_gorev') {
        shiftTypeText = 'Geçici Görev';
      } else if (detail.shift_type === 'raporlu') {
        shiftTypeText = 'Raporlu';
      } else if (detail.shift_type === 'yillik_izin') {
        shiftTypeText = 'Yıllık İzin';
      } else {
        shiftTypeText = 'Dinlenme';
      }
      
      return [
        selectedPersonnel,
        personnel?.full_name || 'Bilinmeyen',
        personnel?.position || 'Belirtilmemis',
        shiftTypeText,
        startDate.toLocaleDateString('tr-TR'),
        endDate.toLocaleDateString('tr-TR'),
        diffDays,
        '' // Süre (Saat) sütununu boş bırak
      ];
    });

    // CSV içeriğini oluştur
    const csvContent = [
      headers.map(escapeCsvField).join(';'),
      ...rows.map(row => row.map(escapeCsvField).join(';'))
    ].join('\n');

    // BOM (Byte Order Mark) ekle - Excel'de Türkçe karakterler için
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;

    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `personel_detay_${selectedPersonnel}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <h1 className="ml-3 text-2xl font-bold text-gray-900">Personel Kontrol Sistemi</h1>
              </div>
              
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-4 overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-1" />
                Genel Bakış
              </button>
              <button
                onClick={() => setActiveTab('tracking')}
                className={`py-3 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'tracking'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-1" />
                Günlük Takip
              </button>
              <button
                onClick={() => setActiveTab('monthly')}
                className={`py-3 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'monthly'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-1" />
                Aylık Detay
              </button>
              <button
                onClick={() => setActiveTab('currentShift')}
                className={`py-3 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'currentShift'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Clock className="w-4 h-4 inline mr-1" />
                Şu Anki Vardiya
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`py-3 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'upload'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Upload className="w-4 h-4 inline mr-1" />
                Excel Yükleme
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Genel İstatistikler</h2>
              
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                    <div className="text-lg font-semibold text-gray-700 mb-2">Veriler Yükleniyor</div>
                    <div className="text-sm text-gray-500">Lütfen bekleyin...</div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Modern İstatistik Kartları */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
                    {/* Gece Vardiyası */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-700 mb-1">🌙 Gece Vardiyası</p>
                          <p className="text-3xl font-bold text-blue-900">
                            {shiftStatistics.filter(s => s.total_night_shifts > 0).length}
                          </p>
                          <p className="text-xs text-blue-600 font-medium">farklı personel</p>
                        </div>
                        <div className="w-4 h-4 bg-blue-500 rounded-full shadow-md"></div>
                      </div>
                    </div>
                    
                    {/* Gündüz Vardiyası */}
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl shadow-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-700 mb-1">☀️ Gündüz Vardiyası</p>
                          <p className="text-3xl font-bold text-green-900">
                            {shiftStatistics.filter(s => s.total_day_shifts > 0).length}
                          </p>
                          <p className="text-xs text-green-600 font-medium">farklı personel</p>
                        </div>
                        <div className="w-4 h-4 bg-green-500 rounded-full shadow-md"></div>
                      </div>
                    </div>
                    
                    {/* Akşam Vardiyası */}
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl shadow-lg border border-orange-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-orange-700 mb-1">🌅 Akşam Vardiyası</p>
                          <p className="text-3xl font-bold text-orange-900">
                            {shiftStatistics.filter(s => s.total_evening_shifts > 0).length}
                          </p>
                          <p className="text-xs text-orange-600 font-medium">farklı personel</p>
                        </div>
                        <div className="w-4 h-4 bg-orange-500 rounded-full shadow-md"></div>
                      </div>
                    </div>
                    
                    {/* Geçici Görev */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl shadow-lg border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-700 mb-1">🔄 Geçici Görev</p>
                          <p className="text-3xl font-bold text-purple-900">
                            {shiftStatistics.filter(s => s.total_temp_assignments > 0).length}
                          </p>
                          <p className="text-xs text-purple-600 font-medium">farklı personel</p>
                        </div>
                        <div className="w-4 h-4 bg-purple-500 rounded-full shadow-md"></div>
                      </div>
                    </div>
                    
                    {/* Raporlu */}
                    <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl shadow-lg border border-red-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-red-700 mb-1">🏥 Toplam Raporlu</p>
                          <p className="text-3xl font-bold text-red-900">
                            {shiftStatistics.filter(s => s.total_sick_days > 0).length}
                          </p>
                          <p className="text-xs text-red-600 font-medium">farklı personel</p>
                        </div>
                        <div className="w-4 h-4 bg-red-500 rounded-full shadow-md"></div>
                      </div>
                    </div>
                    
                    {/* Yıllık İzin */}
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl shadow-lg border border-yellow-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-yellow-700 mb-1">🏖️ Yıllık İzin</p>
                          <p className="text-3xl font-bold text-yellow-900">
                            {shiftStatistics.filter(s => s.total_annual_leave > 0).length}
                          </p>
                          <p className="text-xs text-yellow-600 font-medium">farklı personel</p>
                        </div>
                        <div className="w-4 h-4 bg-yellow-500 rounded-full shadow-md"></div>
                      </div>
                    </div>
                  </div>





                  {/* Personel Listesi */}
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-bold text-gray-900 flex items-center">
                            <Users className="w-5 h-5 mr-2 text-blue-600" />
                            Personel Listesi
                          </h3>
                          
                          {/* Haftalık Plan Göstergesi */}
                          <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-purple-50 px-3 py-1 rounded-full border border-blue-200">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-medium text-blue-700">📅 Haftalık Plan Üzerinden</span>
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-600 font-medium bg-white px-3 py-1 rounded-full shadow-sm">
                          Toplam: {getFilteredAndSortedPersonnel().length} personel
                        </div>
                      </div>
                      
                      {/* Açıklama */}
                      <div className="mt-2 text-xs text-gray-600 flex items-center space-x-2">
                        <span className="flex items-center">
                          <div className="w-1 h-1 bg-blue-500 rounded-full mr-1"></div>
                          Sayılar haftalık vardiya planlarından hesaplanır
                        </span>
                        <span className="flex items-center">
                          <div className="w-1 h-1 bg-purple-500 rounded-full mr-1"></div>
                          1 = 1 hafta vardiya
                        </span>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                          <tr>
                            <th 
                              className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-48 cursor-pointer hover:bg-blue-50 transition-all duration-200 group"
                              onClick={() => handleSort('name')}
                            >
                              {getSortableHeader('name', 'Personel', '👤', true)}
                            </th>
                            <th 
                              className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-32 cursor-pointer hover:bg-blue-50 transition-all duration-200 group"
                              onClick={() => handleSort('position')}
                            >
                              {getSortableHeader('position', 'Pozisyon', '💼', true)}
                            </th>
                            <th 
                              className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-16 cursor-pointer hover:bg-blue-50 transition-all duration-200 group"
                              onClick={() => handleSort('gece')}
                            >
                              {getSortableHeader('gece', '🌙 Gece', '', false)}
                            </th>
                            <th 
                              className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-16 cursor-pointer hover:bg-blue-50 transition-all duration-200 group"
                              onClick={() => handleSort('gunduz')}
                            >
                              {getSortableHeader('gunduz', '☀️ Gündüz', '', false)}
                            </th>
                            <th 
                              className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-16 cursor-pointer hover:bg-blue-50 transition-all duration-200 group"
                              onClick={() => handleSort('aksam')}
                            >
                              {getSortableHeader('aksam', '🌅 Akşam', '', false)}
                            </th>
                            <th 
                              className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-16 cursor-pointer hover:bg-blue-50 transition-all duration-200 group"
                              onClick={() => handleSort('gecici')}
                            >
                              {getSortableHeader('gecici', '🔄 Geçici', '', false)}
                            </th>
                            <th 
                              className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-16 cursor-pointer hover:bg-blue-50 transition-all duration-200 group"
                              onClick={() => handleSort('raporlu')}
                            >
                              {getSortableHeader('raporlu', '🏥 Rapor', '', false)}
                            </th>
                            <th 
                              className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-16 cursor-pointer hover:bg-blue-50 transition-all duration-200 group"
                              onClick={() => handleSort('izin')}
                            >
                              {getSortableHeader('izin', '🏖️ İzin', '', false)}
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-20">
                              <div className="flex items-center justify-center">
                                <span>İşlemler</span>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {getFilteredAndSortedPersonnel().map((stat, index) => (
                            <tr key={stat.employee_code} className={`hover:bg-blue-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                              <td className="px-3 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                  <User className="w-4 h-4 text-gray-400 mr-2" />
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{stat.full_name}</div>
                                    <div className="text-sm text-gray-500">{stat.employee_code}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  stat.position?.toLowerCase().includes('şoför') || stat.position?.toLowerCase().includes('soför') 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : stat.position?.toLowerCase().includes('sevkiyat') 
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {stat.position || 'Belirtilmemiş'}
                                </span>
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-center">
                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                  stat.total_night_shifts > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {stat.total_night_shifts}
                                </span>
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-center">
                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                  stat.total_day_shifts > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {stat.total_day_shifts}
                                </span>
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-center">
                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                  stat.total_evening_shifts > 0 ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {stat.total_evening_shifts}
                                </span>
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-center">
                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                  stat.total_temp_assignments > 0 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {stat.total_temp_assignments}
                                </span>
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-center">
                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                  stat.total_sick_days > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {stat.total_sick_days}
                                </span>
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-center">
                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                  stat.total_annual_leave > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {stat.total_annual_leave}
                                </span>
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => openPersonnelDetailsModal(stat.employee_code)}
                                  className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Detaylar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>


                </>
              )}
            </div>
          )}

          {activeTab === 'monthly' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-semibold text-gray-900">📈 Performans Takip Detayları</h4>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Ay:</label>
                      <select 
                        value={selectedMonthlyMonth} 
                        onChange={(e) => setSelectedMonthlyMonth(e.target.value === 'all_months' ? 'all_months' : parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="all_months">📊 Tümü</option>
                        {(() => {
                          // Hangi aylarda veri olduğunu kontrol et
                          const monthsWithData = new Set();
                          
                          // Tüm personel için veri olan ayları kontrol et
                          personnelList.forEach(person => {
                            const personStats = getPersonnelMonthlyStats(person.employee_code);
                            Object.keys(personStats).forEach(monthKey => {
                              const month = parseInt(monthKey);
                              if (personStats[month] > 0) {
                                // Ay indeksini hesapla (1-based'den 0-based'e)
                                const monthIndex = month - 1;
                                monthsWithData.add(monthIndex);
                              }
                            });
                          });
                          
                          // Veri olan ayları sırala ve göster
                          return Array.from(monthsWithData).sort((a, b) => a - b).map(monthIndex => (
                            <option key={monthIndex} value={monthIndex}>{getMonthName(monthIndex)}</option>
                          ));
                        })()}
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Yıl:</label>
                      <select 
                        value={selectedMonthlyYear} 
                        onChange={(e) => setSelectedMonthlyYear(parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        {(() => {
                          // Veri olan yılları bul
                          const yearsWithData = new Set();
                          dailyNotes.forEach(note => {
                            const noteYear = new Date(note.date).getFullYear();
                            yearsWithData.add(noteYear);
                          });
                          
                          // Eğer hiç veri yoksa sadece mevcut yılı göster
                          if (yearsWithData.size === 0) {
                            return [new Date().getFullYear()].map(year => (
                              <option key={year} value={year}>{year}</option>
                            ));
                          }
                          
                          // Veri olan yılları sırala ve göster
                          return Array.from(yearsWithData).sort((a, b) => b - a).map(year => (
                            <option key={year} value={year}>{year}</option>
                          ));
                        })()}
                      </select>
                    </div>
                  </div>
                </div>
                
                                {(() => {
                  const allPersonnel = personnelList
                    .map((person) => {
                      const personStats = getPersonnelMonthlyStats(person.employee_code);
                      
                      if (selectedMonthlyMonth === 'all_months') {
                        // Tümü seçeneği için toplam gün sayısını hesapla
                        const totalDays = Object.values(personStats).reduce((sum, val) => sum + (val || 0), 0);
                        return { person, personStats, totalDays };
                      } else {
                        const month = selectedMonthlyMonth + 1; // selectedMonthlyMonth 0-based, month 1-based
                        const totalDays = personStats[month] || 0;
                        return { person, personStats, totalDays };
                      }
                    })
                    .filter(({ person, personStats, totalDays }) => {
                      // Tümü seçildiğinde tüm personel gözüksün
                      if (selectedMonthlyMonth === 'all_months') {
                        return true; // Tüm personel göster
                      } else {
                        // Tekil ay seçildiğinde sadece o ayda verisi olan personel gözüksün
                        const month = selectedMonthlyMonth + 1;
                        const days = personStats[month] || 0;
                        return days > 0; // Sadece verisi olan personel göster
                      }
                    });

                  if (allPersonnel.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                          <BarChart3 className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {selectedMonthlyMonth === 'all_months' ? 'Personel Bulunamadı' : 'Veri Bulunamadı'}
                        </h3>
                        <p className="text-gray-600 mb-4">
                          {selectedMonthlyMonth === 'all_months' 
                            ? 'Henüz hiç personel kaydı bulunmuyor.'
                            : `${getMonthName(selectedMonthlyMonth)} ${selectedMonthlyYear} ayında veri bulunamadı.`
                          }
                        </p>
                        <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>
                            {selectedMonthlyMonth === 'all_months' 
                              ? 'Personel verilerini ekleyerek istatistikleri görebilirsiniz'
                              : 'Farklı bir ay seçerek verileri görüntüleyebilirsiniz'
                            }
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div>
                      <table className="w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                          <tr>
                            <th 
                              className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 cursor-pointer hover:bg-gray-200 transition-colors"
                              onClick={() => handleMonthlySort('name')}
                            >
                              <div className="flex items-center justify-between">
                                <span>Personel</span>
                                {getMonthlySortIcon('name')}
                              </div>
                            </th>
                            <th 
                              className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 cursor-pointer hover:bg-gray-200 transition-colors"
                              onClick={() => handleMonthlySort('position')}
                            >
                              <div className="flex items-center justify-between">
                                <span>Görev</span>
                                {getMonthlySortIcon('position')}
                              </div>
                            </th>
                            {selectedMonthlyMonth === 'all_months' ? (
                              // Tümü seçildiğinde sadece veri olan ayları göster
                              (() => {
                                // Hangi aylarda veri olduğunu kontrol et - daha güvenli yöntem
                                const monthsWithData = new Set();
                                
                                // Tüm personel için veri olan ayları kontrol et
                                personnelList.forEach(person => {
                                  const personStats = getPersonnelMonthlyStats(person.employee_code);
                                  Object.keys(personStats).forEach(monthKey => {
                                    const month = parseInt(monthKey);
                                    if (personStats[month] > 0) {
                                      // Ay indeksini hesapla (1-based'den 0-based'e)
                                      const monthIndex = month - 1;
                                      monthsWithData.add(monthIndex);
                                    }
                                  });
                                });
                                
                                // Ayları sırala
                                const sortedMonths = Array.from(monthsWithData).sort((a, b) => a - b);
                                
                                return sortedMonths.map(monthIndex => (
                                  <th key={monthIndex} className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                                    {getMonthName(monthIndex).substring(0, 3).toUpperCase()}
                                  </th>
                                ));
                              })()
                            ) : (
                              // Tekil ay seçildiğinde sadece o ayı göster
                              <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                                {getMonthName(selectedMonthlyMonth).substring(0, 3).toUpperCase()}
                              </th>
                            )}
                            <th 
                              className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16 cursor-pointer hover:bg-gray-200 transition-colors"
                              onClick={() => handleMonthlySort('total')}
                            >
                              <div className="flex items-center justify-between">
                                <span>Toplam</span>
                                {getMonthlySortIcon('total')}
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(() => {
                            // Sıralama uygula
                            const sortedPersonnel = [...allPersonnel].sort((a, b) => {
                              let aValue, bValue;
                              
                              switch (monthlySortColumn) {
                                case 'name':
                                  aValue = a.person.full_name;
                                  bValue = b.person.full_name;
                                  break;
                                case 'position':
                                  aValue = a.person.position || '';
                                  bValue = b.person.position || '';
                                  break;
                                case 'total':
                                  aValue = a.totalDays;
                                  bValue = b.totalDays;
                                  break;
                                default:
                                  aValue = a.person.full_name;
                                  bValue = b.person.full_name;
                              }
                              
                              if (typeof aValue === 'string') {
                                return monthlySortDirection === 'asc' 
                                  ? aValue.localeCompare(bValue, 'tr', { sensitivity: 'base' })
                                  : bValue.localeCompare(aValue, 'tr', { sensitivity: 'base' });
                              } else {
                                return monthlySortDirection === 'asc' ? aValue - bValue : bValue - aValue;
                              }
                            });

                            // Toplam değerlerine göre renk gradyanı hesapla
                            const maxTotal = Math.max(...sortedPersonnel.map(p => p.totalDays));
                            const minTotal = Math.min(...sortedPersonnel.map(p => p.totalDays));

                            return sortedPersonnel.map(({ person, personStats, totalDays }) => {
                              // Renk gradyanı hesapla
                              const colorIntensity = maxTotal === minTotal ? 0.5 : 
                                (totalDays - minTotal) / (maxTotal - minTotal);
                              
                              const getTotalColor = () => {
                                if (colorIntensity >= 0.8) return 'from-red-100 to-red-200 text-red-800';
                                if (colorIntensity >= 0.6) return 'from-orange-100 to-orange-200 text-orange-800';
                                if (colorIntensity >= 0.4) return 'from-yellow-100 to-yellow-200 text-yellow-800';
                                if (colorIntensity >= 0.2) return 'from-green-100 to-green-200 text-green-800';
                                return 'from-blue-100 to-blue-200 text-blue-800';
                              };

                              return (
                                <tr key={person.employee_code} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200">
                                  <td className="px-3 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
                                        <User className="w-4 h-4 text-white" />
                                      </div>
                                      <div>
                                        <div className="text-sm font-semibold text-gray-900">{person.full_name}</div>
                                        <div className="text-xs text-gray-500">{person.employee_code}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-2 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full shadow-sm ${
                                      person.position?.toLowerCase().includes('şoför') 
                                        ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white' 
                                        : person.position?.toLowerCase().includes('sevkiyat')
                                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
                                        : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                                    }`}>
                                      {person.position?.length > 8 ? person.position.substring(0, 8) + '...' : person.position || 'Belirtilmemiş'}
                                    </span>
                                  </td>
                                  {(() => {
                                    if (selectedMonthlyMonth === 'all_months') {
                                      // Tümü seçeneği için sadece veri olan ayları göster
                                      return (() => {
                                        // Hangi aylarda veri olduğunu kontrol et - başlıkla aynı mantık
                                        const monthsWithData = new Set();
                                        
                                        // Tüm personel için veri olan ayları kontrol et
                                        personnelList.forEach(person => {
                                          const personStats = getPersonnelMonthlyStats(person.employee_code);
                                          Object.keys(personStats).forEach(monthKey => {
                                            const month = parseInt(monthKey);
                                            if (personStats[month] > 0) {
                                              // Ay indeksini hesapla (1-based'den 0-based'e)
                                              const monthIndex = month - 1;
                                              monthsWithData.add(monthIndex);
                                            }
                                          });
                                        });
                                        
                                        // Ayları sırala
                                        const sortedMonths = Array.from(monthsWithData).sort((a, b) => a - b);
                                        
                                        return sortedMonths.map(monthIndex => {
                                          const month = monthIndex + 1; // 0-based'den 1-based'e
                                          const days = personStats[month] || 0;
                                          const tooltipData = getMonthlyDetailsTooltip(person.employee_code, month);
                                          
                                          return (
                                            <td key={monthIndex} className="px-1 py-4 whitespace-nowrap text-center relative group">
                                              {days > 0 ? (
                                                <div 
                                                  className={`rounded-lg p-2 cursor-pointer hover:scale-105 transition-transform duration-200 ${
                                                    tooltipData && tooltipData.records.some(record => record.status.includes('Raporlu')) 
                                                      ? 'bg-gradient-to-br from-red-100 to-red-200' 
                                                      : tooltipData && tooltipData.records.some(record => record.status.includes('Dinlenme'))
                                                      ? 'bg-gradient-to-br from-purple-100 to-purple-200'
                                                      : tooltipData && tooltipData.records.some(record => record.status.includes('İzinli'))
                                                      ? 'bg-gradient-to-br from-blue-100 to-blue-200'
                                                      : 'bg-gradient-to-br from-green-100 to-green-200'
                                                  }`}
                                                  title={tooltipData ? `${tooltipData.month} - ${days} gün` : ''}
                                                >
                                                  <div className={`text-sm font-bold ${
                                                    tooltipData && tooltipData.records.some(record => record.status.includes('Raporlu')) 
                                                      ? 'text-red-800' 
                                                      : tooltipData && tooltipData.records.some(record => record.status.includes('Dinlenme'))
                                                      ? 'text-purple-800'
                                                      : tooltipData && tooltipData.records.some(record => record.status.includes('İzinli'))
                                                      ? 'text-blue-800'
                                                      : 'text-green-800'
                                                  }`}>
                                                    {days}
                                                  </div>
                                                  <div className={`text-xs ${
                                                    tooltipData && tooltipData.records.some(record => record.status.includes('Raporlu')) 
                                                      ? 'text-red-600' 
                                                      : tooltipData && tooltipData.records.some(record => record.status.includes('Dinlenme'))
                                                      ? 'text-purple-600'
                                                      : tooltipData && tooltipData.records.some(record => record.status.includes('İzinli'))
                                                      ? 'text-blue-600'
                                                      : 'text-green-600'
                                                  }`}>
                                                    gün
                                                  </div>
                                                  
                                                  {/* Hover Tooltip */}
                                                  {tooltipData && (
                                                    <div className="absolute left-1/2 transform -translate-x-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 z-[99999] min-w-max pointer-events-none border border-gray-700" style={{minWidth: '250px', maxWidth: '350px', bottom: 'calc(100% + 20px)'}}>
                                                      <div className="font-semibold mb-2 text-yellow-300 border-b border-gray-700 pb-1">{tooltipData.month}</div>
                                                      {tooltipData.records.map((record, idx) => (
                                                        <div key={idx} className="mb-2 last:mb-0">
                                                          <div className="text-yellow-300 font-medium">{record.date}</div>
                                                          <div className="text-blue-300">{record.status}</div>
                                                          {record.reason && <div className="text-gray-300 text-xs mt-1">{record.reason}</div>}
                                                        </div>
                                                      ))}
                                                      {/* Arrow pointing down */}
                                                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-gray-900"></div>
                                                    </div>
                                                  )}
                                                </div>
                                              ) : (
                                                <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2">-</div>
                                              )}
                                            </td>
                                          );
                                        });
                                      })();
                                    } else {
                                      const month = selectedMonthlyMonth + 1; // selectedMonthlyMonth 0-based, month 1-based
                                      const days = personStats[month] || 0;
                                      const tooltipData = getMonthlyDetailsTooltip(person.employee_code, month);
                                      
                                      return (
                                        <td key={month} className="px-1 py-4 whitespace-nowrap text-center relative group">
                                          {days > 0 ? (
                                            <div 
                                              className={`rounded-lg p-2 cursor-pointer hover:scale-105 transition-transform duration-200 ${
                                                tooltipData && tooltipData.records.some(record => record.status.includes('Raporlu')) 
                                                  ? 'bg-gradient-to-br from-red-100 to-red-200' 
                                                  : tooltipData && tooltipData.records.some(record => record.status.includes('Dinlenme'))
                                                  ? 'bg-gradient-to-br from-purple-100 to-purple-200'
                                                  : tooltipData && tooltipData.records.some(record => record.status.includes('İzinli'))
                                                  ? 'bg-gradient-to-br from-blue-100 to-blue-200'
                                                  : 'bg-gradient-to-br from-green-100 to-green-200'
                                              }`}
                                              title={tooltipData ? `${tooltipData.month} - ${days} gün` : ''}
                                            >
                                              <div className={`text-sm font-bold ${
                                                tooltipData && tooltipData.records.some(record => record.status.includes('Raporlu')) 
                                                  ? 'text-red-800' 
                                                  : tooltipData && tooltipData.records.some(record => record.status.includes('Dinlenme'))
                                                  ? 'text-purple-800'
                                                  : tooltipData && tooltipData.records.some(record => record.status.includes('İzinli'))
                                                  ? 'text-blue-800'
                                                  : 'text-green-800'
                                              }`}>
                                                {days}
                                              </div>
                                              <div className={`text-xs ${
                                                tooltipData && tooltipData.records.some(record => record.status.includes('Raporlu')) 
                                                  ? 'text-red-600' 
                                                  : tooltipData && tooltipData.records.some(record => record.status.includes('Dinlenme'))
                                                  ? 'text-purple-600'
                                                  : tooltipData && tooltipData.records.some(record => record.status.includes('İzinli'))
                                                  ? 'text-blue-600'
                                                  : 'text-green-600'
                                              }`}>
                                                gün
                                              </div>
                                              
                                              {/* Hover Tooltip */}
                                              {tooltipData && (
                                                <div className="absolute left-1/2 transform -translate-x-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100 z-[99999] min-w-max pointer-events-none border border-gray-700" style={{minWidth: '250px', maxWidth: '350px', bottom: 'calc(100% + 20px)'}}>
                                                  <div className="font-semibold mb-2 text-yellow-300 border-b border-gray-700 pb-1">{tooltipData.month}</div>
                                                  {tooltipData.records.map((record, idx) => (
                                                    <div key={idx} className="mb-2 last:mb-0">
                                                      <div className="text-yellow-300 font-medium">{record.date}</div>
                                                      <div className="text-blue-300">{record.status}</div>
                                                      {record.reason && <div className="text-gray-300 text-xs mt-1">{record.reason}</div>}
                                                    </div>
                                                  ))}
                                                  {/* Arrow pointing down */}
                                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-gray-900"></div>
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2">0</div>
                                          )}
                                        </td>
                                      );
                                    }
                                  })()}
                                  <td className="px-2 py-4 whitespace-nowrap text-center">
                                    {totalDays > 0 ? (
                                      <div className={`bg-gradient-to-br rounded-lg p-2 ${getTotalColor()}`}>
                                        <div className="text-sm font-bold">
                                          {totalDays}
                                        </div>
                                        <div className="text-xs opacity-75">
                                          gün
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2">0</div>
                                    )}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Excel Yükleme</h2>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Excel Yükleme</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Excel dosyasından vardiya programını yükleyin. Dosya formatı: .xlsx, .xls
                  </p>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all duration-200">
                    <Upload className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleExcelUpload}
                      className="hidden"
                      id="excel-upload"
                    />
                    <label
                      htmlFor="excel-upload"
                      className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl shadow-xl hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200 cursor-pointer border-0 text-lg"
                    >
                      <Upload className="w-6 h-6 mr-3" />
                      {uploadLoading ? 'Yükleniyor...' : 'Excel Dosyası Seç'}
                    </label>
                    <p className="text-sm text-gray-500 mt-4 font-medium">
                      Veya dosyayı buraya sürükleyip bırakın
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Desteklenen formatlar: .xlsx, .xls
                    </p>
                  </div>
                  
                  {uploadMessage && (
                    <div className={`mt-4 p-4 rounded-lg ${
                      uploadMessage.type === 'success' 
                        ? 'bg-green-50 border border-green-200 text-green-800' 
                        : 'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                      {uploadMessage.message}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🔄 İstatistik Güncelleme</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Tüm personel istatistiklerini güncelleyin
                  </p>
                  
                  <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center">
                      <Info className="w-5 h-5 mr-2 text-blue-600" />
                      <span className="text-blue-800">
                        İstatistikler otomatik olarak hesaplanıyor. Ayrı bir güncelleme gerekmez.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Genel Tarih Düzenleme</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Tüm veritabanındaki tarih aralıklarını görüntüleyin ve düzenleyin
                  </p>
                  
                  <button
                    onClick={handleOpenGlobalDateEdit}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-lg shadow-lg hover:from-purple-700 hover:to-purple-800 transform hover:scale-105 transition-all duration-200"
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Tüm Tarihleri Görüntüle
                  </button>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🗑️ Veritabanı Temizleme</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Tüm vardiya verilerini temizleyin (Dikkat: Bu işlem geri alınamaz!)
                  </p>
                  
                  <button
                    onClick={handleCleanupDatabase}
                    disabled={cleanupLoading}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-medium rounded-lg shadow-lg hover:from-red-700 hover:to-red-800 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {cleanupLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Temizleniyor...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-5 h-5 mr-2" />
                        Veritabanını Temizle
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'currentShift' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Şu Anki Vardiya</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Güncel vardiya planı: Geliştiriliyor
                    </p>
                  </div>
                                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-lg">
                      <span className="font-medium">Dönem:</span> Geliştiriliyor
                    </div>

                </div>
              </div>

              {/* Vardiya Tablosu */}
              {/* Yapım Aşamasında Mesajı */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  {/* Modern İkon */}
                  <div className="relative mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                    {/* Animasyonlu Noktalar */}
                    <div className="absolute -top-2 -right-2">
                      <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Ana Başlık */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    🚧 Yapım Aşamasında
                  </h3>
                  
                  {/* Alt Başlık */}
                  <p className="text-lg text-gray-600 mb-6 text-center max-w-md">
                    Bu özellik şu anda geliştirme aşamasında. Yakında kullanıma açılacak!
                  </p>
                  
                  {/* İlerleme Çubuğu */}
                  <div className="w-full max-w-md mb-6">
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                      <span>Geliştirme İlerlemesi</span>
                      <span>%75</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full w-3/4 animate-pulse"></div>
                    </div>
                  </div>
                  
                  {/* Özellik Listesi */}
                  <div className="grid grid-cols-1 gap-4 max-w-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Gerçek zamanlı vardiya takibi</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Personel vardiya düzenleme</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                      <span className="text-sm text-gray-400">Gelişmiş raporlama</span>
                    </div>
                  </div>
                  
                  {/* Tahmini Tamamlanma */}
                  <div className="mt-8 text-center">
                    <p className="text-sm text-gray-500">
                      Tahmini tamamlanma: <span className="font-medium text-gray-700">2-3 hafta</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tracking' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {viewMode === 'calendar' ? '📅 Takvim Görünümü' : '📋 Liste Görünümü'}
                </h2>
                <div className="flex items-center space-x-4">
                                      <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Ay Seçimi:</label>
                      <select
                        value={selectedMonth === 'all' ? 'all' : `${selectedYear}-${selectedMonth}`}
                        onChange={(e) => {
                          if (e.target.value === 'all') {
                            setSelectedMonth('all');
                          } else {
                            const [year, month] = e.target.value.split('-');
                            setSelectedYear(parseInt(year));
                            setSelectedMonth(parseInt(month));
                          }
                          setCurrentPage(1); // Sayfa değiştiğinde ilk sayfaya dön
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white hover:border-blue-400 transition-all duration-200 shadow-sm"
                      >

                        {(() => {
                          // Veri olan ayları bul
                          const monthsWithData = new Set();
                          dailyNotes.forEach(note => {
                            const noteDate = new Date(note.date);
                            const noteYear = noteDate.getFullYear();
                            const noteMonth = noteDate.getMonth();
                            monthsWithData.add(`${noteYear}-${noteMonth}`);
                          });
                          
                          // Eğer hiç veri yoksa sadece mevcut ayı göster
                          if (monthsWithData.size === 0) {
                            const currentYear = new Date().getFullYear();
                            const currentMonth = new Date().getMonth();
                            return [`${currentYear}-${currentMonth}`].map(monthKey => {
                              const [year, month] = monthKey.split('-');
                              return (
                                <option key={monthKey} value={monthKey}>
                                  {getMonthName(parseInt(month))} {year}
                                </option>
                              );
                            });
                          }
                          
                          // Veri olan ayları sırala ve göster
                          return Array.from(monthsWithData).sort((a, b) => {
                            const [yearA, monthA] = a.split('-');
                            const [yearB, monthB] = b.split('-');
                            if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
                            return parseInt(monthB) - parseInt(monthA);
                          }).map(monthKey => {
                            const [year, month] = monthKey.split('-');
                            return (
                              <option key={monthKey} value={monthKey}>
                                {getMonthName(parseInt(month))} {year}
                              </option>
                            );
                          });
                        })()}
                      </select>
                    </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Görünüm:</label>
                    <select
                      value={viewMode}
                      onChange={(e) => setViewMode(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white hover:border-blue-400 transition-all duration-200 shadow-sm"
                    >
                      <option value="calendar">📅 Takvim</option>
                      <option value="list">📋 Liste</option>
                    </select>
                  </div>
                  <button
                    onClick={() => setShowAbsenceModal(true)}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    + Veri Ekle
                  </button>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    📅 {(() => {
                      if (selectedMonth && selectedMonth.includes && selectedMonth.includes('-')) {
                        const [year, month] = selectedMonth.split('-');
                        return `${getMonthName(parseInt(month))} ${year}`;
                      }
                      return `${getMonthName(selectedMonth)} ${selectedYear}`;
                    })()}
                  </h3>
                  <div className="text-sm text-gray-500">
                    Toplam: {getNotesForSelectedDate().length} not
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Yükleniyor...</span>
                  </div>
                ) : viewMode === 'list' ? (
                  // Liste Görünümü
                  getNotesForSelectedDate().length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th 
                              className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => handleDailySort('name')}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <User className="w-4 h-4 mr-1" />
                                  <span>Personel</span>
                                </div>
                                {getDailySortIcon('name')}
                              </div>
                            </th>
                            <th 
                              className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => handleDailySort('date')}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-1" />
                                  <span>Tarih</span>
                                </div>
                                {getDailySortIcon('date')}
                              </div>
                            </th>
                            <th 
                              className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => handleDailySort('status')}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <span>Durum</span>
                                </div>
                                {getDailySortIcon('status')}
                              </div>
                            </th>
                            <th 
                              className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => handleDailySort('reason')}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <span>📝 Açıklama</span>
                                </div>
                                {getDailySortIcon('reason')}
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                              İşlemler
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {getPaginatedNotes().map((record) => (
                            <tr key={record.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <User className="w-4 h-4 text-gray-400 mr-2" />
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {record.full_name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {record.employee_code}
                                    </div>
                                    <div className={`text-xs font-medium px-2 py-1 rounded-full border ${
                                      personnelList.find(p => p.employee_code === record.employee_code)?.position?.toLowerCase().includes('şoför') 
                                        ? 'text-indigo-600 bg-indigo-50 border-indigo-200' 
                                        : personnelList.find(p => p.employee_code === record.employee_code)?.position?.toLowerCase().includes('sevkiyat')
                                        ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                                        : 'text-gray-600 bg-gray-50 border-gray-200'
                                    }`}>
                                      {personnelList.find(p => p.employee_code === record.employee_code)?.position || 'Görev belirtilmemiş'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(record.date).toLocaleDateString('tr-TR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit'
                                })}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(record.status)}`}>
                                  {getStatusText(record.status)}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-900">
                                {record.reason || '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleEditRecord(record)}
                                    className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                  >
                                    <Edit className="w-3 h-3 mr-1" />
                                    Düzenle
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAttendance(record.id)}
                                    className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-semibold rounded-lg hover:from-red-600 hover:to-red-700 transform hover:scale-105 transition-all duration-200 shadow-sm border-0 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Sil
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      {/* Sayfalama */}
                      {getTotalPages() > 1 && (
                        <div className="flex items-center justify-between mt-6 px-4 py-3 bg-gray-50 rounded-lg">
                          <div className="text-sm text-gray-700">
                            Sayfa {currentPage} / {getTotalPages()} 
                            ({getNotesForSelectedDate().length} toplam kayıt)
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                currentPage === 1
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'
                              }`}
                            >
                              ← Önceki
                            </button>
                            
                            {/* Sayfa numaraları */}
                            <div className="flex items-center space-x-1">
                              {Array.from({ length: Math.min(5, getTotalPages()) }, (_, i) => {
                                let pageNum;
                                if (getTotalPages() <= 5) {
                                  pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                  pageNum = i + 1;
                                } else if (currentPage >= getTotalPages() - 2) {
                                  pageNum = getTotalPages() - 4 + i;
                                } else {
                                  pageNum = currentPage - 2 + i;
                                }
                                
                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                      currentPage === pageNum
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              })}
                            </div>
                            
                            <button
                              onClick={() => setCurrentPage(Math.min(getTotalPages(), currentPage + 1))}
                              disabled={currentPage === getTotalPages()}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                currentPage === getTotalPages()
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'
                              }`}
                            >
                              Sonraki →
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">
                        {getMonthName(selectedMonth)} {selectedYear} için henüz günlük kayıt bulunmuyor
                      </p>
                      <p className="text-sm text-gray-400 mt-1">Yeni kayıt eklemek için yukarıdaki formu kullanın</p>
                    </div>
                  )
                ) : (
                  // Takvim Görünümü
                  <div className="space-y-4">
                    {/* Takvim Başlığı */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div></div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            if (selectedMonth === 0) {
                              handleMonthChange(11, selectedYear - 1);
                            } else {
                              handleMonthChange(selectedMonth - 1, selectedYear);
                            }
                          }}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110 transform"
                        >
                          ←
                        </button>
                        <button
                          onClick={() => {
                            const nextMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
                            const nextYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
                            
                            // Gelecek ay kontrolü
                            const today = new Date();
                            const nextDate = new Date(nextYear, nextMonth, 1);
                            if (nextDate > today) {
                              alert('Gelecek aylar seçilemez!');
                              return;
                            }
                            
                            handleMonthChange(nextMonth, nextYear);
                          }}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110 transform"
                        >
                          →
                        </button>
                      </div>
                    </div>

                    {/* Takvim Grid */}
                    <div className={`grid grid-cols-7 gap-1 transition-all duration-300 ${
                      calendarAnimation === 'slide-out-left' ? 'transform -translate-x-full opacity-0' :
                      calendarAnimation === 'slide-out-right' ? 'transform translate-x-full opacity-0' :
                      calendarAnimation === 'slide-in' ? 'transform translate-x-0 opacity-100' :
                      'transform translate-x-0 opacity-100'
                    }`}>
                      {/* Gün Başlıkları */}
                      {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
                        <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 bg-gray-50 rounded-lg flex items-center justify-center h-10">
                          {day}
                        </div>
                      ))}

                                                                      {/* Takvim Günleri */}
                        {getCalendarDays.map((day, index) => (
                          <div
                            key={index}
                            className={`p-3 min-h-[120px] border border-gray-200 rounded-xl transition-all duration-300 flex flex-col ${
                              day.isCurrentMonth 
                                ? isFutureDate(day.date) 
                                  ? 'bg-gray-50 text-gray-400 cursor-not-allowed' 
                                  : 'bg-white hover:bg-gray-50 hover:shadow-lg hover:scale-105 cursor-pointer' 
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            <div className={`text-sm font-bold mb-2 flex-shrink-0 ${
                              isFutureDate(day.date) ? 'text-gray-400' : 'text-gray-900'
                            }`}>
                              {day.date.getDate()}
                            </div>
                            {day.isCurrentMonth && day.notes.length > 0 && !isFutureDate(day.date) && (
                              // Debug: Bu gün için notları kontrol et
                              <div className="space-y-1.5 max-h-[80px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 flex-1">
                                {day.notes.map((note, noteIndex) => (
                                  <div
                                    key={noteIndex}
                                    className={`text-xs px-2 py-1.5 rounded-lg font-medium transition-all duration-300 hover:scale-105 hover:shadow-md ${
                                      note.status === 'dinlenme' ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-900 hover:from-purple-200 hover:to-purple-300 border border-purple-300 shadow-sm' :
                                      note.status === 'raporlu' ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-900 hover:from-red-200 hover:to-red-300 border border-red-300 shadow-sm' :
                                      note.status === 'habersiz' ? 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-900 hover:from-orange-200 hover:to-orange-300 border border-orange-300 shadow-sm' :
                                      note.status === 'yillik_izin' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-900 hover:from-blue-200 hover:to-blue-300 border border-blue-300 shadow-sm' :
                                      'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 hover:from-gray-200 hover:to-gray-300 border border-gray-300 shadow-sm'
                                    }`}
                                    title={`${note.full_name} - ${getStatusText(note.status)}`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="truncate">{note.full_name}</span>
                                      <span className={`ml-1 text-xs ${
                                        note.status === 'dinlenme' ? 'text-purple-700' :
                                        note.status === 'raporlu' ? 'text-red-700' :
                                        note.status === 'habersiz' ? 'text-orange-700' :
                                        note.status === 'yillik_izin' ? 'text-blue-700' :
                                        'text-gray-700'
                                      }`}>
                                        {note.status === 'dinlenme' ? '😴' :
                                         note.status === 'raporlu' ? '🏥' :
                                         note.status === 'habersiz' ? '❌' :
                                         note.status === 'yillik_izin' ? '🏖️' : '📝'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Personel Detay Modalı */}
      {selectedPersonnel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden border border-gray-200">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <User className="w-6 h-6 mr-3 text-blue-600" />
                    Personel Vardiya Detayları
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => exportPersonnelDetails(personnelDetails)}
                      className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-medium rounded-lg hover:from-green-700 hover:to-green-800 transform hover:scale-105 transition-all duration-200"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      CSV İndir
                    </button>
                    <button
                      onClick={() => setSelectedPersonnel(null)}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {detailsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600 font-medium">Detaylar yükleniyor...</span>
                </div>
              ) : personnelDetails && personnelDetails.length > 0 ? (
                <div className="space-y-6">
                  {/* Personel Bilgi Kartları */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-lg">
                      <div className="flex items-center mb-3">
                        <User className="w-6 h-6 text-blue-600 mr-2" />
                        <h4 className="font-bold text-blue-900 text-sm uppercase tracking-wide">Personel Adı</h4>
                      </div>
                      <p className="text-xl font-bold text-blue-800 mb-1">
                        {shiftStatistics.find(s => s.employee_code === selectedPersonnel)?.full_name || 'Bilinmeyen'}
                      </p>
                      <p className="text-sm text-blue-600 font-medium">{selectedPersonnel}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-lg">
                      <div className="flex items-center mb-3">
                        <FileText className="w-6 h-6 text-green-600 mr-2" />
                        <h4 className="font-bold text-green-900 text-sm uppercase tracking-wide">Pozisyon</h4>
                      </div>
                      <p className="text-lg font-bold text-green-800">
                        {shiftStatistics.find(s => s.employee_code === selectedPersonnel)?.position || 'Belirtilmemiş'}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 shadow-lg">
                      <div className="flex items-center mb-3">
                        <BarChart3 className="w-6 h-6 text-purple-600 mr-2" />
                        <h4 className="font-bold text-purple-900 text-sm uppercase tracking-wide">Toplam Vardiya</h4>
                      </div>
                      <p className="text-2xl font-bold text-purple-800">{personnelDetails.length} hafta</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 shadow-lg">
                      <div className="flex items-center mb-3">
                        <Calendar className="w-6 h-6 text-orange-600 mr-2" />
                        <h4 className="font-bold text-orange-900 text-sm uppercase tracking-wide">Son Vardiya</h4>
                      </div>
                      <p className="text-lg font-bold text-orange-800">
                        {personnelDetails[0] ? new Date(personnelDetails[0].created_at).toLocaleDateString('tr-TR') : '-'}
                      </p>
                    </div>
                  </div>



                  {/* Vardiya Özeti */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200 shadow-lg mb-8">
                    <div className="flex items-center mb-6">
                      <BarChart3 className="w-6 h-6 text-gray-600 mr-3" />
                      <h4 className="font-bold text-gray-900 text-lg">Vardiya Özeti</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
                      <div className="text-center bg-white p-4 rounded-lg shadow-sm border border-blue-200">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {personnelDetails.filter(d => d.shift_type === 'gece').length}
                        </div>
                        <div className="text-sm text-gray-700 font-medium">🌙 Gece Haftası</div>
                      </div>
                      <div className="text-center bg-white p-4 rounded-lg shadow-sm border border-green-200">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                          {personnelDetails.filter(d => d.shift_type === 'gunduz').length}
                        </div>
                        <div className="text-sm text-gray-700 font-medium">☀️ Gündüz Haftası</div>
                      </div>
                      <div className="text-center bg-white p-4 rounded-lg shadow-sm border border-orange-200">
                        <div className="text-3xl font-bold text-orange-600 mb-2">
                          {personnelDetails.filter(d => d.shift_type === 'aksam').length}
                        </div>
                        <div className="text-sm text-gray-700 font-medium">🌅 Akşam Haftası</div>
                      </div>
                      <div className="text-center bg-white p-4 rounded-lg shadow-sm border border-purple-200">
                        <div className="text-3xl font-bold text-purple-600 mb-2">
                          {personnelDetails.filter(d => d.shift_type === 'gecici_gorev').length}
                        </div>
                        <div className="text-sm text-gray-700 font-medium">🔄 Geçici Görev Haftası</div>
                      </div>
                      <div className="text-center bg-white p-4 rounded-lg shadow-sm border border-red-200">
                        <div className="text-3xl font-bold text-red-600 mb-2">
                          {personnelDetails.filter(d => d.shift_type === 'raporlu').length}
                        </div>
                        <div className="text-sm text-gray-700 font-medium">🏥 Raporlu Haftası</div>
                      </div>
                      <div className="text-center bg-white p-4 rounded-lg shadow-sm border border-yellow-200">
                        <div className="text-3xl font-bold text-yellow-600 mb-2">
                          {personnelDetails.filter(d => d.shift_type === 'yillik_izin').length}
                        </div>
                        <div className="text-sm text-gray-700 font-medium">🏖️ Yıllık İzin Haftası</div>
                      </div>
                    </div>
                  </div>

                  {/* Günlük Takip Verileri */}
                  {filteredDailyNotes.length > 0 && (
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-lg mb-8">
                      <div className="flex items-center mb-6">
                        <FileText className="w-6 h-6 text-green-600 mr-3" />
                        <h4 className="font-bold text-green-900 text-lg">Günlük Takip Verileri</h4>
                        <span className="ml-auto bg-green-200 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                          {filteredDailyNotes.length} kayıt
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-green-200">
                          <thead className="bg-green-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-bold text-green-700 uppercase tracking-wider">Tarih</th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-green-700 uppercase tracking-wider">Durum</th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-green-700 uppercase tracking-wider">Sebep</th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-green-700 uppercase tracking-wider">Notlar</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-green-200">
                            {filteredDailyNotes.map((note, index) => (
                              <tr key={index} className="hover:bg-green-50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {new Date(note.date).toLocaleDateString('tr-TR')}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2 py-1 text-xs font-bold rounded-full ${
                                    note.status === 'dinlenme' ? 'bg-purple-100 text-purple-800' :
                                    note.status === 'raporlu' ? 'bg-red-100 text-red-800' :
                                    note.status === 'yillik_izin' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {note.status === 'dinlenme' ? '😴 Dinlenme' :
                                     note.status === 'raporlu' ? '🏥 Raporlu' :
                                     note.status === 'yillik_izin' ? '🏖️ İzinli' :
                                     note.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {note.reason || '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {note.notes || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                      <h5 className="font-bold text-gray-900 text-lg flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-gray-600" />
                        Vardiya Geçmişi
                      </h5>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                              Hafta
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                              Vardiya Tipi
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                              Başlangıç
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                              Bitiş
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                              Süre
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                              Detay
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {personnelDetails.map((detail, index) => (
                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {detail.period_info ? (
                                  `${new Date(detail.period_info.start_date).toLocaleDateString('tr-TR')} - ${new Date(detail.period_info.end_date).toLocaleDateString('tr-TR')}`
                                ) : (
                                  `Dönem ${detail.period_id || index + 1}`
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full ${
                                  detail.shift_type === 'gece' ? 'bg-blue-100 text-blue-800' :
                                  detail.shift_type === 'gunduz' ? 'bg-green-100 text-green-800' :
                                  detail.shift_type === 'aksam' ? 'bg-orange-100 text-orange-800' :
                                  detail.shift_type === 'gecici_gorev' ? 'bg-purple-100 text-purple-800' :
                                  detail.shift_type === 'raporlu' ? 'bg-red-100 text-red-800' :
                                  detail.shift_type === 'yillik_izin' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {detail.shift_type === 'gece' ? '🌙 Gece' :
                                   detail.shift_type === 'gunduz' ? '☀️ Gündüz' :
                                   detail.shift_type === 'aksam' ? '🌅 Akşam' :
                                   detail.shift_type === 'gecici_gorev' ? '🔄 Geçici' :
                                   detail.shift_type === 'raporlu' ? '🏥 Raporlu' :
                                   detail.shift_type === 'yillik_izin' ? '🏖️ İzinli' :
                                   detail.shift_type}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {detail.period_info ? 
                                  new Date(detail.period_info.start_date).toLocaleDateString('tr-TR') :
                                  new Date(detail.created_at).toLocaleDateString('tr-TR')
                                }
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {detail.period_info ? 
                                  new Date(detail.period_info.end_date).toLocaleDateString('tr-TR') :
                                  new Date(detail.updated_at || detail.created_at).toLocaleDateString('tr-TR')
                                }
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {(() => {
                                  if (detail.shift_type === 'gece') {
                                    return 'Gece Vardiyası';
                                  } else if (detail.shift_type === 'gunduz') {
                                    return 'Gündüz Vardiyası';
                                  } else if (detail.shift_type === 'aksam') {
                                    return 'Akşam Vardiyası';
                                  } else if (detail.shift_type === 'gecici_gorev') {
                                    return 'Geçici Görev';
                                  } else if (detail.shift_type === 'raporlu') {
                                    return 'Raporlu';
                                  } else if (detail.shift_type === 'yillik_izin') {
                                    return 'Yıllık İzin';
                                  } else {
                                    return 'Dinlenme';
                                  }
                                })()}
                              </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => {
                                    // Bu haftanın günlük takip verilerini filtrele
                                    if (detail.period_info) {
                                      const startDate = new Date(detail.period_info.start_date);
                                      const endDate = new Date(detail.period_info.end_date);

                                      const weekDailyNotes = dailyNotes.filter(note => {
                                        const noteDate = new Date(note.date);
                                        return note.employee_code === selectedPersonnel &&
                                               noteDate >= startDate && noteDate <= endDate;
                                      });

                                      // Modal aç
                                      setSelectedWeekDetails({
                                        period: detail.period_info,
                                        dailyNotes: weekDailyNotes,
                                        shiftType: detail.shift_type
                                      });
                                    }
                                  }}
                                  className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Detay
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium text-lg">Bu personel için vardiya kaydı bulunamadı</p>
                  <p className="text-sm text-gray-400 mt-2">Personel henüz vardiya programına dahil edilmemiş olabilir</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Veri Ekleme Modalı */}
      {showAbsenceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <Plus className="w-6 h-6 mr-3 text-blue-600" />
                {editMode ? 'Veri Düzenle' : 'Veri Ekle'}
              </h3>
              <button
                onClick={() => {
                  setShowAbsenceModal(false);
                  setEditMode(false);
                  setEditingRecord(null);
                  setNewAbsence({
                    employee_code: '',
                    date: new Date().toISOString().split('T')[0],
                    status: '',
                    notes: ''
                  });
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleAddAbsence} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center">
                    <User className="w-4 h-4 mr-2 text-blue-600" />
                    Personel Seç
                  </label>
                  <select
                    value={newAbsence.employee_code}
                    onChange={(e) => setNewAbsence({...newAbsence, employee_code: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
                    required
                  >
                    <option value="" disabled>Personel seçin</option>
                    {personnelList.map((personnel) => (
                      <option key={personnel.employee_code} value={personnel.employee_code}>
                        {personnel.full_name} - {personnel.position}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-green-600" />
                    Tarih
                  </label>
                  <input
                    type="date"
                    value={newAbsence.date}
                    onChange={(e) => setNewAbsence({...newAbsence, date: e.target.value})}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm font-medium"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center">
                    <span className="mr-2">📊</span>
                    Durum
                  </label>
                  <select
                    value={newAbsence.status}
                    onChange={(e) => setNewAbsence({...newAbsence, status: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm font-medium"
                    required
                  >
                    <option value="" disabled>Durum seçin</option>
                    <option value="raporlu">🏥 Raporlu</option>
                    <option value="habersiz">❌ Habersiz</option>
                    <option value="yillik_izin">🏖️ Yıllık İzin</option>
                    <option value="dinlenme">😴 Dinlenme</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center">
                    <span className="mr-2">📝</span>
                    Açıklama
                  </label>
                  <textarea
                    value={newAbsence.notes}
                    onChange={(e) => setNewAbsence({...newAbsence, notes: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm font-medium resize-none"
                    rows="3"
                    placeholder="Açıklama ekleyin..."
                  />
                </div>
                
                <div className="flex justify-end space-x-4 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAbsenceModal(false);
                      setEditMode(false);
                      setEditingRecord(null);
                      setNewAbsence({
                        employee_code: '',
                        date: new Date().toISOString().split('T')[0],
                        status: '',
                        notes: ''
                      });
                    }}
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium transform hover:scale-105"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={absenceLoading}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-medium shadow-lg"
                  >
                    {absenceLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        {editMode ? 'Güncelleniyor...' : 'Ekleniyor...'}
                      </>
                    ) : (
                      <>
                        {editMode ? <Save className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                        {editMode ? 'Güncelle' : 'Ekle'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Hafta Detayları Modalı */}
      {selectedWeekDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <Calendar className="w-6 h-6 mr-3 text-blue-600" />
                Hafta Detayları
              </h3>
              <button
                onClick={() => setSelectedWeekDetails(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-6">
                {/* Hafta Bilgileri */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                    <div className="text-sm font-medium text-blue-800 mb-1">Hafta Aralığı</div>
                    <div className="text-lg font-bold text-blue-900">
                      {(() => {
                        const startDate = new Date(selectedWeekDetails.period.start_date);
                        const endDate = new Date(selectedWeekDetails.period.end_date);
                        
                        // Geçerli tarih kontrolü
                        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                          return 'Tarih bilgisi bulunamadı';
                        }
                        
                        return `${startDate.toLocaleDateString('tr-TR')} - ${endDate.toLocaleDateString('tr-TR')}`;
                      })()}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                    <div className="text-sm font-medium text-green-800 mb-1">Vardiya Tipi</div>
                    <div className="text-lg font-bold text-green-900">
                      {selectedWeekDetails.shiftType === 'gece' ? '🌙 Gece' :
                       selectedWeekDetails.shiftType === 'gunduz' ? '☀️ Gündüz' :
                       selectedWeekDetails.shiftType === 'aksam' ? '🌅 Akşam' :
                       selectedWeekDetails.shiftType === 'gecici_gorev' ? '🔄 Geçici' :
                       selectedWeekDetails.shiftType === 'raporlu' ? '🏥 Raporlu' :
                       selectedWeekDetails.shiftType === 'yillik_izin' ? '🏖️ İzinli' :
                       selectedWeekDetails.shiftType}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                    <div className="text-sm font-medium text-purple-800 mb-1">Günlük Kayıt</div>
                    <div className="text-lg font-bold text-purple-900">
                      {selectedWeekDetails.dailyNotes.length} kayıt
                    </div>
                  </div>
                </div>

                {/* Haftalık Günlük Detayları */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center mb-6">
                    <Calendar className="w-6 h-6 text-gray-600 mr-3" />
                    <h4 className="font-bold text-gray-900 text-lg">Haftalık Günlük Detayları</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                                         {(() => {
                       const startDate = new Date(selectedWeekDetails.period.start_date);
                       const endDate = new Date(selectedWeekDetails.period.end_date);
                       const days = [];
                       
                       // Geçerli tarih kontrolü
                       if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                         return <div className="text-center py-8 text-gray-500">Tarih bilgisi bulunamadı</div>;
                       }
                       
                       for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                         const currentDate = new Date(d);
                         const dateStr = currentDate.toISOString().split('T')[0];
                         
                         // Bu gün için daily_notes verisi var mı?
                         const dailyNote = selectedWeekDetails.dailyNotes.find(note => 
                           note.date === dateStr
                         );
                         
                         days.push({
                           date: currentDate,
                           dateStr: dateStr,
                           hasDailyNote: !!dailyNote,
                           dailyNote: dailyNote
                         });
                       }
                      
                      return days.map((day, index) => (
                        <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                          <div className="text-center mb-3">
                            <div className="text-sm font-medium text-gray-600">
                              {day.date.toLocaleDateString('tr-TR', { weekday: 'short' })}
                            </div>
                            <div className="text-lg font-bold text-gray-900">
                              {day.date.getDate()}
                            </div>
                          </div>
                          
                          {day.hasDailyNote ? (
                            // Daily_notes verisi varsa onu göster
                            <div className="text-center">
                              <span className={`inline-flex items-center px-2 py-1 text-xs font-bold rounded-full ${
                                day.dailyNote.status === 'dinlenme' ? 'bg-purple-100 text-purple-800' :
                                day.dailyNote.status === 'raporlu' ? 'bg-red-100 text-red-800' :
                                day.dailyNote.status === 'yillik_izin' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {day.dailyNote.status === 'dinlenme' ? '😴 Dinlenme' :
                                 day.dailyNote.status === 'raporlu' ? '🏥 Raporlu' :
                                 day.dailyNote.status === 'yillik_izin' ? '🏖️ İzinli' :
                                 day.dailyNote.status}
                              </span>
                              {day.dailyNote.reason && (
                                <div className="text-xs text-gray-600 mt-1">
                                  {day.dailyNote.reason}
                                </div>
                              )}
                            </div>
                          ) : (
                            // Daily_notes verisi yoksa normal vardiya planını göster
                            <div className="text-center">
                              <span className={`inline-flex items-center px-2 py-1 text-xs font-bold rounded-full ${
                                selectedWeekDetails.shiftType === 'gece' ? 'bg-blue-100 text-blue-800' :
                                selectedWeekDetails.shiftType === 'gunduz' ? 'bg-green-100 text-green-800' :
                                selectedWeekDetails.shiftType === 'aksam' ? 'bg-orange-100 text-orange-800' :
                                selectedWeekDetails.shiftType === 'gecici_gorev' ? 'bg-purple-100 text-purple-800' :
                                selectedWeekDetails.shiftType === 'raporlu' ? 'bg-red-100 text-red-800' :
                                selectedWeekDetails.shiftType === 'yillik_izin' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {selectedWeekDetails.shiftType === 'gece' ? '🌙 Gece' :
                                 selectedWeekDetails.shiftType === 'gunduz' ? '☀️ Gündüz' :
                                 selectedWeekDetails.shiftType === 'aksam' ? '🌅 Akşam' :
                                 selectedWeekDetails.shiftType === 'gecici_gorev' ? '🔄 Geçici' :
                                 selectedWeekDetails.shiftType === 'raporlu' ? '🏥 Raporlu' :
                                 selectedWeekDetails.shiftType === 'yillik_izin' ? '🏖️ İzinli' :
                                 selectedWeekDetails.shiftType}
                              </span>
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


          {/* Şu Anki Vardiya Modal */}
      {showCurrentShiftModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingShift ? 'Vardiya Düzenle' : 'Yeni Vardiya Ekle'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Dönem: {getCurrentPeriod().label}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowCurrentShiftModal(false);
                    setEditingShift(null);
                    setShiftForm({
                      employee_code: '',
                      shift_type: 'gunduz',
                      shift_hours: '08:00 - 16:00',
                      status: 'dinlenme'
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSaveShift} className="space-y-4">
                {!editingShift && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Personel
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Personel ara..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onChange={(e) => {
                          const searchTerm = e.target.value.toLowerCase();
                          const filteredPersonnel = personnelList.filter(person => 
                            person.full_name.toLowerCase().includes(searchTerm) ||
                            person.employee_code.toString().includes(searchTerm)
                          );
                          setFilteredPersonnelForModal(filteredPersonnel);
                        }}
                      />
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredPersonnelForModal.map(person => (
                          <div
                            key={person.employee_code}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                              setShiftForm({...shiftForm, employee_code: person.employee_code});
                              setFilteredPersonnelForModal([]);
                            }}
                          >
                            <div className="font-medium">{person.full_name}</div>
                            <div className="text-sm text-gray-500">
                              {person.employee_code} - {person.position}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {shiftForm.employee_code && (
                      <div className="mt-2 p-2 bg-blue-50 rounded-md">
                        <div className="text-sm font-medium text-blue-800">
                          Seçili: {personnelList.find(p => p.employee_code === shiftForm.employee_code)?.full_name}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {editingShift && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Personel
                    </label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                      <div className="font-medium text-gray-900">
                        {personnelList.find(p => p.employee_code === editingShift.employee_code)?.full_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {editingShift.employee_code} - {personnelList.find(p => p.employee_code === editingShift.employee_code)?.position}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vardiya Tipi
                  </label>
                  <select
                    value={shiftForm.shift_type}
                    onChange={(e) => {
                      const shiftType = e.target.value;
                      let shiftHours = '08:00 - 16:00';
                      if (shiftType === 'gece') shiftHours = '22:00 - 06:00';
                      else if (shiftType === 'aksam') shiftHours = '16:00 - 00:00';
                      setShiftForm({...shiftForm, shift_type: shiftType, shift_hours: shiftHours});
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="gunduz">Gündüz (08:00 - 16:00)</option>
                    <option value="gece">Gece (22:00 - 06:00)</option>
                    <option value="aksam">Akşam (16:00 - 00:00)</option>
                    <option value="yillik_izin">Yıllık İzin</option>
                    <option value="raporlu">Raporlu</option>
                    <option value="dinlenme">Dinlenme</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vardiya Saatleri
                  </label>
                  <input
                    type="text"
                    value={shiftForm.shift_hours}
                    onChange={(e) => setShiftForm({...shiftForm, shift_hours: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="08:00 - 16:00"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCurrentShiftModal(false);
                      setEditingShift(null);
                      setShiftForm({
                        employee_code: '',
                        shift_type: 'gunduz',
                        shift_hours: '08:00 - 16:00',
                        status: 'dinlenme'
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    {editingShift ? 'Güncelle' : 'Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Genel Tarih Düzenleme Modalı */}
      {globalDateEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[85vh] overflow-hidden border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <Calendar className="w-6 h-6 mr-3 text-purple-600" />
                Genel Tarih Düzenleme
              </h3>
              <button
                onClick={() => setGlobalDateEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-6">
                {/* Tüm Tarihler Listesi */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                  <h4 className="font-bold text-blue-900 text-lg mb-4">📋 Tüm Tarih Aralıkları</h4>
                  
                  {globalEditLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-blue-600 font-medium">Tarihler yükleniyor...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {allPeriods.map((period, index) => (
                        <div 
                          key={period.id}
                          onClick={() => handleSelectPeriodForEdit(period)}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                            selectedPeriodForEdit?.id === period.id
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50'
                          }`}
                        >
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(period.start_date).toLocaleDateString('tr-TR')} - {new Date(period.end_date).toLocaleDateString('tr-TR')}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            ID: {period.id}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Seçili Tarih Düzenleme */}
                {selectedPeriodForEdit && (
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                    <h4 className="font-bold text-green-900 text-lg mb-4">✏️ Seçili Tarihi Düzenle</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-green-800 mb-2">Yeni Başlangıç Tarihi</label>
                        <input
                          type="date"
                          value={globalEditForm.new_start_date}
                          onChange={(e) => setGlobalEditForm({...globalEditForm, new_start_date: e.target.value})}
                          className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-green-800 mb-2">Yeni Bitiş Tarihi</label>
                        <input
                          type="date"
                          value={globalEditForm.new_end_date}
                          onChange={(e) => setGlobalEditForm({...globalEditForm, new_end_date: e.target.value})}
                          className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="text-sm text-yellow-800">
                        <strong>⚠️ Dikkat:</strong> Bu işlem tüm veritabanında bu tarih aralığındaki tüm vardiya kayıtlarını etkileyecektir.
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end space-x-3">
                      <button
                        onClick={() => setSelectedPeriodForEdit(null)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        Seçimi İptal Et
                      </button>
                      <button
                        onClick={handleUpdateGlobalDate}
                        disabled={globalEditLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        {globalEditLoading ? (
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


      </>
    );
};

export default PersonelVardiyaKontrol; 