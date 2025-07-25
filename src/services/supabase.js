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
    // Önce personel bilgisini al (employee_code için)
    const { data: personnelData, error: getError } = await supabase
      .from('personnel')
      .select('employee_code')
      .eq('id', id)
      .single();
    
    if (getError) throw getError;
    
    const employeeCode = personnelData.employee_code;
    
    // 1. Önce performance_data tablosundaki ilgili kayıtları sil
    const { error: performanceError } = await supabase
      .from('performance_data')
      .delete()
      .eq('employee_code', employeeCode);
    
    if (performanceError) {
      console.warn('Performance data deletion warning:', performanceError);
      // Performance data silme hatası kritik değil, devam et
    }
    
    // 2. daily_notes tablosundaki ilgili kayıtları sil
    const { error: notesError } = await supabase
      .from('daily_notes')
      .delete()
      .eq('employee_code', employeeCode);
    
    if (notesError) {
      console.warn('Daily notes deletion warning:', notesError);
      // Daily notes silme hatası kritik değil, devam et
    }
    
    // 3. weekly_schedules tablosundaki ilgili kayıtları sil
    const { error: schedulesError } = await supabase
      .from('weekly_schedules')
      .delete()
      .eq('employee_code', employeeCode);
    
    if (schedulesError) {
      console.warn('Weekly schedules deletion warning:', schedulesError);
      // Weekly schedules silme hatası kritik değil, devam et
    }
    
    // 4. Son olarak personeli sil
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

