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
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [distributionData, setDistributionData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [statistics, setStatistics] = useState({ totalKasa: 0, okutulanKasa: 0, okutmaOrani: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(200);

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

      const monthList = [
        { value: 'all', label: 'Tüm Aylar' },
        ...uniqueMonths.map(month => ({
          value: month,
          label: `${monthNames[month]} (${data.filter(item => item.ay === month).length} kayıt)`
        }))
      ];

      setAvailableMonths(monthList);
      console.log('Mevcut aylar:', uniqueMonths);
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
      console.log('Mevcut bölgeler:', uniqueRegions);
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

  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([
        loadAvailableMonths(),
        loadAvailableRegions()
      ]);
      
      const [count, stats] = await Promise.all([
        loadTotalCount(selectedMonth, selectedRegion),
        loadStatistics(selectedMonth, selectedRegion)
      ]);
      
      setTotalCount(count);
      setStatistics(stats);
      await loadDistributionData(1, selectedMonth, selectedRegion);
    };
    
    initializeData();
  }, []);

  // Ay seçimi değiştiğinde veri yenile
  const handleMonthChange = async (month) => {
    setSelectedMonth(month);
    setCurrentPage(1);
    
    const [count, stats] = await Promise.all([
      loadTotalCount(month, selectedRegion),
      loadStatistics(month, selectedRegion)
    ]);
    
    setTotalCount(count);
    setStatistics(stats);
    await loadDistributionData(1, month, selectedRegion);
  };

  // Bölge seçimi değiştiğinde veri yenile
  const handleRegionChange = async (region) => {
    setSelectedRegion(region);
    setCurrentPage(1);
    
    const [count, stats] = await Promise.all([
      loadTotalCount(selectedMonth, region),
      loadStatistics(selectedMonth, region)
    ]);
    
    setTotalCount(count);
    setStatistics(stats);
    await loadDistributionData(1, selectedMonth, region);
  };

  // Sayfa değişikliği
  const handlePageChange = async (page) => {
    setCurrentPage(page);
    await loadDistributionData(page, selectedMonth, selectedRegion);
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

  // İstatistik verilerini çek (toplam kasa, okutulan vs.)
  const loadStatistics = async (month = 'all', region = 'all') => {
    try {
      let query = supabase
        .from('aktarma_dagitim_verileri')
        .select('toplam_kasa, okutulan_kasa');

      if (month !== 'all') {
        query = query.eq('ay', month);
      }
      if (region !== 'all') {
        query = query.eq('bolge', region);
      }

      const { data, error } = await query;

      if (error) {
        console.error('İstatistik verisi alma hatası:', error);
        return { totalKasa: 0, okutulanKasa: 0, okutmaOrani: 0 };
      }

      const totalKasa = data?.reduce((sum, record) => sum + (record.toplam_kasa || 0), 0) || 0;
      const okutulanKasa = data?.reduce((sum, record) => sum + (record.okutulan_kasa || 0), 0) || 0;
      const okutmaOrani = totalKasa > 0 ? Math.round((okutulanKasa / totalKasa) * 100 * 10) / 10 : 0;

      return { totalKasa, okutulanKasa, okutmaOrani };
    } catch (error) {
      console.error('İstatistik verisi alma hatası:', error);
      return { totalKasa: 0, okutulanKasa: 0, okutmaOrani: 0 };
    }
  };

  // Sayfa bazında veri yükleme (lazy loading)
  const loadDistributionData = async (page = 1, month = 'all', region = 'all') => {
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

      // Sadece mevcut sayfa için veri çek
      let query = supabase
        .from('aktarma_dagitim_verileri')
        .select('*')
        .order('tarih', { ascending: true });

      // Filtreleme uygula
      if (month !== 'all') {
        query = query.eq('ay', month);
      }
      if (region !== 'all') {
        query = query.eq('bolge', region);
      }

      // Sayfalama uygula
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error } = await query;

      if (error) {
        console.error('Veri yükleme hatası:', error);
        message.error('Veri yüklenirken hata oluştu!');
        return;
      }

      setDistributionData(data || []);
      setFilteredData(data || []);
      console.log(`Sayfa ${page}: ${data?.length || 0} kayıt yüklendi`);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      message.error('Veri yüklenirken hata oluştu!');
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
                console.log(`Sheet: ${sheetName} -> Tarih: 2025-${foundMonth}-${foundDay.toString().padStart(2, '0')}`);
              } else if (row['Çıkış Tarihi']) {
                // Fallback: Excel'deki tarih
                const tarihStr = row['Çıkış Tarihi'].toString();
                if (tarihStr.includes('.')) {
                  const parts = tarihStr.split('.');
                  if (parts.length === 3) {
                    tarih = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
                    console.log(`Excel tarih: ${tarihStr} -> ${tarih.toISOString().split('T')[0]}`);
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
            // Veri yüklendikten sonra sayfa 1'e dön ve verileri yenile
            setCurrentPage(1);
            await Promise.all([
              loadAvailableMonths(),
              loadAvailableRegions()
            ]);
            const [count, stats] = await Promise.all([
              loadTotalCount(selectedMonth, selectedRegion),
              loadStatistics(selectedMonth, selectedRegion)
            ]);
            setTotalCount(count);
            setStatistics(stats);
            await loadDistributionData(1, selectedMonth, selectedRegion);
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
      sorter: (a, b) => new Date(a.tarih) - new Date(b.tarih),
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
      title: 'Mağaza',
      key: 'magaza',
      width: 140,
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Mağaza ara"
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
        record.magaza_adi?.toLowerCase().includes(value.toLowerCase()) ||
        record.magaza_kodu?.toLowerCase().includes(value.toLowerCase()),
      render: (_, record) => (
        <div className="text-xs">
          <div className="font-medium truncate">{record.magaza_adi}</div>
          <div className="text-gray-500">{record.magaza_kodu}</div>
        </div>
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
        <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 flex items-center mb-2">
                <BarChart3 className="w-8 h-8 mr-4 text-blue-600" />
                Aktarma Dağıtım Analizi
            </h2>
              <p className="text-gray-600 text-lg">Aylık dağıtım verilerinin analizi ve performans takibi</p>
            </div>
            <div className="flex space-x-3">
              <div className="flex flex-col space-y-2">
                <Upload
                  accept=".xlsx,.xls"
                  beforeUpload={handleExcelUpload}
                  showUploadList={false}
                >
            <Button 
                    icon={<UploadIcon className="w-4 h-4" />}
                    loading={uploadLoading}
                    className="bg-orange-500 hover:bg-orange-600 border-orange-500 hover:border-orange-600"
                    size="large"
                  >
                    Aylık Excel Yükle
            </Button>
                </Upload>
                {uploadLoading && uploadProgress.total > 0 && (
                  <div className="w-full">
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
              </div>
            </div>
          </div>

          {/* Filtreler */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              placeholder="Ay Seçin"
              value={selectedMonth}
              onChange={handleMonthChange}
              className="w-full h-12"
              size="large"
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
              className="w-full h-12"
              size="large"
            >
              {regions.map(region => (
                <Option key={region.value} value={region.value}>{region.label}</Option>
              ))}
            </Select>
            <Button 
              icon={<Download className="w-4 h-4" />}
              className="h-12 bg-green-600 hover:bg-green-700 border-green-600 hover:border-green-700"
              size="large"
            >
              Rapor İndir
            </Button>
          </div>
        </div>

        {/* İstatistikler */}
        <div className="p-8 border-b border-gray-200 bg-white">
          <Row gutter={[24, 24]}>
            <Col xs={24} sm={12} md={6}>
              <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-blue-50 to-blue-100">
                <Statistic
                  title={<span className="text-gray-600 font-medium">Toplam Kayıt</span>}
                  value={totalCount.toLocaleString('tr-TR')}
                  valueStyle={{ color: '#1890ff', fontSize: '28px', fontWeight: 'bold' }}
                  prefix={<FileSpreadsheet className="w-6 h-6 text-blue-600" />}
                />
                <div className="text-xs text-gray-500 mt-2">
                  <div>Veritabanı: {totalCount.toLocaleString('tr-TR')} kayıt</div>
                  <div>
                    {selectedMonth === 'all' 
                      ? 'Tüm aylar (200\'er sayfa)' 
                      : `${getMonthName(selectedMonth)} ayı (200\'er sayfa)`
                    }
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-green-50 to-green-100">
                <Statistic
                  title={<span className="text-gray-600 font-medium">Toplam Kasa</span>}
                  value={statistics.totalKasa.toLocaleString('tr-TR')}
                  valueStyle={{ color: '#52c41a', fontSize: '28px', fontWeight: 'bold' }}
                  prefix={<Package className="w-6 h-6 text-green-600" />}
                />
                <div className="text-xs text-gray-500 mt-2">
                  {selectedMonth === 'all' ? 'Tüm aylar toplamı' : `${getMonthName(selectedMonth)} ayı toplamı`}
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-purple-50 to-purple-100">
                <Statistic
                  title={<span className="text-gray-600 font-medium">Okutulan Kasa</span>}
                  value={statistics.okutulanKasa.toLocaleString('tr-TR')}
                  valueStyle={{ color: '#722ed1', fontSize: '28px', fontWeight: 'bold' }}
                  prefix={<CheckCircle className="w-6 h-6 text-purple-600" />}
                />
                <div className="text-xs text-gray-500 mt-2">
                  {selectedMonth === 'all' ? 'Tüm aylar toplamı' : `${getMonthName(selectedMonth)} ayı toplamı`}
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-orange-50 to-orange-100">
                <Statistic
                  title={<span className="text-gray-600 font-medium">Ortalama Okutma Oranı</span>}
                  value={statistics.okutmaOrani}
                  suffix="%"
                  valueStyle={{ color: '#fa8c16', fontSize: '28px', fontWeight: 'bold' }}
                  prefix={<Target className="w-6 h-6 text-orange-600" />}
                />
                <div className="text-xs text-gray-500 mt-2">
                  {selectedMonth === 'all' ? 'Tüm aylar ortalaması' : `${getMonthName(selectedMonth)} ayı ortalaması`}
                </div>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Tablo */}
        <div className="p-8">
     
          
          <Spin spinning={loading}>
          <Table
              columns={columns}
              dataSource={filteredData}
            rowKey="id"
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: totalCount,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} / ${total.toLocaleString('tr-TR')} kayıt (Toplam: ${totalCount.toLocaleString('tr-TR')})`,
                onChange: handlePageChange,
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