import React, { useState } from 'react';
import DriverSelection from './DriverSelection';
import MobileReceiptForm from './MobileReceiptForm';
import { vehicleService, getAllPersonnel } from '../../services/supabase';

const MobileApp = () => {
  const [currentScreen, setCurrentScreen] = useState('driver-selection'); // 'driver-selection', 'receipt-form', 'success'
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

  const handleDriverSelect = (driver) => {
    setSelectedDriver(driver);
    setCurrentScreen('receipt-form');
  };

  const handleBackToDriverSelection = () => {
    setSelectedDriver(null);
    setCurrentScreen('driver-selection');
  };

  const handleSuccess = (message) => {
    alert(message);
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
          personnelData={personnelData}
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
        />
      )}
    </div>
  );
};

export default MobileApp;
