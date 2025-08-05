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
import { savePuantajData, getPuantajData, deletePuantajData, getPuantajStats } from '../../services/supabase';

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
  const [selectedShift, setSelectedShift] = useState('all');


  // Tek değer varsa otomatik seç
  useEffect(() => {
    const departments = getUniqueValues('departman');
    const shifts = getUniqueValues('vardiya_plani');

    if (departments.length === 1) {
      setSelectedDepartment(departments[0]);
    }
    if (shifts.length === 1) {
      setSelectedShift(shifts[0]);
    }
  }, [puantajData]);
  const [dataStats, setDataStats] = useState({
    totalRecords: 0,
    totalEmployees: 0,
    lastMonth: '',
    lastDay: ''
  });
     const [pagination, setPagination] = useState({
     current: 1,
     pageSize: 100,
     showSizeChanger: true,
     showQuickJumper: true,
     pageSizeOptions: ['50', '100', '250', '500'],
     showTotal: (total, range) => 
       `${range[0]}-${range[1]} / ${total} kayıt`,
     position: ['bottomCenter']
   });

   // Varsayılan sıralama state'i
   const [sortConfig, setSortConfig] = useState({
     key: 'calisan',
     order: 'ascend'
   });


  useEffect(() => {
    // Başlangıçta veritabanından veri yükle
    loadPuantajData();
  }, []);

  // Veritabanından puantaj verilerini yükle
  const loadPuantajData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Veritabanından veri yükleniyor...');
      const result = await getPuantajData();
      if (result.success) {
        console.log('✅ Veri yükleme başarılı!');
        console.log('📊 Yüklenen veri sayısı:', result.data.length);
        setPuantajData(result.data);
        calculateStats(result.data);
      } else {
        console.error('❌ Veri yükleme hatası:', result.error);
        message.error('Veriler yüklenirken hata oluştu: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Veri yükleme exception:', error);
      message.error('Veriler yüklenirken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

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

    // Son güncel ay ve gün bilgisini bul
    let lastMonth = '';
    let lastDay = '';
    
    if (data.length > 0) {
      // Tarih alanlarını kontrol et ve en son tarihi bul
      const dates = data
        .map(item => {
          const tarih = item.tarih;
          const ay = item.ay;
          return { tarih, ay };
        })
        .filter(item => item.tarih || item.ay)
        .sort((a, b) => {
          // Tarih sıralaması için basit bir yaklaşım
          const dateA = a.tarih || '';
          const dateB = b.tarih || '';
          return dateB.localeCompare(dateA);
        });

      if (dates.length > 0) {
        lastMonth = dates[0].ay || 'Bilinmiyor';
        lastDay = dates[0].tarih || 'Bilinmiyor';
      }
    }

    console.log('📈 UI İstatistikleri:');
    console.log('   - Toplam Kayıt:', totalRecords);
    console.log('   - Benzersiz Personel:', uniqueEmployees);
    console.log('   - Son Güncel Ay:', lastMonth);
    console.log('   - Son Güncel Gün:', lastDay);

    setDataStats({
      totalRecords,
      totalEmployees: uniqueEmployees,
      lastMonth,
      lastDay
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
          
          // Debug: Excel başlıklarını göster
          console.log('Excel başlıkları:', headers);
          
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
                   'Unvan': 'unvan',
                   'Ünvan': 'unvan',
                   'Vardiya Planı': 'vardiya_plani',
                   'Vardiya Saatleri': 'vardiya_saatleri',
                   'Tarih': 'tarih',
                   'Ay': 'ay',
                   'Vardiya Giriş': 'vardiya_giris',
                   'Vardiya Çıkış': 'vardiya_cikis',
                   'N.Ç Süresi': 'nc_suresi',
                   'Normal Çalışma Süresi': 'nc_suresi',
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
                   'Brüt Çalışılan Süre': 'burt_calisilan_sure',
                   'Bürt Çalışılan': 'burt_calisilan_sure',
                   'Brüt Çalışılan': 'burt_calisilan_sure',
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
                
                const fieldName = fieldMapping[header];
                if (fieldName) {
                  let value = row[colIndex];
                  
                  // Tarih ve saat alanları için özel işleme
                  if (fieldName === 'vardiya_giris' || fieldName === 'vardiya_cikis') {
                    if (value && !isNaN(value)) {
                      // Excel serial number ise tarih formatına çevir
                      value = convertExcelSerialToDate(value);
                    } else if (value) {
                      // String formatında ise olduğu gibi bırak
                      value = String(value);
                    }
                  }
                  
                  // Sayısal alanlar için virgülü noktaya çevir
                  if (['nc_suresi', 'resmi_tatil', 'fm_50', 'hfm_200', 'devamsizlik_izni', 
                       'devamsiz', 'eksik_mesai', 'haftalik_izin', 'yillik_izin', 'ucretli', 
                       'ucretsiz_izin', 'raporlu', 'is_kazasi_izni', 'telafi_izni', 
                       'burt_calisilan_sure', 'net_calisilan_sure', 'toplam_hesaplanan_sure',
                       'hes_katilmayan_sure', 'gunluk_net_calisma', 'kontrol_toplam_sure'].includes(fieldName)) {
                    if (value && typeof value === 'string') {
                      value = value.replace(',', '.');
                    }
                  }
                  
                  rowData[fieldName] = value;
                }
              }
            });
            
                         return {
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
       
               // Veritabanına kaydet
        const saveResult = await savePuantajData(processedData);
        if (saveResult.success) {
          message.success(saveResult.message);
          // Veriler kaydedildikten sonra otomatik olarak yeniden yükle
          await loadPuantajData();
        } else {
          message.error('Veriler kaydedilirken hata oluştu: ' + saveResult.error);
        }
       
       setUploading(false);
       setUploadModalVisible(false);
      
    } catch (error) {
      setUploading(false);
      message.error(`Excel yükleme hatası: ${error.message}`);
    }

    return false; // Dosyayı otomatik yükleme
  };

  // Dinamik sütun sistemi
  const getColumns = () => {
    const baseColumns = [
         {
       title: 'Sicil No',
       dataIndex: 'sicil_no',
       key: 'sicil_no',
       width: 80,
       fixed: 'left',
       sorter: (a, b) => {
         const aVal = String(a.sicil_no || '').toLowerCase();
         const bVal = String(b.sicil_no || '').toLowerCase();
         return aVal.localeCompare(bVal);
       },
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
        width: 120,
        fixed: 'left',
        sorter: (a, b) => {
          const aVal = String(a.calisan || '').toLowerCase();
          const bVal = String(b.calisan || '').toLowerCase();
          return aVal.localeCompare(bVal);
        },
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
       sorter: (a, b) => {
         const aVal = String(a.departman || '').toLowerCase();
         const bVal = String(b.departman || '').toLowerCase();
         return aVal.localeCompare(bVal);
       },
       render: (text) => (
         <Tag color="blue" style={{ fontSize: '10px' }}>
           {text}
         </Tag>
       )
     },

                   {
        title: 'Ünvan',
        dataIndex: 'unvan',
        key: 'unvan',
        width: 120,
        sorter: (a, b) => {
          const aVal = String(a.unvan || '').toLowerCase();
          const bVal = String(b.unvan || '').toLowerCase();
          return aVal.localeCompare(bVal);
        },
        render: (text) => {
          // Ünvana göre renk belirleme
          let color = 'default';
          if (text) {
            const unvan = text.toLowerCase();
            if (unvan.includes('müdür') || unvan.includes('mudur')) color = 'red';
            else if (unvan.includes('şef') || unvan.includes('sef')) color = 'orange';
            else if (unvan.includes('uzman') || unvan.includes('uzman')) color = 'purple';
            else if (unvan.includes('teknisyen') || unvan.includes('teknisyen')) color = 'blue';
            else if (unvan.includes('operatör') || unvan.includes('operator')) color = 'cyan';
            else if (unvan.includes('işçi') || unvan.includes('isci') || unvan.includes('çalışan') || unvan.includes('calisan')) color = 'green';
            else if (unvan.includes('stajyer') || unvan.includes('stajyer')) color = 'lime';
            else if (unvan.includes('öğrenci') || unvan.includes('ogrenci')) color = 'geekblue';
            else color = 'default';
          }
          
          return (
            <Tag color={color} style={{ fontSize: '10px' }}>
              {text}
            </Tag>
          );
        }
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
       width: 100,
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
       sorter: (a, b) => {
         const aVal = String(a.tarih || '').toLowerCase();
         const bVal = String(b.tarih || '').toLowerCase();
         return aVal.localeCompare(bVal);
       },
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
      render: (text) => {
        const displayText = text && text !== 'undefined' && text !== 'null' && text !== '' ? text : '--:--';
        return (
          <Text style={{ fontSize: '11px', color: displayText !== '--:--' ? '#52c41a' : '#999' }}>
            {displayText}
          </Text>
        );
      }
    },
    {
      title: 'Vardiya Çıkış',
      dataIndex: 'vardiya_cikis',
      key: 'vardiya_cikis',
      width: 100,
      render: (text) => {
        const displayText = text && text !== 'undefined' && text !== 'null' && text !== '' ? text : '--:--';
        return (
          <Text style={{ fontSize: '11px', color: displayText !== '--:--' ? '#52c41a' : '#999' }}>
            {displayText}
          </Text>
        );
      }
    },
    {
      title: 'N.Ç Süresi',
      dataIndex: 'nc_suresi',
      key: 'nc_suresi',
      width: 100,
      render: (text) => {
        const value = parseFloat(String(text || '').replace(',', '.')) || 0;
        return (
          <Text strong style={{ fontSize: '11px', color: value > 0 ? '#1890ff' : '#999' }}>
            {value > 0 ? value.toFixed(2).replace('.', ',') : '0,00'}
          </Text>
        );
      }
    },
                   {
        title: 'Resmi Tatil',
        dataIndex: 'resmi_tatil',
        key: 'resmi_tatil',
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
        width: 100,
      render: (text) => (
        <Text style={{ fontSize: '11px' }}>
          {text || '0,00'}
        </Text>
      )
    },
         
                   {
        title: 'Eksik Mesai',
        dataIndex: 'eksik_mesai',
        key: 'eksik_mesai',
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
        title: 'Haftalık İzin',
        dataIndex: 'haftalik_izin',
        key: 'haftalik_izin',
        width: 80,
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
        width: 80,
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
        title: 'Ücretsiz İzin',
        dataIndex: 'ucretsiz_izin',
        key: 'ucretsiz_izin',
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
       title: 'Brüt Çalışılan Süre',
       dataIndex: 'burt_calisilan_sure',
       key: 'burt_calisilan_sure',
       width: 120,
      render: (text) => {
        const textStr = String(text || '');
        const value = parseFloat(textStr.replace(',', '.')) || 0;
        return (
          <Text style={{ 
            fontSize: '11px',
            color: value > 0 ? '#1890ff' : '#999',
            fontWeight: value > 0 ? 'bold' : 'normal'
          }}>
            {textStr || '0,00'}
          </Text>
        );
      }
    },
                   {
        title: 'Net Çalışılan Süre',
        dataIndex: 'net_calisilan_sure',
        key: 'net_calisilan_sure',
        width: 100,
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
        width: 100,
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
        width: 100,
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
        width: 120,
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
        title: 'Kontrol Toplam Süre',
        dataIndex: 'kontrol_toplam_sure',
        key: 'kontrol_toplam_sure',
        width: 120,
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

               return baseColumns;
  };

  const columns = getColumns();

     // Filtreleme ve sıralama fonksiyonu
   const getFilteredData = () => {
     let filtered = puantajData;

     // Metin filtresi
     if (filterText) {
       filtered = filtered.filter(item =>
         item.calisan?.toLowerCase().includes(filterText.toLowerCase()) ||
         String(item.sicil_no || '').includes(filterText)
       );
     }

     // Departman filtresi
     if (selectedDepartment !== 'all') {
       filtered = filtered.filter(item => item.departman === selectedDepartment);
     }

     // Vardiya filtresi
     if (selectedShift !== 'all') {
       filtered = filtered.filter(item => item.vardiya_plani === selectedShift);
     }

     // Varsayılan sıralama uygula
     filtered.sort((a, b) => {
       const aVal = String(a.calisan || '').toLowerCase();
       const bVal = String(b.calisan || '').toLowerCase();
       return aVal.localeCompare(bVal);
     });

     return filtered;
   };

  // Benzersiz değerleri al
  const getUniqueValues = (field) => {
    const values = puantajData.map(item => item[field]).filter(Boolean);
    return [...new Set(values)];
  };

     const filteredData = getFilteredData();

   // Loading ekranı
   if (loading) {
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
         {/* Başlık */}
         <div style={{ 
           textAlign: 'center', 
           marginBottom: '40px',
           backgroundColor: 'white',
           padding: '20px',
           borderRadius: '8px',
           boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
           width: '100%',
           maxWidth: '600px'
         }}>
           <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
             <FileExcelOutlined style={{ marginRight: '10px' }} />
             PUANTAJ TAKİBİ V2
           </Title>
           <Text type="secondary" style={{ fontSize: '14px' }}>
             Excel'den yüklenen puantaj verilerinin takibi
           </Text>
         </div>

         {/* Modern Loading Card */}
         <Card style={{ 
           width: '100%', 
           maxWidth: '400px',
           textAlign: 'center',
           boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
           borderRadius: '12px'
         }}>
           <div style={{ padding: '40px 20px' }}>
             {/* Modern Spinner */}
             <div style={{ 
               width: '80px', 
               height: '80px', 
               margin: '0 auto 20px',
               border: '4px solid #f3f3f3',
               borderTop: '4px solid #1890ff',
               borderRadius: '50%',
               animation: 'spin 1s linear infinite'
             }}></div>
             
             <Title level={4} style={{ margin: '0 0 10px', color: '#1890ff' }}>
               Veriler Yükleniyor...
             </Title>
             <Text type="secondary" style={{ fontSize: '14px' }}>
               Puantaj verileri veritabanından çekiliyor
             </Text>
             
             {/* Progress Bar */}
             <div style={{ marginTop: '20px' }}>
               <Progress 
                 percent={100} 
                 status="active" 
                 strokeColor="#1890ff"
                 showInfo={false}
                 strokeWidth={6}
               />
             </div>
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
         backgroundColor: 'white',
         padding: '20px',
         borderRadius: '8px',
         boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
       }}>
         <Title level={3} style={{ margin: 0, color: '#1890ff', fontSize: '18px', fontWeight: 'bold' }}>
           Puantaj Takip
         </Title>
       </div>

                           {/* İstatistikler */}
        <Row gutter={8} style={{ marginBottom: '15px' }}>
          <Col span={8}>
            <Card size="small" style={{ padding: '8px' }}>
              <Statistic
                title="Toplam Kayıt"
                value={dataStats.totalRecords}
                prefix={<BarChartOutlined />}
                valueStyle={{ color: '#1890ff', fontSize: '16px' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ padding: '8px' }}>
              <Statistic
                title="Toplam Personel"
                value={dataStats.totalEmployees}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#52c41a', fontSize: '16px' }}
              />
            </Card>
          </Col>
                     <Col span={8}>
             <Card size="small" style={{ padding: '8px' }}>
               <Statistic
                 title="Son Güncel Veri"
                 value={`${dataStats.lastMonth} - ${dataStats.lastDay}`}
                 prefix={<CalendarOutlined />}
                 valueStyle={{ color: '#722ed1', fontSize: '14px' }}
                 suffix={
                   <Text type="secondary" style={{ fontSize: '10px', marginLeft: '4px' }}>
                     (Son güncel ay ve gün)
                   </Text>
                 }
               />
             </Card>
           </Col>
        </Row>

      {/* Kontroller */}
      <Card style={{ marginBottom: '20px' }}>
        <Row gutter={16} align="middle">
                     <Col span={6}>
                                                                               <Select
                  showSearch
                  placeholder="Personel seçin veya arayın..."
                  value={filterText}
                  onChange={setFilterText}
                  onSearch={setFilterText}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  allowClear
                  style={{ width: '100%' }}
                  loading={loading}
                  notFoundContent={loading ? "Veriler yükleniyor..." : "Personel bulunamadı"}
                  options={getUniqueValues('calisan')
                    .sort((a, b) => a.localeCompare(b, 'tr'))
                    .map(calisan => ({
                      value: calisan,
                      label: calisan
                    }))}
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
                             scroll={{ x: 1800, y: 600 }}
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