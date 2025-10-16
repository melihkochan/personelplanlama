import React, { useState } from 'react';
import DriverSelection from './DriverSelection';
import MobileReceiptForm from './MobileReceiptForm';
import ReceiptHistory from './ReceiptHistory';
import MobileShellMap from './MobileShellMap';
import MobileVehicleTracking from './MobileVehicleTracking';
import { FileText, History, Map, Car } from 'lucide-react';
import { vehicleService, getAllPersonnel, transferVehicleService } from '../../services/supabase';

const MobileApp = () => {
  const [currentScreen, setCurrentScreen] = useState('driver-selection'); // 'driver-selection', 'receipt-form', 'receipt-history', 'shell-map', 'vehicle-tracking', 'success'
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [vehicleData, setVehicleData] = useState([]);
  const [personnelData, setPersonnelData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Veri yükleme
  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Veri yükleniyor...');
      
      // Araç verilerini yükle
      const vehicleResult = await vehicleService.getAllVehicles();
      console.log('Araç verileri:', vehicleResult);
      if (vehicleResult.success) {
        setVehicleData(vehicleResult.data);
      } else {
        console.error('Araç verileri yüklenemedi:', vehicleResult.error);
      }

      // Personel verilerini yükle
      const personnelResult = await getAllPersonnel();
      console.log('Personel verileri:', personnelResult);
      if (personnelResult.success) {
        setPersonnelData(personnelResult.data);
      } else {
        console.error('Personel verileri yüklenemedi:', personnelResult.error);
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      alert('Veriler yüklenirken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDriverSelect = async (driver) => {
    setSelectedDriver(driver);
    
    // Admin ise tüm araçları yükle
    if (driver.isAdmin) {
      try {
        // Hem transfer araçları hem de normal araçları yükle
        const [transferResult, normalResult] = await Promise.all([
          transferVehicleService.getAllTransferVehicles(),
          vehicleService.getAllVehicles()
        ]);
        
        let allVehicles = [];
        
        // Transfer araçlarını ekle
        if (transferResult.success) {
          const transferVehicles = transferResult.data.map(vehicle => ({
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
          allVehicles = [...allVehicles, ...transferVehicles];
        }
        
        // Normal araçları ekle
        if (normalResult.success) {
          allVehicles = [...allVehicles, ...normalResult.data];
        }
        
        setVehicleData(allVehicles);
        console.log('Admin için tüm araçlar yüklendi:', allVehicles.length);
      } catch (error) {
        console.error('Admin araçları yükleme hatası:', error);
      }
    } else if (driver.region) {
      // Normal şoför için bölgeye göre araçları çek
      try {
        const result = await transferVehicleService.getVehiclesByRegion(driver.region);
        
        if (result.success) {
          // Transfer araçlarını vehicles formatına çevir
          const transferVehicles = result.data.map(vehicle => ({
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
          
          setVehicleData(transferVehicles);
        }
      } catch (error) {
        console.error('Bölge araçları yükleme hatası:', error);
      }
    }
    
    setCurrentScreen('receipt-form');
  };

  const handleBackToDriverSelection = () => {
    setSelectedDriver(null);
    setCurrentScreen('driver-selection');
  };

  const handleSuccess = (message) => {
    // Mesajı göster ve şoför seçimine dön
    setCurrentScreen('driver-selection');
  };

  const handleVehicleAdded = (newVehicle) => {
    console.log('MobileApp: Yeni araç alındı:', newVehicle);
    console.log('Mevcut araç listesi:', vehicleData);
    
    // Yeni aracı listeye ekle
    setVehicleData(prev => {
      const updated = [...prev, newVehicle];
      console.log('Güncellenmiş araç listesi:', updated);
      return updated;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-app">
      {currentScreen === 'driver-selection' && (
        <DriverSelection
          onDriverSelect={handleDriverSelect}
        />
      )}
      
      {currentScreen === 'receipt-form' && selectedDriver && (
        <MobileReceiptForm
          selectedDriver={selectedDriver}
          vehicleData={vehicleData}
          onBack={handleBackToDriverSelection}
          onSuccess={handleSuccess}
          onVehicleAdded={handleVehicleAdded}
          onShowHistory={() => setCurrentScreen('receipt-history')}
          onShowShellMap={() => setCurrentScreen('shell-map')}
        />
      )}

      {currentScreen === 'receipt-history' && selectedDriver && (
        <ReceiptHistory
          selectedDriver={selectedDriver}
          onBack={() => setCurrentScreen('receipt-form')}
        />
      )}

      {currentScreen === 'vehicle-tracking' && (
        <MobileVehicleTracking
          selectedDriver={selectedDriver}
          onBack={() => setCurrentScreen('receipt-form')}
        />
      )}

      {currentScreen === 'shell-map' && (
        <MobileShellMap
          onBack={() => setCurrentScreen('receipt-form')}
        />
      )}

      {/* Alt Navigation Bar - Sadece receipt-form, receipt-history, shell-map ve vehicle-tracking ekranlarında göster */}
      {(currentScreen === 'receipt-form' || currentScreen === 'receipt-history' || currentScreen === 'shell-map' || currentScreen === 'vehicle-tracking') && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-[9999] safe-area-inset-bottom">
          <div className="flex justify-around items-center">
            <button
              onClick={() => setCurrentScreen('receipt-form')}
              className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                currentScreen === 'receipt-form' 
                  ? 'text-green-600 bg-green-50' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <FileText className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Yeni Fiş</span>
            </button>
            
            <button
              onClick={() => setCurrentScreen('receipt-history')}
              className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                currentScreen === 'receipt-history' 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <History className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Fiş Geçmişi</span>
            </button>
            
            <button
              onClick={() => setCurrentScreen('vehicle-tracking')}
              className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                currentScreen === 'vehicle-tracking' 
                  ? 'text-purple-600 bg-purple-50' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Car className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Araç Takip</span>
            </button>
            
            <button
              onClick={() => setCurrentScreen('shell-map')}
              className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                currentScreen === 'shell-map' 
                  ? 'text-orange-600 bg-orange-50' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Map className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Shell</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileApp;
