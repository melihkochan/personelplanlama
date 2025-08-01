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
  Modal
} from 'antd';
import {
  SaveOutlined,
  LeftOutlined,
  RightOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { getTeamPersonnel, getPersonnelFromPersonnelTable, getTimesheetData, saveTimesheetData, updateTimesheetData, getTeamShiftsByDate, getAnadoluPersonnelShifts } from '../../services/supabase';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const { Title, Text } = Typography;

const TimesheetTracking = () => {
  const [teamPersonnel, setTeamPersonnel] = useState([]);
  const [anadoluPersonnel, setAnadoluPersonnel] = useState([]);
  const [timesheetData, setTimesheetData] = useState({});
  const [anadoluTimesheetData, setAnadoluTimesheetData] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [teamShifts, setTeamShifts] = useState({});
  const [anadoluShifts, setAnadoluShifts] = useState({});
  const [approvedPersonnel, setApprovedPersonnel] = useState(new Set());
  const [showOvertimeInputs, setShowOvertimeInputs] = useState(new Set());
  const [showOvertimeForPerson, setShowOvertimeForPerson] = useState(new Set());
  const [overtimeModalVisible, setOvertimeModalVisible] = useState(false);
  const [selectedPersonnelForOvertime, setSelectedPersonnelForOvertime] = useState(null);

  const ekipOptions = ['1.Ekip', '2.Ekip', '3.Ekip', '4.Ekip'];

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  // timesheetData değiştiğinde debug için
  useEffect(() => {
    console.log('timesheetData güncellendi:', timesheetData);
  }, [timesheetData]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [teamResult, anadoluResult, timesheetResult, shiftsResult, anadoluShiftsResult] = await Promise.all([
        getTeamPersonnel(),
        getPersonnelFromPersonnelTable(),
        getTimesheetData(selectedDate.format('YYYY-MM-DD')),
        getTeamShiftsByDate(selectedDate.format('YYYY-MM-DD')),
        getAnadoluPersonnelShifts(selectedDate.format('YYYY-MM-DD'))
      ]);
      
      // Ekip personellerini yükle
      if (teamResult.success) {
        setTeamPersonnel(teamResult.data);
      }
      
      // Anadolu personellerini yükle
      if (anadoluResult.success) {
        console.log('Anadolu personel verileri yüklendi:', anadoluResult.data.length, 'kayıt');
        console.log('Anadolu personel örnekleri:', anadoluResult.data.slice(0, 3));
        setAnadoluPersonnel(anadoluResult.data);
      }

      // Vardiya verilerini yükle ve işle
      let shiftsMap = {};
      if (shiftsResult.success && shiftsResult.data && shiftsResult.data.length > 0) {
        const shiftData = shiftsResult.data[0];
        console.log('Yüklenen vardiya verisi:', shiftData);
        
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
        
        console.log('Oluşturulan vardiya map:', shiftsMap);
      } else {
        console.log('Bu tarih için vardiya verisi bulunamadı:', selectedDate.format('YYYY-MM-DD'));
      }
      setTeamShifts(shiftsMap);

      // Anadolu vardiya verilerini işle
      let anadoluShiftsMap = {};
      console.log('Anadolu vardiya sonucu:', anadoluShiftsResult);
      if (anadoluShiftsResult.success && anadoluShiftsResult.data.length > 0) {
        console.log('Anadolu vardiya verileri:', anadoluShiftsResult.data);
        anadoluShiftsResult.data.forEach(shift => {
          const person = anadoluResult.data.find(p => p.employee_code === shift.employee_code);
          if (person) {
            anadoluShiftsMap[person.id] = shift.shift_type;
            console.log(`Anadolu personel ${person.full_name} (${person.id}) - employee_code: ${shift.employee_code} - shift_type: ${shift.shift_type}`);
          } else {
            console.log(`Anadolu personel bulunamadı - employee_code: ${shift.employee_code}`);
          }
        });
        console.log('Anadolu vardiya tipleri:', anadoluShiftsMap);
      } else {
        console.log('Anadolu vardiya verisi bulunamadı veya boş');
      }
      setAnadoluShifts(anadoluShiftsMap);

      // Veritabanından timesheet verilerini yükle
      const timesheetMap = {};
      const anadoluTimesheetMap = {};
      
      if (timesheetResult.success && timesheetResult.data.length > 0) {
        timesheetResult.data.forEach(record => {
          if (record.personnel_type === 'team') {
            // Ekip personeli
            timesheetMap[record.personnel_id] = {
              giris: record.giris ? dayjs(record.giris) : null,
              cikis: record.cikis ? dayjs(record.cikis) : null
            };
          } else if (record.personnel_type === 'anadolu') {
            // Anadolu personeli
            anadoluTimesheetMap[record.personnel_id] = {
              giris: record.giris ? dayjs(record.giris) : null,
              cikis: record.cikis ? dayjs(record.cikis) : null
            };
          }
        });
      }

      // Ekip personelleri için otomatik saat doldurma
      const teamAutoFillData = {};
      if (teamResult.success) {
        console.log('Ekip personelleri yükleniyor:', teamResult.data.length);
        teamResult.data.forEach(person => {
          const teamName = person.ekip_bilgisi;
          const teamShiftData = shiftsMap[teamName];
          
          console.log(`Personel ${person.adi_soyadi} (${person.id}) - Ekip: ${teamName}`);
          console.log(`Vardiya verisi:`, teamShiftData);
          
          let giris = null, cikis = null;
          
          if (teamShiftData) {
            if (teamShiftData.shift_24_08) {
              giris = dayjs('00:00', 'HH:mm');
              cikis = dayjs('08:00', 'HH:mm');
              console.log(`24-08 vardiyası: ${giris.format('HH:mm')} - ${cikis.format('HH:mm')}`);
            } else if (teamShiftData.shift_08_16) {
              giris = dayjs('08:00', 'HH:mm');
              cikis = dayjs('16:00', 'HH:mm');
              console.log(`08-16 vardiyası: ${giris.format('HH:mm')} - ${cikis.format('HH:mm')}`);
            } else if (teamShiftData.shift_16_24) {
              giris = dayjs('16:00', 'HH:mm');
              cikis = dayjs('00:00', 'HH:mm'); // 16-24 vardiyası için 00:00 (ertesi gün)
              console.log(`16-24 vardiyası: ${giris.format('HH:mm')} - ${cikis.format('HH:mm')}`);
            } else if (teamShiftData.leave_shift) {
              // İzinli vardiya için boş bırak
              giris = null;
              cikis = null;
              console.log(`İzinli vardiya: boş bırakıldı`);
            }
          } else {
            // Vardiya verisi yoksa varsayılan saatler
            giris = dayjs('08:00', 'HH:mm');
            cikis = dayjs('17:00', 'HH:mm');
            console.log(`Vardiya verisi yok, varsayılan: ${giris.format('HH:mm')} - ${cikis.format('HH:mm')}`);
          }
          
          // Veritabanından gelen veri varsa onu kullan, yoksa otomatik doldurulan veriyi kullan
          const existingData = timesheetMap[person.id];
          console.log(`Mevcut veri:`, existingData);
          
          const finalGiris = existingData?.giris || giris;
          const finalCikis = existingData?.cikis || cikis;
          
          teamAutoFillData[person.id] = {
            giris: finalGiris,
            cikis: finalCikis
          };
          
          console.log(`Final saatler: ${finalGiris ? finalGiris.format('HH:mm') : 'null'} - ${finalCikis ? finalCikis.format('HH:mm') : 'null'}`);
          console.log(`Final giris objesi:`, finalGiris);
          console.log(`Final cikis objesi:`, finalCikis);
        });
      }

      // Anadolu personelleri için otomatik saat doldurma
      const anadoluAutoFillData = {};
      if (anadoluResult.success) {
        console.log('Anadolu personelleri yükleniyor:', anadoluResult.data.length);
        console.log('Anadolu vardiya map:', anadoluShiftsMap);
        anadoluResult.data.forEach(person => {
          const shiftType = anadoluShiftsMap[person.id];
          console.log(`Anadolu personel ${person.full_name} (${person.id}) - employee_code: ${person.employee_code} - Vardiya tipi: ${shiftType}`);
          
          let giris = null, cikis = null;
          
          if (shiftType) {
            switch (shiftType) {
              case 'gece':
                giris = dayjs('22:00', 'HH:mm');
                cikis = dayjs('06:00', 'HH:mm'); // Gece vardiyası için 06:00 (ertesi gün)
                console.log(`Gece vardiyası: ${giris.format('HH:mm')} - ${cikis.format('HH:mm')}`);
                break;
              case 'gunduz':
                giris = dayjs('08:00', 'HH:mm');
                cikis = dayjs('16:00', 'HH:mm');
                console.log(`Gündüz vardiyası: ${giris.format('HH:mm')} - ${cikis.format('HH:mm')}`);
                break;
              case 'raporlu':
              case 'yillik_izin':
                giris = null;
                cikis = null;
                console.log(`${shiftType}: boş bırakıldı`);
                break;
              default:
                // Pozisyona göre varsayılan saatler
                if (person.position === 'SEVKİYAT ELEMANI') {
                  giris = dayjs('08:00', 'HH:mm');
                  cikis = dayjs('17:00', 'HH:mm');
                } else if (person.position === 'ŞOFÖR') {
                  giris = dayjs('07:00', 'HH:mm');
                  cikis = dayjs('16:00', 'HH:mm');
                } else {
                  giris = dayjs('08:00', 'HH:mm');
                  cikis = dayjs('17:00', 'HH:mm');
                }
                console.log(`Varsayılan saatler (${person.position}): ${giris.format('HH:mm')} - ${cikis.format('HH:mm')}`);
                break;
            }
          } else {
            // Vardiya verisi yoksa pozisyona göre varsayılan saatler
            if (person.position === 'SEVKİYAT ELEMANI') {
              giris = dayjs('08:00', 'HH:mm');
              cikis = dayjs('17:00', 'HH:mm');
            } else if (person.position === 'ŞOFÖR') {
              giris = dayjs('07:00', 'HH:mm');
              cikis = dayjs('16:00', 'HH:mm');
            } else {
              giris = dayjs('08:00', 'HH:mm');
              cikis = dayjs('17:00', 'HH:mm');
            }
            console.log(`Vardiya verisi yok, varsayılan (${person.position}): ${giris.format('HH:mm')} - ${cikis.format('HH:mm')}`);
          }
          
          // Veritabanından gelen veri varsa onu kullan, yoksa otomatik doldurulan veriyi kullan
          const existingData = anadoluTimesheetMap[person.id];
          console.log(`Anadolu mevcut veri:`, existingData);
          
          const finalGiris = existingData?.giris || giris;
          const finalCikis = existingData?.cikis || cikis;
          
          anadoluAutoFillData[person.id] = {
            giris: finalGiris,
            cikis: finalCikis
          };
          
          console.log(`Anadolu final saatler: ${finalGiris ? finalGiris.format('HH:mm') : 'null'} - ${finalCikis ? finalCikis.format('HH:mm') : 'null'}`);
          console.log(`Anadolu final giris objesi:`, finalGiris);
          console.log(`Anadolu final cikis objesi:`, finalCikis);
        });
      }

      // State'leri güncelle
      console.log('State güncelleniyor...');
      console.log('Ekip otomatik doldurulan saatler:', teamAutoFillData);
      console.log('Anadolu otomatik doldurulan saatler:', anadoluAutoFillData);
      
      setTimesheetData(teamAutoFillData);
      setAnadoluTimesheetData(anadoluAutoFillData);
      
      console.log('State güncelleme tamamlandı');
      
    } catch (error) {
      console.error('Error loading data:', error);
      message.error('Veriler yüklenirken hata oluştu');
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
    // 4 haneli sayı girildiğinde (örn: 2200) otomatik formatla (22:00)
    if (value.length === 4 && /^\d{4}$/.test(value)) {
      const hours = value.substring(0, 2);
      const minutes = value.substring(2, 4);
      
      // Saat ve dakika kontrolü
      if (parseInt(hours) >= 0 && parseInt(hours) <= 23 && 
          parseInt(minutes) >= 0 && parseInt(minutes) <= 59) {
        const time = dayjs(`${hours}:${minutes}`, 'HH:mm');
        
        if (time.isValid()) {
          setTimesheetData(prev => ({
            ...prev,
            [personId]: {
              ...prev[personId],
              [field]: time
            }
          }));
          return;
        }
      }
    }
    
    // Geçerli bir saat formatı değilse, sadece string olarak sakla
    setTimesheetData(prev => ({
      ...prev,
      [personId]: {
        ...prev[personId],
        [field]: value
      }
    }));
  };

  const handleAnadoluTimeInput = (personId, field, value) => {
    // 4 haneli sayı girildiğinde (örn: 2200) otomatik formatla (22:00)
    if (value.length === 4 && /^\d{4}$/.test(value)) {
      const hours = value.substring(0, 2);
      const minutes = value.substring(2, 4);
      
      // Saat ve dakika kontrolü
      if (parseInt(hours) >= 0 && parseInt(hours) <= 23 && 
          parseInt(minutes) >= 0 && parseInt(minutes) <= 59) {
        const time = dayjs(`${hours}:${minutes}`, 'HH:mm');
        
        if (time.isValid()) {
          setAnadoluTimesheetData(prev => ({
            ...prev,
            [personId]: {
              ...prev[personId],
              [field]: time
            }
          }));
          return;
        }
      }
    }
    
    // Geçerli bir saat formatı değilse, sadece string olarak sakla
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
      const date = selectedDate.format('YYYY-MM-DD');
      const savePromises = [];

      // Sadece onaylanmış ekip personeli verilerini kaydet
      Object.keys(timesheetData).forEach(personId => {
        const data = timesheetData[personId];
        const isApproved = approvedPersonnel.has(personId);
        
        if (isApproved && (data.giris || data.cikis)) {
          savePromises.push(
            saveTimesheetData({
              date: date,
              personnel_id: personId,
              personnel_type: 'team',
              giris: data.giris ? data.giris.format('HH:mm:ss') : null,
              cikis: data.cikis ? data.cikis.format('HH:mm:ss') : null,
              approved: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          );
        }
      });

      // Sadece onaylanmış Anadolu personeli verilerini kaydet (izinli olanlar hariç)
      Object.keys(anadoluTimesheetData).forEach(personId => {
        const data = anadoluTimesheetData[personId];
        const isApproved = approvedPersonnel.has(personId);
        const shiftType = anadoluShifts[personId];
        
        // İzinli olanları kaydetme
        if (shiftType === 'raporlu' || shiftType === 'yillik_izin') {
          return;
        }
        
        if (isApproved && (data.giris || data.cikis)) {
          savePromises.push(
            saveTimesheetData({
              date: date,
              personnel_id: personId,
              personnel_type: 'anadolu',
              giris: data.giris ? data.giris.format('HH:mm:ss') : null,
              cikis: data.cikis ? data.cikis.format('HH:mm:ss') : null,
              approved: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          );
        }
      });

      if (savePromises.length > 0) {
        await Promise.all(savePromises);
        message.success(`${savePromises.length} adet onaylanmış puantaj verisi başarıyla kaydedildi`);
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
    setSelectedDate(prev => prev.add(1, 'day'));
  };

  const handleApprove = (personId) => {
    // Personelin ekip bilgisini bul
    const person = teamPersonnel.find(p => p.id === personId);
    if (!person) {
      message.error('Personel bulunamadı');
      return;
    }

    const teamName = person.ekip_bilgisi;
    console.log('Onay butonuna tıklandı - Personel:', person.adi_soyadi, 'Ekip:', teamName);
    
    // Onay durumunu güncelle
    setApprovedPersonnel(prev => new Set([...prev, personId]));
    
    message.success(`${person.adi_soyadi} onaylandı`);
  };

  const handleAnadoluApprove = (personId) => {
    // Anadolu personeli için pozisyona göre saatler
    const person = anadoluPersonnel.find(p => p.id === personId);
    if (!person) {
      message.error('Personel bulunamadı');
      return;
    }
    
    // Onay durumunu güncelle
    setApprovedPersonnel(prev => new Set([...prev, personId]));
    
    const position = person?.position || 'Personel';
    message.success(`${position} onaylandı`);
  };

  const handleBulkApprove = () => {
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
    message.success('Tüm personeller onaylandı!');
  };

  const handleBulkUnapprove = () => {
    // Tüm onayları kaldır
    setApprovedPersonnel(new Set());
    message.success('Tüm onaylar kaldırıldı!');
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
                     borderRadius: '4px'
                   }}
                   onClick={() => {
                     setSelectedPersonnelForOvertime(record);
                     setOvertimeModalVisible(true);
                   }}
                 >
                   Mesai Bilgisi Gir
                 </Button>
               </div>
             );
           }
          
          return (
            <Input
              size="small"
              style={{ width: '70px', fontSize: '11px', color: '#000000' }}
              value={(() => {
                const girisData = timesheetData[record.id]?.giris;
                console.log(`Giriş render - Personel ${record.adi_soyadi} (${record.id}):`, girisData);
                
                if (!girisData) {
                  console.log('Giriş verisi yok');
                  return '';
                }
                
                if (typeof girisData === 'string') {
                  console.log('Giriş string:', girisData);
                  return girisData;
                }
                
                if (girisData && typeof girisData.format === 'function' && girisData.isValid()) {
                  const formatted = girisData.format('HH:mm');
                  console.log('Giriş formatlanmış:', formatted);
                  return formatted;
                }
                
                console.log('Giriş geçersiz format');
                return '';
              })()}
              onChange={(e) => handleTimeInput(record.id, 'giris', e.target.value)}
              placeholder="--:--"
              maxLength={4}
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
               style={{ width: '70px', fontSize: '11px', color: '#000000' }}
               value={(() => {
                 const cikisData = timesheetData[record.id]?.cikis;
                 console.log(`Çıkış render - Personel ${record.adi_soyadi} (${record.id}):`, cikisData);
                 
                 if (!cikisData) {
                   console.log('Çıkış verisi yok');
                   return '';
                 }
                 
                 if (typeof cikisData === 'string') {
                   console.log('Çıkış string:', cikisData);
                   return cikisData;
                 }
                 
                 if (cikisData && typeof cikisData.format === 'function' && cikisData.isValid()) {
                   const formatted = cikisData.format('HH:mm');
                   console.log('Çıkış formatlanmış:', formatted);
                   return formatted;
                 }
                 
                 console.log('Çıkış geçersiz format');
                 return '';
               })()}
               onChange={(e) => handleTimeInput(record.id, 'cikis', e.target.value)}
               placeholder="--:--"
               maxLength={4}
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
           
           return isApproved ? (
             <div style={{
               backgroundColor: '#52c41a',
               color: 'white',
               padding: '2px 6px',
               borderRadius: '3px',
               fontSize: '8px',
               textAlign: 'center',
               fontWeight: 'bold'
             }}>
               ✓ Onaylandı
             </div>
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
                backgroundColor: '#faad14',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '10px',
                textAlign: 'center',
                fontWeight: 'bold',
                width: '70px'
              }}>
                {shiftType === 'raporlu' ? 'R' : 'Y.İ'}
              </div>
            );
          }
          
          return (
            <Input
              size="small"
              style={{ width: '70px', fontSize: '11px', color: '#000000' }}
              value={(() => {
                const girisData = anadoluTimesheetData[record.id]?.giris;
                console.log(`Anadolu Giriş render - Personel ${record.full_name} (${record.id}):`, girisData);
                
                if (!girisData) {
                  console.log('Anadolu Giriş verisi yok');
                  return '';
                }
                
                if (typeof girisData === 'string') {
                  console.log('Anadolu Giriş string:', girisData);
                  return girisData;
                }
                
                if (girisData && typeof girisData.format === 'function' && girisData.isValid()) {
                  const formatted = girisData.format('HH:mm');
                  console.log('Anadolu Giriş formatlanmış:', formatted);
                  return formatted;
                }
                
                console.log('Anadolu Giriş geçersiz format');
                return '';
              })()}
              onChange={(e) => handleAnadoluTimeInput(record.id, 'giris', e.target.value)}
              placeholder="--:--"
              maxLength={4}
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
                backgroundColor: '#faad14',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '10px',
                textAlign: 'center',
                fontWeight: 'bold',
                width: '70px'
              }}>
                {shiftType === 'raporlu' ? 'R' : 'Y.İ'}
              </div>
            );
          }
          
          return (
            <Input
              size="small"
              style={{ width: '70px', fontSize: '11px', color: '#000000' }}
              value={(() => {
                const cikisData = anadoluTimesheetData[record.id]?.cikis;
                console.log(`Anadolu Çıkış render - Personel ${record.full_name} (${record.id}):`, cikisData);
                
                if (!cikisData) {
                  console.log('Anadolu Çıkış verisi yok');
                  return '';
                }
                
                if (typeof cikisData === 'string') {
                  console.log('Anadolu Çıkış string:', cikisData);
                  return cikisData;
                }
                
                if (cikisData && typeof cikisData.format === 'function' && cikisData.isValid()) {
                  const formatted = cikisData.format('HH:mm');
                  console.log('Anadolu Çıkış formatlanmış:', formatted);
                  return formatted;
                }
                
                console.log('Anadolu Çıkış geçersiz format');
                return '';
              })()}
              onChange={(e) => handleAnadoluTimeInput(record.id, 'cikis', e.target.value)}
              placeholder="--:--"
              maxLength={4}
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
          
          // Eğer personel izinli ise ve mesai bilgisi girilmemişse onay butonu gösterilmez
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
                  minWidth: '30px'
                }}
                onClick={() => {
                  setSelectedPersonnelForOvertime(record);
                  setOvertimeModalVisible(true);
                }}
              >
                +
              </Button>
            );
          }
          
          return isApproved ? (
            <div style={{
              backgroundColor: '#52c41a',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '8px',
              textAlign: 'center',
              fontWeight: 'bold'
            }}>
              ✓ Onaylandı
            </div>
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
               {selectedDate.format('DD.MM.YYYY')}
             </Text>
             <Button
               type="text"
               icon={<RightOutlined />}
               onClick={handleNextDay}
               size="small"
               style={{ fontSize: '16px' }}
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
                       </div>
                       {/* Vardiya Bilgisi */}
                       {teamShifts[ekip] && (
                         <div style={{ display: 'flex', gap: '4px' }}>
                           {teamShifts[ekip].leave_shift && (
                             <div style={{
                               backgroundColor: '#faad14',
                               color: 'white',
                               padding: '2px 6px',
                               borderRadius: '3px',
                               fontSize: '10px',
                               fontWeight: '500'
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
                borderRadius: '4px'
              }}>
                Anadolu Personelleri
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
                     <Text strong>Tarih:</Text> {selectedDate.format('DD.MM.YYYY')}
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
          <Button
            type="default"
            icon={<CheckOutlined />}
            onClick={handleBulkApprove}
            size="large"
          >
            Toplu Onay
          </Button>
          <Button
            type="default"
            danger
            onClick={handleBulkUnapprove}
            size="large"
          >
            Onay Kaldır
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={loading}
            size="large"
          >
            Kaydet
          </Button>
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

        {/* Mesai Bilgisi Modal */}
        <Modal
          title={`Mesai Bilgisi - ${selectedPersonnelForOvertime?.adi_soyadi || selectedPersonnelForOvertime?.full_name || 'Personel'}`}
          open={overtimeModalVisible}
          onOk={() => {
            setOvertimeModalVisible(false);
            setSelectedPersonnelForOvertime(null);
            if (selectedPersonnelForOvertime) {
              setShowOvertimeForPerson(prev => new Set([...prev, selectedPersonnelForOvertime.id]));
            }
          }}
          onCancel={() => {
            setOvertimeModalVisible(false);
            setSelectedPersonnelForOvertime(null);
          }}
          okText="Tamam"
          cancelText="İptal"
          width={400}
        >
          <div style={{ padding: '20px 0' }}>
            <div style={{ marginBottom: '20px' }}>
              <Text strong>Giriş Saati:</Text>
              <TimePicker
                format="HH:mm"
                placeholder="Giriş saati seçin"
                style={{ width: '100%', marginTop: '8px' }}
                onChange={(time) => {
                  if (selectedPersonnelForOvertime) {
                    const personId = selectedPersonnelForOvertime.id;
                    // Ekip personeli mi Anadolu personeli mi kontrol et
                    const isAnadoluPersonnel = selectedPersonnelForOvertime.full_name;
                    if (isAnadoluPersonnel) {
                      setAnadoluTimesheetData(prev => ({
                        ...prev,
                        [personId]: {
                          ...prev[personId],
                          giris: time
                        }
                      }));
                    } else {
                      setTimesheetData(prev => ({
                        ...prev,
                        [personId]: {
                          ...prev[personId],
                          giris: time
                        }
                      }));
                    }
                  }
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <Text strong>Çıkış Saati:</Text>
              <TimePicker
                format="HH:mm"
                placeholder="Çıkış saati seçin"
                style={{ width: '100%', marginTop: '8px' }}
                onChange={(time) => {
                  if (selectedPersonnelForOvertime) {
                    const personId = selectedPersonnelForOvertime.id;
                    // Ekip personeli mi Anadolu personeli mi kontrol et
                    const isAnadoluPersonnel = selectedPersonnelForOvertime.full_name;
                    if (isAnadoluPersonnel) {
                      setAnadoluTimesheetData(prev => ({
                        ...prev,
                        [personId]: {
                          ...prev[personId],
                          cikis: time
                        }
                      }));
                    } else {
                      setTimesheetData(prev => ({
                        ...prev,
                        [personId]: {
                          ...prev[personId],
                          cikis: time
                        }
                      }));
                    }
                  }
                }}
              />
            </div>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <Text type="secondary">
                Saatleri seçtikten sonra "Tamam" butonuna tıklayın.
              </Text>
            </div>
          </div>
        </Modal>
      </div>
    );
  };

export default TimesheetTracking; 