// Mağaza kodlarına göre location bilgilerini getir
export const getStoreLocationsByCodes = async (storeCodes) => {
  try {
    if (!storeCodes || storeCodes.length === 0) {
      return { success: true, data: [] };
    }

    const { data, error } = await supabase
      .from('stores')
      .select('store_code, location')
      .in('store_code', storeCodes);
    
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Get store locations error:', error);
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
    
    // Session'ı geri yükle (eğer varsa)
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.auth.setSession(session);
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
    // Araç tipini belirle
    let vehicleType = 'Kamyon'; // Varsayılan olarak Kamyon
    if (performanceData.license_plate) {
      const plate = performanceData.license_plate.toString().toUpperCase();
      
      // Ana plakayı bul (-2, -3 gibi sonekleri kaldır)
      const basePlate = plate.split('-')[0];
      
      // Önce vehicles tablosundan araç tipini bul (RLS bypass ile)
      const { data: vehicleData, error: vehicleError } = await supabaseAdmin
        .from('vehicles')
        .select('vehicle_type')
        .eq('license_plate', basePlate)
        .single();
      
      if (!vehicleError && vehicleData && vehicleData.vehicle_type) {
        vehicleType = vehicleData.vehicle_type;
        console.log(`✅ Araç tipi bulundu: ${performanceData.license_plate} (ana plaka: ${basePlate}) -> ${vehicleType}`);
      } else {
        // Vehicles tablosunda bulunamazsa, plaka içeriğinden tahmin et
        if (plate.includes('KAMYON') || plate.includes('TRUCK')) {
          vehicleType = 'Kamyon';
        } else if (plate.includes('KAMYONET') || plate.includes('PICKUP')) {
          vehicleType = 'Kamyonet';
        } else if (plate.includes('TIR') || plate.includes('SEMI')) {
          vehicleType = 'Tır';
        } else if (plate.includes('KÜÇÜK') || plate.includes('SMALL')) {
          vehicleType = 'Küçük Araç';
        } else {
          // Hiçbir şey bulunamazsa varsayılan olarak Kamyon
          vehicleType = 'Kamyon';
        }
        console.log(`⚠️ Araç tipi tahmin edildi: ${performanceData.license_plate} -> ${vehicleType}`);
      }
    }
    
    // Vehicle type'ı ekle
    const enrichedData = {
      ...performanceData,
      vehicle_type: vehicleType
    };
    
    const { data, error } = await supabase
      .from('performance_data')
      .upsert([enrichedData], { 
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
    
    // Araç tiplerini belirle ve verileri zenginleştir
    const enrichedDataArray = await Promise.all(performanceDataArray.map(async (record) => {
              let vehicleType = 'Kamyon'; // Varsayılan olarak Kamyon
        if (record.license_plate) {
          const plate = record.license_plate.toString().toUpperCase();
          
          // Ana plakayı bul (-2, -3 gibi sonekleri kaldır)
          const basePlate = plate.split('-')[0];
          
          // Önce vehicles tablosundan araç tipini bul (RLS bypass ile)
          const { data: vehicleData, error: vehicleError } = await supabaseAdmin
            .from('vehicles')
            .select('vehicle_type')
            .eq('license_plate', basePlate)
            .single();
          
          if (!vehicleError && vehicleData && vehicleData.vehicle_type) {
            vehicleType = vehicleData.vehicle_type;
            console.log(`✅ Araç tipi bulundu: ${record.license_plate} (ana plaka: ${basePlate}) -> ${vehicleType}`);
          } else {
            // Vehicles tablosunda bulunamazsa, plaka içeriğinden tahmin et
            if (plate.includes('KAMYON') || plate.includes('TRUCK')) {
              vehicleType = 'Kamyon';
            } else if (plate.includes('KAMYONET') || plate.includes('PICKUP')) {
              vehicleType = 'Kamyonet';
            } else if (plate.includes('TIR') || plate.includes('SEMI')) {
              vehicleType = 'Tır';
            } else if (plate.includes('KÜÇÜK') || plate.includes('SMALL')) {
              vehicleType = 'Küçük Araç';
            } else {
              // Hiçbir şey bulunamazsa varsayılan olarak Kamyon
              vehicleType = 'Kamyon';
            }
            console.log(`⚠️ Araç tipi tahmin edildi: ${record.license_plate} -> ${vehicleType}`);
          }
        }
      
      return {
        ...record,
        vehicle_type: vehicleType
      };
    }));
    
    // Yeni verileri ekle (upsert ile duplicate kontrolü)
    const { data, error } = await supabase
      .from('performance_data')
      .upsert(enrichedDataArray, { 
        onConflict: 'date,employee_code',
        ignoreDuplicates: false 
      })
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

// Vardiya yönetimi fonksiyonları
export const saveWeeklySchedules = async (scheduleData) => {
  try {
    if (!scheduleData || scheduleData.length === 0) {
      return { success: false, error: 'Vardiya verisi bulunamadı' };
    }
    
    
    // Duplicate kontrolü yap
    const uniqueSchedules = [];
    const seenKeys = new Set();
    
    scheduleData.forEach(schedule => {
      const key = `${schedule.employee_code}_${schedule.week_start_date}_${schedule.shift_type}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueSchedules.push(schedule);
      } else {
      }
    });
    
    const { data, error } = await supabase
      .from('weekly_schedules')
      .upsert(uniqueSchedules, { 
        onConflict: 'employee_code,week_start_date',
        ignoreDuplicates: false 
      })
      .select();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Weekly schedules save error:', error);
    return { success: false, error: error.message };
  }
};

export const saveWeeklyPeriods = async (periodData) => {
  try {
    if (!periodData || periodData.length === 0) {
      return { success: false, error: 'Dönem verisi bulunamadı' };
    }
    
    const { data, error } = await supabase
      .from('weekly_periods')
      .upsert(periodData, { 
        onConflict: 'week_start_date,week_end_date,year',
        ignoreDuplicates: false 
      })
      .select();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Weekly periods save error:', error);
    return { success: false, error: error.message };
  }
};

export const saveDailyAttendance = async (attendanceData) => {
  try {
    // Tarih formatını normalize et (YYYY-MM-DD formatına çevir)
    const normalizeDate = (dateStr) => {
      if (!dateStr) return null;
      
      // Eğer zaten YYYY-MM-DD formatındaysa olduğu gibi döndür
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
      
      // DD.MM.YYYY formatını YYYY-MM-DD'ye çevir
      if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('.');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      
      return dateStr;
    };
    
    const normalizedDate = normalizeDate(attendanceData.date);
    console.log(`📅 Tarih normalizasyonu: "${attendanceData.date}" -> "${normalizedDate}"`);
    
    // Önce aynı personel ve tarih için HERHANGI BİR kayıt var mı kontrol et
    const { data: existingRecords, error: checkError } = await supabase
      .from('daily_notes')
      .select('*')
      .eq('employee_code', attendanceData.employee_code)
      .eq('date', normalizedDate);
    
    if (checkError) throw checkError;
    
    // Aynı durum için kayıt var mı kontrol et
    const sameStatusRecord = existingRecords?.find(record => record.status === attendanceData.status);
    
    if (sameStatusRecord) {
      return { 
        success: false, 
        error: `Bu personel için ${normalizedDate} tarihinde zaten "${attendanceData.status}" durumu kayıtlı.` 
      };
    }
    
    // Yeni kayıt ekle - normalize edilmiş tarih ile
    const { data, error } = await supabase
      .from('daily_notes')
      .insert([{
        employee_code: attendanceData.employee_code,
        date: normalizedDate, // Normalize edilmiş tarih kullan
        status: attendanceData.status,
        reason: attendanceData.reason,
        notes: attendanceData.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Daily attendance save error:', error);
    return { success: false, error: error.message };
  }
};



export const getDailyNotes = async (date = null) => {
  try {
    // Önce sadece daily_notes tablosundan veri çek
    let query = supabase
      .from('daily_notes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (date) {
      query = query.eq('date', date);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Daily notes query hatası:', error);
      throw error;
    }
    
    // Sonra personnel tablosundan personel bilgilerini çek
    const { data: personnelData, error: personnelError } = await supabase
      .from('personnel')
      .select('employee_code, full_name, position');
    
    if (personnelError) {
      console.error('❌ Personnel query hatası:', personnelError);
    }
    
    
    // Personnel verilerini employee_code'ya göre map'le
    const personnelMap = {};
    if (personnelData) {
      personnelData.forEach(person => {
        personnelMap[person.employee_code] = person;
      });
    }
    
    // Daily notes verilerini enrich et
    const enrichedData = data?.map(item => {
      const personnel = personnelMap[item.employee_code];
      return {
        ...item,
        full_name: personnel?.full_name || 'Bilinmeyen',
        position: personnel?.position || 'Bilinmeyen'
      };
    }) || [];
    
    
    return { success: true, data: enrichedData };
  } catch (error) {
    console.error('❌ Get daily notes error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getAllShiftStatistics = async (year = null) => {
  try {
    
    // Tüm haftalık programları getir
    const { data: schedules, error } = await supabase
      .from('weekly_schedules')
      .select('employee_code, shift_type')
      .order('created_at', { ascending: true });
      
    if (error) throw error;
    
    
    if (!schedules || schedules.length === 0) {
      return { success: true, data: [] };
    }
    
    // Personel bazında grupla ve istatistikleri hesapla
    const statistics = {};
    
    schedules.forEach(schedule => {
      const employeeCode = schedule.employee_code;
      
      if (!statistics[employeeCode]) {
        statistics[employeeCode] = {
          employee_code: employeeCode,
          total_night_shifts: 0,
          total_day_shifts: 0,
          total_evening_shifts: 0,
          total_temp_assignments: 0,
          total_sick_days: 0,
          total_annual_leave: 0
        };
      }
      
      // Vardiya türüne göre sayacı artır
      switch (schedule.shift_type) {
        case 'gece':
          statistics[employeeCode].total_night_shifts++;
          break;
        case 'gunduz':
          statistics[employeeCode].total_day_shifts++;
          break;
        case 'aksam':
          statistics[employeeCode].total_evening_shifts++;
          break;
        case 'gecici_gorev':
          statistics[employeeCode].total_temp_assignments++;
          break;
        case 'raporlu':
          statistics[employeeCode].total_sick_days++;
          break;
        case 'yillik_izin':
          statistics[employeeCode].total_annual_leave++;
          break;
      }
    });
    
    const result = Object.values(statistics);
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Get all shift statistics error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getDailyAttendance = async (date) => {
  try {
    const { data, error } = await supabase
      .from('daily_attendance')
      .select(`
        *,
        personnel:personnel!daily_attendance_employee_code_fkey (
          full_name,
          position
        )
      `)
      .eq('date', date)
      .order('employee_code', { ascending: true });
    
    if (error) throw error;
    
    const enrichedData = data?.map(item => ({
      ...item,
      full_name: item.personnel?.full_name || 'Bilinmeyen',
      position: item.personnel?.position || 'Bilinmeyen'
    })) || [];
    
    return { success: true, data: enrichedData };
  } catch (error) {
    console.error('Get daily attendance error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Bu fonksiyon artık kullanılmıyor - shift_statistics tablosu kaldırıldı

// Bu fonksiyon artık kullanılmıyor - shift_statistics tablosu kaldırıldı

// Bu fonksiyon artık kullanılmıyor - shift_statistics tablosu kaldırıldı

export const getWeeklyPeriods = async (year = null) => {
  try {
    console.log(`🔍 Haftalık dönemler sorgulanıyor... (year: ${year})`);
    
    let query = supabase
      .from('weekly_periods')
      .select('*')
      .order('end_date', { ascending: false }); // En son biten dönem en üstte
    
    const { data, error } = await query;
    
    if (error) throw error;
    
 
    if (data && data.length > 0) {
      // İlk 5 dönem örneği
      console.log(`📋 İlk 5 dönem örneği:`, data.slice(0, 5).map(period => ({
        id: period.id,
        start_date: period.start_date,
        end_date: period.end_date,
        week_label: period.week_label
      })));
    }
    
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Get weekly periods error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getPersonnelShiftDetails = async (employeeCode, year = null) => {
  try {
    let query = supabase
      .from('weekly_schedules')
      .select('*')
      .eq('employee_code', employeeCode)
      .order('created_at', { ascending: false });
    
    // year parametresini kaldır çünkü tabloda year kolonu yok
    // if (year) {
    //   query = query.eq('year', year);
    // }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Get personnel shift details error:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getWeeklySchedules = async (year = null) => {
  try {
    
    // En basit query - sadece select
    const { data, error } = await supabase
      .from('weekly_schedules')
      .select('*');
    
    if (error) {
      throw error;
    }
    
    if (data && data.length > 0) {
    }
    
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('❌ Get weekly schedules error:', error);
    return { success: false, error: error.message, data: [] };
  }
}; 

// Veritabanını temizleme fonksiyonu - TÜM VARDİYA VERİLERİNİ SİLER
export const clearAllShiftData = async () => {
  try {
    
    const results = {
      weekly_schedules: { success: false, count: 0 },
      weekly_periods: { success: false, count: 0 }
    };

    // 1. Weekly schedules tablosunu temizle
    try {
      const { data: schedules, error: schedError } = await supabase
        .from('weekly_schedules')
        .select('*');
  
      
      if (!schedError && schedules && schedules.length > 0) {
 
        // Tüm kayıtları tek seferde silmeyi dene
        const { error: deleteError } = await supabase
          .from('weekly_schedules')
          .delete()
          .neq('id', 0);
        
        if (!deleteError) {
          results.weekly_schedules = { success: true, count: schedules.length };
          console.log('✅ weekly_schedules temizlendi:', schedules.length, 'kayıt');
        } else {
          console.error('❌ weekly_schedules silme hatası:', deleteError);
          results.weekly_schedules = { success: false, count: schedules.length };
        }
      } else {
        console.log('ℹ️ weekly_schedules tablosu zaten boş');
        results.weekly_schedules = { success: true, count: 0 };
      }
    } catch (error) {
      console.error('❌ weekly_schedules temizleme hatası:', error);
      results.weekly_schedules = { success: false, count: 0 };
    }

    // 2. Weekly periods tablosunu temizle
    try {
      console.log('🔄 weekly_periods tablosu kontrol ediliyor...');
      const { data: periods, error: periodError } = await supabase
        .from('weekly_periods')
        .select('*');
      
      console.log('📊 weekly_periods mevcut kayıtlar:', periods?.length || 0);
      
      if (!periodError && periods && periods.length > 0) {
        console.log('🗑️ weekly_periods silme işlemi başlatılıyor...');
        
        // RLS sorunu olabilir, direkt SQL query deneyelim
        console.log('🔄 SQL query ile silme deneniyor...');
        
        try {
          // SQL query ile direkt silme
          const { error: sqlError } = await supabase
            .rpc('execute_sql', { 
              sql: 'DELETE FROM weekly_periods;' 
            });
          
          if (!sqlError) {
            console.log('✅ SQL ile silme başarılı');
          } else {
            console.error('❌ SQL silme hatası:', sqlError);
            
            // SQL çalışmazsa normal delete dene
            console.log('🔄 Normal delete deneniyor...');
            const { error: normalDeleteError } = await supabase
              .from('weekly_periods')
              .delete()
              .neq('id', 0);
            
            if (!normalDeleteError) {
              console.log('✅ Normal delete başarılı');
            } else {
              console.error('❌ Normal delete hatası:', normalDeleteError);
              
              // En son çare: Tek tek silme
              console.log('🔄 Tek tek silme deneniyor...');
              for (const period of periods) {
                console.log('🗑️ Siliniyor:', period.id, period.start_date, period.end_date);
                const { error: singleDeleteError } = await supabase
                  .from('weekly_periods')
                  .delete()
                  .eq('id', period.id);
                
                if (singleDeleteError) {
                  console.error('❌ Tek kayıt silme hatası:', singleDeleteError);
                  console.error('❌ Hata detayı:', singleDeleteError.message);
                  console.error('❌ Hata kodu:', singleDeleteError.code);
                } else {
                  console.log('✅ Başarıyla silindi:', period.id);
                }
              }
            }
          }
        } catch (error) {
          console.error('❌ SQL query hatası:', error);
          
          // Hata durumunda normal delete dene
          console.log('🔄 Normal delete deneniyor...');
          const { error: normalDeleteError } = await supabase
            .from('weekly_periods')
            .delete()
            .neq('id', 0);
          
          if (!normalDeleteError) {
            console.log('✅ Normal delete başarılı');
          } else {
            console.error('❌ Normal delete hatası:', normalDeleteError);
          }
        }
        
        // Silme sonrası kontrol
        const { data: remainingPeriods, error: checkError } = await supabase
          .from('weekly_periods')
          .select('*');
        
        console.log('📊 Silme sonrası kalan kayıtlar:', remainingPeriods?.length || 0);
        
        if (!checkError && remainingPeriods.length === 0) {
          results.weekly_periods = { success: true, count: periods.length };
          console.log('✅ weekly_periods başarıyla temizlendi:', periods.length, 'kayıt');
        } else {
          console.error('❌ weekly_periods tam temizlenemedi, kalan:', remainingPeriods?.length || 0);
          results.weekly_periods = { success: false, count: periods.length };
        }
      } else {
        console.log('ℹ️ weekly_periods tablosu zaten boş');
        results.weekly_periods = { success: true, count: 0 };
      }
    } catch (error) {
      console.error('❌ weekly_periods temizleme hatası:', error);
      results.weekly_periods = { success: false, count: 0 };
    }

    console.log('✅ Eski vardiya verileri temizlendi');
    
    // RLS sorunu varsa kullanıcıya bilgi ver
    if (results.weekly_periods.success === false) {
      return { 
        success: false, 
        message: `⚠️ RLS Sorunu: weekly_periods tablosu silinemedi. Supabase Dashboard'dan manuel olarak silmeniz gerekiyor.`,
        results 
      };
    }
    
    return { 
      success: true, 
      message: `Temizleme tamamlandı: ${results.weekly_schedules.count} program, ${results.weekly_periods.count} dönem silindi. Güncel vardiya verileri ve günlük notlar korundu.`,
      results 
    };
    
  } catch (error) {
    console.error('Veritabanı temizleme hatası:', error);
    return { success: false, error: error.message };
  }
}; 

// Excel verilerini kaydetme fonksiyonu
export const saveExcelData = async (periods, schedules) => {
  try {
    console.log('📊 Excel verisi kaydediliyor...');
    console.log('📋 Periods:', periods.length);
    console.log('👥 Schedules:', schedules.length);
    
    // 1. Önce haftalık dönemleri kaydet (insert only)
    const { data: savedPeriods, error: periodError } = await supabase
      .from('weekly_periods')
      .insert(periods)
      .select();
    
    if (periodError) {
      console.error('❌ Period kaydetme hatası:', periodError);
      throw periodError;
    }
    
    console.log('✅ Periods kaydedildi:', savedPeriods.length);
    
    // 2. Schedules'ı period ID'leri ile güncelle
    const updatedSchedules = [];
    
    for (const schedule of schedules) {
      // Her schedule için uygun period'u bul
      const matchingPeriod = savedPeriods.find(period => 
        period.start_date === schedule.period_start_date && 
        period.end_date === schedule.period_end_date
      );
      
      if (matchingPeriod) {
        const updatedSchedule = {
          employee_code: schedule.employee_code,
          period_id: matchingPeriod.id,
          shift_type: schedule.shift_type,
          shift_hours: schedule.shift_hours,
          status: schedule.status
        };
        updatedSchedules.push(updatedSchedule);
      } else {
        console.log('⚠️ Eşleşen period bulunamadı:', {
          schedule: schedule,
          available_periods: savedPeriods.map(p => ({ start: p.start_date, end: p.end_date, id: p.id }))
        });
      }
    }
    
    console.log('✅ Updated schedules:', updatedSchedules.length);
    
    // 3. Vardiya programlarını kaydet (insert only)
    if (updatedSchedules.length > 0) {
      const { data: savedSchedules, error: scheduleError } = await supabase
        .from('weekly_schedules')
        .insert(updatedSchedules)
        .select();
      
      if (scheduleError) {
        console.error('❌ Vardiya programları kaydedilemedi:', scheduleError);
        throw scheduleError;
      }
      
      console.log('✅ Schedules kaydedildi:', savedSchedules.length);
    }
    
    // Modern başarı mesajı
    const totalPeriods = savedPeriods.length;
    const totalSchedules = updatedSchedules.length;
    
    let successMessage = '';
    if (totalPeriods === 1) {
      successMessage = `✅ **${savedPeriods[0].week_label}** dönemi başarıyla yüklendi!\n\n📊 ${totalSchedules} vardiya kaydı eklendi`;
    } else {
      successMessage = `✅ **${totalPeriods} dönem** başarıyla yüklendi!\n\n📊 ${totalSchedules} vardiya kaydı eklendi`;
    }
    
    return {
      success: true,
      periods_count: savedPeriods.length,
      schedules_count: totalSchedules,
      stats_updated: true,
      message: successMessage
    };
    
  } catch (error) {
    console.error('❌ Excel veri kaydetme hatası:', error);
    return { success: false, error: error.message };
  }
}; 

// Current Weekly Shifts - Güncel hafta vardiya verileri
// Bu fonksiyonlar artık kullanılmıyor - current_weekly_shifts tablosu silindi
// export const saveCurrentWeeklyShifts = async (shiftsData) => { ... }
// export const getCurrentWeeklyShifts = async () => { ... }

// Excel'den güncel hafta verilerini yükleme
export const saveCurrentWeekExcelData = async (excelData, weekLabel, startDate, endDate) => {
  try {
    console.log('🔄 Güncel hafta Excel verileri işleniyor...');
    
    // 1. Önce aynı tarihli mevcut veriyi kontrol et
    const { data: existingPeriod, error: checkError } = await supabase
      .from('weekly_periods')
      .select('*')
      .eq('week_label', weekLabel)
      .eq('start_date', startDate)
      .eq('end_date', endDate)
      .single();
    
    if (existingPeriod) {
      console.log('⚠️ Aynı tarihli veri mevcut:', existingPeriod);
      return { 
        success: false, 
        error: 'Aynı tarihli veri zaten mevcut!', 
        existingData: existingPeriod,
        isDuplicate: true 
      };
    }
    
    // 2. Önce weekly_periods'a yeni dönem ekle
    const periodData = {
      week_label: weekLabel,
      start_date: startDate,
      end_date: endDate,
      year: new Date(startDate).getFullYear(), // Year değerini ekle
      is_current: true // Güncel dönem işareti
    };
    
    // Mevcut güncel dönemleri false yap
    await supabase
      .from('weekly_periods')
      .update({ is_current: false })
      .eq('is_current', true);
    
    // Yeni dönemi ekle
    console.log('🔄 Yeni dönem ekleniyor:', periodData);
    const { data: periodResult, error: periodError } = await supabase
      .from('weekly_periods')
      .insert(periodData)
      .select()
      .single();
    
    if (periodError) {
      console.error('❌ Dönem kaydedilemedi:', periodError);
      console.error('❌ Hata detayı:', periodError.message);
      console.error('❌ Hata kodu:', periodError.code);
      return { success: false, error: periodError };
    }
    
    console.log('✅ Yeni dönem kaydedildi:', periodResult);
    
    // 2. Excel verilerini current_weekly_shifts'e kaydet
    const shiftsData = excelData.map(row => {
      // Sütun adlarını kontrol et ve debug log ekle
      console.log('🔍 Excel satırı:', row);
      console.log('🔍 Sütun adları:', Object.keys(row));
      
      const employeeCode = row['Personel ID'] || row['PERSONEL ID'] || row['PersonelID'];
      const fullName = row['ADI SOYADI'] || row['Ad Soyad'] || row['AD SOYAD'];
      const position = row['GÖREVİ'] || row['Görev'] || row['GOREV'];
      
      console.log('🔍 Çıkarılan veriler:', { employeeCode, fullName, position });
      
      return {
        employee_code: employeeCode,
        full_name: fullName,
        position: position,
        shift_type: getShiftTypeFromExcel(row[weekLabel]),
        shift_details: row[weekLabel],
        period_id: periodResult.id,
        week_label: weekLabel,
        start_date: startDate,
        end_date: endDate
      };
    }).filter(shift => shift.employee_code && shift.full_name); // Boş verileri filtrele
    
    console.log('🔍 İşlenecek vardiya verileri:', shiftsData.length, 'kayıt');
    
    const shiftsResult = await saveCurrentWeeklyShifts(shiftsData);
    
    if (!shiftsResult.success) {
      return shiftsResult;
    }
    
    // 3. Aynı verileri weekly_schedules tablosuna da kaydet (genel tablo için)
    const weeklySchedulesData = shiftsData.map(shift => ({
      employee_code: shift.employee_code,
      full_name: shift.full_name,
      position: shift.position,
      shift_type: shift.shift_type,
      shift_hours: shift.shift_details,
      period_id: periodResult.id,
      week_label: weekLabel,
      start_date: startDate,
      end_date: endDate,
      year: new Date(startDate).getFullYear()
    }));
    
    console.log('🔄 Weekly schedules tablosuna kaydediliyor...');
    const { data: schedulesData, error: schedulesError } = await supabase
      .from('weekly_schedules')
      .insert(weeklySchedulesData)
      .select();
    
    if (schedulesError) {
      console.error('❌ Weekly schedules kaydedilemedi:', schedulesError);
      return { success: false, error: schedulesError };
    }
    
    console.log('✅ Weekly schedules kaydedildi:', schedulesData.length, 'kayıt');
    console.log('✅ Güncel hafta verileri başarıyla kaydedildi');
    return { success: true, data: { period: periodResult, shifts: shiftsResult.data, schedules: schedulesData } };
    
  } catch (error) {
    console.error('❌ Güncel hafta Excel verileri işleme hatası:', error);
    return { success: false, error };
  }
};

// Excel'deki vardiya tipini belirle
const getShiftTypeFromExcel = (shiftValue) => {
  if (!shiftValue) return 'belirsiz';
  
  const value = shiftValue.toString().toLowerCase().trim();
  
  // Yıllık izin kontrolü
  if (value.includes('yıllık izin') || value.includes('yillik izin') || 
      value.includes('izinli')) {
    return 'yillik_izin';
  }
  
  // Raporlu kontrolü
  if (value.includes('rapor') || value.includes('raporlu')) {
    return 'raporlu';
  }
  
  // Habersiz kontrolü
  if (value.includes('habersiz') || value.includes('gelmedi')) {
    return 'habersiz';
  }
  
  // Gece vardiyası kontrolü
  if (value.includes('22:00') || value.includes('23:00') || 
      value.includes('00:00') || value.includes('06:00') ||
      value.includes('gece')) {
    return 'gece';
  }
  
  // Gündüz vardiyası kontrolü
  if (value.includes('08:00') || value.includes('16:00') ||
      value.includes('gunduz') || value.includes('gündüz')) {
    return 'gunduz';
  }
  
  return 'belirsiz';
};

// Belirli bir dönem ve vardiya verilerini silme
export const deletePeriodAndShifts = async (periodId) => {
  try {
    console.log('🗑️ Dönem ve vardiya verileri siliniyor...', periodId);
    
    // Önce dönem bilgisini al
    const { data: period, error: periodFetchError } = await supabase
      .from('weekly_periods')
      .select('week_label')
      .eq('id', periodId)
      .single();
    
    if (periodFetchError) {
      console.error('❌ Dönem bilgisi alınamadı:', periodFetchError);
      return { success: false, error: periodFetchError };
    }
    
    console.log('🔍 Silinecek dönem:', period);
    
    // Önce weekly_schedules tablosundan ilgili kayıtları sil
    const { error: schedulesError } = await supabase
      .from('weekly_schedules')
      .delete()
      .eq('period_id', periodId);
    
    if (schedulesError) {
      console.error('❌ Weekly schedules silinemedi:', schedulesError);
      return { success: false, error: schedulesError };
    }
    
    // Sonra dönemi sil
    const { error: periodError } = await supabase
      .from('weekly_periods')
      .delete()
      .eq('id', periodId);
    
    if (periodError) {
      console.error('❌ Dönem silinemedi:', periodError);
      return { success: false, error: periodError };
    }
    
    console.log('✅ Dönem ve vardiya verileri başarıyla silindi');
    return { success: true };
  } catch (error) {
    console.error('❌ Dönem silme hatası:', error);
    return { success: false, error };
  }
}; 

// Audit Log functions - İşlem geçmişi fonksiyonları
export const logAuditEvent = async (eventData) => {
  try {
    console.log('🔍 Audit log kaydediliyor:', {
      action: eventData.action,
      tableName: eventData.tableName,
      details: eventData.details
    });
    
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([{
        user_id: eventData.userId,
        user_email: eventData.userEmail,
        user_name: eventData.userName,
        action: eventData.action,
        table_name: eventData.tableName,
        record_id: eventData.recordId,
        old_values: eventData.oldValues,
        new_values: eventData.newValues,
        ip_address: eventData.ipAddress,
        user_agent: eventData.userAgent,
        details: eventData.details,
        created_at: new Date().toISOString()
      }])
      .select();
    
    if (error) {
      console.error('❌ Audit log kaydetme hatası:', error);
      throw error;
    }
    
    console.log('✅ Audit log başarıyla kaydedildi:', data?.[0]?.id);
    
    // Bildirim oluştur - sadece önemli işlemler için
    try {
      // Giriş/çıkış bildirimlerini gösterme
      if (eventData.action === 'LOGIN' || eventData.action === 'LOGOUT') {
        console.log('ℹ️ Giriş/çıkış bildirimi oluşturulmadı');
        return { success: true, data: data?.[0] };
      }
      
      const notificationTitle = getNotificationTitle(eventData.action, eventData.tableName);
      const notificationMessage = getNotificationMessage(eventData.action, eventData.tableName, eventData.details);
      
      const notificationData = {
        user_id: eventData.userId,
        user_email: eventData.userEmail,
        user_name: eventData.userName,
        title: notificationTitle,
        message: notificationMessage,
        type: 'audit',
        action_type: eventData.action,
        table_name: eventData.tableName,
        record_id: eventData.recordId
      };
      
      await createNotification(notificationData);
      
      // Toast bildirimi tetikle
      console.log('🔔 Toast bildirimi tetikleniyor...');
      const toastEvent = new CustomEvent('new-notification', {
        detail: {
          title: notificationTitle,
          message: notificationMessage,
          type: 'audit',
          created_at: new Date().toISOString()
        }
      });
      
      window.dispatchEvent(toastEvent);
      console.log('✅ Bildirim başarıyla oluşturuldu ve toast tetiklendi');
    } catch (notificationError) {
      console.error('❌ Bildirim oluşturma hatası:', notificationError);
    }
    
    return { success: true, data: data?.[0] };
  } catch (error) {
    console.error('❌ Audit log kaydetme hatası:', error);
    return { success: false, error: error.message };
  }
};

// Bildirim başlığı oluştur
const getNotificationTitle = (action, tableName) => {
  const actionMap = {
    'CREATE': 'Yeni Kayıt',
    'UPDATE': 'Güncelleme',
    'DELETE': 'Silme',
    'BULK_CREATE': 'Toplu Ekleme',
    'BULK_DELETE': 'Toplu Silme',
    'LOGIN': 'Giriş',
    'LOGOUT': 'Çıkış'
  };
  
  const tableMap = {
    'users': 'Kullanıcı',
    'personnel': 'Personel',
    'vehicles': 'Araç',
    'stores': 'Mağaza',
    'daily_notes': 'Günlük Not',
    'weekly_schedules': 'Vardiya',
    'performance_data': 'Performans Verisi',
    'auth': 'Kimlik Doğrulama'
  };
  
  const actionText = actionMap[action] || action;
  const tableText = tableMap[tableName] || tableName;
  
  return `${actionText} - ${tableText}`;
};

// Bildirim mesajı oluştur
const getNotificationMessage = (action, tableName, details) => {
  const actionMap = {
    'CREATE': 'yeni kayıt oluşturuldu',
    'UPDATE': 'kayıt güncellendi',
    'DELETE': 'kayıt silindi',
    'BULK_CREATE': 'toplu kayıt eklendi',
    'BULK_DELETE': 'toplu kayıt silindi',
    'LOGIN': 'sisteme giriş yapıldı',
    'LOGOUT': 'sistemden çıkış yapıldı'
  };
  
  const tableMap = {
    'users': 'kullanıcı',
    'personnel': 'personel',
    'vehicles': 'araç',
    'stores': 'mağaza',
    'daily_notes': 'günlük not',
    'weekly_schedules': 'vardiya',
    'performance_data': 'performans verisi',
    'auth': 'kimlik doğrulama'
  };
  
  const actionText = actionMap[action] || action.toLowerCase();
  const tableText = tableMap[tableName] || tableName;
  
  return `${tableText} için ${actionText}. ${details}`;
};

export const getAuditLogs = async (filters = {}) => {
  try {
    console.log('🔍 Audit loglar getiriliyor, filtreler:', filters);
    
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Filtreleri uygula
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    
    if (filters.userEmail) {
      query = query.eq('user_email', filters.userEmail);
    }
    
    if (filters.action) {
      query = query.eq('action', filters.action);
    }
    
    if (filters.tableName) {
      query = query.eq('table_name', filters.tableName);
    }
    
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }
    
    // Sayfalama
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Audit log getirme hatası:', error);
      throw error;
    }
    
    console.log('✅ Audit loglar başarıyla getirildi:', data?.length || 0, 'kayıt');
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('❌ Audit log getirme hatası:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getAuditLogStats = async () => {
  try {
    // Toplam kayıt sayısı
    const { count: totalCount, error: countError } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    // Son 7 günlük kayıt sayısı
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: recentCount, error: recentError } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());
    
    if (recentError) throw recentError;
    
    // En aktif kullanıcılar
    const { data: topUsers, error: usersError } = await supabase
      .from('audit_logs')
      .select('user_email, user_name')
      .gte('created_at', sevenDaysAgo.toISOString());
    
    if (usersError) throw usersError;
    
    // Kullanıcı bazında sayım
    const userStats = {};
    topUsers?.forEach(log => {
      const key = log.user_email;
      if (!userStats[key]) {
        userStats[key] = {
          email: log.user_email,
          name: log.user_name,
          count: 0
        };
      }
      userStats[key].count++;
    });
    
    const topUsersList = Object.values(userStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      success: true,
      data: {
        totalCount,
        recentCount,
        topUsers: topUsersList
      }
    };
  } catch (error) {
    console.error('Audit log istatistikleri hatası:', error);
    return { success: false, error: error.message };
  }
};

// Mevcut fonksiyonları audit log ile güncelle
export const addUserWithAudit = async (user, currentUser) => {
  try {
    const result = await addUser(user);
    
    if (result.success) {
      // Audit log kaydet
      await logAuditEvent({
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userName: currentUser?.user_metadata?.full_name || currentUser?.email,
        action: 'CREATE',
        tableName: 'users',
        recordId: result.data?.id,
        oldValues: null,
        newValues: {
          email: user.email,
          username: user.username,
          full_name: user.full_name,
          role: user.role,
          is_active: user.is_active
        },
        ipAddress: null,
        userAgent: navigator.userAgent,
        details: 'Yeni kullanıcı oluşturuldu'
      });
    }
    
    return result;
  } catch (error) {
    console.error('Add user with audit error:', error);
    return { success: false, error: error.message };
  }
};

export const updateUserWithAudit = async (id, updates, currentUser) => {
  try {
    // Önce mevcut kullanıcı bilgilerini al
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    const result = await updateUser(id, updates);
    
    if (result.success) {
      // Audit log kaydet
      await logAuditEvent({
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userName: currentUser?.user_metadata?.full_name || currentUser?.email,
        action: 'UPDATE',
        tableName: 'users',
        recordId: id,
        oldValues: existingUser,
        newValues: { ...existingUser, ...updates },
        ipAddress: null,
        userAgent: navigator.userAgent,
        details: 'Kullanıcı bilgileri güncellendi'
      });
    }
    
    return result;
  } catch (error) {
    console.error('Update user with audit error:', error);
    return { success: false, error: error.message };
  }
};

export const deleteUserWithAudit = async (id, currentUser) => {
  try {
    // Önce mevcut kullanıcı bilgilerini al
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    const result = await deleteUser(id);
    
    if (result.success) {
      // Audit log kaydet
      await logAuditEvent({
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userName: currentUser?.user_metadata?.full_name || currentUser?.email,
        action: 'DELETE',
        tableName: 'users',
        recordId: id,
        oldValues: existingUser,
        newValues: null,
        ipAddress: null,
        userAgent: navigator.userAgent,
        details: 'Kullanıcı silindi'
      });
    }
    
    return result;
  } catch (error) {
    console.error('Delete user with audit error:', error);
    return { success: false, error: error.message };
  }
};

export const deleteAllPerformanceDataWithAudit = async (currentUser) => {
  try {
    // Önce silinecek veri sayısını al
    const { count: totalCount } = await supabase
      .from('performance_data')
      .select('*', { count: 'exact', head: true });
    
    const result = await deleteAllPerformanceData();
    
    if (result.success) {
      // Audit log kaydet
      await logAuditEvent({
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userName: currentUser?.user_metadata?.full_name || currentUser?.email,
        action: 'BULK_DELETE',
        tableName: 'performance_data',
        recordId: null,
        oldValues: { deletedCount: totalCount },
        newValues: null,
        ipAddress: null,
        userAgent: navigator.userAgent,
        details: `Tüm performans verileri silindi (${totalCount} kayıt)`
      });
    }
    
    return result;
  } catch (error) {
    console.error('Delete all performance data with audit error:', error);
    return { success: false, error: error.message };
  }
};

export const clearAllShiftDataWithAudit = async (currentUser) => {
  try {
    // Önce silinecek veri sayılarını al
    const { count: schedulesCount } = await supabase
      .from('weekly_schedules')
      .select('*', { count: 'exact', head: true });
    
    const { count: periodsCount } = await supabase
      .from('weekly_periods')
      .select('*', { count: 'exact', head: true });
    
    const result = await clearAllShiftData();
    
    if (result.success) {
      // Audit log kaydet
      await logAuditEvent({
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userName: currentUser?.user_metadata?.full_name || currentUser?.email,
        action: 'BULK_DELETE',
        tableName: 'shift_data',
        recordId: null,
        oldValues: { 
          schedulesCount: schedulesCount || 0,
          periodsCount: periodsCount || 0
        },
        newValues: null,
        ipAddress: null,
        userAgent: navigator.userAgent,
        details: `Tüm vardiya verileri silindi (${schedulesCount || 0} program, ${periodsCount || 0} dönem)`
      });
    }
    
    return result;
  } catch (error) {
    console.error('Clear all shift data with audit error:', error);
    return { success: false, error: error.message };
  }
};

// Personnel functions with audit logging
export const addPersonnelWithAudit = async (personnel, currentUser) => {
  try {
    const result = await addPersonnel(personnel);
    
    if (result.success) {
      // Audit log kaydet
      await logAuditEvent({
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userName: currentUser?.user_metadata?.full_name || currentUser?.email,
        action: 'CREATE',
        tableName: 'personnel',
        recordId: result.data?.id,
        oldValues: null,
        newValues: {
          employee_code: personnel.employee_code,
          full_name: personnel.full_name,
          position: personnel.position,
          shift_type: personnel.shift_type,
          is_active: personnel.is_active
        },
        ipAddress: null,
        userAgent: navigator.userAgent,
        details: `Yeni personel eklendi: ${personnel.full_name} (${personnel.employee_code})`
      });
    }
    
    return result;
  } catch (error) {
    console.error('Add personnel with audit error:', error);
    return { success: false, error: error.message };
  }
};

export const updatePersonnelWithAudit = async (id, updates, currentUser) => {
  try {
    // Önce mevcut personel bilgilerini al
    const { data: existingPersonnel } = await supabase
      .from('personnel')
      .select('*')
      .eq('id', id)
      .single();
    
    const result = await updatePersonnel(id, updates);
    
    if (result.success) {
      // Audit log kaydet
      await logAuditEvent({
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userName: currentUser?.user_metadata?.full_name || currentUser?.email,
        action: 'UPDATE',
        tableName: 'personnel',
        recordId: id,
        oldValues: existingPersonnel,
        newValues: { ...existingPersonnel, ...updates },
        ipAddress: null,
        userAgent: navigator.userAgent,
        details: `Personel güncellendi: ${existingPersonnel?.full_name} (${existingPersonnel?.employee_code})`
      });
    }
    
    return result;
  } catch (error) {
    console.error('Update personnel with audit error:', error);
    return { success: false, error: error.message };
  }
};

export const deletePersonnelWithAudit = async (id, currentUser) => {
  try {
    // Önce mevcut personel bilgilerini al
    const { data: existingPersonnel } = await supabase
      .from('personnel')
      .select('*')
      .eq('id', id)
      .single();
    
    const result = await deletePersonnel(id);
    
    if (result.success) {
      // Audit log kaydet
      await logAuditEvent({
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userName: currentUser?.user_metadata?.full_name || currentUser?.email,
        action: 'DELETE',
        tableName: 'personnel',
        recordId: id,
        oldValues: existingPersonnel,
        newValues: null,
        ipAddress: null,
        userAgent: navigator.userAgent,
        details: `Personel silindi: ${existingPersonnel?.full_name} (${existingPersonnel?.employee_code})`
      });
    }
    
    return result;
  } catch (error) {
    console.error('Delete personnel with audit error:', error);
    return { success: false, error: error.message };
  }
};

// Vehicle functions with audit logging
export const addVehicleWithAudit = async (vehicle, currentUser) => {
  try {
    const result = await addVehicle(vehicle);
    
    if (result.success) {
      // Audit log kaydet
      await logAuditEvent({
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userName: currentUser?.user_metadata?.full_name || currentUser?.email,
        action: 'CREATE',
        tableName: 'vehicles',
        recordId: result.data?.id,
        oldValues: null,
        newValues: {
          license_plate: vehicle.license_plate,
          vehicle_type: vehicle.vehicle_type,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year
        },
        ipAddress: null,
        userAgent: navigator.userAgent,
        details: `Yeni araç eklendi: ${vehicle.license_plate} (${vehicle.vehicle_type})`
      });
    }
    
    return result;
  } catch (error) {
    console.error('Add vehicle with audit error:', error);
    return { success: false, error: error.message };
  }
};

export const updateVehicleWithAudit = async (id, updates, currentUser) => {
  try {
    // Önce mevcut araç bilgilerini al
    const { data: existingVehicle } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single();
    
    const result = await updateVehicle(id, updates);
    
    if (result.success) {
      // Audit log kaydet
      await logAuditEvent({
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userName: currentUser?.user_metadata?.full_name || currentUser?.email,
        action: 'UPDATE',
        tableName: 'vehicles',
        recordId: id,
        oldValues: existingVehicle,
        newValues: { ...existingVehicle, ...updates },
        ipAddress: null,
        userAgent: navigator.userAgent,
        details: `Araç güncellendi: ${existingVehicle?.license_plate}`
      });
    }
    
    return result;
  } catch (error) {
    console.error('Update vehicle with audit error:', error);
    return { success: false, error: error.message };
  }
};

export const deleteVehicleWithAudit = async (id, currentUser) => {
  try {
    // Önce mevcut araç bilgilerini al
    const { data: existingVehicle } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single();
    
    const result = await deleteVehicle(id);
    
    if (result.success) {
      // Audit log kaydet
      await logAuditEvent({
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userName: currentUser?.user_metadata?.full_name || currentUser?.email,
        action: 'DELETE',
        tableName: 'vehicles',
        recordId: id,
        oldValues: existingVehicle,
        newValues: null,
        ipAddress: null,
        userAgent: navigator.userAgent,
        details: `Araç silindi: ${existingVehicle?.license_plate}`
      });
    }
    
    return result;
  } catch (error) {
    console.error('Delete vehicle with audit error:', error);
    return { success: false, error: error.message };
  }
};

// Store functions with audit logging
export const addStoreWithAudit = async (store, currentUser) => {
  try {
    const result = await addStore(store);
    
    if (result.success) {
      // Audit log kaydet
      await logAuditEvent({
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userName: currentUser?.user_metadata?.full_name || currentUser?.email,
        action: 'CREATE',
        tableName: 'stores',
        recordId: result.data?.id,
        oldValues: null,
        newValues: {
          store_code: store.store_code,
          store_name: store.store_name,
          location: store.location,
          address: store.address
        },
        ipAddress: null,
        userAgent: navigator.userAgent,
        details: `Yeni mağaza eklendi: ${store.store_name} (${store.store_code})`
      });
    }
    
    return result;
  } catch (error) {
    console.error('Add store with audit error:', error);
    return { success: false, error: error.message };
  }
};

export const updateStoreWithAudit = async (id, updates, currentUser) => {
  try {
    // Önce mevcut mağaza bilgilerini al
    const { data: existingStore } = await supabase
      .from('stores')
      .select('*')
      .eq('id', id)
      .single();
    
    const result = await updateStore(id, updates);
    
    if (result.success) {
      // Audit log kaydet
      await logAuditEvent({
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userName: currentUser?.user_metadata?.full_name || currentUser?.email,
        action: 'UPDATE',
        tableName: 'stores',
        recordId: id,
        oldValues: existingStore,
        newValues: { ...existingStore, ...updates },
        ipAddress: null,
        userAgent: navigator.userAgent,
        details: `Mağaza güncellendi: ${existingStore?.store_name} (${existingStore?.store_code})`
      });
    }
    
    return result;
  } catch (error) {
    console.error('Update store with audit error:', error);
    return { success: false, error: error.message };
  }
};

export const deleteStoreWithAudit = async (id, currentUser) => {
  try {
    // Önce mevcut mağaza bilgilerini al
    const { data: existingStore } = await supabase
      .from('stores')
      .select('*')
      .eq('id', id)
      .single();
    
    const result = await deleteStore(id);
    
    if (result.success) {
      // Audit log kaydet
      await logAuditEvent({
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userName: currentUser?.user_metadata?.full_name || currentUser?.email,
        action: 'DELETE',
        tableName: 'stores',
        recordId: id,
        oldValues: existingStore,
        newValues: null,
        ipAddress: null,
        userAgent: navigator.userAgent,
        details: `Mağaza silindi: ${existingStore?.store_name} (${existingStore?.store_code})`
      });
    }
    
    return result;
  } catch (error) {
    console.error('Delete store with audit error:', error);
    return { success: false, error: error.message };
  }
};

// Test fonksiyonu - audit log ekleme testi
export const testAuditLog = async (currentUser) => {
  try {
    console.log('🧪 Test audit log ekleniyor...');
    
    const testData = {
      userId: currentUser?.id,
      userEmail: currentUser?.email,
      userName: currentUser?.user_metadata?.full_name || currentUser?.email,
      action: 'CREATE',
      tableName: 'test',
      recordId: null,
      oldValues: null,
      newValues: { test: true },
      ipAddress: null,
      userAgent: navigator.userAgent,
      details: 'Test audit log kaydı'
    };
    
    const result = await logAuditEvent(testData);
    
    if (result.success) {
      console.log('✅ Test audit log başarıyla eklendi!');
      return { success: true, message: 'Test audit log başarıyla eklendi' };
    } else {
      console.error('❌ Test audit log eklenemedi:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('❌ Test audit log hatası:', error);
    return { success: false, error: error.message };
  }
};

export const bulkSavePerformanceDataWithAudit = async (performanceDataArray, currentUser, sheetNames = []) => {
  try {
    console.log('🔍 Bulk performance data audit ile kaydediliyor:', performanceDataArray.length, 'kayıt');
    
    const result = await bulkSavePerformanceData(performanceDataArray, sheetNames);
    
    if (result.success) {
      // Audit log kaydet
      await logAuditEvent({
        userId: currentUser?.id,
        userEmail: currentUser?.email,
        userName: currentUser?.user_metadata?.full_name || currentUser?.email,
        action: 'BULK_CREATE',
        tableName: 'performance_data',
        recordId: null,
        oldValues: null,
        newValues: { count: performanceDataArray.length },
        ipAddress: null,
        userAgent: navigator.userAgent,
        details: `Toplu performans verisi eklendi: ${performanceDataArray.length} kayıt`
      });
    }
    
    return result;
  } catch (error) {
    console.error('Bulk save performance data with audit error:', error);
    return { success: false, error: error.message };
  }
};

// Bildirim fonksiyonları
export const createNotification = async (notificationData) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select();
    
    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Bildirim oluşturma hatası:', error);
    return { success: false, error: error.message };
  }
};

export const getNotifications = async (userId, filters = {}) => {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (filters.isRead !== undefined) {
      query = query.eq('is_read', filters.isRead);
    }
    
    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Bildirim getirme hatası:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const markNotificationAsRead = async (notificationId, userId) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('id', notificationId)
      .eq('user_id', userId);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Bildirim okundu işaretleme hatası:', error);
    return { success: false, error: error.message };
  }
};

export const deleteNotification = async (notificationId, userId) => {
  try {
    console.log('🗑️ Bildirim silme isteği:', { notificationId, userId });
    
    // Önce bildirimin var olduğunu ve kullanıcıya ait olduğunu kontrol et
    const { data: existingNotification, error: checkError } = await supabase
      .from('notifications')
      .select('id, user_id')
      .eq('id', notificationId)
      .eq('user_id', userId)
      .single();
    
    if (checkError || !existingNotification) {
      console.error('❌ Bildirim bulunamadı veya erişim izni yok:', checkError);
      return { success: false, error: 'Bildirim bulunamadı veya erişim izni yok' };
    }
    
    // Bildirimi sil
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('❌ Supabase silme hatası:', error);
      throw error;
    }
    
    console.log('✅ Bildirim başarıyla silindi');
    return { success: true };
  } catch (error) {
    console.error('❌ Bildirim silme hatası:', error);
    return { success: false, error: error.message };
  }
};

