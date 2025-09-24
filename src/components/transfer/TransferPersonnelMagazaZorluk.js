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
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [availableMonths, setAvailableMonths] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');

  // Mevcut ayları yükle - pagination ile
  const loadAvailableMonths = async () => {
    try {
      // Tüm ay verilerini pagination ile çek
      let allMonthData = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: monthData, error } = await supabase
          .from('aktarma_personel_magaza_zorluk')
          .select('ay')
          .not('ay', 'is', null)
          .range(from, from + pageSize - 1);

        if (error) throw error;

        if (!monthData || monthData.length === 0) {
          hasMore = false;
        } else {
          allMonthData = [...allMonthData, ...monthData];
          from += pageSize;
          
          if (monthData.length < pageSize) {
            hasMore = false;
          }
        }
      }

      // Benzersiz ayları al ve sırala
      const uniqueMonths = [...new Set(allMonthData.map(item => item.ay))].sort();
      setAvailableMonths(uniqueMonths);
    } catch (error) {
      console.error('Ay verileri yüklenirken hata:', error);
    }
  };

  // Veri yükleme fonksiyonu - Personelleri ve zorluk verilerini çek
  const loadData = async () => {
    try {
      setLoading(true);
      setLoadingProgress(0);
      setLoadingText('Aktarma personelleri yükleniyor...');

      // Aktarma personellerini çek
      const { data: personnel, error: personnelError } = await supabase
        .from('aktarma_depo_personel')
        .select('sicil_no, adi_soyadi, bolge')
        .eq('durum', 'aktif');

      if (personnelError) {
        throw personnelError;
      }

      setLoadingProgress(30);
      setLoadingText('Zorluk verileri yükleniyor...');

      // Tüm zorluk verilerini çek - pagination ile (1000 kayıt limitini aş)
      let allZorlukData = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      setLoadingProgress(35);
      setLoadingText('Zorluk verileri yükleniyor (pagination)...');

      while (hasMore) {
        let zorlukQuery = supabase
          .from('aktarma_personel_magaza_zorluk')
          .select('sicil_no_personel1, sicil_no_personel2, sicil_no_personel3, zorluk_seviyesi, magaza_adi, ay')
          .range(from, from + pageSize - 1);
        
        if (selectedMonth !== 'all') {
          zorlukQuery = zorlukQuery.eq('ay', selectedMonth);
        }
        
        const { data: pageData, error: zorlukError } = await zorlukQuery;

        if (zorlukError) {
          throw zorlukError;
        }

        if (!pageData || pageData.length === 0) {
          hasMore = false;
        } else {
          allZorlukData = [...allZorlukData, ...pageData];
          from += pageSize;
          
          setLoadingProgress(35 + (allZorlukData.length / 100000) * 20); // Tahmini progress
          setLoadingText(`Zorluk verileri yükleniyor... ${allZorlukData.length} kayıt`);
          
          if (pageData.length < pageSize) {
            hasMore = false;
          }
        }
      }

      const zorlukData = allZorlukData;

      setLoadingProgress(60);
      setLoadingText('Veriler işleniyor...');

      // Debug: Veritabanındaki sicil numaralarını ve zorluk verilerini kontrol et
      console.log('Aktarma personelleri (ilk 10):', personnel.slice(0, 10).map(p => p.sicil_no));
      console.log('Zorluk verileri (ilk 10):', zorlukData?.slice(0, 10));
      console.log('Toplam zorluk verisi:', zorlukData?.length);
      
      // Zorluk verilerindeki tüm sicil numaralarını topla
      const allSicilsInZorluk = new Set();
      zorlukData?.forEach(record => {
        if (record.sicil_no_personel1) allSicilsInZorluk.add(record.sicil_no_personel1.toString().trim());
        if (record.sicil_no_personel2) allSicilsInZorluk.add(record.sicil_no_personel2.toString().trim());
        if (record.sicil_no_personel3) allSicilsInZorluk.add(record.sicil_no_personel3.toString().trim());
      });
      
      console.log('Zorluk verilerindeki tüm sicil numaraları:', Array.from(allSicilsInZorluk).slice(0, 20));
      console.log('Toplam farklı sicil sayısı (zorluk verilerinde):', allSicilsInZorluk.size);
      
      // Aktarma personellerindeki sicil numaraları
      const aktarmaSicils = new Set(personnel.map(p => p.sicil_no.toString().trim()));
      console.log('Aktarma personellerindeki sicil numaraları (ilk 20):', Array.from(aktarmaSicils).slice(0, 20));
      console.log('Toplam aktarma personel sayısı:', aktarmaSicils.size);
      
      // Eşleşmeyen sicil numaralarını bul
      const notInAktarma = Array.from(allSicilsInZorluk).filter(sicil => !aktarmaSicils.has(sicil));
      const notInZorluk = Array.from(aktarmaSicils).filter(sicil => !allSicilsInZorluk.has(sicil));
      
      console.log('Zorluk verilerinde var ama aktarma personellerinde yok:', notInAktarma.slice(0, 10));
      console.log('Aktarma personellerinde var ama zorluk verilerinde yok:', notInZorluk.slice(0, 10));

      // Her personel için zorluk istatistiklerini hesapla
      const personnelWithDifficulty = [];
      
      for (let i = 0; i < personnel.length; i++) {
        const person = personnel[i];
        setLoadingProgress(60 + (i / personnel.length) * 35);
        setLoadingText(`${person.adi_soyadi} için zorluk analizi yapılıyor...`);

        // Bu personelin zorluk verilerini bul - 3 sütunda da ara
        const personZorlukData = zorlukData?.filter(record => {
          const sicil1 = record.sicil_no_personel1?.toString().trim();
          const sicil2 = record.sicil_no_personel2?.toString().trim();
          const sicil3 = record.sicil_no_personel3?.toString().trim();
          const personSicil = person.sicil_no.toString().trim();
          
          return sicil1 === personSicil || sicil2 === personSicil || sicil3 === personSicil;
        }) || [];

        // Debug için - eşleşen veri var mı kontrol et
        if (personZorlukData.length > 0) {
          console.log(`${person.adi_soyadi} (${person.sicil_no}) için ${personZorlukData.length} zorluk verisi bulundu:`, personZorlukData);
          
          // Hangi sütunda bulunduğunu göster
          personZorlukData.forEach((record, index) => {
            const sicil1 = record.sicil_no_personel1?.toString().trim();
            const sicil2 = record.sicil_no_personel2?.toString().trim();
            const sicil3 = record.sicil_no_personel3?.toString().trim();
            const personSicil = person.sicil_no.toString().trim();
            
            let foundIn = [];
            if (sicil1 === personSicil) foundIn.push('Personel1');
            if (sicil2 === personSicil) foundIn.push('Personel2');
            if (sicil3 === personSicil) foundIn.push('Personel3');
            
            console.log(`  Kayıt ${index + 1}: ${record.magaza_adi} (Zorluk: ${record.zorluk_seviyesi}) - Bulundu: ${foundIn.join(', ')}`);
          });
        }

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

        // Debug: Hesaplanan zorluk istatistiklerini göster
        if (personZorlukData.length > 0) {
          console.log(`${person.adi_soyadi} zorluk istatistikleri:`, difficultyStats);
        }

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

      setLoadingProgress(100);
      setLoadingText('Tamamlandı!');

      setPersonnelData(personnelWithDifficulty);
      setFilteredData(personnelWithDifficulty);

    } catch (error) {
      message.error(`Veriler yüklenirken hata oluştu: ${error.message}`);
    } finally {
      setTimeout(() => {
        setLoading(false);
        setLoadingProgress(0);
        setLoadingText('');
      }, 500);
    }
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
    loadData();
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
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <AlertTriangle className="w-8 h-8 mr-4 text-purple-600" />
              Aktarma Personel Mağaza Zorluk Kontrol
            </h2>
            <p className="text-gray-600 text-lg">Personel zorluklu mağaza ziyaret analizi</p>
          </div>
          <div className="flex space-x-3">
            <Upload
              accept=".xlsx,.xls"
              beforeUpload={handleExcelUpload}
              showUploadList={false}
            >
              <Button 
                icon={<UploadIcon className="w-4 h-4" />}
                className="bg-orange-500 hover:bg-orange-600 border-orange-500 hover:border-orange-600 text-white"
                size="large"
              >
                Excel Yükle
              </Button>
            </Upload>
            <Button 
              icon={<Download className="w-4 h-4" />}
              onClick={handleDownloadReport}
              className="bg-green-600 hover:bg-green-700 border-green-600 hover:border-green-700 text-white"
              size="large"
            >
              Rapor İndir
            </Button>
          </div>
        </div>

        {/* Filtreler */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Ad, sicil no veya bölge ile ara..."
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
              .sort()
              .map(bolge => (
                <Option key={bolge} value={bolge}>{bolge}</Option>
              ))}
          </Select>
          <Select
            placeholder="Ay Seçin"
            value={selectedMonth}
            onChange={setSelectedMonth}
            className="w-full h-12"
            size="large"
          >
            <Option value="all">Tüm Aylar</Option>
            {availableMonths.map(month => {
              const monthNames = {
                '01': 'Ocak', '02': 'Şubat', '03': 'Mart', '04': 'Nisan',
                '05': 'Mayıs', '06': 'Haziran', '07': 'Temmuz', '08': 'Ağustos',
                '09': 'Eylül', '10': 'Ekim', '11': 'Kasım', '12': 'Aralık'
              };
              return (
                <Option key={month} value={month}>
                  {monthNames[month] || month}
                </Option>
              );
            })}
          </Select>
          <Select
            placeholder="Zorluk Seviyesi"
            value={selectedDifficulty}
            onChange={setSelectedDifficulty}
            className="w-full h-12"
            size="large"
          >
            <Option value="all">Tüm Zorluk Seviyeleri</Option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(level => (
              <Option key={level} value={level.toString()}>Seviye {level}</Option>
            ))}
          </Select>
        </div>
      </div>

      {/* İstatistikler */}
      <div className="mb-6">
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Toplam Personel"
                value={stats.totalPersonnel}
                prefix={<Users className="w-4 h-4 text-blue-600" />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Toplam Zorluklu Ziyaret"
                value={stats.totalDifficultVisits}
                prefix={<AlertTriangle className="w-4 h-4 text-orange-600" />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Ortalama Zorluklu Ziyaret"
                value={stats.avgDifficultVisits}
                prefix={<BarChart3 className="w-4 h-4 text-green-600" />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="En Yüksek Zorluklu Ziyaret"
                value={stats.maxDifficultVisits}
                prefix={<TrendingUp className="w-4 h-4 text-red-600" />}
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* Tablo */}
      <Card className="shadow-sm">
        <Spin spinning={loading} tip={loadingText}>
          {loading && (
            <div className="mb-4">
              <Progress percent={loadingProgress} status="active" />
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
