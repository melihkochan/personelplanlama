import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Users, Upload, Clock, TrendingUp, AlertCircle, CheckCircle, XCircle, BarChart3, FileText, Plus, Save, Eye, X, User, Trash2, RefreshCw, Edit, Download, Info, Check, Car, Edit3, Moon, Sun } from 'lucide-react';
import { saveWeeklySchedules, saveWeeklyPeriods, saveDailyAttendance, getAllShiftStatistics, getDailyAttendance, getAllPersonnel, getWeeklyPeriods, getPersonnelShiftDetails, getWeeklySchedules, getDailyNotes, clearAllShiftData, saveExcelData, saveCurrentWeekExcelData, deletePeriodAndShifts, logAuditEvent, supabase } from '../../services/supabase';
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

const PersonelVardiyaKontrol = ({ userRole, onDataUpdate, onCurrentShiftDataUpdate, currentUser }) => {
  // getMonthName fonksiyonunu en başta tanımla
  const getMonthName = (month) => {
    const months = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return months[month] || 'Bilinmeyen';
  };

  const [activeTab, setActiveTab] = useState('current-shift');
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
  const [sortOrder, setSortOrder] = useState('code'); // name, code, position
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

  // Vardiya düzenleme state'leri
  const [editingShift, setEditingShift] = useState(null);
  const [showShiftEditModal, setShowShiftEditModal] = useState(false);
  const [shiftEditForm, setShiftEditForm] = useState({
    shift_type: '',
    shift_details: ''
  });
  const [shiftEditLoading, setShiftEditLoading] = useState(false);

  // Güncel vardiya düzenleme state'leri
  const [editingCurrentShift, setEditingCurrentShift] = useState(null);
  const [showCurrentShiftEditModal, setShowCurrentShiftEditModal] = useState(false);
  const [currentShiftEditForm, setCurrentShiftEditForm] = useState({
    shift_type: '',
    shift_hours: ''
  });
  const [currentShiftEditLoading, setCurrentShiftEditLoading] = useState(false);

  // Personel detay modalı için tarih aralığı state'leri
  const [detailDateRange, setDetailDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [filteredPersonnelDetails, setFilteredPersonnelDetails] = useState([]);
  const [filteredDailyNotes, setFilteredDailyNotes] = useState([]);
  
  // Güncel vardiya state'leri
  const [currentShiftData, setCurrentShiftData] = useState([]);
  const [currentShiftLoading, setCurrentShiftLoading] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState(null);
  
  // Infinite scroll state'leri
  const [currentShiftPage, setCurrentShiftPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageSize] = useState(20); // Sayfa başına 20 kayıt

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
                      
                      // weekly_periods tablosunda aynı tarih var mı kontrol et
                      const { data: existingPeriods, error: checkError } = await supabase
                        .from('weekly_periods')
                        .select('week_label')
                        .eq('start_date', startDateStr)
                        .eq('end_date', endDateStr);
                      
                      if (checkError) {
                        console.log('⚠️ Mevcut dönem kontrolü hatası:', checkError);
                      }
                      
                      // Eğer aynı tarih yoksa ekle
                      if (!existingPeriods || existingPeriods.length === 0) {
                        periods.push({
                          start_date: startDateStr,
                          end_date: endDateStr,
                          week_label: weekLabel,
                          year: year
                        });
                        console.log('✅ Yeni dönem eklenecek:', weekLabel);
                      } else {
                        console.log('⚠️ Bu dönem zaten mevcut:', weekLabel);
                      }
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
            // Audit log kaydet
            await logAuditEvent({
              userId: currentUser?.id,
              userEmail: currentUser?.email,
              userName: currentUser?.user_metadata?.full_name || currentUser?.email,
              action: 'BULK_CREATE',
              tableName: 'weekly_periods',
              recordId: null,
              oldValues: null,
              newValues: { periods: periods.length, schedules: schedules.length },
              ipAddress: null,
              userAgent: navigator.userAgent,
              details: `Excel yükleme: ${periods.length} haftalık dönem, ${schedules.length} vardiya kaydı eklendi`
            });
            
            console.log('✅ Excel verisi başarıyla yüklendi');
            setUploadMessage({
              type: 'success',
              text: `✅ Excel verisi başarıyla yüklendi!\n\n📊 ${periods.length} haftalık dönem\n👥 ${schedules.length} vardiya kaydı\n\nVeriler sisteme kaydedildi.`
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
            
            // İstatistikleri yeniden yükle
            console.log('🔄 İstatistikler güncelleniyor...');
            await loadInitialData();
            await loadDailyNotes();
            
            console.log('✅ Veri güncelleme tamamlandı');
          } else {
            // Mevcut veri uyarısı veya diğer hatalar
            console.error('❌ Excel yükleme hatası:', result.error);
            setUploadMessage({
              type: 'error',
              text: result.error
            });
            return; // İşlemi durdur
          }
          
        } catch (error) {
          console.error('❌ Excel işleme hatası:', error);
          setUploadMessage({
            type: 'error',
            text: `❌ Excel dosyası işlenirken hata oluştu:\n${error.message}`
          });
        } finally {
          setUploadLoading(false);
        }
      };
      
      reader.readAsArrayBuffer(file);
      
    } catch (error) {
      console.error('❌ Dosya okuma hatası:', error);
      setUploadMessage({
        type: 'error',
        text: `❌ Dosya okunamadı:\n${error.message}`
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
    loadCurrentShiftData();
  }, []);

  // Güncel vardiya tab'ı aktif olduğunda verileri yükle
  useEffect(() => {
    if (activeTab === 'current-shift') {
      loadCurrentShiftData();
    }
  }, [activeTab]);

  // currentShiftData güncellendiğinde parent'a bildir
  useEffect(() => {
    if (onCurrentShiftDataUpdate && currentShiftData.length > 0) {
      onCurrentShiftDataUpdate(currentShiftData);
    }
  }, [currentShiftData, onCurrentShiftDataUpdate]);

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
        
        // Audit log kaydet
        await logAuditEvent({
          userId: currentUser?.id,
          userEmail: currentUser?.email,
          userName: currentUser?.user_metadata?.full_name || currentUser?.email,
          action: 'UPDATE',
          tableName: 'weekly_schedules',
          recordId: editingShift.id,
          oldValues: editingShift,
          newValues: shiftData,
          ipAddress: null,
          userAgent: navigator.userAgent,
          details: `Vardiya güncellendi: ${shiftData.employee_code} - ${shiftData.shift_type}`
        });
        
        console.log('✅ Vardiya güncellendi');
      } else {
        // Yeni kayıt
        const { data, error } = await supabase
          .from('weekly_schedules')
          .insert(shiftData)
          .select();
        
        if (error) throw error;
        
        // Audit log kaydet
        await logAuditEvent({
          userId: currentUser?.id,
          userEmail: currentUser?.email,
          userName: currentUser?.user_metadata?.full_name || currentUser?.email,
          action: 'CREATE',
          tableName: 'weekly_schedules',
          recordId: data?.[0]?.id,
          oldValues: null,
          newValues: shiftData,
          ipAddress: null,
          userAgent: navigator.userAgent,
          details: `Yeni vardiya eklendi: ${shiftData.employee_code} - ${shiftData.shift_type}`
        });
        
        console.log('✅ Yeni vardiya eklendi');
      }


      
      // Ana sayfayı güncelle
      if (onDataUpdate) {
        await onDataUpdate();
      }
      


    } catch (error) {
      console.error('❌ Vardiya kaydetme hatası:', error);
      alert('Vardiya kaydedilemedi: ' + error.message);
    }
  };



  // Vardiya silme fonksiyonu
  // Vardiya düzenleme fonksiyonu
  const handleEditShift = (shift) => {
    setEditingShift(shift);
    setShiftEditForm({
      shift_type: shift.shift_type || '',
      shift_details: shift.shift_details || ''
    });
    setShowShiftEditModal(true);
  };




  // Vardiya güncelleme fonksiyonu
  const handleUpdateShift = async (e) => {
    e.preventDefault();
    
    if (!editingShift) return;
    
    setShiftEditLoading(true);
    
    try {

      
      // weekly_schedules tablosunu güncelle
      const { error: weeklySchedulesError } = await supabase
        .from('weekly_schedules')
        .update({
          shift_type: shiftEditForm.shift_type,
          shift_hours: shiftEditForm.shift_details
        })
        .eq('employee_code', editingShift.employee_code)
        .eq('period_id', editingShift.period_id);
      
      if (weeklySchedulesError) {
        console.error('❌ Weekly schedules güncellenemedi:', weeklySchedulesError);
      } else {
        // Audit log kaydet
        await logAuditEvent({
          userId: currentUser?.id,
          userEmail: currentUser?.email,
          userName: currentUser?.user_metadata?.full_name || currentUser?.email,
          action: 'UPDATE',
          tableName: 'weekly_schedules',
          recordId: editingShift.id,
          oldValues: editingShift,
          newValues: {
            ...editingShift,
            shift_type: shiftEditForm.shift_type,
            shift_hours: shiftEditForm.shift_details
          },
          ipAddress: null,
          userAgent: navigator.userAgent,
          details: `Vardiya güncellendi: ${editingShift.employee_code} - ${shiftEditForm.shift_type}`
        });
      }
      
      console.log('✅ Vardiya güncellendi');
      setShowShiftEditModal(false);
      setEditingShift(null);
      
      // Ana sayfa takvimini güncelle
      if (onDataUpdate) {
        await onDataUpdate();
      }
      
    } catch (error) {
      console.error('❌ Vardiya güncelleme hatası:', error);
      alert('Vardiya güncellenemedi: ' + error.message);
    } finally {
      setShiftEditLoading(false);
    }
  };

  // Vardiya silme fonksiyonu
  const handleDeleteShift = async (shiftId) => {
    if (!confirm('Bu vardiyayı silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      // Önce silinecek vardiyayı al
      const { data: shiftToDelete, error: fetchError } = await supabase
        .from('weekly_schedules')
        .select('*')
        .eq('id', shiftId)
        .single();
      
      if (fetchError) {
        throw fetchError;
      }
      
      const { error } = await supabase
        .from('weekly_schedules')
        .delete()
        .eq('id', shiftId);
      
      if (error) throw error;
      
      // Audit log kaydet
      await logAuditEvent({
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userName: currentUser?.user_metadata?.full_name || currentUser?.email,
        action: 'DELETE',
        tableName: 'weekly_schedules',
        recordId: shiftId,
        oldValues: shiftToDelete,
        newValues: null,
        ipAddress: null,
        userAgent: navigator.userAgent,
        details: `Vardiya silindi: ${shiftToDelete?.employee_code} - ${shiftToDelete?.shift_type}`
      });
      
      console.log('✅ Vardiya silindi');
      
      // Ana sayfayı güncelle
      if (onDataUpdate) {
        await onDataUpdate();
      }
      
    } catch (error) {
      console.error('❌ Vardiya silme hatası:', error);
      alert('Vardiya silinemedi: ' + error.message);
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
      

      
      // 6. Bugünkü durumu da yükle
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
    
    // Sıralama - Önce pozisyona göre, sonra Sicil numarasına göre
    filtered.sort((a, b) => {
      // Önce pozisyona göre sırala
      const aPosition = a.position || '';
      const bPosition = b.position || '';
      
      // Sevkiyat Elemanları önce, Şoförler sonra
      const positionOrder = {
        'SEVKİYAT ELEMANI': 1,
        'ŞOFÖR': 2
      };
      
      const aPositionOrder = positionOrder[aPosition] || 3;
      const bPositionOrder = positionOrder[bPosition] || 3;
      
      if (aPositionOrder !== bPositionOrder) {
        return aPositionOrder - bPositionOrder;
      }
      
      // Pozisyon aynıysa Sicil numarasına göre sırala
      const aCode = a.employee_code || '';
      const bCode = b.employee_code || '';
      const codeComparison = aCode.localeCompare(bCode);
      
      if (codeComparison !== 0) {
        return sortDirection === 'asc' ? codeComparison : -codeComparison;
      }
      
      // Sicil numarası da aynıysa isme göre sırala
      const aName = a.full_name || '';
      const bName = b.full_name || '';
      return aName.localeCompare(bName, 'tr');
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
        
        // Audit log kaydet
        await logAuditEvent({
          userId: currentUser?.id,
          userEmail: currentUser?.email,
          userName: currentUser?.user_metadata?.full_name || currentUser?.email,
          action: 'UPDATE',
          tableName: 'daily_notes',
          recordId: editingRecord.id,
          oldValues: editingRecord,
          newValues: {
            employee_code: newAbsence.employee_code,
            date: newAbsence.date,
            status: newAbsence.status,
            reason: newAbsence.notes
          },
          ipAddress: null,
          userAgent: navigator.userAgent,
          details: `Günlük not güncellendi: ${newAbsence.employee_code} - ${newAbsence.status} (${newAbsence.date})`
        });
        
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
        
        // Audit log kaydet
        await logAuditEvent({
          userId: currentUser?.id,
          userEmail: currentUser?.email,
          userName: currentUser?.user_metadata?.full_name || currentUser?.email,
          action: 'CREATE',
          tableName: 'daily_notes',
          recordId: result.data?.[0]?.id,
          oldValues: null,
          newValues: {
            employee_code: newAbsence.employee_code,
            date: newAbsence.date,
            status: newAbsence.status,
            reason: newAbsence.notes
          },
          ipAddress: null,
          userAgent: navigator.userAgent,
          details: `Günlük not eklendi: ${newAbsence.employee_code} - ${newAbsence.status} (${newAbsence.date})`
        });
        
        setShowAbsenceModal(false);
      }
      
      setNewAbsence({
        employee_code: '',
        date: new Date().toISOString().split('T')[0],
        status: '',
        notes: ''
      });
      await loadDailyNotes(); // Günlük notları yenile
      
      // Vardiya güncellemesi yapıldıysa weekly_schedules tablosunu da güncelle
      if (newAbsence.status === 'raporlu' || newAbsence.status === 'yillik_izin') {
        console.log('🔄 Vardiya güncellemesi yapılıyor...');
        
        // Seçilen tarihin hangi haftaya ait olduğunu bul
        const selectedDate = new Date(newAbsence.date);
        const currentPeriod = await getCurrentPeriod();
        
        if (currentPeriod) {
          const periodStart = new Date(currentPeriod.start_date);
          const periodEnd = new Date(currentPeriod.end_date);
          
          // Seçilen tarih güncel dönem içindeyse güncelle
          if (selectedDate >= periodStart && selectedDate <= periodEnd) {
            console.log('✅ Tarih güncel dönem içinde, vardiya güncelleniyor...');
            
            // weekly_schedules tablosunu güncelle
            const { error: weeklySchedulesError } = await supabase
              .from('weekly_schedules')
              .update({ 
                shift_type: newAbsence.status === 'raporlu' ? 'raporlu' : 'yillik_izin',
                shift_hours: newAbsence.status === 'raporlu' ? 'Raporlu' : 'Yıllık izinli'
              })
              .eq('employee_code', newAbsence.employee_code)
              .eq('period_id', currentPeriod.id);
            
            if (weeklySchedulesError) {
              console.error('❌ Weekly schedules güncellenemedi:', weeklySchedulesError);
            } else {
              console.log('✅ Weekly schedules güncellendi');
            }
          }
        }
      }
      
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
        return 'bg-yellow-100 text-yellow-800';
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
        // Önce silinecek kaydı al
        const { data: recordToDelete, error: fetchError } = await supabase
          .from('daily_notes')
          .select('*')
          .eq('id', id)
          .single();
        
        if (fetchError) {
          throw fetchError;
        }
        
        const result = await supabase
          .from('daily_notes')
          .delete()
          .eq('id', id);
        
        if (result.error) {
          throw result.error;
        }
        
        // Audit log kaydet
        await logAuditEvent({
          userId: currentUser?.id,
          userEmail: currentUser?.email,
          userName: currentUser?.user_metadata?.full_name || currentUser?.email,
          action: 'DELETE',
          tableName: 'daily_notes',
          recordId: id,
          oldValues: recordToDelete,
          newValues: null,
          ipAddress: null,
          userAgent: navigator.userAgent,
          details: `Günlük not silindi: ${recordToDelete?.employee_code} - ${recordToDelete?.status} (${recordToDelete?.date})`
        });
        
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

      // Audit log kaydet
      await logAuditEvent({
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userName: currentUser?.user_metadata?.full_name || currentUser?.email,
        action: 'UPDATE',
        tableName: 'weekly_periods',
        recordId: selectedPeriodForEdit.id,
        oldValues: selectedPeriodForEdit,
        newValues: {
          ...selectedPeriodForEdit,
          start_date: globalEditForm.new_start_date,
          end_date: globalEditForm.new_end_date
        },
        ipAddress: null,
        userAgent: navigator.userAgent,
        details: `Haftalık dönem güncellendi: ${selectedPeriodForEdit.start_date} - ${selectedPeriodForEdit.end_date} → ${globalEditForm.new_start_date} - ${globalEditForm.new_end_date} (${schedules.length} vardiya etkilendi)`
      });

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

  // Seçili dönemi silme fonksiyonu
  const handleDeletePeriod = async (periodId) => {
    console.log('🗑️ Silme işlemi başlatılıyor...', periodId);
    
    if (!periodId) {
      alert('Lütfen silinecek bir tarih seçin!');
      return;
    }

    if (!confirm('Bu tarih aralığını ve tüm vardiya verilerini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
      return;
    }

    try {
      setGlobalEditLoading(true);
      console.log('🔄 Silme işlemi başlatılıyor...');
      
      const result = await deletePeriodAndShifts(periodId);
      console.log('📊 Silme sonucu:', result);
      
      if (result.success) {
        // Audit log kaydet
        await logAuditEvent({
          userId: currentUser?.id,
          userEmail: currentUser?.email,
          userName: currentUser?.user_metadata?.full_name || currentUser?.email,
          action: 'DELETE',
          tableName: 'weekly_periods',
          recordId: periodId,
          oldValues: { periodId, deletedAt: new Date().toISOString() },
          newValues: null,
          ipAddress: null,
          userAgent: navigator.userAgent,
          details: `Haftalık dönem ve vardiya verileri silindi: Period ID ${periodId}`
        });
        
        console.log('✅ Dönem başarıyla silindi');
        alert('Dönem ve vardiya verileri başarıyla silindi!');
        
        // Verileri yenile ve modal'ı açık tut
        console.log('🔄 Veriler yenileniyor...');
        await loadInitialData();
        console.log('✅ Veriler yenilendi');
        
        // Global date edit modal verilerini yenile
        if (globalDateEditModal) {
          console.log('🔄 Global date edit modal verileri yenileniyor...');
          try {
            const { data: periods, error } = await supabase
              .from('weekly_periods')
              .select('*')
              .order('start_date', { ascending: true });
            
            if (!error) {
              setAllPeriods(periods || []);
              console.log('✅ Global date edit modal verileri yenilendi:', periods?.length || 0, 'kayıt');
            } else {
              console.error('❌ Global date edit modal veri yenileme hatası:', error);
            }
          } catch (error) {
            console.error('❌ Global date edit modal veri yenileme hatası:', error);
          }
        }
        
        // Seçimi temizle ama modal'ı açık tut
        setSelectedPeriodForEdit(null);
        setGlobalEditForm({ new_start_date: '', new_end_date: '' });
      } else {
        console.error('❌ Dönem silme hatası:', result.error);
        alert('Dönem silinirken hata oluştu: ' + (result.error?.message || result.error));
      }
      
    } catch (error) {
      console.error('❌ Dönem silme hatası:', error);
      alert('Dönem silinirken hata oluştu: ' + error.message);
    } finally {
      setGlobalEditLoading(false);
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

  // Güncel vardiya verilerini yükle (infinite scroll)
  const loadCurrentShiftData = async (page = 1, append = false) => {
    if (page === 1) {
      setCurrentShiftLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      console.log('🔍 Güncel vardiya verileri yükleniyor...');
      
      // En güncel dönemi bul
      const { data: periods, error: periodsError } = await supabase
        .from('weekly_periods')
        .select('*')
        .order('start_date', { ascending: false })
        .limit(1);
      
      if (periodsError) {
        console.error('❌ Güncel dönem bulunamadı:', periodsError);
        return;
      }
      
      console.log('📊 Bulunan dönemler:', periods);
      
      if (periods && periods.length > 0) {
        const latestPeriod = periods[0];
        setCurrentPeriod(latestPeriod);
        
        console.log('✅ En güncel dönem bulundu:', latestPeriod);
        
        // Bu dönemdeki tüm vardiya verilerini getir (sayfalama yok)
        console.log('🔍 Vardiya verileri aranıyor... Period ID:', latestPeriod.id);
        
        const { data: shifts, error: shiftsError } = await supabase
          .from('weekly_schedules')
          .select('*')
          .eq('period_id', latestPeriod.id)
          .order('employee_code', { ascending: true });
        
        if (shiftsError) {
          console.error('❌ Güncel vardiya verileri getirilemedi:', shiftsError);
          return;
        }
        
        console.log('📊 Bulunan vardiya verileri:', shifts);
        
        if (shifts && shifts.length > 0) {
          // Personel listesini getir (sadece gerekli olanları)
          const employeeCodes = shifts.map(s => s.employee_code);
          console.log('🔍 Aranan personel kodları:', employeeCodes);
          
          const { data: personnel, error: personnelError } = await supabase
            .from('personnel')
            .select('employee_code, full_name, position')
            .in('employee_code', employeeCodes);
          
          if (personnelError) {
            console.error('❌ Personel verileri getirilemedi:', personnelError);
            return;
          }
          
          console.log('📊 Bulunan personel verileri:', personnel);
          
          // Personel bilgilerini birleştir
          const personnelMap = {};
          personnel.forEach(p => {
            personnelMap[p.employee_code] = p;
          });
          
          const enrichedShifts = shifts.map(shift => {
            const person = personnelMap[shift.employee_code];
            return {
              ...shift,
              full_name: person?.full_name || 'Bilinmeyen',
              position: person?.position || 'Belirtilmemiş'
            };
          });
          
          if (append) {
            setCurrentShiftData(prev => [...prev, ...enrichedShifts]);
          } else {
            setCurrentShiftData(enrichedShifts);
          }
          
          // Daha fazla veri var mı kontrol et
          setHasMore(shifts.length === pageSize);
          setCurrentShiftPage(page);
          
          console.log('✅ Güncel vardiya verileri yüklendi:', enrichedShifts.length, 'kayıt (sayfa:', page, ')');
          console.log('📊 Örnek veri:', enrichedShifts[0]);
        } else {
          console.log('⚠️ Bu dönemde vardiya verisi bulunamadı');
          setCurrentShiftData([]);
          setHasMore(false);
        }
      } else {
        console.log('⚠️ Hiç dönem bulunamadı');
        setCurrentShiftData([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error('❌ Güncel vardiya verileri yükleme hatası:', error);
    } finally {
      setCurrentShiftLoading(false);
      setLoadingMore(false);
    }
  };

  // Güncel vardiya düzenleme fonksiyonları
  const handleEditCurrentShift = (shift) => {
    setEditingCurrentShift(shift);
    setCurrentShiftEditForm({
      shift_type: shift.shift_type || '',
      shift_hours: shift.shift_hours || ''
    });
    setShowCurrentShiftEditModal(true);
  };

  const handleUpdateCurrentShift = async (e) => {
    e.preventDefault();
    console.log('🔍 handleUpdateCurrentShift fonksiyonu çalışıyor...');
    setCurrentShiftEditLoading(true);
    
    try {
      const { error } = await supabase
        .from('weekly_schedules')
        .update({
          shift_type: currentShiftEditForm.shift_type,
          shift_hours: currentShiftEditForm.shift_hours
        })
        .eq('id', editingCurrentShift.id);
      
      if (error) {
        console.error('❌ Vardiya güncellenemedi:', error);
        return;
      }
      
      // Audit log kaydet
      console.log('🔍 Audit log ekleniyor...', {
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userName: currentUser?.user_metadata?.full_name || currentUser?.email,
        action: 'UPDATE',
        tableName: 'weekly_schedules',
        recordId: editingCurrentShift.id,
        oldValues: editingCurrentShift,
        newValues: {
          ...editingCurrentShift,
          shift_type: currentShiftEditForm.shift_type,
          shift_hours: currentShiftEditForm.shift_hours
        },
        ipAddress: null,
        userAgent: navigator.userAgent,
        details: `Güncel vardiya güncellendi: ${editingCurrentShift.employee_code} - ${currentShiftEditForm.shift_type}`
      });
      
      const auditResult = await logAuditEvent({
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userName: currentUser?.user_metadata?.full_name || currentUser?.email,
        action: 'UPDATE',
        tableName: 'weekly_schedules',
        recordId: null, // UUID sorunu için null yapıyoruz
        oldValues: editingCurrentShift,
        newValues: {
          ...editingCurrentShift,
          shift_type: currentShiftEditForm.shift_type,
          shift_hours: currentShiftEditForm.shift_hours
        },
        ipAddress: null,
        userAgent: navigator.userAgent,
        details: `Güncel vardiya güncellendi: ${editingCurrentShift.employee_code} - ${currentShiftEditForm.shift_type} (ID: ${editingCurrentShift.id})`
      });
      
      console.log('🔍 Audit log sonucu:', auditResult);
      
      console.log('✅ Vardiya başarıyla güncellendi');
      
      // Verileri yenile
      loadCurrentShiftData();
      
      // Modal'ı kapat
      setShowCurrentShiftEditModal(false);
      setEditingCurrentShift(null);
      setCurrentShiftEditForm({ shift_type: '', shift_hours: '' });
      
    } catch (error) {
      console.error('❌ Vardiya güncelleme hatası:', error);
    } finally {
      setCurrentShiftEditLoading(false);
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
                <h1 className="ml-3 text-xl font-bold text-gray-900">Personel Kontrol Sistemi</h1>
              </div>
              
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-4 overflow-x-auto">
              <button
                onClick={() => setActiveTab('current-shift')}
                className={`py-2 px-2 border-b-2 font-medium text-xs whitespace-nowrap ${
                  activeTab === 'current-shift'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="w-4 h-4 inline mr-1" />
                Güncel Vardiya
              </button>

              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-2 border-b-2 font-medium text-xs whitespace-nowrap ${
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
                className={`py-2 px-2 border-b-2 font-medium text-xs whitespace-nowrap ${
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
                className={`py-2 px-2 border-b-2 font-medium text-xs whitespace-nowrap ${
                  activeTab === 'monthly'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-1" />
                Aylık Detay
              </button>

              <button
                onClick={() => setActiveTab('upload')}
                className={`py-2 px-2 border-b-2 font-medium text-xs whitespace-nowrap ${
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
                          <p className="text-xl font-bold text-blue-900">
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
                          <p className="text-xl font-bold text-green-900">
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
                          <p className="text-xl font-bold text-orange-900">
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
                          <p className="text-xl font-bold text-purple-900">
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
                          <p className="text-xl font-bold text-red-900">
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
                          <p className="text-xl font-bold text-yellow-900">
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

          {activeTab === 'current-shift' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="mb-6">
                  <h4 className="text-xl font-bold text-gray-900">Güncel Vardiya</h4>
                </div>

                {currentShiftLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                      <div className="text-lg font-semibold text-gray-700 mb-2">Güncel Vardiya Verileri Yükleniyor</div>
                      <div className="text-sm text-gray-500">Lütfen bekleyin...</div>
                    </div>
                  </div>
                ) : currentShiftData.length === 0 ? (
                  <div className="text-center py-16">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Güncel Vardiya Verisi Bulunamadı</h3>
                    <p className="text-gray-500 mb-6">Henüz yüklenmiş bir vardiya programı bulunmuyor.</p>
                    <button
                      onClick={loadCurrentShiftData}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 mr-2 inline" />
                      Tekrar Dene
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Dönem Bilgisi */}
                    {currentPeriod && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-base font-semibold text-blue-900 mb-1">📅 Güncel Dönem</h5>
                            <p className="text-blue-700">{currentPeriod.week_label}</p>
                            <p className="text-sm text-blue-600">
                              {new Date(currentPeriod.start_date).toLocaleDateString('tr-TR')} - {new Date(currentPeriod.end_date).toLocaleDateString('tr-TR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-blue-900">{currentShiftData.length}</div>
                            <div className="text-sm text-blue-600">Personel</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Personel Listesi */}
                    <div className="space-y-4">
                      {(() => {
                        // Önce göreve göre, sonra sicil numarasına göre sırala
                        const sortedData = [...currentShiftData].sort((a, b) => {
                          // Önce göreve göre sırala (Sevkiyat Elemanı önce, Şoför sonra)
                          const aRole = a.position || '';
                          const bRole = b.position || '';
                          
                          const aIsSevkiyat = aRole.toUpperCase().includes('SEVKİYAT');
                          const bIsSevkiyat = bRole.toUpperCase().includes('SEVKİYAT');
                          const aIsSofor = aRole.toUpperCase().includes('ŞOFÖR');
                          const bIsSofor = bRole.toUpperCase().includes('ŞOFÖR');
                          
                          // Sevkiyat Elemanı önce, Şoför sonra
                          if (aIsSevkiyat && !bIsSevkiyat) return -1;
                          if (!aIsSevkiyat && bIsSevkiyat) return 1;
                          if (aIsSofor && !bIsSofor) return -1;
                          if (!aIsSofor && bIsSofor) return 1;
                          
                          // Aynı görevdeyse sicil numarasına göre sırala
                          const aCode = parseInt(a.employee_code) || 0;
                          const bCode = parseInt(b.employee_code) || 0;
                          return aCode - bCode;
                        });

                        // Tüm personelleri tek listede göster, sicil numarasına göre sıralı
                        return (
                                                      <div className="bg-white rounded-xl p-4 border border-gray-200">
                            <h5 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                              <Users className="w-5 h-5 mr-2" />
                              Tüm Personel ({sortedData.length})
                            </h5>
                            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-xs font-semibold">Sicil No</th>
                                      <th className="px-4 py-3 text-left text-xs font-semibold">Ad Soyad</th>
                                      <th className="px-4 py-3 text-left text-xs font-semibold">Görev</th>
                                      <th className="px-4 py-3 text-left text-xs font-semibold">Vardiya</th>
                                      <th className="px-4 py-3 text-left text-xs font-semibold">Saat</th>
                                      <th className="px-4 py-3 text-center text-xs font-semibold">İşlem</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {sortedData.map((person, index) => {
                                      // Göreve göre renk belirle
                                      const isSevkiyat = person.position && person.position.toUpperCase().includes('SEVKİYAT');
                                      const isSofor = person.position && person.position.toUpperCase().includes('ŞOFÖR');
                                      
                                      const rowColor = isSevkiyat ? 'bg-blue-50 hover:bg-blue-100' : 
                                                      isSofor ? 'bg-green-50 hover:bg-green-100' : 
                                                      'bg-gray-50 hover:bg-gray-100';
                                      
                                      const badgeColor = isSevkiyat ? 'bg-blue-100 text-blue-800' : 
                                                       isSofor ? 'bg-green-100 text-green-800' : 
                                                       'bg-gray-100 text-gray-800';
                                      
                                      const buttonColor = isSevkiyat ? 'bg-blue-600 hover:bg-blue-700' : 
                                                         isSofor ? 'bg-green-600 hover:bg-green-700' : 
                                                         'bg-gray-600 hover:bg-gray-700';
                                      
                                      return (
                                        <tr key={person.employee_code} className={`${rowColor} transition-colors duration-200`}>
                                          <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex items-center">
                                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                                isSevkiyat ? 'bg-blue-600' :
                                                isSofor ? 'bg-green-600' :
                                                'bg-gray-600'
                                              }`}>
                                                {person.employee_code}
                                              </div>
                                            </div>
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="text-xs font-semibold text-gray-900">{person.full_name}</div>
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>
                                              {person.position}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap">
                                            {person.shift_type ? (
                                              <div className="flex items-center">
                                                {(() => {
                                                  switch (person.shift_type) {
                                                    case 'gece':
                                                      return (
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
                                                          <Moon className="w-3 h-3 mr-1" />
                                                          Gece
                                                        </span>
                                                      );
                                                    case 'gunduz':
                                                      return (
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                                                          <Sun className="w-3 h-3 mr-1" />
                                                          Gündüz
                                                        </span>
                                                      );
                                                    case 'aksam':
                                                      return (
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-300">
                                                          🌆 Akşam
                                                        </span>
                                                      );
                                                    case 'gecici':
                                                      return (
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-300">
                                                          🔄 Geçici
                                                        </span>
                                                      );
                                                    case 'izin':
                                                      return (
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300">
                                                          🛌 İzinli
                                                        </span>
                                                      );
                                                    case 'yillik_izin':
                                                      return (
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                                                          🏖️ Yıllık İzin
                                                        </span>
                                                      );
                                                    case 'raporlu':
                                                      return (
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300">
                                                          🏥 Raporlu
                                                        </span>
                                                      );
                                                    default:
                                                      return (
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                                                          ❓ Belirsiz
                                                        </span>
                                                      );
                                                  }
                                                })()}
                                              </div>
                                            ) : (
                                              <span className="text-sm text-gray-500">-</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap">
                                            {person.shift_type === 'yillik_izin' ? (
                                              <span className="text-sm px-3 py-1 rounded-lg border font-medium shadow-sm bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-900 border-yellow-400">
                                                Yıllık izinli
                                              </span>
                                            ) : person.shift_type === 'raporlu' ? (
                                              <span className="text-sm px-3 py-1 rounded-lg border font-medium shadow-sm bg-gradient-to-r from-red-100 to-red-200 text-red-900 border-red-400">
                                                Raporlu
                                              </span>
                                            ) : person.shift_type === 'izin' ? (
                                              <span className="text-sm px-3 py-1 rounded-lg border font-medium shadow-sm bg-gradient-to-r from-red-100 to-red-200 text-red-900 border-red-400">
                                                İzinli
                                              </span>
                                            ) : person.shift_hours ? (
                                              <span className={`text-sm px-3 py-1 rounded-lg border font-medium shadow-sm ${
                                                person.shift_type === 'gece'
                                                  ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-900 border-purple-400' :
                                                person.shift_type === 'gunduz'
                                                  ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-900 border-yellow-400' :
                                                person.shift_type === 'aksam'
                                                  ? 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-900 border-orange-400' :
                                                person.shift_type === 'gecici'
                                                  ? 'bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-900 border-indigo-400' :
                                                  'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 border-gray-400'
                                              }`}>
                                                {person.shift_hours}
                                              </span>
                                            ) : (
                                              <span className="text-sm text-gray-500">-</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-center">
                                            <button
                                              onClick={() => handleEditCurrentShift(person)}
                                              className={`px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200 flex items-center space-x-1 text-white shadow-sm hover:shadow-md transform hover:scale-105 ${buttonColor}`}
                                            >
                                              <Edit3 className="w-3 h-3" />
                                              <span>Düzenle</span>
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                            {/* Loading More Indicator */}
                            {loadingMore && (
                              <div className="flex items-center justify-center py-8">
                                <div className="text-center">
                                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mx-auto mb-2"></div>
                                  <div className="text-sm text-gray-600">Daha fazla veri yükleniyor...</div>
                                </div>
                              </div>
                            )}

                            {/* No More Data Indicator */}
                            {!hasMore && currentShiftData.length > 0 && (
                              <div className="text-center py-4 text-gray-500 text-sm">
                                Tüm veriler yüklendi
                              </div>
                            )}
                        
                    </div>
                  </div>
                )}
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
                  
                  <div className="grid grid-cols-1 gap-6">
                    {/* Modern Excel Yükleme */}
                    <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 cursor-pointer group">
                      <div className="relative">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                          <Upload className="w-8 h-8 text-white" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      
                      <h4 className="text-xl font-bold text-gray-900 mb-3">Vardiya Programı Yükle</h4>
                      <p className="text-gray-600 mb-6 leading-relaxed">
                        Excel dosyasından çoklu hafta vardiya programını yükleyin.<br/>
                        <span className="text-sm text-gray-500">Desteklenen formatlar: .xlsx, .xls</span>
                      </p>
                      
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleExcelUpload}
                        className="hidden"
                        id="excel-upload"
                      />
                      <label
                        htmlFor="excel-upload"
                        className={`inline-flex items-center px-8 py-4 font-semibold rounded-xl shadow-xl transition-all duration-300 cursor-pointer border-0 text-lg ${
                          uploadLoading 
                            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white transform scale-105' 
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105'
                        }`}
                      >
                        {uploadLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                            Yükleniyor...
                          </>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 mr-3" />
                            Excel Dosyası Seç
                          </>
                        )}
                      </label>
                      
                      <p className="text-sm text-gray-500 mt-4">
                        Veya dosyayı buraya sürükleyip bırakın
                      </p>
                    </div>
                  </div>
                  

                  
                  {uploadMessage && (
                    <div className={`mt-4 p-4 rounded-lg ${
                      uploadMessage.type === 'success' 
                        ? 'bg-green-50 border border-green-200 text-green-800' 
                        : uploadMessage.type === 'warning'
                        ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                        : 'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span>{uploadMessage.text}</span>
                        {uploadMessage.isDuplicate && uploadMessage.existingData && (
                          <button
                            onClick={() => handleDeleteExistingData(uploadMessage.existingData.id)}
                            disabled={uploadLoading}
                            className="ml-4 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {uploadLoading ? 'Siliniyor...' : 'Mevcut Veriyi Sil'}
                          </button>
                        )}
                      </div>
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
                        <div className="text-xl font-bold text-blue-600 mb-2">
                          {personnelDetails.filter(d => d.shift_type === 'gece').length}
                        </div>
                        <div className="text-sm text-gray-700 font-medium">🌙 Gece Haftası</div>
                      </div>
                      <div className="text-center bg-white p-4 rounded-lg shadow-sm border border-green-200">
                        <div className="text-xl font-bold text-green-600 mb-2">
                          {personnelDetails.filter(d => d.shift_type === 'gunduz').length}
                        </div>
                        <div className="text-sm text-gray-700 font-medium">☀️ Gündüz Haftası</div>
                      </div>
                      <div className="text-center bg-white p-4 rounded-lg shadow-sm border border-orange-200">
                        <div className="text-xl font-bold text-orange-600 mb-2">
                          {personnelDetails.filter(d => d.shift_type === 'aksam').length}
                        </div>
                        <div className="text-sm text-gray-700 font-medium">🌅 Akşam Haftası</div>
                      </div>
                      <div className="text-center bg-white p-4 rounded-lg shadow-sm border border-purple-200">
                        <div className="text-xl font-bold text-purple-600 mb-2">
                          {personnelDetails.filter(d => d.shift_type === 'gecici_gorev').length}
                        </div>
                        <div className="text-sm text-gray-700 font-medium">🔄 Geçici Görev Haftası</div>
                      </div>
                      <div className="text-center bg-white p-4 rounded-lg shadow-sm border border-red-200">
                        <div className="text-xl font-bold text-red-600 mb-2">
                          {personnelDetails.filter(d => d.shift_type === 'raporlu').length}
                        </div>
                        <div className="text-sm text-gray-700 font-medium">🏥 Raporlu Haftası</div>
                      </div>
                      <div className="text-center bg-white p-4 rounded-lg shadow-sm border border-yellow-200">
                        <div className="text-xl font-bold text-yellow-600 mb-2">
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
                        onClick={() => handleDeletePeriod(selectedPeriodForEdit.id)}
                        disabled={globalEditLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        {globalEditLoading ? (
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

      {/* Güncel Vardiya Düzenleme Modal */}
      {showCurrentShiftEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 rounded-t-xl">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Edit className="w-5 h-5 mr-2" />
                Güncel Vardiya Düzenle
              </h3>
            </div>
            
            <div className="p-6">
              {editingCurrentShift && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">Düzenlenecek Personel:</div>
                  <div className="font-semibold text-gray-900">{editingCurrentShift.full_name}</div>
                  <div className="text-sm text-gray-600">Sicil No: {editingCurrentShift.employee_code}</div>
                  <div className="text-sm text-gray-600">Görev: {editingCurrentShift.position}</div>
                </div>
              )}
              
              <form onSubmit={handleUpdateCurrentShift}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vardiya Türü
                    </label>
                    <select
                      value={currentShiftEditForm.shift_type}
                      onChange={(e) => {
                        const newShiftType = e.target.value;
                        let newShiftHours = currentShiftEditForm.shift_hours;
                        
                        // Vardiya türüne göre otomatik saat güncelleme
                        if (newShiftType === 'gece') {
                          newShiftHours = '22:00 - 06:00';
                        } else if (newShiftType === 'gunduz') {
                          newShiftHours = '08:00 - 16:00';
                        } else if (newShiftType === 'aksam') {
                          newShiftHours = '16:00 - 00:00';
                        } else if (newShiftType === 'yillik_izin') {
                          newShiftHours = 'Yıllık izinli';
                        } else if (newShiftType === 'raporlu') {
                          newShiftHours = 'Raporlu';
                        } else if (newShiftType === 'gecici') {
                          newShiftHours = 'Geçici görev';
                        }
                        
                        setCurrentShiftEditForm({
                          ...currentShiftEditForm, 
                          shift_type: newShiftType,
                          shift_hours: newShiftHours
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="" disabled>Vardiya seçin</option>
                      <option value="gece">🌙 Gece Vardiyası</option>
                      <option value="gunduz">☀️ Gündüz Vardiyası</option>
                      <option value="aksam">🌆 Akşam Vardiyası</option>
                      <option value="yillik_izin">🏖️ Yıllık İzin</option>
                      <option value="raporlu">🏥 Raporlu</option>
                      <option value="gecici">🔄 Geçici Görev</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vardiya Saatleri
                    </label>
                    <input
                      type="text"
                      value={currentShiftEditForm.shift_hours}
                      onChange={(e) => setCurrentShiftEditForm({
                        ...currentShiftEditForm,
                        shift_hours: e.target.value
                      })}
                      readOnly={true}
                      placeholder="Vardiya saatleri sabit"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed"
                      disabled
                    />
                                          <p className="text-xs text-gray-500 mt-1">
                        Vardiya türü ve saatleri sabit olarak ayarlanmıştır
                      </p>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCurrentShiftEditModal(false);
                      setEditingCurrentShift(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={currentShiftEditLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {currentShiftEditLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline"></div>
                        Güncelleniyor...
                      </>
                    ) : (
                      'Güncelle'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Vardiya Düzenleme Modal */}
      {showShiftEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 rounded-t-xl">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Edit className="w-5 h-5 mr-2" />
                Vardiya Düzenle
              </h3>
            </div>
            
            <div className="p-6">
              {editingShift && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">Düzenlenecek Personel:</div>
                  <div className="font-semibold text-gray-900">{editingShift.full_name}</div>
                  <div className="text-sm text-gray-600">Sicil No: {editingShift.employee_code}</div>
                </div>
              )}
              
              <form onSubmit={handleUpdateShift}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vardiya Türü
                    </label>
                    <select
                      value={shiftEditForm.shift_type}
                      onChange={(e) => {
                        const newShiftType = e.target.value;
                        let newShiftDetails = shiftEditForm.shift_details;
                        
                        // Vardiya türüne göre otomatik detay güncelleme
                        if (newShiftType === 'gece') {
                          newShiftDetails = '22:00 - 06:00';
                        } else if (newShiftType === 'gunduz') {
                          newShiftDetails = '08:00 - 16:00';
                        } else if (newShiftType === 'yillik_izin') {
                          newShiftDetails = 'Yıllık izinli';
                        } else if (newShiftType === 'raporlu') {
                          newShiftDetails = 'Raporlu';
                        }
                        
                        setShiftEditForm({
                          ...shiftEditForm, 
                          shift_type: newShiftType,
                          shift_details: newShiftDetails
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="" disabled>Vardiya seçin</option>
                      <option value="gece">🌙 Gece Vardiyası</option>
                      <option value="gunduz">☀️ Gündüz Vardiyası</option>
                      <option value="yillik_izin">🏖️ Yıllık İzin</option>
                      <option value="raporlu">🏥 Raporlu</option>

                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vardiya Detayları (Otomatik)
                    </label>
                    <input
                      type="text"
                      value={shiftEditForm.shift_details}
                      readOnly
                      placeholder="Vardiya türü seçildiğinde otomatik güncellenir"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowShiftEditModal(false);
                      setEditingShift(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={shiftEditLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {shiftEditLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline"></div>
                        Güncelleniyor...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2 inline" />
                        Güncelle
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      </>
    );
};

export default PersonelVardiyaKontrol; 