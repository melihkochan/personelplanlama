import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Car, 
  Calendar, 
  Fuel, 
  ArrowLeft,
  Check,
  AlertCircle,
  User,
  Clock,
  MapPin,
  FileText,
  Plus,
  Lock
} from 'lucide-react';
import { fuelReceiptService, vehicleService, aktarmaSoforService } from '../../services/supabase';
import { supabase } from '../../services/supabase';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';

const MobileReceiptForm = ({ selectedDriver, vehicleData, onBack, onSuccess, onVehicleAdded }) => {
  const [formData, setFormData] = useState({
    receipt_number: '',
    vehicle_plate: '',
    driver_name: selectedDriver?.full_name || '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    fuel_type: 'MOTORIN SVPD',
    quantity_liters: '',
    unit_price: '',
    total_amount: '',
    vat_amount: '',
    station_name: 'Shell Petrol A.Ş.',
    station_location: 'Gebze/Kocaeli',
    km_reading: '',
    receipt_image: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showNewVehicleModal, setShowNewVehicleModal] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    license_plate: '',
    vehicle_type: 'Kamyon'
  });
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changePasswordData, setChangePasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState('');

  // Dinamik station_location belirleme - boş bırak
  const getStationLocation = (driver) => {
    return ''; // İstasyon konumu boş kalsın
  };

  // Sayfa yüklendiğinde en üste scroll yap
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // selectedDriver değiştiğinde station_location'ı güncelle
  useEffect(() => {
    if (selectedDriver) {
      setFormData(prev => ({
        ...prev,
        driver_name: selectedDriver.full_name || '',
        station_location: getStationLocation(selectedDriver)
      }));
    }
  }, [selectedDriver]);

  const getVatRate = (fuelType) => {
    switch (fuelType) {
      case 'BENZIN SVPD': return 0.20;
      case 'MOTORIN SVPD': return 0.20;
      case 'LPG SVPD': return 0.20;
      default: return 0.20;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // KM girişi için virgül ve nokta karakterlerini temizle
    let processedValue = value;
    if (name === 'km_reading') {
      processedValue = value.replace(/[,.]/g, '');
    }
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));

    // Miktar veya birim fiyat değiştiğinde hesaplamaları yap
    if (name === 'quantity_liters' || name === 'unit_price') {
      const quantity = parseFloat(name === 'quantity_liters' ? value : formData.quantity_liters);
      const unitPrice = parseFloat(name === 'unit_price' ? value : formData.unit_price);

      if (!isNaN(quantity) && !isNaN(unitPrice) && quantity > 0 && unitPrice > 0) {
        const totalWithVat = quantity * unitPrice;
        const vatRate = getVatRate(formData.fuel_type);
        const vatAmount = (totalWithVat / (1 + vatRate)) * vatRate;

        setFormData(prev => ({
          ...prev,
          total_amount: totalWithVat.toFixed(2),
          vat_amount: vatAmount.toFixed(2)
        }));
      } else {
        setFormData(prev => ({ ...prev, total_amount: '', vat_amount: '' }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.receipt_number) newErrors.receipt_number = 'Fiş numarası gerekli';
    if (!formData.vehicle_plate) newErrors.vehicle_plate = 'Araç plakası gerekli';
    if (!formData.driver_name) newErrors.driver_name = 'Şoför adı gerekli';
    if (!formData.date) newErrors.date = 'Tarih gerekli';
    if (!formData.time) newErrors.time = 'Saat gerekli';
    if (!formData.fuel_type) newErrors.fuel_type = 'Yakıt türü gerekli';
    if (!formData.quantity_liters || parseFloat(formData.quantity_liters) <= 0) {
      newErrors.quantity_liters = 'Miktar 0\'dan büyük olmalı';
    }
    if (!formData.unit_price || parseFloat(formData.unit_price) <= 0) {
      newErrors.unit_price = 'Birim fiyat 0\'dan büyük olmalı';
    }
    if (!formData.total_amount || parseFloat(formData.total_amount) <= 0) {
      newErrors.total_amount = 'Toplam tutar 0\'dan büyük olmalı';
    }
    if (formData.km_reading && (parseInt(formData.km_reading) < 0 || parseInt(formData.km_reading) > 9999999)) {
      newErrors.km_reading = 'KM okuma 0-9999999 arasında olmalı';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      receipt_number: '',
      vehicle_plate: '',
      driver_name: selectedDriver?.full_name || '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      fuel_type: 'MOTORIN SVPD',
      quantity_liters: '',
      unit_price: '',
      total_amount: '',
      vat_amount: '',
      station_name: 'Shell Petrol A.Ş.',
      station_location: 'Gebze/Kocaeli',
      km_reading: '',
      receipt_image: '',
      notes: ''
    });
    setErrors({});
  };

  const handleAddNewVehicle = async () => {
    if (!newVehicle.license_plate || !newVehicle.vehicle_type) {
      alert('Lütfen plaka ve araç tipini girin!');
      return;
    }

    setLoading(true);
    try {
      console.log('Yeni araç ekleniyor:', newVehicle);
      const result = await vehicleService.createVehicle(newVehicle);
      console.log('Araç ekleme sonucu:', result);
      
      if (result.success) {
        alert('Araç başarıyla eklendi!');
        
        // Yeni aracı formda seç
        setFormData(prev => ({ ...prev, vehicle_plate: result.data.license_plate }));
        
        // Parent component'e yeni aracı bildir (listeyi güncelle)
        if (onVehicleAdded) {
          console.log('Parent component\'e araç gönderiliyor:', result.data);
          onVehicleAdded(result.data);
        } else {
          console.log('onVehicleAdded callback yok!');
        }
        
        setShowNewVehicleModal(false);
        setNewVehicle({ license_plate: '', vehicle_type: 'Kamyon' });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Araç ekleme hatası:', error);
      alert('Araç eklenirken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePasswordLoading(true);
    setChangePasswordError('');

    if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
      setChangePasswordError('Yeni şifreler eşleşmiyor!');
      setChangePasswordLoading(false);
      return;
    }

    if (changePasswordData.newPassword.length < 4) {
      setChangePasswordError('Yeni şifre en az 4 karakter olmalıdır!');
      setChangePasswordLoading(false);
      return;
    }

    try {
      const verifyResult = await aktarmaSoforService.loginDriver(
        selectedDriver.username, 
        changePasswordData.currentPassword
      );

      if (!verifyResult.success) {
        setChangePasswordError('Mevcut şifre hatalı!');
        setChangePasswordLoading(false);
        return;
      }

      const { error } = await supabase
        .from('aktarma_soforleri')
        .update({ sifre: changePasswordData.newPassword })
        .eq('id', selectedDriver.id);

      if (error) {
        throw error;
      }

      alert('Şifre başarıyla değiştirildi!');
      setShowChangePasswordModal(false);
      setChangePasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // Ana menüye dön (giriş ekranına)
      onBack();
    } catch (error) {
      console.error('Şifre değiştirme hatası:', error);
      setChangePasswordError('Şifre değiştirilirken hata oluştu: ' + error.message);
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const takePhoto = async () => {
    try {
      const photo = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        direction: 'rear'
      });
      setFormData(prev => ({ ...prev, receipt_image: photo.dataUrl }));
    } catch (error) {
      console.error('Fotoğraf çekme hatası:', error);
      alert('Fotoğraf çekilemedi: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      alert('Lütfen tüm gerekli alanları doldurun ve hataları düzeltin.');
      return;
    }

    setLoading(true);
    try {
      const receiptData = {
        ...formData,
        created_by: null, // Mobil uygulama için NULL yapıyoruz
        quantity_liters: parseFloat(formData.quantity_liters),
        unit_price: parseFloat(formData.unit_price),
        total_amount: parseFloat(formData.total_amount),
        vat_amount: formData.vat_amount ? parseFloat(formData.vat_amount) : null,
        km_reading: formData.km_reading ? parseInt(formData.km_reading) : null
      };

      const result = await fuelReceiptService.createReceipt(receiptData);
      if (result.success) {
        alert('✅ Fiş başarıyla kaydedildi!');
        resetForm();
        // 1 saniye bekle sonra geri dön
        setTimeout(() => {
          onSuccess('Fiş başarıyla kaydedildi!');
        }, 1000);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Fiş kaydetme hatası:', error);
      alert('Fiş kaydedilirken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const sortedVehicles = [...vehicleData].sort((a, b) => a.license_plate.localeCompare(b.license_plate, 'tr'));
  
  // Debug: Araç listesini konsola yazdır
  React.useEffect(() => {
    console.log('MobileReceiptForm: Araç verileri güncellendi:', vehicleData);
    console.log('Sıralanmış araç listesi:', sortedVehicles);
  }, [vehicleData, sortedVehicles]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 pt-safe-top pb-4 px-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center text-blue-600 hover:text-blue-800 py-2"
          >
            <ArrowLeft className="w-6 h-6 mr-2" />
            <span className="font-medium">Geri</span>
          </button>
          <h1 className="text-lg font-bold text-gray-900">Yeni Fiş</h1>
          {selectedDriver?.username && (
            <button
              onClick={() => setShowChangePasswordModal(true)}
              className="flex items-center px-3 py-2 text-blue-600 hover:text-blue-800 transition-colors"
            >
              <Lock className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">Şifre</span>
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center text-sm text-gray-600">
          <User className="w-4 h-4 mr-2" />
          <span>{selectedDriver?.full_name}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Araç ve KM Bilgileri */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Car className="w-5 h-5 mr-2 text-blue-600" />
            Araç ve KM Bilgileri
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">KM Okuma</label>
              <div className="relative">
                <input
                  type="tel"
                  name="km_reading"
                  value={formData.km_reading}
                  onChange={handleChange}
                  className={`w-full px-4 py-4 text-center text-2xl font-bold tracking-wider border-2 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all duration-200 ${errors.km_reading ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
                  placeholder="000000"
                  maxLength="7"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <span className="text-sm font-medium text-gray-500">KM</span>
                </div>
              </div>
              {errors.km_reading && <p className="text-red-500 text-xs mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.km_reading}</p>}
              <p className="text-xs text-gray-500 mt-2 text-center">💡 Sadece rakam girin, virgül ve nokta kullanmayın</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Araç Plakası *</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <select
                    name="vehicle_plate"
                    value={formData.vehicle_plate}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white shadow-sm ${errors.vehicle_plate ? 'border-red-500' : 'border-gray-300'}`}
                    style={{ 
                      fontSize: '16px', 
                      WebkitAppearance: 'none', 
                      appearance: 'none',
                      backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', 
                      backgroundPosition: 'right 0.75rem center', 
                      backgroundRepeat: 'no-repeat', 
                      backgroundSize: '1.25em 1.25em', 
                      paddingRight: '2.5rem'
                    }}
                  >
                    <option value="" disabled>Araç Seçin</option>
                    {sortedVehicles.map((vehicle, index) => (
                      <option key={index} value={vehicle.license_plate}>
                        {vehicle.license_plate} - {vehicle.vehicle_type}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewVehicleModal(true)}
                  className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 active:scale-95 transition-all shadow-md"
                  title="Yeni Araç Ekle"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {errors.vehicle_plate && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.vehicle_plate}</p>}
            </div>
          </div>
        </div>

        {/* Yakıt Bilgileri */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Fuel className="w-5 h-5 mr-2 text-orange-600" />
            Yakıt Bilgileri
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fiş Numarası *</label>
              <input
                type="tel"
                name="receipt_number"
                value={formData.receipt_number}
                onChange={handleChange}
                className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.receipt_number ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="123456789"
                inputMode="numeric"
                pattern="[0-9]*"
              />
              {errors.receipt_number && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.receipt_number}</p>}
              <p className="text-xs text-gray-500 mt-1">💡 Sadece rakam girin</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tarih *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.date ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.date && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.date}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Saat *</label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.time ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.time && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.time}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Yakıt Türü *</label>
              <div className="relative">
                <select
                  name="fuel_type"
                  value={formData.fuel_type}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-white shadow-sm ${errors.fuel_type ? 'border-red-500' : 'border-gray-300'}`}
                  style={{ 
                    fontSize: '16px', 
                    WebkitAppearance: 'none', 
                    appearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', 
                    backgroundPosition: 'right 0.75rem center', 
                    backgroundRepeat: 'no-repeat', 
                    backgroundSize: '1.25em 1.25em', 
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="MOTORIN SVPD">⛽ Motorin SVPD</option>
                  <option value="BENZIN SVPD">⛽ Benzin</option>
                  <option value="LPG SVPD">🔥 LPG </option>
                </select>
              </div>
              {errors.fuel_type && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.fuel_type}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Miktar (Litre) *</label>
              <input
                type="number"
                name="quantity_liters"
                step="0.01"
                min="0"
                value={formData.quantity_liters}
                onChange={handleChange}
                className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.quantity_liters ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="örn: 50.25"
              />
              {errors.quantity_liters && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.quantity_liters}</p>}
              <p className="text-xs text-gray-500 mt-1">💡 Virgül veya nokta koyunuz</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Birim Fiyat (₺) *</label>
              <input
                type="number"
                name="unit_price"
                step="0.01"
                min="0"
                value={formData.unit_price}
                onChange={handleChange}
                className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.unit_price ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="örn: 45.75"
              />
              {errors.unit_price && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.unit_price}</p>}
              <p className="text-xs text-gray-500 mt-1">💡 Virgül veya nokta koyunuz</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">KDV (₺)</label>
                <input
                  type="text"
                  name="vat_amount"
                  value={formData.vat_amount}
                  readOnly
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Toplam Tutar (₺) *</label>
                <input
                  type="text"
                  name="total_amount"
                  value={formData.total_amount}
                  readOnly
                  className={`w-full px-3 py-3 border rounded-lg bg-blue-50 text-blue-800 font-semibold ${errors.total_amount ? 'border-red-500' : 'border-blue-300'}`}
                />
                {errors.total_amount && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.total_amount}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* İstasyon Bilgileri */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-purple-600" />
            İstasyon Bilgileri
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">İstasyon Adı</label>
              <input
                type="text"
                name="station_name"
                value={formData.station_name}
                readOnly
                className="w-full px-3 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">İstasyon Konumu</label>
              <input
                type="text"
                name="station_location"
                value={formData.station_location}
                onChange={handleChange}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="örn: Gebze/Kocaeli"
              />
            </div>
          </div>
        </div>

        {/* Açıklama / Notlar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-yellow-600" />
            Açıklama / Notlar
          </h2>
          
          <div>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Ek bilgi veya notlar buraya yazılabilir (opsiyonel)"
            />
          </div>
        </div>

        {/* Fiş Görseli */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Camera className="w-5 h-5 mr-2 text-green-600" />
            Fiş Görseli
          </h2>
          
          <div className="space-y-3">
            <div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                {formData.receipt_image ? (
                  <div className="space-y-2">
                    <img
                      src={formData.receipt_image}
                      alt="Fiş görseli"
                      className="max-h-48 mx-auto rounded-lg border border-gray-200"
                    />
                    <p className="text-sm text-green-600">Görsel yüklendi</p>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, receipt_image: '' }))}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Kaldır
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Camera className="w-12 h-12 text-gray-400 mx-auto" />
                    <p className="text-gray-600">Fiş fotoğrafını çekmek için tıklayın</p>
                    <button
                      type="button"
                      onClick={takePhoto}
                      className="mt-3 px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors text-lg font-semibold"
                    >
                      <Camera className="w-6 h-6 inline-block mr-2" /> Fotoğraf Çek
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Kaydet Butonu */}
        <div className="pb-6">
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-green-700 transition-colors text-xl font-bold"
            disabled={loading}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            ) : (
              <Check className="w-6 h-6" />
            )}
            Fişi Kaydet
          </button>
        </div>

        {/* Developer Credit */}
        <div className="text-center pb-6">
          <div className="border-t border-gray-200 pt-4">
            <p className="text-xs text-gray-400">
              Developed by{' '}
              <a 
                href="https://www.melihkochan.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 font-medium underline"
              >
                Melih KOÇHAN
              </a>
            </p>
          </div>
        </div>
      </form>

      {/* Yeni Araç Ekle Modal */}
      {showNewVehicleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center justify-between">
              Yeni Araç Ekle
              <button 
                onClick={() => setShowNewVehicleModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plaka *</label>
                <input
                  type="text"
                  value={newVehicle.license_plate}
                  onChange={(e) => setNewVehicle(prev => ({ ...prev, license_plate: e.target.value.toUpperCase() }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-base shadow-sm uppercase font-semibold tracking-wider"
                  placeholder="34 ABC 123"
                  style={{ fontSize: '16px' }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Araç Tipi *</label>
                <div className="relative">
                  <select
                    value={newVehicle.vehicle_type}
                    onChange={(e) => setNewVehicle(prev => ({ ...prev, vehicle_type: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-base bg-white shadow-sm"
                    style={{ 
                      fontSize: '16px', 
                      WebkitAppearance: 'none', 
                      appearance: 'none',
                      backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', 
                      backgroundPosition: 'right 0.75rem center', 
                      backgroundRepeat: 'no-repeat', 
                      backgroundSize: '1.25em 1.25em', 
                      paddingRight: '2.5rem'
                    }}
                  >
                    <option value="Kamyon">🚛 Kamyon</option>
                    <option value="Kamyonet">🚚 Kamyonet</option>
                    <option value="Panelvan">🚐 Panelvan</option>
                    <option value="Otomobil">🚗 Otomobil</option>
                  </select>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Not: Şoför ataması yetkili tarafından yapılacaktır.</span>
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowNewVehicleModal(false)}
                className="flex-1 px-5 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-95 transition-all font-medium shadow-sm"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleAddNewVehicle}
                className="flex-1 px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 active:scale-95 transition-all font-medium shadow-md"
                disabled={loading}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
                ) : (
                  '✓ Ekle'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Şifre Değiştirme Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Lock className="w-5 h-5 mr-2 text-blue-600" />
                Şifre Değiştir
              </h2>
              
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mevcut Şifre
                  </label>
                  <input
                    type="password"
                    value={changePasswordData.currentPassword}
                    onChange={(e) => setChangePasswordData({...changePasswordData, currentPassword: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Mevcut şifrenizi girin"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yeni Şifre
                  </label>
                  <input
                    type="password"
                    value={changePasswordData.newPassword}
                    onChange={(e) => setChangePasswordData({...changePasswordData, newPassword: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Yeni şifrenizi girin"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yeni Şifre (Tekrar)
                  </label>
                  <input
                    type="password"
                    value={changePasswordData.confirmPassword}
                    onChange={(e) => setChangePasswordData({...changePasswordData, confirmPassword: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Yeni şifrenizi tekrar girin"
                    required
                  />
                </div>

                {changePasswordError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm">{changePasswordError}</p>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowChangePasswordModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={changePasswordLoading}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {changePasswordLoading ? 'Değiştiriliyor...' : 'Değiştir'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileReceiptForm;