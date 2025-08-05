import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Card,
  Row,
  Col,
  Typography,
  message,
  TimePicker,
  Space,
  Divider,
  Alert
} from 'antd';
import {
  SaveOutlined,
  LeftOutlined,
  RightOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { getTeamPersonnel, getPersonnelFromPersonnelTable, getTimesheetData, saveTimesheetData, updateTimesheetData, getTeamShiftsByDate, getAnadoluPersonnelShifts, getTeamPersonnelShifts } from '../../services/supabase';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/tr';

dayjs.extend(customParseFormat);
dayjs.locale('tr');

const { Title, Text } = Typography;

const TimesheetTracking = () => {
  const [teamPersonnel, setTeamPersonnel] = useState([]);
  const [anadoluPersonnel, setAnadoluPersonnel] = useState([]);
  const [timesheetData, setTimesheetData] = useState({});
  const [anadoluTimesheetData, setAnadoluTimesheetData] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const initialDate = dayjs();
    return initialDate.isValid() ? initialDate : dayjs();
  });
  const [teamShifts, setTeamShifts] = useState({});
  const [anadoluShifts, setAnadoluShifts] = useState({});
  const [teamPersonnelShifts, setTeamPersonnelShifts] = useState({});
  const [approvedPersonnel, setApprovedPersonnel] = useState(new Set());
  const [showOvertimeInputs, setShowOvertimeInputs] = useState(new Set());
  const [showOvertimeForPerson, setShowOvertimeForPerson] = useState(new Set());
  const [bulkApprovalActive, setBulkApprovalActive] = useState(false);
  const [isDataSaved, setIsDataSaved] = useState(false);
  const [missingDaysWarning, setMissingDaysWarning] = useState([]);

  const ekipOptions = ['1.Ekip', '2.Ekip', '3.Ekip', '4.Ekip'];

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  useEffect(() => {
    checkMissingDays();
  }, []); // Sadece component mount olduğunda çalışsın

  // Geçmiş günlerin kaydedilip kaydedilmediğini kontrol eden fonksiyon
  const checkMissingDays = async () => {
    try {
      const today = dayjs();
      const missingDays = [];
      const currentMonth = today.month(); // Mevcut ay (0-11)
      const currentYear = today.year();

      // Sadece bugünden önceki günleri kontrol et (hafta sonları hariç)
      for (let i = 1; i <= 14; i++) {
        const checkDate = today.subtract(i, 'day');
        
        // Bugünden sonraki günleri kontrol etme
        if (checkDate.isAfter(today)) {
          continue;
        }

        // Hafta sonlarını da kontrol et ama farklı işaretle
        const dayOfWeek = checkDate.day();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 = Pazar, 6 = Cumartesi

        // Bu tarih için veri var mı kontrol et
        const timesheetResult = await getTimesheetData(checkDate.format('YYYY-MM-DD'));
        
        if (!timesheetResult.success || timesheetResult.data.length === 0) {
          // Sadece mevcut ay ve yıl için eksik günleri göster
          // Eğer bu ay için hiç eksik gün yoksa, eski aylardan veri gösterme
          if (checkDate.month() === currentMonth && checkDate.year() === currentYear) {
            missingDays.push({
              date: checkDate.format('DD.MM.YYYY'),
              dayName: checkDate.format('dddd'),
              daysAgo: i,
              dateObj: checkDate,
              isWeekend: isWeekend
            });
          }
        }
      }

      // En yakın eksik günleri önce göster
      missingDays.sort((a, b) => a.daysAgo - b.daysAgo);
      setMissingDaysWarning(missingDays);
    } catch (error) {
      console.error('Geçmiş gün kontrolü hatası:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    // Tarih değiştiğinde bulk approval durumunu sıfırla
    setBulkApprovalActive(false);
    // Tarih değiştiğinde kaydetme durumunu sıfırla
    setIsDataSaved(false);
    try {
      const [teamResult, anadoluResult, timesheetResult, shiftsResult, anadoluShiftsResult, teamPersonnelShiftsResult] = await Promise.all([
        getTeamPersonnel(),
        getPersonnelFromPersonnelTable(),
        getTimesheetData(selectedDate && selectedDate.format ? selectedDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')),
        getTeamShiftsByDate(selectedDate && selectedDate.format ? selectedDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')),
        getAnadoluPersonnelShifts(selectedDate && selectedDate.format ? selectedDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')),
        getTeamPersonnelShifts(selectedDate && selectedDate.format ? selectedDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'))
      ]);
      
      // Ekip personellerini yükle
      if (teamResult.success) {
        setTeamPersonnel(teamResult.data);
      } else {
        console.error('Team personel yüklenemedi:', teamResult.error);
      }
      
      // Anadolu personellerini yükle
      if (anadoluResult.success) {
        setAnadoluPersonnel(anadoluResult.data);
      } else {
        console.error('Anadolu personel yüklenemedi:', anadoluResult.error);
      }

      // Vardiya verilerini yükle ve işle
      let shiftsMap = {};
      if (shiftsResult.success && shiftsResult.data && shiftsResult.data.length > 0) {
        const shiftData = shiftsResult.data[0];
        
        // team_shifts tablosunun yapısına göre ekipleri map et
        if (shiftData.night_shift) {
          shiftsMap[shiftData.night_shift] = {
            shift_24_08: true,
            shift_08_16: false,
            shift_16_24: false,
            leave_shift: false
          };
        }
        
        if (shiftData.morning_shift) {
          shiftsMap[shiftData.morning_shift] = {
            shift_24_08: false,
            shift_08_16: true,
            shift_16_24: false,
            leave_shift: false
          };
        }
        
        if (shiftData.evening_shift) {
          shiftsMap[shiftData.evening_shift] = {
            shift_24_08: false,
            shift_08_16: false,
            shift_16_24: true,
            leave_shift: false
          };
        }
        
        if (shiftData.leave_shift) {
          shiftsMap[shiftData.leave_shift] = {
            shift_24_08: false,
            shift_08_16: false,
            shift_16_24: false,
            leave_shift: true
          };
        }
      }
      setTeamShifts(shiftsMap);

      // Anadolu vardiya verilerini işle
      let anadoluShiftsMap = {};
      if (anadoluShiftsResult.success && anadoluShiftsResult.data.length > 0) {
        anadoluShiftsResult.data.forEach(shift => {
          const person = anadoluResult.data.find(p => p.employee_code === shift.employee_code);
          if (person) {
            anadoluShiftsMap[person.id] = shift.shift_type;
          }
        });
      }
      setAnadoluShifts(anadoluShiftsMap);

      // Ekip personelleri için özel durumları işle
      let teamPersonnelShiftsMap = {};
      if (teamPersonnelShiftsResult.success && Object.keys(teamPersonnelShiftsResult.data).length > 0) {
        teamPersonnelShiftsMap = teamPersonnelShiftsResult.data;
      }
      setTeamPersonnelShifts(teamPersonnelShiftsMap);

      // Veritabanından timesheet verilerini yükle
      const timesheetMap = {};
      const anadoluTimesheetMap = {};
      
      if (timesheetResult.success && timesheetResult.data.length > 0) {
        timesheetResult.data.forEach(record => {
          if (record.personnel_type === 'team') {
            // Ekip personeli - özel durumlar için string kontrolü
            if (record.giris === 'R' || record.giris === 'Y.İ' || record.giris === 'Ü.İ' || record.giris === 'H.B') {
              // Özel durumlar için string olarak sakla
              timesheetMap[record.personnel_id] = {
                giris: record.giris,
                cikis: record.cikis
              };
            } else {
              // Normal saat verileri için dayjs objesi
              timesheetMap[record.personnel_id] = {
                giris: record.giris ? dayjs(record.giris) : null,
                cikis: record.cikis ? dayjs(record.cikis) : null
              };
            }
            // Eğer onaylanmışsa approved listesine ekle
            if (record.approved) {
              setApprovedPersonnel(prev => new Set([...prev, record.personnel_id]));
            }
          } else if (record.personnel_type === 'anadolu') {
            // Anadolu personeli - özel durumlar için string kontrolü
            if (record.giris === 'R' || record.giris === 'Y.İ' || record.giris === 'Ü.İ' || record.giris === 'H.B') {
              // Özel durumlar için string olarak sakla
              anadoluTimesheetMap[record.personnel_id] = {
                giris: record.giris,
                cikis: record.cikis
              };
            } else {
              // Normal saat verileri için dayjs objesi
              anadoluTimesheetMap[record.personnel_id] = {
                giris: record.giris ? dayjs(record.giris) : null,
                cikis: record.cikis ? dayjs(record.cikis) : null
              };
            }
            // Eğer onaylanmışsa approved listesine ekle
            if (record.approved) {
              setApprovedPersonnel(prev => new Set([...prev, record.personnel_id]));
            }
          }
        });
      }

      // Ekip personelleri için otomatik saat doldurma
      const teamAutoFillData = {};
      if (teamResult.success) {
        teamResult.data.forEach(person => {
          const teamName = person.ekip_bilgisi;
          const teamShiftData = shiftsMap[teamName];
          const personnelShiftType = teamPersonnelShiftsMap[person.id];
          
          let giris = null, cikis = null;
          
          // Önce personel bazlı özel durumları kontrol et
          if (personnelShiftType) {
            switch (personnelShiftType) {
              case 'raporlu':
                giris = 'R';
                cikis = 'R';
                break;
              case 'yillik_izin':
                giris = 'Y.İ';
                cikis = 'Y.İ';
                break;
              case 'ucretsiz_izin':
                giris = 'Ü.İ';
                cikis = 'Ü.İ';
                break;
              case 'habersiz':
                giris = 'H.B';
                cikis = 'H.B';
                break;
              default:
                // Normal vardiya saatleri için devam et
                break;
            }
          }
          
          // Eğer özel durum yoksa normal vardiya saatlerini kullan
          if (!giris && !cikis && teamShiftData) {
            if (teamShiftData.shift_24_08) {
              giris = dayjs('00:00', 'HH:mm');
              cikis = dayjs('08:00', 'HH:mm');
            } else if (teamShiftData.shift_08_16) {
              giris = dayjs('08:00', 'HH:mm');
              cikis = dayjs('16:00', 'HH:mm');
            } else if (teamShiftData.shift_16_24) {
              giris = dayjs('16:00', 'HH:mm');
              cikis = dayjs('00:00', 'HH:mm'); // 16-24 vardiyası için 00:00 (ertesi gün)
            } else if (teamShiftData.leave_shift) {
              // İzinli vardiya için boş bırak
              giris = null;
              cikis = null;
            }
          } else if (!giris && !cikis) {
            // Vardiya verisi yoksa varsayılan saatler
            giris = dayjs('08:00', 'HH:mm');
            cikis = dayjs('17:00', 'HH:mm');
          }
          
          // Veritabanından gelen veri varsa onu kullan, yoksa otomatik doldurulan veriyi kullan
          const existingData = timesheetMap[person.id];
          if (existingData) {
            teamAutoFillData[person.id] = existingData;
          } else {
            teamAutoFillData[person.id] = { giris, cikis };
          }
        });
      }
      
      setTimesheetData(teamAutoFillData);

      // Anadolu personelleri için otomatik saat doldurma
      const anadoluAutoFillData = {};
      if (anadoluResult.success) {
        anadoluResult.data.forEach(person => {
          const shiftType = anadoluShiftsMap[person.id];
          
          let giris = null, cikis = null;
          
          // Vardiya tipine göre saatleri belirle
          if (shiftType) {
            switch (shiftType) {
              case 'gece':
                giris = dayjs('22:00', 'HH:mm');
                cikis = dayjs('06:00', 'HH:mm');
                break;
              case 'gunduz':
                giris = dayjs('08:00', 'HH:mm');
                cikis = dayjs('16:00', 'HH:mm');
                break;
              case 'raporlu':
                giris = 'R';
                cikis = 'R';
                break;
              case 'yillik_izin':
                giris = 'Y.İ';
                cikis = 'Y.İ';
                break;
              default:
                // Varsayılan saatler
                giris = dayjs('08:00', 'HH:mm');
                cikis = dayjs('17:00', 'HH:mm');
            }
          } else {
            // Vardiya verisi yoksa varsayılan saatler
            giris = dayjs('08:00', 'HH:mm');
            cikis = dayjs('17:00', 'HH:mm');
          }
          
          // Veritabanından gelen veri varsa onu kullan, yoksa otomatik doldurulan veriyi kullan
          const existingData = anadoluTimesheetMap[person.id];
          if (existingData) {
            anadoluAutoFillData[person.id] = existingData;
          } else {
            anadoluAutoFillData[person.id] = { giris, cikis };
          }
        });
      }
      
      setAnadoluTimesheetData(anadoluAutoFillData);
      
      // Team personeli için otomatik onay ekle
      const teamApprovedSet = new Set();
      Object.keys(teamAutoFillData).forEach(personId => {
        teamApprovedSet.add(personId);
      });
      
      // Mevcut onaylı personeli koru ve team personeli ekle
      const newApprovedSet = new Set([...Array.from(approvedPersonnel), ...teamApprovedSet]);
      setApprovedPersonnel(newApprovedSet);
      
      // Kaydedilen veri kontrolü - eğer veritabanından veri geldiyse bu tarih kaydedilmiş demektir
      const hasSavedData = timesheetResult.success && timesheetResult.data.length > 0;
      setIsDataSaved(hasSavedData);
      
    } catch (error) {
      console.error('loadData error:', error);
    }
    setLoading(false);
  };

  // Ekip bazında gruplandırılmış personel (izinli ekipler dahil)
  const groupedPersonnel = ekipOptions.reduce((acc, ekip) => {
    const teamMembers = teamPersonnel.filter(p => p.ekip_bilgisi === ekip);
    acc[ekip] = teamMembers.sort((a, b) => {
      // Önce konum önceliğine göre sırala
      const konumPriority = {
        'Vardiya Amiri': 1,
        'Ekip Lideri': 2,
        'Sistem Operatörü': 3,
        'Sistem Operatör Yrd.': 4,
        'Sevkiyat Sorumlusu': 5,
        'Sevkiyat Veri Giriş Elemanı': 6,
        'Makine Operatörü': 7,
        'Sevkiyat Elemanı': 8,
        'Sevkiyat Elemanı ( Load Audit)': 9
      };
      
      const priorityA = konumPriority[a.konum] || 999;
      const priorityB = konumPriority[b.konum] || 999;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Aynı konumda ise sicil_no'ya göre sırala
      return parseInt(a.sicil_no) - parseInt(b.sicil_no);
    });
    return acc;
  }, {});

  const getTeamColor = (team) => {
    switch (team) {
      case '1.Ekip': return '#52c41a';
      case '2.Ekip': return '#1890ff';
      case '3.Ekip': return '#8c8c8c';
      case '4.Ekip': return '#fa8c16';
      default: return '#8c8c8c';
    }
  };

  const handleTimeInput = (personId, field, value) => {
    // Boş değer kontrolü
    if (!value || value.trim() === '') {
      setTimesheetData(prev => ({
        ...prev,
        [personId]: {
          ...prev[personId],
          [field]: ''
        }
      }));
      return;
    }

    // 2 haneli sayı girildiğinde (örn: 22) otomatik : ekle (22:)
    if (value.length === 2 && /^\d{2}$/.test(value)) {
      const hours = parseInt(value);
      if (hours >= 0 && hours <= 23) {
        setTimesheetData(prev => ({
          ...prev,
          [personId]: {
            ...prev[personId],
            [field]: `${value}:`
          }
        }));
        return;
      }
    }
    
    // 4 haneli sayı girildiğinde (örn: 2200) otomatik formatla (22:00)
    if (value.length === 4 && /^\d{4}$/.test(value)) {
      const hours = value.substring(0, 2);
      const minutes = value.substring(2, 4);
      
      // Saat ve dakika kontrolü
      if (parseInt(hours) >= 0 && parseInt(hours) <= 23 && 
          parseInt(minutes) >= 0 && parseInt(minutes) <= 59) {
        setTimesheetData(prev => ({
          ...prev,
          [personId]: {
            ...prev[personId],
            [field]: `${hours}:${minutes}`
          }
        }));
        return;
      }
    }

    // Her durumda string olarak sakla
    setTimesheetData(prev => ({
      ...prev,
      [personId]: {
        ...prev[personId],
        [field]: value
      }
    }));
  };

  const handleAnadoluTimeInput = (personId, field, value) => {
    // Boş değer kontrolü
    if (!value || value.trim() === '') {
      setAnadoluTimesheetData(prev => ({
        ...prev,
        [personId]: {
          ...prev[personId],
          [field]: ''
        }
      }));
      return;
    }

    // 2 haneli sayı girildiğinde (örn: 22) otomatik : ekle (22:)
    if (value.length === 2 && /^\d{2}$/.test(value)) {
      const hours = parseInt(value);
      if (hours >= 0 && hours <= 23) {
        setAnadoluTimesheetData(prev => ({
          ...prev,
          [personId]: {
            ...prev[personId],
            [field]: `${value}:`
          }
        }));
        return;
      }
    }
    
    // 4 haneli sayı girildiğinde (örn: 2200) otomatik formatla (22:00)
    if (value.length === 4 && /^\d{4}$/.test(value)) {
      const hours = value.substring(0, 2);
      const minutes = value.substring(2, 4);
      
      // Saat ve dakika kontrolü
      if (parseInt(hours) >= 0 && parseInt(hours) <= 23 && 
          parseInt(minutes) >= 0 && parseInt(minutes) <= 59) {
        setAnadoluTimesheetData(prev => ({
          ...prev,
          [personId]: {
            ...prev[personId],
            [field]: `${hours}:${minutes}`
          }
        }));
        return;
      }
    }

    // Her durumda string olarak sakla
    setAnadoluTimesheetData(prev => ({
      ...prev,
      [personId]: {
        ...prev[personId],
        [field]: value
      }
    }));
  };

  const handleTimeChange = (personId, field, time) => {
    setTimesheetData(prev => ({
      ...prev,
      [personId]: {
        ...prev[personId],
        [field]: time
      }
    }));
  };

  const handleAnadoluTimeChange = (personId, field, time) => {
    setAnadoluTimesheetData(prev => ({
      ...prev,
      [personId]: {
        ...prev[personId],
        [field]: time
      }
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const date = selectedDate && selectedDate.format ? selectedDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
      const savePromises = [];

      // Tüm personelleri (ekip + anadolu) birleştir
      const allPersonnel = [...teamPersonnel, ...anadoluPersonnel];

      // Onaylanmamış personelleri bul
      const unapprovedPersonnel = allPersonnel.filter(person => !approvedPersonnel.has(person.id));
      if (unapprovedPersonnel.length > 0) {
        const unapprovedNames = unapprovedPersonnel.map(p => p.adi_soyadi || p.full_name).join(', ');
        message.error(`Kaydetmek için tüm personellerin onaylanması gerekiyor. Onaylanmamış personeller: ${unapprovedNames}`);
        setLoading(false);
        return;
      }

      // Her personel için vardiya ve saat bilgisiyle kayıt oluştur
      allPersonnel.forEach(person => {
        const isApproved = approvedPersonnel.has(person.id);
        // Saat verisi ekipte mi anadoluda mı diye bakmadan al
        const data = timesheetData[person.id] || anadoluTimesheetData[person.id];
        // Vardiya tipi ekip mi anadolu mu diye bakmadan al
        const shiftType = teamPersonnelShifts[person.id] || anadoluShifts[person.id] || '';
        let shiftInfo = '';
        switch (shiftType) {
          case 'raporlu':
            shiftInfo = 'R';
            break;
          case 'yillik_izin':
            shiftInfo = 'Y.İ';
            break;
          case 'ucretsiz_izin':
            shiftInfo = 'Ü.İ';
            break;
          case 'habersiz':
            shiftInfo = 'H.B';
            break;
          case 'gece':
            shiftInfo = '22:00-06:00';
            break;
          case 'gunduz':
            shiftInfo = '08:00-16:00';
            break;
          default:
            shiftInfo = shiftType;
        }
        // Eğer ekipten geliyorsa ekip_bilgisi ve konum, anadoludan geliyorsa boş bırak
        const employee_code = person.sicil_no || person.employee_code || '';
        const employee_name = person.adi_soyadi || person.full_name || '';
        const team_name = person.ekip_bilgisi || '';
        const position = person.konum || person.position || '';
        // Kaydet
        if (isApproved) {
          const saveData = {
            date: date,
            personnel_id: person.id,
            employee_code,
            employee_name,
            team_name,
            position,
            shift_info: shiftInfo,
            giris: (data && typeof data.giris === 'string') ? data.giris : (data && data.giris ? data.giris.format('HH:mm:ss') : null),
            cikis: (data && typeof data.cikis === 'string') ? data.cikis : (data && data.cikis ? data.cikis.format('HH:mm:ss') : null),
            approved: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          savePromises.push(
            saveTimesheetData(saveData).then(result => {
              if (!result.success) {
                console.error('KAYIT HATASI:', result.error);
              }
              return result;
            })
          );
        }
      });

      if (savePromises.length > 0) {
        await Promise.all(savePromises);
        message.success(`${savePromises.length} adet onaylanmış puantaj verisi başarıyla kaydedildi.`);
        // Kaydetme işleminden sonra isDataSaved state'ini güncelle
        setIsDataSaved(true);
        // Eksik günleri yeniden kontrol et
        await checkMissingDays();
      } else {
        message.info('Kaydedilecek onaylanmış veri bulunamadı');
      }
    } catch (error) {
      console.error('Error saving timesheet:', error);
      message.error('Veriler kaydedilirken hata oluştu');
    }
    setLoading(false);
  };

  const handlePreviousDay = () => {
    setSelectedDate(prev => prev.subtract(1, 'day'));
  };

  const handleNextDay = () => {
    const tomorrow = dayjs().add(1, 'day');
    setSelectedDate(prev => {
      const nextDay = prev.add(1, 'day');
      // Yarının ötesine geçmeyi engelle
      if (nextDay.isAfter(tomorrow)) {
        return prev; // Mevcut tarihi koru
      }
      return nextDay;
    });
  };

  const handleRefreshMissingDays = async () => {
    setLoading(true);
    try {
      await checkMissingDays();
      message.success('Eksik günler yeniden kontrol edildi');
    } catch (error) {
      console.error('Eksik gün kontrolü hatası:', error);
      message.error('Eksik gün kontrolü sırasında hata oluştu');
    }
    setLoading(false);
  };



  const handleApprove = (personId) => {
    // Personelin ekip bilgisini bul
    const person = teamPersonnel.find(p => p.id === personId);
    if (!person) {
      message.error('Personel bulunamadı');
      return;
    }

    const teamName = person.ekip_bilgisi;
    const isCurrentlyApproved = approvedPersonnel.has(personId);
    
    // Onay durumunu güncelle (toggle)
    setApprovedPersonnel(prev => {
      const newSet = new Set(prev);
      if (isCurrentlyApproved) {
        // Onayı kaldır
        newSet.delete(personId);
      } else {
        // Onayla
        newSet.add(personId);
      }
      
      // Eğer tüm personeller onaylandıysa bulk approval'ı aktif et
      const allPersonnel = [...teamPersonnel, ...anadoluPersonnel];
      if (newSet.size === allPersonnel.length) {
        setBulkApprovalActive(true);
      } else {
        setBulkApprovalActive(false);
      }
      
      return newSet;
    });
    
    if (isCurrentlyApproved) {
      message.success(`${person.adi_soyadi} onayı kaldırıldı`);
    } else {
      message.success(`${person.adi_soyadi} onaylandı`);
    }
  };

  const handleAnadoluApprove = (personId) => {
    // Anadolu personeli için pozisyona göre saatler
    const person = anadoluPersonnel.find(p => p.id === personId);
    if (!person) {
      message.error('Personel bulunamadı');
      return;
    }
    
    const isCurrentlyApproved = approvedPersonnel.has(personId);
    
    // Onay durumunu güncelle (toggle)
    setApprovedPersonnel(prev => {
      const newSet = new Set(prev);
      if (isCurrentlyApproved) {
        // Onayı kaldır
        newSet.delete(personId);
      } else {
        // Onayla
        newSet.add(personId);
      }
      
      // Eğer tüm personeller onaylandıysa bulk approval'ı aktif et
      const allPersonnel = [...teamPersonnel, ...anadoluPersonnel];
      if (newSet.size === allPersonnel.length) {
        setBulkApprovalActive(true);
      } else {
        setBulkApprovalActive(false);
      }
      
      return newSet;
    });
    
    const fullName = person?.full_name || person?.name || 'Personel';
    if (isCurrentlyApproved) {
      message.success(`${fullName} onayı kaldırıldı`);
    } else {
      message.success(`${fullName} onaylandı`);
    }
  };

  const handleBulkToggle = () => {
    if (bulkApprovalActive) {
      // Onayları kaldır
      setApprovedPersonnel(new Set());
      setBulkApprovalActive(false);
      message.success('Tüm onaylar kaldırıldı!');
    } else {
      // Tüm personelleri onayla
      const allPersonnelIds = new Set();
      
      // Ekip personellerini ekle
      teamPersonnel.forEach(person => {
        allPersonnelIds.add(person.id);
      });
      
      // Anadolu personellerini ekle
      anadoluPersonnel.forEach(person => {
        allPersonnelIds.add(person.id);
      });
      
      setApprovedPersonnel(allPersonnelIds);
      setBulkApprovalActive(true);
      message.success('Tüm personeller onaylandı!');
    }
  };

  const handleTeamBulkApprove = (teamName) => {
    // Belirli ekipteki tüm personelleri onayla
    const teamPersonnelIds = new Set();
    
    teamPersonnel.forEach(person => {
      if (person.ekip_bilgisi === teamName) {
        teamPersonnelIds.add(person.id);
      }
    });
    
    setApprovedPersonnel(prev => new Set([...prev, ...teamPersonnelIds]));
    message.success(`${teamName} ekipleri onaylandı!`);
  };

  const handleTeamBulkUnapprove = (teamName) => {
    // Belirli ekipteki tüm onayları kaldır
    const teamPersonnelIds = new Set();
    
    teamPersonnel.forEach(person => {
      if (person.ekip_bilgisi === teamName) {
        teamPersonnelIds.add(person.id);
      }
    });
    
    setApprovedPersonnel(prev => {
      const newSet = new Set(prev);
      teamPersonnelIds.forEach(id => newSet.delete(id));
      return newSet;
    });
    message.success(`${teamName} ekipleri onayları kaldırıldı!`);
  };

  // Anadolu personelleri için toplu onay fonksiyonları
  const handleAnadoluBulkApprove = () => {
    // Tüm Anadolu personellerini onayla
    const anadoluPersonnelIds = new Set();
    
    anadoluPersonnel.forEach(person => {
      anadoluPersonnelIds.add(person.id);
    });
    
    setApprovedPersonnel(prev => {
      const newSet = new Set([...prev, ...anadoluPersonnelIds]);
      return newSet;
    });
    message.success('Tüm Anadolu personelleri onaylandı!');
  };

  const handleAnadoluBulkUnapprove = () => {
    // Tüm Anadolu personellerinin onaylarını kaldır
    const anadoluPersonnelIds = new Set();
    
    anadoluPersonnel.forEach(person => {
      anadoluPersonnelIds.add(person.id);
    });
    
    setApprovedPersonnel(prev => {
      const newSet = new Set(prev);
      anadoluPersonnelIds.forEach(id => newSet.delete(id));
      return newSet;
    });
    message.success('Tüm Anadolu personelleri onayları kaldırıldı!');
  };

  // İptal fonksiyonları
  const handleCancelOvertime = (personId) => {
    // Mesai bilgisi gir alanlarını gizle
    setShowOvertimeForPerson(prev => {
      const newSet = new Set(prev);
      newSet.delete(personId);
      return newSet;
    });
    
    // Eğer veri girilmişse temizle
    setTimesheetData(prev => {
      const newData = { ...prev };
      if (newData[personId]) {
        delete newData[personId].giris;
        delete newData[personId].cikis;
        if (Object.keys(newData[personId]).length === 0) {
          delete newData[personId];
        }
      }
      return newData;
    });
    
    message.info('Mesai bilgisi iptal edildi');
  };

  const handleCancelAnadoluOvertime = (personId) => {
    // Anadolu mesai bilgisi alanlarını gizle
    setShowOvertimeForPerson(prev => {
      const newSet = new Set(prev);
      newSet.delete(personId);
      return newSet;
    });
    
    // Eğer veri girilmişse temizle
    setAnadoluTimesheetData(prev => {
      const newData = { ...prev };
      if (newData[personId]) {
        delete newData[personId].giris;
        delete newData[personId].cikis;
        if (Object.keys(newData[personId]).length === 0) {
          delete newData[personId];
        }
      }
      return newData;
    });
    
    message.info('Mesai bilgisi iptal edildi');
  };

  // Veri kontrolü fonksiyonları
  const hasTimeData = (personId, isAnadolu = false) => {
    const data = isAnadolu ? anadoluTimesheetData[personId] : timesheetData[personId];
    if (!data) return false;
    
    const giris = data.giris;
    const cikis = data.cikis;
    
    // Özel durumlar için kontrol (R, Y.İ, Ü.İ, H.B)
    if (typeof giris === 'string' && (giris === 'R' || giris === 'Y.İ' || giris === 'Ü.İ' || giris === 'H.B')) return true;
    if (typeof cikis === 'string' && (cikis === 'R' || cikis === 'Y.İ' || cikis === 'Ü.İ' || cikis === 'H.B')) return true;
    
    // Normal string kontrolü
    if (typeof giris === 'string' && giris.trim() !== '') return true;
    if (typeof cikis === 'string' && cikis.trim() !== '') return true;
    
    // dayjs objesi olarak kontrol et
    if (giris && typeof giris.format === 'function' && giris.isValid()) return true;
    if (cikis && typeof cikis.format === 'function' && cikis.isValid()) return true;
    
    return false;
  };

  // Ekip tablosu için sütunlar
  const teamColumns = [
    {
      title: 'Sicil No',
      dataIndex: 'sicil_no',
      key: 'sicil_no',
      width: 80,
      render: (text) => <Text style={{ fontSize: '11px', fontWeight: 'bold' }}>{text}</Text>
    },
    {
      title: 'Adı Soyadı',
      dataIndex: 'adi_soyadi',
      key: 'adi_soyadi',
      width: 150,
      render: (text) => <Text style={{ fontSize: '11px' }}>{text}</Text>
    },
    {
      title: 'Fiili Görev',
      dataIndex: 'konum',
      key: 'konum',
      width: 180,
      render: (text) => <Text style={{ fontSize: '11px' }}>{text}</Text>
    },
         {
       title: 'Giriş',
       key: 'giris',
       width: 90,
       onCell: (record) => {
         const isLeaveTeam = teamShifts[record.ekip_bilgisi] && teamShifts[record.ekip_bilgisi].leave_shift;
         const showOvertime = showOvertimeForPerson.has(record.id);
         
         if (isLeaveTeam && !showOvertime) {
           return {
             colSpan: 3 // Giriş, Çıkış ve Onay sütunlarını kapla
           };
         }
         return {};
       },
       render: (_, record) => {
          const isLeaveTeam = teamShifts[record.ekip_bilgisi] && teamShifts[record.ekip_bilgisi].leave_shift;
          const showOvertime = showOvertimeForPerson.has(record.id);
          
                     if (isLeaveTeam && !showOvertime) {
             return (
               <div style={{ 
                 display: 'flex', 
                 justifyContent: 'center',
                 alignItems: 'center',
                 width: '100%'
               }}>
                 <Button
                   type="dashed"
                   size="small"
                   style={{ 
                     width: '230px', 
                     fontSize: '10px',
                     height: '24px',
                     borderRadius: '4px',
                     opacity: isDataSaved ? 0.5 : 1,
                     cursor: isDataSaved ? 'not-allowed' : 'pointer'
                   }}
                   onClick={() => {
                     if (!isDataSaved) {
                       setShowOvertimeForPerson(prev => new Set([...prev, record.id]));
                     }
                   }}
                   disabled={isDataSaved}
                 >
                   Mesai Bilgisi Gir
                 </Button>
               </div>
             );
           }
          
          return (
            <Input
              size="small"
              style={{ width: '70px', fontSize: '11px' }}
              value={(() => {
                const girisData = timesheetData[record.id]?.giris;
                
                if (!girisData) {
                  return '';
                }
                
                if (typeof girisData === 'string') {
                  return girisData;
                }
                
                if (girisData && typeof girisData.format === 'function' && girisData.isValid()) {
                  return girisData.format('HH:mm');
                }
                
                return '';
              })()}
              onChange={(e) => {
                const value = e.target.value;
                // Özel durumlar için (R, Y.İ, Ü.İ, H.B)
                if (value === 'R' || value === 'Y.İ' || value === 'Ü.İ' || value === 'H.B') {
                  setTimesheetData(prev => ({
                    ...prev,
                    [record.id]: {
                      ...prev[record.id],
                      giris: value,
                      cikis: value
                    }
                  }));
                } else {
                  // Normal saat girişi için
                  handleTimeInput(record.id, 'giris', value);
                }
              }}
              placeholder="--:--"
              disabled={approvedPersonnel.has(record.id) || isDataSaved}
            />
          );
        }
     },
                  {
        title: 'Çıkış',
        key: 'cikis',
        width: 90,
        onCell: (record) => {
          const isLeaveTeam = teamShifts[record.ekip_bilgisi] && teamShifts[record.ekip_bilgisi].leave_shift;
          const showOvertime = showOvertimeForPerson.has(record.id);
          
          if (isLeaveTeam && !showOvertime) {
            return {
              colSpan: 0 // Bu sütunu gizle
            };
          }
          return {};
        },
        render: (_, record) => {
           const isLeaveTeam = teamShifts[record.ekip_bilgisi] && teamShifts[record.ekip_bilgisi].leave_shift;
           const showOvertime = showOvertimeForPerson.has(record.id);
           
           if (isLeaveTeam && !showOvertime) {
             return null;
           }
           
           return (
             <Input
               size="small"
               style={{ width: '70px', fontSize: '11px' }}
               value={(() => {
                 const cikisData = timesheetData[record.id]?.cikis;
                 
                 if (!cikisData) {
                   return '';
                 }
                 
                 if (typeof cikisData === 'string') {
                   return cikisData;
                 }
                 
                 if (cikisData && typeof cikisData.format === 'function' && cikisData.isValid()) {
                   return cikisData.format('HH:mm');
                 }
                 
                 return '';
               })()}
               onChange={(e) => {
                 const value = e.target.value;
                 // Özel durumlar için (R, Y.İ, Ü.İ, H.B)
                 if (value === 'R' || value === 'Y.İ' || value === 'Ü.İ' || value === 'H.B') {
                   setTimesheetData(prev => ({
                     ...prev,
                     [record.id]: {
                       ...prev[record.id],
                       giris: value,
                       cikis: value
                     }
                   }));
                 } else {
                   // Normal saat girişi için
                   handleTimeInput(record.id, 'cikis', value);
                 }
               }}
               placeholder="--:--"
               disabled={approvedPersonnel.has(record.id) || isDataSaved}
             />
           );
         }
      },
           {
        title: 'Onay',
        key: 'onay',
        width: 50,
        onCell: (record) => {
          const isLeaveTeam = teamShifts[record.ekip_bilgisi] && teamShifts[record.ekip_bilgisi].leave_shift;
          const showOvertime = showOvertimeForPerson.has(record.id);
          
          if (isLeaveTeam && !showOvertime) {
            return {
              colSpan: 0 // Bu sütunu gizle
            };
          }
          return {};
        },
        render: (_, record) => {
           const isApproved = approvedPersonnel.has(record.id);
           const isLeaveTeam = teamShifts[record.ekip_bilgisi] && teamShifts[record.ekip_bilgisi].leave_shift;
           const showOvertime = showOvertimeForPerson.has(record.id);
           
           // İzinli ekiplerde ve mesai bilgisi girilmemişse onay butonu gösterilmez
           if (isLeaveTeam && !showOvertime) {
             return null;
           }
           
           // İzinli ekiplerde ve mesai bilgisi açıksa, veri kontrolü yap
           if (isLeaveTeam && showOvertime) {
             const hasData = hasTimeData(record.id, false);
             
             if (!hasData) {
               // Veri yoksa iptal butonu göster
    return (
                 <Button
                   type="default"
                   danger
                   size="small"
                   style={{ 
                     width: '30px', 
                     height: '20px', 
                     fontSize: '8px',
                     padding: '0',
                     minWidth: '30px'
                   }}
                   onClick={() => {
                     console.log('İptal butonuna tıklandı! Personel ID:', record.id);
                     handleCancelOvertime(record.id);
                   }}
                 >
                   ✗
                 </Button>
               );
             }
           }
           
           return isApproved ? (
             <Button
               type="default"
               danger
               size="small"
               style={{ 
                 width: '30px', 
                 height: '20px', 
                 fontSize: '8px',
                 padding: '0',
                 minWidth: '30px'
               }}
               onClick={() => {
                 console.log('Onay kaldır butonuna tıklandı! Personel ID:', record.id);
                 handleApprove(record.id);
               }}
               disabled={isDataSaved}
             >
               ✗
             </Button>
           ) : (
             <Button
               type="primary"
               size="small"
               icon={<CheckOutlined />}
               style={{ 
                 width: '30px', 
                 height: '20px', 
                 fontSize: '8px',
                 padding: '0',
                 minWidth: '30px'
               }}
               onClick={() => {
                 console.log('Onay butonuna tıklandı! Personel ID:', record.id);
                 handleApprove(record.id);
               }}
               disabled={isDataSaved}
             />
           );
         }
      }
  ];

  // Anadolu personel tablosu için sütunlar
  const anadoluColumns = [
    {
      title: 'Sicil No',
      dataIndex: 'employee_code',
      key: 'employee_code',
      width: 80,
      render: (text) => <Text style={{ fontSize: '11px', fontWeight: 'bold' }}>{text}</Text>
    },
    {
      title: 'Adı Soyadı',
      dataIndex: 'full_name',
      key: 'full_name',
      width: 150,
      render: (text) => <Text style={{ fontSize: '11px' }}>{text}</Text>
    },
         {
       title: 'Fiili Görev',
       dataIndex: 'position',
       key: 'position',
       width: 180,
               render: (text) => (
          <div style={{
            backgroundColor: text === 'SEVKİYAT ELEMANI' ? '#e6f7ff' : 
                           text === 'ŞOFÖR' ? '#f6ffed' : '#f5f5f5',
            color: text === 'SEVKİYAT ELEMANI' ? '#1890ff' : 
                   text === 'ŞOFÖR' ? '#52c41a' : '#000000',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: '500',
            textAlign: 'center',
            border: text === 'SEVKİYAT ELEMANI' ? '1px solid #91d5ff' : 
                    text === 'ŞOFÖR' ? '1px solid #b7eb8f' : '1px solid #d9d9d9'
          }}>
            {text}
          </div>
        )
     },
         {
               title: 'Giriş',
        key: 'giris',
        width: 90,
        render: (_, record) => {
          const shiftType = anadoluShifts[record.id];
          const showOvertimeForAnadolu = showOvertimeForPerson.has(record.id);
          
          if ((shiftType === 'raporlu' || shiftType === 'yillik_izin') && !showOvertimeForAnadolu) {
  return (
              <div style={{
                backgroundColor: (approvedPersonnel.has(record.id) || isDataSaved) ? '#52c41a' : '#faad14',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '10px',
                textAlign: 'center',
                fontWeight: 'bold',
                width: '70px',
                border: (approvedPersonnel.has(record.id) || isDataSaved) ? '2px solid #389e0d' : 'none',
                boxShadow: (approvedPersonnel.has(record.id) || isDataSaved) ? '0 2px 4px rgba(82, 196, 26, 0.3)' : 'none',
                pointerEvents: 'none',
                userSelect: 'none',
                cursor: 'default'
              }}>
                {shiftType === 'raporlu' ? 'R' : 'Y.İ'}
          </div>
            );
          }
          
          return (
            <Input
              size="small"
              style={{ width: '70px', fontSize: '11px' }}
              value={(() => {
                const girisData = anadoluTimesheetData[record.id]?.giris;
                
                if (!girisData) {
                  return '';
                }
                
                if (typeof girisData === 'string') {
                  return girisData;
                }
                
                if (girisData && typeof girisData.format === 'function' && girisData.isValid()) {
                  return girisData.format('HH:mm');
                }
                
                return '';
              })()}
              onChange={(e) => {
                const value = e.target.value;
                // Özel durumlar için (R, Y.İ, Ü.İ, H.B)
                if (value === 'R' || value === 'Y.İ' || value === 'Ü.İ' || value === 'H.B') {
                  setAnadoluTimesheetData(prev => ({
                    ...prev,
                    [record.id]: {
                      ...prev[record.id],
                      giris: value,
                      cikis: value
                    }
                  }));
                } else {
                  // Normal saat girişi için
                  handleAnadoluTimeInput(record.id, 'giris', value);
                }
              }}
              placeholder="--:--"
              disabled={approvedPersonnel.has(record.id) || isDataSaved}
            />
          );
        }
     },
                  {
        title: 'Çıkış',
        key: 'cikis',
        width: 90,
        render: (_, record) => {
          const shiftType = anadoluShifts[record.id];
          const showOvertimeForAnadolu = showOvertimeForPerson.has(record.id);
          
          if ((shiftType === 'raporlu' || shiftType === 'yillik_izin') && !showOvertimeForAnadolu) {
            return (
              <div style={{
                backgroundColor: (approvedPersonnel.has(record.id) || isDataSaved) ? '#52c41a' : '#faad14',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '10px',
                textAlign: 'center',
                fontWeight: 'bold',
                width: '70px',
                border: (approvedPersonnel.has(record.id) || isDataSaved) ? '2px solid #389e0d' : 'none',
                boxShadow: (approvedPersonnel.has(record.id) || isDataSaved) ? '0 2px 4px rgba(82, 196, 26, 0.3)' : 'none',
                pointerEvents: 'none',
                userSelect: 'none',
                cursor: 'default'
              }}>
                {shiftType === 'raporlu' ? 'R' : 'Y.İ'}
            </div>
            );
          }
          
          return (
            <Input
              size="small"
              style={{ width: '70px', fontSize: '11px' }}
              value={(() => {
                const cikisData = anadoluTimesheetData[record.id]?.cikis;
                
                if (!cikisData) {
                  return '';
                }
                
                if (typeof cikisData === 'string') {
                  return cikisData;
                }
                
                if (cikisData && typeof cikisData.format === 'function' && cikisData.isValid()) {
                  return cikisData.format('HH:mm');
                }
                
                return '';
              })()}
              onChange={(e) => {
                const value = e.target.value;
                // Özel durumlar için (R, Y.İ, Ü.İ, H.B)
                if (value === 'R' || value === 'Y.İ' || value === 'Ü.İ' || value === 'H.B') {
                  setAnadoluTimesheetData(prev => ({
                    ...prev,
                    [record.id]: {
                      ...prev[record.id],
                      giris: value,
                      cikis: value
                    }
                  }));
                } else {
                  // Normal saat girişi için
                  handleAnadoluTimeInput(record.id, 'cikis', value);
                }
              }}
              placeholder="--:--"
              disabled={approvedPersonnel.has(record.id) || isDataSaved}
            />
          );
        }
      },
           {
        title: 'Onay',
        key: 'onay',
        width: 50,
        render: (_, record) => {
          const isApproved = approvedPersonnel.has(record.id);
          const shiftType = anadoluShifts[record.id];
          const showOvertimeForAnadolu = showOvertimeForPerson.has(record.id);
          
          // Eğer personel izinli ise ve mesai bilgisi girilmemişse + butonu göster
          if ((shiftType === 'raporlu' || shiftType === 'yillik_izin') && !showOvertimeForAnadolu) {
            return (
              <Button
                type="dashed"
                size="small"
                style={{ 
                  width: '30px', 
                  height: '20px', 
                  fontSize: '8px',
                  padding: '0',
                  minWidth: '30px',
                  opacity: isDataSaved ? 0.5 : 1,
                  cursor: isDataSaved ? 'not-allowed' : 'pointer'
                }}
                onClick={() => {
                  if (!isDataSaved) {
                    setShowOvertimeForPerson(prev => new Set([...prev, record.id]));
                  }
                }}
                disabled={isDataSaved}
              >
                +
              </Button>
            );
          }
          
          // Eğer personel izinli ise ve mesai bilgisi açıksa, veri kontrolü yap
          if ((shiftType === 'raporlu' || shiftType === 'yillik_izin') && showOvertimeForAnadolu) {
            const hasData = hasTimeData(record.id, true);
            
            if (!hasData) {
              // Veri yoksa iptal butonu göster
              return (
                <Button
                  type="default"
                  danger
                  size="small"
                  style={{ 
                    width: '30px', 
                    height: '20px', 
                    fontSize: '8px',
                    padding: '0',
                    minWidth: '30px'
                  }}
                  onClick={() => {
                    console.log('Anadolu İptal butonuna tıklandı! Personel ID:', record.id);
                    handleCancelAnadoluOvertime(record.id);
                  }}
                >
                  ✗
                </Button>
              );
            }
          }
          
          return isApproved ? (
            <Button
              type="default"
              danger
              size="small"
              style={{ 
                width: '30px', 
                height: '20px', 
                fontSize: '8px',
                padding: '0',
                minWidth: '30px'
              }}
              onClick={() => {
                console.log('Anadolu Onay kaldır butonuna tıklandı! Personel ID:', record.id);
                handleAnadoluApprove(record.id);
              }}
              disabled={isDataSaved}
            >
              ✗
            </Button>
          ) : (
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              style={{ 
                width: '30px', 
                height: '20px', 
                fontSize: '8px',
                padding: '0',
                minWidth: '30px'
              }}
              onClick={() => {
                console.log('Anadolu Onay butonuna tıklandı! Personel ID:', record.id);
                handleAnadoluApprove(record.id);
              }}
              disabled={isDataSaved}
            />
          );
        }
      }
  ];

     return (
           <div className="timesheet-container" style={{ 
        padding: '16px', 
        backgroundColor: 'white',
        minHeight: '100vh',
        width: '100%'
      }}>
      {/* Ana İçerik */}
      <div style={{
        width: '100%',
        maxWidth: '100%',
        backgroundColor: 'white',
        padding: '20px',
        position: 'relative'
      }}>
                 {/* Başlık */}
         <div style={{ 
           textAlign: 'center', 
           marginBottom: '20px',
           borderBottom: '2px solid #000',
           paddingBottom: '10px'
         }}>
           <Title level={3} style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
             TUZLA SEVKİYAT PUANTAJI
           </Title>
           
           {/* Kaydedilen Veri Uyarısı */}
           {isDataSaved && (
             <div style={{
               backgroundColor: '#f6ffed',
               border: '1px solid #b7eb8f',
               borderRadius: '6px',
               padding: '8px 16px',
               margin: '10px 0',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               gap: '8px'
             }}>
               <CheckOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
               <Text style={{ color: '#52c41a', fontWeight: '600', fontSize: '14px' }}>
                 Bu tarih için puantaj verileri kaydedilmiş. Veriler düzenlenemez.
               </Text>
             </div>
           )}

           {/* Geçmiş Gün Uyarısı */}
           {missingDaysWarning.length > 0 && (
             <Alert
               message={
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: '16px' }} />
                   <Text style={{ fontWeight: '600', fontSize: '14px', color: '#d46b08' }}>
                     {missingDaysWarning.length === 1 
                       ? '⚠️ 1 gün için puantaj verisi KAYDEDİLMEMİŞ!'
                       : `⚠️ ${missingDaysWarning.length} gün için puantaj verisi KAYDEDİLMEMİŞ!`
                     }
                   </Text>
                 </div>
               }
               description={
                 <div style={{ marginTop: '8px' }}>
                   <Text style={{ fontSize: '13px', color: '#d46b08', fontWeight: '500' }}>
                     Aşağıdaki günler için puantaj verileri KAYDEDİLMEMİŞ (hafta sonları dahil):
                   </Text>
                   <div style={{ 
                     marginTop: '8px',
                     display: 'flex',
                     flexWrap: 'wrap',
                     gap: '8px'
                   }}>
                     {missingDaysWarning.slice(0, 5).map((day, index) => (
                       <div
                         key={index}
                         style={{
                           backgroundColor: day.isWeekend ? '#f0f0f0' : '#fff2e8',
                           border: `1px solid ${day.isWeekend ? '#d9d9d9' : '#ffbb96'}`,
                           borderRadius: '4px',
                           padding: '6px 10px',
                           fontSize: '12px',
                           fontWeight: '500',
                           color: day.isWeekend ? '#666' : '#d46b08',
                           cursor: 'pointer',
                           transition: 'all 0.2s',
                           display: 'flex',
                           alignItems: 'center',
                           gap: '4px'
                         }}
                         onClick={() => {
                           setSelectedDate(day.dateObj);
                         }}
                         onMouseEnter={(e) => {
                           e.target.style.backgroundColor = day.isWeekend ? '#e6e6e6' : '#ffe7ba';
                           e.target.style.borderColor = day.isWeekend ? '#bfbfbf' : '#ffa940';
                           e.target.style.transform = 'translateY(-1px)';
                         }}
                         onMouseLeave={(e) => {
                           e.target.style.backgroundColor = day.isWeekend ? '#f0f0f0' : '#fff2e8';
                           e.target.style.borderColor = day.isWeekend ? '#d9d9d9' : '#ffbb96';
                           e.target.style.transform = 'translateY(0)';
                         }}
                       >
                         <ExclamationCircleOutlined style={{ fontSize: '10px' }} />
                         {day.date} ({day.dayName})
                         {day.isWeekend && <span style={{ fontSize: '10px', color: '#999', marginLeft: '4px' }}>(Hafta Sonu)</span>}
                         <span style={{ 
                           fontSize: '10px', 
                           opacity: 0.7,
                           marginLeft: '4px'
                         }}>
                           {day.daysAgo === 1 ? 'dün' : `${day.daysAgo} gün önce`}
                         </span>
                       </div>
                     ))}
                     {missingDaysWarning.length > 5 && (
                       <div style={{
                         backgroundColor: '#f0f0f0',
                         border: '1px solid #d9d9d9',
                         borderRadius: '4px',
                         padding: '6px 10px',
                         fontSize: '12px',
                         color: '#666',
                         fontWeight: '500'
                       }}>
                         +{missingDaysWarning.length - 5} gün daha...
                       </div>
                     )}
                   </div>
                   <div style={{ 
                     marginTop: '12px',
                     display: 'flex',
                     alignItems: 'center',
                     gap: '8px'
                   }}>
                     <Text style={{ 
                       fontSize: '12px', 
                       color: '#999'
                     }}>
                       * Günlere tıklayarak o tarihe gidebilirsiniz
                     </Text>
                     <Button
                       type="link"
                       size="small"
                       style={{ 
                         fontSize: '11px', 
                         padding: '0',
                         height: 'auto',
                         color: '#1890ff'
                       }}
                       onClick={() => {
                         // En yakın eksik güne git
                         if (missingDaysWarning.length > 0) {
                           setSelectedDate(missingDaysWarning[0].dateObj);
                         }
                       }}
                     >
                       En yakın eksik güne git →
                     </Button>
                   </div>
                 </div>
               }
               type="warning"
               showIcon={false}
             />
           )}

           {/* Seçili Gün Uyarısı - Bu günün verisi kaydedilmemişse (sadece bugün ve geçmiş günler için) */}
           {!isDataSaved && selectedDate && selectedDate.isSameOrBefore && selectedDate.isSameOrBefore(dayjs(), 'day') && (
             <Alert
               message={
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: '16px' }} />
                   <Text style={{ fontWeight: '600', fontSize: '14px', color: '#cf1322' }}>
                     ⚠️ Bu gün için puantaj verisi KAYDEDİLMEMİŞ!
                   </Text>
                 </div>
               }
               description={
                 <div style={{ marginTop: '8px' }}>
                   <Text style={{ fontSize: '13px', color: '#cf1322', fontWeight: '500' }}>
                     {selectedDate && selectedDate.format ? selectedDate.format('DD.MM.YYYY') : 'Tarih bilgisi yok'} ({selectedDate && selectedDate.format ? selectedDate.format('dddd') : 'Gün bilgisi yok'}) tarihi için puantaj verileri henüz kaydedilmemiş. 
                     Lütfen aşağıdaki "Kaydet" butonunu kullanarak verileri kaydedin.
                   </Text>
                 </div>
               }
               type="error"
               showIcon={false}
             />
           )}
           
           <div style={{ 
             display: 'flex', 
             alignItems: 'center', 
             justifyContent: 'center', 
             gap: '20px',
             marginTop: '10px'
           }}>
             <Button
               type="text"
               icon={<LeftOutlined />}
               onClick={handlePreviousDay}
               size="small"
               style={{ fontSize: '16px' }}
             />
             <Text style={{ fontSize: '16px', fontWeight: '600', minWidth: '120px' }}>
               {selectedDate && selectedDate.format ? selectedDate.format('DD.MM.YYYY') : 'Tarih bilgisi yok'}
             </Text>
             <Button
               type="text"
               icon={<RightOutlined />}
               onClick={handleNextDay}
               size="small"
               style={{ fontSize: '16px' }}
               disabled={selectedDate && selectedDate.add ? selectedDate.add(1, 'day').isAfter(dayjs().add(1, 'day')) : false}
             />
             <Button
               type="text"
               icon={<ReloadOutlined />}
               onClick={handleRefreshMissingDays}
               size="small"
               style={{ fontSize: '14px' }}
               title="Eksik günleri yeniden kontrol et"
               loading={loading}
             />

            </div>
           
      </div>

          {/* Sol Taraf - Ekipler */}
          <div style={{ display: 'flex', gap: '30px', width: '100%' }}>
                         <div style={{ flex: 1, minWidth: 0 }}>
               {ekipOptions.map(ekip => {
                 // İzinli ekipleri kontrol et
                 const isLeaveTeam = teamShifts[ekip] && teamShifts[ekip].leave_shift;
                 
                 return (
                   <div key={ekip} style={{ marginBottom: '20px' }}>
                     <div style={{
                       backgroundColor: getTeamColor(ekip),
                       color: 'white',
                       padding: '8px 12px',
                       fontWeight: 'bold',
                       fontSize: '14px',
                       marginBottom: '8px',
                       borderRadius: '4px',
                       display: 'flex',
                       justifyContent: 'space-between',
                       alignItems: 'center'
                     }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                         <span>{ekip}</span>
                         {/* Ekip Bazlı Onay Butonları */}
                         {!isDataSaved && (
                           <div style={{ display: 'flex', gap: '4px' }}>
                             <Button
                               type="text"
                               size="small"
                               style={{ 
                                 color: 'white', 
                                 fontSize: '10px',
                                 padding: '2px 6px',
                                 height: '20px',
                                 border: '1px solid rgba(255,255,255,0.3)'
                               }}
                               onClick={() => handleTeamBulkApprove(ekip)}
                             >
                               Onayla
                             </Button>
                             <Button
                               type="text"
                               size="small"
                               danger
                               style={{ 
                                 color: 'white', 
                                 fontSize: '10px',
                                 padding: '2px 6px',
                                 height: '20px',
                                 border: '1px solid rgba(255,255,255,0.3)'
                               }}
                               onClick={() => handleTeamBulkUnapprove(ekip)}
                             >
                               Kaldır
                             </Button>
                           </div>
                         )}
            </div>
                       {/* Vardiya Bilgisi */}
                       {teamShifts[ekip] && (
                         <div style={{ display: 'flex', gap: '4px' }}>
                           {teamShifts[ekip].leave_shift && (
                             <div style={{
                               backgroundColor: '#52c41a',
                               color: 'white',
                               padding: '2px 6px',
                               borderRadius: '3px',
                               fontSize: '10px',
                               fontWeight: '500',
                               border: '2px solid #389e0d',
                               boxShadow: '0 2px 4px rgba(82, 196, 26, 0.3)'
                             }}>
                               İZİN
          </div>
                           )}
                           {teamShifts[ekip].shift_24_08 && (
                             <div style={{
                               backgroundColor: 'rgba(255,255,255,0.2)',
                               color: 'white',
                               padding: '2px 6px',
                               borderRadius: '3px',
                               fontSize: '10px',
                               fontWeight: '500'
                             }}>
                               24:00-08:00
        </div>
                           )}
                           {teamShifts[ekip].shift_08_16 && (
                             <div style={{
                               backgroundColor: 'rgba(255,255,255,0.2)',
                               color: 'white',
                               padding: '2px 6px',
                               borderRadius: '3px',
                               fontSize: '10px',
                               fontWeight: '500'
                             }}>
                               08:00-16:00
            </div>
                           )}
                           {teamShifts[ekip].shift_16_24 && (
                             <div style={{
                               backgroundColor: 'rgba(255,255,255,0.2)',
                               color: 'white',
                               padding: '2px 6px',
                               borderRadius: '3px',
                               fontSize: '10px',
                               fontWeight: '500'
                             }}>
                               16:00-24:00
            </div>
                           )}
          </div>
                       )}
        </div>

                                           <Table
                        columns={teamColumns}
                        dataSource={groupedPersonnel[ekip] || []}
                        rowKey="id"
                        pagination={false}
                        size="small"
                        style={{ fontSize: '11px' }}
                        bordered
                        rowClassName={(record, index) => 
                          index % 2 === 0 ? 'even-row' : 'odd-row'
                        }
                        
                      />
            </div>
                 );
               })}
            </div>

                       {/* Sağ Taraf - Anadolu Personelleri */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                backgroundColor: '#722ed1',
                color: 'white',
                padding: '8px 12px',
                fontWeight: 'bold',
                fontSize: '14px',
                marginBottom: '8px',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>Anadolu Personelleri</div>
                {!isDataSaved && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <Button
                      type="primary"
                      size="small"
                      style={{ 
                        backgroundColor: 'rgba(255,255,255,0.2)', 
                        borderColor: 'rgba(255,255,255,0.3)',
                        color: 'white', 
                        fontSize: '10px',
                        padding: '2px 6px',
                        height: '20px',
                        border: '1px solid rgba(255,255,255,0.3)'
                      }}
                      onClick={handleAnadoluBulkApprove}
                    >
                      Onayla
                    </Button>
                    <Button
                      type="default"
                      size="small"
                      style={{ 
                        backgroundColor: 'rgba(255,255,255,0.2)', 
                        borderColor: 'rgba(255,255,255,0.3)',
                        color: 'white', 
                        fontSize: '10px',
                        padding: '2px 6px',
                        height: '20px',
                        border: '1px solid rgba(255,255,255,0.3)'
                      }}
                      onClick={handleAnadoluBulkUnapprove}
                    >
                      Kaldır
                    </Button>
                  </div>
                )}
        </div>

                            <Table
                 columns={anadoluColumns}
                 dataSource={anadoluPersonnel.sort((a, b) => {
                   // Önce pozisyona göre sırala
                   const positionPriority = {
                     'SEVKİYAT ELEMANI': 1,
                     'ŞOFÖR': 2
                   };
                   
                   const priorityA = positionPriority[a.position] || 999;
                   const priorityB = positionPriority[b.position] || 999;
                   if (priorityA !== priorityB) {
                     return priorityA - priorityB;
                   }
                   
                   // Aynı pozisyonda ise sicil numarasına göre sırala
                   return parseInt(a.employee_code) - parseInt(b.employee_code);
                 })}
                 rowKey="id"
                 pagination={false}
                 size="small"
                 style={{ fontSize: '11px' }}
                 bordered
                 rowClassName={(record, index) => 
                   index % 2 === 0 ? 'even-row' : 'odd-row'
                 }
               />
               
                               {/* Alt Bilgiler - Anadolu Tablosunun Hemen Altında */}
                <div style={{ 
                  marginTop: '25px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  padding: '15px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef',
                  marginBottom: '20px'
                }}>
            <div>
                   <Text strong style={{ fontSize: '12px' }}>Kısaltma Açıklamaları:</Text>
                   <div style={{ marginTop: '6px' }}>
                     <Text>H.B - Habersiz</Text><br />
                     <Text>Y.İ - Yıllık İzin</Text><br />
                     <Text>Ü.İ - Ücretsiz İzin</Text><br />
                     <Text>R - Raporlu</Text>
            </div>
            </div>
                 
                 <div style={{ textAlign: 'right' }}>
                   <div style={{ marginBottom: '6px' }}>
                     <Text strong style={{ fontSize: '12px' }}>Toplam Personel:</Text> {teamPersonnel.length + anadoluPersonnel.length}
          </div>
                   <div style={{ marginBottom: '4px' }}>
                     <Text strong>Ekip Personeli:</Text> {teamPersonnel.length}
        </div>
                   <div style={{ marginBottom: '4px' }}>
                     <Text strong>Anadolu Personeli:</Text> {anadoluPersonnel.length}
      </div>
                    <div>
                     <Text strong>Tarih:</Text> {selectedDate && selectedDate.format ? selectedDate.format('DD.MM.YYYY') : 'Tarih bilgisi yok'}
                    </div>
                    </div>
        </div>
      </div>
              </div>
              </div>

               {/* Kontrol Butonları */}
        <div style={{ 
          position: 'fixed', 
          bottom: '20px', 
          right: '20px',
          display: 'flex',
          gap: '10px'
        }}>
          {!isDataSaved && (
            <Button
              type={bulkApprovalActive ? "default" : "primary"}
              danger={bulkApprovalActive}
              icon={<CheckOutlined />}
              onClick={handleBulkToggle}
              size="large"
            >
              {bulkApprovalActive ? 'Onay Kaldır' : 'Toplu Onay'}
            </Button>
          )}
          {!isDataSaved ? (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={loading}
              size="large"
            >
              Kaydet
            </Button>
          ) : (
            // Sadece seçili tarih için veri kaydedilmişse ve eksik gün uyarısı yoksa göster
            missingDaysWarning.length === 0 && (
              <div style={{
                backgroundColor: '#52c41a',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '2px solid #389e0d',
                boxShadow: '0 2px 4px rgba(82, 196, 26, 0.3)'
              }}>
                <CheckOutlined />
                Veriler Kaydedildi
              </div>
            )
          )}
              </div>

                                                        {/* Print CSS */}
        <style jsx>{`
          @media print {
            /* Tüm sayfayı sıfırla */
            * {
              box-sizing: border-box !important;
            }
            
            body { 
              margin: 0 !important; 
              padding: 0 !important;
              background: white !important;
            }
            
            /* Tüm butonları gizle */
            .ant-btn, button { 
              display: none !important; 
            }
            
                          /* Sadece sidebar'ı gizle */
              .sidebar-container { 
                display: none !important; 
              }
            
            /* Layout container'larını sıfırla */
            .ant-layout, .ant-layout-content, .ant-layout-main {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              max-width: none !important;
              min-height: auto !important;
            }
            
            /* App.js içindeki layout elementlerini gizle */
            .App, .app-container, .main-content {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              max-width: none !important;
            }
            
            /* Sadece timesheet container'ını göster */
            .timesheet-container {
              display: block !important;
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 20px !important;
              background: white !important;
              position: static !important;
              min-height: auto !important;
            }
            
            /* Diğer tüm sayfaları gizle */
            .team-personnel-container, .admin-panel, .dashboard,
            .personnel-list, .store-list, .vehicle-list,
            .performance-analysis, .shift-planning, .store-distribution,
            .vehicle-distribution, .chat-system, .notification-panel,
            .rules-app, .store-map, .store-distance-calculator,
            .background-boxes, .login-form, .session-timeout-modal,
            .unauthorized-access, .file-upload {
              display: none !important;
            }
            
            /* Root elementleri sıfırla */
            #root, .root {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              max-width: none !important;
            }
            
            /* Tabloları optimize et */
            .ant-table {
              font-size: 10px !important;
              page-break-inside: avoid !important;
            }
            
            .ant-table-thead > tr > th {
              font-size: 10px !important;
              padding: 4px !important;
              background: #f5f5f5 !important;
            }
            
            .ant-table-tbody > tr > td {
              font-size: 10px !important;
              padding: 4px !important;
            }
            
            /* TimePicker'ları gizle, sadece placeholder göster */
            .ant-picker, .ant-picker-input {
              display: none !important;
            }
            
            /* TimePicker yerine placeholder göster */
            .ant-picker-input::before {
              content: "--:--" !important;
              display: inline-block !important;
              width: 100% !important;
              height: 20px !important;
              border: 1px solid #d9d9d9 !important;
              padding: 4px !important;
              background: white !important;
            }
            
                          /* Diğer tüm elementleri gizle */
              .ant-layout-sider, .ant-layout-header, .ant-layout-footer,
              .ant-menu, .ant-menu-item, .ant-menu-submenu,
              .ant-layout-aside, .ant-layout-sidebar {
                display: none !important;
              }
              
              /* Ek olarak tüm flex container'ları ve layout elementlerini gizle */
              div[class*="flex"], div[class*="grid"], div[class*="container"],
              div[class*="wrapper"], div[class*="layout"], div[class*="main"],
              div[class*="content"], div[class*="sidebar"], div[class*="nav"],
              div[class*="header"], div[class*="footer"], div[class*="menu"] {
                display: none !important;
              }
              
              /* Sadece timesheet container'ının içindeki elementleri göster */
              .timesheet-container * {
                display: revert !important;
              }
              
              /* Sadece sidebar ve navigation elementlerini gizle */
              .sidebar-container, 
              div[class*="w-80"], 
              div[class*="bg-white/95"], 
              div[class*="backdrop-blur-md"],
              div[class*="relative z-10 flex h-screen"] {
                display: none !important;
              }
              
              /* Timesheet container'ını tam ekran yap */
              .timesheet-container {
                position: static !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 20px !important;
                background: white !important;
              }
            }
          
          .even-row { background-color: #fafafa; }
          .odd-row { background-color: white; }
        `}</style>


    </div>
  );
};

export default TimesheetTracking; 