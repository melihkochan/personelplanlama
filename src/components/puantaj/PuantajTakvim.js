import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Card,
  Row,
  Col,
  Typography,
  message,
  Space,
  Divider,
  Alert,
  Upload,
  Input,
  DatePicker,
  Select,
  Tag,
  Tooltip,
  Modal,
  Progress,
  Statistic,
  Spin
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  SaveOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  FileExcelOutlined,
  CalendarOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CalculatorOutlined,
  BarChartOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { getTeamPersonnel, getPersonnelFromPersonnelTable, getPuantajData, getTeamShiftsByDate } from '../../services/supabase';
import { supabase } from '../../services/supabase';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/tr';

dayjs.extend(customParseFormat);
dayjs.locale('tr');

const { Title, Text } = Typography;
const { Option } = Select;

const PuantajTakvim = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [teamPersonnel, setTeamPersonnel] = useState([]);
  const [anadoluPersonnel, setAnadoluPersonnel] = useState([]);
  const [puantajData, setPuantajData] = useState([]);
  const [teamShifts, setTeamShifts] = useState({});
  const [availableDates, setAvailableDates] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Puantaj Takvim verileri yükleniyor...');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (availableDates.length > 0 && selectedDate && selectedDate.isValid()) {
      loadShifts();
    }
  }, [selectedDate, availableDates]);

  // Verileri yükle
  const loadData = async () => {
    setLoading(true);
    setInitialLoading(true);
    setLoadingProgress(0);
    setLoadingText('Puantaj Takvim verileri yükleniyor...');
    try {
      // Ekip personellerini yükle
      const teamResult = await getTeamPersonnel();
      if (teamResult.success) {
        setTeamPersonnel(teamResult.data);
      }

      // Anadolu personellerini yükle
      const anadoluResult = await getPersonnelFromPersonnelTable();
      if (anadoluResult.success) {
        setAnadoluPersonnel(anadoluResult.data);
      }

      // PuantajTakipV2'den verileri çek
      const puantajResult = await getPuantajData({}, (progress, page, pageSize, totalCount) => {
        setLoadingProgress(progress);
        setLoadingText(`Veriler ${Math.round(progress)}% yüklendi`);
      });
      if (puantajResult.success) {
        setPuantajData(puantajResult.data);
        
        // Mevcut tarihleri çıkar ve sırala (null/boş değerleri filtrele)
        const dates = [...new Set(puantajResult.data
          .map(item => item.tarih)
          .filter(tarih => tarih && tarih.trim() !== ''))]; // null ve boş string'leri filtrele
        dates.sort((a, b) => {
          const dateA = dayjs(a, 'DD.MM.YYYY');
          const dateB = dayjs(b, 'DD.MM.YYYY');
          return dateA.isBefore(dateB) ? -1 : 1;
        });
        setAvailableDates(dates);
        
        // En son tarihi otomatik seç
        if (dates.length > 0) {
          const lastDate = dayjs(dates[dates.length - 1], 'DD.MM.YYYY');
          if (lastDate.isValid()) {
            setSelectedDate(lastDate);
          }
        }
      }

    } catch (error) {
      message.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
      setInitialLoading(false);
      setLoadingProgress(100);
    }
  };

  // Ekip vardiyalarını yükle
  const loadShifts = async () => {
    try {
      const shiftsResult = await getTeamShiftsByDate(selectedDate.format('YYYY-MM-DD'));
      if (shiftsResult.success && shiftsResult.data && shiftsResult.data.length > 0) {
        const shiftData = shiftsResult.data[0];
        const shiftsMap = {};
        
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
        
        setTeamShifts(shiftsMap);
      }
    } catch (error) {
      // Vardiya yükleme hatası
    }
  };

  // Ekip bazında gruplandırılmış personel
  const groupedPersonnel = ['1.Ekip', '2.Ekip', '3.Ekip', '4.Ekip'].reduce((acc, ekip) => {
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

  // PuantajTakipV2'den gelen verileri filtrele
  const getPuantajDataForDate = (date) => {
    if (!date || !date.isValid() || !availableDates.length) return [];
    const dateStr = date.format('DD.MM.YYYY');
    return puantajData.filter(item => item.tarih === dateStr);
  };

  // Ekip personelleri için tablo sütunları
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
      render: (_, record) => {
        const puantajItem = getPuantajDataForDate(selectedDate).find(
          item => item.sicil_no === record.sicil_no
        );
        const girisTime = puantajItem?.vardiya_giris || '--:--';
        return (
          <Text style={{ fontSize: '11px', color: girisTime !== '--:--' ? '#52c41a' : '#999' }}>
            {girisTime}
          </Text>
        );
      }
    },
    {
      title: 'Çıkış',
      key: 'cikis',
      width: 90,
      render: (_, record) => {
        const puantajItem = getPuantajDataForDate(selectedDate).find(
          item => item.sicil_no === record.sicil_no
        );
        const cikisTime = puantajItem?.vardiya_cikis || '--:--';
        return (
          <Text style={{ fontSize: '11px', color: cikisTime !== '--:--' ? '#52c41a' : '#999' }}>
            {cikisTime}
          </Text>
        );
      }
    }
  ];

  // Anadolu personelleri için tablo sütunları
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
        const puantajItem = getPuantajDataForDate(selectedDate).find(
          item => item.sicil_no === record.employee_code
        );
        const girisTime = puantajItem?.vardiya_giris || '--:--';
        return (
          <Text style={{ fontSize: '11px', color: girisTime !== '--:--' ? '#52c41a' : '#999' }}>
            {girisTime}
          </Text>
        );
      }
    },
    {
      title: 'Çıkış',
      key: 'cikis',
      width: 90,
      render: (_, record) => {
        const puantajItem = getPuantajDataForDate(selectedDate).find(
          item => item.sicil_no === record.employee_code
        );
        const cikisTime = puantajItem?.vardiya_cikis || '--:--';
        return (
          <Text style={{ fontSize: '11px', color: cikisTime !== '--:--' ? '#52c41a' : '#999' }}>
            {cikisTime}
          </Text>
        );
      }
    }
  ];

  // Loading ekranı
  if (initialLoading) {
    return (
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f5f5f5', 
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Modern Loading Card */}
        <Card style={{ 
          width: '100%', 
          maxWidth: '400px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          borderRadius: '12px'
        }}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Spin size="large" />
            <Text style={{ fontSize: '16px', color: '#666', marginBottom: '20px', display: 'block' }}>
              {loadingText}
            </Text>
            <Progress 
              percent={loadingProgress} 
              status="active" 
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#52c41a',
              }}
              showInfo={true} 
              size={6} 
              format={(percent) => `${Math.round(percent)}%`} 
              style={{ maxWidth: '400px', margin: '0 auto' }}
            />
          </div>
        </Card>

        {/* CSS Animation */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Başlık */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '20px',
        borderBottom: '2px solid #000',
        paddingBottom: '10px'
      }}>
        <Title level={3} style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
          Puantaj Takvim
        </Title>
        
        {/* Modern Tarih Navigasyonu */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: '15px',
          marginTop: '20px',
          marginBottom: '15px'
        }}>
          <Button
            type="default"
            icon={<CalendarOutlined />}
            onClick={() => {
              if (selectedDate) {
                const currentIndex = availableDates.indexOf(selectedDate.format('DD.MM.YYYY'));
                if (currentIndex > 0) {
                  setSelectedDate(dayjs(availableDates[currentIndex - 1], 'DD.MM.YYYY'));
                }
              }
            }}
            disabled={!selectedDate || availableDates.indexOf(selectedDate?.format('DD.MM.YYYY')) <= 0}
            style={{ 
              fontSize: '14px',
              height: '40px',
              width: '40px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            &lt;
          </Button>
          
                     <div 
             style={{
               backgroundColor: 'white',
               padding: '12px 24px',
               borderRadius: '12px',
               border: '2px solid #e6f7ff',
               fontWeight: 'bold',
               fontSize: '16px',
               minWidth: '140px',
               textAlign: 'center',
               boxShadow: '0 4px 12px rgba(24, 144, 255, 0.15)',
               color: '#1890ff',
               cursor: availableDates.length > 0 ? 'pointer' : 'not-allowed',
               transition: 'all 0.3s ease',
               opacity: availableDates.length > 0 ? 1 : 0.6
             }}
             onClick={() => availableDates.length > 0 && setShowDatePicker(!showDatePicker)}
             onMouseEnter={(e) => {
               if (availableDates.length > 0) {
                 e.target.style.boxShadow = '0 6px 16px rgba(24, 144, 255, 0.25)';
                 e.target.style.transform = 'translateY(-1px)';
               }
             }}
             onMouseLeave={(e) => {
               e.target.style.boxShadow = '0 4px 12px rgba(24, 144, 255, 0.15)';
               e.target.style.transform = 'translateY(0)';
             }}
           >
             {selectedDate && selectedDate.isValid() ? selectedDate.format('DD.MM.YYYY') : (availableDates.length > 0 ? `Son veri: ${availableDates[availableDates.length - 1]}` : 'Puantaj Takvim verileri yükleniyor...')}
           </div>
          
          <Button
            type="default"
            icon={<CalendarOutlined />}
            onClick={() => {
              if (selectedDate) {
                const currentIndex = availableDates.indexOf(selectedDate.format('DD.MM.YYYY'));
                if (currentIndex < availableDates.length - 1) {
                  setSelectedDate(dayjs(availableDates[currentIndex + 1], 'DD.MM.YYYY'));
                }
              }
            }}
            disabled={!selectedDate || availableDates.indexOf(selectedDate?.format('DD.MM.YYYY')) >= availableDates.length - 1}
            style={{ 
              fontSize: '14px',
              height: '40px',
              width: '40px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            &gt;
          </Button>
        </div>
        
                 {/* Modern Tarih Seçici */}
         {showDatePicker && availableDates.length > 0 && (
           <div style={{
             display: 'flex',
             justifyContent: 'center',
             marginBottom: '15px',
             position: 'relative',
             zIndex: 1000
           }}>
             <div style={{
               backgroundColor: 'white',
               padding: '16px',
               borderRadius: '12px',
               boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
               border: '1px solid #e6f7ff',
               maxHeight: '300px',
               overflowY: 'auto'
             }}>
               {/* Ay Grupları */}
               {(() => {
                 const monthGroups = {};
                 availableDates.forEach(dateStr => {
                   const date = dayjs(dateStr, 'DD.MM.YYYY');
                   if (date.isValid()) {
                     const monthKey = date.format('MMMM YYYY');
                     if (!monthGroups[monthKey]) {
                       monthGroups[monthKey] = [];
                     }
                     monthGroups[monthKey].push(dateStr);
                   }
                 });

                 return Object.entries(monthGroups).map(([monthKey, dates]) => (
                   <div key={monthKey} style={{ marginBottom: '16px' }}>
                     <div style={{
                       fontSize: '14px',
                       fontWeight: 'bold',
                       color: '#1890ff',
                       marginBottom: '8px',
                       padding: '4px 0',
                       borderBottom: '1px solid #e6f7ff'
                     }}>
                       {monthKey}
                     </div>
                     <div style={{
                       display: 'grid',
                       gridTemplateColumns: 'repeat(7, 1fr)',
                       gap: '4px',
                       maxWidth: '350px'
                     }}>
                       {dates.map((dateStr, index) => {
                         const date = dayjs(dateStr, 'DD.MM.YYYY');
                         const isSelected = selectedDate && selectedDate.isValid() && selectedDate.format('DD.MM.YYYY') === dateStr;
                         return (
                           <div
                             key={index}
                             style={{
                               padding: '6px 4px',
                               borderRadius: '6px',
                               backgroundColor: isSelected ? '#1890ff' : '#f8f9fa',
                               color: isSelected ? 'white' : '#666',
                               cursor: 'pointer',
                               fontSize: '11px',
                               fontWeight: '500',
                               border: isSelected ? '2px solid #1890ff' : '1px solid #e8e8e8',
                               transition: 'all 0.2s ease',
                               textAlign: 'center',
                               minHeight: '32px',
                               display: 'flex',
                               flexDirection: 'column',
                               justifyContent: 'center',
                               alignItems: 'center'
                             }}
                             onClick={() => {
                               if (date.isValid()) {
                                 setSelectedDate(date);
                                 setShowDatePicker(false);
                               }
                             }}
                             onMouseEnter={(e) => {
                               if (!isSelected) {
                                 e.target.style.backgroundColor = '#e6f7ff';
                                 e.target.style.borderColor = '#1890ff';
                               }
                             }}
                             onMouseLeave={(e) => {
                               if (!isSelected) {
                                 e.target.style.backgroundColor = '#f8f9fa';
                                 e.target.style.borderColor = '#e8e8e8';
                               }
                             }}
                           >
                             <div style={{ fontSize: '10px', fontWeight: 'bold' }}>
                               {date.isValid() ? date.format('DD') : '--'}
                             </div>
                             <div style={{ 
                               fontSize: '8px', 
                               opacity: 0.7,
                               textTransform: 'uppercase'
                             }}>
                               {date.isValid() ? date.format('ddd') : '---'}
                             </div>
                           </div>
                         );
                       })}
                     </div>
                   </div>
                 ));
               })()}
             </div>
           </div>
         )}
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          marginTop: '15px'
        }}>
                     <Text type="secondary" style={{ fontSize: '13px', color: '#666' }}>
             {selectedDate && selectedDate.isValid() ? selectedDate.format('dddd') : (availableDates.length > 0 ? 'Son veri seçiliyor...' : 'Puantaj Takvim verileri yükleniyor...')}
           </Text>
          <div style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            backgroundColor: '#52c41a'
          }}></div>
          <Text type="secondary" style={{ fontSize: '13px', color: '#666' }}>
            Puantaj Takip'den saat verileri çekiliyor
          </Text>
        </div>
      </div>

      {/* Ana İçerik */}
      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Sol Taraf - Ekipler */}
        <div style={{ flex: 1 }}>
          {['1.Ekip', '2.Ekip', '3.Ekip', '4.Ekip'].map(ekip => {
            const isLeaveTeam = teamShifts[ekip] && teamShifts[ekip].leave_shift;
            
            return (
              <Card key={ekip} style={{ marginBottom: '20px' }}>
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
                  <span>{ekip}</span>
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
                  size="small"
                  pagination={false}
                  loading={loading}
                  scroll={{ x: 600 }}
                />
              </Card>
            );
          })}
        </div>

        {/* Sağ Taraf - Anadolu Personelleri */}
        <div style={{ flex: 1 }}>
          <Card>
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
              dataSource={anadoluPersonnel}
              rowKey="id"
              size="small"
              pagination={false}
              loading={loading}
              scroll={{ x: 600 }}
            />
          </Card>
        </div>
      </div>

      {/* CSS Stilleri */}
      <style>{`
        .ant-table-thead > tr > th {
          background-color: #f0f2f5;
          font-weight: 600;
          font-size: 11px;
        }
        
        .ant-table-tbody > tr > td {
          font-size: 11px;
          padding: 8px;
        }
        
        .ant-table-tbody > tr:hover > td {
          background-color: #e6f7ff;
        }
      `}</style>
    </div>
  );
};

export default PuantajTakvim; 