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
import { fuelReceiptService, vehicleService, transferVehicleService, aktarmaSoforService } from '../../services/supabase';

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
    region: '',
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

  // Birleşik araç ve şoför verileri
  const [allVehicles, setAllVehicles] = useState([]);
  const [allDrivers, setAllDrivers] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [filteredDrivers, setFilteredDrivers] = useState([]);

  // Verileri yükle
  useEffect(() => {
    loadCombinedData();
  }, []);

  const loadCombinedData = async () => {
    try {
      // Transfer araçlarını çek
      const transferResult = await transferVehicleService.getAllTransferVehicles();
      const transferVehicles = transferResult.success ? transferResult.data.map(vehicle => ({
        id: vehicle.id,
        license_plate: vehicle.plate,
        vehicle_type: 'Kamyon',
        location: vehicle.region,
        notes: `Bölge: ${vehicle.region}`,
        is_active: true
      })) : [];

      // Aktarma şoförlerini çek
      const aktarmaResult = await aktarmaSoforService.getAllDrivers();
      const aktarmaDrivers = aktarmaResult.success ? aktarmaResult.data.map(driver => ({
        id: driver.id,
        full_name: driver.ad_soyad,
        position: 'ŞOFÖR',
        region: driver.bolge,
        username: driver.kullanici_adi
      })) : [];

      // Sadece bizim yeni tablolarımızdan veri kullan
      setAllVehicles(transferVehicles);
      setAllDrivers(aktarmaDrivers);
      
      // Başlangıçta tüm verileri göster
      setFilteredVehicles(transferVehicles);
      setFilteredDrivers(aktarmaDrivers);

    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      // Hata durumunda boş array kullan
      setAllVehicles([]);
      setAllDrivers([]);
      setFilteredVehicles([]);
      setFilteredDrivers([]);
    }
  };

  // Araç seçildiğinde şoförleri filtrele
  const handleVehicleChange = (selectedPlate) => {
    const selectedVehicle = allVehicles.find(vehicle => vehicle.license_plate === selectedPlate);
    const region = selectedVehicle?.location || selectedVehicle?.notes?.replace('Bölge: ', '') || '';
    
    // Aynı bölgedeki şoförleri filtrele
    const driversInRegion = allDrivers.filter(driver => driver.region === region);
    setFilteredDrivers(driversInRegion);
    
    setFormData(prev => ({ 
      ...prev, 
      vehicle_plate: selectedPlate,
      region: region
      // Şoför seçimini sıfırlama - kullanıcı isterse değiştirsin
    }));
  };

  // Şoför seçildiğinde araçları filtrele
  const handleDriverChange = (selectedDriverName) => {
    const selectedDriver = allDrivers.find(driver => driver.full_name === selectedDriverName);
    const region = selectedDriver?.region || '';
    
    // Aynı bölgedeki araçları filtrele
    const vehiclesInRegion = allVehicles.filter(vehicle => 
      vehicle.location === region || vehicle.notes?.includes(region)
    );
    setFilteredVehicles(vehiclesInRegion);
    
    setFormData(prev => ({ 
      ...prev, 
      driver_name: selectedDriverName,
      region: region
      // Araç seçimini sıfırlama - kullanıcı isterse değiştirsin
    }));
  };

  // Tüm araçları göster
  const showAllVehicles = () => {
    setFilteredVehicles(allVehicles);
    setFormData(prev => ({ 
      ...prev, 
      vehicle_plate: '',
      driver_name: '',
      region: ''
    }));
  };

  // Tüm şoförleri göster
  const showAllDrivers = () => {
    setFilteredDrivers(allDrivers);
    setFormData(prev => ({ 
      ...prev, 
      vehicle_plate: '',
      driver_name: '',
      region: ''
    }));
  };

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
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Araç Kilometre
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2"/>
                  </svg>
                </div>
                <input
                  type="number"
                  min="0"
                  max="999999"
                  value={formData.km_reading}
                  onChange={(e) => setFormData(prev => ({ ...prev, km_reading: e.target.value }))}
                  className={`w-full pl-10 pr-12 py-2 border rounded-lg font-mono font-semibold tracking-wider focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    errors.km_reading ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="000000"
                  style={{ letterSpacing: '0.05em' }}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-sm font-semibold text-gray-500 bg-white px-2 py-1 rounded border border-gray-300">KM</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Araç göstergesindeki km değerini girin (sadece rakam)
              </p>
              {errors.km_reading && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1 font-medium">
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
                  onChange={(e) => {
                    if (e.target.value === 'show_all') {
                      showAllVehicles();
                    } else {
                      handleVehicleChange(e.target.value);
                    }
                  }}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.vehicle_plate ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="" disabled>Araç Seçin</option>
                  {filteredVehicles.length < allVehicles.length && (
                    <option value="show_all" style={{ color: '#3B82F6', fontWeight: 'bold' }}>
                      🔄 Tümünü Göster ({allVehicles.length} araç)
                    </option>
                  )}
                  {filteredVehicles
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
                onChange={(e) => {
                  if (e.target.value === 'show_all') {
                    showAllDrivers();
                  } else {
                    handleDriverChange(e.target.value);
                  }
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.driver_name ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="" disabled>Şoför Seçin</option>
                {filteredDrivers.length < allDrivers.length && (
                  <option value="show_all" style={{ color: '#3B82F6', fontWeight: 'bold' }}>
                    🔄 Tümünü Göster ({allDrivers.length} şoför)
                  </option>
                )}
                {filteredDrivers
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
              {filteredDrivers.length === 0 && (
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
                placeholder="99.62 (nokta veya virgül kullanın)"
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
                placeholder="53.49 (nokta veya virgül kullanın)"
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
                Bölge
              </label>
              <input
                type="text"
                value={formData.region}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                placeholder="Araç seçildiğinde otomatik doldurulur"
              />
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
