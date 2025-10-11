-- Vehicles Tablosu (güncelleme)
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS driver_id_1 UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS driver_id_2 UUID REFERENCES users(id);

-- Yakıt Fişleri Tablosu
CREATE TABLE IF NOT EXISTS fuel_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_number VARCHAR(50) NOT NULL UNIQUE,
  vehicle_plate VARCHAR(20) NOT NULL,
  driver_name VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  fuel_type VARCHAR(50) NOT NULL,
  quantity_liters DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  vat_amount DECIMAL(10, 2),
  station_name VARCHAR(200) DEFAULT 'Shell Petrol A.Ş.',
  station_location VARCHAR(200),
  km_reading INTEGER,
  receipt_image TEXT,
  receipt_image_path VARCHAR(500),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- İndeksler
CREATE INDEX idx_fuel_receipts_date ON fuel_receipts(date DESC);
CREATE INDEX idx_fuel_receipts_vehicle ON fuel_receipts(vehicle_plate);
CREATE INDEX idx_fuel_receipts_driver ON fuel_receipts(driver_name);
CREATE INDEX idx_fuel_receipts_receipt_number ON fuel_receipts(receipt_number);
CREATE INDEX idx_fuel_receipts_created_at ON fuel_receipts(created_at DESC);

-- Güncelleme zamanı için trigger
CREATE OR REPLACE FUNCTION update_fuel_receipts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fuel_receipts_updated_at
  BEFORE UPDATE ON fuel_receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_fuel_receipts_updated_at();

-- Row Level Security (RLS) Politikaları
ALTER TABLE fuel_receipts ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir
CREATE POLICY "Fuel receipts are viewable by everyone"
  ON fuel_receipts FOR SELECT
  USING (true);

-- Sadece yetkili kullanıcılar ekleyebilir
CREATE POLICY "Authenticated users can insert fuel receipts"
  ON fuel_receipts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Sadece kendi eklediği fişleri güncelleyebilir veya admin
CREATE POLICY "Users can update their own fuel receipts"
  ON fuel_receipts FOR UPDATE
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- Sadece admin silebilir
CREATE POLICY "Only admins can delete fuel receipts"
  ON fuel_receipts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- Storage bucket oluştur (eğer yoksa)
-- NOT: Bu komut Supabase Dashboard'dan Storage bölümünden manuel olarak yapılmalı
-- Bucket adı: fuel-receipts
-- Public: false (sadece yetkili kullanıcılar erişebilir)

-- Storage politikaları
-- NOT: Bu politikalar Supabase Dashboard'dan Storage > Policies bölümünden eklenmelidir

-- Örnek veri (TEST için)
INSERT INTO fuel_receipts (
  receipt_number,
  vehicle_plate,
  driver_name,
  date,
  time,
  fuel_type,
  quantity_liters,
  unit_price,
  total_amount,
  vat_amount,
  station_name,
  station_location,
  km_reading,
  notes
) VALUES
  ('0001', '34NVK210', 'Ahmet Yılmaz', '2025-01-15', '14:30', 'MOTORIN SVPD', 99.62, 53.49, 5328.67, 888.11, 'Shell Petrol A.Ş.', 'Gebze/Kocaeli', 125000, 'Acil yakıt ikmali'),
  ('0002', '34NVK156', 'Mehmet Demir', '2025-01-14', '09:15', 'MOTORIN SVPD', 113.48, 53.49, 6070.05, 1011.67, 'Shell Petrol A.Ş.', 'Gebze/Kocaeli', 98000, NULL),
  ('0003', '34ABC123', 'Ali Kaya', '2025-01-13', '16:45', 'BENZIN', 45.20, 55.20, 2495.04, 415.84, 'Shell Petrol A.Ş.', 'İstanbul/Beşiktaş', 75000, 'Şehir içi seyahat')
ON CONFLICT (receipt_number) DO NOTHING;

-- Veritabanı görünümleri (istatistikler için)
CREATE OR REPLACE VIEW fuel_receipt_statistics AS
SELECT
  DATE_TRUNC('month', date) as month,
  vehicle_plate,
  driver_name,
  COUNT(*) as total_receipts,
  SUM(quantity_liters) as total_liters,
  SUM(total_amount) as total_amount,
  AVG(unit_price) as avg_unit_price,
  MIN(date) as first_receipt_date,
  MAX(date) as last_receipt_date
FROM fuel_receipts
GROUP BY DATE_TRUNC('month', date), vehicle_plate, driver_name
ORDER BY month DESC, total_amount DESC;

-- Araç bazlı özet
CREATE OR REPLACE VIEW fuel_by_vehicle AS
SELECT
  vehicle_plate,
  COUNT(*) as receipt_count,
  SUM(quantity_liters) as total_liters,
  SUM(total_amount) as total_spent,
  AVG(unit_price) as avg_price_per_liter,
  MIN(date) as first_fueling,
  MAX(date) as last_fueling,
  MAX(km_reading) - MIN(km_reading) as total_km
FROM fuel_receipts
GROUP BY vehicle_plate
ORDER BY total_spent DESC;

-- Şoför bazlı özet
CREATE OR REPLACE VIEW fuel_by_driver AS
SELECT
  driver_name,
  COUNT(*) as receipt_count,
  SUM(quantity_liters) as total_liters,
  SUM(total_amount) as total_spent,
  AVG(total_amount) as avg_per_receipt,
  MIN(date) as first_receipt,
  MAX(date) as last_receipt
FROM fuel_receipts
GROUP BY driver_name
ORDER BY total_spent DESC;

-- İstasyon bazlı özet
CREATE OR REPLACE VIEW fuel_by_station AS
SELECT
  station_name,
  station_location,
  COUNT(*) as receipt_count,
  SUM(quantity_liters) as total_liters,
  SUM(total_amount) as total_spent,
  AVG(unit_price) as avg_price_per_liter
FROM fuel_receipts
GROUP BY station_name, station_location
ORDER BY total_spent DESC;

COMMENT ON TABLE fuel_receipts IS 'Yakıt fişleri tablosu - tüm yakıt alım bilgileri';
COMMENT ON COLUMN fuel_receipts.receipt_number IS 'Fiş numarası - benzersiz';
COMMENT ON COLUMN fuel_receipts.vehicle_plate IS 'Araç plakası';
COMMENT ON COLUMN fuel_receipts.driver_name IS 'Şoför adı';
COMMENT ON COLUMN fuel_receipts.fuel_type IS 'Yakıt türü (MOTORIN SVPD, BENZIN, LPG, ELEKTRIK)';
COMMENT ON COLUMN fuel_receipts.km_reading IS 'Araç KM göstergesi';
COMMENT ON COLUMN fuel_receipts.notes IS 'Ek açıklamalar ve notlar';

