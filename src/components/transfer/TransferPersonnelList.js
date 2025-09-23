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

  // Örnek veri - Excel'den yüklenecek veriler
  const mockData = [
    {
      id: 1,
      sicilNo: 'TR001',
      adiSoyadi: 'Ahmet Yılmaz',
      bolge: 'İstanbul Merkez',
      pozisyon: 'Depo Sorumlusu',
      // Performans metrikleri (API'den gelecek)
      dagittigiKasaSayisi: 245,
      paletSayisi: 18,
      okuttuguKasaSayisi: 230,
      okutmadigiKasaSayisi: 15,
      okutmaOrani: 93.9,
      gunlukHedef: 250,
      hedefTamamlamaOrani: 98.0,
      sonGuncelleme: '2024-01-15 14:30',
      status: 'active'
    },
    {
      id: 2,
      sicilNo: 'TR002',
      adiSoyadi: 'Fatma Demir',
      bolge: 'Ankara Şube',
      pozisyon: 'Forklift Operatörü',
      dagittigiKasaSayisi: 189,
      paletSayisi: 12,
      okuttuguKasaSayisi: 175,
      okutmadigiKasaSayisi: 14,
      okutmaOrani: 92.6,
      gunlukHedef: 200,
      hedefTamamlamaOrani: 94.5,
      sonGuncelleme: '2024-01-15 12:15',
      status: 'active'
    },
    {
      id: 3,
      sicilNo: 'TR003',
      adiSoyadi: 'Mehmet Kaya',
      bolge: 'İzmir Depo',
      pozisyon: 'Depo Elemanı',
      dagittigiKasaSayisi: 156,
      paletSayisi: 9,
      okuttuguKasaSayisi: 142,
      okutmadigiKasaSayisi: 14,
      okutmaOrani: 91.0,
      gunlukHedef: 180,
      hedefTamamlamaOrani: 86.7,
      sonGuncelleme: '2024-01-10 16:45',
      status: 'inactive'
    },
    {
      id: 4,
      sicilNo: 'TR004',
      adiSoyadi: 'Ayşe Özkan',
      bolge: 'Bursa Merkez',
      pozisyon: 'Kalite Kontrol',
      dagittigiKasaSayisi: 278,
      paletSayisi: 21,
      okuttuguKasaSayisi: 265,
      okutmadigiKasaSayisi: 13,
      okutmaOrani: 95.3,
      gunlukHedef: 280,
      hedefTamamlamaOrani: 99.3,
      sonGuncelleme: '2024-01-15 15:20',
      status: 'active'
    },
    {
      id: 5,
      sicilNo: 'TR005',
      adiSoyadi: 'Mustafa Çelik',
      bolge: 'İstanbul Merkez',
      pozisyon: 'Depo Elemanı',
      dagittigiKasaSayisi: 203,
      paletSayisi: 15,
      okuttuguKasaSayisi: 195,
      okutmadigiKasaSayisi: 8,
      okutmaOrani: 96.1,
      gunlukHedef: 220,
      hedefTamamlamaOrani: 92.3,
      sonGuncelleme: '2024-01-15 13:45',
      status: 'active'
    }
  ];

  useEffect(() => {
    setPersonnelData(mockData);
    setFilteredData(mockData);
  }, []);

  // Excel dosyası yükleme fonksiyonu
  const handleExcelUpload = (file) => {
    setUploadLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Excel verilerini işle ve performans metriklerini ekle
        const processedData = jsonData.map((row, index) => ({
          id: Date.now() + index,
          sicilNo: row['Sicil No'] || row['sicilNo'] || `TR${String(index + 1).padStart(3, '0')}`,
          adiSoyadi: row['Adı Soyadı'] || row['adiSoyadi'] || '',
          bolge: row['Bölge'] || row['bolge'] || '',
          pozisyon: row['Pozisyon'] || row['pozisyon'] || '',
          // Performans metrikleri (şimdilik örnek değerler, API'den gelecek)
          dagittigiKasaSayisi: Math.floor(Math.random() * 300) + 100,
          paletSayisi: Math.floor(Math.random() * 30) + 5,
          okuttuguKasaSayisi: Math.floor(Math.random() * 280) + 80,
          okutmadigiKasaSayisi: Math.floor(Math.random() * 20) + 1,
          okutmaOrani: Math.round((Math.random() * 20 + 80) * 10) / 10,
          gunlukHedef: Math.floor(Math.random() * 350) + 150,
          hedefTamamlamaOrani: Math.round((Math.random() * 30 + 70) * 10) / 10,
          sonGuncelleme: new Date().toLocaleString('tr-TR'),
          status: 'active'
        }));
        
        setPersonnelData(processedData);
        setFilteredData(processedData);
        message.success(`${processedData.length} personel başarıyla yüklendi!`);
      } catch (error) {
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
        person.adiSoyadi.toLowerCase().includes(searchText.toLowerCase()) ||
        person.sicilNo.toLowerCase().includes(searchText.toLowerCase()) ||
        person.pozisyon.toLowerCase().includes(searchText.toLowerCase()) ||
        person.bolge.toLowerCase().includes(searchText.toLowerCase())
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

  const columns = [
    {
      title: 'Personel',
      key: 'personnel',
      width: 200,
      render: (_, record) => (
        <div className="flex items-center space-x-3">
          <Avatar 
            size={40} 
            className="bg-blue-500 text-white font-semibold"
          >
            {record.fullName.split(' ').map(n => n[0]).join('')}
          </Avatar>
          <div>
            <div className="font-semibold text-gray-800">{record.fullName}</div>
            <div className="text-sm text-gray-500">{record.employeeCode}</div>
          </div>
        </div>
      )
    },
    {
      title: 'Pozisyon',
      dataIndex: 'position',
      key: 'position',
      width: 150,
      render: (text) => <span className="text-sm font-medium">{text}</span>
    },
    {
      title: 'Vardiya',
      dataIndex: 'shift',
      key: 'shift',
      width: 100,
      render: (text) => (
        <Tag color={text === 'Gündüz' ? 'blue' : 'purple'}>
          {text}
        </Tag>
      )
    },
    {
      title: 'Durum',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Badge 
          status={getStatusColor(status)} 
          text={getStatusText(status)}
        />
      )
    },
    {
      title: 'Performans',
      dataIndex: 'performance',
      key: 'performance',
      width: 120,
      render: (performance) => (
        <Tag color={getPerformanceColor(performance)}>
          {getPerformanceText(performance)}
        </Tag>
      )
    },
    {
      title: 'Deneyim',
      dataIndex: 'experience',
      key: 'experience',
      width: 100,
      render: (text) => <span className="text-sm">{text}</span>
    },
    {
      title: 'İletişim',
      key: 'contact',
      width: 150,
      render: (_, record) => (
        <div className="space-y-1">
          <div className="flex items-center text-xs text-gray-600">
            <Phone className="w-3 h-3 mr-1" />
            {record.phone}
          </div>
          <div className="flex items-center text-xs text-gray-600">
            <Mail className="w-3 h-3 mr-1" />
            {record.email}
          </div>
        </div>
      )
    },
    {
      title: 'Son Aktivite',
      dataIndex: 'lastActivity',
      key: 'lastActivity',
      width: 150,
      render: (text) => (
        <div className="flex items-center text-xs text-gray-600">
          <Clock className="w-3 h-3 mr-1" />
          {text}
        </div>
      )
    },
    {
      title: 'İşlemler',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="Düzenle">
            <Button 
              type="text" 
              icon={<Edit className="w-4 h-4" />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Sil">
            <Button 
              type="text" 
              danger
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => handleDelete(record.id)}
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
      onOk: () => {
        setPersonnelData(prev => prev.filter(person => person.id !== id));
        message.success('Personel başarıyla silindi!');
      }
    });
  };

  const handleAdd = () => {
    setEditingRecord(null);
    setIsModalVisible(true);
  };

  const handleModalOk = (values) => {
    if (editingRecord) {
      // Güncelleme
      setPersonnelData(prev => 
        prev.map(person => 
          person.id === editingRecord.id 
            ? { ...person, ...values }
            : person
        )
      );
      message.success('Personel bilgileri güncellendi!');
    } else {
      // Yeni ekleme
      const newPerson = {
        id: Date.now(),
        ...values,
        lastActivity: new Date().toLocaleString('tr-TR')
      };
      setPersonnelData(prev => [...prev, newPerson]);
      message.success('Yeni personel eklendi!');
    }
    setIsModalVisible(false);
    setEditingRecord(null);
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <Users className="w-6 h-6 mr-3 text-green-600" />
              Aktarma Depo Personel Listesi
            </h2>
            <Button 
              type="primary" 
              icon={<Plus className="w-4 h-4" />}
              onClick={handleAdd}
              className="bg-green-600 hover:bg-green-700"
            >
              Yeni Personel Ekle
            </Button>
          </div>

          {/* Filtreler */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Personel adı, kodu veya pozisyon ile ara..."
              prefix={<Search className="w-4 h-4 text-gray-400" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="rounded-lg"
            />
            <Select
              placeholder="Departman Seçin"
              value={selectedDepartment}
              onChange={setSelectedDepartment}
              className="w-full"
            >
              <Option value="all">Tüm Departmanlar</Option>
              <Option value="Aktarma">Aktarma</Option>
              <Option value="Kalite">Kalite</Option>
              <Option value="Lojistik">Lojistik</Option>
            </Select>
            <Select
              placeholder="Durum Seçin"
              value={selectedStatus}
              onChange={setSelectedStatus}
              className="w-full"
            >
              <Option value="all">Tüm Durumlar</Option>
              <Option value="active">Aktif</Option>
              <Option value="inactive">Pasif</Option>
              <Option value="on_leave">İzinli</Option>
            </Select>
          </div>
        </div>

        {/* İstatistikler */}
        <div className="p-6 border-b border-gray-200">
          <Row gutter={16}>
            <Col span={6}>
              <Card className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {personnelData.filter(p => p.status === 'active').length}
                </div>
                <div className="text-sm text-gray-600">Aktif Personel</div>
              </Card>
            </Col>
            <Col span={6}>
              <Card className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {personnelData.filter(p => p.shift === 'Gündüz').length}
                </div>
                <div className="text-sm text-gray-600">Gündüz Vardiyası</div>
              </Card>
            </Col>
            <Col span={6}>
              <Card className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {personnelData.filter(p => p.shift === 'Gece').length}
                </div>
                <div className="text-sm text-gray-600">Gece Vardiyası</div>
              </Card>
            </Col>
            <Col span={6}>
              <Card className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {personnelData.filter(p => p.performance === 'excellent').length}
                </div>
                <div className="text-sm text-gray-600">Mükemmel Performans</div>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Tablo */}
        <div className="p-6">
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} / ${total} personel`
            }}
            loading={loading}
            scroll={{ x: 1200 }}
          />
        </div>
      </div>

      {/* Düzenleme Modalı */}
      <Modal
        title={
          <div className="flex items-center">
            <UserCheck className="w-5 h-5 mr-2 text-blue-600" />
            {editingRecord ? 'Personel Düzenle' : 'Yeni Personel Ekle'}
          </div>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          layout="vertical"
          initialValues={editingRecord || {}}
          onFinish={handleModalOk}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="employeeCode"
                label="Personel Kodu"
                rules={[{ required: true, message: 'Personel kodu gerekli!' }]}
              >
                <Input placeholder="TR001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="fullName"
                label="Ad Soyad"
                rules={[{ required: true, message: 'Ad soyad gerekli!' }]}
              >
                <Input placeholder="Ahmet Yılmaz" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="position"
                label="Pozisyon"
                rules={[{ required: true, message: 'Pozisyon gerekli!' }]}
              >
                <Select placeholder="Pozisyon seçin">
                  <Option value="Depo Sorumlusu">Depo Sorumlusu</Option>
                  <Option value="Forklift Operatörü">Forklift Operatörü</Option>
                  <Option value="Depo Elemanı">Depo Elemanı</Option>
                  <Option value="Kalite Kontrol">Kalite Kontrol</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="shift"
                label="Vardiya"
                rules={[{ required: true, message: 'Vardiya gerekli!' }]}
              >
                <Select placeholder="Vardiya seçin">
                  <Option value="Gündüz">Gündüz</Option>
                  <Option value="Gece">Gece</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Telefon"
                rules={[{ required: true, message: 'Telefon gerekli!' }]}
              >
                <Input placeholder="+90 532 123 4567" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="E-posta"
                rules={[
                  { required: true, message: 'E-posta gerekli!' },
                  { type: 'email', message: 'Geçerli bir e-posta adresi girin!' }
                ]}
              >
                <Input placeholder="ahmet.yilmaz@company.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="status"
                label="Durum"
                rules={[{ required: true, message: 'Durum gerekli!' }]}
              >
                <Select placeholder="Durum seçin">
                  <Option value="active">Aktif</Option>
                  <Option value="inactive">Pasif</Option>
                  <Option value="on_leave">İzinli</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="performance"
                label="Performans"
                rules={[{ required: true, message: 'Performans gerekli!' }]}
              >
                <Select placeholder="Performans seçin">
                  <Option value="excellent">Mükemmel</Option>
                  <Option value="good">İyi</Option>
                  <Option value="average">Orta</Option>
                  <Option value="poor">Zayıf</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="experience"
            label="Deneyim"
            rules={[{ required: true, message: 'Deneyim gerekli!' }]}
          >
            <Input placeholder="3 yıl" />
          </Form.Item>

          <div className="flex justify-end space-x-2 pt-4">
            <Button onClick={() => setIsModalVisible(false)}>
              İptal
            </Button>
            <Button type="primary" htmlType="submit">
              {editingRecord ? 'Güncelle' : 'Ekle'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default TransferPersonnelList;
