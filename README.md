# 🚚 Personel Planlama Sistemi

Modern web tabanlı personel vardiya planlama uygulaması. Şoför ve sevkiyat elemanları için haftalık çalışma planı oluşturur.

## 🚀 Kurulum

### 1. Gereksinimler
- Node.js (v14 veya üzeri)
- npm veya yarn
- Supabase hesabı

### 2. Projeyi Klonlayın
```bash
git clone https://github.com/your-username/personel-planlama.git
cd personel-planlama
```

### 3. Bağımlılıkları Yükleyin
```bash
npm install
```

### 4. Supabase Yapılandırması

#### a) Supabase Projesi Oluşturun
1. https://supabase.com adresine gidin
2. Yeni proje oluşturun
3. Proje URL'si ve API anahtarınızı alın

#### b) Veritabanı Tablolarını Oluşturun
1. Supabase Dashboard'da SQL Editor'e gidin
2. `database_setup.sql` dosyasındaki tüm SQL komutlarını çalıştırın

#### c) Environment Variables
Proje root dizininde `.env.local` dosyası oluşturun:

```env
# Supabase Environment Variables
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Uygulamayı Çalıştırın
```bash
npm start
```

## ✨ Özellikler

### 🔐 Kullanıcı Girişi
- Email/şifre ile giriş ve kayıt
- Güvenli authentication sistemi
- Kullanıcı oturum yönetimi

### 📁 Excel Yükleme ve Veri Yönetimi
- **Drag & drop** ile Excel dosyası yükleme
- **Sabit Veriler**: Personel, araç, mağaza bilgileri (bir kere yüklenir)
- **Güncellenebilir Veriler**: Vardiya bilgileri (her Excel yüklemesinde güncellenir)
- **Otomatik Senkronizasyon**: Veriler Supabase'e otomatik kaydedilir

### 👥 Personel Yönetimi
- Şoför ve sevkiyat elemanı listesi
- Vardiya bilgileri (gece/gündüz/izin)
- Personel performans analizi
- Bölgesel çalışma dağılımı

### 🚚 Araç Yönetimi
- Araç listesi ve tipi (Kamyon, Kamyonet, Panelvan)
- Sabit şoför ataması
- Araç-personel eşleştirme

### 🏪 Mağaza Yönetimi
- Mağaza listesi ve konum bilgileri
- Bölgesel mağaza dağılımı
- Mağaza detay bilgileri

### 📅 Akıllı Vardiya Planlama
- **Otomatik Plan Oluşturma**: Haftalık vardiya planı
- **Sabit Şoför Kontrolü**: Belirli araçlar için sabit şoför
- **Rotasyon Sistemi**: Adaletli personel dağılımı
- **Dinlenme Algoritması**: Personel dinlenme planı
- **Bölgesel Dağılım**: Personelin farklı bölgelere eşit dağıtımı

### 📊 Performans Analizi
- Personel performans raporları
- Bölgesel çalışma istatistikleri
- Kasa/palet dağıtım analizi
- Detaylı performans grafikleri

### 💾 Veri Kalıcılığı
- Tüm veriler Supabase'de saklanır
- Plan geçmişi kayıtları
- Performans verisi birikimi
- Yedekleme ve güvenlik

## 🗄️ Veritabanı Yapısı

### Temel Tablolar
- `users` - Kullanıcı bilgileri
- `personnel` - Personel bilgileri (sabit)
- `vehicles` - Araç bilgileri (sabit)
- `stores` - Mağaza bilgileri (sabit)
- `shifts` - Vardiya bilgileri (güncellenebilir)
- `work_plans` - Çalışma planları
- `work_assignments` - Personel atamaları
- `performance_logs` - Performans kayıtları

## 🔄 Veri Senkronizasyonu

### Excel Yükleme Sistemi
1. **Personel Sayfası**: Personel bilgileri sabit olarak kaydedilir
2. **Araç Sayfası**: Araç bilgileri sabit olarak kaydedilir
3. **Mağaza Sayfası**: Mağaza bilgileri sabit olarak kaydedilir
4. **Vardiya Güncelleme**: Her Excel yüklemesinde vardiya bilgileri güncellenir

### Plan Kayıt Sistemi
- Oluşturulan planlar otomatik olarak veritabanına kaydedilir
- Personel atama kayıtları tutulur
- Performans verileri biriktirilir

## 🔐 Güvenlik

- **Row Level Security (RLS)** politikaları
- Kullanıcı tabanlı erişim kontrolü
- Şifrelenmiş veri saklama
- Güvenli API erişimi

## 🛠️ Teknolojiler

- **Frontend**: React.js, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Processing**: XLSX.js
- **Charts**: Chart.js (performans analizi için)

## 📱 Responsive Tasarım

- Masaüstü ve mobil uyumlu
- Modern UI/UX tasarımı
- Kolay kullanım arayüzü

## 📞 Destek

Herhangi bir sorunuz veya öneriniz varsa:
- Email: melihkochan@gmail.com
- Website: melihkochan.com

---

*🚚 Personel Planlama Sistemi ile verimli çalışma planları oluşturun!* 