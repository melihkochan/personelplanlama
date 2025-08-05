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

const PuantajTakip = () => {
  const [puantajData, setPuantajData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [filterText, setFilterText] = useState([]);
  const [selectedShift, setSelectedShift] = useState('all');
  const [selectedAy, setSelectedAy] = useState('all');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Puantaj Takip verileri yükleniyor...');


  // Tek değer varsa otomatik seç
  useEffect(() => {
    const shifts = getUniqueValues('vardiya_plani');
    const months = getUniqueValues('ay');

    if (shifts.length === 1) {
      setSelectedShift(shifts[0]);
    }
    
    // Ay filtresi için: Eğer birden fazla ay varsa "Tüm Aylar" seçili olsun
    if (months.length > 1) {
      setSelectedAy('all');
    } else if (months.length === 1) {
      setSelectedAy(months[0]);
    }
  }, [puantajData]);

  // Veriler yüklendiğinde ay filtresini sıfırla
  useEffect(() => {
    if (puantajData.length > 0) {
      const months = getUniqueValues('ay');
      if (months.length > 1) {
        setSelectedAy('all');
      }
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
    
    // Başlangıçta ay filtresini "Tüm Aylar" olarak ayarla
    setSelectedAy('all');
  }, []);

  // Veriler yüklendiğinde dropdown'ı hazırla
  useEffect(() => {
    if (puantajData.length > 0) {
      // Dropdown'ın yeniden render olması için kısa bir gecikme
      setTimeout(() => {
        const selectElement = document.querySelector('.ant-select-selector');
        if (selectElement) {
          selectElement.click();
        }
      }, 100);
    }
  }, [puantajData]);

  // Veritabanından puantaj verilerini yükle
  const loadPuantajData = async () => {
    setLoading(true);
    setLoadingProgress(0);
    setLoadingText('Puantaj Takip verileri yükleniyor...');
    try {
      const result = await getPuantajData({}, (progress, page, pageSize, totalCount) => {
        setLoadingProgress(progress);
        setLoadingText(`Veriler ${Math.round(progress)}% yüklendi`);
      });
      if (result.success) {
        setPuantajData(result.data);
        calculateStats(result.data);
        
        // Veriler yüklendiğinde filtreleri sıfırla
        const months = [...new Set(result.data.map(item => item.ay).filter(Boolean))];
        if (months.length > 1) {
          setSelectedAy('all');
        }
      } else {
        message.error('Veriler yüklenirken hata oluştu: ' + result.error);
      }
    } catch (error) {
      message.error('Veriler yüklenirken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
      setLoadingProgress(100);
    }
  };

  // Excel serial number'ı tarih formatına çevir
  const convertExcelSerialToDate = (serialNumber) => {
    if (!serialNumber || isNaN(serialNumber)) {
      return '';
    }
    
    // Excel serial number'ı JavaScript Date'e çevir
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (serialNumber - 1) * 24 * 60 * 60 * 1000);
    
    // Geçerli tarih kontrolü
    if (isNaN(date.getTime()) || date.getFullYear() < 1900 || date.getFullYear() > 2100) {
      return '';
    }
    
    // Tarih ve saat formatını ayarla
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  // Genel tarih formatı dönüştürme fonksiyonu
  const formatDateTimeForExcel = (value) => {
    if (!value) return '';
    
    // Eğer zaten doğru formatta ise (DD.MM.YYYY HH:MM)
    if (typeof value === 'string' && /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/.test(value)) {
      return value;
    }
    
    // Eğer sayısal değer ise (Excel serial number)
    if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)))) {
      const numericValue = typeof value === 'string' ? parseFloat(value) : value;
      return convertExcelSerialToDate(numericValue);
    }
    
    // Eğer string ama farklı formatta ise, parse etmeye çalış
    if (typeof value === 'string') {
      // ISO format (2023-12-31T14:30:00)
      if (value.includes('T') && value.includes('-')) {
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${day}.${month}.${year} ${hours}:${minutes}`;
          }
        } catch (e) {
          // Hata durumunda sessizce devam et
        }
      }
      
      // Diğer tarih formatları için deneme
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          return `${day}.${month}.${year} ${hours}:${minutes}`;
        }
      } catch (e) {
        // Hata durumunda sessizce devam et
      }
    }
    
    // Son çare olarak string'e çevir
    return String(value);
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
                  if (fieldName === 'vardiya_giris' || fieldName === 'vardiya_cikis' || fieldName === 'giris_zamani' || fieldName === 'cikis_zamani') {
                    if (value) {
                      // Kapsamlı tarih formatı dönüştürme
                      value = formatDateTimeForExcel(value);
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

  // Excel indirme işlemi
  const handleExcelDownload = () => {
    try {
      // Filtrelenmiş veriyi al
      const dataToExport = getFilteredData();
      
      if (dataToExport.length === 0) {
        message.warning('İndirilecek veri bulunamadı');
        return;
      }

      // Excel için veriyi hazırla
      const excelData = dataToExport.map(item => {
        // Giriş ve çıkış zamanlarını formatla
        let girisZamani = item.giris_zamani;
        let cikisZamani = item.cikis_zamani;
        

        
        // Giriş ve çıkış zamanlarını formatla
        girisZamani = formatDateTimeForExcel(girisZamani);
        cikisZamani = formatDateTimeForExcel(cikisZamani);
        
        return {
          'Sicil No': item.sicil_no,
          'Çalışan': item.calisan,
          'Bölüm': item.bolum,
          'Ünvan': item.unvan,
          'Vardiya Planı': item.vardiya_plani,
          'Vardiya Saatleri': item.vardiya_saatleri,
          'Tarih': item.tarih,
          'Ay': item.ay,
          'Vardiya Giriş': item.vardiya_giris,
          'Vardiya Çıkış': item.vardiya_cikis,
          'N.Ç Süresi': item.nc_suresi,
          'Haftalık İzin': item.haftalik_izin,
          'Resmi Tatil': item.resmi_tatil,
          'FM%50': item.fm_50,
          'HFM%200': item.hfm_200,
          'Raporlu': item.raporlu,
          'Devamsızlık İzni': item.devamsizlik_izni,
          'Devamsız': item.devamsiz,
          'Eksik Mesai': item.eksik_mesai,
          'Yıllık İzin': item.yillik_izin,
          'Ücretsiz İzin': item.ucretsiz_izin,
          'Brüt Çalışılan Süre': item.burt_calisilan_sure,
          'Net Çalışılan Süre': item.net_calisilan_sure,
          'Giriş Zamanı': girisZamani,
          'Çıkış Zamanı': cikisZamani,
          'Toplam Hesaplanan Süre': item.toplam_hesaplanan_sure,
          'Kontrol Toplam Süre': item.kontrol_toplam_sure
        };
      });

      // Excel dosyası oluştur
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Puantaj Verileri');

      // Dosya adını oluştur
      const currentDate = dayjs().format('YYYY-MM-DD');
      const fileName = `Puantaj_Verileri_${currentDate}.xlsx`;

      // Dosyayı indir
      XLSX.writeFile(wb, fileName);
      
      message.success(`${dataToExport.length} kayıt başarıyla indirildi`);
    } catch (error) {
      message.error(`Excel indirme hatası: ${error.message}`);
    }
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
       sorter: (a, b) => {
         const aVal = String(a.vardiya_saatleri || '').toLowerCase();
         const bVal = String(b.vardiya_saatleri || '').toLowerCase();
         return aVal.localeCompare(bVal);
       },
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
      sorter: (a, b) => {
        const aVal = String(a.ay || '').toLowerCase();
        const bVal = String(b.ay || '').toLowerCase();
        return aVal.localeCompare(bVal);
      },
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
      sorter: (a, b) => {
        const aVal = String(a.vardiya_giris || '').toLowerCase();
        const bVal = String(b.vardiya_giris || '').toLowerCase();
        return aVal.localeCompare(bVal);
      },
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
      sorter: (a, b) => {
        const aVal = String(a.vardiya_cikis || '').toLowerCase();
        const bVal = String(b.vardiya_cikis || '').toLowerCase();
        return aVal.localeCompare(bVal);
      },
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
      sorter: (a, b) => {
        const aVal = parseFloat(String(a.nc_suresi || '').replace(',', '.')) || 0;
        const bVal = parseFloat(String(b.nc_suresi || '').replace(',', '.')) || 0;
        return aVal - bVal;
      },
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
        title: 'Haftalık İzin',
        dataIndex: 'haftalik_izin',
        key: 'haftalik_izin',
        width: 80,
        sorter: (a, b) => {
          const aVal = parseFloat(String(a.haftalik_izin || '').replace(',', '.')) || 0;
          const bVal = parseFloat(String(b.haftalik_izin || '').replace(',', '.')) || 0;
          return aVal - bVal;
        },
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
        title: 'Resmi Tatil',
      dataIndex: 'resmi_tatil',
      key: 'resmi_tatil',
      width: 80,
      sorter: (a, b) => {
        const aVal = parseFloat(String(a.resmi_tatil || '').replace(',', '.')) || 0;
        const bVal = parseFloat(String(b.resmi_tatil || '').replace(',', '.')) || 0;
        return aVal - bVal;
      },
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
       sorter: (a, b) => {
         const aVal = parseFloat(String(a.fm_50 || '').replace(',', '.')) || 0;
         const bVal = parseFloat(String(b.fm_50 || '').replace(',', '.')) || 0;
         return aVal - bVal;
       },
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
       sorter: (a, b) => {
         const aVal = parseFloat(String(a.hfm_200 || '').replace(',', '.')) || 0;
         const bVal = parseFloat(String(b.hfm_200 || '').replace(',', '.')) || 0;
         return aVal - bVal;
       },
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
       title: 'Raporlu',
       dataIndex: 'raporlu',
       key: 'raporlu',
       width: 80,
       sorter: (a, b) => {
         const aVal = parseFloat(String(a.raporlu || '').replace(',', '.')) || 0;
         const bVal = parseFloat(String(b.raporlu || '').replace(',', '.')) || 0;
         return aVal - bVal;
       },
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
        sorter: (a, b) => {
          const aVal = parseFloat(String(a.devamsizlik_izni || '').replace(',', '.')) || 0;
          const bVal = parseFloat(String(b.devamsizlik_izni || '').replace(',', '.')) || 0;
          return aVal - bVal;
        },
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
       sorter: (a, b) => {
         const aVal = parseFloat(String(a.devamsiz || '').replace(',', '.')) || 0;
         const bVal = parseFloat(String(b.devamsiz || '').replace(',', '.')) || 0;
         return aVal - bVal;
       },
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
        width: 80,
        sorter: (a, b) => {
          const aVal = parseFloat(String(a.eksik_mesai || '').replace(',', '.')) || 0;
          const bVal = parseFloat(String(b.eksik_mesai || '').replace(',', '.')) || 0;
          return aVal - bVal;
        },
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
        title: 'Yıllık İzin',
        dataIndex: 'yillik_izin',
        key: 'yillik_izin',
        width: 80,
        sorter: (a, b) => {
          const aVal = parseFloat(String(a.yillik_izin || '').replace(',', '.')) || 0;
          const bVal = parseFloat(String(b.yillik_izin || '').replace(',', '.')) || 0;
          return aVal - bVal;
        },
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
        sorter: (a, b) => {
          const aVal = parseFloat(String(a.ucretsiz_izin || '').replace(',', '.')) || 0;
          const bVal = parseFloat(String(b.ucretsiz_izin || '').replace(',', '.')) || 0;
          return aVal - bVal;
        },
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
       title: 'Brüt Çalışılan Süre',
       dataIndex: 'burt_calisilan_sure',
       key: 'burt_calisilan_sure',
       width: 120,
      sorter: (a, b) => {
        const aVal = parseFloat(String(a.burt_calisilan_sure || '').replace(',', '.')) || 0;
        const bVal = parseFloat(String(b.burt_calisilan_sure || '').replace(',', '.')) || 0;
        return aVal - bVal;
      },
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
        sorter: (a, b) => {
          const aVal = parseFloat(String(a.net_calisilan_sure || '').replace(',', '.')) || 0;
          const bVal = parseFloat(String(b.net_calisilan_sure || '').replace(',', '.')) || 0;
          return aVal - bVal;
        },
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
        sorter: (a, b) => {
          // Tarih karşılaştırması
          const aDate = new Date(convertExcelSerialToDate(a.giris_zamani));
          const bDate = new Date(convertExcelSerialToDate(b.giris_zamani));
          return aDate - bDate;
        },
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
        sorter: (a, b) => {
          // Tarih karşılaştırması
          const aDate = new Date(convertExcelSerialToDate(a.cikis_zamani));
          const bDate = new Date(convertExcelSerialToDate(b.cikis_zamani));
          return aDate - bDate;
        },
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
        sorter: (a, b) => {
          const aVal = parseFloat(String(a.toplam_hesaplanan_sure || '').replace(',', '.')) || 0;
          const bVal = parseFloat(String(b.toplam_hesaplanan_sure || '').replace(',', '.')) || 0;
          return aVal - bVal;
        },
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
        sorter: (a, b) => {
          const aVal = parseFloat(String(a.kontrol_toplam_sure || '').replace(',', '.')) || 0;
          const bVal = parseFloat(String(b.kontrol_toplam_sure || '').replace(',', '.')) || 0;
          return aVal - bVal;
        },
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

    // Boş veya null değerleri filtrele
    filtered = filtered.filter(item => 
      item && 
      item.calisan && 
      item.sicil_no && 
      item.calisan.trim() !== '' && 
      item.sicil_no.toString().trim() !== ''
    );

          // Metin filtresi
     if (filterText && filterText.length > 0) {
       filtered = filtered.filter(item =>
         filterText.some(text => 
           item.calisan?.toLowerCase().includes(text.toLowerCase()) ||
           String(item.sicil_no || '').includes(text)
         )
       );
     }

    

         // Vardiya filtresi
     if (selectedShift !== 'all') {
       filtered = filtered.filter(item => item.vardiya_plani === selectedShift);
     }

     // Ay filtresi
     if (selectedAy !== 'all') {
       filtered = filtered.filter(item => item.ay === selectedAy);
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
    const uniqueValues = [...new Set(values)];
    return uniqueValues;
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
                    <Text style={{ display: 'block', marginTop: '20px', fontSize: '16px', color: '#666' }}>
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
                      format={(percent) => `${Math.round(percent)}%`} 
                      style={{ marginTop: '20px', maxWidth: '400px', margin: '20px auto 0' }}
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
        <Row gutter={16} align="middle" justify="space-between">
                     <Col span={16}>
             <Row gutter={16}>
               <Col span={8}>
                 {/* Personel Filtresi */}
                                  <Select
                    mode="multiple"
                    showSearch
                    placeholder="Personel seçin veya arayın..."
                    optionFilterProp="children"
                    style={{ width: '100%' }}
                    value={filterText}
                    onChange={setFilterText}
                    allowClear
                    notFoundContent="Personel bulunamadı"
                    filterOption={(input, option) =>
                      (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    styles={{
                      popup: {
                        root: {
                          zIndex: 1000
                        }
                      }
                    }}
                    getPopupContainer={(triggerNode) => triggerNode.parentNode}
                    maxTagCount="responsive"
                    maxTagTextLength={20}
                  >
                    {getUniqueValues('calisan').sort((a, b) => a.localeCompare(b, 'tr')).map(calisan => (
                      <Select.Option key={calisan} value={calisan}>
                        {calisan}
                      </Select.Option>
                    ))}
                  </Select>
               </Col>
               
               <Col span={4}>
                 <Select
                   placeholder="Ay"
                   value={selectedAy}
                   onChange={setSelectedAy}
                   style={{ width: '100%' }}
                   disabled={getUniqueValues('ay').length <= 1}
                 >
                   {getUniqueValues('ay').length > 1 && (
                     <Option value="all">Tüm Aylar</Option>
                   )}
                   {getUniqueValues('ay').sort((a, b) => a.localeCompare(b, 'tr')).map(ay => (
                     <Option key={ay} value={ay}>{ay}</Option>
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
                     <Option value="all">Tüm Vardiyalar</Option>
                   )}
                   {getUniqueValues('vardiya_plani').map(shift => (
                     <Option key={shift} value={shift}>{shift}</Option>
                   ))}
                 </Select>
               </Col>
             </Row>
           </Col>
          <Col span={8} style={{ textAlign: 'right' }}>
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
                 onClick={handleExcelDownload}
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
            description="Excel dosyası aşağıdaki sütunları içermelidir: Sicil No, Çalışan, Bölüm, Ünvan, Vardiya Planı, Vardiya Saatleri, Tarih, Ay, Vardiya Giriş, Vardiya Çıkış, N.Ç Süresi, Resmi Tatil, FM%50, HFM%200, Devamsızlık İzni, Devamsız, Eksik Mesai, Haftalık İzin, Yıllık İzin, Ücretli, Ücretsiz İzin, Raporlu, İş Kazası İzni, Telafi İzni, Bürt Çalışılan Süre, Net Çalışılan Süre, Giriş Zamanı, Çıkış Zamanı, Toplam Hesaplanan Süre, Hes. Katılmayan Süre, Günlük Net Çalışma, Kontrol Toplam Süre"
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

export default PuantajTakip; 