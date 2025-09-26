-- Supabase RLS Politikası Düzeltmesi
-- Avatar yükleme hatası için gerekli politikalar

-- 1. Users tablosunda avatar_url güncelleme izni
CREATE POLICY "Allow users to update their own avatar_url" ON users
FOR UPDATE USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

-- 2. Admin kullanıcıların tüm kullanıcıların avatar_url'ini güncelleyebilmesi
CREATE POLICY "Allow admins to update any user avatar_url" ON users
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id::text = auth.uid()::text 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id::text = auth.uid()::text 
    AND role = 'admin'
  )
);

-- 3. Storage bucket'ı için politikalar (eğer yoksa)
-- Avatars bucket'ında herkesin resimleri okumasına izin ver
CREATE POLICY "Allow public read access" ON storage.objects 
FOR SELECT USING (bucket_id = 'avatars');

-- Kimliği doğrulanmış kullanıcıların kendi klasörlerine resim yüklemesine izin ver
CREATE POLICY "Allow authenticated users to upload their own avatar" ON storage.objects 
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Kimliği doğrulanmış kullanıcıların kendi avatarını güncellemesine izin ver
CREATE POLICY "Allow authenticated users to update their own avatar" ON storage.objects 
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Kimliği doğrulanmış kullanıcıların kendi avatarını silmesine izin ver
CREATE POLICY "Allow authenticated users to delete their own avatar" ON storage.objects 
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admin kullanıcıların tüm avatar'ları yönetebilmesi
CREATE POLICY "Allow admins to manage all avatars" ON storage.objects 
FOR ALL USING (
  bucket_id = 'avatars' 
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE id::text = auth.uid()::text 
    AND role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE id::text = auth.uid()::text 
    AND role = 'admin'
  )
);
