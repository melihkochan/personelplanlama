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
  Statistic
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
  BarChartOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/tr';
import * as XLSX from 'xlsx';

dayjs.extend(customParseFormat);
dayjs.locale('tr');

const { Title, Text } = Typography;
const { Option } = Select;

const PuantajTakipV2 = () => {
  const [puantajData, setPuantajData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedShift, setSelectedShift] = useState('all');

  // Tek değer varsa otomatik seç
  useEffect(() => {
    const departments = getUniqueValues('departman');
    const sections = getUniqueValues('bolum');
    const shifts = getUniqueValues('vardiya_plani');

    if (departments.length === 1) {
      setSelectedDepartment(departments[0]);
    }
    if (sections.length === 1) {
      setSelectedSection(sections[0]);
    }
    if (shifts.length === 1) {
      setSelectedShift(shifts[0]);
    }
  }, [puantajData]);
  const [dataStats, setDataStats] = useState({
    totalRecords: 0,
    totalEmployees: 0
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: ['10', '20', '50', '100'],
    showTotal: (total, range) => 
      `${range[0]}-${range[1]} / ${total} kayıt`,
    position: ['bottomCenter']
  });


  useEffect(() => {
    // Başlangıçta boş veri ile başla
    setPuantajData([]);
    calculateStats([]);
  }, []);

  // Excel serial number'ı tarih formatına çevir
  const convertExcelSerialToDate = (serialNumber) => {
    if (!serialNumber || isNaN(serialNumber)) return '';
    
    // Excel serial number'ı JavaScript Date'e çevir
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (serialNumber - 1) * 24 * 60 * 60 * 1000);
    
    // Tarih ve saat formatını ayarla
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  const calculateStats = (data) => {
    const totalRecords = data.length;
    const uniqueEmployees = new Set(data.map(item => item.sicil_no)).size;

    setDataStats({
      totalRecords,
      totalEmployees: uniqueEmployees
    });
  };

  // Excel dosyasını işleme fonksiyonu
  const processExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          // Excel dosyasını parse et
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // JSON'a çevir
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length < 2) {
            reject(new Error('Excel dosyası boş veya geçersiz'));
            return;
          }
          
          // İlk satır başlıklar
          const headers = jsonData[0];
          const dataRows = jsonData.slice(1);
          
          // Veriyi işle
          const processedData = dataRows.map((row, index) => {
            const rowData = {};
            headers.forEach((header, colIndex) => {
              if (header && row[colIndex] !== undefined) {
                                 // Türkçe başlıkları İngilizce alan adlarına çevir
                 const fieldMapping = {
                   'Sicil No': 'sicil_no',
                   'Adı Soyadı': 'calisan',
                   'Çalışan (Adı Soyadı)': 'calisan',
                   'Çalışan': 'calisan',
                   'Departman': 'departman',
                   'Bölüm': 'bolum',
                   'Ünvan': 'unvan',
                   'Vardiya Planı': 'vardiya_plani',
                   'Vardiya Saatleri': 'vardiya_saatleri',
                   'Tarih': 'tarih',
                   'Ay': 'ay',
                   'Vardiya Giriş': 'vardiya_giris',
                   'Vardiya Çıkış': 'vardiya_cikis',
                   'N.Ç Süresi': 'nc_suresi',
                   'Resmi Tatil': 'resmi_tatil',
                   'FM%50': 'fm_50',
                   'HFM%200': 'hfm_200',
                   'Devamsızlık İzni': 'devamsizlik_izni',
                   'Devamsız': 'devamsiz',
                   'Eksik Mesai': 'eksik_mesai',
                   'Haftalık İzin': 'haftalik_izin',
                   'Yıllık İzin': 'yillik_izin',
                   'Ücretli İzin': 'ucretli',
                   'Ücretsiz İzin': 'ucretsiz_izin',
                   'Raporlu': 'raporlu',
                   'İş Kazası İzni': 'is_kazasi_izni',
                   'Telafi İzni': 'telafi_izni',
                   'Bürt Çalışılan Süre': 'burt_calisilan_sure',
                   'Net Çalışılan Süre': 'net_calisilan_sure',
                   'Giriş Zamanı': 'giris_zamani',
                   'Çıkış Zamanı': 'cikis_zamani',
                   'Hesaplanan Süre': 'toplam_hesaplanan_sure',
                   'Toplam Hesaplanan Süre': 'toplam_hesaplanan_sure',
                   'Hes.Katılmayan Süre': 'hes_katilmayan_sure',
                   'Hes. Katılmayan Süre': 'hes_katilmayan_sure',
                   'Günlük Net Ç.S.': 'gunluk_net_calisma',
                   'Günlük Net Çalışma': 'gunluk_net_calisma',
                   'Kontrol Top.Süre': 'kontrol_toplam_sure',
                   'Kontrol Toplam Süre': 'kontrol_toplam_sure'
                 };
                
                const fieldName = fieldMapping[header] || header.toLowerCase().replace(/\s+/g, '_');
                rowData[fieldName] = row[colIndex];
              }
            });
            
            return {
              id: index + 1,
              ...rowData
            };
          });
          
          resolve(processedData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Dosya okunamadı'));
      reader.readAsArrayBuffer(file);
    });
  };

  // Excel yükleme işlemi
  const handleExcelUpload = async (file) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      // Progress simülasyonu
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Dosyayı işle
      const processedData = await processExcelFile(file);
      
      setUploadProgress(100);
      setPuantajData(processedData);
      calculateStats(processedData);
      
      setUploading(false);
      setUploadModalVisible(false);
      message.success(`${processedData.length} kayıt başarıyla yüklendi!`);
      
    } catch (error) {
      setUploading(false);
      message.error(`Excel yükleme hatası: ${error.message}`);
    }

    return false; // Dosyayı otomatik yükleme
  };

  // Tablo sütunları
  const columns = [
    {
      title: 'Sicil No',
      dataIndex: 'sicil_no',
      key: 'sicil_no',
      width: 80,
      fixed: 'left',
      render: (text) => (
        <Text strong style={{ fontSize: '11px' }}>
          {text}
        </Text>
      )
    },
    {
      title: 'Çalışan',
      dataIndex: 'calisan',
      key: 'calisan',
      width: 150,
      fixed: 'left',
      render: (text) => (
        <Text style={{ fontSize: '11px' }}>
          {text}
        </Text>
      )
    },
    {
      title: 'Departman',
      dataIndex: 'departman',
      key: 'departman',
      width: 100,
      render: (text) => (
        <Tag color="blue" style={{ fontSize: '10px' }}>
          {text}
        </Tag>
      )
    },
    {
      title: 'Bölüm',
      dataIndex: 'bolum',
      key: 'bolum',
      width: 120,
      render: (text) => (
        <Text style={{ fontSize: '11px' }}>
          {text}
        </Text>
      )
    },
    {
      title: 'Ünvan',
      dataIndex: 'unvan',
      key: 'unvan',
      width: 140,
      render: (text) => (
        <Tag color="green" style={{ fontSize: '10px' }}>
          {text}
        </Tag>
      )
    },
    {
      title: 'Vardiya Planı',
      dataIndex: 'vardiya_plani',
      key: 'vardiya_plani',
      width: 100,
      render: (text) => {
        let color = 'default';
        if (text === 'H.İzni') color = 'orange';
        else if (text === 'Resmi Tatil') color = 'red';
        else if (text === 'NormS') color = 'blue';
        
        return (
          <Tag color={color} style={{ fontSize: '10px' }}>
            {text}
          </Tag>
        );
      }
    },
    {
      title: 'Vardiya Saatleri',
      dataIndex: 'vardiya_saatleri',
      key: 'vardiya_saatleri',
      width: 120,
      render: (text) => (
        <Text style={{ fontSize: '11px' }}>
          {text}
        </Text>
      )
    },
    {
      title: 'Tarih',
      dataIndex: 'tarih',
      key: 'tarih',
      width: 100,
      render: (text) => (
        <Text style={{ fontSize: '11px' }}>
          {text}
        </Text>
      )
    },
    {
      title: 'Ay',
      dataIndex: 'ay',
      key: 'ay',
      width: 80,
      render: (text) => (
        <Text style={{ fontSize: '11px' }}>
          {text}
        </Text>
      )
    },
    {
      title: 'Vardiya Giriş',
      dataIndex: 'vardiya_giris',
      key: 'vardiya_giris',
      width: 100,
      render: (text) => (
        <Text style={{ fontSize: '11px', color: text ? '#52c41a' : '#999' }}>
          {text || '--:--'}
        </Text>
      )
    },
    {
      title: 'Vardiya Çıkış',
      dataIndex: 'vardiya_cikis',
      key: 'vardiya_cikis',
      width: 100,
      render: (text) => (
        <Text style={{ fontSize: '11px', color: text ? '#52c41a' : '#999' }}>
          {text || '--:--'}
        </Text>
      )
    },
    {
      title: 'N.Ç Süresi',
      dataIndex: 'nc_suresi',
      key: 'nc_suresi',
      width: 100,
      render: (text) => (
        <Text strong style={{ fontSize: '11px', color: '#1890ff' }}>
          {text || '0,00'}
        </Text>
      )
    },
         {
       title: 'Resmi Tatil',
       dataIndex: 'resmi_tatil',
       key: 'resmi_tatil',
       width: 100,
       render: (text) => {
         const textStr = String(text || '');
         const value = parseFloat(textStr.replace(',', '.')) || 0;
         return (
           <Text style={{ 
             fontSize: '11px',
             color: value > 0 ? '#f5222d' : '#999',
             fontWeight: value > 0 ? 'bold' : 'normal'
           }}>
             {textStr || '0,00'}
           </Text>
         );
       }
     },
         {
       title: 'FM%50',
       dataIndex: 'fm_50',
       key: 'fm_50',
       width: 80,
       render: (text) => {
         const textStr = String(text || '');
         const value = parseFloat(textStr.replace(',', '.')) || 0;
         return (
           <Text style={{ 
             fontSize: '11px', 
             color: value > 0 ? '#fa8c16' : '#999',
             fontWeight: value > 0 ? 'bold' : 'normal'
           }}>
             {textStr || '0,00'}
           </Text>
         );
       }
     },
         {
       title: 'HFM%200',
       dataIndex: 'hfm_200',
       key: 'hfm_200',
       width: 90,
       render: (text) => {
         const textStr = String(text || '');
         const value = parseFloat(textStr.replace(',', '.')) || 0;
         return (
           <Text style={{ 
             fontSize: '11px', 
             color: value > 0 ? '#f5222d' : '#999',
             fontWeight: value > 0 ? 'bold' : 'normal'
           }}>
             {textStr || '0,00'}
           </Text>
         );
       }
     },
    {
      title: 'Devamsızlık İzni',
      dataIndex: 'devamsizlik_izni',
      key: 'devamsizlik_izni',
      width: 120,
      render: (text) => (
        <Text style={{ fontSize: '11px' }}>
          {text || '0,00'}
        </Text>
      )
    },
         {
       title: 'Devamsız',
       dataIndex: 'devamsiz',
       key: 'devamsiz',
       width: 80,
       render: (text) => {
         const textStr = String(text || '');
         const value = parseFloat(textStr.replace(',', '.')) || 0;
         return (
           <Text style={{ 
             fontSize: '11px',
             color: value > 0 ? '#f5222d' : '#999',
             fontWeight: value > 0 ? 'bold' : 'normal'
           }}>
             {textStr || '0,00'}
           </Text>
         );
       }
     },
         {
       title: 'Eksik Mesai',
       dataIndex: 'eksik_mesai',
       key: 'eksik_mesai',
       width: 100,
       render: (text) => {
         const textStr = String(text || '');
         const value = parseFloat(textStr.replace(',', '.')) || 0;
         return (
           <Text style={{ 
             fontSize: '11px',
             color: value > 0 ? '#fa8c16' : '#999',
             fontWeight: value > 0 ? 'bold' : 'normal'
           }}>
             {textStr || '0,00'}
           </Text>
         );
       }
     },
         {
       title: 'Haftalık İzin',
       dataIndex: 'haftalik_izin',
       key: 'haftalik_izin',
       width: 100,
       render: (text) => {
         const textStr = String(text || '');
         const value = parseFloat(textStr.replace(',', '.')) || 0;
         return (
           <Text style={{ 
             fontSize: '11px',
             color: value > 0 ? '#722ed1' : '#999',
             fontWeight: value > 0 ? 'bold' : 'normal'
           }}>
             {textStr || '0,00'}
           </Text>
         );
       }
     },
         {
       title: 'Yıllık İzin',
       dataIndex: 'yillik_izin',
       key: 'yillik_izin',
       width: 100,
       render: (text) => {
         const textStr = String(text || '');
         const value = parseFloat(textStr.replace(',', '.')) || 0;
         return (
           <Text style={{ 
             fontSize: '11px',
             color: value > 0 ? '#722ed1' : '#999',
             fontWeight: value > 0 ? 'bold' : 'normal'
           }}>
             {textStr || '0,00'}
           </Text>
         );
       }
     },
         {
       title: 'Ücretli',
       dataIndex: 'ucretli',
       key: 'ucretli',
       width: 80,
       render: (text) => {
         const textStr = String(text || '');
         const value = parseFloat(textStr.replace(',', '.')) || 0;
         return (
           <Text style={{ 
             fontSize: '11px',
             color: value > 0 ? '#52c41a' : '#999',
             fontWeight: value > 0 ? 'bold' : 'normal'
           }}>
             {textStr || '0,00'}
           </Text>
         );
       }
     },
         {
       title: 'Ücretsiz İzin',
       dataIndex: 'ucretsiz_izin',
       key: 'ucretsiz_izin',
       width: 100,
       render: (text) => {
         const textStr = String(text || '');
         const value = parseFloat(textStr.replace(',', '.')) || 0;
         return (
           <Text style={{ 
             fontSize: '11px',
             color: value > 0 ? '#fa8c16' : '#999',
             fontWeight: value > 0 ? 'bold' : 'normal'
           }}>
             {textStr || '0,00'}
           </Text>
         );
       }
     },
         {
       title: 'Raporlu',
       dataIndex: 'raporlu',
       key: 'raporlu',
       width: 80,
       render: (text) => {
         const textStr = String(text || '');
         const value = parseFloat(textStr.replace(',', '.')) || 0;
         return (
           <Text style={{ 
             fontSize: '11px',
             color: value > 0 ? '#f5222d' : '#999',
             fontWeight: value > 0 ? 'bold' : 'normal'
           }}>
             {textStr || '0,00'}
           </Text>
         );
       }
     },
         {
       title: 'İş Kazası İzni',
       dataIndex: 'is_kazasi_izni',
       key: 'is_kazasi_izni',
       width: 120,
       render: (text) => {
         const textStr = String(text || '');
         const value = parseFloat(textStr.replace(',', '.')) || 0;
         return (
           <Text style={{ 
             fontSize: '11px',
             color: value > 0 ? '#f5222d' : '#999',
             fontWeight: value > 0 ? 'bold' : 'normal'
           }}>
             {textStr || '0,00'}
           </Text>
         );
       }
     },
         {
       title: 'Telafi İzni',
       dataIndex: 'telafi_izni',
       key: 'telafi_izni',
       width: 100,
       render: (text) => {
         const textStr = String(text || '');
         const value = parseFloat(textStr.replace(',', '.')) || 0;
         return (
           <Text style={{ 
             fontSize: '11px',
             color: value > 0 ? '#52c41a' : '#999',
             fontWeight: value > 0 ? 'bold' : 'normal'
           }}>
             {textStr || '0,00'}
           </Text>
         );
       }
     },
    {
      title: 'Bürt Çalışılan Süre',
      dataIndex: 'burt_calisilan_sure',
      key: 'burt_calisilan_sure',
      width: 140,
      render: (text) => (
        <Text style={{ fontSize: '11px' }}>
          {text || '0,00'}
        </Text>
      )
    },
         {
       title: 'Net Çalışılan Süre',
       dataIndex: 'net_calisilan_sure',
       key: 'net_calisilan_sure',
       width: 120,
       render: (text) => {
         const textStr = String(text || '');
         const value = parseFloat(textStr.replace(',', '.')) || 0;
         let color = '#52c41a'; // Default green
         if (value > 7) {
           color = '#fa8c16'; // Orange for over 7 hours
         } else if (value === 0) {
           color = '#999'; // Gray for zero
         }
         return (
           <Text strong style={{ fontSize: '11px', color: color }}>
             {textStr || '0,00'}
           </Text>
         );
       }
     },
         {
       title: 'Giriş Zamanı',
       dataIndex: 'giris_zamani',
       key: 'giris_zamani',
       width: 140,
       render: (text) => {
         const formattedDate = convertExcelSerialToDate(text);
         return (
           <Text style={{ fontSize: '11px' }}>
             {formattedDate || '--'}
           </Text>
         );
       }
     },
         {
       title: 'Çıkış Zamanı',
       dataIndex: 'cikis_zamani',
       key: 'cikis_zamani',
       width: 140,
       render: (text) => {
         const formattedDate = convertExcelSerialToDate(text);
         return (
           <Text style={{ fontSize: '11px' }}>
             {formattedDate || '--'}
           </Text>
         );
       }
     },
         {
       title: 'Toplam Hesaplanan Süre',
       dataIndex: 'toplam_hesaplanan_sure',
       key: 'toplam_hesaplanan_sure',
       width: 160,
       render: (text) => {
         const textStr = String(text || '');
         const value = parseFloat(textStr.replace(',', '.')) || 0;
         let color = '#1890ff'; // Default blue
         if (value > 8) {
           color = '#fa8c16'; // Orange for over 8 hours
         } else if (value === 0) {
           color = '#999'; // Gray for zero
         }
         return (
           <Text strong style={{ fontSize: '11px', color: color }}>
             {textStr || '0,00'}
           </Text>
         );
       }
     },
    {
      title: 'Hes. Katılmayan Süre',
      dataIndex: 'hes_katilmayan_sure',
      key: 'hes_katilmayan_sure',
      width: 150,
      render: (text) => (
        <Text style={{ fontSize: '11px' }}>
          {text || '0,00'}
        </Text>
      )
    },
    {
      title: 'Günlük Net Çalışma',
      dataIndex: 'gunluk_net_calisma',
      key: 'gunluk_net_calisma',
      width: 140,
      render: (text) => (
        <Text strong style={{ fontSize: '11px', color: '#52c41a' }}>
          {text || '0,00'}
        </Text>
      )
    },
         {
       title: 'Kontrol Toplam Süre',
       dataIndex: 'kontrol_toplam_sure',
       key: 'kontrol_toplam_sure',
       width: 140,
       render: (text) => {
         const textStr = String(text || '');
         const value = parseFloat(textStr.replace(',', '.')) || 0;
         let color = '#1890ff'; // Default blue
         if (value > 7) {
           color = '#fa8c16'; // Orange for over 7 hours
         } else if (value === 0) {
           color = '#999'; // Gray for zero
         }
         return (
           <Text strong style={{ fontSize: '11px', color: color }}>
             {textStr || '0,00'}
           </Text>
         );
       }
     }
  ];

  // Filtreleme fonksiyonu
  const getFilteredData = () => {
    let filtered = puantajData;

    // Metin filtresi
    if (filterText) {
      filtered = filtered.filter(item =>
        item.calisan?.toLowerCase().includes(filterText.toLowerCase()) ||
        String(item.sicil_no || '').includes(filterText) ||
        item.bolum?.toLowerCase().includes(filterText.toLowerCase())
      );
    }

    // Departman filtresi
    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(item => item.departman === selectedDepartment);
    }

    // Bölüm filtresi
    if (selectedSection !== 'all') {
      filtered = filtered.filter(item => item.bolum === selectedSection);
    }

    // Vardiya filtresi
    if (selectedShift !== 'all') {
      filtered = filtered.filter(item => item.vardiya_plani === selectedShift);
    }

    return filtered;
  };

  // Benzersiz değerleri al
  const getUniqueValues = (field) => {
    const values = puantajData.map(item => item[field]).filter(Boolean);
    return [...new Set(values)];
  };

  const filteredData = getFilteredData();

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Başlık */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '20px',
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
          <FileExcelOutlined style={{ marginRight: '10px' }} />
          PUANTAJ TAKİBİ V2
        </Title>
        <Text type="secondary" style={{ fontSize: '14px' }}>
          Excel'den yüklenen puantaj verilerinin takibi
        </Text>
      </div>

                           {/* İstatistikler */}
        <Row gutter={16} style={{ marginBottom: '20px' }}>
          <Col span={12}>
            <Card>
              <Statistic
                title="Toplam Kayıt"
                value={dataStats.totalRecords}
                prefix={<BarChartOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card>
              <Statistic
                title="Toplam Personel"
                value={dataStats.totalEmployees}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>

      {/* Kontroller */}
      <Card style={{ marginBottom: '20px' }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Input
              placeholder="Personel ara..."
              prefix={<UserOutlined />}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              allowClear
            />
          </Col>
                                 <Col span={4}>
              <Select
                placeholder="Departman"
                value={selectedDepartment}
                onChange={setSelectedDepartment}
                style={{ width: '100%' }}
                disabled={getUniqueValues('departman').length <= 1}
              >
                {getUniqueValues('departman').length > 1 && (
                  <Option value="all">Tümü</Option>
                )}
                {getUniqueValues('departman').map(dept => (
                  <Option key={dept} value={dept}>{dept}</Option>
                ))}
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="Bölüm"
                value={selectedSection}
                onChange={setSelectedSection}
                style={{ width: '100%' }}
                disabled={getUniqueValues('bolum').length <= 1}
              >
                {getUniqueValues('bolum').length > 1 && (
                  <Option value="all">Tümü</Option>
                )}
                {getUniqueValues('bolum').map(section => (
                  <Option key={section} value={section}>{section}</Option>
                ))}
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="Vardiya"
                value={selectedShift}
                onChange={setSelectedShift}
                style={{ width: '100%' }}
                disabled={getUniqueValues('vardiya_plani').length <= 1}
              >
                {getUniqueValues('vardiya_plani').length > 1 && (
                  <Option value="all">Tümü</Option>
                )}
                {getUniqueValues('vardiya_plani').map(shift => (
                  <Option key={shift} value={shift}>{shift}</Option>
                ))}
              </Select>
            </Col>
          <Col span={6}>
            <Space>
              <Button
                type="primary"
                icon={<UploadOutlined />}
                onClick={() => setUploadModalVisible(true)}
              >
                Excel Yükle
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => message.info('Excel indirme özelliği yakında eklenecek')}
              >
                Excel İndir
              </Button>
                             <Button
                 icon={<ReloadOutlined />}
                 onClick={() => {
                   setPuantajData([]);
                   calculateStats([]);
                   message.success('Veriler temizlendi');
                 }}
               >
                 Temizle
               </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Tablo */}
      <Card>
        <div style={{ overflowX: 'auto' }}>
                                 <Table
              columns={columns}
              dataSource={filteredData}
              rowKey="id"
              pagination={pagination}
              onChange={(paginationInfo) => {
                setPagination(prev => ({
                  ...prev,
                  current: paginationInfo.current,
                  pageSize: paginationInfo.pageSize
                }));
              }}
              scroll={{ x: 3000 }}
              size="small"
              bordered
              loading={loading}
              rowClassName={(record, index) => 
                index % 2 === 0 ? 'even-row' : 'odd-row'
              }
            />
        </div>
      </Card>

      {/* Excel Yükleme Modalı */}
      <Modal
        title="Excel Dosyası Yükle"
        open={uploadModalVisible}
        onCancel={() => setUploadModalVisible(false)}
        footer={null}
        width={500}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Upload.Dragger
            name="file"
            accept=".xlsx,.xls"
            beforeUpload={handleExcelUpload}
            showUploadList={false}
            disabled={uploading}
          >
            <p className="ant-upload-drag-icon">
              <FileExcelOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
            </p>
            <p className="ant-upload-text">
              Excel dosyasını buraya sürükleyin veya tıklayın
            </p>
            <p className="ant-upload-hint">
              Sadece .xlsx ve .xls dosyaları desteklenir
            </p>
          </Upload.Dragger>

          {uploading && (
            <div style={{ marginTop: '20px' }}>
              <Progress percent={uploadProgress} status="active" />
              <Text style={{ marginTop: '10px', display: 'block' }}>
                Dosya yükleniyor... %{uploadProgress}
              </Text>
            </div>
          )}

          <Alert
            message="Excel Formatı"
            description="Excel dosyası aşağıdaki sütunları içermelidir: Sicil No, Çalışan, Departman, Bölüm, Ünvan, Vardiya Planı, Vardiya Saatleri, Tarih, Ay, Vardiya Giriş, Vardiya Çıkış, N.Ç Süresi, Resmi Tatil, FM%50, HFM%200, Devamsızlık İzni, Devamsız, Eksik Mesai, Haftalık İzin, Yıllık İzin, Ücretli, Ücretsiz İzin, Raporlu, İş Kazası İzni, Telafi İzni, Bürt Çalışılan Süre, Net Çalışılan Süre, Giriş Zamanı, Çıkış Zamanı, Toplam Hesaplanan Süre, Hes. Katılmayan Süre, Günlük Net Çalışma, Kontrol Toplam Süre"
            type="info"
            showIcon
            style={{ marginTop: '20px' }}
          />
        </div>
      </Modal>

      {/* CSS Stilleri */}
      <style>{`
        .even-row { background-color: #fafafa; }
        .odd-row { background-color: white; }
        
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

export default PuantajTakipV2; 