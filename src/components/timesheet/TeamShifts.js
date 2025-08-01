import React, { useState, useEffect } from 'react';
import { Clock, Users, Calendar, AlertCircle } from 'lucide-react';

const TeamShifts = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Ekip Vardiyaları</h1>
            <p className="text-blue-100 mt-1">Ekip vardiya planlaması ve takibi</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3">
            <Clock className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Development Notice */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-orange-600 mr-3" />
          <div>
            <h3 className="font-semibold text-orange-800">Geliştirme Aşamasında</h3>
            <p className="text-orange-700 text-sm mt-1">
              Bu sayfa şu anda geliştirme aşamasındadır. Yakında ekip vardiya planlaması 
              ve takip özellikleri eklenecektir.
            </p>
          </div>
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Team Overview Card */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Ekip Genel Bakış</h3>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Toplam Ekip:</span>
              <span className="font-semibold">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Aktif Vardiya:</span>
              <span className="font-semibold text-green-600">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Bekleyen:</span>
              <span className="font-semibold text-orange-600">0</span>
            </div>
          </div>
        </div>

        {/* Shift Schedule Card */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Vardiya Programı</h3>
            <Calendar className="w-5 h-5 text-purple-600" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Sabah Vardiyası:</span>
              <span className="font-semibold">06:00 - 14:00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Öğle Vardiyası:</span>
              <span className="font-semibold">14:00 - 22:00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Gece Vardiyası:</span>
              <span className="font-semibold">22:00 - 06:00</span>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Hızlı İşlemler</h3>
            <Clock className="w-5 h-5 text-green-600" />
          </div>
          <div className="space-y-2">
            <button className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg p-2 text-sm font-medium transition-colors">
              Yeni Ekip Oluştur
            </button>
            <button className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg p-2 text-sm font-medium transition-colors">
              Vardiya Planla
            </button>
            <button className="w-full bg-green-50 hover:bg-green-100 text-green-700 rounded-lg p-2 text-sm font-medium transition-colors">
              Rapor Oluştur
            </button>
          </div>
        </div>
      </div>

      {/* Coming Soon Features */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Yakında Gelecek Özellikler</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-gray-700">Ekip oluşturma ve yönetimi</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span className="text-gray-700">Vardiya planlama ve düzenleme</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-700">Gerçek zamanlı vardiya takibi</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-gray-700">Ekip performans raporları</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-gray-700">Vardiya değişim talepleri</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
            <span className="text-gray-700">Otomatik vardiya optimizasyonu</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamShifts; 