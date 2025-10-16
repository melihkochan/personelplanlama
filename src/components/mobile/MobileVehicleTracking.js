import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  Car, 
  User, 
  MapPin, 
  Clock, 
  Camera,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { vehicleTrackingService, transferVehicleService, vehicleService, aktarmaSoforService } from '../../services/supabase';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';

const MobileVehicleTracking = ({ selectedDriver, onBack }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vehicle_plate: '',
    driver_name: selectedDriver?.full_name || '',
    region: selectedDriver?.region || '',
    notes: '',
    images: []
  });

  const [trackingEntries, setTrackingEntries] = useState([]);
  const [editingEntry, setEditingEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [showDepoConfirmModal, setShowDepoConfirmModal] = useState(false);
  const [pendingEntry, setPendingEntry] = useState(null);
  const [imagePreview, setImagePreview] = useState([]);

  // Form alanları
  const [entryFormData, setEntryFormData] = useState({
    departure_center: '',
    entry_time: '',
    exit_time: '',
    departure_km: ''
  });

  // Veri yükleme
  useEffect(() => {
    loadVehicles();
  }, [selectedDriver]);

  const loadVehicles = async () => {
    try {
      // Aktarma araçları ve normal araçları birleştir
      const [transferResult, normalResult] = await Promise.all([
        transferVehicleService.getAllTransferVehicles(),
        vehicleService.getAllVehicles()
      ]);

      const allVehicles = [
        ...(transferResult.data || []),
        ...(normalResult.data || [])
      ];

      // Admin kullanıcısı için bütün araçları göster, diğerleri için bölgeye göre filtrele
      const filteredVehicles = (selectedDriver?.username === 'admin' || selectedDriver?.full_name === 'admin')
        ? allVehicles // Admin için bütün araçlar
        : selectedDriver?.region 
          ? allVehicles.filter(vehicle => vehicle.region === selectedDriver.region)
          : allVehicles;

      // Duplicate'leri kaldır
      const uniqueVehicles = filteredVehicles.filter((vehicle, index, self) => 
        index === self.findIndex(v => v.license_plate === vehicle.license_plate)
      );

      setVehicles(uniqueVehicles);
      console.log('Araç takip - Yüklenen araç sayısı:', uniqueVehicles.length);
    } catch (error) {
      console.error('Araç yükleme hatası:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Araç plakası değiştiğinde bölgeyi otomatik doldur
    if (name === 'vehicle_plate' && value) {
      const selectedVehicle = vehicles.find(vehicle => 
        (vehicle.license_plate || vehicle.plate) === value
      );
      if (selectedVehicle && selectedVehicle.region) {
        setFormData(prev => ({
          ...prev,
          region: selectedVehicle.region
        }));
      }
    }

    // Hataları temizle
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleEntryChange = (e) => {
    const { name, value } = e.target;
    setEntryFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Hataları temizle
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const addEntry = () => {
    if (!entryFormData.departure_center || !entryFormData.entry_time || !entryFormData.departure_km) {
      setErrors({
        departure_center: !entryFormData.departure_center ? 'Çıkış merkezi gerekli' : '',
        entry_time: !entryFormData.entry_time ? 'Giriş saati gerekli' : '',
        departure_km: !entryFormData.departure_km ? 'KM okuma gerekli' : ''
      });
      return;
    }

    // Çıkış saati boş ise genel uyarı ver (park ediyorlar)
    if (!entryFormData.exit_time) {
      setPendingEntry({
        departure_center: entryFormData.departure_center,
        entry_time: entryFormData.entry_time,
        exit_time: entryFormData.exit_time,
        departure_km: entryFormData.departure_km,
        entry_notes: entryFormData.entry_notes
      });
      setShowDepoConfirmModal(true);
      return;
    }

    const newEntry = {
      id: Date.now(),
      departure_center: entryFormData.departure_center,
      entry_time: entryFormData.entry_time,
      exit_time: entryFormData.exit_time,
      departure_km: parseInt(entryFormData.departure_km)
    };

    setTrackingEntries(prev => [...prev, newEntry]);
    
    // Form alanlarını temizle
    setEntryFormData({
      departure_center: '',
      entry_time: '',
      exit_time: '',
      departure_km: ''
    });

    setErrors({});
  };

  const removeEntry = (entryId) => {
    setTrackingEntries(prev => prev.filter(entry => entry.id !== entryId));
  };

  const editEntry = (entry) => {
    setEditingEntry(entry);
    setEntryFormData({
      departure_center: entry.departure_center,
      entry_time: entry.entry_time,
      exit_time: entry.exit_time,
      departure_km: entry.departure_km.toString()
    });
  };

  const updateEntry = () => {
    if (!entryFormData.departure_center || !entryFormData.entry_time || !entryFormData.departure_km) {
      setErrors({
        departure_center: !entryFormData.departure_center ? 'Çıkış merkezi gerekli' : '',
        entry_time: !entryFormData.entry_time ? 'Giriş saati gerekli' : '',
        departure_km: !entryFormData.departure_km ? 'KM okuma gerekli' : ''
      });
      return;
    }

    const updatedEntry = {
      ...editingEntry,
      departure_center: entryFormData.departure_center,
      entry_time: entryFormData.entry_time,
      exit_time: entryFormData.exit_time,
      departure_km: parseInt(entryFormData.departure_km)
    };

    setTrackingEntries(prev => prev.map(entry => 
      entry.id === editingEntry.id ? updatedEntry : entry
    ));

    setEditingEntry(null);
    setEntryFormData({
      departure_center: '',
      entry_time: '',
      exit_time: '',
      departure_km: '',
      entry_notes: ''
    });
    setErrors({});
  };

  const cancelEdit = () => {
    setEditingEntry(null);
    setEntryFormData({
      departure_center: '',
      entry_time: '',
      exit_time: '',
      departure_km: ''
    });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.vehicle_plate || !formData.driver_name || trackingEntries.length === 0) {
      setErrors({
        vehicle_plate: !formData.vehicle_plate ? 'Araç plakası gerekli' : '',
        driver_name: !formData.driver_name ? 'Şoför adı gerekli' : '',
        general: trackingEntries.length === 0 ? 'En az bir takip girişi gerekli' : ''
      });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const result = await vehicleTrackingService.saveTrackingWithEntries(
        {
          date: formData.date,
          vehicle_plate: formData.vehicle_plate,
          driver_name: formData.driver_name,
          region: formData.region,
          notes: formData.notes,
          images: formData.images,
          created_by: selectedDriver?.full_name || 'mobile_user'
        },
        trackingEntries
      );

      if (result.success) {
        alert('Araç takip kaydı başarıyla oluşturuldu!');
        
        // Formu temizle
        setFormData({
          date: new Date().toISOString().split('T')[0],
          vehicle_plate: '',
          driver_name: selectedDriver?.full_name || '',
          region: selectedDriver?.region || '',
          notes: '',
          images: []
        });
        setTrackingEntries([]);
        setImagePreview([]);
        setEntryFormData({
          departure_center: '',
          entry_time: '',
          exit_time: '',
          departure_km: ''
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Araç takip kaydetme hatası:', error);
      setErrors({ general: `Kaydetme sırasında hata oluştu: ${error.message}` });
    } finally {
      setLoading(false);
    }
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
      setEntryFormData({
        departure_center: '',
        entry_time: '',
        exit_time: '',
        departure_km: '',
        entry_notes: ''
      });

      setErrors({});
    }
    
    setShowDepoConfirmModal(false);
    setPendingEntry(null);
  };

  const handleDepoCancel = () => {
    setShowDepoConfirmModal(false);
    setPendingEntry(null);
  };

  // Görsel yükleme fonksiyonları
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    // Maksimum 5 görsel kontrolü
    if (formData.images.length + files.length > 5) {
      alert('Maksimum 5 görsel yükleyebilirsiniz!');
      return;
    }
    
    files.forEach(file => {
      // Dosya tipi kontrolü
      if (!file.type.startsWith('image/')) {
        alert('Sadece resim dosyaları yükleyebilirsiniz!');
        return;
      }
      
      // Dosya boyutu kontrolü (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Dosya boyutu 5MB\'dan küçük olmalıdır!');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result;
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, base64]
        }));
        setImagePreview(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Kamera ile fotoğraf çekme
  const takePhoto = async () => {
    try {
      // Maksimum 5 görsel kontrolü
      if (formData.images.length >= 5) {
        alert('Maksimum 5 görsel yükleyebilirsiniz!');
        return;
      }

      const image = await CapacitorCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });

      if (image.dataUrl) {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, image.dataUrl]
        }));
        setImagePreview(prev => [...prev, image.dataUrl]);
      }
    } catch (error) {
      console.error('Kamera hatası:', error);
      alert('Kamera açılırken hata oluştu!');
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    setImagePreview(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 pt-6 pb-4 px-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-red-50 transition-colors group"
          >
            <div className="flex items-center space-x-1">
              <ArrowLeft className="w-5 h-5 text-red-600 group-hover:text-red-700" />
              <span className="text-red-600 text-sm font-medium group-hover:text-red-700">Çıkış</span>
            </div>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Araç Takip</h1>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Şoför Bilgi Kartı */}
      <div className="px-4 py-4">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">
                  {selectedDriver?.full_name || 'Şoför'}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <MapPin className="w-4 h-4 text-blue-200" />
                  <span className="text-blue-200 text-sm">
                    {selectedDriver?.region || 'Bölge'}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-white/20 rounded-lg px-3 py-2">
                <p className="text-white text-xs font-medium">Sicil No</p>
                <p className="text-white font-bold">
                  {selectedDriver?.registration_number || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Temel Bilgiler */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-600" />
            Temel Bilgiler
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tarih *</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Araç Plakası * 
                {(selectedDriver?.username === 'admin' || selectedDriver?.full_name === 'admin') && (
                  <span className="text-xs text-blue-600 ml-2">(Admin - Tüm Araçlar)</span>
                )}
              </label>
              <select
                name="vehicle_plate"
                value={formData.vehicle_plate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Araç seçiniz</option>
                {vehicles
                  .sort((a, b) => (a.license_plate || a.plate).localeCompare(b.license_plate || b.plate, 'tr'))
                  .map(vehicle => (
                  <option key={vehicle.id} value={vehicle.license_plate || vehicle.plate}>
                    {vehicle.license_plate || vehicle.plate} 
                    {vehicle.region && ` - ${vehicle.region}`}
                    {vehicle.vehicle_type && ` (${vehicle.vehicle_type})`}
                  </option>
                ))}
              </select>
              {errors.vehicle_plate && (
                <p className="text-red-500 text-xs mt-1">{errors.vehicle_plate}</p>
              )}
            </div>


            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ek notlar..."
              />
            </div>

          </div>
        </div>

        {/* Takip Girişi Formu */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-600" />
            Takip Girişi Ekle
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Çıkış Merkezi *</label>
              <input
                type="text"
                name="departure_center"
                value={entryFormData.departure_center}
                onChange={handleEntryChange}
                placeholder="Gidilen yer adı..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              {errors.departure_center && (
                <p className="text-red-500 text-xs mt-1">{errors.departure_center}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giriş Saati *</label>
                <div className="relative">
                  <input
                    type="time"
                    name="entry_time"
                    value={entryFormData.entry_time}
                    onChange={handleEntryChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    style={{ fontSize: '16px' }} // iOS'ta zoom'u önler
                    required
                  />
                  <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {errors.entry_time && (
                  <p className="text-red-500 text-xs mt-1">{errors.entry_time}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Çıkış Saati</label>
                <div className="relative">
                  <input
                    type="time"
                    name="exit_time"
                    value={entryFormData.exit_time}
                    onChange={handleEntryChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    style={{ fontSize: '16px' }} // iOS'ta zoom'u önler
                  />
                  <Clock className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">KM Okuma *</label>
              <input
                type="text"
                name="departure_km"
                value={entryFormData.departure_km}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, ''); // Sadece sayı
                  if (value.length <= 6) {
                    setEntryFormData(prev => ({
                      ...prev,
                      departure_km: value
                    }));
                  }
                }}
                placeholder="000000"
                maxLength="6"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              {errors.departure_km && (
                <p className="text-red-500 text-xs mt-1">{errors.departure_km}</p>
              )}
            </div>


            <div className="flex gap-2">
              {editingEntry ? (
                <>
                  <button
                    type="button"
                    onClick={updateEntry}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Güncelle
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    İptal
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={addEntry}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Ekle
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Eklenen Girişler */}
        {trackingEntries.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              Eklenen Girişler ({trackingEntries.length})
            </h2>
            
            <div className="space-y-3">
              {trackingEntries.map((entry, index) => (
                <div key={entry.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                      </div>
                      <span className="font-medium text-gray-900">{entry.departure_center}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => editEntry(entry)}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeEntry(entry.id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Giriş:</span>
                      <div className="font-medium">{entry.entry_time}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Çıkış:</span>
                      <div className="font-medium">{entry.exit_time || '-'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">KM:</span>
                      <div className="font-medium">{entry.departure_km.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Görsel Yükleme */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Camera className="w-5 h-5 text-orange-600" />
            Takip Belgeleri
          </h2>
          
          <div className="space-y-3">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Camera className="w-8 h-8 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Galeriden seç
                </span>
                <span className="text-xs text-gray-500">
                  Maksimum 5 görsel, 5MB'a kadar
                </span>
              </label>
            </div>
            
            <button
              type="button"
              onClick={takePhoto}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Camera className="w-5 h-5" />
              <span>Kamera ile Çek</span>
            </button>
          </div>
          
          {/* Görsel Önizlemeleri */}
          {imagePreview.length > 0 && (
            <div className="mt-3">
              <div className="grid grid-cols-2 gap-2">
                {imagePreview.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={image}
                      alt={`Takip belgesi ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Kaydet Butonu */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-red-600 text-sm">{errors.general}</p>
              </div>
            </div>
          )}
          
          <button
            onClick={handleSubmit}
            disabled={loading || trackingEntries.length === 0}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Kaydediliyor...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Takip Kaydını Kaydet
              </>
            )}
          </button>
        </div>
      </div>

      {/* Depo Onay Modal */}
      {showDepoConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Çıkış Saati Boş
              </h3>
              <p className="text-gray-600 mb-4">
                Araç park ediyor mu?
              </p>
              
              {pendingEntry && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4 text-left">
                  <div className="space-y-1 text-sm">
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
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Tamam</strong> dersen çıkış saati boş olarak kaydedilir (araç park ediyor).<br/>
                  <strong>İptal</strong> dersen çıkış saatini girebilirsin (araç devam ediyor).
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleDepoCancel}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
                >
                  İptal
                </button>
                <button
                  onClick={handleDepoConfirm}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Tamam
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileVehicleTracking;
