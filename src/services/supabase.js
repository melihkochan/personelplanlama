import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://example.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key';
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY || 'your-service-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Admin işlemler için ayrı client (service_role anahtarı ile)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Auth functions
export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Sign in error:', error);
    return { success: false, error: error.message };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error: error.message };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

// Personnel functions
export const getAllPersonnel = async () => {
  try {
    const { data, error } = await supabase
      .from('personnel')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Get all personnel error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const addPersonnel = async (personnel) => {
  try {
    const { data, error } = await supabase
      .from('personnel')
      .upsert([personnel], { 
        onConflict: 'employee_code',
        ignoreDuplicates: false 
      })
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Add personnel error:', error);
    return { success: false, error: error.message };
  }
};

export const updatePersonnel = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('personnel')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Update personnel error:', error);
    return { success: false, error: error.message };
  }
};

export const deletePersonnel = async (id) => {
  try {
    const { error } = await supabase
      .from('personnel')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Delete personnel error:', error);
    return { success: false, error: error.message };
  }
};

// Vehicle functions
export const getAllVehicles = async () => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Get all vehicles error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const addVehicle = async (vehicle) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .upsert([vehicle], { 
        onConflict: 'license_plate',
        ignoreDuplicates: false 
      })
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Add vehicle error:', error);
    return { success: false, error: error.message };
  }
};

export const updateVehicle = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Update vehicle error:', error);
    return { success: false, error: error.message };
  }
};

export const deleteVehicle = async (id) => {
  try {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Delete vehicle error:', error);
    return { success: false, error: error.message };
  }
};

// Store functions
export const getAllStores = async () => {
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Get all stores error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const addStore = async (store) => {
  try {
    const { data, error } = await supabase
      .from('stores')
      .upsert([store], { 
        onConflict: 'store_code',
        ignoreDuplicates: false 
      })
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Add store error:', error);
    return { success: false, error: error.message };
  }
};

export const updateStore = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('stores')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Update store error:', error);
    return { success: false, error: error.message };
  }
};

export const deleteStore = async (id) => {
  try {
    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Delete store error:', error);
    return { success: false, error: error.message };
  }
};

// User management functions
export const getAllUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Get all users error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const addUser = async (user) => {
  try {
    // Admin API kullanarak kullanıcı oluştur (session açmaz)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true, // Email'i otomatik onaylanmış olarak işaretle
      user_metadata: {
        username: user.username,
        full_name: user.full_name,
        role: user.role
      }
    });
    
    if (authError) throw authError;
    
    // Sonra users tablosuna ekle
    const { data, error } = await supabase
      .from('users')
      .insert([{
        id: authData.user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active
      }])
      .select();
    
    if (error) throw error;
    
    // Eğer admin session'ı varsa, geri yükle
    if (currentSession?.session) {
      await supabase.auth.setSession(currentSession.session);
    }
    
    return { 
      success: true, 
      data: data?.[0],
      needsEmailConfirmation: false // Admin API ile oluşturulduğu için email onaylanmış
    };
  } catch (error) {
    console.error('Add user error:', error);
    return { success: false, error: error.message };
  }
};

// Email onayı için yardımcı fonksiyon
export const resendConfirmationEmail = async (email) => {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email
    });
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Resend confirmation error:', error);
    return { success: false, error: error.message };
  }
};

export const updateUser = async (id, updates) => {
  try {
    // Şifre güncelleme varsa önce auth'u güncelle
    if (updates.password && updates.password.trim() !== '') {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
        password: updates.password
      });
      
      if (authError) throw authError;
    }
    
    // Şifre alanını users tablosundan çıkar
    const { password, ...userUpdates } = updates;
    
    // Users tablosunu güncelle
    const { data, error } = await supabase
      .from('users')
      .update(userUpdates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return { success: true, data: data?.[0] };
  } catch (error) {
    console.error('Update user error:', error);
    return { success: false, error: error.message };
  }
};

