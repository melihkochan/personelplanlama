import React, { useState } from 'react';
import { Shield, Users, Settings, Database, AlertTriangle, Check, X } from 'lucide-react';

const AdminPanel = () => {
  const [activeSection, setActiveSection] = useState('users');
  const [users, setUsers] = useState([
    { id: 1, name: 'Melih KOÇHAN', email: 'admin@domain.com', role: 'admin', status: 'active' },
    { id: 2, name: 'Test User', email: 'user@domain.com', role: 'user', status: 'active' }
  ]);

  const MenuButton = ({ id, icon: Icon, label, active, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`
        flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200
        ${active 
          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
          : 'text-gray-600 hover:bg-gray-100'
        }
      `}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );

  const UserCard = ({ user }) => (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{user.name}</h3>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`
            px-3 py-1 rounded-full text-xs font-medium
            ${user.role === 'admin' 
              ? 'bg-purple-100 text-purple-800' 
              : 'bg-blue-100 text-blue-800'
            }
          `}>
            {user.role === 'admin' ? 'Admin' : 'Kullanıcı'}
          </span>
          <span className={`
            px-3 py-1 rounded-full text-xs font-medium
            ${user.status === 'active' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
            }
          `}>
            {user.status === 'active' ? 'Aktif' : 'Pasif'}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <button className="flex-1 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
          Düzenle
        </button>
        <button className="flex-1 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium">
          Sil
        </button>
      </div>
    </div>
  );

  const StatCard = ({ icon: Icon, title, value, color }) => (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${color}-100`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
          <p className="text-sm text-gray-600">{title}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Admin Panel</h1>
        </div>
        <p className="text-purple-100">Sistem yönetimi ve kullanıcı kontrolü</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={Users} 
          title="Toplam Kullanıcı" 
          value={users.length} 
          color="blue" 
        />
        <StatCard 
          icon={Shield} 
          title="Admin Kullanıcı" 
          value={users.filter(u => u.role === 'admin').length} 
          color="purple" 
        />
        <StatCard 
          icon={Check} 
          title="Aktif Kullanıcı" 
          value={users.filter(u => u.status === 'active').length} 
          color="green" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Menu */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Menu</h3>
            <div className="space-y-2">
              <MenuButton 
                id="users"
                icon={Users}
                label="Kullanıcılar"
                active={activeSection === 'users'}
                onClick={setActiveSection}
              />
              <MenuButton 
                id="settings"
                icon={Settings}
                label="Ayarlar"
                active={activeSection === 'settings'}
                onClick={setActiveSection}
              />
              <MenuButton 
                id="database"
                icon={Database}
                label="Veritabanı"
                active={activeSection === 'database'}
                onClick={setActiveSection}
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {activeSection === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Kullanıcı Yönetimi</h2>
                <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium">
                  Yeni Kullanıcı
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {users.map(user => (
                  <UserCard key={user.id} user={user} />
                ))}
              </div>
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Sistem Ayarları</h2>
              
              <div className="space-y-6">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <h3 className="font-semibold text-yellow-800">Geliştirme Modu</h3>
                  </div>
                  <p className="text-yellow-700 text-sm">
                    Sistem şu anda geliştirme modunda çalışıyor. Tüm özellikler aktif değil.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h4 className="font-medium text-gray-900 mb-2">Otomatik Yedekleme</h4>
                    <p className="text-sm text-gray-600 mb-3">Veritabanı otomatik yedeklemesi</p>
                    <div className="flex items-center gap-2">
                      <button className="w-10 h-6 bg-green-500 rounded-full relative">
                        <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1 transition-transform"></div>
                      </button>
                      <span className="text-sm font-medium text-green-600">Açık</span>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h4 className="font-medium text-gray-900 mb-2">Hata Bildirimleri</h4>
                    <p className="text-sm text-gray-600 mb-3">Sistem hata bildirim sistemi</p>
                    <div className="flex items-center gap-2">
                      <button className="w-10 h-6 bg-gray-300 rounded-full relative">
                        <div className="w-4 h-4 bg-white rounded-full absolute left-1 top-1 transition-transform"></div>
                      </button>
                      <span className="text-sm font-medium text-gray-600">Kapalı</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'database' && (
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Veritabanı Yönetimi</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <Database className="w-6 h-6 text-blue-600" />
                    <h3 className="font-semibold text-blue-900">Veritabanı Durumu</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bağlantı:</span>
                      <span className="text-green-600 font-medium">Aktif</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tablolar:</span>
                      <span className="text-blue-600 font-medium">5</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Son Yedekleme:</span>
                      <span className="text-gray-600">Bugün</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <Check className="w-6 h-6 text-green-600" />
                    <h3 className="font-semibold text-green-900">Hızlı İşlemler</h3>
                  </div>
                  <div className="space-y-2">
                    <button className="w-full bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium">
                      Yedek Oluştur
                    </button>
                    <button className="w-full bg-white text-orange-600 px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors text-sm font-medium">
                      Verileri Temizle
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel; 