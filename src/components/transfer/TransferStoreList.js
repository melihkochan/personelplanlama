import React, { useState, useEffect } from 'react';
import { Search, Store, Upload, MapPin, Building, SortAsc, SortDesc, User, UserCheck } from 'lucide-react';
import * as XLSX from 'xlsx';
import StoreMap from '../stores/StoreMap';
import { transferStoreService } from '../../services/supabase';

const TransferStoreList = () => {
  const [storeData, setStoreData] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState(null);
  const [sortBy, setSortBy] = useState('store_code');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedCity, setSelectedCity] = useState('');

  // Veritabanından mağaza verilerini yükle
  useEffect(() => {
    const loadStoresFromDatabase = async () => {
      setLoading(true);
      try {
        const result = await transferStoreService.getAllStores();
        if (result.success && result.data) {
          setStoreData(result.data);
          setFilteredStores(result.data);
          // LocalStorage'a da kaydet (fallback için)
          localStorage.setItem('transferStores', JSON.stringify(result.data));
        }
      } catch (error) {
        console.error('Mağaza verileri yüklenirken hata:', error);
        // Hata durumunda localStorage'dan yükle
        try {
          const savedStores = localStorage.getItem('transferStores');
          if (savedStores) {
            const stores = JSON.parse(savedStores);
            setStoreData(stores);
            setFilteredStores(stores);
          }
        } catch (e) {
          console.error('LocalStorage yükleme hatası:', e);
        }
      } finally {
        setLoading(false);
      }
    };

    loadStoresFromDatabase();
  }, []);

  // Excel dosyasını işle
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Önce header: 1 ile oku (satır numarası ile)
        const jsonDataWithHeaders = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // İlk satırı başlık olarak al
        const headers = jsonDataWithHeaders[0];
        const rows = jsonDataWithHeaders.slice(1);
        
        // Veriyi işle
        const processedData = rows
          .filter(row => row[0] && row[0].toString().trim() !== '')
          .map((row, index) => {
            // Kolon eşleştirmesi - esnek yapı
            const findColumn = (possibleNames) => {
              for (let name of possibleNames) {
                const colIndex = headers.findIndex(h => 
                  h && h.toString().toLowerCase().includes(name.toLowerCase())
                );
                if (colIndex >= 0 && row[colIndex] !== undefined && row[colIndex] !== null && row[colIndex] !== '') {
                  return row[colIndex];
                }
              }
              return null;
            };

            // Koordinat parse fonksiyonu
            const parseCoordinate = (value) => {
              if (!value && value !== 0) return null;
              
              // String'e çevir
              const strValue = value.toString().trim();
              if (!strValue) return null;
              
              // Eğer zaten ondalık nokta varsa kontrol et
              if (strValue.includes('.') || strValue.includes(',')) {
                const parsed = parseFloat(strValue.replace(',', '.'));
                // Koordinat kontrolü: Enlem -90 ile 90 arasında, Boylam -180 ile 180 arasında olmalı
                if (!isNaN(parsed) && ((parsed >= -90 && parsed <= 90) || (parsed >= -180 && parsed <= 180))) {
                  return parsed;
                }
                // Eğer sayı çok büyükse ama ondalık nokta varsa, muhtemelen yanlış formatlanmış (ör: 41076181.000000)
                // Ondalık kısmı sıfırsa ve sayı büyükse düzelt
                if (!isNaN(parsed) && Math.abs(parsed) > 90 && (strValue.endsWith('.000000') || strValue.endsWith(',000000') || strValue.endsWith('.00000'))) {
                  // Ondalık kısmı kaldır ve tam sayı olarak işle
                  const intPart = Math.abs(parsed).toString().split('.')[0];
                  // Şimdi aşağıdaki mantıkla devam et
                  const numValue = parseInt(intPart);
                  if (intPart.length === 8) {
                    const corrected = parseFloat(intPart.substring(0, 2) + '.' + intPart.substring(2));
                    return parsed < 0 ? -corrected : corrected;
                  }
                  if (intPart.length === 7) {
                    const corrected = parseFloat(intPart.substring(0, 2) + '.' + intPart.substring(2));
                    return parsed < 0 ? -corrected : corrected;
                  }
                }
                return null;
              }
              
              // Eğer tam sayı olarak gelmişse (örneğin 41076181)
              const numValue = parseFloat(strValue);
              if (isNaN(numValue)) return null;
              
              // Eğer sayı çok büyükse, muhtemelen ondalık nokta eksik
              // Enlem: Eğer 6-8 haneli bir sayıysa ve 90'dan büyükse, ondalık nokta ekle
              if (Math.abs(numValue) > 90 && Math.abs(numValue) < 100000000) {
                // Örnek: 41076181 -> 41.076181 (8 haneli)
                const str = Math.abs(numValue).toString();
                if (str.length === 8) {
                  const corrected = parseFloat(str.substring(0, 2) + '.' + str.substring(2));
                  return numValue < 0 ? -corrected : corrected;
                }
                // Örnek: 4107618 -> 41.07618 (7 haneli)
                if (str.length === 7) {
                  const corrected = parseFloat(str.substring(0, 2) + '.' + str.substring(2));
                  return numValue < 0 ? -corrected : corrected;
                }
              }
              
              // Boylam: Eğer 180'den büyükse ve 7-9 haneli ise, ondalık nokta ekle
              if (Math.abs(numValue) > 180 && Math.abs(numValue) < 1000000000) {
                const str = Math.abs(numValue).toString();
                // Örnek: 29013761 -> 29.013761 (8 haneli)
                if (str.length === 8) {
                  const corrected = parseFloat(str.substring(0, 2) + '.' + str.substring(2));
                  return numValue < 0 ? -corrected : corrected;
                }
                // Örnek: 2901376 -> 29.01376 (7 haneli)
                if (str.length === 7) {
                  const corrected = parseFloat(str.substring(0, 2) + '.' + str.substring(2));
                  return numValue < 0 ? -corrected : corrected;
                }
              }
              
              // Normal parse (zaten doğru formatlanmışsa)
              if (numValue >= -90 && numValue <= 90) {
                return numValue; // Enlem için
              }
              if (numValue >= -180 && numValue <= 180) {
                return numValue; // Boylam için
              }
              
              return null;
            };

            const latValue = findColumn(['enlem', 'latitude', 'lat']) || row[9];
            const lngValue = findColumn(['boylam', 'longitude', 'lng', 'lon']) || row[10];

            // Şehir bilgisini çıkar - önce şehir kolonundan, yoksa bölge'den
            let cityValue = findColumn(['il', 'city', 'şehir', 'sehir']) || row[5] || '';
            const regionValue = findColumn(['bölge', 'bolge', 'region']) || row[2] || '';
            
            // Eğer şehir yoksa, bölge'den şehir bilgisini çıkar
            if (!cityValue && regionValue) {
              // Bölge formatı: "İSTANBUL-AVR", "ANKARA", "ADANA" gibi
              // "-" öncesi kısmı şehir adı
              const cityMatch = regionValue.toString().split('-')[0].trim();
              if (cityMatch) {
                cityValue = cityMatch;
              }
            }

            return {
              // id alanını gönderme - Supabase otomatik UUID oluşturur
              store_code: findColumn(['kod', 'code', 'mağaza kod', 'magaza kod']) || row[0] || '',
              store_name: findColumn(['adı', 'ad', 'name', 'mağaza adı', 'magaza adi']) || row[1] || '',
              region: regionValue,
              store_type: findColumn(['tür', 'tur', 'type', 'tip']) || row[3] || '',
              location: findColumn(['konum', 'location', 'adres', 'address']) || row[4] || '',
              city: cityValue,
              district: findColumn(['ilçe', 'ilce', 'district']) || row[6] || '',
              phone: findColumn(['telefon', 'phone', 'tel']) || row[7] || '',
              email: findColumn(['email', 'e-posta', 'eposta', 'mail']) || row[8] || '',
              latitude: parseCoordinate(latValue),
              longitude: parseCoordinate(lngValue),
              region_manager: findColumn(['bölge müdürü', 'bolge muduru', 'region manager']) || row[11] || '',
              sales_manager: findColumn(['satış müdürü', 'satis muduru', 'sales manager']) || row[12] || '',
            };
          });

        // Veritabanına kaydet
        setLoading(true);
        const dbResult = await transferStoreService.bulkUpsertStores(processedData);
        
        if (dbResult.success) {
          // Veritabanından tekrar çek (güncel veriler için)
          const refreshResult = await transferStoreService.getAllStores();
          if (refreshResult.success && refreshResult.data) {
            setStoreData(refreshResult.data);
            setFilteredStores(refreshResult.data);
            // LocalStorage'a da kaydet
            localStorage.setItem('transferStores', JSON.stringify(refreshResult.data));
            alert(`✅ ${refreshResult.data.length} mağaza başarıyla veritabanına kaydedildi!`);
          } else {
            // Eğer veritabanından çekilemezse işlenen veriyi kullan
            setStoreData(processedData);
            setFilteredStores(processedData);
            localStorage.setItem('transferStores', JSON.stringify(processedData));
            alert(`✅ ${processedData.length} mağaza başarıyla yüklendi!`);
          }
        } else {
          // Veritabanı kayıt hatası - sadece local'e kaydet
          setStoreData(processedData);
          setFilteredStores(processedData);
          localStorage.setItem('transferStores', JSON.stringify(processedData));
          alert(`⚠️ ${processedData.length} mağaza yüklendi ancak veritabanına kaydedilemedi: ${dbResult.error}`);
        }
      } catch (error) {
        console.error('Excel yükleme hatası:', error);
        alert('Excel dosyası yüklenirken hata oluştu: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    
    reader.readAsArrayBuffer(file);
  };


  // Filtreleme ve sıralama
  useEffect(() => {
    let filtered = [...storeData];

    // Arama filtresi
    if (searchTerm) {
      filtered = filtered.filter(store =>
        store.store_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.store_code?.toString().includes(searchTerm) ||
        store.region?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Şehir filtresi
    if (selectedCity) {
      filtered = filtered.filter(store => {
        // Önce city'den kontrol et
        if (store.city?.toLowerCase().includes(selectedCity.toLowerCase())) {
          return true;
        }
        // Eğer city yoksa, region'dan şehir çıkar ve kontrol et
        if (!store.city && store.region) {
          const cityFromRegion = store.region.toString().split('-')[0].trim().toLowerCase();
          return cityFromRegion.includes(selectedCity.toLowerCase());
        }
        return false;
      });
    }

    // Sıralama
    filtered.sort((a, b) => {
      let aValue = a[sortBy] || '';
      let bValue = b[sortBy] || '';
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredStores(filtered);
  }, [storeData, searchTerm, selectedCity, sortBy, sortOrder]);

  // Şehir listesi - sadece şehir adlarını göster, bölge müdürlerini değil
  const cities = Array.from(new Set(
    storeData
      .map(s => {
        // Eğer city yoksa region'dan çıkar
        if (!s.city && s.region) {
          const cityMatch = s.region.toString().split('-')[0].trim();
          return cityMatch || null;
        }
        return s.city || null;
      })
      .filter(Boolean)
  )).sort();

  // Sıralama fonksiyonu
  const sortStores = (stores, sortBy, sortOrder) => {
    return [...stores].sort((a, b) => {
      let aValue = a[sortBy] || '';
      let bValue = b[sortBy] || '';
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  const sortedStores = sortStores(filteredStores, sortBy, sortOrder);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sol Panel - Mağaza Listesi */}
      <div className="w-1/2 p-6 overflow-y-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                  <Store className="w-5 h-5 text-white" />
                </div>
                Aktarma Mağaza Listesi
              </h1>
              <p className="text-sm text-gray-600 mt-1">Toplam {storeData.length} Mağaza</p>
            </div>
            
            <div className="flex gap-2">
              <label className="cursor-pointer bg-gradient-to-r from-orange-500 to-red-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:from-orange-600 hover:to-red-700 transition-all duration-300 text-sm shadow-md">
                <Upload className="w-4 h-4" />
                Excel Yükle
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Search and Sort */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Mağaza ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 text-sm"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700">Sıralama:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 text-xs"
              >
                <option value="store_code">Mağaza Kodu</option>
                <option value="store_name">Mağaza Adı</option>
                <option value="region">Bölge</option>
                <option value="location">Konum</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-300 text-xs"
              >
                {sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />}
                {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
              </button>
            </div>
          </div>
        </div>

        {/* Store Cards */}
        <div className="space-y-2">
          {sortedStores.map((store, index) => (
            <div 
              key={store.id || store.store_code || index} 
              className={`bg-white rounded-lg p-3 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border-2 ${
                selectedStore?.store_code === store.store_code ? 'border-orange-500 bg-orange-50' : 'border-transparent'
              }`}
              onClick={() => setSelectedStore(store)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                    <Store className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{store.store_name || 'Mağaza'}</h3>
                    <p className="text-gray-600 text-xs">{store.store_code || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Building className="w-3 h-3 text-orange-600" />
                  <span className="text-gray-500">Bölge:</span>
                  <span className="font-medium">{store.region || '-'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-orange-600" />
                  <span className="text-gray-500">Konum:</span>
                  <span className="font-medium">{store.location || store.city || '-'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {sortedStores.length === 0 && (
          <div className="text-center py-8">
            <Store className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 text-sm">Mağaza bulunamadı</p>
          </div>
        )}
      </div>

      {/* Sağ Panel - Detay ve Harita */}
      <div className="w-1/2 p-4 bg-white border-l border-gray-200">
        {selectedStore ? (
          <div className="h-full flex flex-col">
            {/* Mağaza Detayları */}
            <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-xl p-4 text-white mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{selectedStore.store_name}</h2>
                    <p className="text-orange-100 text-xs">Kod: {selectedStore.store_code}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-orange-200">Bölge</p>
                  <p className="font-semibold">{selectedStore.region || 'Belirtilmemiş'}</p>
                </div>
                <div>
                  <p className="text-orange-200">Tür</p>
                  <p className="font-semibold">{selectedStore.store_type || 'Belirtilmemiş'}</p>
                </div>
                <div>
                  <p className="text-orange-200">Konum</p>
                  <p className="font-semibold">{selectedStore.location || selectedStore.city || 'Belirtilmemiş'}</p>
                </div>
                <div>
                  <p className="text-orange-200">Koordinatlar</p>
                  <p className="font-semibold">
                    {selectedStore.latitude && selectedStore.longitude 
                      ? `${selectedStore.latitude.toFixed(6)}, ${selectedStore.longitude.toFixed(6)}`
                      : 'Belirtilmemiş'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Müdür Bilgileri */}
            {(selectedStore.region_manager || selectedStore.sales_manager) && (
              <div className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-500 mb-6 border border-gray-200/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl">
                    <UserCheck className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    Yönetim Bilgileri
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bölge Müdürü */}
                  {selectedStore.region_manager && (
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200/50 hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg">
                          <UserCheck className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="font-semibold text-gray-800">Bölge Müdürü</h4>
                      </div>
                      <p className="text-lg font-bold text-orange-700 bg-white/50 rounded-lg px-3 py-2 border border-orange-200">
                        {selectedStore.region_manager}
                      </p>
                    </div>
                  )}

                  {/* Satış Müdürü */}
                  {selectedStore.sales_manager && (
                    <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border border-red-200/50 hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-gradient-to-r from-red-500 to-red-600 rounded-lg">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="font-semibold text-gray-800">Satış Müdürü</h4>
                      </div>
                      <p className="text-lg font-bold text-red-700 bg-white/50 rounded-lg px-3 py-2 border border-red-200">
                        {selectedStore.sales_manager}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Harita */}
            <div className="flex-1">
              <StoreMap 
                latitude={selectedStore.latitude}
                longitude={selectedStore.longitude}
                storeName={selectedStore.store_name}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Mağaza seçin</p>
              <p className="text-sm text-gray-500 mt-2">Detayları görmek için sol panelden bir mağaza seçin</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default TransferStoreList;
