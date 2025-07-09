# 🚚 Personel Planlama Sistemi

Modern web tabanlı personel vardiya planlama uygulaması. Şoför ve sevkiyat elemanları için haftalık çalışma planı oluşturur.

## ✨ Özellikler

- **📁 Excel Yükleme**: Drag & drop ile Excel dosyası yükleme
- **👥 Personel Yönetimi**: Şoför ve sevkiyat elemanı listesi
- **📅 Otomatik Planlama**: Haftalık vardiya planı oluşturma
- **⭐ Özel Şoför Ataması**: Belirli araçlar için sabit şoför
- **🔄 Dönüşümlü İzin**: Şoförler için adil izin sistemi
- **📊 İstatistikler**: Detaylı raporlama ve analiz
- **📱 Responsive Tasarım**: Mobil ve masaüstü uyumlu
- **🖨️ Yazdırma**: Plan çıktısı alma
- **💾 Export**: Planı metin dosyası olarak indirme

## 🎯 Planlama Algoritması

### Şoför Ataması
- Özel şoförler öncelikli olarak atanır
- Dönüşümlü izin sistemi (9 şoför varsa 1 kişi izinli)
- Her gün farklı şoför izinli olur
- Aynı şoför birden fazla araca atanmaz

### Sevkiyat Elemanı
- Her araç için 2 sevkiyat elemanı
- Aynı kişi birden fazla araca atanmaz
- Vardiya saatlerine göre dağılım
- Çok kişi varsa günlük izin verilir

### Araç Dağılımı
- Yakın/Orta/Uzak nokta dengesi
- Mağaza bazlı gruplandırma
- Optimal rota planlaması

## 📋 Excel Formatı

### Personel Kolonları
- **AD**: Personelin adı
- **SOYAD**: Personelin soyadı
- **GOREV**: ŞOFÖR veya SEVKIYAT ELEMANI
- **VARDIYA**: 22:00 - 06:00 (Gece) veya 08:00 - 16:00 (Gündüz)

### Araç Bilgileri
- **PLAKA**: Araç plakası
- **NOKTA**: Yakın, Orta veya Uzak
- **ÖZEL_ŞOFÖR**: Sabit şoför adı soyadı (opsiyonel)
- **MAĞAZA**: Mağaza adı (opsiyonel)

## 🚀 Kurulum

### Gereksinimler
- Node.js 14.0+ 
- npm veya yarn

### Kurulum Adımları

1. **Bağımlılıkları yükle**
```bash
npm install
```

2. **Geliştirme sunucusunu başlat**
```bash
npm start
```

3. **Tarayıcıda aç**
```
http://localhost:3000
```

## 🔧 Build

Production build oluşturmak için:

```bash
npm run build
```

Build dosyaları `build/` klasörüne oluşturulur.

## 🎨 Teknolojiler

- **React 18**: Modern UI framework
- **Lucide React**: Modern ikonlar
- **XLSX**: Excel dosyası işleme
- **Date-fns**: Tarih işlemleri
- **CSS3**: Modern styling ve animasyonlar

## 📱 Kullanım

### 1. Excel Dosyası Yükleme
- "Excel Yükleme" sekmesinden dosyanızı yükleyin
- Drag & drop veya dosya seçimi ile yükleme
- Sistem otomatik olarak verileri analiz eder

### 2. Personel Listesi
- Yüklenen personel listesini görüntüleyin
- Şoför ve sevkiyat elemanlarını filtreleyin
- Vardiya bazlı arama yapın

### 3. Planlama
- "Vardiya Planlama" sekmesine geçin
- Başlangıç tarihini ve araç sayısını belirleyin
- "Haftalık Plan Oluştur" butonuna tıklayın

### 4. Plan Görüntüleme
- Günlük veya haftalık görünümü seçin
- Noktaya göre filtreleme yapın
- Planı indirin veya yazdırın

## 🛠️ Geliştirme

### Proje Yapısı
```
src/
├── components/
│   ├── FileUpload.js      # Excel yükleme
│   ├── PersonelList.js    # Personel listesi
│   ├── VardiyaPlanlama.js # Planlama algoritması
│   └── PlanDisplay.js     # Plan görüntüleme
├── App.js                 # Ana uygulama
├── App.css               # Stil dosyası
└── index.js              # Giriş noktası
```

### Geliştirme Komutları
```bash
npm start        # Geliştirme sunucusu
npm run build    # Production build
npm test         # Testleri çalıştır
```

## 🎯 Gelecek Özellikler

- [ ] Backend entegrasyonu
- [ ] Veritabanı desteği
- [ ] Kullanıcı yetkilendirme
- [ ] SMS/Email bildirimler
- [ ] Mobil uygulama
- [ ] Gelişmiş raporlar
- [ ] API desteği

## 🤝 Katkıda Bulunma

1. Projeyi fork edin
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add some AmazingFeature'`)
4. Branch'inizi push edin (`git push origin feature/AmazingFeature`)
5. Pull Request oluşturun

## 📄 Lisans

MIT License - Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 👨‍💻 Geliştirici

**Melih Kochan**
- Email: [melih@example.com](mailto:melih@example.com)
- LinkedIn: [linkedin.com/in/melihkochan](https://linkedin.com/in/melihkochan)

## 📞 Destek

Herhangi bir sorun veya öneriniz için:
- Issues sayfasından sorun bildirin
- Email ile iletişime geçin
- Dokümantasyonu kontrol edin

---

*🚚 Personel Planlama Sistemi ile verimli çalışma planları oluşturun!* 