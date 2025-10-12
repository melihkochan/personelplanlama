import React, { useState, useEffect } from 'react';
import { 
  Save, 
  X, 
  Car, 
  User, 
  Calendar, 
  Clock, 
  Fuel, 
  DollarSign, 
  MapPin, 
  Calculator,
  AlertCircle,
  CheckCircle,
  Camera,
  Plus
} from 'lucide-react';
import { fuelReceiptService, vehicleService } from '../../services/supabase';

const FuelReceiptForm = ({ vehicleData = [], personnelData = [], currentUser, onSave, onCancel, onVehicleAdded }) => {
  const [formData, setFormData] = useState({
    receipt_number: '',
    vehicle_plate: '',
    driver_name: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    fuel_type: '',
    quantity_liters: '',
    unit_price: '',
    total_amount: '',
    vat_amount: '',
    station_name: 'Shell Petrol A.Ş.',
    station_location: '',
    km_reading: '',
    receipt_image: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showNewVehicleModal, setShowNewVehicleModal] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    license_plate: '',
    vehicle_type: 'Kamyon'
  });

  // Personnel tablosundan şoförleri çek
  const getDriversFromPersonnel = () => {
    return personnelData.filter(person => 
      person.position && person.position.toUpperCase() === 'ŞOFÖR'
    );
  };

  const drivers = getDriversFromPersonnel();

  // KDV oranları
  const getVatRate = (fuelType) => {
    const vatRates = {
      'MOTORIN SVPD': 0.20, // %20
      'BENZIN': 0.20,       // %20
      'LPG': 0.08,          // %8
      'ELEKTRIK': 0.20      // %20
    };
    return vatRates[fuelType] || 0.20; // Varsayılan %20
  };

  // Otomatik hesaplama
  useEffect(() => {
    if (formData.quantity_liters && formData.unit_price && formData.fuel_type) {
      const quantity = parseFloat(formData.quantity_liters);
      const unitPrice = parseFloat(formData.unit_price);
      const vatRate = getVatRate(formData.fuel_type);
      
      if (!isNaN(quantity) && !isNaN(unitPrice)) {
        // Birim fiyat KDV dahil, toplam tutar hesapla
        const totalWithVat = quantity * unitPrice;
        // KDV dahil tutardan KDV'yi hesapla: total / (1 + vatRate) * vatRate
        const vat = (totalWithVat / (1 + vatRate)) * vatRate;
        
        setFormData(prev => ({
          ...prev,
          total_amount: totalWithVat.toFixed(2),
          vat_amount: vat.toFixed(2)
        }));
      }
    }
  }, [formData.quantity_liters, formData.unit_price, formData.fuel_type]);

  // Validasyon
  const validateForm = () => {
    const newErrors = {};

    if (!formData.receipt_number) newErrors.receipt_number = 'Fiş numarası gerekli';
    if (!formData.vehicle_plate) newErrors.vehicle_plate = 'Araç plakası gerekli';
    if (!formData.driver_name) newErrors.driver_name = 'Şoför adı gerekli';
    if (!formData.date) newErrors.date = 'Tarih gerekli';
    if (!formData.time) newErrors.time = 'Saat gerekli';
    if (!formData.fuel_type) newErrors.fuel_type = 'Yakıt türü gerekli';
    if (!formData.quantity_liters) newErrors.quantity_liters = 'Miktar gerekli';
    if (!formData.unit_price) newErrors.unit_price = 'Birim fiyat gerekli';
    if (!formData.station_name) newErrors.station_name = 'İstasyon adı gerekli';
    if (!formData.station_location) newErrors.station_location = 'İstasyon konumu gerekli';

    // Sayısal validasyonlar
    if (formData.quantity_liters && (parseFloat(formData.quantity_liters) <= 0 || parseFloat(formData.quantity_liters) > 1000)) {
      newErrors.quantity_liters = 'Miktar 0-1000 litre arasında olmalı';
    }
    
    if (formData.unit_price && (parseFloat(formData.unit_price) <= 0 || parseFloat(formData.unit_price) > 100)) {
      newErrors.unit_price = 'Birim fiyat 0-100 TL arasında olmalı';
    }

    if (formData.km_reading && (parseInt(formData.km_reading) < 0 || parseInt(formData.km_reading) > 999999)) {
      newErrors.km_reading = 'KM okuma 0-999999 arasında olmalı';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form gönderme
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Veritabanına kaydet - ID'yi kaldır ki veritabanı otomatik oluştursun
      const receiptData = {
        ...formData,
        created_by: currentUser?.id || null,
        // Sayısal değerleri dönüştür
        quantity_liters: parseFloat(formData.quantity_liters),
        unit_price: parseFloat(formData.unit_price),
        total_amount: parseFloat(formData.total_amount),
        vat_amount: formData.vat_amount ? parseFloat(formData.vat_amount) : null,
        km_reading: formData.km_reading ? parseInt(formData.km_reading) : null
      };
      
      // ID'yi kaldır (varsa) - veritabanı otomatik oluştursun
      delete receiptData.id;

      const result = await fuelReceiptService.createReceipt(receiptData);
      
      if (result.success) {
        // Modern başarı modalını göster
        setShowSuccessModal(true);
        
        if (onSave) {
          onSave(result.data);
        }
        
        resetForm();
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

  // Form sıfırlama
  const resetForm = () => {
    setFormData({
      receipt_number: '',
      vehicle_plate: '',
      driver_name: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      fuel_type: '',
      quantity_liters: '',
      unit_price: '',
      total_amount: '',
      vat_amount: '',
      station_name: 'Shell Petrol A.Ş.',
      station_location: '',
      km_reading: '',
      receipt_image: '',
      notes: ''
    });
    setErrors({});
  };

  // Yeni araç ekleme
  const handleAddNewVehicle = async () => {
    if (!newVehicle.license_plate || !newVehicle.vehicle_type) {
      alert('Lütfen plaka ve araç tipini girin!');
      return;
    }

    setLoading(true);
    try {
      const result = await vehicleService.createVehicle(newVehicle);
      
      if (result.success) {
        alert('Araç başarıyla eklendi!');
        
        // Form'da yeni eklenen aracı seç
        setFormData(prev => ({
          ...prev,
          vehicle_plate: result.data.license_plate
        }));
        
        // Parent component'e bildir (araç listesini yenile)
        if (onVehicleAdded) {
          onVehicleAdded(result.data);
        }
        
        // Modal'ı kapat ve formu temizle
        setNewVehicle({
          license_plate: '',
          vehicle_type: 'Kamyon'
        });
        setShowNewVehicleModal(false);
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

  return (
    <div className="bg-white rounded-xl p-8 shadow-lg">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Fuel className="w-5 h-5 text-white" />
          </div>
          Yeni Yakıt Fişi
        </h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Temel Bilgiler */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Temel Bilgiler
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fiş Numarası *
              </label>
              <input
                type="text"
                value={formData.receipt_number}
                onChange={(e) => setFormData(prev => ({ ...prev, receipt_number: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.receipt_number ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0092"
              />
              {errors.receipt_number && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.receipt_number}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tarih *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.date && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.date}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Saat *
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.time ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.time && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.time}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Araç ve Şoför Bilgileri */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Car className="w-5 h-5 text-green-600" />
            Araç ve Şoför Bilgileri
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Araç KM
              </label>
              <input
                type="number"
                min="0"
                max="999999"
                value={formData.km_reading}
                onChange={(e) => setFormData(prev => ({ ...prev, km_reading: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.km_reading ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="125000"
              />
              {errors.km_reading && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.km_reading}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Araç Plakası *
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.vehicle_plate}
                  onChange={(e) => setFormData(prev => ({ ...prev, vehicle_plate: e.target.value }))}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.vehicle_plate ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="" disabled>Araç Seçin</option>
                  {vehicleData
                    .sort((a, b) => a.license_plate.localeCompare(b.license_plate, 'tr'))
                    .map((vehicle, index) => (
                    <option key={index} value={vehicle.license_plate}>
                      {vehicle.license_plate} - {vehicle.vehicle_type}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewVehicleModal(true)}
                  className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  title="Yeni Araç Ekle"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {errors.vehicle_plate && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.vehicle_plate}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şoför Adı *
              </label>
              <select
                value={formData.driver_name}
                onChange={(e) => setFormData(prev => ({ ...prev, driver_name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.driver_name ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="" disabled>Şoför Seçin</option>
                {drivers
                  .sort((a, b) => a.full_name.localeCompare(b.full_name, 'tr'))
                  .map((driver, index) => (
                  <option key={index} value={driver.full_name}>
                    {driver.full_name} {driver.phone && `(${driver.phone})`}
                  </option>
                ))}
              </select>
              {errors.driver_name && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.driver_name}
                </p>
              )}
              {drivers.length === 0 && (
                <p className="text-yellow-600 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Personnel tablosunda position'ı "ŞOFÖR" olan kayıt bulunamadı
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Yakıt Bilgileri */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Fuel className="w-5 h-5 text-orange-600" />
            Yakıt Bilgileri
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yakıt Türü *
              </label>
              <select
                value={formData.fuel_type}
                onChange={(e) => setFormData(prev => ({ ...prev, fuel_type: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.fuel_type ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="" disabled>Yakıt Türü Seçin</option>
                <option value="MOTORIN SVPD">Motorin SVPD</option>
                <option value="BENZIN">Benzin</option>
                <option value="LPG">LPG</option>
                <option value="ELEKTRIK">Elektrik</option>
              </select>
              {errors.fuel_type && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.fuel_type}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Miktar (Litre) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1000"
                value={formData.quantity_liters}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity_liters: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.quantity_liters ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="99.62"
              />
              {errors.quantity_liters && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.quantity_liters}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Birim Fiyat (TL) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.unit_price}
                onChange={(e) => setFormData(prev => ({ ...prev, unit_price: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.unit_price ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="53.49"
              />
              {errors.unit_price && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.unit_price}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                KDV (TL)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.vat_amount}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Toplam Tutar (TL)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.total_amount}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
            </div>

          </div>
        </div>

        {/* İstasyon Bilgileri */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-600" />
            İstasyon Bilgileri
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                İstasyon Adı
              </label>
              <input
                type="text"
                value={formData.station_name}
                disabled
                className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Anlaşmalı istasyon</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                İstasyon Konumu *
              </label>
              <input
                type="text"
                value={formData.station_location}
                onChange={(e) => setFormData(prev => ({ ...prev, station_location: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.station_location ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Gebze/Kocaeli"
              />
              {errors.station_location && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.station_location}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Açıklama / Notlar */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-purple-600" />
            Açıklama / Notlar
          </h3>
          
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Ek bilgi veya notlar buraya yazılabilir (opsiyonel)"
          />
        </div>

        {/* Fiş Görseli */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Camera className="w-5 h-5 text-purple-600" />
            Fiş Görseli
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fiş Fotoğrafı
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        setFormData(prev => ({ ...prev, receipt_image: e.target.result }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                  id="receipt-image"
                />
                <label htmlFor="receipt-image" className="cursor-pointer">
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
                      <p className="text-gray-600">Fiş fotoğrafını yüklemek için tıklayın</p>
                      <p className="text-xs text-gray-500">PNG, JPG, JPEG formatları desteklenir</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Form Butonları */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm"
          >
            Temizle
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Fişi Kaydet
              </>
            )}
          </button>
        </div>
      </form>

      {/* Yeni Araç Ekleme Modal */}
      {showNewVehicleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full m-4">
            <h3 className="text-xl font-bold mb-4 text-gray-900">Yeni Araç Ekle</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plaka</label>
                <input
                  type="text"
                  value={newVehicle.license_plate}
                  onChange={(e) => setNewVehicle({...newVehicle, license_plate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="34 ABC 123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Araç Tipi</label>
                <select
                  value={newVehicle.vehicle_type}
                  onChange={(e) => setNewVehicle({...newVehicle, vehicle_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Kamyon">Kamyon</option>
                  <option value="Kamyonet">Kamyonet</option>
                  <option value="Panelvan">Panelvan</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  <p className="text-sm text-blue-800">
                    <strong>Not:</strong> Şoför ataması yetkili tarafından yapılacaktır.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowNewVehicleModal(false)}
                className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
              >
                İptal
              </button>
              <button
                onClick={handleAddNewVehicle}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Başarı Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full m-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Fiş Başarıyla Kaydedildi!
            </h3>
            
            <p className="text-gray-600 mb-6">
              Yakıt fişi veritabanına kaydedildi ve listeye eklendi.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="flex-1 bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Yeni Fiş Ekle
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  if (onCancel) onCancel();
                }}
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Fiş Listesine Git
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelReceiptForm;
