import React, { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, Truck } from 'lucide-react';
import { aktarmaSoforService } from '../../services/supabase';

const DriverSelection = ({ onDriverSelect }) => {
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [drivers, setDrivers] = useState([]);

  // Aktarma şoförlerini yükle
  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      console.log('Aktarma şoförleri yükleniyor...');
      const result = await aktarmaSoforService.getAllDrivers();
      console.log('getAllDrivers sonucu:', result);
      if (result.success) {
        setDrivers(result.data);
        console.log('Aktarma şoförleri yüklendi:', result.data?.length, 'şoför');
      } else {
        console.error('getAllDrivers başarısız:', result);
      }
    } catch (error) {
      console.error('Aktarma şoförleri yüklenirken hata:', error);
      console.error('Hata detayı:', error.message);
    }
  };

  // Giriş işlemi - tek sistem
  const handleLogin = async (e) => {
    e.preventDefault();
    console.log('=== GİRİŞ BAŞLADI ===');
    console.log('Giriş verileri:', loginData);
    setLoading(true);
    setLoginError('');

    try {
      // Admin kontrolü
      if (loginData.username === 'admin' && loginData.password === '14') {
        console.log('Admin girişi başarılı');
        const adminData = {
          id: 'admin',
          full_name: 'Admin Kullanıcı',
          region: 'ALL',
          warehouse: 'Tüm Depolar',
          registration_number: 'ADMIN',
          username: 'admin',
          isAdmin: true
        };
        
        // Başarılı giriş mesajı
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg bg-green-500 text-white transition-all duration-300 transform';
        successMessage.innerHTML = `
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium">Admin girişi başarılı! Hoş geldin Admin</p>
            </div>
          </div>
        `;
        document.body.appendChild(successMessage);
        
        // 2 saniye sonra mesajı kaldır ve yönlendir
        setTimeout(() => {
          successMessage.remove();
          onDriverSelect(adminData);
        }, 2000);
        
        return;
      }

       // Önce aktarma şoförleri tablosunda ara
       console.log('Aktarma şoförleri tablosunda aranıyor...');
       const aktarmaResult = await aktarmaSoforService.getDriverByCredentials(loginData.username, loginData.password);
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
        
        // Başarılı giriş mesajı
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg bg-green-500 text-white transition-all duration-300 transform';
        successMessage.innerHTML = `
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium">Giriş başarılı! Hoş geldin ${driverData.full_name}</p>
            </div>
          </div>
        `;
        document.body.appendChild(successMessage);
        
        // 2 saniye sonra mesajı kaldır ve yönlendir
        setTimeout(() => {
          successMessage.remove();
          onDriverSelect(driverData);
        }, 2000);
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
        
        // Başarılı giriş mesajı
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg bg-green-500 text-white transition-all duration-300 transform';
        successMessage.innerHTML = `
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium">Giriş başarılı! Hoş geldin ${anadoluDriver.full_name}</p>
            </div>
          </div>
        `;
        document.body.appendChild(successMessage);
        
        // 2 saniye sonra mesajı kaldır ve yönlendir
        setTimeout(() => {
          successMessage.remove();
          onDriverSelect(anadoluDriver);
        }, 2000);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex flex-col">
      {/* Header */}
      <div className="text-center mb-8 pt-6">
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
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full">
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kullanıcı Adı
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
      </div>

      {/* Footer - Sayfa altında */}
      <div className="mt-auto text-center space-y-4 pb-4">
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