export const deleteUser = async (id) => {
  try {
    // Önce users tablosundan sil
    const { error: dbError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (dbError) throw dbError;
    
    // Sonra auth'tan sil
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    
    if (authError) {
      console.warn('Auth user deletion failed:', authError.message);
      // Auth silme hatası kritik değil, sadece uyarı ver
    }
    
    return { success: true };
  } catch (error) {
    console.error('Delete user error:', error);
    return { success: false, error: error.message };
  }
};

export const getUserRole = async (userId) => {
  try {
    console.log('🔍 getUserRole çağrıldı, userId:', userId);
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    console.log('🔍 Supabase users tablosundan dönen data:', data);
    console.log('🔍 Supabase users tablosundan dönen error:', error);
    
    if (error) {
      console.error('❌ getUserRole error:', error);
      // Eğer kullanıcı bulunamazsa, default admin yap (test için)
      if (error.code === 'PGRST116') {
        console.log('⚠️ Kullanıcı users tablosunda bulunamadı, default admin veriliyor');
        return 'admin';
      }
      throw error;
    }
    
    const role = data?.role || 'user';
    console.log('✅ getUserRole final role:', role);
    return role;
  } catch (error) {
    console.error('❌ Get user role error:', error);
    // Hata durumunda test için admin ver
    console.log('⚠️ Hata durumunda admin role veriliyor');
    return 'admin';
  }
};

// Plan functions
export const savePlan = async (plan) => {
  try {
    const { data, error } = await supabase
      .from('plans')
      .insert([plan])
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Save plan error:', error);
    return { success: false, error: error.message };
  }
};

export const getAllPlans = async () => {
  try {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Get all plans error:', error);
    return { success: false, error: error.message, data: [] };
  }
}; 

// Performance data functions
export const savePerformanceData = async (performanceData) => {
  try {
    const { data, error } = await supabase
      .from('performance_data')
      .upsert([performanceData], { 
        onConflict: 'date,employee_code',
        ignoreDuplicates: false 
      })
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Save performance data error:', error);
    return { success: false, error: error.message };
  }
};

export const getPerformanceData = async (dateRange = null) => {
  try {
    let query = supabase
      .from('performance_data')
      .select(`
        *,
        personnel:personnel!performance_data_employee_code_fkey (
          full_name,
          position
        )
      `)
      .order('date', { ascending: false });
    
    if (dateRange) {
      query = query.gte('date', dateRange.from).lte('date', dateRange.to);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Performance_data tablosundaki shift_type'ı kullan (Excel'den gelen vardiya bilgisi)
    const enrichedData = data?.map(item => ({
      ...item,
      shift_type: item.shift_type || 'day', // Performance_data tablosundaki shift_type'ı kullan
      full_name: item.personnel?.full_name || 'Bilinmeyen',
      position: item.personnel?.position || 'Bilinmeyen'
    })) || [];
    
    console.log('🔍 Performance data çekildi:', enrichedData.length, 'kayıt');
    console.log('📊 Shift type dağılımı:', enrichedData.reduce((acc, item) => {
      acc[item.shift_type] = (acc[item.shift_type] || 0) + 1;
      return acc;
    }, {}));
    
    return { success: true, data: enrichedData };
  } catch (error) {
    console.error('Get performance data error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getPerformanceByEmployee = async (employeeCode, dateRange = null) => {
  try {
    let query = supabase
      .from('performance_data')
      .select(`
        *,
        personnel:personnel!performance_data_employee_code_fkey (
          full_name,
          position
        )
      `)
      .eq('employee_code', employeeCode)
      .order('date', { ascending: false });
    
    if (dateRange) {
      query = query.gte('date', dateRange.from).lte('date', dateRange.to);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Performance_data tablosundaki shift_type'ı kullan (Excel'den gelen vardiya bilgisi)
    const enrichedData = data?.map(item => ({
      ...item,
      shift_type: item.shift_type || 'day', // Performance_data tablosundaki shift_type'ı kullan
      full_name: item.personnel?.full_name || 'Bilinmeyen',
      position: item.personnel?.position || 'Bilinmeyen'
    })) || [];
    
    return { success: true, data: enrichedData };
  } catch (error) {
    console.error('Get performance by employee error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const bulkSavePerformanceData = async (performanceDataArray) => {
  try {
    console.log('🔄 SUPABASE bulkSavePerformanceData BAŞLADI');
    console.log('🔄 Gönderilen veri sayısı:', performanceDataArray.length);
    console.log('🔄 İlk veri örneği:', performanceDataArray[0]);
    
    // İlk önce mevcut verileri sil (aynı tarih aralığında)
    const dates = [...new Set(performanceDataArray.map(item => item.date))];
    console.log('🔄 Silinecek tarihler:', dates);
    
    // Mevcut verileri sil
    const { error: deleteError } = await supabase
      .from('performance_data')
      .delete()
      .in('date', dates);
    
    if (deleteError) {
      console.warn('⚠️ Mevcut veriler silinirken hata (normal olabilir):', deleteError.message);
    } else {
      console.log('✅ Mevcut veriler temizlendi');
    }
    
    // Yeni verileri ekle
    const { data, error } = await supabase
      .from('performance_data')
      .insert(performanceDataArray)
      .select();
    
    console.log('🔄 Supabase insert sonucu - data:', data);
    console.log('🔄 Supabase insert sonucu - error:', error);
    
    if (error) throw error;
    
    console.log('✅ SUPABASE bulkSavePerformanceData BAŞARILI');
    return { success: true, data };
  } catch (error) {
    console.error('❌ SUPABASE bulkSavePerformanceData HATASI:', error);
    console.error('❌ Hata mesajı:', error.message);
    console.error('❌ Hata detayı:', error.details);
    console.error('❌ Hata kodu:', error.code);
    return { success: false, error: error.message };
  }
};

export const deletePerformanceData = async (id) => {
  try {
    const { error } = await supabase
      .from('performance_data')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Delete performance data error:', error);
    return { success: false, error: error.message };
  }
};

// Performans analizi verilerini kaydet
export const savePerformanceAnalysis = async (analysisData, dateRange) => {
  try {
    console.log('💾 Performans analizi kaydediliyor...');
    
    const analysisRecord = {
      analysis_name: `Performans Analizi ${dateRange}`,
      date_range: dateRange,
      analysis_data: analysisData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('performance_analysis')
      .insert([analysisRecord])
      .select();
    
    if (error) throw error;
    
    console.log('✅ Performans analizi kaydedildi:', data);
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('❌ Performans analizi kaydetme hatası:', error);
    return { success: false, error: error.message };
  }
};

// Tüm performans analizlerini getir
export const getAllPerformanceAnalyses = async () => {
  try {
    const { data, error } = await supabase
      .from('performance_analysis')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Performans analizleri getirme hatası:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Performans analizi sil
export const deletePerformanceAnalysis = async (id) => {
  try {
    const { error } = await supabase
      .from('performance_analysis')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Performans analizi silme hatası:', error);
    return { success: false, error: error.message };
  }
};

// İzin yönetimi functions
export const saveLeaveRequest = async (leaveData) => {
  try {
    // Performance_data tablosuna izin kaydını ekle
    const performanceRecord = {
      date: leaveData.date,
      employee_code: leaveData.employee_code,
      shift_type: 'izin',
      location: 'İzin',
      job_count: 0,
      pallet_count: 0,
      box_count: 0,
      avg_pallet: 0,
      avg_box: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('performance_data')
      .upsert([performanceRecord], { 
        onConflict: 'date,employee_code',
        ignoreDuplicates: false 
      })
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('İzin kaydı kaydetme hatası:', error);
    return { success: false, error: error.message };
  }
};

export const getLeaveData = async (dateRange = null) => {
  try {
    let query = supabase
      .from('performance_data')
      .select(`
        *,
        personnel:personnel!performance_data_employee_code_fkey (
          full_name,
          position,
          shift_type
        )
      `)
      .eq('shift_type', 'izin')
      .order('date', { ascending: false });
    
    if (dateRange) {
      query = query.gte('date', dateRange.from).lte('date', dateRange.to);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const enrichedData = data?.map(item => ({
      ...item,
      full_name: item.personnel?.full_name || 'Bilinmeyen',
      position: item.personnel?.position || 'Bilinmeyen',
      original_shift: item.personnel?.shift_type || 'gunduz'
    })) || [];
    
    return { success: true, data: enrichedData };
  } catch (error) {
    console.error('İzin verileri getirme hatası:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const removeLeaveRequest = async (date, employeeCode) => {
  try {
    const { error } = await supabase
      .from('performance_data')
      .delete()
      .eq('date', date)
      .eq('employee_code', employeeCode)
      .eq('shift_type', 'izin');
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('İzin kaydı silme hatası:', error);
    return { success: false, error: error.message };
  }
};

export const bulkSaveLeaveData = async (leaveDataArray) => {
  try {
    console.log('🔄 BULK İZİN KAYDI BAŞLADI');
    console.log('🔄 Gönderilen izin sayısı:', leaveDataArray.length);
    
    const performanceRecords = leaveDataArray.map(leave => ({
      date: leave.date,
      employee_code: leave.employee_code,
      shift_type: 'izin',
      location: 'İzin',
      job_count: 0,
      pallet_count: 0,
      box_count: 0,
      avg_pallet: 0,
      avg_box: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const { data, error } = await supabase
      .from('performance_data')
      .upsert(performanceRecords, { 
        onConflict: 'date,employee_code',
        ignoreDuplicates: false 
      })
      .select();
    
    if (error) throw error;
    
    console.log('✅ BULK İZİN KAYDI BAŞARILI');
    return { success: true, data };
  } catch (error) {
    console.error('❌ BULK İZİN KAYDI HATASI:', error);
    return { success: false, error: error.message };
  }
}; 