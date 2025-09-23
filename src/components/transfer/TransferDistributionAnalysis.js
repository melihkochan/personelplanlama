import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Table, 
  Select, 
  DatePicker, 
  Button, 
  Progress, 
  Statistic,
  Tag,
  Space,
  Tooltip,
  Modal
} from 'antd';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Package, 
  Truck, 
  Users,
  Target,
  Award,
  AlertCircle,
  CheckCircle,
  Download
} from 'lucide-react';

const { Option } = Select;
const { RangePicker } = DatePicker;

const TransferDistributionAnalysis = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedDateRange, setSelectedDateRange] = useState(null);
  const [loading, setLoading] = useState(false);

  // Örnek performans verileri
  const performanceData = {
    weekly: {
      totalDeliveries: 1247,
      onTimeDeliveries: 1189,
      delayedDeliveries: 58,
      averageDeliveryTime: '2.3 saat',
      efficiency: 95.3,
      customerSatisfaction: 4.7,
      topPerformer: 'Ahmet Yılmaz',
      improvement: 2.1
    },
    monthly: {
      totalDeliveries: 5234,
      onTimeDeliveries: 4987,
      delayedDeliveries: 247,
      averageDeliveryTime: '2.1 saat',
      efficiency: 95.3,
      customerSatisfaction: 4.6,
      topPerformer: 'Fatma Demir',
      improvement: 3.2
    }
  };

  const personnelPerformance = [
    {
      id: 1,
      name: 'Ahmet Yılmaz',
      position: 'Depo Sorumlusu',
      deliveries: 156,
      onTimeRate: 98.7,
      efficiency: 96.5,
      customerRating: 4.9,
      status: 'excellent'
    },
    {
      id: 2,
      name: 'Fatma Demir',
      position: 'Forklift Operatörü',
      deliveries: 142,
      onTimeRate: 95.8,
      efficiency: 94.2,
      customerRating: 4.6,
      status: 'good'
    },
    {
      id: 3,
      name: 'Mehmet Kaya',
      position: 'Depo Elemanı',
      deliveries: 128,
      onTimeRate: 92.1,
      efficiency: 89.7,
      customerRating: 4.2,
      status: 'average'
    },
    {
      id: 4,
      name: 'Ayşe Özkan',
      position: 'Kalite Kontrol',
      deliveries: 134,
      onTimeRate: 97.3,
      efficiency: 95.1,
      customerRating: 4.7,
      status: 'excellent'
    }
  ];

  const deliveryTrends = [
    { day: 'Pazartesi', deliveries: 245, efficiency: 96.2 },
    { day: 'Salı', deliveries: 267, efficiency: 97.1 },
    { day: 'Çarşamba', deliveries: 289, efficiency: 95.8 },
    { day: 'Perşembe', deliveries: 256, efficiency: 96.5 },
    { day: 'Cuma', deliveries: 190, efficiency: 94.3 },
    { day: 'Cumartesi', deliveries: 156, efficiency: 93.7 },
    { day: 'Pazar', deliveries: 98, efficiency: 92.1 }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': return 'green';
      case 'good': return 'blue';
      case 'average': return 'orange';
      case 'poor': return 'red';
      default: return 'gray';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'excellent': return 'Mükemmel';
      case 'good': return 'İyi';
      case 'average': return 'Orta';
      case 'poor': return 'Zayıf';
      default: return 'Değerlendirilmemiş';
    }
  };

  const personnelColumns = [
    {
      title: 'Personel',
      key: 'personnel',
      render: (_, record) => (
        <div>
          <div className="font-semibold">{record.name}</div>
          <div className="text-sm text-gray-500">{record.position}</div>
        </div>
      )
    },
    {
      title: 'Teslimat Sayısı',
      dataIndex: 'deliveries',
      key: 'deliveries',
      align: 'center',
      render: (value) => (
        <div className="text-lg font-bold text-blue-600">{value}</div>
      )
    },
    {
      title: 'Zamanında Teslimat',
      dataIndex: 'onTimeRate',
      key: 'onTimeRate',
      align: 'center',
      render: (value) => (
        <div className="text-center">
          <Progress 
            percent={value} 
            size="small" 
            strokeColor={value >= 95 ? '#52c41a' : value >= 90 ? '#1890ff' : '#faad14'}
          />
          <div className="text-sm text-gray-600 mt-1">{value}%</div>
        </div>
      )
    },
    {
      title: 'Verimlilik',
      dataIndex: 'efficiency',
      key: 'efficiency',
      align: 'center',
      render: (value) => (
        <div className="text-center">
          <Progress 
            percent={value} 
            size="small" 
            strokeColor={value >= 95 ? '#52c41a' : value >= 90 ? '#1890ff' : '#faad14'}
          />
          <div className="text-sm text-gray-600 mt-1">{value}%</div>
        </div>
      )
    },
    {
      title: 'Müşteri Puanı',
      dataIndex: 'customerRating',
      key: 'customerRating',
      align: 'center',
      render: (value) => (
        <div className="text-center">
          <div className="text-lg font-bold text-yellow-600">{value}</div>
          <div className="text-xs text-gray-500">/ 5.0</div>
        </div>
      )
    },
    {
      title: 'Durum',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      )
    }
  ];

  const currentData = performanceData[selectedPeriod];

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <BarChart3 className="w-6 h-6 mr-3 text-purple-600" />
              Aktarma Dağıtım Performans Analizi
            </h2>
            <Button 
              type="primary" 
              icon={<Download className="w-4 h-4" />}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Rapor İndir
            </Button>
          </div>

          {/* Filtreler */}
          <div className="flex space-x-4">
            <Select
              value={selectedPeriod}
              onChange={setSelectedPeriod}
              style={{ width: 150 }}
            >
              <Option value="week">Haftalık</Option>
              <Option value="monthly">Aylık</Option>
            </Select>
            <RangePicker 
              placeholder={['Başlangıç', 'Bitiş']}
              value={selectedDateRange}
              onChange={setSelectedDateRange}
            />
          </div>
        </div>

        {/* Ana İstatistikler */}
        <div className="p-6 border-b border-gray-200">
          <Row gutter={16}>
            <Col span={6}>
              <Card className="text-center">
                <Statistic
                  title="Toplam Teslimat"
                  value={currentData.totalDeliveries}
                  prefix={<Package className="w-5 h-5 text-blue-600" />}
                  valueStyle={{ color: '#1890ff' }}
                />
                <div className="text-sm text-gray-500 mt-2">
                  {selectedPeriod === 'week' ? 'Bu hafta' : 'Bu ay'}
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card className="text-center">
                <Statistic
                  title="Zamanında Teslimat"
                  value={currentData.onTimeDeliveries}
                  prefix={<CheckCircle className="w-5 h-5 text-green-600" />}
                  valueStyle={{ color: '#52c41a' }}
                />
                <div className="text-sm text-gray-500 mt-2">
                  {((currentData.onTimeDeliveries / currentData.totalDeliveries) * 100).toFixed(1)}% oranında
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card className="text-center">
                <Statistic
                  title="Ortalama Teslimat Süresi"
                  value={currentData.averageDeliveryTime}
                  prefix={<Clock className="w-5 h-5 text-orange-600" />}
                  valueStyle={{ color: '#fa8c16' }}
                />
                <div className="text-sm text-gray-500 mt-2">
                  Hedef: 2.0 saat
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card className="text-center">
                <Statistic
                  title="Genel Verimlilik"
                  value={currentData.efficiency}
                  suffix="%"
                  prefix={<TrendingUp className="w-5 h-5 text-purple-600" />}
                  valueStyle={{ color: '#722ed1' }}
                />
                <div className="text-sm text-gray-500 mt-2">
                  {currentData.improvement > 0 ? '+' : ''}{currentData.improvement}% gelişme
                </div>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Performans Grafikleri */}
        <div className="p-6 border-b border-gray-200">
          <Row gutter={16}>
            <Col span={12}>
              <Card title="Günlük Teslimat Trendi" className="h-80">
                <div className="space-y-4">
                  {deliveryTrends.map((trend, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="w-20 text-sm font-medium">{trend.day}</div>
                      <div className="flex-1 mx-4">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>{trend.deliveries} teslimat</span>
                          <span>{trend.efficiency}% verimlilik</span>
                        </div>
                        <Progress 
                          percent={trend.efficiency} 
                          size="small"
                          strokeColor={trend.efficiency >= 95 ? '#52c41a' : trend.efficiency >= 90 ? '#1890ff' : '#faad14'}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Performans Dağılımı" className="h-80">
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {currentData.customerSatisfaction}
                    </div>
                    <div className="text-sm text-gray-600">Müşteri Memnuniyeti</div>
                    <div className="text-xs text-gray-500">5 üzerinden</div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Zamanında Teslimat</span>
                      <div className="flex items-center">
                        <Progress 
                          percent={((currentData.onTimeDeliveries / currentData.totalDeliveries) * 100)} 
                          size="small" 
                          className="w-20 mr-2"
                          strokeColor="#52c41a"
                        />
                        <span className="text-sm font-medium">
                          {((currentData.onTimeDeliveries / currentData.totalDeliveries) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Geciken Teslimat</span>
                      <div className="flex items-center">
                        <Progress 
                          percent={((currentData.delayedDeliveries / currentData.totalDeliveries) * 100)} 
                          size="small" 
                          className="w-20 mr-2"
                          strokeColor="#ff4d4f"
                        />
                        <span className="text-sm font-medium">
                          {((currentData.delayedDeliveries / currentData.totalDeliveries) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <Award className="w-8 h-8 mx-auto text-yellow-600 mb-2" />
                    <div className="font-semibold text-yellow-800">En İyi Performans</div>
                    <div className="text-sm text-yellow-700">{currentData.topPerformer}</div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Personel Performans Tablosu */}
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Personel Performans Detayları
            </h3>
            <p className="text-sm text-gray-600">
              Her personelin teslimat performansı ve verimlilik oranları
            </p>
          </div>
          
          <Table
            columns={personnelColumns}
            dataSource={personnelPerformance}
            rowKey="id"
            pagination={false}
            className="rounded-lg"
          />
        </div>

        {/* Öneriler ve Uyarılar */}
        <div className="p-6 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Öneriler ve Uyarılar</h3>
          <Row gutter={16}>
            <Col span={12}>
              <Card size="small" className="border-green-200 bg-green-50">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
                  <div>
                    <div className="font-semibold text-green-800">Pozitif Gelişmeler</div>
                    <ul className="text-sm text-green-700 mt-2 space-y-1">
                      <li>• Zamanında teslimat oranı %95'in üzerinde</li>
                      <li>• Müşteri memnuniyeti yüksek seviyede</li>
                      <li>• Genel verimlilik hedefleri aşıldı</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" className="border-orange-200 bg-orange-50">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-orange-600 mr-3 mt-0.5" />
                  <div>
                    <div className="font-semibold text-orange-800">İyileştirme Alanları</div>
                    <ul className="text-sm text-orange-700 mt-2 space-y-1">
                      <li>• Hafta sonu verimliliği düşük</li>
                      <li>• Bazı personellerin performansı ortalama</li>
                      <li>• Teslimat süresi hedeften yüksek</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    </div>
  );
};

export default TransferDistributionAnalysis;
