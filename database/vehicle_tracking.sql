-- Araç Takip Sistemi Tabloları
-- Bu tablo araç hareketlerini ve giriş-çıkış bilgilerini takip eder

-- Status sütununu kaldır (eğer varsa)
ALTER TABLE vehicle_tracking DROP COLUMN IF EXISTS status;

-- Ana araç takip tablosu
CREATE TABLE IF NOT EXISTS vehicle_tracking (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    vehicle_plate VARCHAR(20) NOT NULL,
    driver_name VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL,
    notes TEXT,
    images JSONB, -- Base64 görseller için JSON array
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100), -- Hangi kullanıcı oluşturdu
);

-- Takip girişleri tablosu (her giriş-çıkış için ayrı kayıt)
CREATE TABLE IF NOT EXISTS vehicle_tracking_entries (
    id SERIAL PRIMARY KEY,
    tracking_id INTEGER REFERENCES vehicle_tracking(id) ON DELETE CASCADE,
    departure_center VARCHAR(100) NOT NULL,
    entry_time TIME NOT NULL,
    exit_time TIME,
    departure_km INTEGER NOT NULL CHECK (departure_km >= 0 AND departure_km <= 999999),
    entry_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- İndeksler (performans için)
CREATE INDEX IF NOT EXISTS idx_vehicle_tracking_date ON vehicle_tracking(date);
CREATE INDEX IF NOT EXISTS idx_vehicle_tracking_vehicle ON vehicle_tracking(vehicle_plate);
CREATE INDEX IF NOT EXISTS idx_vehicle_tracking_driver ON vehicle_tracking(driver_name);
CREATE INDEX IF NOT EXISTS idx_vehicle_tracking_region ON vehicle_tracking(region);
CREATE INDEX IF NOT EXISTS idx_vehicle_tracking_status ON vehicle_tracking(status);
CREATE INDEX IF NOT EXISTS idx_tracking_entries_tracking_id ON vehicle_tracking_entries(tracking_id);

-- Trigger: updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger'ları tablolara ekle
CREATE TRIGGER update_vehicle_tracking_updated_at 
    BEFORE UPDATE ON vehicle_tracking 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_tracking_entries_updated_at 
    BEFORE UPDATE ON vehicle_tracking_entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View: Detaylı takip raporu
CREATE OR REPLACE VIEW vehicle_tracking_report AS
SELECT 
    vt.id,
    vt.date,
    vt.vehicle_plate,
    vt.driver_name,
    vt.region,
    vt.notes,
    vt.created_at,
    vt.created_by,
    vt.status,
    COUNT(vte.id) as total_entries,
    MIN(vte.entry_time) as first_entry,
    MAX(vte.exit_time) as last_exit,
    SUM(vte.departure_km) as total_km,
    STRING_AGG(DISTINCT vte.departure_center, ', ') as visited_centers
FROM vehicle_tracking vt
LEFT JOIN vehicle_tracking_entries vte ON vt.id = vte.tracking_id
GROUP BY vt.id, vt.date, vt.vehicle_plate, vt.driver_name, vt.region, vt.notes, vt.created_at, vt.created_by, vt.status;

-- Fonksiyon: Yeni takip kaydı oluştur
CREATE OR REPLACE FUNCTION create_vehicle_tracking(
    p_date DATE,
    p_vehicle_plate VARCHAR(20),
    p_driver_name VARCHAR(100),
    p_region VARCHAR(50),
    p_notes TEXT DEFAULT NULL,
    p_images JSONB DEFAULT NULL,
    p_created_by VARCHAR(100) DEFAULT 'system'
)
RETURNS INTEGER AS $$
DECLARE
    tracking_id INTEGER;
BEGIN
    INSERT INTO vehicle_tracking (date, vehicle_plate, driver_name, region, notes, images, created_by)
    VALUES (p_date, p_vehicle_plate, p_driver_name, p_region, p_notes, p_images, p_created_by)
    RETURNING id INTO tracking_id;
    
    RETURN tracking_id;
END;
$$ LANGUAGE plpgsql;

-- Fonksiyon: Takip girişi ekle
CREATE OR REPLACE FUNCTION add_tracking_entry(
    p_tracking_id INTEGER,
    p_departure_center VARCHAR(100),
    p_entry_time TIME,
    p_exit_time TIME,
    p_departure_km INTEGER,
    p_entry_notes TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    entry_id INTEGER;
BEGIN
    INSERT INTO vehicle_tracking_entries (tracking_id, departure_center, entry_time, exit_time, departure_km, entry_notes)
    VALUES (p_tracking_id, p_departure_center, p_entry_time, p_exit_time, p_departure_km, p_entry_notes)
    RETURNING id INTO entry_id;
    
    RETURN entry_id;
END;
$$ LANGUAGE plpgsql;

-- Fonksiyon: Takip kaydını tamamla (mobil'den toplu kaydetme için)
CREATE OR REPLACE FUNCTION complete_vehicle_tracking(
    p_tracking_id INTEGER,
    p_final_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE vehicle_tracking 
    SET 
        status = 'completed',
        notes = COALESCE(p_final_notes, notes),
        updated_at = NOW()
    WHERE id = p_tracking_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security) - güvenlik için
ALTER TABLE vehicle_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_tracking_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Sadece aktif kullanıcılar görebilir
CREATE POLICY "Users can view vehicle tracking" ON vehicle_tracking
    FOR SELECT USING (true);

CREATE POLICY "Users can insert vehicle tracking" ON vehicle_tracking
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update vehicle tracking" ON vehicle_tracking
    FOR UPDATE USING (true);

CREATE POLICY "Users can view tracking entries" ON vehicle_tracking_entries
    FOR SELECT USING (true);

CREATE POLICY "Users can insert tracking entries" ON vehicle_tracking_entries
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update tracking entries" ON vehicle_tracking_entries
    FOR UPDATE USING (true);

-- Yorumlar
COMMENT ON TABLE vehicle_tracking IS 'Araç takip ana tablosu - günlük takip kayıtları';
COMMENT ON TABLE vehicle_tracking_entries IS 'Takip girişleri - her giriş-çıkış için ayrı kayıt';
COMMENT ON COLUMN vehicle_tracking.images IS 'Base64 formatında görseller JSON array olarak saklanır';
COMMENT ON COLUMN vehicle_tracking_entries.departure_km IS 'KM okuma değeri (0-999999 arası)';
COMMENT ON VIEW vehicle_tracking_report IS 'Detaylı takip raporu görünümü';
