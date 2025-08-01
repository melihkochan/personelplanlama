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
  PrinterOutlined,
  UserOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  FullscreenOutlined,
  CrownOutlined,
  SettingOutlined,
  ToolOutlined,
  CarOutlined,
  UserSwitchOutlined,
  SafetyOutlined,
  BuildOutlined,
  AuditOutlined
} from '@ant-design/icons';
import { getTeamPersonnel, getPersonnelFromPersonnelTable } from '../../services/supabase';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const TimesheetTracking = () => {
  const [teamPersonnel, setTeamPersonnel] = useState([]);
  const [anadoluPersonnel, setAnadoluPersonnel] = useState([]);
  const [timesheetData, setTimesheetData] = useState({});
  const [anadoluTimesheetData, setAnadoluTimesheetData] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [expandedTeam, setExpandedTeam] = useState(null);

  const ekipOptions = ['1.Ekip', '2.Ekip', '3.Ekip', '4.Ekip'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [teamResult, anadoluResult] = await Promise.all([
        getTeamPersonnel(),
        getPersonnelFromPersonnelTable()
      ]);
      
      if (teamResult.success) {
        setTeamPersonnel(teamResult.data);
        // Başlangıç timesheet verilerini oluştur
        const initialData = {};
        teamResult.data.forEach(person => {
          initialData[person.id] = {
            giris: null,
            cikis: null
          };
        });
        setTimesheetData(initialData);
      }
      
      if (anadoluResult.success) {
        setAnadoluPersonnel(anadoluResult.data);
        // Anadolu personelleri için başlangıç verilerini oluştur
        const initialAnadoluData = {};
        anadoluResult.data.forEach(person => {
          initialAnadoluData[person.id] = {
            giris: null,
            cikis: null
          };
        });
        setAnadoluTimesheetData(initialAnadoluData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      message.error('Veriler yüklenirken hata oluştu');
    }
    setLoading(false);
  };

  // Ekip bazında gruplandırılmış personel
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
      // Burada veritabanına kaydetme işlemi yapılacak
      message.success('Puantaj verileri başarıyla kaydedildi');
    } catch (error) {
      console.error('Error saving timesheet:', error);
      message.error('Veriler kaydedilirken hata oluştu');
    }
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleTeamExpand = (team) => {
    setExpandedTeam(expandedTeam === team ? null : team);
  };

  const getPositionIcon = (position) => {
    switch (position) {
      case 'Vardiya Amiri':
        return <CrownOutlined style={{ fontSize: '10px', color: '#fa8c16' }} />;
      case 'Ekip Lideri':
        return <UserSwitchOutlined style={{ fontSize: '10px', color: '#1890ff' }} />;
      case 'Sistem Operatörü':
        return <SettingOutlined style={{ fontSize: '10px', color: '#722ed1' }} />;
      case 'Sistem Operatör Yrd.':
        return <SettingOutlined style={{ fontSize: '10px', color: '#722ed1' }} />;
      case 'Sevkiyat Sorumlusu':
        return <SafetyOutlined style={{ fontSize: '10px', color: '#52c41a' }} />;
      case 'Sevkiyat Veri Giriş Elemanı':
        return <BuildOutlined style={{ fontSize: '10px', color: '#13c2c2' }} />;
      case 'Makine Operatörü':
        return <ToolOutlined style={{ fontSize: '10px', color: '#fa541c' }} />;
      case 'Sevkiyat Elemanı':
        return <CarOutlined style={{ fontSize: '10px', color: '#1890ff' }} />;
      case 'Sevkiyat Elemanı ( Load Audit)':
        return <AuditOutlined style={{ fontSize: '10px', color: '#eb2f96' }} />;
      default:
        return <UserOutlined style={{ fontSize: '10px', color: '#8c8c8c' }} />;
    }
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
      render: (_, record) => (
        <TimePicker
          format="HH:mm"
          size="small"
          style={{ width: '70px', fontSize: '11px' }}
          value={timesheetData[record.id]?.giris}
          onChange={(time) => handleTimeChange(record.id, 'giris', time)}
          placeholder="--:--"
        />
      )
    },
    {
      title: 'Çıkış',
      key: 'cikis',
      width: 90,
      render: (_, record) => (
        <TimePicker
          format="HH:mm"
          size="small"
          style={{ width: '70px', fontSize: '11px' }}
          value={timesheetData[record.id]?.cikis}
          onChange={(time) => handleTimeChange(record.id, 'cikis', time)}
          placeholder="--:--"
        />
      )
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
      render: (text) => <Text style={{ fontSize: '11px' }}>{text}</Text>
    },
    {
      title: 'Giriş',
      key: 'giris',
      width: 90,
      render: (_, record) => (
        <TimePicker
          format="HH:mm"
          size="small"
          style={{ width: '70px', fontSize: '11px' }}
          value={anadoluTimesheetData[record.id]?.giris}
          onChange={(time) => handleAnadoluTimeChange(record.id, 'giris', time)}
          placeholder="--:--"
        />
      )
    },
    {
      title: 'Çıkış',
      key: 'cikis',
      width: 90,
      render: (_, record) => (
        <TimePicker
          format="HH:mm"
          size="small"
          style={{ width: '70px', fontSize: '11px' }}
          value={anadoluTimesheetData[record.id]?.cikis}
          onChange={(time) => handleAnadoluTimeChange(record.id, 'cikis', time)}
          placeholder="--:--"
        />
      )
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
          <Text style={{ fontSize: '14px', fontWeight: '500' }}>
            {selectedDate.format('DD.MM.YYYY')}
          </Text>
        </div>

                 {/* Sol Taraf - Ekipler */}
         <div style={{ display: 'flex', gap: '30px', width: '100%' }}>
           <div style={{ flex: 1, minWidth: 0 }}>
             {ekipOptions.map(ekip => (
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
                   <span>{ekip}</span>
                   <Button
                     type="text"
                     icon={<FullscreenOutlined />}
                     onClick={() => handleTeamExpand(ekip)}
                     size="small"
                     style={{ 
                       color: 'white', 
                       fontSize: '10px',
                       padding: '0',
                       height: 'auto',
                       minWidth: 'auto'
                     }}
                   />
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
             ))}
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
           type="primary"
           icon={<SaveOutlined />}
           onClick={handleSave}
           loading={loading}
           size="large"
         >
           Kaydet
         </Button>
         <Button
           icon={<PrinterOutlined />}
           onClick={handlePrint}
           size="large"
         >
           Yazdır
         </Button>
       </div>

       {/* Genişletilmiş Ekip Modal */}
       <Modal
         title={
           <div style={{ 
             fontSize: '16px', 
             fontWeight: '600', 
             color: getTeamColor(expandedTeam) === '#52c41a' ? '#52c41a' : 
                    getTeamColor(expandedTeam) === '#1890ff' ? '#1890ff' : 
                    getTeamColor(expandedTeam) === '#fa8c16' ? '#fa8c16' : '#8c8c8c',
             textAlign: 'center',
             padding: '6px 0'
           }}>
             {expandedTeam} - Detaylı Personel Listesi
           </div>
         }
         open={!!expandedTeam}
         onCancel={() => setExpandedTeam(null)}
         footer={null}
         width={800}
         style={{ top: 20 }}
         bodyStyle={{ padding: '16px', height: '85vh' }}
       >
         {expandedTeam && (
           <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
             <div style={{ marginBottom: '8px', textAlign: 'center' }}>
               <Text style={{ fontSize: '14px', color: '#666' }}>
                 {expandedTeam} - Toplam {groupedPersonnel[expandedTeam]?.length || 0} Personel
               </Text>
             </div>
             
             {/* Pozisyon Özet Tablosu */}
             <Card 
               size="small" 
               style={{ 
                 marginBottom: '8px',
                 background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                 border: '1px solid #dee2e6'
               }}
               bodyStyle={{ padding: '8px' }}
             >
               <div style={{ 
                 display: 'grid', 
                 gridTemplateColumns: 'repeat(4, 1fr)',
                 gap: '6px'
               }}>
                 {['Vardiya Amiri', 'Ekip Lideri', 'Sistem Operatörü', 'Sistem Operatör Yrd.', 'Sevkiyat Sorumlusu', 'Sevkiyat Veri Giriş Elemanı', 'Makine Operatörü', 'Sevkiyat Elemanı', 'Sevkiyat Elemanı ( Load Audit)'].map(konum => {
                   const count = groupedPersonnel[expandedTeam]?.filter(p => p.konum === konum).length || 0;
                   if (count === 0) return null;
                   
                   return (
                     <div key={konum} style={{
                       display: 'flex',
                       justifyContent: 'space-between',
                       alignItems: 'center',
                       padding: '4px 6px',
                       background: 'white',
                       borderRadius: '4px',
                       border: '1px solid #e9ecef',
                       fontSize: '9px'
                     }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                         {getPositionIcon(konum)}
                         <span style={{ 
                           fontWeight: '500',
                           color: '#495057'
                         }}>
                           {konum}
                         </span>
                       </div>
                       <span style={{ 
                         fontWeight: 'bold',
                         color: getTeamColor(expandedTeam),
                         fontSize: '10px'
                       }}>
                         {count}
                       </span>
                     </div>
                   );
                 })}
               </div>
             </Card>
             
             <div style={{ flex: 1, overflow: 'auto' }}>
               <Table
                 columns={teamColumns}
                 dataSource={groupedPersonnel[expandedTeam] || []}
                 rowKey="id"
                 pagination={false}
                 size="small"
                 style={{ fontSize: '10px' }}
               />
             </div>
           </div>
         )}
       </Modal>

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