import React from 'react';
import { Users, Car, Store, Calendar, FileText, BarChart3, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const Dashboard = ({ personnelData, vehicleData, storeData, generatedPlan, onNavigate }) => {
  // İstatistikler
  const stats = {
    totalPersonnel: personnelData?.length || 0,
    totalVehicles: vehicleData?.length || 0,
    totalStores: storeData?.length || 0,
    drivers: personnelData?.filter(p => p.pozisyon === 'Şoför' || p.pozisyon === 'sofor')?.length || 0,
    deliveryStaff: personnelData?.filter(p => p.pozisyon === 'Sevkiyat Elemanı' || p.pozisyon === 'sevkiyat')?.length || 0,
    activePlans: generatedPlan ? 1 : 0
  };

  // Araç tiplerini say
  const vehicleTypes = vehicleData?.reduce((acc, vehicle) => {
    const type = vehicle.arac_tipi || 'Belirtilmemiş';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {}) || {};

  const getColorClasses = (color) => {
    const colorMap = {
      blue: {
        border: 'border-blue-500',
        bg: 'bg-blue-500',
        gradient: 'from-blue-500 to-blue-600',
        hover: 'hover:border-blue-300'
      },
      green: {
        border: 'border-green-500',
        bg: 'bg-green-500',
        gradient: 'from-green-500 to-green-600',
        hover: 'hover:border-green-300'
      },
      purple: {
        border: 'border-purple-500',
        bg: 'bg-purple-500',
        gradient: 'from-purple-500 to-purple-600',
        hover: 'hover:border-purple-300'
      },
      orange: {
        border: 'border-orange-500',
        bg: 'bg-orange-500',
        gradient: 'from-orange-500 to-orange-600',
        hover: 'hover:border-orange-300'
      },
      red: {
        border: 'border-red-500',
        bg: 'bg-red-500',
        gradient: 'from-red-500 to-red-600',
        hover: 'hover:border-red-300'
      },
      indigo: {
        border: 'border-indigo-500',
        bg: 'bg-indigo-500',
        gradient: 'from-indigo-500 to-indigo-600',
        hover: 'hover:border-indigo-300'
      }
    };
    return colorMap[color] || colorMap.blue;
  };

  const StatCard = ({ title, value, icon: Icon, color, trend, trendText }) => {
    const colors = getColorClasses(color);
    
    return (
      <div className={`bg-white rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 ${colors.border} hover:scale-105 transform cursor-pointer relative overflow-hidden group`}>
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-transparent via-transparent to-gray-50 rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform duration-300"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white shadow-lg`}>
              <Icon className="w-5 h-5" />
            </div>
            {trend && (
              <div className={`flex items-center gap-1 text-xs font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className="w-3 h-3" />
                <span>{trend > 0 ? '+' : ''}{trend}%</span>
              </div>
            )}
          </div>
          
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-gray-900">{value}</h3>
            <p className="text-xs text-gray-600">{title}</p>
            {trendText && (
              <p className="text-xs text-gray-500">{trendText}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const QuickActionCard = ({ title, description, icon: Icon, color, onClick }) => {
    const colors = getColorClasses(color);
    
    return (
      <button
        onClick={onClick}
        className={`bg-white rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 border ${colors.hover} hover:scale-105 transform cursor-pointer relative overflow-hidden group text-left w-full`}
      >
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-transparent to-gray-50 rounded-full -translate-y-6 translate-x-6 group-hover:scale-110 transition-transform duration-300"></div>
        
        <div className="relative z-10">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white shadow-lg mb-3`}>
            <Icon className="w-5 h-5" />
          </div>
          
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-600">{description}</p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\"20\" height=\"20\" viewBox=\"0 0 20 20\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.1\"%3E%3Ccircle cx=\"3\" cy=\"3\" r=\"3\"/%3E%3Ccircle cx=\"13\" cy=\"13\" r=\"3\"/%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>
        
        <div className="relative z-10">
          <h1 className="text-xl font-bold mb-2">Hoş Geldiniz! 👋</h1>
          <p className="text-blue-100 mb-4 text-sm">Personel Planlama Sistemi Dashboard'una hoş geldiniz. Sisteminizin genel durumunu buradan takip edebilirsiniz.</p>
          
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-300" />
              <span>Sistem Aktif</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-blue-300" />
              <span>Son Güncellenme: Bugün</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Toplam Personel" 
          value={stats.totalPersonnel} 
          icon={Users} 
          color="blue"
          trend={5}
          trendText="Son haftaya göre"
        />
        <StatCard 
          title="Toplam Araç" 
          value={stats.totalVehicles} 
          icon={Car} 
          color="green"
          trend={0}
          trendText="Değişim yok"
        />
        <StatCard 
          title="Toplam Mağaza" 
          value={stats.totalStores} 
          icon={Store} 
          color="purple"
          trend={2}
          trendText="Yeni mağaza eklendi"
        />
        <StatCard 
          title="Aktif Planlar" 
          value={stats.activePlans} 
          icon={Calendar} 
          color="orange"
          trend={generatedPlan ? 1 : 0}
          trendText={generatedPlan ? "Plan oluşturuldu" : "Plan bekliyor"}
        />
      </div>

      {/* Detaylı İstatistikler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personel Detayları */}
        <div className="bg-white rounded-xl p-4 shadow-lg">
          <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Personel Detayları
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
              <span className="text-xs font-medium text-blue-900">Şoförler</span>
              <span className="text-sm font-bold text-blue-600">{stats.drivers}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
              <span className="text-xs font-medium text-green-900">Sevkiyat Elemanları</span>
              <span className="text-sm font-bold text-green-600">{stats.deliveryStaff}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="text-xs font-medium text-gray-900">Diğer Personel</span>
              <span className="text-sm font-bold text-gray-600">{stats.totalPersonnel - stats.drivers - stats.deliveryStaff}</span>
            </div>
          </div>
        </div>

        {/* Araç Detayları */}
        <div className="bg-white rounded-xl p-4 shadow-lg">
          <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Car className="w-4 h-4 text-green-600" />
            Araç Detayları
          </h3>
          <div className="space-y-2">
            {Object.entries(vehicleTypes).length > 0 ? (
              Object.entries(vehicleTypes).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                  <span className="text-xs font-medium text-green-900">{type}</span>
                  <span className="text-sm font-bold text-green-600">{count}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-3 text-gray-500">
                <AlertCircle className="w-6 h-6 mx-auto mb-1" />
                <p className="text-xs">Henüz araç verisi yok</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hızlı Erişim */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Hızlı Erişim</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickActionCard
            title="Personel Yönetimi"
            description="Personel listesini görüntüle ve yönet"
            icon={Users}
            color="blue"
            onClick={() => onNavigate('personnel')}
          />
          <QuickActionCard
            title="Araç Yönetimi"
            description="Araç listesini görüntüle ve yönet"
            icon={Car}
            color="green"
            onClick={() => onNavigate('vehicles')}
          />
          <QuickActionCard
            title="Vardiya Planlama"
            description="Yeni vardiya planı oluştur"
            icon={Calendar}
            color="purple"
            onClick={() => onNavigate('planning')}
          />
          <QuickActionCard
            title="Mağaza Yönetimi"
            description="Mağaza listesini görüntüle ve yönet"
            icon={Store}
            color="orange"
            onClick={() => onNavigate('stores')}
          />
          <QuickActionCard
            title="Performans Analizi"
            description="Sistem performansını analiz et"
            icon={BarChart3}
            color="red"
            onClick={() => onNavigate('performance')}
          />
          <QuickActionCard
            title="Plan Görüntüle"
            description="Oluşturulan planları görüntüle"
            icon={FileText}
            color="indigo"
            onClick={() => onNavigate('plan-display')}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 