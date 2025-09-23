import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Edit, 
  Eye, 
  Save, 
  X, 
  Plus,
  Search,
  Filter,
  Download,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  InputNumber, 
  Select, 
  Upload as AntUpload, 
  message, 
  Card, 
  Row, 
  Col, 
  Space, 
  Tag, 
  Tooltip,
  Image,
  Carousel,
  Spin
} from 'antd';
import * as XLSX from 'xlsx';

const { TextArea } = Input;
const { Option } = Select;

const StoreDifficultyManager = () => {
  const [storeData, setStoreData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [selectedStoreImages, setSelectedStoreImages] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [viewMode, setViewMode] = useState('table'); // 'table' veya 'detail'
  const [selectedStore, setSelectedStore] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const fileInputRef = useRef(null);
  const carouselRef = useRef(null);
  const detailCarouselRef = useRef(null);

  // Zorluk seviyeleri için renk kodları
  const getDifficultyColor = (level) => {
    if (level === 1) return 'green';
    if (level === 2) return 'blue';
    if (level === 3) return 'orange';
    if (level === 4) return 'red';
    if (level === 5) return 'purple';
    return 'default';
  };

  // Sayfalama hesaplamaları
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = filteredData.slice(startIndex, endIndex);

  // Sayfa değiştirme
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Sayfa boyutu değiştirme
  const handlePageSizeChange = (current, size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Excel dosyasını işle
  const handleFileUpload = (file) => {
    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // İlk satırı başlık olarak al
        const headers = jsonData[0];
        const rows = jsonData.slice(1);
        
        // Veriyi işle ve storeData formatına çevir - sadece kod'u olan verileri al
        const processedData = rows
          .filter(row => row[0] && row[0].toString().trim() !== '') // Kod boş olmayan satırları filtrele
          .map((row, index) => ({
            key: index,
            storeCode: row[0] || '', // Mağaza Kodu (A sütunu)
            storeName: row[1] || '',
            region: row[2] || '',
            averageCases: row[3] || 0,
            averagePallets: row[4] || 0,
            physicalAccessDifficulty: row[5] || 1,
            vehicleDistance: row[6] || 1,
            mallDifficulty: row[7] || 1,
            regionalDifficulty: row[8] || 1,
            totalDifficultyScore: row[9] || 0,
            description: row[10] || '',
            storeType: row[11] || '', // Mağaza Tipi (L sütunu)
            stairSteps: row[12] || '', // Merdiven Basamak Sayısı (M sütunu)
            images: [] // Görseller için boş array
          }));
        
        setStoreData(processedData);
        setFilteredData(processedData);
        message.success(`${processedData.length} mağaza verisi başarıyla yüklendi!`);
      } catch (error) {
        message.error('Excel dosyası işlenirken hata oluştu!');
        console.error('Excel processing error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    reader.readAsArrayBuffer(file);
    return false; // Ant Design Upload için
  };

  // Arama fonksiyonu
  const handleSearch = (value) => {
    setSearchText(value);
    if (!value) {
      setFilteredData(storeData);
      return;
    }
    
    const filtered = storeData.filter(item =>
      item.storeName.toLowerCase().includes(value.toLowerCase()) ||
      item.storeCode.toString().includes(value) ||
      item.region.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredData(filtered);
  };

  // Düzenleme modalını aç
  const handleEdit = (record) => {
    setEditingRecord(record);
    setIsEditModalVisible(true);
  };

  // Düzenleme kaydet
  const handleSaveEdit = (values) => {
    const updatedData = storeData.map(item => 
      item.key === editingRecord.key 
        ? { ...item, ...values, totalDifficultyScore: 
            values.physicalAccessDifficulty + values.vehicleDistance + 
            values.mallDifficulty + values.regionalDifficulty }
        : item
    );
    
    setStoreData(updatedData);
    setFilteredData(updatedData);
    setIsEditModalVisible(false);
    setEditingRecord(null);
    message.success('Mağaza bilgileri güncellendi!');
  };

  // Görsel modalını aç
  const handleViewImages = (record) => {
    setSelectedStoreImages(record.images || []);
    setCurrentImageIndex(0);
    setIsImageModalVisible(true);
  };

  // Detay görünümüne geç
  const handleViewDetail = (record) => {
    setSelectedStore(record);
    // viewMode'u değiştirmiyoruz, sadece modal açıyoruz
  };

  // Modal kapat
  const handleCloseModal = () => {
    setSelectedStore(null);
  };

  // Keyboard navigation için
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!isImageModalVisible || selectedStoreImages.length === 0) return;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIndex = currentImageIndex > 0 ? currentImageIndex - 1 : selectedStoreImages.length - 1;
        setCurrentImageIndex(prevIndex);
        if (carouselRef.current) {
          carouselRef.current.goTo(prevIndex);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = currentImageIndex < selectedStoreImages.length - 1 ? currentImageIndex + 1 : 0;
        setCurrentImageIndex(nextIndex);
        if (carouselRef.current) {
          carouselRef.current.goTo(nextIndex);
        }
      } else if (e.key === 'Escape') {
        setIsImageModalVisible(false);
      }
    };

    if (isImageModalVisible) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [isImageModalVisible, currentImageIndex, selectedStoreImages.length]);

  // Görsel yükleme (tekli)
  const handleImageUpload = (file, recordKey) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const newImage = {
        id: Date.now(),
        url: e.target.result,
        name: file.name
      };
      
      const updatedData = storeData.map(item => 
        item.key === recordKey 
          ? { ...item, images: [...(item.images || []), newImage] }
          : item
      );
      
      setStoreData(updatedData);
      setFilteredData(updatedData);
      message.success('Görsel başarıyla yüklendi!');
    };
    reader.readAsDataURL(file);
    return false;
  };

  // Çoklu görsel yükleme için state
  const [pendingImages, setPendingImages] = useState({});
  const [uploadingImages, setUploadingImages] = useState({});

  // Çoklu görsel yükleme
  const handleMultipleImageUpload = (file, recordKey) => {
    return false; // beforeUpload'da false döndürüyoruz, asıl işlemi onChange'de yapacağız
  };

  // Upload onChange handler
  const handleUploadChange = (info, recordKey) => {
    const { fileList } = info;
    
    if (fileList.length === 0) return;
    
    // Sadece yeni yüklenen dosyaları işle
    const newFiles = fileList.filter(file => file.status === 'done' || file.originFileObj);
    
    if (newFiles.length === 0) return;
    
    setUploadingImages(prev => ({ ...prev, [recordKey]: true }));
    
    let loadedCount = 0;
    const totalFiles = newFiles.length;
    const newImages = [];
    
    newFiles.forEach((fileItem, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newImage = {
          id: Date.now() + index + Math.random(),
          url: e.target.result,
          name: fileItem.name || fileItem.originFileObj?.name || `görsel-${index + 1}`
        };
        newImages.push(newImage);
        loadedCount++;
        
        // Tüm dosyalar yüklendiğinde state'i güncelle
        if (loadedCount === totalFiles) {
          const updatedData = storeData.map(item => 
            item.key === recordKey 
              ? { ...item, images: [...(item.images || []), ...newImages] }
              : item
          );
          
          setStoreData(updatedData);
          setFilteredData(updatedData);
          setUploadingImages(prev => ({ ...prev, [recordKey]: false }));
          message.success(`${totalFiles} görsel başarıyla yüklendi!`);
        }
      };
      
      const fileToRead = fileItem.originFileObj || fileItem;
      reader.readAsDataURL(fileToRead);
    });
  };

  // Tablo sütunları
  const columns = [
    {
      title: '#',
      key: 'index',
      width: 60,
      render: (_, __, index) => (
        <span className="text-sm font-medium text-gray-500">
          {startIndex + index + 1}
        </span>
      ),
    },
    {
      title: 'Mağaza Kodu',
      dataIndex: 'storeCode',
      key: 'storeCode',
      width: 100,
      sorter: (a, b) => a.storeCode - b.storeCode,
      render: (value) => <span className="text-sm font-medium text-blue-600">{value}</span>
    },
    {
      title: 'Mağaza Adı',
      dataIndex: 'storeName',
      key: 'storeName',
      width: 180,
      sorter: (a, b) => a.storeName.localeCompare(b.storeName),
      render: (text) => <span className="text-sm">{text}</span>
    },
    {
      title: 'Bölge',
      dataIndex: 'region',
      key: 'region',
      width: 120,
      filters: Array.from(new Set(storeData.map(store => store.region))).map(region => ({
        text: region,
        value: region
      })),
      onFilter: (value, record) => record.region === value,
      render: (text) => <span className="text-xs text-gray-600">{text}</span>
    },
    {
      title: 'Kasa',
      dataIndex: 'averageCases',
      key: 'averageCases',
      width: 80,
      sorter: (a, b) => a.averageCases - b.averageCases,
      render: (value) => (
        <Tag color={value >= 50 ? 'red' : value >= 30 ? 'orange' : 'green'} size="small">
          {value}
        </Tag>
      )
    },
    {
      title: 'Palet',
      dataIndex: 'averagePallets',
      key: 'averagePallets',
      width: 80,
      sorter: (a, b) => a.averagePallets - b.averagePallets,
      render: (value) => (
        <Tag color={value >= 5 ? 'red' : value >= 3 ? 'orange' : 'green'} size="small">
          {value}
        </Tag>
      )
    },
    {
      title: 'Fiziksel',
      dataIndex: 'physicalAccessDifficulty',
      key: 'physicalAccessDifficulty',
      width: 80,
      render: (value) => (
        <Tag color={getDifficultyColor(value)} size="small">
          {value}
        </Tag>
      ),
      sorter: (a, b) => a.physicalAccessDifficulty - b.physicalAccessDifficulty,
    },
    {
      title: 'Araç',
      dataIndex: 'vehicleDistance',
      key: 'vehicleDistance',
      width: 80,
      render: (value) => (
        <Tag color={getDifficultyColor(value)} size="small">
          {value}
        </Tag>
      ),
      sorter: (a, b) => a.vehicleDistance - b.vehicleDistance,
    },
    {
      title: 'AVM',
      dataIndex: 'mallDifficulty',
      key: 'mallDifficulty',
      width: 80,
      render: (value) => (
        <Tag color={getDifficultyColor(value)} size="small">
          {value}
        </Tag>
      ),
      sorter: (a, b) => a.mallDifficulty - b.mallDifficulty,
    },
    {
      title: 'Bölgesel',
      dataIndex: 'regionalDifficulty',
      key: 'regionalDifficulty',
      width: 80,
      render: (value) => (
        <Tag color={getDifficultyColor(value)} size="small">
          {value}
        </Tag>
      ),
      sorter: (a, b) => a.regionalDifficulty - b.regionalDifficulty,
    },
    {
      title: 'Toplam',
      dataIndex: 'totalDifficultyScore',
      key: 'totalDifficultyScore',
      width: 80,
      render: (value) => (
        <Tag color={value >= 2 ? 'red' : getDifficultyColor(value)} size="small">
          {value}
        </Tag>
      ),
      sorter: (a, b) => a.totalDifficultyScore - b.totalDifficultyScore,
    },
    {
      title: 'Açıklama',
      dataIndex: 'description',
      key: 'description',
      width: 150,
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text}>
          <span className="text-xs text-gray-600">
            {text ? text.substring(0, 30) + '...' : '-'}
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'Tip',
      dataIndex: 'storeType',
      key: 'storeType',
      width: 80,
      filters: [
        { text: 'CADDE', value: 'CADDE' },
        { text: 'AVM', value: 'AVM' },
        { text: 'BEAUTY', value: 'BEAUTY' },
      ],
      onFilter: (value, record) => record.storeType === value,
      render: (text) => (
        <Tag color={text === 'AVM' ? 'purple' : text === 'BEAUTY' ? 'pink' : 'blue'} size="small">
          {text}
        </Tag>
      )
    },
    {
      title: 'Merdiven',
      dataIndex: 'stairSteps',
      key: 'stairSteps',
      width: 80,
      render: (text) => {
        if (text === 'Basamak Yok' || text === '' || isNaN(parseInt(text))) {
          return <span className="text-xs text-gray-500">Basamak Yok</span>;
        }
        return (
          <Tag color={parseInt(text) <= 2 ? 'green' : parseInt(text) <= 4 ? 'orange' : 'red'} size="small">
            {text}
          </Tag>
        );
      }
    },
    {
      title: 'Görseller',
      key: 'images',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Görselleri Görüntüle">
            <Button
              type="text"
              size="small"
              icon={<ImageIcon size={14} />}
              onClick={() => handleViewImages(record)}
              className={record.images?.length > 0 ? 'text-green-600 hover:text-green-700' : 'text-gray-400'}
            >
              <span className={record.images?.length > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                {record.images?.length || 0}
              </span>
            </Button>
          </Tooltip>
          <Tooltip title="Tek Görsel Ekle">
            <AntUpload
              beforeUpload={(file) => handleImageUpload(file, record.key)}
              showUploadList={false}
              accept="image/*"
            >
              <Button type="text" size="small" icon={<Plus size={14} />} />
            </AntUpload>
          </Tooltip>
          <Tooltip title="Çoklu Görsel Ekle">
            <AntUpload
              beforeUpload={handleMultipleImageUpload}
              onChange={(info) => handleUploadChange(info, record.key)}
              showUploadList={false}
              accept="image/*"
              multiple
            >
              <Button 
                type="text" 
                size="small"
                icon={<Upload size={14} />}
                loading={uploadingImages[record.key]}
              />
            </AntUpload>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'İşlemler',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Detay Görünümü">
            <Button
              type="text"
              size="small"
              icon={<Eye size={14} />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Tooltip title="Düzenle">
            <Button
              type="text"
              size="small"
              icon={<Edit size={14} />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <Card className="mb-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-xl font-semibold text-gray-800">
            Mağaza Zorluk Yönetimi
          </h1>
          <div className="flex space-x-3">
            <AntUpload
              beforeUpload={handleFileUpload}
              showUploadList={false}
              accept=".xlsx,.xls"
            >
              <button
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  loading
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                }`}
                disabled={loading}
              >
                <Upload size={16} className="mr-2" />
                {loading ? 'Yükleniyor...' : 'Excel Yükle'}
              </button>
            </AntUpload>
            <button
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                storeData.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 shadow-lg hover:shadow-xl transform hover:scale-105'
              }`}
              disabled={storeData.length === 0}
            >
              <Download size={16} className="mr-2" />
              Excel İndir
            </button>
          </div>
        </div>

        {/* Görünüm Seçenekleri */}
        <div className="flex justify-center mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            <div className="flex">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  viewMode === 'table'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Eye size={16} className="mr-2" />
                Liste
              </button>
              <button
                onClick={() => setViewMode('detail')}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  viewMode === 'detail'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <ImageIcon size={16} className="mr-2" />
                Kart
              </button>
            </div>
          </div>
        </div>

        <Row gutter={12} className="mb-3">
          <Col span={16}>
            <Input
              size="small"
              placeholder="Mağaza adı, kodu veya bölge ile ara..."
              prefix={<Search size={14} />}
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={8}>
            <div className="flex justify-end items-center h-8">
              <span className="text-sm text-gray-600">
                Toplam: <span className="font-medium text-blue-600">{filteredData.length}</span> mağaza
              </span>
            </div>
          </Col>
        </Row>

        {viewMode === 'table' ? (
          <Table
            columns={columns}
            dataSource={currentData}
            loading={loading}
            scroll={{ x: 1000 }}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: filteredData.length,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} / ${total}`,
              size: 'small',
              pageSizeOptions: ['25', '50', '100', '200'],
              onChange: handlePageChange,
              onShowSizeChange: handlePageSizeChange
            }}
            size="small"
            className="compact-table"
          />
        ) : viewMode === 'detail' ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {currentData.map((store, index) => (
              <Card
                key={store.key}
                hoverable
                className="relative group transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 border-0 shadow-md"
              >
                <div className="p-4">
                  {/* Mağaza Görseli */}
                  <div className="w-full h-32 bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden group-hover:bg-gray-200 transition-colors duration-300">
                    {store.images && store.images.length > 0 ? (
                      <Image
                        src={store.images[0].url}
                        alt={store.storeName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        preview={false}
                      />
                    ) : (
                      <div className="text-gray-400 text-center group-hover:text-gray-500 transition-colors duration-300">
                        <ImageIcon size={32} className="mx-auto mb-2 group-hover:scale-110 transition-transform duration-300" />
                        <span className="text-xs">Görsel Yok</span>
                      </div>
                    )}
                  </div>

                  {/* Mağaza Bilgileri */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-sm text-gray-800 truncate">
                        {store.storeName}
                      </h3>
                      <span className="text-xs text-gray-500">#{startIndex + index + 1}</span>
                    </div>
                    
                    <div className="text-xs text-gray-600">
                      <div>Kod: <span className="font-medium">{store.storeCode}</span></div>
                      <div>Bölge: {store.region}</div>
                    </div>

                    {/* Zorluk Puanları */}
                    <div className="flex flex-wrap gap-1">
                      <Tag color={getDifficultyColor(store.physicalAccessDifficulty)} size="small">
                        F: {store.physicalAccessDifficulty}
                      </Tag>
                      <Tag color={getDifficultyColor(store.vehicleDistance)} size="small">
                        A: {store.vehicleDistance}
                      </Tag>
                      <Tag color={getDifficultyColor(store.mallDifficulty)} size="small">
                        AVM: {store.mallDifficulty}
                      </Tag>
                      <Tag color={getDifficultyColor(store.regionalDifficulty)} size="small">
                        B: {store.regionalDifficulty}
                      </Tag>
                    </div>

                    {/* Toplam Puan */}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Toplam:</span>
                      <Tag color={getDifficultyColor(store.totalDifficultyScore)} size="small">
                        {store.totalDifficultyScore}
                      </Tag>
                    </div>

                    {/* Görsel Sayısı */}
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Görseller: {store.images?.length || 0}</span>
                      <span>Kasa: {store.averageCases} | Palet: {store.averagePallets}</span>
                    </div>
                  </div>

                  {/* Detay Butonu */}
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => handleViewDetail(store)}
                      className="group relative flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg text-sm font-medium transition-all duration-300 hover:from-blue-600 hover:to-purple-700 hover:shadow-lg hover:shadow-blue-500/25 transform hover:scale-105 active:scale-95"
                    >
                      <Eye size={16} className="mr-2 group-hover:animate-pulse" />
                      <span>Detayları Gör</span>
                      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-300"></div>
                    </button>
                  </div>
                </div>
              </Card>
              ))}
            </div>
            
            {/* Kart Görünümü Sayfalama */}
            <div className="mt-6 flex flex-col items-center space-y-4">
              {/* Sayfa Bilgisi */}
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
                <span className="text-sm text-gray-600">
                  Sayfa <span className="font-medium text-blue-600">{currentPage}</span> / 
                  <span className="font-medium text-gray-800"> {totalPages}</span> - 
                  Gösterilen: <span className="font-medium text-blue-600">{currentData.length}</span> / 
                  <span className="font-medium text-gray-800"> {filteredData.length}</span> mağaza
                </span>
              </div>
              
              {/* Sayfalama Butonları */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  İlk
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Önceki
                </button>
                
                {/* Sayfa Numaraları */}
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, currentPage - 2) + i;
                    if (pageNum > totalPages) return null;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 text-sm rounded-lg border ${
                          currentPage === pageNum
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sonraki
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Son
                </button>
              </div>
              
              {/* Sayfa Boyutu Seçici */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Sayfa başına:</span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(currentPage, parseInt(e.target.value))}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
            </div>
          </div>
        ) : null}
      </Card>

      {/* Düzenleme Modalı */}
      <Modal
        title="Mağaza Bilgilerini Düzenle"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        footer={null}
        width={700}
      >
        {editingRecord && (
          <Form
            layout="vertical"
            initialValues={editingRecord}
            onFinish={handleSaveEdit}
          >
            <Row gutter={12}>
              <Col span={8}>
                <Form.Item
                  label="Mağaza Kodu"
                  name="storeCode"
                  rules={[{ required: true, message: 'Mağaza kodu gerekli!' }]}
                >
                  <InputNumber style={{ width: '100%' }} size="small" />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item
                  label="Mağaza Adı"
                  name="storeName"
                  rules={[{ required: true, message: 'Mağaza adı gerekli!' }]}
                >
                  <Input size="small" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  label="Bölge"
                  name="region"
                  rules={[{ required: true, message: 'Bölge gerekli!' }]}
                >
                  <Input size="small" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  label="Ort. Kasa"
                  name="averageCases"
                >
                  <InputNumber style={{ width: '100%' }} size="small" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  label="Ort. Palet"
                  name="averagePallets"
                >
                  <InputNumber style={{ width: '100%' }} size="small" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={6}>
                <Form.Item
                  label="Fiziksel Erişim"
                  name="physicalAccessDifficulty"
                >
                  <Select size="small">
                    <Option value={1}>1 - Kolay</Option>
                    <Option value={2}>2 - Orta</Option>
                    <Option value={3}>3 - Zor</Option>
                    <Option value={4}>4 - Çok Zor</Option>
                    <Option value={5}>5 - Aşırı Zor</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  label="Araç Uzaklığı"
                  name="vehicleDistance"
                >
                  <Select size="small">
                    <Option value={1}>1 - Yakın</Option>
                    <Option value={2}>2 - Orta</Option>
                    <Option value={3}>3 - Uzak</Option>
                    <Option value={4}>4 - Çok Uzak</Option>
                    <Option value={5}>5 - Aşırı Uzak</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  label="AVM Zorluğu"
                  name="mallDifficulty"
                >
                  <Select size="small">
                    <Option value={1}>1 - Yok</Option>
                    <Option value={2}>2 - Az</Option>
                    <Option value={3}>3 - Orta</Option>
                    <Option value={4}>4 - Yüksek</Option>
                    <Option value={5}>5 - Aşırı Yüksek</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  label="Bölgesel Zorluk"
                  name="regionalDifficulty"
                >
                  <Select size="small">
                    <Option value={1}>1 - Kolay</Option>
                    <Option value={2}>2 - Orta</Option>
                    <Option value={3}>3 - Zor</Option>
                    <Option value={4}>4 - Çok Zor</Option>
                    <Option value={5}>5 - Aşırı Zor</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="Açıklama"
              name="description"
            >
              <TextArea rows={3} size="small" />
            </Form.Item>

            <div className="flex justify-end space-x-2">
              <Button size="small" onClick={() => setIsEditModalVisible(false)}>
                İptal
              </Button>
              <Button type="primary" size="small" htmlType="submit">
                Kaydet
              </Button>
            </div>
          </Form>
        )}
      </Modal>

      {/* Görsel Modalı */}
      <Modal
        title="Mağaza Görselleri"
        open={isImageModalVisible}
        onCancel={() => setIsImageModalVisible(false)}
        footer={null}
        width={700}
      >
        {selectedStoreImages.length > 0 ? (
          <div>
            <div className="relative">
              <div className="relative">
                <Carousel 
                  ref={carouselRef}
                  autoplay={false}
                  dots={true}
                  arrows={false}
                  infinite={true}
                  beforeChange={(from, to) => setCurrentImageIndex(to)}
                >
                  {selectedStoreImages.map((image, index) => (
                    <div key={image.id} className="relative">
                      <Image
                        src={image.url}
                        alt={image.name}
                        style={{ width: '100%', height: 400, objectFit: 'cover' }}
                        preview={false}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-3">
                        <div className="text-center">
                          <span className="font-medium text-lg">{image.name}</span>
                          <div className="text-sm text-gray-300 mt-1">
                            {index + 1} / {selectedStoreImages.length}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </Carousel>
                
                {/* Manuel Geçiş Butonları */}
                {selectedStoreImages.length > 1 && (
                  <>
                    <Button 
                      type="primary" 
                      shape="circle" 
                      size="large"
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 shadow-xl bg-white border-2 border-blue-500 hover:bg-blue-50"
                      onClick={() => {
                        const newIndex = currentImageIndex > 0 ? currentImageIndex - 1 : selectedStoreImages.length - 1;
                        setCurrentImageIndex(newIndex);
                        if (carouselRef.current) {
                          carouselRef.current.goTo(newIndex);
                        }
                      }}
                    >
                      <span className="text-xl font-bold text-blue-600">‹</span>
                    </Button>
                    <Button 
                      type="primary" 
                      shape="circle" 
                      size="large"
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 shadow-xl bg-white border-2 border-blue-500 hover:bg-blue-50"
                      onClick={() => {
                        const newIndex = currentImageIndex < selectedStoreImages.length - 1 ? currentImageIndex + 1 : 0;
                        setCurrentImageIndex(newIndex);
                        if (carouselRef.current) {
                          carouselRef.current.goTo(newIndex);
                        }
                      }}
                    >
                      <span className="text-xl font-bold text-blue-600">›</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            {/* Görsel sayısı ve bilgi */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <div className="flex items-center space-x-4">
                  <span>Toplam {selectedStoreImages.length} görsel</span>
                  <span className="text-blue-600">
                    ← → tuşları ile ilerleyin
                  </span>
                </div>
                <div className="flex space-x-2">
                  <AntUpload
                    beforeUpload={handleMultipleImageUpload}
                    onChange={(info) => {
                      // Mevcut mağazanın key'ini bul
                      const currentStore = storeData.find(store => 
                        JSON.stringify(store.images) === JSON.stringify(selectedStoreImages)
                      );
                      if (currentStore) {
                        handleUploadChange(info, currentStore.key);
                      }
                    }}
                    showUploadList={false}
                    accept="image/*"
                    multiple
                  >
                    <Button 
                      size="small" 
                      icon={<Upload size={14} />}
                    >
                      Görsel Ekle
                    </Button>
                  </AntUpload>
                  <Button 
                    size="small" 
                    icon={<Download size={14} />}
                    onClick={() => {
                      // Tüm görselleri indirme fonksiyonu
                      selectedStoreImages.forEach((image, index) => {
                        const link = document.createElement('a');
                        link.href = image.url;
                        link.download = `mağaza-görsel-${index + 1}.jpg`;
                        link.click();
                      });
                    }}
                  >
                    Tümünü İndir
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <ImageIcon size={48} className="mx-auto mb-4" />
            <p>Bu mağaza için henüz görsel yüklenmemiş.</p>
          </div>
        )}
      </Modal>

      {/* Tek Mağaza Detay Modalı */}
      {selectedStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {selectedStore.storeName}
                  </h2>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Kod: <span className="font-medium">{selectedStore.storeCode}</span></span>
                    <span>Bölge: {selectedStore.region}</span>
                    <span>Kasa: {selectedStore.averageCases}</span>
                    <span>Palet: {selectedStore.averagePallets}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    icon={<Edit size={16} />}
                    onClick={() => handleEdit(selectedStore)}
                  >
                    Düzenle
                  </Button>
                  <Button 
                    icon={<X size={16} />}
                    onClick={handleCloseModal}
                  >
                    Kapat
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sol Taraf - Görseller */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Görseller</h3>
                  {selectedStore.images && selectedStore.images.length > 0 ? (
                    <div className="space-y-4">
                      <div className="relative">
                        <Carousel 
                          ref={detailCarouselRef}
                          autoplay={false}
                          dots={true}
                          arrows={false}
                          infinite={true}
                          beforeChange={(from, to) => setCurrentImageIndex(to)}
                        >
                          {selectedStore.images.map((image, index) => (
                            <div key={image.id} className="relative">
                              <Image
                                src={image.url}
                                alt={image.name}
                                className="w-full h-64 object-cover rounded-lg"
                                preview={false}
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
                                <div className="text-center">
                                  <span className="font-medium">{image.name}</span>
                                  <div className="text-sm text-gray-300">
                                    {index + 1} / {selectedStore.images.length}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </Carousel>
                        
                        {/* Manuel Geçiş Butonları */}
                        {selectedStore.images.length > 1 && (
                          <>
                            <Button 
                              type="primary" 
                              shape="circle" 
                              size="large"
                              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 shadow-xl bg-white border-2 border-blue-500 hover:bg-blue-50"
                              onClick={() => {
                                const newIndex = currentImageIndex > 0 ? currentImageIndex - 1 : selectedStore.images.length - 1;
                                setCurrentImageIndex(newIndex);
                                if (detailCarouselRef.current) {
                                  detailCarouselRef.current.goTo(newIndex);
                                }
                              }}
                            >
                              <span className="text-xl font-bold text-blue-600">‹</span>
                            </Button>
                            <Button 
                              type="primary" 
                              shape="circle" 
                              size="large"
                              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 shadow-xl bg-white border-2 border-blue-500 hover:bg-blue-50"
                              onClick={() => {
                                const newIndex = currentImageIndex < selectedStore.images.length - 1 ? currentImageIndex + 1 : 0;
                                setCurrentImageIndex(newIndex);
                                if (detailCarouselRef.current) {
                                  detailCarouselRef.current.goTo(newIndex);
                                }
                              }}
                            >
                              <span className="text-xl font-bold text-blue-600">›</span>
                            </Button>
                          </>
                        )}
                      </div>
                      
                      {/* Görsel Yükleme */}
                      <div className="flex space-x-2">
                        <AntUpload
                          beforeUpload={(file) => handleImageUpload(file, selectedStore.key)}
                          showUploadList={false}
                          accept="image/*"
                        >
                          <Button icon={<Plus size={16} />}>Tek Görsel Ekle</Button>
                        </AntUpload>
                        <AntUpload
                          beforeUpload={handleMultipleImageUpload}
                          onChange={(info) => handleUploadChange(info, selectedStore.key)}
                          showUploadList={false}
                          accept="image/*"
                          multiple
                        >
                          <Button icon={<Upload size={16} />}>Çoklu Görsel Ekle</Button>
                        </AntUpload>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                      <ImageIcon size={48} className="mx-auto mb-4" />
                      <p className="mb-4">Bu mağaza için henüz görsel yüklenmemiş.</p>
                      <div className="flex justify-center space-x-2">
                        <AntUpload
                          beforeUpload={(file) => handleImageUpload(file, selectedStore.key)}
                          showUploadList={false}
                          accept="image/*"
                        >
                          <Button icon={<Plus size={16} />}>Tek Görsel Ekle</Button>
                        </AntUpload>
                        <AntUpload
                          beforeUpload={handleMultipleImageUpload}
                          onChange={(info) => handleUploadChange(info, selectedStore.key)}
                          showUploadList={false}
                          accept="image/*"
                          multiple
                        >
                          <Button icon={<Upload size={16} />}>Çoklu Görsel Ekle</Button>
                        </AntUpload>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sağ Taraf - Detay Bilgileri */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Zorluk Analizi</h3>
                  
                  {/* Zorluk Kartları */}
                  <div className="space-y-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Fiziksel Erişim Zorluğu</span>
                        <Tag color={getDifficultyColor(selectedStore.physicalAccessDifficulty)}>
                          {selectedStore.physicalAccessDifficulty}
                        </Tag>
                      </div>
                      <div className="text-sm text-gray-600">
                        {selectedStore.physicalAccessDifficulty === 1 && "Kolay - Herhangi bir engel yok"}
                        {selectedStore.physicalAccessDifficulty === 2 && "Orta - Hafif engeller var"}
                        {selectedStore.physicalAccessDifficulty === 3 && "Zor - Önemli engeller mevcut"}
                        {selectedStore.physicalAccessDifficulty === 4 && "Çok Zor - Ciddi engeller var"}
                        {selectedStore.physicalAccessDifficulty === 5 && "Aşırı Zor - Aşılmaz engeller"}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Araç Mağaza Uzaklığı</span>
                        <Tag color={getDifficultyColor(selectedStore.vehicleDistance)}>
                          {selectedStore.vehicleDistance}
                        </Tag>
                      </div>
                      <div className="text-sm text-gray-600">
                        {selectedStore.vehicleDistance === 1 && "Yakın - 0-100m"}
                        {selectedStore.vehicleDistance === 2 && "Orta - 100-500m"}
                        {selectedStore.vehicleDistance === 3 && "Uzak - 500m-1km"}
                        {selectedStore.vehicleDistance === 4 && "Çok Uzak - 1-2km"}
                        {selectedStore.vehicleDistance === 5 && "Aşırı Uzak - 2km+"}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">AVM Zorluğu</span>
                        <Tag color={getDifficultyColor(selectedStore.mallDifficulty)}>
                          {selectedStore.mallDifficulty}
                        </Tag>
                      </div>
                      <div className="text-sm text-gray-600">
                        {selectedStore.mallDifficulty === 1 && "Yok - AVM dışında"}
                        {selectedStore.mallDifficulty === 2 && "Az - AVM içinde kolay erişim"}
                        {selectedStore.mallDifficulty === 3 && "Orta - AVM içinde orta zorluk"}
                        {selectedStore.mallDifficulty === 4 && "Yüksek - AVM içinde zor erişim"}
                        {selectedStore.mallDifficulty === 5 && "Aşırı Yüksek - AVM içinde çok zor"}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Bölgesel Zorluk</span>
                        <Tag color={getDifficultyColor(selectedStore.regionalDifficulty)}>
                          {selectedStore.regionalDifficulty}
                        </Tag>
                      </div>
                      <div className="text-sm text-gray-600">
                        {selectedStore.regionalDifficulty === 1 && "Kolay - Trafik ve mesafe sorunu yok"}
                        {selectedStore.regionalDifficulty === 2 && "Orta - Hafif trafik sorunu"}
                        {selectedStore.regionalDifficulty === 3 && "Zor - Orta seviye trafik sorunu"}
                        {selectedStore.regionalDifficulty === 4 && "Çok Zor - Yoğun trafik"}
                        {selectedStore.regionalDifficulty === 5 && "Aşırı Zor - Aşırı yoğun trafik"}
                      </div>
                    </div>
                  </div>

                  {/* Toplam Puan */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Toplam Zorluk Puanı</span>
                      <Tag color={getDifficultyColor(selectedStore.totalDifficultyScore)} size="large">
                        {selectedStore.totalDifficultyScore}
                      </Tag>
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                      {selectedStore.totalDifficultyScore <= 5 && "Düşük zorluk - Kolay erişim"}
                      {selectedStore.totalDifficultyScore > 5 && selectedStore.totalDifficultyScore <= 10 && "Orta zorluk - Normal erişim"}
                      {selectedStore.totalDifficultyScore > 10 && selectedStore.totalDifficultyScore <= 15 && "Yüksek zorluk - Zor erişim"}
                      {selectedStore.totalDifficultyScore > 15 && selectedStore.totalDifficultyScore <= 20 && "Çok yüksek zorluk - Çok zor erişim"}
                      {selectedStore.totalDifficultyScore > 20 && "Aşırı zorluk - Aşırı zor erişim"}
                    </div>
                  </div>

                  {/* Açıklama */}
                  {selectedStore.description && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Açıklama</h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedStore.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreDifficultyManager;
