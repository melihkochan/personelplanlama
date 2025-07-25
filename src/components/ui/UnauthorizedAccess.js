import React from 'react';
import { Shield, Lock, AlertTriangle, ArrowLeft, Home, User, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

const UnauthorizedAccess = ({ userRole, onNavigateHome }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        {/* Ana Kart */}
        <div className="bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <Shield className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-2">Yetkisiz Erişim</h1>
            <p className="text-red-100 text-sm">Bu sayfaya erişim yetkiniz bulunmamaktadır</p>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="space-y-6">
              {/* Uyarı Mesajı */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Erişim Reddedildi
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Admin paneli sadece yönetici yetkisine sahip kullanıcılar tarafından erişilebilir. 
                    Mevcut yetkiniz: <span className="font-medium text-blue-600">{userRole || 'Kullanıcı'}</span>
                  </p>
                </div>
              </div>

              {/* Yetki Seviyeleri */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Lock className="w-4 h-4 mr-2" />
                  Yetki Seviyeleri
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Admin</span>
                    </div>
                    <Crown className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Yönetici</span>
                    </div>
                    <User className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Kullanıcı</span>
                    </div>
                    <User className="w-4 h-4 text-blue-500" />
                  </div>
                </div>
              </div>

              {/* Aksiyon Butonları */}
              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onNavigateHome}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-xl font-medium flex items-center justify-center space-x-2 hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
                >
                  <Home className="w-5 h-5" />
                  <span>Ana Sayfaya Dön</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => window.history.back()}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium flex items-center justify-center space-x-2 hover:bg-gray-200 transition-all duration-200"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Geri Dön</span>
                </motion.button>
              </div>

              {/* Bilgi Notu */}
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  Yetki yükseltme talebi için sistem yöneticinizle iletişime geçin
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Animasyonlu Arka Plan Elementleri */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{ 
              x: [0, 100, 0],
              y: [0, -50, 0],
              rotate: [0, 360]
            }}
            transition={{ 
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute top-20 right-20 w-32 h-32 bg-red-200 rounded-full opacity-20"
          />
          <motion.div
            animate={{ 
              x: [0, -80, 0],
              y: [0, 60, 0],
              rotate: [0, -360]
            }}
            transition={{ 
              duration: 25,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute bottom-20 left-20 w-24 h-24 bg-orange-200 rounded-full opacity-20"
          />
        </div>
      </motion.div>
    </div>
  );
};

export default UnauthorizedAccess; 