import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Card, 
  Row, 
  Col, 
  Tag, 
  Space, 
  message,
  Badge,
  Tooltip,
  Avatar,
  Upload,
  Progress,
  Statistic,
  Divider,
  Alert,
  Spin
} from 'antd';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Upload as UploadIcon,
  Download,
  TrendingUp,
  TrendingDown,
  Package,
  Palette,
  CheckCircle,
  XCircle,
  BarChart3,
  FileSpreadsheet,
  UserCheck,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { UserOutlined, UploadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { supabase } from '../../services/supabase';

const { Option } = Select;
const { Dragger } = Upload;

const TransferPersonnelList = () => {
  const [personnelData, setPersonnelData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [availableMonths, setAvailableMonths] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Mock data kaldırıldı - sadece Excel'den gelen gerçek veriler gösterilecek

  useEffect(() => {
    loadPersonnelData();
    loadAvailableMonths();
  }, []);

  // Ay değiştiğinde verileri yeniden yükle
  useEffect(() => {
    if (selectedMonth !== 'all') {
      loadPersonnelData();
    }
  }, [selectedMonth]);

  // Mevcut ayları yükle
  const loadAvailableMonths = async () => {
    try {
      console.log('=== AY LİSTESİ YÜKLENİYOR ===');
      
      // Önce benzersiz ay değerlerini çek (DISTINCT benzeri)
      const { data: uniqueMonths, error: uniqueError } = await supabase
        .from('aktarma_dagitim_verileri')
        .select('ay')
        .not('ay', 'is', null)
        .order('ay', { ascending: true });

      if (uniqueError) throw uniqueError;

      console.log('Benzersiz ay değerleri:', uniqueMonths);

      // Her ay için ayrı ayrı sayım yap
      const monthCounts = {};
      const monthNames = {
        '01': 'Ocak', '02': 'Şubat', '03': 'Mart', '04': 'Nisan',
        '05': 'Mayıs', '06': 'Haziran', '07': 'Temmuz', '08': 'Ağustos',
        '09': 'Eylül', '10': 'Ekim', '11': 'Kasım', '12': 'Aralık',
        '1': 'Ocak', '2': 'Şubat', '3': 'Mart', '4': 'Nisan',
        '5': 'Mayıs', '6': 'Haziran', '7': 'Temmuz', '8': 'Ağustos',
        '9': 'Eylül'
      };

      console.log('Her ay için sayım yapılıyor...');
      for (const monthData of uniqueMonths) {
        if (monthData.ay) {
          const { count, error: countError } = await supabase
            .from('aktarma_dagitim_verileri')
            .select('*', { count: 'exact', head: true })
            .eq('ay', monthData.ay);

          if (countError) {
            console.error(`${monthData.ay} ayı için sayım hatası:`, countError);
            monthCounts[monthData.ay] = 0;
          } else {
            monthCounts[monthData.ay] = count || 0;
            console.log(`${monthData.ay} ayı: ${count} kayıt`);
          }
        }
      }

      console.log('Ay bazında sayımlar:', monthCounts);
      console.log('Benzersiz ay değerleri:', Object.keys(monthCounts));

      const monthList = [
        { value: 'all', label: 'Tüm Aylar' },
        ...Object.keys(monthCounts).sort().map(month => ({
          value: month,
          label: `${monthNames[month]} (${monthCounts[month].toLocaleString('tr-TR')} kayıt)`
        }))
      ];

      console.log('Oluşturulan ay listesi:', monthList);
      setAvailableMonths(monthList);
    } catch (error) {
      console.error('Ay listesi yükleme hatası:', error);
    }
  };

  // Supabase'den personel verilerini çekme
  const loadPersonnelData = async () => {
    setLoading(true);
    setLoadingProgress(0);
    setLoadingText('Personel listesi çekiliyor...');
    
    try {
      console.log('=== PERSONEL VERİLERİ YÜKLENİYOR ===');
      console.log('Seçilen ay:', selectedMonth);
      
      const { data, error } = await supabase
        .from('aktarma_depo_personel')
        .select('*')
        .order('adi_soyadi', { ascending: true });

      if (error) throw error;

      console.log('Çekilen personel sayısı:', data?.length);
      console.log('İlk 3 personel:', data?.slice(0, 3));

      if (!data || data.length === 0) {
        console.log('❌ Personel verisi bulunamadı!');
        setPersonnelData([]);
        setFilteredData([]);
        return;
      }
      
      setLoadingProgress(20);
      setLoadingText('Performans verileri çekiliyor...');
      
      // Performans verilerini PARALEL yükle - ÇOK DAHA HIZLI!
      setLoadingText('Performans verileri paralel olarak çekiliyor...');
      
      // 10'lu gruplar halinde paralel işle
      const batchSize = 10;
      const personnelWithPerformance = [];
      
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const progress = 20 + Math.round((i / data.length) * 70);
        setLoadingProgress(progress);
        setLoadingText(`Performans verileri çekiliyor... (${i + 1}-${Math.min(i + batchSize, data.length)}/${data.length})`);
        
        // Bu batch'i paralel işle
        const batchResults = await Promise.all(
          batch.map(person => getPersonnelPerformance(person))
        );
        
        // Sonuçları birleştir
        batch.forEach((person, index) => {
          personnelWithPerformance.push({
            ...person,
            ...batchResults[index]
          });
        });
        
        // State'i güncelle
        setPersonnelData([...personnelWithPerformance]);
        setFilteredData([...personnelWithPerformance]);
      }
      
      setLoadingProgress(95);
      setLoadingText('Veriler işleniyor...');
      
      console.log('✅ Performans verileri ile birlikte personel sayısı:', personnelWithPerformance.length);
      console.log('İlk personel performans örneği:', personnelWithPerformance[0]);
      
      setPersonnelData(personnelWithPerformance);
      setFilteredData(personnelWithPerformance);
      
      setLoadingProgress(100);
      setLoadingText('Tamamlandı!');
      
    } catch (error) {
      console.error('❌ Veri yükleme hatası:', error);
      message.error('Veriler yüklenirken hata oluştu!');
      // Hata durumunda boş liste
      setPersonnelData([]);
      setFilteredData([]);
    } finally {
      setTimeout(() => {
        setLoading(false);
        setLoadingProgress(0);
        setLoadingText('');
      }, 500);
      console.log('=== PERSONEL VERİLERİ YÜKLEME TAMAMLANDI ===');
    }
  };

  // Personel performans verilerini çek (gerçek kasa verileri ile)
  const getPersonnelPerformance = async (person) => {
    try {
      // Sadece gerekli alanları çek - ÇOK DAHA HIZLI!
      let query = supabase
        .from('aktarma_dagitim_verileri')
        .select('toplam_kasa, okutulan_kasa, okutulmayan_kasa, ay')
        .or(`sicil_no_personel1.eq.${person.sicil_no},sicil_no_personel2.eq.${person.sicil_no},sicil_no_personel3.eq.${person.sicil_no}`);
      
      if (selectedMonth !== 'all') {
        query = query.eq('ay', selectedMonth);
      }

      const { data: distributionData, error } = await query;
      if (error) throw error;

      // Bu personelin gerçek kasa verileri
      const totalKasa = distributionData?.reduce((sum, item) => sum + (item.toplam_kasa || 0), 0) || 0;
      const okutulanKasa = distributionData?.reduce((sum, item) => sum + (item.okutulan_kasa || 0), 0) || 0;
      const okutulmayanKasa = distributionData?.reduce((sum, item) => sum + (item.okutulmayan_kasa || 0), 0) || 0;
      
      // Palet sayısı - toplam kasa / 10 (örnek hesaplama)
      const totalPalet = Math.ceil(totalKasa / 10) || 0;
      
      // Okutma sayısı - kayıt sayısı
      const totalOkutma = distributionData?.length || 0;
      
      // Hedef performans (seçilen ay veya tüm aylar için)
      let workingDays;
      if (selectedMonth !== 'all') {
        // Tek ay için
        workingDays = 30; // 1 ay × 30 gün
      } else {
        // Tüm aylar için - mevcut ayların sayısını kullan
        const uniqueMonths = [...new Set(distributionData?.map(item => item.ay).filter(Boolean))];
        workingDays = uniqueMonths.length * 30; // Ay sayısı × 30 gün
      }
      
      const targetKasa = workingDays * 50; // Günde 50 kasa hedefi
      const targetPalet = workingDays * 5; // Günde 5 palet hedefi
      const targetOkutma = workingDays * 30; // Günde 30 okutma hedefi

      // Performans yüzdesi
      const kasaPerformance = targetKasa > 0 ? Math.round((totalKasa / targetKasa) * 100) : 0;
      const paletPerformance = targetPalet > 0 ? Math.round((totalPalet / targetPalet) * 100) : 0;
      const okutmaPerformance = targetOkutma > 0 ? Math.round((totalOkutma / targetOkutma) * 100) : 0;

      // Console log kaldırıldı - performans için

      return {
        totalKasa,
        totalPalet,
        totalOkutma,
        okutulanKasa,
        okutulmayanKasa,
        targetKasa,
        targetPalet,
        targetOkutma,
        kasaPerformance,
        paletPerformance,
        okutmaPerformance,
        distributionData: distributionData || []
      };
    } catch (error) {
      console.error('Performans verisi çekme hatası:', error);
      return {
        totalKasa: 0,
        totalPalet: 0,
        totalOkutma: 0,
        okutulanKasa: 0,
        okutulmayanKasa: 0,
        targetKasa: 0,
        targetPalet: 0,
        targetOkutma: 0,
        kasaPerformance: 0,
        paletPerformance: 0,
        okutmaPerformance: 0,
        distributionData: []
      };
    }
  };

  // Excel dosyası yükleme fonksiyonu
  const handleExcelUpload = async (file) => {
    setUploadLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const fileData = new Uint8Array(e.target.result);
        const workbook = XLSX.read(fileData, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Excel verilerini işle ve Supabase'e kaydet
        const processedData = jsonData.map((row, index) => ({
          sicil_no: row['Sicil No'] || row['sicilNo'] || `TR${String(index + 1).padStart(3, '0')}`,
          adi_soyadi: row['Adı Soyadı'] || row['adiSoyadi'] || '',
          bolge: row['Bölge'] || row['bolge'] || '',
          pozisyon: row['Pozisyon'] || row['pozisyon'] || '',
          // Performans metrikleri (şimdilik varsayılan değerler)
          dagittigi_kasa_sayisi: Math.floor(Math.random() * 300) + 100,
          palet_sayisi: Math.floor(Math.random() * 30) + 5,
          okuttugu_kasa_sayisi: Math.floor(Math.random() * 280) + 80,
          okutmadigi_kasa_sayisi: Math.floor(Math.random() * 20) + 1,
          okutma_orani: Math.round((Math.random() * 20 + 80) * 10) / 10,
          gunluk_hedef: Math.floor(Math.random() * 350) + 150,
          hedef_tamamlama_orani: Math.round((Math.random() * 30 + 70) * 10) / 10,
          durum: 'aktif'
        }));

        // Supabase'e kaydet
        const { data: insertData, error } = await supabase
          .from('aktarma_depo_personel')
          .upsert(processedData, { 
            onConflict: 'sicil_no',
            ignoreDuplicates: false 
          })
          .select();

        if (error) throw error;

        message.success(`${processedData.length} personel başarıyla Supabase'e kaydedildi!`);
        
        // Verileri yeniden yükle
        await loadPersonnelData();
      } catch (error) {
        console.error('Excel yükleme hatası:', error);
        message.error('Excel dosyası okunurken hata oluştu!');
      }
      setUploadLoading(false);
    };
    
    reader.readAsArrayBuffer(file);
    return false; // Antd Upload bileşeninin otomatik yüklemesini engelle
  };

  // Arama ve filtreleme
  useEffect(() => {
    let filtered = personnelData;

    if (searchText) {
      filtered = filtered.filter(person => 
        (person.adi_soyadi || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (person.sicil_no || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (person.pozisyon || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (person.bolge || '').toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (selectedRegion !== 'all') {
      filtered = filtered.filter(person => person.bolge === selectedRegion);
    }

    if (selectedPosition !== 'all') {
      filtered = filtered.filter(person => person.pozisyon === selectedPosition);
    }

    setFilteredData(filtered);
  }, [searchText, selectedRegion, selectedPosition, personnelData]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'red';
      case 'on_leave': return 'orange';
      default: return 'gray';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Aktif';
      case 'inactive': return 'Pasif';
      case 'on_leave': return 'İzinli';
      default: return 'Bilinmiyor';
    }
  };

  const getPerformanceColor = (performance) => {
    switch (performance) {
      case 'excellent': return 'green';
      case 'good': return 'blue';
      case 'average': return 'orange';
      case 'poor': return 'red';
      default: return 'gray';
    }
  };

  const getPerformanceText = (performance) => {
    switch (performance) {
      case 'excellent': return 'Mükemmel';
      case 'good': return 'İyi';
      case 'average': return 'Orta';
      case 'poor': return 'Zayıf';
      default: return 'Değerlendirilmemiş';
    }
  };

  // Pozisyon renkleri - her pozisyon için farklı renk
  const getPositionColor = (position) => {
    const positionColors = {
      'Depo Sorumlusu': { bg: '#e6f7ff', text: '#1890ff', border: '#91d5ff' },
      'Depo Yöneticisi': { bg: '#fff1f0', text: '#f5222d', border: '#ffccc7' },
      'Forklift Operatörü': { bg: '#f6ffed', text: '#52c41a', border: '#b7eb8f' },
      'Depo Elemanı': { bg: '#fff7e6', text: '#fa8c16', border: '#ffd591' },
      'Sevkiyat Elemanı': { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
      'Kalite Kontrol': { bg: '#f9f0ff', text: '#722ed1', border: '#d3adf7' },
      'Lojistik Uzmanı': { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
      'Operatör': { bg: '#fffbe6', text: '#d48806', border: '#ffe58f' },
      'Sürücü': { bg: '#f6ffed', text: '#389e0d', border: '#b7eb8f' },
      'Yükleyici': { bg: '#f0f5ff', text: '#1d39c4', border: '#adc6ff' },
      'Kontrol': { bg: '#fff0f6', text: '#c41d7f', border: '#ffadd2' },
      'Uzman': { bg: '#f6f7f9', text: '#2f54eb', border: '#adc6ff' }
    };
    
    // Pozisyon adına göre renk ata
    for (const [key, colors] of Object.entries(positionColors)) {
      if (position?.includes(key)) {
        return colors;
      }
    }
    
    return { bg: '#f5f5f5', text: '#595959', border: '#d9d9d9' };
  };

  // Bölge renkleri - her bölge için farklı renk
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
    
    // Bölge adının ilk kelimesine göre renk ata
    const firstWord = region?.split(' ')[0] || '';
    return regionColors[region] || regionColors[firstWord] || 'default';
  };

  const columns = [
    {
      title: 'Sicil No',
      dataIndex: 'sicil_no',
      key: 'sicil_no',
      width: 100,
      sorter: (a, b) => (a.sicil_no || '').localeCompare(b.sicil_no || ''),
      render: (text) => (
        <span className="font-mono text-sm font-semibold text-gray-800">
          {text || 'N/A'}
        </span>
      )
    },
    {
      title: 'Ad Soyad',
      dataIndex: 'adi_soyadi',
      key: 'adi_soyadi',
      width: 180,
      sorter: (a, b) => (a.adi_soyadi || '').localeCompare(b.adi_soyadi || ''),
      render: (text, record) => (
        <div className="flex items-center space-x-3">
          <Avatar 
            size={40} 
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold"
          >
            {text ? text.split(' ').map(n => n[0]).join('') : '??'}
          </Avatar>
          <span className="font-semibold text-gray-800">{text || 'Bilinmeyen'}</span>
        </div>
      )
    },
    {
      title: 'Pozisyon',
      dataIndex: 'pozisyon',
      key: 'pozisyon',
      width: 140,
      sorter: (a, b) => (a.pozisyon || '').localeCompare(b.pozisyon || ''),
      filters: Array.from(new Set(personnelData.map(p => p.pozisyon).filter(Boolean)))
        .map(pozisyon => ({ text: pozisyon, value: pozisyon })),
      onFilter: (value, record) => record.pozisyon === value,
      render: (text) => {
        const colors = getPositionColor(text);
        return (
          <span 
            className="text-sm font-medium px-3 py-1 rounded-full border"
            style={{ 
              backgroundColor: colors.bg, 
              color: colors.text, 
              borderColor: colors.border 
            }}
          >
            {text || 'Bilinmeyen'}
          </span>
        );
      }
    },
    {
      title: 'Bölge',
      dataIndex: 'bolge',
      key: 'bolge',
      width: 120,
      sorter: (a, b) => (a.bolge || '').localeCompare(b.bolge || ''),
      filters: Array.from(new Set(personnelData.map(p => p.bolge).filter(Boolean)))
        .map(bolge => ({ text: bolge, value: bolge })),
      onFilter: (value, record) => record.bolge === value,
      render: (text) => (
        <Tag color={getRegionColor(text)} className="font-medium">
          {text || 'Bilinmeyen'}
        </Tag>
      )
    },
    {
      title: 'Dağıtılan Kasa',
      key: 'kasa',
      width: 160,
      sorter: (a, b) => (a.totalKasa || 0) - (b.totalKasa || 0),
      render: (_, record) => (
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Package className="w-4 h-4 text-blue-600 mr-1" />
            <span className="font-bold text-lg text-blue-600">{record.totalKasa || 0}</span>
          </div>
          <div className="text-xs text-gray-600 mb-1">
            <span className="text-green-600">✓ {record.okutulanKasa || 0}</span> / 
            <span className="text-red-500"> ✗ {record.okutulmayanKasa || 0}</span>
          </div>
          <Progress 
            percent={record.kasaPerformance || 0} 
            size="small" 
            strokeColor={(record.kasaPerformance || 0) > 100 ? '#52c41a' : (record.kasaPerformance || 0) > 80 ? '#1890ff' : '#faad14'}
            showInfo={false}
          />
          <div className="text-xs text-gray-500 mt-1">
            {record.kasaPerformance || 0}% / {record.targetKasa || 0} hedef
          </div>
        </div>
      )
    },
    {
      title: 'Palet Sayısı',
      key: 'palet',
      width: 120,
      sorter: (a, b) => (a.totalPalet || 0) - (b.totalPalet || 0),
      render: (_, record) => (
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Palette className="w-4 h-4 text-green-600 mr-1" />
            <span className="font-bold text-lg text-green-600">{record.totalPalet || 0}</span>
          </div>
          <Progress 
            percent={record.paletPerformance || 0} 
            size="small" 
            strokeColor={(record.paletPerformance || 0) > 100 ? '#52c41a' : (record.paletPerformance || 0) > 80 ? '#1890ff' : '#faad14'}
            showInfo={false}
          />
          <div className="text-xs text-gray-500 mt-1">
            {record.paletPerformance || 0}% / {record.targetPalet || 0} hedef
          </div>
        </div>
      )
    },
    {
      title: 'Okutma Detayı',
      key: 'okutma',
      width: 160,
      sorter: (a, b) => (a.totalOkutma || 0) - (b.totalOkutma || 0),
      render: (_, record) => (
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <CheckCircle className="w-4 h-4 text-purple-600 mr-1" />
            <span className="font-bold text-lg text-purple-600">{record.totalOkutma || 0}</span>
          </div>
          <div className="text-xs text-gray-600 mb-1">
            <span className="text-green-600">✓ {record.okutulanKasa || 0}</span> / 
            <span className="text-red-500"> ✗ {record.okutulmayanKasa || 0}</span>
          </div>
          <Progress 
            percent={record.okutmaPerformance || 0} 
            size="small" 
            strokeColor={(record.okutmaPerformance || 0) > 100 ? '#52c41a' : (record.okutmaPerformance || 0) > 80 ? '#1890ff' : '#faad14'}
            showInfo={false}
          />
          <div className="text-xs text-gray-500 mt-1">
            {record.okutmaPerformance || 0}% / {record.targetOkutma || 0} hedef
          </div>
        </div>
      )
    },
    {
      title: 'Genel Performans',
      key: 'genel',
      width: 130,
      sorter: (a, b) => {
        const aAvg = ((a.kasaPerformance || 0) + (a.paletPerformance || 0) + (a.okutmaPerformance || 0)) / 3;
        const bAvg = ((b.kasaPerformance || 0) + (b.paletPerformance || 0) + (b.okutmaPerformance || 0)) / 3;
        return aAvg - bAvg;
      },
      render: (_, record) => {
        const avgPerformance = Math.round(((record.kasaPerformance || 0) + (record.paletPerformance || 0) + (record.okutmaPerformance || 0)) / 3);
        return (
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Ortalama</div>
            <Progress 
              percent={avgPerformance} 
              size="small" 
              strokeColor={avgPerformance > 100 ? '#52c41a' : avgPerformance > 80 ? '#1890ff' : '#faad14'}
            />
            <div className="text-xs mt-1">
              {avgPerformance > 80 ? (
                <TrendingUp className="w-3 h-3 text-green-500 inline mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 text-orange-500 inline mr-1" />
              )}
              {avgPerformance}%
            </div>
          </div>
        );
      }
    },
    {
      title: 'İşlemler',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Düzenle">
            <Button 
              type="text" 
              icon={<Edit className="w-4 h-4" />}
              onClick={() => handleEdit(record)}
              className="text-blue-600 hover:bg-blue-50"
            />
          </Tooltip>
          <Tooltip title="Sil">
            <Button 
              type="text" 
              danger
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => handleDelete(record.id)}
              className="hover:bg-red-50"
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  const handleEdit = (record) => {
    setEditingRecord(record);
    setIsModalVisible(true);
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Personeli silmek istediğinizden emin misiniz?',
      content: 'Bu işlem geri alınamaz.',
      okText: 'Evet, Sil',
      cancelText: 'İptal',
      onOk: async () => {
        try {
          const { error } = await supabase
            .from('aktarma_depo_personel')
            .delete()
            .eq('id', id);

          if (error) throw error;

          message.success('Personel başarıyla silindi!');
          await loadPersonnelData();
        } catch (error) {
          console.error('Silme hatası:', error);
          message.error('Personel silinirken hata oluştu!');
        }
      }
    });
  };

  // Rapor indirme fonksiyonu
  const handleDownloadReport = async () => {
    try {
      // Excel raporu oluştur
      const worksheet = XLSX.utils.json_to_sheet(
        filteredData.map(person => ({
          'Sicil No': person.sicil_no,
          'Ad Soyad': person.adi_soyadi,
          'Bölge': person.bolge,
          'Pozisyon': person.pozisyon,
          'Dağıtılan Kasa': person.dagittigi_kasa_sayisi,
          'Palet Sayısı': person.palet_sayisi,
          'Okutulan Kasa': person.okuttugu_kasa_sayisi,
          'Okutulmayan Kasa': person.okutmadigi_kasa_sayisi,
          'Okutma Oranı (%)': person.okutma_orani,
          'Günlük Hedef': person.gunluk_hedef,
          'Hedef Tamamlama (%)': person.hedef_tamamlama_orani,
          'Durum': person.durum === 'aktif' ? 'Aktif' : 'Pasif'
        }))
      );

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Aktarma Depo Personel');

      // Dosyayı indir
      const fileName = `aktarma_depo_personel_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      message.success('Rapor başarıyla indirildi!');
    } catch (error) {
      console.error('Rapor indirme hatası:', error);
      message.error('Rapor indirilirken hata oluştu!');
    }
  };

  const handleAdd = () => {
    setEditingRecord(null);
    setIsModalVisible(true);
  };

  const handleModalOk = async (values) => {
    try {
      if (editingRecord) {
        // Güncelleme
        const { error } = await supabase
          .from('aktarma_depo_personel')
          .update({
            ...values,
            guncelleme_tarihi: new Date().toISOString()
          })
          .eq('id', editingRecord.id);

        if (error) throw error;

        message.success('Personel bilgileri güncellendi!');
      } else {
        // Yeni ekleme (şimdilik devre dışı, sadece Excel'den yükleme)
        message.info('Yeni personel eklemek için Excel dosyası kullanın.');
        return;
      }
      
      setIsModalVisible(false);
      setEditingRecord(null);
      await loadPersonnelData();
    } catch (error) {
      console.error('Güncelleme hatası:', error);
      message.error('Personel güncellenirken hata oluştu!');
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
        {/* Header */}
        <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 flex items-center mb-2">
                <Users className="w-8 h-8 mr-4 text-blue-600" />
                Aktarma Depo Personel Yönetimi
              </h2>
              <p className="text-gray-600 text-lg">Personel performans takibi ve yönetimi</p>
            </div>
            <div className="flex space-x-3">
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
                  Excel Yükle
                </Button>
              </Upload>
            </div>
          </div>

          {/* Filtreler */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Ad, sicil no, pozisyon veya bölge ile ara..."
              prefix={<Search className="w-4 h-4 text-gray-400" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="rounded-lg h-12 text-lg"
              size="large"
            />
            <Select
              placeholder="Bölge Seçin"
              value={selectedRegion}
              onChange={setSelectedRegion}
              className="w-full h-12"
              size="large"
            >
              <Option value="all">Tüm Bölgeler</Option>
              {Array.from(new Set(personnelData.map(p => p.bolge).filter(Boolean)))
                .map(bolge => (
                  <Option key={bolge} value={bolge}>{bolge}</Option>
                ))}
            </Select>
            <Select
              placeholder="Pozisyon Seçin"
              value={selectedPosition}
              onChange={setSelectedPosition}
              className="w-full h-12"
              size="large"
            >
              <Option value="all">Tüm Pozisyonlar</Option>
              {Array.from(new Set(personnelData.map(p => p.pozisyon).filter(Boolean)))
                .map(pozisyon => (
                  <Option key={pozisyon} value={pozisyon}>{pozisyon}</Option>
                ))}
            </Select>
            <Select
              placeholder="Ay Seçin"
              value={selectedMonth}
              onChange={setSelectedMonth}
              className="w-full h-12"
              size="large"
            >
              {availableMonths.map(month => (
                <Option key={month.value} value={month.value}>
                  {month.label}
                </Option>
              ))}
            </Select>
            <Button 
              icon={<Download className="w-4 h-4" />}
              onClick={handleDownloadReport}
              className="h-12 bg-green-600 hover:bg-green-700 border-green-600 hover:border-green-700"
              size="large"
            >
              Rapor İndir
            </Button>
          </div>
        </div>

        {/* İstatistikler */}
        <div className="p-8 border-b border-gray-200 bg-white">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6} lg={4}>
              <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-blue-50 to-blue-100">
                <Statistic
                  title={<span className="text-gray-600 font-medium">Toplam Personel</span>}
                  value={personnelData.length}
                  valueStyle={{ color: '#1890ff', fontSize: '24px', fontWeight: 'bold' }}
                  prefix={<Users className="w-5 h-5 text-blue-600" />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6} lg={4}>
              <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-green-50 to-green-100">
                <Statistic
                  title={<span className="text-gray-600 font-medium">Aktif Personel</span>}
                  value={personnelData.filter(p => p.durum === 'aktif').length}
                  valueStyle={{ color: '#52c41a', fontSize: '24px', fontWeight: 'bold' }}
                  prefix={<CheckCircle className="w-5 h-5 text-green-600" />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6} lg={4}>
              <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-purple-50 to-purple-100">
                <Statistic
                  title={<span className="text-gray-600 font-medium">Toplam Kasa</span>}
                  value={personnelData.reduce((sum, p) => sum + (p.totalKasa || 0), 0).toLocaleString('tr-TR')}
                  valueStyle={{ color: '#722ed1', fontSize: '24px', fontWeight: 'bold' }}
                  prefix={<Package className="w-5 h-5 text-purple-600" />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6} lg={4}>
              <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-green-50 to-green-100">
                <Statistic
                  title={<span className="text-gray-600 font-medium">Okutulan Kasa</span>}
                  value={personnelData.reduce((sum, p) => sum + (p.okutulanKasa || 0), 0).toLocaleString('tr-TR')}
                  valueStyle={{ color: '#52c41a', fontSize: '24px', fontWeight: 'bold' }}
                  prefix={<CheckCircle className="w-5 h-5 text-green-600" />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6} lg={4}>
              <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-red-50 to-red-100">
                <Statistic
                  title={<span className="text-gray-600 font-medium">Okutulmayan Kasa</span>}
                  value={personnelData.reduce((sum, p) => sum + (p.okutulmayanKasa || 0), 0).toLocaleString('tr-TR')}
                  valueStyle={{ color: '#ff4d4f', fontSize: '24px', fontWeight: 'bold' }}
                  prefix={<XCircle className="w-5 h-5 text-red-600" />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6} lg={4}>
              <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-orange-50 to-orange-100">
                <Statistic
                  title={<span className="text-gray-600 font-medium">Ortalama Okutma Oranı</span>}
                  value={personnelData.length > 0 ? Math.round(personnelData.reduce((sum, p) => {
                    const totalKasa = p.totalKasa || 0;
                    const okutulanKasa = p.okutulanKasa || 0;
                    return sum + (totalKasa > 0 ? (okutulanKasa / totalKasa) * 100 : 0);
                  }, 0) / personnelData.length * 10) / 10 : 0}
                  suffix="%"
                  valueStyle={{ color: '#fa8c16', fontSize: '24px', fontWeight: 'bold' }}
                  prefix={<BarChart3 className="w-5 h-5 text-orange-600" />}
                />
              </Card>
            </Col>
          </Row>
        </div>

        {/* Tablo */}
        <div className="p-8">
          {loading && (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="mb-6">
                  <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                    <Spin size="large" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Veriler Yükleniyor...
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {loadingText || 'Personel performans verileri çekiliyor. Lütfen bekleyin.'}
                  </p>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${loadingProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500">
                    {loadingProgress}% tamamlandı
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    <strong>İşlem:</strong> Veritabanından personel verileri ve performans metrikleri çekiliyor...
                  </p>
                </div>
              </div>
            </div>
          )}

          {filteredData.length === 0 && !loading && (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="mb-6">
                  <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center">
                    <UserOutlined className="text-4xl text-orange-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Personel Verisi Bulunamadı
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Henüz personel verisi yüklenmemiş. Excel dosyası yükleyerek başlayabilirsiniz.
                  </p>
                </div>
                <div className="space-y-3">
                  <Button 
                    type="primary" 
                    size="large" 
                    icon={<UploadOutlined />}
                    className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 border-0 hover:from-blue-600 hover:to-purple-700"
                  >
                    Excel Dosyası Yükle
                  </Button>
                  <p className="text-sm text-gray-500">
                    Desteklenen formatlar: .xlsx, .xls, .csv
                  </p>
                </div>
              </div>
            </div>
          )}
          {!loading && (
            <Table
              columns={columns}
              dataSource={filteredData}
              rowKey="id"
              pagination={{
                pageSize: 50,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} / ${total} personel`,
                pageSizeOptions: ['25', '50', '100', '200'],
                size: 'default'
              }}
              scroll={{ x: 1600 }}
              className="modern-table"
              rowClassName={(record) => 
                record.durum === 'aktif' ? 'active-row' : 'inactive-row'
              }
            />
          )}
        </div>
      </div>

      {/* Düzenleme Modalı */}
      <Modal
        title={
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <UserCheck className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <span className="text-base font-semibold text-gray-900">
                {editingRecord ? 'Personel Düzenle' : 'Yeni Personel Ekle'}
              </span>
            </div>
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={500}
        className="modern-modal"
      >
        <Form
          layout="vertical"
          initialValues={editingRecord || {}}
          onFinish={handleModalOk}
          className="space-y-3"
        >
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="sicil_no"
                label={<span className="font-medium text-gray-700">Sicil No</span>}
                rules={[{ required: true, message: 'Sicil no gerekli!' }]}
              >
                <Input placeholder="TR001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="adi_soyadi"
                label={<span className="font-medium text-gray-700">Ad Soyad</span>}
                rules={[{ required: true, message: 'Ad soyad gerekli!' }]}
              >
                <Input placeholder="Ahmet Yılmaz" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="bolge"
                label={<span className="font-medium text-gray-700">Bölge</span>}
                rules={[{ required: true, message: 'Bölge gerekli!' }]}
              >
                <Select placeholder="Bölge seçin">
                  {Array.from(new Set(personnelData.map(p => p.bolge).filter(Boolean)))
                    .map(bolge => (
                      <Option key={bolge} value={bolge}>{bolge}</Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="pozisyon"
                label={<span className="font-medium text-gray-700">Pozisyon</span>}
                rules={[{ required: true, message: 'Pozisyon gerekli!' }]}
              >
                <Select placeholder="Pozisyon seçin">
                  {Array.from(new Set(personnelData.map(p => p.pozisyon).filter(Boolean)))
                    .map(pozisyon => (
                      <Option key={pozisyon} value={pozisyon}>{pozisyon}</Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>


          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
            <Button 
              onClick={() => setIsModalVisible(false)}
              className="px-4 h-8 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              İptal
            </Button>
            <Button 
              type="primary" 
              htmlType="submit"
              className="px-4 h-8 bg-blue-600 hover:bg-blue-700 border-0"
            >
              {editingRecord ? 'Güncelle' : 'Ekle'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default TransferPersonnelList;

// CSS Stilleri
const styles = `
  .modern-table .ant-table-thead > tr > th {
    background: #ffffff;
    color: #374151;
    font-weight: 600;
    border: 1px solid #e5e7eb;
    text-align: center;
    font-size: 14px;
    padding: 16px 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .modern-table .ant-table-thead > tr > th:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }
  
  .modern-table .ant-table-tbody > tr:hover > td {
    background-color: #f8fafc !important;
  }
  
  .active-row {
    border-left: 4px solid #52c41a;
  }
  
  .inactive-row {
    border-left: 4px solid #ff4d4f;
    background-color: #fff2f0;
  }
  
  .modern-modal .ant-modal-header {
    background: #ffffff;
    border-bottom: 1px solid #e5e7eb;
    border-radius: 12px 12px 0 0;
    padding: 20px 24px;
  }
  
  .modern-modal .ant-modal-title {
    color: #111827;
    font-weight: 600;
    font-size: 18px;
  }
  
  .modern-modal .ant-modal-close {
    color: #6b7280;
    font-size: 18px;
  }
  
  .modern-modal .ant-modal-close:hover {
    color: #374151;
  }
`;

// Stilleri DOM'a ekle
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}
