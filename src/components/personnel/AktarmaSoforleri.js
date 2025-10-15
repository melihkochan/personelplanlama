import React, { useState, useEffect } from 'react';
import { Search, Users, Filter, UserCheck, MapPin, Calendar, Plus, Trash2, Sun, Moon, BarChart3, Car, Truck, Edit, Download } from 'lucide-react';
import { supabase } from '../../services/supabase';
import * as XLSX from 'xlsx';

const AktarmaSoforleri = ({ userRole, currentUser }) => {
  const [personnelData, setPersonnelData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [bolgeFilter, setBolgeFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('table');
  
  // Modal states
  const [showAddPersonnelModal, setShowAddPersonnelModal] = useState(false);
  const [showEditPersonnelModal, setShowEditPersonnelModal] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const [showEditPasswordModal, setShowEditPasswordModal] = useState(false);
  const [editAdminPassword, setEditAdminPassword] = useState('');

  const [formData, setFormData] = useState({
    sicil: '',
    ad_soyad: '',
    depo: '',
    bolge: '',
    kullanici_adi: '',
    sifre: '',
    durum: 'aktif'
  });

  // Veritabanından aktarma şoförlerini yükle
  const loadPersonnelData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('aktarma_soforleri')
        .select('*')
        .order('bolge', { ascending: true })
        .order('ad_soyad', { ascending: true });

      if (error) throw error;
      setPersonnelData(data || []);
    } catch (error) {
      console.error('Aktarma şoförleri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersonnelData();
  }, []);


  // Filtreleme
  const filteredPersonel = personnelData.filter(personel => {
    const matchesSearch = personel.ad_soyad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         personel.sicil?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         personel.kullanici_adi?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBolge = bolgeFilter === 'ALL' || personel.bolge === bolgeFilter;
    
    return matchesSearch && matchesBolge;
  });

  // Bölge listesi
  const bolgeler = [...new Set(personnelData.map(p => p.bolge).filter(Boolean))];

  // İstatistikler
  const toplamSofor = personnelData.length;
  const aktifSofor = personnelData.filter(p => p.durum === 'aktif').length;
  const pasifSofor = personnelData.filter(p => p.durum === 'pasif').length;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Admin yetkisi kontrolü
  const isAdmin = userRole === 'admin' || userRole === 'yönetici' || userRole === 'yonetici';

  // Şifre görüntüleme fonksiyonu
  const handleShowPassword = (person) => {
    setSelectedPersonnel(person);
    setShowPasswordModal(true);
    setAdminPassword('');
  };

  // Admin şifre doğrulama
  const handlePasswordVerification = () => {
    if (adminPassword === '14') {
      setShowPassword(true);
      setShowPasswordModal(false);
    } else {
      alert('Yanlış admin şifresi!');
      setAdminPassword('');
    }
  };

  // Toplu şifre görüntüleme
  const handleShowAllPasswords = () => {
    setShowPasswordModal(true);
    setSelectedPersonnel(null);
    setAdminPassword('');
  };

  // Toplu şifre doğrulama
  const handleAllPasswordVerification = () => {
    if (adminPassword === '14') {
      setShowAllPasswords(true);
      setShowPasswordModal(false);
    } else {
      alert('Yanlış admin şifresi!');
      setAdminPassword('');
    }
  };

  // Düzenleme için şifre doğrulama
  const handleEditPasswordVerification = () => {
    if (editAdminPassword === '14') {
      setShowEditPersonnelModal(true);
      setShowEditPasswordModal(false);
    } else {
      alert('Yanlış admin şifresi!');
      setEditAdminPassword('');
    }
  };

  // Excel indirme fonksiyonu
  const handleExcelDownload = () => {
    if (!isAdmin) {
      alert('Bu işlem için admin yetkisi gereklidir!');
      return;
    }

    // Excel verilerini hazırla
    const excelData = personnelData.map((person, index) => ({
      'Sıra No': index + 1,
      'Sicil': person.sicil || '',
      'Ad Soyad': person.ad_soyad || '',
      'Depo': person.depo || '',
      'Bölge': person.bolge || '',
      'Kullanıcı Adı': person.kullanici_adi || '',
      'Şifre': person.sifre || '',
      'Durum': person.durum || '',
      'Oluşturulma Tarihi': person.created_at ? new Date(person.created_at).toLocaleDateString('tr-TR') : '',
      'Güncellenme Tarihi': person.updated_at ? new Date(person.updated_at).toLocaleDateString('tr-TR') : ''
    }));

    // Workbook oluştur
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Sütun genişliklerini ayarla
    const columnWidths = [
      { wch: 8 },   // Sıra No
      { wch: 12 },  // Sicil
      { wch: 25 },  // Ad Soyad
      { wch: 20 },  // Depo
      { wch: 15 },  // Bölge
      { wch: 20 },  // Kullanıcı Adı
      { wch: 15 },  // Şifre
      { wch: 10 },  // Durum
      { wch: 18 },  // Oluşturulma Tarihi
      { wch: 18 }   // Güncellenme Tarihi
    ];
    worksheet['!cols'] = columnWidths;

    // Başlık satırını stilize et
    const headerStyle = {
      font: { name: 'Calibri', sz: 8, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '366092' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
      }
    };

    // Veri satırlarını stilize et
    const dataStyle = {
      font: { name: 'Calibri', sz: 8 },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'CCCCCC' } },
        bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
        left: { style: 'thin', color: { rgb: 'CCCCCC' } },
        right: { style: 'thin', color: { rgb: 'CCCCCC' } }
      }
    };

    // Başlık satırına stil uygula
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = headerStyle;
    }

    // Veri satırlarına stil uygula
    for (let row = 1; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellAddress]) continue;
        worksheet[cellAddress].s = dataStyle;
      }
    }

    // Worksheet'i workbook'a ekle
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Aktarma Şoförleri');

    // Dosyayı indir
    const fileName = `Aktarma_Soforleri_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    alert('Excel dosyası başarıyla indirildi!');
  };

  // Düzenleme fonksiyonları
  const handleEditPersonnel = (person) => {
    if (!isAdmin) {
      alert('Bu işlem için admin yetkisi gereklidir!');
      return;
    }
    
    setEditingPersonnel(person);
    setFormData({
      sicil: person.sicil || '',
      ad_soyad: person.ad_soyad || '',
      depo: person.depo || '',
      bolge: person.bolge || '',
      kullanici_adi: person.kullanici_adi || '',
      sifre: person.sifre || '',
      durum: person.durum || 'aktif'
    });
    setShowEditPasswordModal(true);
  };

  const handleUpdatePersonnel = async (e) => {
    e.preventDefault();
    if (!editingPersonnel) return;

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('aktarma_soforleri')
        .update({
          sicil: formData.sicil,
          ad_soyad: formData.ad_soyad,
          depo: formData.depo,
          bolge: formData.bolge,
          kullanici_adi: formData.kullanici_adi,
          sifre: formData.sifre,
          durum: formData.durum,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPersonnel.id);

      if (error) throw error;

      setShowEditPersonnelModal(false);
      setEditingPersonnel(null);
      setFormData({
        sicil: '',
        ad_soyad: '',
        depo: '',
        bolge: '',
        kullanici_adi: '',
        sifre: '',
        durum: 'aktif'
      });
      
      await loadPersonnelData();
      alert('Aktarma şoförü başarıyla güncellendi!');
    } catch (error) {
      console.error('Güncelleme hatası:', error);
      alert('Güncellenirken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Personel ekleme
  const handleAddPersonnel = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Bu işlem için admin yetkisi gereklidir!');
      return;
    }
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('aktarma_soforleri')
        .insert([{
          sicil: formData.sicil,
          ad_soyad: formData.ad_soyad,
          depo: formData.depo,
          bolge: formData.bolge,
          kullanici_adi: formData.kullanici_adi,
          sifre: formData.sifre,
          durum: formData.durum
        }]);

      if (error) throw error;

      setShowAddPersonnelModal(false);
      setFormData({
        sicil: '',
        ad_soyad: '',
        depo: '',
        bolge: '',
        kullanici_adi: '',
        sifre: '',
        durum: 'aktif'
      });
      
      await loadPersonnelData();
      alert('Aktarma şoförü başarıyla eklendi!');
    } catch (error) {
      console.error('Ekleme hatası:', error);
      alert('Eklenirken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Personel silme
  const handleDeletePersonnel = async (id) => {
    if (!isAdmin) {
      alert('Bu işlem için admin yetkisi gereklidir!');
      return;
    }
    
    if (!window.confirm('Bu aktarma şoförünü silmek istediğinizden emin misiniz?')) {
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('aktarma_soforleri')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadPersonnelData();
      alert('Aktarma şoförü başarıyla silindi!');
    } catch (error) {
      console.error('Silme hatası:', error);
      alert('Silinirken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Durum badge'i
  const getDurumBadge = (durum) => {
    if (durum === 'aktif') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
          Aktif
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
          Pasif
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Aktarma şoförleri yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
              Aktarma Şoförleri
            </h1>
            <p className="text-sm text-gray-600 mt-1">Sisteme kayıtlı {personnelData.length} aktarma şoförü</p>
          </div>
          
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowAddPersonnelModal(true)}
                className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:from-orange-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm"
              >
                <Plus className="w-4 h-4" />
                Şoför Ekle
              </button>
            )}
            
            {isAdmin && (
              <button
                onClick={handleShowAllPasswords}
                className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:from-purple-600 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm"
              >
                <Search className="w-4 h-4" />
                Tüm Şifreleri Göster
              </button>
            )}
            
            {isAdmin && (
              <button
                onClick={handleExcelDownload}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm"
              >
                <Download className="w-4 h-4" />
                Excel İndir
              </button>
            )}
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Şoför adı, sicil no veya kullanıcı adı ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 text-sm"
            />
          </div>
          
          {/* Bölge Filter */}
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setBolgeFilter('ALL')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-300 ${
                  bolgeFilter === 'ALL'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MapPin className="w-3 h-3" />
                Tümü
              </button>
              {bolgeler.map(bolge => (
                <button
                  key={bolge}
                  onClick={() => setBolgeFilter(bolge)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-300 ${
                    bolgeFilter === bolge
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {bolge}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-orange-900">{toplamSofor}</p>
                <p className="text-xs text-orange-600">Toplam Şoför</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-green-900">{aktifSofor}</p>
                <p className="text-xs text-green-600">Aktif Şoför</p>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-red-900">{pasifSofor}</p>
                <p className="text-xs text-red-600">Pasif Şoför</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setViewMode('cards')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-sm ${
            viewMode === 'cards' 
              ? 'bg-orange-500 text-white' 
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}
        >
          Kart Görünümü
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors text-sm ${
            viewMode === 'table' 
              ? 'bg-orange-500 text-white' 
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}
        >
          Tablo Görünümü
        </button>
      </div>
      
      {/* Personnel Cards */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPersonel.map((person, index) => (
            <div key={index} className="relative bg-white rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-t-4 border-orange-500">
              <div className="absolute -top-2 left-4">
                <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-500 text-white">
                  <Truck className="w-3 h-3" />
                  Aktarma Şoförü
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-3 mt-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{person.ad_soyad}</h3>
                    <p className="text-gray-600 text-xs">#{person.sicil}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button
                      onClick={() => handleShowPassword(person)}
                      className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                      title="Şifreyi görüntüle"
                    >
                      <Search className="w-3 h-3" />
                    </button>
                  )}
                  
                  {isAdmin && (
                    <button
                      onClick={() => handleEditPersonnel(person)}
                      className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                      title="Şoför düzenle"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                  )}
                  
                  {isAdmin && (
                    <button
                      onClick={() => handleDeletePersonnel(person.id)}
                      className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      title="Şoför sil"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Depo:</span>
                  <span className="text-xs font-medium text-gray-900">{person.depo || '-'}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Bölge:</span>
                  <span className="text-xs font-medium text-gray-900">{person.bolge || '-'}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Kullanıcı Adı:</span>
                  <span className="text-xs font-medium text-gray-900">{person.kullanici_adi || '-'}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Şifre:</span>
                  <span className="text-xs font-medium text-gray-900">
                    {(showPassword && selectedPersonnel?.id === person.id) || showAllPasswords
                      ? person.sifre || '-' 
                      : '••••••••'
                    }
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Durum:</span>
                  {getDurumBadge(person.durum)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
        
      {/* Personnel Table */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">#</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">Sicil</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">Ad Soyad</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">Depo</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">Bölge</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">Kullanıcı Adı</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">Şifre</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">Durum</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900 text-xs">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredPersonel.map((person, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-600 text-xs">{index + 1}</td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900 text-xs">{person.sicil}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                          <Truck className="w-3 h-3 text-white" />
                        </div>
                        <span className="font-medium text-gray-900 text-xs">{person.ad_soyad}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-900">{person.depo || '-'}</td>
                    <td className="py-3 px-4 text-xs text-gray-900">{person.bolge || '-'}</td>
                    <td className="py-3 px-4 text-xs text-gray-900">{person.kullanici_adi || '-'}</td>
                    <td className="py-3 px-4 text-xs text-gray-900">
                      {(showPassword && selectedPersonnel?.id === person.id) || showAllPasswords
                        ? person.sifre || '-' 
                        : '••••••••'
                      }
                    </td>
                    <td className="py-3 px-4">
                      {getDurumBadge(person.durum)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {isAdmin && (
                          <button
                            onClick={() => handleShowPassword(person)}
                            className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                            title="Şifreyi görüntüle"
                          >
                            <Search className="w-3 h-3" />
                          </button>
                        )}
                        
                        {isAdmin && (
                          <button
                            onClick={() => handleEditPersonnel(person)}
                            className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                            title="Şoför düzenle"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        )}
                        
                        {isAdmin && (
                          <button
                            onClick={() => handleDeletePersonnel(person.id)}
                            className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                            title="Şoför sil"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
              
      {filteredPersonel.length === 0 && (
        <div className="text-center py-12">
          <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Aktarma şoförü bulunamadı</p>
        </div>
      )}

      {/* Add Personnel Modal */}
      {showAddPersonnelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full m-4">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">Yeni Aktarma Şoförü Ekle</h3>
            
            <form onSubmit={handleAddPersonnel} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sicil</label>
                <input
                  type="text"
                  name="sicil"
                  value={formData.sicil}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ad Soyad</label>
                <input
                  type="text"
                  name="ad_soyad"
                  value={formData.ad_soyad}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Depo</label>
                <input
                  type="text"
                  name="depo"
                  value={formData.depo}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bölge</label>
                <input
                  type="text"
                  name="bolge"
                  value={formData.bolge}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kullanıcı Adı</label>
                <input
                  type="text"
                  name="kullanici_adi"
                  value={formData.kullanici_adi}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Şifre</label>
                <input
                  type="password"
                  name="sifre"
                  value={formData.sifre}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
                <select
                  name="durum"
                  value={formData.durum}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="aktif">Aktif</option>
                  <option value="pasif">Pasif</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddPersonnelModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Personnel Modal */}
      {showEditPersonnelModal && editingPersonnel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full m-4">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">Aktarma Şoförü Düzenle</h3>
            
            <form onSubmit={handleUpdatePersonnel} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sicil</label>
                <input
                  type="text"
                  name="sicil"
                  value={formData.sicil}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ad Soyad</label>
                <input
                  type="text"
                  name="ad_soyad"
                  value={formData.ad_soyad}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Depo</label>
                <input
                  type="text"
                  name="depo"
                  value={formData.depo}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bölge</label>
                <input
                  type="text"
                  name="bolge"
                  value={formData.bolge}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kullanıcı Adı</label>
                <input
                  type="text"
                  name="kullanici_adi"
                  value={formData.kullanici_adi}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Şifre</label>
                <input
                  type="password"
                  name="sifre"
                  value={formData.sifre}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
                <select
                  name="durum"
                  value={formData.durum}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="aktif">Aktif</option>
                  <option value="pasif">Pasif</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditPersonnelModal(false);
                    setEditingPersonnel(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Şifre Doğrulama Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full m-4">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">Admin Şifre Doğrulama</h3>
            <p className="text-gray-600 mb-4">
              {selectedPersonnel 
                ? <><strong>{selectedPersonnel.ad_soyad}</strong> kullanıcısının şifresini görüntülemek için admin şifresini girin.</>
                : <>Tüm şifreleri görüntülemek için admin şifresini girin.</>
              }
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin Şifresi</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Admin şifresini girin"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      selectedPersonnel ? handlePasswordVerification() : handleAllPasswordVerification();
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setSelectedPersonnel(null);
                  setAdminPassword('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={selectedPersonnel ? handlePasswordVerification : handleAllPasswordVerification}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Doğrula
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Düzenleme için Admin Şifre Doğrulama Modal */}
      {showEditPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full m-4">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">Admin Şifre Doğrulama</h3>
            <p className="text-gray-600 mb-4">
              <strong>{editingPersonnel?.ad_soyad}</strong> kullanıcısını düzenlemek için admin şifresini girin.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin Şifresi</label>
                <input
                  type="password"
                  value={editAdminPassword}
                  onChange={(e) => setEditAdminPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Admin şifresini girin"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleEditPasswordVerification();
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowEditPasswordModal(false);
                  setEditingPersonnel(null);
                  setEditAdminPassword('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleEditPasswordVerification}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Doğrula
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AktarmaSoforleri;
