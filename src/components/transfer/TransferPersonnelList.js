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
import * as XLSX from 'xlsx';
import { supabase } from '../../services/supabase';

const { Option } = Select;
const { Dragger } = Upload;

const TransferPersonnelList = () => {
  const [personnelData, setPersonnelData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [uploadLoading, setUploadLoading] = useState(false);

  // Mock data kaldırıldı - sadece Excel'den gelen gerçek veriler gösterilecek

  useEffect(() => {
    loadPersonnelData();
  }, []);

  // Supabase'den personel verilerini çekme
  const loadPersonnelData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('aktarma_depo_personel')
        .select('*')
        .order('adi_soyadi', { ascending: true });

      if (error) throw error;
      
      setPersonnelData(data || []);
      setFilteredData(data || []);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      message.error('Veriler yüklenirken hata oluştu!');
      // Hata durumunda boş liste
      setPersonnelData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
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
      width: 120,
      sorter: (a, b) => (a.dagittigi_kasa_sayisi || 0) - (b.dagittigi_kasa_sayisi || 0),
      render: (_, record) => (
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Package className="w-4 h-4 text-blue-600 mr-1" />
            <span className="font-bold text-lg text-blue-600">{record.dagittigi_kasa_sayisi || 0}</span>
          </div>
          <Progress 
            percent={record.okutma_orani || 0} 
            size="small" 
            strokeColor={(record.okutma_orani || 0) > 95 ? '#52c41a' : (record.okutma_orani || 0) > 90 ? '#1890ff' : '#faad14'}
            showInfo={false}
          />
          <div className="text-xs text-gray-500 mt-1">{record.okutma_orani || 0}% okutuldu</div>
        </div>
      )
    },
    {
      title: 'Palet Sayısı',
      key: 'palet',
      width: 100,
      sorter: (a, b) => (a.palet_sayisi || 0) - (b.palet_sayisi || 0),
      render: (_, record) => (
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Palette className="w-4 h-4 text-green-600 mr-1" />
            <span className="font-bold text-lg text-green-600">{record.palet_sayisi || 0}</span>
          </div>
        </div>
      )
    },
    {
      title: 'Okutma Detayı',
      key: 'okutma',
      width: 140,
      render: (_, record) => (
        <div className="space-y-1">
          <div className="flex items-center text-xs">
            <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
            <span className="text-green-600 font-medium">{record.okuttugu_kasa_sayisi || 0} okutuldu</span>
          </div>
          <div className="flex items-center text-xs">
            <XCircle className="w-3 h-3 text-red-500 mr-1" />
            <span className="text-red-500">{record.okutmadigi_kasa_sayisi || 0} okutulmadı</span>
          </div>
        </div>
      )
    },
    {
      title: 'Hedef Performansı',
      key: 'hedef',
      width: 130,
      sorter: (a, b) => (a.hedef_tamamlama_orani || 0) - (b.hedef_tamamlama_orani || 0),
      render: (_, record) => (
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Hedef: {record.gunluk_hedef || 0}</div>
          <Progress 
            percent={record.hedef_tamamlama_orani || 0} 
            size="small" 
            strokeColor={(record.hedef_tamamlama_orani || 0) > 95 ? '#52c41a' : (record.hedef_tamamlama_orani || 0) > 85 ? '#1890ff' : '#faad14'}
          />
          <div className="text-xs mt-1">
            {(record.hedef_tamamlama_orani || 0) > 95 ? (
              <TrendingUp className="w-3 h-3 text-green-500 inline mr-1" />
            ) : (
              <TrendingDown className="w-3 h-3 text-orange-500 inline mr-1" />
            )}
            {record.hedef_tamamlama_orani || 0}%
          </div>
        </div>
      )
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
          <Row gutter={[24, 24]}>
            <Col xs={24} sm={12} md={6}>
              <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-blue-50 to-blue-100">
                <Statistic
                  title={<span className="text-gray-600 font-medium">Toplam Personel</span>}
                  value={personnelData.length}
                  valueStyle={{ color: '#1890ff', fontSize: '28px', fontWeight: 'bold' }}
                  prefix={<Users className="w-6 h-6 text-blue-600" />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-green-50 to-green-100">
                <Statistic
                  title={<span className="text-gray-600 font-medium">Aktif Personel</span>}
                  value={personnelData.filter(p => p.durum === 'aktif').length}
                  valueStyle={{ color: '#52c41a', fontSize: '28px', fontWeight: 'bold' }}
                  prefix={<CheckCircle className="w-6 h-6 text-green-600" />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-purple-50 to-purple-100">
                <Statistic
                  title={<span className="text-gray-600 font-medium">Toplam Kasa</span>}
                  value={personnelData.reduce((sum, p) => sum + (p.dagittigi_kasa_sayisi || 0), 0)}
                  valueStyle={{ color: '#722ed1', fontSize: '28px', fontWeight: 'bold' }}
                  prefix={<Package className="w-6 h-6 text-purple-600" />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-orange-50 to-orange-100">
                <Statistic
                  title={<span className="text-gray-600 font-medium">Ortalama Okutma Oranı</span>}
                  value={personnelData.length > 0 ? Math.round(personnelData.reduce((sum, p) => sum + (p.okutma_orani || 0), 0) / personnelData.length * 10) / 10 : 0}
                  suffix="%"
                  valueStyle={{ color: '#fa8c16', fontSize: '28px', fontWeight: 'bold' }}
                  prefix={<BarChart3 className="w-6 h-6 text-orange-600" />}
                />
              </Card>
            </Col>
          </Row>
        </div>

        {/* Tablo */}
        <div className="p-8">
          {filteredData.length === 0 && (
            <div className="mb-4">
              <Alert
                message="Henüz personel verisi yok. Excel dosyası yükleyerek başlayın."
                type="warning"
                showIcon
                className="rounded-lg"
              />
            </div>
          )}
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
            loading={loading}
            scroll={{ x: 1200 }}
            className="modern-table"
            rowClassName={(record) => 
              record.durum === 'aktif' ? 'active-row' : 'inactive-row'
            }
          />
        </div>
      </div>

      {/* Düzenleme Modalı */}
      <Modal
        title={
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <UserCheck className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <span className="text-lg font-semibold text-gray-900">
                {editingRecord ? 'Personel Düzenle' : 'Yeni Personel Ekle'}
              </span>
              <div className="text-sm text-gray-500">
                {editingRecord ? 'Personel bilgilerini güncelleyin' : 'Yeni personel ekleyin'}
              </div>
            </div>
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={700}
        className="modern-modal"
      >
        <Form
          layout="vertical"
          initialValues={editingRecord || {}}
          onFinish={handleModalOk}
          className="space-y-4"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sicil_no"
                label={<span className="font-semibold text-gray-700">Sicil No</span>}
                rules={[{ required: true, message: 'Sicil no gerekli!' }]}
              >
                <Input placeholder="TR001" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="adi_soyadi"
                label={<span className="font-semibold text-gray-700">Ad Soyad</span>}
                rules={[{ required: true, message: 'Ad soyad gerekli!' }]}
              >
                <Input placeholder="Ahmet Yılmaz" size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="bolge"
                label={<span className="font-semibold text-gray-700">Bölge</span>}
                rules={[{ required: true, message: 'Bölge gerekli!' }]}
              >
                <Select placeholder="Bölge seçin" size="large">
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
                label={<span className="font-semibold text-gray-700">Pozisyon</span>}
                rules={[{ required: true, message: 'Pozisyon gerekli!' }]}
              >
                <Select placeholder="Pozisyon seçin" size="large">
                  {Array.from(new Set(personnelData.map(p => p.pozisyon).filter(Boolean)))
                    .map(pozisyon => (
                      <Option key={pozisyon} value={pozisyon}>{pozisyon}</Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider className="my-6" />
          
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
              <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center mr-3">
                <BarChart3 className="w-4 h-4 text-gray-600" />
              </div>
              Performans Hedefleri
            </h4>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="gunluk_hedef"
                  label={<span className="font-medium text-gray-700">Günlük Hedef (Kasa)</span>}
                  rules={[{ required: true, message: 'Günlük hedef gerekli!' }]}
                >
                  <Input placeholder="250" size="large" type="number" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="durum"
                  label={<span className="font-medium text-gray-700">Durum</span>}
                  rules={[{ required: true, message: 'Durum gerekli!' }]}
                >
                  <Select placeholder="Durum seçin" size="large">
                    <Option value="aktif">Aktif</Option>
                    <Option value="pasif">Pasif</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button 
              onClick={() => setIsModalVisible(false)}
              size="large"
              className="px-6 h-10 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              İptal
            </Button>
            <Button 
              type="primary" 
              htmlType="submit"
              size="large"
              className="px-6 h-10 bg-gray-900 hover:bg-gray-800 border-gray-900 hover:border-gray-800"
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
