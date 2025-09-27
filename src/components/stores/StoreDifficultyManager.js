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
import { storeDifficultyService } from '../../services/supabase';

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
  const [availableRegions, setAvailableRegions] = useState([]);
  const fileInputRef = useRef(null);
  const carouselRef = useRef(null);
  const detailCarouselRef = useRef(null);

  // Veritabanından mağazaları yükle
  const loadStoresFromDatabase = async (showMessage = false) => {
    try {
      setLoading(true);
      const result = await storeDifficultyService.getAllStores();
      
      if (result.success) {
        const processedData = result.data.map((store, index) => ({
          key: store.id,
          id: store.id,
          storeCode: store.store_code,
          storeName: store.store_name,
          region: store.region,
          averageCases: store.average_cases,
          averagePallets: store.average_pallets,
          physicalAccessDifficulty: store.physical_access_difficulty,
          vehicleDistance: store.vehicle_distance,
          mallDifficulty: store.mall_difficulty,
          regionalDifficulty: store.regional_difficulty,
          totalDifficultyScore: store.total_difficulty_score,
          description: store.description,
          storeType: store.store_type,
          stairSteps: store.stair_steps,
          images: store.store_difficulty_images || []
        }));
        
        setStoreData(processedData);
        setFilteredData(processedData);
        
        // Mevcut bölgeleri ayıkla ve sırala
        const uniqueRegions = [...new Set(processedData.map(store => store.region).filter(region => region))].sort();
        setAvailableRegions(uniqueRegions);
        
        if (processedData.length === 0) {
          message.info('Henüz mağaza verisi bulunmuyor. Excel dosyası yükleyerek başlayabilirsiniz.');
        } else if (showMessage) {
          message.success(`${processedData.length} mağaza verisi yüklendi!`);
        }
      } else {
        console.error('❌ Supabase hatası:', result.error);
        message.error(`Veri yükleme hatası: ${result.error}`);
      }
    } catch (error) {
      console.error('💥 Veri yükleme hatası:', error);
      message.error(`Veriler yüklenirken hata oluştu: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Component mount olduğunda verileri yükle
  useEffect(() => {
    loadStoresFromDatabase();
  }, []);

  // Excel indirme
  const handleDownloadExcel = () => {
    try {
      const dataToExport = storeData.map(store => ({
        'Mağaza Kodu': store.storeCode,
        'Mağaza Adı': store.storeName,
        'Bölge': store.region,
        'Sevkiyatta Bu Mağazaya Bırakılan Ortalama Kasa Sayısı': store.averageCases,
        'Palet Sayısı Ortalama': store.averagePallets,
        'Fiziksel Erişim Zorluğu': store.physicalAccessDifficulty,
        'Araç Mağaza Uzaklığı': store.vehicleDistance,
        'Avm Zorluğu': store.mallDifficulty,
        'Bölgesel Zorluk (Uzaklık & Trafik)': store.regionalDifficulty,
        'Toplam Zorluk Puanı': store.totalDifficultyScore,
        'Açıklama': store.description,
        'Mağaza Tipi': store.storeType,
        'Merdiven Basamak Sayısı': store.stairSteps
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Mağaza Zorluk Verileri');
      
      const fileName = `mağaza_zorluk_verileri_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      message.success('Excel dosyası indirildi!');
    } catch (error) {
      console.error('Excel indirme hatası:', error);
      message.error('Excel dosyası indirilemedi!');
    }
  };

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

  // Excel dosyasını işle ve Supabase'e kaydet
  const handleFileUpload = async (file) => {
    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // İlk satırı başlık olarak al
        const headers = jsonData[0];
        const rows = jsonData.slice(1);
        
        // Veriyi işle ve Supabase formatına çevir
        const processedData = rows
          .filter(row => row[0] && row[0].toString().trim() !== '') // Kod boş olmayan satırları filtrele
          .map((row, index) => ({
            store_code: parseInt(row[0]) || 0,
            store_name: row[1] || '',
            region: row[2] || '',
            average_cases: parseInt(row[3]) || 0,
            average_pallets: parseInt(row[4]) || 0,
            physical_access_difficulty: parseInt(row[5]) || 1,
            vehicle_distance: parseInt(row[6]) || 1,
            mall_difficulty: parseInt(row[7]) || 0,
            regional_difficulty: parseInt(row[8]) || 1,
            total_difficulty_score: parseInt(row[9]) || 0,
            description: row[10] || '',
            store_type: row[11] || 'CADDE',
            stair_steps: parseInt(row[12]) || 0
          }));
        
        // Supabase'e toplu kaydet
        const result = await storeDifficultyService.bulkUpsertStores(processedData);
        
        if (result.success) {
          // Başarılı kayıt sonrası verileri tekrar getir
          await loadStoresFromDatabase();
          message.success(`${processedData.length} mağaza başarıyla Supabase'e kaydedildi!`);
        } else {
          message.error(`Kayıt hatası: ${result.error}`);
        }
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
  const handleSaveEdit = async (values) => {
    try {
      setLoading(true);
      message.loading({
        content: '⏳ Mağaza bilgileri güncelleniyor...',
        duration: 0,
        key: 'saving'
      });
      
      // Toplam zorluk puanını hesapla
      const totalScore = values.physicalAccessDifficulty + values.vehicleDistance + 
                        values.mallDifficulty + values.regionalDifficulty;
      
      // Supabase formatına çevir
      const updateData = {
        store_name: values.storeName,
        region: values.region,
        average_cases: values.averageCases,
        average_pallets: values.averagePallets,
        physical_access_difficulty: values.physicalAccessDifficulty,
        vehicle_distance: values.vehicleDistance,
        mall_difficulty: values.mallDifficulty,
        regional_difficulty: values.regionalDifficulty,
        total_difficulty_score: totalScore,
        description: values.description,
        store_type: values.storeType,
        stair_steps: values.stairSteps
      };
      
      // Supabase'e güncelle
      console.log('🔄 Güncelleme başlatılıyor...', updateData);
      const result = await storeDifficultyService.updateStore(editingRecord.id, updateData);
      console.log('📊 Güncelleme sonucu:', result);
      
      if (result.success) {
        // Başarılı güncelleme sonrası verileri tekrar getir
        console.log('✅ Güncelleme başarılı, veriler yenileniyor...');
        await loadStoresFromDatabase();
        message.destroy('saving');
        setIsEditModalVisible(false);
        setEditingRecord(null);
        message.success({
          content: '✅ Mağaza bilgileri başarıyla güncellendi!',
          duration: 3,
          style: {
            marginTop: '20px',
            fontSize: '14px',
            fontWeight: '500'
          }
        });
        console.log('🎉 Başarı mesajı gösterildi');
      } else {
        console.log('❌ Güncelleme hatası:', result.error);
        message.destroy('saving');
        message.error({
          content: `❌ Güncelleme hatası: ${result.error}`,
          duration: 5,
          style: {
            marginTop: '20px',
            fontSize: '14px',
            fontWeight: '500'
          }
        });
      }
    } catch (error) {
      console.error('Güncelleme hatası:', error);
      message.destroy('saving');
      message.error({
        content: '❌ Güncelleme sırasında hata oluştu!',
        duration: 5,
        style: {
          marginTop: '20px',
          fontSize: '14px',
          fontWeight: '500'
        }
      });
    } finally {
      setLoading(false);
    }
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

  // Görsel yükleme (tek veya çoklu)
  const handleImageUpload = (file, recordKey) => {
    return false; // beforeUpload'da false döndürüyoruz, asıl işlemi onChange'de yapacağız
  };

  // Çoklu görsel yükleme için state
  const [pendingImages, setPendingImages] = useState({});
  const [uploadingImages, setUploadingImages] = useState({});

  // Upload onChange handler
  const handleUploadChange = async (info, recordKey) => {
    const { fileList } = info;
    
    if (fileList.length === 0) return;
    
    // Sadece yeni yüklenen dosyaları işle
    const newFiles = fileList.filter(file => file.status === 'done' || file.originFileObj);
    
    if (newFiles.length === 0) return;
    
    setUploadingImages(prev => ({ ...prev, [recordKey]: true }));
    
    try {
      // Mağaza ID'sini bul
      const store = storeData.find(s => s.key === recordKey);
      if (!store || !store.id) {
        message.error('Mağaza bulunamadı!');
        return;
      }
      
      // Her dosya için Supabase'e kaydet
      for (const file of newFiles) {
        const reader = new FileReader();
        
        await new Promise((resolve, reject) => {
          reader.onload = async (e) => {
            try {
              const base64Data = e.target.result;
              
              const imageData = {
                url: base64Data,
                name: file.name,
                data: base64Data
              };
              
              const result = await storeDifficultyService.addStoreImage(store.id, imageData);
              
              if (result.success) {
                message.success(`${file.name} başarıyla yüklendi!`);
              } else {
                message.error(`${file.name} yüklenirken hata: ${result.error}`);
              }
              
              resolve();
            } catch (error) {
              console.error('Görsel yükleme hatası:', error);
              message.error(`${file.name} yüklenirken hata oluştu!`);
              reject(error);
            }
          };
          
          reader.onerror = () => reject(new Error('Dosya okunamadı'));
          reader.readAsDataURL(file.originFileObj || file);
        });
      }
      
      // Verileri tekrar yükle
      await loadStoresFromDatabase();
      
    } catch (error) {
      console.error('Görsel yükleme hatası:', error);
      message.error('Görseller yüklenirken hata oluştu!');
    } finally {
      setUploadingImages(prev => ({ ...prev, [recordKey]: false }));
    }
  };

  // Tablo sütunları
  const columns = [
    {
      title: 'Kod',
      dataIndex: 'storeCode',
      key: 'storeCode',
      width: 60,
      align: 'center',
      sorter: (a, b) => a.storeCode - b.storeCode,
      filters: Array.from(new Set(storeData.map(store => store.storeCode))).map(code => ({
        text: code,
        value: code
      })),
      onFilter: (value, record) => record.storeCode === value,
      render: (value) => <span className="text-xs font-medium text-blue-600 text-center block">{value}</span>
    },
    {
      title: 'Mağaza Adı',
      dataIndex: 'storeName',
      key: 'storeName',
      width: 140,
      sorter: (a, b) => a.storeName.localeCompare(b.storeName),
      filters: Array.from(new Set(storeData.map(store => store.storeName))).map(name => ({
        text: name,
        value: name
      })),
      onFilter: (value, record) => record.storeName === value,
      render: (text) => <span className="text-xs">{text}</span>
    },
    {
      title: 'Bölge',
      dataIndex: 'region',
      key: 'region',
      width: 100,
      sorter: (a, b) => (a.region || '').localeCompare(b.region || ''),
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
      width: 70,
      align: 'center',
      sorter: (a, b) => a.averageCases - b.averageCases,
      filters: [
        { text: '0-29 (Düşük)', value: 'low' },
        { text: '30-49 (Orta)', value: 'medium' },
        { text: '50+ (Yüksek)', value: 'high' }
      ],
      onFilter: (value, record) => {
        if (value === 'low') return record.averageCases < 30;
        if (value === 'medium') return record.averageCases >= 30 && record.averageCases < 50;
        if (value === 'high') return record.averageCases >= 50;
        return true;
      },
      render: (value) => (
        <div className="flex justify-center">
          <Tag color={value >= 50 ? 'red' : value >= 30 ? 'orange' : 'green'} size="small">
            {value}
          </Tag>
        </div>
      )
    },
    {
      title: 'Palet',
      dataIndex: 'averagePallets',
      key: 'averagePallets',
      width: 70,
      align: 'center',
      sorter: (a, b) => a.averagePallets - b.averagePallets,
      filters: [
        { text: '0-2 (Düşük)', value: 'low' },
        { text: '3-4 (Orta)', value: 'medium' },
        { text: '5+ (Yüksek)', value: 'high' }
      ],
      onFilter: (value, record) => {
        if (value === 'low') return record.averagePallets < 3;
        if (value === 'medium') return record.averagePallets >= 3 && record.averagePallets < 5;
        if (value === 'high') return record.averagePallets >= 5;
        return true;
      },
      render: (value) => (
        <div className="flex justify-center">
          <Tag color={value >= 5 ? 'red' : value >= 3 ? 'orange' : 'green'} size="small">
            {value}
          </Tag>
        </div>
      )
    },
    {
      title: 'Fiziksel',
      dataIndex: 'physicalAccessDifficulty',
      key: 'physicalAccessDifficulty',
      width: 70,
      align: 'center',
      filters: [
        { text: '1 (Kolay)', value: 1 },
        { text: '2 (Orta)', value: 2 },
        { text: '3 (Zor)', value: 3 },
        { text: '4 (Çok Zor)', value: 4 },
        { text: '5 (Aşırı Zor)', value: 5 }
      ],
      onFilter: (value, record) => record.physicalAccessDifficulty === value,
      render: (value) => (
        <div className="flex justify-center">
          <Tag color={getDifficultyColor(value)} size="small">
            {value}
          </Tag>
        </div>
      ),
      sorter: (a, b) => a.physicalAccessDifficulty - b.physicalAccessDifficulty,
    },
    {
      title: 'Uzaklık',
      dataIndex: 'vehicleDistance',
      key: 'vehicleDistance',
      width: 70,
      align: 'center',
      filters: [
        { text: '1 (Yakın)', value: 1 },
        { text: '2 (Orta)', value: 2 },
        { text: '3 (Uzak)', value: 3 },
        { text: '4 (Çok Uzak)', value: 4 },
        { text: '5 (Aşırı Uzak)', value: 5 }
      ],
      onFilter: (value, record) => record.vehicleDistance === value,
      render: (value) => (
        <div className="flex justify-center">
          <Tag color={getDifficultyColor(value)} size="small">
            {value}
          </Tag>
        </div>
      ),
      sorter: (a, b) => a.vehicleDistance - b.vehicleDistance,
    },
    {
      title: 'AVM',
      dataIndex: 'mallDifficulty',
      key: 'mallDifficulty',
      width: 60,
      align: 'center',
      filters: [
        { text: '0 (Yok)', value: 0 },
        { text: '1 (Kolay)', value: 1 },
        { text: '2 (Orta)', value: 2 },
        { text: '3 (Zor)', value: 3 },
        { text: '4 (Çok Zor)', value: 4 },
        { text: '5 (Aşırı Zor)', value: 5 }
      ],
      onFilter: (value, record) => record.mallDifficulty === value,
      render: (value) => (
        <div className="flex justify-center">
          <Tag color={getDifficultyColor(value)} size="small">
            {value}
          </Tag>
        </div>
      ),
      sorter: (a, b) => a.mallDifficulty - b.mallDifficulty,
    },
    {
      title: 'Bölgesel',
      dataIndex: 'regionalDifficulty',
      key: 'regionalDifficulty',
      width: 70,
      align: 'center',
      filters: [
        { text: '1 (Kolay)', value: 1 },
        { text: '2 (Orta)', value: 2 },
        { text: '3 (Zor)', value: 3 },
        { text: '4 (Çok Zor)', value: 4 },
        { text: '5 (Aşırı Zor)', value: 5 }
      ],
      onFilter: (value, record) => record.regionalDifficulty === value,
      render: (value) => (
        <div className="flex justify-center">
          <Tag color={getDifficultyColor(value)} size="small">
            {value}
          </Tag>
        </div>
      ),
      sorter: (a, b) => a.regionalDifficulty - b.regionalDifficulty,
    },
    {
      title: 'Toplam',
      dataIndex: 'totalDifficultyScore',
      key: 'totalDifficultyScore',
      width: 70,
      align: 'center',
      filters: [
        { text: '0-1 (Düşük)', value: 'low' },
        { text: '2-3 (Orta)', value: 'medium' },
        { text: '4-5 (Yüksek)', value: 'high' },
        { text: '6+ (Aşırı Yüksek)', value: 'very_high' }
      ],
      onFilter: (value, record) => {
        if (value === 'low') return record.totalDifficultyScore <= 1;
        if (value === 'medium') return record.totalDifficultyScore >= 2 && record.totalDifficultyScore <= 3;
        if (value === 'high') return record.totalDifficultyScore >= 4 && record.totalDifficultyScore <= 5;
        if (value === 'very_high') return record.totalDifficultyScore >= 6;
        return true;
      },
      render: (value) => (
        <div className="flex justify-center">
          <Tag color={value >= 2 ? 'red' : getDifficultyColor(value)} size="small">
            {value}
          </Tag>
        </div>
      ),
      sorter: (a, b) => a.totalDifficultyScore - b.totalDifficultyScore,
    },
    {
      title: 'Açıklama',
      dataIndex: 'description',
      key: 'description',
      width: 120,
      ellipsis: true,
      filters: [
        { text: 'Açıklama Var', value: 'has_description' },
        { text: 'Açıklama Yok', value: 'no_description' }
      ],
      onFilter: (value, record) => {
        if (value === 'has_description') return record.description && record.description.trim() !== '';
        if (value === 'no_description') return !record.description || record.description.trim() === '';
        return true;
      },
      render: (text) => (
        <Tooltip title={text}>
          <span className="text-xs text-gray-600">
            {text ? text.substring(0, 20) + '...' : '-'}
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'Tip',
      dataIndex: 'storeType',
      key: 'storeType',
      width: 60,
      align: 'center',
      filters: [
        { text: 'CADDE', value: 'CADDE' },
        { text: 'AVM', value: 'AVM' },
        { text: 'BEAUTY', value: 'BEAUTY' },
      ],
      onFilter: (value, record) => record.storeType === value,
      render: (text) => (
        <div className="flex justify-center">
          <Tag color={text === 'AVM' ? 'purple' : text === 'BEAUTY' ? 'pink' : 'blue'} size="small">
            {text}
          </Tag>
        </div>
      )
    },
    {
      title: 'Merdiven',
      dataIndex: 'stairSteps',
      key: 'stairSteps',
      width: 70,
      align: 'center',
      filters: [
        { text: 'Basamak Yok', value: 'no_stairs' },
        { text: '1-2 Basamak', value: 'low' },
        { text: '3-4 Basamak', value: 'medium' },
        { text: '5+ Basamak', value: 'high' }
      ],
      onFilter: (value, record) => {
        if (value === 'no_stairs') return record.stairSteps === 'Basamak Yok' || record.stairSteps === '' || isNaN(parseInt(record.stairSteps));
        if (value === 'low') return parseInt(record.stairSteps) >= 1 && parseInt(record.stairSteps) <= 2;
        if (value === 'medium') return parseInt(record.stairSteps) >= 3 && parseInt(record.stairSteps) <= 4;
        if (value === 'high') return parseInt(record.stairSteps) >= 5;
        return true;
      },
      render: (text) => {
        if (text === 'Basamak Yok' || text === '' || isNaN(parseInt(text))) {
          return <span className="text-xs text-gray-500 text-center block">-</span>;
        }
        return (
          <div className="flex justify-center">
            <Tag color={parseInt(text) <= 2 ? 'green' : parseInt(text) <= 4 ? 'orange' : 'red'} size="small">
              {text}
            </Tag>
          </div>
        );
      }
    },
    {
      title: 'Görseller',
      key: 'images',
      width: 80,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Görselleri Görüntüle">
            <Button
              type="text"
              size="small"
              icon={<ImageIcon size={12} />}
              onClick={() => handleViewImages(record)}
              className={record.images?.length > 0 ? 'text-green-600 hover:text-green-700' : 'text-gray-400'}
            >
              <span className={record.images?.length > 0 ? 'text-green-600 font-medium text-xs' : 'text-gray-400 text-xs'}>
                {record.images?.length || 0}
              </span>
            </Button>
          </Tooltip>
          <Tooltip title="Görsel Ekle">
            <AntUpload
              multiple
              beforeUpload={(file) => handleImageUpload(file, record.key)}
              onChange={(info) => handleUploadChange(info, record.key)}
              showUploadList={false}
              accept="image/*"
            >
              <Button 
                type="text" 
                size="small"
                icon={<Upload size={12} />}
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
      width: 80,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Detay">
            <Button
              type="text"
              size="small"
              icon={<Eye size={12} />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Tooltip title="Düzenle">
            <Button
              type="text"
              size="small"
              icon={<Edit size={12} />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <style>
        {`
          .compact-table .ant-table-thead > tr > th {
            font-size: 11px !important;
            padding: 8px 4px !important;
            line-height: 1.2 !important;
            white-space: nowrap !important;
          }
          .compact-table .ant-table-tbody > tr > td {
            font-size: 11px !important;
            padding: 6px 4px !important;
          }
        `}
      </style>
      <Card className="mb-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          {/* Sol üst - Arama */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Input
                size="large"
                placeholder="Mağaza adı, kodu veya bölge ile ara..."
                prefix={<Search size={16} className="text-gray-400" />}
                value={searchText}
                onChange={(e) => handleSearch(e.target.value)}
                allowClear
                className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                style={{
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  border: '1px solid #e5e7eb'
                }}
              />
            </div>
          </div>
          
          {/* Sağ üst - Toplam bilgisi, Görünüm seçenekleri ve İşlem butonları */}
          <div className="flex items-center space-x-4">
            {/* Toplam bilgisi */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl px-3 py-1">
              <span className="text-sm font-medium text-blue-700">
                Toplam: <span className="font-bold text-blue-800">{filteredData.length}</span> mağaza
              </span>
            </div>

            {/* Görünüm seçenekleri */}
            <div className="bg-white border border-gray-200 rounded-xl p-1 shadow-sm flex">
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                  viewMode === 'table'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Search size={16} className="mr-2" />
                Liste
              </button>
              <button
                onClick={() => setViewMode('detail')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center ${
                  viewMode === 'detail'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <ImageIcon size={16} className="mr-2" />
                Kart
              </button>
            </div>
            
            {/* İşlem butonları */}
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
              onClick={handleDownloadExcel}
              disabled={storeData.length === 0}
            >
              <Download size={16} className="mr-2" />
              Excel İndir
            </button>
            </div>
          </div>
        </div>

        {viewMode === 'table' ? (
          <Table
            columns={columns}
            dataSource={currentData}
            loading={loading}
            scroll={{ x: 800 }}
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
            style={{
              fontSize: '12px'
            }}
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
                  <div className="w-full bg-gray-100 rounded-lg mb-3 overflow-hidden group-hover:bg-gray-200 transition-colors duration-300 cursor-pointer" onClick={() => handleViewImages(store)}>
                    {store.images && store.images.length > 0 ? (
                      <div className="relative">
                          <Image
                            src={store.images[0].image_url || store.images[0].url}
                            alt={store.storeName}
                            className="w-full group-hover:scale-105 transition-transform duration-300"
                            style={{
                              height: '200px',
                              objectFit: 'cover',
                              objectPosition: 'center'
                            }}
                            preview={false}
                          />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-center">
                            <ImageIcon size={24} className="mx-auto mb-1" />
                            <span className="text-xs">Görselleri Gör</span>
                          </div>
                        </div>
                        {store.images.length > 1 && (
                          <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
                            +{store.images.length - 1}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-32 flex items-center justify-center text-gray-400 text-center group-hover:text-gray-500 transition-colors duration-300">
                        <div>
                          <ImageIcon size={32} className="mx-auto mb-2 group-hover:scale-110 transition-transform duration-300" />
                          <span className="text-xs">Görsel Yok</span>
                        </div>
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
                        Fiziksel: {store.physicalAccessDifficulty}
                      </Tag>
                      <Tag color={getDifficultyColor(store.vehicleDistance)} size="small">
                        Araç: {store.vehicleDistance}
                      </Tag>
                      <Tag color={getDifficultyColor(store.mallDifficulty)} size="small">
                        AVM: {store.mallDifficulty}
                      </Tag>
                      <Tag color={getDifficultyColor(store.regionalDifficulty)} size="small">
                        Bölgesel: {store.regionalDifficulty}
                      </Tag>
                    </div>

                    {/* Toplam Puan */}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Toplam:</span>
                      <Tag color={getDifficultyColor(store.totalDifficultyScore)} size="small">
                        {store.totalDifficultyScore}
                      </Tag>
                    </div>

                    {/* Mağaza Tipi ve Merdiven */}
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center space-x-2">
                        <Tag color={store.storeType === 'AVM' ? 'purple' : store.storeType === 'BEAUTY' ? 'pink' : 'blue'} size="small">
                          {store.storeType}
                        </Tag>
                        <Tag color={store.stairSteps === 'Basamak Yok' || store.stairSteps === '' || isNaN(parseInt(store.stairSteps)) ? 'gray' : parseInt(store.stairSteps) <= 2 ? 'green' : parseInt(store.stairSteps) <= 4 ? 'orange' : 'red'} size="small">
                          {store.stairSteps === 'Basamak Yok' || store.stairSteps === '' || isNaN(parseInt(store.stairSteps)) ? '-' : store.stairSteps}
                        </Tag>
                      </div>
                    </div>

                    {/* Görsel Sayısı ve Ortalama */}
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Görseller: {store.images?.length || 0}</span>
                      <span>Ort. Kasa: {store.averageCases} | Ort. Palet: {store.averagePallets}</span>
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
          title={
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Edit size={16} className="text-blue-600" />
              </div>
              <span className="text-lg font-semibold text-gray-800">Mağaza Bilgilerini Düzenle</span>
            </div>
          }
          open={isEditModalVisible}
          onCancel={() => setIsEditModalVisible(false)}
          footer={null}
          width={750}
          className="modern-modal"
          style={{
            borderRadius: '16px',
            maxHeight: '82vh',
            overflow: 'hidden'
          }}
        >
        {editingRecord && (
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-3 shadow-lg max-h-[calc(82vh-80px)] overflow-y-auto">
            <Form
              layout="vertical"
              initialValues={editingRecord}
              onFinish={handleSaveEdit}
              className="space-y-2"
            >
            {/* Temel Bilgiler */}
            <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center">
                <div className="w-4 h-4 bg-blue-100 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-blue-600 text-xs font-bold">1</span>
                </div>
                Temel Bilgiler
              </h3>
              <Row gutter={12}>
                <Col span={6}>
                  <Form.Item
                    label={<span className="text-xs font-medium text-gray-700">Mağaza Kodu</span>}
                    name="storeCode"
                    rules={[{ required: true, message: 'Mağaza kodu gerekli!' }]}
                  >
                    <InputNumber 
                      style={{ 
                        width: '100%',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        padding: '6px 10px',
                        fontSize: '12px',
                        transition: 'all 0.2s'
                      }} 
                      size="middle"
                      placeholder="Mağaza kodu girin"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={<span className="text-xs font-medium text-gray-700">Mağaza Adı</span>}
                    name="storeName"
                    rules={[{ required: true, message: 'Mağaza adı gerekli!' }]}
                  >
                    <Input 
                      size="middle"
                      placeholder="Mağaza adını girin"
                      style={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        padding: '6px 10px',
                        fontSize: '12px',
                        transition: 'all 0.2s'
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    label={<span className="text-xs font-medium text-gray-700">Bölge</span>}
                    name="region"
                    rules={[{ required: true, message: 'Bölge gerekli!' }]}
                  >
                    <Select 
                      size="middle"
                      placeholder="Bölge seçin"
                      showSearch
                      filterOption={(input, option) =>
                        (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      style={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        fontSize: '12px'
                      }}
                    >
                      {availableRegions.map(region => (
                        <Option key={region} value={region}>
                          {region}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* Sayısal Veriler */}
            <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center">
                <div className="w-4 h-4 bg-green-100 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-green-600 text-xs font-bold">2</span>
                </div>
                Sayısal Veriler
              </h3>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    label={<span className="text-xs font-medium text-gray-700">Ort. Kasa</span>}
                    name="averageCases"
                  >
                    <InputNumber 
                      style={{ 
                        width: '100%',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        padding: '6px 10px',
                        fontSize: '12px',
                        transition: 'all 0.2s'
                      }} 
                      size="middle"
                      placeholder="0"
                      min={0}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={<span className="text-xs font-medium text-gray-700">Ort. Palet</span>}
                    name="averagePallets"
                  >
                    <InputNumber 
                      style={{ 
                        width: '100%',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        padding: '6px 10px',
                        fontSize: '12px',
                        transition: 'all 0.2s'
                      }} 
                      size="middle"
                      placeholder="0"
                      min={0}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* Zorluk Seviyeleri */}
            <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center">
                <div className="w-4 h-4 bg-orange-100 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-orange-600 text-xs font-bold">3</span>
                </div>
                Zorluk Seviyeleri
              </h3>
              <Row gutter={12}>
                <Col span={6}>
                  <Form.Item
                    label={<span className="text-xs font-medium text-gray-700">Fiziksel Erişim</span>}
                    name="physicalAccessDifficulty"
                  >
                    <Select 
                      size="middle"
                      placeholder="Seviye seçin"
                      style={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        fontSize: '13px'
                      }}
                    >
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
                    label={<span className="text-xs font-medium text-gray-700">Araç Uzaklığı</span>}
                    name="vehicleDistance"
                  >
                    <Select 
                      size="middle"
                      placeholder="Seviye seçin"
                      style={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        fontSize: '13px'
                      }}
                    >
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
                    label={<span className="text-xs font-medium text-gray-700">AVM Zorluğu</span>}
                    name="mallDifficulty"
                  >
                    <Select 
                      size="middle"
                      placeholder="Seviye seçin"
                      style={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        fontSize: '13px'
                      }}
                    >
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
                    label={<span className="text-xs font-medium text-gray-700">Bölgesel Zorluk</span>}
                    name="regionalDifficulty"
                  >
                    <Select 
                      size="middle"
                      placeholder="Seviye seçin"
                      style={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        fontSize: '13px'
                      }}
                    >
                      <Option value={1}>1 - Kolay</Option>
                      <Option value={2}>2 - Orta</Option>
                      <Option value={3}>3 - Zor</Option>
                      <Option value={4}>4 - Çok Zor</Option>
                      <Option value={5}>5 - Aşırı Zor</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* Ek Bilgiler */}
            <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center">
                <div className="w-4 h-4 bg-purple-100 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-purple-600 text-xs font-bold">4</span>
                </div>
                Ek Bilgiler
              </h3>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    label={<span className="text-xs font-medium text-gray-700">Mağaza Tipi</span>}
                    name="storeType"
                  >
                    <Select 
                      size="middle"
                      placeholder="Tip seçin"
                      style={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        fontSize: '12px'
                      }}
                    >
                      <Option value="CADDE">CADDE</Option>
                      <Option value="AVM">AVM</Option>
                      <Option value="BEAUTY">BEAUTY</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={<span className="text-xs font-medium text-gray-700">Merdiven Basamak Sayısı</span>}
                    name="stairSteps"
                  >
                    <InputNumber 
                      style={{ 
                        width: '100%',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        padding: '6px 10px',
                        fontSize: '12px',
                        transition: 'all 0.2s'
                      }} 
                      size="middle"
                      min={0}
                      placeholder="Basamak sayısı"
                    />
                  </Form.Item>
                </Col>
              </Row>
              
              <Form.Item
                label={<span className="text-xs font-medium text-gray-700">Açıklama</span>}
                name="description"
                style={{ marginBottom: '8px' }}
              >
                <TextArea 
                  rows={1} 
                  size="middle"
                  placeholder="Mağaza hakkında açıklama yazın..."
                  style={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    padding: '6px 10px',
                    fontSize: '12px',
                    transition: 'all 0.2s'
                  }}
                />
              </Form.Item>
            </div>

            <div className="flex justify-end space-x-2 pt-1 border-t border-gray-200">
              <Button 
                size="small" 
                onClick={() => setIsEditModalVisible(false)}
                className="px-3 py-1 rounded-lg border-gray-300 text-gray-600 hover:bg-gray-50 transition-all duration-200"
              >
                İptal
              </Button>
              <Button 
                type="primary" 
                size="small" 
                htmlType="submit"
                className="px-3 py-1 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Kaydet
              </Button>
            </div>
            </Form>
          </div>
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
                        src={image.image_url || image.url}
                        alt={image.image_name || image.name}
                        className="w-full rounded-lg cursor-pointer"
                        style={{
                          height: '500px',
                          objectFit: 'cover',
                          objectPosition: 'center'
                        }}
                        preview={{
                          mask: 'Büyüt',
                          maskClassName: 'bg-black bg-opacity-50 text-white'
                        }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-3 rounded-b-lg">
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
          <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden">
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
                                src={image.image_url || image.url}
                                alt={image.image_name || image.name}
                                className="w-full rounded-lg cursor-pointer"
                                style={{
                                  height: '400px',
                                  objectFit: 'cover',
                                  objectPosition: 'center'
                                }}
                                preview={{
                                  mask: 'Büyüt',
                                  maskClassName: 'bg-black bg-opacity-50 text-white'
                                }}
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
                      
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                      <ImageIcon size={48} className="mx-auto mb-4" />
                      <p>Bu mağaza için henüz görsel yüklenmemiş.</p>
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

                  {/* Mağaza Tipi ve Merdiven */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Mağaza Tipi</span>
                        <Tag color={selectedStore.storeType === 'AVM' ? 'purple' : selectedStore.storeType === 'BEAUTY' ? 'pink' : 'blue'}>
                          {selectedStore.storeType}
                        </Tag>
                      </div>
                      <div className="text-sm text-gray-600">
                        {selectedStore.storeType === 'CADDE' && "Cadde Mağazası"}
                        {selectedStore.storeType === 'AVM' && "AVM Mağazası"}
                        {selectedStore.storeType === 'BEAUTY' && "Beauty Mağazası"}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Merdiven Basamak Sayısı</span>
                        <Tag color={selectedStore.stairSteps === 'Basamak Yok' || selectedStore.stairSteps === '' || isNaN(parseInt(selectedStore.stairSteps)) ? 'gray' : parseInt(selectedStore.stairSteps) <= 2 ? 'green' : parseInt(selectedStore.stairSteps) <= 4 ? 'orange' : 'red'}>
                          {selectedStore.stairSteps === 'Basamak Yok' || selectedStore.stairSteps === '' || isNaN(parseInt(selectedStore.stairSteps)) ? '-' : selectedStore.stairSteps}
                        </Tag>
                      </div>
                      <div className="text-sm text-gray-600">
                        {selectedStore.stairSteps === 'Basamak Yok' || selectedStore.stairSteps === '' || isNaN(parseInt(selectedStore.stairSteps)) ? "Merdiven yok - Zemin kat" : 
                         parseInt(selectedStore.stairSteps) <= 2 ? "Az basamak - Kolay erişim" :
                         parseInt(selectedStore.stairSteps) <= 4 ? "Orta basamak - Normal erişim" :
                         "Çok basamak - Zor erişim"}
                      </div>
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
