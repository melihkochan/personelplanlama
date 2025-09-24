import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Button, 
  Input, 
  Select, 
  Space, 
  Modal, 
  Form, 
  message, 
  Upload, 
  Tag, 
  Popconfirm,
  Row,
  Col,
  Statistic,
  Switch,
  Typography
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  UploadOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  CarOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  SortAscendingOutlined
} from '@ant-design/icons';
import { supabase } from '../../services/supabase';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { Option } = Select;

const TransferVehicleList = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [viewingVehicle, setViewingVehicle] = useState(null);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [excelData, setExcelData] = useState([]);
  const [viewMode, setViewMode] = useState('cards');
  const [form] = Form.useForm();

  // Bölgeler
  const regionOptions = [
    { value: 'all', label: 'Tüm Bölgeler', color: 'default' },
    { value: 'ADANA', label: 'ADANA', color: 'red' },
    { value: 'ISTANBUL_AND', label: 'ISTANBUL - AND', color: 'blue' },
    { value: 'ANKARA', label: 'ANKARA', color: 'purple' },
    { value: 'ANTALYA', label: 'ANTALYA', color: 'green' },
    { value: 'ISTANBUL_AVR', label: 'ISTANBUL - AVR', color: 'cyan' },
    { value: 'BALIKESIR', label: 'BALIKESIR', color: 'orange' },
    { value: 'BURSA', label: 'BURSA', color: 'volcano' },
    { value: 'DIYARBAKIR', label: 'DIYARBAKIR', color: 'magenta' },
    { value: 'DUZCE', label: 'DUZCE', color: 'lime' },
    { value: 'ERZURUM', label: 'ERZURUM', color: 'geekblue' },
    { value: 'ESKISEHIR', label: 'ESKISEHIR', color: 'gold' },
    { value: 'GAZIANTEP', label: 'GAZIANTEP', color: 'green' },
    { value: 'IZMIR', label: 'IZMIR', color: 'orange' },
    { value: 'KAYSERI', label: 'KAYSERI', color: 'red' },
    { value: 'KONYA', label: 'KONYA', color: 'purple' },
    { value: 'MUGLA', label: 'MUGLA', color: 'blue' },
    { value: 'SAMSUN', label: 'SAMSUN', color: 'default' },
    { value: 'TRABZON', label: 'TRABZON', color: 'cyan' }
  ];

  // Araç verilerini yükle
  const loadVehicles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transfer_vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Araç yükleme hatası:', error);
      message.error('Araçlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  // Sıralama state'i
  const [sortField, setSortField] = useState('plate');
  const [sortDirection, setSortDirection] = useState('asc');

  // Sıralama fonksiyonu
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtrelenmiş ve sıralanmış araçlar
  const filteredVehicles = vehicles
    .filter(vehicle => {
      const matchesSearch = !searchTerm || 
        vehicle.plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.region?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRegion = selectedRegion === 'all' || vehicle.region === selectedRegion;
      
      return matchesSearch && matchesRegion;
    })
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Bölge rengini al
  const getRegionColor = (region) => {
    const regionOption = regionOptions.find(r => r.value === region);
    return regionOption ? regionOption.color : 'default';
  };

  // Bölge adını al
  const getRegionName = (region) => {
    const regionOption = regionOptions.find(r => r.value === region);
    return regionOption ? regionOption.label : region;
  };

  // Durum rengini al
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'maintenance': return 'warning';
      case 'inactive': return 'error';
      default: return 'default';
    }
  };

  // Durum metnini al
  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Aktif';
      case 'maintenance': return 'Bakımda';
      case 'inactive': return 'Pasif';
      default: return status;
    }
  };

  // Durum ikonunu al
  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircleOutlined />;
      case 'maintenance': return <ClockCircleOutlined />;
      case 'inactive': return <ExclamationCircleOutlined />;
      default: return null;
    }
  };

  // Yeni araç ekleme
  const handleAddVehicle = () => {
    setEditingVehicle({});
    form.resetFields();
  };

  // Araç düzenleme
  const handleEditVehicle = (vehicle) => {
    setEditingVehicle(vehicle);
    form.setFieldsValue(vehicle);
  };

  // Araç kaydetme
  const handleSaveVehicle = async (values) => {
    try {
      if (editingVehicle.id) {
        // Güncelleme
        const { error } = await supabase
          .from('transfer_vehicles')
          .update(values)
          .eq('id', editingVehicle.id);

        if (error) throw error;
        message.success('Araç başarıyla güncellendi');
      } else {
        // Yeni ekleme
        const { error } = await supabase
          .from('transfer_vehicles')
          .insert([values]);

        if (error) throw error;
        message.success('Araç başarıyla eklendi');
      }

      setEditingVehicle(null);
      loadVehicles();
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      message.error('Araç kaydedilirken hata oluştu');
    }
  };

  // Araç silme
  const handleDeleteVehicle = async (vehicle) => {
    try {
      const { error } = await supabase
        .from('transfer_vehicles')
        .delete()
        .eq('id', vehicle.id);

      if (error) throw error;
      message.success('Araç başarıyla silindi');
      loadVehicles();
    } catch (error) {
      console.error('Silme hatası:', error);
      message.error('Araç silinirken hata oluştu');
    }
  };

  // Excel yükleme
  const handleExcelUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        setExcelData(jsonData);
        setShowExcelUpload(true);
      } catch (error) {
        message.error('Excel dosyası okunamadı');
      }
    };
    reader.readAsArrayBuffer(file);
    return false; // Prevent upload
  };

  // Excel verilerini kaydetme
  const handleSaveExcelData = async () => {
    try {
      const vehiclesToInsert = [];
      
      excelData.forEach(row => {
        const columns = Object.keys(row);
        
        columns.forEach(columnName => {
          const plateValue = row[columnName];
          
          if (plateValue && plateValue.toString().trim() !== '') {
            const regionName = columnName.toString().trim().toUpperCase()
              .replace(/\s+/g, '_')
              .replace(/[^A-Z0-9_]/g, '');
            
            vehiclesToInsert.push({
              plate: plateValue.toString().trim(),
              region: regionName,
              status: 'active',
              created_at: new Date().toISOString()
            });
          }
        });
      });

      if (vehiclesToInsert.length === 0) {
        message.warning('Kaydedilecek geçerli veri bulunamadı');
        return;
      }

      const { error } = await supabase
        .from('transfer_vehicles')
        .insert(vehiclesToInsert);

      if (error) throw error;

      message.success(`${vehiclesToInsert.length} araç başarıyla kaydedildi`);
      setShowExcelUpload(false);
      setExcelData([]);
      loadVehicles();
    } catch (error) {
      console.error('Excel kaydetme hatası:', error);
      message.error('Veriler kaydedilirken hata oluştu');
    }
  };

  // Tablo sütunları
  const columns = [
    {
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CarOutlined style={{ color: '#1890ff' }} />
          <span>Plaka</span>
        </div>
      ),
      dataIndex: 'plate',
      key: 'plate',
      sorter: (a, b) => a.plate.localeCompare(b.plate),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder="Plaka ara..."
            value={selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
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
            <Button
              onClick={() => clearFilters()}
              size="small"
              style={{ width: 90 }}
            >
              Temizle
            </Button>
          </Space>
        </div>
      ),
      filterIcon: (filtered) => (
        <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
      ),
      onFilter: (value, record) =>
        record.plate.toLowerCase().includes(value.toLowerCase()),
      render: (text) => (
        <Text code style={{ fontSize: '14px', fontWeight: '500' }}>{text}</Text>
      ),
    },
    {
      title: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <EnvironmentOutlined style={{ color: '#52c41a' }} />
          <span>Bölge</span>
        </div>
      ),
      dataIndex: 'region',
      key: 'region',
      sorter: (a, b) => a.region.localeCompare(b.region),
      defaultSortOrder: 'ascend',
      filters: regionOptions.slice(1)
        .sort((a, b) => a.label.localeCompare(b.label, 'tr'))
        .map(region => ({
          text: region.label,
          value: region.value,
        })),
      onFilter: (value, record) => record.region === value,
      render: (region) => (
        <Tag 
          color={getRegionColor(region)}
          style={{ 
            borderRadius: '12px',
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: '500'
          }}
        >
          {getRegionName(region)}
        </Tag>
      ),
    },
    {
      title: 'Durum',
      dataIndex: 'status',
      key: 'status',
      sorter: (a, b) => a.status.localeCompare(b.status),
      filters: [
        { text: 'Aktif', value: 'active' },
        { text: 'Bakımda', value: 'maintenance' },
        { text: 'Pasif', value: 'inactive' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => (
        <Tag 
          color={getStatusColor(status)} 
          icon={getStatusIcon(status)}
          style={{ 
            borderRadius: '12px',
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: '500'
          }}
        >
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: 'Son Güncelleme',
      dataIndex: 'updated_at',
      key: 'updated_at',
      sorter: (a, b) => new Date(a.updated_at) - new Date(b.updated_at),
      render: (date) => (
        <Text style={{ fontSize: '13px', color: '#666' }}>
          {new Date(date).toLocaleDateString('tr-TR')}
        </Text>
      ),
    },
    {
      title: 'İşlemler',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditVehicle(record)}
            style={{
              borderRadius: '8px',
              height: '32px',
              fontSize: '12px',
              fontWeight: '500',
              boxShadow: '0 2px 4px rgba(24, 144, 255, 0.2)'
            }}
          >
            Düzenle
          </Button>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setViewingVehicle(record)}
            style={{
              borderRadius: '8px',
              height: '32px',
              fontSize: '12px',
              fontWeight: '500',
              borderColor: '#52c41a',
              color: '#52c41a'
            }}
          >
            Görüntüle
          </Button>
          <Popconfirm
            title="Bu aracı silmek istediğinizden emin misiniz?"
            onConfirm={() => handleDeleteVehicle(record)}
            okText="Evet"
            cancelText="Hayır"
            okButtonProps={{ danger: true }}
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              style={{
                borderRadius: '8px',
                height: '32px',
                fontSize: '12px',
                fontWeight: '500',
                boxShadow: '0 2px 4px rgba(255, 77, 79, 0.2)'
              }}
            >
              Sil
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Bölge kartları
  const renderRegionCards = () => {
    // Bölgeleri alfabetik sırala
    const sortedRegions = regionOptions.slice(1).sort((a, b) => a.label.localeCompare(b.label, 'tr'));
    
    return (
      <Row gutter={[16, 16]}>
        {sortedRegions.map((region) => {
          const regionVehicles = vehicles.filter(vehicle => vehicle.region === region.value);
          const filteredRegionVehicles = regionVehicles.filter(vehicle => {
            if (searchTerm) {
              return vehicle.plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                     vehicle.region?.toLowerCase().includes(searchTerm.toLowerCase());
            }
            return true;
          });

          if (selectedRegion !== 'all' && selectedRegion !== region.value) {
            return null;
          }

          return (
            <Col xs={24} sm={12} md={8} lg={6} key={region.value}>
              <Card
                title={
                  <Space>
                    <Tag color={region.color}>{region.label}</Tag>
                    <Text strong>{filteredRegionVehicles.length}</Text>
                  </Space>
                }
                size="small"
                hoverable
                style={{ 
                  height: '400px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                bodyStyle={{ 
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '16px'
                }}
              >
                {filteredRegionVehicles.length > 0 ? (
                  <div style={{ 
                    flex: 1,
                    overflowY: 'auto',
                    maxHeight: '300px',
                    paddingRight: '8px'
                  }}>
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                      {filteredRegionVehicles.slice(0, 8).map((vehicle, index) => (
                        <div 
                          key={vehicle.id || index} 
                          style={{ 
                            padding: '8px 12px',
                            backgroundColor: '#f5f5f5',
                            borderRadius: '6px',
                            border: '1px solid #e8e8e8'
                          }}
                        >
                          <Space>
                            <CarOutlined style={{ color: '#1890ff' }} />
                            <Text code style={{ fontSize: '12px' }}>{vehicle.plate}</Text>
                            <Tag color={getStatusColor(vehicle.status)} size="small">
                              {getStatusText(vehicle.status)}
                            </Tag>
                          </Space>
                        </div>
                      ))}
                      {filteredRegionVehicles.length > 8 && (
                        <div style={{ 
                          textAlign: 'center', 
                          padding: '12px',
                          backgroundColor: '#f0f0f0',
                          borderRadius: '6px',
                          border: '1px dashed #d9d9d9'
                        }}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            +{filteredRegionVehicles.length - 8} araç daha
                          </Text>
                          <br />
                          <Button 
                            type="link" 
                            size="small" 
                            style={{ padding: '4px 0', height: 'auto' }}
                            onClick={() => {
                              // Liste görünümüne geç ve bu bölgeyi filtrele
                              setViewMode('list');
                              setSelectedRegion(region.value);
                            }}
                          >
                            Tümünü Gör
                          </Button>
                        </div>
                      )}
                    </Space>
                  </div>
                ) : (
                  <div style={{ 
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '20px'
                  }}>
                    <div>
                      <CarOutlined style={{ fontSize: '32px', color: '#d9d9d9' }} />
                      <div style={{ marginTop: '12px', color: '#999', fontSize: '14px' }}>
                        Bu bölgede araç bulunmuyor
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <Card style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0, background: 'linear-gradient(45deg, #1890ff, #722ed1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Aktarma Depo Araç Listesi
            </Title>
            <Text type="secondary">Bölge bazında araç plakalarını görüntüleyin ve yönetin</Text>
          </Col>
          <Col>
            <Space>
              <Statistic
                title="Toplam Araç"
                value={vehicles.length}
                prefix={<CarOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
              <Switch
                checkedChildren={<AppstoreOutlined />}
                unCheckedChildren={<UnorderedListOutlined />}
                checked={viewMode === 'cards'}
                onChange={(checked) => setViewMode(checked ? 'cards' : 'list')}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Arama ve Filtreler */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Input
              placeholder="Plaka veya bölge ara..."
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="large"
            />
          </Col>
          <Col>
            <Select
              placeholder="Bölge Seçin"
              value={selectedRegion}
              onChange={setSelectedRegion}
              style={{ width: 200 }}
              size="large"
            >
              {regionOptions.map(region => (
                <Option key={region.value} value={region.value}>
                  {region.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Space>
              <Upload
                accept=".xlsx,.xls,.csv"
                beforeUpload={handleExcelUpload}
                showUploadList={false}
              >
                <Button icon={<UploadOutlined />} size="large">
                  Excel Yükle
                </Button>
              </Upload>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                onClick={handleAddVehicle}
              >
                Yeni Araç
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Ana İçerik */}
      {viewMode === 'cards' ? renderRegionCards() : (
        <Card 
          style={{ 
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}
        >
          <Table
            columns={columns}
            dataSource={filteredVehicles}
            loading={loading}
            rowKey="id"
            pagination={false}
            scroll={{ x: 800 }}
            size="middle"
            style={{
              borderRadius: '8px'
            }}
            rowClassName={(record, index) => 
              index % 2 === 0 ? 'table-row-light' : 'table-row-dark'
            }
            defaultSortOrder="ascend"
            sortDirections={['ascend', 'descend']}
          />
          
          {/* Özel Pagination */}
          <div style={{ 
            marginTop: '16px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '12px 0',
            borderTop: '1px solid #f0f0f0'
          }}>
            <Text type="secondary">
              Toplam {filteredVehicles.length} araç gösteriliyor
            </Text>
            <Space>
              <Text type="secondary">Sıralama: </Text>
              <Tag color="blue">
                {sortField === 'plate' ? 'Plaka' : 
                 sortField === 'region' ? 'Bölge' : 
                 sortField === 'status' ? 'Durum' : 'Tarih'} 
                {sortDirection === 'asc' ? ' ↑' : ' ↓'}
              </Tag>
            </Space>
          </div>
        </Card>
      )}

      {/* Araç Düzenleme Modal */}
      <Modal
        title={editingVehicle?.id ? 'Araç Düzenle' : 'Yeni Araç Ekle'}
        open={!!editingVehicle}
        onCancel={() => setEditingVehicle(null)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveVehicle}
        >
          <Form.Item
            name="plate"
            label="Plaka"
            rules={[{ required: true, message: 'Plaka gerekli' }]}
          >
            <Input placeholder="34ABC123" />
          </Form.Item>
          
          <Form.Item
            name="region"
            label="Bölge"
            rules={[{ required: true, message: 'Bölge gerekli' }]}
          >
            <Select placeholder="Bölge seçin">
              {regionOptions.slice(1).map(region => (
                <Option key={region.value} value={region.value}>
                  {region.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="status"
            label="Durum"
            rules={[{ required: true, message: 'Durum gerekli' }]}
          >
            <Select placeholder="Durum seçin">
              <Option value="active">Aktif</Option>
              <Option value="maintenance">Bakımda</Option>
              <Option value="inactive">Pasif</Option>
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Kaydet
              </Button>
              <Button onClick={() => setEditingVehicle(null)}>
                İptal
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Araç Görüntüleme Modal */}
      <Modal
        title="Araç Detayları"
        open={!!viewingVehicle}
        onCancel={() => setViewingVehicle(null)}
        footer={[
          <Button key="close" onClick={() => setViewingVehicle(null)}>
            Kapat
          </Button>
        ]}
      >
        {viewingVehicle && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>Plaka: </Text>
              <Text code>{viewingVehicle.plate}</Text>
            </div>
            <div>
              <Text strong>Bölge: </Text>
              <Tag color={getRegionColor(viewingVehicle.region)}>
                {getRegionName(viewingVehicle.region)}
              </Tag>
            </div>
            <div>
              <Text strong>Durum: </Text>
              <Tag color={getStatusColor(viewingVehicle.status)} icon={getStatusIcon(viewingVehicle.status)}>
                {getStatusText(viewingVehicle.status)}
              </Tag>
            </div>
            <div>
              <Text strong>Oluşturulma: </Text>
              <Text>{new Date(viewingVehicle.created_at).toLocaleString('tr-TR')}</Text>
            </div>
            <div>
              <Text strong>Son Güncelleme: </Text>
              <Text>{new Date(viewingVehicle.updated_at).toLocaleString('tr-TR')}</Text>
            </div>
          </Space>
        )}
      </Modal>

      {/* Excel Yükleme Modal */}
      <Modal
        title="Excel Verileri Önizleme"
        open={showExcelUpload}
        onCancel={() => setShowExcelUpload(false)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setShowExcelUpload(false)}>
            İptal
          </Button>,
          <Button key="save" type="primary" onClick={handleSaveExcelData}>
            Veritabanına Kaydet
          </Button>
        ]}
      >
        <div style={{ maxHeight: '400px', overflow: 'auto' }}>
          <Table
            dataSource={excelData.slice(0, 10)}
            pagination={false}
            size="small"
            scroll={{ x: true }}
          />
          {excelData.length > 10 && (
            <Text type="secondary">
              ... ve {excelData.length - 10} satır daha
            </Text>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default TransferVehicleList;
