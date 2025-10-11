-- Vehicles Tablosu Güncelleme
-- Bu SQL'i Supabase SQL Editor'da çalıştırın

-- Mevcut kolonları kontrol et ve gerekirse ekle
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS first_driver VARCHAR(100),
ADD COLUMN IF NOT EXISTS second_driver VARCHAR(100),
ADD COLUMN IF NOT EXISTS location VARCHAR(100),
ADD COLUMN IF NOT EXISTS assigned_store VARCHAR(100);

-- Kolonlara açıklama ekle
COMMENT ON COLUMN vehicles.first_driver IS 'Birinci şoför adı';
COMMENT ON COLUMN vehicles.second_driver IS 'İkinci şoför adı';
COMMENT ON COLUMN vehicles.location IS 'Araç konumu';
COMMENT ON COLUMN vehicles.assigned_store IS 'Atanmış mağaza';

-- İndeks ekle (opsiyonel)
CREATE INDEX IF NOT EXISTS idx_vehicles_first_driver ON vehicles(first_driver);
CREATE INDEX IF NOT EXISTS idx_vehicles_second_driver ON vehicles(second_driver);
CREATE INDEX IF NOT EXISTS idx_vehicles_assigned_store ON vehicles(assigned_store);
