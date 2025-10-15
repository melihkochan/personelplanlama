import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, Truck } from 'lucide-react';
import { aktarmaSoforService } from '../../services/supabase';

const DriverSelection = ({ personnelData, onDriverSelect }) => {
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // Personnel tablosundan şoförleri çek
  const getDriversFromPersonnel = () => {
    return personnelData.filter(person => 
      person.position && person.position.toUpperCase() === 'ŞOFÖR'
    );
  };

  const drivers = getDriversFromPersonnel();

  // Giriş işlemi - tek sistem
  const handleLogin = async (e) => {
    e.preventDefault();
    console.log('=== GİRİŞ BAŞLADI ===');
    console.log('Giriş verileri:', loginData);
    setLoading(true);
    setLoginError('');

    try {
      // Önce aktarma şoförleri tablosunda ara
      console.log('Aktarma şoförleri tablosunda aranıyor...');
      const aktarmaResult = await aktarmaSoforService.loginDriver(loginData.username, loginData.password);
      console.log('Aktarma sonucu:', aktarmaResult);
      
      if (aktarmaResult.success) {
        // Aktarma şoförü girişi başarılı
        const driverData = {
          id: aktarmaResult.data.id,
          full_name: aktarmaResult.data.ad_soyad,
          region: aktarmaResult.data.bolge,
          warehouse: aktarmaResult.data.depo,
          registration_number: aktarmaResult.data.sicil,
          username: aktarmaResult.data.kullanici_adi
        };
        
        console.log('Aktarma şoförü bulundu:', driverData);
        console.log('onDriverSelect çağrılıyor...');
        alert('Aktarma şoförü bulundu: ' + driverData.full_name);
        onDriverSelect(driverData);
        return;
      }

      // Aktarma şoförü değilse, anadolu şoförleri arasında ara
      console.log('Aktarma şoförü bulunamadı, anadolu şoförleri aranıyor...');
      console.log('Mevcut drivers:', drivers);
      const anadoluDriver = drivers.find(driver => 
        driver.full_name.toLowerCase().includes(loginData.username.toLowerCase()) ||
        driver.registration_number === loginData.username
      );

      if (anadoluDriver) {
        // Anadolu şoförü girişi (şifre kontrolü yok)
        console.log('Anadolu şoförü bulundu:', anadoluDriver);
        console.log('onDriverSelect çağrılıyor...');
        onDriverSelect(anadoluDriver);
      } else {
        console.log('Hiçbir şoför bulunamadı!');
        setLoginError('Kullanıcı adı veya şifre hatalı!');
      }
    } catch (error) {
      console.error('Giriş hatası:', error);
      setLoginError('Giriş yapılırken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
      console.log('=== GİRİŞ BİTTİ ===');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Header */}
      <div className="text-center mb-8 pt-safe-top">
        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Truck className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Yakıt Fiş Takip
        </h1>
        <p className="text-gray-600">
          Şoför girişi yapın
        </p>
      </div>

      {/* Giriş Formu */}
      <div className="max-w-md mx-auto">
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kullanıcı Adı / İsim
            </label>
            <div className="relative">
              <input
                type="text"
                value={loginData.username}
                onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                className="w-full px-4 py-4 pl-12 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg shadow-sm"
                placeholder="Kullanıcı adınızı girin"
                required
              />
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Şifre
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                className="w-full px-4 py-4 pl-12 pr-12 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg shadow-sm"
                placeholder="Şifrenizi girin"
              />
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {loginError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{loginError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Giriş Yapılıyor...
              </div>
            ) : (
              'Giriş Yap'
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center space-y-4">
        <p className="text-xs text-gray-400">
          Sadece yetkili şoförler giriş yapabilir
        </p>
        <div className="border-t border-gray-200 pt-3">
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
    </div>
  );
};

export default DriverSelection;