import React, { useState, useEffect } from 'react';
import { Shield, Users, Settings, Database, AlertTriangle, Check, X, Plus, Edit3, Trash2, User, Crown, Star } from 'lucide-react';
import { getAllUsers, addUser, updateUser, deleteUser, resendConfirmationEmail } from '../services/supabase';

const AdminPanel = () => {
  const [activeSection, setActiveSection] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    password: '',
    role: 'kullanıcı',
    is_active: true
  });

  // Verileri yükle
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await getAllUsers();
      if (result.success) {
        setUsers(result.data);
      } else {
        console.error('Kullanıcılar yüklenemedi:', result.error);
      }
    } catch (error) {
      console.error('Kullanıcı yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Türkçe karakterleri İngilizce karakterlere çeviren fonksiyon
  const normalizeForEmail = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9.-]/g, ''); // Sadece İngilizce harfler, rakamlar, nokta ve tire kalsın
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Email'i otomatik olarak oluştur - Türkçe karakterleri normalize et
      const normalizedUsername = normalizeForEmail(formData.username);
      const userDataWithEmail = {
        ...formData,
        email: `${normalizedUsername}@gratis.com`
      };
      
      const result = await addUser(userDataWithEmail);
      if (result.success) {
        setShowAddUserModal(false);
        setFormData({
          username: '',
          full_name: '',
          password: '',
          role: 'kullanıcı',
          is_active: true
        });
        loadUsers();
        
        if (result.needsEmailConfirmation) {
          alert(`✅ Kullanıcı başarıyla eklendi!\n\n⚠️ Email onayı gerekli: ${userDataWithEmail.email}\n\nÇözüm seçenekleri:\n1. Supabase Dashboard → Authentication → Settings → Email Auth → "Confirm email" OFF\n2. Veya kullanıcıya email onay linkini gönderin`);
        } else {
          alert('Kullanıcı başarıyla eklendi!');
        }
      } else {
        alert('Kullanıcı eklenemedi: ' + result.error);
      }
    } catch (error) {
      alert('Kullanıcı ekleme hatası: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username || '',
      full_name: user.full_name || '',
      password: '', // Şifre güvenlik sebebiyle boş bırakılır
      role: user.role || 'kullanıcı',
      is_active: user.is_active !== undefined ? user.is_active : true
    });
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Şifre boşsa güncelleme verilerinden çıkar
      const updateData = { ...formData };
      if (!updateData.password || updateData.password.trim() === '') {
        delete updateData.password;
      }
      
      // Email'i otomatik olarak oluştur - Türkçe karakterleri normalize et
      const normalizedUsername = normalizeForEmail(formData.username);
      updateData.email = `${normalizedUsername}@gratis.com`;
      
      const result = await updateUser(editingUser.id, updateData);
      if (result.success) {
        setShowEditUserModal(false);
        setEditingUser(null);
        loadUsers();
        alert('Kullanıcı başarıyla güncellendi!');
      } else {
        alert('Kullanıcı güncellenemedi: ' + result.error);
      }
    } catch (error) {
      alert('Kullanıcı güncelleme hatası: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
      setLoading(true);
      
      try {
        const result = await deleteUser(userId);
        if (result.success) {
          loadUsers();
          alert('Kullanıcı başarıyla silindi!');
        } else {
          alert('Kullanıcı silinemedi: ' + result.error);
        }
      } catch (error) {
        alert('Kullanıcı silme hatası: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

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

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'yönetici':
        return <Star className="w-4 h-4 text-purple-600" />;
      default:
        return <User className="w-4 h-4 text-blue-600" />;
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg">
            <Crown className="w-3 h-3 mr-1" />
            Admin
          </span>
        );
      case 'yönetici':
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg">
            <Star className="w-3 h-3 mr-1" />
            Yönetici
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-teal-500 text-white shadow-lg">
            <User className="w-3 h-3 mr-1" />
            Kullanıcı
          </span>
        );
    }
  };

  const UserCard = ({ user }) => {
    const getInitials = (name) => {
      if (!name) return 'K';
      const words = name.split(' ');
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      return name.charAt(0).toUpperCase();
    };

    const getAvatarColor = (role) => {
      switch (role) {
        case 'admin':
          return 'bg-gradient-to-br from-yellow-400 to-orange-500';
        case 'yönetici':
          return 'bg-gradient-to-br from-purple-500 to-pink-500';
        default:
          return 'bg-gradient-to-br from-blue-500 to-teal-500';
      }
    };

    const getCardBorder = (role) => {
      switch (role) {
        case 'admin':
          return 'border-2 border-yellow-400 shadow-yellow-100 hover:border-yellow-500';
        case 'yönetici':
          return 'border-2 border-purple-400 shadow-purple-100 hover:border-purple-500';
        default:
          return 'border border-gray-100 hover:border-blue-200';
      }
    };

    return (
      <div className={`group bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col ${getCardBorder(user.role)}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md ${getAvatarColor(user.role)}`}>
              {getInitials(user.full_name || user.username)}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{user.full_name || user.username || 'Kullanıcı'}</h3>
              <p className="text-sm text-gray-600 mb-1">{user.email}</p>
              {user.full_name && <p className="text-xs text-gray-500 font-medium">@{user.username}</p>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getRoleBadge(user.role)}
            <span className={`
              px-3 py-1 rounded-full text-xs font-semibold shadow-sm
              ${user.is_active 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-red-100 text-red-800 border border-red-200'
              }
            `}>
              {user.is_active ? '✓ Aktif' : '✗ Pasif'}
            </span>
          </div>
        </div>
        
                 <div className="flex gap-2 mt-auto pt-4">
          <button
            onClick={() => handleEditUser(user)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
          >
            <Edit3 className="w-4 h-4" />
            Düzenle
          </button>
          <button
            onClick={() => handleDeleteUser(user.id)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Sil
          </button>
        </div>
      </div>
    );
  };

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  const DatabaseSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          Veritabanı Durumu
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span className="text-sm font-medium text-green-700">Bağlantı</span>
            <span className="text-sm text-green-600 flex items-center gap-1">
              <Check className="w-4 h-4" />
              Aktif
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium text-blue-700">Tablolar</span>
            <span className="text-sm text-blue-600">5</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
            <span className="text-sm font-medium text-purple-700">Son Yedekleme</span>
            <span className="text-sm text-purple-600">Bugün</span>
          </div>
        </div>
      </div>
    </div>
  );

  const SettingsSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          Sistem Ayarları
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Hızlı İşlemler</span>
            <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
              Etkinleştir
            </button>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Verileri Temizle</span>
            <button className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">
              Temizle
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const UsersSection = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Kullanıcı Yönetimi</h3>
        <button
          onClick={() => setShowAddUserModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni Kullanıcı
        </button>
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Yükleniyor...</p>
        </div>
      ) : (
        <>
          {users.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-lg border border-gray-100">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">Henüz kullanıcı yok</p>
              <p className="text-gray-600 mb-6">Yeni kullanıcı ekleyerek başlayabilirsiniz.</p>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg font-medium"
              >
                <Plus className="w-5 h-5 inline mr-2" />
                İlk Kullanıcıyı Ekle
              </button>
            </div>
          ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {users.map((user) => (
                 <UserCard key={user.id} user={user} />
               ))}
             </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
                <p className="text-gray-600">Sistem yönetimi ve kullanıcı kontrolü</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              title="Toplam Kullanıcı"
              value={users.length}
              icon={Users}
              color="bg-blue-500"
            />
            <StatCard
              title="Admin Kullanıcı"
              value={users.filter(u => u.role === 'admin').length}
              icon={Crown}
              color="bg-purple-500"
            />
            <StatCard
              title="Aktif Kullanıcı"
              value={users.filter(u => u.is_active).length}
              icon={Check}
              color="bg-green-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Menu */}
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

            {/* Main Content */}
            <div className="lg:col-span-3">
              {activeSection === 'users' && <UsersSection />}
              {activeSection === 'settings' && <SettingsSection />}
              {activeSection === 'database' && <DatabaseSection />}
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full m-4">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">Yeni Kullanıcı Ekle</h3>
            
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kullanıcı Adı</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Email otomatik olarak: kullaniciadi@gratis.com"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email otomatik olarak: <span className="font-medium">{normalizeForEmail(formData.username)}@gratis.com</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ad Soyad</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Şifre</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="kullanıcı">Kullanıcı</option>
                  <option value="yönetici">Yönetici</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
                <select
                  name="is_active"
                  value={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="true">Aktif</option>
                  <option value="false">Pasif</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  disabled={loading}
                >
                  {loading ? 'Ekleniyor...' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full m-4">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">Kullanıcı Düzenle</h3>
            
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kullanıcı Adı</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Email otomatik olarak: kullaniciadi@gratis.com"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email otomatik olarak: <span className="font-medium">{normalizeForEmail(formData.username)}@gratis.com</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ad Soyad</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Şifre (Değiştirmek istemiyorsanız boş bırakın)</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Yeni şifre (isteğe bağlı)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="kullanıcı">Kullanıcı</option>
                  <option value="yönetici">Yönetici</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
                <select
                  name="is_active"
                  value={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.value === 'true' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="true">Aktif</option>
                  <option value="false">Pasif</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  disabled={loading}
                >
                  {loading ? 'Güncelleniyor...' : 'Güncelle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel; 