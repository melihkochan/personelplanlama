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
       const aktarmaResult = await aktarmaSoforService.loginDriver(loginData.username, loginData.password);
      console.log('Aktarma sonucu:', aktarmaResult);
      
      // Aktarma şoförü girişi başarısızsa hata mesajı
      if (!aktarmaResult.success) {
        console.log('Aktarma şoförü girişi başarısız:', aktarmaResult.error);
        setLoginError('❌ Kullanıcı adı veya şifre hatalı!');
        return;
      }
      
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
        successMessage.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 px-12 py-8 rounded-3xl shadow-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white transition-all duration-300 min-w-80';
        successMessage.innerHTML = `
          <div class="flex items-center justify-center">
            <div class="flex-shrink-0">
              <svg class="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-4 text-center">
              <p class="text-xl font-bold">✅ Giriş Başarılı!</p>
              <p class="text-base opacity-90 mt-1">Hoş geldin ${driverData.full_name}</p>
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
        successMessage.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 px-12 py-8 rounded-3xl shadow-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white transition-all duration-300 min-w-80';
        successMessage.innerHTML = `
          <div class="flex items-center justify-center">
            <div class="flex-shrink-0">
              <svg class="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-4 text-center">
              <p class="text-xl font-bold">✅ Giriş Başarılı!</p>
              <p class="text-base opacity-90 mt-1">Hoş geldin ${anadoluDriver.full_name}</p>
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
        setLoginError('❌ Kullanıcı adı veya şifre hatalı!');
      }
    } catch (error) {
      console.error('Giriş hatası:', error);
      // Aktarma şoförü girişi başarısızsa spesifik mesaj
      if (error.message && error.message.includes('Kullanıcı adı veya şifre hatalı')) {
        setLoginError('❌ Kullanıcı adı veya şifre hatalı!');
      } else {
        setLoginError('❌ Giriş yapılırken bir sorun oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setLoading(false);
      console.log('=== GİRİŞ BİTTİ ===');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex flex-col relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full opacity-20">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}></div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute top-40 right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
      <div className="absolute bottom-40 left-20 w-24 h-24 bg-purple-500/20 rounded-full blur-xl animate-pulse delay-2000"></div>

      {/* Header */}
      <div className="relative z-10 text-center mb-8 pt-6 px-4">
        <div className="relative mb-6">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Truck className="w-10 h-10 text-white drop-shadow-lg" />
            </div>
          </div>
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-3 bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
          YAKIT - ARAÇ Takip
        </h1>
        <p className="text-blue-200 text-lg font-medium">Şoför Giriş Sistemi</p>
        <div className="w-16 h-1 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full mx-auto mt-3"></div>
      </div>

      {/* Giriş Formu */}
      <div className="flex-1 flex items-center justify-center px-4 relative z-10">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-3">
                  Kullanıcı Adı
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={loginData.username}
                    onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                    className="w-full px-4 py-4 pl-12 bg-white/20 border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-white/60 shadow-lg backdrop-blur-sm transition-all duration-200 text-lg"
                    placeholder="Kullanıcı adınızı girin"
                    required
                  />
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-3">
                  Şifre
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    className="w-full px-4 py-4 pl-12 pr-12 bg-white/20 border border-white/30 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-white/60 shadow-lg backdrop-blur-sm transition-all duration-200 text-lg"
                    placeholder="Şifrenizi girin"
                  />
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-300 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="bg-red-500/20 border border-red-400/30 rounded-2xl p-4 backdrop-blur-sm">
                  <p className="text-red-200 text-sm font-medium">{loginError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white py-4 px-6 rounded-2xl hover:from-blue-600 hover:via-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 font-semibold shadow-2xl hover:shadow-blue-500/25 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                    Giriş yapılıyor...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>Giriş Yap</span>
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer - Sayfa altında */}
      <div className="mt-auto text-center space-y-4 pb-6 px-4 relative z-10">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <p className="text-sm text-white/70 font-medium mb-3">
            🔐 Sadece yetkili şoförler giriş yapabilir
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
            <p className="text-xs text-white/50">
              Developed by{' '}
              <a 
                href="https://www.melihkochan.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-300 hover:text-blue-200 font-semibold underline decoration-blue-300/50 hover:decoration-blue-200 transition-all duration-200"
              >
                Melih KOÇHAN
              </a>
            </p>
            <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse delay-1000"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverSelection;