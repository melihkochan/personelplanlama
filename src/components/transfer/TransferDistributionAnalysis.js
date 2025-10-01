import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Table, 
  Select, 
  Button, 
  Progress, 
  Statistic,
  Tag,
  Space,
  Tooltip,
  Modal,
  Upload,
  message,
  Alert,
  Tabs,
  Spin,
  Divider,
  Input
} from 'antd';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Truck, 
  Users,
  Target,
  Award,
  AlertCircle,
  CheckCircle,
  Download,
  Upload as UploadIcon,
  Calendar,
  MapPin,
  UserCheck,
  FileSpreadsheet
} from 'lucide-react';
import { SearchOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { supabase } from '../../services/supabase';

const { Option } = Select;
const { Dragger } = Upload;
const { TabPane } = Tabs;

const TransferDistributionAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [selectedMonth, setSelectedMonth] = useState('current'); // İlk yüklemede güncel ay
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [distributionData, setDistributionData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [statistics, setStatistics] = useState({ totalKasa: 0, okutulanKasa: 0, okutmaOrani: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(200);
  const [loadingProgress, setLoadingProgress] = useState({ 
    current: 0, 
    total: 0, 
    percentage: 0, 
    startTime: null,
    estimatedTimeRemaining: null
  });

  // Aylar listesi - dinamik olarak veritabanından çek
  const [availableMonths, setAvailableMonths] = useState([]);
  // Bölgeler listesi - dinamik olarak veritabanından çek
  const [availableRegions, setAvailableRegions] = useState([]);
  
  const loadAvailableMonths = async () => {
    try {
      const { data, error } = await supabase
        .from('aktarma_dagitim_verileri')
        .select('ay')
        .order('ay', { ascending: true });

      if (error) {
        console.error('Ay listesi yükleme hatası:', error);
        return;
      }

      const uniqueMonths = [...new Set(data?.map(item => item.ay).filter(Boolean))];
      const monthNames = {
        '01': 'Ocak', '02': 'Şubat', '03': 'Mart', '04': 'Nisan',
        '05': 'Mayıs', '06': 'Haziran', '07': 'Temmuz', '08': 'Ağustos',
        '09': 'Eylül', '10': 'Ekim', '11': 'Kasım', '12': 'Aralık'
      };

      // Güncel ayı hesapla
      const currentMonth = new Date().getMonth() + 1;
      const currentMonthStr = String(currentMonth).padStart(2, '0');
      
      const monthList = [
        { value: 'current', label: `Güncel Ay (${monthNames[currentMonthStr] || 'Bilinmeyen'})` },
        { value: 'all', label: 'Tüm Aylar (Yavaş Yükleme)' },
        ...uniqueMonths.map(month => ({
          value: month,
          label: `${monthNames[month]} (${data.filter(item => item.ay === month).length} kayıt)`
        }))
      ];

      setAvailableMonths(monthList);
    } catch (error) {
      console.error('Ay listesi yükleme hatası:', error);
    }
  };

  const months = availableMonths;
  
  const loadAvailableRegions = async () => {
    try {
      const { data, error } = await supabase
        .from('aktarma_dagitim_verileri')
        .select('bolge')
        .order('bolge', { ascending: true });

      if (error) {
        console.error('Bölge listesi yükleme hatası:', error);
        return;
      }

      const uniqueRegions = [...new Set(data?.map(item => item.bolge).filter(Boolean))];
      
      const regionList = [
        { value: 'all', label: 'Tüm Bölgeler' },
        ...uniqueRegions.map(region => ({
          value: region,
          label: `${region} (${data.filter(item => item.bolge === region).length} kayıt)`
        }))
      ];

      setAvailableRegions(regionList);
    } catch (error) {
      console.error('Bölge listesi yükleme hatası:', error);
    }
  };

  const regions = availableRegions;

  // Ay adlarını döndüren fonksiyon
  const getMonthName = (monthNumber) => {
    const monthNames = {
      '01': 'Ocak', '02': 'Şubat', '03': 'Mart', '04': 'Nisan',
      '05': 'Mayıs', '06': 'Haziran', '07': 'Temmuz', '08': 'Ağustos',
      '09': 'Eylül', '10': 'Ekim', '11': 'Kasım', '12': 'Aralık'
    };
    return monthNames[monthNumber] || monthNumber;
  };

  // Zamanı formatla (saniye -> dakika:saniye)
  const formatTime = (seconds) => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}dk ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}sa ${minutes}dk`;
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([
        loadAvailableMonths(),
        loadAvailableRegions()
      ]);
      
      await loadDistributionData(selectedMonth, selectedRegion);
    };
    
    initializeData();
  }, []);

  // Ay seçimi değiştiğinde veri yenile
  const handleMonthChange = async (month) => {
    setSelectedMonth(month);
    setCurrentPage(1);
    
    await loadDistributionData(month, selectedRegion);
    
    // İstatistikleri güncelle
    const stats = loadStatistics();
    setStatistics(stats);
  };

  // Bölge seçimi değiştiğinde veri yenile
  const handleRegionChange = async (region) => {
    setSelectedRegion(region);
    setCurrentPage(1);
    
    await loadDistributionData(selectedMonth, region);
    
    // İstatistikleri güncelle
    const stats = loadStatistics();
    setStatistics(stats);
  };

  // İstatistikleri hesapla (mevcut distributionData'dan)
  const loadStatistics = (data = distributionData) => {
    const totalKasa = data.reduce((sum, item) => sum + (item.toplam_kasa || 0), 0);
    const okutulanKasa = data.reduce((sum, item) => sum + (item.okutulan_kasa || 0), 0);
    const okutmaOrani = totalKasa > 0 ? Math.round((okutulanKasa / totalKasa) * 100 * 10) / 10 : 0;

    return { totalKasa, okutulanKasa, okutmaOrani };
  };

  // Ay ve bölge filtrelerini güncelle (veri yüklendikten sonra)
  const updateAvailableFilters = async (data) => {
    try {
      // Aylar listesi güncelle
      const uniqueMonths = [...new Set(data?.map(item => item.ay).filter(Boolean))];
      const monthNames = {
        '01': 'Ocak', '02': 'Şubat', '03': 'Mart', '04': 'Nisan',
        '05': 'Mayıs', '06': 'Haziran', '07': 'Temmuz', '08': 'Ağustos',
        '09': 'Eylül', '10': 'Ekim', '11': 'Kasım', '12': 'Aralık'
      };

      const monthList = [
        { value: 'all', label: 'Tüm Aylar' },
        ...uniqueMonths.map(month => ({
          value: month,
          label: `${monthNames[month]} (${data.filter(item => item.ay === month).length} kayıt)`
        }))
      ];

      setAvailableMonths(monthList);

      // Bölgeler listesi güncelle
      const uniqueRegions = [...new Set(data?.map(item => item.bolge).filter(Boolean))];
      
      const regionList = [
        { value: 'all', label: 'Tüm Bölgeler' },
        ...uniqueRegions.map(region => ({
          value: region,
          label: `${region} (${data.filter(item => item.bolge === region).length} kayıt)`
        }))
      ];

      setAvailableRegions(regionList);

    } catch (error) {
      console.error('Filtre güncelleme hatası:', error);
    }
  };

  // Toplam kayıt sayısını çek (istatistikler için)
  const loadTotalCount = async (month = 'all', region = 'all') => {
    try {
      let query = supabase
        .from('aktarma_dagitim_verileri')
        .select('*', { count: 'exact', head: true });

      if (month !== 'all') {
        query = query.eq('ay', month);
      }
      if (region !== 'all') {
        query = query.eq('bolge', region);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Toplam sayı alma hatası:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Toplam sayı alma hatası:', error);
      return 0;
    }
  };

  // Eski loadStatistics fonksiyonu kaldırıldı - artık loadStatistics() kullanıyoruz

  // Verileri yükle (hızlı - sadece seçilen ay)
  const loadDistributionData = async (month = 'current', region = 'all') => {
    setLoading(true);
    try {
      // Supabase tablosunun varlığını kontrol et
      const { error: checkError } = await supabase
        .from('aktarma_dagitim_verileri')
        .select('*')
        .limit(1);

      if (checkError) {
        console.warn('Supabase tablosu bulunamadı! SQL dosyasını çalıştırın.');
        return;
      }

      // AKILLI AY SEÇİMİ: Önce güncel ayın verilerini kontrol et
      let targetMonth = month === 'current' ? 
        String(new Date().getMonth() + 1).padStart(2, '0') : 
        month;
      
      // Eğer güncel ay seçiliyse, önce o ayın verisi var mı kontrol et
      if (month === 'current') {
        const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
        
        // Güncel ay için veri sayısını kontrol et
        const { count: currentMonthCount, error: countError } = await supabase
          .from('aktarma_dagitim_verileri')
          .select('*', { count: 'exact', head: true })
          .eq('ay', currentMonth);
        
        if (countError) {
          console.error('Güncel ay veri kontrolü hatası:', countError);
        } else if (!currentMonthCount || currentMonthCount === 0) {
          // Güncel ayın verisi yok, en son verisi olan ayı bul
          console.log('⚠️ Güncel ayın verisi yok, en son verisi olan ay aranıyor...');
          
          const { data: monthsData, error: monthsError } = await supabase
            .from('aktarma_dagitim_verileri')
            .select('ay')
            .order('ay', { ascending: false });
          
          if (monthsError) {
            console.error('Ay listesi alma hatası:', monthsError);
          } else if (monthsData && monthsData.length > 0) {
            // En son ayı al
            const latestMonth = monthsData[0].ay;
            targetMonth = latestMonth;
            console.log(`✅ En son verisi olan ay bulundu: ${latestMonth}`);
            
            // UI'da seçilen ayı güncelle (kullanıcıya göster)
            setSelectedMonth(latestMonth);
          }
        } else {
          console.log(`✅ Güncel ayın verisi bulundu: ${currentMonth} (${currentMonthCount} kayıt)`);
        }
      }

      // Önce toplam sayıyı al
      let countQuery = supabase
        .from('aktarma_dagitim_verileri')
        .select('*', { count: 'exact', head: true });

      if (month !== 'all') {
        countQuery = countQuery.eq('ay', targetMonth);
      }
      if (region !== 'all') {
        countQuery = countQuery.eq('bolge', region);
      }

      const { count, error: countError } = await countQuery;
      if (countError) {
        console.error('Toplam sayı alma hatası:', countError);
        return;
      }

      // Progress başlangıcı
      const startTime = Date.now();
      setLoadingProgress({ 
        current: 0, 
        total: count, 
        percentage: 0, 
        startTime: startTime,
        estimatedTimeRemaining: null
      });

      // Verileri batch'ler halinde çek - SADECE SEÇİLEN AY
      const batchSize = month === 'all' ? 1000 : 2000; // Tüm aylar için daha küçük batch
      let allData = [];
      
      for (let offset = 0; offset < count; offset += batchSize) {
        let query = supabase
          .from('aktarma_dagitim_verileri')
          .select('*')
          .order('tarih', { ascending: true });

        // Filtreleme uygula
        if (month !== 'all') {
          query = query.eq('ay', targetMonth);
        }
        if (region !== 'all') {
          query = query.eq('bolge', region);
        }

        // Batch aralığı uygula
        query = query.range(offset, offset + batchSize - 1);

        const { data, error } = await query;

        if (error) {
          console.error(`Batch ${offset}-${offset + batchSize} hatası:`, error);
          break;
        }

        allData = [...allData, ...(data || [])];
        
        // Progress güncelle
        const percentage = Math.round((allData.length/count)*100);
        
        // Tahmini bitiş süresi hesapla
        let estimatedTimeRemaining = null;
        if (percentage > 5 && startTime) { // %5'ten sonra hesapla
          const elapsedTime = Date.now() - startTime;
          const recordsPerSecond = allData.length / (elapsedTime / 1000);
          const remainingRecords = count - allData.length;
          estimatedTimeRemaining = Math.round(remainingRecords / recordsPerSecond);
        }
        
        setLoadingProgress({ 
          current: allData.length, 
          total: count, 
          percentage: percentage,
          startTime: startTime,
          estimatedTimeRemaining: estimatedTimeRemaining
        });
      }
      setDistributionData(allData);
      setFilteredData(allData);
      
      // İstatistikleri güncelle (allData kullanarak)
      const stats = loadStatistics(allData);
      setStatistics(stats);
      
      // Ay ve bölge listelerini güncelle
      await updateAvailableFilters(allData);
      
      // Yükleme tamamlandı
      setLoadingProgress({ 
        current: 0, 
        total: 0, 
        percentage: 0, 
        startTime: null,
        estimatedTimeRemaining: null
      });
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      message.error('Veri yüklenirken hata oluştu!');
      setLoadingProgress({ 
        current: 0, 
        total: 0, 
        percentage: 0, 
        startTime: null,
        estimatedTimeRemaining: null
      });
    }
    setLoading(false);
  };

  // Excel yükleme fonksiyonu
  const handleExcelUpload = async (file) => {
    setUploadLoading(true);
    setUploadProgress({ current: 0, total: 0 });
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const fileData = new Uint8Array(e.target.result);
        const workbook = XLSX.read(fileData, { type: 'array' });
        
        let allData = [];
        
        // Tüm sheet'leri işle
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          // Veri işleme - güvenli integer dönüşümü
          const processedData = jsonData.map((row, index) => {
            // Tarih işleme - sheet adından tarih çek (TÜM AYLAR DESTEĞİ)
            let tarih = null;
            try {
              // Ay isimleri ve numaraları
              const ayMap = {
                'Ocak': '01', 'Şubat': '02', 'Mart': '03', 'Nisan': '04',
                'Mayıs': '05', 'Haziran': '06', 'Temmuz': '07', 'Ağustos': '08',
                'Eylül': '09', 'Ekim': '10', 'Kasım': '11', 'Aralık': '12'
              };
              
              // Sheet adından tarih çıkarma - tüm aylar için
              let sheetDate = null;
              let foundMonth = null;
              let foundDay = null;
              
              // Tüm ayları kontrol et
              for (const [ayAdi, ayNumarasi] of Object.entries(ayMap)) {
                // Farklı formatları dene: "1 Ocak", "Ocak 1", "1Ocak"
                const patterns = [
                  new RegExp(`(\\d+)\\s+${ayAdi}`),
                  new RegExp(`${ayAdi}\\s+(\\d+)`),
                  new RegExp(`(\\d+)\\s*${ayAdi}`)
                ];
                
                for (const pattern of patterns) {
                  const match = sheetName.match(pattern);
                  if (match) {
                    foundDay = parseInt(match[1]);
                    foundMonth = ayNumarasi;
                    break;
                  }
                }
                if (foundMonth) break;
              }
              
              if (foundMonth && foundDay) {
                tarih = new Date(`2025-${foundMonth}-${foundDay.toString().padStart(2, '0')}`);
              } else if (row['Çıkış Tarihi']) {
                // Fallback: Excel'deki tarih
                const tarihStr = row['Çıkış Tarihi'].toString();
                if (tarihStr.includes('.')) {
                  const parts = tarihStr.split('.');
                  if (parts.length === 3) {
                    tarih = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
                  }
                }
              }
              
              // Eğer hala tarih yoksa, sheet adını log'la
              if (!tarih) {
                console.warn(`Tarih çıkarılamadı - Sheet: "${sheetName}", Excel tarih: "${row['Çıkış Tarihi']}"`);
                tarih = new Date(); // Son çare
              }
            } catch (e) {
              console.warn('Tarih işleme hatası:', e);
              tarih = new Date(); // Son çare
            }

            // Güvenli integer dönüşümü
            const safeParseInt = (value, defaultValue = 0) => {
              if (!value || value === '') return defaultValue;
              const parsed = parseInt(value.toString().replace(/[^\d]/g, ''));
              return isNaN(parsed) || parsed > 2147483647 ? defaultValue : parsed;
            };

            const toplamKasa = safeParseInt(row['Toplam Kasa']);
            const okutulanKasa = safeParseInt(row['Okutulan Kasa']);
            const okutmaOrani = toplamKasa > 0 ? 
              Math.round((okutulanKasa / toplamKasa) * 100 * 10) / 10 : 0;
            
            return {
              // ID'yi kaldırıyoruz, Supabase otomatik oluşturacak
              tarih: tarih.toISOString().split('T')[0],
              ay: tarih.toISOString().substring(5, 7),
              siparis_no: (row['Sipariş No'] || '').toString(),
              st_numarasi: (row['ST NUMARASI'] || '').toString(),
              magaza_kodu: (row['Mağaza Kodu'] || '').toString(),
              magaza_adi: (row['Mağaza Adı'] || '').toString(),
              bolge: (row['BÖLGE'] || '').toString(),
              buyuk_gri_kasa: safeParseInt(row['BÜYÜK GRİ KASA']),
              kucuk_gri_kasa: safeParseInt(row['KÜÇÜK GRİ KASA']),
              sevk_kolisi: safeParseInt(row['Sevk Kolisi']),
              toplam_kasa: toplamKasa,
              dagitim: (row['Dağıtım'] || '').toString(),
              okutulan_kasa: okutulanKasa,
              okutulmayan_kasa: safeParseInt(row['Okutulmayan Kasa']),
              toplam_sevk: (row['Toplam Sevk'] || '').toString(),
              magaza_okutulan: safeParseInt(row['Mağaza Okutulan']),
              magaza_okutulmayan: safeParseInt(row['Okutulmayan']),
              okutma_orani: okutmaOrani,
              aciklama: (row['Açıklama'] || '').toString(),
              plaka: (row['Plaka'] || '').toString(),
              sicil_no_personel1: (row['Sicil No-Personel1'] || '').toString(),
              personel1: (row['Personel1'] || '').toString(),
              sicil_no_personel2: (row['Sicil No-Personel2'] || '').toString(),
              personel2: (row['Personel2'] || '').toString(),
              sicil_no_personel3: (row['Sicil No-Personel3'] || '').toString(),
              personel3: (row['Personel3'] || '').toString()
            };
          });
          
          allData = [...allData, ...processedData];
        });

        // Supabase'e kaydet - batch işlemi
        if (allData.length > 0) {
          // Önce tablo var mı kontrol et
          const { error: checkError } = await supabase
            .from('aktarma_dagitim_verileri')
            .select('*')
            .limit(1);

          if (checkError) {
            message.error('Supabase tablosu bulunamadı! Önce SQL dosyasını çalıştırın.');
            console.error('Tablo kontrol hatası:', checkError);
            return;
          }

          const batchSize = 25; // Batch boyutunu daha da küçültüyoruz
          let successCount = 0;
          let errorCount = 0;
          const totalBatches = Math.ceil(allData.length / batchSize);
          
          for (let i = 0; i < allData.length; i += batchSize) {
            const batch = allData.slice(i, i + batchSize);
            const currentBatch = Math.floor(i / batchSize) + 1;
            
            // Progress güncelle
            setUploadProgress({ current: currentBatch, total: totalBatches });
            
            try {
              const { error } = await supabase
                .from('aktarma_dagitim_verileri')
                .insert(batch);

              if (error) {
                console.error(`Batch ${i}-${i + batch.length} hatası:`, error);
                errorCount++;
              } else {
                successCount += batch.length;
              }
            } catch (err) {
              console.error(`Batch ${i}-${i + batch.length} exception:`, err);
              errorCount++;
            }
          }

          if (successCount > 0) {
            message.success(`${successCount} kayıt başarıyla yüklendi! (Toplam ${allData.length} kayıt işlendi)`);
            if (errorCount > 0) {
              message.warning(`${errorCount} batch'te hata oluştu. ${successCount}/${allData.length} kayıt başarılı.`);
            }
            // Veri yüklendikten sonra verileri yenile
            setCurrentPage(1);
            await loadDistributionData(selectedMonth, selectedRegion);
          } else {
            message.error(`Hiçbir kayıt yüklenemedi! (${allData.length} kayıt işlendi, ${errorCount} batch hatası)`);
          }
        } else {
          message.warning('İşlenecek veri bulunamadı!');
        }
      } catch (error) {
        console.error('Excel yükleme hatası:', error);
        message.error(`Excel dosyası işlenirken hata oluştu: ${error.message}`);
      }
      setUploadLoading(false);
      setUploadProgress({ current: 0, total: 0 });
    };
    
    reader.readAsArrayBuffer(file);
    return false;
  };

  // Rapor indirme fonksiyonu
  const handleDownloadReport = async () => {
    try {
      if (!filteredData || filteredData.length === 0) {
        message.warning('İndirilecek veri bulunamadı!');
        return;
      }

      // Excel raporu oluştur
      const worksheet = XLSX.utils.json_to_sheet(
        filteredData.map(record => ({
          'Tarih': record.tarih,
          'Mağaza Kodu': record.magaza_kodu,
          'Mağaza Adı': record.magaza_adi,
          'Bölge': record.bolge,
          'Toplam Kasa': record.toplam_kasa,
          'Okutulan Kasa': record.okutulan_kasa,
          'Okutulmayan Kasa': record.okutulmayan_kasa,
          'Personel 1': record.sicil_no_personel1,
          'Personel 2': record.sicil_no_personel2,
          'Personel 3': record.sicil_no_personel3,
          'Plaka': record.plaka,
          'Ay': record.ay
        }))
      );

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Aktarma Dağıtım Analizi');

      // Dosyayı indir
      const monthText = selectedMonth === 'all' ? 'tum_aylar' : 
        availableMonths.find(m => m.value === selectedMonth)?.label?.split(' ')[0] || selectedMonth;
      const regionText = selectedRegion === 'all' ? 'tum_bolgeler' : selectedRegion;
      const fileName = `aktarma_dagitim_analizi_${monthText}_${regionText}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      message.success('Rapor başarıyla indirildi!');
    } catch (error) {
      console.error('Rapor indirme hatası:', error);
      message.error('Rapor indirilirken hata oluştu!');
    }
  };

  // Bölge renkleri
  const getRegionColor = (region) => {
    const regionColors = {
      'İSTANBUL - AVR': 'blue',
      'İSTANBUL - ASY': 'cyan', 
      'İSTANBUL': 'geekblue',
      'ANKARA': 'green',
      'İZMİR': 'orange',
      'BURSA': 'purple',
      'GAZİANTEP': 'red',
      'ANTALYA': 'lime',
      'ADANA': 'gold',
      'KONYA': 'volcano',
      'TRABZON': 'magenta',
      'ESKİŞEHİR': 'processing',
      'MERSİN': 'success',
      'KAYSERİ': 'warning',
      'SAMSUN': 'error',
      'DENİZLİ': 'default'
    };
    const firstWord = region?.split(' ')[0] || '';
    return regionColors[region] || regionColors[firstWord] || 'default';
  };

  // Tablo sütunları
  const columns = [
    {
      title: 'Tarih',
      dataIndex: 'tarih',
      key: 'tarih',
      width: 90,
      sorter: (a, b) => {
        const dateA = new Date(a.tarih);
        const dateB = new Date(b.tarih);
        return dateA.getTime() - dateB.getTime();
      },
      defaultSortOrder: 'ascend',
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Tarih ara (GG.AA.YYYY)"
            value={selectedKeys[0]}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Ara
            </Button>
            <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
              Temizle
            </Button>
          </Space>
        </div>
      ),
      filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
      onFilter: (value, record) => {
        const dateStr = new Date(record.tarih).toLocaleDateString('tr-TR');
        return dateStr.toLowerCase().includes(value.toLowerCase());
      },
      render: (text, record) => (
        <div className="text-xs">
          <div className="font-medium">
            {new Date(text).toLocaleDateString('tr-TR')}
          </div>
          <div className="text-gray-500">
            {getMonthName(record.ay)}
          </div>
        </div>
      )
    },
    {
      title: 'Mağaza Kodu',
      dataIndex: 'magaza_kodu',
      key: 'magaza_kodu',
      width: 100,
      sorter: (a, b) => (a.magaza_kodu || '').localeCompare(b.magaza_kodu || ''),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Mağaza kodu ara"
            value={selectedKeys[0]}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Ara
            </Button>
            <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
              Temizle
            </Button>
          </Space>
        </div>
      ),
      filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
      onFilter: (value, record) => 
        record.magaza_kodu?.toLowerCase().includes(value.toLowerCase()),
      render: (text) => (
        <div className="text-xs text-gray-500">{text}</div>
      )
    },
    {
      title: 'Mağaza Adı',
      dataIndex: 'magaza_adi',
      key: 'magaza_adi',
      width: 120,
      sorter: (a, b) => (a.magaza_adi || '').localeCompare(b.magaza_adi || ''),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Mağaza adı ara"
            value={selectedKeys[0]}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Ara
            </Button>
            <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
              Temizle
            </Button>
          </Space>
        </div>
      ),
      filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
      onFilter: (value, record) => 
        record.magaza_adi?.toLowerCase().includes(value.toLowerCase()),
      render: (text) => (
        <div className="text-xs font-medium truncate">{text}</div>
      )
    },
    {
      title: 'Bölge',
      dataIndex: 'bolge',
      key: 'bolge',
      width: 100,
      sorter: (a, b) => (a.bolge || '').localeCompare(b.bolge || ''),
      filters: availableRegions.filter(r => r.value !== 'all').map(r => ({
        text: r.value,
        value: r.value
      })),
      onFilter: (value, record) => record.bolge === value,
      render: (text) => (
        <Tag color={getRegionColor(text)} className="text-xs">
          {text || 'N/A'}
        </Tag>
      )
    },
    {
      title: 'Kasa Dağılımı',
      key: 'kasa_dagilimi',
      width: 120,
      render: (_, record) => (
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Büyük:</span>
            <span className="font-medium">{record.buyuk_gri_kasa}</span>
          </div>
          <div className="flex justify-between">
            <span>Küçük:</span>
            <span className="font-medium">{record.kucuk_gri_kasa}</span>
          </div>
          <div className="flex justify-between">
            <span>Koli:</span>
            <span className="font-medium">{record.sevk_kolisi}</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-1">
            <span>Toplam:</span>
            <span className="text-blue-600">{record.toplam_kasa}</span>
          </div>
        </div>
      )
    },
    {
      title: 'Okutma Durumu',
      key: 'okutma_durumu',
      width: 100,
      render: (_, record) => (
        <div className="text-center">
          <div className="relative bg-gray-200 rounded-full h-2 w-full mb-1">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                record.okutma_orani > 95 ? 'bg-green-500' : 
                record.okutma_orani > 90 ? 'bg-blue-500' : 
                record.okutma_orani > 80 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(record.okutma_orani, 100)}%` }}
            />
          </div>
          <div className="text-xs font-medium">
            {record.okutulan_kasa}/{record.toplam_kasa}
          </div>
          <div className="text-xs text-gray-500">
            {record.okutma_orani}%
          </div>
        </div>
      )
    },
    {
      title: 'Personel',
      key: 'personel',
      width: 140,
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Personel ara"
            value={selectedKeys[0]}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Ara
            </Button>
            <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
              Temizle
            </Button>
          </Space>
        </div>
      ),
      filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
      onFilter: (value, record) => {
        const allPersonnel = [
          record.personel1,
          record.personel2, 
          record.personel3,
          record.sicil_no_personel1,
          record.sicil_no_personel2,
          record.sicil_no_personel3
        ].filter(Boolean).join(' ').toLowerCase();
        return allPersonnel.includes(value.toLowerCase());
      },
      render: (_, record) => (
        <div className="space-y-0.5">
          {record.personel1 && (
            <div className="text-xs">
              <span className="font-medium">{record.personel1}</span>
              <span className="text-gray-500 ml-1">({record.sicil_no_personel1})</span>
            </div>
          )}
          {record.personel2 && (
            <div className="text-xs">
              <span className="font-medium">{record.personel2}</span>
              <span className="text-gray-500 ml-1">({record.sicil_no_personel2})</span>
            </div>
          )}
          {record.personel3 && record.personel3 !== '0' && (
            <div className="text-xs">
              <span className="font-medium">{record.personel3}</span>
              <span className="text-gray-500 ml-1">({record.sicil_no_personel3})</span>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Plaka',
      dataIndex: 'plaka',
      key: 'plaka',
      width: 80,
      sorter: (a, b) => (a.plaka || '').localeCompare(b.plaka || ''),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Plaka ara"
            value={selectedKeys[0]}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              Ara
            </Button>
            <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
              Temizle
            </Button>
          </Space>
        </div>
      ),
      filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
      onFilter: (value, record) => 
        record.plaka?.toLowerCase().includes(value.toLowerCase()),
      render: (text) => (
        <span className="font-mono text-xs">
          {text || '-'}
        </span>
      )
    },
    {
      title: 'Dağıtım',
      dataIndex: 'dagitim',
      key: 'dagitim',
      width: 70,
      sorter: (a, b) => (a.dagitim || '').localeCompare(b.dagitim || ''),
      filters: [
        { text: 'GECE', value: 'GECE' },
        { text: 'GÜNDÜZ', value: 'GÜNDÜZ' }
      ],
      onFilter: (value, record) => record.dagitim === value,
      render: (text) => (
        <Tag color={text === 'GECE' ? 'purple' : 'blue'} className="text-xs">
          {text}
        </Tag>
      )
    }
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center mb-1">
                <BarChart3 className="w-6 h-6 mr-3 text-blue-600" />
                Aktarma Dağıtım Analizi
              </h2>
              <p className="text-gray-600 text-sm">Aylık dağıtım verilerinin analizi ve performans takibi</p>
            </div>
            <div className="flex space-x-2">
              <Button 
                icon={<Download className="w-4 h-4" />}
                onClick={handleDownloadReport}
                className="bg-green-600 hover:bg-green-700 border-green-600 hover:border-green-700 text-white"
                size="default"
              >
                Rapor İndir
              </Button>
              <Upload
                accept=".xlsx,.xls"
                beforeUpload={handleExcelUpload}
                showUploadList={false}
              >
                <Button 
                  icon={<UploadIcon className="w-4 h-4" />}
                  loading={uploadLoading}
                  className="bg-orange-500 hover:bg-orange-600 border-orange-500 hover:border-orange-600 text-white"
                  size="default"
                >
                  Excel Yükle
                </Button>
              </Upload>
            </div>
          </div>
          
          {uploadLoading && uploadProgress.total > 0 && (
            <div className="mb-4">
              <Progress 
                percent={Math.round((uploadProgress.current / uploadProgress.total) * 100)}
                size="small"
                strokeColor="#f97316"
              />
              <div className="text-xs text-gray-600 text-center mt-1">
                {uploadProgress.current} / {uploadProgress.total} batch işlendi
              </div>
            </div>
          )}

          {/* Filtreler */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select
              placeholder="Ay Seçin"
              value={selectedMonth}
              onChange={handleMonthChange}
              className="w-full h-10"
              size="default"
            >
              {months.map(month => (
                <Option 
                  key={month.value} 
                  value={month.value}
                  disabled={month.disabled}
                >
                  {month.label} {month.disabled && '(Veri Yok)'}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="Bölge Seçin"
              value={selectedRegion}
              onChange={handleRegionChange}
              className="w-full h-10"
              size="default"
            >
              {regions.map(region => (
                <Option key={region.value} value={region.value}>{region.label}</Option>
              ))}
            </Select>
          </div>
        </div>

        {/* İstatistikler */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={6}>
              <Card className="text-center border-0 shadow-md hover:shadow-lg transition-shadow duration-300 bg-gradient-to-br from-blue-50 to-blue-100" bodyStyle={{ padding: '12px' }}>
                <Statistic
                  title={<span className="text-gray-600 font-medium text-xs">Toplam Kayıt</span>}
                  value={distributionData.length.toLocaleString('tr-TR')}
                  valueStyle={{ color: '#1890ff', fontSize: '18px', fontWeight: 'bold' }}
                  prefix={<FileSpreadsheet className="w-4 h-4 text-blue-600" />}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {selectedMonth === 'all' ? 'Tüm aylar' : `${getMonthName(selectedMonth)} ayı`}
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="text-center border-0 shadow-md hover:shadow-lg transition-shadow duration-300 bg-gradient-to-br from-green-50 to-green-100" bodyStyle={{ padding: '12px' }}>
                <Statistic
                  title={<span className="text-gray-600 font-medium text-xs">Toplam Kasa</span>}
                  value={statistics.totalKasa.toLocaleString('tr-TR')}
                  valueStyle={{ color: '#52c41a', fontSize: '18px', fontWeight: 'bold' }}
                  prefix={<Package className="w-4 h-4 text-green-600" />}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {selectedMonth === 'all' ? 'Tüm aylar toplamı' : `${getMonthName(selectedMonth)} ayı toplamı`}
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="text-center border-0 shadow-md hover:shadow-lg transition-shadow duration-300 bg-gradient-to-br from-purple-50 to-purple-100" bodyStyle={{ padding: '12px' }}>
                <Statistic
                  title={<span className="text-gray-600 font-medium text-xs">Okutulan Kasa</span>}
                  value={statistics.okutulanKasa.toLocaleString('tr-TR')}
                  valueStyle={{ color: '#722ed1', fontSize: '18px', fontWeight: 'bold' }}
                  prefix={<CheckCircle className="w-4 h-4 text-purple-600" />}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {selectedMonth === 'all' ? 'Tüm aylar toplamı' : `${getMonthName(selectedMonth)} ayı toplamı`}
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="text-center border-0 shadow-md hover:shadow-lg transition-shadow duration-300 bg-gradient-to-br from-orange-50 to-orange-100" bodyStyle={{ padding: '12px' }}>
                <Statistic
                  title={<span className="text-gray-600 font-medium text-xs">Ortalama Okutma Oranı</span>}
                  value={statistics.okutmaOrani}
                  suffix="%"
                  valueStyle={{ color: '#fa8c16', fontSize: '18px', fontWeight: 'bold' }}
                  prefix={<Target className="w-4 h-4 text-orange-600" />}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {selectedMonth === 'all' ? 'Tüm aylar ortalaması' : `${getMonthName(selectedMonth)} ayı ortalaması`}
                </div>
              </Card>
            </Col>
          </Row>
        </div>

          {/* Tablo */}
          <div className="p-4">
            {/* Yükleme Progress Bar */}
            {loading && loadingProgress.total > 0 && (
              <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-blue-800">Veriler Yükleniyor</h3>
                      <p className="text-sm text-blue-600">
                        {loadingProgress.current.toLocaleString('tr-TR')} / {loadingProgress.total.toLocaleString('tr-TR')} kayıt
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-800">{loadingProgress.percentage}%</div>
                    <div className="text-sm text-blue-600">
                      {loadingProgress.estimatedTimeRemaining ? 
                        `Tahmini kalan: ${formatTime(loadingProgress.estimatedTimeRemaining)}` : 
                        'Tamamlandı'
                      }
                    </div>
                  </div>
                    </div>
                    
                <div className="relative">
                  <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${loadingProgress.percentage}%` }}
                    />
                      </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                  </div>

                <div className="mt-3 text-center">
                  <div className="text-sm text-blue-700">
                    {selectedMonth === 'all' && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-2">
                        <p className="text-yellow-800 text-xs">
                          <strong>Uyarı:</strong> Tüm ayların verileri yükleniyor. Bu işlem biraz zaman alabilir.
                        </p>
                      </div>
                    )}
                    {loadingProgress.percentage < 25 && "Veriler hazırlanıyor..."}
                    {loadingProgress.percentage >= 25 && loadingProgress.percentage < 50 && "Veriler yükleniyor..."}
                    {loadingProgress.percentage >= 50 && loadingProgress.percentage < 75 && "Neredeyse tamamlandı..."}
                    {loadingProgress.percentage >= 75 && "Son kontroller yapılıyor..."}
                  </div>
                </div>
        </div>
            )}
            
            <Spin spinning={loading}>
          <Table
              columns={columns}
              dataSource={filteredData}
            rowKey="id"
              pagination={{
                pageSize: 100,
                total: distributionData.length,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} / ${distributionData.length.toLocaleString('tr-TR')} kayıt`,
                pageSizeOptions: ['50', '100', '200', '500'],
                size: 'default'
              }}
              defaultSortOrder={['ascend']}
              sortDirections={['ascend', 'descend']}
              loading={loading}
              scroll={{ x: 900 }}
              size="small"
              className="modern-table"
            />
          </Spin>
        </div>
      </div>
    </div>
  );
};

export default TransferDistributionAnalysis;