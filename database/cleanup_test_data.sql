-- Test verilerini temizle
-- Bu SQL'i Supabase SQL Editor'da çalıştırın

-- Yakıt fişlerindeki test verilerini sil
DELETE FROM fuel_receipts WHERE receipt_number IN ('0001', '0002', '0003');

-- Vehicles tablosundaki test verilerini sil (isteğe bağlı)
-- Eğer belirli plakaları silmek istiyorsanız:
-- DELETE FROM vehicles WHERE license_plate IN ('34NVK210', '34NVK156', '34ABC123');

-- Tüm yakıt fişlerini sil (eğer sadece test verileri varsa)
-- DİKKAT: Bu komut tüm yakıt fişlerini siler!
-- DELETE FROM fuel_receipts;

-- Silinen kayıt sayısını göster
SELECT COUNT(*) as deleted_receipts FROM fuel_receipts WHERE receipt_number IN ('0001', '0002', '0003');
