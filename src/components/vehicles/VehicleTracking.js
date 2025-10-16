import React, { useState, useEffect } from 'react';
import { 
  Save, 
  X, 
  Car, 
  User, 
  Calendar, 
  Clock, 
  MapPin, 
  Plus,
  Minus,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
  Camera,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { vehicleService, transferVehicleService, aktarmaSoforService, vehicleTrackingService } from '../../services/supabase';

const VehicleTracking = ({ vehicleData = [], personnelData = [], currentUser }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vehicle_plate: '',
    driver_name: '',
    region: '',
    departure_center: '',
    entry_time: '',
    exit_time: '',
    departure_km: '',
    liters_taken: '',
    notes: '',
    images: []
  });

  const [trackingEntries, setTrackingEntries] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [showDepoConfirmModal, setShowDepoConfirmModal] = useState(false);
  const [pendingEntry, setPendingEntry] = useState(null);

  // Birleşik araç ve şoför verileri
  const [allVehicles, setAllVehicles] = useState([]);
  const [allDrivers, setAllDrivers] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [filteredDrivers, setFilteredDrivers] = useState([]);

  // Çıkış merkezleri
  const departureCenters = [
    'Depo',
    'Gülsoy',
    'Vema',
    'Merkez',
    'Şube 1',
    'Şube 2',
    'Depo Merkez',
    'Antrepo',
    'Lojistik Merkezi'
  ];

  // Veri yükleme
  useEffect(() => {
    loadCombinedData();
  }, []);

  const loadCombinedData = async () => {
    try {
      // Transfer araçları ve şoförleri yükle
      const [transferVehiclesResult, transferDriversResult, normalVehiclesResult] = await Promise.all([
        transferVehicleService.getAllTransferVehicles(),
        aktarmaSoforService.getAllDrivers(),
        vehicleService.getAllVehicles()
      ]);

      let vehicles = [];
      let drivers = [];

      // Transfer araçları
      if (transferVehiclesResult.success) {
        const transferVehicles = transferVehiclesResult.data.map(vehicle => ({
          id: vehicle.id,
          license_plate: vehicle.plate,
          vehicle_type: 'Kamyon',
          location_point: null,
          is_active: true,
          notes: `Bölge: ${vehicle.region}`,
          first_driver: vehicle.driver_name || null,
          second_driver: null,
          location: vehicle.region,
          assigned_store: null,
          created_at: vehicle.created_at,
          updated_at: vehicle.updated_at
        }));
        vehicles = [...vehicles, ...transferVehicles];
      }

      // Normal araçlar
      if (normalVehiclesResult.success) {
        vehicles = [...vehicles, ...normalVehiclesResult.data];
      }

      // Transfer şoförleri
      if (transferDriversResult.success) {
        const aktarmaDrivers = transferDriversResult.data.map(driver => ({
          id: driver.id,
          full_name: driver.ad_soyad,
          region: driver.bolge,
          warehouse: driver.depo || 'Belirtilmemiş',
          registration_number: driver.kayit_no || '',
          username: driver.kullanici_adi,
          is_active: driver.durum === 'aktif'
        }));
        drivers = [...drivers, ...aktarmaDrivers];
      }

      // Normal personel
      if (personnelData && personnelData.length > 0) {
        const normalDrivers = personnelData.map(person => ({
          id: person.id,
          full_name: person.full_name,
          region: person.region || 'Belirtilmemiş',
          warehouse: person.warehouse || 'Belirtilmemiş',
          registration_number: person.registration_number,
          username: person.username,
          is_active: person.is_active
        }));
        drivers = [...drivers, ...normalDrivers];
      }

      setAllVehicles(vehicles);
      setAllDrivers(drivers);
      setFilteredVehicles(vehicles);
      setFilteredDrivers(drivers);

      console.log('Araç Takip - Birleşik veriler yüklendi:', {
        vehicles: vehicles.length,
        drivers: drivers.length,
        aktarmaDrivers: transferDriversResult.success ? transferDriversResult.data.length : 0,
        normalDrivers: personnelData ? personnelData.length : 0
      });
    } catch (error) {
      console.error('Araç Takip - Veri yükleme hatası:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Hataları temizle
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      setErrors(prev => ({ ...prev, images: 'Lütfen sadece resim dosyası seçin' }));
      return;
    }

    // Dosya boyutu kontrolü (5MB)
    const oversizedFiles = imageFiles.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setErrors(prev => ({ ...prev, images: 'Dosya boyutu 5MB\'dan küçük olmalı' }));
      return;
    }

    // Maksimum 5 resim kontrolü
    if (formData.images.length + imageFiles.length > 5) {
      setErrors(prev => ({ ...prev, images: 'Maksimum 5 resim yükleyebilirsiniz' }));
      return;
    }

    // Resimleri base64'e çevir
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newImage = {
          id: Date.now() + Math.random(),
          name: file.name,
          size: file.size,
          data: event.target.result,
          type: file.type
        };
        
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, newImage]
        }));
      };
      reader.readAsDataURL(file);
    });

    // Hataları temizle
    if (errors.images) {
      setErrors(prev => ({ ...prev, images: '' }));
    }
  };

  const removeImage = (imageId) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(img => img.id !== imageId)
    }));
  };

  // Depo onay modal fonksiyonları
  const handleDepoConfirm = () => {
    if (pendingEntry) {
      const newEntry = {
        id: Date.now(),
        ...pendingEntry,
        exit_time: '' // Depo için çıkış saati boş
      };

      setTrackingEntries(prev => [...prev, newEntry]);
      
      // Form alanlarını temizle
      setFormData(prev => ({
        ...prev,
        departure_center: '',
        entry_time: '',
        exit_time: '',
        departure_km: '',
        liters_taken: '',
        notes: ''
      }));

      // Hataları temizle
      setErrors({});
    }
    
    setShowDepoConfirmModal(false);
    setPendingEntry(null);
  };

  const handleDepoCancel = () => {
    setShowDepoConfirmModal(false);
    setPendingEntry(null);
    // Kullanıcı çıkış saatini girebilir
  };

  const handleVehicleChange = (selectedPlate) => {
    if (selectedPlate === '') {
      // Tümünü göster seçildi
      setFilteredDrivers(allDrivers);
      setFormData(prev => ({ 
        ...prev, 
        vehicle_plate: '',
        region: ''
      }));
      return;
    }

    const selectedVehicle = allVehicles.find(vehicle => vehicle.license_plate === selectedPlate);
    const region = selectedVehicle?.location || selectedVehicle?.notes?.replace('Bölge: ', '') || '';
    
    const driversInRegion = allDrivers.filter(driver => driver.region === region);
    setFilteredDrivers(driversInRegion);
    
    setFormData(prev => ({ 
      ...prev, 
      vehicle_plate: selectedPlate,
      region: region
    }));
  };

  const handleDriverChange = (selectedDriverName) => {
    if (selectedDriverName === '') {
      // Tümünü göster seçildi
      setFilteredVehicles(allVehicles);
      setFormData(prev => ({ 
        ...prev, 
        driver_name: '',
        region: ''
      }));
      return;
    }

    const selectedDriver = allDrivers.find(driver => driver.full_name === selectedDriverName);
    const region = selectedDriver?.region || '';
    
    const vehiclesInRegion = allVehicles.filter(vehicle => 
      vehicle.location === region || vehicle.notes?.includes(region)
    );
    setFilteredVehicles(vehiclesInRegion);
    
    setFormData(prev => ({ 
      ...prev, 
      driver_name: selectedDriverName,
      region: region
    }));
  };

  const addEntry = () => {
    if (!formData.departure_center || !formData.entry_time || !formData.departure_km) {
      setErrors({
        departure_center: !formData.departure_center ? 'Çıkış merkezi gerekli' : '',
        entry_time: !formData.entry_time ? 'Giriş saati gerekli' : '',
        departure_km: !formData.departure_km ? 'KM okuma gerekli' : ''
      });
      return;
    }

    // Çıkış saati boş ise genel uyarı ver (park ediyorlar)
    if (!formData.exit_time) {
      setPendingEntry({
        departure_center: formData.departure_center,
        entry_time: formData.entry_time,
        exit_time: formData.exit_time,
        departure_km: formData.departure_km,
        liters_taken: formData.liters_taken || '',
        notes: formData.notes || ''
      });
      setShowDepoConfirmModal(true);
      return; // Modal'dan onay bekleniyor
    }

    const newEntry = {
      id: Date.now(),
      departure_center: formData.departure_center,
      entry_time: formData.entry_time,
      exit_time: formData.exit_time || (isDepoArrival ? '' : formData.exit_time),
      departure_km: formData.departure_km,
      liters_taken: formData.liters_taken || '',
      notes: formData.notes || ''
    };

    setTrackingEntries(prev => [...prev, newEntry]);
    
    // Form alanlarını temizle
    setFormData(prev => ({
      ...prev,
      departure_center: '',
      entry_time: '',
      exit_time: '',
      departure_km: '',
      liters_taken: '',
      notes: ''
    }));

    // Hataları temizle
    setErrors({});
  };

  const removeEntry = (id) => {
    setTrackingEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const editEntry = (entry) => {
    setEditingEntry(entry);
    setFormData(prev => ({
      ...prev,
      departure_center: entry.departure_center,
      entry_time: entry.entry_time,
      exit_time: entry.exit_time,
      departure_km: entry.departure_km,
      liters_taken: entry.liters_taken,
      notes: entry.notes
    }));
  };

  const updateEntry = () => {
    if (!editingEntry) return;

    setTrackingEntries(prev => prev.map(entry => 
      entry.id === editingEntry.id 
        ? {
            ...entry,
            departure_center: formData.departure_center,
            entry_time: formData.entry_time,
            exit_time: formData.exit_time,
            departure_km: formData.departure_km,
            liters_taken: formData.liters_taken,
            notes: formData.notes
          }
        : entry
    ));

    setEditingEntry(null);
    setFormData(prev => ({
      ...prev,
      departure_center: '',
      entry_time: '',
      exit_time: '',
      departure_km: '',
      liters_taken: '',
      notes: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (trackingEntries.length === 0) {
      setErrors({ general: 'En az bir takip girişi eklemelisiniz' });
      return;
    }

    setLoading(true);
    try {
      // Veritabanına kaydetme işlemi
      const trackingData = {
        date: formData.date,
        vehicle_plate: formData.vehicle_plate,
        driver_name: formData.driver_name,
        region: formData.region,
        notes: formData.notes,
        images: formData.images,
        created_by: currentUser?.username || 'web_user'
      };

      const entriesData = trackingEntries.map(entry => ({
        departure_center: entry.departure_center,
        entry_time: entry.entry_time,
        exit_time: entry.exit_time,
        departure_km: parseInt(entry.departure_km),
        entry_notes: entry.notes || ''
      }));

      const result = await vehicleTrackingService.saveTrackingWithEntries(trackingData, entriesData);

      if (result.success) {
        console.log('Araç Takip verisi başarıyla kaydedildi:', result.data);
        
        // Başarı mesajı
        setShowSuccessModal(true);
        
        // Formu temizle
        setFormData({
          date: new Date().toISOString().split('T')[0],
          vehicle_plate: '',
          driver_name: '',
          region: '',
          departure_center: '',
          entry_time: '',
          exit_time: '',
          departure_km: '',
          liters_taken: '',
          notes: '',
          images: []
        });
        setTrackingEntries([]);
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('Araç Takip kaydetme hatası:', error);
      console.error('Hata detayı:', error);
      setErrors({ general: `Kaydetme sırasında hata oluştu: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="w-full">
        {/* Başlık */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Car className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Araç Takip Formu</h1>
              <p className="text-gray-600">Araç hareketlerini ve giriş-çıkış bilgilerini takip edin</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Temel Bilgiler */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-600" />
              Temel Bilgiler
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tarih *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm hover:border-gray-400 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Araç Plakası *
                </label>
                <select
                  value={formData.vehicle_plate}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm hover:border-gray-400 transition-colors"
                  required
                >
                  <option value="" disabled>🚗 Araç seçiniz</option>
                  <option value="">🔄 Tümünü Göster</option>
                  {filteredVehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.license_plate}>
                      🚛 {vehicle.license_plate} - {vehicle.vehicle_type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Şoför *
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.driver_name}
                    onChange={(e) => handleDriverChange(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm hover:border-gray-400 transition-colors"
                    required
                  >
                    <option value="" disabled>👤 Şoför seçiniz</option>
                    <option value="">🔄 Tümünü Göster</option>
                    {filteredDrivers.map(driver => (
                      <option key={driver.id} value={driver.full_name}>
                        👨‍💼 {driver.full_name}
                      </option>
                    ))}
                  </select>
                  {formData.region && (
                    <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center">
                      <MapPin className="w-4 h-4 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-blue-800">
                        {formData.region}
                      </span>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Takip Girişleri */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-600" />
              Takip Girişleri
            </h3>

            {/* Yeni Giriş Formu */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Çıkış Merkezi *
                </label>
                <input
                  type="text"
                  value={formData.departure_center}
                  onChange={handleChange}
                  name="departure_center"
                  placeholder="🏢 Çıkış merkezi girin"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm hover:border-gray-400 transition-colors ${
                    errors.departure_center ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.departure_center && (
                  <p className="text-red-500 text-xs mt-1">{errors.departure_center}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Giriş Saati *
                </label>
                <input
                  type="time"
                  name="entry_time"
                  value={formData.entry_time}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm hover:border-gray-400 transition-colors ${
                    errors.entry_time ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.entry_time && (
                  <p className="text-red-500 text-xs mt-1">{errors.entry_time}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Çıkış Saati {formData.departure_center.toLowerCase().includes('depo') ? '' : '*'}
                </label>
                <input
                  type="time"
                  name="exit_time"
                  value={formData.exit_time}
                  onChange={handleChange}
                  placeholder={formData.departure_center.toLowerCase().includes('depo') ? 'Depo için opsiyonel' : ''}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm hover:border-gray-400 transition-colors ${
                    errors.exit_time ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.exit_time && (
                  <p className="text-red-500 text-xs mt-1">{errors.exit_time}</p>
                )}
                {formData.departure_center.toLowerCase().includes('depo') && (
                  <p className="text-blue-600 text-xs mt-1">
                    💡 Depo için çıkış saati opsiyonel - sevkiyat bitişi için
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  KM Okuma *
                </label>
                <input
                  type="number"
                  name="departure_km"
                  value={formData.departure_km}
                  onChange={handleChange}
                  placeholder="📊 000000"
                  min="0"
                  max="999999"
                  maxLength="6"
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm hover:border-gray-400 transition-colors ${
                    errors.departure_km ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.departure_km && (
                  <p className="text-red-500 text-xs mt-1">{errors.departure_km}</p>
                )}
              </div>


              <div className="flex items-end">
                {editingEntry ? (
                  <button
                    type="button"
                    onClick={updateEntry}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-3 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Güncelle</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={addEntry}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="font-medium">Ekle</span>
                  </button>
                )}
              </div>
            </div>

            {/* Giriş Listesi */}
            {trackingEntries.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Eklenen Girişler ({trackingEntries.length})</h4>
                {trackingEntries.map((entry, index) => (
                  <div key={entry.id} className="flex items-center gap-4 p-3 bg-white border border-gray-200 rounded-lg">
                    <span className="text-sm font-medium text-gray-500 w-8">{index + 1}.</span>
                    <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">{entry.departure_center}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Giriş: {entry.entry_time}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Çıkış: {entry.exit_time}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">KM: {entry.departure_km}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => editEntry(entry)}
                        className="p-1 text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeEntry(entry.id)}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Görsel Yükleme */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-purple-600" />
              Takip Belgeleri
            </h3>
            
            {/* Yükleme Alanı */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📸 Görsel Yükle (Maksimum 5 adet, 5MB'a kadar)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Upload className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Resim dosyalarını seçin veya sürükleyip bırakın
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG, JPEG formatları desteklenir
                    </p>
                  </div>
                </label>
              </div>
              {errors.images && (
                <p className="text-red-500 text-sm mt-2">{errors.images}</p>
              )}
            </div>

            {/* Yüklenen Görseller */}
            {formData.images.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">
                  Yüklenen Görseller ({formData.images.length}/5)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {formData.images.map((image) => (
                    <div key={image.id} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={image.data}
                          alt={image.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(image.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="mt-1">
                        <p className="text-xs text-gray-600 truncate" title={image.name}>
                          {image.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {(image.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notlar */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-green-600" />
              Notlar
            </h3>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              placeholder="📝 Ek notlar ve açıklamalar..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm hover:border-gray-400 transition-colors resize-none"
            />
          </div>

          {/* Hata Mesajı */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-800">{errors.general}</p>
              </div>
            </div>
          )}

          {/* Kaydet Butonu */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none font-medium"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Kaydet</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Depo Onay Modalı */}
        {showDepoConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl transform transition-all">
              <div className="text-center">
                {/* İkon */}
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <MapPin className="w-8 h-8 text-white" />
                </div>
                
                {/* Başlık */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Çıkış Saati Boş
                </h3>
                <p className="text-gray-600 mb-6">
                  Araç park ediyor mu?
                </p>

                {/* Detaylar */}
                {pendingEntry && (
                  <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Çıkış Merkezi:</span>
                        <span className="font-medium text-gray-900">{pendingEntry.departure_center}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Giriş Saati:</span>
                        <span className="font-medium text-gray-900">{pendingEntry.entry_time}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">KM Okuma:</span>
                        <span className="font-medium text-gray-900">{pendingEntry.departure_km}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Açıklama */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    <strong>Tamam</strong> dersen çıkış saati boş olarak kaydedilir (araç park ediyor).<br/>
                    <strong>İptal</strong> dersen çıkış saatini girebilirsin (araç devam ediyor).
                  </p>
                </div>

                {/* Butonlar */}
                <div className="flex gap-3">
                  <button
                    onClick={handleDepoCancel}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleDepoConfirm}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Tamam
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Başarı Modalı */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Başarılı!</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Araç takip verisi başarıyla kaydedildi.
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Tamam
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleTracking;
