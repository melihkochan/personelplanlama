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
  Avatar
} from 'antd';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  Clock,
  MapPin,
  Phone,
  Mail,
  UserCheck,
  AlertCircle
} from 'lucide-react';

const { Option } = Select;
const { TextArea } = Input;

const TransferPersonnelList = () => {
  const [personnelData, setPersonnelData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Örnek veri - gerçek uygulamada API'den gelecek
  const mockData = [
    {
      id: 1,
      employeeCode: 'TR001',
      fullName: 'Ahmet Yılmaz',
      department: 'Aktarma',
      position: 'Depo Sorumlusu',
      phone: '+90 532 123 4567',
      email: 'ahmet.yilmaz@company.com',
      status: 'active',
      shift: 'Gündüz',
      experience: '5 yıl',
      lastActivity: '2024-01-15 14:30',
      performance: 'excellent'
    },
    {
      id: 2,
      employeeCode: 'TR002',
      fullName: 'Fatma Demir',
      department: 'Aktarma',
      position: 'Forklift Operatörü',
      phone: '+90 533 234 5678',
      email: 'fatma.demir@company.com',
      status: 'active',
      shift: 'Gece',
      experience: '3 yıl',
      lastActivity: '2024-01-15 12:15',
      performance: 'good'
    },
    {
      id: 3,
      employeeCode: 'TR003',
      fullName: 'Mehmet Kaya',
      department: 'Aktarma',
      position: 'Depo Elemanı',
      phone: '+90 534 345 6789',
      email: 'mehmet.kaya@company.com',
      status: 'inactive',
      shift: 'Gündüz',
      experience: '2 yıl',
      lastActivity: '2024-01-10 16:45',
      performance: 'average'
    },
    {
      id: 4,
      employeeCode: 'TR004',
      fullName: 'Ayşe Özkan',
      department: 'Aktarma',
      position: 'Kalite Kontrol',
      phone: '+90 535 456 7890',
      email: 'ayse.ozkan@company.com',
      status: 'active',
      shift: 'Gündüz',
      experience: '4 yıl',
      lastActivity: '2024-01-15 15:20',
      performance: 'excellent'
    }
  ];

  useEffect(() => {
    setPersonnelData(mockData);
    setFilteredData(mockData);
  }, []);

  // Arama ve filtreleme
  useEffect(() => {
    let filtered = personnelData;

    if (searchText) {
      filtered = filtered.filter(person => 
        person.fullName.toLowerCase().includes(searchText.toLowerCase()) ||
        person.employeeCode.toLowerCase().includes(searchText.toLowerCase()) ||
        person.position.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(person => person.department === selectedDepartment);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(person => person.status === selectedStatus);
    }

    setFilteredData(filtered);
  }, [searchText, selectedDepartment, selectedStatus, personnelData]);

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
