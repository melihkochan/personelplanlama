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
  Tooltip
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
  Filter
} from 'lucide-react';
import { supabase } from '../../services/supabase';

const { Option } = Select;

const TransferPersonnelMagazaZorluk = () => {
  const [loading, setLoading] = useState(false);
  const [personnelData, setPersonnelData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');

  // Veri yükleme fonksiyonu
  const loadData = async () => {
    try {
      setLoading(true);
      setLoadingProgress(0);
      setLoadingText('Personel verileri yükleniyor...');

      // 1. Aktarma personellerini çek (240 kişi)
      const { data: personnel, error: personnelError } = await supabase
        .from('aktarma_depo_personel')
        .select('*')
        .eq('durum', 'aktif');

      if (personnelError) {
        throw personnelError;
      }

      setLoadingProgress(30);
      setLoadingText('Mağaza zorluk verileri yükleniyor...');

      // 2. Mağaza zorluk verilerini çek
      const { data: storeDifficulty, error: storeError } = await supabase
        .from('store_difficulty')
        .select('*');

      if (storeError) {
        throw storeError;
      }

      setLoadingProgress(60);
      setLoadingText('Personel-mağaza eşleştirmesi yapılıyor...');

      // 3. Her personel için zorluklu mağaza ziyaretlerini hesapla
      const personnelWithDifficulty = [];
      
      for (let i = 0; i < personnel.length; i++) {
        const person = personnel[i];
        setLoadingProgress(60 + (i / personnel.length) * 35);
        setLoadingText(`${person.adi_soyadi} için zorluk analizi yapılıyor...`);

        // Bu personelin gittiği mağazaları çek (PAGINATION EKLENDİ)
        let allDistributionData = [];
        let from = 0;
        const pageSize = 1000;

        while (true) {
          const { data: pageData, error: distError } = await supabase
            .from('aktarma_dagitim_verileri')
            .select('magaza_kodu, magaza_adi')
            .or(`sicil_no_personel1.eq.${person.sicil_no},sicil_no_personel2.eq.${person.sicil_no},sicil_no_personel3.eq.${person.sicil_no}`)
            .range(from, from + pageSize - 1);

          if (distError) {
            break;
          }

          if (!pageData || pageData.length === 0) {
            break;
          }

          allDistributionData = [...allDistributionData, ...pageData];
          from += pageSize;

          if (pageData.length < pageSize) {
            break;
          }
        }
        
        const distributionData = allDistributionData;

        // Zorluk seviyelerine göre mağaza ziyaretlerini say
        const difficultyStats = {
          1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0
        };

        const visitedStores = new Set();
        
        distributionData?.forEach(record => {
          if (record.magaza_kodu && !visitedStores.has(record.magaza_kodu)) {
            visitedStores.add(record.magaza_kodu);
            
            // Bu mağazanın zorluk seviyesini bul
            const storeInfo = storeDifficulty?.find(store => 
              store.store_code === record.magaza_kodu || 
              store.store_name === record.magaza_adi ||
              store.magaza_kodu === record.magaza_kodu ||
              store.magaza_adi === record.magaza_adi
            );
            
            if (storeInfo) {
              // Farklı alan isimlerini dene
              const difficultyLevel = storeInfo.difficulty_level || 
                                    storeInfo.zorluk_seviyesi || 
                                    storeInfo.difficulty || 
                                    storeInfo.level;
              
              if (difficultyLevel) {
                const level = parseInt(difficultyLevel);
                if (level >= 1 && level <= 8) {
                  difficultyStats[level]++;
                }
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

  // Filtreler değiştiğinde uygula
  useEffect(() => {
    applyFilters();
  }, [searchText, selectedRegion, selectedDifficulty, personnelData]);

  // Component mount olduğunda veri yükle
  useEffect(() => {
    loadData();
  }, []);

  // Tablo sütunları
  const columns = [
    {
      title: 'Sicil No',
      key: 'sicil_no',
      width: 80,
      sorter: (a, b) => a.sicil_no - b.sicil_no,
      render: (_, record) => (
        <span className="text-xs font-mono">{record.sicil_no}</span>
      )
    },
    {
      title: 'Ad Soyad',
      key: 'adi_soyadi',
      width: 140,
      sorter: (a, b) => a.adi_soyadi.localeCompare(b.adi_soyadi),
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
      render: (_, record) => (
        <Tag color="blue" className="text-xs">
          {record.bolge}
        </Tag>
      )
    },
    {
      title: 'Ziyaret Edilen Mağaza',
      key: 'visited_stores',
      width: 120,
      sorter: (a, b) => a.visitedStoresCount - b.visitedStoresCount,
      render: (_, record) => (
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <MapPin className="w-3 h-3 text-blue-600 mr-1" />
            <span className="font-bold text-sm text-blue-600">{record.visitedStoresCount}</span>
          </div>
          <div className="text-xs text-gray-500">mağaza</div>
        </div>
      )
    },
    {
      title: 'Zorluklu Mağaza Ziyareti',
      key: 'difficult_visits',
      width: 140,
      sorter: (a, b) => a.totalDifficultVisits - b.totalDifficultVisits,
      render: (_, record) => (
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <AlertTriangle className="w-3 h-3 text-orange-600 mr-1" />
            <span className="font-bold text-sm text-orange-600">{record.totalDifficultVisits}</span>
          </div>
          <div className="text-xs text-gray-500">zorluklu mağaza</div>
        </div>
      )
    },
    {
      title: 'En Çok Gidilen Zorluk',
      key: 'max_difficulty',
      width: 120,
      sorter: (a, b) => a.maxDifficulty - b.maxDifficulty,
      render: (_, record) => {
        const colors = {
          1: 'green', 2: 'lime', 3: 'yellow', 4: 'orange',
          5: 'red', 6: 'purple', 7: 'magenta', 8: 'volcano'
        };
        return (
          <div className="text-center">
            <Tag color={colors[record.maxDifficulty] || 'default'} className="text-xs">
              Seviye {record.maxDifficulty}
            </Tag>
            <div className="text-xs text-gray-500 mt-1">
              {record.maxDifficultyCount} kez
            </div>
          </div>
        );
      }
    },
    {
      title: 'Zorluk Dağılımı',
      key: 'difficulty_distribution',
      width: 200,
      render: (_, record) => (
        <div className="space-y-1">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(level => {
            const count = record.difficultyStats[level];
            if (count === 0) return null;
            
            const colors = {
              1: '#52c41a', 2: '#a0d911', 3: '#fadb14', 4: '#fa8c16',
              5: '#f5222d', 6: '#722ed1', 7: '#eb2f96', 8: '#fa541c'
            };
            
            return (
              <div key={level} className="flex items-center justify-between text-xs">
                <span>Seviye {level}:</span>
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded mr-1" 
                    style={{ backgroundColor: colors[level] }}
                  ></div>
                  <span className="font-medium">{count}</span>
                </div>
              </div>
            );
          })}
        </div>
      )
    }
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
            <Button 
              icon={<Download className="w-4 h-4" />}
              onClick={() => {
                // Excel export fonksiyonu buraya eklenecek
                message.info('Excel export özelliği yakında eklenecek!');
              }}
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
          <Button 
            icon={<Filter className="w-4 h-4" />}
            onClick={applyFilters}
            className="h-12 bg-blue-600 hover:bg-blue-700 border-blue-600 hover:border-blue-700"
            size="large"
          >
            Filtrele
          </Button>
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
      <Card>
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
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} / ${total} personel`
            }}
            scroll={{ x: 1000 }}
            size="small"
          />
        </Spin>
      </Card>
    </div>
  );
};

export default TransferPersonnelMagazaZorluk;