export const getUnreadNotificationCount = async (userId) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    if (error) throw error;
    return { success: true, count: count || 0 };
  } catch (error) {
    console.error('Okunmamış bildirim sayısı getirme hatası:', error);
    return { success: false, error: error.message, count: 0 };
  }
};

// Chat için gerçek kullanıcıları getir
export const getChatUsers = async (currentUserId) => {
  try {
    // Users tablosundan gerçek kullanıcıları al
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name, username, is_online, last_seen')
      .eq('is_active', true)
      .neq('id', currentUserId)
      .order('full_name');

    if (error) {
      console.error('❌ Users yüklenirken hata:', error);
      return { success: false, error };
    }

    // Users verilerini kullanıcı formatına çevir
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name || user.username || user.email?.split('@')[0] || 'Kullanıcı',
      is_online: user.is_online,
      last_seen: user.last_seen,
      user_metadata: { 
        full_name: user.full_name || user.username || user.email?.split('@')[0] || 'Kullanıcı'
      }
    }));

    return { success: true, data: formattedUsers };
  } catch (error) {
    console.error('❌ Chat kullanıcıları getirilirken hata:', error);
    return { success: false, error };
  }
};

// Test kullanıcıları oluştur
export const createTestUsers = async () => {
  try {
    const testUsers = [
      {
        id: 'test-user-1',
        email: 'test1@example.com',
        full_name: 'Test Kullanıcı 1',
        role: 'user'
      },
      {
        id: 'test-user-2',
        email: 'test2@example.com', 
        full_name: 'Test Kullanıcı 2',
        role: 'user'
      },
      {
        id: 'test-user-3',
        email: 'test3@example.com',
        full_name: 'Test Kullanıcı 3', 
        role: 'user'
      }
    ];

    // Her test kullanıcısını profiles tablosuna ekle
    for (const user of testUsers) {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error(`${user.email} eklenirken hata:`, error);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Test kullanıcıları oluşturulurken hata:', error);
    return { success: false, error };
  }
};

// Gerçek kullanıcıları profiles tablosuna ekle
export const syncRealUsers = async () => {
  try {
    console.log('🔄 Gerçek kullanıcılar senkronize ediliyor...');
    
    // Mevcut kullanıcıları al (admin yetkisi gerektirir)
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Kullanıcılar alınırken hata:', error);
      return { success: false, error };
    }

    console.log('👥 Bulunan kullanıcılar:', users.length);

    // Her kullanıcıyı profiles tablosuna ekle/güncelle
    for (const user of users) {
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Kullanıcı',
          role: user.user_metadata?.role || 'user',
          created_at: user.created_at,
          updated_at: new Date().toISOString()
        });

      if (upsertError) {
        console.error(`❌ ${user.email} eklenirken hata:`, upsertError);
      } else {
        console.log(`✅ ${user.email} başarıyla eklendi`);
      }
    }

    return { success: true, count: users.length };
  } catch (error) {
    console.error('❌ Gerçek kullanıcılar senkronize edilirken hata:', error);
    return { success: false, error };
  }
};

