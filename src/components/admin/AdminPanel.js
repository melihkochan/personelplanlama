import React, { useState, useEffect } from 'react';
import { Shield, Users, Settings, Database, AlertTriangle, Check, X, Plus, Edit3, Trash2, User, Crown, Star, Upload, CheckCircle, XCircle, Activity, Clock, Filter, Search, Calendar, Eye, FileText, RefreshCw, UserPlus, MessageCircle, UserCheck } from 'lucide-react';
import { getAllUsers, addUserWithAudit, updateUserWithAudit, deleteUserWithAudit, resendConfirmationEmail, deleteAllPerformanceDataWithAudit, clearAllShiftDataWithAudit, getAuditLogs, getAuditLogStats, getPendingRegistrations, getPendingRegistrationsCount, approveRegistration, rejectRegistration, supabase } from '../../services/supabase';
import * as XLSX from 'xlsx';

const AdminPanel = ({ userRole, currentUser }) => {
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
  
  // Performans verilerini temizleme state'i
  const [deletingPerformanceData, setDeletingPerformanceData] = useState(false);
  
  // Personel kontrol verilerini temizleme state'i
  const [deletingShiftData, setDeletingShiftData] = useState(false);
  
  // Şifre değiştirme modal'ı için state
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordChangeData, setPasswordChangeData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Audit Log state'leri
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditStats, setAuditStats] = useState({});
  const [auditFilters, setAuditFilters] = useState({
    userEmail: '',
    action: '',
    tableName: '',
    dateFrom: '',
    dateTo: '',
    limit: 50
  });
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);

  // Pending Registrations state'leri
  const [pendingRegistrations, setPendingRegistrations] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loadingPendingRegistrations, setLoadingPendingRegistrations] = useState(false);


  // Mevcut kullanıcının email'ini al
  const getCurrentUserEmail = () => {
    return currentUser?.email;
  };

  // Şifre değiştirme fonksiyonu
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordChangeData.newPassword !== passwordChangeData.confirmPassword) {
      alert('❌ Hata!\n\nYeni şifreler eşleşmiyor.');
      return;
    }
    
    if (passwordChangeData.newPassword.length < 6) {
      alert('❌ Hata!\n\nYeni şifre en az 6 karakter olmalıdır.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Mevcut kullanıcının ID'sini bul
      const currentUserData = users.find(u => u.email === getCurrentUserEmail());
      if (!currentUserData) {
        alert('❌ Hata!\n\nKullanıcı bilgileri bulunamadı.');
        return;
      }
      
      const result = await updateUserWithAudit(currentUserData.id, {
        password: passwordChangeData.newPassword
      });
      
      if (result.success) {
        setShowChangePasswordModal(false);
        setPasswordChangeData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        alert('✅ Başarılı!\n\nŞifreniz başarıyla değiştirildi.');
      } else {
        alert('❌ Hata!\n\nŞifre değiştirilemedi: ' + result.error);
      }
    } catch (error) {
      alert('❌ Hata!\n\nŞifre değiştirme hatası: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Şifre değiştirme input değişikliklerini yönet
  const handlePasswordChangeInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordChangeData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Verileri yükle
  useEffect(() => {
    loadUsers();
    loadPendingRegistrations();
    loadPendingCount();
  }, []);

  // Pending registrations section'ına geçildiğinde verileri yenile
  useEffect(() => {
    if (activeSection === 'pending_registrations') {
      loadPendingRegistrations();
      loadPendingCount();
    }
  }, [activeSection]);

  // Real-time users güncelleme
  useEffect(() => {
    if (!currentUser?.id) return;

    const subscription = supabase
      .channel('users_updates')
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users'
        },
        (payload) => {
          // Sadece online status değişikliklerini dinle
          if (payload.new.is_online !== payload.old.is_online || 
              payload.new.last_seen !== payload.old.last_seen) {
            loadUsers(); // Kullanıcı listesini yenile
          }
        }
      )
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'users'
        },
        (payload) => {
          loadUsers(); // Kullanıcı listesini yenile
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser?.id]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await getAllUsers();
      if (result.success) {
        // Role göre sıralama: admin -> yönetici -> kullanıcı
        const sortedUsers = result.data.sort((a, b) => {
          const roleOrder = { 'admin': 1, 'yönetici': 2, 'kullanıcı': 3 };
          const roleA = roleOrder[a.role] || 4;
          const roleB = roleOrder[b.role] || 4;
          return roleA - roleB;
        });
        setUsers(sortedUsers);
      } else {
        console.error('❌ Kullanıcılar yüklenemedi:', result.error);
      }
    } catch (error) {
      console.error('❌ Kullanıcı yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Pending registrations fonksiyonları
  const loadPendingRegistrations = async () => {
    setLoadingPendingRegistrations(true);
    try {
      const result = await getPendingRegistrations();
      
      if (result.success) {
        setPendingRegistrations(result.data || []);
      } else {
        console.error('❌ Pending registrations yüklenemedi:', result.error);
        setPendingRegistrations([]);
      }
    } catch (error) {
      console.error('❌ Pending registrations yükleme hatası:', error);
      setPendingRegistrations([]);
    } finally {
      setLoadingPendingRegistrations(false);
    }
  };

  const loadPendingCount = async () => {
    try {
      const result = await getPendingRegistrationsCount();
      if (result.success) {
        setPendingCount(result.count);
      }
    } catch (error) {
      console.error('Pending count yükleme hatası:', error);
    }
  };

  const handleApproveRegistration = async (pendingRegId) => {
    try {
      const result = await approveRegistration(pendingRegId, currentUser);
      if (result.success) {
        alert('✅ Kullanıcı başarıyla onaylandı!');
        loadPendingRegistrations();
        loadPendingCount();
        loadUsers(); // Kullanıcı listesini yenile
      } else {
        alert('❌ Onaylama hatası: ' + result.error);
      }
    } catch (error) {
      alert('❌ Onaylama hatası: ' + error.message);
    }
  };

  const handleRejectRegistration = async (pendingRegId) => {
    if (!confirm('❓ Bu kayıt isteğini reddetmek istediğinizden emin misiniz?')) {
      return;
    }
    
    try {
      const result = await rejectRegistration(pendingRegId, currentUser);
      if (result.success) {
        alert('✅ Kayıt isteği reddedildi!');
        loadPendingRegistrations();
        loadPendingCount();
      } else {
        alert('❌ Reddetme hatası: ' + result.error);
      }
    } catch (error) {
      alert('❌ Reddetme hatası: ' + error.message);
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
      
      const result = await addUserWithAudit(userDataWithEmail, currentUser);
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
    // Kullanıcı kendi hesabını düzenleyemez
    if (user.email === getCurrentUserEmail()) {
      alert('❌ Güvenlik Uyarısı!\n\nKendi hesabınızı bu panelden düzenleyemezsiniz. Bu güvenlik önlemidir.');
      return;
    }
    
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
      // Admin olmayan kullanıcılar mevcut admin kullanıcısını düzenleyemez
      if (userRole !== 'admin' && editingUser?.role === 'admin') {
        alert('❌ Yetki Hatası!\n\nSadece admin kullanıcılar admin yetkilerini değiştirebilir.');
        setLoading(false);
        return;
      }
      
      // Şifre boşsa güncelleme verilerinden çıkar
      const updateData = { ...formData };
      if (!updateData.password || updateData.password.trim() === '') {
        delete updateData.password;
      }
      
      // Email'i otomatik olarak oluştur - Türkçe karakterleri normalize et
      const normalizedUsername = normalizeForEmail(formData.username);
      updateData.email = `${normalizedUsername}@gratis.com`;
      
      const result = await updateUserWithAudit(editingUser.id, updateData, currentUser);
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
    // Kullanıcının silinmeye çalışılan hesabın email'ini bul
    const userToDelete = users.find(u => u.id === userId);
    if (userToDelete && userToDelete.email === getCurrentUserEmail()) {
      alert('❌ Güvenlik Uyarısı!\n\nKendi hesabınızı silemezsiniz. Bu güvenlik önlemidir.');
      return;
    }
    
    if (window.confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
      setLoading(true);
      
      try {
        const result = await deleteUserWithAudit(userId, currentUser);
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

  // Tüm performans verilerini sil
  const handleDeleteAllPerformanceData = async () => {
    const confirmMessage = `⚠️ DİKKAT: Bu işlem TÜM performans verilerini kalıcı olarak silecek!

Bu işlem:
• Tüm personel performans kayıtlarını silecek
• Tüm analiz verilerini silecek  
• Bu işlem GERİ ALINAMAZ!

Devam etmek istediğinizden emin misiniz?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    // İkinci onay
    const secondConfirm = window.confirm('❗ SON UYARI: Tüm performans verileri silinecek. Bu işlem geri alınamaz!\n\nDevam etmek için "Tamam"a basın.');
    if (!secondConfirm) {
      return;
    }

    setDeletingPerformanceData(true);

    try {
      const result = await deleteAllPerformanceDataWithAudit(currentUser);
      
      if (result.success) {
        alert(`✅ Başarılı!\n\n${result.message}\n\nSayfa yenilenecek.`);
        // Sayfayı yenile
        window.location.reload();
      } else {
        alert(`❌ Hata!\n\nPerformans verileri silinemedi:\n${result.error}`);
        console.error('❌ Performans verisi silme hatası:', result);
      }
    } catch (error) {
      console.error('❌ Performans verisi silme genel hatası:', error);
      alert(`❌ Beklenmeyen Hata!\n\nPerformans verileri silinemedi:\n${error.message}`);
    } finally {
      setDeletingPerformanceData(false);
    }
  };

  // Tüm personel kontrol verilerini sil
  const handleDeleteAllShiftData = async () => {
    const confirmMessage = `⚠️ DİKKAT: Bu işlem TÜM personel kontrol verilerini kalıcı olarak silecek!

Bu işlem:
• Tüm vardiya programlarını silecek
• Tüm istatistikleri sıfırlayacak
• Tüm günlük kayıtları silecek
• Tüm haftalık dönemleri silecek
• Bu işlem GERİ ALINAMAZ!

Devam etmek istediğinizden emin misiniz?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    // İkinci onay
    const secondConfirm = window.confirm('❗ SON UYARI: Tüm personel kontrol verileri silinecek. Bu işlem geri alınamaz!\n\nDevam etmek için "Tamam"a basın.');
    if (!secondConfirm) {
      return;
    }

    setDeletingShiftData(true);

    try {
      const result = await clearAllShiftDataWithAudit(currentUser);
      
      if (result.success) {
        alert(`✅ Başarılı!\n\nTüm personel kontrol verileri başarıyla silindi.\n\nSayfa yenilenecek.`);
        // Sayfayı yenile
        window.location.reload();
      } else {
        alert(`❌ Hata!\n\nPersonel kontrol verileri silinemedi:\n${result.error}`);
        console.error('❌ Personel kontrol verisi silme hatası:', result);
      }
    } catch (error) {
      console.error('❌ Personel kontrol verisi silme genel hatası:', error);
      alert(`❌ Beklenmeyen Hata!\n\nPersonel kontrol verileri silinemedi:\n${error.message}`);
    } finally {
      setDeletingShiftData(false);
    }
  };

  const MenuButton = ({ id, icon: Icon, label, active, onClick, count }) => (
    <button
      onClick={() => onClick(id)}
      className={`
        flex items-center gap-2 w-full px-3 py-2 rounded-lg transition-all duration-200 text-sm
        ${active 
          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' 
          : 'text-gray-600 hover:bg-gray-100'
        }
      `}
    >
      <Icon className="w-4 h-4" />
      <span className="font-medium">{label}</span>
      {count > 0 && (
        <span className={`
          ml-auto px-2 py-1 rounded-full text-xs font-bold
          ${active 
            ? 'bg-white text-blue-600' 
            : 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-md'
          }
        `}>
          {count}
        </span>
      )}
    </button>
  );

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-3 h-3 text-yellow-600" />;
      case 'yönetici':
        return <Star className="w-3 h-3 text-purple-600" />;
      default:
        return <User className="w-3 h-3 text-blue-600" />;
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg">
            <Crown className="w-3 h-3 mr-1" />
            Admin
          </span>
        );
      case 'yönetici':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg">
            <Star className="w-3 h-3 mr-1" />
            Yönetici
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-teal-500 text-white shadow-lg">
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
      <div className={`group bg-white rounded-xl p-4 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 h-full flex flex-col ${getCardBorder(user.role)}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base shadow-md ${getAvatarColor(user.role)}`}>
              {getInitials(user.full_name || user.username)}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">{user.full_name || user.username || 'Kullanıcı'}</h3>
              <p className="text-xs text-gray-600 mb-1">{user.email}</p>
              {user.full_name && <p className="text-xs text-gray-500 font-medium">@{user.username}</p>}
              
              {/* Online Status ve Last Seen */}
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${user.is_online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className={`text-xs font-medium ${user.is_online ? 'text-green-600' : 'text-gray-500'}`}>
                  {user.is_online ? 'Çevrimiçi' : user.last_seen ? `Son görülme: ${new Date(user.last_seen).toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}` : 'Hiç görülmedi'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getRoleBadge(user.role)}
            <span className={`
              px-2 py-1 rounded-full text-xs font-semibold shadow-sm
              ${user.is_active 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-red-100 text-red-800 border border-red-200'
              }
            `}>
              {user.is_active ? '✓ Aktif' : '✗ Pasif'}
            </span>
          </div>
        </div>
        
                 <div className="flex gap-2 mt-auto pt-3">
          {user.email !== getCurrentUserEmail() ? (
            <>
              <button
                onClick={() => handleEditUser(user)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium text-xs"
              >
                <Edit3 className="w-3 h-3" />
                Düzenle
              </button>
              <button
                onClick={() => handleDeleteUser(user.id)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium text-xs"
              >
                <Trash2 className="w-3 h-3" />
                Sil
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowChangePasswordModal(true)}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium text-xs"
            >
              <User className="w-3 h-3" />
              Şifre Değiştir
            </button>
          )}
        </div>
      </div>
    );
  };

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-600 mb-1">{title}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );

  const DatabaseSection = () => {
    const [dbStats, setDbStats] = useState({
      connection: 'Aktif',
      tables: 7,
      lastBackup: new Date().toLocaleDateString('tr-TR'),
      totalRecords: 0
    });

    useEffect(() => {
      // Veritabanı istatistiklerini yükle
      const loadDatabaseStats = async () => {
        try {
          // Burada gerçek veritabanı istatistiklerini çekebiliriz
          // Şimdilik varsayılan değerler kullanıyoruz
          setDbStats({
            connection: 'Aktif',
            tables: 7, // personnel, vehicles, stores, weekly_periods, weekly_schedules, performance_data, daily_notes
            lastBackup: new Date().toLocaleDateString('tr-TR'),
            totalRecords: users.length
          });
        } catch (error) {
          console.error('Veritabanı istatistikleri yüklenirken hata:', error);
        }
      };

      loadDatabaseStats();
    }, [users.length]);

    return (
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
                {dbStats.connection}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-700">Tablolar</span>
              <span className="text-sm text-blue-600">{dbStats.tables}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium text-purple-700">Son Yedekleme</span>
              <span className="text-sm text-purple-600">{dbStats.lastBackup}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <span className="text-sm font-medium text-orange-700">Toplam Kayıt</span>
              <span className="text-sm text-orange-600">{dbStats.totalRecords}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SettingsSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          Sistem Ayarları
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="text-sm font-medium text-gray-700">Performans Verilerini Temizle</span>
              <p className="text-xs text-gray-500 mt-1">Tüm performans analizi verilerini kalıcı olarak siler</p>
            </div>
            <button 
              onClick={handleDeleteAllPerformanceData}
              disabled={deletingPerformanceData}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deletingPerformanceData ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Siliniyor...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Temizle</span>
                </>
              )}
            </button>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="text-sm font-medium text-gray-700">Personel Kontrol Verilerini Temizle</span>
              <p className="text-xs text-gray-500 mt-1">Tüm vardiya programları, istatistikler ve günlük kayıtları kalıcı olarak siler</p>
            </div>
            <button 
              onClick={handleDeleteAllShiftData}
              disabled={deletingShiftData}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deletingShiftData ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Siliniyor...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Temizle</span>
                </>
              )}
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

  const AuditLogsSection = () => {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({});
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [availableActions, setAvailableActions] = useState([]);
    const [availableTables, setAvailableTables] = useState([]);
    const [filters, setFilters] = useState({
      userEmail: '',
      action: '',
      tableName: '',
      dateFrom: '',
      dateTo: '',
      limit: 50
    });

    useEffect(() => {
      loadAuditLogs();
      loadAuditStats();
      loadAvailableFilters();
    }, []);
    
    const loadAvailableFilters = async () => {
      try {
        // Mevcut audit loglardan kullanıcıları, action'ları ve tabloları çıkar
        const { data: allLogs, error } = await supabase
          .from('audit_logs')
          .select('user_email, user_name, action, table_name')
          .order('created_at', { ascending: false });
        
        if (error) {
          return;
        }
        
        if (allLogs && allLogs.length > 0) {
          // Benzersiz kullanıcıları çıkar
          const uniqueUsers = [...new Set(allLogs.map(log => `${log.user_name} (${log.user_email})`))];
          setAvailableUsers(uniqueUsers);
          
          // Benzersiz action'ları çıkar
          const uniqueActions = [...new Set(allLogs.map(log => log.action))];
          setAvailableActions(uniqueActions);
          
          // Benzersiz tabloları çıkar
          const uniqueTables = [...new Set(allLogs.map(log => log.table_name))];
          setAvailableTables(uniqueTables);
        }
      } catch (error) {
        // Hata durumunda sessizce devam et
      }
    };

    const loadAuditLogs = async () => {
      setLoadingLogs(true);
      try {
        const result = await getAuditLogs(filters);
        if (result.success) {
          setLogs(result.data);
        } else {
          console.error('Audit logları yüklenemedi:', result.error);
        }
      } catch (error) {
        console.error('Audit log yükleme hatası:', error);
      } finally {
        setLoadingLogs(false);
      }
    };

    const loadAuditStats = async () => {
      try {
        const result = await getAuditLogStats();
        if (result.success) {
          setStats(result.data);
        }
      } catch (error) {
        console.error('Audit stats yükleme hatası:', error);
      }
    };

    const handleFilterChange = (e) => {
      const { name, value } = e.target;
      const newFilters = {
        ...filters,
        [name]: value
      };
      
      setFilters(newFilters);
      
      // Otomatik filtreleme - dropdown değişikliklerinde
      if (name === 'userEmail' || name === 'action' || name === 'tableName') {
        // Kısa bir gecikme ile filtreleme yap (debounce)
        setTimeout(() => {
          loadAuditLogsWithFilters(newFilters);
        }, 300);
      }
      
      // Tarih filtreleri için de otomatik filtreleme
      if (name === 'dateFrom' || name === 'dateTo') {
        // Tarih değişikliklerinde biraz daha uzun gecikme
        setTimeout(() => {
          loadAuditLogsWithFilters(newFilters);
        }, 500);
      }
    };
    
    const loadAuditLogsWithFilters = async (customFilters = null) => {
      setLoadingLogs(true);
      try {
        const filtersToUse = customFilters || filters;
        const result = await getAuditLogs(filtersToUse);
        if (result.success) {
          setLogs(result.data);
        } else {
          console.error('Audit logları yüklenemedi:', result.error);
        }
      } catch (error) {
        console.error('Audit log yükleme hatası:', error);
      } finally {
        setLoadingLogs(false);
      }
    };

    const handleApplyFilters = () => {
      loadAuditLogsWithFilters();
    };

    const getActionBadge = (action) => {
      const actionMap = {
        'CREATE': { label: 'Oluşturma', color: 'bg-green-100 text-green-800' },
        'UPDATE': { label: 'Güncelleme', color: 'bg-blue-100 text-blue-800' },
        'DELETE': { label: 'Silme', color: 'bg-red-100 text-red-800' },
        'BULK_DELETE': { label: 'Toplu Silme', color: 'bg-orange-100 text-orange-800' },
        'LOGIN': { label: 'Giriş', color: 'bg-purple-100 text-purple-800' },
        'LOGOUT': { label: 'Çıkış', color: 'bg-gray-100 text-gray-800' }
      };
      
      const actionInfo = actionMap[action] || { label: action, color: 'bg-gray-100 text-gray-800' };
      
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold shadow-sm ${actionInfo.color}`}>
          {actionInfo.label}
        </span>
      );
    };

    const getTableName = (tableName) => {
      const tableMap = {
        'users': 'Kullanıcılar',
        'personnel': 'Personel',
        'vehicles': 'Araçlar',
        'stores': 'Mağazalar',
        'daily_notes': 'Günlük Notlar',
        'weekly_schedules': 'Haftalık Vardiyalar',
        'performance_data': 'Performans Verileri',
        'shift_data': 'Vardiya Verileri',
        'audit_logs': 'İşlem Geçmişi',
        'auth': 'Kimlik Doğrulama'
      };
      
      return tableMap[tableName] || tableName;
    };

    return (
      <div className="space-y-4">
        {/* İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Toplam İşlem</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCount || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500">
                <Activity className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Son 7 Gün</p>
                <p className="text-2xl font-bold text-gray-900">{stats.recentCount || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-green-500">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Aktif Kullanıcı</p>
                <p className="text-2xl font-bold text-gray-900">{stats.topUsers?.length || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Filtreler */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 mb-4">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600" />
            Filtreler
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kullanıcı</label>
              <select
                name="userEmail"
                value={filters.userEmail}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tüm Kullanıcılar</option>
                {availableUsers.map((user, index) => (
                  <option key={index} value={user.split('(')[1]?.replace(')', '') || user}>
                    {user}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İşlem Türü</label>
              <select
                name="action"
                value={filters.action}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tüm İşlemler</option>
                {availableActions.map((action, index) => (
                  <option key={index} value={action}>
                    {getActionBadge(action).props.children}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tablo</label>
              <select
                name="tableName"
                value={filters.tableName}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tüm Tablolar</option>
                {availableTables.map((table, index) => (
                  <option key={index} value={table}>
                    {getTableName(table)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
              <input
                type="date"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
              <input
                type="date"
                name="dateTo"
                value={filters.dateTo}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={handleApplyFilters}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                disabled={loadingLogs}
              >
                {loadingLogs ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Yükleniyor...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Filtrele</span>
                  </>
                )}
              </button>
            </div>
            

          </div>
        </div>


        {/* İşlem Listesi */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            İşlem Geçmişi
          </h3>
          
          {loadingLogs ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Yükleniyor...</p>
            </div>
          ) : (
            <>
              {logs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-lg font-medium text-gray-900 mb-2">İşlem geçmişi bulunamadı</p>
                  <p className="text-gray-600">Seçilen filtrelere uygun işlem bulunamadı.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Tarih
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            Kullanıcı
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center gap-1">
                            <Activity className="w-4 h-4" />
                            İşlem
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center gap-1">
                            <Database className="w-4 h-4" />
                            Tablo
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            Detay
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {logs.map((log, index) => (
                        <tr key={log.id || index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(log.created_at).toLocaleString('tr-TR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{log.user_name || log.user_email}</div>
                            <div className="text-sm text-gray-500">{log.user_email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getActionBadge(log.action)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {getTableName(log.table_name)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="max-w-xs truncate" title={log.details}>
                              {log.details}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const PendingRegistrationsSection = () => {
    const formatDate = (dateString) => {
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          return 'Tarih bilgisi yok';
        }
        
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          return 'Bugün';
        } else if (diffDays === 2) {
          return 'Dün';
        } else if (diffDays <= 7) {
          return `${diffDays - 1} gün önce`;
        } else {
          return date.toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      } catch (error) {
        return 'Tarih bilgisi yok';
      }
    };
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Bekleyen Kullanıcı İstekleri</h3>
                <p className="text-sm text-gray-600">Onay bekleyen kayıt istekleri</p>
              </div>
            </div>
          </div>

          {loadingPendingRegistrations ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : pendingRegistrations.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Bekleyen kayıt isteği bulunmuyor</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRegistrations.map((registration) => (
                <div key={registration.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{registration.fullName}</h4>
                          <p className="text-sm text-gray-600">@{registration.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Rol: {registration.role}</span>
                        <span>•</span>
                        <span>Tarih: {formatDate(registration.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveRegistration(registration.id)}
                        className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Onayla
                      </button>
                      <button
                        onClick={() => handleRejectRegistration(registration.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1"
                      >
                        <X className="w-4 h-4" />
                        Reddet
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="h-full">
        {/* Bilgilendirme Banner */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 shadow-lg">
          <div className="flex items-center gap-3 text-white">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Yönetim Paneli</h3>
              <p className="text-xs text-blue-100">Bu sayfaya sadece Admin ve Yönetici kullanıcıları erişebilir. Sistem yönetimi ve kullanıcı kontrolü için kullanılır.</p>
            </div>
            <div className="ml-auto">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                userRole === 'admin' 
                  ? 'bg-yellow-400 text-yellow-900' 
                  : 'bg-purple-400 text-purple-900'
              }`}>
                {userRole === 'admin' ? '👑 Admin' : '⭐ Yönetici'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
                <p className="text-gray-600">Sistem yönetimi ve kullanıcı kontrolü</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
              <MenuButton
                id="audit_logs"
                icon={Activity}
                label="İşlem Geçmişi"
                active={activeSection === 'audit_logs'}
                onClick={setActiveSection}
              />
              <MenuButton
                id="pending_registrations"
                icon={UserPlus}
                label="Bekleyen Onaylar"
                active={activeSection === 'pending_registrations'}
                onClick={setActiveSection}
                count={pendingCount}
              />

            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {activeSection === 'users' && (
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
              )}
              {activeSection === 'settings' && <SettingsSection />}
              {activeSection === 'database' && <DatabaseSection />}
              {activeSection === 'audit_logs' && <AuditLogsSection />}
              {activeSection === 'pending_registrations' && (
                <PendingRegistrationsSection />
              )}
              
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
                  {userRole === 'admin' && <option value="admin">Admin</option>}
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
                  {userRole === 'admin' && <option value="admin">Admin</option>}
                </select>
                {userRole !== 'admin' && editingUser?.role === 'admin' && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ Bu kullanıcı admin. Sadece admin'ler admin yetkilerini değiştirebilir.
                  </p>
                )}
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

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full m-4">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">Şifre Değiştir</h3>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mevcut Şifre</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordChangeData.currentPassword}
                  onChange={handlePasswordChangeInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Yeni Şifre</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordChangeData.newPassword}
                  onChange={handlePasswordChangeInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Yeni Şifre Tekrar</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordChangeData.confirmPassword}
                  onChange={handlePasswordChangeInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  disabled={loading}
                >
                  {loading ? 'Şifre Değiştiriliyor...' : 'Şifre Değiştir'}
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