import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://example.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key';
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY || 'your-service-key';

// Singleton pattern - sadece bir kez oluştur
let supabaseInstance = null;
let supabaseAdminInstance = null;

export const supabase = supabaseInstance || (supabaseInstance = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
}));

// Admin işlemler için ayrı client (service_role anahtarı ile)
export const supabaseAdmin = supabaseAdminInstance || (supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}));

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

// Kullanıcı detaylarını getir
export const getUserDetails = async (userId, userEmail = null) => {
  try {
    // Önce ID ile dene
    let { data, error } = await supabase
      .from('users')
      .select('id, email, username, full_name, role, is_active')
      .eq('id', userId)
      .single();
    
    // ID ile bulunamazsa email ile dene
    if (error && error.code === 'PGRST116' && userEmail) {
      const emailQuery = await supabase
        .from('users')
        .select('id, email, username, full_name, role, is_active')
        .eq('email', userEmail)
        .single();
      
      data = emailQuery.data;
      error = emailQuery.error;
    }
    
    if (error) {
      console.error('Get user details error:', error);
      return { success: false, error: error.message, data: null };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Get user details catch error:', error);
    return { success: false, error: error.message, data: null };
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

export const getUserRole = async (userId, userEmail = null) => {
  try {
    // Önce ID ile dene (RLS bypass için service role kullan)
    let { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    // ID ile bulunamazsa email ile dene
    if (error && error.code === 'PGRST116' && userEmail) {
      const emailQuery = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', userEmail)
        .single();
      
      data = emailQuery.data;
      error = emailQuery.error;
    }
    
    if (error) {
      // PGRST116 = kullanıcı bulunamadı, test için admin ver
      if (error.code === 'PGRST116') {
        return 'admin';
      }
      return 'admin'; // Diğer hatalar için de admin ver (test)
    }
    
    const role = data?.role || 'user';
    return role;
  } catch (error) {
    console.error('❌ getUserRole catch error:', error);
    return 'admin'; // Catch durumunda da admin ver (test için)
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
    
    // Performance data çekildi
    
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

export const bulkSavePerformanceData = async (performanceDataArray, sheetNames = []) => {
  try {
    if (!performanceDataArray || performanceDataArray.length === 0) {
      return { success: false, error: 'Veri bulunamadı' };
    }
    
    // Mevcut verileri temizle
    if (sheetNames && sheetNames.length > 0) {
      const { error: deleteError } = await supabase
        .from('performance_data')
        .delete()
        .in('sheet_name', sheetNames);
      
      if (deleteError) {
        console.error('❌ Mevcut veri temizleme hatası:', deleteError);
        return { success: false, error: deleteError.message };
      }
    }
    
    // Yeni verileri ekle
    const { data, error } = await supabase
      .from('performance_data')
      .insert(performanceDataArray)
      .select();
    
    if (error) {
      console.error('❌ Bulk performance data save error:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('❌ bulkSavePerformanceData catch error:', error);
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

// Tüm performans verilerini sil (Admin Panel için)
export const deleteAllPerformanceData = async () => {
  try {
    // Önce toplam kayıt sayısını al
    const { count: totalCount, error: countError } = await supabase
      .from('performance_data')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Kayıt sayısı alma hatası:', countError);
      return { success: false, error: countError.message };
    }
    
    if (totalCount === 0) {
      return { success: true, message: 'Silinecek veri bulunamadı' };
    }
    
    // Tüm verileri sil
    const { error } = await supabase
      .from('performance_data')
      .delete()
      .neq('id', 0); // Tüm kayıtları sil (id != 0 koşulu ile)
    
    if (error) {
      console.error('❌ Veri silme hatası:', error);
      return { success: false, error: error.message };
    }
    
    return { 
      success: true, 
      message: `${totalCount} performans verisi başarıyla silindi`
    };
  } catch (error) {
    console.error('❌ deleteAllPerformanceData hatası:', error);
    return { success: false, error: error.message };
  }
};

// Performans analizi verilerini kaydet
export const savePerformanceAnalysis = async (analysisData) => {
  try {
    const { data, error } = await supabase
      .from('performance_logs')
      .insert([{
        analysis_date: new Date().toISOString(),
        total_employees: analysisData.totalEmployees,
        total_trips: analysisData.totalTrips,
        total_pallets: analysisData.totalPallets,
        total_boxes: analysisData.totalBoxes,
        analysis_details: analysisData
      }])
      .select();
    
    if (error) throw error;
    
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
    if (!leaveDataArray || leaveDataArray.length === 0) {
      return { success: false, error: 'İzin verisi bulunamadı' };
    }
    
    // Bulk insert
    const { data, error } = await supabase
      .from('leave_requests')
      .insert(leaveDataArray)
      .select();
    
    if (error) {
      console.error('❌ Bulk leave data save error:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('❌ bulkSaveLeaveData catch error:', error);
    return { success: false, error: error.message };
  }
}; 

// Kasa Sayısı Kontrol ve Güncelleme fonksiyonları
export const verifyAndUpdateCashierCounts = async (excelData) => {
  try {
    if (!excelData || !Array.isArray(excelData) || excelData.length === 0) {
      return { success: false, error: 'Geçersiz Excel verisi' };
    }
    
    const updates = [];
    const mismatches = [];
    
    for (const excelRow of excelData) {
      try {
        const { employee_name, date, job_count, pallet_count, box_count, location } = excelRow;
        
        // Gerekli alanları kontrol et
        if (!employee_name || !date) {
          continue;
        }
        
        // Mevcut veriyi bul - akıllı isim eşleştirme ile
        const existingRecord = await findExistingRecord(employee_name, date);
        
        if (existingRecord) {
          // Veri farklılıklarını kontrol et
          const hasChanges = 
            existingRecord.job_count !== job_count ||
            existingRecord.pallet_count !== pallet_count ||
            existingRecord.box_count !== box_count ||
            existingRecord.location !== location;
          
          if (hasChanges) {
            updates.push({
              id: existingRecord.id,
              employee_code: existingRecord.employee_code,
              date: existingRecord.date,
              old_data: {
                job_count: existingRecord.job_count,
                pallet_count: existingRecord.pallet_count,
                box_count: existingRecord.box_count,
                location: existingRecord.location
              },
              new_data: {
                job_count,
                pallet_count,
                box_count,
                location
              }
            });
          }
        } else {
          mismatches.push({
            employee_name,
            date,
            reason: 'Kayıt bulunamadı'
          });
        }
      } catch (rowError) {
        console.error('❌ Satır işleme hatası:', rowError, 'Satır:', excelRow);
        mismatches.push({
          employee_name: excelRow.employee_name || 'Bilinmiyor',
          date: excelRow.date || 'Bilinmiyor',
          reason: 'Veri işleme hatası: ' + rowError.message
        });
      }
    }
    
    return { 
      success: true, 
      updates, 
      mismatches,
      summary: {
        total_checked: excelData.length,
        updates_needed: updates.length,
        not_found: mismatches.length
      }
    };
  } catch (error) {
    console.error('❌ KASA SAYISI KONTROL HATASI:', error);
    return { success: false, error: error.message };
  }
};

// Var olan kaydı akıllı isim eşleştirme ile bul
const findExistingRecord = async (employeeName, date) => {
  try {
    if (!employeeName || !date) {
      return null;
    }
    
    // Önce tam isim eşleştirme
    let { data: records, error: recordsError } = await supabase
      .from('performance_data')
      .select('*')
      .eq('date', date);
    
    if (recordsError) {
      console.error('❌ Performans verileri çekme hatası:', recordsError);
      return null;
    }
    
    if (!records || records.length === 0) {
      return null;
    }
    
    // Personel listesi çek
    const { data: employees, error: employeesError } = await supabase
      .from('employee_codes')
      .select('*');
    
    if (employeesError) {
      console.error('❌ Personel kodları çekme hatası:', employeesError);
      return null;
    }
    
    if (!employees || employees.length === 0) {
      return null;
    }
    
    // Akıllı isim eşleştirme
    const matchedEmployee = findBestNameMatch(employeeName, employees);
    
    if (matchedEmployee) {
      const record = records.find(r => r.employee_code === matchedEmployee.employee_code);
      
      if (record) {
        return record;
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ findExistingRecord hatası:', error);
    return null;
  }
};

// Akıllı isim eşleştirme fonksiyonu
const findBestNameMatch = (inputName, employees) => {
  if (!inputName || !employees || employees.length === 0) {
    return null;
  }
  
  const normalizedInput = inputName.replace(/\s+/g, ' ').trim().toLowerCase();
  
  // 1. Tam eşleşme
  const exactMatch = employees.find(emp => 
    emp.employee_name.toLowerCase() === normalizedInput
  );
  if (exactMatch) {
    return exactMatch;
  }
  
  // 2. Boşluk normalize eşleşme
  const spaceNormalizedMatch = employees.find(emp => 
    emp.employee_name.replace(/\s+/g, '').toLowerCase() === normalizedInput.replace(/\s+/g, '')
  );
  if (spaceNormalizedMatch) {
    return spaceNormalizedMatch;
  }
  
  // 3. Kelime sırası farklı eşleşme
  const inputWords = normalizedInput.split(' ').filter(w => w.length > 0);
  const wordOrderMatch = employees.find(emp => {
    const empWords = emp.employee_name.toLowerCase().split(' ').filter(w => w.length > 0);
    if (inputWords.length !== empWords.length) return false;
    
    return inputWords.every(word => empWords.includes(word));
  });
  if (wordOrderMatch) {
    return wordOrderMatch;
  }
  
  // 4. Benzerlik tabanlı eşleşme (%80+ benzerlik)
  let bestMatch = null;
  let bestScore = 0;
  
  employees.forEach(emp => {
    try {
      const similarity = calculateSimilarity(normalizedInput, emp.employee_name.toLowerCase());
      if (similarity > bestScore && similarity >= 0.8) {
        bestMatch = emp;
        bestScore = similarity;
      }
    } catch (error) {
      // Benzerlik hesaplama hatası
    }
  });
  
  if (bestMatch) {
    return bestMatch;
  }
  
  return null;
};

// String benzerlik hesaplama
const calculateSimilarity = (str1, str2) => {
  try {
    if (!str1 || !str2 || typeof str1 !== 'string' || typeof str2 !== 'string') {
      return 0;
    }
    
    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);
    
    if (maxLen === 0) return 1;
    
    const distance = levenshteinDistance(str1, str2);
    return (maxLen - distance) / maxLen;
  } catch (error) {
    console.error('❌ Benzerlik hesaplama hatası:', error);
    return 0;
  }
};

// Levenshtein distance hesaplama
const levenshteinDistance = (str1, str2) => {
  try {
    if (!str1 || !str2 || typeof str1 !== 'string' || typeof str2 !== 'string') {
      return Math.max(str1?.length || 0, str2?.length || 0);
    }
    
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  } catch (error) {
    console.error('❌ Levenshtein distance hesaplama hatası:', error);
    return Math.max(str1?.length || 0, str2?.length || 0);
  }
};

// Güncellemeleri uygula
export const applyCashierCountUpdates = async (updates) => {
  try {
    const updatePromises = updates.map(update => 
      supabase
        .from('performance_data')
        .update({
          job_count: update.new_data.job_count,
          pallet_count: update.new_data.pallet_count,
          box_count: update.new_data.box_count,
          location: update.new_data.location,
          updated_at: new Date().toISOString()
        })
        .eq('id', update.id)
    );
    
    const results = await Promise.all(updatePromises);
    
    // Hataları kontrol et
    const errors = results.filter(result => result.error);
    
    if (errors.length > 0) {
      console.error('❌ Bazı güncellemeler başarısız:', errors);
      return { 
        success: false, 
        error: `${errors.length} güncelleme başarısız oldu`,
        successful_updates: results.length - errors.length
      };
    }
    
    return { 
      success: true, 
      updated_count: results.length,
      message: `${results.length} kayıt başarıyla güncellendi`
    };
    
  } catch (error) {
    console.error('❌ KASA SAYISI GÜNCELLEME HATASI:', error);
    return { success: false, error: error.message };
  }
}; 