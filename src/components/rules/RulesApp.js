import React from 'react';
import { Shield, Users, Car, Store, AlertTriangle, Info, CheckCircle, Clock, MapPin, Database, Bell, BarChart3, Smartphone, Lock, Cloud, FileText } from 'lucide-react';

const RulesApp = ({ currentUser }) => {
  const projectRules = [
    {
      id: 1,
      title: 'Personel Yönetimi Sistemi',
      description: 'Personel ekleme, düzenleme, silme işlemleri. Vardiya planlaması, izin takibi, performans değerlendirmesi.',
      features: [
        'Personel bilgileri güvenli şekilde saklanır',
        'Vardiya planlaması ve takibi',
        'İzin yönetimi ve onay sistemi',
        'Personel performans takibi',
        'Personel listesi ve filtreleme'
      ],
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 2,
      title: 'Araç Yönetimi ve Takip',
      description: 'Araç atama, rota planlaması, yakıt takibi, bakım hatırlatmaları.',
      features: [
        'GPS takibi ile gerçek zamanlı konum bilgisi',
        'Araç-personel eşleştirmesi',
        'Yakıt tüketimi takibi',
        'Bakım hatırlatmaları',
        'Araç kullanım raporları'
      ],
      icon: Car,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      id: 3,
      title: 'Mağaza ve Depo Yönetimi',
      description: 'Mağaza bilgileri, stok takibi, sipariş yönetimi.',
      features: [
        'Mağaza konumları ve bilgileri',
        'Depo kapasite planlaması',
        'Mağaza-personel atama sistemi',
        'Stok takibi ve uyarılar',
        'Mağaza performans analizi'
      ],
      icon: Store,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      id: 4,
      title: 'Güvenlik ve Yetkilendirme',
      description: 'Kullanıcı rolleri, şifre güvenliği, oturum yönetimi.',
      features: [
        'Kullanıcı rolleri (Admin, Yönetici, Personel)',
        'Şifre güvenliği ve doğrulama',
        'Oturum yönetimi ve timeout',
        'Veri şifreleme ve yedekleme',
        'Güvenlik protokolleri'
      ],
      icon: Lock,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      id: 5,
      title: 'Bildirim Sistemi',
      description: 'Gerçek zamanlı bildirimler, okundu/okunmadı takibi.',
      features: [
        'Gerçek zamanlı bildirimler',
        'Okundu/okunmadı takibi',
        'Toplu bildirim gönderme',
        'Bildirim geçmişi ve arşivleme',
        'Özelleştirilebilir bildirim ayarları'
      ],
      icon: Bell,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      id: 6,
      title: 'Raporlama ve Analiz',
      description: 'Performans raporları, vardiya analizleri, araç kullanım istatistikleri.',
      features: [
        'Performans raporları ve grafikler',
        'Vardiya analizleri',
        'Araç kullanım istatistikleri',
        'Excel/PDF export özellikleri',
        'Grafik ve tablo görünümleri'
      ],
      icon: BarChart3,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      id: 7,
      title: 'Veri Yedekleme ve Senkronizasyon',
      description: 'Otomatik veri yedekleme, bulut senkronizasyonu.',
      features: [
        'Otomatik veri yedekleme',
        'Bulut senkronizasyonu',
        'Veri kaybı önleme',
        'Sistem çökmesi durumunda kurtarma',
        'Veri bütünlüğü kontrolü'
      ],
      icon: Cloud,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50'
    },
    {
      id: 8,
      title: 'Mobil Uyumluluk',
      description: 'Responsive tasarım, mobil cihazlarda kullanım.',
      features: [
        'Responsive tasarım',
        'Mobil cihazlarda kullanım',
        'Touch-friendly arayüz',
        'Offline çalışma modu',
        'Hızlı yükleme süreleri'
      ],
      icon: Smartphone,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
    }
  ];

  const systemFeatures = [
    {
      title: 'Veri Güvenliği',
      description: 'Tüm veriler şifrelenmiş olarak saklanır ve güvenli protokoller kullanılır.',
      icon: Shield,
      color: 'text-green-600'
    },
    {
      title: 'Gerçek Zamanlı Güncellemeler',
      description: 'Sistem sürekli güncellenir ve değişiklikler anında yansıtılır.',
      icon: Clock,
      color: 'text-blue-600'
    },
    {
      title: 'Kolay Kullanım',
      description: 'Sezgisel arayüz tasarımı ile kullanıcı dostu deneyim.',
      icon: CheckCircle,
      color: 'text-purple-600'
    },
    {
      title: 'Detaylı Raporlama',
      description: 'Kapsamlı raporlama araçları ile veri analizi.',
      icon: FileText,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <Shield className="w-12 h-12 text-blue-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Proje Kuralları ve İşlevler</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Personel yönetim sisteminin temel işlevleri, güvenlik protokolleri ve kullanım kuralları
        </p>
      </div>

      {/* Sistem Özellikleri */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <Info className="w-6 h-6 mr-2 text-blue-600" />
          Sistem Özellikleri
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {systemFeatures.map((feature, index) => (
            <div key={index} className="text-center p-4 rounded-lg bg-gray-50">
              <feature.icon className={`w-8 h-8 mx-auto mb-2 ${feature.color}`} />
              <h3 className="font-medium text-gray-900 mb-1">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Ana Modüller */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Database className="w-6 h-6 mr-2 text-blue-600" />
          Ana Sistem Modülleri
        </h2>
        
        {projectRules.map((rule) => (
          <div key={rule.id} className={`bg-white rounded-xl p-6 shadow-lg border border-gray-100 ${rule.bgColor}`}>
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-lg ${rule.bgColor}`}>
                <rule.icon className={`w-8 h-8 ${rule.color}`} />
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{rule.title}</h3>
                <p className="text-gray-600 mb-4">{rule.description}</p>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900 text-sm">Özellikler:</h4>
                  <ul className="space-y-1">
                    {rule.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Kullanım Kuralları */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <AlertTriangle className="w-6 h-6 mr-2 text-yellow-600" />
          Kullanım Kuralları ve Güvenlik
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Genel Kurallar</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                Tüm kullanıcılar giriş yapmadan sisteme erişemez
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                Personel bilgileri sadece yetkili kullanıcılar tarafından düzenlenebilir
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                Vardiya değişiklikleri yönetici onayı gerektirir
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                Araç atamaları sadece uygun lisanslı personel için yapılır
              </li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Güvenlik Protokolleri</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                Şifreler güçlü olmalı ve düzenli değiştirilmelidir
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                Oturum süresi dolduğunda otomatik çıkış yapılır
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                Tüm işlemler loglanır ve takip edilir
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                Veriler düzenli olarak yedeklenir
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Teknik Bilgiler */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 shadow-lg border border-blue-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <MapPin className="w-6 h-6 mr-2 text-blue-600" />
          Teknik Bilgiler
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Teknoloji Stack</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• React.js (Frontend)</li>
              <li>• Tailwind CSS (Styling)</li>
              <li>• Supabase (Backend)</li>
              <li>• PostgreSQL (Veritabanı)</li>
            </ul>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Güvenlik</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• JWT Token Authentication</li>
              <li>• Row Level Security</li>
              <li>• HTTPS Encryption</li>
              <li>• Input Validation</li>
            </ul>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Performans</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• Lazy Loading</li>
              <li>• Caching Strategies</li>
              <li>• Optimized Queries</li>
              <li>• CDN Integration</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RulesApp; 