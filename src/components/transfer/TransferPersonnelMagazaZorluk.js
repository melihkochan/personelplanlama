import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Button, 
  Input, 
  Select, 
  Progress, 
  message, 
  Spin,
  Row,
  Col,
  Statistic,
  Tag,
  Tooltip,
  Upload
} from 'antd';
import { 
  Users, 
  Search, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  MapPin,
  BarChart3,
  Download,
  Filter,
  Upload as UploadIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../services/supabase';

const { Option } = Select;

const TransferPersonnelMagazaZorluk = () => {
  const [loading, setLoading] = useState(false);
  const [personnelData, setPersonnelData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('current');
  const [availableMonths, setAvailableMonths] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, percentage: 0, startTime: null, estimatedTimeRemaining: null });
  const [loadingText, setLoadingText] = useState('');

  // Mevcut ayları yükle - pagination ile
  const loadAvailableMonths = async () => {
    try {
      const { data, error } = await supabase
        .from('aktarma_personel_magaza_zorluk')
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
        { value: 'all', label: 'Tüm Aylar (Yavaş Yükleme)' }
      ];

      setAvailableMonths(monthList);
    } catch (error) {
      console.error('Ay listesi yükleme hatası:', error);
    }
  };

  // Veri yükleme fonksiyonu - Personelleri ve zorluk verilerini çek
  const loadData = async () => {
    setLoading(true);
    try {
      // Güncel ay için hedef ayı belirle
      const targetMonth = selectedMonth === 'current' ? 
        String(new Date().getMonth() + 1).padStart(2, '0') : 
        selectedMonth;

      // Önce toplam sayıyı al
      let countQuery = supabase
        .from('aktarma_personel_magaza_zorluk')
        .select('*', { count: 'exact', head: true });

      if (selectedMonth !== 'all') { // Sadece 'all' değilse filtrele
        countQuery = countQuery.eq('ay', targetMonth);
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

      // Aktarma personellerini çek
      const { data: personnel, error: personnelError } = await supabase
        .from('aktarma_depo_personel')
        .select('sicil_no, adi_soyadi, bolge')
        .eq('durum', 'aktif');

      if (personnelError) {
        throw personnelError;
      }

      // Verileri batch'ler halinde çek - SADECE SEÇİLEN AY
      const batchSize = selectedMonth === 'all' ? 1000 : 2000; // Tüm aylar için daha küçük batch
      let allZorlukData = [];
      
      for (let offset = 0; offset < count; offset += batchSize) {
        let query = supabase
          .from('aktarma_personel_magaza_zorluk')
          .select('sicil_no_personel1, sicil_no_personel2, sicil_no_personel3, zorluk_seviyesi, magaza_adi, ay')
          .order('ay', { ascending: true });

        // Filtreleme uygula
        if (selectedMonth !== 'all') { // Sadece 'all' değilse filtrele
          query = query.eq('ay', targetMonth);
        }

        // Batch aralığı uygula
        query = query.range(offset, offset + batchSize - 1);

        const { data, error } = await query;

        if (error) {
          console.error(`Batch ${offset}-${offset + batchSize} hatası:`, error);
          break;
        }

        allZorlukData = [...allZorlukData, ...(data || [])];
        
        // Progress güncelle
        const percentage = Math.round((allZorlukData.length/count)*100);
        
        // Tahmini bitiş süresi hesapla
        let estimatedTimeRemaining = null;
        if (percentage > 5 && startTime) { // %5'ten sonra hesapla
          const elapsedTime = Date.now() - startTime;
          const recordsPerSecond = allZorlukData.length / (elapsedTime / 1000);
          const remainingRecords = count - allZorlukData.length;
          estimatedTimeRemaining = Math.round(remainingRecords / recordsPerSecond);
        }
        
        setLoadingProgress({ 
          current: allZorlukData.length, 
          total: count, 
          percentage: percentage,
          startTime: startTime,
          estimatedTimeRemaining: estimatedTimeRemaining
        });
      }

      const zorlukData = allZorlukData;

      // Her personel için zorluk istatistiklerini hesapla
      const personnelWithDifficulty = [];
      
      for (let i = 0; i < personnel.length; i++) {
        const person = personnel[i];
        
        // Bu personelin zorluk verilerini bul - 3 sütunda da ara
        const personZorlukData = zorlukData?.filter(record => {
          const sicil1 = record.sicil_no_personel1?.toString().trim();
          const sicil2 = record.sicil_no_personel2?.toString().trim();
          const sicil3 = record.sicil_no_personel3?.toString().trim();
          const personSicil = person.sicil_no.toString().trim();
          
          return sicil1 === personSicil || sicil2 === personSicil || sicil3 === personSicil;
        }) || [];

        // Zorluk seviyelerine göre mağaza ziyaretlerini say
        const difficultyStats = {
          1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0
        };

        const visitedStores = new Set();
        
        personZorlukData.forEach(record => {
          if (record.magaza_adi && record.zorluk_seviyesi) {
            const level = parseInt(record.zorluk_seviyesi);
            if (level >= 1 && level <= 8) {
              // Her kayıt için zorluk seviyesini say (kaç kez gidildiğini)
              difficultyStats[level]++;
              
              // Toplam ziyaret edilen mağaza sayısı için
              if (!visitedStores.has(record.magaza_adi)) {
                visitedStores.add(record.magaza_adi);
              }
            }
          }
        });

        // Toplam zorluklu mağaza ziyareti
        const totalDifficultVisits = Object.values(difficultyStats).reduce((sum, count) => sum + count, 0);
        
        // En çok gidilen zorluk seviyesi
        const maxDifficulty = Object.entries(difficultyStats).reduce((max, [level, count]) => 
          count > max.count ? { level: parseInt(level), count } : max, 
          { level: 0, count: 0 }
        );

        personnelWithDifficulty.push({
          ...person,
          difficultyStats,
          totalDifficultVisits,
          maxDifficulty: maxDifficulty.level,
          maxDifficultyCount: maxDifficulty.count,
          visitedStoresCount: visitedStores.size
        });
      }

      setPersonnelData(personnelWithDifficulty);
      setFilteredData(personnelWithDifficulty);
      
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

  // Filtreleme fonksiyonu
  const applyFilters = () => {
    let filtered = personnelData;

    // Arama filtresi
    if (searchText) {
      filtered = filtered.filter(person => 
        person.adi_soyadi.toLowerCase().includes(searchText.toLowerCase()) ||
        person.sicil_no.toString().includes(searchText) ||
        person.bolge.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Bölge filtresi
    if (selectedRegion !== 'all') {
      filtered = filtered.filter(person => person.bolge === selectedRegion);
    }

    // Zorluk seviyesi filtresi
    if (selectedDifficulty !== 'all') {
      const difficulty = parseInt(selectedDifficulty);
      filtered = filtered.filter(person => person.difficultyStats[difficulty] > 0);
    }

    setFilteredData(filtered);
  };

  // Rapor indir fonksiyonu
  const handleDownloadReport = () => {
    try {
      // Excel dosyası oluştur
      const worksheetData = filteredData.map(person => ({
        'Sicil No': person.sicil_no,
        'Ad Soyad': person.adi_soyadi,
        'Bölge': person.bolge,
        'Seviye 1': person.difficultyStats[1],
        'Seviye 2': person.difficultyStats[2],
        'Seviye 3': person.difficultyStats[3],
        'Seviye 4': person.difficultyStats[4],
        'Seviye 5': person.difficultyStats[5],
        'Seviye 6': person.difficultyStats[6],
        'Seviye 7': person.difficultyStats[7],
        'Seviye 8': person.difficultyStats[8],
        'Toplam Zorluklu Ziyaret': person.totalDifficultVisits,
        'Ziyaret Edilen Mağaza Sayısı': person.visitedStoresCount
      }));

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Personel Zorluk Analizi');

      // Dosya adı oluştur
      const currentDate = new Date().toISOString().split('T')[0];
      const monthText = selectedMonth === 'all' ? 'TumAylar' : 
        ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 
         'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'][parseInt(selectedMonth) - 1];
      
      const fileName = `Aktarma_Personel_Zorluk_Analizi_${monthText}_${currentDate}.xlsx`;

      // İndir
      XLSX.writeFile(workbook, fileName);
      message.success('Rapor başarıyla indirildi!');
    } catch (error) {
      console.error('Rapor indirme hatası:', error);
      message.error('Rapor indirilirken hata oluştu!');
    }
  };

  // Excel yükleme fonksiyonu - Optimized for large files
  const handleExcelUpload = async (file) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        setLoading(true);
        setLoadingProgress(0);
        setLoadingText('Excel dosyası okunuyor...');

        const fileData = new Uint8Array(e.target.result);
        const workbook = XLSX.read(fileData, { type: 'array' });
        
        // İlk sheet'i al
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          message.error('Excel dosyası boş!');
          setLoading(false);
          return;
        }

        setLoadingProgress(20);
        setLoadingText('Aktarma personelleri yükleniyor...');

        // Aktarma personellerini sabit çek
        const { data: personnel, error: personnelError } = await supabase
          .from('aktarma_depo_personel')
          .select('sicil_no, adi_soyadi')
          .eq('durum', 'aktif');

        if (personnelError) {
          throw personnelError;
        }

        if (!personnel || personnel.length === 0) {
          message.error('Aktarma personelleri bulunamadı!');
          setLoading(false);
          return;
        }

        setLoadingProgress(40);
        setLoadingText('Veriler işleniyor...');

        // Verileri işle
        const processedData = [];
        const batchSize = 1000; // Her seferde 1000 kayıt işle
        
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          
          // Progress güncelle
          if (i % 100 === 0) {
            setLoadingProgress(40 + (i / jsonData.length) * 30);
            setLoadingText(`${i + 1}/${jsonData.length} satır işleniyor...`);
          }

          // Excel sütunlarını kontrol et
          const personel1 = row['Personel 1'] || row['personel1'];
          const personel2 = row['Personel 2'] || row['personel2'];
          const personel3 = row['Personel 3'] || row['personel3'];
          const tarih = row['Tarih'] || row['tarih'];
          const ay = row['Ay'] || row['ay'];
          const magaza = row['Mağaza Adı'] || row['magaza_adi'] || row['Mağaza'];
          const zorluk = row['Zorluk'] || row['zorluk_seviyesi'] || row['Zorluk Seviyesi'];

          if (tarih && ay && magaza && zorluk) {
            // Tarih formatını düzelt
            let formattedDate = null;
            
            if (typeof tarih === 'number') {
              // Excel serial date formatını YYYY-MM-DD'ye çevir
              // Excel'de 1900-01-01 = 1, 1900-01-02 = 2, vs.
              const excelEpoch = new Date(1900, 0, 1); // 1900-01-01
              const date = new Date(excelEpoch.getTime() + (tarih - 2) * 24 * 60 * 60 * 1000);
              formattedDate = date.toISOString().split('T')[0];
            } else if (typeof tarih === 'string') {
              // DD.MM.YYYY formatından YYYY-MM-DD'ye çevir
              if (tarih.includes('.')) {
                const parts = tarih.split('.');
                if (parts.length === 3) {
                  formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
              }
              // DD/MM/YYYY formatı
              else if (tarih.includes('/')) {
                const parts = tarih.split('/');
                if (parts.length === 3) {
                  formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
              }
              // YYYY-MM-DD formatı zaten doğru
              else if (tarih.match(/^\d{4}-\d{2}-\d{2}$/)) {
                formattedDate = tarih;
              }
            } else if (tarih instanceof Date) {
              formattedDate = tarih.toISOString().split('T')[0];
            }

            // Tarih geçerli değilse atla
            if (!formattedDate) {
              console.warn(`Geçersiz tarih formatı: ${tarih}`, row);
              continue;
            }

            // Ay değerini kontrol et
            const ayValue = ay.toString().padStart(2, '0');
            if (!ayValue || ayValue === '00') {
              console.warn(`Geçersiz ay değeri: ${ay}`, row);
              continue;
            }

            // Zorluk değerini kontrol et
            const zorlukValue = parseInt(zorluk);
            if (isNaN(zorlukValue) || zorlukValue < 1 || zorlukValue > 8) {
              console.warn(`Geçersiz zorluk değeri: ${zorluk}`, row);
              continue;
            }

            // Excel'deki personel sicillerini kullan
            const sicil1 = personel1 ? personel1.toString().trim() : null;
            const sicil2 = personel2 ? personel2.toString().trim() : null;
            const sicil3 = personel3 ? personel3.toString().trim() : null;

            // En az bir personel sicili olmalı
            if (sicil1 || sicil2 || sicil3) {
              processedData.push({
                sicil_no_personel1: sicil1,
                sicil_no_personel2: sicil2,
                sicil_no_personel3: sicil3,
                tarih: formattedDate,
                ay: ayValue,
                magaza_adi: magaza.toString().trim(),
                zorluk_seviyesi: zorlukValue
              });
            }
          }
        }

        if (processedData.length === 0) {
          message.error('İşlenecek veri bulunamadı! Excel sütunlarını kontrol edin.');
          setLoading(false);
          return;
        }

        setLoadingProgress(70);
        setLoadingText('Veritabanına kaydediliyor...');

        // Batch olarak veritabanına kaydet
        let totalInserted = 0;
        for (let i = 0; i < processedData.length; i += batchSize) {
          const batch = processedData.slice(i, i + batchSize);
          
          setLoadingProgress(70 + ((i / processedData.length) * 25));
          setLoadingText(`${totalInserted + batch.length}/${processedData.length} kayıt kaydediliyor...`);

          const { error } = await supabase
            .from('aktarma_personel_magaza_zorluk')
            .insert(batch);

          if (error) {
            throw error;
          }

          totalInserted += batch.length;
        }

        setLoadingProgress(100);
        setLoadingText('Tamamlandı!');

        message.success(`${totalInserted} kayıt başarıyla yüklendi! (${jsonData.length} Excel satırı işlendi)`);
        
        // Verileri yeniden yükle
        setTimeout(() => {
          loadData();
        }, 1000);
        
      } catch (error) {
        console.error('Excel yükleme hatası:', error);
        message.error(`Excel dosyası işlenirken hata oluştu: ${error.message}`);
        setLoading(false);
      }
    };
    
    reader.readAsArrayBuffer(file);
    return false;
  };

  // Filtreler değiştiğinde uygula
  useEffect(() => {
    applyFilters();
  }, [searchText, selectedRegion, selectedDifficulty, personnelData]);

  // Ay filtresi değiştiğinde verileri yeniden yükle
  useEffect(() => {
    if (selectedMonth === 'all') {
      loadData();
    } else {
      loadData();
    }
  }, [selectedMonth]);

  // Component mount olduğunda veri yükle
  useEffect(() => {
    loadAvailableMonths();
    loadData();
  }, []);

  // Benzersiz değerleri al
  const getUniqueValues = (data, key) => {
    return [...new Set(data.map(item => item[key]))].sort();
  };

  // Seviye için benzersiz değerleri al
  const getUniqueLevelValues = (data, level) => {
    return [...new Set(data.map(item => item.difficultyStats[level]))].sort((a, b) => a - b);
  };

  // Seviye aralık filtreleri
  const getLevelRangeFilters = () => [
    { text: '0', value: '0' },
    { text: '1-5', value: '1-5' },
    { text: '6-10', value: '6-10' },
    { text: '11-20', value: '11-20' },
    { text: '21+', value: '21+' }
  ];

  // Seviye aralık filtresi kontrolü
  const checkLevelRange = (value, count) => {
    switch (value) {
      case '0': return count === 0;
      case '1-5': return count >= 1 && count <= 5;
      case '6-10': return count >= 6 && count <= 10;
      case '11-20': return count >= 11 && count <= 20;
      case '21+': return count >= 21;
      default: return false;
    }
  };

  // Tablo sütunları
  const columns = [
    {
      title: 'Sicil No',
      key: 'sicil_no',
      width: 80,
      fixed: 'left',
      sorter: (a, b) => a.sicil_no - b.sicil_no,
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Sicil No ara..."
            value={selectedKeys[0]}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <div>
            <Button
              type="primary"
              onClick={() => confirm()}
              size="small"
              style={{ width: 90, marginRight: 8 }}
            >
              Ara
            </Button>
            <Button
              onClick={() => {
                clearFilters();
                confirm();
              }}
              size="small"
              style={{ width: 90 }}
            >
              Temizle
            </Button>
          </div>
        </div>
      ),
      onFilter: (value, record) => 
        record.sicil_no.toString().toLowerCase().includes(value.toLowerCase()),
      render: (_, record) => (
        <span className="text-xs font-mono">{record.sicil_no}</span>
      )
    },
    {
      title: 'Ad Soyad',
      key: 'adi_soyadi',
      width: 140,
      fixed: 'left',
      sorter: (a, b) => a.adi_soyadi.localeCompare(b.adi_soyadi),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Ad Soyad ara..."
            value={selectedKeys[0]}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <div>
            <Button
              type="primary"
              onClick={() => confirm()}
              size="small"
              style={{ width: 90, marginRight: 8 }}
            >
              Ara
            </Button>
            <Button
              onClick={() => {
                clearFilters();
                confirm();
              }}
              size="small"
              style={{ width: 90 }}
            >
              Temizle
            </Button>
          </div>
        </div>
      ),
      onFilter: (value, record) => 
        record.adi_soyadi.toLowerCase().includes(value.toLowerCase()),
      render: (_, record) => (
        <div className="flex items-center">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
            <span className="text-xs font-bold text-blue-600">
              {record.adi_soyadi.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </span>
          </div>
          <span className="text-xs font-medium">{record.adi_soyadi}</span>
        </div>
      )
    },
    {
      title: 'Bölge',
      key: 'bolge',
      width: 100,
      sorter: (a, b) => a.bolge.localeCompare(b.bolge),
      filters: getUniqueValues(filteredData, 'bolge').map(bolge => ({
        text: bolge,
        value: bolge
      })),
      onFilter: (value, record) => record.bolge === value,
      render: (_, record) => (
        <Tag color="blue" className="text-xs">
          {record.bolge}
        </Tag>
      )
    },
    // 1-8 arası zorluk seviyeleri
    ...[1, 2, 3, 4, 5, 6, 7, 8].map(level => ({
      title: (
        <div className="text-center">
          <div className="font-semibold text-gray-800">Seviye {level}</div>
          <div className="text-xs text-gray-500 font-normal">Ziyaret Sayısı</div>
        </div>
      ),
      key: `level_${level}`,
      width: 100,
      align: 'center',
      sorter: (a, b) => a.difficultyStats[level] - b.difficultyStats[level],
      filters: getLevelRangeFilters(),
      onFilter: (value, record) => checkLevelRange(value, record.difficultyStats[level]),
      render: (_, record) => {
        const count = record.difficultyStats[level];
        
        // Sayıya göre renk ve stil belirle
        let bgColor = '#f5f5f5';
        let textColor = '#8c8c8c';
        let borderColor = '#d9d9d9';
        
        if (count > 0) {
          if (count >= 20) {
            bgColor = '#fff2f0';
            textColor = '#ff4d4f';
            borderColor = '#ffccc7';
          } else if (count >= 10) {
            bgColor = '#fff7e6';
            textColor = '#fa8c16';
            borderColor = '#ffd591';
          } else if (count >= 5) {
            bgColor = '#feffe6';
            textColor = '#fadb14';
            borderColor = '#ffffb8';
          } else {
            bgColor = '#f6ffed';
            textColor = '#52c41a';
            borderColor = '#b7eb8f';
          }
        }
        
        return (
          <div className="text-center">
            <div 
              className="inline-flex items-center justify-center px-3 py-1 rounded-full border"
              style={{ 
                backgroundColor: bgColor,
                borderColor: borderColor,
                minWidth: '50px'
              }}
            >
              <span 
                className="text-sm font-semibold"
                style={{ color: textColor }}
              >
                {count}
              </span>
            </div>
          </div>
        );
      }
    }))
  ];

  // İstatistikler
  const stats = {
    totalPersonnel: filteredData.length,
    totalDifficultVisits: filteredData.reduce((sum, person) => sum + person.totalDifficultVisits, 0),
    avgDifficultVisits: filteredData.length > 0 ? 
      Math.round(filteredData.reduce((sum, person) => sum + person.totalDifficultVisits, 0) / filteredData.length) : 0,
    maxDifficultVisits: Math.max(...filteredData.map(person => person.totalDifficultVisits), 0)
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <AlertTriangle className="w-6 h-6 mr-3 text-purple-600" />
              Aktarma Personel Mağaza Zorluk Kontrol
            </h2>
            <p className="text-gray-600 text-sm">Personel zorluklu mağaza ziyaret analizi</p>
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
                className="bg-orange-500 hover:bg-orange-600 border-orange-500 hover:border-orange-600 text-white"
                size="default"
              >
                Excel Yükle
              </Button>
            </Upload>
          </div>
        </div>

        {/* Filtreler */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            placeholder="Ad, sicil no veya bölge ile ara..."
            prefix={<Search className="w-4 h-4 text-gray-400" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="rounded-lg h-10 text-sm"
            size="default"
          />
          <Select
            placeholder="Bölge Seçin"
            value={selectedRegion}
            onChange={setSelectedRegion}
            className="w-full h-10"
            size="default"
          >
            <Option value="all">Tüm Bölgeler</Option>
            {Array.from(new Set(personnelData.map(p => p.bolge).filter(Boolean)))
              .sort()
              .map(bolge => (
                <Option key={bolge} value={bolge}>{bolge}</Option>
              ))}
          </Select>
          <Select
            placeholder="Ay Seçin"
            value={selectedMonth}
            onChange={setSelectedMonth}
            className="w-full h-10"
            size="default"
          >
            {availableMonths.map(month => (
              <Option key={month.value} value={month.value}>
                {month.label}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="Zorluk Seviyesi"
            value={selectedDifficulty}
            onChange={setSelectedDifficulty}
            className="w-full h-10"
            size="default"
          >
            <Option value="all">Tüm Zorluk Seviyeleri</Option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(level => (
              <Option key={level} value={level.toString()}>Seviye {level}</Option>
            ))}
          </Select>
        </div>
      </div>

      {/* İstatistikler */}
      <div className="mb-4">
        <Row gutter={[12, 12]}>
          <Col span={6}>
            <Card bodyStyle={{ padding: '12px' }}>
              <Statistic
                title={<span className="text-gray-600 font-medium text-xs">Toplam Personel</span>}
                value={stats.totalPersonnel}
                prefix={<Users className="w-4 h-4 text-blue-600" />}
                valueStyle={{ color: '#1890ff', fontSize: '18px', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card bodyStyle={{ padding: '12px' }}>
              <Statistic
                title={<span className="text-gray-600 font-medium text-xs">Toplam Zorluklu Ziyaret</span>}
                value={stats.totalDifficultVisits}
                prefix={<AlertTriangle className="w-4 h-4 text-orange-600" />}
                valueStyle={{ color: '#fa8c16', fontSize: '18px', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card bodyStyle={{ padding: '12px' }}>
              <Statistic
                title={<span className="text-gray-600 font-medium text-xs">Ortalama Zorluklu Ziyaret</span>}
                value={stats.avgDifficultVisits}
                prefix={<BarChart3 className="w-4 h-4 text-green-600" />}
                valueStyle={{ color: '#52c41a', fontSize: '18px', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card bodyStyle={{ padding: '12px' }}>
              <Statistic
                title={<span className="text-gray-600 font-medium text-xs">En Yüksek Zorluklu Ziyaret</span>}
                value={stats.maxDifficultVisits}
                prefix={<TrendingUp className="w-4 h-4 text-red-600" />}
                valueStyle={{ color: '#f5222d', fontSize: '18px', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* Tablo */}
      <Card className="shadow-sm">
        <Spin spinning={loading} tip={loadingText}>
          {loading && loadingProgress.total > 0 && (
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
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
                      `Tahmini kalan: ${Math.floor(loadingProgress.estimatedTimeRemaining / 60)}:${(loadingProgress.estimatedTimeRemaining % 60).toString().padStart(2, '0')}` : 
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
          
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey="sicil_no"
            pagination={{
              pageSize: 100,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} / ${total} personel`
            }}
            scroll={{ x: 1200 }}
            size="small"
            className="modern-table"
          />
        </Spin>
      </Card>
    </div>
  );
};

export default TransferPersonnelMagazaZorluk;