// Gerçek kullanıcıları getir (admin yetkisi olmadan)
export const getRealUsers = async (currentUserId) => {
  try {
    console.log('👥 Gerçek kullanıcılar getiriliyor...');
    
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUserId)
      .order('full_name');

    if (error) {
      console.error('❌ Profiles yüklenirken hata:', error);
      return { success: false, error };
    }

    console.log('👥 Bulunan profiles:', profiles.length);

    // Profiles verilerini kullanıcı formatına çevir
    const users = profiles.map(profile => ({
      id: profile.id,
      email: profile.email,
      user_metadata: { 
        full_name: profile.full_name || profile.email?.split('@')[0] || 'Kullanıcı'
      }
    }));

    return { success: true, data: users };
  } catch (error) {
    console.error('❌ Gerçek kullanıcılar getirilirken hata:', error);
    return { success: false, error };
  }
};

// Users tablosundan direkt kullanıcıları al
export const getUsersFromUsersTable = async () => {
  try {
    // Users tablosundan tüm aktif kullanıcıları al
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_active', true);
    
    if (error) {
      console.error('❌ Users tablosundan veri alınırken hata:', error);
      return { success: false, error };
    }

    return { success: true, data: users };
  } catch (error) {
    console.error('❌ Kullanıcılar alınırken hata:', error);
    return { success: false, error };
  }
};

