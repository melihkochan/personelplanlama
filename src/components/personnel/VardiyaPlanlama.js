import React from 'react';
import { Calendar, Settings, Wrench, Construction } from 'lucide-react';

const VardiyaPlanlama = ({ userRole, onDataUpdate }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Vardiya Planlama</h1>
                <p className="text-gray-600">Haftalık personel vardiya planı oluşturun</p>
              </div>
            </div>
          </div>
        </div>

        {/* Geliştiriliyor Mesajı */}
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <div className="flex flex-col items-center gap-6">
            {/* İkon */}
            <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <Construction className="w-12 h-12 text-white" />
            </div>
            
            {/* Başlık */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Geliştiriliyor</h2>
              <p className="text-lg text-gray-600">Vardiya planlama sistemi yakında hazır olacak</p>
            </div>
            
            {/* Özellikler */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 max-w-4xl">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Akıllı Planlama</h3>
                <p className="text-gray-600 text-sm">
                  Yapay zeka destekli vardiya planlama algoritması ile optimal personel dağılımı
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Otomatik Optimizasyon</h3>
                <p className="text-gray-600 text-sm">
                  Personel yetenekleri, vardiya kuralları ve iş yüküne göre otomatik plan oluşturma
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Wrench className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Gelişmiş Analiz</h3>
                <p className="text-gray-600 text-sm">
                  Vardiya performans analizi, çakışma kontrolü ve raporlama özellikleri
                </p>
              </div>
            </div>
            
            {/* Durum Mesajı */}
            <div className="mt-8 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Construction className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900">Geliştirme Aşamasında</h4>
                  <p className="text-sm text-gray-600">
                    Bu özellik aktif olarak geliştiriliyor. Yakında kullanıma açılacak.
                  </p>
                </div>
              </div>
            </div>
            
            {/* İlerleme Çubuğu */}
            <div className="w-full max-w-md mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Geliştirme İlerlemesi</span>
                <span className="text-sm text-gray-500">%65</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full" style={{ width: '65%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VardiyaPlanlama; 