// Test kullanıcılarını profiles tablosundan sil
export const removeTestUsers = async () => {
  try {
    console.log('🗑️ Test kullanıcıları siliniyor...');
    
    // Test kullanıcılarını email ile sil (UUID olmadığı için)
    const { error } = await supabase
      .from('profiles')
      .delete()
      .in('email', ['test-user-1@example.com', 'test-user-2@example.com', 'test-user-3@example.com']);

    if (error) {
      console.error('❌ Test kullanıcıları silinirken hata:', error);
      return { success: false, error };
    }

    console.log('✅ Test kullanıcıları başarıyla silindi');
    return { success: true };
  } catch (error) {
    console.error('❌ Test kullanıcıları silinirken hata:', error);
    return { success: false, error };
  }
};

// Duplicate profilleri temizle
export const cleanDuplicateProfiles = async () => {
  try {
    console.log('🧹 Duplicate profiller temizleniyor...');
    
    // Tüm profilleri al
    const { data: allProfiles, error: fetchError } = await supabase
      .from('profiles')
      .select('*');
    
    if (fetchError) {
      console.error('❌ Profiller getirilirken hata:', fetchError);
      return { success: false, error: fetchError };
    }
    
    console.log('📋 Tüm profiller:', allProfiles);
    
    // Email'e göre grupla
    const emailGroups = {};
    allProfiles.forEach(profile => {
      if (!emailGroups[profile.email]) {
        emailGroups[profile.email] = [];
      }
      emailGroups[profile.email].push(profile);
    });
    
    // Duplicate'leri bul
    const duplicatesToDelete = [];
    Object.entries(emailGroups).forEach(([email, profiles]) => {
      if (profiles.length > 1) {
        console.log(`🔍 Duplicate bulundu: ${email} - ${profiles.length} profil`);
        // En son oluşturulanı tut, diğerlerini sil
        profiles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        profiles.slice(1).forEach(profile => {
          duplicatesToDelete.push(profile.id);
        });
      }
    });
    
    if (duplicatesToDelete.length > 0) {
      console.log('🗑️ Silinecek duplicate profiller:', duplicatesToDelete);
      
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .in('id', duplicatesToDelete);
      
      if (deleteError) {
        console.error('❌ Duplicate profiller silinirken hata:', deleteError);
        return { success: false, error: deleteError };
      } else {
        console.log('✅ Duplicate profiller temizlendi');
        return { success: true, deletedCount: duplicatesToDelete.length };
      }
    } else {
      console.log('✅ Duplicate profil yok');
      return { success: true, deletedCount: 0 };
    }
  } catch (error) {
    console.error('❌ Duplicate profil temizleme hatası:', error);
    return { success: false, error };
  }
};



// Online durumu fonksiyonları
export const updateUserOnlineStatus = async (userId, isOnline) => {
  try {
    console.log('🔄 Online durumu güncelleniyor:', { userId, isOnline });
    
    const { error } = await supabase
      .from('users')
      .update({ 
        is_online: isOnline,
        last_seen: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('❌ Online durumu güncellenirken hata:', error);
      return { success: false, error };
    }

   
    return { success: true };
  } catch (error) {
    console.error('❌ Online durumu güncelleme hatası:', error);
    return { success: false, error };
  }
};

export const getUserOnlineStatus = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('is_online, last_seen')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Online durumu alınırken hata:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('❌ Online durumu alma hatası:', error);
    return { success: false, error };
  }
};

